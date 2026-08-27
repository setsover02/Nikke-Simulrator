
## 미정의 효과 (`_unparseable`)

> PARSING.md에 대응 stat이 없어 `"_unparseable": true, "_raw": "<원래 값>"` 마킹된 항목.
> 재파싱 또는 stat 신설 여부를 결정할 때 이 목록을 참조한다.
> PARSING-CHARS.md 완료 목록에 등록된 캐릭터는 이 목록에서 제거한다.

### 재파싱 필요 — `buff` placeholder

`effect: "buff"` 로 작성된 항목. 구체적인 stat이 누락된 상태이며, 원본 스킬 텍스트를 보고 올바른 stat으로 교체해야 한다.

| 파일 | 이름 (name) | trigger | 비고 |
|------|-------------|---------|------|
| `e_ssr_eh.json` | (다수) | 다수 | EH 전체 스킬 재파싱 필요 |
| `e_ssr_k.json` | (다수) | 다수 | K 전체 스킬 재파싱 필요 |
| `e_ssr_길로틴_윈터_슬레이어.json` | — | — | 재파싱 필요 |
| `e_ssr_베스티.json` | — | `burst_cast` | 재파싱 필요 |
| `e_ssr_베스티_택티컬_업.json` | — | `full_charge_attack`, `full_reload` | 재파싱 필요 |
| `e_ssr_아이기스.json` | (다수) | `battle_start`, `burst_cast` | 재파싱 필요 |
| `e_ssr_엠마_택티컬_업.json` | (다수) | 다수 | 재파싱 필요 |
| `e_ssr_은화_택티컬_업.json` | (다수) | `passive`, `burst_cast` | 재파싱 필요 |
| `m_ssr_트로니.json` | — | `full_charge_attack` | 재파싱 필요 |
| `t_ssr_레이블.json` | (다수) | `passive`, `battle_start` | 재파싱 필요 |
| `t_ssr_백학.json` | (다수) | `passive` | 재파싱 필요 |
| `t_ssr_아비스타.json` | (다수) | `full_burst_start`, `full_burst_end` | 재파싱 필요 |
| `t_ssr_얀.json` | — | `burst_cast` | 재파싱 필요 |
| `t_ssr_크러스트.json` | (다수) | `passive`, `full_charge_attack` | 재파싱 필요 |
| `a_ssr_a2.json` | — | — | 재파싱 필요 |
| `a_ssr_에밀리아.json` | (다수) | — | 재파싱 필요 |

### 버프/디버프 스택 직접 조작 — `buff_stack_*` / `debuff_stack_*`

PARSING.md에 대응 stat 없음. 각 캐릭터의 스택 메카닉 구현 시 전용 stat 신설 또는 `gauge_charge`/`gauge_consume` 패턴으로 대체 검토.

> 이 섹션의 모든 캐릭터(라피 : 레드 후드, 마르차나 : 마린 스터디, 디젤 : 윈터 스위츠, 소다 : 트윙클링 바니, 앵커 : 이노센트 메이드, 미하라 : 본딩 체인, 레이 (가칭))는 PARSING-CHARS.md 완료 목록에 등록되어 있어 항목이 없습니다.
> 해당 항목은 PARSING-CHARS.md `## 미정의 효과 (_unparseable)` 섹션을 참조하세요.

---

## 캐릭터 고유 메카닉 (PARSING.md 미정의)

> PARSING.md에 stat이 없는 캐릭터 전용 효과. 엔진 전용 구현이 필요하며 규칙화가 어렵거나
> 단일 캐릭터에만 적용되는 메카닉. JSON에는 원래 stat 키를 유지하고 엔진이 직접 처리한다.
> PARSING-CHARS.md 완료 목록에 등록된 캐릭터는 이 목록에서 제거한다.

| stat | 파일 | 이름 (name) | 설명 |
|------|------|-------------|------|
| `current_hp_reduce` | `a_ssr_a2.json`, `p_ssr_그레이브.json`, `p_ssr_라푼젤_퓨어_그레이스.json`, `t_ssr_아비스타.json` | 각기 다름 | 현재 체력을 비율(%) 또는 고정값으로 직접 감소 — `e_ssr_길로틴.json`, `p_ssr_홍련.json`은 PARSING-CHARS.md 완료에서 처리됨 |
| `burst_reenter` | `m_ssr_티아.json`, `p_ssr_차임.json`, `t_ssr_루피_윈터_쇼퍼.json`, `t_ssr_아비스타.json`, `t_ssr_앨리스_원더랜드_바니.json` | 각기 다름 | 버스트 재진입/연장 전용 메카닉. 버스트 사이클을 변형하므로 엔진 별도 처리 필요 |
| `shield_hp_heal` | `m_ssr_킬로.json` | — | 보호막 체력으로 회복 |