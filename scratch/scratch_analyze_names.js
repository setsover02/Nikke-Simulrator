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
console.log(`Total character files found: ${files.length}`);

let totalEffectsWithNames = 0;
let details = [];

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(content);
        if (!json.skills || !Array.isArray(json.skills)) return;

        json.skills.forEach((skill, sIdx) => {
            const skillName = skill.name || `skill_${sIdx + 1}`;
            if (skill.effects && Array.isArray(skill.effects)) {
                skill.effects.forEach((eff, eIdx) => {
                    if (eff.name) {
                        totalEffectsWithNames++;
                        details.push({
                            file: path.basename(file),
                            skillName,
                            effName: eff.name,
                            effType: eff.type,
                            stat: eff.stat || eff.effect,
                        });
                    }
                });
            }
        });
    } catch (e) {
        console.error(`Error in ${file}:`, e);
    }
});

console.log(`Total effects with 'name' property: ${totalEffectsWithNames}`);
console.log('Sample of effect names:');
console.log(details.slice(0, 30));
