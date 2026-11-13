// Menus and overlays: title, story scenes and the story log, the upgrade shop,
// settings, the level intro card, the end-of-night card, and a cast sheet
// (debug). drawFrame() draws whichever screen is up and returns the registry
// of hits, drag sources and drop targets for main.js.
import { W, H, C, R, rbox, text, tw, mix, getCtx } from './gfx.js';
import { LEVELS, STATIONS, UPGRADES, SHOP_FROM_LEVEL, RESET_TEXT, ITEMS } from './data.js';
import { isUnlocked, levelDef, canBuy } from './logic.js';
import { drawItem, drawCustomer, drawShiba, drawPortrait, starIcon, lockIcon, coinIcon, heartIcon } from './sprites.js';
import { SPIRITS, SPIRIT_IDS } from './spirits.js';
import { SCENES, speakerName, afterSceneFor } from './story.js';
import {
  drawGame, drawMarket, drawRain, awningAndCounter, hud, tapMode, SCENE_H, COUNTER_Y, lidArt, kettleArt, inScene, stallFront,
} from './render.js';
import { drawParts } from './fx.js';
import { resetRegistry, clearHits, hit, dim, panel, button, toggle, wrap, withOrigin } from './ui.js';
import { LAY, wideRight, centerBlock, computeLayout } from './layout.js';

// Wooden floor planks over a screen rect (default: everything below y0).
const woodFloor = (y0 = SCENE_H, x0 = 0, w = W) => {
  R(x0, y0, w, H - y0, C.woodDD);
  for (let y = y0 + 10; y < H; y += 12) R(x0, y, w, 1, mix(C.woodDD, C.ink, 0.4));
};
// A whole design screen (180 x 390), or the part top..bottom of it, centred on
// the canvas. `below` keeps it under the HUD.
function centered(fn, top = 0, bottom = 390, below = 0) {
  const { dx, dy } = centerBlock(top, bottom, { x: 0, y: below, w: W, h: H - below });
  withOrigin(dx, dy, fn, [0, 0, 180, 390]);
}
const isWide = () => LAY.mode === 'wide';
export const shopOpen = (save) => (save.stars[SHOP_FROM_LEVEL] || 0) >= 1;

// ---------- title ----------
// Levels come in pages (part 1, part 2); PART tabs, a swipe or the arrow keys
// switch. Each card shows the level, its title, what is new and its stars.
export const TITLE_PAGES = [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13, 99]];
export const titleCard = (k) => ({ x: 6 + (k % 2) * 86, y: SCENE_H + 21 + Math.floor(k / 2) * 41, w: 82, h: 38 });
export function defaultTitlePage(stars) {
  const top = Math.max(...LEVELS.filter((L) => isUnlocked(L.n, stars)).map((L) => L.n));
  return Math.max(0, TITLE_PAGES.findIndex((pg) => pg.includes(top)));
}
export function levelTag(L) {
  if (L.tag) return L.tag;
  if (L.kind === 'mix') return 'MIX + SHOP';
  if (L.kind === 'queue') return '3 GUESTS AT ONCE';
  return `+ ${STATIONS[L.stations[L.stations.length - 1]].name.toUpperCase()}`;
}
// Portrait: the street on top (it gets the extra height), the level cards on
// the wood floor below. Wide: the street on the left, the cards on the right.
export function titleLayout(W, H, mode) {
  if (mode === 'wide') {
    const RW = wideRight(W), LW = W - RW;
    const S = { w: W, h: H, cy: H - 18, d: Math.floor((LW - 180) / 2), sw: LW };
    const floor = { x: LW, y: 14, w: RW, h: H - 14 };
    return { S, floor, cards: centerBlock(SCENE_H, 390, floor) };
  }
  const sh = H - (390 - SCENE_H);
  const S = { w: W, h: sh, cy: sh - 18, d: Math.floor((W - 180) / 2), sw: W };
  const floor = { x: 0, y: sh, w: W, h: H - sh };
  return { S, floor, cards: centerBlock(SCENE_H, 390, floor) };
}
function titleScreen(app) {
  const t = app.time;
  const { S, floor, cards } = titleLayout(W, H, LAY.mode);
  drawMarket(t, { festival: isUnlocked(13, app.save.stars) }, S);
  inScene(() => drawCustomer('lantern', 52, COUNTER_Y + 2, { t }), S);
  awningAndCounter(t, { react: 'wag' }, S);
  // The sign floats in the sky, halfway between the awning and the guest.
  withOrigin(S.d, Math.floor((S.cy - COUNTER_Y) / 2), () => {
    rbox(84, 32, 92, 46, C.ink);
    rbox(84, 30, 92, 46, C.redD);
    R(86, 32, 88, 1, C.red);
    text('CHIMAEK', 130, 36, { font: 'big', scale: 2, align: 'center', color: C.yellow });
    text('NIGHT MARKET', 130, 57, { font: 'big', align: 'center', color: C.cream });
    text('A STALL FOR SPIRITS', 130, 67, { align: 'center', color: C.gold });
    rbox(108, 84, 46, 13, C.ink);
    coinIcon(112, 87);
    text(String(app.save.wallet), 122, 88, { color: C.yellow });
  }, [80, 26, 180, 100]);
  woodFloor(floor.y, floor.x, floor.w);
  withOrigin(cards.dx, cards.dy, () => titleCards(app), [0, SCENE_H, 180, 390]);
}
function titleCards(app) {
  const page = app.titlePage || 0;
  ['PART 1', 'PART 2'].forEach((lab, i) => {
    const on = page === i;
    button(6 + i * 86, SCENE_H + 3, 82, 14, lab, on ? C.redD : C.greyDD, () => app.setTitlePage(i), 'ui', 'small', `part:${i + 1}`);
    if (on) R(10 + i * 86, SCENE_H + 17, 74, 1, C.gold);
  });
  TITLE_PAGES[page].forEach((n, k) => {
    const L = levelDef(n);
    const { x, y, w, h } = titleCard(k);
    const open = isUnlocked(L.n, app.save.stars);
    rbox(x, y + 1, w, h, C.ink);
    if (L.endless) { // endless nights: the best night so far
      rbox(x, y, w, h, open ? C.night2 : C.greyDD, open ? C.gold : C.ink);
      text('ENDLESS', x + 5, y + 5, { color: open ? C.gold : C.greyD, outline: null });
      text(open ? 'NO LAST GUEST' : 'CLEAR LEVEL 13', x + 5, y + 14, { color: open ? C.cream : C.greyD, outline: null });
      if (open) {
        coinIcon(x + 5, y + 22);
        text(app.save.endlessBest ? `BEST ${app.save.endlessBest}` : 'NO BEST YET', x + 15, y + 23, { color: C.yellow, outline: null });
        hit(x, y, w, h, () => app.playLevel(L.n), 'ui', 'level:99');
      } else lockIcon(x + w - 14, y + 4, C.greyD);
      return;
    }
    rbox(x, y, w, h, open ? (L.festival ? '#fbe9b8' : C.cream) : C.greyDD);
    text(`LEVEL ${L.n}`, x + 5, y + 5, { color: open ? C.redD : C.greyD, outline: null });
    text(L.title.toUpperCase(), x + 5, y + 14, { color: open ? C.ink : C.greyD, outline: null });
    text(levelTag(L), x + 5, y + 23, { color: open ? C.greenD : C.greyD, outline: null });
    if (open) {
      const st = app.save.stars[L.n] || 0;
      for (let i = 0; i < 3; i++) starIcon(x + w - 35 + i * 10, y + 3, i < st, 1);
      if (L.rain && !levelTag(L).includes('RAIN')) text('RAIN', x + w - 5, y + 31, { color: C.blue, outline: null, align: 'right' });
      hit(x, y, w, h, () => app.playLevel(L.n), 'ui', `level:${L.n}`);
    } else lockIcon(x + w - 14, y + 4, C.greyD);
  });
  const by = SCENE_H + 21 + 4 * 41;
  button(6, by, 82, 16, 'STORY', C.purple, () => app.openLog(), 'ui', 'small', 'story');
  if (shopOpen(app.save)) button(92, by, 82, 16, 'SHOP', C.greenD, () => app.openShop(null), 'ui', 'small', 'shop');
  else {
    button(92, by, 82, 16, '', C.greyDD, null);
    lockIcon(98, by + 3, C.greyD);
    text(`SHOP: LEVEL ${SHOP_FROM_LEVEL}`, 136, by + 6, { color: C.greyD, align: 'center' });
  }
  text('ART: AROACHIFOUNDONMYPILLOW, KENNEY', 90, 390 - 14, { align: 'center', color: C.grey });
  text('(CC0) AND CODE. SEE CREDITS.MD', 90, 390 - 7, { align: 'center', color: C.grey });
}

