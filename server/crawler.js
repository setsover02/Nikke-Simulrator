import puppeteer from 'puppeteer';

const BASE_URL = 'https://www.blablalink.com/shiftyspad';

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.connected) {
        browserInstance = await puppeteer.launch({
            headless: true,
            userDataDir: './browser_data',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080',
            ],
        });
    }
    return browserInstance;
}

async function createPage() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // 쿠키 주입은 userDataDir을 사용하므로 더 이상 필요하지 않습니다.
    // 기존 cookies.json 호환성을 위해 남겨둘 수도 있지만, 로컬 스토리지까지 
    // 보존하기 위해서는 userDataDir 방식이 필수적입니다.

    return page;
}

/**
 * 페이지 로드 후 팝업(쿠키 동의, Note 안내)을 자동으로 닫기
 * blablalink.com은 첫 방문 시 쿠키 동의 + Note 안내 팝업이 표시되며,
 * 이를 닫지 않으면 실제 콘텐츠가 렌더링되지 않습니다.
 */
async function dismissPopups(page) {
    // 1) 쿠키 동의 팝업 닫기
    try {
        const cookieClicked = await page.evaluate(() => {
            const btn = document.querySelector('button#onetrust-accept-btn-handler');
            if (btn) { btn.click(); return 'onetrust-accept'; }
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
                const t = b.textContent?.trim() || '';
                if (t.includes('Accept all') || t.includes('Reject all')) {
                    b.click(); return t;
                }
            }
            return null;
        });
        if (cookieClicked) {
            console.log(`[Popup] Dismissed cookie: "${cookieClicked}"`);
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.log('[Popup] Cookie popup handling error:', e.message);
    }

    // 2) Note 팝업 닫기 - 재시도 포함 (팝업이 지연 로드될 수 있음)
    for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            const confirmClicked = await page.evaluate(() => {
                // 모든 요소에서 "Confirm" 텍스트를 가진 클릭 가능한 요소 찾기
                const allEls = document.querySelectorAll('button, div, span, a');
                for (const el of allEls) {
                    const t = el.textContent?.trim() || '';
                    // 정확히 "Confirm"만 포함하는 작은 요소 찾기 (큰 컨테이너 제외)
                    if ((t === 'Confirm' || t === '확인' || t === 'OK') && t.length < 20) {
                        el.click();
                        return t;
                    }
                }
                return null;
            });
            if (confirmClicked) {
                console.log(`[Popup] Dismissed Note popup: "${confirmClicked}" (attempt ${attempt + 1})`);
                break;
            }
        } catch (e) {
            // ignore
        }
    }

    // 3) "View game data" 버튼 클릭 - 로그인 없이 공개 데이터를 보기 위해 필요
    try {
        const viewClicked = await page.evaluate(() => {
            const allEls = document.querySelectorAll('button, div, span, a, p');
            for (const el of allEls) {
                const t = el.textContent?.trim() || '';
                if (t === 'View game data' || t === '게임 데이터 보기' || t.includes('View game data')) {
                    if (t.length < 30) {
                        el.click();
                        return t;
                    }
                }
            }
            return null;
        });
        if (viewClicked) {
            console.log(`[Popup] Clicked "View game data": "${viewClicked}"`);
            await new Promise(r => setTimeout(r, 5000));
        }
    } catch (e) {
        console.log('[Popup] View game data button not found');
    }

    // 4) 추가 대기 - 콘텐츠 렌더링 대기
    await new Promise(r => setTimeout(r, 5000));
}

/**
 * 디버그: 페이지의 전체 텍스트 및 DOM 구조를 덤프
 */
