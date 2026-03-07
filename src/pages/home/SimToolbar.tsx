import React from 'react';
import iconAnmi from '../../assets/icon/code-anmi.svg';
import iconDmtr from '../../assets/icon/code-dmtr.svg';
import iconHsta from '../../assets/icon/code-hsta.svg';
import iconPsid from '../../assets/icon/code-psid.svg';
import iconZeus from '../../assets/icon/code-zeus.svg';
import { RangeMode } from '../../constants/weaponStats';

const ELEMENT_OPTIONS = [
    { value: '풍압', label: '풍압', icon: iconAnmi },
    { value: '철갑', label: '철갑', icon: iconDmtr },
    { value: '작열', label: '작열', icon: iconHsta },
    { value: '수냉', label: '수냉', icon: iconPsid },
    { value: '전격', label: '전격', icon: iconZeus },
];

const RANGE_OPTIONS: { value: RangeMode; label: string; weapons: string }[] = [
    { value: 0, label: '0', weapons: 'SG' },
    { value: 15, label: '15', weapons: 'SG · SMG' },
    { value: 25, label: '25', weapons: 'SG · SMG · AR' },
    { value: 35, label: '35', weapons: 'SMG · AR · MG' },
    { value: 45, label: '45', weapons: 'AR · MG · SR' },
    { value: 55, label: '55', weapons: 'MG · SR' },
    { value: 100, label: '100', weapons: 'SR' },
];

interface SimToolbarProps {
    slotsCount: number;
    onAddSlot: () => void;
    fullBurstInterval: string;
    onFullBurstIntervalChange: (v: string) => void;
    showCore: boolean;
    onToggleCore: () => void;
    rangeMode: RangeMode;
    onRangeModeChange: (v: RangeMode) => void;
    weaknessElement: string;
    onWeaknessChange: (v: string) => void;
    enemyDef: string;
    onEnemyDefChange: (v: string) => void;
    onSimulate: () => void;
}

