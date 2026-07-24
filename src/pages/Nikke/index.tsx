import React, { useState, useEffect } from 'react';
import { Textfield } from '../../components/Textfield/Textfield';
import Font from '../../components/Font';
import { Icon } from '../../components/Icon/Icon';
import {
    loadOutpostState,
    saveOutpostState,
    SavedOutpostState,
    loadAllCharSettings,
    saveCharSettings,
    SavedCharState
} from '../../utils/storageUtils';
import { characterOptions } from '../../constants/characters';

const cubeList = [
    { value: 'None', label: '장착 해제' },
    { value: '01-cube-assault', label: '어썰트' },
    { value: '02-cube-onslaught', label: '택티컬 어설트' },
    { value: '03-cube-resilience', label: '렐릭 베어' },
    { value: '04-cube-bastion', label: '택티컬 베어' },
    { value: '05-cube-adjutant', label: '렐릭 부스트' },
    { value: '06-cube-wingman', label: '택티컬 부스트' },
    { value: '07-cube-quantum', label: '렐릭 퀀텀' },
    { value: '08-cube-vigor', label: '렐릭 비고르' },
    { value: '09-cube-endurance', label: '렐릭 인듀어' },
    { value: '10-cube-healing', label: '렐릭 힐링' },
    { value: '11-cube-tempering', label: '렐릭 템퍼링' },
    { value: '12-cube-assist', label: '렐릭 어시스터' },
    { value: '13-cube-destruction', label: '렐릭 디스트로이' },
    { value: '14-cube-piercing', label: '렐릭 피어싱' },
    { value: '15-cube-crash', label: '렐릭 크래시' }
];

const OVERLOAD_MAX: Partial<Record<keyof SavedCharState, number>> = {
    equipWeakPoint: 116.64,
    equipAccuracy: 58.52,
    equipAmmo: 341.48,
    equipATK: 58.52,
    equipChargeDmg: 58.52,
    equipChargeSpeed: 24.36,
    equipCritRate: 28.28,
    equipCritDmg: 81.44,
    equipDef: 58.52
};

const cubeImageModules = import.meta.glob('../../assets/cube/*.webp', {
    eager: true,
    query: '?url',
    import: 'default'
}) as Record<string, string>;

