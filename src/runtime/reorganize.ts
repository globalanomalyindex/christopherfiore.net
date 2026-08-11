/**
 * The reorganize — a scroll that never scrolls, shared by screens 2b and 02.
 *
 * THE IDEA. A gesture does not translate anything by a pixel. It commits the
 * layout to a different rest position: what is on screen dithers away in Bayer
 * order as a wave, everything takes its new address in one frame, and the
 * layout re-forms. The only thing the eye can follow between two positions is
 * the dither, so what it reads is a modular layout rearranging itself to fit
 * the next material onto the screen, not a page sliding under a window.
 *
 * WHY IT IS NOT A SCROLL CONTAINER. A native container translates its content,
 * and an arbitrary sub-position offset is exactly what neither screen may show:
 * on 2b a block caught between two rest positions has two of its four corners
 * off the lattice, and on 02 a painting caught between two has its top or its
 * bottom cut off, which that page's whole layout exists to prevent. The region
 * is `overflow: hidden` here and the wheel, the arrows and a swipe all resolve
 * to the same thing — an index.
 *
 * WHAT A HOST OWES THIS MODULE. Three callbacks and a count. `commit`
 * re-addresses everything while nothing is visible; `items` says what dissolves
 * and in what order; `settle` puts the host's own world back together once the
 * layout has re-formed. Everything the two screens do differently — peg fields,
 * corner marks, page indicators — lives in those, and everything they do the
 * same lives here.
 */

import { COLOR, RULE } from '../design/tokens.ts';
import { css, el } from '../dom.ts';

/** One dither beat. Every duration here is a whole number of these. */
const BEAT = 28;

/**
 * The levels the dissolve walks, present to gone.
 *
 * Five steps, not seventeen. The mask is an ordered dither, so a level is a
 * SHAPE and not an opacity, and five distinct shapes is already more than the
 * eye can count at this speed — walking all of them would take half a second
 * per row and turn a scroll into a cutscene.
 */
const LEVELS = [16, 11, 7, 3, 0] as const;

/** Wheel travel that commits one position. About one trackpad flick. */
const WHEEL_STEP = 90;

/** The same, for a finger. Shorter, because a swipe is a deliberate gesture. */
const TOUCH_STEP = 56;

/**
 * A tab that has been backgrounded comes back with an enormous elapsed time.
 * Whole-interval advance is what makes this display-independent, so the elapsed
 * time is clamped rather than the loop being allowed to spin through a thousand
 * beats it will never draw.
 */
const MAX_CATCHUP = BEAT * 20;

/** The ordered-dither matrix the rest of the site already uses. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export const clampN = (n: number, lo: number, hi: number): number =>
  n < lo ? lo : n > hi ? hi : n;

/* ------------------------------------------------------------------- mask */

/**
 * The dissolve, as seventeen static masks rather than an animation.
 *
 * Level `n` keeps the `n` cells of the 4×4 Bayer matrix whose threshold is
 * below `n`, so walking 16 → 0 turns a thing off in exactly the order the
 * site's dither turns pixels off. They are data URIs built once and cached,
 * which is what makes this cheap enough to drive per beat: switching levels is
 * one style write, not a repaint of generated geometry.
 *
 * Seventeen discrete steps is also the house easing. A smooth opacity ramp here
 * would read as a fade, and this design does not fade.
 */
const MASKS: string[] = [];

