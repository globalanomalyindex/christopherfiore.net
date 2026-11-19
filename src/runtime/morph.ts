/**
 * The ASCII morph: how one page becomes another.
 *
 * This is a multi-page site, so the film is cut across two documents:
 *
 *   1. COVER, on the page being left. A click on a link to another page of
 *      this site is held back while the page covers itself. At full cover
 *      the screen is the ground, the name and the "+", and a note is left in
 *      sessionStorage. Then the browser navigates.
 *   2. REVEAL, on the page being opened. An inline script in its <head> (see
 *      `MORPH_GATE` in render.ts) finds the note and starts the page covered,
 *      before first paint. This module then uncovers it.
 *
 * THE GRID. The window is one character grid in the page's own type. The
 * cell is measured, not assumed: its width from a probe string in the live
 * font, its height from the line height. The grid is placed so the page's
 * real "+" (`[data-anchor]`) is exactly one cell, and it starts at the top of
 * the header row. Whatever is above that is the name, which every page
 * shares, so it is never covered.
 *
 * HOW A STRING HIDES A PAGE. Each line is `width: fit-content` with the
 * ground behind it. A string of n characters is an opaque strip n cells long.
 * There are two stacks of lines: one anchored left, which can start at any
 * cell (it is moved along by whole cells), and one anchored right, covering
 * cells [b, cols). A circle cuts a row into one run inside it and up to two
 * outside, so those two are enough: inside is the left line, moved to where
 * the run starts; outside is the left line from the row's start and the right
 * line to its end.
 *
 * THE FILM. Distances are measured from where the click was (his note: "always
 * ripples out from wherever the cursor was clicked instead of the corner"). A
 * pointer click gives the point; a link opened from the keyboard gives its
 * own centre. The point is written into the note, so the next page opens from
 * the same place on the screen.
 *
 *   cover   a disc grows out of the click until it holds the window
 *   reveal  a second disc grows out of the same point, and the new page
 *           shows inside it
 *
 * Going home is the same ripple, since it starts where you clicked too.
 *
 * THE GLYPHS. A covered cell shows a character chosen by how far it is from
 * live page: "+" at the edge, then "=", "-", ":", "." and then blank. A fixed
 * 2 x 2 stagger knits the steps. Nothing is random: the same moment always
 * gives the same frame.
 *
 * WHAT CAN NEVER HAPPEN: A PAGE LEFT COVERED.
 *   - scripts off: the gate never runs. Links are plain links.
 *   - this module never arrives: the gate uncovers by itself at 1.2s.
 *   - a frame throws, the tab is hidden, or a timer overruns: the overlay is
 *     removed at once.
 *   - the navigation never happens: the page uncovers itself after 3s.
 *   - a return from the back/forward cache: the page comes back uncovered.
 *   - reduced motion: no film at all. Links are plain links.
 *
 * The overlay is `aria-hidden`, takes no pointer events and holds nothing
 * that can be focused.
 *
 * ROUND 3. Each half is its own gesture, because the network sits between
 * them: the cover leaves the click fast and settles into full cover (340ms,
 * radius eased 1 - (1-p)^1.6), the reveal shows what you read first first
 * (420ms, 1 - (1-p)^2). The clicked button has already glitched under the
 * pointer, so the film starts there with nothing else moving. Some films carry
 * a lineage variant, rolled at the click and written into the note so both
 * pages agree:
 *
 *   plain        6 in 10, and always the first change of a visit
 *   Bayer front  from dither: behind the front, his "+" dithered through a 4 by 4
 *                Bayer pattern anchored on the "+", dense at the edge, thinning out
 *   Figures      from the motion archive, study 7d: each line carries its own
 *                running count of the cells it covers behind the front,
 *                counting up as the page covers and down to 000 as the next
 *                one shows
 *
 * Going back or up replays the kind that opened the page. Never the same
 * lineage film twice running. Still deterministic: the same moment of the
 * same kind always gives the same frame.
 *
 * THE BACK BUTTON'S BOX. Its ledger box is wider than one cell, so a ghost of
 * it (its rules and its "+") sits on top of the film. Until the front reaches
 * the box, the box is left out of the film altogether, so the page shows
 * there. Going up, the X closes into the "+" from the click (jx.ts) while the
 * ripple spreads, and the box stays out of the film until the closing lands
 * at 300ms; then the ghost takes it, the same "+" in the same box.
 */

