// Draws every screen into the low-res buffer and records tap targets ("hits").
import { W, H, C, R, box, rbox, text, tw, mix, getCtx } from './gfx.js';
import { ITEMS, SAUCES, COOK, STATIONS, LEVELS, TRAY_MAX } from './data.js';
import { grillState, fryState, scoreServe, canSauce, isUnlocked } from './logic.js';
import {
  drawItem, drawSauce, coinIcon, lockIcon, speakerIcon, gearIcon, starIcon, heartIcon, drawCustomer, drawShiba,
} from './sprites.js';
import { drawParts, drawFloats, bounceAmt } from './fx.js';
import * as G from './game.js';

export const SCENE_H = 158; // top part: market + customer
export const TABS_Y = 158;
export const PANEL_Y = 172;
export const PANEL_H = 146;
export const TRAY_Y = 318;
const COUNTER_Y = 140;

let hits = [];
function hit(x, y, w, h, fn, tag = 'ui') { hits.push({ x, y, w, h, fn, tag }); }

// ---------- market scene ----------
const STARS = Array.from({ length: 26 }, (_, i) => [(i * 67 + 13) % W, 30 + ((i * 37) % 50), i]);
const STALLS = [
  { x: -6, w: 34, h: 36, c: '#7a3a5a' }, { x: 30, w: 30, h: 28, c: '#3a5a7a' }, { x: 62, w: 38, h: 40, c: '#7a5a2a' },
  { x: 102, w: 30, h: 30, c: '#4a6a4a' }, { x: 134, w: 52, h: 38, c: '#6a3a3a' },
];
const BULBS = [C.gold, C.red, C.teal, C.yellow, C.pink];

function strand(t, y0, sag, phase) {
  for (let x = -2; x < W + 2; x += 1) {
    const k = (x - W / 2) / (W / 2);
    const y = y0 + sag * (1 - k * k);
    R(x, y, 1, 1, '#120c18');
    if ((x + phase) % 9 === 0) {
      const i = Math.floor((x + phase) / 9);
      const on = Math.sin(t * 2 + i * 1.7) > -0.6;
      const c = BULBS[i % BULBS.length];
      R(x - 1, y + 1, 3, 3, on ? mix(c, C.night2, 0.55) : C.night2);
      R(x, y + 1, 1, 3, on ? c : C.greyD);
      R(x - 1, y + 2, 3, 1, on ? c : C.greyD);
    }
  }
}
function lantern(x, y, t) {
  const sw = Math.round(Math.sin(t * 1.5 + x) * 1);
  x += sw;
  R(x + 3, y - 4, 1, 4, C.ink);
  R(x - 2, y - 1, 11, 14, mix(C.red, C.night2, 0.7)); // glow
  R(x, y, 7, 11, C.ink);
  R(x - 1, y + 2, 9, 7, C.ink);
  R(x, y + 1, 7, 9, C.red);
  R(x - 1 + 1, y + 3, 7, 1, C.gold); R(x, y + 7, 7, 1, C.gold);
  R(x + 2, y + 2, 1, 6, C.redL);
  R(x + 2, y + 11, 3, 2, C.gold);
}

export function drawMarket(t) {
  // sky
  R(0, 0, W, SCENE_H, C.night0);
  const bands = [[44, C.night1], [70, C.night2], [96, C.night3]];
  for (const [y, c] of bands) {
    R(0, y, W, SCENE_H - y, c);
    for (let x = 0; x < W; x += 2) R(x + ((y / 2) % 2), y - 1, 1, 1, c); // dither edge
  }
  for (const [x, y, i] of STARS) if (Math.sin(t * 1.3 + i * 2.1) > -0.3) R(x, y, 1, 1, i % 4 ? C.grey : C.white);
  // moon
  R(18, 32, 9, 9, C.night1); R(19, 31, 7, 11, C.night1);
  R(19, 33, 7, 7, C.cream); R(20, 32, 5, 9, C.cream); R(22, 34, 2, 2, mix(C.cream, C.grey, 0.4));
  // far stalls
  for (const s of STALLS) {
    const top = 126 - s.h;
    R(s.x, top + 8, s.w, s.h - 8, mix(s.c, C.night0, 0.55));
    for (let i = 0; i < s.w; i += 6) R(s.x + i, top, 3, 9, mix(s.c, C.night0, 0.25));
    for (let i = 3; i < s.w; i += 6) R(s.x + i, top, 3, 9, mix(C.cream, C.night0, 0.5));
    R(s.x + 3, top + 12, s.w - 6, 3, mix(C.gold, C.night0, 0.25)); // lit counter
    R(s.x + s.w / 2 - 6, top + 2, 12, 5, C.ink);
  }
  // crowd silhouettes
  for (let i = 0; i < 14; i++) {
    const x = (i * 29 + 7) % (W + 10) - 5;
    const bob = Math.round(Math.sin(t * 2 + i) * 0.7);
    const y = 110 + (i % 3) * 4 + bob;
    R(x, y, 7, 7, '#1c1530'); R(x - 2, y + 7, 11, 12, '#1c1530');
  }
  R(0, 126, W, 16, '#231a30');
  for (let x = 0; x < W; x += 12) R(x, 131, 8, 1, '#2d2240');
  strand(t, 30, 16, 0);
  lantern(40, 50, t); lantern(120, 52, t);
  strand(t, 22, 8, 4);
}