// ---------- story scene ----------
const TYPE_RATE = 45; // letters per second
export function lineLength(d) { return d && d.cur ? d.cur.text.length : 0; }
export function lineTyped(app) { return Math.floor(app.dlgT * TYPE_RATE) >= lineLength(app.dlg); }
// The street fills the screen; the dialogue box and its answers sit at the
// bottom, above a short note. The box fits the line on screen and eases
// between sizes, and the counter rides just above it (portrait), so the
// street always fills the rest. Wide screens: the spirit at the counter on the
// left, the box on the right. DLG is where the box is now.
export const DLG = { x: 4, y: 164, w: 172 };
const TEXT_W = DLG.w - 14;
const HEAD_H = 46; // the portrait and name above a spirit's line
export const dlgLineH = (step) => (!step ? 40 : (step.who === 'STORY' ? 8 : HEAD_H) + wrap(step.text, TEXT_W, 'big').length * 10 + 16);
export const CHOICE_H = 18, CHOICE_GAP = 22;
// How much the answers add under the box (0 while there are none).
export const choicesH = (d, typed) => (d && d.choice && typed ? d.choice.length * CHOICE_GAP + 6 : 0);
// Where answer k sits (the playtest taps these).
export function choiceBox(d, k) {
  return { x: DLG.x + 4, y: DLG.y + dlgLineH(d.cur) + 10 + k * CHOICE_GAP, w: DLG.w - 8, h: CHOICE_H };
}
// A speaker who is not a spirit (the cold voice in the night 13 epilogue).
const VOICE = { VOICE: { name: '???', kind: 'A COLD VOICE' } };

