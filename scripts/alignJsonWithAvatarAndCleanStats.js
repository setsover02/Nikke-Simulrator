/**
 * 1. src/character/ 내 모든 JSON 파일의 stats 객체에서 atk, defense, hp 키 삭제
 * 2. src/assets/avatar/ 의 .webp 아바타 파일명과 100% 일치하도록 JSON 파일명 및 폴더 위치 정렬
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHAR_DIR = path.join(ROOT, 'src', 'character');
const AVATAR_DIR = path.join(ROOT, 'src', 'assets', 'avatar');

const PREFIX_TO_DIR = {
    'p': 'pilgrim',
    'e': 'elysion',
    'm': 'missilis',
    't': 'tetra',
    'a': 'abnormal'
};

// 매칭 보조 맵 (JSON stem -> 정확한 Avatar stem)
const ALIGNMENT_MAP = {
    'e_r_솔져_e_g': 'e_r_솔져_eg',
    'e_r_솔져_o_w': 'e_r_솔져_ow',
    'a_sr_아이기스': 'e_ssr_아이기스',
    'e_ssr_아르카나': 'e_ssr_아르카나_포츈_메이트',
    'e_ssr_아비스타': 't_ssr_아비스타',
    'e_ssr_레이블': 't_ssr_레이블',
    'm_ssr_네온_비전_아이': 'e_ssr_네온_비전_아이',
    'm_ssr_모리': 't_ssr_모리',
    'm_ssr_백학': 't_ssr_백학',
    'm_ssr_일레그_붐_앤_쇼크': 'm_ssr_일레그_붐앤쇼크',
    'p_ssr_스노우_화이트_헤비암즈': 'p_ssr_스노우_화이트_헤비_암즈s',
    't_ssr_라이': 'a_ssr_라이',
    't_ssr_아크레인저_블랙': 'm_ssr_아크레인저_블랙'
};

function getAvatarStems() {
    const files = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.webp'));
    const set = new Set();
    for (const f of files) {
        set.add(path.basename(f, '.webp'));
    }
    return set;
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

function main() {
    console.log('[Align & Clean] atk, defense, hp 삭제 및 아바타 파일명 매칭 정렬 시작...');

    const avatarStems = getAvatarStems();
    const jsonFiles = scanJsonFiles();

    let statsCleanedCount = 0;
    let jsonRenamedCount = 0;

    for (const item of jsonFiles) {
        let modifiedData = false;

        // 1. stats 객체에서 atk, defense, hp 삭제
        if (item.data && item.data.stats) {
            const s = item.data.stats;
            if ('atk' in s) { delete s.atk; modifiedData = true; }
            if ('defense' in s) { delete s.defense; modifiedData = true; }
            if ('hp' in s) { delete s.hp; modifiedData = true; }
        }

        if (modifiedData) {
            statsCleanedCount++;
        }

        // 2. 아바타 파일명과 100% 일치하도록 JSON stem 및 폴더 위치 정렬
        let targetStem = item.stem;
        if (ALIGNMENT_MAP[item.stem]) {
            targetStem = ALIGNMENT_MAP[item.stem];
        }

        // 만약 avatarStems에 targetStem이 존재한다면 정렬
        if (avatarStems.has(targetStem)) {
            const prefix = targetStem.split('_')[0];
            const targetCompanyDir = PREFIX_TO_DIR[prefix] || 'pilgrim';
            const targetDirPath = path.join(CHAR_DIR, targetCompanyDir);
            const targetFilePath = path.join(targetDirPath, `${targetStem}.json`);

            fs.mkdirSync(targetDirPath, { recursive: true });

            if (item.filePath !== targetFilePath) {
                // 이전 파일 삭제 후 새 위치에 기록
                if (fs.existsSync(item.filePath)) {
                    fs.unlinkSync(item.filePath);
                }
                fs.writeFileSync(targetFilePath, JSON.stringify(item.data, null, 4), 'utf-8');
                console.log(`[JSON 매칭 정렬] ${item.filename} ➔ ${path.relative(CHAR_DIR, targetFilePath)}`);
                jsonRenamedCount++;
            } else if (modifiedData) {
                fs.writeFileSync(item.filePath, JSON.stringify(item.data, null, 4), 'utf-8');
            }
        } else if (modifiedData) {
            fs.writeFileSync(item.filePath, JSON.stringify(item.data, null, 4), 'utf-8');
        }
    }

    console.log(`\n==================================================`);
    console.log(`[Stats 삭제 완료] atk, defense, hp 삭제된 캐릭터: ${statsCleanedCount}개`);
    console.log(`[파일명 정렬 완료] 아바타 파일명에 맞춰 정렬된 캐릭터: ${jsonRenamedCount}개`);
    console.log(`==================================================\n`);
}

main();
