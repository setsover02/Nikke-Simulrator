/**
 * baseStat.ts
 * 닉케 캐릭터 기본 스탯 계산 엔진
 *
 * 계산 순서:
 *  1. level_stats   — 클래스×무기 유형 + 레벨 → 기본 atk/def/hp
 *  2. affinity      — 클래스 + 호감도 레벨 → flat 추가
 *  3. console       — 공통/클래스/기업 콘솔 레벨 × per_level → flat 추가
 *  4. cube          — 큐브 레벨 → flat 추가
 *  5. equipment     — 장비 티어(T9/기업/Overload) + 강화단계 → flat 추가
 *  6. collection    — 소장품 등급(R/SR) + 레벨 → flat 추가
 */

import levelStatsData from '../data/level_stats.json';
import affinityData from '../data/affinity.json';
import consoleData from '../data/console.json';
import cubeData from '../data/cube.json';
import equipmentData from '../data/equipment.json';
import equipmentStatsData from '../data/equipment_stats.json';
import collectionData from '../data/collection.json';

/* ------------------------------------------------------------------ */
/*  내부 타입                                                            */
/* ------------------------------------------------------------------ */

type StatBlock = { atk: number; def: number; hp: number };

const ZERO_STAT = (): StatBlock => ({ atk: 0, def: 0, hp: 0 });

/* ------------------------------------------------------------------ */
/*  공개 타입                                                            */
/* ------------------------------------------------------------------ */

export interface BaseStatParams {
    /** '화력형' | '방어형' | '지원형' */
    classType: string;
    /** 'AR' | 'SMG' | 'SR' | 'SG' | 'MG' | 'RL' */
    weaponType: string;
    /** 싱크로 레벨 = 캐릭터 레벨 (1 ~ 1200, 데이터 없는 구간은 최대 데이터 레벨 또는 400으로 fallback) */
    level: number;
    /** 호감도 레벨 (1 ~ 40) */
    affinityLevel: number;
    /**
     * 성장 단계 (growthStage)
     *  0      = 명함
     *  1~3    = 1돌 ~ 3돌
     *  4~10   = 코강 1~7
     * breakthrough = min(stage, 3), core_enhancement = max(0, stage-3)
     */
    growthStage: number;
    /** 레어도 'R' | 'SR' | 'SSR' */
    rarity: string;
    /** 대문자 기업명 (e.g. 'Pilgrim', 'Elysion') */
    company: string;
    /** 캐릭터 한글 이름 (오버스펙 판별용) */
    charName: string;

    /** 공통 콘솔 레벨 */
    commonConsoleLevel: number;
    /** 클래스 콘솔 레벨 (화력/방어/지원 동일 per_level 적용) */
    classConsoleLevel: number;
    /** 기업 콘솔 레벨 */
    corpConsoleLevel: number;

    /** 큐브 레벨 (0 = 없음, 1 ~ 15) */
    cubeLevel: number;

    /** 장비 티어 (4부위): 'none' | 'T1'~'T9' | '기업' | 'Overload' */
    equipTierHead: string;
    equipUpgradeHead: number;
    equipTierTorso: string;
    equipUpgradeTorso: number;
    equipTierArms: string;
    equipUpgradeArms: number;
    equipTierLegs: string;
    equipUpgradeLegs: number;

    /** 소장품 등급 ('None' | 'R' | 'SR') */
    collectionGrade: string;
    /** 소장품 레벨 (0 ~ 15) */
    collectionLevel: number;
}

export interface StatBreakdown {
    base: StatBlock;
    affinity: StatBlock;
    console: StatBlock;
    cube: StatBlock;
    equipment: StatBlock;
    collection: StatBlock;
}

export interface BaseStatResult {
    atk: number;
    def: number;
    hp: number;
    breakdown: StatBreakdown;
}

/* ------------------------------------------------------------------ */
/*  캐스팅 헬퍼                                                          */
/* ------------------------------------------------------------------ */

const LEVEL_STATS = levelStatsData as Record<string, Record<string, StatBlock>>;
const AFFINITY    = affinityData    as Record<string, Record<string, StatBlock>>;
const CONSOLE     = consoleData     as Record<string, { per_level: StatBlock }>;
const CUBE        = cubeData        as Record<string, Record<string, StatBlock>>;
const EQUIP_JSON  = equipmentData   as Record<string, Record<string, Record<string, any>>>;
// equipment_stats.json shape: { 기업: { classType: { slot: { upgrade: StatBlock } } }, 일반: { tier: { classType: { slot: StatBlock } } } }
const EQUIP_STATS = equipmentStatsData as any;
const COLLECTION  = collectionData  as any;

