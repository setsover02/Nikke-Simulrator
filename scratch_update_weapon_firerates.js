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

let sgUpdated = 0;
let srUpdated = 0;
let rlUpdated = 0;

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(content);
        const weapon = json.stats?.weapon || json.weapon;

        let modified = false;

        // 1. SG: fireRate = 1.51515
        if (weapon === 'SG') {
            if (json.stats && json.stats.fireRate !== 1.51515) {
                json.stats.fireRate = 1.51515;
                modified = true;
            }
            if (json.fireRate !== undefined && json.fireRate !== 1.51515) {
                json.fireRate = 1.51515;
                modified = true;
            }
            if (modified) sgUpdated++;
        }

        // 2. SR: fireRate = 0
        else if (weapon === 'SR') {
            if (json.stats && json.stats.fireRate !== 0) {
                json.stats.fireRate = 0;
                modified = true;
            }
            if (json.fireRate !== undefined && json.fireRate !== 0) {
                json.fireRate = 0;
                modified = true;
            }
            if (modified) srUpdated++;
        }

        // 3. RL: fireRate = 0
        else if (weapon === 'RL') {
            if (json.stats && json.stats.fireRate !== 0) {
                json.stats.fireRate = 0;
                modified = true;
            }
            if (json.fireRate !== undefined && json.fireRate !== 0) {
                json.fireRate = 0;
                modified = true;
            }
            if (modified) rlUpdated++;
        }

        if (modified) {
            fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
        }
    } catch (e) {
        console.error(`Error in ${file}:`, e);
    }
});

console.log('=== 무기별 fireRate 수정 결과 ===');
console.log(`- SG (1.51515 적용): ${sgUpdated}개 파일 수정`);
console.log(`- SR (0 적용): ${srUpdated}개 파일 수정`);
console.log(`- RL (0 적용): ${rlUpdated}개 파일 수정`);
console.log(`총 수정 파일 수: ${sgUpdated + srUpdated + rlUpdated}개`);
