/**
 * Every `[data-btn]` on the page, driven from delegated listeners and one clock.
 *
 * A button can be "hot" for three reasons at once: a pointer is over it, it
 * has keyboard focus, or a finger is on it. The band and the glitch go up when
 * the first reason arrives and come down when the last one leaves, so a
 * focused button that the mouse also passes over never flickers.
 *
 *   hover   the glitch on drawings (`ink.ts`) + the magnet; one button at a time.
 *           At 220ms of dwell, the lineage deck may deal an effect (`lineage.ts`).
 *   focus   band + the alternate face at once. Nothing animates for the keyboard.
 *   press   touch: band + the alternate face at once, no glitch, no lineage.
 *
 * THE CLOCK. Every hot button keeps the time it was entered and is repainted
 * each frame from elapsed time alone, by one requestAnimationFrame loop that
 * runs only while something is live. Leaving at any moment cuts every effect
 * in the same frame and plays the band's one drawing exit.
 *
 * Three properties move a button and none overlap: `transform` (the magnet),
 * `translate` (the seams), `scale` (the press).
 */

import { host, pool } from './band.ts';
import { band, letters, plan, type Edge, type Letter, type MenuGeo, type Plan } from './ink.ts';
import { fade, faces, paint, rest, settling, unface, type Face } from './glitch.ts';
import { engage, hold, move, release, releaseAll } from './magnet.ts';
import { reducedMotion } from './offsets.ts';

type Why = 'hover' | 'focus' | 'press';

/** What a lineage effect may change in one frame. Everything is optional. */
export interface Look {
  band?: { c: string; s: string }[];
  extra?: { c: string; s: string }[];
  outline?: boolean;
  hostS?: string;
  letters?: Letter[];
  ovS?: string;
  /** the resting word shows in its own ink (and the overlay hides) */
  rested?: boolean;
  /** Mark's underline, drawn in the band host */
  line?: string;
  /** anything else the effect owns in the DOM (Knockout's copy, Bayer's mask, Jelly's capsule) */
  own?: (h: Hot) => void;
}

export interface Geo {
  bw: number;
  bh: number;
  wl: number;
  ww: number;
  wt: number;
  wh: number;
  fs: number;
}

export interface Hot {
  b: HTMLElement;
  why: Set<Why>;
  /** the first label's plan; `plans` holds one per label */
  P: Plan;
  plans: Plan[];
  t0: number;
  out: number | null;
  exit: Edge | null;
  instant: boolean;
  host: HTMLSpanElement;
  faces: Face[];
  geo: Geo;
  px: number;
  px0: number | null;
  dealt: boolean;
  fx: string | null;
  /** the lineage card decided at entry, played at the dwell */
  fxPlan: string | null;
  own: boolean;
  /** pointer y, button coordinates */
  py: number;
  /** a dress was dealt (`dress.ts`) */
  dr: boolean;
}

/** The lineage chunk, once it has loaded (`lineage.ts`). Until then hovers are glitch only. */
export interface Lineage {
  /** at entry: the card this hover will play at the dwell, or null */
  deal(h: Hot): string | null;
  /** at the dwell, when the card is played */
  show(h: Hot): void;
  look(h: Hot, tau: number): Look;
  /** called every frame while a dealt effect or its credit is live; returns true while it still needs frames */
  tick(h: Hot | null, now: number): boolean;
  leave(h: Hot, now: number): void;
  cut(h: Hot): void;
}

let lineage: Lineage | null = null;
export const setLineage = (l: Lineage): void => {
  lineage = l;
};

/** What a dress (`dress.ts`) changes in one frame. */
export interface DressFrame {
  /** the band host's own box, top right bottom left px from the button's; negative overhangs */
  inset?: [number, number, number, number] | null;
  dropTop?: boolean;
  dropBottom?: boolean;
  outline?: boolean;
  /** layers laid over the band, under the strips (Chickpea's Cut) */
  extra?: { c: string; s: string }[];
}

/** The dress chunk, once it has loaded with lineage. Until then hovers are the glitch, Full and plain. */
export interface Dress {
  deal(h: Hot): void;
  frame(h: Hot, t: number, now: number): DressFrame;
  leave(h: Hot, now: number): void;
  cut(h: Hot): void;
  live(h: Hot, now: number): boolean;
}

let dress: Dress | null = null;
export const setDress = (d: Dress): void => {
  dress = d;
};

const DWELL = 220;
const EXIT_MS = 110;

const HOT = new Map<HTMLElement, Hot>();

