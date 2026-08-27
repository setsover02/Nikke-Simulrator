import React from 'react';
import styles from './Field.module.scss';
import { ButtonIcon } from '../Button/ButtonIcon';
import Font from '../Font';

export interface FieldProps {
    label?: React.ReactNode;
    leftIcon?: string | React.ReactNode;
    leftElement?: React.ReactNode;
    rightElement?: React.ReactNode;
    hintText?: React.ReactNode;
    showCount?: boolean;
    currentLength?: number;
    maxLength?: number;
    onClear?: () => void;
    showClear?: boolean;
    error?: boolean;
    readOnly?: boolean;
    disabled?: boolean;
    size?: 'default' | 'small';
    isFocused?: boolean;
    isInteractive?: boolean;
    className?: string;
    style?: React.CSSProperties;
    /** 실제 인풋/박스 영역(.field-container)의 Ref */
    containerRef?: React.Ref<HTMLDivElement>;
    /** 전체 래퍼 영역(.field-wrapper)의 Ref */
    wrapperRef?: React.Ref<HTMLDivElement>;
    tabIndex?: number;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    children?: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
    label,
    leftIcon,
    leftElement,
    rightElement,
    hintText,
    showCount,
    currentLength,
    maxLength,
    onClear,
    showClear,
    error,
    readOnly,
    disabled,
    size = 'default',
    isFocused,
    isInteractive,
    className,
    style,
    containerRef,
    wrapperRef,
    tabIndex,
    onClick,
    onMouseDown,
    onKeyDown,
    children,
}) => {
    const renderIcon = (icon: React.ReactNode) => {
        if (typeof icon === 'string') {
            return (
                <ButtonIcon
                    icon={icon}
                    size={size === 'small' ? 'xsmall' : 'small'}
                    variant="assistive"
                    className={styles['field-icon']}
                />
            );
        }
        return icon;
    };

    return (
        <div
            ref={wrapperRef}
            className={[
                styles['field-wrapper'],
                size === 'small' ? styles.small : '',
                error ? styles.error : '',
                readOnly ? styles.readonly : '',
                disabled ? styles.disabled : '',
                className || ''
            ].filter(Boolean).join(' ')}
            style={style}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
        >
            <div
                ref={containerRef}
                className={[
                    styles['field-container'],
                    isFocused ? styles.focused : '',
                    isInteractive ? styles.interactive : '',
                ].filter(Boolean).join(' ')}
                onClick={onClick}
                onMouseDown={onMouseDown}
            >
                {(leftIcon || label || leftElement) && (
                    <div className={styles['field-left-section']}>
                        {leftIcon && renderIcon(leftIcon)}
                        {label && (
                            <span className={styles['field-label']}>
                                {typeof label === 'string' ? (
                                    <Font variant="caption-2" weight="medium" color="muted">
                                        {label}
                                    </Font>
                                ) : (
                                    label
                                )}
                            </span>
                        )}
                        {leftElement && <div className={styles['field-left-element']}>{leftElement}</div>}
                    </div>
                )}

                <div className={styles['field-content']}>
                    {children}
                </div>

                {(showClear || rightElement) && (
                    <div className={styles['field-right-section']}>
                        {showClear && onClear && (
                            <ButtonIcon
                                icon="close"
                                size={size === 'small' ? 'xsmall' : 'small'}
                                variant="assistive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                }}
                                className={styles['field-clear-button']}
                                title="초기화"
                            />
                        )}
                        {rightElement && <div className={styles['field-right-element']}>{rightElement}</div>}
                    </div>
                )}
            </div>

            {(hintText || showCount) && (
                <div className={styles['field-bottom-section']}>
                    <div className={styles['field-hint-text']}>
                        {hintText && (
                            typeof hintText === 'string' ? (
                                <Font variant="caption-2" color={error ? 'error' : 'muted'}>
                                    {hintText}
                                </Font>
                            ) : (
                                hintText
                            )
                        )}
                    </div>
                    <div className={styles['field-count']}>
                        {showCount && maxLength && (
                            <Font variant="caption-2" color="muted">
                                {currentLength ?? 0}/{maxLength}
                            </Font>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Field;
