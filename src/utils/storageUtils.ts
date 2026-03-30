import { SlotState } from '../types/simulator';
import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';

const STORAGE_KEY = 'nikke_sim_chars';
const TEAM_LAYOUT_KEY = 'nikke_sim_team_layout';
const CUBE_STORAGE_KEY = 'nikke_sim_cubes';

export type SavedCharState = Omit<SlotState, 'char'>;

export function loadGlobalCubeLevels(): Record<string, string> {
    try {
        const stored = localStorage.getItem(CUBE_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {}
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
