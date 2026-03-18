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

  // ── N Highest DEF/HP Allies ──
  if (target === 'highest_def_allies_1' || target === 'highest_def_ally')
    return topNByDef(members, 1)
  if (target === 'highest_def_allies_2') return topNByDef(members, 2)
  if (target === 'highest_def_allies_3') return topNByDef(members, 3)

  if (target === 'highest_hp_allies_1' || target === 'highest_hp_ally')
    return topNByMaxHp(members, 1)
  if (target === 'highest_hp_allies_2') return topNByMaxHp(members, 2)
  if (target === 'highest_hp_allies_3') return topNByMaxHp(members, 3)

  // ── Lowest/Highest HP Ally ──
  if (target === 'lowest_hp_ally') {
    return [...members]
      .sort((a, b) => getFinalHp(a) - getFinalHp(b))
      .slice(0, 1)
  }
  if (target === 'lowest_hp_allies_2') {
    return [...members]
      .sort((a, b) => getFinalHp(a) - getFinalHp(b))
      .slice(0, 2)
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

  // ── Enemy Targets (all map to ctx.enemy since single-enemy sim) ──
  const ENEMY_TARGETS = new Set([
    'enemy',
    'all_enemies',
    'random_enemies',
    'enemies_in_range',
    'lowest_hp_enemy',
    'highest_atk_enemy_1',
    'highest_atk_enemy_2',
    'highest_atk_enemy',
    'highest_def_enemy',
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
        // passive 스킬에 cooldown이 있는 경우 전투 시작 후 그 시간이 지난 뒤 첫 발동 가능
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
        }

        skill.effects.forEach((effectDef) => {
          handleEffectTrigger(ctx, char, skill.id, skill.name, effectDef)
        })
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

  // ── on_hit: 피격 시 확률 트리거 (공격 tick마다 chance 체크로 근사) ──
  if (trigger === 'on_hit') {
    const chance =
      typeof effectDef.condition === 'object'
        ? ((effectDef.condition as any)?.chance ?? 0)
        : 0
    if (chance > 0 && ctx.rng.next() < chance / 100) {
      isTriggered = true
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

export function applyEffect(
  ctx: BattleContext,
  sourceChar: Character,
  skillName: string,
  effectDef: SkillEffectDef
) {
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
  char.buffTimers = char.buffTimers || {}
  char.buffBulletCounters = char.buffBulletCounters || {}
  char.buffTimeline = char.buffTimeline || []

  // 버프 키: effect 이름으로 단순 식별 (동일 effect 가산 방식)
  const buffKey = effectDef.effect
  let applied = false

  switch (effectDef.effect) {
    // ── ATK 계열 ──────────────────────────────────────────────────────
    // atk_up → based_on에 따라 기준 결정
    case 'atk_up': {
      const basedOn = effectDef.based_on ?? 'caster_atk'
      let base: number
      if (basedOn === 'caster_atk' || basedOn === 'caster_final_atk') {
        base = sourceChar.atk
      } else {
        // target 기준 (기본값)
        base = char.atk
      }
      char.buff.extraATK = (char.buff.extraATK || 0) + base * (value / 100)
      applied = true
      break
    }

    // max_hp_up: 최대 체력 증가
    case 'max_hp_up': {
      const hpBase = char.maxHp ?? char.hp
      const hpGain = hpBase * (value / 100)
      char.maxHp = (char.maxHp ?? char.hp) + hpGain
      char.hp += hpGain
      applied = true
      break
    }

    // ── 크리티컬 ──────────────────────────────────────────────────────
    case 'critical_rate_up':
      char.buff.critRate = (char.buff.critRate || 0) + value
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        value,
        description: 'Crit Rate Up',
      })
      applied = true
      break

    case 'critical_damage_up':
    case 'crit_damage_up':
      char.buff.critDmg = (char.buff.critDmg || 0) + value / 100
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        value,
        description: 'Crit Damage Up',
      })
      applied = true
      break

    // ── 공격 데미지 증가 ───────────────────────────────────────────────
    case 'attack_damage_up':
    case 'atk_damage_up':
      char.buff.atkDmgUp = (char.buff.atkDmgUp || 0) + value / 100
      applied = true
      break

    // ── 버스트 쿨다운 감소 ────────────────────────────────────────────
    case 'burst_cooldown_reduction':
      if (ctx.burstCooldowns[char.id] > 0) {
        ctx.burstCooldowns[char.id] = Math.max(
          0,
          ctx.burstCooldowns[char.id] - value
        )
        ctx.log.push({
          time: ctx.time,
          type: 'skill',
          source: sourceChar.id,
          value,
          description: 'Burst Cooldown Reduced',
        })
      }
      applied = true
      break

    // ── 장탄 관련 ────────────────────────────────────────────────────
    case 'max_ammo_up':
      char.maxAmmo = char.maxAmmo + Math.floor(value)
      applied = true
      break

    case 'ammo_charge':
    case 'ammo_reload': {
      const reloadAmount = Math.floor(char.maxAmmo * (value / 100))
      char.ammo = Math.min(char.maxAmmo, char.ammo + reloadAmount)
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        value: reloadAmount,
        description: 'Ammo Charged',
      })
      applied = true
      break
    }

    // ── 방어력 관련 ──────────────────────────────────────────────────
    case 'def_up':
      char.buff.defUp = (char.buff.defUp || 0) + value / 100
      applied = true
      break

    // ── 명중률 ──────────────────────────────────────────────────────
    case 'accuracy_up':
      char.accuracyBuff = (char.accuracyBuff || 0) + value / 100
      applied = true
      break

    // ── 힐 계열 (현재 생존 시뮬 미구현이나 구조는 추가) ─────────────
    case 'heal': {
      // based_on: attack_damage → 피해량 기준 (현재 근사치로 sourceChar.atk 사용)
      // 힐은 차후 생존 시뮬에서 처리 예정이므로 구조만 설정
      const healBase =
        effectDef.based_on === 'attack_damage'
          ? sourceChar.atk * (value / 100)
          : sourceChar.atk * (value / 100)
      char.hp = Math.min(char.maxHp ?? char.hp, char.hp + healBase)
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        value: healBase,
        description: 'Heal',
      })
      applied = true
      break
    }

    case 'recevie_heal':
      char.buff.receiveHeal = (char.buff.receiveHeal || 0) + value / 100
      applied = true
      break

    case 'overheal_storage':
      char.buff.overhealStorage = (char.buff.overhealStorage || 0) + value / 100
      applied = true
      break

    case 'heal_efficacy_up':
      char.buff.healEfficacy = (char.buff.healEfficacy || 0) + value / 100
      applied = true
      break

    // ── 보호막 ──────────────────────────────────────────────────────
    case 'shield': {
      const shieldBase =
        effectDef.based_on === 'caster_final_max_hp'
          ? (sourceChar.maxHp ?? sourceChar.hp)
          : (sourceChar.maxHp ?? sourceChar.hp)
      const shieldAmount = shieldBase * (value / 100)
      char.buff.shield = (char.buff.shield || 0) + shieldAmount
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        value: shieldAmount,
        description: 'Shield Applied',
      })
      applied = true
      break
    }

    // ── 관통 (pierce): pierceDmgUp 버프로 처리 ──────────────────────
    case 'pierce':
      // bullet 기반 시: buffBulletCounters에 등록
      if (effectDef.bullet) {
        char.buffBulletCounters!['pierceDmgUp'] = effectDef.bullet
        char.buff.pierceDmgUp = (char.buff.pierceDmgUp || 0) + 0.1 // 관통 보너스 10% (추후 조정)
      } else {
        char.buff.pierceDmgUp = (char.buff.pierceDmgUp || 0) + 0.1
      }
      applied = true
      break

    // ── 기타 미구현 ─────────────────────────────────────────────────
    case 'shooting_focus':
    case 'cover_defense_up':
    case 'explosion_range_up':
    case 'dispel':
    case 'taunt':
      break

    // ── 복합/기타 ────────────────────────────────────────────────────
    case 'attack_power_down':
      // target 공격력 감소 (적용 대상이 아군이면 debuff의 개념이 다름, 현재 skip)
      break

    case 'stun':
      ctx.log.push({
        time: ctx.time,
        type: 'skill',
        source: sourceChar.id,
        description: 'Stunned (no-op)',
      })
      break

    // stack_level 관리용 (베스티 스킬2)
    default:
      break
  }

  // stack_level 업데이트
  if (effectDef.stack_level !== undefined) {
    char.buff.stack_level = Math.max(
      char.buff.stack_level || 0,
      effectDef.stack_level
    )
  }

  // 버프 duration 등록
  if (applied && effectDef.duration && effectDef.duration !== 'permanent') {
    const timer = effectDef.duration as number
    char.buffTimers![buffKey] =
      char.buffTimers![buffKey] || 0
        ? Math.max(char.buffTimers![buffKey], timer) // 갱신
        : timer

    // Record timeline event
    const existingEvent = char.buffTimeline!.find(
      (e) =>
        e.buffType === buffKey &&
        e.skillName === skillName &&
        e.sourceCharId === sourceChar.id &&
        e.endTime > ctx.time
    )
    if (existingEvent) {
      existingEvent.endTime = Math.max(existingEvent.endTime, ctx.time + timer)
    } else {
      char.buffTimeline!.push({
        skillName,
        buffType: buffKey,
        startTime: ctx.time,
        endTime: ctx.time + timer,
        isBullet: false,
        sourceCharId: sourceChar.id,
      })
    }
  }

  // duration: 'permanent' 영구 버프 타임라인 기록 (시뮬 종료까지 유지)
  if (applied && effectDef.duration === 'permanent') {
    const existingEvent = char.buffTimeline!.find(
      (e) =>
        e.buffType === buffKey &&
        e.skillName === skillName &&
        e.sourceCharId === sourceChar.id &&
        e.endTime === ctx.config.duration
    )
    if (!existingEvent) {
      char.buffTimeline!.push({
        skillName,
        buffType: buffKey,
        startTime: ctx.time,
        endTime: ctx.config.duration,
        isBullet: false,
        sourceCharId: sourceChar.id,
      })
    }
  }

  // bullet 기반 버프 만료 등록
  if (applied && effectDef.bullet) {
    char.buffBulletCounters![buffKey] = effectDef.bullet

    const existingEvent = char.buffTimeline!.find(
      (e) =>
        e.buffType === buffKey &&
        e.skillName === skillName &&
        e.sourceCharId === sourceChar.id &&
        e.isBullet &&
        e.endTime === ctx.config.duration
    )
    if (!existingEvent) {
      char.buffTimeline!.push({
        skillName,
        buffType: buffKey,
        startTime: ctx.time,
        endTime: ctx.config.duration,
        isBullet: true,
        sourceCharId: sourceChar.id,
      })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Buff Timer Tick
// ─────────────────────────────────────────────────────────────────────────────

function updateBuffTimers(ctx: BattleContext) {
  ctx.team.members.forEach((char) => {
    if (!char.buffTimers || !char.buff) return
    for (const [buffName, timeRemain] of Object.entries(char.buffTimers)) {
      char.buffTimers[buffName] = (timeRemain as number) - ctx.delta
      if (char.buffTimers[buffName] <= 0) {
        expireBuff(ctx, char, buffName)
        delete char.buffTimers[buffName]
      }
    }
  })
}

export function expireBuff(
  ctx: BattleContext,
  char: Character,
  buffName: string
) {
  if (char.buffTimeline) {
    const activeEvents = char.buffTimeline.filter(
      (e) => e.buffType === buffName && e.endTime > ctx.time
    )
    activeEvents.forEach((e) => {
      e.endTime = ctx.time
    })
  }

  switch (buffName) {
    case 'critical_rate_up':
      char.buff!.critRate = 0
      break
    case 'critical_damage_up':
    case 'crit_damage_up':
      char.buff!.critDmg = 0
      break
    case 'attack_damage_up':
    case 'atk_damage_up':
      char.buff!.atkDmgUp = 0
      break
    case 'atk_up':
    case 'attack_power_up':
      char.buff!.extraATK = 0
      break
    case 'accuracy_up':
      char.accuracyBuff = 0
      break
    case 'shield':
      char.buff!.shield = 0
      break
    case 'def_up':
      char.buff!.defUp = 0
      break
    case 'recevie_heal':
      char.buff!.receiveHeal = 0
      break
    case 'overheal_storage':
      char.buff!.overhealStorage = 0
      break
    case 'heal_efficacy_up':
      char.buff!.healEfficacy = 0
      break
    case 'pierce':
      char.buff!.pierceDmgUp = 0
      break
    default:
      break
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bullet-based buff countdown (called from damageCalc after each shot)
// ─────────────────────────────────────────────────────────────────────────────

export function decrementBulletBuffs(ctx: BattleContext, char: Character) {
  if (!char.buffBulletCounters || !char.buff) return
  for (const [buffName, bulletsLeft] of Object.entries(
    char.buffBulletCounters
  )) {
    const remaining = (bulletsLeft as number) - 1
    if (remaining <= 0) {
      expireBuff(ctx, char, buffName)
      delete char.buffBulletCounters[buffName]
    } else {
      char.buffBulletCounters[buffName] = remaining
    }
  }
}