// The tallest the box and its answers get in a scene (design px).
const blockCache = new Map();
export function sceneBlockH(sc) {
  if (blockCache.has(sc.id)) return blockCache.get(sc.id);
  let h = 40;
  const walk = (steps) => steps.forEach((st, i) => {
    if (st.choice) {
      let prev = 40; // the line shown with the answers: the one before (or the ones that may be)
      for (let j = i - 1; j >= 0; j--) {
        if (!steps[j].text) continue;
        prev = Math.max(prev, dlgLineH(steps[j]));
        if (!steps[j].if && !steps[j].unless) break;
      }
      h = Math.max(h, prev + st.choice.length * CHOICE_GAP + 6);
      st.choice.forEach((o) => walk(o.reply || []));
    } else if (st.text) h = Math.max(h, dlgLineH(st));
  });
  walk(sc.steps);
  blockCache.set(sc.id, h);
  return h;
}
// Where things go in a story scene: the street S, the dialogue box's top-left
// (box) and the note at the bottom (note: centre x, y). `now` is the box and
// answers' height on screen, `blockH` the scene's tallest (sceneBlockH).
export function sceneLayout(W, H, mode, blockH, now = blockH) {
  if (mode === 'wide') {
    // The spirit, drawn big, at the counter on the left; the box and its
    // answers in the middle of the right column.
    const RW = wideRight(W), LW = W - RW;
    const S = { w: W, h: H, cy: H - 18, d: Math.floor((LW - 180) / 2), sw: LW };
    const scale = Math.max(4, Math.min(7, Math.floor((S.cy - 50) / 16)));
    const top = 36, room = H - 20 - top;
    return { S, scale, board: null, box: { x: LW + Math.floor((RW - DLG.w) / 2), y: top + Math.max(0, Math.floor((room - blockH) / 2)) }, note: { x: LW + Math.floor(RW / 2), y: H - 14 } };
  }
  // Portrait: the box and its answers sit low with the counter riding just
  // above them, the spirit drawn bigger when there is room. The sky gets no
  // more than on the game screen (plus the spirit's extra height); what is left
  // goes to the stall's front at the bottom, with its menu board.
  const cy0 = H - 20 - blockH - 26; // the counter over the scene's tallest box
  const gameCy = computeLayout(W, H, 'portrait').scene.cy;
  const scale = Math.max(4, Math.min(6, Math.floor((Math.min(cy0, gameCy + 32) - 44) / 16)));
  const cyCap = Math.max(140, Math.min(cy0, gameCy + 16 * (scale - 4)));
  let boardH = Math.max(0, H - 20 - (cyCap + 26 + blockH));
  if (boardH < 44) boardH = 0; // too short for the board: the street keeps it
  // With a board the counter stays put (a short line leaves a little more of the
  // stall's front showing); without one it rides just above the box.
  const y = boardH ? cyCap + 26 : Math.max(126, Math.round(H - 20 - now));
  const cy = y - 26;
  const S = { w: W, h: H, cy, d: Math.floor((W - 180) / 2), sw: W };
  // the board sits in the middle of what the box and answers leave free
  const board = boardH ? { top: y + Math.round(now) + 4, h: H - 22 - (y + Math.round(now) + 4) } : null;
  return { S, scale, board, box: { x: Math.floor((W - DLG.w) / 2), y }, note: { x: Math.floor(W / 2), y: H - 14 } };
}
function sceneScreen(app) {
  const d = app.dlg, t = app.time, sc = d.scene;
  const def = levelDef(sc.level);
  const frost = !!sc.frost && d.pc >= (sc.frostAt || 0);
  const want = dlgLineH(d.cur);
  const boxH = Math.round(app.dlgH && Math.abs(app.dlgH - want) > 0.5 ? app.dlgH : want);
  const { S, box, note, scale, board } = sceneLayout(W, H, LAY.mode, sceneBlockH(sc), boxH + Math.round(app.dlgCH || 0));
  DLG.x = box.x; DLG.y = box.y;
  drawMarket(t, { rain: !!def?.rain, festival: !!def?.festival && !sc.after, frost }, S);
  if (sc.spirit) inScene(() => drawCustomer(sc.spirit, 98, COUNTER_Y + 2, { t, scale }), S);
  if (def?.rain) drawRain(t, S);
  awningAndCounter(t, { react: sc.dog || SPIRITS[sc.spirit]?.dog || null, frost }, S, S.h);
  if (board) stallFront(S, { level: def ? sc.level : 13, def: def || {}, time: t }, board);
  rbox(4, 18, 122, 13, C.ink);
  text(`NIGHT ${sc.level}: ${sc.title.toUpperCase()}`, 8, 22, { color: C.gold });
  hit(0, 14, W, H - 14, () => app.dlgTap(), 'dialog');
  // the dialogue box
  const B = { ...DLG, h: boxH };
  rbox(B.x, B.y + 2, B.w, B.h, C.ink);
  rbox(B.x, B.y, B.w, B.h, C.cream);
  R(B.x + 2, B.y + 2, B.w - 4, B.h - 4, C.white);
  const who = d.cur ? d.cur.who : sc.spirit;
  let ty = B.y + 8;
  if (who !== 'STORY') {
    rbox(B.x + 6, B.y + 6, 36, 36, VOICE[who] ? C.greyDD : C.night1);
    if (VOICE[who]) drawVoice(B.x + 8, B.y + 8, t);
    else drawPortrait(who, B.x + 8, B.y + 8, 2, t);
    text(VOICE[who] ? VOICE[who].name : speakerName(who), B.x + 48, B.y + 10, { font: 'big', color: C.redD, outline: null });
    const kind = VOICE[who] ? VOICE[who].kind : SPIRITS[who]?.kind;
    if (kind) text(kind, B.x + 48, B.y + 21, { color: C.greyD, outline: null });
    ty = B.y + HEAD_H;
  }
  if (d.cur) {
    const shown = d.cur.text.slice(0, Math.floor(app.dlgT * TYPE_RATE));
    // Wrap the whole line, then show only the typed part, so words don't jump.
    const rows = wrap(d.cur.text, TEXT_W, 'big');
    let left = shown.length;
    rows.forEach((r, i) => {
      const n = Math.max(0, Math.min(r.length, left));
      left -= r.length + 1;
      if (n > 0) text(r.slice(0, n), B.x + 7, ty + i * 10, { font: 'big', color: who === 'STORY' ? C.purple : C.ink, outline: null });
    });
  }
  if (d.choice && lineTyped(app) && Math.abs((app.dlgCH || 0) - choicesH(d, true)) < 2) {
    rbox(B.x + 3, B.y + B.h + 1, 50, 9, C.ink);
    text('YOUR ANSWER', B.x + 6, B.y + B.h + 3, { color: C.cream });
    d.choice.forEach((opt, k) => {
      const c = choiceBox(d, k);
      button(c.x, c.y, c.w, c.h, opt.text.toUpperCase(), C.blueD, () => app.dlgChoose(k), 'choice', 'small', `choice:${k}`);
      text(String(k + 1), c.x + 5, c.y + 6, { color: C.yellow });
    });
  } else if (lineTyped(app) && Math.floor(t * 2) % 2) {
    text('TAP', B.x + B.w - 22, B.y + B.h - 11, { color: C.greyD, outline: null });
    R(B.x + B.w - 10, B.y + B.h - 10, 5, 1, C.redD); R(B.x + B.w - 9, B.y + B.h - 9, 3, 1, C.redD); R(B.x + B.w - 8, B.y + B.h - 8, 1, 1, C.redD);
  }
  withOrigin(W - 180, 0, () => button(130, 18, 46, 14, d.replay ? 'CLOSE' : 'SKIP', C.steelD, () => app.dlgSkip(), 'skip', 'small', 'skip'), [128, 14, 180, 36]);
  if (!d.replay) {
    const str = 'CHOICES NEVER BLOCK. SKIP ANY TIME.';
    rbox(note.x - Math.ceil(tw(str) / 2) - 4, note.y - 3, tw(str) + 8, 10, C.ink);
    text(str, note.x, note.y, { align: 'center', color: C.grey });
  }
}
// The cold voice: no face, only frost and two pale eyes.
function drawVoice(x, y, t) {
  for (let j = 0; j < 32; j += 2) for (let i = (j / 2) % 2; i < 32; i += 2) R(x + i, y + j, 1, 1, '#8fa4d8');
  const blink = Math.sin(t * 0.7) > 0.95;
  if (!blink) { R(x + 9, y + 13, 3, 2, C.white); R(x + 20, y + 13, 3, 2, C.white); }
}