function awningAndCounter(t) {
  // awning
  for (let x = 0; x < W; x += 10) {
    const c = (x / 10) % 2 ? C.cream : C.red;
    R(x, 14, 10, 10, c);
    R(x + 1, 24, 8, 2, c); R(x + 2, 26, 6, 1, c);
    R(x, 24, 1, 2, C.ink);
  }
  R(0, 14, W, 1, C.ink);
  // posts
  R(0, 14, 5, COUNTER_Y - 14, C.woodD); R(1, 14, 1, COUNTER_Y - 14, C.wood);
  R(W - 5, 14, 5, COUNTER_Y - 14, C.woodD); R(W - 4, 14, 1, COUNTER_Y - 14, C.wood);
  // counter
  R(0, COUNTER_Y, W, 6, C.woodL);
  R(0, COUNTER_Y, W, 1, C.cream);
  R(0, COUNTER_Y + 6, W, SCENE_H - COUNTER_Y - 6, C.wood);
  for (let x = 8; x < W; x += 22) R(x, COUNTER_Y + 7, 1, SCENE_H - COUNTER_Y - 7, C.woodD);
  R(0, SCENE_H - 1, W, 1, C.ink);
  // menu sign on the counter
  rbox(132, COUNTER_Y - 9, 32, 10, C.ink, C.ink);
  text('CHIMAEK', 148, COUNTER_Y - 7, { color: C.gold, align: 'center', outline: null });
  // the stall dog
  drawShiba(20, COUNTER_Y + 2, { t });
}

// ---------- customer + order bubble ----------
function customerX(c) {
  const home = 52;
  if (!c) return -100;
  if (c.phase === 'enter') { const k = Math.min(1, c.t / 0.8); return -30 + (home + 30) * (1 - Math.pow(1 - k, 3)); }
  if (c.phase === 'leave') { const k = Math.max(0, (c.t - 0.45) / 0.55); return home + (W + 40 - home) * k * k; }
  return home;
}

function orderBubble(g, c, t) {
  const lines = c.order.lines;
  const x = 90, y = 30, w = 86;
  const h = 8 + lines.length * 18 + 10;
  rbox(x, y, w, h, C.white);
  // tail
  R(x - 5, y + 30, 6, 3, C.ink); R(x - 3, y + 31, 4, 1, C.white); R(x - 1, y + 29, 2, 5, C.white); R(x - 1, y + 28, 1, 1, C.ink);
  const ready = scoreServe(c.order, g.tray, 1).lines;
  lines.forEach((l, i) => {
    const ly = y + 4 + i * 18;
    drawItem(l.item, x + 3, ly, { cook: 'done', sauce: l.sauce });
    const name = ITEMS[l.item].short;
    text(name, x + 22, ly + (l.sauce ? 1 : 5), { color: C.ink, outline: null });
    if (l.sauce) text(`+${SAUCES[l.sauce].short}`, x + 22, ly + 9, { color: l.sauce === 'honey' ? C.orange : l.sauce === 'soygarlic' ? C.woodD : C.red, outline: null });
    if (ready[i].status === 'ok') { // tick: it's on the tray
      R(x + w - 10, ly + 6, 8, 7, C.greenD);
      R(x + w - 8, ly + 9, 1, 1, C.white); R(x + w - 7, ly + 10, 1, 1, C.white); R(x + w - 6, ly + 9, 1, 1, C.white); R(x + w - 5, ly + 8, 1, 1, C.white);
    }
  });
  // patience
  const k = c.patience / c.maxPatience;
  const by = y + h - 9;
  heartIcon(x + 4, by, k > 0.3 ? C.red : (Math.floor(t * 6) % 2 ? C.red : C.redD));
  R(x + 14, by, w - 18, 6, C.ink);
  const col = k > 0.6 ? C.green : k > 0.3 ? C.gold : C.red;
  R(x + 15, by + 1, Math.max(0, Math.round((w - 20) * k)), 4, col);
  R(x + 15, by + 1, Math.max(0, Math.round((w - 20) * k)), 1, mix(col, C.white, 0.4));
}

function reactionBubble(c, cx) {
  const r = c.result;
  const msg = c.mood === 'happy' ? (r && r.perfects ? 'PERFECT!' : 'YUM!') : c.mood === 'meh' ? 'HMM...' : r ? 'WRONG!' : 'TOO SLOW!';
  const w = tw(msg, 'big') + 10;
  const x = Math.round(Math.min(W - w - 4, Math.max(4, cx - w / 2))), y = 40;
  rbox(x, y, w, 14, c.mood === 'happy' ? C.white : c.mood === 'meh' ? C.cream : C.redL);
  text(msg, x + w / 2, y + 4, { font: 'big', color: C.ink, outline: null, align: 'center' });
}

function drawCustomerArea(g, t) {
  const c = g.customer;
  if (!c) return;
  const cx = Math.round(customerX(c));
  drawCustomer(c.order.look, cx, COUNTER_Y + 2, { mood: c.phase === 'leave' ? c.mood : 'wait', t, low: c.patience / c.maxPatience < 0.3 });
  if (c.phase === 'wait') {
    orderBubble(g, c, t);
    hit(cx - 20, 60, 40, 80, () => G.serve(g), 'customer');
  } else if (c.phase === 'leave' && c.t < 0.9) reactionBubble(c, cx);
}

