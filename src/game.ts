import { decorById } from './decor';
import { BAITS, FISH, FISH_INDEX_FACTOR, Fish, baitById } from './fish';
import { CREW, crewById } from './crew';
import { CONFIG, OUTFITS, RODS, DOCK_FISHER_LEVELS, FLEET_BOAT_GAP, FLEET_TIER_LEVELS, StationId, stationById } from './config';

// Numbers are plain doubles (safe to ~1e308); with 100 levels and prestige that is far more than enough.

export interface StationState {
  level: number;
  hasManager: boolean;
  progress: number;   // seconds into the current cycle
  running: boolean;   // true while a manually-started cycle is in progress
}

export interface GameState {
  version: 2;
  coins: number;
  totalEarned: number;     // lifetime, never reset
  runEarned: number;       // this voyage (reset by Set Sail)
  pearls: number;
  prestiges: number;
  taps: number;
  fishCaught: number;
  playSeconds: number;
  achievements: string[];
  settings: { sound: boolean; music: boolean };
  boostLeft: number;       // seconds of ad boost remaining (counts down only while playing)
  lastDaily: number;       // ms timestamp of last daily chest
  adsWatched: number;
  gems: number;            // earned from badges, spent on premium gear and cosmetics
  captainPass: boolean;    // shop purchase: permanent x2 income
  rodTier: number;         // index into RODS (highest owned = equipped)
  outfitTier: number;      // index into OUTFITS
  decor: string[];         // owned cosmetic ids
  skins: { sand: number; planks: number };   // equipped skin indexes (0 = default)
  fishLog: Record<string, number>;           // how many of each species you have caught
  crew: string[];                            // recruited crew ids
  baits: string[];                           // owned baits (plain is always available)
  bait: string;                              // equipped bait id
  cutscenes: string[];                       // story scenes already shown
  stations: Record<StationId, StationState>;
  lastSaved: number;       // ms timestamp
}

const blankStations = (): Record<StationId, StationState> => {
  const b = (): StationState => ({ level: 0, hasManager: false, progress: 0, running: false });
  return { dock: b(), shed: b(), market: b(), fleet: b() };
};

export function newState(now = Date.now()): GameState {
  return {
    version: 2, coins: 0, totalEarned: 0, runEarned: 0, pearls: 0, prestiges: 0, taps: 0, fishCaught: 0,
    playSeconds: 0, achievements: [], settings: { sound: true, music: true }, boostLeft: 0, lastDaily: 0, adsWatched: 0, gems: 0, captainPass: false, rodTier: 0, outfitTier: 0, decor: [], skins: { sand: 0, planks: 0 }, fishLog: {}, crew: [], baits: ['plain'], bait: 'plain', cutscenes: [], lastSaved: now, stations: blankStations(),
  };
}

// ---------- costs ----------
export function upgradeCost(id: StationId, level: number): number {
  const c = stationById(id);
  return Math.floor(c.baseCost * Math.pow(c.costGrowth, level)); // level = current level
}

/** Total cost of buying n levels starting from `level` (geometric series). */
export function costForLevels(id: StationId, level: number, n: number): number {
  if (n <= 0) return 0;
  const c = stationById(id), g = c.costGrowth;
  return Math.floor(c.baseCost * Math.pow(g, level) * (Math.pow(g, n) - 1) / (g - 1));
}

/** Most levels the player can afford right now (capped at max level). */
export function maxAffordable(s: GameState, id: StationId): number {
  const level = s.stations[id].level, room = CONFIG.maxLevel - level;
  if (room <= 0) return 0;
  const c = stationById(id), g = c.costGrowth;
  const first = c.baseCost * Math.pow(g, level);
  let n = Math.floor(Math.log(1 + (s.coins * (g - 1)) / first) / Math.log(g));
  n = Math.max(0, Math.min(room, n));
  while (n > 0 && costForLevels(id, level, n) > s.coins) n--;
  while (n < room && costForLevels(id, level, n + 1) <= s.coins) n++;
  return n;
}

