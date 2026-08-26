// src/types/buff.ts
// calc-master (IMPL-STATUS.md / PARSING.md) 기반 표준 버프/트리거/타겟 타입 정의

export type Polarity = 'beneficial' | 'harmful' | 'neutral';

export type EffectType = 'buff' | 'damage' | 'instant' | 'weapon_change';

/** 표준 스탯 / 효과 키 */
export type BuffStatKey =
  | 'atk_pct'
  | 'atk_caster_based_pct'
  | 'atk_from_hp_pct'
  | 'atk_dmg_pct'
  | 'normal_atk_dmg_pct'
  | 'burst_dmg_pct'
  | 'burst_dmg_aoe_pct'
  | 'charge_dmg_pct'
  | 'charge_dmg_mag_pct'
  | 'charge_speed_pct'
  | 'charge_speed_caster_based_pct'
  | 'charge_time_flat'
  | 'crit_rate'
  | 'normal_atk_crit_rate'
  | 'crit_dmg'
  | 'normal_atk_crit_dmg'
  | 'core_dmg_pct'
  | 'part_dmg_pct'
  | 'pierce_dmg_pct'
  | 'dot_dmg_pct'
  | 'split_dmg_pct'
  | 'element_bonus_pct'
  | 'received_dmg'
  | 'received_dmg_pct'
  | 'damage_taken_pct'
  | 'armor_break_dmg_pct'
  | 'projectile_attachment_dmg'
  | 'projectile_explosion_dmg'
  | 'max_ammo_pct'
  | 'max_ammo_flat'
  | 'reload_speed_pct'
  | 'reload_time_fixed'
  | 'charge_time_fixed'
  | 'attack_speed_pct'
  | 'accuracy_pct'
  | 'mg_warmup_speed_pct'
  | 'pellet_count'
  | 'pellet_count_fixed'
  | 'burst_cooldown'
  | 'burst_cooldown_reduce'
  | 'skill_cooldown_pct'
  | 'skill_cooldown_reduce_pct'
  | 'lifesteal_pct'
  | 'max_hp_pct'
  | 'max_hp_only_pct'
  | 'hp_caster_based_pct'
  | 'hp_only_caster_based_pct'
  | 'def_pct'
  | 'def_caster_based_pct'
  | 'enemy_def_down_pct'
  | 'shield_from_max_hp_pct'
  | 'shared_shield_from_max_hp_pct'
  | 'pierce_enabled'
  | 'armor_break_enabled'
  | 'stun'
  | 'stun_immune'
  | 'debuff_immune'
  | 'charge_speed_buff_immune'
  | 'charge_speed_debuff_immune'
  | 'fullburst_duration'
  | string;

/** 정규화된 스킬 효과 정의 (JSON 스킬 파싱 포맷) */
export interface NormalizedSkillEffect {
  id?: string;
  source?: '스킬1' | '스킬2' | '스킬3' | 'skill_1' | 'skill_2' | 'burst' | string;
  type: EffectType;
  name: string;
  trigger: {
    timing: string[];
    condition?: string[];
  };
  target: string;
  stat?: BuffStatKey;
  polarity?: Polarity;
  max_stack?: number;
  stack_level?: number;
  values?: Record<string, number | string>; // 레벨 1~10 수치
  fixed_value?: number;
  duration?: number | 'permanent' | -1;
  duration_bullets?: number;
  duration_shots?: number;
  interval?: number;
  tick_interval?: number;
  hits?: number;
  based_on?: string;
  status?: string;
  status_target?: string;
  scaling?: 'stack_count' | string;
  scaling_ref?: string;
  target_effect?: string;
  target_skill?: string;
  weapon_override?: {
    chargeTime?: number;
    fireRate?: number;
    fullChargeDamage?: number;
    maxAmmo?: number | string;
  };
  [key: string]: any;
}

/** 런타임 활성 버프 인스턴스 */
export interface ActiveBuff {
  uid: number;
  id: string; // 고유 ID (source_char__skill_name__stat__uid)
  casterId: string;
  targetId: string;
  name: string;
  sourceSkill: string;
  type: EffectType;
  stat: BuffStatKey;
  polarity: Polarity;
  value: number; // 현재 스킬 레벨 기준 1스택당 값 (%)
  stack: number;
  maxStack: number;
  activatedAt: number;
  expiresAt: number; // Infinity for permanent
  bulletsLeft?: number;
  shotsLeft?: number;
  isPermanent: boolean;
  effectDef: NormalizedSkillEffect;
  hasRuntimeConditions?: boolean;
  scaling?: string;
  scalingRef?: string;
}

/** 집계된 버프 딕셔너리 (DamageParams 매핑 및 타임라인 계산용) */
export interface BuffCollection {
  // DealForm ① Base ATK / DEF
  atk_pct: number;
  atk_flat: number;
  atk_caster_based_pct: number;
  atk_from_hp_pct: number;
  def_pct: number;
  def_flat: number;
  enemy_def_down_pct: number;

  // DealForm ② Final ATK
  final_atk_pct: number;
  normal_atk_dmg_pct: number;

  // DealForm ③ Major Modifiers
  crit_rate: number; // 합산 크리율 (기본 15% + 버프, 최대 100%)
  crit_dmg_pct: number; // 추가 크리티컬 대미지 (%)
  core_dmg_pct: number; // 코어 대미지 보너스 (%)
  range_bonus: number;

  // DealForm ④ Element Bonus
  element_bonus_pct: number;

  // DealForm ⑤ Charge Damage
  charge_dmg_pct: number;
  charge_dmg_mag_pct: number;

  // DealForm ⑥ Damage Up
  atk_dmg_pct: number;
  burst_dmg_pct: number;
  burst_dmg_aoe_pct: number;
  pierce_dmg_pct: number;
  dot_dmg_pct: number;
  part_dmg_pct: number;
  ignore_def_dmg_pct: number;
  sequential_dmg_pct: number;
  armor_break_dmg_pct: number;

  // DealForm ⑦ Damage Taken
  received_dmg: number; // 적 받는 대미지 (%)
  split_dmg_pct: number;

  // 타임라인 / 무기 제어
  charge_speed_pct: number;
  charge_time_flat: number;
  charge_time_fixed: number | null;
  max_ammo_pct: number;
  max_ammo_flat: number;
  reload_speed_pct: number;
  reload_time_fixed: number | null;
  attack_speed_pct: number;
  accuracy_pct: number;
  mg_warmup_speed_pct: number;
  pellet_count: number;
  pellet_count_fixed: number | null;
  burst_cooldown_reduce_sec: number;
  burst_cooldown_pct: number;
  skill_cooldown_pct: number;
  lifesteal_pct: number;
  max_hp_pct: number;

  // 플래그
  pierce_enabled: boolean;
  armor_break_enabled: boolean;
  stun: boolean;
  stun_immune: boolean;
  debuff_immune: boolean;
  charge_speed_buff_immune: boolean;
  charge_speed_debuff_immune: boolean;

  [key: string]: any;
}