// ---------- HUD ----------
function hud(app) {
  const g = app.g;
  R(0, 0, W, 14, C.ink);
  if (g) {
    text(`LV ${g.level}`, 4, 4, { color: C.gold });
    coinIcon(46, 3);
    text(String(app.shownCoins ?? g.coins), 56, 4, { font: 'big', color: C.yellow });
    const n = Math.min(g.custIdx + 1, g.orders.length);
    text(`GUEST ${Math.max(1, n)}/${g.orders.length}`, 96, 4, { color: C.cream });
    // home button
    R(138, 4, 7, 1, C.grey); R(138, 6, 7, 1, C.grey); R(138, 8, 7, 1, C.grey);
    hit(134, 0, 14, 14, () => app.toTitle());
  } else text('CHIMAEK NIGHT MARKET', 4, 4, { color: C.gold });
  gearIcon(151, 3);
  hit(148, 0, 14, 14, () => app.openSettings(), 'settings');
  speakerIcon(166, 2, app.muted);
  hit(162, 0, 18, 14, () => app.toggleMute());
}

// ---------- station tabs ----------
function tabs(app) {
  const g = app.g;
  R(0, TABS_Y, W, 14, C.woodDD);
  const n = g.stations.length;
  const tw0 = W / n;
  g.stations.forEach((s, i) => {
    const x = Math.round(i * tw0), w = Math.round((i + 1) * tw0) - x;
    const cur = i === g.station;
    if (cur) { R(x + 1, TABS_Y + 1, w - 2, 13, C.cream); R(x + 1, TABS_Y + 13, w - 2, 1, C.cream); }
    else R(x + 1, TABS_Y + 2, w - 2, 10, mix(C.woodDD, C.ink, 0.3));
    const label = STATIONS[s.id].name.toUpperCase();
    const col = cur ? C.ink : s.status === 'open' ? C.cream : C.greyD;
    if (s.status !== 'open') {
      lockIcon(x + 3, TABS_Y + 2, cur ? C.greyD : C.greyDD);
      text(label, x + 14, TABS_Y + 5, { color: col, outline: cur ? null : C.ink });
    } else text(label, x + w / 2, TABS_Y + 5, { color: col, align: 'center', outline: cur ? null : C.ink });
    hit(x, TABS_Y, w, 14, () => app.goStation(i), 'tab');
  });
}

// ---------- station panels ----------
function panelBg(ox) {
  R(ox, PANEL_Y, W, PANEL_H, C.woodDD);
  for (let y = PANEL_Y + 10; y < PANEL_Y + PANEL_H; y += 12) R(ox, y, W, 1, mix(C.woodDD, C.ink, 0.4));
  R(ox, PANEL_Y, W, 2, mix(C.woodDD, C.gold, 0.25));
}
function label(str, x, y, color = C.cream) { text(str, x, y, { color, align: 'center' }); }
function button(x, y, w, h, str, fill, onTap, tag) {
  rbox(x, y + 1, w, h, C.ink);
  rbox(x, y, w, h, fill);
  R(x + 2, y + 1, w - 4, 1, mix(fill, C.white, 0.35));
  text(str, x + w / 2, y + Math.floor((h - 5) / 2), { align: 'center', color: C.white });
  if (onTap) hit(x, y, w, h + 1, onTap, tag);
}

function meter(x, y, w, h, p, spec, active) {
  const span = spec.max;
  const px = (v) => x + Math.round((v / span) * w);
  R(x - 1, y - 1, w + 2, h + 2, C.ink);
  R(x, y, w, h, C.greyD);
  R(px(spec.done), y, px(spec.burnt) - px(spec.done), h, C.greenD);
  R(px(spec.perfectLo), y, px(spec.perfectHi) - px(spec.perfectLo), h, C.gold);
  R(px(spec.burnt), y, x + w - px(spec.burnt), h, C.redD);
  if (!active) for (let i = 0; i < w; i += 2) R(x + i, y, 1, h, C.ink);
  const m = Math.min(x + w - 1, px(p));
  R(m - 1, y - 2, 3, h + 4, C.ink);
  R(m, y - 1, 1, h + 2, C.white);
}

function counterPanel(app, ox, live) {
  const g = app.g;
  panelBg(ox);
  // cooler
  const cx = ox + 4, cy = PANEL_Y + 4;
  rbox(cx, cy, 84, 140, '#2a6f9e');
  R(cx + 3, cy + 3, 78, 134, '#173a5a');
  R(cx + 3, cy + 3, 78, 2, C.teal);
  text('COOLER', cx + 42, cy + 7, { color: C.teal, align: 'center' });
  const rows = ['soda', 'tea', 'beer'];
  rows.forEach((id, i) => {
    const ry = cy + 16 + i * 40;
    R(cx + 5, ry + 36, 74, 2, C.steelD);
    const locked = ITEMS[id].unlock > g.level;
    const b = bounceAmt(app.fx, `ready:${id}`);
    if (locked) {
      lockIcon(cx + 18, ry + 14, C.greyD);
      text(ITEMS[id].short, cx + 34, ry + 11, { color: C.greyD });
      text(`LEVEL ${ITEMS[id].unlock}`, cx + 34, ry + 20, { color: C.greyD });
      return;
    }
    drawItem(id, cx + 6, ry + 3 - b, { scale: 2 });
    text(ITEMS[id].short, cx + 42, ry + 10, { color: C.white });
    coinIcon(cx + 42, ry + 19); text(String(ITEMS[id].price), cx + 51, ry + 20, { color: C.yellow });
    if (live) hit(cx + 3, ry, 78, 38, () => G.grabReady(g, id), `ready:${id}`);
  });
  // food shelf
  const sx = ox + 92;
  ['kimbap', 'toast'].forEach((id, i) => {
    const sy = PANEL_Y + 4 + i * 71;
    rbox(sx, sy, 84, 66, C.wood);
    R(sx + 3, sy + 3, 78, 60, mix(C.wood, C.ink, 0.25));
    const b = bounceAmt(app.fx, `ready:${id}`);
    R(sx + 14, sy + 44, 56, 4, C.ink); R(sx + 15, sy + 44, 54, 3, C.cream); // plate
    drawItem(id, sx + 26, sy + 10 - b, { scale: 2 });
    text(ITEMS[id].short, sx + 42, sy + 52, { color: C.white, align: 'center' });
    coinIcon(sx + 66, sy + 51); text(String(ITEMS[id].price), sx + 75, sy + 52, { color: C.yellow });
    if (live) hit(sx, sy, 84, 66, () => G.grabReady(g, id), `ready:${id}`);
  });
}

