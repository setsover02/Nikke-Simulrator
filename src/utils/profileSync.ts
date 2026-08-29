/**
 * profileSync.ts
 * blablalink API를 통해 사용자의 실제 계정 육성 데이터(돌파, 호감도, 스킬, 소장품/애장품, 오버로드 장비, 전초기지 콘솔)를
 * 받아와 시뮬레이터 로컬 스토리지에 동기화하는 모듈.
 */

import { characterOptions } from '../constants/characters';
import { CollectionGrade } from '../constants/collectionItems';
import { SavedOutpostState, saveCharSettings, saveOutpostState, saveGlobalCubeLevel } from './storageUtils';

// 매핑 데이터 JSON import
import parsedNikke from '../data/parsed_nikke.json';
import scrapedNikke from './scraper/nikke_scraped.json';
import cubeTable from '../data/cube.json';
import equipSkillTable from '../data/equipment_skills.json';

const API_BASE = '/api/blablalink/api/game/proxy/';
const COMMON_PARAMS = {
    game_id: '29080',
    area_id: 'global',
    source: 'pc_web',
    intl_game_id: '29080',
    language: 'ko',
    env: 'prod',
};

// 오버로드 옵션 function_type 매핑
const FUNC_TO_EQUIP: Record<string, string> = {
    StatAtk: 'equipATK',
    IncElementDmg: 'equipWeakPoint',
    StatAmmoLoad: 'equipAmmo',
    StatCritical: 'equipCritRate',
    StatCriticalDamage: 'equipCritDmg',
    StatChargeTime: 'equipChargeSpeed',
    StatChargeDamage: 'equipChargeDmg',
    StatAccuracyCircle: 'equipAccuracy',
    IncHurtDef: 'equipDef',
    StatDef: 'equipDef',
};

// 콘솔 TID 매핑
const CONSOLE_TIDS: Record<number, keyof SavedOutpostState> = {
    1001: 'commonResearchLevel',
    1101: 'attackerConsole',
    1102: 'defenderConsole',
    1103: 'supporterConsole',
    1201: 'elysionConsole',
    1202: 'missilisConsole',
    1203: 'tetraConsole',
    1204: 'pilgrimConsole',
    1205: 'abnormalConsole',
};

export interface SyncProgressCallback {
    (step: string, current: number, total: number): void;
}

export interface SyncedProfileResult {
    success: boolean;
    syncedCount: number;
    synchroLevel: number;
    consoleSummary: Partial<SavedOutpostState>;
    warnings: string[];
    error?: string;
}

const SESSION_COOKIE_KEY = 'nikke_blablalink_session_cookie';

export function getSavedSessionCookie(): string | null {
    try {
        return localStorage.getItem(SESSION_COOKIE_KEY);
    } catch (e) {
        return null;
    }
}

export function saveSessionCookie(cookie: string): void {
    try {
        localStorage.setItem(SESSION_COOKIE_KEY, cookie.trim());
    } catch (e) { }
}

export function clearSessionCookie(): void {
    try {
        localStorage.removeItem(SESSION_COOKIE_KEY);
    } catch (e) { }
}

export interface ParsedBlablaInput {
    type: 'url' | 'cookie' | 'openid' | 'unknown';
    targetOpenId: string | null;
    gameId: string | null;
    cookie: string | null;
}

/**
 * URL, 쿠키, 또는 Base64 openid 입력을 자동 분석하여 openid와 세션 쿠키를 분리 추출
 */
