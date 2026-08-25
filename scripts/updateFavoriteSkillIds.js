/**
 * src/character/ 내 favoriteItem 필드가 존재하는 캐릭터 JSON에 skill.id 추가 스크립트
 * (skills 배열의 name과 매칭하여 id를 설정하며, 보조적으로 replaceSlot을 매핑합니다)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHAR_DIR = path.join(ROOT, 'src', 'character');

const SLOT_ID_MAP = {
    1: 'skill_1',
    2: 'skill_2',
    3: 'burst'
};

function main() {
    console.log('[FavoriteSkillId] 애장품 스킬에 id 추가 작업 시작...');

    let updatedCount = 0;
    let skillIdCount = 0;

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
                    if (!data.favoriteItem || !Array.isArray(data.favoriteItem.stages)) continue;

                    const baseSkills = data.skills || [];
                    const nameToIdMap = new Map();
                    baseSkills.forEach(s => {
                        if (s.name && s.id) {
                            nameToIdMap.set(s.name.trim(), s.id);
                        }
                    });

                    let modified = false;

                    for (const stage of data.favoriteItem.stages) {
                        if (!stage.skill) continue;

                        const skillName = (stage.skill.name || '').trim();
                        let targetId = nameToIdMap.get(skillName);

                        if (!targetId && stage.replaceSlot) {
                            targetId = SLOT_ID_MAP[stage.replaceSlot];
                        }

                        if (!targetId && baseSkills[stage.stage - 1]) {
                            targetId = baseSkills[stage.stage - 1].id;
                        }

                        if (!targetId) targetId = `skill_${stage.replaceSlot || stage.stage}`;

                        // skill.id 부여 (id가 기존 id 위치인 name 위로 가도록 구성)
                        const newSkillObj = {
                            id: targetId,
                            name: stage.skill.name,
                            effects: stage.skill.effects
                        };

                        stage.skill = newSkillObj;
                        skillIdCount++;
                        modified = true;
                    }

                    if (modified) {
                        fs.writeFileSync(fullPath, JSON.stringify(data, null, 4), 'utf-8');
                        console.log(`[Success] ✅ ${data.characterName} (${path.basename(fullPath)}) -> 애장품 스킬 id 부여 완료`);
                        updatedCount++;
                    }

                } catch (err) {
                    console.error(`[Error] ${fullPath} 처리 중 오류:`, err.message);
                }
            }
        }
    }

    scan(CHAR_DIR);

    console.log(`\n[FavoriteSkillId] 작업 완료! 총 ${updatedCount}개 캐릭터 (${skillIdCount}개 애장품 스킬)에 skill.id 추가.`);
}

main();
