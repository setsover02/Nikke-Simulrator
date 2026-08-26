const fs = require('fs');
const path = require('path');

const SCRAPED_PATH = path.resolve(__dirname, '../scraper/nikke_scraped.json');
const CHAR_BASE_DIR = path.resolve(__dirname, '../src/character');

const scraped = JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf8'));

function norm(s) {
  return (s || '').replace(/\s+/g, '').replace(/:/g, '').replace(/\(/g, '').replace(/\)/g, '').toLowerCase();
}

const scrapedKeyMap = {};
for (const k of Object.keys(scraped)) {
  scrapedKeyMap[norm(k)] = scraped[k];
  scrapedKeyMap[k] = scraped[k];
}

const charDirs = ['abnormal', 'elysion', 'missilis', 'pilgrim', 'tetra'];
let totalUpdated = 0;

for (const dir of charDirs) {
  const dirPath = path.join(CHAR_BASE_DIR, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

  for (const f of files) {
    const fullPath = path.join(dirPath, f);
    const charData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const rawName = charData.characterName || charData.name || '';
    const fileBase = f.replace(/^[a-z]_[a-z]+_/, '').replace('.json', '');

    let entry = scraped[rawName] || scrapedKeyMap[norm(rawName)] || scrapedKeyMap[norm(fileBase)];
    if (!entry) {
      console.warn(`[WARN] Not found in scraped: ${rawName} (${f})`);
      continue;
    }

    const wd = entry.weapon_detail;
    if (!wd) {
      console.warn(`[WARN] No weapon_detail: ${rawName} (${f})`);
      continue;
    }

    const atkCoef = Number((wd.damage / 100).toFixed(2));
    const maxAmmo = wd.max_ammo ?? charData.stats?.maxAmmo ?? 6;
    const reloadTime = Number(((wd.reload_time ?? 200) / 100).toFixed(2));
    const chargeTime = Number(((wd.charge_time ?? 0) / 100).toFixed(2));
    const fireRate = Number(((wd.rate_of_fire ?? 60) / 60).toFixed(2));
    const fullChargeDamage = Number(((wd.full_charge_damage ?? 10000) / 100).toFixed(2));
    const coreDamage = Number(((wd.core_damage_rate ?? 20000) / 100).toFixed(2));
    const pelletCount = wd.shot_count ?? (wd.weapon_type === 'SG' ? 10 : 1);

    // Update stats preserving existing metadata fields
    charData.stats = {
      ...charData.stats,
      atkCoef,
      maxAmmo,
      reloadTime,
      chargeTime,
      fireRate,
      fullChargeDamage,
      coreDamage,
      pelletCount,
    };

    fs.writeFileSync(fullPath, JSON.stringify(charData, null, 4), 'utf8');
    totalUpdated++;
  }
}

console.log(`✅ Successfully updated weapon stats (atkCoef, etc.) for ${totalUpdated} characters.`);
