/* =================================================
   NIKKE Accuracy System
   - Hit Chance Calculation
   - Range / Recoil / Buff Modifier
================================================= */

import { Random } from "./rng";


/* =========================
   무기 타입
========================= */

export enum WeaponType {
    AR = "AR",
    SMG = "SMG",
    SR = "SR",
    SG = "SG",
    MG = "MG",
    RL = "RL"
}


/* =========================
   무기별 기본 명중률
========================= */

export const BASE_ACCURACY: Record<WeaponType, number> = {
    AR: 0.70,   // 돌격소총
    SMG: 0.56,  // 기관단총
    SR: 1.00,   // 저격소총
    SG: 0.60,   // 샷건
    MG: 1.00,   // 기관총
    RL: 1.00    // 로켓런처 (유도/범위)
};


/* =========================
   명중 계산용 컨텍스트
========================= */

export interface AccuracyContext {

    /** 무기 타입 */
    weapon: WeaponType;

    /** 현재 적과의 거리 */
    distance: number;

    /** 연속 사격 횟수 (반동 누적) */
    comboShots: number;

    /** 명중률 버프 (0.2 = +20%) */
    accuracyBuff: number;

    /** 시드 기반 RNG (전역 시뮬레이션 RNG 사용) */
    rng: Random;
}


/* =========================
   거리 보정
========================= */

function getRangeModifier(
    distance: number,
    optimalRange = 25
): number {

    /* 최적 사거리 이내 → 100% */
    if (distance <= optimalRange) return 1;

    /* 초과 거리당 패널티 */
    const penalty = (distance - optimalRange) * 0.015;

    return Math.max(0.4, 1 - penalty);
}


/* =========================
   반동 보정
========================= */

function getRecoilModifier(
    comboShots: number
): number {

    /* 연사할수록 명중 감소 */
    const penalty = comboShots * 0.02;

    return Math.max(0.6, 1 - penalty);
}


/* =========================
   최종 명중률 계산
========================= */

export function calcHitChance(
    ctx: Omit<AccuracyContext, "rng">
): number {

    let chance =
        BASE_ACCURACY[ctx.weapon] *
        getRangeModifier(ctx.distance) *
        getRecoilModifier(ctx.comboShots) *
        (1 + ctx.accuracyBuff);

    /* 0 ~ 1 사이로 제한 */
    return Math.min(1, Math.max(0, chance));
}


/* =========================
   실제 명중 판정 (시드 RNG 사용)
========================= */

export function checkHit(ctx: AccuracyContext): boolean {
    const hitChance = calcHitChance(ctx);
    return ctx.rng.next() < hitChance;
}


/* =========================
   디버그용 출력
========================= */

export function debugAccuracy(
    ctx: Omit<AccuracyContext, "rng">
) {
    const base = BASE_ACCURACY[ctx.weapon];
    const range = getRangeModifier(ctx.distance);
    const recoil = getRecoilModifier(ctx.comboShots);
    const buff = 1 + ctx.accuracyBuff;
    const final = calcHitChance(ctx);

    return { base, range, recoil, buff, final };
}