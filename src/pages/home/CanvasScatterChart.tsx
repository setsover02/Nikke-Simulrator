import React, { useEffect, useRef, useCallback } from 'react';
import { BurstWindow, ScatterPoint, DAMAGE_STAT_META } from '../../utils/simUtils';
import { Font } from '../../components/Font';

function formatTime(timeVal: number): string {
    const remaining = Math.max(0, 180 - timeVal);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ScatterDataset {
    label: string;
    color: string;
    data: ScatterPoint[];
}

interface CanvasScatterChartProps {
    datasets: ScatterDataset[];
    burstWindows?: BurstWindow[];
    title?: string;
    charIdToName?: Record<string, string>;
}

const MIN_ZOOM_RANGE = 5;

function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

const CanvasScatterChart = ({ datasets, burstWindows = [], title = 'Skill Damage Over Time', charIdToName = {} }: CanvasScatterChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [hoverInfo, setHoverInfo] = React.useState<{
        x: number;
        y: number;
        points: { label: string; color: string; time: number; value: number; description: string; skillName: string }[];
    } | null>(null);

    const [viewMin, setViewMin] = React.useState(0);
    const [viewMax, setViewMax] = React.useState<number | null>(null);
    const isDragging = useRef(false);
    const lastDragX = useRef(0);
    const viewMinRef = useRef(0);
    const viewMaxRef = useRef<number | null>(null);

    useEffect(() => { viewMinRef.current = viewMin; }, [viewMin]);
    useEffect(() => { viewMaxRef.current = viewMax; }, [viewMax]);

    const getAbsMaxTime = useCallback(() => {
        let max = 1;
        datasets.forEach(ds => {
            const m = Math.max(...ds.data.map(d => d.time), 1);
            if (m > max) max = m;
        });
        return Math.max(max, 10);
    }, [datasets]);

    const getViewRange = useCallback((): [number, number] => {
        const absMax = getAbsMaxTime();
        return [viewMin, viewMax ?? absMax];
    }, [viewMin, viewMax, getAbsMaxTime]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        const PL = 214, PR = 20, PT = 50, PB = 45;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, W, H);

        if (datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) {
            // 빈 데이터셋: 안내 메시지 표시
            ctx.fillStyle = '#e8e8e8';
            ctx.textAlign = 'left';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(title, PL, PT - 28);
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '13px monospace';
            ctx.fillText('스킬 대미지가 없습니다', W / 2, H / 2);
            return;
        }

        const absMaxTime = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const graphW = W - PL - PR;
        const graphH = H - PT - PB;

        let maxY = 100;
        datasets.forEach(ds => {
            ds.data.forEach(pt => {
                if (pt.value > maxY) maxY = pt.value;
            });
        });
        maxY = maxY * 1.1; // 10% headroom

        const toX = (t: number) => PL + ((t - vMin) / (vMax - vMin)) * graphW;
        const toY = (v: number) => H - PB - (v / maxY) * graphH;

        ctx.font = '11px monospace';
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const ratio = i / yTicks;
            const yVal = maxY * ratio;
            const yPos = H - PB - ratio * graphH;
            ctx.beginPath();
            ctx.moveTo(PL, yPos);
            ctx.lineTo(W - PR, yPos);
            ctx.strokeStyle = '#262626';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#666';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.floor(yVal).toLocaleString(), PL - 8, yPos);
        }

        const range = vMax - vMin;
        const idealSpacing = range / 8;
        let tickInterval = 1;
        const possibleIntervals = [1, 2, 5, 10, 15, 20, 30, 60, 120, 240];
        for (const int of possibleIntervals) {
            tickInterval = int;
            if (idealSpacing <= int) break;
        }

        const firstTick = Math.ceil(vMin / tickInterval) * tickInterval;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let t = firstTick; t <= vMax; t += tickInterval) {
            const xPos = PL + ((t - vMin) / range) * graphW;
            ctx.beginPath();
            ctx.moveTo(xPos, PT);
            ctx.lineTo(xPos, H - PB);
            ctx.strokeStyle = '#262626';
            ctx.stroke();
            ctx.fillStyle = '#666';
            ctx.fillText(formatTime(t), xPos, H - PB + 8);
        }

        ctx.beginPath();
        ctx.moveTo(PL, PT);
        ctx.lineTo(PL, H - PB);
        ctx.lineTo(W - PR, H - PB);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.rect(PL, PT, graphW, graphH);
        ctx.clip();

        burstWindows.forEach(bw => {
            const s = Math.max(bw.start, vMin);
            const e = Math.min(bw.end, vMax);
            if (e <= s) return;
            ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
            ctx.fillRect(toX(s), PT, toX(e) - toX(s), graphH);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(toX(s), PT, toX(e) - toX(s), graphH);
        });

        // ── stat별 형태 그리기 함수 ──────────────────────────────────────
        function drawShape(
            cx: CanvasRenderingContext2D,
            shape: string, x: number, y: number, r: number
        ) {
            cx.beginPath();
            switch (shape) {
                case 'diamond':
                    cx.moveTo(x, y - r);
                    cx.lineTo(x + r, y);
                    cx.lineTo(x, y + r);
                    cx.lineTo(x - r, y);
                    cx.closePath();
                    break;
                case 'triangle':
                    cx.moveTo(x, y - r);
                    cx.lineTo(x + r * 0.87, y + r * 0.5);
                    cx.lineTo(x - r * 0.87, y + r * 0.5);
                    cx.closePath();
                    break;
                case 'square':
                    cx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
                    break;
                case 'cross': {
                    const t = r * 0.35;
                    cx.rect(x - r, y - t, r * 2, t * 2);
                    cx.rect(x - t, y - r, t * 2, r * 2);
                    break;
                }
                case 'star': {
                    const spikes = 4;
                    const outerR = r;
                    const innerR = r * 0.45;
                    for (let i = 0; i < spikes * 2; i++) {
                        const ang = (i * Math.PI) / spikes - Math.PI / 2;
                        const rr = i % 2 === 0 ? outerR : innerR;
                        if (i === 0) cx.moveTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang));
                        else cx.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang));
                    }
                    cx.closePath();
                    break;
                }
                default: // circle
                    cx.arc(x, y, r, 0, 2 * Math.PI);
            }
        }

        // Draw scatter points — dmgStat별 시각적 구분
        datasets.forEach(ds => {
            ds.data.forEach((pt: any) => {
                const x = toX(pt.time);
                const y = toY(pt.value);
                if (x < PL - 5 || x > W - PR + 5) return;

                const stat = (pt as any).dmgStat || (pt.dmgType === 'dot_damage' ? 'dot_damage' : 'damage');
                const meta = DAMAGE_STAT_META[stat] ?? DAMAGE_STAT_META['unknown'];

                ctx.globalAlpha = meta.alpha;
                ctx.fillStyle = ds.color;

                drawShape(ctx, meta.shape, x, y, meta.radius);
                ctx.fill();

                // burst/core/sequential은 테두리로 강조
                if (stat === 'burst_damage' || stat === 'core_damage' || stat === 'sequential_damage') {
                    ctx.globalAlpha = meta.alpha * 0.6;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            });
        });
        ctx.globalAlpha = 1;

        // Draw hover effects
        if (hoverInfo && hoverInfo.points.length > 0) {
            hoverInfo.points.forEach(pt => {
                const x = toX(pt.time);
                const y = toY(pt.value);
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            // Draw line to x-axis for the first matched point
            const firstPt = hoverInfo.points[0];
            const xPos = toX(firstPt.time);
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(xPos, PT);
            ctx.lineTo(xPos, H - PB);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        const legX = PL + 10;
        let legY = PT + 8;
        datasets.forEach(ds => {
            ctx.fillStyle = hexToRgba(ds.color.startsWith('#') ? ds.color : '#888', 0.7);
            ctx.fillRect(legX, legY, 12, 12);
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(legX, legY, 12, 12);
            ctx.fillStyle = '#ccc';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = '11px monospace';
            ctx.fillText(ds.label, legX + 17, legY + 6);
            legY += 16;
        });

        ctx.fillStyle = '#e8e8e8';
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(title, PL, PT - 28);

        // ── 우측 상단: stat별 집계 카운트 ──────────────────────────────
        const totalPoints = datasets.reduce((s, ds) => s + ds.data.length, 0);
        if (totalPoints > 0) {
            const statCounts: Record<string, number> = {};
            datasets.forEach(ds => ds.data.forEach((p: any) => {
                const s = (p as any).dmgStat || 'damage';
                statCounts[s] = (statCounts[s] || 0) + 1;
            }));

            // stat 우선순위 순서로 표시 (발생 빈도 기준 상위 4개만)
            const topStats = Object.entries(statCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            let statLabelX = W - PR;
            const statLabelY = PT - 12;
            topStats.reverse().forEach(([stat, cnt]) => {
                const meta = DAMAGE_STAT_META[stat] ?? DAMAGE_STAT_META['unknown'];
                const txt = `${meta.label}: ${cnt}`;
                const tw = ctx.measureText(txt).width;
                ctx.fillStyle = '#555';
                ctx.fillText(txt, statLabelX, statLabelY);
                statLabelX -= tw + 14;
            });

            // 총 개수
            ctx.fillStyle = '#444';
            ctx.textAlign = 'right';
            ctx.fillText(`Total: ${totalPoints}`, W - PR, PT - 24);
        }

        // ── stat 형태 범례 (차트 우측 하단) ──────────────────────────
        {
            const usedStats = new Set<string>();
            datasets.forEach(ds => ds.data.forEach((p: any) => {
                usedStats.add((p as any).dmgStat || 'damage');
            }));
            const statOrder = [
                'damage', 'burst_damage', 'sequential_damage', 'split_damage',
                'dot_damage', 'bonus_damage', 'armor_break_damage', 'pierce_damage',
                'core_damage', 'projectile_explosion_damage', 'projectile_attachment_damage',
                'auto_damage', 'extra_damage', 'distribute_damage',
            ].filter(s => usedStats.has(s));

            if (statOrder.length > 1) {  // 2종 이상일 때만 범례 표시
                let legRX = W - PR;
                const legRY = H - PB + 22;
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';

                [...statOrder].reverse().forEach(stat => {
                    const meta = DAMAGE_STAT_META[stat] ?? DAMAGE_STAT_META['unknown'];
                    const txt = meta.label;
                    const tw = ctx.measureText(txt).width;
                    const iconX = legRX - tw - 10;
                    const iconY = legRY;

                    // 형태 아이콘
                    ctx.globalAlpha = 0.8;
                    ctx.fillStyle = '#888';
                    // 미니 아이콘 (r=4)
                    ctx.beginPath();
                    switch (meta.shape) {
                        case 'diamond':
                            ctx.moveTo(iconX, iconY - 4); ctx.lineTo(iconX + 4, iconY);
                            ctx.lineTo(iconX, iconY + 4); ctx.lineTo(iconX - 4, iconY);
                            ctx.closePath(); break;
                        case 'triangle':
                            ctx.moveTo(iconX, iconY - 4);
                            ctx.lineTo(iconX + 3.5, iconY + 2);
                            ctx.lineTo(iconX - 3.5, iconY + 2);
                            ctx.closePath(); break;
                        case 'square':
                            ctx.rect(iconX - 3.2, iconY - 3.2, 6.4, 6.4); break;
                        case 'star': {
                            for (let i = 0; i < 8; i++) {
                                const ang = (i * Math.PI) / 4 - Math.PI / 2;
                                const rr = i % 2 === 0 ? 4 : 1.8;
                                if (i === 0) ctx.moveTo(iconX + rr * Math.cos(ang), iconY + rr * Math.sin(ang));
                                else ctx.lineTo(iconX + rr * Math.cos(ang), iconY + rr * Math.sin(ang));
                            }
                            ctx.closePath(); break;
                        }
                        case 'cross': {
                            const t = 1.4;
                            ctx.rect(iconX - 4, iconY - t, 8, t * 2);
                            ctx.rect(iconX - t, iconY - 4, t * 2, 8); break;
                        }
                        default:
                            ctx.arc(iconX, iconY, 3.5, 0, 2 * Math.PI);
                    }
                    ctx.fill();
                    ctx.globalAlpha = 1;

                    ctx.fillStyle = '#555';
                    ctx.fillText(txt, legRX, legRY + 3.5);
                    legRX -= tw + 18;
                });
            }
        }

        const isZoomed = vMin > 0 || vMax < absMaxTime - 0.1;
        if (isZoomed) {
            ctx.fillStyle = '#555';
            ctx.textAlign = 'right';
            ctx.font = '11px monospace';
            ctx.fillText(`${formatTime(vMin)} – ${formatTime(vMax)}`, W - PR, PT - 28);
        }
    }, [datasets, burstWindows, hoverInfo, getViewRange, getAbsMaxTime, title]);

    useEffect(() => { draw(); }, [draw]);
    useEffect(() => { setViewMin(0); setViewMax(null); }, [datasets]);

    const handleWheelPos = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const absMax = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;
        const PL = 214, PR = 20;
        const canvas = canvasRef.current!;
        const graphW = canvas.width - PL - PR;

        const rect = canvas.getBoundingClientRect();
        const logX = (e.clientX - rect.left) * (canvas.width / canvas.clientWidth);

        const ratio = Math.max(0, Math.min(1, (logX - PL) / graphW));
        const cursor = vMin + ratio * range;
        const factor = e.deltaY < 0 ? 0.8 : 1.25;
        let newRange = Math.max(MIN_ZOOM_RANGE, Math.min(absMax, range * factor));
        let newMin = cursor - ratio * newRange;
        let newMax = cursor + (1 - ratio) * newRange;
        if (newMin < 0) { newMax = Math.min(absMax, newMax - newMin); newMin = 0; }
        if (newMax > absMax) { newMin = Math.max(0, newMin - (newMax - absMax)); newMax = absMax; }
        setViewMin(newMin);
        setViewMax(newMax >= absMax - 0.01 ? null : newMax);
    }, [getAbsMaxTime, getViewRange]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e: WheelEvent) => handleWheelPos(e);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, [handleWheelPos]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDragging.current = true;
        lastDragX.current = e.clientX;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (isDragging.current) {
            const absMax = getAbsMaxTime();
            const [vMin, vMax] = [viewMinRef.current, viewMaxRef.current ?? absMax];
            const range = vMax - vMin;
            const PL = 214, PR = 20;
            const graphW = canvas.width - PL - PR;
            const dx = (e.clientX - lastDragX.current) * (canvas.width / canvas.clientWidth);
            lastDragX.current = e.clientX;
            const dt = -(dx / graphW) * range;
            let nm = Math.max(0, vMin + dt);
            let nx = vMax + dt;
            if (nm < 0) { nx -= nm; nm = 0; }
            if (nx > absMax) { nm -= nx - absMax; nx = absMax; }
            setViewMin(Math.max(0, nm));
            setViewMax(nx >= absMax - 0.01 ? null : nx);
            return;
        }

        const PL = 214, PR = 20, PT = 50, PB = 45;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const canvasX = mouseX * (canvas.width / canvas.clientWidth);
        const canvasY = mouseY * (canvas.height / canvas.clientHeight);
        const graphW = canvas.width - PL - PR;
        const graphH = canvas.height - PT - PB;

        if (canvasX < PL || canvasX > canvas.width - PR || canvasY < PT || canvasY > canvas.height - PB) {
            setHoverInfo(null);
            return;
        }

        const [vMin, vMax] = getViewRange();
        let maxY = 100;
        datasets.forEach(ds => ds.data.forEach(pt => { if (pt.value > maxY) maxY = pt.value; }));
        maxY = maxY * 1.1;

        const toX = (t: number) => PL + ((t - vMin) / (vMax - vMin)) * graphW;
        const toY = (v: number) => canvas.height - PB - (v / maxY) * graphH;

        const hitRadius = 10;
        let matchedPoints: { label: string; color: string; time: number; value: number; description: string; skillName: string; dmgType?: string }[] = [];

        datasets.forEach(ds => {
            ds.data.forEach((pt: any) => {
                const px = toX(pt.time);
                const py = toY(pt.value);
                if (Math.hypot(px - canvasX, py - canvasY) <= hitRadius) {
                    matchedPoints.push({
                        label: ds.label,
                        color: ds.color,
                        time: pt.time,
                        value: pt.value,
                        description: pt.description,
                        skillName: pt.skillName || '',
                        dmgType: pt.dmgType,
                    });
                }
            });
        });

        if (matchedPoints.length > 0) {
            setHoverInfo({ x: mouseX, y: mouseY, points: matchedPoints });
        } else {
            setHoverInfo(null);
        }
    };

    const handleMouseUp = () => { isDragging.current = false; };
    const handleMouseLeave = () => { isDragging.current = false; setHoverInfo(null); };

    const absMaxTime = getAbsMaxTime();
    const [vMin, vMax] = getViewRange();
    const isZoomed = vMin > 0 || (viewMax !== null && vMax < absMaxTime - 0.1);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {isZoomed && (
                <button onClick={() => { setViewMin(0); setViewMax(null); }} style={{
                    position: 'absolute', top: '10px', right: '30px', zIndex: 10,
                    padding: '3px 8px', fontSize: '11px', background: '#2a2a2a',
                    color: '#aaa', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer',
                }}>Reset</button>
            )}
            <canvas
                ref={canvasRef}
                width={1200}
                height={380}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                    width: '100%', height: 'auto',
                    border: '1px solid #2a2a2a', borderRadius: '8px',
                    cursor: isDragging.current ? 'grabbing' : 'crosshair',
                    display: 'block', userSelect: 'none',
                }}
            />
            {hoverInfo && hoverInfo.points.length > 0 && (
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(hoverInfo.x + 15, (containerRef.current?.clientWidth ?? 400) - 200)}px`,
                    top: `${hoverInfo.y + 15}px`,
                    backgroundColor: 'rgba(15, 15, 25, 0.95)',
                    border: '1px solid #333', borderRadius: '6px',
                    padding: '10px 12px', color: '#fff', fontSize: '12px',
                    pointerEvents: 'none', zIndex: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)', minWidth: '180px',
                }}>
                    <div style={{ borderBottom: '1px solid #333', marginBottom: '6px', paddingBottom: '4px', fontWeight: 'bold', color: '#aaa', fontSize: '11px' }}>
                        ⏱ {formatTime(hoverInfo.points[0].time)}
                    </div>
                    {hoverInfo.points.map((pt, i) => (
                        <div key={i} style={{ marginBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '2px' }}>
                                <Font as="span" variant="caption-2" style={{ color: pt.color }}>● {pt.label}</Font>
                                <Font as="span" variant="caption-2" weight="bold" style={{ color: '#4fc3f7', fontVariantNumeric: 'tabular-nums' }}>
                                    {Math.floor(pt.value).toLocaleString()}
                                </Font>
                            </div>
                            {/* dmgStat 배지 */}
                            {(() => {
                                const stat = (pt as any).dmgStat || ((pt as any).dmgType === 'dot_damage' ? 'dot_damage' : 'damage');
                                const meta = DAMAGE_STAT_META[stat] ?? DAMAGE_STAT_META['unknown'];
                                const STAT_BADGE_COLORS: Record<string, string> = {
                                    'burst_damage': '#ffd700', 'dot_damage': '#ff8080',
                                    'sequential_damage': '#a78bfa', 'split_damage': '#34d399',
                                    'bonus_damage': '#fb923c', 'armor_break_damage': '#f472b6',
                                    'core_damage': '#facc15', 'damage': '#4fc3f7',
                                    'auto_damage': '#94a3b8', 'extra_damage': '#fb923c',
                                    'pierce_damage': '#60a5fa', 'projectile_explosion_damage': '#f97316',
                                    'projectile_attachment_damage': '#22d3ee',
                                };
                                const badgeColor = STAT_BADGE_COLORS[stat] ?? '#4fc3f7';
                                const shapeIcon: Record<string, string> = {
                                    'circle': '●', 'diamond': '◆', 'triangle': '▲',
                                    'square': '■', 'cross': '✚', 'star': '✦',
                                };
                                const icon = shapeIcon[meta.shape] ?? '●';
                                return (
                                    <div style={{ paddingLeft: '12px', marginBottom: '2px' }}>
                                        <span style={{
                                            fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                                            background: `${badgeColor}22`, color: badgeColor,
                                        }}>
                                            {icon} {meta.label}
                                        </span>
                                    </div>
                                );
                            })()}
                            <div style={{ color: '#aaa', fontSize: '11px', paddingLeft: '12px' }}>
                                {pt.skillName || pt.description || '스킬 대미지'}
                            </div>
                        </div>
                    ))}
                    {(() => {
                        const firstPt = hoverInfo.points[0];
                        const bw = burstWindows.find(w => firstPt.time >= w.start && firstPt.time <= w.end);
                        if (!bw || bw.casters.length === 0) return null;
                        return (
                            <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '4px', color: 'rgba(255,215,0,0.9)', fontSize: '11px' }}>
                                ⚡ {bw.casters.map(id => charIdToName[id] || id).join(' → ')}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default CanvasScatterChart;
