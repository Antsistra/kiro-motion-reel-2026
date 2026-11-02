'use strict';
/* ===== SCENE 3 · beats 12-18 · FLOW: curl-noise streamlines -> liquid-chrome metaballs ===== */
const S3 = {};
function s3init() {
  S3.lines = Array.from({ length: 300 }, (_, i) => ({
    x: rnd(i * 1.7) * (W + 400) - 200, y: rnd(i * 2.3 + 5) * (H + 400) - 200,
    h: rnd(i * 3.1 + 9), sp: 0.12 + rnd(i * 4.7) * 0.22, w: 1.4 + rnd(i * 5.9) * 3.6, c: rnd(i * 7.3), st: 0.1 + rnd(i * 6.1) * 0.9,
  }));
  S3.RW = 960; S3.RH = 540;
  S3.buf = mk(S3.RW, S3.RH); S3.bctx = S3.buf.getContext('2d'); S3.img = S3.bctx.createImageData(S3.RW, S3.RH);
  // chrome environment LUT
  const stops = [[0, '#0a0230'], [0.2, PAL.violet], [0.38, PAL.coral], [0.5, '#ffe2b0'], [0.55, '#ffffff'], [0.58, '#140a3a'], [0.72, '#2b1a8a'], [0.88, PAL.cyan], [1, '#e9ffff']];
  S3.lut = new Float32Array(256 * 3);
  for (let i = 0; i < 256; i++) { const c = ramp(stops, i / 255); S3.lut.set(c, i * 3); }
  S3.blobs = [
    [380, 180, 0.9, 190], [300, 260, 1.3, 150], [520, 120, 0.7, 130], [260, 300, 1.1, 120], [440, 220, 1.6, 100],
    [330, 160, 0.8, 95], [200, 330, 1.4, 80], [560, 100, 0.6, 70], [150, 250, 1.0, 60],
  ].map((b, i) => ({ ax: b[0], ay: b[1], w: b[2], r: b[3], ph: rnd(i * 8.3) * TAU }));
}

function s3flow(c, l, g, a) {
  const T = l * 0.11 + kickEnv(g) * 0.04;
  const cols = [[0, PAL.violet], [0.35, PAL.cyan], [0.65, PAL.lime], [1, PAL.coral]];
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < S3.lines.length; i++) {
    const L = S3.lines[i];
    const born = E.outCubic(inv(0.05 + L.h * 0.9, 0.9 + L.h * 0.9, l)); if (born <= 0.01) continue;
    const N = 64, step = 13;
    let x = L.x, y = L.y; const pts = [[x, y]];
    for (let k = 0; k < N; k++) {
      const ang = noise3(x * 0.0015, y * 0.0015, T + L.c * 0.2) * TAU * 1.5;
      x += Math.cos(ang) * step; y += Math.sin(ang) * step; pts.push([x, y]);
    }
    const win = 28 * born, pos = fract(l * L.sp + L.h) * (N - 28);
    const a0 = Math.floor(pos), a1 = Math.min(N, Math.floor(pos + win));
    const col = str3(ramp(cols, fract(L.c + l * 0.05)));
    for (let seg = 0; seg < 4; seg++) {
      const s0 = a0 + Math.floor(((a1 - a0) * seg) / 4), s1 = a0 + Math.floor(((a1 - a0) * (seg + 1)) / 4) + 1;
      if (s1 <= s0 + 1) continue;
      c.beginPath(); c.moveTo(pts[s0][0], pts[s0][1]);
      for (let k = s0 + 1; k <= Math.min(s1, N); k++) c.lineTo(pts[k][0], pts[k][1]);
      c.strokeStyle = col; c.globalAlpha = Math.min(1, a * (0.18 + 0.4 * seg) * (0.5 + L.st) + 0.05); c.lineWidth = L.w * (0.45 + seg * 0.3);
      c.stroke();
    }
    c.globalAlpha = a * L.st; c.fillStyle = col; circle(c, pts[Math.min(N, a1)][0], pts[Math.min(N, a1)][1], L.w * 0.9);
  }
  c.globalAlpha = 1;
}

