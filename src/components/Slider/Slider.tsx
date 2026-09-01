import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Ripple } from '../Ripple/Ripple';
import styles from './Slider.module.scss';

export interface SliderMark {
    value: number;
    label?: React.ReactNode;
}

export interface SliderProps {
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    type?: 'continuous' | 'discrete';
    marks?: boolean | SliderMark[];
    showLabels?: boolean;
    showTooltip?: boolean | 'always' | 'active';
    formatTooltip?: (value: number) => React.ReactNode;
    disabled?: boolean;
    width?: string | number;
    className?: string;
    style?: React.CSSProperties;
    onChange?: (value: number) => void;
    onChangeCommitted?: (value: number) => void;
    'aria-label'?: string;
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const Slider: React.FC<SliderProps> = ({
    value: controlledValue,
    defaultValue = 0,
    min = 0,
    max = 100,
    step = 1,
    type = 'continuous',
    marks = false,
    showLabels = true,
    showTooltip = 'active',
    formatTooltip,
    disabled = false,
    width = '100%',
    className = '',
    style,
    onChange,
    onChangeCommitted,
    'aria-label': ariaLabel = 'Slider',
}) => {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<number>(() => clamp(defaultValue, min, max));
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const trackRef = useRef<HTMLDivElement>(null);
    const currentValue = isControlled ? clamp(controlledValue, min, max) : internalValue;

    // Resolve marks array
    const markList = useMemo<SliderMark[]>(() => {
        if (!marks) return [];
        if (Array.isArray(marks)) {
            return marks.map(m => ({ ...m, value: clamp(m.value, min, max) }));
        }
        // If marks === true, generate based on step
        if (step > 0 && max > min) {
            const list: SliderMark[] = [];
            const count = Math.floor((max - min) / step);
            for (let i = 0; i <= count; i++) {
                const val = min + i * step;
                list.push({ value: val, label: String(val) });
            }
            if (list[list.length - 1]?.value !== max) {
                list.push({ value: max, label: String(max) });
            }
            return list;
        }
        return [];
    }, [marks, min, max, step]);

    // Snap value to nearest step or mark
    const snapValue = useCallback((rawVal: number): number => {
        const bounded = clamp(rawVal, min, max);

        if (type === 'discrete' && markList.length > 0) {
            // Find closest mark
            let closest = markList[0].value;
            let minDiff = Math.abs(bounded - closest);
            for (let i = 1; i < markList.length; i++) {
                const diff = Math.abs(bounded - markList[i].value);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = markList[i].value;
                }
            }
            return closest;
        }

        if (step > 0) {
            const stepsCount = Math.round((bounded - min) / step);
            const steppedVal = min + stepsCount * step;
            // Round to avoid floating point precision issues
            const precision = step.toString().split('.')[1]?.length || 0;
            return clamp(Number(steppedVal.toFixed(precision)), min, max);
        }

        return bounded;
    }, [min, max, step, type, markList]);

