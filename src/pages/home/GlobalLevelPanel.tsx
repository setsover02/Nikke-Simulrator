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

interface GlobalLevelPanelProps {
    outpostState: SavedOutpostState;
    onChange: (patch: Partial<SavedOutpostState>) => void;
}

/* ─── 인라인 스타일 상수 ──────────────────────────────────────────── */

const S = {
    panel: {
        background: 'var(--Shade10, #161b26)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '14px',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '2px',
    },
    headerTitle: {
        color: '#e0e0e0',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        margin: 0,
    },
    headerBadge: {
        fontSize: '10px',
        color: '#60a5fa',
        background: 'rgba(96,165,250,0.12)',
        border: '1px solid rgba(96,165,250,0.3)',
        borderRadius: '4px',
        padding: '1px 6px',
    },
    divider: {
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
        margin: '0 -4px',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap' as const,
    },
    group: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px',
    },
    label: {
        fontSize: '11px',
        color: '#888',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap' as const,
    },
    fieldRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap' as const,
    },
    field: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    fieldLabel: {
        fontSize: '11px',
        color: '#aaa',
        whiteSpace: 'nowrap' as const,
        minWidth: '48px',
    },
    input: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '6px',
        color: '#e0e0e0',
        fontSize: '13px',
        fontFamily: 'inherit',
        textAlign: 'right' as const,
        width: '52px',
        padding: '4px 8px',
        outline: 'none',
        transition: 'border-color 0.15s',
    },
    inputWide: {
        width: '64px',
    },
    synchroInput: {
        width: '72px',
        fontSize: '16px',
        fontWeight: 700,
        color: '#60a5fa',
        background: 'rgba(96,165,250,0.08)',
        border: '1px solid rgba(96,165,250,0.3)',
        borderRadius: '8px',
        textAlign: 'center' as const,
        padding: '6px 8px',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
    },
    synchroLabel: {
        fontSize: '11px',
        color: '#60a5fa',
        letterSpacing: '0.04em',
    },
    sectionTitle: {
        fontSize: '11px',
        color: '#666',
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        marginRight: '4px',
        whiteSpace: 'nowrap' as const,
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
        fontSize: '11px',
        color: '#666',
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
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
        <div style={S.field}>
            <label htmlFor={id} style={S.fieldLabel}>{label}</label>
            <input
                id={id}
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={handleChange}
                style={{ ...S.input, ...(wide ? S.inputWide : {}) }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(96,165,250,0.5)'; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
        </div>
    );
};

/* ─── 메인 패널 ──────────────────────────────────────────────────── */

const GlobalLevelPanel: React.FC<GlobalLevelPanelProps> = ({ outpostState, onChange }) => {
    return (
        <div style={S.panel}>
            {/* 헤더 */}
            <div style={S.header}>
                <span style={{ fontSize: '15px' }}>⚙</span>
                <h3 style={S.headerTitle}>글로벌 레벨 설정</h3>
                <span style={S.headerBadge}>전체 공통 적용</span>
            </div>

            <div style={S.divider} />

            {/* 메인 영역: 싱크로 레벨 + 콘솔 설정 */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* 싱크로 레벨 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '90px' }}>
                    <span style={S.synchroLabel}>싱크로 레벨</span>
                    <input
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
                        style={S.synchroInput}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(96,165,250,0.7)'; }}
                        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(96,165,250,0.3)'; }}
                    />
                    <span style={{ fontSize: '10px', color: '#555' }}>1 ~ 1200</span>
                </div>

                <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch', margin: '0 4px' }} />

                {/* 콘솔 설정 */}
                <div style={S.columns}>

                    {/* 공통 콘솔 */}
                    <div style={{ ...S.column, flex: '0 0 auto', minWidth: 'auto' }}>
                        <div style={S.columnHeader}>공통 콘솔</div>
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
                        <div style={S.columnHeader}>클래스 콘솔</div>
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
                        <div style={S.columnHeader}>기업 콘솔</div>
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
        </div>
    );
};

export default GlobalLevelPanel;
