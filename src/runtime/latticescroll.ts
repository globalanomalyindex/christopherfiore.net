/**
 * The lattice scroll — screen 2b's mosaic moving through a field that does not.
 *
 * THE IDEA. The lattice is the substrate. It is nailed to the screen, and so
 * are the two rails, the title and the standfirst. Only the block mosaic in the
 * band between the rails moves, and a block does not slide off the edge of that
 * band: it dissolves INTO the field. Its four corner pegs step along the
 * lattice as it travels, the block itself dithers away in Bayer order, and then
 * those pegs go back to ambient. A block arriving from the other side runs the
 * same three beats backwards. Nothing here is on a timer; every value is a
 * function of `scrollTop`, so the effect tracks the wheel exactly and reverses
 * the moment the wheel does.
 *
 * WHY A BLOCK IS EITHER ALL THERE OR ALL GONE. The whole system rests on every
 * frame's four corners landing on a lattice point. A block cut in half by the
 * band's edge has two corners outside the field and cannot satisfy that, so a
 * block is only ever *shown* when it is entirely inside the band. `layout.ts`
 * sizes the mosaic's rows so that every reachable rest position fills the band
 * exactly (240+240+180, 240+180+240, 180+240+240), and the scroll snaps to
 * whole rows rather than to the 60px module, so the "entirely inside" rule
 * never leaves a hole where a row should be.
 *
 * THREE RULES THIS MODULE OWES THE FIELD:
 *
 * · `setLatticeBusy(screen, true)` for the whole gesture. That gates the
 *   resolve, which would otherwise re-light corners at positions the blocks
 *   have already left, and it stops the ambient drift, which would otherwise
 *   repaint the pegs this module is holding. Both come back on settle.
 * · Every peg is put back through `restorePeg`, never by clearing its inline
 *   color — `style.color = ''` inherits near-black and scars the field
 *   permanently.
 * · The track's blocks stop being `[data-frame]` for the duration of a gesture,
 *   and are only restored once they are settled and fully inside the band. A
 *   resolve that ran against a moving block would leave a ghost corner behind.
 */

import { q, qq } from '../dom.ts';
import { PEG_CORNER } from '../design/tokens.ts';
import { type Frame, type LatticeCfg, offLatticeCorners } from '../design/lattice.ts';
import {
  cfgOf,
  mountLattice,
  nearestIndex,
  restorePeg,
  setLatticeBusy,
  solveLattice,
  startDrift,
  stopDrift,
  watchLattice,
} from './lattice.ts';
import { fitScreen } from './fit.ts';
import { state } from './state.ts';

/** The band the mosaic scrolls through, in design px. `INDEX_TRACK` supplies it. */
export interface ScrollBand {
  /** viewport top, in stage coordinates */
  readonly y: number;
  /** viewport height */
  readonly h: number;
  /** how far a block travels past an edge while it dissolves */
  readonly fade: number;
}

/**
 * How long after the last scroll event the field is considered settled.
 *
 * Long enough to cover the browser's own snap animation, which keeps firing
 * scroll events after the wheel has stopped. Too short and the resolve runs
 * against a position the snap is still animating away from.
 */
const SETTLE_MS = 140;

/**
 * The share of the dissolve spent on the corners alone, before the block
 * itself starts to go.
 *
 * The beat sheet is corners, then block, then corners — so the first fifth of
 * the travel is the pegs stepping onto their new points with the block still
 * solid behind them. Without the lead the two happen at once and the corner
 * move is invisible under the dither.
 */
const MASK_LEAD = 0.2;

/** The ordered-dither matrix the rest of the site already uses. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/* ------------------------------------------------------------------- mask */

/**
 * The dissolve, as seventeen static masks rather than an animation.
 *
 * Level `n` keeps the `n` cells of the 4×4 Bayer matrix whose threshold is
 * below `n`, so walking 16 → 0 turns the block off in exactly the order the
 * site's dither turns pixels off. They are data URIs built once and cached,
 * which is what makes this cheap enough to drive off a scroll event: switching
 * levels is one style write, not a repaint of generated geometry.
 *
 * Seventeen discrete steps is also the house easing. A smooth opacity ramp
 * here would read as a fade, and this design does not fade.
 */
