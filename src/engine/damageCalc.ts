import { BattleContext, Character } from "../types/battle";
import { calcNikkeDamage } from "./nikkeFormula";
import { WeaponType, resolveHit, ResolveHitParams } from "./accuraySystem";
import { heatWarmupByTime, coolWarmupLevel, getMgFireRate } from "./mgWarmup";
import { getWeaponMultipliers } from "../constants/weaponStats";
import { checkAdvantage } from "../utils/charUtils";
import { RangeMode } from "../constants/weaponStats";
import { decrementBulletBuffs } from "./skillResolver";

/** 기본 SG 펠릿 수 */
const DEFAULT_PELLET_COUNT = 10;

/* =========================
   메인 공격 처리
========================= */

export function processAttack(ctx: BattleContext) {
    const dt = ctx.delta;
    const rangeMode: RangeMode = (ctx.config as any).rangeMode ?? 'mid';

    ctx.team.members.forEach((char) => {
        // weaponOverride가 활성이면 차지형 무기로 처리 (무기 변경 효과)
        if (char.weaponOverride) {
            processWeaponOverrideAttack(char, ctx, rangeMode);
            return;
        }

        const weapon = (char.weapon as WeaponType) ?? WeaponType.AR;
        const isMG = weapon === WeaponType.MG;
        const isSG = weapon === WeaponType.SG;
        const isCharge = weapon === WeaponType.SR || weapon === WeaponType.RL;
        const isFiring = canAttack(char);

        // MG: 사격 중이 아닐 때 냉각 (시간 기반)
        if (isMG && !isFiring) {
            char.warmupLevel = coolWarmupLevel(char.warmupLevel ?? 0, dt);
        }

        if (!isFiring) {
            char.fireAccumulator = 0;
            char.currentCharge = 0;
            char.comboShots = 0;
            return;
        }

        let shotsToFire = 0;
        let isChargeAttack = false;

        if (isCharge) {
            // 차징 무기 처리 (SR / RL) — weapon.md 기준
            const chargeSpeedBuff = char.buff?.chargeSpeed ?? 0;
            const chargeSeconds = Math.max(0.01, (char.chargeTime || 1) * (1 - chargeSpeedBuff));
            char.currentCharge = (char.currentCharge || 0) + (dt / chargeSeconds);

            if (char.currentCharge >= 1.0) {
                shotsToFire = 1;
                char.currentCharge -= 1.0;
                isChargeAttack = true;
            }
        } else {
            // 일반 연사 (AR / SMG / SG / MG)
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
            if (isSG) {
                // SG: 펠릿 시스템 — 탄 1발 = 펠릿 N개, 각각 독립 명중 판정
                const pelletDmg = calcShotgunDamage(char, ctx, rangeMode);
                applyDamage(ctx, pelletDmg, char.id);
            } else {
                // 일반 단발 처리 (RL는 추후 폭발 반경 데미지를 추가 구현 예정이므로 임시로 1타격으로 고정)
                const dmg = calcCharacterDamage(char, ctx, isChargeAttack, rangeMode);
                const simulatedHits = 1;
                applyDamage(ctx, dmg * simulatedHits, char.id);
            }

            char.ammo -= 1;
            char.totalAmmoUsed = (char.totalAmmoUsed || 0) + 1;
            char.comboShots = (char.comboShots || 0) + 1;
            ctx.totalAmmoUsed++;
            ctx.totalTeamAmmoUsed++;

            // 택티컬 베어 큐브: 10발 사격 시 탄환 충전
            if (char.cubeBastionRefund && char.cubeBastionRefund > 0 && char.comboShots % 10 === 0) {
                char.ammo = Math.min(char.ammo + char.cubeBastionRefund, char.maxAmmo);
            }

            // bullet 기반 버프 카운터 감소
            decrementBulletBuffs(ctx, char);

            // full_charge_attack 트리거 플래그 설정
            if (isChargeAttack) {
                ctx.state = ctx.state || {};
                ctx.state[`${char.id}_fullcharge_flag`] = true;
            }
        }

        // MG: 사격 후 시간 기반 예열 (+dt 분)
        if (isMG && shotsToFire > 0) {
            char.warmupLevel = heatWarmupByTime(char.warmupLevel ?? 0, dt);
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
   SG 펠릿 총 데미지 계산
   - 탄 1발에 pelletCount번 resolveHit() 호출
   - atkCoef를 펠릿 수로 분할 적용
========================= */

function calcShotgunDamage(
    char: Character,
    ctx: BattleContext,
    rangeMode: RangeMode
): number {
    const pelletCount = (char as any).pelletCount ?? DEFAULT_PELLET_COUNT;
    const pelletAtkCoefScale = 1 / pelletCount; // 각 펠릿에 적용할 atkCoef 비율

    let totalDmg = 0;

    for (let p = 0; p < pelletCount; p++) {
        const hitParams: ResolveHitParams = {
            weapon: WeaponType.SG,
            rangeMode,
            accuracyBuff: char.accuracyBuff ?? 0,
            rng: ctx.rng,
            hasCore: !!(char.coreDamage),
        };

        const hitResult = resolveHit(hitParams);
        if (!hitResult.hit) continue; // 빗나감

        // 크리티컬 판정 (각 펠릿 독립)
        const critChance = (char.crit + (char.buff?.critRate || 0)) / 100;
        const isCrit = ctx.rng.next() < critChance;

        const params = buildDamageParams(char, ctx, isCrit, hitResult.isCore, false, pelletAtkCoefScale);
        totalDmg += calcNikkeDamage(params);
    }

    return totalDmg;
}

/* =========================
   단발 캐릭터 데미지 계산
========================= */

function calcCharacterDamage(
    char: Character,
    ctx: BattleContext,
    isChargeAttack: boolean,
    rangeMode: RangeMode
): number {
    const weapon = (char.weapon as WeaponType) ?? WeaponType.AR;

    // resolveHit으로 명중 + 코어 판정
    const hitParams: ResolveHitParams = {
        weapon,
        rangeMode,
        accuracyBuff: char.accuracyBuff ?? 0,
        warmupLevel: weapon === WeaponType.MG ? (char.warmupLevel ?? 0) : undefined,
        rng: ctx.rng,
        hasCore: !!(char.coreDamage),
    };

    const hitResult = resolveHit(hitParams);
    // AR/SMG/MG/SR/RL은 빗나감 없음 → hit은 항상 true
    // (SG는 calcShotgunDamage에서 호출하므로 여기선 오지 않음)

    // 크리티컬 판정
    const critChance = (char.crit + (char.buff?.critRate || 0)) / 100;
    const isCrit = ctx.rng.next() < critChance;

    const params = buildDamageParams(char, ctx, isCrit, hitResult.isCore, isChargeAttack, 1.0);
    return calcNikkeDamage(params);
}

/* =========================
   공식 파라미터 생성
========================= */

function buildDamageParams(
    char: Character,
    ctx: BattleContext,
    isCrit: boolean,
    isCore: boolean,
    isChargeAttack: boolean,
    atkCoefScale: number // 펠릿 분할 배율 (일반: 1.0, SG 1/N)
) {
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
        atkCoef: (char.atkCoef ?? 1) * atkCoefScale,
        finalATKModifier: char.buff?.atkDmgUp ?? 0,
        normalAtkMultiplier: char.normalAtkMultiplier ?? 0,
        isNormalAttack: true,

        /* ③ Major Modifiers */
        isCrit,
        critBonusBase: (char.critMult ? (char.critMult - 1) : wm.critBonus) + (char.equipCritDmgPercent ?? 0),
        extraCritDmg: char.buff?.critDmg ?? 0,
        isCore,
        coreHitBonus: char.coreDamage ? (char.coreDamage / 100 - 1) : wm.coreHitBonus,
        coreHitMultiplier: char.coreHitMultiplier ?? 0,
        fullBurstBonus: ctx.burstActive ? 0.5 : 0,
        rangeBonus: char.buff?.range ?? 0,

        /* ④ Element Bonus */
        weakPointBase: checkAdvantage(ctx.enemy.element, char.element) ? 1.1 : 1.0,
        weakPointExtra: (char.buff?.weak ?? 0) + (char.buff?.elementDmgUp ?? 0) + (checkAdvantage(ctx.enemy.element, char.element) ? (char.equipWeakPointPercent ?? 0) : 0),

        /* ⑤ Charge Damage */
        chargeDmgBonus: isChargeAttack ? ((1 + (char.fullChargeDamage ?? 0)) * (1 + (char.buff?.chargeDmg ?? 0)) - 1) : 0,
        chargeDmgMultiplier: char.chargeDmgMultiplier ?? 0,

        /* ⑥ Damage Up */
        atkDmgUp: char.buff?.atkDmgUpFinal ?? 0,
        dotDmgUp: char.buff?.dot ?? 0,
        pierceDmgUp: (char.buff?.pierce ?? 0) + (char.cubePierceDmgUp ?? 0),
        partDmgUp: (char.buff?.partDmgUp ?? 0) + (char.cubePartDmgUp ?? 0),
        ignoreDefDmgUp: (char.buff?.ignoreDef ?? 0) + (char.cubeIgnoreDefDmgUp ?? 0),
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
   데미지 적용
========================= */

function applyDamage(
    ctx: BattleContext,
    dmg: number,
    source: string,
    type: string = 'attack'
) {
    ctx.enemy.hp -= dmg;
    ctx.totalDamage += dmg;

    ctx.log.push({
        time: ctx.time,
        type,
        value: dmg,
        source,
    });
}

/* =========================
   무기 변경(weaponOverride) 중 차지 공격 처리
========================= */

function processWeaponOverrideAttack(
    char: Character,
    ctx: BattleContext,
    rangeMode: RangeMode
) {
    const dt = ctx.delta;
    const isFiring = canAttack(char);
    if (!isFiring) {
        char.currentCharge = 0;
        return;
    }

    // 차지 공격 처리 (chargeTime 기반)
    const chargeSpeedBuff = char.buff?.chargeSpeed ?? 0;
    const chargeSeconds = Math.max(0.01, (char.chargeTime || 1) * (1 - chargeSpeedBuff));
    char.currentCharge = (char.currentCharge || 0) + (dt / chargeSeconds);

    if (char.currentCharge >= 1.0) {
        char.currentCharge -= 1.0;

        // 대미지 계산
        const dmg = calcCharacterDamage(char, ctx, true, rangeMode);
        applyDamage(ctx, dmg, char.id, 'skill_damage'); // 스킬 대미지로 기록

        // full_charge_attack 트리거 플래그
        ctx.state = ctx.state || {};
        ctx.state[`${char.id}_fullcharge_flag`] = true;
    }
}