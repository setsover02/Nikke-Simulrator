// src/engine/buffManager.ts
// calc-master (buff_manager.py / IMPL-STATUS.md) 기반 중앙 집중식 버프 생명주기 관리자

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
} from './buffConstants';
import { BattleContext, Character } from '../types/battle';
import { checkAdvantage } from '../utils/charUtils';

export class BuffManager {
  private _nextUid = 1;
  private _effects: NormalizedSkillEffect[] = [];
  private _active: ActiveBuff[] = [];
  private _triggerCounts: Record<string, number> = {}; // effect_id -> count
  private _eventCounts: Record<string, Record<string, number>> = {}; // event -> (casterId -> count)
  private _everyIntervalTimers: Record<string, number> = {}; // effectUid -> nextTriggerTime
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

  constructor() {
    this.reset();
  }

  public reset(): void {
    this._nextUid = 1;
    this._effects = [];
    this._active = [];
    this._triggerCounts = {};
    this._eventCounts = {};
    this._everyIntervalTimers = {};
    this._dotTimers = [];
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

          // 수치 추출 (배열인 경우 해당 레벨, 단일값인 경우 그대로)
          let extractedValue = eff.fixed_value ?? eff.value;
          if (Array.isArray(eff.value)) {
            extractedValue = eff.value[sLvIdx] ?? eff.value[0];
          } else if (eff.values && typeof eff.values === 'object') {
            extractedValue = eff.values[String(sLvl)] ?? eff.values['10'] ?? 0;
          }
          if (typeof extractedValue === 'string') {
            extractedValue = parseFloat(extractedValue) || 0;
          }

          const normalized: NormalizedSkillEffect = {
            id: eff.id || `${char.id}__${skill.id || skill.name}__eff${idx}`,
            source: skill.id || skill.type || 'skill',
            type: eff.type || (eff.effect?.includes('damage') ? 'damage' : 'buff'),
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
            stat: eff.stat || eff.effect || 'atk_pct',
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
  }

  /** 이벤트 통지 및 조건 부합 효과 발동 */
  public notify(
    event: string,
    t: number,
    casterId: string | undefined,
    ctx: BattleContext
  ): void {
    // 이벤트 발생 횟수 기록
    const eventKey = event.split(':')[0];
    if (!this._eventCounts[eventKey]) {
      this._eventCounts[eventKey] = {};
    }
    const cId = casterId || '__all__';
    this._eventCounts[eventKey][cId] = (this._eventCounts[eventKey][cId] || 0) + 1;
    const currentCount = this._eventCounts[eventKey][cId];

    for (const eff of this._effects) {
      // 시전자 필터링 (특정 캐스터 이벤트인 경우)
      if (casterId && eff.casterId && eff.casterId !== casterId && !eff.trigger.timing.some(tm => tm.startsWith('all_allies') || tm.startsWith('squad_'))) {
        continue;
      }

      if (!this._timingMatch(eff.trigger.timing, event, currentCount)) {
        continue;
      }

      if (!this._conditionOk(eff, t, casterId, ctx)) {
        continue;
      }

      this._activate(eff, t, eff.casterId || casterId || 'unknown', ctx);
    }
  }

  /** 타이밍 일치 여부 확인 */
  private _timingMatch(timings: string[], event: string, count: number): boolean {
    for (const tm of timings) {
      if (tm === event) return true;

      // timing_count:N (예: full_burst_start_count:2)
      if (tm.startsWith(`${event}_count:`)) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count >= req) return true;
      }

      // hit_count:N
      if (event === 'hit_count' && tm.startsWith('hit_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count % req === 0) return true;
      }

      // full_charge_hit:N
      if (event === 'full_charge_hit' && tm.startsWith('full_charge_count:')) {
        const req = parseInt(tm.split(':')[1], 10);
        if (!isNaN(req) && count % req === 0) return true;
      }

      // burst_enter:N
      if (event.startsWith('burst_enter:') && tm === event) return true;
    }
    return false;
  }

  /** 발동 조건 평가 */
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

