import { BattleContext, Character, LogEntry } from '../types/battle'
import { DamageParams } from '../types/damage'
import { calcNikkeDamage } from './nikkeFormula'
import { checkAdvantage } from '../utils/charUtils'
import { getWeaponMultipliers } from '../constants/weaponStats'

export interface SkillEffectDef {
  trigger?: string
  target: string
  effect?: string
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
    status?: string
    chance?: number
  }
  effects?: Omit<SkillEffectDef, 'trigger' | 'target'>[] // Nested effects
  status?: string
  status_target?: string  // 이 status의 스택 수에 따라 value가 곱해짐
  stack?: number          // 최대 중첩 횟수
  stack_level?: number
  weapon_override?: {
    chargeTime?: number
    fireRate?: number
    fullChargeDamage?: number
    maxAmmo?: number | string
  }
  cost?: { status: string; value: number }   // 발동 시 소모할 status 수량 (미하라 전용)
  irremovable?: boolean                       // 해제 불가 여부
  copy_status?: string                        // stack copy 대상 status (미하라 전용)
}

export interface SkillDef {
  id: string
  name: string
  type: 'passive' | 'active' | 'burst'
  cooldown?: number
  effects: SkillEffectDef[]
}

// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Target Resolution
// ─────────────────────────────────────────────────────────────────────────────

/** 무기 타입 → 무기 코드 (자신 제외) */
const WEAPON_EXCLUDE_SELF_TARGETS: Record<string, string> = {
  sg_allies_excluding_self: 'SG',
  smg_allies_excluding_self: 'SMG',
  mg_allies_excluding_self: 'MG',
  sr_allies_excluding_self: 'SR',
  rl_allies_excluding_self: 'RL',
  ar_allies_excluding_self: 'AR',
}

/** 무기 타입 → 무기 코드 */
const WEAPON_TARGETS: Record<string, string> = {
  sg_allies: 'SG',
  smg_allies: 'SMG',
  mg_allies: 'MG',
  sr_allies: 'SR',
  rl_allies: 'RL',
  ar_allies: 'AR',
}

/** 원소 코드 → 원소명 (아군) */
const ELEMENT_TARGETS: Record<string, string> = {
  fire_element_allies: '작열',
  water_element_allies: '수냉',
  electric_element_allies: '전격',
  iron_element_allies: '철갑',
  wind_element_allies: '풍압',
}

/** 원소 코드 → 원소명 (적) */
const ELEMENT_ENEMY_TARGETS: Record<string, string> = {
  fire_element_enemy: '작열',
  water_element_enemy: '수냉',
  electric_element_enemy: '전격',
  iron_element_enemy: '철갑',
  wind_element_enemy: '풍압',
}

/** 단일 적 시뮬에서 모두 ctx.enemy로 매핑되는 적 타겟 */
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
  'same_target',
  'target',
])

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

  // ── N Highest ATK Allies (highest_atk_ally, highest_atk_allies_N) ──
  const highestAtkMatch = target.match(/^highest_atk_all(?:ies_(\d+)|y)$/)
  if (highestAtkMatch) {
    return topNByAtk(members, highestAtkMatch[1] ? parseInt(highestAtkMatch[1]) : 1)
  }

  // ── Self + N Highest ATK Allies (excluding self) ──
  const selfAtkMatch = target.match(/^self_and_highest_atk_allies_(\d+)$/)
  if (selfAtkMatch) {
    return [sourceChar, ...topNByAtk(members.filter((m) => m.id !== sourceChar.id), parseInt(selfAtkMatch[1]))]
  }

  // ── N Highest DEF Allies ──
  const highestDefMatch = target.match(/^highest_def_allies_(\d+)$/)
  if (highestDefMatch) {
    return topNByDef(members, parseInt(highestDefMatch[1]))
  }

  // ── N Highest HP Allies ──
  const highestHpMatch = target.match(/^highest_hp_allies_(\d+)$/)
  if (highestHpMatch) {
    return topNByMaxHp(members, parseInt(highestHpMatch[1]))
  }

  // ── N Lowest HP Allies ──
  const lowestHpMatch = target.match(/^lowest_hp_allies_(\d+)$/)
  if (lowestHpMatch) {
    return [...members]
      .sort((a, b) => getFinalHp(a) - getFinalHp(b))
      .slice(0, parseInt(lowestHpMatch[1]))
  }

  // ── Self & Adjacent Allies ──
  if (target === 'self_and_adjacent_allies_2') {
    const idx = sourceChar.slotIndex
    if (idx !== 1 && idx !== 3) return [] // 2번과 4번 자리인 경우에만
    return members.filter(m => m.slotIndex === idx - 1 || m.slotIndex === idx || m.slotIndex === idx + 1)
  }

  // ── Weapon-type Allies (excluding self) ──
  if (WEAPON_EXCLUDE_SELF_TARGETS[target]) {
    return members.filter((c) => c.weapon === WEAPON_EXCLUDE_SELF_TARGETS[target] && c.id !== sourceChar.id)
  }

  // ── Weapon-type Allies ──
  if (WEAPON_TARGETS[target]) {
    return members.filter((c) => c.weapon === WEAPON_TARGETS[target])
  }

  // ── Element Allies ──
  if (ELEMENT_TARGETS[target]) {
    return members.filter((c) => c.element === ELEMENT_TARGETS[target])
  }

  // ── Element Enemy Targets (우월 코드 적 타겟) ──
  if (ELEMENT_ENEMY_TARGETS[target]) {
    return ctx.enemy.element === ELEMENT_ENEMY_TARGETS[target] ? [ctx.enemy] : []
  }

  // ── Enemies with chain_binding (미하라 전용) ──
  if (target === 'enemies_with_chain_binding') {
    const hasChainBinding = ctx.enemy.debuff?.activeDots?.some(
      (d: any) => d.status === 'chain_binding' && d.stacks > 0
    )
    return hasChainBinding ? [ctx.enemy] : []
  }

  // ── Enemy Targets (all map to ctx.enemy since single-enemy sim) ──
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
// Skill Damage Params Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 스킬/DoT 대미지 계산에 공통으로 사용되는 DamageParams를 생성한다.
 * 일반 공격이 아닌 스킬 대미지 전용 (isNormalAttack=false, rangeBonus=0 등).
 */
