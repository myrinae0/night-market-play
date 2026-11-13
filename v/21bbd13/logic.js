// Pure game rules: seeded orders, cooking state machine, scoring, stars, unlocks.
import {
  ITEMS, SAUCES, COOK, LEVELS, STAR_SHARES, LOOKS, PERSON_SHARE, WOK_ITEMS, STEAM_ITEMS, STATION_SAUCES, UPGRADES, GRILL_SLOTS,
  TRAY_MAX, STATION_ORDER, STATION_KIND, sauceSuits, VIP_PAY, VIP_PATIENCE, SPECIAL_PAY, RUSH_PATIENCE, ENDLESS,
} from './data.js';
import { SPIRITS, spiritsFor } from './spirits.js';

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
  return LEVELS.find((l) => l.n === n) || (n === ENDLESS.n ? ENDLESS : null);
}

// Items that can appear in a level's orders (Chimaek's treat never does).
export function menuFor(levelN) {
  const def = levelDef(levelN);
  return Object.keys(ITEMS).filter((id) => ITEMS[id].unlock <= levelN && def.stations.includes(ITEMS[id].station) && !ITEMS[id].treat);
}

function line(item, sauce = null) {
  return { item, sauce };
}
// One cooked line from a station kind, with that station's sauce half the time.
function cookedLine(r, kind) {
  if (kind === 'grill') return line(pick(r, ['galbi', 'sausage']), r() < 0.5 ? pick(r, STATION_SAUCES.grill) : null);
  if (kind === 'fry') return line('chicken', r() < 0.6 ? pick(r, STATION_SAUCES.fryer) : null);
  if (kind === 'steam') {
    const item = pick(r, STEAM_ITEMS);
    return line(item, item === 'mandu' && r() < 0.55 ? pick(r, STATION_SAUCES.steamer) : null);
  }
  if (kind === 'pot') return line('ramyeon', r() < 0.5 ? pick(r, STATION_SAUCES.pot) : null);
  return line(pick(r, WOK_ITEMS), r() < 0.45 ? pick(r, STATION_SAUCES.wok) : null);
}
// The cooking kinds of a level's open stations.
const cookedKinds = (def) => def.stations.map((id) => STATION_KIND[id]).filter(Boolean);
function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
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
  } else if (levelN === 3) {
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
  } else if (levelN === 4) {
    // The wok: mostly a wok dish and a drink; later, something from another station.
    if (i === 0) lines.push(line('friedrice'));
    else {
      lines.push(line(pick(r, WOK_ITEMS), i >= 2 && r() < 0.45 ? pick(r, STATION_SAUCES.wok) : null));
      if (r() < 0.6) lines.push(line(pick(r, drinks)));
      if (i >= 4 && r() < 0.35) lines.push(cookedLine(r, pick(r, ['grill', 'fry'])));
    }
  } else if (levelN === 5) {
    // Mix: two different stations in most orders, sometimes a drink on top.
    const kinds = shuffle(r, ['grill', 'fry', 'wok', 'ready']);
    const n = i === 0 ? 2 : r() < 0.25 ? 1 : 2;
    for (let k = 0; k < n; k++) lines.push(kinds[k] === 'ready' ? line(pick(r, [...drinks, ...foods])) : cookedLine(r, kinds[k]));
    if (n === 2 && !lines.some((l) => ITEMS[l.item].drink) && r() < 0.35) lines.push(line(pick(r, drinks)));
  } else if (levelN === 7) {
    // The steamer: mandu or a bun, often a drink; later something else too.
    if (i === 0) lines.push(line('mandu'));
    else {
      lines.push(cookedLine(r, 'steam'));
      if (r() < 0.5) lines.push(line(pick(r, drinks)));
      if (i >= 4 && r() < 0.3) lines.push(cookedLine(r, pick(r, ['grill', 'fry', 'wok'])));
    }
  } else if (levelN === 10) {
    // The noodle pot: ramyeon (toppings from the third guest), a drink, later more.
    if (i === 0) lines.push(line('ramyeon'));
    else {
      lines.push(line('ramyeon', i >= 2 && r() < 0.45 ? pick(r, STATION_SAUCES.pot) : null));
      if (r() < 0.55) lines.push(line(pick(r, drinks)));
      if (i >= 4 && r() < 0.3) lines.push(cookedLine(r, pick(r, ['grill', 'fry', 'wok', 'steam'])));
    }
  } else if (levelN > 7) {
    // Part 2 mix nights (a line of three): one cooked thing from any open
    // station, often a drink or a snack; festival guests order a little more.
    const def = levelDef(levelN);
    const kinds = cookedKinds(def);
    lines.push(cookedLine(r, pick(r, kinds)));
    if (def.festival && r() < 0.35) lines.push(cookedLine(r, pick(r, kinds)));
    if (r() < 0.55) lines.push(line(pick(r, r() < 0.7 ? drinks : foods)));
  } else {
    // Queue (level 6): smaller orders, since several wait at once.
    lines.push(cookedLine(r, pick(r, ['grill', 'fry', 'wok'])));
    if (r() < 0.55) lines.push(line(pick(r, r() < 0.7 ? drinks : foods)));
  }
  return { lines, patience: patienceFor(lines, levelN) };
}