// ---------- story log ----------
export const LOG_PAGE = 6;
export const logPages = () => Math.ceil(SCENES.length / LOG_PAGE);
// One column of six nights (portrait), or two columns of three (wide).
export function logEntryBox(i, wide) {
  return wide ? { x: 6 + Math.floor(i / 3) * 176, y: 42 + (i % 3) * 44, w: 168, h: 40 } : { x: 6, y: 42 + i * 44, w: 168, h: 40 };
}
function logScreen(app) {
  const st = app.save.story, wide = isWide();
  R(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) R(0, y, W, 1, C.night1);
  // Design block: 180 (or 352) wide; the footer sits under the nights.
  const bw = wide ? 352 : 180, rows = wide ? 3 : LOG_PAGE;
  const fy = 42 + rows * 44 + 6; // the buttons
  const bh = wide ? fy + 70 : 390;
  const dx = Math.floor((W - bw) / 2), dy = Math.max(0, Math.floor((H - bh) / 2));
  withOrigin(dx, dy, () => {
    const cx = bw / 2;
    text('STORY SO FAR', cx, 20, { font: 'big', align: 'center', color: C.gold });
    text('TAP A NIGHT TO READ IT AGAIN', cx, 31, { align: 'center', color: C.grey });
    const page = Math.min(app.logPage || 0, logPages() - 1);
    SCENES.slice(page * LOG_PAGE, (page + 1) * LOG_PAGE).forEach((sc, i) => {
      const { x, y, w, h } = logEntryBox(i, wide);
      const seen = !!st.seen[sc.id];
      rbox(x, y + 1, w, h, C.ink);
      rbox(x, y, w, h, seen ? C.cream : C.greyDD);
      if (!seen) {
        text(`NIGHT ${sc.level}`, x + 6, y + 8, { color: C.greyD, outline: null });
        text('NOT YET', x + 6, y + 18, { font: 'big', color: C.greyD, outline: null });
        lockIcon(x + w - 16, y + 14, C.greyD);
        return;
      }
      rbox(x + 4, y + 4, 32, 32, C.night1);
      const sp = SPIRITS[sc.spirit];
      if (sp) drawPortrait(sc.spirit, x + 4, y + 4, 2, app.time);
      else drawShiba(x + 20, y + 35, { t: app.time, react: 'growl' });
      text(sc.after ? `AFTER NIGHT ${sc.level}` : `NIGHT ${sc.level}: ${sp.name}`, x + 42, y + 6, { color: C.redD, outline: null });
      text(sc.title.toUpperCase(), x + 42, y + 15, { color: C.ink, outline: null });
      if (sp) {
        const got = st.memories[sc.spirit] || 0;
        text(`MEMORIES ${got}/${sp.memories.length}`, x + 42, y + 26, { color: got ? C.purple : C.greyD, outline: null });
      } else text('TO BE CONTINUED', x + 42, y + 26, { color: C.purple, outline: null });
      hit(x, y, w, h, () => app.replayScene(sc.id), 'ui', `scene:${sc.id}`);
    });
    if (logPages() > 1) {
      if (page > 0) button(6, fy, 38, 16, '<', C.blueD, () => app.setLogPage(page - 1), 'ui', 'big', 'logprev');
      if (page < logPages() - 1) button(bw - 44, fy, 38, 16, '>', C.blueD, () => app.setLogPage(page + 1), 'ui', 'big', 'lognext');
      text(`PAGE ${page + 1}/${logPages()}`, cx, fy - 8, { align: 'center', color: C.grey });
    }
    button(cx - 40, fy, 80, 16, 'BACK', C.steelD, () => app.toTitle(), 'ui', 'small', 'back');
    const flags = Object.keys(st.flags).length;
    text(flags ? `CHOICES MADE: ${flags}` : 'NO CHOICES MADE YET', cx, fy + 24, { align: 'center', color: C.grey });
    drawShiba(cx, wide ? fy + 64 : 382, { t: app.time, react: st.flags.bell_known ? 'wag' : null });
  }, [0, 0, 180, 390]);
}