function bin(x, y, w, item, labelStr, opts, onTap, key, app) {
  rbox(x, y, w, 34, C.steel);
  R(x + 2, y + 2, w - 4, 30, C.steelD);
  const b = key ? bounceAmt(app.fx, key) : 0;
  drawItem(item, x + Math.floor(w / 2) - 16, y + 1 - b, { ...opts, scale: 2 });
  label(labelStr, x + w / 2, y + 36);
  if (onTap) hit(x, y, w, 42, onTap, key);
}
function sauceShelf(app, ox, ids, live) {
  const g = app.g;
  ids.forEach((id, i) => {
    const bx = ox + 100 + i * 40;
    const held = g.held === id;
    if (held) R(bx, PANEL_Y + 1, 40, 42, mix(C.gold, C.woodDD, 0.5));
    drawSauce(id, bx + 4, PANEL_Y + 2, held, 2);
    const words = SAUCES[id].short.split(' ');
    label(words.join(' '), bx + 20, PANEL_Y + 36, held ? C.yellow : C.cream);
    if (live) hit(bx, PANEL_Y + 1, 40, 44, () => G.pickSauce(g, id), `sauce:${id}`);
  });
}

function grillPanel(app, ox, live) {
  const g = app.g, t = app.time;
  panelBg(ox);
  bin(ox + 4, PANEL_Y + 2, 44, 'galbi', 'GALBI', { p: 0 }, live && (() => G.grillAdd(g, 'galbi')), 'bin:galbi', app);
  bin(ox + 52, PANEL_Y + 2, 44, 'sausage', 'SAUSAGE', { p: 0 }, live && (() => G.grillAdd(g, 'sausage')), 'bin:sausage', app);
  sauceShelf(app, ox, ['spicy', 'honey'], live);
  // grill body
  const gy = PANEL_Y + 46;
  rbox(ox + 3, gy, 174, 98, C.steelD);
  R(ox + 6, gy + 3, 168, 92, '#1e1820');
  // coals
  for (let x = 8; x < 172; x += 4) {
    const f = Math.sin(t * 5 + x * 0.7) * 0.5 + 0.5;
    R(ox + x, gy + 86, 3, 8, mix(C.redD, C.orange, f * 0.8));
    R(ox + x + 1, gy + 86, 1, 2, mix(C.orange, C.yellow, f));
  }
  for (let y = gy + 8; y < gy + 44; y += 7) R(ox + 6, y, 168, 1, C.steelD);
  g.grill.forEach((it, i) => {
    const sx = ox + 6 + i * 56;
    if (i > 0) R(sx - 1, gy + 4, 1, 82, mix(C.steelD, C.ink, 0.5));
    if (!it) {
      text('EMPTY', sx + 28, gy + 22, { color: C.greyDD, outline: null, align: 'center' });
      return;
    }
    const st = grillState(it);
    const flipAge = it.flipT != null ? g.time - it.flipT : 9;
    const hop = flipAge < 0.25 ? -Math.round(Math.sin((flipAge / 0.25) * Math.PI) * 6) : 0;
    const up = it.sides[1 - it.down], down = it.sides[it.down];
    drawItem(it.item, sx + 12, gy + 5 + hop - bounceAmt(app.fx, `grill:${i}`), { up, down, scale: 2 });
    meter(sx + 10, gy + 44, 40, 3, it.sides[0], COOK.grill, it.down === 0);
    meter(sx + 10, gy + 51, 40, 3, it.sides[1], COOK.grill, it.down === 1);
    // which side is on the heat
    const ay = gy + 44 + it.down * 7;
    R(sx + 4, ay - 1, 3, 5, C.orange); R(sx + 5, ay, 1, 3, C.yellow);
    const takeCol = st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD;
    button(sx + 5, gy + 58, 46, 12, 'FLIP', C.blueD, live && (() => G.grillFlip(g, i)), `flip:${i}`);
    button(sx + 5, gy + 72, 46, 12, st === 'burnt' ? 'TOSS' : 'TAKE', takeCol, live && (() => G.grillTake(g, i)), `take:${i}`);
    if (live) hit(sx + 6, gy + 4, 44, 36, () => G.grillFlip(g, i), `flip:${i}`);
  });
}

