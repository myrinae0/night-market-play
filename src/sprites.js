// Code-drawn pixel art: menu items, sauce bottles, customers, the Shiba, icons.
import { C, R, box, rbox, mix, makeCanvas, getCtx, setCtx } from './gfx.js';
import { COOK } from './data.js';

// ---------- cooking colours ----------
function cookColor(raw, cooked, burnt, p, spec) {
  if (p <= spec.perfectLo) return mix(raw, cooked, Math.pow(p / spec.perfectLo, 1.3));
  if (p <= spec.perfectHi) return cooked;
  return mix(cooked, burnt, (p - spec.perfectHi) / (spec.burnt - spec.perfectHi));
}
export const STATE_P = { raw: 0.25, done: 0.95, burnt: 1.45 };

const SAUCE_COL = {
  spicy: [C.red, C.redL], honey: [C.gold, C.yellow],
  yangnyeom: ['#d4322c', '#ff6a4a'], soygarlic: ['#7a3d1c', '#b8672e'],
};

// ---------- item bodies (16 x 16, drawn at x, y) ----------
const ITEM_DRAW = {
  soda(x, y) {
    R(x + 5, y + 1, 6, 1, C.ink);
    R(x + 4, y + 2, 8, 13, C.ink);
    R(x + 5, y + 2, 6, 2, C.grey);
    R(x + 5, y + 4, 6, 10, C.red);
    R(x + 5, y + 8, 6, 2, C.white);
    R(x + 6, y + 5, 1, 8, C.redL);
    R(x + 7, y + 1, 2, 1, C.grey);
  },
  tea(x, y) {
    R(x + 9, y, 1, 5, C.ink); R(x + 10, y, 1, 1, C.ink); // straw
    R(x + 3, y + 4, 10, 1, C.ink);
    R(x + 3, y + 5, 10, 10, C.ink);
    R(x + 4, y + 5, 8, 1, C.white);
    R(x + 4, y + 6, 8, 8, '#c98a3a');
    R(x + 5, y + 14, 6, 1, C.ink);
    R(x + 4, y + 9, 8, 2, C.cream); // label
    R(x + 5, y + 7, 1, 6, '#e0b070');
    R(x + 9, y + 1, 1, 4, C.white);
  },
  kimbap(x, y) {
    R(x + 1, y + 11, 14, 3, C.ink); R(x + 2, y + 11, 12, 2, C.white); // plate
    for (const [ox, oy] of [[1, 5], [6, 3], [10, 6]]) {
      R(x + ox, y + oy, 6, 6, C.ink);
      R(x + ox + 1, y + oy + 1, 4, 4, C.white);
      R(x + ox + 2, y + oy + 2, 1, 1, C.yellow);
      R(x + ox + 3, y + oy + 2, 1, 1, C.orange);
      R(x + ox + 2, y + oy + 3, 1, 1, C.green);
      R(x + ox + 3, y + oy + 3, 1, 1, C.pinkD);
    }
  },
  toast(x, y) {
    R(x + 1, y + 3, 14, 11, C.ink);
    R(x + 2, y + 4, 12, 2, C.woodL); // top bread
    R(x + 2, y + 6, 12, 1, C.greenL); // cabbage
    R(x + 2, y + 7, 12, 2, C.yellow); // egg
    R(x + 2, y + 9, 12, 1, C.orange); // ham
    R(x + 2, y + 10, 12, 2, C.woodL); // bottom bread
    R(x + 1, y + 10, 14, 5, C.ink); R(x + 2, y + 11, 12, 3, C.cream); // paper wrap
    R(x + 3, y + 12, 10, 1, C.red);
    R(x + 3, y + 4, 4, 1, C.cream);
  },
  beer(x, y) {
    R(x + 2, y + 2, 10, 13, C.ink);
    R(x + 12, y + 5, 3, 7, C.ink); R(x + 12, y + 7, 1, 3, C.night1); // handle
    R(x + 3, y + 3, 8, 3, C.white); // foam
    R(x + 2, y + 1, 4, 2, C.ink); R(x + 3, y + 2, 2, 1, C.white);
    R(x + 7, y + 1, 4, 2, C.ink); R(x + 8, y + 2, 2, 1, C.white);
    R(x + 3, y + 6, 8, 8, C.gold);
    R(x + 4, y + 7, 1, 6, C.yellow);
    R(x + 8, y + 9, 1, 1, C.yellow); R(x + 6, y + 11, 1, 1, C.yellow);
  },
  skewer(x, y, o) {
    const top = cookColor('#f2a7a0', '#a8582c', '#2a1a1a', o.up, COOK.grill);
    const bot = cookColor('#f2a7a0', '#a8582c', '#2a1a1a', o.down, COOK.grill);
    R(x, y + 8, 16, 1, C.woodL); R(x, y + 9, 16, 1, C.woodD); // stick
    for (const ox of [2, 6.5, 11]) {
      R(x + ox, y + 5, 4, 7, C.ink);
      R(x + ox - 1, y + 6, 6, 5, C.ink);
      R(x + ox, y + 6, 4, 4, top);
      R(x + ox, y + 10, 4, 1, bot);
    }
    R(x + 5.5, y + 7, 1, 3, C.greenL); R(x + 10, y + 7, 1, 3, C.greenL); // scallion
    if (o.up > 0.6) for (const ox of [3, 7.5, 12]) R(x + ox, y + 7, 2, 1, mix(top, C.ink, 0.45)); // grill marks
  },
  sausage(x, y, o) {
    const top = cookColor('#f08a8a', '#b4442c', '#2a1a1a', o.up, COOK.grill);
    const bot = cookColor('#f08a8a', '#b4442c', '#2a1a1a', o.down, COOK.grill);
    R(x, y + 8, 3, 2, C.woodL);
    R(x + 2, y + 5, 13, 7, C.ink);
    R(x + 3, y + 4, 11, 9, C.ink);
    R(x + 3, y + 5, 11, 5, top);
    R(x + 3, y + 10, 11, 2, bot);
    R(x + 4, y + 6, 6, 1, mix(top, C.white, 0.35));
    if (o.up > 0.6) for (const ox of [5, 8, 11]) R(x + ox, y + 7, 1, 2, mix(top, C.ink, 0.5));
  },
  chicken(x, y, o) {
    const col = o.raw ? '#f2b0a8' : cookColor('#f3e1b0', '#d9902e', '#3a2014', o.up, COOK.fry);
    const hi = mix(col, C.white, 0.35), lo = mix(col, C.ink, 0.35);
    for (const [ox, oy, w, h] of [[1, 6, 8, 7], [7, 4, 8, 8], [4, 9, 8, 6]]) {
      R(x + ox, y + oy + 1, w, h - 2, C.ink);
      R(x + ox + 1, y + oy, w - 2, h, C.ink);
      R(x + ox + 1, y + oy + 1, w - 2, h - 2, col);
      R(x + ox + 1, y + oy + h - 2, w - 2, 1, lo);
      R(x + ox + 2, y + oy + 1, 2, 1, hi);
      if (!o.raw) R(x + ox + w - 3, y + oy + 3, 1, 1, lo); // crunchy bits
    }
  },
};

