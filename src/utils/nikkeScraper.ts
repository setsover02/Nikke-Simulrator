/**
 * blablalink CDN 데이터 수집기 TypeScript 구현
 */

import { getCdnUrl } from './cdnPath';

export interface CharacterIdMapItem {
    resource_id: number;
    name_localkey: string;
    rarity: string;
}

export interface ScrapedWeaponDetail {
    weapon_type: string;
    max_ammo: number;
    reload_time: number;
    fire_rate: number;
    fire_rate_max?: number;
    fire_rate_change_pershot?: number;
    pellets?: number;
    muzzles?: number;
    damage_coeff?: number;
    core_dmg_mult?: number;
    charge_time?: number;
    full_charge_mult?: number;
}

export interface ScrapedNikkeCharacter {
    id: number;
    name: string;
    rarity: string;
    element: string;
    class: string;
    company: string;
    squad: string;
    burstLevel: number;
    weapon: ScrapedWeaponDetail;
    portraitUrl: string;
    rawRoleData?: any;
}

const ELEMENT_MAP: Record<string, string> = {
    Fire: '작열',
    Water: '수냉',
    Wind: '풍압',
    Electronic: '전격',
    Iron: '철갑',
};

const CLASS_MAP: Record<string, string> = {
    Attacker: '화력형',
    Supporter: '지원형',
    Defender: '방어형',
};

const CORP_MAP: Record<string, string> = {
    ELYSION: '엘리시온',
    MISSILIS: '미실리스',
    TETRA: '테트라',
    PILGRIM: '필그림',
    ABNORMAL: '어브노말',
};

const BURST_MAP: Record<string, number> = {
    Step1: 1,
    Step2: 2,
    Step3: 3,
};

/**
 * 캐릭터 ID 맵 목록 조회
 */
export async function fetchCharacterIdMap(): Promise<CharacterIdMapItem[]> {
    const url = getCdnUrl('/character/character_id_map.json');
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch character ID map: ${res.statusText}`);
    }
    return res.json();
}

/**
 * 특정 캐릭터의 초상화 썸네일 CDN URL 생성
 */
export function getCharacterPortraitUrl(resourceId: number): string {
    const ridStr = String(resourceId).padStart(3, '0');
    return getCdnUrl(`/character/mi/mi_c${ridStr}_00_s.webp`);
}

/**
 * 특정 캐릭터 roledata JSON 조회 (blablalink CDN)
 */
export async function fetchRoledata(resourceId: number, locale = 'ko'): Promise<any> {
    const path = `/roledata/${resourceId}-v2-${locale}.json`;
    const url = getCdnUrl(path);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch roledata for ID ${resourceId}: ${res.statusText}`);
    }
    return res.json();
}

/**
 * CDN roledata JSON을 TS 앱 규격으로 변환
 */
export function adaptRoledata(role: any): ScrapedNikkeCharacter {
    const shot = role.get ? role.get('shot_detail') : (role.shot_detail || {});
    const elemRaw = (role.element_details && role.element_details[0]) ? role.element_details[0].element : '';

    const weapon: ScrapedWeaponDetail = {
        weapon_type: shot.weapon_type || '',
        max_ammo: shot.max_ammo || 0,
        reload_time: (shot.reload_time || 0) / 100,
        fire_rate: shot.rate_of_fire ? Math.round((shot.rate_of_fire / 60) * 10000) / 10000 : 0,
        pellets: shot.shot_count || 1,
        muzzles: shot.muzzle_count || 1,
    };

    if (shot.end_rate_of_fire && shot.end_rate_of_fire !== shot.rate_of_fire) {
        weapon.fire_rate_max = Math.round((shot.end_rate_of_fire / 60) * 10000) / 10000;
        weapon.fire_rate_change_pershot = Math.round(((shot.rate_of_fire_change_pershot || 0) / 60) * 10000) / 10000;
    }

    return {
        id: role.resource_id,
        name: role.name_localkey || '',
        rarity: role.original_rare || 'SSR',
        element: ELEMENT_MAP[elemRaw] || elemRaw,
        class: CLASS_MAP[role.class] || role.class,
        company: CORP_MAP[role.corporation] || role.corporation,
        squad: role.squad || '',
        burstLevel: BURST_MAP[role.use_burst_skill] || 3,
        weapon,
        portraitUrl: getCharacterPortraitUrl(role.resource_id),
        rawRoleData: role,
    };
}
