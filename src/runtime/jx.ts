/**
 * The back button: JellyBox's own X, in its own ledger box.
 *
 * The box is the anchor cell of every subpage (`a.jx[data-anchor]`): one sheet
 * cell, ruled in ink, in the gutter, its centre exactly where home's "+" is,
 * so the morph does not jump. Inside the box JellyBox owns every pixel: its
 * floor, its cast, its highlight, its curve. Outside it the site's rules hold.
 *
 *   scripts off        the box, JellyBox's CSS skin in #5baff3, the X, a working link
 *   phone, touch, no   JellyBox's CSS skin (material-skin.css, copied, not
 *   WebGL, Save-Data   redrawn) in the visit's colour, with JellyBox's CSS motion
 *   desktop            JellyBox's real optics (`jellyx.ts`), loaded after the page
 *                      is seen; until it lands, the skin
 *
 * THE ENTRANCE, from T0 (the film has ended, or the fonts are in):
 *     0    the site's band in the visit's colour, a curtain in front
 *    50    the "+" flips to Dessign Maison with the dark twin flash, slips at
 *          100, lands at 150
 *   200    strips and outline cut; the band closes to a 0.3D dot in three drawings
 *   300    THE CUT: dot and "+" go; the jelly takes the dot at the same size and
 *          colour, and the X appears at 45 degrees, which is a "+"
 *   300+   size on JellyBox's travel spring (24, .66), squash and the X's turn on
 *          its shape spring (30, .48): it overshoots to 1.044D at 474ms and the
 *          X turns past 0 by 8 degrees; at rest by about 720ms
 *
 * Leaving (the click starts the film at once): the X turns back to 45 degrees
 * and the jelly goes, then the mono "+" is back, and the film closes onto it.
 * Reduced motion: no entrance, the X at rest at once.
 */

