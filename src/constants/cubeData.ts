/**
 * cubeData.ts
 * 큐브 종류별 레벨에 따른 효과 데이터 및 계산 유틸리티
 */

/** 큐브 레벨 구간별 값을 반환하는 헬퍼 */
function tierValue(level: number, t1: number, t2: number, t3: number): number {
    if (level <= 2) return t1;
    if (level <= 6) return t2;
    return t3; // 7-15
}

/** 모든 큐브 공통: 레벨별 우월코드 대미지 증가% */
function commonWeakPointBonus(level: number): number {
    if (level <= 0) return 0;
    if (level <= 4) return 0;
    if (level <= 8) return 8.48;
    if (level === 9) return 10.6;
    if (level === 10) return 12.72;
    if (level <= 12) return 14.84;
    if (level <= 14) return 16.96;
    return 19.09; // 15
}

export interface CubeEffect {
    weakPointPercent: number;      // 공통 우코 대미지 증가% (0.1 = +10%)
    accuracyBuff: number;          // 명중률 증가% (0.01 = +1%)
    chargeDmgPercent: number;      // 차지 대미지 증가% (0.01 = +1%)
    reloadSpeedPercent: number;    // 재장전 속도 증가% (0.01 = +1%, 재장전 시간 감소)
    bastionRefund: number;         // 10발 사격 시 탄환 충전 수
    chargeSpeedPercent: number;    // 차지 속도 증가% (0.01 = +1%, 차지 시간 감소)
    ammoPercent: number;           // 최대 장탄 수 증가% (0.01 = +1%)
    hpPercent: number;             // 최대 체력 증가% (0.01 = +1%)
    defPercent: number;            // 방어력 증가% (0.01 = +1%)
    partDmgUp: number;             // 파츠 대미지 증가 (0.01 = +1%)
    pierceDmgUp: number;           // 관통 대미지 증가 (0.01 = +1%)
    ignoreDefDmgUp: number;        // 방어력 무시 대미지 (0.01 = +1%)
    splitDmgUp: number;            // 분배 대미지 증가 (0.01 = +1%)
}

const EMPTY_EFFECT: CubeEffect = {
    weakPointPercent: 0,
    accuracyBuff: 0,
    chargeDmgPercent: 0,
    reloadSpeedPercent: 0,
    bastionRefund: 0,
    chargeSpeedPercent: 0,
    ammoPercent: 0,
    hpPercent: 0,
    defPercent: 0,
    partDmgUp: 0,
    pierceDmgUp: 0,
    ignoreDefDmgUp: 0,
    splitDmgUp: 0,
};

/**
 * 큐브 이름과 레벨을 받아 해당 큐브의 효과를 반환합니다.
 */
export function getCubeEffect(cubeName: string, cubeLevel: number): CubeEffect {
    if (!cubeName || cubeName === 'None' || cubeLevel <= 0) return { ...EMPTY_EFFECT };

    const common = commonWeakPointBonus(cubeLevel) / 100;
    const effect: CubeEffect = { ...EMPTY_EFFECT, weakPointPercent: common };

    switch (cubeName) {
        case '01-cube-assault': // 어썰트: 명중률 증가
            effect.accuracyBuff = tierValue(cubeLevel, 2.54, 3.81, 5.09) / 100;
            break;
        case '02-cube-onslaught': // 택티컬 어설트: 차지 대미지 증가
            effect.chargeDmgPercent = tierValue(cubeLevel, 2.54, 3.81, 5.09) / 100;
            break;
        case '03-cube-resilience': // 렐릭 베어: 재장전 속도 증가
            effect.reloadSpeedPercent = tierValue(cubeLevel, 14.84, 22.27, 29.69) / 100;
            break;
        case '04-cube-bastion': // 택티컬 베어: 10발 사격 시 탄환 충전
            effect.bastionRefund = tierValue(cubeLevel, 1, 2, 3);
            break;
        case '05-cube-adjutant': // 렐릭 부스트: 차지 속도 증가
            effect.chargeSpeedPercent = tierValue(cubeLevel, 1.06, 1.59, 2.12) / 100;
            break;
        case '06-cube-wingman': // 택티컬 부스트: 최대 장탄 수 증가
            effect.ammoPercent = tierValue(cubeLevel, 14.84, 22.29, 29.69) / 100;
            break;
        // 07-cube-quantum: 버스트 게이지 충전 → 미구현
        case '08-cube-vigor': // 렐릭 비고르: 최대 체력 증가
            effect.hpPercent = tierValue(cubeLevel, 4.84, 7.27, 9.69) / 100;
            break;
        case '09-cube-endurance': // 렐릭 인듀어: 방어력 증가
            effect.defPercent = tierValue(cubeLevel, 24.20, 36.35, 48.45) / 100;
            break;
        // 10-cube-healing: 힐량 증가 → 미구현
        // 11-cube-tempering: 받는 데미지 감소 → 미구현
        // 12-cube-assist: 체력 20% 이하 시 HP → 미구현
        case '13-cube-destruction': // 렐릭 디스트로이: 파츠 대미지 증가
            effect.partDmgUp = tierValue(cubeLevel, 15.95, 23.92, 31.90) / 100;
            break;
        case '14-cube-piercing': // 렐릭 피어싱: 관통 대미지 증가
            effect.pierceDmgUp = tierValue(cubeLevel, 7.07, 10.6, 14.14) / 100;
            break;
        case '15-cube-crash': // 렐릭 크래시: 방어력 무시 대미지
            effect.ignoreDefDmgUp = tierValue(cubeLevel, 7.07, 10.6, 14.14) / 100;
            break;
        case '16-cube-divide': // 렐릭 디바이드: 분배 대미지 증가
            effect.splitDmgUp = tierValue(cubeLevel, 8.84, 13.27, 17.69) / 100;
            break;
    }

    return effect;
}