function maskAt(level: number): string {
  const cached = MASKS[level];
  if (cached) return cached;
  let rects = '';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (BAYER4[row * 4 + col] < level)
        rects += `<rect x="${col}" y="${row}" width="1" height="1"/>`;
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
 * Paint the mask, anchored to the FIELD rather than to the thing dissolving.
 *
 * One Bayer cell per field cell, and the tile's origin pinned to the field's
 * own grid — which for the lattice starts a half step in, and for a veil canvas
 * starts at the origin, so `phase` is a parameter. That is the difference
 * between a thing dissolving *into the field* and a thing carrying its own
 * noise with it: with the tile anchored here the speckle stays put while what
 * is on top of it goes away.
 */
export function setMask(
  b: HTMLElement,
  level: number,
  cell: number,
  x: number,
  y: number,
  phase = 0,
): void {
  const img = maskAt(level);
  const tile = cell * 4;
  const ox = (((phase - x) % tile) + tile) % tile;
  const oy = (((phase - y) % tile) + tile) % tile;
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

export function clearMask(b: HTMLElement): void {
  for (const p of MASK_PROPS) {
    b.style.removeProperty(p);
    b.style.removeProperty(`-webkit-${p}`);
  }
}

/* ------------------------------------------------------------- plate rail */

/**
 * The position, as one tick per rest position.
 *
 * Neither screen scrolls, so neither gets a scrollbar, and a proportional thumb
 * would be claiming a continuum that does not exist. A tick per position says
 * the two true things instead: how many there are, and which one you are on.
 * The first of those is the one that matters — without it a screen that fills
 * its viewport exactly gives a visitor no reason to believe there is anything
 * past it.
 *
 * It is always up, unlike the peg caret this replaced on 2b, which only
 * appeared while a step was already running and so could only ever confirm a
 * scroll somebody had already thought to try.
 */
export const PLATE_ON: string = COLOR.ink;
export const PLATE_OFF: string = RULE.onPaperMinor;

/** Space between ticks. Enough to read as separate marks at 6px wide. */
const TICK_GAP = 4;

export interface PlateRail {
  node: HTMLElement;
  set: (i: number) => void;
}

export function plateRail(
  count: number,
  o: { height: number; width: number; place?: Record<string, string | number> },
): PlateRail {
  const h = (o.height - TICK_GAP * (count - 1)) / count;
  const ticks = Array.from({ length: count }, (_, i) =>
    el('span', {
      'data-plate': i,
      style: css({
        position: 'absolute',
        left: 0,
        width: '100%',
        top: i * (h + TICK_GAP),
        height: h,
        background: i === 0 ? PLATE_ON : PLATE_OFF,
        // steps, not a ramp: this design does not fade
        transition: 'background 120ms steps(3,end)',
      }),
    }),
  );
  const node = el(
    'div',
    {
      'data-platerail': true,
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        top: 0,
        height: o.height,
        width: o.width,
        'pointer-events': 'none',
        'z-index': '3',
        ...(o.place ?? { right: 0 }),
      }),
    },
    ...ticks,
  );
  return { node, set: (i) => markPlate(node, i) };
}

/**
 * Mark a position on whatever rail is inside `root`.
 *
 * By query rather than by a held reference, because 2b's rail is built by the
 * page module and driven by the runtime module, and those two have no channel
 * between them except the markup — the same contract `[data-ixscroll]` and
 * `[data-ixblock]` already run on.
 */
export function markPlate(root: HTMLElement, i: number): void {
  for (const t of root.querySelectorAll<HTMLElement>('[data-plate]')) {
    t.style.background = Number(t.dataset.plate) === i ? PLATE_ON : PLATE_OFF;
  }
}

/* ------------------------------------------------------------------ types */

export interface ReorgItem {
  el: HTMLElement;
  /**
   * Beats this item waits before its own dissolve begins.
   *
   * With every rank 0 the whole layout blinks at once, which reads as a
   * repaint. Ranked in the direction of travel it comes apart as a wave, which
   * reads as the layout reorganizing — the difference between a glitch and a
   * mechanism.
   */
  rank: number;
  /** the item's own position, so the tile stays anchored to the field */
  x: number;
  y: number;
}

export interface ReorgOpts {
  /** the surface that takes the wheel, the keys and a finger */
  region: HTMLElement;
  /** how many rest positions there are. Read fresh, never cached. */
  positions: () => number;
  /** the dither cell, in design px */
  cell: number;
  /** the tile's phase against the origin; the lattice wants half a step */
  phase?: number;
  reduced: () => boolean;
  /** once, at the top of a step, before anything dissolves */
  claim?: () => void;
  /** re-address everything to `i`. Called with the layout fully dissolved. */
  commit: (i: number, dir: number) => void;
  /** what dissolves and in what order, for the position now addressed */
  items: (dir: number) => ReorgItem[];
  /** once the layout has re-formed */
  settle?: () => void;
}

export interface Reorg {
  /** the committed rest position */
  index: () => number;
  /** where the input wants to be; the ticker chases it */
  target: () => number;
  busy: () => boolean;
  /** move, with the dissolve */
  goTo: (i: number) => void;
  /** take a position with no dissolve at all, for the open and close edges */
  reset: (i: number) => void;
  destroy: () => void;
}

type Phase = 'idle' | 'out' | 'in';

/* ------------------------------------------------------------------ drive */

