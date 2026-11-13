// Screen layout (pure, no DOM). The game is drawn at a whole-number scale of
// device pixels (crisp pixel art), and the logical canvas grows to fill the
// whole viewport: W x H art pixels, at least 180 x 390 in portrait or
// 360 x 300 side by side ("wide": the street on the left, the kitchen on the
// right). Everything else was designed on a 180 x 390 screen ("design
// coordinates"); each part of a screen is drawn in design coordinates moved
// into place (render.js, screens.js), and the bits around it (sky, wood,
// backdrops) are drawn wider and taller to fill the space.

export const DESIGN = { w: 180, h: 390 };
export const MIN = { portrait: { w: 180, h: 390 }, wide: { w: 360, h: 300 } };
// On a tie in scale, viewports at least this wide (width / height) go side by side.
export const WIDE_ASPECT = 0.75;
// Design rows of the game screen.
export const D = { hud: 14, sceneH: 158, counterY: 140, tabsY: 158, panelY: 172, panelH: 146, trayY: 318, trayH: 72 };
// How much taller than 146 a station panel may get (the rest goes to the street).
export const PANEL_EXTRA_MAX = 24;
// The right-hand column in wide mode: at least 180, about half, at most 240.
export const wideRight = (W) => Math.max(180, Math.min(240, Math.floor(W / 2), W - 180));

// Viewport (CSS px) + device pixel ratio + safe-area insets (CSS px) ->
// the scale and the logical size. The canvas buffer (bw x bh) covers the whole
// viewport; the game is drawn in its W x H content area at (x0, y0), inside the
// safe area. Returns CSS size and position for the canvas element too.
export function computeView(vw, vh, dpr = 1, inset = {}) {
  const dw = Math.max(1, Math.round(vw * dpr)), dh = Math.max(1, Math.round(vh * dpr));
  const iT = Math.round((inset.top || 0) * dpr), iR = Math.round((inset.right || 0) * dpr);
  const iB = Math.round((inset.bottom || 0) * dpr), iL = Math.round((inset.left || 0) * dpr);
  const cw = Math.max(1, dw - iL - iR), ch = Math.max(1, dh - iT - iB);
  const fit = (m) => Math.max(1, Math.floor(Math.min(cw / m.w, ch / m.h)));
  const sP = fit(MIN.portrait), sW = fit(MIN.wide);
  const wideFits = cw / sW >= MIN.wide.w && ch / sW >= MIN.wide.h;
  const mode = wideFits && (sW > sP || (sW === sP && cw / ch >= WIDE_ASPECT)) ? 'wide' : 'portrait';
  const s = mode === 'wide' ? sW : sP;
  const bw = Math.ceil(dw / s), bh = Math.ceil(dh / s);
  const x0 = Math.ceil(iL / s), y0 = Math.ceil(iT / s);
  // (Below the minimum, even at scale 1, the game keeps its minimum size and the
  // page cuts off the rest.)
  const W = Math.max(MIN[mode].w, Math.min(bw - x0, Math.floor(cw / s))), H = Math.max(MIN[mode].h, Math.min(bh - y0, Math.floor(ch / s)));
  // The canvas is a whole number of device px, centred; any overflow (under
  // s device px) is cut off evenly by the page.
  const left = Math.floor((dw - bw * s) / 2) / dpr, top = Math.floor((dh - bh * s) / 2) / dpr;
  const BW = Math.max(bw, x0 + W), BH = Math.max(bh, y0 + H);
  return { s, mode, dpr, bw: BW, bh: BH, x0, y0, W, H, cssW: (BW * s) / dpr, cssH: (BH * s) / dpr, left, top };
}

// The game screen's regions for a W x H content area.
//   scene: the street, sky and counter. w x h from the top left; the counter
//          top is at cy; the guests, their orders and Chimaek stand in the
//          service area (sw wide), drawn in design coordinates moved by
//          (d, cy - 140).
//   tabs, panel, tray: screen rects. panel/tray carry (tx, ty), the move from
//          design coordinates (180 wide, panel at y 172, tray at y 318).
//   work: where a sideways swipe switches stations.
export function computeLayout(W, H, mode = 'portrait') {
  if (mode === 'wide') {
    const RW = wideRight(W), LW = W - RW;
    const exP = Math.max(0, Math.min(PANEL_EXTRA_MAX, H - D.hud - 14 - D.panelH - D.trayH));
    const blockH = 14 + D.panelH + exP + D.trayH;
    const by = H - blockH;
    const scene = { w: W, h: H, cy: H - 18, d: Math.floor((LW - 180) / 2), sw: LW };
    const tabs = { x: LW, y: by, w: RW, h: 14 };
    const panel = { x: LW, y: by + 14, w: RW, h: D.panelH + exP };
    const tray = { x: LW, y: panel.y + panel.h, w: RW, h: H - panel.y - panel.h };
    return finish({ mode, W, H, LW, RW, scene, tabs, panel, tray, exP, work: { x: LW, y: by, w: RW, h: H - by } });
  }
  const E = Math.max(0, H - DESIGN.h);
  const exP = Math.min(PANEL_EXTRA_MAX, Math.floor(E / 4));
  const sceneH = D.sceneH + E - exP;
  const scene = { w: W, h: sceneH, cy: sceneH - 18, d: Math.floor((W - 180) / 2), sw: W };
  const tabs = { x: 0, y: sceneH, w: W, h: 14 };
  const panel = { x: 0, y: sceneH + 14, w: W, h: D.panelH + exP };
  const tray = { x: 0, y: panel.y + panel.h, w: W, h: H - panel.y - panel.h };
  return finish({ mode, W, H, LW: W, RW: W, scene, tabs, panel, tray, exP, work: { x: 0, y: sceneH, w: W, h: H - sceneH } });
}
function finish(L) {
  const { panel, tray, scene } = L;
  const cx = (r) => r.x + Math.floor((r.w - 180) / 2);
  panel.tx = cx(panel); panel.ty = panel.y + Math.floor(L.exP / 3) - D.panelY;
  tray.tx = cx(tray); tray.ty = tray.y - D.trayY;
  // The panel's whole rect in design coordinates (for backgrounds).
  panel.local = { x: panel.x - panel.tx, y: panel.y - panel.ty, w: panel.w, h: panel.h };
  tray.local = { x: tray.x - tray.tx, y: tray.y - tray.ty, w: tray.w, h: tray.h };
  scene.dy = scene.cy - D.counterY;
  return L;
}

// Centres a design-coordinate block (top..bottom, 180 wide) in a screen
// region; returns the move (dx, dy).
export function centerBlock(top, bottom, region) {
  const dx = region.x + Math.floor((region.w - 180) / 2);
  const dy = region.y + Math.floor((region.h - (bottom - top)) / 2) - top;
  return { dx, dy };
}

// The live layout (main.js sets it on every resize; tests may too).
export let LAY = computeLayout(DESIGN.w, DESIGN.h, 'portrait');
export function setLayout(W, H, mode) { LAY = computeLayout(W, H, mode); return LAY; }