function s3metal(c, l, g) {
  const RW = S3.RW, RH = S3.RH, d = S3.img.data, kk = kickEnv(g);
  const appear = inv(2.5, 3.5, l), rs = E.outElastic(inv(2.5, 3.4, l)), orb = E.outCubic(appear);
  const merge = E.inOutCubic(inv(4.7, 5.4, l)), flood = E.inExpo(inv(5.0, 6.0, l));
  const B = S3.blobs.map((b, i) => {
    const sp = 1 - 0.85 * merge;
    const x = (W / 2 + Math.cos(b.w * l * 1.1 + b.ph) * b.ax * orb * sp) / 2;
    const y = (H / 2 + Math.sin(b.w * l * 1.35 + b.ph * 1.7) * b.ay * orb * sp) / 2;
    let r = (b.r / 2) * rs * (1 + 0.1 * kk) * (1 + 0.1 * Math.sin(l * 3 + i)) * (1 + 0.5 * merge * (i === 0));
    if (i === 0) r += flood * 1400;
    return [x, y, r * r];
  });
  const lut = S3.lut, nb = B.length;
  const Lx = -0.5, Ly = -0.6, Lz = 0.62, ln = Math.hypot(Lx, Ly, Lz), lx = Lx / ln, ly = Ly / ln, lz = Lz / ln;
  let p = 0;
  for (let y = 0; y < RH; y++) {
    for (let x = 0; x < RW; x++, p += 4) {
      let f = 0, gx = 0, gy = 0, dmx = 0, dmy = 0;
      for (let b = 0; b < nb; b++) {
        const q = B[b], dx = x - q[0], dy = y - q[1], d2 = dx * dx + dy * dy + 1e-3, s = q[2] / d2;
        f += s; const k = (-2 * s) / d2; gx += k * dx; gy += k * dy;
        const ir = 1 / q[2], qq = 1 / (1 + d2 * ir), q3 = qq * qq * qq * -4 * ir; dmx += q3 * dx; dmy += q3 * dy;
      }
      if (f < 0.9) { d[p + 3] = 0; continue; }
      const gm = Math.sqrt(gx * gx + gy * gy) + 1e-6;
      const alpha = clamp((f - 1) / gm + 0.5);
      if (alpha <= 0) { d[p + 3] = 0; continue; }
      const e3 = Math.exp(-3 * (f - 1)), hh = (26 * 3 * e3) / (2 * Math.sqrt(Math.max(1 - e3, 0.012)));
      const hx = gx * hh + dmx * 60, hy = gy * hh + dmy * 60;
      const inl = 1 / Math.sqrt(hx * hx + hy * hy + 1), nx = -hx * inl, ny = -hy * inl, nz = inl;
      const rx = 2 * nz * nx, ry = 2 * nz * ny;
      let u = ry * 0.5 + 0.5 + 0.1 * Math.sin(rx * 4.0 + l * 0.8 + ry * 2);
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const li = ((u * 255) | 0) * 3;
      let r = lut[li], gg = lut[li + 1], bl = lut[li + 2];
      const nl = nx * lx + ny * ly + nz * lz, spec = nl > 0 ? Math.pow(nl, 70) * 255 : 0;
      const fres = Math.pow(1 - nz, 2.5), fr = fres * 140;
      r = r * 0.92 + spec + fr * 0.55; gg = gg * 0.92 + spec + fr * 0.95; bl = bl * 0.92 + spec + fr;
      d[p] = r > 255 ? 255 : r; d[p + 1] = gg > 255 ? 255 : gg; d[p + 2] = bl > 255 ? 255 : bl; d[p + 3] = alpha * 255;
    }
  }
  S3.bctx.putImageData(S3.img, 0, 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  // soft drop glow under the metal
  c.globalAlpha = 0.35 * appear; c.drawImage(S3.buf, -12, 14, W + 24, H + 24); c.globalAlpha = 1;
  c.drawImage(S3.buf, 0, 0, W, H);
}

function scene3(c, l, g) {
  if (!S3.lines) s3init();
  const kk = kickEnv(g), sh = kk * 5; c.translate((rnd(g * 41) - 0.5) * sh, (rnd(g * 23) - 0.5) * sh);
  c.fillStyle = '#07070D'; c.fillRect(-40, -40, W + 80, H + 80);
  const gr = c.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 1200); gr.addColorStop(0, '#16093F'); gr.addColorStop(1, '#07070D');
  c.globalAlpha = smooth(0, 1, l); c.fillStyle = gr; c.fillRect(-40, -40, W + 80, H + 80); c.globalAlpha = 1;

  // giant outline word, sliding
  c.save(); font(c, 900, 'black'); c.textAlign = 'center'; c.strokeStyle = rgba(PAL.lilac, 0.16); c.lineWidth = 3;
  const wx = W / 2 - (l - 3) * 70; c.strokeText('FLOW', wx, H / 2 + 320);
  c.restore();

  s3flow(c, l, g, 1 - 0.35 * smooth(2.5, 3.5, l));
  if (l > 2.45) s3metal(c, l, g);

  // shockwave rings on the beat
  for (let k = 0; k < 2; k++) {
    const q = fract(l - k * 0.5) ; if (l < 3.0) break;
    const rr = q * 900; c.strokeStyle = rgba(PAL.cyan, 0.2 * (1 - q)); c.lineWidth = 2; c.beginPath(); c.arc(W / 2, H / 2, rr, 0, TAU); c.stroke();
  }

  // label
  const labels = [[0, 'CURL NOISE  /  300 STREAMLINES'], [2.5, 'IMPLICIT SURFACE  /  9 METABALLS']];
  let li = 0; labels.forEach((q, i) => { if (l >= q[0]) li = i; });
  const lt = inv(labels[li][0], labels[li][0] + 0.3, l);
  c.save(); c.globalAlpha = E.outCubic(lt) * (1 - inv(5.3, 5.6, l)); c.fillStyle = PAL.paper; font(c, 22, 'mono'); c.letterSpacing = '4px'; c.textAlign = 'right';
  c.fillText(labels[li][1], W - 66, H - 80 + (1 - E.outCubic(lt)) * 24); c.restore();

  // flood into the light scene
  const fq = inv(5.55, 6.0, l);
  if (fq > 0) { c.fillStyle = '#EDEAE2'; circle(c, W / 2, H / 2, E.inCubic(fq) * 2300); }
  return { hud: fq > 0.3 ? PAL.ink : PAL.paper, ca: 1 + 3 * kk, bloom: 0.55 * (1 - fq), vig: 1 - 0.7 * fq };
}
SCENES.push({ start: 12, end: 18, fn: scene3 });
