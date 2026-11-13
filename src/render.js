// Draws the game view (market, guests, stations, tray) into the low-res buffer
// and records, through ui.js, what can be tapped (hits), dragged (sources) and
// dropped on (targets). Menus and overlays are in screens.js.
//
// Two control schemes share one layout:
//   drag (default)  grab from bins, drop on a station, tap (or flick up) to
//                   flip, toss or lift a lid, drag to the tray, tap SERVE (or
//                   drag the tray onto a guest)
//   tap             the older tap-to-apply controls with FLIP / TAKE / TOSS /
//                   LIFT / SERVE buttons (the "Tap controls" setting)
import { W, H, C, R, rbox, text, tw, mix } from './gfx.js';
import { ITEMS, SAUCES, STATIONS, STATION_SAUCES, WOK_ITEMS, STEAM_ITEMS, TREAT } from './data.js';
import { grillState, fryState, wokState, steamState, potState, potBoiling, scoreServe, canSauce } from './logic.js';
import {
  drawItem, drawSauce, coinIcon, lockIcon, speakerIcon, gearIcon, heartIcon, drawCustomer, drawShiba,
} from './sprites.js';
import { drawParts, drawFloats, bounceAmt } from './fx.js';
import { hit, src, dst, setTrayBox, button, label, arrowIcon, binIcon, wrap, withOrigin, withClip } from './ui.js';
import { LAY } from './layout.js';
import { accepts, dragHint, findTarget } from './drag.js';
import { SPIRITS, isSpirit } from './spirits.js';
import * as G from './game.js';

export const SCENE_H = 158; // top part: market + guests
export const TABS_Y = 158;
export const PANEL_Y = 172;
export const PANEL_H = 146;
export const TRAY_Y = 318;
export const COUNTER_Y = 140;
export const QUEUE_X = [46, 100, 152]; // where queue guests stand
const HOME_X = 52; // where the one guest stands on normal levels

export const tapMode = (app) => !!app.save.tapControls;

// ---------- market scene ----------
// Drawn in screen coordinates for a scene S (layout.js): w wide, h tall, the
// counter top at cy. The sky and the far street stretch to fill any size: the
// top things (awning, light strings, moon) hang from the top, the street and
// the counter sit on the bottom, and both repeat sideways.
const STALLS = [
  { x: -6, w: 34, h: 36, c: '#7a3a5a' }, { x: 30, w: 30, h: 28, c: '#3a5a7a' }, { x: 62, w: 38, h: 40, c: '#7a5a2a' },
  { x: 102, w: 30, h: 30, c: '#4a6a4a' }, { x: 134, w: 52, h: 38, c: '#6a3a3a' },
];
const STALL_COLS = ['#7a3a5a', '#3a5a7a', '#7a5a2a', '#4a6a4a', '#6a3a3a', '#5a4a7a'];
const BULBS = [C.gold, C.red, C.teal, C.yellow, C.pink];

