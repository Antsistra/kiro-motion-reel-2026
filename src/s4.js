'use strict';
/* ===== SCENE 4 · beats 18-24 · DEPTH: hand-rolled 3D engine, 27-cubelet twist cube ===== */
const S4 = {
  moves: [[1, 1, 1], [0, -1, -1], [2, 1, 1], [1, -1, -1], [0, 1, 1]], // [axis, layer, dir]
  fcol: { '1,0,0': PAL.coral, '-1,0,0': PAL.amber, '0,1,0': PAL.violet, '0,-1,0': PAL.cyan, '0,0,1': PAL.lime, '0,0,-1': '#FF8A3D' },
  normals: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
};
const rnd3 = (v) => [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
const mStart = (m) => m + 0.15, mDur = 0.8;

function cubeState(l) {
  const cl = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) cl.push({ id: [i, j, k], pos: [i, j, k], O: I3 });
  S4.moves.forEach(([ax, layer, dir], m) => {
    const s = mStart(m), q = inv(s, s + mDur, l); if (q <= 0) return;
    const ang = dir * (Math.PI / 2) * (q >= 1 ? 1 : E.inOutBack(q));
    const Rm = rotAxis(ax, q >= 1 ? dir * Math.PI / 2 : ang);
    for (const cb of cl) if (cb.pos[ax] === layer) {
      cb.pos = q >= 1 ? rnd3(mv(Rm, cb.pos)) : mv(Rm, cb.pos);
      cb.O = mm(Rm, cb.O);
    }
  });
  return cl;
}