// ---------- shop ----------
const UP_ART = { grill4: 'galbi', tray5: 'kimbap', fastfry: 'chicken', patience: 'lantern', wokfast: 'friedrice' };
// One column of five upgrades (portrait), or two columns (wide).
export function shopCardBox(i, wide) {
  return wide ? { x: 6 + Math.floor(i / 3) * 176, y: 60 + (i % 3) * 46, w: 168, h: 42 } : { x: 6, y: 60 + i * 46, w: 168, h: 42 };
}
function shopScreen(app) {
  const s = app.save, t = app.time, wide = isWide();
  R(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) R(0, y, W, 1, C.night1);
  for (let x = 0; x < W; x += 10) { const c = (x / 10) % 2 ? C.cream : C.green; R(x, 14, 10, 8, c); R(x + 1, 22, 8, 2, c); }
  const bw = wide ? 352 : 180, rows = wide ? 3 : UPGRADES.length;
  const y0 = 60 + rows * 46 + 4;
  const bh = wide ? y0 + 56 : 390;
  const dx = Math.floor((W - bw) / 2), dy = Math.max(0, Math.floor((H - bh) / 2));
  withOrigin(dx, dy, () => {
    const cx = bw / 2;
    text('STALL UPGRADES', cx, 30, { font: 'big', align: 'center', color: C.gold });
    rbox(cx - 26, 41, 52, 13, C.ink);
    coinIcon(cx - 22, 44);
    text(String(s.wallet), cx - 12, 45, { color: C.yellow });
    UPGRADES.forEach((u, i) => {
      const { x, y, w, h } = shopCardBox(i, wide);
      const owned = !!s.upgrades[u.id];
      const can = canBuy({ wallet: s.wallet, upgrades: s.upgrades }, u.id);
      rbox(x, y + 1, w, h, C.ink);
      rbox(x, y, w, h, owned ? mix(C.cream, C.greenL, 0.35) : C.cream);
      rbox(x + 4, y + 4, 34, 34, C.night1);
      if (UP_ART[u.id] === 'lantern') drawPortrait('lantern', x + 5, y + 5, 2, t);
      else if (u.id === 'tray5') { // a little tray with five things on it
        rbox(x + 6, y + 20, 30, 12, C.woodL); R(x + 7, y + 21, 28, 10, C.wood);
        ['soda', 'kimbap', 'toast', 'tea', 'galbi'].forEach((id, k) => drawItem(id, x + 3 + k * 5, y + 10 + (k % 2) * 3));
      } else drawItem(UP_ART[u.id], x + 5, y + 5, { scale: 2 });
      text(u.name, x + 43, y + 6, { color: C.ink, outline: null });
      text(u.desc, x + 43, y + 15, { color: C.greyD, outline: null });
      if (owned) text('OWNED', x + 43, y + 28, { color: C.greenD, outline: null });
      else {
        coinIcon(x + 43, y + 27);
        text(String(u.cost), x + 53, y + 28, { color: can ? C.ink : C.redD, outline: null });
        button(x + w - 46, y + 23, 40, 14, 'BUY', can ? C.greenD : C.greyD, can ? () => app.buy(u.id) : () => app.cantBuy(u.id), 'buy', 'small', `buy:${u.id}`);
      }
    });
    const next = app.shopNext;
    text('COINS FROM EVERY NIGHT GO IN YOUR PURSE', cx, y0, { align: 'center', color: C.grey });
    button(cx - 60, y0 + 12, 120, 18, next ? `ON TO LEVEL ${next}` : 'DONE', C.blueD, () => app.leaveShop(), 'ui', 'big', 'leave');
    if (app.shopMsg && app.time - app.shopMsg.at < 1.6) {
      const m = app.shopMsg.text, w = tw(m, 'big') + 12;
      rbox(cx - w / 2, y0 + 36, w, 15, app.shopMsg.good ? C.greenD : C.redD);
      text(m, cx, y0 + 40, { font: 'big', align: 'center', color: C.white });
    }
  }, [0, 14, 180, 390]);
}

// ---------- settings ----------
// Three volume sliders (music, ambience, sound effects), the tap controls
// switch, mute and resume, and, set apart at the bottom, RESET PROGRESS (it
// asks first). Only its own tap targets are live while it is open.
export const SET_Y = 54;
export const SET_H = 256;
export const RESET_BTN = { x: 34, y: SET_Y + 222, w: 112, h: 16 };
export const SLIDER = { x: 24, w: 132 };
export const SLIDER_ROWS = { music: SET_Y + 32, amb: SET_Y + 62, sfx: SET_Y + 92 };
function slider(key, labelStr, v, y) {
  const { x, w } = SLIDER;
  text(labelStr, x, y, { font: 'big', color: C.ink, outline: null });
  text(`${Math.round(v * 100)}%`, x + w, y + 1, { color: C.greyD, outline: null, align: 'right' });
  const ty = y + 14;
  R(x, ty, w, 4, C.greyDD);
  R(x, ty, Math.round(v * w), 4, C.gold);
  const kx = x + Math.round(v * w) - 3;
  rbox(kx, ty - 4, 7, 12, C.redD);
  R(kx + 2, ty - 2, 3, 1, C.redL);
  hit(x - 10, y - 4, w + 20, 29, () => {}, `slider:${key}`, `slider:${key}`); // main.js reads the track from this rect (10 px in from each side)
}
function settingsPanel(app) {
  clearHits();
  dim();
  hit(0, 0, W, H, () => app.closeSettings(), 'backdrop');
  centered(() => settingsCard(app), SET_Y, SET_Y + SET_H + 2);
  if (app.confirmReset) resetConfirm(app);
}
function settingsCard(app) {
  const x = 10, w = 160, h = SET_H;
  panel(x, SET_Y, w, h);
  hit(x, SET_Y, w, h, () => {}, 'panel'); // taps on the card do not close it
  text('SETTINGS', 90, SET_Y + 8, { font: 'big', align: 'center', color: C.redD, outline: null });
  if (app.g && app.g.phase === 'play' && app.screen === 'game') text('GAME PAUSED', 90, SET_Y + 18, { align: 'center', color: C.greyD, outline: null });
  slider('music', 'MUSIC', app.vol.music, SLIDER_ROWS.music);
  slider('amb', 'AMBIENCE', app.vol.amb, SLIDER_ROWS.amb);
  slider('sfx', 'SOUND EFFECTS', app.vol.sfx, SLIDER_ROWS.sfx);
  const ty = SET_Y + 124;
  R(x + 8, ty - 5, w - 16, 1, C.cream);
  text('TAP CONTROLS', SLIDER.x, ty + 2, { font: 'big', color: C.ink, outline: null });
  toggle(SLIDER.x + SLIDER.w - 24, ty, tapMode(app));
  text(tapMode(app) ? 'TAP A BIN, THEN A STATION' : 'OFF: DRAG FOOD WITH A FINGER', SLIDER.x, ty + 15, { color: C.greyD, outline: null });
  hit(x + 4, ty - 4, w - 8, 28, () => app.toggleTapControls(), 'ui', 'tapcontrols');
  button(SLIDER.x, SET_Y + 156, SLIDER.w, 18, app.muted ? 'SOUND: MUTED' : 'SOUND: ON', app.muted ? C.redD : C.steelD, () => app.toggleMute(), 'ui', 'small', 'sound');
  button(SLIDER.x, SET_Y + 182, SLIDER.w, 18, app.g && app.g.phase === 'play' && app.screen === 'game' ? 'RESUME' : 'DONE', C.greenD, () => app.closeSettings(), 'ui', 'small', 'resume');
  // Danger zone: a gap and a dashed red rule keep it away from RESUME.
  for (let dx = x + 8; dx < x + w - 8; dx += 4) R(dx, SET_Y + 212, 2, 1, C.redL);
  const b = RESET_BTN;
  button(b.x, b.y, b.w, b.h, RESET_TEXT.button, C.red, () => app.askReset(), 'ui', 'small', 'reset');
  text(RESET_TEXT.note, 90, b.y + b.h + 5, { align: 'center', color: C.greyD, outline: null });
}

