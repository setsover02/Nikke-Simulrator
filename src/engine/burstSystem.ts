/* ==================================
   Burst System (NIKKE Simulator)
================================== */

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
    private cooldown = 0;


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
        this.gauge = Math.min(
            BURST_CONFIG.MAX_GAUGE,
            this.gauge + value
        );
    }


    /* =========================
       버스트 사용 시도
    ========================= */

    tryActivate() {

        if (this.cooldown > 0) return false;

        if (this.gauge < BURST_CONFIG.MAX_GAUGE) return false;


        switch (this.stage) {

            case BurstStage.NONE:
                this.stage = BurstStage.STAGE_1;
                break;

            case BurstStage.STAGE_1:
                this.stage = BurstStage.STAGE_2;
                break;

            case BurstStage.STAGE_2:
                this.stage = BurstStage.STAGE_3;
                break;

            case BurstStage.STAGE_3:
                this.enterFullBurst();
                break;

            default:
                return false;
        }

        this.gauge = 0;
        this.cooldown = BURST_CONFIG.STAGE_COOLDOWN;

        return true;
    }


    /* =========================
       풀버스트 진입
    ========================= */

    private enterFullBurst() {
        this.stage = BurstStage.FULL;
        this.fullTimer = BURST_CONFIG.FULL_DURATION;
    }


    /* =========================
       시간 업데이트 (매 틱 호출)
    ========================= */

    update(delta: number) {

        /* 쿨 감소 */
        if (this.cooldown > 0) {
            this.cooldown -= delta;
            if (this.cooldown < 0) this.cooldown = 0;
        }

        /* 풀버스트 타이머 */
        if (this.stage === BurstStage.FULL) {

            this.fullTimer -= delta;

            if (this.fullTimer <= 0) {
                this.exitFullBurst();
            }
        }
    }


    /* =========================
       풀버스트 종료
    ========================= */

    private exitFullBurst() {
        this.stage = BurstStage.NONE;
        this.fullTimer = 0;
    }


    /* =========================
       리셋
    ========================= */

    reset() {
        this.gauge = 0;
        this.stage = BurstStage.NONE;
        this.cooldown = 0;
        this.fullTimer = 0;
    }
}