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
import { calculateBaseStat, getClassConsoleLevel, getCorpConsoleLevel, resolveGrowthStage } from './baseStat';

interface ActiveSlot {
    slot: SlotState;
    originalIndex: number;
}

/**
 * 시뮬레이션을 실행하고 모든 결과 데이터를 반환합니다.
 * 활성 슬롯이 없으면 null을 반환합니다.
 */
export function runSimulation(input: SimulationInput): SimulationOutput | null {
    const { slots, enemyDef, fullBurstInterval, rangeMode, weaknessElement, showCore, coreSize, outpostState } = input;
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
    const team = buildTeam(activeSlots, showCore, rangeMode, outpostState);

    // --- 시뮬레이션 실행 ---
    const result = simulateBattle(team, { ...ENEMY }, config);

    // --- 캐릭터별 결과 추출 ---
    const chars = extractChars(result, activeSlots, ENEMY, showCore, rangeMode, outpostState);

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
        summary: { chars, teamTotal, buffTimeline: result.buffTimeline, idToName: charIdToName },
        chartDatasets,
        skillChartDatasets,
        burstWindows,
        skillInfoMap,
        charIdToName,
    };
}

// ─── 내부 헬퍼 함수 ───────────────────────────────────────

function buildTeam(activeSlots: ActiveSlot[], showCore: boolean, rangeMode: number, outpostState?: any): Team {
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
            const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10) || 0;
            const skillLevels = {
                skill1Level: slot.skill1Level || 10,
                skill2Level: slot.skill2Level || 10,
                burstLevelSkill: slot.burstLevel || 10,
            };
            const cubeOpts = { cubeName: slot.cubeName || 'None', cubeLevel: parseInt(slot.cubeLevel || '0', 10) || 0 };
            const char = applyBaseStats(
                slot.char.data, showCore, eq, slot.collectionGrade,
                collectionLevelNum, originalIndex, skillLevels, cubeOpts
            );

            const charData = slot.char.data;
            const s = charData.stats || {};
            const charName = charData.characterName || charData.name || '';
            const charRarity = s.rarity || 'SSR';
            const charCompany = s.company || 'Elysion';
            const currentGrowthStage = parseInt(slot.growthStage || '0', 10) || 0;
            const { maxAffinity } = resolveGrowthStage(charRarity, charCompany, charName, currentGrowthStage);

            const synchroLevel = outpostState?.lockSynchro400 ? 400 : (parseInt(outpostState?.synchroLevel || '1', 10) || 1);
            const commonConsoleLevel = parseInt(outpostState?.commonResearchLevel || '0', 10) || 0;
            const classConsoleLevel = getClassConsoleLevel(s.class, outpostState || {} as any);
            const corpConsoleLevel = getCorpConsoleLevel(s.company, outpostState || {} as any);

            const calculated = calculateBaseStat({
                classType: s.class,
                weaponType: s.weapon,
                level: synchroLevel,
                affinityLevel: Math.min(parseInt(slot.affinityLevel || '10', 10) || 1, maxAffinity),
                growthStage: currentGrowthStage,
                rarity: charRarity,
                company: charCompany,
                charName: charName,
                commonConsoleLevel,
                classConsoleLevel,
                corpConsoleLevel,
                cubeLevel: parseInt(slot.cubeLevel || '0', 10) || 0,
                equipTierHead: slot.equipTierHead || 'none',
                equipUpgradeHead: parseInt(slot.equipUpgradeHead || '0', 10) || 0,
                equipTierTorso: slot.equipTierTorso || 'none',
                equipUpgradeTorso: parseInt(slot.equipUpgradeTorso || '0', 10) || 0,
                equipTierArms: slot.equipTierArms || 'none',
                equipUpgradeArms: parseInt(slot.equipUpgradeArms || '0', 10) || 0,
                equipTierLegs: slot.equipTierLegs || 'none',
                equipUpgradeLegs: parseInt(slot.equipUpgradeLegs || '0', 10) || 0,
                collectionGrade: slot.collectionGrade || 'None',
                collectionLevel: collectionLevelNum,
            });

            const customHP = parseInt(slot.customHP || '0', 10);
            char.hp = customHP > 0 ? customHP : calculated.hp;
            const customATK = parseInt(slot.customATK || '0', 10);
            char.atk = customATK > 0 ? customATK : calculated.atk;
            const customDEF = parseInt(slot.customDEF || '0', 10);
            char.defense = customDEF > 0 ? customDEF : calculated.def;

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
    outpostState?: any
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

        const charData = slot.char.data;
        const charStats = charData.stats || {};
        const charName = charData.characterName || charData.name || '';
        const charRarity = charStats.rarity || 'SSR';
        const charCompany = charStats.company || 'Elysion';
        const currentGrowthStage = parseInt(slot.growthStage || '0', 10) || 0;
        const { maxAffinity } = resolveGrowthStage(charRarity, charCompany, charName, currentGrowthStage);

        const synchroLevel = outpostState?.lockSynchro400 ? 400 : (parseInt(outpostState?.synchroLevel || '1', 10) || 1);
        const commonConsoleLevel = parseInt(outpostState?.commonResearchLevel || '0', 10) || 0;
        const classConsoleLevel = getClassConsoleLevel(charStats.class, outpostState || {} as any);
        const corpConsoleLevel = getCorpConsoleLevel(charStats.company, outpostState || {} as any);

        const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10) || 0;
        const calculated = calculateBaseStat({
            classType: charStats.class,
            weaponType: charStats.weapon,
            level: synchroLevel,
            affinityLevel: Math.min(parseInt(slot.affinityLevel || '10', 10) || 1, maxAffinity),
            growthStage: currentGrowthStage,
            rarity: charRarity,
            company: charCompany,
            charName: charName,
            commonConsoleLevel,
            classConsoleLevel,
            corpConsoleLevel,
            cubeLevel: parseInt(slot.cubeLevel || '0', 10) || 0,
            equipTierHead: slot.equipTierHead || 'none',
            equipUpgradeHead: parseInt(slot.equipUpgradeHead || '0', 10) || 0,
            equipTierTorso: slot.equipTierTorso || 'none',
            equipUpgradeTorso: parseInt(slot.equipUpgradeTorso || '0', 10) || 0,
            equipTierArms: slot.equipTierArms || 'none',
            equipUpgradeArms: parseInt(slot.equipUpgradeArms || '0', 10) || 0,
            equipTierLegs: slot.equipTierLegs || 'none',
            equipUpgradeLegs: parseInt(slot.equipUpgradeLegs || '0', 10) || 0,
            collectionGrade: slot.collectionGrade || 'None',
            collectionLevel: collectionLevelNum,
        });

        const customATK = parseInt(slot.customATK || '0', 10);
        const effectiveBaseATK = customATK > 0 ? customATK : calculated.atk;
        const atkPercent = parseFloat(slot.equipATK || '0') / 100;
        const weakPercent = parseFloat(slot.equipWeakPoint || '0') / 100;
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
        const cubeOpts = { cubeName: slot.cubeName || 'None', cubeLevel: parseInt(slot.cubeLevel || '0', 10) || 0 };
        const char = applyBaseStats(slot.char.data, showCore, eq, slot.collectionGrade, collectionLevelNum, originalIndex, skillLevels, cubeOpts);
        const isWeak = checkAdvantage(enemy.element, charStats.element, char.id);
        const hitDamages = calcHitDamages(
            {
                atk: effectiveBaseATK,
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
        .reduce((s: number, l: any) => s + (typeof l.value === 'number' && !isNaN(l.value) ? l.value : 0), 0);
}

function buildChartDatasets(result: any, duration: number, activeSlots: ActiveSlot[]) {
    return activeSlots.map(({ slot, originalIndex }) => {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        const charName = slot.char.data.characterName;
        const color = SLOT_COLORS[originalIndex % SLOT_COLORS.length];
        return { label: charName, color, data: generateChartData(result, duration, charId) };
    });
}

function buildSkillChartDatasets(result: any, activeSlots: ActiveSlot[]) {
    // 1) source → { charName, color } 역방향 맵 구성
    const sourceMap = new Map<string, { label: string; color: string }>();
    activeSlots.forEach(({ slot, originalIndex }) => {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        const charName = slot.char.data.characterName;
        const color = SLOT_COLORS[originalIndex % SLOT_COLORS.length];
        sourceMap.set(charId, { label: charName, color });
        // characterID만으로도 매핑 (source 포맷이 다를 경우 fallback)
        sourceMap.set(slot.char.data.characterID, { label: charName, color });
    });

    // 2) 전체 로그에서 스킬 대미지 타입만 수집 (sourceFilter 없이)
    const allPoints = generateScatterData(result);  // sourceFilter = undefined → 전체

    // 3) source별로 bucket
    const buckets = new Map<string, { label: string; color: string; data: any[] }>();

    for (const pt of allPoints) {
        let meta = sourceMap.get(pt.source);
        if (!meta) {
            // charId 형식이 아닌 경우: prefix 매칭 시도
            for (const [key, val] of sourceMap.entries()) {
                if (pt.source.startsWith(key) || key.startsWith(pt.source)) {
                    meta = val;
                    break;
                }
            }
        }
        const bucketKey = pt.source;
        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, {
                label: meta?.label ?? pt.source,
                color: meta?.color ?? '#888888',
                data: [],
            });
        }
        buckets.get(bucketKey)!.data.push(pt);
    }

    // 4) activeSlots 순서로 정렬 (범례 일관성)
    const orderedKeys: string[] = [];
    activeSlots.forEach(({ slot, originalIndex }) => {
        const charId = `${slot.char.data.characterID}_${originalIndex}`;
        for (const key of buckets.keys()) {
            if (key === charId || key.startsWith(slot.char.data.characterID)) {
                if (!orderedKeys.includes(key)) orderedKeys.push(key);
            }
        }
    });
    // 매핑 안 된 source는 뒤에 추가
    for (const key of buckets.keys()) {
        if (!orderedKeys.includes(key)) orderedKeys.push(key);
    }

    return orderedKeys.map(key => buckets.get(key)!);
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
