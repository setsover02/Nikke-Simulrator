import { Character } from '../types/battle';
import { CollectionGrade, getCollectionEffect } from '../constants/collectionItems';
import { getCubeEffect } from '../constants/cubeData';
import { CLIP_CHARACTERS } from '../engine/ammoSystem';

export interface EquipmentOptions {
    atkPercent: number;        // 추가 공격력% (0.1 = +10%)
    weakPointPercent: number;  // 우월코드 데미지% (0.1 = +10%)
    ammoPercent: number;       // 장탄수% (0.1 = +10%)
    accuracyPercent: number;   // 명중률 증가% (0.1 = +10%)
    chargeDmgPercent: number;  // 차지 대미지 증가% (0.1 = +10%)
    chargeSpeedPercent: number; // 차지 속도 증가% (0.1 = +10%, 차지 시간 감소)
    critRatePercent: number;   // 크리티컬 확률 증가% (0.1 = +10%)
    critDmgPercent: number;    // 크리티컬 대미지 증가% (0.1 = +10%)
    defPercent: number;        // 방어력 증가% (0.1 = +10%)
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
    slotIndex: number = 0,
    skillLevels?: { skill1Level: number; skill2Level: number; burstLevelSkill: number; },
    cubeOptions?: { cubeName: string; cubeLevel: number }
): Character => {
    const s = charData.stats || {};
    const eq = equip || { atkPercent: 0, weakPointPercent: 0, ammoPercent: 0, accuracyPercent: 0, chargeDmgPercent: 0, chargeSpeedPercent: 0, critRatePercent: 0, critDmgPercent: 0, defPercent: 0 };
    const cube = getCubeEffect(cubeOptions?.cubeName || 'None', cubeOptions?.cubeLevel || 0);

    const baseMaxAmmo = s.maxAmmo;
    const collectionEffect = getCollectionEffect(s.weapon, collectionGrade, collectionLevel);
    // 애장품 장착시 장탄수 가산
    const collectionMaxAmmo = Math.floor(baseMaxAmmo * (collectionEffect.maxAmmoMultiplier / 100));
    const finalMaxAmmo = Math.floor(baseMaxAmmo * (1 + eq.ammoPercent + cube.ammoPercent)) + collectionMaxAmmo;

    // 소장품 + 장비 + 큐브 방어력
    const finalDefense = s.defense * (1 + collectionEffect.defenseMultiplier / 100 + eq.defPercent + cube.defPercent);

    // 큐브 + 장비 체력
    const finalHp = Math.floor(s.hp * (1 + cube.hpPercent));

    // 1. 기본 스킬 목록 복제
    let rawSkills: any[] = (charData.skills || []).map((sk: any) => ({ ...sk }));

    // 2. 애장품(SSR) 장착 시 favoriteItem 단계(1~3)에 따라 스킬 슬롯 교체
    if (collectionGrade === 'SSR' && charData.favoriteItem?.stages) {
        const stage = Math.max(1, Math.min(3, collectionLevel || 3));
        for (let st = 1; st <= stage; st++) {
            const stageDef = charData.favoriteItem.stages.find((item: any) => item.stage === st);
            if (stageDef && stageDef.skill) {
                const targetId = stageDef.replaceSlot === 1 ? 'skill_1' : stageDef.replaceSlot === 2 ? 'skill_2' : 'burst';
                const targetIdx = rawSkills.findIndex((sk: any) => sk.id === targetId || (targetId === 'burst' && sk.type === 'burst'));
                if (targetIdx !== -1) {
                    rawSkills[targetIdx] = {
                        ...stageDef.skill,
                        id: targetId,
                        type: targetId === 'burst' ? 'burst' : (rawSkills[targetIdx].type || 'passive'),
                    };
                }
            }
        }
    }

    // 3. 스킬 레벨 적용 및 effect value 추출
    const processedSkills = rawSkills.map((skillDef: any) => {
        let level = 10;
        if (skillLevels) {
            if (skillDef.id === 'skill_1') level = skillLevels.skill1Level || 10;
            if (skillDef.id === 'skill_2') level = skillLevels.skill2Level || 10;
            if (skillDef.id === 'burst' || skillDef.type === 'burst') level = skillLevels.burstLevelSkill || 10;
        }
        const resolveEffects = (effects: any[]): any[] | undefined => {
            if (!effects) return effects;
            return effects.map(eff => ({
                ...eff,
                value: Array.isArray(eff.value) ? eff.value[Math.max(0, Math.min(9, level - 1))] : eff.value,
                effects: eff.effects ? resolveEffects(eff.effects) : undefined
            }));
        };
        return {
            ...skillDef,
            effects: resolveEffects(skillDef.effects)
        };
    });

    const charName = charData.characterName || charData.name || '';
    const isClip = (s.weapon === 'SG' || s.weapon === 'RL') && CLIP_CHARACTERS.has(charName);

    return {
        id: `${charData.characterID || 'unknown'}_${slotIndex}`,
        slotIndex,
        name: charName,
        isClipWeapon: isClip,
        atk: s.atk,
        defense: Math.floor(finalDefense),
        hp: finalHp,
        element: s.element,
        weapon: s.weapon,
        charClass: s.class,
        company: s.company,
        burstLevel: s.burstLevel,
        crit: (s.crit || 15) + (eq.critRatePercent * 100),
        maxAmmo: finalMaxAmmo,
        ammo: finalMaxAmmo,
        reloadTime: cube.reloadSpeedPercent > 0 ? s.reloadTime * (1 - cube.reloadSpeedPercent) : s.reloadTime,
        reloadRemain: 0,
        chargeTime: s.chargeTime ? s.chargeTime * (1 - eq.chargeSpeedPercent - cube.chargeSpeedPercent) : 0,
        fullChargeDamage: s.fullChargeDamage ? (s.fullChargeDamage / 100) - 1 + eq.chargeDmgPercent + cube.chargeDmgPercent : 0,
        currentCharge: 0,
        fireRate: s.fireRate,
        skills: processedSkills,
        atkCoef: (s.atkCoef || 0) / 100,
        critMult: s.critMult || 1.5,
        coreDamage: includeCoreDamage ? (s.coreDamage || 0) : 0,
        coreHitBonus: s.coreHitBonus,
        comboShots: 0,
        accuracyBuff: (s.accuracyBuff ?? 0) + eq.accuracyPercent + cube.accuracyBuff,
        warmupLevel: 0,
        // 장비 추가 옵션
        equipATKPercent: eq.atkPercent,
        equipWeakPointPercent: eq.weakPointPercent + cube.weakPointPercent,
        equipAmmoPercent: eq.ammoPercent,
        equipCritDmgPercent: eq.critDmgPercent,

        // 큐브 대미지 옵션
        cubePartDmgUp: cube.partDmgUp,
        cubePierceDmgUp: cube.pierceDmgUp,
        cubeIgnoreDefDmgUp: cube.ignoreDefDmgUp,
        cubeSplitDmgUp: cube.splitDmgUp,
        cubeBastionRefund: cube.bastionRefund,

        normalAtkMultiplier: collectionEffect.normalAtkMultiplier,
        chargeDmgMultiplier: collectionEffect.chargeDmgMultiplier,
        coreHitMultiplier: collectionEffect.coreHitMultiplier
    };
};
