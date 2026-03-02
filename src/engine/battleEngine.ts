// engine/battleEngine.ts

import { processAttack } from "./damageCalc";
import { resolveSkills } from "./skillResolver";
import { updateBurst } from "./burstSystem";
import { Random } from "./rng";
import { updateAmmo } from "./ammoSystem";

import {
    BattleContext,
    BattleResult,
    Team,
    Enemy,
    SimConfig,
} from "../types/battle";

/* ================================
   메인 진입 함수
================================ */

export function simulateBattle(
    team: Team,
    enemy: Enemy,
    config: SimConfig
): BattleResult {
    const ctx = createContext(team, enemy, config);

    // 메인 루프
    while (!isFinished(ctx)) {
        step(ctx);
    }

    return buildResult(ctx);
}

/* ================================
   Context 생성
================================ */

function createContext(
    team: Team,
    enemy: Enemy,
    config: SimConfig
): BattleContext {
    return {
        time: 0,
        delta: config.tick || 0.1,
        config,

        team,
        enemy,

        burstGauge: 0,
        burstActive: false,
        burstRemain: 0,

        totalDamage: 0,
        totalAmmoUsed: 0,
        log: [],

        rng: new Random(config.seed),
        burstCooldowns: {},
        burstZones: []
    };
}

/* ================================
   매 Tick 처리
================================ */

function step(ctx: BattleContext) {
    // 0️⃣ 탄환 및 장전 처리 (추가)
    updateAmmo(ctx);

    // 1️⃣ 공격 처리
    processAttack(ctx);

    // 2️⃣ 스킬 발동
    resolveSkills(ctx);

    // 3️⃣ 버스트 처리
    updateBurst(ctx);

    // 4️⃣ 시간 진행
    ctx.time += ctx.delta;
}

/* ================================
   종료 조건
================================ */

function isFinished(ctx: BattleContext): boolean {
    if (ctx.time >= ctx.config.duration) return true;
    if (ctx.enemy.hp <= 0) return true;

    return false;
}

/* ================================
   결과 생성
================================ */

function buildResult(ctx: BattleContext): BattleResult {
    return {
        duration: ctx.time,
        totalDamage: ctx.totalDamage,
        dps: ctx.totalDamage / ctx.time,
        burstCount: ctx.log.filter((l) => l.type === "burst").length,
        burstZones: ctx.burstZones,
        log: ctx.log,
    };
}