const MASKS: string[] = [];

function maskAt(level: number): string {
  const cached = MASKS[level];
  if (cached) return cached;
  let rects = '';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (BAYER4[row * 4 + col] < level) rects += `<rect x="${col}" y="${row}" width="1" height="1"/>`;
    }
  }
  const doc =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" width="4" height="4" ` +
    `shape-rendering="crispEdges" fill="#fff">${rects}</svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(doc)}")`;
  MASKS[level] = url;
  return url;
}

const MASK_PROPS = ['mask-image', 'mask-size', 'mask-repeat', 'mask-position'] as const;

/**
 * Paint the mask, anchored to the LATTICE rather than to the block.
 *
 * One Bayer cell per lattice cell, and the tile's origin pinned to the field's
 * own cell grid (which starts a half step in, at 15). That is the difference
 * between a block dissolving *into the field* and a block carrying its own
 * noise with it: with the tile anchored here the speckle stays where the
 * crosshairs are while the block slides through it.
 */
function setMask(b: HTMLElement, level: number, step: number, x: number, y: number): void {
  const img = maskAt(level);
  const tile = step * 4;
  const ox = (((step / 2 - x) % tile) + tile) % tile;
  const oy = (((step / 2 - y) % tile) + tile) % tile;
  const size = `${tile}px ${tile}px`;
  const pos = `${ox}px ${oy}px`;
  b.style.setProperty('mask-image', img);
  b.style.setProperty('-webkit-mask-image', img);
  b.style.setProperty('mask-size', size);
  b.style.setProperty('-webkit-mask-size', size);
  b.style.setProperty('mask-repeat', 'repeat');
  b.style.setProperty('-webkit-mask-repeat', 'repeat');
  b.style.setProperty('mask-position', pos);
  b.style.setProperty('-webkit-mask-position', pos);
}

function clearMask(b: HTMLElement): void {
  for (const p of MASK_PROPS) {
    b.style.removeProperty(p);
    b.style.removeProperty(`-webkit-${p}`);
  }
}

/* ------------------------------------------------------------------ state */

interface Geom {
  el: HTMLElement;
  id: string;
  x: number;
  /** top edge in TRACK coordinates: 0 is the band's own top at scroll 0 */
  ty: number;
  w: number;
  h: number;
}

interface Scroller {
  screen: HTMLElement;
  band: ScrollBand;
  cfg: LatticeCfg;
  region: HTMLElement;
  thumb: HTMLElement | null;
  blocks: Geom[];
  /** the lattice's flat, row-major cell list */
  cells: HTMLCollection | null;
  /** scroll offsets the band rests on: the start of each mosaic row */
  snaps: number[];
  trackH: number;
  /** lattice indices this module currently holds lit */
  owned: Set<number>;
  settleT: number;
  scrolling: boolean;
  shown: boolean;
}

const SCROLLERS = new WeakMap<HTMLElement, Scroller>();

