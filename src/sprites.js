// Code-drawn pixel art: menu items, sauce bottles, customers, the Shiba, icons.
import { C, R, box, rbox, mix, makeCanvas, getCtx, setCtx } from './gfx.js';
import { img, tinted, PEOPLE, registerImage } from './assets.js';
import { COOK, ITEMS } from './data.js';
import { SPIRIT_ART, FOOD_ART, mapRows } from './art.js';

// A canvas from a pixel map (rows of palette letters; '.' is clear).
export function pixelCanvas(rows, pal, w = 16, h = rows.length) {
  const cv = makeCanvas(w, h);
  const cx = cv.getContext('2d');
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]];
      if (!c) continue;
      cx.fillStyle = c;
      cx.fillRect(i, j, 1, 1);
    }
  });
  return cv;
}
// The code-drawn wok dishes join the image table (so they can be recoloured).
export function registerFoodArt() {
  for (const [k, a] of Object.entries(FOOD_ART)) registerImage(k, pixelCanvas(mapRows(a.rows), a.pal));
}

// ---------- menu items ----------
// Food art is the CC0 "16x16 Food" pack (src/assets.js); drinks the pack has no
// sprite for (barley tea, beer) are drawn here in the same 16 x 16 style:
// dark brown outline, two-tone shading, top-left light.
export const STATE_P = { raw: 0.25, done: 0.95, burnt: 1.45 };
const OL = '#3a2229'; // the food pack's outline brown

function teaArt(x, y) {
  R(x + 10, y, 1, 4, OL); R(x + 11, y, 2, 1, OL); R(x + 10, y + 1, 1, 3, '#e8e0d0'); // straw
  R(x + 3, y + 3, 10, 1, OL);
  R(x + 2, y + 4, 12, 1, OL); R(x + 3, y + 4, 10, 1, '#f2efe6');
  R(x + 3, y + 5, 10, 9, OL); R(x + 4, y + 5, 8, 8, '#b8743a');
  R(x + 4, y + 5, 8, 2, '#d39a55'); R(x + 5, y + 7, 1, 5, '#d39a55');
  R(x + 4, y + 9, 8, 2, '#efe2c4'); R(x + 4, y + 10, 8, 1, '#d9c8a4');
  R(x + 4, y + 13, 8, 1, OL); R(x + 5, y + 14, 6, 1, OL);
  R(x + 10, y + 6, 1, 6, '#94572b');
}
function beerArt(x, y) {
  R(x + 2, y + 2, 10, 13, OL);
  R(x + 12, y + 5, 3, 8, OL); R(x + 12, y + 7, 1, 4, '#cfd6dc'); // handle
  R(x + 2, y + 1, 9, 2, OL); R(x + 3, y + 2, 8, 3, '#fbf6ea'); R(x + 4, y + 1, 2, 1, '#fbf6ea'); R(x + 8, y + 1, 2, 1, '#fbf6ea');
  R(x + 3, y + 4, 8, 1, '#e6dccb');
  R(x + 3, y + 5, 8, 9, '#e9a12a'); R(x + 3, y + 5, 8, 2, '#f6c84a');
  R(x + 4, y + 7, 1, 6, '#f6c84a'); R(x + 10, y + 6, 1, 8, '#c27a1c');
  R(x + 7, y + 9, 1, 1, '#fbe7a0'); R(x + 6, y + 11, 1, 1, '#fbe7a0');
}

function cookTint(p, spec, mode) {
  if (p < spec.perfectLo) return { mode, a: (1 - p / spec.perfectLo) * 0.8 };
  if (p > spec.perfectHi) return { mode: 'burnt', a: Math.min(0.85, ((p - spec.perfectHi) / (spec.burnt - spec.perfectHi)) * 0.6) };
  return { mode: null, a: 0 };
}

