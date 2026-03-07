import React, { useState } from 'react';
import { simulateBattle } from '../engine/battleEngine';
import { Team, SimConfig } from '../types/battle';
import { applyBaseStats, EquipmentOptions, checkAdvantage } from '../utils/charUtils';
import { generateChartData, calcHitDamages, generateBurstWindows, BurstWindow } from '../utils/simUtils';
import { SlotState, ScenarioSummary } from '../types/simulator';
import { characterOptions, SLOT_COLORS } from '../constants/characters';
import { RangeMode, getWeaponRangeBonus } from '../constants/weaponStats';

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
    // Keep internal slots mapping up to 5 elements. We enforce exactly 5 UI rows.
    const [slots, setSlots] = useState<(SlotState | null)[]>([
        createDefaultSlot(),
        createDefaultSlot(characterOptions[1]),
        createDefaultSlot(characterOptions[2]),
        createDefaultSlot(characterOptions[3]),
        null
    ]);
    const [simResult, setSimResult] = useState<ScenarioSummary | null>(null);
    const [chartDatasets, setChartDatasets] = useState<any[]>([]);
    const [enemyDef, setEnemyDef] = useState<string>('100');
    const [fullBurstInterval, setFullBurstInterval] = useState<string>('4.58');
    const [rangeMode, setRangeMode] = useState<RangeMode>(45);
    const [weaknessElement, setWeaknessElement] = useState<string>('작열');
    const [burstWindows, setBurstWindows] = useState<BurstWindow[]>([]);
    const [showCore, setShowCore] = useState<boolean>(false);

    const updateSlot = (idx: number, patch: Partial<SlotState> | null) => {
        setSlots(slots.map((s, i) => {
            if (i !== idx) return s;
            if (patch === null) return null;
            if (s === null) {
                if (patch.char) {
                    const newSlot = createDefaultSlot(patch.char);
                    return { ...newSlot, ...patch };
                }
                return null;
            }
            return { ...s, ...patch };
        }));
    };

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

        // Only include non-empty slots in the simulation team
        const activeSlots = slots.filter(s => s !== null);

        const buildTeam = (includeCore: boolean): Team => ({
            members: activeSlots.map((slot, idx) => {
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

        if (activeSlots.length === 0) return;

        const result = simulateBattle(buildTeam(showCore), { ...ENEMY }, config);

        const extractChars = (resultData: typeof result) =>
            activeSlots.map((slot, idx) => {
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

        activeSlots.forEach((slot, idx) => {
            const charId = `${slot.char.data.characterID}_${idx}`;
            const charName = slot.char.data.characterName;
            const color = SLOT_COLORS[idx % SLOT_COLORS.length];
            ds.push({ label: charName, color, data: generateChartData(result, config.duration, charId) });
        });

        setChartDatasets(ds);
        setBurstWindows(generateBurstWindows(result.log, config.duration));
    };

    // Pad slots array to always be length 5 for UI consistency
    const displaySlots = [...slots];
    while (displaySlots.length < 5) displaySlots.push(null as any);

    return (
        <div className="home-container">
            <div className="home-content">

                {/* 2-Column Main Layout */}
                <div className="home-grid">

                    {/* Left Column: 스쿼드 (Squad) */}
                    <div className="home-grid-left">
                        <h2 className="home-section-title">스쿼드</h2>
                        <div className="home-squad-list">
                            {displaySlots.map((slot, idx) => (
                                <CharacterSlot
                                    key={idx}
                                    slot={slot}
                                    index={idx}
                                    onUpdate={(patch) => updateSlot(idx, patch)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Column: 타겟 설정 (Target Settings) */}
                    <div className="home-grid-right">
                        <SimToolbar
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
                    </div>
                </div>

                {/* 결과 요약 */}
                {simResult && (
                    <div className="result-summary-container">
                        <ResultSummary
                            summary={simResult}
                            showTeamTotal={slots.filter(s => s !== null).length > 1}
                            isCore={showCore}
                        />
                    </div>
                )}

                {/* 통합 차트 */}
                <div className="chart-container-wrapper">
                    {chartDatasets.length > 0 ? (
                        <div style={{ width: '100%' }}>
                            <CanvasChart
                                datasets={chartDatasets}
                                burstWindows={burstWindows}
                                title={showCore ? 'Cumulative Damage (With Core)' : 'Cumulative Damage (No Core)'}
                            />
                        </div>
                    ) : (
                        <h2 className="chart-title-empty">차트</h2>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;
