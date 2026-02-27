import { BattleContext } from "../types/battle";

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
    // 1. Iterate over all characters in the team
    ctx.team.members.forEach(char => {
        // 2. Iterate over their skills
        if (!char.skills) return;

        char.skills.forEach((skillDef: any) => {
            const skill = skillDef as SkillDef;

            // 3. Process Burst skills (triggered manually or by auto-burst system)
            // Note: Currently, Burst activation logic might be handled elsewhere (e.g., burstSystem.ts)
            // but the effects of the burst should be applied here if activated.

            // 4. Process Passive skills based on triggers
            if (skill.type === "passive") {
                skill.effects.forEach(effectDef => {
                    handleEffectTrigger(ctx, char.id, skill.id, effectDef);
                });
            }
        });
    });
}

function handleEffectTrigger(ctx: BattleContext, sourceId: string, skillId: string, effectDef: SkillEffectDef) {
    // Basic trigger handling logic. 
    // In a full implementation, you'd check events in the context (like 'onHit', 'onBurstStart') 
    // to see if this effect should activate NOW.

    // Example: "permanent" effects or "self_focusing" triggering on battle start
    if (effectDef.duration === "permanent" && effectDef.trigger === "self_focusing") {
        // Apply effect (e.g., set a flag on the character or team)
    }

    // Example: "full_burst_start" trigger
    // if (ctx.event === 'full_burst_start' && effectDef.trigger === 'full_burst_start') {
    //      applyEffect(ctx, sourceId, effectDef);
    // }
}

function applyEffect(ctx: BattleContext, sourceId: string, effectDef: SkillEffectDef) {
    // Apply the actual stat modifications or damage logic defined in 'effectDef'
    // to the target specified in 'effectDef.target'
    console.log(`Applying effect ${effectDef.effect} to ${effectDef.target} from ${sourceId}`);
}
