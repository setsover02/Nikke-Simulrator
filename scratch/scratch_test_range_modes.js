import { runSimulation } from '../src/engine/simulationRunner.js';
import fs from 'fs';

const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const starAnisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

function makeSlot(charData) {
    return {
        char: { id: charData.characterID, label: charData.characterName, data: charData },
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10,
        equipTierHead: 'none',
        equipUpgradeHead: '0',
        equipTierTorso: 'none',
        equipUpgradeTorso: '0',
        equipTierArms: 'none',
        equipUpgradeArms: '0',
        equipTierLegs: 'none',
        equipUpgradeLegs: '0',
        equipWeakPoint: '0',
        equipATK: '0',
        equipAmmo: '0',
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
    makeSlot(crownData),    // MG (수혜: 35, 45, 55)
    makeSlot(rapiData),     // SR (수혜: 45, 55, 100)
    makeSlot(starAnisData), // RL (수혜: 없음)
    makeSlot(miharaData),   // SMG (수혜: 15, 25, 35)
    makeSlot(bridData),     // SG (수혜: 0, 15, 25)
];

const outpostState = {
    synchroLevel: '400',
    lockSynchro400: true,
    commonResearchLevel: '100',
    attackerResearchLevel: '100',
    defenderResearchLevel: '100',
    supporterResearchLevel: '100',
    elysionResearchLevel: '100',
    missilisResearchLevel: '100',
    tetraResearchLevel: '100',
    pilgrimResearchLevel: '100',
};

const rangeModes = [0, 15, 25, 35, 45, 55, 100];

console.log('=== 교전 거리(RangeMode)별 대미지 변동 실측 테스트 ===\n');

rangeModes.forEach(rm => {
    const res = runSimulation({
        slots: baseSlots,
        enemyDef: '4000',
        fullBurstInterval: '2.5',
        rangeMode: rm,
        weaknessElement: '작열',
        outpostState,
        showCore: true,
        coreSize: 52
    });
    console.log(`[교전 거리: ${rm.toString().padStart(3)}] Team Total = ${Math.round(res.summary.teamTotal).toLocaleString()}`);
    res.summary.chars.forEach(c => {
        console.log(`  - ${c.charName.padEnd(20)}: ${Math.round(c.totalDmg).toLocaleString()}`);
    });
    console.log('');
});
