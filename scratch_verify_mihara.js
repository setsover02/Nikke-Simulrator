import { simulateBattle } from './src/engine/battleEngine.js';
import { applyBaseStats } from './src/utils/charUtils.js';
import fs from 'fs';

const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));

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
console.log('🔍 미하라 : 본딩 체인 스킬 2 [타이트] debuff_stack_add 검증');
console.log('================================================================\n');

const team = {
    members: [
        createChar(lmData, 0),     // B1
        createChar(crownData, 1),  // B2
        createChar(miharaData, 2), // B3 (미하라)
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '작열', corePx: 52 };
const config = { duration: 40, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

// 미하라의 버프 및 사슬 감기 스택 변화 추적
console.log('--- 40초 전투 중 미하라 관련 이벤트 상세 ---');
const timelineEvents = result.log.filter(l => 
    l.source === 'MiharaBondingChain_2' || 
    l.type === 'burst'
);

timelineEvents.forEach(l => {
    if (l.type === 'burst') {
        console.log(`[t=${l.time.toFixed(2)}s] 🌟 ${l.description} (${l.source})`);
    } else if (l.type === 'skill_damage' || l.type === 'dot_damage') {
        console.log(`[t=${l.time.toFixed(2)}s] 💥 [${l.skillName || l.description}] 딜량: ${Math.round(l.value).toLocaleString()}`);
    }
});

console.log('\n--- 버프 타임라인 이벤트 (사슬 감기 스택 확인) ---');
const chainBindingEvents = result.buffTimeline.filter(b => b.name === '사슬 감기');
chainBindingEvents.forEach(b => {
    console.log(`[t=${b.time.toFixed(2)}s ~ ${b.endTime === Infinity ? 'end' : b.endTime.toFixed(2) + 's'}] 버프: ${b.name} (최종 스택: ${b.stack}) target: ${b.targetId}`);
});

console.log('\n================================================================');
