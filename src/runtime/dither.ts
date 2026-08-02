/**
 * The ordered-dither primitive — the effect every transition in this design is
 * built on.
 *
 * An SVG filter blurs the element's alpha, tiles the 8×8 Bayer matrix across
 * the box and composites the two arithmetically (`k1 0, k2 1.55, k3 -0.55,
 * k4 0.28`), then a discrete alpha transfer hardens the result. Driving the
 * blur radius N→0 reads as "resolving out of noise". A plain blur is not a
 * substitute: without the tiled matrix and the arithmetic composite there is no
 * speckle, only mush.
 *
 * Ported from `dfxFilter` / `dIn` / `dfxSeq` / `autoMb` / `playIn` / `killAnim`
 * / `bbox` in `_source/prototype/prototype.script.js`.
 */

import { asset, q, qq, svg } from '../dom';
import { FLASH } from '../design/tokens';
import { state } from './state';

const DEFS_SEL = '[data-dithdefs]';
const PROTO_SEL = '[data-dithproto]';
const STAGE_SEL = '[data-stage]';

/** Fallback blur radius when a caller does not pass one. */
const DEFAULT_MB = 12;

/**
 * The composite's k4 is the dither bias, animated over the settle.
 * u = 0 → -1.1 (fully dissolved) · u = 1 → 0.28 (the resting value baked into
 * the filter prototype). -1.1 + 1.38 = 0.28, so the two ends agree exactly.
 */
const K4_BASE = -1.1;
const K4_SPAN = 1.38;

/** Blur falls off faster than linear so the last of the noise clears late. */
const BLUR_GAMMA = 1.35;

interface DfxNodes {
  filter: SVGElement;
  blur: SVGFEGaussianBlurElement;
  /** the arithmetic feComposite whose k4 carries the dither bias */
  comp: SVGElement;
  id: string;
}

/** Per-element cloned filter, and playIn bookkeeping. */
const NODES = new WeakMap<HTMLElement, DfxNodes>();
const TIMERS = new WeakMap<HTMLElement, number[]>();
const SRC = new WeakMap<HTMLElement, string>();

/** Filter ids are minted in sequence (psd1, psd2, …), never randomly. */
let filterSeq = 0;

/* ----------------------------------------------------------------- budget */

/**
 * How many elements may carry a live dither at the same moment.
 *
 * An applied SVG filter costs the renderer a fixed amount per element per
 * frame, and that is the whole story — measured on this machine at 1728×1080,
 * two screens deep, while sweeping the cursor across the buttons:
 *
 *     budget  32 40 48 56 | 64   72   80   96   none
 *     fps     60 60 60 60 | 55   50   46   42   40   (peak 134 concurrent)
 *
 * The cliff is the count and nothing else. Blurring a smaller region does not
 * help (a 124%×132% region measured 38.8fps against the real 160%×190%
 * region's 38.3), a retina backing store does not hurt (DPR 1 and DPR 2 both
 * measured 38fps), holding a few thousand unused filters in the defs costs
 * nothing, and stepping the animation down to 12–30 updates a second saves
 * nothing at all — Chrome re-runs the graph every frame whether or not the
 * numbers in it changed. What *is* expensive is `feGaussianBlur`: pinning its
 * radius to 0 while leaving the rest of the graph alone took the same scene
 * from 41fps to 55, and a filter that is applied but does no work is free.
 *
 * 48 sits below the 56 knee so a slower machine than this one has somewhere to
 * fall, and well above the ~20 elements a single button's hover puts in flight,
 * which is the point: one hover, or two at once, never reaches the budget and
 * is pixel-for-pixel what it always was. Only a cursor thrown across several
 * buttons at once gets there, and what it loses is the speckle on individual
 * letters at a moment when a dozen of them are speckling.
 */
const BUDGET = 48;

interface Run {
  /** the pending frame */
  raf: number;
  /**
   * A per-letter pulse, which yields its slot to page-scale work. Sequences
   * driving a transition are never optional and are never evicted: several of
   * them end dissolved rather than resolved, so cutting one short would leave
   * a title or a plate stranded in noise.
   */
  optional: boolean;
  /** stop the frames and put the element where the sequence would have ended */
  land: () => void;
}