function fryerPanel(app, ox, live) {
  const g = app.g, t = app.time;
  panelBg(ox);
  bin(ox + 4, PANEL_Y + 2, 44, 'chicken', 'CHICKEN', { raw: true }, live && (() => G.fryAdd(g)), 'bin:chicken', app);
  // batter bowl
  const bx = ox + 46, by = PANEL_Y + 10;
  R(bx + 2, by + 8, 50, 16, C.ink); R(bx + 4, by + 22, 46, 3, C.ink);
  R(bx + 3, by + 9, 48, 13, C.cream); R(bx + 5, by + 9, 44, 3, C.white);
  R(bx + 3, by + 15, 48, 7, '#d8e0f0'); R(bx + 4, by + 16, 3, 4, C.white);
  const bowl = g.fryer.bowl;
  if (bowl) {
    const dip = bowl.dipping > 0 ? Math.round(Math.sin((1 - bowl.dipping / 0.45) * Math.PI) * 6) : 0;
    drawItem('chicken', bx + 11, by - 12 + dip, { raw: !bowl.battered, p: 0, scale: 2 });
    R(bx + 3, by + 15, 48, 7, '#d8e0f0'); // bowl front over the chicken
    R(bx + 4, by + 16, 3, 4, C.white);
    const msg = bowl.dipping > 0 ? 'DIPPING' : bowl.battered ? 'TAP: BASKET' : 'TAP TO DIP';
    label(msg, bx + 27, by + 26, Math.floor(t * 3) % 2 && !bowl.dipping ? C.yellow : C.cream);
  } else label('BATTER', bx + 27, by + 26);
  if (live) hit(bx, by, 54, 32, () => G.fryDip(g), 'bowl');
  sauceShelf(app, ox, ['yangnyeom', 'soygarlic'], live);
  // fryer
  const fy = PANEL_Y + 46;
  rbox(ox + 3, fy, 174, 98, C.steel);
  R(ox + 6, fy + 3, 168, 92, C.steelD);
  R(ox + 9, fy + 14, 162, 62, C.oilD);
  for (let y = fy + 14; y < fy + 76; y += 2) R(ox + 9, y, 162, 1, mix(C.oil, C.oilD, (y - fy - 14) / 70));
  for (let x = 0; x < 162; x += 3) R(ox + 9 + x, fy + 14 + Math.round(Math.sin(t * 3 + x * 0.3)), 2, 1, mix(C.oil, C.yellow, 0.4));
  g.fryer.baskets.forEach((it, i) => {
    const x0 = ox + 8 + i * 84;
    const lift = bounceAmt(app.fx, `fry:${i}`);
    // basket: wire mesh + handle
    R(x0 + 12, fy + 6, 56, 1, C.grey); R(x0 + 38, fy - 2, 4, 8, C.ink); R(x0 + 39, fy - 1, 2, 7, C.woodD);
    for (let x = x0 + 12; x <= x0 + 68; x += 6) R(x, fy + 6, 1, 40, mix(C.grey, C.oilD, 0.5));
    for (let y = fy + 12; y < fy + 46; y += 6) R(x0 + 12, y, 57, 1, mix(C.grey, C.oilD, 0.5));
    if (!it) { text('EMPTY', x0 + 40, fy + 26, { color: C.cream, outline: C.oilD, align: 'center' }); return; }
    drawItem('chicken', x0 + 24, fy + 12 - lift, { p: it.p, scale: 2 });
    meter(x0 + 8, fy + 52, 64, 4, it.p, COOK.fry, true);
    const st = fryState(it);
    button(x0 + 15, fy + 62, 50, 13, st === 'burnt' ? 'TOSS' : 'LIFT', st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD, live && (() => G.fryLift(g, i)), `lift:${i}`);
    if (live) hit(x0 + 12, fy + 4, 56, 44, () => G.fryLift(g, i), `lift:${i}`);
  });
  label('GOLD = PERFECT', ox + 90, fy + 86, C.cream);
}

function lockedPanel(app, ox, s) {
  R(ox, PANEL_Y, W, PANEL_H, '#191424');
  for (let y = PANEL_Y; y < PANEL_Y + PANEL_H; y += 4) R(ox, y, W, 1, '#1e1830');
  const cx = ox + W / 2;
  // big lock
  R(cx - 9, PANEL_Y + 26, 18, 16, C.ink); R(cx - 8, PANEL_Y + 27, 16, 14, C.greyD); R(cx - 5, PANEL_Y + 30, 10, 12, C.ink); R(cx - 4, PANEL_Y + 31, 8, 11, '#191424');
  R(cx - 14, PANEL_Y + 40, 28, 24, C.ink); R(cx - 12, PANEL_Y + 42, 24, 20, C.greyD); R(cx - 1, PANEL_Y + 47, 3, 8, C.ink);
  text(STATIONS[s.id].name.toUpperCase(), cx, PANEL_Y + 74, { font: 'big', align: 'center', color: C.cream });
  const msg = s.status === 'soon' ? 'COMING SOON' : `UNLOCKS IN LEVEL ${STATIONS[s.id].unlock}`;
  text(msg, cx, PANEL_Y + 88, { align: 'center', color: C.gold });
  if (s.id === 'wok') text('TOSS NOODLES WITH SWIPES', cx, PANEL_Y + 100, { align: 'center', color: C.greyD });
}

function drawPanel(app, idx, ox, live) {
  const s = app.g.stations[idx];
  if (s.status !== 'open') lockedPanel(app, ox, s);
  else if (s.id === 'counter') counterPanel(app, ox, live);
  else if (s.id === 'grill') grillPanel(app, ox, live);
  else if (s.id === 'fryer') fryerPanel(app, ox, live);
  drawParts(app.fx, s.id, ox);
}

