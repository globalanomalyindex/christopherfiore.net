/**
 * The back button: JellyBox's own X, in its own ledger box.
 *
 * The box is the anchor cell of every subpage (`a.jx[data-anchor]`): one sheet
 * cell, ruled in ink, the whole gutter. Its pin (`.jx-pin`) is exactly where
 * home's "+" is, so the morph does not jump; the box's own centre is 0.15em
 * left of it. Inside the box JellyBox owns every pixel: its floor, its cast,
 * its highlight, its curve. Outside it the site's rules hold.
 *
 *   scripts off        the box, JellyBox's CSS skin in #5baff3, the X, a working link
 *   phone, touch, no   JellyBox's CSS skin (material-skin.css, copied, not
 *   WebGL, Save-Data   redrawn) in the visit's colour, with JellyBox's CSS motion
 *   desktop            JellyBox's real optics (`jellyx.ts`), loaded after the page
 *                      is seen; until it lands, the skin
 *
 * THE ENTRANCE, from T0 (the film has ended, or the fonts are in):
 *     0    the site's band in the visit's colour, a curtain in front
 *    50    the "+" (on the pin) flips to Dessign Maison with the dark twin
 *          flash, slips at 100, lands at 150
 *   200    strips and outline cut; the band closes to a 0.3D dot on the pin in
 *          three drawings
 *   300    THE CUT: dot and "+" go; the jelly takes the dot at the same size and
 *          colour, and the X appears at 45 degrees, which is a "+"
 *   300+   size and the 0.15em to the box's centre on JellyBox's travel spring
 *          (24, .66), squash and the X's turn on its shape spring (30, .48): it
 *          overshoots to 1.044D at 474ms and the X turns past 0 by 8 degrees;
 *          at rest by about 720ms
 *
 * THE HAND: hovered, the disc swells to fill the box, still a disc, 3.5px
 * inside the rules, on the shape spring; its lean eases off as it fills, so
 * it never touches a rule. The X only turns. Pressed, JellyBox's own press.
 *
 * THE CLOSING, going back up (home, or a case study to product designs). The
 * film closes in from the far corner, so the box is the last thing it covers;
 * until then the entrance plays backwards, faster, as an exit should:
 *     0    the jelly lets go and collapses onto the pin, a 0.3D dot, and the
 *          X turns to 45 degrees with it: a "+". 100ms, the site's ease-out
 *   100    THE CUT: jelly and X go; the band takes the dot, same size, same
 *          colour, and the "+" is on the pin in Dessign Maison
 *   150    the band half open, the "+" flashes its dark twin
 *   200    the band fills the box, the "+" lands in the mono
 *   250    the band leaves for the window's edge in one drawing
 *   300    the floor and the mono "+", exactly home's; the film's last cells
 *          close over the box onto that "+"
 * Leaving any other way (the film opens out of the "+" and covers the box at
 * once): the X goes back to the pin and turns to 45 degrees, the jelly goes,
 * then the mono "+" is back. Reduced motion: no film, no entrance, no closing.
 */

import { pool } from './band.ts';
import { ALT, band, plan, type Plan } from './ink.ts';
import { reducedMotion } from './offsets.ts';
import type { Hot } from './buttons.ts';
import { blocks, layout } from './cells.ts';

type Optics = typeof import('./jellyx.ts');

/**
 * JellyBox's own state pigments, baked from `controlPigment('danger', state, p)`
 * (src/vendor/jellybox/tokens.js): rest, highlighted, pressed. The skin shows
 * the same Spectral colours as the optics with no bundle at all.
 */
const STATES: Record<string, readonly [string, string, string]> = {
  '#5baff3': ['#69b8f2', '#5cb0f3', '#5baff3'],
  '#dd3c88': ['#da539e', '#dc3f8b', '#dd3c88'],
  '#a789ef': ['#af99ef', '#a88bef', '#a789ef'],
  '#ffb251': ['#e9ba5e', '#f9b353', '#ffb251'],
  '#136aee': ['#2586ef', '#146eee', '#136aee'],
  '#39c9bd': ['#48cec4', '#3bcabe', '#39c9bd'],
  '#a9e4ed': ['#ade4ed', '#aae4ed', '#a9e4ed'],
  '#ff784b': ['#e7895c', '#f87b4d', '#ff784b'],
  '#ffd653': ['#e9d95e', '#f9d754', '#ffd653'],
  '#a8e533': ['#ace53f', '#a8e534', '#a8e533'],
};
/** JellyBox's own palettes: glass blue, candy, lagoon, citrus. */
export const PIGMENTS = Object.keys(STATES);

