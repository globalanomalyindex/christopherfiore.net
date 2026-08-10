/**
 * The crosshair lattice — build, resolve, drift.
 *
 * A field of `+` glyphs on a fixed module, one per CSS grid cell, flat and
 * row-major so a point's index is always `row * cols + col`. Every pass below
 * depends on that indexing; keep the list flat.
 *
 * THE THREE STATES, resolved by one idempotent pass in this order:
 *
 *   1. reset    every point to micro size, PEG_OFF
 *   2. majors   points on the module to major size, PEG_MAJOR
 *   3. corners  every frame's four rendered corners to PEG_CORNER, major + 6
 *   4. occlude  any point whose glyph would land inside a run of type, cleared
 *
 * Order matters and the last step is not optional. A 120px-module lattice puts
 * a row of points through the optical center of every two-module frame, which
 * is exactly where centered type sits, so without occlusion the label of every
 * channel has crosshairs printed through it.
 *
 * TWO TRAPS, both flagged by the handoff as having cost real debugging time,
 * and both designed out here rather than commented around:
 *
 * · A peg is NEVER restored by clearing its inline color. `style.color = ''`
 *   drops the glyph to the inherited color, which is near-black, and leaves a
 *   permanent scar on the field. Restoration always writes a named value taken
 *   from the peg's own resolved state (`dataset.base`), never from a color
 *   captured when an animation started — the resolve pass can run mid-hover,
 *   on a font load or a resize, and a captured value would put a corner back
 *   as ambient.
 * · The drift's row cursor and the rectangle painter are separately named
 *   (`sweepRow` vs `paintRect`). In the prototype both were `sweep`, the
 *   counter overwrote the method on the first tick, and that killed the wave
 *   AND made the transition throw before its teardown was registered.
 */

import { el, qq } from '../dom.ts';
import { PEG_CORNER, PEG_MAJOR, PEG_OFF, PEG_ON } from '../design/tokens.ts';
import {
  type Frame,
  type LatticeCfg,
  assertLattice,
  colAt,
  isMajor,
  rowAt,
} from '../design/lattice.ts';
import { state } from './state.ts';

/** The ordered-dither matrix the rest of the site already uses. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Normalized Bayer threshold for a cell, 0…1. */
const bayer = (col: number, row: number): number =>
  (BAYER4[(row % 4) * 4 + (col % 4)] + 0.5) / 16;

/** Drift cadence. Deliberately slow and stepped; the field is not a shimmer. */
const TICK = 120;
const PHASE_STEP = 0.12;
/** Rows advanced per tick. Sweeping bands reads as a wave; random cells read as noise. */
const SWEEP_ROWS = 3;

/**
 * Extra clearance around a text run, on top of the run's own box.
 *
 * The handoff specifies the occlusion band as `±(fontSize × 0.30 + step ×
 * 0.16)` around a line's optical center. That constant does not satisfy the
 * handoff's OWN assertion ("no peg glyph's ink box intersects any text ink
 * box, 0 on both screens"): at the wordmark's 128px it clears ±44.8px while
 * the glyphs reach roughly ±64, and eight pegs print through the wordmark.
 *
 * So the band is derived instead of tuned. A text run's client rect is already
 * its font box, which is taller than its ink, so using the rect and adding
 * half the peg glyph is conservative in the right direction and makes the
 * assertion true by construction at every size. A tuned ratio can only ever be
 * right at the size it was tuned at.
 */
const PEG_CLEAR = 0.6;

/** Resolve is debounced rather than driven by rAF; see `scheduleResolve`. */
const RESOLVE_DEBOUNCE = 90;
/** The longest a resolve request may be deferred by fresh mutations. */
const MAX_DEFER = 600;