// Are you sure? KEEP is the big default; a tap outside the card also keeps.
// RESET sits away from where RESET PROGRESS was, so a double tap can't erase.
export const CONFIRM = { x: 16, y: 104, w: 148, h: 150 };
function resetConfirm(app) {
  clearHits();
  dim(0.6);
  hit(0, 0, W, H, () => app.keepProgress(), 'backdrop');
  // Placed as if the settings card were still under it (a tap on RESET
  // PROGRESS can never land on RESET).
  centered(() => confirmCard(app), SET_Y, SET_Y + SET_H + 2);
}
function confirmCard(app) {
  const { x, y, w, h } = CONFIRM;
  panel(x, y, w, h);
  hit(x, y, w, h, () => {}, 'panel');
  R(x + 2, y + 2, w - 4, 3, C.red);
  text(RESET_TEXT.title, 90, y + 11, { font: 'big', align: 'center', color: C.redD, outline: null });
  let ty = y + 26;
  for (const r of wrap(RESET_TEXT.body, w - 20)) { text(r, 90, ty, { align: 'center', color: C.ink, outline: null }); ty += 8; }
  ty += 3;
  text(RESET_TEXT.kept, 90, ty, { align: 'center', color: C.greenD, outline: null });
  text(RESET_TEXT.undo, 90, ty + 9, { align: 'center', color: C.redD, outline: null });
  button(x + 12, y + 84, w - 24, 22, RESET_TEXT.keep, C.greenD, () => app.keepProgress(), 'ui', 'big', 'keep');
  button(x + 34, y + 120, w - 68, 16, RESET_TEXT.reset, C.red, () => app.resetProgress(), 'ui', 'small', 'confirmreset');
}

