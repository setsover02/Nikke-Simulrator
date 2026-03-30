# 스킬
니케의 모든 스킬은 1레벨 부터 10레벨 까지 설정할 수 있다.
일반적으로 스킬 레벨을 올린 경우 스킬에 포함된 버프등이 계수를 따라 올라가지만 구간별로 동일한 수치가 적용되는 경우도 있으므로 모든 니케의 스킬은 각 레벨별 효과를 json으로 정의한다.

## Type
- passive: 전투 중 트리거에 따라 적용된다.
- active: paasive와 마찬가지로 전투 중 트리거에 따라 적용된다.
- burst: 전투중 해당 스킬을 보유한 니케가 버스트 스킬을 사용 시 발동한다.

## effects
effects는 스킬이 발동할 때 적용되는 실제 효과 목록이다. 하나의 스킬에는 여러 개의 effect가 포함될 수 있으며, 각 effect는 특정 trigger 조건이 충족될 때 적용된다.

각 effect는 다음 정보를 가진다.
### trigger
해당 effect가 발동하기 위한 조건이다. 시뮬레이션에서는 이 조건을 검사하여 effect 적용 여부를 결정한다.

### condition
- chance: 발동 확률: 해당 스킬의 발동 확률을 정의한다. %
- count: 해당 스킬의 발동 조건, 공격 명중 횟수를 정의한다.
- position: 해당 캐릭터의 포지션을 정의한다.
  - back: 후열에 배치됐을 때 (스쿼드의 2, 4번 자리를 의미한다.)
  - front: 전열에 배치됐을 때 (스쿼드의 1, 3, 5번 자리를 의미한다.)
- status: 특정 캐릭터의 고유 상태를 트리거한다. 이 상태가 부여된 경우 해당 스킬을 발동한다.
  - 예: 루주의 sword_coin 등
> 이 부분 모든 스킬 검토 해볼 필요 있음 아직 어떤 조건이 있는지 확인 중
- target_status: 특정 캐릭터의 대상에게 걸리는 고유 상태를 트리거 한다. (미하라: 본딩 체인)

### status
특정 니케들의 스킬에 포함된 특수한 상태
캐릭터, 또는 타겟에게 버프, 디버프 형태로 트리거 발동에 따라 적용한다.

#### copy_status
copy_status 관련한 규칙 적용 사항
- 기준이 되는 효과의 중첩된 횟수만큼 해당 효고가 중첩되어 적용됨
- 예를 들어 기준이 되는 효과 (미하라의 경우 chain_binding) 이 5중첩인 경우, 해당 효과 적용 시 5중첩으로 바로 적용됩니다. (미하라의 경우 chain_pull)
-기준이 되는 효과가 적용되어 있지 않더라도 중첩 복사시 1중첩을 보장합니다.

### target
effect가 적용될 대상이다. 아군, 적군, 또는 특정 조건을 만족하는 대상이 될 수 있다.

### effect
실제 적용되는 효과의 종류이다. 예를 들어 버프, 디버프, 데미지, 회복, 쿨다운 변경 등의 효과가 포함될 수 있다.

- change_weapon: 사용 무기 변경 규칙, 해당 효과가 발동할 때, 무기는 재장전이 된 것으로 간주한다. 해당 효과가 끝나 다시 원래 무기로 돌아올 때 최대 탄약수에서 다시 공격을 시작하는 것으로 판정한다.

### value
effect에 수치가 존재할 경우 사용하는 값이다. 스킬 레벨에 따라 값이 달라지는 경우 배열 형태로 저장하며, 시뮬레이션 시 사용자가 설정한 스킬 레벨에 맞는 값을 선택해 적용한다. 수치가 필요 없는 효과의 경우 value는 생략할 수 있다.

### duration
effect가 지속되는 시간이다. trigger가 발동되면 duration 동안 effect가 유지된다. 
duration이 없는 경우 해당 effect는 즉시 1회 적용되는 효과로 처리된다.
- number: 초 단위 시간
- permanent: 지속 (전투 시간 동안 영구적으로 적용)

### bullet
해당 버프가 유지되는 탄환 수 제한이다. `duration`이 없고 `bullet`만 있는 경우, 이 탄환 횟수만큼 사격하여 소모하면 버프가 사라진다. (예: `[2발 유지]`의 경우 `bullet: 2` 로 작성한다.)

