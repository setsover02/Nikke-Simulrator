# Skill
다음과 같이 정리한다
변수: 인게임 기준 설명 (부가설명)
스킬 설명 내 별도의 트리거가 없는 경우 duration을 기준으로 쿨다운을 갖는다.
- duration이 8초인 경우 전투 시작 8초 뒤 발동, 8초동안 지속된다. 이후 해당 사이클을 반복한다.

## 용어
시전자: 해당 스킬을 시전하는 니케를 기준으로 한다.
아군: 스쿼드, 팀에 포함된 아군을 말한다.

## Target
스킬 효과가 적용될 대상

self: 자신에게 (시전자 본인에게)

enemy: 적에게 
enemies_in_range: 공격 범위 내 적들에게
highest_atk_enemy: 최종 공격력이 가장 높은 적 1기에게

all_allies: 아군 전체에게
final_atk_ally: 최종 공격력이 가장 높은 아군 1기에게
top3_final_atk_allies: 최종 공격력이 가장 높은 아군 3기에게
fire_element_allies: 작열 코드 아군 전체에게
lowest_hp_ally: 체력 수치가 가장 낮은 아군 1기에게



## Skill Trigger
트리거에 의해 스킬이 발동한다

on_hit: 피격시 n% 확률로 자신에게 (시전자 본인이 피격된 경우)
normal_attack_hit: 일반 공격 명중 시 (시전자의 일반 공격이 명중한 경우, 명중 횟수 포함)
last_bullet_hit: 마지막 탄환 명중 시 (시전자의 마지막 탄환 소모 시)





## Skill Effects
적용될 스킬 효과

atk_up: 공격력 증가 (target 기준 공격력으로 증가한다)
atk_down: 공격력 감소 (target 기준 공격력으로 감소한다)
max_ammo_up: 최대 장탄수 증가 (target 기준 최대 장탄수로 증가한다)
defense_up: 방어력 증가 (target 기준 방어력으로 증가한다)

heal: 회복
max_hp_up: 최대 체력 증가 (target 기준 체력 으로 증가한다)
extra_damage: 추가 대미지 (해당 스킬이 트리거에 따라 발동할 때 추가 타격)
cover_defense_up: 엄폐물 방어력 증가
critical_rate_up: 크리티컬 확률 증가

taunt: 도발

## based_on
final_atk: 최종 공격력 (시전자의 최종 공격력 기반으로 계산)
attack_damage: 공격 데미지 비례