import React, { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import { Ripple } from '../Ripple/Ripple';
import { getCustomIconUrl } from '../../utils/iconRegistry';
import styles from './Button.module.scss';

export interface ButtonToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    size?: 'large' | 'small' | 'xsmall' | 'default';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children: React.ReactNode;
    selected?: boolean;
}

export const ButtonToggle: React.FC<ButtonToggleProps> = ({
    size = 'default',
    leftIcon,
    rightIcon,
    children,
    selected = false,
    className,
    ...props
}) => {
    const isReadonly = !props.onClick;

    const classNames = [
        styles['button-toggle'],
        selected ? styles.selected : '',
        size !== 'default' ? styles[size] : '',
        isReadonly ? styles.readonly : '',
        className || ''
    ].filter(Boolean).join(' ');

    const renderIcon = (icon: React.ReactNode) => {
        if (typeof icon === 'string') {
            const customSvg = getCustomIconUrl(icon);
            if (customSvg) {
                return <img src={customSvg} alt="" className={styles.icon} />;
            }
            return <Icon name={icon} className={styles.icon} />;
        }
        return icon;
    };

    return (
        <button
            className={classNames}
            type="button"
            tabIndex={isReadonly ? -1 : undefined}
            {...props}
        >
            {leftIcon && renderIcon(leftIcon)}
            {children}
            {rightIcon && renderIcon(rightIcon)}
            {!props.disabled && !isReadonly && <Ripple />}
        </button>
    );
};
