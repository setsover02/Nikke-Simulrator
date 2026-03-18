# 정의
스킬 target 리스트는 이곳에 정리합니다.
변수: 인게임 기준 설명 (부가설명)
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
random_enemies: 무작위 적에게 (적이 1기인 경우 1기에게)

### 아군에게
all_allies: 아군 전체에게
self_and_highest_atk_allies_1: 자신과 자신을 제외한 최종 공격력이 가장 높은 아군 1기에게
self_and_highest_atk_allies_2: 자신과 자신을 제외한 최종 공격력이 가장 높은 아군 2기에게
self_and_highest_atk_allies_3: 자신과 자신을 제외한 최종 공격력이 가장 높은 아군 3기에게
self_and_adjacent_allies_2: 자신과 양 옆에 있는 아군 2기에게
highest_atk_allies_1: 최종 공격력이 가장 높은 아군 1기에게 (전투중 버프가 적용된 수치를 계산후 공격력이 가장 높은 아군)
highest_atk_allies_2: 최종 공격력이 가장 높은 아군 2기에게 (전투중 버프가 적용된 수치를 계산후 공격력이 가장 높은 아군)
highest_atk_allies_3:최종 공격력이 가장 높은 아군 3기에게 (전투중 버프가 적용된 수치를 계산후 공격력이 가장 높은 아군)
sg_allies: 샷건 소지 아군 전체에게
fire_element_allies: 작열 코드 아군 전체에게
water_element_allies: 수냉 코드 아군 전체에게
electric_element_allies: 전동 코드 아군 전체에게
iron_element_allies: 철갑 코드 아군 전체에게
wind_element_allies: 풍압 코드 아군 전체에게
lowest_hp_allies_1: 체력 비율이 가장 낮은 아군 1기에게 (현재 피격 개념이 없으므로 일단 미구현)
lowest_hp_allies_2: 체력 비율이 가장 낮은 아군 2기에게 (현재 피격 개념이 없으므로 일단 미구현)
lowest_hp_allies_3: 체력 비율이 가장 낮은 아군 3기에게 (현재 피격 개념이 없으므로 일단 미구현)