export function reorganize(o: ReorgOpts): Reorg {
  const phaseAnchor = o.phase ?? 0;
  let index = 0;
  let want = 0;
  let phase: Phase = 'idle';
  let beat = 0;
  let last = 0;
  let raf = 0;
  let acc = 0;
  let touchY = 0;
  let items: ReorgItem[] = [];
  let maxRank = 0;
  /*
    Every element this run has written a mask onto.

    Not the same set as `items`: the out phase masks the OLD layout and then
    `commit` swaps in the new one, so by the time a run ends the elements that
    dissolved away are no longer in `items` and a wipe over `items` alone leaves
    them holding a level-0 mask forever. It is invisible while they are hidden
    and it is wrong the moment they come back, and either way a rest state
    should own no style this module wrote.
  */
  const touched = new Set<HTMLElement>();

  const lastIndex = (): number => Math.max(0, o.positions() - 1);

  /** Beats a phase runs for: the level walk, plus the wave's own tail. */
  const phaseBeats = (): number => LEVELS.length - 1 + maxRank;

  function load(dir: number): void {
    items = o.items(dir);
    maxRank = items.reduce((m, it) => Math.max(m, it.rank), 0);
  }

  /**
   * Paint the dissolve for one beat.
   *
   * Level 16 is every Bayer cell kept, which is no mask at all, so it is
   * cleared rather than set — a rest state should cost nothing.
   */
  function dither(): void {
    const top = LEVELS.length - 1;
    for (const it of items) {
      const b = beat - it.rank;
      const li = phase === 'out' ? clampN(b, 0, top) : clampN(top - b, 0, top);
      const level = LEVELS[li];
      if (level >= 16) {
        clearMask(it.el);
        touched.delete(it.el);
      } else {
        setMask(it.el, level, o.cell, it.x, it.y, phaseAnchor);
        touched.add(it.el);
      }
    }
  }

  function wipe(): void {
    for (const el of touched) clearMask(el);
    touched.clear();
  }

  /** Everything gone: take the new address, then start the layout re-forming. */
  function commit(): void {
    const dir = want > index ? 1 : -1;
    index = want;
    // The old layout's masks go BEFORE it is swapped out, in the same turn, so
    // nothing is left carrying one and nothing is seen without one.
    wipe();
    o.commit(index, dir);
    phase = 'in';
    beat = 0;
    load(dir);
    dither();
  }

  function done(): void {
    phase = 'idle';
    beat = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    wipe();
    o.settle?.();
  }

  function advance(): void {
    if (phase === 'out' && beat > phaseBeats()) {
      commit();
      return;
    }
    if (phase === 'in' && beat > phaseBeats()) {
      // A gesture that kept going while this one ran: straight into the next
      // step, from a layout that is already fully formed.
      if (want !== index) {
        phase = 'out';
        beat = 0;
        load(want > index ? 1 : -1);
        dither();
        return;
      }
      done();
      return;
    }
    dither();
  }

  /**
   * One beat.
   *
   * Whole intervals against the wall clock, never a snap to `now`, so a step
   * takes the same time on a 60Hz panel and a 120Hz one and the dither lands on
   * the same beats on both.
   */
  function run(): void {
    if (raf) return;
    const loop = (now: number): void => {
      raf = 0;
      if (now - last > MAX_CATCHUP) last = now - BEAT;
      let ran = false;
      while (now - last >= BEAT) {
        last += BEAT;
        beat += 1;
        ran = true;
      }
      if (ran) advance();
      if (phase !== 'idle') raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function goTo(i: number): void {
    const to = clampN(i, 0, lastIndex());
    if (to === want && phase === 'idle') return;
    want = to;
    if (phase !== 'idle') return;
    if (to === index) return;

    o.claim?.();

    if (o.reduced()) {
      // No dissolve to watch, so there is nothing to sequence: take the
      // position and settle in the same turn.
      index = to;
      o.commit(index, to > index ? 1 : -1);
      done();
      return;
    }

    phase = 'out';
    beat = 0;
    last = performance.now();
    load(to > index ? 1 : -1);
    dither();
    run();
  }

  function reset(i: number): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    phase = 'idle';
    beat = 0;
    acc = 0;
    // A page that closes mid-flick must not come back still disarmed, waiting
    // out a gesture whose hand left the trackpad a minute ago.
    armed = true;
    window.clearTimeout(quietT);
    wipe();
    items = [];
    index = clampN(i, 0, lastIndex());
    want = index;
  }

  /* ---------------------------------------------------------------- input */

  /**
   * `deltaMode` is normalized because a mouse wheel on some platforms reports
   * lines and some report pages, and a threshold in pixels has to be given
   * pixels.
   */
  const wheelPx = (e: WheelEvent): number => {
    if (e.deltaMode === 1) return e.deltaY * 16;
    if (e.deltaMode === 2) return e.deltaY * (o.region.clientHeight || 600);
    return e.deltaY;
  };

  const at = (): number => (phase === 'idle' ? index : want);

  /*
    ONE GESTURE, ONE STEP.

    A trackpad flick is not one wheel event. It is the push, and then a train of
    MOMENTUM events the OS keeps sending as it coasts — thirty or forty of them,
    a few milliseconds apart, adding up to well over a thousand pixels. Against
    a plain threshold every one of those past the first crossed it again, so a
    single flick walked the layout to the end of the wall and there was no way
    to look at anything in between.

    So the wheel arms once and disarms on the step it commits, and only re-arms
    when the input stops looking like coasting. Two signals say that, and either
    is enough:

    · the wheel has been silent for `REARM_QUIET`, which is the flick ending;
    · this event arrived `REARM_GAP` after the last one. Momentum events are
      dense by construction — the OS emits them on the display's cadence — and
      nothing a hand does deliberately is that dense. This is what keeps a mouse
      wheel usable, where every click is a separate push and waiting for silence
      between them would lose all but the first.
  */
  const REARM_QUIET = 160;
  const REARM_GAP = 90;
  let armed = true;
  let lastWheel = 0;
  let quietT = 0;

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;

    window.clearTimeout(quietT);
    quietT = window.setTimeout(() => {
      armed = true;
      acc = 0;
    }, REARM_QUIET);

    if (!armed) {
      if (gap < REARM_GAP) return; // still coasting on the last flick
      armed = true;
      acc = 0;
    }

    acc += wheelPx(e);
    if (Math.abs(acc) < WHEEL_STEP) return;
    const dir = acc > 0 ? 1 : -1;
    acc = 0;
    armed = false;
    goTo(at() + dir);
  };

  /*
    A finger needs none of that: `touchstart` and `touchend` delimit the gesture
    exactly, so one swipe arms once and is done.
  */
  const onTouchStart = (e: TouchEvent): void => {
    touchY = e.touches[0]?.clientY ?? 0;
    acc = 0;
    armed = true;
  };

  const onTouchMove = (e: TouchEvent): void => {
    const y = e.touches[0]?.clientY ?? touchY;
    e.preventDefault();
    acc += touchY - y;
    touchY = y;
    if (!armed || Math.abs(acc) < TOUCH_STEP) return;
    const dir = acc > 0 ? 1 : -1;
    acc = 0;
    armed = false;
    goTo(at() + dir);
  };

  /*
    The keys a scroll container gives for free, given back by hand. Both regions
    are `tabindex="0"` and announce themselves as scrollable, so a keyboard
    visitor who lands on one has to be able to move it — and a page here is one
    rest position, because a rest position is the only thing these screens can
    be at.
  */
  const onKey = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const from = at();
    let to = from;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') to = from + 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') to = from - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = lastIndex();
    else return;
    e.preventDefault();
    goTo(to);
  };

  /*
    Belt and braces. `overflow: hidden` still leaves a box the browser may
    scroll programmatically, and one pixel of that would put the layout at an
    offset nothing here knows about and nothing puts back.
  */
  const onScroll = (): void => {
    if (o.region.scrollTop !== 0) o.region.scrollTop = 0;
  };

  o.region.addEventListener('wheel', onWheel, { passive: false });
  o.region.addEventListener('touchstart', onTouchStart, { passive: true });
  o.region.addEventListener('touchmove', onTouchMove, { passive: false });
  o.region.addEventListener('keydown', onKey);
  o.region.addEventListener('scroll', onScroll, { passive: true });

  return {
    index: () => index,
    target: () => want,
    busy: () => phase !== 'idle',
    goTo,
    reset,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(quietT);
      phase = 'idle';
      o.region.removeEventListener('wheel', onWheel);
      o.region.removeEventListener('touchstart', onTouchStart);
      o.region.removeEventListener('touchmove', onTouchMove);
      o.region.removeEventListener('keydown', onKey);
      o.region.removeEventListener('scroll', onScroll);
    },
  };
}
