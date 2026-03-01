// engine/damageCalc.ts

import { BattleContext, Character } from "../types/battle";
import { calcNikkeDamage } from "./nikkeFormula";
import { checkHit, WeaponType } from "./accuraySystem";
import { updateWarmupLevel, getMgFireRate, getMgAccuracy } from "./mgWarmup";

/* =========================
   메인 공격 처리
========================= */

export function processAttack(ctx: BattleContext) {
    const dt = ctx.delta;

    ctx.team.members.forEach((char) => {
        const isMG = char.weapon === WeaponType.MG;
        const isFiring = canAttack(char);

        // MG 예열 레벨 업데이트 (매 tick, 발사 중이면 가열 / 아니면 냉각)
        if (isMG) {
            char.warmupLevel = updateWarmupLevel(
                char.warmupLevel ?? 0,
                dt,
                isFiring
            );
        }

        if (!isFiring) {
            // 재장전 중 또는 탄 없음 → 반동/콤보 초기화
            char.fireAccumulator = 0;
            char.comboShots = 0;
            return;
        }

        // MG 예열: fireRate 보정
        let effectiveFireRate = char.fireRate;
        if (isMG) {
            effectiveFireRate = getMgFireRate(char.fireRate, char.warmupLevel ?? 0);
        }

        char.fireAccumulator = (char.fireAccumulator || 0) + effectiveFireRate * dt;

        const shotsThisTick = Math.floor(char.fireAccumulator);
        const shotsToFire = Math.min(char.ammo, shotsThisTick);

        if (shotsToFire > 0) {
            char.fireAccumulator -= shotsToFire;
        }

        for (let i = 0; i < shotsToFire; i++) {
            const dmg = calcCharacterDamage(char, ctx);

            applyDamage(ctx, dmg, char.id);

            char.ammo -= 1;
            char.totalAmmoUsed = (char.totalAmmoUsed || 0) + 1;
            char.comboShots = (char.comboShots || 0) + 1;
            ctx.totalAmmoUsed++;
        }
    });
}

/* =========================
   공격 가능 여부
========================= */

function canAttack(char: Character): boolean {
    return char.reloadRemain <= 0 && char.ammo > 0;
}

/* =========================
   캐릭터별 데미지 계산
========================= */

function calcCharacterDamage(
    char: Character,
    ctx: BattleContext
): number {
    // 크리티컬 판정
    const isCrit = ctx.rng.next() < char.crit / 100;

    // 코어 히트 판정 (accuraySystem 명중률 기반)
    const weaponType = (char.weapon as WeaponType) ?? WeaponType.AR;

    // MG 예열에 따른 명중률 보정
    let accuracyBuff = char.accuracyBuff ?? 0;
    if (weaponType === WeaponType.MG) {
        const mgAccuracy = getMgAccuracy(char.warmupLevel ?? 0);
        // MG base accuracy(1.0)에 예열 감소분을 accuracyBuff으로 반영
        accuracyBuff += mgAccuracy - 1;
    }

    const isCore = char.coreDamage
        ? checkHit({
            weapon: weaponType,
            distance: ctx.state?.distance ?? 15,
            comboShots: char.comboShots ?? 0,
            accuracyBuff,
            rng: ctx.rng,
        })
        : false;

    const params = buildDamageParams(char, ctx, isCrit, isCore);
    return calcNikkeDamage(params);
}

/* =========================
   공식 파라미터 생성
   이미지 공식 7항목에 맞게 매핑
========================= */

function buildDamageParams(
    char: Character,
    ctx: BattleContext,
    isCrit: boolean,
    isCore: boolean
) {
    return {
        /* ① 기본 데미지 */
        baseATK: char.atk,
        extraATKPercent: char.equipATKPercent ?? 0,   // 장비 추가 공격력%
        extraATKFlat: char.buff?.extraATK ?? 0,      // 스킬 attack_power_up 등 평탄 추가
        enemyBaseDEF: ctx.enemy.defense,
        enemyDEFPercent: 0,                          // 적 DEF% 증가 (현재 미구현)

        /* ② Final ATK Modifier */
        atkCoef: char.atkCoef ?? 1,
        finalATKModifier: char.buff?.atkDmgUp ?? 0,  // Final ATK 관련 버프

        /* ③ Major Modifiers (가산) */
        isCrit,
        critBonusBase: 0.5,                          // 크리 기본 보너스 (항상 0.5)
        extraCritDmg: char.buff?.critDmg ?? 0,       // 추가 크리 데미지 소스
        isCore,
        coreHitBonus: char.coreHitBonus ?? 1.0,      // 코어 히트 보너스 (1.0 or 1.5)
        fullBurstBonus: ctx.burstActive ? 0.5 : 0,   // 풀버스트 보너스 (0.5)
        rangeBonus: char.buff?.range ?? 0,            // 유효 사거리 보너스

        /* ④ Element Bonus Damage */
        weakPointBase: 1.1,                           // 원소 코드 기본 보너스
        weakPointExtra: (char.buff?.weak ?? 0) + (char.equipWeakPointPercent ?? 0), // 추가 원소 + 장비 우월코드%

        /* ⑤ Charge Damage */
        chargeDmgBonus: char.buff?.chargeDmg ?? 0,   // 비차지 무기 = 0

        /* ⑥ Damage Up (버프형 데미지 증가) */
        atkDmgUp: char.buff?.atkDmgUpFinal ?? 0,     // 공격 데미지 증가 (Final ATK Mod 위에 있는 것은 별도 처리)
        dotDmgUp: char.buff?.dot ?? 0,               // 지속 데미지 증가
        pierceDmgUp: char.buff?.pierce ?? 0,         // 관통 데미지 증가
        partDmgUp: char.buff?.part ?? 0,             // 파츠 데미지 증가
        ignoreDefDmgUp: char.buff?.ignoreDef ?? 0,   // 방어력 무시 (True Damage)
        projectileDmgUp: char.buff?.projectile ?? 0, // 투사체 데미지 증가
        interruptionPartDmgUp: char.buff?.weakPart ?? 0, // 저지 파츠 데미지 증가
        extraDmgUp: 0,

        /* ⑦ Damage Taken */
        enemyTakenUp: ctx.enemy.debuff?.takenUp ?? 0,
        shareDmgUp: 0,
        enemyTakenDown: ctx.enemy.debuff?.takenDown ?? 0,
    };
}

/* =========================
   방어 계산
========================= */

function calcEnemyDef(ctx: BattleContext): number {
    return ctx.enemy.defense;
}

/* =========================
   데미지 적용
========================= */

function applyDamage(
    ctx: BattleContext,
    dmg: number,
    source: string
) {
    ctx.enemy.hp -= dmg;
    ctx.totalDamage += dmg;

    ctx.log.push({
        time: ctx.time,
        type: "attack",
        value: dmg,
        source,
    });
}