import { runSimulation } from './src/engine/simulationRunner.js';
import fs from 'fs';

const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const starAnisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

// UI 시뮬레이션(runSimulation) 실행
const slots = [
    { char: { data: crownData }, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
    { char: { data: rapiData }, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
    { char: { data: starAnisData }, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
    { char: { data: miharaData }, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
    { char: { data: bridData }, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
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

console.log('=== runSimulation 180초 (작열 우월코드, 거리 35) ===');
const res = runSimulation(slots, outpost, '작열', 180);

console.log(`팀 총 딜량: ${res.summary.teamTotal.toLocaleString()}`);
res.summary.characterDamage.forEach(c => {
    console.log(`- ${c.name.padEnd(25)}: ${c.damage.toLocaleString()}`);
});

// 브리드 로그 조사
const bridLogs = res.logs.filter(l => l.source.startsWith('Char_73'));
const breakdown = {};
let total = 0;
bridLogs.forEach(l => {
    const key = `${l.type} - ${l.skillName || l.description || 'none'}`;
    breakdown[key] = (breakdown[key] || { count: 0, sum: 0 });
    breakdown[key].count++;
    breakdown[key].sum += (l.value || 0);
    total += (l.value || 0);
});

console.log('\n--- 브리드 세부 딜량 ---');
console.table(Object.entries(breakdown).map(([k, v]) => ({
    type: k,
    count: v.count,
    total: Math.round(v.sum).toLocaleString()
})));