// The image to draw for a menu item at a cooking stage.
// opts: up (grill, the side you see), p (fryer), cook (tray state), raw (uncooked chicken), batter.
export function itemImage(id, opts = {}) {
  let p = opts.up ?? opts.p ?? STATE_P[opts.cook] ?? 0.95;
  if (id === 'galbi') {
    if (p < 0.45) return img('galbi_raw');
    const t = cookTint(p, COOK.grill, 'raw');
    return t.mode ? tinted('galbi', t.mode, t.mode === 'raw' ? t.a * 0.6 : t.a) : img('galbi');
  }
  if (id === 'sausage') {
    const t = cookTint(p, COOK.grill, 'raw');
    return t.mode ? tinted('sausage', t.mode, t.a) : img('sausage');
  }
  if (id === 'chicken') {
    if (opts.raw) return img('chicken_raw');
    const t = cookTint(p, COOK.fry, 'batter');
    return t.mode ? tinted('chicken', t.mode, t.a) : img('chicken');
  }
  if (ITEMS[id]?.kind === 'wok') {
    // Raw ingredients at first, then the dish, pale until it is done; scorch darkens it.
    const scorch = opts.cook === 'burnt' ? 1 : opts.scorch || 0;
    if (scorch > 0.05) return tinted(id, 'burnt', Math.min(0.85, 0.15 + scorch * 0.7));
    if (opts.raw || p < 0.3) return img(ITEMS[id].raw);
    if (p < COOK.wok.perfectLo) return tinted(id, 'pale', (1 - p / COOK.wok.perfectLo) * 0.9);
    return img(id);
  }
  return img(id);
}

