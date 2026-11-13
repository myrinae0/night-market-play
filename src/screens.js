// Menus and overlays: title, story scenes and the story log, the upgrade shop,
// settings, the level intro card, the end-of-night card, and a cast sheet
// (debug). drawFrame() draws whichever screen is up and returns the registry
// of hits, drag sources and drop targets for main.js.
import { W, H, C, R, rbox, text, tw, mix, getCtx } from './gfx.js';
import { LEVELS, STATIONS, UPGRADES, SHOP_FROM_LEVEL } from './data.js';
import { isUnlocked, levelDef, canBuy } from './logic.js';
import { drawItem, drawCustomer, drawShiba, drawPortrait, starIcon, lockIcon, coinIcon } from './sprites.js';
import { SPIRITS, SPIRIT_IDS } from './spirits.js';
import { SCENES, speakerName } from './story.js';
import {
  drawGame, drawMarket, drawRain, awningAndCounter, hud, tapMode, SCENE_H, COUNTER_Y,
} from './render.js';
import { drawParts } from './fx.js';
import { resetRegistry, clearHits, hit, dim, panel, button, toggle, wrap } from './ui.js';

const woodFloor = (y0 = SCENE_H) => {
  R(0, y0, W, H - y0, C.woodDD);
  for (let y = y0 + 10; y < H; y += 12) R(0, y, W, 1, mix(C.woodDD, C.ink, 0.4));
};
export const shopOpen = (save) => (save.stars[SHOP_FROM_LEVEL] || 0) >= 1;

// ---------- title ----------
function titleScreen(app) {
  const t = app.time;
  drawMarket(t);
  drawCustomer('lantern', 52, COUNTER_Y + 2, { t });
  awningAndCounter(t, { react: 'wag' });
  rbox(84, 32, 92, 46, C.ink);
  rbox(84, 30, 92, 46, C.redD);
  R(86, 32, 88, 1, C.red);
  text('CHIMAEK', 130, 36, { font: 'big', scale: 2, align: 'center', color: C.yellow });
  text('NIGHT MARKET', 130, 57, { font: 'big', align: 'center', color: C.cream });
  text('A STALL FOR SPIRITS', 130, 67, { align: 'center', color: C.gold });
  rbox(108, 84, 46, 13, C.ink);
  coinIcon(112, 87);
  text(String(app.save.wallet), 122, 88, { color: C.yellow });
  woodFloor();
  text('PICK A NIGHT', 90, SCENE_H + 6, { font: 'big', align: 'center', color: C.cream });
  LEVELS.forEach((L, i) => {
    const x = 6 + (i % 2) * 86, y = SCENE_H + 18 + Math.floor(i / 2) * 54, w = 82, h = 50;
    const open = isUnlocked(L.n, app.save.stars);
    rbox(x, y + 1, w, h, C.ink);
    rbox(x, y, w, h, open ? C.cream : C.greyDD);
    text(`LEVEL ${L.n}`, x + 5, y + 5, { color: open ? C.redD : C.greyD, outline: null });
    text(L.title.toUpperCase(), x + 5, y + 14, { color: open ? C.ink : C.greyD, outline: null });
    const tag = L.kind === 'mix' ? 'MIX + SHOP' : L.kind === 'queue' ? '3 GUESTS AT ONCE' : `+ ${STATIONS[L.stations[L.stations.length - 1]].name.toUpperCase()}`;
    text(tag, x + 5, y + 23, { color: open ? C.greenD : C.greyD, outline: null });
    if (open) {
      const s = app.save.stars[L.n] || 0;
      for (let k = 0; k < 3; k++) starIcon(x + 5 + k * 12, y + 34, k < s, 1);
      if (L.rain) text('RAIN', x + w - 5, y + 37, { color: C.blue, outline: null, align: 'right' });
      hit(x, y, w, h, () => app.playLevel(L.n));
    } else lockIcon(x + w - 14, y + 34, C.greyD);
  });
  const by = SCENE_H + 18 + 3 * 54 + 2;
  button(6, by, 82, 16, 'STORY', C.purple, () => app.openLog());
  if (shopOpen(app.save)) button(92, by, 82, 16, 'SHOP', C.greenD, () => app.openShop(null));
  else {
    button(92, by, 82, 16, '', C.greyDD, null);
    lockIcon(98, by + 3, C.greyD);
    text(`SHOP: LEVEL ${SHOP_FROM_LEVEL}`, 136, by + 6, { color: C.greyD, align: 'center' });
  }
  text('ART: AROACHIFOUNDONMYPILLOW, KENNEY', 90, H - 20, { align: 'center', color: C.grey });
  text('(CC0) AND CODE. SEE CREDITS.MD', 90, H - 12, { align: 'center', color: C.grey });
}

