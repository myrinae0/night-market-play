// Daily goals and badges (pure, no DOM). main.js feeds it what happens in a
// night (track) and shows the notes it returns; screens.js draws the goals
// board on the title, the goals on the end card and the badges screen.
//
// Goals: three small goals at a time ("TONIGHT'S" in spirit: every night you
// play is a new in-game day). Progress counts over any nights until a goal is
// done; it pays its coins at once, shows ticked on the title and the end card,
// and is swapped for a new one when the next night starts. Goals only ask for
// things the player has reached (`from`: a level that must be open).
//
// Badges: one-time achievements, kept forever (until reset progress).
import { ITEMS, LEVELS, UPGRADES, ENDLESS } from './data.js';
import { isUnlocked, rng } from './logic.js';
import { SPIRITS } from './spirits.js';

export const GOAL_COUNT = 3;

// kind: what counts.
//   gold      perfect cooks of `items` served (any cooked item when no items)
//   happy     guests served with every line right
//   streak    happy guests in a row in one night, no walk-out or mix-up between
//   drinks    drinks served on happy orders
//   sauces    sauces and toppings served on happy orders
//   fed       treats Chimaek ate
//   vips      VIP guests served happy
//   regulars  regulars (glad or grumpy) served happy
//   clean     nights cleared (a star) with no walk-outs
//   stars3    nights with three stars
//   tips      tip coins earned
//   endless   guests served on endless nights
// `label` fits the title's goals board (12 letters at most), `desc` the
// end card and the badges screen.
export const GOAL_POOL = [
  { id: 'galbi', label: 'GOLD GALBI', desc: 'SERVE GALBI COOKED IN THE GOLD', kind: 'gold', items: ['galbi'], n: 5, reward: 25, from: 2 },
  { id: 'sausage', label: 'GOLD SAUSAGE', desc: 'SERVE SAUSAGES COOKED IN THE GOLD', kind: 'gold', items: ['sausage'], n: 4, reward: 20, from: 2 },
  { id: 'chicken', label: 'GOLD CHICKEN', desc: 'SERVE CHICKEN FRIED IN THE GOLD', kind: 'gold', items: ['chicken'], n: 4, reward: 25, from: 3 },
  { id: 'wok', label: 'GOLD WOK', desc: 'SERVE WOK DISHES TOSSED TO THE GOLD', kind: 'gold', items: ['tteokbokki', 'japchae', 'friedrice'], n: 4, reward: 25, from: 4 },
  { id: 'mandu', label: 'GOLD MANDU', desc: 'SERVE MANDU STEAMED IN THE GOLD', kind: 'gold', items: ['mandu'], n: 3, reward: 25, from: 7 },
  { id: 'bun', label: 'GOLD BUNS', desc: 'SERVE BUNS STEAMED IN THE GOLD', kind: 'gold', items: ['bun'], n: 3, reward: 20, from: 7 },
  { id: 'ramyeon', label: 'GOLD RAMYEON', desc: 'SERVE RAMYEON COOKED IN THE GOLD', kind: 'gold', items: ['ramyeon'], n: 3, reward: 25, from: 10 },
  { id: 'gold', label: 'GOLD COOKS', desc: 'SERVE ANY FOOD COOKED IN THE GOLD', kind: 'gold', n: 10, reward: 30, from: 2 },
  { id: 'happy', label: 'HAPPY GUESTS', desc: 'SERVE GUESTS WITH EVERY LINE RIGHT', kind: 'happy', n: 10, reward: 20, from: 1 },
  { id: 'streak', label: 'HAPPY STREAK', desc: 'HAPPY GUESTS IN A ROW, NO WALK-OUTS', kind: 'streak', n: 4, reward: 25, from: 1 },
  { id: 'drinks', label: 'DRINKS', desc: 'SERVE DRINKS ON HAPPY ORDERS', kind: 'drinks', n: 6, reward: 15, from: 1 },
  { id: 'sauces', label: 'SAUCED UP', desc: 'SERVE SAUCES AND TOPPINGS, ALL RIGHT', kind: 'sauces', n: 6, reward: 20, from: 2 },
  { id: 'clean', label: 'NO WALK-OUTS', desc: 'CLEAR A NIGHT WITH NOBODY WALKING OUT', kind: 'clean', n: 1, reward: 20, from: 1 },
  { id: 'stars3', label: '3 STAR NIGHT', desc: 'EARN THREE STARS ON ANY NIGHT', kind: 'stars3', n: 1, reward: 30, from: 1 },
  { id: 'tips', label: 'TIPS', desc: 'EARN TIP COINS', kind: 'tips', n: 60, reward: 20, from: 2 },
  { id: 'fed', label: 'FEED CHIMAEK', desc: 'GIVE CHIMAEK HER PLAIN TREAT', kind: 'fed', n: 2, reward: 25, from: 9 },
  { id: 'regulars', label: 'REGULARS', desc: 'SERVE REGULARS WHO CAME BACK', kind: 'regulars', n: 5, reward: 20, from: 8 },
  { id: 'vips', label: 'VIPS', desc: 'SERVE VIP GUESTS (GOLD TICKETS)', kind: 'vips', n: 3, reward: 30, from: 13 },
  { id: 'endless', label: 'ENDLESS', desc: 'SERVE GUESTS ON ENDLESS NIGHTS', kind: 'endless', n: 20, reward: 35, from: ENDLESS.n },
];
export const goalDef = (id) => GOAL_POOL.find((d) => d.id === id) || null;

