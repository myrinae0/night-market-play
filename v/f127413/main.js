// Boot, game loop, input, screens, save and sound hookup.
import { W, H, C, setCtx } from './gfx.js';
import { LEVELS, COOK, ITEMS } from './data.js';
import { grillState, fryState } from './logic.js';
import * as G from './game.js';
import { render, TABS_Y, PANEL_Y, SLIDER } from './render.js';
import { createFx, updateFx, spawn, floatText, coinBurst, bounce, toast } from './fx.js';
import * as audio from './audio.js';
import { loadAssets } from './assets.js';
import { setCustomerScale } from './sprites.js';

const params = new URLSearchParams(location.search);
const NOSAVE = params.has('nosave') || params.has('shot');
const SAVE_KEY = 'chimaekNightMarket.v1';

function loadSave() {
  const d = { stars: {}, muted: false, musicVol: 0.7, sfxVol: 1 };
  if (NOSAVE) return d;
  try { return { ...d, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { return d; }
}
function writeSave(s) {
  if (NOSAVE) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

// ---------- canvas ----------
const screen = document.getElementById('game');
const sctx = screen.getContext('2d');
const buf = document.createElement('canvas');
buf.width = W; buf.height = H;
const bctx = buf.getContext('2d');
bctx.imageSmoothingEnabled = false;
setCtx(bctx);
let scale = 1, offX = 0, offY = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  // Whole-number scale in device pixels keeps every art pixel the same size.
  const s = Math.max(1, Math.floor(Math.min((vw * dpr) / W, (vh * dpr) / H)));
  scale = s;
  screen.width = W * s; screen.height = H * s;
  const cssW = (W * s) / dpr, cssH = (H * s) / dpr;
  screen.style.width = `${cssW}px`; screen.style.height = `${cssH}px`;
  // Snap the canvas to whole device pixels so the browser never resamples it.
  offX = Math.floor(((vw - cssW) / 2) * dpr) / dpr; offY = Math.floor(((vh - cssH) / 2) * dpr) / dpr;
  screen.style.left = `${offX}px`; screen.style.top = `${offY}px`;
  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// ---------- app ----------
const save = loadSave();
audio.setMuted(save.muted);
audio.setMusicVolume(save.musicVol);
audio.setSfxVolume(save.sfxVol);
const app = {
  screen: 'title', g: null, fx: createFx(), time: 0, save, muted: save.muted,
  vol: audio.volumes(), settings: false, drag: null,
  slide: null, pointer: null, hits: [], shownCoins: 0, endAt: 0, frozen: false,
  toggleMute() { app.muted = !app.muted; audio.setMuted(app.muted); save.muted = app.muted; writeSave(save); audio.play('tap'); },
  // The settings panel pauses the game while it is open.
  openSettings() { app.settings = true; if (app.g) app.g.held = null; },
  closeSettings() { app.settings = false; app.drag = null; },
  setVolume(key, v) {
    v = Math.round(Math.max(0, Math.min(1, v)) * 20) / 20; // 5% steps
    if (key === 'music') audio.setMusicVolume(v); else audio.setSfxVolume(v);
    app.vol = audio.volumes();
  },
  saveVolumes() { save.musicVol = app.vol.music; save.sfxVol = app.vol.sfx; writeSave(save); },
  toTitle() { app.screen = 'title'; app.g = null; app.fx = createFx(); },
  newLevel(n) {
    app.screen = 'game';
    app.g = G.createGame(n, { seed: params.has('seed') ? Number(params.get('seed')) : undefined });
    app.fx = createFx();
    app.shownCoins = 0; app.slide = null;
  },
  startLevel() { G.start(app.g); audio.play('tap'); },
  switchStation(dir) {
    const g = app.g;
    const from = g.station;
    if (G.switchStation(g, dir)) { app.slide = { from, dir, k: 0 }; g.held = null; }
  },
  goStation(i) {
    const g = app.g;
    const from = g.station;
    const dir = G.goStation(g, i);
    if (dir) { app.slide = { from, dir, k: 0 }; g.held = null; }
  },
};

// ---------- events -> sound and juice ----------
const SLOT_X = { grill: (i) => 34 + i * 56, fryer: (i) => 72 + i * 84 };
function handleEvents() {
  const g = app.g;
  if (!g) return;
  for (const e of G.takeEvents(g)) {
    if (e.type === 'sfx') audio.play(e.name);
    else if (e.type === 'toast') toast(app.fx, e.text, e.good);
    else if (e.type === 'tray') bounce(app.fx, `tray:${e.index}`);
    else if (e.type === 'sauced') { bounce(app.fx, `tray:${e.index}`); spawn(app.fx, 'world', 21 + e.index * 32, 330, 'drip', 6); }
    else if (e.type === 'place') {
      const x = SLOT_X[e.station](e.slot);
      spawn(app.fx, e.station, x, PANEL_Y + 56, e.station === 'grill' ? 'spark' : 'bubble', 10);
      bounce(app.fx, `${e.station === 'grill' ? 'grill' : 'fry'}:${e.slot}`);
    } else if (e.type === 'waste') spawn(app.fx, e.station, SLOT_X[e.station](e.slot), PANEL_Y + 56, 'blacksmoke', 8);
    else if (e.type === 'served') {
      const r = e.result;
      const col = r.coins >= 0 ? C.yellow : C.red;
      floatText(app.fx, 52, 70, `${r.coins >= 0 ? '+' : ''}${r.coins}`, col, true);
      if (r.tip > 0) floatText(app.fx, 52, 82, `TIP +${r.tip}`, C.greenL);
      if (r.coins > 0) { coinBurst(app.fx, 52, 90, Math.min(12, Math.ceil(r.coins / 2))); }
      if (r.mood === 'happy') spawn(app.fx, 'world', 52, 80, 'confetti', 14);
      else app.fx.shake = 0.2;
    } else if (e.type === 'walkout') floatText(app.fx, 52, 70, 'WALKED OUT', C.red);
    else if (e.type === 'end') {
      app.endAt = app.time;
      const best = save.stars[g.level] || 0;
      if (e.stars > best) { save.stars[g.level] = e.stars; writeSave(save); }
      if (e.stars === 3) spawn(app.fx, 'top', 90, 100, 'confetti', 40);
      if (e.stars > 0) audio.sting();
    }
  }
}

// Ambient smoke, bubbles and crackle while food cooks.
let crackleT = 0;
function ambient(dt) {
  const g = app.g;
  if (!g || g.phase !== 'play') return;
  let cooking = 0;
  g.grill.forEach((it, i) => {
    if (!it) return;
    cooking += 1;
    const st = grillState(it);
    const x = SLOT_X.grill(i) + (Math.random() - 0.5) * 24;
    if (Math.random() < dt * (st === 'burnt' ? 14 : 6)) spawn(app.fx, 'grill', x, PANEL_Y + 52, st === 'burnt' ? 'blacksmoke' : 'smoke');
    if (Math.random() < dt * 4) spawn(app.fx, 'grill', x, PANEL_Y + 62, 'spark');
  });
  g.fryer.baskets.forEach((it, i) => {
    if (!it) return;
    cooking += 1;
    const x = SLOT_X.fryer(i) + (Math.random() - 0.5) * 50;
    if (Math.random() < dt * 30) spawn(app.fx, 'fryer', x, PANEL_Y + 60 + Math.random() * 20, 'bubble');
    if (Math.random() < dt * (fryState(it) === 'burnt' ? 12 : 4)) spawn(app.fx, 'fryer', x, PANEL_Y + 52, fryState(it) === 'burnt' ? 'blacksmoke' : 'steam');
  });
  crackleT -= dt;
  if (cooking && crackleT <= 0) { audio.play(g.fryer.baskets.some(Boolean) && Math.random() < 0.5 ? 'bubble' : 'crackle', 0.05); crackleT = 0.08 + Math.random() * 0.12; }
}

function step(dt) {
  app.time += dt;
  if (app.g) {
    G.update(app.g, dt);
    ambient(dt);
    handleEvents();
    if (app.slide) { app.slide.k += dt / 0.22; if (app.slide.k >= 1) app.slide = null; }
  }
  const landed = updateFx(app.fx, dt);
  if (landed) audio.play('coin', 0.04);
  if (app.g) {
    // HUD counter rolls toward the real total
    const d = app.g.coins - app.shownCoins;
    app.shownCoins += Math.sign(d) * Math.max(1, Math.round(Math.abs(d) * dt * 6)) * (Math.abs(d) > 0 ? 1 : 0);
    if (Math.sign(app.g.coins - app.shownCoins) !== Math.sign(d)) app.shownCoins = app.g.coins;
  }
}

function draw() {
  app.hits = render(app);
  sctx.save();
  if (app.fx.shake > 0) sctx.translate(Math.round((Math.random() - 0.5) * 2) * scale, 0);
  sctx.drawImage(buf, 0, 0, W * scale, H * scale);
  sctx.restore();
}

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!app.frozen && !app.settings) step(dt);
  draw();
  requestAnimationFrame(frame);
}

// ---------- input ----------
function toBuf(e) {
  const r = screen.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function hitAt(p, tagFilter) {
  for (let i = app.hits.length - 1; i >= 0; i--) {
    const h = app.hits[i];
    if (p.x >= h.x && p.x < h.x + h.w && p.y >= h.y && p.y < h.y + h.h && (!tagFilter || tagFilter(h))) return h;
  }
  return null;
}
let down = null;
// A volume slider grabbed in the settings panel follows the finger; the drag
// never reaches the game (no swipes, no taps) and is saved on release.
const sliderValue = (x) => (x - SLIDER.x) / SLIDER.w;
function endDrag() {
  if (!app.drag) return false;
  if (app.drag.key === 'sfx') audio.play('grab'); // a sample at the new level
  app.drag = null;
  app.saveVolumes();
  return true;
}
window.addEventListener('pointerdown', (e) => {
  audio.unlock();
  const p = toBuf(e);
  down = { ...p, t: performance.now(), id: e.pointerId };
  app.pointer = p;
  if (app.settings) {
    const h = hitAt(p);
    if (h && String(h.tag).startsWith('slider:')) {
      app.drag = { key: h.tag.slice(7), id: e.pointerId };
      app.setVolume(app.drag.key, sliderValue(p.x));
    }
  }
});
window.addEventListener('pointermove', (e) => {
  app.pointer = toBuf(e);
  if (app.drag && app.drag.id === e.pointerId) app.setVolume(app.drag.key, sliderValue(app.pointer.x));
});
window.addEventListener('pointercancel', (e) => { if (app.drag && app.drag.id === e.pointerId) endDrag(); down = null; });
window.addEventListener('pointerup', (e) => {
  if (app.drag && app.drag.id === e.pointerId) { endDrag(); down = null; return; }
  if (!down || down.id !== e.pointerId) return;
  const p = toBuf(e);
  const dx = p.x - down.x, dy = p.y - down.y;
  const start = down;
  down = null;
  const g = app.g;
  if (!app.settings && app.screen === 'game' && g && g.phase !== 'end' && start.y >= TABS_Y && Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    app.switchStation(dx < 0 ? 1 : -1); // swipe left shows the station to the right
    return;
  }
  if (Math.hypot(dx, dy) > 10) return;
  const h = hitAt(p);
  if (!h) { if (g) g.held = null; return; }
  if (g && g.held && h.tag !== 'tray' && !String(h.tag).startsWith('sauce:')) g.held = null;
  if (String(h.tag).startsWith('ready:') || String(h.tag).startsWith('bin:')) bounce(app.fx, h.tag);
  h.fn();
  if (!g || app.settings || h.tag === 'ui' || h.tag === 'tab' || h.tag === 'arrow' || h.tag === 'settings') audio.play('tap');
});
window.addEventListener('keydown', (e) => {
  audio.unlock();
  const g = app.g;
  if (e.key === 'm' || e.key === 'M') return app.toggleMute();
  if (e.key === 'p' || e.key === 'P' || (e.key === 'Escape' && (app.settings || !g || !g.held))) {
    return app.settings ? app.closeSettings() : app.openSettings();
  }
  if (app.settings) return; // the game is paused; keys don't reach it
  if (app.screen === 'title') {
    if (e.key === 'Enter' || e.key === ' ') app.newLevel(Math.max(...LEVELS.filter((L) => L.n === 1 || (save.stars[L.n - 1] || 0) >= 1).map((L) => L.n)));
    return;
  }
  if (!g) return;
  if (g.phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) return app.startLevel();
  if (g.phase === 'end' && e.key === 'Enter') return app.newLevel(g.stars > 0 && g.level < LEVELS.length ? g.level + 1 : g.level);
  if (e.key === 'ArrowLeft' || e.key === 'a') app.switchStation(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd') app.switchStation(1);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); G.serve(g); }
  else if (e.key === 'Escape') { g.held = null; }
  else if (/^[1-4]$/.test(e.key)) app.goStation(Number(e.key) - 1);
});

// ---------- debug / screenshot presets ----------
function run(secs, dt = 1 / 60) { for (let t = 0; t < secs; t += dt) step(dt); }
function waitForCustomer() { let n = 0; while (app.g.customer && app.g.customer.phase !== 'wait' && n++ < 400) step(1 / 60); }
function autoServe() {
  const g = app.g;
  waitForCustomer();
  for (const l of g.customer.order.lines) {
    if (ITEMS[l.item].kind === 'ready') G.grabReady(g, l.item);
    else if (ITEMS[l.item].kind === 'grill') {
      G.grillAdd(g, l.item); const s = g.grill.findIndex((x) => x && x.sides[0] === 0);
      run(COOK.grill.time); G.grillFlip(g, s); run(COOK.grill.time * 0.9); G.grillTake(g, s);
    } else { G.fryAdd(g); G.fryDip(g); run(0.5); const s = g.fryer.baskets.findIndex(Boolean); run(COOK.fry.time * 0.97); G.fryLift(g, s); }
    if (l.sauce) { G.pickSauce(g, l.sauce); if (g.held) G.tapTray(g, g.tray.length - 1); }
  }
  G.serve(g);
  run(1.3);
}
const SHOTS = {
  title() {},
  intro2() { app.newLevel(2); run(0.6); },
  counter() {
    app.newLevel(1); G.start(app.g); autoServe(); autoServe(); waitForCustomer();
    G.grabReady(app.g, app.g.customer.order.lines[0].item); run(0.1);
  },
  grill() {
    app.newLevel(2); G.start(app.g); autoServe(); waitForCustomer();
    const g = app.g;
    G.grillAdd(g, 'galbi'); run(3.2); G.grillFlip(g, 0); G.grillAdd(g, 'sausage'); run(2.6);
    G.grillAdd(g, 'galbi'); run(1.2); G.grabReady(g, 'soda'); run(0.5);
  },
  swipe() { SHOTS.grill(); app.switchStation(-1); app.slide.k = 0.4; },
  fryer() {
    app.newLevel(3); G.start(app.g); waitForCustomer();
    const g = app.g;
    G.fryAdd(g); G.fryDip(g); run(4.8); G.fryAdd(g); G.fryDip(g); run(1.6); G.fryAdd(g); run(0.4);
    G.grabReady(g, 'beer'); run(0.3);
  },
  sauce() {
    app.newLevel(3); G.start(app.g); waitForCustomer();
    while (!app.g.customer.order.lines.some((l) => l.item === 'chicken' && l.sauce)) autoServe();
    waitForCustomer();
    const g = app.g;
    g.tray.push({ item: 'chicken', cook: 'done', perfect: true, sauce: null }, { item: 'chicken', cook: 'done', perfect: false, sauce: null });
    G.pickSauce(g, 'yangnyeom'); app.pointer = { x: 70, y: 340 }; run(0.2);
  },
  shiba() { app.newLevel(3); G.start(app.g); for (let i = 0; i < 7; i++) autoServe(); waitForCustomer(); },
  end() { app.newLevel(1); G.start(app.g); while (app.g.phase === 'play') autoServe(); run(2.2); },
  settings() { SHOTS.grill(); app.setVolume('music', 0.6); app.openSettings(); },
  saucehint() {
    app.newLevel(2); G.start(app.g); waitForCustomer();
    const g = app.g;
    g.tray.push({ item: 'galbi', cook: 'done', perfect: false, sauce: 'honey' });
    G.grillAdd(g, 'sausage'); run(1); G.pickSauce(g, 'spicy'); run(0.3);
  },
  locked() { app.newLevel(1); G.start(app.g); waitForCustomer(); app.goStation(3); run(0.5); },
};

if (params.has('cs')) setCustomerScale(Math.max(1, Math.min(5, Number(params.get('cs')) || 3)));
window.nightMarket = { app, G, step, SHOTS };
loadAssets().then(() => {
  const shot = params.get('shot');
  if (shot && SHOTS[shot]) {
    SHOTS[shot]();
    app.frozen = true;
  } else if (params.has('level')) {
    app.newLevel(Math.max(1, Math.min(LEVELS.length, Number(params.get('level')) || 1)));
  }
  window.nightMarket.ready = true;
  requestAnimationFrame(frame);
}).catch((e) => {
  document.body.textContent = `Could not load the game art: ${e.message}`;
});
