// engine/mgWarmup.ts
// MG 무기 예열(warm-up) 시스템 — 시간 기반
// 발사 중: warmupLevel이 0→1로 상승 (약 2초)
// 미발사 시 (재장전 포함): warmupLevel이 점진적으로 냉각

/* =========================
   상수
========================= */

/** 예열 완료까지 소요 시간 (초) */
export const WARMUP_DURATION = 3.0;

/** 완전 냉각까지 소요 시간 (초) */
export const COOLDOWN_DURATION = 3.0;

/** 예열 시작 시 최소 공격속도 비율 (30%) */
const MIN_FIRE_RATE_RATIO = 0.3;

/** 예열 시작 시 최소 명중률 (20%) */
const MIN_ACCURACY = 0.2;

/* =========================
   Warm-up Level 업데이트
========================= */

/**
 * 매 tick마다 호출하여 warmupLevel을 갱신.
 * - isFiring=true  → warmupLevel 증가 (WARMUP_DURATION초에 걸쳐 0→1)
 * - isFiring=false → warmupLevel 감소 (COOLDOWN_DURATION초에 걸쳐 1→0)
 *
 * 재장전이 빠르면 냉각이 적어 예열을 유지할 수 있음.
 */
export function updateWarmupLevel(
    currentLevel: number,
    dt: number,
    isFiring: boolean
): number {
    if (isFiring) {
        // 가열: dt / WARMUP_DURATION 만큼 증가
        const increase = dt / WARMUP_DURATION;
        return Math.min(1, currentLevel + increase);
    } else {
        // 냉각: dt / COOLDOWN_DURATION 만큼 감소
        const decrease = dt / COOLDOWN_DURATION;
        return Math.max(0, currentLevel - decrease);
    }
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
