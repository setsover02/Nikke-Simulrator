import React, { useRef } from 'react';
import { Button } from '../../components/Button/Button';
import { Switch } from '../../components/Switch/Switch';
import { ButtonIconToggle } from '../../components/Button/ButtonIconToggle';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { TextField } from '../../components/TextField';
import { RangeMode } from '../../constants/weaponStats';

import { CoreVisualizer } from './CoreVisualizer';

const ELEMENT_OPTIONS = [
    { value: '풍압', label: '풍압', iconName: 'code-anmi', element: 'wind' as const },
    { value: '철갑', label: '철갑', iconName: 'code-dmtr', element: 'iron' as const },
    { value: '전격', label: '전격', iconName: 'code-zeus', element: 'electric' as const },
    { value: '수냉', label: '수냉', iconName: 'code-psid', element: 'water' as const },
    { value: '작열', label: '작열', iconName: 'code-hsta', element: 'fire' as const },
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
    coreSize: number;
    onCoreSizeChange: (v: number) => void;
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
    coreSize, onCoreSizeChange,
    rangeMode, onRangeModeChange,
    weaknessElement, onWeaknessChange,
    enemyDef, onEnemyDefChange,
    onSimulate,
}) => {
    const sliderRef = useRef<HTMLDivElement>(null);
    const activeRangeOption = RANGE_OPTIONS.find(opt => opt.value === rangeMode);
    const activeWeapons = activeRangeOption ? activeRangeOption.weapons.split(' · ') : [];

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!sliderRef.current) return;
        try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch (err) { }

        const updateRange = (clientX: number) => {
            if (!sliderRef.current) return;
            const rect = sliderRef.current.getBoundingClientRect();
            let percent = (clientX - rect.left) / rect.width;
            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;

            const indexFloat = percent * (RANGE_OPTIONS.length - 1);
            const index = Math.round(indexFloat);
            const closest = RANGE_OPTIONS[index]?.value || RANGE_OPTIONS[0].value;

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
        <Grid columns={1} gap={3} className="pa-4">
            <Font as="h3" variant="subtitle" weight="bold">
                타겟 설정
            </Font>

            {/* 약점 속성 선택 */}
            <Grid columns={1} gap={1}>
                <Font as="span" variant="caption-1" color="muted">약점 속성</Font>
                <Grid columns={5} gap={1}>
                    {ELEMENT_OPTIONS.map(opt => (
                        <ButtonIconToggle
                            key={opt.value}
                            svgIcon={opt.iconName}
                            element={opt.element}
                            selected={weaknessElement === opt.value}
                            onClick={() => onWeaknessChange(opt.value)}
                            title={opt.label}
                        />
                    ))}
                </Grid>
            </Grid>

            {/* 코어 여부 및 크기 설정 */}
            <Grid columns={1} gap={1}>
                <Grid templateColumns="1fr auto" alignItems="center">
                    <Font as="span" variant="caption-1" color="muted">코어 여부</Font>
                    <Switch checked={showCore} onChange={onToggleCore} />
                </Grid>

                {showCore && (
                    <Grid columns={1} gap={1} className="mt-1">
                        <Grid templateColumns="1fr auto" alignItems="center">
                            <Font as="span" variant="caption-2" color="muted">코어 직경</Font>
                            <Font as="span" variant="caption-2" color="accent" weight="bold">
                                {coreSize}px
                            </Font>
                        </Grid>
                        <input
                            type="range"
                            min="10"
                            max="150"
                            step="2"
                            value={coreSize}
                            onChange={e => onCoreSizeChange(Number(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#ef4444' }}
                        />
                    </Grid>
                )}

                {/* 코어 & 탄착군 실시간 시각화 프리뷰 */}
                <CoreVisualizer
                    coreSize={coreSize}
                    showCore={showCore}
                    onCoreSizeChange={onCoreSizeChange}
                />
            </Grid>

            {/* 교전 거리 */}
            <Grid columns={1} gap={1}>
                <Grid templateColumns="1fr auto" alignItems="center">
                    <Font as="span" variant="caption-1" color="muted">교전 거리</Font>
                    <Grid templateColumns={`repeat(${activeWeapons.length}, auto)`} gap={1} justifyContent="end">
                        {activeWeapons.map(w => (
                            <Font as="span" key={w} variant="footnote" className="weapon-badge">{w}</Font>
                        ))}
                    </Grid>
                </Grid>

                <Grid columns={1} gap={1} className="mt-1">
                    <Grid columns={3} justifyContent="between" className="px-1">
                        <Font as="span" variant="footnote" color="muted">Near</Font>
                        <Font as="span" variant="footnote" color="muted" style={{ textAlign: 'center' }}>Mid</Font>
                        <Font as="span" variant="footnote" color="muted" style={{ textAlign: 'right' }}>Far</Font>
                    </Grid>
                    <div
                        className="range-slider-bg"
                        onPointerDown={handlePointerDown}
                        style={{ cursor: 'pointer', touchAction: 'none' }}
                    >
                        <div className="range-slider-inner" ref={sliderRef}>
                            <div className="range-track" />
                            <div
                                className="range-track-fill"
                                style={{ width: `${(RANGE_OPTIONS.findIndex(o => o.value === rangeMode) / (RANGE_OPTIONS.length - 1)) * 100}%` }}
                            />
                            {RANGE_OPTIONS.map((opt, i) => {
                                const leftPercent = (i / (RANGE_OPTIONS.length - 1)) * 100;
                                return (
                                    <div key={opt.value} className="range-dot" style={{ left: `${leftPercent}%` }} />
                                );
                            })}
                            <div
                                className="range-thumb active"
                                style={{ left: `${(RANGE_OPTIONS.findIndex(o => o.value === rangeMode) / (RANGE_OPTIONS.length - 1)) * 100}%` }}
                            >
                                <div className="range-point-inner" />
                            </div>
                        </div>
                    </div>
                    <Grid columns={RANGE_OPTIONS.length} justifyContent="between" className="px-1">
                        {RANGE_OPTIONS.map(opt => (
                            <Font
                                as="span"
                                key={opt.value}
                                variant="caption-2"
                                onClick={() => onRangeModeChange(opt.value)}
                                className={`range-value ${rangeMode === opt.value ? 'active' : 'inactive'}`}
                                style={{ textAlign: 'center' }}
                            >
                                {opt.label}
                            </Font>
                        ))}
                    </Grid>
                </Grid>
            </Grid>

            {/* 버스트 충전 시간 */}
            <TextField
                type="number"
                value={fullBurstInterval}
                onChange={e => onFullBurstIntervalChange(e.target.value)}
                step="0.01"
                min="2.52"
                label={<Font variant="caption-1" color="muted">버스트 충전 시간</Font>}
                suffix="초"
                hintText="버스트 충전 시간"
                size="small"
            />

            {/* 적 방어력 */}
            <TextField
                type="number"
                value={enemyDef}
                onChange={e => onEnemyDefChange(e.target.value)}
                label={<Font variant="caption-1" color="muted">적 방어력</Font>}
                hintText="유니온 사격장 기준 100"
                size="small"
            />

            {/* Simulate 버튼 */}
            <Button onClick={onSimulate} variant="primary" size="large">
                시뮬레이션
            </Button>
        </Grid>
    );
};

export default SimToolbar;
