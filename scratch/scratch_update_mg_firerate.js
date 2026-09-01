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

let mgChars = [];
let updatedCount = 0;

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(content);
        const weapon = json.stats?.weapon || json.weapon;

        if (weapon === 'MG') {
            const currentFireRate = json.stats?.fireRate ?? json.fireRate;
            mgChars.push({
                file: path.basename(file),
                name: json.characterName || json.name,
                currentFireRate,
            });

            let modified = false;
            if (json.stats && json.stats.fireRate !== 60) {
                json.stats.fireRate = 60;
                modified = true;
            }
            if (json.fireRate !== undefined && json.fireRate !== 60) {
                json.fireRate = 60;
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
                updatedCount++;
            }
        }
    } catch (e) {
        console.error(`Error in ${file}:`, e);
    }
});

console.log(`Total MG characters found: ${mgChars.length}`);
console.log(`Updated files: ${updatedCount}`);
console.log('\n--- MG Characters List ---');
mgChars.forEach(c => {
    console.log(`- ${c.name.padEnd(20)} (${c.file}): fireRate was ${c.currentFireRate} -> now 60`);
});
