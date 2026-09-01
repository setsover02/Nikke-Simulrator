import React, { useEffect, useRef, useCallback } from 'react';
import { BurstWindow } from '../../utils/simUtils';
import { Font } from '../../components/Font';
import { useChartTheme } from '../../utils/useChartTheme';

function formatTime(timeVal: number): string {
    const remaining = Math.max(0, 180 - timeVal);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ChartData {
    time: number;
    dps: number;
}

interface Dataset {
    label: string;
    color: string;
    data: ChartData[];
    lineWidth?: number;
}

interface CanvasChartProps {
    datasets: Dataset[];
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

const CanvasChart = ({ datasets, burstWindows = [], title = 'Cumulative Combat Damage', charIdToName = {} }: CanvasChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = React.useState<number>(1200);
    const themeTokens = useChartTheme();

    const [hoverInfo, setHoverInfo] = React.useState<{
        x: number;
        y: number;
        time: number;
        values: { label: string; color: string; value: number; stackedTop: number }[];
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
        return max;
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

        if (datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) return;

        const absMaxTime = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const graphW = W;
        const graphH = H;

        const timePoints = datasets[0]?.data.map(d => d.time) ?? [];
        let maxStacked = 100;
        for (const t of timePoints) {
            const sum = datasets.reduce((acc, ds) => {
                const pt = ds.data.find(d => d.time === t);
                return acc + (pt?.dps ?? 0);
            }, 0);
            if (sum > maxStacked) maxStacked = sum;
        }

        const toX = (t: number) => ((t - vMin) / (vMax - vMin)) * graphW;
        const toY = (v: number) => H - (v / maxStacked) * graphH;

        // Y축 눈금선 (Half-pixel alignment for 1px crisp lines)
        ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
        const yTicks = 5;
        for (let i = 1; i <= yTicks; i++) {
            const ratio = i / yTicks;
            const yVal = maxStacked * ratio;
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

        // 2. 스택 면적 및 누적선
        const visibleDatasets = [...datasets];
        const stackedTops: number[][] = [];

        for (let di = 0; di < visibleDatasets.length; di++) {
            const tops: number[] = [];
            const tps = visibleDatasets[0].data.map(d => d.time);
            for (let ti = 0; ti < tps.length; ti++) {
                let cum = 0;
                for (let k = 0; k <= di; k++) {
                    const pt = visibleDatasets[k].data[ti];
                    cum += pt?.dps ?? 0;
                }
                tops.push(cum);
            }
            stackedTops.push(tops);
        }

        for (let di = visibleDatasets.length - 1; di >= 0; di--) {
            const ds = visibleDatasets[di];
            const dsColor = themeTokens.resolveColor(ds.color, di);
            const tops = stackedTops[di];
            const bottoms = di === 0 ? tops.map(() => 0) : stackedTops[di - 1];
            const tps = ds.data.map(d => d.time);

            ctx.beginPath();
            for (let ti = 0; ti < tps.length; ti++) {
                const x = toX(tps[ti]);
                const y = toY(tops[ti]);
                if (ti === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            for (let ti = tps.length - 1; ti >= 0; ti--) {
                ctx.lineTo(toX(tps[ti]), toY(bottoms[ti]));
            }
            ctx.closePath();
            ctx.fillStyle = hexToRgba(dsColor, 0.45);
            ctx.fill();

            ctx.beginPath();
            for (let ti = 0; ti < tps.length; ti++) {
                const x = toX(tps[ti]);
                const y = toY(tops[ti]);
                if (ti === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = dsColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // 3. 호버 라인
        if (hoverInfo) {
            const snapHoverX = Math.floor(toX(hoverInfo.time)) + 0.5;
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(snapHoverX, 0);
            ctx.lineTo(snapHoverX, H);
            ctx.strokeStyle = themeTokens.hoverLine;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // 4. 범례 (Legend)
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

        // 5. 줌 상태 표시
        const isZoomed = vMin > 0 || vMax < absMaxTime - 0.1;
        if (isZoomed) {
            ctx.fillStyle = themeTokens.fontInactive;
            ctx.textAlign = 'right';
            ctx.font = '500 10px "Wanted Sans Variable", "Wanted Sans", sans-serif';
            ctx.fillText(`${formatTime(vMin)} – ${formatTime(vMax)}`, Math.round(W - 12), 16);
        }
    }, [datasets, burstWindows, hoverInfo, getViewRange, getAbsMaxTime, title, charIdToName, containerWidth, themeTokens]);

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
        if (mouseX < 0 || mouseX > W) { setHoverInfo(null); return; }
        const [vMin, vMax] = getViewRange();
        const time = Math.round(vMin + (mouseX / W) * (vMax - vMin));

        let runningTop = 0;
        const values = datasets.map((ds) => {
            const pt = ds.data.find(d => d.time === time) ?? ds.data[ds.data.length - 1];
            runningTop += pt?.dps ?? 0;
            return { label: ds.label, color: ds.color, value: pt?.dps ?? 0, stackedTop: runningTop };
        });
        setHoverInfo({ x: mouseX, y: mouseY, time, values });
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
            {hoverInfo && (
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(hoverInfo.x + 15, (containerRef.current?.clientWidth ?? 400) - 180)}px`,
                    top: `${hoverInfo.y + 15}px`,
                    backgroundColor: 'var(--Background-Overlay)',
                    border: '1px solid var(--Divider-Strong)', borderRadius: '6px',
                    padding: '8px 10px', color: 'var(--Font-Default)',
                    pointerEvents: 'none', zIndex: 10,
                    boxShadow: 'var(--sh-md, 0 4px 16px rgba(0,0,0,0.4))', minWidth: '160px',
                    backdropFilter: 'blur(8px)',
                }}>
                    <div style={{ borderBottom: '1px solid var(--Divider-Normal)', marginBottom: '6px', paddingBottom: '4px' }}>
                        <Font as="span" variant="footnote" color="muted">
                            ⏱ {formatTime(hoverInfo.time)}
                        </Font>
                    </div>
                    {hoverInfo.values.map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '2px' }}>
                            <Font as="span" variant="footnote" style={{ color: v.color }}>● {v.label}</Font>
                            <Font as="span" variant="footnote" style={{ color: 'var(--Font-Default)', fontVariantNumeric: 'tabular-nums' }}>
                                {Math.floor(v.value).toLocaleString()}
                            </Font>
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--Divider-Normal)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <Font as="span" variant="footnote" color="muted">Total</Font>
                        <Font as="span" variant="footnote" weight="bold" style={{ color: 'var(--Font-Default)', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.floor(hoverInfo.values[hoverInfo.values.length - 1]?.stackedTop ?? 0).toLocaleString()}
                        </Font>
                    </div>
                    {(() => {
                        const bw = burstWindows.find(w => hoverInfo.time >= w.start && hoverInfo.time <= w.end);
                        if (!bw) return null;
                        const l1 = bw.casters.map(id => charIdToName[id] || id.split('_')[0]);
                        if (l1.length === 0) return null;
                        return (
                            <div style={{ borderTop: '1px solid var(--Divider-Normal, rgba(255,255,255,0.08))', marginTop: '4px', paddingTop: '4px', color: 'var(--Status-Warning-100, #FFCB50)', lineHeight: '1.5' }}>
                                <Font as="div" variant="footnote" color="muted" style={{ marginBottom: '2px' }}>⚡ Full Burst</Font>
                                {l1.map((name, i) => (
                                    <div key={i} style={{ paddingLeft: '6px' }}>
                                        <Font as="span" variant="footnote" style={{ color: 'var(--Status-Warning-100, #FFCB50)' }}>
                                            {i === 0 ? 'L1' : i === 1 ? 'L2' : i === 2 ? 'L3' : `+${i}`}: {name}
                                        </Font>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default CanvasChart;
