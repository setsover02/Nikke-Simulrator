/**
 * Node.js 전용 병렬 blablalink CDN 데이터 수집 스크립트
 * 별도의 파이썬 설치 없이 `node scripts/fetchCdnData.js`로 약 3초 만에 전체 수집을 수행합니다.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CDN_BASE = 'https://sg-tools-cdn.blablalink.com';
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291];
const CONCURRENCY = 20;

function djb2(text, seed) {
    let value = seed | 0;
    for (let i = 0; i < text.length; i++) {
        value = (Math.imul(value, 33) + text.charCodeAt(i)) | 0;
    }
    return value;
}

function dirToken(pathStr, prime) {
    const rawR = djb2(pathStr, prime) % prime;
    const r = ((rawR % prime) + prime) % prime;
    const letters = String.fromCharCode(97 + Math.floor(r / 26) % 26) + String.fromCharCode(97 + (r % 26));
    const numStr = String(r % 99).padStart(2, '0');
    return `${letters}-${numStr}`;
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function obfuscatePath(pathStr) {
    const plain = pathStr.replace(/^\/+/, '');
    const segments = plain.split('/').filter(Boolean);
    const out = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (i === segments.length - 1) {
            const extParts = seg.split('.');
            const ext = extParts.slice(1).join('.');
            out.push(`${md5(plain)}.${ext}`);
        } else {
            out.push(dirToken(plain, LARGE_PRIMES[i]));
        }
    }
    return out.join('/');
}

function getCdnUrl(pathStr) {
    return `${CDN_BASE}/${obfuscatePath(pathStr)}`;
}

async function fetchJson(relPath) {
    const url = getCdnUrl(relPath);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${relPath}`);
    }
    return res.json();
}

async function runPool(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        const chunkResults = await Promise.all(chunk.map(fn));
        results.push(...chunkResults);
    }
    return results;
}

async function main() {
    console.log('[Scraper] blablalink CDN 병렬 수집 시작...');
    const startTime = Date.now();
    try {
        const idMap = await fetchJson('/character/character_id_map.json');
        console.log(`[Scraper] 캐릭터 후보 목록 ${idMap.length}개 발견`);

        const results = {};
        let successCount = 0;

        await runPool(idMap, CONCURRENCY, async (item) => {
            const rid = item.resource_id;
            try {
                const role = await fetchJson(`/roledata/${rid}-v2-ko.json`);
                const name = role.name_localkey || `ID_${rid}`;
                results[name] = {
                    id: rid,
                    rarity: role.original_rare || 'SSR',
                    class: role.class || '',
                    company: role.corporation || '',
                    squad: role.squad || '',
                    burst_stage: role.use_burst_skill || '',
                    weapon_detail: role.shot_detail || {},
                    raw: role,
                };
                successCount++;
            } catch (err) {
                // skip if roledata does not exist
            }
        });

        const outPath = path.join(ROOT, 'scraper', 'nikke_scraped.json');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[Scraper] 수집 완료! 총 ${successCount}명 저장 완료 (${elapsed}초 소요) -> ${outPath}`);
    } catch (err) {
        console.error('[Scraper] 오류 발생:', err);
    }
}

main();
