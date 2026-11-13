// Shared drawing helpers and the per-frame registry of what can be tapped
// (hits), dragged (sources) and dropped on (targets).
import { W, H, C, R, rbox, text, tw, mix, getCtx } from './gfx.js';
import { wrapText } from './font.js';

const reg = { hits: [], sources: [], targets: [], trayBox: null, frames: [] };
// Parts of a screen are drawn in design coordinates (180 x 390) moved into
// place; while one is drawn, (ox, oy) is that move, so everything registered
// here is in screen coordinates.
let ox = 0, oy = 0;
export function resetRegistry() {
  reg.hits = []; reg.sources = []; reg.targets = []; reg.trayBox = null; reg.frames = [];
  ox = 0; oy = 0;
  return reg;
}
export const registry = () => reg;
export function clearHits() { reg.hits = []; reg.sources = []; reg.targets = []; reg.frames = []; }
// A tap target. tag 'ui' plays a click; `key` names it (tests and tools find it).
export function hit(x, y, w, h, fn, tag = 'ui', key = null) { reg.hits.push({ x: x + ox, y: y + oy, w, h, fn, tag, key }); }
// Something you can pick up and drag (drag controls).
export function src(x, y, w, h, payload) { reg.sources.push({ x: x + ox, y: y + oy, w, h, payload }); }
// Somewhere a dragged thing can land.
export function dst(x, y, w, h, target) { reg.targets.push({ x: x + ox, y: y + oy, w, h, target }); }
export function setTrayBox(b) { reg.trayBox = { x: b.x + ox, y: b.y + oy, w: b.w, h: b.h }; }

// Draws fn() in design coordinates moved by (dx, dy). `rect` ([x0, y0, x1, y1]
// in design coordinates) records the move so a design point can be found on
// screen (designToScreen: the playtest and screenshot presets use it).
export function withOrigin(dx, dy, fn, rect = null) {
  dx = Math.round(dx); dy = Math.round(dy);
  if (rect) reg.frames.push({ rect, dx: dx + ox, dy: dy + oy });
  const c = getCtx();
  c.save(); c.translate(dx, dy); ox += dx; oy += dy;
  try { fn(); } finally { ox -= dx; oy -= dy; c.restore(); }
}
// Only draws inside the rect (in the current coordinates).
export function withClip(x, y, w, h, fn) {
  const c = getCtx();
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  try { fn(); } finally { c.restore(); }
}
// A design point on the current screen -> screen coordinates (the last frame
// that holds it wins: overlays are drawn last).
export function designToScreen(x, y, frames = reg.frames) {
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i], [x0, y0, x1, y1] = f.rect;
    if (x >= x0 && x < x1 && y >= y0 && y < y1) return { x: x + f.dx, y: y + f.dy };
  }
  return { x, y };
}

export function dim(a = 0.72) { R(0, 0, W, H, `rgba(13, 10, 26, ${a})`); }
export function panel(x, y, w, h) {
  rbox(x, y + 2, w, h, C.ink);
  rbox(x, y, w, h, C.cream);
  R(x + 2, y + 2, w - 4, h - 4, C.white);
}
export function button(x, y, w, h, str, fill, onTap, tag, font = 'small', key = null) {
  rbox(x, y + 1, w, h, C.ink);
  rbox(x, y, w, h, fill);
  R(x + 2, y + 1, w - 4, 1, mix(fill, C.white, 0.35));
  const th = font === 'big' ? 7 : 5;
  text(str, x + w / 2, y + Math.floor((h - th) / 2), { align: 'center', color: C.white, font });
  if (onTap) hit(x, y, w, h + 1, onTap, tag, key);
}
export function label(str, x, y, color = C.cream) { text(str, x, y, { color, align: 'center' }); }
// Word wrap for the small font (the font module wraps either font).
export const wrap = (str, maxW, font = 'small') => wrapText(str, maxW, font);
export { tw };

