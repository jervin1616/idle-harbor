import { CONFIG, OUTFITS, RODS, FLEET_TIERS, FLEET_TIER_LEVELS, StationId, stationById } from './config';
import {
  GameState, canPay, claimDaily, dailyReady, dailyReward, buyManager, buyUpgrade, costForLevels, cycleIncome, incomePerSecond, maxAffordable, nextMilestone, prestigeGain, upgradeCost,
} from './game';
import { Achievement } from './achievements';
import { fmt, fmtDuration } from './format';
import { save } from './save';
import { createScene } from './scene';
import { makeIcon, stationIcon } from './icons';
import { mountMenu } from './menu';
import { sfx } from './audio';
import { setPurchasePresenter } from './payments';
import { setAdPresenter, showRewarded } from './ads';

export function mountUI(root: HTMLElement, s: GameState) {
  root.innerHTML = `
    <div class="stage">
      <canvas id="scene"></canvas>
      <div class="hud"><div class="pill"><i class="coin"></i><span id="coins">0</span></div>
        <div class="gempill"><i class="gemi"></i><span id="gems">0</span></div>
        <div class="rate" id="rate"></div></div>
      <button class="menubtn" id="menubtn" aria-label="Menu"><span id="mico"></span><i class="dot hidden" id="mdot"></i></button>
      <div class="side">
        <button class="sidebtn" id="boostbtn" aria-label="Income boost"><span id="bico"></span><small id="btxt">x2</small></button>
        <button class="sidebtn pulse hidden" id="chestbtn" aria-label="Daily chest"><span id="cico"></span><small>Daily</small></button>
      </div>
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
      <div class="adscreen hidden" id="adscreen"></div>
    </div>
    <div id="modal" class="modal hidden"></div>`;

  let openId: StationId | null = null;
  let buyAmt = 1;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const modal = $('modal');
  const sheet = $('sheet'), sicon = $('sicon'), stitle = $('stitle'), sinfo = $('sinfo'), ssub = $('ssub');
  const sup = $<HTMLButtonElement>('sup'), smgr = $<HTMLButtonElement>('smgr');
  const upLabel = sup.querySelector('span')!;
  const mgLabel = document.createElement('span');
  smgr.append(makeIcon('hat', 'ico small'), mgLabel);
  $('mico').appendChild(makeIcon('menu', 'ico menu-ico'));
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
  $('menubtn').addEventListener('click', () => { open(null); unseen = 0; menu.open('gear'); sfx.tap(); });

  $('bico').appendChild(makeIcon('bolt', 'ico menu-ico'));
  $('cico').appendChild(makeIcon('chest', 'ico menu-ico'));
  const adscreen = $('adscreen');
  // Placeholder ad: swapped for a real rewarded ad in the Android build.
  function playAd(): Promise<boolean> {
    return new Promise(res => {
      let n = 3; adscreen.classList.remove('hidden');
      adscreen.innerHTML = `<div class="card"><p class="small">TEST AD</p><h2>Your ad plays here</h2><p class="big" id="adn">${n}</p><button id="adx" class="alt">Close (no reward)</button></div>`;
      const done = (ok: boolean) => { clearInterval(iv); adscreen.classList.add('hidden'); res(ok); };
      const iv = setInterval(() => { n--; if (n <= 0) done(true); else adscreen.querySelector('#adn')!.textContent = String(n); }, 1000);
      adscreen.querySelector('#adx')!.addEventListener('click', () => done(false));
    });
  }
  setAdPresenter(playAd);
  // Placeholder checkout: swapped for Google Play Billing later. Nothing is charged in test mode.
  setPurchasePresenter((name, price) => new Promise(res => {
    adscreen.classList.remove('hidden');
    adscreen.innerHTML = `<div class="card"><p class="small">TEST PURCHASE</p><h2>${name}</h2><p class="big">${price}</p><p class="small">Nothing is charged. Real payments are added later.</p><button id="pok">Confirm</button><button id="pno" class="alt">Cancel</button></div>`;
    const done = (ok: boolean) => { adscreen.classList.add('hidden'); res(ok); };
    adscreen.querySelector('#pok')!.addEventListener('click', () => done(true));
    adscreen.querySelector('#pno')!.addEventListener('click', () => done(false));
  }));
  $('boostbtn').addEventListener('click', async () => {
    if (s.boostLeft > 0) { toast(`<b>Boost running</b><br><span class="small">x${CONFIG.boostMultiplier} income, ${fmtDuration(s.boostLeft)} left</span>`); return; }
    if (await showRewarded()) { s.boostLeft = CONFIG.boostSeconds; s.adsWatched++; sfx.buy(); save(s); toast(`<b>x${CONFIG.boostMultiplier} income</b> for ${CONFIG.boostSeconds / 60} minutes!`); }
  });
  $('chestbtn').addEventListener('click', () => {
    if (!dailyReady(s)) return;
    const base = dailyReward(s);
    modal.innerHTML = `<div class="card"><h2>Daily chest</h2><p class="big"><i class="coin"></i> +${fmt(base)}</p>
      <button id="cc">Collect</button><button id="cd" class="alt">Watch ad: x2 (${fmt(base * 2)})</button></div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#cc')!.addEventListener('click', () => { claimDaily(s, false); sfx.coin(); save(s); modal.classList.add('hidden'); });
    modal.querySelector('#cd')!.addEventListener('click', async () => {
      if (await showRewarded()) { s.adsWatched++; claimDaily(s, true); sfx.badge(); save(s); modal.classList.add('hidden'); }
    });
  });

  const scene = createScene($<HTMLCanvasElement>('scene'), s, id => { open(id); });
  const coinsEl = $('coins'), rateEl = $('rate'), hint = $('hint'), gemsEl = $('gems'), dot = $('mdot'), btxt = $('btxt'), chestbtn = $('chestbtn'), boostbtn = $('boostbtn');
  let lastMenuRender = 0;

  function render(now: number) {
    scene.draw(now);
    coinsEl.textContent = fmt(s.coins); gemsEl.textContent = String(s.gems);
    hint.classList.toggle('hidden', s.totalEarned > 40);
    let total = 0;
    for (const c of CONFIG.stations) total += s.stations[c.id].hasManager ? incomePerSecond(s, c.id) : 0;
    rateEl.textContent = total > 0 ? `+${fmt(total)}/sec` : '';
    rateEl.classList.toggle('hidden', total <= 0);
    const gain = prestigeGain(s);
    btxt.textContent = s.boostLeft > 0 ? fmtDuration(Math.ceil(s.boostLeft)) : 'x2';
    boostbtn.classList.toggle('on', s.boostLeft > 0);
    chestbtn.classList.toggle('hidden', !dailyReady(s));
    const nr = RODS[s.rodTier + 1], no = OUTFITS[s.outfitTier + 1];
    const gearReady = (nr && canPay(s, nr.cost, nr.gems)) || (no && canPay(s, no.cost, no.gems));
    dot.classList.toggle('hidden', !(unseen > 0 || gearReady || gain >= Math.max(1, Math.floor(s.pearls * 0.5))));
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
      <button id="collect">Collect</button><button id="double" class="alt">Watch ad: double it</button></div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#collect')!.addEventListener('click', () => { modal.classList.add('hidden'); sfx.coin(); });
    modal.querySelector('#double')!.addEventListener('click', async () => {
      if (await showRewarded()) { s.adsWatched++; s.coins += earned; s.totalEarned += earned; s.runEarned += earned; sfx.badge(); save(s); modal.classList.add('hidden'); toast(`<b>Doubled!</b> +${fmt(earned)} more`); }
    });
  }

  function badgeUnlocked(list: Achievement[]) {
    if (!list.length) return;
    unseen += list.length; sfx.badge();
    for (const a of list) toast(`<b>Badge: ${a.name}</b><br><span class="small">${a.desc}<br>+${Math.round(CONFIG.achievementBonus * 100)}% income · +${a.gems} gems</span>`);
  }

  return { render, showWelcome, toast, badgeUnlocked };
}
