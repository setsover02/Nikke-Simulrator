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
    cubeName: string;
    cubeLevel: string;
    /** 호감도 레벨 (1 ~ 40) — 캐릭터별 개별 설정 */
    affinityLevel: string;
    /**
     * 성장 단계 (0=명함, 1~3=1돌~3돌, 4~10=코강1~7)
     * R: 최대 0, SR: 최대 2, SSR: 최대 10
     */
    growthStage: string;
    /** 장비 티어 (4부위): 'none' | 'T1'~'T9' | '기업' | 'Overload' */
    equipTierHead: string;
    equipUpgradeHead: string;
    equipTierTorso: string;
    equipUpgradeTorso: string;
    equipTierArms: string;
    equipUpgradeArms: string;
    equipTierLegs: string;
    equipUpgradeLegs: string;
    equipATK: string;
    equipWeakPoint: string;
    equipAmmo: string;
    equipAccuracy: string;
    equipChargeDmg: string;
    equipChargeSpeed: string;
    equipCritRate: string;
    equipCritDmg: string;
    equipDef: string;
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

/** BuffManager에서 수집한 타임라인 이벤트 */
export interface BuffTimelineEvent {
    uid: number;
    targetId: string;
    casterId: string;
    buffName: string;
    stat: string;
    sourceSkill: string;
    polarity: string;
    value: number;
    startTime: number;
    endTime: number;
    isPermanent: boolean;
}

export interface ScenarioSummary {
    chars: ScenarioResult[];
    teamTotal: number;
    buffTimeline: BuffTimelineEvent[];
    /** charId → charName 맵 (타임라인 차트에서 사용) */
    idToName: Record<string, string>;
}

// --- Simulation Runner 입출력 타입 ---

export interface SimulationInput {
    slots: (SlotState | null)[];
    enemyDef: string;
    fullBurstInterval: string;
    rangeMode: RangeMode;
    weaknessElement: string;
    showCore: boolean;
    coreSize?: number;
}

export interface SkillInfoEntry {
    effects: { trigger?: string; target: string; effect: string; value: string }[];
    duration?: number;
    cooldown?: number;
}

export interface SimulationOutput {
    summary: ScenarioSummary;
    chartDatasets: { label: string; color: string; data: any[] }[];
    dps1sDatasets: { label: string; color: string; data: any[] }[];
    skillChartDatasets: { label: string; color: string; data: any[] }[];
    burstWindows: BurstWindow[];
    skillInfoMap: Record<string, Record<string, SkillInfoEntry>>;
    charIdToName: Record<string, string>;
}
