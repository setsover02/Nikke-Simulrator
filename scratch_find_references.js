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

let referencedNames = new Set();
let allEffectNames = new Set();

files.forEach(file => {
    try {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!json.skills) return;

        json.skills.forEach(skill => {
            (skill.effects || []).forEach(eff => {
                if (eff.name) allEffectNames.add(eff.name);

                // Check references
                if (eff.target_effect) referencedNames.add(eff.target_effect);
                if (eff.scaling_ref) referencedNames.add(eff.scaling_ref);

                const conds = Array.isArray(eff.condition) ? eff.condition : (eff.condition ? [eff.condition] : []);
                conds.forEach(c => {
                    if (typeof c === 'string') {
                        const m = c.match(/(?:self_state|not_self_state|target_state|self_stack_above|stack_above|target_stack_above|has_buff|not_has_buff):([^:]+)/);
                        if (m) referencedNames.add(m[1]);
                    }
                });

                const triggers = Array.isArray(eff.trigger) ? eff.trigger : (eff.trigger ? [eff.trigger] : []);
                triggers.forEach(t => {
                    if (typeof t === 'string') {
                        const m = t.match(/(?:weapon_hit|buff_stack_above|buff_apply|buff_remove):([^:]+)/);
                        if (m) referencedNames.add(m[1]);
                    }
                });
            });
        });
    } catch (e) {
        console.error(e);
    }
});

console.log('Total unique effect names:', allEffectNames.size);
console.log('Total referenced names:', referencedNames.size);
console.log('Referenced names:', Array.from(referencedNames));
