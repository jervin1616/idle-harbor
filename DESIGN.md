# Idle Harbor: Design Brief

| Field | Answer |
|---|---|
| Game name | Idle Harbor (working title; store-name check still pending) |
| Pitch | Grow a tiny fishing dock into a busy coastal harbor, then drift away while your crew keeps working. |
| Audience | Adults who want a relaxing, low-pressure game for short check-ins. |
| Art style | Warm dusk pixel art (code-drawn scene + CC0 boat sprites) |
| Prestige | "Set Sail": reset the voyage for Pearls (+10% income each, forever) |
| Not in v1 | Purchases, extra harbors, events, leaderboards, forced ads, banners |

## What is in the game
- **Four stations**, each levels 0-100: Fishing Dock, Cleaning Shed, Fishing Fleet, Market Stall.
  Income per cycle = base x level x milestone multiplier (x2 at levels 5, 10, 25, 50, 75, 100 = x64).
- **Managers** automate a station (also while the app is closed; offline earnings capped at 4 hours).
- **Fishing Fleet** boats upgrade through 7 tiers: Rowboat, Skiff, Mast Boat, Sailboat, Fishing Cutter, Trawler, Grand Schooner. Up to 3 boats at once.
- **Bulk buy**: x1, x10, x25, MAX.
- **53 badges** (taps, fish caught, coins, station levels, crew, boats, voyages, time played). Each adds +2% income.
- **Set Sail** prestige, **stats**, **settings** (sound, save export/import, erase), generated sound effects.
- Every balance number lives in `src/config.ts`. `tests/balance.test.ts` simulates a greedy player to check pacing.

## Still to build
Rewarded ads (AdMob test IDs), Android build via Capacitor, Play Store listing, daily rewards, crew/fish collection.