export function parseBlablalinkInput(input: string): ParsedBlablaInput {
    const trimmed = input.trim();
    if (!trimmed) {
        return { type: 'unknown', targetOpenId: null, gameId: null, cookie: null };
    }

    // 1. 쿠키 문자열인지 검사 (game_token= 또는 game_openid= 포함)
    if (trimmed.includes('game_token=') || trimmed.includes('game_openid=')) {
        const openid = extractOpenIdFromCookie(trimmed);
        return {
            type: 'cookie',
            targetOpenId: openid,
            gameId: '29080',
            cookie: trimmed,
        };
    }

    // 2. shiftyspad URL인지 검사
    let rawOpenIdParam: string | null = null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            rawOpenIdParam = url.searchParams.get('openid');
        } catch (e) {
            const match = trimmed.match(/[?&]openid=([^&#]+)/);
            if (match) rawOpenIdParam = decodeURIComponent(match[1]);
        }
    } else if (trimmed.includes('=')) {
        // Base64 문자열 직접 입력 (예: MjkwODAtMTA2Nzk1NjkzODM2MTUyODMyMA==)
        rawOpenIdParam = trimmed;
    }

    if (rawOpenIdParam) {
        try {
            const decoded = atob(rawOpenIdParam); // 예: "29080-1067956938361528320"
            const parts = decoded.split('-');
            if (parts.length >= 2) {
                return {
                    type: 'url',
                    gameId: parts[0],
                    targetOpenId: parts[1],
                    cookie: getSavedSessionCookie(),
                };
            }
        } catch (e) {
            console.warn('Failed to decode base64 openid', e);
        }
    }

    // 3. 숫자 형태의 순수 openid인지 검사
    if (/^\d{15,25}$/.test(trimmed)) {
        return {
            type: 'openid',
            gameId: '29080',
            targetOpenId: trimmed,
            cookie: getSavedSessionCookie(),
        };
    }

    return {
        type: 'unknown',
        targetOpenId: null,
        gameId: null,
        cookie: getSavedSessionCookie(),
    };
}

/**
 * 북마클릿(Bookmarklet) 코드 생성
 * 사용자가 blablalink.com 페이지에서 실행 시 쿠키 및 로컬 세션을 수집하여 시뮬레이터로 전달
 */
export function generateBookmarkletCode(simOrigin: string): string {
    const rawScript = `(function(){
  try {
    var c = document.cookie || '';
    var items = [];
    if (c) items.push(c);
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      var v = localStorage.getItem(k);
      if (k && v && (k.indexOf('token') >= 0 || k.indexOf('openid') >= 0 || k.indexOf('game') >= 0 || k.indexOf('user') >= 0)) {
        items.push(k + '=' + encodeURIComponent(v));
      }
    }
    var cookieStr = items.join('; ');
    if (!cookieStr || (cookieStr.indexOf('game_token') < 0 && cookieStr.indexOf('token') < 0 && cookieStr.indexOf('game_openid') < 0)) {
      alert('⚠️ blablalink.com 에 먼저 로그인하고 게임 계정을 연동한 후 눌러주세요!');
      return;
    }

    var targetUrl = '${simOrigin}/?blabla_sync=' + encodeURIComponent(cookieStr);

    var existing = document.getElementById('nikke-sim-sync-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'nikke-sim-sync-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.82);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:Wanted Sans,system-ui,sans-serif;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#141624;border:2px solid #7c3aed;border-radius:12px;padding:24px 28px;max-width:420px;text-align:center;color:#f8fafc;box-shadow:0 12px 36px rgba(0,0,0,0.9);';
    box.innerHTML = '<h3 style=\"margin:0 0 10px;color:#c084fc;font-size:18px;font-weight:bold;\">🎉 세션 추출 성공!</h3>'
      + '<p style=\"margin:0 0 20px;font-size:13px;color:#94a3b8;line-height:1.5;\">blablalink 계정 세션을 성공적으로 읽어왔습니다.<br>아래 버튼을 누르면 시뮬레이터로 자동 전송됩니다.</p>'
      + '<div style=\"display:flex;gap:10px;\">'
      + '<button id=\"nikke-sync-now-btn\" style=\"flex:1;background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:bold;cursor:pointer;\">🚀 시뮬레이터로 전송</button>'
      + '<button id=\"nikke-sync-close-btn\" style=\"background:#334155;color:#cbd5e1;border:none;border-radius:8px;padding:12px 16px;font-size:13px;cursor:pointer;\">닫기</button>'
      + '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('nikke-sync-now-btn').onclick = function() {
      window.location.href = targetUrl;
    };
    document.getElementById('nikke-sync-close-btn').onclick = function() {
      overlay.remove();
    };
  } catch(err) {
    alert('❌ 오류 발생: ' + err.message);
  }
})();`;

    return 'javascript:' + encodeURIComponent(rawScript.replace(/\n\s*/g, ' '));
}

/**
 * 앱 로드 시 URL에 ?blabla_sync=... 파라미터가 있는지 검사하여 자동 동기화 수행
 */
export async function checkAndProcessUrlSync(
    onProgress?: SyncProgressCallback
): Promise<SyncedProfileResult | null> {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    const syncPayload = params.get('blabla_sync');

    if (!syncPayload) return null;

    try {
        const cookieStr = decodeURIComponent(syncPayload);
        const result = await syncBlablalinkProfile(cookieStr, onProgress);

        // URL 파라미터 정리
        const url = new URL(window.location.href);
        url.searchParams.delete('blabla_sync');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));

        return result;
    } catch (e: any) {
        return {
            success: false,
            syncedCount: 0,
            synchroLevel: 1,
            consoleSummary: {},
            warnings: [],
            error: e.message || '북마클릿 동기화 실패',
        };
    }
}

