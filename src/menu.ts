import { ACHIEVEMENTS, BADGE_BONUS_TEXT, isUnlocked, progressOf } from './achievements';
import { CONFIG, OUTFITS, RODS } from './config';
import { BAITS, FISH, fishById } from './fish';
import { CREW } from './crew';
import { DECOR, DecorKind, PLANK_SKINS, SAND_SKINS } from './decor';
import { PRODUCTS, grantProduct, packCoins } from './shop';
import { purchase, PAYMENTS } from './payments';
import { GameState, badgeMultiplier, buyBait, equipBait, fishIndex, fishUnlocked, hasCrew, recruit, buyDecor, canPay, buyOutfit, buyRod, equipSkin, newState, ownsDecor, pearlMultiplier, prestigeGain, setSail, tapValue } from './game';
import { fmt, fmtDuration } from './format';
import { exportSave, importSave, save, wipe } from './save';
import { makeIcon } from './icons';
import { sfx } from './audio';

type Tab = 'gear' | 'decor' | 'crew' | 'fish' | 'shop' | 'badges' | 'stats' | 'sail' | 'settings';
const TABS: [Tab, string, string][] = [['fish', 'Fish Book', 'fish'], ['crew', 'Crew', 'person'], ['gear', 'Gear', 'rod'], ['decor', 'Decor', 'chest'], ['shop', 'Shop', 'basket'], ['badges', 'Badges', 'trophy'], ['stats', 'Stats', 'menu'], ['sail', 'Set Sail', 'boat'], ['settings', 'Settings', 'bolt']];

