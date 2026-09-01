import { simulateBattle } from '../src/engine/battleEngine.js';
import { applyBaseStats } from '../src/utils/charUtils.js';
import fs from 'fs';

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));

function createRapi() {
    const char = applyBaseStats(rapiData, true, undefined, 'None', 0, 0, { skill1Level: 10, skill2Level: 10, burstLevelSkill: 10 });
    char.atk = 60000;
    char.defense = 4000;
    char.hp = 1000000;
    char.equipWeakPointPercent = 0.5; // 우월코드 장비 옵션 50%
    return char;
}

console.log('=== 라피 1인 우월코드 테스트 (장비 우코 50%) ===');
for (const weakElem of ['작열', '철갑', '수냉', '풍압', '전격']) {
    const team = {
        members: [createRapi()]
    };

    const enemy = { hp: 1e9, defense: 3000, element: weakElem, corePx: 52 };
    const config = { duration: 30, tick: 1 / 60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

    const result = simulateBattle(team, enemy, config);
    const rapiTotal = result.totalDamage;
    console.log(`약점 속성: ${weakElem.padEnd(3)} -> 라피 총 딜량: ${Math.round(rapiTotal).toLocaleString()}`);
}