// A light string from x 0 to w, sagging in arcs about 180 px wide.
function strand(t, y0, sag, phase, w) {
  const n = Math.max(1, Math.round(w / 180)), seg = w / n;
  for (let x = -2; x < w + 2; x += 1) {
    const lx = ((x % seg) + seg) % seg;
    const k = (lx - seg / 2) / (seg / 2);
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
  x += Math.round(Math.sin(t * 1.5 + x) * 1);
  R(x + 3, y - 4, 1, 4, C.ink);
  R(x - 2, y - 1, 11, 14, mix(C.red, C.night2, 0.7)); // glow
  R(x, y, 7, 11, C.ink);
  R(x - 1, y + 2, 9, 7, C.ink);
  R(x, y + 1, 7, 9, C.red);
  R(x, y + 3, 7, 1, C.gold); R(x, y + 7, 7, 1, C.gold);
  R(x + 2, y + 2, 1, 6, C.redL);
  R(x + 2, y + 11, 3, 2, C.gold);
}

// Snow for the frost at the end of night 13.
function drawSnow(t, S) {
  const n = Math.round(40 * Math.max(1, S.w / 180) * Math.max(1, S.h / 158));
  for (let i = 0; i < n; i++) {
    const sx = (i * 47 + 11) % S.w;
    const y = ((t * (12 + (i % 4) * 5) + i * 37) % (S.h + 10)) - 5;
    const x = Math.round(sx + Math.sin(t * 1.5 + i) * 3);
    R(x, Math.round(y), 1, 1, i % 3 ? '#dfe8f8' : C.white);
  }
}
// The street behind the stall. `opts.rain` darkens the sky and hides the stars;
// `opts.festival` hangs more lanterns under a full moon; `opts.frost` brings snow.
export function drawMarket(t, opts = {}, S = LAY.scene) {
  const w = S.w, cy = S.cy, bot = S.h;
  R(0, 0, w, bot, C.night0);
  const bands = [[cy - 96, C.night1], [cy - 70, C.night2], [cy - 44, C.night3]];
  for (const [y, c0] of bands) {
    const c = opts.rain ? mix(c0, C.night0, 0.45) : c0;
    R(0, y, w, bot - y, c);
    for (let x = 0; x < w; x += 2) R(x + ((y / 2) % 2), y - 1, 1, 1, c); // dither edge
  }
  if (!opts.rain) {
    const sky = Math.max(50, cy - 90); // stars from y 30 down to the street's glow
    const n = Math.round(26 * (w / 180) * (sky / 50) ** 0.7);
    for (let i = 0; i < n; i++) {
      const x = (i * 67 + 13) % w, y = 30 + ((i * 37 + Math.floor(i / 5) * 11) % sky);
      if (Math.sin(t * 1.3 + i * 2.1) > -0.3) R(x, y, 1, 1, i % 4 ? C.grey : C.white);
    }
    R(18, 32, 9, 9, C.night1); R(19, 31, 7, 11, C.night1); // moon
    R(19, 33, 7, 7, C.cream); R(20, 32, 5, 9, C.cream); R(22, 34, 2, 2, mix(C.cream, C.grey, 0.4));
  }
  const extra = cy - 140; // sky taller than the design's
  // A tall sky: far hills and a pagoda against it, under a farther light string.
  if (extra > 90) {
    const hy = cy - 54 - 52; // the hills' foot, behind the rooftops
    for (let x = 0; x < w; x++) {
      const k = Math.sin(x * 0.021) * 14 + Math.sin(x * 0.057 + 1.3) * 6 + Math.sin(x * 0.13) * 2;
      const top = Math.round(hy - 26 - k);
      R(x, top, 1, cy - 14 - top, mix(C.night0, C.night1, 0.45));
    }
    const px = Math.floor(w * 0.72); // a pagoda on the far hill
    const py = Math.round(hy - 30 - (Math.sin(px * 0.021) * 14 + Math.sin(px * 0.057 + 1.3) * 6));
    for (let k = 0; k < 4; k++) {
      const rw = 22 - k * 4, ry = py - k * 9;
      R(px - rw / 2, ry, rw, 2, mix(C.night0, C.night2, 0.5));
      R(px - rw / 2 + 3, ry + 2, rw - 6, 7, mix(C.night0, C.night1, 0.6));
      if (k % 2 === 0) R(px - 1, ry + 4, 2, 2, mix(C.gold, C.night0, 0.45));
    }
    R(px, py - 40, 1, 5, mix(C.night0, C.night2, 0.5));
    strand(t, 30 + Math.floor(extra * 0.42), 10, 3, w); // a far light string
  }
  // Rooftops further off, when the sky is tall enough to show them.
  if (extra > 30) {
    for (let x = -10, i = 0; x < w; i++) {
      const bw = 26 + ((i * 17) % 22), bh = 22 + ((i * 29) % 30);
      const top = cy - 54 - bh;
      R(x, top, bw, cy - 14 - top, mix(C.night1, C.night0, 0.35));
      R(x + 2, top - 3, bw - 4, 3, mix(C.night1, C.night0, 0.35));
      for (let k = 0; k < 3; k++) if ((i + k) % 3 !== 1) R(x + 5 + k * 7, top + 6 + (k % 2) * 6, 2, 3, mix(C.gold, C.night0, 0.55)); // lit windows
      x += bw + 6;
    }
  }
  for (let ox = 0, rep = 0; ox < w + 6; ox += 190, rep++) {
    STALLS.forEach((s0, j) => {
      const s = { ...s0, c: rep ? STALL_COLS[(j + rep * 2) % STALL_COLS.length] : s0.c };
      const x = s.x + ox, top = cy - 14 - s.h;
      R(x, top + 8, s.w, s.h - 8, mix(s.c, C.night0, 0.55));
      for (let i = 0; i < s.w; i += 6) R(x + i, top, 3, 9, mix(s.c, C.night0, 0.25));
      for (let i = 3; i < s.w; i += 6) R(x + i, top, 3, 9, mix(C.cream, C.night0, 0.5));
      R(x + 3, top + 12, s.w - 6, 3, mix(C.gold, C.night0, 0.25)); // lit counter
      R(x + s.w / 2 - 6, top + 2, 12, 5, C.ink);
    });
  }
  // Far-off shapes in the crowd: some people, some spirits (round, hovering).
  const crowd = Math.ceil((14 * (w + 10)) / 190);
  for (let i = 0; i < crowd; i++) {
    const x = (i * 29 + 7) % (w + 10) - 5;
    const bob = Math.round(Math.sin(t * 2 + i) * 0.7);
    const y = cy - 30 + (i % 3) * 4 + bob;
    if (i % 4 === 1) {
      const fl = Math.round(Math.sin(t * 1.4 + i) * 1.5);
      R(x - 1, y - 2 + fl, 9, 8, '#2a2246'); R(x + 1, y - 3 + fl, 5, 10, '#2a2246');
      R(x + 2, y + 1 + fl, 1, 1, mix(C.gold, C.night0, 0.4)); R(x + 5, y + 1 + fl, 1, 1, mix(C.gold, C.night0, 0.4));
    } else { R(x, y, 7, 7, '#1c1530'); R(x - 2, y + 7, 11, 12, '#1c1530'); }
  }
  R(0, cy - 14, w, 16, '#231a30');
  for (let x = 0; x < w; x += 12) R(x, cy - 9, 8, 1, '#2d2240');
  strand(t, 30, 16, 0, w);
  for (let x = 40; x < w - 8; x += 80) lantern(x, x % 160 === 40 ? 50 : 52, t);
  strand(t, 22, 8, 4, w);
  if (opts.festival) {
    const mx = w - 40;
    R(mx, 30, 15, 15, C.night1); R(mx + 1, 29, 13, 17, C.night1); // a full moon
    R(mx + 1, 31, 13, 13, C.cream); R(mx + 2, 30, 11, 15, C.cream); R(mx + 6, 34, 3, 2, mix(C.cream, C.grey, 0.4)); R(mx + 4, 39, 2, 2, mix(C.cream, C.grey, 0.4));
    strand(t, 40, 12, 2, w);
    for (let ox = 0; ox < w; ox += 180) for (const [x, y] of [[14, 62], [66, 64], [96, 60], [150, 62]]) if (ox + x < w - 6) lantern(ox + x, y, t + x);
  }
  if (opts.frost) {
    drawSnow(t, S);
    for (let x = 0; x < w; x += 3) R(x, cy - 15 + ((x * 7) % 3), 2, 1, '#dfe8f8'); // frost on the far stalls
  }
}

// Rain streaks over the street (level 4).
export function drawRain(t, S = LAY.scene) {
  const n = Math.round(46 * Math.max(1, S.w / 180) * Math.max(1, S.h / 158));
  for (let i = 0; i < n; i++) {
    const sx = (i * 41 + 7) % (S.w + 30);
    const sp = 140 + (i % 5) * 18;
    const y = ((t * sp + i * 53) % (S.h + 20)) - 10;
    const x = Math.round(sx - y * 0.25);
    R(x, Math.round(y), 1, 3, i % 3 ? '#5f74b0' : '#8fa4d8');
  }
}

// The awning along the top and its posts (screen coordinates).
export function awning(S = LAY.scene) {
  const W = S.w;
  for (let x = 0; x < W; x += 10) {
    const c = (x / 10) % 2 ? C.cream : C.red;
    R(x, 14, 10, 10, c);
    R(x + 1, 24, 8, 2, c); R(x + 2, 26, 6, 1, c);
    R(x, 24, 1, 2, C.ink);
  }
  R(0, 14, W, 1, C.ink);
  R(0, 14, 5, S.cy - 14, C.woodD); R(1, 14, 1, S.cy - 14, C.wood);
  R(W - 5, 14, 5, S.cy - 14, C.woodD); R(W - 4, 14, 1, S.cy - 14, C.wood);
}
// The counter: its top at cy, its front down to `bottom` (screen coordinates).
export function counterBand(S = LAY.scene, frost = false, bottom = S.cy + 18) {
  const W = S.w, cy = S.cy;
  R(0, cy, W, 6, C.woodL);
  R(0, cy, W, 1, C.cream);
  R(0, cy + 6, W, bottom - cy - 6, C.wood);
  for (let x = (((8 + S.d) % 22) + 22) % 22; x < W; x += 22) R(x, cy + 7, 1, bottom - cy - 7, C.woodD);
  R(0, bottom - 1, W, 1, C.ink);
  if (frost) for (let x = 1; x < W; x += 2) R(x, cy + ((x * 5) % 3 === 0 ? 1 : 0), 1, 1, '#eaf2ff'); // frost on the counter
}
// What stands on the counter (design coordinates, in the service area).
export function counterDecor(t, dogOpts = {}) {
  // The stall's sign hangs on the front of the counter, below the guests (on a
  // queue night the third guest stands where it used to be).
  rbox(130, COUNTER_Y + 7, 36, 10, C.ink, C.woodDD);
  text('CHIMAEK', 148, COUNTER_Y + 9, { color: C.gold, align: 'center', outline: null });
  if (dogOpts.special) { // the specials board on the counter front
    const str = `SPECIAL ${ITEMS[dogOpts.special].short} X2`;
    const w = tw(str) + 8;
    rbox(46, COUNTER_Y + 7, w, 10, '#2c4a34', C.woodDD);
    text(str, 46 + w / 2, COUNTER_Y + 9, { color: C.cream, align: 'center', outline: null });
  }
  if (!dogOpts.none) drawShiba(20, COUNTER_Y + 2, { t, react: dogOpts.react || null, mood: dogOpts.mood || 'wait' });
}
// Draws fn() in the service area: design coordinates moved to the counter.
export function inScene(fn, S = LAY.scene) {
  withOrigin(S.d, S.cy - COUNTER_Y, fn, [0, 14, 180, SCENE_H]);
}
// The whole stall front: awning, counter and what is on it.
export function awningAndCounter(t, dogOpts = {}, S = LAY.scene, bottom = S.cy + 18) {
  awning(S);
  counterBand(S, !!dogOpts.frost, bottom);
  inScene(() => counterDecor(t, dogOpts), S);
}

// Chimaek and her treat (level 9 on): a thought bubble with plain beef when
// she is hungry, hearts when she eats, her back turned when she says no, and
// a small timer while tips are worth more. Returns how to draw her.
export const DOG_BOX = { x: 2, y: COUNTER_Y - 34, w: 36, h: 36 };
export function dogLook(g, t) {
  const d = g.dog;
  if (!d) return { react: g.phase === 'play' ? dogReact(g) : null };
  if (g.time - d.ateT < 1.6) return { react: 'wag', mood: 'happy' };
  if (g.time - d.refuseT < 1.4) return { react: 'turn' };
  return { react: g.phase === 'play' ? dogReact(g) || (d.want ? 'wag' : null) : null };
}
function dogExtras(app) {
  const g = app.g, d = g.dog, t = app.time;
  if (!d || g.phase !== 'play') return;
  if (d.want) { // thought bubble: plain beef
    const bob = Math.round(Math.sin(t * 3));
    R(30, 103 + bob, 2, 2, C.white); R(34, 99 + bob, 3, 3, C.white);
    rbox(30, 78 + bob, 24, 20, C.white);
    drawItem('plain', 34, 78 + bob);
    const k = Math.max(0, (d.until - g.time) / TREAT.wait); // how long she will wait
    R(33, 94 + bob, Math.round(18 * k), 2, k > 0.3 ? C.gold : C.red);
  }
  const ate = g.time - d.ateT;
  if (ate < 1.6) for (let i = 0; i < 3; i++) heartIcon(8 + i * 10, 96 - Math.round(ate * 14) - (i % 2) * 4, C.red);
  if (g.time - d.refuseT < 1.4) text('SNIFF... NO', 38, 114, { color: C.cream });
  if (g.time < d.happyUntil) { // tips are worth more for a while
    const k = (d.happyUntil - g.time) / TREAT.lasts;
    rbox(2, 100, 36, 11, C.greenD);
    text(`TIPS X${TREAT.tipMul}`, 20, 102, { color: C.white, align: 'center', outline: null });
    R(4, 108, Math.round(32 * k), 1, C.greenL);
  }
}

// How Chimaek reacts to who is at the counter: hides from the rain frog,
// growls at the fox and the crane, wags at the others.
export function dogReact(g) {
  const looks = g.line.filter((c) => c.phase !== 'leave').map((c) => c.look).filter(isSpirit);
  for (const r of ['hide', 'growl', 'wag']) if (looks.some((l) => SPIRITS[l].dog === r)) return r;
  return null;
}

// ---------- guests ----------
const queueLevel = (g) => g.queueMax > 1;
export function guestX(g, c) {
  const home = queueLevel(g) ? QUEUE_X[c.col % QUEUE_X.length] : HOME_X;
  // In design coordinates: they walk in from the left edge of the street and
  // out past its right edge (wherever those are on this screen).
  const S = LAY.scene, from = -30 - S.d, to = S.sw - S.d + 40;
  if (c.phase === 'enter') { const k = Math.min(1, c.t / c.enterTime); return from + (home - from) * (1 - Math.pow(1 - k, 3)); }
  if (c.phase === 'leave') { const k = Math.max(0, (c.t - 0.45) / 0.55); return home + (to - home) * k * k; }
  return home;
}

function tick(x, y) {
  R(x, y, 8, 7, C.greenD);
  R(x + 2, y + 3, 1, 1, C.white); R(x + 3, y + 4, 1, 1, C.white); R(x + 4, y + 3, 1, 1, C.white); R(x + 5, y + 2, 1, 1, C.white);
}
function patienceBar(x, y, w, k, t) {
  heartIcon(x, y, k > 0.3 ? C.red : (Math.floor(t * 6) % 2 ? C.red : C.redD));
  R(x + 10, y, w - 10, 6, C.ink);
  const col = k > 0.6 ? C.green : k > 0.3 ? C.gold : C.red;
  const bw = Math.max(0, Math.round((w - 12) * k));
  R(x + 11, y + 1, bw, 4, col);
  R(x + 11, y + 1, bw, 1, mix(col, C.white, 0.4));
}
const SAUCE_COL = { honey: C.orange, soygarlic: C.woodD, egg: C.orange, scallion: C.greenD, soydip: C.woodD };
// A regular's mood on the corner of their bubble or ticket: a heart (glad)
// or a rain cloud (grumpy).
function moodMark(x, y, mood) {
  if (mood === 'glad') {
    rbox(x, y, 11, 10, C.white, C.pinkD);
    heartIcon(x + 2, y + 2, C.red);
  } else if (mood === 'grumpy') {
    rbox(x, y, 11, 10, C.greyDD, C.ink);
    R(x + 3, y + 2, 5, 2, C.grey); R(x + 2, y + 3, 7, 2, C.grey);
    R(x + 3, y + 6, 1, 2, C.teal); R(x + 6, y + 6, 1, 2, C.teal);
  }
}
// The daily special pays double: a small gold X2 on the item picture.
function x2Mark(x, y) {
  text('X2', x, y, { color: C.yellow, outline: C.ink });
}
// A VIP's gold ribbon on top of the bubble or ticket.
function vipRibbon(cx, y) {
  rbox(cx - 12, y - 4, 24, 9, C.gold);
  text('VIP', cx, y - 2, { color: C.ink, outline: null, align: 'center' });
}

// The single guest's order bubble: pictures and names.
function orderBubble(g, c, t) {
  const lines = c.order.lines;
  const x = 90, y = 30, w = 86;
  const h = 8 + lines.length * 18 + 10;
  rbox(x, y, w, h, C.white, c.order.vip ? C.gold : C.ink);
  if (c.order.vip) vipRibbon(x + w / 2, y);
  R(x - 5, y + 30, 6, 3, C.ink); R(x - 3, y + 31, 4, 1, C.white); R(x - 1, y + 29, 2, 5, C.white); R(x - 1, y + 28, 1, 1, C.ink);
  const ready = scoreServe(c.order, g.tray, 1).lines;
  lines.forEach((l, i) => {
    const ly = y + 4 + i * 18;
    drawItem(l.item, x + 3, ly, { cook: 'done', sauce: l.sauce });
    text(ITEMS[l.item].short, x + 22, ly + (l.sauce ? 1 : 5), { color: C.ink, outline: null });
    if (l.sauce) text(`+${SAUCES[l.sauce].short}`, x + 22, ly + 9, { color: SAUCE_COL[l.sauce] || C.red, outline: null });
    if (l.item === g.def.special) x2Mark(x + 2, ly + 11);
    if (ready[i].status === 'ok') tick(x + w - 10, ly + 6);
  });
  patienceBar(x + 4, y + h - 9, w - 8, c.patience / c.maxPatience, t);
  moodMark(x - 4, y - 3, c.regular);
}

// A queue guest's ticket: small pictures (item, + sauce), ticks and patience.
const TICKET_W = 50;
function ticket(g, c, cx, t) {
  const lines = c.order.lines;
  const x = Math.round(cx - TICKET_W / 2), y = 29;
  const h = 6 + lines.length * 17 + 9;
  rbox(x, y, TICKET_W, h, c.order.vip ? C.yellow : C.white, c.order.vip ? C.orange : C.ink);
  if (c.order.vip) vipRibbon(cx, y);
  if (c.order.rush) { R(x + 2, y + 1, TICKET_W - 4, 2, C.red); text('RUSH', x + TICKET_W - 3, y + h - 16, { color: C.red, outline: null, align: 'right' }); }
  R(x + TICKET_W / 2 - 2, y + h, 5, 1, C.ink); R(x + TICKET_W / 2 - 1, y + h + 1, 3, 1, C.ink); // pointer
  const ready = scoreServe(c.order, g.tray, 1).lines;
  lines.forEach((l, i) => {
    const ly = y + 3 + i * 17;
    drawItem(l.item, x + 2, ly, { cook: 'done' });
    if (l.sauce) { text('+', x + 20, ly + 5, { color: C.ink, outline: null }); drawSauce(l.sauce, x + 24, ly, false, 1); }
    if (l.item === g.def.special) x2Mark(x + 1, ly + 11);
    if (ready[i].status === 'ok') tick(x + TICKET_W - 10, ly + 5);
  });
  patienceBar(x + 3, y + h - 8, TICKET_W - 6, c.patience / c.maxPatience, t);
  moodMark(x - 3, y - 3, c.regular);
}

function reactionBubble(c, cx) {
  const r = c.result;
  const msg = c.mood === 'happy' ? (r && r.perfects ? 'PERFECT!' : 'YUM!') : c.mood === 'meh' ? 'HMM...' : r ? 'WRONG!' : 'TOO SLOW!';
  const w = tw(msg, 'big') + 10;
  const x = Math.round(Math.min(176 - w, Math.max(4, cx - w / 2))), y = 40;
  rbox(x, y, w, 14, c.mood === 'happy' ? C.white : c.mood === 'meh' ? C.cream : C.redL);
  text(msg, x + w / 2, y + 4, { font: 'big', color: C.ink, outline: null, align: 'center' });
}

// The guests themselves (behind the counter).
function drawGuests(app) {
  const g = app.g, t = app.time;
  const scale = queueLevel(g) ? 3 : undefined;
  // Leaving guests first, so the waiting ones stay on top.
  const order = [...g.line].sort((a, b) => (b.phase === 'leave') - (a.phase === 'leave'));
  for (const c of order) {
    const cx = Math.round(guestX(g, c));
    drawCustomer(c.look, cx, COUNTER_Y + 2, { mood: c.phase === 'leave' ? c.mood : 'wait', t, low: c.patience / c.maxPatience < 0.3, scale });
  }
}
// Their order bubbles or tickets (in front of the awning), and where to serve them.
function drawOrders(app) {
  const g = app.g, t = app.time;
  const q = queueLevel(g);
  const live = g.phase === 'play' && !app.slide;
  const drag = !tapMode(app);
  g.line.forEach((c, idx) => {
    const cx = Math.round(guestX(g, c));
    if (c.phase === 'wait') {
      if (q) ticket(g, c, cx, t); else orderBubble(g, c, t);
      // Where the tray can be dropped (or tapped) to serve this guest.
      const top = 27; // from the top of the order down to the counter
      const box = q ? [cx - 26, top, 52, COUNTER_Y - top] : [20, top, 158, COUNTER_Y - top];
      if (live) {
        if (drag) dst(...box, { kind: 'customer', idx });
        else hit(...box, () => G.serve(g, idx), 'customer');
      }
    } else if (c.phase === 'leave' && c.t < 0.9) reactionBubble(c, cx);
  });
}

// A spirit's memory (or a person's quip), shown for a few seconds.
// Normal levels: a card left of the order bubble. Queue: across the street,
// under the tickets. It waits (t < 0) while the guest's reaction shows.
function banner(app) {
  const b = app.banner;
  if (!b || b.t < 0) return;
  const q = app.g && queueLevel(app.g);
  const x = q ? 4 : 6, w = q ? 172 : 82, y = q ? 86 : 30;
  const rows = wrap(b.text, w - 9);
  const h = 13 + rows.length * 7;
  rbox(x, y + 1, w, h, C.ink);
  rbox(x, y, w, h, b.memory ? C.cream : C.white);
  text(b.who, x + 5, y + 4, { color: b.memory ? C.redD : C.greyD, outline: null });
  if (b.memory) text('MEMORY', x + w - 4, y + 4, { color: C.purple, outline: null, align: 'right' });
  rows.forEach((r, i) => text(r, x + 5, y + 11 + i * 7, { color: C.ink, outline: null }));
}

// ---------- HUD ----------
export function hud(app) {
  const g = app.g;
  R(0, 0, W, 14, C.ink);
  const right = (fn) => withOrigin(W - 180, 0, fn, [130, 0, 180, 14]); // menu, settings and sound sit on the right
  withOrigin(0, 0, () => {}, [0, 0, 130, 14]);
  if (g && app.screen === 'game' && g.endless) { // endless: guests so far and the strikes left
    for (const [dx, dy] of [[0, 1], [1, 0], [2, 0], [3, 1], [4, 2], [5, 2], [6, 1], [7, 0], [8, 0], [9, 1], [8, 2], [7, 2], [2, 2], [1, 2]]) R(5 + dx, 5 + dy, 1, 1, C.gold); // an infinity sign
    coinIcon(30, 3);
    text(String(app.shownCoins ?? g.coins), 40, 4, { font: 'big', color: C.yellow });
    text(`GUEST ${Math.max(1, g.custIdx + 1)}`, 70, 4, { color: C.cream });
    for (let k = 0; k < g.def.strikes; k++) heartIcon(110 + k * 8, 4, k < g.def.strikes - g.lost ? C.red : C.greyDD);
  } else if (g && app.screen === 'game') {
    text(`LV ${g.level}`, 4, 4, { color: C.gold });
    coinIcon(30, 3);
    text(String(app.shownCoins ?? g.coins), 40, 4, { font: 'big', color: C.yellow });
    const n = Math.min(g.custIdx + 1, g.orders.length);
    text(`GUEST ${Math.max(1, n)}/${g.orders.length}`, 78, 4, { color: C.cream });
  } else {
    text('CHIMAEK NIGHT MARKET', 4, 4, { color: C.gold });
  }
  right(() => {
    if (g && app.screen === 'game') {
      R(138, 4, 7, 1, C.grey); R(138, 6, 7, 1, C.grey); R(138, 8, 7, 1, C.grey); // menu
      hit(132, 0, 15, 14, () => app.toTitle(), 'ui', 'menu');
    }
    gearIcon(151, 3);
    hit(147, 0, 15, 14, () => app.openSettings(), 'settings', 'settings');
    speakerIcon(166, 2, app.muted);
    hit(162, 0, 18, 14, () => app.toggleMute(), 'ui', 'mute');
  });
}

// ---------- station tabs ----------
// 'burn' if something there is burning or about to, 'ready' if done, else null.
export function stationAlert(g, id) {
  if (id === 'grill') {
    if (g.grill.some((it) => it && Math.max(...it.sides) > g.cook.grill.perfectHi)) return 'burn';
    if (g.grill.some((it) => it && grillState(it, g.cook.grill) === 'done')) return 'ready';
  }
  if (id === 'fryer') {
    const its = g.fryer.baskets.filter(Boolean);
    if (its.some((it) => it.p > g.cook.fry.perfectHi)) return 'burn';
    if (its.some((it) => fryState(it, g.cook.fry) === 'done')) return 'ready';
  }
  if (id === 'wok' && g.wok) {
    if (g.wok.scorch > 0 || g.wok.idle > g.cook.wok.idleSafe * 0.6) return 'burn';
    if (wokState(g.wok, g.cook.wok) === 'done') return 'ready';
  }
  if (id === 'steamer') {
    const its = g.steamer.filter((b) => b && b.lid);
    if (its.some((b) => b.p > g.cook.steam.perfectHi)) return 'burn';
    if (its.some((b) => steamState(b, g.cook.steam) === 'done')) return 'ready';
  }
  if (id === 'pot' && g.pot) {
    if (g.pot.item && g.pot.p > g.cook.pot.perfectHi) return 'burn';
    if (potState(g.pot, g.cook.pot) === 'done' || (potBoiling(g.pot) && !g.pot.item)) return 'ready';
  }
  return null;
}
// The station's name on its tab, or its short name when the tab is narrow.
export function tabLabel(id, w) {
  const full = STATIONS[id].name.toUpperCase();
  return tw(full) <= w - 2 ? full : (STATIONS[id].tab || full).toUpperCase();
}
function tabs(app) {
  const g = app.g, T = LAY.tabs;
  R(T.x, T.y, T.w, 14, C.woodDD);
  withOrigin(T.x + Math.floor((T.w - 180) / 2), T.y - TABS_Y, () => {}, [0, TABS_Y, 180, PANEL_Y]);
  const n = g.stations.length;
  const w0 = T.w / n;
  g.stations.forEach((s, i) => {
    const x = T.x + Math.round(i * w0), w = T.x + Math.round((i + 1) * w0) - x;
    const y = T.y;
    const cur = i === g.station;
    if (cur) { R(x + 1, y + 1, w - 2, 13, C.cream); R(x + 1, y + 13, w - 2, 1, C.cream); }
    else R(x + 1, y + 2, w - 2, 10, mix(C.woodDD, C.ink, 0.3));
    const lab = tabLabel(s.id, w);
    const col = cur ? C.ink : s.status === 'open' ? C.cream : C.greyD;
    if (s.status !== 'open') {
      if (tw(lab) + 14 <= w) {
        lockIcon(x + 3, y + 2, cur ? C.greyD : C.greyDD);
        text(lab, x + 14, y + 5, { color: col, outline: cur ? null : C.ink });
      } else lockIcon(x + Math.floor(w / 2) - 4, y + 2, cur ? C.greyD : C.greyD);
    } else text(lab, x + w / 2, y + 5, { color: col, align: 'center', outline: cur ? null : C.ink });
    // A dot on another station's tab when food there is ready (green) or burning (red).
    const a = !cur && s.status === 'open' && g.phase === 'play' ? stationAlert(g, s.id) : null;
    if (a && (a === 'ready' || Math.floor(app.time * 4) % 2)) { R(x + w - 6, y + 1, 5, 4, C.ink); R(x + w - 5, y + 2, 3, 2, a === 'ready' ? C.green : C.red); }
    hit(x, y, w, 14, () => app.goStation(i), 'tab', `tab:${s.id}`);
  });
}

// ---------- station panels ----------
// The panel's background fills its whole rect (wider and taller than the
// 180 x 146 design on big screens); the station sits in the middle.
function panelBg(ox) {
  const P = LAY.panel.local;
  R(ox + P.x, P.y, P.w, P.h, C.woodDD);
  for (let y = PANEL_Y + 10 - 12 * Math.ceil((PANEL_Y - P.y) / 12); y < P.y + P.h; y += 12) R(ox + P.x, y, P.w, 1, mix(C.woodDD, C.ink, 0.4));
  R(ox + P.x, P.y, P.w, 2, mix(C.woodDD, C.gold, 0.25));
}

// A cooking meter: grey = raw, green = done, gold = perfect, red = burnt.
function meter(x, y, w, h, p, spec, active) {
  const span = spec.max;
  const px = (v) => x + Math.round((Math.min(v, span) / span) * w);
  R(x - 1, y - 1, w + 2, h + 2, C.ink);
  R(x, y, w, h, C.greyD);
  R(px(spec.done), y, px(spec.burnt) - px(spec.done), h, C.greenD);
  R(px(spec.perfectLo), y, px(spec.perfectHi) - px(spec.perfectLo), h, C.gold);
  if (spec.burnt < span) R(px(spec.burnt), y, x + w - px(spec.burnt), h, C.redD);
  if (!active) for (let i = 0; i < w; i += 2) R(x + i, y, 1, h, C.ink);
  const m = Math.min(x + w - 1, px(p));
  R(m - 1, y - 2, 3, h + 4, C.ink);
  R(m, y - 1, 1, h + 2, C.white);
}

// Is this thing in the player's hand right now (so its home spot looks empty)?
function holding(app, kind, key = null) {
  const p = (app.drag && app.drag.lifted ? app.drag.payload : null) || (app.snap ? app.snap.payload : null);
  if (!p || p.kind !== kind) return false;
  return key == null || p.slot === key || p.index === key;
}

function counterPanel(app, ox, live) {
  const g = app.g, drag = !tapMode(app);
  panelBg(ox);
  const cx = ox + 4, cy = PANEL_Y + 4;
  rbox(cx, cy, 84, 140, '#2a6f9e');
  R(cx + 3, cy + 3, 78, 134, '#173a5a');
  R(cx + 3, cy + 3, 78, 2, C.teal);
  text('COOLER', cx + 42, cy + 7, { color: C.teal, align: 'center' });
  ['soda', 'tea', 'beer'].forEach((id, i) => {
    const ry = cy + 16 + i * 40;
    R(cx + 5, ry + 36, 74, 2, C.steelD);
    if (ITEMS[id].unlock > g.level) {
      lockIcon(cx + 18, ry + 14, C.greyD);
      text(ITEMS[id].short, cx + 34, ry + 11, { color: C.greyD });
      text(`LEVEL ${ITEMS[id].unlock}`, cx + 34, ry + 20, { color: C.greyD });
      return;
    }
    const b = bounceAmt(app.fx, `ready:${id}`);
    drawItem(id, cx + 6, ry + 3 - b, { scale: 2 });
    text(ITEMS[id].short, cx + 42, ry + 10, { color: C.white });
    coinIcon(cx + 42, ry + 19); text(String(ITEMS[id].price), cx + 51, ry + 20, { color: C.yellow });
    if (live) {
      if (drag) src(cx + 3, ry, 78, 38, { kind: 'ready', item: id });
      else hit(cx + 3, ry, 78, 38, () => G.grabReady(g, id), `ready:${id}`);
    }
  });
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
    if (live) {
      if (drag) src(sx, sy, 84, 66, { kind: 'ready', item: id });
      else hit(sx, sy, 84, 66, () => G.grabReady(g, id), `ready:${id}`);
    }
  });
}

