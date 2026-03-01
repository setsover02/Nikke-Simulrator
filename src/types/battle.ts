export interface Skill {
    id: string;
    type: string;
    // ...
}

export interface Character {
    id: string;

    atk: number;
    defense: number;
    hp: number;
    crit: number;

    element?: string;
    weapon?: string;
    charClass?: string;
    company?: string;
    burstLevel?: number;

    /* 탄 관련 */
    maxAmmo: number;
    ammo: number;

    reloadTime: number;
    reloadRemain: number;

    chargeTime?: number;
    fullChargeDamage?: number;

    fireRate: number; // shots per sec
    fireAccumulator?: number; // fractional shots accumulated

    skills: Skill[];

    // 버프 관련 추가
    buff?: any;
    buffTimers?: Record<string, number>;
    atkCoef?: number;
    critMult?: number;
    coreDamage?: number;
    coreHitBonus?: number;   // 코어 히트 시 Major Modifiers에 가산되는 값 (기본 1.0, 강화형 1.5)
    comboShots?: number;     // 연속 사격 횟수 (반동 누적용)
    accuracyBuff?: number;   // 명중률 버프 합산 (0.2 = +20%)
    totalAmmoUsed?: number;
    warmupLevel?: number;  // MG 예열 레벨 (0=냉각, 1=예열 완료)

    /* 장비 추가 옵션 */
    equipATKPercent?: number;        // 장비 추가 공격력% (0.1 = +10%)
    equipWeakPointPercent?: number;  // 장비 우월코드 데미지% (0.1 = +10%)
    equipAmmoPercent?: number;       // 장비 장탄수% (0.1 = +10%)
}

export interface Team {
    members: Character[];
}

export interface Enemy {
    hp: number;
    defense: number;
    debuff?: any;
}

export interface SimConfig {
    seed?: number;
    tick?: number;
    duration: number; // in seconds
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
    log: LogEntry[];

    rng: any; // Random instance
    state?: Record<string, any>;
    burstSystem?: any;
}

export interface BattleResult {
    duration: number;
    totalDamage: number;
    dps: number;
    burstCount: number;
    log: LogEntry[];
}