// Badges. `icon`: a menu item sprite, or 'star', 'dog', 'heart', 'lantern',
// 'coin', 'infinity', 'bell'.
export const BADGES = [
  { id: 'night1', name: 'OPEN AGAIN', desc: 'CLEAR THE FIRST NIGHT', icon: 'soda' },
  { id: 'goldgrill', name: 'GRILL GOLD', desc: 'SERVE A PERFECT GRILL ITEM', icon: 'galbi' },
  { id: 'goldfry', name: 'FRYER GOLD', desc: 'SERVE PERFECT FRIED CHICKEN', icon: 'chicken' },
  { id: 'goldwok', name: 'WOK GOLD', desc: 'SERVE A PERFECT WOK DISH', icon: 'japchae' },
  { id: 'goldsteam', name: 'STEAMER GOLD', desc: 'SERVE PERFECT MANDU OR A BUN', icon: 'mandu' },
  { id: 'goldpot', name: 'NOODLE GOLD', desc: 'SERVE PERFECT RAMYEON', icon: 'ramyeon' },
  { id: 'gold50', name: 'GOLDEN HANDS', desc: 'SERVE 50 PERFECT COOKS', icon: 'star' },
  { id: 'gold200', name: 'GRANDMA PROUD', desc: 'SERVE 200 PERFECT COOKS', icon: 'bell' },
  { id: 'part1', name: 'PART 1 STARS', desc: 'THREE STARS ON LEVELS 1 TO 6', icon: 'star' },
  { id: 'part2', name: 'PART 2 STARS', desc: 'THREE STARS ON LEVELS 7 TO 13', icon: 'lantern' },
  { id: 'flawless', name: 'FLAWLESS', desc: 'A NIGHT WITH EVERY GUEST HAPPY', icon: 'heart' },
  { id: 'calm', name: 'CALM IN A RUSH', desc: 'CLEAR LEVEL 12 WITH NO WALK-OUTS', icon: 'tea' },
  { id: 'vip10', name: 'VIP HOST', desc: 'SERVE 10 VIP GUESTS', icon: 'coin' },
  { id: 'gooddog', name: 'GOOD DOG', desc: 'GIVE CHIMAEK HER FIRST TREAT', icon: 'dog' },
  { id: 'dog10', name: 'BEST FRIENDS', desc: 'GIVE CHIMAEK 10 TREATS', icon: 'plain' },
  { id: 'memory', name: 'REMEMBERED', desc: 'HEAR A SPIRIT REMEMBER GRANDMA', icon: 'lantern' },
  { id: 'memories', name: 'EVERY MEMORY', desc: 'EVERY MEMORY OF EVERY SPIRIT', icon: 'heart' },
  { id: 'fullstall', name: 'FULL STALL', desc: 'BUY EVERY STALL UPGRADE', icon: 'kimbap' },
  { id: 'endless30', name: 'NO LAST GUEST', desc: 'SERVE 30 GUESTS IN ONE ENDLESS NIGHT', icon: 'infinity' },
  { id: 'goals10', name: 'GOAL KEEPER', desc: 'FINISH 10 DAILY GOALS', icon: 'coin' },
];

