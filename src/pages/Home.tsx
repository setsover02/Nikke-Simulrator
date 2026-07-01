import React, { useState, useEffect } from 'react';
import { SlotState, ScenarioSummary } from '../types/simulator';
import { characterOptions } from '../constants/characters';
import { RangeMode } from '../constants/weaponStats';
import { getCharDefaultState, saveCharSettings, loadTeamLayout, saveTeamLayout, getGlobalCubeLevel, saveGlobalCubeLevel } from '../utils/storageUtils';
import { BurstWindow } from '../utils/simUtils';
import { runSimulation } from '../engine/simulationRunner';

import CharacterSlot from './home/CharacterSlot';
import ResultSummary from './home/ResultSummary';
import CanvasChart from './home/CanvasChart';
import CanvasScatterChart from './home/CanvasScatterChart';
import CanvasTimelineChart from './home/CanvasTimelineChart';
import SimToolbar from './home/SimToolbar';

const Home: React.FC = () => {
    // Keep internal slots mapping up to 5 elements. We enforce exactly 5 UI rows.
    const [slots, setSlots] = useState<(SlotState | null)[]>(() => {
        const layoutIds = loadTeamLayout();
        return layoutIds.map(id => {
            if (!id) return null;
            const option = characterOptions.find(o => o.data.characterID === id);
            return option ? getCharDefaultState(option) : null;
        });
    });
    const [simResult, setSimResult] = useState<ScenarioSummary | null>(null);
    const [chartDatasets, setChartDatasets] = useState<any[]>([]);
    const [enemyDef, setEnemyDef] = useState<string>('100');
    const [fullBurstInterval, setFullBurstInterval] = useState<string>('4.58');
    const [rangeMode, setRangeMode] = useState<RangeMode>(45);
    const [weaknessElement, setWeaknessElement] = useState<string>('작열');
    const [burstWindows, setBurstWindows] = useState<BurstWindow[]>([]);
    const [showCore, setShowCore] = useState<boolean>(false);
    const [skillInfoMap, setSkillInfoMap] = useState<Record<string, Record<string, { effects: { target: string; effect: string; value: string }[]; duration?: number; cooldown?: number }>>>({});
    const [charIdToName, setCharIdToName] = useState<Record<string, string>>({});
    const [chartTab, setChartTab] = useState<'total' | 'skill'>('total');
    const [skillChartDatasets, setSkillChartDatasets] = useState<any[]>([]);

    useEffect(() => {
        const layoutIds = slots.map(s => s ? s.char.data.characterID : null);
        saveTeamLayout(layoutIds);
    }, [slots]);

    const updateSlot = (idx: number, patch: Partial<SlotState> | null) => {
        let globalCubeUpdateName: string | null = null;
        let globalCubeUpdateLevel: string | null = null;

        const actualPatch = patch ? { ...patch } : null;

        if (actualPatch && slots[idx]) {
            // Did the user select a different cube?
            if (actualPatch.cubeName !== undefined && actualPatch.cubeName !== slots[idx]!.cubeName) {
                // Drop the old level passed by CharacterSlot, load dynamically from global
                actualPatch.cubeLevel = actualPatch.cubeName === 'None' ? '0' : (getGlobalCubeLevel(actualPatch.cubeName) || '1');
            }
            // Did the user manually change the level of the CURRENT cube?
            else if (actualPatch.cubeLevel !== undefined) {
                const name = actualPatch.cubeName || slots[idx]!.cubeName;
                if (name && name !== 'None') {
                    saveGlobalCubeLevel(name, actualPatch.cubeLevel);
                    globalCubeUpdateName = name;
                    globalCubeUpdateLevel = actualPatch.cubeLevel;
                }
            }
        }

        setSlots(slots.map((s, i) => {
            if (i === idx) {
                if (actualPatch === null) return null;
                if (s === null) {
                    if (actualPatch.char) {
                        const newSlot = getCharDefaultState(actualPatch.char);
                        const merged = { ...newSlot, ...actualPatch };
                        const { char, ...stateToSave } = merged;
                        saveCharSettings(char.data.characterID, stateToSave);
                        return merged;
                    }
                    return null;
                }
                const merged = { ...s, ...actualPatch };
                const { char, ...stateToSave } = merged;
                saveCharSettings(char.data.characterID, stateToSave);
                return merged;
            }

            // Sync other slots if they have the same cube and its level was just updated
            if (s !== null && globalCubeUpdateName && globalCubeUpdateLevel && s.cubeName === globalCubeUpdateName) {
                const merged = { ...s, cubeLevel: globalCubeUpdateLevel };
                const { char, ...stateToSave } = merged;
                saveCharSettings(char.data.characterID, stateToSave);
                return merged;
            }

            return s;
        }));
    };

    const handleSimulate = () => {
        const output = runSimulation({
            slots,
            enemyDef,
            fullBurstInterval,
            rangeMode,
            weaknessElement,
            showCore,
        });
        if (!output) return;

        setSimResult(output.summary);
        setChartDatasets(output.chartDatasets);
        setSkillChartDatasets(output.skillChartDatasets);
        setBurstWindows(output.burstWindows);
        setSkillInfoMap(output.skillInfoMap);
        setCharIdToName(output.charIdToName);
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
                            {/* Tab Bar */}
                            <div style={{ display: 'flex', gap: '0', marginBottom: '8px' }}>
                                <button
                                    onClick={() => setChartTab('total')}
                                    style={{
                                        padding: '6px 16px', fontSize: '12px', fontWeight: chartTab === 'total' ? 'bold' : 'normal',
                                        background: chartTab === 'total' ? '#333' : '#1e1e1e',
                                        color: chartTab === 'total' ? '#fff' : '#888',
                                        border: '1px solid #444', borderBottom: chartTab === 'total' ? '2px solid #4fc3f7' : '1px solid #444',
                                        borderRadius: '6px 6px 0 0', cursor: 'pointer',
                                    }}
                                >전체 대미지</button>
                                <button
                                    onClick={() => setChartTab('skill')}
                                    style={{
                                        padding: '6px 16px', fontSize: '12px', fontWeight: chartTab === 'skill' ? 'bold' : 'normal',
                                        background: chartTab === 'skill' ? '#333' : '#1e1e1e',
                                        color: chartTab === 'skill' ? '#fff' : '#888',
                                        border: '1px solid #444', borderBottom: chartTab === 'skill' ? '2px solid #ff9800' : '1px solid #444',
                                        borderRadius: '6px 6px 0 0', cursor: 'pointer',
                                    }}
                                >스킬 대미지</button>
                            </div>
                            {chartTab === 'total' ? (
                                <CanvasChart
                                    datasets={chartDatasets}
                                    burstWindows={burstWindows}
                                    title={showCore ? 'Cumulative Damage (With Core)' : 'Cumulative Damage (No Core)'}
                                    charIdToName={charIdToName}
                                />
                            ) : (
                                <CanvasScatterChart
                                    datasets={skillChartDatasets}
                                    burstWindows={burstWindows}
                                    title="Skill Damage Instances"
                                    charIdToName={charIdToName}
                                />
                            )}
                            {simResult && <CanvasTimelineChart summary={simResult} duration={180} skillInfoMap={skillInfoMap} charIdToName={charIdToName} />}
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
