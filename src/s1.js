'use strict';
/* ===== SCENE 1 · beats 0-6 · kinetic typography: "I / MAKE / THINGS / MOVE." ===== */

// Draw a word letter-by-letter. stateFn(i, n, dl) -> {dx,dy,sx,sy,rot,a} where dl is a beat-offset for motion trails.
function drawWord(c, str, cx, baseY, size, track, stateFn, style, ghosts = 0, gdt = 0.03, weight = 'black') {
  const lay = layoutText(c, str, size, track, weight);
  const capH = size * CAP, n = lay.list.length, x0 = cx - lay.width / 2;
  for (let j = ghosts; j >= 0; j--) {
    for (let i = 0; i < n; i++) {
      const L = lay.list[i], s = stateFn(i, n, -j * gdt); if (!s || s.a <= 0.003) continue;
      c.save();
      c.translate(x0 + L.x + L.w / 2 + (s.dx || 0), baseY - capH / 2 + (s.dy || 0));
      if (s.rot) c.rotate(s.rot);
      c.scale(s.sx === undefined ? 1 : s.sx, s.sy === undefined ? 1 : s.sy);
      c.globalAlpha = s.a * (j === 0 ? 1 : (1 - j / (ghosts + 1)) * 0.28);
      font(c, size, weight); c.textBaseline = 'alphabetic'; c.textAlign = 'center';
      style(c, L.ch, 0, capH / 2, i, j);
      c.restore();
    }
  }
  return { x0, width: lay.width, list: lay.list, capH };
}
const fillStyle = (col) => (c, ch, x, y) => { c.fillStyle = col; c.fillText(ch, x, y); };

function glitchSlices(c, n, amp, seed, y0 = 0, y1 = H) {
  const S = R.scale;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const h = (20 + rnd(seed + i * 3.1) * 90) * S, y = (y0 + rnd(seed + i * 7.7) * (y1 - y0)) * S;
    const dx = (rnd(seed + i * 1.9) - 0.5) * 2 * amp * S;
    c.drawImage(R.sc, 0, y, R.pw, h, dx, y, R.pw, h);
  }
  c.restore();
}

