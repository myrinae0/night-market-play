// Pure game rules: seeded orders, cooking state machine, scoring, stars, unlocks.
import { ITEMS, SAUCES, COOK, LEVELS, STAR_SHARES, LOOKS } from './data.js';

// ---------- seeded random ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export function levelDef(n) {
  return LEVELS.find((l) => l.n === n) || null;
}

// Items that can appear in a level's orders.
export function menuFor(levelN) {
  const def = levelDef(levelN);
  return Object.keys(ITEMS).filter((id) => ITEMS[id].unlock <= levelN && def.stations.includes(ITEMS[id].station));
}

function line(item, sauce = null) {
  return { item, sauce };
}

// Generates one order. `i` is the customer's index in the level; the first
// order of a level showcases its new station in its simplest form.
export function makeOrder(levelN, i, r) {
  const drinks = menuFor(levelN).filter((id) => ITEMS[id].drink);
  const foods = menuFor(levelN).filter((id) => ITEMS[id].kind === 'ready' && !ITEMS[id].drink);
  const lines = [];
  if (levelN === 1) {
    if (i === 0) lines.push(line('soda'));
    else {
      lines.push(line(pick(r, r() < 0.5 ? foods : drinks)));
      if (i >= 2 && r() < 0.6) lines.push(line(pick(r, r() < 0.5 ? drinks : foods)));
      if (i >= 4 && r() < 0.35) lines.push(line(pick(r, foods)));
    }
  } else if (levelN === 2) {
    if (i === 0) lines.push(line('galbi'));
    else {
      const grillItem = pick(r, ['galbi', 'sausage']);
      lines.push(line(grillItem, r() < 0.5 ? pick(r, ['spicy', 'honey']) : null));
      if (i >= 4 && r() < 0.3) lines.push(line(pick(r, ['galbi', 'sausage']), r() < 0.5 ? 'spicy' : null));
      if (r() < 0.6) lines.push(line(pick(r, drinks)));
    }
  } else {
    if (i === 0) {
      lines.push(line('chicken'), line('beer'));
    } else if (i === LEVELS[2].customers - 1) {
      // Chimaek the Shiba: no beer for the dog.
      lines.push(line('chicken', 'soygarlic'), line('sausage'));
    } else if (r() < 0.7) {
      lines.push(line('chicken', r() < 0.7 ? pick(r, ['yangnyeom', 'soygarlic']) : null));
      if (r() < 0.75) lines.push(line(r() < 0.6 ? 'beer' : pick(r, drinks)));
      if (i >= 4 && r() < 0.3) lines.push(line(pick(r, ['galbi', 'kimbap'])));
    } else {
      lines.push(line(pick(r, ['galbi', 'sausage']), r() < 0.5 ? pick(r, ['spicy', 'honey']) : null));
      lines.push(line(pick(r, [...drinks, ...foods])));
    }
  }
  return { lines, patience: patienceFor(lines, levelN) };
}

// Seconds of patience: a base plus time for each thing that has to be cooked.
export function patienceFor(lines, levelN) {
  let p = levelN === 1 ? 22 : 26;
  for (const l of lines) {
    const k = ITEMS[l.item].kind;
    p += k === 'grill' ? 16 : k === 'fry' ? 16 : 4;
    if (l.sauce) p += 3;
  }
  return p;
}

export function makeOrders(levelN, seed) {
  const def = levelDef(levelN);
  const r = rng(seed ?? def.seed);
  const orders = [];
  for (let i = 0; i < def.customers; i++) {
    const o = makeOrder(levelN, i, r);
    o.look = levelN === 3 && i === def.customers - 1 ? 'shiba' : Math.floor(r() * LOOKS);
    orders.push(o);
  }
  return orders;
}

// ---------- cooking state machine ----------
// cookState(progress, spec): 'raw' -> 'done' -> 'burnt'.
export function cookState(p, spec) {
  if (p >= spec.burnt) return 'burnt';
  if (p >= spec.done) return 'done';
  return 'raw';
}
export const isPerfect = (p, spec) => p >= spec.perfectLo && p <= spec.perfectHi;

export function newGrillItem(item) {
  return { item, sides: [0, 0], down: 0 };
}
// The side facing down cooks at full rate; the top side keeps warming a little.
export function stepGrill(g, dt, spec = COOK.grill) {
  const rate = dt / spec.time;
  g.sides[g.down] = Math.min(spec.max, g.sides[g.down] + rate);
  const up = 1 - g.down;
  g.sides[up] = Math.min(spec.max, g.sides[up] + rate * spec.upRate);
  return g;
}
export function flipGrill(g) {
  g.down = 1 - g.down;
  return g;
}
// Whole item: burnt if either side burnt, done when both sides are done.
export function grillState(g, spec = COOK.grill) {
  const s = g.sides.map((p) => cookState(p, spec));
  if (s.includes('burnt')) return 'burnt';
  if (s.every((x) => x === 'done')) return 'done';
  return 'raw';
}
export const grillPerfect = (g, spec = COOK.grill) => g.sides.every((p) => isPerfect(p, spec));

