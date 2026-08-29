/**
 * csvProfileSync.ts
 * context/니케정보_.csv 형식의 CSV 데이터를 파싱하여 로컬 스토리지에
 * 모든 니케의 육성 정보(돌파, 코강, 호감도, 스킬, 소장품, 큐브, 오버로드 옵션)와
 * 전초기지 콘솔 레벨을 일괄 저장하는 모듈.
 */

import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';
import {
    SavedOutpostState,
    SavedCharState,
    saveCharSettings,
    saveOutpostState,
    saveGlobalCubeLevel,
} from './storageUtils';

export interface CsvSyncResult {
    success: boolean;
    syncedCount: number;
    outpost: SavedOutpostState;
    warnings: string[];
    error?: string;
}

// 큐브 이름 한국어/약칭 -> 큐브 ID 매핑
const CUBE_NAME_MAP: Record<string, string> = {
    '어썰트': '01-cube-assault',
    '어썰트 큐브': '01-cube-assault',
    '택티컬 어설트': '02-cube-onslaught',
    '택티컬 어설트 큐브': '02-cube-onslaught',
    '택티컬어설트': '02-cube-onslaught',
    '렐릭 베어': '03-cube-resilience',
    '렐릭 베어 큐브': '03-cube-resilience',
    '렐릭베어': '03-cube-resilience',
    '택티컬 베어': '04-cube-bastion',
    '택티컬 베어 큐브': '04-cube-bastion',
    '택티컬베어': '04-cube-bastion',
    '렐릭 부스트': '05-cube-adjutant',
    '렐릭 부스트 큐브': '05-cube-adjutant',
    '렐릭부스트': '05-cube-adjutant',
    '택티컬 부스트': '06-cube-wingman',
    '택티컬 부스트 큐브': '06-cube-wingman',
    '택티컬부스트': '06-cube-wingman',
    '렐릭 퀀텀': '07-cube-quantum',
    '렐릭 퀀텀 큐브': '07-cube-quantum',
    '렐릭퀀텀': '07-cube-quantum',
    '렐릭 비고르': '08-cube-vigor',
    '렐릭 비고르 큐브': '08-cube-vigor',
    '렐릭비고르': '08-cube-vigor',
    '렐릭 인듀어': '09-cube-endurance',
    '렐릭 인듀어 큐브': '09-cube-endurance',
    '렐릭 힐링': '10-cube-healing',
    '렐릭 힐링 큐브': '10-cube-healing',
    '렐릭 템퍼링': '11-cube-tempering',
    '렐릭 템퍼링 큐브': '11-cube-tempering',
    '택티컬 템퍼링': '11-cube-tempering',
    '택티컬 템퍼링 큐브': '11-cube-tempering',
    '렐릭 어시스터': '12-cube-assist',
    '렐릭 어시스터 큐브': '12-cube-assist',
    '렐릭 어시스트': '12-cube-assist',
    '렐릭 어시스트 큐브': '12-cube-assist',
    '렐릭 디스트로이': '13-cube-destruction',
    '렐릭 디스트로이 큐브': '13-cube-destruction',
    '렐릭디스트로이': '13-cube-destruction',
    '렐릭 피어싱': '14-cube-piercing',
    '렐릭 피어싱 큐브': '14-cube-piercing',
    '렐릭 피어스': '14-cube-piercing',
    '렐릭 피어스 큐브': '14-cube-piercing',
    '렐릭 크래시': '15-cube-crash',
    '렐릭 크래시 큐브': '15-cube-crash',
    '렐릭 크래쉬': '15-cube-crash',
    '렐릭 크래쉬 큐브': '15-cube-crash',
    '렐릭 디바이드': '16-cube-divide',
    '렐릭 디바이드 큐브': '16-cube-divide',
};

