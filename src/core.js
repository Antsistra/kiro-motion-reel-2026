'use strict';
/* ------------------------------------------------------------------ *
 *  KIRO — MOTION REEL 2026 · core engine
 *  Everything is a pure function of time: renderFrame(t) -> pixels.
 * ------------------------------------------------------------------ */
const W = 1920, H = 1080, FPS = 60, DUR = 15, BPM = 128, BEAT = 60 / BPM, TAU = Math.PI * 2;
const CAP = 0.714; // Noto Sans cap-height / em
const PAL = {
  ink: '#0B0B12', paper: '#F2EFE6', violet: '#7C3AED', lilac: '#A67CFF',
  coral: '#FF4D6D', lime: '#C8FF3D', cyan: '#22E5FF', amber: '#FFB627', deep: '#12062E',
};
const FAM = { black: 'RBlack', cond: 'RCond', mono: 'RMono' };
async function loadFonts() {
  const defs = [['RBlack', '/fonts/Black.ttf'], ['RCond', '/fonts/CondBlack.ttf'], ['RMono', '/fonts/Mono.ttf']];
  for (const [n, u] of defs) { const f = new FontFace(n, `url(${u})`); await f.load(); document.fonts.add(f); }
}

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const fract = (x) => x - Math.floor(x);
const smooth = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
const E = {
  lin: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s = 1.70158) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  inOutBack: (t) => { const c1 = 1.70158, c2 = c1 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
const ease = (f, a, b, x) => f(inv(a, b, x));
function rnd(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }

/* ---------- colour ---------- */
const _cc = {};
function rgb(h) { if (_cc[h]) return _cc[h]; const n = parseInt(h.slice(1), 16); return (_cc[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); }
function rgba(h, a) { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; }
function mixA(A, B, t) { return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; }
function str3(a, k = 1) { return `rgb(${clamp(a[0] * k, 0, 255) | 0},${clamp(a[1] * k, 0, 255) | 0},${clamp(a[2] * k, 0, 255) | 0})`; }
function mixc(a, b, t) { return str3(mixA(rgb(a), rgb(b), t)); }
function shade(h, k) { return str3(rgb(h), k); }
function ramp(stops, t) { // stops: [[pos, hex], ...] -> [r,g,b]
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) { const [p0, c0] = stops[i - 1], [p1, c1] = stops[i]; return mixA(rgb(c0), rgb(c1), (t - p0) / (p1 - p0 || 1)); }
  }
  return rgb(stops[stops.length - 1][1]);
}