interface Lat {
  cfg: LatticeCfg;
  host: HTMLElement;
  cells: HTMLElement[];
  /** Row the drift is currently sweeping. A counter, never a function. */
  sweepRow: number;
  phase: number;
  timer: number;
  resolveT: number;
  /** When the oldest un-served resolve request arrived; 0 when none is pending. */
  resolveFirst: number;
  /** Number of live claims on the field. Nothing global runs while this is >0. */
  holds: number;
  /** Whether this screen's one boolean-shaped owner currently holds it. */
  owned: boolean;
  /** Points a hover currently owns; the drift skips these. */
  lit: Set<number>;
}

const LATS = new WeakMap<HTMLElement, Lat>();

/** The lattice mounted on a screen, if there is one. */
export const latticeOf = (screen: HTMLElement): Lat | undefined => LATS.get(screen);

function reduced(screen: HTMLElement): boolean {
  const st = screen.closest<HTMLElement>('[data-stage]');
  if (st) return state(st).reduced;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Design-px scale of the stage, so rects read back in the 1920 space. */
function scaleOf(node: Element): number {
  const st = node.closest<HTMLElement>('[data-stage]');
  return st ? (st.getBoundingClientRect().width || 1920) / 1920 : 1;
}

/* ------------------------------------------------------------------ mount */

/**
 * Build the field. Cells are generated here rather than shipped as markup:
 * 1222 nodes on the menu and 2205 on the index is a lot of DOM and zero bytes
 * over the wire.
 *
 * The container is inset by half a step so each cell's CENTER is a point.
 */
export function mountLattice(screen: HTMLElement, cfg: LatticeCfg): void {
  const problems = assertLattice(cfg);
  if (problems.length) console.warn('[lattice]', problems.join('; '));

  const existing = LATS.get(screen);
  if (existing && existing.host.isConnected) return;

  const host = el('div', {
    'data-lattice': '',
    'aria-hidden': 'true',
    style:
      `position:absolute;left:${cfg.step / 2}px;top:${cfg.step / 2}px;` +
      `width:${cfg.cols * cfg.step}px;height:${cfg.rows * cfg.step}px;` +
      `display:grid;grid-template-columns:repeat(${cfg.cols},${cfg.step}px);` +
      `grid-auto-rows:${cfg.step}px;pointer-events:none;z-index:1;` +
      // No transition on color anywhere in this tree. A smoothed dither is mush;
      // the field must snap.
      'transition:none',
  });

  const cells: HTMLElement[] = [];
  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      const c = el('span', {
        style:
          'display:flex;align-items:center;justify-content:center;' +
          `line-height:1;font-size:${cfg.micro}px;color:${PEG_OFF};` +
          'transition:none;user-select:none',
      });
      c.textContent = '+';
      host.appendChild(c);
      cells.push(c);
    }
  }

  screen.insertBefore(host, screen.firstChild);
  LATS.set(screen, {
    cfg,
    host,
    cells,
    sweepRow: 0,
    phase: 0,
    timer: 0,
    resolveT: 0,
    resolveFirst: 0,
    holds: 0,
    owned: false,
    lit: new Set(),
  });
}

export function unmountLattice(screen: HTMLElement): void {
  const L = LATS.get(screen);
  if (!L) return;
  window.clearInterval(L.timer);
  window.clearTimeout(L.resolveT);
  L.host.remove();
  LATS.delete(screen);
}

/* ---------------------------------------------------------------- resolve */

/** Write a peg's resolved state and remember it for every later restore. */
function setBase(cell: HTMLElement, color: string, size: number, corner?: boolean): void {
  cell.dataset.base = color;
  cell.dataset.baseSize = String(size);
  if (corner) cell.dataset.corner = '1';
  else delete cell.dataset.corner;
  cell.style.color = color;
  cell.style.fontSize = `${size}px`;
}

/** Put a peg back exactly where the resolve pass left it. Never `color = ''`. */
export function restorePeg(cell: HTMLElement): void {
  cell.style.color = cell.dataset.base || PEG_OFF;
  cell.style.fontSize = `${cell.dataset.baseSize || 10}px`;
}

