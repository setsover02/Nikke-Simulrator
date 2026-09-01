import { simulateBattle } from '../src/engine/battleEngine.js';
import { applyBaseStats } from '../src/utils/charUtils.js';
import fs from 'fs';

const graveData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_그레이브.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const aliceData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_앨리스.json', 'utf8'));

function createChar(data, slot) {
    const char = applyBaseStats(data, true, undefined, 'None', 0, slot, {
        skill1Level: 10,
        skill2Level: 10,
        burstLevelSkill: 10,
    });
    char.atk = 60000;
    char.defense = 4000;
    char.hp = 1000000;
    return char;
}

console.log('================================================================');
console.log('🔍 그레이브 동작 시나리오 및 스킬 메카닉 점검');
console.log('================================================================\n');

// 덱 구성: 리틀 머메이드(B1), 그레이브(B2), 라피(B3), 앨리스(B3), 크라운(B2-대기)
const team = {
    members: [
        createChar(lmData, 0),    // B1
        createChar(graveData, 1), // B2 (그레이브)
        createChar(rapiData, 2),  // B3
        createChar(aliceData, 3), // B3 (앨리스 - 관통 딜러)
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '풍압', corePx: 52 };
const config = { duration: 40, tick: 1 / 60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

console.log('--- 그레이브 관련 버프 타임라인 이벤트 ---');
const graveBuffs = result.buffTimeline.filter(b => b.casterId === 'Char_514_1' || b.targetId === 'Char_514_1');
graveBuffs.forEach(b => {
    console.log(`[t=${b.startTime.toFixed(2)}s ~ ${b.endTime === Infinity ? 'end' : b.endTime.toFixed(2) + 's'}] 스킬: ${(b.buffName || '').padEnd(16)} stat: ${b.stat.padEnd(24)} target: ${b.targetId.padEnd(12)} value: ${b.value}`);
});

console.log('\n--- 앨리스의 관통 대미지 버프 변화 ---');
const alicePierceBuffs = result.buffTimeline.filter(b => b.targetId === 'Char_25_3' && b.stat === 'pierce_dmg_pct');
alicePierceBuffs.forEach(b => {
    console.log(`[t=${b.startTime.toFixed(2)}s ~ ${b.endTime === Infinity ? 'end' : b.endTime.toFixed(2) + 's'}] 버프: ${(b.buffName || '').padEnd(16)} value: ${b.value}% (caster: ${b.casterId})`);
});

console.log('\n================================================================');