/* ------------------------------------------------------------------ */
/*  유틸                                                                */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/* ------------------------------------------------------------------ */
/*  성장 단계 (돌파 / 코강) 유틸                                           */
/*  growth.py 동일 로직을 TypeScript로 이식                               */
/* ------------------------------------------------------------------ */

/** 레어도별 최대 growthStage */
export const MAX_STAGE_BY_RARITY: Record<string, number> = { R: 0, SR: 2, SSR: 10 };

/** 오버스펙 캐릭터 이름 목록 (호감도 40 허용) */
const OVER_SPEC_NAMES = new Set([
    '라피 : 레드 후드',
    '아니스 : 스타',
    '네온 : 비전 아이',
]);

export interface GrowthResolved {
    breakthrough: number;      // 0~3
    core_enhancement: number;  // 0~7
    /** 해당 성장 단계에서의 최대 호감도 */
    maxAffinity: number;
}

/**
 * growth.py의 resolve_growth() 동일 로직
 * @param rarity  'R' | 'SR' | 'SSR'
 * @param company 캐릭터 소속 기업 (영문, e.g. 'Pilgrim')
 * @param charName 캐릭터 이름 (한글)
 * @param stage   0 ~ maxStage
 */
export function resolveGrowthStage(
    rarity: string,
    company: string,
    charName: string,
    stage: number,
): GrowthResolved {
    const breakthrough = Math.min(stage, 3);
    const core_enhancement = Math.max(0, stage - 3);

    const bond40 = rarity === 'SSR' && (
        company === 'Pilgrim' || OVER_SPEC_NAMES.has(charName)
    );

    let maxAffinity: number;
    if (rarity === 'R') {
        maxAffinity = 1;
    } else if (stage === 0) {
        maxAffinity = 10;
    } else if (stage === 1) {
        maxAffinity = 20;
    } else if (stage === 2) {
        maxAffinity = 30;
    } else {
        maxAffinity = bond40 ? 40 : 30;
    }

    return { breakthrough, core_enhancement, maxAffinity };
}

/** growthStage → 한국어 라벨 (명함 / 1돌 / 코강1 ...) */
export function growthStageLabel(stage: number): string {
    if (stage === 0) return '명함';
    if (stage <= 3) return `${stage}돌`;
    return `코강 ${stage - 3}`;
}

/** level_stats.json 키 생성 */
export function getLevelStatsKey(classType: string, weaponType: string): string {
    return `${classType}_${weaponType}`;
}

/* ------------------------------------------------------------------ */
/*  equipment.json 슬롯 이름 매핑                                        */
/*  equipment.json   : 머리, 가슴, 손, 신발                              */
/*  equipment_stats.json: 머리, 몸통, 팔, 다리                           */
/* ------------------------------------------------------------------ */

/** equipment.json 슬롯 → equipment_stats 슬롯 */
const EQUIP_JSON_SLOTS = ['머리', '가슴', '손', '신발'] as const;
const EQUIP_STATS_SLOTS = ['머리', '몸통', '팔', '다리'] as const;

function addStat(dst: StatBlock, src: any, defField = 'def') {
    dst.atk += (src?.atk ?? 0);
    dst.def += (src?.[defField] ?? src?.def ?? 0);
    dst.hp  += (src?.hp  ?? 0);
}

/* ------------------------------------------------------------------ */
/*  장비 스탯 계산                                                        */
/* ------------------------------------------------------------------ */

function calcEquipmentStat(classType: string, params: BaseStatParams): StatBlock {
    const stat = ZERO_STAT();
    
    const slots = [
        { json: '머리', stats: '머리', tier: params.equipTierHead, upgrade: params.equipUpgradeHead },
        { json: '가슴', stats: '몸통', tier: params.equipTierTorso, upgrade: params.equipUpgradeTorso },
        { json: '손',   stats: '팔',   tier: params.equipTierArms, upgrade: params.equipUpgradeArms },
        { json: '신발', stats: '다리', tier: params.equipTierLegs, upgrade: params.equipUpgradeLegs },
    ] as const;

    for (const slot of slots) {
        const { tier, upgrade } = slot;
        if (!tier || tier === 'none' || tier === 'None') continue;

        if (tier === '기업') {
            const slotData = EQUIP_JSON[classType]?.[slot.json]?.['company'];
            addStat(stat, slotData, 'defense');
        } else if (tier === 'Overload') {
            const upgradeStr = String(clamp(upgrade, 0, 5));
            const tierData = EQUIP_STATS['기업']?.[classType]?.[slot.stats]?.[upgradeStr];
            addStat(stat, tierData);
        } else if (tier.startsWith('T')) {
            const tierData = EQUIP_STATS['일반']?.[tier]?.[classType]?.[slot.stats];
            addStat(stat, tierData);
        }
    }

    return stat;
}

