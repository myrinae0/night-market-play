# Credits

Every third-party file is CC0 1.0 (public domain): free for commercial use, no
attribution required. We credit the artists anyway, here and on the title screen.
Each pack's license file sits next to its files in `assets/`.

| Files | What they are in the game | Pack and author | Source | License |
|---|---|---|---|---|
| `assets/food/*.png` (14 sprites, 16 x 16, unmodified) | Soda, kimbap, egg toast, galbi (raw and grilled), sausage, raw chicken (drumstick), raw rice (rice ball), the sauces: honey, chili, yangnyeom (red chili), soy garlic (garlic), the wok toppings: fried egg, scallion. (The pack's dumpling, mochi and chicken nuggets were used for mandu, the bun and fried chicken until Nov 13, then replaced with code-drawn sprites that read at the order bubble's size.) | "16x16 Food" by ARoachIFoundOnMyPillow | <https://opengameart.org/content/16x16-food> | CC0 1.0 (`assets/food/LICENSE.txt`) |
| `assets/kenney-rpg-urban/tilemap_packed.png` (unmodified sheet; the front-facing frame of its six people is used) | The normal people who now and then come to the stall | "RPG Urban Pack" by Kenney (www.kenney.nl) | <https://opengameart.org/content/rpg-urban-pack> (also <https://kenney.nl/assets/rpg-urban-pack>) | CC0 1.0 (`assets/kenney-rpg-urban/License.txt`, Kenney's original) |

Made for this game (MIT, see LICENSE):

- **The spirits** (`src/art.js`): Deung the lantern ghost, Yeo the fox spirit and
  its mask, Ikki the moss golem, Gaeguri the rain frog, Nabang the moth postman,
  Jongi the paper crane, Gim the steam wisp, Ttuk the clay pot imp and Dal the
  moon rabbit. Original 16 x 16 designs drawn in code in the food pack's style
  (its dark brown outline, flat shading). They are inspired by the mood of
  hand-drawn Japanese fantasy films, but none is based on a character from any
  film or game. The cold voice of the night 13 epilogue has no sprite, only
  frost and two eyes, drawn in code.
- **The wok dishes** (`src/art.js`): raw rice cakes, tteokbokki, raw glass
  noodles, japchae (redrawn Nov 13 as a mound of noodles on a plate) and fried
  rice, drawn in code to match the food pack where it has no sprite.
- **Mandu, the steamed bun and fried chicken** (`src/art.js`, Nov 13): a
  pleated half-moon dumpling, a dome bun on its square of paper with a red
  stamp, and a golden crumbed drumstick (the shape of the pack's raw
  drumstick), drawn in the pack's style so they read at the order bubble's
  size (1x). Raw dough is a recolour made at run time.
- **Part 2 food** (`src/art.js`): a block of instant ramyeon, a bowl of
  ramyeon (drawn on the food pack's own soup bowl shape and colours), the soy
  dip and chili oil dishes, and Chimaek's plain beef (raw and grilled), drawn in
  code in the pack's style. The pack has no ramyeon, dips or plain beef; no
  CC0 or CC-BY 16 x 16 sprite for them was found (searched Nov 13: OpenGameArt,
  itch.io free packs, Kenney).
- **Part 3** (`src/art.js`): Eoreum, the long winter (a carp of clear river
  ice seen side on, floating in the air: scales, icicle fins, a forked tail, a
  crown of frost and a crack under one eye like a tear; redrawn Nov 13 so it
  reads as a fish, not a ghost), an original design inspired by the mood of hand-drawn Japanese fantasy
  films and not based on any existing character; tteokguk (rice cake soup on
  the food pack's soup bowl shape and colours, as ramyeon is), raw sliced rice
  cakes and seaweed (gim), drawn in code in the pack's style. The pack in
  `assets/food` has no soup or sliced rice cake sprite (checked Nov 13). The
  iron soup pot, the ladle, snow, frost, the cooling bar and the ending scenes
  are drawn in code too. The winter variation of the music is synthesized like
  the rest.
- Chimaek the Shiba (a 16 x 16 sprite in `src/sprites.js`, with her back turned
  when she refuses a treat), the barley tea and beer sprites, the market scene,
  rain, the festival moon and lanterns, snow and frost, stall, stations, wok,
  bamboo steamer, lids, kettle, noodle pot, UI, icons and `icon.svg`.
- Ttuk, the clay pot imp, was redrawn on Nov 13 so he reads at 4x (lid with a
  knob, glaze band, white eyes under heavy brows, a frown, stub feet).
- Cooking stages (raw, battered, pale, burnt, soggy, raw dough) are per-pixel recolours of the food
  sprites made at run time (`src/assets.js`).
- Bitmap fonts (`src/font.js`, with `<` and `=` added): copied from Crowd
  Runner, the same author's earlier game (MIT).
- All sound: synthesized with WebAudio at run time, no audio files. Music in
  `src/music.js`, market ambience (crowd, wind, far-off sizzle, wind chimes, rain)
  in `src/ambience.js`, sound effects in `src/audio.js`.
- The story, parts 1, 2 and 3 (`src/story.js`, `src/spirits.js`, written out in
  STORY.md).

Rejected while sourcing: "64 16x16 food sprites" on OpenGameArt (uploaded by a third
party from a paid itch.io pack, so the CC0 label is doubtful). "Pixel Food" by ghostpixxells on
itch.io (CC0, has dumplings and ramen, but 32 x 32: twice the pixel density of
everything else, so it would not match at the game's whole-number scale). No art from commercial
games or films is used.