/** The button under a mouse or pen right now. */
let current: HTMLElement | null = null;
/** The button under each finger, by pointerId: two fingers can press two buttons. */
const pressed = new Map<number, HTMLElement>();
let lastLeave = -1e9;
let raf = 0;

/** The JellyBox X answers for itself (`jx.ts`): no band, no glitch, no magnet. */
const btnOf = (t: EventTarget | null): HTMLElement | null => {
  const b = t instanceof Element ? t.closest<HTMLElement>('[data-btn]') : null;
  return b && !b.hasAttribute('data-jx') ? b : null;
};

const HOST = 'position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;';

function measure(b: HTMLElement): Geo {
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const w = b.querySelector<HTMLElement>('[data-word]');
  const wr = w ? w.getBoundingClientRect() : r;
  return {
    bw: b.offsetWidth,
    bh: b.offsetHeight,
    wl: (wr.left - r.left) / sc,
    ww: wr.width / sc,
    wt: (wr.top - r.top) / sc,
    wh: wr.height / sc,
    fs: parseFloat(getComputedStyle(b).fontSize) || 16,
  };
}

/**
 * A menu row's geometry for its hover. The figure's cell is one mono cell
 * either side of its text (the count on home, the detail in the pages block),
 * and only when it sits beside the label and leaves the page colour most of
 * the row.
 */
function menuGeo(b: HTMLElement, g: Geo, px: number): MenuGeo {
  const cell = g.fs / 2;
  let fig: [number, number] | null = null;
  const f = b.querySelector<HTMLElement>('.n, .l');
  const w = b.querySelector<HTMLElement>('[data-word]');
  if (f && w && f.textContent?.trim()) {
    const r = b.getBoundingClientRect();
    const sc = r.width / (b.offsetWidth || r.width) || 1;
    const range = document.createRange();
    range.selectNodeContents(f);
    const t = range.getBoundingClientRect();
    const wr = w.getBoundingClientRect();
    const beside = t.top < wr.bottom - 1 && t.left > wr.right;
    const l = Math.max(0, (t.left - r.left) / sc - cell);
    const rr = Math.min(g.bw, (t.right - r.left) / sc + cell);
    if (beside && rr - l <= 0.4 * g.bw) fig = [l, rr];
  }
  return { bw: g.bw, px, cell, fig };
}

function edgeOf(b: HTMLElement, x: number, y: number): Edge {
  const r = b.getBoundingClientRect();
  const d: [Edge, number][] = [
    ['l', x - r.left],
    ['r', r.right - x],
    ['t', (y - r.top) * 3],
    ['b', (r.bottom - y) * 3],
  ];
  d.sort((a, c) => a[1] - c[1]);
  return d[0][0];
}

function exitOf(b: HTMLElement, x: number, y: number): Edge {
  const r = b.getBoundingClientRect();
  if (x <= r.left + 2) return 'l';
  if (x >= r.right - 2) return 'r';
  if (y <= r.top + 2) return 't';
  return 'b';
}

function on(b: HTMLElement, why: Why, e?: PointerEvent | MouseEvent): void {
  const hot = HOT.get(b);
  if (hot) {
    hot.why.add(why);
    if (hot.out != null) {
      // Back before the exit finished: start over cleanly.
      cut(hot);
    } else return;
  }
  const now = performance.now();
  const instant = why !== 'hover' || reducedMotion();
  const geo = measure(b);
  const x = e?.clientX;
  const y = e?.clientY;
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const px = x != null ? (x - r.left) / sc : geo.bw / 2;
  const edge: Edge = x != null && y != null ? edgeOf(b, x, y) : 'l';
  const warm = !instant && now - lastLeave < 150;
  const fs = faces(b);
  const entry = (px - geo.wl) / Math.max(1, geo.ww);
  const hue = b.getAttribute('data-hue');
  // the label's line box, with room for the glitch face, which stands 1.14 times as tall
  const lab = { bh: geo.bh, top: geo.wt - 0.1 * geo.fs, bottom: geo.wt + geo.wh + 0.1 * geo.fs };
  const P = plan(fs[0]?.label ?? '', hue, edge, entry, warm, hue ? menuGeo(b, geo, px) : null, instant, lab);
  const plans = fs.map((f, i) => (i === 0 ? P : plan(f.label, P.main, edge, entry, warm)));
  b.setAttribute('data-hot', '');
  b.toggleAttribute('data-wide', geo.bw > 480);
  const h: Hot = {
    b,
    why: new Set([why]),
    P,
    plans,
    t0: now,
    out: null,
    exit: null,
    instant,
    host: host(b),
    faces: fs,
    geo,
    px,
    px0: null,
    // The keyboard, a finger and reduced motion never deal a lineage effect.
    dealt: why !== 'hover' || reducedMotion(),
    fx: null,
    fxPlan: null,
    own: b.hasAttribute('data-lin'),
    py: y != null ? (y - r.top) / sc : geo.bh / 2,
    dr: false,
  };
  HOT.set(b, h);
  // A pointer hover decides its lineage card now and plays it at the dwell; a
  // hover with no card is dressed (`dress.ts`). Never the keyboard or a finger.
  if (why === 'hover' && !instant) {
    if (lineage) h.fxPlan = lineage.deal(h);
    if (dress && !h.fxPlan) dress.deal(h);
  }
  // Reduced motion: a project's own row shows its effect's still end frame.
  if (reducedMotion() && h.own && lineage && why === 'hover') {
    h.fx = b.getAttribute('data-lin');
    h.t0 = now - 4000;
  }
  draw(h, now);
  kick();
}

