import React, { useState, useEffect, useRef } from 'react';
import Select, { components } from 'react-select';
import { SlotState } from '../../types/simulator';
import { characterOptions, avatarMap, SLOT_COLORS } from '../../constants/characters';
import { ELEMENT_ICONS, BURST_ICONS, CLASS_ICONS, COMPANY_ICONS, WEAPON_ICONS } from '../../constants/icons';
import { getCharDefaultState } from '../../utils/storageUtils';

interface Props {
    slot: SlotState | null;
    index: number;
    onUpdate: (patch: Partial<SlotState> | null) => void;
}

const formatNumber = (num: string | number) => {
    if (!num) return '-';
    // Remove formatting to parse, then format
    const parsed = parseInt(String(num).replace(/,/g, ''), 10);
    return isNaN(parsed) ? '-' : parsed.toLocaleString();
};

interface EmptySlotProps {
    onUpdate: (patch: Partial<SlotState> | null) => void;
}

const CustomOption = (props: any) => {
    const stats = props.data?.data?.stats;
    const burstLevel = stats?.burstLevel;
    const burstIcon = burstLevel ? BURST_ICONS[burstLevel as keyof typeof BURST_ICONS] : null;

    return (
        <components.Option {...props}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>{props.label}</span>
                {burstIcon && <img src={burstIcon} alt={`Burst ${burstLevel}`} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
            </div>
        </components.Option>
    );
};

const EmptySlot: React.FC<EmptySlotProps> = ({ onUpdate }) => {
    const DropdownIndicator = (props: any) => {
        return (
            <components.DropdownIndicator {...props}>
                <span className="dropdown-indicator">▼</span>
            </components.DropdownIndicator>
        );
    };

    return (
        <div className="slot-empty-container">
            <div className="slot-empty-avatar" />
            <div className="slot-empty-text">
                <div className="slot-select-wrapper">
                    <Select
                        options={characterOptions}
                        value={null}
                        placeholder="미선택"
                        onChange={(sel: any) => {
                            if (sel) {
                                onUpdate(getCharDefaultState(sel));
                            }
                        }}
                        components={{ DropdownIndicator, IndicatorSeparator: () => null, Option: CustomOption }}
                        menuPortalTarget={document.body}
                        styles={{
                            control: (b) => ({ ...b, background: 'transparent', border: 'none', boxShadow: 'none', minHeight: 'unset', cursor: 'pointer' }),
                            valueContainer: (b) => ({ ...b, padding: 0 }),
                            singleValue: (b) => ({ ...b, color: '#555', fontSize: '14px', fontWeight: 'bold', margin: 0 }),
                            placeholder: (b) => ({ ...b, color: '#555', fontSize: '14px', fontWeight: 'bold', margin: 0 }),
                            input: (b) => ({ ...b, color: '#fff', margin: 0, padding: 0 }),
                            menu: (b) => ({ ...b, background: '#252525', zIndex: 10 }),
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                            option: (b, s) => ({ ...b, background: s.isFocused ? '#353535' : '#252525', color: '#eee', fontSize: '13px' }),
                        }}
                        isSearchable={true}
                    />
                </div>
            </div>
            <div className="slot-empty-equip">
                <span className="color-555">소장품</span> <span className="text-right">-</span>
                <span className="color-555">레벨</span> <span className="text-right">-</span>
                <span className="color-555">큐브</span> <span className="text-right">-</span>
            </div>
            <div className="slot-empty-skills">
                <span className="color-555">스킬1</span> <span className="text-right">-</span>
                <span className="color-555">스킬2</span> <span className="text-right">-</span>
                <span className="color-555">버스트</span> <span className="text-right">-</span>
            </div>
            <div className="slot-empty-stats">
                <span className="color-555">체력</span> <span className="text-right">-</span>
                <span className="color-555">우코</span> <span className="text-right">-</span>
                <span className="color-555">공격력</span> <span className="text-right">-</span>
                <span className="color-555">공퍼</span> <span className="text-right">-</span>
                <span className="color-555">방어력</span> <span className="text-right">-</span>
                <span className="color-555">장탄</span> <span className="text-right">-</span>
            </div>
        </div>
    );
};

const CharacterSlot: React.FC<Props> = ({ slot, index, onUpdate }) => {
    if (!slot) return <EmptySlot onUpdate={onUpdate} />;

    const avatar = avatarMap[slot.char.data.characterID];
    const data = slot.char.data;
    const stats = data.stats;

    const classIcon = CLASS_ICONS[stats.class];
    const companyIcon = COMPANY_ICONS[stats.company];
    const weaponIcon = WEAPON_ICONS[stats.weapon];
    const burstIcon = BURST_ICONS[stats.burstLevel];
    const elementIcon = ELEMENT_ICONS[stats.element];

    const DropdownIndicator = (props: any) => {
        return (
            <components.DropdownIndicator {...props}>
                <span className="dropdown-indicator">▼</span>
            </components.DropdownIndicator>
        );
    };

    const skillsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const preventScroll = (e: WheelEvent) => {
            if (document.activeElement === e.target) {
                e.preventDefault();
            }
        };
        const el = skillsRef.current;
        if (el) {
            el.addEventListener('wheel', preventScroll, { passive: false });
        }
        return () => {
            if (el) el.removeEventListener('wheel', preventScroll);
        };
    }, []);

    return (
        <div className="slot-container">
            {/* Slot color indicator left border */}
            <div className="slot-border-left" style={{ background: SLOT_COLORS[index % SLOT_COLORS.length] }} />

            {/* Avatar */}
            <div className="slot-avatar">
                {avatar ? (
                    <img src={avatar} alt={data.characterName} />
                ) : (
                    <div className="slot-avatar-placeholder">IMG</div>
                )}
            </div>

            {/* Identity (Name + Icons) */}
            <div className="slot-identity">
                <div className="slot-select-wrapper">
                    <Select
                        options={characterOptions}
                        value={slot.char}
                        onChange={(sel: any) => {
                            if (sel) {
                                onUpdate(getCharDefaultState(sel));
                            } else {
                                onUpdate(null);
                            }
                        }}
                        isClearable={true}
                        isSearchable={true}
                        menuPortalTarget={document.body}
                        components={{ DropdownIndicator, IndicatorSeparator: () => null, Option: CustomOption }}
                        styles={{
                            control: (b) => ({ ...b, background: 'transparent', border: 'none', boxShadow: 'none', minHeight: 'unset', cursor: 'pointer' }),
                            valueContainer: (b) => ({ ...b, padding: 0 }),
                            singleValue: (b) => ({ ...b, color: '#fff', fontSize: '14px', fontWeight: 'bold', margin: 0 }),
                            input: (b) => ({ ...b, color: '#fff', margin: 0, padding: 0 }),
                            menu: (b) => ({ ...b, background: '#252525', zIndex: 10 }),
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                            option: (b, s) => ({ ...b, background: s.isFocused ? '#353535' : '#252525', color: '#eee', fontSize: '13px' }),
                        }}
                    />
                </div>
                <div className="slot-icons">
                    {classIcon && <img src={classIcon} alt={stats.class} className="slot-icon-sm" />}
                    {companyIcon && <img src={companyIcon} alt={stats.company} className="slot-icon-brightness" />}
                    {weaponIcon && <img src={weaponIcon} alt={stats.weapon} className="slot-icon-sm" />}
                    {burstIcon && <img src={burstIcon} alt={`Burst ${stats.burstLevel}`} className="slot-icon-sm" />}
                    {elementIcon && <img src={elementIcon} alt={stats.element} className="slot-icon-sm" />}
                </div>
            </div>

            {/* Equipment (Collection / Cube) */}
            <div className="slot-equip">
                <span className="color-777">소장품</span>
                <select className="slot-select-sm" value={slot.collectionGrade || 'None'} onChange={e => {
                    const grade = e.target.value as 'None' | 'R' | 'SR' | 'SSR';
                    const level = grade === 'SSR' && (!slot.collectionLevel || slot.collectionLevel === '0') ? '1' : slot.collectionLevel;
                    onUpdate({ collectionGrade: grade, collectionLevel: level });
                }}>
                    <option value="None">없음</option>
                    <option value="R">R</option>
                    <option value="SR">SR</option>
                    {slot.char.data.stats.treasure && <option value="SSR">SSR (애장품)</option>}
                </select>

                <span className="color-777">레벨</span>
                <input
                    className="slot-input-bg"
                    type="number"
                    min="0"
                    max="15"
                    value={slot.collectionLevel || '0'}
                    onChange={e => onUpdate({ collectionLevel: e.target.value })}
                    disabled={slot.collectionGrade === 'None' || !slot.collectionGrade}
                />

                <span className="color-777">큐브</span>
                <div className="cube-badge">
                    <span className="cube-badge-title">단추</span> <span className="cube-badge-value">-</span>
                </div>
            </div>

            {/* Skills */}
            <div className="slot-skills" ref={skillsRef}>
                <span className="color-777">스킬1</span>
                <input
                    className="slot-input"
                    type="number"
                    min="1" max="10"
                    value={slot.skill1Level || 10}
                    onChange={e => onUpdate({ skill1Level: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    onWheel={e => {
                        const current = slot.skill1Level || 10;
                        const delta = e.deltaY < 0 ? 1 : -1;
                        onUpdate({ skill1Level: Math.max(1, Math.min(10, current + delta)) });
                    }}
                />

                <span className="color-777">스킬2</span>
                <input
                    className="slot-input"
                    type="number"
                    min="1" max="10"
                    value={slot.skill2Level || 10}
                    onChange={e => onUpdate({ skill2Level: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    onWheel={e => {
                        const current = slot.skill2Level || 10;
                        const delta = e.deltaY < 0 ? 1 : -1;
                        onUpdate({ skill2Level: Math.max(1, Math.min(10, current + delta)) });
                    }}
                />

                <span className="color-777">버스트</span>
                <input
                    className="slot-input"
                    type="number"
                    min="1" max="10"
                    value={slot.burstLevel || 10}
                    onChange={e => onUpdate({ burstLevel: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    onWheel={e => {
                        const current = slot.burstLevel || 10;
                        const delta = e.deltaY < 0 ? 1 : -1;
                        onUpdate({ burstLevel: Math.max(1, Math.min(10, current + delta)) });
                    }}
                />
            </div>

            {/* Stats */}
            <div className="slot-stats">
                <span className="color-777">체력</span>
                <input className="slot-input" value={formatNumber(slot.customHP)} onChange={e => onUpdate({ customHP: e.target.value.replace(/,/g, '') })} />

                <span className="color-777">우코</span>
                <span className="percent-wrapper">
                    <input className="slot-input-sm" value={slot.equipWeakPoint || '0'} onChange={e => onUpdate({ equipWeakPoint: e.target.value })} />%
                </span>

                <span className="color-777">공격력</span>
                <input className="slot-input" value={formatNumber(slot.customATK)} onChange={e => onUpdate({ customATK: e.target.value.replace(/,/g, '') })} />

                <span className="color-777">공퍼</span>
                <span className="percent-wrapper">
                    <input className="slot-input-sm" value={slot.equipATK || '0'} onChange={e => onUpdate({ equipATK: e.target.value })} />%
                </span>

                <span className="color-777">방어력</span>
                <input className="slot-input" value={formatNumber(slot.customDEF)} onChange={e => onUpdate({ customDEF: e.target.value.replace(/,/g, '') })} />

                <span className="color-777">장탄</span>
                <span className="percent-wrapper">
                    <input className="slot-input-sm" value={slot.equipAmmo || '0'} onChange={e => onUpdate({ equipAmmo: e.target.value })} />%
                </span>
            </div>
        </div>
    );
};

export default CharacterSlot;
