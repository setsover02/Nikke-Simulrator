// engine/damageCalc.ts

import { BattleContext, Character } from "../types/battle";
import { calcNikkeDamage } from "./nikkeFormula";

/* =========================
   메인 공격 처리
========================= */

export function processAttack(ctx: BattleContext) {
    const dt = ctx.delta;

    ctx.team.members.forEach((char) => {
        if (!canAttack(char)) return;

        const shots = Math.floor(
            Math.min(char.ammo, char.fireRate * dt)
        );

        for (let i = 0; i < shots; i++) {
            const dmg = calcCharacterDamage(char, ctx);

            applyDamage(ctx, dmg, char.id);

            char.ammo -= 1;
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
    const isCrit = ctx.rng.next() < char.crit / 100;

    const params = buildDamageParams(char, ctx, isCrit);

    return calcNikkeDamage(params);
}

/* =========================
   공식 파라미터 생성
========================= */

function buildDamageParams(
    char: Character,
    ctx: BattleContext,
    isCrit: boolean
) {
    return {
        /* Base */
        baseATK: char.atk,
        extraATKBonus: char.buff?.extraATK ?? 0,
        enemyDEFCoef: calcEnemyDef(ctx),
        atkCoef: char.atkCoef ?? 1,

        /* Base Bonus */
        bonusAtk: char.buff?.atkDmgUp ?? 0,
        critBonusBase: 0,
        meleeBonus: char.buff?.melee ?? 0,
        rangeBonus: char.buff?.range ?? 0,
        fullBurstBonus: ctx.burstActive ? 0.5 : 0,

        /* Type Bonus */
        atkDmgUp: char.buff?.atkDmgUp ?? 0,
        partDmgUp: char.buff?.part ?? 0,
        pierceDmgUp: char.buff?.pierce ?? 0,
        dotDmgUp: char.buff?.dot ?? 0,
        ignoreDefDmgUp: char.buff?.ignoreDef ?? 0,
        projectileDmgUp: char.buff?.projectile ?? 0,
        weakPartDmgUp: char.buff?.weakPart ?? 0,
        extraDmgUp: 0,

        /* Crit */
        isCrit,
        critMultiplier: char.critMult ?? 2.5,
        extraCritDmg: char.buff?.critDmg ?? 0,

        /* Weak */
        weakPointBase: 1.1,
        weakPointExtra: char.buff?.weak ?? 0,

        /* Taken */
        enemyTakenUp: ctx.enemy.debuff?.takenUp ?? 0,
        shareDmgUp: 0,
        enemyTakenDown: ctx.enemy.debuff?.takenDown ?? 0,
    };
}

/* =========================
   방어 계산
========================= */

function calcEnemyDef(ctx: BattleContext): number {
    return ctx.enemy.defense / 1000;
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