import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Icon } from '../Icon/Icon';
import { Ripple } from '../Ripple/Ripple';
import { getCustomIconUrl } from '../../utils/iconRegistry';
import styles from './Button.module.scss';

export interface ButtonIconProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    variant?: 'primary' | 'assistive';
    size?: 'large' | 'small' | 'xsmall' | 'default';
    type?: 'button' | 'submit' | 'reset';
    icon?: string;
    svgIcon?: string;
}

export const ButtonIcon = forwardRef<HTMLButtonElement, ButtonIconProps>(({
    variant = 'primary',
    size = 'default',
    type = 'button',
    icon,
    svgIcon,
    className,
    ...props
}, ref) => {
    const isReadonly = !props.onClick && type !== 'submit' && type !== 'reset';

    const classNames = [
        styles['button-icon'],
        styles[variant],
        size !== 'default' ? styles[size] : '',
        isReadonly ? styles.readonly : '',
        className || ''
    ].filter(Boolean).join(' ');

    const customUrl = getCustomIconUrl(svgIcon || icon || '');
    const isMaterialIcon = icon && !customUrl && !svgIcon;

    return (
        <button
            ref={ref}
            className={classNames}
            type={type}
            tabIndex={isReadonly ? -1 : undefined}
            {...props}
        >
            {isMaterialIcon && <Icon name={icon} className={styles['button-icon__icon']} />}
            {customUrl && <img src={customUrl} alt="" className={styles['button-icon__svg']} />}
            {!props.disabled && !isReadonly && <Ripple />}
        </button>
    );
});

ButtonIcon.displayName = 'ButtonIcon';
