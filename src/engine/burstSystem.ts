/* ==================================
   Burst System (NIKKE Simulator)
================================== */
import { applyEffect } from "./skillResolver";

export enum BurstStage {
    NONE = 0,
    STAGE_1 = 1,
    STAGE_2 = 2,
    STAGE_3 = 3,
    FULL = 4,
}


/* ==================================
   설정값 (나중에 밸런스 조절용)
================================== */

export const BURST_CONFIG = {
    MAX_GAUGE: 100,        // 최대 게이지
    FULL_DURATION: 10,    // 풀버스트 지속시간 (초)
    STAGE_COOLDOWN: 20,   // 버스트 쿨타임
};


/* ==================================
   BurstSystem 클래스
================================== */

export class BurstSystem {

    /* 현재 상태 */
    private gauge = 0;
    private stage: BurstStage = BurstStage.NONE;
    private fullTimer = 0;
    private chainTimer = 0;

    /* =========================
       현재 상태 조회
    ========================= */

    getGauge() {
        return this.gauge;
    }

    getStage() {
        return this.stage;
    }

    isFullBurst() {
        return this.stage === BurstStage.FULL;
    }

    /* =========================
       게이지 충전
    ========================= */

    addGauge(value: number) {
        if (this.stage === BurstStage.FULL) return; // 풀버스트 중에는 게이지 안 참
        this.gauge = Math.min(
            BURST_CONFIG.MAX_GAUGE,
            this.gauge + value
        );
    }

    /* =========================
       버스트 사용 시도
    ========================= */

    tryActivate(ctx: import("../types/battle").BattleContext) {
        if (this.stage === BurstStage.FULL) return false;
        if (this.stage === BurstStage.NONE && this.gauge < BURST_CONFIG.MAX_GAUGE) return false;

        // 찾고자 하는 다음 버스트 스테이지
        const targetLevel = this.stage === BurstStage.NONE ? 1 :
            this.stage === BurstStage.STAGE_1 ? 2 :
                this.stage === BurstStage.STAGE_2 ? 3 : 0;

        if (targetLevel === 0) return false;

        // 가능한 캐릭터 찾기 (버스트 레벨이 일치하고, 쿨타임이 없는 캐릭터)
        const candidates = ctx.team.members.filter(char =>
            char.burstLevel === targetLevel &&
            (ctx.burstCooldowns[char.id] || 0) <= 0
        );

        if (candidates.length === 0) {
            // 현재 단계에 사용 가능한 캐릭터가 없다면 여기서 멈춤 (추후 게이지 초기화 등 로직 추가 가능)
            return false;
        }

        // 우선순위가 높은(왼쪽 슬롯) 캐릭터 1명 선택
        const caster = candidates[0];

        // 해당 캐릭터의 버스트 스킬 찾기
        const burstSkill = caster.skills?.find(s => s.type === "burst");

        // 버스트 스킬이 없으면 기본 쿨타임(20 또는 40) 적용, 보통 1,2단계는 20초, 3단계는 40초로 가정하지만, 캐릭터 데이터 우선
        const cooldown = burstSkill?.cooldown || 20;
        ctx.burstCooldowns[caster.id] = cooldown;

        // 상태 전이 먼저 (Full Burst 돌입 시 효과보다 우선해야 Vesti 등의 깎임 기능이 제대로 적용됨)
        if (targetLevel === 1) { this.stage = BurstStage.STAGE_1; this.chainTimer = 0; }
        else if (targetLevel === 2) { this.stage = BurstStage.STAGE_2; this.chainTimer = 0; }
        else if (targetLevel === 3) {
            this.enterFullBurst(ctx);
        }

        ctx.log.push({
            time: ctx.time,
            type: "burst",
            source: caster.id,
            description: `Activated Burst Stage ${targetLevel}`
        });

        // 버스트 스킬 효과 적용
        if (burstSkill && burstSkill.effects) {
            burstSkill.effects.forEach((eff: any) => {
                applyEffect(ctx, caster, eff);
            });
        }

        return true;
    }

