/**
 * The lattice scroll — screen 2b's mosaic REORGANIZING rather than travelling.
 *
 * THE IDEA. Nothing on this screen ever moves vertically. Not the lattice, not
 * the rails, not the title, and not the blocks. A scroll gesture does not
 * translate the mosaic by a pixel; it commits the mosaic to a different rest
 * position. The grid comes apart in Bayer order as a wave, every block takes
 * its new address on the lattice in the same frame, and the grid re-forms. The
 * only thing the eye can follow between two positions is the dither, so what it
 * reads is a modular grid rearranging itself to fit the next rows onto the
 * screen, not a page sliding under a window.
 *
 * That is the whole design note, and it is why there is no native scrolling
 * here any more. A native container translates its content, and translation at
 * an arbitrary sub-row offset is exactly the thing this screen is not allowed
 * to show: a block half way between two rest positions has two of its four
 * corners off the lattice, which the whole system rests on. The container is
 * now an input surface with `overflow: hidden`, and the wheel, the arrows and a
 * swipe all resolve to the same thing — a row index.
 *
 * REST POSITIONS ARE THE ONLY POSITIONS. `layout.ts` sizes the mosaic's rows so
 * that every reachable position fills the band exactly (240+240+180,
 * 240+180+240, 180+240+240), so at every index the band is full, no row is cut
 * by an edge, and all four corners of every visible block are on a point. There
 * is no in-between state to get wrong because there is no in-between state.
 *
 * THREE RULES THIS MODULE OWES THE FIELD:
 *
 * · `setLatticeBusy(screen, true)` for the whole step. That gates the resolve,
 *   which would otherwise re-light corners at positions the blocks have already
 *   left, and it stops the ambient drift, which would otherwise repaint the
 *   pegs this module is holding. Both come back on settle.
 * · Every peg is put back through `restorePeg`, never by clearing its inline
 *   color — `style.color = ''` inherits near-black and scars the field
 *   permanently.
 * · The track's blocks stop being `[data-frame]` for the duration of a step,
 *   and are only restored once the field has settled. A resolve that ran
 *   against a block mid-dissolve would leave a ghost corner behind.
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

/** The band the mosaic sits in, in design px. `INDEX_TRACK` supplies it. */
export interface ScrollBand {
  /** viewport top, in stage coordinates */
  readonly y: number;
  /** viewport height */
  readonly h: number;
}

/** One dither beat. Every duration here is a whole number of these. */
const BEAT = 28;

/**
 * The levels the dissolve walks, present to gone.
 *
 * Five steps, not sixteen. The mask is an ordered dither, so a level is a
 * SHAPE and not an opacity, and five distinct shapes is already more than the
 * eye can count at this speed — walking all seventeen would take half a second
 * per row and turn a scroll into a cutscene.
 */
const LEVELS = [16, 11, 7, 3, 0] as const;

/**
 * Beats a row waits before its own dissolve begins.
 *
 * With no lag the whole mosaic blinks at once, which reads as a repaint. With
 * one beat per row it comes apart as a wave running in the direction of
 * travel, which reads as the grid reorganizing — the difference between a
 * glitch and a mechanism.
 */
const ROW_LAG = 1;

/** Wheel travel that commits one row. About one trackpad flick. */
const WHEEL_STEP = 90;

/** The same, for a finger. Shorter, because a swipe is a deliberate gesture. */
const TOUCH_STEP = 56;

/**
 * A tab that has been backgrounded comes back with an enormous elapsed time.
 * Whole-interval advance is what makes this display-independent, so the
 * elapsed time is clamped rather than the loop being allowed to spin through
 * a thousand beats it will never draw.
 */
const MAX_CATCHUP = BEAT * 20;

/** The ordered-dither matrix the rest of the site already uses. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const clampN = (n: number, lo: number, hi: number): number => (n < lo ? lo : n > hi ? hi : n);
const clamp01 = (n: number): number => clampN(n, 0, 1);

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

/** Nothing is drawn between these. `out` takes the grid apart, `in` re-forms it. */
type Phase = 'idle' | 'out' | 'in';