// ---------- level intro card ----------
function introPreview(app, g) {
  const t = app.time, def = g.def, it = def.intro;
  if (def.endless) { // every station's dish, bobbing
    ['soda', 'galbi', 'chicken', 'japchae', 'mandu', 'ramyeon'].forEach((id, i) => drawItem(id, 24 + (i % 3) * 46, 104 + Math.floor(i / 3) * 22 - Math.round(Math.abs(Math.sin(t * 2 + i)) * 3), { scale: 2 }));
    return;
  }
  if (def.preview === 'treat') { // Chimaek, plain beef, hearts
    drawShiba(70, 148, { t, react: 'wag', mood: Math.floor(t) % 2 ? 'happy' : 'wait' });
    drawItem('plain', 96, 116, { scale: 2 });
    for (let i = 0; i < 3; i++) heartIcon(52 + i * 12, 108 - Math.round(((t * 0.8 + i * 0.3) % 1) * 6), C.red);
    return;
  }
  if (def.preview === 'special') { // the specials board and the double-pay dish
    rbox(36, 108, 108, 12, '#2c4a34', C.ink);
    text('SPECIAL RAMYEON X2', 90, 111, { color: C.cream, align: 'center', outline: null });
    drawItem('ramyeon', 74, 122 - Math.round(Math.abs(Math.sin(t * 3)) * 3), { scale: 2, sauce: 'egg' });
    text('X2', 106, 140, { font: 'big', color: C.yellow });
    return;
  }
  if (def.kind === 'festival') {
    for (let i = 0; i < 6; i++) { const x = 30 + i * 24; R(x, 104, 6, 8, C.red); R(x + 1, 105, 4, 1, C.gold); R(x + 1, 110, 4, 1, C.gold); }
    ['lantern', 'rabbit', 'fox'].forEach((l, i) => drawCustomer(l, 46 + i * 44, 146, { t, scale: 2 }));
    rbox(78, 108, 24, 9, C.gold); text('VIP', 90, 110, { color: C.ink, outline: null, align: 'center' });
    return;
  }
  if (def.kind === 'queue' || (def.kind === 'mix' && def.queue > 1)) {
    const cast = def.kind === 'queue' ? ['moth', 'crane', 'fox'] : [def.guest || 'wisp', def.n >= 10 ? 'clay' : 'wisp', 'moss'];
    cast.forEach((l, i) => drawCustomer(l, 46 + i * 44, 146, { t, scale: 2 }));
    return;
  }
  if (it.station === 'steamer') {
    const hop = Math.round(Math.abs(Math.sin(t * 2)) * 4);
    drawItem('mandu', 24, 116, { scale: 2, sauce: 'soydip' }); drawItem('bun', 124, 116, { scale: 2 });
    lidArt(58, 120 - hop, 62);
    R(64, 130, 52, 12, C.ink); R(65, 131, 50, 10, '#c9a46a');
    for (let i = 0; i < 4; i++) { const k = (t * 0.8 + i * 0.25) % 1; R(70 + i * 12, 116 - hop - Math.round(k * 12), 2, 2, mix('#d8d8e8', C.woodDD, k)); }
    return;
  }
  if (it.station === 'pot') {
    drawItem('ramyeon_raw', 30, 114, { scale: 2 }); drawItem('ramyeon', 112, 114, { scale: 2, sauce: 'egg' });
    kettleArt(76, 118);
    for (let i = 0; i < 5; i++) R(70 + ((i * 13 + Math.floor(t * 8) * 5) % 40), 146 - (Math.floor(t * 6 + i) % 3), 2, 2, C.white);
    return;
  }
  if (def.kind === 'mix') {
    ['galbi', 'chicken', 'japchae', 'soda'].forEach((id, i) => drawItem(id, 26 + i * 33, 112, { scale: 2 }));
    return;
  }
  if (it.station === 'counter') { drawItem('soda', 30, 112, { scale: 2 }); drawItem('kimbap', 74, 112, { scale: 2 }); drawItem('toast', 118, 112, { scale: 2 }); }
  else if (it.station === 'grill') {
    const p = (Math.sin(t * 0.8) * 0.5 + 0.5) * 1.35;
    drawItem('galbi', 36, 110, { up: p, down: p, scale: 2 }); drawItem('sausage', 92, 110, { up: p * 0.8, down: p * 0.8, scale: 2 });
    for (let x = 26; x < 154; x += 4) R(x, 148, 3, 4, mix(C.redD, C.orange, Math.sin(t * 5 + x) * 0.5 + 0.5));
  } else if (it.station === 'fryer') {
    drawItem('chicken', 40, 110, { p: 1, scale: 2, sauce: 'yangnyeom' }); drawItem('beer', 92, 110, { scale: 2 });
  } else {
    const hop = Math.round(Math.abs(Math.sin(t * 3)) * 8);
    drawItem('tteokbokki', 30, 112, { scale: 2 }); drawItem('japchae', 74, 112 - hop, { scale: 2 }); drawItem('friedrice', 118, 112, { scale: 2, sauce: 'egg' });
    for (let x = 26; x < 154; x += 4) R(x, 148, 3, 4, mix(C.blueD, C.teal, Math.sin(t * 7 + x) * 0.5 + 0.5));
  }
}
function introCard(app) {
  clearHits();
  dim();
  hit(0, 0, W, H, () => app.startLevel(), 'overlay', 'start');
  const ph = introHeight(app);
  const oy = Math.round((390 - ph) / 2) - 70;
  centered(() => introBody(app, ph, oy), 70 + oy, 72 + oy + ph, 14);
}
const introRows = (app) => app.g.def.intro[tapMode(app) ? 'tap' : 'drag'].map((l) => wrap(l.toUpperCase(), 136));
export const introHeight = (app) => 137 + introRows(app).reduce((a, r) => a + r.length * 8 + 4, 0);
function introBody(app, ph, oy) {
  const g = app.g, t = app.time, it = g.def.intro;
  const rowsAll = introRows(app);
  panel(10, 70 + oy, 160, ph);
  text(g.endless ? 'NO STARS, NO LAST GUEST' : `LEVEL ${g.level}`, 90, 78 + oy, { align: 'center', color: C.redD, outline: null });
  text(g.def.title.toUpperCase(), 90, 86 + oy, { font: 'big', align: 'center', color: C.ink, outline: null });
  rbox(20, 100 + oy, 140, 70, g.def.rain || g.def.festival ? C.night1 : C.woodDD);
  if (g.def.rain) for (let i = 0; i < 18; i++) R(24 + ((i * 37) % 132), 102 + oy + ((i * 23 + Math.floor(t * 60)) % 60), 1, 3, '#5f74b0');
  withOffset(oy, () => introPreview(app, g)); // drawn at its own y, moved with the card
  text(it.heading, 90, 156 + oy, { align: 'center', color: C.gold });
  let y = 178 + oy;
  for (const rows of rowsAll) {
    R(16, y + 1, 3, 3, C.red);
    for (const r of rows) { text(r, 23, y, { color: C.ink, outline: null }); y += 8; }
    y += 4;
  }
  button(40, y + 4, 100, 16, 'TAP TO START', Math.floor(t * 2) % 2 ? C.greenD : C.green, null);
}
function withOffset(dy, fn) {
  const ctx = getCtx();
  ctx.save();
  ctx.translate(0, dy);
  fn();
  ctx.restore();
}

