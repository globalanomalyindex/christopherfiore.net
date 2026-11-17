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
 * There are two stacks of lines: one anchored left, covering cells [0, b) of
 * its row, and one anchored right, covering cells [a, cols). A circle around
 * the "+" always cuts a row into "inside, from the left" and "outside, to the
 * right", so those two are enough.
 *
 * THE FILM. Distances are measured from the centre of the "+".
 *
 *   going to a page    cover: a disc grows out of the "+" until it holds the
 *                      window. reveal: a second disc grows out of the "+" and
 *                      the new page shows inside it.
 *   going home         the same film backwards. cover: the field closes in
 *                      from the far corner onto the "+". reveal: home shows
 *                      from the far corner inward, and the field shrinks into
 *                      the "+".
 *
 * Out of the "+" means open. Into the "+" means back.
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
 * them: the cover leaves the "+" fast and settles into full cover (340ms,
 * radius eased 1 - (1-p)^1.6), the reveal shows what you read first first
 * (420ms, 1 - (1-p)^2). At the click the "+" glitches for one drawing, as every
 * transition on the site starts with the glitch. Some films carry a lineage
 * variant, rolled at the click and written into the note so both pages agree:
 *
 *   plain        6 in 10, and always the first change of a visit
 *   Bayer front  from dither: behind the front, his "+" dithered through a 4 by 4
 *                Bayer pattern anchored on the "+", dense at the edge, thinning out
 *   Figures      from the motion archive, study 7d: each line carries its own
 *                running count behind the front, counting up on the way out and
 *                down to 000 at the "+" on the way home
 *   Coalesce     from one master affordance, 1 in 3 on top of any film, for a
 *                pointer click 160px or more from the "+": eight flat squares carry
 *                the click along the grid to the "+", and the film opens from there
 *
 * Going back or up replays the kind that opened the page, and on a page with
 * the back button the cover waits 100ms while its X collapses into the "+",
 * which it then closes in on. Never the same lineage film twice running. Still deterministic: the same moment of the
 * same kind always gives the same frame.
 */

import { PULL, reducedMotion } from './offsets.ts';

