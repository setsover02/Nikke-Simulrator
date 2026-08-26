/* =================================================
   NIKKE Accuracy System — Power-Law Core Hit Model
   
   calc-master (accuracy_analysis.py / DATA_VERIFY.md) 기반
   명중률 → 탄착군 직경(D) → 거듭제곱(n=2.55) 코어히트율 모델
   
   D(px) = max(1.0, base_diameter - acc_slope * accuracy_pct)
   R   = D / 2
   r_c = core_px / 2
   P_core = min(1.0, (r_c / R) ** 2.55)
================================================= */

import { Random } from "./rng";
import { RangeMode } from "../constants/weaponStats";

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
   명중 결과 타입
========================= */

export interface HitResult {
    /** 적 히트박스에 명중했는가 (SG는 빗나감 판정 포함) */
    hit: boolean;
    /** 코어 히트박스에 명중했는가 */
    isCore: boolean;
    /** 계산된 코어히트 확률 (0.0 ~ 1.0) */
    coreProb?: number;
}

/* =========================
   탄착군 직경 공식 상수 (calc-master 정본)
   D = base - slope * accuracy_pct
========================= */

export interface AccuracyFormula {
    base: number;
    slope: number;
}

export const ACCURACY_PX_FORMULA: Record<WeaponType | string, AccuracyFormula> = {
    SG:  { base: 240.0, slope: 2.18 },
    AR:  { base: 76.0,  slope: 0.69 },
    SMG: { base: 110.0, slope: 1.00 },
    MG:  { base: 10.0,  slope: 0.00 }, // 기본 정밀 (10px 고정)
    SR:  { base: 10.0,  slope: 0.00 }, // 항상 정밀 (10px 고정)
    RL:  { base: 10.0,  slope: 0.00 }, // 항상 정밀 (10px 고정)
};

/** 거듭제곱 코어히트 모델 지수 (calc-master 정본 n = 2.55) */
export const MODEL_N = 2.55;

/** 기본 코어 직경(px) — 블스/중거리 기준 r_c = 26px -> core_px = 52px */
export const DEFAULT_CORE_PX = 52.0;

/** 적 기본 바디 히트박스 직경(px) — SG 빗나감 판정용 */
export const DEFAULT_BODY_PX = 240.0;

/* =========================
   탄착군 직경 계산 D(px)
========================= */

export function calcSpreadDiameter(weapon: WeaponType | string, accuracyPct: number): number {
    const spec = ACCURACY_PX_FORMULA[weapon] || ACCURACY_PX_FORMULA.AR;
    return Math.max(1.0, spec.base - spec.slope * accuracyPct);
}

/* =========================
   코어히트 확률 P_core 계산
========================= */

export function calcCoreHitProb(
    weapon: WeaponType | string,
    accuracyPct: number,
    hasCore: boolean,
    corePx: number = DEFAULT_CORE_PX
): number {
    if (!hasCore || corePx <= 0) return 0;

    const D = calcSpreadDiameter(weapon, accuracyPct);
    const R = D / 2.0;
    const r_c = corePx / 2.0;

    if (r_c >= R) return 1.0;
    return Math.min(1.0, Math.pow(r_c / R, MODEL_N));
}

/* =========================
   명중 판정 파라미터 및 메인 함수
========================= */

export interface ResolveHitParams {
    weapon: WeaponType | string;
    rangeMode?: RangeMode;
    /** 명중률 버프 합산 (백분율, 예: 20 = +20%) */
    accuracyBuff: number;
    warmupLevel?: number;
    rng: Random;
    /** 코어 히트 판정 활성 여부 */
    hasCore: boolean;
    /** 코어 직경 (px, 기본 52px) */
    corePx?: number;
}

export function resolveHit(params: ResolveHitParams): HitResult {
    const { weapon, accuracyBuff, hasCore, corePx = DEFAULT_CORE_PX, rng } = params;

    // 코어히트 확률 산출
    const coreProb = calcCoreHitProb(weapon, accuracyBuff, hasCore, corePx);
    const isCore = coreProb > 0 && rng.next() < coreProb;

    // SG의 경우 탄착군 분산이 적 본체(body_px)보다 크면 빗나감 가능
    let hit = true;
    if (weapon === WeaponType.SG) {
        const D = calcSpreadDiameter(weapon, accuracyBuff);
        const hitProb = Math.min(1.0, Math.pow(DEFAULT_BODY_PX / D, 2.0));
        hit = rng.next() < hitProb;
    }

    // 코어에 맞았으면 당연히 명중
    if (isCore) {
        return { hit: true, isCore: true, coreProb };
    }

    return { hit, isCore: false, coreProb };
}

/* =========================
   디버그 / 통계 조회 유틸
========================= */

export function getAccuracyStats(
    weapon: WeaponType | string,
    accuracyPct: number,
    hasCore: boolean = true,
    corePx: number = DEFAULT_CORE_PX
) {
    const diameter = calcSpreadDiameter(weapon, accuracyPct);
    const coreProb = calcCoreHitProb(weapon, accuracyPct, hasCore, corePx);
    const hitProb = weapon === WeaponType.SG ? Math.min(1.0, Math.pow(DEFAULT_BODY_PX / diameter, 2.0)) : 1.0;

    return {
        weapon,
        accuracyPct,
        diameterPx: diameter,
        coreHitRate: coreProb,
        hitRate: hitProb,
    };
}