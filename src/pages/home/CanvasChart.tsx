import React, { useEffect, useRef, useCallback } from 'react';
import { BurstWindow } from '../../utils/simUtils';

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

        const W = canvas.width;
        const H = canvas.height;
        const PL = 214, PR = 20, PT = 50, PB = 45;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, W, H);

        if (datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) return;

        const absMaxTime = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const graphW = W - PL - PR;
        const graphH = H - PT - PB;

        const timePoints = datasets[0]?.data.map(d => d.time) ?? [];
        let maxStacked = 100;
        for (const t of timePoints) {
            const sum = datasets.reduce((acc, ds) => {
                const pt = ds.data.find(d => d.time === t);
                return acc + (pt?.dps ?? 0);
            }, 0);
            if (sum > maxStacked) maxStacked = sum;
        }

        const toX = (t: number) => PL + ((t - vMin) / (vMax - vMin)) * graphW;
        const toY = (v: number) => H - PB - (v / maxStacked) * graphH;

        ctx.font = '11px monospace';
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const ratio = i / yTicks;
            const yVal = maxStacked * ratio;
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
            ctx.fillStyle = hexToRgba(ds.color.startsWith('#') ? ds.color : '#888888', 0.45);
            ctx.fill();

            ctx.beginPath();
            for (let ti = 0; ti < tps.length; ti++) {
                const x = toX(tps[ti]);
                const y = toY(tops[ti]);
                if (ti === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        if (hoverInfo) {
            const xPos = toX(hoverInfo.time);
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(xPos, PT);
            ctx.lineTo(xPos, H - PB);
            ctx.strokeStyle = '#888';
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

        const PL = 214, PR = 20;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const logX = mouseX * (canvas.width / canvas.clientWidth);
        const graphW = canvas.width - PL - PR;
        if (logX < PL || logX > canvas.width - PR) { setHoverInfo(null); return; }
        const [vMin, vMax] = getViewRange();
        const time = Math.round(vMin + ((logX - PL) / graphW) * (vMax - vMin));

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
            {hoverInfo && (
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(hoverInfo.x + 15, (containerRef.current?.clientWidth ?? 400) - 180)}px`,
                    top: `${hoverInfo.y + 15}px`,
                    backgroundColor: 'rgba(15, 15, 25, 0.95)',
                    border: '1px solid #333', borderRadius: '6px',
                    padding: '10px 12px', color: '#fff', fontSize: '12px',
                    pointerEvents: 'none', zIndex: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)', minWidth: '160px',
                }}>
                    <div style={{ borderBottom: '1px solid #333', marginBottom: '6px', paddingBottom: '4px', fontWeight: 'bold', color: '#aaa', fontSize: '11px' }}>
                        ⏱ {formatTime(hoverInfo.time)}
                    </div>
                    {hoverInfo.values.map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                            <span style={{ color: v.color }}>● {v.label}</span>
                            <span style={{ color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>{Math.floor(v.value).toLocaleString()}</span>
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: '#888' }}>Total</span>
                        <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.floor(hoverInfo.values[hoverInfo.values.length - 1]?.stackedTop ?? 0).toLocaleString()}
                        </span>
                    </div>
                    {(() => {
                        const bw = burstWindows.find(w => hoverInfo.time >= w.start && hoverInfo.time <= w.end);
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

export default CanvasChart;
