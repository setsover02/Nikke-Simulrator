import React, { useState, useEffect, useRef } from 'react';
import Select, { components } from 'react-select';
import { SlotState } from '../../types/simulator';
import { characterOptions, avatarMap, fullbodyMap, SLOT_COLORS } from '../../constants/characters';
import { ELEMENT_ICONS, BURST_ICONS, CLASS_ICONS, COMPANY_ICONS, WEAPON_ICONS } from '../../constants/icons';
import { getCharDefaultState } from '../../utils/storageUtils';
import Icon from '../../components/Icon';

// Cube Data Source
const CUBE_OPTIONS = [
    { value: 'None', label: '없음', icon: null },
    { value: '01-cube-assault', label: '어썰트', icon: '/src/assets/cube/01-cube-assault.webp' },
    { value: '02-cube-onslaught', label: '택티컬 어설트', icon: '/src/assets/cube/02-cube-onslaught.webp' },
    { value: '03-cube-resilience', label: '렐릭 베어', icon: '/src/assets/cube/03-cube-resilience.webp' },
    { value: '04-cube-bastion', label: '택티컬 베어', icon: '/src/assets/cube/04-cube-bastion.webp' },
    { value: '05-cube-adjutant', label: '렐릭 부스트', icon: '/src/assets/cube/05-cube-adjutant.webp' },
    { value: '06-cube-wingman', label: '택티컬 부스트', icon: '/src/assets/cube/06-cube-wingman.webp' },
    { value: '07-cube-quantum', label: '렐릭 퀀텀', icon: '/src/assets/cube/07-cube-quantum.webp' },
    { value: '08-cube-vigor', label: '렐릭 비고르', icon: '/src/assets/cube/08-cube-vigor.webp' },
    { value: '09-cube-endurance', label: '렐릭 인듀어', icon: '/src/assets/cube/09-cube-endurance.webp' },
    { value: '10-cube-healing', label: '렐릭 힐링', icon: '/src/assets/cube/10-cube-healing.webp' },
    { value: '11-cube-tempering', label: '렐릭 템퍼링', icon: '/src/assets/cube/11-cube-tempering.webp' },
    { value: '12-cube-assist', label: '렐릭 어시스터', icon: '/src/assets/cube/12-cube-assist.webp' },
    { value: '13-cube-destruction', label: '렐릭 디스트로이', icon: '/src/assets/cube/13-cube-destruction.webp' },
    { value: '14-cube-piercing', label: '렐릭 피어싱', icon: '/src/assets/cube/14-cube-piercing.webp' },
    { value: '15-cube-crash', label: '렐릭 크래시', icon: '/src/assets/cube/15-cube-crash.webp' }
];

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
    const characterData = props.data?.data;
    const stats = characterData?.stats;
    const burstLevel = stats?.burstLevel;
    const burstIcon = burstLevel ? BURST_ICONS[burstLevel as keyof typeof BURST_ICONS] : null;
    const element = stats?.element;
    const elementIcon = element ? ELEMENT_ICONS[element as keyof typeof ELEMENT_ICONS] : null;
    const avatar = characterData ? avatarMap[characterData.characterID] : null;

    return (
        <components.Option {...props}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {avatar && (
                        <img
                            src={avatar}
                            alt={props.label}
                            style={{
                                width: '32px',
                                height: '32px',
                                objectFit: 'cover',
                                borderRadius: '4px'
                            }}
                        />
                    )}
                    <span>{props.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {elementIcon && <img src={elementIcon} alt={`Element ${element}`} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                    {burstIcon && <img src={burstIcon} alt={`Burst ${burstLevel}`} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                </div>
            </div>
        </components.Option>
    );
};

const CustomCubeOption = (props: any) => {
    return (
        <components.Option {...props}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                {props.data.icon ? (
                    <img src={props.data.icon} alt={props.label} style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
                ) : (
                    <div style={{ width: '32px', height: '32px' }} /> // Placeholder for 'None'
                )}
                <span>{props.label}</span>
            </div>
        </components.Option>
    );
};

const CustomCubeSingleValue = (props: any) => {
    return (
        <components.SingleValue {...props}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {props.data.icon ? (
                    <img src={props.data.icon} alt={props.data.label} style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
                ) : (
                    <div style={{ width: '32px', height: '32px' }} />
                )}
                <span style={{ color: '#eee', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {props.data.label}
                </span>
            </div>
        </components.SingleValue>
    );
};

const CubeDropdownIndicator = (props: any) => {
    return (
        <components.DropdownIndicator {...props}>
            <Icon name="keyboard_arrow_down" size={20} />
        </components.DropdownIndicator>
    );
};

const EmptySlot: React.FC<EmptySlotProps> = ({ onUpdate }) => {
    const DropdownIndicator = (props: any) => {
        return (
            <components.DropdownIndicator {...props}>
                <Icon name="arrow_drop_down" size={20} />
            </components.DropdownIndicator>
        );
    };

    return (
        <div className="slot-empty-container">
            <div className="slot-header-identity">
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
            </div>

            <div className="slot-section">
                <span className="color-555">소장품</span> <span className="text-right">-</span>
                <span className="color-555">레벨</span> <span className="text-right">-</span>
                <span className="color-555">큐브</span> <span className="text-right">-</span>
            </div>

            <div className="slot-section">
                <span className="color-555">체력</span> <span className="text-right">-</span>
                <span className="color-555">공격력</span> <span className="text-right">-</span>
                <span className="color-555">방어력</span> <span className="text-right">-</span>
            </div>

            <div className="slot-section">
                <span className="color-555">우코</span> <span className="text-right">-</span>
                <span className="color-555">공격력</span> <span className="text-right">-</span>
                <span className="color-555">장탄</span> <span className="text-right">-</span>
                <span className="color-555">명중률</span> <span className="text-right">-</span>
                <span className="color-555">차댐</span> <span className="text-right">-</span>
                <span className="color-555">차속</span> <span className="text-right">-</span>
                <span className="color-555">크확</span> <span className="text-right">-</span>
                <span className="color-555">크댐</span> <span className="text-right">-</span>
                <span className="color-555">방어력</span> <span className="text-right">-</span>
            </div>

            <div className="slot-section">
                <span className="color-555">스킬1</span> <span className="text-right">-</span>
                <span className="color-555">스킬2</span> <span className="text-right">-</span>
                <span className="color-555">버스트</span> <span className="text-right">-</span>
            </div>
        </div>
    );
};

const CharacterSlot: React.FC<Props> = ({ slot, index, onUpdate }) => {
    if (!slot) return <EmptySlot onUpdate={onUpdate} />;

    const avatar = avatarMap[slot.char.data.characterID];
    const data = slot.char.data;
    const stats = data.stats;
    const fullbody = fullbodyMap[data.characterID];

    const classIcon = CLASS_ICONS[stats.class];
    const companyIcon = COMPANY_ICONS[stats.company];
    const weaponIcon = WEAPON_ICONS[stats.weapon];
    const burstIcon = BURST_ICONS[stats.burstLevel];
    const elementIcon = ELEMENT_ICONS[stats.element];

    const DropdownIndicator = (props: any) => {
        return (
            <components.DropdownIndicator {...props}>
                <Icon name="arrow_drop_down" size={20} />
            </components.DropdownIndicator>
        );
    };

    const ClearIndicator = (props: any) => {
        return (
            <components.ClearIndicator {...props}>
                <Icon name="close" size={20} />
            </components.ClearIndicator>
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

    const selectedCube = CUBE_OPTIONS.find(c => c.value === (slot.cubeName || 'None'));

    const handleEquipChange = (field: keyof SlotState, max: number, value: string) => {
        if (value === '' || value === '.') {
            onUpdate({ [field]: value });
            return;
        }
        const num = parseFloat(value);
        if (!isNaN(num) && num > max) {
            onUpdate({ [field]: max.toString() });
            return;
        }
        onUpdate({ [field]: value });
    };

    return (
        <div className="slot-container" style={{ '--fullbody-bg': fullbody ? `url(${fullbody})` : 'none' } as React.CSSProperties}>
            {/* Slot color indicator left border (now on top) */}
            <div className="slot-border-left" style={{ background: SLOT_COLORS[index % SLOT_COLORS.length], zIndex: 1 }} />
            {/* Header Identity (Avatar + Select) */}
            <div className="slot-header-identity" style={{ position: 'relative', zIndex: 1 }}>
                {/* <div className="slot-avatar">
                    {avatar ? (
                        <img src={avatar} alt={data.characterName} />
                    ) : (
                        <div className="slot-avatar-placeholder">IMG</div>
                    )}
                </div> */}

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
                            components={{ DropdownIndicator, ClearIndicator, IndicatorSeparator: () => null, Option: CustomOption }}
                            className="char-select-container"
                            classNamePrefix="char-select"
                        />
                    </div>
                </div>
            </div>

            <div className="slot-icons">
                {classIcon && <img src={classIcon} alt={stats.class} className="slot-icon-sm" />}
                {companyIcon && <img src={companyIcon} alt={stats.company} className="slot-icon-sm" />}
                {weaponIcon && <img src={weaponIcon} alt={stats.weapon} className="slot-icon-sm" />}
                {burstIcon && <img src={burstIcon} alt={`Burst ${stats.burstLevel}`} className="slot-icon-sm" />}
                {elementIcon && <img src={elementIcon} alt={stats.element} className="slot-icon-sm" />}
            </div>

            {/* Equipment (Collection / Cube) */}
            <div className="slot-section">
                <span className="color-777">소장품</span>
                <div
                    className={`collection-chip ${slot.collectionGrade === 'SSR' ? 'chip-ssr' : slot.collectionGrade === 'SR' ? 'chip-sr' : slot.collectionGrade === 'R' ? 'chip-r' : 'chip-none'}`}
                    onClick={() => {
                        const hasTreasure = slot.char.data.stats.treasure;
                        const current = slot.collectionGrade || 'None';
                        let next: 'None' | 'R' | 'SR' | 'SSR' = 'None';

                        if (current === 'None') next = 'R';
                        else if (current === 'R') next = 'SR';
                        else if (current === 'SR') next = hasTreasure ? 'SSR' : 'None';
                        else if (current === 'SSR') next = 'None';

                        const level = next === 'SSR' && (!slot.collectionLevel || slot.collectionLevel === '0') ? '1' : slot.collectionLevel;
                        onUpdate({ collectionGrade: next, collectionLevel: level });
                    }}
                >
                    {slot.collectionGrade === 'SSR' ? '애장품' : slot.collectionGrade === 'SR' ? 'SR' : slot.collectionGrade === 'R' ? 'R' : '없음'}
                </div>

                <span className="color-777">소장품 레벨</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <input
                        className="slot-input"
                        type="number"
                        min="0"
                        max="15"
                        value={slot.collectionLevel || '0'}
                        onChange={e => onUpdate({ collectionLevel: e.target.value })}
                        disabled={slot.collectionGrade === 'None' || !slot.collectionGrade}
                    />
                </div>
            </div>
            <div className="slot-section-fr">
                <span className="color-777">큐브</span>
                <Select
                    className="slot-select-sm"
                    value={CUBE_OPTIONS.find(opt => opt.value === (slot.cubeName || 'None'))}
                    options={CUBE_OPTIONS}
                    onChange={(sel: any) => {
                        if (sel) {
                            onUpdate({ cubeName: sel.value, cubeLevel: sel.value === 'None' ? '0' : (slot.cubeLevel || '1') });
                        }
                    }}
                    components={{ DropdownIndicator: CubeDropdownIndicator, IndicatorSeparator: () => null, Option: CustomCubeOption, SingleValue: CustomCubeSingleValue }}
                    menuPortalTarget={document.body}
                    styles={{
                        control: (b) => ({ ...b, background: 'transparent', border: 'none', boxShadow: 'none', minHeight: 'unset', cursor: 'pointer', padding: 0 }),
                        valueContainer: (b) => ({ ...b, padding: 0, overflow: 'visible' }),
                        singleValue: (b) => ({ ...b, color: 'var(--shade-000)', fontSize: '13px', margin: 0, position: 'static', overflow: 'visible', transform: 'none' }),
                        indicatorsContainer: (b) => ({ ...b }),
                        menu: (b) => ({ ...b, background: '#2a2f3a', zIndex: 10 }),
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        option: (b, s) => ({ ...b, background: s.isFocused ? '#35353e' : '#2a2f3a', color: '#eee', fontSize: '13px' }),
                    }}
                    isSearchable={false}
                />
            </div>
            <div className="slot-section">
                <span className="color-777">큐브 레벨</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <input
                        className="slot-input"
                        type="number"
                        min="1"
                        max="15"
                        value={slot.cubeLevel || '0'}
                        onChange={e => {
                            const val = Math.max(1, Math.min(15, parseInt(e.target.value) || 1));
                            onUpdate({ cubeLevel: val.toString() });
                        }}
                        disabled={!slot.cubeName || slot.cubeName === 'None'}
                    />
                </div>
            </div>


            {/* Stats */}
            <div className="slot-subtitle">스탯</div>
            <div className="slot-section">
                <span className="color-777">체력</span>
                <input className="slot-input" value={formatNumber(slot.customHP)} onChange={e => onUpdate({ customHP: e.target.value.replace(/,/g, '') })} />

                <span className="color-777">공격력</span>
                <input className="slot-input" value={formatNumber(slot.customATK)} onChange={e => onUpdate({ customATK: e.target.value.replace(/,/g, '') })} />

                <span className="color-777">방어력</span>
                <input className="slot-input" value={formatNumber(slot.customDEF)} onChange={e => onUpdate({ customDEF: e.target.value.replace(/,/g, '') })} />
            </div>

            {/* Equip Lines */}
            <div className="slot-subtitle">장비</div>
            <div className="slot-section">
                <span className="color-777">우코</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipWeakPoint || '0'} onChange={e => handleEquipChange('equipWeakPoint', 116.64, e.target.value)} />%
                </span>

                <span className="color-777">공격력</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipATK || '0'} onChange={e => handleEquipChange('equipATK', 58.52, e.target.value)} />%
                </span>

                <span className="color-777">장탄</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipAmmo || '0'} onChange={e => handleEquipChange('equipAmmo', 341.48, e.target.value)} />%
                </span>

                <span className="color-777">명중률</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipAccuracy || '0'} onChange={e => handleEquipChange('equipAccuracy', 58.52, e.target.value)} />%
                </span>

                <span className="color-777">차댐</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipChargeDmg || '0'} onChange={e => handleEquipChange('equipChargeDmg', 58.52, e.target.value)} />%
                </span>

                <span className="color-777">차속</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipChargeSpeed || '0'} onChange={e => handleEquipChange('equipChargeSpeed', 24.36, e.target.value)} />%
                </span>

                <span className="color-777">크확</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipCritRate || '0'} onChange={e => handleEquipChange('equipCritRate', 28.28, e.target.value)} />%
                </span>

                <span className="color-777">크댐</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipCritDmg || '0'} onChange={e => handleEquipChange('equipCritDmg', 81.44, e.target.value)} />%
                </span>

                <span className="color-777">방어력</span>
                <span className="percent-wrapper">
                    <input className="slot-input" value={slot.equipDef || '0'} onChange={e => handleEquipChange('equipDef', 58.52, e.target.value)} />%
                </span>
            </div>

            {/* Skills */}
            <div className="slot-subtitle">스킬</div>
            <div className="slot-section" ref={skillsRef}>
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
        </div>
    );
};

export default CharacterSlot;
