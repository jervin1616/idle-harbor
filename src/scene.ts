import { CONFIG, StationId } from './config';
import { GameState, incomePerCycle, startCycle, tap } from './game';
import { fmt } from './format';

// Procedural cartoon harbor drawn on a canvas (no image files needed).
export const SW = 360;
export const SH = 340;
const INK = '#2d1e3e';
const WATER_Y = 112, SAND_Y = 226, BASE_Y = 314, DECK_Y = 196;
const SHED = { x: 14, w: 112 };
const MARKET = { x: 236, w: 112 };

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function paint(c: Ctx, fill: string, lw = 2) {
  c.fillStyle = fill; c.fill();
  c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
}
function dot(c: Ctx, x: number, y: number, r: number, col: string) {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function label(c: Ctx, text: string, x: number, y: number, size: number, fill: string) {
  c.font = `700 ${size}px 'Pixelify Sans', monospace`;
  c.textAlign = 'center'; c.lineWidth = 3.5; c.lineJoin = 'round';
  c.strokeStyle = INK; c.strokeText(text, x, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}

interface P { shirt: string; hat: 'straw' | 'hard' | 'cap' | 'none'; hatColor?: string; bob?: number; arm?: number; flip?: number }

function person(c: Ctx, x: number, y: number, k: number, o: P) {
  const bob = o.bob ?? 0;
  c.save(); c.translate(x, y); c.scale(k * (o.flip ?? 1), k);
  rr(c, -5, -7, 4.5, 7, 1.5); paint(c, '#3b4a6b', 1.5);
  rr(c, 0.5, -7, 4.5, 7, 1.5); paint(c, '#3b4a6b', 1.5);
  rr(c, -7, -21 + bob, 14, 16, 5); paint(c, o.shirt, 1.8);
  const a = o.arm ?? 0.6;
  c.beginPath(); c.moveTo(5, -17 + bob); c.lineTo(5 + Math.cos(a) * 9, -17 + bob + Math.sin(a) * 9);
  c.lineCap = 'round'; c.lineWidth = 4.4; c.strokeStyle = INK; c.stroke();
  c.lineWidth = 2.2; c.strokeStyle = '#ffd2a8'; c.stroke();
  c.beginPath(); c.arc(0, -27 + bob, 7.5, 0, TAU); paint(c, '#ffd2a8', 1.8);
  dot(c, -2.6, -27 + bob, 1.1, INK); dot(c, 2.6, -27 + bob, 1.1, INK);
  c.beginPath(); c.arc(0, -25 + bob, 2.2, 0.2, Math.PI - 0.2); c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
  const hc = o.hatColor ?? '#f2c14e';
  if (o.hat === 'straw') {
    c.beginPath(); c.ellipse(0, -32.5 + bob, 12, 3.2, 0, 0, TAU); paint(c, hc, 1.6);
    c.beginPath(); c.arc(0, -33 + bob, 6.4, Math.PI, 0); c.closePath(); paint(c, hc, 1.6);
  } else if (o.hat === 'hard') {
    rr(c, -9, -34 + bob, 18, 3.4, 1.5); paint(c, hc, 1.6);
    c.beginPath(); c.arc(0, -33.5 + bob, 7.6, Math.PI, 0); c.closePath(); paint(c, hc, 1.6);
  } else if (o.hat === 'cap') {
    c.beginPath(); c.arc(0, -32.5 + bob, 7.6, Math.PI, 0); c.closePath(); paint(c, hc, 1.6);
    rr(c, 2, -34 + bob, 9, 3, 1.4); paint(c, hc, 1.4);
  }
  c.restore();
}

function fish(c: Ctx, x: number, y: number, ang: number, k: number, col: string) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(k, k);
  c.beginPath(); c.ellipse(0, 0, 8, 4.5, 0, 0, TAU); paint(c, col, 1.6);
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(-13, -5); c.lineTo(-13, 5); c.closePath(); paint(c, col, 1.6);
  dot(c, 4, -1, 1, INK);
  c.restore();
}

interface Pop { x: number; y: number; t0: number; text: string }
interface Splash { x: number; y: number; t0: number }

const PAL_HEX = ['#1b1424','#2d1e3e','#4a2f4f','#3d2314','#6b3f23','#9a6236','#c78a45','#e8b86a','#f5dfa6','#fff1c9','#fff8e8',
  '#7d2a2a','#c4453a','#e8603c','#f28c4a','#ffb86b','#ffd75e','#fff08a','#5b3a6b','#8a4f7d','#c46b7c','#e8898a','#f4a99a','#ffcfae',
  '#1d3557','#3a5a8c','#25618f','#2f86b5','#4fb3d6','#8fd6e8','#c9eef2','#1f4d3a','#2f7a4a','#58a85a','#9bd16b','#5d6a85','#8e9ab5',
  '#c5cde0','#ffffff','#ffd2a8','#e9a97e','#a2709a','#6b4f86','#b9803f'];
const PAL = PAL_HEX.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const LUT = new Int16Array(32768).fill(-1);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function nearest(r: number, g: number, b: number) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < PAL.length; i++) {
    const dr = PAL[i][0] - r, dg = PAL[i][1] - g, db = PAL[i][2] - b;
    const d = dr * dr * 0.9 + dg * dg * 1.2 + db * db * 0.8;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
// Snap to the palette with ordered dithering: this is what makes it read as pixel art.
function quantize(src: ImageData, dst: ImageData) {
  const s = src.data, d = dst.data, w = src.width;
  for (let i = 0, p = 0; i < s.length; i += 4, p++) {
    const x = p % w, y = (p / w) | 0;
    const off = (BAYER[(y & 3) * 4 + (x & 3)] - 7.5) * 1.3;
    const r = Math.max(0, Math.min(255, s[i] + off)), g = Math.max(0, Math.min(255, s[i + 1] + off)), b = Math.max(0, Math.min(255, s[i + 2] + off));
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let idx = LUT[key];
    if (idx < 0) { idx = nearest((r >> 3 << 3) + 4, (g >> 3 << 3) + 4, (b >> 3 << 3) + 4); LUT[key] = idx; }
    d[i] = PAL[idx][0]; d[i + 1] = PAL[idx][1]; d[i + 2] = PAL[idx][2]; d[i + 3] = 255;
  }
}

export function createScene(canvas: HTMLCanvasElement, s: GameState) {
  const RW = SW / 2, RH = SH / 2;                     // internal pixel resolution
  canvas.width = RW; canvas.height = RH;
  const vis = canvas.getContext('2d')!;
  const off = document.createElement('canvas'); off.width = RW; off.height = RH;
  const ctx = off.getContext('2d', { willReadFrequently: true })!;
  const outImg = vis.createImageData(RW, RH);
  const pops: Pop[] = [];
  const splashes: Splash[] = [];
  let lastTap = -10;
  const prev: Record<StationId, { p: number; run: boolean }> = {
    dock: { p: 0, run: false }, shed: { p: 0, run: false }, market: { p: 0, run: false },
  };

  function fit() { ctx.setTransform(0.5, 0, 0, 0.5, 0, 0); }

  const inRect = (x: number, y: number, rx: number, ry: number, w: number, h: number) =>
    x >= rx && x <= rx + w && y >= ry && y <= ry + h;

  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SW, y = ((e.clientY - r.top) / r.height) * SH;
    const now = performance.now() / 1000;
    if (inRect(x, y, SHED.x - 6, 226, SHED.w + 12, 100)) { if (s.stations.shed.level >= 1) startCycle(s, 'shed'); return; }
    if (inRect(x, y, MARKET.x - 6, 226, MARKET.w + 12, 100)) { if (s.stations.market.level >= 1) startCycle(s, 'market'); return; }
    tap(s); startCycle(s, 'dock');
    lastTap = now;
    pops.push({ x, y, t0: now, text: `+${CONFIG.tapValue}` });
    splashes.push({ x, y: Math.min(Math.max(y, WATER_Y + 12), SAND_Y - 8), t0: now });
  });

  const phase = (id: StationId) => {
    const st = s.stations[id]; const cfg = CONFIG.stations.find(x => x.id === id)!;
    if (st.level < 1) return -1;
    if (st.hasManager || st.running) return Math.min(1, st.progress / cfg.cycleSeconds);
    return -1;
  };

  function detect(t: number) {
    for (const cfg of CONFIG.stations) {
      const st = s.stations[cfg.id]; const pv = prev[cfg.id];
      const done = st.level >= 1 && ((st.hasManager && st.progress < pv.p) || (!st.hasManager && pv.run && !st.running));
      if (done) {
        const amt = `+${fmt(incomePerCycle(cfg.id, st.level))}`;
        if (cfg.id === 'dock') pops.push({ x: 150, y: 176, t0: t, text: amt });
        if (cfg.id === 'shed') pops.push({ x: SHED.x + SHED.w / 2, y: 262, t0: t, text: amt });
        if (cfg.id === 'market') pops.push({ x: MARKET.x + MARKET.w / 2, y: 270, t0: t, text: amt });
      }
      pv.p = st.progress; pv.run = st.running;
    }
  }

  // ---------- drawing pieces ----------
  function ridge(c: Ctx, base: number, amp: number, f: number, ph: number, col: string, trees: boolean) {
    c.beginPath(); c.moveTo(0, WATER_Y + 1);
    const ys: number[] = [];
    for (let x = 0; x <= SW; x += 4) {
      const y = base - (Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.3 + amp);
      ys.push(y); c.lineTo(x, y);
    }
    c.lineTo(SW, WATER_Y + 1); c.closePath(); c.fillStyle = col; c.fill();
    if (trees) {
      c.fillStyle = '#1f4d3a';
      for (let i = 0; i < ys.length; i += 2) {
        const x = i * 4, h = 6 + ((i * 7) % 5);
        c.beginPath(); c.moveTo(x - 3, ys[i] + 2); c.lineTo(x, ys[i] - h); c.lineTo(x + 3, ys[i] + 2); c.closePath(); c.fill();
      }
    }
  }

  function sky(c: Ctx, t: number) {
    const g = c.createLinearGradient(0, 0, 0, WATER_Y);
    g.addColorStop(0, '#5b3a6b'); g.addColorStop(0.4, '#c46b7c'); g.addColorStop(0.78, '#f4a99a'); g.addColorStop(1, '#ffcfae');
    c.fillStyle = g; c.fillRect(0, 0, SW, WATER_Y + 1);
    const sg = c.createRadialGradient(284, 94, 4, 284, 94, 78);
    sg.addColorStop(0, 'rgba(255,240,170,.95)'); sg.addColorStop(0.35, 'rgba(255,184,107,.6)'); sg.addColorStop(1, 'rgba(255,184,107,0)');
    c.fillStyle = sg; c.fillRect(190, 0, 170, 125);
    dot(c, 284, 94, 17, '#fff08a');
    for (let i = 0; i < 3; i++) {
      const x = ((t * (4 + i * 2) + i * 150) % (SW + 140)) - 70, y = 26 + i * 20;
      c.fillStyle = '#e8898a';
      c.beginPath(); c.arc(x, y, 10, 0, TAU); c.arc(x + 16, y - 6, 14, 0, TAU); c.arc(x + 34, y, 11, 0, TAU); c.fill(); c.fillRect(x, y, 34, 10);
      c.fillStyle = '#ffcfae';
      c.beginPath(); c.arc(x + 16, y - 9, 10, Math.PI, 0); c.fill();
    }
    ridge(c, WATER_Y, 11, 0.021, 1.3, '#8a4f7d', false);
    ridge(c, WATER_Y + 1, 7, 0.034, 4.1, '#5b3a6b', true);
    c.beginPath(); c.ellipse(70, WATER_Y, 22, 6, 0, Math.PI, TAU); paint(c, '#5d6a85', 1.6);
    c.beginPath(); c.moveTo(63, WATER_Y - 3); c.lineTo(77, WATER_Y - 3); c.lineTo(74, WATER_Y - 34); c.lineTo(66, WATER_Y - 34); c.closePath(); paint(c, '#fff1c9', 1.6);
    c.beginPath(); c.moveTo(65, WATER_Y - 16); c.lineTo(75, WATER_Y - 16); c.lineTo(74.5, WATER_Y - 23); c.lineTo(65.5, WATER_Y - 23); c.closePath(); paint(c, '#c4453a', 1.2);
    rr(c, 65, WATER_Y - 42, 10, 8, 2); paint(c, '#ffd75e', 1.4);
    c.beginPath(); c.moveTo(63, WATER_Y - 42); c.lineTo(70, WATER_Y - 50); c.lineTo(77, WATER_Y - 42); c.closePath(); paint(c, '#7d2a2a', 1.4);
    for (let i = 0; i < 3; i++) {
      const x = ((t * (16 + i * 4) + i * 120) % (SW + 60)) - 30, y = 52 + i * 18 + Math.sin(t * 1.3 + i) * 6;
      const f = Math.sin(t * 7 + i) * 4;
      c.beginPath(); c.moveTo(x - 7, y + f); c.quadraticCurveTo(x - 3, y - 4, x, y); c.quadraticCurveTo(x + 3, y - 4, x + 7, y + f);
      c.lineWidth = 2; c.strokeStyle = '#fff1c9'; c.lineCap = 'round'; c.stroke();
    }
  }

  function mist(c: Ctx, t: number, y0: number, h: number, a: number, i: number) {
    const dx = Math.sin(t * 0.25 + i * 2) * 16;
    const g = c.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, 'rgba(255,225,215,0)'); g.addColorStop(0.5, `rgba(255,225,215,${a})`); g.addColorStop(1, 'rgba(255,225,215,0)');
    c.fillStyle = g; c.fillRect(-20 + dx, y0, SW + 40, h);
  }

  function sea(c: Ctx, t: number) {
    const g = c.createLinearGradient(0, WATER_Y, 0, SAND_Y);
    g.addColorStop(0, '#c46b7c'); g.addColorStop(0.15, '#8a4f7d'); g.addColorStop(0.55, '#3a5a8c'); g.addColorStop(1, '#1d3557');
    c.fillStyle = g; c.fillRect(0, WATER_Y, SW, SAND_Y - WATER_Y + 4);
    for (let k = 0; k < 15; k++) {
      const w = (28 - k * 1.5) * (0.65 + 0.35 * Math.sin(t * 2 + k * 1.3));
      c.fillStyle = `rgba(255,240,170,${0.85 - k * 0.04})`;
      c.fillRect(284 - w / 2 + Math.sin(t + k) * 2, WATER_Y + 4 + k * 8, w, 2.4);
    }
    for (let i = 0; i < 6; i++) {
      const cy = WATER_Y + 12 + i * 19;
      c.beginPath();
      for (let x = 0; x <= SW; x += 6) {
        const y = cy + Math.sin(x * 0.045 + t * (0.9 + i * 0.12) + i * 2.1) * 2.4;
        x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.lineWidth = 1.6; c.strokeStyle = `rgba(255,207,174,${0.14 + i * 0.03})`; c.stroke();
    }
    mist(c, t, WATER_Y + 4, 34, 0.5, 0);
    mist(c, t, WATER_Y + 40, 30, 0.28, 1);
  }

  function pines(c: Ctx, t: number) {
    const branch = (x0: number, y0: number, dir: number, len: number, ph: number) => {
      c.save(); c.translate(x0, y0); c.scale(dir, 1);
      const sway = Math.sin(t * 0.6 + ph) * 1.6;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(len, 12 + sway); c.lineWidth = 4; c.strokeStyle = '#3d2314'; c.stroke();
      for (let i = 1; i < 8; i++) {
        const bx = i * len / 8, by = i * 12 / 8 + sway * (i / 8), h = 14 + (i % 3) * 5;
        c.beginPath(); c.moveTo(bx - 9, by); c.lineTo(bx + 9, by); c.lineTo(bx + 1, by + h); c.closePath(); c.fillStyle = '#1f4d3a'; c.fill();
        c.beginPath(); c.moveTo(bx - 4, by); c.lineTo(bx + 4, by); c.lineTo(bx, by + h * 0.55); c.closePath(); c.fillStyle = '#2f7a4a'; c.fill();
      }
      c.restore();
    };
    branch(SW + 6, -6, -1, 118, 0);
    branch(-6, -10, 1, 44, 2);
  }

  function boat(c: Ctx, cx: number, cy: number, k: number, t: number, i: number, p: number) {
    const by = cy + Math.sin(t * 1.6 + i * 2) * 1.8;
    c.beginPath(); c.ellipse(cx, cy + 9, 30 * k, 3.2, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
    c.save(); c.translate(cx, by); c.rotate(Math.sin(t * 1.2 + i) * 0.045); c.scale(k, k);
    person(c, -12, -6, 0.72, { shirt: '#f0a43a', hat: 'straw', arm: -0.7 });
    rr(c, 2, -19, 15, 13, 3); paint(c, '#fff4da', 1.6);
    rr(c, 5, -16, 9, 6, 1.5); paint(c, '#8fd3ee', 1.1);
    c.beginPath(); c.moveTo(-26, -7); c.lineTo(27, -7); c.lineTo(19, 9); c.lineTo(-19, 9); c.closePath(); paint(c, '#e8553d', 2);
    c.beginPath(); c.moveTo(-24.5, -3); c.lineTo(25.5, -3); c.lineTo(23.5, 1); c.lineTo(-22.5, 1); c.closePath(); c.fillStyle = '#fff4da'; c.fill();
    c.restore();
    if (p >= 0.78) {
      const u = (p - 0.78) / 0.22;
      fish(c, cx - 36 + u * 8, cy + 8 - Math.sin(u * Math.PI) * 20, -(u - 0.5) * 2.4, 0.8, '#ff9f43');
    }
  }

  function pier(c: Ctx, t: number, p: number) {
    for (const x of [8, 58, 108, 158, 184]) {
      rr(c, x, DECK_Y + 8, 7, 28, 1.5); paint(c, '#7a4b2a', 1.6);
      c.beginPath(); c.ellipse(x + 3.5, DECK_Y + 36, 8, 2.4, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill();
    }
    rr(c, -6, DECK_Y, 202, 11, 2); paint(c, '#c78a45', 2);
    c.lineWidth = 1; c.strokeStyle = 'rgba(43,37,64,.35)';
    for (let x = 8; x < 196; x += 14) { c.beginPath(); c.moveTo(x, DECK_Y); c.lineTo(x, DECK_Y + 11); c.stroke(); }

    const level = s.stations.dock.level;
    const spots = [172, 132, 92, 52];
    const hired = Math.min(3, Math.floor(level / 3));
    const reel = Math.max(0, 1 - (performance.now() / 1000 - lastTap) / 0.35);
    for (let i = 0; i <= hired; i++) {
      const px = spots[i];
      const u = p >= 0.78 ? (p - 0.78) / 0.22 : 0;
      const jerk = Math.max(i === 0 ? reel : 0, u > 0 ? Math.sin(Math.min(1, u * 2.5) * Math.PI) : 0);
      const arm = -0.9 - jerk * 0.5;
      person(c, px, DECK_Y, 0.9, { shirt: ['#f06a6a', '#4aa3df', '#6bc46d', '#b07ae0'][i], hat: 'straw', arm, bob: Math.sin(t * 2 + i) * 0.4 });
      const ox = px + (5 + Math.cos(arm) * 9) * 0.9, oy = DECK_Y + (-17 + Math.sin(arm) * 9) * 0.9;
      const ra = -0.78 - jerk * 0.55;
      const tx = ox + Math.cos(ra) * 32, ty = oy + Math.sin(ra) * 32;
      c.beginPath(); c.moveTo(ox, oy); c.lineTo(tx, ty); c.lineWidth = 2.2; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke();
      const dip = p > 0.6 && u < 0.4 && p >= 0 ? 3 : 0;
      const bx = tx + 17, by = 214 + Math.sin(t * 3 + i) * 1.1 + dip;
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(bx, by - 2); c.lineWidth = 1; c.strokeStyle = 'rgba(43,37,64,.75)'; c.stroke();
      c.beginPath(); c.arc(bx, by, 3, 0, TAU); paint(c, '#e8553d', 1.2);
      c.beginPath(); c.arc(bx, by - 1, 3, Math.PI, 0); c.fillStyle = '#fff'; c.fill();
      if (u > 0 && u < 1) fish(c, bx + u * 8, by - 6 - Math.sin(u * Math.PI) * 26, -(u - 0.5) * 2.4, 0.85, '#ff9f43');
    }
    if (s.stations.dock.hasManager) {
      person(c, 18, DECK_Y, 0.95, { shirt: '#3b82f6', hat: 'hard', hatColor: '#ffd23f', arm: 0.9 });
    }
  }

  function land(c: Ctx, t: number) {
    c.beginPath(); c.moveTo(0, SAND_Y);
    for (let x = 0; x <= SW; x += 6) c.lineTo(x, SAND_Y + Math.sin(x * 0.07 + t * 1.5) * 2.2);
    c.lineTo(SW, SH); c.lineTo(0, SH); c.closePath(); c.fillStyle = '#f5dfa6'; c.fill();
    c.beginPath();
    for (let x = 0; x <= SW; x += 6) {
      const y = SAND_Y + Math.sin(x * 0.07 + t * 1.5) * 2.2;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke();
    for (let i = 0; i < 9; i++) dot(c, (i * 47 + 11) % SW, 240 + ((i * 29) % 60), 1.4, 'rgba(160,120,60,.35)');
    // boardwalk
    c.fillStyle = '#b9803f'; c.fillRect(0, BASE_Y, SW, SH - BASE_Y);
    c.lineWidth = 2; c.strokeStyle = INK; c.beginPath(); c.moveTo(0, BASE_Y); c.lineTo(SW, BASE_Y); c.stroke();
    c.lineWidth = 1; c.strokeStyle = 'rgba(43,37,64,.35)';
    for (let x = 0; x < SW; x += 26) { c.beginPath(); c.moveTo(x, BASE_Y); c.lineTo(x, SH); c.stroke(); }
    c.beginPath(); c.moveTo(0, BASE_Y + 13); c.lineTo(SW, BASE_Y + 13); c.stroke();
  }

  function bubble(c: Ctx, x: number, y: number, t: number) {
    const k = 1 + Math.sin(t * 6) * 0.06;
    c.save(); c.translate(x, y); c.scale(k, k);
    rr(c, -20, -12, 40, 20, 8); paint(c, '#fff4da', 2);
    c.beginPath(); c.moveTo(-4, 8); c.lineTo(0, 14); c.lineTo(4, 8); c.closePath(); paint(c, '#fff4da', 2);
    c.fillStyle = '#fff4da'; c.fillRect(-3, 6, 6, 3);
    c.font = "700 15px 'Pixelify Sans', monospace"; c.textAlign = 'center'; c.fillStyle = INK; c.fillText('TAP!', 0, 4);
    c.restore();
  }

  function shed(c: Ctx, t: number, p: number) {
    const { x, w } = SHED; const st = s.stations.shed; const active = p >= 0;
    c.beginPath(); c.moveTo(x - 6, 254); c.lineTo(x + w + 6, 254); c.lineTo(x + w - 8, 230); c.lineTo(x + 8, 230); c.closePath(); paint(c, '#c4553b', 2.2);
    rr(c, x, 254, w, BASE_Y - 254, 3); paint(c, '#8ed1d6', 2.2);
    rr(c, x + 10, 272, w - 20, 26, 4); paint(c, '#2f4057', 2);
    rr(c, x + 22, 256, w - 44, 13, 3); paint(c, '#fff4da', 1.6);
    fish(c, x + w / 2, 262.5, 0, 0.75, '#4fb3d6');
    if (st.level >= 1) {
      person(c, x + w / 2, 298, 0.72, { shirt: '#fff4da', hat: 'cap', hatColor: '#fff4da', bob: active ? Math.sin(t * 10) * 0.8 : 0, arm: 0.6 + (active ? Math.sin(t * 10) * 0.7 : 0) });
    }
    rr(c, x + 6, 296, w - 12, 12, 3); paint(c, '#c78a45', 2);
    const n = Math.min(st.level, 6);
    for (let i = 0; i < n; i++) fish(c, x + 14 + i * 12, 293, 0, 0.55, i % 2 ? '#7fc8f8' : '#ff9f43');
    if (active) fish(c, x + 14 + p * (w - 28), 289, 0, 0.8, '#ffd9a0');
    if (st.hasManager) person(c, x + w + 16, BASE_Y + 11, 0.95, { shirt: '#3b82f6', hat: 'hard', hatColor: '#ffd23f', arm: 0.9 });
    if (st.level < 1) lockOverlay(c, x - 6, 228, w + 12, BASE_Y - 228);
    else if (!st.hasManager && !st.running) bubble(c, x + w / 2, 222 + Math.sin(t * 3) * 2, t);
  }

  function market(c: Ctx, t: number, p: number) {
    const { x, w } = MARKET; const st = s.stations.market; const active = p >= 0;
    rr(c, x + 2, 246, 6, BASE_Y - 246, 1.5); paint(c, '#7a4b2a', 1.6);
    rr(c, x + w - 8, 246, 6, BASE_Y - 246, 1.5); paint(c, '#7a4b2a', 1.6);
    if (st.level >= 1) {
      person(c, x + w / 2, 290, 0.82, { shirt: '#6bc46d', hat: 'cap', hatColor: '#e8553d', bob: active ? Math.sin(t * 8) * 0.8 : 0, arm: 0.5 + (active ? Math.sin(t * 8) * 0.5 : 0) });
    }
    rr(c, x + 4, 288, w - 8, BASE_Y - 288, 3); paint(c, '#c98a4b', 2);
    rr(c, x + 10, 280, 26, 10, 3); paint(c, '#a86b32', 1.6);
    const n = Math.min(st.level, 4);
    for (let i = 0; i < n; i++) fish(c, x + 17 + i * 5, 279, 0.3 * (i - 1.5), 0.5, '#ff9f43');
    const sw = (w + 12) / 8;
    for (let i = 0; i < 8; i++) {
      const sx = x - 6 + i * sw;
      c.beginPath(); c.moveTo(sx, 238); c.lineTo(sx + sw, 238); c.lineTo(sx + sw, 256); c.arc(sx + sw / 2, 256, sw / 2, 0, Math.PI); c.lineTo(sx, 238); c.closePath();
      paint(c, i % 2 ? '#fff4da' : '#e8553d', 1.8);
    }
    c.beginPath(); c.moveTo(x - 10, 238); c.lineTo(x + w + 10, 238); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    if (active) {
      const d = Math.abs(1 - 2 * p);
      person(c, x + w / 2 - 6 + d * 56, BASE_Y + 18, 1, { shirt: ['#b07ae0', '#4aa3df', '#f0a43a'][Math.floor(s.totalEarned) % 3], hat: 'none', arm: 0.4 + Math.sin(t * 8) * 0.2, bob: Math.sin(t * 9 + d * 8) * 0.8 });
    }
    if (st.hasManager) person(c, x - 14, BASE_Y + 11, 0.95, { shirt: '#3b82f6', hat: 'hard', hatColor: '#ffd23f', arm: 0.9, flip: -1 });
    if (st.level < 1) lockOverlay(c, x - 10, 232, w + 20, BASE_Y - 232);
    else if (!st.hasManager && !st.running) bubble(c, x + w / 2, 218 + Math.sin(t * 3 + 1) * 2, t);
  }

  function lockOverlay(c: Ctx, x: number, y: number, w: number, h: number) {
    rr(c, x, y, w, h, 6); c.fillStyle = 'rgba(30,40,70,.58)'; c.fill();
    const cx = x + w / 2, cy = y + h / 2;
    c.beginPath(); c.arc(cx, cy - 7, 8, Math.PI, 0); c.lineWidth = 3.5; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = '#ffd23f'; c.stroke();
    rr(c, cx - 11, cy - 7, 22, 17, 4); paint(c, '#ffd23f', 2);
    dot(c, cx, cy + 1.5, 2.2, INK);
  }

  function effects(c: Ctx, t: number) {
    for (let i = splashes.length - 1; i >= 0; i--) {
      const a = t - splashes[i].t0; if (a > 0.6) { splashes.splice(i, 1); continue; }
      const sp = splashes[i];
      c.beginPath(); c.ellipse(sp.x, sp.y, 4 + a * 26, 1.5 + a * 9, 0, 0, TAU);
      c.lineWidth = 2; c.strokeStyle = `rgba(255,255,255,${1 - a / 0.6})`; c.stroke();
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const a = t - pops[i].t0; if (a > 1.1) { pops.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, (1.1 - a) * 2);
      label(c, pops[i].text, pops[i].x, pops[i].y - a * 30, 19, '#ffd75e');
      c.globalAlpha = 1;
    }
  }

  function draw(t: number) {
    fit(); detect(t);
    const c = ctx;
    const pd = phase('dock');
    sky(c, t); sea(c, t);
    const boats = Math.min(3, Math.ceil(s.stations.dock.level / 4));
    const spots = [[262, 150, 1], [316, 180, 1.05], [226, 178, 0.95]];
    for (let i = 0; i < boats; i++) boat(c, spots[i][0], spots[i][1], spots[i][2], t, i, pd);
    pier(c, t, pd); land(c, t);
    shed(c, t, phase('shed')); market(c, t, phase('market'));
    pines(c, t);
    effects(c, t);
    quantize(c.getImageData(0, 0, RW, RH), outImg);
    vis.putImageData(outImg, 0, 0);
  }

  return { draw };
}
