/**
 * The four per-channel menu hover personalities, expressed in the lattice.
 *
 * Each channel behaves in character; a generic hover on any of them reads as
 * unfinished. What changed with the redesign is the medium, not the character:
 * the personalities used to be CSS custom properties driving background
 * gradients on the cell, and they are now crosshairs switched on and off in the
 * screen's lattice.
 *
 *   01 product designs — prodOn / prodOff / scafMove
 *      a radial flood out of the module the cursor entered, a fully lit ink row
 *      and column through the cursor's cell, and the `col NN · row NN` callout.
 *      All of it moves on `pointermove` and on nothing else.
 *   02 paintings       — waterOn / waterOff
 *      a one-cell-thick ink ring just inside the block, with the interior
 *      dithering in the fill hue and breathing under a held flicker.
 *   03 competizione    — sweepOn / sweepOff
 *      a lap: an ink road course laid around the word, and one crosshair
 *      driving it like a car, trailing the fill hue. It steps peg to peg every
 *      95ms, about 2.3s a lap. Occluded points are skipped without skipping
 *      the position, so a course that did run under type would pass behind it.
 *   04 contact         — invertOn / invertOff
 *      inversion: a near-black band, paper type and paper crosshairs, and the
 *      frame corners flipped to paper so they survive the band.
 *
 * FOUR THINGS HERE ARE LOAD-BEARING AND EASY TO UNDO BY ACCIDENT.
 *
 * · A peg is only ever painted after `fillFor` has CLAIMED it. Claimed points
 *   are the ones the drift skips and the ones `releaseFor` puts back, so a peg
 *   coloured outside that set is wiped by the next drift tick and never
 *   restored. Every channel therefore claims the points it means to drive
 *   before it drives them. The frame corners are the one exception: they are
 *   kept out of every claim so they simply hold, and 04 puts them back by hand.
 * · A peg is never restored by clearing its inline colour. `restorePeg` writes
 *   the value the resolve pass left on the element; `style.color = ''` inherits
 *   near-black and scars the field permanently.
 * · The lattice is held BUSY for the length of a hover. `watchLattice` re-solves
 *   on any node or text change inside the screen, and this file adds nodes (the
 *   band, the callout) — without the hold, a resolve would land mid-hover and
 *   repaint every point from its resting state, taking the fill with it. The
 *   hold is refcounted because pointer and keyboard focus can hold two cells at
 *   once, and the resolve is re-scheduled on the last release.
 * · The legibility contract. The band under a label is always from
 *   `SPARK_LIGHTS` and the ink on it is always `COLOR.nearBlack`; the darker
 *   `SPARK` accents are capped at 8% of the height so no accent row can slide
 *   under a line of type. 03's circuit obeys the same rule from the other side:
 *   it is routed through the rows and columns the label does not reach, and a
 *   point it does reach is skipped rather than painted.
 */

import { COLOR, FONT, LIGHTS, SPARK, SPARK_LIGHTS, rgba } from '../design/tokens';
import { MENU_FRAMES } from '../design/layout';
import { css, el, q, qq } from '../dom';
import {
  type Rect,
  cellsInRect,
  cfgOf,
  crossAt,
  fillFor,
  latticeOf,
  nearestIndex,
  holdLattice,
  latticeHeld,
  releaseFor,
  restorePeg,
  scheduleResolve,
} from './lattice';
import { state } from './state';

/* ------------------------------------------------------------------ shared */

/** The ordered-dither matrix the rest of the site already uses. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Normalized Bayer threshold for a point, 0…1. */
const bayer = (col: number, row: number): number =>
  (BAYER4[(row % 4) * 4 + (col % 4)] + 0.5) / 16;

const rnd = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

/**
 * A colour from `pool` that is not one of `not`.
 *
 * The crosshair fill and the band it lands on are chosen independently, and
 * independently means they can collide: a yellow fill on a yellow band is a
 * fill nobody can see, and the block reads as though the lattice did nothing.
 * Eight tries is plenty against pools of eleven and fourteen, and falling
 * through to a random member is the right failure — a repeat looks like a plain
 * band, not like a fault.
 */
function apart(pool: readonly string[], ...not: string[]): string {
  for (let i = 0; i < 8; i++) {
    const c = rnd(pool);
    if (!not.includes(c)) return c;
  }
  return rnd(pool);
}

/**
 * The vivid half of the band pool, derived rather than listed.
 *
 * The design asks the lattice fill for "one hue from HUES", and `HUES` is not
 * exported — but `SPARK_LIGHTS` is every band that may carry type and `LIGHTS`
 * is the neutral half of it, so the difference is exactly the vivid hues that
 * clear the contrast filter. Deriving it means a hue added to the palette
 * reaches this fill for free, and a hand-picked list would not.
 */
const FILL_HUES: readonly string[] = SPARK_LIGHTS.filter((c) => !LIGHTS.includes(c));

/**
 * How long `fillFor`'s reveal ramp keeps writing.
 *
 * The ramp climbs 0.17 every 40ms against a threshold that tops out just under
 * 0.95, so it is done inside six steps. 01 and 03 re-assert their pattern once
 * afterwards, because a cursor that enters and then holds perfectly still would
 * otherwise be left looking at the flat reveal rather than the personality.
 */
const REVEAL = 280;

const screenOf = (cell: HTMLElement): HTMLElement | null =>
  cell.closest<HTMLElement>('[data-menu]');

const stageOf = (cell: HTMLElement): HTMLElement | null =>
  cell.closest<HTMLElement>('[data-stage]');

function reducedFor(cell: HTMLElement): boolean {
  const stage = stageOf(cell);
  return stage ? state(stage).reduced : false;
}

