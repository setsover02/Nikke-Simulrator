/* =================================================
   NIKKE Accuracy System v2 — Circle-Based Hit Model
   
   탄착점을 명중률 원(accuracyRadius) 내 랜덤 좌표로 뽑고,
   적 히트박스/코어 히트박스와 비교하여 명중 여부를 판정합니다.
   
   - accuracyRadius가 작을수록 코어 히트 확률 ↑
   - 거리(Near/Mid/Far)에 따라 accuracyRadius 변화
   - MG는 warmupLevel에 따라 accuracyRadius가 동적으로 변화
   - SG는 펠릿별로 resolveHit()을 독립 호출
   - SR / RL은 항상 정밀 (hitRadius 내 100% 명중)
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
    /** 적 히트박스에 명중했는가 (SG는 빗나감 포함) */
    hit: boolean;
    /** 코어 히트박스에 명중했는가 */
    isCore: boolean;
}


/* =========================
   무기별 AccuracyCircle 설정
   (리서치 후 조정 필요한 임의 초기값)

   accuracyRadius : 탄착 분산 원의 반지름 [Near, Mid, Far]
   hitRadius      : 적 히트박스 반지름 (SG만 빗나감 판정에 사용)
   coreRadius     : 코어 히트박스 반지름
========================= */

export interface AccuracyCircle {
    /** [Near, Mid, Far] 거리별 기본 분산 반지름 */
    accuracyRadius: [number, number, number];
    /** 적 본체 히트박스 반지름 */
    hitRadius: number;
    /** 코어 히트박스 반지름 */
    coreRadius: number;
}

export const WEAPON_ACCURACY_CIRCLES: Record<WeaponType, AccuracyCircle> = {
    //                       Near    Mid    Far
    AR: { accuracyRadius: [0.50, 0.80, 1.20], hitRadius: 1.0, coreRadius: 0.20 },
    SMG: { accuracyRadius: [0.70, 1.10, 1.60], hitRadius: 1.0, coreRadius: 0.15 },
    SR: { accuracyRadius: [0.10, 0.10, 0.10], hitRadius: 1.0, coreRadius: 0.30 }, // 항상 정밀
    SG: { accuracyRadius: [0.80, 1.40, 2.20], hitRadius: 1.0, coreRadius: 0.25 }, // 펠릿 분산
    MG: { accuracyRadius: [0.80, 0.80, 1.00], hitRadius: 1.0, coreRadius: 0.20 }, // warmup으로 동적 변화
    RL: { accuracyRadius: [0.10, 0.10, 0.10], hitRadius: 1.0, coreRadius: 0.30 }, // 항상 정밀
};

/** RangeMode → 배열 인덱스 */
const RANGE_IDX: Record<RangeMode, 0 | 1 | 2> = {
    near: 0,
    mid: 1,
    far: 2,
};


/* =========================
   원 내부 랜덤 좌표 샘플링
   균등 분포를 위해 r = R * sqrt(u) 사용
========================= */

function randomInCircle(rng: Random, radius: number): { x: number; y: number } {
    const r = radius * Math.sqrt(rng.next());
    const theta = rng.next() * 2 * Math.PI;
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}


/* =========================
   명중 판정 — Circle 기반 (v2 메인 함수)
========================= */

export interface ResolveHitParams {
    weapon: WeaponType;
    rangeMode: RangeMode;
    /** 명중률 버프 (positive = 원 축소, negative = 원 확대) */
    accuracyBuff: number;
    /** MG warmup override: 0~1, 0이면 최대 분산원, 1이면 최소 분산원 */
    warmupLevel?: number;
    rng: Random;
    /** 코어 히트 판정 포함 여부 (coreDamage > 0인 경우 true) */
    hasCore: boolean;
}

