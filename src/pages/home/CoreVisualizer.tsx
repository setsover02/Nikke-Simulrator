import React, { useState } from 'react';
import { Font } from '../../components/Font';
import {
    WeaponType,
    calcCoreHitProb,
    calcSpreadDiameter,
    DEFAULT_BODY_PX,
} from '../../engine/accuraySystem';
import styles from './CoreVisualizer.module.scss';

interface CoreVisualizerProps {
    coreSize: number;
    showCore: boolean;
    onCoreSizeChange?: (size: number) => void;
}

const WEAPON_PREVIEWS: { key: WeaponType; label: string; name: string }[] = [
    { key: WeaponType.AR, label: 'AR', name: '돌격소총' },
    { key: WeaponType.SMG, label: 'SMG', name: '기관단총' },
    { key: WeaponType.SG, label: 'SG', name: '샷건' },
    { key: WeaponType.SR, label: 'SR/MG', name: '정밀/예열' },
];

const PRESETS = [
    { size: 26, label: '26px (소형)' },
    { size: 52, label: '52px (표준)' },
    { size: 80, label: '80px (중대형)' },
    { size: 110, label: '110px (대형)' },
];

const VIEW_SPACE_PX = 260.0; // 뷰어 가상 좌표계 크기 (260px)

export const CoreVisualizer: React.FC<CoreVisualizerProps> = ({
    coreSize,
    showCore,
    onCoreSizeChange,
}) => {
    const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>(WeaponType.AR);

    // 탄착군 직경 계산 (명중 0% 기준)
    const spreadDiameter = calcSpreadDiameter(selectedWeapon, 0);

    // 가상 좌표계 비율 환산 (%)
    const bodyPercent = Math.min(100, (DEFAULT_BODY_PX / VIEW_SPACE_PX) * 100);
    const spreadPercent = Math.min(100, (spreadDiameter / VIEW_SPACE_PX) * 100);
    const corePercent = showCore ? Math.min(100, (coreSize / VIEW_SPACE_PX) * 100) : 0;

    return (
        <div className={styles['visualizer-container']}>
            {/* 상단 프리뷰 타이틀 & 선택된 무기 정보 */}
            <div className={styles['header']}>
                <Font as="span" variant="caption-2" color="muted">
                    탄착군 & 코어 판정 영역
                </Font>
                <Font as="span" variant="caption-2" color="accent">
                    {showCore ? `코어 Ø ${coreSize}px` : '코어 미적용'}
                </Font>
            </div>

            {/* 원형 레이더 뷰어 */}
            <div className={styles['radar-wrapper']}>
                {/* 십자선 */}
                <div className={styles['radar-crosshair-h']} />
                <div className={styles['radar-crosshair-v']} />

                {/* 그리드 가이드 링 */}
                <div className={styles['radar-grid-ring']} style={{ width: '40%', height: '40%' }} />
                <div className={styles['radar-grid-ring']} style={{ width: '70%', height: '70%' }} />

                {/* 보스 본체 히트박스 원 (240px) */}
                <div
                    className={styles['body-ring']}
                    style={{
                        width: `${bodyPercent}%`,
                        height: `${bodyPercent}%`,
                    }}
                    title="적 본체 히트박스 (240px)"
                />

                {/* 선택된 무기의 탄착군 분산 원 */}
                <div
                    className={styles['spread-ring']}
                    style={{
                        width: `${spreadPercent}%`,
                        height: `${spreadPercent}%`,
                    }}
                    title={`${selectedWeapon} 탄착군 직경 (${spreadDiameter}px)`}
                />

                {/* 코어 히트박스 원 (Red) */}
                {showCore && (
                    <div
                        className={styles['core-ring']}
                        style={{
                            width: `${corePercent}%`,
                            height: `${corePercent}%`,
                        }}
                        title={`코어 히트박스 (${coreSize}px)`}
                    >
                        <div className={styles['core-center-dot']} />
                    </div>
                )}

                {/* 코어 비활성 시 오버레이 */}
                {!showCore && (
                    <div className={styles['radar-inactive-overlay']}>
                        <Font as="span" variant="caption-2" color="muted">
                            코어 비활성화
                        </Font>
                    </div>
                )}
            </div>

            {/* 코어 크기 프리셋 버튼 */}
            {showCore && onCoreSizeChange && (
                <div className={styles['preset-buttons-row']}>
                    {PRESETS.map((p) => (
                        <button
                            key={p.size}
                            type="button"
                            className={`${styles['preset-btn']} ${coreSize === p.size ? styles.active : ''}`}
                            onClick={() => onCoreSizeChange(p.size)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 무기별 실시간 코어 히트 확률 그리드 */}
            <div className={styles['weapon-stats-grid']}>
                {WEAPON_PREVIEWS.map((w) => {
                    const prob = calcCoreHitProb(w.key, 0, showCore, coreSize);
                    const probPct = (prob * 100).toFixed(1);
                    const isSelected = selectedWeapon === w.key;

                    return (
                        <div
                            key={w.key}
                            className={`${styles['weapon-stat-card']} ${isSelected ? styles.active : ''}`}
                            onClick={() => setSelectedWeapon(w.key)}
                        >
                            <Font as="span" variant="caption-2" weight="bold">
                                {w.label}
                            </Font>
                            <Font
                                as="span"
                                variant="caption-1"
                                weight="bold"
                                color={showCore ? (prob >= 0.5 ? 'success' : 'warning') : 'muted'}
                            >
                                {showCore ? `${probPct}%` : '0%'}
                            </Font>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
