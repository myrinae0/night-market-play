// First-night tips (pure): short hints that point at the thing to touch next,
// on night 1 and on the first night of each new station. They follow what you
// do (no taps needed to move on), work in drag and tap controls, and are seen
// once: the save keeps `tipsSeen` (a setting, kept by Reset progress). SKIP
// turns them all off; Settings > SHOW TIPS AGAIN brings them back.
import { ITEMS, LEVELS } from './data.js';
import { scoreServe } from './logic.js';

// One set per night that teaches something: night 1 (the counter), then each
// station's first night.
export const TIP_SETS = {
  night1: { level: 1, station: 'counter' },
  grill: { level: 2, station: 'grill' },
  fryer: { level: 3, station: 'fryer' },
  wok: { level: 4, station: 'wok' },
  steamer: { level: 7, station: 'steamer' },
  pot: { level: 10, station: 'pot' },
  soup: { level: 16, station: 'soup' },
};
export const TIP_IDS = Object.keys(TIP_SETS);
// Every string fits the bitmap font (tests/story.test.js checks it).
export const TIP_TEXT = {
  skip: 'SKIP TIPS',
  order: 'THE GUEST WANTS THIS',
  patience: 'THE BAR IS THEIR PATIENCE. BE QUICK',
  serve: 'ALL THERE. TAP SERVE',
  grab: { drag: 'DRAG IT DOWN TO THE TRAY', tap: 'TAP IT. IT GOES ON THE TRAY' },
  tab: { drag: 'SWIPE OR TAP THIS TAB', tap: 'TAP THIS TAB' },
  start: {
    grill: { drag: 'DRAG MEAT ONTO THE GRILL', tap: 'TAP MEAT TO GRILL IT' },
    fryer: { drag: 'DRAG CHICKEN ONTO THE BOWL', tap: 'TAP CHICKEN, THEN THE BOWL' },
    wok: { drag: 'DRAG IT INTO THE WOK', tap: 'TAP IT TO START A DISH' },
    steamer: { drag: 'DRAG IT INTO A BASKET', tap: 'TAP IT. THE LID GOES ON' },
    pot: { drag: 'DRAG THE KETTLE ONTO THE POT', tap: 'TAP THE KETTLE' },
    soup: { drag: 'DRAG RICE CAKES INTO THE POT', tap: 'TAP RICE CAKES TO START' },
  },
  cook: {
    grill: { drag: 'TAP TO FLIP. TAKE IT IN THE GOLD', tap: 'FLIP, THEN TAKE IT IN THE GOLD' },
    fryer: { drag: 'INTO A BASKET. TAKE IT IN THE GOLD', tap: 'LIFT IT IN THE GOLD' },
    wok: { drag: 'TAP TO TOSS. LET IT LAND', tap: 'TOSS. LET IT LAND EACH TIME' },
    steamer: { drag: 'LID ON. TAP TO LIFT IN THE GOLD', tap: 'TAKE IT IN THE GOLD' },
    pot: { drag: 'WAIT FOR THE BOIL. RAMYEON IN', tap: 'TAP RAMYEON. TAKE IT IN THE GOLD' },
    soup: { drag: 'TAP OR SWIRL TO STIR. TAKE IT IN THE GOLD', tap: 'STIR NOW AND THEN. TAKE IT IN THE GOLD' },
  },
};

// The set for a level, if its tips have not been seen.
export function tipSetFor(level, save) {
  const id = TIP_IDS.find((k) => TIP_SETS[k].level === level);
  if (!id || (save && save.tipsSeen && save.tipsSeen[id])) return null;
  return id;
}
// Tip progress for a night: which set, and the time a step started.
export const newTips = (set) => (set ? { set, done: false, orderT: null, servedT: null } : null);
// Marks sets seen (all of them for SKIP).
export function markSeen(save, ids = TIP_IDS) {
  save.tipsSeen = { ...(save.tipsSeen || {}) };
  for (const id of ids) save.tipsSeen[id] = true;
  return save;
}
// Settings > SHOW TIPS AGAIN.
export function showTipsAgain(save) { save.tipsSeen = {}; return save; }
// Older saves (before tips): a player who has cleared a night has seen what
// it teaches, so its tips start as seen.
export function tipsFromStars(stars = {}) {
  const seen = {};
  for (const id of TIP_IDS) if ((stars[TIP_SETS[id].level] || 0) >= 1) seen[id] = true;
  return seen;
}

