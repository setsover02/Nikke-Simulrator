import React from 'react';
import { ScenarioSummary } from '../../types/simulator';

interface Props {
    summary: ScenarioSummary;
    showTeamTotal: boolean;
    isCore: boolean;
}

const ResultSummary: React.FC<Props> = ({ summary, showTeamTotal, isCore }) => {
    return (
        <div className="result-summary-container">
            {summary.chars.map((r, idx) => (
                <div key={r.charId + idx} className="result-card">
                    <div className="result-card-header">
                        <span className="result-char-name">
                            {r.charName}
                        </span>
                        <span className="result-total-label">
                            Total DMG: <strong className="result-total-value">{Math.floor(r.totalDmg).toLocaleString()}</strong>
                        </span>
                    </div>

                    {r.hitDamages && (
                        <div className="hit-tags">
                            {[
                                { label: '일반', value: r.hitDamages.normal, color: '#9ca3af' },
                                { label: '크리', value: r.hitDamages.crit, color: '#60a5fa' },
                                { label: '코어', value: r.hitDamages.core, color: '#fb923c' },
                                { label: '코어+크리', value: r.hitDamages.coreCrit, color: '#f472b6' },
                                { label: 'FB 일반', value: r.hitDamages.fbNormal, color: '#9ca3af' },
                                { label: 'FB 크리', value: r.hitDamages.fbCrit, color: '#60a5fa' },
                                { label: 'FB 코어', value: r.hitDamages.fbCore, color: '#fb923c' },
                                { label: 'FB 코어+크리', value: r.hitDamages.fbCoreCrit, color: '#f472b6' },
                            ].map(({ label, value, color }) => (
                                <span key={label} className="hit-tag" style={{ border: `1px solid ${color}50`, color }}>
                                    {label}: {value.toLocaleString()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {showTeamTotal && (
                <div className="team-total-card">
                    <span className="team-total-title">★ Team Total</span>
                    <span className="result-total-label" style={{ marginLeft: '12px' }}>
                        Total DMG: <strong className="team-total-value">{Math.floor(summary.teamTotal).toLocaleString()}</strong>
                    </span>
                </div>
            )}
        </div>
    );
};

export default ResultSummary;
