import fs from 'fs';
import { runSimulation } from './src/engine/simulationRunner';
import { characterOptions } from './src/constants/characters';
import { SlotState } from './src/types/simulator';

const rapiOpt = characterOptions.find(c => c.data.characterName === '라피 : 레드 후드')!;
const anisOpt = characterOptions.find(c => c.data.characterName === '아니스 : 스타')!;
const miharaOpt = characterOptions.find(c => c.data.characterName === '미하라 : 본딩 체인')!;
const crownOpt = characterOptions.find(c => c.data.characterName === '크라운')!;
const bridOpt = characterOptions.find(c => c.data.characterName === '브리드 : 사일런트 트랙')!;

const makeSlot = (opt: any): SlotState => ({
    char: opt,
    customHP: '',
    customATK: '',
    customDEF: '',
    collectionGrade: 'None',
    collectionLevel: '0',
    cubeName: '03-cube-resilience',
    cubeLevel: '0',
    affinityLevel: '10',
    growthStage: '3',
    equipTierHead: 'none',
    equipUpgradeHead: '0',
    equipTierTorso: 'none',
    equipUpgradeTorso: '0',
    equipTierArms: 'none',
    equipUpgradeArms: '0',
    equipTierLegs: 'none',
    equipUpgradeLegs: '0',
    equipATK: '0',
    equipWeakPoint: '0',
    equipAmmo: '0',
    equipAccuracy: '0',
    equipChargeDmg: '0',
    equipChargeSpeed: '0',
    equipCritRate: '0',
    equipCritDmg: '0',
    equipDef: '0',
});

const slots: (SlotState | null)[] = [
    makeSlot(rapiOpt),
    makeSlot(anisOpt),
    makeSlot(miharaOpt),
    makeSlot(crownOpt),
    makeSlot(bridOpt),
];

const output = runSimulation({
    slots,
    enemyDef: '0',
    fullBurstInterval: '0',
    rangeMode: 0,
    weaknessElement: '작열',
    showCore: false,
    coreSize: 0,
});

if (output) {
    console.log('Burst Windows:', output.burstWindows);
}
