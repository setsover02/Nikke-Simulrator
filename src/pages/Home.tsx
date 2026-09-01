import React, { useState, useEffect } from 'react';
import CharacterSlot from './home/CharacterSlot';
import SimToolbar from './home/SimToolbar';
import { CharacterSelectionPanel } from './home/CharacterSelectionPanel';
import { SquadAvatarList } from './home/SquadAvatarList';
import ResultSummary from './home/ResultSummary';
import GlobalLevelPanel from './home/GlobalLevelPanel';
import CanvasChart from './home/CanvasChart';
import CanvasDpsChart from './home/CanvasDpsChart';
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
    getCharDefaultState,
    loadTeamLayout,
    saveTeamLayout,
    loadTargetSettings,
    saveTargetSettings
} from '../utils/storageUtils';
import { characterOptions } from '../constants/characters';
import { RangeMode } from '../constants/weaponStats';
import { SlotState } from '../types/simulator';
import { Card } from '../components/Card/Card';
import { Button } from '../components/Button/Button';
import { ButtonToggle } from '../components/Button/ButtonToggle';
import { OutpostCard } from '../components/OutpostCard/OutpostCard';
import { Grid } from '../components/Layout/Grid';
import { Modal } from '../components/Modal';
import ProfileSyncModal from '../components/ProfileSyncModal/ProfileSyncModal';
import { checkAndProcessUrlSync } from '../utils/profileSync';