/**
 * Resolve the whole field. Idempotent: running it twice in a row produces
 * identical DOM, which is what makes it safe to call on every font load,
 * resize and mutation.
 */
export function solveLattice(screen: HTMLElement): void {
  const L = LATS.get(screen);
  if (!L || L.holds > 0) return;
  const { cfg, cells } = L;
  const k = scaleOf(screen);
  const sr = screen.getBoundingClientRect();

  // 1 · reset, and 2 · majors
  for (let row = 0; row < cfg.rows; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      const cell = cells[row * cfg.cols + col];
      if (isMajor(cfg, col, row)) setBase(cell, PEG_MAJOR, cfg.majorSize);
      else setBase(cell, PEG_OFF, cfg.micro);
    }
  }

  // 3 · frame corners, read back from the DOM so a copy edit that resizes a
  //     block re-solves its corners for free
  for (const f of qq<HTMLElement>(screen, '[data-frame]')) {
    const r = f.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x0 = (r.left - sr.left) / k;
    const y0 = (r.top - sr.top) / k;
    const x1 = (r.right - sr.left) / k;
    const y1 = (r.bottom - sr.top) / k;
    const paper = f.hasAttribute('data-frame-invert');
    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x0, y1],
      [x1, y1],
    ] as [number, number][]) {
      const col = colAt(cfg, x, cfg.step * 0.25);
      const row = rowAt(cfg, y, cfg.step * 0.25);
      if (col < 0 || row < 0) continue;
      // Channel 04 inverts, so its corners take paper or they vanish into the band.
      setBase(cells[row * cfg.cols + col], paper ? PEG_OFF : PEG_CORNER, cfg.majorSize + 6, true);
    }
  }

  // 4 · occlusion
  occlude(screen, L, k, sr);
}

/**
 * Clear any point whose glyph would land inside a run of type.
 *
 * Walks text nodes and takes each Range's client rects rather than element
 * boxes, because an element box is the whole line track and would clear far
 * more of the field than the ink actually covers.
 */
function occlude(screen: HTMLElement, L: Lat, k: number, sr: DOMRect): void {
  const { cfg, cells } = L;
  const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.textContent || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || p.closest('[data-lattice]')) return NodeFilter.FILTER_REJECT;
      const cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  // Half the peg glyph, so a point whose own ink would graze the run is cleared
  // too rather than only points whose center lands inside it.
  const pegPad = cfg.majorSize * PEG_CLEAR;

  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.parentElement) continue;
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (!r.width || !r.height) continue;
      const x0 = (r.left - sr.left) / k - pegPad;
      const x1 = (r.right - sr.left) / k + pegPad;
      const y0 = (r.top - sr.top) / k - pegPad;
      const y1 = (r.bottom - sr.top) / k + pegPad;
      const c0 = Math.max(0, Math.floor((x0 - cfg.step) / cfg.step));
      const c1 = Math.min(cfg.cols - 1, Math.ceil((x1 - cfg.step) / cfg.step));
      const r0 = Math.max(0, Math.floor((y0 - cfg.step) / cfg.step));
      const r1 = Math.min(cfg.rows - 1, Math.ceil((y1 - cfg.step) / cfg.step));
      for (let row = r0; row <= r1; row++) {
        const py = cfg.step + cfg.step * row;
        if (py < y0 || py > y1) continue;
        for (let col = c0; col <= c1; col++) {
          const px = cfg.step + cfg.step * col;
          if (px < x0 || px > x1) continue;
          setBase(cells[row * cfg.cols + col], 'transparent', cfg.micro);
        }
      }
    }
  }
  range.detach();
}

/**
 * Re-resolve, debounced.
 *
 * Debounced rather than driven by `requestAnimationFrame` on purpose: a screen
 * that loads hidden never gets a frame, and an rAF-gated resolve would leave
 * its lattice unsolved until something resized the window.
 */
