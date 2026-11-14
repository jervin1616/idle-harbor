import { finishBoot } from './boot';   // first, so the loading screen appears immediately
import './style.css';
import { CONFIG } from './config';
import { checkAchievements } from './achievements';
import { music, sfx } from './audio';
import { pendingStory } from './cutscene';
import { applyOffline, markCutscene, newState, tick } from './game';
import { load, save } from './save';
import { assetsReady } from './scene';
import { mountUI } from './ui';

const loaded = load();
const state = loaded ?? newState();
const isNewGame = !loaded;
sfx.enabled = state.settings.sound;
const ui = mountUI(document.getElementById('app')!, state);

let offline: { away: number; credited: number; earned: number } | null = null;
if (loaded) {
  markCutscene(state, 'intro');   // returning players do not need the intro again
  const away = (Date.now() - loaded.lastSaved) / 1000;
  const res = applyOffline(state, away);
  if (away >= CONFIG.offlineMinShowSeconds && res.earned > 0) offline = { away: res.away, credited: res.credited, earned: res.earned };
}
checkAchievements(state);   // quietly catch up on badges for old saves

let ready = false;
let last = performance.now(), sinceCheck = 0;
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, CONFIG.offlineCapSeconds);
  last = now;
  tick(state, dt);
  state.playSeconds += Math.min(dt, 5);
  if (state.boostLeft > 0) state.boostLeft = Math.max(0, state.boostLeft - Math.min(dt, 5));
  sinceCheck += dt;
  if (sinceCheck > 0.5) {
    sinceCheck = 0; ui.badgeUnlocked(checkAchievements(state));
    if (ready && ui.canPlayStory()) { const id = pendingStory(state); if (id) void ui.playStory(id); }
  }
  ui.render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => save(state), CONFIG.saveIntervalSeconds * 1000);
window.addEventListener('beforeunload', () => save(state));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(state); });
// Browsers only allow sound after a tap, so music starts on the first one.
window.addEventListener('pointerdown', () => { if (state.settings.music) music.start(); }, { once: true });

void (async () => {
  await finishBoot([assetsReady, document.fonts?.ready ?? Promise.resolve()]);
  ready = true;
  if (offline) ui.showWelcome(offline.away, offline.credited, offline.earned);
  if (isNewGame) { markCutscene(state, 'intro'); await ui.playStory('intro'); }
})();
