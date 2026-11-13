// Boot, game loop, input (drag, flick, swipe, tap, keys), screen flow, save and
// sound hookup.
import { W, H, C, setCtx, setSize } from './gfx.js';
import { LEVELS, COOK, ITEMS, SHOP_FROM_LEVEL } from './data.js';
import { grillState, fryState, levelDef, buyUpgrade, upgradeById, nightPay, scoreServe, potBoiling, isUnlocked, soupState } from './logic.js';
import * as G from './game.js';
import { boxGeom, COUNTER_Y, tapMode, guestX, grillSlotX, basketX, WOK_CX, steamX, POT_CX, soupX } from './render.js';
import { drawFrame, lineTyped, choiceBox, defaultTitlePage, TITLE_PAGES, logPages, shopPages, defaultShopPage, badgePages } from './screens.js';
import { computeView, setLayout, LAY } from './layout.js';
import { designToScreen, setPatterns } from './ui.js';
import { tipSetFor, newTips, currentTip, markSeen, showTipsAgain } from './tips.js';
import { createFx, updateFx, spawn, floatText, coinBurst, bounce, toast } from './fx.js';
import * as audio from './audio.js';
import { loadAssets } from './assets.js';
import { setCustomerScale, registerFoodArt } from './sprites.js';
import { classify, flickAction, tapAction, accepts, drop, findTarget, offTray, dragHint, missHint, DRAG_DIST } from './drag.js';
import { SPIRITS, PEOPLE_QUIPS, REGULAR_LINES, isSpirit } from './spirits.js';
import {
  sceneFor, sceneById, afterSceneFor, startScene, advance, choose, skip, finishScene, relTips, unlockMemory,
  recordService, moodsFor,
} from './story.js';
import { freshSave, normalizeSave, clearProgress } from './save.js';
import { refreshGoals, earnedBadges, track, newNight, noteText } from './goals.js';

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
// The buffer covers the whole viewport at a whole-number scale (layout.js);
// the game draws in its W x H content area (inside the safe area) and the
// edges past it repeat its outermost pixels, so there are no black bars.
const screen = document.getElementById('game');
const sctx = screen.getContext('2d');
const buf = document.createElement('canvas');
const bctx = buf.getContext('2d');
setCtx(bctx);
let view = null;
let scale = 1;

// Safe-area insets (notches, the home bar), in CSS px.
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;'
  + 'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
document.body.appendChild(probe);
function insets() {
  const cs = getComputedStyle(probe);
  return { top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0, bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0 };
}
let sizeKey = '';
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth, vh = window.innerHeight;
  const ins = insets();
  const key = [vw, vh, dpr, ins.top, ins.right, ins.bottom, ins.left].join();
  if (key === sizeKey) return false;
  sizeKey = key;
  view = computeView(vw, vh, dpr, ins);
  scale = view.s;
  setSize(view.W, view.H);
  setLayout(view.W, view.H, view.mode);
  buf.width = view.bw; buf.height = view.bh;
  bctx.imageSmoothingEnabled = false;
  screen.width = view.bw * view.s; screen.height = view.bh * view.s;
  screen.style.width = `${view.cssW}px`; screen.style.height = `${view.cssH}px`;
  screen.style.left = `${view.left}px`; screen.style.top = `${view.top}px`;
  sctx.imageSmoothingEnabled = false;
  return true;
}
// After a resize nothing stays in the player's hand (the targets moved).
function relayout() { if (resize()) { app.drag = null; app.snap = null; app.slider = null; } }
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', relayout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);
resize();

// ---------- app ----------
const save = loadSave();
// Daily goals on the board, and any badges an older save already earned (no note).
refreshGoals(save);
earnedBadges(save);
writeSave(save);
audio.setMuted(save.muted);
audio.setMusicVolume(save.musicVol);
audio.setAmbienceVolume(save.ambVol);
audio.setSfxVolume(save.sfxVol);
setPatterns(save.patterns);
const seedParam = params.has('seed') ? Number(params.get('seed')) : undefined;
// After the KEEPER ending, Eoreum comes to endless nights now and then.
const visitorsFor = (s) => (s.story && s.story.endings && s.story.endings.keeper ? ['ice'] : []);