/* ------------------------------------------------------------------ */
/*  메인 계산 함수                                                        */
/* ------------------------------------------------------------------ */

export function calculateBaseStat(params: BaseStatParams): BaseStatResult {
    const {
        classType, weaponType, level, affinityLevel,
        commonConsoleLevel, classConsoleLevel, corpConsoleLevel,
        cubeLevel,
        collectionGrade, collectionLevel,
        growthStage, rarity, company, charName,
    } = params;

    // ── 성장 단계 분해 ──────────────────────────────────────────────
    const stage = growthStage ?? 0;

    // ── 1. 기본 스탯 (레벨표) ─────────────────────────────────────
    // 데이터가 없는 레벨(1001~1200)은 테이블 최대 레벨 값으로 fallback
    // 최대 레벨 데이터도 없을 경우 400레벨 제한으로 최종 fallback
    const levelKey = getLevelStatsKey(classType, weaponType);
    const levelTable = LEVEL_STATS[levelKey];

    let resolvedLevel = level;
    let levelEntry = levelTable?.[String(resolvedLevel)];

    if (!levelEntry && levelTable) {
        // 데이터가 없는 경우 가장 높은 레벨 키 탐색
        const maxDataLevel = Math.max(...Object.keys(levelTable).map(Number).filter(n => !isNaN(n)));
        const fallbackLevel = maxDataLevel > 0 ? maxDataLevel : 400;
        resolvedLevel = Math.min(resolvedLevel, fallbackLevel);
        levelEntry = levelTable[String(resolvedLevel)] ?? ZERO_STAT();
    } else if (!levelEntry) {
        levelEntry = ZERO_STAT();
    }

    const base: StatBlock = { atk: levelEntry.atk, def: levelEntry.def, hp: levelEntry.hp };

    const upperRarity = (rarity ?? 'SSR').toUpperCase();

    // ── 등급(Rarity)에 따른 기본 스탯 스케일링 ─────────────────────────────
    // level_stats.json은 SSR 기준으로 작성되어 있으므로, SR/R 등급은 비율에 맞게 다운 스케일링합니다.
    // (방어력은 캐릭터별 개별 계수가 적용되므로 스케일링에서 제외합니다)
    if (upperRarity === 'SR') {
        base.hp = Math.floor(base.hp * (23 / 30));
        base.atk = Math.floor(base.atk * 0.9);
    } else if (upperRarity === 'R') {
        base.hp = Math.floor(base.hp * (23 / 30));
        base.atk = Math.floor(base.atk * 0.8);
    }

    // ── 1b. 돌파 (Breakthrough 0~3) 보너스 ────────────────────────────────
    const { breakthrough, core_enhancement } = resolveGrowthStage(
        rarity ?? 'SSR',
        company ?? '',
        charName ?? '',
        stage,
    );
    
    // 공식: 스탯 += (기본스탯 × 0.02 + flat_bonus) × breakthrough
    // 인게임 규칙: 돌파 보너스는 각 스탯별로 합산 후 버림(Floor)
    
    // Rarity 및 Class 별 플랫 보너스 매핑
    const FLAT_BONUS: Record<string, Record<string, StatBlock>> = {
        'SSR': {
            '화력형': { hp: 3000, atk: 20, def: 100 },
            '방어형': { hp: 3000, atk: 20, def: 100 },
            '지원형': { hp: 3000, atk: 20, def: 100 },
        },
        'SR': {
            '화력형': { hp: 2300, atk: 18, def: 90 },
            '방어형': { hp: 2300, atk: 18, def: 90 },
            '지원형': { hp: 2300, atk: 18, def: 90 },
        },
        'R': {
            '화력형': { hp: 0, atk: 0, def: 0 },
            '방어형': { hp: 0, atk: 0, def: 0 },
            '지원형': { hp: 0, atk: 0, def: 0 },
        }
    };
    const classKey = classType ?? '화력형';
    const flatBonus = FLAT_BONUS[upperRarity]?.[classKey] ?? { hp: 0, atk: 0, def: 0 };

    base.atk += Math.floor((base.atk * 0.02 + flatBonus.atk) * breakthrough);
    base.def += Math.floor((base.def * 0.02 + flatBonus.def) * breakthrough);
    base.hp  += Math.floor((base.hp  * 0.02 + flatBonus.hp)  * breakthrough);

    // ── 2. 호감도 ─────────────────────────────────────────────────
    const affinityLv = clamp(affinityLevel, 1, 40);
    const affinityEntry = AFFINITY[classType]?.[String(affinityLv)] ?? ZERO_STAT();
    const affinity: StatBlock = { atk: affinityEntry.atk, def: affinityEntry.def, hp: affinityEntry.hp };

    // ── 3. 콘솔 ──────────────────────────────────────────────────
    const commonPer = CONSOLE['공통']?.per_level ?? ZERO_STAT();
    const classPer  = CONSOLE['클래스']?.per_level ?? ZERO_STAT();
    const corpPer   = CONSOLE['기업']?.per_level ?? ZERO_STAT();
    const consoleStat: StatBlock = {
        atk: commonPer.atk * commonConsoleLevel + classPer.atk * classConsoleLevel + corpPer.atk * corpConsoleLevel,
        def: commonPer.def * commonConsoleLevel + classPer.def * classConsoleLevel + corpPer.def * corpConsoleLevel,
        hp:  commonPer.hp  * commonConsoleLevel + classPer.hp  * classConsoleLevel + corpPer.hp  * corpConsoleLevel,
    };

    // ── 4. 큐브 ──────────────────────────────────────────────────
    const cubeStat: StatBlock = ZERO_STAT();
    if (cubeLevel > 0) {
        const cubeEntry = CUBE['_stats']?.[String(clamp(cubeLevel, 1, 15))];
        if (cubeEntry) {
            cubeStat.atk = cubeEntry.atk;
            cubeStat.def = cubeEntry.def;
            cubeStat.hp  = cubeEntry.hp;
        }
    }

    // ── 5. 장비 ──────────────────────────────────────────────────
    const equipment = calcEquipmentStat(classType, params);

    // ── 6. 소장품 ─────────────────────────────────────────────────
    const collectionStat: StatBlock = ZERO_STAT();
    if (collectionGrade && collectionGrade !== 'None' && collectionGrade !== 'SSR') {
        const key = `${collectionGrade}${collectionLevel}`;
        const ce = COLLECTION['_stat_table']?.[key];
        if (ce) {
            collectionStat.atk = ce.atk;
            collectionStat.def = ce.def;
            collectionStat.hp  = ce.hp;
        }
    }

    // ── 합산 및 코어 강화(Core Enhancement 0~7) 적용 ────────────────────────
    // 코어 강화(이후)는 장비/큐브/소장품을 제외한 합산값에 +2%씩 곱연산
    // 인게임 규칙: 곱연산 후 바로 버림(Floor) 처리
    const coreScale = 1 + (0.02 * core_enhancement);

    const coreAtk = Math.floor((base.atk + affinity.atk + consoleStat.atk) * coreScale);
    const coreDef = Math.floor((base.def + affinity.def + consoleStat.def) * coreScale);
    const coreHp  = Math.floor((base.hp  + affinity.hp  + consoleStat.hp)  * coreScale);

    return {
        atk: coreAtk + cubeStat.atk + equipment.atk + collectionStat.atk,
        def: coreDef + cubeStat.def + equipment.def + collectionStat.def,
        hp:  coreHp  + cubeStat.hp  + equipment.hp  + collectionStat.hp,
        breakdown: {
            base,
            affinity,
            console:    consoleStat,
            cube:       cubeStat,
            equipment,
            collection: collectionStat,
        },
    };
}