// A bin of raw food: a drag source, or a tap target running `onTap`.
function bin(app, x, y, w, art, labelStr, opts, live, payloadItem, onTap) {
  rbox(x, y, w, 34, C.steel);
  R(x + 2, y + 2, w - 4, 30, C.steelD);
  const key = `bin:${payloadItem}`;
  drawItem(art, x + Math.floor(w / 2) - 16, y + 1 - bounceAmt(app.fx, key), { ...opts, scale: 2 });
  label(labelStr, x + w / 2, y + 36);
  if (!live) return;
  if (!tapMode(app)) src(x, y, w, 42, { kind: 'bin', item: payloadItem });
  else hit(x, y, w, 42, onTap, key);
}
function sauceShelf(app, ox, ids, live) {
  const g = app.g;
  ids.forEach((id, i) => {
    const bx = ox + 100 + i * 40;
    const held = g.held === id;
    if (held) R(bx, PANEL_Y + 1, 40, 42, mix(C.gold, C.woodDD, 0.5));
    drawSauce(id, bx + 4, PANEL_Y + 2, held, 2);
    label(SAUCES[id].short, bx + 20 - (i === 0 ? 2 : 0), PANEL_Y + 36, held ? C.yellow : C.cream); // nudged apart: long names
    if (!live) return;
    if (!tapMode(app)) src(bx, PANEL_Y + 1, 40, 44, { kind: 'sauce', id });
    else hit(bx, PANEL_Y + 1, 40, 44, () => G.pickSauce(g, id), `sauce:${id}`);
  });
}
// Drag mode's hints under a cooking spot: an up arrow + word, a down arrow + word.
function gestureLabels(cx, y, upWord, downWord) {
  let yy = y;
  for (const [word, dir, col] of [[upWord, 'up', C.cream], [downWord, 'down', C.greenL]]) {
    if (!word) continue;
    const w = 7 + tw(word);
    const x = cx - Math.floor(w / 2);
    arrowIcon(x, yy, dir, col);
    text(word, x + 7, yy, { color: col });
    yy += 9;
  }
}

