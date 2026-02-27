// types/damage.ts
// 니케 데미지 공식 기준 파라미터 정의

export interface DamageParams {
    /* =========================
       [기본 데미지] 영역
       = 기본 공격력 × (100%+추가공증-방어) × 공격계수
    ========================= */

    baseATK: number;
    // 기본 공격력

    extraATKBonus: number;
    // 추가 공증 수치 (% → 소수, 예: 25% = 0.25)

    enemyDEFCoef: number;
    // 상대 방어력 계수

    atkCoef: number;
    // 공격 계수 (무기/캐릭별 보정)


    /* =========================
       [기본 데미지 증가 계수]
       = 100% + (크댐+코어+거리+풀버 등)
    ========================= */

    bonusAtk: number;
    // 공격 데미지 증가

    critBonusBase: number;
    // 크댐 수치 (기본 크리 데미지 증가)

    meleeBonus: number;
    // 근접 보너스

    rangeBonus: number;
    // 거리 보너스 (30%)

    fullBurstBonus: number;
    // 풀버스트 보너스 (50%)


    /* =========================
       [버프형 데미지 증가 계수]
       = 공뎀증+파츠+관통+지속+방무+투사체+저지부위
    ========================= */

    atkDmgUp: number;
    // 공격 데미지 증가

    partDmgUp: number;
    // 파츠 데미지 증가

    pierceDmgUp: number;
    // 관통 데미지 증가

    dotDmgUp: number;
    // 지속 데미지 증가

    ignoreDefDmgUp: number;
    // 방어력 무시 데미지 증가

    projectileDmgUp: number;
    // 투사체 데미지 증가

    weakPartDmgUp: number;
    // 저지 부위 데미지 증가

    extraDmgUp: number;
    // 기타 "데미지 증가"


    /* =========================
       [치명타 계수]
       = 250% / 350% + 추가차뎀
    ========================= */

    isCrit: boolean;
    // 크리티컬 여부

    critMultiplier: number;
    // 치명타 배율 (2.5 / 3.5)

    extraCritDmg: number;
    // 추가 치명타 데미지


    /* =========================
       [우월 코드 계수]
       = 110% + 추가 우월
    ========================= */

    weakPointBase: number;
    // 기본 우월 코드 (기본 1.1)

    weakPointExtra: number;
    // 추가 우월 수치


    /* =========================
       [받는 데미지 계수]
       = 받뎀증 + 분배뎀증 - 받뎀감
    ========================= */

    enemyTakenUp: number;
    // 상대방 받는 데미지 증가

    shareDmgUp: number;
    // 분배 데미지 증가

    enemyTakenDown: number;
    // 상대방 받는 데미지 감소
}