/* ------------------------------------------------------------------ */
/*  유틸 헬퍼 (컴포넌트에서 사용)                                          */
/* ------------------------------------------------------------------ */

/** 캐릭터 회사명 → 기업 콘솔 레벨 추출 */
export function getCorpConsoleLevel(company: string, outpost: {
    elysionConsole: string;
    missilisConsole: string;
    tetraConsole: string;
    pilgrimConsole: string;
    abnormalConsole: string;
}): number {
    switch (company) {
        case 'Elysion':  return parseInt(outpost.elysionConsole)  || 0;
        case 'Missilis': return parseInt(outpost.missilisConsole) || 0;
        case 'Tetra':    return parseInt(outpost.tetraConsole)    || 0;
        case 'Pilgrim':  return parseInt(outpost.pilgrimConsole)  || 0;
        case 'Abnormal': return parseInt(outpost.abnormalConsole) || 0;
        default:         return 0;
    }
}

/** 클래스명 → 클래스 콘솔 레벨 추출 */
export function getClassConsoleLevel(classType: string, outpost: {
    attackerConsole: string;
    defenderConsole: string;
    supporterConsole: string;
}): number {
    switch (classType) {
        case '화력형': return parseInt(outpost.attackerConsole)  || 0;
        case '방어형': return parseInt(outpost.defenderConsole)  || 0;
        case '지원형': return parseInt(outpost.supporterConsole) || 0;
        default:       return 0;
    }
}