const newStats = () => ({ gold: 0, goldBy: {}, happy: 0, fed: 0, vips: 0, goalsDone: 0, nights: 0 });
export const freshGoals = () => ({ goals: { list: [], drawn: 0 }, badges: {}, stats: newStats() });

// Fills in missing or broken goals, badges and stats (old saves have none).
export function normalizeGoals(s) {
  const g = s.goals && typeof s.goals === 'object' ? s.goals : {};
  const list = Array.isArray(g.list) ? g.list.filter((x) => x && goalDef(x.id)).map((x) => ({
    id: x.id, got: Math.max(0, Math.round(Number(x.got) || 0)), done: !!x.done,
  })) : [];
  s.goals = { list: list.slice(0, GOAL_COUNT), drawn: Math.max(0, Math.round(Number(g.drawn) || 0)) };
  s.badges = s.badges && typeof s.badges === 'object' && !Array.isArray(s.badges) ? Object.fromEntries(Object.keys(s.badges).filter((k) => BADGES.some((b) => b.id === k)).map((k) => [k, true])) : {};
  const st = s.stats && typeof s.stats === 'object' ? s.stats : {};
  const num = (v) => Math.max(0, Math.round(Number(v) || 0));
  const fresh = newStats();
  s.stats = Object.fromEntries(Object.keys(fresh).map((k) => [k, k === 'goldBy' ? {} : num(st[k])]));
  if (st.goldBy && typeof st.goldBy === 'object') for (const [k, v] of Object.entries(st.goldBy)) if (ITEMS[k]) s.stats.goldBy[k] = num(v);
  return s;
}

// The goals the player could get now (their content is open, not on the board).
export function goalChoices(s) {
  const have = new Set(s.goals.list.map((x) => x.id));
  return GOAL_POOL.filter((d) => !have.has(d.id) && isUnlocked(d.from, s.stars || {}));
}
// Drops finished goals and draws new ones until there are three. The draw is
// seeded by how many goals were drawn before, so it is the same every time.
export function refreshGoals(s) {
  s.goals.list = s.goals.list.filter((x) => !x.done);
  while (s.goals.list.length < GOAL_COUNT) {
    const c = goalChoices(s);
    if (!c.length) break;
    const r = rng(0x60a1 + s.goals.drawn * 7919);
    s.goals.drawn += 1;
    s.goals.list.push({ id: c[Math.floor(r() * c.length)].id, got: 0, done: false });
  }
  return s.goals.list;
}

// A night's own counters (the streak); main.js makes one per night.
export const newNight = () => ({ streak: 0, best: 0, goalCoins: 0, done: [] });

// How much an event moves a goal of kind `d.kind`.
function amount(d, ev, night) {
  if (ev.type === 'served') {
    const r = ev.result;
    if (r.mood !== 'happy') return 0;
    if (d.kind === 'gold') return (r.perfectItems || []).filter((id) => !d.items || d.items.includes(id)).length;
    if (d.kind === 'happy') return 1;
    if (d.kind === 'drinks') return r.lines.filter((L) => ITEMS[L.line.item].drink).length;
    if (d.kind === 'sauces') return r.lines.filter((L) => L.line.sauce).length;
    if (d.kind === 'vips') return ev.vip ? 1 : 0;
    if (d.kind === 'regulars') return ev.regular ? 1 : 0;
    if (d.kind === 'tips') return r.tip || 0;
    if (d.kind === 'endless') return ev.endless ? 1 : 0;
    return 0;
  }
  if (ev.type === 'fed') return d.kind === 'fed' ? 1 : 0;
  if (ev.type === 'end' && !ev.endless) {
    if (d.kind === 'clean') return ev.stars > 0 && ev.lost === 0 ? 1 : 0;
    if (d.kind === 'stars3') return ev.stars === 3 ? 1 : 0;
  }
  return 0;
}

