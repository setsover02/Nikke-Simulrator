/**
 * executeSkillRewrite.js
 * Analyzes scraper/nikke_scraped.json and rewrites skills in src/character/ json files,
 * then updates context/skill/*.md documentation with newly discovered variables.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertCharacterSkills, usedVars } from './parseAllCharacterSkills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SCRAPED_PATH = path.join(ROOT, 'scraper', 'nikke_scraped.json');
const CHAR_DIR = path.join(ROOT, 'src', 'character');
const CONTEXT_DIR = path.join(ROOT, 'context', 'skill');

function getCharFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            if (file !== 'backup') results = results.concat(getCharFiles(full));
        } else if (file.endsWith('.json') && file !== 'defaultForm.json') {
            results.push(full);
        }
    }
    return results;
}

function normalize(s) {
    return s.toLowerCase().replace(/[\s:_().-]/g, '');
}

function buildScrapedMap(scraped) {
    const map = new Map();
    for (const [key, value] of Object.entries(scraped)) {
        map.set(key, value);
        map.set(normalize(key), value);
    }
    return map;
}

function findScrapedEntry(name, scraped, scrapedMap) {
    if (scraped[name]) return scraped[name];
    const n = normalize(name);
    if (scrapedMap.has(n)) return scrapedMap.get(n);

    for (const [key, val] of Object.entries(scraped)) {
        const nk = normalize(key);
        if (n.startsWith(nk) || nk.startsWith(n)) {
            return val;
        }
    }
    return null;
}

export function rewriteAll() {
    console.log('[Rewrite] Starting character skill rewrite from scraped data...');

    const scraped = JSON.parse(fs.readFileSync(SCRAPED_PATH, 'utf-8'));
    const scrapedMap = buildScrapedMap(scraped);
    const files = getCharFiles(CHAR_DIR);

    let updatedCount = 0;
    let missingCount = 0;

    for (const file of files) {
        const charJson = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const scrapedEntry = findScrapedEntry(charJson.characterName, scraped, scrapedMap);

        if (!scrapedEntry) {
            console.warn(`[Warning] No scraped data found for: ${charJson.characterName} (${file})`);
            missingCount++;
            continue;
        }

        const { skills } = convertCharacterSkills(charJson, scrapedEntry);

        // Update skills while preserving character stats and metadata
        charJson.skills = skills;

        fs.writeFileSync(file, JSON.stringify(charJson, null, 4), 'utf-8');
        updatedCount++;
    }

    console.log(`[Rewrite] Completed rewriting ${updatedCount} character JSON files. (Missing: ${missingCount})`);

    // Now update context/skill documentation with newly discovered variables
    updateContextDocumentation();
}

function updateContextDocumentation() {
    console.log('[Context] Updating context/skill markdown documentation with new variables...');

    // 1. based_on.md
    const basedOnPath = path.join(CONTEXT_DIR, 'based_on.md');
    let basedOnContent = fs.readFileSync(basedOnPath, 'utf-8');
    const newBasedOn = [];

    const existingBasedOnList = [
        'attack_damage', 'final_atk', 'final_hp', 'final_def', 'final_max_ammo',
        'final_reload_time', 'final_charge_time', 'caster_hp', 'caster_max_hp',
        'caster_final_max_hp', 'caster_def', 'caster_final_atk', 'caster_atk'
    ];

    for (const b of usedVars.based_on) {
        if (!existingBasedOnList.includes(b) && !basedOnContent.includes(b)) {
            newBasedOn.push(b);
        }
    }

    if (newBasedOn.length > 0) {
        const addition = `\n\n### 추가된 based_on\n` + newBasedOn.map(b => `${b}: 기준값`).join('\n') + '\n';
        fs.appendFileSync(basedOnPath, addition, 'utf-8');
        console.log(`[Context] Added ${newBasedOn.length} new based_on variables to based_on.md`);
    }

    // 2. target.md
    const targetPath = path.join(CONTEXT_DIR, 'target.md');
    let targetContent = fs.readFileSync(targetPath, 'utf-8');
    const newTargets = [];

    for (const t of usedVars.targets) {
        if (!targetContent.includes(t)) {
            newTargets.push(t);
        }
    }

    if (newTargets.length > 0) {
        const addition = `\n\n### 추가된 타겟 목록\n` + newTargets.map(t => `${t}: 대상`).join('\n') + '\n';
        fs.appendFileSync(targetPath, addition, 'utf-8');
        console.log(`[Context] Added ${newTargets.length} new target variables to target.md`);
    }

    // 3. trigger.md
    const triggerPath = path.join(CONTEXT_DIR, 'trigger.md');
    let triggerContent = fs.readFileSync(triggerPath, 'utf-8');
    const newTriggers = [];

    for (const tr of usedVars.triggers) {
        if (!triggerContent.includes(tr)) {
            newTriggers.push(tr);
        }
    }

    if (newTriggers.length > 0) {
        const addition = `\n\n### 추가된 트리거 목록\n` + newTriggers.map(tr => `${tr}: 조건 발동 타이밍`).join('\n') + '\n';
        fs.appendFileSync(triggerPath, addition, 'utf-8');
        console.log(`[Context] Added ${newTriggers.length} new trigger variables to trigger.md`);
    }

    // 4. effect.md
    const effectPath = path.join(CONTEXT_DIR, 'effect.md');
    let effectContent = fs.readFileSync(effectPath, 'utf-8');
    const newEffects = [];

    for (const eff of usedVars.effects) {
        if (!effectContent.includes(eff)) {
            newEffects.push(eff);
        }
    }

    if (newEffects.length > 0) {
        const addition = `\n\n### 추가된 이펙트 목록\n` + newEffects.map(eff => `${eff}: 스킬 효과`).join('\n') + '\n';
        fs.appendFileSync(effectPath, addition, 'utf-8');
        console.log(`[Context] Added ${newEffects.length} new effect variables to effect.md`);
    }

    // 5. status.md
    const statusPath = path.join(CONTEXT_DIR, 'status.md');
    let statusContent = fs.readFileSync(statusPath, 'utf-8');
    const newStatuses = [];

    for (const st of usedVars.statuses) {
        if (!statusContent.includes(st)) {
            newStatuses.push(st);
        }
    }

    if (newStatuses.length > 0) {
        const addition = `\n\n### 추가된 고유 상태 (status)\n` + newStatuses.map(st => `${st}: 고유 상태`).join('\n') + '\n';
        fs.appendFileSync(statusPath, addition, 'utf-8');
        console.log(`[Context] Added ${newStatuses.length} new status variables to status.md`);
    }

    console.log('[Context] Context documentation update complete!');
}

rewriteAll();
