import fs from 'fs';
import path from 'path';

const charDir = 'src/character';

function getJsonFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getJsonFiles(fullPath));
        } else if (file.endsWith('.json')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = getJsonFiles(charDir);

let modifiedCount = 0;
let deletedNamesCount = 0;

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(content);
        if (!json.skills || !Array.isArray(json.skills)) return;

        // 1. 해당 캐릭터 파일 내에서 참조되는 식별자 수집
        const localReferencedNames = new Set();
        json.skills.forEach(skill => {
            (skill.effects || []).forEach(eff => {
                if (eff.target_effect) localReferencedNames.add(eff.target_effect);
                if (eff.scaling_ref) localReferencedNames.add(eff.scaling_ref);

                const conds = Array.isArray(eff.condition) ? eff.condition : (eff.condition ? [eff.condition] : []);
                conds.forEach(c => {
                    if (typeof c === 'string') {
                        const m = c.match(/(?:self_state|not_self_state|target_state|self_stack_above|stack_above|target_stack_above|has_buff|not_has_buff):([^:]+)/);
                        if (m) localReferencedNames.add(m[1]);
                    }
                });

                const triggers = Array.isArray(eff.trigger) ? eff.trigger : (eff.trigger ? [eff.trigger] : []);
                triggers.forEach(t => {
                    if (typeof t === 'string') {
                        const m = t.match(/(?:weapon_hit|buff_stack_above|buff_apply|buff_remove):([^:]+)/);
                        if (m) localReferencedNames.add(m[1]);
                    }
                });
            });
        });

        let fileModified = false;

        // 2. 각 스킬의 effects 순회 및 name 정리
        json.skills.forEach(skill => {
            const skillName = (skill.name || '').trim();
            if (!skill.effects || !Array.isArray(skill.effects)) return;

            skill.effects.forEach(eff => {
                if (!eff.name) return;
                const effName = eff.name.trim();

                // 스킬명과 동일하거나 "스킬명 N" 패턴인 경우
                const isExactMatch = effName === skillName;
                const isNumberedMatch = new RegExp(`^${escapeRegex(skillName)}\\s*\\d+$`).test(effName);

                // 만약 식별자로 참조되지 않는 이름이거나, 스킬명/스킬명N 패턴인 경우
                if (isExactMatch || isNumberedMatch) {
                    // 단, 다른 곳에서 effName(예: '스킬명 4')을 참조하고 있다면 상위 스킬명으로 치환해야 함
                    if (localReferencedNames.has(effName)) {
                        // 참조하는 쪽들을 상위 skillName으로 일괄 업데이트
                        updateReferencesInJson(json, effName, skillName);
                    }
                    delete eff.name;
                    deletedNamesCount++;
                    fileModified = true;
                } else if (!localReferencedNames.has(effName)) {
                    // 상위 스킬명과 다르지만 어떤 곳에서도 참조되지 않는 단순 하위 네이밍인 경우
                    delete eff.name;
                    deletedNamesCount++;
                    fileModified = true;
                }
            });
        });

        if (fileModified) {
            fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
            modifiedCount++;
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateReferencesInJson(json, oldName, newName) {
    json.skills.forEach(skill => {
        (skill.effects || []).forEach(eff => {
            if (eff.target_effect === oldName) eff.target_effect = newName;
            if (eff.scaling_ref === oldName) eff.scaling_ref = newName;

            if (typeof eff.condition === 'string') {
                eff.condition = eff.condition.replace(`:${oldName}`, `:${newName}`);
            } else if (Array.isArray(eff.condition)) {
                eff.condition = eff.condition.map(c => typeof c === 'string' ? c.replace(`:${oldName}`, `:${newName}`) : c);
            }

            if (typeof eff.trigger === 'string') {
                eff.trigger = eff.trigger.replace(`:${oldName}`, `:${newName}`);
            } else if (Array.isArray(eff.trigger)) {
                eff.trigger = eff.trigger.map(t => typeof t === 'string' ? t.replace(`:${oldName}`, `:${newName}`) : t);
            }
        });
    });
}

console.log(`Successfully cleaned effect names in ${modifiedCount} files.`);
console.log(`Total effect names deleted/unified to parent skill name: ${deletedNamesCount}`);
