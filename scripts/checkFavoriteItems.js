import fs from 'fs';
import crypto from 'crypto';

const CDN_BASE = 'https://sg-tools-cdn.blablalink.com';
const LARGE_PRIMES = [224737, 1000639, 2654435761, 2654435769, 1000621, 4294967291];

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

async function fetchJson(relPath) {
    const url = `${CDN_BASE}/${obfuscatePath(relPath)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${relPath}`);
    return res.json();
}

async function main() {
    console.log('[FavoriteItems] 목단 (Moran - FID 201701) 애장품 상세...');
    const fav = await fetchJson('/equip/ko/favorite_201701.json');
    console.log('아이템명:', fav.name_localkey);
    console.log('icon_resource_id:', fav.icon_resource_id);

    const stages = fav.favoriteitem_skill_group_data || [];
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const info = stage.info || stage;
        console.log(`\n=== 단계 ${i + 1} (교체 슬롯: ${stage.skill_change_slot}) ===`);
        console.log('스킬명:', info.name_localkey);
        console.log('설명:', info.description_localkey);
        console.log('수치 목록:', JSON.stringify(info.description_value_list, null, 2));
    }
}

main();
