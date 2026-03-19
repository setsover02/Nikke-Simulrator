import { BattleContext, Character, LogEntry } from '../types/battle'
import { DamageParams } from '../types/damage'
import { calcNikkeDamage } from './nikkeFormula'
import { checkAdvantage } from '../utils/charUtils'
import { getWeaponMultipliers } from '../constants/weaponStats'

export interface SkillEffectDef {
  trigger?: string
  target: string
  effect: string
  value?: number
  unit?: string
  bullet?: number
  duration?: number | 'permanent'
  description?: string
  interval?: number
  hits?: number
  based_on?: string
  condition?:
  | string
  | {
    amount?: number
    count?: number
    target_status?: string
  }
  effects?: Omit<SkillEffectDef, 'trigger' | 'target'>[] // Nested effects
  status?: string
  stack_level?: number
  weapon_override?: {
    chargeTime?: number
    fireRate?: number
    fullChargeDamage?: number
    maxAmmo?: number | string
  }
}

export interface SkillDef {
  id: string
  name: string
  type: 'passive' | 'active' | 'burst'
  cooldown?: number
  effects: SkillEffectDef[]
}

// Target Resolution Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getFinalAtk(c: Character): number {
  return (
    Math.round(c.atk * (1 + (c.equipATKPercent ?? 0) + (c.buff?.atk ?? 0))) +
    (c.buff?.extraATK ?? 0)
  )
}

function getFinalDef(c: Character): number {
  return Math.round(c.defense * (1 + (c.buff?.def ?? 0)))
}

function getFinalHp(c: Character): number {
  return Math.round(c.hp * (1 + (c.buff?.maxHp ?? 0)))
}

function topNByAtk(members: Character[], n: number): Character[] {
  return [...members]
    .sort((a, b) => getFinalAtk(b) - getFinalAtk(a))
    .slice(0, n)
}

function topNByDef(members: Character[], n: number): Character[] {
  return [...members]
    .sort((a, b) => getFinalDef(b) - getFinalDef(a))
    .slice(0, n)
}

function topNByMaxHp(members: Character[], n: number): Character[] {
  return [...members].sort((a, b) => getFinalHp(b) - getFinalHp(a)).slice(0, n)
}

