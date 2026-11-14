import { CONFIG, StationId, stationById } from './config';
import {
  GameState, buyManager, buyUpgrade, incomePerCycle, incomePerSecond, upgradeCost,
} from './game';
import { fmt, fmtDuration } from './format';
import { save } from './save';
import { createScene } from './scene';
import { makeIcon, stationIcon } from './icons';

export function mountUI(root: HTMLElement, s: GameState) {
  root.innerHTML = `
    <div class="stage">
      <canvas id="scene"></canvas>
      <div class="hud"><div class="pill"><i class="coin"></i><span id="coins">0</span></div>
        <div class="rate" id="rate"></div></div>
      <div class="hint" id="hint">Tap the sea to fish · tap a building to upgrade it</div>
      <section class="sheet hidden" id="sheet">
        <button class="close" id="close" aria-label="Close">✕</button>
        <div class="top"><span class="emoji" id="sicon"></span>
          <div class="meta"><b class="title" id="stitle"></b><div class="info" id="sinfo"></div></div></div>
        <div class="btns"><button class="up" id="sup"><span></span></button><button class="mgr" id="smgr"></button></div>
      </section>
    </div>
    <div id="modal" class="modal hidden"></div>`;

  let openId: StationId | null = null;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const sheet = $('sheet'), sicon = $('sicon'), stitle = $('stitle'), sinfo = $('sinfo');
  const sup = $<HTMLButtonElement>('sup'), smgr = $<HTMLButtonElement>('smgr');
  const upLabel = sup.querySelector('span')!;
  const mgIcon = makeIcon('hat', 'ico small'), mgLabel = document.createElement('span');
  smgr.append(mgIcon, mgLabel);
  const icons = new Map<StationId, HTMLCanvasElement>();
  for (const c of CONFIG.stations) icons.set(c.id, makeIcon(stationIcon[c.id], 'ico big'));

  function open(id: StationId | null) {
    openId = id;
    sheet.classList.toggle('hidden', id === null);
    if (id) sicon.replaceChildren(icons.get(id)!);
  }
  $('close').addEventListener('click', () => open(null));
  sup.addEventListener('click', () => { if (openId && buyUpgrade(s, openId)) save(s); });
  smgr.addEventListener('click', () => { if (openId && buyManager(s, openId)) save(s); });

  const scene = createScene($<HTMLCanvasElement>('scene'), s, open);
  const coinsEl = $('coins'), rateEl = $('rate'), hint = $('hint'), modal = $('modal');

  function render() {
    scene.draw(performance.now() / 1000);
    coinsEl.textContent = fmt(s.coins);
    hint.classList.toggle('hidden', s.totalEarned > 40);
    let total = 0;
    for (const c of CONFIG.stations) if (s.stations[c.id].hasManager) total += incomePerSecond(c.id, s.stations[c.id]);
    rateEl.textContent = total > 0 ? `+${fmt(total)}/sec` : '';
    rateEl.classList.toggle('hidden', total <= 0);

    if (!openId) return;
    const c = stationById(openId), st = s.stations[openId];
    stitle.textContent = `${c.name} · Lv ${st.level}/${CONFIG.maxLevel}`;
    const maxed = st.level >= CONFIG.maxLevel;
    if (st.level < 1) sinfo.textContent = 'Not built yet';
    else {
      const now = incomePerCycle(openId, st.level), next = maxed ? now : incomePerCycle(openId, st.level + 1);
      sinfo.textContent = `${fmt(now)} per ${c.cycleSeconds}s${maxed ? '' : ` → ${fmt(next)}`}${st.hasManager ? '' : ' · hand-run'}`;
    }
    const cost = maxed ? 0 : upgradeCost(openId, st.level);
    upLabel.innerHTML = maxed ? 'MAX' : `${st.level < 1 ? 'Build' : 'Upgrade'} <i class="coin sm"></i>${fmt(cost)}`;
    sup.disabled = maxed || s.coins < cost;
    mgLabel.innerHTML = st.hasManager ? 'Hired' : `Hire <i class="coin sm"></i>${fmt(c.managerCost)}`;
    smgr.disabled = st.hasManager || st.level < 1 || s.coins < c.managerCost;
  }

  function showWelcome(away: number, credited: number, earned: number) {
    const capped = away > credited;
    modal.innerHTML = `<div class="card"><h2>Welcome back!</h2>
      <p>You were away ${fmtDuration(away)}.</p>
      <p class="big"><i class="coin"></i> +${fmt(earned)}</p>
      ${capped ? `<p class="small">Your crew works up to ${fmtDuration(CONFIG.offlineCapSeconds)} while you're away.</p>` : ''}
      <button id="collect">Collect</button></div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#collect')!.addEventListener('click', () => modal.classList.add('hidden'));
  }

  return { render, showWelcome };
}
