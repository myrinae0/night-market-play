// Game state and player actions (no DOM). The renderer reads state; main.js
// turns input (drags or taps) into these actions and plays the events they emit.
import { ITEMS, SAUCES, FRY_BASKETS, STATION_ORDER, STATIONS } from './data.js';
import {
  levelDef, makeOrders, newGrillItem, stepGrill, flipGrill, grillState, grillPerfect,
  newFryItem, stepFry, fryState, isPerfect, trayItem, canSauce, scoreServe, levelMax, starsFor,
  stationStatus, newWokItem, stepWok, tossWok, wokState, wokPerfect, upgradeEffects, cookSpecs,
} from './logic.js';
import { SPIRITS } from './spirits.js';

const ENTER_TIME = 0.8;
const LEAVE_TIME = 1.0;
const DIP_TIME = 0.45;
const ARRIVE_GAP = 3.5; // queue levels: seconds between new guests joining the line

// opts: seed, upgrades ({ id: true }), relTips ({ spirit: coins }),
// autoBasket (tap controls: battered chicken drops into a basket by itself).
export function createGame(levelN, opts = {}) {
  const def = levelDef(levelN);
  const orders = makeOrders(levelN, opts.seed);
  const fx = upgradeEffects(opts.upgrades);
  const g = {
    level: levelN, def, orders, max: levelMax(orders),
    phase: 'intro', time: 0,
    custIdx: -1, customer: null, line: [], queueMax: def.queue || 1, arriveT: 0, nextId: 1,
    coins: 0, served: 0, lost: 0, results: [],
    stations: STATION_ORDER.map((id) => ({ id, status: stationStatus(levelN, id, STATIONS) })),
    station: STATION_ORDER.indexOf(def.intro.station),
    grill: new Array(fx.grillSlots).fill(null),
    fryer: { bowl: null, baskets: new Array(FRY_BASKETS).fill(null) },
    wok: null,
    tray: [], trayMax: fx.trayMax,
    cook: cookSpecs(opts.upgrades),
    patienceMul: fx.patienceMul,
    relTips: opts.relTips || {},
    autoBasket: opts.autoBasket !== false,
    held: null, // a sauce id waiting for a tray target (tap controls)
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
  arrive(g);
}

// The next guest joins the line.
function arrive(g) {
  if (g.custIdx + 1 >= g.orders.length) return false;
  g.custIdx += 1;
  const o = g.orders[g.custIdx];
  const sp = typeof o.look === 'string' ? SPIRITS[o.look] : null;
  const p = o.patience * g.patienceMul;
  // Queue levels: each guest stands in the leftmost free spot at the counter.
  const used = new Set(g.line.map((c) => c.col));
  let col = 0;
  while (used.has(col)) col++;
  const c = {
    id: g.nextId++, order: o, look: o.look, patience: p, maxPatience: p, col,
    phase: 'enter', t: 0, mood: 'wait', result: null, enterTime: sp ? sp.enter : ENTER_TIME,
  };
  g.line.push(c);
  g.customer = g.line[0];
  g.arriveT = ARRIVE_GAP;
  emit(g, 'sfx', { name: 'bell' });
  emit(g, 'arrive', { look: o.look, cid: c.id, col });
  return true;
}

function endLevel(g) {
  g.phase = 'end';
  g.customer = null;
  g.coins = Math.max(0, g.coins);
  g.stars = starsFor(g.coins, g.max);
  emit(g, 'end', { stars: g.stars });
  emit(g, 'sfx', { name: g.stars > 0 ? 'win' : 'lose' });
}

export const waiting = (g) => g.line.filter((c) => c.phase === 'wait');

export function update(g, dt) {
  if (g.phase !== 'play') return;
  g.time += dt;
  // Cooking keeps going whatever station you look at.
  g.grill.forEach((it, i) => {
    if (!it) return;
    const before = grillState(it, g.cook.grill);
    stepGrill(it, dt, g.cook.grill);
    const after = grillState(it, g.cook.grill);
    if (before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'grill', slot: i });
  });
  const bowl = g.fryer.bowl;
  if (bowl && bowl.dipping > 0) {
    bowl.dipping -= dt;
    if (bowl.dipping <= 0) {
      bowl.dipping = 0;
      bowl.battered = true;
      if (g.autoBasket) dropInBasket(g);
    }
  }
  g.fryer.baskets.forEach((it, i) => {
    if (!it) return;
    const before = fryState(it, g.cook.fry);
    stepFry(it, dt, g.cook.fry);
    const after = fryState(it, g.cook.fry);
    if (before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'fryer', slot: i });
  });
  if (g.wok) {
    const before = wokState(g.wok, g.cook.wok);
    const warned = g.wok.scorch > 0;
    stepWok(g.wok, dt, g.cook.wok);
    const after = wokState(g.wok, g.cook.wok);
    if (!warned && g.wok.scorch > 0) emit(g, 'scorch');
    if (before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'wok' });
  }
  // Guests: walk in, wait (patience runs down), leave.
  for (const c of g.line) {
    c.t += dt;
    if (c.phase === 'enter' && c.t >= c.enterTime) { c.phase = 'wait'; c.t = 0; }
    else if (c.phase === 'wait') {
      c.patience = Math.max(0, c.patience - dt);
      if (c.patience <= 0) {
        c.phase = 'leave'; c.t = 0; c.mood = 'angry';
        g.lost += 1;
        g.results.push({ walked: true, coins: 0 });
        emit(g, 'walkout', { cid: c.id, look: c.look });
        emit(g, 'sfx', { name: 'walkout' });
      }
    }
  }
  const before = g.line.length;
  g.line = g.line.filter((c) => !(c.phase === 'leave' && c.t >= LEAVE_TIME));
  g.customer = g.line[0] || null;
  // New guests: one at a time on normal levels; up to queueMax on queue levels
  // (a spot frees up once the guest who stood there has walked off).
  g.arriveT -= dt;
  const present = g.line.filter((c) => c.phase !== 'leave').length;
  if (g.queueMax <= 1) {
    if (g.line.length === 0 && before > 0) arrive(g);
  } else if (g.line.length < g.queueMax && (g.arriveT <= 0 || present === 0)) arrive(g);
  if (g.line.length === 0 && g.custIdx + 1 >= g.orders.length) endLevel(g);
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
export const stationOpen = (g, id) => g.stations.some((s) => s.id === id && s.status === 'open');

