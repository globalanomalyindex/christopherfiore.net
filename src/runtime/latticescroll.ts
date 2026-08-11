/**
 * Screen 2b's mosaic, reorganizing rather than travelling.
 *
 * The step machine, the Bayer dissolve and the input handling are not here:
 * they are `runtime/reorganize.ts`, shared with page 02's gallery, and the
 * header of that module is where the idea is written down. What lives here is
 * everything about this reorganize that is about the LATTICE — the rest
 * positions the mosaic can take, the corner pegs that move with the blocks, and
 * the position mark in the field's outermost column.
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
import { type Reorg, type ReorgItem, clampN, clearMask, reorganize } from './reorganize.ts';
import { fitScreen } from './fit.ts';
import { state } from './state.ts';

/** The band the mosaic sits in, in design px. `INDEX_TRACK` supplies it. */
export interface ScrollBand {
  /** viewport top, in stage coordinates */
  readonly y: number;
  /** viewport height */
  readonly h: number;
}

const clamp01 = (n: number): number => clampN(n, 0, 1);

/* ------------------------------------------------------------------ state */

interface Geom {
  el: HTMLElement;
  id: string;
  x: number;
  /** top edge in TRACK coordinates: 0 is the band's own top at position 0 */
  ty: number;
  w: number;
  h: number;
}

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
  /** the committed offset, always one of `snaps` */
  pos: number;
  reorg: Reorg | null;
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
    A corner is placed by `nearestIndex`, which rounds, so it can round up to
    half a step inside the block — far enough to land on the row the meta line's
    occlusion band covers. Without this guard that prints a crosshair straight
    through the label.
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
 * The position, spoken in the field's own language.
 *
 * There is no scrollbar and no thumb. While a step is running, a short run of
 * ink pegs in the lattice's outermost column marks which rest position the
 * mosaic is committed to, so the position is read OFF THE CROSSHAIRS rather
 * than off a widget floating above them. It only ever takes one of a handful of
 * rows, because the mosaic only ever takes one of a handful of positions, and
 * it is dropped at settle so the column returns to ambient.
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
function waveItems(S: Scroller, dir: number): ReorgItem[] {
  const live = S.blocks.filter((g) => inBand(S, g, S.pos));
  const tys = [...new Set(live.map((g) => g.ty))].sort((a, b) => (dir >= 0 ? a - b : b - a));
  return live.map((g) => ({
    el: g.el,
    rank: Math.max(0, tys.indexOf(g.ty)),
    x: g.x,
    y: S.band.y + (g.ty - S.pos),
  }));
}

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
  paintCaret(S);
}

function settle(S: Scroller): void {
  /*
    ORDER MATTERS, and the obvious order is wrong.

    Releasing first and then handing the corners back through the DEBOUNCED
    `scheduleResolve` leaves every block with no corner marks at all for the
    90ms of the debounce, at the end of every single step. It reads as the whole
    mosaic blinking.

    So the corners are re-established SYNCHRONOUSLY before anything is released:
    restore the frames, drop this module's claim on the field, run the resolve
    for real, and only then let the held pegs go.
  */
  dropCaret(S);
  restoreFrames(S);
  setLatticeBusy(S.screen, false);
  solveLattice(S.screen);
  releaseAll(S);
  place(S, false);
}

/* ------------------------------------------------------- show / hide edge */

function show(S: Scroller): void {
  if (S.shown) return;
  S.shown = true;
  // The index always opens at the top. Written here rather than on hide because
  // `transitions.ts` sets `display: none` at the END of the close animation, so
  // a close and re-open inside that window never hides the page and the old
  // position would survive.
  S.reorg?.reset(0);
  S.pos = S.snaps[0] ?? 0;
  S.region.scrollTop = 0;
  dropCaret(S);
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
  S.reorg?.reset(S.reorg.index());
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
 * each offset it is visible at, because a block's address on the lattice is a
 * function of the position and being right at 0 proves nothing about 240. Warns
 * rather than throws: a corner off the lattice is a design bug worth shouting
 * about, not a reason to take the page down.
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
 * Mount the lattice on a screen and wire its mosaic to it.
 *
 * The screen does not have to be in the document yet: `mountLattice` only
 * builds nodes, and everything that measures is deferred to the moment the
 * screen is first displayed. That matters because this is called from the page
 * builder — `runtime/stage.ts` mounts the menu's lattice itself and has no hook
 * for a page's, and the page cannot be reached from outside its own module. If
 * stage.ts ever grows one, move this call there.
 *
 * Markup contract, all of it built by `pages/products.ts`:
 *   [data-ixscroll]  the input surface, sized to the band
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
  // range are unreachable and are dropped, and the range's end is added in case
  // it is not itself a row start.
  const snaps = Array.from(
    new Set(blocks.map((g) => g.ty).filter((y) => y <= over).concat(over)),
  ).sort((a, b) => a - b);

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
    pos: snaps[0] ?? 0,
    reorg: null,
    shown: false,
  };
  SCROLLERS.set(screen, S);

  S.reorg = reorganize({
    region,
    positions: () => S.snaps.length,
    cell: mounted.step,
    // The field's own cell grid starts a half step in, and the speckle has to
    // sit where the crosshairs are.
    phase: mounted.step / 2,
    reduced: () => isReduced(screen),
    claim: () => claim(S),
    commit: (i) => {
      S.pos = S.snaps[i] ?? 0;
      place(S, true);
      paintCaret(S);
    },
    items: (dir) => waveItems(S, dir),
    settle: () => settle(S),
  });

  assertCorners(S);
  watchLattice(screen);

  /*
    The drift, the resolve and the position reset all hang off the hidden →
    shown EDGE, not off every style write. `transitions.ts` also writes
    `clip-path` to this element while the page is up, and resetting on those
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
