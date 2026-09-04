import { BattleContext, Character } from "../types/battle";
import { calcNikkeDamage } from "./nikkeFormula";
import { WeaponType, resolveHit, ResolveHitParams } from "./accuraySystem";
import { heatWarmupByTime, coolWarmupLevel, getMgFireRate } from "./mgWarmup";
import { getWeaponMultipliers, getWeaponRangeBonus, RangeMode } from "../constants/weaponStats";
import { checkAdvantage } from "../utils/charUtils";
import { decrementBulletBuffs } from "./skillResolver";

/** 기본 SG 펠릿 수 */
const DEFAULT_PELLET_COUNT = 10;

/* =========================
   메인 공격 처리
========================= */

export function processAttack(ctx: BattleContext) {
    const dt = ctx.delta;
    const rangeMode: RangeMode = (ctx.config as any).rangeMode ?? 0;

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
        const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;

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
            const fixedChargeTime = buffs?.charge_time_fixed;
            const chargeSpeedBuff = (buffs ? (buffs.charge_speed_pct || 0) / 100 : (char.buff?.chargeSpeed ?? 0));
            const chargeSeconds = (typeof fixedChargeTime === 'number' && fixedChargeTime > 0)
                ? fixedChargeTime
                : Math.max(0.01, (char.chargeTime || 1) * (1 - chargeSpeedBuff));
            char.currentCharge = (char.currentCharge || 0) + (dt / chargeSeconds);

            if (char.currentCharge >= 1.0) {
                shotsToFire = 1;
                char.currentCharge -= 1.0;
                isChargeAttack = true;
            }
        } else {
            // 일반 연사 (AR / SMG / SG / MG)
            let effectiveFireRate = char.fireRate * (1 + (buffs ? buffs.attack_speed_pct / 100 : 0));
            if (isMG) {
                effectiveFireRate = getMgFireRate(effectiveFireRate, char.warmupLevel ?? 0);
            }

            char.fireAccumulator = (char.fireAccumulator || 0) + effectiveFireRate * dt;
            const shotsThisTick = Math.floor(char.fireAccumulator);
            shotsToFire = Math.min(char.ammo, shotsThisTick);
            if (shotsToFire > 0) {
                char.fireAccumulator -= shotsToFire;
            }
        }

        for (let i = 0; i < shotsToFire; i++) {
            if (char.ammo === 1 && ctx.buffManager) {
                ctx.buffManager.notify('last_bullet_fire', ctx.time, char.id, ctx);
            }

            if (isSG) {
                // SG: 펠릿 시스템 — 탄 1발 = 펠릿 N개, 각각 독립 명중 판정
                const pelletDmg = calcShotgunDamage(char, ctx, rangeMode);
                applyDamage(ctx, pelletDmg, char.id);
            } else {
                // 일반 단발 처리 (RL는 추후 폭발 반경 데미지를 추가 구현 예정이므로 임시로 1타격으로 고정)
                const result = calcCharacterDamage(char, ctx, isChargeAttack, rangeMode);
                const simulatedHits = 1;
                applyDamage(ctx, result.damage * simulatedHits, char.id);

                // 코어 히트 통지 (AR/SMG/MG/SR/RL)
                if (ctx.buffManager && result.isCore) {
                    ctx.buffManager.notify('core_hit', ctx.time, char.id, ctx);
                }
            }

            char.ammo -= 1;
            char.totalAmmoUsed = (char.totalAmmoUsed || 0) + 1;
            char.comboShots = (char.comboShots || 0) + 1;
            ctx.totalAmmoUsed++;
            ctx.totalTeamAmmoUsed++;

            if (ctx.buffManager) {
                ctx.buffManager.notify('normal_atk', ctx.time, char.id, ctx);
                ctx.buffManager.notify('hit_count', ctx.time, char.id, ctx);
                if (char.ammo === 0) {
                    ctx.buffManager.notify('last_bullet', ctx.time, char.id, ctx);
                }
                if (isChargeAttack) {
                    ctx.buffManager.notify('full_charge', ctx.time, char.id, ctx);
                    ctx.buffManager.notify('full_charge_hit', ctx.time, char.id, ctx);
                }
                ctx.buffManager.consumeBulletBuff(char.id, ctx);
            }

            // 택티컬 베어 큐브: 10발 사격 시 탄환 충전
            if (char.cubeBastionRefund && char.cubeBastionRefund > 0 && char.comboShots % 10 === 0) {
                char.ammo = Math.min(char.ammo + char.cubeBastionRefund, char.maxAmmo);
            }

            // bullet 기반 버프 카운터 감소 (legacy fallback)
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

function canAttack(char: Character, ctx?: BattleContext): boolean {
    // infinite_ammo 활성 시 탄환 소모 없이 공격 가능
    if (ctx?.buffManager?.hasInfiniteAmmo(char.id)) return char.reloadRemain <= 0;
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
    rangeMode: RangeMode,
    isChargeAttack: boolean = false
): number {
    let totalDmg = 0;
    const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;
    let pelletCount: number;
    if (typeof buffs?.pellet_count_fixed === 'number' && buffs.pellet_count_fixed > 0) {
        // 펠릿 수 고정: 외부 펠릿 증가 버프를 일체 적용하지 않고 고정값 유지
        pelletCount = buffs.pellet_count_fixed;
    } else if (char.weaponOverride?.pelletCount !== undefined) {
        // 무기 변경으로 지정된 고정 펠릿 수: 외부 펠릿 증가 버프 미적용
        pelletCount = char.weaponOverride.pelletCount;
    } else {
        const basePellets = (char as any).pelletCount ?? DEFAULT_PELLET_COUNT;
        pelletCount = basePellets + (buffs?.pellet_count || 0);
    }
    const hasCore = ctx.enemy.corePx !== undefined ? ctx.enemy.corePx > 0 : !!(char.coreDamage);
    const corePx = ctx.enemy.corePx !== undefined ? ctx.enemy.corePx : undefined;
    const pelletAtkCoefScale = pelletCount > 0 ? (1.0 / pelletCount) : 1.0;

    for (let p = 0; p < pelletCount; p++) {
        const hitParams: ResolveHitParams = {
            weapon: WeaponType.SG,
            rangeMode,
            accuracyBuff: (buffs ? buffs.accuracy_pct : 0) + ((char.accuracyBuff ?? 0) * 100),
            rng: ctx.rng,
            hasCore,
            corePx,
        };

        const hitResult = resolveHit(hitParams);
        if (!hitResult.hit) continue; // 빗나감

        // 크리티컬 판정 (각 펠릿 독립)
        const critChance = (buffs ? buffs.crit_rate : (char.crit + (char.buff?.critRate || 0))) / 100;
        const isCrit = ctx.rng.next() < critChance;

        const params = buildDamageParams(char, ctx, isCrit, hitResult.isCore, isChargeAttack, pelletAtkCoefScale, rangeMode);
        totalDmg += calcNikkeDamage(params);

        if (ctx.buffManager) {
            ctx.buffManager.notify('pellet_hit', ctx.time, char.id, ctx);
            if (hitResult.isCore) {
                ctx.buffManager.notify('core_hit', ctx.time, char.id, ctx);
            }
        }
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
): { damage: number; isCore: boolean } {
    const weapon = (char.weapon as WeaponType) ?? WeaponType.AR;
    const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;
    const hasCore = ctx.enemy.corePx !== undefined ? ctx.enemy.corePx > 0 : !!(char.coreDamage);
    const corePx = ctx.enemy.corePx !== undefined ? ctx.enemy.corePx : undefined;

    // resolveHit으로 코어 판정 (SG 외 무기는 빗나감 없음 — 명중률.md 참조)
    const hitParams: ResolveHitParams = {
        weapon,
        rangeMode,
        accuracyBuff: (buffs ? buffs.accuracy_pct : 0) + ((char.accuracyBuff ?? 0) * 100),
        warmupLevel: weapon === WeaponType.MG ? (char.warmupLevel ?? 0) : undefined,
        rng: ctx.rng,
        hasCore,
        corePx,
    };

    const hitResult = resolveHit(hitParams);

    // 크리티컬 판정
    const critChance = (buffs ? buffs.crit_rate : (char.crit + (char.buff?.critRate || 0))) / 100;
    const isCrit = ctx.rng.next() < critChance;

    const params = buildDamageParams(char, ctx, isCrit, hitResult.isCore, isChargeAttack, 1.0, rangeMode);
    return { damage: calcNikkeDamage(params), isCore: hitResult.isCore };
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
    atkCoefScale: number, // 펠릿 분할 배율 (일반: 1.0, SG 1/N)
    rangeMode: RangeMode = (ctx.config as any)?.rangeMode ?? 0
) {
    const wm = getWeaponMultipliers(char.weapon);
    const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;
    const enemyBuffs = ctx.buffManager ? ctx.buffManager.getBuffs('__enemy__', char.id, ctx, ctx.time) : null;

    const atkPct = (char.equipATKPercent ?? 0) + (buffs ? buffs.atk_pct / 100 : (char.buff?.atk ?? 0));
    // BuffManager가 정본 — char.buff는 BuffManager가 없을 때만 fallback (calc-master _fire()와 동일)
    const atkFlat = buffs ? buffs.atk_flat : (char.buff?.extraATK ?? 0);
    const defDownPct = buffs?.enemy_def_down_pct ?? 0;

    return {
        /* ① 기본 데미지 */
        baseATK: char.atk,
        extraATKPercent: atkPct,
        extraATKFlat: atkFlat,
        enemyBaseDEF: ctx.enemy.defense,
        enemyDEFPercent: defDownPct ? -(defDownPct / 100) : 0,
        enemyDEFFlat: ctx.enemy.debuff?.defFlat ?? 0,

        /* ② Final ATK Modifier & Normal ATK Multiplier */
        atkCoef: (char.atkCoef ?? 1) * atkCoefScale,
        finalATKModifier: 0,  // PARSING.md에 final_atk_pct 없음, 0으로 고정
        normalAtkMultiplier: (char.normalAtkMultiplier ?? 0) + (buffs?.normal_atk_dmg_pct ?? 0),
        isNormalAttack: true,

        /* ③ Major Modifiers */
        isCrit,
        critBonusBase: (char.critMult ? (char.critMult - 1) : wm.critBonus) + (char.equipCritDmgPercent ?? 0),
        extraCritDmg: buffs ? buffs.crit_dmg / 100 : (char.buff?.critDmg ?? 0),
        isCore,
        coreHitBonus: (char.coreDamage ? (char.coreDamage / 100 - 1) : wm.coreHitBonus) + (buffs ? buffs.core_dmg_pct / 100 : 0),
        coreHitMultiplier: char.coreHitMultiplier ?? 0,
        fullBurstBonus: ctx.burstActive ? 0.5 : 0,
        rangeBonus: getWeaponRangeBonus(char.weapon, rangeMode),

        /* ④ Element Bonus */
        weakPointBase: checkAdvantage(ctx.enemy.element, char.element, char.id, ctx) ? 1.1 : 1.0,
        weakPointExtra: (buffs ? buffs.element_bonus_pct / 100 : ((char.buff?.weak ?? 0) + (char.buff?.elementDmgUp ?? 0))) + (checkAdvantage(ctx.enemy.element, char.element, char.id, ctx) ? (char.equipWeakPointPercent ?? 0) : 0),

        /* ⑤ Charge Damage */
        chargeDmgBonus: isChargeAttack ? ((1 + (char.fullChargeDamage ?? 0)) * (1 + (buffs ? buffs.charge_dmg_pct / 100 : (char.buff?.chargeDmg ?? 0))) - 1) : 0, // charge는 이미 OR 패턴
        chargeDmgMultiplier: char.chargeDmgMultiplier ?? 0,

        /* ⑥ Damage Up */
        atkDmgUp: buffs ? buffs.atk_dmg_pct / 100 : (char.buff?.atkDmgUpFinal ?? 0),
        dotDmgUp: buffs ? buffs.dot_dmg_pct / 100 : (char.buff?.dot ?? 0),
        pierceDmgUp: (char.cubePierceDmgUp ?? 0) + (buffs ? buffs.pierce_dmg_pct / 100 : (char.buff?.pierce ?? 0)),
        partDmgUp: (char.cubePartDmgUp ?? 0) + (buffs ? buffs.part_dmg_pct / 100 : (char.buff?.partDmgUp ?? 0)),
        extraDmgUp: 0,

        /* ⑦ Damage Taken */
        enemyTakenUp: (enemyBuffs ? enemyBuffs.received_dmg / 100 : 0) + (ctx.enemy.debuff?.takenUp ?? 0),
        shareDmgUp: (buffs ? buffs.split_dmg_pct / 100 : 0) + (char.cubeSplitDmgUp ?? 0),
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
    type: string = 'attack',
    skillName?: string,
    description?: string
) {
    ctx.enemy.hp -= dmg;
    ctx.totalDamage += dmg;

    const logEntry: any = {
        time: ctx.time,
        type,
        value: dmg,
        source,
    };
    if (skillName) logEntry.skillName = skillName;
    if (description) logEntry.description = description;
    ctx.log.push(logEntry);
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

    // 차지 공격 처리 (chargeTime 또는 charge_time_fixed 기반)
    const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;
    const fixedChargeTime = buffs?.charge_time_fixed;
    const chargeSpeedBuff = buffs ? (buffs.charge_speed_pct || 0) / 100 : (char.buff?.chargeSpeed ?? 0);
    const chargeSeconds = (typeof fixedChargeTime === 'number' && fixedChargeTime > 0)
        ? fixedChargeTime
        : Math.max(0.01, (char.chargeTime || 1) * (1 - chargeSpeedBuff));

    char.currentCharge = (char.currentCharge || 0) + (dt / chargeSeconds);

    if (char.currentCharge >= 1.0) {
        char.currentCharge -= 1.0;

        // 대미지 계산: SG 무기(펠릿)인 경우 calcShotgunDamage, 그 외 단발 calcCharacterDamage
        const isSG = (char.weapon as WeaponType) === WeaponType.SG;
        let totalDmg = 0;
        if (isSG) {
            totalDmg = calcShotgunDamage(char, ctx, rangeMode, true);
        } else {
            const result = calcCharacterDamage(char, ctx, true, rangeMode);
            totalDmg = result.damage;
            if (ctx.buffManager && result.isCore) {
                ctx.buffManager.notify('core_hit', ctx.time, char.id, ctx);
            }
        }

        // weaponOverride 중 변경된 스킬 이름 추적 및 weapon_change 태그 부여
        const overrideSkillName = (char as any).weaponOverrideSkillName || '';
        applyDamage(ctx, totalDmg, char.id, 'skill_damage', overrideSkillName, 'weapon_change');

        // 탄약 소모 및 버프 소모
        char.ammo -= 1;
        char.totalAmmoUsed = (char.totalAmmoUsed || 0) + 1;
        char.comboShots = (char.comboShots || 0) + 1;
        ctx.totalAmmoUsed++;
        ctx.totalTeamAmmoUsed++;

        if (ctx.buffManager) {
            ctx.buffManager.notify('normal_atk', ctx.time, char.id, ctx);
            ctx.buffManager.notify('hit_count', ctx.time, char.id, ctx);
            ctx.buffManager.notify('full_charge', ctx.time, char.id, ctx);
            ctx.buffManager.notify('full_charge_hit', ctx.time, char.id, ctx);
            if (char.ammo === 0) {
                ctx.buffManager.notify('last_bullet', ctx.time, char.id, ctx);
            }
            ctx.buffManager.consumeBulletBuff(char.id, ctx);
        }

        // full_charge_attack 트리거 플래그
        ctx.state = ctx.state || {};
        ctx.state[`${char.id}_fullcharge_flag`] = true;
    }
}