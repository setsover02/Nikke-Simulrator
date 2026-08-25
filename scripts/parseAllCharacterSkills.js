/**
 * parseAllCharacterSkills.js
 * Scrapes and accurately parses skills from scraper/nikke_scraped.json into src/character/ json files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SCRAPED_PATH = path.join(ROOT, 'scraper', 'nikke_scraped.json');
const CHAR_DIR = path.join(ROOT, 'src', 'character');
const CONTEXT_DIR = path.join(ROOT, 'context', 'skill');

// Helpers
export function stripTags(text) {
    if (!text) return '';
    return text.replace(/<\/?[^>]+(>|$)/g, '').replace(/\xa0/g, ' ').trim();
}

export function toFloat(val, defaultVal = 0) {
    if (val === null || val === undefined) return defaultVal;
    const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? defaultVal : num;
}

export function parseValueMatrix(valList) {
    if (!valList || !Array.isArray(valList) || valList.length === 0) return [];
    const matrix = [];
    for (const item of valList) {
        if (!item) {
            matrix.push(new Array(10).fill(0));
            continue;
        }
        const vals = item.description_value || [];
        if (Array.isArray(vals) && vals.length > 0) {
            const arr = vals.map(v => toFloat(v));
            while (arr.length < 10) arr.push(arr[arr.length - 1] || 0);
            matrix.push(arr.slice(0, 10));
        } else {
            matrix.push(new Array(10).fill(0));
        }
    }
    return matrix;
}

export function simplifyArrayIfUniform(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return arr;
    const first = arr[0];
    const allSame = arr.every(v => Math.abs(v - first) < 1e-6);
    return allSame ? first : arr;
}

export function getValOrArray(matrix, matchStr, defaultVal = 0) {
    if (!matchStr) return defaultVal;
    const m = matchStr.match(/\{description_value_(\d+)\}/);
    if (m) {
        const idx = parseInt(m[1], 10) - 1;
        if (matrix[idx]) return matrix[idx];
    }
    const num = parseFloat(matchStr.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? defaultVal : num;
}

// Track newly introduced variables
export const usedVars = {
    triggers: new Set(),
    targets: new Set(),
    effects: new Set(),
    based_on: new Set(),
    statuses: new Set()
};

function normalizeStatus(name) {
    const map = {
        '릴렉스': 'relax',
        '휴식': 'relax',
        '포획 사슬': 'capture_chain',
        '사슬 감기': 'chain_binding',
        '사슬 당기기': 'chain_pull',
        '버블': 'bubble',
        '소드 코인': 'sword_coin',
        '실드 코인': 'shield_coin',
        '더블 소드 코인': 'double_sword_coin',
        '청춘의 기록': 'youth_record',
        '행복한 기억': 'happy_memories',
        '소중한 추억': 'precious_memories',
        '추억 남기기': 'leaving_memories',
        '타겟 섬멸': 'target_extermination',
        '완벽한 메이드': 'perfect_maid',
        '나노 코팅': 'nano_coating',
        '매터 감마': 'matter_gamma',
        '매터 시그마': 'matter_sigma',
        '근성': 'guts',
        '딸기 사탕': 'strawberry_candy',
        '리프레쉬 하트': 'refresh_heart',
        '해킹 코드 수집': 'hacking_code_collection',
        '히어로 비전': 'hero_vision',
        '피의 마인': 'blood_fiend',
        '포효': 'roar',
        'B 모드': 'b_mode',
        '은신': 'stealth',
        '바이러스 전이': 'virus_transfer',
        '빙결의 마녀': 'ice_witch',
        '골든 칩': 'golden_chip',
        '시간 연장 I': 'time_extension_1',
        '시간 연장 II': 'time_extension_2',
        '승리의 외침': 'cry_of_victory',
        '붐 인스톨': 'boom_install'
    };
    return map[name] || name;
}

// Skill parsing logic per character skill
export function parseSkillClauses(skillDetail, isBurst = false, charName = '') {
    if (!skillDetail || !skillDetail.description_localkey) return [];
    const rawText = skillDetail.description_localkey;
    const matrix = parseValueMatrix(skillDetail.description_value_list);

    const cleanText = stripTags(rawText);
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    const rawClauses = [];
    let curClause = [];

    for (const line of lines) {
        if (line.startsWith('■') || line.startsWith('<Step') || /^Step\s*\d/i.test(line)) {
            if (curClause.length > 0) {
                rawClauses.push(curClause.join('\n'));
                curClause = [];
            }
        }
        curClause.push(line);
    }
    if (curClause.length > 0) {
        rawClauses.push(curClause.join('\n'));
    }

    const effects = [];

    for (let cIdx = 0; cIdx < rawClauses.length; cIdx++) {
        const clause = rawClauses[cIdx];
        const cLines = clause.split('\n').map(l => l.trim()).filter(Boolean);
        if (cLines.length === 0) continue;

        let header = cLines[0].replace('■', '').trim();
        let bodyLines = cLines.slice(1);

        if (header.startsWith('[') && !header.includes('시') && !header.includes('에게')) {
            bodyLines.unshift(header);
            header = isBurst ? '자신에게' : '전투 시작 시 자신에게';
        }

        // Trigger detection
        let trigger = isBurst ? 'burst_cast' : 'passive';
        let condition = undefined;

        let singleStepMatch = clause.match(/<Step\s*(\d)|Step\s*(\d)/i);
        let stepNum = singleStepMatch ? parseInt(singleStepMatch[1] || singleStepMatch[2], 10) : undefined;

        if (header.includes('전투 시작 시')) {
            trigger = 'battle_start';
        } else if (header.includes('풀 버스트 타임 시작 시')) {
            trigger = 'full_burst_start';
        } else if (header.includes('풀 버스트 타임 종료 시 직전에 자신이 버스트')) {
            trigger = 'full_burst_end_after_self_burst';
        } else if (header.includes('풀 버스트 타임 종료 시') || header.includes('풀 버스트 타임 종료 후')) {
            trigger = 'full_burst_end';
        } else if (header.includes('풀 버스트 타임 지속 시간 중 일반 공격') || (header.includes('풀 버스트 타임 지속 시간 중') && header.includes('명중 시')) || (header.includes('풀 버스트 타임 지속 중 일반 공격') && header.includes('공격 시'))) {
            trigger = 'full_burst_normal_attack';
            const cntM = header.match(/일반\s*공격\s*(\{description_value_\d+\}|\d+)\s*회/);
            if (cntM) {
                condition = { count: getValOrArray(matrix, cntM[1], 1) };
            }
        } else if (header.includes('풀 버스트 타임 지속 시간 중') || header.includes('풀 버스트 타임 지속 중') || header.includes('풀 버스트 타임일 때') || header.includes('풀 버스트 타임 동안')) {
            trigger = 'full_burst_time';
        } else if (header.includes('마지막 탄환 명중 시') || header.includes('마지막 탄환 사격 시') || header.includes('마지막 탄환 소비 시') || header.includes('마지막 탄환 공격 시')) {
            trigger = 'last_bullet_hit';
        } else if (header.includes('풀 차지') && (header.includes('공격 시') || header.includes('사격 시') || header.includes('명중 시'))) {
            trigger = 'full_charge_attack';
            const cntM = header.match(/풀\s*차지\s*(\{description_value_\d+\}|\d+)\s*회/);
            if (cntM) {
                condition = { count: getValOrArray(matrix, cntM[1], 1) };
            }
        } else if (header.includes('버스트 1단계 진입 시') || header.includes('버스트 1단계 돌입 시')) {
            trigger = 'enter_burst_1';
        } else if (header.includes('버스트 2단계 진입 시') || header.includes('버스트 2단계 돌입 시')) {
            trigger = 'enter_burst_2';
        } else if (header.includes('버스트 3단계 진입 시') || header.includes('버스트 3단계 돌입 시')) {
            trigger = 'enter_burst_3';
        } else if (header.includes('버스트 스킬 사용 시') || header.includes('자신이 버스트 스킬 사용 시') || header.includes('버스트 스킬 발동 시')) {
            trigger = 'burst_cast';
        } else if (header.includes('파츠 파괴 시')) {
            trigger = 'part_destroy';
        } else if (header.includes('대상 파츠 명중 시') || header.includes('파츠 명중 시')) {
            trigger = 'part_hit';
        } else if (header.includes('대상 코어 명중 시') || header.includes('코어 명중 시')) {
            trigger = 'core_hit';
        } else if (header.includes('적 처치 시') || header.includes('자신이 적 처치 시') || header.includes('적 격추 시')) {
            trigger = 'kill_enemy';
        } else if (header.includes('엄폐물 피격 시') || header.includes('피격 시') || header.includes('자신이 피격 시')) {
            trigger = 'on_hit';
            const chMatch = header.match(/(\{description_value_\d+\}|\d+)\s*%\s*확률/);
            if (chMatch) {
                condition = { chance: getValOrArray(matrix, chMatch[1], 100) };
            }
            const cntMatch = header.match(/(\{description_value_\d+\}|\d+)\s*회\s*피격/);
            if (cntMatch) {
                condition = Object.assign(condition || {}, { count: getValOrArray(matrix, cntMatch[1], 1) });
            }
        } else if (header.includes('자신이 체력 회복 시') || header.includes('체력 회복 시') || header.includes('체력 회복 효과 적용 시')) {
            trigger = 'heal_received';
        } else if (header.includes('자신이 전투 불능 시')) {
            trigger = 'self_incapacitated';
        } else if (header.includes('적 사망 시')) {
            trigger = 'enemy_death';
        } else if (header.includes('적 등장 시') || header.includes('전장에 진입')) {
            trigger = 'enemy_spawn';
        } else if (header.includes('아군이 소비한 탄') || header.includes('아군이 소비한 탄환')) {
            trigger = 'all_allies_ammo_consumed';
            const cntM = header.match(/(\{description_value_\d+\}|\d+)\s*발/);
            if (cntM) condition = { count: getValOrArray(matrix, cntM[1], 100) };
        } else if (header.includes('자신이 소비한 탄') || header.includes('자신이 소비한 탄환')) {
            trigger = 'ammo_consumed';
            const cntM = header.match(/(\{description_value_\d+\}|\d+)\s*발/);
            if (cntM) condition = { count: getValOrArray(matrix, cntM[1], 100) };
        } else if (header.includes('최대 중첩 상태라면') || header.includes('최대 중첩 시')) {
            trigger = 'max_stack_applied';
        } else if (header.includes('지정된 타이밍에')) {
            trigger = 'designated_timing';
        } else if (header.includes('재장전 완료 시') || header.includes('재장전 시')) {
            trigger = 'full_reload';
        } else if (header.includes('포커싱 상태')) {
            trigger = 'focus';
        } else if (header.includes('일반 공격') || header.includes('펠릿')) {
            const cntM = header.match(/(?:일반\s*공격|펠릿)\s*(\{description_value_\d+\}|\d+)\s*(?:회|개)\s*(?:명중|공격|사격)?/);
            if (cntM) {
                trigger = header.includes('명중') ? 'normal_attack_hit' : 'normal_attack';
                condition = { count: getValOrArray(matrix, cntM[1], 1) };
            } else if (header.includes('명중 시')) {
                trigger = 'normal_attack_hit';
            } else {
                trigger = 'normal_attack';
            }
        }

        // Additional conditions
        if (header.includes('체력이') && header.includes('이상')) {
            const hpM = header.match(/체력이\s*(\{description_value_\d+\}|\d+)\s*%\s*이상/);
            if (hpM) {
                condition = Object.assign(condition || {}, { hp_above: getValOrArray(matrix, hpM[1], 0) });
            }
        } else if (header.includes('체력이') && (header.includes('이하') || header.includes('미만'))) {
            const hpM = header.match(/체력이\s*(\{description_value_\d+\}|\d+)\s*%\s*(?:이하|미만)/);
            if (hpM) {
                condition = Object.assign(condition || {}, { hp_below: getValOrArray(matrix, hpM[1], 100) });
            }
        }

        if (header.includes('확률로')) {
            const chMatch = header.match(/(\{description_value_\d+\}|\d+)\s*%\s*확률/);
            if (chMatch) {
                condition = Object.assign(condition || {}, { chance: getValOrArray(matrix, chMatch[1], 100) });
            }
        }

        if (stepNum !== undefined) {
            condition = Object.assign(condition || {}, { step: stepNum });
        }

        // Target detection
        let defaultTarget = 'self';

        if (header.includes('자신과 자신을 제외한 최종 공격력이 가장 높은 아군 1기') || header.includes('자신과 공격력이 가장 높은 아군 1기')) {
            defaultTarget = 'self_and_highest_atk_allies_1';
        } else if (header.includes('자신과 자신을 제외한 최종 공격력이 가장 높은 아군 2기') || header.includes('자신과 공격력이 가장 높은 아군 2기')) {
            defaultTarget = 'self_and_highest_atk_allies_2';
        } else if (header.includes('자신과 자신을 제외한 최종 공격력이 가장 높은 아군 3기')) {
            defaultTarget = 'self_and_highest_atk_allies_3';
        } else if (header.includes('자신과 양 옆에 있는 아군 2기')) {
            defaultTarget = 'self_and_adjacent_allies_2';
        } else if (header.includes('최종 공격력이 가장 높은 아군 1기') || header.includes('공격력이 가장 높은 아군 1기')) {
            defaultTarget = 'highest_atk_allies_1';
        } else if (header.includes('최종 공격력이 가장 높은 아군 2기') || header.includes('공격력이 가장 높은 아군 2기')) {
            defaultTarget = 'highest_atk_allies_2';
        } else if (header.includes('최종 공격력이 가장 높은 아군 3기') || header.includes('공격력이 가장 높은 아군 3기')) {
            defaultTarget = 'highest_atk_allies_3';
        } else if (header.includes('전투불능 상태') && header.includes('공격력이 가장 높은 아군')) {
            defaultTarget = 'highest_atk_dead_allies_1';
        } else if (header.includes('체력 비율이 가장 낮은 아군 1기') || header.includes('체력이 가장 낮은 아군 1기') || header.includes('남은 체력 비율이 가장 낮은 아군 1기') || header.includes('체력 수치가 가장 낮은 아군 1기') || header.includes('남은 체력 수치가 가장 낮은 아군 1기')) {
            defaultTarget = header.includes('자신을 제외한') ? 'lowest_hp_allies_1_excluding_self' : 'lowest_hp_allies_1';
        } else if (header.includes('체력 비율이 가장 낮은 아군 2기') || header.includes('남은 체력 비율이 가장 낮은 아군 2기')) {
            defaultTarget = 'lowest_hp_allies_2';
        } else if (header.includes('체력 비율이 가장 낮은 아군 3기') || header.includes('남은 체력 비율이 가장 낮은 아군 3기')) {
            defaultTarget = 'lowest_hp_allies_3';
        } else if (header.includes('최종 방어력이 가장 높은 아군 1기') || header.includes('방어력이 가장 높은 아군 1기')) {
            defaultTarget = 'highest_def_allies_1';
        } else if (header.includes('최종 방어력이 가장 높은 아군 2기')) {
            defaultTarget = 'highest_def_allies_2';
        } else if (header.includes('최대 체력이 가장 높은 아군 1기') || header.includes('최종 최대 체력이 가장 높은 아군 1기')) {
            defaultTarget = 'highest_max_hp_allies_1';
        } else if (header.includes('최대 체력이 가장 높은 아군 2기') || header.includes('최종 최대 체력이 가장 높은 아군 2기')) {
            defaultTarget = 'highest_max_hp_allies_2';
        } else if (header.includes('샷건 소지 아군 전체') || header.includes('SG 소지 아군')) {
            defaultTarget = header.includes('자신을 제외한') ? 'sg_allies_excluding_self' : 'sg_allies';
        } else if (header.includes('스나이퍼 라이플 소지 아군') || header.includes('SR 소지 아군') || header.includes('저격소총 소지 아군')) {
            defaultTarget = 'sr_allies';
        } else if (header.includes('로켓 런처 소지 아군') || header.includes('RL 소지 아군')) {
            defaultTarget = 'rl_allies';
        } else if (header.includes('어설트 라이플 소지 아군') || header.includes('AR 소지 아군') || header.includes('돌격소총 소지 아군')) {
            defaultTarget = 'ar_allies';
        } else if (header.includes('머신건 소지 아군') || header.includes('MG 소지 아군') || header.includes('기관총 소지 아군')) {
            defaultTarget = 'mg_allies';
        } else if (header.includes('서브 머신건 소지 아군') || header.includes('SMG 소지 아군') || header.includes('기관단총 소지 아군')) {
            defaultTarget = 'smg_allies';
        } else if (header.includes('화력형 아군 전체')) {
            defaultTarget = 'attacker_allies';
        } else if (header.includes('지원형 아군 전체')) {
            defaultTarget = 'supporter_allies';
        } else if (header.includes('방어형 아군 전체')) {
            defaultTarget = 'defender_allies';
        } else if (header.includes('작열 코드 아군 전체') || header.includes('작열 아군')) {
            defaultTarget = 'fire_element_allies';
        } else if (header.includes('수냉 코드 아군 전체') || header.includes('수냉 아군')) {
            defaultTarget = 'water_element_allies';
        } else if (header.includes('전격 코드 아군 전체') || header.includes('전동 코드 아군 전체') || header.includes('전격 아군')) {
            defaultTarget = 'electric_element_allies';
        } else if (header.includes('철갑 코드 아군 전체') || header.includes('철갑 아군')) {
            defaultTarget = 'iron_element_allies';
        } else if (header.includes('풍압 코드 아군 전체') || header.includes('풍압 아군')) {
            defaultTarget = 'wind_element_allies';
        } else if (header.includes('풀 버스트를 발동한 아군') || header.includes('버스트 스킬을 시전한 아군')) {
            defaultTarget = 'full_burst_caster_allies';
        } else if (header.includes('풀 버스트를 발동하지 않은 아군') || header.includes('버스트 스킬을 시전하지 않은 아군')) {
            defaultTarget = 'full_burst_non_caster_allies';
        } else if (header.includes('아군 전체에게') || header.includes('아군 전체')) {
            defaultTarget = header.includes('자신을 제외한') ? 'allies_excluding_self' : 'all_allies';
        } else if (header.includes('동일 적 대상에게') || header.includes('동일 적에게')) {
            defaultTarget = 'same_target';
        } else if (header.includes('최종 공격력이 가장 높은 적 1기') || header.includes('공격력이 가장 높은 적 1기')) {
            defaultTarget = 'highest_atk_enemy_1';
        } else if (header.includes('최종 공격력이 가장 높은 적 2기') || header.includes('공격력이 가장 높은 적 2기')) {
            defaultTarget = 'highest_atk_enemy_2';
        } else if (header.includes('최종 방어력이 가장 높은 적 1기') || header.includes('방어력이 가장 높은 적 1기')) {
            defaultTarget = 'highest_def_enemy_1';
        } else if (header.includes('최종 방어력이 가장 높은 적 2기')) {
            defaultTarget = 'highest_def_enemy_2';
        } else if (header.includes('최종 방어력이 가장 높은 적 3기')) {
            defaultTarget = 'highest_def_enemy_3';
        } else if (header.includes('최종 방어력이 가장 낮은 적 1기') || header.includes('방어력이 가장 낮은 적 1기')) {
            defaultTarget = 'lowest_def_enemy_1';
        } else if (header.includes('최종 체력이 가장 높은 적 1기') || header.includes('남은 체력 수치가 가장 높은 적 1기')) {
            defaultTarget = 'highest_hp_enemy_1';
        } else if (header.includes('남은 체력 수치가 가장 낮은 적 1기') || header.includes('체력 비율이 가장 낮은 적') || header.includes('체력이 가장 낮은 적')) {
            defaultTarget = 'lowest_hp_enemy';
        } else if (header.includes('무작위 적')) {
            defaultTarget = 'random_enemies';
        } else if (header.includes('조준선에 가장 가까운 적') || header.includes('가장 가까운 적')) {
            defaultTarget = 'closest_enemy';
        } else if (header.includes('공격 범위 내 적들에게') || header.includes('공격 범위 내 적')) {
            defaultTarget = 'enemies_in_range';
        } else if (header.includes('적 전체에게') || header.includes('적 전체')) {
            defaultTarget = 'all_enemies';
        } else if (header.includes('대상 본체에게') || header.includes('대상에게') || header.includes('적 1기에게') || header.includes('적에게')) {
            defaultTarget = 'target';
        } else if (header.includes('자신에게') || header.includes('자신')) {
            defaultTarget = 'self';
        }

        usedVars.triggers.add(trigger);
        usedVars.targets.add(defaultTarget);

        const fullBodyText = bodyLines.join('\n');

        // Check for [사용 무기 변경]
        if (fullBodyText.includes('[사용 무기 변경]')) {
            const chargeM = fullBodyText.match(/차지\s*시간\s*:\s*([\d.]+)\s*초/);
            const dmgM = fullBodyText.match(/대미지\s*:\s*(?:최종\s*공격력\s*)?(\{description_value_\d+\}|[\d.]+)\s*%/);
            const fullChargeM = fullBodyText.match(/풀\s*차지\s*대미지\s*:\s*([\d.]+)\s*%/);
            const maxAmmoM = fullBodyText.match(/최대\s*장탄\s*수\s*:\s*(\{description_value_\d+\}|[\d.]+)\s*발/);
            const durM = fullBodyText.match(/유지\s*시간\s*:\s*(\{description_value_\d+\}|[\d.]+)\s*초/);
            const isInfinite = fullBodyText.includes('장탄 수 무한');

            const weaponOverride = {
                chargeTime: chargeM ? toFloat(chargeM[1]) : undefined,
                atkCoef: dmgM ? getValOrArray(matrix, dmgM[1], 100) : undefined,
                fullChargeDamage: fullChargeM ? toFloat(fullChargeM[1]) : undefined,
                maxAmmo: isInfinite ? 'infinity' : (maxAmmoM ? getValOrArray(matrix, maxAmmoM[1], 1) : undefined)
            };

            const effObj = {
                trigger,
                target: defaultTarget,
                effect: 'change_weapon',
                weapon_override: weaponOverride,
                duration: durM ? simplifyArrayIfUniform(getValOrArray(matrix, durM[1], 10)) : 10
            };
            if (condition) effObj.condition = condition;
            effects.push(effObj);
            usedVars.effects.add('change_weapon');
        }

        // Special: Scarlet Black Shadow burst (화무십일홍 · 만개)
        if (fullBodyText.includes('풀 차지 공격 횟수 조건이 1회/2회/3회 로 변경')) {
            const durM = fullBodyText.match(/\{description_value_(\d+)\}\s*초\s*유지/);
            const effObj = {
                trigger,
                target: 'self',
                effect: 'full_charge_count_change',
                target_skill: 'skill_1',
                counts: [1, 2, 3],
                duration: durM ? simplifyArrayIfUniform(matrix[parseInt(durM[1], 10) - 1]) : 10
            };
            effects.push(effObj);
            usedVars.effects.add('full_charge_count_change');
        }

        // Line by line processing
        let activeLineStackLevel = undefined;
        let activeLineCount = undefined;
        let activeLineTarget = undefined;

        for (const line of bodyLines) {
            // Check for section headers
            if (line.includes('시작 횟수 별 효과') || line.includes('사용 횟수 별 효과') || line.includes('공격 횟수 별 효과') || line.includes('하위 효과 중복 적용') || line.includes('단계별 효과만 적용') || line.includes('골든 칩 중첩량 별 효과') || line.includes('시간 연장 상태 별 효과')) {
                continue;
            }

            // Stage / Level prefixes
            const linePrefixM = line.match(/^(\d+)\s*회\s*:\s*(.*)/) || line.match(/^(\d+)\s*단계\s*:\s*(.*)/);
            let contentStr = line;
            if (linePrefixM) {
                const countNum = parseInt(linePrefixM[1], 10);
                contentStr = linePrefixM[2];
                if (trigger === 'full_charge_attack' || trigger === 'normal_attack' || trigger === 'normal_attack_hit') {
                    activeLineCount = countNum;
                } else {
                    activeLineStackLevel = countNum;
                }
            }

            // D: Killer Wife part hit lines
            if (line.includes('파츠를 명중시킨 아군')) {
                activeLineTarget = 'all_allies';
            } else if (line.includes('본체를 명중시킨 아군')) {
                activeLineTarget = 'all_allies';
            } else if (contentStr.includes('최종 방어력이 가장 낮은 적')) {
                activeLineTarget = 'lowest_def_enemy_1';
            } else if (contentStr.includes('공격 범위 내 적들에게')) {
                activeLineTarget = 'enemies_in_range';
            } else if (contentStr.includes('적 전체에게')) {
                activeLineTarget = 'all_enemies';
            } else if (contentStr.includes('아군 전체에게')) {
                activeLineTarget = 'all_allies';
            } else if (contentStr.includes('자신에게')) {
                activeLineTarget = 'self';
            } else {
                activeLineTarget = defaultTarget;
            }

            // Extract brackets in this line
            const bracketRegex = /\[([^\]]+)\]/g;
            let bMatch;
            const brackets = [];
            while ((bMatch = bracketRegex.exec(contentStr)) !== null) {
                brackets.push(bMatch[1].trim());
            }

            let i = 0;
            while (i < brackets.length) {
                const b = brackets[i];
                i++;

                // Skip meta labels & section headers
                if (b.includes('초 유지') || b.includes('중첩') || b === '지속' || b.includes('전투 중 1회') || b.includes('발 유지') || b.includes('초 간격') || b === '사용 무기 변경' || b === '사용 횟수 별 효과' || b === '시작 횟수 별 효과' || b === '하위 효과 중복 적용' || b === '단계별 효과만 적용' || b.startsWith('명중 부위') || b.includes('풀 차지 공격 횟수 조건이') || b === '골든 칩 중첩량 별 효과' || b === '시간 연장 상태 별 효과') {
                    continue;
                }

                let effectType = 'buff';
                let basedOn = undefined;
                let unit = 'percent';
                let val = undefined;
                let status = undefined;
                let duration = undefined;
                let stack = undefined;
                let bullet = undefined;
                let interval = undefined;
                let stackLevel = activeLineStackLevel;
                let extraProps = {};

                // based on
                if (b.includes('시전자의 최종 최대 체력') || b.includes('시전자 최종 최대 체력')) {
                    basedOn = 'caster_final_max_hp';
                } else if (b.includes('시전자 기준 최대 체력') || b.includes('시전자 최대 체력')) {
                    basedOn = 'caster_max_hp';
                } else if (b.includes('시전자 기준 방어력') || b.includes('시전자 방어력')) {
                    basedOn = 'caster_def';
                } else if (b.includes('시전자 기준 공격력') || b.includes('시전자 공격력') || b.includes('시전자 기준')) {
                    basedOn = 'caster_atk';
                } else if (b.includes('공격 대미지 비례')) {
                    basedOn = 'attack_damage';
                } else if (b.includes('최종 공격력') || b.includes('최종 공격력의')) {
                    basedOn = 'caster_final_atk';
                } else if (b.includes('최종 최대 체력') || b.includes('자신의 최대 체력')) {
                    basedOn = 'final_hp';
                } else if (b.includes('최종 방어력')) {
                    basedOn = 'final_def';
                } else if (b.includes('최종 최대 장탄 수 1발 당') || b.includes('최대 장탄 수 1발 당')) {
                    basedOn = 'final_max_ammo';
                }

                // value
                const valM = b.match(/\{description_value_(\d+)\}/);
                if (valM) {
                    val = matrix[parseInt(valM[1], 10) - 1] || new Array(10).fill(0);
                } else {
                    const numM = b.match(/([\d.]+)\s*(?:%|초|발|개|기)?/);
                    if (numM && !b.startsWith('Step') && !b.includes('발동')) {
                        val = toFloat(numM[1]);
                    }
                }

                // status
                if (b.includes(':')) {
                    const parts = b.split(':');
                    const prefix = parts[0].trim();
                    if (/^(\d+)\s*회$/.test(prefix) || /^(\d+)\s*단계$/.test(prefix)) {
                        stackLevel = parseInt(prefix, 10);
                    } else if (!prefix.includes('대미지') && !prefix.includes('공격력') && !prefix.includes('주목') && !prefix.includes('기능') && !prefix.includes('효과')) {
                        status = normalizeStatus(prefix);
                        usedVars.statuses.add(status);
                    }
                }

                // Effect type mappings
                if (b.includes('공격력 복제') || b.includes('공격력 복사')) {
                    effectType = 'copy_atk';
                    unit = 'percent';
                } else if (b.includes('최대 체력 복제') || b.includes('최대 체력 복사')) {
                    effectType = 'copy_max_hp';
                    unit = 'percent';
                } else if (b.includes('디코이') || b.includes('분신')) {
                    effectType = 'decoy';
                    unit = 'percent';
                    if (!basedOn) basedOn = 'caster_final_max_hp';
                } else if (b.includes('적 발사체 공격 시')) {
                    effectType = 'projectile_damage_up';
                    unit = 'percent';
                } else if (b.includes('공격력') && b.includes('▲')) {
                    effectType = 'atk_up';
                    unit = 'percent';
                } else if (b.includes('공격력') && b.includes('▼')) {
                    effectType = 'atk_down';
                    unit = 'percent';
                } else if (b.includes('공격 대미지') && b.includes('▲')) {
                    effectType = 'atk_damage_up';
                    unit = 'percent';
                } else if (b.includes('공격 속도') && b.includes('▲')) {
                    effectType = 'atk_speed_up';
                    unit = 'percent';
                } else if (b.includes('방어력') && b.includes('▲')) {
                    effectType = 'def_up';
                    unit = 'percent';
                } else if (b.includes('방어력') && b.includes('▼')) {
                    effectType = 'def_down';
                    unit = 'percent';
                } else if (b.includes('최대 체력') && b.includes('▲')) {
                    effectType = 'max_hp_up';
                    unit = 'percent';
                } else if (b.includes('최대 체력') && b.includes('▼')) {
                    effectType = 'max_hp_down';
                    unit = 'percent';
                } else if (b.includes('현재 체력') && b.includes('▼')) {
                    effectType = 'current_hp_down';
                    unit = 'percent';
                } else if (b.includes('최대 장탄 수') && b.includes('▲')) {
                    effectType = 'max_ammo_up';
                    unit = b.includes('%') ? 'percent' : 'count';
                } else if (b.includes('최대 장탄 수') && b.includes('▼')) {
                    effectType = 'max_ammo_down';
                    unit = b.includes('%') ? 'percent' : 'count';
                } else if (b.includes('재장전 속도') || b.includes('재장전 시간')) {
                    effectType = 'reload_speed_up';
                    unit = 'percent';
                } else if (b.includes('차지 속도') || b.includes('차지 시간')) {
                    effectType = b.includes('▼') && !b.includes('시간') ? 'charge_speed_down' : 'charge_speed_up';
                    unit = 'percent';
                } else if (b.includes('차지 대미지') && b.includes('▲')) {
                    effectType = b.includes('최대 장탄 수 1발 당') ? 'charge_damage_per_ammo_up' : 'charge_damage_up';
                    unit = 'percent';
                } else if (b.includes('크리티컬 확률') && b.includes('▲')) {
                    effectType = 'critical_rate_up';
                    unit = 'percent';
                } else if (b.includes('크리티컬 확률') && b.includes('▼')) {
                    effectType = 'critical_rate_down';
                    unit = 'percent';
                } else if (b.includes('크리티컬 대미지') && b.includes('▲')) {
                    effectType = 'critical_damage_up';
                    unit = 'percent';
                } else if (b.includes('명중률') && b.includes('▲')) {
                    effectType = 'accuracy_up';
                    unit = 'percent';
                } else if (b.includes('우월 코드')) {
                    effectType = 'element_damage_up';
                    unit = 'percent';
                } else if (b.includes('파츠 대미지') && b.includes('▲')) {
                    effectType = 'parts_damage_up';
                    unit = 'percent';
                } else if (b.includes('코어 대미지') && b.includes('▲')) {
                    effectType = 'core_damage_up';
                    unit = 'percent';
                } else if (b.includes('일반 공격 대미지') && b.includes('▲')) {
                    effectType = 'normal_attack_multiplier_up';
                    unit = 'percent';
                } else if (b.includes('지속 대미지') && b.includes('▲')) {
                    effectType = 'dot_damage_up';
                    unit = 'percent';
                } else if (b.includes('방어력 무시 대미지') && b.includes('▲')) {
                    effectType = 'ignore_def_damage_up';
                    unit = 'percent';
                } else if (b.includes('탄환') && (b.includes('충전') || b.includes('회복')) || b.includes('장탄 수') && b.includes('회복')) {
                    effectType = 'ammo_charge';
                    unit = b.includes('%') ? 'percent' : 'count';
                } else if (b.includes('보호막 체력 회복') || b.includes('다음 보호막 체력')) {
                    effectType = b.includes('다음 보호막') ? 'next_shield_hp_up' : 'shield_hp_heal';
                    unit = 'percent';
                } else if (b.includes('지속 회복')) {
                    effectType = 'dot_heal';
                    unit = 'percent';
                    interval = 1;
                } else if (b.includes('회복') && (b.includes('체력') || b.includes('비례') || b.includes('대미지 비례'))) {
                    effectType = 'heal';
                    unit = 'percent';
                } else if (b.includes('보호막') || b.includes('공용 보호막')) {
                    effectType = 'shield';
                    unit = 'percent';
                    if (!basedOn) basedOn = 'caster_final_max_hp';
                } else if (b.includes('분배 대미지')) {
                    effectType = 'distribute_damage';
                    unit = 'percent';
                    if (!basedOn) basedOn = 'caster_final_atk';
                } else if (b.includes('지속 대미지')) {
                    effectType = 'dot_damage';
                    unit = 'percent';
                    interval = 1;
                    if (!basedOn) basedOn = 'caster_final_atk';
                } else if (b.includes('추가 대미지')) {
                    effectType = 'extra_damage';
                    unit = 'percent';
                    if (!basedOn) basedOn = 'caster_final_atk';
                } else if (b.includes('대미지') && (b.includes('최종 공격력') || b.includes('공격력') || b.includes('방어력 무시'))) {
                    effectType = 'damage';
                    unit = 'percent';
                    if (!basedOn) basedOn = 'caster_final_atk';
                } else if (b.includes('버스트 재진입')) {
                    effectType = 'burst_reenter';
                    unit = 'count';
                    const stM = b.match(/(\d+)\s*단계/);
                    if (stM) val = parseInt(stM[1], 10);
                } else if (b.includes('버스트 스킬') && (b.includes('재사용 시간') || b.includes('쿨타임')) && (b.includes('▼') || b.includes('감소'))) {
                    effectType = b.includes('%') ? 'burst_cooldown_reduction_pct' : 'burst_cooldown_reduction';
                    unit = b.includes('%') ? 'percent' : 'seconds';
                } else if (b.includes('스킬 2 재사용 시간')) {
                    effectType = 'skill_cooldown_reduction';
                    extraProps.target_skill = 'skill_2';
                    unit = b.includes('%') ? 'percent' : 'seconds';
                } else if (b.includes('스킬 1 재사용 시간')) {
                    effectType = 'skill_cooldown_reduction';
                    extraProps.target_skill = 'skill_1';
                    unit = b.includes('%') ? 'percent' : 'seconds';
                } else if (b.includes('버스트 게이지 충전 속도')) {
                    effectType = 'burst_gauge_charge_speed_up';
                    unit = 'percent';
                } else if (b.includes('버스트 게이지 충전')) {
                    effectType = 'burst_gauge_charge';
                    unit = 'percent';
                } else if (b.includes('풀 버스트 타임 지속 시간') && b.includes('▼')) {
                    effectType = 'full_burst_time_down';
                    unit = 'seconds';
                } else if (b.includes('풀 버스트 타임 지속 시간') && b.includes('▲')) {
                    effectType = 'full_burst_time_up';
                    unit = 'seconds';
                } else if (b.includes('도발') || b.includes('주목')) {
                    effectType = 'taunt';
                } else if (b.includes('해로운 효과') && (b.includes('해제') || b.includes('면역'))) {
                    effectType = b.includes('면역') ? 'debuff_immunity' : 'dispel';
                    unit = 'count';
                } else if (b.includes('이로운 효과 해제')) {
                    effectType = 'dispel_buff';
                    unit = 'count';
                } else if (b.includes('무적')) {
                    effectType = 'invincible';
                } else if (b.includes('기절')) {
                    effectType = 'stun';
                } else if (b.includes('불굴')) {
                    effectType = 'immortality';
                } else if (b.includes('이동 불가')) {
                    effectType = 'immobile';
                } else if (b.includes('부활')) {
                    effectType = 'revive';
                    unit = 'percent';
                } else if (b.includes('은신')) {
                    effectType = 'stealth';
                } else if (b.includes('관통 특화')) {
                    effectType = 'pierce';
                } else if (b.includes('관통 대미지') && b.includes('▲')) {
                    effectType = 'pierce_damage_up';
                    unit = 'percent';
                } else if (b.includes('관통 범위') && b.includes('확장')) {
                    effectType = 'pierce_range_up';
                    unit = 'percent';
                } else if (b.includes('보호막에 가하는 대미지')) {
                    effectType = 'shield_damage_up';
                    unit = 'percent';
                } else if (b.includes('폭발 범위') && b.includes('▲')) {
                    effectType = 'explosion_range_up';
                    unit = 'percent';
                } else if (b.includes('적정 최대 사거리')) {
                    effectType = 'max_range_up';
                    unit = 'percent';
                } else if (b.includes('펠릿 개수') && b.includes('▲')) {
                    effectType = 'pellet_count_up';
                    unit = 'count';
                } else if (b.includes('받는 대미지 차등 분배')) {
                    effectType = 'differential_damage_share';
                } else if (b.includes('받는 대미지') && b.includes('▼')) {
                    effectType = 'damage_taken_down';
                    unit = 'percent';
                } else if (b.includes('받는 대미지') && b.includes('▲')) {
                    effectType = 'damage_taken_up';
                    unit = 'percent';
                } else if (b.includes('받는 대미지 균등 분배') || b.includes('대미지 분배')) {
                    effectType = 'damage_share';
                } else if (b.includes('받는 체력 회복량') && b.includes('▲')) {
                    effectType = 'receive_heal_up';
                    unit = 'percent';
                } else if (b.includes('체력 회복 효과') && b.includes('▲')) {
                    effectType = 'heal_efficacy_up';
                    unit = 'percent';
                } else if (b.includes('엄폐물 방어력')) {
                    effectType = 'cover_defense_up';
                    unit = 'percent';
                } else if (b.includes('엄폐물 최대 체력')) {
                    effectType = 'cover_max_hp_up';
                    unit = 'percent';
                } else if (b.includes('엄폐물 체력') && b.includes('회복')) {
                    effectType = 'cover_hp_heal';
                    unit = 'percent';
                } else if (b.includes('파괴된 엄폐물 부활')) {
                    effectType = 'cover_revive';
                } else if (b.includes('장탄 수 무한')) {
                    effectType = 'infinite_ammo';
                } else if (b.includes('중첩 가능 이로운 효과 중첩량')) {
                    effectType = 'stack_boost';
                    unit = 'count';
                } else if (b.includes('누적 폭발 스킬')) {
                    effectType = 'accumulate_damage';
                    status = 'cummulative_explosion';
                } else if (b.includes('소환') || (b.includes('충전') && status)) {
                    effectType = 'charge_status';
                    unit = 'count';
                } else if (b.includes('해제') && status) {
                    effectType = 'remove_status';
                } else if (b.includes('차지 속도') && b.includes('변환')) {
                    effectType = 'convert_charge_speed_to_damage';
                    unit = 'percent';
                } else if (b.includes('버스트 스킬 대미지') && b.includes('▲')) {
                    effectType = 'single_target_burst_damage_up';
                    unit = 'percent';
                } else if (b.includes('스킬 2 명중 횟수 조건')) {
                    effectType = 'skill_trigger_count_reduction';
                    extraProps.target_skill = 'skill_2';
                    unit = 'count';
                } else if (b.includes('섬멸 모드')) {
                    effectType = 'extermination_mode';
                } else if (b === '타겟 섬멸') {
                    effectType = 'target_extermination';
                    status = 'target_extermination';
                }

                // Look ahead for modifiers in this line
                while (i < brackets.length) {
                    const nextB = brackets[i];
                    if (nextB.includes('초 유지')) {
                        const durValM = nextB.match(/\{description_value_(\d+)\}/);
                        if (durValM) {
                            duration = simplifyArrayIfUniform(matrix[parseInt(durValM[1], 10) - 1]);
                        } else {
                            const numM = nextB.match(/([\d.]+)\s*초/);
                            if (numM) duration = toFloat(numM[1]);
                        }
                        i++;
                    } else if (nextB === '지속') {
                        duration = 'permanent';
                        i++;
                    } else if (nextB.includes('발 유지')) {
                        const bM = nextB.match(/\{description_value_(\d+)\}/);
                        if (bM) {
                            bullet = simplifyArrayIfUniform(matrix[parseInt(bM[1], 10) - 1]);
                        } else {
                            const numM = nextB.match(/([\d.]+)\s*발/);
                            if (numM) bullet = toFloat(numM[1]);
                        }
                        i++;
                    } else if (nextB.includes('중첩') && !nextB.includes('해제')) {
                        const stM = nextB.match(/\{description_value_(\d+)\}/);
                        if (stM) {
                            const stArr = matrix[parseInt(stM[1], 10) - 1];
                            stack = stArr[0] || 1;
                        } else {
                            const numM = nextB.match(/([\d.]+)\s*중첩/);
                            if (numM) stack = parseInt(numM[1], 10);
                        }
                        i++;
                    } else if (nextB.includes('초 간격')) {
                        const intM = nextB.match(/([\d.]+)\s*초\s*간격/);
                        if (intM) interval = toFloat(intM[1]);
                        i++;
                    } else if (nextB.includes('전투 중 1회') || nextB.includes('전투 중')) {
                        extraProps.count_limit = 1;
                        i++;
                    } else {
                        break;
                    }
                }

                const effItem = {
                    trigger,
                    target: activeLineTarget || defaultTarget,
                    effect: effectType
                };

                let itemCond = condition;
                if (activeLineCount !== undefined) {
                    itemCond = Object.assign(itemCond ? { ...itemCond } : {}, { count: activeLineCount });
                }

                if (itemCond) effItem.condition = itemCond;
                if (status) effItem.status = status;
                if (val !== undefined) effItem.value = val;
                if (unit) effItem.unit = unit;
                if (basedOn) effItem.based_on = basedOn;
                if (duration !== undefined) effItem.duration = duration;
                if (bullet !== undefined) effItem.bullet = bullet;
                if (stack !== undefined) effItem.stack = stack;
                if (stackLevel !== undefined) effItem.stack_level = stackLevel;
                if (interval !== undefined) effItem.interval = interval;

                Object.assign(effItem, extraProps);

                effects.push(effItem);
                usedVars.effects.add(effectType);
                if (basedOn) usedVars.based_on.add(basedOn);
            }
        }
    }

    if (effects.length === 0) {
        effects.push({
            trigger: isBurst ? 'burst_cast' : 'passive',
            target: 'self',
            effect: 'stat_buff',
            value: matrix[0] || new Array(10).fill(0)
        });
        usedVars.effects.add('stat_buff');
    }

    return effects;
}

// Convert character skills
export function convertCharacterSkills(charJson, scrapedEntry) {
    const raw = scrapedEntry.raw || scrapedEntry;
    const skills = [];

    // Skill 1
    const s1 = raw.skill1_detail || scrapedEntry.스킬?.skill1_detail;
    if (s1) {
        skills.push({
            id: 'skill_1',
            name: s1.name_localkey || '스킬 1',
            type: 'passive',
            effects: parseSkillClauses(s1, false, charJson.characterName)
        });
    }

    // Skill 2
    const s2 = raw.skill2_detail || scrapedEntry.스킬?.skill2_detail;
    if (s2) {
        skills.push({
            id: 'skill_2',
            name: s2.name_localkey || '스킬 2',
            type: 'passive',
            effects: parseSkillClauses(s2, false, charJson.characterName)
        });
    }

    // Ulti
    const ulti = raw.ulti_skill_detail || scrapedEntry.스킬?.ulti_skill_detail;
    if (ulti) {
        const coolSec = ulti.skill_cooltime ? ulti.skill_cooltime / 100 : 40;
        skills.push({
            id: 'burst',
            name: ulti.name_localkey || '버스트 스킬',
            type: 'burst',
            cooldown: coolSec,
            effects: parseSkillClauses(ulti, true, charJson.characterName)
        });
    }

    return { skills, usedVars };
}
