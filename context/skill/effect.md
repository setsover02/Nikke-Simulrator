# 정의
각 버프별 효과를 정의한다.
작성 규칙은 [ 변수명: 인게임 툴팁 (부가설명)]의 형식으로 작성한다.
* 시전자: 해당 스킬을 시전하는 니케를 기준으로 한다.
* 아군: 스쿼드, 팀에 포함된 아군을 말한다.
* 아군 n기에게 라는 툴팁은 시전자 본인을 포함한다
* 최종 이라는 툴팁이 있는 경우 해당 니케에게 버프가 적용된 상태의 공격력, 방어력, 체력을 기준으로 한다.
* 시전자 기준 (체력, 공격력, 방어력) 증가 스킬은 스킬을 시전하는 니케의 스탯 수치를 기준으로 한다.

## effect list
### 스킬 관련
damage: 대미지 (해당 스킬이 트리거에 따라 발동할 때 추가 타격, 버스트 스킬 대미지 등)
extra_damage: 추가 대미지 (공격 명중 시 추가 대미지)
interval_damage: 인터벌 대미지 (interval이 있는 연속 공격, 지속 대미지 아님)
distribute_damage: 분배 대미지 (모든 타겟에게 분배되어 들어가는 대미지, 적이 1명이면 그대로 다 들어감)
dot_damage: 지속 대미지 (지속시간동안 이어지며 툴팁에 작성된 간격에 따른 지속 대미지)
accumulate_damage: 누적 폭발 대미지 (시전자가 가하는 대미지의 일부를 누적하여 폭발 대미지를 가함, 트로니 전용)
burst_bubble: 버블 파열 (리틀 머메이드 전용, 버블 상태인 적에게 추가 폭발 대미지)
bubble_barrage: 버블 세례 (리틀 머메이드 전용, 다단 히트 스킬 대미지)
single_target_burst_damage_up: 대상 설명이 '~ 적 1기에게'로 끝나는 버스트 스킬 대미지 증가 (자칼 전용)

### 공격력
atk_up: 공격력 증가 (기본값: target 기준 공격력으로 증가, 시전자 기준 설정 가능)
atk_damage_up: 공격 대미지 증가 (공격력 증가와 별개 곱연산 계열)
atk_down: 공격력 감소 (적 공격력 감소 디버프)
atk_speed_up: 공격 속도 증가 (연사 속도 증가, 솔린 등)
parts_damage_up: 파츠 대미지 증가 (적에게 파츠가 있는 경우 파츠 공격 시 대미지 증가)
core_damage_up: 코어 대미지 증가 (적 코어 명중 시 가하는 대미지 증가)
element_damage_up: 우월 코드 공격 대미지 증가 (약점 속성 공격 시 가하는 대미지 증가)
normal_attack_multiplier_up: 일반 공격 대미지 배율 증가
dot_damage_up: 지속 대미지 증가 (dot_damage의 대미지만 증가)
ignore_def_damage_up: 방어력 무시 대미지 증가 (방어력 무시 대미지 속성 공격력 증가)
projectile_damage_up: 적 발사체에 가하는 대미지 증가 (미사일 등 요격 대미지 증가, 일레그/클레이 등)
charge_damage_up: 차지 대미지 증가
charge_damage_per_ammo_up: 최종 최대 장탄 수 1발 당 차지 대미지 증가 (에밀리아 전용)
charge_speed_up: 차지 속도 증가 (차지 시간 감소)
charge_speed_down: 차지 속도 감소 (차지 시간 증가)
convert_charge_speed_to_damage: 차지 속도 100% 초과 시 초과된 값을 차지 대미지로 변환 (레드 후드 전용)
copy_atk: 공격력이 가장 높은 아군의 공격력 복제 (길티 전용)

### 장탄
max_ammo_up: 최대 장탄 수 증가
max_ammo_down: 최대 장탄 수 감소 (프리바티 등)
ammo_charge: 탄환 충전 (percent: 최대 장탄 수 비례 회복, count: 정량 탄환 충전)
infinite_ammo: 장탄 수 무한 (지속 시간 동안 탄환 소모 없음, 모더니아 등)

### 방어력
def_up: 방어력 증가 (기본값: target 기준 방어력으로 증가, 시전자 기준 설정 가능)
def_down: 방어력 감소 (적 방어력 감소 디버프)

### 체력
max_hp_up: 최대 체력 증가 (based_on 기준 체력으로 증가)
max_hp_down: 최대 체력 감소
current_hp_down: 현재 체력 감소 (자해 스킬, 길로틴/홍련/A2 등)
copy_max_hp: 최대 체력이 가장 높은 아군의 최대 체력 복제 (신, 퀀시 전용)

