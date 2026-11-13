// Game state and player actions (no DOM). The renderer reads state; main.js
// turns input (drags or taps) into these actions and plays the events they emit.
import { ITEMS, SAUCES, FRY_BASKETS, sauceStations, MOODS, TREAT, RUSH_GAP, COOK_TEXT } from './data.js';
import {
  levelDef, makeOrders, newGrillItem, stepGrill, flipGrill, grillState, grillPerfect,
  newFryItem, stepFry, fryState, isPerfect, trayItem, canSauce, scoreServe, levelMax, starsFor,
  levelStations, stationStatus, newWokItem, stepWok, tossWok, wokState, wokPerfect, upgradeEffects, cookSpecs,
  newSteamItem, stepSteam, steamState, newPot, stepPot, potState, potBoiling,
  rng, endlessOrder, endlessGap, endlessSpecial, endlessStep,
} from './logic.js';
import { SPIRITS } from './spirits.js';

const ENTER_TIME = 0.8;
const LEAVE_TIME = 1.0;
const DIP_TIME = 0.45;
const ARRIVE_GAP = 3.5; // queue levels: seconds between new guests joining the line

// opts: seed, upgrades ({ id: true }), relTips ({ spirit: coins }),
// moods ({ spirit: 'glad' | 'ok' | 'grumpy' }, regulars from level 8),
// autoBasket (tap controls' helpers: battered chicken drops into a basket by
// itself, the steamer's lid goes on by itself, noodles wait for the boil).
export function createGame(levelN, opts = {}) {
  const def = levelDef(levelN);
  const orders = makeOrders(levelN, opts.seed);
  const fx = upgradeEffects(opts.upgrades);
  const shown = levelStations(levelN);
  const seed = (opts.seed ?? def.seed) >>> 0;
  const g = {
    level: levelN, def, orders, max: levelMax(orders),
    // Endless nights make their guests as they go, from the night's seed.
    endless: !!def.endless, rng: def.endless ? rng(seed) : null, special: def.endless ? endlessSpecial(seed) : def.special || null,
    phase: 'intro', time: 0,
    custIdx: -1, customer: null, line: [], queueMax: def.queue || 1, arriveT: 0, nextId: 1,
    coins: 0, served: 0, lost: 0, results: [],
    stations: shown.map((id) => ({ id, status: stationStatus(levelN, id) })),
    station: Math.max(0, shown.indexOf(def.intro.station)),
    grill: new Array(fx.grillSlots).fill(null),
    fryer: { bowl: null, baskets: new Array(FRY_BASKETS).fill(null) },
    wok: null,
    steamer: new Array(fx.steamBaskets).fill(null),
    pot: null,
    tray: [], trayMax: fx.trayMax,
    cook: cookSpecs(opts.upgrades),
    patienceMul: fx.patienceMul,
    potStaysHot: fx.potStaysHot, // the copper kettle
    relTips: opts.relTips || {},
    moods: def.regulars ? opts.moods || {} : {},
    // Chimaek's treat (level 9 on): when she wants one, plain grilled beef
    // makes tips worth more for a while.
    dog: def.treat ? { want: false, next: TREAT.first, until: 0, happyUntil: 0, fed: 0, ateT: -9, refuseT: -9 } : null,
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
  if (g.endless && g.custIdx + 1 >= g.orders.length) g.orders.push(endlessOrder(g.orders.length, g.rng, g.special, endlessStep(g.orders.length, g.time)));
  if (g.custIdx + 1 >= g.orders.length) return false;
  g.custIdx += 1;
  const o = g.orders[g.custIdx];
  const sp = typeof o.look === 'string' ? SPIRITS[o.look] : null;
  const mood = (sp && g.moods[o.look]) || null; // a regular remembers you
  const p = o.patience * g.patienceMul * (mood ? MOODS[mood].patience : 1);
  // Queue levels: each guest stands in the leftmost free spot at the counter.
  const used = new Set(g.line.map((c) => c.col));
  let col = 0;
  while (used.has(col)) col++;
  const c = {
    id: g.nextId++, order: o, look: o.look, patience: p, maxPatience: p, col,
    phase: 'enter', t: 0, mood: 'wait', result: null, enterTime: sp ? sp.enter : ENTER_TIME, regular: mood,
  };
  g.line.push(c);
  g.customer = g.line[0];
  // The next guest joins sooner during a rush (and as an endless night goes on).
  const nextO = g.orders[g.custIdx + 1];
  g.arriveT = (nextO && nextO.rush) || (g.endless && endlessRushNext(g)) ? RUSH_GAP : g.endless ? endlessGap(endlessStep(g.custIdx, g.time)) : ARRIVE_GAP;
  emit(g, 'sfx', { name: 'bell' });
  emit(g, 'arrive', { look: o.look, cid: c.id, col, regular: mood });
  if (o.rush && !(g.orders[g.custIdx - 1] || {}).rush) emit(g, 'rush');
  return true;
}

const endlessRushNext = (g) => !!(g.orders[g.custIdx] && g.orders[g.custIdx].rush);
function endLevel(g) {
  g.phase = 'end';
  g.customer = null;
  g.coins = Math.max(0, g.coins);
  g.stars = g.endless ? 0 : starsFor(g.coins, g.max);
  emit(g, 'end', { stars: g.stars, endless: g.endless });
  emit(g, 'sfx', { name: g.stars > 0 || (g.endless && g.served > 0) ? 'win' : 'lose' });
}

export const waiting = (g) => g.line.filter((c) => c.phase === 'wait');

export function update(g, dt) {
  if (g.phase !== 'play') return;
  g.time += dt;
  // Cooking keeps going whatever station you look at.
  g.grill.forEach((it, i) => {
    if (!it) return;
    const before = grillState(it, g.cook.grill);
    const wasGold = isPerfect(it.sides[it.down], g.cook.grill);
    stepGrill(it, dt, g.cook.grill);
    goldChime(g, wasGold, isPerfect(it.sides[it.down], g.cook.grill), 'grill', i);
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
    const wasGold = isPerfect(it.p, g.cook.fry);
    stepFry(it, dt, g.cook.fry);
    goldChime(g, wasGold, isPerfect(it.p, g.cook.fry), 'fryer', i);
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
  g.steamer.forEach((b, i) => {
    if (!b) return;
    const before = steamState(b, g.cook.steam);
    const wasGold = isPerfect(b.p, g.cook.steam);
    stepSteam(b, dt, g.cook.steam);
    goldChime(g, wasGold, isPerfect(b.p, g.cook.steam), 'steamer', i);
    const after = steamState(b, g.cook.steam);
    if (before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'steamer', slot: i });
  });
  if (g.pot) {
    const pt = g.pot;
    const wasBoiling = potBoiling(pt), before = potState(pt, g.cook.pot);
    const wasGold = !!pt.item && isPerfect(pt.p, g.cook.pot);
    stepPot(pt, dt, g.cook.pot);
    goldChime(g, wasGold, !!pt.item && isPerfect(pt.p, g.cook.pot), 'pot');
    if (!wasBoiling && potBoiling(pt)) {
      emit(g, 'sfx', { name: 'boil' });
      emit(g, 'boiled');
      if (pt.queued) { const item = pt.queued; pt.queued = null; potAdd(g, item); }
    }
    const after = potState(pt, g.cook.pot);
    if (before && before !== after) emit(g, 'sfx', { name: after === 'burnt' ? 'burn' : 'ready', station: 'pot' });
  }
  if (g.dog) stepDog(g, dt);
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
  // Endless nights end after the last strike (every walk-out is one).
  if (g.endless && g.lost >= g.def.strikes) { endLevel(g); return; }
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
  if (!g.endless && g.line.length === 0 && g.custIdx + 1 >= g.orders.length) endLevel(g);
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
// Food comes off: still raw (a red toast), in the gold (a gold PERFECT! toast
// and a chime) or in the green (a green GOOD toast).
function tookFeedback(g, t, rawText) {
  if (t.cook === 'raw') { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: rawText }); return; }
  if (t.perfect) { emit(g, 'sfx', { name: 'perfect' }); emit(g, 'toast', { text: COOK_TEXT.tookPerfect, good: true, perfect: true }); return; }
  emit(g, 'sfx', { name: 'grab' });
  emit(g, 'toast', { text: COOK_TEXT.tookGood, good: true });
}
// A soft chime when food reaches the gold (a different one from 'ready', the
// green), once per item (per side on the grill).
const goldChime = (g, was, now, station, slot = 0) => { if (!was && now) emit(g, 'sfx', { name: 'gold', station, slot }); };
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
  else if (station === 'steamer' && g.steamer[slot]) g.steamer[slot] = null;
  else if (station === 'pot' && g.pot && g.pot.item) g.pot = null;
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
  tookFeedback(g, t, 'STILL RAW!');
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
  tookFeedback(g, t, 'NOT CRISPY YET!');
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
  const wasGold = wokPerfect(g.wok, g.cook.wok);
  const r = tossWok(g.wok, g.cook.wok);
  if (r === 'burnt') { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'BURNT! THROW IT OUT' }); return r; }
  g.wok.tossT = g.time;
  emit(g, 'toss', { spill: r === 'spill' });
  if (r === 'spill') {
    g.coins -= WASTE_COST;
    emit(g, 'sfx', { name: 'trash' });
    emit(g, 'toast', { text: `TOO FAST! SPILLED -${WASTE_COST}` });
  } else emit(g, 'sfx', { name: 'toss' });
  goldChime(g, wasGold, wokPerfect(g.wok, g.cook.wok), 'wok');
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
  tookFeedback(g, t, 'NOT COOKED YET!');
  return true;
}

