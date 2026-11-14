import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { buyManager, buyUpgrade, cycleIncome, newState, prestigeGain, startCycle, tap, tick, upgradeCost, GameState } from '../src/game';
import { checkAchievements } from '../src/achievements';

// A greedy bot that always buys the best-value upgrade. Used to sanity-check pacing, not to be exact.
function step(s: GameState) {
  for (const c of CONFIG.stations) if (s.stations[c.id].level > 0 && !s.stations[c.id].hasManager) buyManager(s, c.id);
  for (let guard = 0; guard < 50; guard++) {
    let best: { id: typeof CONFIG.stations[number]['id']; score: number } | null = null;
    for (const c of CONFIG.stations) {
      const st = s.stations[c.id]; if (st.level >= CONFIG.maxLevel) continue;
      const cost = upgradeCost(c.id, st.level);
      const gain = (cycleIncome(s, c.id, st.level + 1) - (st.level ? cycleIncome(s, c.id) : 0)) / c.cycleSeconds;
      const score = cost / Math.max(gain, 1e-9);
      if (!best || score < best.score) best = { id: c.id, score };
    }
    if (!best || !buyUpgrade(s, best.id, 1)) break;
  }
}

describe('pacing (greedy bot)', () => {
  it('reaches max level and a first Set Sail in a sane time', () => {
    const s = newState(0); const marks: Record<string, number> = {};
    const mark = (k: string, t: number) => { if (!(k in marks)) marks[k] = t; };
    for (let t = 0; t < 400 * 3600; t++) {
      tap(s); tap(s);                                  // two taps a second, like an active player
      for (const c of CONFIG.stations) startCycle(s, c.id);   // hand-run stations until managers are hired
      tick(s, 1); step(s); checkAchievements(s);
      if (Object.values(s.stations).every(x => x.level > 0)) mark('all four built', t);
      if (Object.values(s.stations).every(x => x.hasManager)) mark('all managed', t);
      if (prestigeGain(s) >= 1) mark('first Pearl available', t);
      if (prestigeGain(s) >= 10) mark('10 Pearls available', t);
      if (Object.values(s.stations).every(x => x.level >= CONFIG.maxLevel)) { mark('everything maxed', t); break; }
    }
    const h = (v: number) => (v / 3600).toFixed(2) + 'h';
    console.log(Object.entries(marks).map(([k, v]) => `${k}: ${h(v)}`).join('\n'), `\nbadges: ${s.achievements.length}`);
    expect(marks['all four built']).toBeLessThan(1 * 3600);
    expect(marks['first Pearl available']).toBeLessThan(3 * 3600);
    expect(marks['everything maxed']).toBeLessThan(200 * 3600);
  });
});
