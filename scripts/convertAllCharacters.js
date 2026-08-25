/**
 * nikke_scraped.json -> src/character/ 미추가 캐릭터 일괄 자동 변환 스크립트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SCRAPED_PATH = path.join(ROOT, 'scraper', 'nikke_scraped.json');
const CHAR_DIR = path.join(ROOT, 'src', 'character');

const COMPANY_MAP = {
    'PILGRIM': { dir: 'pilgrim', prefix: 'p', name: 'Pilgrim' },
    '필그림': { dir: 'pilgrim', prefix: 'p', name: 'Pilgrim' },
    'ELYSION': { dir: 'elysion', prefix: 'e', name: 'Elysion' },
    '엘리시온': { dir: 'elysion', prefix: 'e', name: 'Elysion' },
    'MISSILIS': { dir: 'missilis', prefix: 'm', name: 'Missilis' },
    '미실리스': { dir: 'missilis', prefix: 'm', name: 'Missilis' },
    'TETRA': { dir: 'tetra', prefix: 't', name: 'Tetra' },
    '테트라': { dir: 'tetra', prefix: 't', name: 'Tetra' },
    'ABNORMAL': { dir: 'abnormal', prefix: 'a', name: 'Abnormal' },
    '어브노말': { dir: 'abnormal', prefix: 'a', name: 'Abnormal' },
};

const ELEMENT_MAP = {
    'Fire': '작열', '작열': '작열',
    'Water': '수냉', '수냉': '수냉',
    'Wind': '풍압', '풍압': '풍압',
    'Electronic': '전격', '전격': '전격',
    'Iron': '철갑', '철갑': '철갑',
};

const CLASS_MAP = {
    'Attacker': '화력형', '화력형': '화력형',
    'Supporter': '지원형', '지원형': '지원형',
    'Defender': '방어형', '방어형': '방어형',
};

const BURST_MAP = {
    'Step1': 1, '1': 1,
    'Step2': 2, '2': 2,
    'Step3': 3, '3': 3,
    'AllStep': 1, 'A': 1,
};

// 기존 등록된 캐릭터 이름/ID 목록 수집
function getExistingCharacterNames() {
    const existing = new Set();
    const files = [];

    function scan(dir) {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                files.push(fullPath);
                try {
                    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                    if (content.characterName) existing.add(content.characterName);
                    if (content.characterID) existing.add(content.characterID.toLowerCase());
                } catch (e) {}
            }
        }
    }

    scan(CHAR_DIR);
    return { existingNames: existing, files };
}

// 한글/영문 이름 -> 파일명 슬러그 생성
function nameToSlug(name) {
    // 괄호 및 특수문자 정리
    return name
        .toLowerCase()
        .replace(/\s*:\s*/g, '_')
        .replace(/\s*\(\s*/g, '_')
        .replace(/\s*\)\s*/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_가-힣]/g, '');
}

// 영문 ID 생성 (PascalCase)
function nameToId(name, rawId) {
    const clean = name.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length > 2) {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return `Char_${rawId}`;
}

// 태그 지우기
function stripTags(text) {
    if (!text) return '';
    return text.replace(/<\/?[^>]+(>|$)/g, '').replace(/\xa0/g, ' ').trim();
}

// 숫자로 변환 (실패 시 기본값)
function toFloat(val, defaultVal = 0) {
    if (val === null || val === undefined) return defaultVal;
    const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? defaultVal : num;
}

// raw detail -> level 1..10 value matrix
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

