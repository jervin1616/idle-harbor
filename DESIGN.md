# Idle Harbor: Design Brief (v1 draft, owner can edit anything here)

| Field | Answer |
|---|---|
| Game name | Idle Harbor (working title; store-name check still pending) |
| One sentence pitch | Grow a tiny fishing dock into a busy coastal harbor, then drift away while your crew keeps working. |
| Who it's for | Adults 25-55 who want a relaxing, low-pressure game for short check-ins between life tasks. |
| Art style (3 words) | Warm, soft, coastal |
| The 3 stations | Dock (catch fish), Cleaning Shed (prepare the catch), Market Stall (sell it) |
| What a manager does | Hire once per station. The station then runs its work cycle automatically, including while the app is closed (offline earnings). Without a manager the player taps the station to run one cycle. |
| Prestige currency | Pearls ("Set Sail", milestone 2) |
| 5 rewarded ad spots | 1) Double offline earnings 2) 2x income for 30 min 3) Instant skip of a long timer 4) Free daily chest, doubled 5) Lucky boat tap-for-reward (all milestone 3, test IDs only) |
| NOT in version 1 | Purchases, extra harbors, events, leaderboards, forced ads, banners |

## Milestone 1 rules
- Tap the harbor to earn coins by hand (important only for the first minutes).
- Each station has levels 0-10. Level 0 = locked; buying level 1 unlocks it.
- Income per cycle = baseIncome x level x milestone multiplier (x2 at level 5, x2 again at level 10).
- Offline earnings: managed stations only, capped at 4 hours.
- Every balance number lives in `src/config.ts`.
