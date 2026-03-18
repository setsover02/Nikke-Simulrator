import { simulateBattle } from '../../engine/battleEngine';
import { SLOT_COLORS } from '../../constants/characters';
import { RangeMode, getWeaponRangeBonus } from '../../constants/weaponStats';
import { Team, SimConfig, BattleResult } from '../../types/battle';
import { SlotState, ScenarioSummary } from '../../types/simulator';
import { applyBaseStats, EquipmentOptions, checkAdvantage } from '../../utils/charUtils';
import { BurstWindow, calcHitDamages, generateBurstWindows, generateChartData, generateScatterData } from '../../utils/simUtils';

const DAMAGE_TYPES = new Set(['attack', 'skill_damage']);
const SKILL_DAMAGE_TYPES = new Set(['skill_damage']);
const DEFAULT_SKILL_LEVEL = 10;
const SIM_DURATION = 180;
const SIM_TICK = 1 / 60;
const SIM_SEED = 42;
const FULL_BURST_DURATION = 10;

export interface SimulationSettings {
    enemyDef: string;
    fullBurstInterval: string;
    rangeMode: RangeMode;
    weaknessElement: string;
    showCore: boolean;
}

export interface SimulationDataset {
    label: string;
    color: string;
    data: any[];
}

export interface SkillInfoEffect {
    trigger?: string;
    target: string;
    effect: string;
    value: string;
}

export interface SkillInfoEntry {
    effects: SkillInfoEffect[];
    duration?: number;
    cooldown?: number;
}

export interface SimulationViewModel {
    summary: ScenarioSummary;
    totalChartDatasets: SimulationDataset[];
    skillChartDatasets: SimulationDataset[];
    burstWindows: BurstWindow[];
    skillInfoMap: Record<string, Record<string, SkillInfoEntry>>;
    charIdToName: Record<string, string>;
}


function getSkillLevels(slot: SlotState) {
    return {
        skill1Level: slot.skill1Level || DEFAULT_SKILL_LEVEL,
        skill2Level: slot.skill2Level || DEFAULT_SKILL_LEVEL,
        burstLevelSkill: slot.burstLevel || DEFAULT_SKILL_LEVEL,
    };
}

function buildSimulationConfig(fullBurstInterval: string, rangeMode: RangeMode): SimConfig {
    const parsedBurstInterval = parseFloat(fullBurstInterval);
    const burstGaugeDelay = Number.isFinite(parsedBurstInterval) && parsedBurstInterval >= 0
        ? parsedBurstInterval
        : 0;

    return {
        duration: SIM_DURATION,
        tick: SIM_TICK,
        seed: SIM_SEED,
        fullBurstDuration: FULL_BURST_DURATION,
        burstGaugeDelay,
        rangeMode,
    };
}

function buildEnemy(enemyDef: string, weaknessElement: string) {
    return {
        hp: 1_000_000_000,
        defense: Math.max(0, parseInt(enemyDef || '0', 10)),
        element: weaknessElement,
    };
}

function buildTeam(activeSlots: SlotState[], includeCore: boolean, rangeMode: RangeMode): Team {
    return {
        members: activeSlots.map((slot, idx) => {
            const equipment: EquipmentOptions = {
                atkPercent: parseFloat(slot.equipATK || '0') / 100,
                weakPointPercent: parseFloat(slot.equipWeakPoint || '0') / 100,
                ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
            };
            const collectionLevel = parseInt(slot.collectionLevel || '0', 10);
            const character = applyBaseStats(
                slot.char.data,
                includeCore,
                equipment,
                slot.collectionGrade,
                collectionLevel,
                idx,
                getSkillLevels(slot),
            );

            const customHP = parseInt(slot.customHP || '0', 10);
            if (customHP > 0) character.hp = customHP;

            const customATK = parseInt(slot.customATK || '0', 10);
            if (customATK > 0) character.atk = customATK;

            const customDEF = parseInt(slot.customDEF || '0', 10);
            if (customDEF > 0) character.defense = customDEF;

            const rangeBonus = getWeaponRangeBonus(character.weapon, rangeMode);
            if (rangeBonus > 0) {
                character.buff = { ...(character.buff || {}), range: rangeBonus };
            }

            return character;
        }),
    };
}

function calculateTeamEnemyTakenUp(activeSlots: SlotState[]) {
    let teamEnemyTakenUp = 0;

    for (const slot of activeSlots) {
        const skills = slot.char.data.skills || [];
        for (const skill of skills) {
            const skillLevel = skill.id === 'skill_1' ? (slot.skill1Level || DEFAULT_SKILL_LEVEL)
                : skill.id === 'skill_2' ? (slot.skill2Level || DEFAULT_SKILL_LEVEL)
                    : skill.id === 'burst' ? (slot.burstLevel || DEFAULT_SKILL_LEVEL)
                        : DEFAULT_SKILL_LEVEL;
            const skillLevelIndex = Math.max(0, Math.min(9, skillLevel - 1));

            for (const effect of (skill.effects || []) as any[]) {
                if (effect.trigger === 'enemy_spawn' && effect.target === 'enemy' && effect.value && effect.duration === 'permanent') {
                    const value = Array.isArray(effect.value) ? effect.value[skillLevelIndex] : effect.value;
                    teamEnemyTakenUp += (value || 0) / 100;
                }
            }
        }
    }

    return teamEnemyTakenUp;
}

