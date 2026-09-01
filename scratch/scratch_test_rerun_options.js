import { runSimulation } from '../src/engine/simulationRunner.js';
import fs from 'fs';

const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const starAnisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

function makeSlot(charData, custom = {}) {
    return {
        char: { id: charData.characterID, label: charData.characterName, data: charData },
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10,
        customHP: '12000000',  // 예전 784레벨 잔존 레거시 값
        customATK: '275000',   // 예전 784레벨 잔존 레거시 값
        customDEF: '8000',     // 예전 784레벨 잔존 레거시 값
        equipTierHead: 'Overload',
        equipUpgradeHead: '5',
        equipTierTorso: 'Overload',
        equipUpgradeTorso: '5',
        equipTierArms: 'Overload',
        equipUpgradeArms: '5',
        equipTierLegs: 'Overload',
        equipUpgradeLegs: '5',
        equipWeakPoint: custom.equipWeakPoint || '0',
        equipATK: custom.equipATK || '0',
        equipAmmo: custom.equipAmmo || '0',
        equipAccuracy: '0',
        equipChargeDmg: '0',
        equipChargeSpeed: '0',
        equipCritRate: '0',
        equipCritDmg: '0',
        equipDef: '0',
        collectionGrade: 'None',
        collectionLevel: '0',
        cubeName: 'None',
        cubeLevel: '0',
        growthStage: '0',
        affinityLevel: '30',
    };
}

const baseSlots = [
    makeSlot(crownData),
    makeSlot(rapiData),
    makeSlot(starAnisData),
    makeSlot(miharaData),
    makeSlot(bridData),
];

const outpostNormal = {
    synchroLevel: '784',
    lockSynchro400: false,
    commonResearchLevel: '100',
    attackerResearchLevel: '100',
    defenderResearchLevel: '100',
    supporterResearchLevel: '100',
    elysionResearchLevel: '100',
    missilisResearchLevel: '100',
    tetraResearchLevel: '100',
    pilgrimResearchLevel: '100',
};

const outpostLock400 = {
    ...outpostNormal,
    lockSynchro400: true,
};

console.log('=== 1. 싱크로 784레벨 (400레벨 고정 OFF) ===');
const res784 = runSimulation({
    slots: baseSlots,
    enemyDef: '4000',
    fullBurstInterval: '2.5',
    rangeMode: 35,
    weaknessElement: '작열',
    outpostState: outpostNormal,
    showCore: true,
    coreSize: 52
});
console.log(`팀 총 딜량 (784): ${Math.round(res784.summary.teamTotal).toLocaleString()}`);
res784.summary.chars.forEach(c => console.log(`- ${c.charName.padEnd(20)}: ${Math.round(c.totalDmg).toLocaleString()}`));

console.log('\n=== 2. 400레벨 고정 스위치 ON 시뮬레이션 재실행 ===');
const res400 = runSimulation({
    slots: baseSlots,
    enemyDef: '4000',
    fullBurstInterval: '2.5',
    rangeMode: 35,
    weaknessElement: '작열',
    outpostState: outpostLock400,
    showCore: true,
    coreSize: 52
});
console.log(`팀 총 딜량 (400 고정): ${Math.round(res400.summary.teamTotal).toLocaleString()}`);
res400.summary.chars.forEach(c => console.log(`- ${c.charName.padEnd(20)}: ${Math.round(c.totalDmg).toLocaleString()}`));

console.log('\n=== 3. 오버로드 우코(100%) 옵션 변경 후 시뮬레이션 재실행 (400레벨 고정 상태) ===');
const slotsWithOverload = [
    makeSlot(crownData, { equipWeakPoint: '100' }),
    makeSlot(rapiData, { equipWeakPoint: '100' }),
    makeSlot(starAnisData, { equipWeakPoint: '100' }),
    makeSlot(miharaData, { equipWeakPoint: '100' }),
    makeSlot(bridData, { equipWeakPoint: '100' }),
];
const resOverload = runSimulation({
    slots: slotsWithOverload,
    enemyDef: '4000',
    fullBurstInterval: '2.5',
    rangeMode: 35,
    weaknessElement: '작열',
    outpostState: outpostLock400,
    showCore: true,
    coreSize: 52
});
console.log(`팀 총 딜량 (400 고정 + 우코 100%): ${Math.round(resOverload.summary.teamTotal).toLocaleString()}`);
resOverload.summary.chars.forEach(c => console.log(`- ${c.charName.padEnd(20)}: ${Math.round(c.totalDmg).toLocaleString()}`));
