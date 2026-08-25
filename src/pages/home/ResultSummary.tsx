import React from 'react';
import { ScenarioSummary } from '../../types/simulator';
import { Font } from '../../components/Font';

interface Props {
    summary: ScenarioSummary;
    showTeamTotal: boolean;
    isCore: boolean;
}

const ResultSummary: React.FC<Props> = ({ summary, showTeamTotal, isCore }) => {
    return (
        <div className="result-summary-container pa-4">
            {summary.chars.map((r, idx) => (
                <div key={r.charId + idx} className="result-card">
                    <div className="result-card-header">
                        <Font as="span" variant="caption-1" weight="semibold" className="result-char-name">
                            {r.charName}
                        </Font>
                        <Font as="span" variant="caption-1" color="muted" className="result-total-label">
                            Total DMG: <strong className="result-total-value">{Math.floor(r.totalDmg).toLocaleString()}</strong>
                        </Font>
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
                                <Font as="span" key={label} variant="footnote" className="hit-tag" style={{ border: `1px solid ${color}50`, color }}>
                                    {label}: {value.toLocaleString()}
                                </Font>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {showTeamTotal && (
                <div className="team-total-card">
                    <Font as="span" variant="caption-1" weight="bold" className="team-total-title">★ Team Total</Font>
                    <Font as="span" variant="caption-1" color="muted" className="result-total-label" style={{ marginLeft: '12px' }}>
                        Total DMG: <strong className="team-total-value">{Math.floor(summary.teamTotal).toLocaleString()}</strong>
                    </Font>
                </div>
            )}
        </div>
    );
};

export default ResultSummary;