export function resolveHit(params: ResolveHitParams): HitResult {
    const { weapon, rangeMode, accuracyBuff, warmupLevel, rng, hasCore } = params;
    const circle = WEAPON_ACCURACY_CIRCLES[weapon];
    const rIdx = RANGE_IDX[rangeMode];

    // 기본 분산 반지름
    let accRadius = circle.accuracyRadius[rIdx];

    // MG: warmupLevel로 분산 원 크기 동적 조정 (0 → maxRadius, 1 → minRadius)
    if (weapon === WeaponType.MG && warmupLevel !== undefined) {
        // warmup=0 일 때 Far 거리만큼 크게, warmup=1 일 때 Near 기본값
        const maxR = circle.accuracyRadius[2]; // Far = 가장 큰 분산
        const minR = circle.accuracyRadius[0]; // Near = 가장 작은 분산
        accRadius = lerp(maxR, minR, warmupLevel);
    }

    // 명중률 버프 적용: buff > 0이면 원 축소 (정밀도 향상), buff < 0이면 원 확대
    // accuracyBuff = 0.2 (+20% 정밀) → 반지름을 20% 감소
    accRadius = accRadius * Math.max(0.1, 1 - accuracyBuff);

    // SR/RL은 항상 정밀 → 히트박스 내 확정 명중 (분산 원이 이미 매우 작음)
    // SG는 빗나감 판정 포함
    const isSG = weapon === WeaponType.SG;

    // 탄착점 샘플링
    const p = randomInCircle(rng, accRadius);
    const dist2 = p.x * p.x + p.y * p.y;

    // 코어 히트 판정
    if (hasCore) {
        const core2 = circle.coreRadius * circle.coreRadius;
        if (dist2 <= core2) {
            return { hit: true, isCore: true };
        }
    }

    // 일반 히트 판정 (SG는 hitRadius 판정, 나머지는 항상 hit)
    if (isSG) {
        const hit2 = circle.hitRadius * circle.hitRadius;
        const hit = dist2 <= hit2;
        return { hit, isCore: false };
    }

    // AR / SMG / MG / SR / RL: 빗나감 없음 (battle_accuray.md 구현 계획)
    return { hit: true, isCore: false };
}


/* =========================
   선형 보간 유틸
========================= */

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}


/* =========================
   하위 호환 유지 (deprecated)
   기존 checkHit 방식 — SG 외에는 사용하지 않는 것을 권장
========================= */

/** @deprecated resolveHit() 사용을 권장합니다 */
export const BASE_ACCURACY: Record<WeaponType, number> = {
    AR: 0.65,
    SMG: 0.50,
    SR: 1.00,
    SG: 0.30,
    MG: 1.00,
    RL: 1.00,
};

export interface AccuracyContext {
    weapon: WeaponType;
    distance: number;
    comboShots: number;
    accuracyBuff: number;
    rng: Random;
}

/** @deprecated resolveHit() 사용을 권장합니다 */
export function calcHitChance(ctx: Omit<AccuracyContext, "rng">): number {
    const base = BASE_ACCURACY[ctx.weapon];
    return Math.min(1, Math.max(0, base * (1 + ctx.accuracyBuff)));
}

/** @deprecated resolveHit() 사용을 권장합니다 */
export function checkHit(ctx: AccuracyContext): boolean {
    return ctx.rng.next() < calcHitChance(ctx);
}

/** 디버그용 */
export function debugAccuracy(
    weapon: WeaponType,
    rangeMode: RangeMode,
    accuracyBuff = 0,
    warmupLevel?: number
) {
    const circle = WEAPON_ACCURACY_CIRCLES[weapon];
    const rIdx = RANGE_IDX[rangeMode];
    let accRadius = circle.accuracyRadius[rIdx];

    if (weapon === WeaponType.MG && warmupLevel !== undefined) {
        const maxR = circle.accuracyRadius[2];
        const minR = circle.accuracyRadius[0];
        accRadius = maxR + (minR - maxR) * Math.min(1, Math.max(0, warmupLevel));
    }
    accRadius = accRadius * Math.max(0.1, 1 - accuracyBuff);

    const coreChance = (circle.coreRadius * circle.coreRadius) / (accRadius * accRadius);
    const hitChance = weapon === WeaponType.SG
        ? (circle.hitRadius * circle.hitRadius) / (accRadius * accRadius)
        : 1.0;

    return {
        weapon, rangeMode, accRadius,
        hitRadius: circle.hitRadius,
        coreRadius: circle.coreRadius,
        estimatedCoreChance: Math.min(1, coreChance),
        estimatedHitChance: Math.min(1, hitChance),
    };
}