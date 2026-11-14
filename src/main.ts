import './style.css';
import { CONFIG } from './config';
import { applyOffline, newState, tick } from './game';
import { load, save } from './save';
import { mountUI } from './ui';

const loaded = load();
const state = loaded ?? newState();
const ui = mountUI(document.getElementById('app')!, state);

if (loaded) {
  const away = (Date.now() - loaded.lastSaved) / 1000;
  const res = applyOffline(state, away);
  if (away >= CONFIG.offlineMinShowSeconds && res.earned > 0) ui.showWelcome(res.away, res.credited, res.earned);
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, CONFIG.offlineCapSeconds);
  last = now;
  tick(state, dt);
  ui.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => save(state), CONFIG.saveIntervalSeconds * 1000);
window.addEventListener('beforeunload', () => save(state));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(state); });
