import React, { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import { Ripple } from '../Ripple/Ripple';
import { getCustomIconUrl } from '../../utils/iconRegistry';
import styles from './Button.module.scss';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    variant?: 'primary' | 'assistive';
    size?: 'large' | 'small' | 'xsmall' | 'default';
    type?: 'block' | 'text' | 'button' | 'submit' | 'reset';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'default',
    type = 'block',
    leftIcon,
    rightIcon,
    children,
    className,
    ...props
}) => {
    const isTextType = type === 'text';
    const htmlType = (type === 'button' || type === 'submit' || type === 'reset') ? type : 'button';

    const classNames = [
        styles.button,
        styles[variant],
        isTextType ? styles['text-type'] : styles['block-type'],
        size !== 'default' ? styles[size] : '',
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
            type={htmlType}
            {...props}
        >
            {leftIcon && renderIcon(leftIcon)}
            {children}
            {rightIcon && renderIcon(rightIcon)}
            {!props.disabled && <Ripple />}
        </button>
    );
};