// ---------- tray ----------
function tray(app) {
  const g = app.g, t = app.time;
  R(0, TRAY_Y, W, H - TRAY_Y, C.woodD);
  R(0, TRAY_Y, W, 1, C.ink);
  rbox(3, TRAY_Y + 4, 132, 40, C.woodL);
  R(5, TRAY_Y + 6, 128, 36, C.wood);
  text('TRAY', 6, TRAY_Y + 46, { color: C.woodL });
  for (let i = 0; i < TRAY_MAX; i++) {
    const x = 5 + i * 32, y = TRAY_Y + 6;
    const it = g.tray[i];
    R(x + 2, y + 30, 28, 2, mix(C.wood, C.ink, 0.3));
    if (!it) continue;
    const fits = g.held && canSauce(it, g.held);
    if (fits && Math.floor(t * 5) % 2) { R(x, y, 32, 36, C.yellow); R(x + 1, y + 1, 30, 34, C.wood); }
    const b = bounceAmt(app.fx, `tray:${i}`);
    drawItem(it.item, x, y + 2 - b, { cook: it.cook, sauce: it.sauce, scale: 2 });
    if (it.cook === 'raw') text('RAW', x + 16, y + 28, { color: C.pink, align: 'center' });
    if (it.cook === 'burnt') text('BURNT', x + 16, y + 28, { color: C.red, align: 'center' });
    hit(x, y, 32, 36, () => G.tapTray(g, i), 'tray');
    // trash badge
    R(x + 24, y - 2, 9, 9, C.ink); R(x + 25, y - 1, 7, 7, C.redD);
    for (let k = 0; k < 5; k++) { R(x + 26 + k, y + k, 1, 1, C.white); R(x + 30 - k, y + k, 1, 1, C.white); }
    hit(x + 22, y - 4, 13, 12, () => G.trashTray(g, i), 'trash');
  }
  const c = g.customer;
  const can = c && c.phase === 'wait' && g.tray.length > 0;
  const pulse = can && Math.floor(t * 3) % 2 ? 1 : 0;
  rbox(139, TRAY_Y + 5, 38, 38, C.ink);
  rbox(139, TRAY_Y + 4 - pulse, 38, 38, can ? C.green : C.greyD);
  R(141, TRAY_Y + 5 - pulse, 34, 2, mix(can ? C.green : C.greyD, C.white, 0.35));
  text('SERVE', 158, TRAY_Y + 20 - pulse, { font: 'small', color: C.white, align: 'center', scale: 1 });
  R(150, TRAY_Y + 29 - pulse, 16, 2, C.white); R(156, TRAY_Y + 27 - pulse, 4, 6, C.white); // tray glyph
  hit(137, TRAY_Y + 2, 42, 44, () => G.serve(g), 'serve');
  // hint line
  text(hintFor(app), W / 2, TRAY_Y + 56, { align: 'center', color: app.g.held ? C.yellow : C.cream });
  const tip = subHint(app);
  if (tip) text(tip, W / 2, TRAY_Y + 64, { align: 'center', color: C.grey });
}
function hintFor(app) {
  const g = app.g, s = G.currentStation(g);
  if (g.held) return 'TAP FOOD ON THE TRAY TO SAUCE IT';
  const c = g.customer;
  if (c && c.phase === 'wait' && g.tray.length && scoreServe(c.order, g.tray, 1).mood === 'happy') return 'ORDER READY: TAP SERVE!';
  if (s.status !== 'open') return 'SWIPE TO GO BACK';
  if (s.id === 'counter') return 'TAP DRINKS AND FOOD TO TAKE THEM';
  if (s.id === 'grill') return 'COOK BOTH SIDES: FLIP, THEN TAKE';
  return 'BATTER, FRY, LIFT IN THE GOLD';
}
function subHint(app) {
  const g = app.g;
  const open = g.stations.filter((s) => s.status === 'open').length;
  if (open > 1) return '< SWIPE TO SWITCH STATIONS >';
  return 'X ON A TRAY ITEM THROWS IT OUT';
}

// ---------- overlays ----------
function dim() {
  R(0, 0, W, H, 'rgba(13, 10, 26, 0.72)');
}
function panel(x, y, w, h) {
  rbox(x, y + 2, w, h, C.ink);
  rbox(x, y, w, h, C.cream);
  R(x + 2, y + 2, w - 4, h - 4, C.white);
}

// Settings / pause panel: music and sound-effect volume sliders, mute, done.
// Only its own tap targets are live while it is open.
export const SLIDER = { x: 28, w: 124 };
const SET_Y = 92;
export const SLIDER_ROWS = { music: SET_Y + 36, sfx: SET_Y + 72 };
function slider(key, labelStr, v, y) {
  const { x, w } = SLIDER;
  text(labelStr, x, y, { font: 'big', color: C.ink, outline: null });
  text(`${Math.round(v * 100)}%`, x + w, y + 1, { color: C.greyD, outline: null, align: 'right' });
  const ty = y + 15;
  R(x, ty, w, 4, C.greyDD);
  R(x, ty, Math.round(v * w), 4, C.gold);
  const kx = x + Math.round(v * w) - 3;
  rbox(kx, ty - 4, 7, 12, C.redD);
  R(kx + 2, ty - 2, 3, 1, C.redL);
  hit(x - 10, y - 4, w + 20, 30, () => {}, `slider:${key}`);
}
function settingsPanel(app) {
  hits = [];
  dim();
  hit(0, 0, W, H, () => app.closeSettings(), 'backdrop');
  const x = 14, w = 152, h = 170;
  panel(x, SET_Y, w, h);
  text('SETTINGS', 90, SET_Y + 9, { font: 'big', align: 'center', color: C.redD, outline: null });
  if (app.g && app.g.phase === 'play') text('GAME PAUSED', 90, SET_Y + 20, { align: 'center', color: C.greyD, outline: null });
  slider('music', 'MUSIC', app.vol.music, SLIDER_ROWS.music);
  slider('sfx', 'SOUND EFFECTS', app.vol.sfx, SLIDER_ROWS.sfx);
  const by = SET_Y + 112;
  button(28, by, 124, 18, app.muted ? 'SOUND: MUTED' : 'SOUND: ON', app.muted ? C.redD : C.steelD, () => app.toggleMute());
  button(28, by + 26, 124, 18, app.g && app.g.phase === 'play' ? 'RESUME' : 'DONE', C.greenD, () => app.closeSettings());
}

