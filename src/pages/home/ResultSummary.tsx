import React from 'react';
import { ScenarioSummary } from '../../types/simulator';
import { Font } from '../../components/Font';
import { Grid } from '../../components/Layout/Grid';
import { useChartTheme } from '../../utils/useChartTheme';
import styles from './ResultSummary.module.scss';

interface Props {
    summary: ScenarioSummary;
    showTeamTotal: boolean;
    isCore: boolean;
}

const HIT_TAG_META = [
    { key: 'normal', label: '일반', colorVar: 'var(--Font-Inactive)' },
    { key: 'crit', label: '크리', colorVar: 'var(--Status-Info-100)' },
    { key: 'core', label: '코어', colorVar: 'var(--Accent-Orange)' },
    { key: 'coreCrit', label: '코어+크리', colorVar: 'var(--Accent-Purple)' },
    { key: 'fbNormal', label: 'FB 일반', colorVar: 'var(--Font-Inactive)' },
    { key: 'fbCrit', label: 'FB 크리', colorVar: 'var(--Status-Info-100)' },
    { key: 'fbCore', label: 'FB 코어', colorVar: 'var(--Accent-Orange)' },
    { key: 'fbCoreCrit', label: 'FB 코어+크리', colorVar: 'var(--Accent-Purple)' },
] as const;

const ResultSummary: React.FC<Props> = ({ summary, showTeamTotal }) => {
    const themeTokens = useChartTheme();
    const charCount = summary.chars.length;

    return (
        <div className={styles['result-summary-container']}>
            <Grid
                columns={{
                    xs: 1,
                    sm: 2,
                    md: Math.min(3, charCount),
                    lg: Math.min(5, charCount),
                }}
                gap={2}
            >
                {summary.chars.map((r, idx) => {
                    const slotColor = themeTokens.getSlotColor(r.charId || idx);
                    return (
                        <div key={r.charId + idx} className={styles['character-card']}>
                            <div className={styles['card-header']}>
                                <Font
                                    as="span"
                                    variant="subtitle"
                                    weight="bold"
                                    style={{ color: slotColor }}
                                >
                                    {r.charName}
                                </Font>
                                <Font as="span" variant="caption-2" color="muted">
                                    Total:{' '}
                                    <strong className={styles['total-value']}>
                                        {Math.floor(r.totalDmg).toLocaleString()}
                                    </strong>
                                </Font>
                            </div>

                            {r.hitDamages && (
                                <Grid columns={2} gap={1}>
                                    {HIT_TAG_META.map(({ key, label, colorVar }) => {
                                        const value = r.hitDamages?.[key as keyof typeof r.hitDamages] ?? 0;
                                        return (
                                            <div key={key} className={styles['hit-tag-item']}>
                                                <Font
                                                    as="span"
                                                    variant="footnote"
                                                    style={{ color: colorVar }}
                                                >
                                                    {label}
                                                </Font>
                                                <Font
                                                    as="span"
                                                    variant="footnote"
                                                    color="default"
                                                    weight="medium"
                                                >
                                                    {value.toLocaleString()}
                                                </Font>
                                            </div>
                                        );
                                    })}
                                </Grid>
                            )}
                        </div>
                    );
                })}
            </Grid>

            {showTeamTotal && (
                <div className={styles['team-total-card']}>
                    <Font as="span" variant="subtitle" weight="bold" className={styles['team-total-title']}>
                        ★ Team Total
                    </Font>
                    <Font as="span" variant="caption-1" color="muted">
                        Total DMG:
                        <strong className={styles['team-total-value']}>
                            {Math.floor(summary.teamTotal).toLocaleString()}
                        </strong>
                    </Font>
                </div>
            )}
        </div>
    );
};

export default ResultSummary;