const triple = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

/** JellyBox's exact underdamped spring (pocket.js): refresh-rate independent, and it keeps its velocity. */
export function spring(value: number, velocity: number, target: number, seconds: number, frequency: number, damping: number): [number, number] {
  const decay = damping * frequency;
  const wd = frequency * Math.sqrt(1 - damping * damping);
  const offset = value - target;
  const b = (velocity + decay * offset) / wd;
  const e = Math.exp(-decay * seconds);
  const c = Math.cos(wd * seconds);
  const s = Math.sin(wd * seconds);
  return [target + e * (offset * c + b * s), e * ((b * wd - decay * offset) * c - (offset * wd + decay * b) * s)];
}

const bez = (x1: number, y1: number, x2: number, y2: number) => (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 10; i++) {
    const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
    const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    if (Math.abs(d) < 1e-6) break;
    t = Math.max(0, Math.min(1, t - cx / d));
  }
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
};
/** JellyBox's pigment curve: 480ms (.22, 0, .2, 1). */
const E_PIGMENT = bez(0.22, 0, 0.2, 1);
/** JellyBox's effects curve, for the optics claiming the disc: 160ms (.2, 0, 0, 1). */
const E_EFFECTS = bez(0.2, 0, 0, 1);

/* ------------------------------------------------------------ the colour bag */

const KEY = 'ps-lin';
function read(): Record<string, unknown> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}
function write(patch: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    /* private mode: a fresh bag every page */
  }
}

/**
 * A bag, not dice: shuffled once per visit, the next one each page, never the
 * same twice running. Only the pigments the X's ink reads on (`READS`).
 */
function nextPigment(skip: readonly string[]): string {
  const s = read();
  let bag = Array.isArray(s.bag) ? (s.bag as string[]).filter((p) => READS.includes(p)) : [];
  let pos = typeof s.bagPos === 'number' ? s.bagPos : 0;
  const last = typeof s.bagLast === 'string' ? s.bagLast : '';
  const shuffle = () => {
    bag = READS.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    pos = 0;
  };
  if (!bag.length) shuffle();
  for (let n = 0; n < 40; n++) {
    if (pos >= bag.length) shuffle();
    const p = bag[pos++];
    if (!skip.includes(p) && p !== last) {
      write({ bag, bagPos: pos, bagLast: p });
      return p;
    }
  }
  return '#5baff3';
}

/* ------------------------------------------------------------ optics */

let optics: Optics | null = null;
let loading: Promise<Optics | null> | null = null;
export const jellyOptics = (): Optics | null => optics;

const fine = typeof matchMedia === 'function' ? matchMedia('(hover: hover) and (pointer: fine)') : null;

function canOptics(): boolean {
  if (!fine?.matches) return false;
  const c = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (c.connection?.saveData) return false;
  if (matchMedia('(forced-colors: active)').matches) return false;
  try {
    const t = document.createElement('canvas');
    return !!(t.getContext('webgl2') || t.getContext('webgl'));
  } catch {
    return false;
  }
}

function loadOptics(): Promise<Optics | null> {
  if (!loading)
    loading = canOptics()
      ? import('./jellyx.ts').then((m) => (optics = m)).catch(() => null)
      : Promise.resolve(null);
  return loading;
}

/* ------------------------------------------------------------ the box */

const html = document.documentElement;
const D = 1.5; // the disc, in em
const FILL_IN = 3.5; // the hovered jelly's clearance from the rules, px: it stays a disc, as JellyBox's own controls do

