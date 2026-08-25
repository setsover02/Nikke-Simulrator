/**
 * src/character/ 내 전체 캐릭터 JSON 형식 진단 및 유효성 검사 스크립트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'src', 'character');

const VALID_RARITIES = new Set(['SSR', 'SR', 'R']);
const VALID_ELEMENTS = new Set(['작열', '수냉', '풍압', '전격', '철갑']);
const VALID_WEAPONS = new Set(['AR', 'SG', 'MG', 'RL', 'SR', 'SMG']);
const VALID_CLASSES = new Set(['화력형', '지원형', '방어형']);
const VALID_COMPANIES = new Set(['Pilgrim', 'Elysion', 'Missilis', 'Tetra', 'Abnormal']);

function validateAll() {
    console.log('[Validator] 전체 캐릭터 JSON 형식 검사 시작...');

    const issues = [];
    let totalFiles = 0;

    function scan(dir) {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item !== 'backup') scan(fullPath);
            } else if (item.endsWith('.json')) {
                totalFiles++;
                const relPath = path.relative(CHAR_DIR, fullPath);
                try {
                    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

                    // 1. 기본 키 검사
                    if (!data.characterID) issues.push({ file: relPath, issue: 'characterID 누락' });
                    if (!data.characterName) issues.push({ file: relPath, issue: 'characterName 누락' });

                    // 2. stats 검사
                    const s = data.stats;
                    if (!s) {
                        issues.push({ file: relPath, issue: 'stats 객체 누락' });
                    } else {
                        if (!VALID_RARITIES.has(s.rarity)) issues.push({ file: relPath, issue: `유효하지 않은 rarity: ${s.rarity}` });
                        if (!VALID_ELEMENTS.has(s.element)) issues.push({ file: relPath, issue: `유효하지 않은 element: ${s.element}` });
                        if (!VALID_WEAPONS.has(s.weapon)) issues.push({ file: relPath, issue: `유효하지 않은 weapon: ${s.weapon}` });
                        if (!VALID_CLASSES.has(s.class)) issues.push({ file: relPath, issue: `유효하지 않은 class: ${s.class}` });
                        if (!VALID_COMPANIES.has(s.company)) issues.push({ file: relPath, issue: `유효하지 않은 company: ${s.company}` });
                        if (typeof s.atkCoef !== 'number' || isNaN(s.atkCoef)) issues.push({ file: relPath, issue: `잘못된 atkCoef 수치` });
                        if (typeof s.maxAmmo !== 'number' || s.maxAmmo <= 0) issues.push({ file: relPath, issue: `잘못된 maxAmmo 수치 (${s.maxAmmo})` });
                    }

                    // 3. skills 검사
                    if (!Array.isArray(data.skills) || data.skills.length === 0) {
                        issues.push({ file: relPath, issue: 'skills 배열 누락 또는 비어있음' });
                    } else {
                        for (const skill of data.skills) {
                            if (!skill.id || !skill.name) {
                                issues.push({ file: relPath, issue: `스킬 id 또는 name 누락` });
                            }
                            if (!Array.isArray(skill.effects)) {
                                issues.push({ file: relPath, issue: `스킬(${skill.id}) effects 배열 누락` });
                            } else {
                                for (const eff of skill.effects) {
                                    if (Array.isArray(eff.value) && eff.value.length !== 10) {
                                        // 레벨 1~10 배열 수치가 10개가 아닌 경고
                                        issues.push({ file: relPath, issue: `스킬(${skill.id}) value 배열 길이 불일치 (개수: ${eff.value.length})` });
                                    }
                                }
                            }
                        }
                    }

                } catch (err) {
                    issues.push({ file: relPath, issue: `JSON 문법 오류: ${err.message}` });
                }
            }
        }
    }

    scan(CHAR_DIR);

    console.log(`[Validator] 검사 완료: 총 ${totalFiles}개 파일 검사`);
    if (issues.length === 0) {
        console.log('[Validator] ✅ 모든 캐릭터 JSON 형식이 적절합니다! (오류 0건)');
    } else {
        console.log(`[Validator] ⚠️ 주의가 필요한 항목: 총 ${issues.length}건`);
        issues.forEach(i => console.log(`  - [${i.file}] ${i.issue}`));
    }
}

validateAll();
