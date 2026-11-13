// Game data: stations, menu items, sauces, cooking curves, levels, upgrades (pure data).

// Stations in tab order; the renderer sizes its tabs from the ones a level
// shows (its own, plus the next one as a locked preview). `tab` is a shorter
// label for the tab when the name is long.
export const STATION_ORDER = ['counter', 'grill', 'fryer', 'wok', 'steamer', 'pot'];

export const STATIONS = {
  counter: { name: 'Counter', unlock: 1 },
  grill: { name: 'Grill', unlock: 2 },
  fryer: { name: 'Fryer', unlock: 3 },
  wok: { name: 'Wok', unlock: 4 },
  steamer: { name: 'Steamer', unlock: 7 },
  pot: { name: 'Noodle pot', tab: 'POT', unlock: 10 },
};
// The cooking kind of each station's food (orders pick a station by kind).
export const STATION_KIND = { grill: 'grill', fryer: 'fry', wok: 'wok', steamer: 'steam', pot: 'pot' };

// kind: 'ready' (grab and serve), 'grill' (two sides, flip), 'fry' (one timing
// window), 'wok' (toss to cook; stop tossing and it scorches), 'steam' (cooks
// only with the lid on), 'pot' (boil the water first, then cook the noodles).
export const ITEMS = {
  soda: { name: 'Soda', short: 'SODA', station: 'counter', kind: 'ready', price: 3, unlock: 1, drink: true },
  tea: { name: 'Barley tea', short: 'TEA', station: 'counter', kind: 'ready', price: 3, unlock: 1, drink: true },
  kimbap: { name: 'Kimbap', short: 'KIMBAP', station: 'counter', kind: 'ready', price: 5, unlock: 1 },
  toast: { name: 'Egg toast', short: 'TOAST', station: 'counter', kind: 'ready', price: 6, unlock: 1 },
  beer: { name: 'Beer', short: 'BEER', station: 'counter', kind: 'ready', price: 5, unlock: 3, drink: true },
  galbi: { name: 'Galbi', short: 'GALBI', station: 'grill', kind: 'grill', price: 8, unlock: 2 },
  sausage: { name: 'Sausage', short: 'SAUSAGE', station: 'grill', kind: 'grill', price: 7, unlock: 2 },
  chicken: { name: 'Fried chicken', short: 'CHICKEN', station: 'fryer', kind: 'fry', price: 12, unlock: 3 },
  tteokbokki: { name: 'Tteokbokki', short: 'TTEOKBOKKI', station: 'wok', kind: 'wok', price: 10, unlock: 4, raw: 'tteok_raw', bin: 'TTEOK' },
  japchae: { name: 'Japchae', short: 'JAPCHAE', station: 'wok', kind: 'wok', price: 11, unlock: 4, raw: 'noodles_raw', bin: 'NOODLES' },
  friedrice: { name: 'Fried rice', short: 'FRIED RICE', station: 'wok', kind: 'wok', price: 9, unlock: 4, raw: 'rice_raw', bin: 'RICE' },
  mandu: { name: 'Dumplings', short: 'MANDU', station: 'steamer', kind: 'steam', price: 9, unlock: 7, raw: 'mandu_raw', bin: 'MANDU' },
  bun: { name: 'Steamed bun', short: 'BUN', station: 'steamer', kind: 'steam', price: 7, unlock: 7, raw: 'bun_raw', bin: 'BUNS' },
  ramyeon: { name: 'Ramyeon', short: 'RAMYEON', station: 'pot', kind: 'pot', price: 11, unlock: 10, raw: 'ramyeon_raw', bin: 'RAMYEON' },
  // Chimaek's treat (from level 9): plain beef, no marinade, no salt, no
  // onion, no chili. Grilled like the rest; never on a guest's order.
  plain: { name: 'Plain beef', short: 'PLAIN BEEF', station: 'grill', kind: 'grill', price: 0, unlock: 9, treat: true, raw: 'plain_raw', bin: 'PLAIN' },
};
export const WOK_ITEMS = ['tteokbokki', 'japchae', 'friedrice'];
export const STEAM_ITEMS = ['mandu', 'bun'];

