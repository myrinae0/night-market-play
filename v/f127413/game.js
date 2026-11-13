// Game state and player actions (no DOM). The renderer reads state; main.js
// turns input into these actions and plays the events they emit.
import { ITEMS, SAUCES, COOK, GRILL_SLOTS, FRY_BASKETS, TRAY_MAX, STATION_ORDER, STATIONS } from './data.js';
import {
  levelDef, makeOrders, newGrillItem, stepGrill, flipGrill, grillState, grillPerfect,
  newFryItem, stepFry, fryState, isPerfect, trayItem, canSauce, scoreServe, levelMax, starsFor,
  stationStatus,
} from './logic.js';

const ENTER_TIME = 0.8;
const LEAVE_TIME = 1.0;
const DIP_TIME = 0.45;

export function createGame(levelN, opts = {}) {
  const def = levelDef(levelN);
  const orders = makeOrders(levelN, opts.seed);
  const g = {
    level: levelN, def, orders, max: levelMax(orders),
    phase: 'intro', time: 0,
    custIdx: -1, customer: null,
    coins: 0, served: 0, lost: 0, results: [],
    stations: STATION_ORDER.map((id) => ({ id, status: stationStatus(levelN, id, STATIONS) })),
    station: STATION_ORDER.indexOf(def.intro.station),
    grill: new Array(GRILL_SLOTS).fill(null),
    fryer: { bowl: null, baskets: new Array(FRY_BASKETS).fill(null) },
    tray: [],
    held: null, // a sauce id waiting for a tray target
    events: [],
    stars: 0,
  };
  if (levelN === 1) g.station = 0;
  return g;
}

const emit = (g, type, data = {}) => g.events.push({ type, ...data });
export function takeEvents(g) {
  const e = g.events;
  g.events = [];
  return e;
}

export function start(g) {
  if (g.phase !== 'intro') return;
  g.phase = 'play';
  nextCustomer(g);
}

function nextCustomer(g) {
  g.custIdx += 1;
  if (g.custIdx >= g.orders.length) {
    g.customer = null;
    endLevel(g);
    return;
  }
  const o = g.orders[g.custIdx];
  g.customer = { order: o, patience: o.patience, maxPatience: o.patience, phase: 'enter', t: 0, mood: 'wait', result: null };
  emit(g, 'sfx', { name: 'bell' });
}

function endLevel(g) {
  g.phase = 'end';
  g.coins = Math.max(0, g.coins);
  g.stars = starsFor(g.coins, g.max);
  emit(g, 'end', { stars: g.stars });
  emit(g, 'sfx', { name: g.stars > 0 ? 'win' : 'lose' });
}

export function update(g, dt) {
  if (g.phase !== 'play') return;
  g.time += dt;
  // Cooking keeps going whatever station you look at.
  g.grill.forEach((it, i) => {
    if (!it) return;
    const before = grillState(it);
    stepGrill(it, dt);
    const after = grillState(it);
    if (before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'grill', slot: i });
  });
  const bowl = g.fryer.bowl;
  if (bowl && bowl.dipping > 0) {
    bowl.dipping -= dt;
    if (bowl.dipping <= 0) {
      bowl.dipping = 0;
      bowl.battered = true;
      dropInBasket(g);
    }
  }
  g.fryer.baskets.forEach((it, i) => {
    if (!it) return;
    const before = fryState(it);
    stepFry(it, dt);
    const after = fryState(it);
    if (before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'fryer', slot: i });
  });
  const c = g.customer;
  if (!c) return;
  c.t += dt;
  if (c.phase === 'enter' && c.t >= ENTER_TIME) { c.phase = 'wait'; c.t = 0; }
  else if (c.phase === 'wait') {
    c.patience = Math.max(0, c.patience - dt);
    if (c.patience <= 0) {
      c.phase = 'leave'; c.t = 0; c.mood = 'angry';
      g.lost += 1;
      g.results.push({ walked: true, coins: 0 });
      emit(g, 'walkout');
      emit(g, 'sfx', { name: 'walkout' });
    }
  } else if (c.phase === 'leave' && c.t >= LEAVE_TIME) nextCustomer(g);
}

