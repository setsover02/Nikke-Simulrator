// 시뮬레이터 전용 공유 타입

import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';

export interface SlotState {
    char: typeof characterOptions[0];
    customHP: string;
    customATK: string;
    customDEF: string;
    collectionGrade: CollectionGrade;
    collectionLevel: string;
    equipATK: string;
    equipWeakPoint: string;
    equipAmmo: string;
}

export interface HitDamages {
    normal: number;
    crit: number;
    core: number;
    coreCrit: number;
}

export interface ScenarioResult {
    charId: string;
    charName: string;
    totalDmg: number;
    hitDamages: HitDamages;
}

export interface ScenarioSummary {
    chars: ScenarioResult[];
    teamTotal: number;
}

export interface SimResult {
    noCore: ScenarioSummary;
    withCore: ScenarioSummary;
}