declare global {
  interface Window {
    __psMorphIn?: Dir;
    __psMorphKind?: Kind;
    __psMorphClaim?: number;
    __morph?: { seek(part: Part, dir: Dir, p: number, kind?: Kind): void; clear(): void; force(kind: Kind | undefined, coal?: boolean): void };
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
/** Coalesce: the squares' hop to the "+", and how long the cover waits for the first arrival. */
const HOP_MS = 140;
const COAL_LEAD = 80;
/** Going up: how long the cover waits while the back button's X collapses into the "+". */
const CLOSE_LEAD = 100;
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
  /** distance from each cell's centre to the anchor's, px */
  dist: Float32Array;
  /** just past the far corner */
  reach: number;
  /** the character drawn in the anchor cell */
  glyph: string;
  /** this film's lineage variant */
  kind: Kind;
  /** the back button's ghost, and how close the front comes before it must show */
  ghost: HTMLElement | null;
  ghostR: number;
}

const html = document.documentElement;
let overlay: HTMLDivElement | null = null;
let left: HTMLDivElement[] = [];
let right: HTMLDivElement[] = [];
let shown: string[] = [];
let grid: Grid | null = null;
let raf = 0;
let timer = 0;
let busy = false;

/** Build the overlay and measure the grid from the real "+" and the real type. */
function mount(): Grid | null {
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

  const dist = new Float32Array(cols * rows);
  let reach = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot((x - ac) * cw, (y - ar) * ch);
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
  overlay = el;
  // The back button's ledger box is wider than one cell: the film would paint
  // its ground over the box's rules. A ghost of the box, its rules and its "+",
  // sits on top of the film instead, so the cell is left to the real "+".
  let ghost: HTMLElement | null = null;
  let ghostR = 0;
  if (anchor.matches('.jx')) {
    ghost = document.createElement('span');
    ghost.className = 'jx-ghost';
    ghost.textContent = '+';
    const br = anchor.getBoundingClientRect();
    ghost.style.cssText = `left:${br.left - px}px;top:${br.top - py}px;width:${br.width}px;height:${br.height}px;line-height:${br.height - 2}px;text-indent:${(ax - (br.left - px) - cw / 2).toFixed(2)}px`;
    el.appendChild(ghost);
    // its farthest corner from the "+", and a cell more
    ghostR = Math.max(...[br.left - px, br.right - px].flatMap((x) => [br.top - py, br.bottom - py].map((y) => Math.hypot(x - ax, y - ay)))) + cw;
  }
  // The film draws this page's own mark in the anchor cell: the "+".
  const glyph = (anchor.dataset.glyph ?? '+').charAt(0) || '+';
  grid = { cols, rows, cw, ch, gx, gy, ac, ar, dist, reach, glyph, kind: null, ghost, ghostR };
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

/**
 * One frame. `shape` says which side of the circle of radius `R` is covered.
 * Sets each line's text only when it changed.
 */
function draw(g: Grid, shape: Shape, R: number): void {
  const { cols, rows, ac, ar, dist } = g;
  for (let y = 0; y < rows; y++) {
    const o = y * cols;
    let a = 0;
    let b = cols;
    let empty = false;
    if (shape === 'disc') {
      // left stack: from the edge up to the circle
      b = ac;
      while (b < cols && dist[o + b] < R) b++;
      empty = b === ac;
    } else {
      // right stack: from the circle to the edge
      if (dist[o + ac] < R) {
        a = ac;
        while (a < cols && dist[o + a] < R) a++;
      }
      empty = a === cols;
    }
    let str = '';
    if (!empty) {
      // Figures: the line's own running count, how many cells it has covered
      const count = String(Math.max(0, shape === 'disc' ? b - ac : a - ac)).padStart(3, '0');
      for (let x = a; x < b; x++) {
        if (y === ar && x === ac) str += g.glyph; // the anchor itself never leaves
        else if (x < ac) str += ' '; // the margin left of the "+" stays clean
        else if (g.kind === 'figures') {
          // read from the front: "+", the three figures, then the usual = - : .
          const k = shape === 'disc' ? b - 1 - x : x - a;
          str += k === 0 ? '+' : k <= 3 ? count[shape === 'disc' ? 3 - k : k - 1] : k <= 7 ? '=-:.'[k - 4] : ' ';
        } else {
          const s = shape === 'disc' ? R - dist[o + x] : dist[o + x] - R;
          if (g.kind === 'bayer') {
            // his "+", dithered: dense at the front, thinning out over a tail twice as deep
            const v = s / g.reach / (2 * TAIL);
            str += v < 1 && v < (B4[(y - ar) & 3][(x - ac) & 3] + 0.5) / 16 ? '+' : ' ';
          } else {
            const i = stepOf(g, s, x, y);
            str += i < RAMP.length ? RAMP[i] : ' ';
          }
        }
      }
    }
    const li = shape === 'disc' ? y : rows + y;
    const lo = shape === 'disc' ? rows + y : y;
    if (shown[li] !== str) (shape === 'disc' ? left : right)[y].textContent = shown[li] = str;
    if (shown[lo] !== '') (shape === 'disc' ? right : left)[y].textContent = shown[lo] = '';
  }
}

/** The film at progress `p` (0 to 1, already eased) of one of its two parts. */
function frame(g: Grid, part: Part, dir: Dir, p: number): void {
  // Bayer's tail is twice as deep, so the front travels that much further
  const tail = g.kind === 'bayer' ? 2 * TAIL : TAIL;
  const span = g.reach * (1 + tail);
  if (dir === 'out') {
    if (part === 'cover') draw(g, 'disc', p * span);
    else draw(g, 'ring', p * span - g.reach * tail);
  } else if (part === 'cover') {
    const R = g.reach - p * span;
    // Going up the box is covered last, so the back button closes its X into
    // the "+" in plain sight (jx.ts); the ghost takes over as the front arrives.
    if (g.ghost?.hidden && R < g.ghostR) g.ghost.hidden = false;
    draw(g, 'ring', R);
  } else draw(g, 'disc', (1 - p) * span);
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

/** For the checks: the next film's variant and Coalesce, instead of the dice. */
let forcedKind: Kind | undefined;
let forcedCoal: boolean | undefined;

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

/** Coalesce: eight flat squares in a ring around the click hop along the grid to the "+". */
function coalesce(g: Grid, x: number, y: number, colour: string): void {
  if (!overlay) return;
  const ax = g.gx + g.ac * g.cw + g.cw / 2;
  const ay = g.gy + g.ar * g.ch + g.ch / 2;
  const size = Math.max(4, g.cw / 2);
  const ring = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
  ].map(([dx, dy], i) => {
    const s = document.createElement('i');
    s.className = 'coal';
    s.style.cssText = `width:${size}px;height:${size}px;background:${colour}`;
    overlay!.appendChild(s);
    return { s, x0: x + dx * g.cw, y0: y + (dy * g.ch) / 2, delay: (i * 40) / 7 };
  });
  const t0 = performance.now();
  const step = (now: number) => {
    let live = false;
    for (const q of ring) {
      const k = Math.min(1, Math.max(0, (now - t0 - q.delay) / HOP_MS));
      const e = 1 - (1 - k) ** 3;
      if (k >= 1) {
        q.s.remove();
        continue;
      }
      live = true;
      // on the character grid: the squares hop from cell to cell
      const cx = Math.round((q.x0 + (ax - q.x0) * e - g.gx - g.cw / 2) / g.cw) * g.cw + g.gx + g.cw / 2;
      const cy = Math.round((q.y0 + (ay - q.y0) * e - g.gy - g.ch / 2) / g.ch) * g.ch + g.gy + g.ch / 2;
      q.s.style.transform = `translate(${(cx - size / 2).toFixed(1)}px,${(cy - size / 2).toFixed(1)}px)`;
    }
    if (live) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** The "+" glitches for one drawing at the click: every transition starts with the glitch. */
function glitchAnchor(): void {
  const a = document.querySelector<HTMLElement>('[data-anchor]');
  if (!a || a.matches('.jx')) return;
  a.style.cssText = "font-family:'Dessign Maison',Georgia,serif;font-feature-settings:'salt' 1,'ss01' 1;font-size:1.14em;color:#3A3742";
  setTimeout(() => (a.style.cssText = ''), 50);
}

function leave(url: URL, click: { x: number; y: number; colour: string } | null): void {
  // Going up (home, or a case study's back button to product designs) closes
  // into the anchor; anything else opens out of it.
  const up = url.pathname !== location.pathname && location.pathname.startsWith(url.pathname);
  const dir: Dir = up ? 'home' : 'out';
  const kind = roll(url, up);
  const go = () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), dir, to: url.pathname, kind }));
    } catch {
      /* private mode: the next page simply opens uncovered */
    }
    html.setAttribute('data-morph', 'covered');
    // Hold the cover until the browser leaves. If it never does, give the page back.
    timer = window.setTimeout(clear, STUCK_MS);
    location.assign(url.href);
  };
  const g = mount();
  if (!g) {
    location.assign(url.href);
    return;
  }
  g.kind = kind;
  busy = true;
  glitchAnchor();
  if (dir === 'home' && g.ghost) g.ghost.hidden = true;
  html.setAttribute('data-morph-dir', dir);
  html.setAttribute('data-morph', 'cover');
  // Warm the cache while the cover plays, so the cut between pages is short.
  try {
    fetch(url.href, { credentials: 'same-origin' }).catch(() => {});
  } catch {
    /* nothing to warm */
  }
  const cover = () =>
    play('cover', dir, COVER_MS, go, () => {
      clear();
      location.assign(url.href);
    });
  // Coalesce: 1 in 3, a pointer click 160px or more from the "+". The cover
  // waits for the first square to arrive, 80ms: 80 + 340 is the old 400.
  const ax = g.gx + g.ac * g.cw + g.cw / 2;
  const ay = g.gy + g.ar * g.ch + g.ch / 2;
  // Going up from a page with the back button, the cover waits 100ms while
  // the X collapses into the "+" (jx.ts), so the field closes in on the box
  // just as the closing lands: 100 + 340.
  const lead = dir === 'home' && g.ghost ? CLOSE_LEAD : 0;
  if (click && Math.hypot(click.x - ax, click.y - ay) >= 160 && (forcedCoal ?? Math.random() < 1 / 3)) {
    coalesce(g, click.x, click.y, click.colour);
    timer = window.setTimeout(cover, Math.max(lead, COAL_LEAD));
  } else if (lead) timer = window.setTimeout(cover, lead);
  else cover();
}