export const grillPitch = (g) => Math.floor(168 / g.grill.length);
export const grillSlotX = (g, i) => 6 + i * grillPitch(g) + Math.floor(grillPitch(g) / 2);

function grillPanel(app, ox, live) {
  const g = app.g, t = app.time, drag = !tapMode(app);
  panelBg(ox);
  if (g.dog) { // three bins: plain beef for Chimaek joins them
    ['galbi', 'sausage', 'plain'].forEach((id, i) => {
      bin(app, ox + 3 + i * 32, PANEL_Y + 2, 31, id, id === 'plain' ? 'PLAIN' : ITEMS[id].short, { p: 0 }, live, id, () => G.grillAdd(g, id));
    });
  } else {
    bin(app, ox + 4, PANEL_Y + 2, 44, 'galbi', 'GALBI', { p: 0 }, live, 'galbi', () => G.grillAdd(g, 'galbi'));
    bin(app, ox + 52, PANEL_Y + 2, 44, 'sausage', 'SAUSAGE', { p: 0 }, live, 'sausage', () => G.grillAdd(g, 'sausage'));
  }
  sauceShelf(app, ox, STATION_SAUCES.grill, live);
  const gy = PANEL_Y + 46;
  rbox(ox + 3, gy, 174, 98, C.steelD);
  R(ox + 6, gy + 3, 168, 92, '#1e1820');
  for (let x = 8; x < 172; x += 4) {
    const f = Math.sin(t * 5 + x * 0.7) * 0.5 + 0.5;
    R(ox + x, gy + 86, 3, 8, mix(C.redD, C.orange, f * 0.8));
    R(ox + x + 1, gy + 86, 1, 2, mix(C.orange, C.yellow, f));
  }
  for (let y = gy + 8; y < gy + 44; y += 7) R(ox + 6, y, 168, 1, C.steelD);
  const pitch = grillPitch(g);
  const mw = pitch - 16;
  g.grill.forEach((it, i) => {
    const sx = ox + 6 + i * pitch, mid = sx + Math.floor(pitch / 2);
    if (i > 0) R(sx - 1, gy + 4, 1, 82, mix(C.steelD, C.ink, 0.5));
    const box = [sx + 1, gy + 2, pitch - 2, 84];
    if (live && drag) dst(...box, { kind: 'grillSlot', slot: i });
    if (!it) {
      text('EMPTY', mid, gy + 22, { color: C.greyDD, outline: null, align: 'center' });
      return;
    }
    const st = grillState(it, g.cook.grill);
    const flipAge = it.flipT != null ? g.time - it.flipT : 9;
    const hop = flipAge < 0.25 ? -Math.round(Math.sin((flipAge / 0.25) * Math.PI) * 6) : 0;
    const up = it.sides[1 - it.down], down = it.sides[it.down];
    if (!holding(app, 'grill', i)) drawItem(it.item, mid - 16, gy + 5 + hop - bounceAmt(app.fx, `grill:${i}`), { up, down, scale: 2 });
    const mx = mid - Math.floor(mw / 2);
    meter(mx, gy + 44, mw, 3, it.sides[0], g.cook.grill, it.down === 0);
    meter(mx, gy + 51, mw, 3, it.sides[1], g.cook.grill, it.down === 1);
    const ay = gy + 44 + it.down * 7; // the flame marks the side on the heat
    R(mx - 6, ay - 1, 3, 5, C.orange); R(mx - 5, ay, 1, 3, C.yellow);
    if (drag) {
      gestureLabels(mid, gy + 61, 'FLIP', st === 'burnt' ? 'BIN' : 'TRAY');
      if (live) src(...box, { kind: 'grill', slot: i });
    } else {
      const takeCol = st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD;
      button(sx + 5, gy + 58, pitch - 10, 12, 'FLIP', C.blueD, live && (() => G.grillFlip(g, i)), `flip:${i}`);
      button(sx + 5, gy + 72, pitch - 10, 12, st === 'burnt' ? 'TOSS' : 'TAKE', takeCol, live && (() => G.grillTake(g, i)), `take:${i}`);
      if (live) hit(sx + 6, gy + 4, pitch - 12, 36, () => G.grillFlip(g, i), `flip:${i}`);
    }
  });
}

