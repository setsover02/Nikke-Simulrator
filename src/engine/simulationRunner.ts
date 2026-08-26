/**
 * simulationRunner.ts
 * Home.tsx에서 추출된 시뮬레이션 실행 + 결과 가공 전담 모듈.
 * UI 레이어(React)에 의존하지 않으며 순수 계산만 수행합니다.
 */

import { simulateBattle } from './battleEngine';
import { Team, SimConfig } from '../types/battle';
import { applyBaseStats, EquipmentOptions, checkAdvantage } from '../utils/charUtils';
import { generateChartData, calcHitDamages, generateBurstWindows, generateScatterData } from '../utils/simUtils';
import { SlotState, SimulationInput, SimulationOutput, SkillInfoEntry } from '../types/simulator';
import { SLOT_COLORS } from '../constants/characters';
import { getWeaponRangeBonus } from '../constants/weaponStats';

interface ActiveSlot {
    slot: SlotState;
    originalIndex: number;
}

/**
 * 시뮬레이션을 실행하고 모든 결과 데이터를 반환합니다.
 * 활성 슬롯이 없으면 null을 반환합니다.
 */
export function runSimulation(input: SimulationInput): SimulationOutput | null {
    const { slots, enemyDef, fullBurstInterval, rangeMode, weaknessElement, showCore, coreSize } = input;
    const effCorePx = showCore ? (coreSize !== undefined ? coreSize : 52) : 0;

    const parsedBurstInterval = parseFloat(fullBurstInterval);
    const burstGaugeDelay = Number.isFinite(parsedBurstInterval) && parsedBurstInterval >= 0
        ? parsedBurstInterval
        : 0;

    const config: SimConfig = {
        duration: 180,
        tick: 1 / 60,
        seed: 42,
        fullBurstDuration: 10,
        burstGaugeDelay,
        rangeMode,
    };

    const ENEMY = {
        hp: 1_000_000_000,
        defense: Math.max(0, parseInt(enemyDef || '0', 10)),
        element: weaknessElement,
        corePx: effCorePx,
    };

    // 활성 슬롯 필터링 (빈 슬롯 제외, 원본 인덱스 보존)
    const activeSlots: ActiveSlot[] = slots
        .map((slot, originalIndex) => (slot ? { slot, originalIndex } : null))
        .filter((entry): entry is ActiveSlot => entry !== null);

    if (activeSlots.length === 0) return null;

    // --- 팀 빌드 ---
    const team = buildTeam(activeSlots, showCore, rangeMode);

    // --- 시뮬레이션 실행 ---
    const result = simulateBattle(team, { ...ENEMY }, config);

    // --- 캐릭터별 결과 추출 ---
    const chars = extractChars(result, activeSlots, ENEMY, showCore, rangeMode);

    // --- 총 대미지 ---
    const teamTotal = sumDamage(result);

    // --- 차트 데이터셋 ---
    const chartDatasets = buildChartDatasets(result, config.duration, activeSlots);

    // --- 스킬 차트 데이터셋 ---
    const skillChartDatasets = buildSkillChartDatasets(result, activeSlots);

    // --- 버스트 윈도우 ---
    const burstWindows = generateBurstWindows(result.log, config.duration);

    // --- 스킬 정보 맵 (타임라인 툴팁용) ---
    const skillInfoMap = buildSkillInfoMap(activeSlots);

    // --- charId → charName 맵 ---
    const charIdToName = buildCharIdToName(activeSlots);

    return {
        summary: { chars, teamTotal },
        chartDatasets,
        skillChartDatasets,
        burstWindows,
        skillInfoMap,
        charIdToName,
    };
}

// ─── 내부 헬퍼 함수 ───────────────────────────────────────