const app = {
  screen: 'title', g: null, fx: createFx(), time: 0, save, muted: save.muted,
  vol: audio.volumes(), settings: false, confirmReset: false, slider: null, drag: null, snap: null,
  slide: null, pointer: null, reg: { hits: [], sources: [], targets: [], trayBox: null },
  shownCoins: 0, endAt: 0, frozen: false, banner: null, nightMemories: new Set(), lastPay: 0,
  dlg: null, dlgT: 0, dlgThen: null, shopNext: null, shopMsg: null, shopPage: 0,
  titlePage: defaultTitlePage(save.stars), logPage: 0,
  night: newNight(), note: null, notes: [], badgeSel: null, badgePage: 0, ending: null,

  setTitlePage(i) { app.titlePage = Math.max(0, Math.min(TITLE_PAGES.length - 1, i)); },
  setLogPage(i) { app.logPage = Math.max(0, Math.min(logPages() - 1, i)); },
  setShopPage(i) { app.shopPage = Math.max(0, Math.min(shopPages().length - 1, i)); },
  setBadgePage(i) { app.badgePage = Math.max(0, Math.min(badgePages() - 1, i)); app.badgeSel = null; },

  say(text, good = false) { toast(app.fx, text, good); audio.play('tap'); },
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
    app.titlePage = 0; app.logPage = 0;
    app.night = newNight(); app.notes = []; app.note = null;
    refreshGoals(save); writeSave(save);
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

  // Colour patterns (colourblind mode): shapes on every colour signal.
  togglePatterns() { save.patterns = !save.patterns; setPatterns(save.patterns); writeSave(save); audio.play('tap'); },
  // First-night tips: SKIP turns them all off; SHOW TIPS AGAIN brings them back
  // (from the next night, or this one if it is a night with tips).
  skipTips() { markSeen(save); writeSave(save); app.tips = null; app.tip = null; audio.play('tap'); },
  showTipsAgain() {
    showTipsAgain(save); writeSave(save);
    if (app.g && !app.tips) app.tips = newTips(tipSetFor(app.g.level, save));
    app.say('TIPS ARE BACK', true);
  },

  toTitle() { app.screen = 'title'; app.g = null; app.fx = createFx(); app.drag = null; app.banner = null; audio.setRain(false); audio.setWinter(false); },
  // Before a level: its story scene, the first time only (the log replays it).
  playLevel(n) {
    const sc = sceneFor(n);
    if (sc && !save.story.seen[sc.id]) app.startDialogue(sc, false, () => app.newLevel(n));
    else app.newLevel(n);
  },
  newLevel(n) {
    app.screen = 'game';
    // A new night: goals finished last night make room for new ones.
    app.night = newNight();
    refreshGoals(save);
    writeSave(save);
    const def = levelDef(n);
    app.g = G.createGame(n, {
      seed: seedParam ?? (def && def.endless ? Math.floor(Math.random() * 1e9) : undefined), upgrades: save.upgrades, relTips: relTips(save.story), moods: moodsFor(save.story), autoBasket: !!save.tapControls,
      visitors: visitorsFor(save), // Eoreum, after the KEEPER ending
    });
    app.fx = createFx();
    app.shownCoins = 0; app.slide = null; app.drag = null; app.snap = null; app.banner = null;
    app.nightMemories = new Set(); app.lastPay = 0; app.dogHinted = false;
    app.tips = newTips(tipSetFor(n, save)); app.tip = null; // first-night tips (night 1, a new station)
    audio.setRain(!!app.g.def.rain);
    audio.setWinter(!!app.g.def.winter);
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
  openShop(next) { app.screen = 'shop'; app.g = null; app.shopNext = next; app.shopMsg = null; app.shopPage = defaultShopPage(save); audio.setRain(false); },
  leaveShop() { if (app.shopNext) app.playLevel(app.shopNext); else app.toTitle(); },
  buy(id) {
    const purse = { wallet: save.wallet, upgrades: save.upgrades, stars: save.stars };
    if (!buyUpgrade(purse, id)) return app.cantBuy(id);
    save.wallet = purse.wallet;
    app.addNotes(earnedBadges(save).map((b) => ({ kind: 'badge', id: b })));
    writeSave(save);
    audio.play('serve');
    app.shopMsg = { text: 'BOUGHT!', good: true, at: app.time };
    return true;
  },
  cantBuy(id) {
    const u = upgradeById(id);
    audio.play('nope');
    app.shopMsg = { text: save.wallet >= u.cost ? `OPENS WITH LEVEL ${u.from}` : `NEED ${u.cost - save.wallet} MORE`, good: false, at: app.time };
  },

  // ---------- story ----------
  openLog() { app.screen = 'log'; app.g = null; },
  openBadges() { app.screen = 'badges'; app.g = null; app.badgeSel = null; app.badgePage = 0; audio.setRain(false); },
  pickBadge(i) { app.badgeSel = app.badgeSel === i ? null : i; },
  // Goal progress and new badges: one small ribbon at a time. A newer note
  // for the same goal replaces one still waiting.
  addNotes(notes) {
    for (const n of notes) {
      const item = { key: n.kind === 'badge' ? `b:${n.id}` : `g:${n.id}`, text: noteText(n), badge: n.kind === 'badge', done: !!n.done, t: 0 };
      const k = app.notes.findIndex((x) => x.key === item.key);
      if (k >= 0) app.notes[k] = item; else app.notes.push(item);
      if (item.badge || item.done) audio.play('perfect');
    }
  },
  trackEv(ev) { app.addNotes(track(save, ev, app.night)); writeSave(save); },
  replayScene(id) { app.startDialogue(sceneById(id), true, () => app.openLog()); },
  // The scene after a level: night 13's epilogue (the first time it is
  // cleared) and night 19's finale (every time: a replay can reach another
  // ending), then the ending's epilogue card.
  playAfter(sc) {
    app.startDialogue(sc, false, (d) => {
      if (d && d.ending) return app.showEnding(d.ending);
      app.toTitle(); app.titlePage = defaultTitlePage(save.stars);
    });
  },
  // The epilogue card of an ending (part 3). Its badge comes with it.
  showEnding(id) {
    app.screen = 'ending'; app.ending = id; app.g = null; app.fx = createFx();
    app.addNotes(earnedBadges(save).map((b) => ({ kind: 'badge', id: b })));
    writeSave(save);
    audio.setRain(false); audio.setWinter(id === 'keeper');
    audio.sting();
  },
  endingDone() { app.toTitle(); app.setTitlePage(2); },
  startDialogue(sc, replay, then) {
    app.dlg = startScene(sc, save.story, { replay });
    app.dlgT = 0; app.dlgThen = then;
    app.screen = 'scene'; app.g = null;
    audio.setRain(!!levelDef(sc.level)?.rain);
    audio.setWinter(!!levelDef(sc.level)?.winter);
  },
  dlgTap() {
    const d = app.dlg;
    if (!d) return;
    if (!lineTyped(app)) { app.dlgT = 99; return; } // finish the line first
    if (d.choice) return;
    const before = d.cur;
    advance(d);
    audio.play('page');
    if (d.cur !== before) { app.dlgT = 0; app.lineSounds(); }
    if (d.done) app.finishDialogue();
  },
  dlgChoose(k) {
    const d = app.dlg;
    if (!d || !choose(d, k, save.story)) return;
    writeSave(save);
    audio.play('tap');
    app.dlgT = 0;
    app.lineSounds();
    if (d.done) app.finishDialogue();
  },
  // A line that says Chimaek barks gets a bark (two in the TOGETHER ending);
  // the bell ringing on purpose rings it.
  lineSounds() {
    const tx = (app.dlg && app.dlg.cur && app.dlg.cur.text) || '';
    if (/barks twice/i.test(tx)) audio.play('bark2'); else if (/barks/i.test(tx)) audio.play('bark');
    if (/ring it on purpose/i.test(tx)) audio.play('bell');
  },
  dlgSkip() { if (!app.dlg) return; skip(app.dlg); app.finishDialogue(); },
  finishDialogue() {
    const d = app.dlg, then = app.dlgThen;
    finishScene(d, save.story);
    writeSave(save);
    app.dlg = null; app.dlgThen = null;
    if (then) then(d);
  },
};

// ---------- events -> sound and juice ----------
// Where the cooking box's contents start (station particles are placed from it).
const BY = () => boxGeom().gy;
const slotX = (g, station, slot) => (station === 'grill' ? grillSlotX(g, slot) : station === 'fryer' ? basketX(slot)
  : station === 'steamer' ? steamX(slot, g.steamer.length) : station === 'pot' ? POT_CX : station === 'soup' ? soupX(slot, g.soup.length) : WOK_CX);
// A spirit's memory waits until their reaction bubble is gone (t < 0 is hidden).
function showBanner(who, text, memory) { app.banner = { who, text: text.toUpperCase(), memory, t: memory ? -0.8 : 0, life: memory ? 4.2 : 2.8 }; }
function handleEvents() {
  const g = app.g;
  if (!g) return;
  for (const e of G.takeEvents(g)) {
    if (e.type === 'sfx') audio.play(e.name);
    else if (e.type === 'toast') toast(app.fx, e.text, e.good, e.perfect);
    else if (e.type === 'tray') bounce(app.fx, `tray:${e.index}`);
    else if (e.type === 'sauced') { bounce(app.fx, `tray:${e.index}`); spawn(app.fx, 'tray', 18 + e.index * 30, 330, 'drip', 6); }
    else if (e.type === 'place') {
      const x = slotX(g, e.station, e.slot);
      spawn(app.fx, e.station, x, BY() + 10, e.station === 'fryer' ? 'bubble' : 'spark', 10);
      bounce(app.fx, `${e.station === 'fryer' ? 'fry' : e.station}:${e.slot}`);
    } else if (e.type === 'waste') spawn(app.fx, e.station, slotX(g, e.station, e.slot), BY() + 10, 'blacksmoke', 8);
    else if (e.type === 'toss') {
      bounce(app.fx, 'wok:0');
      spawn(app.fx, 'wok', WOK_CX, BY() + 34, e.spill ? 'drip' : 'spark', e.spill ? 10 : 8);
      spawn(app.fx, 'wok', WOK_CX, BY() + 24, 'steam', 3);
      if (e.spill) app.fx.shake = 0.15;
    } else if (e.type === 'scorch') toast(app.fx, 'SCORCHING! TOSS IT!');
    else if (e.type === 'lid') {
      bounce(app.fx, `steamer:${e.slot}`);
      if (!e.on) spawn(app.fx, 'steamer', steamX(e.slot, g.steamer.length), BY() + 24, 'steam', 10); // a puff as the lid comes off
    } else if (e.type === 'stir') {
      bounce(app.fx, `soup:${e.slot}`);
      spawn(app.fx, 'soup', soupX(e.slot, g.soup.length), BY() + 28, 'steam', 5);
    } else if (e.type === 'stick') toast(app.fx, 'STIR THE SOUP!');
    else if (e.type === 'cold') bounce(app.fx, `tray:${e.index}`);
    else if (e.type === 'boiled') {
      spawn(app.fx, 'pot', POT_CX, BY() + 28, 'steam', 8);
      if (G.currentStation(g).id !== 'pot') toast(app.fx, 'THE WATER IS BOILING', true);
    }
    else if (e.type === 'arrive') {
      // Normal people can't see the spirits. Now and then one says so.
      if (typeof e.look === 'number' && !app.banner && (e.cid * 7 + g.level) % 3 === 0) showBanner('A GUEST', PEOPLE_QUIPS[(e.cid + g.level) % PEOPLE_QUIPS.length], false);
      // A regular says hello the way they feel about you.
      else if (e.regular && REGULAR_LINES[e.look] && (!app.banner || !app.banner.memory)) showBanner(SPIRITS[e.look].name, REGULAR_LINES[e.look][e.regular], false);
    } else if (e.type === 'rush') {
      toast(app.fx, 'RUSH! QUICK ORDERS', false);
      audio.play('bell'); app.fx.shake = 0.15;
    } else if (e.type === 'dog') {
      if (e.result === 'ate') { spawn(app.fx, 'world', 20, 110, 'confetti', 10); bounce(app.fx, 'dog'); app.trackEv({ type: 'fed' }); }
      else if (e.result === 'hungry') { audio.play('sniff'); if (!app.dogHinted) { app.dogHinted = true; toast(app.fx, 'CHIMAEK LOOKS HUNGRY', true); } }
    } else if (e.type === 'served') {
      const c = g.line.find((x) => x.id === e.cid);
      const x = c ? Math.round(guestX(g, c)) : 52;
      const r = e.result;
      floatText(app.fx, x, 70, `${r.coins >= 0 ? '+' : ''}${r.coins}`, r.coins >= 0 ? C.yellow : C.red, true);
      if (r.tip > 0) floatText(app.fx, x, 82, `TIP +${r.tip}`, C.greenL);
      // floats live in the street's design coordinates; the coins fly to the HUD counter
      if (r.coins > 0) coinBurst(app.fx, x, 90, Math.min(12, Math.ceil(r.coins / 2)), 34 - LAY.scene.d, 3 - LAY.scene.dy);
      if (isSpirit(e.look)) { recordService(save.story, e.look, r.mood === 'happy'); writeSave(save); }
      app.trackEv({ type: 'served', result: r, vip: e.vip, regular: e.regular, endless: g.endless, winter: g.winter });
      if (r.treat) floatText(app.fx, x, 94, `DOG BONUS +${r.treat}`, C.greenL);
      if (r.mood === 'happy') {
        spawn(app.fx, 'world', x, 80, 'confetti', 14);
        // A spirit you feed well remembers grandma: one new line per spirit per night.
        if (isSpirit(e.look)) {
          const line = unlockMemory(save.story, e.look, app.nightMemories);
          if (line) { showBanner(SPIRITS[e.look].name, line, true); app.addNotes(earnedBadges(save).map((b) => ({ kind: 'badge', id: b }))); writeSave(save); }
        }
      } else app.fx.shake = 0.2;
    } else if (e.type === 'walkout') {
      app.trackEv({ type: 'walkout' });
      if (isSpirit(e.look)) { recordService(save.story, e.look, false); writeSave(save); }
      const c = g.line.find((x) => x.id === e.cid);
      floatText(app.fx, c ? Math.round(guestX(g, c)) : 52, 70, 'WALKED OUT', C.red);
    } else if (e.type === 'end') {
      app.endAt = app.time;
      const best0 = save.stars[g.level] || 0;
      if (!e.endless && e.stars > best0) save.stars[g.level] = e.stars; // (badges read the stars)
      const mixups = g.results.filter((x) => !x.walked && x.mood !== 'happy').length;
      const cold = g.results.reduce((s, x) => s + (x.cold || 0), 0);
      app.trackEv({ type: 'end', level: g.level, endless: !!e.endless, stars: e.stars, lost: g.lost, served: g.served, coins: g.coins, mixups, winter: g.winter, cold });
      // The purse line shows the night's coins plus any goal coins (already in the purse).
      const pay = nightPay(g.coins);
      save.wallet += pay;
      app.lastPay = pay + app.night.goalCoins;
      app.newBest = false;
      if (e.endless) { // the best endless night is kept (winter nights have their own)
        const key = g.winter ? 'winterBest' : 'endlessBest';
        app.newBest = g.coins > (save[key] || 0);
        if (app.newBest) { save[key] = g.coins; spawn(app.fx, 'top', Math.floor(W / 2), Math.floor(H / 2) - 90, 'confetti', 40); audio.sting(); }
        writeSave(save);
        continue;
      }
      writeSave(save);
      if (e.stars === 3) spawn(app.fx, 'top', Math.floor(W / 2), Math.floor(H / 2) - 90, 'confetti', 40);
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
    if (Math.random() < dt * (st === 'burnt' ? 14 : 6)) spawn(app.fx, 'grill', x, BY() + 6, st === 'burnt' ? 'blacksmoke' : 'smoke');
    if (Math.random() < dt * 4) spawn(app.fx, 'grill', x, BY() + 16, 'spark');
  });
  g.fryer.baskets.forEach((it, i) => {
    if (!it) return;
    cooking += 1;
    const x = basketX(i) + (Math.random() - 0.5) * 50;
    const st = fryState(it, g.cook.fry);
    if (Math.random() < dt * 30) spawn(app.fx, 'fryer', x, BY() + 14 + Math.random() * 20, 'bubble');
    if (Math.random() < dt * (st === 'burnt' ? 12 : 4)) spawn(app.fx, 'fryer', x, BY() + 6, st === 'burnt' ? 'blacksmoke' : 'steam');
  });
  if (g.wok) {
    cooking += 1;
    const x = WOK_CX + (Math.random() - 0.5) * 40;
    if (Math.random() < dt * (g.wok.scorch > 0 ? 16 : 3)) spawn(app.fx, 'wok', x, BY() + 28, g.wok.scorch > 0 ? 'blacksmoke' : 'steam');
  }
  g.steamer.forEach((b, i) => {
    if (!b || !b.lid) return;
    cooking += 1;
    if (Math.random() < dt * 5) spawn(app.fx, 'steamer', steamX(i, g.steamer.length) + (Math.random() - 0.5) * 50, BY() + 20, 'steam');
  });
  if (g.pot) {
    cooking += 1;
    const x = POT_CX + (Math.random() - 0.5) * 70;
    if (Math.random() < dt * (potBoiling(g.pot) ? 8 : 2)) spawn(app.fx, 'pot', x, BY() + 28, 'steam');
  }
  g.soup.forEach((s, i) => {
    if (!s) return;
    cooking += 1;
    const burnt = soupState(s, g.cook.soup) === 'burnt', x = soupX(i, g.soup.length) + (Math.random() - 0.5) * 50;
    if (Math.random() < dt * (burnt || s.stick > 0 ? 10 : 4)) spawn(app.fx, 'soup', x, BY() + 26, burnt || s.stick > 0.5 ? 'blacksmoke' : 'steam');
  });
  crackleT -= dt;
  if (cooking && crackleT <= 0) {
    const bubbly = g.fryer.baskets.some(Boolean) || potBoiling(g.pot) || g.soup.some(Boolean);
    audio.play(bubbly && Math.random() < 0.5 ? 'bubble' : 'crackle', 0.05);
    crackleT = 0.08 + Math.random() * 0.12;
  }
}

function step(dt) {
  app.time += dt;
  if (app.screen === 'scene') app.dlgT += dt;
  if (app.g) {
    G.update(app.g, dt);
    ambient(dt);
    handleEvents();
    if (app.tips) {
      app.tip = currentTip(app.g, app.tips, tapMode(app) ? 'tap' : 'drag');
      if (app.tips.done) { markSeen(save, [app.tips.set]); writeSave(save); app.tips = null; app.tip = null; }
    }
    if (app.slide) { app.slide.k += dt / 0.22; if (app.slide.k >= 1) app.slide = null; }
  }
  if (app.banner) { app.banner.t += dt; if (app.banner.t > app.banner.life) app.banner = null; }
  if (app.snap) { app.snap.t += dt; if (app.snap.t > 0.16) app.snap = null; }
  if (!app.note && app.notes.length) app.note = app.notes.shift();
  if (app.note) { app.note.t += dt; if (app.note.t > (app.note.badge || app.note.done ? 2.6 : 1.6)) app.note = null; }
  if (updateFx(app.fx, dt)) audio.play('coin', 0.04);
  if (app.g) { // the HUD counter rolls toward the real total
    const d = app.g.coins - app.shownCoins;
    if (d) app.shownCoins += Math.sign(d) * Math.max(1, Math.round(Math.abs(d) * dt * 6));
    if (Math.sign(app.g.coins - app.shownCoins) !== Math.sign(d)) app.shownCoins = app.g.coins;
  }
}

// Fills the buffer outside the content area with the content's edge pixels.
function extendEdges() {
  const { x0, y0, W: w, H: h, bw, bh } = view;
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  const right = bw - x0 - w, bottom = bh - y0 - h;
  if (y0 > 0) bctx.drawImage(buf, x0, y0, w, 1, x0, 0, w, y0);
  if (bottom > 0) bctx.drawImage(buf, x0, y0 + h - 1, w, 1, x0, y0 + h, w, bottom);
  if (x0 > 0) bctx.drawImage(buf, x0, 0, 1, bh, 0, 0, x0, bh);
  if (right > 0) bctx.drawImage(buf, x0 + w - 1, 0, 1, bh, x0 + w, 0, right, bh);
}
function draw() {
  bctx.setTransform(1, 0, 0, 1, view.x0, view.y0);
  app.reg = drawFrame(app);
  extendEdges();
  sctx.save();
  if (app.fx.shake > 0) sctx.translate(Math.round((Math.random() - 0.5) * 2) * scale, 0);
  sctx.drawImage(buf, 0, 0, view.bw * scale, view.bh * scale);
  sctx.restore();
}

let lastT = performance.now();
function frame(now) {
  relayout(); // cheap when nothing changed; catches a fold or unfold the events miss
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!app.frozen && !app.settings) step(dt);
  draw();
  requestAnimationFrame(frame);
}

