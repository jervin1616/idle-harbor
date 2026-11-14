import { CONFIG, FLEET_TIERS, StationId, stationById } from './config';

// Numbers are plain doubles (safe to ~1e308). Prestige in milestone 2 may need a
// big-number library; all math is kept in this file so that swap stays easy.

export interface StationState {
  level: number;
  hasManager: boolean;
  progress: number;   // seconds into the current cycle
  running: boolean;   // true while a manually-started cycle is in progress
}

export interface GameState {
  version: 1;
  coins: number;
  totalEarned: number;
  stations: Record<StationId, StationState>;
  lastSaved: number;  // ms timestamp
}

export function newState(now = Date.now()): GameState {
  const blank = (): StationState => ({ level: 0, hasManager: false, progress: 0, running: false });
  return {
    version: 1, coins: 0, totalEarned: 0, lastSaved: now,
    stations: { dock: blank(), shed: blank(), market: blank(), fleet: blank() },
  };
}

export function upgradeCost(id: StationId, level: number): number {
  const c = stationById(id);
  return Math.floor(c.baseCost * Math.pow(c.costGrowth, level)); // level = current level
}

export function incomeMultiplier(level: number): number {
  const hits = CONFIG.milestoneLevels.filter(l => level >= l).length;
  return Math.pow(CONFIG.milestoneMultiplier, hits);
}

export function incomePerCycle(id: StationId, level: number): number {
  if (level <= 0) return 0;
  return stationById(id).baseIncome * level * incomeMultiplier(level);
}

export function incomePerSecond(id: StationId, st: StationState): number {
  return incomePerCycle(id, st.level) / stationById(id).cycleSeconds;
}

function earn(s: GameState, amount: number) {
  s.coins += amount;
  s.totalEarned += amount;
}

export function tap(s: GameState) { earn(s, CONFIG.tapValue); }

export function startCycle(s: GameState, id: StationId): boolean {
  const st = s.stations[id];
  if (st.level < 1 || st.hasManager || st.running) return false;
  st.running = true;
  st.progress = 0;
  return true;
}

export function buyUpgrade(s: GameState, id: StationId): boolean {
  const st = s.stations[id];
  if (st.level >= CONFIG.maxLevel) return false;
  const cost = upgradeCost(id, st.level);
  if (s.coins < cost) return false;
  s.coins -= cost;
  st.level += 1;
  return true;
}

export function buyManager(s: GameState, id: StationId): boolean {
  const st = s.stations[id];
  if (st.level < 1 || st.hasManager) return false;
  const cost = stationById(id).managerCost;
  if (s.coins < cost) return false;
  s.coins -= cost;
  st.hasManager = true;
  st.running = false;
  return true;
}

/** Advance the game by dt seconds. Returns coins earned. Works for any dt (also used offline). */
export function tick(s: GameState, dt: number): number {
  const before = s.coins;
  for (const c of CONFIG.stations) {
    const st = s.stations[c.id];
    if (st.level < 1) continue;
    if (st.hasManager) {
      st.progress += dt;
      const cycles = Math.floor(st.progress / c.cycleSeconds);
      if (cycles > 0) {
        earn(s, cycles * incomePerCycle(c.id, st.level));
        st.progress -= cycles * c.cycleSeconds;
      }
    } else if (st.running) {
      st.progress += dt;
      if (st.progress >= c.cycleSeconds) {
        earn(s, incomePerCycle(c.id, st.level));
        st.running = false;
        st.progress = 0;
      }
    }
  }
  return s.coins - before;
}

/** Apply offline progress (capped). Returns { seconds credited, coins earned }. */
export function applyOffline(s: GameState, awaySeconds: number) {
  const credited = Math.max(0, Math.min(awaySeconds, CONFIG.offlineCapSeconds));
  // Only managed stations work while away; manual cycles do not continue.
  for (const c of CONFIG.stations) {
    const st = s.stations[c.id];
    if (!st.hasManager) { st.running = false; st.progress = 0; }
  }
  const earned = credited > 0 ? tick(s, credited) : 0;
  return { credited, away: awaySeconds, earned };
}

/** Tier (1-7, 0 = no boat) of each of the three boats at a given fleet level. */
export function fleetTiers(level: number): number[] {
  return [0, 1, 2].map(i => Math.max(0, Math.min(FLEET_TIERS.length, level - 3 * i)));
}
