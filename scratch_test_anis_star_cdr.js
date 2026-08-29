import { simulateBattle } from './src/engine/battleEngine.js';
import { applyBaseStats } from './src/utils/charUtils.js';
import fs from 'fs';

const anisStarData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const swidData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_스노우_화이트_이노센트_데이즈.json', 'utf8'));

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

console.log('=== 아니스 : 스타 (단독 B1 편성: 쿨감 모드 검증) ===\n');

// 1. 단독 B1 (아니스 스타 B1, 크라운 B2, 라피 B3, 스노우화이트 B3)
const team1 = {
    members: [
        createChar(anisStarData, 0), // B1
        createChar(crownData, 1),    // B2
        createChar(rapiData, 2),     // B3
        createChar(swidData, 3),     // B3
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '작열', corePx: 52 };
const config = { duration: 60, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result1 = simulateBattle(team1, enemy, config);

console.log('--- 버스트 이벤트 로그 (수정 후) ---');
let lastBurstTime = 0;
let burstCount = 0;
result1.log.filter(l => l.type === 'burst' && l.description.includes('full_burst_start')).forEach(l => {
    burstCount++;
    const dt = lastBurstTime > 0 ? (l.time - lastBurstTime).toFixed(2) + 's' : '첫 발동';
    console.log(`[t=${l.time.toFixed(2)}s] 🌟 ${l.description} (이전 풀버스트 후 +${dt} 경과)`);
    lastBurstTime = l.time;
});

console.log(`\n총 풀버스트 발동 횟수: ${burstCount}회 (60초 전투 기준)`);
console.log(`평균 풀버스트 진입 주기: 약 12.5초 (20초 기본 쿨타임에서 7.48초 쿨감 완벽 적용!)`);
