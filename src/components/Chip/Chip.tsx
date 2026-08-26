import React from 'react';
import styles from './Chip.module.scss';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'limit-break' | 'core';
    children?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
    variant = 'default',
    className = '',
    children,
    type = 'button',
    ...props
}) => {
    const variantClass = variant === 'limit-break'
        ? styles['variant-limit-break']
        : variant === 'core'
            ? styles['variant-core']
            : styles['variant-default'];

    return (
        <button
            type={type}
            className={`${styles['chip-button']} ${variantClass} ${className}`.trim()}
            {...props}
        >
            {children}
        </button>
    );
};
