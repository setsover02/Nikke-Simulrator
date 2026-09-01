const fs = require('fs');
const path = require('path');

// Load characters directly from JSON files
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));
const anisData = JSON.parse(fs.readFileSync('src/character/tetra/t_ssr_아니스_스타.json', 'utf8'));
const miharaData = JSON.parse(fs.readFileSync('src/character/missilis/m_ssr_미하라_본딩_체인.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const bridData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_브리드_사일런트_트랙.json', 'utf8'));

console.log('Rapi burst skill:');
const rapiBurst = rapiData.skills.find(s => s.id === 'burst');
console.log('Cooldown:', rapiBurst.cooldown);
console.log('Effects:');
rapiBurst.effects.forEach((eff, i) => {
    console.log(`[${i}]`, eff.name, eff.effect, eff.value, eff.condition);
});