function scene1(c, l, g) {
  const sh = kickEnv(g) * 7;
  c.translate((rnd(g * 91) - 0.5) * sh, (rnd(g * 57) - 0.5) * sh);
  c.fillStyle = PAL.ink; c.fillRect(-50, -50, W + 100, H + 100);
  const cx = W / 2, cy = H / 2, info = { hud: PAL.paper };

  /* A · "I" punches open from a violet iris */
  {
    const r = E.outExpo(inv(0, 0.7, l)) * 1500;
    c.fillStyle = PAL.violet; circle(c, cx, cy, r);
    // concentric ripple rings
    for (let k = 1; k <= 3; k++) {
      const rr = E.outExpo(inv(0.05 * k, 0.9 + 0.05 * k, l)) * 1500;
      c.strokeStyle = rgba(PAL.lilac, 0.55 * (1 - inv(0.2, 1, l))); c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, rr * 0.8, 0, TAU); c.stroke();
    }
    if (l < 1.6) {
      const size = 1000, st = (i, n, dl) => {
        const q = inv(0.0, 0.45, l + dl);
        return { sx: lerp(0.15, 1, E.outBack(q, 2.4)), sy: lerp(0.15, 1, E.outBack(q, 2.4)), a: q > 0 ? 1 : 0, dy: (1 - E.outCubic(q)) * 80 };
      };
      drawWord(c, 'I', cx, cy + size * CAP / 2, size, 0, st, fillStyle(PAL.paper), 4, 0.025);
    }
  }

  /* B · lime slab, "MAKE" drops in */
  if (l >= 1.0) {
    const x = lerp(-420, W + 520, E.outCubic(inv(1.0, 1.32, l)));
    slab(c, x, PAL.lime, 1, 260);
    if (l > 1.02) {
      const size = fitSize(c, 'MAKE', 'black', 1700, 640);
      const st = (i, n, dl) => {
        const q = inv(1.05 + i * 0.05, 1.5 + i * 0.05, l + dl);
        return { dy: -(1 - E.outBack(q, 1.3)) * 1000, rot: (1 - E.outCubic(q)) * (i % 2 ? 0.5 : -0.5), a: q > 0 ? 1 : 0, sy: lerp(1.4, 1, E.outCubic(q)), sx: lerp(0.8, 1, E.outCubic(q)) };
      };
      drawWord(c, 'MAKE', cx, cy + size * CAP / 2, size, -6, st, fillStyle(PAL.ink), 4, 0.03);
      // small annotation
      const a = ease(E.outCubic, 1.4, 1.8, l);
      c.save(); c.globalAlpha = a; c.fillStyle = PAL.ink; font(c, 28, 'mono'); c.letterSpacing = '6px';
      c.fillText('(MOTION DESIGN)', 150, 250 - (1 - a) * 30); c.restore();
    }
    if (l < 2.3) info.hud = PAL.ink;
  }

  /* C · coral bars, "THINGS" flips up */
  if (l >= 2.0) {
    const bars = 6, bh = H / bars;
    for (let i = 0; i < bars; i++) {
      const q = E.outExpo(inv(2.0 + i * 0.045, 2.38 + i * 0.045, l));
      c.fillStyle = PAL.coral;
      if (i % 2) c.fillRect(W - W * q, i * bh - 1, W * q + 2, bh + 2); else c.fillRect(0, i * bh - 1, W * q, bh + 2);
    }
    if (l > 2.1) {
      const size = fitSize(c, 'THINGS', 'black', 1740, 620);
      const st = (i, n, dl) => {
        const q = inv(2.15 + i * 0.045, 2.55 + i * 0.045, l + dl);
        return { sy: E.outBack(q, 1.9), sx: lerp(1.25, 1, q), dy: (1 - E.outCubic(q)) * 120, a: q > 0 ? 1 : 0 };
      };
      drawWord(c, 'THINGS', cx, cy + size * CAP / 2, size, -4, st, fillStyle(PAL.paper), 4, 0.03);
    }
    // outline kick-echo on beat 2
    if (l < 3 && l > 2.2) { const k = Math.exp(-(l - 2) * 3); c.strokeStyle = rgba('#ffffff', 0.5 * k); c.lineWidth = 3; c.strokeRect(120 - 60 * k, 120 - 60 * k, W - 240 + 120 * k, H - 240 + 120 * k); }
    if (l < 3) info.hud = PAL.paper;
  }

  /* D · hard cut to ink, "MOVE." with stroke echoes, glitch, then it's swallowed by the dot */
  if (l >= 3.0) {
    c.fillStyle = PAL.ink; c.fillRect(-50, -50, W + 100, H + 100);
    info.flash = 0.45 * Math.exp(-(l - 3) * 22);
    // radial speed lines
    c.save(); c.translate(cx, cy);
    const nl = 60;
    for (let i = 0; i < nl; i++) {
      const ang = (i / nl) * TAU + rnd(i) * 0.05, sp = 0.6 + rnd(i * 3.3) * 1.1;
      const q = fract(l * sp * 0.9 + rnd(i * 9.1)), r0 = 420 + q * 1100, r1 = r0 + 80 + q * 360;
      c.strokeStyle = rgba(PAL.paper, 0.1 * (1 - q) * ease(E.outCubic, 3.2, 3.8, l)); c.lineWidth = 2 + rnd(i) * 3;
      c.beginPath(); c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); c.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); c.stroke();
    }
    c.restore();

    const size = fitSize(c, 'MOVE.', 'black', 1720, 600);
    const base = cy + size * CAP / 2;
    const absorb = inv(4.55, 5.2, l);                  // letters suck into the full stop
    const lay0 = layoutText(c, 'MOVE.', size, -4);
    const x0 = cx - lay0.width / 2, dotL = lay0.list[4];
    const dotX = x0 + dotL.x + dotL.w / 2, dotY = base - size * 0.06;
    const dirs = [[-1400, 0], [0, -1000], [0, 1100], [1400, 0], [0, -1300]];
    const st = (i, n, dl) => {
      const q = inv(3.0 + i * 0.07, 3.55 + i * 0.07, l + dl);
      const e = E.outBack(q, 1.5);
      let dx = dirs[i][0] * (1 - e), dy = dirs[i][1] * (1 - e), sx = 1, sy = 1, a = q > 0 ? 1 : 0;
      // living idle: gentle wave
      const idle = inv(3.7, 3.9, l) * (1 - absorb);
      dy += Math.sin(l * 6.0 + i * 0.9) * 14 * idle;
      sy *= 1 + Math.sin(l * 6.0 + i * 0.9) * 0.025 * idle;
      if (absorb > 0 && i < 4) {
        const L = lay0.list[i], lx = x0 + L.x + L.w / 2, ly = base - size * CAP / 2;
        const aq = E.inExpo(inv(0, 1, clamp(absorb * 1.3 - i * 0.08)));
        dx += (dotX - lx) * aq; dy += (dotY - ly) * aq; sx = sy = lerp(1, 0.02, aq);
      }
      return { dx, dy, sx, sy, a };
    };
    // stroke echoes
    const echoCols = [PAL.coral, PAL.amber, PAL.lime, PAL.cyan, PAL.lilac];
    const kk = kickEnv(g), echoA = ease(E.outCubic, 3.6, 4.0, l) * (1 - inv(4.4, 4.7, l));
    if (echoA > 0.01) for (let e = 6; e >= 1; e--) {
      const off = e * (10 + 26 * kk), ang = -0.6 + l * 0.7;
      drawWord(c, 'MOVE.', cx + Math.cos(ang) * off, base + Math.sin(ang) * off, size, -4, st,
        (cc, ch, x, y) => { cc.strokeStyle = echoCols[e % 5]; cc.lineWidth = 4; cc.lineJoin = 'round'; cc.strokeText(ch, x, y); }, 0).x0;
      c.globalAlpha = 1;
    }
    // main fill
    drawWord(c, 'MOVE.', cx, base, size, -4, st, (cc, ch, x, y, i) => { cc.fillStyle = i === 4 ? PAL.coral : PAL.paper; cc.fillText(ch, x, y); }, 5, 0.025);

    // glitch hit on the 4th beat
    const gl = Math.exp(-(l - 4.0) * 10);
    if (l > 4.0 && l < 4.5 && gl > 0.05) glitchSlices(c, 9, 130 * gl, Math.floor(l * 30), cy - 330, cy + 330);

    // the dot becomes the next scene
    if (l > 5.0) {
      const q = inv(5.0, 6.0, l);
      const r = lerp(size * 0.07, 2400, E.inExpo(q));
      const sq = 1 - 0.0; // keep round
      c.fillStyle = q < 0.12 ? PAL.coral : '#16073D';
      circle(c, dotX, dotY, r * sq);
      c.fillStyle = '#16073D'; if (q >= 0.12) circle(c, dotX, dotY, r);
    }
  }
  info.ca = 0.8 + 3.2 * kickEnv(g) + (l > 4.0 && l < 4.4 ? 10 * Math.exp(-(l - 4) * 10) : 0);
  return info;
}
SCENES.push({ start: 0, end: 6, fn: scene1 });
