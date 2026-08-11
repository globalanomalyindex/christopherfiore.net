/**
 * The reorganize — a scroll that snaps, shared by screens 2b and 02.
 *
 * THE IDEA. The contents move vertically and nothing else does. Not the page,
 * not its border, not the crosshair field behind it — only the material in the
 * band, and only ever to a whole multiple of the field's own cell. So it reads
 * as scrolling, because it is, and it reads as mechanical, because between one
 * frame and the next the contents have jumped a whole cell rather than eased
 * some fraction of one. The crosshairs the contents pass over light and go out
 * as they are uncovered and covered, which is what makes the field read as the
 * thing the scroll is measured against rather than as decoration behind it.
 *
 * WHY NOT A SCROLL CONTAINER. A native container translates by whatever the
 * device reports, which is a sub-pixel fraction on a trackpad. That is exactly
 * the state neither screen may show: on 2b a block at a fractional offset has
 * its four corners off the lattice, which the entire system rests on. Here the
 * offset is a counter of cells, so every frame of the travel satisfies the
 * invariant, not just the rest positions.
 *
 * WHAT A HOST OWES THIS MODULE. A count, an offset per rest position, and a
 * `travel` that puts the contents at an offset and lights whatever that
 * implies. `travel` is called once per beat and once more on arrival, so a
 * host does its placing there and nowhere else.
 *
 * ONE GESTURE, ONE STEP — see `onWheel`. A trackpad flick is not one event.
 */

import { COLOR, RULE } from '../design/tokens.ts';
import { css, el } from '../dom.ts';

/** One beat: the contents jump a whole number of cells. */
const BEAT = 28;

/**
 * The longest a move may take, in beats.
 *
 * A step covers one rest position and that is eleven cells on page 02, so at
 * one cell a beat it lands in about 300ms. `End` covers five rest positions,
 * and at one cell a beat that is a second and a half of travel — which is not a
 * scroll any more, it is a cutscene, and a keyboard visitor whose focus has
 * gone with it is looking at nothing for the duration.
 *
 * So the STRIDE scales with the distance instead of the duration: a longer move
 * takes more cells per beat, and every move takes the same time. The stride is
 * always a whole number of cells, so every frame still lands on the grid.
 */
const MAX_BEATS = 11;

/** Wheel travel that commits one step. About one trackpad flick. */
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

export const clampN = (n: number, lo: number, hi: number): number =>
  n < lo ? lo : n > hi ? hi : n;

/* ------------------------------------------------------------- plate rail */

/**
 * The position, as one tick per rest position.
 *
 * Neither screen scrolls natively, so neither gets a scrollbar, and a
 * proportional thumb would be claiming a continuum that does not exist. A tick
 * per position says the two true things instead: how many there are, and which
 * one you are on. The first of those is the one that matters — without it a
 * screen that fills its viewport exactly gives a visitor no reason to believe
 * there is anything past it.
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
 * runtime module and page 02's by the page module, and the one thing both
 * always have is the markup.
 */
export function markPlate(root: HTMLElement, i: number): void {
  for (const t of root.querySelectorAll<HTMLElement>('[data-plate]')) {
    t.style.background = Number(t.dataset.plate) === i ? PLATE_ON : PLATE_OFF;
  }
}

/* ------------------------------------------------------------------ types */

export interface ReorgOpts {
  /** the focusable region: takes the keys, and is held at scrollTop 0 */
  region: HTMLElement;
  /**
   * Where the wheel and a finger are listened for. Defaults to `region`.
   *
   * It should be the whole screen. With the listener on the band itself, a
   * visitor whose cursor was over the title, the rails, or any of the wall
   * around the material got nothing at all for a scroll — which is most of the
   * screen, and which reads as the page being broken rather than as the cursor
   * being in the wrong place.
   */
  surface?: HTMLElement;
  /** how many rest positions there are. Read fresh, never cached. */
  positions: () => number;
  /** the snap grid: the contents only ever sit on a multiple of this */
  cell: number;
  reduced: () => boolean;
  /** the contents' offset at a rest position, in design px */
  offsetOf: (i: number) => number;
  /** put the contents at `px` and light what that implies. Once per beat. */
  travel: (px: number, i: number) => void;
  /** once, at the top of a step, before anything moves */
  claim?: () => void;
  /** once the contents have arrived and stopped */
  settle?: () => void;
}

export interface Reorg {
  /** the rest position the contents are committed to */
  index: () => number;
  /** where the input wants to be; the ticker chases it */
  target: () => number;
  busy: () => boolean;
  /** move, with the travel */
  goTo: (i: number) => void;
  /** take a position with no travel at all, for the open and close edges */
  reset: (i: number) => void;
  destroy: () => void;
}

/* ------------------------------------------------------------------ drive */

/**
 * Whether something between the pointer and the surface wants this wheel more
 * than we do.
 *
 * The screen is the input surface, and a screen can have a real scroll box on
 * it — a case study's prose column, a viewer. Swallowing the wheel over one of
 * those would make it unreadable. Asking the computed style rather than keeping
 * a list means anything added later is covered without being registered here.
 */