function setHovered(cell: HTMLElement, n: number | null, channel: number): void {
  const stage = stageOf(cell);
  if (!stage) return;
  const s = state(stage);
  // leaving only clears the field if this channel is still the one that owns it
  if (n === null && s.hovered !== channel) return;
  s.hovered = n;
}

/**
 * The cell's frame, in design px, read from the table rather than measured.
 *
 * `cellsInRect` bounds with `ceil`/`floor`, so a rect that arrives a
 * hundredth of a pixel large from `getBoundingClientRect()` through the stage's
 * fractional scale drops a whole column of points. The authored numbers land on
 * the module exactly, which is the whole reason they are authored.
 */
function rectOf(cell: HTMLElement): Rect | null {
  const id = cell.getAttribute('data-frame');
  const f = MENU_FRAMES.find((m) => m.id === id);
  return f ? { x: f.x, y: f.y, w: f.w, h: f.h } : null;
}

/* --------------------------------------------------------------- the hold */

/**
 * Claim the field for the length of a hover.
 *
 * Two cells can be held at once — the pointer on one and keyboard focus on
 * another — and the second to leave owns the re-solve.
 *
 * This delegates to the lattice's own refcount rather than keeping a private
 * one. It used to keep a local count and push a BOOLEAN down, which meant the
 * open transition and a channel hover could not both hold the field: the
 * transition claimed it at t0, its own synthetic pointerout made this release,
 * and the boolean went false under the transition. One counter, one owner list.
 */
function hold(screen: HTMLElement, delta: number): number {
  return holdLattice(screen, delta);
}

/* -------------------------------------------------------------- the pegs */

/**
 * Walk every point in a rect.
 *
 * `latticeOf` is the only way to reach a point's element, and a point's element
 * is what `restorePeg` takes. Nothing else in the lattice's internals is read
 * here, and nothing is written to them.
 */
function eachPeg(
  screen: HTMLElement,
  r: Rect,
  fn: (peg: HTMLElement, col: number, row: number, idx: number) => void,
): void {
  const cfg = cfgOf(screen);
  const L = latticeOf(screen);
  if (!cfg || !L) return;
  for (const i of cellsInRect(screen, r)) {
    const peg = L.cells[i];
    if (peg) fn(peg, i % cfg.cols, (i / cfg.cols) | 0, i);
  }
}

/** Light one claimed point. */
function paintPeg(peg: HTMLElement, color: string, size: number): void {
  peg.style.color = color;
  peg.style.fontSize = `${size}px`;
}

/**
 * The frame corners inside a rect, as a `skip` set for `fillFor`.
 *
 * A corner is drawn at major + 6 and in ink, and a fill would take it down to
 * the fill size and the fill's hue — dropping the one mark the entire system
 * rests on for as long as the cursor is inside. Keeping corners out of every
 * claim means they simply hold their resolved state through a hover, and it is
 * also why the drift cannot disturb them: the drift only touches points whose
 * resolved value is the ambient one.
 */
function cornerSet(screen: HTMLElement, r: Rect): Set<number> {
  const out = new Set<number>();
  eachPeg(screen, r, (peg, _col, _row, idx) => {
    if (peg.dataset.corner) out.add(idx);
  });
  return out;
}

/**
 * Write a block's corners directly.
 *
 * Only channel 04 needs this: ink on a near-black band is not a corner, it is
 * a hole, so its four corners take paper for as long as the band is up. With
 * no colour it puts them back, which is what the leave does — nothing else
 * restores them, because they were never claimed.
 */
function holdCorners(screen: HTMLElement, r: Rect, color?: string): void {
  eachPeg(screen, r, (peg) => {
    if (!peg.dataset.corner) return;
    restorePeg(peg);
    if (color) peg.style.color = color;
  });
}

/* -------------------------------------------------------------- the band */

/** Wipe-in start clips. Two are partial (62%) so some layers only half travel. */
const WIPE_IN = [
  'inset(0 100% 0 0)',
  'inset(0 0 0 100%)',
  'inset(100% 0 0 0)',
  'inset(0 0 100% 0)',
  'inset(0 62% 0 0)',
  'inset(0 0 0 62%)',
] as const;

/** Wipe-out end clips. */
const WIPE_OUT = [
  'inset(0 0 0 100%)',
  'inset(0 100% 0 0)',
  'inset(0 0 100% 0)',
  'inset(100% 0 0 0)',
] as const;

interface BandSpec {
  /** The band the type sits on. Always from SPARK_LIGHTS. */
  main: string;
  /** The edge accent. Never carries type, so it may come from all of SPARK. */
  accent: string;
  /** The one border every hover has now: a 1.5px inset outline. */
  outline: string;
  /** One full-height band, no accents and no wipe. */
  flat: boolean;
}

/**
 * Paint the band for a channel cell.
 *
 * It goes in the screen-level band host, which sits at z 0 UNDER the lattice,
 * so the crosshairs stay visible over a vivid band. That is the whole reason
 * the host is a screen-level element rather than a child of the button.
 *
 * The accent rows are capped at 8% of the height. The old 56–80% main band let
 * an accent fall under a two-line block's meta line, where near-black ink on a
 * near-black accent is invisible.
 */
