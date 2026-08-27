import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './Menu.module.scss';
import Font from '../Font';

export interface MenuProps {
    isOpen: boolean;
    onClose?: () => void;
    anchorRef: React.RefObject<HTMLElement | null> | HTMLElement | null;
    children: React.ReactNode;
    placement?: 'auto' | 'top' | 'bottom';
    align?: 'start' | 'end' | 'center';
    /** 각 컴포넌트의 가로 길이를 자동으로 일치시킬지 여부 (기본: true) */
    matchAnchorWidth?: boolean;
    width?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    offset?: number;
    className?: string;
    style?: React.CSSProperties;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    menuRef?: React.Ref<HTMLDivElement>;
}

export const Menu: React.FC<MenuProps> = ({
    isOpen,
    onClose,
    anchorRef,
    children,
    placement = 'auto',
    align = 'start',
    matchAnchorWidth = true,
    width,
    minWidth,
    maxWidth,
    maxHeight = 280,
    offset = 6,
    className,
    style,
    closeOnClickOutside = true,
    closeOnEscape = true,
    menuRef: externalMenuRef,
}) => {
    const internalMenuRef = useRef<HTMLDivElement>(null);
    const menuElRef = (externalMenuRef as React.RefObject<HTMLDivElement>) || internalMenuRef;

    const [coords, setCoords] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width?: number | string;
        maxHeight?: number;
        actualPlacement: 'top' | 'bottom';
    } | null>(null);

    const getAnchorEl = useCallback((): HTMLElement | null => {
        if (!anchorRef) return null;
        if ('current' in anchorRef) return anchorRef.current;
        return anchorRef;
    }, [anchorRef]);

    const updatePosition = useCallback(() => {
        const anchorEl = getAnchorEl();
        if (!anchorEl || !isOpen) return;

        const rect = anchorEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const margin = 8;
        const gap = offset;

        const spaceBelow = viewportHeight - rect.bottom - gap - margin;
        const spaceAbove = rect.top - gap - margin;

        const targetMaxHeight = typeof maxHeight === 'number' ? maxHeight : 280;

        // Auto placement decision: if below space is insufficient and above space is larger, pop UP!
        let actualPlacement: 'top' | 'bottom' = 'bottom';
        if (placement === 'top') {
            actualPlacement = 'top';
        } else if (placement === 'bottom') {
            actualPlacement = 'bottom';
        } else {
            // Auto
            if (spaceBelow < Math.min(targetMaxHeight, 180) && spaceAbove > spaceBelow) {
                actualPlacement = 'top';
            } else {
                actualPlacement = 'bottom';
            }
        }

        let calculatedTop: number | undefined;
        let calculatedBottom: number | undefined;
        let computedMaxHeight = targetMaxHeight;

        if (actualPlacement === 'bottom') {
            calculatedTop = rect.bottom + gap;
            computedMaxHeight = Math.min(targetMaxHeight, Math.max(80, spaceBelow));
        } else {
            calculatedBottom = viewportHeight - rect.top + gap;
            computedMaxHeight = Math.min(targetMaxHeight, Math.max(80, spaceAbove));
        }

        // Width calculation
        let computedWidth: number | string = 'auto';
        if (width !== undefined) {
            computedWidth = width;
        } else if (matchAnchorWidth) {
            computedWidth = rect.width;
        }

        // Horizontal alignment
        let left = rect.left;
        const menuWidth = typeof computedWidth === 'number' ? computedWidth : rect.width;

        if (align === 'end') {
            left = rect.right - menuWidth;
        } else if (align === 'center') {
            left = rect.left + rect.width / 2 - menuWidth / 2;
        }

        // Keep within horizontal screen bounds
        if (left + menuWidth > viewportWidth - margin) {
            left = Math.max(margin, viewportWidth - margin - menuWidth);
        }
        if (left < margin) {
            left = margin;
        }

        setCoords({
            top: calculatedTop,
            bottom: calculatedBottom,
            left,
            width: computedWidth,
            maxHeight: computedMaxHeight,
            actualPlacement,
        });
    }, [getAnchorEl, isOpen, placement, align, matchAnchorWidth, width, maxHeight, offset]);

    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
        }
    }, [isOpen, updatePosition]);

    // Update position on window resize and scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    // Handle Click Outside
    useEffect(() => {
        if (!isOpen || !closeOnClickOutside) return;

        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            const anchorEl = getAnchorEl();

            if (
                menuElRef.current &&
                !menuElRef.current.contains(target) &&
                anchorEl &&
                !anchorEl.contains(target)
            ) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, closeOnClickOutside, getAnchorEl, menuElRef, onClose]);

    // Handle Escape Key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, closeOnEscape, onClose]);

    if (!isOpen || !coords) return null;

    const dynamicStyle: React.CSSProperties = {
        left: `${coords.left}px`,
        maxHeight: `${coords.maxHeight}px`,
        ...style,
    };

    if (coords.top !== undefined) {
        dynamicStyle.top = `${coords.top}px`;
        (dynamicStyle as any)['--menu-anim-y'] = '-4px';
    } else if (coords.bottom !== undefined) {
        dynamicStyle.bottom = `${coords.bottom}px`;
        (dynamicStyle as any)['--menu-anim-y'] = '4px';
    }

    if (coords.width !== undefined) {
        dynamicStyle.width = typeof coords.width === 'number' ? `${coords.width}px` : coords.width;
    }
    if (minWidth !== undefined) {
        dynamicStyle.minWidth = typeof minWidth === 'number' ? `${minWidth}px` : minWidth;
    } else if (matchAnchorWidth && coords.width) {
        dynamicStyle.minWidth = typeof coords.width === 'number' ? `${coords.width}px` : coords.width;
    }
    if (maxWidth !== undefined) {
        dynamicStyle.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
    }

    const menuContent = (
        <div
            ref={menuElRef}
            className={`${styles.menu} ${className || ''}`}
            style={dynamicStyle}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );

    return ReactDOM.createPortal(menuContent, document.body);
};

export const MenuEmpty: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`${styles['menu-empty']} ${className || ''}`}>
        {typeof children === 'string' ? (
            <Font variant="caption-2" color="muted">
                {children}
            </Font>
        ) : (
            children
        )}
    </div>
);

export const MenuDivider: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`${styles['menu-divider']} ${className || ''}`} />
);

export default Menu;