// Sauces and toppings go on finished food on the tray. Each only suits its
// station's food (`station` can list more than one; `only` narrows it to some
// items). The toppings (egg, scallion) work exactly like sauces and go on wok
// dishes and ramyeon; the dips go on mandu only (a steamed bun stays plain).
export const SAUCES = {
  spicy: { name: 'Green chili', short: 'CHILI', station: 'grill', price: 1 },
  honey: { name: 'Honey', short: 'HONEY', station: 'grill', price: 1 },
  yangnyeom: { name: 'Yangnyeom', short: 'YANGNYEOM', station: 'fryer', price: 2 },
  soygarlic: { name: 'Soy garlic', short: 'SOY GARLIC', station: 'fryer', price: 2 },
  egg: { name: 'Fried egg', short: 'EGG', station: ['wok', 'pot'], price: 2, topping: true },
  scallion: { name: 'Scallion', short: 'SCALLION', station: ['wok', 'pot'], price: 1, topping: true },
  soydip: { name: 'Soy dip', short: 'SOY DIP', station: 'steamer', price: 1, only: ['mandu'] },
  chilioil: { name: 'Chili oil', short: 'CHILI OIL', station: 'steamer', price: 1, only: ['mandu'] },
};
export const STATION_SAUCES = {
  grill: ['spicy', 'honey'], fryer: ['yangnyeom', 'soygarlic'], wok: ['egg', 'scallion'],
  steamer: ['soydip', 'chilioil'], pot: ['egg', 'scallion'],
};
export const sauceStations = (id) => [].concat(SAUCES[id]?.station || []);
// Does sauce `id` suit menu item `item`?
export const sauceSuits = (id, item) => {
  const s = SAUCES[id];
  return !!s && !!ITEMS[item] && sauceStations(id).includes(ITEMS[item].station) && (!s.only || s.only.includes(item));
};

// Cooking curves. Progress 1.0 is "just right". Under `done` is raw, from
// `burnt` up is burnt, and [perfectLo, perfectHi] earns a perfect-cook bonus.
// Grill items cook one side at a time (the side facing down); fry has one value.
// Wok: each toss adds `perToss`; a toss while the food is still in the air
// (`air` seconds after the last one) spills a little; after `idleSafe` seconds
// without a toss the food starts to scorch and is burnt `scorchTime` later.
//
// Tuning history (Chris, after playing on his phone):
//  - Nov 13, 1 AM: good and perfect windows about 1.5x as wide.
//  - Nov 13, 2 AM: cooking about 1.5x slower (`time` x1.5, so "done" comes
//    1.5x later) so juggling two or three stations is comfortable, and the
//    good and perfect windows another ~1.4x wider on the meter (in seconds
//    about 2.1x, since the food also cooks slower). "Done" stays where it was
//    on the meter. The wok cooks by tosses: its perfect window takes one more
//    toss, and it waits 1.5x longer before it scorches.
export const COOK = {
  grill: { time: 6.75, done: 0.62, perfectLo: 0.8, perfectHi: 1.29, burnt: 1.78, max: 2.0, upRate: 0.08 },
  fry: { time: 9.75, done: 0.68, perfectLo: 0.87, perfectHi: 1.21, burnt: 1.63, max: 1.85 },
  // Wok: 5 clean tosses: done; 6 to 8: perfect (was 6 or 7). It only burns by
  // sitting still (idleSafe seconds, then scorchTime more).
  wok: { perToss: 0.15, done: 0.7, perfectLo: 0.82, perfectHi: 1.24, burnt: 99, max: 1.3, air: 0.32, idleSafe: 4.2, scorchTime: 4.8, spillLoss: 0.1 },
  // Steamer: cooks only while the lid is on; leave it too long and it goes soggy.
  steam: { time: 10.5, done: 0.68, perfectLo: 0.84, perfectHi: 1.34, burnt: 2.04, max: 2.3 },
  // Noodle pot: the water takes `boil` seconds to boil; then the noodles cook.
  pot: { boil: 4.5, time: 8.25, done: 0.68, perfectLo: 0.86, perfectHi: 1.24, burnt: 1.83, max: 2.05 },
};

