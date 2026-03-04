import { Character } from '../types/battle';
import { CollectionGrade, getCollectionEffect } from '../constants/collectionItems';

export interface EquipmentOptions {
    atkPercent: number;        // 추가 공격력% (0.1 = +10%)
    weakPointPercent: number;  // 우월코드 데미지% (0.1 = +10%)
    ammoPercent: number;       // 장탄수% (0.1 = +10%)
}

/**
 * 캐릭터가 적에게 우월코드 보너스를 받는지 판정합니다.
 *
 * 상성 관계 (element.md 기준):
 *   철갑 > 전격 > 수냉 > 작열 > 풍압 > 철갑
 *
 * @param enemyWeakCode  적의 약점 코드 (SimToolbar "약점 속성" 선택값)
 * @param charElement    캐릭터 코드
 * @returns 캐릭터 코드가 적의 약점 코드와 일치하면 true (우월코드 보너스 적용)
 */
export function checkAdvantage(enemyWeakCode: string | undefined, charElement: string | undefined): boolean {
    if (!enemyWeakCode || !charElement) return false;
    // 적의 약점 코드 = 캐릭터 코드 → 우월코드 보너스 적용
    return enemyWeakCode === charElement;
}

export const applyBaseStats = (
    charData: any,
    includeCoreDamage: boolean,
    equip?: EquipmentOptions,
    collectionGrade: CollectionGrade = 'None',
    collectionLevel: number = 0,
    slotIndex: number = 0
): Character => {
    const s = charData.stats || {};
    const eq = equip || { atkPercent: 0, weakPointPercent: 0, ammoPercent: 0 };

    const baseMaxAmmo = s.maxAmmo;
    const finalMaxAmmo = Math.floor(baseMaxAmmo * (1 + eq.ammoPercent));

    // 소장품 효과 적용 (SG, SMG 한정)
    const collectionEffect = getCollectionEffect(s.weapon, collectionGrade, collectionLevel);
    const finalDefense = s.defense * (1 + collectionEffect.defenseMultiplier / 100);

    return {
        id: `${charData.characterID || 'unknown'}_${slotIndex}`,
        slotIndex,
        atk: s.atk,
        defense: Math.floor(finalDefense),
        hp: s.hp,
        element: s.element,
        weapon: s.weapon,
        charClass: s.class,
        company: s.company,
        burstLevel: s.burstLevel,
        crit: s.crit || 15,
        maxAmmo: finalMaxAmmo,
        ammo: finalMaxAmmo,
        reloadTime: s.reloadTime,
        reloadRemain: 0,
        chargeTime: s.chargeTime || 0,
        fullChargeDamage: s.fullChargeDamage ? (s.fullChargeDamage / 100) - 1 : 0,
        currentCharge: 0,
        fireRate: s.fireRate,
        skills: charData.skills || [],
        atkCoef: (s.atkCoef || 0) / 100,
        critMult: s.critMult || 1.5,
        coreDamage: includeCoreDamage ? (s.coreDamage || 0) : 0,
        coreHitBonus: s.coreHitBonus ?? 1.0,
        comboShots: 0,
        accuracyBuff: s.accuracyBuff ?? 0,
        warmupLevel: 0,
        // 장비 추가 옵션
        equipATKPercent: eq.atkPercent,
        equipWeakPointPercent: eq.weakPointPercent,
        equipAmmoPercent: eq.ammoPercent,

        normalAtkMultiplier: collectionEffect.normalAtkMultiplier
    };
};