import { PULL, reducedMotion } from './offsets.ts';

declare global {
  interface Window {
    __psMorphIn?: Dir;
    __psMorphKind?: Kind;
    /** where the film started on the page before: the click, in window px */
    __psMorphAt?: [number, number] | null;
    __psMorphClaim?: number;
    __morph?: { seek(part: Part, dir: Dir, p: number, kind?: Kind, at?: [number, number]): void; clear(): void; force(kind: Kind | undefined): void };
  }
}

type Dir = 'out' | 'home';
type Part = 'cover' | 'reveal';
/** Which cells are covered: inside the circle, or outside it. */
type Shape = 'disc' | 'ring';
/** A film's lineage variant; null is the plain film. */
type Kind = 'bayer' | 'figures' | null;

const KEY = 'ps-morph';
const LIN = 'ps-lin';
const COVER_MS = 340;
const REVEAL_MS = 420;
/** Going up: the back button's X closes into the "+" in this long (jx.ts CLOSE_MS); its box stays out of the film till then. */
const CLOSE_HOLD = 300;
const B4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const ease = (part: Part, p: number) => (part === 'cover' ? 1 - (1 - p) ** 1.6 : 1 - (1 - p) ** 2);
/** Past this, a film is cut short and the page is shown. */
const SLACK_MS = 500;
/** If the browser has not left by then, the page uncovers itself. */
const STUCK_MS = 3000;

const RAMP = '+=-:.';
/** The width of each ramp step as a share of the film's reach. */
const STEP = [0.028, 0.046, 0.056, 0.064, 0.075];
const TAIL = STEP.reduce((a, b) => a + b, 0);
const BAYER = [
  [0, 0.5],
  [0.75, 0.25],
];
const STAGGER = 0.016;

interface Grid {
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  gx: number;
  gy: number;
  /** the anchor's cell */
  ac: number;
  ar: number;
  /** where the film starts, window px, and the column nearest it */
  ox: number;
  oy: number;
  oc: number;
  /** distance from each cell's centre to the start, px */
  dist: Float32Array;
  /** just past the far corner */
  reach: number;
  /** the character drawn in the anchor cell */
  glyph: string;
  /** this film's lineage variant */
  kind: Kind;
  /** the back button's ghost; how far the front travels before it reaches the box; until when the box is held */
  ghost: HTMLElement | null;
  ghostNear: number;
  holdUntil: number;
  /** the box's cells, held out of the film while the ghost is hidden: columns [0, bx1) of rows [by0, by1) */
  bx1: number;
  by0: number;
  by1: number;
}

const html = document.documentElement;
let overlay: HTMLDivElement | null = null;
let left: HTMLDivElement[] = [];
let right: HTMLDivElement[] = [];
let shown: string[] = [];
/** where each left line starts, in cells */
let offs: number[] = [];
let grid: Grid | null = null;
let raf = 0;
let timer = 0;
let busy = false;

