import { SlotState } from '../types/simulator';
import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';

const STORAGE_KEY = 'nikke_sim_chars';

export type SavedCharState = Omit<SlotState, 'char'>;

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
        return {
            char: charOption,
            ...saved
        };
    }

    return {
        char: charOption,
        customHP: String(stats.hp || ''),
        customATK: String(stats.atk || ''),
        customDEF: String(stats.defense || ''),
        collectionGrade: 'None',
        collectionLevel: '0',
        equipATK: '0',
        equipWeakPoint: '0',
        equipAmmo: '0',
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10
    };
}
