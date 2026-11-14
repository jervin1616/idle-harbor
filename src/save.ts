import { CONFIG } from './config';
import { GameState, newState } from './game';

export function save(s: GameState) {
  s.lastSaved = Date.now();
  try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(s)); } catch { /* storage full/blocked */ }
}

/** Turn saved JSON into a valid state (older saves get new fields filled with defaults). */
export function parseSave(raw: string): GameState | null {
  try {
    const p = JSON.parse(raw);
    if (!p || (p.version !== 1 && p.version !== 2)) return null;
    const base = newState();
    const out: GameState = { ...base, ...p, version: 2, stations: { ...base.stations, ...p.stations }, settings: { ...base.settings, ...p.settings } };
    for (const k of Object.keys(base.stations) as (keyof typeof base.stations)[]) {
      out.stations[k] = { ...base.stations[k], ...out.stations[k] };
      out.stations[k].level = Math.max(0, Math.min(CONFIG.maxLevel, Math.floor(out.stations[k].level) || 0));
    }
    if (!Array.isArray(out.achievements)) out.achievements = [];
    out.achievements = out.achievements.filter(x => typeof x === 'string');
    if (typeof out.runEarned !== 'number' || p.version === 1) out.runEarned = out.totalEarned || 0;
    for (const k of ['coins', 'totalEarned', 'runEarned', 'pearls', 'prestiges', 'taps', 'fishCaught', 'playSeconds'] as const) {
      if (!Number.isFinite(out[k]) || out[k] < 0) return null;
    }
    return out;
  } catch { return null; }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    return raw ? parseSave(raw) : null;
  } catch { return null; }
}

export function wipe() { try { localStorage.removeItem(CONFIG.saveKey); } catch { /* ignore */ } }

// Portable save string for backup / moving to another device.
export const exportSave = (s: GameState) => btoa(unescape(encodeURIComponent(JSON.stringify(s))));
export function importSave(text: string): GameState | null {
  try { return parseSave(decodeURIComponent(escape(atob(text.trim())))); } catch { return null; }
}
