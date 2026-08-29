import { simulateBattle } from './src/engine/battleEngine.js';
import { applyBaseStats } from './src/utils/charUtils.js';
import fs from 'fs';

const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
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

console.log('================================================================');
console.log('🔍 크라운 버프 적용 현황 정밀 점검 (현재 상태)');
console.log('================================================================\n');

const team = {
    members: [
        createChar(lmData, 0),    // B1 (리틀 머메이드 - 힐러)
        createChar(crownData, 1), // B2 (크라운)
        createChar(rapiData, 2),  // B3 (라피)
        createChar(swidData, 3),  // B3 (스노우화이트)
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '작열', corePx: 52 };
const config = { duration: 40, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

console.log('--- 크라운이 부여한 버프 목록 (buffTimeline) ---');
const crownBuffs = result.buffTimeline.filter(b => b.casterId === 'Crown_1');
crownBuffs.forEach(b => {
    console.log(`[t=${b.startTime.toFixed(2)}s ~ ${b.endTime === Infinity ? 'end' : b.endTime.toFixed(2) + 's'}] 스킬: ${(b.buffName || '').padEnd(14)} stat: ${b.stat.padEnd(22)} target: ${b.targetId.padEnd(15)} value: ${b.value}`);
});

console.log('\n--- 버프별 발동 횟수 통계 ---');
const oneForAllAtk = crownBuffs.filter(b => b.stat === 'atk_caster_based_pct');
const oneForAllReload = crownBuffs.filter(b => b.stat === 'reload_speed_pct');
const relaxStack = crownBuffs.filter(b => b.buffName === '릴렉스' || b.stat === 'heal_received_pct');
const healAtkDmg = crownBuffs.filter(b => (b.buffName === '로얄 에타이어' || b.buffName === '원 포 올') && b.stat === 'atk_dmg_pct');
const burstAtkDmg = crownBuffs.filter(b => (b.buffName === '라스트 킹덤') && b.stat === 'atk_dmg_pct');

console.log(`1. [원 포 올] 버스트 시전자 공증 (atk_caster_based_pct 64.51%): ${oneForAllAtk.length}회 (버스트 시전자들에게 부여되어야 함)`);
console.log(`2. [원 포 올] 아군 전체 재장속 (reload_speed_pct 44.35%): ${oneForAllReload.length}회`);
console.log(`3. [로얄 에타이어] 43타 명중 시 릴렉스 스택: ${relaxStack.length}회`);
console.log(`4. [로얄 에타이어] 힐 수령 시 아군 전체 공댐증 (atk_dmg_pct 20.99%): ${healAtkDmg.length}회`);
console.log(`5. [라스트 킹덤] 버스트 아군 전체 공댐증 (atk_dmg_pct 36.24%): ${burstAtkDmg.length}회`);

console.log('\n================================================================');
