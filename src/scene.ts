import { CONFIG, StationId, stationById } from './config';
import { GameState, fleetTiers, incomePerCycle, startCycle, tap, upgradeCost } from './game';
import { fmt } from './format';

// Procedural cartoon harbor drawn on a canvas (no image files needed).
export const SW = 360;
import raftUrl from './assets/boats/raft.png';
import f1 from './assets/boats/fleet1.png';
import f2 from './assets/boats/fleet2.png';
import f3 from './assets/boats/fleet3.png';
import f4 from './assets/boats/fleet4.png';
import f5 from './assets/boats/fleet5.png';
import f6 from './assets/boats/fleet6.png';
import f7 from './assets/boats/fleet7.png';
const loadImg = (u: string) => { const i = new Image(); i.src = u; return i; };
const fleetSprites = [f1, f2, f3, f4, f5, f6, f7].map(loadImg);   // index = tier - 1
const raftImg = loadImg(raftUrl);
// Where the fleet's three boats float (x, y in sea coordinates). Listed back to front.
const BOAT_SPOTS: [number, number][] = [[292, 128], [222, 164], [306, 198]];
const BASE_SH = 340;
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
// Textured wood: base colour, light top edge, dark plank seams, shaded bottom.
function wood(c: Ctx, x: number, y: number, w: number, h: number, base: string, light: string, dark: string, vertical = false, gap = 6) {
  rr(c, x, y, w, h, 2); paint(c, base, 2);
  c.fillStyle = light; c.fillRect(x + 1, y + 1, w - 2, 1.6);
  c.fillStyle = dark; c.fillRect(x + 1, y + h - 2.4, w - 2, 1.4);
  c.lineWidth = 1; c.strokeStyle = dark;
  if (vertical) for (let xx = x + gap; xx < x + w - 1; xx += gap) { c.beginPath(); c.moveTo(xx, y + 2); c.lineTo(xx, y + h - 2); c.stroke(); }
  else for (let yy = y + gap; yy < y + h - 1; yy += gap) { c.beginPath(); c.moveTo(x + 2, yy); c.lineTo(x + w - 2, yy); c.stroke(); }
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

export function createScene(canvas: HTMLCanvasElement, s: GameState, onOpen: (id: StationId | null) => void) {
  const vis = canvas.getContext('2d')!;
  const off = document.createElement('canvas');
  const ctx = off.getContext('2d', { willReadFrequently: true })!;
  let SHv = BASE_SH, dy = 0, dyTop = 0, reserve = 0, RW = SW / 2, RH = SHv / 2;
  let outImg = vis.createImageData(RW, RH);
  // The scene stretches to fill the phone screen: extra height becomes sky and open sea.
  function layout() {
    const w = Math.min(window.innerWidth, 480), h = window.innerHeight;
    SHv = Math.max(BASE_SH, Math.min(860, Math.round((SW * h / w) / 2) * 2));
    const extra = SHv - BASE_SH;
    reserve = Math.min(112, Math.round(extra * 0.4));   // beach space kept free for the upgrade card
    dy = extra - reserve; dyTop = Math.round(dy * 0.3);
    RW = SW / 2; RH = SHv / 2;
    canvas.width = RW; canvas.height = RH; off.width = RW; off.height = RH;
    canvas.style.aspectRatio = `${SW} / ${SHv}`;
    outImg = vis.createImageData(RW, RH);
  }
  layout();
  window.addEventListener('resize', layout);
  const pops: Pop[] = [];
  const splashes: Splash[] = [];
  let lastTap = -10;
  const prev: Record<StationId, { p: number; run: boolean }> = {
    dock: { p: 0, run: false }, shed: { p: 0, run: false }, market: { p: 0, run: false }, fleet: { p: 0, run: false },
  };

  function fit() { ctx.setTransform(0.5, 0, 0, 0.5, 0, 0); }

  const inRect = (x: number, y: number, rx: number, ry: number, w: number, h: number) =>
    x >= rx && x <= rx + w && y >= ry && y <= ry + h;

  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SW;
    const y = ((e.clientY - r.top) / r.height) * SHv - dy;   // y in "harbor" coordinates
    const now = performance.now() / 1000;
    const hit: [StationId, number, number, number, number][] = [
      ['shed', SHED.x - 6, 226, SHED.w + 12, 100], ['market', MARKET.x - 6, 226, MARKET.w + 12, 100], ['dock', -6, 146, 56, 54],
    ];
    const ys = y + dy;   // y on the whole screen, for the boats' sea layer
    const fleetLevel = s.stations.fleet.level;
    const spots = fleetLevel < 1 ? 1 : fleetTiers(fleetLevel).filter(v => v > 0).length;
    for (let k = 0; k < spots; k++) {
      const [bx, by] = BOAT_SPOTS[k];
      if (Math.abs(x - bx) < 40 && ys > by + boatOff() - 60 && ys < by + boatOff() + 14) { startCycle(s, 'fleet'); onOpen('fleet'); return; }
    }
    for (const [id, rx, ry, rw, rh] of hit) {
      if (inRect(x, y, rx, ry, rw, rh)) { startCycle(s, id); onOpen(id); return; }
    }
    onOpen(null);
    tap(s); startCycle(s, 'dock');
    lastTap = now;
    pops.push({ x, y, t0: now, text: `+${CONFIG.tapValue}` });
    splashes.push({ x, y: Math.min(Math.max(y, WATER_Y + 12 - (dy - dyTop)), SAND_Y - 8), t0: now });
  });

  const boatOff = () => dyTop + (dy - dyTop) * 0.35;   // how far the sea layer with the boats is shifted down

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
        if (cfg.id === 'fleet') pops.push({ x: BOAT_SPOTS[0][0], y: BOAT_SPOTS[0][1] + boatOff() - dy - 36, t0: t, text: amt });
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

  function sea(c: Ctx, t: number, ext: number) {
    const g = c.createLinearGradient(0, WATER_Y, 0, SAND_Y + ext);
    g.addColorStop(0, '#c46b7c'); g.addColorStop(0.15, '#8a4f7d'); g.addColorStop(0.55, '#3a5a8c'); g.addColorStop(1, '#1d3557');
    c.fillStyle = g; c.fillRect(0, WATER_Y, SW, SAND_Y + ext - WATER_Y + 4);
    for (let k = 0; k < 15 + Math.floor(ext / 8); k++) {
      const w = Math.max(6, 28 - k * 1.5) * (0.65 + 0.35 * Math.sin(t * 2 + k * 1.3));
      c.fillStyle = `rgba(255,240,170,${Math.max(0.12, 0.85 - k * 0.04)})`;
      c.fillRect(284 - w / 2 + Math.sin(t + k) * 2, WATER_Y + 4 + k * 8, w, 2.4);
    }
    for (let i = 0; i < 6 + Math.floor(ext / 19); i++) {
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

  // One fleet boat. tier 1-7 picks the sprite; ghost = the faded "for sale" boat shown before the fleet is built.
  function boat(c: Ctx, cx: number, cy: number, tier: number, t: number, i: number, p: number, ghost = false) {
    const spr = fleetSprites[tier - 1];
    const by = cy + Math.round(Math.sin(t * 1.6 + i * 2) * 1.2) * 2;   // whole pixels only, so the pixel art stays crisp
    const big = tier >= 6;
    c.beginPath(); c.ellipse(cx, cy + 4, big ? 44 : 34, 3.2, 0, 0, TAU); c.fillStyle = 'rgba(255,225,215,.5)'; c.fill();
    if (!ghost && !big) person(c, cx + (tier === 1 ? -2 : 16), by - 8, 0.66, { shirt: ['#f28c4a', '#58a85a', '#4fb3d6'][i % 3], hat: 'straw', arm: -0.7 });
    if (!ghost && big) {   // deckhands on the bigger ships
      person(c, cx - 22, by - 14, 0.6, { shirt: '#f28c4a', hat: 'straw', arm: -0.7 });
      person(c, cx + 20, by - 18, 0.6, { shirt: '#4fb3d6', hat: 'cap', hatColor: '#e8553d', arm: 0.5 });
    }
    if (spr.complete && spr.naturalWidth) {
      c.save(); if (ghost) c.globalAlpha = 0.8;
      c.imageSmoothingEnabled = false;
      c.drawImage(spr, Math.round(cx - spr.naturalWidth), by - spr.naturalHeight * 2 + 6, spr.naturalWidth * 2, spr.naturalHeight * 2);
      c.restore();
    }
    if (!ghost && p >= 0.78) {
      const u = (p - 0.78) / 0.22;
      fish(c, cx - 36 + u * 8, cy + 8 - Math.sin(u * Math.PI) * 20, -(u - 0.5) * 2.4, 0.8, '#ff9f43');
    }
  }

  function pier(c: Ctx, t: number, p: number) {
    for (const x of [8, 58, 108, 158, 184]) {
      wood(c, x, DECK_Y + 8, 8, 30, '#8a5530', '#b9803f', '#4a2b13', false, 5);
      c.beginPath(); c.ellipse(x + 4, DECK_Y + 37, 9, 2.4, 0, 0, TAU); c.fillStyle = 'rgba(255,241,201,.65)'; c.fill();
    }
    c.beginPath(); c.moveTo(12, DECK_Y + 16); c.quadraticCurveTo(35, DECK_Y + 24, 62, DECK_Y + 16); c.quadraticCurveTo(85, DECK_Y + 24, 112, DECK_Y + 16);
    c.lineWidth = 1.6; c.strokeStyle = '#e8b86a'; c.stroke();
    wood(c, -6, DECK_Y, 202, 12, '#c78a45', '#e8b86a', '#7a4b2a', true, 14);
    c.fillStyle = 'rgba(45,30,62,.45)'; c.fillRect(-4, DECK_Y + 12, 198, 3);
    // dusk lantern on the pier's end
    rr(c, 189, DECK_Y - 30, 3, 30, 1); paint(c, '#4a2b13', 1.4);
    const fl = 0.75 + Math.sin(t * 7) * 0.12;
    const lg = c.createRadialGradient(190.5, DECK_Y - 32, 1, 190.5, DECK_Y - 32, 20);
    lg.addColorStop(0, `rgba(255,225,140,${0.38 * fl})`); lg.addColorStop(1, 'rgba(255,225,140,0)');
    c.fillStyle = lg; c.fillRect(170, DECK_Y - 52, 42, 42);
    rr(c, 185, DECK_Y - 38, 11, 9, 2); paint(c, '#ffd75e', 1.6);

    hut(c);
    const level = s.stations.dock.level;
    const spots = [172, 138, 104, 70];
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
      person(c, 22, DECK_Y, 0.95, { shirt: '#3b82f6', hat: 'hard', hatColor: '#ffd23f', arm: 0.9 });
    }
  }

  function land(c: Ctx, t: number) {
    c.beginPath(); c.moveTo(0, SAND_Y);
    for (let x = 0; x <= SW; x += 6) c.lineTo(x, SAND_Y + Math.sin(x * 0.07 + t * 1.5) * 2.2);
    c.lineTo(SW, BASE_SH + reserve); c.lineTo(0, BASE_SH + reserve); c.closePath(); c.fillStyle = '#f5dfa6'; c.fill();
    c.beginPath();
    for (let x = 0; x <= SW; x += 6) {
      const y = SAND_Y + Math.sin(x * 0.07 + t * 1.5) * 2.2;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke();
    for (let i = 0; i < 9; i++) dot(c, (i * 47 + 11) % SW, 240 + ((i * 29) % 60), 1.4, 'rgba(160,120,60,.35)');
    // boardwalk
    c.fillStyle = '#b9803f'; c.fillRect(0, BASE_Y, SW, BASE_SH + reserve - BASE_Y);
    c.lineWidth = 2; c.strokeStyle = INK; c.beginPath(); c.moveTo(0, BASE_Y); c.lineTo(SW, BASE_Y); c.stroke();
    c.lineWidth = 1; c.strokeStyle = 'rgba(43,37,64,.35)';
    for (let x = 0; x < SW; x += 26) { c.beginPath(); c.moveTo(x, BASE_Y); c.lineTo(x, BASE_SH + reserve); c.stroke(); }
    for (let yy = BASE_Y + 13; yy < BASE_SH + reserve; yy += 13) { c.beginPath(); c.moveTo(0, yy); c.lineTo(SW, yy); c.stroke(); }
  }

  function hut(c: Ctx) {
    c.beginPath(); c.moveTo(-10, 168); c.lineTo(50, 168); c.lineTo(42, 150); c.lineTo(-2, 150); c.closePath(); paint(c, '#2f86b5', 2.2);
    rr(c, -6, 168, 52, DECK_Y - 168, 2); paint(c, '#9a6236', 2.2);
    rr(c, 4, 176, 14, DECK_Y - 176, 2); paint(c, '#3d2314', 1.8);
    fish(c, 31, 180, 0, 0.8, '#4fb3d6');
    c.beginPath(); c.arc(36, 190, 3.5, 0, TAU); paint(c, '#c4453a', 1.4);
    if (s.stations.dock.level < 1) lockOverlay(c, -8, 150, 56, DECK_Y - 150);
  }

  // Bouncing marker over a building: green arrow = you can afford something, orange ! = hand-run station is idle.
  function badge(c: Ctx, id: StationId, x: number, y: number, t: number) {
    const st = s.stations[id]; const cfg = stationById(id);
    const canUp = st.level < CONFIG.maxLevel && s.coins >= upgradeCost(id, st.level);
    const canMgr = st.level >= 1 && !st.hasManager && s.coins >= cfg.managerCost;
    const idle = st.level >= 1 && !st.hasManager && !st.running;
    if (!canUp && !canMgr && !idle) return;
    const by = y + Math.sin(t * 5) * 2.5;
    rr(c, x - 9, by - 9, 18, 18, 3); paint(c, canUp || canMgr ? '#58a85a' : '#f28c4a', 2);
    c.fillStyle = '#fff8e8';
    if (canUp || canMgr) { c.beginPath(); c.moveTo(x, by - 5); c.lineTo(x + 5, by + 1); c.lineTo(x + 2, by + 1); c.lineTo(x + 2, by + 5); c.lineTo(x - 2, by + 5); c.lineTo(x - 2, by + 1); c.lineTo(x - 5, by + 1); c.closePath(); c.fill(); }
    else { c.fillRect(x - 1.5, by - 5, 3, 6); c.fillRect(x - 1.5, by + 3, 3, 2.5); }
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
    c.beginPath(); c.moveTo(x - 6, 254); c.lineTo(x + w + 6, 254); c.lineTo(x + w - 8, 230); c.lineTo(x + 8, 230); c.closePath(); paint(c, '#c4453a', 2.2);
    c.save(); c.beginPath(); c.moveTo(x - 6, 254); c.lineTo(x + w + 6, 254); c.lineTo(x + w - 8, 230); c.lineTo(x + 8, 230); c.closePath(); c.clip();
    c.lineWidth = 1; c.strokeStyle = '#7d2a2a';
    for (let yy = 236; yy < 254; yy += 6) { c.beginPath(); c.moveTo(x - 6, yy); c.lineTo(x + w + 6, yy); c.stroke(); for (let xx = x - 6 + ((yy / 6) % 2) * 5; xx < x + w + 6; xx += 10) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 6); c.stroke(); } }
    c.fillStyle = '#e8603c'; c.fillRect(x - 6, 231, w + 12, 1.6);
    c.restore();
    wood(c, x, 254, w, BASE_Y - 254, '#8ed1d6', '#c9eef2', '#4fb3d6', false, 7);
    rr(c, x + 10, 272, w - 20, 26, 4); paint(c, st.level >= 1 ? '#6b3f23' : '#2f4057', 2);
    if (st.level >= 1) { const lg = c.createRadialGradient(x + w / 2, 276, 2, x + w / 2, 276, 30); lg.addColorStop(0, 'rgba(255,215,94,.55)'); lg.addColorStop(1, 'rgba(255,215,94,0)'); c.fillStyle = lg; c.fillRect(x + 10, 272, w - 20, 26); }
    rr(c, x + 22, 256, w - 44, 13, 3); paint(c, '#fff4da', 1.6);
    fish(c, x + w / 2, 262.5, 0, 0.75, '#4fb3d6');
    if (st.level >= 1) {
      person(c, x + w / 2, 298, 0.72, { shirt: '#fff4da', hat: 'cap', hatColor: '#fff4da', bob: active ? Math.sin(t * 10) * 0.8 : 0, arm: 0.6 + (active ? Math.sin(t * 10) * 0.7 : 0) });
    }
    wood(c, x + 6, 296, w - 12, 12, '#c78a45', '#e8b86a', '#7a4b2a', false, 5);
    const n = Math.min(st.level, 6);
    for (let i = 0; i < n; i++) fish(c, x + 14 + i * 12, 293, 0, 0.55, i % 2 ? '#7fc8f8' : '#ff9f43');
    if (active) fish(c, x + 14 + p * (w - 28), 289, 0, 0.8, '#ffd9a0');
    if (st.hasManager) person(c, x + w + 16, BASE_Y + 11, 0.95, { shirt: '#3b82f6', hat: 'hard', hatColor: '#ffd23f', arm: 0.9 });
    if (st.level < 1) lockOverlay(c, x - 6, 228, w + 12, BASE_Y - 228);
    badge(c, 'shed', x + w / 2, 218, t);
  }

  function market(c: Ctx, t: number, p: number) {
    const { x, w } = MARKET; const st = s.stations.market; const active = p >= 0;
    wood(c, x + 2, 246, 6, BASE_Y - 246, '#8a5530', '#b9803f', '#4a2b13', false, 6);
    wood(c, x + w - 8, 246, 6, BASE_Y - 246, '#8a5530', '#b9803f', '#4a2b13', false, 6);
    if (st.level >= 1) {
      person(c, x + w / 2, 290, 0.82, { shirt: '#6bc46d', hat: 'cap', hatColor: '#e8553d', bob: active ? Math.sin(t * 8) * 0.8 : 0, arm: 0.5 + (active ? Math.sin(t * 8) * 0.5 : 0) });
    }
    wood(c, x + 4, 288, w - 8, BASE_Y - 288, '#c98a4b', '#e8b86a', '#7a4b2a', true, 9);
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
    badge(c, 'market', x + w / 2, 214, t);
  }

  function raft(c: Ctx, t: number) {
    if (!(raftImg.complete && raftImg.naturalWidth)) return;
    const by = 212 + Math.round(Math.sin(t * 1.3 + 1) * 1.1) * 2;
    c.beginPath(); c.ellipse(262, by + 3, 28, 3, 0, 0, TAU); c.fillStyle = 'rgba(255,225,215,.5)'; c.fill();
    c.imageSmoothingEnabled = false;
    c.drawImage(raftImg, Math.round(262 - raftImg.naturalWidth), by - raftImg.naturalHeight * 2 + 4, raftImg.naturalWidth * 2, raftImg.naturalHeight * 2);
  }

  function barrel(c: Ctx, x: number, y: number) {
    rr(c, x - 8, y - 20, 16, 20, 4); paint(c, '#9a6236', 2);
    c.fillStyle = '#c78a45'; c.fillRect(x - 6, y - 18, 3, 16);
    c.fillStyle = '#4a2b13'; c.fillRect(x - 8, y - 14, 16, 2); c.fillRect(x - 8, y - 6, 16, 2);
  }
  function crate(c: Ctx, x: number, y: number, s2 = 1) {
    wood(c, x - 9 * s2, y - 17 * s2, 18 * s2, 17 * s2, '#c78a45', '#e8b86a', '#7a4b2a', false, 6 * s2);
    c.lineWidth = 1.2; c.strokeStyle = '#4a2b13'; c.beginPath(); c.moveTo(x - 7 * s2, y - 15 * s2); c.lineTo(x + 7 * s2, y - 2 * s2); c.moveTo(x + 7 * s2, y - 15 * s2); c.lineTo(x - 7 * s2, y - 2 * s2); c.stroke();
  }
  function cat(c: Ctx, x: number, y: number, t: number) {
    const tail = Math.sin(t * 2.2) * 5, blink = Math.sin(t * 0.9) > 0.96;
    c.beginPath(); c.moveTo(x - 7, y - 3); c.quadraticCurveTo(x - 17, y - 6 + tail, x - 13, y - 17 + tail); c.lineWidth = 4; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke();
    c.lineWidth = 2; c.strokeStyle = '#f28c4a'; c.stroke();
    c.beginPath(); c.ellipse(x, y - 7, 9, 7, 0, 0, TAU); paint(c, '#f28c4a', 2);
    c.beginPath(); c.arc(x + 6, y - 15, 6, 0, TAU); paint(c, '#f28c4a', 2);
    c.beginPath(); c.moveTo(x + 1.5, y - 19); c.lineTo(x + 2.5, y - 25); c.lineTo(x + 6, y - 20); c.closePath(); paint(c, '#f28c4a', 1.4);
    c.beginPath(); c.moveTo(x + 7, y - 20); c.lineTo(x + 10.5, y - 25); c.lineTo(x + 11.5, y - 18.5); c.closePath(); paint(c, '#f28c4a', 1.4);
    if (blink) { c.fillStyle = INK; c.fillRect(x + 3, y - 15, 3, 1); c.fillRect(x + 8, y - 15, 3, 1); }
    else { dot(c, x + 4.5, y - 15, 1.2, INK); dot(c, x + 9, y - 15, 1.2, INK); }
    c.fillStyle = '#ffd2a8'; c.fillRect(x + 6.5, y - 12.5, 2, 1.5);
  }
  function props(c: Ctx, t: number) {
    const y = BASE_Y + 30;
    barrel(c, 168, y); barrel(c, 186, y + 3);
    crate(c, 306, y + 2); crate(c, 324, y + 2); crate(c, 315, y - 15);
    cat(c, 222, y + 6, t);
    c.beginPath(); c.ellipse(120, y + 2, 11, 5, 0, 0, TAU); paint(c, '#e8b86a', 1.8);
    c.beginPath(); c.ellipse(120, y, 6, 2.5, 0, 0, TAU); c.lineWidth = 1.4; c.strokeStyle = '#7a4b2a'; c.stroke();
  }

  function lockMini(c: Ctx, cx: number, cy: number) {
    c.beginPath(); c.arc(cx, cy - 6, 6, Math.PI, 0); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    rr(c, cx - 8, cy - 6, 16, 12, 3); paint(c, '#ffd75e', 2);
    dot(c, cx, cy, 1.8, INK);
  }

  function lockOverlay(c: Ctx, x: number, y: number, w: number, h: number) {
    rr(c, x, y, w, h, 6); c.fillStyle = 'rgba(255,241,201,.62)'; c.fill(); c.lineWidth = 1.5; c.setLineDash([4, 3]); c.strokeStyle = '#8a4f7d'; c.stroke(); c.setLineDash([]);
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
    c.fillStyle = '#5b3a6b'; c.fillRect(0, 0, SW, dyTop + 2);
    c.save(); c.translate(0, dyTop); sky(c, t); sea(c, t, dy - dyTop); c.restore();
    c.save(); c.translate(0, boatOff());
    const fl = s.stations.fleet.level, pf = phase('fleet');
    if (fl < 1) { boat(c, BOAT_SPOTS[0][0], BOAT_SPOTS[0][1], 1, t, 0, -1, true); lockMini(c, BOAT_SPOTS[0][0] + 2, BOAT_SPOTS[0][1] - 16); }
    else fleetTiers(fl).forEach((tier, i) => { if (tier > 0) boat(c, BOAT_SPOTS[i][0], BOAT_SPOTS[i][1], tier, t, i, pf); });
    badge(c, 'fleet', BOAT_SPOTS[0][0], BOAT_SPOTS[0][1] - (fl >= 5 ? 70 : fl >= 3 ? 56 : 30), t);
    c.restore();
    c.save(); c.translate(0, dy);
    raft(c, t); pier(c, t, pd); land(c, t); props(c, t);
    shed(c, t, phase('shed')); market(c, t, phase('market'));
    badge(c, 'dock', 20, 138, t);
    effects(c, t);
    c.restore();
    pines(c, t);
    quantize(c.getImageData(0, 0, RW, RH), outImg);
    vis.putImageData(outImg, 0, 0);
  }

  return { draw };
}