// Steamer: raw mandu or a bun goes in an empty basket (lid off). A lid goes
// on a basket with food in it; only then does it steam. Lift the lid (flick
// up) to take the food out. Tap controls put the lid on and lift it for you.
export function steamAdd(g, item, slot = null) {
  if (g.phase !== 'play' || ITEMS[item]?.kind !== 'steam' || !stationOpen(g, 'steamer')) return false;
  const i = slot == null ? g.steamer.indexOf(null) : (g.steamer[slot] === null ? slot : -1);
  if (i < 0) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: slot == null ? 'BASKETS FULL' : 'THAT BASKET IS FULL' }); return false; }
  g.steamer[i] = newSteamItem(item);
  emit(g, 'sfx', { name: 'grab' });
  emit(g, 'place', { station: 'steamer', slot: i });
  if (g.autoBasket) steamLidOn(g, i);
  return true;
}
export function steamLidOn(g, slot) {
  const b = g.steamer[slot];
  if (!b || b.lid) return false;
  b.lid = true;
  b.lidT = g.time;
  emit(g, 'sfx', { name: 'lid' });
  emit(g, 'lid', { slot, on: true });
  return true;
}
export function steamLidOff(g, slot) {
  const b = g.steamer[slot];
  if (!b || !b.lid) return false;
  b.lid = false;
  b.lidT = g.time;
  emit(g, 'sfx', { name: 'steam' });
  emit(g, 'lid', { slot, on: false });
  return true;
}
// Tap controls' LID button.
export const steamLid = (g, slot) => (g.steamer[slot]?.lid ? steamLidOff(g, slot) : steamLidOn(g, slot));
export const freeLids = (g) => g.steamer.filter((b) => !b || !b.lid).length;
export function steamTake(g, slot) {
  const b = g.steamer[slot];
  if (!b) return false;
  if (b.lid) steamLidOff(g, slot); // tap controls lift it for you
  const st = steamState(b, g.cook.steam);
  if (st === 'burnt') { g.steamer[slot] = null; return toss(g, 'steamer', slot); }
  const t = trayItem(b.item, st, isPerfect(b.p, g.cook.steam));
  if (!trayAdd(g, t)) return false;
  g.steamer[slot] = null;
  tookFeedback(g, t, 'NOT STEAMED YET!');
  return true;
}