/** Build the overlay and measure the grid from the real "+" and the real type. `at`: where the film starts; the "+" if none. */
function mount(at: [number, number] | null = null): Grid | null {
  unmount();
  const anchor = document.querySelector<HTMLElement>('[data-anchor]');
  if (!anchor) return null;

  const el = document.createElement('div');
  el.className = 'morph';
  el.setAttribute('aria-hidden', 'true');

  // The cell. Ten characters wide, so a fractional advance is measured well.
  const probe = document.createElement('span');
  probe.textContent = '++++++++++';
  probe.style.cssText = 'position:absolute;visibility:hidden';
  el.appendChild(probe);
  document.body.appendChild(el);
  const cw = probe.getBoundingClientRect().width / 10;
  const ch = Math.round(parseFloat(getComputedStyle(anchor).lineHeight) || cw * 2.6);
  probe.remove();
  if (!(cw > 2) || !(ch > 4)) {
    el.remove();
    return null;
  }

  // The "+", where it rests: the magnet may be leaning it. The back button's
  // box is the whole gutter, so its pin marks where home's "+" is.
  const r = (anchor.querySelector<HTMLElement>('.jx-pin') ?? anchor).getBoundingClientRect();
  const [px, py] = PULL.get(anchor) ?? [0, 0];
  const ax = r.left - px + r.width / 2;
  // A "+" scrolled off the top still starts the film, from the top edge.
  const ay = Math.max(r.top - py + r.height / 2, ch / 2);

  const vw = html.clientWidth;
  const vh = window.innerHeight;
  const ac = Math.max(0, Math.ceil((ax - cw / 2) / cw - 0.01));
  const gx = ax - cw / 2 - ac * cw;
  // The grid starts on the "+" row, or above it when the header row has a
  // line of its own up there (the figure chip, on a phone).
  const hd = anchor.closest<HTMLElement>('.hd');
  const top = Math.max(0, hd ? hd.getBoundingClientRect().top : ay - ch / 2);
  const ar = Math.max(0, Math.round((ay - ch / 2 - top) / ch));
  const gy = Math.round(ay - ch / 2) - ar * ch;
  const cols = Math.ceil((vw - gx) / cw) + 1;
  const rows = Math.max(1, Math.ceil((vh - gy) / ch));

  // the start: the click, kept inside the window; else the "+"
  const ox = at ? Math.max(0, Math.min(vw, at[0])) : gx + ac * cw + cw / 2;
  const oy = at ? Math.max(0, Math.min(vh, at[1])) : gy + ar * ch + ch / 2;
  const oc = Math.max(0, Math.min(cols - 1, Math.round((ox - gx) / cw - 0.5)));
  const dist = new Float32Array(cols * rows);
  let reach = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot(gx + (x + 0.5) * cw - ox, gy + (y + 0.5) * ch - oy);
      dist[y * cols + x] = d;
      if (d > reach) reach = d;
    }
  }
  reach += cw;

  const stack = (cls: string) => {
    const set = document.createElement('div');
    set.className = `set ${cls}`;
    set.style.cssText = `left:${gx}px;top:${gy}px;width:${cols * cw}px;line-height:${ch}px`;
    const lines: HTMLDivElement[] = [];
    for (let y = 0; y < rows; y++) {
      const ln = document.createElement('div');
      ln.className = 'ln';
      ln.style.height = `${ch}px`;
      set.appendChild(ln);
      lines.push(ln);
    }
    el.appendChild(set);
    return lines;
  };
  left = stack('l');
  right = stack('r');
  shown = new Array(rows * 2).fill('');
  offs = new Array(rows).fill(0);
  overlay = el;
  // The back button's ledger box is wider than one cell: the film would paint
  // its ground over the box's rules. A ghost of the box, its rules and its "+",
  // sits on top of the film instead, so the cell is left to the real "+".
  let ghost: HTMLElement | null = null;
  let ghostNear = 0;
  let bx1 = 0;
  let by0 = 0;
  let by1 = 0;
  if (anchor.matches('.jx')) {
    ghost = document.createElement('span');
    ghost.className = 'jx-ghost';
    ghost.textContent = '+';
    const br = anchor.getBoundingClientRect();
    ghost.style.cssText = `left:${br.left - px}px;top:${br.top - py}px;width:${br.width}px;height:${br.height}px;line-height:${br.height - 2}px;text-indent:${(ax - (br.left - px) - anchor.clientLeft - cw / 2).toFixed(2)}px`;
    el.appendChild(ghost);
    // how far the front travels before it touches the box
    const L = br.left - px;
    const R = br.right - px;
    const T = br.top - py;
    const B = br.bottom - py;
    ghostNear = Math.hypot(Math.max(L - ox, 0, ox - R), Math.max(T - oy, 0, oy - B));
    // the box's cells: the gutter's columns, on the rows it spans
    bx1 = Math.max(0, Math.min(cols, Math.ceil((R - gx) / cw)));
    by0 = Math.max(0, Math.floor((T - gy) / ch));
    by1 = Math.max(by0, Math.min(rows, Math.ceil((B - gy) / ch)));
  }
  // The film draws this page's own mark in the anchor cell: the "+".
  const glyph = (anchor.dataset.glyph ?? '+').charAt(0) || '+';
  grid = { cols, rows, cw, ch, gx, gy, ac, ar, ox, oy, oc, dist, reach, glyph, kind: null, ghost, ghostNear, holdUntil: 0, bx1, by0, by1 };
  return grid;
}