// ---------- stations ----------
export function switchStation(g, dir) {
  const n = g.station + dir;
  if (n < 0 || n >= g.stations.length) return false;
  g.station = n;
  emit(g, 'sfx', { name: 'swipe' });
  return true;
}
export function goStation(g, idx) {
  if (idx === g.station || idx < 0 || idx >= g.stations.length) return false;
  const dir = Math.sign(idx - g.station);
  g.station = idx;
  emit(g, 'sfx', { name: 'swipe' });
  return dir;
}
export const currentStation = (g) => g.stations[g.station];

function trayAdd(g, t) {
  if (g.tray.length >= TRAY_MAX) {
    emit(g, 'sfx', { name: 'nope' });
    emit(g, 'toast', { text: 'TRAY IS FULL' });
    return false;
  }
  g.tray.push(t);
  emit(g, 'tray', { index: g.tray.length - 1 });
  return true;
}

// Counter / cooler: ready items go straight to the tray.
export function grabReady(g, item) {
  if (g.phase !== 'play') return false;
  const it = ITEMS[item];
  if (!it || it.kind !== 'ready' || it.unlock > g.level) return false;
  if (!trayAdd(g, trayItem(item))) return false;
  emit(g, 'sfx', { name: it.drink ? 'clink' : 'grab' });
  return true;
}

// Grill
export function grillAdd(g, item) {
  if (g.phase !== 'play' || ITEMS[item]?.kind !== 'grill') return false;
  const i = g.grill.indexOf(null);
  if (i < 0) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'GRILL IS FULL' }); return false; }
  g.grill[i] = newGrillItem(item);
  emit(g, 'sfx', { name: 'sizzle' });
  emit(g, 'place', { station: 'grill', slot: i });
  return true;
}
export function grillFlip(g, slot) {
  const it = g.grill[slot];
  if (!it) return false;
  flipGrill(it);
  it.flipT = g.time;
  emit(g, 'sfx', { name: 'flip' });
  return true;
}
export const WASTE_COST = 1;
// Burnt food goes in the bin and costs the ingredient.
function toss(g, station, slot) {
  g.coins -= WASTE_COST;
  emit(g, 'sfx', { name: 'trash' });
  emit(g, 'toast', { text: `TOSSED -${WASTE_COST}` });
  emit(g, 'waste', { station, slot });
  return true;
}
export function grillTake(g, slot) {
  const it = g.grill[slot];
  if (!it) return false;
  if (grillState(it) === 'burnt') { g.grill[slot] = null; return toss(g, 'grill', slot); }
  const t = trayItem(it.item, grillState(it), grillPerfect(it));
  if (!trayAdd(g, t)) return false;
  g.grill[slot] = null;
  emit(g, 'sfx', { name: t.cook === 'done' ? 'grab' : 'nope' });
  if (t.cook === 'raw') emit(g, 'toast', { text: 'STILL RAW!' });
  if (t.perfect) emit(g, 'toast', { text: 'PERFECT!', good: true });
  return true;
}