export const basketX = (i) => 8 + i * 84 + 40;
function fryerPanel(app, ox, live) {
  const g = app.g, t = app.time, drag = !tapMode(app);
  panelBg(ox);
  bin(app, ox + 4, PANEL_Y + 2, 44, 'chicken', 'CHICKEN', { raw: true }, live, 'chicken', () => G.fryAdd(g));
  const bx = ox + 46, by = PANEL_Y + 10;
  R(bx + 2, by + 8, 50, 16, C.ink); R(bx + 4, by + 22, 46, 3, C.ink);
  R(bx + 3, by + 9, 48, 13, C.cream); R(bx + 5, by + 9, 44, 3, C.white);
  const bowl = g.fryer.bowl;
  if (bowl && !holding(app, 'bowl')) {
    // The chicken sits in the batter: only the part above the batter shows,
    // and it never pokes out of the bowl's slot (it sinks deeper as it dips).
    const dip = bowl.dipping > 0 ? Math.round(Math.sin((1 - bowl.dipping / 0.45) * Math.PI) * 6) : 0;
    withClip(bx, by - 8, 54, 20, () => drawItem('chicken', bx + 11, by - 7 + dip, { raw: !bowl.battered, p: 0, scale: 2 }));
    R(bx + 3, by + 12, 48, 3, C.cream); R(bx + 8, by + 11, 6, 1, C.cream); R(bx + 33, by + 11, 9, 1, C.cream); // the batter's surface, lapping at it
    R(bx + 6, by + 12, 40, 1, C.white);
  }
  R(bx + 3, by + 15, 48, 7, '#d8e0f0'); R(bx + 4, by + 16, 3, 4, C.white); // bowl front
  let msg = 'BATTER';
  if (bowl) msg = bowl.dipping > 0 ? 'DIPPING' : bowl.battered ? (drag ? 'TO A BASKET' : 'TAP: BASKET') : 'TAP TO DIP';
  label(msg, bx + 27, by + 26, bowl && !bowl.dipping && Math.floor(t * 3) % 2 ? C.yellow : C.cream);
  if (live) {
    if (drag) {
      dst(bx, by - 8, 54, 40, { kind: 'bowl' });
      if (bowl && bowl.battered) src(bx, by - 8, 54, 40, { kind: 'bowl' });
    } else hit(bx, by, 54, 32, () => G.fryDip(g), 'bowl');
  }
  sauceShelf(app, ox, STATION_SAUCES.fryer, live);
  const fy = PANEL_Y + 46;
  rbox(ox + 3, fy, 174, 98, C.steel);
  R(ox + 6, fy + 3, 168, 92, C.steelD);
  R(ox + 9, fy + 14, 162, 62, C.oilD);
  for (let y = fy + 14; y < fy + 76; y += 2) R(ox + 9, y, 162, 1, mix(C.oil, C.oilD, (y - fy - 14) / 70));
  for (let x = 0; x < 162; x += 3) R(ox + 9 + x, fy + 14 + Math.round(Math.sin(t * 3 + x * 0.3)), 2, 1, mix(C.oil, C.yellow, 0.4));
  g.fryer.baskets.forEach((it, i) => {
    const x0 = ox + 8 + i * 84;
    const box = [x0 + 4, fy + 2, 76, 82];
    if (live && drag) dst(...box, { kind: 'basket', slot: i });
    R(x0 + 12, fy + 6, 56, 1, C.grey); R(x0 + 38, fy - 2, 4, 8, C.ink); R(x0 + 39, fy - 1, 2, 7, C.woodD);
    for (let x = x0 + 12; x <= x0 + 68; x += 6) R(x, fy + 6, 1, 40, mix(C.grey, C.oilD, 0.5));
    for (let y = fy + 12; y < fy + 46; y += 6) R(x0 + 12, y, 57, 1, mix(C.grey, C.oilD, 0.5));
    if (!it) { text('EMPTY', x0 + 40, fy + 26, { color: C.cream, outline: C.oilD, align: 'center' }); return; }
    if (!holding(app, 'basket', i)) drawItem('chicken', x0 + 24, fy + 12 - bounceAmt(app.fx, `fry:${i}`), { p: it.p, scale: 2 });
    meter(x0 + 8, fy + 52, 64, 4, it.p, g.cook.fry, true);
    const st = fryState(it, g.cook.fry);
    if (drag) {
      gestureLabels(x0 + 40, fy + 64, null, st === 'burnt' ? 'BIN' : 'TRAY');
      if (live) src(...box, { kind: 'basket', slot: i });
    } else {
      button(x0 + 15, fy + 62, 50, 13, st === 'burnt' ? 'TOSS' : 'LIFT', st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD, live && (() => G.fryLift(g, i)), `lift:${i}`);
      if (live) hit(x0 + 12, fy + 4, 56, 44, () => G.fryLift(g, i), `lift:${i}`);
    }
  });
  label('GOLD = PERFECT', ox + 90, fy + 86, C.cream);
}

// The wok: one dish at a time. Each toss cooks it; toss again before it lands
// and some spills; stop tossing and it scorches.
export const WOK_CX = 90;
function wokPanel(app, ox, live) {
  const g = app.g, t = app.time, drag = !tapMode(app);
  panelBg(ox);
  WOK_ITEMS.forEach((id, i) => {
    bin(app, ox + 3 + i * 32, PANEL_Y + 2, 31, ITEMS[id].raw, ITEMS[id].bin, {}, live, id, () => G.wokStart(g, id));
  });
  sauceShelf(app, ox, STATION_SAUCES.wok, live);
  const wy = PANEL_Y + 46, cx = ox + WOK_CX;
  rbox(ox + 3, wy, 174, 98, C.steelD);
  R(ox + 6, wy + 3, 168, 92, '#1e1820');
  const w = g.wok;
  const spec = g.cook.wok;
  const inAir = !!w && w.air < spec.air;
  for (let x = -40; x <= 40; x += 4) { // burner flames (taller while the food sits on the heat)
    const f = Math.sin(t * 7 + x * 0.9) * 0.5 + 0.5;
    const hgt = 2 + Math.round(f * (w && !inAir ? 4 : 2));
    R(cx + x, wy + 68 - hgt, 3, hgt, mix(C.blueD, C.teal, f * 0.5));
    R(cx + x + 1, wy + 68 - hgt, 1, 1, mix(C.orange, C.yellow, f));
  }
  const ww = 112, top = wy + 47, deep = 16;
  const st = w ? wokState(w, spec) : null;
  // the dish sits in the wok (the bowl's front covers its bottom); a toss lifts it
  const lift = inAir ? Math.round(Math.sin((w.air / spec.air) * Math.PI) * 11) : 0;
  if (w && !holding(app, 'wok')) drawItem(w.item, cx - 16, top - 22 - lift - bounceAmt(app.fx, 'wok:0'), { p: w.p, scorch: w.scorch, cook: st === 'burnt' ? 'burnt' : null, scale: 2 });
  // the wok: a wide dark bowl with two wooden handles
  for (let j = 0; j < deep; j++) {
    const half = Math.round((ww / 2) * Math.sqrt(1 - (j / deep) * (j / deep)));
    R(cx - half, top + j, half * 2, 1, j === 0 ? C.steel : j < 3 ? '#3a3a4a' : mix('#2a2a36', C.ink, j / 24));
  }
  R(cx - ww / 2 - 10, top + 1, 11, 4, C.woodD); R(cx - ww / 2 - 10, top + 1, 11, 1, C.wood);
  R(cx + ww / 2 - 1, top + 1, 11, 4, C.woodD); R(cx + ww / 2 - 1, top + 1, 11, 1, C.wood);
  const box = [ox + 20, wy + 4, 140, 76];
  if (live && drag) dst(...box, { kind: 'wok' });
  if (!w) {
    text('EMPTY', cx, wy + 24, { color: C.greyDD, outline: null, align: 'center' });
    text(drag ? 'DRAG FOOD IN FROM ABOVE' : 'TAP FOOD ABOVE TO START', cx, wy + 80, { color: C.greyD, align: 'center' });
    return;
  }
  let msg = ITEMS[w.item].short, col = C.cream;
  if (st === 'burnt') { msg = 'BURNT!'; col = C.red; }
  else if (w.scorch > 0) { msg = 'SCORCHING! TOSS!'; col = Math.floor(t * 6) % 2 ? C.red : C.yellow; }
  else if (inAir) { msg = 'IN THE AIR...'; col = C.yellow; }
  else if (st === 'done') { msg = 'DONE! TO THE TRAY'; col = C.greenL; }
  else if (w.tosses + w.spills === 0) { msg = 'TAP TO TOSS'; col = C.yellow; }
  rbox(cx - tw(msg) / 2 - 4, wy + 4, tw(msg) + 9, 10, C.ink);
  text(msg, cx, wy + 6, { color: col, align: 'center' });
  meter(cx - 56, wy + 71, 112, 4, w.p, spec, true);
  // the idle clock: it fills as the dish sits still, then turns red while it scorches
  const idleK = Math.min(1, w.idle / spec.idleSafe);
  if (w.scorch > 0) R(cx - 56, wy + 77, Math.round(112 * w.scorch), 2, C.red);
  else if (idleK > 0.4 && !inAir) R(cx - 56, wy + 77, Math.round(112 * idleK), 2, mix(C.gold, C.red, (idleK - 0.4) / 0.6));
  if (drag) {
    gestureLabels(cx - 34, wy + 83, 'TOSS', null);
    gestureLabels(cx + 34, wy + 83, null, st === 'burnt' ? 'BIN' : 'TRAY');
    if (live) src(...box, { kind: 'wok' });
  } else {
    button(cx - 66, wy + 81, 60, 12, 'TOSS', C.blueD, live && (() => G.wokToss(g)), 'toss');
    button(cx + 6, wy + 81, 60, 12, st === 'burnt' ? 'THROW OUT' : 'TAKE', st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD, live && (() => G.wokTake(g)), 'take:wok');
    if (live) hit(cx - 50, wy + 14, 100, 52, () => G.wokToss(g), 'toss');
  }
}

