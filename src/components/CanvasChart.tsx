import React, { useEffect, useRef, useCallback } from 'react';

interface ChartData {
    time: number;
    dps: number;
}

interface Dataset {
    label: string;
    color: string;
    data: ChartData[];
}

interface CanvasChartProps {
    datasets: Dataset[];
}

const MIN_ZOOM_RANGE = 5; // Minimum visible time span in seconds

const CanvasChart = ({ datasets }: CanvasChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [hoverInfo, setHoverInfo] = React.useState<{
        x: number;
        y: number;
        time: number;
        values: { label: string; color: string; value: number }[];
    } | null>(null);

    // View state: visible time window [viewMin, viewMax]
    const [viewMin, setViewMin] = React.useState(0);
    const [viewMax, setViewMax] = React.useState<number | null>(null); // null = use absoluteMaxTime

    // Drag state
    const isDragging = useRef(false);
    const lastDragX = useRef(0);
    // We need stable refs for viewMin/viewMax during drag
    const viewMinRef = useRef(0);
    const viewMaxRef = useRef<number | null>(null);

    // Keep refs in sync with state
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
        const vMin = viewMin;
        const vMax = viewMax ?? absMax;
        return [vMin, vMax];
    }, [viewMin, viewMax, getAbsMaxTime]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const paddingLeft = 100;
        const paddingRight = 60;
        const paddingVertical = 60;

        const bgColor = '#141414';
        const axisColor = '#444';
        const gridColor = '#262626';
        const textColor = '#8c8c8c';
        const titleColor = '#e8e8e8';

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        if (datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) return;

        const absMaxTime = getAbsMaxTime();
        let maxDps = 100;
        datasets.forEach(ds => {
            const curMaxDps = Math.max(...ds.data.map(d => d.dps), 100);
            if (curMaxDps > maxDps) maxDps = curMaxDps;
        });

        const [vMin, vMax] = getViewRange();
        const graphWidth = width - paddingLeft - paddingRight;
        const graphHeight = height - 2 * paddingVertical;

        const timeToX = (t: number) =>
            paddingLeft + ((t - vMin) / (vMax - vMin)) * graphWidth;
        const dpsToY = (dps: number) =>
            height - paddingVertical - (dps / maxDps) * graphHeight;

        // Y-axis grid & labels
        const yTicks = 4;
        ctx.font = '12px "Wanted Sans Variable", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= yTicks; i++) {
            const yRatio = i / yTicks;
            const yVal = maxDps * yRatio;
            const yPos = height - paddingVertical - yRatio * graphHeight;

            ctx.beginPath();
            ctx.moveTo(paddingLeft, yPos);
            ctx.lineTo(width - paddingRight, yPos);
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.fillText(Math.floor(yVal).toLocaleString(), paddingLeft - 10, yPos);
        }

        // X-axis grid & labels
        const xTicks = 6;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= xTicks; i++) {
            const xRatio = i / xTicks;
            const xTimeVal = vMin + xRatio * (vMax - vMin);
            const xPos = paddingLeft + xRatio * graphWidth;

            ctx.beginPath();
            ctx.moveTo(xPos, paddingVertical);
            ctx.lineTo(xPos, height - paddingVertical);
            ctx.strokeStyle = gridColor;
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.fillText(`${Math.floor(xTimeVal)}s`, xPos, height - paddingVertical + 10);
        }

        // Axis Lines
        ctx.beginPath();
        ctx.moveTo(paddingLeft, paddingVertical);
        ctx.lineTo(paddingLeft, height - paddingVertical);
        ctx.lineTo(width - paddingRight, height - paddingVertical);
        ctx.strokeStyle = axisColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Clip drawing to graph area
        ctx.save();
        ctx.beginPath();
        ctx.rect(paddingLeft, paddingVertical, graphWidth, graphHeight);
        ctx.clip();

        // Data lines
        datasets.forEach((ds, dsIdx) => {
            if (ds.data.length === 0) return;

            ctx.beginPath();
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = 2.5;
            ds.data.forEach((d, i) => {
                const x = timeToX(d.time);
                const y = dpsToY(d.dps);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });

        // Hover vertical line (clipped)
        if (hoverInfo) {
            const xPos = timeToX(hoverInfo.time);
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(xPos, paddingVertical);
            ctx.lineTo(xPos, height - paddingVertical);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // Legend (outside clip)
        datasets.forEach((ds, dsIdx) => {
            const legendX = width - paddingRight - 190;
            const legendY = paddingVertical + dsIdx * 25;
            ctx.fillStyle = ds.color;
            ctx.fillRect(legendX, legendY, 12, 12);

            ctx.fillStyle = titleColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = '12px "Wanted Sans Variable", sans-serif';
            ctx.fillText(ds.label, legendX + 20, legendY + 6);
        });

        // Title
        ctx.fillStyle = titleColor;
        ctx.textAlign = 'left';
        ctx.font = 'bold 14px "Wanted Sans Variable", sans-serif';
        ctx.fillText('Cumulative Combat Damage', paddingLeft, paddingVertical - 30);

        // Zoom indicator (if zoomed in)
        const isZoomed = vMin > 0 || vMax < absMaxTime - 0.1;
        if (isZoomed) {
            ctx.fillStyle = '#555';
            ctx.textAlign = 'right';
            ctx.font = '11px "Wanted Sans Variable", sans-serif';
            ctx.fillText(`View: ${Math.floor(vMin)}s – ${Math.floor(vMax)}s`, width - paddingRight, paddingVertical - 30);
        }
    }, [datasets, hoverInfo, getViewRange, getAbsMaxTime]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Reset datasets view range when datasets change
    useEffect(() => {
        setViewMin(0);
        setViewMax(null);
    }, [datasets]);

    const getLogicalMouseX = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent): number => {
        const canvas = canvasRef.current;
        if (!canvas) return 0;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scaleX = canvas.width / canvas.clientWidth;
        return mouseX * scaleX;
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const absMax = getAbsMaxTime();
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;

        const paddingLeft = 100;
        const paddingRight = 60;
        const graphWidth = canvas.width - paddingLeft - paddingRight;
        const logicalX = getLogicalMouseX(e);
        const clampedX = Math.max(paddingLeft, Math.min(canvas.width - paddingRight, logicalX));
        const cursorRatio = (clampedX - paddingLeft) / graphWidth;
        const cursorTime = vMin + cursorRatio * range;

        const zoomFactor = e.deltaY < 0 ? 0.8 : 1.25;
        let newRange = range * zoomFactor;
        newRange = Math.max(MIN_ZOOM_RANGE, Math.min(absMax, newRange));

        let newMin = cursorTime - cursorRatio * newRange;
        let newMax = cursorTime + (1 - cursorRatio) * newRange;

        // Clamp to [0, absMax]
        if (newMin < 0) {
            newMax = Math.min(absMax, newMax - newMin);
            newMin = 0;
        }
        if (newMax > absMax) {
            newMin = Math.max(0, newMin - (newMax - absMax));
            newMax = absMax;
        }

        setViewMin(newMin);
        setViewMax(newMax === absMax ? null : newMax);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        isDragging.current = true;
        lastDragX.current = e.clientX;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // --- Panning ---
        if (isDragging.current) {
            const absMax = getAbsMaxTime();
            const [vMin, vMax] = [viewMinRef.current, viewMaxRef.current ?? absMax];
            const range = vMax - vMin;
            const graphWidth = canvas.width - 100 - 60;
            const scaleX = canvas.width / canvas.clientWidth;
            const dx = (e.clientX - lastDragX.current) * scaleX;
            lastDragX.current = e.clientX;

            const timeDelta = -(dx / graphWidth) * range;
            let newMin = vMin + timeDelta;
            let newMax = vMax + timeDelta;

            if (newMin < 0) { newMax -= newMin; newMin = 0; }
            if (newMax > absMax) { newMin -= newMax - absMax; newMax = absMax; }
            newMin = Math.max(0, newMin);

            setViewMin(newMin);
            setViewMax(newMax === absMax ? null : newMax);
            return;
        }

        // --- Hover ---
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const paddingLeft = 100;
        const paddingRight = 60;
        const scaleX = canvas.width / canvas.clientWidth;
        const logicalMouseX = mouseX * scaleX;
        const graphLeft = paddingLeft;
        const graphRight = canvas.width - paddingRight;

        if (logicalMouseX < graphLeft || logicalMouseX > graphRight) {
            setHoverInfo(null);
            return;
        }

        const [vMin, vMax] = getViewRange();
        const graphWidth = canvas.width - paddingLeft - paddingRight;
        const timeRatio = (logicalMouseX - graphLeft) / graphWidth;
        const time = Math.round(vMin + timeRatio * (vMax - vMin));

        const values = datasets.map(ds => {
            const point = ds.data.find(d => d.time === time) || ds.data[ds.data.length - 1];
            return { label: ds.label, color: ds.color, value: point?.dps || 0 };
        });

        setHoverInfo({ x: mouseX, y: mouseY, time, values });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        setHoverInfo(null);
    };

    const handleResetView = () => {
        setViewMin(0);
        setViewMax(null);
    };

    const absMaxTime = getAbsMaxTime();
    const [vMin, vMax] = getViewRange();
    const isZoomed = vMin > 0 || (viewMax !== null && vMax < absMaxTime - 0.1);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
            {isZoomed && (
                <button
                    onClick={handleResetView}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '70px',
                        zIndex: 10,
                        padding: '4px 10px',
                        fontSize: '11px',
                        background: '#2a2a2a',
                        color: '#aaa',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Reset View
                </button>
            )}
            <canvas
                ref={canvasRef}
                width={800}
                height={400}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                style={{
                    width: '100%',
                    height: 'auto',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    cursor: isDragging.current ? 'grabbing' : 'crosshair',
                    display: 'block',
                    userSelect: 'none',
                }}
            />
            {hoverInfo && (
                <div style={{
                    position: 'absolute',
                    left: `${hoverInfo.x + 15}px`,
                    top: `${hoverInfo.y + 15}px`,
                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    minWidth: '150px',
                }}>
                    <div style={{ borderBottom: '1px solid #444', marginBottom: '5px', paddingBottom: '3px', fontWeight: 'bold' }}>
                        Time: {hoverInfo.time}s
                    </div>
                    {hoverInfo.values.map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '2px' }}>
                            <span style={{ color: v.color }}>● {v.label}:</span>
                            <span>{Math.floor(v.value).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CanvasChart;