      if (cond.startsWith('prob:')) {
        const prob = parseFloat(cond.split(':')[1]) / 100;
        if (ctx.rng && ctx.rng.next() > prob) return false;
      }

      if (cond.startsWith('target_element:')) {
        const elem = cond.split(':')[1];
        if (ctx.enemy.element !== elem) return false;
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

      if (cond.startsWith('self_stat_above:') && caster) {
        const parts = cond.split(':');
        const statKey = parts[1];
        const thresh = parseFloat(parts[2] || '0');
        const buffs = this.getBuffs(caster.id, caster.id, ctx, t);
        const statVal = (buffs as any)[statKey] ?? 0;
        if (statVal <= thresh) return false;
      }

      if (cond.startsWith('self_stat_below:') && caster) {
        const parts = cond.split(':');
        const statKey = parts[1];
        const thresh = parseFloat(parts[2] || '0');
        const buffs = this.getBuffs(caster.id, caster.id, ctx, t);
        const statVal = (buffs as any)[statKey] ?? 0;
        if (statVal >= thresh) return false;
      }
    }

    return true;
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
      // 면역 체크
      const targetBuffs = this.getBuffs(targetId, casterId, ctx, t);
      if (eff.polarity === 'harmful' && targetBuffs.debuff_immune) {
        continue;
      }

      const duration =
        eff.duration === 'permanent' || eff.duration === -1 || eff.duration === undefined
          ? Infinity
          : eff.duration;
      const expiresAt = duration === Infinity ? Infinity : t + duration;

      const existingIdx = this._active.findIndex(
        (ab) =>
          ab.targetId === targetId &&
          ab.name === eff.name &&
          ab.stat === eff.stat &&
          ab.casterId === casterId
      );