export function mountMenu(host: HTMLElement, s: GameState, hooks: { toast: (html: string) => void; closed: () => void; music: (on: boolean) => void; sailed: () => void }) {
  host.innerHTML = `
    <div class="mcard">
      <button class="close" id="mclose" aria-label="Close">✕</button>
      <div class="home" id="home">${TABS.map(([id, label]) => `<button data-tab="${id}"><span class="hic" data-ic="${id}"></span>${label}</button>`).join('')}</div>
      <div class="ptitle hidden" id="ptitle"><button id="back">‹ Menu</button><b id="ptext"></b></div>
      <div class="mbody">
        <div class="pane" data-pane="fish"><div class="phead" id="fhead"></div><div class="grp">Bait</div><div class="small">The equipped bait makes its fish bite much more often. It never changes prices.</div><div id="blist2"></div><div class="grp">Species</div><div id="flist"></div></div>
        <div class="pane" data-pane="crew"><div class="phead" id="chead"></div><div id="clist"></div></div>
        <div class="pane" data-pane="gear">
          <div class="phead" id="tapinfo"></div>
          <div class="gear"><div class="gtitle">Fishing rod</div><b id="rodname"></b><div class="small" id="roddesc"></div><button class="big-btn" id="rodbtn"></button></div>
          <div class="gear"><div class="gtitle">Outfit</div><b id="fitname"></b><div class="small" id="fitdesc"></div><button class="big-btn" id="fitbtn"></button></div>
          <p class="small">Better gear makes every tap worth more. It also changes how your fisherman looks.</p>
        </div>
        <div class="pane" data-pane="shop"><div class="phead" id="shead"></div><div id="shoplist"></div><p class="small" id="shopnote"></p></div>
        <div class="pane" data-pane="decor"><div class="phead" id="dhead"></div><div id="dlist"></div></div>
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
          <button class="row-btn" id="musicbtn"></button>
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
  const tabBtns = [...host.querySelectorAll<HTMLButtonElement>('#home button')];
  for (const [id, , ic] of TABS) host.querySelector(`.hic[data-ic="${id}"]`)!.appendChild(makeIcon(ic, 'ico tile-ico'));
  let tab: Tab | null = null;
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

  // ----- gear -----
  $('rodbtn').addEventListener('click', () => { if (buyRod(s)) { sfx.buy(); save(s); render(); } });
  $('fitbtn').addEventListener('click', () => { if (buyOutfit(s)) { sfx.buy(); save(s); render(); } });

  // ----- decor shop rows (built once, updated in render) -----
  const KIND_TITLES: Record<DecorKind, string> = { beach: 'Beach', boardwalk: 'Boardwalk', sand: 'Sand color', planks: 'Boardwalk planks' };
  const drows = new Map<string, { btn: HTMLButtonElement; cost: HTMLElement }>();
  let lastKind = '';
  for (const d of DECOR) {
    const dlist = $('dlist');
    if (d.kind !== lastKind) { lastKind = d.kind; const h = document.createElement('div'); h.className = 'grp'; h.textContent = KIND_TITLES[d.kind]; dlist.appendChild(h); }
    const row = document.createElement('div'); row.className = 'drow';
    row.innerHTML = `<div class="dmeta"><b>${d.name}</b><div class="small">${d.desc}</div></div><button class="dbtn"></button>`;
    dlist.appendChild(row);
    const btn = row.querySelector<HTMLButtonElement>('.dbtn')!;
    btn.addEventListener('click', () => {
      const skin = d.kind === 'sand' || d.kind === 'planks';
      if (ownsDecor(s, d.id)) { if (skin && equipSkin(s, d.kind as 'sand' | 'planks', d.skin!)) { sfx.tap(); save(s); render(); } return; }
      if (buyDecor(s, d.id)) { sfx.buy(); save(s); render(); }
    });
    drows.set(d.id, { btn, cost: btn });
  }
  // default skins can be re-selected too
  for (const kind of ['sand', 'planks'] as const) {
    const first = [...$('dlist').querySelectorAll('.grp')].find(g => g.textContent === KIND_TITLES[kind])!;
    const row = document.createElement('div'); row.className = 'drow';
    row.innerHTML = `<div class="dmeta"><b>${kind === 'sand' ? SAND_SKINS[0].name : PLANK_SKINS[0].name}</b><div class="small">The original look</div></div><button class="dbtn"></button>`;
    first.after(row);
    const btn = row.querySelector<HTMLButtonElement>('.dbtn')!;
    btn.addEventListener('click', () => { if (equipSkin(s, kind, 0)) { sfx.tap(); save(s); render(); } });
    drows.set(`default_${kind}`, { btn, cost: btn });
  }

  // ----- shop rows (built once, updated in render) -----
  const prows = new Map<string, HTMLElement>();
  const slist = $('shoplist'); let lastPk = '';
  for (const p of PRODUCTS) {
    if (p.kind !== lastPk) { lastPk = p.kind; const h = document.createElement('div'); h.className = 'grp'; h.textContent = p.kind === 'coins' ? 'Coins' : p.kind === 'gems' ? 'Gems' : 'Pass'; slist.appendChild(h); }
    const row = document.createElement('div'); row.className = 'drow';
    row.innerHTML = `<div class="dmeta"><b>${p.name}</b><div class="small"></div></div><button class="dbtn price">${p.price}</button>`;
    slist.appendChild(row);
    prows.set(p.id, row.querySelector('.small') as HTMLElement);
    row.querySelector('button')!.addEventListener('click', async () => {
      if (p.kind === 'pass' && s.captainPass) return;
      if (!(await purchase(p.name, p.price))) return;
      const what = grantProduct(s, p); sfx.badge(); save(s); hooks.toast(`<b>${p.name}</b><br><span class="small">${what}</span>`); render();
    });
  }

  // ----- fish book rows -----
  const frows = new Map<string, { icon: HTMLElement; name: HTMLElement; sub: HTMLElement; cnt: HTMLElement; state: string }>();
  for (const f of FISH) {
    const row = document.createElement('div'); row.className = 'drow';
    row.innerHTML = `<span class="ficon"></span><div class="dmeta"><b></b><div class="small"></div></div><span class="fcount"></span>`;
    $('flist').appendChild(row);
    frows.set(f.id, { icon: row.querySelector('.ficon')!, name: row.querySelector('b')!, sub: row.querySelector('.small')!, cnt: row.querySelector('.fcount')!, state: '' });
  }
  // ----- bait rows -----
  const brows = new Map<string, HTMLButtonElement>();
  for (const b of BAITS) {
    const row = document.createElement('div'); row.className = 'drow';
    row.innerHTML = `<div class="dmeta"><b>${b.name}</b><div class="small">${b.desc}${b.mult > 1 ? ` · x${b.mult} chance` : ''}</div></div><button class="dbtn"></button>`;
    $('blist2').appendChild(row);
    const btn = row.querySelector<HTMLButtonElement>('.dbtn')!;
    btn.addEventListener('click', () => {
      if (s.baits.includes(b.id)) { if (equipBait(s, b.id)) { sfx.tap(); save(s); render(); } return; }
      if (buyBait(s, b.id)) { sfx.buy(); save(s); render(); }
    });
    brows.set(b.id, btn);
  }
  // ----- crew rows -----
  const TARGET_TEXT: Record<string, string> = { dock: 'Fishing Dock income', shed: 'Cleaning Shed income', fleet: 'Fishing Fleet income', market: 'Market Stall income', tap: 'tap earnings', all: 'all income' };
  const crows = new Map<string, HTMLButtonElement>();
  for (const c of CREW) {
    const row = document.createElement('div'); row.className = 'drow crewrow';
    row.innerHTML = `<span class="ficon"></span><div class="dmeta"><b>${c.name}</b> <span class="small">${c.role}</span><div class="small">${c.bio}</div><div class="bonus">+${Math.round(c.bonus * 100)}% ${TARGET_TEXT[c.target]}</div></div><button class="dbtn"></button>`;
    row.querySelector('.ficon')!.appendChild(makeIcon('person', 'ico fico', false, { b: c.shirt, y: c.hatColor }));
    $('clist').appendChild(row);
    const btn = row.querySelector<HTMLButtonElement>('.dbtn')!;
    btn.addEventListener('click', () => { if (recruit(s, c.id)) { sfx.buy(); save(s); hooks.toast(`<b>${c.name} joined your crew!</b><br><span class="small">+${Math.round(c.bonus * 100)}% ${TARGET_TEXT[c.target]}</span>`); render(); } });
    crows.set(c.id, btn);
  }

  const costHtml = (coins: number, gems = 0) => [coins > 0 ? `<i class="coin sm"></i>${fmt(coins)}` : '', gems > 0 ? `<i class="gemi sm"></i>${gems}` : ''].filter(Boolean).join(' ');
  const fmtVal = (id: string, n: number) => (id.startsWith('play') ? fmtDuration(n) : fmt(n));
  const setTab = (t: Tab | null) => {
    tab = t;
    $('home').classList.toggle('hidden', t !== null); $('ptitle').classList.toggle('hidden', t === null);
    panes.forEach(p => p.classList.toggle('hidden', p.dataset.pane !== t));
    if (t) $('ptext').textContent = TABS.find(x => x[0] === t)![1];
    render();
  };
  tabBtns.forEach(b => b.addEventListener('click', () => { sfx.tap(); setTab(b.dataset.tab as Tab); }));
  $('back').addEventListener('click', () => { sfx.tap(); setTab(null); });

  function open(t: Tab | null = null) { host.classList.remove('hidden'); setTab(t); }
  function close() { host.classList.add('hidden'); hooks.closed(); }
  $('mclose').addEventListener('click', close);
  host.addEventListener('pointerdown', e => { if (e.target === host) close(); });

  // ----- actions -----
  $('sailbtn').addEventListener('click', () => {
    const gain = prestigeGain(s); if (gain < 1) return;
    if (performance.now() > confirmSail) { confirmSail = performance.now() + 4000; render(); return; }
    const got = setSail(s); confirmSail = 0; sfx.sail(); save(s); close();
    hooks.toast(`<b>You set sail!</b> +${got} Pearl${got === 1 ? '' : 's'}`); hooks.sailed();
  });
  $('musicbtn').addEventListener('click', () => { s.settings.music = !s.settings.music; hooks.music(s.settings.music); save(s); render(); });
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
    if (host.classList.contains('hidden') || !tab) return;
    if (tab === 'gear') {
      $('tapinfo').innerHTML = `Each tap earns <b>${fmt(tapValue(s))}</b> coins`;
      const gearCard = (list: { name: string; cost: number; gems?: number; mult: number }[], tier: number, nameEl: string, descEl: string, btnEl: string) => {
        const cur = list[tier], next = list[tier + 1];
        $(nameEl).textContent = `${cur.name} (x${cur.mult} per tap)`;
        $(descEl).textContent = next ? `Next: ${next.name}, x${next.mult} per tap` : 'Best in the world. Nothing left to buy!';
        const b = $<HTMLButtonElement>(btnEl);
        b.disabled = !next || !canPay(s, next.cost, (next as { gems?: number }).gems);
        b.innerHTML = next ? `Buy ${costHtml(next.cost, (next as { gems?: number }).gems)}` : 'MAX';
      };
      gearCard(RODS, s.rodTier, 'rodname', 'roddesc', 'rodbtn');
      gearCard(OUTFITS, s.outfitTier, 'fitname', 'fitdesc', 'fitbtn');
    } else if (tab === 'fish') {
      const found = Object.keys(s.fishLog).length;
      $('fhead').innerHTML = `<b>${found}/${FISH.length} species found</b> · market price index <b>x${fishIndex(s).toFixed(2)}</b><div class="small">Every species you unlock makes everything you catch sell for more.</div>`;
      for (const b of BAITS) {
        const btn = brows.get(b.id)!, owned = s.baits.includes(b.id), inUse = s.bait === b.id;
        btn.disabled = inUse || (!owned && !canPay(s, b.cost, b.gems)); btn.className = 'dbtn' + (inUse ? ' own' : '');
        btn.innerHTML = inUse ? 'In use ✓' : owned ? 'Use' : costHtml(b.cost, b.gems);
      }
      for (const f of FISH) {
        const r = frows.get(f.id)!, caught = s.fishLog[f.id] ?? 0, unlocked = fishUnlocked(s, f);
        const st = caught > 0 ? 'seen' : unlocked ? 'ready' : 'locked';
        if (r.state !== st) { r.state = st; r.icon.replaceChildren(makeIcon('fish', 'ico fico', st !== 'seen', { b: f.color })); }
        r.name.textContent = caught > 0 ? f.name : unlocked ? '???' : '? ? ?';
        r.sub.textContent = caught > 0 ? `Sells for x${f.price} sardine` : unlocked ? 'Unlocked. Keep fishing to find it!' : `Locked: ${f.hint}`;
        r.cnt.textContent = caught > 0 ? `x${fmt(caught)}` : '';
      }
    } else if (tab === 'crew') {
      $('chead').innerHTML = `<b>${s.crew.length}/${CREW.length} on your crew</b><div class="small">Crew bonuses never expire. Hired crew walk the boardwalk.</div>`;
      for (const c of CREW) {
        const b = crows.get(c.id)!, on = hasCrew(s, c.id);
        b.disabled = on || !canPay(s, c.cost, c.gems); b.className = 'dbtn' + (on ? ' own' : ''); b.innerHTML = on ? 'On crew ✓' : costHtml(c.cost, c.gems);
      }
    } else if (tab === 'shop') {
      $('shead').innerHTML = `You have <b>${fmt(s.coins)}</b> coins and <b>${s.gems}</b> gems`;
      for (const p of PRODUCTS) {
        const el = prows.get(p.id)!;
        el.textContent = p.kind === 'coins' ? `+${fmt(packCoins(s, p))} coins (${p.hours! < 1 ? Math.round(p.hours! * 60) + ' min' : p.hours + ' h'} of your income)` : p.kind === 'gems' ? `+${p.gems} gems for gear and cosmetics` : s.captainPass ? 'Active: x2 income forever' : 'x2 income forever, plus 100 gems';
        const btn = el.parentElement!.parentElement!.querySelector('button')!; if (p.kind === 'pass') { btn.disabled = s.captainPass; btn.textContent = s.captainPass ? 'Owned ✓' : p.price; }
      }
      $('shopnote').textContent = PAYMENTS.testMode ? 'TEST MODE: nothing is charged and real payments are not connected yet.' : 'Purchases are processed by Google Play.';
    } else if (tab === 'decor') {
      $('dhead').innerHTML = `<b>${s.decor.length}/${DECOR.length} owned</b> <span class="small">Cosmetics only. They never change your income.</span>`;
      for (const d of DECOR) {
        const r = drows.get(d.id)!, owned = ownsDecor(s, d.id), skin = d.kind === 'sand' || d.kind === 'planks';
        if (!skin) { r.btn.disabled = owned || !canPay(s, d.cost, d.gems); r.btn.className = 'dbtn' + (owned ? ' own' : ''); r.btn.innerHTML = owned ? 'Placed ✓' : costHtml(d.cost, d.gems); }
        else { const inUse = s.skins[d.kind as 'sand' | 'planks'] === d.skin; r.btn.disabled = inUse || (!owned && !canPay(s, d.cost, d.gems)); r.btn.className = 'dbtn' + (inUse ? ' own' : ''); r.btn.innerHTML = inUse ? 'In use ✓' : owned ? 'Use' : costHtml(d.cost, d.gems); }
      }
      for (const kind of ['sand', 'planks'] as const) { const r = drows.get(`default_${kind}`)!, inUse = s.skins[kind] === 0; r.btn.disabled = inUse; r.btn.className = 'dbtn' + (inUse ? ' own' : ''); r.btn.textContent = inUse ? 'In use ✓' : 'Use'; }
    } else if (tab === 'badges') {
      $('bhead').innerHTML = `<b>${s.achievements.length}/${ACHIEVEMENTS.length} badges</b> · income x${badgeMultiplier(s).toFixed(2)} <span class="small">(${BADGE_BONUS_TEXT})</span>`;
      for (const a of ACHIEVEMENTS) {
        const r = rows.get(a.id)!, done = isUnlocked(s, a);
        if (r.done !== done) { r.done = done; r.row.classList.toggle('done', done); r.icon.replaceChildren(makeIcon('trophy', 'ico small', !done)); }
        r.bar.style.width = `${Math.round(progressOf(s, a) * 100)}%`;
        r.txt.textContent = done ? '✓' : `${fmtVal(a.id, Math.min(a.value(s), a.target))}/${fmtVal(a.id, a.target)}`;
      }
    } else if (tab === 'stats') {
      const lines: [string, string][] = [
        ['Gems', String(s.gems)], ['Fish species', `${Object.keys(s.fishLog).length}/${FISH.length}`], ['Crew', `${s.crew.length}/${CREW.length}`], ['Taps', fmt(s.taps)], ['Fish caught', fmt(s.fishCaught)], ['Coins earned (all time)', fmt(s.totalEarned)],
        ['Coins earned (this voyage)', fmt(s.runEarned)], ['Voyages completed', String(s.prestiges)], ['Pearls', String(s.pearls)],
        ['Time in the harbor', fmtDuration(s.playSeconds)], ['Badges', `${s.achievements.length}/${ACHIEVEMENTS.length}`],
        ['Fish price index', `x${fishIndex(s).toFixed(2)}`], ['Total income bonus', `x${(pearlMultiplier(s) * badgeMultiplier(s) * fishIndex(s) * (s.captainPass ? 2 : 1)).toFixed(2)}`],
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
      $('soundbtn').textContent = `Sound effects: ${s.settings.sound ? 'ON' : 'OFF'}`;
      $('musicbtn').textContent = `Music: ${s.settings.music ? 'ON' : 'OFF'}`;
      const armed = performance.now() < confirmReset;
      $('resetbtn').textContent = armed ? 'Really erase everything? Tap again' : 'Erase all progress';
    }
  }

  host.classList.add('hidden');
  return { open, close, render, isOpen: () => !host.classList.contains('hidden') };
}