/* ---------- noise ---------- */
const P = new Uint8Array(512);
(() => {
  const p = Array.from({ length: 256 }, (_, i) => i); let s = 1234567;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
})();
const fadeN = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad3(h, x, y, z) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fadeN(x), v = fadeN(y), w = fadeN(z);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(
    lerp(lerp(grad3(P[AA], x, y, z), grad3(P[BA], x - 1, y, z), u), lerp(grad3(P[AB], x, y - 1, z), grad3(P[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad3(P[AA + 1], x, y, z - 1), grad3(P[BA + 1], x - 1, y, z - 1), u), lerp(grad3(P[AB + 1], x, y - 1, z - 1), grad3(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}

/* ---------- rhythm ---------- */
// kick sidechain-style envelope; the audio drops the kick between beats 23 and 24.
const kickOn = (g) => !(g >= 23 && g < 24);
const kickEnv = (g) => (kickOn(g) ? Math.exp(-fract(g) * 5.5) : 0);

/* ---------- text ---------- */
function font(c, size, weight = 'black') { c.font = `${size}px ${FAM[weight] || FAM.black}`; }
function layoutText(c, str, size, track = 0, weight = 'black') {
  font(c, size, weight); c.letterSpacing = '0px';
  const list = []; let x = 0;
  for (const ch of str) { const w = c.measureText(ch).width; list.push({ ch, x, w }); x += w + track; }
  return { list, width: x - track };
}
function fitSize(c, str, weight, maxW, maxCap, track = 0) {
  const l = layoutText(c, str, 100, track * 0.01, weight);
  return Math.min((maxW / l.width) * 100, maxCap / CAP);
}

/* ---------- 3D matrices ---------- */
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mm = (A, B) => { const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]; return R; };
const mv = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
const rotAxis = (ax, a) => (ax === 0 ? rotX(a) : ax === 1 ? rotY(a) : rotZ(a));

/* ---------- shapes ---------- */
function slab(c, x, color, dir = 1, slant = 220) { // vertical slanted slab sweeping across; dir 1 = from left, -1 = from right
  c.fillStyle = color; c.beginPath();
  if (dir > 0) { c.moveTo(-200, -100); c.lineTo(x + slant, -100); c.lineTo(x - slant, H + 100); c.lineTo(-200, H + 100); }
  else { c.moveTo(x + slant, -100); c.lineTo(W + 200, -100); c.lineTo(W + 200, H + 100); c.lineTo(x - slant, H + 100); }
  c.closePath(); c.fill();
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill(); }

/* ---------- renderer / post ---------- */
const R = {};
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
function initRenderer(scale) {
  R.scale = scale; R.pw = Math.round(W * scale); R.ph = Math.round(H * scale);
  R.out = mk(R.pw, R.ph); R.octx = R.out.getContext('2d', { alpha: false });
  R.sc = mk(R.pw, R.ph); R.sctx = R.sc.getContext('2d', { alpha: false });
  R.tcan = mk(R.pw, R.ph); R.tctx = R.tcan.getContext('2d', { alpha: false });
  R.bA = mk(R.pw / 4, R.ph / 4); R.bAx = R.bA.getContext('2d');
  R.bB = mk(R.pw / 4, R.ph / 4); R.bBx = R.bB.getContext('2d');
  R.bC = mk(R.pw / 8, R.ph / 8); R.bCx = R.bC.getContext('2d');
  // vignette
  R.vig = mk(R.pw, R.ph); const v = R.vig.getContext('2d');
  const gr = v.createRadialGradient(R.pw / 2, R.ph / 2, R.ph * 0.35, R.pw / 2, R.ph / 2, R.pw * 0.62);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)');
  v.fillStyle = gr; v.fillRect(0, 0, R.pw, R.ph);
  // film grain tile
  R.grain = mk(256, 256); const gx = R.grain.getContext('2d'); const id = gx.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const n = (rnd(i * 0.37) * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255; }
  gx.putImageData(id, 0, 0); R.grainPat = R.octx.createPattern(R.grain, 'repeat');
}

function post(info, t, g) {
  const o = R.octx, S = R.scale, PW = R.pw, PH = R.ph;
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1; o.filter = 'none';
  const ca = info.ca !== undefined ? info.ca : 0.8 + 2.8 * kickEnv(g);
  if (ca > 0.3) {
    o.fillStyle = '#000'; o.fillRect(0, 0, PW, PH);
    o.globalCompositeOperation = 'lighter';
    const q = R.tctx;
    for (const [col, sc] of [['#ff0000', 1 + ca * 0.0016], ['#00ff00', 1 + ca * 0.0008], ['#0000ff', 1]]) {
      q.globalCompositeOperation = 'source-over'; q.drawImage(R.sc, 0, 0);
      q.globalCompositeOperation = 'multiply'; q.fillStyle = col; q.fillRect(0, 0, PW, PH);
      o.drawImage(R.tcan, (PW / 2) * (1 - sc), (PH / 2) * (1 - sc), PW * sc, PH * sc);
    }
    o.globalCompositeOperation = 'source-over';
  } else o.drawImage(R.sc, 0, 0);

  // bloom: bright-pass -> two blurs -> additive
  const bloom = info.bloom !== undefined ? info.bloom : 0.6;
  if (bloom > 0.01) {
    R.bAx.globalCompositeOperation = 'source-over'; R.bAx.filter = 'brightness(0.62) contrast(2.4)';
    R.bAx.drawImage(R.out, 0, 0, R.bA.width, R.bA.height); R.bAx.filter = 'none';
    R.bBx.clearRect(0, 0, R.bB.width, R.bB.height); R.bBx.filter = `blur(${4 * S}px)`; R.bBx.drawImage(R.bA, 0, 0); R.bBx.filter = 'none';
    R.bCx.clearRect(0, 0, R.bC.width, R.bC.height); R.bCx.filter = `blur(${6 * S}px)`; R.bCx.drawImage(R.bA, 0, 0, R.bC.width, R.bC.height); R.bCx.filter = 'none';
    o.globalCompositeOperation = 'lighter';
    o.globalAlpha = 0.35 * bloom; o.drawImage(R.bB, 0, 0, PW, PH);
    o.globalAlpha = 0.5 * bloom; o.drawImage(R.bC, 0, 0, PW, PH);
    o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  }
  // vignette
  o.globalAlpha = info.vig !== undefined ? info.vig : 1; o.drawImage(R.vig, 0, 0); o.globalAlpha = 1;
  // grain
  const f = Math.round(t * FPS);
  const rx = (rnd(f * 1.3) * 256) | 0, ry = (rnd(f * 2.9) * 256) | 0;
  o.save(); o.globalCompositeOperation = 'overlay'; o.globalAlpha = info.grain !== undefined ? info.grain : 0.09;
  o.translate(-rx, -ry); o.fillStyle = R.grainPat; o.fillRect(rx, ry, PW, PH); o.restore();
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
  // flash + fade
  if (info.flash > 0.002) { o.fillStyle = `rgba(255,255,255,${clamp(info.flash)})`; o.fillRect(0, 0, PW, PH); }
  if (info.fade > 0.002) { o.fillStyle = rgba(PAL.ink, clamp(info.fade)); o.fillRect(0, 0, PW, PH); }
}

/* ---------- HUD ---------- */
const CHAPTERS = [null, '01 — FORM', '02 — FLOW', '03 — DEPTH', '04 — SYSTEMS'];
function hud(c, t, g, info, si) {
  const a = info.hudA !== undefined ? info.hudA : 1; if (a <= 0.01) return;
  const col = info.hud || PAL.paper;
  c.save(); c.globalAlpha = a; c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'butt';
  const m = 44, l = 30;
  c.lineWidth = 3; c.beginPath();
  c.moveTo(m, m + l); c.lineTo(m, m); c.lineTo(m + l, m);
  c.moveTo(W - m - l, m); c.lineTo(W - m, m); c.lineTo(W - m, m + l);
  c.moveTo(m, H - m - l); c.lineTo(m, H - m); c.lineTo(m + l, H - m);
  c.moveTo(W - m - l, H - m); c.lineTo(W - m, H - m); c.lineTo(W - m, H - m - l);
  c.stroke();
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  font(c, 20, 'mono'); c.letterSpacing = '4px';
  c.fillText('KIRO  ◼  MOTION REEL 2026', m + 22, m + 32);
  // timecode
  const fr = Math.min(DUR * FPS - 1, Math.round(t * FPS));
  const pad = (n) => String(n).padStart(2, '0');
  const tc = `00:${pad(Math.floor(fr / FPS))}:${pad(fr % FPS)}`;
  font(c, 20, 'mono'); c.letterSpacing = '0px'; c.textAlign = 'center';
  const x0 = W - m - 22 - tc.length * 13;
  for (let i = 0; i < tc.length; i++) c.fillText(tc[i], x0 + i * 13 + 6, m + 32);
  // chapter
  const ch = CHAPTERS[si];
  if (ch) { font(c, 20, 'mono'); c.letterSpacing = '4px'; c.textAlign = 'left'; c.fillText(ch, m + 22, H - m - 36); }
  // progress
  const pw = W - 2 * m - 44;
  c.globalAlpha = a * 0.3; c.fillRect(m + 22, H - m - 14, pw, 2);
  c.globalAlpha = a; c.fillRect(m + 22, H - m - 15, pw * clamp(t / DUR), 4);
  c.restore();
}

/* ---------- timeline ---------- */
const SCENES = []; // filled by scene files: {start,end,fn}
function renderFrame(t) {
  const g = t / BEAT;
  let si = SCENES.findIndex((s) => g >= s.start && g < s.end); if (si < 0) si = SCENES.length - 1;
  const sc = SCENES[si];
  const c = R.sctx;
  c.setTransform(R.scale, 0, 0, R.scale, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
  c.letterSpacing = '0px'; c.textAlign = 'left'; c.lineJoin = 'miter'; c.lineCap = 'butt'; c.shadowBlur = 0;
  c.save();
  const info = sc.fn(c, g - sc.start, g) || {};
  c.restore();
  c.save(); hud(c, t, g, info, si); c.restore();
  post(info, t, g);
  return R.out;
}
