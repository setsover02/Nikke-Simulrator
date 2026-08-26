// src/engine/buffConstants.ts
// calc-master (IMPL-STATUS.md) 기반 표준 버프 기본값 및 스탯 매핑 딕셔너리

import { BuffCollection } from '../types/buff';

/** 모든 스탯의 기본값 템플릿 생성 */
export function createDefaultBuffCollection(): BuffCollection {
  return {
    // DealForm ① Base ATK / DEF
    atk_pct: 0,
    atk_flat: 0,
    atk_caster_based_pct: 0,
    atk_from_hp_pct: 0,
    def_pct: 0,
    def_flat: 0,
    enemy_def_down_pct: 0,

    // DealForm ② Final ATK
    final_atk_pct: 0,
    normal_atk_dmg_pct: 0,

    // DealForm ③ Major Modifiers
    crit_rate: 0, // 기본 15%는 getBuffs()에서 기본값으로 추가
    crit_dmg_pct: 0,
    core_dmg_pct: 0,
    range_bonus: 0,

    // DealForm ④ Element Bonus
    element_bonus_pct: 0,

    // DealForm ⑤ Charge Damage
    charge_dmg_pct: 0,
    charge_dmg_mag_pct: 0,

    // DealForm ⑥ Damage Up
    atk_dmg_pct: 0,
    burst_dmg_pct: 0,
    burst_dmg_aoe_pct: 0,
    pierce_dmg_pct: 0,
    dot_dmg_pct: 0,
    part_dmg_pct: 0,
    ignore_def_dmg_pct: 0,
    sequential_dmg_pct: 0,
    armor_break_dmg_pct: 0,

    // DealForm ⑦ Damage Taken
    received_dmg: 0,
    split_dmg_pct: 0,

    // 타임라인 / 무기 제어
    charge_speed_pct: 0,
    charge_time_flat: 0,
    charge_time_fixed: null,
    max_ammo_pct: 0,
    max_ammo_flat: 0,
    reload_speed_pct: 0,
    reload_time_fixed: null,
    attack_speed_pct: 0,
    accuracy_pct: 0,
    mg_warmup_speed_pct: 0,
    pellet_count: 0,
    pellet_count_fixed: null,
    burst_cooldown_reduce_sec: 0,
    burst_cooldown_pct: 0,
    skill_cooldown_pct: 0,
    lifesteal_pct: 0,
    max_hp_pct: 0,

    // 플래그
    pierce_enabled: false,
    armor_break_enabled: false,
    stun: false,
    stun_immune: false,
    debuff_immune: false,
    charge_speed_buff_immune: false,
    charge_speed_debuff_immune: false,
  };
}

/** parsed_skills의 stat 키 → BuffCollection 프로퍼티 매핑 */
export const _STAT_TO_BUFF: Record<string, keyof BuffCollection> = {
  atk_pct: 'atk_pct',
  atk_up: 'atk_pct',
  atk_dmg_pct: 'atk_dmg_pct',
  normal_atk_dmg_pct: 'normal_atk_dmg_pct',
  burst_dmg_pct: 'burst_dmg_pct',
  burst_dmg_aoe_pct: 'burst_dmg_aoe_pct',
  charge_dmg_pct: 'charge_dmg_pct',
  charge_dmg_mag_pct: 'charge_dmg_mag_pct',
  charge_speed_pct: 'charge_speed_pct',
  charge_time_flat: 'charge_time_flat',
  crit_rate: 'crit_rate',
  normal_atk_crit_rate: 'crit_rate',
  crit_rate_up: 'crit_rate',
  crit_dmg: 'crit_dmg_pct',
  crit_dmg_pct: 'crit_dmg_pct',
  normal_atk_crit_dmg: 'crit_dmg_pct',
  crit_dmg_up: 'crit_dmg_pct',
  core_dmg_pct: 'core_dmg_pct',
  part_dmg_pct: 'part_dmg_pct',
  pierce_dmg_pct: 'pierce_dmg_pct',
  dot_dmg_pct: 'dot_dmg_pct',
  split_dmg_pct: 'split_dmg_pct',
  element_bonus_pct: 'element_bonus_pct',
  received_dmg: 'received_dmg',
  received_dmg_pct: 'received_dmg',
  damage_taken_pct: 'received_dmg',
  damage_taken_up: 'received_dmg',
  armor_break_dmg_pct: 'armor_break_dmg_pct',
  max_ammo_pct: 'max_ammo_pct',
  max_ammo_flat: 'max_ammo_flat',
  reload_speed_pct: 'reload_speed_pct',
  attack_speed_pct: 'attack_speed_pct',
  accuracy_pct: 'accuracy_pct',
  mg_warmup_speed_pct: 'mg_warmup_speed_pct',
  pellet_count: 'pellet_count',
  burst_cooldown: 'burst_cooldown_pct',
  burst_cooldown_reduce: 'burst_cooldown_reduce_sec',
  skill_cooldown_pct: 'skill_cooldown_pct',
  lifesteal_pct: 'lifesteal_pct',
  max_hp_pct: 'max_hp_pct',
  def_pct: 'def_pct',
  def_up: 'def_pct',
  enemy_def_down_pct: 'enemy_def_down_pct',
};

/** 크리티컬 확률 계열 스탯 집합 (합산 후 100% 상한) */
export const _CRIT_RATE_STATS = new Set([
  'crit_rate',
  'normal_atk_crit_rate',
  'crit_rate_up',
]);

/** 크리티컬 대미지 계열 스탯 집합 */
export const _CRIT_DMG_STATS = new Set([
  'crit_dmg',
  'crit_dmg_pct',
  'normal_atk_crit_dmg',
  'crit_dmg_up',
]);

/** boolean 플래그 형태의 버프 스탯 */
export const _BOOLEAN_FLAG_STATS = new Set([
  'pierce_enabled',
  'armor_break_enabled',
  'stun',
  'stun_immune',
  'debuff_immune',
  'charge_speed_buff_immune',
  'charge_speed_debuff_immune',
]);

/** 실시간 스탯 비교(공격력 1위 등)가 필요한 동적 타겟 접두사 */
export const _LAZY_RESOLVE_TARGET_PREFIXES = [
  'top_atk_allies',
  'allies_top_atk',
  'lowest_atk_allies',
  'top_def_allies',
  'top_hp_allies',
  'lowest_hp_allies',
  'highest_atk_enemy',
  'highest_def_enemy',
  'lowest_hp_enemy',
];