interface Scroller {
  screen: HTMLElement;
  band: ScrollBand;
  cfg: LatticeCfg;
  region: HTMLElement;
  /** lattice indices of the live position mark, empty at rest */
  caret: number[];
  blocks: Geom[];
  /** the lattice's flat, row-major cell list */
  cells: HTMLCollection | null;
  /** the offsets the band rests on: the start of each mosaic row */
  snaps: number[];
  trackH: number;
  /** lattice indices this module currently holds lit */
  owned: Set<number>;
  /** the committed rest position: an index into `snaps`, and its offset */
  row: number;
  pos: number;
  /** where the input wants to be. The ticker chases it. */
  want: number;
  phase: Phase;
  /** beats elapsed in the current phase, and the wall clock they advance on */
  beat: number;
  last: number;
  raf: number;
  /** per-block dissolve order, and the highest rank in play */
  rank: WeakMap<HTMLElement, number>;
  maxRank: number;
  /** accumulated wheel travel and the last touch position */
  acc: number;
  touchY: number;
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

/** Whether a block is wholly inside the band at `pos`. There is no partly. */
const inBand = (S: Scroller, g: Geom, pos: number): boolean =>
  g.ty - pos >= -0.5 && g.ty - pos + g.h <= S.band.h + 0.5;

/**
 * Address every block for `S.pos` and light the corners that go with it.
 *
 * This is the only place a block's `top` is written, and it is only ever
 * written to a rest position, which is what makes "no vertical movement"
 * structural rather than a promise about easing. `corners` is false at rest,
 * where the resolve owns the corners and this module must own none, and true
 * inside a step, where the resolve is gated and the corners belong here.
 */
function place(S: Scroller, corners: boolean): void {
  const quiet = isReduced(S.screen);
  const next = new Set<number>();

  for (const g of S.blocks) {
    const b = g.el;
    const top = g.ty - S.pos;
    b.style.top = `${top}px`;

    if (!inBand(S, g, S.pos)) {
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

    if (!corners || quiet) continue;
    const y0 = S.band.y + top;
    for (const [cx, cy] of [
      [g.x, y0],
      [g.x + g.w, y0],
      [g.x, y0 + g.h],
      [g.x + g.w, y0 + g.h],
    ] as [number, number][]) {
      const i = nearestIndex(S.screen, cx, cy);
      if (i >= 0) next.add(i);
    }
  }

  if (!corners || quiet) {
    for (const i of S.owned) dropPeg(S, i);
    S.owned = new Set<number>();
    return;
  }
  // Swap ownership rather than clearing and re-lighting: a peg two adjacent
  // blocks share must not blink when only one of them changes.
  for (const i of S.owned) if (!next.has(i)) dropPeg(S, i);
  for (const i of next) if (!S.owned.has(i)) lightPeg(S, i);
  S.owned = next;
}

/**
 * Paint the dissolve for one beat of the current phase.
 *
 * A block's level is its phase's level walk offset by its own rank, so the
 * grid comes apart and re-forms as a wave rather than a blink. Level 16 is
 * every Bayer cell kept, which is no mask at all, so it is cleared rather than
 * set — a rest state should cost nothing.
 */
function dither(S: Scroller): void {
  const last = LEVELS.length - 1;
  for (const g of S.blocks) {
    if (!inBand(S, g, S.pos)) continue;
    const k = S.rank.get(g.el) ?? 0;
    const b = S.beat - k * ROW_LAG;
    const li = S.phase === 'out' ? clampN(b, 0, last) : clampN(last - b, 0, last);
    const level = LEVELS[li];
    if (level >= 16) clearMask(g.el);
    else setMask(g.el, level, S.cfg.step, g.x, S.band.y + (g.ty - S.pos));
  }
}

/**
 * The position, spoken in the field's own language.
 *
 * There is no scrollbar and no thumb. While a step is running, a short run of
 * ink pegs in the lattice's outermost column marks which rest position the
 * mosaic is committed to, so the position is read OFF THE CROSSHAIRS rather
 * than off a widget floating above them. It only ever takes one of a handful
 * of rows, because the mosaic only ever takes one of a handful of positions,
 * and it is dropped at settle so the column returns to ambient.
 *
 * The caret never lands on an occluded point, same as every painter here.
 */
const CARET_LEN = 3;

function paintCaret(S: Scroller): void {
  dropCaret(S);

  const over = S.trackH - S.band.h;
  if (over <= 0) return;
  const cfg = S.cfg;
  const col = cfg.cols - 1;
  const rowAt = (y: number): number => Math.round(y / cfg.step) - 1;
  const r0 = rowAt(S.band.y);
  const r1 = rowAt(S.band.y + S.band.h);
  const span = r1 - r0 - (CARET_LEN - 1);
  const top = r0 + Math.round(clamp01(S.pos / over) * span);
  for (let k = 0; k < CARET_LEN; k++) {
    const i = (top + k) * cfg.cols + col;
    const c = cellAt(S, i);
    if (!c || c.dataset.base === 'transparent') continue;
    c.style.color = PEG_CORNER;
    c.style.fontSize = `${cfg.majorSize + 2}px`;
    S.caret.push(i);
  }
}

function dropCaret(S: Scroller): void {
  for (const i of S.caret) {
    const c = cellAt(S, i);
    if (c) restorePeg(c);
  }
  S.caret.length = 0;
}

/** Blocks that are settled and wholly inside the band get their frame back. */
function restoreFrames(S: Scroller): void {
  for (const g of S.blocks) {
    if (inBand(S, g, S.pos)) g.el.setAttribute('data-frame', g.id);
    else g.el.removeAttribute('data-frame');
  }
}

/* ------------------------------------------------------------------ drive */

/**
 * Order the visible rows for the wave, in the direction of travel.
 *
 * Going down, the row that leaves is the one at the top, so the top row goes
 * first and the wave runs downward. Going up it is the other way. The arriving
 * row is ranked last on the same axis, so the out and the in read as one
 * continuous sweep rather than two opposed ones.
 */
function rankRows(S: Scroller, dir: number): void {
  const tys = [...new Set(S.blocks.filter((g) => inBand(S, g, S.pos)).map((g) => g.ty))].sort(
    (a, b) => (dir >= 0 ? a - b : b - a),
  );
  S.rank = new WeakMap<HTMLElement, number>();
  S.maxRank = Math.max(0, tys.length - 1);
  for (const g of S.blocks) {
    if (!inBand(S, g, S.pos)) continue;
    S.rank.set(g.el, Math.max(0, tys.indexOf(g.ty)));
  }
}

/** Beats a phase runs for: the level walk, plus the wave's own tail. */
const phaseBeats = (S: Scroller): number => LEVELS.length - 1 + S.maxRank * ROW_LAG;

/**
 * Take the field, once, at the top of a step.
 *
 * Everything left carrying a corner after this is pinned chrome, so every peg
 * the mosaic needs from here on is one this module lights and this module puts
 * back. Skipping it leaves the corners of the old position lit for the whole
 * step — a ghost frame around nothing.
 */
function claim(S: Scroller): void {
  for (const g of S.blocks) g.el.removeAttribute('data-frame');
  setLatticeBusy(S.screen, false);
  solveLattice(S.screen);
  setLatticeBusy(S.screen, true);
}

/** Move the target. The ticker chases it, so a fast gesture simply lands further. */
function goTo(S: Scroller, row: number): void {
  const want = clampN(row, 0, S.snaps.length - 1);
  if (want === S.want && S.phase === 'idle') return;
  S.want = want;
  if (S.phase !== 'idle') return;
  if (want === S.row) return;

  if (isReduced(S.screen)) {
    // No dissolve to watch, so there is nothing to sequence: take the position
    // and settle in the same turn.
    claim(S);
    S.row = want;
    S.pos = S.snaps[want];
    place(S, true);
    settle(S);
    return;
  }

  claim(S);
  rankRows(S, want > S.row ? 1 : -1);
  S.phase = 'out';
  S.beat = 0;
  S.last = performance.now();
  dither(S);
  paintCaret(S);
  run(S);
}

/** Everything gone: take the new address, then start the grid re-forming. */
function commit(S: Scroller): void {
  const dir = S.want > S.row ? 1 : -1;
  S.row = S.want;
  S.pos = S.snaps[S.row];
  place(S, true);
  rankRows(S, dir);
  S.phase = 'in';
  S.beat = 0;
  paintCaret(S);
  dither(S);
}

/**
 * One beat.
 *
 * Whole intervals against the wall clock, never a snap to `now`, so the step
 * takes the same time on a 60Hz panel and a 120Hz one and the dither lands on
 * the same beats on both.
 */
function advance(S: Scroller): void {
  if (S.phase === 'out' && S.beat > phaseBeats(S)) {
    commit(S);
    return;
  }
  if (S.phase === 'in' && S.beat > phaseBeats(S)) {
    // A gesture that kept going while this one ran: straight into the next
    // step, from a grid that is already fully formed.
    if (S.want !== S.row) {
      rankRows(S, S.want > S.row ? 1 : -1);
      S.phase = 'out';
      S.beat = 0;
      dither(S);
      return;
    }
    settle(S);
    return;
  }
  dither(S);
}

function run(S: Scroller): void {
  if (S.raf) return;
  const loop = (now: number): void => {
    S.raf = 0;
    if (now - S.last > MAX_CATCHUP) S.last = now - BEAT;
    let ran = false;
    while (now - S.last >= BEAT) {
      S.last += BEAT;
      S.beat += 1;
      ran = true;
    }
    if (ran) advance(S);
    if (S.phase !== 'idle') S.raf = requestAnimationFrame(loop);
  };
  S.raf = requestAnimationFrame(loop);
}

function settle(S: Scroller): void {
  S.phase = 'idle';
  S.beat = 0;
  if (S.raf) cancelAnimationFrame(S.raf);
  S.raf = 0;
  for (const g of S.blocks) clearMask(g.el);

  /*
    ORDER MATTERS, and the obvious order is wrong.

    Releasing first and then handing the corners back through the DEBOUNCED
    `scheduleResolve` leaves every block with no corner marks at all for the
    90ms of the debounce, at the end of every single step. It reads as the
    whole mosaic blinking.

    So the corners are re-established SYNCHRONOUSLY before anything is
    released: restore the frames, drop this module's claim on the field, run
    the resolve for real, and only then let the held pegs go.
  */
  dropCaret(S);
  restoreFrames(S);
  setLatticeBusy(S.screen, false);
  solveLattice(S.screen);
  releaseAll(S);
  place(S, false);
}

/* ------------------------------------------------------------------ input */

/**
 * Wheel, arrows and swipe all resolve to the same thing: a row index.
 *
 * The container does not scroll — it cannot, it is `overflow: hidden` — so the
 * wheel is accumulated against a threshold instead. `deltaMode` is normalized
 * because a mouse wheel on some platforms reports lines and some report pages,
 * and a threshold in pixels has to be given pixels.
 */
function wheelPx(e: WheelEvent, bandH: number): number {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * bandH;
  return e.deltaY;
}

function wire(S: Scroller): void {
  const r = S.region;

  r.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      S.acc += wheelPx(e, S.band.h);
      if (Math.abs(S.acc) < WHEEL_STEP) return;
      const dir = S.acc > 0 ? 1 : -1;
      S.acc = 0;
      goTo(S, (S.phase === 'idle' ? S.row : S.want) + dir);
    },
    { passive: false },
  );