function bandOn(cell: HTMLElement, screen: HTMLElement, r: Rect, spec: BandSpec): HTMLElement {
  const host = q<HTMLElement>(screen, '[data-bandhost]') ?? screen;
  const box = el('span', {
    'data-chband': cell.getAttribute('data-frame'),
    'aria-hidden': 'true',
    style: css({
      display: 'block',
      position: 'absolute',
      left: r.x,
      top: r.y,
      width: r.w,
      height: r.h,
      'z-index': '0',
      'pointer-events': 'none',
    }),
  });

  const rows: [number, number, string][] = [];
  if (spec.flat) {
    rows.push([0, 100, spec.main]);
  } else {
    const top = 2 + Math.random() * 6;
    const bot = 2 + Math.random() * 6;
    rows.push([0, top, spec.accent]);
    rows.push([top, 100 - top - bot, spec.main]);
    rows.push([100 - bot, bot, spec.accent]);
  }

  const parts: HTMLElement[] = [];
  for (const [y, h, col] of rows) {
    const d = el('span', {
      style: css({
        display: 'block',
        position: 'absolute',
        left: '0',
        width: '100%',
        top: `${y.toFixed(2)}%`,
        height: `${h.toFixed(2)}%`,
        background: col,
      }),
    });
    box.appendChild(d);
    parts.push(d);
  }

  // No corner ticks: the lattice provides the corners, and drawing them twice
  // puts a hand-authored mark a fraction off the peg it is supposed to be.
  const ol = el('span', {
    style: css({
      display: 'block',
      position: 'absolute',
      inset: '0',
      'box-shadow': `inset 0 0 0 1.5px ${spec.outline}`,
    }),
  });
  box.appendChild(ol);
  parts.push(ol);

  host.appendChild(box);

  if (!spec.flat) {
    for (const d of parts) {
      const jx = Math.random() * 15 - 7.5; // ±7.5px jitter
      d.animate(
        [
          { clipPath: rnd(WIPE_IN), transform: `translateX(${jx.toFixed(1)}px)`, offset: 0 },
          {
            clipPath: 'inset(0 0 0 0)',
            transform: `translateX(${(jx / 2.6).toFixed(1)}px)`,
            offset: 0.55,
          },
          { clipPath: 'inset(0 0 0 0)', transform: 'none', offset: 1 },
        ],
        {
          duration: 150 + Math.random() * 170,
          delay: Math.random() * 140,
          easing: 'steps(5,end)',
          fill: 'both',
        },
      );
    }
  }

  return box;
}

/** Reverse-wipe the band out and drop it. */
function bandOff(box: HTMLElement | null, flat: boolean): void {
  if (!box) return;
  if (flat) {
    box.remove();
    return;
  }
  const parts = qq<HTMLElement>(box, ':scope > span');
  let done = 0;
  for (const d of parts) {
    const a = d.animate(
      [
        { clipPath: 'inset(0 0 0 0)', transform: 'none' },
        {
          clipPath: rnd(WIPE_OUT),
          transform: `translateX(${(Math.random() * 11 - 5.5).toFixed(1)}px)`,
        },
      ],
      {
        duration: 110 + Math.random() * 130,
        delay: Math.random() * 100,
        easing: 'steps(4,end)',
        fill: 'both',
      },
    );
    a.onfinish = () => {
      if (++done >= parts.length) box.remove();
    };
  }
  if (!parts.length) box.remove();
}

/* ---------------------------------------------------------------- the ink */

/**
 * Pin the label to one ink while the band is up, and put the originals back on
 * leave.
 *
 * Every descendant carrying its OWN inline colour is pinned, not just the
 * button: the 13px channel number is set to `inkSoft` inline, and an inline
 * declaration beats the colour inherited from the button, so it would drop out
 * over the band.
 */
const PINNED = new WeakMap<HTMLElement, Map<HTMLElement, string>>();

function pinInk(cell: HTMLElement, color: string): void {
  const saved = new Map<HTMLElement, string>();
  saved.set(cell, cell.style.color);
  cell.style.color = color;
  for (const n of qq<HTMLElement>(cell, '*')) {
    if (!n.style.color) continue;
    saved.set(n, n.style.color);
    n.style.color = color;
  }
  PINNED.set(cell, saved);
}

function unpinInk(cell: HTMLElement): void {
  const saved = PINNED.get(cell);
  if (!saved) return;
  for (const [node, prev] of saved) {
    if (prev) node.style.color = prev;
    else node.style.removeProperty('color');
  }
  PINNED.delete(cell);
}

/* ------------------------------------------------------------ the record */

interface Chan {
  /** Bumped on every enter, so a deferred pass cannot fire into a newer hover. */
  gen: number;
  hue: string;
  accent: string;
  band: HTMLElement | null;
  flat: boolean;
  stopFlicker: (() => void) | null;
  /** 03's marching beat. */
  beat: number;
  phase: number;
  /** The one-shot that re-asserts a pattern once the reveal ramp is done. */
  settle: number;
  /** The one-shot that sweeps up after a hover cut short mid-reveal. */
  tail: number;
  /** 01's callout, and the last pointer position that placed it, in design px. */
  callout: HTMLElement | null;
  px: number;
  py: number;
  /** The callout's measured ink box, design px. Zero means "measure me". */
  cw: number;
  ch: number;
  /** The cell's type band, cell-local design px, measured once per hover. */
  bandT: number;
  bandB: number;
  /**
   * This channel's whole lattice paint, so a cell still held elsewhere can be
   * put back after a screen-wide `releaseFor`.
   */
  repaint: (() => void) | null;
}

const CHANS = new WeakMap<HTMLElement, Chan>();

function chanOf(cell: HTMLElement): Chan {
  let c = CHANS.get(cell);
  if (!c) {
    c = {
      gen: 0,
      hue: SPARK_LIGHTS[0],
      accent: SPARK[0],
      band: null,
      flat: false,
      stopFlicker: null,
      beat: 0,
      phase: 0,
      settle: 0,
      tail: 0,
      callout: null,
      px: 0,
      py: 0,
      cw: 0,
      ch: 0,
      bandT: 0,
      bandB: 0,
      repaint: null,
    };
    CHANS.set(cell, c);
  }
  return c;
}

/** Cells currently held by a pointer or by focus, on any screen. */
const ACTIVE = new Set<HTMLElement>();

interface Ctx {
  screen: HTMLElement;
  rect: Rect;
  rec: Chan;
}

