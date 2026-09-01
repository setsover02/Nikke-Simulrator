import { simulateBattle } from '../src/engine/battleEngine.js';
import { applyBaseStats } from '../src/utils/charUtils.js';
import { calculateBaseStat } from '../src/engine/baseStat.js';
import fs from 'fs';

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const swidData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_스노우_화이트_이노센트_데이즈.json', 'utf8'));

function makeSlot(data) {
    return {
        char: { id: data.characterID, name: data.characterName, data },
        skill1Level: 10,
        skill2Level: 10,
        burstLevel: 10,
        equipATK: '0',
        equipWeakPoint: '50', // 우코 50%
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
        affinityLevel: '10',
    };
}

console.log('=== UI 시뮬레이션(runSimulation 180s) 실행 테스트 ===\n');

// 1. 리틀머메이드 / 크라운 / 라피 / 스노우화이트 / 스노우화이트
const slots = [
    makeSlot(lmData),
    makeSlot(crownData),
    makeSlot(rapiData),
    makeSlot(swidData),
    makeSlot(swidData),
];

const outpostState = {
    synchroLevel: '400',
    commonResearchLevel: '100',
    elysionResearchLevel: '100',
    pilgrimResearchLevel: '100',
    attackerResearchLevel: '100',
};

function buildChar(data, slotIndex) {
    const s = data.stats || {};
    const calculated = calculateBaseStat({
        classType: s.class,
        weaponType: s.weapon,
        level: 400,
        affinityLevel: 30,
        growthStage: 0,
        rarity: s.rarity || 'SSR',
        company: s.company || 'Elysion',
        charName: data.characterName,
        commonConsoleLevel: 100,
        classConsoleLevel: 100,
        corpConsoleLevel: 100,
        cubeLevel: 0,
        equipTierHead: 'Overload',
        equipUpgradeHead: 5,
        equipTierTorso: 'Overload',
        equipUpgradeTorso: 5,
        equipTierArms: 'Overload',
        equipUpgradeArms: 5,
        equipTierLegs: 'Overload',
        equipUpgradeLegs: 5,
        collectionGrade: 'None',
        collectionLevel: 0,
    });

    const eq = {
        atkPercent: 0,
        weakPointPercent: 0.5,
        ammoPercent: 0,
        accuracyPercent: 0,
        chargeDmgPercent: 0,
        chargeSpeedPercent: 0,
        critRatePercent: 0,
        critDmgPercent: 0,
        defPercent: 0,
    };

    const char = applyBaseStats(data, true, eq, 'None', 0, slotIndex, {
        skill1Level: 10,
        skill2Level: 10,
        burstLevelSkill: 10,
    });
    char.atk = calculated.atk;
    char.defense = calculated.def;
    char.hp = calculated.hp;
    return char;
}

for (const weakness of ['작열', '철갑', '풍압', '전격', '수냉']) {
    const team = {
        members: [
            buildChar(lmData, 0),
            buildChar(crownData, 1),
            buildChar(rapiData, 2),
            buildChar(swidData, 3),
            buildChar(swidData, 4),
        ]
    };

    const enemy = {
        hp: 1_000_000_000_000,
        defense: 3000,
        element: weakness,
        corePx: 52,
    };

    const config = {
        duration: 180,
        tick: 1 / 60,
        seed: 42,
        fullBurstDuration: 10,
        burstGaugeDelay: 2.5,
        rangeMode: 35,
    };

    const result = simulateBattle(team, enemy, config);
    console.log(`[약점 속성 (SimToolbar 선택값): ${weakness}] 총 딜량: ${Math.round(result.totalDamage).toLocaleString()}`);
    team.members.forEach(m => {
        const d = result.log.filter(l => l.source === m.id).reduce((s, l) => s + (l.value || 0), 0);
        console.log(`  - ${m.name.padEnd(14)}: ${Math.round(d).toLocaleString().padStart(15)}`);
    });
    console.log('');
}
