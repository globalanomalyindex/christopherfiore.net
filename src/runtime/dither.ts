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

/** Per-element cloned filter, its animation frame, and playIn bookkeeping. */
const NODES = new WeakMap<HTMLElement, DfxNodes>();
const RAFS = new WeakMap<HTMLElement, number>();
const TIMERS = new WeakMap<HTMLElement, number[]>();
const SRC = new WeakMap<HTMLElement, string>();

/** Filter ids are minted in sequence (psd1, psd2, …), never randomly. */
let filterSeq = 0;

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

/** Clone the prototype filter for `el` (once) and point `el` at it. */
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
    const filter = proto.cloneNode(true) as SVGElement;
    const id = `psd${++filterSeq}`;
    filter.setAttribute('id', id);
    filter.removeAttribute('data-dithproto');
    defs.appendChild(filter);
    const blur = q<SVGFEGaussianBlurElement>(filter, 'feGaussianBlur');
    const comp = q<SVGElement>(filter, "feComposite[operator='arithmetic']");
    if (!blur || !comp) return null;
    nodes = { filter, blur, comp, id };
    NODES.set(el, nodes);
  }
  el.style.filter = `url(#${nodes.id})`;
  return nodes;
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
 */
export function dfxSeq(el: HTMLElement, stops: [number, number][], mb?: number): void {
  if (!el || !stops.length) return;
  const nodes = ensureNodes(el);
  if (!nodes) return;

  const MB = mb || DEFAULT_MB;
  const set = (u: number) => {
    const inv = Math.max(0, 1 - u);
    nodes.blur.setAttribute('stdDeviation', (MB * Math.pow(inv, BLUR_GAMMA)).toFixed(2));
    nodes.comp.setAttribute('k4', (K4_BASE + K4_SPAN * u).toFixed(4));
  };

  const running = RAFS.get(el);
  if (running !== undefined) cancelAnimationFrame(running);
  RAFS.delete(el);

  const last = stops[stops.length - 1];
  const end = last[0];
  const uEnd = last[1];

  // Reduced motion: land on the settled state now, no frames at all.
  if (isReduced(el)) {
    if (uEnd > 0.995) el.style.filter = '';
    else set(uEnd);
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
    if (t < end) RAFS.set(el, requestAnimationFrame(step));
    else {
      RAFS.delete(el);
      // Fully resolved → drop the filter so the element stops paying for it.
      if (u > 0.995) el.style.filter = '';
    }
  };

  set(stops[0][1]);
  RAFS.set(el, requestAnimationFrame(step));
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
