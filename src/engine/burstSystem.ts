/* ==================================
   Burst System (NIKKE Simulator)
   
   버스트 체인 상태 머신:
   gauge_filling → chain_l1 → chain_l2 → chain_l3 → full_burst → gauge_filling → ...
================================== */

import { BattleContext, Character } from '../types/battle';
import { applyEffect } from './skillResolver';

export const BURST_CONFIG = {
    FULL_DURATION: 10,          // 풀버스트 지속시간(초)
    GAUGE_DELAY: 4.58,          // 게이지 충전 기본 딜레이(초)
    GAUGE_DELAY_MIN: 2.52,      // 게이지 충전 최소 딜레이(초)
    CHAIN_TIMEOUT: 10,          // 버스트 체인 단계별 대기 최대 시간(초)
};

/** 게이지 딜레이 값을 config에서 읽어 최솟값 보정 후 반환 */
function getGaugeDelay(ctx: BattleContext): number {
    return Math.max(
        BURST_CONFIG.GAUGE_DELAY_MIN,
        ctx.config.burstGaugeDelay
        ?? ctx.config.fullBurstInterval   // 하위호환
        ?? BURST_CONFIG.GAUGE_DELAY
    );
}

/**
 * 특정 버스트 레벨의 니케 중 슬롯 번호가 가장 낮고 쿨타임이 0인 니케를 반환
 */
function findBurstCandidate(
    ctx: BattleContext,
    level: number,
): Character | null {
    const candidates = ctx.team.members
        .filter(char => {
            if ((char.burstLevel ?? 0) !== level) return false;
            const cd = ctx.burstCooldowns[char.id] ?? 0;
            return cd <= 0;
        })
        .sort((a, b) => a.slotIndex - b.slotIndex); // 슬롯 번호 오름차순 정렬

    return candidates[0] ?? null;
}

/**
 * 버스트 스킬을 발동시키고 해당 니케의 쿨타임을 설정 & 버스트 스킬 효과 적용
 */
function fireBurst(ctx: BattleContext, char: Character): void {
    const burstSkill = char.skills.find((s: any) => s.id === 'burst' || s.type === 'burst');
    if (!burstSkill) return;

    // 쿨타임 설정 (JSON에 정의된 쿨타임 사용)
    const cooldown = (burstSkill as any).cooldown ?? 20;
    ctx.burstCooldowns[char.id] = cooldown;

    // 버스트 스킬 효과 적용
    const effects: any[] = (burstSkill as any).effects ?? [];
    for (const effectDef of effects) {
        applyEffect(ctx, char, effectDef);
    }

    ctx.log.push({
        time: ctx.time,
        type: 'burst',
        source: char.id,
        description: `burst_l${char.burstLevel ?? 0}_fired`,
        value: char.burstLevel ?? 0,
    });
}

/**
 * 버스트 쿨다운 타이머를 매 틱 갱신 (풀버스트 중에도 쿨타임이 감소함)
 */
function updateCooldowns(ctx: BattleContext): void {
    for (const id of Object.keys(ctx.burstCooldowns)) {
        if (ctx.burstCooldowns[id] > 0) {
            ctx.burstCooldowns[id] = Math.max(0, ctx.burstCooldowns[id] - ctx.delta);
        }
    }
}

/**
 * 매 틱 호출. 상태 머신을 진행시키고 full_burst_start / full_burst_end 이벤트를 처리한다.
 */
export function updateBurst(ctx: BattleContext): void {
    // ── 최초 초기화 (별도 플래그로 체크 — 문자열은 truthy라 !state 체크 불가)
    if (!ctx.state?.burstSystemInitialized) {
        ctx.state = ctx.state || {};
        ctx.state.burstSystemInitialized = true;
        ctx.burstChainState = 'gauge_filling';
        ctx.burstChainTimer = getGaugeDelay(ctx); // 전투 시작 시 게이지 충전 딜레이 적용
        ctx.fullBurstTimer = 0;
        ctx.burstActive = false;
    }

    // 버스트 쿨다운 모든 캐릭터 갱신 (풀버스트 중에도 감소)
    updateCooldowns(ctx);

    const state = ctx.burstChainState;

    // ── gauge_filling: 게이지 충전 딜레이 대기 ─────────────────
    if (state === 'gauge_filling') {
        ctx.burstChainTimer -= ctx.delta;
        if (ctx.burstChainTimer <= 0) {
            // 게이지 100% 도달 → L1 체인 시작 시도
            const l1Char = findBurstCandidate(ctx, 1);
            if (l1Char) {
                fireBurst(ctx, l1Char);
                ctx.burstChainState = 'chain_l2';
                ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
            } else {
                // L1 니케가 전원 쿨타임 → 게이지 100% 유지, 매 틱 재시도
                ctx.burstChainTimer = 0;
            }
        }
        return;
    }

    // ── chain_l2: L1 발동 후 L2 대기 ────────────────────────
    if (state === 'chain_l2') {
        // 먼저 체인 가능 여부를 확인한 뒤 타이머 감소
        const l2Char = findBurstCandidate(ctx, 2);
        if (l2Char) {
            fireBurst(ctx, l2Char);
            ctx.burstChainState = 'chain_l3';
            ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
        } else {
            ctx.burstChainTimer -= ctx.delta;
            if (ctx.burstChainTimer <= 0) {
                // 10초 내 L2 없음 → 체인 실패
                ctx.burstChainState = 'gauge_filling';
                ctx.burstChainTimer = getGaugeDelay(ctx);
            }
        }
        return;
    }

    // ── chain_l3: L2 발동 후 L3 대기 ────────────────────────
    if (state === 'chain_l3') {
        // 먼저 체인 가능 여부를 확인한 뒤 타이머 감소
        const l3Char = findBurstCandidate(ctx, 3);
        if (l3Char) {
            fireBurst(ctx, l3Char);
            // 풀버스트 진입
            ctx.burstChainState = 'full_burst';
            ctx.fullBurstTimer = ctx.config.fullBurstDuration ?? BURST_CONFIG.FULL_DURATION;
            ctx.burstActive = true;
            ctx.burstZones.push({ start: ctx.time, end: ctx.time + ctx.fullBurstTimer });
            ctx.log.push({ time: ctx.time, type: 'burst', description: 'full_burst_start' });
        } else {
            ctx.burstChainTimer -= ctx.delta;
            if (ctx.burstChainTimer <= 0) {
                // 10초 내 L3 없음 → 체인 실패
                ctx.burstChainState = 'gauge_filling';
                ctx.burstChainTimer = getGaugeDelay(ctx);
            }
        }
        return;
    }

    // ── full_burst: 풀버스트 10초 유지 ──────────────────────
    if (state === 'full_burst') {
        ctx.fullBurstTimer -= ctx.delta;
        if (ctx.fullBurstTimer <= 0) {
            ctx.burstActive = false;
            ctx.burstChainState = 'gauge_filling';
            ctx.burstChainTimer = getGaugeDelay(ctx);
            ctx.fullBurstTimer = 0;
            // burstZones 마지막 항목의 end 정확하게 기록
            if (ctx.burstZones.length > 0) {
                ctx.burstZones[ctx.burstZones.length - 1].end = ctx.time;
            }
            ctx.log.push({ time: ctx.time, type: 'burst', description: 'full_burst_end' });
        }
        return;
    }
}
