import { CONFIG, FLEET_TIERS, FLEET_TIER_LEVELS, StationId, stationById } from './config';
import {
  GameState, buyManager, buyUpgrade, costForLevels, cycleIncome, incomePerSecond, maxAffordable, nextMilestone, prestigeGain, upgradeCost,
} from './game';
import { Achievement } from './achievements';
import { fmt, fmtDuration } from './format';
import { save } from './save';
import { createScene } from './scene';
import { makeIcon, stationIcon } from './icons';
import { mountMenu } from './menu';
import { sfx } from './audio';

export function mountUI(root: HTMLElement, s: GameState) {
  root.innerHTML = `
    <div class="stage">
      <canvas id="scene"></canvas>
      <div class="hud"><div class="pill"><i class="coin"></i><span id="coins">0</span></div>
        <div class="rate" id="rate"></div></div>
      <button class="menubtn" id="menubtn" aria-label="Menu"><span id="mico"></span><i class="dot hidden" id="mdot"></i></button>
      <div class="toast hidden" id="toast"></div>
      <div class="hint" id="hint">Tap the sea to fish · tap a building or boat to upgrade it</div>
      <section class="sheet hidden" id="sheet">
        <button class="close" id="close" aria-label="Close">✕</button>
        <div class="top"><span class="emoji" id="sicon"></span>
          <div class="meta"><b class="title" id="stitle"></b><div class="info" id="sinfo"></div><div class="info sub" id="ssub"></div></div></div>
        <div class="amts" id="amts">${CONFIG.buyAmounts.map(n => `<button data-n="${n}">${n === 0 ? 'MAX' : 'x' + n}</button>`).join('')}</div>
        <div class="btns"><button class="up" id="sup"><span></span></button><button class="mgr" id="smgr"></button></div>
      </section>
      <div class="menu hidden" id="menu"></div>
    </div>
    <div id="modal" class="modal hidden"></div>`;

  let openId: StationId | null = null;
  let buyAmt = 1;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const sheet = $('sheet'), sicon = $('sicon'), stitle = $('stitle'), sinfo = $('sinfo'), ssub = $('ssub');
  const sup = $<HTMLButtonElement>('sup'), smgr = $<HTMLButtonElement>('smgr');
  const upLabel = sup.querySelector('span')!;
  const mgLabel = document.createElement('span');
  smgr.append(makeIcon('hat', 'ico small'), mgLabel);
  $('mico').appendChild(makeIcon('trophy', 'ico menu-ico'));
  const icons = new Map<StationId, HTMLCanvasElement>();
  for (const c of CONFIG.stations) icons.set(c.id, makeIcon(stationIcon[c.id], 'ico big'));
  const amtBtns = [...root.querySelectorAll<HTMLButtonElement>('#amts button')];
  amtBtns.forEach(b => b.addEventListener('click', () => { buyAmt = Number(b.dataset.n); sfx.tap(); }));

  function open(id: StationId | null) {
    openId = id;
    sheet.classList.toggle('hidden', id === null);
    if (id) sicon.replaceChildren(icons.get(id)!);
  }
  $('close').addEventListener('click', () => open(null));
  sup.addEventListener('click', () => { if (openId && buyUpgrade(s, openId, buyAmt) > 0) { sfx.buy(); save(s); } });
  smgr.addEventListener('click', () => { if (openId && buyManager(s, openId)) { sfx.buy(); save(s); } });

  // ----- toasts -----
  const toastEl = $('toast'); const queue: string[] = []; let showing = false;
  function pump() {
    if (showing || !queue.length) return;
    showing = true; toastEl.innerHTML = queue.shift()!; toastEl.classList.remove('hidden');
    setTimeout(() => { toastEl.classList.add('hidden'); showing = false; setTimeout(pump, 250); }, 3000);
  }
  const toast = (html: string) => { queue.push(html); pump(); };

  let unseen = 0;
  const menu = mountMenu($('menu'), s, { toast, closed: () => { unseen = 0; } });
  $('menubtn').addEventListener('click', () => { open(null); unseen = 0; menu.open('badges'); sfx.tap(); });

  const scene = createScene($<HTMLCanvasElement>('scene'), s, id => { open(id); });
  const coinsEl = $('coins'), rateEl = $('rate'), hint = $('hint'), modal = $('modal'), dot = $('mdot');
  let lastMenuRender = 0;

  function render(now: number) {
    scene.draw(now);
    coinsEl.textContent = fmt(s.coins);
    hint.classList.toggle('hidden', s.totalEarned > 40);
    let total = 0;
    for (const c of CONFIG.stations) total += s.stations[c.id].hasManager ? incomePerSecond(s, c.id) : 0;
    rateEl.textContent = total > 0 ? `+${fmt(total)}/sec` : '';
    rateEl.classList.toggle('hidden', total <= 0);
    const gain = prestigeGain(s);
    dot.classList.toggle('hidden', !(unseen > 0 || gain >= Math.max(1, Math.floor(s.pearls * 0.5))));
    if (menu.isOpen() && now - lastMenuRender > 0.4) { lastMenuRender = now; menu.render(); }
    if (!openId) return;

    const c = stationById(openId), st = s.stations[openId];
    amtBtns.forEach(b => b.classList.toggle('on', Number(b.dataset.n) === buyAmt));
    stitle.textContent = `${c.name} · Lv ${st.level}/${CONFIG.maxLevel}`;
    const room = CONFIG.maxLevel - st.level, maxed = room <= 0;
    let n = buyAmt === 0 ? maxAffordable(s, openId) : Math.min(buyAmt, room);
    if (buyAmt === 0 && n === 0) n = Math.min(1, room);
    const now1 = st.level < 1 ? 0 : cycleIncome(s, openId), next = maxed ? now1 : cycleIncome(s, openId, st.level + Math.max(n, 1));
    sinfo.textContent = st.level < 1 ? `Pays ${fmt(next)} per ${c.cycleSeconds}s${st.hasManager ? '' : ' (by hand)'}` : `${fmt(now1)}/${c.cycleSeconds}s${maxed ? '' : ` → ${fmt(next)}`}${st.hasManager ? '' : ' (by hand)'}`;
    const parts: string[] = [];
    const ms = nextMilestone(st.level); if (ms) parts.push(`x2 income at Lv ${ms}`);
    if (openId === 'fleet') {
      const tier = FLEET_TIER_LEVELS.filter(l => st.level >= l).length;
      if (tier < FLEET_TIERS.length) parts.push(`${FLEET_TIERS[tier]} at Lv ${FLEET_TIER_LEVELS[tier]}`);
      else parts.push(FLEET_TIERS[tier - 1]);
    }
    ssub.textContent = parts.join(' · ');
    const cost = maxed ? 0 : n > 0 ? costForLevels(openId, st.level, n) : upgradeCost(openId, st.level);
    upLabel.innerHTML = maxed ? 'MAX' : `${st.level < 1 ? 'Build' : 'Upgrade'}${n > 1 ? ' +' + n : ''} <i class="coin sm"></i>${fmt(cost)}`;
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
    modal.querySelector('#collect')!.addEventListener('click', () => { modal.classList.add('hidden'); sfx.coin(); });
  }

  function badgeUnlocked(list: Achievement[]) {
    if (!list.length) return;
    unseen += list.length; sfx.badge();
    for (const a of list) toast(`<b>Badge: ${a.name}</b><br><span class="small">${a.desc} · +${Math.round(CONFIG.achievementBonus * 100)}% income</span>`);
  }

  return { render, showWelcome, toast, badgeUnlocked };
}
