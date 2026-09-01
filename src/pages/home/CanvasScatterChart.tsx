import React, { useEffect, useRef, useCallback } from 'react';
import { BurstWindow, ScatterPoint, DAMAGE_STAT_META } from '../../utils/simUtils';
import { Font } from '../../components/Font';
import { useChartTheme } from '../../utils/useChartTheme';

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
    const [containerWidth, setContainerWidth] = React.useState<number>(1200);
    const themeTokens = useChartTheme();

    const [hoverInfo, setHoverInfo] = React.useState<{
        x: number;
        y: number;
        points: { label: string; color: string; time: number; value: number; description: string; skillName: string; dmgType?: string; dmgStat?: string }[];
    } | null>(null);

    const [viewMin, setViewMin] = React.useState(0);
    const [viewMax, setViewMax] = React.useState<number | null>(null);
    const isDragging = useRef(false);
    const lastDragX = useRef(0);
    const viewMinRef = useRef(0);
    const viewMaxRef = useRef<number | null>(null);

    useEffect(() => { viewMinRef.current = viewMin; }, [viewMin]);
    useEffect(() => { viewMaxRef.current = viewMax; }, [viewMax]);

    // Container ResizeObserver for integer CSS pixel dimension
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateWidth = () => {
            const w = Math.floor(container.clientWidth);
            if (w > 0) setContainerWidth(w);
        };

        updateWidth();
        const ro = new ResizeObserver(updateWidth);
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

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

        const dpr = window.devicePixelRatio || 1;
        const W = containerWidth || 1200;
        const H = 380;

        // Set backing buffer size with DPR
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, W, H);

        if (datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) {
            // 빈 데이터셋: 안내 메시지 표시
            ctx.fillStyle = themeTokens.fontInactive;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.fillText('스킬 대미지가 없습니다', Math.round(W / 2), Math.round(H / 2));
            return;
        }

        const absMaxTime = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const graphW = W;
        const graphH = H;

        let maxY = 100;
        datasets.forEach(ds => {
            ds.data.forEach(pt => {
                if (pt.value > maxY) maxY = pt.value;
            });
        });
        maxY = maxY * 1.1; // 10% headroom

        const toX = (t: number) => ((t - vMin) / (vMax - vMin)) * graphW;
        const toY = (v: number) => H - (v / maxY) * graphH;

        // Y축 눈금선
        ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
        const yTicks = 5;
        for (let i = 1; i <= yTicks; i++) {
            const ratio = i / yTicks;
            const yVal = maxY * ratio;
            const yPos = H - ratio * graphH;
            const snapY = Math.floor(yPos) + 0.5;

            ctx.beginPath();
            ctx.moveTo(0, snapY);
            ctx.lineTo(W, snapY);
            ctx.strokeStyle = themeTokens.gridLine;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = themeTokens.fontInactive;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(Math.floor(yVal).toLocaleString(), Math.round(W - 8), Math.round(snapY - 2));
        }

        // X축 눈금선
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
        ctx.textBaseline = 'bottom';
        for (let t = firstTick; t <= vMax; t += tickInterval) {
            const xPos = ((t - vMin) / range) * graphW;
            const snapX = Math.floor(xPos) + 0.5;

            ctx.beginPath();
            ctx.moveTo(snapX, 0);
            ctx.lineTo(snapX, H);
            ctx.strokeStyle = themeTokens.gridLine;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = themeTokens.fontInactive;
            ctx.fillText(formatTime(t), Math.round(xPos), Math.round(H - 6));
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, graphW, graphH);
        ctx.clip();

        // 1. 버스트 구간 배경 (미니멀 배경 채우기)
        burstWindows.forEach(bw => {
            const s = Math.max(bw.start, vMin);
            const e = Math.min(bw.end, vMax);
            if (e <= s) return;
            const bx = toX(s);
            const bw2 = toX(e) - bx;

            ctx.fillStyle = themeTokens.burstBg;
            ctx.fillRect(Math.floor(bx), 0, Math.floor(bw2), graphH);
        });

        // ── stat별 형태 그리기 함수 ──────────────────────────────────────
        function drawShape(
            cx: number, cy: number,
            shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'cross' | 'star',
            r: number, color: string, alpha: number
        ) {
            ctx!.save();
            ctx!.fillStyle = hexToRgba(color.startsWith('#') ? color : '#888', alpha);
            ctx!.strokeStyle = color;
            ctx!.lineWidth = 1;

            switch (shape) {
                case 'circle':
                    ctx!.beginPath();
                    ctx!.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx!.fill();
                    ctx!.stroke();
                    break;
                case 'diamond':
                    ctx!.beginPath();
                    ctx!.moveTo(cx, cy - r * 1.3);
                    ctx!.lineTo(cx + r * 1.1, cy);
                    ctx!.lineTo(cx, cy + r * 1.3);
                    ctx!.lineTo(cx - r * 1.1, cy);
                    ctx!.closePath();
                    ctx!.fill();
                    ctx!.stroke();
                    break;
                case 'triangle':
                    ctx!.beginPath();
                    ctx!.moveTo(cx, cy - r * 1.25);
                    ctx!.lineTo(cx + r * 1.1, cy + r * 0.9);
                    ctx!.lineTo(cx - r * 1.1, cy + r * 0.9);
                    ctx!.closePath();
                    ctx!.fill();
                    ctx!.stroke();
                    break;
                case 'square':
                    ctx!.beginPath();
                    ctx!.rect(cx - r, cy - r, r * 2, r * 2);
                    ctx!.fill();
                    ctx!.stroke();
                    break;
                case 'cross':
                    ctx!.beginPath();
                    ctx!.moveTo(cx - r, cy); ctx!.lineTo(cx + r, cy);
                    ctx!.moveTo(cx, cy - r); ctx!.lineTo(cx, cy + r);
                    ctx!.lineWidth = 1.5;
                    ctx!.stroke();
                    break;
                case 'star': {
                    const spikes = 5;
                    const outerR = r * 1.25;
                    const innerR = r * 0.55;
                    let rot = (Math.PI / 2) * 3;
                    const step = Math.PI / spikes;
                    ctx!.beginPath();
                    ctx!.moveTo(cx, cy - outerR);
                    for (let si = 0; si < spikes; si++) {
                        ctx!.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
                        rot += step;
                        ctx!.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
                        rot += step;
                    }
                    ctx!.lineTo(cx, cy - outerR);
                    ctx!.closePath();
                    ctx!.fill();
                    ctx!.stroke();
                    break;
                }
            }
            ctx!.restore();
        }

        // 2. 포인트 그리기
        datasets.forEach((ds, di) => {
            const dsColor = themeTokens.resolveColor(ds.color, di);
            ds.data.forEach(pt => {
                if (pt.time < vMin || pt.time > vMax) return;
                const px = toX(pt.time);
                const py = toY(pt.value);
                const stat = pt.dmgStat || (pt.dmgType === 'dot_damage' ? 'dot_damage' : 'damage');
                const meta = DAMAGE_STAT_META[stat] ?? DAMAGE_STAT_META['unknown'];
                drawShape(px, py, meta.shape, meta.radius, dsColor, meta.alpha);
            });
        });

        // 3. 호버된 포인트 강조
        if (hoverInfo) {
            hoverInfo.points.forEach(pt => {
                const px = toX(pt.time);
                const py = toY(pt.value);
                ctx.beginPath();
                ctx.arc(px, py, 7, 0, Math.PI * 2);
                ctx.strokeStyle = themeTokens.theme === 'light' ? '#393939' : '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        ctx.restore();

        // 4. 범례
        const legX = 12;
        let legY = 12;
        datasets.forEach((ds, di) => {
            const dsColor = themeTokens.resolveColor(ds.color, di);
            ctx.fillStyle = hexToRgba(dsColor, 0.7);
            ctx.fillRect(legX, legY, 10, 10);
            ctx.strokeStyle = dsColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(legX + 0.5, legY + 0.5, 9, 9);
            ctx.fillStyle = themeTokens.fontDefault;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = '500 11px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.fillText(ds.label, Math.round(legX + 15), Math.round(legY + 5));
            legY += 16;
        });

        // 5. 줌 상태
        const isZoomed = vMin > 0 || vMax < absMaxTime - 0.1;
        if (isZoomed) {
            ctx.fillStyle = themeTokens.fontInactive;
            ctx.textAlign = 'right';
            ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.fillText(`${formatTime(vMin)} – ${formatTime(vMax)}`, Math.round(W - 12), 16);
        }
    }, [datasets, burstWindows, hoverInfo, getViewRange, getAbsMaxTime, title, containerWidth, themeTokens]);

    useEffect(() => { draw(); }, [draw]);
    useEffect(() => { setViewMin(0); setViewMax(null); }, [datasets]);

    const handleWheelPos = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const absMax = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;
        const W = containerWidth || 1200;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;

        const ratio = Math.max(0, Math.min(1, mouseX / W));
        const cursor = vMin + ratio * range;
        const factor = e.deltaY < 0 ? 0.8 : 1.25;
        let newRange = Math.max(MIN_ZOOM_RANGE, Math.min(absMax, range * factor));
        let newMin = cursor - ratio * newRange;
        let newMax = cursor + (1 - ratio) * newRange;
        if (newMin < 0) { newMax = Math.min(absMax, newMax - newMin); newMin = 0; }
        if (newMax > absMax) { newMin = Math.max(0, newMin - (newMax - absMax)); newMax = absMax; }
        setViewMin(newMin);
        setViewMax(newMax >= absMax - 0.01 ? null : newMax);
    }, [getAbsMaxTime, getViewRange, containerWidth]);

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
        const W = containerWidth || 1200;
        const H = 380;

        if (isDragging.current) {
            const absMax = getAbsMaxTime();
            const [vMin, vMax] = [viewMinRef.current, viewMaxRef.current ?? absMax];
            const range = vMax - vMin;
            const dx = e.clientX - lastDragX.current;
            lastDragX.current = e.clientX;
            const dt = -(dx / W) * range;
            let nm = Math.max(0, vMin + dt);
            let nx = vMax + dt;
            if (nm < 0) { nx -= nm; nm = 0; }
            if (nx > absMax) { nm -= nx - absMax; nx = absMax; }
            setViewMin(Math.max(0, nm));
            setViewMax(nx >= absMax - 0.01 ? null : nx);
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H) {
            setHoverInfo(null);
            return;
        }

        const [vMin, vMax] = getViewRange();
        let maxY = 100;
        datasets.forEach(ds => ds.data.forEach(pt => { if (pt.value > maxY) maxY = pt.value; }));
        maxY = maxY * 1.1;

        const toX = (t: number) => ((t - vMin) / (vMax - vMin)) * W;
        const toY = (v: number) => H - (v / maxY) * H;

        const hitRadius = 10;
        let matchedPoints: { label: string; color: string; time: number; value: number; description: string; skillName: string; dmgType?: string }[] = [];

        datasets.forEach(ds => {
            ds.data.forEach((pt: any) => {
                const px = toX(pt.time);
                const py = toY(pt.value);
                if (Math.hypot(px - mouseX, py - mouseY) <= hitRadius) {
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
                    position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                    padding: '3px 8px', fontSize: '11px', background: 'var(--Secondary-100)',
                    color: 'var(--Font-Default)', border: '1px solid var(--Divider-Strong)',
                    borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit',
                }}>Reset</button>
            )}
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                style={{
                    width: '100%', height: '380px',
                    border: '1px solid var(--Divider-Normal)', borderRadius: '8px',
                    cursor: isDragging.current ? 'grabbing' : 'crosshair',
                    display: 'block', userSelect: 'none',
                }}
            />
            {hoverInfo && hoverInfo.points.length > 0 && (
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(hoverInfo.x + 15, (containerRef.current?.clientWidth ?? 400) - 200)}px`,
                    top: `${hoverInfo.y + 15}px`,
                    backgroundColor: 'var(--Background-Overlay)',
                    border: '1px solid var(--Divider-Strong)', borderRadius: '6px',
                    padding: '8px 10px', color: 'var(--Font-Default)',
                    pointerEvents: 'none', zIndex: 10,
                    boxShadow: 'var(--sh-md, 0 4px 16px rgba(0,0,0,0.4))', minWidth: '180px',
                    backdropFilter: 'blur(8px)',
                }}>
                    <div style={{ borderBottom: '1px solid var(--Divider-Normal)', marginBottom: '6px', paddingBottom: '4px' }}>
                        <Font as="span" variant="footnote" color="muted">
                            ⏱ {formatTime(hoverInfo.points[0].time)}
                        </Font>
                    </div>
                    {hoverInfo.points.map((pt, i) => (
                        <div key={i} style={{ marginBottom: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '2px' }}>
                                <Font as="span" variant="footnote" style={{ color: pt.color }}>● {pt.label}</Font>
                                <Font as="span" variant="footnote" weight="bold" style={{ color: 'var(--Accent-Cyan)', fontVariantNumeric: 'tabular-nums' }}>
                                    {Math.floor(pt.value).toLocaleString()}
                                </Font>
                            </div>
                            {(() => {
                                const stat = (pt as any).dmgStat || ((pt as any).dmgType === 'dot_damage' ? 'dot_damage' : 'damage');
                                const meta = DAMAGE_STAT_META[stat] ?? DAMAGE_STAT_META['unknown'];
                                const STAT_BADGE_COLORS: Record<string, string> = {
                                    'burst_damage': '#FFCB50', 'dot_damage': '#FF8C8C',
                                    'sequential_damage': '#DE96FF', 'split_damage': '#49E57D',
                                    'bonus_damage': '#FFA938', 'armor_break_damage': '#FA73E3',
                                    'core_damage': '#FFD676', 'damage': '#57DFF7',
                                    'auto_damage': '#8E8E8E', 'extra_damage': '#FF9B61',
                                    'pierce_damage': '#69A5FF', 'projectile_explosion_damage': '#FF7B2E',
                                    'projectile_attachment_damage': '#28D0ED',
                                };
                                const badgeColor = STAT_BADGE_COLORS[stat] ?? '#57DFF7';
                                const shapeIcon: Record<string, string> = {
                                    'circle': '●', 'diamond': '◆', 'triangle': '▲',
                                    'square': '■', 'cross': '✚', 'star': '✦',
                                };
                                const icon = shapeIcon[meta.shape] ?? '●';
                                return (
                                    <div style={{ paddingLeft: '8px', marginBottom: '2px' }}>
                                        <span style={{
                                            fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                                            background: `${badgeColor}22`, color: badgeColor,
                                        }}>
                                            {icon} {meta.label}
                                        </span>
                                    </div>
                                );
                            })()}
                            <div style={{ color: 'var(--Font-Inactive)', fontSize: '10px', paddingLeft: '8px' }}>
                                {pt.skillName || pt.description || '스킬 대미지'}
                            </div>
                        </div>
                    ))}
                    {(() => {
                        const firstPt = hoverInfo.points[0];
                        const bw = burstWindows.find(w => firstPt.time >= w.start && firstPt.time <= w.end);
                        if (!bw || bw.casters.length === 0) return null;
                        return (
                            <div style={{ borderTop: '1px solid var(--Divider-Normal)', marginTop: '4px', paddingTop: '4px', color: 'var(--Status-Warning-100, #FFCB50)', fontSize: '10px' }}>
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
