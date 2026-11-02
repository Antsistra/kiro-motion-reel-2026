'use strict';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function encodeReel(scale) {
  const T0 = performance.now();
  await loadFonts(); initRenderer(scale);
  const w = R.pw, h = R.ph;
  console.log(`audio render...`);
  const abuf = await renderAudio();
  console.log(`audio ready ${Math.round(performance.now() - T0)}ms, peak was ${abuf._peakBefore.toFixed(2)}`);

  const vchunks = [], achunks = []; let opusHead = null, preskip = 312;
  const venc = new VideoEncoder({
    output: (chunk) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); vchunks.push({ ts: chunk.timestamp, key: chunk.type === 'key', data: d }); },
    error: (e) => console.log('VIDEO ENC ERROR ' + e.message),
  });
  venc.configure({ codec: 'vp09.00.41.08', width: w, height: h, bitrate: Math.round((window.__BITRATE || 12e6) * scale * scale), framerate: FPS, latencyMode: 'quality', bitrateMode: 'variable' });
  const aenc = new AudioEncoder({
    output: (chunk, meta) => {
      const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); achunks.push({ ts: chunk.timestamp, data: d });
      if (meta && meta.decoderConfig && meta.decoderConfig.description && !opusHead) opusHead = new Uint8Array(meta.decoderConfig.description instanceof ArrayBuffer ? meta.decoderConfig.description : meta.decoderConfig.description.buffer);
    },
    error: (e) => console.log('AUDIO ENC ERROR ' + e.message),
  });
  aenc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });

  // audio: feed 20ms-multiples
  const L = abuf.getChannelData(0), Rr = abuf.getChannelData(1), CH = 4800;
  for (let i = 0; i < L.length; i += CH) {
    const n = Math.min(CH, L.length - i), data = new Float32Array(n * 2); data.set(L.subarray(i, i + n), 0); data.set(Rr.subarray(i, i + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data });
    aenc.encode(ad); ad.close();
  }
  await aenc.flush();

  // video: every frame is a pure function of t
  const total = DUR * FPS; let tr = 0;
  for (let f = 0; f < total; f++) {
    const t = f / FPS; renderFrame(t);
    const vf = new VideoFrame(R.out, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: f % FPS === 0 }); vf.close();
    while (venc.encodeQueueSize > 6) await sleep(2);
    if (f % 60 === 59) console.log(`frame ${f + 1}/${total}  ${Math.round((performance.now() - T0) / 1000)}s`);
  }
  await venc.flush();
  if (!opusHead) { // build OpusHead if the encoder did not hand us one
    opusHead = new Uint8Array(19); opusHead.set(_enc.encode('OpusHead')); opusHead[8] = 1; opusHead[9] = 2; new DataView(opusHead.buffer).setUint16(10, preskip, true); new DataView(opusHead.buffer).setUint32(12, 48000, true);
  } else preskip = new DataView(opusHead.buffer, opusHead.byteOffset).getUint16(10, true);
  vchunks.sort((a, b) => a.ts - b.ts); achunks.sort((a, b) => a.ts - b.ts);
  const webm = buildWebM({ w, h, durationMs: DUR * 1000, video: vchunks, audio: achunks, opusHead, preskip });
  // stream to node
  for (let i = 0; i < webm.length; i += 1 << 21) {
    const part = webm.subarray(i, Math.min(webm.length, i + (1 << 21))); let s = '';
    for (let k = 0; k < part.length; k += 0x8000) s += String.fromCharCode.apply(null, part.subarray(k, k + 0x8000));
    await window.__chunk(btoa(s));
  }
  return { bytes: webm.length, videoChunks: vchunks.length, audioChunks: achunks.length, keyframes: vchunks.filter((v) => v.key).length, w, h, preskip };
}