// Pixel arrows (up / down): a 5 x 5 box holding a solid triangle.
export function arrowIcon(x, y, dir, col = C.cream) {
  const rows = dir === 'up' ? ['.....', '..#..', '.###.', '#####', '.....'] : ['.....', '#####', '.###.', '..#..', '.....'];
  rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === '#') R(x + i, y + j, 1, 1, col); });
}
// A small bin icon (11 x 13).
export function binIcon(x, y, col = C.steel, open = false) {
  const lid = open ? -2 : 0;
  R(x + 3, y + lid, 5, 1, C.ink); R(x, y + 1 + lid, 11, 2, C.ink); R(x + 1, y + 1 + lid, 9, 1, col);
  R(x + 1, y + 3, 9, 10, C.ink); R(x + 2, y + 3, 7, 9, col);
  for (let i = 0; i < 3; i++) R(x + 3 + i * 2, y + 5, 1, 6, mix(col, C.ink, 0.5));
}
// A toggle switch (24 x 11).
export function toggle(x, y, on) {
  rbox(x, y, 24, 11, on ? C.greenD : C.greyD);
  R(x + 2, y + 2, 20, 1, mix(on ? C.greenD : C.greyD, C.white, 0.25));
  const kx = on ? x + 13 : x + 2;
  rbox(kx, y + 1, 9, 9, C.white);
  text(on ? 'ON' : 'OFF', on ? x + 7 : x + 17, y + 3, { align: 'center', color: C.white, outline: null });
}

// ---------- the cooking meters' colour code ----------
// One code on every station, legend and intro card (data.js COOK_TEXT has the
// words): grey = raw, green = good, gold = perfect (inside the green),
// red = burnt.
// Winter nights add a fourth colour: icy blue = cold (food gone cold on the tray).
export const ZONE = { raw: C.greyD, good: C.green, perfect: '#ffcd2e', shine: '#fff3a8', burnt: C.red, cold: '#8fd3ff' };
export const inGold = (p, spec) => p >= spec.perfectLo && p <= spec.perfectHi;
// Where the needle is: 'raw', 'good', 'perfect' or 'burnt'.
export function meterState(p, spec) {
  if (p >= spec.burnt) return 'burnt';
  if (inGold(p, spec)) return 'perfect';
  if (p >= spec.done) return 'good';
  return 'raw';
}