export async function debugPage(openid, pageType = 'home') {
    const page = await createPage();
    try {
        const pagePath = pageType === 'nikke-list' ? 'nikke-list' : 'home';
        const url = `${BASE_URL}/${pagePath}?openid=${openid}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        await dismissPopups(page);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 30000));

        return { success: true, bodyText, bodyHTML };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        await page.close();
    }
}

/**
 * 전초기지(Outpost) 정보 크롤링
 * 참고: openid 페이지는 로그인 없이도 접근 가능하지만,
 * 전초기지 정보는 사용자가 ShiftyPad에서 공개 설정을 해야 보임.
 * 공개 설정이 안 된 경우 "Please login" 메시지만 표시됨.
 */
export async function crawlOutpost(openid) {
    const page = await createPage();

    try {
        const url = `${BASE_URL}/home?openid=${openid}`;
        console.log(`[Outpost] Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        await dismissPopups(page);

        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log(`[Outpost] Page text (first 500):`, bodyText.substring(0, 500));

        // Check if the page requires login
        if (bodyText.includes('Please login') || bodyText.includes('View game data')) {
            console.log('[Outpost] Page requires login or data is not public');
            return {
                success: false,
                error: 'ShiftyPad 전초기지 데이터가 비공개 상태입니다. blablalink.com에서 오른쪽 상단 방패 아이콘을 클릭하여 데이터를 공개로 설정해주세요.',
                data: null,
            };
        }

        // Extract outpost data from the rendered page
        const outpostData = await page.evaluate(() => {
            const result = {
                synchroLevel: null,
                commonResearchLevel: null,
                corporationConsoles: {
                    elysion: null,
                    missilis: null,
                    tetra: null,
                    pilgrim: null,
                    abnormal: null,
                },
                classConsoles: {
                    attacker: null,
                    defender: null,
                    supporter: null,
                },
            };

            const bodyText = document.body.innerText;

            // Synchro level
            const synchroPatterns = [
                /(?:Synchro|싱크로|동기화)[\s\S]{0,30}?(?:Lv\.?\s*)?(\d{2,4})/i,
                /Lv\.?\s*(\d{3,4})/i,
            ];
            for (const pattern of synchroPatterns) {
                const match = bodyText.match(pattern);
                if (match && !result.synchroLevel) {
                    result.synchroLevel = parseInt(match[1]);
                }
            }

            // Corporation consoles
            const corpPatterns = {
                elysion: /(?:Elysion|엘리시온)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
                missilis: /(?:Missilis|미실리스)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
                tetra: /(?:Tetra|테트라)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
                pilgrim: /(?:Pilgrim|필그림)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
                abnormal: /(?:Abnormal|어브노말)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
            };
            for (const [key, pattern] of Object.entries(corpPatterns)) {
                const match = bodyText.match(pattern);
                if (match) result.corporationConsoles[key] = parseInt(match[1]);
            }

            // Class consoles
            const classPatterns = {
                attacker: /(?:Attacker|화력|공격형)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
                defender: /(?:Defender|방어형|방어)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
                supporter: /(?:Supporter|지원형|지원)[\s\S]{0,50}?(?:Lv\.?\s*)?(\d{1,3})/i,
            };
            for (const [key, pattern] of Object.entries(classPatterns)) {
                const match = bodyText.match(pattern);
                if (match) result.classConsoles[key] = parseInt(match[1]);
            }

            // Research level
            const researchMatch = bodyText.match(/(?:Research|연구)[\s\S]{0,30}?(?:Lv\.?\s*)?(\d{1,3})/i);
            if (researchMatch) result.commonResearchLevel = parseInt(researchMatch[1]);

            return result;
        });

        return { success: true, data: outpostData };
    } catch (error) {
        console.error('[Outpost] Error:', error.message);
        return { success: false, error: error.message, data: null };
    } finally {
        await page.close();
    }
}

/**
 * 니케 목록 크롤링 (Nikkepedia 페이지)
 * Nikkepedia는 로그인 없이도 닉네임 목록이 표시됨.
 * 다만 레벨, 돌파 수 등은 이미지/아이콘으로 표현되어 텍스트 추출 불가.
 */