    /* =========================
       풀버스트 진입
    ========================= */

    private enterFullBurst(ctx: import("../types/battle").BattleContext) {
        this.stage = BurstStage.FULL;
        this.fullTimer = BURST_CONFIG.FULL_DURATION;
        this.gauge = 0; // 풀버스트 진입 시 게이지 초기화
        ctx.burstActive = true;

        // 실제 종료시간을 나중에 업데이트하므로 시작시간과 동일하게 임시 배정
        ctx.burstZones.push({ start: ctx.time, end: ctx.time });
    }


    /* =========================
       시간 업데이트 (매 틱 호출)
    ========================= */

    update(ctx: import("../types/battle").BattleContext) {

        /* 쿨 감소 (Context 기반) */
        for (const charId in ctx.burstCooldowns) {
            if (ctx.burstCooldowns[charId] > 0) {
                ctx.burstCooldowns[charId] = Math.max(0, ctx.burstCooldowns[charId] - ctx.delta);
            }
        }

        // 체인 타임아웃
        if (this.stage === BurstStage.STAGE_1 || this.stage === BurstStage.STAGE_2) {
            this.chainTimer += ctx.delta;
            if (this.chainTimer > 10) {
                this.reset();
            }
        }

        /* 풀버스트 타이머 */
        if (this.stage === BurstStage.FULL) {

            this.fullTimer -= ctx.delta;

            if (this.fullTimer <= 0) {
                this.exitFullBurst(ctx);
            }
        } else {
            // 풀버스트가 아닐 때 게이지를 지속적으로 충전 (5초마다 가득 차도록)
            this.addGauge(ctx.delta * (BURST_CONFIG.MAX_GAUGE / 5));
        }
    }

    /* =========================
       쿨타임 감소 (스킬용)
    ========================= */

    reduceCooldown(ctx: import("../types/battle").BattleContext, value: number) {
        for (const charId in ctx.burstCooldowns) {
            if (ctx.burstCooldowns[charId] > 0) {
                ctx.burstCooldowns[charId] = Math.max(0, ctx.burstCooldowns[charId] - value);
            }
        }
    }

    /* =========================
       풀버스트 시간 즉시 감소 (스킬용)
    ========================= */

    reduceFullTimer(value: number) {
        if (this.stage === BurstStage.FULL) {
            this.fullTimer = Math.max(0, this.fullTimer - value);
        }
    }

    /* =========================
       풀버스트 종료
    ========================= */

    private exitFullBurst(ctx: import("../types/battle").BattleContext) {
        this.stage = BurstStage.NONE;
        this.fullTimer = 0;
        ctx.burstActive = false;

        // 실제 종료된 시간을 기록하여 차트 겹침을 방지
        if (ctx.burstZones.length > 0) {
            ctx.burstZones[ctx.burstZones.length - 1].end = ctx.time;
        }

        // 게이지 초기화 (다음 버스트를 위해)
        this.gauge = 0;
    }

    /* =========================
       리셋
    ========================= */

    reset() {
        this.gauge = 0;
        this.stage = BurstStage.NONE;
        this.fullTimer = 0;
        this.chainTimer = 0;
    }
}

/* ==================================
   배틀엔진 연동용 함수
================================== */
export function updateBurst(ctx: import("../types/battle").BattleContext) {
    if (!ctx.burstSystem) {
        ctx.burstSystem = new BurstSystem();
    }
    const bs = ctx.burstSystem as BurstSystem;

    if (ctx.burstGauge > 0) {
        bs.addGauge(ctx.burstGauge);
        ctx.burstGauge = 0;
    }

    bs.update(ctx);

    // 자동 버스트 발동 테스트 (연속적으로 발동 가능하도록 루프)
    while (bs.tryActivate(ctx)) {
        // 루프를 돌며 1->2->3 연속 발동 시도
    }

    ctx.burstActive = bs.isFullBurst();
}