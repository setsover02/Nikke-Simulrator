import React, { useState, useEffect } from 'react';
import CharacterSlot from './home/CharacterSlot';
import SimToolbar from './home/SimToolbar';
import ResultSummary from './home/ResultSummary';
import GlobalLevelPanel from './home/GlobalLevelPanel';
import CanvasChart from './home/CanvasChart';
import CanvasScatterChart from './home/CanvasScatterChart';
import CanvasTimelineChart from './home/CanvasTimelineChart';
import { runSimulation } from '../engine/simulationRunner';
import {
    loadOutpostState,
    saveOutpostState,
    SavedOutpostState,
    saveCharSettings,
    loadAllCharSettings,
    loadGlobalCubeLevels,
    saveGlobalCubeLevel,
    getGlobalCubeLevel,
    getCharDefaultState
} from '../utils/storageUtils';
import { RangeMode } from '../constants/weaponStats';
import { SlotState } from '../types/simulator';
import { Card } from '../components/Card/Card';
import { OutpostCard } from '../components/OutpostCard/OutpostCard';
import { Container } from '../components/Layout/Container';
import { Grid } from '../components/Layout/Grid';

const Home: React.FC = () => {
    // 5 Character slots: null means empty
    const [slots, setSlots] = useState<(SlotState | null)[]>([null, null, null, null, null]);

    // Outpost level settings
    const [outpostState, setOutpostState] = useState<SavedOutpostState>(loadOutpostState);

    // Toolbar settings
    const [fullBurstInterval, setFullBurstInterval] = useState<string>('0');
    const [showCore, setShowCore] = useState<boolean>(true);
    const [rangeMode, setRangeMode] = useState<RangeMode>(25);
    const [weaknessElement, setWeaknessElement] = useState<string>('none');
    const [enemyDef, setEnemyDef] = useState<string>('4000');

    // Simulation Results
    const [simResult, setSimResult] = useState<any | null>(null);
    const [chartDatasets, setChartDatasets] = useState<any[]>([]);
    const [skillChartDatasets, setSkillChartDatasets] = useState<any[]>([]);
    const [burstWindows, setBurstWindows] = useState<any[]>([]);
    const [skillInfoMap, setSkillInfoMap] = useState<Record<string, { skill1?: string; skill2?: string; burst?: string }>>({});
    const [charIdToName, setCharIdToName] = useState<Record<string, string>>({});
    const [chartTab, setChartTab] = useState<'total' | 'skill'>('total');

    // Load saved settings on mount
    useEffect(() => {
        const savedMap = loadAllCharSettings();
        // Pre-populate if saved characters exist in slots
        // Slots initial empty
    }, []);

    // Save outpost changes
    const handleOutpostChange = (patch: Partial<SavedOutpostState>) => {
        const next = { ...outpostState, ...patch };
        setOutpostState(next);
        saveOutpostState(next);
    };

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

    // Auto-run simulation whenever slots or settings change
    useEffect(() => {
        const activeChars = slots.filter((s): s is SlotState => s !== null && s.char !== null);
        if (activeChars.length === 0) {
            setSimResult(null);
            setChartDatasets([]);
            setSkillChartDatasets([]);
            setBurstWindows([]);
            setSkillInfoMap({});
            setCharIdToName({});
            return;
        }

        const output = runSimulation({
            slots,
            enemyDef,
            fullBurstInterval,
            rangeMode,
            weaknessElement,
            outpostState,
            showCore,
        });
        if (!output) return;

        setSimResult(output.summary);
        setChartDatasets(output.chartDatasets);
        setSkillChartDatasets(output.skillChartDatasets);
        setBurstWindows(output.burstWindows);
        setSkillInfoMap(output.skillInfoMap);
        setCharIdToName(output.charIdToName);
    }, [slots, outpostState, fullBurstInterval, showCore, rangeMode, weaknessElement, enemyDef]);

    // Manual Re-calculate Trigger
    const handleSimulate = () => {
        const activeChars = slots.filter((s): s is SlotState => s !== null && s.char !== null);
        if (activeChars.length === 0) return;

        const output = runSimulation({
            slots,
            enemyDef,
            fullBurstInterval,
            rangeMode,
            weaknessElement,
            outpostState,
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
        <Grid columns={1}>
            {/* 1. 글로벌 레벨 설정 패널 (전체 넓이) */}
            <OutpostCard>
                <GlobalLevelPanel
                    outpostState={outpostState}
                    onChange={handleOutpostChange}
                />
            </OutpostCard>

            {/* 2. 스쿼드(최대 넓이 1fr) + 타겟 설정(320px 고정) (2열 중첩 Grid) */}
            <Grid columns="1fr 320px">
                {/* Left Column: 스쿼드 (Squad - 최대 넓이) */}
                <Card className="pa-4">
                    <div className="home-squad-list">
                        {displaySlots.map((slot, idx) => (
                            <CharacterSlot
                                key={idx}
                                slot={slot}
                                index={idx}
                                onUpdate={(patch) => updateSlot(idx, patch)}
                                outpostState={outpostState}
                            />
                        ))}
                    </div>
                </Card>

                {/* Right Column: 타겟 설정 (Target Settings - 320px 고정) */}
                <Card className="pa-4">
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
                </Card>
            </Grid>

            {/* 3. 결과 요약 (전체 넓이) */}
            {simResult && (
                <Card className="pa-4">
                    <ResultSummary
                        summary={simResult}
                        showTeamTotal={slots.filter(s => s !== null).length > 1}
                        isCore={showCore}
                    />
                </Card>
            )}

            {/* 4. 하단 1열 전체넓이 통합 차트 */}
            <Card className="pa-4" style={{ minHeight: '300px' }}>
                {chartDatasets.length > 0 ? (
                    <div>
                        {/* Tab Bar */}
                        <div className="mb-2" style={{ display: 'flex', gap: '0' }}>
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
            </Card>
        </Grid>
    );
};

export default Home;