function off(b: HTMLElement, why: Why, e?: PointerEvent | MouseEvent): void {
  const hot = HOT.get(b);
  if (!hot) return;
  hot.why.delete(why);
  if (hot.why.size || hot.out != null) return;
  const now = performance.now();
  hot.out = now - hot.t0;
  hot.exit = e && e.clientX != null ? exitOf(b, e.clientX, e.clientY) : null;
  if (why === 'hover') lastLeave = now;
  b.removeAttribute('data-hot');
  b.removeAttribute('data-press');
  // the pointer's leave crossfades the word back; the keyboard's is instant
  if (hot.instant) unface(hot.faces);
  else fade(hot.faces);
  if (lineage && hot.fx) lineage.leave(hot, now);
  if (dress && hot.dr) dress.leave(hot, now);
  if (hot.instant) cut(hot);
  else {
    draw(hot, now);
    kick();
  }
}

/** Everything of this hover gone, now. */
function cut(h: Hot): void {
  if (lineage) lineage.cut(h);
  if (dress && h.dr) dress.cut(h);
  h.host.remove();
  unface(h.faces);
  h.b.querySelectorAll('[data-k]').forEach((n) => {
    if (!h.host.contains(n)) n.remove();
  });
  h.b.removeAttribute('data-hot');
  HOT.delete(h.b);
}

/** One frame of one hover. */
function draw(h: Hot, now: number): void {
  // A frame's timestamp is when the frame began, which can be a moment before
  // the pointer event that started this hover, or the one that ended it.
  // Never draw from before either.
  let t = Math.max(0, now - h.t0);
  if (h.out != null && t < h.out) t = h.out;
  // the dress: the band host's own box, dropped strips, Chickpea's cells, the wire
  const df: DressFrame = h.dr && dress ? dress.frame(h, t, now) : {};
  const box = df.inset ? `inset:${df.inset.map((v) => `${v.toFixed(1)}px`).join(' ')};` : '';
  if (h.out != null) {
    if (t - h.out >= EXIT_MS) return cut(h);
    const look = h.fx && lineage ? lineage.look(h, -1) : {};
    pool(h.host, 'band', look.band ?? band(h.P, t, h.out, h.exit, h.instant), h.host.querySelector(':scope > .bo'));
    pool(h.host, 'x', []);
    pool(h.host, 'n', []);
    h.host.dataset.ol = '0';
    // the shape holds while the band takes its one drawing out
    const held = HOST + box;
    if (h.host.dataset.s !== held) {
      h.host.style.cssText = held;
      h.host.dataset.s = held;
    }
    return;
  }
  if (!h.dealt && t >= DWELL) {
    h.dealt = true;
    h.px0 = h.px;
    h.fx = h.fxPlan;
    // played or not, the dwell is when the cooldown and the repeat count from
    if (lineage) lineage.show(h);
  }
  const tau = t - DWELL;
  const look: Look = h.fx && lineage && tau >= 0 ? lineage.look(h, tau) : {};
  const outline = h.host.querySelector(':scope > .bo');
  let layers = look.band ?? band(h.P, t, null, null, h.instant);
  if (df.dropTop) layers = layers.filter((l) => l.c !== 'st t');
  if (df.dropBottom) layers = layers.filter((l) => l.c !== 'st b');
  if (df.extra?.length) layers = [layers[0], ...df.extra, ...layers.slice(1)];
  pool(h.host, 'band', layers, outline);
  pool(h.host, 'x', look.extra ?? [], outline);
  pool(h.host, 'n', look.line ? [{ c: 'bn', s: look.line }] : [], null);
  h.host.dataset.ol = look.outline === false || df.outline === false ? '0' : '1';
  const want = HOST + box + (look.hostS ?? '');
  if (h.host.dataset.s !== want) {
    h.host.style.cssText = want;
    h.host.dataset.s = want;
  }
  const ls = look.letters ?? letters(h.P, t, h.instant);
  h.faces.forEach((f, i) => {
    rest(f, !!look.rested);
    paint(f, i === 0 ? ls : letters(h.plans[i], t, h.instant), look.rested ? 'visibility:hidden' : look.ovS ?? null, now, !h.instant);
  });
  if (look.own) look.own(h);
}

