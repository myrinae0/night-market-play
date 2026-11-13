// Shared drawing helpers and the per-frame registry of what can be tapped
// (hits), dragged (sources) and dropped on (targets).
import { W, H, C, R, rbox, text, tw, mix } from './gfx.js';
import { wrapText } from './font.js';

const reg = { hits: [], sources: [], targets: [], trayBox: null };
export function resetRegistry() {
  reg.hits = []; reg.sources = []; reg.targets = []; reg.trayBox = null;
  return reg;
}
export const registry = () => reg;
export function clearHits() { reg.hits = []; reg.sources = []; reg.targets = []; }
// A tap target. tag 'ui' plays a click.
export function hit(x, y, w, h, fn, tag = 'ui') { reg.hits.push({ x, y, w, h, fn, tag }); }
// Something you can pick up and drag (drag controls).
export function src(x, y, w, h, payload) { reg.sources.push({ x, y, w, h, payload }); }
// Somewhere a dragged thing can land.
export function dst(x, y, w, h, target) { reg.targets.push({ x, y, w, h, target }); }
export function setTrayBox(b) { reg.trayBox = b; }

export function dim(a = 0.72) { R(0, 0, W, H, `rgba(13, 10, 26, ${a})`); }
export function panel(x, y, w, h) {
  rbox(x, y + 2, w, h, C.ink);
  rbox(x, y, w, h, C.cream);
  R(x + 2, y + 2, w - 4, h - 4, C.white);
}
export function button(x, y, w, h, str, fill, onTap, tag, font = 'small') {
  rbox(x, y + 1, w, h, C.ink);
  rbox(x, y, w, h, fill);
  R(x + 2, y + 1, w - 4, 1, mix(fill, C.white, 0.35));
  const th = font === 'big' ? 7 : 5;
  text(str, x + w / 2, y + Math.floor((h - th) / 2), { align: 'center', color: C.white, font });
  if (onTap) hit(x, y, w, h + 1, onTap, tag);
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
