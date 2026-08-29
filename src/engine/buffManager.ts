// src/engine/buffManager.ts
// PARSING.md + IMPL-STATUS.md 기반 중앙 집중식 버프 생명주기 관리자

import {
  ActiveBuff,
  BuffCollection,
  NormalizedSkillEffect,
  Polarity,
} from '../types/buff';
import {
  createDefaultBuffCollection,
  _STAT_TO_BUFF,
  _CRIT_RATE_STATS,
  _BOOLEAN_FLAG_STATS,
  _FIXED_VALUE_STATS,
  _UNIMPLEMENTED_STATS,
} from './buffConstants';
import { BattleContext, Character } from '../types/battle';
import { checkAdvantage } from '../utils/charUtils';
import { calcNikkeDamage } from './nikkeFormula';
import { DamageParams } from '../types/damage';

export class BuffManager {
  private _nextUid = 1;
  private _effects: NormalizedSkillEffect[] = [];
  private _active: ActiveBuff[] = [];
  private _triggerCounts: Record<string, number> = {};
  private _eventCounts: Record<string, Record<string, number>> = {};
  private _dotTimers: Array<{
    uid: number;
    casterId: string;
    targetId: string;
    effectDef: NormalizedSkillEffect;
    valuePerTick: number;
    interval: number;
    nextTick: number;
    expiresAt: number;
  }> = [];

  // 스쿼드 탄 소비 누적 집계 (squad_ammo_consume:N trigger용)
  private _squadAmmoConsumed = 0;
  // 무한 탄 활성 캐릭터 set
  private _infiniteAmmoChars = new Set<string>();

