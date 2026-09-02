import React, { InputHTMLAttributes, useRef, useState } from 'react';
import { Field, FieldProps } from '../Field/Field';
import styles from '../Field/Field.module.scss';
import Font from '../Font';

export interface TextFieldProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'>,
    Omit<FieldProps, 'children' | 'currentLength'> {
    align?: 'left' | 'right';
    suffix?: React.ReactNode;
    inputRef?: React.Ref<HTMLInputElement>;
}

export const TextField: React.FC<TextFieldProps> = ({
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
    readOnly,
    disabled,
    value,
    defaultValue,
    className,
    style,
    size = 'default',
    inputRef: externalInputRef,
    onFocus,
    onBlur,
    onChange,
    ...props
}) => {
    const internalInputRef = useRef<HTMLInputElement>(null);
    const inputRef = (externalInputRef as React.RefObject<HTMLInputElement>) || internalInputRef;
    const [isFocused, setIsFocused] = useState(false);

    const isReadOnly = Boolean(readOnly || props.readOnly);
    const isDisabled = Boolean(disabled || props.disabled);

    const currentVal = value !== undefined ? value : defaultValue;
    const currentLength = currentVal !== undefined ? String(currentVal).length : 0;
    const hasValue = currentVal !== undefined && String(currentVal).length > 0;
    const showClear = Boolean(onClear && hasValue && !isDisabled && !isReadOnly);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    const handleContainerClick = () => {
        if (!isReadOnly && !isDisabled) {
            inputRef.current?.focus();
        }
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
            inputRef.current?.focus();
        }
    };

    const inputClassNames = [
        styles['field-input'],
        align === 'left' ? styles['align-left'] : styles['align-right'],
    ].filter(Boolean).join(' ');

    return (
        <Field
            label={label}
            leftIcon={leftIcon}
            leftElement={leftElement}
            rightElement={rightElement}
            hintText={hintText}
            showCount={showCount}
            currentLength={currentLength}
            maxLength={maxLength}
            onClear={handleClear}
            showClear={showClear}
            error={error}
            readOnly={isReadOnly}
            disabled={isDisabled}
            size={size}
            isFocused={isFocused}
            className={className}
            style={style}
            onClick={handleContainerClick}
        >
            <input
                ref={inputRef}
                className={inputClassNames}
                value={value}
                defaultValue={defaultValue}
                maxLength={maxLength}
                readOnly={isReadOnly}
                disabled={isDisabled}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={onChange}
                {...props}
            />
            {suffix && (
                <span className={styles['field-suffix']}>
                    {typeof suffix === 'string' ? (
                        <Font variant="caption-2" color="muted">
                            {suffix}
                        </Font>
                    ) : (
                        suffix
                    )}
                </span>
            )}
        </Field>
    );
};

export default TextField;
