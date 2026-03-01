import React, { useState } from 'react';
import { simulateBattle } from '../engine/battleEngine';
import { Team, SimConfig } from '../types/battle';
import { applyBaseStats, EquipmentOptions, checkAdvantage } from '../utils/charUtils';
import { generateChartData, calcHitDamages } from '../utils/simUtils';
import iconAnmi from '../assets/icon/code-anmi.svg';
import iconDmtr from '../assets/icon/code-dmtr.svg';
import iconHsta from '../assets/icon/code-hsta.svg';
import iconPsid from '../assets/icon/code-psid.svg';
import iconZeus from '../assets/icon/code-zeus.svg';
import { SlotState, SimResult } from '../types/simulator';
import { characterOptions, SLOT_COLORS } from '../constants/characters';
import { RangeMode, getWeaponRangeBonus } from '../constants/weaponStats';
import { getCollectionEffect } from '../constants/collectionItems';
import CharacterSlot from '../components/CharacterSlot';
import ResultSummary from '../components/ResultSummary';
import DualChart from '../components/DualChart';

function createDefaultSlot(charOption = characterOptions[0]): SlotState {
    const stats = charOption.data.stats;
    return {
        char: charOption,
        customHP: String(stats.hp || ''),
        customATK: String(stats.atk || ''),
        customDEF: String(stats.defense || ''),
        collectionGrade: 'None',
        collectionLevel: '0',
        equipATK: '0', equipWeakPoint: '0', equipAmmo: '0'
    };
}