  r.addEventListener(
    'touchstart',
    (e) => {
      S.touchY = e.touches[0]?.clientY ?? 0;
      S.acc = 0;
    },
    { passive: true },
  );

  r.addEventListener(
    'touchmove',
    (e) => {
      const y = e.touches[0]?.clientY ?? S.touchY;
      e.preventDefault();
      S.acc += S.touchY - y;
      S.touchY = y;
      if (Math.abs(S.acc) < TOUCH_STEP) return;
      const dir = S.acc > 0 ? 1 : -1;
      S.acc = 0;
      goTo(S, (S.phase === 'idle' ? S.row : S.want) + dir);
    },
    { passive: false },
  );

  /*
    The keys a scroll container gives for free, given back by hand. The region
    is `tabindex="0"` and announces itself as scrollable, so a keyboard visitor
    who lands on it has to be able to move it — and a page here is one row,
    because a row is the only thing this screen can be at.
  */
  r.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const at = S.phase === 'idle' ? S.row : S.want;
    let to = at;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') to = at + 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') to = at - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = S.snaps.length - 1;
    else return;
    e.preventDefault();
    goTo(S, to);
  });

  /*
    Belt and braces. `overflow: hidden` still leaves a box the browser may
    scroll programmatically, and one pixel of that would put every visible
    block's four corners off the lattice with nothing to put them back.
  */
  r.addEventListener(
    'scroll',
    () => {
      if (r.scrollTop !== 0) r.scrollTop = 0;
    },
    { passive: true },
  );
}

