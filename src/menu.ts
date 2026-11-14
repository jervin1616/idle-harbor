import { ACHIEVEMENTS, BADGE_BONUS_TEXT, isUnlocked, progressOf } from './achievements';
import { CONFIG } from './config';
import { GameState, badgeMultiplier, newState, pearlMultiplier, prestigeGain, setSail } from './game';
import { fmt, fmtDuration } from './format';
import { exportSave, importSave, save, wipe } from './save';
import { makeIcon } from './icons';
import { sfx } from './audio';

type Tab = 'badges' | 'stats' | 'sail' | 'settings';
const TABS: [Tab, string][] = [['badges', 'Badges'], ['stats', 'Stats'], ['sail', 'Sail'], ['settings', 'Settings']];

export function mountMenu(host: HTMLElement, s: GameState, hooks: { toast: (html: string) => void; closed: () => void }) {
  host.innerHTML = `
    <div class="mcard">
      <button class="close" id="mclose" aria-label="Close">✕</button>
      <div class="tabs" id="tabs">${TABS.map(([id, label]) => `<button data-tab="${id}">${label}</button>`).join('')}</div>
      <div class="mbody">
        <div class="pane" data-pane="badges"><div class="phead" id="bhead"></div><div id="blist"></div></div>
        <div class="pane" data-pane="stats"><div id="slist" class="stats"></div></div>
        <div class="pane" data-pane="sail">
          <h3>Set Sail</h3>
          <p>Leave this harbor behind and start a new voyage. You keep your badges, and every Pearl you collect makes all income <b>+${Math.round(CONFIG.pearlBonus * 100)}%</b> stronger, forever.</p>
          <div id="sailinfo" class="stats"></div>
          <button class="big-btn" id="sailbtn">Set Sail</button>
          <p class="small" id="sailnote"></p>
        </div>
        <div class="pane" data-pane="settings">
          <h3>Settings</h3>
          <button class="row-btn" id="soundbtn"></button>
          <button class="row-btn" id="exportbtn">Copy save code</button>
          <textarea id="savebox" rows="3" placeholder="Paste a save code here to restore it"></textarea>
          <button class="row-btn" id="importbtn">Load save code</button>
          <button class="row-btn danger" id="resetbtn">Erase all progress</button>
          <p class="small" id="setnote"></p>
          <p class="small">Idle Harbor v0.2 · Boats art: ACTG (CC0)</p>
        </div>
      </div>
    </div>`;

  const $ = <T extends HTMLElement>(id: string) => host.querySelector<T>('#' + id)!;
  const panes = [...host.querySelectorAll<HTMLElement>('.pane')];
  const tabBtns = [...host.querySelectorAll<HTMLButtonElement>('#tabs button')];
  let tab: Tab = 'badges';
  let confirmSail = 0, confirmReset = 0;

  // ----- badge rows (built once, updated in render) -----
  const rows = new Map<string, { row: HTMLElement; icon: HTMLElement; bar: HTMLElement; txt: HTMLElement; done: boolean | null }>();
  let lastGroup = '';
  const blist = $('blist');
  for (const a of ACHIEVEMENTS) {
    if (a.group !== lastGroup) { lastGroup = a.group; const h = document.createElement('div'); h.className = 'grp'; h.textContent = a.group; blist.appendChild(h); }
    const row = document.createElement('div'); row.className = 'badge';
    row.innerHTML = `<span class="bicon"></span><div class="bmeta"><b>${a.name}</b><div class="small">${a.desc}</div><div class="bw"><div class="bb"></div></div></div><span class="bt"></span>`;
    blist.appendChild(row);
    rows.set(a.id, { row, icon: row.querySelector('.bicon')!, bar: row.querySelector('.bb')!, txt: row.querySelector('.bt')!, done: null });
  }

  const fmtVal = (id: string, n: number) => (id.startsWith('play') ? fmtDuration(n) : fmt(n));
  const setTab = (t: Tab) => { tab = t; tabBtns.forEach(b => b.classList.toggle('on', b.dataset.tab === t)); panes.forEach(p => p.classList.toggle('hidden', p.dataset.pane !== t)); render(); };
  tabBtns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab as Tab)));

  function open(t: Tab = 'badges') { host.classList.remove('hidden'); setTab(t); }
  function close() { host.classList.add('hidden'); hooks.closed(); }
  $('mclose').addEventListener('click', close);
  host.addEventListener('pointerdown', e => { if (e.target === host) close(); });

  // ----- actions -----
  $('sailbtn').addEventListener('click', () => {
    const gain = prestigeGain(s); if (gain < 1) return;
    if (performance.now() > confirmSail) { confirmSail = performance.now() + 4000; render(); return; }
    const got = setSail(s); confirmSail = 0; sfx.sail(); save(s); close();
    hooks.toast(`<b>You set sail!</b> +${got} Pearl${got === 1 ? '' : 's'}`);
  });
  $('soundbtn').addEventListener('click', () => { s.settings.sound = !s.settings.sound; sfx.enabled = s.settings.sound; if (sfx.enabled) sfx.buy(); save(s); render(); });
  $('exportbtn').addEventListener('click', async () => {
    const code = exportSave(s); const box = $<HTMLTextAreaElement>('savebox'); box.value = code;
    try { await navigator.clipboard.writeText(code); $('setnote').textContent = 'Save code copied. Keep it somewhere safe.'; }
    catch { box.select(); $('setnote').textContent = 'Select the code above and copy it.'; }
  });
  $('importbtn').addEventListener('click', () => {
    const got = importSave($<HTMLTextAreaElement>('savebox').value);
    if (!got) { $('setnote').textContent = 'That code did not work. Check you copied all of it.'; return; }
    Object.assign(s, got); sfx.enabled = s.settings.sound; save(s); $('setnote').textContent = 'Save loaded.'; render();
  });
  $('resetbtn').addEventListener('click', () => {
    if (performance.now() > confirmReset) { confirmReset = performance.now() + 4000; render(); return; }
    wipe(); Object.assign(s, newState()); sfx.enabled = true; confirmReset = 0; save(s); $('setnote').textContent = 'Everything was erased.'; render();
  });

  function render() {
    if (host.classList.contains('hidden')) return;
    if (tab === 'badges') {
      $('bhead').innerHTML = `<b>${s.achievements.length}/${ACHIEVEMENTS.length} badges</b> · income x${badgeMultiplier(s).toFixed(2)} <span class="small">(${BADGE_BONUS_TEXT})</span>`;
      for (const a of ACHIEVEMENTS) {
        const r = rows.get(a.id)!, done = isUnlocked(s, a);
        if (r.done !== done) { r.done = done; r.row.classList.toggle('done', done); r.icon.replaceChildren(makeIcon('trophy', 'ico small', !done)); }
        r.bar.style.width = `${Math.round(progressOf(s, a) * 100)}%`;
        r.txt.textContent = done ? '✓' : `${fmtVal(a.id, Math.min(a.value(s), a.target))}/${fmtVal(a.id, a.target)}`;
      }
    } else if (tab === 'stats') {
      const lines: [string, string][] = [
        ['Taps', fmt(s.taps)], ['Fish caught', fmt(s.fishCaught)], ['Coins earned (all time)', fmt(s.totalEarned)],
        ['Coins earned (this voyage)', fmt(s.runEarned)], ['Voyages completed', String(s.prestiges)], ['Pearls', String(s.pearls)],
        ['Time in the harbor', fmtDuration(s.playSeconds)], ['Badges', `${s.achievements.length}/${ACHIEVEMENTS.length}`],
        ['Total income bonus', `x${(pearlMultiplier(s) * badgeMultiplier(s)).toFixed(2)}`],
      ];
      $('slist').innerHTML = lines.map(([k, v]) => `<div class="srow"><span>${k}</span><b>${v}</b></div>`).join('');
    } else if (tab === 'sail') {
      const gain = prestigeGain(s);
      const need = CONFIG.prestigeDivisor * Math.pow(gain + 1, 1 / CONFIG.prestigeExponent);
      $('sailinfo').innerHTML = [
        ['Pearls now', `${s.pearls} (x${pearlMultiplier(s).toFixed(2)} income)`],
        ['Earned this voyage', fmt(s.runEarned)],
        ['Pearls if you sail now', `+${gain}`],
        ['Next Pearl at', `${fmt(need)} earned`],
      ].map(([k, v]) => `<div class="srow"><span>${k}</span><b>${v}</b></div>`).join('');
      const btn = $<HTMLButtonElement>('sailbtn'); const armed = performance.now() < confirmSail;
      btn.disabled = gain < 1; btn.textContent = gain < 1 ? 'Earn more to set sail' : armed ? 'Tap again to confirm' : `Set Sail for ${gain} Pearl${gain === 1 ? '' : 's'}`;
      btn.classList.toggle('armed', armed);
      $('sailnote').textContent = 'Your coins, stations and managers reset. Badges and Pearls stay.';
    } else {
      $('soundbtn').textContent = `Sound: ${s.settings.sound ? 'ON' : 'OFF'}`;
      const armed = performance.now() < confirmReset;
      $('resetbtn').textContent = armed ? 'Really erase everything? Tap again' : 'Erase all progress';
    }
  }

  host.classList.add('hidden');
  return { open, close, render, isOpen: () => !host.classList.contains('hidden') };
}