const Home: React.FC = () => {
    const [slots, setSlots] = useState<SlotState[]>([createDefaultSlot()]);
    const [simResult, setSimResult] = useState<SimResult | null>(null);
    const [noCoreDatasets, setNoCoreDatasets] = useState<any[]>([]);
    const [withCoreDatasets, setWithCoreDatasets] = useState<any[]>([]);
    const [enemyDef, setEnemyDef] = useState<string>('100');
    const [rangeMode, setRangeMode] = useState<RangeMode>('mid');
    const [weaknessElement, setWeaknessElement] = useState<string>('작열');

    const ELEMENT_OPTIONS = [
        { value: '풍압', label: '풍압', icon: iconAnmi },
        { value: '철갑', label: '철갑', icon: iconDmtr },
        { value: '작열', label: '작열', icon: iconHsta },
        { value: '수냉', label: '수냉', icon: iconPsid },
        { value: '전격', label: '전격', icon: iconZeus },
    ];

    const RANGE_OPTIONS: { value: RangeMode; label: string; weapons: string }[] = [
        { value: 'near', label: 'Near', weapons: 'SG · SMG' },
        { value: 'mid', label: 'Mid', weapons: 'AR · MG' },
        { value: 'far', label: 'Far', weapons: 'SR' },
    ];

    const addSlot = () => {
        if (slots.length < 5) setSlots([...slots, createDefaultSlot()]);
    };

    const removeSlot = (idx: number) => {
        if (slots.length > 1) setSlots(slots.filter((_, i) => i !== idx));
    };

    const updateSlot = (idx: number, patch: Partial<SlotState>) =>
        setSlots(slots.map((s, i) => i === idx ? { ...s, ...patch } : s));

    const handleSimulate = () => {
        const config: SimConfig = { duration: 180, tick: 0.016, seed: 42 };
        const ENEMY = { hp: 1_000_000_000, defense: Math.max(0, parseInt(enemyDef || '0', 10)), element: weaknessElement };

        const buildTeam = (includeCore: boolean): Team => ({
            members: slots.map(slot => {
                const eq: EquipmentOptions = {
                    atkPercent: parseFloat(slot.equipATK || '0') / 100,
                    weakPointPercent: parseFloat(slot.equipWeakPoint || '0') / 100,
                    ammoPercent: parseFloat(slot.equipAmmo || '0') / 100,
                };
                const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10);
                const char = applyBaseStats(slot.char.data, includeCore, eq, slot.collectionGrade, collectionLevelNum);
                const customHP = parseInt(slot.customHP || '0', 10);
                if (customHP > 0) char.hp = customHP;
                const customATK = parseInt(slot.customATK || '0', 10);
                if (customATK > 0) char.atk = customATK;
                const customDEF = parseInt(slot.customDEF || '0', 10);
                if (customDEF > 0) char.defense = customDEF;

                // 거리 보너스 적용
                const rb = getWeaponRangeBonus(char.weapon, rangeMode);
                if (rb > 0) char.buff = { ...(char.buff || {}), range: rb };
                return char;
            }),
        });

        const resultNoCore = simulateBattle(buildTeam(false), { ...ENEMY }, config);
        const resultWithCore = simulateBattle(buildTeam(true), { ...ENEMY }, config);

        const extractChars = (result: typeof resultNoCore) =>
            slots.map(slot => {
                const charId = slot.char.data.characterID;
                const DAMAGE_TYPES = new Set(['attack', 'skill_damage']);
                const totalDmg = result.log
                    .filter((l: any) => DAMAGE_TYPES.has(l.type) && l.source === charId)
                    .reduce((s: number, l: any) => s + (l.value || 0), 0);

                // 단발 타격 유형별 데미지 계산
                const charStats = slot.char.data.stats || {};
                const customATK = parseInt(slot.customATK || '0', 10);
                const atkPercent = parseFloat(slot.equipATK || '0') / 100;
                const weakPercent = parseFloat(slot.equipWeakPoint || '0') / 100;
                const isWeak = checkAdvantage(ENEMY.element, charStats.element);

                const collectionLevelNum = parseInt(slot.collectionLevel || '0', 10);
                const collectionEffect = getCollectionEffect(charStats.weapon, slot.collectionGrade, collectionLevelNum);

                // 영구 적 디버프(받는 대미지 증가) 합산 — enemy_spawn 트리거의 bubble 등
                let enemyTakenUp = 0;
                const skills = slot.char.data.skills || [];
                for (const skill of skills) {
                    for (const eff of (skill.effects || []) as any[]) {
                        if (eff.trigger === 'enemy_spawn' && eff.target === 'enemy' && eff.value && eff.duration === 'permanent') {
                            enemyTakenUp += eff.value / 100;
                        }
                    }
                }

                const hitDamages = calcHitDamages({
                    atk: customATK > 0 ? customATK : charStats.atk,
                    atkCoef: (charStats.atkCoef || 0) / 100,
                    weapon: charStats.weapon,
                    equipATKPercent: atkPercent,
                    equipWeakPointPercent: weakPercent,
                    normalAtkMultiplier: collectionEffect.normalAtkMultiplier,
                    coreDamage: 'coreDamage' in charStats ? charStats.coreDamage as number : undefined,
                    critMult: 'critMult' in charStats ? charStats.critMult as number : undefined
                }, ENEMY.defense, rangeMode, isWeak, enemyTakenUp);

                return { charId, charName: slot.char.data.characterName, totalDmg, hitDamages };
            });

        const sumDamage = (result: typeof resultNoCore) => {
            const DAMAGE_TYPES = new Set(['attack', 'skill_damage']);
            return result.log
                .filter((l: any) => DAMAGE_TYPES.has(l.type))
                .reduce((s: number, l: any) => s + l.value, 0);
        };

        const noCoreTotal = sumDamage(resultNoCore);
        const withCoreTotal = sumDamage(resultWithCore);

        setSimResult({
            noCore: { chars: extractChars(resultNoCore), teamTotal: noCoreTotal },
            withCore: { chars: extractChars(resultWithCore), teamTotal: withCoreTotal },
        });

        // 차트 데이터셋 구성
        const dsNoCore: any[] = [];
        const dsWithCore: any[] = [];

        slots.forEach((slot, idx) => {
            const charId = slot.char.data.characterID;
            const charName = slot.char.data.characterName;
            const color = SLOT_COLORS[idx % SLOT_COLORS.length];
            dsNoCore.push({ label: charName, color, lineWidth: 1.5, data: generateChartData(resultNoCore, config.duration, charId) });
            dsWithCore.push({ label: charName, color, lineWidth: 1.5, data: generateChartData(resultWithCore, config.duration, charId) });
        });

        if (slots.length > 1) {
            dsNoCore.push({ label: '★ Team Total', color: '#ffffff', lineWidth: 2.5, data: generateChartData(resultNoCore, config.duration) });
            dsWithCore.push({ label: '★ Team Total', color: '#ffd700', lineWidth: 2.5, data: generateChartData(resultWithCore, config.duration) });
        }

        setNoCoreDatasets(dsNoCore);
        setWithCoreDatasets(dsWithCore);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#0f0f1a', minHeight: '100vh', color: '#e0e0e0' }}>
            <h1 style={{ color: '#e0e0e0', marginBottom: '20px' }}>Nikke Damage Simulator</h1>

            {/* 캐릭터 슬롯 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {slots.map((slot, idx) => (
                    <CharacterSlot
                        key={idx}
                        slot={slot}
                        index={idx}
                        canRemove={slots.length > 1}
                        onUpdate={(patch) => updateSlot(idx, patch)}
                        onRemove={() => removeSlot(idx)}
                    />
                ))}
            </div>

            {/* 액션 영역: 버튼 + 적 방어력 입력 */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                    onClick={addSlot}
                    disabled={slots.length >= 5}
                    style={{
                        padding: '10px 18px', fontSize: '14px',
                        background: slots.length >= 5 ? '#2a2a2a' : '#1e3a1e',
                        color: slots.length >= 5 ? '#555' : '#52c41a',
                        border: `1px solid ${slots.length >= 5 ? '#333' : '#52c41a'}`,
                        borderRadius: '5px', cursor: slots.length >= 5 ? 'not-allowed' : 'pointer',
                    }}
                >
                    + 캐릭터 추가 ({slots.length}/5)
                </button>
                <button
                    onClick={handleSimulate}
                    style={{
                        padding: '10px 24px', fontSize: '16px',
                        background: '#007bff', color: 'white',
                        border: 'none', borderRadius: '5px', cursor: 'pointer',
                    }}
                >
                    Simulate (3 Mins)
                </button>

                {/* 거리 슬라이더 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 14px', background: '#1e1e2e',
                    borderRadius: '6px', border: '1px solid #555',
                    marginLeft: 'auto',
                }}>
                    <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>🎯 교전 거리</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <input
                            type="range" min={0} max={2}
                            value={RANGE_OPTIONS.findIndex(o => o.value === rangeMode)}
                            onChange={e => setRangeMode(RANGE_OPTIONS[+e.target.value].value)}
                            style={{ width: '120px', accentColor: '#60a5fa', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '120px' }}>
                            {RANGE_OPTIONS.map(opt => (
                                <button key={opt.value}
                                    onClick={() => setRangeMode(opt.value)}
                                    style={{
                                        fontSize: '10px', padding: '1px 4px',
                                        background: rangeMode === opt.value ? '#3b82f660' : 'transparent',
                                        color: rangeMode === opt.value ? '#60a5fa' : '#666',
                                        border: rangeMode === opt.value ? '1px solid #3b82f6' : '1px solid #444',
                                        borderRadius: '3px', cursor: 'pointer',
                                    }}
                                >{opt.label}</button>
                            ))}
                        </div>
                    </div>
                    <span style={{ color: '#60a5fa', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        +30%&nbsp;→&nbsp;{RANGE_OPTIONS.find(o => o.value === rangeMode)?.weapons}
                    </span>
                </div>

                {/* 약점 속성 선택 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', background: '#1e1e2e',
                    borderRadius: '6px', border: '1px solid #444',
                    marginLeft: '8px'
                }}>
                    <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap', marginRight: '4px' }}>약점 속성</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                        {ELEMENT_OPTIONS.map(opt => (
                            <button key={opt.value}
                                onClick={() => setWeaknessElement(opt.value)}
                                style={{
                                    width: '32px', height: '32px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: weaknessElement === opt.value ? '#3b82f660' : 'transparent',
                                    border: weaknessElement === opt.value ? '1px solid #3b82f6' : '1px solid transparent',
                                    borderRadius: '4px', cursor: 'pointer'
                                }}
                                title={opt.label}
                            >
                                <img src={opt.icon} alt={opt.label} style={{ width: '24px', height: '24px' }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 적 방어력 입력 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', background: '#1e1e2e',
                    borderRadius: '6px', border: '1px solid #444',
                    marginLeft: '8px',
                }}>
                    <span style={{ color: '#aaa', fontSize: '13px', whiteSpace: 'nowrap' }}>🛡️ 적 방어력</span>
                    <input
                        type="number"
                        value={enemyDef}
                        onChange={e => setEnemyDef(e.target.value)}
                        min={0}
                        style={{
                            width: '90px', padding: '5px 8px', fontSize: '14px',
                            background: '#0f0f1a', color: '#e0e0e0',
                            border: '1px solid #555', borderRadius: '4px',
                            textAlign: 'right',
                        }}
                    />
                </div>
            </div>

            {/* 결과 요약 */}
            {simResult && (
                <ResultSummary
                    noCore={simResult.noCore}
                    withCore={simResult.withCore}
                    showTeamTotal={slots.length > 1}
                />
            )}

            {/* 두 개 차트 */}
            <DualChart
                noCoreDatasets={noCoreDatasets}
                withCoreDatasets={withCoreDatasets}
            />
        </div>
    );
};

export default Home;
