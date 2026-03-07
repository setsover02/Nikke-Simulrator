import React, { useState } from 'react';
import { simulateBattle } from '../engine/battleEngine';
import { Team, SimConfig } from '../types/battle';
import { applyBaseStats, EquipmentOptions, checkAdvantage } from '../utils/charUtils';
import { generateChartData, calcHitDamages, generateBurstWindows, BurstWindow } from '../utils/simUtils';
import { SlotState, ScenarioSummary } from '../types/simulator';
import { characterOptions, SLOT_COLORS } from '../constants/characters';
import { RangeMode, getWeaponRangeBonus } from '../constants/weaponStats';
import { getCollectionEffect } from '../constants/collectionItems';

import CharacterSlot from './home/CharacterSlot';
import ResultSummary from './home/ResultSummary';
import CanvasChart from './home/CanvasChart';
import SimToolbar from './home/SimToolbar';

function createDefaultSlot(charOption = characterOptions[0]): SlotState {
    const stats = charOption.data.stats;
    return {
        char: charOption,
        customHP: String(stats.hp || ''),
        customATK: String(stats.atk || ''),
        customDEF: String(stats.defense || ''),
        collectionGrade: 'None',
        collectionLevel: '0',
        equipATK: '0', equipWeakPoint: '0', equipAmmo: '0'
    };
}

