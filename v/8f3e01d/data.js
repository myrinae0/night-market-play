// Game data: stations, menu items, sauces, cooking curves, levels, upgrades (pure data).

// Stations in tab order. Part 2 adds the steamer (level 7) and the noodle pot
// (level 10) here; the renderer sizes its tabs from this list.
export const STATION_ORDER = ['counter', 'grill', 'fryer', 'wok'];

export const STATIONS = {
  counter: { name: 'Counter', unlock: 1 },
  grill: { name: 'Grill', unlock: 2 },
  fryer: { name: 'Fryer', unlock: 3 },
  wok: { name: 'Wok', unlock: 4 },
};

// kind: 'ready' (grab and serve), 'grill' (two sides, flip), 'fry' (one timing
// window), 'wok' (toss to cook; stop tossing and it scorches).
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
};
export const WOK_ITEMS = ['tteokbokki', 'japchae', 'friedrice'];

// Sauces and toppings go on finished food on the tray. Each only suits its
// station's food. The wok's toppings (egg, scallion) work exactly like sauces.
export const SAUCES = {
  spicy: { name: 'Green chili', short: 'CHILI', station: 'grill', price: 1 },
  honey: { name: 'Honey', short: 'HONEY', station: 'grill', price: 1 },
  yangnyeom: { name: 'Yangnyeom', short: 'YANGNYEOM', station: 'fryer', price: 2 },
  soygarlic: { name: 'Soy garlic', short: 'SOY GARLIC', station: 'fryer', price: 2 },
  egg: { name: 'Fried egg', short: 'EGG', station: 'wok', price: 2, topping: true },
  scallion: { name: 'Scallion', short: 'SCALLION', station: 'wok', price: 1, topping: true },
};
export const STATION_SAUCES = { grill: ['spicy', 'honey'], fryer: ['yangnyeom', 'soygarlic'], wok: ['egg', 'scallion'] };

// Cooking curves. Progress 1.0 is "just right". Under `done` is raw, from
// `burnt` up is burnt, and [perfectLo, perfectHi] earns a perfect-cook bonus.
// Grill items cook one side at a time (the side facing down); fry has one value.
// Wok: each toss adds `perToss`; a toss while the food is still in the air
// (`air` seconds after the last one) spills a little; after `idleSafe` seconds
// without a toss the food starts to scorch and is burnt `scorchTime` later.
export const COOK = {
  grill: { time: 4.5, done: 0.7, perfectLo: 0.85, perfectHi: 1.08, burnt: 1.25, max: 1.5, upRate: 0.08 },
  fry: { time: 6.5, done: 0.75, perfectLo: 0.9, perfectHi: 1.06, burnt: 1.2, max: 1.5 },
  wok: { perToss: 0.15, done: 0.75, perfectLo: 0.88, perfectHi: 1.1, burnt: 99, max: 1.2, air: 0.32, idleSafe: 2.2, scorchTime: 2.6, spillLoss: 0.1 },
};

export const GRILL_SLOTS = 3;
export const FRY_BASKETS = 2;
export const TRAY_MAX = 4;

// Levels. `kind`: 'station' introduces a new station, 'mix' juggles what you
// know, 'queue' has a line of customers. Part 2 adds 'rush', 'festival' and an
// endless mode. Intro lines come in two versions: drag controls and tap controls.
export const LEVELS = [
  {
    n: 1, title: 'Opening night', kind: 'station', stations: ['counter'], customers: 6, seed: 101,
    intro: {
      station: 'counter',
      heading: 'THE COUNTER',
      drag: ['Read the order bubble.', 'Drag drinks and food down onto your tray.', 'Drag the tray handle up onto the guest to serve.'],
      tap: ['Read the order bubble.', 'Tap items to put them on your tray.', 'Tap SERVE to hand it over.'],
    },
  },
  {
    n: 2, title: 'Smoke and sizzle', kind: 'station', stations: ['counter', 'grill'], customers: 7, seed: 202,
    intro: {
      station: 'grill',
      heading: 'NEW: THE GRILL',
      drag: ['Swipe empty space or tap a tab to switch stations.', 'Drag meat onto the grill. Flick it up to flip.', 'Drag it to the tray when both bars are green.'],
      tap: ['Swipe left or right to switch stations.', 'Grill both sides: FLIP, then TAKE when the bars are green.', 'Add a glaze on the tray if they ask.'],
    },
  },
  {
    n: 3, title: 'Chimaek hour', kind: 'station', stations: ['counter', 'grill', 'fryer'], customers: 8, seed: 303,
    intro: {
      station: 'fryer',
      heading: 'NEW: THE FRYER',
      drag: ['Drag chicken onto the batter bowl.', 'Then drag it into a basket.', 'Drag it to the tray in the gold. Beer is in the cooler.'],
      tap: ['Tap chicken, then the bowl to batter it.', 'Lift it out in the gold zone.', 'Toss in sauce on the tray. Beer is in the cooler.'],
    },
  },
  {
    n: 4, title: 'Wok and roll', kind: 'station', stations: ['counter', 'grill', 'fryer', 'wok'], customers: 8, seed: 404, rain: true,
    intro: {
      station: 'wok',
      heading: 'NEW: THE WOK',
      drag: ['Drag rice cakes, noodles or rice into the wok.', 'Flick up on the wok to toss. Let it land first!', 'Stop tossing and it scorches. Drag egg or scallion on top.'],
      tap: ['Tap rice cakes, noodles or rice to start a dish.', 'Tap TOSS (or the wok). Let it land between tosses!', 'Stop tossing and it scorches. TAKE it when it is done.'],
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
      drag: ['Up to three guests wait at once.', 'Each ticket has its own patience.', 'Drag the tray onto any guest whose order is ready.'],
      tap: ['Up to three guests wait at once.', 'Each ticket has its own patience.', 'Tap a guest to serve them. SERVE finds a match.'],
    },
  },
];

// Star thresholds, as a share of the level's best possible coins.
export const STAR_SHARES = [0.35, 0.6, 0.8];

// Customer looks: a spirit id (see spirits.js), 'shiba', or a number (one of
// the Kenney people). The last customer of level 3 is Chimaek the Shiba.
export const LOOKS = 6;
export const PERSON_SHARE = 0.22; // now and then a normal person comes by

// Stall upgrades, bought once each between nights with saved coins.
// Coins carry over from every night (the purse), so prices are set against a
// whole run: levels 1-5 pay at most 819 coins (781 for a flawless autopilot,
// about 500 for a two-star player), and all five upgrades cost 550. Levels are
// tuned to be beatable with none; with all of them a careless night (no
// sauces) still earns only one star (tests/upgrades.test.js).
export const UPGRADES = [
  { id: 'grill4', name: '4TH GRILL SPOT', desc: 'GRILL FOUR AT ONCE', cost: 120 },
  { id: 'tray5', name: 'BIGGER TRAY', desc: 'FIVE SPACES ON THE TRAY', cost: 100 },
  { id: 'fastfry', name: 'HOTTER OIL', desc: 'CHICKEN FRIES 20% FASTER', cost: 90 },
  { id: 'patience', name: 'PAPER LANTERNS', desc: 'GUESTS WAIT 20% LONGER', cost: 150 },
  { id: 'wokfast', name: 'SEASONED WOK', desc: 'DISHES NEED FEWER TOSSES', cost: 90 },
];
// The shop opens after you clear this level (then between every night after it).
export const SHOP_FROM_LEVEL = 5;
