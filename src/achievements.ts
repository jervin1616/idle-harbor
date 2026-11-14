import { CONFIG, FLEET_TIERS, OUTFITS, RODS, StationId } from './config';
import { DECOR } from './decor';
import { BAITS, FISH } from './fish';
import { CREW } from './crew';
import { GameState, fleetTiers } from './game';

export interface Achievement {
  id: string; name: string; desc: string; group: 'Fishing' | 'Coins' | 'Harbor' | 'Crew' | 'Fleet' | 'Gear' | 'Decor' | 'Collection' | 'Voyages';
  target: number; gems: number; value: (s: GameState) => number;
}

const list: Achievement[] = [];
const add = (a: Achievement) => list.push(a);
const big = (n: number) => (n >= 1e15 ? `${n / 1e15}Qa` : n >= 1e12 ? `${n / 1e12}T` : n >= 1e9 ? `${n / 1e9}B` : n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}K` : `${n}`);
const GEMS = [3, 5, 8, 12, 20, 30];   // gem reward climbs with each step of a series

[['First Cast', 10], ['Steady Hands', 100], ['Tap Master', 500], ['Finger of Fortune', 2500], ['Legend of the Pier', 10000], ['Tap Tsunami', 50000]]
  .forEach(([name, n], i) => add({ id: `taps${n}`, name: name as string, group: 'Fishing', desc: `Tap the sea ${big(n as number)} times`, target: n as number, gems: GEMS[i], value: s => s.taps }));

[['Fresh Catch', 50], ['Net Full', 500], ['Fish Market', 5000], ['Fisher King', 50000], ['School Breaker', 500000], ['Ocean Hoarder', 5e6]]
  .forEach(([name, n], i) => add({ id: `fish${n}`, name: name as string, group: 'Fishing', desc: `Catch ${big(n as number)} fish`, target: n as number, gems: GEMS[i], value: s => s.fishCaught }));

[['Pocket Change', 1e3], ['Coin Jar', 1e6], ['Treasure Chest', 1e9], ['Gold Hoard', 1e12], ['Dragon Vault', 1e15], ['Sea of Gold', 1e18]]
  .forEach(([name, n], i) => add({ id: `earn${n}`, name: name as string, group: 'Coins', desc: `Earn ${big(n as number)} coins in total`, target: n as number, gems: GEMS[i], value: s => s.totalEarned }));

const levelNames: Record<StationId, string[]> = {
  dock: ['Pier Pal', 'Plank Layer', 'Dockmaster', 'Pier Pressure', 'Harbor Legend'],
  shed: ['Scale Scraper', 'Fillet Pro', 'Cleaning Crew', 'Shed Boss', 'Gutting Genius'],
  fleet: ['Deckhand', 'Bosun', 'Skipper', 'Admiral', 'Fleet Commodore'],
  market: ['Street Vendor', 'Fishmonger', 'Market Maven', 'Bazaar Boss', 'Merchant Prince'],
};
const stationLabel: Record<StationId, string> = { dock: 'Fishing Dock', shed: 'Cleaning Shed', fleet: 'Fishing Fleet', market: 'Market Stall' };
(Object.keys(levelNames) as StationId[]).forEach(id =>
  [10, 25, 50, 75, 100].forEach((lv, i) =>
    add({ id: `lv${id}${lv}`, name: levelNames[id][i], group: 'Harbor', desc: `Reach level ${lv} at the ${stationLabel[id]}`, target: lv, gems: GEMS[i], value: s => s.stations[id].level })));

add({ id: 'mgr1', name: 'First Hire', group: 'Crew', desc: 'Hire your first manager', target: 1, gems: 3, value: s => Object.values(s.stations).filter(x => x.hasManager).length });
add({ id: 'mgr4', name: 'Full Crew', group: 'Crew', desc: 'Hire all four managers', target: 4, gems: 10, value: s => Object.values(s.stations).filter(x => x.hasManager).length });
add({ id: 'built4', name: 'Harbor Town', group: 'Crew', desc: 'Build all four stations', target: 4, gems: 5, value: s => Object.values(s.stations).filter(x => x.level > 0).length });

FLEET_TIERS.forEach((name, i) => {
  if (i === 0) return;
  add({ id: `tier${i + 1}`, name: `Sailing the ${name}`, group: 'Fleet', desc: `Upgrade your lead boat to a ${name}`, target: i + 1, gems: 4 + i * 3, value: s => Math.max(...fleetTiers(s.stations.fleet.level)) });
});

[['Better Bait', 2], ['Rod Collector', 4], ['Master Angler', RODS.length]]
  .forEach(([name, n], i) => add({ id: `rod${n}`, name: name as string, group: 'Gear', desc: `Own the ${RODS[(n as number) - 1].name}`, target: n as number, gems: [5, 10, 25][i], value: s => s.rodTier + 1 }));
[['Looking Sharp', 2], ['Dressed to Impress', 4], ['Sea Royalty', OUTFITS.length]]
  .forEach(([name, n], i) => add({ id: `fit${n}`, name: name as string, group: 'Gear', desc: `Wear the ${OUTFITS[(n as number) - 1].name}`, target: n as number, gems: [5, 10, 25][i], value: s => s.outfitTier + 1 }));
[['Home Improvement', 3], ['Beach Resort', 9], ['Showpiece Harbor', DECOR.length]]
  .forEach(([name, n], i) => add({ id: `decor${n}`, name: name as string, group: 'Decor', desc: `Own ${n} cosmetics`, target: n as number, gems: [5, 10, 25][i], value: s => s.decor.length }));

[['Curious Angler', 4], ['Fish Book Keeper', 8], ['Species Hunter', 12], ['Master of the Deep', FISH.length]]
  .forEach(([name, n], i) => add({ id: `species${n}`, name: name as string, group: 'Collection', desc: `Catch ${n} different kinds of fish`, target: n as number, gems: [5, 10, 15, 30][i], value: s => Object.keys(s.fishLog).length }));
[['Tackle Box', 3], ['Bait Master', BAITS.length]]
  .forEach(([name, n], i) => add({ id: `bait${n}`, name: name as string, group: 'Collection', desc: `Own ${n} different baits`, target: n as number, gems: [5, 15][i], value: s => s.baits.length }));
[['New Friends', 3], ['Harbor Family', 8], ['Everyone Aboard', CREW.length]]
  .forEach(([name, n], i) => add({ id: `crew${n}`, name: name as string, group: 'Collection', desc: `Recruit ${n} crew members`, target: n as number, gems: [5, 12, 30][i], value: s => s.crew.length }));

[['Set Sail', 1], ['Seasoned Sailor', 3], ['Pearl Diver', 10]]
  .forEach(([name, n], i) => add({ id: `sail${n}`, name: name as string, group: 'Voyages', desc: `Set sail ${n === 1 ? 'for the first time' : `${n} times`}`, target: n as number, gems: [10, 20, 40][i], value: s => s.prestiges }));
[['Regular', 3600], ['Dockside Local', 5 * 3600], ['Harbor Keeper', 24 * 3600]]
  .forEach(([name, n], i) => add({ id: `play${n}`, name: name as string, group: 'Voyages', desc: `Spend ${(n as number) / 3600} hours in the harbor`, target: n as number, gems: [5, 10, 25][i], value: s => s.playSeconds }));

export const ACHIEVEMENTS: readonly Achievement[] = list;
export const TOTAL_GEMS = list.reduce((a, b) => a + b.gems, 0);
export const progressOf = (s: GameState, a: Achievement) => Math.min(1, a.value(s) / a.target);
export const isUnlocked = (s: GameState, a: Achievement) => s.achievements.includes(a.id);

/** Unlock anything newly earned and pay its gems. Returns the new badges. */
export function checkAchievements(s: GameState): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!isUnlocked(s, a) && a.value(s) >= a.target) { s.achievements.push(a.id); s.gems += a.gems; fresh.push(a); }
  }
  return fresh;
}
export const BADGE_BONUS_TEXT = `+${Math.round(CONFIG.achievementBonus * 100)}% income each`;
