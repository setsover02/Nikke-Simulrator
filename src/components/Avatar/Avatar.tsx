import React from 'react';
import styles from './Avatar.module.scss';
import { avatarMap } from '../../constants/characters';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    charId?: string;
    src?: string;
    size?: number;
    ratio?: string | number;
    alt?: string;
    className?: string;
}

const formatRatio = (ratio?: string | number): string | undefined => {
    if (!ratio) return undefined;
    if (typeof ratio === 'number') return `${ratio}`;
    if (ratio.includes(':')) return ratio.replace(':', ' / ');
    return ratio;
};

export const Avatar: React.FC<AvatarProps> = ({
    charId,
    src,
    size,
    ratio,
    alt = 'avatar',
    className,
    style,
    children,
    ...props
}) => {
    const imgSrc = src || (charId ? avatarMap[charId] : undefined);
    const parsedRatio = formatRatio(ratio);

    const computedStyle: React.CSSProperties = { ...style };

    if (parsedRatio) {
        computedStyle.aspectRatio = parsedRatio;
        if (size) {
            computedStyle.width = typeof size === 'number' ? `${size}px` : size;
            computedStyle.height = 'auto';
        } else {
            computedStyle.width = '100%';
            computedStyle.height = '100%';
        }
    } else if (size) {
        computedStyle.width = typeof size === 'number' ? `${size}px` : size;
        computedStyle.height = typeof size === 'number' ? `${size}px` : size;
        computedStyle.minWidth = computedStyle.width;
        computedStyle.minHeight = computedStyle.height;
    } else {
        computedStyle.width = '40px';
        computedStyle.height = '40px';
    }

    return (
        <div
            className={`${styles.avatar} ${className || ''}`}
            style={computedStyle}
            {...props}
        >
            {imgSrc ? (
                <img src={imgSrc} alt={alt} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
                <div className={styles.fallback}>
                    {children}
                </div>
            )}
        </div>
    );
};