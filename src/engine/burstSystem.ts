/* ==================================
   Burst System (NIKKE Simulator)

   버스트 체인 상태 머신:
   gauge_filling → chain_l1 → chain_l2 → chain_l3 → full_burst → gauge_filling → ...

   § 재진입(Re-entry) 규칙 (전투 시스템.md §4.1)
   ─ Level N 재진입 스킬을 가진 니케가 버스트를 사용하면, 동일한 버스트 레벨 N의 니케가
     버스트를 사용하여야 다음 단계로 진행된다. (재진입 B1 > B1 > B2 > B3 등)
   ─ 재진입 스킬 보유 여부는 캐릭터 JSON의 burst 스킬 effects 중 effect === 'burst_reenter'를
     동적으로 탐지한다 (특정 캐릭터 하드코딩 없음).
   ─ 재진입 니케 발동 후 다음 동일 레벨 니케가 없거나 쿨타임이면, 최대 10초 동안 대기하며
     10초 내에 발동하지 못하면 체인은 종료되고 일반 전투로 복귀한다.

   § 동일 레벨 다중 니케 (전투 시스템.md §2, §3.3)
   ─ 각 레벨에서 쿨타임이 아닌 니케 중 슬롯 번호(우선순위)가 가장 낮은 니케 1명이 자동 선택.
   ─ 이전 사이클에서 발동한 니케가 쿨타임이면 다음 후보가 발동 (2B → 미하라 순환 등).
================================== */

import { BattleContext, Character } from '../types/battle';
import { applyEffect } from './skillResolver';

export const BURST_CONFIG = {
    FULL_DURATION: 10,          // 풀버스트 지속시간(초)
    GAUGE_DELAY: 4.58,          // 게이지 충전 기본 딜레이(초)
    GAUGE_DELAY_MIN: 2.52,      // 게이지 충전 최소 딜레이(초)
    CHAIN_TIMEOUT: 10,          // 버스트 체인 단계별 대기 최대 시간(초)
};

/** 게이지 딜레이 값을 config에서 읽어 반환 (0이면 즉시) */
function getGaugeDelay(ctx: BattleContext): number {
    return Math.max(
        0,
        ctx.config.burstGaugeDelay
        ?? ctx.config.fullBurstInterval   // 하위호환
        ?? 0
    );
}

/**
 * 캐릭터의 현재 유효 버스트 단계를 반환합니다.
 * 활성 버프 중 burst_stage_override:N이 있으면 N을 반환하고, 없으면 기본 burstLevel을 반환합니다.
 */
export function getEffectiveBurstLevel(char: Character, ctx: BattleContext): number {
    if (ctx.buffManager) {
        const activeBuffs = ctx.buffManager.getActiveBuffs?.() || [];
        const override = activeBuffs.find(
            (b: any) =>
                b.targetId === char.id &&
                (b.stat?.startsWith('burst_stage_override:') ||
                 b.effect?.startsWith('burst_stage_override:') ||
                 b.effectDef?.effect?.startsWith('burst_stage_override:'))
        );
        if (override) {
            const statStr = override.stat || override.effect || override.effectDef?.effect || '';
            const n = parseInt(statStr.split(':')[1], 10);
            if (!isNaN(n)) return n;
        }
    }
    return char.burstLevel ?? 0;
}

/**
 * 특정 버스트 레벨의 니케 중 이번 체인에서 발동하지 않았고 슬롯 번호가 가장 낮으며 쿨타임이 0인 니케 반환.
 */
function findBurstCandidate(
    ctx: BattleContext,
    level: number,
    excludeIds: Set<string> = new Set(),
): Character | null {
    const candidates = ctx.team.members
        .filter(char => {
            const effLevel = getEffectiveBurstLevel(char, ctx);
            if (effLevel !== level) return false;
            if (excludeIds.has(char.id)) return false;
            const cd = ctx.burstCooldowns[char.id] ?? 0;
            return cd <= 0;
        })
        .sort((a, b) => {
            // 재진입 스킬을 가진 니케가 동일 레벨 내에서 일반 니케보다 우선 발동
            const aReenter = getReenterLevel(a) !== null ? 0 : 1;
            const bReenter = getReenterLevel(b) !== null ? 0 : 1;
            if (aReenter !== bReenter) return aReenter - bReenter;
            return a.slotIndex - b.slotIndex;
        });

    return candidates[0] ?? null;
}