/** The page was opened mid-film: it is covered, so uncover it. */
function arrive(dir: Dir, kind: Kind): Promise<void> {
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
        const g = mount();
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
    // A pointer click carries where it happened and the colour of the band it hit (Coalesce).
    const a = e.target instanceof Element ? e.target.closest<HTMLElement>('a[href]') : null;
    const bm = a?.querySelector<HTMLElement>('[data-band] .bm');
    const click = e.detail > 0 ? { x: e.clientX, y: e.clientY, colour: bm?.style.background || '#12141B' } : null;
    if (a) a.setAttribute('data-press', '');
    leave(url, click);
  });

  // A page restored from the back/forward cache comes back as it was left: covered.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) clear();
  });

  // For the checks and for filming stills: hold the film at a moment.
  window.__morph = {
    seek(part, dir, p, kind = null) {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      const g = grid ?? mount();
      if (g) {
        g.kind = kind;
        frame(g, part, dir, p);
      }
    },
    clear,
    force(kind, coal) {
      forcedKind = kind;
      forcedCoal = coal;
    },
  };

  const dir = window.__psMorphIn;
  if (html.classList.contains('morph-in') && dir && !reducedMotion()) return arrive(dir, window.__psMorphKind ?? null);
  html.classList.remove('morph-in');
  return Promise.resolve();
}