// Noodle pot: kettle -> wait for the boil -> ramyeon in -> take it in the gold.
export function potWater(g) {
  if (g.phase !== 'play' || !stationOpen(g, 'pot')) return false;
  if (g.pot) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'THERE IS WATER IN IT' }); return false; }
  g.pot = newPot();
  emit(g, 'sfx', { name: 'pour' });
  emit(g, 'place', { station: 'pot', slot: 0 });
  return true;
}
export function potAdd(g, item) {
  if (g.phase !== 'play' || ITEMS[item]?.kind !== 'pot' || !stationOpen(g, 'pot')) return false;
  const pt = g.pot;
  // Tap controls: with no water yet, it fills the pot and the noodles wait for the boil.
  if (!pt && g.autoBasket) { potWater(g); g.pot.queued = item; return true; }
  if (pt && !potBoiling(pt) && g.autoBasket && !pt.queued && !pt.item) { pt.queued = item; emit(g, 'toast', { text: 'IN WHEN IT BOILS', good: true }); return true; }
  const why = !pt ? 'ADD WATER FIRST' : pt.item || pt.queued ? 'THE POT IS BUSY' : !potBoiling(pt) ? 'WAIT FOR THE BOIL' : null;
  if (why) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: why }); return false; }
  pt.item = item;
  pt.p = 0;
  emit(g, 'sfx', { name: 'plop' });
  emit(g, 'place', { station: 'pot', slot: 0 });
  return true;
}
export function potTake(g) {
  const pt = g.pot;
  if (!pt || !pt.item) return false;
  const st = potState(pt, g.cook.pot);
  if (st === 'burnt') { g.pot = null; return toss(g, 'pot', 0); }
  const t = trayItem(pt.item, st, isPerfect(pt.p, g.cook.pot));
  if (!trayAdd(g, t)) return false;
  // The copper kettle keeps the water on the boil for the next ramyeon.
  g.pot = g.potStaysHot ? { ...newPot(), boil: 1 } : null;
  tookFeedback(g, t, 'STILL HARD!');
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
// Is there food of station `st` still cooking (or waiting to be taken)?
function busy(g, st) {
  if (st === 'grill') return g.grill.some(Boolean);
  if (st === 'fryer') return g.fryer.baskets.some(Boolean) || !!g.fryer.bowl;
  if (st === 'wok') return !!g.wok;
  if (st === 'steamer') return g.steamer.some(Boolean);
  if (st === 'pot') return !!(g.pot && (g.pot.item || g.pot.queued));
  return false;
}
const COOK_FIRST = {
  grill: 'GRILL SOMETHING FIRST', fryer: 'FRY CHICKEN FIRST', wok: 'COOK A WOK DISH FIRST', steamer: 'STEAM MANDU FIRST', pot: 'COOK RAMYEON FIRST',
};
// Why no tray item can take this sauce, in a few words for the toast.
// Food still cooking comes first: that is the item the player is thinking of.
export function sauceHint(g, sauce) {
  const s = SAUCES[sauce];
  const sts = sauceStations(sauce).filter((st) => stationOpen(g, st));
  if (sts.some((st) => busy(g, st))) return 'TAKE IT TO THE TRAY FIRST';
  if (g.tray.some((t) => sts.includes(ITEMS[t.item].station) && t.sauce && (!s.only || s.only.includes(t.item)))) return s.topping ? 'ALREADY TOPPED' : 'ALREADY SAUCED';
  if (s.only && g.tray.some((t) => sts.includes(ITEMS[t.item].station))) return `ONLY ON ${s.only.map((id) => ITEMS[id].short).join(' OR ')}`;
  if (sts.length > 1) return s.topping ? 'COOK NOODLES OR A WOK DISH' : 'COOK SOMETHING FIRST';
  return COOK_FIRST[sts[0] || sauceStations(sauce)[0]];
}
export function applySauce(g, index, sauce = g.held) {
  const t = g.tray[index];
  if (!t || !sauce) return false;
  if (!canSauce(t, sauce)) {
    emit(g, 'sfx', { name: 'nope' });
    const s = SAUCES[sauce];
    const same = sauceStations(sauce).includes(ITEMS[t.item].station) && (!s.only || s.only.includes(t.item));
    emit(g, 'toast', { text: t.sauce && same ? (s.topping ? 'ALREADY TOPPED' : 'ALREADY SAUCED') : 'IT DOES NOT GO ON THAT' });
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
  // Spirits you get on with tip a little more (and glad regulars more
  // again, grumpy ones less); the moss golem adds old coins.
  if (res.mood === 'happy' && typeof c.look === 'string' && SPIRITS[c.look]) {
    const moodTip = c.regular ? MOODS[c.regular].tip : 0;
    const tip = Math.max(0, res.tip + (g.relTips[c.look] || 0) + moodTip);
    const old = SPIRITS[c.look].oldCoins || 0;
    res.coins += tip - res.tip + old;
    res.tip = tip;
    res.oldCoins = old;
  }
  // A happy Chimaek: every tip is worth more for a while.
  if (res.mood === 'happy' && treatActive(g) && res.tip > 0) {
    const tip = Math.round(res.tip * TREAT.tipMul);
    res.coins += tip - res.tip;
    res.treat = tip - res.tip;
    res.tip = tip;
  }
  g.tray = [];
  g.held = null;
  g.coins += res.coins;
  g.served += 1;
  g.results.push(res);
  c.phase = 'leave'; c.t = 0; c.mood = res.mood; c.result = res;
  emit(g, 'served', { result: res, look: c.look, cid: c.id, idx: g.line.indexOf(c), vip: !!c.order.vip, regular: c.regular || null });
  emit(g, 'sfx', { name: res.mood === 'happy' ? 'serve' : 'meh' });
  return res;
}
// ---------- Chimaek's treat ----------
// She gets hungry now and then (dog.want). Plain grilled beef, cooked and
// not burnt, with nothing on it, makes her happy: tips are worth TREAT.tipMul
// times for TREAT.lasts seconds. Anything else she sniffs and turns away from
// (it stays where it was). Burnt food goes in the bin, never to the dog.
export const treatActive = (g) => !!g.dog && g.time < g.dog.happyUntil;
function stepDog(g, dt) {
  const d = g.dog;
  if (d.want) {
    if (g.time >= d.until) { d.want = false; d.next = g.time + TREAT.retry; emit(g, 'dog', { result: 'gaveup' }); }
  } else if (g.time >= d.next && !treatActive(g)) {
    d.want = true;
    d.until = g.time + TREAT.wait;
    emit(g, 'dog', { result: 'hungry' });
  }
}
// Why Chimaek will not eat this tray item (or grill item), or null if she will.
export function treatProblem(it) {
  if (!it) return 'PUT A TREAT ON THE TRAY';
  if (it.cook === 'burnt') return 'BURNT GOES IN THE BIN';
  if (ITEMS[it.item].kind === 'ready' && ITEMS[it.item].drink) return 'NOT FOR DOGS';
  if (it.sauce) return 'NO SAUCE FOR DOGS';
  if (!ITEMS[it.item].treat) return 'ONLY PLAIN MEAT FOR HER';
  if (it.cook !== 'done') return 'NOT COOKED YET';
  return null;
}
// Offer Chimaek something: { kind: 'tray', index } or { kind: 'grill', slot }.
// Returns 'ate', 'refused' or 'full' (null if there is nothing to offer).
export function feedDog(g, from) {
  const d = g.dog;
  if (!d || g.phase !== 'play') return null;
  let it = null;
  if (from.kind === 'tray') it = g.tray[from.index];
  else if (from.kind === 'grill' && g.grill[from.slot]) {
    const gi = g.grill[from.slot];
    it = { item: gi.item, cook: grillState(gi, g.cook.grill), sauce: null };
  }
  if (!it) return null;
  const why = treatProblem(it);
  if (why) {
    d.refuseT = g.time;
    emit(g, 'dog', { result: 'refused', why });
    emit(g, 'sfx', { name: 'sniff' });
    emit(g, 'toast', { text: why });
    return 'refused';
  }
  if (!d.want) {
    emit(g, 'sfx', { name: 'nope' });
    emit(g, 'toast', { text: 'SHE IS NOT HUNGRY NOW' });
    return 'full';
  }
  if (from.kind === 'tray') g.tray.splice(from.index, 1);
  else g.grill[from.slot] = null;
  d.want = false;
  d.fed += 1;
  d.ateT = g.time;
  d.happyUntil = g.time + TREAT.lasts;
  d.next = g.time + TREAT.every;
  emit(g, 'dog', { result: 'ate' });
  emit(g, 'sfx', { name: 'yip' });
  emit(g, 'toast', { text: `GOOD DOG! TIPS X${TREAT.tipMul}`, good: true });
  return 'ate';
}
// Tap controls: tap Chimaek to give her the treat on the tray (or, if there
// is none, the last thing on the tray, so she can say no).
export function tapDog(g) {
  if (!g.dog || g.phase !== 'play') return null;
  if (!g.tray.length) { emit(g, 'sfx', { name: 'nope' }); emit(g, 'toast', { text: 'PUT A TREAT ON THE TRAY' }); return null; }
  let i = g.tray.findIndex((t) => !treatProblem(t));
  if (i < 0) i = g.tray.length - 1;
  return feedDog(g, { kind: 'tray', index: i });
}

// Tap controls' SERVE button: the first guest whose order the tray matches
// exactly, otherwise the first waiting guest.
export function serveAuto(g) {
  const w = waiting(g);
  const c = w.find((x) => scoreServe(x.order, g.tray, 1).mood === 'happy') || w[0];
  return c ? serve(g, g.line.indexOf(c)) : serve(g);
}
