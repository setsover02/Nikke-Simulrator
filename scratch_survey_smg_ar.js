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

const byWeapon = {};

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(content);
        const weapon = json.stats?.weapon || json.weapon || 'UNKNOWN';
        const fireRate = json.stats?.fireRate ?? json.fireRate;
        const chargeTime = json.stats?.chargeTime ?? json.chargeTime;

        if (!byWeapon[weapon]) {
            byWeapon[weapon] = [];
        }

        byWeapon[weapon].push({
            file: path.basename(file),
            name: json.characterName || json.name,
            fireRate,
            chargeTime,
        });
    } catch (e) {
        console.error(e);
    }
});

for (const weapon of ['SMG', 'AR']) {
    const list = byWeapon[weapon] || [];
    console.log(`\n======================================================`);
    console.log(`【 무기: ${weapon} (총 ${list.length}명) 】`);
    const rateDist = {};
    list.forEach(item => {
        const r = item.fireRate !== undefined ? item.fireRate : 'undefined';
        rateDist[r] = (rateDist[r] || 0) + 1;
    });
    console.log('fireRate 분포:', rateDist);

    list.forEach(item => {
        console.log(`  - ${item.name.padEnd(20)} (${item.file.padEnd(30)}): fireRate = ${item.fireRate}`);
    });
}
