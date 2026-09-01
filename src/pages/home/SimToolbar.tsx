import React from 'react';
import { Button } from '../../components/Button/Button';
import { Switch } from '../../components/Switch/Switch';
import { Slider } from '../../components/Slider/Slider';
import { Chip } from '../../components/Chip/Chip';
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
    const activeRangeOption = RANGE_OPTIONS.find(opt => opt.value === rangeMode);
    const activeWeapons = activeRangeOption ? activeRangeOption.weapons.split(' · ') : [];
    const currentRangeIndex = RANGE_OPTIONS.findIndex(opt => opt.value === rangeMode);

    const rangeMarks = RANGE_OPTIONS.map((opt, idx) => ({
        value: idx,
        label: opt.label,
    }));

    return (
        <Grid columns={1} gap={2} className="pa-3">
            {/* 상단 헤더: 타이틀 & 시뮬레이션 버튼 */}
            <Grid templateColumns="1fr auto" alignItems="center">
                <Font as="h3" variant="subtitle" weight="bold">
                    타겟 설정
                </Font>
                <Button onClick={onSimulate} variant="primary" size="default">
                    시뮬레이션
                </Button>
            </Grid>

            {/* 설정 영역: 가로 3개 컬럼 그룹 */}
            <Grid columns={{ xs: 1, md: 2, lg: 3 }} gap={3} alignItems="start">
                {/* 그룹 1: 타겟 속성 및 스펙 */}
                <Grid columns={1} gap={2}>
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

                    {/* 적 방어력 & 버스트 충전 시간 (가로 2열) */}
                    <Grid columns={2} gap={1}>
                        <TextField
                            type="number"
                            value={enemyDef}
                            onChange={e => onEnemyDefChange(e.target.value)}
                            label={<Font variant="caption-1" color="muted">적 방어력</Font>}
                            hintText="유니온 100"
                            size="small"
                        />
                        <TextField
                            type="number"
                            value={fullBurstInterval}
                            onChange={e => onFullBurstIntervalChange(e.target.value)}
                            step="0.01"
                            min="2.52"
                            label={<Font variant="caption-1" color="muted">버스트 충전</Font>}
                            suffix="초"
                            size="small"
                        />
                    </Grid>
                </Grid>

                {/* 그룹 2: 교전 거리 설정 */}
                <Grid columns={1} gap={1}>
                    <Grid templateColumns="1fr auto" alignItems="center">
                        <Font as="span" variant="caption-1" color="muted">교전 거리</Font>
                        <Grid templateColumns={`repeat(${activeWeapons.length}, auto)`} gap={1} justifyContent="end">
                            {activeWeapons.map(w => (
                                <Chip key={w}>{w}</Chip>
                            ))}
                        </Grid>
                    </Grid>

                    <Grid columns={1} gap={1} className="mt-1">
                        <Grid columns={3} justifyContent="between" className="px-1">
                            <Font as="span" variant="footnote" color="muted">Near</Font>
                            <Font as="span" variant="footnote" color="muted" style={{ textAlign: 'center' }}>Mid</Font>
                            <Font as="span" variant="footnote" color="muted" style={{ textAlign: 'right' }}>Far</Font>
                        </Grid>
                        <Slider
                            min={0}
                            max={RANGE_OPTIONS.length - 1}
                            step={1}
                            type="discrete"
                            value={currentRangeIndex >= 0 ? currentRangeIndex : 0}
                            onChange={idx => {
                                const selected = RANGE_OPTIONS[idx];
                                if (selected) onRangeModeChange(selected.value);
                            }}
                            marks={rangeMarks}
                            formatTooltip={idx => {
                                const opt = RANGE_OPTIONS[idx];
                                return opt ? `${opt.label} (${opt.weapons})` : '';
                            }}
                        />
                    </Grid>
                </Grid>

                {/* 그룹 3: 코어 여부, 직경 및 탄착군 시각화 */}
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
                            <Slider
                                min={10}
                                max={150}
                                step={2}
                                value={coreSize}
                                onChange={onCoreSizeChange}
                                formatTooltip={v => `${v}px`}
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
            </Grid>
        </Grid>
    );
};

export default SimToolbar;