const Nikke: React.FC = () => {
    const [outpostState, setOutpostState] = useState<SavedOutpostState>(loadOutpostState());
    const [nikkeStates, setNikkeStates] = useState<Record<string, SavedCharState>>(loadAllCharSettings());

    useEffect(() => {
        saveOutpostState(outpostState);
    }, [outpostState]);

    const handleOutpostChange = (field: keyof SavedOutpostState, value: string) => {
        setOutpostState(prev => ({ ...prev, [field]: value }));
    };

    const handleNikkeChange = (charId: string, field: keyof SavedCharState, value: any) => {
        let processedValue = value;
        if (typeof value === 'string' && OVERLOAD_MAX[field]) {
            const maxVal = OVERLOAD_MAX[field]!;
            const num = parseFloat(value);
            if (!isNaN(num) && num > maxVal) {
                processedValue = maxVal.toString();
            }
        }

        setNikkeStates(prev => {
            const newState = {
                ...prev,
                [charId]: {
                    ...(prev[charId] || {}),
                    [field]: processedValue
                }
            };
            saveCharSettings(charId, newState[charId]);
            return newState;
        });
    };

    const renderCubeOption = (charId: string, currentState: SavedCharState) => {
        const selectedCube = currentState.cubeName || '03-cube-resilience';
        const imgKey = Object.keys(cubeImageModules).find(k => k.includes(selectedCube));
        const imgSrc = imgKey ? cubeImageModules[imgKey] : '';
        
        return (
            <div style={{ position: 'relative', width: '64px' }}>
                <Textfield 
                    size="small"
                    value=""
                    readOnly
                    leftElement={imgSrc && <img src={imgSrc} alt="cube" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />}
                    rightElement={<Icon name="keyboard_arrow_down" size={16} color="var(--Font-Default)" />}
                    style={{ cursor: 'pointer', caretColor: 'transparent', padding: '0 4px', width: '0px' }} // Hide text entirely, just padding for icons
                />
                <select 
                    value={selectedCube}
                    onChange={(e) => handleNikkeChange(charId, 'cubeName', e.target.value)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                >
                    {cubeList.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--Divider-Normal)' }}>
                <Font variant="display-3" weight="bold">Nikke Information</Font>
                <div style={{ marginTop: '8px' }}>
                    <Font variant="body" color="muted">니케 및 전초기지 정보를 로컬에 저장하고 관리합니다.</Font>
                </div>
            </div>

            <section>
                <Font variant="heading-2" weight="bold">전초기지 (Outpost)</Font>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                    <Textfield
                        label="싱크로 레벨"
                        value={outpostState.synchroLevel}
                        onChange={(e) => handleOutpostChange('synchroLevel', e.target.value)}
                        placeholder="0"
                    />
                    <Textfield
                        label="공통 연구 레벨"
                        value={outpostState.commonResearchLevel}
                        onChange={(e) => handleOutpostChange('commonResearchLevel', e.target.value)}
                        placeholder="0"
                    />
                </div>

                <div style={{ marginTop: '24px' }}>
                    <Font variant="heading-3" weight="semibold">기업별 콘솔 레벨</Font>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
                        <Textfield label="엘리시온 (Elysion)" value={outpostState.elysionConsole} onChange={(e) => handleOutpostChange('elysionConsole', e.target.value)} placeholder="0" />
                        <Textfield label="미실리스 (Missilis)" value={outpostState.missilisConsole} onChange={(e) => handleOutpostChange('missilisConsole', e.target.value)} placeholder="0" />
                        <Textfield label="테트라 (Tetra)" value={outpostState.tetraConsole} onChange={(e) => handleOutpostChange('tetraConsole', e.target.value)} placeholder="0" />
                        <Textfield label="필그림 (Pilgrim)" value={outpostState.pilgrimConsole} onChange={(e) => handleOutpostChange('pilgrimConsole', e.target.value)} placeholder="0" />
                        <Textfield label="어브노말 (Abnormal)" value={outpostState.abnormalConsole} onChange={(e) => handleOutpostChange('abnormalConsole', e.target.value)} placeholder="0" />
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <Font variant="heading-3" weight="semibold">Class별 콘솔 레벨</Font>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
                        <Textfield label="화력형 (Attacker)" value={outpostState.attackerConsole} onChange={(e) => handleOutpostChange('attackerConsole', e.target.value)} placeholder="0" />
                        <Textfield label="방어형 (Defender)" value={outpostState.defenderConsole} onChange={(e) => handleOutpostChange('defenderConsole', e.target.value)} placeholder="0" />
                        <Textfield label="지원형 (Supporter)" value={outpostState.supporterConsole} onChange={(e) => handleOutpostChange('supporterConsole', e.target.value)} placeholder="0" />
                    </div>
                </div>
            </section>

            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Font variant="heading-2" weight="bold">니케 (Nikke)</Font>
                    <div style={{ background: 'var(--Primary-24)', padding: '2px 8px', borderRadius: '12px' }}>
                        <Font variant="caption-1" weight="bold" style={{ color: 'var(--Primary-100)' }}>{characterOptions.length}</Font>
                    </div>
                </div>
                
                <div style={{ marginTop: '16px', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', background: 'var(--Background-Card)', borderRadius: '8px', border: '1px solid var(--Divider-Normal)' }}>
                    <table style={{ borderCollapse: 'collapse', textAlign: 'left', minWidth: 'max-content' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">이름</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', background: 'var(--Background-Header)', width: '80px' }}><Font variant="caption-1" weight="semibold">큐브</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '120px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">체력 (HP)</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '120px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">공격력 (ATK)</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '120px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">방어력 (DEF)</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">우월코드</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">명중률</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">장탄</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">공격력</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">차댐</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">차속</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">크확</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">크댐</Font></th>
                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--Divider-Normal)', width: '110px', background: 'var(--Background-Header)' }}><Font variant="caption-1" weight="semibold">방어력</Font></th>
                            </tr>
                        </thead>
                        <tbody>
                            {characterOptions.map((option, idx) => {
                                const charId = option.data.characterID;
                                const state = nikkeStates[charId] || {};
                                return (
                                    <tr key={charId} style={{ borderBottom: idx !== characterOptions.length - 1 ? '1px solid var(--Divider-Normal)' : 'none' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <Font variant="body" weight="medium">{option.label}</Font>
                                        </td>
                                        <td style={{ padding: '8px 16px' }}>
                                            {renderCubeOption(charId, state)}
                                        </td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.customHP || ''} onChange={(e) => handleNikkeChange(charId, 'customHP', e.target.value)} placeholder={option.data.stats?.hp?.toString() || '0'} /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.customATK || ''} onChange={(e) => handleNikkeChange(charId, 'customATK', e.target.value)} placeholder={option.data.stats?.atk?.toString() || '0'} /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.customDEF || ''} onChange={(e) => handleNikkeChange(charId, 'customDEF', e.target.value)} placeholder={option.data.stats?.defense?.toString() || '0'} /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipWeakPoint || ''} onChange={(e) => handleNikkeChange(charId, 'equipWeakPoint', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipAccuracy || ''} onChange={(e) => handleNikkeChange(charId, 'equipAccuracy', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipAmmo || ''} onChange={(e) => handleNikkeChange(charId, 'equipAmmo', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipATK || ''} onChange={(e) => handleNikkeChange(charId, 'equipATK', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipChargeDmg || ''} onChange={(e) => handleNikkeChange(charId, 'equipChargeDmg', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipChargeSpeed || ''} onChange={(e) => handleNikkeChange(charId, 'equipChargeSpeed', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipCritRate || ''} onChange={(e) => handleNikkeChange(charId, 'equipCritRate', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipCritDmg || ''} onChange={(e) => handleNikkeChange(charId, 'equipCritDmg', e.target.value)} placeholder="0" suffix="%" /></td>
                                        <td style={{ padding: '8px 16px' }}><Textfield size="small" value={state.equipDef || ''} onChange={(e) => handleNikkeChange(charId, 'equipDef', e.target.value)} placeholder="0" suffix="%" /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Nikke;
