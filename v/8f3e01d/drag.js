// Drag-and-drop controls (the default). Pure: gesture classification, which
// drop targets accept a dragged thing, and what a drop does. main.js feeds it
// pointer data; render.js records where the sources and targets are.
//
// A drag payload (what is in your hand):
//   { kind: 'ready', item }   drink or counter food
//   { kind: 'bin', item }     raw food from a bin (grill, fryer or wok)
//   { kind: 'grill', slot }   food on the grill
//   { kind: 'bowl' }          battered chicken in the batter bowl
//   { kind: 'basket', slot }  chicken in a fryer basket
//   { kind: 'wok' }           the dish in the wok
//   { kind: 'sauce', id }     a sauce bottle or topping
//   { kind: 'tray', index }   an item on the tray
//   { kind: 'serve' }         the whole tray (by its handle)
// A drop target: { kind: 'tray' | 'trayItem' (index) | 'trash' | 'grillSlot' (slot)
//   | 'bowl' | 'basket' (slot) | 'wok' | 'customer' (idx in g.line) }
import { ITEMS } from './data.js';
import { canSauce, grillState, wokState } from './logic.js';
import * as G from './game.js';

export const TAP_DIST = 5; // art px: less movement than this is a tap
export const DRAG_DIST = 3; // art px before the item lifts off under the finger
export const FLICK_MS = 380; // a flick is quick...
export const FLICK_UP = 9; // ...and at least this far up (art px)
export const SWIPE_DIST = 22;

// What a finished gesture was. dx, dy in art px (up is negative), ms duration.
export function classify(dx, dy, ms) {
  const dist = Math.hypot(dx, dy);
  if (dist < TAP_DIST) return 'tap';
  if (dy <= -FLICK_UP && -dy > Math.abs(dx) * 1.1 && ms <= FLICK_MS) return 'flick';
  if (Math.abs(dx) > SWIPE_DIST && Math.abs(dx) > Math.abs(dy) * 1.4) return dx < 0 ? 'swipeLeft' : 'swipeRight';
  return 'drag';
}

// Sources that react to a flick up (and what they do).
export function flickAction(p) {
  if (p.kind === 'grill') return 'flip';
  if (p.kind === 'wok') return 'toss';
  return null;
}

const trayRoom = (g) => g.tray.length < g.trayMax;

// Does target t take payload p right now? (Used to highlight targets while dragging.)
export function accepts(g, p, t) {
  if (!g || g.phase !== 'play') return false;
  switch (p.kind) {
    case 'ready': return t.kind === 'tray' && trayRoom(g);
    case 'bin': {
      const k = ITEMS[p.item]?.kind;
      if (k === 'grill') return t.kind === 'grillSlot' && g.grill[t.slot] === null;
      if (k === 'fry') return t.kind === 'bowl' && (!g.fryer.bowl || (!g.fryer.bowl.battered && g.fryer.bowl.dipping <= 0));
      if (k === 'wok') return t.kind === 'wok' && !g.wok;
      return false;
    }
    case 'grill': {
      const it = g.grill[p.slot];
      if (!it) return false;
      if (t.kind === 'trash') return true;
      return t.kind === 'tray' && (trayRoom(g) || grillState(it, g.cook.grill) === 'burnt');
    }
    case 'bowl': return t.kind === 'basket' && !!g.fryer.bowl?.battered && g.fryer.baskets[t.slot] === null;
    case 'basket': return !!g.fryer.baskets[p.slot] && (t.kind === 'trash' || (t.kind === 'tray' && trayRoom(g)));
    case 'wok': return !!g.wok && (t.kind === 'trash' || (t.kind === 'tray' && (trayRoom(g) || wokState(g.wok, g.cook.wok) === 'burnt')));
    case 'sauce': return t.kind === 'trayItem' && !!g.tray[t.index] && canSauce(g.tray[t.index], p.id);
    case 'tray': return t.kind === 'trash' && !!g.tray[p.index];
    case 'serve': return t.kind === 'customer' && g.tray.length > 0 && g.line[t.idx]?.phase === 'wait';
    default: return false;
  }
}