function trayAdd(g, t) {
  if (g.tray.length >= g.trayMax) {
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

// Grill. `slot` picks the spot (drag controls); without it, the first free one.
export function grillAdd(g, item, slot = null) {
  if (g.phase !== 'play' || ITEMS[item]?.kind !== 'grill') return false;
  const i = slot == null ? g.grill.indexOf(null) : (g.grill[slot] === null ? slot : -1);
  if (i < 0) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: slot == null ? 'GRILL IS FULL' : 'THAT SPOT IS TAKEN' }); return false; }
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
// Drag controls: food dragged from a station to the bin (costs the ingredient).
export function discard(g, station, slot = 0) {
  if (station === 'grill' && g.grill[slot]) g.grill[slot] = null;
  else if (station === 'fryer' && g.fryer.baskets[slot]) g.fryer.baskets[slot] = null;
  else if (station === 'wok' && g.wok) g.wok = null;
  else return false;
  return toss(g, station, slot);
}
export function grillTake(g, slot) {
  const it = g.grill[slot];
  if (!it) return false;
  const st = grillState(it, g.cook.grill);
  if (st === 'burnt') { g.grill[slot] = null; return toss(g, 'grill', slot); }
  const t = trayItem(it.item, st, grillPerfect(it, g.cook.grill));
  if (!trayAdd(g, t)) return false;
  g.grill[slot] = null;
  emit(g, 'sfx', { name: t.cook === 'done' ? 'grab' : 'nope' });
  if (t.cook === 'raw') emit(g, 'toast', { text: 'STILL RAW!' });
  if (t.perfect) emit(g, 'toast', { text: 'PERFECT!', good: true });
  return true;
}

// Fryer: chicken bin -> batter bowl (dip) -> basket -> lift onto the tray.
export function fryAdd(g) {
  if (g.phase !== 'play') return false;
  if (g.fryer.bowl) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'THE BOWL IS BUSY' }); return false; }
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
// Drag controls: raw chicken dropped on the bowl goes in and is dipped at once.
export function fryBatter(g) {
  if (g.fryer.bowl && !g.fryer.bowl.battered && g.fryer.bowl.dipping <= 0) return fryDip(g);
  return fryAdd(g) && fryDip(g);
}
function dropInBasket(g, slot = null) {
  const i = slot == null ? g.fryer.baskets.indexOf(null) : (g.fryer.baskets[slot] === null ? slot : -1);
  if (i < 0) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'BASKETS FULL' }); return false; }
  g.fryer.bowl = null;
  g.fryer.baskets[i] = newFryItem();
  emit(g, 'sfx', { name: 'fry' });
  emit(g, 'place', { station: 'fryer', slot: i });
  return true;
}
// Drag controls: battered chicken from the bowl into a basket.
export function fryToBasket(g, slot = null) {
  const b = g.fryer.bowl;
  if (!b || !b.battered) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'BATTER IT FIRST' }); return false; }
  return dropInBasket(g, slot);
}
export function fryLift(g, slot) {
  const it = g.fryer.baskets[slot];
  if (!it) return false;
  const st = fryState(it, g.cook.fry);
  if (st === 'burnt') { g.fryer.baskets[slot] = null; return toss(g, 'fryer', slot); }
  const t = trayItem('chicken', st, isPerfect(it.p, g.cook.fry));
  if (!trayAdd(g, t)) return false;
  g.fryer.baskets[slot] = null;
  emit(g, 'sfx', { name: t.cook === 'done' ? 'grab' : 'nope' });
  if (t.cook === 'raw') emit(g, 'toast', { text: 'NOT CRISPY YET!' });
  if (t.perfect) emit(g, 'toast', { text: 'GOLDEN!', good: true });
  return true;
}