      if (existingIdx >= 0) {
        // 기존 버프 중첩 갱신
        const existing = this._active[existingIdx];
        existing.stack = Math.min(existing.maxStack, existing.stack + 1);
        existing.activatedAt = t;
        existing.expiresAt = expiresAt;
        if (eff.duration_bullets) {
          existing.bulletsLeft = eff.duration_bullets;
        }
      } else {
        // 새 버프 등록
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
      }
    }
  }

  /** 타겟 목록 해석 */
  private _resolveTargets(
    targetPattern: string,
    casterId: string,
    ctx: BattleContext
  ): string[] {
    const members = ctx.team.members;
    const casterIdx = members.findIndex((m) => m.id === casterId);

    if (targetPattern === 'self') {
      return [casterId];
    }
    if (targetPattern === 'all_allies' || targetPattern === 'allies') {
      return members.map((m) => m.id);
    }
    if (targetPattern === 'all_allies_excluding_self' || targetPattern === 'allies_excluding_self') {
      return members.filter((m) => m.id !== casterId).map((m) => m.id);
    }
    if (
      targetPattern === 'enemy' ||
      targetPattern === 'all_enemies' ||
      targetPattern === 'target' ||
      targetPattern === 'closest_enemy' ||
      targetPattern === 'lowest_hp_enemy' ||
      targetPattern === 'highest_atk_enemy_1' ||
      targetPattern === 'highest_def_enemy_1' ||
      targetPattern === 'same_target'
    ) {
      return ['__enemy__'];
    }

    // allies_top_atk:N / top_atk_allies:N / highest_atk_allies_N
    if (
      targetPattern.startsWith('top_atk_allies:') ||
      targetPattern.startsWith('allies_top_atk:') ||
      targetPattern.startsWith('highest_atk_allies_')
    ) {
      const parts = targetPattern.split(/[:_]/);
      const n = parseInt(parts[parts.length - 1], 10) || 1;
      const sorted = [...members].sort((a, b) => {
        const atkA = this._getEffectiveAtk(a, ctx);
        const atkB = this._getEffectiveAtk(b, ctx);
        return atkB - atkA;
      });
      return sorted.slice(0, n).map((m) => m.id);
    }

    // 클래스별 대상 (화력형 / 지원형 / 방어형)
    if (targetPattern.startsWith('allies_class:')) {
      const cls = targetPattern.split(':')[1];
      return members.filter((m) => m.charClass === cls).map((m) => m.id);
    }
    if (targetPattern === 'attacker_allies') {
      return members.filter((m) => m.charClass === '화력형').map((m) => m.id);
    }
    if (targetPattern === 'supporter_allies') {
      return members.filter((m) => m.charClass === '지원형').map((m) => m.id);
    }
    if (targetPattern === 'defender_allies') {
      return members.filter((m) => m.charClass === '방어형').map((m) => m.id);
    }

    // 속성별 대상 (작열 / 수냉 / 풍압 / 전격 / 철갑)
    if (targetPattern.startsWith('allies_element:')) {
      const elem = targetPattern.split(':')[1];
      return members.filter((m) => m.element === elem).map((m) => m.id);
    }
    if (targetPattern === 'fire_element_allies') return members.filter((m) => m.element === '작열').map((m) => m.id);
    if (targetPattern === 'water_element_allies') return members.filter((m) => m.element === '수냉').map((m) => m.id);
    if (targetPattern === 'wind_element_allies') return members.filter((m) => m.element === '풍압').map((m) => m.id);
    if (targetPattern === 'electric_element_allies') return members.filter((m) => m.element === '전격').map((m) => m.id);
    if (targetPattern === 'iron_element_allies') return members.filter((m) => m.element === '철갑').map((m) => m.id);

    // 무기별 대상 (SG / SMG / AR / MG / SR / RL)
    if (targetPattern.startsWith('allies_weapon:')) {
      const wpn = targetPattern.split(':')[1].toUpperCase();
      return members.filter((m) => m.weapon === wpn).map((m) => m.id);
    }
    if (targetPattern === 'sg_allies') return members.filter((m) => m.weapon === 'SG').map((m) => m.id);
    if (targetPattern === 'smg_allies') return members.filter((m) => m.weapon === 'SMG').map((m) => m.id);
    if (targetPattern === 'ar_allies') return members.filter((m) => m.weapon === 'AR').map((m) => m.id);
    if (targetPattern === 'mg_allies') return members.filter((m) => m.weapon === 'MG').map((m) => m.id);
    if (targetPattern === 'sr_allies') return members.filter((m) => m.weapon === 'SR').map((m) => m.id);
    if (targetPattern === 'rl_allies') return members.filter((m) => m.weapon === 'RL').map((m) => m.id);

    // 무기별 대상 (자신 제외)
    if (targetPattern === 'sg_allies_excluding_self') return members.filter((m) => m.id !== casterId && m.weapon === 'SG').map((m) => m.id);
    if (targetPattern === 'smg_allies_excluding_self') return members.filter((m) => m.id !== casterId && m.weapon === 'SMG').map((m) => m.id);
    if (targetPattern === 'ar_allies_excluding_self') return members.filter((m) => m.id !== casterId && m.weapon === 'AR').map((m) => m.id);
    if (targetPattern === 'mg_allies_excluding_self') return members.filter((m) => m.id !== casterId && m.weapon === 'MG').map((m) => m.id);
    if (targetPattern === 'sr_allies_excluding_self') return members.filter((m) => m.id !== casterId && m.weapon === 'SR').map((m) => m.id);
    if (targetPattern === 'rl_allies_excluding_self') return members.filter((m) => m.id !== casterId && m.weapon === 'RL').map((m) => m.id);

    // 자신 및 인접 2기
    if (targetPattern === 'self_and_adjacent_allies_2' && casterIdx !== -1) {
      const targets = [casterId];
      if (casterIdx > 0) targets.push(members[casterIdx - 1].id);
      if (casterIdx < members.length - 1) targets.push(members[casterIdx + 1].id);
      return targets;
    }

    // 기본값: 자신
    return [casterId];
  }

  private _getEffectiveAtk(char: Character, ctx: BattleContext): number {
    const buffs = this.getBuffs(char.id, char.id, ctx, ctx.time || 0);
    return Math.round(char.atk * (1 + (char.equipATKPercent || 0) + buffs.atk_pct / 100)) + buffs.atk_flat;
  }

  /** 인스턴트 효과 처리 (힐, 쿨감, 탄환 충전 등) */
  private _dispatchInstant(
    eff: NormalizedSkillEffect,
    t: number,
    casterId: string,
    targets: string[],
    ctx: BattleContext
  ): void {
    const stat = eff.stat;
    const value = eff.value || 0;

    for (const targetId of targets) {
      const char = ctx.team.members.find((m) => m.id === targetId);
      if (!char) continue;

      if (stat === 'burst_cooldown_reduce') {
        if (ctx.burstCooldowns[targetId] !== undefined) {
          ctx.burstCooldowns[targetId] = Math.max(0, ctx.burstCooldowns[targetId] - value);
        }
      } else if (stat === 'ammo_charge_pct') {
        const addAmmo = Math.floor(char.maxAmmo * (value / 100));
        char.ammo = Math.min(char.maxAmmo, char.ammo + addAmmo);
      } else if (stat === 'ammo_charge_flat') {
        char.ammo = Math.min(char.maxAmmo, char.ammo + Math.floor(value));
      } else if (stat === 'heal_hp_pct') {
        const healAmt = (char.maxHp || char.hp) * (value / 100);
        char.hp = Math.min(char.maxHp || char.hp, char.hp + healAmt);
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
      // DoT 스케줄 등록
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
        expiresAt: t + duration,
      });
      return;
    }

    // 단발 스킬 대미지는 추후 damageCalc의 executeSkillDamage로 연계
  }

  /** 매 프레임(dt) 갱신 */
  public tick(t: number, dt: number, ctx: BattleContext): void {
    // 1. 만료된 버프 정리
    this._active = this._active.filter((ab) => {
      if (ab.isPermanent) return true;
      return t < ab.expiresAt;
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
        // DoT 대미지 발생 알림
        if (ctx.state) {
          ctx.state.__pending_dot_dmg = ctx.state.__pending_dot_dmg || [];
          ctx.state.__pending_dot_dmg.push({
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
      if (ab.targetId !== targetId && ab.targetId !== '__all__') {
        continue;
      }

      // 스택 수 고려
      let val = ab.value * ab.stack;

      // boolean 플래그 처리
      if (_BOOLEAN_FLAG_STATS.has(ab.stat)) {
        (buffs as any)[ab.stat] = true;
        continue;
      }

      // 시전자 기준 스탯 환산 (atk_caster_based_pct)
      if (ab.stat === 'atk_caster_based_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster) {
          buffs.atk_flat += caster.atk * (val / 100);
        }
        continue;
      }

      // 시전자 최대 체력 기준 공격력 환산 (atk_from_hp_pct)
      if (ab.stat === 'atk_from_hp_pct') {
        const caster = members.find((m) => m.id === ab.casterId);
        if (caster) {
          const casterMaxHp = caster.maxHp || caster.hp;
          buffs.atk_flat += casterMaxHp * (val / 100);
        }
        continue;
      }

      // 일반 stat 매핑
      const mappedKey = _STAT_TO_BUFF[ab.stat];
      if (mappedKey) {
        if (typeof (buffs as any)[mappedKey] === 'number') {
          (buffs as any)[mappedKey] += val;
        }
      }
    }

    // 크리티컬 확률 상한 처리 (기본 15% + 버프, 최대 100%)
    if (targetChar) {
      buffs.crit_rate = Math.min(100, targetChar.crit + buffs.crit_rate);
    } else {
      buffs.crit_rate = Math.min(100, 15 + buffs.crit_rate);
    }

    // 차지 속도 버프 면역 처리
    if (buffs.charge_speed_buff_immune && buffs.charge_speed_pct > 0) {
      buffs.charge_speed_pct = 0;
    }

    return buffs;
  }

  /** 특정 캐릭터의 스택 또는 게이지 값 조회 */
  public refCount(charId: string, refName: string): number | null {
    const ab = this._active.find((b) => b.targetId === charId && b.name === refName);
    if (ab) return ab.stack;
    return null;
  }

  /** 모든 활성 버프 반환 (디버그/시각화용) */
  public getActiveBuffs(): readonly ActiveBuff[] {
    return this._active;
  }
}
