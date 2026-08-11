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

/**
 * Drift cadence.
 *
 * The field used to sweep three rows a tick and flip each point between two
 * colours — the site's dither, one bit deep, and stepped hard because a
 * smoothed dither is mush. It reads as sixteen levels now, in SIZE and VALUE
 * together, and the smoothing is what makes that legible: at one bit a
 * transition blurs a decision, and at sixteen it is the thing that turns a
 * ladder of levels into a swell.
 *
 * The whole field is READ every tick rather than three rows, because a wave
 * that reaches a given point once a second is not a wave. It is cheap enough to
 * do that because a point only WRITES when its rung changes — a few dozen a
 * tick out of twelve hundred — and because neither property it writes causes
 * layout: `transform` composites and `color` paints.
 */
const TICK = 34;
const PHASE_STEP = 0.034;

/**
 * WHY THERE IS NO CSS TRANSITION ON A PEG.
 *
 * The first version of this smoothed the ladder with a 260ms transition on
 * colour and transform, which is the obvious way to turn sixteen steps into a
 * swell and is completely unaffordable at this scale. It left NINE HUNDRED AND
 * THIRTEEN transitions running at once, restarted every tick, and the whole
 * site dropped to fifty frames a second with fifty-millisecond stalls — the
 * cost is per ELEMENT, and there are twelve hundred of them.
 *
 * So the interpolation is done here instead, and the smoothness comes from
 * resolution rather than from easing: a finer ladder, stepped more often. A peg
 * only writes when its rung CHANGES, so a tick costs a few dozen writes rather
 * than twelve hundred, and nothing is left animating between ticks.
 */

/**
 * TWO THINGS THIS DOES NOT DO, BOTH MEASURED RATHER THAN ASSUMED.
 *
 * It does not ease with a CSS transition. Smoothing the ladder that way is the
 * obvious move and it left NINE HUNDRED AND THIRTEEN transitions running at
 * once, restarted every tick. The smoothing comes from RESOLUTION instead — a
 * ladder fine enough that a rung is below what the eye resolves — and a point
 * only writes when its rung changes, so nothing is left animating between ticks.
 *
 * And it does not size with `transform`. That one is genuinely surprising:
 * transform is supposed to be the cheap property, and here it was the entire
 * cost. Writing it on twelve hundred inline-flex spans hands the compositor
 * twelve hundred stacking contexts to carry, and the field measured 57 fps with
 * 33ms frames. The same animation in `font-size` measures 60.1 fps with 17.6ms
 * frames — indistinguishable from the field being switched off — because a
 * glyph resizing inside a fixed grid cell relayouts nothing but itself.
 * Cheap-property folklore is worth exactly one measurement.
 */

/** Depth of the ladder. Fine enough that a rung is below what the eye resolves. */
const LEVELS = 28;

/**
 * How hard the ordered matrix bites.
 *
 * At 0 the field is a plain sine swell with no texture; at 3 or more the Bayer
 * pattern reads as a static checker sitting on top of the wave. Around 2.4 the
 * matrix is what gives the swell its grain without ever becoming the subject.
 */
const BAYER_BITE = 2.4;

/** How much a hovered block swells the field around it, and how far out. */
const FOCUS_GAIN = 0.55;
const FOCUS_FALL = 260;

/**
 * THE CURSOR WAVE.
 *
 * The hero's dither used to answer the cursor: moving across it pushed a wake
 * that spread and settled, and that reaction is what made the field feel like a
 * surface rather than a texture. It is the same idea here and the same shape —
 * a short trail of disturbances, each carrying the momentum of the movement
 * that made it and each dying on its own clock — except that what it displaces
 * is the size and value of crosshairs instead of the threshold of a pixel.
 *
 * `TRAIL_R` is a little over five cells, so one disturbance is a patch of
 * marks and not a single mark: it has to be big enough to read as a wave and
 * small enough that the cursor is clearly the thing making it.
 */
const TRAIL_MAX = 18;
const TRAIL_LIFE = 620;
const TRAIL_R = 210;
const TRAIL_GAIN = 0.85;
/** Momentum from one pointermove, clamped. The frost field used the same shape. */
const TRAIL_CLAMP = 9;

interface Wave {
  x: number;
  y: number;
  /** signed momentum, roughly -1…1 */
  m: number;
  /** life remaining, 1 down to 0 */
  l: number;
}

/** Blend two hex colours. The ladder is built from this once per screen. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number): number =>
    Math.round(((pa >> sh) & 255) + ((((pb >> sh) & 255) - ((pa >> sh) & 255)) * t));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** PEG_OFF at the bottom, PEG_ON at the top, sixteen rungs between. */
