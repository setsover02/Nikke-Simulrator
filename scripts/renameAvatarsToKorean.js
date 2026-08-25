/**
 * src/assets/avatar/ 폴더의 영문/구형 아바타 파일(.webp)을 src/character/ 의 한글 JSON 파일명과 100% 동일하게 변경하는 스크립트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHAR_DIR = path.join(ROOT, 'src', 'character');
const AVATAR_DIR = path.join(ROOT, 'src', 'assets', 'avatar');

// 영문 slug -> 한글 이름 매핑 보조 테이블
const SLUG_TO_NAME = {
    'scarlet_black_shadow': '홍련_흑영',
    'little_mermaid': '어린_인어',
    'crown': '크라운',
    'dorothy': '도로시',
    'dorothy_serendipity': '도로시_세렌디피티',
    'modernia': '모더니아',
    'red_hood': '레드_후드',
    'rapunzel': '라푼젤',
    'snow_white': '스노우_화이트',
    'snow_white_innocent_days': '스노우_화이트_이노센트_데이즈',
    'scarlet': '홍련',
    'isabel': '이사벨',
    'haran': '하란',
    'chime': '차임',
    'nayuta': '나유타',
    'liberalio': '리베라리오',
    'crust': '크러스트',
    'anis': '아니스',
    'anis_sparkling_summer': '아니스_스파클링_서머',
    'neve': '네브',
    'aria': '아리아',
    'rogue': '로그',
    'volume': '볼륨',
    'diesel': '디젤',
    'exia': '엑시아',
    'frima': '프림',
    'laplace': '라플라스',
    'laplace_ultimate_hero': '라플라스_얼티밋_히어로',
    'viper': '바이퍼',
    'miranda': '미란다',
    'helm': '헬름',
    'helm_aquamarine': '헬름_아쿠아마린',
    'drake': '드레이크',
    'poli': '폴리',
    'tove': '토브',
    'julia': '율리아',
    'bay': '베이',
    'privaty': '프리바티',
    'privaty_unkind_maid': '프리바티_언카인드_메이드',
    'zwei': '츠바이',
    'centi': '센티',
    'moran': '목단',
    'phantom': '팬텀',
    'flora': '플로라',
    'rosanna': '로산나',
    'sugar': '슈가',
    'milk': '밀크',
    'noah': '노아',
    'guilty': '길티',
    'quency': '퀀시',
    'rupee': '루피',
    'rupee_winter_shopper': '루피_윈터_쇼퍼',
    'novel': '노벨',
    'soda': '소다',
    'ade': '아데',
    'cocoa': '코코아',
    'biscuit': '비스킷',
    'nero': '네로',
    'leona': '레오나',
    'clay': '클레이',
    'ludmilla': '루드밀라',
    'ludmilla_winter_owner': '루드밀라_윈터_오너',
    'sakura': '사쿠라',
    'sakura_bloom_in_summer': '사쿠라_블룸_인_서머',
    'blanc': '블랑',
    'noir': '누아르',
    'jackal': '자칼',
    'alice': '앨리스',
    'alice_wonderland_bunny': '앨리스_원더랜드_버니',
    'maiden': '메이든',
    'maiden_ice_rose': '메이든_아이스_로즈',
    'guillotine': '길로틴',
    'guillotine_winter_slayer': '길로틴_윈터_슬레이어',
    'soline': '솔린',
    'brid': '브리드',
    'emma': '엠마',
    'eunhwa': '은화',
    'signal': '시그널',
    'maxwell': '맥스웰',
    'yuni': '유니',
    'liter': '리타',
    'epinel': '에피넬',
    'folkwang': '폴크방',
    'belorta': '벨로타',
    'mika': '미카',
    'mika_snow_buddy': '미카_스노우_버디',
    'delta': '델타',
    'anchor': '앵커',
    'neon': '네온',
    'neon_blue_ocean': '네온_블루_오션',
    'rapi': '라피',
    'rapi_red_hood': '라피_레드_후드',
    'ether': '에테르',
    'mihara': '미하라',
    'arcana': '아르카나',
    'marciana': '마르차나',
    'sora': '소라',
    'vesti': '베스티',
    'crow': '크로우',
    'product_08': '프로덕트_08',
    'product_12': '프로덕트_12',
    'product_23': '프로덕트_23',
    'soldier_eg': '솔져_eg',
    'soldier_fa': '솔져_fa',
    'soldier_ow': '솔져_ow',
    'idoll_flower': '아이돌_플라워',
    'idoll_ocean': '아이돌_오션',
    'idoll_sun': '아이돌_썬',
    '2b': '2b',
    'a2': 'a2',
    'mari': '마리',
    'rei': '레이',
    'asuka': '아스카',
    'asuka_wille': '아스카_wille',
    'ram': '람',
    'rem': '렘',
    'emilia': '에밀리아',
    'makima': '마키마',
    'power': '파워',
    'himeno': '히메노',
    'pascal': '파스칼',
    'misato': '미사토',
    'eve': '이브',
    'raven': '레이븐',
    'ada': '에이다',
    'claire': '클레어',
    'jill': '질',
    'kurumi': '쿠루미',
    'chisato': '치사토',
    'queen_makoto': '퀸_마코토',
    'd': 'd',
    'd_killer_wife': 'd_킬러_와이프',
    'k': 'k',
    'eh': 'eh',
    'kiri': '키리',
    'rumani': '루마니',
    'mast': '마스트',
    'mast_romantic_maid': '마스트_로망틱_메이드',
    'trina': '트리나',
    'naga': '나가',
    'tia': '티아',
    'trony': '트로니',
    'ein': '아인'
};

function getJsonFileStems() {
    const map = new Map(); // stem -> full JSON path
    function scan(dir) {
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                const stem = path.basename(item, '.json');
                map.set(stem, fullPath);
            }
        }
    }
    scan(CHAR_DIR);
    return map;
}

function main() {
    console.log('[AvatarRename] 아바타 이미지를 한글 캐릭터 파일명으로 변경 시작...');

    const jsonStems = getJsonFileStems();
    const avatarFiles = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.webp'));

    let renamed = 0;
    let unchanged = 0;
    const missingInJson = [];

    for (const webpFile of avatarFiles) {
        const oldStem = path.basename(webpFile, '.webp');
        const oldPath = path.join(AVATAR_DIR, webpFile);

        // 1. 이미 JSON stem과 100% 동일한 한글 파일명인 경우
        if (jsonStems.has(oldStem)) {
            unchanged++;
            continue;
        }

        // 2. 접두사 (p_ssr_, e_ssr_ 등) 분리 및 영문 slug -> 한글 slug 변환
        const parts = oldStem.split('_');
        const prefix = parts[0];
        const rarity = parts[1];
        const enSlug = parts.slice(2).join('_');

        const kSlug = SLUG_TO_NAME[enSlug];
        let targetStem = null;

        if (kSlug) {
            const expectedStem = `${prefix}_${rarity}_${kSlug}`;
            if (jsonStems.has(expectedStem)) {
                targetStem = expectedStem;
            } else {
                // 한글 stem 목록 중 kSlug로 끝나는 것 검색
                for (const jsonStem of jsonStems.keys()) {
                    if (jsonStem.endsWith(`_${kSlug}`)) {
                        targetStem = jsonStem;
                        break;
                    }
                }
            }
        }

        if (!targetStem) {
            // 직결 탐색: jsonStems 중 enSlug가 포함되거나 영문 매칭되는 것
            for (const jsonStem of jsonStems.keys()) {
                if (jsonStem.startsWith(`${prefix}_${rarity}_`)) {
                    // check if match
                }
            }
        }

        if (targetStem) {
            const newWebpFilename = `${targetStem}.webp`;
            const newPath = path.join(AVATAR_DIR, newWebpFilename);
            if (oldPath !== newPath) {
                fs.renameSync(oldPath, newPath);
                console.log(`[아바타 변경] ${webpFile} ➔ ${newWebpFilename}`);
                renamed++;
            } else {
                unchanged++;
            }
        } else {
            missingInJson.push(webpFile);
        }
    }

    console.log(`\n==================================================`);
    console.log(`[아바타 변경 완료] 변경됨: ${renamed}개 / 기존 유지: ${unchanged}개`);
    console.log(`[JSON 미존재 아바타]: ${missingInJson.length}개`);
    console.log(`==================================================\n`);

    if (missingInJson.length > 0) {
        console.log(`--- JSON 파일이 없어 매칭되지 않은 아바타 목록 (${missingInJson.length}개) ---`);
        missingInJson.forEach((f, idx) => console.log(`${idx + 1}. ${f}`));
    }
}

main();
