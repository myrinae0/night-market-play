// Game data: stations, menu items, sauces, cooking curves and levels (pure data).

export const STATION_ORDER = ['counter', 'grill', 'fryer', 'wok'];

export const STATIONS = {
  counter: { name: 'Counter', unlock: 1 },
  grill: { name: 'Grill', unlock: 2 },
  fryer: { name: 'Fryer', unlock: 3 },
  wok: { name: 'Wok', unlock: 4, comingSoon: true },
};

// kind: 'ready' (grab and serve), 'grill' (two sides, flip), 'fry' (one timing window).
export const ITEMS = {
  soda: { name: 'Soda', short: 'SODA', station: 'counter', kind: 'ready', price: 3, unlock: 1, drink: true },
  tea: { name: 'Barley tea', short: 'TEA', station: 'counter', kind: 'ready', price: 3, unlock: 1, drink: true },
  kimbap: { name: 'Kimbap', short: 'KIMBAP', station: 'counter', kind: 'ready', price: 5, unlock: 1 },
  toast: { name: 'Egg toast', short: 'TOAST', station: 'counter', kind: 'ready', price: 6, unlock: 1 },
  beer: { name: 'Beer', short: 'BEER', station: 'counter', kind: 'ready', price: 5, unlock: 3, drink: true },
  skewer: { name: 'Chicken skewer', short: 'SKEWER', station: 'grill', kind: 'grill', price: 8, unlock: 2 },
  sausage: { name: 'Sausage', short: 'SAUSAGE', station: 'grill', kind: 'grill', price: 7, unlock: 2 },
  chicken: { name: 'Fried chicken', short: 'CHICKEN', station: 'fryer', kind: 'fry', price: 12, unlock: 3 },
};

// Sauces go on finished food on the tray. Each sauce only suits its station's food.
export const SAUCES = {
  spicy: { name: 'Spicy glaze', short: 'SPICY', station: 'grill', price: 1 },
  honey: { name: 'Honey butter', short: 'HONEY', station: 'grill', price: 1 },
  yangnyeom: { name: 'Yangnyeom', short: 'YANGNYEOM', station: 'fryer', price: 2 },
  soygarlic: { name: 'Soy garlic', short: 'SOY GARLIC', station: 'fryer', price: 2 },
};

// Cooking curves. Progress 1.0 is "just right". Under `done` is raw, from
// `burnt` up is burnt, and [perfectLo, perfectHi] earns a perfect-cook bonus.
// Grill items cook one side at a time (the side facing down); fry has one value.
export const COOK = {
  grill: { time: 4.5, done: 0.7, perfectLo: 0.85, perfectHi: 1.08, burnt: 1.25, max: 1.5, upRate: 0.08 },
  fry: { time: 6.5, done: 0.75, perfectLo: 0.9, perfectHi: 1.06, burnt: 1.2, max: 1.5 },
};

export const GRILL_SLOTS = 3;
export const FRY_BASKETS = 2;
export const TRAY_MAX = 4;

// Each level adds one station. `customers` is how many orders it has.
export const LEVELS = [
  {
    n: 1, title: 'Opening night', stations: ['counter'], customers: 6, seed: 101,
    intro: {
      station: 'counter',
      heading: 'THE COUNTER',
      lines: ['Read the order bubble.', 'Tap items to put them on your tray.', 'Tap SERVE to hand it over.'],
    },
  },
  {
    n: 2, title: 'Smoke and skewers', stations: ['counter', 'grill'], customers: 7, seed: 202,
    intro: {
      station: 'grill',
      heading: 'NEW: THE GRILL',
      lines: ['Swipe left or right to switch stations.', 'Grill both sides: FLIP, then TAKE when the bars are green.', 'Add a glaze on the tray if they ask.'],
    },
  },
  {
    n: 3, title: 'Chimaek o\'clock', stations: ['counter', 'grill', 'fryer'], customers: 8, seed: 303,
    intro: {
      station: 'fryer',
      heading: 'NEW: THE FRYER',
      lines: ['Tap chicken, then the bowl to batter it.', 'Lift it out in the gold zone.', 'Toss in sauce on the tray. Beer is in the cooler.'],
    },
  },
];

// Star thresholds, as a share of the level's best possible coins.
export const STAR_SHARES = [0.35, 0.6, 0.8];

// Customer looks (indices into the renderer's palettes). The last customer of
// level 3 is Chimaek the Shiba.
export const LOOKS = 6;
