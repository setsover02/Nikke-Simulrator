import drakeJson from '../src/character/missilis/m_ssr_드레이크_그레이트_빌런.json';
import literJson from '../src/character/missilis/m_ssr_리타.json';
import centiJson from '../src/character/missilis/m_ssr_센티.json';
import { applyBaseStats } from '../src/utils/charUtils';
import { runSimulation } from '../src/engine/simulationRunner';
import { Element, RangeMode } from '../src/types/battle';

console.log('--- Testing Drake Great Villain Base Stats ---');
const char = applyBaseStats(drakeJson, false);
console.log('Name:', char.name);
console.log('Weapon:', char.weapon);
console.log('Class:', char.charClass);
console.log('pelletCount:', char.pelletCount);
console.log('atkCoef:', char.atkCoef);
console.log('maxAmmo:', char.maxAmmo);
console.log('reloadTime:', char.reloadTime);
console.log('chargeTime:', char.chargeTime);

if (char.pelletCount !== 10) throw new Error(`Expected pelletCount 10, got ${char.pelletCount}`);
if (Math.abs(char.atkCoef - 2.015) > 0.001) throw new Error(`Expected atkCoef 2.015, got ${char.atkCoef}`);

console.log('\n--- Running 180s Simulation with Team: Liter (B1), Centi (B2), Drake Great Villain (B3) ---');
const makeSlot = (json: any) => ({
    char: { value: json.characterID, label: json.characterName, data: json },
    skill1Level: 10,
    skill2Level: 10,
    burstLevel: 10,
    cubeLevel: '0',
    cubeName: 'None',
    collectionGrade: 'None',
    collectionLevel: '0',
    equipAtk: '0',
    equipDef: '0',
    equipAmmo: '0',
    equipAccuracy: '0',
    equipChargeDmg: '0',
    equipChargeSpeed: '0',
    equipCritRate: '0',
    equipCritDmg: '0',
    equipWeakPoint: '0',
});

const input = {
    slots: [
        makeSlot(literJson),
        makeSlot(centiJson),
        makeSlot(drakeJson),
        null,
        null
    ],
    enemyDef: '0',
    fullBurstInterval: '0',
    rangeMode: 'near' as RangeMode,
    weaknessElement: '수냉' as Element,
    showCore: true,
    coreSize: 52
};

const result = runSimulation(input);

if (!result) throw new Error('Simulation returned null!');

console.log('Simulation finished successfully!');
console.log('Team Total Damage:', Math.round(result.summary.teamTotal).toLocaleString());

for (const c of result.summary.chars) {
    console.log(`- ${c.charName}: Total Dmg = ${Math.round(c.totalDmg).toLocaleString()}`);
}

const drakeResult = result.summary.chars.find((c: any) => c.charName?.includes('드레이크'));
if (!drakeResult) throw new Error('Drake Great Villain not found in result.summary.chars!');

console.log('\n--- Checking Drake Timeline Events ---');
const buffTimeline = result.summary.buffTimeline || [];
console.log('Total buff timeline events across team:', buffTimeline.length);

const overOverdriveEvents = buffTimeline.filter((b: any) => b.buffName?.includes('오버 오버 드라이브'));
console.log('오버 오버 드라이브 timeline entries:', overOverdriveEvents.length);
if (overOverdriveEvents.length > 0) {
    console.log('First over overdrive event:', overOverdriveEvents[0]);
    console.log('Last over overdrive event:', overOverdriveEvents[overOverdriveEvents.length - 1]);
}

const spiritEvents = buffTimeline.filter((b: any) => b.stat === 'hp_only_caster_based_pct' || b.buffName?.includes('빌런, 지각하다'));
console.log('Great Villain Spirit (HP only buff) timeline entries:', spiritEvents.length);
if (spiritEvents.length > 0) {
    console.log('Spirit event sample:', spiritEvents[0]);
}

const burstDmgEvents = buffTimeline.filter((b: any) => b.buffName?.includes('빌런 웹 스페셜'));
console.log('Burst skill buff timeline entries:', burstDmgEvents.length);

console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