  // 타임라인 이벤트 기록
  private _timelineEvents: Array<{
    uid: number;
    targetId: string;
    casterId: string;
    buffName: string;
    stat: string;
    sourceSkill: string;
    polarity: string;
    value: number;
    startTime: number;
    endTime: number;
    isPermanent: boolean;
  }> = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this._nextUid = 1;
    this._effects = [];
    this._active = [];
    this._triggerCounts = {};
    this._eventCounts = {};
    this._dotTimers = [];
    this._timelineEvents = [];
    this._squadAmmoConsumed = 0;
    this._infiniteAmmoChars.clear();
  }

  /** 팀의 모든 캐릭터 스킬을 등록하고 정규화 */
  public registerTeamSkills(team: { members: Character[] }): void {
    team.members.forEach((char) => {
      const skills = char.skills || [];
      skills.forEach((skill) => {
        const effects = (skill as any).effects || [];
        effects.forEach((eff: any, idx: number) => {
          const sLvl =
            skill.id === 'skill_1'
              ? char.skill1Level || 10
              : skill.id === 'skill_2'
                ? char.skill2Level || 10
                : skill.id === 'burst'
                  ? char.burstLevelSkill || 10
                  : 10;
          const sLvIdx = Math.max(0, Math.min(9, sLvl - 1));

          // 수치 추출
          let extractedValue = eff.fixed_value ?? eff.value;
          if (Array.isArray(eff.value)) {
            extractedValue = eff.value[sLvIdx] ?? eff.value[0];
          } else if (eff.values && typeof eff.values === 'object') {
            extractedValue = eff.values[String(sLvl)] ?? eff.values['10'] ?? 0;
          }
          if (typeof extractedValue === 'string') {
            extractedValue = parseFloat(extractedValue) || 0;
          }

          // _unparseable 마킹 경고
          if (eff._unparseable) {
            console.warn(`[BuffManager] _unparseable stat in ${char.id} / ${eff.name || eff.stat}: raw="${eff._raw}". 미구현 — 무시됨.`);
            return;
          }

          // stat 키 정규화 (legacy based_on 지원 -> PARSING.md 표준 stat으로 통합)
          let rawStatKey = eff.stat || eff.effect;
          const basedOn = eff.based_on;

          if (rawStatKey === 'atk_pct' || rawStatKey === 'atk_up') {
            if (basedOn === 'caster_final_max_hp' || basedOn === 'caster_max_hp') {
              rawStatKey = 'atk_from_hp_pct';
            } else if (basedOn === 'caster_atk' || basedOn === 'caster_final_atk') {
              rawStatKey = 'atk_caster_based_pct';
            }
          } else if (rawStatKey === 'max_hp_pct' || rawStatKey === 'max_hp_up') {
            if (basedOn === 'caster_final_max_hp' || basedOn === 'caster_max_hp') {
              rawStatKey = 'hp_caster_based_pct';
            }
          } else if (rawStatKey === 'max_hp_only_pct') {
            if (basedOn === 'caster_final_max_hp' || basedOn === 'caster_max_hp') {
              rawStatKey = 'hp_only_caster_based_pct';
            }
          } else if (rawStatKey === 'def_pct' || rawStatKey === 'def_up') {
            if (basedOn === 'caster_def' || basedOn === 'caster_final_def') {
              rawStatKey = 'def_caster_based_pct';
            }
          }

          const statKey = rawStatKey;
          if (statKey && _UNIMPLEMENTED_STATS.has(statKey)) {
            console.debug(`[BuffManager] 미구현 stat "${statKey}" (${char.id} / ${eff.name}) — 무시됨.`);
          }

          const effName = eff.name || skill.name || '스킬 효과';
          const skillName = skill.name || eff.name || '스킬';

          const normalized: NormalizedSkillEffect = {
            id: eff.id || `${char.id}__${skill.id || skill.name}__eff${idx}`,
            source: skill.id || skill.type || 'skill',
            type: eff.type || 'buff',
            name: effName,
            sourceSkill: skillName,
            trigger: {
              timing: Array.isArray(eff.trigger)
                ? eff.trigger
                : eff.trigger
                  ? [eff.trigger]
                  : ['battle_start'],
              condition: Array.isArray(eff.condition)
                ? eff.condition
                : eff.condition
                  ? [typeof eff.condition === 'string' ? eff.condition : JSON.stringify(eff.condition)]
                  : [],
            },
            target: eff.target || 'self',
            stat: statKey || 'atk_pct',
            polarity: eff.polarity || 'beneficial',
            max_stack: eff.stack || eff.max_stack || 1,
            stack_level: eff.stack_level,
            value: Number(extractedValue) || 0,
            fixed_value: eff.fixed_value,
            duration: eff.duration === 'permanent' ? -1 : (eff.duration ?? -1),
            duration_bullets: eff.bullet || eff.duration_bullets,
            duration_shots: eff.duration_shots,
            interval: eff.interval,
            tick_interval: eff.tick_interval,
            hits: eff.hits || 1,
            based_on: eff.based_on,
            status: eff.status,
            status_target: eff.status_target,
            scaling: eff.scaling,
            scaling_ref: eff.scaling_ref,
            target_effect: eff.target_effect,
            target_skill: eff.target_skill,
            target_code: eff.target_code,
            gauge_id: eff.gauge_id,
            feather_id: eff.feather_id,
            weapon_override: eff.weapon_override,
            casterId: char.id,
          };

          this._effects.push(normalized);
        });
      });
    });
  }

  /** 전투 시작 시 호출 */
  public battleStart(ctx: BattleContext): void {
    this.notify('battle_start', 0, undefined, ctx);
    this.notify('passive', 0, undefined, ctx);
    this.notify('event:enemy_spawn', 0, undefined, ctx);
  }

  /** 이벤트 통지 및 조건 부합 효과 발동 */
  public notify(
    event: string,
    t: number,
    casterId: string | undefined,
    ctx: BattleContext
  ): void {
    // squad_ammo_consume 누적
    if (event === 'squad_ammo_consume') {
      this._squadAmmoConsumed += 1;
    }

    const eventKey = event.split(':')[0];
    if (!this._eventCounts[eventKey]) {
      this._eventCounts[eventKey] = {};
    }
    const cId = casterId || '__all__';
    this._eventCounts[eventKey][cId] = (this._eventCounts[eventKey][cId] || 0) + 1;
    const currentCount = this._eventCounts[eventKey][cId];

    for (const eff of this._effects) {
      // 버스트 시전(burst_cast, burst_cast_self, burst_enter) 트리거는 오직 해당 니케 본인이 버스트를 시전했을 때만 발동
      const isBurstCastTiming = eff.trigger.timing.some(
        (tm) => tm === 'burst_cast' || tm === 'burst_cast_self' || tm.startsWith('burst_enter:')
      );
      if (isBurstCastTiming) {
        if (!casterId || eff.casterId !== casterId) {
          continue;
        }
      }

      // 전장/팀 공통 이벤트(full_burst_start, full_burst_end, battle_start 등)는 시전자 일치 여부와 무관하게 모든 니케 대상 평가
      const isGlobalTiming = eff.trigger.timing.some(
        (tm) =>
          tm === 'full_burst_start' ||
          tm === 'full_burst_end' ||
          tm === 'battle_start' ||
          tm.startsWith('all_allies') ||
          tm.startsWith('squad_')
      );

      // 일반 시전자 필터링 (글로벌 타이밍이 아닌 경우 본인 이벤트만 처리)
      if (
        casterId &&
        eff.casterId &&
        eff.casterId !== casterId &&
        !isGlobalTiming
      ) {
        continue;
      }

      if (!this._timingMatch(eff, eff.trigger.timing, event, currentCount, casterId, ctx)) {
        continue;
      }

      if (!this._conditionOk(eff, t, casterId, ctx)) {
        continue;
      }

      this._activate(eff, t, eff.casterId || casterId || 'unknown', ctx);
    }
  }

  /** 활성화된 trigger_count_reduce 버프가 eff를 대상으로 하면 n을 감소시킨다. 최솟값 1. */
  private _applyTriggerCountReduce(
    n: number,
    eff: NormalizedSkillEffect,
    casterId: string,
    t: number
  ): number {
    if (!casterId) return n;
    let reduce = 0;
    for (const ab of this._active) {
      if (ab.targetId !== casterId && ab.casterId !== casterId) continue;
      if (ab.stat !== 'trigger_count_reduce' && ab.effectDef?.stat !== 'trigger_count_reduce') continue;
      if (ab.expiresAt !== Infinity && ab.expiresAt <= t) continue;
      const targetName = ab.effectDef?.target_effect || (ab as any).target_effect;
      if (!targetName) continue;
      if (eff.name === targetName) {
        reduce += (ab.effectDef?.fixed_value ?? ab.value ?? 0);
      } else {
        const effTimings = eff.trigger?.timing || [];
        const hasMatch = this._effects.some(
          (e) =>
            e.casterId === casterId &&
            e.name === targetName &&
            e.trigger?.timing?.some((tm) => effTimings.includes(tm))
        );
        if (hasMatch) {
          reduce += (ab.effectDef?.fixed_value ?? ab.value ?? 0);
        }
      }
    }
    return Math.max(1, n - reduce);
  }

  /** 타이밍 일치 여부 확인 — IMPL-STATUS.md trigger 마스터 테이블 기준 */
  private _timingMatch(
    eff: NormalizedSkillEffect,
    timings: string[],
    event: string,
    count: number,
    casterId: string | undefined,
    ctx: BattleContext
  ): boolean {
    for (const tm of timings) {
      // 완전 일치
      if (tm === event) return true;

      // weapon_hit:name (named damage effect 발동 시)
      if (tm.startsWith('weapon_hit:') && event.startsWith('weapon_hit:')) {
        if (tm === event) return true;
      }

      // timing_count:N — 누적 달성형 이벤트(full_burst_start_count, full_burst_end_count, burst_cast_count 등)만 >= req 적용
      const CUMULATIVE_COUNT_EVENTS = new Set(['full_burst_start', 'full_burst_end', 'burst_cast', 'burst_enter']);
      if (CUMULATIVE_COUNT_EVENTS.has(event) && tm.startsWith(`${event}_count:`)) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count >= req) return true;
      }

      // timing_exact:N (full_burst_start_exact:2 — 정확히 N번째만)
      if (tm.startsWith(`${event}_exact:`)) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count === req) return true;
      }

      // hit_count:N (N발마다 — trigger_count_reduce 버프로 N 감소 가능)
      if (event === 'hit_count' && tm.startsWith('hit_count:')) {
        const parts = tm.split(':');
        if (parts.length === 2) {
          const req = parseInt(parts[1], 10);
          const effReq = this._applyTriggerCountReduce(req, eff, eff.casterId || casterId || '', ctx.time);
          if (!isNaN(effReq) && effReq > 0 && count % effReq === 0) return true;
        }
      }

      // hit_count:[스킬명]:N (named damage effect N회마다)
      if (event.startsWith('hit_count:') && !event.startsWith('hit_count:__')) {
        // event = "hit_count:효과명", tm = "hit_count:효과명:N"
        const evParts = event.split(':');
        const effName = evParts.slice(1).join(':');
        if (tm.startsWith(`hit_count:${effName}:`)) {
          const req = parseInt(tm.split(':').pop() || '0', 10);
          const effReq = this._applyTriggerCountReduce(req, eff, eff.casterId || casterId || '', ctx.time);
          if (!isNaN(effReq) && effReq > 0 && count % effReq === 0) return true;
        }
      }

      // full_charge_count:N (풀차지 N회마다)
      if ((event === 'full_charge' || event === 'full_charge_hit') && tm.startsWith('full_charge_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        const effReq = this._applyTriggerCountReduce(req, eff, eff.casterId || casterId || '', ctx.time);
        if (!isNaN(effReq) && effReq > 0 && count % effReq === 0) return true;
      }

      // crit_hit_count:N
      if (event === 'crit_hit' && tm.startsWith('crit_hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        const effReq = this._applyTriggerCountReduce(req, eff, eff.casterId || casterId || '', ctx.time);
        if (!isNaN(effReq) && effReq > 0 && count % effReq === 0) return true;
      }

      // core_hit_count:N
      if (event === 'core_hit' && tm.startsWith('core_hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        const effReq = this._applyTriggerCountReduce(req, eff, eff.casterId || casterId || '', ctx.time);
        if (!isNaN(effReq) && effReq > 0 && count % effReq === 0) return true;
      }

      // pellet_hit_count:N
      if (event === 'pellet_hit' && tm.startsWith('pellet_hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        const effReq = this._applyTriggerCountReduce(req, eff, eff.casterId || casterId || '', ctx.time);
        if (!isNaN(effReq) && effReq > 0 && count % effReq === 0) return true;
      }

      // squad_ammo_consume:N (N발 소비마다)
      if (event === 'squad_ammo_consume' && tm.startsWith('squad_ammo_consume:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && this._squadAmmoConsumed % req === 0) return true;
      }

      // burst_enter:N
      if (event.startsWith('burst_enter:') && tm === event) return true;

      // burst_cast_count:N
      if (event === 'burst_cast' && tm.startsWith('burst_cast_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count >= req) return true;
      }

      // stack_reach:버프명:N
      if (event.startsWith('stack_reach:') && tm === event) return true;

      // event:xxx (범용 이벤트)
      if (tm.startsWith('event:') && tm === event) return true;

      // hp_below:N
      if (event.startsWith('hp_below:') && tm === event) return true;

      // every:Ns — _everyIntervalTimers에서 처리 (여기선 false)
    }
    return false;
  }

  /** 발동 조건 평가 — _condition_ok() */
  private _conditionOk(
    eff: NormalizedSkillEffect,
    t: number,
    casterId: string | undefined,
    ctx: BattleContext
  ): boolean {
    const conditions = eff.trigger.condition || [];
    const caster = ctx.team.members.find((m) => m.id === (eff.casterId || casterId));

    for (const cond of conditions) {
      if (cond === 'during_full_burst' || cond === 'during_burst') {
        if (!ctx.burstActive) return false;
      }

      if (cond === 'not_during_full_burst' || cond === 'not_during_burst') {
        if (ctx.burstActive) return false;
      }

      if (cond.startsWith('prob:')) {
        const prob = parseFloat(cond.split(':')[1]) / 100;
        if (ctx.rng && ctx.rng.next() > prob) return false;
      }

      if (cond.startsWith('target_code:')) {
        const code = cond.split(':')[1];
        if (code && ctx.enemy.element !== code) return false;
      }

      if (cond.startsWith('self_hp_above:') && caster) {
        const thresh = parseFloat(cond.split(':')[1]);
        const curHpPct = (caster.hp / (caster.maxHp || caster.hp || 1)) * 100;
        if (curHpPct < thresh) return false;
      }

      if (cond.startsWith('self_hp_below:') && caster) {
        const thresh = parseFloat(cond.split(':')[1]);
        const curHpPct = (caster.hp / (caster.maxHp || caster.hp || 1)) * 100;
        if (curHpPct > thresh) return false;
      }

      if (cond === 'self_hp_max' && caster) {
        const curHpPct = (caster.hp / (caster.maxHp || caster.hp || 1)) * 100;
        if (curHpPct < 100) return false;
      }

      if (cond.startsWith('self_stat_above:') && caster) {
        const parts = cond.split(':');
        const statKey = parts[1];
        const thresh = parseFloat(parts[2] || '0');
        const buffs = this.getBuffs(caster.id, caster.id, ctx, t);
        const statVal = (buffs as any)[statKey] ?? 0;
        if (statVal <= thresh) return false;
      }

      if (cond.startsWith('self_state:')) {
        const stateName = cond.split(':').slice(1).join(':');
        if (!this._hasSelfState(eff.casterId || casterId || '', stateName, ctx)) return false;
      }

      if (cond.startsWith('not_self_state:')) {
        const stateName = cond.split(':').slice(1).join(':');
        if (this._hasSelfState(eff.casterId || casterId || '', stateName, ctx)) return false;
      }

      if (cond.startsWith('target_state:')) {
        const stateName = cond.split(':').slice(1).join(':');
        const hasState = this._active.some(
          (ab) => ab.targetId === '__enemy__' && ab.name === stateName
        );
        if (!hasState) return false;
      }

      if (cond.startsWith('not_target_state:')) {
        const stateName = cond.split(':').slice(1).join(':');
        const hasState = this._active.some(
          (ab) => ab.targetId === '__enemy__' && ab.name === stateName
        );
        if (hasState) return false;
      }

      if (cond === 'burst_casted' && caster) {
        const hasCasted = (ctx.state as any)?.burst_casted?.[caster.id];
        if (!hasCasted) return false;
      }

      if (cond === 'burst_not_casted' && caster) {
        const hasCasted = (ctx.state as any)?.burst_casted?.[caster.id];
        if (hasCasted) return false;
      }

      if (cond === 'back_row' && caster) {
        const idx = ctx.team.members.indexOf(caster);
        const slotIdx = caster.slotIndex !== undefined ? caster.slotIndex : idx;
        // 니케 진형에서 2번(index 1) 또는 4번(index 3) 자리가 후열(back row)
        if (slotIdx !== 1 && slotIdx !== 3) return false;
      }

      if (cond === 'during_shield' && caster) {
        const hasShield = this._active.some(
          (ab) => ab.targetId === caster.id && ab.stat === 'shield_from_max_hp_pct' && ab.expiresAt > t
        );
        if (!hasShield) return false;
      }

      if (cond.startsWith('self_stack_above:')) {
        const parts = cond.split(':');
        const buffName = parts[1];
        const thresh = parseInt(parts[2] || '0', 10);
        const cId = eff.casterId || casterId;
        const current = this._active
          .filter(
            (b) =>
              b.name === buffName &&
              (b.casterId === cId || b.targetId === cId || b.targetId === '__enemy__')
          )
          .reduce((max, b) => Math.max(max, b.stack), 0);
        if (current < thresh) return false;
      }

      if (cond.startsWith('gauge_above:')) {
        const parts = cond.split(':');
        const gaugeId = parts[1];
        const thresh = parseFloat(parts[2] || '0');
        const gaugeVal = (ctx.state as any)?.gauges?.[eff.casterId || casterId || '']?.[gaugeId] ?? 0;
        if (gaugeVal <= thresh) return false;
      }

      if (cond.startsWith('gauge_below:')) {
        const parts = cond.split(':');
        const gaugeId = parts[1];
        const thresh = parseFloat(parts[2] || '0');
        const gaugeVal = (ctx.state as any)?.gauges?.[eff.casterId || casterId || '']?.[gaugeId] ?? 0;
        if (gaugeVal >= thresh) return false;
      }

      if (cond.startsWith('enemy_count_below:')) {
        const n = parseInt(cond.split(':')[1], 10);
        const count = (ctx.state as any)?.enemyCount ?? 1;
        if (count > n) return false;
      }

      if (cond.startsWith('enemy_count_above:')) {
        const n = parseInt(cond.split(':')[1], 10);
        const count = (ctx.state as any)?.enemyCount ?? 1;
        if (count < n) return false;
      }

      if (cond === 'has_burst1_ally') {
        const has = ctx.team.members.some(
          (m) => m.id !== (eff.casterId || casterId) && ((m.burstLevel ?? 0) === 1 || (m as any).burstStage === 1)
        );
        if (!has) return false;
      }

      if (cond === 'no_burst1_ally') {
        const has = ctx.team.members.some(
          (m) => m.id !== (eff.casterId || casterId) && ((m.burstLevel ?? 0) === 1 || (m as any).burstStage === 1)
        );
        if (has) return false;
      }

      if (cond === 'target_stunned') {
        const stunned = this._active.some(
          (ab) => ab.targetId === '__enemy__' && ab.stat === 'stun'
        );
        if (!stunned) return false;
      }

      if (cond === 'core_hit') {
        const hasCore = (ctx.enemy as any).corePx > 0;
        if (!hasCore) return false;
      }
    }

    return true;
  }

  /** 자신 상태(버프명 또는 weapon_change 모드) 판정 */
  private _hasSelfState(charId: string, stateName: string, ctx: BattleContext): boolean {
    const inActive = this._active.some(
      (ab) =>
        ab.targetId === charId &&
        (ab.name === stateName ||
          ab.sourceSkill === stateName ||
          (ab.effectDef as any)?.name === stateName)
    );
    if (inActive) return true;
    const weaponChangeMode = (ctx.state as any)?.weapon_change?.[charId];
    return weaponChangeMode === stateName;
  }

  /** 버프/효과 활성화 처리 */
  private _activate(
    eff: NormalizedSkillEffect,
    t: number,
    casterId: string,
    ctx: BattleContext
  ): void {
    const targets = this._resolveTargets(eff.target, casterId, ctx);

    if (eff.type === 'instant') {
      this._dispatchInstant(eff, t, casterId, targets, ctx);
      return;
    }

    if (eff.type === 'damage') {
      this._dispatchDamage(eff, t, casterId, targets, ctx);
      return;
    }

    // buff 또는 weapon_change
    for (const targetId of targets) {
      // 디버프 면역 체크
      if (eff.polarity === 'harmful') {
        const targetBuffs = this.getBuffs(targetId, casterId, ctx, t);
        if (targetBuffs.debuff_immune) continue;
      }

      const duration =
        eff.duration === 'permanent' || eff.duration === -1 || eff.duration === undefined
          ? Infinity
          : eff.duration;
      const expiresAt = duration === Infinity ? Infinity : t + (duration as number);

      const existingIdx = this._active.findIndex(
        (ab) =>
          ab.targetId === targetId &&
          ab.name === eff.name &&
          ab.stat === eff.stat &&
          ab.casterId === casterId
      );

      if (existingIdx >= 0) {
        const existing = this._active[existingIdx];
        existing.stack = Math.min(existing.maxStack, existing.stack + 1);
        existing.activatedAt = t;
        existing.expiresAt = expiresAt;
        if (eff.duration_bullets) existing.bulletsLeft = eff.duration_bullets;

        if (eff.name && existing.stack >= existing.maxStack) {
          this.notify(`stack_reach:${eff.name}:${existing.stack}`, t, targetId, ctx);
          this.notify(`stack_reach:${eff.name}:${existing.maxStack}`, t, targetId, ctx);
        }

        const prevEvent = this._timelineEvents.find(
          (e) => e.uid === existing.uid && e.endTime === Infinity
        );
        if (prevEvent) prevEvent.endTime = t;
        this._timelineEvents.push({
          uid: existing.uid,
          targetId,
          casterId,
          buffName: eff.name,
          stat: eff.stat || 'unknown',
          sourceSkill: eff.source || 'skill',
          polarity: eff.polarity || 'beneficial',
          value: (eff.value || 0) * existing.stack,
          startTime: t,
          endTime: Infinity,
          isPermanent: duration === Infinity,
        });

        // infinite_ammo 상태 동기화
        if (eff.stat === 'infinite_ammo') {
          this._infiniteAmmoChars.add(targetId);
        }
      } else {
        const newBuff: ActiveBuff = {
          uid: this._nextUid++,
          id: `${casterId}__${eff.name}__${eff.stat}__${this._nextUid}`,
          casterId,
          targetId,
          name: eff.name,
          sourceSkill: eff.source || 'skill',
          type: eff.type,
          stat: eff.stat || 'atk_pct',
          polarity: eff.polarity || 'beneficial',
          value: eff.value || 0,
          stack: 1,
          maxStack: eff.max_stack || 1,
          activatedAt: t,
          expiresAt,
          bulletsLeft: eff.duration_bullets,
          shotsLeft: eff.duration_shots,
          isPermanent: duration === Infinity,
          effectDef: eff,
          scaling: eff.scaling,
          scalingRef: eff.scaling_ref,
          target_code: eff.target_code,
        };
        this._active.push(newBuff);
        this._timelineEvents.push({
          uid: newBuff.uid,
          targetId,
          casterId,
          buffName: eff.name,
          stat: eff.stat || 'unknown',
          sourceSkill: eff.source || 'skill',
          polarity: eff.polarity || 'beneficial',
          value: eff.value || 0,
          startTime: t,
          endTime: Infinity,
          isPermanent: duration === Infinity,
        });

        // infinite_ammo 상태 동기화
        if (eff.stat === 'infinite_ammo') {
          this._infiniteAmmoChars.add(targetId);
        }
      }
    }
  }

  /** 타겟 목록 해석 — IMPL-STATUS.md target 마스터 테이블 기준 */
  private _resolveTargets(
    targetPattern: string,
    casterId: string,
    ctx: BattleContext
  ): string[] {
    const members = ctx.team.members;
    const casterIdx = members.findIndex((m) => m.id === casterId);

    // ── 자신 ────────────────────────────────────────────────────
    if (targetPattern === 'self') return [casterId];

    // ── 전체 아군 ─────────────────────────────────────────────
    if (targetPattern === 'all_allies' || targetPattern === 'allies') {
      return members.map((m) => m.id);
    }

    // ── 자신 제외 아군 ────────────────────────────────────────
    if (
      targetPattern === 'all_allies_excl_self' ||
      targetPattern === 'all_allies_excluding_self' ||
      targetPattern === 'allies_excluding_self'
    ) {
      return members.filter((m) => m.id !== casterId).map((m) => m.id);
    }

    // ── 적 계열 (단일 보스 시뮬 → __enemy__ 센티널) ──────────
    if (
      targetPattern === 'enemy' ||
      targetPattern === 'target' ||
      targetPattern === 'target_body' ||
      targetPattern === 'same_target' ||
      targetPattern === 'all_enemies' ||
      targetPattern === 'enemies_in_range' ||
      targetPattern === 'enemies_nearest_in_range' ||
      targetPattern.startsWith('enemies_random:') ||
      targetPattern.startsWith('enemies_nearest:') ||
      targetPattern.startsWith('enemies_top_atk:') ||
      targetPattern.startsWith('enemies_top_def:') ||
      targetPattern.startsWith('enemies_lowest_def:') ||
      targetPattern.startsWith('enemies_lowest_hp:') ||
      targetPattern.startsWith('enemies_top_hp:') ||
      targetPattern.startsWith('target_and_nearby:') ||
      targetPattern.startsWith('enemies_with_buff:') ||
      targetPattern.startsWith('enemies_code:') ||
      targetPattern.startsWith('enemies_lowest_hp_code:')
    ) {
      return ['__enemy__'];
    }

    // ── 구현 없는 타겟 ────────────────────────────────────────
    if (
      targetPattern === 'self_cover' ||
      targetPattern === 'all_projectiles' ||
      targetPattern.startsWith('allies_lowest_cover_hp:')
    ) {
      return [];
    }

    // ── 앞 N명 ────────────────────────────────────────────────
    const alliesNMatch = targetPattern.match(/^allies:(\d+)$/);
    if (alliesNMatch) {
      return members.slice(0, parseInt(alliesNMatch[1])).map((m) => m.id);
    }

    // ── 인접 아군 ─────────────────────────────────────────────
    const adjacentMatch = targetPattern.match(/^allies_adjacent:(\d+)$/);
    if (adjacentMatch && casterIdx !== -1) {
      const range = parseInt(adjacentMatch[1]);
      const result = [casterId];
      for (let d = 1; d <= range; d++) {
        if (casterIdx - d >= 0) result.push(members[casterIdx - d].id);
        if (casterIdx + d < members.length) result.push(members[casterIdx + d].id);
      }
      return [...new Set(result)];
    }

    // ── 자신 + 인접 N기 ───────────────────────────────────────
    const selfAdjacentMatch = targetPattern.match(/^self_and_adjacent_allies_(\d+)$/);
    if (selfAdjacentMatch && casterIdx !== -1) {
      const range = parseInt(selfAdjacentMatch[1]);
      const result = [casterId];
      for (let d = 1; d <= range; d++) {
        if (casterIdx - d >= 0) result.push(members[casterIdx - d].id);
        if (casterIdx + d < members.length) result.push(members[casterIdx + d].id);
      }
      return [...new Set(result)];
    }

    // ── 공격력 상위 N명 ───────────────────────────────────────
    const topAtkMatch = targetPattern.match(/^allies_top_atk:(\d+)$/);
    if (topAtkMatch) {
      const n = parseInt(topAtkMatch[1]);
      return [...members]
        .sort((a, b) => this._getEffectiveAtk(b, ctx) - this._getEffectiveAtk(a, ctx))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 공격력 상위 N명 (자신 제외) ───────────────────────────
    const topAtkExclMatch = targetPattern.match(/^allies_top_atk_excl:(\d+)$/);
    if (topAtkExclMatch) {
      const n = parseInt(topAtkExclMatch[1]);
      return [...members]
        .filter((m) => m.id !== casterId)
        .sort((a, b) => this._getEffectiveAtk(b, ctx) - this._getEffectiveAtk(a, ctx))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 방어력 상위 N명 ───────────────────────────────────────
    const topDefMatch = targetPattern.match(/^allies_top_def:(\d+)$/);
    if (topDefMatch) {
      const n = parseInt(topDefMatch[1]);
      return [...members]
        .sort((a, b) => (b.defense || 0) - (a.defense || 0))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 체력 하위 N명 ─────────────────────────────────────────
    const lowestHpMatch = targetPattern.match(/^allies_lowest_hp:(\d+)$/);
    if (lowestHpMatch) {
      const n = parseInt(lowestHpMatch[1]);
      return [...members]
        .sort((a, b) => (a.hp / (a.maxHp || a.hp || 1)) - (b.hp / (b.maxHp || b.hp || 1)))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 체력 하위 N명 (자신 제외) ─────────────────────────────
    const lowestHpExclMatch = targetPattern.match(/^allies_lowest_hp_excl:(\d+)$/);
    if (lowestHpExclMatch) {
      const n = parseInt(lowestHpExclMatch[1]);
      return [...members]
        .filter((m) => m.id !== casterId)
        .sort((a, b) => (a.hp / (a.maxHp || a.hp || 1)) - (b.hp / (b.maxHp || b.hp || 1)))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 무작위 N명 ─────────────────────────────────────────────
    const randomMatch = targetPattern.match(/^allies_random:(\d+)$/);
    if (randomMatch) {
      const n = parseInt(randomMatch[1]);
      const pool = members.filter((m) => m.id !== casterId);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n).map((m) => m.id);
    }

    // ── 시전자보다 방어력 낮은 아군 ──────────────────────────
    if (targetPattern === 'allies_below_def') {
      const caster = members.find((m) => m.id === casterId);
      if (!caster) return [];
      return members
        .filter((m) => (m.defense || 0) < (caster.defense || 0))
        .map((m) => m.id);
    }

    // ── 무기별 ────────────────────────────────────────────────
    const weaponMatch = targetPattern.match(/^allies_weapon:(.+)$/);
    if (weaponMatch) {
      const wpn = weaponMatch[1].toUpperCase();
      return members.filter((m) => m.weapon === wpn).map((m) => m.id);
    }

    const weaponExclMatch = targetPattern.match(/^allies_weapon_excl_self:(.+)$/);
    if (weaponExclMatch) {
      const wpn = weaponExclMatch[1].toUpperCase();
      return members.filter((m) => m.id !== casterId && m.weapon === wpn).map((m) => m.id);
    }

    // ── 무기+공격력 상위 N명 ──────────────────────────────────
    const wpnTopAtkMatch = targetPattern.match(/^allies_weapon_top_atk:(.+):(\d+)$/);
    if (wpnTopAtkMatch) {
      const wpn = wpnTopAtkMatch[1].toUpperCase();
      const n = parseInt(wpnTopAtkMatch[2]);
      return [...members]
        .filter((m) => m.weapon === wpn)
        .sort((a, b) => this._getEffectiveAtk(b, ctx) - this._getEffectiveAtk(a, ctx))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 클래스별 ──────────────────────────────────────────────
    const classMatch = targetPattern.match(/^allies_class:(.+)$/);
    if (classMatch) {
      return members.filter((m) => (m as any).charClass === classMatch[1]).map((m) => m.id);
    }

    // ── 원소 코드별 ───────────────────────────────────────────
    const codeMatch = targetPattern.match(/^allies_code:(.+)$/);
    if (codeMatch) {
      return members.filter((m) => m.element === codeMatch[1]).map((m) => m.id);
    }

    // ── 원소+무기 복합 ────────────────────────────────────────
    const codeWpnMatch = targetPattern.match(/^allies_code_weapon:(.+):(.+)$/);
    if (codeWpnMatch) {
      const code = codeWpnMatch[1];
      const wpn = codeWpnMatch[2].toUpperCase();
      return members.filter((m) => m.element === code && m.weapon === wpn).map((m) => m.id);
    }

    // ── 원소+무기+순서 N명 ────────────────────────────────────
    const codeWpnLeftMatch = targetPattern.match(/^allies_code_weapon_leftmost:(.+):(.+):(\d+)$/);
    if (codeWpnLeftMatch) {
      const code = codeWpnLeftMatch[1];
      const wpn = codeWpnLeftMatch[2].toUpperCase();
      const n = parseInt(codeWpnLeftMatch[3]);
      return members
        .filter((m) => m.element === code && m.weapon === wpn)
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 버스트3 아군 ──────────────────────────────────────────
    if (targetPattern === 'allies_burst3') {
      return members.filter((m) => (m.burstLevel === 3 || (m as any).burstStage === 3)).map((m) => m.id);
    }

    // ── 버스트3 중 공격력 하위 N명 ────────────────────────────
    const lowestAtkB3Match = targetPattern.match(/^allies_lowest_atk_burst3:(\d+)$/);
    if (lowestAtkB3Match) {
      const n = parseInt(lowestAtkB3Match[1]);
      return [...members]
        .filter((m) => (m.burstLevel === 3 || (m as any).burstStage === 3))
        .sort((a, b) => this._getEffectiveAtk(a, ctx) - this._getEffectiveAtk(b, ctx))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 기본 차지 시간 상위 N명 ───────────────────────────────
    const topChargeTimeMatch = targetPattern.match(/^allies_top_base_charge_time:(\d+)$/);
    if (topChargeTimeMatch) {
      const n = parseInt(topChargeTimeMatch[1]);
      return [...members]
        .filter((m) => (m as any).chargeTime != null)
        .sort((a, b) => ((b as any).chargeTime || 0) - ((a as any).chargeTime || 0))
        .slice(0, n)
        .map((m) => m.id);
    }

    // ── 버스트 사용 아군 ──────────────────────────────────────
    if (targetPattern === 'all_allies_burst_casted') {
      return members
        .filter((m) => (ctx.state as any)?.burst_casted?.[m.id])
        .map((m) => m.id);
    }
    if (targetPattern === 'all_allies_burst_not_casted') {
      return members
        .filter((m) => !(ctx.state as any)?.burst_casted?.[m.id])
        .map((m) => m.id);
    }

    // ── 버스트 사용 + 버스트3 아군 ────────────────────────────
    if (targetPattern === 'allies_burst_casted_burst3') {
      return members
        .filter(
          (m) =>
            (ctx.state as any)?.burst_casted?.[m.id] &&
            (m.burstLevel === 3 || (m as any).burstStage === 3)
        )
        .map((m) => m.id);
    }

    // ── 버스트 사용 + 무기별 ──────────────────────────────────
    const burstCastedWpnMatch = targetPattern.match(/^allies_burst_casted_weapon:(.+)$/);
    if (burstCastedWpnMatch) {
      const wpn = burstCastedWpnMatch[1].toUpperCase();
      return members
        .filter(
          (m) =>
            (ctx.state as any)?.burst_casted?.[m.id] &&
            m.weapon === wpn
        )
        .map((m) => m.id);
    }

    // ── 특정 버프가 활성인 아군 ───────────────────────────────
    const withBuffMatch = targetPattern.match(/^allies_with_buff:(.+)$/);
    if (withBuffMatch) {
      const buffName = withBuffMatch[1];
      return members
        .filter((m) => this._hasSelfState(m.id, buffName, ctx))
        .map((m) => m.id);
    }

    // ── 버스트3 + persona_state 보유 (자신 제외) ──────────────
    if (targetPattern === 'allies_burst3_persona_excl_self') {
      return members
        .filter(
          (m) =>
            m.id !== casterId &&
            (m.burstLevel === 3 || (m as any).burstStage === 3) &&
            this._active.some((ab) => ab.targetId === m.id && ab.stat === 'persona_state')
        )
        .map((m) => m.id);
    }

    // ── 기본값: 자신 ─────────────────────────────────────────
    console.debug(`[BuffManager] 미처리 target 패턴: "${targetPattern}" — 자신으로 폴백`);
    return [casterId];
  }

  private _getEffectiveAtk(char: Character, ctx: BattleContext): number {
    const buffs = this.getBuffs(char.id, char.id, ctx, ctx.time || 0);
    return Math.round(char.atk * (1 + (char.equipATKPercent || 0) + buffs.atk_pct / 100)) + buffs.atk_flat;
  }

  /** 인스턴트 효과 처리 — _dispatch_instant() */
  private _dispatchInstant(
    eff: NormalizedSkillEffect,
    t: number,
    casterId: string,
    targets: string[],
    ctx: BattleContext
  ): void {
    const stat = eff.stat;
    const value = eff.value || 0;
    const fixedValue = eff.fixed_value ?? value;

    for (const targetId of targets) {
      const char = ctx.team.members.find((m) => m.id === targetId);

      // ── 버스트 쿨 감소 ──────────────────────────────────────
      if (stat === 'burst_cooldown_reduce') {
        if (ctx.burstCooldowns && ctx.burstCooldowns[targetId] !== undefined) {
          ctx.burstCooldowns[targetId] = Math.max(0, ctx.burstCooldowns[targetId] - value);
        }
      }

      // ── 장탄 충전 (%) ─────────────────────────────────────
      else if (stat === 'ammo_charge_pct') {
        if (char) {
          const addAmmo = Math.floor((char.maxAmmo || 0) * (value / 100));
          char.ammo = Math.min(char.maxAmmo || 0, char.ammo + addAmmo);
        }
      }

      // ── 장탄 충전 (flat) ──────────────────────────────────
      else if (stat === 'ammo_charge_flat') {
        if (char) {
          char.ammo = Math.min(char.maxAmmo || 0, char.ammo + Math.floor(value));
        }
      }

      // ── HP 회복 ───────────────────────────────────────────
      else if (stat === 'heal_hp_pct') {
        if (char) {
          const healAmt = (char.maxHp || char.hp) * (value / 100);
          char.hp = Math.min(char.maxHp || char.hp, char.hp + healAmt);
          this.notify('event:heal_received', t, targetId, ctx);
          this.notify('heal_received', t, targetId, ctx);
        }
      }

      // ── 현재 체력 감소 (UnParsing.md 캐릭터 예외) ─────────
      else if (stat === 'current_hp_reduce') {
        if (char) {
          const reduceAmt = (char.maxHp || char.hp) * (value / 100);
          char.hp = Math.max(1, char.hp - reduceAmt);
        }
      }

      // ── 강제 재장전 ───────────────────────────────────────
      else if (stat === 'force_reload') {
        if (char && (ctx.state as any)) {
          (ctx.state as any)[`${char.id}_force_reload`] = true;
        }
      }

      // ── 버프 스택 추가 ────────────────────────────────────
      else if (stat === 'buff_stack_add' || stat === 'debuff_stack_add') {
        const buffName = eff.target_effect;
        if (buffName) {
          const existing = this._active.find(
            (ab) => ab.name === buffName && (ab.targetId === targetId || ab.casterId === targetId)
          );
          if (existing) {
            existing.stack = Math.min(existing.maxStack, existing.stack + Math.round(value));
            existing.activatedAt = t;
          }
        }
      }

      // ── 버프 스택 제거 ────────────────────────────────────
      else if (stat === 'buff_stack_remove' || stat === 'debuff_stack_remove') {
        const buffName = eff.target_effect;
        if (buffName) {
          const existing = this._active.find(
            (ab) => ab.name === buffName && ab.targetId === targetId
          );
          if (existing) {
            existing.stack = Math.max(0, existing.stack - Math.round(value));
            if (existing.stack <= 0 && !existing.isPermanent) {
              const idx = this._active.indexOf(existing);
              if (idx >= 0) this._active.splice(idx, 1);
            }
          }
        }
      }

      // ── 버프 스택 초기화 ──────────────────────────────────
      else if (stat === 'buff_stack_init') {
        const buffName = eff.target_effect;
        if (buffName) {
          const existing = this._active.find(
            (ab) => ab.name === buffName && ab.targetId === targetId
          );
          if (!existing) {
            // 새 버프 생성
            const srcEff = this._effects.find((e) => e.name === buffName);
            if (srcEff) {
              const newBuff: ActiveBuff = {
                uid: this._nextUid++,
                id: `${casterId}__${buffName}__init`,
                casterId,
                targetId,
                name: buffName,
                sourceSkill: 'instant',
                type: 'buff',
                stat: srcEff.stat || 'atk_pct',
                polarity: srcEff.polarity || 'beneficial',
                value: srcEff.value || 0,
                stack: Math.round(value),
                maxStack: srcEff.max_stack || Math.round(value),
                activatedAt: t,
                expiresAt: Infinity,
                isPermanent: true,
                effectDef: srcEff,
              };
              this._active.push(newBuff);
            }
          }
        }
      }

      // ── 버프 지속시간 연장 ────────────────────────────────
      else if (stat === 'named_buff_duration_extend') {
        const buffName = eff.target_effect;
        if (buffName) {
          for (const ab of this._active) {
            if (
              (ab.name === buffName || ab.name.startsWith(`${buffName} `)) &&
              !ab.isPermanent
            ) {
              ab.expiresAt += fixedValue;
            }
          }
        }
      }

      // ── 버프 이름 기반 전체 제거 ────────────────────────────
      else if (stat === 'remove_named_buff') {
        const buffName = eff.target_effect;
        if (buffName) {
          this._active = this._active.filter((ab) => {
            const matchesName = ab.name === buffName || ab.effectDef?.name === buffName;
            const matchesTarget = ab.targetId === targetId || ab.casterId === targetId || targetId === '__enemy__';
            if (matchesName && matchesTarget) {
              const ev = this._timelineEvents.find((e) => e.uid === ab.uid && e.endTime === Infinity);
              if (ev) ev.endTime = t;
              return false;
            }
            return true;
          });
        }
      }

      // ── 스킬 쿨 감소 (%) ──────────────────────────────────
      else if (stat === 'skill_cooldown_reduce_pct') {
        // target 캐릭터의 every:Ns 스킬 잔여 시간 단축
        if (ctx.state) {
          const stateKey = `__skill_cd_reduce_pct_${targetId}`;
          (ctx.state as any)[stateKey] = ((ctx.state as any)[stateKey] || 0) + value;
        }
      }
    }
  }

  /** 스킬 대미지 디스패치 */
  private _dispatchDamage(
    eff: NormalizedSkillEffect,
    t: number,
    casterId: string,
    targets: string[],
    ctx: BattleContext
  ): void {
    if (eff.stat === 'dot_damage') {
      const duration = eff.duration === 'permanent' || eff.duration === -1 ? 10 : (eff.duration ?? 5);
      const interval = eff.tick_interval || eff.interval || 1.0;
      this._dotTimers.push({
        uid: this._nextUid++,
        casterId,
        targetId: targets[0] || '__enemy__',
        effectDef: eff,
        valuePerTick: (eff.value || 0) / 100,
        interval,
        nextTick: t + interval,
        expiresAt: t + (duration as number),
      });
      return;
    }

    const caster = ctx.team.members.find((m) => m.id === casterId);
    if (!caster) return;

    let scaleFactor = 1;
    if (eff.scaling === 'stack_count' && eff.scaling_ref) {
      const refBuff = this._active.find(
        (b) =>
          b.name === eff.scaling_ref &&
          (b.casterId === casterId || b.targetId === casterId || b.targetId === '__enemy__')
      );
      scaleFactor = refBuff ? refBuff.stack : 0;
      if (scaleFactor === 0) return;
    }

    const buffs = this.getBuffs(caster.id, caster.id, ctx, t);
    const enemyBuffs = this.getBuffs('__enemy__', caster.id, ctx, t);
    const hasAdvantage = checkAdvantage(ctx.enemy.element, caster.element, caster.id, ctx);
    const critChance = (buffs.crit_rate || (caster.crit ?? 15) + (caster.buff?.critRate || 0)) / 100;
    const isCrit = ctx.rng ? ctx.rng.next() < critChance : false;

    const damageParams: DamageParams = {
      baseATK: caster.atk || 0,
      extraATKPercent: (caster.equipATKPercent ?? 0) + (buffs.atk_pct / 100),
      extraATKFlat: buffs.atk_flat || (caster.buff?.extraATK ?? 0),
      enemyBaseDEF: ctx.enemy.defense || 0,
      enemyDEFPercent: buffs.enemy_def_down_pct ? -(buffs.enemy_def_down_pct / 100) : 0,
      enemyDEFFlat: ctx.enemy.debuff?.defFlat ?? 0,
      atkCoef: (eff.value / 100) * scaleFactor,
      finalATKModifier: 0,
      isNormalAttack: false,
      isCrit,
      critBonusBase: (caster.critMult ? (caster.critMult - 1) : 0.5) + (caster.equipCritDmgPercent ?? 0),
      extraCritDmg: buffs.crit_dmg / 100,
      isCore: false,
      coreHitBonus: 0,
      fullBurstBonus: ctx.burstActive ? 0.5 : 0,
      rangeBonus: 0,
      weakPointBase: hasAdvantage ? 1.1 : 1.0,
      weakPointExtra: (buffs.element_bonus_pct / 100) + (hasAdvantage ? (caster.equipWeakPointPercent ?? 0) : 0),
      chargeDmgBonus: 0,
      atkDmgUp: buffs.atk_dmg_pct / 100,
      dotDmgUp: buffs.dot_dmg_pct / 100,
      pierceDmgUp: (caster.cubePierceDmgUp ?? 0) + (buffs.pierce_dmg_pct / 100),
      partDmgUp: (caster.cubePartDmgUp ?? 0) + (buffs.part_dmg_pct / 100),
      projectileAttachmentDmgUp: eff.stat === 'projectile_attachment_damage' ? (buffs.projectile_attachment_dmg / 100) : 0,
      projectileExplosionDmgUp: eff.stat === 'projectile_explosion_damage' ? (buffs.projectile_explosion_dmg / 100) : 0,
      burstDmgUp: eff.stat === 'burst_damage' ? (buffs.burst_dmg_pct / 100) : 0,
      extraDmgUp: 0,
      enemyTakenUp: (enemyBuffs.received_dmg / 100) + (buffs.received_dmg / 100) + (ctx.enemy.debuff?.takenUp ?? 0),
      shareDmgUp: (buffs.split_dmg_pct / 100) + (caster.cubeSplitDmgUp ?? 0),
      enemyTakenDown: ctx.enemy.debuff?.takenDown ?? 0,
    };

    const singleDmg = calcNikkeDamage(damageParams);
    const hits = eff.hits || 1;
    const totalDmg = singleDmg * hits;

    ctx.enemy.hp -= totalDmg;
    ctx.totalDamage += totalDmg;
    ctx.log.push({
      time: t,
      type: 'skill_damage',
      source: casterId,
      value: totalDmg,
      description: eff.stat,
      skillName: eff.name,
    });

    if (eff.name && !eff.trigger.timing.some((tm) => tm.startsWith('weapon_hit:'))) {
      this.notify(`weapon_hit:${eff.name}`, t, casterId, ctx);
    }
  }

  /** 매 프레임(dt) 갱신 */
  public tick(t: number, dt: number, ctx: BattleContext): void {
    // 1. 만료된 버프 정리
    this._active = this._active.filter((ab) => {
      if (ab.isPermanent) return true;
      if (t >= ab.expiresAt) {
        const ev = this._timelineEvents.find(
          (e) => e.uid === ab.uid && e.endTime === Infinity
        );
        if (ev) ev.endTime = t;

        // infinite_ammo 만료 시 상태 제거
        if (ab.stat === 'infinite_ammo') {
          const stillHas = this._active.some(
            (other) =>
              other !== ab &&
              other.targetId === ab.targetId &&
              other.stat === 'infinite_ammo' &&
              other.expiresAt > t
          );
          if (!stillHas) this._infiniteAmmoChars.delete(ab.targetId);
        }

        return false;
      }
      return true;
    });

    // 2. DoT 타이머 처리
    for (let i = this._dotTimers.length - 1; i >= 0; i--) {
      const dot = this._dotTimers[i];
      if (t >= dot.expiresAt) {
        this._dotTimers.splice(i, 1);
        continue;
      }
      if (t >= dot.nextTick) {
        dot.nextTick += dot.interval;
        if (ctx.state) {
          (ctx.state as any).__pending_dot_dmg = (ctx.state as any).__pending_dot_dmg || [];
          (ctx.state as any).__pending_dot_dmg.push({
            casterId: dot.casterId,
            valuePerTick: dot.valuePerTick,
            skillName: dot.effectDef.name,
          });
        }
      }
    }
  }

  /** 탄환 발사 시 탄환 기반 버프 소모 */
  public consumeBulletBuff(charId: string): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const ab = this._active[i];
      if (ab.targetId === charId && ab.bulletsLeft !== undefined) {
        ab.bulletsLeft -= 1;
        if (ab.bulletsLeft <= 0) {
          this._active.splice(i, 1);
        }
      }
    }
  }

  /** 현재 대상 캐릭터에게 유효한 모든 버프 합산 조회 */
  public getBuffs(
    targetId: string,
    casterId: string,
    ctx: BattleContext,
    t: number
  ): BuffCollection {
    const buffs = createDefaultBuffCollection();
    const members = ctx?.team?.members || [];
    const targetChar = members.find((m) => m.id === targetId);

    for (const ab of this._active) {
      if (ab.targetId !== targetId && ab.targetId !== '__all__') continue;

      const stat = ab.stat;

      // _FIXED_VALUE_STATS: getBuffs() 합산 안 함 (직접 _active 읽는 경로)
      if (_FIXED_VALUE_STATS.has(stat)) continue;

      // boolean 플래그 처리
      if (_BOOLEAN_FLAG_STATS.has(stat)) {
        (buffs as any)[stat] = true;
        continue;
      }

      let val = ab.value * ab.stack;

      // ── caster_based 환산 ──────────────────────────────────
      if (stat === 'atk_caster_based_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster) buffs.atk_flat += caster.atk * (val / 100);
        continue;
      }

      if (stat === 'atk_from_hp_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster) {
          const casterMaxHp = caster.maxHp || caster.hp;
          buffs.atk_flat += casterMaxHp * (val / 100);
        }
        continue;
      }

      if (stat === 'hp_caster_based_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster && targetChar) {
          const casterMaxHp = caster.maxHp || caster.hp;
          const targetMaxHp = targetChar.maxHp || targetChar.hp;
          if (targetMaxHp > 0) {
            buffs.max_hp_pct += (casterMaxHp * (val / 100) / targetMaxHp) * 100;
          }
        }
        continue;
      }

      if (stat === 'hp_only_caster_based_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster && targetChar) {
          const casterMaxHp = caster.maxHp || caster.hp;
          const targetMaxHp = targetChar.maxHp || targetChar.hp;
          if (targetMaxHp > 0) {
            buffs.max_hp_only_pct += (casterMaxHp * (val / 100) / targetMaxHp) * 100;
          }
        }
        continue;
      }

      if (stat === 'def_caster_based_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster && targetChar) {
          const casterDef = caster.defense;
          const targetDef = targetChar.defense;
          if (targetDef > 0) {
            buffs.def_pct += (casterDef * (val / 100) / targetDef) * 100;
          }
        }
        continue;
      }

      if (stat === 'charge_speed_caster_based_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster && (caster as any).chargeTime) {
          // 시전자 차지 시간 기준으로 % 환산
          buffs.charge_speed_pct += val;
        }
        continue;
      }

      // ── 적 방어력 방향 분기 ───────────────────────────────
      if (stat === 'def_pct') {
        if (targetId === '__enemy__') {
          buffs.enemy_def_down_pct += val;
        } else {
          buffs.def_pct += val;
        }
        continue;
      }

      // ── 일반 stat 매핑 ────────────────────────────────────
      const mappedKey = _STAT_TO_BUFF[stat];
      if (mappedKey && typeof (buffs as any)[mappedKey] === 'number') {
        (buffs as any)[mappedKey] += val;
      }
    }

    // ── 후처리 ────────────────────────────────────────────────

    // 크리 확률: 기본 15% + 버프, 최대 100%
    if (targetChar) {
      buffs.crit_rate = Math.min(100, (targetChar.crit || 15) + buffs.crit_rate);
    } else {
      buffs.crit_rate = Math.min(100, 15 + buffs.crit_rate);
    }

    // 차지 속도 버프 면역
    if (buffs.charge_speed_buff_immune && buffs.charge_speed_pct > 0) {
      buffs.charge_speed_pct = 0;
    }
    if (buffs.charge_speed_debuff_immune && buffs.charge_speed_pct < 0) {
      buffs.charge_speed_pct = 0;
    }

    // charge_speed_overflow_conversion_pct → charge_dmg_pct 합산
    if (buffs.charge_speed_overflow_conversion_pct > 0 && buffs.charge_speed_pct > 100) {
      const overflow = buffs.charge_speed_pct - 100;
      buffs.charge_dmg_pct += overflow * buffs.charge_speed_overflow_conversion_pct / 100;
      buffs.charge_speed_pct = 100;
    }

    return buffs;
  }

  /** infinite_ammo 상태 조회 */
  public hasInfiniteAmmo(charId: string): boolean {
    return this._infiniteAmmoChars.has(charId);
  }

  /** 특정 캐릭터의 버프 스택 수 조회 */
  public refCount(charId: string, refName: string): number | null {
    const ab = this._active.find((b) => b.targetId === charId && b.name === refName);
    if (ab) return ab.stack;
    return null;
  }

  /** 모든 활성 버프 반환 */
  public getActiveBuffs(): readonly ActiveBuff[] {
    return this._active;
  }

  /** 타임라인 이벤트 반환 */
  public getTimeline(duration: number): Array<{
    uid: number;
    targetId: string;
    casterId: string;
    buffName: string;
    stat: string;
    sourceSkill: string;
    polarity: string;
    value: number;
    startTime: number;
    endTime: number;
    isPermanent: boolean;
  }> {
    return this._timelineEvents.map((e) => ({
      ...e,
      endTime: e.endTime === Infinity ? duration : e.endTime,
    }));
  }

  public recordTimelineEvent(event: {
    uid: number;
    targetId: string;
    casterId: string;
    buffName: string;
    stat: string;
    sourceSkill: string;
    polarity: string;
    value: number;
    startTime: number;
    isPermanent: boolean;
  }): void {
    const existing = this._timelineEvents.find(
      (e) => e.uid === event.uid && e.endTime === Infinity
    );
    if (!existing) {
      this._timelineEvents.push({ ...event, endTime: Infinity });
    }
  }

  public closeTimelineEvent(uid: number, endTime: number): void {
    const ev = this._timelineEvents.find(
      (e) => e.uid === uid && e.endTime === Infinity
    );
    if (ev) ev.endTime = endTime;
  }
}