function scene4(c, l, g) {
  const kk = kickEnv(g), cx = W / 2, cy = H / 2 - 20;
  const sh = kk * 4; c.translate((rnd(g * 13) - 0.5) * sh, (rnd(g * 71) - 0.5) * sh);
  // backdrop
  const gr = c.createRadialGradient(cx, cy, 50, cx, cy, 1200); gr.addColorStop(0, '#F8F6EF'); gr.addColorStop(1, '#DAD5C8');
  c.fillStyle = gr; c.fillRect(-40, -40, W + 80, H + 80);
  c.fillStyle = 'rgba(11,11,18,0.10)';
  for (let y = 60; y < H; y += 60) for (let x = 60; x < W; x += 60) c.fillRect(x - 1.5, y - 1.5, 3, 3);
  const intro = E.outBack(inv(0, 0.9, l), 1.7);
  c.save(); font(c, 820, 'black'); c.textAlign = 'center'; c.fillStyle = 'rgba(11,11,18,0.055)';
  c.fillText('DEPTH', cx - (l - 3) * 40, cy + 300); c.restore();
  // parallax discs
  c.fillStyle = PAL.coral; circle(c, 430 - (l - 3) * 30, 720 + Math.sin(l) * 20, 300 * intro);
  c.strokeStyle = PAL.violet; c.lineWidth = 14; c.beginPath(); c.arc(1560 + (l - 3) * 45, 330, 210 * intro, 0, TAU); c.stroke();
  c.fillStyle = PAL.lime; circle(c, 1500 + (l - 3) * 20, 800, 70 * intro);

  // camera
  const yaw = 0.55 + l * 0.62, pitch = -0.52 + 0.1 * Math.sin(l * 0.9);
  const Rc = mm(rotX(pitch), rotY(yaw));
  const dist = 9.5, F = 1500;
  const explode = E.outCubic(inv(5.0, 5.5, l)) * 0.9;
  const zoom = 1 + E.inExpo(inv(5.15, 6.0, l)) * 11;
  const scl = intro * (1 + 0.035 * kk) * zoom;
  const proj = (v) => { const z = v[2] + dist; const k = (F / z) * scl; return [cx + v[0] * k, cy + v[1] * k, z]; };

  // ground shadow
  c.save(); c.translate(cx, cy + 410 * scl / zoom); c.scale(1, 0.18);
  const sg = c.createRadialGradient(0, 0, 10, 0, 0, 420 * intro); sg.addColorStop(0, 'rgba(11,11,18,0.35)'); sg.addColorStop(1, 'rgba(11,11,18,0)');
  c.fillStyle = sg; circle(c, 0, 0, 420 * intro * (1 + 0.04 * kk)); c.restore();

  // orbit rings (back half)
  const ringPts = (tilt, rad, ph) => { const a = []; for (let i = 0; i <= 120; i++) { const t = (i / 120) * TAU; a.push(mv(Rc, mv(rotX(tilt), mv(rotY(l * 0.5 + ph), [Math.cos(t) * rad, 0, Math.sin(t) * rad])))); } return a; };
  const rings = [[0.5, 3.5, 0], [-0.9, 4.1, 2]];
  const drawRing = (front) => {
    for (const [tl, rad, ph] of rings) {
      const pts = ringPts(tl, rad, ph).map((v) => ({ v, p: proj(v) }));
      c.strokeStyle = PAL.ink; c.lineWidth = front ? 3.5 : 2; c.globalAlpha = front ? 0.9 : 0.25 * intro;
      c.beginPath(); let pen = false;
      for (let i = 0; i < pts.length; i++) {
        const isFront = pts[i].v[2] < 0; if (isFront !== front) { pen = false; continue; }
        if (!pen) { c.moveTo(pts[i].p[0], pts[i].p[1]); pen = true; } else c.lineTo(pts[i].p[0], pts[i].p[1]);
      }
      c.stroke(); c.globalAlpha = 1;
      // satellite dot
      const t = l * 1.7 + ph, v = mv(Rc, mv(rotX(tl), mv(rotY(l * 0.5 + ph), [Math.cos(t) * rad, 0, Math.sin(t) * rad])));
      if ((v[2] < 0) === front) { const p = proj(v); c.fillStyle = PAL.ink; circle(c, p[0], p[1], 11 * scl / zoom * intro); }
    }
  };
  drawRing(false);

  // cubelets -> faces
  const cl = cubeState(l), faces = [], Ld = [-0.45, -0.8, -0.55]; const ln = Math.hypot(...Ld);
  for (const cb of cl) {
    const ctr = mv(Rc, cb.pos.map((x) => x * (1 + explode)));
    for (const n of S4.normals) {
      const nw = mv(Rc, mv(cb.O, n));
      if (nw[2] >= -0.001) continue; // back-face cull (camera looks +z)
      // local face colour: from initial (id) exterior side
      const key = n.join(',');
      const ext = n[0] * cb.id[0] + n[1] * cb.id[1] + n[2] * cb.id[2] === 1;
      const col = ext ? S4.fcol[key] : '#1B1B26';
      // face quad corners in local space
      const u = n[0] ? [0, 1, 0] : [1, 0, 0], v2 = n[0] ? [0, 0, 1] : n[1] ? [0, 0, 1] : [0, 1, 0];
      const hs = 0.5, quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
        const loc = [n[0] * hs + u[0] * a * hs + v2[0] * b * hs, n[1] * hs + u[1] * a * hs + v2[1] * b * hs, n[2] * hs + u[2] * a * hs + v2[2] * b * hs];
        const w = mv(Rc, mv(cb.O, loc)); return [w[0] + ctr[0], w[1] + ctr[1], w[2] + ctr[2]];
      });
      const fc = [ctr[0] + nw[0] * hs, ctr[1] + nw[1] * hs, ctr[2] + nw[2] * hs];
      const lam = Math.max(0, -(nw[0] * Ld[0] + nw[1] * Ld[1] + nw[2] * Ld[2]) / ln);
      faces.push({ quad, z: fc[2], col, k: 0.84 + 0.34 * lam, ext });
    }
  }
  faces.sort((a, b) => b.z - a.z);
  c.lineJoin = 'round';
  for (const f of faces) {
    const q = f.quad.map(proj);
    const cxm = (q[0][0] + q[2][0]) / 2, cym = (q[0][1] + q[2][1]) / 2;
    const path = (s) => { c.beginPath(); q.forEach((p, i) => { const x = cxm + (p[0] - cxm) * s, y = cym + (p[1] - cym) * s; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); };
    const px = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    path(1.0); c.fillStyle = '#15151E'; c.strokeStyle = '#15151E'; c.lineWidth = px * 0.1; c.fill(); c.stroke();
    path(0.82); c.fillStyle = shade(f.col, f.k); c.strokeStyle = shade(f.col, f.k); c.lineWidth = px * 0.14; c.fill(); c.stroke();
    if (f.ext) { // glossy highlight sliver
      path(0.82); c.save(); c.clip(); c.fillStyle = `rgba(255,255,255,${0.16 * f.k})`; c.beginPath(); c.moveTo(q[0][0], q[0][1]); c.lineTo(q[1][0], q[1][1]); c.lineTo(cxm, cym); c.closePath(); c.fill(); c.restore();
    }
  }
  drawRing(true);

  // callouts
  const callouts = [
    { t: 1.1, side: 'L', ax: 960 - 190, ay: 380, ty: 215, s: 'PERSPECTIVE PROJECTION', sub: 'f = 1500px · d = 9.5' },
    { t: 2.2, side: 'R', ax: 960 + 240, ay: 640, ty: 840, s: 'PAINTER\u2019S ALGORITHM', sub: '162 FACES · DEPTH SORTED' },
    { t: 3.3, side: 'L', ax: 960 - 150, ay: 760, ty: 850, s: 'LAMBERT SHADING', sub: 'KEY LIGHT  -0.45 / -0.8 / -0.55' },
  ];
  const fade = 1 - inv(4.9, 5.2, l);
  for (const co of callouts) {
    const q = E.outCubic(inv(co.t, co.t + 0.5, l)) * fade; if (q <= 0.01) continue;
    c.save(); c.globalAlpha = q; c.strokeStyle = PAL.ink; c.fillStyle = PAL.ink; c.lineWidth = 3;
    font(c, 30, 'black'); c.letterSpacing = '0px'; const tw = c.measureText(co.s).width;
    const L = co.side === 'L', x0 = L ? 110 : W - 110;
    c.fillRect(L ? x0 - 18 : x0 + 15, co.ty - 28, 3, 74);
    c.textAlign = L ? 'left' : 'right';
    c.fillText(co.s.slice(0, Math.ceil(co.s.length * q)), x0, co.ty + 6);
    font(c, 18, 'mono'); c.letterSpacing = '3px'; c.globalAlpha = q * 0.7; c.fillText(co.sub, x0, co.ty + 36); c.globalAlpha = q;
    const sx = L ? x0 + tw + 16 : x0 - tw - 16, sy = co.ty - 6, mx = lerp(sx, co.ax, 0.5);
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(lerp(sx, mx, q), sy); c.lineTo(lerp(mx, co.ax, q), lerp(sy, co.ay, q)); c.stroke();
    circle(c, co.ax, co.ay, 8 * q);
    c.restore();
  }
  // cover to dark
  const cq = inv(5.55, 6.0, l); if (cq > 0) { c.fillStyle = '#0B0B12'; circle(c, cx, cy, E.inCubic(cq) * 2300); }
  return { hud: cq > 0.3 ? PAL.paper : PAL.ink, ca: 0.8 + 2.4 * kk + 8 * E.inExpo(inv(5.2, 6, l)), bloom: 0.18, vig: 0.25 * (1 - cq) + 0.9 * cq, grain: 0.07 };
}
SCENES.push({ start: 18, end: 24, fn: scene4 });
