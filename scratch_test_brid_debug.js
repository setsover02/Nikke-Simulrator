import { simulateBattle } from './src/engine/battleEngine.js';
import { applyBaseStats } from './src/utils/charUtils.js';
import { calculateBaseStat } from './src/engine/baseStat.js';
import fs from 'fs';

const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const starAnisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

const synchroLevel = 784;

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
        equipTierHead: 'overload',
        equipUpgradeHead: 5,
        equipTierTorso: 'overload',
        equipUpgradeTorso: 5,
        equipTierArm: 'overload',
        equipUpgradeArm: 5,
        equipTierLeg: 'overload',
        equipUpgradeLeg: 5,
    });

    const char = applyBaseStats(data, true, undefined, 'None', 0, slotIdx, {
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

const team = {
    members: [
        createChar(crownData, 0),
        createChar(rapiData, 1),
        createChar(starAnisData, 2),
        createChar(miharaData, 3),
        createChar(bridData, 4),
    ]
};

const enemy = { hp: 1e12, defense: 4000, element: '풍압', corePx: 52 };
const config = { duration: 180, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

const bridLogs = result.log.filter(l => l.source === 'Char_73_4');
console.log('=== 브리드 로그 상세 분석 ===');
console.log(`총 로그 수: ${bridLogs.length}`);

const breakdown = {};
let totalBridDmg = 0;
bridLogs.forEach(l => {
    const key = `${l.type} - ${l.skillName || l.description || 'none'}`;
    breakdown[key] = (breakdown[key] || { count: 0, dmg: 0 });
    breakdown[key].count++;
    breakdown[key].dmg += (l.value || 0);
    totalBridDmg += (l.value || 0);
});

console.log(`브리드 총 딜량: ${Math.round(totalBridDmg).toLocaleString()}\n`);
console.table(Object.entries(breakdown).map(([k, v]) => ({
    type: k,
    count: v.count,
    totalDmg: Math.round(v.dmg).toLocaleString(),
    avgDmg: Math.round(v.dmg / v.count).toLocaleString()
})));
