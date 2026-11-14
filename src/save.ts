import { CONFIG } from './config';
import { GameState, newState } from './game';

export function save(s: GameState) {
  s.lastSaved = Date.now();
  try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(s)); } catch { /* storage full/blocked */ }
}

export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.version !== 1) return null;
    // Merge onto a fresh state so missing fields (from future config changes) get defaults.
    const base = newState();
    const out: GameState = { ...base, ...p, stations: { ...base.stations, ...p.stations } };
    for (const k of Object.keys(out.stations) as (keyof typeof out.stations)[]) {
      out.stations[k] = { ...base.stations[k], ...out.stations[k] };
    }
    if (!Number.isFinite(out.coins)) return null;
    return out;
  } catch { return null; }
}

export function wipe() { try { localStorage.removeItem(CONFIG.saveKey); } catch { /* ignore */ } }
