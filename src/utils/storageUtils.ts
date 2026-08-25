import { SlotState } from '../types/simulator';
import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';

const STORAGE_KEY = 'nikke_sim_chars';
const TEAM_LAYOUT_KEY = 'nikke_sim_team_layout';
const CUBE_STORAGE_KEY = 'nikke_sim_cubes';
const OUTPOST_KEY = 'nikke_sim_outpost';

export interface SavedOutpostState {
    synchroLevel: string;
    commonResearchLevel: string;
    elysionConsole: string;
    missilisConsole: string;
    tetraConsole: string;
    pilgrimConsole: string;
    abnormalConsole: string;
    attackerConsole: string;
    defenderConsole: string;
    supporterConsole: string;
}

export type SavedCharState = Omit<SlotState, 'char'> & {
    owned?: boolean;
    limitBreak?: string;
};

export function loadGlobalCubeLevels(): Record<string, string> {
    try {
        const stored = localStorage.getItem(CUBE_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { }
    return {};
}

export function saveGlobalCubeLevel(cubeName: string, level: string) {
    if (!cubeName || cubeName === 'None') return;
    const cubes = loadGlobalCubeLevels();
    cubes[cubeName] = level;
    localStorage.setItem(CUBE_STORAGE_KEY, JSON.stringify(cubes));
}

export function getGlobalCubeLevel(cubeName: string): string | null {
    if (!cubeName || cubeName === 'None') return null;
    return loadGlobalCubeLevels()[cubeName] || null;
}

export function loadOutpostState(): SavedOutpostState {
    try {
        const stored = localStorage.getItem(OUTPOST_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load outpost settings from localStorage', e);
    }
    return {
        synchroLevel: '',
        commonResearchLevel: '',
        elysionConsole: '',
        missilisConsole: '',
        tetraConsole: '',
        pilgrimConsole: '',
        abnormalConsole: '',
        attackerConsole: '',
        defenderConsole: '',
        supporterConsole: ''
    };
}

export function saveOutpostState(state: SavedOutpostState) {
    try {
        localStorage.setItem(OUTPOST_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save outpost settings to localStorage', e);
    }
}

export function loadAllCharSettings(): Record<string, SavedCharState> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load character settings from localStorage', e);
    }
    return {};
}

export function saveCharSettings(charId: string, state: SavedCharState) {
    try {
        const allSettings = loadAllCharSettings();
        allSettings[charId] = state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
    } catch (e) {
        console.error('Failed to save character settings to localStorage', e);
    }
}

export function getCharDefaultState(charOption: typeof characterOptions[0]): SlotState {
    const charId = charOption.data.characterID;
    const stats = charOption.data.stats;
    const allSettings = loadAllCharSettings();
    const saved = allSettings[charId];

    if (saved) {
        // If a cube is equipped, sync its level from the global store, otherwise fallback to the saved char slot level.
        const cubeLevel = (saved.cubeName && saved.cubeName !== 'None')
            ? (getGlobalCubeLevel(saved.cubeName) || saved.cubeLevel || '1')
            : '0';

        return {
            char: charOption,
            ...saved,
            cubeLevel
        };
    }

    return {
        char: charOption,
        customHP: String(stats.hp || ''),
        customATK: String(stats.atk || ''),
        customDEF: String(stats.defense || ''),
        collectionGrade: 'None',
        collectionLevel: '0',
        cubeName: 'None',
        cubeLevel: '0',
        affinityLevel: '1',
        growthStage: (() => {
            const rarity = charOption.data.stats?.rarity;
            if (rarity === 'R') return '0';
            if (rarity === 'SR') return '2';
            return '3'; // SSR default: 3돌
        })(),
        equipTierHead: 'none',
        equipUpgradeHead: '0',
        equipTierTorso: 'none',
        equipUpgradeTorso: '0',
        equipTierArms: 'none',
        equipUpgradeArms: '0',
        equipTierLegs: 'none',
        equipUpgradeLegs: '0',
        equipATK: '0',
        equipWeakPoint: '0',
        equipAmmo: '0',
        equipAccuracy: '0',
        equipChargeDmg: '0',
        equipChargeSpeed: '0',
        equipCritRate: '0',
        equipCritDmg: '0',
        equipDef: '0',
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10
    };
}

export function loadTeamLayout(): (string | null)[] {
    try {
        const stored = localStorage.getItem(TEAM_LAYOUT_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load team layout', e);
    }
    // 기본값: 첫 4명, 마지막 빈칸 (Home.tsx 기존 로직과 동일)
    return [
        characterOptions[0].data.characterID,
        characterOptions[1].data.characterID,
        characterOptions[2].data.characterID,
        characterOptions[3].data.characterID,
        null
    ];
}

export function saveTeamLayout(teamIds: (string | null)[]) {
    try {
        localStorage.setItem(TEAM_LAYOUT_KEY, JSON.stringify(teamIds));
    } catch (e) {
        console.error('Failed to save team layout', e);
    }
}

// -------------------------
// Target Settings (SimToolbar)
// -------------------------
const TARGET_SETTINGS_KEY = 'nikke_sim_target';

export interface SavedTargetSettings {
    fullBurstInterval: string;
    showCore: boolean;
    rangeMode: number;
    weaknessElement: string;
    enemyDef: string;
}

const DEFAULT_TARGET_SETTINGS: SavedTargetSettings = {
    fullBurstInterval: '3',
    showCore: true,
    rangeMode: 35,
    weaknessElement: '풍압',
    enemyDef: '100',
};

export function loadTargetSettings(): SavedTargetSettings {
    try {
        const stored = localStorage.getItem(TARGET_SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_TARGET_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load target settings from localStorage', e);
    }
    return { ...DEFAULT_TARGET_SETTINGS };
}

export function saveTargetSettings(settings: SavedTargetSettings) {
    try {
        localStorage.setItem(TARGET_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save target settings to localStorage', e);
    }
}
