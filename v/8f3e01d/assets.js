// Loads the artist-made pixel art (see CREDITS.md) and makes recoloured
// copies (raw, battered, burnt) pixel by pixel, so cooking stays crisp.
import { makeCanvas, hex } from './gfx.js';

// assets/food: "16x16 Food" by ARoachIFoundOnMyPillow (CC0).
export const FOOD_FILES = {
  soda: 'canned_food_4', kimbap: 'sushi_roll', toast: 'sandwich',
  galbi_raw: 'steak_raw', galbi: 'steak_grilled', sausage: 'sausage',
  chicken_raw: 'chicken_drumstick_raw', chicken: 'chicken_nuggets',
  honey: 'honey_pot', spicy: 'chili_pepper_green', yangnyeom: 'chili_pepper_red', soygarlic: 'garlic',
  egg: 'egg_fried', scallion: 'scallions', rice_raw: 'rice_ball',
};
// assets/kenney-rpg-urban: Kenney's RPG Urban Pack (CC0), 16 x 16 tiles, no spacing.
export const URBAN = { file: 'assets/kenney-rpg-urban/tilemap_packed.png', cols: 27, tile: 16 };
// Front-facing (column 24) standing frame of each of the six people (rows 0, 3, ... 15).
export const PEOPLE = [0, 3, 6, 9, 12, 15].map((row) => ({ sx: 24 * 16, sy: row * 16 }));

const images = {};
export const img = (name) => images[name];
// Code-drawn sprites (src/art.js) join the same table, so they can be recoloured too.
export function registerImage(name, canvas) { images[name] = canvas; }

function load(name, src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => { images[name] = im; resolve(); };
    im.onerror = () => reject(new Error(`could not load ${src}`));
    im.src = src;
  });
}
export function loadAssets() {
  const jobs = Object.entries(FOOD_FILES).map(([k, f]) => load(k, `assets/food/${f}.png`));
  jobs.push(load('urban', URBAN.file));
  return Promise.all(jobs);
}

const TINTS = { raw: '#f2a49a', batter: '#f6e2b0', pale: '#f4ecd8', burnt: '#2a1712' };
const tintCache = new Map();
// A copy of sprite `name` with every pixel moved `amount` (0..1, in 0.1 steps)
// toward the tint colour. Alpha is kept, so outlines and shapes don't change.
export function tinted(name, mode, amount) {
  const a = Math.round(Math.max(0, Math.min(1, amount)) * 10) / 10;
  const src = images[name];
  if (!src || a === 0 || !TINTS[mode]) return src;
  const key = `${name}|${mode}|${a}`;
  let cv = tintCache.get(key);
  if (cv) return cv;
  cv = makeCanvas(src.width, src.height);
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.drawImage(src, 0, 0);
  const d = cx.getImageData(0, 0, src.width, src.height);
  const [tr, tg, tb] = hex(TINTS[mode]);
  for (let i = 0; i < d.data.length; i += 4) {
    if (!d.data[i + 3]) continue;
    // Keep some of the original light/dark so the shading still reads.
    const l = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 765;
    const k = mode === 'burnt' ? a : a * (0.55 + 0.45 * l);
    d.data[i] = Math.round(d.data[i] + (tr - d.data[i]) * k);
    d.data[i + 1] = Math.round(d.data[i + 1] + (tg - d.data[i + 1]) * k);
    d.data[i + 2] = Math.round(d.data[i + 2] + (tb - d.data[i + 2]) * k);
  }
  cx.putImageData(d, 0, 0);
  tintCache.set(key, cv);
  return cv;
}
