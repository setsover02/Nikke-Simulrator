import React from 'react';
import styles from './Menu.module.scss';
import { Icon } from '../Icon/Icon';
import Font from '../Font';

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: string | React.ReactNode;
    label: React.ReactNode;
    description?: React.ReactNode;
    selected?: boolean;
    disabled?: boolean;
    focused?: boolean;
    rightElement?: React.ReactNode;
}

export const MenuItem: React.FC<MenuItemProps> = ({
    icon,
    label,
    description,
    selected = false,
    disabled = false,
    focused = false,
    rightElement,
    className,
    onClick,
    ...props
}) => {
    const classNames = [
        styles['menu-item'],
        selected ? styles.selected : '',
        focused ? styles.focused : '',
        disabled ? styles.disabled : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={classNames}
            disabled={disabled}
            onClick={disabled ? undefined : onClick}
            {...props}
        >
            {icon && (
                <div className={styles['menu-item-icon']}>
                    {typeof icon === 'string' ? <Icon name={icon} size={18} /> : icon}
                </div>
            )}
            <div className={styles['menu-item-content']}>
                <Font variant="caption-2" weight="medium">
                    {label}
                </Font>
                {description && (
                    <Font variant="caption-2" color="muted">
                        {description}
                    </Font>
                )}
            </div>
            {rightElement !== undefined ? (
                <div className={styles['menu-item-right']}>{rightElement}</div>
            ) : selected ? (
                <div className={styles['menu-item-right']}>
                    <Icon name="check" size={16} color="var(--Primary-100)" />
                </div>
            ) : null}
        </button>
    );
};

export default MenuItem;