/**
 * The half of a hover every channel shares: claim the field, paint the band,
 * pin the ink.
 *
 * `invert` is channel 04's whole personality, so it is a parameter here rather
 * than a fifth code path: the band becomes one near-black plate, the outline
 * becomes paper at half alpha, and the type flips to paper.
 */
function begin(cell: HTMLElement, n: number, invert: boolean): Ctx | null {
  setHovered(cell, n, n);
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  if (!screen || !rect) return null;

  const rec = chanOf(cell);
  rec.gen += 1;
  rec.phase = 0;
  window.clearTimeout(rec.tail);
  rec.tail = 0;
  ACTIVE.add(cell);
  hold(screen, 1);

  // The band first, then the crosshairs that have to be seen against it.
  const main = invert ? COLOR.nearBlack : rnd(SPARK_LIGHTS);
  rec.hue = invert ? COLOR.paper : apart(FILL_HUES, main);
  rec.accent = invert ? COLOR.paper : apart(SPARK_LIGHTS, main, rec.hue);
  rec.flat = invert || reducedFor(cell);

  rec.band = bandOn(cell, screen, rect, {
    main,
    // The band's own edge rows may come from all of SPARK, darks included: they
    // are 8% of the height at most and no type ever sits on them.
    accent: invert ? COLOR.nearBlack : rnd(SPARK),
    outline: invert ? rgba(COLOR.paper, 0.5) : COLOR.nearBlack,
    flat: rec.flat,
  });
  pinInk(cell, invert ? COLOR.paper : COLOR.nearBlack);

  return { screen, rect, rec };
}

/** The other half: stop everything, put every point back, let the field resolve. */
function end(cell: HTMLElement, n: number): void {
  setHovered(cell, null, n);
  const rec = chanOf(cell);
  rec.gen += 1;

  window.clearInterval(rec.beat);
  rec.beat = 0;
  window.clearTimeout(rec.settle);
  rec.settle = 0;
  rec.stopFlicker?.();
  rec.stopFlicker = null;
  rec.callout?.remove();
  rec.callout = null;
  rec.repaint = null;

  unpinInk(cell);
  bandOff(rec.band, rec.flat);
  rec.band = null;

  ACTIVE.delete(cell);
  const screen = screenOf(cell);
  if (!screen) return;

  releaseFor(screen);
  // Corners are never claimed, so the release does not reach them. Only 04
  // moves them, but restoring unconditionally costs four writes and means the
  // leave path does not have to know which channel it is leaving.
  const rect = rectOf(cell);
  if (rect) holdCorners(screen, rect);
  // `releaseFor` is screen-wide, so a channel still held by keyboard focus has
  // just lost its fill along with this one. Painting it again is also what
  // re-claims its points: a point outside the lit set is not restored by the
  // next release and is overwritten by the next drift tick.
  for (const other of ACTIVE) {
    if (screenOf(other) === screen) chanOf(other).repaint?.();
  }
  // The refcount, not this call, decides whether the field is free: while
  // another cell is still held the resolve stays gated and would only repaint
  // over its fill.
  hold(screen, -1);
  scheduleResolve(screen);

  /*
    One sweep-up pass, and it is not belt and braces.

    `fillFor`'s reveal is a chain of 40ms timeouts with no cancel, so a hover
    that ends inside the reveal leaves a chain still running: it lights points
    AFTER the release has put them back, and those points are lit, skipped by
    the drift and restored by nobody. Releasing once more past the longest a
    reveal can run is what closes that window. It is skipped while any cell on
    this screen is still held, because a release is screen-wide and would take
    that cell's fill with it.
  */
  const gen = rec.gen;
  window.clearTimeout(rec.tail);
  rec.tail = window.setTimeout(() => {
    if (chanOf(cell).gen !== gen) return;
    for (const other of ACTIVE) if (screenOf(other) === screen) return;
    /*
      And not while something else owns the field.

      The open transition stands this channel's hover down at t0 by dispatching
      a pointerout, which arms this tail. 340ms later it fired a SCREEN-WIDE
      release straight through the middle of the transition's own beat-0 fill
      and blanked it for the next 280ms of a 3.3 second run. Every mouse-driven
      open of channels 01 to 03 hit it.

      `latticeHeld` is the transition's own busy flag, so this reads as: the
      sweep-up is mine to do only while the field is still mine.
    */
    if (latticeHeld(screen)) return;
    releaseFor(screen);
    scheduleResolve(screen);
  }, REVEAL + 60);
}

/**
 * `prodOn` needs the pointer position but the contract hands it only the cell,
 * so the last pointer position is tracked document-wide. `pointerover` bubbles
 * and is dispatched before the target's `pointerenter`, so the position is
 * always current by the time a channel's enter handler runs.
 */
let ptrX = 0;
let ptrY = 0;
let ptrSeen = false;
if (typeof document !== 'undefined') {
  const rec = (e: PointerEvent): void => {
    ptrX = e.clientX;
    ptrY = e.clientY;
    ptrSeen = true;
  };
  document.addEventListener('pointerover', rec, { capture: true, passive: true });
  document.addEventListener('pointermove', rec, { capture: true, passive: true });
}

/** Client px → the screen's own 1920 × 1080 design space. */
function designXY(screen: HTMLElement, clientX: number, clientY: number): [number, number] {
  const r = screen.getBoundingClientRect();
  const k = (r.width || 1920) / 1920;
  return [(clientX - r.left) / k, (clientY - r.top) / k];
}

/* ------------------------------------------- 01 · Product designs — the grid */

/** Two zero-padded digits, 1-based, as the callout has always printed them. */
const pad2 = (n: number): string => String(n + 1).padStart(2, '0');