function isReduced(screen: HTMLElement): boolean {
  const st = screen.closest<HTMLElement>('[data-stage]');
  if (st) return state(st).reduced;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------- pegs */

function cellAt(S: Scroller, i: number): HTMLElement | null {
  const c = S.cells ? S.cells.item(i) : null;
  return c instanceof HTMLElement ? c : null;
}

function lightPeg(S: Scroller, i: number): void {
  const cell = cellAt(S, i);
  if (!cell) return;
  /*
    An occluded point stays occluded, exactly as every other painter here does.
    A travelling corner is placed by `nearestIndex`, which rounds, so mid
    gesture it can round up to half a step inside the block — far enough to
    land on the row the meta line's occlusion band covers. Without this guard
    that prints a crosshair straight through the label while it moves.
  */
  if (cell.dataset.base === 'transparent') return;
  cell.style.color = PEG_CORNER;
  // The same weight `solveLattice` gives a resolved corner, so a peg this
  // module holds and a peg the resolve holds are indistinguishable.
  cell.style.fontSize = `${S.cfg.majorSize + 6}px`;
}

/** Always through `restorePeg`; see the header. */
function dropPeg(S: Scroller, i: number): void {
  const cell = cellAt(S, i);
  if (cell) restorePeg(cell);
}

function releaseAll(S: Scroller): void {
  for (const i of S.owned) dropPeg(S, i);
  S.owned.clear();
}

/* ------------------------------------------------------------------ paint */

/** How far through its dissolve a block is: 0 fully present, 1 fully gone. */
function dissolveOf(S: Scroller, g: Geom, scroll: number): number {
  const top = g.ty - scroll;
  const bot = top + g.h;
  return Math.max(clamp01(-top / S.band.fade), clamp01((bot - S.band.h) / S.band.fade));
}

/**
 * One pass over the mosaic for the current scroll offset.
 *
 * `corners` is false at rest, where the resolve owns the corners and this
 * module must own none, and true during a gesture, where the resolve is gated
 * and the corners have to travel with the blocks.
 */
function paint(S: Scroller, corners: boolean): void {
  const quiet = isReduced(S.screen);
  const scroll = S.region.scrollTop;
  const next = new Set<number>();

  for (const g of S.blocks) {
    const d = dissolveOf(S, g, scroll);
    const b = g.el;

    if (d >= 1) {
      // Gone. `visibility` rather than `display` so nothing reflows on the way
      // back, and because a hidden block must also leave the tab order and stop
      // being hit-testable — `opacity: 0` alone does neither.
      if (b.style.visibility !== 'hidden') {
        b.style.opacity = '0';
        b.style.visibility = 'hidden';
        clearMask(b);
      }
      b.removeAttribute('data-frame');
      continue;
    }

    if (b.style.visibility === 'hidden') {
      b.style.visibility = '';
      b.style.opacity = '';
    }

    if (quiet || d <= 0) clearMask(b);
    else {
      const u = clamp01((d - MASK_LEAD) / (1 - MASK_LEAD));
      setMask(b, Math.round((1 - u) * 16), S.cfg.step, g.x, S.band.y + (g.ty - scroll));
    }

    if (!corners || quiet) continue;
    const y0 = S.band.y + (g.ty - scroll);
    const y1 = y0 + g.h;
    for (const [cx, cy] of [
      [g.x, y0],
      [g.x + g.w, y0],
      [g.x, y1],
      [g.x + g.w, y1],
    ] as [number, number][]) {
      // A corner that has travelled past the band belongs to the pinned chrome's
      // rows, not to this block. Lighting it would print a mark under the rail.
      if (cy < S.band.y - 0.5 || cy > S.band.y + S.band.h + 0.5) continue;
      const i = nearestIndex(S.screen, cx, cy);
      if (i >= 0) next.add(i);
    }
  }

  // Swap ownership rather than clearing and re-lighting: a peg two adjacent
  // blocks share must not blink when only one of them moves.
  for (const i of S.owned) if (!next.has(i)) dropPeg(S, i);
  for (const i of next) if (!S.owned.has(i)) lightPeg(S, i);
  S.owned = next;
}

function updateThumb(S: Scroller): void {
  if (!S.thumb) return;
  const over = S.trackH - S.band.h;
  if (over <= 0) {
    S.thumb.style.display = 'none';
    return;
  }
  const h = Math.max(24, S.band.h * (S.band.h / S.trackH));
  S.thumb.style.display = 'block';
  S.thumb.style.height = `${h}px`;
  S.thumb.style.transform = `translateY(${(clamp01(S.region.scrollTop / over) * (S.band.h - h)).toFixed(1)}px)`;
}

/** Blocks that are settled and wholly inside the band get their frame back. */
function restoreFrames(S: Scroller): void {
  const scroll = S.region.scrollTop;
  for (const g of S.blocks) {
    const top = g.ty - scroll;
    if (top >= -0.5 && top + g.h <= S.band.h + 0.5) g.el.setAttribute('data-frame', g.id);
    else g.el.removeAttribute('data-frame');
  }
}

const nearestSnap = (S: Scroller, v: number): number =>
  S.snaps.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), S.snaps[0] ?? 0);

