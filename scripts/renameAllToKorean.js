/**
 * 1. src/character/ 내 모든 캐릭터 JSON 파일명을 한글 스펙 파일명({prefix}_{rarity}_{한글이름}.json)으로 변경
 * 2. src/assets/avatar/ 내 모든 아바타 이미지(.webp) 파일명도 동일한 한글 스펙 파일명({prefix}_{rarity}_{한글이름}.webp)으로 변경
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHAR_DIR = path.join(ROOT, 'src', 'character');
const AVATAR_DIR = path.join(ROOT, 'src', 'assets', 'avatar');
const SCRAPED_PATH = path.join(ROOT, 'scraper', 'nikke_scraped.json');

const COMPANY_PREFIX_MAP = {
    'Pilgrim': 'p', 'pilgrim': 'p',
    'Elysion': 'e', 'elysion': 'e',
    'Missilis': 'm', 'missilis': 'm',
    'Tetra': 't', 'tetra': 't',
    'Abnormal': 'a', 'abnormal': 'a'
};

// 한글 캐릭터 명칭 -> 표준 파일명 슬러그 생성
function formatKoreanSlug(name) {
    if (!name) return '';
    return name
        .trim()
        .toLowerCase()
        .replace(/\s*:\s*/g, '_')
        .replace(/\s*\(\s*/g, '_')
        .replace(/\s*\)\s*/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_가-힣]/g, '');
}

function scanJsonFiles() {
    const list = [];
    function scan(dir) {
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                    list.push({
                        filePath: fullPath,
                        dir: path.dirname(fullPath),
                        filename: item,
                        stem: path.basename(item, '.json'),
                        data
                    });
                } catch (e) {}
            }
        }
    }
    scan(CHAR_DIR);
    return list;
}

function getAvatarFiles() {
    const files = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.webp'));
    const map = new Map(); // stem -> full filename
    for (const f of files) {
        map.set(path.basename(f, '.webp'), f);
    }
    return map;
}

async function main() {
    console.log('[KoreanRename] 전체 캐릭터 JSON 및 아바타 파일 한글명으로 변경 시작...');

    const jsonFiles = scanJsonFiles();
    const avatarMap = getAvatarFiles();

    console.log(`[KoreanRename] 대상 JSON 파일 ${jsonFiles.length}개, 아바타 파일 ${avatarMap.size}개`);

    let jsonRenamed = 0;
    let avatarRenamed = 0;
    const missingAvatars = [];

    // 1. JSON 파일 한글명으로 변경 & 한글 파일명 키 생성
    const jsonMapByKoreanStem = new Map(); // targetKoreanStem -> jsonFile object

    for (const item of jsonFiles) {
        const data = item.data;
        const charName = data.characterName;
        const company = data.stats?.company || 'Pilgrim';
        const rarity = (data.stats?.rarity || 'SSR').toLowerCase();
        const prefix = COMPANY_PREFIX_MAP[company] || 'p';

        const kSlug = formatKoreanSlug(charName);
        const targetKoreanStem = `${prefix}_${rarity}_${kSlug}`;
        const targetJsonFilename = `${targetKoreanStem}.json`;
        const newJsonPath = path.join(item.dir, targetJsonFilename);

        if (item.filePath !== newJsonPath) {
            fs.renameSync(item.filePath, newJsonPath);
            console.log(`[JSON 변경] ${item.filename} ➔ ${targetJsonFilename} (${charName})`);
            jsonRenamed++;
            item.filePath = newJsonPath;
            item.filename = targetJsonFilename;
            item.stem = targetKoreanStem;
        }

        jsonMapByKoreanStem.set(targetKoreanStem, item);

        // 2. 해당 캐릭터와 연관된 아바타 파일 탐색 및 한글 파일명으로 변경
        // 2-1. 이전 영문 stem 또는 기존 stem으로 아바타 파일 찾기
        const oldStem = item.stem;
        let matchedAvatarStem = null;

        if (avatarMap.has(targetKoreanStem)) {
            matchedAvatarStem = targetKoreanStem;
        } else {
            // 아바타 영문 stem 목록에서 해당 캐릭터와 일치하는 아바타 탐색
            for (const [aStem, aFilename] of avatarMap.entries()) {
                // 이미 한글로 바뀐 것이거나 영문 매칭 시도
                if (aStem === targetKoreanStem) {
                    matchedAvatarStem = aStem;
                    break;
                }
                // 접두사(e_ssr_)와 캐릭터 영문/ID 연관성 비교
                const parts = aStem.split('_');
                const aPrefix = parts[0];
                const aRarity = parts[1];
                if (aPrefix === prefix && aRarity === rarity) {
                    // ID나 캐릭터명 영문 포함 여부
                    const cid = (data.characterID || '').toLowerCase();
                    const aSlug = parts.slice(2).join('_');
                    if (cid && (aSlug.includes(cid) || cid.includes(aSlug))) {
                        matchedAvatarStem = aStem;
                        break;
                    }
                }
            }
        }

        if (matchedAvatarStem && avatarMap.has(matchedAvatarStem)) {
            const oldAvatarFilename = avatarMap.get(matchedAvatarStem);
            const oldAvatarPath = path.join(AVATAR_DIR, oldAvatarFilename);
            const targetAvatarFilename = `${targetKoreanStem}.webp`;
            const newAvatarPath = path.join(AVATAR_DIR, targetAvatarFilename);

            if (oldAvatarPath !== newAvatarPath && fs.existsSync(oldAvatarPath)) {
                fs.renameSync(oldAvatarPath, newAvatarPath);
                console.log(`[아바타 변경] ${oldAvatarFilename} ➔ ${targetAvatarFilename} (${charName})`);
                avatarRenamed++;
                avatarMap.delete(matchedAvatarStem);
                avatarMap.set(targetKoreanStem, targetAvatarFilename);
            }
        } else {
            missingAvatars.push({
                name: charName,
                id: data.characterID,
                expectedAvatar: `${targetKoreanStem}.webp`,
                company,
                rarity: data.stats?.rarity
            });
        }
    }

    console.log(`\n==================================================`);
    console.log(`[작업 완료] JSON 파일 한글 변경: ${jsonRenamed}개`);
    console.log(`[작업 완료] 아바타 파일 한글 변경: ${avatarRenamed}개`);
    console.log(`[아바타 미존재] 매칭 아바타가 없는 캐릭터: ${missingAvatars.length}개`);
    console.log(`==================================================\n`);

    if (missingAvatars.length > 0) {
        console.log(`--- ⚠️ 아바타 이미지가 존재하지 않는 캐릭터 목록 (${missingAvatars.length}명) ---`);
        missingAvatars.forEach((m, idx) => {
            console.log(`${idx + 1}. [${m.company}/${m.rarity}] ${m.name} (예상 파일명: ${m.expectedAvatar})`);
        });
    }
}

main();