interface Box {
  a: HTMLElement;
  pig: string;
  skin: HTMLElement;
  plus: HTMLElement;
  x: SVGElement;
  band: HTMLSpanElement | null;
  canvas: HTMLCanvasElement | null;
  fs: number;
  // the entrance
  t0: number;
  running: boolean;
  last: number;
  S: number;
  vS: number;
  q: number;
  vq: number;
  ang: number;
  va: number;
  /** from the box's centre to the pin, px: where the entrance starts */
  dx: number;
  vdx: number;
  P: Plan | null;
  // the hand
  hover: boolean;
  pressed: boolean;
  focus: boolean;
  pointer: { x: number; y: number } | null;
  k: number;
  kFrom: number;
  kTo: number;
  kT0: number;
  fb: number;
  rest: number;
  claimedAt: number;
  /** the hand: 0 the disc, 1 filling the box */
  f: number;
  vf: number;
  lastLive: number;
  /** the closing: when it started, and what it started from */
  closing: boolean;
  c0: number;
  cf0: number;
  cdx: number;
}

let box: Box | null = null;
let raf = 0;

function cellSize(b: Box) {
  return { w: b.a.clientWidth, h: b.a.clientHeight };
}

/** From the box's centre to its pin (home's "+"), px. */
function pinOffset(a: HTMLElement): number {
  const pin = a.querySelector<HTMLElement>('.jx-pin');
  if (!pin) return 0;
  const r = a.getBoundingClientRect();
  const sc = r.width / (a.offsetWidth || r.width) || 1;
  return (pin.getBoundingClientRect().left - r.left) / sc - a.clientLeft - a.clientWidth / 2;
}

/** The last body the optics drew, for the checks. */
let lastBody: { w: number; h: number; r: number; x: number; y: number } | null = null;

/** For the checks: the X's live body and pin, and Jelly's slab. */
const hooks: Record<string, () => unknown> = {};
(window as Window & { __jx?: typeof hooks }).__jx = hooks;

function setState(b: Box): void {
  const st = STATES[b.pig];
  b.a.style.setProperty('--jb-r', triple(st[0]));
  b.a.style.setProperty('--jb-h', triple(st[1]));
  b.a.style.setProperty('--jb-p', triple(st[2]));
}

function liveState(b: Box) {
  const now = performance.now();
  const t = now - b.t0;
  const interacting = (b.hover || b.pressed || b.focus) && !b.closing;
  const settled = !b.running && !b.closing;
  // the keyboard alone moves nothing: the X is simply in its focused state
  const still = reducedMotion() || (b.focus && !b.hover && !b.pressed);
  // the hand, on JellyBox's shape spring (the closing drives it itself)
  const fT = interacting ? 1 : 0;
  if (b.closing) {
    /* set by closeFrame */
  } else if (still) {
    b.f = fT;
    b.vf = 0;
  } else {
    const dt = Math.min(0.05, Math.max(0, (now - (b.lastLive || now)) / 1000));
    [b.f, b.vf] = spring(b.f, b.vf, fT, dt, 30, 0.48);
  }
  b.lastLive = now;
  const shaping = Math.abs(b.f - fT) > 0.002 || Math.abs(b.vf) > 0.02;
  if (settled && !interacting && !shaping && now - b.claimedAt > 400) {
    if (++b.rest > 40) return null;
  } else b.rest = 0;
  // measured only once the X is still drawing
  const { w, h } = cellSize(b);
  const target = b.pressed ? 1 : b.hover || b.focus || (b.running && t >= 300 && t < 560) ? 0.88 : 0.68;
  if (target !== b.kTo) {
    b.kFrom = b.k;
    b.kTo = target;
    b.kT0 = still ? now - 480 : now;
  }
  b.k = b.pressed ? 1 : b.kFrom + (b.kTo - b.kFrom) * E_PIGMENT((now - b.kT0) / 480);
  const d = D * b.fs;
  const fd = d + (Math.min(w, h) - 2 * FILL_IN - d) * b.f;
  const bw = (fd * b.S) / (1 + b.q);
  const bh = fd * b.S * (1 + b.q);
  const br = Math.min(bw, bh) / 2;
  const lean = 1 - 0.6 * Math.max(0, Math.min(1, b.f));
  const cx = w / 2 + b.dx;
  const cy = h / 2;
  lastBody = { w: bw, h: bh, r: br, x: cx - bw / 2, y: cy - bh / 2 };
  return {
    width: w,
    height: h,
    reduced: reducedMotion(),
    motion: settled && !interacting ? 0 : 0.95,
    pointer: b.hover ? b.pointer : null,
    bodies: [
      {
        id: 'x',
        x: cx - bw / 2,
        y: cy - bh / 2,
        w: bw,
        h: bh,
        r: br,
        hover: !b.closing && (b.hover || b.focus || (b.running && t >= 300 && t < 560)),
        pressed: b.pressed && !b.closing,
        feedback: b.fb,
        assistX: b.hover && b.pointer ? lean * Math.max(-3, Math.min(3, (b.pointer.x - cx) * 0.12)) : 0,
        assistY: b.hover && b.pointer ? lean * Math.max(-3, Math.min(3, (b.pointer.y - cy) * 0.12)) : 0,
        color: optics!.pigmentAt(b.pig, b.k),
        opacity: (b.running && t < 300) || (b.closing && now - b.c0 >= 100) ? 0 : 1,
      },
    ],
  };
}