// Seconds of patience: a base plus time for each thing that has to be cooked
// (the slow stations a little more).
export const COOK_WAIT = { ready: 4, grill: 16, fry: 16, wok: 16, steam: 18, pot: 20 };
export function patienceFor(lines, levelN, look = null, vip = false) {
  const def = levelDef(levelN);
  let p = levelN === 1 ? 22 : 26;
  for (const l of lines) {
    p += COOK_WAIT[ITEMS[l.item].kind];
    if (l.sauce) p += 3;
  }
  // A line of guests: everyone waits at once, so each waits longer.
  if (def && def.queue > 1) p *= 1.9;
  if (typeof look === 'string' && SPIRITS[look]) p *= SPIRITS[look].patience;
  if (vip) p *= VIP_PATIENCE;
  return Math.round(p);
}

// Who comes to the counter: the level's guest of honour (or its new spirit)
// first, Chimaek last on level 3, now and then a normal person, otherwise one
// of the spirits of the night.
export function featuredSpirit(levelN) {
  const def = levelDef(levelN);
  if (def && def.guest) return def.guest;
  return Object.keys(SPIRITS).find((id) => SPIRITS[id].from === levelN) || null;
}
function pickLook(levelN, i, r, def) {
  if (levelN === 3 && i === def.customers - 1) return 'shiba';
  const featured = featuredSpirit(levelN);
  if (i === 0 && featured) return featured;
  if (r() < PERSON_SHARE) return Math.floor(r() * LOOKS);
  return pick(r, spiritsFor(levelN, !!def.rain));
}