/**
 * The callout's offset from its module's corner, and the clearance it asks the
 * field for on top of its own measured ink.
 *
 * The box used to be a constant 132 × 18, which was wrong twice. The string is
 * set in the display face, not a monospace, so fifteen characters measure about
 * 90 design px — the constant cleared forty px of crosshairs that nothing was
 * printed on, and read as a hole punched in the flood. And a fixed box says
 * nothing about where the LABEL is, which is the other half of the problem
 * below.
 *
 * `pad` is half a peg glyph either side, the same clearance the resolve pass
 * gives every other run of type on the screen.
 */
const CALLOUT = { dx: 10, dy: 10, pad: 10, gap: 8 } as const;

/**
 * The cell's own type, as a band in cell-local design px.
 *
 * The channel number and the 48px label are both centered on the frame, so on
 * a two-module block the second module row starts INSIDE the label — which is
 * exactly where the callout was landing, printing `col 02 · row 02` through
 * the middle of "product designs". Measured rather than assumed, because the
 * label is fitted at runtime and its height is not knowable from the table.
 */
function typeBand(cell: HTMLElement, screen: HTMLElement): [number, number] {
  const k = (screen.getBoundingClientRect().width || 1920) / 1920;
  const c = cell.getBoundingClientRect();
  let t = Infinity;
  let b = -Infinity;
  for (const n of qq<HTMLElement>(cell, '[data-chnum],[data-chlabel]')) {
    const r = n.getBoundingClientRect();
    if (!r.height) continue;
    t = Math.min(t, (r.top - c.top) / k);
    b = Math.max(b, (r.bottom - c.top) / k);
  }
  return t <= b ? [t, b] : [0, 0];
}

/**
 * The band's edge accents are capped at 8% of the height, and they are the one
 * place on this screen type may not go: they are drawn from all of SPARK,
 * darks included, precisely because nothing reads on them. The callout sits in
 * the first module, so without this it lands on the top accent every time.
 */
const ACCENT_CAP = 0.08;

/**
 * Repaint 01 from the current pointer position.
 *
 * Three things at once, and none of them on a timer:
 *
 *   · the radial flood, thresholded at the coefficients the design specifies —
 *     `distance/maxDistance × 0.86 + bayer × 0.13` against a cut of 0.86, which
 *     is the radial coefficient itself. The block fills except for a dithered
 *     shell at the far edge, and that shell swings around the cursor as it
 *     moves.
 *   · the cursor scaffolding: a fully lit ink row and column through the
 *     cursor's own cell, bounded to the block.
 *   · the `col NN · row NN` callout, naming the module the cursor is in.
 */
function prodMask(cell: HTMLElement): void {
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  const cfg = screen ? cfgOf(screen) : null;
  if (!screen || !rect || !cfg) return;
  const rec = chanOf(cell);

  const md = cfg.step * cfg.major; // the 120px module
  const cols = Math.max(1, Math.round(rect.w / md));
  const rows = Math.max(1, Math.round(rect.h / md));
  const mcol = Math.max(0, Math.min(cols - 1, Math.floor((rec.px - rect.x) / md)));
  const mrow = Math.max(0, Math.min(rows - 1, Math.floor((rec.py - rect.y) / md)));
  const ox = rect.x + mcol * md + md / 2;
  const oy = rect.y + mrow * md + md / 2;

  // Normalize against the furthest corner of the block, so the flood always
  // reaches the far edge whichever module the cursor entered on.
  let maxD = 1;
  for (const [cx, cy] of [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h],
  ]) {
    maxD = Math.max(maxD, Math.hypot(cx - ox, cy - oy));
  }

  const accentBand = rect.h * 0.14;
  eachPeg(screen, rect, (peg, col, row) => {
    if (peg.dataset.corner) return; // the frame's own marks hold
    if (peg.dataset.base === 'transparent') return; // type sits here
    const x = cfg.step + cfg.step * col;
    const y = cfg.step + cfg.step * row;
    const d = Math.hypot(x - ox, y - oy) / maxD;
    if (d * 0.86 + bayer(col, row) * 0.13 > 0.86) {
      restorePeg(peg);
      return;
    }
    const edge = y < rect.y + accentBand || y > rect.y + rect.h - accentBand;
    paintPeg(peg, edge ? rec.accent : rec.hue, cfg.majorSize);
  });

  const idx = nearestIndex(screen, rec.px, rec.py);
  if (idx >= 0) crossAt(screen, idx % cfg.cols, (idx / cfg.cols) | 0, COLOR.ink, rect);

  /*
    Put the frame corners back.

    `crossAt` spares occluded points but not corners, and the flood pass above
    deliberately skips corners so they hold their ink, so between them nothing
    re-asserts a corner the cursor's row or column has just run through. It
    drops from majorSize + 6 to majorSize and stays there, and because the
    cursor sweeps, the damage accumulates across the block.

    This is not cosmetic. Every frame's four corners landing on a lit point is
    the one invariant the whole lattice rests on.
  */
  eachPeg(screen, rect, (peg) => {
    if (peg.dataset.corner) restorePeg(peg);
  });

  // The callout last: it clears the pegs it covers, and the two passes above
  // would light them again.
  let node = rec.callout;
  if (!node) {
    node = el('span', {
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        'font-size': 13,
        'letter-spacing': '.06em',
        'line-height': '1',
        'white-space': 'nowrap',
        color: COLOR.nearBlack,
        'pointer-events': 'none',
      }),
    });
    cell.appendChild(node);
    rec.callout = node;
  }
  const text = `col ${pad2(mcol)} · row ${pad2(mrow)}`;
  if (node.textContent !== text) {
    node.textContent = text;
    rec.cw = 0;
  }
  // One layout read per string, not per pointermove: the text only changes when
  // the cursor crosses into another module, so this is at most six reads for a
  // hover that visits every one of them.
  if (!rec.cw) {
    const k = (screen.getBoundingClientRect().width || 1920) / 1920;
    const q = node.getBoundingClientRect();
    rec.cw = q.width / k;
    rec.ch = q.height / k;
  }

  // Held inside the block. On the last module the callout would otherwise run
  // past the cell and clear points nothing has claimed — points no release puts
  // back, which reads as a hole punched in the neighbour's field.
  const lx = Math.max(0, Math.min(mcol * md + CALLOUT.dx, rect.w - rec.cw - CALLOUT.dx));

  /*
    Vertically it is a three-way clamp, and the order matters.

    First the band accents: those are drawn from all of SPARK, darks included,
    precisely because no type ever goes on them, so the callout may not either.
    Then the cell's own type, which the natural position sits inside on the
    lower module row. The callout goes to whichever side of the label it was
    already nearer, and only crosses to the other side if its own side has no
    room — so it stays near the cursor rather than teleporting.
  */
  const lo = rect.h * ACCENT_CAP + CALLOUT.dy;
  const hi = rect.h * (1 - ACCENT_CAP) - rec.ch - CALLOUT.dy;
  let ly = Math.min(Math.max(mrow * md + CALLOUT.dy, lo), hi);
  if (rec.bandT < rec.bandB && ly < rec.bandB + CALLOUT.gap && ly + rec.ch > rec.bandT - CALLOUT.gap) {
    const above = rec.bandT - CALLOUT.gap - rec.ch;
    const below = rec.bandB + CALLOUT.gap;
    const near = ly + rec.ch / 2 < (rec.bandT + rec.bandB) / 2 ? above : below;
    const far = near === above ? below : above;
    ly = near >= lo && near <= hi ? near : far;
    ly = Math.min(Math.max(ly, lo), hi);
  }

  node.style.left = `${lx}px`;
  node.style.top = `${ly}px`;
  eachPeg(
    screen,
    {
      x: rect.x + lx - CALLOUT.pad,
      y: rect.y + ly - CALLOUT.pad,
      w: rec.cw + CALLOUT.pad * 2,
      h: rec.ch + CALLOUT.pad * 2,
    },
    (peg) => {
      if (peg.dataset.corner) return;
      peg.style.color = 'transparent';
    },
  );
}

