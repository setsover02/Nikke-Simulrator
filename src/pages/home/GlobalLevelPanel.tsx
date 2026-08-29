/**
 * GlobalLevelPanel.tsx
 * 홈 화면 상단의 글로벌 레벨 설정 패널
 *
 * - 싱크로(캐릭터) 레벨 — 전체 공통
 * - 클래스 콘솔: 화력형 / 방어형 / 지원형
 * - 기업 콘솔:  엘리시온 / 미실리스 / 테트라 / 필그림 / 어브노말
 * - 공통 콘솔 (commonResearchLevel)
 * - 하모니 큐브 레벨: 16종 큐브 레벨 (텍스트 필드 내부에 큐브 이미지 삽입, 세로 1행 나열)
 */

import React, { useState, useEffect } from 'react';
import { SavedOutpostState, loadGlobalCubeLevels, saveGlobalCubeLevel } from '../../utils/storageUtils';
import { TextField } from '../../components/TextField';
import Font from '../../components/Font';
import { Button } from '../../components/Button/Button';

// 큐브 이미지 모듈 로드
const cubeImageModules = import.meta.glob('/src/assets/cube/*.webp', {
    eager: true,
    query: '?url',
    import: 'default'
}) as Record<string, string>;

function getCubeImageUrl(id: string): string | undefined {
    return cubeImageModules[`/src/assets/cube/${id}.webp`];
}

// 16종 하모니 큐브 정의
export const CUBE_LIST = [
    { id: '01-cube-assault', name: '어썰트', desc: '명중률' },
    { id: '02-cube-onslaught', name: '택티컬 어설트', desc: '차지 대미지' },
    { id: '03-cube-resilience', name: '렐릭 베어', desc: '재장전 속도' },
    { id: '04-cube-bastion', name: '택티컬 베어', desc: '탄환 충전' },
    { id: '05-cube-adjutant', name: '렐릭 부스트', desc: '차지 속도' },
    { id: '06-cube-wingman', name: '택티컬 부스트', desc: '최대 장탄' },
    { id: '07-cube-quantum', name: '렐릭 퀀텀', desc: '버스트 게이지' },
    { id: '08-cube-vigor', name: '렐릭 비고르', desc: '최대 체력' },
    { id: '09-cube-endurance', name: '렐릭 인듀어', desc: '방어력' },
    { id: '10-cube-healing', name: '렐릭 힐링', desc: '힐량 증가' },
    { id: '11-cube-tempering', name: '렐릭 템퍼링', desc: '받는 댐감' },
    { id: '12-cube-assist', name: '렐릭 어시스터', desc: 'HP 회복' },
    { id: '13-cube-destruction', name: '렐릭 디스트로이', desc: '파츠 대미지' },
    { id: '14-cube-piercing', name: '렐릭 피어싱', desc: '관통 대미지' },
    { id: '15-cube-crash', name: '렐릭 크래시', desc: '방어력 무시' },
    { id: '16-cube-divide', name: '렐릭 디바이드', desc: '분배 대미지' },
];

interface GlobalLevelPanelProps {
    outpostState: SavedOutpostState;
    onChange: (patch: Partial<SavedOutpostState>) => void;
    onCubeChange?: (cubeId: string, level: string) => void;
    onOpenProfileSync?: () => void;
}

/* ─── 인라인 스타일 상수 ──────────────────────────────────────────── */

const S = {
    panel: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
    },
    divider: {
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
    },
    fieldRow: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap' as const,
    },
    column: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    },
    columnHeader: {
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    cubeList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    },
};

/* ─── 인풋 컴포넌트 ──────────────────────────────────────────────── */

interface LevelInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    max?: number;
    min?: number;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
}

const LevelInput: React.FC<LevelInputProps> = ({
    id,
    label,
    value,
    onChange,
    max = 9999,
    min = 0,
    fullWidth = false,
    leftIcon,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (v === '' || v === '-') { onChange(v); return; }
        const n = parseInt(v);
        if (isNaN(n)) return;
        onChange(String(Math.max(min, Math.min(max, n))));
    };

    return (
        <div style={{ flex: fullWidth ? '1 1 100%' : '1 1 calc(50% - 4px)', minWidth: fullWidth ? '100%' : '120px' }}>
            <TextField
                id={id}
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={handleChange}
                label={<Font variant="caption-1" color="muted">{label}</Font>}
                size="small"
                leftIcon={leftIcon}
            />
        </div>
    );
};

/* ─── 메인 패널 ──────────────────────────────────────────────────── */

