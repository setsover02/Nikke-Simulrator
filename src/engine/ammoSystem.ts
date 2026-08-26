// engine/ammoSystem.ts
/* =================================================
   NIKKE Ammo & Reload System
   
   - 클립 무기 (일부 SG/RL) 1/3 분할 재장전 사이클 구현
   - [N초 유지] 장탄수 버프 만료 시 초과 잔탄 즉시 절삭
   - 재장전 속도 버프 및 고정 재장전 시간 지원
================================================= */

import { BattleContext, Character } from "../types/battle";

/**
 * 클립 무기 명단 (weapon_mechanics.json 정본)
 * 1회 reload_time은 탄창의 ~1/3만 채우며, 3회 연속 장전으로 완충
 */
export const CLIP_CHARACTERS = new Set<string>([
    // SG (9명)
    '누아르', '드레이크', '바이퍼', '네온', '페퍼', '슈가', '메이든', '프로덕트 23', '소다 : 트윙클링 바니',
    'Noir', 'Drake', 'Viper', 'Neon', 'Pepper', 'Sugar', 'Maiden', 'Product 23', 'Soda: Twinkling Bunny', 'Soda : Twinkling Bunny',
    // RL (5명)
    '센티', '루마니', '아니스', '자칼', '트리나',
    'Centi', 'Rumani', 'Anis', 'Jackal', 'Trina',
]);

/* =========================
   매 Tick 탄 관리
========================= */

export function updateAmmo(ctx: BattleContext) {
    const dt = ctx.delta;

    ctx.team.members.forEach((char) => {
        // 무한 탄약 모드: weaponOverride가 활성이고 maxAmmo가 "infinity"인 경우
        if (char.weaponOverride && char.weaponOverride.maxAmmo === 'infinity') {
            char.ammo = 999999;
            char.reloadRemain = 0;
            return;
        }

        const fullAmmo = getFullAmmo(char, ctx);

        /* 1️⃣ 장탄 버프 만료 처리: 비장전 중 최대 장탄수 초과 잔탄 절삭 */
        if (char.reloadRemain <= 0) {
            if (char.ammo > fullAmmo) {
                char.ammo = fullAmmo;
            }
        }

        /* 2️⃣ 장전 중 */
        if (char.reloadRemain > 0) {
            char.reloadRemain -= dt;

            // 1회 장전 스텝 완료
            if (char.reloadRemain <= 0) {
                finishReloadStep(char, ctx, fullAmmo);
            }

            return;
        }

        /* 3️⃣ 탄 없으면 재장전 시작 */
        if (char.ammo <= 0) {
            startReload(char, ctx);
            return;
        }
    });
}

/* =========================
   현재 실효 최대 장탄수 계산
========================= */

export function getFullAmmo(char: Character, ctx: BattleContext): number {
    // 무기 변경 모드 중이면 해당 모드의 장탄수 사용
    if (char.weaponOverride && typeof char.weaponOverride.maxAmmo === 'number') {
        return char.weaponOverride.maxAmmo;
    }

    const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;
    const extraAmmoPct = buffs ? buffs.max_ammo_pct / 100 : (char.buff?.maxAmmo || 0);
    const extraAmmoFlat = buffs?.max_ammo_flat || 0;

    return Math.max(1, Math.floor(char.maxAmmo * (1 + extraAmmoPct) + extraAmmoFlat));
}

/* =========================
   실효 재장전 1회 소요 시간 계산
========================= */

export function getReloadDuration(char: Character, ctx: BattleContext): number {
    const buffs = ctx.buffManager ? ctx.buffManager.getBuffs(char.id, char.id, ctx, ctx.time) : null;
    if (buffs?.reload_time_fixed !== null && buffs?.reload_time_fixed !== undefined) {
        return Math.max(0.01, buffs.reload_time_fixed);
    }

    const reloadSpeed = buffs ? buffs.reload_speed_pct / 100 : (char.buff?.reloadSpeed || 0);
    return Math.max(0.01, char.reloadTime * Math.max(0, 1 - reloadSpeed));
}

/* =========================
   클립 무기 여부 판정
========================= */

export function isClipReload(char: Character): boolean {
    if (char.weaponOverride) return false;
    if (char.isClipWeapon !== undefined) return char.isClipWeapon;
    if (char.name && CLIP_CHARACTERS.has(char.name)) return true;
    return false;
}

/* =========================
   클립 1회 장전량 계산 (floor(full / 3 + 0.5))
========================= */

export function getClipGain(fullAmmo: number): number {
    return Math.max(1, Math.floor(fullAmmo / 3 + 0.5));
}

/* =========================
   장전 시작
========================= */

function startReload(char: Character, ctx: BattleContext) {
    char.reloadRemain = getReloadDuration(char, ctx);
}

/* =========================
   장전 스텝 완료 (클립 분할 처리)
========================= */

function finishReloadStep(char: Character, ctx: BattleContext, fullAmmo: number) {
    if (isClipReload(char)) {
        const gain = getClipGain(fullAmmo);
        char.ammo = Math.min(fullAmmo, char.ammo + gain);

        // 아직 완충되지 않았으면 다음 클립 장전 즉시 개시 (event:full_reload 미발생)
        if (char.ammo < fullAmmo) {
            char.reloadRemain = getReloadDuration(char, ctx);
            return;
        }
    } else {
        char.ammo = fullAmmo;
    }

    // 최종 완충 완료
    char.reloadRemain = 0;
    if (ctx.buffManager) {
        ctx.buffManager.notify('event:full_reload', ctx.time, char.id, ctx);
    }
}