// 소장품/애장품 문자열 파싱
function parseCollection(raw: string): { grade: CollectionGrade; level: string } {
    if (!raw) return { grade: 'none', level: '0' };
    const trimmed = raw.trim();

    if (trimmed.includes('애장품')) {
        if (trimmed.includes('★★★') || trimmed.includes('3단계')) {
            return { grade: 'favorite_phase3', level: '15' };
        }
        if (trimmed.includes('★★') || trimmed.includes('2단계')) {
            return { grade: 'favorite_phase2', level: '15' };
        }
        return { grade: 'favorite_phase1', level: '15' };
    }

    if (trimmed.startsWith('SR')) {
        const parts = trimmed.split(/\s+/);
        const lvl = parts[1] || '0';
        return { grade: 'SR', level: lvl };
    }

    if (trimmed.startsWith('R')) {
        const parts = trimmed.split(/\s+/);
        const lvl = parts[1] || '0';
        return { grade: 'R', level: lvl };
    }

    return { grade: 'none', level: '0' };
}

// 텍스트 정규화 (공백, 콜론, 특수문자 제거)
function normalizeStr(s: string): string {
    return (s || '').replace(/\s+/g, '').replace(/:/g, '').replace(/\(.*?\)/g, '').toLowerCase();
}

// 기업명 정규화
function normalizeCompany(c: string): string {
    if (!c) return '';
    const map: Record<string, string> = {
        '엘리시온': 'elysion',
        '미실리스': 'missilis',
        '테트라': 'tetra',
        '필그림': 'pilgrim',
        '어브노멀': 'abnormal',
    };
    return map[c] || c.toLowerCase();
}

// 장비 티어 변환
function parseEquipTier(tierStr: string): string {
    if (tierStr === '10') return 'Overload';
    if (tierStr === '9') return 'T9';
    return 'none';
}

/**
 * CSV 행 분리 및 RFC 4180 안전 파서
 */
function parseCsvRows(csvText: string): string[][] {
    const rows: string[][] = [];
    const lines = csvText.split(/\r?\n/);

    for (const line of lines) {
        if (!line.trim()) continue;

        const row: string[] = [];
        let inQuotes = false;
        let current = '';

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                row.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += ch;
            }
        }
        row.push(current.trim().replace(/^"|"$/g, ''));
        rows.push(row);
    }

    return rows;
}

/**
 * CSV 파일 텍스트를 파싱하여 니케 육성 데이터 및 전초기지 레벨을 로컬 스토리지에 동기화
 */
