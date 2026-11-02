'use strict';
/* ===== SCENE 5 · beats 24-32 · SYSTEMS: marquee -> counters -> particle logo -> lockup ===== */
const S5 = { pts: null };
const LOGO = { text: 'KIRO', track: -2, cy: H / 2 - 70 };
function s5init() {
  const cv = mk(W, H), x = cv.getContext('2d');
  const size = fitSize(x, LOGO.text, 'black', 1240, 330); LOGO.size = size; LOGO.cap = size * CAP; LOGO.base = LOGO.cy + LOGO.cap / 2;
  const lay = layoutText(x, LOGO.text, size, LOGO.track); LOGO.lay = lay; LOGO.x0 = W / 2 - lay.width / 2;
  x.fillStyle = '#fff'; font(x, size, 'black'); x.textBaseline = 'alphabetic';
  for (const L of lay.list) x.fillText(L.ch, LOGO.x0 + L.x, LOGO.base);
  const d = x.getImageData(0, 0, W, H).data, pts = [], step = 5;
  for (let y = 0; y < H; y += step) for (let xx = 0; xx < W; xx += step) if (d[(y * W + xx) * 4 + 3] > 128) pts.push({ hx: xx, hy: y });
  pts.forEach((p, i) => {
    const a = rnd(i * 1.37) * TAU, rr = 700 + rnd(i * 2.11) * 900;
    p.sx = W / 2 + Math.cos(a) * rr * 1.5; p.sy = H / 2 + Math.sin(a) * rr * 0.9;
    p.d = rnd(i * 3.7); p.sw = (rnd(i * 5.1) - 0.5) * 2; p.t = rnd(i * 9.9); p.s = 3 + rnd(i * 7.7) * 3.5;
    p.col = str3(ramp([[0, PAL.violet], [0.3, PAL.coral], [0.55, PAL.amber], [0.78, PAL.lime], [1, PAL.cyan]], (p.hx - LOGO.x0) / lay.width));
  });
  S5.pts = pts; S5.rows = [
    { t: 'TYPOGRAPHY  •  3D  •  SHADERS  •  PARTICLES  •  EASING  •  RIGGING  •  ', dir: 1, y: 300, mode: 'fill', col: PAL.paper, sp: 520 },
    { t: 'KINETIC TYPE  •  LIQUID  •  GENERATIVE  •  CAMERA  •  SOUND  •  ', dir: -1, y: 575, mode: 'stroke', col: PAL.coral, sp: 700 },
    { t: 'FORM  •  FLOW  •  DEPTH  •  SYSTEMS  •  TIMING  •  SPACING  •  ', dir: 1, y: 850, mode: 'fill', col: PAL.lime, sp: 440 },
  ];
}
function s5layer() { if (!S5.layer || S5.layer.width !== R.pw) { S5.layer = mk(R.pw, R.ph); S5.lctx = S5.layer.getContext('2d'); } return S5.lctx; }

