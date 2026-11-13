// Boot, game loop, input (drag, flick, swipe, tap, keys), screen flow, save and
// sound hookup.
import { W, H, C, setCtx } from './gfx.js';
import { LEVELS, COOK, ITEMS, SHOP_FROM_LEVEL } from './data.js';
import { grillState, fryState, levelDef, buyUpgrade, upgradeById, nightPay, scoreServe } from './logic.js';
import * as G from './game.js';
import { TABS_Y, PANEL_Y, tapMode, guestX, grillSlotX, basketX, WOK_CX } from './render.js';
import { drawFrame, SLIDER, lineTyped } from './screens.js';
import { createFx, updateFx, spawn, floatText, coinBurst, bounce, toast } from './fx.js';
import * as audio from './audio.js';
import { loadAssets } from './assets.js';
import { setCustomerScale, registerFoodArt } from './sprites.js';
import { classify, flickAction, accepts, drop, findTarget, offTray, dragHint, missHint, DRAG_DIST } from './drag.js';
import { SPIRITS, PEOPLE_QUIPS, isSpirit } from './spirits.js';
import {
  sceneFor, sceneById, startScene, advance, choose, skip, finishScene, relTips, unlockMemory,
} from './story.js';
import { freshSave, normalizeSave, clearProgress } from './save.js';

const params = new URLSearchParams(location.search);
const NOSAVE = params.has('nosave') || params.has('shot');
const SAVE_KEY = 'chimaekNightMarket.v1';

