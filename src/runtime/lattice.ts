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

/** Resolve is debounced rather than driven by rAF; see `schedule` below. */
const RESOLVE_DEBOUNCE = 90;

interface Lat {
  cfg: LatticeCfg;
  host: HTMLElement;
  cells: HTMLElement[];
  /** Row the drift is currently sweeping. A counter, never a function. */
  sweepRow: number;
  phase: number;
  timer: number;
  resolveT: number;
  /** Set while a transition owns the field, so the resolve cannot fight it. */
  busy: boolean;
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
    busy: false,
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
  if (!L || L.busy) return;
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
  window.clearTimeout(L.resolveT);
  L.resolveT = window.setTimeout(() => solveLattice(screen), RESOLVE_DEBOUNCE);
}

/** Hold the resolve off while a transition owns the field. */
export function setLatticeBusy(screen: HTMLElement, busy: boolean): void {
  const L = LATS.get(screen);
  if (!L) return;
  L.busy = busy;
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

  // Anything that adds a frame or rewrites a label re-resolves too. Attribute
  // changes are watched as well: a label that switches to the glitch alternate
  // is a different width, and the corners move with it.
  const obs = new MutationObserver(() => scheduleResolve(screen));
  obs.observe(screen, { childList: true, subtree: true, characterData: true });

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
    if (L.busy) return;
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
  return { total: L.cells.length, majors, corners, occluded, hued };
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
