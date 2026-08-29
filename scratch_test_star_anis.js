import { runSimulation } from './src/engine/simulationRunner.js';
import fs from 'fs';

// 5인 스쿼드: 크라운, 라피: 레드후드, 아니스: 스타, 미하라: 본딩체인, 브리드: 사일런트트랙
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const starAnisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

const slots = [
    { selectedChar: crownData, skill1Level: '10', skill2Level: '10', burstLevel: '10', equipTierHead: 'overload', equipUpgradeHead: '5', equipTierTorso: 'overload', equipUpgradeTorso: '5', equipTierArm: 'overload', equipUpgradeArm: '5', equipTierLeg: 'overload', equipUpgradeLeg: '5' },
    { selectedChar: rapiData, skill1Level: '10', skill2Level: '10', burstLevel: '10', equipTierHead: 'overload', equipUpgradeHead: '5', equipTierTorso: 'overload', equipUpgradeTorso: '5', equipTierArm: 'overload', equipUpgradeArm: '5', equipTierLeg: 'overload', equipUpgradeLeg: '5' },
    { selectedChar: starAnisData, skill1Level: '10', skill2Level: '10', burstLevel: '10', equipTierHead: 'overload', equipUpgradeHead: '5', equipTierTorso: 'overload', equipUpgradeTorso: '5', equipTierArm: 'overload', equipUpgradeArm: '5', equipTierLeg: 'overload', equipUpgradeLeg: '5' },
    { selectedChar: miharaData, skill1Level: '10', skill2Level: '10', burstLevel: '10', equipTierHead: 'overload', equipUpgradeHead: '5', equipTierTorso: 'overload', equipUpgradeTorso: '5', equipTierArm: 'overload', equipUpgradeArm: '5', equipTierLeg: 'overload', equipUpgradeLeg: '5' },
    { selectedChar: bridData, skill1Level: '10', skill2Level: '10', burstLevel: '10', equipTierHead: 'overload', equipUpgradeHead: '5', equipTierTorso: 'overload', equipUpgradeTorso: '5', equipTierArm: 'overload', equipUpgradeArm: '5', equipTierLeg: 'overload', equipUpgradeLeg: '5' },
];

const outpost = {
    synchroLevel: '784',
    commonResearchLevel: '100',
    attackerConsole: '100',
    defenderConsole: '100',
    supporterConsole: '100',
    elysionConsole: '100',
    missilisConsole: '100',
    tetraConsole: '100',
    pilgrimConsole: '100',
    abnormalConsole: '0'
};

console.log('=== 아니스: 스타 스쿼드 딜량 점검 (싱크로 784, 작열 우월코드) ===\n');

const res = runSimulation(slots, outpost, '작열', 180);

console.log(`팀 총 딜량: ${res.summary.teamTotal.toLocaleString()}`);
res.summary.characterDamage.forEach(c => {
    console.log(`- ${c.name.padEnd(20)}: ${c.damage.toLocaleString()}`);
});

console.log('\n--- 아니스: 스타 스킬 로그 발동 횟수 및 딜량 ---');
const starAnisLogs = res.logs.filter(l => l.source === 'Char_26_2');
const logTypes = {};
starAnisLogs.forEach(l => {
    logTypes[l.type] = (logTypes[l.type] || 0) + 1;
});
console.log('로그 타입별 발생 수:', logTypes);
