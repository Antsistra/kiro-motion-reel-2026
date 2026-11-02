const fs = require('fs');
const { chromium } = require('/inner_container/opt/toolchains/.nvm/versions/node/v22.23.4/lib/node_modules/@playwright/mcp/node_modules/playwright-core');
(async () => {
  const file = process.argv[2];
  const b = await chromium.launch({ executablePath: '/inner_container/opt/playwright/chromium_headless_shell-1232/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--no-sandbox', '--disable-gpu'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', (m) => console.log('[page]', m.text()));
  await p.route('https://reel.test/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === '/v.webm') {
      const buf = fs.readFileSync(file), rg = r.request().headers()['range'];
      if (rg) { const m = /bytes=(\d+)-(\d*)/.exec(rg); const a = +m[1], z = m[2] ? +m[2] : buf.length - 1;
        return r.fulfill({ status: 206, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${z}/${buf.length}`, 'Content-Length': String(z - a + 1) }, body: buf.subarray(a, z + 1) }); }
      return r.fulfill({ status: 200, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes' }, body: buf });
    }
    return r.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' });
  });
  await p.goto('https://reel.test/');
  const res = await p.evaluate(async () => {
    const out = {};
    const v = document.createElement('video'); v.muted = true; v.src = '/v.webm'; v.preload = 'auto'; document.body.appendChild(v);
    await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error('video error ' + (v.error && v.error.message))); });
    out.duration = v.duration; out.size = [v.videoWidth, v.videoHeight];
    const times = [0.05, 1.0, 2.2, 3.5, 4.8, 6.2, 7.5, 8.8, 10.2, 11.5, 12.6, 13.4, 14.2, 14.9];
    const cols = 4, tw = 480, th = 270, cv = document.createElement('canvas'); cv.width = tw * cols; cv.height = th * Math.ceil(times.length / cols); const x = cv.getContext('2d');
    const means = [];
    for (let i = 0; i < times.length; i++) {
      v.currentTime = times[i]; await new Promise((ok) => (v.onseeked = ok));
      x.drawImage(v, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
      const d = x.getImageData((i % cols) * tw, Math.floor(i / cols) * th, tw, th).data; let s = 0; for (let k = 0; k < d.length; k += 4) s += d[k] + d[k + 1] + d[k + 2]; means.push(Math.round(s / (d.length / 4) / 3));
    }
    out.frameMeans = means;
    out.sheet = cv.toDataURL('image/jpeg', 0.85);
    // audio
    const ab = await (await fetch('/v.webm')).arrayBuffer();
    const ac = new AudioContext({ sampleRate: 48000 });
    try { const buf = await ac.decodeAudioData(ab); const L = buf.getChannelData(0); let pk = 0, s = 0; for (let i = 0; i < L.length; i++) { pk = Math.max(pk, Math.abs(L[i])); s += L[i] * L[i]; }
      out.audio = { dur: buf.duration, ch: buf.numberOfChannels, peak: +pk.toFixed(3), rmsDb: +(10 * Math.log10(s / L.length)).toFixed(1) }; } catch (e) { out.audio = 'decode failed: ' + e.message; }
    return out;
  });
  fs.writeFileSync('out/verify_sheet.jpg', Buffer.from(res.sheet.split(',')[1], 'base64')); delete res.sheet;
  console.log(JSON.stringify(res));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