// ---------- input ----------
// CSS px -> the game's coordinates (art px in the content area), and back.
function toBuf(e) {
  const r = screen.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * view.bw - view.x0, y: ((e.clientY - r.top) / r.height) * view.bh - view.y0 };
}
function toCss(x, y) {
  const r = screen.getBoundingClientRect();
  return { x: r.left + ((x + view.x0) / view.bw) * r.width, y: r.top + ((y + view.y0) / view.bh) * r.height };
}
const inWork = (p) => { const k = LAY.work; return p.x >= k.x && p.x < k.x + k.w && p.y >= k.y && p.y < k.y + k.h; };
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
function sliderValue(x) {
  const h = app.reg.hits.find((r) => r.tag === `slider:${app.slider.key}`);
  return h ? (x - (h.x + 10)) / (h.w - 20) : 0;
}
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
  // A flip, toss, lid lift or serve, from a quick tap or a flick up.
  const act = (a) => {
    if (a === 'flip') G.grillFlip(g, d.payload.slot);
    else if (a === 'stir') G.soupStir(g, d.payload.slot);
    else if (a === 'lift') { if (!G.steamLidOff(g, d.payload.slot)) toast(app.fx, 'DRAG IT TO THE TRAY'); }
    else if (a === 'serve') G.serveAuto(g);
    else G.wokToss(g);
  };
  if (kind === 'tap') {
    const ta = tapAction(g, d.payload);
    if (ta) act(ta);
    else { toast(app.fx, dragHint(d.payload)); audio.play('tap'); }
    return;
  }
  // A drop on something that takes it wins (a quick drag up to Chimaek or a
  // guest is not a flick); then a flick up.
  if (d.payload.kind === 'ladle' && d.stirred) return; // stirred while it swirled: it goes back on its rack
  const tg = findTarget(app.reg.targets.filter((r) => accepts(g, d.payload, r.target)), p.x, p.y);
  if (tg && drop(g, d.payload, tg.target)) {
    if (d.payload.kind === 'ready' || d.payload.kind === 'bin') bounce(app.fx, d.payload.kind === 'ready' ? `ready:${d.payload.item}` : `bin:${d.payload.item}`);
    return;
  }
  const fa = flickAction(d.payload);
  if (kind === 'flick' && fa) { act(fa); return; }
  if (d.payload.kind === 'tray' && app.reg.trayBox && offTray(app.reg.trayBox, p.x, p.y)) { G.trashTray(g, d.payload.index); return; }
  // A quick sideways swipe that started on food (and landed nowhere) still switches stations.
  if ((kind === 'swipeLeft' || kind === 'swipeRight') && now - d.t0 < 300 && inWork({ x: d.x0, y: d.y0 })) {
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
    const px = d.x, py = d.y;
    d.x = p.x; d.y = p.y;
    if (!d.lifted && Math.hypot(p.x - d.x0, p.y - d.y0) >= DRAG_DIST) { d.lifted = true; audio.play('lift'); }
    if (d.payload.kind === 'ladle' && d.lifted && app.g) ladleSwirl(d, Math.hypot(p.x - px, p.y - py), p);
  }
});
// The ladle swirled around inside a soup pot: every LADLE_STIR art px of
// movement over a pot is one stir.
const LADLE_STIR = 28;
function ladleSwirl(d, moved, p) {
  const g = app.g;
  const tg = findTarget(app.reg.targets.filter((r) => r.target.kind === 'soupPot' && accepts(g, d.payload, r.target)), p.x, p.y, 0);
  if (!tg) { d.swirl = 0; return; }
  d.swirl = (d.swirl || 0) + moved;
  if (d.swirl >= LADLE_STIR) { d.swirl = 0; G.soupStir(g, tg.target.slot); d.stirred = true; }
}
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
  if (!app.settings && app.screen === 'game' && g && g.phase !== 'end' && inWork(start) && Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    app.switchStation(dx < 0 ? 1 : -1); // swipe left shows the station to the right
    return;
  }
  if (!app.settings && ['title', 'log', 'shop', 'badges'].includes(app.screen) && Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    if (app.screen === 'title') app.setTitlePage(app.titlePage + (dx < 0 ? 1 : -1));
    else if (app.screen === 'shop') app.setShopPage(app.shopPage + (dx < 0 ? 1 : -1));
    else if (app.screen === 'badges') app.setBadgePage(app.badgePage + (dx < 0 ? 1 : -1));
    else app.setLogPage(app.logPage + (dx < 0 ? 1 : -1));
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
    if (e.key === 'Enter' || e.key === ' ') app.playLevel(Math.max(...LEVELS.filter((L) => isUnlocked(L.n, save.stars)).map((L) => L.n)));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') app.setTitlePage(app.titlePage + (e.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (app.screen === 'shop') {
    if (e.key === 'Enter') app.leaveShop();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') app.setShopPage(app.shopPage + (e.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (app.screen === 'log') {
    if (e.key === 'Enter') app.toTitle();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') app.setLogPage(app.logPage + (e.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (app.screen === 'badges') {
    if (e.key === 'Enter') app.toTitle();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') app.setBadgePage(app.badgePage + (e.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (app.screen === 'ending') { if (e.key === 'Enter' || e.key === ' ') app.endingDone(); return; }
  if (!g) return;
  if (g.phase === 'intro' && (e.key === 'Enter' || e.key === ' ')) return app.startLevel();
  if (g.phase === 'end' && e.key === 'Enter') {
    if (g.endless) return app.newLevel(g.level);
    const after = afterSceneFor(g.level);
    if (g.stars > 0 && after && (after.repeat || !save.story.seen[after.id])) return app.playAfter(after);
    return g.stars > 0 && levelDef(g.level + 1) ? app.endNext() : app.newLevel(g.level);
  }
  if (e.key === 'ArrowLeft' || e.key === 'a') app.switchStation(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd') app.switchStation(1);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); G.serveAuto(g); }
  else if (e.key === 'Escape') g.held = null;
  else if (/^[1-7]$/.test(e.key)) app.goStation(Number(e.key) - 1);
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
    } else if (kind === 'steam') {
      const s = g.steamer.indexOf(null);
      G.steamAdd(g, l.item, s); G.steamLidOn(g, s); run(g.cook.steam.time); G.steamTake(g, s);
    } else if (kind === 'pot') {
      if (!g.pot) G.potWater(g);
      run(g.cook.pot.boil + 0.1); G.potAdd(g, l.item); run(g.cook.pot.time * 0.97); G.potTake(g);
    } else if (kind === 'soup') {
      const s = g.soup.indexOf(null);
      G.soupAdd(g, l.item, s);
      for (let k = 0; k < 4; k++) { run(2.8); G.soupStir(g, s); }
      G.soupTake(g, s);
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
// A design point (180 x 390) on the current screen, in game coordinates.
function at(x, y) { app.reg = drawFrame(app); return designToScreen(x, y, app.reg.frames); }
// Puts something in the player's hand at design point (x, y), as if dragged there.
function holdAt(payload, dx, dy) {
  const { x, y } = at(dx, dy);
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
  intro3() { app.newLevel(3); run(0.6); },
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
    G.grillAdd(g, 'galbi'); run(4.8); G.grillFlip(g, 0); G.grillAdd(g, 'sausage'); run(3.9);
    G.grillAdd(g, 'galbi'); run(1.8); G.grabReady(g, 'soda'); run(0.5);
  },
  tapmode() { save.tapControls = true; SHOTS.grill(); },
  swipe() { SHOTS.grill(); app.switchStation(-1); app.slide.k = 0.4; },
  fryerbatter() { play(3); const g = app.g; G.fryBatter(g); run(0.6); G.grabReady(g, 'beer'); run(0.2); }, // battered chicken waiting in the bowl
  fryer() {
    play(3); const g = app.g;
    G.fryBatter(g); run(0.5); G.fryToBasket(g, 0); run(6.5); G.fryBatter(g); run(0.5); G.fryToBasket(g, 1); run(1.6); G.fryBatter(g); run(0.6);
    G.grabReady(g, 'beer'); run(0.3);
  },
  sauce() {
    save.tapControls = true; play(3);
    const g = app.g;
    g.tray.push({ item: 'chicken', cook: 'done', perfect: true, sauce: null }, { item: 'chicken', cook: 'done', perfect: false, sauce: null });
    G.pickSauce(g, 'yangnyeom'); app.pointer = at(70, 340); run(0.2);
  },
  wok() { // a dish in the air, a topped dish on the tray
    play(4); const g = app.g;
    g.tray.push({ item: 'tteokbokki', cook: 'done', perfect: true, sauce: 'scallion' });
    G.wokStart(g, 'japchae'); for (let i = 0; i < 3; i++) { run(0.4); G.wokToss(g); } run(0.14);
  },
  wokscorch() { play(4); const g = app.g; G.wokStart(g, 'friedrice'); for (let i = 0; i < 6; i++) { run(0.4); G.wokToss(g); } run(COOK.wok.idleSafe + 0.6); },
  woktap() { save.tapControls = true; play(4); const g = app.g; G.wokStart(g, 'tteokbokki'); for (let i = 0; i < 5; i++) { run(0.4); G.wokToss(g); } run(0.5); },
  mix() { play(5); autoServe(); waitForGuest(); const g = app.g; G.grillAdd(g, 'galbi'); G.fryBatter(g); run(0.6); G.fryToBasket(g); G.wokStart(g, 'japchae'); run(0.5); G.wokToss(g); app.goStation(3); run(0.5); },
  upgraded() { play(5, { upgrades: { grill4: true, tray5: true } }); const g = app.g; ['galbi', 'sausage', 'galbi', 'sausage'].forEach((id) => G.grillAdd(g, id)); run(2); ['soda', 'tea', 'kimbap', 'toast', 'beer'].forEach((id) => G.grabReady(g, id)); app.goStation(1); run(0.5); },
  queue() { play(6); run(8); const g = app.g; G.grabReady(g, 'soda'); run(0.2); },
  queuedrag() { SHOTS.queue(); holdAt({ kind: 'serve' }, 146, 100); },
  shiba() { play(3); for (let i = 0; i < 7; i++) autoServe(); waitForGuest(); },
  locked() { play(1); app.goStation(1); run(0.5); },
  locked7() { play(7); app.goStation(5); run(0.5); },
  end() { play(1); while (app.g.phase === 'play') autoServe(); run(2.2); },
  end5() { save.wallet = 240; play(5); while (app.g.phase === 'play') autoServe(); run(2.2); },
  shop() { save.wallet = 520; save.stars = { 5: 2 }; save.upgrades = { fastfry: true }; app.openShop(6); },
  // Part 2 upgrades: the steamer's third basket open (and bought in steamer3), the kettle not yet.
  shop2() { save.wallet = 610; save.stars = { 5: 3, 6: 2, 7: 2, 8: 1 }; save.upgrades = { fastfry: true, grill4: true, tray5: true }; app.openShop(9); },
  shopall() { save.wallet = 1210; save.stars = { 5: 3, 6: 2, 7: 2, 8: 1, 9: 2, 10: 3, 11: 1 }; save.upgrades = { fastfry: true, grill4: true, tray5: true, steam3: true }; app.openShop(12); },
  steamer3() { // three baskets: one steaming, one lifted in the gold, one empty
    play(7, { upgrades: { steam3: true } }); const g = app.g;
    G.steamAdd(g, 'mandu', 0); G.steamLidOn(g, 0); G.steamAdd(g, 'bun', 1); G.steamLidOn(g, 1);
    g.steamer[0].p = 0.6; g.steamer[1].p = 1.05; G.steamLidOff(g, 1); G.steamAdd(g, 'mandu', 2); run(0.4);
  },
  potkettle() { // the copper kettle: the pot stays on the boil after a bowl comes off
    play(10, { upgrades: { kettle: true } }); const g = app.g; G.potWater(g); run(g.cook.pot.boil + 0.1); G.potAdd(g, 'ramyeon'); g.pot.p = 1.0; G.potTake(g); run(0.4);
  },
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
  // ---------- part 2 ----------
  title2() { save.wallet = 1320; save.stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 3, 6: 2, 7: 3, 8: 2, 9: 1 }; app.titlePage = 1; },
  intro7() { app.newLevel(7); run(0.6); },
  intro10() { app.newLevel(10); run(0.6); },
  intro13() { app.newLevel(13); run(0.6); },
  introtap7() { save.tapControls = true; app.newLevel(7); run(0.6); },
  steamer() { // one basket steaming with the lid on, one open with buns, sauce on the tray
    play(7); const g = app.g;
    G.steamAdd(g, 'mandu', 0); G.steamLidOn(g, 0); run(3.8);
    G.steamAdd(g, 'bun', 1); G.steamLidOn(g, 1); run(7.2); G.steamLidOff(g, 1); run(0.3);
    g.tray.push({ item: 'mandu', cook: 'done', perfect: true, sauce: 'chilioil' });
  },
  steamlid() { play(7); const g = app.g; G.steamAdd(g, 'mandu', 0); run(0.3); holdAt({ kind: 'lid' }, 50, 262); },
  steamtap() { save.tapControls = true; play(7); const g = app.g; G.steamAdd(g, 'mandu'); run(3); G.steamAdd(g, 'bun'); run(1); },
  pot() { play(10); const g = app.g; G.potWater(g); run(COOK.pot.boil + 0.2); G.potAdd(g, 'ramyeon'); run(5.1); g.tray.push({ item: 'ramyeon', cook: 'done', perfect: true, sauce: 'egg' }); },
  potboil() { play(10); const g = app.g; G.potWater(g); run(1.4); holdAt({ kind: 'bin', item: 'ramyeon' }, 92, 260); },
  pottap() { save.tapControls = true; play(10); const g = app.g; G.potAdd(g, 'ramyeon'); run(1.5); },
  tabs6() { play(11); const g = app.g; G.potWater(g); G.grillAdd(g, 'galbi'); run(4.6); app.goStation(4); run(0.5); },
  festival() { play(13); run(9); const g = app.g; G.grabReady(g, 'beer'); run(0.2); },
  // ---------- part 2 features ----------
  regulars() { // glad and grumpy regulars in the line
    save.story.service = { fox: { happy: 4, missed: 0 }, moss: { happy: 0, missed: 3 }, lantern: { happy: 1, missed: 0 } };
    save.story.rel = { fox: 1 };
    play(8); run(9); const g = app.g; G.grabReady(g, 'tea'); run(0.2);
  },
  treat() { // Chimaek is hungry; plain beef on the grill and on the tray
    play(9); const g = app.g; run(17); G.grillAdd(g, 'plain', 0); G.grillAdd(g, 'galbi', 1); run(5.1); G.grillFlip(g, 0); run(1.5);
    g.tray.push({ item: 'plain', cook: 'done', perfect: true, sauce: null }); app.goStation(1); run(0.5);
  },
  treatdrag() { SHOTS.treat(); holdAt({ kind: 'tray', index: 0 }, 20, 120); },
  treatfed() { SHOTS.treat(); G.feedDog(app.g, { kind: 'tray', index: 0 }); run(0.5); },
  treatno() { // she sniffs a sauced galbi and turns away
    play(9); const g = app.g; run(17); g.tray.push({ item: 'galbi', cook: 'done', perfect: false, sauce: 'honey' });
    G.feedDog(g, { kind: 'tray', index: 0 }); run(0.4);
  },
  treattap() { save.tapControls = true; SHOTS.treat(); },
  special() { play(11); const g = app.g; G.potWater(g); run(10); G.grabReady(g, 'soda'); run(0.2); },
  rush() { play(12); const g = app.g; for (let i = 0; i < 5; i++) autoServe(); run(4); G.grabReady(g, 'kimbap'); run(0.3); },
  endless() { save.stars = { 13: 1 }; save.endlessBest = 1180; play(99); const g = app.g; run(30); g.lost = 1; G.grabReady(g, 'soda'); run(0.3); },
  endlessmid() { // about five minutes into an endless night: a VIP and a busy line
    save.stars = { 13: 1 }; save.endlessBest = 1180; play(99); const g = app.g;
    for (let i = 0; i < 26 && g.phase === 'play'; i++) autoServe();
    g.lost = 1; run(1.5); G.grabReady(g, 'beer'); run(0.3);
  },
  introendless() { save.stars = { 13: 1 }; app.newLevel(99); run(0.6); },
  endendless() { save.stars = { 13: 1 }; save.endlessBest = 900; save.wallet = 2400; play(99); for (let i = 0; i < 40 && app.g.phase === 'play'; i++) autoServe(); const g = app.g; g.lost = 3; run(2.5); },
  title2end() { SHOTS.title2(); save.stars[13] = 2; save.stars[10] = 3; save.stars[11] = 3; save.stars[12] = 2; save.endlessBest = 1432; },
  end13() { save.wallet = 1900; save.stars = { 12: 2 }; play(13); while (app.g.phase === 'play') autoServe(); run(2.2); },
  epilogue() { save.stars = { 13: 2 }; app.playAfter(afterSceneFor(13)); for (let i = 0; i < 3; i++) { app.dlgT = 99; app.dlgTap(); } run(0.8); },
  epiloguechoice() { app.playAfter(afterSceneFor(13)); for (let i = 0; i < 5; i++) { app.dlgT = 99; app.dlgTap(); } run(1.5); },
  storylog2() { save.story.seen = { l7: true, l8: true, l9: true, l10: true }; save.story.memories = { wisp: 2, fox: 5 }; app.openLog(); app.setLogPage(1); },
  scene13() { app.playLevel(13); for (let i = 0; i < 4; i++) { app.dlgT = 99; app.dlgTap(); } run(1); },
  cast() { app.screen = 'cast'; run(0.5); },
  // ---------- daily goals and badges ----------
  titlegoals() { // the goals board: one done, two on the way
    SHOTS.title2end(); save.goals.list = [{ id: 'galbi', got: 5, done: true }, { id: 'streak', got: 2, done: false }, { id: 'fed', got: 1, done: false }];
    Object.assign(save.badges, { night1: true, goldgrill: true, goldfry: true, gooddog: true, part1: true, memory: true });
  },
  endgoals() { // the end card: a goal finished tonight
    save.wallet = 240; save.stars = { 1: 3, 2: 2 }; save.goals.list = [{ id: 'happy', got: 6, done: false }, { id: 'drinks', got: 3, done: false }, { id: 'clean', got: 0, done: false }];
    play(2); while (app.g.phase === 'play') autoServe(); run(2.2);
  },
  badges() {
    save.stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 3, 6: 3, 7: 1 }; save.goals.list = [{ id: 'chicken', got: 2, done: false }, { id: 'mandu', got: 3, done: true }, { id: 'tips', got: 41, done: false }];
    Object.assign(save.badges, { night1: true, goldgrill: true, goldfry: true, goldwok: true, goldsteam: true, part1: true, memory: true, gooddog: true });
    app.openBadges(); app.pickBadge(9); run(0.3);
  },
  goalnote() { // a goal ticking up mid-night (the ribbon under the HUD)
    save.goals.list = [{ id: 'galbi', got: 2, done: false }, { id: 'happy', got: 3, done: false }, { id: 'drinks', got: 0, done: false }];
    play(2); autoServe(); app.notes = []; app.note = null; app.addNotes([{ kind: 'goal', id: 'galbi', got: 3, n: 5, done: false }]); run(0.3);
  },
  // ---------- the meters' colour code: food in the green (good) and in the gold (perfect) ----------
  cookgrill() { // spot 1: both sides green (good); spot 2: both gold (perfect); spot 3: past the gold, still green
    play(2); const g = app.g;
    [[0.7, 0.68], [1.02, 0.96], [1.5, 1.45]].forEach((sides, i) => { G.grillAdd(g, i === 1 ? 'sausage' : 'galbi', i); Object.assign(g.grill[i], { sides, down: 1 }); });
    run(0.3); G.takeEvents(g);
  },
  cookfryer() { // basket 1 in the green, basket 2 in the gold
    play(3); const g = app.g;
    G.fryBatter(g); run(0.5); G.fryToBasket(g, 0); G.fryBatter(g); run(0.5); G.fryToBasket(g, 1);
    g.fryer.baskets[0].p = 0.74; g.fryer.baskets[1].p = 1.02; run(0.3);
  },
  cooksteamer() { // basket 1 steaming in the green, basket 2 lid off in the gold
    play(7); const g = app.g;
    G.steamAdd(g, 'mandu', 0); G.steamLidOn(g, 0); G.steamAdd(g, 'bun', 1); G.steamLidOn(g, 1);
    g.steamer[0].p = 0.74; g.steamer[1].p = 1.05; G.steamLidOff(g, 1); run(0.4);
  },
  wokgood() { play(4); const g = app.g; G.wokStart(g, 'japchae'); Object.assign(g.wok, { p: 0.75, tosses: 5 }); run(0.3); },
  wokgold() { play(4); const g = app.g; G.wokStart(g, 'tteokbokki'); Object.assign(g.wok, { p: 1.05, tosses: 7 }); run(0.3); },
  potgood() { play(10); const g = app.g; G.potWater(g); g.pot.boil = 1; G.potAdd(g, 'ramyeon'); g.pot.p = 0.74; run(0.3); },
  potgold() { play(10); const g = app.g; G.potWater(g); g.pot.boil = 1; G.potAdd(g, 'ramyeon'); g.pot.p = 1.02; run(0.3); },
  // A perfect cook coming off: the gold PERFECT! toast.
  tookperfect() { play(3); const g = app.g; G.fryBatter(g); run(0.5); G.fryToBasket(g, 0); g.fryer.baskets[0].p = 1.0; G.fryLift(g, 0); run(0.2); },
  // ---------- part 3: the long winter ----------
  title3() { save.wallet = 2410; save.stars = { ...ALL13, 14: 3, 15: 2, 16: 3, 17: 2, 18: 1 }; save.endlessBest = 1432; app.titlePage = 2; },
  title3end() { SHOTS.title3(); Object.assign(save.stars, { 18: 3, 19: 2 }); save.winterBest = 980; save.story.endings = { keeper: 1 }; },
  // Each new night's scene, on a line where its spirit speaks (scene19: Eoreum; finale: its answers).
  scene14() { sceneAt('l14', 5); },
  scene15() { save.story.flags = { frog_teacher: true }; sceneAt('l15', 3); },
  scene16() { save.story.flags = { letter2_read: true }; sceneAt('l16', 6); },
  scene17() { sceneAt('l17', 4); },
  scene17dal() { save.story.flags = { dal_promise: true }; sceneAt('l17', 9); },
  scene18() { sceneAt('l18', 5); },
  scene19() { save.story.flags = { frost_who: true }; sceneAt('l19', 3); },
  finalechoice() { save.story.flags = { ...TOGETHER_FLAGS, scarf_warmed: true }; save.stars = { 19: 2 }; app.playAfter(afterSceneFor(19)); for (let i = 0; i < 12 && !app.dlg.choice; i++) { app.dlgT = 99; app.dlgTap(); } run(1.5); },
  finaletogether() { SHOTS.finalechoice(); app.dlgChoose(2); for (let i = 0; i < 4; i++) { app.dlgT = 99; app.dlgTap(); } run(0.7); },
  endingthaw() { endingShot('thaw', { thaw: 1 }); },
  endingkeeper() { endingShot('keeper', { thaw: 1, keeper: 1 }); },
  endingtogether() { endingShot('together', { thaw: 1, keeper: 1, together: 1 }); },
  intro14() { app.newLevel(14); run(0.6); },
  intro16() { app.newLevel(16); run(0.6); },
  introtap16() { save.tapControls = true; app.newLevel(16); run(0.6); },
  introwinter() { save.stars = { 19: 1 }; app.newLevel(98); run(0.6); },
  // Eoreum at the end of the line on night 14 (the last guest), waiting, silent.
  eoreum() { play(14); for (let i = 0; i < 9 && app.g.phase === 'play'; i++) autoServe(); run(3); },
  // The soup pot: two pots (one stirring with the ladle in hand, one in the gold),
  // good, gold, sticking, and tap controls.
  soupstir() {
    play(16, { upgrades: { soup2: true } }); const g = app.g;
    G.soupAdd(g, 'tteokguk', 0); G.soupAdd(g, 'tteokguk', 1); g.soup[0].p = 0.55; g.soup[1].p = 1.0; G.soupStir(g, 0); run(0.25);
    holdAt({ kind: 'ladle' }, 48 + 12, 262);
  },
  soupgood() { play(16); const g = app.g; G.soupAdd(g, 'tteokguk', 0); Object.assign(g.soup[0], { p: 0.76 }); G.soupStir(g, 0); run(0.8); },
  soupgold() { play(16); const g = app.g; G.soupAdd(g, 'tteokguk', 0); Object.assign(g.soup[0], { p: 1.05 }); G.soupStir(g, 0); run(0.8); g.tray.push({ item: 'tteokguk', cook: 'done', perfect: true, sauce: 'gim', warm: 0.8 }); },
  soupstick() { play(16); const g = app.g; G.soupAdd(g, 'tteokguk', 0); Object.assign(g.soup[0], { p: 0.9, idle: 6, stick: 0.45 }); run(0.3); },
  souptap() { save.tapControls = true; play(16); const g = app.g; G.soupAdd(g, 'tteokguk'); run(5); },
  // Winter: food on the tray cooling (hot with steam, half cool, cold).
  cooling() {
    play(15); const g = app.g;
    g.tray.push({ item: 'mandu', cook: 'done', perfect: true, sauce: 'soydip', warm: 0.95 }, { item: 'galbi', cook: 'done', perfect: false, sauce: null, warm: 0.45 },
      { item: 'bun', cook: 'done', perfect: false, sauce: null, warm: 0, cold: true }, { item: 'soda', cook: null, perfect: false, sauce: null });
    G.steamAdd(g, 'bun', 0); G.steamLidOn(g, 0); run(6); app.goStation(4); run(0.5);
  },
  winterendless() { save.stars = { 19: 1 }; save.winterBest = 980; save.story.endings = { keeper: 1 }; play(98); const g = app.g; for (let i = 0; i < 6 && g.phase === 'play'; i++) autoServe(); G.soupAdd(g, 'tteokguk', 0); run(4); app.goStation(6); run(0.5); },
  endwinter() { save.stars = { 19: 1 }; save.winterBest = 640; save.wallet = 3100; play(98); for (let i = 0; i < 30 && app.g.phase === 'play'; i++) autoServe(); const g = app.g; g.lost = 3; run(2.5); },
  shop3() { save.wallet = 760; save.stars = { ...ALL13, 14: 3, 15: 2, 16: 2 }; save.upgrades = Object.fromEntries(['grill4', 'tray5', 'fastfry', 'patience', 'wokfast', 'steam3', 'kettle'].map((k) => [k, true])); app.openShop(17); },
  badges2() { SHOTS.title3end(); Object.assign(save.badges, { goldsoup: true, keeper: true, warmhands: true }); app.openBadges(); app.setBadgePage(1); app.pickBadge(24); run(0.3); },
  storylog3() { save.story.seen = { l14: true, l15: true, l16: true, l17: true, l18: true, l19: true, l19b: true }; save.story.endings = { thaw: 1 }; save.story.memories = { ice: 1, frog: 5 }; app.openLog(); app.setLogPage(3); },
  end19() { save.wallet = 3300; save.stars = { 18: 2 }; play(19); while (app.g.phase === 'play') autoServe(); run(2.2); },
  // Every food in the small order pictures: three tickets (a line of guests),
  // and the single guest's bubble.
  bubbles() {
    play(17); run(9); const g = app.g;
    const sets = [['soda', 'tea', 'beer', 'kimbap', 'toast'], ['galbi', 'sausage', 'chicken', 'mandu', 'bun'], ['tteokbokki', 'japchae', 'friedrice', 'ramyeon', 'tteokguk']];
    const sauces = { galbi: 'honey', chicken: 'yangnyeom', mandu: 'soydip', tteokguk: 'gim', ramyeon: 'egg' };
    g.line.filter((c) => c.phase === 'wait').slice(0, 3).forEach((c, i) => { c.order = { ...c.order, lines: sets[i].map((item) => ({ item, sauce: sauces[item] || null })), vip: false, rush: false }; });
    run(0.2);
  },
  // First-night tips: the order, grab (drag and tap), serve, a new station.
  tiporder() { play(1); run(0.5); },
  tip1() { play(1); run(3); },
  tip1tap() { save.tapControls = true; play(1); run(3); },
  tipserve() { play(1); run(3); const g = app.g; for (const l of G.waiting(g)[0].order.lines) G.grabReady(g, l.item); run(0.3); },
  tippatience() { play(1); autoServe(); waitForGuest(); run(0.5); },
  tipgrill() { save.stars = { 1: 3 }; play(2); run(0.5); },
  tipgrillcook() { save.stars = { 1: 3 }; play(2); const g = app.g; G.grillAdd(g, 'galbi', 0); run(3); },
  tipsoup() { save.stars = { 15: 2 }; save.tapControls = true; play(16); const g = app.g; G.soupAdd(g, 'tteokguk'); run(2); },
  // Colorblind mode: shapes on the meters, legend, tab dots and patience bars.
  cbgrill() { save.patterns = true; setPatterns(true); SHOTS.cookgrill(); },
  cbbusy() {
    save.patterns = true; setPatterns(true); play(17); run(10); const g = app.g;
    G.grillAdd(g, 'galbi', 0); Object.assign(g.grill[0], { sides: [1.02, 0.96], down: 1 }); G.grillAdd(g, 'sausage', 1); Object.assign(g.grill[1], { sides: [1.9, 0.7], down: 0 });
    G.fryBatter(g); run(0.5); G.fryToBasket(g, 0); g.fryer.baskets[0].p = 0.74;
    g.tray.push({ item: 'chicken', cook: 'done', perfect: true, sauce: 'yangnyeom', warm: 0.9 }, { item: 'mandu', cook: 'done', perfect: false, sauce: null, warm: 0, cold: true }, { item: 'soda', cook: null, perfect: false, sauce: null });
    for (const c of g.line) if (c.phase === 'wait') c.patience = c.maxPatience * 0.25;
    app.goStation(1); run(0.5);
  },
  settingscb() { save.patterns = true; setPatterns(true); SHOTS.settings(); },
  bubble1() { play(7); run(3); const g = app.g; g.line[0].order = { ...g.line[0].order, lines: [{ item: 'mandu', sauce: 'chilioil' }, { item: 'bun', sauce: null }, { item: 'tea', sauce: null }] }; run(0.2); },
};
const ALL13 = Object.fromEntries(LEVELS.filter((L) => L.n <= 13).map((L) => [L.n, 3]));
// Enough kept promises for the TOGETHER ending (story.js PROMISES).
const TOGETHER_FLAGS = { deung_told: true, yeo_hum: true, ikki_promise: true, frog_teacher: true, letter_read: true, gim_stay: true, ttuk_thanks: true };
// A scene shown on its line number `k` (skipping choices by picking the first answer).
function sceneAt(id, k) {
  app.startDialogue(sceneById(id), false, () => app.toTitle());
  for (let i = 0; i < k; i++) { app.dlgT = 99; if (app.dlg.choice) app.dlgChoose(0); else app.dlgTap(); }
  app.dlgT = 0; run(3);
}
function endingShot(id, found) { save.stars = { 19: 2 }; save.story.endings = found; app.showEnding(id); run(1.2); app.notes = []; app.note = null; }

