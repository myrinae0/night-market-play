// Pixel maps drawn for this game (MIT), 16 x 16, in the style of the CC0 food
// pack: the pack's dark brown outline, flat two- or three-tone shading, light
// from the top left. Used where no CC0 sprite exists: the spirits (original
// designs) and the wok dishes. Pure data; sprites.js turns them into canvases.

export const OL = '#3a2229'; // the food pack's outline brown

// ---------- spirits ----------
export const SPIRIT_ART = {
  // Lantern ghost: a paper lantern with a sleepy face, a wisp for feet.
  lantern: {
    pal: { k: OL, c: '#5a3328', p: '#f6dca8', q: '#e3b071', y: '#fff3c4', r: '#d8333f', e: '#2a1a20', m: '#f2a0a0', w: '#d8e8f8', v: '#a8c4e0' },
    frames: [[
      '......kkkk......',
      '.....kcccck.....',
      '...kkkkkkkkkk...',
      '..kyppppppppqk..',
      '.kyppppppppppqk.',
      '.krrrrrrrrrrrrk.',
      '.kypppppppppqqk.',
      '.kpeepppppeepqk.',
      '.kpmpppppppmpqk.',
      '.kppppppkkpppqk.',
      '.krrrrrrrrrrrrk.',
      '..kppppppppppk..',
      '...kkkkkkkkkk...',
      '.....kcccck.....',
      '......kwwk......',
      '.......wv.......',
    ]],
  },
  // Fox spirit: a round white mask with red marks; the mask (drawn on top)
  // slips while they wait, and a yellow eye peeks out.
  fox: {
    pal: { k: OL, o: '#e0873a', d: '#b45f22', i: '#f2a0a0', w: '#fbf1e0', g: '#fee761', b: '#3a4a8a', u: '#5a6ab0', t: '#fbf1e0', e: '#2a1a20' },
    frames: [[
      '..k..........k..',
      '.kok........kok.',
      '.koik......kiok.',
      '.kooikkkkkkiook.',
      '.kooooooooooook.',
      '.kooooooooooook.',
      '.kdoooooooooodk.',
      '.kooogoooogoook.',
      '.kooooooooooook.',
      '.kwoooooooooowk.',
      '..kwwwwkkwwwwk..',
      '...kkkkkkkkkk.kk',
      '..kbbbuubbbbkkok',
      '.kbbbbuubbbbbkok',
      '.kbbbbuubbbbbktk',
      '.kkkkkkkkkkkkkk.',
    ]],
    mask: {
      pal: { k: OL, m: '#fbf6ea', n: '#d9cfc0', e: '#2a1a20', r: '#d8333f' },
      rows: ['.kkkkkkkk.', 'kmmmmmmmnk', 'kmeemmeenk', 'kmrmmmmrnk', 'kmmmrrmmnk', '.kmmmmmnk.', '..kkkkkk..'],
      x: 3, y: 4,
    },
  },
  // Moss golem: a slow heap of mossy stones with a small white flower on top.
  moss: {
    pal: { k: OL, s: '#8b9bb4', d: '#5c6884', l: '#c0cbdc', g: '#63c74d', G: '#3e8948', f: '#fff8ec', y: '#fee761', e: '#1c1418', b: '#f2a0a0' },
    frames: [[
      '.......f........',
      '......fyf.......',
      '.......fG.......',
      '....kkkkGkkk....',
      '...kgggGgggggk..',
      '..kgGgggggGgggk.',
      '.kgggsslllsgggk.',
      '.kGgslllllllsGk.',
      '.ksslesssseslsk.',
      'kdkssbsssssbskdk',
      'kdkssssddssssskd',
      'kkksdssssssdssk.',
      '..ksssslsssssk..',
      '..kdssssssssdk..',
      '..kdddkkkkdddk..',
      '...kkk....kkk...',
    ]],
  },
  // Rain frog: round and blue-grey, raindrops on its back, a paper boat for a hat.
  frog: {
    pal: { k: OL, p: '#f4ead2', P: '#cdbf9e', f: '#7a9cc0', F: '#4f6f96', l: '#b4cde4', w: '#fbf6ea', e: '#1c1418', b: '#f2a0a0', d: '#2ce8f5' },
    frames: [[
      '......k.........',
      '.....kpk........',
      '....kpPpk.......',
      '..kkkkkkkkkkk...',
      '..kpppppppppk...',
      '...kPPPPPPPk....',
      '..kkk.....kkk...',
      '.kwwek...kewwk..',
      '.kwwek...kewwk..',
      '.kfkkfffffkkfk..',
      'kfffflfffffffk..',
      'kfbfffffffbffk.d',
      'kffkkkkkkkkffk..',
      '.kfflllllllffk..',
      'kFfkFFkkkFFkfFk.',
      'kkkk..k.k...kkkk',
    ]],
  },
  // Moth postman: soft grey, lilac wings, a postbag on one shoulder.
  moth: {
    pal: { k: OL, a: '#c9b8e8', A: '#9a86c4', m: '#e8e2d8', M: '#b8ae9e', e: '#1c1418', b: '#b86f50', B: '#733e39', l: '#fbf6ea' },
    frames: [[
      '..k..........k..',
      '...k........k...',
      '....k.kkkk.k....',
      'kkk..kmmmmk..kkk',
      'kaak.kmmmmk.kaak',
      'kaaakmemmemkaaak',
      'kaAaakmmmmkaaAak',
      'kaAAakMmmMkaAAak',
      '.kaAakmmmmkaAak.',
      '.kaaakMbbBkaaak.',
      '..kaakmbllBkaak.',
      '..kaakmbllBkak..',
      '...kakmMbBkak...',
      '....kkmmmmkk....',
      '......kMMk......',
      '.......kk.......',
    ]],
  },
  // Paper crane: folded from a recipe page, ink lines on its wings.
  crane: {
    pal: { k: OL, w: '#fbf6ea', s: '#d9cfc0', i: '#5a6380', r: '#d8333f', e: '#1c1418' },
    frames: [[
      '................',
      '..k.............',
      '.kwk............',
      'krwwk...........',
      '..kewk......kk..',
      '...kwk.....kwsk.',
      '....kwk...kwisk.',
      '....kwwkkkwwsk..',
      '...kwwwwwwwisk..',
      '..kwiwwwwwwssk..',
      '..kwwiwiwwsssk..',
      '...kwwwwwsssk...',
      '....kkwwwssk....',
      '......kkwkk.....',
      '.......kk.......',
      '................',
    ]],
  },
  // Steam wisp (level 7, part 2): a small curl of steam with two dot eyes.
  wisp: {
    pal: { k: '#6a7290', w: '#f2f4fa', s: '#c8cee0', e: '#1c1418' },
    frames: [[
      '................',
      '.......kk.......',
      '......kwwk......',
      '.....kwsk.......',
      '.....kwk........',
      '......kwkk......',
      '.....kkwwwk.....',
      '....kwwwwwwk....',
      '...kwwwwwwwsk...',
      '...kwewwwewsk...',
      '...kwwwwwwwsk...',
      '....kwwwwwsk....',
      '.....kswwsk.....',
      '......kssk......',
      '.......kk.......',
      '................',
    ]],
  },
  // Clay pot imp (level 10): a squat earthenware pot (ttukbaegi) with its lid
  // for a hat, two puffs of steam for ears and a permanent frown. Redrawn so
  // it reads at 4x on the night sky: a warm terracotta body with a lit left
  // side, a pale glaze band under the rim, a lid with a knob, big white eyes
  // under heavy brows, little stub feet.
  clay: {
    pal: {
      k: '#2a1418', c: '#c8693f', C: '#8a3e26', h: '#ec9a68', g: '#f0c86a', G: '#c89a3e', l: '#7a4a32', L: '#a8714c',
      w: '#fbf6ea', e: '#1c1418', b: '#3a1a14', m: '#5a2418', s: '#e4e8f4', p: '#f2a0a0',
    },
    frames: [[
      '.s............s.',
      's.s....kk....s.s',
      '.s....kLlk....s.',
      '...kkkkkkkkkk...',
      '..kLLLLlllllLk..',
      '.kkkkkkkkkkkkkk.',
      '.kgggggggggggGk.',
      'kchcccccccccccCk',
      'khbbbcccccbbbcCk',
      'khcwwbcccbwwccCk',
      'khcwecccccewccCk',
      'khpccccccccpccCk',
      '.kcccccbbcccCCk.',
      '.kCcccbccbcCCCk.',
      '..kkCCCCCCCCkk..',
      '...kk......kk...',
    ]],
  },
  // Moon rabbit (level 13, the festival's guest of honour): long ears, a gold
  // crescent on the forehead, a red festival vest with gold trim.
  rabbit: {
    pal: { k: OL, w: '#fbf6ea', s: '#d9cfe8', p: '#f2a0a0', y: '#fee761', e: '#d8333f', r: '#d8333f', R: '#9e2835', g: '#feae34' },
    frames: [[
      '...kk.....kk....',
      '..kwpk...kwpk...',
      '..kwpk...kwpk...',
      '..kwpk...kwpk...',
      '..kwwk...kwwk...',
      '..kkwkkkkkwkk...',
      '.kwwwwwyywwwsk..',
      'kwwwwwwwywwwwsk.',
      'kwwewwwwwwewwsk.',
      'kpwwwwwkwwwwpsk.',
      '.kwwwwkwkwwwsk..',
      '.kkrrgrrrrgrRk..',
      'kwkrrrrggrrrRkwk',
      'kwkrrrrrrrrrRkwk',
      '.kkrrrrrrrrrRkk.',
      '..kkkkkkkkkkkk..',
    ]],
  },
  // Eoreum (part 3): the river in winter, an original design. A carp of
  // clear river ice, seen side on and floating in the air, facing the line:
  // a long body with a checker of scales, a crown of frost crystals on its
  // head, one dark round eye with a glint, an open mouth with a barbel,
  // icicle fins (dorsal and one hanging pectoral) and a forked tail. A crack
  // runs down from under its eye like a tear (it closes as it eats in the
  // finale). Dark navy outline, as the ice has no brown in it.
  ice: {
    pal: { k: '#22305a', i: '#d4ecff', I: '#9cc8f0', d: '#6a94c8', w: '#ffffff', e: '#16203e', g: '#bfe0ff', c: '#34508e', f: '#f2f8ff' },
    frames: [[
      '................',
      '....f...........',
      '..f.f.f.k.......',
      '..gfgfgkdk.....k',
      '..kkkkkkdkk..kdk',
      '.kiiiiwwiiikkddk',
      '.kiewiiiiiwiddk.',
      'kiieeiIIiIiidk..',
      'keIciiIiIiIidk..',
      'dkIcIIIIiIiIddk.',
      'd.kIcddIIIIkkddk',
      '...kkddkkkk..kdk',
      '.....kdk.......k',
      '......k.........',
      '................',
      '................',
    ]],
  },
};