export function scheduleResolve(screen: HTMLElement): void {
  const L = LATS.get(screen);
  if (!L) return;
  /*
    Debounced WITH A CEILING, and the ceiling is the whole point.

    A plain trailing debounce can be starved, and on this screen it was. The
    ambient glitch swaps a letter every one to four seconds forever, and each
    swap adds and removes nodes, so every one of them re-armed the 90ms timer
    and the resolve simply never ran. The field sat on whatever it had
    resolved before the fonts landed — 48 occluded points where it should have
    had 193 — and crosshairs printed through the wordmark until something
    happened to leave a long enough gap. It does not look like a starved timer.
    It looks like the occlusion pass is subtly wrong.

    So a request that has been waiting longer than MAX_DEFER runs now rather
    than waiting for quiet that a living screen never reaches.
  */
  if (!L.resolveFirst) L.resolveFirst = performance.now();
  if (performance.now() - L.resolveFirst >= MAX_DEFER) {
    window.clearTimeout(L.resolveT);
    L.resolveT = 0;
    L.resolveFirst = 0;
    solveLattice(screen);
    return;
  }
  window.clearTimeout(L.resolveT);
  L.resolveT = window.setTimeout(() => {
    L.resolveFirst = 0;
    solveLattice(screen);
  }, RESOLVE_DEBOUNCE);
}

/**
 * Claim or release the field. Returns the resulting number of holders.
 *
 * A REFCOUNT, not a boolean, and that distinction cost real debugging. Three
 * separate things claim the lattice — a channel hover, the open transition and
 * the index scroll — and with a plain flag whichever released last won. The
 * concrete failure: the transition claimed the field at t0, then its own
 * synthetic pointerout made the channel hover release, which set the flag back
 * to false, and 340ms later the channel's sweep-up ran a screen-wide release
 * straight through the middle of the transition's fill.
 *
 * Every claim must be paired. `setLatticeBusy` is kept as the boolean-shaped
 * front door for callers that genuinely own the whole field for a bounded run.
 */
export function holdLattice(screen: HTMLElement, delta: number): number {
  const L = LATS.get(screen);
  if (!L) return 0;
  L.holds = Math.max(0, L.holds + delta);
  return L.holds;
}

/** True while anything holds the field. Read it before doing anything global. */
export const latticeHeld = (screen: HTMLElement): boolean => (LATS.get(screen)?.holds ?? 0) > 0;

/**
 * Hold the resolve off while one owner has the field for a bounded run.
 *
 * Idempotent per screen rather than refcounted: calling it true twice claims
 * once, and false releases that one claim. Callers that interleave with other
 * owners want `holdLattice` instead.
 */
export function setLatticeBusy(screen: HTMLElement, busy: boolean): void {
  const L = LATS.get(screen);
  if (!L) return;
  if (busy === L.owned) return;
  L.owned = busy;
  holdLattice(screen, busy ? 1 : -1);
}

/**
 * Re-resolve whenever anything that moves type moves.
 *
 * `document.fonts.ready` is the one that is easy to leave out and impossible
 * to spot afterwards. Solving before the real face lands measures the fallback,
 * whose metrics have nothing to do with Dessign Maison's, so every text run is
 * a different width and the occlusion clears the wrong points. It does not look
 * broken. It looks like a handful of crosshairs printing through one label,
 * which reads as a rounding error and is not one.
 *
 * Returns a stop function that detaches every listener.
 */
