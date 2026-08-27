import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Field, FieldProps } from '../Field/Field';
import styles from '../Field/Field.module.scss';
import { Icon } from '../Icon/Icon';
import { Menu, MenuItem, MenuEmpty } from '../Menu';

export interface AutocompleteOption {
    value: string | number;
    label: string;
    subLabel?: string;
    icon?: string | React.ReactNode;
    disabled?: boolean;
    [key: string]: any;
}

export interface AutocompleteProps
    extends Omit<FieldProps, 'children' | 'currentLength' | 'isFocused' | 'isInteractive'> {
    options: AutocompleteOption[];
    value?: string | number;
    defaultValue?: string | number;
    inputValue?: string;
    defaultInputValue?: string;
    onChange?: (value: string | number | null, option: AutocompleteOption | null) => void;
    onSelect?: (value: string | number, option: AutocompleteOption) => void;
    onInputChange?: (query: string) => void;
    placeholder?: string;
    align?: 'left' | 'right';
    clearable?: boolean;
    freeSolo?: boolean;
    emptyText?: string;
    filterOption?: (query: string, option: AutocompleteOption) => boolean;
    renderOption?: (option: AutocompleteOption, isSelected: boolean, isFocused: boolean) => React.ReactNode;
    menuMaxHeight?: number | string;
    placement?: 'auto' | 'top' | 'bottom';
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
    options,
    value: controlledValue,
    defaultValue,
    inputValue: controlledInputValue,
    defaultInputValue,
    onChange,
    onSelect,
    onInputChange,
    placeholder = '검색하거나 선택하세요',
    align = 'left',
    clearable = true,
    freeSolo = false,
    emptyText = '검색 결과가 없습니다.',
    filterOption,
    renderOption,
    label,
    leftIcon = 'search',
    leftElement,
    rightElement,
    hintText,
    error,
    readOnly,
    disabled,
    size = 'default',
    className,
    style,
    menuMaxHeight = 240,
    placement = 'auto',
}) => {
    const isControlledValue = controlledValue !== undefined;
    const isControlledInput = controlledInputValue !== undefined;

    const initialOption = options.find(o => o.value === (controlledValue ?? defaultValue));
    const [internalValue, setInternalValue] = useState<string | number | null>(
        defaultValue !== undefined ? defaultValue : null
    );
    const [internalQuery, setInternalQuery] = useState<string>(
        defaultInputValue ?? (initialOption ? initialOption.label : '')
    );
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    // Box Ref: 실제 박스 영역(.field-container)에 연결하여 hint 영역과 무관하게 박스 하단에서 팝업
    const boxRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const selectedValue = isControlledValue ? controlledValue : internalValue;
    const query = isControlledInput ? controlledInputValue : internalQuery;

    const isInteractive = !disabled && !readOnly;

    // Sync input text when value changes from outside
    useEffect(() => {
        if (controlledValue !== undefined) {
            const opt = options.find(o => o.value === controlledValue);
            if (opt) {
                setInternalQuery(opt.label);
            } else if (!freeSolo && controlledValue === null) {
                setInternalQuery('');
            }
        }
    }, [controlledValue, options, freeSolo]);

    // Filter options
    const filteredOptions = useMemo(() => {
        if (!query || query.trim() === '') {
            return options;
        }
        const q = query.toLowerCase().trim();
        return options.filter(opt => {
            if (filterOption) return filterOption(query, opt);
            const matchLabel = opt.label.toLowerCase().includes(q);
            const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
            return matchLabel || matchSub;
        });
    }, [options, query, filterOption]);

    const handleSelect = useCallback((option: AutocompleteOption) => {
        if (option.disabled) return;
        if (!isControlledValue) {
            setInternalValue(option.value);
        }
        if (!isControlledInput) {
            setInternalQuery(option.label);
        }
        onInputChange?.(option.label);
        onChange?.(option.value, option);
        onSelect?.(option.value, option);
        setIsOpen(false);
        setFocusedIndex(-1);
    }, [isControlledValue, isControlledInput, onChange, onSelect, onInputChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!isControlledInput) {
            setInternalQuery(val);
        }
        onInputChange?.(val);
        setIsOpen(true);
        setFocusedIndex(0);

        if (freeSolo) {
            if (!isControlledValue) {
                setInternalValue(val);
            }
            onChange?.(val, null);
        } else if (selectedValue !== null) {
            // Unset selected if user alters query
            const exact = options.find(o => o.label === val);
            if (exact) {
                if (!isControlledValue) setInternalValue(exact.value);
                onChange?.(exact.value, exact);
            } else {
                if (!isControlledValue) setInternalValue(null);
                onChange?.(null, null);
            }
        }
    };

    const handleClear = useCallback(() => {
        if (!isInteractive) return;
        if (!isControlledInput) {
            setInternalQuery('');
        }
        if (!isControlledValue) {
            setInternalValue(null);
        }
        onInputChange?.('');
        onChange?.(null, null);
        inputRef.current?.focus();
        setIsOpen(false);
    }, [isInteractive, isControlledInput, isControlledValue, onInputChange, onChange]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isInteractive) return;

        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                setIsOpen(true);
                setFocusedIndex(0);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown': {
                e.preventDefault();
                let next = focusedIndex + 1;
                while (next < filteredOptions.length && filteredOptions[next]?.disabled) next++;
                if (next < filteredOptions.length) setFocusedIndex(next);
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                let prev = focusedIndex - 1;
                while (prev >= 0 && filteredOptions[prev]?.disabled) prev--;
                if (prev >= 0) setFocusedIndex(prev);
                break;
            }
            case 'Enter': {
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                    const opt = filteredOptions[focusedIndex];
                    if (opt && !opt.disabled) {
                        handleSelect(opt);
                    }
                } else if (freeSolo && query) {
                    setIsOpen(false);
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

    // Highlight text helper
    const highlightMatch = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className={styles['field-highlight']}>
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    // Scroll focused into view
    useEffect(() => {
        if (isOpen && menuRef.current && focusedIndex >= 0) {
            const focusedEl = menuRef.current.children[focusedIndex] as HTMLElement;
            if (focusedEl) {
                focusedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [isOpen, focusedIndex]);

    const showClear = Boolean(clearable && query && query.length > 0 && isInteractive);

    const defaultArrowIcon = (
        <div
            className={[styles['field-icon'], isOpen ? styles.rotated : ''].filter(Boolean).join(' ')}
            onClick={(e) => {
                e.stopPropagation();
                if (isInteractive) {
                    setIsOpen(prev => !prev);
                    inputRef.current?.focus();
                }
            }}
            style={{ cursor: 'pointer' }}
        >
            <Icon name="keyboard_arrow_down" size={size === 'small' ? 18 : 20} color="var(--Font-Inactive)" />
        </div>
    );

    const inputClassNames = [
        styles['field-input'],
        align === 'left' ? styles['align-left'] : styles['align-right'],
    ].filter(Boolean).join(' ');

    return (
        <>
            <Field
                containerRef={boxRef}
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
                className={className}
                style={style}
                onClick={() => {
                    if (isInteractive) {
                        inputRef.current?.focus();
                        setIsOpen(true);
                    }
                }}
            >
                <input
                    ref={inputRef}
                    className={inputClassNames}
                    value={query}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    disabled={disabled}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (isInteractive) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                />
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
                {filteredOptions.length === 0 ? (
                    <MenuEmpty>{emptyText}</MenuEmpty>
                ) : (
                    filteredOptions.map((option, idx) => {
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
                                label={highlightMatch(option.label, query)}
                                description={option.subLabel ? highlightMatch(option.subLabel, query) : undefined}
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

export default Autocomplete;
