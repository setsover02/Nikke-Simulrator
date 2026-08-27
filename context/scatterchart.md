# Scatter Chart — 스킬 대미지 집계 정의

> **스킬 대미지 정의:** 일반 공격(평타)를 제외하고 니케의 모든 skill로 발생하는 대미지.
> 도트 대미지, 순차 대미지, 분배 대미지, 버스트 스킬 대미지, 공격력의 n% 대미지 등
> "skill_damage라는 변수가 있는 것이 아니라 니케의 모든 'skill로 발생'하는 대미지"를 뜻한다.
>
> 시뮬레이션 로직을 수정하지 않고, 시뮬레이션 상 발생한 모든 스킬 대미지를
> 수치화하여 프레임 단위로 기록한다.

---

## 집계 원칙

`ctx.enemy.hp -= dmg` AND `ctx.totalDamage += dmg` 가 동시에 발생하는 경우 중,
**`log.type === 'attack'` (일반 평타)만 제외하고 나머지 전부를 집계한다.**

---

## 집계 대상 로그 타입 (`SKILL_DAMAGE_TYPES`)

```typescript
// src/utils/simUtils.ts
export const SKILL_DAMAGE_TYPES = new Set([
    'skill_damage',   // 스킬 직접 타격 — 아래 effectDef.effect 케이스 전부 포함
    'dot_damage',     // DoT 틱 대미지 — 지속 피해 매 틱
]);
```

### `skill_damage` — 스킬 직접 타격

| effectDef.effect | 발생 위치 | 예시 캐릭터 |
|---|---|---|
| `damage` | `applySpecificEffectToTarget` | 대부분 공격형 캐릭터 |
| `bubble_barrage` | `applySpecificEffectToTarget` | 버블 바라지 계열 |
| `distribute_damage` | `applySpecificEffectToTarget` | 분배 대미지 계열 |
| `extra_damage` | `applySpecificEffectToTarget` | 추가 타격 (스택 조건) |
| `interval_damage` tick | `activeIntervalSkills` → tick → `damage` | 주기적 반복 타격 |
| 무기 변경 차지 공격 | `processWeaponOverrideAttack` | 앨리스 등 |
| 버스트 스킬 대미지 | `fireBurst` → `applyEffect` → `applySpecificEffectToTarget` | 모든 버스트 |

> 버스트 스킬의 대미지 효과는 `applyEffect()` → `applySpecificEffectToTarget()` 경로를 통해
> 최종적으로 `type: 'skill_damage'` 로 기록된다. `type: 'burst'` 로그는 이벤트 마커이며 대미지가 없다.

### `dot_damage` — 지속 대미지 tick

| 발생 위치 | 설명 |
|---|---|
| `processEnemyDots` | enemy.debuff.activeDots 내 DoT 스택 × 틱 대미지 (미하라 chain_binding, chain_pull) |
| `battleEngine.ts` BuffManager DoT 큐 | BuffManager 경로 DoT (향후 확장용) |

---

## 제외 대상

| log.type | 이유 |
|---|---|
| `attack` | 일반 평타 (AR/SMG/MG/SR/RL/SG 사격) — 전체 누적 차트에서만 집계 |
| `burst` | 이벤트 마커 (full_burst_start, full_burst_end, burst_l1_fired 등). 대미지 값 없음 |
| `skill` | 버프/힐/실드/게이지 등 비-대미지 효과. enemy HP 감소 없음 |

---

## 구현 방식

- `generateScatterData(result)` — sourceFilter 없이 전체 로그에서 `SKILL_DAMAGE_TYPES` 필터링
- `buildSkillChartDatasets` — source 필드로 캐릭터 역매핑 후 bucket 구성
- 모든 스킬 대미지가 누락 없이 수집되며, 캐릭터별 색상으로 구분

---


## 불변 조건

- `SKILL_DAMAGE_TYPES` Set이 단일 정본이다.
- 새 대미지 경로 추가 시 이 문서 + `SKILL_DAMAGE_TYPES` 동시 갱신.
- `value <= 0` 로그는 필터링.
- 집계 방식은 `sourceFilter`가 아닌 **전체 수집 후 source 역매핑**이 정본이다.