// ---------- colour patterns (Settings: COLOUR PATTERNS, off by default) ----------
// For players who can't tell the colours apart, every colour signal also gets
// a shape: GOOD = dots and a tick, PERFECT = a star, BURNT = a hatch and an
// X, COLD = a snowflake. The burnt zone's hatch shows in the default look too.
export let PATTERNS = false;
export function setPatterns(on) { PATTERNS = !!on; }
// 5 x 5 shapes, one per state (tests check they all differ).
export const STATE_ICONS = {
  good: ['....#', '...##', '#.##.', '###..', '.#...'],
  perfect: ['..#..', '.###.', '#####', '.###.', '.#.#.'],
  burnt: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  cold: ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'],
};
export const STATE_COL = () => ({ good: ZONE.good, perfect: ZONE.perfect, burnt: ZONE.burnt, cold: ZONE.cold });
// A state's shape at (x, y), 5 x 5, in `col` (default: its colour), on an ink
// box (7 x 7 from x - 1, y - 1) unless `box` is false.
export function stateIcon(kind, x, y, col = STATE_COL()[kind], box = true) {
  const rows = STATE_ICONS[kind];
  if (!rows) return;
  if (box) R(x - 1, y - 1, 7, 7, C.ink);
  rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === '#') R(x + i, y + j, 1, 1, col); });
}
// The patterns inside a zone of a bar (x, y, w, h): dots (good), a hatch (burnt).
export function zonePattern(kind, x, y, w, h) {
  if (w <= 0) return;
  if (kind === 'good') for (let i = 1; i < w; i += 3) R(x + i, y + Math.floor((h - 1) / 2), 1, 1, mix(ZONE.good, C.ink, 0.55));
  else if (kind === 'burnt') for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if ((i + j) % 3 === 0) R(x + i, y + j, 1, 1, mix(ZONE.burnt, C.ink, 0.5));
}
// A cooking meter (w x h inside a 1 px outline) with the needle at p. In the
// gold, the outline glows gold. `active` false (the grill side facing up)
// stripes it dark. With colour patterns on, the good zone is dotted and the
// needle wears the state's shape above it (tick, star, X), unless `icon` is
// false (the grill's two bars share one shape, by the food).
export function meter(x, y, w, h, p, spec, active = true, t = 0, icon = true) {
  const span = spec.max;
  const px = (v) => x + Math.round((Math.min(v, span) / span) * w);
  const gold = inGold(p, spec);
  R(x - 1, y - 1, w + 2, h + 2, gold ? (Math.floor(t * 4) % 2 ? ZONE.shine : ZONE.perfect) : C.ink);
  R(x, y, w, h, ZONE.raw);
  R(px(spec.done), y, px(spec.burnt) - px(spec.done), h, ZONE.good);
  if (PATTERNS) zonePattern('good', px(spec.done), y, px(spec.burnt) - px(spec.done), h);
  R(px(spec.perfectLo), y, px(spec.perfectHi) - px(spec.perfectLo), h, ZONE.perfect);
  if (h >= 3) R(px(spec.perfectLo), y, px(spec.perfectHi) - px(spec.perfectLo), 1, ZONE.shine);
  if (spec.burnt < span) { R(px(spec.burnt), y, x + w - px(spec.burnt), h, ZONE.burnt); zonePattern('burnt', px(spec.burnt), y, x + w - px(spec.burnt), h); }
  if (!active) for (let i = 0; i < w; i += 2) R(x + i, y, 1, h, C.ink);
  const m = Math.min(x + w - 1, px(p));
  R(m - 1, y - 2, 3, h + 4, C.ink);
  R(m, y - 1, 1, h + 2, C.white);
  const st = meterState(p, spec);
  if (icon && PATTERNS && st !== 'raw') stateIcon(st, m - 2, y - 8);
}
// The legend, one row 5 px tall centred on cx: a swatch and a word for green,
// gold and red (and icy blue for COLD on winter nights, when `words.cold` is
// set). `light`: on a white card (ink words, no outline). With colour
// patterns on, each swatch is its shape (tick, star, X, snowflake).
export function meterLegend(cx, y, words, light = false) {
  const items = [['good', words.good], ['perfect', words.perfect], ['burnt', words.burnt]];
  if (words.cold) items.push(['cold', words.cold]);
  const sw = PATTERNS ? 8 : 7;
  const ws = items.map(([, s]) => sw + tw(s));
  let x = cx - Math.floor((ws.reduce((a, b) => a + b, 0) + 8 * (items.length - 1)) / 2);
  items.forEach(([kind, s], i) => {
    const col = STATE_COL()[kind];
    if (PATTERNS) stateIcon(kind, x + 1, y, col);
    else { R(x, y - 1, 6, 7, C.ink); R(x + 1, y, 4, 5, col); if (kind === 'burnt') zonePattern('burnt', x + 1, y, 4, 5); }
    text(s, x + sw + 1, y, light ? { color: C.ink, outline: null } : { color: col === ZONE.burnt ? C.redL : col });
    x += ws[i] + 8;
  });
}
// A gold twinkle (5 x 5) next to food in the gold.
export function sparkle(x, y, t) {
  const on = Math.floor(t * 4) % 2;
  const c = on ? ZONE.shine : ZONE.perfect;
  R(x + 2, y, 1, 5, c); R(x, y + 2, 5, 1, c);
  if (on) { R(x + 1, y + 1, 3, 3, c); R(x + 2, y + 2, 1, 1, C.white); }
}