/**
 * 쿠키 문자열에서 openid 추출
 */
export function extractOpenIdFromCookie(cookie: string): string | null {
    const parts = cookie.split(';');
    for (const part of parts) {
        const [k, v] = part.trim().split('=');
        if (k === 'game_openid') return v;
    }
    return null;
}

/**
 * blablalink API POST 요청
 */
async function postApi(route: string, body: any, cookie: string): Promise<any> {
    const res = await fetch(API_BASE + route, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Channel-Type': '2',
            'X-Language': 'ko',
            'X-Common-Params': JSON.stringify(COMMON_PARAMS),
            Cookie: cookie,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.code !== 0) {
        if (json.code === 300001) {
            throw new Error('로그인 세션이 만료되었거나 유효하지 않습니다 (game not login). 최신 세션 쿠키를 등록해주세요.');
        }
        throw new Error(json.msg || `API Error (code ${json.code})`);
    }

    return json.data;
}

/**
 * CDN character_id_map 가져오기
 */
async function fetchCdnIdMap(): Promise<Record<number, number>> {
    try {
        const res = await fetch('/cdn/blablalink/character/character_id_map.json');
        if (res.ok) {
            const list = await res.json();
            const map: Record<number, number> = {};
            for (const row of list) {
                map[row.name_code] = row.resource_id;
            }
            return map;
        }
    } catch (e) {
        console.warn('CDN character_id_map 로드 실패, 로컬 데이터 기반 매핑 사용', e);
    }
    return {};
}

/**
 * resource_id -> 캐릭터 파일명(value) / 캐릭터명 매핑 사전 구축
 */
function buildResourceToCharMap(cdnIdMap: Record<number, number>) {
    const resMap: Record<number, string> = {};
    const nameToCharIdMap: Record<string, string> = {};

    // scrapedNikke에서 resource_id -> 이름
    for (const [name, data] of Object.entries(scrapedNikke as any)) {
        if (data && typeof data === 'object' && 'id' in data) {
            resMap[(data as any).id] = name;
        }
    }

    // characterOptions에서 이름 -> characterID
    for (const opt of characterOptions) {
        if (opt.data?.characterID) {
            nameToCharIdMap[opt.label] = opt.data.characterID;
        }
    }

    return { resMap, nameToCharIdMap };
}