const Home: React.FC = () => {
    // 5 Character slots: null means empty
    const [slots, setSlots] = useState<(SlotState | null)[]>([null, null, null, null, null]);

    // Active detail editing modal slot index (null = closed)
    const [activeDetailModalIdx, setActiveDetailModalIdx] = useState<number | null>(null);
    // Character selection modal slot index (for empty slots)
    const [charSelectionModalSlotIdx, setCharSelectionModalSlotIdx] = useState<number | null>(null);
    // Profile sync modal
    const [isProfileSyncOpen, setIsProfileSyncOpen] = useState(false);

    // Responsive desktop screen check
    const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true));

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1280);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 북마클릿을 통한 들어오는 동기화 요청 자동 처리
    useEffect(() => {
        checkAndProcessUrlSync().then((res) => {
            if (res && res.success) {
                const freshOutpost = loadOutpostState();
                setOutpostState(freshOutpost);
                setSlots(prev => prev.map(s => {
                    if (!s || !s.char) return s;
                    const fresh = getCharDefaultState(s.char);
                    return { ...s, ...fresh, char: s.char };
                }));
                alert(`🎉 [북마클릿 연동 성공] 총 ${res.syncedCount}명의 니케 육성 데이터가 동기화되었습니다!`);
            }
        });
    }, []);

    // Outpost level settings
    const [outpostState, setOutpostState] = useState<SavedOutpostState>(loadOutpostState);

    // Toolbar settings (loaded from localStorage)
    const savedTarget = loadTargetSettings();
    const [fullBurstInterval, setFullBurstInterval] = useState<string>(savedTarget.fullBurstInterval);
    const [showCore, setShowCore] = useState<boolean>(savedTarget.showCore);
    const [coreSize, setCoreSize] = useState<number>(savedTarget.coreSize ?? 52);
    const [rangeMode, setRangeMode] = useState<RangeMode>(savedTarget.rangeMode as RangeMode);
    const [weaknessElement, setWeaknessElement] = useState<string>(savedTarget.weaknessElement);
    const [enemyDef, setEnemyDef] = useState<string>(savedTarget.enemyDef);

    // Simulation Results
    const [simResult, setSimResult] = useState<any | null>(null);
    const [chartDatasets, setChartDatasets] = useState<any[]>([]);
    const [dps1sDatasets, setDps1sDatasets] = useState<any[]>([]);
    const [skillChartDatasets, setSkillChartDatasets] = useState<any[]>([]);
    const [burstWindows, setBurstWindows] = useState<any[]>([]);
    const [skillInfoMap, setSkillInfoMap] = useState<Record<string, { skill1?: string; skill2?: string; burst?: string }>>({});
    const [charIdToName, setCharIdToName] = useState<Record<string, string>>({});
    const [chartTab, setChartTab] = useState<'total' | 'dps' | 'skill'>('total');

    // Load saved team layout on mount
    useEffect(() => {
        const savedTeamIds = loadTeamLayout();
        const restoredSlots: (SlotState | null)[] = savedTeamIds.map(id => {
            if (!id) return null;
            const charOption = characterOptions.find(c => c.data.characterID === id);
            if (!charOption) return null;
            return getCharDefaultState(charOption);
        });
        // Ensure exactly 5 slots
        while (restoredSlots.length < 5) restoredSlots.push(null);
        setSlots(restoredSlots.slice(0, 5));
    }, []);

    // Helper: persist current target settings to localStorage
    const persistTargetSettings = (overrides: Partial<{
        fullBurstInterval: string;
        showCore: boolean;
        coreSize: number;
        rangeMode: number;
        weaknessElement: string;
        enemyDef: string;
    }> = {}) => {
        saveTargetSettings({
            fullBurstInterval,
            showCore,
            coreSize,
            rangeMode,
            weaknessElement,
            enemyDef,
            ...overrides
        });
    };

    const handleFullBurstIntervalChange = (val: string) => {
        setFullBurstInterval(val);
        persistTargetSettings({ fullBurstInterval: val });
    };

    const handleToggleCore = () => {
        setShowCore(v => {
            const next = !v;
            persistTargetSettings({ showCore: next });
            return next;
        });
    };

    const handleCoreSizeChange = (val: number) => {
        setCoreSize(val);
        persistTargetSettings({ coreSize: val });
    };

    const handleRangeModeChange = (val: RangeMode) => {
        setRangeMode(val);
        persistTargetSettings({ rangeMode: val });
    };

    const handleWeaknessChange = (val: string) => {
        setWeaknessElement(val);
        persistTargetSettings({ weaknessElement: val });
    };

    const handleEnemyDefChange = (val: string) => {
        setEnemyDef(val);
        persistTargetSettings({ enemyDef: val });
    };

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

        if (actualPatch && slots[idx] && (!actualPatch.char || slots[idx]?.char?.data?.characterID === actualPatch.char.data.characterID)) {
            // Did the user select a different cube?
            if (actualPatch.cubeName !== undefined && actualPatch.cubeName !== slots[idx]!.cubeName) {
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

        const nextSlots = slots.map((s, i) => {
            if (i === idx) {
                if (actualPatch === null) return null;

                // 새 캐릭터 교체 또는 빈 슬롯 신규 배치 -> 새 캐릭터의 저장된 스펙 로드
                if (actualPatch.char && (!s || s.char?.data?.characterID !== actualPatch.char.data.characterID)) {
                    const newSlot = getCharDefaultState(actualPatch.char);
                    const merged = { ...newSlot, ...actualPatch };
                    const { char, ...stateToSave } = merged;
                    saveCharSettings(char.data.characterID, stateToSave);
                    return merged;
                }

                if (s === null) return null;

                // 동일 캐릭터의 단일 속성 패치
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
        });
        setSlots(nextSlots);
        saveTeamLayout(nextSlots.map(s => s?.char?.data?.characterID ?? null));
    };

    const handleGlobalCubeChange = (cubeId: string, level: string) => {
        setSlots(prev => prev.map(s => {
            if (s && s.cubeName === cubeId) {
                const merged = { ...s, cubeLevel: level };
                if (s.char?.data?.characterID) {
                    const { char, ...stateToSave } = merged;
                    saveCharSettings(char.data.characterID, stateToSave);
                }
                return merged;
            }
            return s;
        }));
    };

    const handleSwapSlots = (fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        setSlots(prev => {
            const next = [...prev];
            while (next.length < 5) next.push(null);
            const temp = next[fromIdx];
            next[fromIdx] = next[toIdx];
            next[toIdx] = temp;
            saveTeamLayout(next.map(s => s?.char?.data?.characterID ?? null));
            return next;
        });
    };

    // Handler when user clicks an avatar in the right CharacterSelectionPanel
    const handleSelectCharacterFromPanel = (charOption: typeof characterOptions[0]) => {
        const charID = charOption.data.characterID;
        // Check if character is already in squad
        const existingIdx = slots.findIndex(s => s?.char?.data?.characterID === charID);

        if (existingIdx !== -1) {
            // If already in squad, toggle off (remove)
            updateSlot(existingIdx, null);
            return;
        }

        // Find first empty slot
        const emptyIdx = slots.findIndex(s => s === null);
        if (emptyIdx !== -1) {
            updateSlot(emptyIdx, { char: charOption });
        } else {
            // If all 5 slots are full, replace slot 0 (or first slot)
            updateSlot(0, { char: charOption });
        }
    };

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
            coreSize,
        });
        if (!output) return;

        setSimResult(output.summary);
        setChartDatasets(output.chartDatasets);
        setDps1sDatasets(output.dps1sDatasets);
        setSkillChartDatasets(output.skillChartDatasets);
        setBurstWindows(output.burstWindows);
        setSkillInfoMap(output.skillInfoMap);
        setCharIdToName(output.charIdToName);
    };

    // List of character IDs currently in the squad
    const currentSquadCharIds = slots.map(s => s?.char?.data?.characterID).filter((id): id is string => Boolean(id));

    return (
        <Grid columns={1}>
            {/* 1. 글로벌 레벨 설정 패널 (전체 넓이) */}
            <OutpostCard>
                <GlobalLevelPanel
                    outpostState={outpostState}
                    onChange={handleOutpostChange}
                    onCubeChange={handleGlobalCubeChange}
                    onOpenProfileSync={() => setIsProfileSyncOpen(true)}
                />
            </OutpostCard>

            {/* 2. 스쿼드 + 캐릭터 선택 패널 (데스크톱: 320px 1fr, 그 외: 1fr) */}
            <Grid columns={{ xs: '1fr', lg: '320px 1fr' }}>
                {/* 데스크톱 전용 캐릭터 선택 패널 */}
                {isDesktop && (
                    <Card>
                        <CharacterSelectionPanel
                            onSelectCharacter={handleSelectCharacterFromPanel}
                            currentSquadCharIds={currentSquadCharIds}
                        />
                    </Card>
                )}

                {/* 스쿼드 아바타 목록 */}
                <Card>
                    <SquadAvatarList
                        slots={slots}
                        onUpdateSlot={updateSlot}
                        onSwapSlots={handleSwapSlots}
                        onOpenDetailModal={(idx) => {
                            const isFilled = Boolean(slots[idx]?.char);
                            if (isFilled) {
                                setActiveDetailModalIdx(idx);
                            } else {
                                setCharSelectionModalSlotIdx(idx);
                            }
                        }}
                    />
                </Card>
            </Grid>

            {/* 3. 타겟 설정 (SimToolbar - 전체 넓이) */}
            <Card>
                <SimToolbar
                    fullBurstInterval={fullBurstInterval}
                    onFullBurstIntervalChange={handleFullBurstIntervalChange}
                    showCore={showCore}
                    onToggleCore={handleToggleCore}
                    coreSize={coreSize}
                    onCoreSizeChange={handleCoreSizeChange}
                    rangeMode={rangeMode}
                    onRangeModeChange={handleRangeModeChange}
                    weaknessElement={weaknessElement}
                    onWeaknessChange={handleWeaknessChange}
                    enemyDef={enemyDef}
                    onEnemyDefChange={handleEnemyDefChange}
                    onSimulate={handleSimulate}
                />
            </Card>

            {/* 4. 결과 요약 (전체 넓이) */}
            {simResult && (
                <Card>
                    <ResultSummary
                        summary={simResult}
                        showTeamTotal={slots.filter(s => s !== null).length > 1}
                        isCore={showCore}
                    />
                </Card>
            )}

            {/* 5. 하단 1열 전체넓이 통합 차트 */}
            <Card style={{ minHeight: '300px' }}>
                <div className="pa-4">
                    {chartDatasets.length > 0 ? (
                        <div>
                            {/* Tab Bar */}
                            <div className="mb-3" style={{ display: 'flex', gap: '8px' }}>
                                <ButtonToggle
                                    selected={chartTab === 'total'}
                                    onClick={() => setChartTab('total')}
                                    size="small"
                                >
                                    전체 대미지
                                </ButtonToggle>
                                <ButtonToggle
                                    selected={chartTab === 'dps'}
                                    onClick={() => setChartTab('dps')}
                                    size="small"
                                >
                                    초당 DPS
                                </ButtonToggle>
                                <ButtonToggle
                                    selected={chartTab === 'skill'}
                                    onClick={() => setChartTab('skill')}
                                    size="small"
                                >
                                    스킬 대미지
                                </ButtonToggle>
                            </div>
                            {chartTab === 'total' ? (
                                <CanvasChart
                                    datasets={chartDatasets}
                                    burstWindows={burstWindows}
                                    title={showCore ? 'Cumulative Damage (With Core)' : 'Cumulative Damage (No Core)'}
                                    charIdToName={charIdToName}
                                />
                            ) : chartTab === 'dps' ? (
                                <CanvasDpsChart
                                    datasets={dps1sDatasets}
                                    burstWindows={burstWindows}
                                    title={showCore ? '1s Interval DPS (With Core)' : '1s Interval DPS (No Core)'}
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
                            {simResult && <CanvasTimelineChart summary={simResult} duration={180} />}
                        </div>
                    ) : (
                        <h2 className="chart-title-empty">차트</h2>
                    )}
                </div>
            </Card>

            {/* 6. 캐릭터 상세 정보 설정 모달 팝업 (비어있지 않은 슬롯) */}
            <Modal
                isOpen={activeDetailModalIdx !== null}
                onClose={() => setActiveDetailModalIdx(null)}
                title={
                    activeDetailModalIdx !== null && slots[activeDetailModalIdx]?.char
                        ? slots[activeDetailModalIdx]!.char.label
                        : `슬롯 ${activeDetailModalIdx !== null ? activeDetailModalIdx + 1 : 1} 설정`
                }
                maxWidth={560}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                        <Button size="small" onClick={() => setActiveDetailModalIdx(null)}>
                            완료
                        </Button>
                    </div>
                }
            >
                {activeDetailModalIdx !== null && (
                    <CharacterSlot
                        slot={slots[activeDetailModalIdx]}
                        index={activeDetailModalIdx}
                        onUpdate={(patch) => updateSlot(activeDetailModalIdx, patch)}
                        outpostState={outpostState}
                    />
                )}
            </Modal>

            {/* 7. 캐릭터 선택 모달 팝업 (비어있는 슬롯 선택 시) */}
            <Modal
                isOpen={charSelectionModalSlotIdx !== null}
                onClose={() => setCharSelectionModalSlotIdx(null)}
                title={`슬롯 ${charSelectionModalSlotIdx !== null ? charSelectionModalSlotIdx + 1 : 1} 캐릭터 배치`}
                maxWidth={480}
            >
                {charSelectionModalSlotIdx !== null && (
                    <CharacterSelectionPanel
                        onSelectCharacter={(charOption) => {
                            updateSlot(charSelectionModalSlotIdx, { char: charOption });
                            setCharSelectionModalSlotIdx(null);
                        }}
                        currentSquadCharIds={currentSquadCharIds}
                    />
                )}
            </Modal>

            {/* 8. blablalink 프로필 동기화 모달 */}
            <ProfileSyncModal
                isOpen={isProfileSyncOpen}
                onClose={() => setIsProfileSyncOpen(false)}
                onSyncComplete={(updatedOutpost) => {
                    setOutpostState(updatedOutpost);
                    setSlots(prev => prev.map(s => {
                        if (!s || !s.char) return s;
                        const fresh = getCharDefaultState(s.char);
                        return { ...s, ...fresh, char: s.char };
                    }));
                }}
            />
        </Grid>
    );
};

export default Home;