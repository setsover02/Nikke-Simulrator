/**
 * CDN에서 애장품(Favorite Item) 수집 -> src/character/ 내 대상 캐릭터 JSON에 favoriteItem 필드 추가 스크립트
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHAR_DIR = path.join(ROOT, 'src', 'character');
const CDN_BASE = 'https://sg-tools-cdn.blablalink.com';
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291];

const TARGET_CHAR_NAMES = new Set([
    '디젤', '엑시아', '프림', '라플라스', '바이퍼', '미란다', '헬름',
    '드레이크', '폴리', '토브', '율리아', '베이', '프리바티', '츠바이',
    '센티', '목단', '팬텀', '플로라', '로산나', '슈가'
]);

function djb2(text, seed) {
    let value = seed | 0;
    for (let i = 0; i < text.length; i++) {
        value = (Math.imul(value, 33) + text.charCodeAt(i)) | 0;
    }
    return value;
}

function dirToken(pathStr, prime) {
    const rawR = djb2(pathStr, prime) % prime;
    const r = ((rawR % prime) + prime) % prime;
    const letters = String.fromCharCode(97 + Math.floor(r / 26) % 26) + String.fromCharCode(97 + (r % 26));
    const numStr = String(r % 99).padStart(2, '0');
    return `${letters}-${numStr}`;
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function obfuscatePath(pathStr) {
    const plain = pathStr.replace(/^\/+/, '');
    const segments = plain.split('/').filter(Boolean);
    const out = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (i === segments.length - 1) {
            const extParts = seg.split('.');
            const ext = extParts.slice(1).join('.');
            out.push(`${md5(plain)}.${ext}`);
        } else {
            out.push(dirToken(plain, LARGE_PRIMES[i]));
        }
    }
    return out.join('/');
}

async function fetchJson(relPath) {
    const url = `${CDN_BASE}/${obfuscatePath(relPath)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${relPath}`);
    return res.json();
}

function stripTags(text) {
    if (!text) return '';
    return text.replace(/<\/?[^>]+(>|$)/g, '').replace(/\xa0/g, ' ').trim();
}

function toFloat(val, defaultVal = 0) {
    if (val === null || val === undefined) return defaultVal;
    const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? defaultVal : num;
}

function parseValueList(valList) {
    if (!valList || !Array.isArray(valList) || valList.length === 0) return [];
    const matrix = [];
    for (const item of valList) {
        if (!item) continue;
        const vals = item.description_value || [];
        if (Array.isArray(vals) && vals.length > 0) {
            matrix.push(vals.map(v => toFloat(v)));
        }
    }
    return matrix;
}

function parseSkillEffects(descKey, valList) {
    const text = stripTags(descKey);
    const matrix = parseValueList(valList);
    const effects = [];

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let currentTrigger = 'passive';

    for (const line of lines) {
        if (line.startsWith('■')) {
            const condText = line.replace('■', '').trim();
            if (condText.includes('풀 버스트 타임 시작 시')) currentTrigger = 'full_burst_start';
            else if (condText.includes('전투 시작 시')) currentTrigger = 'battle_start';
            else if (condText.includes('일반 공격')) currentTrigger = 'normal_attack';
            else if (condText.includes('마지막 탄환')) currentTrigger = 'last_bullet_attack';
            else if (condText.includes('버스트 스킬')) currentTrigger = 'burst_cast';
            continue;
        }

        const matches = [...line.matchAll(/\{description_value_(\d+)\}/g)];
        if (matches.length > 0) {
            const valIdx = parseInt(matches[0][1], 10) - 1;
            const values = matrix[valIdx] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            let effectType = 'buff';
            let target = 'self';

            if (line.includes('공격력')) effectType = 'atk_up';
            else if (line.includes('대미지')) effectType = 'atk_damage_up';
            else if (line.includes('방어력')) effectType = 'def_up';
            else if (line.includes('체력')) effectType = 'heal';
            else if (line.includes('장탄')) effectType = 'max_ammo_up';
            else if (line.includes('재장전')) effectType = 'reload_speed_up';
            else if (line.includes('보호막')) effectType = 'shield';

            if (line.includes('아군 전체')) target = 'all_allies';
            else if (line.includes('적 전체')) target = 'all_enemies';
            else if (line.includes('자신에게') || line.includes('자신')) target = 'self';

            effects.push({
                trigger: currentTrigger,
                target,
                effect: effectType,
                value: values.length === 10 ? values : values[0] || 0,
                unit: line.includes('%') ? 'percent' : 'seconds'
            });
        }
    }

    if (effects.length === 0) {
        effects.push({
            trigger: 'passive',
            target: 'self',
            effect: 'stat_buff',
            value: matrix[0] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        });
    }

    return effects;
}

// src/character/ 내 전체 JSON 파일 매핑 (캐릭터명 -> 파일경로)
function getCharacterFileMap() {
    const map = new Map();
    function scan(dir) {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                try {
                    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                    if (content.characterName) {
                        map.set(content.characterName, { filePath: fullPath, data: content });
                    }
                    if (content.characterID) {
                        map.set(content.characterID, { filePath: fullPath, data: content });
                    }
                } catch (e) {}
            }
        }
    }
    scan(CHAR_DIR);
    return map;
}

async function main() {
    console.log('[Favorite] 애장품 수집 및 favoriteItem 필드 추가 시작...');

    const charMap = getCharacterFileMap();
    const scrapedData = JSON.parse(fs.readFileSync(path.join(ROOT, 'scraper', 'nikke_scraped.json'), 'utf-8'));

    // resource_id -> 캐릭터명 맵 생성
    const ridToNameMap = new Map();
    for (const [name, entry] of Object.entries(scrapedData)) {
        if (entry.id) {
            ridToNameMap.set(entry.id, name);
        }
        if (entry.raw && entry.raw.resource_id) {
            ridToNameMap.set(entry.raw.resource_id, name);
        }
    }

    const rareMap = await fetchJson('/equip/favorite_rare_map.json');
    const ssrFids = rareMap.SSR || [];
    console.log(`[Favorite] CDN SSR 애장품 총 ${ssrFids.length}개 발견`);

    let updatedCount = 0;

    for (const fid of ssrFids) {
        try {
            const fav = await fetchJson(`/equip/ko/favorite_${fid}.json`);
            const match = (fav.icon_resource_id || '').match(/c(\d+)_/);
            if (!match) continue;

            const rid = parseInt(match[1], 10);
            const charName = ridToNameMap.get(rid);

            if (!charName) {
                console.log(`[WARN] Resource ID ${rid} 에 해당하는 캐릭터명을 찾을 수 없습니다 (FID ${fid})`);
                continue;
            }

            // 요청된 20명 대상 또는 대상 목록 체크
            const isTarget = TARGET_CHAR_NAMES.has(charName) || Array.from(TARGET_CHAR_NAMES).some(tn => charName.includes(tn));
            if (!isTarget) {
                console.log(`[Skip] ${charName} (요청된 대상 목록 외)`);
            }

            const charObj = charMap.get(charName);
            if (!charObj) {
                console.log(`[WARN] ${charName} 의 JSON 파일이 src/character/ 에 존재하지 않습니다.`);
                continue;
            }

            const stagesData = (fav.favoriteitem_skill_group_data || []).map((stage, idx) => {
                const info = stage.info || stage;
                const slotNum = stage.skill_change_slot || (idx + 1);
                return {
                    stage: idx + 1,
                    replaceSlot: slotNum,
                    skill: {
                        name: info.name_localkey || `애장품 스킬 ${idx + 1}`,
                        effects: parseSkillEffects(info.description_localkey, info.description_value_list)
                    }
                };
            });

            const favoriteItemObj = {
                itemName: fav.name_localkey || '애장품',
                stages: stagesData
            };

            charObj.data.favoriteItem = favoriteItemObj;
            fs.writeFileSync(charObj.filePath, JSON.stringify(charObj.data, null, 4), 'utf-8');
            console.log(`[Success] ✅ ${charName} (${path.basename(charObj.filePath)}) -> favoriteItem 추가 완료 (${stagesData.length}단계)`);
            updatedCount++;

        } catch (err) {
            console.error(`[Error] FID ${fid} 수집 중 오류:`, err.message);
        }
    }

    console.log(`\n[Favorite] 전체 작업 완료! 총 ${updatedCount}개 캐릭터에 favoriteItem 추가 완료.`);
}

main();