/** Put JellyBox's optics in the box. Resolves after its first frame. */
function claim(b: Box, o: Optics, fadeIn: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (b.canvas) return resolve();
    const c = document.createElement('canvas');
    c.className = 'jx-c';
    c.setAttribute('aria-hidden', 'true');
    if (fadeIn) c.style.opacity = '0';
    b.a.insertBefore(c, b.a.firstChild);
    b.canvas = c;
    b.claimedAt = performance.now();
    let first = true;
    o.mount(c, () => liveState(b), () => {
      if (!first) return;
      first = false;
      b.a.setAttribute('data-optics', '');
      if (fadeIn) {
        const t0 = performance.now();
        const step = () => {
          const p = Math.min(1, (performance.now() - t0) / 160);
          c.style.opacity = E_EFFECTS(p).toFixed(3);
          if (p < 1) requestAnimationFrame(step);
          else c.style.opacity = '';
        };
        requestAnimationFrame(step);
      }
      resolve();
    });
  });
}

/** The entrance's and the closing's curtain: the site's band, in front of the jelly. */
function ensureBand(b: Box): HTMLSpanElement {
  if (!b.band) {
    b.band = document.createElement('span');
    b.band.className = 'jx-band';
    b.band.setAttribute('aria-hidden', 'true');
    const ol = document.createElement('span');
    ol.className = 'bo';
    b.band.appendChild(ol);
    b.a.appendChild(b.band);
  }
  return b.band;
}

/** The band drawn `k` of the way from the whole box down to a 0.3D dot on the pin. */
function dotClip(b: Box, k: number): string {
  const { w, h } = cellSize(b);
  const d0 = 0.3 * D * b.fs;
  const px = w / 2 + pinOffset(b.a);
  const py = h / 2;
  const ins = [py - d0 / 2, w - px - d0 / 2, h - py - d0 / 2, px - d0 / 2].map((v) => `${(k * Math.max(0, v)).toFixed(1)}px`).join(' ');
  return `inset(${ins} round ${k > 0 ? '999px' : '0px'})`;
}