// ---------- story scene ----------
const TYPE_RATE = 45; // letters per second
export function lineLength(d) { return d && d.cur ? d.cur.text.length : 0; }
export function lineTyped(app) { return Math.floor(app.dlgT * TYPE_RATE) >= lineLength(app.dlg); }
export const DLG = { x: 4, y: 164, w: 172, h: 180 };

function sceneScreen(app) {
  const d = app.dlg, t = app.time, sc = d.scene;
  const def = levelDef(sc.level);
  drawMarket(t, { rain: !!def?.rain });
  drawCustomer(sc.spirit, 98, COUNTER_Y + 2, { t });
  if (def?.rain) drawRain(t);
  awningAndCounter(t, { react: SPIRITS[sc.spirit]?.dog || null });
  rbox(4, 18, 120, 13, C.ink);
  text(`NIGHT ${sc.level}: ${sc.title.toUpperCase()}`, 8, 22, { color: C.gold });
  woodFloor();
  hit(0, 14, W, H - 14, () => app.dlgTap(), 'dialog');
  // the dialogue box
  const B = DLG;
  rbox(B.x, B.y + 2, B.w, B.h, C.ink);
  rbox(B.x, B.y, B.w, B.h, C.cream);
  R(B.x + 2, B.y + 2, B.w - 4, B.h - 4, C.white);
  const who = d.cur ? d.cur.who : sc.spirit;
  let ty = B.y + 8;
  if (who !== 'STORY') {
    rbox(B.x + 6, B.y + 6, 36, 36, C.night1);
    drawPortrait(who, B.x + 8, B.y + 8, 2, t);
    text(speakerName(who), B.x + 48, B.y + 10, { font: 'big', color: C.redD, outline: null });
    if (SPIRITS[who]) text(SPIRITS[who].kind, B.x + 48, B.y + 21, { color: C.greyD, outline: null });
    ty = B.y + 48;
  }
  if (d.cur) {
    const shown = d.cur.text.slice(0, Math.floor(app.dlgT * TYPE_RATE));
    // Wrap the whole line, then show only the typed part, so words don't jump.
    const rows = wrap(d.cur.text, B.w - 14, 'big');
    let left = shown.length;
    rows.forEach((r, i) => {
      const n = Math.max(0, Math.min(r.length, left));
      left -= r.length + 1;
      if (n > 0) text(r.slice(0, n), B.x + 7, ty + i * 10, { font: 'big', color: who === 'STORY' ? C.purple : C.ink, outline: null });
    });
    ty += rows.length * 10 + 4;
  }
  if (d.choice && lineTyped(app)) {
    d.choice.forEach((opt, k) => {
      const y = Math.max(ty + 2, B.y + B.h - 6 - (d.choice.length - k) * 19);
      button(B.x + 6, y, B.w - 12, 16, opt.text.toUpperCase(), C.blueD, () => app.dlgChoose(k), 'choice');
    });
  } else if (lineTyped(app) && Math.floor(t * 2) % 2) {
    text('TAP', B.x + B.w - 22, B.y + B.h - 11, { color: C.greyD, outline: null });
    R(B.x + B.w - 10, B.y + B.h - 10, 5, 1, C.redD); R(B.x + B.w - 9, B.y + B.h - 9, 3, 1, C.redD); R(B.x + B.w - 8, B.y + B.h - 8, 1, 1, C.redD);
  }
  button(130, 18, 46, 14, d.replay ? 'CLOSE' : 'SKIP', C.steelD, () => app.dlgSkip(), 'skip');
  if (!d.replay) text('CHOICES NEVER BLOCK. SKIP ANY TIME.', 90, DLG.y + DLG.h + 10, { align: 'center', color: C.grey });
}