function drawSauce(id, sauce, x, y) {
  const [a, b] = SAUCE_COL[sauce];
  if (id === 'chicken') {
    for (const [ox, oy, w] of [[2, 7, 6], [8, 5, 6], [5, 10, 6]]) {
      R(x + ox, y + oy, w, 2, a);
      R(x + ox + 1, y + oy, 2, 1, b);
    }
    // sesame seeds
    for (const [ox, oy] of [[4, 8], [10, 6], [7, 11], [12, 9]]) R(x + ox, y + oy, 1, 1, C.white);
  } else {
    R(x + 2, y + 6, 13, 1, a);
    R(x + 3, y + 7, 2, 1, b); R(x + 8, y + 7, 2, 1, b); R(x + 12, y + 7, 2, 1, b);
    if (sauce === 'spicy') { R(x + 5, y + 5, 1, 1, C.greenL); R(x + 11, y + 5, 1, 1, C.greenL); }
  }
}

const itemCache = new Map();
// Draws a menu item. opts: up/down (grill progress per side), p (fry), cook
// ('raw'|'done'|'burnt' for tray items), sauce, raw (uncooked chicken), scale.
export function drawItem(id, x, y, opts = {}) {
  const scale = opts.scale || 1;
  let up = opts.up, down = opts.down;
  if (up == null) up = opts.p ?? STATE_P[opts.cook] ?? 0.95;
  if (down == null) down = up;
  const q = (v) => Math.round(v * 20) / 20;
  const key = `${id}|${q(up)}|${q(down)}|${opts.sauce || ''}|${opts.raw ? 1 : 0}`;
  let cv = itemCache.get(key);
  if (!cv) {
    cv = makeCanvas(16, 16);
    const prev = getCtx();
    setCtx(cv.getContext('2d'));
    ITEM_DRAW[id](0, 0, { up: q(up), down: q(down), raw: opts.raw });
    if (opts.sauce) drawSauce(id, opts.sauce, 0, 0);
    setCtx(prev);
    if (itemCache.size > 600) itemCache.clear();
    itemCache.set(key, cv);
  }
  getCtx().drawImage(cv, Math.round(x), Math.round(y), 16 * scale, 16 * scale);
}