export const GlobalLevelPanel: React.FC<GlobalLevelPanelProps> = ({
    outpostState,
    onChange,
    onCubeChange,
    onOpenProfileSync,
}) => {
    const [cubeLevels, setCubeLevels] = useState<Record<string, string>>(() => loadGlobalCubeLevels());

    // outpostState나 외부 변경 시 큐브 레벨 동기화
    useEffect(() => {
        setCubeLevels(loadGlobalCubeLevels());
    }, [outpostState]);

    const handleCubeLevelChange = (cubeId: string, val: string) => {
        const cleanVal = val === '' ? '0' : val;
        saveGlobalCubeLevel(cubeId, cleanVal);
        setCubeLevels(prev => ({ ...prev, [cubeId]: cleanVal }));
        onCubeChange?.(cubeId, cleanVal);
    };

    return (
        <div style={S.panel} className="pt-3 pb-3 px-2">
            {/* 헤더 */}
            <div style={S.header}>
                <Font as="h3" variant="subtitle" weight="bold" color="default" className="m-0" style={{ letterSpacing: '0.04em' }}>전초기지</Font>
                {onOpenProfileSync && (
                    <Button
                        variant="assistive"
                        size="small"
                        onClick={onOpenProfileSync}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                        🔄 내 스펙 동기화 (CSV)
                    </Button>
                )}
            </div>

            <div className="my-1" style={{ ...S.divider, margin: '4px -16px' }} />

            <div style={S.column}>
                {/* 싱크로 레벨 */}
                <div>
                    <LevelInput
                        id="global-synchro-level"
                        min={1}
                        max={1200}
                        value={outpostState.synchroLevel}
                        onChange={v => onChange({ synchroLevel: v })}
                        label="싱크로 레벨"
                        fullWidth
                    />
                </div>

                <div className="my-1" style={{ ...S.divider, margin: '4px -16px' }} />

                {/* 공통 콘솔 */}
                <div>
                    <div style={S.columnHeader} className="pb-1 mb-1">
                        <Font variant="caption-1" color="muted">공통 콘솔</Font>
                    </div>
                    <LevelInput
                        id="global-common-console"
                        label="공통 연구"
                        value={outpostState.commonResearchLevel}
                        onChange={v => onChange({ commonResearchLevel: v })}
                        max={9999}
                        fullWidth
                    />
                </div>

                {/* 클래스 콘솔 */}
                <div>
                    <div style={S.columnHeader} className="pb-1 mb-1">
                        <Font variant="caption-1" color="muted">클래스 콘솔</Font>
                    </div>
                    <div style={S.fieldRow}>
                        <LevelInput
                            id="global-attacker-console"
                            label="화력형"
                            value={outpostState.attackerConsole}
                            onChange={v => onChange({ attackerConsole: v })}
                        />
                        <LevelInput
                            id="global-defender-console"
                            label="방어형"
                            value={outpostState.defenderConsole}
                            onChange={v => onChange({ defenderConsole: v })}
                        />
                        <LevelInput
                            id="global-supporter-console"
                            label="지원형"
                            value={outpostState.supporterConsole}
                            onChange={v => onChange({ supporterConsole: v })}
                        />
                    </div>
                </div>

                {/* 기업 콘솔 */}
                <div>
                    <div style={S.columnHeader} className="pb-1 mb-1">
                        <Font variant="caption-1" color="muted">기업 콘솔</Font>
                    </div>
                    <div style={S.fieldRow}>
                        <LevelInput
                            id="global-elysion-console"
                            label="엘리시온"
                            value={outpostState.elysionConsole}
                            onChange={v => onChange({ elysionConsole: v })}
                        />
                        <LevelInput
                            id="global-missilis-console"
                            label="미실리스"
                            value={outpostState.missilisConsole}
                            onChange={v => onChange({ missilisConsole: v })}
                        />
                        <LevelInput
                            id="global-tetra-console"
                            label="테트라"
                            value={outpostState.tetraConsole}
                            onChange={v => onChange({ tetraConsole: v })}
                        />
                        <LevelInput
                            id="global-pilgrim-console"
                            label="필그림"
                            value={outpostState.pilgrimConsole}
                            onChange={v => onChange({ pilgrimConsole: v })}
                        />
                        <LevelInput
                            id="global-abnormal-console"
                            label="어브노말"
                            value={outpostState.abnormalConsole}
                            onChange={v => onChange({ abnormalConsole: v })}
                        />
                    </div>
                </div>

                <div className="my-1" style={{ ...S.divider, margin: '4px -16px' }} />

                {/* 하모니 큐브 레벨 (16종 세로 1행 리스트, 텍스트 필드 내부에 큐브 이미지 렌더링) */}
                <div>
                    <div style={S.columnHeader} className="pb-1 mb-2">
                        <Font variant="caption-1" color="muted">하모니 큐브 (기본값: 0)</Font>
                    </div>
                    <div style={S.cubeList}>
                        {CUBE_LIST.map(cube => {
                            const currentLevel = cubeLevels[cube.id] || '0';
                            const imgUrl = getCubeImageUrl(cube.id);
                            return (
                                <LevelInput
                                    key={cube.id}
                                    id={`cube-level-${cube.id}`}
                                    label={`${cube.name} (${cube.desc})`}
                                    value={currentLevel}
                                    onChange={v => handleCubeLevelChange(cube.id, v)}
                                    min={0}
                                    max={15}
                                    fullWidth
                                    leftIcon={
                                        imgUrl ? (
                                            <img
                                                src={imgUrl}
                                                alt={cube.name}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    objectFit: 'contain',
                                                    borderRadius: '4px',
                                                    marginLeft: '4px',
                                                    marginRight: '2px',
                                                    flexShrink: 0,
                                                }}
                                            />
                                        ) : undefined
                                    }
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalLevelPanel;