// What the station has in it (something cooking, or put in to cook).
function stationBusy(g, st) {
  if (st === 'grill') return g.grill.some((x) => x && ITEMS[x.item] && !ITEMS[x.item].treat);
  if (st === 'fryer') return !!g.fryer.bowl || g.fryer.baskets.some(Boolean);
  if (st === 'wok') return !!g.wok;
  if (st === 'steamer') return g.steamer.some(Boolean);
  if (st === 'pot') return !!g.pot;
  if (st === 'soup') return g.soup.some(Boolean);
  return false;
}
const stationItems = (g, st) => Object.keys(ITEMS).filter((k) => ITEMS[k].station === st && !ITEMS[k].treat && ITEMS[k].unlock <= g.level);

// The tip to show now: { text, anchor } (anchor: 'bubble', 'serve', 'box',
// 'item:<id>', 'tab:<station>'), or null between steps. Sets `tips.done` once
// the set has been taught. `mode` is 'drag' or 'tap'.
export function currentTip(g, tips, mode = 'drag') {
  if (!tips || tips.done || !g || g.phase !== 'play') return null;
  const c = g.line.find((x) => x.phase === 'wait');
  if (tips.set === 'night1') {
    if (g.served >= 1 || g.results.length >= 1) { // after the first guest: one word on patience
      if (tips.servedT == null) tips.servedT = g.time;
      if (g.time - tips.servedT > 5 || g.custIdx >= 2) { tips.done = true; return null; }
      return c ? { text: TIP_TEXT.patience, anchor: 'patience' } : null;
    }
    if (!c) return null;
    if (tips.orderT == null) tips.orderT = g.time;
    if (g.time - tips.orderT < 2.5 && !g.tray.length) return { text: TIP_TEXT.order, anchor: 'bubble' };
    const lines = scoreServe(c.order, g.tray, 1).lines;
    const miss = c.order.lines.find((l, i) => lines[i].status !== 'ok');
    if (!miss) return { text: TIP_TEXT.serve, anchor: 'serve' };
    return { text: TIP_TEXT.grab[mode], anchor: `item:${miss.item}` };
  }
  const st = TIP_SETS[tips.set].station;
  // Taught once the first dish from the new station reaches the tray.
  if (g.tray.some((it) => ITEMS[it.item] && ITEMS[it.item].station === st && !ITEMS[it.item].treat)) { tips.done = true; return null; }
  const idx = g.stations.findIndex((s) => s.id === st);
  if (idx < 0) { tips.done = true; return null; }
  const busy = stationBusy(g, st);
  if (g.station !== idx) return { text: TIP_TEXT.tab[mode], anchor: `tab:${st}` };
  if (!busy) {
    const first = st === 'pot' ? 'kettle' : (c && c.order.lines.map((l) => l.item).find((it) => ITEMS[it].station === st)) || stationItems(g, st)[0];
    return { text: TIP_TEXT.start[st][mode], anchor: `item:${first}` };
  }
  return { text: TIP_TEXT.cook[st][mode], anchor: 'box' };
}
// Every tip string (for the font check).
export function allTipStrings() {
  const out = [];
  const walk = (v) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(TIP_TEXT);
  return out;
}
export const TIP_LEVELS = TIP_IDS.map((id) => TIP_SETS[id].level).filter((n) => LEVELS.some((L) => L.n === n));
