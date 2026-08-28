/**
 * 누적 데미지 차트 데이터 생성 (attack + skill_damage 모두 집계)
 * @param result - 시뮬레이션 결과
 * @param duration - 시뮬레이션 시간(초)
 * @param sourceFilter - 특정 캐릭터 ID로 필터링 (없으면 전체)
 * @param typeFilter - 집계할 로그 타입 Set (없으면 attack + skill_damage 모두)
 */
export const generateChartData = (
    result: any,
    duration: number,
    sourceFilter?: string,
    typeFilter?: Set<string>
) => {
    const DAMAGE_TYPES = typeFilter ?? new Set(['attack', 'skill_damage', 'dot_damage']);
    const aggregated: { [second: number]: number } = {};
    for (const log of result.log) {
        if (!DAMAGE_TYPES.has(log.type)) continue;
        if (sourceFilter && log.source !== sourceFilter) continue;
        // Use Math.ceil to bucket damage occurring between (0, 1] into 1s, etc.
        const sec = Math.ceil(log.time);
        aggregated[sec] = (aggregated[sec] || 0) + (log.value || 0);
    }
    const data = [];
    let cumulativeDamage = 0;
    for (let i = 0; i <= duration; i++) {
        cumulativeDamage += (aggregated[i] || 0);
        data.push({ time: i, dps: cumulativeDamage });
    }
    return data;
};

/**
 * 여러 result의 attack 데미지를 합산한 누적 차트 데이터 생성
 * (팀 시뮬레이션에서 전체 합산 라인용)
 */
export const generateCombinedChartData = (result: any, duration: number) => {
    return generateChartData(result, duration);
};

export interface ScatterPoint {
    time: number;
    value: number;
    source: string;
    description: string;
    skillName: string;
    dmgType: string;   // log.type: 'skill_damage' | 'dot_damage'
    dmgStat: string;   // PARSING.md damage stat: 'damage' | 'sequential_damage' | ...
}

/** PARSING.md 대미지 stat → 시각화 메타 */
export interface DmgStatMeta {
    label: string;    // 범례 표시 이름
    shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'cross' | 'star';
    color: string;    // stat별 고유 기본 색상 오버레이 (캐릭터 색상 위에 blend)
    alpha: number;
    radius: number;
}

export const DAMAGE_STAT_META: Record<string, DmgStatMeta> = {
    'damage':                       { label: 'Skill',       shape: 'circle',   color: '',              alpha: 0.85, radius: 3.5 },
    'burst_damage':                 { label: 'Burst',       shape: 'star',     color: '',              alpha: 0.95, radius: 5.0 },
    'sequential_damage':            { label: 'Sequential',  shape: 'triangle', color: '',              alpha: 0.85, radius: 4.0 },
    'split_damage':                 { label: 'Split',       shape: 'square',   color: '',              alpha: 0.80, radius: 3.5 },
    'dot_damage':                   { label: 'DoT',         shape: 'diamond',  color: '',              alpha: 0.55, radius: 2.5 },
    'bonus_damage':                 { label: 'Bonus',       shape: 'cross',    color: '',              alpha: 0.80, radius: 3.5 },
    'armor_break_damage':           { label: 'ArmorBreak',  shape: 'circle',   color: '',              alpha: 0.80, radius: 3.0 },
    'pierce_damage':                { label: 'Pierce',      shape: 'triangle', color: '',              alpha: 0.75, radius: 3.0 },
    'projectile_explosion_damage':  { label: 'Explosion',   shape: 'star',     color: '',              alpha: 0.85, radius: 4.5 },
    'projectile_attachment_damage': { label: 'Attachment',  shape: 'square',   color: '',              alpha: 0.80, radius: 3.0 },
    'core_damage':                  { label: 'Core',        shape: 'star',     color: '',              alpha: 0.90, radius: 4.5 },
    'auto_damage':                  { label: 'Auto',        shape: 'circle',   color: '',              alpha: 0.65, radius: 2.5 },
    'extra_damage':                 { label: 'Extra',       shape: 'cross',    color: '',              alpha: 0.80, radius: 3.0 },
    'distribute_damage':            { label: 'Distribute',  shape: 'square',   color: '',              alpha: 0.80, radius: 3.5 },
    'unknown':                      { label: '?',           shape: 'circle',   color: '',              alpha: 0.60, radius: 2.5 },
};

