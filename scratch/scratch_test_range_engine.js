import { simulateBattle } from '../src/engine/battleEngine.js';
import { applyBaseStats } from '../src/utils/charUtils.js';
import { calculateBaseStat } from '../src/engine/baseStat.js';
import fs from 'fs';

const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const starAnisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

const synchroLevel = 400;

function createChar(data, slotIdx) {
    const stats = calculateBaseStat({
        classType: data.stats.class,
        weaponType: data.stats.weapon,
        level: synchroLevel,
        affinityLevel: 30,
        growthStage: 0,
        rarity: data.stats.rarity,
        company: data.stats.company,
        charName: data.characterName,
        commonConsoleLevel: 100,
        classConsoleLevel: 100,
        corpConsoleLevel: 100,
        cubeLevel: 0,
        equipTierHead: 'none',
        equipUpgradeHead: 0,
        equipTierTorso: 'none',
        equipUpgradeTorso: 0,
        equipTierArm: 'none',
        equipUpgradeArm: 0,
        equipTierLeg: 'none',
        equipUpgradeLeg: 0,
    });

    const eq = {
        atkPercent: 0,
        weakPointPercent: 0,
        ammoPercent: 0,
        critRatePercent: 0,
        critDmgPercent: 0,
        chargeDmgPercent: 0,
        chargeSpeedPercent: 0,
        accuracyPercent: 0,
        defPercent: 0,
    };

    const char = applyBaseStats(data, true, eq, 'None', 0, slotIdx, {
        skill1Level: 10,
        skill2Level: 10,
        burstLevelSkill: 10,
    });

    char.atk = stats.atk;
    char.defense = stats.def;
    char.hp = stats.hp;
    char.maxHp = stats.hp;

    return char;
}

const enemy = { hp: 1e12, defense: 4000, element: '작열', corePx: 52 };
const rangeModes = [0, 15, 25, 35, 45, 55, 100];

console.log('=== 교전 거리(RangeMode)별 대미지 변동 실측 테스트 (순수 엔진) ===\n');

rangeModes.forEach(rm => {
    const team = {
        members: [
            createChar(crownData, 0),    // MG (수혜: 35, 45, 55)
            createChar(rapiData, 1),     // SR (수혜: 45, 55, 100)
            createChar(starAnisData, 2), // RL (수혜: 없음)
            createChar(miharaData, 3),   // SMG (수혜: 15, 25, 35)
            createChar(bridData, 4),     // SG (수혜: 0, 15, 25)
        ]
    };

    const config = { duration: 180, tick: 1 / 60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5, rangeMode: rm };
    const result = simulateBattle(team, enemy, config);

    const nameMap = {
        'Crown_0': '크라운(MG)',
        'Char_16_1': '라피(SR)',
        'Char_17_2': '아니스(RL)',
        'MiharaBondingChain_3': '미하라(SMG)',
        'Char_73_4': '브리드(SG)'
    };

    const charDmg = {};
    result.log.forEach(l => {
        if (l.value && typeof l.value === 'number') {
            charDmg[l.source] = (charDmg[l.source] || 0) + l.value;
        }
    });

    console.log(`[교전 거리: ${rm.toString().padStart(3)}] Team Total = ${Math.round(result.totalDamage).toLocaleString()}`);
    Object.entries(charDmg).forEach(([id, dmg]) => {
        const name = nameMap[id] || id;
        console.log(`  - ${name.padEnd(16)}: ${Math.round(dmg).toLocaleString()}`);
    });
    console.log('');
});