export function watchLattice(screen: HTMLElement): () => void {
  const onResize = (): void => scheduleResolve(screen);
  const onVis = (): void => {
    if (document.visibilityState === 'visible') scheduleResolve(screen);
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => scheduleResolve(screen)).catch(() => scheduleResolve(screen));
  }
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVis);

  /*
    Anything that moves type re-resolves, and that has to include STYLE
    attributes, not just nodes and text.

    The intro reveals the wordmark by writing `visibility` on each letter, and
    a hidden letter is correctly skipped by the occlusion walk. Watching only
    childList and characterData meant none of those reveals was seen, so the
    field kept the state it resolved DURING the intro — 48 occluded points
    against the 193 the finished screen needs — until some unrelated mutation
    happened along seconds later. Crosshairs printed through the wordmark for
    the whole gap.

    Mutations inside the lattice itself are ignored, and that is not an
    optimisation. `solveLattice` and the drift both write inline styles to
    these 1222 cells; observing them would make every resolve schedule the
    next one forever.
  */
  const obs = new MutationObserver((records) => {
    for (const r of records) {
      const t = r.target;
      const el = t.nodeType === Node.ELEMENT_NODE ? (t as Element) : t.parentElement;
      if (el && el.closest('[data-lattice]')) continue;
      scheduleResolve(screen);
      return;
    }
  });
  obs.observe(screen, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style'],
  });

  return () => {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVis);
    obs.disconnect();
  };
}

/* ------------------------------------------------------------------ drift */

/**
 * The ambient wave: the site's dither field, expressed in crosshairs.
 *
 * Sweeps `SWEEP_ROWS` rows per tick rather than sampling random cells. That is
 * not a performance choice — updating N random cells scrambles the wave into
 * noise, and sweeping bands is what makes it read as something crossing the
 * plate. Points carrying a resolved state (majors, corners, occluded) and
 * points a hover owns are never touched.
 *
 * Returns its own stop function.
 */
export function startDrift(screen: HTMLElement): () => void {
  const L = LATS.get(screen);
  if (!L) return () => {};
  stopDrift(screen);
  if (reduced(screen)) return () => {};

  const { cfg, cells } = L;
  L.timer = window.setInterval(() => {
    if (L.holds > 0) return;
    L.phase += PHASE_STEP;
    const t = L.phase;
    for (let i = 0; i < SWEEP_ROWS; i++) {
      const row = (L.sweepRow + i) % cfg.rows;
      const y = cfg.step + cfg.step * row;
      for (let col = 0; col < cfg.cols; col++) {
        const idx = row * cfg.cols + col;
        const cell = cells[idx];
        // Majors, corners and occluded points hold their resolved value.
        if (cell.dataset.base !== PEG_OFF) continue;
        if (L.lit.has(idx)) continue;
        const x = cfg.step + cfg.step * col;
        const n = 0.5 + (Math.sin(x * 0.0026 + t) + Math.sin(y * 0.0031 - t * 0.7)) / 4;
        cell.style.color = bayer(col, row) < n * 0.68 ? PEG_ON : PEG_OFF;
      }
    }
    L.sweepRow = (L.sweepRow + SWEEP_ROWS) % cfg.rows;
  }, TICK);

  return () => stopDrift(screen);
}

export function stopDrift(screen: HTMLElement): void {
  const L = LATS.get(screen);
  if (!L) return;
  window.clearInterval(L.timer);
  L.timer = 0;
}

/* --------------------------------------------------------------- painting */

/** A rectangle in design px. Every painter below takes one of these. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Indices of every point whose position falls inside `r`, inclusive of edges. */
export function cellsInRect(screen: HTMLElement, r: Rect): number[] {
  const L = LATS.get(screen);
  if (!L) return [];
  const { cfg } = L;
  const out: number[] = [];
  const c0 = Math.max(0, Math.ceil((r.x - cfg.step) / cfg.step));
  const c1 = Math.min(cfg.cols - 1, Math.floor((r.x + r.w - cfg.step) / cfg.step));
  const r0 = Math.max(0, Math.ceil((r.y - cfg.step) / cfg.step));
  const r1 = Math.min(cfg.rows - 1, Math.floor((r.y + r.h - cfg.step) / cfg.step));
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) out.push(row * cfg.cols + col);
  }
  return out;
}

