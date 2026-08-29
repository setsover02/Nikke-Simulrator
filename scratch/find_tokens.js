const https = require('https');

async function check() {
  const indexHtml = await new Promise(r => {
    https.get('https://www.blablalink.com/shiftyspad/home', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(d));
    });
  });
  const jsFiles = indexHtml.match(/https:\/\/[^"']+\.js/g) || [];
  console.log('Found JS files:', jsFiles);
  for (const f of jsFiles) {
    if (f.includes('otSDKStub') || f.includes('polyfills') || f.includes('aegis')) continue;
    const content = await new Promise(r => {
      https.get(f, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => r(d));
      });
    });
    const matches = content.match(/game_token|game_openid|intl_open_id|Authorization|sessionStorage|localStorage|cookie/g) || [];
    if (matches.length > 0) {
      console.log(f.split('/').pop(), '=>', [...new Set(matches)]);
    }
  }
}
check();
