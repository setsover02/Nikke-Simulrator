export type CollectionGrade = 'None' | 'R' | 'SR';

export interface CollectionEffect {
    normalAtkMultiplier: number; // 일반 공격 대미지 배율 증가 (%)
    defenseMultiplier: number;   // 방어력 증가 (%)
}

// SG, SMG 전용 소장품 효과
export const SG_SMG_COLLECTION_EFFECTS: Record<CollectionGrade, (level: number) => CollectionEffect> = {
    None: () => ({ normalAtkMultiplier: 0, defenseMultiplier: 0 }),
    R: (level: number) => {
        if (level >= 0 && level <= 10) {
            return { normalAtkMultiplier: 1.57, defenseMultiplier: 25 };
        } else if (level >= 11 && level <= 15) {
            return { normalAtkMultiplier: 3.0, defenseMultiplier: 29 };
        }
        return { normalAtkMultiplier: 0, defenseMultiplier: 0 };
    },
    SR: (level: number) => {
        if (level >= 0 && level <= 5) {
            return { normalAtkMultiplier: 3.0, defenseMultiplier: 29 };
        } else if (level >= 6 && level <= 10) {
            return { normalAtkMultiplier: 6.0, defenseMultiplier: 33 };
        } else if (level >= 11 && level <= 15) {
            return { normalAtkMultiplier: 9.64, defenseMultiplier: 37 };
        }
        return { normalAtkMultiplier: 0, defenseMultiplier: 0 };
    }
};

export const getCollectionEffect = (
    weapon: string,
    grade: CollectionGrade,
    level: number
): CollectionEffect => {
    // 현재는 SG, SMG 무기만 적용
    if (weapon === 'SG' || weapon === 'SMG') {
        const effectFn = SG_SMG_COLLECTION_EFFECTS[grade];
        if (effectFn) {
            return effectFn(level);
        }
    }
    return { normalAtkMultiplier: 0, defenseMultiplier: 0 };
};