function buildTeam(activeSlots: ActiveSlot[], showCore: boolean, rangeMode: number): Team {
    return {
        members: activeSlots.map(({ slot, originalIndex }) => {
            const eq: EquipmentOptions = {
                atkPercent: parseFloat(slot.equipATK || '0') / 100,
                weakPointPercent: parseFloat(slot.equipWeakPoint || '0') / 100,
                ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
                accuracyPercent: parseFloat(slot.equipAccuracy || '0') / 100,
                chargeDmgPercent: parseFloat(slot.equipChargeDmg || '0') / 100,
                chargeSpeedPercent: parseFloat(slot.equipChargeSpeed || '0') / 100,
                critRatePercent: parseFloat(slot.equipCritRate || '0') / 100,
                critDmgPercent: parseFloat(slot.equipCritDmg || '0') / 100,
                defPercent: parseFloat(slot.equipDef || '0') / 100,
            };
            const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10);
            const skillLevels = {
                skill1Level: slot.skill1Level || 10,
                skill2Level: slot.skill2Level || 10,
                burstLevelSkill: slot.burstLevel || 10,
            };
            const cubeOpts = { cubeName: slot.cubeName || 'None', cubeLevel: parseInt(slot.cubeLevel || '0', 10) };
            const char = applyBaseStats(
                slot.char.data, showCore, eq, slot.collectionGrade,
                collectionLevelNum, originalIndex, skillLevels, cubeOpts
            );

            const customHP = parseInt(slot.customHP || '0', 10);
            if (customHP > 0) char.hp = customHP;
            const customATK = parseInt(slot.customATK || '0', 10);
            if (customATK > 0) char.atk = customATK;
            const customDEF = parseInt(slot.customDEF || '0', 10);
            if (customDEF > 0) char.defense = customDEF;

            const rb = getWeaponRangeBonus(char.weapon, rangeMode);
            if (rb > 0) char.buff = { ...(char.buff || {}), range: rb };
            return char;
        }),
    };
}

function extractChars(
    resultData: any,
    activeSlots: ActiveSlot[],
    enemy: { defense: number; element: string },
    showCore: boolean,
    rangeMode: number,
) {
    // 적 디버프(damage_taken_up)는 파티 전체에서 합산 (모든 니케에게 적용)
    let teamEnemyTakenUp = 0;
    for (const { slot: aSlot } of activeSlots) {
        const aSkills = aSlot.char.data.skills || [];
        for (const skill of aSkills) {
            const sLvl = skill.id === 'skill_1' ? (aSlot.skill1Level || 10)
                : skill.id === 'skill_2' ? (aSlot.skill2Level || 10)
                    : skill.id === 'burst' ? (aSlot.burstLevel || 10) : 10;
            const sLvIdx = Math.max(0, Math.min(9, sLvl - 1));
            for (const eff of (skill.effects || []) as any[]) {
                if (eff.trigger === 'enemy_spawn' && eff.target === 'enemy' && eff.value && eff.duration === 'permanent') {
                    const val = Array.isArray(eff.value) ? eff.value[sLvIdx] : eff.value;
                    teamEnemyTakenUp += (val || 0) / 100;
                }
            }
        }
    }

    return activeSlots.map(({ slot, originalIndex }) => {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        const DAMAGE_TYPES = new Set(['attack', 'skill_damage', 'dot_damage']);
        const totalDmg = resultData.log
            .filter((l: any) => DAMAGE_TYPES.has(l.type) && l.source === charId)
            .reduce((s: number, l: any) => s + (l.value || 0), 0);

        const charStats = slot.char.data.stats || {};
        const customATK = parseInt(slot.customATK || '0', 10);
        const atkPercent = parseFloat(slot.equipATK || '0') / 100;
        const weakPercent = parseFloat(slot.equipWeakPoint || '0') / 100;
        const isWeak = checkAdvantage(enemy.element, charStats.element);

        const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10);
        const eq: EquipmentOptions = {
            atkPercent,
            weakPointPercent: weakPercent,
            ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
            accuracyPercent: parseFloat(slot.equipAccuracy || '0') / 100,
            chargeDmgPercent: parseFloat(slot.equipChargeDmg || '0') / 100,
            chargeSpeedPercent: parseFloat(slot.equipChargeSpeed || '0') / 100,
            critRatePercent: parseFloat(slot.equipCritRate || '0') / 100,
            critDmgPercent: parseFloat(slot.equipCritDmg || '0') / 100,
            defPercent: parseFloat(slot.equipDef || '0') / 100,
        };
        const skillLevels = {
            skill1Level: slot.skill1Level || 10,
            skill2Level: slot.skill2Level || 10,
            burstLevelSkill: slot.burstLevel || 10,
        };
        const cubeOpts = { cubeName: slot.cubeName || 'None', cubeLevel: parseInt(slot.cubeLevel || '0', 10) };
        const char = applyBaseStats(slot.char.data, showCore, eq, slot.collectionGrade, collectionLevelNum, originalIndex, skillLevels, cubeOpts);
        const hitDamages = calcHitDamages(
            {
                atk: customATK > 0 ? customATK : char.atk,
                atkCoef: char.atkCoef,
                weapon: char.weapon,
                equipATKPercent: atkPercent,
                equipWeakPointPercent: char.equipWeakPointPercent,
                equipCritDmgPercent: char.equipCritDmgPercent,
                normalAtkMultiplier: char.normalAtkMultiplier,
                chargeDmgMultiplier: char.chargeDmgMultiplier,
                coreHitMultiplier: char.coreHitMultiplier,
                coreDamage: charStats.coreDamage,
                coreHitBonus: char.coreHitBonus,
                critMult: char.critMult,
                fullChargeDamage: char.fullChargeDamage,
                pelletCount: charStats.pelletCount,
            },
            enemy.defense, rangeMode, isWeak, teamEnemyTakenUp
        );

        return {
            charId,
            charName: slot.char.data.characterName,
            totalDmg,
            hitDamages,
            buffTimeline: resultData.team.members.find((member: any) => member.id === charId)?.buffTimeline || [],
        };
    });
}