export type Edge = 'left' | 'right' | 'top' | 'bottom';

export interface FillOpts {
  /** The hue the interior takes. One of HUES, chosen by the caller. */
  hue: string;
  /** Optional accent for the top and bottom 14% of the rect. */
  accent?: string;
  /** Size the lit points grow to. Defaults to the major size. */
  size?: number;
  /** Which edge the reveal travels from. Random when omitted. */
  from?: Edge;
  /** Points the caller wants left alone — an inset ring's interior, say. */
  skip?: Set<number>;
}

const EDGES: Edge[] = ['left', 'right', 'top', 'bottom'];

/** Normalized 0…1 distance along `from`, used to order the reveal. */
function travelOf(cfg: LatticeCfg, idx: number, r: Rect, from: Edge): number {
  const col = idx % cfg.cols;
  const row = (idx / cfg.cols) | 0;
  const x = cfg.step + cfg.step * col;
  const y = cfg.step + cfg.step * row;
  if (from === 'left') return r.w ? (x - r.x) / r.w : 0;
  if (from === 'right') return r.w ? (r.x + r.w - x) / r.w : 0;
  if (from === 'top') return r.h ? (y - r.y) / r.h : 0;
  return r.h ? (r.y + r.h - y) / r.h : 0;
}

/**
 * Light a rectangle of points.
 *
 * The reveal is ordered, not timed per cell: each point gets a threshold of
 * `bayer × 0.45 + travel × 0.5` and a ramp climbs 0.17 every 40ms, switching
 * on every point it passes. That is what makes the fill read as dithered
 * weather crossing the block rather than as a wipe with noise on it.
 *
 * Lit points are recorded so the drift skips them and `releaseFor` can put
 * every one back from `dataset.base` — never from a color captured here, which
 * would go stale the moment a resolve ran mid-hover.
 */
export function fillFor(screen: HTMLElement, r: Rect, opts: FillOpts): void {
  const L = LATS.get(screen);
  if (!L) return;
  const { cfg, cells } = L;
  const size = opts.size ?? cfg.majorSize;
  const from = opts.from ?? EDGES[(Math.random() * EDGES.length) | 0];
  const idxs = cellsInRect(screen, r).filter((i) => !opts.skip?.has(i));

  // Accent bands: the top and bottom 14% of the rect take a different color.
  const band = r.h * 0.14;
  const accentOf = (i: number): string => {
    if (!opts.accent) return opts.hue;
    const y = cfg.step + cfg.step * ((i / cfg.cols) | 0);
    return y < r.y + band || y > r.y + r.h - band ? opts.accent : opts.hue;
  };

  if (reduced(screen)) {
    for (const i of idxs) {
      if (cells[i].dataset.base === 'transparent') continue;
      L.lit.add(i);
      cells[i].style.color = accentOf(i);
      cells[i].style.fontSize = `${size}px`;
    }
    return;
  }

  const thresh = new Map<number, number>();
  for (const i of idxs) {
    const col = i % cfg.cols;
    const row = (i / cfg.cols) | 0;
    thresh.set(i, bayer(col, row) * 0.45 + travelOf(cfg, i, r, from) * 0.5);
  }

  let ramp = 0;
  const pending = new Set(idxs);
  const step = (): void => {
    ramp += 0.17;
    for (const i of Array.from(pending)) {
      if ((thresh.get(i) ?? 0) > ramp) continue;
      pending.delete(i);
      // An occluded point stays occluded: type sits there.
      if (cells[i].dataset.base === 'transparent') continue;
      L.lit.add(i);
      cells[i].style.color = accentOf(i);
      cells[i].style.fontSize = `${size}px`;
    }
    if (pending.size) window.setTimeout(step, 40);
  };
  step();
}

