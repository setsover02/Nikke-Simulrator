import { BattleContext, Character, LogEntry } from "../types/battle";
import { DamageParams } from "../types/damage";
import { calcNikkeDamage } from "./nikkeFormula";
import { checkAdvantage } from "../utils/charUtils";
import { getWeaponMultipliers } from "../constants/weaponStats";

export interface SkillEffectDef {
    trigger?: string;
    target: string;
    effect: string;
    value?: number;
    unit?: string;
    duration?: number | "permanent";
    description?: string;
    interval?: number;
    hits?: number;
    based_on?: string;
    condition?: {
        amount?: number;
        count?: number;
        target_status?: string;
    };
    effects?: Omit<SkillEffectDef, "trigger" | "target">[]; // Nested effects
    status?: string;
}

export interface SkillDef {
    id: string;
    name: string;
    type: "passive" | "active" | "burst";
    cooldown?: number;
    effects: SkillEffectDef[];
}

// engine/skillResolver.ts

export function resolveSkills(ctx: BattleContext) {
    ctx.team.members.forEach((char) => {
        if (!char.skills) return;

        char.skills.forEach((skillDef: any) => {
            const skill = skillDef as SkillDef;

            if (skill.type === "passive") {
                skill.effects.forEach((effectDef) => {
                    handleEffectTrigger(ctx, char, skill.id, effectDef);
                });
            }
        });
    });

    updateBuffTimers(ctx);
}

function handleEffectTrigger(
    ctx: BattleContext,
    sourceChar: Character,
    skillId: string,
    effectDef: SkillEffectDef
) {
    // 1. Trigger Check
    let isTriggered = false;

    // "self_focusing" / "enemy_spawn" -> battle start (time === 0)
    if (effectDef.trigger === "self_focusing" || effectDef.trigger === "enemy_spawn") {
        if (ctx.time === 0) isTriggered = true;
    }

    // "full_burst_start"
    // TODO: implement actual full burst start event detection
    if (effectDef.trigger === "full_burst_start" && ctx.burstActive) {
        // This is a continuous check, properly it should only trigger ONCE per burst start.
        // We need state for this.
        const stateKey = `fb_start_${sourceChar.id}_${skillId}`;
        ctx.state = ctx.state || {};
        if (!ctx.state[stateKey]) {
            isTriggered = true;
            ctx.state[stateKey] = true;
        }
    } else if (!ctx.burstActive && ctx.state && ctx.state[`fb_start_${sourceChar.id}_${skillId}`]) {
        ctx.state[`fb_start_${sourceChar.id}_${skillId}`] = false; // reset when burst ends
    }

    // "full_burst_end"
    if (effectDef.trigger === "full_burst_end") {
        const stateKey = `fb_active_prev_${sourceChar.id}_${skillId}`;
        ctx.state = ctx.state || {};
        const wasActive = ctx.state[stateKey] || false;

        if (wasActive && !ctx.burstActive) {
            isTriggered = true;
        }
        ctx.state[stateKey] = ctx.burstActive;
    }

    // "ammo_consumed"
    if (effectDef.trigger === "ammo_consumed" && effectDef.condition?.amount) {
        const threshold = effectDef.condition.amount;
        const stateKey = `${sourceChar.id}_${skillId}_ammo_consumed`;

        ctx.state = ctx.state || {};
        ctx.state[stateKey] = ctx.state[stateKey] || 0;

        const prevAmmoUsed = ctx.state[stateKey] || 0;
        const currentUsed = ctx.totalAmmoUsed || 0;
        if (currentUsed - prevAmmoUsed >= threshold) {
            isTriggered = true;
            ctx.state[stateKey] = currentUsed; // reset threshold counter
        }
    }

    // "full_burst_time" interval
    if (effectDef.trigger === "full_burst_time" && ctx.burstActive && effectDef.interval) {
        const stateKey = `${sourceChar.id}_${skillId}_fb_timer`;
        ctx.state = ctx.state || {};
        ctx.state[stateKey] = (ctx.state[stateKey] || 0) + ctx.delta;

        if (ctx.state[stateKey] >= effectDef.interval) {
            isTriggered = true;
            ctx.state[stateKey] -= effectDef.interval;
        }
    }

    // "normal_attack_hit" (simulated by ammo consumed for simplicity right now)
    if (effectDef.trigger === "normal_attack_hit" && effectDef.condition?.count) {
        // Only trigger if condition target_status is met
        let statusMet = true;
        if (effectDef.condition.target_status === 'bubble') {
            statusMet = !!(ctx.enemy.debuff?.bubble);
        }

        if (statusMet) {
            const threshold = effectDef.condition.count;
            const stateKey = `${sourceChar.id}_${skillId}_attack_hit`;

            ctx.state = ctx.state || {};
            ctx.state[stateKey] = ctx.state[stateKey] || 0;

            const prevAmmoUsed = ctx.state[stateKey] || 0;
            const currentUsed = ctx.totalAmmoUsed || 0;
            if (currentUsed - prevAmmoUsed >= threshold) {
                isTriggered = true;
                ctx.state[stateKey] = currentUsed;
            }
        }
    }

    // "last_bullet_hit" — 마지막 탄 발사 시 (ammo가 0이 된 순간)
    if (effectDef.trigger === "last_bullet_hit") {
        const stateKey = `${sourceChar.id}_${skillId}_last_bullet`;
        ctx.state = ctx.state || {};
        const wasEmpty = ctx.state[stateKey] || false;

        if (sourceChar.ammo <= 0 && !wasEmpty) {
            isTriggered = true;
            ctx.state[stateKey] = true;
        } else if (sourceChar.ammo > 0) {
            ctx.state[stateKey] = false;
        }
    }

    // 2. Apply Effect if triggered
    if (isTriggered) {
        applyEffect(ctx, sourceChar, effectDef);
    }
}

