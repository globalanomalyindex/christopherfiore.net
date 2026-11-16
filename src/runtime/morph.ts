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
 */

import { PULL, reducedMotion } from './offsets.ts';

declare global {
  interface Window {
    __psMorphIn?: Dir;
    __psMorphClaim?: number;
    __morph?: { seek(part: Part, dir: Dir, p: number): void; clear(): void };
  }
}

type Dir = 'out' | 'home';
type Part = 'cover' | 'reveal';
/** Which cells are covered: inside the circle, or outside it. */
type Shape = 'disc' | 'ring';

const KEY = 'ps-morph';
const COVER_MS = 400;
const REVEAL_MS = 460;
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

  // The "+", where it rests: the magnet may be leaning it.
  const r = anchor.getBoundingClientRect();
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
  // The film draws this page's own mark in the anchor cell: "+" on home, "<"
  // under a subpage's back arrow.
  const glyph = (anchor.dataset.glyph ?? '+').charAt(0) || '+';
  grid = { cols, rows, cw, ch, gx, gy, ac, ar, dist, reach, glyph };
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
      for (let x = a; x < b; x++) {
        if (y === ar && x === ac) str += g.glyph; // the anchor itself never leaves
        else if (x < ac) str += ' '; // the margin left of the "+" stays clean
        else {
          const i = stepOf(g, shape === 'disc' ? R - dist[o + x] : dist[o + x] - R, x, y);
          str += i < RAMP.length ? RAMP[i] : ' ';
        }
      }
    }
    const li = shape === 'disc' ? y : rows + y;
    const lo = shape === 'disc' ? rows + y : y;
    if (shown[li] !== str) (shape === 'disc' ? left : right)[y].textContent = shown[li] = str;
    if (shown[lo] !== '') (shape === 'disc' ? right : left)[y].textContent = shown[lo] = '';
  }
}

/** The film at progress `p` (0 to 1) of one of its two parts. */
function frame(g: Grid, part: Part, dir: Dir, p: number): void {
  const span = g.reach * (1 + TAIL);
  if (dir === 'out') {
    if (part === 'cover') draw(g, 'disc', p * span);
    else draw(g, 'ring', p * span - g.reach * TAIL);
  } else if (part === 'cover') draw(g, 'ring', g.reach - p * span);
  else draw(g, 'disc', (1 - p) * span);
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
      frame(g, part, dir, p);
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

function leave(url: URL): void {
  // Going up (home, or a case study's back arrow to product designs) closes
  // into the anchor; anything else opens out of it.
  const up = url.pathname !== location.pathname && location.pathname.startsWith(url.pathname);
  const dir: Dir = up ? 'home' : 'out';
  const go = () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), dir, to: url.pathname }));
    } catch {
      /* private mode: the next page simply opens uncovered */
    }
    html.setAttribute('data-morph', 'covered');
    // Hold the cover until the browser leaves. If it never does, give the page back.
    timer = window.setTimeout(clear, STUCK_MS);
    location.assign(url.href);
  };
  if (!mount()) {
    location.assign(url.href);
    return;
  }
  busy = true;
  html.setAttribute('data-morph', 'cover');
  // Warm the cache while the cover plays, so the cut between pages is short.
  try {
    fetch(url.href, { credentials: 'same-origin' }).catch(() => {});
  } catch {
    /* nothing to warm */
  }
  play('cover', dir, COVER_MS, go, () => {
    clear();
    location.assign(url.href);
  });
}

/** The page was opened mid-film: it is covered, so uncover it. */
function arrive(dir: Dir): Promise<void> {
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
    leave(url);
  });

  // A page restored from the back/forward cache comes back as it was left: covered.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) clear();
  });

  // For the checks and for filming stills: hold the film at a moment.
  window.__morph = {
    seek(part, dir, p) {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      const g = grid ?? mount();
      if (g) frame(g, part, dir, p);
    },
    clear,
  };

  const dir = window.__psMorphIn;
  if (html.classList.contains('morph-in') && dir && !reducedMotion()) return arrive(dir);
  html.classList.remove('morph-in');
  return Promise.resolve();
}