    const updateValueFromClientX = useCallback((clientX: number, isCommit = false) => {
        if (disabled || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        // Inner usable width between handle centers (from 12px to rect.width - 12px)
        const usableWidth = rect.width - 24;
        if (usableWidth <= 0) return;

        let ratio = (clientX - (rect.left + 12)) / usableWidth;
        ratio = clamp(ratio, 0, 1);

        const rawVal = min + ratio * (max - min);
        const snapped = snapValue(rawVal);

        if (!isControlled) {
            setInternalValue(snapped);
        }
        if (onChange && snapped !== currentValue) {
            onChange(snapped);
        }
        if (isCommit && onChangeCommitted) {
            onChangeCommitted(snapped);
        }
    }, [disabled, min, max, snapValue, isControlled, onChange, onChangeCommitted, currentValue]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        e.preventDefault();
        setIsDragging(true);

        try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch { }

        updateValueFromClientX(e.clientX, false);

        const handlePointerMove = (moveEvent: PointerEvent) => {
            updateValueFromClientX(moveEvent.clientX, false);
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            setIsDragging(false);
            updateValueFromClientX(upEvent.clientX, true);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        let delta = 0;
        const stepSize = step || (max - min) / 100 || 1;

        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            delta = stepSize;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            delta = -stepSize;
        } else if (e.key === 'Home') {
            const newVal = min;
            if (!isControlled) setInternalValue(newVal);
            onChange?.(newVal);
            onChangeCommitted?.(newVal);
            return;
        } else if (e.key === 'End') {
            const newVal = max;
            if (!isControlled) setInternalValue(newVal);
            onChange?.(newVal);
            onChangeCommitted?.(newVal);
            return;
        } else {
            return;
        }

        e.preventDefault();
        const nextVal = snapValue(currentValue + delta);
        if (!isControlled) setInternalValue(nextVal);
        onChange?.(nextVal);
        onChangeCommitted?.(nextVal);
    };

    const ratio = max > min ? clamp((currentValue - min) / (max - min), 0, 1) : 0;

    const isTooltipVisible = !disabled && (
        showTooltip === 'always' ||
        (showTooltip === 'active' && (isDragging || isHovered)) ||
        showTooltip === true
    );

    return (
        <div
            className={[
                styles['slider-wrapper'],
                disabled ? styles.disabled : '',
                className
            ].filter(Boolean).join(' ')}
            style={{ width: typeof width === 'number' ? `${width}px` : width, ...style }}
        >
            <div
                className={[
                    styles['slider-track-container'],
                    isDragging ? styles.active : '',
                    disabled ? styles.disabled : '',
                ].filter(Boolean).join(' ')}
                onPointerDown={handlePointerDown}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                tabIndex={disabled ? -1 : 0}
                onKeyDown={handleKeyDown}
                role="slider"
                aria-label={ariaLabel}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={currentValue}
                aria-disabled={disabled}
            >
                <div className={styles['slider-inner-track']} ref={trackRef}>
                    {/* Fill Bar: Starts from 0 to current handle edge */}
                    <div
                        className={[
                            styles['slider-fill'],
                            isDragging ? styles.dragging : ''
                        ].filter(Boolean).join(' ')}
                        style={{
                            width: ratio === 0 ? 0 : `calc(24px + (100% - 24px) * ${ratio})`
                        }}
                    />

                    {/* Step / Mark Ticks */}
                    {markList.length > 0 && (
                        <div className={styles['slider-ticks']}>
                            {markList.map((m) => {
                                const tickRatio = clamp((m.value - min) / (max - min), 0, 1);
                                const isPassed = m.value <= currentValue;
                                return (
                                    <div
                                        key={m.value}
                                        className={[
                                            styles['slider-tick'],
                                            isPassed ? styles.active : ''
                                        ].filter(Boolean).join(' ')}
                                        style={{ left: `calc(12px + (100% - 24px) * ${tickRatio})` }}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Thumb / Handle */}
                    <div
                        className={[
                            styles['slider-handle'],
                            isDragging ? styles.dragging : '',
                        ].filter(Boolean).join(' ')}
                        style={{ left: `calc(12px + (100% - 24px) * ${ratio})` }}
                    >
                        {!disabled && <Ripple />}

                        {/* Tooltip */}
                        {isTooltipVisible && (
                            <div className={styles['slider-tooltip']}>
                                {formatTooltip ? formatTooltip(currentValue) : currentValue}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Labels under marks */}
            {showLabels && markList.some(m => m.label !== undefined) && (
                <div className={styles['slider-labels']}>
                    {markList.map((m) => {
                        if (m.label === undefined) return null;
                        const labelRatio = clamp((m.value - min) / (max - min), 0, 1);
                        const isActive = m.value === currentValue;
                        return (
                            <span
                                key={m.value}
                                className={[
                                    styles['slider-label'],
                                    isActive ? styles.active : '',
                                    disabled ? styles.disabled : '',
                                ].filter(Boolean).join(' ')}
                                style={{ left: `calc(12px + (100% - 24px) * ${labelRatio})` }}
                                onClick={(e) => {
                                    if (disabled) return;
                                    e.stopPropagation();
                                    const next = snapValue(m.value);
                                    if (!isControlled) setInternalValue(next);
                                    onChange?.(next);
                                    onChangeCommitted?.(next);
                                }}
                            >
                                {m.label}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
