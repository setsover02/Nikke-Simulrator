import React from 'react';
import styles from './Avatar.module.scss';
import { avatarMap } from '../../constants/characters';

export interface AvatarProps {
    charId?: string;
    src?: string;
    size?: number;
    alt?: string;
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ charId, src, size = 40, alt = 'avatar', className }) => {
    const imgSrc = src || (charId ? avatarMap[charId] : undefined);

    return (
        <div
            className={`${styles.avatar} ${className || ''}`}
            style={{
                width: size,
                height: size,
                minWidth: size,
                minHeight: size
            }}
        >
            {imgSrc ? (
                <img src={imgSrc} alt={alt} />
            ) : (
                <div className={styles.fallback} />
            )}
        </div>
    );
};