/** Still moving: the glitch landing, waiting for the dwell, an effect playing, or an exit. */
function moving(h: Hot, now: number): boolean {
  const t = now - h.t0;
  return h.out != null || t < h.P.done || (!h.dealt && t < DWELL + 17) || (!!h.fx && t < DWELL + 900) || (h.dr && !!dress && dress.live(h, now)) || settling(h.faces);
}

function frame(now: number): void {
  raf = 0;
  let live = false;
  for (const h of [...HOT.values()]) {
    draw(h, now);
    if (HOT.has(h.b) && moving(h, now)) live = true;
  }
  if (lineage && lineage.tick(null, now)) live = true;
  if (live) raf = requestAnimationFrame(frame);
}

function kick(): void {
  if (!raf) raf = requestAnimationFrame(frame);
}

/** Everything down, now: back/forward cache restores, and the pointer leaving the window. */
function reset(): void {
  for (const h of [...HOT.values()]) {
    cut(h);
    release(h.b);
  }
  releaseAll();
  current = null;
  pressed.clear();
}

export function initButtons(): void {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const b = btnOf(e.target);
    if (b === current) return;
    if (current) {
      off(current, 'hover', e);
      // Leaving for plain text: keep stretching after the cursor. Leaving
      // straight into another button: let go now.
      if (b) release(current);
      else hold(current);
    }
    current = b;
    if (b) {
      engage(b);
      on(b, 'hover', e);
    }
  });

  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch' || e.relatedTarget) return;
    // Left the document entirely.
    if (current) {
      off(current, 'hover', e);
      release(current);
      current = null;
    }
    releaseAll();
  });

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      move(e.clientX, e.clientY, current);
      const h = current && HOT.get(current);
      if (h) {
        const r = h.b.getBoundingClientRect();
        const sc = r.width / (h.b.offsetWidth || r.width) || 1;
        h.px = (e.clientX - r.left) / sc;
        h.py = (e.clientY - r.top) / sc;
        // a wire follows the cursor in the same frame
        if (h.dr) kick();
      }
    },
    { passive: true },
  );

  document.addEventListener('focusin', (e) => {
    const b = btnOf(e.target);
    if (b && b.matches(':focus-visible')) on(b, 'focus');
  });
  document.addEventListener('focusout', (e) => {
    const b = btnOf(e.target);
    if (b) {
      off(b, 'focus');
      b.removeAttribute('data-pressk');
    }
  });

  // The press: mouse and pen get the press state; a finger gets the whole hot state at once.
  document.addEventListener('pointerdown', (e) => {
    const b = btnOf(e.target);
    if (!b) return;
    if (e.button === 0) b.setAttribute('data-press', '');
    if (e.pointerType !== 'touch') return;
    pressed.set(e.pointerId, b);
    on(b, 'press');
  });
  const lift = (e: PointerEvent) => {
    document.querySelectorAll('[data-press]').forEach((n) => n.removeAttribute('data-press'));
    const b = pressed.get(e.pointerId);
    if (!b) return;
    pressed.delete(e.pointerId);
    // Another finger may still be on the same button.
    if (![...pressed.values()].includes(b)) off(b, 'press');
  };
  document.addEventListener('pointerup', lift);
  document.addEventListener('pointercancel', lift);

  // Enter or Space: the outline cut only.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const b = btnOf(e.target);
    if (b) b.setAttribute('data-pressk', '');
  });
  document.addEventListener('keyup', (e) => {
    const b = btnOf(e.target);
    if (b) b.removeAttribute('data-pressk');
  });

  // A page restored from the back/forward cache comes back exactly as it was
  // left, which is usually mid-hover on the button that was clicked.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) reset();
  });
}

/** For the checks: the live hovers. */
export const hotNow = (): Hot[] => [...HOT.values()];
