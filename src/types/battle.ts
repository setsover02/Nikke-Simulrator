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

    skills: Skill[];

    // 버프 관련 추가
    buff?: any;
    atkCoef?: number;
    critMult?: number;
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
}

export interface BattleResult {
    duration: number;
    totalDamage: number;
    dps: number;
    burstCount: number;
    log: LogEntry[];
}