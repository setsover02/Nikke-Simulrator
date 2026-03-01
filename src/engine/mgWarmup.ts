// engine/mgWarmup.ts
// MG 무기 예열(warm-up) 시스템 — 탄환 기반 가열 / 시간 기반 냉각
// 발사: 26발 소모 시 warmupLevel 0→1 완료
// 미발사(재장전 포함): 시간이 지남에 따라 점진적 냉각

/* =========================
   상수
========================= */

/** 예열 완료까지 소요되는 탄환 수 */
export const WARMUP_BULLETS = 52;

/** 예열 완료 예상 시간 (참고용, 2.5초) */
export const WARMUP_DURATION_SECS = 2.5;

/** 완전 냉각까지 소요 시간 (초) */
export const COOLDOWN_DURATION = 3.0;

/** 예열 시작 시 최소 공격속도 비율 (30%) */
const MIN_FIRE_RATE_RATIO = 0.1;

/** 예열 시작 시 최소 명중률 (20%) */
const MIN_ACCURACY = 0.1;

/* =========================
   Warm-up Level 업데이트
========================= */

/**
 * 발사 시: 1발당 예열 레벨 1/WARMUP_BULLETS 증가.
 * 26발 소모 시 warmupLevel=1 (예열 완료).
 *
 * @param currentLevel 현재 예열 레벨 (0~1)
 * @param bulletsShot  이번 tick에 발사한 탄환 수
 */
export function heatWarmupByBullets(currentLevel: number, bulletsShot: number): number {
    if (bulletsShot <= 0) return currentLevel;
    const increase = bulletsShot / WARMUP_BULLETS;
    return Math.min(1, currentLevel + increase);
}

/**
 * 미발사 시(재장전 등): 시간 기반 냉각.
 * COOLDOWN_DURATION초에 걸쳐 warmupLevel 1→0.
 *
 * @param currentLevel 현재 예열 레벨 (0~1)
 * @param dt           경과 시간 (초)
 */
export function coolWarmupLevel(currentLevel: number, dt: number): number {
    const decrease = dt / COOLDOWN_DURATION;
    return Math.max(0, currentLevel - decrease);
}

/* =========================
   Fire Rate 보정
========================= */

/**
 * warmupLevel에 따른 실효 발사 속도.
 * 최소 30% 속도에서 시작하여 예열 완료 시 100%.
 */
export function getMgFireRate(baseFireRate: number, warmupLevel: number): number {
    return baseFireRate * (MIN_FIRE_RATE_RATIO + (1 - MIN_FIRE_RATE_RATIO) * warmupLevel);
}

/* =========================
   Accuracy 보정
========================= */

/**
 * warmupLevel에 따른 실효 명중률.
 * 최소 20% 명중률에서 시작하여 예열 완료 시 100%.
 */
export function getMgAccuracy(warmupLevel: number): number {
    return MIN_ACCURACY + (1 - MIN_ACCURACY) * warmupLevel;
}
