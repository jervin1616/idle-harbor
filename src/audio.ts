// Tiny sound effects made with the browser's own synthesizer: no audio files, no cost.
let ac: AudioContext | null = null;
let lastCoin = 0;
export const sfx = { enabled: true } as {
  enabled: boolean; tap(): void; coin(): void; buy(): void; badge(): void; sail(): void;
};

function audio(always = false): AudioContext | null {
  if (!always && !sfx.enabled) return null;
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    if (!ac) { const C = W.AudioContext ?? W.webkitAudioContext; if (!C) return null; ac = new C(); }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch { return null; }
}

function note(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slide = 0, always = false) {
  const a = audio(always); if (!a) return;
  const t0 = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}

sfx.tap = () => note(380 + Math.random() * 120, 0, 0.09, 'triangle', 0.06, -140);
sfx.coin = () => { const n = performance.now(); if (n - lastCoin < 90) return; lastCoin = n; note(988, 0, 0.07, 'square', 0.03); note(1319, 0.06, 0.12, 'square', 0.03); };
sfx.buy = () => { note(523, 0, 0.09, 'square', 0.05); note(659, 0.08, 0.09, 'square', 0.05); note(784, 0.16, 0.16, 'square', 0.05); };
sfx.badge = () => [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.18, 'triangle', 0.07));
sfx.sail = () => [392, 523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.3, 'sine', 0.08));

// ---------- music: a slow, gentle loop made from a pentatonic scale ----------
const SCALE = [0, 2, 4, 7, 9];
const ROOTS = [0, -3, -5, -2];   // chord roots (in semitones) that the loop drifts through
let musicTimer: ReturnType<typeof setInterval> | null = null, beat = 0;
const hz = (semi: number) => 196 * Math.pow(2, semi / 12);
function musicTick() {
  const root = ROOTS[(beat >> 4) % ROOTS.length];
  if (beat % 16 === 0) { [0, 7, 12].forEach((o, i) => note(hz(root + o - 12), i * 0.05, 4.2, 'sine', 0.022, 0, true)); }
  if (beat % 2 === 0 || Math.random() < 0.3) note(hz(root + SCALE[Math.floor(Math.random() * SCALE.length)] + (Math.random() < 0.4 ? 12 : 0)), 0, 1.6, 'triangle', 0.02, 0, true);
  beat++;
}
export const music = {
  start() { if (musicTimer) return; if (!audio(true)) return; musicTimer = setInterval(musicTick, 520); },
  stop() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
};