const TINT: readonly string[] = Array.from({ length: LEVELS }, (_, i) =>
  mix(PEG_OFF, PEG_ON, i / (LEVELS - 1)),
);

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
  /** The ladder rung each ambient point is on, so a tick only writes changes. */
  lv: Int8Array | null;
  /** rAF handle for the ambient ticker, and the wall clock it advances on. */
  raf: number;
  clock: number;
  /** 0…1 arrival gate. Below 1 the field is still coming in; see `latticeFill`. */
  gate: number;
  /** ms the arrival takes, 0 once it is done */
  fill: number;
  /** the point the field swells around while a channel is hovered */
  focus: { x: number; y: number } | null;
  /** live cursor disturbances, newest last */
  trail: Wave[];
  /**
   * The trail, accumulated into the field's own grid once per tick.
   *
   * Per peg per wave would be twelve hundred times eighteen exponentials every
   * tick. Splatting each wave into its own bounding box instead costs about two
   * thousand adds for the whole field, and the per-peg loop then reads one
   * number — the disturbance is computed at the resolution it is drawn at,
   * which is the resolution it should have been computed at anyway.
   */
  disturb: Float32Array | null;
  /** last pointer position in design px, for the momentum of the next move */
  px: number;
  py: number;
  seen: boolean;
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
    lv: null,
    raf: 0,
    clock: 0,
    gate: 1,
    fill: 0,
    focus: null,
    trail: [],
    disturb: null,
    px: 0,
    py: 0,
    seen: false,
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
  const base = cell.dataset.base || PEG_OFF;
  cell.style.color = base;
  /*
    This is also what takes an ambient point's SWELL off it. The field animates
    the font size, so `baseSize` is both the resolved size and the bottom of the
    ladder — a released point lands there and the next tick starts it climbing
    again. Nothing else has to be remembered or undone.
  */
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
/**
 * Measure the resting face, whatever face the glitch has the letters in.
 *
 * THIS IS NOT TIDINESS. The letter glitch swaps individual `[data-l]` spans to
 * the alternates, which are narrower — between 0.845 and 0.99 of the default —
 * so a run measures narrower while it is glitched. A resolve landing in that
 * window clears fewer points than one landing a frame later, and the ten points
 * either side of the wordmark flickered between cleared and ambient for as long
 * as the glitch ran. It read as the field being unable to make up its mind, and
 * it made the "identical after a hover cycle" assertion intermittently false
 * for reasons that had nothing to do with hovering.
 *
 * So the inline face comes off for the length of the measuring pass and goes
 * back on after. The resting face is by construction the WIDEST the run can be,
 * which is the conservative direction: a point cleared for the resting face is
 * cleared for every face the glitch can put it in. One layout for the whole
 * pass, and resolves are debounced to a handful a second at worst.
 */
function unglitch(screen: HTMLElement): () => void {
  const saved: [HTMLElement, string, string, string][] = [];
  for (const sp of qq<HTMLElement>(screen, '[data-l]')) {
    if (!sp.style.fontFamily && !sp.style.fontFeatureSettings && !sp.style.visibility) continue;
    saved.push([sp, sp.style.fontFamily, sp.style.fontFeatureSettings, sp.style.visibility]);
    sp.style.fontFamily = '';
    sp.style.fontFeatureSettings = '';
    /*
      And VISIBILITY, which is the same bug wearing different clothes. The
      arrival dither blinks individual letters off and on, and the walker above
      rejects a hidden one — so a resolve landing in a blink cleared the points
      of every letter except that one, and the field flickered under the
      wordmark for as long as the effect ran. A letter that is momentarily off
      is still a letter that is about to be there.
    */
    sp.style.visibility = '';
  }
  return () => {
    for (const [sp, fam, feat, vis] of saved) {
      sp.style.fontFamily = fam;
      sp.style.fontFeatureSettings = feat;
      sp.style.visibility = vis;
    }
  };
}

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

  const regloss = unglitch(screen);
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
  regloss();
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
      if (!el) continue;
      if (el.closest('[data-lattice]')) continue;
      /*
        The glitch's own letter writes are ignored, and this is what makes the
        field STABLE rather than merely correct.

        The ambient glitch swaps a letter to the alternates every few seconds.
        Each swap is a style write on a `[data-l]` span, and letting those
        re-resolve made the occlusion flicker between two answers: the check
        passed or failed depending on whether a letter happened to be swapped
        when it looked.

        Ignoring them is SAFE rather than a shortcut, and only because the
        alternates are always narrower than the defaults (0.845x to 0.99x) and
        the lines are centered. A swapped line is therefore a strict subset of
        the resting line's box, so occlusion solved against the resting face
        already covers every state the glitch can reach. If the alternate ever
        became the wider face, this would have to go.
      */
      if (r.type === 'attributes' && el.closest('[data-l]')) continue;
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

