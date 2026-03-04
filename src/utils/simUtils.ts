/**
 * 누적 데미지 차트 데이터 생성 (attack + skill_damage 모두 집계)
 * @param result - 시뮬레이션 결과
 * @param duration - 시뮬레이션 시간(초)
 * @param sourceFilter - 특정 캐릭터 ID로 필터링 (없으면 전체)
 */
export const generateChartData = (
    result: any,
    duration: number,
    sourceFilter?: string
) => {
    const DAMAGE_TYPES = new Set(['attack', 'skill_damage']);
    const aggregated: { [second: number]: number } = {};
    for (const log of result.log) {
        if (!DAMAGE_TYPES.has(log.type)) continue;
        if (sourceFilter && log.source !== sourceFilter) continue;
        const sec = Math.floor(log.time);
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

export interface BurstWindow {
    start: number;
    end: number;
}

export const generateBurstWindows = (
    log: any[],
    duration: number,
): BurstWindow[] => {
    const windows: BurstWindow[] = [];
    let startTime: number | null = null;

    for (const entry of log) {
        if (entry.type === 'burst') {
            if (entry.description === 'full_burst_start') {
                startTime = entry.time;
            } else if (entry.description === 'full_burst_end' && startTime !== null) {
                windows.push({ start: startTime, end: Math.min(duration, entry.time) });
                startTime = null;
            }
        }
    }

    // 전투 종료 시 풀버스트가 진행 중이었다면 닫기
    if (startTime !== null) {
        windows.push({ start: startTime, end: duration });
    }

    return windows;
};

/** 스킬 데미지만 집계한 누적 차트 데이터 (현재 그래프에서 미사용) */
export const generateSkillChartData = (result: any, duration: number) => {
    const aggregated: { [second: number]: number } = {};
    for (const log of result.log) {
        if (log.type === 'skill_damage') {
            const sec = Math.floor(log.time);
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
        normalAtkMultiplier?: number;
        coreDamage?: number;
        critMult?: number;
        fullChargeDamage?: number;
    },
    enemyDef: number,
    rangeMode: RangeMode = 'mid',
    isWeakPoint: boolean = false,
    enemyTakenUp: number = 0
): HitDamages => {
    const wm = getWeaponMultipliers(char.weapon);
    const rangeBonus = getWeaponRangeBonus(char.weapon, rangeMode);
    const coreHitBonus = char.coreDamage ? (char.coreDamage / 100 - 1) : wm.coreHitBonus;
    const critBonus = char.critMult ? (char.critMult - 1) : wm.critBonus;

    // nikkeFormula.calcNikkeDamage와 동일한 파라미터 구조 사용
    const baseParams = {
        baseATK: char.atk,
        extraATKPercent: char.equipATKPercent ?? 0,
        extraATKFlat: 0,
        enemyBaseDEF: enemyDef,
        enemyDEFPercent: 0,
        enemyDEFFlat: 0,

        atkCoef: char.atkCoef ?? 1,
        finalATKModifier: 0,
        normalAtkMultiplier: char.normalAtkMultiplier ?? 0,
        isNormalAttack: true,

        isCrit: false,
        critBonusBase: critBonus,
        extraCritDmg: 0,
        isCore: false,
        coreHitBonus,
        fullBurstBonus: 0,
        rangeBonus,

        weakPointBase: isWeakPoint ? 1.1 : 1.0,
        weakPointExtra: isWeakPoint ? (char.equipWeakPointPercent ?? 0) : 0,

        chargeDmgBonus: (char.weapon === 'RL' || char.weapon === 'SR') ? (char.fullChargeDamage ?? 0) : 0,

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
    };
};