/** Insertion-ordered, so the first optional entry found is the oldest one. */
const RUNS = new Map<HTMLElement, Run>();

/** Stop an element's frame loop, leaving it looking exactly as it does now. */
function stop(el: HTMLElement): void {
  const run = RUNS.get(el);
  if (!run) return;
  cancelAnimationFrame(run.raf);
  RUNS.delete(el);
}

/**
 * Free one slot by landing the longest-running letter. Returns false when the
 * budget is entirely spoken for by transition work, which the caller reads as
 * "skip this pulse" rather than as licence to interrupt a transition.
 */
function evict(): boolean {
  for (const run of RUNS.values()) {
    if (!run.optional) continue;
    run.land();
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------- pool */

/**
 * Filters no element points at any more, ready to be handed out again.
 *
 * Cloning is cheap; leaving the clones behind was not. Every letter that ever
 * glitched used to strand a six-node filter in the defs for the life of the
 * page — a single minute of hovering took the document from 137 of them to
 * 389, climbing, with nothing that ever removed one. It costs no frame time
 * (a few thousand idle filters measured identically), so this is a leak fix
 * rather than a speed fix, but it is unbounded and worth closing.
 *
 * Keyed by the `<defs>` that owns them, so a rebuilt stage can never be handed
 * a filter that now lives in a detached tree.
 */
const POOL = new WeakMap<Element, DfxNodes[]>();

function pool(defs: Element): DfxNodes[] {
  let p = POOL.get(defs);
  if (!p) {
    p = [];
    POOL.set(defs, p);
  }
  return p;
}

/* ------------------------------------------------------------------ defs */

/**
 * Install the shared `<svg><defs>` filter prototype into the stage.
 * Idempotent — a second call on the same stage is a no-op.
 */
export function installDitherDefs(stage: HTMLElement): void {
  if (q(stage, DEFS_SEL)) return;

  const filter = svg(
    'filter',
    {
      'data-dithproto': '',
      id: 'ps-dith',
      // Generous region: the blur spills well outside the box, and it spills
      // further downward than upward.
      x: '-30%',
      y: '-45%',
      width: '160%',
      height: '190%',
      'color-interpolation-filters': 'sRGB',
      primitiveUnits: 'userSpaceOnUse',
    },
    svg('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 0, result: 'B' }),
    // userSpaceOnUse → the tile is 8 CSS px, i.e. one Bayer cell per pixel row.
    svg('feImage', {
      href: asset('brand/bayer8.png'),
      x: 0,
      y: 0,
      width: 8,
      height: 8,
      preserveAspectRatio: 'none',
      result: 'T0',
    }),
    svg('feTile', { in: 'T0', result: 'T' }),
    svg('feComposite', {
      in: 'B',
      in2: 'T',
      operator: 'arithmetic',
      k1: 0,
      k2: 1.55,
      k3: -0.55,
      k4: 0.28,
      result: 'D',
    }),
    svg(
      'feComponentTransfer',
      { in: 'D', result: 'H' },
      svg('feFuncA', { type: 'discrete', tableValues: '0 1' }),
    ),
    svg('feComposite', { in: 'SourceGraphic', in2: 'H', operator: 'in' }),
  );

  const host = svg(
    'svg',
    {
      'data-dithdefs': '',
      'aria-hidden': 'true',
      focusable: 'false',
      width: 0,
      height: 0,
      style:
        'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none',
    },
    svg('defs', undefined, filter),
  );

  stage.insertBefore(host, stage.firstChild);
}

/* --------------------------------------------------------------- filters */

function defsHost(el: HTMLElement): Element | null {
  const stage = el.closest(STAGE_SEL);
  return (stage && q<SVGSVGElement>(stage, DEFS_SEL)) || document.querySelector(DEFS_SEL);
}

function mint(proto: SVGElement, defs: Element): DfxNodes | null {
  const filter = proto.cloneNode(true) as SVGElement;
  const id = `psd${++filterSeq}`;
  filter.setAttribute('id', id);
  filter.removeAttribute('data-dithproto');
  defs.appendChild(filter);
  const blur = q<SVGFEGaussianBlurElement>(filter, 'feGaussianBlur');
  const comp = q<SVGElement>(filter, "feComposite[operator='arithmetic']");
  if (!blur || !comp) return null;
  return { filter, blur, comp, id };
}

/** Give `el` a filter of its own (from the pool if there is one) and point it there. */
function ensureNodes(el: HTMLElement): DfxNodes | null {
  const host = defsHost(el);
  if (!host) return null;
  const proto = q<SVGElement>(host, PROTO_SEL);
  if (!proto) return null;
  const defs = proto.parentNode as Element | null;
  if (!defs) return null;

  let nodes = NODES.get(el);
  // Re-mint if the defs block was replaced under us (stage rebuilt).
  if (!nodes || !nodes.filter.isConnected || nodes.filter.parentNode !== defs) {
    const next = pool(defs).pop() || mint(proto, defs);
    if (!next) return null;
    nodes = next;
    NODES.set(el, nodes);
  }
  el.style.filter = `url(#${nodes.id})`;
  return nodes;
}

/**
 * Drop `el`'s filter and hand it back to the pool.
 *
 * Stops the frame loop first: releasing a filter another element could pick up
 * while a sequence is still writing to it would have the two of them driving
 * one blur.
 */
export function dfxRelease(el: HTMLElement): void {
  stop(el);
  el.style.filter = '';
  const nodes = NODES.get(el);
  if (!nodes) return;
  NODES.delete(el);
  const defs = nodes.filter.parentNode as Element | null;
  if (defs && nodes.filter.isConnected) pool(defs).push(nodes);
}

/** Give `el` its own cloned filter instance; returns its feGaussianBlur node. */
export function dfxFilter(el: HTMLElement): SVGFEGaussianBlurElement | null {
  const nodes = ensureNodes(el);
  return nodes ? nodes.blur : null;
}

/** Blur radius appropriate to the element's box: 22% of its short side. */
export function autoMb(el: HTMLElement): number {
  const w = el.offsetWidth || 40;
  const h = el.offsetHeight || 40;
  return Math.max(5, Math.min(52, Math.min(w, h) * 0.22));
}

/* -------------------------------------------------------- reduced motion */

/**
 * Reduced motion is read from the element's stage, so a single stage-level
 * change flips every element at once. Elements with no stage ancestor fall
 * back to the media query directly.
 */
function isReduced(el: Element): boolean {
  const stage = el.closest<HTMLElement>(STAGE_SEL);
  if (stage) return state(stage).reduced;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------- sequences */

/**
 * Drive the dither amount through `stops` — `[timeMs, amount]` pairs, amount
 * 0 = fully dissolved, 1 = fully resolved. Segments ease in-out quad.
 *
 * `optional` marks a per-letter pulse. Those compete for `BUDGET` and are cut
 * short, oldest first, when more of them are in flight than the renderer can
 * carry; everything driving a transition is unmarked and always runs.
 */
export function dfxSeq(
  el: HTMLElement,
  stops: [number, number][],
  mb?: number,
  optional?: boolean,
): void {
  if (!el || !stops.length) return;

  // A re-entered button restarts its own run rather than queueing behind it,
  // and keeps its slot instead of competing with itself for a new one.
  stop(el);

  const nodes = ensureNodes(el);
  if (!nodes) return;

  const MB = mb || DEFAULT_MB;
  const set = (u: number) => {
    const inv = Math.max(0, 1 - u);
    nodes.blur.setAttribute('stdDeviation', (MB * Math.pow(inv, BLUR_GAMMA)).toFixed(2));
    nodes.comp.setAttribute('k4', (K4_BASE + K4_SPAN * u).toFixed(4));
  };

  const last = stops[stops.length - 1];
  const end = last[0];
  const uEnd = last[1];

  /**
   * Where this sequence would have left the element, applied right now. Stops
   * the frames first, so an evicted run frees its slot rather than carrying on
   * against the value just written.
   */
  const settle = () => {
    stop(el);
    if (uEnd > 0.995) dfxRelease(el);
    else set(uEnd);
  };

  // Reduced motion: land on the settled state now, no frames at all.
  if (isReduced(el)) {
    settle();
    return;
  }

  // Over budget with no letter left to take a slot from: skip the pulse. The
  // element still ends up exactly where the sequence would have put it, so a
  // skipped letter is a letter that did not speckle, never a letter stuck in
  // noise.
  if (optional && RUNS.size >= BUDGET && !evict()) {
    settle();
    return;
  }

  const t0 = performance.now();
  const step = (now: number) => {
    const t = now - t0;
    let u = stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const ta = stops[i - 1][0];
      const ua = stops[i - 1][1];
      const tb = stops[i][0];
      const ub = stops[i][1];
      if (t >= tb) {
        u = ub;
        continue;
      }
      if (t >= ta) {
        const p = tb > ta ? (t - ta) / (tb - ta) : 1;
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        u = ua + (ub - ua) * e;
      } else u = ua;
      break;
    }
    set(u);
    const run = RUNS.get(el);
    if (t < end) {
      if (run) run.raf = requestAnimationFrame(step);
    } else {
      RUNS.delete(el);
      // Fully resolved → drop the filter so the element stops paying for it,
      // and hand it back for the next letter to use.
      if (u > 0.995) dfxRelease(el);
    }
  };

  set(stops[0][1]);
  RUNS.set(el, { raf: requestAnimationFrame(step), optional: !!optional, land: settle });
}

/**
 * The standard settle curve. Dither amount over time:
 * `0@0 · 0@hold · 1@end · .82@+110 · 1@+250 · .95@+340 · 1@+450`.
 *
 * The two dips after landing are the *pulsing settle* — every image, bar and
 * title lands, pulses twice, then holds. This is the signature of the whole
 * design. Never replace it with a plain ease-out.
 */
export function dIn(el: HTMLElement, hold: number, tEnd: number, mb?: number): void {
  dfxSeq(
    el,
    [
      [0, 0],
      [hold, 0],
      [tEnd, 1],
      [tEnd + 110, 0.82],
      [tEnd + 250, 1],
      [tEnd + 340, 0.95],
      [tEnd + 450, 1],
    ],
    mb,
  );
}

/* ---------------------------------------------------------------- playIn */

function num(el: Element, name: string, dflt: number): number {
  const raw = el.getAttribute(name);
  if (raw === null || raw === '') return dflt;
  const v = Number(raw);
  return Number.isFinite(v) ? v : dflt;
}

/** Final resting state of each `ps-in-*` keyframe, for reduced motion. */
const SETTLED: Record<string, (el: HTMLElement) => void> = {
  wipeX: (e) => {
    e.style.clipPath = 'inset(0 0 0 0)';
  },
  wipeUp: (e) => {
    e.style.clipPath = 'inset(0 0 0 0)';
  },
  // The bar is a sweep that exits the box — its settled state is gone, not shown.
  bar: (e) => {
    e.style.left = '100%';
    e.style.opacity = '0';
  },
  fade: (e) => {
    e.style.opacity = '1';
    e.style.transform = 'none';
  },
  line: (e) => {
    e.style.transform = 'scaleY(1)';
  },
};

function settle(el: HTMLElement, kind: string): void {
  el.style.animation = 'none';
  el.style.filter = '';
  const fn = SETTLED[kind];
  if (fn) {
    fn(el);
    return;
  }
  el.style.clipPath = 'none';
  el.style.opacity = '1';
  el.style.transform = 'none';
}

/**
 * Run every `[data-dither]` / `[data-intro]` / `[data-dfx]` inside `scope` on
 * its own delay. `shift` offsets every delay; `dither` (intro only) replaces
 * the clip/fade keyframes with a dither-in on the same beat.
 */
export function playIn(scope: HTMLElement, shift?: number, dither?: boolean): void {
  const sh = shift || 0;
  const quiet = isReduced(scope);

  (TIMERS.get(scope) || []).forEach(clearTimeout);
  const timers: number[] = [];
  TIMERS.set(scope, timers);

  // Per-letter dither with the four-color flash — the wordmark lines.
  qq(scope, '[data-dither]').forEach((el) => {
    let src = SRC.get(el);
    if (src === undefined) {
      src = el.textContent || '';
      SRC.set(el, src);
    }
    const step = num(el, 'data-in-step', 30);
    const delay = num(el, 'data-in-delay', 0) + sh;
    el.textContent = '';
    const chars = Array.from(src).map((c) => {
      const sp = document.createElement('span');
      // data-ch is the ambient-glitch handle; data-l is the measurement handle
      // shared with wrapWord/fitLine/bbox.
      sp.setAttribute('data-ch', '');
      sp.setAttribute('data-l', '');
      if (c === ' ') sp.style.whiteSpace = 'pre';
      sp.textContent = c;
      sp.style.visibility = quiet ? 'visible' : 'hidden';
      el.appendChild(sp);
      return sp;
    });
    if (quiet) {
      el.style.filter = '';
      return;
    }
    const n = chars.length;
    // Scatter order (i × 5) mod n — never left-to-right.
    const order = chars.map((_, i) => i).sort((a, b) => ((a * 5) % n) - ((b * 5) % n) || a - b);
    order.forEach((ci, k) => {
      const sp = chars[ci];
      const t0 = delay + k * step;
      // Four colors 38ms apart, then clear to the resting ink at +152ms.
      for (let s = 0; s < 4; s++) {
        timers.push(
          window.setTimeout(() => {
            sp.style.visibility = 'visible';
            sp.style.color = FLASH[(ci * 2 + s * 3) % FLASH.length];
          }, t0 + s * 38),
        );
      }
      timers.push(
        window.setTimeout(() => {
          sp.style.color = '';
        }, t0 + 152),
      );
    });
    dIn(el, delay, delay + n * step + 520, autoMb(el));
  });

  qq(scope, '[data-intro]').forEach((el) => {
    const kind = el.getAttribute('data-intro') || 'fade';
    const dur = num(el, 'data-in-dur', 300);
    const delay = num(el, 'data-in-delay', 0) + sh;

    if (quiet) {
      settle(el, kind);
      return;
    }
    // Intro pass: dither everything with a real box instead of clipping it in.
    if (dither && Math.min(el.offsetWidth || 40, el.offsetHeight || 40) >= 4) {
      el.style.animation = 'none';
      el.style.clipPath = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      dIn(el, delay, delay + Math.round(dur * 1.5) + 220, autoMb(el));
      return;
    }
    const name = `ps-in-${kind}`;
    const ease = el.getAttribute('data-in-ease') || 'cubic-bezier(.2,0,0,1)';
    el.style.animation = 'none';
    void el.offsetWidth; // reflow, so re-running playIn restarts the keyframes
    el.style.animation = `${name} ${dur}ms ${ease} ${delay}ms both`;
  });

  qq(scope, '[data-dfx]').forEach((el) => {
    el.style.opacity = '1';
    if (quiet) {
      el.style.filter = '';
      return;
    }
    const d = num(el, 'data-in-delay', 0) + sh;
    dIn(el, d, d + num(el, 'data-dfx-dur', 540), num(el, 'data-dfx', 10));
  });
}

/* ----------------------------------------------------------------- misc */

/** Union box of an element's `[data-l]` letters, in viewport coordinates. */
export function bbox(el: Element): { left: number; top: number; w: number; h: number } {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  qq(el, '[data-l]').forEach((s) => {
    const r = s.getBoundingClientRect();
    if (!r.width && !r.height) return;
    if (r.left < x0) x0 = r.left;
    if (r.top < y0) y0 = r.top;
    if (r.right > x1) x1 = r.right;
    if (r.bottom > y1) y1 = r.bottom;
  });
  return { left: x0, top: y0, w: x1 - x0, h: y1 - y0 };
}

/** Cancel every Web Animation on `el` — used before every FLIP re-measure. */
export function killAnim(el: Element | null | undefined): void {
  if (!el) return;
  el.getAnimations().forEach((a) => {
    try {
      a.cancel();
    } catch {
      /* already finished or detached */
    }
  });
}