for (let n = 7; n <= 19; n++) SHOTS[`intro${n}`] ||= () => { app.newLevel(n); run(0.6); }; // every part 2 and 3 intro card
if (params.has('cs')) setCustomerScale(Math.max(1, Math.min(5, Number(params.get('cs')) || 3)));
// For tools: design coordinates (180 x 390, on the current screen) -> game
// coordinates -> CSS px, and the live layout.
const designToCss = (x, y) => { const p = designToScreen(x, y, app.reg.frames); return toCss(p.x, p.y); };
window.nightMarket = { app, G, step, SHOTS, save, scoreServe, choiceBox, toCss, designToCss, afterScene: afterSceneFor, designToScreen: (x, y) => designToScreen(x, y, app.reg.frames), layout: () => LAY, view: () => view };
loadAssets().then(() => {
  registerFoodArt();
  const shot = params.get('shot');
  if (shot && !shot.startsWith('tip')) markSeen(save); // the tips only show in their own presets
  if (shot && SHOTS[shot]) {
    SHOTS[shot]();
    app.frozen = true;
  } else if (params.has('level')) {
    app.newLevel(Math.max(1, Math.min(LEVELS.length, Number(params.get('level')) || 1)));
    app.titlePage = defaultTitlePage(save.stars);
  }
  window.nightMarket.ready = true;
  requestAnimationFrame(frame);
}).catch((e) => {
  document.body.textContent = `Could not load the game art: ${e.message}`;
});