/* ---------------------------------------------------------------- ambient */

/**
 * The ambient field: the site's dither, expressed as a swell in the crosshairs.
 *
 * Every ambient point gets a value from a slow two-axis sine field, offset by
 * its own place in the ordered Bayer matrix, and that value drives SIZE and
 * VALUE together up a sixteen-rung ladder. So the pattern crossing the plate is
 * the same ordered dither the rest of the site is built on — it is just being
 * drawn at the resolution of the field instead of the resolution of a pixel.
 *
 * Three things borrow this one ticker, and they differ only in what they feed
 * into the same value:
 *
 *   default   the sine field alone
 *   hover     plus a swell centred on the block under the cursor, set by
 *             `latticeFocus`, so the field leans toward what you are pointing at
 *   arrival   times a gate that rises from nothing, so the field comes IN in
 *             Bayer order rather than being there from the first frame
 *
 * WHAT IT WILL NOT TOUCH. Only points whose resolved base is `PEG_OFF`. Majors,
 * frame corners and occluded points hold exactly what the resolve gave them,
 * which is what keeps every invariant the harness checks true while the field
 * is moving — and points a hover owns are skipped too, because that module is
 * driving them.
 */

/** The top of the ladder, derived: an ambient peak is exactly a major's size. */
const topScale = (cfg: LatticeCfg): number => cfg.majorSize / cfg.micro;

function ambientTick(L: Lat, dt: number): void {
  const { cfg, cells } = L;
  if (!L.lv) L.lv = new Int8Array(cells.length).fill(-1);

  if (L.fill > 0) {
    L.gate = Math.min(1, L.gate + dt / L.fill);
    if (L.gate >= 1) L.fill = 0;
  }

  L.phase += PHASE_STEP * (dt / TICK);
  const t = L.phase;
  const top = topScale(cfg);
  const f = L.focus;

  /*
    Age the trail, then splat what is left into the field's own grid.
    Bounding boxes, and a quadratic falloff rather than a gaussian: no
    exponentials, no square roots, and a wave that reaches exactly as far as
    `TRAIL_R` rather than trailing off forever and being clipped anyway.
  */
  let D: Float32Array | null = null;
  if (L.trail.length) {
    for (const w of L.trail) w.l -= dt / TRAIL_LIFE;
    L.trail = L.trail.filter((w) => w.l > 0);
  }
  if (L.trail.length) {
    D = L.disturb ??= new Float32Array(cells.length);
    D.fill(0);
    const R2 = TRAIL_R * TRAIL_R;
    for (const w of L.trail) {
      const c0 = Math.max(0, Math.ceil((w.x - TRAIL_R - cfg.step) / cfg.step));
      const c1 = Math.min(cfg.cols - 1, Math.floor((w.x + TRAIL_R - cfg.step) / cfg.step));
      const r0 = Math.max(0, Math.ceil((w.y - TRAIL_R - cfg.step) / cfg.step));
      const r1 = Math.min(cfg.rows - 1, Math.floor((w.y + TRAIL_R - cfg.step) / cfg.step));
      for (let row = r0; row <= r1; row++) {
        const dy = cfg.step + cfg.step * row - w.y;
        for (let col = c0; col <= c1; col++) {
          const dx = cfg.step + cfg.step * col - w.x;
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2) continue;
          const g2 = 1 - d2 / R2;
          D[row * cfg.cols + col] += w.m * g2 * g2 * w.l;
        }
      }
    }
  }

  for (let row = 0; row < cfg.rows; row++) {
    const y = cfg.step + cfg.step * row;
    for (let col = 0; col < cfg.cols; col++) {
      const idx = row * cfg.cols + col;
      const cell = cells[idx];
      if (cell.dataset.base !== PEG_OFF || L.lit.has(idx)) {
        L.lv[idx] = -1;
        continue;
      }
      const x = cfg.step + cfg.step * col;

      let v = 0.5 + (Math.sin(x * 0.0026 + t) + Math.sin(y * 0.0031 - t * 0.7)) / 4;
      if (D) v += TRAIL_GAIN * D[idx];
      if (f) {
        const dx = x - f.x;
        const dy = y - f.y;
        v += FOCUS_GAIN * Math.exp(-(dx * dx + dy * dy) / (2 * FOCUS_FALL * FOCUS_FALL));
      }

      const b = bayer(col, row);
      const u = clamp01((v - b) * BAYER_BITE + 0.5);
      // The arrival is Bayer-ordered too, so the field assembles in the same
      // order it breathes in rather than fading up as a sheet.
      const g = L.gate >= 1 ? 1 : clamp01(L.gate * 1.7 - b * 0.7);
      const lv = Math.min(LEVELS - 1, (u * LEVELS) | 0);
      const key = g >= 1 ? lv : -2 - lv;

      if (L.lv[idx] === key) continue;
      L.lv[idx] = key;
      cell.style.color = TINT[lv];
      cell.style.fontSize = `${(cfg.micro * g * (1 + u * (top - 1))).toFixed(2)}px`;
    }
  }
}

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Start the ambient field. Returns its own stop function.
 *
 * Paused while the field's ONE boolean-shaped owner holds it — the open
 * transition and the index scroll, both of which are placing points themselves
 * — but NOT while a channel hover holds it. A hover is refcounted rather than
 * owned, and the field leaning toward the cursor is the whole point of the
 * hover state; the hover's own points are skipped by base and by `lit`, so
 * there is nothing for the two to fight over.
 */