// ---------- wok dishes (no CC0 sprite for these) ----------
export const FOOD_ART = {
  // Raw rice cakes (garae-tteok), three white sticks.
  tteok_raw: {
    pal: { k: OL, w: '#fbf6ea', s: '#ddd2bc', h: '#ffffff' },
    rows: [
      '................',
      '................',
      '.......kkkkkkk..',
      '......khwwwwwsk.',
      '......kwwwwwssk.',
      '..kkkkkkkkkkkk..',
      '.khwwwwwssk.....',
      '.kwwwwwwssk.....',
      '..kkkkkkkkkkkk..',
      '....khwwwwwwsk..',
      '....kwwwwwwssk..',
      '.....kkkkkkkk...',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  // Tteokbokki: rice cakes in red chili sauce, a fish cake, scallion bits.
  tteokbokki: {
    pal: { k: OL, o: '#e8532e', y: '#ff8a5c', r: '#b32a2a', f: '#f6d9a0', g: '#63c74d', w: '#ffd2b0' },
    rows: [
      '................',
      '................',
      '.......kkkkkkk..',
      '......kywwooork.',
      '......koooooork.',
      '..kkkkkkkkkkrk..',
      '.kywwoooork.k...',
      '.kooogooorkkkk..',
      '..kkkkkkkkfffk..',
      '...krkywwoofk...',
      '..krrkooogorrk..',
      '.krrrrkkkkkrrrk.',
      '.krrorrrrorrrrk.',
      '..kkrrrrrrrrkk..',
      '....kkkkkkkk....',
      '................',
    ],
  },
  // Raw glass noodles (dangmyeon): a grey bundle tied in the middle.
  noodles_raw: {
    pal: { k: OL, n: '#d8d4cc', s: '#a8a49c', h: '#f4f2ee', t: '#b86f50' },
    rows: [
      '................',
      '................',
      '..kk.kk.kk.kk...',
      '..knknknknknk...',
      '..khnhnsnhnsk...',
      '...knnnnnnnk....',
      '....knsnhnk.....',
      '....kttttttk....',
      '....kttttttk....',
      '....knhnsnk.....',
      '...knnhnnsnk....',
      '..knhnsnhnsnk...',
      '..knnnnnnnnnk...',
      '..kk.kk.kk.kk...',
      '................',
      '................',
    ],
  },
  // Japchae: a mound of glossy glass noodles (light and dark strands) with
  // carrot, spinach and egg, on a small white plate, so it reads as noodles
  // at the order bubble's size (redrawn Nov 13; it was a brown blob).
  japchae: {
    pal: { k: '#3a2229', n: '#6e3a1c', h: '#d8a060', m: '#a8683a', o: '#f77622', g: '#3e8948', y: '#fee761', p: '#f4f0e8', P: '#c8c0b0' },
    rows: [
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkhmnhkk....',
      '...khmnhmgnhk...',
      '..khnhmnhmnhmk..',
      '..kmohnhmnhmok..',
      '.khmnhmnyhmnhmk.',
      '.knhmgnhmnhmnhk.',
      'kphmnhmonhmnhmpk',
      'kppkkkkkkkkkkppk',
      '.kPppppppppppPk.',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
  },
  // Raw rice is the pack's rice_ball sprite (assets.js); fried rice is drawn:
  // a golden mound with peas, carrot and egg.
  friedrice: {
    pal: { k: OL, r: '#f2c45a', h: '#ffe08a', d: '#c8902a', g: '#63c74d', o: '#f77622', y: '#fee761' },
    rows: [
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkhhrrkk....',
      '...khhrrgrrrk...',
      '..khrrorrryrrk..',
      '..khrrrrgrrrdk..',
      '.khrgrryrrrordk.',
      '.krrrorrrgrrrdk.',
      'khrrrrrrrrryrrdk',
      'krrgrryrrorrrddk',
      '.kddrrrrrrrrddk.',
      '..kkddddddddkk..',
      '....kkkkkkkk....',
      '................',
    ],
  },
};

// ---------- part 2: noodle pot and dips ----------
// The pack has no ramyeon or dip dishes, so these are drawn here on the
// pack's own soup bowl: its outline (#42393d), its cream bowl colours and shape.
const PACK = { a: '#42393d', b: '#e7daa8', c: '#efeadb', d: '#daca81' };
Object.assign(FOOD_ART, {
  // Raw ramyeon: a block of instant noodles, wavy, golden.
  ramyeon_raw: {
    pal: { a: PACK.a, n: '#e8b84a', h: '#f8dc84', d: '#b8822c' },
    rows: [
      '................', '................', '................',
      '..aaaaaaaaaaaa..',
      '.ahnhnhhnhnhhna.',
      '.anhnnhnnhnnhda.',
      '.ahnhhnhhnhhnda.',
      '.anhnnhnnhnnhda.',
      '.ahnhhnhhnhhnda.',
      '.anhnnhnnhnnhda.',
      '.ahnhhnhhnhhnda.',
      '.adddddddddddda.',
      '..aaaaaaaaaaaa..',
      '................', '................', '................',
    ],
  },
  // Ramyeon: the pack's cream soup bowl, red broth, wavy golden noodles.
  ramyeon: {
    pal: { ...PACK, r: '#d8452f', R: '#a8321e', o: '#f07a3a', n: '#f6cf5a', N: '#d8a032' },
    rows: [
      '................', '................',
      '.....aaaaaa.....',
      '...aabbccccaa...',
      '..abRrroorrRca..',
      '.abRnnrnnrnnRca.',
      '.abnrNnrNnrNnca.',
      '.adbRnrrnrrnRba.',
      '.addbcccccccbba.',
      '.abdddbbbbbbbca.',
      '..abddbbbbbbca..',
      '...abbcccccca...',
      '....abbbccca....',
      '.....aaaaaa.....',
      '................', '................',
    ],
  },
  // Dips for mandu: a small cream dish of soy with sesame, and one of chili oil.
  soydip: {
    pal: { ...PACK, s: '#4a2a1a', h: '#7a4a2a', e: '#f4e3c3' },
    rows: [
      '................', '................', '................', '................', '................',
      '....aaaaaaaa....',
      '..aabsssssscaa..',
      '.abshhsesssesca.',
      '.abssesssesssca.',
      '.adbsssssssscba.',
      '..addbcccccbba..',
      '...abbbccccca...',
      '....aaaaaaaa....',
      '................', '................', '................',
    ],
  },
  chilioil: {
    pal: { ...PACK, s: '#c8361e', h: '#f77622', e: '#5a1a10' },
    rows: [
      '................', '................', '................', '................', '................',
      '....aaaaaaaa....',
      '..aabsssssscaa..',
      '.abshhsesssesca.',
      '.abssesssesssca.',
      '.adbsssssssscba.',
      '..addbcccccbba..',
      '...abbbccccca...',
      '....aaaaaaaa....',
      '................', '................', '................',
    ],
  },
});

// Chimaek's treat: a slab of plain beef (no marinade), raw and grilled.
Object.assign(FOOD_ART, {
  plain_raw: {
    pal: { k: OL, r: '#d8475a', R: '#a8323f', w: '#f4d0d0' },
    rows: [
      '................', '................', '................', '................', '................',
      '....kkkkkkkk....',
      '..kkrrwrrrrrkk..',
      '.krrrrrwrrrrrRk.',
      '.krrrrrrwrrrrRk.',
      '.kRrrrrrrrrrRRk.',
      '.kRRRRRRRRRRRRk.',
      '..kkkkkkkkkkkk..',
      '................', '................', '................', '................',
    ],
  },
  plain: {
    pal: { k: OL, r: '#a8683e', R: '#6e3a22', h: '#c88a5a', g: '#3a2229' },
    rows: [
      '................', '................', '................', '................', '................',
      '....kkkkkkkk....',
      '..kkhhhrrrrrkk..',
      '.khrgrrgrrgrrRk.',
      '.krrrgrrgrrgrRk.',
      '.kRrrrrrrrrrRRk.',
      '.kRRRRRRRRRRRRk.',
      '..kkkkkkkkkkkk..',
      '................', '................', '................', '................',
    ],
  },
});

// ---------- part 3: the soup pot ----------
// Tteokguk is drawn on the pack's soup bowl (like ramyeon): milky beef broth,
// white rice cake slices. Raw: a little pile of sliced rice cakes (coins).
// Seaweed (gim) is a topping: a few dark sheets with sesame.
Object.assign(FOOD_ART, {
  tteokguk: {
    pal: { ...PACK, m: '#f4ecd6', M: '#dccfae', w: '#ffffff', s: '#c6b994' },
    rows: [
      '................',
      '................',
      '.....aaaaaa.....',
      '...aabbccccaa...',
      '..abMmmmmmmmMca.',
      '.abMwwmmmwwmMca.',
      '.abmssmwwmssmca.',
      '.abMmmmssmmmMca.',
      '.adbMwwmmmwwbba.',
      '.addbcssccssbba.',
      '..abddbbbbbbca..',
      '...abbcccccca...',
      '....abbbccca....',
      '.....aaaaaa.....',
      '................',
      '................',
    ],
  },
  tteokguk_raw: {
    pal: { k: OL, w: '#fbf6ea', h: '#ffffff', s: '#ddd2bc' },
    rows: [
      '................',
      '................',
      '................',
      '.....kkkk.......',
      '....kwwwhk......',
      '....kwwwsk.kkkk.',
      '.....kkkk.kwwwhk',
      '..kkkk....kwwwsk',
      '.kwwwhk....kkkk.',
      '.kwwwsk.kkkk....',
      '..kkkk.kwwwhk...',
      '.......kwwwsk...',
      '........kkkk....',
      '................',
      '................',
      '................',
    ],
  },
  gim: {
    pal: { k: OL, g: '#1f3a2a', G: '#2f5a3a', s: '#f4e3c3' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.....kkkkkk.....',
      '....kgGgGgGk....',
      '...kGgGsGgGgk...',
      '...kgGgGgGsGk...',
      '...kGgGgGgGgk...',
      '....kgGgGgGk....',
      '.....kkkkkk.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
});

// ---------- small icons that read at the order bubble's size (Nov 13) ----------
// The pack's "dumpling" looked like a garlic bulb at 1x (and like the soy
// garlic sauce), its "mochi" like an onion and its "chicken nuggets" like
// mushrooms, so these are drawn for the game in the pack's style instead:
// mandu as a pleated half-moon, the steamed bun as a dome on its square of
// paper with a red stamp, fried chicken as a golden, crumbed drumstick (the
// pack's raw drumstick shape). Raw dough is still a recolour (sprites.js).
Object.assign(FOOD_ART, {
  mandu: {
    pal: { k: '#4a3220', w: '#f2e8cc', h: '#fffaf0', s: '#d8c494', d: '#b8a06a', p: '#faf3dc' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkpkpkkk....',
      '...kpdpdpdpdk...',
      '..khwdwdwdwdsk..',
      '.khwwwwwwwwwwsk.',
      '.kwhwwwwwwwwssk.',
      'kwwwwwwwwwwwsssk',
      'ksswwwwwwwwssssk',
      '.kssssssssssssk.',
      '..kkkkkkkkkkkk..',
      '................',
      '................',
    ],
  },
  bun: {
    pal: { k: '#42393d', w: '#efeadb', h: '#ffffff', s: '#daca81', c: '#e7daa8', r: '#d8333f', R: '#9e2835', p: '#f8f4ea', P: '#d8d0bc' },
    rows: [
      '................',
      '................',
      '................',
      '......kkkk......',
      '....kkhhwwkk....',
      '...khhwwwwwck...',
      '..khwwwrrwwwck..',
      '..kwwwwrRwwwck..',
      '.khwwwwwwwwwcsk.',
      '.kwwwwwwwwwccsk.',
      '.kcwwwwwwwwcssk.',
      '.kccwwwwwwcsssk.',
      '.kkccccccsssskk.',
      'kPPkkkkkkkkkkPPk',
      '.kkkkkkkkkkkkkk.',
      '................',
    ],
  },
  chicken: {
    pal: { k: '#5a3214', c: '#f4ead2', d: '#cdbb98', y: '#f8cc6a', g: '#e09a3c', G: '#b8692a' },
    rows: [
      '................',
      '...........kkk..',
      '..........kccck.',
      '.........kccdck.',
      '........kkcddk..',
      '.....kkkgkcdk...',
      '...kkygygkkk....',
      '..kyggyggGk.....',
      '..kgygggygGk....',
      '.kyggygggGGk....',
      '.kgygggyggGk....',
      '.kggyggggGGk....',
      '.kGgggygGGk.....',
      '..kGGGGGGk......',
      '...kkkkkk.......',
      '................',
    ],
  },
});

// Every map is 16 x 16 (tests check this) except the fox's mask overlay.
export function mapRows(rows) { return rows.map((r) => r.padEnd(16, '.').slice(0, 16)); }
