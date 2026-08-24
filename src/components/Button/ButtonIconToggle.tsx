import React, { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import { Ripple } from '../Ripple/Ripple';
import { getCustomIconUrl } from '../../utils/iconRegistry';
import styles from './Button.module.scss';

export interface ButtonIconToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    size?: 'large' | 'small' | 'xsmall' | 'default';
    icon?: string;
    svgIcon?: string;
    selected?: boolean;
    element?: 'electric' | 'water' | 'iron' | 'wind' | 'fire';
}

export const ButtonIconToggle: React.FC<ButtonIconToggleProps> = ({
    size = 'default',
    icon,
    svgIcon,
    selected = false,
    element,
    className,
    ...props
}) => {
    const isReadonly = !props.onClick;

    const classNames = [
        styles['button-icon-toggle'],
        selected ? styles.selected : '',
        size !== 'default' ? styles[size] : '',
        element ? styles[`element-${element}`] : '',
        isReadonly ? styles.readonly : '',
        className || ''
    ].filter(Boolean).join(' ');

    const customUrl = getCustomIconUrl(svgIcon || icon || '');
    const isMaterialIcon = icon && !customUrl && !svgIcon;

    return (
        <button
            className={classNames}
            type="button"
            tabIndex={isReadonly ? -1 : undefined}
            {...props}
        >
            {isMaterialIcon && <Icon name={icon} className={styles['button-icon-toggle__icon']} />}
            {customUrl && <img src={customUrl} alt="" className={styles['button-icon-toggle__svg']} />}
            {!props.disabled && !isReadonly && <Ripple />}
        </button>
    );
};