// The meters' colour code, the same on every station, legend and intro card:
// grey raw, GREEN = GOOD, GOLD = PERFECT (inside the green), RED =
// BURNT (soggy on the steamer, mushy in the pot). "Gold" and "golden" in any
// text always mean the perfect zone.
export const COOK_TEXT = {
  good: 'GOOD', perfect: 'PERFECT', aim: 'AIM FOR THE GOLD',
  burnt: { grill: 'BURNT', fry: 'BURNT', wok: 'BURNT', steam: 'SOGGY', pot: 'MUSHY' },
  // Toasts when food comes off: in the gold, or in the green.
  tookPerfect: 'PERFECT!', tookGood: 'GOOD',
};

export const GRILL_SLOTS = 3;
export const FRY_BASKETS = 2;
export const STEAM_BASKETS = 2;
export const TRAY_MAX = 4;

// Levels. `kind`: 'station' introduces a new station, 'mix' juggles what you
// know, 'queue' has a line of customers, 'festival' is the lantern festival
// (a line, VIP guests who pay double). `queue` is how many guests wait at
// once; `guest` is the spirit who opens the night (default: the spirit whose
// first night it is). Intro lines come in two versions: drag and tap controls.
export const LEVELS = [
  {
    n: 1, title: 'Opening night', kind: 'station', stations: ['counter'], customers: 6, seed: 101,
    intro: {
      station: 'counter',
      heading: 'THE COUNTER',
      drag: ['Read the order bubble.', 'Drag drinks and food down onto your tray.', 'Tap SERVE to hand the tray over.'],
      tap: ['Read the order bubble.', 'Tap items to put them on your tray.', 'Tap SERVE to hand it over.'],
    },
  },
  {
    n: 2, title: 'Smoke and sizzle', kind: 'station', stations: ['counter', 'grill'], customers: 7, seed: 202,
    intro: {
      station: 'grill',
      heading: 'NEW: THE GRILL',
      drag: ['Swipe empty space or tap a tab to switch stations.', 'Drag meat onto the grill. Tap it to flip.', 'Take it when both bars are in the gold: perfect. Green is good too.'],
      tap: ['Swipe left or right to switch stations.', 'FLIP to grill both sides. Add a glaze on the tray if they ask.', 'TAKE it with both bars in the gold: perfect. Green is good too.'],
    },
  },
  {
    n: 3, title: 'Chimaek hour', kind: 'station', stations: ['counter', 'grill', 'fryer'], customers: 8, seed: 303,
    intro: {
      station: 'fryer',
      heading: 'NEW: THE FRYER',
      drag: ['Drag chicken onto the batter bowl, then into a basket.', 'Drag it to the tray in the gold: perfect. Green is good too.', 'Beer is in the cooler.'],
      tap: ['Tap chicken, then the bowl to batter it.', 'LIFT it in the gold: perfect. Green is good too.', 'Toss in sauce on the tray. Beer is in the cooler.'],
    },
  },
  {
    n: 4, title: 'Wok and roll', kind: 'station', stations: ['counter', 'grill', 'fryer', 'wok'], customers: 8, seed: 404, rain: true,
    intro: {
      station: 'wok',
      heading: 'NEW: THE WOK',
      drag: ['Drag rice cakes, noodles or rice into the wok.', 'Tap the wok to toss. Let it land first! Take it in the gold.', 'Stop tossing and it scorches. Drag egg or scallion on top.'],
      tap: ['Tap rice cakes, noodles or rice to start a dish.', 'Tap TOSS (or the wok). Let it land between tosses!', 'Stop tossing and it scorches. TAKE it in the gold.'],
    },
  },
  {
    n: 5, title: 'Full stall', kind: 'mix', stations: ['counter', 'grill', 'fryer', 'wok'], customers: 9, seed: 505,
    intro: {
      station: 'counter',
      heading: 'MIX: EVERY STATION',
      drag: ['Orders now use any station.', 'Start the slow food first, then grab drinks.', 'After tonight, spend coins on stall upgrades.'],
      tap: ['Orders now use any station.', 'Start the slow food first, then grab drinks.', 'After tonight, spend coins on stall upgrades.'],
    },
  },
  {
    n: 6, title: 'The long line', kind: 'queue', queue: 3, stations: ['counter', 'grill', 'fryer', 'wok'], customers: 12, seed: 606,
    intro: {
      station: 'counter',
      heading: 'NEW: A LINE OF GUESTS',
      drag: ['Up to three guests wait at once.', 'Each ticket has its own patience.', 'Tap SERVE: it finds the guest whose order is ready.'],
      tap: ['Up to three guests wait at once.', 'Each ticket has its own patience.', 'Tap a guest to serve them. SERVE finds a match.'],
    },
  },
  // ---------- part 2 ----------
  {
    n: 7, title: 'Steam rising', kind: 'station', stations: ['counter', 'grill', 'fryer', 'wok', 'steamer'], customers: 9, seed: 707,
    intro: {
      station: 'steamer',
      heading: 'NEW: THE STEAMER',
      drag: ['Drag mandu or buns into a basket.', 'Drag a lid on. It only steams with the lid on.', 'Tap the lid to lift it. Drag it to the tray in the gold.'],
      tap: ['Tap mandu or buns. They go in with the lid on.', 'Watch the bar. TAKE it in the gold: perfect.', 'Dips go on mandu only. A bun stays plain.'],
    },
  },
  {
    n: 8, tag: 'REGULARS RETURN', title: 'Old regulars', kind: 'mix', queue: 3, guest: 'fox', regulars: true, stations: ['counter', 'grill', 'fryer', 'wok', 'steamer'], customers: 12, seed: 808,
    intro: {
      station: 'counter',
      heading: 'NEW: REGULARS',
      drag: ['Spirits you served before come back.', 'A heart: glad. They wait longer, tip more.', 'A rain cloud: grumpy. Be quick with them.'],
      tap: ['Spirits you served before come back.', 'A heart: glad. They wait longer, tip more.', 'A rain cloud: grumpy. Be quick with them.'],
    },
  },
  {
    n: 9, tag: 'A TREAT FOR HER', title: 'Good dog', kind: 'mix', preview: 'treat', queue: 3, guest: 'lantern', regulars: true, treat: true, stations: ['counter', 'grill', 'fryer', 'wok', 'steamer'], customers: 12, seed: 909,
    intro: {
      station: 'grill',
      heading: 'NEW: A TREAT FOR CHIMAEK',
      drag: ['When Chimaek looks hungry, grill PLAIN beef.', 'Drag it onto her. Tips go up for a while.', 'No sauce, nothing burnt. Burnt goes in the bin.'],
      tap: ['When Chimaek looks hungry, grill PLAIN beef.', 'Take it, then tap Chimaek. Tips go up.', 'No sauce, nothing burnt. Burnt goes in the bin.'],
    },
  },
  {
    n: 10, title: 'Boiling point', kind: 'station', regulars: true, treat: true, stations: ['counter', 'grill', 'fryer', 'wok', 'steamer', 'pot'], customers: 9, seed: 1010,
    intro: {
      station: 'pot',
      heading: 'NEW: THE NOODLE POT',
      drag: ['Drag the kettle onto the pot. Wait for the boil.', 'Drag ramyeon in. Drag it to the tray in the gold.', 'Egg and scallion go on top, on the tray.'],
      tap: ['Tap the kettle, then tap ramyeon.', 'The noodles go in when the water boils.', 'TAKE it in the gold. Egg and scallion on top.'],
    },
  },
  {
    n: 11, tag: 'DAILY SPECIAL', title: 'Specials board', kind: 'mix', preview: 'special', queue: 3, guest: 'moth', regulars: true, treat: true, special: 'ramyeon', stations: ['counter', 'grill', 'fryer', 'wok', 'steamer', 'pot'], customers: 13, seed: 1130,
    intro: {
      station: 'pot',
      heading: 'NEW: THE DAILY SPECIAL',
      drag: ['Tonight ramyeon pays double. Look for X2.', 'Boil water before anyone asks for noodles.', 'Every station is open. Swipe fast.'],
      tap: ['Tonight ramyeon pays double. Look for X2.', 'Tap the kettle before anyone asks.', 'Every station is open. Tap the tabs.'],
    },
  },
  {
    n: 12, tag: 'RAIN AND A RUSH', title: 'Rain and rush', kind: 'mix', queue: 3, guest: 'frog', rain: true, regulars: true, treat: true, rush: { from: 5, count: 5 }, stations: ['counter', 'grill', 'fryer', 'wok', 'steamer', 'pot'], customers: 14, seed: 1212,
    intro: {
      station: 'counter',
      heading: 'NEW: RUSH HOUR',
      drag: ['Partway through, a crowd rushes in.', 'They want drinks and snacks, fast.', 'They will not wait long. Serve them first.'],
      tap: ['Partway through, a crowd rushes in.', 'They want drinks and snacks, fast.', 'They will not wait long. Serve them first.'],
    },
  },
  {
    n: 13, tag: 'FESTIVAL + VIPS', title: 'Lantern festival', kind: 'festival', queue: 3, festival: true, vipEvery: 4, regulars: true, treat: true, special: 'mandu', stations: ['counter', 'grill', 'fryer', 'wok', 'steamer', 'pot'], customers: 15, seed: 1313,
    intro: {
      station: 'counter',
      heading: 'NEW: VIP GUESTS',
      drag: ['The whole market came for the festival.', 'VIPs have a gold ticket. They pay double.', 'They wait a little less. Serve them first.'],
      tap: ['The whole market came for the festival.', 'VIPs have a gold ticket. They pay double.', 'They wait a little less. Serve them first.'],
    },
  },
];
// Endless nights: opens once level 13 has a star. Every station, a line of
// three, guests without end; they come faster and wait less as the night
// goes on (logic.js: endlessPace, endlessGap). Three walk-outs end it. The
// best night (coins) is saved. No story scenes.
// The ramp (logic.js): the night's step e = max(guests so far, seconds / secs).
// Patience eases from 1 toward paceMin (exp(-e / paceScale)); the gap before
// the next guest shrinks from gap0 by gapDrop a step down to gapMin; a second
// cooked dish gets likelier (extra0 + e * extraPer, at most extraMax); VIPs
// and rushes (count quick guests) come first at guest `first`, then every
// `every` guests, one sooner each time, down to `min`.
// Tuned Nov 13 with the test autopilots (tools/endless-sim.js): see README.
export const ENDLESS = {
  n: 99, endless: true, title: 'Endless nights', tag: 'BEST SCORE', kind: 'endless', queue: 3, strikes: 3,
  regulars: true, treat: true, stations: STATION_ORDER, customers: 0, seed: 9001,
  specials: ['ramyeon', 'mandu', 'chicken', 'tteokbokki', 'galbi', 'japchae'],
  ramp: {
    secs: 8, pace0: 0.85, paceMin: 0.35, paceScale: 70, gap0: 3.5, gapDrop: 0.05, gapMin: 1.2,
    extra0: 0.1, extraPer: 0.01, extraMax: 0.5,
    vip: { first: 8, every: 9, min: 5 }, rush: { first: 12, every: 15, min: 9, count: 3 },
  },
  intro: {
    station: 'counter',
    heading: 'ENDLESS NIGHTS',
    drag: ['Every station, a line of three, no end.', 'Guests come faster and wait less as it goes.', 'Three walk-outs and the night is over.'],
    tap: ['Every station, a line of three, no end.', 'Guests come faster and wait less as it goes.', 'Three walk-outs and the night is over.'],
  },
};

