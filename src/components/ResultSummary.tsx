import React from 'react';
import { ScenarioSummary } from '../types/simulator';
import { SLOT_COLORS } from '../constants/characters';

interface Props {
    noCore: ScenarioSummary;
    withCore: ScenarioSummary;
    showTeamTotal: boolean;
}

const ResultSummary: React.FC<Props> = ({ noCore, withCore, showTeamTotal }) => {
    const renderRows = (
        summary: ScenarioSummary,
        teamColor: string,
        borderOpacity: string
    ) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.chars.map((r, idx) => (
                <div key={r.charId + idx} style={{
                    padding: '10px 14px', background: '#1e1e2e',
                    borderRadius: '6px',
                    border: `1px solid ${SLOT_COLORS[idx % SLOT_COLORS.length]}${borderOpacity}`,
                }}>
                    {/* 이름 + 총 딜 */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '7px' }}>
                        <span style={{ color: SLOT_COLORS[idx % SLOT_COLORS.length], fontWeight: 'bold' }}>
                            {r.charName}
                        </span>
                        <span style={{ color: '#999', fontSize: '12px' }}>
                            DMG: <strong style={{ color: '#ccc' }}>{Math.floor(r.totalDmg).toLocaleString()}</strong>
                            {' '}| DPS: <strong style={{ color: '#ccc' }}>{Math.floor(r.dps).toLocaleString()}</strong>
                        </span>
                    </div>

                    {/* 단발 타격 유형별 데미지 뱃지 */}
                    {r.hitDamages && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                { label: '일반', value: r.hitDamages.normal, color: '#9ca3af' },
                                { label: '크리', value: r.hitDamages.crit, color: '#60a5fa' },
                                { label: '코어', value: r.hitDamages.core, color: '#fb923c' },
                                { label: '코어+크리', value: r.hitDamages.coreCrit, color: '#f472b6' },
                            ].map(({ label, value, color }) => (
                                <span key={label} style={{
                                    fontSize: '11px', padding: '2px 7px',
                                    borderRadius: '10px',
                                    background: `${color}18`,
                                    border: `1px solid ${color}50`,
                                    color,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {label}: {value.toLocaleString()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {showTeamTotal && (
                <div style={{
                    padding: '10px 14px', background: '#1e1e2e',
                    borderRadius: '6px',
                    border: `${teamColor === '#ffd700' ? '2px' : '1px'} solid ${teamColor}66`,
                }}>
                    <span style={{ color: teamColor, fontWeight: 'bold' }}>★ Team Total</span>
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '12px' }}>
                        DMG: <strong style={{ color: teamColor }}>{Math.floor(summary.teamTotal).toLocaleString()}</strong>
                        {' '}| DPS: <strong style={{ color: teamColor }}>{Math.floor(summary.teamDps).toLocaleString()}</strong>
                    </span>
                </div>
            )}
        </div>
    );

    return (
        <div style={{ marginBottom: '24px' }}>
            <h2 style={{ color: '#e0e0e0', marginBottom: '16px' }}>Result Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* 코어 없는 적 */}
                <div>
                    <h3 style={{ color: '#aaa', marginBottom: '10px', fontSize: '15px' }}>🔵 코어 없는 적</h3>
                    {renderRows(noCore, '#ffffff', '44')}
                </div>
                {/* 코어 있는 적 */}
                <div>
                    <h3 style={{ color: '#ffd700', marginBottom: '10px', fontSize: '15px' }}>🟡 코어 있는 적</h3>
                    {renderRows(withCore, '#ffd700', '88')}
                </div>
            </div>
        </div>
    );
};

export default ResultSummary;