// ---------- story log ----------
function logScreen(app) {
  const st = app.save.story;
  R(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) R(0, y, W, 1, C.night1);
  text('STORY SO FAR', 90, 20, { font: 'big', align: 'center', color: C.gold });
  text('TAP A NIGHT TO READ IT AGAIN', 90, 31, { align: 'center', color: C.grey });
  SCENES.forEach((sc, i) => {
    const y = 42 + i * 44, x = 6, w = 168, h = 40;
    const seen = !!st.seen[sc.id];
    rbox(x, y + 1, w, h, C.ink);
    rbox(x, y, w, h, seen ? C.cream : C.greyDD);
    if (!seen) {
      text(`NIGHT ${sc.level}`, x + 6, y + 8, { color: C.greyD, outline: null });
      text('NOT YET', x + 6, y + 18, { font: 'big', color: C.greyD, outline: null });
      lockIcon(x + w - 16, y + 14, C.greyD);
      return;
    }
    rbox(x + 4, y + 4, 32, 32, C.night1);
    drawPortrait(sc.spirit, x + 4, y + 4, 2, app.time);
    const sp = SPIRITS[sc.spirit];
    text(`NIGHT ${sc.level}: ${sp.name}`, x + 42, y + 6, { color: C.redD, outline: null });
    text(sc.title.toUpperCase(), x + 42, y + 15, { color: C.ink, outline: null });
    const got = st.memories[sc.spirit] || 0;
    text(`MEMORIES ${got}/${sp.memories.length}`, x + 42, y + 26, { color: got ? C.purple : C.greyD, outline: null });
    hit(x, y, w, h, () => app.replayScene(sc.id));
  });
  button(50, 312, 80, 16, 'BACK', C.steelD, () => app.toTitle());
  const flags = Object.keys(st.flags).length;
  text(flags ? `CHOICES MADE: ${flags}` : 'NO CHOICES MADE YET', 90, 336, { align: 'center', color: C.grey });
  drawShiba(90, 382, { t: app.time, react: st.flags.bell_known ? 'wag' : null });
}

// ---------- shop ----------
const UP_ART = { grill4: 'galbi', tray5: 'kimbap', fastfry: 'chicken', patience: 'lantern', wokfast: 'friedrice' };
function shopScreen(app) {
  const s = app.save, t = app.time;
  R(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) R(0, y, W, 1, C.night1);
  for (let x = 0; x < W; x += 10) { const c = (x / 10) % 2 ? C.cream : C.green; R(x, 14, 10, 8, c); R(x + 1, 22, 8, 2, c); }
  text('STALL UPGRADES', 90, 30, { font: 'big', align: 'center', color: C.gold });
  rbox(64, 41, 52, 13, C.ink);
  coinIcon(68, 44);
  text(String(s.wallet), 78, 45, { color: C.yellow });
  UPGRADES.forEach((u, i) => {
    const x = 6, y = 60 + i * 46, w = 168, h = 42;
    const owned = !!s.upgrades[u.id];
    const can = canBuy({ wallet: s.wallet, upgrades: s.upgrades }, u.id);
    rbox(x, y + 1, w, h, C.ink);
    rbox(x, y, w, h, owned ? mix(C.cream, C.greenL, 0.35) : C.cream);
    rbox(x + 4, y + 4, 34, 34, C.night1);
    if (UP_ART[u.id] === 'lantern') drawPortrait('lantern', x + 5, y + 5, 2, t);
    else if (u.id === 'tray5') { // a little tray with five things on it
      rbox(x + 6, y + 20, 30, 12, C.woodL); R(x + 7, y + 21, 28, 10, C.wood);
      ['soda', 'kimbap', 'toast', 'tea', 'galbi'].forEach((id, k) => drawItem(id, x + 3 + k * 5, y + 10 + (k % 2) * 3));
    } else drawItem(UP_ART[u.id], x + 5, y + 5, { scale: 2 });
    text(u.name, x + 43, y + 6, { color: C.ink, outline: null });
    text(u.desc, x + 43, y + 15, { color: C.greyD, outline: null });
    if (owned) text('OWNED', x + 43, y + 28, { color: C.greenD, outline: null });
    else {
      coinIcon(x + 43, y + 27);
      text(String(u.cost), x + 53, y + 28, { color: can ? C.ink : C.redD, outline: null });
      button(x + w - 46, y + 23, 40, 14, 'BUY', can ? C.greenD : C.greyD, can ? () => app.buy(u.id) : () => app.cantBuy(u.id), 'buy');
    }
  });
  const next = app.shopNext;
  const y0 = 60 + UPGRADES.length * 46 + 4;
  text('COINS FROM EVERY NIGHT GO IN YOUR PURSE', 90, y0, { align: 'center', color: C.grey });
  button(30, y0 + 12, 120, 18, next ? `ON TO LEVEL ${next}` : 'DONE', C.blueD, () => app.leaveShop(), 'ui', 'big');
  if (app.shopMsg && app.time - app.shopMsg.at < 1.6) {
    const m = app.shopMsg.text, w = tw(m, 'big') + 12;
    rbox(W / 2 - w / 2, y0 + 36, w, 15, app.shopMsg.good ? C.greenD : C.redD);
    text(m, W / 2, y0 + 40, { font: 'big', align: 'center', color: C.white });
  }
}

