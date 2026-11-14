import { CONFIG, StationId } from './config';
import {
  GameState, buyManager, buyUpgrade, incomePerCycle, incomePerSecond,
  startCycle, upgradeCost,
} from './game';
import { fmt, fmtDuration } from './format';
import { save } from './save';
import { createScene } from './scene';

interface Row {
  id: StationId; root: HTMLElement; bar: HTMLElement; title: HTMLElement; info: HTMLElement;
  upBtn: HTMLButtonElement; mgrBtn: HTMLButtonElement;
}

export function mountUI(root: HTMLElement, s: GameState) {
  root.innerHTML = `
    <div class="stage">
      <canvas id="scene"></canvas>
      <div class="hud"><div class="pill"><i class="coin"></i><span id="coins">0</span></div>
        <div class="rate" id="rate"></div></div>
    </div>
    <main id="stations" class="panel"></main>
    <div id="modal" class="modal hidden"></div>`;
  const scene = createScene(root.querySelector<HTMLCanvasElement>('#scene')!, s);

  const coinsEl = root.querySelector<HTMLElement>('#coins')!;
  const rateEl = root.querySelector<HTMLElement>('#rate')!;
  const stationsEl = root.querySelector<HTMLElement>('#stations')!;
  const modal = root.querySelector<HTMLElement>('#modal')!;

  const rows: Row[] = CONFIG.stations.map(c => {
    const el = document.createElement('section');
    el.className = 'station';
    el.innerHTML = `
      <div class="top"><span class="emoji">${c.emoji}</span>
        <div class="meta"><b class="title"></b><div class="info"></div></div></div>
      <div class="barwrap"><div class="bar"></div></div>
      <div class="btns"><button class="up"></button><button class="mgr"></button></div>`;
    stationsEl.appendChild(el);
    const row: Row = {
      id: c.id, root: el, bar: el.querySelector('.bar')!, title: el.querySelector('.title')!,
      info: el.querySelector('.info')!, upBtn: el.querySelector('.up')!, mgrBtn: el.querySelector('.mgr')!,
    };
    el.querySelector('.top')!.addEventListener('click', () => startCycle(s, c.id));
    row.upBtn.addEventListener('click', () => { if (buyUpgrade(s, c.id)) save(s); });
    row.mgrBtn.addEventListener('click', () => { if (buyManager(s, c.id)) save(s); });
    return row;
  });

  function render() {
    scene.draw(performance.now() / 1000);
    coinsEl.textContent = fmt(s.coins);
    let total = 0;
    for (const r of rows) {
      const c = CONFIG.stations.find(x => x.id === r.id)!;
      const st = s.stations[r.id];
      if (st.hasManager) total += incomePerSecond(r.id, st);
      r.title.textContent = `${c.name}  ·  Lv ${st.level}/${CONFIG.maxLevel}`;
      if (st.level < 1) {
        r.info.textContent = 'Locked';
        r.bar.style.width = '0%';
      } else {
        const manual = !st.hasManager && !st.running ? ' · tap to run' : '';
        r.info.textContent = `${fmt(incomePerCycle(r.id, st.level))} per ${c.cycleSeconds}s${manual}`;
        const active = st.hasManager || st.running;
        r.bar.style.width = active ? `${Math.min(100, (st.progress / c.cycleSeconds) * 100)}%` : '0%';
      }
      const maxed = st.level >= CONFIG.maxLevel;
      const cost = maxed ? 0 : upgradeCost(r.id, st.level);
      r.upBtn.textContent = maxed ? 'MAX' : `${st.level < 1 ? 'Build' : 'Upgrade'} · 🪙${fmt(cost)}`;
      r.upBtn.disabled = maxed || s.coins < cost;
      r.mgrBtn.textContent = st.hasManager ? '👷 Manager hired' : `👷 Hire · 🪙${fmt(c.managerCost)}`;
      r.mgrBtn.disabled = st.hasManager || st.level < 1 || s.coins < c.managerCost;
      r.root.classList.toggle('locked', st.level < 1);
    }
    rateEl.textContent = total > 0 ? `+${fmt(total)}/sec automatic` : 'Hire managers to earn while you rest';
  }

  function showWelcome(away: number, credited: number, earned: number) {
    const capped = away > credited;
    modal.innerHTML = `<div class="card"><h2>Welcome back!</h2>
      <p>You were away ${fmtDuration(away)}.</p>
      <p class="big">🪙 +${fmt(earned)}</p>
      ${capped ? `<p class="small">Your crew works up to ${fmtDuration(CONFIG.offlineCapSeconds)} while you're away.</p>` : ''}
      <button id="collect">Collect</button></div>`;
    modal.classList.remove('hidden');
    modal.querySelector('#collect')!.addEventListener('click', () => modal.classList.add('hidden'));
  }

  return { render, showWelcome };
}