function buildSkillDamageParams(
  ctx: BattleContext,
  caster: Character,
  target: any,
  atkCoef: number,
  isCrit: boolean,
  overrides?: { dotDmgUp?: number }
): DamageParams {
  const wm = getWeaponMultipliers(caster.weapon)
  const hasAdvantage = checkAdvantage(ctx.enemy.element, caster.element)

  // calc-master _damage_handler와 동일하게 BuffManager를 단일 정본으로 사용
  const buffs = ctx.buffManager
    ? ctx.buffManager.getBuffs(caster.id, caster.id, ctx, ctx.time)
    : null
  const enemyBuffs = ctx.buffManager
    ? ctx.buffManager.getBuffs('__enemy__', caster.id, ctx, ctx.time)
    : null

  return {
    baseATK: caster.atk,
    extraATKPercent: (caster.equipATKPercent ?? 0) + (buffs ? buffs.atk_pct / 100 : 0),
    extraATKFlat: buffs ? buffs.atk_flat : (caster.buff?.extraATK ?? 0),
    enemyBaseDEF: ctx.enemy.defense,
    enemyDEFPercent: buffs ? -(buffs.enemy_def_down_pct / 100) : 0,
    enemyDEFFlat: target.debuff?.defFlat ?? 0,
    atkCoef,
    finalATKModifier: buffs ? buffs.final_atk_pct / 100 : (caster.buff?.atkDmgUp ?? 0),
    normalAtkMultiplier: 0,
    isNormalAttack: false,
    isCrit,
    critBonusBase: (caster.critMult ? (caster.critMult - 1) : wm.critBonus) + (caster.equipCritDmgPercent ?? 0),
    extraCritDmg: buffs ? buffs.crit_dmg_pct / 100 : (caster.buff?.critDmg ?? 0),
    isCore: false,
    coreHitBonus: 0,
    coreHitMultiplier: 0,
    fullBurstBonus: ctx.burstActive ? 0.5 : 0,
    rangeBonus: 0,
    weakPointBase: hasAdvantage ? 1.1 : 1.0,
    weakPointExtra:
      (buffs
        ? buffs.element_bonus_pct / 100
        : (caster.buff?.weak ?? 0) + (caster.buff?.elementDmgUp ?? 0)) +
      (hasAdvantage ? (caster.equipWeakPointPercent ?? 0) : 0),
    chargeDmgBonus: 0,
    chargeDmgMultiplier: 0,
    atkDmgUp: buffs ? buffs.atk_dmg_pct / 100 : (caster.buff?.atkDmgUpFinal ?? 0),
    dotDmgUp: overrides?.dotDmgUp ?? (buffs ? buffs.dot_dmg_pct / 100 : 0),
    pierceDmgUp: (caster.cubePierceDmgUp ?? 0) + (buffs ? buffs.pierce_dmg_pct / 100 : 0),
    partDmgUp: (caster.cubePartDmgUp ?? 0) + (buffs ? buffs.part_dmg_pct / 100 : 0),
    ignoreDefDmgUp: (caster.cubeIgnoreDefDmgUp ?? 0) + (buffs ? buffs.ignore_def_dmg_pct / 100 : 0),
    projectileDmgUp: 0,
    interruptionPartDmgUp: 0,
    extraDmgUp: 0,
    enemyTakenUp: (enemyBuffs ? enemyBuffs.received_dmg / 100 : 0) + (target.debuff?.takenUp ?? 0),
    shareDmgUp: 0,
    enemyTakenDown: target.debuff?.takenDown ?? 0,
  }
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

  // ── 적 활성 DoT 처리 ──
  processEnemyDots(ctx)

  // enter_burst_n 플래그 초기화 (1틱에 한 번만 트리거되도록)
  if (ctx.state) {
    for (let lv = 1; lv <= 3; lv++) {
      ctx.state[`__enterBurstLevel_${lv}`] = false
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Handler Functions
// ─────────────────────────────────────────────────────────────────────────────

/** battle_start: 첫 틱에 1회만 발동 */
function triggerBattleStart(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  const key = `battle_start_${sourceChar.id}_${skillId}_${effectDef.effect || effectDef.status || ''}`
  if (!ctx.state![key]) {
    ctx.state![key] = true
    return true
  }
  return false
}

/** enemy_spawn / self_focusing / focus: 전투 시작 시 1회 */
function triggerSpawn(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  const key = `spawn_${sourceChar.id}_${skillId}_${effectDef.effect || effectDef.status || ''}`
  if (!ctx.state![key]) {
    ctx.state![key] = true
    return true
  }
  return false
}

/** full_burst_start: 풀버스트 시작 시 (stack_level 검사 포함) */
function triggerFullBurstStart(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  // stateKey는 stack_level별로 고유하게 만들어 각 이펙트가 독립적으로 발동 추적
  const sl = effectDef.stack_level ?? 0
  const stateKey = `fb_start_${sourceChar.id}_${skillId}_${effectDef.effect}_sl${sl}`
  // stackKey(버스트 횟수 카운터)는 스킬 단위로 공유
  const stackKey = `fb_start_${sourceChar.id}_${skillId}_stack_count`
  // 버스트 사이클당 1회만 카운터 증가하기 위한 one-shot 키
  const countedKey = `fb_start_${sourceChar.id}_${skillId}_counted`

  let isTriggered = false
  if (ctx.burstActive && !ctx.state![stateKey]) {
    // 이번 풀버스트 사이클에서 아직 카운터를 올리지 않았으면 1회만 증가
    if (!ctx.state![countedKey]) {
      ctx.state![stackKey] = (ctx.state![stackKey] || 0) + 1
      ctx.state![countedKey] = true
    }
    isTriggered = true
    ctx.state![stateKey] = true
  } else if (!ctx.burstActive) {
    // 풀버스트가 끝나면 플래그 초기화
    if (ctx.state![stateKey]) ctx.state![stateKey] = false
    if (ctx.state![countedKey]) ctx.state![countedKey] = false
  }

  // stack_level 검사
  if (isTriggered) {
    const castCount = ctx.state![stackKey] || 0
    if (effectDef.stack_level !== undefined && effectDef.stack_level > castCount) {
      isTriggered = false // 스택 조건 미달
    }
  }

  return isTriggered
}

/** full_burst_end: 풀버스트 종료 시 */
function triggerFullBurstEnd(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  const stateKey = `fb_active_prev_${sourceChar.id}_${skillId}_${effectDef.effect}`
  const wasActive = ctx.state![stateKey] || false
  const triggered = wasActive && !ctx.burstActive
  ctx.state![stateKey] = ctx.burstActive
  return triggered
}

/** full_burst_time: 풀버스트 중 interval마다 발동 */
function triggerFullBurstTime(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  if (!ctx.burstActive || !effectDef.interval) return false
  const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_fb_timer`
  ctx.state![stateKey] = (ctx.state![stateKey] || 0) + ctx.delta
  if (ctx.state![stateKey] >= effectDef.interval) {
    ctx.state![stateKey] -= effectDef.interval
    return true
  }
  return false
}

/** last_bullet_hit: 마지막 탄환 사용 시 */
function triggerLastBulletHit(
  ctx: BattleContext, sourceChar: Character, skillId: string, _effectDef: SkillEffectDef
): boolean {
  const stateKey = `${sourceChar.id}_${skillId}_last_bullet`
  const wasEmpty = ctx.state![stateKey] || false
  if (sourceChar.ammo <= 0 && !wasEmpty) {
    ctx.state![stateKey] = true
    return true
  } else if (sourceChar.ammo > 0) {
    ctx.state![stateKey] = false
  }
  return false
}

/** ammo_consumed: 자신의 탄환 소모 총량 기준 */
function triggerAmmoConsumed(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  if (typeof effectDef.condition !== 'object' || !effectDef.condition?.count) return false
  const threshold = effectDef.condition.count
  const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_ammo_consumed`
  ctx.state![stateKey] = ctx.state![stateKey] || 0
  const currentUsed = sourceChar.totalAmmoUsed || 0
  if (currentUsed - ctx.state![stateKey] >= threshold) {
    ctx.state![stateKey] = currentUsed
    return true
  }
  return false
}

/** all_allies_ammo_consumed: 팀 전체 탄환 소모 합산 */
function triggerAllAlliesAmmoConsumed(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  if (typeof effectDef.condition !== 'object' || !effectDef.condition?.count) return false
  const threshold = effectDef.condition.count
  const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_team_ammo`
  ctx.state![stateKey] = ctx.state![stateKey] || 0
  const currentTeamAmmo = ctx.totalTeamAmmoUsed || 0
  if (currentTeamAmmo - ctx.state![stateKey] >= threshold) {
    ctx.state![stateKey] = currentTeamAmmo
    return true
  }
  return false
}

/** normal_attack_hit: 조건 count 기준 명중 시 */
function triggerNormalAttackHit(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  if (typeof effectDef.condition !== 'object' || !effectDef.condition?.count) return false
  let statusMet = true
  if (effectDef.condition.target_status === 'bubble') {
    statusMet = !!ctx.enemy.debuff?.bubble
  }
  if (!statusMet) return false

  const threshold = effectDef.condition.count
  const stateKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_attack_hit`
  ctx.state![stateKey] = ctx.state![stateKey] || 0
  const currentUsed = sourceChar.totalAmmoUsed || 0
  if (currentUsed - ctx.state![stateKey] >= threshold) {
    ctx.state![stateKey] = currentUsed
    return true
  }
  return false
}

/** on_hit: 피격 시 트리거 (chance 또는 count 기반, chance는 핸들러 내부에서 처리) */
function triggerOnHit(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  if (typeof effectDef.condition === 'object' && effectDef.condition?.count) {
    // count 기반: 피격 횟수 누적 (적의 초당 공격 약 2회로 근사)
    const hitsPerSecond = ctx.enemyHitsPerSecond ?? 2
    const countKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_on_hit_count`
    ctx.state![countKey] = (ctx.state![countKey] || 0) + hitsPerSecond * ctx.delta
    if (ctx.state![countKey] >= effectDef.condition.count) {
      ctx.state![countKey] -= effectDef.condition.count
      return true
    }
  } else {
    // chance 기반: n% 확률
    const chance =
      typeof effectDef.condition === 'object'
        ? ((effectDef.condition as any)?.chance ?? 0)
        : 0
    if (chance > 0 && ctx.rng.next() < chance / 100) {
      return true
    }
  }
  return false
}

/** full_charge_attack: SR/RL 풀차지 공격 시 */
function triggerFullChargeAttack(
  ctx: BattleContext, sourceChar: Character, _skillId: string, _effectDef: SkillEffectDef
): boolean {
  const stateKey = `${sourceChar.id}_fullcharge_flag`
  if (ctx.state![stateKey]) {
    ctx.state![stateKey] = false
    return true
  }
  return false
}

/** burst_cast: 시전자가 버스트 스킬을 사용한 경우 */
function triggerBurstCast(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  const burstCastSources = ctx.state!.__burstCastSources as Set<string> | undefined
  if (!burstCastSources?.has(sourceChar.id)) return false

  // stack_level 카운트는 버스트 시전 1회당 스킬별 1회 증가
  const stackKey = `${sourceChar.id}_${skillId}_burst_cast_count`
  const stackTickKey = `${stackKey}_tick_${ctx.time.toFixed(6)}`
  if (!ctx.state![stackTickKey]) {
    ctx.state![stackKey] = (ctx.state![stackKey] || 0) + 1
    ctx.state![stackTickKey] = true
  }

  const castCount = ctx.state![stackKey] || 0
  if (effectDef.stack_level !== undefined && effectDef.stack_level > castCount) return false

  return true
}

/** enter_burst_N: 버스트 N단계 진입 시 */
function triggerEnterBurst(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef,
  level: number
): boolean {
  const enterFlag = ctx.state![`__enterBurstLevel_${level}`]
  if (!enterFlag) return false

  // stack_level 카운트: 트리거 1회당 스킬별 1회 증가
  const stackKey = `${sourceChar.id}_${skillId}_enter_burst_${level}_count`
  const stackTickKey = `${stackKey}_tick_${ctx.time.toFixed(6)}`
  if (!ctx.state![stackTickKey]) {
    ctx.state![stackKey] = (ctx.state![stackKey] || 0) + 1
    ctx.state![stackTickKey] = true
  }

  const castCount = ctx.state![stackKey] || 0
  if (effectDef.stack_level !== undefined && effectDef.stack_level > castCount) return false

  return true
}

/** normal_attack: 일반 공격 시 (명중 무관, 공격 행위 자체) */
function triggerNormalAttack(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  // 조건에 status가 있으면 해당 상태가 있을 때만 카운트
  if (typeof effectDef.condition === 'object' && effectDef.condition?.status) {
    const requiredStatus = effectDef.condition.status
    const hasStatus = sourceChar.buffSlots?.some(s => s.status === requiredStatus)
    if (!hasStatus) return false

    if (effectDef.condition.count) {
      // count 기반: 일반 공격 횟수 누적 (status 보유 상태에서만)
      const countKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_normal_attack_status_${requiredStatus}`
      const currentUsed = sourceChar.totalAmmoUsed || 0
      ctx.state![countKey] = ctx.state![countKey] || 0
      const prevUsed = ctx.state![`${countKey}_prev`] ?? currentUsed
      const delta = currentUsed - prevUsed
      ctx.state![`${countKey}_prev`] = currentUsed
      ctx.state![countKey] += delta
      if (ctx.state![countKey] >= effectDef.condition.count) {
        ctx.state![countKey] -= effectDef.condition.count
        return true
      }
      return false
    }
    // count 없으면 아래 공통 로직으로 fall through
  }

  // 조건 없이 또는 status 조건만 있을 때: 매 공격마다 발동
  const prevKey = `${sourceChar.id}_${skillId}_${effectDef.effect}_normal_attack_prev`
  const currentUsed = sourceChar.totalAmmoUsed || 0
  const prev = ctx.state![prevKey] ?? currentUsed
  ctx.state![prevKey] = currentUsed
  return currentUsed > prev
}

/** designated_timing: 미하라 전용, 3가지 타이밍에 발동 */
function triggerDesignatedTiming(
  ctx: BattleContext, sourceChar: Character, skillId: string, _effectDef: SkillEffectDef
): boolean {
  const captureChainKey = `${sourceChar.id}_capture_chain`
  const captureChainCount = ctx.state![captureChainKey] || 0

  // 포획 사슬이 없으면 발동하지 않음
  if (captureChainCount <= 0) return false

  let isTriggered = false

  // 타이밍 1: 전투 시작 (적 등장)
  const battleStartKey = `designated_timing_spawn_${sourceChar.id}_${skillId}`
  if (!ctx.state![battleStartKey] && ctx.time === 0) {
    ctx.state![battleStartKey] = true
    isTriggered = true
  }

  // 타이밍 2: 버스트 3단계 진입 시
  if (!isTriggered) {
    const enterBurst3Flag = ctx.state![`__enterBurstLevel_3`]
    if (enterBurst3Flag) {
      const tickKey = `designated_timing_b3_${sourceChar.id}_${ctx.time.toFixed(6)}`
      if (!ctx.state![tickKey]) {
        ctx.state![tickKey] = true
        isTriggered = true
      }
    }
  }

  // 타이밍 3: 풀 버스트 종료 시
  const fbPrevKey = `designated_timing_fb_prev_${sourceChar.id}_${skillId}`
  if (!isTriggered) {
    const wasActive = ctx.state![fbPrevKey] || false
    if (wasActive && !ctx.burstActive) {
      isTriggered = true
    }
  }
  // 다른 타이밍에서 이미 트리거된 경우에도 fb prev 추적은 유지
  ctx.state![fbPrevKey] = ctx.burstActive

  return isTriggered
}

/** full_burst_end_after_self_burst: 풀버스트 종료 시 자신이 버스트를 사용했다면 */
function triggerFullBurstEndAfterSelfBurst(
  ctx: BattleContext, sourceChar: Character, skillId: string, _effectDef: SkillEffectDef
): boolean {
  const burstCastSources = ctx.state!.__burstCastSources as Set<string> | undefined
  const fbCycleKey = `${sourceChar.id}_burst_in_fb_cycle`

  // 이번 풀버스트 사이클에서 자신이 버스트를 사용했는지 추적
  if (burstCastSources?.has(sourceChar.id)) {
    ctx.state![fbCycleKey] = true
  }

  // 풀버스트 종료 감지
  const prevKey = `fb_self_burst_prev_${sourceChar.id}_${skillId}`
  const wasActive = ctx.state![prevKey] || false
  ctx.state![prevKey] = ctx.burstActive

  if (wasActive && !ctx.burstActive && ctx.state![fbCycleKey]) {
    ctx.state![fbCycleKey] = false
    return true
  }
  return false
}

/** full_burst_normal_attack: 풀버스트 중 일반 공격 n회 명중 시 */
function triggerFullBurstNormalAttack(
  ctx: BattleContext, sourceChar: Character, skillId: string, effectDef: SkillEffectDef
): boolean {
  const countKey = `${sourceChar.id}_${skillId}_fb_normal_atk_count`
  const prevKey = `${sourceChar.id}_${skillId}_fb_normal_atk_prev`

  if (!ctx.burstActive) {
    // 풀버스트가 아닐 때 카운터 리셋
    ctx.state![countKey] = 0
    ctx.state![prevKey] = sourceChar.totalAmmoUsed || 0
    return false
  }

  // target_status 조건 검사: 적에게 해당 debuff가 있어야 발동
  if (typeof effectDef.condition === 'object' && effectDef.condition?.target_status) {
    const requiredStatus = effectDef.condition.target_status
    const hasStatus = ctx.enemy.debuff?.activeDots?.some(
      (d: any) => d.status === requiredStatus && d.stacks > 0
    )
    if (!hasStatus) return false
  }

  const threshold = (typeof effectDef.condition === 'object' && effectDef.condition?.count) || 1
  const currentUsed = sourceChar.totalAmmoUsed || 0
  const prev = ctx.state![prevKey] ?? currentUsed
  const delta = currentUsed - prev
  ctx.state![prevKey] = currentUsed

  ctx.state![countKey] = (ctx.state![countKey] || 0) + delta
  if (ctx.state![countKey] >= threshold) {
    ctx.state![countKey] -= threshold
    return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Evaluation (dispatch)
// ─────────────────────────────────────────────────────────────────────────────

function handleEffectTrigger(
  ctx: BattleContext,
  sourceChar: Character,
  skillId: string,
  skillName: string,
  effectDef: SkillEffectDef
) {
  ctx.state = ctx.state || {}
  const trigger = effectDef.trigger

  // No trigger → permanent / always apply (e.g., battle_start effects)
  if (!trigger) return

  let isTriggered = false

  switch (trigger) {
    case 'battle_start':
      isTriggered = triggerBattleStart(ctx, sourceChar, skillId, effectDef)
      break
    case 'enemy_spawn':
    case 'self_focusing':
    case 'focus':
      isTriggered = triggerSpawn(ctx, sourceChar, skillId, effectDef)
      break
    case 'full_burst_start':
      isTriggered = triggerFullBurstStart(ctx, sourceChar, skillId, effectDef)
      break
    case 'full_burst_end':
      isTriggered = triggerFullBurstEnd(ctx, sourceChar, skillId, effectDef)
      break
    case 'full_burst_time':
      isTriggered = triggerFullBurstTime(ctx, sourceChar, skillId, effectDef)
      break
    case 'last_bullet_hit':
      isTriggered = triggerLastBulletHit(ctx, sourceChar, skillId, effectDef)
      break
    case 'ammo_consumed':
      isTriggered = triggerAmmoConsumed(ctx, sourceChar, skillId, effectDef)
      break
    case 'all_allies_ammo_consumed':
      isTriggered = triggerAllAlliesAmmoConsumed(ctx, sourceChar, skillId, effectDef)
      break
    case 'normal_attack_hit':
      isTriggered = triggerNormalAttackHit(ctx, sourceChar, skillId, effectDef)
      break
    case 'on_hit':
      isTriggered = triggerOnHit(ctx, sourceChar, skillId, effectDef)
      break
    case 'full_charge_attack':
      isTriggered = triggerFullChargeAttack(ctx, sourceChar, skillId, effectDef)
      break
    case 'burst_cast':
      isTriggered = triggerBurstCast(ctx, sourceChar, skillId, effectDef)
      break
    case 'enter_burst_1':
    case 'enter_burst_2':
    case 'enter_burst_3': {
      const level = parseInt(trigger.replace('enter_burst_', ''), 10)
      isTriggered = triggerEnterBurst(ctx, sourceChar, skillId, effectDef, level)
      break
    }
    case 'normal_attack':
      isTriggered = triggerNormalAttack(ctx, sourceChar, skillId, effectDef)
      break
    case 'designated_timing':
      isTriggered = triggerDesignatedTiming(ctx, sourceChar, skillId, effectDef)
      break
    case 'full_burst_end_after_self_burst':
      isTriggered = triggerFullBurstEndAfterSelfBurst(ctx, sourceChar, skillId, effectDef)
      break
    case 'full_burst_normal_attack':
      isTriggered = triggerFullBurstNormalAttack(ctx, sourceChar, skillId, effectDef)
      break
    // ── 미구현 / 스킵 트리거 ──
    case 'status_applied':
    case 'self_incapacitated':
    case 'enemy_death':
    case 'kill_enemy':
    case 'part_destroy':
      return
    default:
      return
  }

  if (!isTriggered) return

  // Chance check (on_hit은 이미 핸들러 내부에서 처리)
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

  // ── cost 기반 다중 히트 처리 (미하라 포획 사슬) ──
  if (effectDef.cost && effectDef.effect === 'damage') {
    const costStatusKey = `${sourceChar.id}_${effectDef.cost.status}`
    ctx.state = ctx.state || {}
    const currentStacks = ctx.state[costStatusKey] || 0
    if (currentStacks <= 0) return

    const targets = resolveTargets(ctx, sourceChar, effectDef.target)
    if (targets.length === 0) return

    // 포획 사슬 개수만큼 공격, 공격 당 1개 소모
    for (let i = 0; i < currentStacks; i++) {
      ctx.state[costStatusKey] = Math.max(0, ctx.state[costStatusKey] - effectDef.cost.value)
      targets.forEach((target) => {
        applySpecificEffectToTarget(ctx, sourceChar, target, skillName, { ...effectDef, cost: undefined })
      })
    }
    return
  }

  // ── chain_binding dot_damage: 포획 사슬 게이지 수 기반 중첩 부여 (미하라 사슬 감기) ──
  if (effectDef.effect === 'dot_damage' && effectDef.status === 'chain_binding') {
    const captureChainKey = `${sourceChar.id}_capture_chain`
    ctx.state = ctx.state || {}
    const currentGauge = ctx.state[captureChainKey] || 0
    if (currentGauge <= 0) return // 게이지 없으면 사슬 감기 미부여

    const maxStack = effectDef.stack || 20
    const dotStacks = Math.min(currentGauge, maxStack)
    const targets = resolveTargets(ctx, sourceChar, effectDef.target)
    targets.forEach((target) => {
      applySpecificEffectToTarget(ctx, sourceChar, target, skillName, {
        ...effectDef,
        stack: dotStacks, // stack을 게이지 수로 오버라이드
      })
    })
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

  // ── status-only 처리 (effect 없이 status만 있는 경우: 상태 충전/스택 변경) ──
  if (!effectDef.effect && effectDef.status) {
    ctx.state = ctx.state || {}
    if (isEnemy) {
      // 적에게 상태 스택 추가 (chain_binding 등)
      target.debuff = target.debuff || {}
      target.debuff.activeDots = target.debuff.activeDots || []
      const existingDot = target.debuff.activeDots.find((d: any) => d.status === effectDef.status)
      if (existingDot) {
        existingDot.stacks = (existingDot.stacks || 0) + value
        ctx.log.push({
          time: ctx.time, type: 'skill', source: sourceChar.id,
          value, description: `${effectDef.status} stacks +${value} (now ${existingDot.stacks})`,
        })
      }
    } else {
      // 자신에게 상태 충전 (capture_chain 등)
      const statusKey = `${(target as Character).id}_${effectDef.status}`
      const maxStack = effectDef.stack ?? Infinity
      ctx.state[statusKey] = Math.min((ctx.state[statusKey] || 0) + value, maxStack)
      ctx.log.push({
        time: ctx.time, type: 'skill', source: sourceChar.id,
        value, description: `${effectDef.status} charged to ${ctx.state[statusKey]}`,
      })
    }
    return
  }

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
          target.debuff.takenUp = Math.max(
            0,
            (target.debuff.takenUp || 0) - (value || 0) / 100
          )
          ctx.log.push({
            time: ctx.time, type: 'skill', source: sourceChar.id,
            description: 'Removed Bubble',
          })
        }
        // chain_binding 제거 (미하라 버스트 스킬)
        if (effectDef.status === 'chain_binding') {
          target.debuff.activeDots = (target.debuff.activeDots || []).filter(
            (d: any) => d.status !== 'chain_binding'
          )
          ctx.log.push({
            time: ctx.time, type: 'skill', source: sourceChar.id,
            description: 'Removed chain_binding',
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

        const critChance = ((sourceChar.crit ?? 15) + (sourceChar.buff?.critRate || 0)) / 100
        const isCrit = ctx.rng.next() < critChance
        const singleDmg = calcNikkeDamage(
          buildSkillDamageParams(ctx, sourceChar, target, value / 100, isCrit)
        )
        const totalDmg = singleDmg * hits
        target.hp -= totalDmg
        ctx.totalDamage += totalDmg
        ctx.log.push({
          time: ctx.time,
          type: 'skill_damage',
          source: sourceChar.id,
          value: totalDmg,
          description: effectDef.effect,
          skillName,
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

      // ── dot_damage: 적에게 지속 대미지 등록 (미하라 사슬 감기) ──
      case 'dot_damage': {
        target.debuff.activeDots = target.debuff.activeDots || []
        const existingDot = target.debuff.activeDots.find(
          (d: any) => d.status === effectDef.status && d.casterId === sourceChar.id
        )
        const dotStacks = effectDef.stack || 1
        if (existingDot) {
          // 기존 DoT 갱신: 스택을 max(현재, 신규) 로 설정
          existingDot.stacks = Math.max(existingDot.stacks, dotStacks)
          existingDot.valuePerTick = value / 100
          existingDot.timeSinceLastHit = 0
        } else {
          target.debuff.activeDots.push({
            status: effectDef.status,
            stacks: dotStacks,
            valuePerTick: value / 100,
            interval: effectDef.interval || 1,
            duration: effectDef.duration === 'permanent' ? 'permanent' : (effectDef.duration || 10),
            timeSinceLastHit: 0,
            casterId: sourceChar.id,
            irremovable: effectDef.irremovable || false,
            skillName,
          })
        }
        ctx.log.push({
          time: ctx.time, type: 'skill', source: sourceChar.id,
          value: dotStacks, description: `Applied ${effectDef.status} (${dotStacks} stacks)`,
        })
        break
      }

      // ── status_damage_with_stack_copy: 중첩 복사 지속 대미지 (미하라 버스트 chain_pull) ──
      case 'status_damage_with_stack_copy': {
        target.debuff.activeDots = target.debuff.activeDots || []
        // copy_status에서 스택 수를 복사 (최소 1 보장)
        const copySource = target.debuff.activeDots.find(
          (d: any) => d.status === effectDef.copy_status
        )
        const copiedStacks = Math.max(1, copySource?.stacks ?? 1)

        // 기존 chain_pull이 있으면 갱신, 없으면 새로 생성
        const existingPull = target.debuff.activeDots.find(
          (d: any) => d.status === effectDef.status && d.casterId === sourceChar.id
        )
        if (existingPull) {
          existingPull.stacks = copiedStacks
          existingPull.valuePerTick = value / 100
          existingPull.duration = typeof effectDef.duration === 'number' ? effectDef.duration : 10
          existingPull.timeSinceLastHit = 0
        } else {
          target.debuff.activeDots.push({
            status: effectDef.status,
            stacks: copiedStacks,
            valuePerTick: value / 100,
            interval: effectDef.interval || 1,
            duration: typeof effectDef.duration === 'number' ? effectDef.duration : 10,
            timeSinceLastHit: 0,
            casterId: sourceChar.id,
            irremovable: effectDef.irremovable || false,
            skillName,
          })
        }
        ctx.log.push({
          time: ctx.time, type: 'skill', source: sourceChar.id,
          value: copiedStacks,
          description: `Applied ${effectDef.status} (${copiedStacks} stacks copied from ${effectDef.copy_status})`,
        })
        break
      }

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

  const stackLv = effectDef.stack_level !== undefined ? effectDef.stack_level : 0
  const buffKey = effectDef.effect || ''
  const timerKey = `${sourceChar.id}__${skillName}__${effectDef.effect || 'status'}__${stackLv}`
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
      let atkUpValue = value
      // status_target: 해당 status의 스택 수에 따라 value 곱
      if (effectDef.status_target) {
        const statusStacks = char.buffSlots?.filter(s => s.status === effectDef.status_target).length ?? 0
        atkUpValue = value * statusStacks
      }
      appliedFlatValue = base * (atkUpValue / 100)
      // BuffManager가 정본 — char.buff는 제거 (buildSkillDamageParams가 BuffManager.getBuffs()로 읽음)
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
      // BuffManager가 정본 — char.buff.critRate 제거
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Crit Rate Up' })
      applied = true
      break
    case 'critical_damage_up':
    case 'crit_damage_up':
      appliedFlatValue = value / 100
      // BuffManager가 정본 — char.buff.critDmg 제거
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Crit Damage Up' })
      applied = true
      break
    case 'attack_damage_up':
    case 'atk_damage_up':
      appliedFlatValue = value / 100
      // BuffManager가 정본 — char.buff.atkDmgUp 제거
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
      let reloadAmount: number
      if (effectDef.unit === 'count') {
        // count 단위: value 발만큼 직접 충전
        reloadAmount = Math.floor(value)
      } else {
        // percent 단위: 최대 장탄수 기준 %만큼 충전
        reloadAmount = Math.floor(char.maxAmmo * (value / 100))
      }
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
      // BuffManager가 정본 — char.buff.pierceDmgUp 제거
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
      // BuffManager가 정본 — char.buff.partDmgUp 제거
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Parts Damage Up' })
      applied = true
      break
    case 'element_damage_up':
      appliedFlatValue = value / 100
      // BuffManager가 정본 — char.buff.elementDmgUp 제거
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
        ; (char as any).weaponOverrideSkillName = skillName
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Change Weapon' })
      applied = true
      break
    }
    case 'pellet_count_up': {
      appliedFlatValue = Math.floor(value)
      char.pelletCount = (char.pelletCount ?? 10) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Pellet Count Up' })
      applied = true
      break
    }
    case 'normal_attack_multiplier_up': {
      // 소장품 효과(normalAtkMultiplier)와 합산
      appliedFlatValue = value
      char.normalAtkMultiplier = (char.normalAtkMultiplier ?? 0) + appliedFlatValue
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'Normal ATK Multiplier Up' })
      applied = true
      break
    }
    case 'remove_status': {
      // 아군 대상: status_target에 해당하는 buffSlot 모두 제거
      const statusToRemove = effectDef.status_target || effectDef.status
      if (statusToRemove && char.buffSlots) {
        char.buffSlots = char.buffSlots.filter(slot => {
          if (slot.status === statusToRemove) {
            subtractBuffValue(char, slot.effect, slot.appliedFlat)
            endBuffTimeline(ctx, char, slot)
            return false
          }
          return true
        })
        ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, description: `Removed Status: ${statusToRemove}` })
      }
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
    case 'dot_damage_up':
      appliedFlatValue = value / 100
      // BuffManager가 정본 — char.buff.dotDmgUp 제거
      ctx.log.push({ time: ctx.time, type: 'skill', source: sourceChar.id, value, description: 'DoT Damage Up' })
      applied = true
      break
    default:
      break
  }

  if (effectDef.stack_level !== undefined) {
    char.buff.stack_level = Math.max(char.buff.stack_level || 0, effectDef.stack_level)
  }

  // stack 제한 검사: 동일 status의 슬롯 수가 stack을 초과하면 가장 오래된 것 제거
  if (applied && effectDef.stack !== undefined && effectDef.status && char.buffSlots) {
    const statusSlots = char.buffSlots.filter(s => s.status === effectDef.status)
    while (statusSlots.length > effectDef.stack) {
      const oldest = statusSlots.shift()!
      subtractBuffValue(char, oldest.effect, oldest.appliedFlat)
      endBuffTimeline(ctx, char, oldest)
      const idx = char.buffSlots.indexOf(oldest)
      if (idx !== -1) char.buffSlots.splice(idx, 1)
    }
  }

  // status_applied 트리거 처리: 방금 status가 적용됐다면 해당 status를 트리거로 감지하는 스킬 발동
  if (applied && effectDef.status) {
    const appliedStatusName = effectDef.status
    // sourceChar의 모든 스킬에서 status_applied 트리거를 가진 effect 검색
    sourceChar.skills?.forEach((skillDef: any) => {
      if (skillDef.type !== 'passive' && skillDef.type !== 'active') return
      skillDef.effects?.forEach((eff: any) => {
        if (
          eff.trigger === 'status_applied' &&
          typeof eff.condition === 'object' &&
          eff.condition?.status === appliedStatusName
        ) {
          applyEffect(ctx, sourceChar, skillDef.name, eff)
        }
      })
    })
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
// Enemy DoT Processing (미하라 chain_binding, chain_pull 등)
// ─────────────────────────────────────────────────────────────────────────────

function processEnemyDots(ctx: BattleContext) {
  const enemy = ctx.enemy
  if (!enemy.debuff?.activeDots || enemy.debuff.activeDots.length === 0) return

  enemy.debuff.activeDots = enemy.debuff.activeDots.filter((dot: any) => {
    dot.timeSinceLastHit += ctx.delta

    // interval 도달 시 대미지 처리
    if (dot.timeSinceLastHit >= dot.interval) {
      dot.timeSinceLastHit -= dot.interval

      // 시전자 찾기
      const caster = ctx.team.members.find(c => c.id === dot.casterId)
      if (caster) {
        const critChance = ((caster.crit ?? 15) + (caster.buff?.critRate || 0)) / 100
        const isCrit = ctx.rng.next() < critChance
        const dotDmgUp = caster.buff?.dotDmgUp ?? 0

        const singleTickDmg = calcNikkeDamage(
          buildSkillDamageParams(ctx, caster, enemy, dot.valuePerTick, isCrit, { dotDmgUp })
        )

        const totalDmg = singleTickDmg * dot.stacks
        enemy.hp -= totalDmg
        ctx.totalDamage += totalDmg
        ctx.log.push({
          time: ctx.time,
          type: 'dot_damage',
          source: caster.id,
          value: totalDmg,
          description: `${dot.status}_dot (${dot.stacks} stacks)`,
          skillName: dot.skillName || '',
        })
      }
    }

    // duration 관리
    if (dot.duration !== 'permanent') {
      dot.duration -= ctx.delta
      if (dot.duration <= 0) return false // 제거
    }
    return true // 유지
  })
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

// ─────────────────────────────────────────────────────────────────────────────
// Buff Subtraction
// ─────────────────────────────────────────────────────────────────────────────

/** 단순 char.buff 속성 차감 맵: effectName → char.buff 프로퍼티명 */
const BUFF_SUBTRACT_MAP: Record<string, string> = {
  'atk_up': 'extraATK',
  'attack_power_up': 'extraATK',
  'critical_rate_up': 'critRate',
  'critical_damage_up': 'critDmg',
  'crit_damage_up': 'critDmg',
  'attack_damage_up': 'atkDmgUp',
  'atk_damage_up': 'atkDmgUp',
  'def_up': 'defUp',
  'damage_taken_down': 'takenDown',
  'shield': 'shield',
  'recevie_heal': 'receiveHeal',
  'overheal_storage': 'overhealStorage',
  'heal_efficacy_up': 'healEfficacy',
  'pierce': 'pierceDmgUp',
  'parts_damage_up': 'partDmgUp',
  'element_damage_up': 'elementDmgUp',
  'dot_damage_up': 'dotDmgUp',
}

function subtractBuffValue(char: Character, effectName: string, value: number) {
  if (!char.buff || value === 0) return

  // 단순 char.buff 속성 차감 (대부분의 버프 유형)
  const buffProp = BUFF_SUBTRACT_MAP[effectName]
  if (buffProp) {
    ; (char.buff as any)[buffProp] = Math.max(0, ((char.buff as any)[buffProp] || 0) - value)
    return
  }

  // 특수 로직이 필요한 버프 유형
  switch (effectName) {
    case 'max_hp_up': {
      // HP 버프 제거 시 maxHp와 hp를 차감
      const oldMaxHp = char.maxHp ?? char.hp
      char.maxHp = Math.max(1, oldMaxHp - value)
      char.hp = Math.max(1, char.hp - value)
      break
    }
    case 'accuracy_up':
      char.accuracyBuff = Math.max(0, (char.accuracyBuff || 0) - value)
      break
    case 'damage_share':
      char.buff.damageShare = false
      break
    case 'pellet_count_up':
      char.pelletCount = Math.max(10, (char.pelletCount ?? 10) - value)
      break
    case 'normal_attack_multiplier_up':
      char.normalAtkMultiplier = Math.max(0, (char.normalAtkMultiplier ?? 0) - value)
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