function unmount(): void {
  cancelAnimationFrame(raf);
  clearTimeout(timer);
  overlay?.remove();
  overlay = null;
  grid = null;
  left = [];
  right = [];
  offs = [];
}

/** Everything off, now. Safe to call at any time, any number of times. */
function clear(): void {
  unmount();
  busy = false;
  html.classList.remove('morph-in');
  html.removeAttribute('data-morph');
  html.removeAttribute('data-morph-dir');
}

/** Ramp step for a cell `s` px from live page. 0 is "+", 5 is blank. */
function stepOf(g: Grid, s: number, x: number, y: number): number {
  let v = s / g.reach + (BAYER[y & 1][x & 1] - 0.5) * STAGGER;
  if (v < 0) v = 0;
  for (let i = 0; i < STEP.length; i++) {
    if (v < STEP[i]) return i;
    v -= STEP[i];
  }
  return STEP.length;
}

/** Figures: the character k cells behind a front, with `count` read the right way round from the "+". */
const fig = (k: number, front: 'l' | 'r', count: string): string =>
  k === 0 ? '+' : k <= 3 ? count[front === 'r' ? 3 - k : k - 1] : k <= 7 ? '=-:.'[k - 4] : ' ';

/**
 * One frame. `shape` says which side of the circle of radius `R` is covered.
 * Sets each line's text, and where it starts, only when they changed.
 */
function draw(g: Grid, shape: Shape, R: number): void {
  const { cols, rows, ac, ar, oc, dist } = g;
  // the back button's box is left out of the film until its ghost takes it
  const hold = !!g.ghost && g.ghost.hidden;
  for (let y = 0; y < rows; y++) {
    const o = y * cols;
    const h0 = hold && y >= g.by0 && y < g.by1 ? g.bx1 : 0;
    // the run inside the circle, [a, b): the column nearest the start is the row's nearest cell
    let a = oc;
    let b = oc;
    if (dist[o + oc] < R) {
      while (a > 0 && dist[o + a - 1] < R) a--;
      b = oc + 1;
      while (b < cols && dist[o + b] < R) b++;
    }
    const inside = b > a;
    // the two covered runs of this row: [l0, l1) on the left line, [r0, cols) on the right
    let l0 = 0;
    let l1 = 0;
    let r0 = cols;
    if (shape === 'disc') {
      if (inside) {
        l0 = Math.max(a, h0);
        l1 = Math.max(l0, b);
      }
    } else if (!inside) {
      l0 = h0;
      l1 = cols;
    } else {
      l0 = h0;
      l1 = Math.max(h0, a);
      r0 = Math.max(b, h0);
    }
    // Figures: the line's own running count, how many cells it covers
    const count = String(Math.max(0, l1 - l0 + cols - r0)).padStart(3, '0');
    const cell = (x: number, k: number, front: 'l' | 'r'): string => {
      if (y === ar && x === ac) return g.glyph; // the anchor itself never leaves
      if (x < ac) return ' '; // the margin left of the "+" stays clean
      if (g.kind === 'figures') return fig(k, front, count);
      const sd = shape === 'disc' ? R - dist[o + x] : dist[o + x] - R;
      if (g.kind === 'bayer') {
        // his "+", dithered: dense at the front, thinning out over a tail twice as deep
        const v = sd / g.reach / (2 * TAIL);
        return v < 1 && v < (B4[(y - ar) & 3][(x - ac) & 3] + 0.5) / 16 ? '+' : ' ';
      }
      const i = stepOf(g, sd, x, y);
      return i < RAMP.length ? RAMP[i] : ' ';
    };
    let ls = '';
    if (shape === 'disc') {
      // fronts at both ends of the run, unless an end is the window's edge or the held box
      const fl = l0 === a && a > 0;
      const fr = b < cols;
      for (let x = l0; x < l1; x++) {
        const kl = fl ? x - l0 : Infinity;
        const kr = fr ? l1 - 1 - x : Infinity;
        ls += kl <= kr ? cell(x, kl, 'l') : cell(x, kr, 'r');
      }
    } else {
      // the left run's front is its right end (none when the circle is off this row)
      for (let x = l0; x < l1; x++) ls += cell(x, inside ? l1 - 1 - x : Infinity, 'r');
    }
    let rs = '';
    for (let x = r0; x < cols; x++) rs += cell(x, x - r0, 'l');
    if (shown[y] !== ls) left[y].textContent = shown[y] = ls;
    const off = ls ? l0 : 0;
    if (offs[y] !== off) {
      offs[y] = off;
      left[y].style.transform = off ? `translateX(${(off * g.cw).toFixed(2)}px)` : '';
    }
    if (shown[rows + y] !== rs) right[y].textContent = shown[rows + y] = rs;
  }
}