function wrap(str, maxW) {
  const rows = [];
  let cur = '';
  for (const w of str.split(' ')) { const n = cur ? `${cur} ${w}` : w; if (tw(n) > maxW) { rows.push(cur); cur = w; } else cur = n; }
  rows.push(cur);
  return rows;
}
// Shifts drawing down by dy (used to centre the intro card).
function ctxShift(dy) { getCtx().setTransform(1, 0, 0, 1, 0, dy); }

function introCard(app) {
  const g = app.g, t = app.time, it = g.def.intro;
  dim();
  const rowsAll = it.lines.map((l) => wrap(l, 136));
  const ph = 132 + rowsAll.reduce((a, r) => a + r.length * 8 + 4, 0) + 26;
  const py = Math.round((H - ph) / 2) - 70;
  ctxShift(py);
  panel(10, 70, 160, ph);
  text(`LEVEL ${g.level}`, 90, 78, { align: 'center', color: C.redD, outline: null });
  text(g.def.title.toUpperCase(), 90, 86, { font: 'big', align: 'center', color: C.ink, outline: null });
  rbox(20, 100, 140, 70, C.woodDD);
  // a preview of the new station
  if (it.station === 'counter') {
    drawItem('soda', 30, 112, { scale: 2 }); drawItem('kimbap', 74, 112, { scale: 2 }); drawItem('toast', 118, 112, { scale: 2 });
  } else if (it.station === 'grill') {
    const p = (Math.sin(t * 0.8) * 0.5 + 0.5) * 1.35;
    drawItem('galbi', 36, 110, { up: p, down: p, scale: 2 }); drawItem('sausage', 92, 110, { up: p * 0.8, down: p * 0.8, scale: 2 });
    for (let x = 26; x < 154; x += 4) R(x, 148, 3, 4, mix(C.redD, C.orange, Math.sin(t * 5 + x) * 0.5 + 0.5));
  } else {
    drawItem('chicken', 40, 110, { p: 1, scale: 2, sauce: 'yangnyeom' }); drawItem('beer', 92, 110, { scale: 2 });
  }
  text(it.heading, 90, 156, { font: 'small', align: 'center', color: C.gold });
  let y = 178;
  for (const rows of rowsAll) {
    R(16, y + 1, 3, 3, C.red);
    for (const r of rows) { text(r, 23, y, { color: C.ink, outline: null }); y += 8; }
    y += 4;
  }
  button(40, y + 4, 100, 16, 'TAP TO START', Math.floor(t * 2) % 2 ? C.greenD : C.green, null);
  ctxShift(0);
  hit(0, 0, W, H, () => app.startLevel(), 'overlay');
}

function endScreen(app) {
  const g = app.g, t = app.time - (app.endAt || 0);
  dim();
  panel(12, 52, 156, 270);
  const ok = g.stars > 0;
  text(ok ? 'STALL CLOSED!' : 'TOUGH NIGHT...', 90, 62, { font: 'big', align: 'center', color: ok ? C.greenD : C.redD, outline: null });
  text(`LEVEL ${g.level}: ${g.def.title.toUpperCase()}`, 90, 74, { align: 'center', color: C.greyD, outline: null });
  for (let i = 0; i < 3; i++) {
    const shown = t > 0.4 + i * 0.35;
    const pop = shown && t < 0.55 + i * 0.35 ? -3 : 0;
    starIcon(26 + i * 44, 88 + (i === 1 ? -4 : 0) + pop, shown && i < g.stars, 4);
  }
  const tips = g.results.reduce((s, r) => s + (r.tip || 0), 0);
  const rows = [
    ['COINS', `${g.coins} / ${g.max}`],
    ['SERVED', String(g.served - g.results.filter((r) => !r.walked && r.mood !== 'happy').length) + ' HAPPY'],
    ['MIX-UPS', String(g.results.filter((r) => !r.walked && r.mood !== 'happy').length)],
    ['WALKED OUT', String(g.lost)],
    ['TIPS', String(tips)],
  ];
  rows.forEach(([a, b], i) => {
    const y = 136 + i * 11;
    text(a, 26, y, { color: C.ink, outline: null });
    text(b, 154, y, { color: C.ink, outline: null, align: 'right' });
    R(26, y + 8, 128, 1, C.cream);
  });
  drawShiba(90, 270, { big: true, scale: 4, mood: ok ? 'happy' : 'wait', t: app.time });
  const next = LEVELS.find((l) => l.n === g.level + 1);
  button(22, 280, 64, 18, 'RETRY', C.blueD, () => app.newLevel(g.level));
  if (ok && next) button(94, 280, 64, 18, 'NEXT', C.greenD, () => app.newLevel(next.n));
  else button(94, 280, 64, 18, 'MENU', ok ? C.greenD : C.steelD, () => app.toTitle());
  let note = 'NEED 1 STAR TO OPEN THE NEXT LEVEL';
  if (ok && next) note = `NEXT UP: THE ${STATIONS[next.stations[next.stations.length - 1]].name.toUpperCase()}`;
  else if (ok) note = 'THE WOK IS COMING SOON!';
  text(note, 90, 304, { align: 'center', color: ok ? C.redD : C.greyD, outline: null });
}