// ---------- sauce bottles (12 x 20) ----------
export function drawBottle(sauce, x, y, lifted = false) {
  const [a, b] = SAUCE_COL[sauce];
  if (lifted) y -= 3;
  R(x + 5, y, 2, 3, C.ink); R(x + 4, y + 2, 4, 3, C.ink); R(x + 5, y + 3, 2, 1, C.white);
  R(x + 1, y + 5, 10, 15, C.ink);
  R(x + 2, y + 6, 8, 13, a);
  R(x + 3, y + 7, 1, 10, b);
  R(x + 2, y + 10, 8, 5, C.cream);
  R(x + 4, y + 12, 4, 1, a);
}

// ---------- small icons ----------
export function coinIcon(x, y) {
  R(x + 1, y, 5, 7, C.ink); R(x, y + 1, 7, 5, C.ink);
  R(x + 1, y + 1, 5, 5, C.gold); R(x + 2, y + 1, 2, 1, C.yellow); R(x + 3, y + 2, 1, 3, C.orange);
}
export function lockIcon(x, y, col = C.grey) {
  R(x + 2, y, 5, 5, C.ink); R(x + 3, y + 1, 3, 4, C.greyDD);
  R(x, y + 4, 9, 7, C.ink); R(x + 1, y + 5, 7, 5, col); R(x + 4, y + 6, 1, 2, C.ink);
}
export function speakerIcon(x, y, muted) {
  R(x, y + 3, 3, 4, C.white); R(x + 3, y + 2, 1, 6, C.white); R(x + 4, y + 1, 1, 8, C.white);
  if (muted) { for (let i = 0; i < 4; i++) { R(x + 6 + i, y + 3 + i, 1, 1, C.red); R(x + 9 - i, y + 3 + i, 1, 1, C.red); } }
  else { R(x + 6, y + 3, 1, 4, C.white); R(x + 8, y + 2, 1, 6, C.white); }
}
export function starIcon(x, y, filled, s = 1) {
  const rows = ['....#....', '...###...', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '.#.....#.'];
  const fill = filled ? C.gold : C.greyDD, hi = filled ? C.yellow : C.greyD;
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] === '#') R(x + i * s, y + j * s, s, s, j < 2 ? hi : fill);
  });
}
export function heartIcon(x, y, col = C.red) {
  const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === '#') R(x + i, y + j, 1, 1, col); });
}