/** One frame of the entrance. */
function frame(now: number): void {
  raf = 0;
  const b = box;
  if (!b || !b.running) return;
  const t = Math.max(0, now - b.t0);
  const dt = Math.min(0.05, Math.max(0, (now - b.last) / 1000));
  b.last = now;
  const P = b.P!;
  if (t < 300) {
    ensureBand(b);
    // the band closes onto the pin, where home's "+" is, to a 0.3D dot
    const ink = t < 200 ? band(P, t, null, null, false) : [{ c: 'bm', s: `position:absolute;inset:0;background:${P.main};clip-path:${dotClip(b, t < 250 ? 1 / 3 : 2 / 3)}` }];
    pool(b.band!, 'band', ink, b.band!.querySelector(':scope > .bo'));
    b.band!.dataset.ol = t < 200 ? '1' : '0';
    const alt = (t >= 50 && t < 100) || t >= 150;
    const flash = (t >= 50 && t < 100) || (t >= 150 && t < 200);
    b.plus.setAttribute('style', `${alt ? ALT : ''}color:${flash ? P.twin : 'var(--band-ink)'};visibility:visible`);
    b.x.setAttribute('style', 'visibility:hidden');
    b.skin.style.visibility = 'hidden';
  } else {
    if (b.band) {
      b.band.remove();
      b.band = null;
      b.plus.setAttribute('style', 'visibility:hidden');
      b.fb++;
    }
    let r = spring(b.S, b.vS, 1, dt, 24, 0.66);
    b.S = r[0];
    b.vS = r[1];
    r = spring(b.q, b.vq, 0, dt, 30, 0.48);
    b.q = r[0];
    b.vq = r[1];
    r = spring(b.ang, b.va, 0, dt, 30, 0.48);
    b.ang = r[0];
    b.va = r[1];
    // from the pin to the box's centre, on the travel spring
    r = spring(b.dx, b.vdx, 0, dt, 24, 0.66);
    b.dx = r[0];
    b.vdx = r[1];
    const sq = `scale(${(b.S / (1 + b.q)).toFixed(4)},${(b.S * (1 + b.q)).toFixed(4)})`;
    const mv = `translateX(${b.dx.toFixed(2)}px)`;
    b.x.setAttribute('style', `transform:${mv} rotate(${b.ang.toFixed(2)}deg) ${sq}`);
    if (!b.canvas) b.skin.setAttribute('style', `transform:${mv} ${sq}`);
    if (t > 1100) {
      b.running = false;
      b.S = 1;
      b.q = 0;
      b.ang = 0;
      b.dx = 0;
      b.vdx = 0;
      b.x.removeAttribute('style');
      b.skin.removeAttribute('style');
      html.classList.remove('jx-wait', 'jx-run');
      // the optics arrived late: it claims the disc now, at rest
      loadOptics().then((o) => {
        if (o && box === b && !b.canvas) claim(b, o, true).then(() => (b.skin.style.visibility = 'hidden'));
      });
      return;
    }
  }
  raf = requestAnimationFrame(frame);
}

function start(b: Box): void {
  b.P = plan('+', STATES[b.pig][2], 'l', 0.5, false);
  b.t0 = performance.now();
  b.last = b.t0;
  b.running = true;
  b.S = 0.3;
  b.vS = 0;
  b.q = 0.12;
  b.vq = 0;
  b.ang = 45;
  b.va = 0;
  b.dx = pinOffset(b.a);
  b.vdx = 0;
  html.classList.add('jx-run');
  // The first drawing goes on in the same task that lifts the wait, so no
  // frame ever shows the X before its curtain.
  frame(b.t0);
  html.classList.remove('jx-wait');
  if (b.canvas) b.skin.style.visibility = 'hidden';
}

function wire(b: Box): void {
  const a = b.a;
  const pointer = (e: PointerEvent) => {
    const r = a.getBoundingClientRect();
    const sc = r.width / (a.clientWidth || r.width) || 1;
    b.pointer = { x: (e.clientX - r.left) / sc - a.clientLeft, y: (e.clientY - r.top) / sc - a.clientTop };
  };
  a.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    b.hover = true;
    pointer(e);
    b.fb++;
  });
  a.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') pointer(e);
  });
  a.addEventListener('pointerleave', () => {
    b.hover = false;
    b.pressed = false;
  });
  a.addEventListener('pointerdown', () => (b.pressed = true));
  a.addEventListener('pointerup', () => (b.pressed = false));
  a.addEventListener('focus', () => (b.focus = a.matches(':focus-visible')));
  a.addEventListener('blur', () => (b.focus = false));
}

/** Leaving any way but up: the X goes back to the pin and turns into a "+", the jelly goes, then the mono "+" is back. */
function leaveCut(b: Box): void {
  b.running = false;
  cancelAnimationFrame(raf);
  b.band?.remove();
  b.band = null;
  b.a.classList.add('jx-leave');
  setTimeout(() => b.a.classList.add('jx-gone'), 50);
}

const E_CLOSE = bez(0.23, 1, 0.32, 1);
const CLOSE_MS = 300;

/** Going back up: the entrance backwards, faster. See THE CLOSING at the top. */
function close(b: Box): void {
  cancelAnimationFrame(raf);
  b.running = false;
  b.band?.remove();
  b.band = null;
  b.S = 1;
  b.q = 0;
  b.closing = true;
  b.c0 = performance.now();
  b.cf0 = b.f;
  b.cdx = pinOffset(b.a);
  b.P = plan('+', STATES[b.pig][2], 'l', 0.5, false);
  b.a.classList.add('jx-close');
  closeFrame(b.c0);
}

