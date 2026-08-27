import React, { useState, useEffect, useRef, useMemo } from 'react';
import Select, { components } from 'react-select';
import { SlotState } from '../../types/simulator';
import { characterOptions, avatarMap, fullbodyMap, SLOT_COLORS } from '../../constants/characters';
import { ELEMENT_ICONS, BURST_ICONS, CLASS_ICONS, COMPANY_ICONS, WEAPON_ICONS } from '../../constants/icons';
import { getCharDefaultState, SavedOutpostState } from '../../utils/storageUtils';
import { Icon } from '../../components/Icon/Icon';
import { Font } from '../../components/Font';
import { Avatar } from '../../components/Avatar/Avatar';
import { Textfield } from '../../components/Textfield/Textfield';
import { Chip } from '../../components/Chip/Chip';
import { Grid } from '../../components/Layout/Grid';
import { calculateBaseStat, getCorpConsoleLevel, getClassConsoleLevel, resolveGrowthStage, growthStageLabel, MAX_STAGE_BY_RARITY } from '../../engine/baseStat';

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
    { value: '15-cube-crash', label: '렐릭 크래시', icon: '/src/assets/cube/15-cube-crash.webp' },
    { value: '16-cube-divide', label: '렐릭 디바이드', icon: '/src/assets/cube/16-cube-divide.webp' }
];

interface Props {
    slot: SlotState | null;
    index: number;
    onUpdate: (patch: Partial<SlotState> | null) => void;
    outpostState: SavedOutpostState;
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
            <div className="slot-header-identity" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '4px 0 8px 0' }}>
                <div className="slot-empty-avatar" style={{ width: '80px', height: '80px', borderRadius: '8px', flexShrink: 0 }} />
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
                <Font as="span" variant="caption-1" color="muted">소장품</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">레벨</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">큐브</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
            </div>

            <div className="slot-section">
                <Font as="span" variant="caption-1" color="muted">체력</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">공격력</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">방어력</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
            </div>

            <div className="slot-section">
                <Font as="span" variant="caption-1" color="muted">우코</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">공격력</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">장탄</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">명중률</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">차댐</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">차속</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">크확</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">크댐</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">방어력</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
            </div>

            <div className="slot-section">
                <Font as="span" variant="caption-1" color="muted">스킬1</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">스킬2</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
                <Font as="span" variant="caption-1" color="muted">버스트</Font> <Font as="span" variant="caption-1" color="inactive" className="text-right">-</Font>
            </div>
        </div>
    );
};

