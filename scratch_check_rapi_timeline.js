import { simulateBattle } from './src/engine/battleEngine.js';
import { applyBaseStats } from './src/utils/charUtils.js';
import fs from 'fs';

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const swidData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_스노우_화이트_이노센트_데이즈.json', 'utf8'));

function createChar(data, slot) {
    return applyBaseStats(data, true, undefined, 'None', 0, slot, {
        skill1Level: 10,
        skill2Level: 10,
        burstLevelSkill: 10,
    });
}

console.log('=== 라피 부착형 유탄 발동 시점 분석 (B3 모드: 리틀머메이드 / 크라운 / 라피 / 스노우화이트) ===');
const team = {
    members: [
        createChar(lmData, 0),
        createChar(crownData, 1),
        createChar(rapiData, 2),
        createChar(swidData, 3),
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '풍압', corePx: 52 };
const config = { duration: 40, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

console.log('\n--- 라피 관련 스킬 대미지 및 버스트 이벤트 전체 목록 ---');
const rapiEvents = result.log.filter(l => 
    l.source === 'Char_16_2' || 
    (l.type === 'burst' && l.source === 'Char_16_2') || 
    l.description === 'full_burst_start' || 
    l.description === 'full_burst_end'
);

rapiEvents.forEach(l => {
    if (l.type === 'burst') {
        console.log(`[t=${l.time.toFixed(2)}s] BURST EVENT: ${l.description} (${l.source || ''})`);
    } else if (l.type === 'skill_damage') {
        console.log(`[t=${l.time.toFixed(2)}s] SKILL DMG: ${l.skillName || l.description} = ${Math.round(l.value).toLocaleString()}`);
    }
});
