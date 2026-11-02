'use strict';
/* Minimal WebM (Matroska) muxer: one VP9 video track + one Opus audio track, with Cues for seeking. */
const _enc = new TextEncoder();
function cat(arrs) { let n = 0; for (const a of arrs) n += a.length; const o = new Uint8Array(n); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; }
function idBytes(id) { const b = []; while (id > 0) { b.unshift(id & 255); id = Math.floor(id / 256); } return Uint8Array.from(b); }
function sizeBytes(n) { const o = new Uint8Array(8); o[0] = 0x01; let v = n; for (let i = 7; i >= 1; i--) { o[i] = v % 256; v = Math.floor(v / 256); } return o; }
function el(id, payload) { return cat([idBytes(id), sizeBytes(payload.length), payload]); }
function uint(v) { const b = []; if (v === 0) return Uint8Array.of(0); while (v > 0) { b.unshift(v % 256); v = Math.floor(v / 256); } return Uint8Array.from(b); }
function f64(v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v); return b; }
const elU = (id, v) => el(id, uint(v));
const elS = (id, s) => el(id, _enc.encode(s));

function buildWebM({ w, h, durationMs, video, audio, opusHead, preskip }) {
  const ebml = el(0x1A45DFA3, cat([elU(0x4286, 1), elU(0x42F7, 1), elU(0x42F2, 4), elU(0x42F3, 8), elS(0x4282, 'webm'), elU(0x4287, 4), elU(0x4285, 2)]));
  const info = el(0x1549A966, cat([elU(0x2AD7B1, 1000000), el(0x4489, f64(durationMs)), elS(0x4D80, 'kiro-reel-muxer'), elS(0x5741, 'kiro-reel-muxer')]));
  const vTrack = el(0xAE, cat([elU(0xD7, 1), elU(0x73C5, 1), elU(0x83, 1), elS(0x86, 'V_VP9'), el(0xE0, cat([elU(0xB0, w), elU(0xBA, h)]))]));
  const aTrack = el(0xAE, cat([elU(0xD7, 2), elU(0x73C5, 2), elU(0x83, 2), elS(0x86, 'A_OPUS'),
    elU(0x56AA, Math.round((preskip * 1e9) / 48000)), elU(0x56BB, 80000000), el(0x63A2, opusHead),
    el(0xE1, cat([el(0xB5, f64(48000)), elU(0x9F, 2)]))]));
  const tracks = el(0x1654AE6B, cat([vTrack, aTrack]));

  // blocks sorted by time; a new cluster starts on every video keyframe
  const blocks = [];
  video.forEach((v) => blocks.push({ ms: Math.round(v.ts / 1000), track: 1, key: v.key, data: v.data }));
  audio.forEach((a) => blocks.push({ ms: Math.round(a.ts / 1000), track: 2, key: true, data: a.data }));
  blocks.sort((a, b) => a.ms - b.ms || a.track - b.track);
  const clusters = []; let cur = null;
  for (const b of blocks) {
    if (!cur || (b.track === 1 && b.key)) { cur = { ms: b.ms, blocks: [] }; clusters.push(cur); }
    cur.blocks.push(b);
  }
  const segParts = [info, tracks]; let off = info.length + tracks.length; const cues = [];
  for (const cl of clusters) {
    const bl = cl.blocks.map((b) => {
      const rel = b.ms - cl.ms; const head = Uint8Array.of(0x80 | b.track, (rel >> 8) & 255, rel & 255, b.key ? 0x80 : 0);
      return el(0xA3, cat([head, b.data]));
    });
    const c = el(0x1F43B675, cat([elU(0xE7, cl.ms), ...bl]));
    cues.push(el(0xBB, cat([elU(0xB3, cl.ms), el(0xB7, cat([elU(0xF7, 1), elU(0xF1, off)]))])));
    segParts.push(c); off += c.length;
  }
  segParts.push(el(0x1C53BB6B, cat(cues)));
  const segPayload = cat(segParts);
  return cat([ebml, idBytes(0x18538067), sizeBytes(segPayload.length), segPayload]);
}