function titleScreen(app) {
  const t = app.time;
  drawMarket(t);
  drawCustomer('shiba', 60, COUNTER_Y + 2, { mood: 'happy', t });
  awningAndCounter(t);
  // logo
  rbox(84, 32, 92, 46, C.ink);
  rbox(84, 30, 92, 46, C.redD);
  R(86, 32, 88, 1, C.red);
  text('CHIMAEK', 130, 36, { font: 'big', scale: 2, align: 'center', color: C.yellow });
  text('NIGHT MARKET', 130, 57, { font: 'big', align: 'center', color: C.cream });
  text('FRIED CHICKEN + BEER', 130, 67, { align: 'center', color: C.gold });
  R(0, SCENE_H, W, H - SCENE_H, C.woodDD);
  for (let y = SCENE_H + 10; y < H; y += 12) R(0, y, W, 1, mix(C.woodDD, C.ink, 0.4));
  text('PICK A NIGHT', 90, SCENE_H + 8, { font: 'big', align: 'center', color: C.cream });
  const all = [...LEVELS, { n: 4, title: 'Wok and roll', stations: ['wok'], soon: true }];
  all.forEach((L, i) => {
    const y = SCENE_H + 22 + i * 42;
    const open = !L.soon && isUnlocked(L.n, app.save.stars);
    rbox(10, y + 1, 160, 36, C.ink);
    rbox(10, y, 160, 36, open ? C.cream : C.greyDD);
    text(`LEVEL ${L.n}`, 18, y + 6, { color: open ? C.redD : C.greyD, outline: null });
    text(L.title.toUpperCase(), 18, y + 15, { font: 'big', color: open ? C.ink : C.greyD, outline: null });
    const st = L.soon ? 'COMING SOON' : `+ ${STATIONS[L.stations[L.stations.length - 1]].name.toUpperCase()}`;
    text(st, 18, y + 26, { color: open ? C.greenD : C.greyD, outline: null });
    if (open) {
      const s = app.save.stars[L.n] || 0;
      for (let k = 0; k < 3; k++) starIcon(124 + k * 14, y + 13, k < s, 1);
      hit(10, y, 160, 36, () => app.newLevel(L.n));
    } else lockIcon(150, y + 12, C.greyD);
  });
  text('FOOD ART: AROACHIFOUNDONMYPILLOW (CC0)', 90, H - 22, { align: 'center', color: C.grey });
  text('PEOPLE: KENNEY.NL (CC0)  SEE CREDITS.MD', 90, H - 13, { align: 'center', color: C.grey });
}

// ---------- frame ----------
export function render(app) {
  hits = [];
  const g = app.g;
  if (app.screen === 'title') {
    titleScreen(app);
    hud(app);
    if (app.settings) settingsPanel(app);
    return hits;
  }
  drawMarket(app.time);
  drawCustomerArea(g, app.time);
  awningAndCounter(app.time);
  drawParts(app.fx, 'world');
  tabs(app);
  // station panel (slides during a switch)
  const sl = app.slide;
  if (sl && sl.k < 1) {
    const e = 1 - Math.pow(1 - sl.k, 3);
    drawPanel(app, sl.from, Math.round(-sl.dir * W * e), false);
    drawPanel(app, g.station, Math.round(sl.dir * W * (1 - e)), false);
  } else drawPanel(app, g.station, 0, g.phase === 'play' || g.phase === 'intro');
  // swipe arrows
  const blink = Math.floor(app.time * 2) % 2;
  if (g.station > 0) {
    text('<', 2, PANEL_Y + 70, { font: 'big', color: blink ? C.cream : C.grey });
    hit(0, PANEL_Y + 50, 12, 46, () => app.switchStation(-1), 'arrow');
  }
  if (g.station < g.stations.length - 1) {
    text('>', W - 2, PANEL_Y + 70, { font: 'big', color: blink ? C.cream : C.grey, align: 'right' });
    hit(W - 12, PANEL_Y + 50, 12, 46, () => app.switchStation(1), 'arrow');
  }
  tray(app);
  // held sauce follows the pointer a little above the finger
  if (g.held && app.pointer) drawSauce(g.held, Math.round(app.pointer.x) - 16, Math.round(app.pointer.y) - 40, false, 2);
  // toast
  const ts = app.fx.toast;
  if (ts) {
    const w = tw(ts.str, 'big') + 12;
    const y = PANEL_Y + 52 - Math.round(Math.min(1, ts.t * 6) * 6);
    rbox(W / 2 - w / 2, y, w, 15, ts.good ? C.greenD : C.redD);
    text(ts.str, W / 2, y + 4, { font: 'big', align: 'center', color: C.white });
  }
  drawFloats(app.fx);
  hud(app);
  if (g.phase === 'intro') introCard(app);
  if (g.phase === 'end') endScreen(app);
  drawParts(app.fx, 'top');
  if (app.settings) settingsPanel(app);
  return hits;
}