function closeFrame(now: number): void {
  raf = 0;
  const b = box;
  if (!b || !b.closing) return;
  const t = Math.max(0, now - b.c0);
  const P = b.P!;
  if (t < 100) {
    const e = E_CLOSE(t / 100);
    b.S = 1 - 0.7 * e;
    b.dx = b.cdx * e;
    b.ang = 45 * e;
    b.f = b.cf0 * (1 - e);
    b.vf = 0;
    const mv = `translateX(${b.dx.toFixed(2)}px)`;
    b.x.setAttribute('style', `transform:${mv} rotate(${b.ang.toFixed(2)}deg) scale(${b.S.toFixed(4)})`);
    if (!b.canvas) b.skin.setAttribute('style', `transform:${mv} scale(${b.S.toFixed(4)})`);
  } else if (t < CLOSE_MS) {
    b.x.setAttribute('style', 'visibility:hidden');
    b.skin.setAttribute('style', 'visibility:hidden');
    const band = ensureBand(b);
    // dot, half open, the whole box, then one drawing on its way out to the window's edge
    const layer =
      t < 150
        ? dotClip(b, 1)
        : t < 200
          ? dotClip(b, 0.5)
          : t < 250
            ? 'inset(0px)'
            : 'inset(0px 70% 0px 0px)';
    pool(band, 'band', [{ c: 'bm', s: `position:absolute;inset:0;background:${P.main};clip-path:${layer}` }], band.querySelector(':scope > .bo'));
    band.dataset.ol = t >= 200 && t < 250 ? '1' : '0';
    const alt = t < 200;
    const flash = t >= 150 && t < 200;
    b.plus.setAttribute('style', `${alt ? ALT : ''}color:${flash ? P.twin : 'var(--band-ink)'};visibility:visible`);
  } else {
    // the floor and the mono "+", exactly home's
    b.band?.remove();
    b.band = null;
    b.plus.setAttribute('style', 'visibility:visible');
    b.a.classList.add('jx-gone');
    b.closing = false;
    return;
  }
  raf = requestAnimationFrame(closeFrame);
}

/**
 * Wire the back button. `seen` resolves once any arrival film has finished.
 */
export function initJx(seen: Promise<void>): void {
  const a = document.querySelector<HTMLElement>('a[data-jx]');
  if (!a) {
    html.classList.remove('jx-wait');
    return;
  }
  (window as Window & { __psJxClaim?: number }).__psJxClaim = 1;
  const skip = (a.dataset.skip ?? '').split(' ').filter(Boolean);
  const b: Box = {
    a,
    pig: nextPigment(skip),
    skin: a.querySelector('.jx-skin')!,
    plus: a.querySelector('.jx-plus')!,
    x: a.querySelector('.jx-x')!,
    band: null,
    canvas: null,
    fs: parseFloat(getComputedStyle(a).fontSize) || 16,
    t0: 0,
    running: false,
    last: 0,
    S: 1,
    vS: 0,
    q: 0,
    vq: 0,
    ang: 0,
    va: 0,
    dx: 0,
    vdx: 0,
    P: null,
    hover: false,
    pressed: false,
    focus: false,
    pointer: null,
    k: 0.68,
    kFrom: 0.68,
    kTo: 0.68,
    kT0: 0,
    fb: 0,
    rest: 0,
    claimedAt: 0,
    f: 0,
    vf: 0,
    lastLive: 0,
    closing: false,
    c0: 0,
    cf0: 0,
    cdx: 0,
  };
  box = b;
  setState(b);
  // leaving, the X goes back to the pin before the mono "+" returns there
  a.style.setProperty('--jx-dx', `${pinOffset(a).toFixed(2)}px`);
  hooks.body = () => lastBody;
  hooks.pin = () => pinOffset(a);
  wire(b);
  new MutationObserver(() => {
    if (html.getAttribute('data-morph') !== 'cover' || b.closing || a.classList.contains('jx-close') || a.classList.contains('jx-leave')) return;
    if (html.getAttribute('data-morph-dir') === 'home' && !reducedMotion()) close(b);
    else leaveCut(b);
  }).observe(html, { attributes: true, attributeFilter: ['data-morph'] });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      // back from the cache mid-closing: the X at rest again
      cancelAnimationFrame(raf);
      b.closing = false;
      b.S = 1;
      b.q = 0;
      b.dx = 0;
      b.ang = 0;
      b.f = 0;
      b.band?.remove();
      b.band = null;
      b.x.removeAttribute('style');
      b.skin.removeAttribute('style');
      b.plus.removeAttribute('style');
      if (b.canvas) b.skin.style.visibility = 'hidden';
      a.classList.remove('jx-leave', 'jx-gone', 'jx-close');
      html.classList.remove('jx-wait');
    }
  });

  if (reducedMotion() || !html.classList.contains('jx-wait')) {
    html.classList.remove('jx-wait');
    // At rest from the start; the optics may still claim the disc later.
    seen.then(() =>
      loadOptics().then((o) => {
        if (o && !b.canvas) claim(b, o, true).then(() => (b.skin.style.visibility = 'hidden'));
      }),
    );
    return;
  }
  seen.then(() => {
    const ready = loadOptics().then((o) => (o ? claim(b, o, false).then(() => true) : false));
    const late = new Promise<boolean>((r) => setTimeout(() => r(false), 900));
    Promise.race([ready, late]).then(() => start(b));
  });
}

