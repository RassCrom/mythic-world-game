// Atmosphere & sound design — synthesized with WebAudio, no audio assets.
// A quiet cavern-air ambience plus short cues for game events.
// Everything respects a persisted mute toggle and initializes only after
// the first user gesture (browser autoplay policy).

let ctx = null;
let master = null;
let ambience = null;
let muted = localStorage.getItem('ud_muted') === '1';

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function initAudioOnGesture() {
  const boot = () => { ensureCtx(); startAmbience(); };
  window.addEventListener('pointerdown', boot, { once: true });
  window.addEventListener('keydown', boot, { once: true });
}

export function isMuted() { return muted; }

export function setMuted(m) {
  muted = m;
  localStorage.setItem('ud_muted', m ? '1' : '0');
  if (master) master.gain.linearRampToValueAtTime(m ? 0 : 0.5, ctx.currentTime + 0.15);
}

/* ---------------- ambience: low cavern drone + ember crackle -------- */

function startAmbience() {
  if (!ctx || ambience) return;
  ambience = true;

  // Brown-ish noise through a slow-swelling lowpass = cave air.
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 220;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain).connect(g.gain);
  noise.connect(lp).connect(g).connect(master);
  noise.start();
  lfo.start();

  // Two very quiet detuned sines = distant hoard hum.
  for (const [f, vol] of [[55, 0.02], [82.5, 0.012]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.detune.value = Math.random() * 8 - 4;
    const og = ctx.createGain();
    og.gain.value = vol;
    o.connect(og).connect(master);
    o.start();
  }
}

/* ---------------- one-shot cues ------------------------------------ */

function env(node, t0, a, peak, d) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.exponentialRampToValueAtTime(peak, t0 + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}

function tone(freq, { type = 'sine', a = 0.01, d = 0.25, peak = 0.2, delay = 0, slide = 0 } = {}) {
  if (!ensureCtx() || muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + a + d);
  const g = ctx.createGain();
  env(g, t0, a, peak, d);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + a + d + 0.05);
}

function noiseBurst({ a = 0.005, d = 0.2, peak = 0.25, freq = 1200, q = 1, delay = 0, slide = 0 } = {}) {
  if (!ensureCtx() || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.ceil(ctx.sampleRate * (a + d + 0.1));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t0);
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), t0 + a + d);
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t0, a, peak, d);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + a + d + 0.1);
}

export const sfx = {
  click() { tone(880, { type: 'triangle', d: 0.06, peak: 0.08 }); },
  draw() { noiseBurst({ freq: 2400, q: 2, d: 0.12, peak: 0.12, slide: 1800 }); },
  play() {
    noiseBurst({ freq: 300, q: 1, d: 0.15, peak: 0.2 });
    tone(196, { type: 'triangle', d: 0.3, peak: 0.12 });
  },
  enter() {
    tone(392, { type: 'triangle', d: 0.25, peak: 0.1 });
    tone(587, { type: 'triangle', d: 0.3, peak: 0.08, delay: 0.08 });
  },
  roar() {
    // A growl: low sawtooth sweeping down + rumble.
    tone(140, { type: 'sawtooth', a: 0.02, d: 0.5, peak: 0.22, slide: -70 });
    noiseBurst({ freq: 200, q: 0.7, a: 0.02, d: 0.45, peak: 0.18, slide: -120 });
  },
  destroy() {
    noiseBurst({ freq: 900, q: 0.8, d: 0.35, peak: 0.25, slide: -750 });
    tone(110, { type: 'square', d: 0.3, peak: 0.1, slide: -40 });
  },
  magic() {
    tone(660, { type: 'sine', d: 0.3, peak: 0.1 });
    tone(990, { type: 'sine', d: 0.35, peak: 0.08, delay: 0.07 });
    tone(1320, { type: 'sine', d: 0.4, peak: 0.06, delay: 0.14 });
  },
  shuffle() {
    for (let i = 0; i < 5; i++) noiseBurst({ freq: 1800, q: 3, d: 0.05, peak: 0.07, delay: i * 0.05 });
  },
  turn() {
    tone(523, { type: 'triangle', d: 0.2, peak: 0.14 });
    tone(784, { type: 'triangle', d: 0.35, peak: 0.12, delay: 0.12 });
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone(f, { type: 'triangle', d: 0.5, peak: 0.14, delay: i * 0.12 }));
    noiseBurst({ freq: 3000, q: 1.5, d: 0.8, peak: 0.06, delay: 0.5, slide: -2000 });
  },
  error() { tone(180, { type: 'square', d: 0.15, peak: 0.08 }); },
};

// Map server log `sound` tags to cues.
export function playLogSound(tag) {
  const map = {
    draw: sfx.draw, play: sfx.play, enter: sfx.enter, roar: sfx.roar,
    destroy: sfx.destroy, magic: sfx.magic, shuffle: sfx.shuffle,
    turn: null, win: sfx.win,
  };
  const fn = map[tag];
  if (fn) fn();
}