/** Claim the block, then let the mask drive it. */
function prodPaint(cell: HTMLElement): void {
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  if (!screen || !rect) return;
  const rec = chanOf(cell);

  // Claiming the whole block, corners excepted, is what makes the mask legal:
  // every point the mask touches afterwards is in the lit set, so the drift
  // leaves it alone and the release puts it back.
  fillFor(screen, rect, { hue: rec.hue, accent: rec.accent, skip: cornerSet(screen, rect) });
  prodMask(cell);

  // The reveal ramp keeps writing for a few frames after this and would fill in
  // the hole the mask just opened. One deferred pass, generation-guarded, so a
  // cursor that never moves still ends up looking at the flood rather than at a
  // flat plate.
  const gen = rec.gen;
  window.clearTimeout(rec.settle);
  rec.settle = window.setTimeout(() => {
    if (chanOf(cell).gen === gen) prodMask(cell);
  }, REVEAL);
}

/**
 * The label treatment the old channel had: a few letters take the alternates
 * for as long as the cursor is in.
 *
 * The indices are FIXED rather than random, and that is the difference between
 * typography and a malfunction: "product designs" always breaks at the same
 * four letters, so the hover reads as this button's voice. 48px is display
 * size, well above the 20px floor the generic glitch runs under, so the swash
 * forms read as forms.
 */
const PROD_ALT = [1, 6, 9, 12];

function prodLetters(cell: HTMLElement, on: boolean): void {
  const ls = qq<HTMLElement>(cell, '[data-chlabel] [data-l]');
  for (const i of PROD_ALT) {
    const sp = ls[i];
    if (!sp) continue;
    sp.style.fontFamily = on ? FONT.alt : '';
    sp.style.fontFeatureSettings = on ? FONT.altFeatures : '';
  }
}

export function prodOn(cell: HTMLElement): void {
  const ctx = begin(cell, 1, false);
  if (!ctx) return;
  const [x, y] = ptrSeen
    ? designXY(ctx.screen, ptrX, ptrY)
    : [ctx.rect.x + ctx.rect.w / 2, ctx.rect.y + ctx.rect.h / 2];
  ctx.rec.px = x;
  ctx.rec.py = y;
  ctx.rec.cw = 0;
  // Measured BEFORE the alternates land: the label's box is what the callout
  // has to keep clear of, and the swash forms are narrower, so the resting
  // measurement is the conservative one.
  [ctx.rec.bandT, ctx.rec.bandB] = typeBand(cell, ctx.screen);
  ctx.rec.repaint = () => prodPaint(cell);
  prodPaint(cell);
  // The alternates are narrower, so the centered label tightens a little as
  // they land — the same movement every glitched line on the site makes.
  if (!ctx.rec.flat) prodLetters(cell, true);
}

export function prodOff(cell: HTMLElement): void {
  prodLetters(cell, false);
  end(cell, 1);
}

/**
 * The one thing on this screen that moves without the pointer moving is the
 * ambient drift. 01's flood, its scaffolding and its callout all resolve here
 * and nowhere else.
 */
export function scafMove(cell: HTMLElement, ev: PointerEvent): void {
  const screen = screenOf(cell);
  if (!screen || !ACTIVE.has(cell)) return;
  const rec = chanOf(cell);
  const [x, y] = designXY(screen, ev.clientX, ev.clientY);
  rec.px = x;
  rec.py = y;
  prodMask(cell);
}

/* ------------------------------------------- 02 · Paintings — the inset ring */