/* ------------------------------------------------------------ Jelly, the lineage card */

let jc: HTMLCanvasElement | null = null;
let jh: Hot | null = null;
/**
 * The Jelly card's skeleton: the slab's box and, in each blank stretch of it
 * (cells.ts: 3em or wider, clear of the type), a hairline at each side and an
 * X between. No cells on the slab: JellyBox's own glass is the surface. With
 * no blank, the box alone.
 */
let jsk: SVGSVGElement | null = null;
const NS = 'http://www.w3.org/2000/svg';
let jskFor: Hot | null = null;
function skeletonFor(h: Hot, cap: Cap): void {
  if (!jsk) {
    jsk = document.createElementNS(NS, 'svg');
    jsk.setAttribute('class', 'jx-sk jx-row-sk');
    jsk.setAttribute('viewBox', '0 0 100 100');
    jsk.setAttribute('preserveAspectRatio', 'none');
    jsk.setAttribute('aria-hidden', 'true');
  }
  if (jskFor !== h) {
    jskFor = h;
    const L = cap.x;
    const R = cap.x + cap.w;
    const lay = layout(blocks(h.b, false), L, R, h.geo.fs);
    const u = (x: number) => ((100 * (x - L)) / cap.w).toFixed(3);
    let rules = '';
    let xs = '';
    for (const k of lay?.blanks ?? []) {
      const a = k.a === 'L' ? L : k.a;
      const b = k.b === 'R' ? R : k.b;
      if (k.a !== 'L') rules += `M${u(a)} 0V100`;
      if (k.b !== 'R') rules += `M${u(b)} 0V100`;
      xs += `M${u(a)} 0L${u(b)} 100M${u(b)} 0L${u(a)} 100`;
    }
    jsk.innerHTML = `<rect x="0" y="0" width="100" height="100"/>${rules ? `<path class="r" d="${rules}"/>` : ''}${xs ? `<path class="d" d="${xs}"/>` : ''}`;
  }
  const want = `position:absolute;left:${cap.x.toFixed(1)}px;top:${cap.y.toFixed(1)}px;width:${cap.w.toFixed(1)}px;height:${cap.h.toFixed(1)}px;overflow:visible;pointer-events:none;transition:opacity 150ms cubic-bezier(.23,1,.32,1)`;
  if (jsk.getAttribute('style') !== want) jsk.setAttribute('style', want);
  if (jsk.parentNode !== h.b) h.b.insertBefore(jsk, (jc && jc.parentNode === h.b ? jc : h.host).nextSibling);
  if (!jsk.classList.contains('on')) requestAnimationFrame(() => jsk?.classList.add('on'));
}
type Cap = { x: number; y: number; w: number; h: number; r: number };
let jcap: Cap = { x: 0, y: 0, w: 0, h: 0, r: 0 };
let jpig = '#5baff3';
let jfb = 0;
hooks.jelly = () => (jh ? { ...jcap, pig: jpig } : null);
hooks.reads = () => READS.slice();

