import React, { useState, useEffect } from 'react';
import { Textfield } from '../../components/Textfield/Textfield';
import Font from '../../components/Font';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { DataTable } from '../../components/DataTable/DataTable';
import {
    loadOutpostState,
    saveOutpostState,
    SavedOutpostState,
    loadAllCharSettings,
    saveCharSettings,
    SavedCharState
} from '../../utils/storageUtils';
import { characterOptions } from '../../constants/characters';
import GlobalLevelPanel from '../home/GlobalLevelPanel';
import { OutpostCard } from '../../components/OutpostCard/OutpostCard';
import { Card } from '../../components/Card/Card';
import { Grid } from '../../components/Layout/Grid';
import { Chip } from '../../components/Chip/Chip';
import {
    calculateBaseStat,
    getClassConsoleLevel,
    getCorpConsoleLevel,
    resolveGrowthStage,
    growthStageLabel,
    MAX_STAGE_BY_RARITY
} from '../../engine/baseStat';

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
    { value: '15-cube-crash', label: '렐릭 크래시' },
    { value: '16-cube-divide', label: '렐릭 디바이드' }
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

    const handleOutpostChange = (patch: Partial<SavedOutpostState>) => {
        setOutpostState(prev => ({ ...prev, ...patch }));
    };

    const handleNikkeChange = (charId: string, field: keyof SavedCharState, value: any) => {
        let processedValue = value;
        if (typeof value === 'string') {
            if (field !== 'cubeName' && field !== 'growthStage') {
                // 숫자와 소수점만 허용
                processedValue = processedValue.replace(/[^0-9.]/g, '');

                // 소수점이 여러 개 입력되는 것 방지
                const parts = processedValue.split('.');
                if (parts.length > 2) {
                    processedValue = parts[0] + '.' + parts.slice(1).join('');
                }
            }

            if (OVERLOAD_MAX[field]) {
                const maxVal = OVERLOAD_MAX[field]!;
                const num = parseFloat(processedValue);
                if (!isNaN(num) && num > maxVal) {
                    processedValue = maxVal.toString();
                }
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

    const getRowCalculatedStats = (row: any, state: SavedCharState) => {
        const charData = row.data;
        const charStats = charData.stats || {};
        const charName = charData.characterName || charData.name || row.label || '';
        const charRarity = charStats.rarity || 'SSR';
        const charCompany = charStats.company || 'Elysion';
        const maxStage = MAX_STAGE_BY_RARITY[charRarity] ?? 10;
        const currentGrowthStage = Math.min(parseInt(state.growthStage || '0', 10) || 0, maxStage);
        const { maxAffinity } = resolveGrowthStage(charRarity, charCompany, charName, currentGrowthStage);

        const synchroLevel = parseInt(outpostState.synchroLevel) || 1;
        const commonConsoleLevel = parseInt(outpostState.commonResearchLevel) || 0;
        const classConsoleLevel = getClassConsoleLevel(charStats.class, outpostState);
        const corpConsoleLevel = getCorpConsoleLevel(charStats.company, outpostState);

        return calculateBaseStat({
            classType: charStats.class,
            weaponType: charStats.weapon,
            level: synchroLevel,
            affinityLevel: Math.min(parseInt(state.affinityLevel || '10', 10) || 1, maxAffinity),
            growthStage: currentGrowthStage,
            rarity: charRarity,
            company: charCompany,
            charName,
            commonConsoleLevel,
            classConsoleLevel,
            corpConsoleLevel,
            cubeLevel: parseInt(state.cubeLevel || '0', 10) || 0,
            equipTierHead: state.equipTierHead || 'none',
            equipUpgradeHead: parseInt(state.equipUpgradeHead || '0', 10) || 0,
            equipTierTorso: state.equipTierTorso || 'none',
            equipUpgradeTorso: parseInt(state.equipUpgradeTorso || '0', 10) || 0,
            equipTierArms: state.equipTierArms || 'none',
            equipUpgradeArms: parseInt(state.equipUpgradeArms || '0', 10) || 0,
            equipTierLegs: state.equipTierLegs || 'none',
            equipUpgradeLegs: parseInt(state.equipUpgradeLegs || '0', 10) || 0,
            collectionGrade: state.collectionGrade || 'None',
            collectionLevel: parseInt(state.collectionLevel || '0', 10) || 0,
        });
    };

    return (
        <Grid columns={1}>
            {/* 1. Header */}
            <div className="pb-2">
                <Font variant="heading-3" weight="medium" as="h1">Nikke Information</Font>
                <Font variant="caption-1" color="muted">니케 및 전초기지 정보를 로컬에 저장하고 관리합니다.</Font>
            </div>

            {/* 2. 전초기지 레벨 패널 */}
            <OutpostCard>
                <GlobalLevelPanel
                    outpostState={outpostState}
                    onChange={handleOutpostChange}
                />
            </OutpostCard>

            {/* 3. 니케 목록 */}
            <Card as="section" style={{ minHeight: '500px' }}>
                <Grid templateColumns="auto auto" gap={1} alignItems="center" className="pa-2" justifyContent="start">
                    <Font variant="subtitle" weight="bold">니케 (Nikke)</Font>
                    <Chip variant="limit-break" disabled>{characterOptions.length}</Chip>
                </Grid>
                <DataTable
                    data={characterOptions}
                    keyExtractor={(row) => row.data.characterID}
                    maxHeight="calc(100vh - 200px)"
                    columns={[
                        {
                            id: 'name',
                            header: <Font variant="caption-1" weight="semibold">이름</Font>,
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Avatar charId={charId} size={32} />
                                        <Font variant="body" weight="medium">{row.label}</Font>
                                    </div>
                                );
                            }
                        },
                        {
                            id: 'growthStage',
                            header: <Font variant="caption-1" weight="semibold">돌파 / 코강</Font>,
                            width: '90px',
                            narrow: true,
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                const state = nikkeStates[charId] || {};
                                const charRarity = row.data.stats?.rarity || 'SSR';
                                const maxStage = MAX_STAGE_BY_RARITY[charRarity] ?? 10;
                                const currentStage = Math.min(parseInt(state.growthStage || '0', 10) || 0, maxStage);
                                const label = growthStageLabel(currentStage);
                                const variant = currentStage === 0 ? 'default' : currentStage <= 3 ? 'limit-break' : 'core';

                                const handleClick = (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    const nextStage = currentStage >= maxStage ? 0 : currentStage + 1;
                                    handleNikkeChange(charId, 'growthStage', String(nextStage));
                                };

                                const handleContextMenu = (e: React.MouseEvent) => {
                                    e.preventDefault();
                                    const prevStage = currentStage <= 0 ? maxStage : currentStage - 1;
                                    handleNikkeChange(charId, 'growthStage', String(prevStage));
                                };

                                return (
                                    <Chip
                                        variant={variant}
                                        onClick={handleClick}
                                        onContextMenu={handleContextMenu}
                                        title="좌클릭: 증가 / 우클릭: 감소"
                                    >
                                        {label}
                                    </Chip>
                                );
                            }
                        },
                        {
                            id: 'cube',
                            header: <Font variant="caption-1" weight="semibold">큐브</Font>,
                            width: '90px',
                            narrow: true,
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                const state = nikkeStates[charId] || {};
                                const selectedCube = state.cubeName || '03-cube-resilience';
                                const imgKey = Object.keys(cubeImageModules).find(k => k.includes(selectedCube));
                                const imgSrc = imgKey ? cubeImageModules[imgKey] : '';
                                return (
                                    <div style={{ position: 'relative', width: '100%', height: '36px' }}>
                                        <Textfield
                                            size="small"
                                            value=""
                                            onChange={() => { }}
                                            leftElement={imgSrc && <img src={imgSrc} alt="cube" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />}
                                            rightElement={<Icon name="keyboard_arrow_down" size={16} color="var(--Font-Default)" />}
                                            style={{ cursor: 'pointer', caretColor: 'transparent', padding: '0', width: '0px' }} // Hide text entirely
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
                            }
                        },
                        {
                            id: 'hp',
                            header: <Font variant="caption-1" weight="semibold">체력 (HP)</Font>,
                            width: '120px',
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                const state = nikkeStates[charId] || {};
                                const calc = getRowCalculatedStats(row, state);
                                return (
                                    <Textfield
                                        size="small"
                                        value={String(calc.hp)}
                                        readOnly
                                    />
                                );
                            }
                        },
                        {
                            id: 'atk',
                            header: <Font variant="caption-1" weight="semibold">공격력 (ATK)</Font>,
                            width: '120px',
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                const state = nikkeStates[charId] || {};
                                const calc = getRowCalculatedStats(row, state);
                                return (
                                    <Textfield
                                        size="small"
                                        value={String(calc.atk)}
                                        readOnly
                                    />
                                );
                            }
                        },
                        {
                            id: 'def',
                            header: <Font variant="caption-1" weight="semibold">방어력 (DEF)</Font>,
                            width: '120px',
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                const state = nikkeStates[charId] || {};
                                const calc = getRowCalculatedStats(row, state);
                                return (
                                    <Textfield
                                        size="small"
                                        value={String(calc.def)}
                                        readOnly
                                    />
                                );
                            }
                        },
                        ...[
                            { id: 'equipWeakPoint', label: '우월코드' },
                            { id: 'equipAccuracy', label: '명중률' },
                            { id: 'equipAmmo', label: '장탄' },
                            { id: 'equipATK', label: '공격력' },
                            { id: 'equipChargeDmg', label: '차댐' },
                            { id: 'equipChargeSpeed', label: '차속' },
                            { id: 'equipCritRate', label: '크확' },
                            { id: 'equipCritDmg', label: '크댐' },
                            { id: 'equipDef', label: '방어력' }
                        ].map(opt => ({
                            id: opt.id,
                            header: <Font variant="caption-1" weight="semibold">{opt.label}</Font>,
                            width: '85px',
                            narrow: true,
                            cell: (row: any) => {
                                const charId = row.data.characterID;
                                const state = nikkeStates[charId] || {};
                                return <Textfield size="small" value={state[opt.id as keyof SavedCharState] || ''} onChange={(e) => handleNikkeChange(charId, opt.id as keyof SavedCharState, e.target.value)} placeholder="0" suffix="%" />;
                            }
                        }))
                    ]}
                />

            </Card>
        </Grid>
    );
};

export default Nikke;