// Festival nights: the guest of honour and every `vipEvery`-th guest are VIPs
// (gold ticket: they pay VIP_PAY times the price and wait a little less).
export const isVip = (def, i) => !!def.vipEvery && (i === 0 || i % def.vipEvery === def.vipEvery - 1);
// Rush (level 12): a burst of guests who want drinks and snacks, fast.
export const isRush = (def, i) => !!def.rush && i >= def.rush.from && i < def.rush.from + def.rush.count;
function rushOrder(levelN, r) {
  const menu = menuFor(levelN).filter((id) => ITEMS[id].kind === 'ready');
  const lines = [line(pick(r, menu))];
  if (r() < 0.45) lines.push(line(pick(r, menu)));
  return { lines };
}
// ---------- endless nights ----------
// Guest i waits endlessPace(i) as long as usual and the next one joins
// endlessGap(i) seconds later: both shrink as the night goes on.
export const endlessPace = (i) => Math.max(0.35, 1 - i * 0.014);
export const endlessGap = (i) => Math.max(1.2, 3.5 - i * 0.06);
export const endlessRush = (i) => i >= ENDLESS.rushEvery - ENDLESS.rushCount && i % ENDLESS.rushEvery >= ENDLESS.rushEvery - ENDLESS.rushCount;
export const endlessSpecial = (seed) => ENDLESS.specials[(seed >>> 0) % ENDLESS.specials.length];
// The order of guest i on an endless night (r: the night's random stream).
// Later guests order a second cooked thing more often.
export function endlessOrder(i, r, special) {
  const def = ENDLESS;
  const rush = endlessRush(i);
  const o = rush ? rushOrder(def.n, r) : makeOrder(def.n, i, r);
  if (!rush && r() < Math.min(0.5, 0.1 + i * 0.01)) o.lines.splice(1, 0, cookedLine(r, pick(r, cookedKinds(def))));
  o.look = pickLook(def.n, i, r, def);
  for (const l of o.lines) if (l.item === special) l.mul = SPECIAL_PAY;
  if (i % def.vipEvery === def.vipEvery - 1) { o.vip = true; for (const l of o.lines) l.mul = (l.mul || 1) * VIP_PAY; }
  if (rush) o.rush = true;
  o.patience = Math.round(patienceFor(o.lines, def.n, o.look, o.vip) * (rush ? RUSH_PATIENCE : 1) * endlessPace(i));
  return o;
}

