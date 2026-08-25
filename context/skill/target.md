# 정의
스킬 target 리스트는 이곳에 정리합니다.
작성 규칙은 [ 변수명: 인게임 툴팁 (부가설명)]의 형식으로 작성한다.
* 시전자: 해당 스킬을 시전하는 니케를 기준으로 한다.
* 아군: 스쿼드, 팀에 포함된 아군을 말한다.
* 아군 n기에게 라는 툴팁은 시전자 본인을 포함한다
* 최종 이라는 툴팁이 있는 경우 해당 니케에게 버프가 적용된 상태의 공격력, 방어력, 체력을 기준으로 한다.
* 시전자 기준 (체력, 공격력, 방어력) 증가 스킬은 스킬을 시전하는 니케의 스탯 수치를 기준으로 한다.

## target list
self: 자신에게 (시전자 본인에게)

### 적에게
enemy: 대상에게
all_enemies: 적 전체에게
enemies_in_range: 공격 범위 내 적들에게
highest_atk_enemy_1: 최종 공격력이 가장 높은 적 1기에게
highest_atk_enemy_2: 최종 공격력이 가장 높은 적 2기에게 (적이 1기인 경우 1기에게)
highest_def_enemy_1: 최종 방어력이 가장 높은 적 1기에게
highest_def_enemy_2: 최종 방어력이 가장 높은 적 2기에게 (적이 1기인 경우 1기에게)
highest_def_enemy_3: 최종 방어력이 가장 높은 적 3기에게 (적이 1기인 경우 1기에게)
highest_hp_enemy_1: 최종 체력이 가장 높은 적 1기에게 (남은 체력 수치가 가장 높은 적)
lowest_hp_enemy: 남은 체력 수치가 가장 낮은 적에게
lowest_def_enemy_1: 최종 방어력이 가장 낮은 적 1기에게
random_enemies: 무작위 적에게 (적이 1기인 경우 1기에게)
closest_enemy: 조준선에 가장 가까운 적 1기에게
fire_element_enemy: 작열 코드 적에게
water_element_enemy: 수냉 코드 적에게
electric_element_enemy: 전격 코드 적에게
iron_element_enemy: 철갑 코드 적에게
wind_element_enemy: 풍압 코드 적에게
same_target: 동일 적 대상에게 (직전 공격이나 스킬과 동일한 타겟)
target: 대상에게 (현재 공격 중인 대상 또는 스킬의 타겟)

enemies_with_chain_binding: 사슬 감기 상태인 대상에게 (미하라 전용)


### 아군에게
all_allies: 아군 전체에게
allies_excluding_self: 자신을 제외한 아군 전체에게
self_and_highest_atk_allies_1: 자신과 자신을 제외한 최종 공격력이 가장 높은 아군 1기에게
self_and_highest_atk_allies_2: 자신과 자신을 제외한 최종 공격력이 가장 높은 아군 2기에게
self_and_highest_atk_allies_3: 자신과 자신을 제외한 최종 공격력이 가장 높은 아군 3기에게
self_and_adjacent_allies_2: 자신과 양 옆에 있는 아군 2기에게
highest_atk_allies_1: 최종 공격력이 가장 높은 아군 1기에게 (전투중 버프가 적용된 수치를 계산후 공격력이 가장 높은 아군)
highest_atk_allies_2: 최종 공격력이 가장 높은 아군 2기에게 (전투중 버프가 적용된 수치를 계산후 공격력이 가장 높은 아군)
highest_atk_allies_3: 최종 공격력이 가장 높은 아군 3기에게 (전투중 버프가 적용된 수치를 계산후 공격력이 가장 높은 아군)
highest_atk_dead_allies_1: 전투불능 상태인 아군 중 최종 공격력이 가장 높은 아군 1기에게 (라푼젤, 마나 등 부활 대상)
sg_allies: 샷건 소지 아군 전체에게
sg_allies_excluding_self: 자신을 제외한 샷건 소지 아군 전체에게
sr_allies: 스나이퍼 라이플(SR) 소지 아군 전체에게
rl_allies: 로켓 런처(RL) 소지 아군 전체에게
ar_allies: 어설트 라이플(AR) 소지 아군 전체에게
mg_allies: 머신건(MG) 소지 아군 전체에게
smg_allies: 서브 머신건(SMG) 소지 아군 전체에게
attacker_allies: 화력형 아군 전체에게
defender_allies: 방어형 아군 전체에게
supporter_allies: 지원형 아군 전체에게
fire_element_allies: 작열 코드 아군 전체에게
water_element_allies: 수냉 코드 아군 전체에게
electric_element_allies: 전동/전격 코드 아군 전체에게
iron_element_allies: 철갑 코드 아군 전체에게
wind_element_allies: 풍압 코드 아군 전체에게
lowest_hp_ally: 체력 비율(또는 수치)이 가장 낮은 아군 1기에게
lowest_hp_allies_1: 체력 비율이 가장 낮은 아군 1기에게
lowest_hp_allies_1_excluding_self: 자신을 제외한 남은 체력 수치가 가장 낮은 아군 1기에게 (블랑 불굴 등)
lowest_hp_allies_2: 체력 비율이 가장 낮은 아군 2기에게
lowest_hp_allies_3: 체력 비율이 가장 낮은 아군 3기에게
highest_def_allies_1: 최종 방어력이 가장 높은 아군 1기에게
highest_def_allies_2: 최종 방어력이 가장 높은 아군 2기에게
highest_max_hp_allies_1: 최종 최대 체력이 가장 높은 아군 1기에게
highest_max_hp_allies_2: 최종 최대 체력이 가장 높은 아군 2기에게
full_burst_caster_allies: 풀 버스트를 발동한 아군에게 (풀 버스트 개시 시 버스트를 사용한 아군)
full_burst_non_caster_allies: 풀 버스트를 발동하지 않은 아군에게 (풀 버스트 개시 시 버스트를 사용하지 않은 아군)
