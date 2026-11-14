// ALL balance numbers live here. Tweak freely; nothing else needs to change.

export type StationId = 'dock' | 'shed' | 'market' | 'fleet';

export interface StationConfig {
  id: StationId;
  name: string;
  baseCost: number;       // cost of level 1 (the unlock)
  costGrowth: number;     // each next level costs previous x this
  baseIncome: number;     // coins per cycle at level 1
  cycleSeconds: number;   // time for one work cycle
  managerCost: number;    // coins to hire the manager
}

export const CONFIG = {
  maxLevel: 100,
  tapValue: 1,                       // coins per tap on the sea
  offlineCapSeconds: 4 * 60 * 60,    // 4 hours
  offlineMinShowSeconds: 60,         // show "welcome back" only if away at least this long
  saveIntervalSeconds: 10,
  saveKey: 'idle-harbor-save-v1',
  // Income multiplier applied at these station levels (stacks): x2 each, so level 100 pays x64.
  milestoneLevels: [5, 10, 25, 50, 75, 100],
  milestoneMultiplier: 2,
  // Permanent bonuses (additive): each badge adds this much income, each Pearl adds this much.
  achievementBonus: 0.02,
  pearlBonus: 0.10,
  // "Set Sail" (prestige): Pearls gained = floor((coins earned this voyage / divisor) ^ exponent)
  prestigeDivisor: 5e7,
  prestigeExponent: 0.5,
  buyAmounts: [1, 10, 25, 0],        // 0 = buy as many as you can afford
  stations: [
    { id: 'dock',   name: 'Fishing Dock',  baseCost: 10,    costGrowth: 1.12, baseIncome: 1,   cycleSeconds: 2, managerCost: 150 },
    { id: 'shed',   name: 'Cleaning Shed', baseCost: 400,   costGrowth: 1.13, baseIncome: 12,  cycleSeconds: 4, managerCost: 3000 },
    { id: 'fleet',  name: 'Fishing Fleet', baseCost: 3500,  costGrowth: 1.14, baseIncome: 60,  cycleSeconds: 6, managerCost: 20000 },
    { id: 'market', name: 'Market Stall',  baseCost: 22000, costGrowth: 1.14, baseIncome: 160, cycleSeconds: 8, managerCost: 120000 },
  ] as StationConfig[],
};

// Boat upgrade path. The lead boat's tier = number of thresholds reached; extra boats lag FLEET_BOAT_GAP levels behind.
export const FLEET_TIERS = ['Rowboat', 'Skiff', 'Mast Boat', 'Sailboat', 'Fishing Cutter', 'Trawler', 'Grand Schooner'];
export const FLEET_TIER_LEVELS = [1, 5, 12, 22, 35, 55, 80];
export const FLEET_BOAT_GAP = 20;
// Dock levels at which another fisherman joins you on the pier.
export const DOCK_FISHER_LEVELS = [15, 40, 70];

export const stationById = (id: StationId): StationConfig =>
  CONFIG.stations.find(s => s.id === id)!;
