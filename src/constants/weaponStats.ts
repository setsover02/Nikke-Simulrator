// 무기 종류별 크리티컬/코어히트 보정 배율 테이블
// 최종 데미지 majorModifiers = 1 + (isCrit ? critBonus : 0) + (isCore ? coreHitBonus : 0) + ...

export type RangeMode = 'near' | 'mid' | 'far';

export interface WeaponMultipliers {
    /** 크리티컬 히트 시 가산 값 (일반: 0.5 → ×1.5) */
    critBonus: number;
    /** 코어 히트 시 가산 값 (일반: 1.0 → ×2.0) */
    coreHitBonus: number;
    /** 거리 보너스 수혜 범위 목록 */
    benefitRanges: RangeMode[];
}

/**
 * 무기별 데미지 배율 + 거리 수혜 테이블
 *
 * 거리 보너스(30%) 수혜 무기:
 *   Near  → SG, SMG
 *   Mid   → AR, MG
 *   Far   → SR
 *   RL    → 없음
 */
export const WEAPON_MULTIPLIERS: Record<string, WeaponMultipliers> = {
    SMG: { critBonus: 0.385, coreHitBonus: 1.151, benefitRanges: ['near'] },
    AR: { critBonus: 0.500, coreHitBonus: 1.000, benefitRanges: ['mid'] },
    SR: { critBonus: 0.500, coreHitBonus: 1.000, benefitRanges: ['far'] },
    SG: { critBonus: 0.500, coreHitBonus: 1.000, benefitRanges: ['near'] },
    MG: { critBonus: 0.500, coreHitBonus: 1.000, benefitRanges: ['mid'] },
    RL: { critBonus: 0.500, coreHitBonus: 1.000, benefitRanges: [] },
};

/** 무기 타입으로 배율 조회 (미등록 시 기본값) */
export function getWeaponMultipliers(weapon: string | undefined): WeaponMultipliers {
    if (!weapon) return { critBonus: 0.5, coreHitBonus: 1.0, benefitRanges: [] };
    return WEAPON_MULTIPLIERS[weapon.toUpperCase()] ?? { critBonus: 0.5, coreHitBonus: 1.0, benefitRanges: [] };
}

/**
 * 선택된 교전 거리에 따라 해당 무기의 거리 보너스 반환
 * @returns 0.30 (보너스 있음) 또는 0 (보너스 없음)
 */
export function getWeaponRangeBonus(weapon: string | undefined, rangeMode: RangeMode): number {
    const wm = getWeaponMultipliers(weapon);
    return wm.benefitRanges.includes(rangeMode) ? 0.30 : 0;
}
