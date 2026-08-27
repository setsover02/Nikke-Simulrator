import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { ScenarioSummary, BuffTimelineEvent } from '../../types/simulator';

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────

function formatTime(sec: number, totalDuration: number): string {
    const remaining = Math.max(0, totalDuration - sec);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function statToLabel(stat: string): string {
    const MAP: Record<string, string> = {
        atk_pct: 'ATK%',
        atk_flat: 'ATK+',
        atk_dmg_pct: 'ATK DMG',
        final_atk_pct: 'Final ATK',
        crit_rate: 'Crit Rate',
        crit_dmg_pct: 'Crit DMG',
        core_dmg_pct: 'Core DMG',
        normal_atk_dmg_pct: 'Nrm ATK',
        burst_dmg_pct: 'Burst DMG',
        charge_dmg_pct: 'Chg DMG',
        pierce_dmg_pct: 'Pierce',
        dot_dmg_pct: 'DoT DMG',
        part_dmg_pct: 'Part DMG',
        element_bonus_pct: 'Elem Bonus',
        received_dmg: 'Rcv DMG↑',
        enemy_def_down_pct: 'DEF↓',
        split_dmg_pct: 'Share DMG',
        charge_speed_pct: 'Chg Spd',
        reload_speed_pct: 'Reload Spd',
        max_ammo_pct: 'Max Ammo',
        attack_speed_pct: 'ATK Spd',
    };
    return MAP[stat] || stat.replace(/_/g, ' ');
}

function statColor(stat: string, polarity: string): string {
    if (polarity === 'harmful') return '#ff4444';

    const COLORS: Record<string, string> = {
        atk_pct: '#4fc3f7',
        atk_flat: '#29b6f6',
        atk_dmg_pct: '#26c6da',
        final_atk_pct: '#00e5ff',
        crit_rate: '#ffb300',
        crit_dmg_pct: '#ffa726',
        core_dmg_pct: '#ff7043',
        normal_atk_dmg_pct: '#66bb6a',
        burst_dmg_pct: '#ab47bc',
        charge_dmg_pct: '#7e57c2',
        pierce_dmg_pct: '#ef5350',
        dot_dmg_pct: '#ec407a',
        element_bonus_pct: '#26a69a',
        received_dmg: '#ff8f00',
        enemy_def_down_pct: '#d32f2f',
        charge_speed_pct: '#42a5f5',
        reload_speed_pct: '#5c6bc0',
        max_ammo_pct: '#8d6e63',
    };
    return COLORS[stat] || '#78909c';
}

// ─────────────────────────────────────────────────────────────
// 행 데이터 구조
// ─────────────────────────────────────────────────────────────

interface TimelineRow {
    targetId: string;
    targetName: string;
    casterId: string;
    casterName: string;
    buffName: string;
    stat: string;
    polarity: string;
    color: string;
    label: string;       // stat 한글 레이블
    segments: { start: number; end: number; value: number }[];
}

// ─────────────────────────────────────────────────────────────
// 레이아웃 상수
// ─────────────────────────────────────────────────────────────

const LINE_H = 18;
const ROW_GAP = 3;
const CHAR_GAP = 10;
const PAD = { top: 36, right: 20, bottom: 42, left: 210 };
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
        targetName: string; casterName: string;
        buffName: string; stat: string; value: number;
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

        // 그룹 키: targetId + casterId + buffName + stat
        const grouped = new Map<string, TimelineRow>();

        for (const ev of events) {
            const key = `${ev.targetId}__${ev.casterId}__${ev.buffName}__${ev.stat}`;
            if (!grouped.has(key)) {
                const color = statColor(ev.stat, ev.polarity);
                grouped.set(key, {
                    targetId: ev.targetId,
                    targetName: idToName[ev.targetId] || ev.targetId,
                    casterId: ev.casterId,
                    casterName: idToName[ev.casterId] || ev.casterId,
                    buffName: ev.buffName,
                    stat: ev.stat,
                    polarity: ev.polarity,
                    color,
                    label: statToLabel(ev.stat),
                    segments: [],
                });
            }
            grouped.get(key)!.segments.push({
                start: ev.startTime,
                end: ev.endTime,
                value: ev.value,
            });
        }

        // targetName 기준 정렬 → 그 안에서 stat 기준 정렬
        const result = Array.from(grouped.values());
        result.sort((a, b) => {
            if (a.targetName < b.targetName) return -1;
            if (a.targetName > b.targetName) return 1;
            return a.stat.localeCompare(b.stat);
        });
        return result;
    }, [summary]);

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
        const cw = wrapper.clientWidth;

        canvas.width = cw;
        canvas.height = ch;
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#111318';
        ctx.fillRect(0, 0, cw, ch);

        // 제목
        ctx.fillStyle = '#8a8fa8';
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, PAD.left, 12);

        if (rows.length === 0) {
            ctx.fillStyle = '#444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '13px sans-serif';
            ctx.fillText('시뮬레이션을 실행하면 버프 타임라인이 표시됩니다', cw / 2, ch / 2);
            return;
        }

        const chartW = cw - PAD.left - PAD.right;
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;
        const toX = (t: number) => PAD.left + ((t - vMin) / range) * chartW;

        // 그리드 & X축 레이블
        const tickInterval = [1, 2, 5, 10, 15, 20, 30, 60].find(i => range / 8 <= i) ?? 60;
        const firstTick = Math.ceil(vMin / tickInterval) * tickInterval;

        ctx.strokeStyle = '#1e2030';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#555';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let t = firstTick; t <= vMax; t += tickInterval) {
            const x = toX(t);
            ctx.beginPath();
            ctx.moveTo(x, PAD.top);
            ctx.lineTo(x, ch - PAD.bottom);
            ctx.stroke();
            ctx.fillText(formatTime(t, duration), x, ch - PAD.bottom + 6);
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

                // 바 채우기 (반투명 + 테두리)
                ctx.fillStyle = row.color + 'aa';
                ctx.beginPath();
                ctx.roundRect(x0, barY, w, barH, 2);
                ctx.fill();

                ctx.strokeStyle = row.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(x0, barY, w, barH, 2);
                ctx.stroke();
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
                // 캐릭터명
                ctx.fillStyle = '#e0e4f0';
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(row.targetName.substring(0, 12), 8, yCursor + LINE_H / 2);
            }
            lastTarget = row.targetId;

            // 버프 레이블 (stat 이름 + 시전자)
            const sameCaster = row.casterName === row.targetName;
            const labelRight = sameCaster
                ? row.label
                : `${row.label} ← ${row.casterName.substring(0, 6)}`;

            ctx.fillStyle = row.color;
            ctx.font = '10px "Inter", sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelRight.substring(0, 28), PAD.left - 8, yCursor + LINE_H / 2);

            yCursor += LINE_H + ROW_GAP;
        });

        // 줌 표시
        const isZoomed = vMin > 0 || vMax < duration - 0.1;
        if (isZoomed) {
            ctx.fillStyle = '#555';
            ctx.textAlign = 'right';
            ctx.font = '10px monospace';
            ctx.fillText(
                `${formatTime(vMin, duration)} – ${formatTime(vMax, duration)}`,
                cw - PAD.right, 14
            );
        }
    }, [rows, duration, title, getViewRange]);

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
        const lx = (e.clientX - rect.left) * (canvas.width / canvas.clientWidth);
        if (lx < PAD.left || lx > canvas.width - PAD.right) return;
        const ratio = (lx - PAD.left) / (canvas.width - PAD.left - PAD.right);
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
        const scaleY = canvas.height / canvas.clientHeight;
        const logY = mouseY * scaleY;
        const logX = mouseX * (canvas.width / canvas.clientWidth);

        if (isDragging.current) {
            const [vMin, vMax] = [viewMinRef.current, viewMaxRef.current ?? duration];
            const graphW = canvas.width - PAD.left - PAD.right;
            const dx = (e.clientX - lastDragX.current) * (canvas.width / canvas.clientWidth);
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
        if (logX >= PAD.left && logX <= canvas.width - PAD.right) {
            const [vMin, vMax] = getViewRange();
            const graphW = canvas.width - PAD.left - PAD.right;
            const cursorT = vMin + ((logX - PAD.left) / graphW) * (vMax - vMin);

            for (const hit of rowHitRef.current) {
                if (logY >= hit.y && logY <= hit.y + hit.h) {
                    const seg = hit.row.segments.find(s => cursorT >= s.start && cursorT <= s.end);
                    if (seg) {
                        setTooltip({
                            x: mouseX, y: mouseY,
                            targetName: hit.row.targetName,
                            casterName: hit.row.casterName,
                            buffName: hit.row.buffName,
                            stat: hit.row.stat,
                            value: seg.value,
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
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', marginTop: '16px' }}>
            {isZoomed && (
                <button
                    onClick={() => { setViewMin(0); setViewMax(null); }}
                    style={{
                        position: 'absolute', top: '10px', right: '28px', zIndex: 10,
                        padding: '3px 8px', fontSize: '10px', background: '#1e2030',
                        color: '#8a8fa8', border: '1px solid #2a2f45', borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    리셋
                </button>
            )}
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                    display: 'block',
                    borderRadius: '6px',
                    cursor: isDragging.current ? 'grabbing' : 'crosshair',
                    userSelect: 'none',
                    touchAction: 'none',
                }}
            />
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(tooltip.x + 14, (wrapperRef.current?.clientWidth ?? 400) - 220)}px`,
                    top: `${Math.max(4, tooltip.y - 6)}px`,
                    background: 'rgba(16,18,28,0.96)',
                    border: '1px solid #2a3050',
                    borderRadius: '8px',
                    padding: '10px 13px',
                    color: '#e0e4f0',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    zIndex: 30,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                    minWidth: '190px',
                }}>
                    <div style={{ borderBottom: '1px solid #2a3050', marginBottom: '7px', paddingBottom: '5px' }}>
                        <span style={{ color: '#e0e4f0', fontWeight: 'bold' }}>{tooltip.targetName}</span>
                        <span style={{ color: '#555', margin: '0 5px' }}>←</span>
                        <span style={{ color: '#8a8fa8' }}>{tooltip.casterName}</span>
                    </div>
                    <div style={{ color: '#c5cae9', marginBottom: '4px', fontSize: '11px' }}>
                        {tooltip.buffName}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <span style={{ color: '#8a8fa8' }}>{statToLabel(tooltip.stat)}</span>
                        <span style={{ color: '#4fc3f7', fontWeight: 'bold' }}>
                            {(tooltip.value * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div style={{ marginTop: '5px', color: '#555', fontSize: '10px' }}>
                        {formatTime(tooltip.start, duration)} → {formatTime(tooltip.end, duration)}
                        <span style={{ marginLeft: '8px' }}>({(tooltip.end - tooltip.start).toFixed(1)}s)</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasTimelineChart;