// 스킬 텍스트 패턴 분석하여 effects 생성
function parseSkillEffects(descKey, valList) {
    const text = stripTags(descKey);
    const matrix = parseValueList(valList);
    const effects = [];

    // 줄 단위로 분할하여 이펙트 구조 구성
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let currentTrigger = 'passive';

    for (const line of lines) {
        if (line.startsWith('■')) {
            const condText = line.replace('■', '').trim();
            if (condText.includes('풀 버스트 타임 시작 시')) {
                currentTrigger = 'full_burst_start';
            } else if (condText.includes('전투 시작 시')) {
                currentTrigger = 'battle_start';
            } else if (condText.includes('일반 공격')) {
                currentTrigger = 'normal_attack';
            } else if (condText.includes('풀 차지')) {
                currentTrigger = 'full_charge_attack';
            } else if (condText.includes('버스트 스킬')) {
                currentTrigger = 'burst_cast';
            }
            continue;
        }

        // placeholder {description_value_NN} 매칭
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
            else if (line.includes('크리티컬 확률')) effectType = 'critical_rate_up';
            else if (line.includes('크리티컬 대미지')) effectType = 'critical_damage_up';
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

function main() {
    console.log('[Convert] 미추가 캐릭터 일괄 변환 시작...');

    const scrapedData = JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf-8'));
    const { existingNames } = getExistingCharacterNames();

    let addedCount = 0;
    let skippedCount = 0;
    const diagnostics = [];

    for (const [name, entry] of Object.entries(scrapedData)) {
        if (existingNames.has(name)) {
            skippedCount++;
            continue;
        }

        const raw = entry.raw || entry;
        const corpKey = raw.corporation || entry.기업 || 'PILGRIM';
        const companyInfo = COMPANY_MAP[corpKey] || COMPANY_MAP['PILGRIM'];
        const rarity = (raw.original_rare || entry.레어도 || 'SSR').toUpperCase();
        const rarityLower = rarity.toLowerCase();

        const slug = nameToSlug(name);
        const filename = `${companyInfo.prefix}_${rarityLower}_${slug}.json`;
        const targetDir = path.join(CHAR_DIR, companyInfo.dir);
        const targetFilePath = path.join(targetDir, filename);

        // 스탯 추출
        const shot = raw.shot_detail || entry.무기상세 || {};
        const weaponType = shot.weapon_type || entry.무기상세?.무기유형 || 'AR';
        const isCharge = (shot.description_localkey || '').includes('{charge_time}') || (entry.무기상세?.['조작 타입'] === '차지형');

        const maxAmmo = toFloat(shot.max_ammo || entry.무기상세?.['최대 장탄 수'], 60);
        const reloadTime = toFloat(shot.reload_time ? shot.reload_time / 100 : entry.무기상세?.['재장전 시간'], 1.0);
        const fireRate = shot.rate_of_fire ? Math.round((shot.rate_of_fire / 60) * 10000) / 10000 : toFloat(entry.무기상세?.['연사(rpm)'] ? entry.무기상세['연사(rpm)'] / 60 : 12);

        // 무기 스킬 파싱
        const weaponSkillText = stripTags(shot.description_localkey || entry.무기상세?.무기스킬 || '');
        const dmgMatch = weaponSkillText.match(/공격력\s*([\d.]+)\s*%/);
        const coreMatch = weaponSkillText.match(/코어 대미지\s*([\d.]+)\s*%/);
        const fullChargeMatch = weaponSkillText.match(/풀 차지 대미지:\s*([\d.]+)\s*%/);
        const chargeTimeMatch = weaponSkillText.match(/차지 시간:\s*([\d.]+)\s*초/);

        const atkCoef = dmgMatch ? toFloat(dmgMatch[1]) : (weaponType === 'SG' ? 222.8 : weaponType === 'MG' ? 5.57 : 13.65);
        const coreDamage = coreMatch ? toFloat(coreMatch[1]) : 200;
        const fullChargeDamage = fullChargeMatch ? toFloat(fullChargeMatch[1]) : (isCharge ? 250 : 0);
        const chargeTime = chargeTimeMatch ? toFloat(chargeTimeMatch[1]) : (isCharge ? 1.0 : 0);

        // 버스트 단계
        const burstStageRaw = raw.use_burst_skill || entry['버스트 단계'] || 'Step3';
        const burstLevel = BURST_MAP[burstStageRaw] || 3;

        // 스킬 구성
        const skill1Raw = raw.skill1_detail || entry.스킬?.skill1_detail;
        const skill2Raw = raw.skill2_detail || entry.스킬?.skill2_detail;
        const ultiRaw = raw.ulti_skill_detail || entry.스킬?.ulti_skill_detail;

        const skills = [];

        if (skill1Raw) {
            skills.push({
                id: 'skill_1',
                name: skill1Raw.name_localkey || '스킬 1',
                type: 'passive',
                effects: parseSkillEffects(skill1Raw.description_localkey, skill1Raw.description_value_list)
            });
        }

        if (skill2Raw) {
            skills.push({
                id: 'skill_2',
                name: skill2Raw.name_localkey || '스킬 2',
                type: 'passive',
                effects: parseSkillEffects(skill2Raw.description_localkey, skill2Raw.description_value_list)
            });
        }

        if (ultiRaw) {
            const coolSec = ultiRaw.skill_cooltime ? ultiRaw.skill_cooltime / 100 : 40;
            skills.push({
                id: 'burst',
                name: ultiRaw.name_localkey || '버스트 스킬',
                type: 'burst',
                cooldown: coolSec,
                effects: parseSkillEffects(ultiRaw.description_localkey, ultiRaw.description_value_list)
            });
        }

        const charJson = {
            characterID: nameToId(name, raw.resource_id || entry.id || 0),
            characterName: name,
            stats: {
                rarity,
                element: ELEMENT_MAP[raw.element_details?.[0]?.element || entry.속성] || '작열',
                weapon: weaponType,
                class: CLASS_MAP[raw.class || entry.클래스] || '화력형',
                company: companyInfo.name,
                squad: (raw.squad_detail?.squad_name || entry.스쿼드명 || entry.스쿼드 || '').replace('-', ''),
                burstLevel,
                atkCoef,
                maxAmmo,
                reloadTime,
                chargeTime,
                fireRate,
                fullChargeDamage,
                coreDamage
            },
            skills
        };

        // 서식 진단 체크
        if (!skill1Raw || !skill2Raw || !ultiRaw) {
            diagnostics.push(`[형식 누락] ${name}: 일부 스킬 데이터가 부족합니다.`);
        }
        if (atkCoef === 0) {
            diagnostics.push(`[스탯 주의] ${name}: 무기 공격력 계수(atkCoef)를 추출하지 못했습니다.`);
        }

        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(targetFilePath, JSON.stringify(charJson, null, 4), 'utf-8');
        existingNames.add(name);
        addedCount++;
    }

    console.log(`[Convert] 변환 완료! 추가됨: ${addedCount}명 / 이미 존재하여 스킵됨: ${skippedCount}명`);
    if (diagnostics.length > 0) {
        console.log(`\n--- JSON 형식 진단 보고서 (총 ${diagnostics.length}건) ---`);
        diagnostics.slice(0, 10).forEach(d => console.log(d));
        if (diagnostics.length > 10) {
            console.log(`...외 ${diagnostics.length - 10}건 추가 항목 생략`);
        }
    }
}

main();
