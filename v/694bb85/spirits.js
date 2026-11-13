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
// scripted: never comes by chance; only where the story puts them (and,
//           after the KEEPER ending, now and then on endless nights).
export const SPIRITS = {
  lantern: {
    name: 'DEUNG', kind: 'LANTERN GHOST', from: 1, patience: 1.1, enter: 1.2, dog: 'wag', float: true,
    look: 'A paper lantern with a sleepy face and a wisp for feet.',
    memories: [
      { text: 'She talked to me while she cooked. About you, mostly.' },
      { text: 'Some nights she fell asleep at the counter. I kept the light low.' },
      { if: 'deung_told', text: 'Thank you for telling me about her. I am still glowing, see?', alt: 'You never said where she went. That is alright. I can guess.' },
      { text: 'Your dog sees me. Dogs always do.' },
      // part 2
      { text: 'She never told the dog to guard the bell. The dog just did.' },
      { if: 'dog_age', text: 'I asked the dog her age once. She looked at the river.', alt: 'Some nights the dog sits facing the river. All night.' },
      // part 3
      { text: 'Frost on my paper. I glow a little warmer for the cold ones.' },
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
      // part 2
      { text: 'Bell coins only spend here. Out there they are just tin.' },
      { if: 'bell_why', text: 'She stopped ringing it to keep something out. My guess. Do not quote me.', alt: 'Ask me some night why she stopped ringing the bell.' },
      // part 3
      { text: 'I was wrong. She did not keep it out. She kept it waiting. Kinder.' },
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
      // part 2
      { text: '...The river is quiet since the winter. ...Too quiet.' },
      { text: '...Her scarf. ...It is still on the river. ...Frozen into the ice.' },
      // part 3
      { text: '...Moss sleeps in winter. ...I stay awake. ...For you.' },
    ],
  },
  frog: {
    name: 'GAEGURI', kind: 'RAIN FROG', from: 4, patience: 1.0, enter: 0.9, dog: 'hide', rainOnly: true,
    look: 'A round blue-grey frog with raindrops on its back and a paper boat for a hat.',
    memories: [
      { text: 'Ribbit! Toss and land! Toss and land!' },
      { text: 'When the river froze, she folded me this boat.' },
      { if: 'frog_teacher', text: 'You toss better than me now! Some teacher I am.', alt: 'The river is warm again. You should come and see it.' },
      // part 2
      { text: 'The ice cracked the night she closed. Like something let go.' },
      { if: 'river_told', text: 'Thank you for asking about the river. Nobody asks a frog.', alt: 'The river remembers her. Rivers do.' },
      // part 3
      { if: 'scarf_warmed', text: 'The scarf is dry now. It smells like her soup.', alt: 'Under the ice, the river is still moving. Slowly.' },
    ],
  },
  moth: {
    name: 'NABANG', kind: 'MOTH POSTMAN', from: 5, patience: 1.0, enter: 1.0, dog: 'wag', float: true,
    look: 'A soft grey moth with lilac wings and a postbag on one shoulder.',
    memories: [
      { text: 'Delivery complete. Well. Food delivery. To me.' },
      { text: 'Every letter finds its way. Mine are just slower.' },
      { if: 'letter_read', text: 'She wrote one more letter. I will bring it when it is ready.', alt: 'I still have her letter. It is very patient.' },
      // part 2
      { text: 'Her letters always had a little bell drawn in the corner. Always.' },
      { if: 'letter2_read', text: 'You read both letters. She would like that. There may be a third.', alt: 'There may be a third letter. Post is slow. Even mine.' },
      // part 3
      { text: 'Three letters. That is all of them. My bag feels light.' },
    ],
  },
  crane: {
    name: 'JONGI', kind: 'PAPER CRANE', from: 6, patience: 1.0, enter: 1.0, dog: 'growl', float: true,
    look: 'A paper crane folded from a recipe page. Grandma wrote on its wings.',
    memories: [
      { text: 'The ink on my wing says: more salt. She was right.' },
      { text: 'When the steam rises, a friend of mine will come. A wisp. Be kind to it.' },
      { if: 'bell_known', text: 'The bell rings when the market should open. Not before.', alt: 'Ask me about the bell some night.' },
      // part 2
      { text: 'My last line says: buns for the long winter, twelve a night.' },
      { if: 'bell_known', text: 'You asked why the stall closed. Now ask about the river.', alt: 'Twelve buns a night, all winter. Who eats that many?' },
      // part 3
      { text: 'My last page is finished now. You finished it.' },
    ],
  },
  // ---------- part 2 ----------
  wisp: {
    name: 'GIM', kind: 'STEAM WISP', from: 7, patience: 1.0, enter: 1.0, dog: 'wag', float: true,
    look: 'A small curl of steam with two dot eyes. Shy.',
    memories: [
      { text: '...Warm buns. ...Like before.' },
      { text: '...I was the steam from her last batch. ...I stayed.' },
      { if: 'gim_stay', text: '...You let me sleep in the basket. ...It is warm in there.', alt: '...The lid was heavy. ...I got out anyway.' },
      { text: '...She wrote on the lid. ...For the long winter.' },
      // part 3
      { text: '...I keep the tray warm. ...It is the one thing steam is good for.' },
    ],
  },
  clay: {
    name: 'TTUK', kind: 'CLAY POT IMP', from: 10, patience: 0.85, enter: 1.4, dog: 'stare',
    look: 'A squat clay pot with its lid for a hat, steam for ears and a frown.',
    memories: [
      { text: 'Hmph. Not bad. Not hers. Not bad.' },
      { text: 'Forty years I boiled her water. She never said thank you. She said it with food.' },
      { if: 'ttuk_thanks', text: 'You said thank you. Strange child. Keep doing it.', alt: 'Still waiting for my thank you. I am a patient pot.' },
      { text: 'The winter the river froze, my water froze too. She warmed me in her hands.' },
      // part 3
      { if: 'ttuk_mended', text: 'The crack is mended. I still frown. Out of habit.', alt: 'A cracked pot still boils. Just not soup.' },
    ],
  },
  rabbit: {
    name: 'DAL', kind: 'MOON RABBIT', from: 13, patience: 1.0, enter: 1.1, dog: 'wag',
    look: 'A white rabbit with long ears, a gold crescent on the forehead and a red festival vest.',
    memories: [
      { text: 'The moon tastes like rice cakes. This tastes better.' },
      { text: 'I gave her the bell. A long time ago. She was younger than you.' },
      { if: 'dal_keeper', text: 'A keeper keeps the light, the food and a promise. You have two.', alt: 'You did not ask what a keeper is. Good. Some answers are heavy.' },
      { text: 'Your dog came with the bell. Ask her how old she is.' },
      // part 3
      { text: 'Rice cakes from the moon, for her soup. One bowl a year. That was the deal.' },
    ],
  },
  // ---------- part 3 ----------
  // Eoreum: the river in winter. Not evil: hungry and lonely. Every year the
  // market fed it one bowl so it would let spring come. It waits at the end
  // of the line (levels 14 and 19); scripted, never by chance.
  ice: {
    name: 'EOREUM', kind: 'THE LONG WINTER', from: 14, patience: 1.6, enter: 2.4, dog: 'stare', float: true, scripted: true,
    look: 'A carp of clear river ice, floating upright. Icicle fins, a crown of frost, and a crack down one side.',
    memories: [
      { text: '...Warm. ...I forgot what warm was.' },
      { if: 'frost_who', text: '...You asked my name, that night. ...Nobody asks winter its name.', alt: '...She is gone. ...I knew. ...I waited anyway.' },
      { text: '...She sang to me through the ice. ...The wok song. ...Badly.' },
    ],
  },
};
export const SPIRIT_IDS = Object.keys(SPIRITS);

