export interface Skill {
    id: string;
    type: string;
    cooldown?: number;
    effects?: any[];
    // ...
}

export interface BuffTimelineEvent {
    skillName: string;
    buffType: string;
    startTime: number;
    endTime: number;
    isBullet: boolean;
    sourceCharId: string;
    value: number;
    stackLevel?: number;
}

export interface BuffSlot {
    timerKey: string;       // 고유 키 (sourceId__skillName__effect)
    effect: string;         // 효과 종류 (atk_up, def_up, ...)
    value: number;          // 스킬 level 반영된 원본 수치 (%)
    appliedFlat: number;    // 실제로 buff에 더해진 flat 값
    duration?: number;      // 남은 시간 (초), undefined = 영구
    bullet?: number;        // 남은 탄 수
    isBullet: boolean;
    sourceCharId: string;
    skillName: string;
    status?: string;
    basedOn?: string;       // 동적 재계산을 위한 based_on 값 (e.g. caster_final_max_hp)
    pct?: number;           // 동적 재계산을 위한 원본 % 수치
    sourceChar?: { id: string }; // 시전자 참조 (기본 atk 억세스용)
}

export interface Character {
    id: string;
    slotIndex: number;           // 팀 내 슬롯 번호 (0-based, 버스트 우선순위 결정)

    atk: number;
    defense: number;
    hp: number;
    crit: number;

    element?: string;
    weapon?: string;
    charClass?: string;
    company?: string;
    squad?: string;              // 소속 부대
    burstLevel?: number;

    skill1Level?: number;
    skill2Level?: number;
    burstLevelSkill?: number;

    /* 탄 관련 */
    maxAmmo: number;
    ammo: number;

    reloadTime: number;
    reloadRemain: number;

    chargeTime?: number;
    fullChargeDamage?: number;

    fireRate: number; // shots per sec
    fireAccumulator?: number; // fractional shots accumulated
    currentCharge?: number; // fractional charge accumulated (for RL/SR)

    skills: Skill[];

    // 버프 관련 추가
    buff?: any;
    buffSlots?: BuffSlot[];                      // 개별 버프 슬롯 추적
    buffTimers?: Record<string, number>;         // (Legacy) 시간 기반 버프 만료 타이머
    buffBulletCounters?: Record<string, number>; // (Legacy) 탄환 소모 기반 버프 만료 카운터
    buffValues?: Record<string, number>;         // (Legacy) 소스별 버프 기여 수치 추적
    buffTimeline?: BuffTimelineEvent[];          // 타임라인 기록용 배열
    atkCoef?: number;
    critMult?: number;
    coreDamage?: number;
    coreHitBonus?: number;   // 코어 히트 시 Major Modifiers에 가산되는 값 (기본 1.0, 강화형 1.5)
    comboShots?: number;     // 연속 사격 횟수 (반동 누적용)
    accuracyBuff?: number;   // 명중률 버프 합산 (0.2 = +20%)
    totalAmmoUsed?: number;
    warmupLevel?: number;  // MG 예열 레벨 (0=냉각, 1=예열 완료)
    activeIntervalSkills?: any[]; // 주기적으로 발동하는 액티브 스킬 상태 추적
    maxHp?: number;              // 최대 체력 (heal 계산용, 스킬 버프로 변경 가능)

    /* 장비 추가 옵션 */
    equipATKPercent?: number;        // 장비 추가 공격력% (0.1 = +10%)
    equipWeakPointPercent?: number;  // 장비 우월코드 데미지% (0.1 = +10%)
    equipAmmoPercent?: number;       // 장비 장탄수% (0.1 = +10%)
    equipCritDmgPercent?: number;    // 장비 크리티컬 대미지 증가% (0.1 = +10%)

    /* 큐브 추가 옵션 */
    cubePartDmgUp?: number;          // 큐브 파츠 대미지 증가 (0.1 = +10%)
    cubePierceDmgUp?: number;        // 큐브 관통 대미지 증가 (0.1 = +10%)
    cubeIgnoreDefDmgUp?: number;     // 큐브 방어력 무시 대미지 (0.1 = +10%)
    cubeBastionRefund?: number;      // 큐브 10발 사격 시 탄환 충전 수

    /* 소장품 추가 옵션 */
    normalAtkMultiplier?: number;    // 일반 공격 대미지 배율 증가 (%)
    chargeDmgMultiplier?: number;    // RL, SR 소장품 배율 (%)
    coreHitMultiplier?: number;      // AR 소장품 배율 (%)

    /* SG 펠릿 */
    pelletCount?: number;            // SG 펠릿 수 (기본 10)

    /* change_weapon 효과 */
    weaponOverride?: {
        chargeTime?: number;
        fireRate?: number;
        fullChargeDamage?: number;
        maxAmmo?: number | string;   // "infinity" = 무한 탄약
    };
    originalWeaponStats?: {
        chargeTime: number;
        fireRate: number;
        fullChargeDamage: number;
        maxAmmo: number;
        atkCoef: number;
        ammo: number;
        reloadRemain: number;
    };
}

export interface Team {
    members: Character[];
}

export interface Enemy {
    hp: number;
    defense: number;
    element?: string;
    debuff?: any;
}

export interface SimConfig {
    seed?: number;
    tick?: number;
    duration: number; // in seconds
    fullBurstDuration?: number;
    fullBurstInterval?: number;  // deprecated: 하위호환용
    burstGaugeDelay?: number;    // 풀버스트 간격: 게이지 충전에 소모되는 시간 (기본 4.58초, 최소 2.52초)
    rangeMode?: number; // 교전 거리 (명중률 원 크기에 영향)
}

export interface LogEntry {
    time: number;
    type: string;
    value?: number;
    source?: string;
    description?: string;
}

export interface BattleContext {
    time: number;
    delta: number;
    config: SimConfig;

    team: Team;
    enemy: Enemy;

    burstGauge: number;
    burstActive: boolean;
    burstRemain: number;

    totalDamage: number;
    totalAmmoUsed: number;
    totalTeamAmmoUsed: number;  // 팀 전체 탄환 소모 합산 (all_allies_ammo_consumed 트리거용)
    log: LogEntry[];

    rng: any; // Random instance
    state?: Record<string, any>;
    burstSystem?: any;
    burstCooldowns: Record<string, number>; // charId -> cooldown remain
    burstZones: { start: number; end: number }[]; // 기록용 풀버스트 구간

    // 버스트 체인 상태 머신
    burstChainState: 'idle' | 'gauge_filling' | 'chain_l1' | 'chain_l2' | 'chain_l3' | 'full_burst';
    burstChainTimer: number;   // 게이지 충전 타이머 or 체인 대기 타이머
    fullBurstTimer: number;    // 풀버스트 남은 시간
    enemyHitsPerSecond?: number; // 적의 초당 공격 횟수 (on_hit 트리거 근사용, 기본 2)
}

export interface BattleResult {
    duration: number;
    totalDamage: number;
    dps: number;
    burstCount: number;
    burstZones: { start: number; end: number }[];
    log: LogEntry[];
    team: Team;
}