// ---------- income ----------
export function incomeMultiplier(level: number): number {
  const hits = CONFIG.milestoneLevels.filter(l => level >= l).length;
  return Math.pow(CONFIG.milestoneMultiplier, hits);
}

export function nextMilestone(level: number): number | null {
  return CONFIG.milestoneLevels.find(l => l > level) ?? null;
}

/** Base income of a station at a level, before Pearl/badge bonuses. */
export function incomePerCycle(id: StationId, level: number): number {
  if (level <= 0) return 0;
  return stationById(id).baseIncome * level * incomeMultiplier(level);
}

export const pearlMultiplier = (s: GameState) => 1 + s.pearls * CONFIG.pearlBonus;
export const badgeMultiplier = (s: GameState) => 1 + s.achievements.length * CONFIG.achievementBonus;
export const boostMultiplier = (s: GameState) => (s.boostLeft > 0 ? CONFIG.boostMultiplier : 1);
export const passMultiplier = (s: GameState) => (s.captainPass ? 2 : 1);

// ---------- fish: market price index ----------
export const fishUnlocked = (s: GameState, f: Fish) =>
  (!f.req.dock || s.stations.dock.level >= f.req.dock) && (!f.req.fleet || s.stations.fleet.level >= f.req.fleet) && (!f.req.rod || s.rodTier >= f.req.rod);
export const unlockedFish = (s: GameState) => FISH.filter(f => fishUnlocked(s, f));
/** Every species you unlock raises what your whole catch sells for. 1.0 with just sardines. */
export const fishIndex = (s: GameState) => 1 - FISH_INDEX_FACTOR + FISH_INDEX_FACTOR * unlockedFish(s).reduce((n, f) => n + f.price, 0);

// ---------- crew bonuses ----------
export const crewBonus = (s: GameState, target: StationId | 'tap') =>
  1 + CREW.filter(c => s.crew.includes(c.id) && (c.target === target || c.target === 'all')).reduce((n, c) => n + c.bonus, 0);

export const globalMultiplier = (s: GameState) => pearlMultiplier(s) * badgeMultiplier(s) * boostMultiplier(s) * passMultiplier(s) * fishIndex(s);

/** What one cycle actually pays right now. */
export function cycleIncome(s: GameState, id: StationId, level = s.stations[id].level): number {
  return incomePerCycle(id, level) * globalMultiplier(s) * crewBonus(s, id);
}

export function incomePerSecond(s: GameState, id: StationId): number {
  const st = s.stations[id];
  return cycleIncome(s, id) / stationById(id).cycleSeconds * (st.level > 0 ? 1 : 0);
}

// ---------- fleet / dock visuals ----------
const tierAt = (level: number) => FLEET_TIER_LEVELS.filter(l => level >= l).length;
/** Tier (1-7, 0 = no boat) of each of the three boats at a given fleet level. */
export function fleetTiers(level: number): number[] {
  return [0, 1, 2].map(i => tierAt(level - FLEET_BOAT_GAP * i));
}
/** Hired fishermen on the pier (besides you). */
export const dockFishers = (level: number) => DOCK_FISHER_LEVELS.filter(l => level >= l).length;

// ---------- actions ----------
function earn(s: GameState, amount: number) {
  s.coins += amount; s.totalEarned += amount; s.runEarned += amount;
}

/** Coins one tap earns: base x rod x outfit x all income bonuses. */
export const tapValue = (s: GameState) => CONFIG.tapValue * RODS[s.rodTier].mult * OUTFITS[s.outfitTier].mult * globalMultiplier(s) * crewBonus(s, 'tap');

// ---------- catching fish ----------
const discoverListeners: ((f: Fish) => void)[] = [];
export const onFishDiscovered = (fn: (f: Fish) => void) => { discoverListeners.push(fn); };

