import React, { InputHTMLAttributes, useState } from 'react';
import { Ripple } from '../Ripple/Ripple';
import styles from './Switch.module.scss';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
    checked: controlledChecked,
    defaultChecked = false,
    disabled = false,
    onChange,
    className = '',
    ...props
}) => {
    const isControlled = controlledChecked !== undefined;
    const [internalChecked, setInternalChecked] = useState(defaultChecked);

    const checked = isControlled ? controlledChecked : internalChecked;

    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (!isControlled) {
            setInternalChecked(e.target.checked);
        }
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <label
            className={[
                styles.switch,
                checked ? styles.checked : '',
                disabled ? styles.disabled : '',
                className
            ].filter(Boolean).join(' ')}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={handleToggle}
                style={{ display: 'none' }}
                {...props}
            />
            <div className={styles.handle} />
            {!disabled && <Ripple />}
        </label>
    );
};