/**
 * A one-cell-thick ink ring just inside the block's edge, with the interior
 * dithering in the fill hue.
 *
 * Inset by ONE CELL, not one module. A two-module-tall block has no room for a
 * module of inset, and the single row a module would land on is the label's.
 */
function waterPaint(cell: HTMLElement): number[] {
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  const cfg = screen ? cfgOf(screen) : null;
  if (!screen || !rect || !cfg) return [];
  const rec = chanOf(cell);
  const st = cfg.step;

  const ring: Rect = { x: rect.x + st, y: rect.y + st, w: rect.w - st * 2, h: rect.h - st * 2 };
  const inner: Rect = { x: ring.x + st, y: ring.y + st, w: ring.w - st * 2, h: ring.h - st * 2 };
  const innerIdx = cellsInRect(screen, inner);

  // The ring is the inset rect minus its own interior — one cell thick by
  // construction, so it stays one cell thick if the block ever changes size.
  fillFor(screen, ring, {
    hue: COLOR.ink,
    size: cfg.majorSize,
    from: 'top',
    skip: new Set(innerIdx),
  });

  // Half the interior, chosen by the same ordered dither the field itself uses,
  // so it reads as a dither rather than as a plate with a hole in it.
  const skip = new Set<number>();
  for (const i of innerIdx) {
    if (bayer(i % cfg.cols, (i / cfg.cols) | 0) > 0.5) skip.add(i);
  }
  fillFor(screen, inner, { hue: rec.hue, accent: rec.accent, skip });

  // The block's own corners sit outside the ring's rect and are never touched,
  // which is the point of insetting: the frame keeps its marks.
  return innerIdx.filter((i) => !skip.has(i));
}

/**
 * The held flicker, restricted to the interior.
 *
 * `holdFlicker` in the lattice picks from every lit point on the screen and
 * only spares the frame corners, so on this channel it re-dithers the ink ring
 * as well and the ring dissolves into the hue within a second or two — which is
 * the whole personality, gone. The design's own rule is "never a cell whose
 * target is ink", and the interior is exactly the set whose target is not.
 * Same five points, same 140ms.
 */
function waterFlicker(cell: HTMLElement, pool: number[]): () => void {
  const screen = screenOf(cell);
  if (!screen || !pool.length || reducedFor(cell)) return () => {};
  const rec = chanOf(cell);
  const L = latticeOf(screen);
  if (!L) return () => {};
  const t = window.setInterval(() => {
    for (let n = 0; n < 5; n++) {
      const peg = L.cells[pool[(Math.random() * pool.length) | 0]];
      if (!peg || peg.dataset.base === 'transparent') continue;
      peg.style.color = Math.random() < 0.5 ? rec.accent : rec.hue;
    }
  }, 140);
  return () => window.clearInterval(t);
}

export function waterOn(cell: HTMLElement): void {
  const ctx = begin(cell, 2, false);
  if (!ctx) return;
  ctx.rec.repaint = () => {
    ctx.rec.stopFlicker?.();
    ctx.rec.stopFlicker = waterFlicker(cell, waterPaint(cell));
  };
  ctx.rec.stopFlicker = waterFlicker(cell, waterPaint(cell));
}

export function waterOff(cell: HTMLElement): void {
  end(cell, 2);
}

/* ------------------------------------------- 03 · Competizione — the lap */

/*
  A weight ladder, because colour alone was not carrying it.

  The fill claims every point in the block at the major size, and the circuit
  used to be drawn at the SAME size in ink — which left the course a change of
  colour inside a field of identical marks, and at a glance it read as noise
  rather than as a shape. Each rung is two px, and the top of the ladder is the
  weight a frame corner already has, so nothing here outranks the marks the
  whole system rests on.

    fill 16  <  track 18  <  trail 20  <  car 22  =  corner 22
*/
const TRACK_BUMP = 2;
/** The trail behind the car, proud of the track it is running on. */
const TRAIL_BUMP = 4;
/** The car itself, the heaviest thing in the block while it is moving. */
const CAR_BUMP = 6;
/**
 * One car step. The course around a 360 × 240 block is 24 points, so this is a
 * lap of about 2.3 seconds — brisk enough to read as a car, slow enough that
 * the eye can follow one crosshair rather than perceive a shimmer.
 */
const LAP_MS = 95;

/**
 * The circuit, drawn on a canonical 10 × 5 field and in travel order.
 *
 *     0 1 2 3 4 5 6 7 8 9
 *   0 . X . . . . X X X .
 *   1 X . X X X X . . . X
 *   2 X . . . . . . . . X
 *   3 X . . . . . . . . X
 *   4 X X X X X X X X X X
 *
 * A road course, not a rectangle: a tight loop at the left, a long flat middle,
 * a broad sweeping crest at the right, and a full-length bottom straight. The
 * array is the racing line — `lapStep` drives a car by advancing an index — so
 * travel order is the whole mechanism, and it runs CLOCKWISE.
 *
 * WHY THE COURSE HUGS THE BLOCK LEFT AND RIGHT BUT NOT TOP AND BOTTOM. The
 * label occludes the two middle rows of the block across every inset column;
 * a peg there is never painted, which is what kept the old inset ring from
 * reading as a circuit at all — its left and right sides simply were not
 * drawn, and what was left was two dotted horizontals. The block's own
 * boundary columns are outside the label's ink and are clear at every row, so
 * the verticals go there. The four frame corners sit one row further out on
 * those same columns and are never claimed, so they still hold their marks.
 */
const CIRCUIT: readonly (readonly [number, number])[] = [
  [0, 4], [0, 3], [0, 2], [0, 1],
  [1, 0],
  [2, 1], [3, 1], [4, 1], [5, 1],
  [6, 0], [7, 0], [8, 0],
  [9, 1], [9, 2], [9, 3], [9, 4],
  [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4],
];
const CIRCUIT_W = 10;
const CIRCUIT_H = 5;

