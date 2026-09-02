import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { ScenarioSummary, BuffTimelineEvent } from '../../types/simulator';
import { Font } from '../../components/Font';
import { useChartTheme } from '../../utils/useChartTheme';
import styles from './CanvasTimelineChart.module.scss';

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────

function formatTime(sec: number, totalDuration: number): string {
    const remaining = Math.max(0, totalDuration - sec);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/** PARSING.md 기준 stat 한글 설명 매핑 사전 */
export const STAT_KOREAN_DESC: Record<string, string> = {
    // ── DealForm ② 공방 ──
    atk_pct: '공격력 % 증가',
    atk_flat: '공격력 고정 증가',
    atk_caster_based_pct: '시전자 공격력 기준 공격력 증가',
    atk_from_hp_pct: '최종 최대 체력 비례 공격력 증가',
    def_pct: '방어력 % 증가',
    def_caster_based_pct: '시전자 방어력 기준 방어력 증가',
    enemy_def_down_pct: '적 방어력 감소',
    def_down: '방어력 감소',

    // ── 체력 / 보호막 ──
    max_hp_pct: '최대 체력 % 증가 (체력 동반 증가)',
    max_hp_only_pct: '최대 체력만 % 증가 (현재 체력 유지)',
    hp_caster_based_pct: '시전자 기준 최대 체력 % 증가',
    hp_only_caster_based_pct: '시전자 기준 최대 체력만 % 증가',
    heal_hp_pct: '체력 회복',
    lifesteal_pct: '공격 대미지 비례 체력 흡수',
    heal_received_pct: '받는 체력 회복량 % 증가',
    outgoing_heal_pct: '주는 체력 회복량 % 증가',
    shield_from_max_hp_pct: '최대 체력 비례 보호막 생성',
    shield_restore_pct: '보호막 회복',

    // ── DealForm ③ 크리 / 코어 ──
    crit_rate: '크리티컬 확률 % 증가',
    normal_atk_crit_rate: '일반 공격 크리티컬 확률 % 증가',
    crit_dmg: '크리티컬 대미지 % 증가',
    crit_dmg_pct: '크리티컬 대미지 % 증가',
    normal_atk_crit_dmg: '일반 공격 크리티컬 대미지 % 증가',
    core_dmg_pct: '코어 대미지 % 증가',

    // ── DealForm ④ 차지 ──
    charge_dmg_pct: '차지 대미지 % 증가',
    charge_dmg_mag_pct: '차지 대미지 배율 % 증가',
    charge_speed_pct: '차지 속도 % 증가',
    charge_speed_caster_based_pct: '시전자 기준 차지 속도 % 증가',
    charge_time_flat: '차지 시간 감소',
    charge_time_fixed: '차지 시간 고정',
    charge_speed_overflow_conversion_pct: '초과 차지 속도의 차지 대미지 전환',

    // ── DealForm ⑤ 유형별 대미지 ──
    atk_dmg_pct: '공격 대미지 % 증가',
    normal_atk_dmg_pct: '일반 공격 대미지 배율 % 증가',
    burst_dmg_pct: '버스트 스킬 대미지 % 증가',
    burst_dmg_aoe_pct: '전체 대상 버스트 대미지 % 증가',
    burst_dmg_single_pct: '단일 대상 버스트 대미지 % 증가',
    pierce_dmg_pct: '관통 대미지 % 증가',
    dot_dmg_pct: '지속 대미지 % 증가',
    split_dmg_pct: '분배 대미지 % 증가',
    sequential_dmg_pct: '순차 공격 대미지 % 증가',
    part_dmg_pct: '파츠 대미지 % 증가',
    intercept_dmg_pct: '저지 부위 대미지 % 증가',
    armor_break_dmg_pct: '방어력 무시 대미지 % 증가',
    projectile_dmg_pct: '발사체 대미지 % 증가',
    projectile_attachment_dmg_pct: '발사체 부착 대미지 % 증가',
    projectile_explosion_dmg_pct: '발사체 폭발 대미지 % 증가',
    element_bonus_pct: '우월 코드 공격 대미지 % 증가',

    // ── DealForm ⑥ 받는 대미지 ──
    received_dmg: '받는 대미지 % 증가',
    received_dmg_pct: '받는 대미지 % 증가',

    // ── 장탄 / 사격 ──
    max_ammo_pct: '최대 장탄 수 % 증가',
    max_ammo_flat: '최대 장탄 수 고정 증가',
    ammo_charge_pct: '탄환 충전 %',
    ammo_charge_flat: '탄환 충전',
    reload_speed_pct: '재장전 속도 % 증가',
    reload_time_fixed: '재장전 시간 고정',
    attack_speed_pct: '공격 속도 % 증가',
    accuracy_pct: '명중률 % 증가',
    mg_warmup_speed_pct: 'MG 예열 진행 속도 % 증가',
    pellet_count: '펠릿 개수 증가',
    pellet_count_fixed: '펠릿 개수 고정',
    infinite_ammo: '장탄수 무한',

    // ── 스킬 / 버스트 제어 ──
    burst_cooldown: '버스트 쿨타임 감소',
    burst_cooldown_reduce: '버스트 쿨타임 즉시 감소',
    skill_cooldown_pct: '스킬 쿨타임 % 감소',
    skill_cooldown: '스킬 쿨타임 감소',
    burst_charge_speed_pct: '버스트 충전 속도 % 증가',
    gauge_charge: '버스트 게이지 충전',
    fullburst_duration: '풀버스트 지속시간 증가',

    // ── 특수 상태 및 면역 ──
    pierce_enabled: '관통 특화',
    armor_break_enabled: '방어력 무시 특화',
    stun: '기절',
    invincible: '무적',
    undying: '불굴',
    stealth: '은신',
    taunt: '도발',
    debuff_immune: '해로운 효과 면역',
    stun_immune: '기절 면역',
    charge_speed_buff_immune: '차지 속도 증가 면역',
    charge_speed_debuff_immune: '차지 속도 감소 면역',
    stack_change_immune: '중첩량 변경 면역',
    buff_max_stack_add: '이로운 효과 최대 중첩량 증가',

    // ── 대미지 효과 ──
    damage: '스킬 대미지',
    burst_damage: '버스트 스킬 대미지',
    split_damage: '분배 대미지',
    dot_damage: '지속 대미지 (DoT)',
    bonus_damage: '추가 대미지',
    extra_damage: '추가 대미지',
    armor_break_damage: '방어력 무시 대미지',
    pierce_damage: '관통 대미지',
    projectile_explosion_damage: '발사체 폭발 대미지',
    projectile_attachment_damage: '발사체 부착 대미지',
    core_damage: '코어 명중 대미지',
    sequential_damage: '연속 순차 대미지',
    distribute_damage: '분배 대미지',
    auto_damage: '자동 공격 대미지',
};

function statToKoreanDesc(stat: string): string {
    return STAT_KOREAN_DESC[stat] || stat.replace(/_/g, ' ');
}

function formatBuffTooltipValue(stat: string, val: number): string {
    if (val === undefined || val === null || isNaN(val)) return '';
    const isBool = ['infinite_ammo', 'pierce_enabled', 'armor_break_enabled', 'stun', 'invincible', 'undying', 'stealth', 'taunt', 'debuff_immune', 'stun_immune'].includes(stat);
    if (isBool) return '적용 중';

    const isFlat = ['atk_flat', 'max_ammo_flat', 'pellet_count', 'burst_cooldown', 'burst_cooldown_reduce', 'charge_time_flat', 'fullburst_duration'].includes(stat);
    if (isFlat) {
        return val >= 0 ? `+${val.toLocaleString()}` : `${val.toLocaleString()}`;
    }

    // val은 JSON/엔진에서 이미 백분율 수치 (예: 6.65 = 6.65%)
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
}

// ─────────────────────────────────────────────────────────────
// 행 데이터 구조
// ─────────────────────────────────────────────────────────────

export interface BuffStatItem {
    stat: string;
    label: string;
    value: number;
    polarity?: string;
}

export interface TimelineSegment {
    start: number;
    end: number;
    stats: BuffStatItem[];
}

export interface TimelineRow {
    targetId: string;
    targetName: string;
    casterId: string;
    casterName: string;
    buffName: string;
    color: string;
    segments: TimelineSegment[];
}

// ─────────────────────────────────────────────────────────────
// 레이아웃 상수
// ─────────────────────────────────────────────────────────────

const LINE_H = 18;
const ROW_GAP = 3;
const CHAR_GAP = 10;
const PAD = { top: 36, right: 20, bottom: 42, left: 250 };
const MIN_ZOOM = 5;

// ─────────────────────────────────────────────────────────────
// 컴포넌트 Props
// ─────────────────────────────────────────────────────────────

interface Props {
    summary: ScenarioSummary;
    duration: number;
    title?: string;
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────

const CanvasTimelineChart: React.FC<Props> = ({ summary, duration, title = 'Buff Timeline' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const themeTokens = useChartTheme();

    const [viewMin, setViewMin] = useState(0);
    const [viewMax, setViewMax] = useState<number | null>(null);
    const isDragging = useRef(false);
    const lastDragX = useRef(0);
    const viewMinRef = useRef(0);
    const viewMaxRef = useRef<number | null>(null);

    useEffect(() => { viewMinRef.current = viewMin; }, [viewMin]);
    useEffect(() => { viewMaxRef.current = viewMax; }, [viewMax]);
    useEffect(() => { setViewMin(0); setViewMax(null); }, [summary]);

    const [tooltip, setTooltip] = useState<{
        x: number; y: number;
        targetId: string; targetName: string;
        casterId: string; casterName: string;
        buffName: string;
        stats: BuffStatItem[];
        start: number; end: number;
    } | null>(null);

    const rowHitRef = useRef<Array<{
        y: number; h: number;
        row: TimelineRow;
    }>>([]);

    // ── 행 데이터 빌드 ──────────────────────────────────────
    const rows = useMemo((): TimelineRow[] => {
        const events: BuffTimelineEvent[] = summary.buffTimeline || [];
        const idToName = summary.idToName || {};

        if (events.length === 0) return [];

        // 1. (targetId, casterId, buffName, stat) 별로 개별 이벤트 스트림 수집
        interface RawStatStream {
            targetId: string;
            targetName: string;
            casterId: string;
            casterName: string;
            buffName: string;
            stat: string;
            label: string;
            polarity: string;
            events: { start: number; end: number; value: number }[];
        }

        const streamMap = new Map<string, RawStatStream>();

        for (const ev of events) {
            const tId = ev.targetId;
            const cId = ev.casterId;
            const tName = tId === '__enemy__' || tId === 'enemy' ? (idToName[tId] || '적') : (idToName[tId] || tId);
            const cName = cId === '__enemy__' || cId === 'enemy' ? (idToName[cId] || '적') : (idToName[cId] || cId);
            const bName = ev.buffName || ev.sourceSkill || statToKoreanDesc(ev.stat);
            const sStart = Math.max(0, ev.startTime);
            const sEnd = Math.min(duration, ev.endTime);

            if (sEnd <= sStart) continue;

            const streamKey = `${tId}__${cId}__${bName}__${ev.stat}`;
            if (!streamMap.has(streamKey)) {
                streamMap.set(streamKey, {
                    targetId: tId,
                    targetName: tName,
                    casterId: cId,
                    casterName: cName,
                    buffName: bName,
                    stat: ev.stat,
                    label: statToKoreanDesc(ev.stat),
                    polarity: ev.polarity,
                    events: [],
                });
            }
            streamMap.get(streamKey)!.events.push({
                start: sStart,
                end: sEnd,
                value: ev.value,
            });
        }

        // 2. 각 스탯 스트림의 타임라인 시그니처 생성 및 정규화
        interface NormalizedStream extends RawStatStream {
            timelineKey: string;
            segments: { start: number; end: number; value: number }[];
        }

        const normalizedStreams: NormalizedStream[] = [];

        for (const stream of streamMap.values()) {
            stream.events.sort((a, b) => a.start - b.start || a.end - b.end);

            // 연속/동일 구간 병합
            const mergedSegs: { start: number; end: number; value: number }[] = [];
            for (const ev of stream.events) {
                const last = mergedSegs[mergedSegs.length - 1];
                if (last && Math.abs(last.end - ev.start) < 1e-4 && last.value === ev.value) {
                    last.end = Math.max(last.end, ev.end);
                } else {
                    mergedSegs.push({ ...ev });
                }
            }

            // 타임라인 시그니처 (시작-종료 구간 패턴)
            const timelineKey = mergedSegs
                .map(s => `${s.start.toFixed(2)}_${s.end.toFixed(2)}`)
                .join('|');

            normalizedStreams.push({
                ...stream,
                timelineKey,
                segments: mergedSegs,
            });
        }

        // 3. (targetId, casterId, buffName, timelineKey) 단위로 그룹화하여 행(Row) 생성
        //    -> 타임라인이 동일한 다중 스탯은 하나의 Row로 묶이고, 타임라인이 다르면 별도 Row로 분리됨
        const groupedRows = new Map<string, {
            targetId: string;
            targetName: string;
            casterId: string;
            casterName: string;
            buffName: string;
            color: string;
            timelineKey: string;
            statStreams: NormalizedStream[];
        }>();

        for (const ns of normalizedStreams) {
            const rowKey = `${ns.targetId}__${ns.casterId}__${ns.buffName}__${ns.timelineKey}`;
            if (!groupedRows.has(rowKey)) {
                groupedRows.set(rowKey, {
                    targetId: ns.targetId,
                    targetName: ns.targetName,
                    casterId: ns.casterId,
                    casterName: ns.casterName,
                    buffName: ns.buffName,
                    color: themeTokens.getSlotColor(ns.casterId),
                    timelineKey: ns.timelineKey,
                    statStreams: [],
                });
            }
            groupedRows.get(rowKey)!.statStreams.push(ns);
        }

        // 4. 각 Row의 통합 타임라인 세그먼트 빌드
        const resultRows: TimelineRow[] = [];

        for (const rowData of groupedRows.values()) {
            const timePoints = new Set<number>();
            for (const ss of rowData.statStreams) {
                for (const seg of ss.segments) {
                    timePoints.add(seg.start);
                    timePoints.add(seg.end);
                }
            }
            const sortedTimes = Array.from(timePoints).sort((a, b) => a - b);

            const rowSegments: TimelineSegment[] = [];

            for (let i = 0; i < sortedTimes.length - 1; i++) {
                const t0 = sortedTimes[i];
                const t1 = sortedTimes[i + 1];
                if (t1 - t0 < 1e-4) continue;

                const stats: BuffStatItem[] = [];
                for (const ss of rowData.statStreams) {
                    const activeSeg = ss.segments.find(
                        s => s.start <= t0 + 1e-4 && s.end >= t1 - 1e-4
                    );
                    if (activeSeg) {
                        stats.push({
                            stat: ss.stat,
                            label: ss.label,
                            value: activeSeg.value,
                            polarity: ss.polarity,
                        });
                    }
                }

                if (stats.length > 0) {
                    const prev = rowSegments[rowSegments.length - 1];
                    const isSameAsPrev =
                        prev &&
                        Math.abs(prev.end - t0) < 1e-4 &&
                        prev.stats.length === stats.length &&
                        prev.stats.every((ps, idx) => ps.stat === stats[idx].stat && ps.value === stats[idx].value);

                    if (isSameAsPrev) {
                        prev.end = t1;
                    } else {
                        rowSegments.push({
                            start: t0,
                            end: t1,
                            stats,
                        });
                    }
                }
            }

            if (rowSegments.length > 0) {
                resultRows.push({
                    targetId: rowData.targetId,
                    targetName: rowData.targetName,
                    casterId: rowData.casterId,
                    casterName: rowData.casterName,
                    buffName: rowData.buffName,
                    color: rowData.color,
                    segments: rowSegments,
                });
            }
        }

        // 5. 정렬:
        //    (1) 대상(Target): 팀 슬롯 순서 -> 기타 -> 적(__enemy__)
        //    (2) 행(Row): 자가 버프 우선 -> 시전자 슬롯 순 -> 버프명 가나다순
        const targetOrderMap = new Map<string, number>();
        (summary.chars || []).forEach((c, idx) => {
            targetOrderMap.set(c.charId, idx);
            if (c.characterID) targetOrderMap.set(c.characterID, idx);
        });

        const getTargetRank = (id: string) => {
            if (id === '__enemy__' || id === 'enemy') return 9999;
            if (targetOrderMap.has(id)) return targetOrderMap.get(id)!;
            return 5000;
        };

        resultRows.sort((a, b) => {
            const rankA = getTargetRank(a.targetId);
            const rankB = getTargetRank(b.targetId);
            if (rankA !== rankB) return rankA - rankB;

            const isSelfA = a.targetId === a.casterId ? 0 : 1;
            const isSelfB = b.targetId === b.casterId ? 0 : 1;
            if (isSelfA !== isSelfB) return isSelfA - isSelfB;

            const casterRankA = getTargetRank(a.casterId);
            const casterRankB = getTargetRank(b.casterId);
            if (casterRankA !== casterRankB) return casterRankA - casterRankB;

            return a.buffName.localeCompare(b.buffName);
        });

        return resultRows;
    }, [summary, duration, themeTokens]);

    const getViewRange = useCallback((): [number, number] => [viewMin, viewMax ?? duration], [viewMin, viewMax, duration]);

    // ── 캔버스 드로우 ────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 캐릭터 그룹 수 계산 (gap 포함 높이 계산용)
        let charGroupCount = 0;
        let lastTarget = '';
        rows.forEach(r => {
            if (r.targetId !== lastTarget) { charGroupCount++; lastTarget = r.targetId; }
        });

        const rowCount = Math.max(1, rows.length);
        const ch = PAD.top + PAD.bottom + rowCount * (LINE_H + ROW_GAP) + Math.max(0, charGroupCount - 1) * CHAR_GAP;

        const dpr = window.devicePixelRatio || 1;
        const cw = Math.floor(wrapper.clientWidth) || 1200;

        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, cw, ch);

        // 제목
        ctx.fillStyle = themeTokens.fontDefault;
        ctx.font = '700 12px "Wanted Sans Variable", "Wanted Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, Math.round(PAD.left), 12);

        if (rows.length === 0) {
            ctx.fillStyle = themeTokens.fontInactive;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.fillText('시뮬레이션을 실행하면 버프 타임라인이 표시됩니다', Math.round(cw / 2), Math.round(ch / 2));
            return;
        }

        const chartW = cw - PAD.left - PAD.right;
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;
        const toX = (t: number) => PAD.left + ((t - vMin) / range) * chartW;

        // 그리드 & X축 레이블
        const tickInterval = [1, 2, 5, 10, 15, 20, 30, 60].find(i => range / 8 <= i) ?? 60;
        const firstTick = Math.ceil(vMin / tickInterval) * tickInterval;

        ctx.strokeStyle = themeTokens.gridLine;
        ctx.lineWidth = 1;
        ctx.fillStyle = themeTokens.fontInactive;
        ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let t = firstTick; t <= vMax; t += tickInterval) {
            const x = toX(t);
            const snapX = Math.floor(x) + 0.5;
            ctx.beginPath();
            ctx.moveTo(snapX, PAD.top);
            ctx.lineTo(snapX, ch - PAD.bottom);
            ctx.stroke();
            ctx.fillText(formatTime(t, duration), Math.round(x), Math.round(ch - PAD.bottom + 6));
        }

        // ── 클리핑으로 바 렌더링 ──
        ctx.save();
        ctx.beginPath();
        ctx.rect(PAD.left, PAD.top, chartW, ch - PAD.top - PAD.bottom);
        ctx.clip();

        const hitData: typeof rowHitRef.current = [];
        let yCursor = PAD.top;
        lastTarget = '';

        rows.forEach(row => {
            if (lastTarget && row.targetId !== lastTarget) yCursor += CHAR_GAP;
            lastTarget = row.targetId;

            const barY = yCursor + 3;
            const barH = LINE_H - 6;

            row.segments.forEach(seg => {
                if (seg.end < vMin || seg.start > vMax) return;
                const x0 = toX(Math.max(vMin, seg.start));
                let w = toX(Math.min(vMax, seg.end)) - x0;
                w = Math.max(2, w);

                // 직사각형 바 채우기 (정수 픽셀 배치)
                ctx.fillStyle = themeTokens.getSlotColor(row.casterId);
                ctx.fillRect(Math.floor(x0), Math.floor(barY), Math.floor(w), Math.floor(barH));
            });

            hitData.push({ y: yCursor, h: LINE_H, row });
            yCursor += LINE_H + ROW_GAP;
        });

        ctx.restore();
        rowHitRef.current = hitData;

        // ── Y축 레이블 ──
        yCursor = PAD.top;
        lastTarget = '';

        rows.forEach(row => {
            if (lastTarget && row.targetId !== lastTarget) yCursor += CHAR_GAP;

            if (row.targetId !== lastTarget) {
                // 캐릭터명 (슬롯 색상)
                ctx.fillStyle = themeTokens.getSlotColor(row.targetId);
                ctx.font = '700 11px "Wanted Sans Variable", "Wanted Sans", sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(row.targetName.substring(0, 14), 8, Math.round(yCursor + LINE_H / 2));
            }
            lastTarget = row.targetId;

            // 스킬 레이블 (스킬 이름 + 시전자)
            const sameCaster = row.casterName === row.targetName;
            const skillDisplayName = row.buffName;
            const labelRight = sameCaster
                ? skillDisplayName
                : `${skillDisplayName} ← ${row.casterName.substring(0, 8)}`;

            ctx.fillStyle = themeTokens.getSlotColor(row.casterId);
            ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelRight.substring(0, 32), Math.round(PAD.left - 8), Math.round(yCursor + LINE_H / 2));

            yCursor += LINE_H + ROW_GAP;
        });

        // 줌 표시
        const isZoomed = vMin > 0 || vMax < duration - 0.1;
        if (isZoomed) {
            ctx.fillStyle = themeTokens.fontInactive;
            ctx.textAlign = 'right';
            ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.fillText(
                `${formatTime(vMin, duration)} – ${formatTime(vMax, duration)}`,
                Math.round(cw - PAD.right), 14
            );
        }
    }, [rows, duration, title, getViewRange, themeTokens]);

    useEffect(() => {
        draw();
        const onResize = () => draw();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [draw]);

    // ── 휠 줌 ──────────────────────────────────────────────
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const lx = e.clientX - rect.left;
        if (lx < PAD.left || lx > rect.width - PAD.right) return;
        const ratio = (lx - PAD.left) / (rect.width - PAD.left - PAD.right);
        const cursor = vMin + ratio * range;
        const factor = e.deltaY < 0 ? 0.75 : 1.33;
        let newRange = Math.max(MIN_ZOOM, Math.min(duration, range * factor));
        let nm = cursor - ratio * newRange;
        let nx = cursor + (1 - ratio) * newRange;
        if (nm < 0) { nx -= nm; nm = 0; }
        if (nx > duration) { nm -= nx - duration; nx = duration; }
        setViewMin(Math.max(0, nm));
        setViewMax(nx >= duration - 0.01 ? null : nx);
    }, [duration, getViewRange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // ── 마우스 드래그 & 툴팁 ───────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastDragX.current = e.clientX;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDragging.current) {
            const [vMin, vMax] = [viewMinRef.current, viewMaxRef.current ?? duration];
            const graphW = rect.width - PAD.left - PAD.right;
            const dx = e.clientX - lastDragX.current;
            lastDragX.current = e.clientX;
            const dt = -(dx / graphW) * (vMax - vMin);
            let nm = Math.max(0, vMin + dt);
            let nx = vMax + dt;
            if (nm < 0) { nx -= nm; nm = 0; }
            if (nx > duration) { nm -= nx - duration; nx = duration; }
            setViewMin(Math.max(0, nm));
            setViewMax(nx >= duration - 0.01 ? null : nx);
            return;
        }

        // 툴팁 히트테스트
        if (mouseX >= PAD.left && mouseX <= rect.width - PAD.right) {
            const [vMin, vMax] = getViewRange();
            const graphW = rect.width - PAD.left - PAD.right;
            const cursorT = vMin + ((mouseX - PAD.left) / graphW) * (vMax - vMin);

            for (const hit of rowHitRef.current) {
                if (mouseY >= hit.y && mouseY <= hit.y + hit.h) {
                    const seg = hit.row.segments.find(s => cursorT >= s.start && cursorT <= s.end);
                    if (seg) {
                        setTooltip({
                            x: mouseX, y: mouseY,
                            targetId: hit.row.targetId,
                            targetName: hit.row.targetName,
                            casterId: hit.row.casterId,
                            casterName: hit.row.casterName,
                            buffName: hit.row.buffName,
                            stats: seg.stats,
                            start: seg.start,
                            end: seg.end,
                        });
                        return;
                    }
                }
            }
        }
        setTooltip(null);
    };

    const handleMouseUp = () => { isDragging.current = false; };
    const handleMouseLeave = () => { isDragging.current = false; setTooltip(null); };

    const [vMin, vMax] = getViewRange();
    const isZoomed = vMin > 0 || (viewMax !== null && vMax < duration - 0.1);

    return (
        <div ref={wrapperRef} className={styles['timeline-wrapper']}>
            {isZoomed && (
                <button
                    onClick={() => { setViewMin(0); setViewMax(null); }}
                    className={styles['reset-button']}
                >
                    리셋
                </button>
            )}
            <canvas
                ref={canvasRef}
                className={styles['timeline-canvas']}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                    cursor: isDragging.current ? 'grabbing' : 'crosshair',
                }}
            />
            {tooltip && (
                <div
                    className={styles['tooltip-container']}
                    style={{
                        left: `${Math.min(tooltip.x + 14, (wrapperRef.current?.clientWidth ?? 400) - 280)}px`,
                        top: `${Math.max(4, tooltip.y - 6)}px`,
                    }}
                >
                    <div className={styles['tooltip-header']}>
                        <Font as="span" variant="footnote" weight="bold" style={{ color: themeTokens.getSlotColor(tooltip.targetId) }}>
                            {tooltip.targetName}
                        </Font>
                        {tooltip.casterId !== tooltip.targetId && (
                            <>
                                <Font as="span" variant="footnote" color="muted">←</Font>
                                <Font as="span" variant="footnote" weight="medium" style={{ color: themeTokens.getSlotColor(tooltip.casterId) }}>
                                    {tooltip.casterName}
                                </Font>
                            </>
                        )}
                    </div>
                    <div className={styles['tooltip-skill']}>
                        <Font as="div" variant="caption-2" weight="bold" style={{ color: 'var(--Status-Warning-100)' }}>
                            {tooltip.buffName}
                        </Font>
                    </div>
                    <div className={styles['tooltip-stats-list']}>
                        {tooltip.stats.map((statItem, idx) => (
                            <div key={idx} className={styles['tooltip-stat-row']}>
                                <Font as="span" variant="footnote" color="muted">
                                    {statItem.label}
                                </Font>
                                <Font as="span" variant="footnote" weight="bold" style={{ color: 'var(--Status-Info-100)', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatBuffTooltipValue(statItem.stat, statItem.value)}
                                </Font>
                            </div>
                        ))}
                    </div>
                    <div className={styles['tooltip-footer']}>
                        <Font as="span" variant="footnote" color="inactive">
                            {formatTime(tooltip.start, duration)} → {formatTime(tooltip.end, duration)}
                        </Font>
                        <Font as="span" variant="footnote" color="inactive">
                            ({(tooltip.end - tooltip.start).toFixed(1)}s)
                        </Font>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasTimelineChart;