// Performs the drop. Returns true when something happened (else snap back).
export function drop(g, p, t) {
  if (!accepts(g, p, t)) return false;
  switch (p.kind) {
    case 'ready': return G.grabReady(g, p.item);
    case 'bin': {
      const k = ITEMS[p.item].kind;
      if (k === 'grill') return G.grillAdd(g, p.item, t.slot);
      if (k === 'fry') return G.fryBatter(g);
      return G.wokStart(g, p.item);
    }
    case 'grill': return t.kind === 'trash' ? G.discard(g, 'grill', p.slot) : G.grillTake(g, p.slot);
    case 'bowl': return G.fryToBasket(g, t.slot);
    case 'basket': return t.kind === 'trash' ? G.discard(g, 'fryer', p.slot) : G.fryLift(g, p.slot);
    case 'wok': return t.kind === 'trash' ? G.discard(g, 'wok', 0) : G.wokTake(g);
    case 'sauce': return G.applySauce(g, t.index, p.id);
    case 'tray': return G.trashTray(g, p.index);
    case 'serve': return !!G.serve(g, t.idx);
    default: return false;
  }
}

// The target under (x, y). Targets are { x, y, w, h, target }; a few pixels of
// slack make small targets easier to hit on a phone. Among overlapping ones the
// one whose centre is nearest wins.
export function findTarget(targets, x, y, slack = 4) {
  let best = null, bd = Infinity;
  for (const r of targets) {
    if (x < r.x - slack || x >= r.x + r.w + slack || y < r.y - slack || y >= r.y + r.h + slack) continue;
    const d = Math.hypot(x - (r.x + r.w / 2), y - (r.y + r.h / 2));
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

// A tray item dropped clearly off the tray (not on a target) is thrown out.
export function offTray(trayBox, x, y, margin = 14) {
  return x < trayBox.x - margin || x > trayBox.x + trayBox.w + margin || y < trayBox.y - margin || y > trayBox.y + trayBox.h + margin;
}

// What to say when a draggable thing is only tapped.
export function dragHint(p) {
  switch (p.kind) {
    case 'ready': return 'DRAG IT TO THE TRAY';
    case 'bin': {
      const k = ITEMS[p.item]?.kind;
      return k === 'grill' ? 'DRAG IT ONTO THE GRILL' : k === 'fry' ? 'DRAG IT INTO THE BATTER' : 'DRAG IT INTO THE WOK';
    }
    case 'grill': return 'FLICK UP TO FLIP IT';
    case 'bowl': return 'DRAG IT INTO A BASKET';
    case 'basket': return 'DRAG IT TO THE TRAY';
    case 'wok': return 'FLICK UP TO TOSS';
    case 'sauce': return 'DRAG IT ONTO THE FOOD';
    case 'tray': return 'DRAG TO THE BIN TO TOSS';
    case 'serve': return 'DRAG THE TRAY TO A GUEST';
    default: return '';
  }
}

// Why a drop did nothing, in a few words for the toast (null: say nothing).
// `t` is the target under the finger, if any (it did not accept the drop).
export function missHint(g, p, t) {
  const full = g.tray.length >= g.trayMax;
  if (t && t.kind === 'tray' && full && ['ready', 'grill', 'basket', 'wok'].includes(p.kind)) return 'TRAY IS FULL';
  switch (p.kind) {
    case 'ready': return 'DROP IT ON THE TRAY';
    case 'bin': {
      const k = ITEMS[p.item]?.kind;
      if (k === 'grill') return t && t.kind === 'grillSlot' ? 'THAT SPOT IS TAKEN' : 'DROP IT ON THE GRILL';
      if (k === 'fry') return g.fryer.bowl ? 'THE BOWL IS BUSY' : 'DROP IT IN THE BATTER';
      return g.wok ? 'THE WOK IS BUSY' : 'DROP IT IN THE WOK';
    }
    case 'grill': case 'basket': case 'wok': return 'DROP IT ON THE TRAY';
    case 'bowl': return g.fryer.baskets.every(Boolean) ? 'BASKETS FULL' : 'DROP IT IN A BASKET';
    case 'sauce': return g.tray.some((it) => canSauce(it, p.id)) ? 'DROP IT ON THE FOOD' : G.sauceHint(g, p.id);
    case 'serve': return G.waiting(g).length ? 'DROP THE TRAY ON A GUEST' : null;
    default: return null;
  }
}
