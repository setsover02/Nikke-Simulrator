# 정의
각 버프별 효과를 정의한다.
변수: 인게임 기준 설명 (부가설명)
* 시전자: 해당 스킬을 시전하는 니케를 기준으로 한다.
* 아군: 스쿼드, 팀에 포함된 아군을 말한다.
* 아군 n기에게 라는 툴팁은 시전자 본인을 포함한다
* 최종 이라는 툴팁이 있는 경우 해당 니케에게 버프가 적용된 상태의 공격력, 방어력, 체력을 기준으로 한다.
* 시전자 기준 (체력, 공격력, 방어력) 증가 스킬은 스킬을 시전하는 니케의 스탯 수치를 기준으로 한다.

## effect list
### 스킬 관련
damage: 대미지 (해당 스킬이 트리거에 따라 발동할 때 추가 타격)
extra_damage: 추가 대미지 (아마 평타에 이 만큼 추가 되는 것인듯? 사격장 테스트 필요, 풀버스트 발동시 적용되는 fullBurstBonus의 대미지 보너스가 적용됨)
interval_damage: (interval이 있는 연속 공격, 지속 대미지 아님)
distribute_damage: 분배 대미지 (모든 타겟에게 분배되어 들어가는 대미지, 적이 1명이면 그대로 다 들어감)
dot_damage: 지속 대미지 (지속시간동안 이어지며 툴팁에 작성된 간격에 따른 지속 대미지, interval_damage와 다름)

### 공격력
atk_up: 공격력 증가 (기본값: target 기준 공격력으로 증가한다)
atk_damage_up: 공격 대미지 증가 (공격력 증가와 공격 대미지 증가는 다름, 계산식 확인)
atk_down: 공격력 감소 (기본값: target 기준 공격력으로 감소한다)
parts_damage_up: 파츠 대미지 증가 (적에게 파츠가 있는 경우에만 적용, 파츠에 대미지가 들어갈때 버프 수치만큼 증가하며, 일반 공격의 경우는 증가하지 않는다.)
element_damage_up: 우월 코드 공격 대미지 증가
normal_attack_multiplier_up: 일반 공격 대미지 n% 배율 증가
dot_damage_up: 지속 대미지 증가 (dot_damage의 대미지만 증가함)
status_damage_with_stack_copy: 대상의 특정 상태 중첩을 복사하여 적용하는 지속 대미지 (미하라 전용)
    - 미하라의 버스트 스킬은 chain_binding 상태인 적에게 chain_pull status를 적용하여 대미지를 입히고, chain_binding 상태를 해제한다.

### 장탄
max_ammo_up: 최대 장탄수 증가 (기본값: target 기준 최대 장탄수로 증가한다)
ammo_charge: 탄환 충전 
    - percent인 경우: 타겟의 장탄수 기준 스킬 퍼센트 수치만큼 장탄 수 회복
    - count인 경우: 스킬 수치만큼 장탄 수 회복

### 방어력
def_up: 방어력 증가 (기본값: target 기준 방어력으로 증가한다)
def_down: 방어력 감소 (기본값: target 기준 방어력으로 감소한다)

### 체력
max_hp_up: 최대 체력 증가 (based_on 기준 체력 으로 증가한다)

### 힐 관련
heal: 공격 대미지 비례 회복
recevie_heal: 받는 체력 회복량
overheal_storage: 초과 받는 체력 회복량 저장

### 방어 관련
damage_share: 받는 대미지 균등 분배
damage_taken_down: 받는 대미지 감소

### 명중률
accuracy_up: 명중률 증가

### 크리티컬 관련
critical_rate_up: 크리티컬 확률 증가
critical_damage_up: 크리티컬 대미지 증가

### 엄폐물
cover_defense_up: 엄폐물 방어력 증가

### 버스트 관련
burst_cooldown_reduction: 버스트 스킬 재사용 시간 감소 (스쿼드의 각 니케가 보유한 버스트 스킬의 쿨타임을 감소)
burst_gauge_charge: 버스트 게이지 충전(버스트 게이지를 추후 구현 할 경우 고려사항 지금은 구현하지 않음)
full_burst_time_down: 풀 버스트 시간 감소 (기본 풀버스트 시간이 10초 이므로 스킬이 트리거 될 때 풀버스트 시간 n초로 고정 감소시킨다.)

### 기타 특수 효과
shield: 보호막
taunt: 도발
dispel: 해로운 효과 해제 (캐릭터의 스킬로 얻는 부정적 효과들은 해제 안됨, 적에게서 받는 디버프만 해제 가능)
shooting_focus: 사격 집중 (시뮬레이터에서 구현하지 않음)
change_weapon : 사용 무기 변경
    - 스킬의 duration 동안 또는 별도의 트리거 시간에 따라 해당 시간 동안만 무기가 변경된다.
    - 무기 변경시 chargeTime, fireRate, fullChargeDamage, maxAmmo 등이 변경될 수 있다.
    - 스킬 내부 weapon_override에 정의한다.
    - 해당 무기의 atkCoef값은 현재까지 확인된 바로는 스킬의 value 값으로 적용한다.
    - 무기 변경시 대미지는 우선 스킬 대미지로 분류하여 스킬 대미지: scatterChart에 표시할 수 있도록 한다. 
pellet_count_up: 펠릿 개수 증가 (삿건 니케의 경우만 적용)
    - 기본 펠릿 개수 10 + 스킬로 증가하는 개수만큼 적용한다.
    - 펠릿이 증가한다고 하여 공격력이 추가로 늘어나지 않는다.
    - 니케의 atkCoef가 100%라면 (펠릿 개수 / atkCoef로 적용된다.)

<!-- 시뮬레이션에서 적용 못할거 같음 -->
explosion_range_up: 폭발 범위 증가 

### status 관련 효과
remove_status: status 해제 (특정 니케들이 가지고 있는 target에게 적용된 status를 해제한다.)


### 미하라: 본딩 체인 추가 효과
charge_status: 특정 상태(status)의 스택을 충전 또는 증가시킴 
> 불필요한 경우 삭제처리

