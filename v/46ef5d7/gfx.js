// Low-res drawing helpers: palette, rects, cached bitmap text.
import { textMask, textWidth } from './font.js';

// The logical canvas size in art pixels. It changes with the viewport
// (layout.js); importers see the live values.
export let W = 180;
export let H = 390;
export function setSize(w, h) { W = w; H = h; }

// Palette (picked for this game; night market warm lights on cool night blues).
export const C = {
  ink: '#1a1020', night0: '#141632', night1: '#1f2048', night2: '#2e2659', night3: '#47306a',
  white: '#fff8ec', cream: '#f4e3c3', grey: '#9aa3b5', greyD: '#5a6380', greyDD: '#363b52',
  red: '#e43b44', redD: '#9e2835', redL: '#ff7b7b', orange: '#f77622', gold: '#feae34', yellow: '#fee761',
  green: '#63c74d', greenD: '#3e8948', greenL: '#a8e86b', teal: '#2ce8f5', blue: '#0099db', blueD: '#124e89',
  wood: '#b86f50', woodD: '#733e39', woodDD: '#3f2832', woodL: '#e4a672', pink: '#f6a6a0', pinkD: '#d77a76',
  purple: '#8b4a9c', steel: '#8b9bb4', steelD: '#4c5670', oil: '#c9862b', oilD: '#8a5414',
};

let ctx = null;
export function setCtx(c) { ctx = c; }
export function getCtx() { return ctx; }

export function R(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
// Rect with a 1 px outline.
export function box(x, y, w, h, fill, line = C.ink) {
  R(x, y, w, h, line);
  R(x + 1, y + 1, w - 2, h - 2, fill);
}
// Rounded-corner box (corners cut by 1 px).
export function rbox(x, y, w, h, fill, line = C.ink) {
  R(x + 1, y, w - 2, h, line);
  R(x, y + 1, w, h - 2, line);
  R(x + 1, y + 1, w - 2, h - 2, fill);
}

const cache = new Map();
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
export { makeCanvas };

function textImage(str, font, scale, color, outline) {
  const key = `${str}|${font}|${scale}|${color}|${outline}`;
  let img = cache.get(key);
  if (img) return img;
  const m = textMask(str, font, scale);
  const cv = makeCanvas(m.w, m.h);
  const cx = cv.getContext('2d');
  const id = cx.createImageData(m.w, m.h);
  const fc = hex(color), oc = outline ? hex(outline) : null;
  for (let i = 0; i < m.mask.length; i++) {
    const v = m.mask[i];
    const col = v === 2 ? fc : v === 1 ? oc : null;
    if (!col) continue;
    id.data[i * 4] = col[0]; id.data[i * 4 + 1] = col[1]; id.data[i * 4 + 2] = col[2]; id.data[i * 4 + 3] = 255;
  }
  cx.putImageData(id, 0, 0);
  img = { cv, w: m.w, h: m.h };
  if (cache.size > 800) cache.clear();
  cache.set(key, img);
  return img;
}

// Draws text; x is left/centre/right per `align`, y is the top. Returns width.
export function text(str, x, y, { font = 'small', color = C.white, outline = C.ink, align = 'left', scale = 1 } = {}) {
  const img = textImage(String(str), font, scale, color, outline);
  let dx = x - 1;
  if (align === 'center') dx = x - Math.floor(img.w / 2);
  else if (align === 'right') dx = x - img.w + 1;
  ctx.drawImage(img.cv, Math.round(dx), Math.round(y - 1));
  return img.w;
}
export const tw = (str, font = 'small', scale = 1) => textWidth(str, font) * scale;

export function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