// Fryer: chicken bin -> batter bowl (tap to dip) -> basket -> lift onto the tray.
export function fryAdd(g) {
  if (g.phase !== 'play') return false;
  if (g.fryer.bowl) { emit(g, 'sfx', { name: 'nope' }); return false; }
  g.fryer.bowl = { battered: false, dipping: 0 };
  emit(g, 'sfx', { name: 'grab' });
  return true;
}
export function fryDip(g) {
  const b = g.fryer.bowl;
  if (!b || b.dipping > 0) return false;
  if (!b.battered) {
    b.dipping = DIP_TIME;
    emit(g, 'sfx', { name: 'batter' });
    return true;
  }
  return dropInBasket(g);
}
function dropInBasket(g) {
  const i = g.fryer.baskets.indexOf(null);
  if (i < 0) { emit(g, 'toast', { text: 'BASKETS FULL' }); return false; }
  g.fryer.bowl = null;
  g.fryer.baskets[i] = newFryItem();
  emit(g, 'sfx', { name: 'fry' });
  emit(g, 'place', { station: 'fryer', slot: i });
  return true;
}
export function fryLift(g, slot) {
  const it = g.fryer.baskets[slot];
  if (!it) return false;
  if (fryState(it) === 'burnt') { g.fryer.baskets[slot] = null; return toss(g, 'fryer', slot); }
  const t = trayItem('chicken', fryState(it), isPerfect(it.p, COOK.fry));
  if (!trayAdd(g, t)) return false;
  g.fryer.baskets[slot] = null;
  emit(g, 'sfx', { name: t.cook === 'done' ? 'grab' : 'nope' });
  if (t.cook === 'raw') emit(g, 'toast', { text: 'NOT CRISPY YET!' });
  if (t.perfect) emit(g, 'toast', { text: 'GOLDEN!', good: true });
  return true;
}

// Sauces: tap a bottle. With exactly one item it fits, it goes on at once;
// otherwise the bottle is held until you tap an item on the tray.
export function pickSauce(g, sauce) {
  if (g.phase !== 'play' || !SAUCES[sauce]) return false;
  if (g.held === sauce) { g.held = null; return true; }
  const fits = g.tray.map((t, i) => (canSauce(t, sauce) ? i : -1)).filter((i) => i >= 0);
  if (fits.length === 1) return applySauce(g, fits[0], sauce);
  if (fits.length === 0) {
    emit(g, 'sfx', { name: 'nope' });
    emit(g, 'toast', { text: sauceHint(g, sauce) });
    return false;
  }
  g.held = sauce;
  emit(g, 'sfx', { name: 'tap' });
  return true;
}
// Why no tray item can take this sauce, in a few words for the toast.
// Food still cooking comes first: that is the item the player is thinking of.
export function sauceHint(g, sauce) {
  const st = SAUCES[sauce].station;
  const cooking = st === 'grill' ? g.grill.some(Boolean) : (g.fryer.baskets.some(Boolean) || !!g.fryer.bowl);
  if (cooking) return 'TAKE IT TO THE TRAY FIRST';
  if (g.tray.some((t) => ITEMS[t.item].station === st && t.sauce)) return 'ALREADY SAUCED';
  return st === 'grill' ? 'GRILL SOMETHING FIRST' : 'FRY CHICKEN FIRST';
}
export function applySauce(g, index, sauce = g.held) {
  const t = g.tray[index];
  if (!t || !sauce) return false;
  if (!canSauce(t, sauce)) { emit(g, 'sfx', { name: 'nope' }); return false; }
  t.sauce = sauce;
  g.held = null;
  emit(g, 'sfx', { name: 'sauce' });
  emit(g, 'sauced', { index });
  return true;
}
export function tapTray(g, index) {
  if (g.held) return applySauce(g, index);
  return false;
}
export function trashTray(g, index) {
  if (!g.tray[index]) return false;
  g.tray.splice(index, 1);
  emit(g, 'sfx', { name: 'trash' });
  return true;
}

// Hand the tray to the customer.
export function serve(g) {
  const c = g.customer;
  if (g.phase !== 'play' || !c || c.phase !== 'wait') return null;
  if (g.tray.length === 0) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'TRAY IS EMPTY' }); return null; }
  const res = scoreServe(c.order, g.tray, c.patience / c.maxPatience);
  g.tray = [];
  g.held = null;
  g.coins += res.coins;
  g.served += 1;
  g.results.push(res);
  c.phase = 'leave'; c.t = 0; c.mood = res.mood; c.result = res;
  emit(g, 'served', { result: res });
  emit(g, 'sfx', { name: res.mood === 'happy' ? 'serve' : 'meh' });
  return res;
}