/** log.description → PARSING.md stat 이름으로 매핑 */
function resolveDmgStat(description: string, logType: string): string {
    if (!description) return logType === 'dot_damage' ? 'dot_damage' : 'damage';
    const d = description.toLowerCase();
    // sequential_damage×N 패턴
    if (d.startsWith('sequential_damage')) return 'sequential_damage';
    // alias 및 접두사 매핑
    if (d.startsWith('split_dmg') || d.startsWith('split_damage')) return 'split_damage';
    if (d.startsWith('burst_dmg') || d.startsWith('burst_damage')) return 'burst_damage';
    if (d.startsWith('bonus_dmg') || d.startsWith('bonus_damage')) return 'bonus_damage';
    if (d.startsWith('dot_dmg') || d.startsWith('dot_damage')) return 'dot_damage';
    if (d.startsWith('core_dmg') || d.startsWith('core_damage')) return 'core_damage';
    if (d.startsWith('armor_break')) return 'armor_break_damage';
    if (d.startsWith('pierce')) return 'pierce_damage';
    if (d.startsWith('projectile_explosion')) return 'projectile_explosion_damage';
    if (d.startsWith('projectile_attachment')) return 'projectile_attachment_damage';
    if (d.startsWith('distribute')) return 'distribute_damage';
    if (d.startsWith('extra')) return 'extra_damage';
    if (d.startsWith('auto')) return 'auto_damage';

    // 정확 매핑
    const knownStats = [
        'damage', 'burst_damage', 'split_damage', 'dot_damage', 'bonus_damage',
        'armor_break_damage', 'pierce_damage', 'projectile_explosion_damage',
        'projectile_attachment_damage', 'core_damage', 'auto_damage',
        'extra_damage', 'distribute_damage', 'bubble_barrage',
    ];
    for (const s of knownStats) {
        if (d === s || d.startsWith(s + ':') || d.startsWith(s + '×')) return s;
    }
    // bubble_barrage → damage 계열
    if (d.includes('barrage')) return 'damage';
    // fallback: log type 기반
    return logType === 'dot_damage' ? 'dot_damage' : 'damage';
}

/** 집계 대상 비-attack 대미지 타입 전체 */
export const SKILL_DAMAGE_TYPES = new Set([
    'skill_damage',
    'dot_damage',
]);

/**
 * 개별 대미지 인스턴스를 점으로 찍기 위한 스캐터 데이터 생성.
 * sourceFilter를 지정하면 해당 캐릭터 ID만, typeFilter를 지정하면 해당 타입만 집계.
 */
export const generateScatterData = (
    result: any,
    sourceFilter?: string,
    typeFilter?: Set<string>
): ScatterPoint[] => {
    const DAMAGE_TYPES = typeFilter ?? SKILL_DAMAGE_TYPES;
    const data: ScatterPoint[] = [];

    for (const log of result.log) {
        if (!DAMAGE_TYPES.has(log.type)) continue;
        if (sourceFilter && log.source !== sourceFilter) continue;
        if (!log.value || log.value <= 0) continue;

        data.push({
            time: log.time,
            value: log.value,
            source: log.source,
            description: log.description || '',
            skillName: log.skillName || log.description || '',
            dmgType: log.type,
            dmgStat: resolveDmgStat(log.description || '', log.type),
        });
    }

    return data;
};

export interface BurstWindow {
    start: number;
    end: number;
    casters: string[]; // IDs of characters who fired bursts in this window
}

export const generateBurstWindows = (
    log: any[],
    duration: number,
): BurstWindow[] => {
    const windows: BurstWindow[] = [];
    let startTime: number | null = null;
    let currentCasters: string[] = [];

    for (const entry of log) {
        if (entry.type !== 'burst') continue;

        const desc = entry.description || '';

        // burst_l1_fired / burst_l2_fired / burst_l3_fired — 체인의 모든 발동 수집
        if (desc.includes('_fired') && entry.source) {
            currentCasters.push(entry.source);
        }

        if (desc === 'burst_chain_fail') {
            currentCasters = [];
        }

        if (desc === 'full_burst_start') {
            startTime = entry.time;
        } else if (desc === 'full_burst_end' && startTime !== null) {
            windows.push({
                start: startTime,
                end: Math.min(duration, entry.time),
                casters: [...currentCasters],
            });
            startTime = null;
            currentCasters = [];
        }
    }

    // 전투 종료 시 풀버스트가 진행 중이었다면 닫기
    if (startTime !== null) {
        windows.push({ start: startTime, end: duration, casters: [...currentCasters] });
    }

    return windows;
};

/** 스킬 데미지만 집계한 누적 차트 데이터 (현재 그래프에서 미사용) */
export const generateSkillChartData = (result: any, duration: number) => {
    const aggregated: { [second: number]: number } = {};
    for (const log of result.log) {
        if (log.type === 'skill_damage') {
            const sec = Math.ceil(log.time);
            aggregated[sec] = (aggregated[sec] || 0) + (log.value || 0);
        }
    }
    const data = [];
    let cumulativeDamage = 0;
    for (let i = 0; i <= duration; i++) {
        cumulativeDamage += (aggregated[i] || 0);
        data.push({ time: i, dps: cumulativeDamage });
    }
    return data;
};

