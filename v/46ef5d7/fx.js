// Particles, floating text and little bounces. Cosmetic only.
import { R, text, C } from './gfx.js';
import { coinIcon } from './sprites.js';

export function createFx() {
  return { parts: [], floats: [], coins: [], bounces: new Map(), toast: null, shake: 0 };
}

// layer: 'world' (screen space) or a station id (moves with that station's panel).
export function spawn(fx, layer, x, y, kind, n = 1) {
  for (let i = 0; i < n; i++) {
    const p = { layer, x, y, kind, t: 0, life: 1, vx: 0, vy: 0, size: 1, color: C.white };
    if (kind === 'smoke') { p.vx = (Math.random() - 0.5) * 6; p.vy = -10 - Math.random() * 8; p.life = 1.2 + Math.random() * 0.6; p.size = 2 + (Math.random() < 0.4 ? 1 : 0); p.color = '#8a8aa0'; }
    if (kind === 'blacksmoke') { p.vx = (Math.random() - 0.5) * 8; p.vy = -14 - Math.random() * 8; p.life = 1.4; p.size = 3; p.color = '#2a2430'; }
    if (kind === 'spark') { p.vx = (Math.random() - 0.5) * 30; p.vy = -20 - Math.random() * 25; p.life = 0.4 + Math.random() * 0.3; p.color = Math.random() < 0.5 ? C.gold : C.orange; p.g = 80; }
    if (kind === 'bubble') { p.vx = (Math.random() - 0.5) * 2; p.vy = -4 - Math.random() * 4; p.life = 0.5 + Math.random() * 0.4; p.size = Math.random() < 0.5 ? 1 : 2; p.color = '#ffd27a'; }
    if (kind === 'steam') { p.vx = (Math.random() - 0.5) * 4; p.vy = -12 - Math.random() * 6; p.life = 1; p.size = 2; p.color = '#d8d8e8'; }
    if (kind === 'confetti') { p.vx = (Math.random() - 0.5) * 60; p.vy = -40 - Math.random() * 40; p.life = 1.4; p.size = 2; p.color = [C.gold, C.red, C.teal, C.green, C.pink][i % 5]; p.g = 70; }
    if (kind === 'drip') { p.vx = (Math.random() - 0.5) * 10; p.vy = 5 + Math.random() * 10; p.life = 0.5; p.size = 1; p.g = 60; }
    fx.parts.push(p);
  }
}
export function floatText(fx, x, y, str, color = C.white, big = false) {
  fx.floats.push({ x, y, str, color, big, t: 0, life: 1.1 });
}
// Coins fly from (x, y) to the HUD counter.
export function coinBurst(fx, x, y, n, tx = 66, ty = 3) {
  for (let i = 0; i < n; i++) fx.coins.push({ x, y, sx: x, sy: y, tx, ty, t: -i * 0.06, life: 0.6, ox: (Math.random() - 0.5) * 30, oy: -20 - Math.random() * 20 });
}
export function bounce(fx, key) { fx.bounces.set(key, 0.25); }
export function bounceAmt(fx, key) {
  const t = fx.bounces.get(key);
  if (t == null) return 0;
  return Math.round(Math.sin((t / 0.25) * Math.PI) * 3);
}
export function toast(fx, str, good = false, perfect = false) { fx.toast = { str, good, perfect, t: 0, life: 1.1 }; }

export function updateFx(fx, dt) {
  for (const p of fx.parts) {
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) p.vy += p.g * dt;
  }
  fx.parts = fx.parts.filter((p) => p.t < p.life);
  for (const f of fx.floats) { f.t += dt; f.y -= 14 * dt; }
  fx.floats = fx.floats.filter((f) => f.t < f.life);
  let landed = 0;
  for (const c of fx.coins) { c.t += dt; if (c.t >= c.life && !c.done) { c.done = true; landed += 1; } }
  fx.coins = fx.coins.filter((c) => !c.done);
  for (const [k, t] of fx.bounces) { if (t - dt <= 0) fx.bounces.delete(k); else fx.bounces.set(k, t - dt); }
  if (fx.toast) { fx.toast.t += dt; if (fx.toast.t > fx.toast.life) fx.toast = null; }
  fx.shake = Math.max(0, fx.shake - dt);
  return landed;
}

export function drawParts(fx, layer, ox = 0) {
  for (const p of fx.parts) {
    if (p.layer !== layer) continue;
    const k = 1 - p.t / p.life;
    if (p.kind === 'smoke' || p.kind === 'steam' || p.kind === 'blacksmoke') {
      if (k < 0.3 && (Math.floor(p.t * 20) % 2)) continue; // dither fade-out
    }
    R(p.x + ox, p.y, p.size, p.size, p.color);
  }
}
export function drawFloats(fx) {
  for (const f of fx.floats) {
    if (f.t > f.life * 0.75 && Math.floor(f.t * 20) % 2) continue;
    text(f.str, f.x, f.y, { font: f.big ? 'big' : 'small', color: f.color, align: 'center' });
  }
  for (const c of fx.coins) {
    if (c.t < 0) continue;
    const k = Math.min(1, c.t / c.life);
    const e = k * k;
    const x = c.sx + c.ox * Math.sin(k * Math.PI) + (c.tx - c.sx) * e;
    const y = c.sy + c.oy * Math.sin(k * Math.PI) + (c.ty - c.sy) * e;
    coinIcon(x, y);
  }
}