/**
 * The circuit's points on this screen's lattice, in travel order.
 *
 * The template is mapped proportionally rather than placed, so the shape
 * survives a block that is not exactly ten cells by five — on the 360 × 240
 * channel frames the mapping is 1:1 and every template cell keeps its own
 * point. Consecutive duplicates are dropped, which is what a smaller block
 * would produce, and the closing point is dropped because the ring wraps.
 */
function lapTrack(cell: HTMLElement): number[] {
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  const cfg = screen ? cfgOf(screen) : null;
  if (!screen || !rect || !cfg) return [];
  const st = cfg.step;
  const colAt = (x: number): number => Math.round(x / st) - 1;
  const rowAt = (y: number): number => Math.round(y / st) - 1;
  const c0 = colAt(rect.x);
  const c1 = colAt(rect.x + rect.w);
  const r0 = rowAt(rect.y + st);
  const r1 = rowAt(rect.y + rect.h - st);
  const w = c1 - c0;
  const h = r1 - r0;
  if (w < 1 || h < 1) return [];

  const out: number[] = [];
  let last = -1;
  for (const [tc, tr] of CIRCUIT) {
    const col = c0 + Math.round((tc / (CIRCUIT_W - 1)) * w);
    const row = r0 + Math.round((tr / (CIRCUIT_H - 1)) * h);
    const i = row * cfg.cols + col;
    if (i === last) continue;
    out.push(i);
    last = i;
  }
  if (out.length > 1 && out[0] === out[out.length - 1]) out.pop();
  return out;
}

/**
 * Draw the car at `rec.phase` and its two-peg trail, and put the track back
 * behind it.
 *
 * A peg whose resolved state is `transparent` sits under the label, and the
 * car SKIPS PAINTING it without skipping the position: for that step the car
 * is simply behind the type, which is what a car passing behind a sign does.
 * Lighting it would print a crosshair through "competizione".
 */
function lapStep(cell: HTMLElement, ring: number[]): void {
  const screen = screenOf(cell);
  const cfg = screen ? cfgOf(screen) : null;
  const L = screen ? latticeOf(screen) : null;
  if (!screen || !cfg || !L || !ring.length) return;
  const rec = chanOf(cell);
  const n = ring.length;
  const at = (k: number): HTMLElement | null => L.cells[ring[((k % n) + n) % n]] ?? null;

  const wake = at(rec.phase - 3);
  if (wake && wake.dataset.base !== 'transparent')
    paintPeg(wake, COLOR.ink, cfg.majorSize + TRACK_BUMP);
  for (const back of [2, 1]) {
    const t = at(rec.phase - back);
    if (t && t.dataset.base !== 'transparent')
      paintPeg(t, rec.hue, cfg.majorSize + TRAIL_BUMP);
  }
  const car = at(rec.phase);
  if (car && car.dataset.base !== 'transparent')
    paintPeg(car, COLOR.ink, cfg.majorSize + CAR_BUMP);
}

/** The whole plate: the dithered fill, the ink track, and the car on it. */
function lapPaint(cell: HTMLElement): void {
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  const cfg = screen ? cfgOf(screen) : null;
  const L = screen ? latticeOf(screen) : null;
  if (!screen || !rect || !cfg || !L) return;
  const rec = chanOf(cell);

  fillFor(screen, rect, { hue: rec.hue, accent: rec.accent, skip: cornerSet(screen, rect) });

  const ring = lapTrack(cell);
  const gen = rec.gen;
  // The track over the fill, once the reveal ramp has finished writing —
  // painting it now would have the ramp's tail re-color the circuit.
  window.clearTimeout(rec.settle);
  rec.settle = window.setTimeout(() => {
    if (chanOf(cell).gen !== gen) return;
    for (const i of ring) {
      const peg = L.cells[i];
      if (peg && peg.dataset.base !== 'transparent')
        paintPeg(peg, COLOR.ink, cfg.majorSize + TRACK_BUMP);
    }
    lapStep(cell, ring);
  }, REVEAL);
}

export function sweepOn(cell: HTMLElement): void {
  const ctx = begin(cell, 3, false);
  if (!ctx) return;
  ctx.rec.repaint = () => lapPaint(cell);
  lapPaint(cell);
  if (reducedFor(cell)) return; // the circuit stands, the car does not run
  const ring = lapTrack(cell);
  ctx.rec.beat = window.setInterval(() => {
    ctx.rec.phase += 1;
    lapStep(cell, ring);
  }, LAP_MS);
}

export function sweepOff(cell: HTMLElement): void {
  end(cell, 3);
}

/* ----------------------------------------------- 04 · Contact — the inversion */

/**
 * Paper crosshairs on a near-black band, corners included.
 *
 * No held flicker here. The contact strip simply inverts, and a flicker on an
 * inverted plate reads as a fault rather than as weather.
 */
function invertPaint(cell: HTMLElement): void {
  const screen = screenOf(cell);
  const rect = rectOf(cell);
  if (!screen || !rect) return;
  fillFor(screen, rect, { hue: COLOR.paper, skip: cornerSet(screen, rect) });
  // Ink corners would vanish into the band, so this channel's four corners take
  // paper for as long as it is up. They are painted rather than claimed, and
  // `end` is what puts them back.
  holdCorners(screen, rect, COLOR.paper);
}

export function invertOn(cell: HTMLElement): void {
  const ctx = begin(cell, 4, true);
  if (!ctx) return;
  ctx.rec.repaint = () => invertPaint(cell);
  invertPaint(cell);
}

export function invertOff(cell: HTMLElement): void {
  end(cell, 4);
}
