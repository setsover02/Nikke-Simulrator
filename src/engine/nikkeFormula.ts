// engine/nikkeFormula.ts
// 니케 공식 기반 최종 데미지 계산
// 최종 데미지 = 기본데미지 × FinalATKMod × MajorModifiers × 원소보너스 × 차지데미지 × 데미지UP × 받는데미지

import { DamageParams } from "../types/damage";

export function calcNikkeDamage(p: DamageParams): number {

   /* ================================================
      ① 기본 데미지 (Base Damage)
      = (BaseATK × (1 + ATK%) + % Caster's ATK flat)
        - (EnemyDEF × (1 + DEF%))
   ================================================ */

   const effectiveATK = Math.round(p.baseATK * (1 + p.extraATKPercent)) + p.extraATKFlat;
   const effectiveDEF = Math.round(p.enemyBaseDEF * (1 + p.enemyDEFPercent)) + (p.enemyDEFFlat ?? 0);
   const baseDamage = Math.max(1, effectiveATK - effectiveDEF);


   /* ================================================
      ② Final ATK Modifier (소장품 배율 포함)
      = atkCoef × (1 + 소장품 일반공격 배율/100) × (1 + Final ATK 버프)
      소장품 배율을 atkCoef에 먼저 곱한 뒤 Final ATK 버프 적용
   ================================================ */

   const f = (val: number) => val; // Replace with desired precision/rounding logic if needed

   const normalAtkMult = p.isNormalAttack ? ((p.normalAtkMultiplier ?? 0) / 100) : 0;

   // 인게임 공식: atkCoef에 normalAtkMult 배율 적용 후 소수점 4자리에서 iround
   // iround(atkCoef × 10000 × (1 + normalAtkMult)) / 10000
   // 이를 통해 인게임의 중간 반올림 로직을 재현합니다.
   const atkCoef = normalAtkMult > 0
      ? Math.floor(p.atkCoef * 10000 * (1 + normalAtkMult) + 0.5) / 10000
      : p.atkCoef;
   const finalATKMod = atkCoef * (1 + p.finalATKModifier);


   /* ================================================
      ③ Major Modifiers (모두 가산)
      = 1
        + 크리 보너스 (기본 0.5 + 추가)  ← 크리 시에만 적용
        + 코어 히트 보너스 (1.0 or 1.5)  ← 코어 히트 시에만 적용
        + 풀버스트 보너스 (0.5)
        + 유효 사거리 보너스 (0.3)
   ================================================ */

   const majorModifiers =
      1 +
      (p.isCrit ? (p.critBonusBase + p.extraCritDmg) : 0) +
      (p.isCore ? p.coreHitBonus : 0) +
      p.fullBurstBonus +
      p.rangeBonus;


   /* ================================================
      ④ Element Bonus Damage (원소 보너스 코드)
      = 1.1 기본 + 추가 원소 소스
   ================================================ */

   const elementBonus = p.weakPointBase + p.weakPointExtra;


   /* ================================================
      ⑤ Charge Damage (차지 데미지)
      = 1 + 차지 소스 + 0.5/1.5/2.5 (Nikke별)
      비차지 무기(SMG/AR 등) = 1.0
   ================================================ */

   const chargeDamage = 1 + p.chargeDmgBonus;


   /* ================================================
      ⑥ Damage Up (버프형 데미지 증가)
      = 1 + 공격데미지 + 지속데미지 + 진실데미지
        + 관통 + 파츠 + 투사체 + 저지파츠 + 기타
   ================================================ */

   const damageUp =
      1 +
      p.atkDmgUp +
      p.dotDmgUp +
      p.pierceDmgUp +
      p.partDmgUp +
      p.ignoreDefDmgUp +
      p.projectileDmgUp +
      p.interruptionPartDmgUp +
      p.extraDmgUp;


   /* ================================================
      ⑦ Damage Taken (받는 데미지)
      = 1 + 받뎀증 + 분배 - 받뎀감
   ================================================ */

   const damageTaken =
      1 +
      p.enemyTakenUp +
      p.shareDmgUp -
      p.enemyTakenDown;


   /* ================================================
      ✅ 최종 데미지
      = 기본데미지 × FinalATKMod × MajorModifiers
        × 원소보너스 × 차지데미지 × 데미지UP × 받는데미지
   ================================================ */
   function iround(x: number) {
      return Math.floor(x + 0.5);
   }
   return iround(
      baseDamage *
      finalATKMod *
      majorModifiers *
      elementBonus *
      chargeDamage *
      damageUp *
      damageTaken
   );
}
