// Short story scenes: letterbox bars, a slow camera zoom, typed dialogue, and optional fireworks or a sailing ship.
import { FISH } from './fish';
import type { GameState } from './game';
import { fleetTiers, seenCutscene } from './game';
import { sfx } from './audio';

export interface Beat { text: string; speaker?: string; zoom?: { s: number; x: number; y: number }; flash?: boolean }
export interface Scene { fx?: 'fireworks' | 'sail'; beats: Beat[] }

const WIDE = { s: 1, x: 50, y: 50 };
export const SCENES: Record<string, Scene> = {
  intro: { beats: [
    { text: 'Another quiet evening at the old harbor...', zoom: WIDE },
    { text: 'Grandpa Salt left you this creaky dock, one rod, and a very opinionated cat.', zoom: { s: 1.7, x: 58, y: 60 } },
    { speaker: 'Grandpa Salt', text: '"The sea gives back what you put into it, kid. Be patient. Be kind to the fish."', zoom: { s: 1.5, x: 40, y: 58 } },
    { text: 'Tap the sea to cast your line. Build the harbor. Hire a crew. See where the tides take you.', zoom: { s: 1.15, x: 65, y: 55 } },
  ] },
  town: { fx: 'fireworks', beats: [
    { text: 'The dock, the shed, the fleet, and the market, all up and running!', zoom: WIDE },
    { speaker: 'Biscuit', text: 'Mrrow.', zoom: { s: 1.8, x: 60, y: 78 } },
    { text: 'The old harbor is a real town now. Grandpa would be proud.', zoom: WIDE, flash: true },
  ] },
  voyage: { fx: 'sail', beats: [
    { text: 'The harbor shrinks behind you as the tide pulls you out to sea.', zoom: WIDE },
    { text: 'A new voyage begins. The Pearls glow warm in your pocket.', zoom: { s: 1.3, x: 55, y: 45 } },
  ] },
  schooner: { fx: 'sail', beats: [
    { text: 'A Grand Schooner slides out of the sea mist, sails full of dusk light.', zoom: { s: 1.4, x: 55, y: 30 } },
    { speaker: 'Old Salty', text: '"Never thought I would live to see a ship like that in our little harbor."', zoom: WIDE },
  ] },
  legend: { fx: 'fireworks', beats: [
    { text: 'Sardine to Leviathan Eel: every fish in the sea is in your book.', zoom: WIDE, flash: true },
    { speaker: 'Grandpa Salt', text: '"Now you know the sea like I did. She is yours."', zoom: { s: 1.6, x: 30, y: 60 } },
  ] },
};

/** Which story scene (if any) should play right now. Each plays once. */
export function pendingStory(s: GameState): string | null {
  const ok = (id: string) => !seenCutscene(s, id);
  if (ok('town') && Object.values(s.stations).every(x => x.level > 0)) return 'town';
  if (ok('schooner') && Math.max(...fleetTiers(s.stations.fleet.level)) >= 7) return 'schooner';
  if (ok('legend') && Object.keys(s.fishLog).length >= FISH.length) return 'legend';
  return null;
}

export interface CutsceneHost { stage: HTMLElement; canvas: HTMLCanvasElement; setFx: (fx: Scene['fx'] | null) => void }

/** Play a scene and resolve when it ends (or is skipped). */
export function playScene(host: CutsceneHost, id: string): Promise<void> {
  const scene = SCENES[id];
  return new Promise(resolve => {
    const { stage, canvas } = host;
    const ui = document.createElement('div');
    ui.className = 'cine';
    ui.innerHTML = `<div class="lb top"></div><div class="lb bot"></div><button class="skip">Skip ›</button>
      <div class="flash"></div>
      <div class="dlg"><div class="who"></div><div class="say"></div><div class="more">tap to continue ▼</div></div>`;
    stage.appendChild(ui); stage.classList.add('cinema');
    canvas.style.transition = 'transform 3.2s ease-in-out'; host.setFx(scene.fx ?? null);
    const who = ui.querySelector<HTMLElement>('.who')!, say = ui.querySelector<HTMLElement>('.say')!, more = ui.querySelector<HTMLElement>('.more')!;
    let i = -1, typing: ReturnType<typeof setInterval> | null = null, full = '', closed = false;

    const finishTyping = () => { if (typing) { clearInterval(typing); typing = null; } say.textContent = full; more.style.visibility = 'visible'; };
    const next = () => {
      if (closed) return;
      i++;
      if (i >= scene.beats.length) return end();
      const b = scene.beats[i];
      const z = b.zoom ?? WIDE;
      canvas.style.transformOrigin = `${z.x}% ${z.y}%`; canvas.style.transform = `scale(${z.s})`;
      if (b.flash) { const f = ui.querySelector<HTMLElement>('.flash')!; f.style.opacity = '0.9'; setTimeout(() => { f.style.opacity = '0'; }, 120); }
      who.textContent = b.speaker ?? ''; who.style.display = b.speaker ? 'block' : 'none';
      full = b.text; say.textContent = ''; more.style.visibility = 'hidden';
      let n = 0;
      typing = setInterval(() => { n += 1; say.textContent = full.slice(0, n); if (n % 3 === 0) sfx.tap(); if (n >= full.length) finishTyping(); }, 32);
    };
    const end = () => {
      if (closed) return; closed = true;
      if (typing) clearInterval(typing);
      ui.classList.add('out'); canvas.style.transform = 'scale(1)'; canvas.style.transformOrigin = '50% 50%'; host.setFx(null);
      setTimeout(() => { ui.remove(); stage.classList.remove('cinema'); canvas.style.transition = ''; canvas.style.transform = ''; resolve(); }, 600);
    };
    ui.addEventListener('pointerdown', e => {
      if ((e.target as HTMLElement).classList.contains('skip')) { end(); return; }
      if (typing) finishTyping(); else next();
    });
    requestAnimationFrame(() => ui.classList.add('in'));
    setTimeout(next, 700);
  });
}