export async function crawlNikkeList(openid) {
    const page = await createPage();

    try {
        const url = `${BASE_URL}/nikke-list?openid=${openid}`;
        console.log(`[NikkeList] Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        await dismissPopups(page);

        // Scroll to load all nikkes
        await autoScroll(page);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log(`[NikkeList] Page text length: ${bodyText.length}`);

        // Extract nikke names from page text
        const nikkeList = await page.evaluate(() => {
            const nikkes = [];
            const bodyText = document.body.innerText;
            const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // Known non-nikke strings to filter out
            const excludePatterns = /^(ShiftyPad|Union|CDK|Spotlight|Event Calendar|Perks Quest|NikkePedia|Campaign List|Top Up|Nikkepedia|ALL|Ⅰ|Ⅱ|Ⅲ|Filter|GODDESS|RPG|iOS|Android|Release|Privacy|Cookie|CONTACT|License|©|Daily|Sign|YOUR COOKIE|We use|Customize|Reject|Accept|Note|●)/i;

            // The nikke-list page shows: tab filters then nikke names in order
            let startCollecting = false;

            for (const line of lines) {
                // Start collecting after "Filter"
                if (line === 'Filter') {
                    startCollecting = true;
                    continue;
                }

                if (!startCollecting) continue;

                // Stop at footer
                if (line.startsWith('GODDESS') || line.startsWith('Privacy')) break;

                // Skip excluded patterns
                if (excludePatterns.test(line)) continue;

                // Skip very short or very long names
                if (line.length < 2 || line.length > 60) continue;

                // Skip if it looks like a level
                if (/^Lv\.?\s*\d+$/i.test(line)) continue;
                if (/^\d+$/.test(line)) continue;

                nikkes.push({
                    name: line,
                    owned: true,
                    level: null,
                    limitBreak: null,
                });
            }

            return nikkes;
        });

        console.log(`[NikkeList] Found ${nikkeList.length} nikkes`);
        return { success: true, data: nikkeList, count: nikkeList.length };
    } catch (error) {
        console.error('[NikkeList] Error:', error.message);
        return { success: false, error: error.message, data: [] };
    } finally {
        await page.close();
    }
}

/**
 * 개별 니케 상세 정보 크롤링 (목록에서 클릭하여 API 응답을 수집)
 * @param {string} openid 사용자 openid
 * @param {number[]} targetNameCodes 동기화할 특정 니케들의 name_code 배열 (선택사항)
 */
export async function crawlAllNikkeDetails(openid, targetNameCodes = null) {
    const page = await createPage();
    let details = [];
    let charactersList = [];

    try {
        const url = `${BASE_URL}/nikke-list?openid=${openid}`;
        console.log(`[CrawlAll] Navigating to: ${url}`);

        // API 응답 가로채기
        page.on('response', async res => {
            const reqUrl = res.url();
            
            // 1) 전체 니케 목록 (name_code 순서 매핑용)
            if (reqUrl.includes('GetUserCharacters')) {
                try {
                    const json = await res.json();
                    if (json.data && json.data.characters) {
                        charactersList = json.data.characters;
                    }
                } catch(e) {}
            }
            
            // 2) 개별 니케 상세 정보 (클릭 시 발생)
            if (reqUrl.includes('GetUserCharacterDetails') && res.request().method() === 'POST') {
                try {
                    const json = await res.json();
                    if (json.data && json.data.character_details) {
                        details.push(...json.data.character_details);
                        console.log(`[CrawlAll] Captured details for Nikke ID: ${json.data.character_details[0]?.name_code}`);
                    }
                } catch(e) {}
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        await dismissPopups(page);

        const cards = await page.$$('.nikkes-player-item');
        console.log(`[CrawlAll] Found ${cards.length} Nikke cards on screen.`);

        // targetNameCodes가 제공되지 않았다면 최대 10개만 테스트로 수집 (추후 전체로 확장 가능)
        // 너무 오래 걸리는 것을 방지하기 위해 프론트에서 배열을 넘겨주는 방식을 권장합니다.
        const limit = targetNameCodes ? cards.length : Math.min(cards.length, 10);

        for (let i = 0; i < limit; i++) {
            // charactersList가 수집되었다면 해당 인덱스의 name_code 확인
            if (charactersList.length > i && targetNameCodes && targetNameCodes.length > 0) {
                const code = charactersList[i].name_code;
                if (!targetNameCodes.includes(code)) {
                    continue; // 타겟이 아니면 건너뜀
                }
            }

            const freshCards = await page.$$('.nikkes-player-item');
            if (!freshCards[i]) continue;
            
            await freshCards[i].click();
            // 디테일 페이지 로딩 대기
            await page.waitForSelector('.nikkes-detail, .nikke-info, .text-16', { timeout: 3000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 800)); 
            
            await page.goBack();
            // 리스트 페이지 로딩 대기
            await page.waitForSelector('.nikkes-player-item', { timeout: 3000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 500)); 
        }

        return { success: true, data: details };
    } catch (error) {
        console.error('[CrawlAll] Error:', error.message);
        return { success: false, error: error.message, data: null };
    } finally {
        await page.close();
    }
}

/**
 * API 응답 인터셉트
 */
export async function crawlWithApiIntercept(openid, pageType = 'home') {
    const page = await createPage();
    const interceptedData = [];

    try {
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('api.blablalink.com') && response.status() === 200) {
                try {
                    const contentType = response.headers()['content-type'] || '';
                    if (contentType.includes('application/json')) {
                        const json = await response.json();
                        interceptedData.push({ url, data: json });
                    }
                } catch (e) { /* ignore */ }
            }
        });

        const pagePath = pageType === 'nikke-list' ? 'nikke-list' : 'home';
        const url = `${BASE_URL}/${pagePath}?openid=${openid}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 8000));

        return { success: true, interceptedData };
    } catch (error) {
        return { success: false, error: error.message, interceptedData };
    } finally {
        await page.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    resolve();
                }
            }, 200);
        });
    });
}