// Draws a menu item at integer (x, y) and whole-number scale. A sauce shows as a
// small badge (the sauce's ingredient sprite) in the bottom-right corner.
export function drawItem(id, x, y, opts = {}) {
  const s = opts.scale || 1;
  x = Math.round(x); y = Math.round(y);
  const ctx = getCtx();
  if (id === 'tea' || id === 'beer') {
    if (s === 1) (id === 'tea' ? teaArt : beerArt)(x, y);
    else {
      const cv = drinkCanvas(id);
      ctx.drawImage(cv, x, y, 16 * s, 16 * s);
    }
  } else {
    const im = itemImage(id, opts);
    if (im) ctx.drawImage(im, x, y, 16 * s, 16 * s);
  }
  // Sauce badge: the sauce's own sprite at 1x, tucked into the corner of 2x food.
  if (opts.sauce && s >= 2 && img(opts.sauce)) ctx.drawImage(img(opts.sauce), x + 16 * s - 14, y + 16 * s - 14);
}
const drinkCache = new Map();
function drinkCanvas(id) {
  let cv = drinkCache.get(id);
  if (cv) return cv;
  cv = makeCanvas(16, 16);
  const prev = getCtx();
  setCtx(cv.getContext('2d'));
  (id === 'tea' ? teaArt : beerArt)(0, 0);
  setCtx(prev);
  drinkCache.set(id, cv);
  return cv;
}
// Sauce on the shelf: the ingredient sprite (16 x 16) on a little dish.
export function drawSauce(sauce, x, y, lifted = false, scale = 1) {
  x = Math.round(x); y = Math.round(y) - (lifted ? 3 : 0);
  const im = img(sauce);
  if (im) getCtx().drawImage(im, x, y, 16 * scale, 16 * scale);
}
// Kept for the held-bottle cursor: the sauce sprite at 1x.
export function drawBottle(sauce, x, y, lifted = false) { drawSauce(sauce, x, y, lifted); }

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
// A small cog for the settings button.
export function gearIcon(x, y, col = C.white) {
  const rows = ['..#.#..', '.#####.', '###.###', '##...##', '###.###', '.#####.', '..#.#..'];
  rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === '#') R(x + i, y + j, 1, 1, col); });
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
// People are Kenney's RPG Urban Pack characters (front-facing frame) at 4x.
// Spirits are drawn for this game (src/art.js) at the same scale.
export let CUSTOMER_SCALE = 4;
export function setCustomerScale(n) { CUSTOMER_SCALE = n; }
const spiritCache = new Map();
function spiritCanvas(id, frame = 0) {
  const key = `${id}|${frame}`;
  let cv = spiritCache.get(key);
  if (cv) return cv;
  const a = SPIRIT_ART[id];
  cv = pixelCanvas(mapRows(a.frames[frame % a.frames.length]), a.pal);
  spiritCache.set(key, cv);
  return cv;
}
const maskCache = new Map();
function maskCanvas(id) {
  let cv = maskCache.get(id);
  if (!cv) { const m = SPIRIT_ART[id].mask; cv = pixelCanvas(m.rows, m.pal, m.rows[0].length); maskCache.set(id, cv); }
  return cv;
}
// opts: mood, t (time), low (patience is low), scale, slip (0..1, the fox's mask)
export function drawCustomer(look, cx, y, { mood = 'wait', t = 0, low = false, scale = CUSTOMER_SCALE } = {}) {
  if (look === 'shiba') return drawShiba(cx, y + 2, { big: true, mood, t, scale: Math.max(2, scale - 1) });
  const s = scale;
  const hop = mood === 'happy' ? Math.abs(Math.round(Math.sin(t * 10) * 2)) * s / 2 : 0;
  const ctx = getCtx();
  let x = Math.round(cx - 8 * s), top = Math.round(y - 15 * s - hop);
  if (typeof look === 'string' && SPIRIT_ART[look]) {
    const a = SPIRIT_ART[look];
    if (look === 'lantern' || look === 'moth' || look === 'crane' || look === 'wisp') top -= Math.round((Math.sin(t * 2.2 + cx) * 0.5 + 0.5) * 2) * s / 2 + s; // floating
    if (look === 'lantern') { // warm glow behind the paper
      const k = Math.sin(t * 3) * 0.5 + 0.5;
      R(x + 2 * s, top + 3 * s, 12 * s, 9 * s, mix('#3a2a40', '#7a5a40', k * 0.6));
    }
    ctx.drawImage(spiritCanvas(look), x, top, 16 * s, 16 * s);
    if (a.mask) { // the fox's mask slips while they wait, more as patience runs low
      const slip = mood === 'wait' && (low || Math.sin(t * 0.9) > 0.75) ? 1 : 0;
      ctx.drawImage(maskCanvas(look), x + (a.mask.x + slip * 3) * s, top + (a.mask.y + slip) * s, a.mask.rows[0].length * s, a.mask.rows.length * s);
    }
    if (look === 'frog') { // a raindrop rolls down its back now and then
      const k = (t * 0.7) % 1;
      if (k < 0.6) R(x + 13 * s, top + (9 + Math.floor(k * 8)) * s, s, s, '#2ce8f5');
    }
  } else {
    const p = PEOPLE[(Number(look) || 0) % PEOPLE.length];
    const im = img('urban');
    if (im) ctx.drawImage(im, p.sx, p.sy, 16, 16, x, top, 16 * s, 16 * s);
  }
  // mood marks, drawn on the same grid as the sprite
  const P = (px, py, c) => R(x + px * s, top + py * s, s, s, c);
  if (mood === 'angry') { P(13, 0, C.red); P(14, 1, C.red); P(15, 0, C.red); P(13, 2, C.red); P(15, 2, C.red); }
  else if (low && mood !== 'happy') { P(14, 1, C.teal); P(14, 2, C.teal); P(13, 2, C.teal); P(15, 2, C.teal); P(14, 3, C.teal); }
}
// A spirit's or person's face for the dialogue box portrait.
export function drawPortrait(look, x, y, s = 2, t = 0) {
  const ctx = getCtx();
  if (typeof look === 'string' && SPIRIT_ART[look]) {
    ctx.drawImage(spiritCanvas(look), x, y, 16 * s, 16 * s);
    const a = SPIRIT_ART[look];
    if (a.mask) { const slip = Math.sin(t * 0.9) > 0.6 ? 1 : 0; ctx.drawImage(maskCanvas(look), x + (a.mask.x + slip * 3) * s, y + (a.mask.y + slip) * s, a.mask.rows[0].length * s, a.mask.rows.length * s); }
  } else if (look === 'shiba') ctx.drawImage(shibaCanvas(false), x, y, 16 * s, 16 * s);
  else { const p = PEOPLE[(Number(look) || 0) % PEOPLE.length]; const im = img('urban'); if (im) ctx.drawImage(im, p.sx, p.sy, 16, 16, x, y, 16 * s, 16 * s); }
}