// Feeds one event of the night into the goals, badges and stats.
//   { type: 'served', result, vip, regular, endless }
//   { type: 'walkout' }   { type: 'fed' }
//   { type: 'end', level, endless, stars, lost, served, coins, mixups }
// Returns notes for the screen: { kind: 'goal', id, got, n, done, reward }
// (progress, at most one per goal per event) and { kind: 'badge', id }.
// A goal's coins go straight into s.wallet (and night.goalCoins).
export function track(s, ev, night = newNight()) {
  const notes = [];
  const st = s.stats;
  if (ev.type === 'served') {
    const r = ev.result;
    if (r.mood === 'happy') {
      night.streak += 1;
      night.best = Math.max(night.best, night.streak);
      st.happy += 1;
      for (const id of r.perfectItems || []) { st.gold += 1; st.goldBy[id] = (st.goldBy[id] || 0) + 1; }
      if (ev.vip) st.vips += 1;
    } else night.streak = 0;
  } else if (ev.type === 'walkout') night.streak = 0;
  else if (ev.type === 'fed') st.fed += 1;
  else if (ev.type === 'end') st.nights += 1;
  for (const x of s.goals.list) {
    if (x.done) continue;
    const d = goalDef(x.id);
    const before = x.got;
    if (d.kind === 'streak') x.got = Math.max(x.got, Math.min(d.n, night.streak));
    else x.got = Math.min(d.n, x.got + amount(d, ev, night));
    if (x.got === before) continue;
    if (x.got >= d.n) {
      x.done = true;
      s.wallet = (s.wallet || 0) + d.reward;
      night.goalCoins += d.reward;
      night.done.push(x.id);
      st.goalsDone += 1;
    }
    notes.push({ kind: 'goal', id: x.id, got: x.got, n: d.n, done: x.done, reward: d.reward });
  }
  for (const id of earnedBadges(s, ev)) notes.push({ kind: 'badge', id });
  return notes;
}

const goldIn = (st, items) => items.reduce((a, id) => a + (st.goldBy[id] || 0), 0);
// Badges earned now (newly), from the save's state and this event. Marks
// them in s.badges. `ev` may be null (a check after buying, on load).
export function earnedBadges(s, ev = null) {
  const st = s.stats, stars = s.stars || {};
  const all3 = (from, to) => LEVELS.filter((L) => L.n >= from && L.n <= to).every((L) => (stars[L.n] || 0) >= 3);
  const mem = (s.story && s.story.memories) || {};
  const withMem = Object.keys(SPIRITS).filter((id) => SPIRITS[id].memories && SPIRITS[id].memories.length);
  const end = ev && ev.type === 'end' ? ev : null;
  const check = {
    night1: () => (stars[1] || 0) >= 1,
    goldgrill: () => goldIn(st, ['galbi', 'sausage']) > 0,
    goldfry: () => goldIn(st, ['chicken']) > 0,
    goldwok: () => goldIn(st, ['tteokbokki', 'japchae', 'friedrice']) > 0,
    goldsteam: () => goldIn(st, ['mandu', 'bun']) > 0,
    goldpot: () => goldIn(st, ['ramyeon']) > 0,
    gold50: () => st.gold >= 50,
    gold200: () => st.gold >= 200,
    part1: () => all3(1, 6),
    part2: () => all3(7, 13),
    flawless: () => !!end && !end.endless && end.stars > 0 && end.lost === 0 && end.mixups === 0 && end.served > 0,
    calm: () => !!end && end.level === 12 && end.stars > 0 && end.lost === 0,
    vip10: () => st.vips >= 10,
    gooddog: () => st.fed >= 1,
    dog10: () => st.fed >= 10,
    memory: () => Object.values(mem).some((k) => k > 0),
    memories: () => withMem.every((id) => (mem[id] || 0) >= SPIRITS[id].memories.length),
    fullstall: () => UPGRADES.every((u) => s.upgrades && s.upgrades[u.id]),
    endless30: () => !!end && end.endless && end.served >= 30,
    goals10: () => st.goalsDone >= 10,
  };
  const got = [];
  for (const b of BADGES) {
    if (s.badges[b.id] || !check[b.id]()) continue;
    s.badges[b.id] = true;
    got.push(b.id);
  }
  return got;
}
export const badgeById = (id) => BADGES.find((b) => b.id === id) || null;

// The short line a note shows during play (a small ribbon under the HUD).
export function noteText(n) {
  if (n.kind === 'badge') return `BADGE: ${badgeById(n.id).name}`;
  const d = goalDef(n.id);
  return n.done ? `GOAL DONE: ${d.label} +${n.reward}` : `GOAL: ${d.label} ${n.got}/${n.n}`;
}
