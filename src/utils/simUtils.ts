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

/**
 * 단발 타격 유형별 데미지 계산 (일반 / 크리티컬 / 코어 / 코어+크리티컬)
 * 버프·버스트 없는 기본 스탯 기준, 무기별 배율 + 거리 보너스 적용
 */
export const calcHitDamages = (
    char: { atk: number; atkCoef?: number; weapon?: string; equipATKPercent?: number; equipWeakPointPercent?: number; normalAtkMultiplier?: number; coreDamage?: number; critMult?: number },
    enemyDef: number,
    rangeMode: RangeMode = 'mid',
    isWeakPoint: boolean = false
): HitDamages => {
    const wm = getWeaponMultipliers(char.weapon);
    const rangeBonus = getWeaponRangeBonus(char.weapon, rangeMode);
    // 인게임의 소수점 공격력 및 방어력 연산은 올림(ceil) 되므로 Math.ceil을 적용합니다.
    const effectiveATK = Math.ceil(char.atk * (1 + (char.equipATKPercent ?? 0)));
    const baseDamage = Math.max(1, effectiveATK - enemyDef);
    const atkMod = char.atkCoef ?? 1;
    const normalAtkMult = (char.normalAtkMultiplier ?? 0) / 100;
    const elementBonus = isWeakPoint ? 1.1 + (char.equipWeakPointPercent ?? 0) : 1.0;
    const base = baseDamage * atkMod * (1 + normalAtkMult) * elementBonus;

    const coreHitBonus = char.coreDamage ? (char.coreDamage / 100 - 1) : wm.coreHitBonus;
    const critBonus = char.critMult ? (char.critMult - 1) : wm.critBonus;

    return {
        normal: Math.round(base * (1 + rangeBonus)),
        crit: Math.round(base * (1 + critBonus + rangeBonus)),
        core: Math.round(base * (1 + coreHitBonus + rangeBonus)),
        coreCrit: Math.round(base * (1 + critBonus + coreHitBonus + rangeBonus)),
    };
};