export async function syncBlablalinkProfile(
    input: string,
    onProgress?: SyncProgressCallback
): Promise<SyncedProfileResult> {
    const warnings: string[] = [];
    const parsed = parseBlablalinkInput(input);

    if (parsed.cookie) {
        saveSessionCookie(parsed.cookie);
    }

    const effectiveCookie = parsed.cookie || getSavedSessionCookie();
    const effectiveOpenId = parsed.targetOpenId || (effectiveCookie ? extractOpenIdFromCookie(effectiveCookie) : null);

    if (!effectiveCookie) {
        return {
            success: false,
            syncedCount: 0,
            synchroLevel: 1,
            consoleSummary: {},
            warnings: [],
            error: parsed.targetOpenId
                ? `URL에서 OpenID(${parsed.targetOpenId})를 감지했으나, blablalink API 조회를 위한 인증 세션이 등록되지 않았습니다. 최초 1회 본인 계정의 세션 쿠키를 등록해주세요.`
                : '세션 쿠키 또는 유효한 blablalink 프로필 URL을 입력해주세요.',
        };
    }

    if (!effectiveOpenId) {
        return {
            success: false,
            syncedCount: 0,
            synchroLevel: 1,
            consoleSummary: {},
            warnings: [],
            error: 'OpenID를 감지할 수 없습니다. 올바른 blablalink URL 또는 game_openid 가 포함된 쿠키를 입력해주세요.',
        };
    }

    try {
        onProgress?.('ID 매핑 데이터 로드 중...', 0, 100);
        const cdnIdMap = await fetchCdnIdMap();
        const { resMap, nameToCharIdMap } = buildResourceToCharMap(cdnIdMap);

        // 1. 캐릭터 목록 조회
        onProgress?.(`캐릭터 로스터 조회 중 (OpenID: ${effectiveOpenId})...`, 10, 100);
        const charsData = await postApi('Game/GetUserCharacters', {
            intl_open_id: effectiveOpenId,
            nikke_area_id: '83', // 기본 83 (글로벌/한국 공통)
        }, effectiveCookie);

        const rawList = charsData.character_info_list || [];
        if (rawList.length === 0) {
            return {
                success: false,
                syncedCount: 0,
                synchroLevel: 1,
                consoleSummary: {},
                warnings: [],
                error: '보유한 캐릭터 목록을 가져오지 못했습니다.',
            };
        }

        // 2. 캐릭터 상세 정보 (스킬, 장비, 소장품) 조회 (50개씩 청크)
        const nameCodes = rawList.map((c: any) => c.name_code);
        const CHUNK_SIZE = 50;
        const detailsMap: Record<number, any> = {};
        const stateEffectsMap: Record<number, { key: string; val: number }> = {};

        for (let i = 0; i < nameCodes.length; i += CHUNK_SIZE) {
            const chunk = nameCodes.slice(i, i + CHUNK_SIZE);
            onProgress?.(`캐릭터 상세 정보 조회 중 (${i + 1}/${nameCodes.length})...`, 20 + Math.floor((i / nameCodes.length) * 50), 100);

            const detailsData = await postApi('Game/GetUserCharacterDetails', {
                intl_open_id: effectiveOpenId,
                nikke_area_id: '83',
                name_codes: chunk,
            }, effectiveCookie);

            for (const eff of detailsData.state_effects || []) {
                const fd = eff.function_details?.[0];
                if (fd) {
                    const mappedKey = FUNC_TO_EQUIP[fd.function_type];
                    if (mappedKey) {
                        stateEffectsMap[eff.id] = {
                            key: mappedKey,
                            val: Math.abs(fd.function_value) / 100.0,
                        };
                    }
                }
            }

            for (const d of detailsData.details || []) {
                detailsMap[d.name_code] = d;
            }
        }

        // 3. 전초기지 및 콘솔 조회
        onProgress?.('전초기지 콘솔 및 동기화 레벨 조회 중...', 75, 100);
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

        try {
            const outpostData = await postApi('Game/GetUserProfileOutpostInfo', {
                intl_open_id: effectiveOpenId,
                nikke_area_id: '83',
            }, effectiveCookie);

            if (outpostData) {
                outpostState.synchroLevel = String(outpostData.synchro_level || 1);
                for (const res of outpostData.recycle_room_researches || []) {
                    const key = CONSOLE_TIDS[res.tid];
                    if (key) {
                        outpostState[key] = String(res.level || 0);
                    }
                }
                saveOutpostState(outpostState);
            }
        } catch (e: any) {
            warnings.push(`전초기지 콘솔 조회 실패: ${e.message}`);
        }

        // 4. 캐릭터별 데이터 변환 및 로컬 스토리지 저장
        onProgress?.('프로필 데이터 변환 및 저장 중...', 90, 100);
        let syncedCount = 0;

        for (const rawChar of rawList) {
            const resId = cdnIdMap[rawChar.name_code] || rawChar.name_code;
            const charName = resMap[resId] || resMap[rawChar.name_code];
            if (!charName) continue;

            const charId = nameToCharIdMap[charName];
            if (!charId) continue;

            const detail = detailsMap[rawChar.name_code] || {};

            // 성장 단계 (0=명함, 1~3=돌파, 4~10=코강)
            const grade = rawChar.grade || 0; // 돌파 (0~3)
            const core = rawChar.core || 0;   // 코강 (0~7)
            const growthStage = String(core > 0 ? 3 + core : grade);

            // 호감도
            const affinityLevel = String(Math.max(1, detail.attractive_level || 1));

            // 스킬 레벨
            const skill1Level = detail.skill_1_lv || 10;
            const skill2Level = detail.skill_2_lv || 10;
            const burstLevel = detail.skill_3_lv || detail.burst_lv || 10;

            // 장비 티어 및 강화 (머리, 몸통, 팔, 다리)
            const parseEquip = (p: string) => {
                const tier = detail[`${p}_equip_tier`] || 0;
                const lv = detail[`${p}_equip_lv`] || 0;
                if (tier >= 10) return { tier: 'Overload', upgrade: String(lv) };
                if (tier === 9) return { tier: 'T9', upgrade: String(lv) };
                if (tier >= 1) return { tier: `T${tier}`, upgrade: String(lv) };
                return { tier: 'none', upgrade: '0' };
            };

            const head = parseEquip('head');
            const torso = parseEquip('torso');
            const arm = parseEquip('arm');
            const leg = parseEquip('leg');

            // 오버로드 옵션 합산
            const equipStats: Record<string, number> = {
                equipATK: 0,
                equipWeakPoint: 0,
                equipAmmo: 0,
                equipCritRate: 0,
                equipCritDmg: 0,
                equipChargeSpeed: 0,
                equipChargeDmg: 0,
                equipAccuracy: 0,
                equipDef: 0,
            };

            const optionSlots = [
                detail.head_equip_opt_id_1, detail.head_equip_opt_id_2, detail.head_equip_opt_id_3,
                detail.torso_equip_opt_id_1, detail.torso_equip_opt_id_2, detail.torso_equip_opt_id_3,
                detail.arm_equip_opt_id_1, detail.arm_equip_opt_id_2, detail.arm_equip_opt_id_3,
                detail.leg_equip_opt_id_1, detail.leg_equip_opt_id_2, detail.leg_equip_opt_id_3,
            ];

            for (const optId of optionSlots) {
                if (optId && stateEffectsMap[optId]) {
                    const { key, val } = stateEffectsMap[optId];
                    if (equipStats[key] !== undefined) {
                        equipStats[key] += val;
                    }
                }
            }

            // 소장품 / 애장품
            let collectionGrade: CollectionGrade = 'None';
            let collectionLevel = '0';
            if (detail.favorite_item_tid) {
                // tid와 레벨로부터 등급 판정
                const favLv = detail.favorite_item_lv || 0;
                const isSSR = (parsedNikke as any)[charName]?.favorite_slots;
                if (isSSR && favLv >= 2) {
                    collectionGrade = 'SSR';
                    collectionLevel = String(favLv + 1); // 애장품 1~3단계
                } else if (favLv > 0 || detail.favorite_item_exp > 0) {
                    collectionGrade = 'SR';
                    collectionLevel = String(Math.min(15, favLv || 15));
                } else {
                    collectionGrade = 'R';
                    collectionLevel = '15';
                }
            }

            // 큐브
            let cubeName = 'None';
            let cubeLevel = '0';
            if (detail.cube_item_tid) {
                const cId = detail.cube_item_tid;
                cubeName = (cubeTable as any)[cId] || 'None';
                cubeLevel = String(detail.cube_item_lv || 0);
                if (cubeName !== 'None') {
                    saveGlobalCubeLevel(cubeName, cubeLevel);
                }
            }

            // 저장용 캐릭터 상태 생성 및 저장
            saveCharSettings(charId, {
                owned: true,
                growthStage,
                affinityLevel,
                skill1Level,
                skill2Level,
                burstLevel,
                collectionGrade,
                collectionLevel,
                cubeName,
                cubeLevel,
                equipTierHead: head.tier,
                equipUpgradeHead: head.upgrade,
                equipTierTorso: torso.tier,
                equipUpgradeTorso: torso.upgrade,
                equipTierArms: arm.tier,
                equipUpgradeArms: arm.upgrade,
                equipTierLegs: leg.tier,
                equipUpgradeLegs: leg.upgrade,
                equipATK: equipStats.equipATK > 0 ? equipStats.equipATK.toFixed(2) : '0',
                equipWeakPoint: equipStats.equipWeakPoint > 0 ? equipStats.equipWeakPoint.toFixed(2) : '0',
                equipAmmo: equipStats.equipAmmo > 0 ? equipStats.equipAmmo.toFixed(2) : '0',
                equipAccuracy: equipStats.equipAccuracy > 0 ? equipStats.equipAccuracy.toFixed(2) : '0',
                equipChargeDmg: equipStats.equipChargeDmg > 0 ? equipStats.equipChargeDmg.toFixed(2) : '0',
                equipChargeSpeed: equipStats.equipChargeSpeed > 0 ? equipStats.equipChargeSpeed.toFixed(2) : '0',
                equipCritRate: equipStats.equipCritRate > 0 ? equipStats.equipCritRate.toFixed(2) : '0',
                equipCritDmg: equipStats.equipCritDmg > 0 ? equipStats.equipCritDmg.toFixed(2) : '0',
                equipDef: equipStats.equipDef > 0 ? equipStats.equipDef.toFixed(2) : '0',
                customHP: '',
                customATK: '',
                customDEF: '',
            });

            syncedCount++;
        }

        onProgress?.('동기화 완료!', 100, 100);

        return {
            success: true,
            syncedCount,
            synchroLevel: parseInt(outpostState.synchroLevel, 10) || 1,
            consoleSummary: outpostState,
            warnings,
        };
    } catch (e: any) {
        return {
            success: false,
            syncedCount: 0,
            synchroLevel: 1,
            consoleSummary: {},
            warnings,
            error: e.message || '프로필 동기화 중 오류가 발생했습니다.',
        };
    }
}