/**
 * Put every lit point back exactly where the resolve pass left it.
 *
 * Restores from `dataset.base`, which is the whole reason `setBase` records it.
 * Clearing the inline color instead would drop each glyph to the inherited
 * near-black and scar the field permanently.
 */
export function releaseFor(screen: HTMLElement): void {
  const L = LATS.get(screen);
  if (!L) return;
  for (const i of L.lit) restorePeg(L.cells[i]);
  L.lit.clear();
}

/**
 * The held flicker: while a fill is up, re-dither a few of its points so the
 * block keeps breathing instead of sitting as a flat plate.
 *
 * Never touches a point whose resolved state is ink — a corner that flickered
 * would break the one invariant the whole system rests on. Returns its stop.
 */
export function holdFlicker(screen: HTMLElement, hue: string, alt: string): () => void {
  const L = LATS.get(screen);
  if (!L || reduced(screen)) return () => {};
  const t = window.setInterval(() => {
    const pool = Array.from(L.lit);
    if (!pool.length) return;
    for (let n = 0; n < 5; n++) {
      const i = pool[(Math.random() * pool.length) | 0];
      const cell = L.cells[i];
      if (cell.dataset.corner) continue;
      cell.style.color = Math.random() < 0.5 ? alt : hue;
    }
  }, 140);
  return () => window.clearInterval(t);
}

/**
 * Sweep a rectangle to one color in Bayer order over `ms`.
 *
 * The transition's painter. Deliberately named `paintRect`-style rather than
 * `sweep`: the drift's row cursor is `sweepRow`, and in the prototype a
 * counter and a method sharing the name `sweep` overwrote each other on the
 * first tick, which killed the ambient wave and made the transition throw
 * before its own teardown was registered.
 */
export function sweepRect(
  screen: HTMLElement,
  r: Rect,
  color: string,
  ms: number,
  size?: number,
): void {
  const L = LATS.get(screen);
  if (!L) return;
  const { cfg, cells } = L;
  const px = size ?? cfg.majorSize;
  /*
    Occluded points stay occluded, exactly as `fillFor` and `crossAt` already
    do. Without this the open transition prints crosshairs straight through the
    three sibling channel labels and the 128px wordmark for up to 260ms, which
    is the one thing the occlusion pass exists to prevent. The rule does not
    get suspended because the field is mid-choreography.
  */
  const idxs = cellsInRect(screen, r).filter((i) => cells[i].dataset.base !== 'transparent');
  if (reduced(screen)) {
    for (const i of idxs) {
      L.lit.add(i);
      cells[i].style.color = color;
      cells[i].style.fontSize = `${px}px`;
    }
    return;
  }
  const steps = Math.max(1, Math.round(ms / 40));
  let n = 0;
  const tick = (): void => {
    n++;
    const cut = n / steps;
    for (const i of idxs) {
      if (L.lit.has(i)) continue;
      const col = i % cfg.cols;
      const row = (i / cfg.cols) | 0;
      if (bayer(col, row) * 0.5 + travelOf(cfg, i, r, 'left') * 0.5 > cut) continue;
      L.lit.add(i);
      cells[i].style.color = color;
      cells[i].style.fontSize = `${px}px`;
    }
    if (n < steps) window.setTimeout(tick, 40);
  };
  tick();
}

/**
 * Light exactly one row and one column through a point, full ink.
 *
 * Channel 01's cursor scaffolding. Separate from `fillFor` because it is not a
 * rectangle and because it re-runs on every `pointermove` — it has to be cheap
 * and it has to clear its own previous cross, not the whole lit set.
 */
export function crossAt(
  screen: HTMLElement,
  col: number,
  row: number,
  color: string,
  within?: Rect,
): void {
  const L = LATS.get(screen);
  if (!L) return;
  const { cfg, cells } = L;
  const inside = within ? new Set(cellsInRect(screen, within)) : null;
  const take = (i: number): void => {
    if (inside && !inside.has(i)) return;
    if (cells[i].dataset.base === 'transparent') return;
    L.lit.add(i);
    cells[i].style.color = color;
    cells[i].style.fontSize = `${cfg.majorSize}px`;
  };
  for (let c = 0; c < cfg.cols; c++) take(row * cfg.cols + c);
  for (let rr = 0; rr < cfg.rows; rr++) take(rr * cfg.cols + col);
}

