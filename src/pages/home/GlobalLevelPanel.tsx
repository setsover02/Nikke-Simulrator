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
import { TextField } from '../../components/TextField';
import Font from '../../components/Font';

import { Button } from '../../components/Button/Button';

interface GlobalLevelPanelProps {
    outpostState: SavedOutpostState;
    onChange: (patch: Partial<SavedOutpostState>) => void;
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
}

const LevelInput: React.FC<LevelInputProps> = ({ id, label, value, onChange, max = 9999, min = 0, fullWidth = false }) => {
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
            />
        </div>
    );
};

/* ─── 메인 패널 ──────────────────────────────────────────────────── */

const GlobalLevelPanel: React.FC<GlobalLevelPanelProps> = ({ outpostState, onChange, onOpenProfileSync }) => {
    return (
        <div style={S.panel} className="pt-3 pb-3 px-2">
            {/* 헤더 */}
            <div style={S.header}>
                <Font as="h3" variant="subtitle" weight="bold" color="default" className="m-0" style={{ letterSpacing: '0.04em' }}>전초기지 레벨 설정</Font>
                {onOpenProfileSync && (
                    <Button
                        variant="assistive"
                        size="small"
                        onClick={onOpenProfileSync}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                        🔄 내 스펙 동기화
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
            </div>
        </div>
    );
};

export default GlobalLevelPanel;