### 힐 관련
heal: 체력 회복 (공격 대미지 비례, 시전자 최대 체력 비례, 대상 최대 체력 비례)
dot_heal: 지속 체력 회복 (1초 간격 등 일정 주기마다 체력 지속 회복, 블랑/메어리 등)
receive_heal: 받는 체력 회복량
receive_heal_up: 받는 체력 회복량 증가
heal_efficacy_up: 체력 회복 효과 증가
overheal_storage: 초과 받는 체력 회복량 저장
revive: 체력 n%로 부활 (전투불능 아군 부활, 라푼젤/마나 등)

### 방어 / 생존 관련
damage_share: 받는 대미지 균등 분배
differential_damage_share: 받는 대미지 차등 분배 (베이 전용)
damage_taken_down: 받는 대미지 감소
damage_taken_up: 받는 대미지 증가 (적이 받는 대미지 증가 디버프)
shield: 보호막 (시전자 최대 체력 비례 또는 대상 최대 체력 비례)
shield_hp_heal: 보호막 체력 회복 (시전자 최대 체력 비례)
next_shield_hp_up: 다음 보호막 체력 증가 (킬로 전용)
immortality: 불굴 (사망에 이르는 피해를 받아도 체력 1 이하로 떨어지지 않는 무적 상태, 블랑/마키마 등)
invincible: 무적 (지속 시간 동안 모든 피해 무효화, 크라운/비스킷 등)
decoy: 디코이 / 분신 소환 (시전자 최대 체력 비례 분신을 소환하여 대신 피격, 라이 전용)
stealth: 은신 (1인 공격 대상에서 제외, 직접 피격 시 해제, 로산나 전용)

### 명중률 및 사거리
accuracy_up: 명중률 증가
max_range_up: 적정 최대 사거리 증가 (샷건 적정 사거리 연장, 레오나 전용)

### 크리티컬 관련
critical_rate_up: 크리티컬 확률 증가
critical_rate_down: 크리티컬 확률 감소
critical_damage_up: 크리티컬 대미지 증가

### 엄폐물
cover_defense_up: 엄폐물 방어력 증가
cover_max_hp_up: 엄폐물 최대 체력 증가
cover_hp_heal: 엄폐물 체력 회복 (리타 등)
cover_revive: 파괴된 엄폐물 부활

### 버스트 관련
burst_cooldown_reduction: 버스트 스킬 재사용 시간 감소 (초 단위 고정 감소)
burst_cooldown_reduction_pct: 버스트 스킬 재사용 시간 감소 (퍼센트 단위 감소)
burst_gauge_charge: 버스트 게이지 충전
burst_gauge_charge_speed_up: 버스트 게이지 충전 속도 증가
full_burst_time_down: 풀 버스트 시간 감소 (풀버스트 지속 시간 단축, 이사벨 등)
full_burst_time_up: 풀 버스트 시간 증가 (풀버스트 지속 시간 연장, 모더니아/소다 등)
burst_reenter: 버스트 단계 재진입 (스킬 시전 후 해당 버스트 단계로 재진입 가능, 티아/루피: 윈터 쇼퍼 등)

### 상태이상 및 군중 제어
taunt: 도발 (적의 공격 대상을 자신으로 고정)
dispel: 해로운 효과 해제 (디버프 정화)
debuff_immunity: 해로운 효과 면역 (디버프 방어)
dispel_buff: 이로운 효과 해제 (적 버프 제거, 로산나 등)
stun: 기절 (행동 불가)
immobile: 이동 불가 (유니 등)

### 특수 무기 및 변신
change_weapon: 사용 무기 변경 (버스트 지속 시간 동안 무기 스펙 변경)
pierce: 관통 특화 (장벽 및 적 관통 사격 가능 상태)
pierce_damage_up: 관통 대미지 증가
pierce_range_up: 관통 범위 확장 (레드 후드 전용)
shield_damage_up: 보호막에 가하는 대미지 증가
pellet_count_up: 펠릿 개수 증가 (샷건 펠릿 수 증가)
explosion_range_up: 폭발 범위 증가 (RL 유효 반경 증가)
extermination_mode: 섬멸 모드 (조준선 확장 및 범위 내 적 동시 조준, 모더니아 전용)
target_extermination: 타겟 섬멸 (특정 부위 타격 시 추가 버프를 부여하는 표식 디버프, D: 킬러 와이프 전용)
full_charge_count_change: 풀 차지 공격 횟수 조건 변경 (홍련 : 흑영 버스트 전용 효과)
skill_cooldown_reduction: 특정 스킬 재사용 시간 감소 (target_skill: "skill_1" 또는 "skill_2")
skill_trigger_count_reduction: 스킬 발동 명중 횟수 조건 감소 (스노우 화이트: 이노센트 데이즈 전용)
stack_boost: 중첩 가능 이로운 효과 중첩량 증가 (페퍼 등)
remove_status: 고유 상태 해제
charge_status: 고유 상태 충전 / 스택 획득
status_damage_with_stack_copy: 대상의 특정 상태 중첩을 복사하여 적용하는 지속 대미지 (미하라 전용)
