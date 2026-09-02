import { simulateBattle } from '../src/engine/battleEngine.ts';
import { calculateBaseStat } from '../src/engine/baseStat.ts';
import { applyBaseStats } from '../src/utils/charUtils.ts';
import fs from 'fs';

const lmData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_리틀_머메이드.json', 'utf8'));
const crownData = JSON.parse(fs.readFileSync('src/character/pilgrim/p_ssr_크라운.json', 'utf8'));
const rapiData = JSON.parse(fs.readFileSync('src/character/elysion/e_ssr_라피_레드_후드.json', 'utf8'));

function buildChar(data, slotIndex) {
    const s = data.stats || {};
    const calculated = calculateBaseStat({
        classType: s.class,
        weaponType: s.weapon,
        level: 400,
        affinityLevel: 30,
        growthStage: 0,
        rarity: s.rarity || 'SSR',
        company: s.company || 'Elysion',
        charName: data.characterName,
        commonConsoleLevel: 100,
        classConsoleLevel: 100,
        corpConsoleLevel: 100,
        cubeLevel: 0,
        equipTierHead: 'Overload',
        equipUpgradeHead: 5,
        equipTierTorso: 'Overload',
        equipUpgradeTorso: 5,
        equipTierArms: 'Overload',
        equipUpgradeArms: 5,
        equipTierLegs: 'Overload',
        equipUpgradeLegs: 5,
        collectionGrade: 'None',
        collectionLevel: 0,
    });

    const eq = {
        atkPercent: 0,
        weakPointPercent: 0.5,
        ammoPercent: 0,
        accuracyPercent: 0,
        chargeDmgPercent: 0,
        chargeSpeedPercent: 0,
        critRatePercent: 0,
        critDmgPercent: 0,
        defPercent: 0,
    };

    const char = applyBaseStats(data, true, eq, 'None', 0, slotIndex, {
        skill1Level: 10,
        skill2Level: 10,
        burstLevelSkill: 10,
    });
    char.atk = calculated.atk;
    char.defense = calculated.def;
    char.hp = calculated.hp;
    return char;
}

const team = {
    members: [
        buildChar(lmData, 0),
        buildChar(crownData, 1),
        buildChar(rapiData, 2),
    ],
};

const enemy = {
    hp: 1_000_000_000_000,
    defense: 3000,
    element: 'Fire',
    corePx: 52,
};

const config = {
    duration: 180,
    tick: 1 / 60,
    seed: 42,
    fullBurstDuration: 10,
    burstGaugeDelay: 2.5,
    rangeMode: 35,
};

const result = simulateBattle(team, enemy, config);

console.log('Total timeline events:', result.buffTimeline.length);

const events = result.buffTimeline;
const duration = 180;
const idToName = {
    [`${lmData.characterID}_0`]: lmData.characterName,
    [`${crownData.characterID}_1`]: crownData.characterName,
    [`${rapiData.characterID}_2`]: rapiData.characterName,
};

const streamMap = new Map();
for (const ev of events) {
    const tId = ev.targetId;
    const cId = ev.casterId;
    const tName = tId === '__enemy__' || tId === 'enemy' ? (idToName[tId] || '적') : (idToName[tId] || tId);
    const cName = cId === '__enemy__' || cId === 'enemy' ? (idToName[cId] || '적') : (idToName[cId] || cId);
    const bName = ev.buffName || ev.sourceSkill || ev.stat;
    const sStart = Math.max(0, ev.startTime);
    const sEnd = Math.min(duration, ev.endTime);
    if (sEnd <= sStart) continue;

    const streamKey = `${tId}__${cId}__${bName}__${ev.stat}`;
    if (!streamMap.has(streamKey)) {
        streamMap.set(streamKey, {
            targetId: tId,
            targetName: tName,
            casterId: cId,
            casterName: cName,
            buffName: bName,
            stat: ev.stat,
            label: ev.stat,
            polarity: ev.polarity,
            events: [],
        });
    }
    streamMap.get(streamKey).events.push({
        start: sStart,
        end: sEnd,
        value: ev.value,
    });
}

const normalizedStreams = [];
for (const stream of streamMap.values()) {
    stream.events.sort((a, b) => a.start - b.start || a.end - b.end);
    const mergedSegs = [];
    for (const ev of stream.events) {
        const last = mergedSegs[mergedSegs.length - 1];
        if (last && Math.abs(last.end - ev.start) < 1e-4 && last.value === ev.value) {
            last.end = Math.max(last.end, ev.end);
        } else {
            mergedSegs.push({ ...ev });
        }
    }
    const timelineKey = mergedSegs
        .map(s => `${s.start.toFixed(2)}_${s.end.toFixed(2)}`)
        .join('|');

    normalizedStreams.push({
        ...stream,
        timelineKey,
        segments: mergedSegs,
    });
}

const groupedRows = new Map();
for (const ns of normalizedStreams) {
    const rowKey = `${ns.targetId}__${ns.casterId}__${ns.buffName}__${ns.timelineKey}`;
    if (!groupedRows.has(rowKey)) {
        groupedRows.set(rowKey, {
            targetId: ns.targetId,
            targetName: ns.targetName,
            casterId: ns.casterId,
            casterName: ns.casterName,
            buffName: ns.buffName,
            timelineKey: ns.timelineKey,
            statStreams: [],
        });
    }
    groupedRows.get(rowKey).statStreams.push(ns);
}

console.log('\n--- Grouped Rows Summary ---');
console.log('Total Raw Streams (Individual Stats):', normalizedStreams.length);
console.log('Total Grouped Rows:', groupedRows.size);

for (const [key, row] of groupedRows.entries()) {
    console.log(`\n[Row] Target: ${row.targetName}, Caster: ${row.casterName}, Buff: "${row.buffName}"`);
    console.log(`  Combined Stats (${row.statStreams.length}):`, row.statStreams.map(s => s.stat).join(', '));
    console.log(`  Segments count:`, row.statStreams[0].segments.length);
    if (row.statStreams[0].segments.length > 0) {
        const sampleSeg = row.statStreams[0].segments[0];
        console.log(`  Sample Segment [${sampleSeg.start.toFixed(1)}s ~ ${sampleSeg.end.toFixed(1)}s]:`, row.statStreams.map(s => `${s.stat}=${s.segments[0]?.value}`));
    }
}
