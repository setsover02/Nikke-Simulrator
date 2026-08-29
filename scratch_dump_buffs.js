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

const team = {
    members: [
        createChar(lmData, 0),    // B1
        createChar(crownData, 1), // B2
        createChar(rapiData, 2),  // B3
        createChar(swidData, 3),  // B3
    ]
};
const enemy = { hp: 1e9, defense: 3000, element: '작열', corePx: 52 };
const config = { duration: 40, tick: 1/60, seed: 42, fullBurstDuration: 10, burstGaugeDelay: 2.5 };

const result = simulateBattle(team, enemy, config);

console.log('Total buff timeline events:', result.buffTimeline.length);
if (result.buffTimeline.length > 0) {
    console.log('Sample buff timeline event:', result.buffTimeline[0]);
}
console.log('All unique targetIds in buffTimeline:', Array.from(new Set(result.buffTimeline.map(b => b.targetId))));
console.log('All unique names in buffTimeline:', Array.from(new Set(result.buffTimeline.map(b => b.name))));
