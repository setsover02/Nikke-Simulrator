import React, { useRef, useEffect } from 'react';
import iconAnmi from '../../assets/icon/code-anmi.svg';
import iconDmtr from '../../assets/icon/code-dmtr.svg';
import iconHsta from '../../assets/icon/code-hsta.svg';
import iconPsid from '../../assets/icon/code-psid.svg';
import iconZeus from '../../assets/icon/code-zeus.svg';
import { RangeMode } from '../../constants/weaponStats';

const ELEMENT_OPTIONS = [
    { value: '풍압', label: '풍압', icon: iconAnmi },
    { value: '철갑', label: '철갑', icon: iconDmtr },
    { value: '전격', label: '전격', icon: iconZeus },
    { value: '수냉', label: '수냉', icon: iconPsid },
    { value: '작열', label: '작열', icon: iconHsta },
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
    fullBurstInterval, onFullBurstIntervalChange,
    showCore, onToggleCore,
    rangeMode, onRangeModeChange,
    weaknessElement, onWeaknessChange,
    enemyDef, onEnemyDefChange,
    onSimulate,
}) => {
    const sliderRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!sliderRef.current) return;
        (e.target as Element).setPointerCapture(e.pointerId);

        const updateRange = (clientX: number) => {
            if (!sliderRef.current) return;
            const rect = sliderRef.current.getBoundingClientRect();
            let percent = (clientX - rect.left) / rect.width;
            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;

            const indexFloat = percent * (RANGE_OPTIONS.length - 1);
            const index = Math.round(indexFloat);
            const closest = RANGE_OPTIONS[index].value;

            if (closest !== rangeMode) {
                onRangeModeChange(closest);
            }
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            updateRange(moveEvent.clientX);
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            updateRange(upEvent.clientX);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        // Initial click update
        updateRange(e.clientX);
    };

    return (
        <div className="toolbar-container">
            <h3 className="toolbar-title">타겟 설정</h3>

            {/* 약점 속성 선택 */}
            <div className="flex-col-gap-8">
                <span className="color-aaa-12">약점 속성</span>
                <div className="element-buttons">
                    {ELEMENT_OPTIONS.map(opt => (
                        <button key={opt.value}
                            onClick={() => onWeaknessChange(opt.value)}
                            className={`element-btn ${weaknessElement === opt.value ? 'active' : 'inactive'}`}
                            title={opt.label}
                        >
                            <img src={opt.icon} alt={opt.label} className={`element-icon ${weaknessElement === opt.value ? 'active' : 'inactive'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* 코어 여부 */}
            <div className="flex-between-center">
                <span className="color-aaa-12">코어 여부</span>
                <div onClick={onToggleCore} className={`toggle-bg ${showCore ? 'on' : 'off'}`}>
                    <div className={`toggle-knob ${showCore ? 'on' : 'off'}`} />
                </div>
            </div>

            {/* 교전 거리 */}
            <div className="flex-col-gap-8">
                <div className="flex-between-center">
                    <span className="color-aaa-12">교전 거리</span>
                    <div className="weapon-badge-container">
                        {RANGE_OPTIONS.find(opt => opt.value === rangeMode)?.weapons.split(' · ').map(w => (
                            <span key={w} className="weapon-badge">{w}</span>
                        ))}
                    </div>
                </div>

                <div className="flex-col-gap-8" style={{ marginTop: '10px' }}>
                    <div className="range-labels">
                        <span>Near</span>
                        <span>Mid</span>
                        <span>Far</span>
                    </div>
                    <div
                        className="range-slider-bg"
                        ref={sliderRef}
                        onPointerDown={handlePointerDown}
                        style={{ cursor: 'pointer', touchAction: 'none' }}
                    >
                        {RANGE_OPTIONS.map((opt, i) => (
                            <React.Fragment key={opt.value}>
                                {i > 0 && <div className={`range-line ${rangeMode >= opt.value ? 'active' : 'inactive'}`} />}
                                <div className={`range-point ${rangeMode === opt.value ? 'active' : 'inactive'}`}>
                                    {rangeMode === opt.value && <div className="range-point-inner" />}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="range-values">
                        {RANGE_OPTIONS.map(opt => (
                            <span key={opt.value} onClick={() => onRangeModeChange(opt.value)} className={`range-value ${rangeMode === opt.value ? 'active' : 'inactive'}`}>
                                {opt.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 버스트 충전 시간 */}
            <div className="toolbar-section">
                <div className="flex-between-center">
                    <span className="color-aaa-12">버스트 충전 시간</span>
                    <div>
                        <input
                            type="number" value={fullBurstInterval} onChange={e => onFullBurstIntervalChange(e.target.value)}
                            className="toolbar-input"
                            step="0.01" min="2.52"
                        />
                        <span className="toolbar-unit"> 초</span>
                    </div>
                </div>
                <span className="toolbar-hint">버스트 충전 시간</span>
            </div>

            {/* 적 방어력 */}
            <div className="toolbar-section padded-bot">
                <div className="flex-between-center">
                    <span className="color-aaa-12">적 방어력</span>
                    <input
                        type="number" value={enemyDef} onChange={e => onEnemyDefChange(e.target.value)}
                        className="toolbar-input"
                    />
                </div>
                <span className="toolbar-hint">유니온 사격장 기준 100</span>
            </div>

            {/* Simulate 부튼 */}
            <button onClick={onSimulate} className="simulate-btn">
                시뮬레이션
            </button>
        </div>
    );
};

export default SimToolbar;
