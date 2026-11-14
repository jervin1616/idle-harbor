// Loading screen. Created as soon as this module loads, so it is on screen before the game is ready.
import boatUrl from './assets/boats/fleet4.png';

const TIPS = [
  'Tap the sea to cast your line.',
  'Hire a manager and the station keeps working while you sleep.',
  'Every new kind of fish makes everything you catch sell for more.',
  'Badges pay gems. Gems buy the fancy stuff.',
  'Set Sail for Pearls: a permanent boost on every voyage.',
  'Biscuit the cat is technically in charge.',
  'Crew members walk the boardwalk once you hire them.',
];

const el = document.createElement('div');
el.id = 'boot';
el.setAttribute('style', 'position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
  'background:linear-gradient(#2d1e3e,#5b3a6b 45%,#c46b7c 80%,#f4a99a);color:#fff1c9;font-family:"Pixelify Sans","Courier New",monospace;transition:opacity .6s;');
el.innerHTML = `
  <style>
    @keyframes bootbob { 0%,100% { transform:translateY(0) rotate(-2deg); } 50% { transform:translateY(7px) rotate(2deg); } }
    @keyframes bootwave { to { background-position:48px 0; } }
    #boot .sea { position:absolute; left:0; right:0; bottom:0; height:22%; background:#1d3557;
      background-image:repeating-linear-gradient(90deg,#25618f 0 24px,transparent 24px 48px); background-size:48px 6px; background-repeat:repeat-x; animation:bootwave 1.4s linear infinite; }
    #boot .sea::before { content:''; position:absolute; inset:0 0 auto 0; height:6px; background:#4fb3d6; }
    #boot h1 { margin:0; font-size:44px; letter-spacing:2px; text-align:center; line-height:1; text-shadow:4px 4px 0 #2d1e3e, -2px -2px 0 #2d1e3e, 2px -2px 0 #2d1e3e, -2px 2px 0 #2d1e3e; }
    #boot .boat { width:132px; image-rendering:pixelated; animation:bootbob 2.2s ease-in-out infinite; position:relative; z-index:1; margin-bottom:-6px; }
    #boot .bar { width:min(70vw,260px); height:16px; border:3px solid #2d1e3e; background:#3d2314; position:relative; z-index:1; box-shadow:0 0 0 3px #fff1c9; }
    #boot .fill { height:100%; width:0; background:#ffd75e; transition:width .25s; }
    #boot .tip { position:relative; z-index:1; font-size:17px; text-align:center; max-width:80vw; min-height:44px; text-shadow:2px 2px 0 #2d1e3e; }
  </style>
  <h1>IDLE<br>HARBOR</h1>
  <img class="boat" src="${boatUrl}" alt="">
  <div class="bar"><div class="fill" id="bootfill"></div></div>
  <div class="tip" id="boottip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div>
  <div class="sea"></div>`;
document.body.appendChild(el);

const fill = () => document.getElementById('bootfill') as HTMLElement | null;
let progress = 0;
const setProgress = (p: number) => { progress = Math.max(progress, Math.min(1, p)); const f = fill(); if (f) f.style.width = `${Math.round(progress * 100)}%`; };
setProgress(0.08);

/** Resolves once every promise is done (or after a timeout), the bar is full, and the screen has been up long enough to read. */
export async function finishBoot(jobs: Promise<unknown>[], minMs = 1600, maxMs = 7000) {
  const t0 = performance.now();
  let done = 0;
  jobs.forEach(j => j.catch(() => undefined).then(() => { done++; setProgress(0.15 + 0.8 * (done / jobs.length)); }));
  const tipTimer = setInterval(() => { const tip = document.getElementById('boottip'); if (tip) tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)]; }, 1800);
  await Promise.race([Promise.all(jobs.map(j => j.catch(() => undefined))), new Promise(r => setTimeout(r, maxMs))]);
  const wait = minMs - (performance.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  setProgress(1); clearInterval(tipTimer);
  await new Promise(r => setTimeout(r, 250));
  el.style.opacity = '0'; el.style.pointerEvents = 'none';
  await new Promise(r => setTimeout(r, 650));
  el.remove();
}