const hueOf = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(...c);
  const mn = Math.min(...c);
  const d = mx - mn;
  if (!d) return 0;
  const h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
  return (h * 60 + 360) % 360;
};
const lum = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
/**
 * The pigments that hold band ink at 4.5:1 in all three of JellyBox's states,
 * rest, highlighted and pressed, taking the pigment itself as the glass (the
 * glass over the light floor only ever reads lighter): the label on the slab,
 * and the X on its disc, always read.
 */
const READS = PIGMENTS.filter((p) => STATES[p].every((c) => (lum(c) + 0.05) / (lum('#1A1820') + 0.05) >= 4.5));
/** The readable JellyBox pigment nearest in hue to the band that was just up, so the colour carries over. */
const nearest = (hex: string) => {
  const h = hueOf(hex);
  let best = READS[0];
  let bd = 999;
  for (const p of READS) {
    let d = Math.abs(hueOf(p) - h);
    d = Math.min(d, 360 - d);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
};

function clipFor(h: Hot, cap: Cap, open: number): string {
  const g = h.geo;
  const pad = 2;
  const k = 1 - open;
  const top = (cap.y - pad) * k;
  const bot = (g.bh - cap.y - cap.h - pad) * k;
  const l = (cap.x - pad) * k;
  const r = (g.bw - cap.x - cap.w - pad) * k;
  const rad = (cap.r + pad) * k;
  return `clip-path:inset(${Math.max(0, top).toFixed(1)}px ${Math.max(0, r).toFixed(1)}px ${Math.max(0, bot).toFixed(1)}px ${Math.max(0, l).toFixed(1)}px round ${rad.toFixed(1)}px)`;
}

/**
 * The Jelly lineage card: JellyBox's own body, the row's slab (a capsule on a
 * link in a sentence). `open` 0 to 1 opens its floor and cast out from under
 * it; -2 cuts it, slab and cast in the same frame.
 */
export function jellyFor(h: Hot, cap: Cap, open: number): void {
  const o = optics;
  if (open === -2) {
    if (jh === h) {
      jc?.remove();
      jh = null;
    }
    if (jsk?.parentNode === h.b) {
      jsk.classList.remove('on');
      jsk.remove();
    }
    if (jskFor === h) jskFor = null;
    h.b.querySelectorAll(':scope > [data-k="jc"]').forEach((n) => n.remove());
    return;
  }
  if (!o) {
    // Not loaded: the +jellybox row still plays it, on JellyBox's CSS skin.
    let s = h.b.querySelector<HTMLSpanElement>(':scope > [data-k="jc"]');
    if (!s) {
      s = document.createElement('span');
      s.setAttribute('data-k', 'jc');
      s.className = 'jx-skin jx-cap';
      s.setAttribute('aria-hidden', 'true');
      const st = STATES[nearest(h.P.main)];
      s.style.cssText = `left:${cap.x.toFixed(1)}px;top:${cap.y}px;width:${cap.w.toFixed(1)}px;height:${cap.h.toFixed(1)}px;border-radius:${cap.r.toFixed(1)}px;--jb-rgb:${triple(st[1])}`;
      h.b.insertBefore(s, h.host.nextSibling);
    }
    return;
  }
  if (jh !== h) {
    if (!jc) {
      jc = document.createElement('canvas');
      jc.className = 'jx-row';
      jc.setAttribute('aria-hidden', 'true');
      o.mount(jc, () => {
        const hh = jh;
        if (!hh) return null;
        const live = hh.out == null;
        return {
          width: hh.geo.bw,
          height: hh.geo.bh,
          reduced: reducedMotion(),
          pointer: live ? { x: hh.px, y: hh.geo.bh / 2 } : null,
          bodies: [{ id: 'j', x: jcap.x, y: jcap.y, w: jcap.w, h: jcap.h, r: jcap.r, hover: live, pressed: hh.b.hasAttribute('data-press'), feedback: jfb, color: o.pigmentAt(jpig, live ? 0.88 : 0.68) }],
        };
      });
    }
    jh = h;
    jcap = cap;
    jpig = nearest(h.P.main);
    jfb++;
    h.b.insertBefore(jc, h.host.nextSibling);
  }
  const want = clipFor(h, cap, open);
  if (jc!.getAttribute('style') !== want) jc!.setAttribute('style', want);
  // once the floor has opened, the slab shows its skeleton
  if (open >= 1) skeletonFor(h, cap);
}
