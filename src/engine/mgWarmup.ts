// engine/mgWarmup.ts
// MG 무기 예열(WarmUp) 시스템 — 시간 기반 가열 / 냉각
// weapon.md 스펙:
//   사격 중:     state += dt / heatUpTime   (2.5s)
//   사격 중지:   state -= dt / coolDownTime (2.5s)
//   state 범위:  clamp(0, 1)

/* =========================
   상수
========================= */

/** 예열 완료까지 걸리는 시간 (초) */
export const WARMUP_DURATION_SECS = 2.5;

/** 완전 냉각까지 걸리는 시간 (초) */
export const COOLDOWN_DURATION_SECS = 2.5;

/** 예열 시작 시 최소 공격속도 비율 */
const MIN_FIRE_RATE_RATIO = 0.1;

/* =========================
   WarmUp 레벨 업데이트 — 시간 기반
========================= */

/**
 * 사격 중: dt / heatUpTime 만큼 예열 레벨 증가.
 * 2.5초 만에 0 → 1 완료.
 *
 * @param currentLevel 현재 예열 레벨 (0~1)
 * @param dt           경과 시간 (초)
 * @param heatUpTime   예열 완료 시간 (초, 기본 2.5)
 */
export function heatWarmupByTime(
    currentLevel: number,
    dt: number,
    heatUpTime: number = WARMUP_DURATION_SECS
): number {
    return Math.min(1, currentLevel + dt / heatUpTime);
}

/**
 * 사격 중지 시(재장전 포함): 시간 기반 냉각.
 * 2.5초에 걸쳐 warmupLevel 1 → 0.
 * 부분 냉각 지원: 재사격 시 냉각된 만큼만 감소.
 *
 * @param currentLevel 현재 예열 레벨 (0~1)
 * @param dt           경과 시간 (초)
 * @param coolDownTime 냉각 완료 시간 (초, 기본 2.5)
 */
export function coolWarmupLevel(
    currentLevel: number,
    dt: number,
    coolDownTime: number = COOLDOWN_DURATION_SECS
): number {
    return Math.max(0, currentLevel - dt / coolDownTime);
}

/* =========================
   Fire Rate 보정
========================= */

/**
 * warmupLevel에 따른 실효 발사 속도.
 * warmup=0 → baseFireRate × MIN_FIRE_RATE_RATIO (10%)
 * warmup=1 → baseFireRate × 1.0 (100%)
 */
export function getMgFireRate(baseFireRate: number, warmupLevel: number): number {
    return baseFireRate * lerp(MIN_FIRE_RATE_RATIO, 1.0, warmupLevel);
}

/* =========================
   선형 보간 유틸
========================= */

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.min(1, Math.max(0, t));
}

/* =========================
   하위 호환 유지 (deprecated)
========================= */

/** @deprecated heatWarmupByTime() 사용 권장 */
export const WARMUP_BULLETS = 52;

/** @deprecated heatWarmupByTime() 사용 권장 */
export function heatWarmupByBullets(currentLevel: number, bulletsShot: number): number {
    if (bulletsShot <= 0) return currentLevel;
    return Math.min(1, currentLevel + bulletsShot / WARMUP_BULLETS);
}

/** @deprecated accuraySystem.ts의 resolveHit()에서 warmupLevel로 직접 처리 */
export function getMgAccuracy(warmupLevel: number): number {
    return lerp(0.1, 1.0, warmupLevel);
}