function resolveTargets(
  ctx: BattleContext,
  sourceChar: Character,
  target: string
): any[] {
  const members = ctx.team.members

  // ── Self ──
  if (target === 'self') return [sourceChar]

  // ── All Allies ──
  if (target === 'all_allies' || target === 'allies') return members

  // ── N Highest ATK Allies ──
  if (
    target === 'highest_atk_allies_1' ||
    target === 'highest_atk_ally'
  )
    return topNByAtk(members, 1)
  if (target === 'highest_atk_allies_2') return topNByAtk(members, 2)
  if (target === 'highest_atk_allies_3')
    return topNByAtk(members, 3)

  // ── Self + N Highest ATK Allies (excluding self) ──
  if (target === 'self_and_highest_atk_allies_1') {
    return [sourceChar, ...topNByAtk(members.filter((m) => m.id !== sourceChar.id), 1)]
  }
  if (target === 'self_and_highest_atk_allies_2') {
    return [sourceChar, ...topNByAtk(members.filter((m) => m.id !== sourceChar.id), 2)]
  }
  if (target === 'self_and_highest_atk_allies_3') {
    return [sourceChar, ...topNByAtk(members.filter((m) => m.id !== sourceChar.id), 3)]
  }

  // ── N Highest DEF/HP Allies ──
  if (target === 'highest_def_allies_1')
    return topNByDef(members, 1)
  if (target === 'highest_def_allies_2') return topNByDef(members, 2)
  if (target === 'highest_def_allies_3') return topNByDef(members, 3)

  if (target === 'highest_hp_allies_1')
    return topNByMaxHp(members, 1)
  if (target === 'highest_hp_allies_2') return topNByMaxHp(members, 2)
  if (target === 'highest_hp_allies_3') return topNByMaxHp(members, 3)

  // ── Lowest/Highest HP Ally ──
  if (target === 'lowest_hp_allies_1') {
    return [...members]
      .sort((a, b) => getFinalHp(a) - getFinalHp(b))
      .slice(0, 1)
  }
  if (target === 'lowest_hp_allies_2') {
    return [...members]
      .sort((a, b) => getFinalHp(a) - getFinalHp(b))
      .slice(0, 2)
  }

  // ── Self & Adjacent Allies ──
  if (target === 'self_and_adjacent_allies_2') {
    const idx = sourceChar.slotIndex
    if (idx !== 1 && idx !== 3) return [] // 2번과 4번 자리인 경우에만
    return members.filter(m => m.slotIndex === idx - 1 || m.slotIndex === idx || m.slotIndex === idx + 1)
  }

  // ── Weapon-type Allies ──
  const WEAPON_TARGETS: Record<string, string> = {
    sg_allies: 'SG',
    smg_allies: 'SMG',
    mg_allies: 'MG',
    sr_allies: 'SR',
    rl_allies: 'RL',
    ar_allies: 'AR',
  }
  if (WEAPON_TARGETS[target]) {
    return members.filter((c) => c.weapon === WEAPON_TARGETS[target])
  }

  // ── Element Allies ──
  const ELEMENT_TARGETS: Record<string, string> = {
    fire_element_allies: '작열',
    water_element_allies: '수냉',
    electric_element_allies: '전격',
    iron_element_allies: '철갑',
    wind_element_allies: '풍압',
  }
  if (ELEMENT_TARGETS[target]) {
    return members.filter((c) => c.element === ELEMENT_TARGETS[target])
  }

  // ── Element Enemy Targets (우월 코드 적 타겟) ──
  const ELEMENT_ENEMY_TARGETS: Record<string, string> = {
    fire_element_enemy: '작열',
    water_element_enemy: '수냉',
    electric_element_enemy: '전격',
    iron_element_enemy: '철갑',
    wind_element_enemy: '풍압',
  }
  if (ELEMENT_ENEMY_TARGETS[target]) {
    return ctx.enemy.element === ELEMENT_ENEMY_TARGETS[target] ? [ctx.enemy] : []
  }

  // ── Enemy Targets (all map to ctx.enemy since single-enemy sim) ──
  const ENEMY_TARGETS = new Set([
    'enemy',
    'all_enemies',
    'random_enemies',
    'enemies_in_range',
    'lowest_hp_enemy',
    'highest_hp_enemy_1',
    'highest_atk_enemy_1',
    'highest_atk_enemy_2',
    'highest_def_enemy_1',
  ])
  if (ENEMY_TARGETS.has(target)) return [ctx.enemy]

  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// Value Resolver
// ─────────────────────────────────────────────────────────────────────────────

function resolveValue(effectDef: SkillEffectDef): number {
  // Already resolved to a number by charUtils.applyBaseStats
  return (effectDef.value as number) ?? 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Skill Tick
// ─────────────────────────────────────────────────────────────────────────────

export function resolveSkills(ctx: BattleContext) {
  ctx.state = ctx.state || {}

  // burst_cast 트리거 처리를 위해 이번 틱에 실제 버스트를 사용한 캐릭터를 기록
  const burstCastSources = new Set<string>()
  ctx.log.forEach((entry) => {
    if (
      entry.type === 'burst' &&
      entry.source &&
      entry.time === ctx.time &&
      (entry.description || '').includes('_fired')
    ) {
      burstCastSources.add(entry.source)
    }
  })
  ctx.state.__burstCastSources = burstCastSources

  ctx.team.members.forEach((char) => {
    if (!char.skills) return

    char.skills.forEach((skillDef: any) => {
      const skill = skillDef as SkillDef

      if (skill.type === 'passive' || skill.type === 'active') {
        // passive/active 스킬에 cooldown이 있는 경우 전투 시작 후 그 시간이 지난 뒤 첫 발동 가능
        if (skill.cooldown && skill.cooldown > 0) {
          const cdKey = `passive_cd_${char.id}_${skill.id}`
          ctx.state = ctx.state || {}
          if (ctx.state[cdKey] === undefined) {
            ctx.state[cdKey] = skill.cooldown
          }
          if (ctx.state[cdKey] > 0) {
            ctx.state[cdKey] -= ctx.delta
            return
          }

          // 쿨다운 만료: trigger가 없는 effect는 즉시 적용, 있는 effect는 기존 트리거 로직 사용
          let hasTriggerlessEffect = false
          skill.effects.forEach((effectDef) => {
            if (!effectDef.trigger) {
              // trigger 없이 cooldown에 따라 발동하는 effect → 즉시 적용
              applyEffect(ctx, char, skill.name, effectDef)
              hasTriggerlessEffect = true
            } else {
              handleEffectTrigger(ctx, char, skill.id, skill.name, effectDef)
            }
          })

          // 쿨다운 리셋 (trigger 없는 effect가 발동한 경우)
          if (hasTriggerlessEffect) {
            ctx.state[cdKey] = skill.cooldown
          }
        } else {
          // cooldown이 없는 스킬: 기존 트리거 기반 처리
          skill.effects.forEach((effectDef) => {
            handleEffectTrigger(ctx, char, skill.id, skill.name, effectDef)
          })
        }
      }
    })

    // Interval Skills Logic
    if (char.activeIntervalSkills) {
      char.activeIntervalSkills.forEach((intervalSkill) => {
        intervalSkill.durationRemain -= ctx.delta
        intervalSkill.timeSinceLastHit += ctx.delta

        if (
          intervalSkill.timeSinceLastHit >= intervalSkill.effectDef.interval
        ) {
          intervalSkill.timeSinceLastHit -= intervalSkill.effectDef.interval
          const hitDef = { ...intervalSkill.effectDef, effect: 'damage' }
          applySpecificEffectToTarget(
            ctx,
            char,
            intervalSkill.target,
            intervalSkill.skillName || 'Interval Skill',
            hitDef
          )
        }
      })
      char.activeIntervalSkills = char.activeIntervalSkills.filter(
        (s) => s.durationRemain > 0
      )
    }
  })

  updateBuffTimers(ctx)

  // enter_burst_n 플래그 초기화 (1틱에 한 번만 트리거되도록)
  if (ctx.state) {
    for (let lv = 1; lv <= 3; lv++) {
      ctx.state[`__enterBurstLevel_${lv}`] = false
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Evaluation
// ─────────────────────────────────────────────────────────────────────────────

function handleEffectTrigger(
  ctx: BattleContext,
  sourceChar: Character,
  skillId: string,
  skillName: string,
  effectDef: SkillEffectDef
) {
  let isTriggered = false
  ctx.state = ctx.state || {}

  const trigger = effectDef.trigger

  // No trigger → permanent / always apply (e.g., battle_start effects)
  if (!trigger) return

  // ── battle_start: 첫 틱에 1회만 발동 ──
  if (trigger === 'battle_start') {
    const key = `battle_start_${sourceChar.id}_${skillId}_${effectDef.effect}`
    if (!ctx.state[key]) {
      isTriggered = true
      ctx.state[key] = true
    }
  }

  // ── enemy_spawn: 전투 시작 시 1회 ──
  if (
    trigger === 'enemy_spawn' ||
    trigger === 'self_focusing' ||
    trigger === 'focus'
  ) {
    const key = `spawn_${sourceChar.id}_${skillId}_${effectDef.effect}`
    if (!ctx.state[key]) {
      isTriggered = true
      ctx.state[key] = true
    }
  }

  // ── full_burst_start ──
  if (trigger === 'full_burst_start') {
    // stateKey는 stack_level별로 고유하게 만들어 각 이펙트가 독립적으로 발동 추적
    const sl = effectDef.stack_level ?? 0
    const stateKey = `fb_start_${sourceChar.id}_${skillId}_${effectDef.effect}_sl${sl}`
    // stackKey(버스트 횟수 카운터)는 스킬 단위로 공유
    const stackKey = `fb_start_${sourceChar.id}_${skillId}_stack_count`
    // 버스트 사이클당 1회만 카운터 증가하기 위한 one-shot 키
    const countedKey = `fb_start_${sourceChar.id}_${skillId}_counted`

    if (ctx.burstActive && !ctx.state[stateKey]) {
      // 이번 풀버스트 사이클에서 아직 카운터를 올리지 않았으면 1회만 증가
      if (!ctx.state[countedKey]) {
        ctx.state[stackKey] = (ctx.state[stackKey] || 0) + 1
        ctx.state[countedKey] = true
      }
      isTriggered = true
      ctx.state[stateKey] = true
    } else if (!ctx.burstActive) {
      // 풀버스트가 끝나면 플래그 초기화
      if (ctx.state[stateKey]) ctx.state[stateKey] = false
      if (ctx.state[countedKey]) ctx.state[countedKey] = false
    }

    // stack_level 검사
    if (isTriggered) {
      const castCount = ctx.state[stackKey] || 0
      if (effectDef.stack_level !== undefined && effectDef.stack_level > castCount) {
        isTriggered = false // 스택 조건 미달
      }
    }
  }

  // ── full_burst_end ──
  if (trigger === 'full_burst_end') {
    const stateKey = `fb_active_prev_${sourceChar.id}_${skillId}_${effectDef.effect}`
    const wasActive = ctx.state[stateKey] || false
    if (wasActive && !ctx.burstActive) isTriggered = true
    ctx.state[stateKey] = ctx.burstActive
  }

  // ── full_burst_time: 풀버스트 중 interval마다 ──
  if (trigger === 'full_burst_time' && ctx.burstActive && effectDef.interval) {
    const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_fb_timer`
    ctx.state[stateKey] = (ctx.state[stateKey] || 0) + ctx.delta
    if (ctx.state[stateKey] >= effectDef.interval) {
      isTriggered = true
      ctx.state[stateKey] -= effectDef.interval
    }
  }

  // ── last_bullet_hit ──
  if (trigger === 'last_bullet_hit') {
    const stateKey = `${sourceChar.id}_${skillId}_last_bullet`
    const wasEmpty = ctx.state[stateKey] || false
    if (sourceChar.ammo <= 0 && !wasEmpty) {
      isTriggered = true
      ctx.state[stateKey] = true
    } else if (sourceChar.ammo > 0) {
      ctx.state[stateKey] = false
    }
  }

  // ── ammo_consumed: 자신의 탄환 소모 총량 기준 ──
  if (
    trigger === 'ammo_consumed' &&
    typeof effectDef.condition === 'object' &&
    effectDef.condition?.count
  ) {
    const threshold = effectDef.condition.count
    const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_ammo_consumed`
    ctx.state[stateKey] = ctx.state[stateKey] || 0
    const currentUsed = sourceChar.totalAmmoUsed || 0
    if (currentUsed - ctx.state[stateKey] >= threshold) {
      isTriggered = true
      ctx.state[stateKey] = currentUsed
    }
  }

  // ── all_allies_ammo_consumed: 팀 전체 탄환 소모 합산 ──
  if (
    trigger === 'all_allies_ammo_consumed' &&
    typeof effectDef.condition === 'object' &&
    effectDef.condition?.count
  ) {
    const threshold = effectDef.condition.count
    const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_team_ammo`
    ctx.state[stateKey] = ctx.state[stateKey] || 0
    const currentTeamAmmo = ctx.totalTeamAmmoUsed || 0
    if (currentTeamAmmo - ctx.state[stateKey] >= threshold) {
      isTriggered = true
      ctx.state[stateKey] = currentTeamAmmo
    }
  }

  // ── normal_attack_hit (조건 count 기준) ──
  if (
    trigger === 'normal_attack_hit' &&
    typeof effectDef.condition === 'object' &&
    effectDef.condition?.count
  ) {
    let statusMet = true
    if (effectDef.condition.target_status === 'bubble') {
      statusMet = !!ctx.enemy.debuff?.bubble
    }
    if (statusMet) {
      const threshold = effectDef.condition.count
      const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_attack_hit`
      ctx.state[stateKey] = ctx.state[stateKey] || 0
      const currentUsed = sourceChar.totalAmmoUsed || 0
      if (currentUsed - ctx.state[stateKey] >= threshold) {
        isTriggered = true
        ctx.state[stateKey] = currentUsed
      }
    }
  }

  // ── on_hit: 피격 시 트리거 ──
  // chance: n% 확률
  // count: n회 피격 시 (적의 공격 빈도를 근사하여 카운트 누적)
  if (trigger === 'on_hit') {
    if (typeof effectDef.condition === 'object' && effectDef.condition?.count) {
      // count 기반: 피격 횟수 누적 (적의 초당 공격 약 2회로 근사)
      const hitsPerSecond = ctx.enemyHitsPerSecond ?? 2
      const countKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_on_hit_count`
      ctx.state[countKey] = (ctx.state[countKey] || 0) + hitsPerSecond * ctx.delta
      if (ctx.state[countKey] >= effectDef.condition.count) {
        isTriggered = true
        ctx.state[countKey] -= effectDef.condition.count
      }
    } else {
      // chance 기반: n% 확률
      const chance =
        typeof effectDef.condition === 'object'
          ? ((effectDef.condition as any)?.chance ?? 0)
          : 0
      if (chance > 0 && ctx.rng.next() < chance / 100) {
        isTriggered = true
      }
    }
  }

  // ── full_charge_attack: SR/RL 풀차지 공격 시 ──
  if (trigger === 'full_charge_attack') {
    const stateKey = `${sourceChar.id}_fullcharge_flag`
    if (ctx.state[stateKey]) {
      isTriggered = true
      ctx.state[stateKey] = false
    }
  }

  // ── burst_cast: 시전자가 버스트 스킬을 사용한 경우 ──
  if (trigger === 'burst_cast') {
    const burstCastSources = ctx.state.__burstCastSources as
      | Set<string>
      | undefined
    const didBurstCastThisTick = !!burstCastSources?.has(sourceChar.id)
    if (!didBurstCastThisTick) return

    // stack_level 카운트는 버스트 시전 1회당 스킬별 1회 증가
    const stackKey = `${sourceChar.id}_${skillId}_burst_cast_count`
    const stackTickKey = `${stackKey}_tick_${ctx.time.toFixed(6)}`
    if (!ctx.state[stackTickKey]) {
      ctx.state[stackKey] = (ctx.state[stackKey] || 0) + 1
      ctx.state[stackTickKey] = true
    }

    const castCount = ctx.state[stackKey] || 0
    if (
      effectDef.stack_level !== undefined &&
      effectDef.stack_level > castCount
    )
      return

    isTriggered = true
  }

  // ── enter_burst_1 / enter_burst_2 / enter_burst_3 ──
  if (trigger === 'enter_burst_1' || trigger === 'enter_burst_2' || trigger === 'enter_burst_3') {
    const level = parseInt(trigger.replace('enter_burst_', ''), 10)
    const enterFlag = ctx.state[`__enterBurstLevel_${level}`]
    if (!enterFlag) return

    // stack_level 카운트: 트리거 1회당 스킬별 1회 증가
    const stackKey = `${sourceChar.id}_${skillId}_enter_burst_${level}_count`
    const stackTickKey = `${stackKey}_tick_${ctx.time.toFixed(6)}`
    if (!ctx.state[stackTickKey]) {
      ctx.state[stackKey] = (ctx.state[stackKey] || 0) + 1
      ctx.state[stackTickKey] = true
    }

    const castCount = ctx.state[stackKey] || 0
    if (effectDef.stack_level !== undefined && effectDef.stack_level > castCount)
      return

    isTriggered = true
  }

  // ── kill_enemy: 단일 적 시뮬에서는 미구현 ──
  if (trigger === 'kill_enemy') return

  // ── part_destroy: 미구현 ──
  if (trigger === 'part_destroy') return

  if (!isTriggered) return

  // Chance check (on_hit은 이미 위에서 처리)
  if (
    trigger !== 'on_hit' &&
    effectDef.condition &&
    typeof effectDef.condition === 'object'
  ) {
    const cond = effectDef.condition as any
    if (cond.chance !== undefined && ctx.rng.next() > cond.chance / 100) return
  }

  applyEffect(ctx, sourceChar, skillName, effectDef)
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect Application Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCondition(sourceChar: Character, condition: any): boolean {
  if (!condition) return true

  if (condition.position) {
    const isBack = sourceChar.slotIndex === 1 || sourceChar.slotIndex === 3
    if (condition.position === 'back' && !isBack) return false
    const isFront = sourceChar.slotIndex === 0 || sourceChar.slotIndex === 2 || sourceChar.slotIndex === 4
    if (condition.position === 'front' && !isFront) return false
  }

  if (condition.status) {
    if (!sourceChar.buffSlots?.some(s => s.status === condition.status)) return false
  }

  return true
}

export function applyEffect(
  ctx: BattleContext,
  sourceChar: Character,
  skillName: string,
  effectDef: SkillEffectDef
) {
  if (effectDef.condition && typeof effectDef.condition === 'object') {
    if (!evaluateCondition(sourceChar, effectDef.condition)) return
  }
  // ── Global Effects (target-independent) ──
  if (effectDef.effect === 'burst_gauge_charge' && effectDef.value) {
    ctx.burstGauge = Math.min(100, ctx.burstGauge + effectDef.value)
    ctx.log.push({
      time: ctx.time,
      type: 'skill',
      source: sourceChar.id,
      value: effectDef.value,
      description: 'Burst Gauge Charged',
    })
    return
  }

  if (effectDef.effect === 'full_burst_time_down' && effectDef.value) {
    if (ctx.burstChainState === 'full_burst') {
      ctx.fullBurstTimer = Math.max(0, ctx.fullBurstTimer - effectDef.value)
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        value: effectDef.value,
        description: 'Full Burst Time Down',
      })
    }
    return
  }

  const targets = resolveTargets(ctx, sourceChar, effectDef.target)
  targets.forEach((target) => {
    applySpecificEffectToTarget(ctx, sourceChar, target, skillName, effectDef)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-Target Effect Application
// ─────────────────────────────────────────────────────────────────────────────

function applySpecificEffectToTarget(
  ctx: BattleContext,
  sourceChar: Character,
  target: any,
  skillName: string,
  effectDef: SkillEffectDef
) {
  // Nested effects
  if (effectDef.effects) {
    effectDef.effects.forEach((subEff) => {
      applySpecificEffectToTarget(
        ctx,
        sourceChar,
        target,
        skillName,
        subEff as SkillEffectDef
      )
    })
    return
  }

  const value = resolveValue(effectDef)

  const isEnemy = target === ctx.enemy
  const isChar = !isEnemy

  // ─── ENEMY DEBUFF / DAMAGE ─────────────────────────────────────────────
  if (isEnemy) {
    target.debuff = target.debuff || {}

    switch (effectDef.effect) {
      // Bubble
      case 'bubble':
        target.debuff.bubble = true
        target.debuff.takenUp = (target.debuff.takenUp || 0) + value / 100
        ctx.log.push({
          time: ctx.time,
          type: 'skill',
          source: sourceChar.id,
          value,
          description: 'Applied Bubble',
        })
        break

      case 'burst_bubble':
        target.debuff.takenUp = (target.debuff.takenUp || 0) + value / 100
        break

      case 'remove_status':
        if (effectDef.status === 'bubble' && target.debuff.bubble) {
          target.debuff.bubble = false
          // 버블이 추가했던 takenUp 제거 (임시: 가장 최근 버블 수치 기준)
          target.debuff.takenUp = Math.max(
            0,
            (target.debuff.takenUp || 0) - (value || 0) / 100
          )
          ctx.log.push({
            time: ctx.time,
            type: 'skill',
            source: sourceChar.id,
            description: 'Removed Bubble',
          })
        }
        break

      // Damage (skill_damage 타입, nikkeFormula 사용)
      case 'damage':
      case 'bubble_barrage':
      case 'distribute_damage':
      case 'extra_damage': {
        const hits = effectDef.hits || 1
        const stack = effectDef.stack_level

        // stack_level 기반: 현재 stack 횟수에 따라 해당 level까지 합산
        // (stack_level이 없으면 무조건 1회)
        let stackCount = 0
        if (stack !== undefined) {
          const stackKey = `${sourceChar.id}_stackcount`
          ctx.state = ctx.state || {}
          stackCount = ctx.state[stackKey] || 0
          if (stackCount < stack) {
            // 아직 이 레벨에 도달하지 않았으면 skip
            return
          }
        }

        const wm = getWeaponMultipliers(sourceChar.weapon)
        const critChance = ((sourceChar.crit ?? 15) + (sourceChar.buff?.critRate || 0)) / 100
        const isCrit = ctx.rng.next() < critChance
        const dmgPercent = value / 100
        const singleDmg = calcNikkeDamage({
          baseATK: sourceChar.atk,
          extraATKPercent: sourceChar.equipATKPercent ?? 0,
          extraATKFlat: sourceChar.buff?.extraATK ?? 0,
          enemyBaseDEF: ctx.enemy.defense,
          enemyDEFPercent: 0,
          enemyDEFFlat: target.debuff?.defFlat ?? 0,
          atkCoef: dmgPercent,
          finalATKModifier: sourceChar.buff?.atkDmgUp ?? 0,
          normalAtkMultiplier: 0,
          isNormalAttack: false,
          isCrit,
          critBonusBase: sourceChar.critMult ? (sourceChar.critMult - 1) : wm.critBonus,
          extraCritDmg: sourceChar.buff?.critDmg ?? 0,
          isCore: false,
          coreHitBonus: 0,
          coreHitMultiplier: 0,
          fullBurstBonus: ctx.burstActive ? 0.5 : 0,
          rangeBonus: 0,
          weakPointBase: checkAdvantage(ctx.enemy.element, sourceChar.element)
            ? 1.1
            : 1.0,
          weakPointExtra:
            (sourceChar.buff?.weak ?? 0) +
            (checkAdvantage(ctx.enemy.element, sourceChar.element)
              ? (sourceChar.equipWeakPointPercent ?? 0)
              : 0),
          chargeDmgBonus: 0,
          chargeDmgMultiplier: 0,
          atkDmgUp: sourceChar.buff?.atkDmgUpFinal ?? 0,
          dotDmgUp: 0,
          pierceDmgUp: 0,
          partDmgUp: 0,
          ignoreDefDmgUp: 0,
          projectileDmgUp: 0,
          interruptionPartDmgUp: 0,
          extraDmgUp: 0,
          enemyTakenUp: target.debuff?.takenUp ?? 0,
          shareDmgUp: 0,
          enemyTakenDown: target.debuff?.takenDown ?? 0,
        })
        const totalDmg = singleDmg * hits
        target.hp -= totalDmg
        ctx.totalDamage += totalDmg
        ctx.log.push({
          time: ctx.time,
          type: 'skill_damage',
          source: sourceChar.id,
          value: totalDmg,
          description: effectDef.effect,
        })
        break
      }

      // Interval Damage (일정 시간마다 스킬 대미지 발생, 지속 피해(DoT) 아님)
      case 'interval_damage':
        sourceChar.activeIntervalSkills = sourceChar.activeIntervalSkills || []
        sourceChar.activeIntervalSkills.push({
          effectDef,
          target,
          skillName,
          durationRemain:
            typeof effectDef.duration === 'number' ? effectDef.duration : 0,
          timeSinceLastHit: 0,
        })
        break

      // ATK Down
      case 'atk_down':
        target.debuff.atkDown = (target.debuff.atkDown || 0) + value / 100
        ctx.log.push({
          time: ctx.time,
          type: 'skill',
          source: sourceChar.id,
          value,
          description: 'ATK Down',
        })
        break

      // DEF Down (flat reduction, applied in damageCalc via enemyDEFFlat)
      case 'def_down':
        target.debuff.defFlat = (target.debuff.defFlat || 0) + value
        ctx.log.push({
          time: ctx.time,
          type: 'skill',
          source: sourceChar.id,
          value,
          description: 'DEF Down',
        })
        break

      // Damage Taken Up (≈ 버블 없이 적용되는 받는 피해 증가)
      case 'damage_taken_up':
        target.debuff.takenUp = (target.debuff.takenUp || 0) + value / 100
        if (effectDef.status) target.debuff[effectDef.status] = true
        ctx.log.push({
          time: ctx.time,
          type: 'skill',
          source: sourceChar.id,
          value,
          description: 'Damage Taken Up',
        })
        break

      // Taunt / dispel: no-op (단일 적, 의미 없음)
      case 'taunt':
      case 'dispel':
        break

      // Explosion range / cover defense: skip
      case 'explosion_range_up':
      case 'cover_defense_up':
        break

      default:
        break
    }
    return
  }

  // ─── ALLY BUFF ─────────────────────────────────────────────────────────
  const char = target as Character
  char.buff = char.buff || {}
  char.buffSlots = char.buffSlots || []
  char.buffTimeline = char.buffTimeline || []

  char.buffTimeline = char.buffTimeline || []

  const stackLv = effectDef.stack_level !== undefined ? effectDef.stack_level : 0
  const buffKey = effectDef.effect
  const timerKey = `${sourceChar.id}__${skillName}__${effectDef.effect}__${stackLv}`
  let applied = false
  let appliedFlatValue = 0

  switch (effectDef.effect) {
    case 'atk_up': {
      const basedOn = effectDef.based_on ?? 'caster_atk'
      let base: number
      if (basedOn === 'caster_atk' || basedOn === 'caster_final_atk') {
        base = sourceChar.atk
      } else if (basedOn === 'caster_max_hp' || basedOn === 'caster_final_max_hp') {
        base = sourceChar.maxHp ?? sourceChar.hp
      } else {
        base = char.atk
      }
      appliedFlatValue = base * (value / 100)
      char.buff.extraATK = (char.buff.extraATK || 0) + appliedFlatValue
      applied = true
      break
    }
    case 'max_hp_up': {
      let hpBase: number
      if (effectDef.based_on === 'caster_hp' || effectDef.based_on === 'caster_final_max_hp') {
        hpBase = sourceChar.maxHp ?? sourceChar.hp
      } else {
        hpBase = char.maxHp ?? char.hp
      }
      appliedFlatValue = hpBase * (value / 100)
      char.maxHp = (char.maxHp ?? char.hp) + appliedFlatValue
      char.hp += appliedFlatValue
      applied = true
      break
    }
    case 'critical_rate_up':
      appliedFlatValue = value
      char.buff.critRate = (char.buff.critRate || 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Crit Rate Up' })
      applied = true
      break
    case 'critical_damage_up':
    case 'crit_damage_up':
      appliedFlatValue = value / 100
      char.buff.critDmg = (char.buff.critDmg || 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Crit Damage Up' })
      applied = true
      break
    case 'attack_damage_up':
    case 'atk_damage_up':
      appliedFlatValue = value / 100
      char.buff.atkDmgUp = (char.buff.atkDmgUp || 0) + appliedFlatValue
      applied = true
      break
    case 'burst_cooldown_reduction':
      if (ctx.burstCooldowns[char.id] > 0) {
        ctx.burstCooldowns[char.id] = Math.max(0, ctx.burstCooldowns[char.id] - value)
        ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Burst Cooldown Reduced' })
      }
      appliedFlatValue = value
      applied = true
      break
    case 'max_ammo_up':
      appliedFlatValue = Math.floor(value)
      char.maxAmmo = char.maxAmmo + appliedFlatValue
      applied = true
      break
    case 'ammo_charge':
    case 'ammo_reload': {
      const reloadAmount = Math.floor(char.maxAmmo * (value / 100))
      char.ammo = Math.min(char.maxAmmo, char.ammo + reloadAmount)
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value: reloadAmount, description: 'Ammo Charged' })
      appliedFlatValue = reloadAmount
      applied = true
      break
    }
    case 'def_up':
      appliedFlatValue = value / 100
      char.buff.defUp = (char.buff.defUp || 0) + appliedFlatValue
      applied = true
      break
    case 'damage_taken_down':
      appliedFlatValue = value / 100
      char.buff.takenDown = (char.buff.takenDown || 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value: appliedFlatValue, description: 'Damage Taken Down Applied' })
      applied = true
      break
    case 'accuracy_up':
      appliedFlatValue = value / 100
      char.accuracyBuff = (char.accuracyBuff || 0) + appliedFlatValue
      applied = true
      break
    case 'heal': {
      const healBase = sourceChar.atk * (value / 100)
      char.hp = Math.min(char.maxHp ?? char.hp, char.hp + healBase)
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value: healBase, description: 'Heal' })
      appliedFlatValue = healBase
      applied = true
      break
    }
    case 'recevie_heal':
      appliedFlatValue = value / 100
      char.buff.receiveHeal = (char.buff.receiveHeal || 0) + appliedFlatValue
      applied = true
      break
    case 'overheal_storage':
      appliedFlatValue = value / 100
      char.buff.overhealStorage = (char.buff.overhealStorage || 0) + appliedFlatValue
      applied = true
      break
    case 'heal_efficacy_up':
      appliedFlatValue = value / 100
      char.buff.healEfficacy = (char.buff.healEfficacy || 0) + appliedFlatValue
      applied = true
      break
    case 'shield': {
      const shieldBase = sourceChar.maxHp ?? sourceChar.hp
      const shieldAmount = shieldBase * (value / 100)
      appliedFlatValue = shieldAmount
      char.buff.shield = (char.buff.shield || 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value: shieldAmount, description: 'Shield Applied' })
      applied = true
      break
    }
    case 'pierce':
      appliedFlatValue = 0.1
      char.buff.pierceDmgUp = (char.buff.pierceDmgUp || 0) + appliedFlatValue
      applied = true
      break
    case 'damage_share':
      char.buff.damageShare = true
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, description: 'Damage Share Applied' })
      appliedFlatValue = 1
      applied = true
      break
    case 'parts_damage_up':
      appliedFlatValue = value / 100
      char.buff.partDmgUp = (char.buff.partDmgUp || 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Parts Damage Up' })
      applied = true
      break
    case 'element_damage_up':
      appliedFlatValue = value / 100
      char.buff.elementDmgUp = (char.buff.elementDmgUp || 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Element Damage Up' })
      applied = true
      break
    case 'change_weapon': {
      // 원본 스탯 백업 (이미 오버라이드 중이 아닌 경우에만)
      if (!char.originalWeaponStats) {
        char.originalWeaponStats = {
          chargeTime: char.chargeTime ?? 0,
          fireRate: char.fireRate,
          fullChargeDamage: char.fullChargeDamage ?? 0,
          maxAmmo: char.maxAmmo,
          atkCoef: char.atkCoef ?? 0,
          ammo: char.ammo,
          reloadRemain: char.reloadRemain,
        }
      }

      // weapon_override 스탯 적용
      const wo = effectDef.weapon_override
      if (wo) {
        char.weaponOverride = wo
        if (wo.chargeTime !== undefined) char.chargeTime = wo.chargeTime
        if (wo.fireRate !== undefined) char.fireRate = wo.fireRate
        if (wo.fullChargeDamage !== undefined) char.fullChargeDamage = wo.fullChargeDamage / 100
        if (wo.maxAmmo === 'infinity') {
          char.maxAmmo = 999999
        } else if (typeof wo.maxAmmo === 'number') {
          char.maxAmmo = wo.maxAmmo
        }
      }

      // atkCoef를 스킬 value로 교체
      char.atkCoef = value / 100

      // 재장전 완료 상태로 설정
      char.ammo = char.maxAmmo
      char.reloadRemain = 0
      char.currentCharge = 0

      appliedFlatValue = 1 // marker value
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Change Weapon' })
      applied = true
      break
    }
    case 'shooting_focus':
    case 'cover_defense_up':
    case 'explosion_range_up':
    case 'dispel':
    case 'taunt':
    case 'attack_power_down':
      break
    case 'stun':
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, description: 'Stunned (no-op)' })
      break
    default:
      break
  }

  if (effectDef.stack_level !== undefined) {
    char.buff.stack_level = Math.max(char.buff.stack_level || 0, effectDef.stack_level)
  }

  // 버프 슬롯 등록
  if (applied && (effectDef.duration || effectDef.bullet)) {
    const isBullet = !!effectDef.bullet
    const duration = effectDef.duration === 'permanent' ? undefined : (effectDef.duration as number | undefined)
    const bullet = effectDef.bullet

    // 이미 같은 timerKey(소스 동일, 스킬 동일, 이펙트 동일)의 슬롯이 있다면 기여분 차감 후 기존 타이머 교체
    const existingIndex = char.buffSlots!.findIndex(s => s.timerKey === timerKey)
    if (existingIndex !== -1) {
      const existingSlot = char.buffSlots![existingIndex]
      subtractBuffValue(char, existingSlot.effect, existingSlot.appliedFlat)
      char.buffSlots!.splice(existingIndex, 1) // 기존 슬롯 제거
    }

    char.buffSlots!.push({
      timerKey,
      effect: buffKey,
      value,
      appliedFlat: appliedFlatValue,
      duration,
      bullet,
      isBullet,
      sourceCharId: sourceChar.id,
      skillName,
      status: effectDef.status,
      basedOn: effectDef.based_on,
      pct: value,
    })

    // 타임라인 기록
    const existingEvent = char.buffTimeline!.find(
      (e) =>
        e.buffType === buffKey &&
        e.skillName === skillName &&
        e.sourceCharId === sourceChar.id &&
        e.stackLevel === stackLv &&
        (duration === undefined ? e.endTime === ctx.config.duration : e.endTime > ctx.time)
    )

    if (existingEvent) {
      existingEvent.endTime = duration === undefined ? ctx.config.duration : Math.max(existingEvent.endTime, ctx.time + duration)
    } else {
      char.buffTimeline!.push({
        skillName,
        buffType: buffKey,
        startTime: ctx.time,
        endTime: duration === undefined ? ctx.config.duration : ctx.time + duration,
        isBullet,
        sourceCharId: sourceChar.id,
        value,
        stackLevel: stackLv
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Buff Timer Tick
// ─────────────────────────────────────────────────────────────────────────────

function updateBuffTimers(ctx: BattleContext) {
  ctx.team.members.forEach((char) => {
    if (!char.buffSlots || !char.buff) return

    char.buffSlots = char.buffSlots.filter((slot) => {
      if (!slot.isBullet && slot.duration !== undefined) {
        slot.duration -= ctx.delta
        if (slot.duration <= 0) {
          subtractBuffValue(char, slot.effect, slot.appliedFlat)
          endBuffTimeline(ctx, char, slot)
          return false // remove
        }
      }
      return true
    })

    // caster_final_max_hp 기반 atk_up 슬롯 동적 재계산
    // (permanent 슬롯은 duration === undefined)
    char.buffSlots.forEach((slot) => {
      if (
        slot.effect === 'atk_up' &&
        (slot.basedOn === 'caster_final_max_hp' || slot.basedOn === 'caster_max_hp') &&
        slot.duration === undefined &&
        slot.pct !== undefined
      ) {
        const currentMaxHp = char.maxHp ?? char.hp
        const newFlat = currentMaxHp * (slot.pct / 100)
        if (Math.abs(newFlat - slot.appliedFlat) > 0.01) {
          // 기존 기여분 차감 후 새 값 추가
          char.buff!.extraATK = Math.max(0, (char.buff!.extraATK || 0) - slot.appliedFlat)
          slot.appliedFlat = newFlat
          char.buff!.extraATK = (char.buff!.extraATK || 0) + newFlat
        }
      }
    })
  })
}

function subtractBuffValue(char: Character, effectName: string, value: number) {
  if (!char.buff || value === 0) return
  switch (effectName) {
    case 'atk_up':
    case 'attack_power_up':
      char.buff.extraATK = Math.max(0, (char.buff.extraATK || 0) - value)
      break
    case 'critical_rate_up':
      char.buff.critRate = Math.max(0, (char.buff.critRate || 0) - value)
      break
    case 'critical_damage_up':
    case 'crit_damage_up':
      char.buff.critDmg = Math.max(0, (char.buff.critDmg || 0) - value)
      break
    case 'attack_damage_up':
    case 'atk_damage_up':
      char.buff.atkDmgUp = Math.max(0, (char.buff.atkDmgUp || 0) - value)
      break
    case 'accuracy_up':
      char.accuracyBuff = Math.max(0, (char.accuracyBuff || 0) - value)
      break
    case 'def_up':
      char.buff.defUp = Math.max(0, (char.buff.defUp || 0) - value)
      break
    case 'damage_taken_down':
      char.buff.takenDown = Math.max(0, (char.buff.takenDown || 0) - value)
      break
    case 'shield':
      char.buff.shield = Math.max(0, (char.buff.shield || 0) - value)
      break
    case 'recevie_heal':
      char.buff.receiveHeal = Math.max(0, (char.buff.receiveHeal || 0) - value)
      break
    case 'overheal_storage':
      char.buff.overhealStorage = Math.max(0, (char.buff.overhealStorage || 0) - value)
      break
    case 'heal_efficacy_up':
      char.buff.healEfficacy = Math.max(0, (char.buff.healEfficacy || 0) - value)
      break
    case 'pierce':
      char.buff.pierceDmgUp = Math.max(0, (char.buff.pierceDmgUp || 0) - value)
      break
    case 'damage_share':
      char.buff.damageShare = false
      break
    case 'parts_damage_up':
      char.buff.partDmgUp = Math.max(0, (char.buff.partDmgUp || 0) - value)
      break
    case 'element_damage_up':
      char.buff.elementDmgUp = Math.max(0, (char.buff.elementDmgUp || 0) - value)
      break
    case 'change_weapon':
      // 원본 무기 스탯으로 복원
      if (char.originalWeaponStats) {
        char.chargeTime = char.originalWeaponStats.chargeTime
        char.fireRate = char.originalWeaponStats.fireRate
        char.fullChargeDamage = char.originalWeaponStats.fullChargeDamage
        char.maxAmmo = char.originalWeaponStats.maxAmmo
        char.atkCoef = char.originalWeaponStats.atkCoef
        char.ammo = char.originalWeaponStats.maxAmmo  // 원래 무기로 돌아올 때 최대 탄약으로 시작
        char.reloadRemain = 0
        char.currentCharge = 0
        char.weaponOverride = undefined
        char.originalWeaponStats = undefined
      }
      break
    default:
      break
  }
}

function endBuffTimeline(ctx: BattleContext, char: Character, slot: import('../types/battle').BuffSlot) {
  if (char.buffTimeline) {
    const activeEvents = char.buffTimeline.filter(
      (e) => e.buffType === slot.effect &&
        e.sourceCharId === slot.sourceCharId &&
        e.skillName === slot.skillName &&
        e.endTime > ctx.time
    )
    activeEvents.forEach((e) => { e.endTime = ctx.time })
  }
}

export function decrementBulletBuffs(ctx: BattleContext, char: Character) {
  if (!char.buffSlots || !char.buff) return
  char.buffSlots = char.buffSlots.filter((slot) => {
    if (slot.isBullet && slot.bullet !== undefined) {
      slot.bullet -= 1
      if (slot.bullet <= 0) {
        subtractBuffValue(char, slot.effect, slot.appliedFlat)
        endBuffTimeline(ctx, char, slot)
        return false // remove
      }
    }
    return true
  })
}