function scene5(c, l, g) {
  if (!S5.pts) s5init();
  const kk = kickEnv(g), cx = W / 2, info = { hud: PAL.paper };
  const sh = kk * 6 + 26 * Math.exp(-(l - 4) * 9) * (l > 4 ? 1 : 0); c.translate((rnd(g * 33) - 0.5) * sh, (rnd(g * 63) - 0.5) * sh);
  c.fillStyle = PAL.ink; c.fillRect(-60, -60, W + 120, H + 120);

  // ambient glow once the logo lands
  const land = l >= 4 ? 1 : 0;
  if (l > 3.2) {
    const gl = c.createRadialGradient(cx, LOGO.cy, 40, cx, LOGO.cy, 900);
    const a = (0.22 * inv(3.2, 4.0, l) + 0.18 * land * Math.exp(-(l - 4) * 2.4)) + 0.05 * kk;
    gl.addColorStop(0, rgba(PAL.violet, a * 1.6)); gl.addColorStop(1, rgba(PAL.violet, 0));
    c.fillStyle = gl; c.fillRect(0, 0, W, H);
  }

  /* --- A · marquee rows (l 0 -> 1.8) --- */
  if (l < 1.9) {
    font(c, 250, 'cond'); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.letterSpacing = '0px';
    S5.rows.forEach((r, i) => {
      const sy = E.outExpo(inv(0.02 + i * 0.07, 0.42 + i * 0.07, l)) * (i === 1 ? 1 - E.inCubic(inv(1.3, 1.8, l)) : 1);
      if (sy <= 0.01) return;
      const out = E.inCubic(inv(1.3, 1.85, l)) * (i === 0 ? -620 : i === 2 ? 620 : 0);
      const w = c.measureText(r.t).width, off = -(((l * r.sp * 0.5 * r.dir) % w) + w) % w;
      c.save(); c.translate(0, r.y + out); c.scale(1, sy);
      c.shadowBlur = 0;
      if (r.mode === 'stroke') { c.strokeStyle = r.col; c.lineWidth = 4; c.lineJoin = 'round'; } else c.fillStyle = r.col;
      for (let x = off - w; x < W + w; x += w) { if (r.mode === 'stroke') c.strokeText(r.t, x, 0); else c.fillText(r.t, x, 0); }
      c.restore();
      // beat-synced highlight bar
      c.fillStyle = rgba(r.col, 0.12 * kk * sy); c.fillRect(0, r.y + out - 200 * sy, W, 235 * sy);
    });
  }

  /* --- B · counters (l 1.4 -> 3.4) --- */
  if (l > 1.4 && l < 3.5) {
    const shrink = E.inExpo(inv(2.8, 3.4, l));
    const stats = [
      { x: 330, v: 900, from: 0, lab: 'FRAMES RENDERED', col: PAL.cyan },
      { x: 960, v: 60, from: 0, lab: 'FRAMES PER SECOND', col: PAL.amber },
      { x: 1590, v: 0, from: 99, lab: 'STOCK FOOTAGE', col: PAL.coral },
    ];
    stats.forEach((s, i) => {
      const q = E.outExpo(inv(1.45 + i * 0.16, 2.2 + i * 0.16, l));
      if (q <= 0.005) return;
      const val = Math.round(lerp(s.from, s.v, E.outExpo(inv(1.5 + i * 0.16, 2.5 + i * 0.16, l))));
      c.save(); c.translate(lerp(s.x, cx, shrink), LOGO.cy + 30); c.scale(1 - shrink, 1 - shrink); c.globalAlpha = q * (1 - shrink);
      font(c, 400, 'cond'); c.textAlign = 'center'; c.fillStyle = PAL.paper; c.letterSpacing = '0px';
      c.fillText(String(val), 0, 150 + (1 - q) * 160);
      c.fillStyle = s.col; c.fillRect(-170, -190 + 0, 340 * q, 6);
      font(c, 24, 'mono'); c.letterSpacing = '5px'; c.fillStyle = s.col; c.fillText(s.lab, 0, 215);
      c.restore();
    });
    // dividers
    c.save(); c.strokeStyle = rgba(PAL.paper, 0.22 * (1 - shrink)); c.lineWidth = 2;
    for (const x of [645, 1275]) { const q = E.outCubic(inv(1.5, 2.1, l)); c.beginPath(); c.moveTo(x, LOGO.cy - 200 * q); c.lineTo(x, LOGO.cy + 260 * q); c.stroke(); }
    c.restore();
  }

  /* --- C · particles assemble the logo --- */
  if (l > 2.9) {
    const burst = l > 4 ? Math.exp(-(l - 4) * 6) : 0;
    c.globalCompositeOperation = 'lighter';
    for (const p of S5.pts) {
      const s0 = 3.0 + p.d * 0.4, q = inv(s0, s0 + 0.6, l), e = E.inOutCubic(q) ;
      if (q <= 0) continue;
      const sw = Math.sin(e * Math.PI) * 260 * p.sw * (1 - q * 0.0);
      let x = lerp(p.sx, p.hx, E.outCubic(q)) + sw * 0.6, y = lerp(p.sy, p.hy, E.outCubic(q)) + sw;
      if (burst > 0.01) { const dx = p.hx - cx, dy = p.hy - LOGO.cy, n = Math.hypot(dx, dy) + 1; x += (dx / n) * burst * 120 * p.t; y += (dy / n) * burst * 120 * p.t; }
      const tw = 0.55 + 0.45 * Math.sin(l * 7 + p.t * 40);
      const a = (q < 1 ? 0.95 : 0.55 * tw) * (l > 4.25 ? 1 - 0.8 * inv(4.25, 4.9, l) : 1);
      c.globalAlpha = a; c.fillStyle = p.col; const sz = p.s * (q < 1 ? 1 : 1 + burst);
      c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  /* --- D · lockup (l 4 -> 8) --- */
  if (l >= 4) {
    // shockwave rings
    for (let k = 0; k < 3; k++) {
      const q = inv(4 + k * 0.06, 5.2 + k * 0.06, l); if (q <= 0 || q >= 1) continue;
      c.strokeStyle = rgba(k === 0 ? '#ffffff' : k === 1 ? PAL.cyan : PAL.coral, (1 - q) * 0.9); c.lineWidth = 12 * (1 - q) + 1;
      c.beginPath(); c.arc(cx, LOGO.cy, E.outExpo(q) * 1500, 0, TAU); c.stroke();
    }
    // radar ring with ticks (behind the logo) + scrolling ticker bands
    const bq = E.outExpo(inv(4.2, 5.0, l)), R0 = 560 * bq;
    if (bq > 0.01) {
      c.save(); c.translate(cx, LOGO.cy); c.globalAlpha = bq * 0.5;
      c.strokeStyle = PAL.paper; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R0 - 36, 0, TAU); c.stroke();
      c.lineWidth = 3;
      for (let i = 0; i < 144; i++) { const a = (i / 144) * TAU + l * 0.1, r1 = R0, r2 = r1 + (i % 6 === 0 ? 22 : 9); c.beginPath(); c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke(); }
      c.restore();
      const unit = 'MOTION DESIGN  •  KINETIC TYPE  •  3D  •  GENERATIVE ART  •  SOUND  •  TIMING  •  ';
      font(c, 22, 'mono'); c.letterSpacing = '6px'; c.textAlign = 'left'; c.fillStyle = PAL.paper;
      const uw = c.measureText(unit).width;
      [[LOGO.cy - 250, -1], [LOGO.cy + 340, 1]].forEach(([y, dir]) => {
        c.save(); c.globalAlpha = bq * 0.6; c.beginPath(); c.rect(cx - 800 * bq, y - 30, 1600 * bq, 44); c.clip();
        const off = (((l * 140 * dir) % uw) + uw) % uw;
        for (let x = -uw + off; x < W + uw; x += uw) c.fillText(unit, x, y);
        c.restore();
      });
    }

    // solid logo through an offscreen layer so gradient + shine are clipped to the glyphs
    const lx = s5layer(); lx.setTransform(R.scale, 0, 0, R.scale, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, H);
    const track = lerp(60, LOGO.track, E.outExpo(inv(4.0, 4.7, l)));
    const lay = layoutText(lx, LOGO.text, LOGO.size, track), x0 = cx - lay.width / 2;
    lay.list.forEach((L, i) => {
      const q = E.outCubic(inv(4.0 + i * 0.03, 4.3 + i * 0.03, l)); if (q <= 0) return;
      lx.save(); lx.translate(x0 + L.x + L.w / 2, LOGO.base - LOGO.cap / 2); const s = lerp(1.18, 1, q) * (1 + 0.025 * kk); lx.scale(s, s); lx.globalAlpha = q;
      font(lx, LOGO.size, 'black'); lx.textAlign = 'center'; lx.fillStyle = '#fff'; lx.fillText(L.ch, 0, LOGO.cap / 2); lx.restore();
    });
    lx.globalCompositeOperation = 'source-atop';
    const gr = lx.createLinearGradient(x0, 0, x0 + lay.width, 0);
    const pos = l * 0.05; gr.addColorStop(0, PAL.violet); gr.addColorStop(0.35, PAL.coral); gr.addColorStop(0.7, PAL.amber); gr.addColorStop(1, PAL.lime);
    lx.fillStyle = gr; lx.fillRect(0, 0, W, H);
    // diagonal shine sweeps
    for (const [a, b] of [[4.35, 5.2], [6.7, 7.5]]) {
      const q = inv(a, b, l); if (q <= 0 || q >= 1) continue;
      const sx = lerp(x0 - 300, x0 + lay.width + 300, E.inOutCubic(q));
      const sg = lx.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      lx.save(); lx.translate(sx, LOGO.cy); lx.transform(1, 0, -0.35, 1, 0, 0); lx.translate(-sx, -LOGO.cy); lx.fillStyle = sg; lx.fillRect(sx - 130, LOGO.cy - 300, 260, 600); lx.restore();
    }
    // gentle floating
    c.save(); c.translate(0, Math.sin(l * 1.6) * 5);
    c.shadowColor = rgba(PAL.violet, 0.8); c.shadowBlur = 50;
    c.drawImage(S5.layer, 0, 0, W, H); c.shadowBlur = 0; c.restore();

    // subtitle with wipe + line
    const sq = E.outCubic(inv(4.5, 5.1, l));
    if (sq > 0) {
      c.save(); font(c, 30, 'mono'); c.letterSpacing = '14px'; c.textAlign = 'center'; c.fillStyle = PAL.paper;
      c.beginPath(); c.rect(cx - 520 * sq, LOGO.base + 20, 1040 * sq, 120); c.clip();
      c.fillText('MOTION DESIGN REEL', cx + 7, LOGO.base + 78);
      c.restore();
      c.fillStyle = PAL.paper; c.fillRect(cx - 520 * sq, LOGO.base + 100, 1040 * sq, 3);
      c.fillStyle = PAL.coral; circle(c, cx - 520 * sq, LOGO.base + 101.5, 7); circle(c, cx + 520 * sq, LOGO.base + 101.5, 7);
    }
    // tagline: letters drop in
    const tag = 'LET\u2019S MAKE SOMETHING MOVE.', tsz = 56;
    const tl = layoutText(c, tag, tsz, 2, 'cond'); const tx0 = cx - tl.width / 2, ty = 920;
    tl.list.forEach((L, i) => {
      const q = E.outBack(inv(5.5 + i * 0.022, 5.9 + i * 0.022, l), 1.8); if (q <= 0) return;
      c.save(); c.globalAlpha = clamp(q * 1.4); font(c, tsz, 'cond'); c.textAlign = 'center'; c.fillStyle = i >= tag.length - 5 ? PAL.lime : PAL.paper;
      c.fillText(L.ch, tx0 + L.x + L.w / 2, ty - (1 - q) * 60); c.restore();
    });
    // tagline underline blip
    c.fillStyle = PAL.lime; c.fillRect(tx0, ty + 18, tl.width * E.outExpo(inv(6.0, 6.7, l)), 4);
  }

  info.flash = l < 0.5 ? 0.55 * Math.exp(-l * 14) : (l >= 4 ? 0.85 * Math.exp(-(l - 4) * 16) : 0);
  info.fade = inv(7.8, 8.0, l);
  info.ca = 0.8 + 3 * kk + (l >= 4 ? 16 * Math.exp(-(l - 4) * 9) : 0) + (l < 0.5 ? 14 * Math.exp(-l * 10) : 0);
  info.bloom = 0.6 + (l >= 4 ? 0.5 * Math.exp(-(l - 4) * 3) : 0);
  return info;
}
SCENES.push({ start: 24, end: 32, fn: scene5 });