// VIP guests (festival nights) pay this many times the price and wait this
// much as long.
export const VIP_PAY = 2;
export const VIP_PATIENCE = 0.85;
// The daily special (`special` on a level) pays this many times the price.
export const SPECIAL_PAY = 2;
// Rush (`rush: { from, count }` on a level): those guests order drinks and
// snacks, wait this much as long, and join the line this many seconds apart.
export const RUSH_PATIENCE = 0.6;
export const RUSH_GAP = 1.0;
// Regulars (`regulars` on a level): spirits you have served before come back
// glad or grumpy, from your story choices and how you served them.
export const MOODS = {
  glad: { patience: 1.15, tip: 1 },
  ok: { patience: 1, tip: 0 },
  grumpy: { patience: 0.85, tip: -1 },
};
// Chimaek's treat (`treat` on a level): she gets hungry now and then; plain
// grilled beef makes her happy, and tips are worth this much more for a while.
// (Cooking got 1.5x slower on Nov 13: she now waits 30 s, was 24, and the
// happy spell lasts 30 s, was 22, so it still covers a few guests.)
export const TREAT = { first: 16, every: 40, wait: 30, retry: 26, tipMul: 1.5, lasts: 30 };

// Star thresholds, as a share of the level's best possible coins.
export const STAR_SHARES = [0.35, 0.6, 0.8];