function yieldsTo(target: EventTarget | null, surface: HTMLElement, region: HTMLElement): boolean {
  let n: Element | null = target instanceof Element ? target : null;
  while (n && n !== surface) {
    if (n !== region && n instanceof HTMLElement) {
      /*
        A nested screen. Screen 2b carries six case studies inside itself, and
        an open one covers the mosaic completely — so a wheel anywhere on it
        belongs to it, including over its chrome, where there is no scroll box
        to find. `data-screen-label` is what every screen on this site is marked
        with, and the walk stops at the surface, so anything wearing one below
        that is by definition a screen on top of ours.
      */
      if (n.hasAttribute('data-screen-label')) return true;
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    n = n.parentElement;
  }
  return false;
}

export function reorganize(o: ReorgOpts): Reorg {
  const surface = o.surface ?? o.region;
  let index = 0;
  let want = 0;
  /** the contents' current offset, always a whole number of cells */
  let cur = 0;
  let to = 0;
  /** cells advanced per beat, re-solved whenever the destination changes */
  let stride = o.cell;
  let moving = false;
  let last = 0;
  let raf = 0;
  let acc = 0;
  let touchY = 0;

  const lastIndex = (): number => Math.max(0, o.positions() - 1);

  /** Cells per beat for the distance still to cover, bounded by MAX_BEATS. */
  function solveStride(): void {
    const cells = Math.abs(to - cur) / o.cell;
    stride = o.cell * Math.max(1, Math.ceil(cells / MAX_BEATS));
  }

  /** Advance one stride toward the target, never past it. */
  function beat(): void {
    if (cur === to) return;
    const d = to - cur;
    cur += Math.abs(d) <= stride ? d : Math.sign(d) * stride;
    o.travel(cur, index);
  }

  function done(): void {
    moving = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    o.settle?.();
  }

  /**
   * One beat.
   *
   * Whole intervals against the wall clock, never a snap to `now`, so a step
   * covers the same ground in the same time on a 60Hz panel and a 120Hz one.
   */
  function run(): void {
    if (raf) return;
    const loop = (now: number): void => {
      raf = 0;
      if (now - last > MAX_CATCHUP) last = now - BEAT;
      while (now - last >= BEAT) {
        last += BEAT;
        beat();
      }
      if (cur === to) {
        // A gesture that kept going while this one ran simply extends the
        // travel rather than starting a second one, so a fast reader gets one
        // continuous move instead of a stutter at every rest position.
        if (want !== index) {
          index = want;
          to = o.offsetOf(index);
          solveStride();
          o.travel(cur, index);
        } else {
          done();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function goTo(i: number): void {
    const dest = clampN(i, 0, lastIndex());
    if (dest === want && moving) return;
    want = dest;
    if (moving) return;
    if (dest === index && cur === o.offsetOf(index)) return;

    o.claim?.();
    index = dest;
    to = o.offsetOf(index);
    solveStride();

    if (o.reduced()) {
      cur = to;
      o.travel(cur, index);
      done();
      return;
    }

    moving = true;
    last = performance.now();
    o.travel(cur, index);
    run();
  }

  function reset(i: number): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    moving = false;
    acc = 0;
    armed = true;
    window.clearTimeout(quietT);
    index = clampN(i, 0, lastIndex());
    want = index;
    cur = o.offsetOf(index);
    to = cur;
    o.travel(cur, index);
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

  const at = (): number => (moving ? want : index);

  /*
    ONE GESTURE, ONE STEP.

    A trackpad flick is not one wheel event. It is the push, and then a train of
    MOMENTUM events the OS keeps sending as it coasts — thirty or forty of them,
    a few milliseconds apart, adding up to well over a thousand pixels. Against
    a plain threshold every one of those past the first crossed it again, so a
    single flick walked the contents to the end and there was no way to look at
    anything in between.

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
    if (yieldsTo(e.target, surface, o.region)) return;
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
    armed = !yieldsTo(e.target, surface, o.region);
  };

  const onTouchMove = (e: TouchEvent): void => {
    if (!armed) return;
    const y = e.touches[0]?.clientY ?? touchY;
    e.preventDefault();
    acc += touchY - y;
    touchY = y;
    if (Math.abs(acc) < TOUCH_STEP) return;
    const dir = acc > 0 ? 1 : -1;
    acc = 0;
    armed = false;
    goTo(at() + dir);
  };

  /*
    The keys a scroll container gives for free, given back by hand. Both regions
    are `tabindex="0"` and announce themselves as scrollable, so a keyboard
    visitor who lands on one has to be able to move it — and a page here is one
    rest position, because a rest position is the only thing these screens come
    to a stop at.
  */
  const onKey = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const from = at();
    let dest = from;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') dest = from + 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') dest = from - 1;
    else if (e.key === 'Home') dest = 0;
    else if (e.key === 'End') dest = lastIndex();
    else return;
    e.preventDefault();
    goTo(dest);
  };

  /*
    Belt and braces. `overflow: hidden` still leaves a box the browser may
    scroll programmatically, and one pixel of that would put the contents at an
    offset nothing here knows about and nothing puts back.
  */
  const onScroll = (): void => {
    if (o.region.scrollTop !== 0) o.region.scrollTop = 0;
  };

  surface.addEventListener('wheel', onWheel, { passive: false });
  surface.addEventListener('touchstart', onTouchStart, { passive: true });
  surface.addEventListener('touchmove', onTouchMove, { passive: false });
  o.region.addEventListener('keydown', onKey);
  o.region.addEventListener('scroll', onScroll, { passive: true });

  return {
    index: () => index,
    target: () => want,
    busy: () => moving,
    goTo,
    reset,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(quietT);
      moving = false;
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('touchstart', onTouchStart);
      surface.removeEventListener('touchmove', onTouchMove);
      o.region.removeEventListener('keydown', onKey);
      o.region.removeEventListener('scroll', onScroll);
    },
  };
}
