// The night market's customers: spirits who knew grandma, and now and then a
// normal person (who can't see the spirits). Pure data; the art is in sprites.js.
//
// from:     first level the spirit can come to the stall
// patience: multiplier on the order's patience
// enter:    seconds to walk (or float, or shuffle) to the counter
// dog:      how Chimaek reacts while they stand at the counter
// rainOnly: only comes on rainy nights
// oldCoins: pays this many extra coins (old ones) on a happy serve
// memories: short lines that unlock one per night as you serve them. A line
//           with `if` shows `text` when that story flag is set, else `alt`.
export const SPIRITS = {
  lantern: {
    name: 'DEUNG', kind: 'LANTERN GHOST', from: 1, patience: 1.1, enter: 1.2, dog: 'wag', float: true,
    look: 'A paper lantern with a sleepy face and a wisp for feet.',
    memories: [
      { text: 'She talked to me while she cooked. About you, mostly.' },
      { text: 'Some nights she fell asleep at the counter. I kept the light low.' },
      { if: 'deung_told', text: 'Thank you for telling me about her. I am still glowing, see?', alt: 'You never said where she went. That is alright. I can guess.' },
      { text: 'Your dog sees me. Dogs always do.' },
    ],
  },
  fox: {
    name: 'YEO', kind: 'FOX SPIRIT', from: 2, patience: 0.9, enter: 0.7, dog: 'growl',
    look: 'A fox in a round white mask with red marks. The mask slips when they wait.',
    memories: [
      { text: 'Tastes like the old days. Almost.' },
      { if: 'yeo_hum', text: 'Hum while you flip. Trust me.', alt: 'You asked about my face. Nobody asks twice.' },
      { text: 'I still owe her for forty sausages. I am paying it back. Slowly.' },
      { text: 'The mask was hers. She made it so I could come to market.' },
    ],
  },
  moss: {
    name: 'IKKI', kind: 'MOSS GOLEM', from: 3, patience: 1.3, enter: 2.0, dog: 'wag', oldCoins: 1,
    look: 'A slow round heap of mossy stones with a small white flower on top.',
    memories: [
      { text: '...Warm. ...Thank you.' },
      { if: 'ikki_promise', text: '...You kept her promise. ...She would be proud.', alt: '...Old coins still shine. ...If you rub them.' },
      { text: '...I planted her flower. ...It grows on me now.' },
      { text: '...The bell is under the counter. ...The dog knows.' },
    ],
  },
  frog: {
    name: 'GAEGURI', kind: 'RAIN FROG', from: 4, patience: 1.0, enter: 0.9, dog: 'hide', rainOnly: true,
    look: 'A round blue-grey frog with raindrops on its back and a paper boat for a hat.',
    memories: [
      { text: 'Ribbit! Toss and land! Toss and land!' },
      { text: 'When the river froze, she folded me this boat.' },
      { if: 'frog_teacher', text: 'You toss better than me now! Some teacher I am.', alt: 'The river is warm again. You should come and see it.' },
    ],
  },
  moth: {
    name: 'NABANG', kind: 'MOTH POSTMAN', from: 5, patience: 1.0, enter: 1.0, dog: 'wag', float: true,
    look: 'A soft grey moth with lilac wings and a postbag on one shoulder.',
    memories: [
      { text: 'Delivery complete. Well. Food delivery. To me.' },
      { text: 'Every letter finds its way. Mine are just slower.' },
      { if: 'letter_read', text: 'She wrote one more letter. I will bring it when it is ready.', alt: 'I still have her letter. It is very patient.' },
    ],
  },
  crane: {
    name: 'JONGI', kind: 'PAPER CRANE', from: 6, patience: 1.0, enter: 1.0, dog: 'growl', float: true,
    look: 'A paper crane folded from a recipe page. Grandma wrote on its wings.',
    memories: [
      { text: 'The ink on my wing says: more salt. She was right.' },
      { text: 'When the steam rises, a friend of mine will come. A wisp. Be kind to it.' },
      { if: 'bell_known', text: 'The bell rings when the market should open. Not before.', alt: 'Ask me about the bell some night.' },
    ],
  },
  // Part 2 (level 7, the steamer). Drawn and listed so the data is ready; it
  // does not come to the stall in part 1.
  wisp: {
    name: 'GIM', kind: 'STEAM WISP', from: 7, patience: 1.0, enter: 1.0, dog: 'wag', float: true, stub: true,
    look: 'A small curl of steam with two dot eyes. Shy.',
    memories: [{ text: '...Warm buns. ...Like before.' }],
  },
};
export const SPIRIT_IDS = Object.keys(SPIRITS);

// Normal people can't see the spirits. Now and then one says so, without knowing.
export const PEOPLE_QUIPS = [
  'Quiet night, huh? Just me here.',
  'Who are you waving at?',
  'Your lanterns keep flickering. Spooky.',
  'My grandma used to eat here!',
  'Is your dog growling at nothing?',
];

// Spirits that can come on a level (the featured one first).
export function spiritsFor(levelN, rain = false) {
  return SPIRIT_IDS.filter((id) => {
    const s = SPIRITS[id];
    return !s.stub && s.from <= levelN && (!s.rainOnly || rain);
  });
}
export const isSpirit = (look) => typeof look === 'string' && !!SPIRITS[look];

// The line a spirit says for memory number k (0-based), given the story flags.
export function memoryText(spirit, k, flags = {}) {
  const m = SPIRITS[spirit]?.memories[k];
  if (!m) return null;
  if (m.if) return flags[m.if] ? m.text : m.alt;
  return m.text;
}
