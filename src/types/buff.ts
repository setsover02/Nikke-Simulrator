// src/types/buff.ts
// PARSING.md + IMPL-STATUS.md 기준 표준 버프/트리거/타겟 타입 정의

export type Polarity = 'beneficial' | 'harmful' | 'neutral';

export type EffectType = 'buff' | 'damage' | 'instant' | 'weapon_change';

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
  stat?: string;
  polarity?: Polarity;
  max_stack?: number;
  stack_level?: number;
  values?: Record<string, number | string>;
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
  target_code?: string;
  gauge_id?: string;
  feather_id?: string;
  casterId?: string;
  weapon_override?: {
    chargeTime?: number;
    fireRate?: number;
    fullChargeDamage?: number;
    maxAmmo?: number | string;
    atkCoef?: number | number[];
    pelletCount?: number;
  };
  [key: string]: any;
}

/** 런타임 활성 버프 인스턴스 */
export interface ActiveBuff {
  uid: number;
  id: string;
  casterId: string;
  targetId: string;
  name: string;
  sourceSkill: string;
  type: EffectType;
  stat: string;
  polarity: Polarity;
  value: number;
  stack: number;
  maxStack: number;
  activatedAt: number;
  expiresAt: number;
  bulletsLeft?: number;
  shotsLeft?: number;
  isPermanent: boolean;
  effectDef: NormalizedSkillEffect;
  hasRuntimeConditions?: boolean;
  scaling?: string;
  scalingRef?: string;
  target_code?: string;
}

/** 집계된 버프 딕셔너리 — PARSING.md stat 마스터 테이블 기준
 *  buffConstants.ts createDefaultBuffCollection()과 1:1 대응
 */
export interface BuffCollection {
  // ── DealForm ② 공방 ────────────────────────────────────────────
  atk_pct: number;
  atk_flat: number;           // atk_caster_based_pct / atk_from_hp_pct 후처리 합산
  def_pct: number;
  enemy_def_down_pct: number; // 적 방어력 감소 (factor②)
  def_caster_based_pct: number;

  // ── DealForm ③ 크리·코어 ────────────────────────────────────────
  crit_rate: number;          // 기본 15% + 버프 합산, 최대 100%
  crit_dmg: number;           // 추가 크리티컬 대미지 (%)
  core_dmg_pct: number;

  // ── DealForm ④ 차지 ────────────────────────────────────────────
  charge_dmg_pct: number;
  charge_dmg_mag_pct: number;

  // ── DealForm ⑤ 유형별 버프 ─────────────────────────────────────
  atk_dmg_pct: number;
  normal_atk_dmg_pct: number;    // factor①
  burst_dmg_pct: number;         // is_burst_damage=true
  burst_dmg_aoe_pct: number;     // is_aoe_burst=true
  pierce_dmg_pct: number;
  dot_dmg_pct: number;
  sequential_dmg_pct: number;
  part_dmg_pct: number;
  armor_break_dmg_pct: number;
  projectile_attachment_dmg: number;
  projectile_explosion_dmg: number;

  // ── DealForm ⑥ 받는 대미지 ─────────────────────────────────────
  received_dmg: number;          // 적에게 부여 (음수=감소)
  split_dmg_pct: number;

  // ── DealForm ⑦ 원소 ────────────────────────────────────────────
  element_bonus_pct: number;

  // ── 타임라인 / 무기 제어 ─────────────────────────────────────────
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
  lifesteal_pct: number;
  max_hp_pct: number;
  max_hp_only_pct: number;
  burst_cooldown: number;
  skill_cooldown_pct: number;
  charge_speed_overflow_conversion_pct: number;

  // ── boolean 플래그 ───────────────────────────────────────────────
  pierce_enabled: boolean;
  armor_break_enabled: boolean;
  stun: boolean;
  stun_immune: boolean;
  debuff_immune: boolean;
  charge_speed_buff_immune: boolean;
  charge_speed_debuff_immune: boolean;
  stack_change_immune: boolean;
  infinite_ammo: boolean;
  taunt: boolean;

  [key: string]: any;
}
