import React, { useEffect, useRef, useCallback } from 'react';
import { BurstWindow } from '../../utils/simUtils';
import { Font } from '../../components/Font';

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

interface CanvasDpsChartProps {
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

export const CanvasDpsChart: React.FC<CanvasDpsChartProps> = ({
    datasets,
    burstWindows = [],
    title = '1s Interval DPS',
    charIdToName = {},
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [hoverInfo, setHoverInfo] = React.useState<{
        x: number;
        y: number;
        time: number;
        values: { label: string; color: string; value: number }[];
        total: number;
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

        // Y축 최대값 계산 (개별 캐릭터 DPS 중 최댓값 기준, 여유 공간 확보)
        let maxDps = 100;
        datasets.forEach(ds => {
            ds.data.forEach(d => {
                if (d.dps > maxDps) maxDps = d.dps;
            });
        });
        // 10% 여유
        maxDps = Math.ceil(maxDps * 1.1);

        const toX = (t: number) => PL + ((t - vMin) / (vMax - vMin)) * graphW;
        const toY = (v: number) => H - PB - (v / maxDps) * graphH;

        // Y축 그리드선 및 라벨
        ctx.font = '11px monospace';
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const ratio = i / yTicks;
            const yVal = maxDps * ratio;
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

        // X축 그리드선 및 시간 라벨
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

        // 축 테두리
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

        // 1. 버스트 구간 배경 및 가이드라인
        burstWindows.forEach(bw => {
            const s = Math.max(bw.start, vMin);
            const e = Math.min(bw.end, vMax);
            if (e <= s) return;
            const bx = toX(s);
            const bw2 = toX(e) - bx;

            // 버스트 구간 배경 (골드 반투명)
            ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
            ctx.fillRect(bx, PT, bw2, graphH);

            // 버스트 구간 시작선
            ctx.beginPath();
            ctx.moveTo(bx, PT);
            ctx.lineTo(bx, H - PB);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // 버스트 구간 종료선
            const ex = toX(e);
            ctx.beginPath();
            ctx.moveTo(ex, PT);
            ctx.lineTo(ex, H - PB);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // 버스트 캐스터 이름 라벨
            if (bw.casters.length > 0) {
                const names = bw.casters.map(id => charIdToName[id] || id.split('_')[0]);
                const label = names.join(' → ');
                const maxW = Math.max(0, bw2 - 8);
                ctx.font = 'bold 10px sans-serif';
                ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                let displayLabel = label;
                if (maxW > 0 && ctx.measureText(displayLabel).width > maxW) {
                    while (displayLabel.length > 1 && ctx.measureText(displayLabel + '…').width > maxW) {
                        displayLabel = displayLabel.slice(0, -1);
                    }
                    displayLabel += '…';
                }
                ctx.fillText(displayLabel, bx + 4, PT + 4);
            }
        });

        // 2. 각 니케별 1초 DPS 라인 및 은은한 영역 채우기
        datasets.forEach(ds => {
            const tps = ds.data.map(d => d.time);
            if (tps.length === 0) return;

            // 은은한 영역 채우기
            ctx.beginPath();
            ctx.moveTo(toX(tps[0]), H - PB);
            for (let ti = 0; ti < tps.length; ti++) {
                const x = toX(tps[ti]);
                const y = toY(ds.data[ti].dps);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(toX(tps[tps.length - 1]), H - PB);
            ctx.closePath();
            ctx.fillStyle = hexToRgba(ds.color.startsWith('#') ? ds.color : '#888888', 0.1);
            ctx.fill();

            // 선명한 라인 스트로크
            ctx.beginPath();
            for (let ti = 0; ti < tps.length; ti++) {
                const x = toX(tps[ti]);
                const y = toY(ds.data[ti].dps);
                if (ti === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = ds.lineWidth ?? 2;
            ctx.stroke();
        });

        // 3. 호버 수직선
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

            // 각 데이터셋의 현재 시점 포인트 원(Point Circle)
            datasets.forEach(ds => {
                const pt = ds.data.find(d => d.time === hoverInfo.time);
                if (pt) {
                    const cx = toX(pt.time);
                    const cy = toY(pt.dps);
                    ctx.beginPath();
                    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                    ctx.fillStyle = ds.color;
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            });
        }

        ctx.restore();

        // 4. 범례 (Legend)
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

        // 5. 차트 타이틀 & 줌 상태
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
    }, [datasets, burstWindows, hoverInfo, getViewRange, getAbsMaxTime, title, charIdToName]);

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

        let totalDps = 0;
        const values = datasets.map((ds) => {
            const pt = ds.data.find(d => d.time === time) ?? ds.data[ds.data.length - 1];
            const val = pt?.dps ?? 0;
            totalDps += val;
            return { label: ds.label, color: ds.color, value: val };
        });
        setHoverInfo({ x: mouseX, y: mouseY, time, values, total: totalDps });
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
                        ⏱ {formatTime(hoverInfo.time)} ({hoverInfo.time}s)
                    </div>
                    {hoverInfo.values.map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                            <Font as="span" variant="caption-2" style={{ color: v.color }}>● {v.label}</Font>
                            <Font as="span" variant="caption-2" style={{ color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>{Math.floor(v.value).toLocaleString()} /s</Font>
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <Font as="span" variant="caption-2" color="muted">Total DPS</Font>
                        <Font as="span" variant="caption-2" weight="bold" style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                            {Math.floor(hoverInfo.total).toLocaleString()} /s
                        </Font>
                    </div>
                    {(() => {
                        const bw = burstWindows.find(w => hoverInfo.time >= w.start && hoverInfo.time <= w.end);
                        if (!bw) return null;
                        const l1 = bw.casters.map(id => charIdToName[id] || id.split('_')[0]);
                        if (l1.length === 0) return null;
                        return (
                            <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '4px', color: 'rgba(255,215,0,0.9)', fontSize: '11px', lineHeight: '1.6' }}>
                                <div style={{ color: '#aaa', marginBottom: '2px' }}>⚡ Full Burst</div>
                                {l1.map((name, i) => (
                                    <div key={i} style={{ paddingLeft: '8px' }}>
                                        {i === 0 ? 'L1' : i === 1 ? 'L2' : i === 2 ? 'L3' : `+${i}`}: <span style={{ color: 'rgba(255,215,0,1)' }}>{name}</span>
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

export default CanvasDpsChart;
