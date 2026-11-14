import { CONFIG, FLEET_TIERS, StationId } from './config';
import { GameState, fleetTiers } from './game';

export interface Achievement {
  id: string; name: string; desc: string; group: 'Fishing' | 'Coins' | 'Harbor' | 'Crew' | 'Fleet' | 'Voyages';
  target: number; value: (s: GameState) => number;
}

const list: Achievement[] = [];
const add = (a: Achievement) => list.push(a);
const big = (n: number) => (n >= 1e15 ? `${n / 1e15}Qa` : n >= 1e12 ? `${n / 1e12}T` : n >= 1e9 ? `${n / 1e9}B` : n >= 1e6 ? `${n / 1e6}M` : n >= 1e3 ? `${n / 1e3}K` : `${n}`);

[['First Cast', 10], ['Steady Hands', 100], ['Tap Master', 500], ['Finger of Fortune', 2500], ['Legend of the Pier', 10000], ['Tap Tsunami', 50000]]
  .forEach(([name, n]) => add({ id: `taps${n}`, name: name as string, group: 'Fishing', desc: `Tap the sea ${big(n as number)} times`, target: n as number, value: s => s.taps }));

[['Fresh Catch', 50], ['Net Full', 500], ['Fish Market', 5000], ['Fisher King', 50000], ['School Breaker', 500000], ['Ocean Hoarder', 5e6]]
  .forEach(([name, n]) => add({ id: `fish${n}`, name: name as string, group: 'Fishing', desc: `Catch ${big(n as number)} fish`, target: n as number, value: s => s.fishCaught }));

[['Pocket Change', 1e3], ['Coin Jar', 1e6], ['Treasure Chest', 1e9], ['Gold Hoard', 1e12], ['Dragon Vault', 1e15], ['Sea of Gold', 1e18]]
  .forEach(([name, n]) => add({ id: `earn${n}`, name: name as string, group: 'Coins', desc: `Earn ${big(n as number)} coins in total`, target: n as number, value: s => s.totalEarned }));

const levelNames: Record<StationId, string[]> = {
  dock: ['Pier Pal', 'Plank Layer', 'Dockmaster', 'Pier Pressure', 'Harbor Legend'],
  shed: ['Scale Scraper', 'Fillet Pro', 'Cleaning Crew', 'Shed Boss', 'Gutting Genius'],
  fleet: ['Deckhand', 'Bosun', 'Skipper', 'Admiral', 'Fleet Commodore'],
  market: ['Street Vendor', 'Fishmonger', 'Market Maven', 'Bazaar Boss', 'Merchant Prince'],
};
const stationLabel: Record<StationId, string> = { dock: 'Fishing Dock', shed: 'Cleaning Shed', fleet: 'Fishing Fleet', market: 'Market Stall' };
(Object.keys(levelNames) as StationId[]).forEach(id =>
  [10, 25, 50, 75, 100].forEach((lv, i) =>
    add({ id: `lv${id}${lv}`, name: levelNames[id][i], group: 'Harbor', desc: `Reach level ${lv} at the ${stationLabel[id]}`, target: lv, value: s => s.stations[id].level })));

add({ id: 'mgr1', name: 'First Hire', group: 'Crew', desc: 'Hire your first manager', target: 1, value: s => Object.values(s.stations).filter(x => x.hasManager).length });
add({ id: 'mgr4', name: 'Full Crew', group: 'Crew', desc: 'Hire all four managers', target: 4, value: s => Object.values(s.stations).filter(x => x.hasManager).length });
add({ id: 'built4', name: 'Harbor Town', group: 'Crew', desc: 'Build all four stations', target: 4, value: s => Object.values(s.stations).filter(x => x.level > 0).length });

FLEET_TIERS.forEach((name, i) => {
  if (i === 0) return;
  add({ id: `tier${i + 1}`, name: `Sailing the ${name}`, group: 'Fleet', desc: `Upgrade your lead boat to a ${name}`, target: i + 1, value: s => Math.max(...fleetTiers(s.stations.fleet.level)) });
});

[['Set Sail', 1], ['Seasoned Sailor', 3], ['Pearl Diver', 10]]
  .forEach(([name, n]) => add({ id: `sail${n}`, name: name as string, group: 'Voyages', desc: `Set sail ${n === 1 ? 'for the first time' : `${n} times`}`, target: n as number, value: s => s.prestiges }));
[['Regular', 3600], ['Dockside Local', 5 * 3600], ['Harbor Keeper', 24 * 3600]]
  .forEach(([name, n]) => add({ id: `play${n}`, name: name as string, group: 'Voyages', desc: `Spend ${(n as number) / 3600} hours in the harbor`, target: n as number, value: s => s.playSeconds }));

export const ACHIEVEMENTS: readonly Achievement[] = list;
export const progressOf = (s: GameState, a: Achievement) => Math.min(1, a.value(s) / a.target);
export const isUnlocked = (s: GameState, a: Achievement) => s.achievements.includes(a.id);

/** Unlock anything newly earned. Returns the new badges (also pushed into the save). */
export function checkAchievements(s: GameState): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!isUnlocked(s, a) && a.value(s) >= a.target) { s.achievements.push(a.id); fresh.push(a); }
  }
  return fresh;
}
export const BADGE_BONUS_TEXT = `+${Math.round(CONFIG.achievementBonus * 100)}% income each`;
