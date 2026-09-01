import React, { useState, useRef, useEffect } from 'react';
import styles from './SidePanel.module.scss';
import { Icon } from '../Icon/Icon';
import { Card } from '../Card/Card';

export interface SidePanelProps {
    children: React.ReactNode;
    className?: string;
    width?: number | string;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
    children,
    className = '',
    width,
    isOpen: controlledOpen,
    onOpenChange,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const panelRef = useRef<HTMLDivElement>(null);

    const handleToggle = () => {
        const next = !open;
        if (!isControlled) {
            setInternalOpen(next);
        }
        onOpenChange?.(next);
    };

    const handleClose = () => {
        if (!isControlled) {
            setInternalOpen(false);
        }
        onOpenChange?.(false);
    };

    // 외부 영역 클릭 시 패널 닫기 (Outside Click Listener)
    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                handleClose();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [open, isControlled, onOpenChange]);

    return (
        <div
            ref={panelRef}
            className={`${styles['side-panel']} ${open ? styles.open : ''} ${className}`.trim()}
            style={width ? { width } : undefined}
        >
            <button
                type="button"
                className={styles['toggle-button']}
                onClick={handleToggle}
                title={open ? "Close Panel" : "Open Panel"}
            >
                <Icon name={open ? "chevron_left" : "chevron_right"} size={24} />
            </button>
            <Card className={styles['panel-content']}>
                {children}
            </Card>
        </div>
    );
};

export default SidePanel;