// Chimaek the Shiba: a 16 x 16 sprite drawn for this game in the same style as
// the Kenney people (dark outline, flat two-tone colours), shown at 2x like them.
const SHIBA = [
  '..kk........kk..',
  '.kook......kook.',
  '.kopokkkkkkopok.',
  '.kooooooooooook.',
  'kooooooooooooook',
  'kooowoooooowoook',
  'koooeooooooeoook',
  'kowwwwwnnwwwwwok',
  'kwwpwwwkkwwwpwwk',
  '.kwwwwwwwwwwwwk.',
  '..krrrrryrrrrk..',
  '..koowwwwwwook..',
  '..koowwwwwwookok',
  '..koowwwwwwooook',
  '..koowwkkwwookk.',
  '..kkkkkkkkkkkk..',
].map((r) => r.slice(0, 16).padEnd(16, '.'));
const SHIBA_PAL = { k: OL, o: '#e0873a', p: '#f2a0a0', w: '#fbf1e0', e: '#1c1418', n: '#1c1418', r: '#d8333f', y: '#f6c84a' };
const shibaCache = new Map();
function shibaCanvas(happy) {
  const key = happy ? 'h' : 'n';
  let cv = shibaCache.get(key);
  if (cv) return cv;
  cv = makeCanvas(16, 16);
  const cx = cv.getContext('2d');
  SHIBA.forEach((row, j) => {
    for (let i = 0; i < 16; i++) {
      let ch = row[i];
      if (happy && ch === 'e') ch = 'k';
      if (happy && j === 8 && (i === 7 || i === 8)) ch = 'p';
      if (!SHIBA_PAL[ch]) continue;
      cx.fillStyle = SHIBA_PAL[ch];
      cx.fillRect(i, j, 1, 1);
    }
  });
  shibaCache.set(key, cv);
  return cv;
}
// react: 'wag' (fast wag, happy face), 'growl' (brows, GRR, a little shake),
// 'hide' (ducks behind the counter: only ears and eyes show), 'stare'.
export function drawShiba(cx, y, { big = false, mood = 'wait', t = 0, scale = 2, react = null } = {}) {
  const s = big ? Math.max(scale, 2) : scale;
  const hop = mood === 'happy' ? Math.abs(Math.round(Math.sin(t * 10) * 2)) * s / 2 : 0;
  let x = Math.round(cx - 8 * s);
  const top = Math.round(y - 16 * s - hop);
  const ctx = getCtx();
  if (react === 'hide') { // peeking over the edge: the top 6 rows, sunk down
    const peek = 6 - (Math.sin(t * 1.5) > 0.6 ? 1 : 0);
    ctx.drawImage(shibaCanvas(false), 0, 0, 16, peek, x, Math.round(y - peek * s), 16 * s, peek * s);
    return;
  }
  if (react === 'growl') x += Math.round(Math.sin(t * 40)) > 0 ? 1 : 0;
  ctx.drawImage(shibaCanvas(mood === 'happy' || react === 'wag'), x, top, 16 * s, 16 * s);
  if (react === 'growl') { // angry brows and a small GRR
    R(x + 3 * s, top + 4 * s, 2 * s, s, SHIBA_PAL.k); R(x + 11 * s, top + 4 * s, 2 * s, s, SHIBA_PAL.k);
    if (Math.floor(t * 2) % 2) R(x + 6 * s, top + 8 * s, 4 * s, s, SHIBA_PAL.w);
  }
  // tail wag: one pixel (fast when wagging)
  if (Math.sin(t * (react === 'wag' ? 18 : 6)) > 0) R(x + 15 * s, top + 11 * s, s, s, SHIBA_PAL.o);
}