/* ------------------------------------------------------- show / hide edge */

function show(S: Scroller): void {
  if (S.shown) return;
  S.shown = true;
  if (S.raf) cancelAnimationFrame(S.raf);
  S.raf = 0;
  S.phase = 'idle';
  S.acc = 0;
  // The index always opens at the top. Written here rather than on hide
  // because `transitions.ts` sets `display: none` at the END of the close
  // animation, so a close and re-open inside that window never hides the page
  // and the old position would survive.
  S.row = 0;
  S.want = 0;
  S.pos = S.snaps[0] ?? 0;
  S.region.scrollTop = 0;
  dropCaret(S);
  for (const g of S.blocks) clearMask(g.el);
  releaseAll(S);
  setLatticeBusy(S.screen, false);
  place(S, false);
  restoreFrames(S);
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
  if (S.raf) cancelAnimationFrame(S.raf);
  S.raf = 0;
  S.phase = 'idle';
  stopDrift(S.screen);
  dropCaret(S);
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
    caret: [],
    blocks,
    cells: q(screen, '[data-lattice]')?.children ?? null,
    snaps,
    trackH,
    owned: new Set<number>(),
    row: 0,
    pos: snaps[0] ?? 0,
    want: 0,
    phase: 'idle',
    beat: 0,
    last: 0,
    raf: 0,
    rank: new WeakMap<HTMLElement, number>(),
    maxRank: 0,
    acc: 0,
    touchY: 0,
    shown: false,
  };
  SCROLLERS.set(screen, S);

  assertCorners(S);
  watchLattice(screen);
  wire(S);

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
