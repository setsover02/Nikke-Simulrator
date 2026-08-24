/**
 * GlobalLevelPanel.tsx
 * 홈 화면 상단의 글로벌 레벨 설정 패널
 *
 * - 싱크로(캐릭터) 레벨 — 전체 공통
 * - 클래스 콘솔: 화력형 / 방어형 / 지원형
 * - 기업 콘솔:  엘리시온 / 미실리스 / 테트라 / 필그림 / 어브노말
 * - 공통 콘솔 (commonResearchLevel)
 */

import React from 'react';
import { SavedOutpostState } from '../../utils/storageUtils';
import { Textfield } from '../../components/Textfield/Textfield';
import { Font } from '../../components/Font';

interface GlobalLevelPanelProps {
    outpostState: SavedOutpostState;
    onChange: (patch: Partial<SavedOutpostState>) => void;
}

import { Card } from '../../components/Card/Card';

/* ─── 인라인 스타일 상수 ──────────────────────────────────────────── */

const S = {
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '2px',
    },
    divider: {
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
        margin: '0 -4px',
    },
    fieldRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap' as const,
    },
    columns: {
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap' as const,
        flex: 1,
    },
    column: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        flex: 1,
        minWidth: '200px',
    },
    columnHeader: {
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: '4px',
        marginBottom: '2px',
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
    wide?: boolean;
}

const LevelInput: React.FC<LevelInputProps> = ({ id, label, value, onChange, max = 9999, min = 0, wide }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (v === '' || v === '-') { onChange(v); return; }
        const n = parseInt(v);
        if (isNaN(n)) return;
        onChange(String(Math.max(min, Math.min(max, n))));
    };

    return (
        <div style={{ width: wide ? '140px' : '120px' }}>
            <Textfield
                id={id}
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={handleChange}
                label={label}
                size="small"
            />
        </div>
    );
};

/* ─── 메인 패널 ──────────────────────────────────────────────────── */

const GlobalLevelPanel: React.FC<GlobalLevelPanelProps> = ({ outpostState, onChange }) => {
    return (
        <Card as="section" className="mb-4 pa-4" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 헤더 */}
            <div style={S.header}>
                <Font as="h3" variant="subtitle" weight="bold" color="default" style={{ margin: 0, letterSpacing: '0.04em' }}>전초기지 레벨 설정</Font>
            </div>

            <div style={S.divider} />

            {/* 메인 영역: 싱크로 레벨 + 콘솔 설정 */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* 싱크로 레벨 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                    <Textfield
                        id="global-synchro-level"
                        type="number"
                        min={1}
                        max={1200}
                        value={outpostState.synchroLevel}
                        onChange={e => {
                            const v = e.target.value;
                            if (v === '') { onChange({ synchroLevel: '' }); return; }
                            const n = parseInt(v);
                            if (!isNaN(n)) onChange({ synchroLevel: String(Math.max(1, Math.min(1200, n))) });
                        }}
                        label="싱크로 레벨"
                    />
                </div>

                <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', margin: '0 4px' }} />

                {/* 콘솔 설정 */}
                <div style={S.columns}>

                    {/* 공통 콘솔 */}
                    <div style={{ ...S.column, flex: '0 0 auto', minWidth: 'auto' }}>
                        <div style={S.columnHeader}>
                            <Font variant="caption-1" color="muted">공통 콘솔</Font>
                        </div>
                        <LevelInput
                            id="global-common-console"
                            label="공통"
                            value={outpostState.commonResearchLevel}
                            onChange={v => onChange({ commonResearchLevel: v })}
                            max={9999}
                        />
                    </div>

                    {/* 클래스 콘솔 */}
                    <div style={S.column}>
                        <div style={S.columnHeader}>
                            <Font variant="caption-1" color="muted">클래스 콘솔</Font>
                        </div>
                        <div style={S.fieldRow}>
                            <LevelInput
                                id="global-attacker-console"
                                label="화력형"
                                value={outpostState.attackerConsole}
                                onChange={v => onChange({ attackerConsole: v })}
                                max={9999}
                            />
                            <LevelInput
                                id="global-defender-console"
                                label="방어형"
                                value={outpostState.defenderConsole}
                                onChange={v => onChange({ defenderConsole: v })}
                                max={9999}
                            />
                            <LevelInput
                                id="global-supporter-console"
                                label="지원형"
                                value={outpostState.supporterConsole}
                                onChange={v => onChange({ supporterConsole: v })}
                                max={9999}
                            />
                        </div>
                    </div>

                    {/* 기업 콘솔 */}
                    <div style={S.column}>
                        <div style={S.columnHeader}>
                            <Font variant="caption-1" color="muted">기업 콘솔</Font>
                        </div>
                        <div style={S.fieldRow}>
                            <LevelInput
                                id="global-elysion-console"
                                label="엘리시온"
                                value={outpostState.elysionConsole}
                                onChange={v => onChange({ elysionConsole: v })}
                                max={9999}
                                wide
                            />
                            <LevelInput
                                id="global-missilis-console"
                                label="미실리스"
                                value={outpostState.missilisConsole}
                                onChange={v => onChange({ missilisConsole: v })}
                                max={9999}
                                wide
                            />
                            <LevelInput
                                id="global-tetra-console"
                                label="테트라"
                                value={outpostState.tetraConsole}
                                onChange={v => onChange({ tetraConsole: v })}
                                max={9999}
                                wide
                            />
                        </div>
                        <div style={S.fieldRow}>
                            <LevelInput
                                id="global-pilgrim-console"
                                label="필그림"
                                value={outpostState.pilgrimConsole}
                                onChange={v => onChange({ pilgrimConsole: v })}
                                max={9999}
                                wide
                            />
                            <LevelInput
                                id="global-abnormal-console"
                                label="어브노말"
                                value={outpostState.abnormalConsole}
                                onChange={v => onChange({ abnormalConsole: v })}
                                max={9999}
                                wide
                            />
                        </div>
                    </div>

                </div>
            </div>
        </Card>
    );
};

export default GlobalLevelPanel;
