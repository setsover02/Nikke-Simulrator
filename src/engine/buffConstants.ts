// src/engine/buffConstants.ts
// PARSING.md + IMPL-STATUS.md 기준 표준 버프 기본값 및 스탯 매핑 딕셔너리
// 레거시 키(atk_up, crit_rate_up, final_atk_pct, range_bonus 등) 제거

import { BuffCollection } from '../types/buff';

/** 모든 스탯의 기본값 템플릿 생성 (IMPL-STATUS.md stat 마스터 테이블 기준) */
export function createDefaultBuffCollection(): BuffCollection {
  return {
    // ── DealForm ② 공방 ──────────────────────────────────────────
    atk_pct: 0,             // atk_pct
    atk_flat: 0,            // atk_caster_based_pct / atk_from_hp_pct 후처리 합산
    def_pct: 0,             // def_pct (아군 방어력 ▲)
    enemy_def_down_pct: 0,  // def_pct 적 대상 → factor② 적 방어력 감소

    // ── DealForm ③ 크리·코어 ──────────────────────────────────────
    crit_rate: 0,           // 기본 15% + 버프 합산, getBuffs()에서 상한 처리
    crit_dmg: 0,            // crit_dmg / normal_atk_crit_dmg 합산
    core_dmg_pct: 0,        // core_dmg_pct

    // ── DealForm ④ 차지 ──────────────────────────────────────────
    charge_dmg_pct: 0,      // charge_dmg_pct
    charge_dmg_mag_pct: 0,  // charge_dmg_mag_pct (차지 배율 승수)

    // ── DealForm ⑤ 유형별 버프 ──────────────────────────────────
    atk_dmg_pct: 0,         // atk_dmg_pct (공격 대미지 ▲)
    normal_atk_dmg_pct: 0,  // normal_atk_dmg_pct (일반 공격 대미지 ▲, factor①)
    burst_dmg_pct: 0,       // burst_dmg_pct (is_burst_damage=true 히트)
    burst_dmg_aoe_pct: 0,   // burst_dmg_aoe_pct (is_aoe_burst=true 히트)
    pierce_dmg_pct: 0,      // pierce_dmg_pct (is_pierce_damage=true)
    dot_dmg_pct: 0,         // dot_dmg_pct (is_dot=true)
    sequential_dmg_pct: 0,  // sequential_dmg_pct (is_sequential=true)
    part_dmg_pct: 0,        // part_dmg_pct (is_part=true)
    armor_break_dmg_pct: 0, // armor_break_dmg_pct (is_armor_break_damage=true)
    projectile_attachment_dmg: 0, // projectile_attachment_dmg_pct
    projectile_explosion_dmg: 0,  // projectile_explosion_dmg_pct

    // ── DealForm ⑥ 받는 대미지 ──────────────────────────────────
    received_dmg: 0,        // received_dmg_pct (적에게 부여, 음수=감소)
    split_dmg_pct: 0,       // split_dmg_pct (is_split=true, factor⑥)

    // ── DealForm ⑦ 원소 ──────────────────────────────────────────
    element_bonus_pct: 0,   // element_bonus_pct

    // ── 타임라인 / 무기 제어 ─────────────────────────────────────
    charge_speed_pct: 0,        // charge_speed_pct
    charge_time_flat: 0,        // charge_time_flat (절대값 가감, 초)
    max_ammo_pct: 0,            // max_ammo_pct
    max_ammo_flat: 0,           // max_ammo_flat
    reload_speed_pct: 0,        // reload_speed_pct
    attack_speed_pct: 0,        // attack_speed_pct
    accuracy_pct: 0,            // accuracy_pct
    mg_warmup_speed_pct: 0,     // mg_warmup_speed_pct
    pellet_count: 0,            // pellet_count (기본 펠릿 수에 가산)
    lifesteal_pct: 0,           // lifesteal_pct
    max_hp_pct: 0,              // max_hp_pct (최대+현재 체력 동반 증가)
    max_hp_only_pct: 0,         // max_hp_only_pct (최대 체력만 증가)
    def_caster_based_pct: 0,    // def_caster_based_pct (DPS 미반영, 수집만)
    burst_cooldown: 0,          // burst_cooldown (buff로 지속, fullburst 시 적용)
    skill_cooldown_pct: 0,      // skill_cooldown_pct
    charge_speed_overflow_conversion_pct: 0, // getBuffs() 후처리로 charge_dmg_pct 합산

    // ── null 초기값 (fixed 계열) ─────────────────────────────────
    charge_time_fixed: null,    // charge_time_fixed (절대 고정값, null=미적용)
    reload_time_fixed: null,    // reload_time_fixed (절대 고정값, null=미적용)
    pellet_count_fixed: null,   // pellet_count_fixed (>0이면 펠릿 수 절대 고정)

    // ── boolean 플래그 ───────────────────────────────────────────
    pierce_enabled: false,              // pierce_enabled
    armor_break_enabled: false,         // armor_break_enabled
    stun: false,                        // stun
    stun_immune: false,                 // stun_immune
    debuff_immune: false,               // debuff_immune
    charge_speed_buff_immune: false,    // charge_speed_buff_immune
    charge_speed_debuff_immune: false,  // charge_speed_debuff_immune
    stack_change_immune: false,         // stack_change_immune
    infinite_ammo: false,               // infinite_ammo ✅ 구현
    taunt: false,                       // taunt (집계용, 타겟팅 모델 없음)
  };
}

