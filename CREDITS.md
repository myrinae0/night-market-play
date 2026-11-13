# Credits

Every third-party file is CC0 1.0 (public domain): free for commercial use, no
attribution required. We credit the artists anyway, here and on the title screen.
Each pack's license file sits next to its files in `assets/`.

| Files | What they are in the game | Pack and author | Source | License |
|---|---|---|---|---|
| `assets/food/*.png` (12 sprites, 16 x 16, unmodified) | Soda, kimbap, egg toast, galbi (raw and grilled), sausage, raw chicken, fried chicken, and the sauces: honey, chili, yangnyeom (red chili), soy garlic (garlic) | "16x16 Food" by ARoachIFoundOnMyPillow | <https://opengameart.org/content/16x16-food> | CC0 1.0 (`assets/food/LICENSE.txt`) |
| `assets/kenney-rpg-urban/tilemap_packed.png` (unmodified sheet; the front-facing frame of its six people is used) | The customers | "RPG Urban Pack" by Kenney (www.kenney.nl) | <https://opengameart.org/content/rpg-urban-pack> (also <https://kenney.nl/assets/rpg-urban-pack>) | CC0 1.0 (`assets/kenney-rpg-urban/License.txt`, Kenney's original) |

Made for this game (MIT, see LICENSE):

- Drawn in code to match the packs' 16 x 16 style where no CC0 sprite existed:
  Chimaek the Shiba (a 16 x 16 sprite in `src/sprites.js`), the barley tea and beer
  sprites, the market scene, stall, stations, UI, icons and `icon.svg`.
- Cooking stages (raw, battered, burnt) are per-pixel recolours of the food sprites
  made at run time (`src/assets.js`).
- Bitmap fonts (`src/font.js`, with `<` and `=` added): copied from Chris Llaga's
  Crowd Runner (MIT).
- All sound effects: synthesized with WebAudio at run time (`src/audio.js`); no
  audio files.

Rejected while sourcing: "64 16x16 food sprites" on OpenGameArt (uploaded by a third
party from a paid itch.io pack, so the CC0 label is doubtful). No art from commercial
games is used.
