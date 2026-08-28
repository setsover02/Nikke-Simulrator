// src/engine/charExceptions.ts
// UnParsing.md 캐릭터별 예외 핸들러
// PARSING.md에 stat이 없는 캐릭터 전용 메카닉을 엔진 레벨에서 처리
//
// 현재 구현 대상:
//   - current_hp_reduce : A2, 그레이브, 라푼젤PG, 아비스타 등
//   - burst_reenter     : 티아, 차임, 루피WS, 아비스타, 앨리스WB (Q2 포함 확정)
//
// buff placeholder 재파싱 필요 캐릭터 목록 (UnParsing.md §재파싱 필요 참조):
//   EH, K, 길로틴WS, 베스티, 베스티TU, 아이기스, 엠마TU, 은화TU, 트로니,
//   레이블, 백학, 아비스타, 얀, 크러스트, A2, 에밀리아
//   → 재파싱 전까지 _unparseable=true 경고만 출력, 시뮬레이션에서 제외됨.

import { BattleContext } from '../types/battle';
import { BuffCollection } from '../types/buff';

// ─────────────────────────────────────────────────────────────────────────────
// burst_reenter: 버스트 재진입 처리
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ DEPRECATED: 재진입 로직은 burstSystem.ts의 getReenterLevel()로 이전됨.
//    재진입 여부는 캐릭터 JSON의 burst 스킬 effects에서 effect === 'burst_reenter'를
//    동적으로 탐지하며, 특정 캐릭터 이름을 하드코딩하지 않는다.
//    신규 재진입 캐릭터 추가 시 별도 코드 수정 불필요 — JSON에 effect만 추가하면 됨.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated burstSystem.ts의 getReenterLevel()이 JSON 기반으로 동적 처리.
 *             외부 참조 호환성을 위해 export 유지.
 */
export const BURST_REENTER_CHARS = new Set<string>();

/**
 * @deprecated burstSystem.ts에서 직접 처리. 이 함수는 더 이상 호출되지 않는다.
 */
export function hasBurstReenter(_charId: string, _ctx: BattleContext): boolean {
  return false;
}

/**
 * @deprecated burstSystem.ts에서 직접 처리. 이 함수는 더 이상 호출되지 않는다.
 */
export function handleBurstReenter(_charId: string, _ctx: BattleContext): boolean {
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// current_hp_reduce: 자신 또는 대상의 현재 체력을 즉시 감소
// UnParsing.md §캐릭터 고유 메카닉 참조
// ─────────────────────────────────────────────────────────────────────────────

/**
 * current_hp_reduce instant 효과 적용
 * @param charId  대상 캐릭터 ID
 * @param value   감소 비율 (%) — maxHp 기준
 * @param ctx     BattleContext
 */
export function applyCurrentHpReduce(
  charId: string,
  value: number,
  ctx: BattleContext
): void {
  const char = ctx.team.members.find((m) => m.id === charId);
  if (!char) return;
  const reduceAmt = (char.maxHp || char.hp) * (value / 100);
  char.hp = Math.max(1, char.hp - reduceAmt);
}

// ─────────────────────────────────────────────────────────────────────────────
// infinite_ammo: 무한 탄 메카닉 호출 헬퍼
// BuffManager.hasInfiniteAmmo()를 통해 실제 판정
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 무한 탄 상태에서 탄 소모 방지 처리
 * damageCalc.ts canAttack() 내에서 buffManager.hasInfiniteAmmo()로 처리되므로
 * 이 함수는 외부에서 탄 소모 후 보정이 필요한 경우를 위한 헬퍼.
 */
export function compensateInfiniteAmmo(charId: string, ctx: BattleContext): void {
  if (!ctx.buffManager?.hasInfiniteAmmo(charId)) return;
  const char = ctx.team.members.find((m) => m.id === charId);
  if (!char) return;
  // 발사 후 탄 감소가 일어났으면 1 복원
  if (char.ammo < char.maxAmmo) {
    char.ammo = Math.min(char.maxAmmo, char.ammo + 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// skill_cooldown: 스킬 쿨다운 제어 (매 프레임 호출)
// UnParsing.md §buff placeholder 섹션이 아닌, IMPL-STATUS.md에서 보류된 stat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * skill_cooldown 처리 — 특정 스킬의 재발동 대기시간 제어
 * buffManager의 getBuffs()에서 skill_cooldown_pct를 집계하고,
 * 이 함수는 매 tick에서 스킬 재발동 타이머에 해당 %를 반영한다.
 *
 * @param charId   시전자 ID
 * @param baseCD   기본 스킬 쿨다운 (초)
 * @param buffs    getBuffs() 결과
 * @returns        실제 쿨다운 (초)
 */
export function calcEffectiveSkillCooldown(
  charId: string,
  baseCD: number,
  buffs: BuffCollection
): number {
  // skill_cooldown_pct: 쿨다운 감소 % (양수면 감소)
  const cdReductionPct = buffs.skill_cooldown_pct ?? 0;
  return Math.max(0, baseCD * (1 - cdReductionPct / 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// buff placeholder 캐릭터 경고 로그
// UnParsing.md §재파싱 필요 목록
// ─────────────────────────────────────────────────────────────────────────────

/** 재파싱이 필요한 `buff` placeholder 캐릭터 ID 집합 */
export const BUFF_PLACEHOLDER_CHARS = new Set([
  'EH',
  'K',
  '길로틴: 윈터 슬레이어',
  '베스티',
  '베스티: 택티컬 업',
  '아이기스',
  '엠마: 택티컬 업',
  '은화: 택티컬 업',
  '트로니',
  '레이블',
  '백학',
  '아비스타',
  '얀',
  '크러스트',
  'A2',
  '에밀리아',
]);

/**
 * 캐릭터 등록 시 buff placeholder 경고 출력
 * BuffManager.registerTeamSkills()에서 _unparseable 효과에 대해 호출
 */
export function warnBuffPlaceholder(charId: string, effectName: string, raw: string): void {
  if (BUFF_PLACEHOLDER_CHARS.has(charId)) {
    console.warn(
      `[CharExceptions] [UnParsing.md §재파싱 필요] ` +
      `${charId} / ${effectName}: raw="${raw}". ` +
      `재파싱 전까지 시뮬레이션에서 제외됨.`
    );
  }
}