const Home: React.FC = () => {
    const [slots, setSlots] = useState<SlotState[]>([createDefaultSlot()]);
    const [simResult, setSimResult] = useState<ScenarioSummary | null>(null);
    const [chartDatasets, setChartDatasets] = useState<any[]>([]);
    const [enemyDef, setEnemyDef] = useState<string>('100');
    const [fullBurstInterval, setFullBurstInterval] = useState<string>('4.58');
    const [rangeMode, setRangeMode] = useState<RangeMode>(45);
    const [weaknessElement, setWeaknessElement] = useState<string>('작열');
    const [burstWindows, setBurstWindows] = useState<BurstWindow[]>([]);
    const [showCore, setShowCore] = useState<boolean>(false);

    const addSlot = () => {
        if (slots.length < 5) setSlots([...slots, createDefaultSlot()]);
    };

    const removeSlot = (idx: number) => {
        if (slots.length > 1) setSlots(slots.filter((_, i) => i !== idx));
    };

    const updateSlot = (idx: number, patch: Partial<SlotState>) =>
        setSlots(slots.map((s, i) => i === idx ? { ...s, ...patch } : s));

    const handleSimulate = () => {
        const parsedBurstInterval = parseFloat(fullBurstInterval);
        const burstGaugeDelay = Number.isFinite(parsedBurstInterval) && parsedBurstInterval >= 2.52
            ? parsedBurstInterval
            : 4.58;

        const config: SimConfig = {
            duration: 180,
            tick: 1 / 60,
            seed: 42,
            fullBurstDuration: 10,
            burstGaugeDelay,
            rangeMode,
        };
        const ENEMY = { hp: 1_000_000_000, defense: Math.max(0, parseInt(enemyDef || '0', 10)), element: weaknessElement };

        const buildTeam = (includeCore: boolean): Team => ({
            members: slots.map((slot, idx) => {
                const eq: EquipmentOptions = {
                    atkPercent: parseFloat(slot.equipATK || '0') / 100,
                    weakPointPercent: parseFloat(slot.equipWeakPoint || '0') / 100,
                    ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
                };
                const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10);
                const char = applyBaseStats(slot.char.data, includeCore, eq, slot.collectionGrade, collectionLevelNum, idx);
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
        });

        const result = simulateBattle(buildTeam(showCore), { ...ENEMY }, config);

        const extractChars = (resultData: typeof result) =>
            slots.map((slot, idx) => {
                const charId = `${slot.char.data.characterID}_${idx}`;
                const DAMAGE_TYPES = new Set(['attack', 'skill_damage']);
                const totalDmg = resultData.log
                    .filter((l: any) => DAMAGE_TYPES.has(l.type) && l.source === charId)
                    .reduce((s: number, l: any) => s + (l.value || 0), 0);

                const charStats = slot.char.data.stats || {};
                const customATK = parseInt(slot.customATK || '0', 10);
                const atkPercent = parseFloat(slot.equipATK || '0') / 100;
                const weakPercent = parseFloat(slot.equipWeakPoint || '0') / 100;
                const isWeak = checkAdvantage(ENEMY.element, charStats.element);

                const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10);
                const eq = {
                    atkPercent,
                    weakPointPercent: weakPercent,
                    ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
                };
                // Re-apply stats to easily grab fullChargeDamage, coreHitBonus, etc.
                const char = applyBaseStats(slot.char.data, showCore, eq, slot.collectionGrade, collectionLevelNum, idx);

                let enemyTakenUp = 0;
                const skills = slot.char.data.skills || [];
                for (const skill of skills) {
                    for (const eff of (skill.effects || []) as any[]) {
                        if (eff.trigger === 'enemy_spawn' && eff.target === 'enemy' && eff.value && eff.duration === 'permanent') {
                            enemyTakenUp += eff.value / 100;
                        }
                    }
                }

                const hitDamages = calcHitDamages({
                    atk: customATK > 0 ? customATK : char.atk,
                    atkCoef: char.atkCoef,
                    weapon: char.weapon,
                    equipATKPercent: atkPercent,
                    equipWeakPointPercent: weakPercent,
                    normalAtkMultiplier: char.normalAtkMultiplier,
                    chargeDmgMultiplier: char.chargeDmgMultiplier,
                    coreHitMultiplier: char.coreHitMultiplier,
                    coreDamage: charStats.coreDamage,
                    coreHitBonus: char.coreHitBonus,
                    critMult: char.critMult,
                    fullChargeDamage: char.fullChargeDamage,
                    pelletCount: charStats.pelletCount,
                }, ENEMY.defense, rangeMode, isWeak, enemyTakenUp);

                return { charId, charName: slot.char.data.characterName, totalDmg, hitDamages };
            });

        const sumDamage = (resultData: typeof result) => {
            const DAMAGE_TYPES = new Set(['attack', 'skill_damage']);
            return resultData.log
                .filter((l: any) => DAMAGE_TYPES.has(l.type))
                .reduce((s: number, l: any) => s + l.value, 0);
        };

        const totalDmg = sumDamage(result);

        setSimResult({
            chars: extractChars(result),
            teamTotal: totalDmg,
        });

        const ds: any[] = [];

        slots.forEach((slot, idx) => {
            const charId = `${slot.char.data.characterID}_${idx}`;
            const charName = slot.char.data.characterName;
            const color = SLOT_COLORS[idx % SLOT_COLORS.length];
            ds.push({ label: charName, color, data: generateChartData(result, config.duration, charId) });
        });

        setChartDatasets(ds);
        setBurstWindows(generateBurstWindows(result.log, config.duration));
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#171717', minHeight: '100vh', color: '#e0e0e0' }}>

            {/* 캐릭터 슬롯 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {slots.map((slot, idx) => (
                    <CharacterSlot
                        key={idx}
                        slot={slot}
                        index={idx}
                        canRemove={slots.length > 1}
                        onUpdate={(patch) => updateSlot(idx, patch)}
                        onRemove={() => removeSlot(idx)}
                    />
                ))}
            </div>

            {/* 시뮬레이션 툴바 */}
            <SimToolbar
                slotsCount={slots.length}
                onAddSlot={addSlot}
                fullBurstInterval={fullBurstInterval}
                onFullBurstIntervalChange={setFullBurstInterval}
                showCore={showCore}
                onToggleCore={() => setShowCore(v => !v)}
                rangeMode={rangeMode}
                onRangeModeChange={setRangeMode}
                weaknessElement={weaknessElement}
                onWeaknessChange={setWeaknessElement}
                enemyDef={enemyDef}
                onEnemyDefChange={setEnemyDef}
                onSimulate={handleSimulate}
            />

            {/* 결과 요약 */}
            {simResult && (
                <ResultSummary
                    summary={simResult}
                    showTeamTotal={slots.length > 1}
                    isCore={showCore}
                />
            )}

            {/* 통합 차트 */}
            <div style={{ marginTop: '20px' }}>
                <CanvasChart
                    datasets={chartDatasets}
                    burstWindows={burstWindows}
                    title={showCore ? 'Cumulative Damage (With Core)' : 'Cumulative Damage (No Core)'}
                />
            </div>
        </div>
    );
};

export default Home;
