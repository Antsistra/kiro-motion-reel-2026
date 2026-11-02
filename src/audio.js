'use strict';
/* ------------------------------------------------------------------ *
 *  Procedural score + sound design. 128 BPM, A minor, 32 beats = 15.0s.
 *  Rendered offline with WebAudio, so it is sample-locked to the picture.
 * ------------------------------------------------------------------ */
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

async function renderAudio() {
  const SR = 48000, N = Math.ceil(DUR * SR), rand = mulberry(7);
  const ctx = new OfflineAudioContext(2, N, SR);
  const T = (b) => b * BEAT;

  /* ----- buses ----- */
  const noiseBuf = ctx.createBuffer(1, SR * 3, SR); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }
  const irLen = Math.floor(SR * 2.6), ir = ctx.createBuffer(2, irLen, SR);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / irLen, 3.4) * Math.min(1, i / (SR * 0.012)); }
  const conv = ctx.createConvolver(); conv.buffer = ir;
  const revIn = ctx.createGain(); const revHP = ctx.createBiquadFilter(); revHP.type = 'highpass'; revHP.frequency.value = 260;
  const revLP = ctx.createBiquadFilter(); revLP.type = 'lowpass'; revLP.frequency.value = 7500;
  revIn.connect(revHP); revHP.connect(conv); conv.connect(revLP);
  const wet = ctx.createGain(); wet.gain.value = 0.55; revLP.connect(wet);
  const bus = ctx.createGain();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -15; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.14;
  const shaper = ctx.createWaveShaper(); { const n = 2048, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; cv[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); } shaper.curve = cv; }
  const master = ctx.createGain(); master.gain.setValueAtTime(0.92, 0); master.gain.setValueAtTime(0.92, 14.25); master.gain.linearRampToValueAtTime(0.0, 14.98);
  bus.connect(comp); comp.connect(shaper); shaper.connect(master); master.connect(ctx.destination); wet.connect(bus);
  const sc = ctx.createGain(); sc.connect(bus); // sidechained group (bass, pads, arps)
  // sidechain pump on every audible kick
  sc.gain.setValueAtTime(1, 0);
  for (let b = 0; b < 32; b++) { if (!kickOn(b)) continue; const t = T(b); sc.gain.setValueAtTime(0.28, t); sc.gain.linearRampToValueAtTime(1, t + BEAT * 0.62); }
  // dotted-eighth delay for plucks
  const dly = ctx.createDelay(1); dly.delayTime.value = BEAT * 0.75; const fb = ctx.createGain(); fb.gain.value = 0.38; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  const dwet = ctx.createGain(); dwet.gain.value = 0.5; dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dwet); dwet.connect(sc); dwet.connect(revIn);

  /* ----- helpers ----- */
  const pan = (p) => { const n = ctx.createStereoPanner(); n.pan.value = p; return n; };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const osc = (type, f, t, d) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + d); return o; };
  const noise = (t, d, off) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, off === undefined ? rand() * 2 : off); s.stop(t + d); return s; };
  const send = (node, amt) => { const g = ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(revIn); };

  function kick(t, v = 1) {
    const o = osc('sine', 165, t, 0.6); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = ctx.createGain(); env(g, t, 0.002, 0.95 * v, 0.5); o.connect(g); g.connect(bus);
    const c = osc('triangle', 2600, t, 0.02); const cg = ctx.createGain(); env(cg, t, 0.001, 0.22 * v, 0.012); c.connect(cg); cg.connect(bus);
  }
  function clap(t, v = 1) {
    const n = noise(t, 0.35), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.023].forEach((o) => { g.gain.setValueAtTime(0.7 * v, t + o); g.gain.exponentialRampToValueAtTime(0.1 * v, t + o + 0.009); });
    g.gain.setValueAtTime(0.65 * v, t + 0.035); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    n.connect(bp); bp.connect(g); g.connect(bus); send(g, 0.35);
  }
  function hat(t, v = 1, open = false, p = 0) {
    const n = noise(t, 0.3), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
    const g = ctx.createGain(); env(g, t, 0.001, 0.2 * v, open ? 0.2 : 0.035); const pn = pan(p); n.connect(hp); hp.connect(g); g.connect(pn); pn.connect(bus);
  }
  function bass(t, d, m, v = 1) {
    const f = mtof(m), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * v, t + 0.01); g.gain.setValueAtTime(0.5 * v, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(220, t + d * 0.8);
    const a = osc('sawtooth', f, t, d + 0.05), b = osc('square', f * 0.5, t, d + 0.05), bg = ctx.createGain(); bg.gain.value = 0.7;
    a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(g); g.connect(sc);
  }
  function pad(t, d, notes, cut = 1500, v = 1) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(cut * 0.5, t); lp.frequency.exponentialRampToValueAtTime(cut, t + d * 0.6); lp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055 * v, t + 0.08); g.gain.setValueAtTime(0.055 * v, t + d - 0.05); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.18);
    notes.forEach((m) => [-8, 8].forEach((dt) => { const o = osc('sawtooth', mtof(m), t, d + 0.25); o.detune.value = dt; o.connect(lp); }));
    lp.connect(g); g.connect(sc); send(g, 0.5);
  }
  function pluck(t, m, v = 1, p = 0) {
    const f = mtof(m), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.16);
    const g = ctx.createGain(); env(g, t, 0.003, 0.13 * v, 0.2);
    const a = osc('sawtooth', f, t, 0.3), b = osc('square', f * 1.003, t, 0.3); a.connect(lp); b.connect(lp); lp.connect(g);
    const pn = pan(p); g.connect(pn); pn.connect(sc); pn.connect(dly); send(g, 0.3);
  }
  function riser(t0, t1, v = 1, f0 = 300, f1 = 9000) {
    const d = t1 - t0, n = noise(t0, d + 0.05, 0), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5 * v, t1); g.gain.linearRampToValueAtTime(0.0001, t1 + 0.04);
    n.connect(bp); bp.connect(g); g.connect(bus); send(g, 0.3);
    const o = osc('sawtooth', f0 * 0.5, t0, d + 0.05); o.frequency.exponentialRampToValueAtTime(f1 * 0.25, t1);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.06 * v, t1); og.gain.linearRampToValueAtTime(0.0001, t1 + 0.04);
    const olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 3000; o.connect(olp); olp.connect(og); og.connect(bus);
  }
  function whoosh(t, d, up = true, v = 1) {
    const n = noise(t, d + 0.05), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(up ? 400 : 6000, t); bp.frequency.exponentialRampToValueAtTime(up ? 7000 : 300, t + d);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4 * v, t + d * (up ? 0.9 : 0.15)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
    const pn = pan((rand() - 0.5) * 0.8); n.connect(bp); bp.connect(g); g.connect(pn); pn.connect(bus); send(g, 0.25);
  }
  function impact(t, v = 1, long = 1) {
    const o = osc('sine', 78, t, 1.8 * long); o.frequency.exponentialRampToValueAtTime(30, t + 1.2 * long);
    const g = ctx.createGain(); env(g, t, 0.004, 0.8 * v, 1.3 * long); o.connect(g); g.connect(bus);
    const n = noise(t, 1.2), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.9);
    const ng = ctx.createGain(); env(ng, t, 0.002, 0.5 * v, 0.9 * long); n.connect(lp); lp.connect(ng); ng.connect(bus); send(ng, 0.8);
  }
  function thud(t, f, v = 1) {
    const o = osc('sine', f * 2, t, 0.3); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.12);
    const g = ctx.createGain(); env(g, t, 0.002, 0.6 * v, 0.22); o.connect(g); g.connect(bus);
    const n = noise(t, 0.05), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = ctx.createGain(); env(ng, t, 0.001, 0.3 * v, 0.03); n.connect(hp); hp.connect(ng); ng.connect(bus);
  }
  function blip(t, f, v = 1, d = 0.07, type = 'square') {
    const o = osc(type, f, t, d + 0.02), g = ctx.createGain(); env(g, t, 0.001, 0.12 * v, d); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
    o.connect(lp); lp.connect(g); g.connect(bus); send(g, 0.2);
  }
  function bell(t, m, v = 1) {
    const f = mtof(m), c = osc('sine', f, t, 2.5), m2 = osc('sine', f * 3.5, t, 2.5), g = ctx.createGain(), mg = ctx.createGain();
    env(g, t, 0.002, 0.16 * v, 2.2); env(mg, t, 0.002, 0.05 * v, 0.6); c.connect(g); m2.connect(mg); mg.connect(g); const pn = pan((rand() - 0.5) * 1.2); g.connect(pn); pn.connect(bus); send(g, 0.9);
  }
  function drip(t, f, v = 1) {
    const o = osc('sine', f * 0.5, t, 0.3); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.2);
    const g = ctx.createGain(); env(g, t, 0.003, 0.25 * v, 0.2); o.connect(g); g.connect(bus); send(g, 0.6);
  }

  /* ----- score ----- */
  const BASSR = [33, 29, 36, 31], CH = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
  const chordAt = (b) => Math.floor(b / 4) % 4;

  // Kick every beat (silent on 23, so the drop at 24 lands)
  for (let b = 0; b < 32; b++) if (kickOn(b)) kick(T(b), b < 1 ? 0.8 : b >= 29 ? 0.8 : 1);

  // === Scene 1 : kinetic type ===
  impact(T(0), 0.7, 0.8);
  [[1, 130], [2, 155], [3, 185]].forEach(([b, f]) => { thud(T(b), f, 0.9); whoosh(T(b) - 0.2, 0.2, true, 0.7); blip(T(b), f * 6, 0.6, 0.05); });
  thud(T(0), 110, 0.9); impact(T(3), 0.5, 0.5);
  pad(0, T(6), [45, 52], 700, 1.1); // dark drone
  for (let b = 2; b < 6; b++) { hat(T(b) + BEAT * 0.5, 0.8, false, 0.2); }
  for (let i = 0; i < 9; i++) { const t = T(4) + i * 0.052 + rand() * 0.02; blip(t, 200 + rand() * 3000, 0.9, 0.025); }
  { const t0 = T(4.5), o = osc('sine', 150, t0, T(1.5) + 0.1); o.frequency.exponentialRampToValueAtTime(2600, t0 + T(1.4)); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22, t0 + T(1.4)); g.gain.linearRampToValueAtTime(0.0001, t0 + T(1.5)); o.connect(g); g.connect(bus); send(g, 0.4); }
  riser(T(4.2), T(6), 0.9, 250, 9500);

  // === Scenes 2-4 : the groove ===
  for (let b = 6; b < 24; b++) {
    const ci = chordAt(b), root = BASSR[ci], t = T(b);
    // hats
    hat(t + BEAT * 0.5, 1, b % 2 === 1, 0.25); if (b >= 8) { hat(t + BEAT * 0.25, 0.4, false, -0.3); hat(t + BEAT * 0.75, 0.45, false, 0.3); }
    // clap on 2 & 4
    if (b % 2 === 1 && b !== 23) clap(t, 1);
    // bass: offbeat 8ths + pickup
    if (b !== 23) { bass(t + BEAT * 0.5, BEAT * 0.4, root + (b % 4 === 3 ? 12 : 0), 1); if (b % 2 === 0 && b >= 8) bass(t + BEAT * 0.75, BEAT * 0.2, root + 12, 0.7); }
  }
  // pads: one chord per bar-chunk (6 -> 24)
  [[6, 8], [8, 12], [12, 16], [16, 20], [20, 24]].forEach(([a, b]) => pad(T(a), T(b - a) - 0.02, CH[chordAt(a)], 1000 + (a - 6) * 120));
  // arps (16ths) from beat 12
  for (let b = 12; b < 23; b++) {
    const ch = CH[chordAt(b)], pat = [0, 2, 1, 2, 0, 1, 2, 1];
    for (let s = 0; s < 4; s++) { const idx = pat[(s + (b % 2) * 4) % 8], oct = (s === 3 && b % 2) ? 24 : 12; pluck(T(b) + s * BEAT / 4, ch[idx] + oct, s === 0 ? 1 : 0.7, (s - 1.5) * 0.25); }
  }
  // arps lightly in scene 2 second half
  for (let b = 9; b < 12; b++) { const ch = CH[chordAt(b)]; for (let s = 0; s < 2; s++) pluck(T(b) + s * BEAT / 2, ch[(s + b) % 3] + 12, 0.6, s ? 0.3 : -0.3); }

  // scene-boundary sound design
  impact(T(6), 1, 1); whoosh(T(5.3), 0.7, true, 0.9);
  whoosh(T(8.4), 0.9, true, 0.7); whoosh(T(10.3), 0.9, true, 0.6);
  { const t0 = T(10.3), o = osc('sine', 300, t0, 1.1); o.frequency.exponentialRampToValueAtTime(1800, t0 + 1.0); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.1, t0 + 1.0); g.gain.linearRampToValueAtTime(0.0001, t0 + 1.08); o.connect(g); g.connect(bus); send(g, 0.5); }
  riser(T(10.6), T(12), 0.8, 300, 8000);
  impact(T(12), 0.9, 1);
  drip(T(14.5), 520, 1); [15.5, 16.0, 16.5, 17.0].forEach((b, i) => drip(T(b), 660 + i * 90, 0.7));
  whoosh(T(16.8), 1.0, true, 0.8); riser(T(17.0), T(18), 0.8, 300, 8000);
  impact(T(18), 0.8, 0.8);
  for (let m = 0; m < 5; m++) { whoosh(T(18 + m + 0.15), 0.35, true, 0.5); thud(T(18 + m + 0.95), 240 - m * 12, 0.7); blip(T(18 + m + 0.95), 1500, 0.4, 0.03); }
  riser(T(20), T(24), 1.1, 200, 11000);
  // pre-drop clap roll 22 -> 24 (accelerating)
  { let b = 22; let step = 0.5; while (b < 24) { clap(T(b), 0.35 + (b - 22) * 0.3); b += step; if (b >= 23) step = 0.25; if (b >= 23.5) step = 0.125; } }
  whoosh(T(23.2), 0.8, true, 1);

  // === Scene 5 : drop, counters, logo ===
  impact(T(24), 1.1, 1.2); whoosh(T(23.8), 0.2, false, 0.8);
  for (let b = 24; b < 32; b++) {
    const ci = chordAt(b), root = BASSR[ci], t = T(b), hi = b < 28;
    hat(t + BEAT * 0.5, hi ? 1 : 0.7, true, 0.25); if (hi) { hat(t + BEAT * 0.25, 0.5, false, -0.3); hat(t + BEAT * 0.75, 0.55, false, 0.3); }
    if (b % 2 === 1 && (hi || b >= 29)) clap(t, hi ? 1.1 : 0.8);
    if (b !== 27 && b < 28) { bass(t, BEAT * 0.45, root + 12, 0.8); bass(t + BEAT * 0.5, BEAT * 0.4, root, 1); }
    else if (b >= 28) { bass(t, BEAT * 1.8, root, 0.9); }
  }
  [[24, 28]].forEach(([a, b]) => pad(T(a), T(b - a) - 0.02, CH[chordAt(a)], 2200, 1.2));
  for (let b = 24; b < 27; b++) { const ch = CH[chordAt(b)]; for (let s = 0; s < 4; s++) pluck(T(b) + s * BEAT / 4, ch[(s * 2 + b) % 3] + 12 + (s === 2 ? 12 : 0), 0.9, (s - 1.5) * 0.3); }
  // counters: rising ticks b25.4 -> b27
  for (let i = 0; i < 14; i++) blip(T(25.4) + i * (BEAT / 4) * 0.9, 900 + i * 110, 0.5, 0.03, 'square');
  blip(T(26.6), 2400, 1, 0.25, 'sine'); blip(T(26.6), 3600, 0.5, 0.25, 'sine');
  thud(T(26.9), 90, 0.9);
  // gather: reverse-cymbal swell and rising sine into the hit
  riser(T(26.9), T(28), 1.5, 500, 12000);
  { const t0 = T(26.9), o = osc('sine', 220, t0, 1.2); o.frequency.exponentialRampToValueAtTime(1760, t0 + T(1.1)); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + T(1.1)); g.gain.linearRampToValueAtTime(0.0001, t0 + T(1.12)); o.connect(g); g.connect(bus); send(g, 0.6); }
  // logo hit
  impact(T(28), 1.3, 1.6); clap(T(28), 1.2);
  [57, 60, 64, 71, 81].forEach((m) => { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, T(28)); lp.frequency.exponentialRampToValueAtTime(900, T(28) + 1.8);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T(28)); g.gain.linearRampToValueAtTime(0.07, T(28) + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, T(28) + 2.4);
    [-9, 9].forEach((dt) => { const o = osc('sawtooth', mtof(m), T(28), 2.5); o.detune.value = dt; o.connect(lp); }); lp.connect(g); g.connect(bus); send(g, 0.9); });
  [76, 81, 84, 88, 93].forEach((m, i) => bell(T(28) + i * BEAT * 0.25, m, 1 - i * 0.08));
  [88, 84, 81, 76].forEach((m, i) => bell(T(30) + i * BEAT * 0.5, m, 0.5));
  pad(T(28), T(4) - 0.1, [57, 60, 64, 67], 1800, 0.9);
  for (let b = 29; b < 32; b++) for (let s = 0; s < 2; s++) pluck(T(b) + s * BEAT / 2, CH[0][(s + b) % 3] + 12, 0.45, s ? 0.3 : -0.3);

  const buf = await ctx.startRendering();
  // normalise to -1.2 dBFS peak
  let pk = 0; for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }
  const gain = pk > 0 ? 0.87 / pk : 1;
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= gain; }
  buf._peakBefore = pk;
  return buf;
}

async function analyseAudio() {
  const t0 = performance.now(), buf = await renderAudio();
  const L = buf.getChannelData(0), R2 = buf.getChannelData(1), SR = buf.sampleRate;
  const per = []; let pk = 0, clipped = 0;
  for (let b = 0; b < 32; b++) {
    const a = Math.floor(b * BEAT * SR), z = Math.min(L.length, Math.floor((b + 1) * BEAT * SR)); let s = 0, n = 0;
    for (let i = a; i < z; i++) { s += L[i] * L[i] + R2[i] * R2[i]; n += 2; const m = Math.max(Math.abs(L[i]), Math.abs(R2[i])); if (m > pk) pk = m; if (m >= 0.999) clipped++; }
    per.push(+(20 * Math.log10(Math.sqrt(s / n) + 1e-9)).toFixed(1));
  }
  return { seconds: buf.duration, channels: buf.numberOfChannels, peak: +pk.toFixed(3), peakBeforeNormalise: +buf._peakBefore.toFixed(2), clippedSamples: clipped, rmsDbPerBeat: per, ms: Math.round(performance.now() - t0) };
}
