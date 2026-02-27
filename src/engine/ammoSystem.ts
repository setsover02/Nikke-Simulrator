// engine/ammoSystem.ts

import { BattleContext } from "../types/battle";

/* =========================
   매 Tick 탄 관리
========================= */

export function updateAmmo(ctx: BattleContext) {
    const dt = ctx.delta;

    ctx.team.members.forEach((char) => {
        /* 장전 중 */
        if (char.reloadRemain > 0) {
            char.reloadRemain -= dt;

            // 장전 완료
            if (char.reloadRemain <= 0) {
                finishReload(char);
            }

            return;
        }

        /* 탄 없으면 장전 시작 */
        if (char.ammo <= 0) {
            startReload(char);
            return;
        }
    });
}

/* =========================
   장전 시작
========================= */

function startReload(char: any) {
    char.reloadRemain = char.reloadTime;
}

/* =========================
   장전 완료
========================= */

function finishReload(char: any) {
    char.ammo = char.maxAmmo;
    char.reloadRemain = 0;
}