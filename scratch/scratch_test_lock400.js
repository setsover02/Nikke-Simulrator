import { runSimulation } from '../src/engine/simulationRunner.js';
import fs from 'fs';

const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));

const slots = [
    { selectedChar: lmData, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
    { selectedChar: crownData, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
    { selectedChar: rapiData, skill1Level: '10', skill2Level: '10', burstLevel: '10' },
];

console.log('=== 400레벨 고정 스위치 동작 검증 ===\n');

// 1. 싱크로 레벨 1 (스위치 OFF)
const outpost1 = { synchroLevel: '1', lockSynchro400: false, commonResearchLevel: '0', attackerConsole: '0', defenderConsole: '0', supporterConsole: '0' };
const res1 = runSimulation(slots, outpost1, '작열', 180);
console.log(`[1] 싱크로 1레벨 (스위치 OFF) 팀 총 딜량: ${res1.summary.teamTotal.toLocaleString()}`);

// 2. 싱크로 레벨 1 (스위치 ON: 400레벨 고정)
const outpost2 = { synchroLevel: '1', lockSynchro400: true, commonResearchLevel: '0', attackerConsole: '0', defenderConsole: '0', supporterConsole: '0' };
const res2 = runSimulation(slots, outpost2, '작열', 180);
console.log(`[2] 싱크로 1레벨 (스위치 ON: 400레벨 고정) 팀 총 딜량: ${res2.summary.teamTotal.toLocaleString()}`);

// 3. 싱크로 레벨 400 직접 입력 (스위치 OFF)
const outpost3 = { synchroLevel: '400', lockSynchro400: false, commonResearchLevel: '0', attackerConsole: '0', defenderConsole: '0', supporterConsole: '0' };
const res3 = runSimulation(slots, outpost3, '작열', 180);
console.log(`[3] 싱크로 400레벨 직접 입력 (스위치 OFF) 팀 총 딜량: ${res3.summary.teamTotal.toLocaleString()}`);

if (res2.summary.teamTotal === res3.summary.teamTotal && res2.summary.teamTotal > res1.summary.teamTotal) {
    console.log('\n✅ 검증 성공: lockSynchro400 스위치 ON 시 싱크로 레벨에 상관없이 완벽하게 400레벨로 고정 계산됨!');
} else {
    console.error('\n❌ 검증 실패!');
}
