import { CONFIG, StationId } from './config';
import { GameState, boostMultiplier, incomePerSecond } from './game';
import { fmt } from './format';

export interface Product {
  id: string; name: string; price: string; kind: 'coins' | 'gems' | 'pass';
  hours?: number; minCoins?: number;   // coin packs pay this many hours of your income (never less than the floor)
  gems?: number;
}

export const PRODUCTS: Product[] = [
  { id: 'coins_s', kind: 'coins', name: 'Pouch of Coins',  price: '$0.99',  hours: 0.33, minCoins: 5000 },
  { id: 'coins_m', kind: 'coins', name: 'Bag of Coins',    price: '$2.99',  hours: 2,    minCoins: 40000 },
  { id: 'coins_l', kind: 'coins', name: 'Chest of Coins',  price: '$7.99',  hours: 8,    minCoins: 250000 },
  { id: 'coins_x', kind: 'coins', name: 'Vault of Coins',  price: '$19.99', hours: 24,   minCoins: 1.5e6 },
  { id: 'gems_s',  kind: 'gems',  name: 'Handful of Gems', price: '$0.99',  gems: 40 },
  { id: 'gems_m',  kind: 'gems',  name: 'Pouch of Gems',   price: '$2.99',  gems: 150 },
  { id: 'gems_l',  kind: 'gems',  name: 'Chest of Gems',   price: '$7.99',  gems: 450 },
  { id: 'gems_x',  kind: 'gems',  name: 'Vault of Gems',   price: '$19.99', gems: 1200 },
  { id: 'pass',    kind: 'pass',  name: "Captain's Pass",  price: '$4.99' },
];

/** Coins a coin pack pays right now: scales with your automatic income so it stays worth buying. */
export function packCoins(s: GameState, p: Product): number {
  let perSec = 0;
  for (const c of CONFIG.stations) if (s.stations[c.id as StationId].hasManager) perSec += incomePerSecond(s, c.id) / boostMultiplier(s);
  return Math.floor(Math.max(p.minCoins ?? 0, perSec * (p.hours ?? 0) * 3600));
}

/** Hand over what was bought. Returns a short description for the toast. */
export function grantProduct(s: GameState, p: Product): string {
  if (p.kind === 'coins') { const n = packCoins(s, p); s.coins += n; s.totalEarned += n; s.runEarned += n; return `+${fmt(n)} coins`; }
  if (p.kind === 'gems') { s.gems += p.gems!; return `+${p.gems} gems`; }
  s.captainPass = true; s.gems += 100; return 'Captain\'s Pass active: x2 income forever, +100 gems';
}