/** parsed_skills의 effect(stat) 키 → BuffCollection 프로퍼티 매핑
 *  IMPL-STATUS.md _STAT_TO_BUFF 기준. damage/instant/weapon_change type은 매핑 안 함.
 */
export const _STAT_TO_BUFF: Record<string, keyof BuffCollection> = {
  // ── DealForm ② ──────────────────────────────────────────────────
  atk_pct: 'atk_pct',
  def_pct: 'def_pct',
  def_caster_based_pct: 'def_caster_based_pct',
  enemy_def_down_pct: 'enemy_def_down_pct',  // 적 대상 시 factor②에서 방어력 감소 적용
  max_hp_pct: 'max_hp_pct',
  max_hp_only_pct: 'max_hp_only_pct',
  // atk_caster_based_pct, atk_from_hp_pct → getBuffs() 후처리, 여기 매핑 없음

  // ── DealForm ③ ──────────────────────────────────────────────────
  crit_rate: 'crit_rate',
  normal_atk_crit_rate: 'crit_rate',   // crit_rate로 합산 (is_normal_atk 분리 미지원)
  crit_dmg: 'crit_dmg',
  normal_atk_crit_dmg: 'crit_dmg',     // crit_dmg로 합산
  core_dmg_pct: 'core_dmg_pct',

  // ── DealForm ④ ──────────────────────────────────────────────────
  charge_dmg_pct: 'charge_dmg_pct',
  charge_dmg_mag_pct: 'charge_dmg_mag_pct',

  // ── DealForm ⑤ ──────────────────────────────────────────────────
  atk_dmg_pct: 'atk_dmg_pct',
  normal_atk_dmg_pct: 'normal_atk_dmg_pct',
  burst_dmg_pct: 'burst_dmg_pct',
  burst_dmg_aoe_pct: 'burst_dmg_aoe_pct',
  pierce_dmg_pct: 'pierce_dmg_pct',
  dot_dmg_pct: 'dot_dmg_pct',
  sequential_dmg_pct: 'sequential_dmg_pct',
  part_dmg_pct: 'part_dmg_pct',
  armor_break_dmg_pct: 'armor_break_dmg_pct',
  projectile_attachment_dmg_pct: 'projectile_attachment_dmg',
  projectile_explosion_dmg_pct: 'projectile_explosion_dmg',
  // intercept_dmg_pct → 🚫 보류, 매핑 없음

  // ── DealForm ⑥ ──────────────────────────────────────────────────
  received_dmg_pct: 'received_dmg',
  split_dmg_pct: 'split_dmg_pct',

  // ── DealForm ⑦ ──────────────────────────────────────────────────
  element_bonus_pct: 'element_bonus_pct',

  // ── 타임라인 ────────────────────────────────────────────────────
  charge_speed_pct: 'charge_speed_pct',
  charge_speed_caster_based_pct: 'charge_speed_pct', // getBuffs()에서 시전자 기준 환산 후 합산
  charge_time_flat: 'charge_time_flat',
  charge_time_fixed: 'charge_time_fixed',
  max_ammo_pct: 'max_ammo_pct',
  max_ammo_flat: 'max_ammo_flat',
  ammo_charge_pct: 'max_ammo_pct',   // instant stat, 장탄 충전 %
  reload_speed_pct: 'reload_speed_pct',
  reload_time_fixed: 'reload_time_fixed',
  attack_speed_pct: 'attack_speed_pct',
  accuracy_pct: 'accuracy_pct',
  mg_warmup_speed_pct: 'mg_warmup_speed_pct',
  pellet_count: 'pellet_count',
  lifesteal_pct: 'lifesteal_pct',
  burst_cooldown: 'burst_cooldown',
  skill_cooldown_pct: 'skill_cooldown_pct',
  charge_speed_overflow_conversion_pct: 'charge_speed_overflow_conversion_pct',
  taunt: 'taunt',

  // ── boolean 플래그 ───────────────────────────────────────────────
  pierce_enabled: 'pierce_enabled',
  armor_break_enabled: 'armor_break_enabled',
  stun: 'stun',
  stun_immune: 'stun_immune',
  debuff_immune: 'debuff_immune',
  charge_speed_buff_immune: 'charge_speed_buff_immune',
  charge_speed_debuff_immune: 'charge_speed_debuff_immune',
  stack_change_immune: 'stack_change_immune',
  infinite_ammo: 'infinite_ammo',
};