// The steamer: two bamboo baskets over a pot of water. Food goes in a basket,
// a lid from the rack goes on (it only steams with the lid on), a flick up
// lifts the lid, and the food is dragged to the tray.
const BAMBOO = '#c9a46a', BAMBOO_D = '#9a7440', BAMBOO_L = '#e4c890';
export const steamX = (i) => 8 + i * 84 + 40;
export function lidArt(x, y, w) { // a bamboo dome lid, w wide and 9 tall (+2 for the knob)
  x = Math.round(x); y = Math.round(y);
  R(x + w / 2 - 3, y - 2, 6, 2, C.ink); R(x + w / 2 - 2, y - 2, 4, 1, BAMBOO_D);
  R(x + 4, y, w - 8, 1, C.ink);
  R(x + 2, y + 1, w - 4, 1, C.ink); R(x + 4, y + 1, w - 8, 1, BAMBOO_L);
  R(x + 1, y + 2, w - 2, 5, C.ink); R(x + 2, y + 2, w - 4, 5, BAMBOO);
  R(x + 3, y + 2, w - 6, 1, BAMBOO_L);
  for (let i = x + 5; i < x + w - 4; i += 4) R(i, y + 3, 1, 4, BAMBOO_D);
  R(x, y + 7, w, 2, C.ink); R(x + 1, y + 7, w - 2, 1, BAMBOO_D);
}
function basketArt(mid, y, front) { // 60 x 20: the back rim, or the woven front
  if (!front) { R(mid - 30, y, 60, 3, C.ink); R(mid - 29, y + 1, 58, 1, BAMBOO_D); return; }
  R(mid - 30, y + 3, 60, 17, C.ink);
  R(mid - 29, y + 3, 58, 16, BAMBOO);
  R(mid - 29, y + 3, 58, 2, BAMBOO_L);
  for (let k = y + 7; k < y + 19; k += 4) R(mid - 29, k, 58, 1, BAMBOO_D);
  for (let i = mid - 26; i < mid + 28; i += 6) R(i, y + 8, 1, 10, mix(BAMBOO, BAMBOO_D, 0.5));
}
function steamerPanel(app, ox, live) {
  const g = app.g, t = app.time, drag = !tapMode(app);
  panelBg(ox);
  STEAM_ITEMS.forEach((id, i) => {
    bin(app, ox + 3 + i * 32, PANEL_Y + 2, 31, ITEMS[id].raw, ITEMS[id].bin, {}, live, id, () => G.steamAdd(g, id));
  });
  // the lid rack: one lid for each basket that has none on
  const rx = ox + 67;
  const free = G.freeLids(g) - (holding(app, 'lid') ? 1 : 0);
  rbox(rx, PANEL_Y + 2, 31, 34, C.steel);
  R(rx + 2, PANEL_Y + 4, 27, 30, C.steelD);
  for (let k = 0; k < free; k++) lidArt(rx + 3, PANEL_Y + 23 - k * 9, 25);
  if (free <= 0) text('NONE', rx + 15, PANEL_Y + 16, { color: C.greyD, align: 'center', outline: null });
  label('LIDS', rx + 15, PANEL_Y + 38);
  if (live && drag && G.freeLids(g) > 0) src(rx, PANEL_Y + 2, 31, 42, { kind: 'lid' });
  sauceShelf(app, ox, STATION_SAUCES.steamer, live);
  const fy = PANEL_Y + 46;
  rbox(ox + 3, fy, 174, 98, C.steelD);
  R(ox + 6, fy + 3, 168, 92, '#1e1820');
  // the water pot under the baskets, and its burner
  rbox(ox + 10, fy + 50, 160, 14, C.steel);
  R(ox + 12, fy + 52, 156, 2, mix(C.steel, C.white, 0.3));
  for (let x = 14; x < 168; x += 4) {
    const f = Math.sin(t * 6 + x * 0.8) * 0.5 + 0.5;
    R(ox + x, fy + 64, 3, 3, mix(C.blueD, C.teal, f * 0.5));
  }
  g.steamer.forEach((b, i) => {
    const x0 = ox + 8 + i * 84, mid = x0 + 40;
    const box = [x0 + 4, fy + 2, 76, 82];
    if (live && drag) dst(...box, { kind: 'steamBasket', slot: i });
    const by = fy + 30;
    basketArt(mid, by, false);
    const lidAge = b && b.lidT != null ? g.time - b.lidT : 9;
    if (b && !b.lid && !holding(app, 'steam', i)) drawItem(b.item, mid - 16, by - 20 - bounceAmt(app.fx, `steamer:${i}`), { p: b.p, scale: 2 });
    basketArt(mid, by, true);
    if (b && b.lid) {
      const hop = lidAge < 0.2 ? -Math.round(Math.sin((lidAge / 0.2) * Math.PI) * 4) : 0;
      lidArt(mid - 31, by - 8 + hop, 62);
      // steam leaks from under the lid
      const k = (t * 1.2 + i * 0.5) % 1;
      R(mid - 34 - Math.round(k * 3), by - 2 - Math.round(k * 8), 2, 2, mix('#d8d8e8', '#1e1820', k));
      R(mid + 32 + Math.round(k * 3), by - 3 - Math.round(k * 9), 2, 2, mix('#d8d8e8', '#1e1820', k));
    }
    if (!b) { text('EMPTY', mid, fy + 20, { color: C.greyDD, outline: null, align: 'center' }); return; }
    const st = steamState(b, g.cook.steam);
    meter(x0 + 8, fy + 70, 64, 4, b.p, g.cook.steam, b.lid);
    if (drag) {
      if (b.lid) gestureLabels(mid, fy + 78, 'LIFT', null);
      else {
        if (st === 'raw') text('NEEDS A LID', mid, fy + 78, { color: Math.floor(t * 3) % 2 ? C.yellow : C.cream, align: 'center' });
        else if (st === 'burnt') text('SOGGY', mid, fy + 78, { color: C.red, align: 'center' });
        gestureLabels(mid, fy + 86, null, st === 'burnt' ? 'BIN' : 'TRAY');
      }
      if (live) src(...box, { kind: 'steam', slot: i });
    } else {
      const takeCol = st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD;
      button(x0 + 6, fy + 79, 32, 12, b.lid ? 'LIFT' : 'LID', C.blueD, live && (() => G.steamLid(g, i)), `lid:${i}`);
      button(x0 + 42, fy + 79, 32, 12, st === 'burnt' ? 'TOSS' : 'TAKE', takeCol, live && (() => G.steamTake(g, i)), `steamtake:${i}`);
    }
  });
}