export async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}

/**
 * 프로필 소개글(Bio)에 특정 인증 코드가 포함되어 있는지 확인합니다.
 * @param {string} openid 사용자 openid
 * @param {string} authCode 확인할 인증 코드 (예: simc-12345)
 * @returns {Promise<{success: boolean, verified: boolean, bioText?: string, error?: string}>}
 */
export async function verifyBioAuth(openid, authCode) {
    const page = await createPage();

    try {
        // ShiftyPad가 아닌 BlablaLink 유저 프로필 페이지로 이동해야 Bio가 보입니다.
        const url = `https://www.blablalink.com/user?openid=${openid}`;
        console.log(`[VerifyAuth] Checking bio for openid: ${openid} at ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        await dismissPopups(page);

        const bioResult = await page.evaluate(() => {
            const result = {
                found: false,
                bioText: '',
            };
            
            // "Please login" 상태 체크 (쿠키 누락 시)
            const bodyText = document.body.innerText;
            // 'Sign in to claim rewards!'는 로그인 후에도 배너에 표시되므로 제거
            if (bodyText.includes('Please login\nView game data') || bodyText.includes('Please login\n게임 데이터 보기')) {
                return { error: 'GUEST_MODE' };
            }

            // Bio 텍스트 추출 (실제 DOM에서 소개글 부분을 더 정확히 추출해야 할 수 있음)
            result.bioText = bodyText; 

            return result;
        });

        if (bioResult.error === 'GUEST_MODE') {
            return { 
                success: false, 
                verified: false, 
                error: '서버 봇 세션이 유효하지 않습니다. (Guest mode detected)'
            };
        }

        const isVerified = bioResult.bioText.includes(authCode);

        return { 
            success: true, 
            verified: isVerified, 
            bioText: bioResult.bioText.substring(0, 500) 
        };
    } catch (error) {
        console.error('[VerifyAuth] Error:', error.message);
        return { success: false, verified: false, error: error.message };
    } finally {
        await page.close();
    }
}
