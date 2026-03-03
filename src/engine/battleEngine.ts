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
        delta: config.tick || (1 / 60),
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
        burstZones: [],

        // 버스트 체인 상태 머신 초기값 (실제 초기화는 updateBurst 첫 틱에서 수행)
        burstChainState: 'gauge_filling',
        burstChainTimer: 0,
        fullBurstTimer: 0,
    };
}

/* ================================
   매 Tick 처리
================================ */

function step(ctx: BattleContext) {
    // 0️⃣ 탄환 및 장전 처리 (추가)
    updateAmmo(ctx);

    // 1️⃣ 버스트 상태 처리
    updateBurst(ctx);

    // 2️⃣ 공격 처리
    processAttack(ctx);

    // 3️⃣ 스킬 발동
    resolveSkills(ctx);

    // 4️⃣ 시간 진행
    ctx.time += ctx.delta;
}

/* ================================
   종료 조건
================================ */

function isFinished(ctx: BattleContext): boolean {
    // DPS 시뮬레이터: 적은 불멸로 취급, 시간 기반으로만 종료
    if (ctx.time >= ctx.config.duration) return true;
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