// The noodle pot: kettle water in, wait for the boil, ramyeon in, then to the
// tray in the gold. The broth goes with the noodles, so the pot is empty again.
export const POT_CX = 90;
export function kettleArt(x, y) { // 28 x 24
  x = Math.round(x); y = Math.round(y);
  R(x + 8, y, 12, 3, C.ink); R(x + 9, y + 1, 10, 1, C.greyD); // handle
  R(x + 7, y + 2, 2, 6, C.ink); R(x + 19, y + 2, 2, 6, C.ink);
  R(x + 4, y + 7, 20, 2, C.ink); R(x + 12, y + 6, 4, 2, C.ink); // lid
  R(x + 2, y + 9, 24, 13, C.ink); R(x + 3, y + 9, 22, 12, '#c8d0dc');
  R(x + 4, y + 10, 4, 9, C.white); R(x + 20, y + 10, 4, 10, '#9aa6b8');
  R(x + 2, y + 21, 24, 2, C.ink);
  R(x + 24, y + 12, 3, 3, C.ink); R(x + 26, y + 10, 2, 3, C.ink); R(x + 25, y + 13, 1, 1, '#9aa6b8'); // spout
}
function potPanel(app, ox, live) {
  const g = app.g, t = app.time, drag = !tapMode(app);
  panelBg(ox);
  bin(app, ox + 3, PANEL_Y + 2, 44, 'ramyeon_raw', 'RAMYEON', {}, live, 'ramyeon', () => G.potAdd(g, 'ramyeon'));
  const kx = ox + 51;
  rbox(kx, PANEL_Y + 2, 44, 34, C.steel);
  R(kx + 2, PANEL_Y + 4, 40, 30, C.steelD);
  if (!holding(app, 'kettle')) kettleArt(kx + 8, PANEL_Y + 7 - bounceAmt(app.fx, 'bin:kettle'));
  label('KETTLE', kx + 22, PANEL_Y + 38);
  if (live) {
    if (drag) src(kx, PANEL_Y + 2, 44, 42, { kind: 'kettle' });
    else hit(kx, PANEL_Y + 2, 44, 42, () => G.potWater(g), 'bin:kettle');
  }
  sauceShelf(app, ox, STATION_SAUCES.pot, live);
  const wy = PANEL_Y + 46, cx = ox + POT_CX;
  rbox(ox + 3, wy, 174, 98, C.steelD);
  R(ox + 6, wy + 3, 168, 92, '#1e1820');
  const pt = g.pot, spec = g.cook.pot;
  const boiling = potBoiling(pt);
  for (let x = -40; x <= 40; x += 4) { // burner
    const f = Math.sin(t * 7 + x * 0.9) * 0.5 + 0.5;
    const hgt = 2 + Math.round(f * (pt ? 3 : 1));
    R(cx + x, wy + 70 - hgt, 3, hgt, mix(C.blueD, C.teal, f * 0.5));
  }
  // the pot: a wide steel pot with two handles
  const top = wy + 26, ph = 40;
  R(cx - 50, top + 4, 8, 4, C.ink); R(cx + 42, top + 4, 8, 4, C.ink);
  R(cx - 49, top + 5, 6, 2, C.steel); R(cx + 43, top + 5, 6, 2, C.steel);
  R(cx - 43, top, 86, ph, C.ink);
  R(cx - 42, top + 1, 84, ph - 2, '#5a6478');
  R(cx - 42, top + 1, 84, 2, C.steel);
  R(cx - 40, top + 3, 80, 6, '#2a2236'); // inside, above the water
  if (pt) {
    const k = pt.boil;
    R(cx - 40, top + 5, 80, 4, mix('#3a5a8a', '#6aa0d8', k)); // water
    if (boiling) for (let i = 0; i < 9; i++) {
      const bx = cx - 36 + ((i * 23 + Math.floor(t * 9) * 7) % 72);
      R(bx, top + 4 - (Math.floor(t * 8 + i) % 2), 2, 2, C.white);
    }
    if (pt.item && !holding(app, 'pot')) { // noodles swirl on the surface
      const col = pt.p > spec.perfectHi ? mix('#f6d06a', '#d8d0b8', Math.min(1, (pt.p - spec.perfectHi) / 0.25)) : pt.p < 0.3 ? '#f2c45a' : '#f6d06a';
      for (let i = -34; i < 34; i += 3) R(cx + i, top + 5 + Math.round(Math.sin(i * 0.7 + t * 4) * 1.2), 2, 1, col);
      for (let i = -30; i < 30; i += 4) R(cx + i, top + 7 + Math.round(Math.cos(i * 0.5 + t * 3)), 3, 1, mix(col, '#c8902a', 0.3));
    }
  }
  for (let y = top + 12; y < top + ph - 3; y += 6) R(cx - 41, y, 82, 1, '#4c5466');
  const box = [ox + 20, wy + 4, 140, 76];
  if (live && drag) dst(...box, { kind: 'pot' });
  let msg, col = C.cream;
  if (!pt) { msg = drag ? 'DRAG THE KETTLE ON' : 'TAP THE KETTLE'; col = C.greyD; }
  else if (!boiling) { msg = pt.queued ? 'HEATING... NOODLES NEXT' : 'HEATING...'; col = C.teal; }
  else if (!pt.item) { msg = 'BOILING! ADD RAMYEON'; col = Math.floor(t * 3) % 2 ? C.yellow : C.cream; }
  else {
    const st = potState(pt, spec);
    if (st === 'burnt') { msg = 'TOO SOFT! BIN IT'; col = C.red; }
    else if (st === 'done') { msg = 'DONE! TO THE TRAY'; col = C.greenL; }
    else msg = ITEMS[pt.item].short;
  }
  rbox(cx - tw(msg) / 2 - 4, wy + 6, tw(msg) + 9, 10, C.ink);
  text(msg, cx, wy + 8, { color: col, align: 'center' });
  if (pt && !boiling) { // the boil bar
    R(cx - 57, wy + 71, 114, 6, C.ink); R(cx - 56, wy + 72, 112, 4, C.greyDD);
    R(cx - 56, wy + 72, Math.round(112 * pt.boil), 4, C.teal);
  } else if (pt && pt.item) meter(cx - 56, wy + 72, 112, 4, pt.p, spec, true);
  if (!pt || !pt.item) return;
  const st = potState(pt, spec);
  if (drag) {
    gestureLabels(cx + 34, wy + 83, null, st === 'burnt' ? 'BIN' : 'TRAY');
    if (live) src(...box, { kind: 'pot' });
  } else {
    button(cx + 6, wy + 81, 60, 12, st === 'burnt' ? 'THROW OUT' : 'TAKE', st === 'done' ? C.greenD : st === 'burnt' ? C.redD : C.steelD, live && (() => G.potTake(g)), 'take:pot');
    if (live) hit(cx - 44, top, 88, ph, () => G.potTake(g), 'take:pot');
  }
}

function lockedPanel(app, ox, s) {
  const P = LAY.panel.local;
  R(ox + P.x, P.y, P.w, P.h, '#191424');
  for (let y = PANEL_Y - 4 * Math.ceil((PANEL_Y - P.y) / 4); y < P.y + P.h; y += 4) R(ox + P.x, y, P.w, 1, '#1e1830');
  const cx = ox + 90;
  R(cx - 9, PANEL_Y + 26, 18, 16, C.ink); R(cx - 8, PANEL_Y + 27, 16, 14, C.greyD); R(cx - 5, PANEL_Y + 30, 10, 12, C.ink); R(cx - 4, PANEL_Y + 31, 8, 11, '#191424');
  R(cx - 14, PANEL_Y + 40, 28, 24, C.ink); R(cx - 12, PANEL_Y + 42, 24, 20, C.greyD); R(cx - 1, PANEL_Y + 47, 3, 8, C.ink);
  text(STATIONS[s.id].name.toUpperCase(), cx, PANEL_Y + 74, { font: 'big', align: 'center', color: C.cream });
  text(`UNLOCKS IN LEVEL ${STATIONS[s.id].unlock}`, cx, PANEL_Y + 88, { align: 'center', color: C.gold });
  const teaser = {
    grill: 'GALBI AND SAUSAGES', fryer: 'FRIED CHICKEN AND BEER', wok: 'TOSS NOODLES AND RICE',
    steamer: 'MANDU AND STEAMED BUNS', pot: 'RAMYEON, BOILED TO ORDER',
  }[s.id];
  if (teaser) text(teaser, cx, PANEL_Y + 100, { align: 'center', color: C.greyD });
}

function drawPanel(app, idx, ox, live) {
  const s = app.g.stations[idx];
  if (s.status !== 'open') lockedPanel(app, ox, s);
  else if (s.id === 'counter') counterPanel(app, ox, live);
  else if (s.id === 'grill') grillPanel(app, ox, live);
  else if (s.id === 'fryer') fryerPanel(app, ox, live);
  else if (s.id === 'wok') wokPanel(app, ox, live);
  else if (s.id === 'steamer') steamerPanel(app, ox, live);
  else if (s.id === 'pot') potPanel(app, ox, live);
  drawParts(app.fx, s.id, ox);
}

// ---------- tray ----------
export const TRAY_BOX = { x: 2, y: TRAY_Y + 4, w: 141, h: 40 };
export const trayPitch = (g) => (g.trayMax >= 5 ? 27 : 34);
export const traySlotX = (g, i) => TRAY_BOX.x + 2 + i * trayPitch(g) + Math.floor(trayPitch(g) / 2) - 16;
export const HANDLE = { x: 146, y: TRAY_Y + 4, w: 32, h: 40 };
export const BIN_BOX = { x: 154, y: TRAY_Y + 47, w: 26, h: 23 };

function tray(app, live) {
  const g = app.g, t = app.time, drag = !tapMode(app);
  const TL = LAY.tray.local; // the whole tray strip, in design coordinates
  R(TL.x, TL.y, TL.w, TL.h, C.woodD);
  R(TL.x, TRAY_Y, TL.w, 1, C.ink);
  const B = TRAY_BOX;
  rbox(B.x, B.y, B.w, B.h, C.woodL);
  R(B.x + 2, B.y + 2, B.w - 4, B.h - 4, C.wood);
  setTrayBox(B);
  if (live && drag) dst(B.x, B.y, B.w, B.h, { kind: 'tray' });
  for (let i = 0; i < g.trayMax; i++) {
    const x = traySlotX(g, i), y = B.y + 2;
    R(x + 4, y + 30, 24, 2, mix(C.wood, C.ink, 0.3));
    const it = g.tray[i];
    if (!it) continue;
    const fits = g.held && canSauce(it, g.held);
    if (fits && Math.floor(t * 5) % 2) { R(x, y, 32, 36, C.yellow); R(x + 1, y + 1, 30, 34, C.wood); }
    if (!holding(app, 'tray', i)) {
      drawItem(it.item, x, y + 2 - bounceAmt(app.fx, `tray:${i}`), { cook: it.cook, sauce: it.sauce, scale: 2 });
      if (it.cook === 'raw') text('RAW', x + 16, y + 28, { color: C.pink, align: 'center' });
      if (it.cook === 'burnt') text('BURNT', x + 16, y + 28, { color: C.red, align: 'center' });
    }
    if (!live) continue;
    const pw = trayPitch(g);
    const slot = [x + 16 - Math.floor(pw / 2), y, pw, 36];
    if (drag) {
      src(...slot, { kind: 'tray', index: i });
      dst(...slot, { kind: 'trayItem', index: i });
    } else {
      hit(...slot, () => G.tapTray(g, i), 'tray');
      R(x + 24, y - 2, 9, 9, C.ink); R(x + 25, y - 1, 7, 7, C.redD); // trash badge
      for (let k = 0; k < 5; k++) { R(x + 26 + k, y + k, 1, 1, C.white); R(x + 30 - k, y + k, 1, 1, C.white); }
      hit(x + 22, y - 4, 13, 12, () => G.trashTray(g, i), 'trash');
    }
  }
  // serve: a handle to drag onto a guest (drag) or a button (tap)
  const can = g.phase === 'play' && G.waiting(g).length > 0 && g.tray.length > 0;
  const pulse = can && Math.floor(t * 3) % 2 ? 1 : 0;
  const Hn = HANDLE;
  const fill = holding(app, 'serve') ? C.greyDD : can ? C.green : C.greyD;
  rbox(Hn.x, Hn.y + 1, Hn.w, Hn.h, C.ink);
  rbox(Hn.x, Hn.y - pulse, Hn.w, Hn.h, fill);
  R(Hn.x + 2, Hn.y + 1 - pulse, Hn.w - 4, 2, mix(fill, C.white, 0.35));
  if (drag) {
    arrowIcon(Hn.x + 14, Hn.y + 6 - pulse, 'up', C.white);
    text('SERVE', Hn.x + 16, Hn.y + 15 - pulse, { color: C.white, align: 'center' });
    text('TAP', Hn.x + 16, Hn.y + 27 - pulse, { color: mix(fill, C.white, 0.6), align: 'center', outline: mix(fill, C.ink, 0.5) }); // a tap serves; a drag onto a guest does too
    if (live && g.tray.length) src(Hn.x - 2, Hn.y - 2, Hn.w + 4, Hn.h + 4, { kind: 'serve' });
    const Bn = BIN_BOX;
    const open = !!app.drag && app.drag.lifted && accepts(g, app.drag.payload, { kind: 'trash' });
    binIcon(Bn.x + 8, Bn.y + 6, open ? C.redL : C.steel, open);
    if (live) dst(Bn.x, Bn.y, Bn.w, Bn.h, { kind: 'trash' });
  } else {
    text('SERVE', Hn.x + 16, Hn.y + 14 - pulse, { color: C.white, align: 'center' });
    R(Hn.x + 8, Hn.y + 26 - pulse, 16, 2, C.white); R(Hn.x + 14, Hn.y + 24 - pulse, 4, 6, C.white);
    if (live) hit(Hn.x - 2, Hn.y - 2, Hn.w + 4, Hn.h + 4, () => G.serveAuto(g), 'serve');
  }
  const hx = drag ? 77 : 90;
  text(hintFor(app), hx, TRAY_Y + 56, { align: 'center', color: g.held ? C.yellow : C.cream });
  const sub = subHint(app);
  if (sub) text(sub, hx, TRAY_Y + 64, { align: 'center', color: C.grey });
}
function hintFor(app) {
  const g = app.g, s = G.currentStation(g), drag = !tapMode(app);
  if (g.held) return 'TAP FOOD ON THE TRAY TO SAUCE IT';
  if (app.drag && app.drag.lifted) return dragHint(app.drag.payload);
  const ready = g.tray.length && G.waiting(g).some((c) => scoreServe(c.order, g.tray, 1).mood === 'happy');
  if (ready) return 'ORDER READY: TAP SERVE!';
  if (s.status !== 'open') return 'SWIPE TO GO BACK';
  if (drag) {
    return {
      counter: 'DRAG FOOD DOWN TO THE TRAY', grill: 'DRAG MEAT ON. TAP IT TO FLIP',
      fryer: 'BATTER, BASKET, THEN THE TRAY', wok: 'TAP THE WOK TO TOSS. LET IT LAND',
      steamer: 'FOOD IN, LID ON, TAP TO LIFT', pot: 'KETTLE, WAIT FOR THE BOIL, NOODLES',
    }[s.id];
  }
  return {
    counter: 'TAP DRINKS AND FOOD TO TAKE THEM', grill: 'COOK BOTH SIDES: FLIP, THEN TAKE',
    fryer: 'BATTER, FRY, LIFT IN THE GOLD', wok: 'TOSS, WAIT FOR IT TO LAND, TOSS',
    steamer: 'TAP FOOD. TAKE IT IN THE GOLD', pot: 'TAP THE KETTLE, THEN RAMYEON',
  }[s.id];
}
function subHint(app) {
  const g = app.g;
  const open = g.stations.filter((s) => s.status === 'open').length;
  if (open > 1) return '< SWIPE TO SWITCH STATIONS >';
  return tapMode(app) ? 'X ON A TRAY ITEM THROWS IT OUT' : 'DRAG OFF THE TRAY TO THROW OUT';
}