// ---------- settings ----------
// Three volume sliders (music, ambience, sound effects), the tap controls
// switch, mute and resume. Only its own tap targets are live while it is open.
export const SET_Y = 54;
export const SLIDER = { x: 24, w: 132 };
export const SLIDER_ROWS = { music: SET_Y + 32, amb: SET_Y + 62, sfx: SET_Y + 92 };
function slider(key, labelStr, v, y) {
  const { x, w } = SLIDER;
  text(labelStr, x, y, { font: 'big', color: C.ink, outline: null });
  text(`${Math.round(v * 100)}%`, x + w, y + 1, { color: C.greyD, outline: null, align: 'right' });
  const ty = y + 14;
  R(x, ty, w, 4, C.greyDD);
  R(x, ty, Math.round(v * w), 4, C.gold);
  const kx = x + Math.round(v * w) - 3;
  rbox(kx, ty - 4, 7, 12, C.redD);
  R(kx + 2, ty - 2, 3, 1, C.redL);
  hit(x - 10, y - 4, w + 20, 29, () => {}, `slider:${key}`);
}
function settingsPanel(app) {
  clearHits();
  dim();
  hit(0, 0, W, H, () => app.closeSettings(), 'backdrop');
  const x = 10, w = 160, h = 214;
  panel(x, SET_Y, w, h);
  hit(x, SET_Y, w, h, () => {}, 'panel'); // taps on the card do not close it
  text('SETTINGS', 90, SET_Y + 8, { font: 'big', align: 'center', color: C.redD, outline: null });
  if (app.g && app.g.phase === 'play' && app.screen === 'game') text('GAME PAUSED', 90, SET_Y + 18, { align: 'center', color: C.greyD, outline: null });
  slider('music', 'MUSIC', app.vol.music, SLIDER_ROWS.music);
  slider('amb', 'AMBIENCE', app.vol.amb, SLIDER_ROWS.amb);
  slider('sfx', 'SOUND EFFECTS', app.vol.sfx, SLIDER_ROWS.sfx);
  const ty = SET_Y + 124;
  R(x + 8, ty - 5, w - 16, 1, C.cream);
  text('TAP CONTROLS', SLIDER.x, ty + 2, { font: 'big', color: C.ink, outline: null });
  toggle(SLIDER.x + SLIDER.w - 24, ty, tapMode(app));
  text(tapMode(app) ? 'TAP A BIN, THEN A STATION' : 'OFF: DRAG FOOD WITH A FINGER', SLIDER.x, ty + 15, { color: C.greyD, outline: null });
  hit(x + 4, ty - 4, w - 8, 28, () => app.toggleTapControls());
  button(SLIDER.x, SET_Y + 156, SLIDER.w, 18, app.muted ? 'SOUND: MUTED' : 'SOUND: ON', app.muted ? C.redD : C.steelD, () => app.toggleMute());
  button(SLIDER.x, SET_Y + 182, SLIDER.w, 18, app.g && app.g.phase === 'play' && app.screen === 'game' ? 'RESUME' : 'DONE', C.greenD, () => app.closeSettings());
}

