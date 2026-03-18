import React, { useState, useEffect } from 'react';
import { SlotState } from '../types/simulator';
import { characterOptions } from '../constants/characters';
import { RangeMode } from '../constants/weaponStats';
import { getCharDefaultState, saveCharSettings, loadTeamLayout, saveTeamLayout } from '../utils/storageUtils';
import { runSimulation, SimulationViewModel } from './home/simulationUtils';

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
    const [simulationView, setSimulationView] = useState<SimulationViewModel | null>(null);
    const [enemyDef, setEnemyDef] = useState<string>('100');
    const [fullBurstInterval, setFullBurstInterval] = useState<string>('4.58');
    const [rangeMode, setRangeMode] = useState<RangeMode>(45);
    const [weaknessElement, setWeaknessElement] = useState<string>('작열');
    const [showCore, setShowCore] = useState<boolean>(false);
    const [chartTab, setChartTab] = useState<'total' | 'skill'>('total');

    useEffect(() => {
        const layoutIds = slots.map(s => s ? s.char.data.characterID : null);
        saveTeamLayout(layoutIds);
    }, [slots]);

    const updateSlot = (idx: number, patch: Partial<SlotState> | null) => {
        setSlots(slots.map((s, i) => {
            if (i !== idx) return s;
            if (patch === null) return null;
            if (s === null) {
                if (patch.char) {
                    const newSlot = getCharDefaultState(patch.char);
                    const merged = { ...newSlot, ...patch };
                    const { char, ...stateToSave } = merged;
                    saveCharSettings(char.data.characterID, stateToSave);
                    return merged;
                }
                return null;
            }
            const merged = { ...s, ...patch };
            const { char, ...stateToSave } = merged;
            saveCharSettings(char.data.characterID, stateToSave);
            return merged;
        }));
    };

    const handleSimulate = () => {
        const nextSimulationView = runSimulation(slots, {
            enemyDef,
            fullBurstInterval,
            rangeMode,
            weaknessElement,
            showCore,
        });

        if (!nextSimulationView) return;

        setSimulationView(nextSimulationView);
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
                            <h3 className="squad-title">스쿼드</h3>
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
                {simulationView && (
                    <div className="result-summary-container">
                        <ResultSummary
                            summary={simulationView.summary}
                            showTeamTotal={slots.filter(s => s !== null).length > 1}
                            isCore={showCore}
                        />
                    </div>
                )}

                {/* 통합 차트 */}
                <div className="chart-container-wrapper">
                    {simulationView ? (
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
                                    datasets={simulationView.totalChartDatasets}
                                    burstWindows={simulationView.burstWindows}
                                    title={showCore ? 'Cumulative Damage (With Core)' : 'Cumulative Damage (No Core)'}
                                    charIdToName={simulationView.charIdToName}
                                />
                            ) : (
                                <CanvasScatterChart
                                    datasets={simulationView.skillChartDatasets}
                                    burstWindows={simulationView.burstWindows}
                                    title="Skill Damage Instances"
                                    charIdToName={simulationView.charIdToName}
                                />
                            )}
                            <CanvasTimelineChart summary={simulationView.summary} duration={180} skillInfoMap={simulationView.skillInfoMap} charIdToName={simulationView.charIdToName} />
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
