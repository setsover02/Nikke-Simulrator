import fs from 'fs';
import path from 'path';

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        try {
            if (fs.statSync(dirFile).isDirectory()) {
                if (!dirFile.includes('backup')) {
                    filelist = walkSync(dirFile, filelist);
                }
            } else {
                if (file.endsWith('.json')) {
                    filelist.push(dirFile);
                }
            }
        } catch (err) {
            if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return;
            else throw err;
        }
    });
    return filelist;
};

const files = walkSync('f:/Nikke-Simulrator/src/character');
const summary = {
    triggers: new Set(),
    targets: new Set(),
    effects: new Set(),
    units: new Set(),
    based_ons: new Set(),
    duration_units: new Set(),
    anomalies: []
};

for (const file of files) {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!data.skills) continue;

        for (const skill of data.skills) {
            if (!skill.effects) continue;
            for (let i = 0; i < skill.effects.length; i++) {
                const eff = skill.effects[i];
                if (eff.trigger) summary.triggers.add(eff.trigger);
                if (eff.target) summary.targets.add(eff.target);
                if (eff.effect) summary.effects.add(eff.effect);
                if (eff.unit) summary.units.add(eff.unit);
                if (eff.duration_unit) summary.duration_units.add(eff.duration_unit);
                if (eff.based_on) summary.based_ons.add(eff.based_on);

                if (eff.unit2) summary.anomalies.push(`${file} -> skill:${skill.id} effect[${i}] has unit2`);
                if (eff.unit === 'rounds') summary.anomalies.push(`${file} -> skill:${skill.id} effect[${i}] has unit: 'rounds' instead of duration_unit`);
            }
        }
    } catch (e) {
        console.log(`Failed to parse ${file}`);
    }
}

console.log(JSON.stringify({
    triggers: [...summary.triggers],
    targets: [...summary.targets],
    effects: [...summary.effects],
    units: [...summary.units],
    duration_units: [...summary.duration_units],
    based_ons: [...summary.based_ons],
    anomalies: summary.anomalies
}, null, 2));