export function newFryItem() {
  return { item: 'chicken', p: 0 };
}
export function stepFry(f, dt, spec = COOK.fry) {
  f.p = Math.min(spec.max, f.p + dt / spec.time);
  return f;
}
export const fryState = (f, spec = COOK.fry) => cookState(f.p, spec);

// What lands on the tray.
export function trayItem(item, cook = null, perfect = false) {
  return { item, cook, perfect, sauce: null };
}

// Can `sauce` go on this tray item? Only on finished (not burnt) food from the sauce's station.
export function canSauce(t, sauce) {
  const s = SAUCES[sauce];
  return !!s && ITEMS[t.item].station === s.station && !t.sauce;
}

// ---------- scoring ----------
export const MISTAKE_PENALTY = 2;
export const TIP_SHARE = 0.5;

export function linePrice(l) {
  return ITEMS[l.item].price + (l.sauce ? SAUCES[l.sauce].price : 0);
}
export function orderPrice(order) {
  return order.lines.reduce((s, l) => s + linePrice(l), 0);
}
// The most an order can earn: full price, a full-speed tip and a perfect bonus per cooked item.
export function orderMax(order) {
  const price = orderPrice(order);
  const cooked = order.lines.filter((l) => ITEMS[l.item].kind !== 'ready').length;
  return price + Math.round(price * TIP_SHARE) + cooked;
}

function lineStatus(l, t) {
  if (t.item !== l.item) return 'missing';
  if (t.cook === 'burnt') return 'burnt';
  if (t.cook === 'raw') return 'raw';
  if ((t.sauce || null) !== (l.sauce || null)) return t.sauce ? 'wrongSauce' : 'noSauce';
  return 'ok';
}

// Matches the tray to the order and prices the hand-over.
// patienceFrac is the share of patience left (0..1) and scales the tip.
export function scoreServe(order, tray, patienceFrac) {
  const used = new Array(tray.length).fill(false);
  const lines = order.lines.map((l) => ({ line: l, status: 'missing', tray: -1 }));
  // Pass 1: exact matches. Pass 2: same item with a problem.
  for (const pass of [1, 2]) {
    for (const L of lines) {
      if (L.tray >= 0) continue;
      for (let j = 0; j < tray.length; j++) {
        if (used[j]) continue;
        const st = lineStatus(L.line, tray[j]);
        if (st === 'missing' || (pass === 1 && st !== 'ok')) continue;
        L.status = st; L.tray = j; used[j] = true;
        break;
      }
    }
  }
  const extras = tray.filter((_, j) => !used[j]);
  let paid = 0, mistakes = 0, perfects = 0;
  for (const L of lines) {
    if (L.status === 'ok') {
      paid += linePrice(L.line);
      if (tray[L.tray].perfect) perfects += 1;
    } else mistakes += 1;
  }
  mistakes += extras.length;
  const allOk = mistakes === 0;
  const frac = Math.max(0, Math.min(1, patienceFrac));
  const tip = allOk ? Math.round(orderPrice(order) * TIP_SHARE * frac) + perfects : 0;
  const penalty = mistakes * MISTAKE_PENALTY;
  const okCount = lines.filter((L) => L.status === 'ok').length;
  const mood = allOk ? 'happy' : okCount > 0 ? 'meh' : 'angry';
  return { coins: paid + tip - penalty, paid, tip, penalty, perfects, mistakes, lines, extras, mood };
}

// ---------- stars and unlocks ----------
export function levelMax(orders) {
  return orders.reduce((s, o) => s + orderMax(o), 0);
}
export function starsFor(coins, max) {
  const share = max > 0 ? coins / max : 0;
  return STAR_SHARES.filter((t) => share >= t).length;
}
// A level is open if it is level 1 or the one before it earned at least a star.
export function isUnlocked(levelN, stars) {
  if (levelN === 1) return true;
  if (!levelDef(levelN)) return false;
  return (stars[levelN - 1] || 0) >= 1;
}
// Stations shown on a level: its own, plus the next ones as locked previews.
export function stationStatus(levelN, station, stationsDef) {
  const def = levelDef(levelN);
  if (def.stations.includes(station)) return 'open';
  if (stationsDef[station].comingSoon) return 'soon';
  return 'locked';
}
