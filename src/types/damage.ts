// types/damage.ts
// 니케 DealForm ①~⑦ 기준 파라미터 정의 — PARSING.md + IMPL-STATUS.md 기준

export interface DamageParams {

   /* ================================================
      ① 기본 데미지 (Base Damage)
      = (BaseATK × (1 + ATK%) + ATK flat)
        - (EnemyDEF × (1 + DEF%) + DEF flat)
   ================================================ */

   baseATK: number;          // 기본 공격력
   extraATKPercent: number;  // 공격력 % 증가 버프 합산 (0.25 = +25%)
   extraATKFlat: number;     // atk_caster_based_pct / atk_from_hp_pct 후처리 합산
   enemyBaseDEF: number;     // 적 기본 방어력
   enemyDEFPercent: number;  // def_pct 적 대상 또는 enemy_def_down_pct (음수=감소)
   enemyDEFFlat?: number;    // 적 방어력 flat (미사용, 호환용)


   /* ================================================
      ② Final ATK Modifier (스킬 계수)
      = atkCoef × (1 + normalAtkMultiplier)
   ================================================ */

   atkCoef: number;              // 스킬 계수
   finalATKModifier: number;     // 항상 0 (PARSING.md에 final_atk_pct 없음)
   normalAtkMultiplier?: number; // normal_atk_dmg_pct (%)
   isNormalAttack?: boolean;     // 일반 공격 여부


   /* ================================================
      ③ Major Modifiers (가산 합산 후 단일 계수)
      = 1 + 크리 + 코어 + 풀버스트(0.5) + 사거리(0)
   ================================================ */

   isCrit: boolean;            // 크리티컬 여부
   critBonusBase: number;      // 기본 크리 보너스 + crit_dmg 베이스 (0.5~)
   extraCritDmg: number;       // crit_dmg / normal_atk_crit_dmg 합산 (소수)
   isCore: boolean;            // 코어 히트 여부
   coreHitBonus: number;       // 코어 보너스: 기본 1.0~1.5 + core_dmg_pct
   coreHitMultiplier?: number; // AR 소장품 코어 배율 (%)
   fullBurstBonus: number;     // 풀버스트 보너스 (0.5 고정)
   rangeBonus: number;         // 사거리 보너스 (항상 0, PARSING.md에 없음)


   /* ================================================
      ④ Element Bonus Damage (원소 보너스)
      = 1.1 기본 + element_bonus_pct
   ================================================ */

   weakPointBase: number;   // 원소 코드 기본 보너스 (1.1 또는 1.0)
   weakPointExtra: number;  // element_bonus_pct / 장비 원소 보너스 합산


   /* ================================================
      ⑤ Charge Damage (차지 데미지)
      = (1 + charge_dmg_pct) × charge_dmg_mag_pct
      비차지 무기는 chargeDmgBonus = 0
   ================================================ */

   chargeDmgBonus: number;      // 차지 대미지 보너스 (비차지=0)
   chargeDmgMultiplier?: number; // charge_dmg_mag_pct (RL/SR 소장품 배율 %)


   /* ================================================
      ⑥ Damage Up (버프형 대미지 증가)
      = 1 + atk_dmg_pct + dot_dmg_pct + pierce_dmg_pct
          + part_dmg_pct + sequential_dmg_pct + burst_dmg_pct + ...
   ================================================ */

   atkDmgUp: number;    // atk_dmg_pct (공격 대미지 ▲)
   dotDmgUp: number;    // dot_dmg_pct (is_dot=true 히트)
   pierceDmgUp: number; // pierce_dmg_pct (is_pierce_damage=true 히트)
   partDmgUp: number;   // part_dmg_pct (is_part=true 히트)
   extraDmgUp: number;
   projectileDmgUp?: number;  // 기타 (예비)
   projectileAttachmentDmgUp?: number; // projectile_attachment_dmg_pct (is_projectile_attachment=true)
   projectileExplosionDmgUp?: number;  // projectile_explosion_dmg_pct (is_projectile_explosion=true)
   burstDmgUp?: number;       // burst_dmg_pct (is_burst_damage=true)
   burstAoeDmgUp?: number;    // burst_dmg_aoe_pct (is_aoe_burst=true)
   sequentialDmgUp?: number;  // sequential_dmg_pct (is_sequential=true)
   armorBreakDmgUp?: number;  // armor_break_dmg_pct (is_armor_break_damage=true)
   ignoreDefDmgUp?: number;


   /* ================================================
      ⑦ Damage Taken (받는 대미지)
      = 1 + received_dmg_pct + split_dmg_pct - 감소
   ================================================ */

   enemyTakenUp: number;    // received_dmg_pct (적에게 부여)
   shareDmgUp: number;      // split_dmg_pct (is_split=true 히트)
   enemyTakenDown: number;  // 적 받는 대미지 감소 (레거시 fallback)
}