// The night's special (`special`) pays SPECIAL_PAY times; a VIP pays VIP_PAY
// times on top.
export function makeOrders(levelN, seed) {
  const def = levelDef(levelN);
  const r = rng(seed ?? def.seed);
  const orders = [];
  for (let i = 0; i < def.customers; i++) {
    const rush = isRush(def, i);
    const o = rush ? rushOrder(levelN, r) : makeOrder(levelN, i, r);
    o.look = pickLook(levelN, i, r, def);
    if (def.special) for (const l of o.lines) if (l.item === def.special) l.mul = SPECIAL_PAY;
    if (isVip(def, i)) {
      o.vip = true;
      for (const l of o.lines) l.mul = (l.mul || 1) * VIP_PAY;
    }
    if (rush) o.rush = true;
    o.patience = Math.round(patienceFor(o.lines, levelN, o.look, o.vip) * (rush ? RUSH_PATIENCE : 1));
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

// Wok: tossing cooks. Each toss adds spec.perToss. Tossing again before the
// food has landed (spec.air seconds) spills some: progress drops and the dish
// can't be perfect. With no toss for spec.idleSafe seconds it starts to
// scorch, and it is burnt spec.scorchTime later. A toss clears the scorch.
export function newWokItem(item) {
  return { item, p: 0, scorch: 0, idle: 0, air: 9, spills: 0, tosses: 0 };
}
export function stepWok(w, dt, spec = COOK.wok) {
  w.idle += dt;
  w.air += dt;
  if (w.idle > spec.idleSafe) w.scorch = Math.min(1, w.scorch + dt / spec.scorchTime);
  return w;
}
export function tossWok(w, spec = COOK.wok) {
  if (wokState(w) === 'burnt') return 'burnt';
  const spill = w.air < spec.air;
  w.air = 0; w.idle = 0; w.scorch = 0;
  if (spill) {
    w.spills += 1;
    w.p = Math.max(0, w.p - spec.spillLoss);
    return 'spill';
  }
  w.tosses += 1;
  w.p = Math.min(spec.max, w.p + spec.perToss);
  return 'toss';
}
export function wokState(w, spec = COOK.wok) {
  if (w.scorch >= 1) return 'burnt';
  return w.p >= spec.done ? 'done' : 'raw';
}
export const wokPerfect = (w, spec = COOK.wok) => wokState(w, spec) === 'done' && isPerfect(w.p, spec) && w.spills === 0;

// Steamer: a basket cooks only while its lid is on. Lift the lid to take the
// food out (it stops cooking while the lid is off).
export function newSteamItem(item) {
  return { item, p: 0, lid: false };
}
export function stepSteam(b, dt, spec = COOK.steam) {
  if (b.lid) b.p = Math.min(spec.max, b.p + dt / spec.time);
  return b;
}
export const steamState = (b, spec = COOK.steam) => cookState(b.p, spec);

// Noodle pot: water first (it takes spec.boil seconds to boil), then the
// noodles, which cook in a timing window like the fryer. Taking the noodles
// out empties the pot (the broth goes with them).
export function newPot() {
  return { boil: 0, item: null, p: 0 };
}
export const potBoiling = (pt) => !!pt && pt.boil >= 1;
export function stepPot(pt, dt, spec = COOK.pot) {
  if (pt.boil < 1) pt.boil = Math.min(1, pt.boil + dt / spec.boil);
  else if (pt.item) pt.p = Math.min(spec.max, pt.p + dt / spec.time);
  return pt;
}
export const potState = (pt, spec = COOK.pot) => (pt && pt.item ? cookState(pt.p, spec) : null);

// What lands on the tray.
export function trayItem(item, cook = null, perfect = false) {
  return { item, cook, perfect, sauce: null };
}

// Can `sauce` go on this tray item? Only on food it suits (its station, and
// for the dips only mandu), once.
export function canSauce(t, sauce) {
  return sauceSuits(sauce, t.item) && !t.sauce;
}

// ---------- scoring ----------
export const MISTAKE_PENALTY = 2;
export const TIP_SHARE = 0.5;

// `mul` doubles a line for a VIP (and for the night's special, part 2).
export function linePrice(l) {
  return (ITEMS[l.item].price + (l.sauce ? SAUCES[l.sauce].price : 0)) * (l.mul || 1);
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
// A level is open if it is level 1 or the one before it earned at least a
// star; endless nights open with a star on the last level.
export function isUnlocked(levelN, stars) {
  if (levelN === 1) return true;
  if (levelN === ENDLESS.n) return (stars[LEVELS[LEVELS.length - 1].n] || 0) >= 1;
  if (!levelDef(levelN)) return false;
  return (stars[levelN - 1] || 0) >= 1;
}
// Stations shown on a level: its own, plus the next one as a locked preview.
export function levelStations(levelN) {
  const def = levelDef(levelN);
  const next = STATION_ORDER.find((id) => !def.stations.includes(id));
  return STATION_ORDER.filter((id) => def.stations.includes(id) || id === next);
}
export function stationStatus(levelN, station) {
  return levelDef(levelN).stations.includes(station) ? 'open' : 'locked';
}

// ---------- stall upgrades and the coin purse ----------
// What the bought upgrades change. `owned` is { id: true }.
export function upgradeEffects(owned = {}) {
  const o = owned || {};
  return {
    grillSlots: GRILL_SLOTS + (o.grill4 ? 1 : 0),
    trayMax: TRAY_MAX + (o.tray5 ? 1 : 0),
    fryTime: COOK.fry.time * (o.fastfry ? 0.8 : 1),
    patienceMul: o.patience ? 1.2 : 1,
    perToss: COOK.wok.perToss * (o.wokfast ? 4 / 3 : 1),
  };
}
// Cooking specs for a game with these upgrades (copies; COOK is never changed).
export function cookSpecs(owned) {
  const e = upgradeEffects(owned);
  return {
    grill: { ...COOK.grill }, fry: { ...COOK.fry, time: e.fryTime }, wok: { ...COOK.wok, perToss: e.perToss },
    steam: { ...COOK.steam }, pot: { ...COOK.pot },
  };
}
export const upgradeById = (id) => UPGRADES.find((u) => u.id === id) || null;
export function canBuy(purse, id) {
  const u = upgradeById(id);
  return !!u && !purse.upgrades[id] && purse.wallet >= u.cost;
}
// purse: { wallet, upgrades }. Returns true if bought.
export function buyUpgrade(purse, id) {
  if (!canBuy(purse, id)) return false;
  purse.wallet -= upgradeById(id).cost;
  purse.upgrades[id] = true;
  return true;
}
// A night's coins go into the purse (a bad night never takes coins away).
export const nightPay = (coins) => Math.max(0, Math.round(coins));