// ---------- drag overlay ----------
// Draws what is in the player's hand (anything a drag payload can be).
export function drawPayload(g, p, x, y) {
  x = Math.round(x); y = Math.round(y);
  switch (p.kind) {
    case 'ready': return drawItem(p.item, x, y, { scale: 2 });
    case 'bin': {
      const k = ITEMS[p.item].kind;
      if (k === 'fry') return drawItem('chicken', x, y, { raw: true, scale: 2 });
      if (k === 'wok' || k === 'steam' || k === 'pot') return drawItem(ITEMS[p.item].raw, x, y, { scale: 2 });
      return drawItem(p.item, x, y, { p: 0, scale: 2 });
    }
    case 'grill': { const it = g.grill[p.slot]; if (it) drawItem(it.item, x, y, { up: it.sides[1 - it.down], scale: 2 }); return undefined; }
    case 'bowl': return drawItem('chicken', x, y, { p: 0, scale: 2 });
    case 'basket': { const it = g.fryer.baskets[p.slot]; if (it) drawItem('chicken', x, y, { p: it.p, scale: 2 }); return undefined; }
    case 'wok': if (g.wok) drawItem(g.wok.item, x, y, { p: g.wok.p, scorch: g.wok.scorch, scale: 2 }); return undefined;
    case 'lid': return lidArt(x, y + 12, 32);
    case 'steam': { const b = g.steamer[p.slot]; if (b) drawItem(b.item, x, y, { p: b.p, scale: 2 }); return undefined; }
    case 'kettle': return kettleArt(x + 2, y + 4);
    case 'pot': if (g.pot && g.pot.item) drawItem(g.pot.item, x, y, { p: g.pot.p, scale: 2 }); return undefined;
    case 'sauce': return drawSauce(p.id, x, y, false, 2);
    case 'tray': { const it = g.tray[p.index]; if (it) drawItem(it.item, x, y, { cook: it.cook, sauce: it.sauce, scale: 2 }); return undefined; }
    case 'serve': { // the whole tray, small
      rbox(x - 6, y + 6, 44, 22, C.woodL); R(x - 4, y + 8, 40, 18, C.wood);
      g.tray.slice(0, 5).forEach((it, i) => drawItem(it.item, x - 4 + i * 6, y + 9, { cook: it.cook }));
      return undefined;
    }
    default: return undefined;
  }
}
function dragOverlay(app, targets) {
  const d = app.drag, g = app.g;
  if (d && d.lifted) {
    const blink = Math.floor(app.time * 4) % 2;
    const ok = targets.filter((r) => accepts(g, d.payload, r.target));
    const hover = findTarget(ok, d.x, d.y);
    for (const r of ok) {
      const over = hover === r;
      if (over) R(r.x, r.y, r.w, r.h, 'rgba(254, 231, 97, 0.22)');
      const col = over ? C.yellow : blink ? C.gold : mix(C.gold, C.ink, 0.4);
      R(r.x, r.y, r.w, 1, col); R(r.x, r.y + r.h - 1, r.w, 1, col);
      R(r.x, r.y, 1, r.h, col); R(r.x + r.w - 1, r.y, 1, r.h, col);
    }
    R(Math.round(d.x) - 10, Math.round(d.y) + 1, 20, 3, 'rgba(13, 10, 26, 0.45)'); // where it lands
    drawPayload(g, d.payload, d.x - 16, d.y - 26);
  }
  const s = app.snap;
  if (s) { // snapping back home
    const k = Math.min(1, s.t / 0.16);
    drawPayload(g, s.payload, s.x + (s.tx - s.x) * k - 16, s.y - 26 + (s.ty - s.y + 10) * k);
  }
}

function toastBox(app) {
  const ts = app.fx.toast;
  if (!ts) return;
  const w = tw(ts.str, 'big') + 12;
  const y = PANEL_Y + 52 - Math.round(Math.min(1, ts.t * 6) * 6);
  rbox(90 - w / 2, y, w, 15, ts.good ? C.greenD : C.redD);
  text(ts.str, 90, y + 4, { font: 'big', align: 'center', color: C.white });
}

// ---------- the game frame (screens.js adds the overlays) ----------
export function drawGame(app, reg) {
  const g = app.g, S = LAY.scene, P = LAY.panel, T = LAY.tray;
  drawMarket(app.time, { rain: !!g.def.rain }, S);
  inScene(() => drawGuests(app));
  if (g.def.rain) drawRain(app.time, S);
  awning(S);
  counterBand(S);
  inScene(() => {
    counterDecor(app.time, { ...dogLook(g, app.time), special: g.def.special });
    drawOrders(app);
    dogExtras(app);
    if (g.dog && g.phase === 'play' && !app.slide) { // give Chimaek her treat
      const B = DOG_BOX;
      if (!tapMode(app)) {
        dst(B.x, B.y, B.w, B.h, { kind: 'dog' });
        hit(B.x, B.y, B.w, B.h, () => app.say(g.dog.want ? 'DRAG PLAIN BEEF ONTO HER' : 'GOOD DOG'), 'dog');
      } else hit(B.x, B.y, B.w, B.h, () => G.tapDog(g), 'dog');
    }
    drawParts(app.fx, 'world');
    banner(app);
  });
  if (LAY.mode === 'wide') { // the kitchen's frame, next to the street
    R(P.x - 3, LAY.tabs.y - 3, 3, LAY.H - LAY.tabs.y + 3, C.woodD);
    R(P.x - 3, LAY.tabs.y - 3, LAY.W - P.x + 3, 3, C.woodD);
    R(P.x - 4, LAY.tabs.y - 4, 1, LAY.H - LAY.tabs.y + 4, C.ink);
    R(P.x - 4, LAY.tabs.y - 4, LAY.W - P.x + 4, 1, C.ink);
  }
  tabs(app);
  const sl = app.slide;
  withClip(P.x, P.y, P.w, P.h, () => {
    if (sl && sl.k < 1) {
      const e = 1 - Math.pow(1 - sl.k, 3);
      withOrigin(P.tx, P.ty, () => {
        drawPanel(app, sl.from, Math.round(-sl.dir * P.w * e), false);
        drawPanel(app, g.station, Math.round(sl.dir * P.w * (1 - e)), false);
      });
    } else withOrigin(P.tx, P.ty, () => drawPanel(app, g.station, 0, g.phase === 'play'), [0, PANEL_Y, 180, TRAY_Y]);
  });
  const blink = Math.floor(app.time * 2) % 2;
  const ay = P.ty + PANEL_Y; // the switch arrows sit on the panel's edges
  if (g.station > 0) {
    text('<', P.x + 2, ay + 70, { font: 'big', color: blink ? C.cream : C.grey });
    hit(P.x, ay + 54, 9, 40, () => app.switchStation(-1), 'arrow');
  }
  if (g.station < g.stations.length - 1) {
    text('>', P.x + P.w - 2, ay + 70, { font: 'big', color: blink ? C.cream : C.grey, align: 'right' });
    hit(P.x + P.w - 9, ay + 54, 9, 40, () => app.switchStation(1), 'arrow');
  }
  withOrigin(T.tx, T.ty, () => { tray(app, g.phase === 'play' && !sl); drawParts(app.fx, 'tray'); }, [0, TRAY_Y, 180, 390]);
  if (g.held && app.pointer) drawSauce(g.held, Math.round(app.pointer.x) - 16, Math.round(app.pointer.y) - 40, false, 2);
  dragOverlay(app, reg.targets);
  withOrigin(P.tx, P.ty, () => toastBox(app));
  inScene(() => drawFloats(app.fx));
  hud(app);
}
