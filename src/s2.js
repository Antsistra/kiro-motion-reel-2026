'use strict';
/* ===== SCENE 2 · beats 6-12 · FORM: grid -> perspective -> phyllotaxis -> zoom-through ===== */
const S2 = { cells: null };
function s2init() {
  const cells = [];
  for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) {
    const x = 60 + 120 * i, y = 60 + 120 * j, dx = x - W / 2, dy = y - H / 2;
    cells.push({ i, j, x, y, d: Math.hypot(dx, dy) / Math.hypot(W / 2, H / 2), h: rnd(i * 13.7 + j * 5.3) });
  }
  const order = cells.map((_, k) => k).sort((a, b) => cells[a].d - cells[b].d || a - b);
  order.forEach((k, r) => (cells[k].rank = r));
  S2.cells = cells;
}
const S2COL = [[0, PAL.violet], [0.3, PAL.coral], [0.55, PAL.amber], [0.78, PAL.lime], [1, PAL.cyan]];

function scene2(c, l, g) {
  if (!S2.cells) s2init();
  const sh = kickEnv(g) * 5; c.translate((rnd(g * 31) - 0.5) * sh, (rnd(g * 17) - 0.5) * sh);
  const cx = W / 2, cy = H / 2, kk = kickEnv(g);
  // background
  const flat = '#16073D';
  c.fillStyle = flat; c.fillRect(-40, -40, W + 80, H + 80);
  const bgA = smooth(0, 0.8, l);
  const gr = c.createRadialGradient(cx, cy, 50, cx, cy, 1250);
  gr.addColorStop(0, rgba('#34108A', bgA)); gr.addColorStop(1, rgba('#0A0320', bgA));
  c.fillStyle = gr; c.fillRect(-40, -40, W + 80, H + 80);
  // faint big outline word
  c.save(); font(c, 760, 'black'); c.textAlign = 'center'; c.strokeStyle = rgba(PAL.lilac, 0.07 * bgA); c.lineWidth = 3;
  c.strokeText('FORM', cx + Math.sin(l * 0.5) * 40, cy + 270); c.restore();

  // phases
  const tilt = 0.95 * E.inOutCubic(inv(2.4, 3.3, l)) - 0.95 * E.inOutCubic(inv(4.0, 4.7, l));
  const rz = -0.16 * Math.sin(tilt * Math.PI / 0.95 * 0.5) * (tilt > 0 ? 1 : 0);
  const spiralQ = inv(4.3, 5.2, l);
  const zoom = 1 + E.inExpo(inv(5.15, 6.0, l)) * 12;
  const spinA = l * 0.35 + 0.0;
  const cells = S2.cells, f = 1500;

  for (const k of cells) {
    // pop-in (radial stagger)
    const pop = E.outBack(inv(0.0 + k.d * 0.9, 0.55 + k.d * 0.9, l), 2.2);
    if (pop <= 0.001) continue;
    // beat ripple
    const ph = fract(l), ring = ph * 1.7, w = Math.exp(-Math.pow(k.d - ring, 2) / 0.025) * Math.exp(-ph * 2.0) * (l > 0.9 ? 1 : 0);
    const m = smooth(0.15, 0.85, 0.5 + 0.5 * Math.sin(l * 1.7 - k.d * 6 + k.h));
    let size = 104 * pop * (1 + 0.45 * w) * (1 - 0.18 * kk * (1 - k.d));
    let rot = E.inOutCubic(m) * Math.PI / 2 + w * 0.9 + (1 - pop) * 2.2;
    const rad = lerp(size / 2, size * 0.16, m);

    // projection
    let x0 = k.x - cx, y0 = k.y - cy;
    const cz = Math.cos(rz), sz = Math.sin(rz);
    let x1 = x0 * cz - y0 * sz, y1 = x0 * sz + y0 * cz;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const y2 = y1 * ct, z = y1 * st, p = f / (f - z) * (1 + 0.12 * Math.sin(tilt * 3.3) * 0);
    let px = cx + x1 * p * (1 + 0.12 * tilt), py = cy + y2 * p * (1 + 0.12 * tilt), sc = p * (1 + 0.12 * tilt), squash = ct;

    // phyllotaxis target
    if (spiralQ > 0) {
      const q = E.inOutExpo(clamp(spiralQ * 1.5 - (k.rank / 143) * 0.5));
      const n = k.rank, r = 41 * Math.sqrt(n + 0.6), a = n * 2.399963 + spinA * (1 + n * 0.0015);
      const breathe = 1 + 0.06 * Math.sin(l * TAU * 0.5 - n * 0.05) + 0.1 * kk;
      const tx = cx + Math.cos(a) * r * breathe, ty = cy + Math.sin(a) * r * breathe;
      px = lerp(px, tx, q); py = lerp(py, ty, q);
      const tsize = 18 + 0.07 * r + 6 * Math.sin(l * 5 - n * 0.2);
      size = lerp(size, tsize * pop, q); squash = lerp(squash, 1, q); sc = lerp(sc, 1, q);
      rot = lerp(rot, a + l, q);
    }
    if (zoom > 1) { px = cx + (px - cx) * zoom; py = cy + (py - cy) * zoom; size *= zoom; }
    if (px < -300 || px > W + 300 || py < -300 || py > H + 300) continue;

    const u = 0.5 + 0.5 * Math.sin(k.i * 0.21 + k.j * 0.27 + l * 0.9);
    let col = k.h > 0.93 ? PAL.paper : str3(ramp(S2COL, u));
    const S = size * sc;
    c.save(); c.translate(px, py); c.scale(1, squash); c.rotate(rot);
    c.beginPath(); c.roundRect(-S / 2, -S / 2, S, S, Math.max(0, rad * sc)); 
    if (k.h > 0.8 && k.h <= 0.93) { c.strokeStyle = col; c.lineWidth = Math.max(2, 6 * sc); c.stroke(); }
    else { c.fillStyle = col; c.fill(); }
    c.restore();
  }

  // phase label
  const labels = [[0, 'GRID  /  16 × 9'], [2.4, 'PERSPECTIVE  /  3D TILT'], [4.3, 'PHYLLOTAXIS  /  137.5°']];
  let li = 0; labels.forEach((q, i) => { if (l >= q[0]) li = i; });
  const lt = inv(labels[li][0], labels[li][0] + 0.3, l);
  c.save(); c.globalAlpha = E.outCubic(lt) * (1 - inv(5.3, 5.6, l)); c.fillStyle = PAL.paper; font(c, 22, 'mono'); c.letterSpacing = '4px'; c.textAlign = 'right';
  c.fillText(labels[li][1], W - 66, H - 80 + (1 - E.outCubic(lt)) * 24); c.restore();

  // cover circle to next scene
  if (l > 5.45) {
    c.fillStyle = '#07070D'; circle(c, cx, cy, E.inCubic(inv(5.45, 6.0, l)) * 2300);
  }
  return { hud: PAL.paper, ca: 1 + 3.5 * kk + 10 * E.inExpo(inv(5.2, 6, l)), bloom: 0.5 };
}
SCENES.push({ start: 6, end: 12, fn: scene2 });
