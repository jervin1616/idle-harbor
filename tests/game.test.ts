import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { applyOffline, buyManager, buyUpgrade, incomePerCycle, newState, startCycle, tap, tick } from '../src/game';
import { fmt } from '../src/format';

const rich = () => { const s = newState(0); s.coins = 1e9; return s; };

describe('game', () => {
  it('tap earns coins', () => { const s = newState(); tap(s); expect(s.coins).toBe(CONFIG.tapValue); });
  it('cannot upgrade without coins, can with', () => {
    const s = newState(); expect(buyUpgrade(s, 'dock')).toBe(false);
    s.coins = 10; expect(buyUpgrade(s, 'dock')).toBe(true); expect(s.stations.dock.level).toBe(1);
  });
  it('caps at max level', () => {
    const s = rich(); for (let i = 0; i < 20; i++) buyUpgrade(s, 'dock');
    expect(s.stations.dock.level).toBe(CONFIG.maxLevel);
  });
  it('milestone multipliers apply at levels 5 and 10', () => {
    expect(incomePerCycle('dock', 4)).toBe(4);
    expect(incomePerCycle('dock', 5)).toBe(10);
    expect(incomePerCycle('dock', 10)).toBe(40);
  });
  it('manual cycle pays once', () => {
    const s = rich(); buyUpgrade(s, 'dock'); const c0 = s.coins;
    expect(startCycle(s, 'dock')).toBe(true); tick(s, 2); expect(s.coins).toBe(c0 + 1);
    tick(s, 10); expect(s.coins).toBe(c0 + 1);
  });
  it('manager automates', () => {
    const s = rich(); buyUpgrade(s, 'dock'); buyManager(s, 'dock'); const c0 = s.coins;
    tick(s, 10); expect(s.coins).toBe(c0 + 5);
  });
  it('offline pays only managed stations and caps at 4h', () => {
    const s = rich(); buyUpgrade(s, 'dock'); buyUpgrade(s, 'shed'); buyManager(s, 'dock');
    const c0 = s.coins;
    const r = applyOffline(s, 100 * 3600);
    expect(r.credited).toBe(CONFIG.offlineCapSeconds);
    expect(s.coins - c0).toBe((CONFIG.offlineCapSeconds / 2) * 1);
  });
  it('formats big numbers', () => { expect(fmt(1500)).toBe('1.50K'); expect(fmt(2.5e9)).toBe('2.50B'); expect(fmt(42)).toBe('42'); });
});
