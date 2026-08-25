import React, { useState, useLayoutEffect, useRef } from 'react';
import styles from './Ripple.module.scss';

interface RippleEvent {
    x: number;
    y: number;
    size: number;
    id: number;
}

export const Ripple: React.FC = () => {
    const [ripples, setRipples] = useState<RippleEvent[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const parent = container.parentElement;
        if (!parent) return;

        // Ensure parent has position relative
        const parentStyle = getComputedStyle(parent);
        if (parentStyle.position === 'static') {
            parent.style.position = 'relative';
        }

        const handleMouseDown = (e: MouseEvent) => {
            const rect = parent.getBoundingClientRect();
            // Size should cover the entire diagonal
            const size = Math.max(rect.width, rect.height) * 2.5;
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            const newRipple: RippleEvent = { x, y, size, id: Date.now() };
            setRipples((prev) => [...prev, newRipple]);
        };

        parent.addEventListener('mousedown', handleMouseDown);
        return () => {
            parent.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

    const handleAnimationEnd = (id: number) => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <div ref={containerRef} className={styles['ripple-container']}>
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className={styles.ripple}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: ripple.size,
                        height: ripple.size,
                    }}
                    onAnimationEnd={() => handleAnimationEnd(ripple.id)}
                />
            ))}
        </div>
    );
};
