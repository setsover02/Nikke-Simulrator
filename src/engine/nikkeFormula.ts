// engine/nikkeFormula.ts
// 니케 공식 기반 최종 데미지 계산

import { DamageParams } from "../types/damage";

export function calcNikkeDamage(p: DamageParams): number {

    /* =========================
       ① 기본 데미지
       기본 공격력 × (100%+추가공증-방어) × 공격계수
    ========================= */

    const baseDamage =
        p.baseATK *
        (1 + p.extraATKBonus - p.enemyDEFCoef) *
        p.atkCoef;


    /* =========================
       ② 기본 데미지 증가 계수
       100% + 크댐 + 근접 + 거리 + 풀버스트
    ========================= */

    const baseBonus =
        1 +
        p.bonusAtk +
        p.critBonusBase +
        p.meleeBonus +
        p.rangeBonus +
        p.fullBurstBonus;


    /* =========================
       ③ 버프형 데미지 증가 계수
       공뎀증+파츠+관통+지속+방무+투사체+저지부위
    ========================= */

    const typeBonus =
        1 +
        p.atkDmgUp +
        p.partDmgUp +
        p.pierceDmgUp +
        p.dotDmgUp +
        p.ignoreDefDmgUp +
        p.projectileDmgUp +
        p.weakPartDmgUp +
        p.extraDmgUp;


    /* =========================
       ④ 치명타 계수
       250% / 350% + 추가차뎀
    ========================= */

    const critCoef = p.isCrit
        ? p.critMultiplier + p.extraCritDmg
        : 1;


    /* =========================
       ⑤ 우월 코드 계수
       110% + 추가 우월
    ========================= */

    const weakCoef =
        p.weakPointBase + p.weakPointExtra;


    /* =========================
       ⑥ 받는 데미지 계수
       받뎀증 + 분배뎀증 - 받뎀감
    ========================= */

    const takenCoef =
        1 +
        p.enemyTakenUp +
        p.shareDmgUp -
        p.enemyTakenDown;


    /* =========================
       ✅ 최종 데미지
    ========================= */

    return (
        baseDamage *
        baseBonus *
        typeBonus *
        critCoef *
        weakCoef *
        takenCoef
    );
}