/** The film at progress `p` (0 to 1, already eased) of one of its two parts. */
function frame(g: Grid, part: Part, _dir: Dir, p: number): void {
  // Bayer's tail is twice as deep, so the front travels that much further
  const tail = g.kind === 'bayer' ? 2 * TAIL : TAIL;
  const span = g.reach * (1 + tail);
  // Both ways the film ripples out from where it started: the cover as a
  // disc, the reveal as the next page inside a second one.
  if (part === 'cover') {
    const R = p * span;
    // the ghost takes the back button's box once the front reaches it, and,
    // going up, once the X has closed into the "+"
    if (g.ghost?.hidden && R >= g.ghostNear && performance.now() >= g.holdUntil) g.ghost.hidden = false;
    draw(g, 'disc', R);
  } else draw(g, 'ring', p * span - g.reach * tail);
}

/** Play one part, then call `done`. Any failure calls `fail` instead. */
function play(part: Part, dir: Dir, ms: number, done: () => void, fail: () => void): void {
  const g = grid;
  if (!g) return fail();
  let t0 = -1;
  let over = false;
  const end = (ok: boolean) => {
    if (over) return;
    over = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', hidden);
    if (ok) done();
    else fail();
  };
  // A hidden tab gets no frames. Do not make anyone wait for a film they cannot see.
  const hidden = () => {
    if (document.hidden) end(part === 'cover');
  };
  document.addEventListener('visibilitychange', hidden);
  timer = window.setTimeout(() => end(part === 'cover'), ms + SLACK_MS);
  const tick = (now: number) => {
    if (over) return;
    if (t0 < 0) t0 = now;
    const p = Math.min(1, (now - t0) / ms);
    try {
      frame(g, part, dir, ease(part, p));
    } catch {
      return end(false);
    }
    if (p >= 1) end(true);
    else raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

/** A click that should be filmed: a plain left click on a link to another page of this site. */
function target(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
  let url: URL;
  try {
    url = new URL(a.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin) return null;
  // Files: the PDFs, the standalone prototypes. Pages are folders and end in a slash.
  if (/\.[a-z0-9]+$/i.test(url.pathname) || !url.pathname.endsWith('/')) return null;
  // A jump inside this page is not a page change.
  if (url.pathname === location.pathname) return null;
  return url;
}

/** The visit's film state, shared with the lineage deck in `ps-lin`. */
function visit(): { changes: number; lastFilm: Kind; opened: Record<string, Kind> } {
  try {
    const s = JSON.parse(sessionStorage.getItem(LIN) ?? '{}') ?? {};
    return { changes: s.changes | 0, lastFilm: s.lastFilm ?? null, opened: s.opened ?? {} };
  } catch {
    return { changes: 0, lastFilm: null, opened: {} };
  }
}

/** For the checks: the next film's variant, instead of the dice. */
let forcedKind: Kind | undefined;

/** Roll this film's variant. The first change of a visit is plain; going up replays what opened this page. */
function roll(url: URL, up: boolean): Kind {
  const v = visit();
  let kind: Kind = null;
  if (forcedKind !== undefined) kind = forcedKind;
  else if (up) kind = v.opened[location.pathname] ?? null;
  else if (v.changes > 0) {
    const r = Math.random();
    kind = r < 0.6 ? null : r < 0.8 ? 'bayer' : 'figures';
    if (kind && kind === v.lastFilm) kind = null;
  }
  try {
    const s = JSON.parse(sessionStorage.getItem(LIN) ?? '{}') ?? {};
    sessionStorage.setItem(
      LIN,
      JSON.stringify({ ...s, changes: v.changes + 1, lastFilm: kind ?? v.lastFilm, opened: { ...v.opened, [url.pathname]: kind } }),
    );
  } catch {
    /* fine */
  }
  return kind;
}

function leave(url: URL, at: [number, number]): void {
  // Going up (home, or a case study's back button to product designs) replays
  // the kind that opened this page, and the back button closes its X.
  const up = url.pathname !== location.pathname && location.pathname.startsWith(url.pathname);
  const dir: Dir = up ? 'home' : 'out';
  const kind = roll(url, up);
  const go = () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), dir, to: url.pathname, kind, at }));
    } catch {
      /* private mode: the next page simply opens uncovered */
    }
    html.setAttribute('data-morph', 'covered');
    // Hold the cover until the browser leaves. If it never does, give the page back.
    timer = window.setTimeout(clear, STUCK_MS);
    location.assign(url.href);
  };
  const g = mount(at);
  if (!g) {
    location.assign(url.href);
    return;
  }
  g.kind = kind;
  busy = true;
  // the back button's box is left to the page until the front reaches it;
  // going up, until its X has closed into the "+" too
  if (g.ghost) {
    g.ghost.hidden = true;
    if (dir === 'home') g.holdUntil = performance.now() + CLOSE_HOLD;
  }
  html.setAttribute('data-morph-dir', dir);
  html.setAttribute('data-morph', 'cover');
  // Warm the cache while the cover plays, so the cut between pages is short.
  try {
    fetch(url.href, { credentials: 'same-origin' }).catch(() => {});
  } catch {
    /* nothing to warm */
  }
  // The cover starts in the click's own frame: nothing waits for it.
  play('cover', dir, COVER_MS, go, () => {
    clear();
    location.assign(url.href);
  });
}

