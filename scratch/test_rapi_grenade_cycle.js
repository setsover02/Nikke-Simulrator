import { simulateBattle } from '../src/engine/battleEngine.js';
import { applyBaseStats } from '../src/utils/charUtils.js';
import fs from 'fs';

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
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

console.log('================================================================');
console.log('🔍 라피 레드 후드 : 부착형 유탄 탄환 소모(120발/60발) 주기 검증');
console.log('================================================================\n');

const team = {
    members: [
        createChar(lmData, 0),    // B1
        createChar(crownData, 1), // B2
        createChar(rapiData, 2),  // B3 (라피)
        createChar(swidData, 3),  // B3 (스노우화이트)
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '풍압', corePx: 52 };
const config = { duration: 40, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

// 라피(Char_16_2)의 사격 및 유탄 관련 이벤트 추적
console.log('--- 40초 전투 타임라인 중 라피 관련 이벤트 상세 ---');
const timelineEvents = result.log.filter(l => 
    l.source === 'Char_16_2' || 
    (l.type === 'burst')
);

let lastTime = 0;
timelineEvents.forEach(l => {
    if (l.type === 'burst') {
        console.log(`[t=${l.time.toFixed(2)}s] 🌟 ${l.description} ${l.source ? '(' + l.source + ')' : ''}`);
    } else if (l.skillName === '부착형 유탄' && l.type === 'skill_damage') {
        const dt = lastTime > 0 ? (l.time - lastTime).toFixed(2) : '0.00';
        console.log(`[t=${l.time.toFixed(2)}s] 🎯 [부착형 유탄] 발동! (이전 발동 후 +${dt}s 경과) 딜량: ${Math.round(l.value).toLocaleString()}`);
        lastTime = l.time;
    } else if (l.skillName === '유탄 즉발 폭발') {
        console.log(`[t=${l.time.toFixed(2)}s]    💥 [유탄 즉발 폭발] 연쇄 발동! 딜량: ${Math.round(l.value).toLocaleString()}`);
    } else if (l.skillName === '유탄 폭발') {
        console.log(`[t=${l.time.toFixed(2)}s] 💣 [유탄 스택 폭발] (풀버스트 진입 시 누적 스택 일괄 폭발) 딜량: ${Math.round(l.value).toLocaleString()}`);
    } else if (l.skillName === '계승되는 힘' && l.type === 'skill_damage') {
        console.log(`[t=${l.time.toFixed(2)}s] ⚡ [계승되는 힘] B3 단발 버스트 대미지(2808%) 발동! 딜량: ${Math.round(l.value).toLocaleString()}`);
    }
});

console.log('\n--- 발동 통계 요약 ---');
const grenadeHits = result.log.filter(l => l.skillName === '부착형 유탄' && l.type === 'skill_damage');
const instantExplosions = result.log.filter(l => l.skillName === '유탄 즉발 폭발');
const stackExplosions = result.log.filter(l => l.skillName === '유탄 폭발');
const burstBigDamages = result.log.filter(l => l.skillName === '계승되는 힘' && l.type === 'skill_damage');

console.log(`- 부착형 유탄 4 (발사체 부착) 총 발동: ${grenadeHits.length}회`);
console.log(`- 유탄 즉발 폭발 총 발동: ${instantExplosions.length}회`);
console.log(`- 유탄 스택 폭발 (풀버스트 진입 시) 총 발동: ${stackExplosions.length}회`);
console.log(`- 계승되는 힘 4 (2808% 버스트 단발딜) 총 발동: ${burstBigDamages.length}회`);
console.log('\n================================================================');
