import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ScenarioSummary } from '../../types/simulator';

function formatTime(timeVal: number): string {
    const remaining = Math.max(0, 180 - timeVal);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Generate distinct color from string hash for skill bar visualization
function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export interface SkillEffectInfo {
    trigger?: string;
    target: string;
    effect: string;
    value: string;
}

export interface SkillInfo {
    effects: SkillEffectInfo[];
    duration?: number;
    cooldown?: number;
}

export type SkillInfoMap = Record<string, Record<string, SkillInfo>>;

interface CanvasTimelineChartProps {
    summary: ScenarioSummary;
    duration: number;
    title?: string;
    skillInfoMap?: SkillInfoMap;
    charIdToName?: Record<string, string>;
}

const LINE_HEIGHT = 20;
const CHAR_GAP = 12;
const ROW_GAP = 4;
const PADDING = { top: 30, right: 20, bottom: 40, left: 200 };
const MIN_ZOOM_RANGE = 5;

interface TimelineRow {
    charName: string;
    skillName: string;
    sourceCharName: string;
    buffType: string;
    color: string;
    events: { start: number; end: number }[];
    rawEvents: { start: number; end: number; value?: number; stackLevel?: number }[];
}

function normalizeEffectKey(value: string): string {
    return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isMatchingEffect(buffType: string, effectName: string): boolean {
    const b = normalizeEffectKey(buffType);
    const e = normalizeEffectKey(effectName);
    if (!b || !e) return false;
    if (b === e) return true;

    const aliasMap: Record<string, string[]> = {
        attackpowerup: ['atkup'],
        atkup: ['attackpowerup'],
        attackdamageup: ['atkdamageup'],
        atkdamageup: ['attackdamageup'],
        criticaldamageup: ['critdamageup'],
        critdamageup: ['criticaldamageup'],
        receiveheal: ['recevieheal'],
        recevieheal: ['receiveheal'],
        defenseup: ['defup'],
        defup: ['defenseup'],
    };

    const bAliases = aliasMap[b] || [];
    const eAliases = aliasMap[e] || [];
    return bAliases.includes(e) || eAliases.includes(b);
}

const CanvasTimelineChart: React.FC<CanvasTimelineChartProps> = ({ summary, duration, title = 'Buff Timeline', skillInfoMap, charIdToName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Tooltip state
    const [tooltip, setTooltip] = useState<{
        x: number;
        y: number;
        charName: string;
        skillName: string;
        buffType: string;
        skillInfo: SkillInfo;
    } | null>(null);

    // Store row Y positions and events for hit testing
    const rowPositionsRef = useRef<{ charName: string; skillName: string; sourceCharName: string; buffType: string; y: number; h: number; events: { start: number; end: number }[]; rawEvents: { start: number; end: number; value?: number; stackLevel?: number }[] }[]>([]);

    const [viewMin, setViewMin] = useState(0);
    const [viewMax, setViewMax] = useState<number | null>(null);
    const isDragging = useRef(false);
    const lastDragX = useRef(0);
    const viewMinRef = useRef(0);
    const viewMaxRef = useRef<number | null>(null);

    useEffect(() => { viewMinRef.current = viewMin; }, [viewMin]);
    useEffect(() => { viewMaxRef.current = viewMax; }, [viewMax]);

    // Reset zoom when summary changes (e.g., new simulation run)
    useEffect(() => { setViewMin(0); setViewMax(null); }, [summary]);

    // Translate summary logs into rendered rows
    const buildRows = useCallback((): TimelineRow[] => {
        const rows: TimelineRow[] = [];

        summary.chars.forEach((char) => {
            const tl = char.buffTimeline || [];
            if (tl.length === 0) return;

            // Group by skillName + sourceCharId + buffType for effect-level rows
            const bySkill: Record<string, { start: number, end: number, sourceCharId: string, buffType: string, value?: number, stackLevel?: number }[]> = {};
            tl.forEach(e => {
                const key = `${e.skillName}__${e.sourceCharId}__${e.buffType}`;
                if (!bySkill[key]) bySkill[key] = [];
                bySkill[key].push({ start: e.startTime, end: e.endTime, sourceCharId: e.sourceCharId, buffType: e.buffType, value: e.value, stackLevel: e.stackLevel });
            });

            // Flatten
            for (const [compositeKey, events] of Object.entries(bySkill)) {
                const [skillName] = compositeKey.split('__');
                const sourceCharId = events[0]?.sourceCharId || '';
                const buffType = events[0]?.buffType || 'effect';
                const sourceCharName = charIdToName?.[sourceCharId] || char.charName;
                // merge overlapping just in case to avoid rendering artifacts
                const sorted = [...events].sort((a, b) => a.start - b.start);
                const merged: { start: number; end: number }[] = [];
                for (const ev of sorted) {
                    if (merged.length === 0) {
                        merged.push(ev);
                    } else {
                        const last = merged[merged.length - 1];
                        if (ev.start <= last.end) {
                            last.end = Math.max(last.end, ev.end);
                        } else {
                            merged.push(ev);
                        }
                    }
                }

                rows.push({
                    charName: char.charName,
                    skillName,
                    sourceCharName,
                    buffType,
                    color: stringToColor(`${char.charName}_${skillName}_${sourceCharId}_${buffType}`),
                    events: merged,
                    rawEvents: events
                });
            }
        });

        return rows;
    }, [summary, charIdToName]);

    const getViewRange = useCallback((): [number, number] => {
        return [viewMin, viewMax ?? duration];
    }, [viewMin, viewMax, duration]);

    const drawChart = useCallback(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rows = buildRows();

        // Calculate dynamic height
        const totalHeightCount = Math.max(1, rows.length);

        let uniqueChars = 0;
        let lastChar = '';
        rows.forEach(r => {
            if (lastChar !== r.charName) {
                uniqueChars++;
                lastChar = r.charName;
            }
        });

        const ch = PADDING.top + PADDING.bottom + (totalHeightCount * LINE_HEIGHT) + ((totalHeightCount - 1) * ROW_GAP) + (uniqueChars * CHAR_GAP);
        const cw = wrapper.clientWidth;

        canvas.width = cw;
        canvas.height = ch;
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, cw, ch);

        ctx.fillStyle = '#bbb';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, 10, 10);

        if (rows.length === 0) {
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No Buff Timeline Data Available', cw / 2, ch / 2);
            return;
        }

        const chartW = cw - PADDING.left - PADDING.right;
        const [vMin, vMax] = getViewRange();

        // draw grid lines (x-axis)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

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
            const xPos = PADDING.left + ((t - vMin) / range) * chartW;
            ctx.beginPath();
            ctx.moveTo(xPos, PADDING.top);
            ctx.lineTo(xPos, ch - PADDING.bottom);
            ctx.stroke();

            // X-axis labels
            ctx.fillStyle = '#888';
            ctx.fillText(formatTime(t), xPos, ch - PADDING.bottom + 5);
        }

        const toX = (t: number) => PADDING.left + ((t - vMin) / (vMax - vMin)) * chartW;

        ctx.save();
        ctx.beginPath();
        ctx.rect(PADDING.left, PADDING.top, chartW, ch - PADDING.top - PADDING.bottom);
        ctx.clip();

        let yCursor = PADDING.top;
        lastChar = '';

        // Draw Rows
        rows.forEach(row => {
            if (lastChar && lastChar !== row.charName) {
                yCursor += CHAR_GAP;
            }

            // Draw Timeline Bars
            ctx.fillStyle = row.color;
            row.events.forEach(ev => {
                // If it's totally out of bounds, skip
                if (ev.end < vMin || ev.start > vMax) return;

                const startX = Math.max(vMin, ev.start);
                const endX = Math.min(vMax, ev.end);

                const drawX = toX(startX);
                let drawW = toX(endX) - drawX;
                drawW = Math.max(2, drawW); // min width 2px

                const radius = 0;
                ctx.beginPath();
                ctx.roundRect(drawX, yCursor + 4, drawW, LINE_HEIGHT - 8, radius);
                ctx.fill();
            });

            yCursor += LINE_HEIGHT + ROW_GAP;
            lastChar = row.charName;
        });

        ctx.restore();

        // Draw Y-axis Labels on top of clipping area to ensure visibility
        yCursor = PADDING.top;
        lastChar = '';
        rows.forEach(row => {
            if (lastChar && lastChar !== row.charName) {
                yCursor += CHAR_GAP;
            }

            if (lastChar !== row.charName) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(row.charName.substring(0, 10), 10, yCursor + LINE_HEIGHT / 2);
                lastChar = row.charName;
            }

            ctx.fillStyle = '#aaa';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            // Show source character name if it differs from the receiving character
            const label = row.sourceCharName !== row.charName
                ? `${row.skillName.substring(0, 10)}·${row.buffType.substring(0, 7)} (${row.sourceCharName.substring(0, 6)})`
                : `${row.skillName.substring(0, 11)} · ${row.buffType.substring(0, 8)}`;
            ctx.fillText(label, PADDING.left - 10, yCursor + LINE_HEIGHT / 2);

            yCursor += LINE_HEIGHT + ROW_GAP;
        });

        // Save row positions for tooltip hit testing
        const positions: typeof rowPositionsRef.current = [];
        yCursor = PADDING.top;
        lastChar = '';
        rows.forEach(row => {
            if (lastChar && lastChar !== row.charName) {
                yCursor += CHAR_GAP;
            }
            positions.push({
                charName: row.charName,
                skillName: row.skillName,
                sourceCharName: row.sourceCharName,
                buffType: row.buffType,
                y: yCursor,
                h: LINE_HEIGHT,
                events: row.events,
                rawEvents: row.rawEvents
            });
            yCursor += LINE_HEIGHT + ROW_GAP;
            lastChar = row.charName;
        });
        rowPositionsRef.current = positions;

        const isZoomed = vMin > 0 || vMax < duration - 0.1;
        if (isZoomed) {
            ctx.fillStyle = '#555';
            ctx.textAlign = 'right';
            ctx.font = '11px monospace';
            ctx.fillText(`${formatTime(vMin)} – ${formatTime(vMax)}`, cw - PADDING.right, 10);
        }
    }, [buildRows, duration, title, getViewRange]);

    useEffect(() => {
        drawChart();
        const handleResize = () => drawChart();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawChart]);

    const handleWheelPos = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const [vMin, vMax] = getViewRange();
        const range = vMax - vMin;
        const canvas = canvasRef.current!;
        const graphW = canvas.width - PADDING.left - PADDING.right;

        const rect = canvas.getBoundingClientRect();
        const logX = (e.clientX - rect.left) * (canvas.width / canvas.clientWidth);

        // Only zoom if mouse is in the chart area
        if (logX < PADDING.left || logX > canvas.width - PADDING.right) return;

        const ratio = Math.max(0, Math.min(1, (logX - PADDING.left) / graphW));
        const cursor = vMin + ratio * range;

        const factor = e.deltaY < 0 ? 0.8 : 1.25;
        let newRange = Math.max(MIN_ZOOM_RANGE, Math.min(duration, range * factor));

        let newMin = cursor - ratio * newRange;
        let newMax = cursor + (1 - ratio) * newRange;

        if (newMin < 0) {
            newMax = Math.min(duration, newMax - newMin);
            newMin = 0;
        }
        if (newMax > duration) {
            newMin = Math.max(0, newMin - (newMax - duration));
            newMax = duration;
        }

        setViewMin(newMin);
        setViewMax(newMax >= duration - 0.01 ? null : newMax);
    }, [duration, getViewRange, setViewMin, setViewMax]);

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
            const [vMin, vMax] = [viewMinRef.current, viewMaxRef.current ?? duration];
            const range = vMax - vMin;
            const graphW = canvas.width - PADDING.left - PADDING.right;
            const dx = (e.clientX - lastDragX.current) * (canvas.width / canvas.clientWidth);
            lastDragX.current = e.clientX;

            const dt = -(dx / graphW) * range;
            let nm = Math.max(0, vMin + dt);
            let nx = vMax + dt;

            if (nm < 0) {
                nx -= nm;
                nm = 0;
            }
            if (nx > duration) {
                nm -= nx - duration;
                nx = duration;
            }

            setViewMin(Math.max(0, nm));
            setViewMax(nx >= duration - 0.01 ? null : nx);
            return;
        }

        // Tooltip hit testing — only in the label area (x < PADDING.left)
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const scaleY = canvas.height / canvas.clientHeight;
        const logicalY = mouseY * scaleY;

        const canvasX = mouseX * (canvas.width / canvas.clientWidth);

        if (canvasX < PADDING.left && skillInfoMap) {
            // Label area hit testing
            for (const pos of rowPositionsRef.current) {
                if (logicalY >= pos.y && logicalY <= pos.y + pos.h) {
                    const info = skillInfoMap[pos.sourceCharName]?.[pos.skillName];
                    if (info && info.effects.length > 0) {
                        const matchedEffects = info.effects.filter((eff) => isMatchingEffect(pos.buffType, eff.effect));
                        setTooltip({
                            x: mouseX,
                            y: mouseY,
                            charName: pos.sourceCharName,
                            skillName: pos.skillName,
                            buffType: pos.buffType,
                            skillInfo: {
                                ...info,
                                effects: matchedEffects.length > 0 ? matchedEffects : info.effects,
                            },
                        });
                        return;
                    }
                }
            }
        } else if (canvasX >= PADDING.left && canvasX <= canvas.width - PADDING.right && skillInfoMap) {
            // Timeline area (bars) hit testing
            const [vMin, vMax] = getViewRange();
            const graphW = canvas.width - PADDING.left - PADDING.right;
            const ratio = (canvasX - PADDING.left) / graphW;
            const cursorTime = vMin + ratio * (vMax - vMin);

            for (const pos of rowPositionsRef.current) {
                if (logicalY >= pos.y && logicalY <= pos.y + pos.h) {
                    // Check if time is within any event bounds of this row
                    const hitEvent = pos.events.find(ev => cursorTime >= ev.start && cursorTime <= ev.end);
                    if (hitEvent) {
                        const info = skillInfoMap[pos.sourceCharName]?.[pos.skillName];
                        if (info && info.effects.length > 0) {
                            // Find active raw events for accurate stack calculation
                            const activeEvents = pos.rawEvents.filter(ev => cursorTime >= ev.start && cursorTime <= ev.end);
                            let summedValue = 0;
                            let hasValues = false;

                            activeEvents.forEach(ev => {
                                if (ev.value !== undefined) {
                                    summedValue += ev.value;
                                    hasValues = true;
                                }
                            });

                            const matchedEffects = info.effects.filter((eff) => isMatchingEffect(pos.buffType, eff.effect));
                            const customInfo = { ...info, effects: [...(matchedEffects.length > 0 ? matchedEffects : info.effects)] };

                            if (hasValues && customInfo.effects.length > 0) {
                                const unit = customInfo.effects[0].value.includes('%') ? '%' : '';
                                customInfo.effects[0] = { ...customInfo.effects[0], value: `${Number(summedValue.toFixed(3))}${unit}` };
                                // 중복되는 나머지 stack_level 효과들은 제거하고 1개만 표시
                                customInfo.effects = [customInfo.effects[0]];
                            }

                            setTooltip({
                                x: mouseX,
                                y: mouseY,
                                charName: pos.sourceCharName,
                                skillName: pos.skillName,
                                buffType: pos.buffType,
                                skillInfo: customInfo,
                            });
                            return;
                        }
                    }
                } // row matched
            }
        }
        setTooltip(null);
    };

    const handleMouseUp = () => { isDragging.current = false; };
    const handleMouseLeave = () => { isDragging.current = false; setTooltip(null); };

    const [vMin, vMax] = getViewRange();
    const isZoomed = vMin > 0 || (viewMax !== null && vMax < duration - 0.1);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', marginTop: '20px' }}>
            {isZoomed && (
                <button
                    onClick={() => { setViewMin(0); setViewMax(null); }}
                    style={{
                        position: 'absolute', top: '10px', right: '30px', zIndex: 10,
                        padding: '3px 8px', fontSize: '11px',
                        color: '#aaa', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer',
                    }}
                >
                    Reset
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
                    borderRadius: '4px',
                    cursor: isDragging.current ? 'grabbing' : 'auto',
                    userSelect: 'none',
                    touchAction: 'none' // For mobile panning prevention
                }}
            />
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(tooltip.x + 15, (wrapperRef.current?.clientWidth ?? 400) - 220)}px`,
                    top: `${Math.max(10, tooltip.y - 10)}px`,
                    backgroundColor: 'rgba(18, 18, 18, 0.95)',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    zIndex: 20,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    minWidth: '180px',
                    maxWidth: '300px',
                }}>
                    <div style={{ borderBottom: '1px solid #444', marginBottom: '6px', paddingBottom: '4px', fontWeight: 'bold', color: '#aaa', fontSize: '11px' }}>
                        <span style={{ color: '#fff' }}>{tooltip.charName}</span> — {tooltip.skillName} · {tooltip.buffType}
                        {(tooltip.skillInfo.duration || tooltip.skillInfo.cooldown) && (
                            <span style={{ marginLeft: '8px', color: '#777', fontWeight: 'normal' }}>
                                {tooltip.skillInfo.duration ? `dur: ${tooltip.skillInfo.duration}s` : ''}
                                {tooltip.skillInfo.duration && tooltip.skillInfo.cooldown ? ', ' : ''}
                                {tooltip.skillInfo.cooldown ? `cool: ${tooltip.skillInfo.cooldown}s` : ''}
                            </span>
                        )}
                    </div>
                    {tooltip.skillInfo.effects.map((eff, i) => (
                        <div key={i} style={{ marginBottom: '3px', color: '#ddd', lineHeight: '1.4' }}>
                            {eff.trigger && (
                                <span style={{ color: '#ff9800', fontSize: '10px', marginRight: '4px' }}>⚡{eff.trigger}</span>
                            )}
                            <span style={{ color: '#888' }}>{eff.target}:</span>{' '}
                            <span style={{ color: '#ccc' }}>{eff.effect}:</span>{' '}
                            <span style={{ color: '#4fc3f7', fontWeight: 'bold' }}>[{eff.value}]</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CanvasTimelineChart;
