'use strict';
// Driver: serves ./src into headless Chrome (secure origin => WebCodecs), then previews or renders the reel.
//   node build.cjs sheet <out.png> <scale> <cols> <t1> <t2> ...   contact sheet of frames
//   node build.cjs still <out.png> <scale> <t>                    single frame
//   node build.cjs audio                                         render + analyse audio only
//   node build.cjs render <out.webm> [scale]                       full encode
const fs = require('fs');
const path = require('path');
const { chromium } = require('/inner_container/opt/toolchains/.nvm/versions/node/v22.23.4/lib/node_modules/@playwright/mcp/node_modules/playwright-core');

const SRC = path.join(__dirname, 'src');
const ORIGIN = 'https://reel.test';
const FILES = ['core.js', 's1.js', 's2.js', 's3.js', 's4.js', 's5.js', 'audio.js', 'mux.js', 'main.js'];

async function open() {
  const browser = await chromium.launch({
    executablePath: '/inner_container/opt/playwright/chromium_headless_shell-1232/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.route(ORIGIN + '/**', (r) => {
    const u = new URL(r.request().url()); const name = u.pathname.slice(1);
    if (name === '' || name === 'index.html') {
      const tags = FILES.filter((f) => fs.existsSync(path.join(SRC, f))).map((f) => `<script src="/${f}"></script>`).join('\n');
      return r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000">${tags}</body></html>` });
    }
    const p = path.join(SRC, name);
    if (fs.existsSync(p)) return r.fulfill({ contentType: p.endsWith('.ttf') ? 'font/ttf' : 'text/javascript; charset=utf-8', body: fs.readFileSync(p) });
    return r.fulfill({ status: 404, body: 'nf' });
  });
  await page.goto(ORIGIN + '/');
  return { browser, page };
}

(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const { browser, page } = await open();
  try {
    if (cmd === 'sheet' || cmd === 'still') {
      const out = args[0], scale = parseFloat(args[1]);
      const cols = cmd === 'sheet' ? parseInt(args[2], 10) : 1;
      const times = args.slice(cmd === 'sheet' ? 3 : 2).map(parseFloat);
      const t0 = Date.now();
      const data = await page.evaluate(async ({ times, scale, cols }) => {
        await loadFonts(); initRenderer(scale);
        const tw = R.pw, th = R.ph, rows = Math.ceil(times.length / cols);
        const sheet = document.createElement('canvas'); sheet.width = tw * cols; sheet.height = th * rows;
        const sx = sheet.getContext('2d');
        const ms = [];
        times.forEach((t, i) => { const a = performance.now(); renderFrame(t); ms.push(Math.round(performance.now() - a)); sx.drawImage(R.out, (i % cols) * tw, Math.floor(i / cols) * th); });
        console.log('frame ms: ' + ms.join(','));
        return sheet.toDataURL('image/png');
      }, { times, scale, cols });
      fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
      console.log('wrote', out, (Date.now() - t0) + 'ms');
    } else if (cmd === 'audio') {
      const res = await page.evaluate(async () => analyseAudio());
      console.log(JSON.stringify(res, null, 1));
    } else if (cmd === 'render') {
      const out = args[0], scale = parseFloat(args[1] || '1');
      const chunks = [];
      await page.exposeFunction('__chunk', (b64) => { chunks.push(Buffer.from(b64, 'base64')); });
      const t0 = Date.now();
      const info = await page.evaluate(async ([scale, br]) => { if (br) window.__BITRATE = br; return encodeReel(scale); }, [scale, parseFloat(args[2] || '0')]);
      fs.writeFileSync(out, Buffer.concat(chunks));
      console.log('rendered', out, JSON.stringify(info), ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