/** The page was opened mid-film: it is covered, so uncover it. */
function arrive(dir: Dir, kind: Kind, at: [number, number] | null): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clear();
      resolve();
    };
    window.__psMorphClaim = 1;
    busy = true;
    // The cell is measured in the page's own face. It was just used on the
    // page before, so this is a cache read; it still gets a ceiling.
    const face = document.fonts?.load
      ? Promise.race([
          document.fonts.load("400 16px 'Iosevka Charon Mono'").catch(() => {}),
          new Promise((r) => setTimeout(r, 250)),
        ])
      : Promise.resolve();
    // If this never gets as far as a frame, the page is still given back.
    timer = window.setTimeout(finish, 250 + REVEAL_MS + SLACK_MS);
    face.then(() => {
      clearTimeout(timer);
      try {
        const g = mount(at);
        if (!g) return finish();
        g.kind = kind;
        // Covered by the overlay now, in the same frame the gate's cover lifts.
        frame(g, 'reveal', dir, 0);
        html.classList.remove('morph-in');
        html.setAttribute('data-morph', 'reveal');
        play('reveal', dir, REVEAL_MS, finish, finish);
      } catch {
        finish();
      }
    });
  });
}

/**
 * Wire the morph. Resolves once any arrival film has finished, so whatever
 * should wait for the page to be seen (the signature) can.
 */
export function initMorph(): Promise<void> {
  document.addEventListener('click', (e) => {
    if (reducedMotion()) return;
    const url = target(e);
    if (!url) return;
    e.preventDefault();
    // One film at a time. A second click while it plays is swallowed.
    if (busy) return;
    // The film starts where the pointer clicked; from the keyboard, at the link's own centre.
    const a = e.target instanceof Element ? e.target.closest<HTMLElement>('a[href]') : null;
    const r = a?.getBoundingClientRect();
    const at: [number, number] = e.detail > 0 || !r ? [e.clientX, e.clientY] : [r.left + r.width / 2, r.top + r.height / 2];
    if (a) a.setAttribute('data-press', '');
    leave(url, at);
  });

  // A page restored from the back/forward cache comes back as it was left: covered.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) clear();
  });

  // For the checks and for filming stills: hold the film at a moment.
  window.__morph = {
    seek(part, dir, p, kind = null, at) {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      const g = grid && !at ? grid : mount(at ?? null);
      if (g) {
        g.kind = kind;
        frame(g, part, dir, p);
      }
    },
    clear,
    force(kind) {
      forcedKind = kind;
    },
  };

  const dir = window.__psMorphIn;
  if (html.classList.contains('morph-in') && dir && !reducedMotion()) return arrive(dir, window.__psMorphKind ?? null, window.__psMorphAt ?? null);
  html.classList.remove('morph-in');
  return Promise.resolve();
}