/* ------------------------------------------------------------------ drive */

function onScroll(S: Scroller): void {
  if (!S.scrolling) {
    S.scrolling = true;
    /*
      Re-resolve the field with the mosaic taken out of it, ONCE, at the top of
      the gesture. Everything left carrying a corner after this is pinned
      chrome, so every peg the mosaic needs from here on is one this module
      lights and this module puts back. Skipping it leaves the corners of the
      block's resting position lit for the whole gesture — a ghost frame around
      nothing.
    */
    for (const g of S.blocks) g.el.removeAttribute('data-frame');
    setLatticeBusy(S.screen, false);
    solveLattice(S.screen);
    setLatticeBusy(S.screen, true);
  }

  paint(S, true);
  updateThumb(S);

  window.clearTimeout(S.settleT);
  S.settleT = window.setTimeout(() => settle(S), SETTLE_MS);
}

function settle(S: Scroller): void {
  /*
    CSS snapping normally lands this exactly, but a scroll driven by focus
    moving into a block, or a fractional device pixel, can leave it a hair off
    a row boundary — and off the boundary means off the lattice. Nudging it is
    cheap; the scroll event it may raise simply runs this again on a position
    that is already correct.
  */
  const want = nearestSnap(S, S.region.scrollTop);
  if (Math.abs(want - S.region.scrollTop) > 0.5) S.region.scrollTop = want;

  S.scrolling = false;

  /*
    ORDER MATTERS, and the obvious order is wrong.

    Releasing first and then handing the corners back through the DEBOUNCED
    `scheduleResolve` leaves every block with no corner marks at all for the
    90ms of the debounce, at the end of every single gesture. It reads as the
    whole mosaic blinking.

    So the corners are re-established SYNCHRONOUSLY before anything is
    released: restore the frames, drop this module's claim on the field, run
    the resolve for real, and only then let the travelling pegs go.
  */
  restoreFrames(S);
  setLatticeBusy(S.screen, false);
  solveLattice(S.screen);
  releaseAll(S);
  paint(S, false);
  updateThumb(S);
}

/* ------------------------------------------------------- show / hide edge */

function show(S: Scroller): void {
  if (S.shown) return;
  S.shown = true;
  window.clearTimeout(S.settleT);
  S.scrolling = false;
  // The index always opens at the top. Written here rather than on hide
  // because `transitions.ts` sets `display: none` at the END of the close
  // animation, so a close and re-open inside that window never hides the page
  // and the old offset would survive.
  S.region.scrollTop = 0;
  releaseAll(S);
  setLatticeBusy(S.screen, false);
  paint(S, false);
  restoreFrames(S);
  updateThumb(S);
  solveLattice(S.screen);
  startDrift(S.screen);
  // Block labels are `[data-fit]`, and a hidden element measures zero, so the
  // boot pass in `fit.ts` skipped every one of them. This is the pass that
  // actually sizes them, and it runs while they are still on the resting face.
  fitScreen(S.screen);
}

function hide(S: Scroller): void {
  if (!S.shown) return;
  S.shown = false;
  window.clearTimeout(S.settleT);
  S.scrolling = false;
  stopDrift(S.screen);
  releaseAll(S);
  setLatticeBusy(S.screen, false);
}

/* ---------------------------------------------------------------- install */

/**
 * Check the one invariant, at every position the band can come to rest on.
 *
 * The pinned chrome is checked where it sits; each mosaic block is checked at
 * each snap offset it is visible at, because a block's address on the lattice
 * is a function of the scroll and being right at scroll 0 proves nothing about
 * scroll 240. Warns rather than throws: a corner off the lattice is a design
 * bug worth shouting about, not a reason to take the page down.
 */
