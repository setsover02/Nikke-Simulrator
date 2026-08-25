import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AVATAR_DIR = path.join(ROOT, 'src', 'assets', 'avatar');
const CHAR_DIR = path.join(ROOT, 'src', 'character');
const SCRAPED_PATH = path.join(ROOT, 'scraper', 'nikke_scraped.json');

// 스크랩 데이터 원문 기반 (한글 이름 <-> resource_id <-> safe_filename / image filename)
const scrapedData = JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf-8'));

function safeFilename(name) {
    let s = name;
    for (const ch of ['\\', '/', ':', '*', '?', '"', '<', '>', '|']) {
        s = s.replace(new RegExp('\\' + ch, 'g'), '_');
    }
    return s;
}

function getAvatarFiles() {
    const files = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.webp'));
    const avatarMap = new Map(); // stem -> full filename (e.g. "t_ssr_moran" -> "t_ssr_moran.webp")

    for (const f of files) {
        const stem = path.basename(f, '.webp');
        avatarMap.set(stem, f);
    }
    return avatarMap;
}

function getAllJsonFiles() {
    const jsonFiles = [];
    function scan(dir) {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                    jsonFiles.push({
                        filePath: fullPath,
                        relPath: path.relative(CHAR_DIR, fullPath),
                        filename: item,
                        stem: path.basename(item, '.json'),
                        dir: path.dirname(fullPath),
                        data
                    });
                } catch (e) {}
            }
        }
    }
    scan(CHAR_DIR);
    return jsonFiles;
}

async function main() {
    console.log('[AvatarMatch] 아바타 파일명 기반 캐릭터 JSON 매칭 진단...');

    const avatarMap = getAvatarFiles(); // stem -> webp file
    const jsonFiles = getAllJsonFiles();

    console.log(`아바타 파일: 총 ${avatarMap.size}개`);
    console.log(`JSON 파일: 총 ${jsonFiles.length}개`);

    // 매칭 준비
    const renames = [];
    const missingAvatars = [];
    const matchedAvatars = new Set();

    // 한글 캐릭터명 -> avatar stem 추론 규칙
    // nikke_scraped.json에 안전 파일명이 있으면 활용
    const nameToAvatarStemMap = new Map();

    // 1단계: 이미 json stem과 avatar stem이 일치하는 경우
    for (const jsonFile of jsonFiles) {
        const stem = jsonFile.stem;
        if (avatarMap.has(stem)) {
            renames.push({
                jsonFile,
                newFilename: `${stem}.json`,
                matchedAvatar: avatarMap.get(stem),
                method: 'exact_stem'
            });
            matchedAvatars.add(stem);
            continue;
        }

        // 2단계: characterName 한글 기반 매칭 탐색
        const charName = jsonFile.data.characterName;
        let matchedStem = null;

        // avatarMap의 stem 목록 중 캐릭터 이름이나 슬러그와 매칭되는 것 탐색
        for (const avatarStem of avatarMap.keys()) {
            // 예: t_ssr_목단 -> t_ssr_moran (목단 = moran)
            // 예: t_ssr_크라운 -> p_ssr_crown
            if (matchedAvatars.has(avatarStem)) continue;

            const companyPrefix = jsonFile.stem.split('_')[0]; // p, e, m, t, a
            const rarity = jsonFile.stem.split('_')[1]; // ssr, sr, r

            if (avatarStem.startsWith(`${companyPrefix}_${rarity}_`)) {
                // 이 수식어가 맞는지 체크
                // 한글 이름 특수 변환 테이블
            }
        }
    }

    console.log(`\n1차 직결 매칭 수: ${renames.length}개`);
}

main();
