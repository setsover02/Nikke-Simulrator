/**
 * src/character/ 폴더의 JSON 파일명을 src/assets/avatar/ 폴더의 아바타 .webp 파일명을 기준으로 매칭하여 변경하는 스크립트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AVATAR_DIR = path.join(ROOT, 'src', 'assets', 'avatar');
const CHAR_DIR = path.join(ROOT, 'src', 'character');

// 한국어 캐릭터 명칭 -> 아바타 영문 슬러그 매핑 테이블
const NAME_TO_SLUG_MAP = {
    '홍련 : 흑영': 'scarlet_black_shadow',
    '어린 인어': 'little_mermaid',
    '크라운': 'crown',
    '도로시': 'dorothy',
    '도로시 : 세렌디피티': 'dorothy_serendipity',
    '모더니아': 'modernia',
    '레드 후드': 'red_hood',
    '라푼젤': 'rapunzel',
    '라푼젤 : 순결한 열정': 'rapunzel_pure_grace',
    '스노우 화이트': 'snow_white',
    '스노우 화이트 : 이노센트 데이즈': 'snow_white_innocent_days',
    '홍련': 'scarlet',
    '이사벨': 'isabel',
    '하란': 'haran',
    '신': 'sin',
    '차임': 'chime',
    '나유타': 'nayuta',
    '리베라리오': 'liberalio',
    '크러스트': 'crust',
    '인디빌리아': 'indivilia',
    '아니스': 'anis',
    '아니스 : 스파클링 써머': 'anis_sparkling_summer',
    '네브': 'neve',
    '아리아': 'aria',
    '로그': 'rogue',
    '볼륨': 'volume',
    '디젤': 'diesel',
    '디젤 : 윈터 스위츠': 'diesel_winter_sweets',
    '엑시아': 'exia',
    '프림': 'frima',
    '라플라스': 'laplace',
    '라플라스 : 얼티밋 히어로': 'laplace_ultimate_hero',
    '바이퍼': 'viper',
    '미란다': 'miranda',
    '헬름': 'helm',
    '헬름 : 아쿠아마린': 'helm_aquamarine',
    '드레이크': 'drake',
    '폴리': 'poli',
    '토브': 'tove',
    '율리아': 'julia',
    '베이': 'bay',
    '프리바티': 'privaty',
    '프리바티 : 언카인드 메이드': 'privaty_unkind_maid',
    '츠바이': 'zwei',
    '센티': 'centi',
    '목단': 'moran',
    '팬텀': 'phantom',
    '플로라': 'flora',
    '로산나': 'rosanna',
    '로산나 : 칠릭 써머': 'rosanna_chic_ocean',
    '슈가': 'sugar',
    '밀크': 'milk',
    '밀크 : 블루밍 버니': 'milk_blooming_bunny',
    '노아': 'noah',
    '길티': 'guilty',
    '퀀시': 'quency',
    '퀀시 : 이스케이프 퀸': 'quency_escape_queen',
    '루피': 'rupee',
    '루피 : 윈터 쇼퍼': 'rupee_winter_shopper',
    '노벨': 'novel',
    '야나': 'yana',
    '소다': 'soda',
    '소다 : 트윙클링 버니': 'soda_twinkling_bunny',
    '아데': 'ade',
    '아데 : 에이전트 버니': 'ade_agent_bunny',
    '코코아': 'cocoa',
    '비스킷': 'biscuit',
    '네로': 'nero',
    '레오나': 'leona',
    '클레이': 'clay',
    '루드밀라': 'ludmilla',
    '루드밀라 : 윈터 오너': 'ludmilla_winter_owner',
    '사쿠라': 'sakura',
    '사쿠라 : 블룸 인 써머': 'sakura_bloom_in_summer',
    '블랑': 'blanc',
    '누아르': 'noir',
    '자칼': 'jackal',
    '바이퍼 : 톡식 버니': 'viper_toxic_bunny',
    '앨리스': 'alice',
    '앨리스 : 원더랜드 버니': 'alice_wonderland_bunny',
    '메이든': 'maiden',
    '메이든 : 아이스 로즈': 'maiden_ice_rose',
    '길로틴': 'guillotine',
    '길로틴 : 윈터 슬레이어': 'guillotine_winter_slayer',
    '솔린': 'soline',
    '브리드': 'brid',
    '브리드 : 사일런트 트랙': 'brid_silent_track',
    '엠마': 'emma',
    '엠마 : 택티컬 업': 'emma_tactical_up',
    '은화': 'eunhwa',
    '은화 : 택티컬 업': 'eunhwa_tactical_up',
    '시그널': 'signal',
    '맥스웰': 'maxwell',
    '유니': 'yuni',
    '리타': 'liter',
    '센티 : 헌신적인 기사': 'centi_devoted_knight',
    '에피넬': 'epinel',
    '폴크방': 'folkwang',
    '드라카': 'drake',
    '슈가 : 더티 블랙': 'sugar_dirty_black',
    '벨로타': 'belorta',
    '미카': 'mika',
    '미카 : 스노우 버디': 'mika_snow_buddy',
    '델타': 'delta',
    '델타 : 닌자 도둑': 'delta_ninja_thief',
    '앵커': 'anchor',
    '앵커 : 이노센트 메이드': 'anchor_innocent_maid',
    '네온': 'neon',
    '네온 : 블루 오션': 'neon_blue_ocean',
    '라피': 'rapi',
    '라피 : 레드 후드': 'rapi_red_hood',
    '에테르': 'ether',
    '미하라': 'mihara',
    '미하라 : 봉인 해제': 'mihara_bonding_chain',
    '클라라': 'clara',
    '아니스 : 스타': 'anis_star',
    '아르카나': 'arcana',
    '아르카나 : 포춘 메이트': 'arcana_fortune_mate',
    '마르차나': 'marciana',
    '소라': 'sora',
    '베스티': 'vesti',
    '크로우': 'crow',
    '프로덕트 08': 'product_08',
    '프로덕트 12': 'product_12',
    '프로덕트 23': 'product_23',
    '솔져 EG': 'soldier_eg',
    '솔져 FA': 'soldier_fa',
    '솔져 OW': 'soldier_ow',
    '아이돌 플라워': 'idoll_flower',
    '아이돌 오션': 'idoll_ocean',
    '아이돌 선': 'idoll_sun',
    '2B': '2b',
    'A2': 'a2',
    '마리': 'mari',
    '레이': 'rei',
    '아스카': 'asuka',
    '아스카 : WILLE': 'asuka_wille',
    '람': 'ram',
    '렘': 'rem',
    '에밀리아': 'emilia',
    '마키마': 'makima',
    '파워': 'power',
    '히메노': 'himeno',
    '파스칼': 'pascal',
    '미사토': 'misato',
    '이브': 'eve',
    '레이븐': 'raven',
    '에이다': 'ada',
    '클레어': 'claire',
    '질': 'jill',
    '쿠루미': 'kurumi',
    '치사토': 'chisato',
    '타키나': 'takina',
    '마코토': 'queen_makoto',
    '유키코': 'yukiko',
    '나하트': 'nacht',
    '릴리': 'lily',
    '아이기스': 'aegis',
    'D': 'd',
    'D : 킬러 와이프': 'd_killer_wife',
    'K': 'k',
    'EH': 'eh',
    '키리': 'kiri',
    '루마니': 'rumani',
    '마스': 'mast',
    '마스 : 로맨틱 메이드': 'mast_romantic_maid',
    '트리나': 'trina',
    '나가': 'naga',
    '티아': 'tia',
    '트로니': 'trony',
    '엘리브': 'elive',
    '에이블': 'able',
    '아이라': 'aira',
    '메이': 'may',
    '시엘': 'ciel',
    '아네트': 'annette',
    '앤': 'anne',
    '앤 : 미라클 페어리': 'anne_miracle_fairy',
    'N102': 'n102',
    '아인': 'ein',
    '체인소': 'chainsaw',
    '돌라': 'dolla',
    '프리카': 'frika',
    '아비스타': 'avista',
    '브래디': 'brady',
    '백호': 'byakko'
};

function getAvatarStems() {
    const avatarFiles = fs.readdirSync(AVATAR_DIR).filter(f => f.endsWith('.webp'));
    const stems = new Map(); // avatar stem -> full webp filename
    for (const f of avatarFiles) {
        stems.set(path.basename(f, '.webp'), f);
    }
    return stems;
}

function scanJsonFiles() {
    const files = [];
    function scan(dir) {
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                    files.push({
                        filePath: fullPath,
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
    return files;
}

function main() {
    console.log('[Rename] 아바타 파일명 기준 캐릭터 JSON 파일명 일괄 변경 시작...');

    const avatarStems = getAvatarStems();
    const jsonFiles = scanJsonFiles();

    console.log(`[Rename] 아바타 파일 ${avatarStems.size}개 / JSON 파일 ${jsonFiles.length}개 대상`);

    let renamedCount = 0;
    let unchangedCount = 0;
    const missingAvatars = [];

    for (const jsonFile of jsonFiles) {
        const charName = jsonFile.data.characterName || '';
        const currentStem = jsonFile.stem;

        // 1. 이미 직결 매칭되는 경우
        if (avatarStems.has(currentStem)) {
            unchangedCount++;
            continue;
        }

        // 2. 회사 prefix 및 희귀도 식별 (p_ssr_, e_ssr_, m_sr_ 등)
        const parts = currentStem.split('_');
        const prefix = parts[0]; // p, e, m, t, a
        const rarity = parts[1]; // ssr, sr, r

        const slugCandidate = NAME_TO_SLUG_MAP[charName] || NAME_TO_SLUG_MAP[charName.trim()];

        let targetStem = null;

        if (slugCandidate) {
            const expectedStem = `${prefix}_${rarity}_${slugCandidate}`;
            if (avatarStems.has(expectedStem)) {
                targetStem = expectedStem;
            } else {
                // 회사/희귀도가 약간 다를 수 있으므로 끝부분이 slugCandidate인 아바타 탐색
                for (const avatarStem of avatarStems.keys()) {
                    if (avatarStem.endsWith(`_${slugCandidate}`)) {
                        targetStem = avatarStem;
                        break;
                    }
                }
            }
        }

        // 3. 대체 매칭 탐색: characterID 기반
        if (!targetStem && jsonFile.data.characterID) {
            const cid = jsonFile.data.characterID.toLowerCase();
            for (const avatarStem of avatarStems.keys()) {
                if (avatarStem.toLowerCase().includes(cid)) {
                    targetStem = avatarStem;
                    break;
                }
            }
        }

        if (targetStem) {
            const newPath = path.join(jsonFile.dir, `${targetStem}.json`);
            if (jsonFile.filePath !== newPath) {
                fs.renameSync(jsonFile.filePath, newPath);
                console.log(`[Renamed] ${jsonFile.filename} -> ${targetStem}.json (캐릭터명: ${charName})`);
                renamedCount++;
            } else {
                unchangedCount++;
            }
        } else {
            // 아바타 파일이 없는 캐릭터
            missingAvatars.push({
                characterName: charName,
                characterID: jsonFile.data.characterID,
                jsonFile: jsonFile.filename,
                company: jsonFile.data.stats?.company,
                rarity: jsonFile.data.stats?.rarity
            });
        }
    }

    console.log(`\n==================================================`);
    console.log(`[Rename 완료] 변경됨: ${renamedCount}개 / 기존 유지: ${unchangedCount}개`);
    console.log(`[아바타 없음] 스킵된 캐릭터: ${missingAvatars.length}개`);
    console.log(`==================================================\n`);

    if (missingAvatars.length > 0) {
        console.log(`--- ⚠️ src/assets/avatar 에 아바타가 없어 스킵된 캐릭터 목록 (${missingAvatars.length}명) ---`);
        missingAvatars.forEach((item, idx) => {
            console.log(`${idx + 1}. [${item.company || '기타'}/${item.rarity || 'SSR'}] ${item.characterName} (ID: ${item.characterID}, 파일: ${item.jsonFile})`);
        });
    }
}

main();