function applyEffect(ctx: BattleContext, sourceChar: Character, effectDef: SkillEffectDef) {
    let targets: any[] = [];
    if (effectDef.target === "all_allies") targets = ctx.team.members;
    else if (effectDef.target === "self") targets = [sourceChar];
    else if (effectDef.target === "enemy" || effectDef.target === "random_enemies") targets = [ctx.enemy];

    targets.forEach(target => {
        applySpecificEffectToTarget(ctx, sourceChar, target, effectDef);
    });
}

function applySpecificEffectToTarget(ctx: BattleContext, sourceChar: Character, target: any, effectDef: SkillEffectDef) {

    // If effect is nested
    if (effectDef.effects) {
        effectDef.effects.forEach(subEff => {
            // Inherit duration or other properties if needed
            applySpecificEffectToTarget(ctx, sourceChar, target, subEff as SkillEffectDef);
        });
        return;
    }

    // --- Enemy Debuffs & Damage ---
    if (target.hp !== undefined && !target.skills) {
        target.debuff = target.debuff || {};

        if (effectDef.effect === "bubble") {
            target.debuff.bubble = true;
            target.debuff.takenUp = (target.debuff.takenUp || 0) + (effectDef.value || 0) / 100;
            ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, value: effectDef.value, description: "Applied Bubble" });
        }
        if (effectDef.effect === "remove_status" && effectDef.status === "bubble") {
            if (target.debuff.bubble) {
                target.debuff.bubble = false;
                // Need to remove the takenUp value it added, assuming fixed removal for now
                target.debuff.takenUp -= 5.05 / 100;
                ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, description: "Removed Bubble" });
            }
        }
        if (effectDef.effect === "burst_bubble") {
            // similar to takenUp addition
            target.debuff.takenUp = (target.debuff.takenUp || 0) + (effectDef.value || 0) / 100;
        }
        if (effectDef.effect === "damage" || effectDef.effect === "bubble_barrage") {
            const hits = effectDef.hits || 1;
            const dmgPercent = (effectDef.value || 0) / 100;

            // nikkeFormula를 사용해 장비 ATK%, 우월코드%, 방어력, 버프 모두 반영
            const wm = getWeaponMultipliers(sourceChar.weapon);
            const isCrit = ctx.rng.next() < (sourceChar.crit ?? 15) / 100;
            const singleHitDmg = calcNikkeDamage({
                // ① 기본 데미지
                baseATK: sourceChar.atk,
                extraATKPercent: sourceChar.equipATKPercent ?? 0,
                extraATKFlat: sourceChar.buff?.extraATK ?? 0,
                enemyBaseDEF: ctx.enemy.defense,
                enemyDEFPercent: 0,
                // ② Final ATK Modifier (스킬 계수 = dmgPercent)
                atkCoef: dmgPercent,
                finalATKModifier: sourceChar.buff?.atkDmgUp ?? 0,
                // ③ Major Modifiers (무기별 크리 배율 적용)
                isCrit,
                critBonusBase: wm.critBonus,
                extraCritDmg: sourceChar.buff?.critDmg ?? 0,
                isCore: false,       // 스킬은 코어 히트 없음
                coreHitBonus: 0,
                fullBurstBonus: ctx.burstActive ? 0.5 : 0,
                rangeBonus: sourceChar.buff?.range ?? 0,
                // ④ 원소 보너스 (우월코드 포함)
                weakPointBase: checkAdvantage(ctx.enemy.element, sourceChar.element) ? 1.1 : 1.0,
                weakPointExtra: (sourceChar.buff?.weak ?? 0) + (checkAdvantage(ctx.enemy.element, sourceChar.element) ? (sourceChar.equipWeakPointPercent ?? 0) : 0),
                // ⑤~⑥
                chargeDmgBonus: 0,
                atkDmgUp: sourceChar.buff?.atkDmgUpFinal ?? 0,
                dotDmgUp: 0, pierceDmgUp: 0, partDmgUp: 0,
                ignoreDefDmgUp: 0, projectileDmgUp: 0,
                interruptionPartDmgUp: 0, extraDmgUp: 0,
                // ⑦ 받는 데미지
                enemyTakenUp: ctx.enemy.debuff?.takenUp ?? 0,
                shareDmgUp: 0,
                enemyTakenDown: ctx.enemy.debuff?.takenDown ?? 0,
            });

            const totalDmg = singleHitDmg * hits;
            target.hp -= totalDmg;
            ctx.totalDamage += totalDmg;
            ctx.log.push({ time: ctx.time, type: "skill_damage", source: sourceChar.id, value: totalDmg, description: effectDef.effect });
        }
        return;
    }

    // --- Character Buffs ---
    const char = target as Character;
    char.buff = char.buff || {};
    char.buffTimers = char.buffTimers || {};

    let applied = false;

    if (effectDef.effect === "shooting_focus") {
        char.buff.shootingFocus = true;
        applied = true;
    }

    if (effectDef.effect === "attack_damage_up" && effectDef.value) {
        char.buff.atkDmgUp = (char.buff.atkDmgUp || 0) + (effectDef.value / 100);
        applied = true;
    }

    if (effectDef.effect === "burst_gauge_charge" && effectDef.value) {
        ctx.burstGauge = Math.min(100, ctx.burstGauge + effectDef.value);
        ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, value: effectDef.value, description: "Burst Gauge Charged" });
    }

    if (effectDef.effect === "burst_cooldown_reduction" && effectDef.value) {
        if (ctx.burstSystem) {
            ctx.burstSystem.reduceCooldown(effectDef.value);
            ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, value: effectDef.value, description: "Burst Cooldown Reduced" });
        }
        applied = true;
    }

    if (effectDef.effect === "ammo_reload" && effectDef.value) {
        const reloadAmount = Math.floor(char.maxAmmo * (effectDef.value / 100));
        char.ammo = Math.min(char.maxAmmo, char.ammo + reloadAmount);
        ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, value: reloadAmount, description: "Ammo Reloaded" });
        applied = true;
    }

    if (effectDef.effect === "attack_power_up" && effectDef.value) {
        char.buff.extraATK = (char.buff.extraATK || 0) + (sourceChar.atk * (effectDef.value / 100));
        applied = true;
    }

    if (effectDef.effect === "stun") {
        ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, description: "Enemy Stunned" });
        applied = true;
    }

    if (effectDef.effect === "crit_damage_up" && effectDef.value) {
        char.buff.critDmg = (char.buff.critDmg || 0) + (effectDef.value / 100);
        ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, value: effectDef.value, description: "Crit Damage Up" });
        applied = true;
    }

    if (effectDef.effect === "crit_rate_up" && effectDef.value) {
        char.buff.critRate = (char.buff.critRate || 0) + effectDef.value;
        ctx.log.push({ time: ctx.time, type: "skill", source: sourceChar.id, value: effectDef.value, description: "Crit Rate Up" });
        applied = true;
    }

    if (applied && effectDef.duration && effectDef.duration !== "permanent") {
        char.buffTimers[effectDef.effect] = effectDef.duration;
    }
}

function updateBuffTimers(ctx: BattleContext) {
    ctx.team.members.forEach(char => {
        if (!char.buffTimers || !char.buff) return;
        for (const [buffName, timeRemain] of Object.entries(char.buffTimers)) {
            char.buffTimers[buffName] = (timeRemain as number) - ctx.delta;
            if (char.buffTimers[buffName] <= 0) {
                if (buffName === "attack_damage_up") char.buff.atkDmgUp = 0;
                if (buffName === "crit_damage_up") char.buff.critDmg = 0;
                if (buffName === "crit_rate_up") char.buff.critRate = 0;
                delete char.buffTimers[buffName];
            }
        }
    });
}