// Customer looks: a spirit id (see spirits.js), 'shiba', or a number (one of
// the Kenney people). The last customer of level 3 is Chimaek the Shiba.
export const LOOKS = 6;
export const PERSON_SHARE = 0.22; // now and then a normal person comes by

// Stall upgrades, bought once each between nights with saved coins.
// Coins carry over from every night (the purse), so prices are set against a
// whole run. A flawless run of levels 1-6 earns about 1080 coins and the five
// part 1 upgrades cost 1540, so a good player (about 85% of the best) buys
// the first one or two along the way and the last of those around levels 8
// to 10. The steamer and noodle pot upgrades (`from`: they show up in the
// shop once their station's level is open) bring the total to 2280: a good
// player has bought everything around levels 12 to 13.
// Levels are tuned to be beatable with none; with all of them a careless
// night (no sauces) still earns only one star (tests/upgrades.test.js).
export const UPGRADES = [
  { id: 'grill4', name: '4TH GRILL SPOT', desc: 'GRILL FOUR AT ONCE', cost: 340 },
  { id: 'tray5', name: 'BIGGER TRAY', desc: 'FIVE SPACES ON THE TRAY', cost: 280 },
  { id: 'fastfry', name: 'HOTTER OIL', desc: 'CHICKEN FRIES 20% FASTER', cost: 240 },
  { id: 'patience', name: 'PAPER LANTERNS', desc: 'GUESTS WAIT 20% LONGER', cost: 440 },
  { id: 'wokfast', name: 'SEASONED WOK', desc: 'DISHES NEED FEWER TOSSES', cost: 240 },
  { id: 'steam3', name: '3RD STEAM BASKET', desc: 'STEAM THREE AT ONCE', cost: 380, from: 7, station: 'steamer' },
  { id: 'kettle', name: 'COPPER KETTLE', desc: 'FAST BOIL, THE POT STAYS HOT', cost: 360, from: 10, station: 'pot' },
];
// The copper kettle: water boils this much faster, and after you take the
// noodles the pot keeps its boiling water for the next ramyeon.
export const KETTLE_BOIL = 1 / 3;
// The shop opens after you clear this level (then between every night after it).
export const SHOP_FROM_LEVEL = 5;

// Settings: reset progress and its confirmation (tests/story.test.js checks
// these fit the font).
export const RESET_TEXT = {
  button: 'RESET PROGRESS',
  note: 'YOUR SETTINGS ARE KEPT',
  title: 'RESET PROGRESS?',
  body: 'THIS ERASES YOUR LEVELS, STARS, PURSE, UPGRADES, GOALS, BADGES, STORY AND MEMORIES.',
  kept: 'SOUND AND CONTROL SETTINGS STAY.',
  undo: 'IT CANNOT BE UNDONE.',
  keep: 'KEEP',
  reset: 'RESET',
};