// ---------- end of the night ----------
export function nextNote(next) {
  if (next.kind === 'station') return `NEXT UP: THE ${STATIONS[next.stations[next.stations.length - 1]].name.toUpperCase()}`;
  if (next.kind === 'festival') return 'NEXT UP: THE LANTERN FESTIVAL';
  if (next.kind === 'queue') return 'NEXT UP: A LONG LINE';
  return next.queue > 1 ? 'NEXT UP: A BUSY LINE' : 'NEXT UP: EVERY STATION AT ONCE';
}
// Endless nights end with a score instead of stars.
function endlessEnd(app) {
  centered(() => endlessCard(app), 52, 326, 14);
}
function endlessCard(app) {
  const g = app.g;
  panel(12, 52, 156, 272);
  text('NIGHT OVER', 90, 62, { font: 'big', align: 'center', color: C.redD, outline: null });
  text('ENDLESS NIGHTS', 90, 74, { align: 'center', color: C.greyD, outline: null });
  const best = app.newBest;
  rbox(40, 86, 100, 34, best ? C.gold : C.cream);
  coinIcon(52, 99);
  text(String(g.coins), 98, 97, { font: 'big', scale: 2, align: 'center', color: C.ink, outline: null });
  if (best) text('NEW BEST!', 90, 124, { align: 'center', color: C.greenD, outline: null });
  const mixups = g.results.filter((r) => !r.walked && r.mood !== 'happy').length;
  const rows = [
    ['GUESTS SERVED', String(g.served)],
    ['HAPPY', String(g.served - mixups)],
    ['WALKED OUT', `${g.lost} / ${g.def.strikes}`],
    ['TONIGHT SPECIAL', ITEMS[g.special].short],
    ['BEST NIGHT', String(app.save.endlessBest)],
    ['PURSE', `+${app.lastPay || 0} = ${app.save.wallet}`],
  ];
  rows.forEach(([a, b], i) => {
    const y = 136 + i * 11;
    text(a, 26, y, { color: C.ink, outline: null });
    text(b, 154, y, { color: C.ink, outline: null, align: 'right' });
    R(26, y + 8, 128, 1, C.cream);
  });
  drawShiba(90, 270, { big: true, scale: 3, mood: best ? 'happy' : 'wait', t: app.time });
  button(22, 280, 64, 18, 'AGAIN', C.blueD, () => app.newLevel(g.level), 'ui', 'small', 'again');
  button(94, 280, 64, 18, 'MENU', C.greenD, () => app.toTitle(), 'ui', 'small', 'menu');
  text('EVERY NIGHT IS DIFFERENT', 90, 304, { align: 'center', color: C.greyD, outline: null });
}
function endScreen(app) {
  clearHits();
  dim();
  if (app.g.endless) return endlessEnd(app);
  centered(() => endCard(app), 52, 326, 14);
}
function endCard(app) {
  const g = app.g, t = app.time - (app.endAt || 0);
  panel(12, 52, 156, 272);
  const ok = g.stars > 0;
  text(ok ? 'STALL CLOSED!' : 'TOUGH NIGHT...', 90, 62, { font: 'big', align: 'center', color: ok ? C.greenD : C.redD, outline: null });
  text(`LEVEL ${g.level}: ${g.def.title.toUpperCase()}`, 90, 74, { align: 'center', color: C.greyD, outline: null });
  for (let i = 0; i < 3; i++) {
    const shown = t > 0.4 + i * 0.35;
    const pop = shown && t < 0.55 + i * 0.35 ? -3 : 0;
    starIcon(26 + i * 44, 88 + (i === 1 ? -4 : 0) + pop, shown && i < g.stars, 4);
  }
  const tips = g.results.reduce((s, r) => s + (r.tip || 0), 0);
  const mixups = g.results.filter((r) => !r.walked && r.mood !== 'happy').length;
  const rows = [
    ['COINS', `${g.coins} / ${g.max}`],
    ['SERVED', `${g.served - mixups} HAPPY`],
    ['MIX-UPS', String(mixups)],
    ['WALKED OUT', String(g.lost)],
    ['TIPS', String(tips)],
    ['PURSE', `+${app.lastPay || 0} = ${app.save.wallet}`],
  ];
  rows.forEach(([a, b], i) => {
    const y = 136 + i * 11;
    text(a, 26, y, { color: C.ink, outline: null });
    text(b, 154, y, { color: C.ink, outline: null, align: 'right' });
    R(26, y + 8, 128, 1, C.cream);
  });
  const mem = [...(app.nightMemories || [])];
  const memRows = mem.length ? wrap(mem.map((id) => SPIRITS[id].name).join(', '), 140) : [];
  if (mem.length) {
    text('NEW MEMORIES', 90, 205, { align: 'center', color: C.purple, outline: null });
    memRows.slice(0, 2).forEach((r, i) => text(r, 90, 213 + i * 8, { align: 'center', color: C.ink, outline: null }));
  }
  drawShiba(90, 270, { big: true, scale: memRows.length > 1 ? 2 : 3, mood: ok ? 'happy' : 'wait', t: app.time });
  const next = levelDef(g.level + 1);
  const shopNext = ok && g.level >= SHOP_FROM_LEVEL;
  const after = afterSceneFor(g.level);
  const epilogue = ok && after && !app.save.story.seen[after.id];
  button(22, 280, 64, 18, 'RETRY', C.blueD, () => app.newLevel(g.level), 'ui', 'small', 'retry');
  if (epilogue) button(94, 280, 64, 18, 'GO ON', Math.floor(app.time * 2) % 2 ? C.purple : C.redD, () => app.playAfter(after), 'ui', 'small', 'next');
  else if (ok && next) button(94, 280, 64, 18, shopNext ? 'SHOP' : 'NEXT', C.greenD, () => app.endNext(), 'ui', 'small', 'next');
  else if (shopNext) button(94, 280, 64, 18, 'SHOP', C.greenD, () => app.openShop(null), 'ui', 'small', 'next');
  else button(94, 280, 64, 18, 'MENU', ok ? C.greenD : C.steelD, () => app.toTitle(), 'ui', 'small', 'menu');
  let note = 'NEED 1 STAR TO OPEN THE NEXT LEVEL';
  if (ok && next && shopNext) note = `UPGRADES, THEN LEVEL ${next.n}`;
  else if (ok && next) note = nextNote(next);
  else if (epilogue) note = 'THE BELL IS RINGING AGAIN...';
  else if (ok) note = 'MORE NIGHTS COMING IN PART 3';
  text(note, 90, 304, { align: 'center', color: ok ? C.redD : C.greyD, outline: null });
}

// ---------- cast sheet (debug: ?shot=cast) ----------
function castScreen(app) {
  R(0, 0, W, H, C.night2);
  centered(() => castSheet(app));
}
function castSheet(app) {
  const t = app.time;
  const cast = [...SPIRIT_IDS, 'shiba', 0, 3];
  cast.forEach((look, i) => {
    const cx = 31 + (i % 3) * 59, y = 62 + Math.floor(i / 3) * 62;
    R(cx - 28, y - 46, 56, 56, (i + Math.floor(i / 3)) % 2 ? C.night1 : C.night3);
    drawCustomer(look, cx, y, { t, scale: 2 });
    const name = SPIRITS[look] ? SPIRITS[look].name : look === 'shiba' ? 'CHIMAEK' : 'PERSON';
    text(name, cx, y + 1, { align: 'center', color: C.gold });
  });
}

// ---------- frame ----------
export function drawFrame(app) {
  const reg = resetRegistry();
  if (app.screen === 'title') { titleScreen(app); hud(app); }
  else if (app.screen === 'scene') { sceneScreen(app); hud(app); }
  else if (app.screen === 'log') { logScreen(app); hud(app); }
  else if (app.screen === 'shop') { shopScreen(app); hud(app); }
  else if (app.screen === 'cast') castScreen(app);
  else if (app.g) {
    drawGame(app, reg);
    if (app.g.phase === 'intro') { introCard(app); hud(app); }
    if (app.g.phase === 'end') { endScreen(app); hud(app); }
    drawParts(app.fx, 'top');
  }
  if (app.settings) settingsPanel(app);
  return reg;
}