export function parseAndSyncProfileCsv(csvText: string): CsvSyncResult {
    const warnings: string[] = [];
    const rows = parseCsvRows(csvText);

    if (rows.length < 2) {
        return {
            success: false,
            syncedCount: 0,
            outpost: {
                synchroLevel: '1',
                commonResearchLevel: '0',
                elysionConsole: '0',
                missilisConsole: '0',
                tetraConsole: '0',
                pilgrimConsole: '0',
                abnormalConsole: '0',
                attackerConsole: '0',
                defenderConsole: '0',
                supporterConsole: '0',
            },
            warnings: [],
            error: 'CSV 파일에 데이터가 없습니다.',
        };
    }

    const headers = rows[0];
    const headerIndexMap: Record<string, number> = {};
    headers.forEach((h, idx) => {
        headerIndexMap[h.trim()] = idx;
    });

    // 필수 헤더 체크
    const required = ['이름', '돌파', '코강', '호감도', '스킬1', '스킬2', '버스트스킬'];
    for (const req of required) {
        if (headerIndexMap[req] === undefined) {
            return {
                success: false,
                syncedCount: 0,
                outpost: {
                    synchroLevel: '1',
                    commonResearchLevel: '0',
                    elysionConsole: '0',
                    missilisConsole: '0',
                    tetraConsole: '0',
                    pilgrimConsole: '0',
                    abnormalConsole: '0',
                    attackerConsole: '0',
                    defenderConsole: '0',
                    supporterConsole: '0',
                },
                warnings: [],
                error: `CSV 파일에 필수 컬럼 "${req}" 이(가) 누락되었습니다.`,
            };
        }
    }

    const getVal = (row: string[], colName: string): string => {
        const idx = headerIndexMap[colName];
        return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
    };

    let syncedCount = 0;

    let outpostState: SavedOutpostState = {
        synchroLevel: '1',
        commonResearchLevel: '0',
        elysionConsole: '0',
        missilisConsole: '0',
        tetraConsole: '0',
        pilgrimConsole: '0',
        abnormalConsole: '0',
        attackerConsole: '0',
        defenderConsole: '0',
        supporterConsole: '0',
    };

    // 캐릭터 JSON 리스트 준비
    const charList = characterOptions.map(opt => ({
        id: opt.data?.characterID,
        name: opt.data?.characterName || opt.label,
        company: opt.data?.stats?.company,
        rarity: opt.data?.stats?.rarity,
        weapon: opt.data?.stats?.weapon,
        element: opt.data?.stats?.element,
        burst: opt.data?.stats?.burstLevel,
        class: opt.data?.stats?.class,
        opt: opt,
    }));

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const csvName = getVal(row, '이름');
        if (!csvName) continue;

        const csvCompany = getVal(row, '기업');
        const csvWeapon = getVal(row, '무기');
        const csvElement = getVal(row, '속성');
        const csvClass = getVal(row, '클래스');

        // 캐릭터 매칭 로직 (기업/등급/속성/무기 판별)
        let matchedChar = null;

        // 1단계: characterName 일치 + 기업 일치
        let cand = charList.filter(c => c.name === csvName && normalizeCompany(c.company) === normalizeCompany(csvCompany));
        if (cand.length === 1) {
            matchedChar = cand[0];
        } else {
            // 2단계: 정규화 이름 일치 + 기업 일치
            const normCsv = normalizeStr(csvName);
            cand = charList.filter(c => normalizeStr(c.name) === normCsv && normalizeCompany(c.company) === normalizeCompany(csvCompany));
            if (cand.length === 1) {
                matchedChar = cand[0];
            } else {
                // 3단계: 기업 + 무기 + 클래스 + 속성 일치
                cand = charList.filter(c =>
                    normalizeCompany(c.company) === normalizeCompany(csvCompany) &&
                    c.weapon === csvWeapon &&
                    c.element === csvElement &&
                    (normalizeStr(c.name).includes(normCsv) || normCsv.includes(normalizeStr(c.name)))
                );
                if (cand.length === 1) {
                    matchedChar = cand[0];
                }
            }
        }

        if (!matchedChar || !matchedChar.id) {
            warnings.push(`[미인식 캐릭터] "${csvName}" (${csvCompany}/${csvElement}/${csvWeapon})`);
            continue;
        }

        // 성장 단계(growthStage) 계산
        const limitBreak = parseInt(getVal(row, '돌파'), 10) || 0;
        const coreLevel = parseInt(getVal(row, '코강'), 10) || 0;
        let growthStage = '0';
        if (matchedChar.rarity === 'SSR') {
            if (limitBreak >= 3) {
                growthStage = String(3 + Math.min(7, Math.max(0, coreLevel)));
            } else {
                growthStage = String(limitBreak);
            }
        } else if (matchedChar.rarity === 'SR') {
            growthStage = String(Math.min(2, Math.max(0, limitBreak)));
        } else {
            growthStage = '0';
        }

        // 호감도
        const affinityLevel = getVal(row, '호감도') || '10';

        // 스킬 레벨
        const skill1Level = Math.min(10, Math.max(1, parseInt(getVal(row, '스킬1'), 10) || 1));
        const skill2Level = Math.min(10, Math.max(1, parseInt(getVal(row, '스킬2'), 10) || 1));
        const burstLevel = Math.min(10, Math.max(1, parseInt(getVal(row, '버스트스킬'), 10) || 1));

        // 소장품 / 애장품
        const collectionRaw = getVal(row, '소장품');
        const collection = parseCollection(collectionRaw);

        // 큐브 (기본값: 03-cube-resilience 렐릭 베어)
        const cubeRaw = getVal(row, '큐브');
        const parsedCubeName = CUBE_NAME_MAP[cubeRaw];
        const cubeName = parsedCubeName || '03-cube-resilience';
        const cubeLevel = getVal(row, '큐브_레벨') || (parsedCubeName ? '1' : '0');

        if (parsedCubeName && cubeLevel) {
            saveGlobalCubeLevel(parsedCubeName, cubeLevel);
        }

        // 장비 티어 & 강화
        const equipTierHead = parseEquipTier(getVal(row, '머리_티어'));
        const equipUpgradeHead = getVal(row, '머리_레벨') || '0';

        const equipTierTorso = parseEquipTier(getVal(row, '몸통_티어'));
        const equipUpgradeTorso = getVal(row, '몸통_레벨') || '0';

        const equipTierArms = parseEquipTier(getVal(row, '장갑_티어'));
        const equipUpgradeArms = getVal(row, '장갑_레벨') || '0';

        const equipTierLegs = parseEquipTier(getVal(row, '다리_티어'));
        const equipUpgradeLegs = getVal(row, '다리_레벨') || '0';

        // 오버로드 9개 옵션 퍼센트 합산
        const equipWeakPoint = getVal(row, '우코(%)') || '0.00';
        const equipATK = getVal(row, '공증(%)') || '0.00';
        const equipAmmo = getVal(row, '장탄(%)') || '0.00';
        const equipCritRate = getVal(row, '크확(%)') || '0.00';
        const equipCritDmg = getVal(row, '크댐(%)') || '0.00';
        const equipAccuracy = getVal(row, '명중(%)') || '0.00';
        const equipChargeDmg = getVal(row, '차댐(%)') || '0.00';
        const equipChargeSpeed = getVal(row, '차속(%)') || '0.00';
        const equipDef = getVal(row, '방어(%)') || '0.00';

        const charState: SavedCharState = {
            customHP: '',
            customATK: '',
            customDEF: '',
            collectionGrade: collection.grade,
            collectionLevel: collection.level,
            cubeName: cubeName,
            cubeLevel: cubeLevel,
            affinityLevel: affinityLevel,
            growthStage: growthStage,
            limitBreak: String(limitBreak),
            owned: true,
            equipTierHead: equipTierHead,
            equipUpgradeHead: equipUpgradeHead,
            equipTierTorso: equipTierTorso,
            equipUpgradeTorso: equipUpgradeTorso,
            equipTierArms: equipTierArms,
            equipUpgradeArms: equipUpgradeArms,
            equipTierLegs: equipTierLegs,
            equipUpgradeLegs: equipUpgradeLegs,
            equipATK: equipATK,
            equipWeakPoint: equipWeakPoint,
            equipAmmo: equipAmmo,
            equipAccuracy: equipAccuracy,
            equipChargeDmg: equipChargeDmg,
            equipChargeSpeed: equipChargeSpeed,
            equipCritRate: equipCritRate,
            equipCritDmg: equipCritDmg,
            equipDef: equipDef,
            skill1Level: skill1Level,
            skill2Level: skill2Level,
            burstLevel: burstLevel,
        };

        saveCharSettings(matchedChar.id, charState);
        syncedCount++;

        // 전초기지 콘솔 레벨 파싱 (공통 행 값 읽기)
        if (r === 1 || !outpostState.commonResearchLevel || outpostState.commonResearchLevel === '0') {
            outpostState = {
                synchroLevel: outpostState.synchroLevel || '1',
                commonResearchLevel: getVal(row, '콘솔_공용') || '0',
                attackerConsole: getVal(row, '콘솔_화력형') || '0',
                defenderConsole: getVal(row, '콘솔_방어형') || '0',
                supporterConsole: getVal(row, '콘솔_지원형') || '0',
                elysionConsole: getVal(row, '콘솔_엘리시온') || '0',
                missilisConsole: getVal(row, '콘솔_미실리스') || '0',
                tetraConsole: getVal(row, '콘솔_테트라') || '0',
                pilgrimConsole: getVal(row, '콘솔_필그림') || '0',
                abnormalConsole: getVal(row, '콘솔_어브노멀') || '0',
            };
        }
    }

    // 전초기지 저장
    saveOutpostState(outpostState);

    return {
        success: true,
        syncedCount,
        outpost: outpostState,
        warnings,
    };
}