function logCatch(s: GameState, f: Fish, n = 1) {
  const first = !s.fishLog[f.id];
  s.fishLog[f.id] = (s.fishLog[f.id] ?? 0) + n;
  if (first) { s.gems += f.gems; discoverListeners.forEach(fn => fn(f)); }
}
/** Pick a species among those you have unlocked, favouring the common ones. */
export function rollFish(s: GameState, rnd: () => number = Math.random): Fish {
  const pool = unlockedFish(s); const w = (f: Fish) => f.weight * baitFactor(s, f);
  const total = pool.reduce((n, f) => n + w(f), 0);
  let r = rnd() * total;
  for (const f of pool) { r -= w(f); if (r <= 0) return f; }
  return pool[pool.length - 1];
}
/** How much more likely the equipped bait makes this species. */
export function baitFactor(s: GameState, f: Fish): number {
  const b = baitById(s.bait); return b && b.targets.includes(f.id) ? b.mult : 1;
}
/** Record n fish caught (tapping, crews, boats, offline). Big batches are spread by rarity. */
export function recordCatches(s: GameState, n: number, rnd: () => number = Math.random) {
  if (n <= 0) return;
  s.fishCaught += n;
  if (n <= 25) { for (let i = 0; i < n; i++) logCatch(s, rollFish(s, rnd)); return; }
  const pool = unlockedFish(s); const w = (f: Fish) => f.weight * baitFactor(s, f); const total = pool.reduce((a, f) => a + w(f), 0);
  let left = n;
  for (const f of pool) { const k = Math.floor(n * w(f) / total); if (k > 0) { logCatch(s, f, k); left -= k; } }
  for (let i = 0; i < left; i++) logCatch(s, rollFish(s, rnd));
}

/** One tap on the sea: you catch one fish. Returns the species so the scene can show it. */
export function tap(s: GameState, rnd: () => number = Math.random): Fish {
  s.taps++; earn(s, tapValue(s));
  const f = rollFish(s, rnd); s.fishCaught++; logCatch(s, f);
  return f;
}

// ---------- gear ----------
export const canPay = (s: GameState, coins: number, gems = 0) => s.coins >= coins && s.gems >= gems;
function pay(s: GameState, coins: number, gems = 0) { s.coins -= coins; s.gems -= gems; }

export function buyRod(s: GameState): boolean {
  const next = RODS[s.rodTier + 1]; if (!next || !canPay(s, next.cost, next.gems)) return false;
  pay(s, next.cost, next.gems); s.rodTier++; return true;
}
export function buyOutfit(s: GameState): boolean {
  const next = OUTFITS[s.outfitTier + 1]; if (!next || !canPay(s, next.cost, next.gems)) return false;
  pay(s, next.cost, next.gems); s.outfitTier++; return true;
}

// ---------- decor ----------
export const ownsDecor = (s: GameState, id: string) => s.decor.includes(id);
/** Buy a cosmetic. Skins are equipped as soon as they are bought. */
export function buyDecor(s: GameState, id: string): boolean {
  const d = decorById(id);
  if (!d || ownsDecor(s, id) || !canPay(s, d.cost, d.gems)) return false;
  pay(s, d.cost, d.gems); s.decor.push(id);
  if (d.kind === 'sand') s.skins.sand = d.skin!;
  if (d.kind === 'planks') s.skins.planks = d.skin!;
  return true;
}
/** Switch between skins you own (index 0 is always available). */
export function equipSkin(s: GameState, kind: 'sand' | 'planks', idx: number): boolean {
  const owned = idx === 0 || s.decor.some(id => { const d = decorById(id); return d.kind === kind && d.skin === idx; });
  if (!owned) return false;
  s.skins[kind] = idx; return true;
}

export function startCycle(s: GameState, id: StationId): boolean {
  const st = s.stations[id];
  if (st.level < 1 || st.hasManager || st.running) return false;
  st.running = true; st.progress = 0;
  return true;
}

/** Buy `count` levels (0 = as many as affordable). Returns how many were bought. */
export function buyUpgrade(s: GameState, id: StationId, count = 1): number {
  const st = s.stations[id];
  const room = CONFIG.maxLevel - st.level;
  let n = count === 0 ? maxAffordable(s, id) : Math.min(count, room);
  if (n <= 0) return 0;
  const cost = costForLevels(id, st.level, n);
  if (s.coins < cost) return 0;
  s.coins -= cost; st.level += n;
  return n;
}

