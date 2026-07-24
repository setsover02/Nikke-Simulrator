import { Router } from 'express';
import {
    crawlOutpost,
    crawlNikkeList,
    crawlAllNikkeDetails,
    crawlWithApiIntercept,
    debugPage,
    verifyBioAuth,
} from '../crawler.js';

const router = Router();

/**
 * GET /api/shiftypad/outpost?openid=xxx
 * 전초기지 정보 크롤링
 */
router.get('/outpost', async (req, res) => {
    const { openid } = req.query;

    if (!openid) {
        return res.status(400).json({
            success: false,
            error: 'openid parameter is required',
        });
    }

    try {
        console.log(`[Outpost] Crawling outpost data for openid: ${openid}`);

        // First try API intercept method (more reliable if APIs return data)
        const interceptResult = await crawlWithApiIntercept(openid, 'home');

        // Check if we got useful data from API interception
        const apiData = interceptResult.interceptedData?.find(d =>
            d.url.includes('Outpost') || d.url.includes('outpost') || d.url.includes('Profile')
        );

        if (apiData?.data?.data) {
            console.log('[Outpost] Got data via API interception');
            return res.json({
                success: true,
                source: 'api-intercept',
                data: apiData.data.data,
                rawIntercepted: interceptResult.interceptedData.map(d => ({
                    url: d.url,
                    dataKeys: Object.keys(d.data?.data || d.data || {}),
                })),
            });
        }

        // Fallback to DOM parsing
        console.log('[Outpost] Falling back to DOM parsing');
        const domResult = await crawlOutpost(openid);

        res.json({
            ...domResult,
            source: 'dom-parse',
            rawIntercepted: interceptResult.interceptedData.map(d => ({
                url: d.url,
                dataKeys: Object.keys(d.data?.data || d.data || {}),
            })),
        });
    } catch (error) {
        console.error('[Outpost] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/shiftypad/nikkes?openid=xxx
 * 니케 목록 크롤링
 */
router.get('/nikkes', async (req, res) => {
    const { openid } = req.query;

    if (!openid) {
        return res.status(400).json({
            success: false,
            error: 'openid parameter is required',
        });
    }

    try {
        console.log(`[Nikkes] Crawling nikke list for openid: ${openid}`);

        // Try API intercept first
        const interceptResult = await crawlWithApiIntercept(openid, 'nikke-list');

        const apiData = interceptResult.interceptedData?.find(d =>
            d.url.includes('Character') || d.url.includes('character') || d.url.includes('Nikke')
        );

        if (apiData?.data?.data) {
            console.log('[Nikkes] Got data via API interception');
            return res.json({
                success: true,
                source: 'api-intercept',
                data: apiData.data.data,
                rawIntercepted: interceptResult.interceptedData.map(d => ({
                    url: d.url,
                    dataKeys: Object.keys(d.data?.data || d.data || {}),
                })),
            });
        }

        // Fallback to DOM parsing
        console.log('[Nikkes] Falling back to DOM parsing');
        const domResult = await crawlNikkeList(openid);

        res.json({
            ...domResult,
            source: 'dom-parse',
            rawIntercepted: interceptResult.interceptedData.map(d => ({
                url: d.url,
                dataKeys: Object.keys(d.data?.data || d.data || {}),
            })),
        });
    } catch (error) {
        console.error('[Nikkes] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/shiftypad/nikke/:id?openid=xxx
 * 개별 니케 상세 정보 크롤링
 */
router.get('/nikke/:id', async (req, res) => {
    const { openid } = req.query;
    const { id } = req.params;

    if (!openid) {
        return res.status(400).json({
            success: false,
            error: 'openid parameter is required',
        });
    }

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'nikke id is required',
        });
    }

    try {
        console.log(`[NikkeDetail] Crawling nikke #${id} for openid: ${openid}`);
        const result = await crawlAllNikkeDetails(openid, [parseInt(id)]);
        res.json(result);
    } catch (error) {
        console.error('[NikkeDetail] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/shiftypad/sync
 * 니케 상세 정보 배치 동기화 (전체 또는 지정된 배열)
 */
router.post('/sync', async (req, res) => {
    const { openid, targetNameCodes } = req.body;

    if (!openid) {
        return res.status(400).json({
            success: false,
            error: 'openid is required in body',
        });
    }

    try {
        console.log(`[Sync] Starting sync for openid: ${openid}, targets: ${targetNameCodes?.length || 'ALL'}`);
        // 클라이언트에서 긴 대기 시간을 방지하려면 백그라운드 큐를 사용하는 것이 좋지만
        // 현재 아키텍처에서는 일단 직접 대기하도록 처리합니다. (Vercel 등의 람다에서는 타임아웃 주의)
        const result = await crawlAllNikkeDetails(openid, targetNameCodes);
        res.json(result);
    } catch (error) {
        console.error('[Sync] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/shiftypad/raw?openid=xxx&page=home|nikke-list
 * 디버깅용: 인터셉트된 모든 API 응답 원본 반환
 */
router.get('/raw', async (req, res) => {
    const { openid, page = 'home' } = req.query;

    if (!openid) {
        return res.status(400).json({
            success: false,
            error: 'openid parameter is required',
        });
    }

    try {
        console.log(`[Raw] Intercepting API calls for page: ${page}, openid: ${openid}`);
        const result = await crawlWithApiIntercept(openid, page);
        res.json(result);
    } catch (error) {
        console.error('[Raw] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/shiftypad/debug?openid=xxx&page=home|nikke-list
 * 디버깅용: 페이지 전체 텍스트 덤프
 */
router.get('/debug', async (req, res) => {
    const { openid, page = 'home' } = req.query;

    if (!openid) {
        return res.status(400).json({
            success: false,
            error: 'openid parameter is required',
        });
    }

    try {
        console.log(`[Debug] Dumping page text for: ${page}, openid: ${openid}`);
        const result = await debugPage(openid, page);
        res.json(result);
    } catch (error) {
        console.error('[Debug] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/shiftypad/cookies
 * 브라우저에서 추출한 쿠키를 저장
 * Body: { cookies: [...] } - Puppeteer 형식의 쿠키 배열
 * 또는: { cookieString: "name=value; name2=value2" } - document.cookie 문자열
 */
router.post('/cookies', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const cookiePath = path.join(import.meta.dirname, '..', 'cookies.json');

        let cookies = [];

        if (req.body.cookies && Array.isArray(req.body.cookies)) {
            cookies = req.body.cookies;
        } else if (req.body.cookieString) {
            // document.cookie 형식의 문자열을 Puppeteer 쿠키 형식으로 변환
            cookies = req.body.cookieString.split(';').map(pair => {
                const [name, ...rest] = pair.trim().split('=');
                return {
                    name: name.trim(),
                    value: rest.join('=').trim(),
                    domain: '.blablalink.com',
                    path: '/',
                };
            }).filter(c => c.name && c.value);
        }

        if (cookies.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No cookies provided. Send { cookies: [...] } or { cookieString: "..." }',
            });
        }

        await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
        console.log(`[Cookies] Saved ${cookies.length} cookies to cookies.json`);

        res.json({
            success: true,
            message: `${cookies.length}개의 쿠키가 저장되었습니다.`,
            count: cookies.length,
        });
    } catch (error) {
        console.error('[Cookies] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/shiftypad/cookies/status
 * 쿠키 저장 상태 확인
 */
router.get('/cookies/status', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const cookiePath = path.join(import.meta.dirname, '..', 'cookies.json');

        const data = await fs.readFile(cookiePath, 'utf-8');
        const cookies = JSON.parse(data);

        res.json({
            success: true,
            hasCookies: cookies.length > 0,
            count: cookies.length,
            cookieNames: cookies.map(c => c.name),
        });
    } catch (e) {
        res.json({
            success: true,
            hasCookies: false,
            count: 0,
            message: 'cookies.json 파일이 없습니다. 브라우저 쿠키를 먼저 저장해주세요.',
        });
    }
});

/**
 * GET /api/shiftypad/verify?openid=xxx&authCode=simc-xxx
 * Bio 인증 확인
 */
router.get('/verify', async (req, res) => {
    const { openid, authCode } = req.query;

    if (!openid || !authCode) {
        return res.status(400).json({
            success: false,
            error: 'openid and authCode parameters are required',
        });
    }

    try {
        console.log(`[VerifyAuth] Verifying bio for openid: ${openid} with code: ${authCode}`);
        const result = await verifyBioAuth(openid, authCode);
        res.json(result);
    } catch (error) {
        console.error('[VerifyAuth] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