import { getWeaponMultipliers, getWeaponRangeBonus, RangeMode } from '../constants/weaponStats';
import { HitDamages } from '../types/simulator';
import { calcNikkeDamage } from '../engine/nikkeFormula';

/**
 * 단발 타격 유형별 데미지 계산 (일반 / 크리티컬 / 코어 / 코어+크리티컬)
 * nikkeFormula.calcNikkeDamage 와 동일한 공식을 사용하여 시뮬 수치와 완전 일致.
 * atkCoef는 charUtils.applyBaseStats 기준 (JSON 원값 / 100) 형태로 전달.
 */
export const calcHitDamages = (
    char: {
        atk: number;
        atkCoef?: number;          // charUtils 거친 값 (JSON atkCoef / 100)
        weapon?: string;
        equipATKPercent?: number;
        equipWeakPointPercent?: number;
        equipCritDmgPercent?: number;
        normalAtkMultiplier?: number;
        chargeDmgMultiplier?: number;
        coreHitMultiplier?: number;
        coreDamage?: number;
        coreHitBonus?: number;
        critMult?: number;
        fullChargeDamage?: number;
        pelletCount?: number;
    },
    enemyDef: number,
    rangeMode: RangeMode = 45,
    isWeakPoint: boolean = false,
    enemyTakenUp: number = 0
): HitDamages => {
    const wm = getWeaponMultipliers(char.weapon);
    const rangeBonus = getWeaponRangeBonus(char.weapon, rangeMode);
    const coreHitBonus = char.coreHitBonus !== undefined ? char.coreHitBonus :
        (char.coreDamage ? (char.coreDamage / 100 - 1) : wm.coreHitBonus);
    const critBonus = (char.critMult ? (char.critMult - 1) : wm.critBonus) + (char.equipCritDmgPercent ?? 0);

    // nikkeFormula.calcNikkeDamage와 동일한 파라미터 구조 사용
    const baseParams = {
        baseATK: char.atk,
        extraATKPercent: char.equipATKPercent ?? 0,
        extraATKFlat: 0,
        enemyBaseDEF: enemyDef,
        enemyDEFPercent: 0,
        enemyDEFFlat: 0,

        atkCoef: (char.atkCoef ?? 1) * (char.weapon === 'SG' ? 1 / (char.pelletCount ?? 10) : 1),
        finalATKModifier: 0,
        normalAtkMultiplier: char.normalAtkMultiplier ?? 0,
        isNormalAttack: true,

        isCrit: false,
        critBonusBase: critBonus,
        extraCritDmg: 0,
        isCore: false,
        coreHitBonus,
        coreHitMultiplier: char.coreHitMultiplier ?? 0,
        fullBurstBonus: 0,
        rangeBonus,

        weakPointBase: isWeakPoint ? 1.1 : 1.0,
        weakPointExtra: isWeakPoint ? (char.equipWeakPointPercent ?? 0) : 0,

        chargeDmgBonus: (char.weapon === 'RL' || char.weapon === 'SR') ? (char.fullChargeDamage ?? 0) : 0,
        chargeDmgMultiplier: char.chargeDmgMultiplier ?? 0,

        atkDmgUp: 0,
        dotDmgUp: 0,
        pierceDmgUp: 0,
        partDmgUp: 0,
        ignoreDefDmgUp: 0,
        projectileDmgUp: 0,
        interruptionPartDmgUp: 0,
        extraDmgUp: 0,

        enemyTakenUp,
        shareDmgUp: 0,
        enemyTakenDown: 0,
    };

    return {
        normal: calcNikkeDamage({ ...baseParams, isCrit: false, isCore: false }),
        crit: calcNikkeDamage({ ...baseParams, isCrit: true, isCore: false }),
        core: calcNikkeDamage({ ...baseParams, isCrit: false, isCore: true }),
        coreCrit: calcNikkeDamage({ ...baseParams, isCrit: true, isCore: true }),
        fbNormal: calcNikkeDamage({ ...baseParams, isCrit: false, isCore: false, fullBurstBonus: 0.5 }),
        fbCrit: calcNikkeDamage({ ...baseParams, isCrit: true, isCore: false, fullBurstBonus: 0.5 }),
        fbCore: calcNikkeDamage({ ...baseParams, isCrit: false, isCore: true, fullBurstBonus: 0.5 }),
        fbCoreCrit: calcNikkeDamage({ ...baseParams, isCrit: true, isCore: true, fullBurstBonus: 0.5 }),
    };
};
