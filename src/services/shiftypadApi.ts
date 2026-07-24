const API_BASE = '/api/shiftypad';

export interface OutpostData {
    synchroLevel: number | null;
    commonResearchLevel: number | null;
    corporationConsoles: {
        elysion: number | null;
        missilis: number | null;
        tetra: number | null;
        pilgrim: number | null;
        abnormal: number | null;
    };
    classConsoles: {
        attacker: number | null;
        defender: number | null;
        supporter: number | null;
    };
}

export interface NikkeListItem {
    name: string;
    level: number;
    limitBreak: number;
    owned: boolean;
}

export interface NikkeDetail {
    name_code: number;
    combat: number;
    lv: number;
    core: number;
    grade: number;
    skill1_lv: number;
    skill2_lv: number;
    skill3_lv: number;
    arm_equip_lv?: number;
    leg_equip_lv?: number;
    head_equip_lv?: number;
    chest_equip_lv?: number;
    favorite_item_lv?: number;
    [key: string]: any;
}

export interface ApiResponse<T> {
    success: boolean;
    source?: string;
    data: T;
    error?: string;
    rawIntercepted?: { url: string; dataKeys: string[] }[];
}

/**
 * 전초기지(Outpost) 정보 조회
 */
export async function fetchOutpostData(openid: string): Promise<ApiResponse<OutpostData>> {
    const response = await fetch(`${API_BASE}/outpost?openid=${encodeURIComponent(openid)}`);
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    return response.json();
}

/**
 * 니케 목록 조회
 */
export async function fetchNikkeList(openid: string): Promise<ApiResponse<NikkeListItem[]>> {
    const response = await fetch(`${API_BASE}/nikkes?openid=${encodeURIComponent(openid)}`);
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    return response.json();
}

/**
 * 개별 니케 상세 정보 조회
 */
export async function fetchNikkeDetail(openid: string, nikkeId: string): Promise<ApiResponse<NikkeDetail>> {
    const response = await fetch(`${API_BASE}/nikke/${nikkeId}?openid=${encodeURIComponent(openid)}`);
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    return response.json();
}

/**
 * 전체 또는 다수 니케 상세 정보 동기화 (POST /sync)
 */
export async function syncNikkeDetails(openid: string, targetNameCodes?: number[]): Promise<ApiResponse<NikkeDetail[]>> {
    const response = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openid, targetNameCodes })
    });
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    return response.json();
}

/**
 * 서버 상태 확인
 */
export async function checkServerHealth(): Promise<boolean> {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        return data.status === 'ok';
    } catch {
        return false;
    }
}

/**
 * 디버깅용: Raw API 인터셉트 데이터 조회
 */
export async function fetchRawData(openid: string, page: 'home' | 'nikke-list' = 'home') {
    const response = await fetch(`${API_BASE}/raw?openid=${encodeURIComponent(openid)}&page=${page}`);
    if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
    }
    return response.json();
}

/**
 * 브라우저 쿠키 저장 (인증용)
 */
export async function saveCookies(cookieString: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${API_BASE}/cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookieString }),
    });
    return response.json();
}

/**
 * 쿠키 저장 상태 확인
 */
export async function checkCookieStatus(): Promise<{ hasCookies: boolean; count: number }> {
    try {
        const response = await fetch(`${API_BASE}/cookies/status`);
        return response.json();
    } catch {
        return { hasCookies: false, count: 0 };
    }
}
