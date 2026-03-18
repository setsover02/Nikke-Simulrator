// 시뮬레이터 전용 공유 타입

import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';
import { RangeMode } from '../constants/weaponStats';
import { BurstWindow } from '../utils/simUtils';

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
    skill1Level: number;
    skill2Level: number;
    burstLevel: number;
}

export interface HitDamages {
    normal: number;
    crit: number;
    core: number;
    coreCrit: number;
    fbNormal: number;
    fbCrit: number;
    fbCore: number;
    fbCoreCrit: number;
}

export interface ScenarioResult {
    charId: string;
    charName: string;
    totalDmg: number;
    hitDamages: HitDamages;
    buffTimeline: any[];
}

export interface ScenarioSummary {
    chars: ScenarioResult[];
    teamTotal: number;
}

// --- Simulation Runner 입출력 타입 ---

export interface SimulationInput {
    slots: (SlotState | null)[];
    enemyDef: string;
    fullBurstInterval: string;
    rangeMode: RangeMode;
    weaknessElement: string;
    showCore: boolean;
}

export interface SkillInfoEntry {
    effects: { trigger?: string; target: string; effect: string; value: string }[];
    duration?: number;
    cooldown?: number;
}

export interface SimulationOutput {
    summary: ScenarioSummary;
    chartDatasets: { label: string; color: string; data: any[] }[];
    skillChartDatasets: { label: string; color: string; data: any[] }[];
    burstWindows: BurstWindow[];
    skillInfoMap: Record<string, Record<string, SkillInfoEntry>>;
    charIdToName: Record<string, string>;
}