function sumDamage(resultData: any): number {
    const DAMAGE_TYPES = new Set(['attack', 'skill_damage', 'dot_damage']);
    return resultData.log
        .filter((l: any) => DAMAGE_TYPES.has(l.type))
        .reduce((s: number, l: any) => s + l.value, 0);
}

function buildChartDatasets(result: any, duration: number, activeSlots: ActiveSlot[]) {
    return activeSlots.map(({ slot, originalIndex }, idx) => {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        const charName = slot.char.data.characterName;
        const color = SLOT_COLORS[idx % SLOT_COLORS.length];
        return { label: charName, color, data: generateChartData(result, duration, charId) };
    });
}

function buildSkillChartDatasets(result: any, activeSlots: ActiveSlot[]) {
    const SKILL_TYPES = new Set(['skill_damage']);
    const DOT_TYPES = new Set(['dot_damage']);
    const datasets: { label: string; color: string; data: any[] }[] = [];

    activeSlots.forEach(({ slot, originalIndex }, idx) => {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        const charName = slot.char.data.characterName;
        const color = SLOT_COLORS[idx % SLOT_COLORS.length];

        // 일반 스킬 데미지 dataset
        datasets.push({ label: charName, color, data: generateScatterData(result, charId, SKILL_TYPES) });

        // DoT 데미지 dataset (캐릭터별, 별도 라벨)
        const dotData = generateScatterData(result, charId, DOT_TYPES);
        if (dotData.length > 0) {
            datasets.push({ label: `${charName} (DoT)`, color, data: dotData });
        }
    });

    return datasets;
}

function buildSkillInfoMap(activeSlots: ActiveSlot[]): Record<string, Record<string, SkillInfoEntry>> {
    const infoMap: Record<string, Record<string, SkillInfoEntry>> = {};
    for (const { slot } of activeSlots) {
        const charName = slot.char.data.characterName;
        infoMap[charName] = {};
        const skills = slot.char.data.skills || [];
        for (const sk of skills as any[]) {
            const skillLevel = sk.id === 'skill_1' ? (slot.skill1Level || 10)
                : sk.id === 'skill_2' ? (slot.skill2Level || 10)
                    : sk.id === 'burst' ? (slot.burstLevel || 10) : 10;
            const lvIdx = Math.max(0, Math.min(9, skillLevel - 1));

            const effects = (sk.effects || []).map((eff: any) => {
                let val = eff.value;
                if (Array.isArray(val)) val = val[lvIdx];
                const unit = eff.unit === 'percent' ? '%' : '';
                return {
                    trigger: eff.trigger || undefined,
                    target: eff.target || 'self',
                    effect: eff.effect || '',
                    value: val != null ? `${val}${unit}` : '-',
                };
            });
            infoMap[charName][sk.name] = {
                effects,
                duration: sk.effects?.[0]?.duration && sk.effects[0].duration !== 'permanent' ? sk.effects[0].duration : undefined,
                cooldown: sk.cooldown || undefined,
            };
        }
    }
    return infoMap;
}

function buildCharIdToName(activeSlots: ActiveSlot[]): Record<string, string> {
    const idToName: Record<string, string> = {};
    for (const { slot, originalIndex } of activeSlots) {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        idToName[charId] = slot.char.data.characterName;
    }
    return idToName;
}