/**
 * profiles/me.json 파일로부터 직접 프로필을 가져와 로컬 스토리지에 동기화
 */
export function importProfileFromJson(jsonObj: any): { success: boolean; syncedCount: number; error?: string } {
    try {
        if (!jsonObj || typeof jsonObj !== 'object') {
            return { success: false, syncedCount: 0, error: '올바른 JSON 프로필 형식이 아닙니다.' };
        }

        const characters = jsonObj.characters || jsonObj;
        let count = 0;

        for (const opt of characterOptions) {
            const charData = characters[opt.label] || characters[opt.value];
            const charId = opt.data?.characterID;
            if (charData && charId) {
                // JSON 프로필 포맷을 SlotState 형식으로 변환
                const skills = charData.skills || [10, 10, 10];
                const equips = charData.equipment || {};

                // 오버로드 합산
                const overloads = charData.overload_stats || {};

                saveCharSettings(charId, {
                    owned: true,
                    growthStage: String(charData.core > 0 ? 3 + charData.core : (charData.grade || 0)),
                    affinityLevel: String(charData.affinity || 1),
                    skill1Level: skills[0] ?? 10,
                    skill2Level: skills[1] ?? 10,
                    burstLevel: skills[2] ?? 10,
                    collectionGrade: charData.favorite_stage ? 'SSR' : (charData.collection_grade || 'None'),
                    collectionLevel: String(charData.favorite_stage || charData.collection_level || 0),
                    cubeName: charData.cube?.name || 'None',
                    cubeLevel: String(charData.cube?.level || 0),
                    equipTierHead: equips.head?.tier || 'Overload',
                    equipUpgradeHead: String(equips.head?.level || 0),
                    equipTierTorso: equips.torso?.tier || 'Overload',
                    equipUpgradeTorso: String(equips.torso?.level || 0),
                    equipTierArms: equips.arm?.tier || 'Overload',
                    equipUpgradeArms: String(equips.arm?.level || 0),
                    equipTierLegs: equips.leg?.tier || 'Overload',
                    equipUpgradeLegs: String(equips.leg?.level || 0),
                    equipATK: overloads.atk_pct ? String(overloads.atk_pct) : '0',
                    equipWeakPoint: overloads.element_bonus ? String(overloads.element_bonus) : '0',
                    equipAmmo: overloads.max_ammo_pct ? String(overloads.max_ammo_pct) : '0',
                    equipAccuracy: overloads.accuracy_pct ? String(overloads.accuracy_pct) : '0',
                    equipChargeDmg: overloads.charge_dmg_pct ? String(overloads.charge_dmg_pct) : '0',
                    equipChargeSpeed: overloads.charge_speed_pct ? String(overloads.charge_speed_pct) : '0',
                    equipCritRate: overloads.crit_rate ? String(overloads.crit_rate) : '0',
                    equipCritDmg: overloads.crit_dmg ? String(overloads.crit_dmg) : '0',
                    equipDef: overloads.def_pct ? String(overloads.def_pct) : '0',
                    customHP: '',
                    customATK: '',
                    customDEF: '',
                });
                count++;
            }
        }

        // 콘솔 및 아웃포스트 동기화
        if (jsonObj._account) {
            const console = jsonObj._account.console || {};
            const outpost: SavedOutpostState = {
                synchroLevel: String(jsonObj._account.synchro_level || 1),
                commonResearchLevel: String(console.common_level || 0),
                elysionConsole: String(console.company_level?.['엘리시온'] || 0),
                missilisConsole: String(console.company_level?.['미실리스'] || 0),
                tetraConsole: String(console.company_level?.['테트라'] || 0),
                pilgrimConsole: String(console.company_level?.['필그림'] || 0),
                abnormalConsole: String(console.company_level?.['어브노말'] || 0),
                attackerConsole: String(console.class_level?.['화력형'] || 0),
                defenderConsole: String(console.class_level?.['방어형'] || 0),
                supporterConsole: String(console.class_level?.['지원형'] || 0),
            };
            saveOutpostState(outpost);
        }

        return { success: true, syncedCount: count };
    } catch (e: any) {
        return { success: false, syncedCount: 0, error: e.message };
    }
}