/**
 * 해당 캐릭터의 버스트 스킬이 burst_reenter effect를 보유하는지 확인.
 * JSON의 burst 스킬 effects에서 effect === 'burst_reenter'를 동적으로 탐지.
 *
 * @returns 재진입이 허용하는 버스트 레벨 (없으면 null)
 */
export function getReenterLevel(char: Character): number | null {
    const burstSkill = char.skills.find((s: any) => s.id === 'burst' || s.type === 'burst');
    if (!burstSkill) return null;

    const reenterEffect = (burstSkill as any).effects?.find(
        (eff: any) => eff.effect === 'burst_reenter'
    );
    if (!reenterEffect) return null;

    const val = Array.isArray(reenterEffect.value)
        ? reenterEffect.value[0]
        : reenterEffect.value;

    return typeof val === 'number' ? val : null;
}

/**
 * 버스트 스킬을 발동시키고 해당 니케의 쿨타임을 설정 & 버스트 스킬 효과 적용.
 */
function fireBurst(ctx: BattleContext, char: Character): void {
    const burstSkill = char.skills.find((s: any) => s.id === 'burst' || s.type === 'burst');
    if (!burstSkill) return;

    // 쿨타임 설정 (JSON에 정의된 쿨타임 사용)
    const cooldown = (burstSkill as any).cooldown ?? 20;
    ctx.burstCooldowns[char.id] = cooldown;

    // enter_burst_n 플래그 기록
    ctx.state = ctx.state || {};
    const burstLevel = getEffectiveBurstLevel(char, ctx);
    ctx.state[`__enterBurstLevel_${burstLevel}`] = true;

    // BuffManager 이벤트 통지 (BuffManager가 활성화되어 있으면 모든 버스트 스킬 효과 디스패치를 전담)
    if (ctx.buffManager) {
        ctx.buffManager.notify('burst_cast', ctx.time, char.id, ctx);
        ctx.buffManager.notify(`burst_enter:${burstLevel}`, ctx.time, char.id, ctx);
    } else {
        // 레거시 fallback: BuffManager가 없을 때만 수동 applyEffect 적용
        const effects: any[] = (burstSkill as any).effects ?? [];
        for (const effectDef of effects) {
            if (effectDef.effect === 'burst_reenter') continue; // 재진입은 burstSystem에서 제어
            applyEffect(ctx, char, (burstSkill as any).name || 'Burst Skill', effectDef);
        }
    }

    ctx.log.push({
        time: ctx.time,
        type: 'burst',
        source: char.id,
        description: `burst_l${burstLevel}_fired`,
        value: burstLevel,
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
    // ── 최초 초기화
    if (!ctx.state?.burstSystemInitialized) {
        ctx.state = ctx.state || {};
        ctx.state.burstSystemInitialized = true;
        ctx.burstChainState = 'gauge_filling';
        ctx.burstChainTimer = getGaugeDelay(ctx);
        ctx.fullBurstTimer = 0;
        ctx.burstActive = false;
        ctx.state.__burstChainFired = new Set<string>();
        ctx.state.__reenterLevelPending = null;
    }

    // 버스트 쿨다운 매 틱 감소
    updateCooldowns(ctx);

    const state = ctx.burstChainState;
    const firedSet: Set<string> = ctx.state.__burstChainFired || (ctx.state.__burstChainFired = new Set<string>());

    // ── gauge_filling: 게이지 충전 대기 ─────────────────
    if (state === 'gauge_filling') {
        if (ctx.burstChainTimer > 0) {
            ctx.burstChainTimer -= ctx.delta;
        }

        if (ctx.burstChainTimer <= 0) {
            // 게이지 100% 도달 → chain_l1 상태로 진입하여 L1 니케 탐색 시작
            ctx.burstChainState = 'chain_l1';
            ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
            firedSet.clear();
            ctx.state.__reenterLevelPending = null;
        }
        return;
    }

    // ── chain_l1: L1 버스트 탐색 및 재진입 체인 ────────────
    if (state === 'chain_l1') {
        const candidate = findBurstCandidate(ctx, 1, firedSet);
        if (candidate) {
            fireBurst(ctx, candidate);
            firedSet.add(candidate.id);

            const reenterLvl = getReenterLevel(candidate);
            if (reenterLvl === 1) {
                // 재진입 B1 니케: 동일 레벨 B1 추가 발동 필요 → 대기 타이머 리셋 후 chain_l1 유지
                ctx.state.__reenterLevelPending = 1;
                ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
            } else {
                // 일반 B1 니케: B1 완료 → chain_l2로 전이
                ctx.state.__reenterLevelPending = null;
                ctx.burstChainState = 'chain_l2';
                ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
            }
        } else {
            // 아직 L1이 아무도 안 쐈거나, 재진입 L1 이후 다음 L1을 기다리는 중
            ctx.burstChainTimer -= ctx.delta;
            if (ctx.burstChainTimer <= 0) {
                // 10초 내 L1 (또는 재진입 후속 L1) 없음 → 체인 실패
                ctx.log.push({ time: ctx.time, type: 'burst', description: 'burst_chain_fail', value: 1 });
                ctx.burstChainState = 'gauge_filling';
                ctx.burstChainTimer = getGaugeDelay(ctx);
                firedSet.clear();
                ctx.state.__reenterLevelPending = null;
            }
        }
        return;
    }

    // ── chain_l2: L2 버스트 탐색 및 재진입 체인 ────────────
    if (state === 'chain_l2') {
        const candidate = findBurstCandidate(ctx, 2, firedSet);
        if (candidate) {
            fireBurst(ctx, candidate);
            firedSet.add(candidate.id);

            const reenterLvl = getReenterLevel(candidate);
            if (reenterLvl === 2) {
                // 재진입 B2 니케: 동일 레벨 B2 추가 발동 필요 → 대기 타이머 리셋 후 chain_l2 유지
                ctx.state.__reenterLevelPending = 2;
                ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
            } else {
                // 일반 B2 니케: B2 완료 → chain_l3로 전이
                ctx.state.__reenterLevelPending = null;
                ctx.burstChainState = 'chain_l3';
                ctx.burstChainTimer = BURST_CONFIG.CHAIN_TIMEOUT;
            }
        } else {
            ctx.burstChainTimer -= ctx.delta;
            if (ctx.burstChainTimer <= 0) {
                // 10초 내 L2 (또는 재진입 후속 L2) 없음 → 체인 실패
                ctx.log.push({ time: ctx.time, type: 'burst', description: 'burst_chain_fail', value: 2 });
                ctx.burstChainState = 'gauge_filling';
                ctx.burstChainTimer = getGaugeDelay(ctx);
                firedSet.clear();
                ctx.state.__reenterLevelPending = null;
            }
        }
        return;
    }

    // ── chain_l3: L3 버스트 탐색 ────────────────────────────
    if (state === 'chain_l3') {
        const candidate = findBurstCandidate(ctx, 3, firedSet);
        if (candidate) {
            fireBurst(ctx, candidate);
            firedSet.add(candidate.id);

            // 풀버스트 진입 (L3는 재진입 불가 — 전투 시스템.md §4.1)
            ctx.burstChainState = 'full_burst';
            ctx.fullBurstTimer = ctx.config.fullBurstDuration ?? BURST_CONFIG.FULL_DURATION;
            ctx.burstActive = true;
            ctx.burstZones.push({ start: ctx.time, end: ctx.time + ctx.fullBurstTimer });
            ctx.log.push({ time: ctx.time, type: 'burst', description: 'full_burst_start' });
            if (ctx.buffManager) {
                ctx.buffManager.notify('full_burst_start', ctx.time, candidate.id, ctx);
            }
        } else {
            ctx.burstChainTimer -= ctx.delta;
            if (ctx.burstChainTimer <= 0) {
                // 10초 내 L3 없음 → 체인 실패
                ctx.log.push({ time: ctx.time, type: 'burst', description: 'burst_chain_fail', value: 3 });
                ctx.burstChainState = 'gauge_filling';
                ctx.burstChainTimer = getGaugeDelay(ctx);
                firedSet.clear();
                ctx.state.__reenterLevelPending = null;
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
            firedSet.clear();
            ctx.state.__reenterLevelPending = null;

            if (ctx.burstZones.length > 0) {
                ctx.burstZones[ctx.burstZones.length - 1].end = ctx.time;
            }
            ctx.log.push({ time: ctx.time, type: 'burst', description: 'full_burst_end' });
            if (ctx.buffManager) {
                ctx.buffManager.notify('full_burst_end', ctx.time, undefined, ctx);
            }
        }
        return;
    }
}
