export type CollectionGrade = 'None' | 'R' | 'SR' | 'SSR';

export interface CollectionEffect {
    normalAtkMultiplier: number; // SMG, SG: 일반 공격 대미지 배율 증가 (%)
    defenseMultiplier: number;   // 방어력 증가 (%)
    chargeDmgMultiplier: number; // RL, SR: 차지 대미지 배율 증가 (%)
    coreHitMultiplier: number;   // AR: 코어 대미지 배율 증가 (%)
    maxAmmoMultiplier: number;   // MG: 최대 장탄수 증가 (%)
}

const emptyEffect = (): CollectionEffect => ({
    normalAtkMultiplier: 0,
    defenseMultiplier: 0,
    chargeDmgMultiplier: 0,
    coreHitMultiplier: 0,
    maxAmmoMultiplier: 0,
});

export const getCollectionEffect = (
    weapon: string,
    grade: CollectionGrade,
    level: number
): CollectionEffect => {
    const effect = emptyEffect();
    if (grade === 'None') return effect;

    // R 등급
    if (grade === 'R') {
        const isLvl0to4 = level >= 0 && level <= 4;
        const isLvl5to9 = level >= 5 && level <= 9;
        const isLvl10to14 = level >= 10 && level <= 14;
        const isLvl15 = level >= 15;

        if (isLvl0to4) effect.defenseMultiplier = 25;
        else if (isLvl5to9) effect.defenseMultiplier = 28;
        else if (isLvl10to14) effect.defenseMultiplier = 30;
        else if (isLvl15) effect.defenseMultiplier = 32;

        if (weapon === 'RL' || weapon === 'SR') {
            if (isLvl0to4) effect.chargeDmgMultiplier = 1.58;
            else if (isLvl5to9) effect.chargeDmgMultiplier = 3.13;
            else if (isLvl10to14) effect.chargeDmgMultiplier = 4.72;
            else if (isLvl15) effect.chargeDmgMultiplier = 6.31;
        } else if (weapon === 'SMG' || weapon === 'SG') {
            if (isLvl0to4) effect.normalAtkMultiplier = 1.57;
            else if (isLvl5to9) effect.normalAtkMultiplier = 3.15;
            else if (isLvl10to14) effect.normalAtkMultiplier = 4.73;
            else if (isLvl15) effect.normalAtkMultiplier = 6.30;
        } else if (weapon === 'AR') {
            if (isLvl0to4) effect.coreHitMultiplier = 5.67;
            else if (isLvl5to9) effect.coreHitMultiplier = 7.94;
            else if (isLvl10to14) effect.coreHitMultiplier = 10.21;
            else if (isLvl15) effect.coreHitMultiplier = 12.49;
        } else if (weapon === 'MG') {
            if (isLvl0to4) effect.maxAmmoMultiplier = 1.56;
            else if (isLvl5to9) effect.maxAmmoMultiplier = 3.15;
            else if (isLvl10to14) effect.maxAmmoMultiplier = 4.73;
            else if (isLvl15) effect.maxAmmoMultiplier = 6.32;
        }
    }
    // SR 등급 (또는 SSR, SSR은 내부적으로 SR 15레벨 취급)
    else if (grade === 'SR' || grade === 'SSR') {
        // SSR은 항상 15레벨 취급
        const effectiveLevel = grade === 'SSR' ? 15 : level;
        const isLvl0to4 = effectiveLevel >= 0 && effectiveLevel <= 4;
        const isLvl5to9 = effectiveLevel >= 5 && effectiveLevel <= 9;
        const isLvl10to14 = effectiveLevel >= 10 && effectiveLevel <= 14;
        const isLvl15 = effectiveLevel >= 15;

        if (isLvl0to4) effect.defenseMultiplier = 30;
        else if (isLvl5to9) effect.defenseMultiplier = 32;
        else if (isLvl10to14) effect.defenseMultiplier = 34;
        else if (isLvl15) effect.defenseMultiplier = 37;

        if (weapon === 'RL' || weapon === 'SR') {
            if (isLvl0to4) effect.chargeDmgMultiplier = 4.74;
            else if (isLvl5to9) effect.chargeDmgMultiplier = 6.31;
            else if (isLvl10to14) effect.chargeDmgMultiplier = 7.89;
            else if (isLvl15) effect.chargeDmgMultiplier = 9.47;
        } else if (weapon === 'SMG' || weapon === 'SG') {
            if (isLvl0to4) effect.normalAtkMultiplier = 4.73;
            else if (isLvl5to9) effect.normalAtkMultiplier = 6.30;
            else if (isLvl10to14) effect.normalAtkMultiplier = 7.88;
            else if (isLvl15) effect.normalAtkMultiplier = 9.46;
        } else if (weapon === 'AR') {
            if (isLvl0to4) effect.coreHitMultiplier = 5.67;
            else if (isLvl5to9) effect.coreHitMultiplier = 12.49;
            else if (isLvl10to14) effect.coreHitMultiplier = 13.25;
            else if (isLvl15) effect.coreHitMultiplier = 17.04;
        } else if (weapon === 'MG') {
            if (isLvl0to4) effect.maxAmmoMultiplier = 4.74;
            else if (isLvl5to9) effect.maxAmmoMultiplier = 6.32;
            else if (isLvl10to14) effect.maxAmmoMultiplier = 7.91;
            else if (isLvl15) effect.maxAmmoMultiplier = 9.50;
        }
    }

    return effect;
};