### cooldown
cooldown은 스킬이 한 번 발동된 이후 다음 발동까지 걸리는 시간(초)이다.
cooldown은 duration과 별개로 적용된다.
cooldown이 없는 경우 트리거에 의해서만 발동한다.
cooldown은 여러 요인으로 인해 감소할 수 있으며 duration 중 다시 스킬이 발동한 경우 duration이 갱신 된다 (버스트 스킬 등)
- number: 초 단위 시간

- duration이 없는 경우:
  스킬은 cooldown 주기로 즉시 발동한다.
  예: cooldown = 5 → 전투 중 5초마다 스킬이 1회 발동한다.

- duration이 있는 경우:
  스킬은 cooldown 주기로 발동하며, 발동 후 duration 동안 효과가 유지된다.
  예: cooldown = 10, duration = 5 → 10초마다 스킬이 발동하고 발동 후 5초 동안 효과가 지속된다.

- 전투 시작 시 동작 규칙:
  cooldown이 설정된 스킬은 전투 시작 즉시 발동하지 않는다.
  첫 발동은 전투 시작 후 cooldown 시간이 지난 뒤 발생한다.
  예: cooldown = 15 → 전투 시작 후 15초 시점에 첫 발동.

### unit
해당 value 값의 단위를 설정한다
- percent: value%
- second: 초
- count: 횟수/발/개

### based_on
해당 effect가 적용될 때 기준이 되는 값이다. 
- final_atk: 최종 공격력
- final_hp: 최종 체력
- final_def: 최종 방어력
- final_max_ammo: 최종 최대 장탄수
- final_reload_time: 최종 재장전 시간
- final_charge_time: 최종 차지 시간
등 해당 내용에 대해서는 skill_variable.md 에 작성한다.

### stack
해당 effect가 중첩 가능한 경우, 중첩 가능한 횟수이다. 중첩 시 value가 중첩 개수만큼 합산하여 적용된다.
> max_stack 으로 사용하지 않는다. stack으로 작성한다.

### stack_level
하위 효과 중복 적용 이라는 툴팁의 경우 stack_level을 사용한다.
각 효과는 stack_level 값을 통해 **발동되는 단계(사용 횟수)**를 정의한다.

동작 규칙
- 동일한 trigger로 스킬이 발동될 때 **발동 횟수(counter)**가 증가한다.
- 각 effect는 자신의 stack_level과 동일한 발동 횟수일 때 적용된다.
- 따라서 stack_level은 **효과가 발동되는 단계(stage)**를 의미한다.

예시
- trigger가 1회 발동할때 stack_level 1의 버프를 적용한다.
- trigger가 2회 발동할때 stack_level 1과 2의 버프를 적용한다.
- trigger가 3회 발동할때 stack_level 1, 2, 3의 버프를 모두 적용한다.

### status_target
이 항목이 있는 니케 스킬의 경우 status 스킬이 적용 될때 status 스킬의 중첩 수에 따라 value 항목이 곱해져서 계산된다.
- effect: atk_up * status_stack
- 예시 니케: 아르카나 : 포츈 메이트

### interval
해당 스킬이 발동하는 간격을 의미한다.
- 단위: s(초)

동작
- effect가 interval_damage인 경우와 dot_damage인 경우 interval 간격에 따라 대미지가 들어간다.
- 적에게 대미지를 주는 버프인 경우, interval이 1s duration이 18s 라면 18초 동안 1초마다 18번 공격이 시행된다.

### cost
해당 effect가 적용될 때 소모되는 status 수량 이다. (현재 미하라 전용) 

### irremovable
해당 effect가 제거 불가능한 경우 true로 설정한다.

## 고려 사항
- 중첩 가능한 버프 및 디버프 스킬있음
- 중첩 가능한 스킬의 중첩량을 상승 시켜주는 버프가 존재
    - 3중첩 가능한 스킬을 다른 니케가 4중첩이 가능하도록 만들어 줄 수 있음
    - 이 경우 "중첩 가능한 스킬" 을 증가시켜준다고 툴팁에 적혀 있으므로 모든 중첩 스킬에 적용되지 않음 
