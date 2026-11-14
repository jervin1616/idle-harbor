// Tiny sound effects made with the browser's own synthesizer: no audio files, no cost.
let ac: AudioContext | null = null;
let lastCoin = 0;
export const sfx = { enabled: true } as {
  enabled: boolean; tap(): void; coin(): void; buy(): void; badge(): void; sail(): void;
};

function audio(): AudioContext | null {
  if (!sfx.enabled) return null;
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    if (!ac) { const C = W.AudioContext ?? W.webkitAudioContext; if (!C) return null; ac = new C(); }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch { return null; }
}

function note(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  const a = audio(); if (!a) return;
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
