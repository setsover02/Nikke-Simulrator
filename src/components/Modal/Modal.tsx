import React, { useEffect, useCallback, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Card } from '../Card/Card';
import { ButtonIcon } from '../Button/ButtonIcon';
import styles from './Modal.module.scss';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    showCloseButton?: boolean;
    maxWidth?: string | number;
    maxHeight?: string | number;
    className?: string;
    closeOnOverlayClick?: boolean;
    /** 바텀 시트 닫기 임계값 (기본 120px) */
    dragThreshold?: number;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    showCloseButton = true,
    maxWidth,
    maxHeight,
    className,
    closeOnOverlayClick = true,
    dragThreshold = 120,
}) => {
    const [isClosing, setIsClosing] = useState(false);
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const startYRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const currentYRef = useRef<number>(0);
    const isClosingRef = useRef<boolean>(false);

    // Smooth exit animation before calling onClose
    const startCloseAnimation = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        setIsClosing(true);

        setTimeout(() => {
            onClose();
            setIsClosing(false);
            isClosingRef.current = false;
            setDragY(0);
        }, 240);
    }, [onClose]);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                startCloseAnimation();
            }
        },
        [startCloseAnimation]
    );

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
            setIsClosing(false);
            isClosingRef.current = false;
            setDragY(0);
            setIsDragging(false);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    // Handle drag initiation (Mouse / Pointer / Touch)
    const handleDragStart = (clientY: number) => {
        if (isClosingRef.current) return;
        startYRef.current = clientY;
        currentYRef.current = clientY;
        startTimeRef.current = Date.now();
        setIsDragging(true);
    };

    // Global listener while dragging to ensure smooth 1:1 up/down movement everywhere
    useEffect(() => {
        if (!isDragging) return;

        const handlePointerMove = (e: PointerEvent) => {
            const deltaY = e.clientY - startYRef.current;
            currentYRef.current = e.clientY;
            // 1:1 smooth movement both upwards and downwards
            setDragY(deltaY);
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            const totalDelta = currentYRef.current - startYRef.current;
            const elapsedTime = Date.now() - startTimeRef.current;
            const velocity = totalDelta / (elapsedTime || 1);

            // Dismiss if dragged down beyond threshold or swiped down quickly
            if (totalDelta > dragThreshold || (totalDelta > 40 && velocity > 0.4)) {
                startCloseAnimation();
            } else {
                // Smooth spring snap back to origin (0)
                setDragY(0);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, dragThreshold, startCloseAnimation]);

    // Event handlers for Mobile drag elements (header / drag handle bar)
    const onPointerDown = (e: React.PointerEvent) => {
        if (window.innerWidth <= 600) {
            handleDragStart(e.clientY);
        }
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (window.innerWidth <= 600 && e.touches.length > 0) {
            handleDragStart(e.touches[0].clientY);
        }
    };

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            startCloseAnimation();
        }
    };

    const modalStyle: React.CSSProperties = {};
    if (maxWidth) {
        modalStyle.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
    }
    if (maxHeight) {
        modalStyle.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
    }

    // Dynamic style computation for 1:1 motion and smooth snap-back
    if (isClosing) {
        modalStyle.transform = 'translateY(100%)';
        modalStyle.transition = 'transform 0.25s cubic-bezier(0.2, 0.2, 0.38, 0.9)';
    } else if (isDragging) {
        modalStyle.transform = `translateY(${dragY}px)`;
        modalStyle.transition = 'none';
    } else {
        modalStyle.transform = `translateY(${dragY}px)`;
        modalStyle.transition = 'transform 0.25s cubic-bezier(0.2, 0.2, 0.38, 0.9)';
    }

    const modalContent = (
        <div className={`${styles['modal-overlay']} ${isClosing ? styles.closing : ''}`} onClick={handleOverlayClick}>
            <Card
                className={`${styles['modal-card']} ${isClosing ? styles.closing : ''} ${className || ''}`}
                style={modalStyle}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Bottom Sheet Handle Bar */}
                <div
                    className={styles['sheet-handle-container']}
                    onPointerDown={onPointerDown}
                    onTouchStart={onTouchStart}
                >
                    <div className={styles['sheet-handle']} />
                </div>

                {/* Header (Title + Close Button) */}
                {(title || showCloseButton) && (
                    <div
                        className={styles['modal-header']}
                        onPointerDown={onPointerDown}
                        onTouchStart={onTouchStart}
                    >
                        {title ? (
                            <div className={styles['modal-title']}>{title}</div>
                        ) : (
                            <div />
                        )}
                        {showCloseButton && (
                            <ButtonIcon
                                icon="close"
                                size="small"
                                variant="assistive"
                                onClick={startCloseAnimation}
                                aria-label="Close modal"
                            />
                        )}
                    </div>
                )}

                {/* Body */}
                <div className={styles['modal-body']}>{children}</div>

                {/* Footer */}
                {footer && <div className={styles['modal-footer']}>{footer}</div>}
            </Card>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};
