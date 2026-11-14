import './style.css';
import { CONFIG } from './config';
import { checkAchievements } from './achievements';
import { sfx } from './audio';
import { applyOffline, newState, tick } from './game';
import { load, save } from './save';
import { mountUI } from './ui';

const loaded = load();
const state = loaded ?? newState();
sfx.enabled = state.settings.sound;
const ui = mountUI(document.getElementById('app')!, state);

if (loaded) {
  const away = (Date.now() - loaded.lastSaved) / 1000;
  const res = applyOffline(state, away);
  if (away >= CONFIG.offlineMinShowSeconds && res.earned > 0) ui.showWelcome(res.away, res.credited, res.earned);
}
checkAchievements(state);   // quietly catch up on badges for old saves

let last = performance.now(), sinceCheck = 0;
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, CONFIG.offlineCapSeconds);
  last = now;
  tick(state, dt);
  state.playSeconds += Math.min(dt, 5);
  sinceCheck += dt;
  if (sinceCheck > 0.5) { sinceCheck = 0; ui.badgeUnlocked(checkAchievements(state)); }
  ui.render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => save(state), CONFIG.saveIntervalSeconds * 1000);
window.addEventListener('beforeunload', () => save(state));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(state); });