export function startDrift(screen: HTMLElement, fillMs = 0): () => void {
  const L = LATS.get(screen);
  if (!L) return () => {};
  stopDrift(screen);
  if (reduced(screen)) {
    // No swell, but the field must still be THERE.
    L.gate = 1;
    L.fill = 0;
    return () => {};
  }

  if (fillMs > 0) {
    L.gate = 0;
    L.fill = fillMs;
    L.lv = null;
    for (const c of L.cells) if (c.dataset.base === PEG_OFF) c.style.fontSize = '0px';
  }

  L.clock = performance.now();
  const loop = (now: number): void => {
    L.raf = 0;
    const dt = Math.min(240, now - L.clock);
    if (dt >= TICK) {
      L.clock = now;
      if (!L.owned) ambientTick(L, dt);
    }
    L.raf = requestAnimationFrame(loop);
  };
  L.raf = requestAnimationFrame(loop);
  return () => stopDrift(screen);
}

export function stopDrift(screen: HTMLElement): void {
  const L = LATS.get(screen);
  if (!L) return;
  window.clearInterval(L.timer);
  L.timer = 0;
  if (L.raf) cancelAnimationFrame(L.raf);
  L.raf = 0;
}

/**
 * Lean the field toward a point, or let it go.
 *
 * In design px, screen-local. `channels.ts` sets it on enter and clears it on
 * leave, which is the hover state: the block itself gets its personality and
 * the field around it swells toward it.
 */
export function latticeFocus(screen: HTMLElement, x: number | null, y = 0): void {
  const L = LATS.get(screen);
  if (!L) return;
  L.focus = x === null ? null : { x, y };
}

/**
 * Wire a screen's field to the cursor.
 *
 * Each move pushes one disturbance carrying the momentum of that move — the
 * same `(dx + dy × 0.45) × 1.15` the frost field used, so the hero answers a
 * horizontal sweep more than a vertical one exactly as it always did — and the
 * trail is capped so a fast drag across the screen leaves a wake rather than a
 * solid bar. `pointerleave` stops feeding it and lets what is there die out,
 * which is the field settling rather than being switched off.
 *
 * Idempotent: a screen already tracked is left alone.
 */
const TRACKED = new WeakSet<HTMLElement>();

export function trackLatticeCursor(screen: HTMLElement): void {
  if (TRACKED.has(screen)) return;
  TRACKED.add(screen);

  const push = (e: PointerEvent): void => {
    const L = LATS.get(screen);
    if (!L || reduced(screen)) return;
    const k = scaleOf(screen);
    const r = screen.getBoundingClientRect();
    const x = (e.clientX - r.left) / k;
    const y = (e.clientY - r.top) / k;
    if (L.seen) {
      const dx = x - L.px;
      const dy = y - L.py;
      if (dx || dy) {
        let m = (dx + dy * 0.45) * 1.15;
        if (m > TRAIL_CLAMP) m = TRAIL_CLAMP;
        else if (m < -TRAIL_CLAMP) m = -TRAIL_CLAMP;
        L.trail.push({ x, y, m: m / TRAIL_CLAMP, l: 1 });
        if (L.trail.length > TRAIL_MAX) L.trail.shift();
      }
    }
    L.px = x;
    L.py = y;
    L.seen = true;
  };

  screen.addEventListener('pointermove', push, { passive: true });
  screen.addEventListener('pointerdown', push, { passive: true });
  screen.addEventListener(
    'pointerleave',
    () => {
      const L = LATS.get(screen);
      if (L) L.seen = false;
    },
    { passive: true },
  );
}

/**
 * The arrival: the field comes in from nothing, in Bayer order.
 *
 * Called on boot and on an intro replay, so what a visitor sees is the plate
 * assembling rather than a page that was already finished when they got there.
 */
export function latticeFill(screen: HTMLElement, ms = 1100): void {
  startDrift(screen, ms);
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
