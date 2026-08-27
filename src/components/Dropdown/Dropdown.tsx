import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Field, FieldProps } from '../Field/Field';
import styles from '../Field/Field.module.scss';
import { Icon } from '../Icon/Icon';
import { Menu, MenuItem, MenuEmpty } from '../Menu';

export interface DropdownOption {
    value: string | number;
    label: React.ReactNode;
    icon?: string | React.ReactNode;
    disabled?: boolean;
    description?: React.ReactNode;
    [key: string]: any;
}

export interface DropdownProps
    extends Omit<FieldProps, 'children' | 'currentLength' | 'isFocused' | 'isInteractive'> {
    options: DropdownOption[];
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (value: string | number, option: DropdownOption) => void;
    placeholder?: string;
    align?: 'left' | 'right';
    clearable?: boolean;
    renderOption?: (option: DropdownOption, isSelected: boolean, isFocused: boolean) => React.ReactNode;
    renderValue?: (selectedOption: DropdownOption | null) => React.ReactNode;
    menuMaxHeight?: number | string;
    placement?: 'auto' | 'top' | 'bottom';
}

export const Dropdown: React.FC<DropdownProps> = ({
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    placeholder = '선택해주세요',
    align = 'left',
    clearable = false,
    onClear,
    label,
    leftIcon,
    leftElement,
    rightElement,
    hintText,
    error,
    readOnly,
    disabled,
    size = 'default',
    className,
    style,
    renderOption,
    renderValue,
    menuMaxHeight = 240,
    placement = 'auto',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string | number | undefined>(defaultValue);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Box Ref: 실제 박스 영역(.field-container)에 연결하여 hint 영역과 무관하게 박스 하단에서 팝업
    const boxRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledValue !== undefined;
    const selectedValue = isControlled ? controlledValue : internalValue;

    const selectedOption = options.find(opt => opt.value === selectedValue) || null;
    const isInteractive = !disabled && !readOnly;

    const handleSelect = useCallback((option: DropdownOption) => {
        if (option.disabled) return;
        if (!isControlled) {
            setInternalValue(option.value);
        }
        onChange?.(option.value, option);
        setIsOpen(false);
        setFocusedIndex(-1);
    }, [isControlled, onChange]);

    const handleClear = useCallback(() => {
        if (!isInteractive) return;
        if (!isControlled) {
            setInternalValue(undefined);
        }
        onClear?.();
        setIsOpen(false);
    }, [isInteractive, isControlled, onClear]);

    const toggleOpen = () => {
        if (!isInteractive) return;
        setIsOpen(prev => {
            const next = !prev;
            if (next) {
                const idx = options.findIndex(opt => opt.value === selectedValue);
                setFocusedIndex(idx >= 0 ? idx : 0);
            }
            return next;
        });
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isInteractive) return;

        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                setIsOpen(true);
                const idx = options.findIndex(opt => opt.value === selectedValue);
                setFocusedIndex(idx >= 0 ? idx : 0);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown': {
                e.preventDefault();
                let next = focusedIndex + 1;
                while (next < options.length && options[next]?.disabled) next++;
                if (next < options.length) setFocusedIndex(next);
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                let prev = focusedIndex - 1;
                while (prev >= 0 && options[prev]?.disabled) prev--;
                if (prev >= 0) setFocusedIndex(prev);
                break;
            }
            case 'Enter':
            case ' ': {
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < options.length) {
                    const opt = options[focusedIndex];
                    if (opt && !opt.disabled) {
                        handleSelect(opt);
                    }
                }
                break;
            }
            case 'Escape':
            case 'Tab': {
                setIsOpen(false);
                break;
            }
        }
    };

    // Scroll focused option into view
    useEffect(() => {
        if (isOpen && menuRef.current && focusedIndex >= 0) {
            const focusedEl = menuRef.current.children[focusedIndex] as HTMLElement;
            if (focusedEl) {
                focusedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [isOpen, focusedIndex]);

    const showClear = Boolean(clearable && selectedValue !== undefined && selectedValue !== '' && isInteractive);

    const defaultArrowIcon = (
        <div className={[styles['field-icon'], isOpen ? styles.rotated : ''].filter(Boolean).join(' ')}>
            <Icon name="keyboard_arrow_down" size={size === 'small' ? 18 : 20} color="var(--Font-Inactive)" />
        </div>
    );

    return (
        <>
            <Field
                containerRef={boxRef}
                tabIndex={isInteractive ? 0 : -1}
                onKeyDown={handleKeyDown}
                label={label}
                leftIcon={leftIcon}
                leftElement={leftElement}
                rightElement={rightElement || defaultArrowIcon}
                hintText={hintText}
                onClear={handleClear}
                showClear={showClear}
                error={error}
                readOnly={readOnly}
                disabled={disabled}
                size={size}
                isFocused={isOpen}
                isInteractive={isInteractive}
                className={className}
                style={style}
                onClick={toggleOpen}
            >
                {renderValue ? (
                    renderValue(selectedOption)
                ) : selectedOption ? (
                    <div
                        className={[
                            styles['field-display-value'],
                            align === 'right' ? styles['align-right'] : styles['align-left'],
                        ].filter(Boolean).join(' ')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {selectedOption.icon && (
                                <span className={styles['field-dropdown-option-icon']}>
                                    {typeof selectedOption.icon === 'string' ? (
                                        <Icon name={selectedOption.icon} size={size === 'small' ? 16 : 18} />
                                    ) : (
                                        selectedOption.icon
                                    )}
                                </span>
                            )}
                            <span>{selectedOption.label}</span>
                        </div>
                    </div>
                ) : (
                    <div
                        className={[
                            styles['field-display-value'],
                            styles.placeholder,
                            align === 'right' ? styles['align-right'] : styles['align-left'],
                        ].filter(Boolean).join(' ')}
                    >
                        {placeholder}
                    </div>
                )}
            </Field>

            {/* Portal Menu Popover with Auto Flipping & Width Matching on Box Ref */}
            <Menu
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                anchorRef={boxRef}
                maxHeight={menuMaxHeight}
                placement={placement}
                menuRef={menuRef}
            >
                {options.length === 0 ? (
                    <MenuEmpty>옵션이 없습니다.</MenuEmpty>
                ) : (
                    options.map((option, idx) => {
                        const isSelected = option.value === selectedValue;
                        const isFocused = idx === focusedIndex;

                        if (renderOption) {
                            return (
                                <div
                                    key={String(option.value)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                    onMouseEnter={() => setFocusedIndex(idx)}
                                >
                                    {renderOption(option, isSelected, isFocused)}
                                </div>
                            );
                        }

                        return (
                            <MenuItem
                                key={String(option.value)}
                                icon={option.icon}
                                label={option.label}
                                description={option.description}
                                selected={isSelected}
                                focused={isFocused}
                                disabled={option.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(option);
                                }}
                                onMouseEnter={() => setFocusedIndex(idx)}
                            />
                        );
                    })
                )}
            </Menu>
        </>
    );
};

export default Dropdown;