/** The lattice index nearest a design-px point, clamped into range. */
export function nearestIndex(screen: HTMLElement, x: number, y: number): number {
  const L = LATS.get(screen);
  if (!L) return -1;
  const { cfg } = L;
  const col = Math.max(0, Math.min(cfg.cols - 1, Math.round((x - cfg.step) / cfg.step)));
  const row = Math.max(0, Math.min(cfg.rows - 1, Math.round((y - cfg.step) / cfg.step)));
  return row * cfg.cols + col;
}

/** The config a screen was mounted with, for callers that need its step. */
export const cfgOf = (screen: HTMLElement): LatticeCfg | null => LATS.get(screen)?.cfg ?? null;

/* ------------------------------------------------------------- diagnostics */

/**
 * Compare a serialised CSS color against a token.
 *
 * `style.color` always reads back as `rgb(r, g, b)` while every token here is
 * a hex string, so any direct comparison between the two is always unequal.
 * That is a trap worth naming: it silently turns a leak detector into a
 * constant, and the count it produces looks plausible.
 */
function sameColor(a: string, b: string): boolean {
  const norm = (v: string): string => {
    const s = v.trim().toLowerCase();
    if (s.startsWith('#')) {
      const n = parseInt(s.slice(1), 16);
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return s;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map((x) => Math.round(parseFloat(x)));
    return `${p[0]},${p[1]},${p[2]}`;
  };
  return norm(a) === norm(b);
}

/**
 * Counts the checks in DO-NOT-BREAK §5 assert against. Exported so a browser
 * check can read them without reaching into module state.
 */
export function latticeStats(screen: HTMLElement): {
  total: number;
  majors: number;
  corners: number;
  occluded: number;
  hued: number;
  /** Live claims. Anything above 0 at rest is a leaked hold, and it is visible
   *  as a frozen drift and an occlusion pass that silently stopped running. */
  holds: number;
  drifting: boolean;
} | null {
  const L = LATS.get(screen);
  if (!L) return null;
  let majors = 0;
  let corners = 0;
  let occluded = 0;
  let hued = 0;
  for (const c of L.cells) {
    const b = c.dataset.base;
    if (c.dataset.corner) corners++;
    else if (b === PEG_MAJOR) majors++;
    else if (b === 'transparent') occluded++;
    // A cell still holding a hue after a hover cycle is the leak worth
    // catching. `style.color` serialises to `rgb(…)` while `base` is a hex, so
    // the two have to be normalised before they can be compared — comparing
    // them raw reports every major and every corner as leaked.
    if (b && b !== PEG_OFF && c.style.color && !sameColor(c.style.color, b)) hued++;
  }
  return { total: L.cells.length, majors, corners, occluded, hued, holds: L.holds, drifting: L.timer !== 0 };
}

/** Expose the stats to a browser check without reaching into module state. */
if (typeof window !== 'undefined') {
  (window as unknown as { __lat?: unknown }).__lat = latticeStats;
}

/** Every frame declared on a screen, in design px, for the corner assertion. */
export function frameRects(screen: HTMLElement): Frame[] {
  const k = scaleOf(screen);
  const sr = screen.getBoundingClientRect();
  return qq<HTMLElement>(screen, '[data-frame]').map((f, i) => {
    const r = f.getBoundingClientRect();
    return {
      id: f.getAttribute('data-frame') || String(i),
      x: (r.left - sr.left) / k,
      y: (r.top - sr.top) / k,
      w: r.width / k,
      h: r.height / k,
    };
  });
}
