// types/damage.ts
// 니케 공식 기준 파라미터 정의
// 최종 데미지 = 기본데미지 × Final ATK Mod × Major Modifiers × 원소보너스 × 차지데미지 × 데미지UP × 받는데미지

export interface DamageParams {

   /* ================================================
      ① 기본 데미지 (Base Damage)
      = (BaseATK × (1 + ATK%) + % Caster's ATK flat)
        - (EnemyDEF × (1 + DEF%) + % Caster's DEF flat)
   ================================================ */

   baseATK: number;
   // 기본 공격력

   extraATKPercent: number;
   // 공격력 % 증가 버프 합산 (0.25 = +25%)

   extraATKFlat: number;
   // 시전자 공격력의 % 만큼 평탄 추가 (스킬: attack_power_up 등)

   enemyBaseDEF: number;
   // 적 기본 방어력

   enemyDEFPercent: number;
   // 적 방어력 % 증가 (0이면 DEF 변화 없음)


   /* ================================================
      ② Final ATK Modifier (공격/스킬 계수)
      = 공격/스킬의 기본 계수 (atkCoef) × (1 + Final ATK 버프)
   ================================================ */

   atkCoef: number;
   // 공격/스킬 계수

   finalATKModifier: number;
   // Final ATK 관련 % 버프 합산 (0.1 = +10%)


   /* ================================================
      ③ Major Modifiers (가산 합산 후 단일 계수)
      = 1
        + 크리 0.5 (기본) + 추가 크리 데미지 소스
        + 코어 히트 보너스 (1.0 or 1.5, Nikke별)
        + 풀버스트 0.5
        + 유효 사거리 0.3
   ================================================ */

   isCrit: boolean;
   // 크리티컬 여부

   critBonusBase: number;
   // 기본 크리 보너스 (일반적으로 0.5)

   extraCritDmg: number;
   // 추가 크리 데미지 소스 합산

   isCore: boolean;
   // 코어 히트 여부

   coreHitBonus: number;
   // 코어 히트 보너스: 일반 Nikke = 1.0, 강화형 = 1.5

   fullBurstBonus: number;
   // 풀버스트 보너스 (0.5 고정)

   rangeBonus: number;
   // 유효 사거리 보너스 (0.3 고정)


   /* ================================================
      ④ Element Bonus Damage (원소 보너스)
      = 1.1 기본 + 추가 원소 소스
   ================================================ */

   weakPointBase: number;
   // 원소 코드 기본 보너스 (1.1)

   weakPointExtra: number;
   // 추가 원소 데미지 소스


   /* ================================================
      ⑤ Charge Damage (차지 데미지)
      = 1 + 차지 소스 + 0.5/1.5/2.5 (Nikke별)
      SMG/AR 등 비차지 무기는 chargeDmgBonus = 0
   ================================================ */

   chargeDmgBonus: number;
   // 차지 데미지 보너스 (비차지 무기 = 0)


   /* ================================================
      ⑥ Damage Up (버프형 데미지 증가)
      = 1 + 공격데미지증가 + 지속데미지증가 + 진실데미지
        + 관통데미지증가 + 파츠데미지증가 + 저지파츠데미지증가
   ================================================ */

   atkDmgUp: number;
   // 공격 데미지 증가 (Attack Damage)

   dotDmgUp: number;
   // 지속 데미지 증가 (Sustained Damage)

   pierceDmgUp: number;
   // 관통 데미지 증가 (Pierce Damage)

   partDmgUp: number;
   // 파츠 데미지 증가 (Damage To Parts)

   ignoreDefDmgUp: number;
   // 방어력 무시 (True Damage)

   projectileDmgUp: number;
   // 투사체 데미지 증가

   interruptionPartDmgUp: number;
   // 저지 파츠 데미지 증가 (Damage to Interruption Parts)

   extraDmgUp: number;
   // 기타 데미지 증가


   /* ================================================
      ⑦ Damage Taken (받는 데미지)
      = 1 + 받는 데미지 증가 + 분배 데미지
   ================================================ */

   enemyTakenUp: number;
   // 적 받는 데미지 증가 (Damage Taken)

   shareDmgUp: number;
   // 분배 데미지 증가 (Distributed Damage)

   enemyTakenDown: number;
   // 적 받는 데미지 감소
}