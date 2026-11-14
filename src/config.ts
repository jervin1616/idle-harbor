// ALL balance numbers live here. Tweak freely; nothing else needs to change.

export type StationId = 'dock' | 'shed' | 'market' | 'fleet';

export interface StationConfig {
  id: StationId;
  name: string;
  emoji: string;
  baseCost: number;       // cost of level 1 (the unlock)
  costGrowth: number;     // each next level costs previous x this
  baseIncome: number;     // coins per cycle at level 1
  cycleSeconds: number;   // time for one work cycle
  managerCost: number;    // coins to hire the manager
}

export const CONFIG = {
  maxLevel: 10,
  tapValue: 1,                       // coins per tap on the harbor
  offlineCapSeconds: 4 * 60 * 60,    // 4 hours
  offlineMinShowSeconds: 60,         // show "welcome back" only if away at least this long
  saveIntervalSeconds: 10,
  saveKey: 'idle-harbor-save-v1',
  // Income multiplier applied at these levels (stacks): level 5 -> x2, level 10 -> x2 more
  milestoneLevels: [5, 10],
  milestoneMultiplier: 2,
  stations: [
    { id: 'dock',   name: 'Fishing Dock',  emoji: '🎣', baseCost: 10,   costGrowth: 1.5,  baseIncome: 1,   cycleSeconds: 2, managerCost: 100 },
    { id: 'shed',   name: 'Cleaning Shed', emoji: '🐟', baseCost: 200,  costGrowth: 1.55, baseIncome: 12,  cycleSeconds: 4, managerCost: 1500 },
    { id: 'fleet',  name: 'Fishing Fleet', emoji: '⛵', baseCost: 900,  costGrowth: 1.6,  baseIncome: 60,  cycleSeconds: 6, managerCost: 7000 },
    { id: 'market', name: 'Market Stall',  emoji: '🧺', baseCost: 3000, costGrowth: 1.6,  baseIncome: 160, cycleSeconds: 8, managerCost: 20000 },
  ] as StationConfig[],
};

// Boat upgrade path: fleet level L gives the lead boat tier L; each extra boat is 3 tiers behind.
export const FLEET_TIERS = ['Rowboat', 'Skiff', 'Mast Boat', 'Sailboat', 'Fishing Cutter', 'Trawler', 'Grand Schooner'];

export const stationById = (id: StationId): StationConfig =>
  CONFIG.stations.find(s => s.id === id)!;