function loadSave() {
  if (NOSAVE) return freshSave();
  try { return normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch { return freshSave(); }
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
let scale = 1;

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
  const offX = Math.floor(((vw - cssW) / 2) * dpr) / dpr, offY = Math.floor(((vh - cssH) / 2) * dpr) / dpr;
  screen.style.left = `${offX}px`; screen.style.top = `${offY}px`;
  sctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// ---------- app ----------
const save = loadSave();
audio.setMuted(save.muted);
audio.setMusicVolume(save.musicVol);
audio.setAmbienceVolume(save.ambVol);
audio.setSfxVolume(save.sfxVol);
const seedParam = params.has('seed') ? Number(params.get('seed')) : undefined;

const app = {
  screen: 'title', g: null, fx: createFx(), time: 0, save, muted: save.muted,
  vol: audio.volumes(), settings: false, confirmReset: false, slider: null, drag: null, snap: null,
  slide: null, pointer: null, reg: { hits: [], sources: [], targets: [], trayBox: null },
  shownCoins: 0, endAt: 0, frozen: false, banner: null, nightMemories: new Set(), lastPay: 0,
  dlg: null, dlgT: 0, dlgThen: null, shopNext: null, shopMsg: null,

  toggleMute() { app.muted = !app.muted; audio.setMuted(app.muted); save.muted = app.muted; writeSave(save); audio.play('tap'); },
  // The settings panel pauses the game while it is open.
  openSettings() { app.settings = true; app.confirmReset = false; app.drag = null; if (app.g) app.g.held = null; },
  closeSettings() { app.settings = false; app.confirmReset = false; app.slider = null; },
  // RESET PROGRESS in settings asks first (KEEP is the default).
  askReset() { app.confirmReset = true; app.slider = null; },
  keepProgress() { app.confirmReset = false; },
  // Erases levels, stars, purse, upgrades and the story, keeps the settings,
  // and ends any level or scene that is open, then shows the title.
  resetProgress() {
    clearProgress(save);
    writeSave(save);
    app.closeSettings();
    app.dlg = null; app.dlgThen = null; app.shopNext = null; app.shopMsg = null;
    app.slide = null; app.snap = null; app.nightMemories = new Set(); app.lastPay = 0; app.shownCoins = 0;
    app.toTitle();
    audio.play('trash');
  },
  setVolume(key, v) {
    v = Math.round(Math.max(0, Math.min(1, v)) * 20) / 20; // 5% steps
    if (key === 'music') audio.setMusicVolume(v);
    else if (key === 'amb') audio.setAmbienceVolume(v);
    else audio.setSfxVolume(v);
    app.vol = audio.volumes();
  },
  saveVolumes() { save.musicVol = app.vol.music; save.ambVol = app.vol.amb; save.sfxVol = app.vol.sfx; writeSave(save); },
  toggleTapControls() {
    save.tapControls = !save.tapControls;
    writeSave(save);
    if (app.g) { app.g.autoBasket = save.tapControls; app.g.held = null; }
    app.drag = null;
    audio.play('tap');
  },

  toTitle() { app.screen = 'title'; app.g = null; app.fx = createFx(); app.drag = null; app.banner = null; audio.setRain(false); },
  // Before a level: its story scene, the first time only (the log replays it).
  playLevel(n) {
    const sc = sceneFor(n);
    if (sc && !save.story.seen[sc.id]) app.startDialogue(sc, false, () => app.newLevel(n));
    else app.newLevel(n);
  },
  newLevel(n) {
    app.screen = 'game';
    app.g = G.createGame(n, { seed: seedParam, upgrades: save.upgrades, relTips: relTips(save.story), autoBasket: !!save.tapControls });
    app.fx = createFx();
    app.shownCoins = 0; app.slide = null; app.drag = null; app.snap = null; app.banner = null;
    app.nightMemories = new Set(); app.lastPay = 0;
    audio.setRain(!!app.g.def.rain);
  },
  startLevel() { G.start(app.g); audio.play('tap'); },
  // NEXT on the end card: from level SHOP_FROM_LEVEL on, the shop comes first.
  endNext() {
    const n = app.g.level + 1;
    if (!levelDef(n)) return app.toTitle();
    if (app.g.level >= SHOP_FROM_LEVEL) return app.openShop(n);
    return app.playLevel(n);
  },
  switchStation(dir) {
    const g = app.g, from = g.station;
    if (G.switchStation(g, dir)) { app.slide = { from, dir, k: 0 }; g.held = null; app.drag = null; }
  },
  goStation(i) {
    const g = app.g, from = g.station;
    const dir = G.goStation(g, i);
    if (dir) { app.slide = { from, dir, k: 0 }; g.held = null; app.drag = null; }
  },

  // ---------- shop ----------
  openShop(next) { app.screen = 'shop'; app.g = null; app.shopNext = next; app.shopMsg = null; audio.setRain(false); },
  leaveShop() { if (app.shopNext) app.playLevel(app.shopNext); else app.toTitle(); },
  buy(id) {
    const purse = { wallet: save.wallet, upgrades: save.upgrades };
    if (!buyUpgrade(purse, id)) return app.cantBuy(id);
    save.wallet = purse.wallet;
    writeSave(save);
    audio.play('serve');
    app.shopMsg = { text: 'BOUGHT!', good: true, at: app.time };
    return true;
  },
  cantBuy(id) {
    const u = upgradeById(id);
    audio.play('nope');
    app.shopMsg = { text: `NEED ${u.cost - save.wallet} MORE`, good: false, at: app.time };
  },

  // ---------- story ----------
  openLog() { app.screen = 'log'; app.g = null; },
  replayScene(id) { app.startDialogue(sceneById(id), true, () => app.openLog()); },
  startDialogue(sc, replay, then) {
    app.dlg = startScene(sc, save.story, { replay });
    app.dlgT = 0; app.dlgThen = then;
    app.screen = 'scene'; app.g = null;
    audio.setRain(!!levelDef(sc.level)?.rain);
  },
  dlgTap() {
    const d = app.dlg;
    if (!d) return;
    if (!lineTyped(app)) { app.dlgT = 99; return; } // finish the line first
    if (d.choice) return;
    const before = d.cur;
    advance(d);
    audio.play('page');
    if (d.cur !== before) app.dlgT = 0;
    if (d.done) app.finishDialogue();
  },
  dlgChoose(k) {
    const d = app.dlg;
    if (!d || !choose(d, k, save.story)) return;
    writeSave(save);
    audio.play('tap');
    app.dlgT = 0;
    if (d.done) app.finishDialogue();
  },
  dlgSkip() { if (!app.dlg) return; skip(app.dlg); app.finishDialogue(); },
  finishDialogue() {
    const d = app.dlg, then = app.dlgThen;
    finishScene(d, save.story);
    writeSave(save);
    app.dlg = null; app.dlgThen = null;
    if (then) then();
  },
};

// ---------- events -> sound and juice ----------
const slotX = (g, station, slot) => (station === 'grill' ? grillSlotX(g, slot) : station === 'fryer' ? basketX(slot) : WOK_CX);
// A spirit's memory waits until their reaction bubble is gone (t < 0 is hidden).
function showBanner(who, text, memory) { app.banner = { who, text: text.toUpperCase(), memory, t: memory ? -0.8 : 0, life: memory ? 4.2 : 2.8 }; }
function handleEvents() {
  const g = app.g;
  if (!g) return;
  for (const e of G.takeEvents(g)) {
    if (e.type === 'sfx') audio.play(e.name);
    else if (e.type === 'toast') toast(app.fx, e.text, e.good);
    else if (e.type === 'tray') bounce(app.fx, `tray:${e.index}`);
    else if (e.type === 'sauced') { bounce(app.fx, `tray:${e.index}`); spawn(app.fx, 'world', 18 + e.index * 30, 330, 'drip', 6); }
    else if (e.type === 'place') {
      const x = slotX(g, e.station, e.slot);
      spawn(app.fx, e.station, x, PANEL_Y + 56, e.station === 'fryer' ? 'bubble' : 'spark', 10);
      bounce(app.fx, `${e.station === 'fryer' ? 'fry' : e.station}:${e.slot}`);
    } else if (e.type === 'waste') spawn(app.fx, e.station, slotX(g, e.station, e.slot), PANEL_Y + 56, 'blacksmoke', 8);
    else if (e.type === 'toss') {
      bounce(app.fx, 'wok:0');
      spawn(app.fx, 'wok', WOK_CX, PANEL_Y + 80, e.spill ? 'drip' : 'spark', e.spill ? 10 : 8);
      spawn(app.fx, 'wok', WOK_CX, PANEL_Y + 70, 'steam', 3);
      if (e.spill) app.fx.shake = 0.15;
    } else if (e.type === 'scorch') toast(app.fx, 'SCORCHING! TOSS IT!');
    else if (e.type === 'arrive') {
      // Normal people can't see the spirits. Now and then one says so.
      if (typeof e.look === 'number' && !app.banner && (e.cid * 7 + g.level) % 3 === 0) showBanner('A GUEST', PEOPLE_QUIPS[(e.cid + g.level) % PEOPLE_QUIPS.length], false);
    } else if (e.type === 'served') {
      const c = g.line.find((x) => x.id === e.cid);
      const x = c ? Math.round(guestX(g, c)) : 52;
      const r = e.result;
      floatText(app.fx, x, 70, `${r.coins >= 0 ? '+' : ''}${r.coins}`, r.coins >= 0 ? C.yellow : C.red, true);
      if (r.tip > 0) floatText(app.fx, x, 82, `TIP +${r.tip}`, C.greenL);
      if (r.coins > 0) coinBurst(app.fx, x, 90, Math.min(12, Math.ceil(r.coins / 2)), 34, 3);
      if (r.mood === 'happy') {
        spawn(app.fx, 'world', x, 80, 'confetti', 14);
        // A spirit you feed well remembers grandma: one new line per spirit per night.
        if (isSpirit(e.look)) {
          const line = unlockMemory(save.story, e.look, app.nightMemories);
          if (line) { showBanner(SPIRITS[e.look].name, line, true); writeSave(save); }
        }
      } else app.fx.shake = 0.2;
    } else if (e.type === 'walkout') {
      const c = g.line.find((x) => x.id === e.cid);
      floatText(app.fx, c ? Math.round(guestX(g, c)) : 52, 70, 'WALKED OUT', C.red);
    } else if (e.type === 'end') {
      app.endAt = app.time;
      app.lastPay = nightPay(g.coins);
      save.wallet += app.lastPay;
      const best = save.stars[g.level] || 0;
      if (e.stars > best) save.stars[g.level] = e.stars;
      writeSave(save);
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
    const st = grillState(it, g.cook.grill);
    const x = grillSlotX(g, i) + (Math.random() - 0.5) * 24;
    if (Math.random() < dt * (st === 'burnt' ? 14 : 6)) spawn(app.fx, 'grill', x, PANEL_Y + 52, st === 'burnt' ? 'blacksmoke' : 'smoke');
    if (Math.random() < dt * 4) spawn(app.fx, 'grill', x, PANEL_Y + 62, 'spark');
  });
  g.fryer.baskets.forEach((it, i) => {
    if (!it) return;
    cooking += 1;
    const x = basketX(i) + (Math.random() - 0.5) * 50;
    const st = fryState(it, g.cook.fry);
    if (Math.random() < dt * 30) spawn(app.fx, 'fryer', x, PANEL_Y + 60 + Math.random() * 20, 'bubble');
    if (Math.random() < dt * (st === 'burnt' ? 12 : 4)) spawn(app.fx, 'fryer', x, PANEL_Y + 52, st === 'burnt' ? 'blacksmoke' : 'steam');
  });
  if (g.wok) {
    cooking += 1;
    const x = WOK_CX + (Math.random() - 0.5) * 40;
    if (Math.random() < dt * (g.wok.scorch > 0 ? 16 : 3)) spawn(app.fx, 'wok', x, PANEL_Y + 74, g.wok.scorch > 0 ? 'blacksmoke' : 'steam');
  }
  crackleT -= dt;
  if (cooking && crackleT <= 0) { audio.play(g.fryer.baskets.some(Boolean) && Math.random() < 0.5 ? 'bubble' : 'crackle', 0.05); crackleT = 0.08 + Math.random() * 0.12; }
}

function step(dt) {
  app.time += dt;
  if (app.screen === 'scene') app.dlgT += dt;
  if (app.g) {
    G.update(app.g, dt);
    ambient(dt);
    handleEvents();
    if (app.slide) { app.slide.k += dt / 0.22; if (app.slide.k >= 1) app.slide = null; }
  }
  if (app.banner) { app.banner.t += dt; if (app.banner.t > app.banner.life) app.banner = null; }
  if (app.snap) { app.snap.t += dt; if (app.snap.t > 0.16) app.snap = null; }
  if (updateFx(app.fx, dt)) audio.play('coin', 0.04);
  if (app.g) { // the HUD counter rolls toward the real total
    const d = app.g.coins - app.shownCoins;
    if (d) app.shownCoins += Math.sign(d) * Math.max(1, Math.round(Math.abs(d) * dt * 6));
    if (Math.sign(app.g.coins - app.shownCoins) !== Math.sign(d)) app.shownCoins = app.g.coins;
  }
}

function draw() {
  app.reg = drawFrame(app);
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
function hitAt(p) {
  const hits = app.reg.hits;
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (p.x >= h.x && p.x < h.x + h.w && p.y >= h.y && p.y < h.y + h.h) return h;
  }
  return null;
}
// Taps on these always win over picking food up.
const BUTTON_TAGS = new Set(['ui', 'tab', 'arrow', 'settings']);
const canDrag = () => app.screen === 'game' && app.g && app.g.phase === 'play' && !tapMode(app) && !app.slide && !app.settings;

// A volume slider grabbed in the settings panel follows the finger; the drag
// never reaches the game (no swipes, no taps) and is saved on release.
const sliderValue = (x) => (x - SLIDER.x) / SLIDER.w;
function endSlider() {
  if (app.slider.key === 'sfx') audio.play('grab'); // a sample at the new level
  app.slider = null;
  app.saveVolumes();
}

// The end of a drag (drag controls): a flick, a drop, a throw-away or a snap back.
function finishDrag(d, p, now) {
  const g = app.g;
  if (!g || g.phase !== 'play') return;
  const kind = classify(p.x - d.x0, p.y - d.y0, now - d.t0);
  if (kind === 'tap') { toast(app.fx, dragHint(d.payload)); audio.play('tap'); return; }
  const fa = flickAction(d.payload);
  if (kind === 'flick' && fa) {
    if (fa === 'flip') G.grillFlip(g, d.payload.slot); else G.wokToss(g);
    return;
  }
  const tg = findTarget(app.reg.targets.filter((r) => accepts(g, d.payload, r.target)), p.x, p.y);
  if (tg && drop(g, d.payload, tg.target)) {
    if (d.payload.kind === 'ready' || d.payload.kind === 'bin') bounce(app.fx, d.payload.kind === 'ready' ? `ready:${d.payload.item}` : `bin:${d.payload.item}`);
    return;
  }
  if (d.payload.kind === 'tray' && app.reg.trayBox && offTray(app.reg.trayBox, p.x, p.y)) { G.trashTray(g, d.payload.index); return; }
  // A quick sideways swipe that started on food (and landed nowhere) still switches stations.
  if ((kind === 'swipeLeft' || kind === 'swipeRight') && now - d.t0 < 300 && d.y0 >= TABS_Y) {
    app.switchStation(kind === 'swipeLeft' ? 1 : -1);
    return;
  }
  const under = findTarget(app.reg.targets, p.x, p.y, 0);
  const why = missHint(g, d.payload, under ? under.target : null);
  if (why) toast(app.fx, why);
  audio.play('nope');
  app.snap = { payload: d.payload, x: p.x, y: p.y, tx: d.box.x + d.box.w / 2, ty: d.box.y + d.box.h / 2, t: 0 };
}

let down = null;
window.addEventListener('pointerdown', (e) => {
  audio.unlock();
  const p = toBuf(e);
  down = { ...p, t: performance.now(), id: e.pointerId };
  app.pointer = p;
  if (app.settings) {
    const h = hitAt(p);
    if (h && String(h.tag).startsWith('slider:')) {
      app.slider = { key: h.tag.slice(7), id: e.pointerId };
      app.setVolume(app.slider.key, sliderValue(p.x));
    }
    return;
  }
  if (canDrag()) {
    const h = hitAt(p);
    if (h && BUTTON_TAGS.has(h.tag)) return;
    const s = findTarget(app.reg.sources, p.x, p.y, 1);
    if (s) {
      app.drag = { payload: s.payload, box: { x: s.x, y: s.y, w: s.w, h: s.h }, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: down.t, id: e.pointerId, lifted: false };
      app.snap = null;
    }
  }
});
window.addEventListener('pointermove', (e) => {
  const p = toBuf(e);
  app.pointer = p;
  if (app.slider && app.slider.id === e.pointerId) { app.setVolume(app.slider.key, sliderValue(p.x)); return; }
  const d = app.drag;
  if (d && d.id === e.pointerId) {
    d.x = p.x; d.y = p.y;
    if (!d.lifted && Math.hypot(p.x - d.x0, p.y - d.y0) >= DRAG_DIST) { d.lifted = true; audio.play('lift'); }
  }
});
window.addEventListener('pointercancel', (e) => {
  if (app.slider && app.slider.id === e.pointerId) endSlider();
  if (app.drag && app.drag.id === e.pointerId) app.drag = null;
  down = null;
});
window.addEventListener('pointerup', (e) => {
  const p = toBuf(e);
  if (app.slider && app.slider.id === e.pointerId) { endSlider(); down = null; return; }
  if (app.drag && app.drag.id === e.pointerId) {
    const d = app.drag;
    app.drag = null;
    down = null;
    finishDrag(d, p, performance.now());
    return;
  }
  if (!down || down.id !== e.pointerId) return;
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
  if (BUTTON_TAGS.has(h.tag) || app.settings || ['skip', 'buy', 'backdrop'].includes(h.tag)) audio.play('tap');
});
window.addEventListener('keydown', (e) => {
  audio.unlock();
  const g = app.g;
  if (e.key === 'm' || e.key === 'M') return app.toggleMute();
  if (app.confirmReset) { // only KEEP (Escape, P) or a tap on RESET
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') app.keepProgress();
    return;
  }
  if (e.key === 'p' || e.key === 'P' || (e.key === 'Escape' && (app.settings || !g || !g.held))) {
    return app.settings ? app.closeSettings() : app.openSettings();
  }
  if (app.settings) return; // the game is paused; keys don't reach it
  if (app.screen === 'scene') {
    if (e.key === 'Enter' || e.key === ' ') app.dlgTap();
    else if (/^[1-3]$/.test(e.key) && app.dlg && app.dlg.choice) app.dlgChoose(Number(e.key) - 1);
    else if (e.key === 's' || e.key === 'S') app.dlgSkip();
    return;
  }
  if (app.screen === 'title') {
    if (e.key === 'Enter' || e.key === ' ') app.playLevel(Math.max(...LEVELS.filter((L) => L.n === 1 || (save.stars[L.n - 1] || 0) >= 1).map((L) => L.n)));
    return;
  }
  if (app.screen === 'shop') { if (e.key === 'Enter') app.leaveShop(); return; }
  if (app.screen === 'log') { if (e.key === 'Enter') app.toTitle(); return; }
  if (!g) return;
  if (g.phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) return app.startLevel();
  if (g.phase === 'end' && e.key === 'Enter') return g.stars > 0 && levelDef(g.level + 1) ? app.endNext() : app.newLevel(g.level);
  if (e.key === 'ArrowLeft' || e.key === 'a') app.switchStation(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd') app.switchStation(1);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); G.serveAuto(g); }
  else if (e.key === 'Escape') g.held = null;
  else if (/^[1-4]$/.test(e.key)) app.goStation(Number(e.key) - 1);
});

// ---------- debug / screenshot presets (?shot=NAME) ----------
function run(secs, dt = 1 / 60) { for (let t = 0; t < secs; t += dt) step(dt); }
function waitForGuest() { let n = 0; while (app.g.phase === 'play' && !G.waiting(app.g).length && n++ < 900) step(1 / 60); }
// Cooks and serves the first waiting guest's order exactly (the tap actions).
function autoServe() {
  const g = app.g;
  waitForGuest();
  const c = G.waiting(g)[0];
  if (!c) return;
  for (const l of c.order.lines) {
    const kind = ITEMS[l.item].kind;
    if (kind === 'ready') G.grabReady(g, l.item);
    else if (kind === 'grill') {
      G.grillAdd(g, l.item); const s = g.grill.findIndex((x) => x && x.sides[0] === 0);
      run(COOK.grill.time); G.grillFlip(g, s); run(COOK.grill.time * 0.9); G.grillTake(g, s);
    } else if (kind === 'fry') {
      G.fryAdd(g); G.fryDip(g); run(0.5);
      if (g.fryer.bowl) G.fryToBasket(g);
      const s = g.fryer.baskets.findIndex(Boolean); run(g.cook.fry.time * 0.97); G.fryLift(g, s);
    } else {
      G.wokStart(g, l.item);
      while (g.wok.p < g.cook.wok.perfectLo + 0.01) { run(g.cook.wok.air + 0.05); G.wokToss(g); }
      run(0.4); G.wokTake(g);
    }
    if (l.sauce) G.applySauce(g, g.tray.length - 1, l.sauce);
  }
  G.serve(g, g.line.indexOf(c));
  run(1.3);
}
function play(n, opts = {}) {
  if (opts.tap) save.tapControls = true;
  if (opts.upgrades) save.upgrades = opts.upgrades;
  app.newLevel(n); G.start(app.g); waitForGuest();
}
// Puts something in the player's hand at (x, y), as if dragged there.
function holdAt(payload, x, y) {
  app.drag = { payload, box: { x, y, w: 1, h: 1 }, x0: x, y0: y + 40, x, y, t0: 0, id: -1, lifted: true };
  app.pointer = { x, y };
}
const SHOTS = {
  title() { save.wallet = 186; save.stars = { 1: 3, 2: 2, 3: 1 }; },
  story() { app.playLevel(1); run(0.1); app.dlgTap(); app.dlgTap(); app.dlgTap(); run(0.5); },
  storychoice() { app.playLevel(2); for (let i = 0; i < 6; i++) { app.dlgT = 99; app.dlgTap(); } run(0.6); },
  storylog() { save.story.seen = { l1: true, l2: true, l3: true }; save.story.memories = { lantern: 2, fox: 1 }; save.story.flags = { deung_told: true }; app.openLog(); },
  intro2() { app.newLevel(2); run(0.6); },
  intro4() { app.newLevel(4); run(0.6); },
  introtap() { save.tapControls = true; app.newLevel(3); run(0.6); },
  counter() { play(1); autoServe(); autoServe(); waitForGuest(); G.grabReady(app.g, G.waiting(app.g)[0].order.lines[0].item); run(0.1); },
  drag() { // dragging a galbi from the bin over a free grill spot
    play(2); autoServe(); waitForGuest();
    const g = app.g; G.grillAdd(g, 'galbi', 0); run(2.5);
    holdAt({ kind: 'bin', item: 'galbi' }, 92, 262);
  },
  dragserve() { // the tray handle dragged up onto the guest
    play(1); autoServe(); waitForGuest();
    const g = app.g; for (const l of G.waiting(g)[0].order.lines) G.grabReady(g, l.item);
    run(0.3); holdAt({ kind: 'serve' }, 70, 110);
  },
  dragsauce() { // a sauce over the fried chicken on the tray
    play(3); const g = app.g;
    g.tray.push({ item: 'chicken', cook: 'done', perfect: true, sauce: null }, { item: 'beer', cook: null, perfect: false, sauce: null });
    run(0.2); holdAt({ kind: 'sauce', id: 'yangnyeom' }, 22, 348);
  },
  grill() {
    play(2); autoServe(); waitForGuest();
    const g = app.g;
    G.grillAdd(g, 'galbi'); run(3.2); G.grillFlip(g, 0); G.grillAdd(g, 'sausage'); run(2.6);
    G.grillAdd(g, 'galbi'); run(1.2); G.grabReady(g, 'soda'); run(0.5);
  },
  tapmode() { save.tapControls = true; SHOTS.grill(); },
  swipe() { SHOTS.grill(); app.switchStation(-1); app.slide.k = 0.4; },
  fryer() {
    play(3); const g = app.g;
    G.fryBatter(g); run(0.5); G.fryToBasket(g, 0); run(4.3); G.fryBatter(g); run(0.5); G.fryToBasket(g, 1); run(1.1); G.fryBatter(g); run(0.6);
    G.grabReady(g, 'beer'); run(0.3);
  },
  sauce() {
    save.tapControls = true; play(3);
    const g = app.g;
    g.tray.push({ item: 'chicken', cook: 'done', perfect: true, sauce: null }, { item: 'chicken', cook: 'done', perfect: false, sauce: null });
    G.pickSauce(g, 'yangnyeom'); app.pointer = { x: 70, y: 340 }; run(0.2);
  },
  wok() { // a dish in the air, a topped dish on the tray
    play(4); const g = app.g;
    g.tray.push({ item: 'tteokbokki', cook: 'done', perfect: true, sauce: 'scallion' });
    G.wokStart(g, 'japchae'); for (let i = 0; i < 3; i++) { run(0.4); G.wokToss(g); } run(0.14);
  },
  wokscorch() { play(4); const g = app.g; G.wokStart(g, 'friedrice'); for (let i = 0; i < 6; i++) { run(0.4); G.wokToss(g); } run(3.2); },
  woktap() { save.tapControls = true; play(4); const g = app.g; G.wokStart(g, 'tteokbokki'); for (let i = 0; i < 5; i++) { run(0.4); G.wokToss(g); } run(0.5); },
  mix() { play(5); autoServe(); waitForGuest(); const g = app.g; G.grillAdd(g, 'galbi'); G.fryBatter(g); run(0.6); G.fryToBasket(g); G.wokStart(g, 'japchae'); run(0.5); G.wokToss(g); app.goStation(3); run(0.5); },
  upgraded() { play(5, { upgrades: { grill4: true, tray5: true } }); const g = app.g; ['galbi', 'sausage', 'galbi', 'sausage'].forEach((id) => G.grillAdd(g, id)); run(2); ['soda', 'tea', 'kimbap', 'toast', 'beer'].forEach((id) => G.grabReady(g, id)); app.goStation(1); run(0.5); },
  queue() { play(6); run(8); const g = app.g; G.grabReady(g, 'soda'); run(0.2); },
  queuedrag() { SHOTS.queue(); holdAt({ kind: 'serve' }, 146, 100); },
  shiba() { play(3); for (let i = 0; i < 7; i++) autoServe(); waitForGuest(); },
  locked() { play(1); app.goStation(3); run(0.5); },
  end() { play(1); while (app.g.phase === 'play') autoServe(); run(2.2); },
  end5() { save.wallet = 240; play(5); while (app.g.phase === 'play') autoServe(); run(2.2); },
  shop() { save.wallet = 260; save.stars = { 5: 2 }; save.upgrades = { fastfry: true }; app.openShop(6); },
  settings() { SHOTS.grill(); app.setVolume('music', 0.6); app.setVolume('amb', 0.45); app.openSettings(); },
  settingstap() { save.tapControls = true; SHOTS.settings(); },
  // Settings from the title (RESET PROGRESS at the bottom), and its confirmation mid-level.
  settingsreset() { SHOTS.title(); app.setVolume('music', 0.6); app.openSettings(); },
  resetconfirm() { SHOTS.settings(); app.askReset(); },
  saucehint() {
    save.tapControls = true; play(2);
    const g = app.g;
    g.tray.push({ item: 'galbi', cook: 'done', perfect: false, sauce: 'honey' });
    G.grillAdd(g, 'sausage'); run(1); G.pickSauce(g, 'spicy'); run(0.3);
  },
  memory() { play(2); autoServe(); run(0.2); },
  cast() { app.screen = 'cast'; run(0.5); },
};

if (params.has('cs')) setCustomerScale(Math.max(1, Math.min(5, Number(params.get('cs')) || 3)));
window.nightMarket = { app, G, step, SHOTS, save, scoreServe };
loadAssets().then(() => {
  registerFoodArt();
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