// ---------- level intro card ----------
function introPreview(app, g) {
  const t = app.time, def = g.def, it = def.intro;
  if (def.kind === 'queue') {
    ['moth', 'crane', 'fox'].forEach((l, i) => drawCustomer(l, 46 + i * 44, 146, { t, scale: 2 }));
    return;
  }
  if (def.kind === 'mix') {
    ['galbi', 'chicken', 'japchae', 'soda'].forEach((id, i) => drawItem(id, 26 + i * 33, 112, { scale: 2 }));
    return;
  }
  if (it.station === 'counter') { drawItem('soda', 30, 112, { scale: 2 }); drawItem('kimbap', 74, 112, { scale: 2 }); drawItem('toast', 118, 112, { scale: 2 }); }
  else if (it.station === 'grill') {
    const p = (Math.sin(t * 0.8) * 0.5 + 0.5) * 1.35;
    drawItem('galbi', 36, 110, { up: p, down: p, scale: 2 }); drawItem('sausage', 92, 110, { up: p * 0.8, down: p * 0.8, scale: 2 });
    for (let x = 26; x < 154; x += 4) R(x, 148, 3, 4, mix(C.redD, C.orange, Math.sin(t * 5 + x) * 0.5 + 0.5));
  } else if (it.station === 'fryer') {
    drawItem('chicken', 40, 110, { p: 1, scale: 2, sauce: 'yangnyeom' }); drawItem('beer', 92, 110, { scale: 2 });
  } else {
    const hop = Math.round(Math.abs(Math.sin(t * 3)) * 8);
    drawItem('tteokbokki', 30, 112, { scale: 2 }); drawItem('japchae', 74, 112 - hop, { scale: 2 }); drawItem('friedrice', 118, 112, { scale: 2, sauce: 'egg' });
    for (let x = 26; x < 154; x += 4) R(x, 148, 3, 4, mix(C.blueD, C.teal, Math.sin(t * 7 + x) * 0.5 + 0.5));
  }
}
function introCard(app) {
  const g = app.g, t = app.time, it = g.def.intro;
  clearHits();
  dim();
  const lines = it[tapMode(app) ? 'tap' : 'drag'];
  const rowsAll = lines.map((l) => wrap(l.toUpperCase(), 136));
  const ph = 132 + rowsAll.reduce((a, r) => a + r.length * 8 + 4, 0) + 26;
  const oy = Math.round((H - ph) / 2) - 70;
  panel(10, 70 + oy, 160, ph);
  text(`LEVEL ${g.level}`, 90, 78 + oy, { align: 'center', color: C.redD, outline: null });
  text(g.def.title.toUpperCase(), 90, 86 + oy, { font: 'big', align: 'center', color: C.ink, outline: null });
  rbox(20, 100 + oy, 140, 70, g.def.rain ? C.night1 : C.woodDD);
  if (g.def.rain) for (let i = 0; i < 18; i++) R(24 + ((i * 37) % 132), 102 + oy + ((i * 23 + Math.floor(t * 60)) % 60), 1, 3, '#5f74b0');
  withOffset(oy, () => introPreview(app, g)); // drawn at its own y, moved with the card
  text(it.heading, 90, 156 + oy, { align: 'center', color: C.gold });
  let y = 178 + oy;
  for (const rows of rowsAll) {
    R(16, y + 1, 3, 3, C.red);
    for (const r of rows) { text(r, 23, y, { color: C.ink, outline: null }); y += 8; }
    y += 4;
  }
  button(40, y + 4, 100, 16, 'TAP TO START', Math.floor(t * 2) % 2 ? C.greenD : C.green, null);
  hit(0, 0, W, H, () => app.startLevel(), 'overlay');
}
function withOffset(dy, fn) {
  const ctx = getCtx();
  ctx.save();
  ctx.translate(0, dy);
  fn();
  ctx.restore();
}

