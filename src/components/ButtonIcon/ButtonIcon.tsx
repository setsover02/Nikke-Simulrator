import React, { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import { Ripple } from '../Ripple/Ripple';
import styles from './ButtonIcon.module.scss';

export interface ButtonIconProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    variant?: 'primary' | 'assistive';
    size?: 'large' | 'small' | 'xsmall' | 'default';
    type?: 'button' | 'submit' | 'reset';
    icon?: string;
    svgIcon?: string;
}

export const ButtonIcon: React.FC<ButtonIconProps> = ({
    variant = 'primary',
    size = 'default',
    type = 'button',
    icon,
    svgIcon,
    className,
    ...props
}) => {
    const classNames = [
        styles['button-icon'],
        styles[variant],
        size !== 'default' ? styles[size] : '',
        className || ''
    ].filter(Boolean).join(' ');

    return (
        <button className={classNames} type={type} {...props}>
            {icon && <Icon name={icon} className={styles['button-icon__icon']} />}
            {svgIcon && <span className={styles['button-icon__svg']} style={{
                mask: `url("${svgIcon}") no-repeat center / contain`,
                WebkitMask: `url("${svgIcon}") no-repeat center / contain`
            }} />}
            {!props.disabled && <Ripple />}
        </button>
    );
};
