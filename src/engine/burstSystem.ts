/* ==================================
   Burst System (NIKKE Simulator)
================================== */

export const BURST_CONFIG = {
    FULL_DURATION: 10,          // 풀버스트 지속시간(초)
    FULL_BURST_INTERVAL: 4.67,  // 풀버스트 간 비활성 구간(초)
};

export class BurstSystem {
    private readonly fullDuration: number;
    private readonly fullBurstInterval: number;

    private burstActive = false;
    private fullTimer = 0;
    private intervalTimer = 0;

    constructor(fullDuration = BURST_CONFIG.FULL_DURATION, fullBurstInterval = BURST_CONFIG.FULL_BURST_INTERVAL) {
        this.fullDuration = fullDuration;
        this.fullBurstInterval = fullBurstInterval;
        this.intervalTimer = fullBurstInterval;
    }

    isFullBurst() {
        return this.burstActive;
    }

    /**
     * @returns full_burst_start | full_burst_end | null
     */
    update(delta: number): "full_burst_start" | "full_burst_end" | null {
        if (this.burstActive) {
            this.fullTimer -= delta;
            if (this.fullTimer <= 0) {
                this.burstActive = false;
                this.fullTimer = 0;
                this.intervalTimer = this.fullBurstInterval;
                return "full_burst_end";
            }
            return null;
        }

        this.intervalTimer -= delta;
        if (this.intervalTimer <= 0) {
            this.burstActive = true;
            this.intervalTimer = 0;
            this.fullTimer = this.fullDuration;
            return "full_burst_start";
        }

        return null;
    }

    // 기존 스킬 연동 호환용 (요청사항: 간격은 고정 유지)
    reduceCooldown(_: number) {
        return;
    }
}

/* ==================================
   배틀엔진 연동용 함수
================================== */
export function updateBurst(ctx: any) {
    if (!ctx.burstSystem) {
        ctx.burstSystem = new BurstSystem(
            ctx.config.fullBurstDuration,
            ctx.config.fullBurstInterval
        );
    }

    const bs = ctx.burstSystem as BurstSystem;
    const event = bs.update(ctx.delta);

    ctx.burstActive = bs.isFullBurst();

    if (event === "full_burst_start") {
        ctx.log.push({ time: ctx.time, type: "burst", description: "full_burst_start" });
    }
    if (event === "full_burst_end") {
        ctx.log.push({ time: ctx.time, type: "burst", description: "full_burst_end" });
    }
}