// ---------- end of the night ----------
function endScreen(app) {
  const g = app.g, t = app.time - (app.endAt || 0);
  clearHits();
  dim();
  panel(12, 52, 156, 272);
  const ok = g.stars > 0;
  text(ok ? 'STALL CLOSED!' : 'TOUGH NIGHT...', 90, 62, { font: 'big', align: 'center', color: ok ? C.greenD : C.redD, outline: null });
  text(`LEVEL ${g.level}: ${g.def.title.toUpperCase()}`, 90, 74, { align: 'center', color: C.greyD, outline: null });
  for (let i = 0; i < 3; i++) {
    const shown = t > 0.4 + i * 0.35;
    const pop = shown && t < 0.55 + i * 0.35 ? -3 : 0;
    starIcon(26 + i * 44, 88 + (i === 1 ? -4 : 0) + pop, shown && i < g.stars, 4);
  }
  const tips = g.results.reduce((s, r) => s + (r.tip || 0), 0);
  const mixups = g.results.filter((r) => !r.walked && r.mood !== 'happy').length;
  const rows = [
    ['COINS', `${g.coins} / ${g.max}`],
    ['SERVED', `${g.served - mixups} HAPPY`],
    ['MIX-UPS', String(mixups)],
    ['WALKED OUT', String(g.lost)],
    ['TIPS', String(tips)],
    ['PURSE', `+${app.lastPay || 0} = ${app.save.wallet}`],
  ];
  rows.forEach(([a, b], i) => {
    const y = 136 + i * 11;
    text(a, 26, y, { color: C.ink, outline: null });
    text(b, 154, y, { color: C.ink, outline: null, align: 'right' });
    R(26, y + 8, 128, 1, C.cream);
  });
  const mem = [...(app.nightMemories || [])];
  if (mem.length) {
    text('NEW MEMORIES', 90, 205, { align: 'center', color: C.purple, outline: null });
    text(mem.map((id) => SPIRITS[id].name).join(', '), 90, 213, { align: 'center', color: C.ink, outline: null });
  }
  drawShiba(90, 270, { big: true, scale: 3, mood: ok ? 'happy' : 'wait', t: app.time });
  const next = levelDef(g.level + 1);
  const shopNext = ok && g.level >= SHOP_FROM_LEVEL;
  button(22, 280, 64, 18, 'RETRY', C.blueD, () => app.newLevel(g.level));
  if (ok && next) button(94, 280, 64, 18, shopNext ? 'SHOP' : 'NEXT', C.greenD, () => app.endNext());
  else if (shopNext) button(94, 280, 64, 18, 'SHOP', C.greenD, () => app.openShop(null));
  else button(94, 280, 64, 18, 'MENU', ok ? C.greenD : C.steelD, () => app.toTitle());
  let note = 'NEED 1 STAR TO OPEN THE NEXT LEVEL';
  if (ok && next && shopNext) note = `UPGRADES, THEN LEVEL ${next.n}`;
  else if (ok && next) note = next.kind === 'station' ? `NEXT UP: THE ${STATIONS[next.stations[next.stations.length - 1]].name.toUpperCase()}` : next.kind === 'mix' ? 'NEXT UP: EVERY STATION AT ONCE' : 'NEXT UP: A LONG LINE';
  else if (ok) note = 'MORE NIGHTS COMING IN PART 2';
  text(note, 90, 304, { align: 'center', color: ok ? C.redD : C.greyD, outline: null });
}

// ---------- cast sheet (debug: ?shot=cast) ----------
function castScreen(app) {
  R(0, 0, W, H, C.night2);
  const t = app.time;
  const cast = [...SPIRIT_IDS, 'shiba', 0, 3];
  cast.forEach((look, i) => {
    const cx = 46 + (i % 2) * 88, y = 70 + Math.floor(i / 2) * 64;
    R(cx - 40, y - 52, 80, 62, i % 4 === 0 || i % 4 === 3 ? C.night1 : C.night3);
    drawCustomer(look, cx, y, { t, scale: 3 });
    const name = SPIRITS[look] ? SPIRITS[look].name : look === 'shiba' ? 'CHIMAEK' : 'PERSON';
    text(name, cx, y + 1, { align: 'center', color: C.gold });
  });
}

// ---------- frame ----------
export function drawFrame(app) {
  const reg = resetRegistry();
  if (app.screen === 'title') { titleScreen(app); hud(app); }
  else if (app.screen === 'scene') { sceneScreen(app); hud(app); }
  else if (app.screen === 'log') { logScreen(app); hud(app); }
  else if (app.screen === 'shop') { shopScreen(app); hud(app); }
  else if (app.screen === 'cast') castScreen(app);
  else if (app.g) {
    drawGame(app, reg);
    if (app.g.phase === 'intro') { introCard(app); hud(app); }
    if (app.g.phase === 'end') { endScreen(app); hud(app); }
    drawParts(app.fx, 'top');
  }
  if (app.settings) settingsPanel(app);
  return reg;
}
