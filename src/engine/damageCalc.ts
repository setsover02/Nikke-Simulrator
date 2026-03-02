import { BattleContext, Character } from "../types/battle";
import { calcNikkeDamage } from "./nikkeFormula";
import { checkHit, WeaponType } from "./accuraySystem";
import { heatWarmupByBullets, coolWarmupLevel, getMgFireRate, getMgAccuracy } from "./mgWarmup";
import { getWeaponMultipliers } from "../constants/weaponStats";
import { checkAdvantage } from "../utils/charUtils";

/* =========================
   메인 공격 처리
========================= */

export function processAttack(ctx: BattleContext) {
    const dt = ctx.delta;

    ctx.team.members.forEach((char) => {
        const isMG = char.weapon === WeaponType.MG;
        const isChargeWeapon = char.weapon === WeaponType.RL || char.weapon === WeaponType.SR;
        const isFiring = canAttack(char);

        // MG 냉각 처리 (발사 중이 아닐 때만)
        if (isMG && !isFiring) {
            char.warmupLevel = coolWarmupLevel(char.warmupLevel ?? 0, dt);
        }

        if (!isFiring) {
            // 재장전 중 또는 탄 없음 → 반동/콤보 초기화
            char.fireAccumulator = 0;
            char.currentCharge = 0;
            char.comboShots = 0;
            return;
        }

        let shotsToFire = 0;
        let isChargeAttack = false;

        if (isChargeWeapon) {
            // 차징 무기 처리 (RL, SR)
            const chargeSeconds = char.chargeTime || 1; // 0초 방어 (기본 1초)
            char.currentCharge = (char.currentCharge || 0) + (dt / chargeSeconds);

            if (char.currentCharge >= 1.0) {
                // 풀 차지 완료 -> 1발 발사
                shotsToFire = 1;
                char.currentCharge -= 1.0;
                isChargeAttack = true; // 풀차지 어택 표시
            }
        } else {
            // 일반 연사 무기 처리 (AR, SMG, SG, MG)
            let effectiveFireRate = char.fireRate;
            if (isMG) {
                effectiveFireRate = getMgFireRate(char.fireRate, char.warmupLevel ?? 0);
            }

            char.fireAccumulator = (char.fireAccumulator || 0) + effectiveFireRate * dt;

            const shotsThisTick = Math.floor(char.fireAccumulator);
            shotsToFire = Math.min(char.ammo, shotsThisTick);

            if (shotsToFire > 0) {
                char.fireAccumulator -= shotsToFire;
            }
        }

        for (let i = 0; i < shotsToFire; i++) {
            const dmg = calcCharacterDamage(char, ctx, isChargeAttack);

            // Simulate AOE Splash Damage for RL
            const simulatedTargetsHit = char.weapon === WeaponType.RL ? 3 : 1;

            applyDamage(ctx, dmg * simulatedTargetsHit, char.id);

            char.ammo -= 1;
            char.totalAmmoUsed = (char.totalAmmoUsed || 0) + 1;
            char.comboShots = (char.comboShots || 0) + 1;
            ctx.totalAmmoUsed++;
        }

        // MG 가열 처리 (실제 발사한 탄환 수만큼)
        if (isMG && shotsToFire > 0) {
            char.warmupLevel = heatWarmupByBullets(char.warmupLevel ?? 0, shotsToFire);
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
    ctx: BattleContext,
    isChargeAttack: boolean = false
): number {
    // 크리티컬 판정 (기본 확률 + 버프 확률)
    const critChance = (char.crit + (char.buff?.critRate || 0)) / 100;
    const isCrit = ctx.rng.next() < critChance;

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

    const params = buildDamageParams(char, ctx, isCrit, isCore, isChargeAttack);
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
    isCore: boolean,
    isChargeAttack: boolean = false
) {
    // 무기별 크리/코어 보정 배율 조회
    const wm = getWeaponMultipliers(char.weapon);

    return {
        /* ① 기본 데미지 */
        baseATK: char.atk,
        extraATKPercent: char.equipATKPercent ?? 0,
        extraATKFlat: char.buff?.extraATK ?? 0,
        enemyBaseDEF: ctx.enemy.defense,
        enemyDEFPercent: 0,
        enemyDEFFlat: ctx.enemy.debuff?.defFlat ?? 0,

        /* ② Final ATK Modifier & Normal ATK Multiplier */
        atkCoef: char.atkCoef ?? 1,
        finalATKModifier: char.buff?.atkDmgUp ?? 0,
        normalAtkMultiplier: char.normalAtkMultiplier ?? 0,

        /* ③ Major Modifiers (가산) — 무기별 배율 적용 및 캐릭터 스탯 오버라이드 */
        isCrit,
        critBonusBase: char.critMult ? (char.critMult - 1) : wm.critBonus,
        extraCritDmg: char.buff?.critDmg ?? 0,
        isCore,
        coreHitBonus: char.coreDamage ? (char.coreDamage / 100 - 1) : wm.coreHitBonus,
        fullBurstBonus: ctx.burstActive ? 0.5 : 0,
        rangeBonus: char.buff?.range ?? 0,

        /* ④ Element Bonus Damage */
        weakPointBase: checkAdvantage(ctx.enemy.element, char.element) ? 1.1 : 1.0,
        weakPointExtra: (char.buff?.weak ?? 0) + (checkAdvantage(ctx.enemy.element, char.element) ? (char.equipWeakPointPercent ?? 0) : 0),

        /* ⑤ Charge Damage */
        chargeDmgBonus: isChargeAttack ? (char.fullChargeDamage ?? 0) : (char.buff?.chargeDmg ?? 0),

        /* ⑥ Damage Up */
        atkDmgUp: char.buff?.atkDmgUpFinal ?? 0,
        dotDmgUp: char.buff?.dot ?? 0,
        pierceDmgUp: char.buff?.pierce ?? 0,
        partDmgUp: char.buff?.part ?? 0,
        ignoreDefDmgUp: char.buff?.ignoreDef ?? 0,
        projectileDmgUp: char.buff?.projectile ?? 0,
        interruptionPartDmgUp: char.buff?.weakPart ?? 0,
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