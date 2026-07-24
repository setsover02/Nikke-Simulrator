import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = 'https://www.blablalink.com/shiftyspad';

async function main() {
    console.log('\n======================================================');
    console.log('🚀 BlablaLink 크롤러 봇 계정 로그인 스크립트 🚀');
    console.log('======================================================\n');
    console.log('곧 브라우저 창이 열립니다.');
    console.log('1. 열린 브라우저에서 사용하실 봇 계정(개발자 계정)으로 로그인해주세요.');
    console.log('2. 로그인이 완료되고 ShiftyPad 화면에 진입하면 자동으로 쿠키가 저장됩니다.');
    console.log('3. 브라우저를 닫지 말고 잠시만 기다려주세요...\n');

    const browser = await puppeteer.launch({
        headless: false, // 브라우저 창을 띄움
        userDataDir: './browser_data', // 쿠키 및 스토리지 영구 저장
        defaultViewport: null,
        args: ['--window-size=1200,800'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    console.log('⏳ 로그인을 완료할 때까지 대기 중입니다... (최대 5분 대기)');

    try {
        await page.waitForFunction(() => {
            const text = document.body.innerText;
            // 'Please login'이나 'Sign in' 문구가 사라지고 정상적인 프로필 화면이 표시될 때까지 대기
            const isNotGuest = !text.includes('Please login') && !text.includes('Sign in to claim rewards!');
            const isShiftyPad = text.includes('ShiftyPad');
            
            return isShiftyPad && isNotGuest;
        }, { timeout: 300000 });

        console.log('\n✅ 로그인(또는 화면 진입) 감지됨! 3초 후 쿠키를 저장합니다...');
        await new Promise(r => setTimeout(r, 3000));

        // 모든 쿠키 가져오기 (HttpOnly 포함)
        const cookies = await page.cookies();
        
        const cookiePath = path.join(import.meta.dirname, 'cookies.json');
        await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
        
        console.log(`\n🎉 성공! ${cookies.length}개의 쿠키가 ${cookiePath}에 저장되었습니다.`);
        console.log('이제 크롤러가 봇 세션으로 정상 작동할 수 있습니다.');
        
    } catch (error) {
        console.error('\n❌ 시간 초과 또는 에러 발생:', error.message);
        console.log('다시 시도해주세요.');
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