// Wok: start a dish, toss it (flick up), take it to the tray.
export function wokStart(g, item) {
  if (g.phase !== 'play' || ITEMS[item]?.kind !== 'wok' || !stationOpen(g, 'wok')) return false;
  if (g.wok) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'THE WOK IS BUSY' }); return false; }
  g.wok = newWokItem(item);
  emit(g, 'sfx', { name: 'sizzle' });
  emit(g, 'place', { station: 'wok', slot: 0 });
  return true;
}
export function wokToss(g) {
  if (g.phase !== 'play' || !g.wok) return null;
  const r = tossWok(g.wok, g.cook.wok);
  if (r === 'burnt') { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'BURNT! THROW IT OUT' }); return r; }
  g.wok.tossT = g.time;
  emit(g, 'toss', { spill: r === 'spill' });
  if (r === 'spill') {
    g.coins -= WASTE_COST;
    emit(g, 'sfx', { name: 'trash' });
    emit(g, 'toast', { text: `TOO FAST! SPILLED -${WASTE_COST}` });
  } else emit(g, 'sfx', { name: 'toss' });
  return r;
}
export function wokTake(g) {
  const w = g.wok;
  if (!w) return false;
  const st = wokState(w, g.cook.wok);
  if (st === 'burnt') { g.wok = null; return toss(g, 'wok', 0); }
  const t = trayItem(w.item, st, wokPerfect(w, g.cook.wok));
  if (!trayAdd(g, t)) return false;
  g.wok = null;
  emit(g, 'sfx', { name: t.cook === 'done' ? 'grab' : 'nope' });
  if (t.cook === 'raw') emit(g, 'toast', { text: 'NOT COOKED YET!' });
  if (t.perfect) emit(g, 'toast', { text: 'PERFECT TOSS!', good: true });
  return true;
}

// Sauces (tap controls): tap a bottle. With exactly one item it fits, it goes
// on at once; otherwise the bottle is held until you tap an item on the tray.
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
  const cooking = st === 'grill' ? g.grill.some(Boolean) : st === 'wok' ? !!g.wok : (g.fryer.baskets.some(Boolean) || !!g.fryer.bowl);
  if (cooking) return 'TAKE IT TO THE TRAY FIRST';
  if (g.tray.some((t) => ITEMS[t.item].station === st && t.sauce)) return st === 'wok' ? 'ALREADY TOPPED' : 'ALREADY SAUCED';
  return st === 'grill' ? 'GRILL SOMETHING FIRST' : st === 'wok' ? 'COOK A WOK DISH FIRST' : 'FRY CHICKEN FIRST';
}
export function applySauce(g, index, sauce = g.held) {
  const t = g.tray[index];
  if (!t || !sauce) return false;
  if (!canSauce(t, sauce)) {
    emit(g, 'sfx', { name: 'nope' });
    emit(g, 'toast', { text: t.sauce && ITEMS[t.item].station === SAUCES[sauce].station ? (SAUCES[sauce].topping ? 'ALREADY TOPPED' : 'ALREADY SAUCED') : 'IT DOES NOT GO ON THAT' });
    return false;
  }
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

// Hand the tray to a guest: `idx` in g.line (default: the first waiting guest).
export function serve(g, idx = null) {
  const c = idx == null ? waiting(g)[0] || g.customer : g.line[idx];
  if (g.phase !== 'play' || !c || c.phase !== 'wait') return null;
  if (g.tray.length === 0) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'TRAY IS EMPTY' }); return null; }
  const res = scoreServe(c.order, g.tray, c.patience / c.maxPatience);
  // Spirits you get on with tip a little more; the moss golem adds old coins.
  if (res.mood === 'happy' && typeof c.look === 'string' && SPIRITS[c.look]) {
    const tip = Math.max(0, res.tip + (g.relTips[c.look] || 0));
    const old = SPIRITS[c.look].oldCoins || 0;
    res.coins += tip - res.tip + old;
    res.tip = tip;
    res.oldCoins = old;
  }
  g.tray = [];
  g.held = null;
  g.coins += res.coins;
  g.served += 1;
  g.results.push(res);
  c.phase = 'leave'; c.t = 0; c.mood = res.mood; c.result = res;
  emit(g, 'served', { result: res, look: c.look, cid: c.id, idx: g.line.indexOf(c) });
  emit(g, 'sfx', { name: res.mood === 'happy' ? 'serve' : 'meh' });
  return res;
}
// Tap controls' SERVE button: the first guest whose order the tray matches
// exactly, otherwise the first waiting guest.
export function serveAuto(g) {
  const w = waiting(g);
  const c = w.find((x) => scoreServe(x.order, g.tray, 1).mood === 'happy') || w[0];
  return c ? serve(g, g.line.indexOf(c)) : serve(g);
}
