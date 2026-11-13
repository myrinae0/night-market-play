// Menus and overlays: title, story scenes and the story log, the upgrade shop,
// settings, the level intro card, the end-of-night card, and a cast sheet
// (debug). drawFrame() draws whichever screen is up and returns the registry
// of hits, drag sources and drop targets for main.js.
import { W, H, C, R, rbox, text, tw, mix, getCtx } from './gfx.js';
import { LEVELS, STATIONS, UPGRADES, SHOP_FROM_LEVEL, RESET_TEXT, ITEMS, COOK, COOK_TEXT, STATION_KIND, WINTER_ENDLESS } from './data.js';
import { isUnlocked, levelDef, canBuy, upgradeOpen } from './logic.js';
import { drawItem, drawCustomer, drawShiba, drawPortrait, starIcon, lockIcon, coinIcon, heartIcon } from './sprites.js';
import { SPIRITS, SPIRIT_IDS } from './spirits.js';
import { SCENES, speakerName, afterSceneFor, ENDINGS, ENDING_IDS } from './story.js';
import { goalDef, BADGES, badgeById } from './goals.js';
import {
  drawGame, drawMarket, drawRain, awningAndCounter, hud, tapMode, SCENE_H, COUNTER_Y, lidArt, kettleArt, inScene, stallFront, ladleArt,
  marketLanterns, festivalLanterns, LANTERN_BOX,
} from './render.js';
import { drawParts } from './fx.js';
import { resetRegistry, clearHits, hit, dim, panel, button, toggle, wrap, withOrigin, meter, meterLegend, ZONE, stateIcon } from './ui.js';
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
// Levels come in pages (parts 1, 2 and 3); PART tabs, a swipe or the arrow
// keys switch. Each card shows the level, its title, what is new and its
// stars. Part 3 ends with both endless cards: endless nights and winter nights.
export const TITLE_PAGES = [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13, 99], [14, 15, 16, 17, 18, 19, 99, 98]];
export const titleCard = (k, pitch = 41) => ({ x: 6 + (k % 2) * 86, y: SCENE_H + 21 + Math.floor(k / 2) * pitch, w: 82, h: 38 });
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
// Portrait: the street on top, the level cards on the wood floor below. The
// street gets no more extra height than on the game screen; the floor takes
// the rest, spacing the card rows out. Wide: the street on the left with the
// counter a little below the middle and the stall's menu board under it, the
// cards on the right.
export function titleLayout(W, H, mode) {
  if (mode === 'wide') {
    const RW = wideRight(W), LW = W - RW;
    const cy = Math.min(H - 18, 14 + Math.max(126, Math.round((H - 14) * 0.52)));
    const S = { w: LW, h: H, cy, d: Math.floor((LW - 180) / 2), sw: LW };
    const floor = { x: LW, y: 14, w: RW, h: H - 14 };
    const pitch = 41 + Math.max(0, Math.min(12, Math.floor((floor.h - 232) / 8)));
    return { S, floor, pitch, cards: centerBlock(SCENE_H, 390 + 4 * (pitch - 41), floor), board: { top: cy + 18, h: H - cy - 18 } };
  }
  const sh = computeLayout(W, H, 'portrait').scene.cy + 18;
  const S = { w: W, h: sh, cy: sh - 18, d: Math.floor((W - 180) / 2), sw: W };
  const floor = { x: 0, y: sh, w: W, h: H - sh };
  const pitch = 41 + Math.max(0, Math.min(12, Math.floor((floor.h - 232) / 5)));
  return { S, floor, pitch, cards: centerBlock(SCENE_H, 390 + 4 * (pitch - 41), floor), board: null };
}
// The title's sky, in screen coordinates of the street S: the sign floats top
// right (a little lower when the sky is taller), the purse under it, and the
// daily goals board hangs from the sign, right of the guest and above the
// counter. The paper lanterns keep only the places clear of all of them and
// the guest, so nothing covers a lantern on any screen (tests/batch18).
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export function titleSky(S, goals = 3) {
  const dy = S.cy - COUNTER_Y, hang = Math.floor(dy / 2), d = S.d;
  const sign = { x: d + 84, y: 30 + hang, w: 92, h: 48 };
  const purse = { x: d + 108, y: 84 + hang, w: 46, h: 14 };
  const bh = 13 + Math.max(1, goals) * 7; // the board and its shadow
  const room = COUNTER_Y + dy - 2 - (purse.y + purse.h);
  const board = { x: d + 84, y: purse.y + purse.h + Math.max(2, Math.floor((room - bh) / 2)), w: 92, h: bh };
  const guest = { x: d + 20, y: 72 + dy, w: 64, h: 70 }; // Deung, floating at the counter
  // The festival's full moon (15 x 17) moves left of the sign if the sign would cover it.
  const moonAt = (x) => ({ x, y: 29, w: 15, h: 17 });
  let moon = moonAt(S.w - 40);
  if (overlaps(moon, sign)) moon = moonAt(sign.x - 22);
  const clear = [sign, purse, board, guest, moon];
  const free = (list) => list.filter(([x, y]) => !clear.some((r) => overlaps(LANTERN_BOX(x, y), r)));
  return { sign, purse, board, guest, moon, lanterns: free(marketLanterns(S.w)), festLanterns: free(festivalLanterns(S.w)) };
}
function titleScreen(app) {
  const t = app.time;
  const { S, floor, cards, pitch, board } = titleLayout(W, H, LAY.mode);
  const goals = ((app.save.goals && app.save.goals.list) || []).length;
  const sky = titleSky(S, goals);
  drawMarket(t, { festival: isUnlocked(13, app.save.stars) && app.titlePage !== 2, frost: app.titlePage === 2, lanterns: sky.lanterns, festLanterns: sky.festLanterns, moonX: sky.moon.x }, S);
  inScene(() => drawCustomer('lantern', 52, COUNTER_Y + 2, { t }), S);
  awningAndCounter(t, { react: 'wag', frost: app.titlePage === 2 }, S, LAY.mode === 'wide' ? S.h : S.cy + 18);
  if (board) { // tonight's menu: the newest night you can play
    const n = Math.max(...LEVELS.filter((L) => isUnlocked(L.n, app.save.stars)).map((L) => L.n));
    stallFront(S, { level: n, def: levelDef(n), time: t }, board);
  }
  // The sign floats in the sky, the purse under it.
  withOrigin(sky.sign.x - 84, sky.sign.y - 30, () => {
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
  // The daily goals hang from the sign, right of the guest (tap: goals and badges).
  const b = sky.board;
  withOrigin(b.x - 84, b.y - 100, () => goalsBoard(app, 84, 100, 92, b.y - (sky.sign.y + 46) - 2), [84, 98, 180, 140]);
  woodFloor(floor.y, floor.x, floor.w);
  if (LAY.mode === 'wide') { R(floor.x - 3, 14, 3, H - 14, C.woodD); R(floor.x - 2, 14, 1, H - 14, C.wood); R(floor.x - 4, 14, 1, H - 14, C.ink); }
  withOrigin(cards.dx, cards.dy, () => titleCards(app, pitch), [0, SCENE_H, 180, 390 + 4 * (pitch - 41)]);
}
function titleCards(app, pitch = 41) {
  const page = app.titlePage || 0;
  ['PART 1', 'PART 2', 'PART 3'].forEach((lab, i) => {
    const on = page === i;
    button(6 + i * 58, SCENE_H + 3, 54, 14, lab, on ? (i === 2 ? C.blueD : C.redD) : C.greyDD, () => app.setTitlePage(i), 'ui', 'small', `part:${i + 1}`);
    if (on) R(10 + i * 58, SCENE_H + 17, 46, 1, i === 2 ? ZONE.cold : C.gold);
  });
  TITLE_PAGES[page].forEach((n, k) => {
    const L = levelDef(n);
    const c = titleCard(k, pitch), { x, w, h } = c;
    const y = c.y + Math.floor(((4 - Math.ceil(TITLE_PAGES[page].length / 2)) * pitch) / 2); // fewer rows: centred in the four rows' space
    const open = isUnlocked(L.n, app.save.stars);
    rbox(x, y + 1, w, h, C.ink);
    if (L.endless) { // endless nights (and winter nights): the best night so far
      const winter = !!L.winter, best = winter ? app.save.winterBest : app.save.endlessBest;
      rbox(x, y, w, h, open ? (winter ? '#1c3156' : C.night2) : C.greyDD, open ? (winter ? ZONE.cold : C.gold) : C.ink);
      text(winter ? 'WINTER NIGHTS' : 'ENDLESS', x + 5, y + 5, { color: open ? (winter ? ZONE.cold : C.gold) : C.greyD, outline: null });
      text(open ? (winter ? 'SOUP POT, NO END' : 'NO LAST GUEST') : `CLEAR LEVEL ${L.opensAfter}`, x + 5, y + 14, { color: open ? C.cream : C.greyD, outline: null });
      if (open) {
        coinIcon(x + 5, y + 22);
        text(best ? `BEST ${best}` : 'NO BEST YET', x + 15, y + 23, { color: C.yellow, outline: null });
        hit(x, y, w, h, () => app.playLevel(L.n), 'ui', `level:${L.n}`);
      } else lockIcon(x + w - 14, y + 4, C.greyD);
      return;
    }
    rbox(x, y, w, h, open ? (L.festival ? '#fbe9b8' : L.winter ? '#e4f2fb' : C.cream) : C.greyDD);
    text(`LEVEL ${L.n}`, x + 5, y + 5, { color: open ? C.redD : C.greyD, outline: null });
    text(L.title.toUpperCase(), x + 5, y + 14, { color: open ? C.ink : C.greyD, outline: null });
    text(levelTag(L), x + 5, y + 23, { color: open ? C.greenD : C.greyD, outline: null });
    if (open) {
      const st = app.save.stars[L.n] || 0;
      for (let i = 0; i < 3; i++) starIcon(x + w - 35 + i * 10, y + 3, i < st, 1);
      if (L.rain && !levelTag(L).includes('RAIN') && !L.winter) text('RAIN', x + w - 5, y + 31, { color: C.blue, outline: null, align: 'right' });
      if (L.winter && !L.rain) text('SNOW', x + w - 5, y + 31, { color: C.blue, outline: null, align: 'right' });
      hit(x, y, w, h, () => app.playLevel(L.n), 'ui', `level:${L.n}`);
    } else lockIcon(x + w - 14, y + 4, C.greyD);
  });
  const by = SCENE_H + 21 + 4 * pitch;
  button(6, by, 54, 16, 'STORY', C.purple, () => app.openLog(), 'ui', 'small', 'story');
  const nb = Object.keys(app.save.badges || {}).length;
  button(63, by, 54, 16, `BADGES ${nb}/${BADGES.length}`, C.blueD, () => app.openBadges(), 'ui', 'small', 'badges');
  if (shopOpen(app.save)) button(120, by, 54, 16, 'SHOP', C.greenD, () => app.openShop(null), 'ui', 'small', 'shop');
  else {
    button(120, by, 54, 16, '', C.greyDD, null);
    lockIcon(124, by + 3, C.greyD);
    text(`LEVEL ${SHOP_FROM_LEVEL}`, 152, by + 6, { color: C.greyD, align: 'center' });
  }
  text('ART: AROACHIFOUNDONMYPILLOW, KENNEY', 90, by + 33, { align: 'center', color: C.grey });
  text('(CC0) AND CODE. SEE CREDITS.MD', 90, by + 40, { align: 'center', color: C.grey });
}

// ---------- daily goals ----------
// A tick box: done (green tick), or empty.
function tickBox(x, y, done) {
  R(x, y, 5, 5, C.ink);
  R(x + 1, y + 1, 3, 3, done ? C.greenL : C.cream);
  if (done) { R(x + 1, y + 2, 1, 1, C.greenD); R(x + 2, y + 3, 1, 1, C.greenD); R(x + 3, y + 1, 1, 2, C.greenD); }
}
// The title's goals board: a small wooden sign hung from the awning, one line
// per goal (label and progress, or its coins once done). Tap: goals and badges.
export function goalsBoard(app, x, y, w, hang = 0) {
  const list = (app.save.goals && app.save.goals.list) || [];
  const h = 12 + Math.max(1, list.length) * 7;
  R(x + 8, y - 2 - hang, 1, 3 + hang, C.greyD); R(x + w - 9, y - 2 - hang, 1, 3 + hang, C.greyD); // the strings, up to the awning
  rbox(x, y + 1, w, h, C.ink);
  rbox(x, y, w, h, C.woodD);
  R(x + 1, y + 1, w - 2, 1, C.wood);
  text('DAILY GOALS', x + w / 2, y + 3, { color: C.gold, align: 'center', outline: null });
  if (!list.length) text('NONE YET', x + w / 2, y + 11, { color: C.cream, align: 'center', outline: null });
  list.forEach((g, i) => {
    const d = goalDef(g.id), ly = y + 11 + i * 7;
    tickBox(x + 3, ly - 1, g.done);
    text(d.label, x + 10, ly, { color: g.done ? C.greenL : C.cream, outline: null });
    text(g.done ? `+${d.reward}` : `${g.got}/${d.n}`, x + w - 3, ly, { color: g.done ? C.greenL : C.yellow, outline: null, align: 'right' });
  });
  hit(x, y - 2, w, h + 2, () => app.openBadges(), 'ui', 'goals');
}
// The goals on the end card: label, progress and coins; the ones finished
// tonight say so.
function goalRows(app, x, y, w) {
  const list = (app.save.goals && app.save.goals.list) || [];
  const tonight = (app.night && app.night.done) || [];
  const coins = (app.night && app.night.goalCoins) || 0;
  text('DAILY GOALS', x, y, { color: C.purple, outline: null });
  if (coins) text(`TONIGHT +${coins}`, x + w, y, { color: C.greenD, outline: null, align: 'right' });
  list.forEach((g, i) => {
    const d = goalDef(g.id), ly = y + 9 + i * 8;
    tickBox(x, ly - 1, g.done);
    text(d.label, x + 8, ly, { color: g.done ? C.greenD : C.ink, outline: null });
    text(`${g.got}/${d.n}`, x + w - 22, ly, { color: C.greyD, outline: null, align: 'right' });
    text(`+${d.reward}`, x + w, ly, { color: tonight.includes(g.id) ? C.greenD : C.greyD, outline: null, align: 'right' });
  });
}

// ---------- goals and badges screen ----------
// The three goals (what each asks, progress bars, coins) and the badges in two
// columns; tap a badge to read what it is for. Portrait: goals on top, badges
// below. Wide: goals on the left, badges on the right.
// Twenty badges to a page (ten rows of two).
export const BADGE_PAGE = 20;
export const badgePages = () => Math.ceil(BADGES.length / BADGE_PAGE);
export const badgeBox = (i, wide) => (wide ? { x: 180 + (i % 2) * 86, y: 44 + Math.floor(i / 2) * 20, w: 84, h: 19 } : { x: 6 + (i % 2) * 86, y: 136 + Math.floor(i / 2) * 20, w: 84, h: 19 });
function badgeIcon(b, x, y, t) { // 16 x 16
  const ic = b.icon;
  if (ic === 'star') starIcon(x + 3, y + 3, true, 1);
  else if (ic === 'heart') heartIcon(x + 4, y + 5, C.red);
  else if (ic === 'coin') { coinIcon(x + 2, y + 3); coinIcon(x + 7, y + 6); }
  else if (ic === 'dog') drawPortrait('shiba', x, y, 1, t);
  else if (ic === 'lantern') drawPortrait('lantern', x, y, 1, t);
  else if (ic === 'infinity') { for (const [dx, dy] of [[0, 1], [1, 0], [2, 0], [3, 1], [4, 2], [5, 2], [6, 1], [7, 0], [8, 0], [9, 1], [8, 2], [7, 2], [2, 2], [1, 2]]) R(x + 3 + dx, y + 6 + dy, 1, 1, C.gold); }
  else if (ic === 'ice') drawPortrait('ice', x, y, 1, t);
  else if (ic === 'snow') { const c = ZONE.cold; R(x + 7, y + 2, 2, 12, c); R(x + 2, y + 7, 12, 2, c); for (let k = 0; k < 4; k++) { R(x + 3 + k, y + 3 + k, 2, 2, c); R(x + 11 - k, y + 3 + k, 2, 2, c); } R(x + 7, y + 7, 2, 2, C.white); }
  else if (ic === 'flower') { for (const [dx, dy] of [[5, 2], [9, 5], [7, 10], [3, 10], [1, 5]]) { R(x + dx + 1, y + dy, 4, 4, C.pink); R(x + dx + 2, y + dy + 1, 2, 2, C.white); } R(x + 6, y + 6, 4, 4, C.yellow); }
  else if (ic === 'bell') { R(x + 7, y + 2, 2, 1, C.ink); R(x + 5, y + 3, 6, 1, C.ink); R(x + 4, y + 4, 8, 7, C.ink); R(x + 5, y + 4, 6, 6, C.gold); R(x + 6, y + 4, 2, 4, C.yellow); R(x + 3, y + 11, 10, 2, C.ink); R(x + 4, y + 11, 8, 1, C.orange); R(x + 7, y + 13, 2, 2, C.ink); }
  else drawItem(ic, x, y);
}
function badgesScreen(app) {
  const s = app.save, t = app.time, wide = isWide();
  R(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) R(0, y, W, 1, C.night1);
  const bw = wide ? 352 : 180, bh = wide ? 300 : 390;
  const dx = Math.floor((W - bw) / 2), dy = Math.max(0, Math.floor((H - bh) / 2));
  withOrigin(dx, dy, () => {
    // goals
    const gx = 6, gw = 168;
    text('DAILY GOALS', gx + gw / 2, 20, { font: 'big', align: 'center', color: C.gold });
    text('NEW ONES COME WITH EACH NIGHT', gx + gw / 2, 31, { align: 'center', color: C.grey });
    (s.goals.list || []).forEach((g, i) => {
      const d = goalDef(g.id), y = 40 + i * 28;
      rbox(gx, y + 1, gw, 26, C.ink);
      rbox(gx, y, gw, 26, g.done ? mix(C.cream, C.greenL, 0.35) : C.cream);
      tickBox(gx + 4, y + 4, g.done);
      text(d.label, gx + 12, y + 4, { color: C.ink, outline: null });
      coinIcon(gx + gw - 30, y + 3);
      text(`+${d.reward}`, gx + gw - 4, y + 4, { color: g.done ? C.greenD : C.ink, outline: null, align: 'right' });
      text(d.desc, gx + 4, y + 12, { color: C.greyD, outline: null });
      R(gx + 4, y + 20, gw - 36, 3, C.greyDD);
      R(gx + 4, y + 20, Math.round((gw - 36) * Math.min(1, g.got / d.n)), 3, g.done ? C.green : C.gold);
      text(g.done ? 'DONE' : `${g.got}/${d.n}`, gx + gw - 4, y + 19, { color: g.done ? C.greenD : C.greyD, outline: null, align: 'right' });
    });
    // badges
    const got = BADGES.filter((b) => s.badges[b.id]).length;
    const hx = wide ? 266 : 90, hy = wide ? 20 : 126;
    text(`BADGES ${got}/${BADGES.length}`, hx, hy, { font: 'big', align: 'center', color: C.gold });
    const pg = Math.min(app.badgePage || 0, badgePages() - 1);
    BADGES.slice(pg * BADGE_PAGE, (pg + 1) * BADGE_PAGE).forEach((b, k) => {
      const i = pg * BADGE_PAGE + k;
      const { x, y, w, h } = badgeBox(k, wide);
      const on = !!s.badges[b.id], sel = app.badgeSel === i;
      rbox(x, y, w, h, sel ? C.gold : on ? C.night2 : C.greyDD);
      R(x + 1, y + 1, 17, 17, on ? C.night1 : C.ink);
      if (on) badgeIcon(b, x + 1, y + 1, t);
      else lockIcon(x + 5, y + 4, C.greyD);
      text(b.name, x + 21, y + 7, { color: sel ? C.ink : on ? C.cream : C.greyD, outline: null });
      hit(x, y, w, h, () => app.pickBadge(i), 'ui', `badge:${b.id}`);
    });
    // what the picked badge is for, and BACK
    const fy = wide ? 252 : 340;
    const fx = wide ? 6 : 6, fw = wide ? 168 : 168;
    const b = BADGES[app.badgeSel ?? -1];
    rbox(fx, wide ? 132 : fy, fw, 18, C.ink);
    text(b ? `${b.name}: ${s.badges[b.id] ? 'EARNED' : 'NOT YET'}` : 'TAP A BADGE TO SEE WHAT IT IS FOR', fx + fw / 2, (wide ? 132 : fy) + 3, { align: 'center', color: b && s.badges[b.id] ? C.greenL : C.grey });
    if (b) text(b.desc, fx + fw / 2, (wide ? 132 : fy) + 10, { align: 'center', color: C.cream });
    const by = wide ? 160 : fy + 24;
    button(50, by, 80, 16, 'BACK', C.steelD, () => app.toTitle(), 'ui', 'small', 'back');
    if (badgePages() > 1) { // more badges than fit: pages (tap < >, swipe or the arrow keys)
      if (pg > 0) button(6, by, 38, 16, '<', C.blueD, () => app.setBadgePage(pg - 1), 'ui', 'big', 'badgeprev');
      if (pg < badgePages() - 1) button(136, by, 38, 16, '>', C.blueD, () => app.setBadgePage(pg + 1), 'ui', 'big', 'badgenext');
      text(`PAGE ${pg + 1}/${badgePages()}`, 90, by + 20, { align: 'center', color: C.grey });
    }
    if (wide) drawShiba(90, 236, { t, scale: 3, mood: got > 9 ? 'happy' : 'wait' });
  }, [0, 0, 180, 390]);
}

// A goal or badge note during play (and over menus): a small ribbon under the
// HUD, one at a time.
function noteRibbon(app) {
  const n = app.note;
  if (!n) return;
  const cx = app.screen === 'game' && LAY.mode === 'wide' ? Math.floor(LAY.scene.w / 2) : Math.floor(W / 2);
  const w = tw(n.text) + 10, y = 15 - Math.round(Math.max(0, 1 - n.t * 8) * 8);
  rbox(cx - Math.ceil(w / 2), y + 1, w, 10, C.ink);
  rbox(cx - Math.ceil(w / 2), y, w, 10, n.badge ? ZONE_GOLD : n.done ? C.greenD : C.night2);
  text(n.text, cx, y + 3, { align: 'center', color: n.badge ? C.ink : C.cream, outline: n.badge ? null : C.ink });
}
const ZONE_GOLD = '#f2c14e';

// ---------- story scene ----------
const TYPE_RATE = 45; // letters per second
export function lineLength(d) { return d && d.cur ? d.cur.text.length : 0; }
export function lineTyped(app) { return Math.floor(app.dlgT * TYPE_RATE) >= lineLength(app.dlg); }
// The street fills the screen; the dialogue box and its answers sit at the
// bottom, above a short note. The box fits the line on screen and eases
// between sizes, and the counter rides just above it (portrait), so the
// street always fills the rest. Wide screens: the spirit at the counter on the
// left, the box on the right. DLG is where the box is now.
export const DLG = { x: 4, y: 164, w: 172, h: 160, big: false };
const TEXT_W = DLG.w - 14;
const HEAD_H = 46; // the portrait and name above a spirit's line
export const dlgLineH = (step) => (!step ? 40 : (step.who === 'STORY' ? 8 : HEAD_H) + wrap(step.text, TEXT_W, 'big').length * 10 + 16);
export const CHOICE_H = 18, CHOICE_GAP = 22;
// Where answer k sits (the playtest taps these).
// They sit at the bottom of the dialogue window (DLG.h tall).
export function choiceBox(d, k) {
  const n = d.choice ? d.choice.length : 0;
  return { x: DLG.x + 4, y: DLG.y + DLG.h - 6 - n * CHOICE_GAP + 4 + k * CHOICE_GAP, w: DLG.w - 8, h: CHOICE_H };
}
const RULE = '#dfe4ee', MARGIN = '#f2c2bd'; // the notebook page's lines
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
// A story scene is a street with the spirit at the counter and a dialogue
// window that keeps one size for the whole scene (its tallest line plus its
// answers fit), so nothing moves from line to line.
//   Portrait: the window sits at the bottom, just above the note, with a strip
//   of counter above it; the street fills the rest (the spirit drawn bigger
//   when there is room).
//   Wide: the street on the left with the counter a little below the middle
//   and the stall's menu board under it (as in the game); on the right, the
//   window on the wood wall, with a big close-up of whoever speaks.
// Returns the street S, the spirit's scale, the window (box: x, y, h, big
// header or not), the note (centre x, y), the wall (wide) and the board area.
export const BIG_HEAD = 58; // how much taller the close-up header is
export function sceneLayout(W, H, mode, blockH) {
  const winH0 = blockH + 8;
  if (mode === 'wide') {
    const RW = wideRight(W), LW = W - RW;
    const cy = Math.min(H - 18, 14 + Math.max(126, Math.round((H - 14) * 0.52)));
    const S = { w: LW, h: H, cy, d: Math.floor((LW - 180) / 2), sw: LW };
    const scale = Math.max(4, Math.min(7, Math.floor((cy - 44) / 16)));
    const room = H - 36 - 22;
    const big = room >= winH0 + BIG_HEAD;
    const h = Math.min(room, winH0 + (big ? BIG_HEAD : 0) + 16);
    const box = { x: LW + Math.floor((RW - DLG.w) / 2), y: 36 + Math.floor((room - h) / 2), h, big };
    return { S, scale, box, note: { x: LW + Math.floor(RW / 2), y: H - 14 }, wall: { x: LW, y: 14, w: RW, h: H - 14 }, board: { top: cy + 18, h: H - cy - 18 } };
  }
  const h = Math.max(winH0, Math.round((H - 34) * 0.36)); // at least about a third of a tall screen
  const y = Math.max(164, H - 20 - h);
  const cy = y - 24;
  const S = { w: W, h: H, cy, d: Math.floor((W - 180) / 2), sw: W };
  const scale = Math.max(4, Math.min(W >= 200 ? 8 : 7, Math.floor((cy - 44) / 16)));
  return { S, scale, box: { x: Math.floor((W - DLG.w) / 2), y, h, big: false }, note: { x: Math.floor(W / 2), y: H - 14 }, wall: null, board: null };
}
function sceneScreen(app) {
  const d = app.dlg, t = app.time, sc = d.scene;
  const def = levelDef(sc.level);
  // Frost: the night 13 epilogue (from its third line), and every winter
  // night, until the bell rings for spring in the finale.
  const frost = (!!sc.frost && d.pc >= (sc.frostAt || 0)) || (!!def?.winter && d.ending !== 'thaw');
  const { S, box, note, scale, wall, board } = sceneLayout(W, H, LAY.mode, sceneBlockH(sc));
  Object.assign(DLG, box);
  if (wall) { // the stall's back wall behind the window (side by side)
    drawMarket(t, { rain: !!def?.rain, festival: !!def?.festival && !sc.after, frost }, { ...S, w: W });
    woodFloor(wall.y, wall.x, wall.w);
    R(wall.x - 3, 14, 3, H - 14, C.woodD); R(wall.x - 2, 14, 1, H - 14, C.wood); R(wall.x - 4, 14, 1, H - 14, C.ink);
  } else drawMarket(t, { rain: !!def?.rain, festival: !!def?.festival && !sc.after, frost }, S);
  if (sc.waiting) inScene(() => drawCustomer(sc.waiting, Math.min(S.sw - S.d - 14, 172), COUNTER_Y - 6, { t, scale: 2 }), S); // far off, at the end of the line
  if (sc.spirit) inScene(() => drawCustomer(sc.spirit, 98, COUNTER_Y + 2, { t, scale }), S);
  if (def?.rain) drawRain(t, S);
  const solo = !sc.spirit ? { dogX: 90, dogScale: scale } : {}; // no spirit: Chimaek takes the stage
  const bark = d.cur && /barks/i.test(d.cur.text); // she barks (night 13; twice in the TOGETHER ending)
  awningAndCounter(t, { react: bark ? 'wag' : sc.dog || SPIRITS[sc.spirit]?.dog || null, frost, ...solo }, S, S.h);
  if (bark && Math.floor(t * 3) % 2) {
    const woof = /twice/i.test(d.cur.text) ? 'WOOF! WOOF!' : 'WOOF!';
    inScene(() => { rbox(8, COUNTER_Y - 46, tw(woof) + 8, 11, C.white); text(woof, 12, COUNTER_Y - 43, { color: C.ink, outline: null }); }, S);
  }
  if (board) stallFront(S, { level: def ? sc.level : 13, def: def || {}, time: t }, board);
  rbox(4, 18, 122, 13, C.ink);
  text(`NIGHT ${sc.level}: ${sc.title.toUpperCase()}`, 8, 22, { color: C.gold });
  hit(0, 14, W, H - 14, () => app.dlgTap(), 'dialog');
  // the dialogue window
  const B = DLG;
  rbox(B.x, B.y + 2, B.w, B.h, C.ink);
  rbox(B.x, B.y, B.w, B.h, C.cream);
  R(B.x + 2, B.y + 2, B.w - 4, B.h - 4, C.white);
  const who = d.cur ? d.cur.who : sc.spirit;
  let ty = B.y + 8;
  if (who !== 'STORY') {
    const name = VOICE[who] ? VOICE[who].name : speakerName(who);
    const kind = VOICE[who] ? VOICE[who].kind : SPIRITS[who]?.kind;
    if (B.big) { // a close-up: the face at 4x, the name under it
      const fx = B.x + Math.floor(B.w / 2) - 36;
      rbox(fx, B.y + 6, 72, 72, VOICE[who] ? C.greyDD : C.night1);
      if (VOICE[who]) drawVoice(fx + 4, B.y + 10, t, 2);
      else drawPortrait(who, fx + 4, B.y + 10, 4, t);
      text(name, B.x + B.w / 2, B.y + 82, { font: 'big', color: C.redD, outline: null, align: 'center' });
      if (kind) text(kind, B.x + B.w / 2, B.y + 93, { color: C.greyD, outline: null, align: 'center' });
      ty = B.y + HEAD_H + BIG_HEAD;
    } else {
      rbox(B.x + 6, B.y + 6, 36, 36, VOICE[who] ? C.greyDD : C.night1);
      if (VOICE[who]) drawVoice(B.x + 8, B.y + 8, t);
      else drawPortrait(who, B.x + 8, B.y + 8, 2, t);
      text(name, B.x + 48, B.y + 10, { font: 'big', color: C.redD, outline: null });
      if (kind) text(kind, B.x + 48, B.y + 21, { color: C.greyD, outline: null });
      ty = B.y + HEAD_H;
    }
  }
  // The window is a page of grandma's notebook: ruled lines under the text all
  // the way down (so a short line still sits on a full page) and a red margin.
  const showChoices = d.choice && lineTyped(app);
  const ruleEnd = showChoices ? choiceBox(d, 0).y - 16 : B.y + B.h - 12;
  for (let y = ty + 8; y <= ruleEnd; y += 10) R(B.x + 4, y, B.w - 8, 1, RULE);
  R(B.x + 4, B.y + 3, 1, B.h - 6, MARGIN);
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
  if (showChoices) {
    const c0 = choiceBox(d, 0);
    R(B.x + 6, c0.y - 5, B.w - 12, 1, C.cream);
    text('YOUR ANSWER', B.x + 7, c0.y - 13, { color: C.greyD, outline: null });
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
function drawVoice(x, y, t, k = 1) { // 32 x 32 (64 x 64 at k = 2)
  for (let j = 0; j < 32; j += 2) for (let i = (j / 2) % 2; i < 32; i += 2) R(x + i * k, y + j * k, k, k, '#8fa4d8');
  const blink = Math.sin(t * 0.7) > 0.95;
  if (!blink) { R(x + 9 * k, y + 13 * k, 3 * k, 2 * k, C.white); R(x + 20 * k, y + 13 * k, 3 * k, 2 * k, C.white); }
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
      if (sc.repeat) { // the finale: the endings found so far
        const found = ENDING_IDS.filter((id) => (st.endings || {})[id]).length;
        text(`ENDINGS ${found}/${ENDING_IDS.length}`, x + 42, y + 26, { color: found ? C.purple : C.greyD, outline: null });
      } else if (sp) {
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
const UP_ART = {
  grill4: 'galbi', tray5: 'kimbap', fastfry: 'chicken', patience: 'lantern', wokfast: 'friedrice', steam3: 'mandu', kettle: 'kettle', ironpot: 'ironpot', soup2: 'soup2',
  steamfast: 'bun', potfast: 'ramyeon', silk: 'silk',
};
// Three pages, PART 1 (the first five), PART 2 (the steamer, noodle pot and
// rush ones) and PART 3 (the soup pot ones): one column of five on a phone,
// two columns (three and two) side by side.
const partOf = (u) => (!u.from ? 1 : u.from <= 13 ? 2 : 3);
export const SHOP_PAGES = [1, 2, 3].map((p) => UPGRADES.filter((u) => partOf(u) === p).map((u) => u.id));
export const SHOP_PER_PAGE = 5;
export const shopPages = () => SHOP_PAGES;
export function shopCardBox(i, wide) {
  return wide ? { x: 6 + Math.floor(i / 3) * 176, y: 74 + (i % 3) * 44, w: 168, h: 42 } : { x: 6, y: 74 + i * 46, w: 168, h: 42 };
}
// The page that opens first: the newest part with an upgrade that is open and
// not owned yet, else part 1.
export function defaultShopPage(save) {
  const fresh = UPGRADES.filter((u) => u.from && upgradeOpen(u, save.stars) && !save.upgrades[u.id]).map(partOf);
  return (fresh.length ? Math.max(...fresh) : 1) - 1;
}
function shopScreen(app) {
  const s = app.save, t = app.time, wide = isWide();
  R(0, 0, W, H, C.night0);
  for (let y = 0; y < H; y += 4) R(0, y, W, 1, C.night1);
  for (let x = 0; x < W; x += 10) { const c = (x / 10) % 2 ? C.cream : C.green; R(x, 14, 10, 8, c); R(x + 1, 22, 8, 2, c); }
  const pages = shopPages();
  const page = Math.min(app.shopPage || 0, pages.length - 1);
  const shown = UPGRADES.filter((u) => pages[page].includes(u.id));
  const bw = wide ? 352 : 180;
  const y0 = wide ? 74 + 3 * 44 + 4 : 74 + SHOP_PER_PAGE * 46 + 4;
  const bh = wide ? y0 + 56 : 390;
  const dx = Math.floor((W - bw) / 2), dy = Math.max(0, Math.floor((H - bh) / 2));
  withOrigin(dx, dy, () => {
    const cx = bw / 2;
    text('STALL UPGRADES', cx, 30, { font: 'big', align: 'center', color: C.gold });
    rbox(cx - 26, 41, 52, 13, C.ink);
    coinIcon(cx - 22, 44);
    text(String(s.wallet), cx - 12, 45, { color: C.yellow });
    ['PART 1', 'PART 2', 'PART 3'].forEach((lab, i) => {
      const on = page === i, bx = cx - 87 + i * 58;
      button(bx, 57, 54, 13, lab, on ? C.redD : C.greyDD, () => app.setShopPage(i), 'ui', 'small', `shoppage:${i + 1}`);
      if (on) R(bx + 4, 70, 46, 1, C.gold);
    });
    shown.forEach((u, i) => {
      const { x, y, w, h } = shopCardBox(i, wide);
      const owned = !!s.upgrades[u.id];
      const open = upgradeOpen(u, s.stars);
      const can = canBuy({ wallet: s.wallet, upgrades: s.upgrades, stars: s.stars }, u.id);
      rbox(x, y + 1, w, h, C.ink);
      rbox(x, y, w, h, !open ? C.greyDD : owned ? mix(C.cream, C.greenL, 0.35) : C.cream);
      rbox(x + 4, y + 4, 34, 34, C.night1);
      if (UP_ART[u.id] === 'lantern') drawPortrait('lantern', x + 5, y + 5, 2, t);
      else if (u.id === 'tray5') { // a little tray with five things on it
        rbox(x + 6, y + 20, 30, 12, C.woodL); R(x + 7, y + 21, 28, 10, C.wood);
        ['soda', 'kimbap', 'toast', 'tea', 'galbi'].forEach((id, k) => drawItem(id, x + 3 + k * 5, y + 10 + (k % 2) * 3));
      } else if (u.id === 'steam3') { // three little baskets, one with mandu
        for (let k = 0; k < 3; k++) { R(x + 6 + k * 10, y + 26, 9, 8, C.ink); R(x + 7 + k * 10, y + 26, 7, 7, '#c9a46a'); R(x + 7 + k * 10, y + 26, 7, 1, '#e4c890'); }
        drawItem('mandu', x + 9, y + 4, { scale: 2 });
      } else if (u.id === 'kettle') {
        kettleArt(x + 7, y + 9);
        for (let k = 0; k < 3; k++) R(x + 33, y + 15 - k * 3 - (Math.floor(t * 4 + k) % 2), 2, 2, C.white);
      } else if (u.id === 'ironpot' || u.id === 'soup2') { // one heavy iron pot (and a ladle), or two pots
        const pots = u.id === 'soup2' ? [[x + 6, y + 18, 13], [x + 21, y + 22, 13]] : [[x + 7, y + 17, 26]];
        for (const [px, py, pw] of pots) {
          R(px, py, pw, 10, C.ink); R(px + 2, py + 10, pw - 4, 3, C.ink);
          R(px + 1, py + 1, pw - 2, 9, '#3a3440'); R(px + 1, py + 1, pw - 2, 1, '#6a6470');
          R(px + 2, py + 2, pw - 4, 2, '#f2e8cf');
          R(px + 3, py + 10, pw - 6, 2, '#3a3440');
          for (let k = 0; k < 2; k++) R(px + 3 + k * Math.floor(pw / 2), py - 3 - (Math.floor(t * 4 + k) % 2), 1, 2, C.white);
        }
        if (u.id === 'ironpot') ladleArt(x + 10, y + 1);
      } else if (u.id === 'silk') { // two red silk lanterns on a string
        R(x + 5, y + 8, 32, 1, C.greyD);
        for (const [lx, ly] of [[x + 9, y + 12], [x + 23, y + 15]]) {
          R(lx + 3, ly - 3, 1, 3, C.ink); R(lx, ly, 9, 13, C.ink); R(lx - 1, ly + 2, 11, 9, C.ink);
          R(lx, ly + 1, 9, 11, C.red); R(lx, ly + 3, 9, 1, C.gold); R(lx, ly + 8, 9, 1, C.gold); R(lx + 2, ly + 2, 1, 7, C.redL);
          R(lx + 3, ly + 12, 3, 2 + (Math.floor(t * 2 + lx) % 2), C.gold);
        }
      } else if (u.id === 'steamfast') { // a bamboo lid over a bun, steam rising fast
        drawItem('bun', x + 5, y + 9, { scale: 2 });
        R(x + 6, y + 6, 30, 5, C.ink); R(x + 7, y + 6, 28, 4, '#c9a46a'); R(x + 7, y + 6, 28, 1, '#e4c890'); R(x + 19, y + 4, 4, 2, C.ink);
        for (let k = 0; k < 3; k++) R(x + 9 + k * 9, y + 2 - (Math.floor(t * 6 + k) % 3), 1, 2, C.white);
      } else drawItem(UP_ART[u.id], x + 5, y + 5, { scale: 2 });
      if (!open) { // not yet: it comes with its station
        R(x + 4, y + 4, 34, 34, mix(C.night1, C.greyDD, 0.55));
        lockIcon(x + 16, y + 15, C.greyD);
        text(u.name, x + 43, y + 6, { color: C.greyD, outline: null });
        text(`OPENS WITH LEVEL ${u.from}`, x + 43, y + 15, { color: C.greyD, outline: null });
        text(u.station ? `THE ${STATIONS[u.station].name.toUpperCase()}` : u.with || '', x + 43, y + 28, { color: C.greyD, outline: null });
        return;
      }
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
export const SET_Y = 50;
export const SET_H = 300;
export const RESET_BTN = { x: 34, y: SET_Y + 266, w: 112, h: 16 };
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
  // Colorblind mode: shapes on every colour signal (tick, star, X, snowflake).
  const cy = SET_Y + 152, cb = !!app.save.patterns;
  text('COLORBLIND MODE', SLIDER.x, cy + 2, { font: 'big', color: C.ink, outline: null });
  toggle(SLIDER.x + SLIDER.w - 24, cy, cb);
  if (cb) {
    let ix = SLIDER.x;
    for (const [k, word] of [['good', 'GOOD'], ['perfect', 'PERFECT'], ['burnt', 'BURNT'], ['cold', 'COLD']]) {
      stateIcon(k, ix + 1, cy + 15); text(word, ix + 8, cy + 15, { color: C.greyD, outline: null }); ix += 10 + tw(word) + 4;
    }
  } else text('OFF: COLORS ONLY. ON: SHAPES TOO', SLIDER.x, cy + 15, { color: C.greyD, outline: null });
  hit(x + 4, cy - 4, w - 8, 28, () => app.togglePatterns(), 'ui', 'patterns');
  button(SLIDER.x, SET_Y + 180, SLIDER.w, 16, 'SHOW TIPS AGAIN', C.purple, () => app.showTipsAgain(), 'ui', 'small', 'showtips');
  button(SLIDER.x, SET_Y + 202, SLIDER.w, 18, app.muted ? 'SOUND: MUTED' : 'SOUND: ON', app.muted ? C.redD : C.steelD, () => app.toggleMute(), 'ui', 'small', 'sound');
  button(SLIDER.x, SET_Y + 226, SLIDER.w, 18, app.g && app.g.phase === 'play' && app.screen === 'game' ? 'RESUME' : 'DONE', C.greenD, () => app.closeSettings(), 'ui', 'small', 'resume');
  // Danger zone: a gap and a dashed red rule keep it away from RESUME.
  for (let dx = x + 8; dx < x + w - 8; dx += 4) R(dx, SET_Y + 256, 2, 1, C.redL);
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
// A tray item cooling (winter nights): hot, a draining bar, then COLD.
function coolingSample(x, y, t, id = 'galbi') {
  const k = Math.max(0, 1 - ((t * 0.22) % 1.4)); // drains, then sits cold a moment
  const cold = k <= 0;
  rbox(x - 4, y + 22, 40, 14, C.woodL); R(x - 2, y + 24, 36, 10, C.wood);
  drawItem(id, x, y, { scale: 2, cold });
  if (cold) text('COLD', x + 16, y + 30, { color: ZONE.cold, align: 'center' });
  else {
    R(x + 4, y + 31, 24, 4, C.ink); R(x + 5, y + 32, 22, 2, ZONE.cold); R(x + 5, y + 32, Math.round(22 * k), 2, C.cream);
    if (k > 0.35) for (let i = 0; i < 2; i++) { const p = (t * 0.9 + i * 0.5) % 1; R(x + 13 + i * 6, y + 2 - Math.round(p * 8), 1, 2, mix('#e8e8f4', C.woodDD, p)); }
  }
}
function introPreview(app, g) {
  const t = app.time, def = g.def, it = def.intro;
  if (def.endless) { // every station's dish, bobbing (winter: the soup too, in the snow)
    const ids = def.winter ? ['soda', 'galbi', 'tteokguk', 'japchae', 'mandu', 'ramyeon'] : ['soda', 'galbi', 'chicken', 'japchae', 'mandu', 'ramyeon'];
    ids.forEach((id, i) => drawItem(id, 24 + (i % 3) * 46, 104 + Math.floor(i / 3) * 22 - Math.round(Math.abs(Math.sin(t * 2 + i)) * 3), { scale: 2 }));
    return;
  }
  if (def.preview === 'winter') { // Eoreum at the end of the line; food on the tray cooling
    drawCustomer('lantern', 40, 146, { t, scale: 2 });
    drawCustomer('ice', 140, 146, { t, scale: 2 });
    coolingSample(74, 110, t);
    return;
  }
  if (def.preview === 'help') { // the whole market lends a hand: the wisp keeps a soup warm
    ['fox', 'moss', 'wisp', 'crane'].forEach((l, i) => drawCustomer(l, 30 + i * 40, 146, { t, scale: 2 }));
    drawItem('tteokguk', 74, 104 - Math.round(Math.abs(Math.sin(t * 3)) * 2), { scale: 2, sauce: 'gim' });
    text('X2', 106, 120, { font: 'big', color: C.yellow });
    return;
  }
  if (def.preview === 'finale') { // the last bowl, and who waits for it
    drawCustomer('ice', 46, 148, { t, scale: 3 });
    drawShiba(120, 148, { t, react: 'stare', scale: 2 });
    drawItem('tteokguk', 74, 112 - Math.round(Math.abs(Math.sin(t * 2)) * 2), { scale: 2, sauce: 'egg' });
    for (let i = 0; i < 3; i++) { const p = (t * 0.7 + i * 0.33) % 1; R(80 + i * 8, 110 - Math.round(p * 10), 1, 2, mix(C.white, C.night1, p)); }
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
    const second = def.n >= 14 ? (def.guest === 'rabbit' ? 'lantern' : 'rabbit') : def.n >= 10 ? 'clay' : 'wisp';
    const cast = def.kind === 'queue' ? ['moth', 'crane', 'fox'] : [def.guest || 'wisp', second, 'moss'];
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
  if (it.station === 'soup') { // rice cakes, the ladle stirring, a bowl with seaweed
    drawItem('tteokguk_raw', 26, 112, { scale: 2 }); drawItem('tteokguk', 116, 112, { scale: 2, sauce: 'gim' });
    R(66, 128, 48, 14, C.ink); R(67, 128, 46, 12, '#3a3440'); R(68, 129, 44, 3, '#f2e8cf');
    ladleArt(64 + Math.round(Math.cos(t * 4) * 10), 108);
    for (let i = 0; i < 4; i++) { const p = (t * 0.8 + i * 0.25) % 1; R(72 + i * 11, 124 - Math.round(p * 12), 2, 2, mix('#d8d8e8', C.woodDD, p)); }
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
// A night that brings a new cooking station shows the meters' colour code:
// a sample meter (its needle sweeps from raw to burnt) and the legend.
const LEGEND_H = 30;
// A new cooking station's night shows its meter; the first winter night the
// cooling colours.
export const introLegend = (g) => (g.def.kind === 'station' && STATION_KIND[g.def.intro.station]) || (g.def.preview === 'winter' ? 'winter' : null);
export const introHeight = (app) => 137 + introRows(app).reduce((a, r) => a + r.length * 8 + 4, 0) + (introLegend(app.g) ? LEGEND_H : 0);
function introBody(app, ph, oy) {
  const g = app.g, t = app.time, it = g.def.intro;
  const rowsAll = introRows(app);
  panel(10, 70 + oy, 160, ph);
  text(g.endless ? 'NO STARS, NO LAST GUEST' : `LEVEL ${g.level}`, 90, 78 + oy, { align: 'center', color: C.redD, outline: null });
  text(g.def.title.toUpperCase(), 90, 86 + oy, { font: 'big', align: 'center', color: C.ink, outline: null });
  rbox(20, 100 + oy, 140, 70, g.def.rain || g.def.festival || g.def.winter ? C.night1 : C.woodDD);
  if (g.def.rain) for (let i = 0; i < 18; i++) R(24 + ((i * 37) % 132), 102 + oy + ((i * 23 + Math.floor(t * 60)) % 60), 1, 3, '#5f74b0');
  if (g.def.winter) for (let i = 0; i < 16; i++) R(24 + ((i * 41 + Math.round(Math.sin(t + i) * 2)) % 132), 102 + oy + ((i * 29 + Math.floor(t * 14)) % 64), 1, 1, i % 3 ? '#dfe8f8' : C.white);
  withOffset(oy, () => introPreview(app, g)); // drawn at its own y, moved with the card
  text(it.heading, 90, 156 + oy, { align: 'center', color: C.gold });
  let y = 178 + oy;
  for (const rows of rowsAll) {
    R(16, y + 1, 3, 3, C.red);
    for (const r of rows) { text(r, 23, y, { color: C.ink, outline: null }); y += 8; }
    y += 4;
  }
  const kind = introLegend(g);
  if (kind === 'winter') { // the warmth bar drains to icy blue: COLD
    text('SERVE IT WARM', 90, y, { align: 'center', color: C.redD, outline: null });
    const k = Math.max(0, 1 - ((t * 0.22) % 1.4));
    R(29, y + 9, 122, 6, C.ink); R(30, y + 10, 120, 4, ZONE.cold); R(30, y + 10, Math.round(120 * k), 4, C.cream);
    meterLegend(90, y + 20, { ...COOK_TEXT, burnt: COOK_TEXT.burnt.grill, cold: COOK_TEXT.cold }, true);
    y += LEGEND_H;
  } else if (kind) {
    const spec = COOK[kind];
    text(COOK_TEXT.aim, 90, y, { align: 'center', color: C.redD, outline: null });
    const p = ((t * 0.18) % 1) * spec.max;
    meter(30, y + 10, 120, 4, p, spec, true, t);
    meterLegend(90, y + 20, { ...COOK_TEXT, burnt: COOK_TEXT.burnt[kind], cold: g.def.winter ? COOK_TEXT.cold : null }, true);
    y += LEGEND_H;
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
  if (next.kind === 'finale') return 'NEXT UP: ONE MORE BOWL';
  if (next.preview === 'winter') return 'NEXT UP: THE LONG WINTER';
  if (next.kind === 'queue') return 'NEXT UP: A LONG LINE';
  return next.queue > 1 ? 'NEXT UP: A BUSY LINE' : 'NEXT UP: EVERY STATION AT ONCE';
}
// Endless nights end with a score instead of stars.
function endlessEnd(app) {
  centered(() => endlessCard(app), 52, 326, 14);
}
function endlessCard(app) {
  const g = app.g, winter = !!g.def.winter;
  panel(12, 52, 156, 272);
  text('NIGHT OVER', 90, 62, { font: 'big', align: 'center', color: C.redD, outline: null });
  text(winter ? 'WINTER NIGHTS' : 'ENDLESS NIGHTS', 90, 74, { align: 'center', color: C.greyD, outline: null });
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
    ['BEST NIGHT', String(winter ? app.save.winterBest : app.save.endlessBest)],
    ['PURSE', `+${app.lastPay || 0} = ${app.save.wallet}`],
  ];
  rows.forEach(([a, b], i) => {
    const y = 136 + i * 11;
    text(a, 26, y, { color: C.ink, outline: null });
    text(b, 154, y, { color: C.ink, outline: null, align: 'right' });
    R(26, y + 8, 128, 1, C.cream);
  });
  goalRows(app, 26, 204, 128);
  drawShiba(90, 272, { big: true, scale: 2, mood: best ? 'happy' : 'wait', t: app.time });
  button(22, 280, 64, 18, 'AGAIN', C.blueD, () => app.newLevel(g.level), 'ui', 'small', 'again');
  button(94, 280, 64, 18, 'MENU', C.greenD, () => app.toTitle(), 'ui', 'small', 'menu');
  text('EVERY NIGHT IS DIFFERENT', 90, 304, { align: 'center', color: C.greyD, outline: null });
}
function endScreen(app) {
  clearHits();
  dim();
  if (app.g.endless) return endlessEnd(app);
  centered(() => endCard(app), 52, 350, 14);
}
function endCard(app) {
  const g = app.g, t = app.time - (app.endAt || 0);
  panel(12, 52, 156, 296);
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
  goalRows(app, 26, 204, 128);
  const mem = [...(app.nightMemories || [])];
  const memRows = mem.length ? wrap(mem.map((id) => SPIRITS[id].name).join(', '), 140) : [];
  if (mem.length) {
    text('NEW MEMORIES', 90, 240, { align: 'center', color: C.purple, outline: null });
    memRows.slice(0, 2).forEach((r, i) => text(r, 90, 248 + i * 8, { align: 'center', color: C.ink, outline: null }));
  }
  drawShiba(90, 298, { big: true, scale: memRows.length ? 2 : 3, mood: ok ? 'happy' : 'wait', t: app.time });
  const next = levelDef(g.level + 1);
  const shopNext = ok && g.level >= SHOP_FROM_LEVEL;
  const after = afterSceneFor(g.level);
  const epilogue = ok && after && (after.repeat || !app.save.story.seen[after.id]);
  const by = 304;
  button(22, by, 64, 18, 'RETRY', C.blueD, () => app.newLevel(g.level), 'ui', 'small', 'retry');
  if (epilogue) button(94, by, 64, 18, 'GO ON', Math.floor(app.time * 2) % 2 ? C.purple : C.redD, () => app.playAfter(after), 'ui', 'small', 'next');
  else if (ok && next) button(94, by, 64, 18, shopNext ? 'SHOP' : 'NEXT', C.greenD, () => app.endNext(), 'ui', 'small', 'next');
  else if (shopNext) button(94, by, 64, 18, 'SHOP', C.greenD, () => app.openShop(null), 'ui', 'small', 'next');
  else button(94, by, 64, 18, 'MENU', ok ? C.greenD : C.steelD, () => app.toTitle(), 'ui', 'small', 'menu');
  let note = 'NEED 1 STAR TO OPEN THE NEXT LEVEL';
  if (ok && next && shopNext) note = `UPGRADES, THEN LEVEL ${next.n}`;
  else if (ok && next) note = nextNote(next);
  else if (epilogue) note = after.repeat ? 'THE LAST BOWL IS WAITING...' : 'THE BELL IS RINGING AGAIN...';
  else if (ok) note = 'THE MARKET IS YOURS NOW';
  text(note, 90, by + 24, { align: 'center', color: ok ? C.redD : C.greyD, outline: null });
}

// ---------- the endings (part 3) ----------
// After the finale: a short scene of the ending, then this epilogue card.
// The street shows the ending (spring on the river, Eoreum at the counter in
// the snow, or the whole market cooking together) and the card names it,
// with how many of the three endings you have found.
export const ENDING_CARD = { w: 160, h: 176 };
export function endingLayout(W, H, mode) {
  if (mode === 'wide') {
    const RW = wideRight(W), LW = W - RW;
    const cy = Math.min(H - 18, 14 + Math.max(126, Math.round((H - 14) * 0.62)));
    return { S: { w: LW, h: H, cy, d: Math.floor((LW - 180) / 2), sw: LW }, card: { x: LW + Math.floor((RW - ENDING_CARD.w) / 2), y: Math.max(16, Math.floor((H - ENDING_CARD.h) / 2)) }, wall: { x: LW, w: RW } };
  }
  const cardY = H - ENDING_CARD.h - 8;
  const cy = Math.max(140, cardY - 24);
  return { S: { w: W, h: cardY - 4, cy, d: Math.floor((W - 180) / 2), sw: W }, card: { x: Math.floor((W - ENDING_CARD.w) / 2), y: cardY }, wall: null };
}
const PETAL = ['#f6c0d0', '#fbe0ea', '#f2a0b8'];
function endingScreen(app) {
  const t = app.time, id = ENDINGS[app.ending] ? app.ending : 'thaw', E = ENDINGS[id];
  const { S, card, wall } = endingLayout(W, H, LAY.mode);
  drawMarket(t, { festival: id === 'together', frost: id !== 'thaw' }, { ...S, h: wall ? H : S.h });
  if (wall) { woodFloor(14, wall.x, wall.w); R(wall.x - 3, 14, 3, H - 14, C.woodD); R(wall.x - 2, 14, 1, H - 14, C.wood); R(wall.x - 4, 14, 1, H - 14, C.ink); }
  else woodFloor(S.h, 0, W);
  if (id === 'thaw') { // dawn over the river: the ice breaks up and drifts away
    for (let k = 0; k < 4; k++) R(0, S.cy - 60 + k * 10, S.w, 10, mix(C.night3, '#f2a0a0', 0.15 + k * 0.12));
    R(0, S.cy - 20, S.w, 12, '#3a6aa8');
    for (let x = 0; x < S.w; x += 6) R(x + Math.round((t * 8) % 6), S.cy - 18 + ((x * 7) % 8), 3, 1, '#8fc4f0');
    for (let k = 0; k < 6; k++) { const fx = Math.round(((k * 53 + t * 10) % (S.w + 30)) - 20); R(fx, S.cy - 16 + (k % 3) * 3, 10 + (k % 3) * 3, 3, '#eaf6ff'); }
  }
  inScene(() => {
    if (id === 'keeper') { drawCustomer('ice', 112, COUNTER_Y + 2, { t, scale: 4 }); }
    if (id === 'together') ['lantern', 'fox', 'moss', 'ice', 'moth', 'clay', 'rabbit'].forEach((l, i) => drawCustomer(l, 44 + i * 21, COUNTER_Y + 2 - (i % 2) * 6, { t, scale: 2, mood: 'happy' }));
  }, S);
  awningAndCounter(t, { react: 'wag', mood: 'happy', frost: id !== 'thaw', dogX: id === 'together' ? 18 : 34 }, S, wall ? H : S.cy + 18);
  inScene(() => {
    if (id === 'keeper') { drawItem('tteokguk', 70, COUNTER_Y - 26, { scale: 2, sauce: 'egg' }); for (let i = 0; i < 3; i++) { const p = (t * 0.6 + i / 3) % 1; R(78 + i * 6, COUNTER_Y - 24 - Math.round(p * 12), 1, 2, mix(C.white, C.night1, p)); } }
    if (id === 'together' && Math.floor(t * 2) % 2) { rbox(4, COUNTER_Y - 48, tw('WOOF! WOOF!') + 8, 11, C.white); text('WOOF! WOOF!', 8, COUNTER_Y - 45, { color: C.ink, outline: null }); }
  }, S);
  if (id === 'thaw') for (let i = 0; i < 28; i++) { // blossom petals on the wind
    const px = Math.round(((i * 37 + t * (14 + (i % 5) * 3)) % (S.w + 20)) - 10), py = Math.round(((i * 53 + t * (10 + (i % 4) * 4)) % (S.h + 10)) - 5);
    R(px, py, 2, 1, PETAL[i % 3]); R(px + 1, py + 1, 1, 1, PETAL[(i + 1) % 3]);
  }
  hit(0, 0, W, H, () => {}, 'backdrop');
  withOrigin(card.x, card.y, () => endingCard(app, id, E), [0, 0, ENDING_CARD.w, ENDING_CARD.h]);
}
function endingCard(app, id, E) {
  const { w, h } = ENDING_CARD, t = app.time;
  panel(0, 0, w, h);
  R(2, 2, w - 4, 3, id === 'thaw' ? PETAL[2] : id === 'keeper' ? ZONE.cold : C.gold);
  text(`ENDING ${E.n} OF ${ENDING_IDS.length}`, w / 2, 9, { align: 'center', color: C.purple, outline: null });
  text(E.title, w / 2, 19, { font: 'big', scale: 2, align: 'center', color: C.redD, outline: null });
  text(E.name, w / 2, 37, { align: 'center', color: C.greyD, outline: null });
  let y = 50;
  for (const line of E.lines) for (const r of wrap(line, w - 16)) { text(r, w / 2, y, { align: 'center', color: C.ink, outline: null }); y += 9; }
  const ends = (app.save.story && app.save.story.endings) || {};
  const found = ENDING_IDS.filter((k) => ends[k]).length;
  y = Math.max(y + 4, 104);
  R(10, y - 3, w - 20, 1, C.cream);
  text(`ENDINGS FOUND ${found}/${ENDING_IDS.length}`, w / 2, y + 2, { align: 'center', color: C.ink, outline: null });
  ENDING_IDS.forEach((k, i) => { const x = w / 2 - 16 + i * 12; R(x, y + 10, 8, 8, C.ink); R(x + 1, y + 11, 6, 6, ends[k] ? (k === id ? C.gold : C.greenL) : C.greyDD); });
  if (found < ENDING_IDS.length) text('PLAY NIGHT 19 AGAIN FOR ANOTHER', w / 2, y + 22, { align: 'center', color: C.greyD, outline: null });
  else text('YOU FOUND THEM ALL', w / 2, y + 22, { align: 'center', color: C.greenD, outline: null });
  button(20, h - 26, w - 40, 18, 'TO THE MARKET', Math.floor(t * 2) % 2 ? C.greenD : C.green, () => app.endingDone(), 'ui', 'small', 'endingdone');
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
  else if (app.screen === 'badges') { badgesScreen(app); hud(app); }
  else if (app.screen === 'cast') castScreen(app);
  else if (app.screen === 'ending') { endingScreen(app); hud(app); }
  else if (app.g) {
    drawGame(app, reg);
    if (app.g.phase === 'intro') { introCard(app); hud(app); }
    if (app.g.phase === 'end') { endScreen(app); hud(app); }
    drawParts(app.fx, 'top');
  }
  if (app.screen !== 'scene' && app.screen !== 'cast') noteRibbon(app);
  if (app.settings) settingsPanel(app);
  return reg;
}
