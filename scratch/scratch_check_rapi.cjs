const fs = require('fs');

const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));

console.log('Rapi burst skill:');
const rapiBurst = rapiData.skills.find(s => s.id === 'burst');
console.log('Cooldown:', rapiBurst.cooldown);
console.log('Effects:');
rapiBurst.effects.forEach((eff, i) => {
    console.log(`[${i}]`, eff.name, eff.effect, eff.value, eff.condition);
});

console.log('\nRapi skill 1:');
const rapiS1 = rapiData.skills.find(s => s.id === 'skill_1');
rapiS1.effects.forEach((eff, i) => {
    console.log(`[${i}]`, eff.name, eff.effect, eff.value, eff.condition);
});