const SimToolbar: React.FC<SimToolbarProps> = ({
    slotsCount, onAddSlot,
    fullBurstInterval, onFullBurstIntervalChange,
    showCore, onToggleCore,
    rangeMode, onRangeModeChange,
    weaknessElement, onWeaknessChange,
    enemyDef, onEnemyDefChange,
    onSimulate,
}) => {
    return (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 캐릭터 추가 */}
            <button
                onClick={onAddSlot}
                disabled={slotsCount >= 5}
                style={{
                    padding: '10px 18px', fontSize: '14px',
                    background: slotsCount >= 5 ? '#2a2a2a' : '#1e3a1e',
                    color: slotsCount >= 5 ? '#555' : '#52c41a',
                    border: `1px solid ${slotsCount >= 5 ? '#333' : '#52c41a'}`,
                    borderRadius: '5px', cursor: slotsCount >= 5 ? 'not-allowed' : 'pointer',
                }}
            >
                + 캐릭터 추가 ({slotsCount}/5)
            </button>

            {/* Full Burst 간격 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', background: '#1e1e2e',
                borderRadius: '6px', border: '1px solid #444',
            }}>
                <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>🟨 Full Burst 간격(초)</span>
                <input
                    type="number"
                    value={fullBurstInterval}
                    onChange={e => onFullBurstIntervalChange(e.target.value)}
                    min={2.52}
                    step={0.01}
                    style={{
                        width: '90px', padding: '5px 8px', fontSize: '14px',
                        background: '#0f0f1a', color: '#e0e0e0',
                        border: '1px solid #555', borderRadius: '4px',
                        textAlign: 'right',
                    }}
                />
            </div>

            {/* 코어 토글 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 14px', background: '#1e1e2e',
                borderRadius: '6px', border: '1px solid #444',
            }}>
                <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>🎯 코어 히트</span>
                <div
                    onClick={onToggleCore}
                    style={{
                        width: '44px', height: '24px', borderRadius: '12px',
                        background: showCore ? '#f59e0b' : '#374151',
                        border: `1px solid ${showCore ? '#d97706' : '#4b5563'}`,
                        cursor: 'pointer', position: 'relative',
                        transition: 'background 0.2s, border-color 0.2s',
                    }}
                >
                    <div style={{
                        position: 'absolute', top: '3px',
                        left: showCore ? '22px' : '3px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: showCore ? '#fff' : '#9ca3af',
                        transition: 'left 0.2s',
                    }} />
                </div>
                <span style={{ color: showCore ? '#f59e0b' : '#555', fontSize: '12px', minWidth: '46px' }}>
                    {showCore ? 'ON' : 'OFF'}
                </span>
            </div>

            {/* 거리 슬라이더 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 14px', background: '#1e1e2e',
                borderRadius: '6px', border: '1px solid #555', width: '440px',
                marginLeft: 'auto',
            }}>
                <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>🎯 교전 거리</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <input
                        type="range" min={0} max={6}
                        value={RANGE_OPTIONS.findIndex(o => o.value === rangeMode)}
                        onChange={e => onRangeModeChange(RANGE_OPTIONS[+e.target.value].value)}
                        style={{ width: '220px', accentColor: '#60a5fa', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px' }}>
                        {RANGE_OPTIONS.map(opt => (
                            <button key={opt.value}
                                onClick={() => onRangeModeChange(opt.value)}
                                style={{
                                    fontSize: '10px', padding: '1px 3px',
                                    background: rangeMode === opt.value ? '#3b82f660' : 'transparent',
                                    color: rangeMode === opt.value ? '#60a5fa' : '#666',
                                    border: rangeMode === opt.value ? '1px solid #3b82f6' : '1px solid #444',
                                    borderRadius: '3px', cursor: 'pointer',
                                }}
                            >{opt.label}</button>
                        ))}
                    </div>
                </div>
                <span style={{ color: '#60a5fa', fontSize: '11px', whiteSpace: 'nowrap', minWidth: '100px', display: 'inline-block' }}>
                    +30%&nbsp;→&nbsp;{RANGE_OPTIONS.find(o => o.value === rangeMode)?.weapons}
                </span>
            </div>

            {/* 약점 속성 선택 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 8px', background: '#1e1e2e',
                borderRadius: '6px', border: '1px solid #444',
                marginLeft: '8px'
            }}>
                <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap', marginRight: '4px' }}>약점 속성</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                    {ELEMENT_OPTIONS.map(opt => (
                        <button key={opt.value}
                            onClick={() => onWeaknessChange(opt.value)}
                            style={{
                                width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: weaknessElement === opt.value ? '#3b82f660' : 'transparent',
                                border: weaknessElement === opt.value ? '1px solid #3b82f6' : '1px solid transparent',
                                borderRadius: '4px', cursor: 'pointer'
                            }}
                            title={opt.label}
                        >
                            <img src={opt.icon} alt={opt.label} style={{ width: '24px', height: '24px' }} />
                        </button>
                    ))}
                </div>
            </div>

            {/* 적 방어력 입력 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', background: '#1e1e2e',
                borderRadius: '6px', border: '1px solid #444',
                marginLeft: '8px',
            }}>
                <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>🛡️ 적 방어력</span>
                <input
                    type="number"
                    value={enemyDef}
                    onChange={e => onEnemyDefChange(e.target.value)}
                    min={0}
                    style={{
                        width: '90px', padding: '5px 8px', fontSize: '14px',
                        background: '#0f0f1a', color: '#e0e0e0',
                        border: '1px solid #555', borderRadius: '4px',
                        textAlign: 'right',
                    }}
                />
            </div>

            {/* Simulate 버튼 */}
            <button
                onClick={onSimulate}
                style={{
                    padding: '10px 24px', fontSize: '16px',
                    background: '#007bff', color: 'white',
                    border: 'none', borderRadius: '5px', cursor: 'pointer',
                }}
            >
                Simulate (3 Mins)
            </button>
        </div>
    );
};

export default SimToolbar;
