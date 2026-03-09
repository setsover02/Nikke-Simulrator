# Skill
다음과 같이 정리한다
변수: 인게임 기준 설명 (부가설명)

## 용어
시전자: 해당 스킬을 시전하는 니케를 기준으로 한다.
아군: 스쿼드, 팀에 포함된 아군을 말한다.


## trigger list
on_hit: 피격시 n% 확률로 자신에게 (시전자 본인이 피격된 경우)
normal_attack_hit: 일반 공격 명중 시 (시전자의 일반 공격이 명중한 경우, 명중 횟수 포함)
last_bullet_hit: 마지막 탄환 명중 시 (시전자의 마지막 탄환 소모 시)


## target list
* 아군 n기에게 라는 툴팁은 시전자 본인을 포함한다

self: 자신에게 (시전자 본인에게)

enemy: 대상에게
enemies_in_range: 공격 범위 내 적들에게
highest_atk_enemy: 최종 공격력이 가장 높은 적 1기에게

all_allies: 아군 전체에게
final_atk_ally: 최종 공격력이 가장 높은 아군 1기에게
top3_final_atk_allies: 최종 공격력이 가장 높은 아군 3기에게
fire_element_allies: 작열 코드 아군 전체에게
lowest_hp_ally: 체력 비율이 가장 낮은 아군 1기에게


## effect list
atk_up: 공격력 증가 (target 기준 공격력으로 증가한다)
atk_down: 공격력 감소 (target 기준 공격력으로 감소한다)
max_ammo_up: 최대 장탄수 증가 (target 기준 최대 장탄수로 증가한다)
defense_up: 방어력 증가 (target 기준 방어력으로 증가한다)

heal: 공격 대미지 비례 회복
max_hp_up: 최대 체력 증가 (target 기준 체력 으로 증가한다)
damage: 대미지 (해당 스킬이 트리거에 따라 발동할 때 추가 타격)
extra_damage: 추가 대미지 (아마 평타에 이 만큼 추가 되는 것인듯? 사격장 테스트 필요)
cover_defense_up: 엄폐물 방어력 증가
critical_rate_up: 크리티컬 확률 증가

taunt: 도발


## duration
number: 초 단위 시간
permanent: 영구적으로 적용

## cooldown
number: 초 단위 시간

## unit
해당 value 값의 단위를 설정한다
- percent: value%
- second: 초

## based_on
final_atk: 최종 공격력 (시전자의 최종 공격력 기반으로 계산)
attack_damage: 공격 대미지
caster_final_max_hp: 시전자 최종 최대 체력 기준



# 새로 추가된 변수들 (JSON 추출)
### Target
all_enemies: 적 전체에게
lowest_hp_enemy: 체력이 가장 낮은 적 1기에게
random_enemies: 무작위 적에게
target: (특정 명시 없음/기본 대상에게)

### Skill Trigger
ammo_consumed: 탄환 소모 시
battle_start: 전투 시작 시
burst_cast: 버스트 스킬 시전 시
enemy_spawn: 적 출현 시
full_burst_end: 풀 버스트 종료 시
full_burst_start: 풀 버스트 시작 시
full_burst_time: 풀 버스트 지속 시간 동안
full_charge_attack: 풀 차지 공격 시
part_destroy: 부위 파괴 시
self_focusing: 자신에게 포커싱(도발) 시

### Skill Effects
accuracy_up: 명중률 증가
attack_damage_up: 공격 데미지 증가
attack_power_down: 공격력 감소
attack_power_up: 공격력 증가
bubble: 보스런 버블 (디펜스 버블 등)
bubble_barrage: 버블 연사
burst_cooldown_reduction: 버스트 스킬 쿨다운 감소
burst_gauge_charge: 버스트 게이지 스톡 충전
crit_damage_up: 크리티컬 데미지 증가
crit_rate_up: 크리티컬 확률 증가
critical_damage_up: 크리티컬 데미지 증가 (위와 동일)
damage: 피해 가함
defense_down: 방어력 감소
dispel: 이로운 효과 해제 (디스펠)
explosion_range_up: 폭발 범위 증가
full_burst_time_down: 풀 버스트 시간 감소
heal_efficacy_up: 회복 효율 증가
hit_rate_up: 명중률 증가 (위와 동일)
interval_damage: 지속 피해(틱뎀)
overheal_storage: 초과 회복량 저장
pierce: 관통
shield: 보호막 생성
shooting_focus: 사격 집중 폼

### based_on
caster_atk: 시전자 공격력 기준
caster_attack: 시전자 공격력 기준

caster_max_hp: 시전자 최대 체력 기준