function assertCorners(S: Scroller): void {
  const frames: Frame[] = [];
  for (const g of S.blocks) {
    for (const s of S.snaps) {
      const top = g.ty - s;
      if (top < -0.5 || top + g.h > S.band.h + 0.5) continue;
      frames.push({ id: `${g.id}@${s}`, x: g.x, y: S.band.y + top, w: g.w, h: g.h });
    }
  }
  const bad = offLatticeCorners(S.cfg, frames);
  if (bad.length) console.warn('[latticescroll]', bad.join('; '));
}

/**
 * Mount the lattice on a screen and wire its scrolling mosaic to it.
 *
 * The screen does not have to be in the document yet: `mountLattice` only
 * builds nodes, and everything that measures is deferred to the moment the
 * screen is first displayed. That matters because this is called from the page
 * builder — `runtime/stage.ts` mounts the menu's lattice itself and has no
 * hook for a page's, and the page cannot be reached from outside its own
 * module. If stage.ts ever grows one, move this call there.
 *
 * Markup contract, all of it built by `pages/products.ts`:
 *   [data-ixscroll]  the native scroll container, sized to the band
 *   [data-ixblock]   one per mosaic block, carrying its geometry in data-b*
 *   [data-ixthumb]   optional scroll thumb
 */
export function installLatticeScroll(
  screen: HTMLElement,
  cfg: LatticeCfg,
  band: ScrollBand,
): void {
  if (SCROLLERS.has(screen)) return;

  /*
    Check the markup BEFORE mounting. Bailing after the mount left 2205 peg
    nodes in a screen with nothing driving them, which is a silent failure that
    looks exactly like a working lattice until you try to scroll it.
  */
  const region = q(screen, '[data-ixscroll]');
  if (!region) {
    console.warn('[latticescroll] no [data-ixscroll] on this screen; not mounting');
    return;
  }

  mountLattice(screen, cfg);
  const mounted = cfgOf(screen);
  if (!mounted) return;

  const blocks: Geom[] = qq<HTMLElement>(screen, '[data-ixblock]').map((el) => ({
    el,
    id: el.getAttribute('data-ixblock') || '',
    x: Number(el.dataset.bx),
    ty: Number(el.dataset.by),
    w: Number(el.dataset.bw),
    h: Number(el.dataset.bh),
  }));

  const trackH = blocks.reduce((m, g) => Math.max(m, g.ty + g.h), 0);
  const over = Math.max(0, trackH - band.h);
  // A rest position is the start of a mosaic row. Rows past the end of the
  // scroll range are unreachable and are dropped, and the range's end is added
  // in case it is not itself a row start.
  const snaps = Array.from(new Set(blocks.map((g) => g.ty).filter((y) => y <= over).concat(over)))
    .sort((a, b) => a - b);

  const S: Scroller = {
    screen,
    band,
    cfg: mounted,
    region,
    thumb: q(screen, '[data-ixthumb]'),
    blocks,
    cells: q(screen, '[data-lattice]')?.children ?? null,
    snaps,
    trackH,
    owned: new Set<number>(),
    settleT: 0,
    scrolling: false,
    shown: false,
  };
  SCROLLERS.set(screen, S);

  assertCorners(S);
  watchLattice(screen);

  region.addEventListener('scroll', () => onScroll(S), { passive: true });

  /*
    The drift, the resolve and the scroll reset all hang off the hidden → shown
    EDGE, not off every style write. `transitions.ts` also writes `clip-path`
    to this element while the page is up, and resetting the scroll on those
    would yank the mosaic out from under whoever is reading it.
  */
  const sync = (): void => {
    if (!screen.isConnected) return;
    if (getComputedStyle(screen).display === 'none') hide(S);
    else show(S);
  };
  new MutationObserver(sync).observe(screen, { attributes: true, attributeFilter: ['style'] });
  // One deferred read for the case where the screen is already displayed when
  // it lands in the document; after that the observer carries it.
  window.setTimeout(sync, 0);
}
