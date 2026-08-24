import React, { InputHTMLAttributes, useRef } from 'react';
import styles from './Textfield.module.scss';
import { ButtonIcon } from '../Button/ButtonIcon';
import Font from '../Font';

export interface TextfieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
    label?: React.ReactNode;
    leftIcon?: string | React.ReactNode;
    leftElement?: React.ReactNode;
    rightElement?: React.ReactNode;
    suffix?: React.ReactNode;
    hintText?: React.ReactNode;
    showCount?: boolean;
    onClear?: () => void;
    align?: 'left' | 'right';
    error?: boolean;
    size?: 'default' | 'small';
}

export const Textfield: React.FC<TextfieldProps> = ({
    label,
    leftIcon,
    leftElement,
    rightElement,
    suffix,
    hintText,
    maxLength,
    showCount,
    onClear,
    align = 'right',
    error,
    value,
    className,
    size = 'default',
    ...props
}) => {
    const renderIcon = (icon: React.ReactNode) => {
        if (typeof icon === 'string') {
            return <ButtonIcon icon={icon} size={size === 'small' ? 'xsmall' : 'small'} variant="assistive" className={styles['textfield-icon']} />;
        }
        return icon;
    };

    const inputClassNames = [
        styles['textfield-input'],
        align === 'left' ? styles['align-left'] : styles['align-right']
    ].filter(Boolean).join(' ');

    const inputRef = useRef<HTMLInputElement>(null);

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div className={`${styles['textfield-wrapper']} ${size === 'small' ? styles.small : ''} ${error ? styles.error : ''} ${className || ''}`}>
            <div className={styles['textfield-container']} onClick={handleContainerClick}>
                {(leftIcon || label || leftElement) && (
                    <div className={styles['textfield-left-section']}>
                        {leftIcon && renderIcon(leftIcon)}
                        {label && (
                            <span className={styles['textfield-label']}>
                                {typeof label === 'string' ? <Font variant="caption-2" weight='medium' color="muted">{label}</Font> : label}
                            </span>
                        )}
                        {leftElement && <div className={styles['textfield-left-element']}>{leftElement}</div>}
                    </div>
                )}

                <div className={styles['textfield-input-wrapper']}>
                    <input
                        ref={inputRef}
                        className={inputClassNames}
                        value={value}
                        maxLength={maxLength}
                        {...props}
                    />
                    {suffix && (
                        <span className={styles['textfield-suffix']}>
                            {typeof suffix === 'string' ? <Font variant="caption-2" color="muted">{suffix}</Font> : suffix}
                        </span>
                    )}
                </div>

                {(onClear || rightElement) && (
                    <div className={styles['textfield-right-section']}>
                        {onClear && value !== undefined && String(value).length > 0 && (
                            <ButtonIcon
                                icon="close"
                                size={size === 'small' ? 'xsmall' : 'small'}
                                variant="assistive"
                                onClick={onClear}
                                className={styles['textfield-clear-button']}
                            />
                        )}
                        {rightElement && <div className={styles['textfield-right-element']}>{rightElement}</div>}
                    </div>
                )}
            </div>

            {(hintText || showCount) && (
                <div className={styles['textfield-bottom-section']}>
                    <div className={styles['textfield-hint-text']}>
                        {hintText && (typeof hintText === 'string' ? <Font variant="caption-2" color="muted">{hintText}</Font> : hintText)}
                    </div>
                    <div className={styles['textfield-count']}>
                        {showCount && maxLength && (
                            <Font variant="caption-2" color="muted">
                                {String(value || '').length}/{maxLength}
                            </Font>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
