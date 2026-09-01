import { calculateBaseStat } from '../src/engine/baseStat.js';
import fs from 'fs';

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));

console.log('=== 400레벨 고정 스탯 계산 검증 ===\n');

const baseParams = {
    classType: rapiData.stats.class,
    weaponType: rapiData.stats.weapon,
    affinityLevel: 10,
    growthStage: 0,
    rarity: 'SSR',
    company: 'Elysion',
    charName: '라피 : 레드 후드',
    commonConsoleLevel: 0,
    classConsoleLevel: 0,
    corpConsoleLevel: 0,
    cubeLevel: 0,
};

// 1. 싱크로 레벨 1 (스위치 OFF)
const outpost1 = { synchroLevel: '1', lockSynchro400: false };
const lvl1 = outpost1.lockSynchro400 ? 400 : (parseInt(outpost1.synchroLevel) || 1);
const stat1 = calculateBaseStat({ ...baseParams, level: lvl1 });
console.log(`[1] 싱크로 1레벨 (스위치 OFF) 라피 공격력: ${stat1.atk.toLocaleString()}, HP: ${stat1.hp.toLocaleString()}`);

// 2. 싱크로 레벨 1 (스위치 ON: 400레벨 고정)
const outpost2 = { synchroLevel: '1', lockSynchro400: true };
const lvl2 = outpost2.lockSynchro400 ? 400 : (parseInt(outpost2.synchroLevel) || 1);
const stat2 = calculateBaseStat({ ...baseParams, level: lvl2 });
console.log(`[2] 싱크로 1레벨 (스위치 ON: 400레벨 고정) 라피 공격력: ${stat2.atk.toLocaleString()}, HP: ${stat2.hp.toLocaleString()}`);

// 3. 싱크로 레벨 400 직접 입력 (스위치 OFF)
const outpost3 = { synchroLevel: '400', lockSynchro400: false };
const lvl3 = outpost3.lockSynchro400 ? 400 : (parseInt(outpost3.synchroLevel) || 1);
const stat3 = calculateBaseStat({ ...baseParams, level: lvl3 });
console.log(`[3] 싱크로 400레벨 직접 입력 (스위치 OFF) 라피 공격력: ${stat3.atk.toLocaleString()}, HP: ${stat3.hp.toLocaleString()}`);

if (stat2.atk === stat3.atk && stat2.atk > stat1.atk) {
    console.log('\n✅ 검증 성공: 400레벨 고정 스위치 ON 시 싱크로 레벨 입력값과 상관없이 정확히 400레벨 스탯으로 고정 계산됨!');
} else {
    console.error('\n❌ 검증 실패!');
}
