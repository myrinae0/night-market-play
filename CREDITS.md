# Credits

Every third-party file is CC0 1.0 (public domain): free for commercial use, no
attribution required. We credit the artists anyway, here and on the title screen.
Each pack's license file sits next to its files in `assets/`.

| Files | What they are in the game | Pack and author | Source | License |
|---|---|---|---|---|
| `assets/food/*.png` (15 sprites, 16 x 16, unmodified) | Soda, kimbap, egg toast, galbi (raw and grilled), sausage, raw chicken, fried chicken, raw rice (rice ball), the sauces: honey, chili, yangnyeom (red chili), soy garlic (garlic), and the wok toppings: fried egg, scallion | "16x16 Food" by ARoachIFoundOnMyPillow | <https://opengameart.org/content/16x16-food> | CC0 1.0 (`assets/food/LICENSE.txt`) |
| `assets/kenney-rpg-urban/tilemap_packed.png` (unmodified sheet; the front-facing frame of its six people is used) | The normal people who now and then come to the stall | "RPG Urban Pack" by Kenney (www.kenney.nl) | <https://opengameart.org/content/rpg-urban-pack> (also <https://kenney.nl/assets/rpg-urban-pack>) | CC0 1.0 (`assets/kenney-rpg-urban/License.txt`, Kenney's original) |

Made for this game (MIT, see LICENSE):

- **The spirits** (`src/art.js`): Deung the lantern ghost, Yeo the fox spirit and
  its mask, Ikki the moss golem, Gaeguri the rain frog, Nabang the moth postman,
  Jongi the paper crane and Gim the steam wisp. Original 16 x 16 designs drawn in
  code in the food pack's style (its dark brown outline, flat shading). They are
  inspired by the mood of hand-drawn Japanese fantasy films, but none is based on
  a character from any film or game.
- **The wok dishes** (`src/art.js`): raw rice cakes, tteokbokki, raw glass
  noodles, japchae and fried rice, drawn in code to match the food pack where it
  has no sprite.
- Chimaek the Shiba (a 16 x 16 sprite in `src/sprites.js`), the barley tea and
  beer sprites, the market scene, rain, stall, stations, wok, UI, icons and
  `icon.svg`.
- Cooking stages (raw, battered, pale, burnt) are per-pixel recolours of the food
  sprites made at run time (`src/assets.js`).
- Bitmap fonts (`src/font.js`, with `<` and `=` added): copied from Chris Llaga's
  Crowd Runner (MIT).
- All sound: synthesized with WebAudio at run time, no audio files. Music in
  `src/music.js`, market ambience (crowd, wind, far-off sizzle, wind chimes, rain)
  in `src/ambience.js`, sound effects in `src/audio.js`.
- The story (`src/story.js`, `src/spirits.js`, written out in STORY.md).

Rejected while sourcing: "64 16x16 food sprites" on OpenGameArt (uploaded by a third
party from a paid itch.io pack, so the CC0 label is doubtful). No art from commercial
games or films is used.