// ---------- customers ----------
const SKIN = ['#f3c7a0', '#e0a77a', '#c18256', '#8d5a3c'];
const HAIR = ['#1a1020', '#5a3220', '#2a2440', '#d77a76', '#9aa3b5', '#7a4a1a'];
const SHIRT = ['#0099db', '#3e8948', '#8b4a9c', '#f77622', '#e43b44', '#2ce8f5', '#feae34'];

// Draws a customer whose shoulders sit on baseline y (the counter top), centred on cx.
export function drawCustomer(look, cx, y, { mood = 'wait', t = 0, low = false } = {}) {
  if (look === 'shiba') return drawShiba(cx, y, { big: true, mood, t });
  const skin = SKIN[look % 4], hair = HAIR[(look * 5 + 1) % HAIR.length], shirt = SHIRT[(look * 3 + 2) % SHIRT.length];
  const bob = mood === 'happy' ? -Math.abs(Math.round(Math.sin(t * 12) * 2)) : Math.round(Math.sin(t * 2.2) * 0.6);
  const x = cx - 16, top = y - 56 + bob;
  // body
  R(x + 2, top + 32, 28, 26, C.ink);
  R(x + 3, top + 33, 26, 25, shirt);
  R(x + 12, top + 33, 8, 3, mix(shirt, C.ink, 0.3));
  R(x + 4, top + 36, 2, 20, mix(shirt, C.white, 0.2));
  // neck + head
  R(x + 12, top + 28, 8, 6, C.ink); R(x + 13, top + 29, 6, 5, mix(skin, C.ink, 0.15));
  R(x + 5, top + 6, 22, 24, C.ink);
  R(x + 6, top + 7, 20, 22, skin);
  R(x + 4, top + 15, 2, 6, C.ink); R(x + 26, top + 15, 2, 6, C.ink); // ears
  // hair styles
  const style = look % 3;
  R(x + 5, top + 4, 22, 7, C.ink);
  R(x + 6, top + 5, 20, 5, hair);
  if (style === 0) { R(x + 6, top + 10, 4, 6, hair); R(x + 22, top + 10, 4, 4, hair); }
  if (style === 1) { R(x + 11, top, 10, 6, C.ink); R(x + 12, top + 1, 8, 4, hair); R(x + 6, top + 10, 20, 2, hair); }
  if (style === 2) { R(x + 4, top + 2, 24, 4, C.ink); R(x + 5, top + 3, 22, 2, SHIRT[(look + 4) % SHIRT.length]); R(x + 22, top + 5, 9, 3, C.ink); } // cap
  // face
  const ey = top + 16;
  if (mood === 'happy') {
    R(x + 10, ey, 3, 1, C.ink); R(x + 9, ey + 1, 1, 1, C.ink); R(x + 13, ey + 1, 1, 1, C.ink);
    R(x + 19, ey, 3, 1, C.ink); R(x + 18, ey + 1, 1, 1, C.ink); R(x + 22, ey + 1, 1, 1, C.ink);
    R(x + 12, ey + 6, 8, 3, C.ink); R(x + 13, ey + 7, 6, 1, C.red);
  } else {
    const blink = Math.sin(t * 1.7 + look) > 0.97;
    if (blink) { R(x + 10, ey + 1, 3, 1, C.ink); R(x + 19, ey + 1, 3, 1, C.ink); }
    else { R(x + 10, ey, 3, 3, C.ink); R(x + 19, ey, 3, 3, C.ink); R(x + 11, ey, 1, 1, C.white); R(x + 20, ey, 1, 1, C.white); }
    if (mood === 'angry') {
      R(x + 9, ey - 3, 4, 1, C.ink); R(x + 12, ey - 2, 1, 1, C.ink);
      R(x + 19, ey - 3, 4, 1, C.ink); R(x + 19, ey - 2, 1, 1, C.ink);
      R(x + 13, ey + 7, 6, 1, C.ink); R(x + 12, ey + 8, 1, 1, C.ink); R(x + 19, ey + 8, 1, 1, C.ink);
    } else if (mood === 'meh') R(x + 13, ey + 7, 6, 1, C.ink);
    else { R(x + 14, ey + 7, 4, 1, C.ink); }
  }
  R(x + 7, ey + 4, 3, 2, mix(skin, C.red, 0.35)); R(x + 22, ey + 4, 3, 2, mix(skin, C.red, 0.35));
  if (low && mood !== 'happy') { R(x + 25, top + 9, 2, 3, C.teal); R(x + 24, top + 11, 4, 2, C.teal); } // sweat
  if (look === 4) { R(x + 8, ey - 1, 7, 5, C.ink); R(x + 9, ey, 5, 3, '#4a5a7a'); R(x + 17, ey - 1, 7, 5, C.ink); R(x + 18, ey, 5, 3, '#4a5a7a'); R(x + 15, ey + 1, 2, 1, C.ink); } // glasses
}

