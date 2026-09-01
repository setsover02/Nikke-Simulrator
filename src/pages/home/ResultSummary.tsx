import React from 'react';
import { ScenarioSummary } from '../../types/simulator';
import { Font } from '../../components/Font';
import { Avatar } from '../../components/Avatar/Avatar';
import { Grid } from '../../components/Layout/Grid';
import { useChartTheme } from '../../utils/useChartTheme';

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
        <Grid columns={1} className="pa-2">
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
                        <Grid key={r.charId + idx} columns={1} gap={1}>
                            {/* 1. 아바타 & 캐릭터 이름 한 줄 */}
                            <Grid templateColumns="auto 1fr" gap={1} alignItems="center">
                                <Avatar charId={r.characterID || r.charId} size={32} />
                                <Font
                                    as="span"
                                    variant="body"
                                    weight="medium"
                                    style={{ color: slotColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                >
                                    {r.charName}
                                </Font>
                            </Grid>

                            {/* 2. 니케 토탈 데미지 한 줄 */}
                            <Grid
                                templateColumns="1fr auto"
                                alignItems="center"
                                className="pb-1"
                                style={{ borderBottom: '1px solid var(--Divider-Normal)' }}
                            >
                                <Font as="span" variant="caption-1" color="muted">
                                    Total
                                </Font>
                                <Font
                                    as="span"
                                    variant="body"
                                    weight="bold"
                                    style={{ fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {Math.floor(r.totalDmg).toLocaleString()}
                                </Font>
                            </Grid>

                            {/* 3. 세부 대미지 수치 세로 나열 */}
                            {r.hitDamages && (
                                <Grid columns={1} gap={1}>
                                    {HIT_TAG_META.map(({ key, label, colorVar }) => {
                                        const value = r.hitDamages?.[key as keyof typeof r.hitDamages] ?? 0;
                                        return (
                                            <Grid
                                                key={key}
                                                templateColumns="1fr auto"
                                                alignItems="center"
                                            >
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
                                                    style={{ fontVariantNumeric: 'tabular-nums' }}
                                                >
                                                    {value.toLocaleString()}
                                                </Font>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                        </Grid>
                    );
                })}
            </Grid>

            {showTeamTotal && (
                <Grid
                    templateColumns="1fr auto"
                    alignItems="center"
                    className="pt-2"
                    style={{ borderTop: '1px solid var(--Divider-Normal)' }}
                >
                    <Font as="span" variant="caption-1" weight="medium">
                        ★ Team Total
                    </Font>
                    <Font
                        as="span"
                        variant="subtitle"
                        weight="bold"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                        {Math.floor(summary.teamTotal).toLocaleString()}
                    </Font>
                </Grid>
            )}
        </Grid>
    );
};

export default ResultSummary;