function buildScenarioSummary(
    result: BattleResult,
    activeSlots: SlotState[],
    settings: SimulationSettings,
    enemyDefense: number,
): ScenarioSummary {
    const teamEnemyTakenUp = calculateTeamEnemyTakenUp(activeSlots);

    const chars = activeSlots.map((slot, idx) => {
        const charId = `${slot.char.data.characterID}_${idx}`;
        const totalDmg = result.log
            .filter((entry: any) => DAMAGE_TYPES.has(entry.type) && entry.source === charId)
            .reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

        const charStats = slot.char.data.stats || {};
        const customATK = parseInt(slot.customATK || '0', 10);
        const atkPercent = parseFloat(slot.equipATK || '0') / 100;
        const weakPointPercent = parseFloat(slot.equipWeakPoint || '0') / 100;
        const isWeakPoint = checkAdvantage(settings.weaknessElement, charStats.element);
        const collectionLevel = parseInt(slot.collectionLevel || '0', 10);
        const equipment = {
            atkPercent,
            weakPointPercent,
            ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
        };
        const character = applyBaseStats(
            slot.char.data,
            settings.showCore,
            equipment,
            slot.collectionGrade,
            collectionLevel,
            idx,
            getSkillLevels(slot),
        );

        const hitDamages = calcHitDamages({
            atk: customATK > 0 ? customATK : character.atk,
            atkCoef: character.atkCoef,
            weapon: character.weapon,
            equipATKPercent: atkPercent,
            equipWeakPointPercent: weakPointPercent,
            normalAtkMultiplier: character.normalAtkMultiplier,
            chargeDmgMultiplier: character.chargeDmgMultiplier,
            coreHitMultiplier: character.coreHitMultiplier,
            coreDamage: charStats.coreDamage,
            coreHitBonus: character.coreHitBonus,
            critMult: character.critMult,
            fullChargeDamage: character.fullChargeDamage,
            pelletCount: charStats.pelletCount,
        }, enemyDefense, settings.rangeMode, isWeakPoint, teamEnemyTakenUp);

        return {
            charId,
            charName: slot.char.data.characterName,
            totalDmg,
            hitDamages,
            buffTimeline: result.team.members[idx]?.buffTimeline || [],
        };
    });

    const teamTotal = result.log
        .filter((entry: any) => DAMAGE_TYPES.has(entry.type))
        .reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return { chars, teamTotal };
}

function buildTotalChartDatasets(result: BattleResult, activeSlots: SlotState[], duration: number): SimulationDataset[] {
    return activeSlots.map((slot, idx) => ({
        label: slot.char.data.characterName,
        color: SLOT_COLORS[idx % SLOT_COLORS.length],
        data: generateChartData(result, duration, `${slot.char.data.characterID}_${idx}`),
    }));
}

function buildSkillChartDatasets(result: BattleResult, activeSlots: SlotState[]): SimulationDataset[] {
    return activeSlots.map((slot, idx) => ({
        label: slot.char.data.characterName,
        color: SLOT_COLORS[idx % SLOT_COLORS.length],
        data: generateScatterData(result, `${slot.char.data.characterID}_${idx}`, SKILL_DAMAGE_TYPES),
    }));
}

function buildSkillInfoMap(activeSlots: SlotState[]) {
    const infoMap: Record<string, Record<string, SkillInfoEntry>> = {};

    activeSlots.forEach((slot) => {
        const charName = slot.char.data.characterName;
        infoMap[charName] = {};

        (slot.char.data.skills || []).forEach((skill: any) => {
            const skillLevel = skill.id === 'skill_1' ? (slot.skill1Level || DEFAULT_SKILL_LEVEL)
                : skill.id === 'skill_2' ? (slot.skill2Level || DEFAULT_SKILL_LEVEL)
                    : skill.id === 'burst' ? (slot.burstLevel || DEFAULT_SKILL_LEVEL)
                        : DEFAULT_SKILL_LEVEL;
            const levelIndex = Math.max(0, Math.min(9, skillLevel - 1));

            const effects = (skill.effects || []).map((effect: any) => {
                let value = effect.value;
                if (Array.isArray(value)) value = value[levelIndex];
                const unit = effect.unit === 'percent' ? '%' : '';

                return {
                    trigger: effect.trigger || undefined,
                    target: effect.target || 'self',
                    effect: effect.effect || '',
                    value: value != null ? `${value}${unit}` : '-',
                };
            });

            infoMap[charName][skill.name] = {
                effects,
                duration: skill.effects?.[0]?.duration && skill.effects[0].duration !== 'permanent' ? skill.effects[0].duration : undefined,
                cooldown: skill.cooldown || undefined,
            };
        });
    });

    return infoMap;
}

function buildCharIdToName(activeSlots: SlotState[]) {
    return activeSlots.reduce<Record<string, string>>((map, slot, idx) => {
        map[`${slot.char.data.characterID}_${idx}`] = slot.char.data.characterName;
        return map;
    }, {});
}

export function runSimulation(slots: (SlotState | null)[], settings: SimulationSettings): SimulationViewModel | null {
    const activeSlots = slots.filter((slot): slot is SlotState => slot !== null);
    if (activeSlots.length === 0) {
        return null;
    }

    const config = buildSimulationConfig(settings.fullBurstInterval, settings.rangeMode);
    const enemy = buildEnemy(settings.enemyDef, settings.weaknessElement);
    const result = simulateBattle(buildTeam(activeSlots, settings.showCore, settings.rangeMode), { ...enemy }, config);

    return {
        summary: buildScenarioSummary(result, activeSlots, settings, enemy.defense),
        totalChartDatasets: buildTotalChartDatasets(result, activeSlots, config.duration),
        skillChartDatasets: buildSkillChartDatasets(result, activeSlots),
        burstWindows: generateBurstWindows(result.log, config.duration),
        skillInfoMap: buildSkillInfoMap(activeSlots),
        charIdToName: buildCharIdToName(activeSlots),
    };
}