const CharacterSlot: React.FC<Props> = ({ slot, index, onUpdate, outpostState }) => {
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

    // ── 장비 티어 옵션 ─────────────────────────────────────────────────
    const EQUIP_TIER_OPTIONS = [
        { value: 'none', label: '없음' },
        { value: 'T9', label: '일반 T9' },
        { value: '기업', label: '기업 전용' },
        { value: 'Overload', label: '오버로드' },
    ];

    // ── 성장 단계 (돌파/코강) ──────────────────────────────────────────
    const charRarity = data.stats.rarity || 'SSR';
    const charCompany = data.stats.company || '';
    const charName = data.characterName || '';
    const maxStage = MAX_STAGE_BY_RARITY[charRarity] ?? 10;
    const currentGrowthStage = Math.min(parseInt(slot.growthStage) || 0, maxStage);

    const growthOptions = Array.from({ length: maxStage + 1 }, (_, i) => ({
        value: i,
        label: growthStageLabel(i)
    }));

    const { maxAffinity } = resolveGrowthStage(charRarity, charCompany, charName, currentGrowthStage);

    // ── 자동 스탯 계산 ──────────────────────────────────────────────────
    const calculatedStats = useMemo(() => {
        if (!outpostState) return null;
        const charStats = data.stats;
        return calculateBaseStat({
            classType: charStats.class,
            weaponType: charStats.weapon,
            level: parseInt(outpostState.synchroLevel) || 1,
            affinityLevel: Math.min(parseInt(slot.affinityLevel) || 1, maxAffinity),
            growthStage: currentGrowthStage,
            rarity: charRarity,
            company: charCompany,
            charName: charName,
            commonConsoleLevel: parseInt(outpostState.commonResearchLevel) || 0,
            classConsoleLevel: getClassConsoleLevel(charStats.class, outpostState),
            corpConsoleLevel: getCorpConsoleLevel(charStats.company, outpostState),
            cubeLevel: parseInt(slot.cubeLevel) || 0,
            equipTierHead: slot.equipTierHead || 'none',
            equipUpgradeHead: parseInt(slot.equipUpgradeHead) || 0,
            equipTierTorso: slot.equipTierTorso || 'none',
            equipUpgradeTorso: parseInt(slot.equipUpgradeTorso) || 0,
            equipTierArms: slot.equipTierArms || 'none',
            equipUpgradeArms: parseInt(slot.equipUpgradeArms) || 0,
            equipTierLegs: slot.equipTierLegs || 'none',
            equipUpgradeLegs: parseInt(slot.equipUpgradeLegs) || 0,
            collectionGrade: slot.collectionGrade || 'None',
            collectionLevel: parseInt(slot.collectionLevel) || 0,
        });
    }, [
        outpostState,
        slot.affinityLevel,
        slot.growthStage,
        slot.cubeLevel,
        slot.cubeLevel,
        slot.equipTierHead, slot.equipUpgradeHead,
        slot.equipTierTorso, slot.equipUpgradeTorso,
        slot.equipTierArms, slot.equipUpgradeArms,
        slot.equipTierLegs, slot.equipUpgradeLegs,
        slot.collectionGrade,
        slot.collectionLevel,
    ]);

    // 계산된 스탯을 customHP/ATK/DEF에 동기화 (시뮬레이션 엔진에서 사용)
    useEffect(() => {
        if (!calculatedStats) return;
        const hp = String(calculatedStats.hp);
        const atk = String(calculatedStats.atk);
        const def = String(calculatedStats.def);
        if (hp !== slot.customHP || atk !== slot.customATK || def !== slot.customDEF) {
            onUpdate({ customHP: hp, customATK: atk, customDEF: def });
        }
    }, [calculatedStats]);

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
            {/* Header Identity (Avatar + Name) */}
            <div className="slot-header-identity" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '4px 0 8px 0' }}>
                <Avatar charId={data.characterID} alt={slot.char.label} size={80} ratio="1:1" />
                <div className="slot-identity">
                    <Font as="h3" variant="subtitle" weight="bold">
                        {slot.char.label || data.characterName}
                    </Font>
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
            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">소장품</span>
                <Chip
                    variant={slot.collectionGrade === 'SSR' ? 'core' : (slot.collectionGrade === 'SR' || slot.collectionGrade === 'R') ? 'limit-break' : 'default'}
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
                </Chip>

                <span className="color-777">소장품 레벨</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '80px' }}>
                    <Textfield
                        size="small"
                        type="number"
                        min={0}
                        max={15}
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
            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">큐브 레벨</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '80px' }}>
                    <Textfield
                        size="small"
                        type="number"
                        min={1}
                        max={15}
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
            <div className="slot-subtitle">스탯 (자동계산)</div>
            <div className="slot-section">
                <span className="color-777">체력</span>
                <span style={{ textAlign: 'right', fontSize: '13px', color: '#ccc' }}>
                    {calculatedStats ? calculatedStats.hp.toLocaleString() : formatNumber(slot.customHP)}
                </span>

                <span className="color-777">공격력</span>
                <span style={{ textAlign: 'right', fontSize: '13px', color: '#ccc' }}>
                    {calculatedStats ? calculatedStats.atk.toLocaleString() : formatNumber(slot.customATK)}
                </span>

                <span className="color-777">방어력</span>
                <span style={{ textAlign: 'right', fontSize: '13px', color: '#ccc' }}>
                    {calculatedStats ? calculatedStats.def.toLocaleString() : formatNumber(slot.customDEF)}
                </span>
            </div>

            {/* 돌파 및 호감도 */}
            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">돌파</span>
                <Chip
                    variant={currentGrowthStage === 0 ? 'default' : currentGrowthStage <= 3 ? 'limit-break' : 'core'}
                    onClick={(e) => {
                        e.preventDefault();
                        const maxStage = MAX_STAGE_BY_RARITY[charRarity] ?? 10;
                        const nextStage = currentGrowthStage >= maxStage ? 0 : currentGrowthStage + 1;
                        const newMaxAffinity = resolveGrowthStage(charRarity, charCompany, charName, nextStage).maxAffinity;
                        const currentAffinity = parseInt(slot.affinityLevel) || 1;
                        onUpdate({
                            growthStage: String(nextStage),
                            affinityLevel: String(Math.min(currentAffinity, newMaxAffinity))
                        });
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        const maxStage = MAX_STAGE_BY_RARITY[charRarity] ?? 10;
                        const prevStage = currentGrowthStage <= 0 ? maxStage : currentGrowthStage - 1;
                        const newMaxAffinity = resolveGrowthStage(charRarity, charCompany, charName, prevStage).maxAffinity;
                        const currentAffinity = parseInt(slot.affinityLevel) || 1;
                        onUpdate({
                            growthStage: String(prevStage),
                            affinityLevel: String(Math.min(currentAffinity, newMaxAffinity))
                        });
                    }}
                    title="좌클릭: 단계 증가 / 우클릭: 단계 감소"
                >
                    {growthStageLabel(currentGrowthStage)}
                </Chip>

                <span className="color-777">호감도</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100px' }}>
                    <Textfield
                        size="small"
                        type="number"
                        min={1}
                        max={maxAffinity}
                        value={slot.affinityLevel || '1'}
                        onChange={e => {
                            const v = Math.max(1, Math.min(maxAffinity, parseInt(e.target.value) || 1));
                            onUpdate({ affinityLevel: String(v) });
                        }}
                        suffix={`/ ${maxAffinity}`}
                    />
                </div>
            </div>

            {/* Equip Lines */}
            <div className="slot-subtitle">장비</div>

            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">머리</span>
                <select
                    className="slot-input"
                    value={slot.equipTierHead || 'none'}
                    onChange={e => onUpdate({ equipTierHead: e.target.value })}
                    style={{ background: 'transparent', cursor: 'pointer', color: '#ccc' }}
                >
                    {EQUIP_TIER_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#252525' }}>{opt.label}</option>)}
                </select>
                {(slot.equipTierHead === 'Overload' || slot.equipTierHead === '기업') && (
                    <div style={{ width: '80px' }}>
                        <Textfield
                            size="small"
                            type="number"
                            min={0}
                            max={5}
                            label={<Font variant="caption-2" color="muted">강화</Font>}
                            value={slot.equipUpgradeHead || '0'}
                            onChange={e => onUpdate({ equipUpgradeHead: String(Math.max(0, Math.min(5, parseInt(e.target.value) || 0))) })}
                        />
                    </div>
                )}
            </div>

            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">몸통</span>
                <select
                    className="slot-input"
                    value={slot.equipTierTorso || 'none'}
                    onChange={e => onUpdate({ equipTierTorso: e.target.value })}
                    style={{ background: 'transparent', cursor: 'pointer', color: '#ccc' }}
                >
                    {EQUIP_TIER_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#252525' }}>{opt.label}</option>)}
                </select>
                {(slot.equipTierTorso === 'Overload' || slot.equipTierTorso === '기업') && (
                    <div style={{ width: '80px' }}>
                        <Textfield
                            size="small"
                            type="number"
                            min={0}
                            max={5}
                            label={<Font variant="caption-2" color="muted">강화</Font>}
                            value={slot.equipUpgradeTorso || '0'}
                            onChange={e => onUpdate({ equipUpgradeTorso: String(Math.max(0, Math.min(5, parseInt(e.target.value) || 0))) })}
                        />
                    </div>
                )}
            </div>

            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">팔</span>
                <select
                    className="slot-input"
                    value={slot.equipTierArms || 'none'}
                    onChange={e => onUpdate({ equipTierArms: e.target.value })}
                    style={{ background: 'transparent', cursor: 'pointer', color: '#ccc' }}
                >
                    {EQUIP_TIER_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#252525' }}>{opt.label}</option>)}
                </select>
                {(slot.equipTierArms === 'Overload' || slot.equipTierArms === '기업') && (
                    <div style={{ width: '80px' }}>
                        <Textfield
                            size="small"
                            type="number"
                            min={0}
                            max={5}
                            label={<Font variant="caption-2" color="muted">강화</Font>}
                            value={slot.equipUpgradeArms || '0'}
                            onChange={e => onUpdate({ equipUpgradeArms: String(Math.max(0, Math.min(5, parseInt(e.target.value) || 0))) })}
                        />
                    </div>
                )}
            </div>

            <div className="slot-section" style={{ alignItems: 'center' }}>
                <span className="color-777">다리</span>
                <select
                    className="slot-input"
                    value={slot.equipTierLegs || 'none'}
                    onChange={e => onUpdate({ equipTierLegs: e.target.value })}
                    style={{ background: 'transparent', cursor: 'pointer', color: '#ccc' }}
                >
                    {EQUIP_TIER_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#252525' }}>{opt.label}</option>)}
                </select>
                {(slot.equipTierLegs === 'Overload' || slot.equipTierLegs === '기업') && (
                    <div style={{ width: '80px' }}>
                        <Textfield
                            size="small"
                            type="number"
                            min={0}
                            max={5}
                            label={<Font variant="caption-2" color="muted">강화</Font>}
                            value={slot.equipUpgradeLegs || '0'}
                            onChange={e => onUpdate({ equipUpgradeLegs: String(Math.max(0, Math.min(5, parseInt(e.target.value) || 0))) })}
                        />
                    </div>
                )}
            </div>

            {/* Overload Options */}
            <div className="slot-subtitle">오버로드 옵션</div>
            <Grid columns={3} gap={1} className="mb-3">
                {[
                    { id: 'equipWeakPoint', label: '우코', max: 116.64 },
                    { id: 'equipATK', label: '공격력', max: 58.52 },
                    { id: 'equipAmmo', label: '장탄', max: 341.48 },
                    { id: 'equipAccuracy', label: '명중률', max: 58.52 },
                    { id: 'equipChargeDmg', label: '차댐', max: 58.52 },
                    { id: 'equipChargeSpeed', label: '차속', max: 24.36 },
                    { id: 'equipCritRate', label: '크확', max: 28.28 },
                    { id: 'equipCritDmg', label: '크댐', max: 81.44 },
                    { id: 'equipDef', label: '방어력', max: 58.52 },
                ].map(opt => (
                    <Textfield
                        key={opt.id}
                        size="small"
                        label={<Font variant="caption-2" color="muted">{opt.label}</Font>}
                        value={slot[opt.id as keyof SlotState] || '0'}
                        onChange={e => handleEquipChange(opt.id as keyof SlotState, opt.max, e.target.value)}
                        suffix="%"
                    />
                ))}
            </Grid>

            {/* Skills */}
            <div className="slot-subtitle">스킬 레벨</div>
            <Grid columns={3} gap={1} ref={skillsRef}>
                <Textfield
                    size="small"
                    type="number"
                    min={1}
                    max={10}
                    label={<Font variant="caption-2" color="muted">스킬1</Font>}
                    value={slot.skill1Level || 10}
                    onChange={e => onUpdate({ skill1Level: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    onWheel={e => {
                        const current = slot.skill1Level || 10;
                        const delta = e.deltaY < 0 ? 1 : -1;
                        onUpdate({ skill1Level: Math.max(1, Math.min(10, current + delta)) });
                    }}
                />
                <Textfield
                    size="small"
                    type="number"
                    min={1}
                    max={10}
                    label={<Font variant="caption-2" color="muted">스킬2</Font>}
                    value={slot.skill2Level || 10}
                    onChange={e => onUpdate({ skill2Level: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    onWheel={e => {
                        const current = slot.skill2Level || 10;
                        const delta = e.deltaY < 0 ? 1 : -1;
                        onUpdate({ skill2Level: Math.max(1, Math.min(10, current + delta)) });
                    }}
                />
                <Textfield
                    size="small"
                    type="number"
                    min={1}
                    max={10}
                    label={<Font variant="caption-2" color="muted">버스트</Font>}
                    value={slot.burstLevel || 10}
                    onChange={e => onUpdate({ burstLevel: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    onWheel={e => {
                        const current = slot.burstLevel || 10;
                        const delta = e.deltaY < 0 ? 1 : -1;
                        onUpdate({ burstLevel: Math.max(1, Math.min(10, current + delta)) });
                    }}
                />
            </Grid>
        </div>
    );
};

export default CharacterSlot;
