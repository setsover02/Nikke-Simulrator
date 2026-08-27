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

          // 구현 제외 stat 경고
          const statKey = eff.stat || eff.effect;
          if (statKey && _UNIMPLEMENTED_STATS.has(statKey)) {
            console.debug(`[BuffManager] 미구현 stat "${statKey}" (${char.id} / ${eff.name}) — 무시됨.`);
          }

          const normalized: NormalizedSkillEffect = {
            id: eff.id || `${char.id}__${skill.id || skill.name}__eff${idx}`,
            source: skill.id || skill.type || 'skill',
            type: eff.type || 'buff',
            name: eff.name || skill.name || 'Skill Effect',
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
      // 시전자 필터링
      if (
        casterId &&
        eff.casterId &&
        eff.casterId !== casterId &&
        !eff.trigger.timing.some(
          (tm) => tm.startsWith('all_allies') || tm.startsWith('squad_')
        )
      ) {
        continue;
      }

      if (!this._timingMatch(eff.trigger.timing, event, currentCount, casterId, ctx)) {
        continue;
      }

      if (!this._conditionOk(eff, t, casterId, ctx)) {
        continue;
      }

      this._activate(eff, t, eff.casterId || casterId || 'unknown', ctx);
    }
  }

  /** 타이밍 일치 여부 확인 — IMPL-STATUS.md trigger 마스터 테이블 기준 */
  private _timingMatch(
    timings: string[],
    event: string,
    count: number,
    casterId: string | undefined,
    ctx: BattleContext
  ): boolean {
    for (const tm of timings) {
      // 완전 일치
      if (tm === event) return true;

      // timing_count:N (full_burst_start_count:2, full_burst_end_count:1 등)
      if (tm.startsWith(`${event}_count:`)) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count >= req) return true;
      }

      // timing_exact:N (full_burst_start_exact:2 — 정확히 N번째만)
      if (tm.startsWith(`${event}_exact:`)) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count === req) return true;
      }

      // hit_count:N (N발마다)
      if (event === 'hit_count' && tm.startsWith('hit_count:')) {
        const parts = tm.split(':');
        if (parts.length === 2) {
          const req = parseInt(parts[1], 10);
          if (!isNaN(req) && count % req === 0) return true;
        }
      }

      // hit_count:[스킬명]:N (named damage effect N회마다)
      if (event.startsWith('hit_count:') && !event.startsWith('hit_count:__')) {
        // event = "hit_count:효과명", tm = "hit_count:효과명:N"
        const evParts = event.split(':');
        const effName = evParts.slice(1).join(':');
        if (tm.startsWith(`hit_count:${effName}:`)) {
          const req = parseInt(tm.split(':').pop() || '0', 10);
          if (!isNaN(req) && count % req === 0) return true;
        }
      }

      // full_charge_count:N
      if (event === 'full_charge_hit' && tm.startsWith('full_charge_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count % req === 0) return true;
      }

      // crit_hit_count:N
      if (event === 'crit_hit' && tm.startsWith('crit_hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count % req === 0) return true;
      }

      // core_hit_count:N
      if (event === 'core_hit' && tm.startsWith('core_hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count % req === 0) return true;
      }

      // pellet_hit_count:N
      if (event === 'pellet_hit' && tm.startsWith('pellet_hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count % req === 0) return true;
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
        if (idx !== 1 && idx !== 3) return false;
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
        const ab = this._active.find(
          (b) => b.targetId === (eff.casterId || casterId) && b.name === buffName
        );
        if (!ab || ab.stack <= thresh) return false;
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
          (m) => (m as any).burstStage === 1
        );
        if (!has) return false;
      }

      if (cond === 'no_burst1_ally') {
        const has = ctx.team.members.some(
          (m) => (m as any).burstStage === 1
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
      (ab) => ab.targetId === charId && ab.name === stateName
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
      return members.filter((m) => (m as any).burstStage === 3).map((m) => m.id);
    }

    // ── 버스트3 중 공격력 하위 N명 ────────────────────────────
    const lowestAtkB3Match = targetPattern.match(/^allies_lowest_atk_burst3:(\d+)$/);
    if (lowestAtkB3Match) {
      const n = parseInt(lowestAtkB3Match[1]);
      return [...members]
        .filter((m) => (m as any).burstStage === 3)
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
            (m as any).burstStage === 3
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
            (m as any).burstStage === 3 &&
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
    }
    // 단발 스킬 대미지는 damageCalc에서 처리
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