/** 크리티컬 확률 계열 스탯 집합 (합산 후 100% 상한, 기본 15% 합산) */
export const _CRIT_RATE_STATS = new Set([
  'crit_rate',
  'normal_atk_crit_rate',
]);

/** 크리티컬 대미지 계열 스탯 집합 */
export const _CRIT_DMG_STATS = new Set([
  'crit_dmg',
  'normal_atk_crit_dmg',
]);

/** boolean 플래그 형태의 버프 스탯 (true로 세팅, 합산 없음) */
export const _BOOLEAN_FLAG_STATS = new Set([
  'pierce_enabled',
  'armor_break_enabled',
  'stun',
  'stun_immune',
  'debuff_immune',
  'charge_speed_buff_immune',
  'charge_speed_debuff_immune',
  'stack_change_immune',
  'infinite_ammo',
  'taunt',
]);

/** charge_time_fixed / reload_time_fixed 등 null 초기값 fixed 계열 스탯
 *  getBuffs() 합산 경로를 타지 않고 _active를 직접 읽는다. */
export const _FIXED_VALUE_STATS = new Set([
  'charge_time_fixed',
  'reload_time_fixed',
  'pellet_count_fixed',
]);

/** 실시간 스탯 비교(공격력 1위 등)가 필요한 동적 타겟 접두사 (lazy resolve) */
export const _LAZY_RESOLVE_TARGET_PREFIXES = [
  'allies_top_atk:',
  'allies_top_atk_excl:',
  'allies_lowest_hp:',
  'allies_lowest_hp_excl:',
  'allies_top_def:',
  'allies_lowest_atk_burst3:',
  'allies_random:',
  'allies_below_def',
  'allies_weapon_top_atk:',
];

/** ❌/🚫 구현 제외 stat 목록 (경고 로그 전용) */
export const _UNIMPLEMENTED_STATS = new Set([
  'intercept_dmg_pct',
  'optimal_range_max', 'optimal_range_max_pct', 'optimal_range_min',
  'explosion_range', 'pierce_range',
  'outgoing_heal_pct',
  'shield_dmg_pct',
  'cover_def_pct', 'cover_hp_pct', 'cover_heal_pct', 'cover_disabled',
  'next_shield_hp_pct', 'accumulate_max_scale_pct',
  'heal_overcharge_store', 'heal_overcharge_store_atk_pct', 'heal_overcharge_discharge',
  'shield_restore_pct',
  'buff_max_stack_add',
  'burst_dmg_single_pct',
  'skill_cooldown',           // ✅ 대상 지정 초 단위, 미구현
  'undying', 'stealth', 'decoy',
  'enemy_movement_disable',
  'atk_copy', 'hp_copy', 'received_dmg_split', 'heal_split',
  'burst_charge_pct', 'burst_charge_speed_pct',
  'charge_time_caster_based',
  'enemy_buff_cleanse',
  'targeting_exclude',
  'force_move',
  'burst_reentry',    // burst_reenter는 charExceptions에서 처리
]);