// Regulars (level 8 on) greet you by mood when they come back: glad (a
// heart), ok, or grumpy (a rain cloud).
export const REGULAR_LINES = {
  lantern: { glad: 'You again! I saved my brightest glow for you.', ok: 'Evening. Is the light still on? Good.', grumpy: 'Last time I waited so long my wick went out.' },
  fox: { glad: 'Back again. Hum for me while you flip.', ok: 'Same fox, same mask. What is cooking?', grumpy: 'You kept me waiting last time. I remember.' },
  moss: { glad: '...Hello again. ...I brought extra coins.', ok: '...Evening. ...Slow and steady.', grumpy: '...Last time. ...Wrong food. ...Hm.' },
  frog: { glad: 'Ribbit! My favorite cook!', ok: 'Ribbit. Wet night, warm food.', grumpy: 'Ribbit. I hope it is right this time.' },
  moth: { glad: 'Special delivery: me! Hungry as ever.', ok: 'Post is done. Supper now.', grumpy: 'Last time my order got lost. Like my letters.' },
  crane: { glad: 'The recipe page is glad to see you.', ok: 'Evening. More salt, remember.', grumpy: 'My wings are creased from waiting last time.' },
  wisp: { glad: '...You again. ...Warm.', ok: '...Hello.', grumpy: '...Last time was cold.' },
  clay: { glad: 'Hmph. You again. Good.', ok: 'Hmph. Water boiling? It should be.', grumpy: 'Hmph. Mushy last time. Do better.' },
  rabbit: { glad: 'My favorite stall on the whole street!', ok: 'The moon says hello.', grumpy: 'The moon is watching. Do better.' },
  ice: { glad: '...One bowl. ...The usual.', ok: '...It is still winter somewhere.', grumpy: '...Cold. ...Even for me.' },
};

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
    return !s.stub && !s.scripted && s.from <= levelN && (!s.rainOnly || rain);
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