// The Shiba. Small (stall mascot, ~26 px tall) or big (as a customer).
export function drawShiba(cx, y, { big = false, mood = 'wait', t = 0 } = {}) {
  const s = big ? 2 : 1;
  const O = '#e08a3c', OD = '#b8642a', Wt = '#fff3e0';
  const bob = mood === 'happy' ? -Math.abs(Math.round(Math.sin(t * 12) * 2)) : 0;
  const x = cx - 12 * s, top = y - 26 * s + bob;
  const P = (px, py, w, h, c) => R(x + px * s, top + py * s, w * s, h * s, c);
  // tail (curled, wagging)
  const wag = Math.round(Math.sin(t * (mood === 'happy' ? 18 : 6)));
  P(19 + wag, 14, 5, 5, C.ink); P(20 + wag, 15, 3, 3, O); P(21 + wag, 16, 1, 1, Wt);
  // body
  P(5, 15, 15, 12, C.ink); P(6, 16, 13, 11, O); P(9, 17, 7, 10, Wt);
  // head
  P(3, 3, 18, 14, C.ink); P(4, 4, 16, 12, O);
  // ears
  P(4, 0, 5, 5, C.ink); P(5, 1, 3, 3, O); P(6, 2, 1, 2, C.pink);
  P(15, 0, 5, 5, C.ink); P(16, 1, 3, 3, O); P(17, 2, 1, 2, C.pink);
  // cheeks and muzzle
  P(4, 10, 16, 6, Wt); P(5, 9, 4, 2, Wt); P(15, 9, 4, 2, Wt);
  P(3, 10, 1, 6, C.ink); P(20, 10, 1, 6, C.ink); P(4, 16, 16, 1, C.ink);
  P(7, 6, 2, 1, Wt); P(15, 6, 2, 1, Wt); // eyebrow dots
  const blink = Math.sin(t * 1.3) > 0.96;
  if (mood === 'happy' || blink) { P(7, 8, 3, 1, C.ink); P(14, 8, 3, 1, C.ink); }
  else { P(7, 7, 2, 2, C.ink); P(15, 7, 2, 2, C.ink); }
  P(11, 10, 2, 1, C.ink); // nose
  if (mood === 'happy') { P(10, 12, 4, 2, C.ink); P(11, 13, 2, 1, C.red); }
  else { P(10, 12, 1, 1, C.ink); P(13, 12, 1, 1, C.ink); P(11, 13, 2, 1, C.ink); }
  P(5, 11, 2, 1, C.pink); P(17, 11, 2, 1, C.pink);
  // collar
  P(6, 16, 13, 2, C.red); P(12, 17, 2, 2, C.gold);
  P(6, 26, 4, 1, OD); P(15, 26, 4, 1, OD);
}
