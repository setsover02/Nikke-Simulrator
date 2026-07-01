import React, { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Button.module.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'assistive';
    size?: 'large' | 'small' | 'xsmall' | 'default';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'default',
    leftIcon,
    rightIcon,
    children,
    className,
    ...props
}) => {
    const classNames = [
        styles.button,
        styles[variant],
        size !== 'default' ? styles[size] : '',
        className || ''
    ].filter(Boolean).join(' ');

    const renderIcon = (icon: React.ReactNode) => {
        if (typeof icon === 'string') {
            return <Icon name={icon} className={styles.icon} />;
        }
        return icon;
    };

    return (
        <button
            className={classNames}
            {...props}
        >
            {leftIcon && renderIcon(leftIcon)}
            {children}
            {rightIcon && renderIcon(rightIcon)}
        </button>
    );
};
