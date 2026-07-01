import React, { HTMLAttributes } from 'react';
import styles from './Icon.module.scss';

export interface IconProps extends HTMLAttributes<HTMLElement> {
    name: string;
    size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size, className, style, ...props }) => {
    return (
        <i translate='no'
            className={`${styles.icon} ${className || ''}`}
            style={{
                ...(size ? {
                    fontSize: `${size}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    fontVariationSettings: `"FILL" 0, "wght" 400, "GRAD" 0, "opsz" ${size}`,
                } : {
                    fontVariationSettings: `"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24`,
                }),
                ...style,
            }}
            {...props}
        >
            {name}
        </i>
    );
};