import { pool } from './band.ts';
import { ALT, band, plan, type Plan } from './ink.ts';
import { reducedMotion } from './offsets.ts';
import type { Hot } from './buttons.ts';

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
function spring(value: number, velocity: number, target: number, seconds: number, frequency: number, damping: number): [number, number] {
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

/** A bag, not dice: shuffled once per visit, the next one each page, never the same twice running. */
function nextPigment(skip: readonly string[]): string {
  const s = read();
  let bag = Array.isArray(s.bag) ? (s.bag as string[]).filter((p) => p in STATES) : [];
  let pos = typeof s.bagPos === 'number' ? s.bagPos : 0;
  const last = typeof s.bagLast === 'string' ? s.bagLast : '';
  const shuffle = () => {
    bag = PIGMENTS.slice();
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
const D = 1.125; // the disc, in em

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
}

let box: Box | null = null;
let raf = 0;

function cellSize(b: Box) {
  return { w: b.a.clientWidth, h: b.a.clientHeight };
}

function setState(b: Box): void {
  const st = STATES[b.pig];
  b.a.style.setProperty('--jb-r', triple(st[0]));
  b.a.style.setProperty('--jb-h', triple(st[1]));
  b.a.style.setProperty('--jb-p', triple(st[2]));
}

/** The jelly's size and the X's turn, from JellyBox's springs. */
function form(b: Box): string {
  return `scale(${(b.S / (1 + b.q)).toFixed(4)},${(b.S * (1 + b.q)).toFixed(4)})`;
}

function liveState(b: Box) {
  const { w, h } = cellSize(b);
  const now = performance.now();
  const t = now - b.t0;
  const interacting = b.hover || b.pressed || b.focus;
  const settled = !b.running;
  if (settled && !interacting && now - b.claimedAt > 400) {
    if (++b.rest > 40) return null;
  } else b.rest = 0;
  const target = b.pressed ? 1 : b.hover || b.focus || (b.running && t >= 300 && t < 560) ? 0.88 : 0.68;
  if (target !== b.kTo) {
    b.kFrom = b.k;
    b.kTo = target;
    b.kT0 = now;
  }
  b.k = b.pressed ? 1 : b.kFrom + (b.kTo - b.kFrom) * E_PIGMENT((now - b.kT0) / 480);
  const d = D * b.fs;
  const bw = (d * b.S) / (1 + b.q);
  const bh = d * b.S * (1 + b.q);
  const cx = w / 2;
  const cy = h / 2;
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
        hover: b.hover || b.focus || (b.running && t >= 300 && t < 560),
        pressed: b.pressed,
        feedback: b.fb,
        assistX: b.hover && b.pointer ? Math.max(-3, Math.min(3, (b.pointer.x - cx) * 0.12)) : 0,
        assistY: b.hover && b.pointer ? Math.max(-3, Math.min(3, (b.pointer.y - cy) * 0.12)) : 0,
        color: optics!.pigmentAt(b.pig, b.k),
        opacity: b.running && t < 300 ? 0 : 1,
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
    if (!b.band) {
      b.band = document.createElement('span');
      b.band.className = 'jx-band';
      b.band.setAttribute('aria-hidden', 'true');
      const ol = document.createElement('span');
      ol.className = 'bo';
      b.band.appendChild(ol);
      b.a.appendChild(b.band);
    }
    const ink =
      t < 200
        ? band(P, t, null, null, false)
        : [{ c: 'bm', s: `position:absolute;inset:0;background:${P.main};clip-path:inset(calc(${t < 250 ? '0.333' : '0.667'} * (50% - .169em)) round 999px)` }];
    pool(b.band, 'band', ink, b.band.querySelector(':scope > .bo'));
    b.band.dataset.ol = t < 200 ? '1' : '0';
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
    const f = form(b);
    b.x.setAttribute('style', `transform:rotate(${b.ang.toFixed(2)}deg) ${f}`);
    if (!b.canvas) b.skin.setAttribute('style', `transform:${f}`);
    if (t > 1100) {
      b.running = false;
      b.S = 1;
      b.q = 0;
      b.ang = 0;
      b.x.removeAttribute('style');
      b.skin.removeAttribute('style');
      html.classList.remove('jx-wait');
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

/** The film is about to leave: the X turns back into a "+", the jelly goes, then the mono "+" is back. */
function leaveCut(b: Box): void {
  b.running = false;
  cancelAnimationFrame(raf);
  b.band?.remove();
  b.band = null;
  b.a.classList.add('jx-leave');
  setTimeout(() => b.a.classList.add('jx-gone'), 50);
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
  };
  box = b;
  setState(b);
  wire(b);
  new MutationObserver(() => {
    if (html.getAttribute('data-morph') === 'cover') leaveCut(b);
  }).observe(html, { attributes: true, attributeFilter: ['data-morph'] });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      a.classList.remove('jx-leave', 'jx-gone');
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
let jcap = { x: 0, y: 0, w: 0, h: 0 };
let jpig = '#5baff3';
let jfb = 0;

const hueOf = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(...c);
  const mn = Math.min(...c);
  const d = mx - mn;
  if (!d) return 0;
  const h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
  return (h * 60 + 360) % 360;
};
/** The JellyBox pigment nearest in hue to the band that was just up, so the colour carries over. */
const nearest = (hex: string) => {
  const h = hueOf(hex);
  let best = PIGMENTS[0];
  let bd = 999;
  for (const p of PIGMENTS) {
    let d = Math.abs(hueOf(p) - h);
    d = Math.min(d, 360 - d);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
};

function clipFor(h: Hot, cap: typeof jcap, open: number): string {
  const g = h.geo;
  const pad = 2;
  const k = 1 - open;
  const top = (cap.y - pad) * k;
  const bot = (g.bh - cap.y - cap.h - pad) * k;
  const l = (cap.x - pad) * k;
  const r = (g.bw - cap.x - cap.w - pad) * k;
  const rad = ((cap.h + 2 * pad) / 2) * k;
  return `clip-path:inset(${Math.max(0, top).toFixed(1)}px ${Math.max(0, r).toFixed(1)}px ${Math.max(0, bot).toFixed(1)}px ${Math.max(0, l).toFixed(1)}px round ${rad.toFixed(1)}px)`;
}

/**
 * The Jelly lineage card. `open` 0 to 1 opens JellyBox's floor and cast out
 * from under the capsule; -1 is leaving (back to the capsule); -2 is cut.
 */
export function jellyFor(h: Hot, cap: { x: number; y: number; w: number; h: number }, open: number): void {
  const o = optics;
  if (open === -2) {
    if (jh === h) {
      jc?.remove();
      jh = null;
    }
    h.b.querySelectorAll(':scope > [data-k="jc"]').forEach((n) => n.remove());
    return;
  }
  if (!o) {
    // Not loaded: the +jellybox row still plays it, on JellyBox's CSS skin.
    if (open === -1) return jellyFor(h, cap, -2);
    let s = h.b.querySelector<HTMLSpanElement>(':scope > [data-k="jc"]');
    if (!s) {
      s = document.createElement('span');
      s.setAttribute('data-k', 'jc');
      s.className = 'jx-skin jx-cap';
      s.setAttribute('aria-hidden', 'true');
      const st = STATES[nearest(h.P.main)];
      s.style.cssText = `left:${cap.x.toFixed(1)}px;top:${cap.y}px;width:${cap.w.toFixed(1)}px;height:${cap.h}px;--jb-rgb:${triple(st[1])}`;
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
          bodies: [{ id: 'j', x: jcap.x, y: jcap.y, w: jcap.w, h: jcap.h, hover: live, pressed: hh.b.hasAttribute('data-press'), feedback: jfb, color: o.pigmentAt(jpig, live ? 0.88 : 0.68) }],
        };
      });
    }
    jh = h;
    jcap = cap;
    jpig = nearest(h.P.main);
    jfb++;
    h.b.insertBefore(jc, h.host.nextSibling);
  }
  const want = open === -1 ? clipFor(h, cap, 0) : clipFor(h, cap, open);
  if (jc!.getAttribute('style') !== want) jc!.setAttribute('style', want);
}
