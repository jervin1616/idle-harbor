import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import {
  applyOffline, buyManager, buyUpgrade, costForLevels, cycleIncome, fleetTiers, globalMultiplier, incomePerCycle,
  maxAffordable, newState, prestigeGain, setSail, startCycle, tap, tick, upgradeCost,
} from '../src/game';
import { checkAchievements, ACHIEVEMENTS } from '../src/achievements';
import { exportSave, importSave, parseSave } from '../src/save';
import { fmt } from '../src/format';

const rich = () => { const s = newState(0); s.coins = 1e15; return s; };

describe('core loop', () => {
  it('tap earns coins and counts', () => { const s = newState(); tap(s); expect(s.coins).toBe(CONFIG.tapValue); expect(s.taps).toBe(1); expect(s.fishCaught).toBe(1); });
  it('cannot upgrade without coins, can with', () => {
    const s = newState(); expect(buyUpgrade(s, 'dock')).toBe(0);
    s.coins = 10; expect(buyUpgrade(s, 'dock')).toBe(1); expect(s.stations.dock.level).toBe(1);
  });
  it('caps at 100 levels', () => {
    const s = rich(); expect(buyUpgrade(s, 'dock', 0)).toBe(100); expect(s.stations.dock.level).toBe(100);
    expect(buyUpgrade(s, 'dock', 10)).toBe(0);
  });
  it('bulk cost equals buying one by one', () => {
    const s = newState(); let sum = 0; for (let i = 0; i < 25; i++) sum += upgradeCost('market', i);
    expect(Math.abs(costForLevels('market', 0, 25) - sum)).toBeLessThanOrEqual(25);
  });
  it('max affordable never overspends', () => {
    const s = newState(); s.coins = 5000; const n = maxAffordable(s, 'dock');
    expect(costForLevels('dock', 0, n)).toBeLessThanOrEqual(5000);
    expect(costForLevels('dock', 0, n + 1)).toBeGreaterThan(5000);
  });
  it('milestones double income at 5, 10, 25, 50, 75, 100', () => {
    expect(incomePerCycle('dock', 4)).toBe(4);
    expect(incomePerCycle('dock', 5)).toBe(10);
    expect(incomePerCycle('dock', 10)).toBe(40);
    expect(incomePerCycle('dock', 100)).toBe(100 * 64);
  });
  it('manual cycle pays once', () => {
    const s = rich(); buyUpgrade(s, 'dock'); const c0 = s.coins;
    expect(startCycle(s, 'dock')).toBe(true); tick(s, 2); expect(s.coins).toBe(c0 + 1);
    tick(s, 10); expect(s.coins).toBe(c0 + 1);
  });
  it('manager automates and fish are counted', () => {
    const s = rich(); buyUpgrade(s, 'dock'); buyManager(s, 'dock'); const c0 = s.coins;
    tick(s, 10); expect(s.coins).toBe(c0 + 5); expect(s.fishCaught).toBe(5);
  });
  it('offline pays only managed stations and caps at 4h', () => {
    const s = rich(); buyUpgrade(s, 'dock'); buyUpgrade(s, 'shed'); buyManager(s, 'dock');
    const c0 = s.coins; const r = applyOffline(s, 100 * 3600);
    expect(r.credited).toBe(CONFIG.offlineCapSeconds);
    expect(s.coins - c0).toBe(CONFIG.offlineCapSeconds / 2);
  });
  it('fleet earns offline once managed', () => {
    const s = rich(); buyUpgrade(s, 'fleet'); buyManager(s, 'fleet'); const c0 = s.coins;
    applyOffline(s, 60); expect(s.coins - c0).toBe(60 / 6 * 60);
  });
});

describe('fleet', () => {
  it('boats upgrade through tiers and extra boats follow', () => {
    expect(fleetTiers(0)).toEqual([0, 0, 0]);
    expect(fleetTiers(1)).toEqual([1, 0, 0]);
    expect(fleetTiers(22)).toEqual([4, 1, 0]);
    expect(fleetTiers(100)).toEqual([7, 7, 6]);
  });
});

describe('bonuses and prestige', () => {
  it('pearls and badges multiply income', () => {
    const s = rich(); buyUpgrade(s, 'dock'); s.pearls = 5; s.achievements = ['a', 'b', 'c', 'd', 'e'];
    expect(globalMultiplier(s)).toBeCloseTo(1.5 * 1.1);
    expect(cycleIncome(s, 'dock')).toBeCloseTo(1.65);
  });
  it('set sail grants pearls, resets the harbor, keeps badges and stats', () => {
    const s = rich(); buyUpgrade(s, 'dock', 10); s.runEarned = 5e9; s.achievements = ['x']; s.taps = 7;
    const expected = Math.floor(Math.sqrt(5e9 / CONFIG.prestigeDivisor)); expect(prestigeGain(s)).toBe(expected);
    expect(setSail(s)).toBe(expected);
    expect(s.pearls).toBe(expected); expect(s.prestiges).toBe(1); expect(s.coins).toBe(0);
    expect(s.stations.dock.level).toBe(0); expect(s.achievements).toEqual(['x']); expect(s.taps).toBe(7);
  });
  it('cannot set sail too early', () => { const s = newState(); s.runEarned = 1000; expect(setSail(s)).toBe(0); expect(s.prestiges).toBe(0); });
});

describe('achievements', () => {
  it('unlock once, never twice', () => {
    const s = newState(); s.taps = 100;
    const first = checkAchievements(s).map(a => a.id); expect(first).toContain('taps10'); expect(first).toContain('taps100');
    expect(checkAchievements(s)).toEqual([]);
  });
  it('ids are unique', () => { expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length); });
});

describe('saving', () => {
  it('export then import round-trips', () => {
    const s = newState(); s.coins = 123; s.pearls = 4; const back = importSave(exportSave(s));
    expect(back?.coins).toBe(123); expect(back?.pearls).toBe(4);
  });
  it('old v1 saves load with new fields filled in', () => {
    const old = JSON.stringify({ version: 1, coins: 50, totalEarned: 900, lastSaved: 1, stations: { dock: { level: 3, hasManager: true, progress: 0, running: false } } });
    const s = parseSave(old)!; expect(s.stations.dock.level).toBe(3); expect(s.stations.fleet.level).toBe(0); expect(s.runEarned).toBe(900); expect(s.settings.sound).toBe(true);
  });
  it('garbage is rejected', () => { expect(parseSave('nope')).toBeNull(); expect(importSave('!!!')).toBeNull(); });
});

describe('format', () => { it('formats big numbers', () => { expect(fmt(1500)).toBe('1.50K'); expect(fmt(2.5e9)).toBe('2.50B'); expect(fmt(42)).toBe('42'); }); });
