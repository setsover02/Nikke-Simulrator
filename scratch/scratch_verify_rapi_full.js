import { simulateBattle } from '../src/engine/battleEngine.js';
import { applyBaseStats } from '../src/utils/charUtils.js';
import fs from 'fs';

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const swidData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_스노우_화이트_이노센트_데이즈.json', 'utf8'));
const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));

function createChar(data, slot, stats = {}) {
    const char = applyBaseStats(data, true, undefined, 'None', 0, slot, {
        skill1Level: 10,
        skill2Level: 10,
        burstLevelSkill: 10,
    });
    char.atk = stats.atk || 60000;
    char.defense = stats.defense || 4000;
    char.hp = stats.hp || 1000000;
    if (stats.equipWeakPointPercent) char.equipWeakPointPercent = stats.equipWeakPointPercent;
    return char;
}

console.log('================================================================');
console.log('🚀 라피 : 레드 후드 시나리오 전수 검증 시작');
console.log('================================================================\n');

// ── TEST 1: 변형 1 (전투 보조 활성, B1 없음) ─────────────────────
console.log('▶ [TEST 1] 변형 1 (전투 보조 활성: 라피 B1 모드, 12.5s 사이클)');
{
    const team = {
        members: [
            createChar(rapiData, 0),
            createChar(crownData, 1),
            createChar(swidData, 2),
            createChar(swidData, 3),
        ]
    };
    const enemy = { hp: 1e9, defense: 3000, element: '풍압', corePx: 52 };
    const config = { duration: 40, tick: 1 / 60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

    const result = simulateBattle(team, enemy, config);
    const burstLogs = result.log.filter(l => l.type === 'burst');
    console.log('  - 버스트 이벤트 시퀀스:');
    burstLogs.forEach(l => {
        console.log(`    [t=${l.time.toFixed(2)}s] ${l.description} (source: ${l.source || '-'}, val: ${l.value ?? '-'})`);
    });

    const b1Fires = burstLogs.filter(l => l.description === 'burst_l1_fired');
    console.log(`  - 라피 B1 발동 횟수: ${b1Fires.length}회 (예상: 3회 이상 @ 40s)`);
    b1Fires.forEach((f, i) => console.log(`    ${i + 1}번째 B1 발동 시점: t=${f.time.toFixed(2)}s`));

    const grenadeExplosions = result.log.filter(l => l.skillName === '유탄 폭발');
    const instantExplosions = result.log.filter(l => l.skillName === '유탄 즉발 폭발');
    console.log(`  - 유탄 폭발(스택 폭발) 횟수: ${grenadeExplosions.length}회`);
    grenadeExplosions.forEach((g, i) => console.log(`    ${i + 1}번째 유탄 폭발: t=${g.time.toFixed(2)}s, 딜량=${Math.round(g.value).toLocaleString()}`));
    console.log(`  - 유탄 즉발 폭발 횟수: ${instantExplosions.length}회`);

    const rapiDmg = result.log.filter(l => l.source === 'Char_16_0').reduce((s, l) => s + (l.value || 0), 0);
    console.log(`  - 라피 총 딜량: ${Math.round(rapiDmg).toLocaleString()} / 팀 총 딜량: ${Math.round(result.totalDamage).toLocaleString()}\n`);
}

// ── TEST 2: 변형 2 (전투 보조 해제, B1 존재) ─────────────────────
console.log('▶ [TEST 2] 변형 2 (전투 보조 해제: B3 딜러 모드 - 라피 vs 타 B3 교대 발동)');
{
    const team = {
        members: [
            createChar(lmData, 0),    // B1
            createChar(crownData, 1), // B2
            createChar(rapiData, 2),  // B3 (slot 2)
            createChar(swidData, 3),  // B3 (slot 3)
        ]
    };
    const enemy = { hp: 1e9, defense: 3000, element: '풍압', corePx: 52 };
    const config = { duration: 40, tick: 1 / 60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

    const result = simulateBattle(team, enemy, config);
    const burstLogs = result.log.filter(l => l.type === 'burst');
    console.log('  - 버스트 이벤트 시퀀스:');
    burstLogs.forEach(l => {
        console.log(`    [t=${l.time.toFixed(2)}s] ${l.description} (source: ${l.source || '-'}, val: ${l.value ?? '-'})`);
    });

    const b3Fires = burstLogs.filter(l => l.description === 'burst_l3_fired');
    console.log(`  - B3 발동 목록:`);
    b3Fires.forEach(f => console.log(`    [t=${f.time.toFixed(2)}s] B3 발동 니케: ${f.source}`));

    const bigDamage = result.log.filter(l => l.skillName === '계승되는 힘 4');
    console.log(`  - 단발 버스트 대미지(2808%) 발동: ${bigDamage.length}회`);
    bigDamage.forEach(d => console.log(`    [t=${d.time.toFixed(2)}s] 대미지: ${Math.round(d.value).toLocaleString()}`));

    const grenadeExplosions = result.log.filter(l => l.skillName === '유탄 폭발');
    const instantExplosions = result.log.filter(l => l.skillName === '유탄 즉발 폭발');
    console.log(`  - 유탄 폭발(스택 폭발) 횟수: ${grenadeExplosions.length}회`);
    grenadeExplosions.forEach((g, i) => console.log(`    ${i + 1}번째 유탄 폭발: t=${g.time.toFixed(2)}s, 딜량=${Math.round(g.value).toLocaleString()}`));
    console.log(`  - 유탄 즉발 폭발 횟수: ${instantExplosions.length}회`);

    const rapiDmg = result.log.filter(l => l.source === 'Char_16_2').reduce((s, l) => s + (l.value || 0), 0);
    console.log(`  - 라피 총 딜량: ${Math.round(rapiDmg).toLocaleString()} / 팀 총 딜량: ${Math.round(result.totalDamage).toLocaleString()}\n`);
}

// ── TEST 3: 속성 상성 오버라이드 검증 ─────────────────────────
console.log('▶ [TEST 3] 속성 상성 오버라이드 검증 (풍압 / 전격 / 수냉 / 작열 / 철갑 보스)');
{
    const results = {};
    for (const elem of ['풍압', '전격', '수냉', '작열', '철갑']) {
        const team = {
            members: [createChar(rapiData, 0, { equipWeakPointPercent: 0.5 })]
        };
        const enemy = { hp: 1e9, defense: 3000, element: elem, corePx: 52 };
        const config = { duration: 30, tick: 1 / 60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

        const result = simulateBattle(team, enemy, config);
        results[elem] = result.totalDamage;
    }

    const baseNonWeak = results['수냉']; // 비우월 기준
    for (const [elem, dmg] of Object.entries(results)) {
        const ratio = (dmg / baseNonWeak).toFixed(2);
        const isAdvantage = (elem === '풍압' || elem === '전격');
        console.log(`  - 보스 본체 속성: ${elem.padEnd(3)} -> 딜량: ${Math.round(dmg).toLocaleString().padStart(12)} (비우월 대비: ×${ratio}) ${isAdvantage ? '★ 우월코드 적용' : '  일반'}`);
    }

    const windMatch = Math.round(results['풍압']);
    const elecMatch = Math.round(results['전격']);
    const isOverrideExact = (windMatch === elecMatch);
    console.log(`  - 풍압 보스 딜과 전격 보스 딜 일치 여부: ${isOverrideExact ? '✅ 완벽 일치 (' + windMatch.toLocaleString() + ')' : '❌ 불일치 (' + windMatch.toLocaleString() + ' vs ' + elecMatch.toLocaleString() + ')'}`);
}
console.log('\n================================================================');
console.log('전수 검증 완료');
console.log('================================================================');