export function buyManager(s: GameState, id: StationId): boolean {
  const st = s.stations[id];
  if (st.level < 1 || st.hasManager) return false;
  const cost = stationById(id).managerCost;
  if (s.coins < cost) return false;
  s.coins -= cost; st.hasManager = true; st.running = false;
  return true;
}

// Fish caught per finished cycle: dock = 1 + fishermen, fleet = number of boats.
function fishForCycle(s: GameState, id: StationId): number {
  const lvl = s.stations[id].level;
  if (id === 'dock') return 1 + dockFishers(lvl);
  if (id === 'fleet') return fleetTiers(lvl).filter(v => v > 0).length;
  return 0;
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
        earn(s, cycles * cycleIncome(s, c.id));
        recordCatches(s, cycles * fishForCycle(s, c.id));
        st.progress -= cycles * c.cycleSeconds;
      }
    } else if (st.running) {
      st.progress += dt;
      if (st.progress >= c.cycleSeconds) {
        earn(s, cycleIncome(s, c.id));
        recordCatches(s, fishForCycle(s, c.id));
        st.running = false; st.progress = 0;
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
  const boost = s.boostLeft; s.boostLeft = 0;   // the ad boost only counts while you are playing
  const earned = credited > 0 ? tick(s, credited) : 0;
  s.boostLeft = boost;
  return { credited, away: awaySeconds, earned };
}

// ---------- prestige ("Set Sail") ----------
export function prestigeGain(s: GameState): number {
  return Math.floor(Math.pow(Math.max(0, s.runEarned) / CONFIG.prestigeDivisor, CONFIG.prestigeExponent));
}

/** Reset the voyage for Pearls. Badges, stats and settings stay. Returns Pearls gained. */
export function setSail(s: GameState): number {
  const gain = prestigeGain(s);
  if (gain < 1) return 0;
  s.pearls += gain; s.prestiges++;
  s.coins = 0; s.runEarned = 0; s.stations = blankStations();
  return gain;
}

// ---------- daily chest ----------
export const dailyReady = (s: GameState, now = Date.now()) => now - s.lastDaily >= CONFIG.dailyCooldownHours * 3600 * 1000;
export const dailyMsLeft = (s: GameState, now = Date.now()) => Math.max(0, CONFIG.dailyCooldownHours * 3600 * 1000 - (now - s.lastDaily));
/** Chest pays some minutes of the player's automatic income (never less than a floor). */
export function dailyReward(s: GameState): number {
  let perSec = 0;
  for (const c of CONFIG.stations) if (s.stations[c.id].hasManager) perSec += incomePerSecond(s, c.id) / boostMultiplier(s);
  return Math.floor(Math.max(CONFIG.dailyMinCoins, perSec * CONFIG.dailyIncomeSeconds));
}
export function claimDaily(s: GameState, doubled: boolean, now = Date.now()): number {
  if (!dailyReady(s, now)) return 0;
  const amount = dailyReward(s) * (doubled ? 2 : 1);
  s.coins += amount; s.totalEarned += amount; s.runEarned += amount; s.lastDaily = now;
  return amount;
}

// ---------- crew ----------
export const hasCrew = (s: GameState, id: string) => s.crew.includes(id);
export function recruit(s: GameState, id: string): boolean {
  const c = crewById(id);
  if (!c || hasCrew(s, id) || !canPay(s, c.cost, c.gems)) return false;
  pay(s, c.cost, c.gems); s.crew.push(id); return true;
}

// ---------- story scenes ----------
export const seenCutscene = (s: GameState, id: string) => s.cutscenes.includes(id);
export function markCutscene(s: GameState, id: string) { if (!s.cutscenes.includes(id)) s.cutscenes.push(id); }

// ---------- bait ----------
export function buyBait(s: GameState, id: string): boolean {
  const b = baitById(id);
  if (!b || s.baits.includes(id) || !canPay(s, b.cost, b.gems)) return false;
  pay(s, b.cost, b.gems); s.baits.push(id); s.bait = id; return true;   // new bait is equipped right away
}
export function equipBait(s: GameState, id: string): boolean {
  if (!s.baits.includes(id)) return false;
  s.bait = id; return true;
}
export const allBaits = BAITS;
