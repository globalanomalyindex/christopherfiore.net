/**
 * The three per-channel menu hover personalities.
 *
 * Each channel behaves in character; a generic hover on any of them reads as
 * unfinished. Ported from the prototype's `renderVals()`:
 *   01 Product designs — prodOn / prodOff / scafMove (gridEnter + scafOn + scafMove)
 *   02 Paintings       — waterOn / waterOff          (the bead/paint canvas sim)
 *   03 Competizione    — sweepOn / sweepOff          (prototype sweep2On)
 *
 * Every geometry number, easing and duration below is read out of
 * `_source/prototype/prototype.markup.html` and `prototype.script.js` and is
 * final. `state(stage).hovered` is updated here so the background field can
 * cross-fade per channel.
 */

import { COLOR, VIVID, rgba } from '../design/tokens';
import { MODULE } from '../design/layout';
import { css, el, q, qq, svg } from '../dom';
import { state } from './state';

/* ------------------------------------------------------------------ shared */

/** Hover-state values lifted from the prototype's `style-hover` declarations. */
const HOVER = {
  ch1: { r: '800px', p: '820px' },
  ch2: {
    p: '500px',
    shadow: 'inset 0 0 0 14px #C62C05,inset 0 0 0 15px rgba(223,203,250,.55)',
  },
  ch3: { size: '100% 100%', shadow: 'inset 760px 0 0 0 #DFCBFA' },
} as const;

/**
 * Inline properties we overwrite on hover, remembered once so leaving restores
 * the page builder's resting declaration instead of deleting it (a deleted
 * `box-shadow` has no interpolation target and would snap instead of easing).
 */
const SAVED = new WeakMap<HTMLElement, Map<string, string>>();

function setStyle(cell: HTMLElement, prop: string, value: string): void {
  let m = SAVED.get(cell);
  if (!m) {
    m = new Map();
    SAVED.set(cell, m);
  }
  if (!m.has(prop)) m.set(prop, cell.style.getPropertyValue(prop));
  cell.style.setProperty(prop, value);
}

function restoreStyle(cell: HTMLElement, prop: string): void {
  const prev = SAVED.get(cell)?.get(prop);
  if (prev === undefined) return;
  if (prev) cell.style.setProperty(prop, prev);
  else cell.style.removeProperty(prop);
}

function stageOf(cell: HTMLElement): HTMLElement | null {
  return cell.closest<HTMLElement>('[data-stage]');
}

function setHovered(cell: HTMLElement, n: number | null, channel: number): void {
  const stage = stageOf(cell);
  if (!stage) return;
  const s = state(stage);
  // leaving only clears the field if this channel is still the one that owns it
  if (n === null && s.hovered !== channel) return;
  s.hovered = n;
}

function reducedFor(cell: HTMLElement): boolean {
  const stage = stageOf(cell);
  return stage ? state(stage).reduced : false;
}

/**
 * prefers-reduced-motion collapse: a flat lavender plate behind the type and
 * rust ink. No canvas, no rAF, no per-letter work. The plate is injected as the
 * first child so it sits under the cell's own `z-index:1` rows.
 */
function staticOn(cell: HTMLElement): void {
  if (q(cell, '[data-ps-static]')) return;
  const plate = el('i', {
    'data-ps-static': '',
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      inset: '0',
      background: COLOR.lavender,
      'pointer-events': 'none',
      'z-index': '0',
    }),
  });
  cell.insertBefore(plate, cell.firstChild);
  setStyle(cell, 'color', COLOR.rust);
}

function staticOff(cell: HTMLElement): void {
  q(cell, '[data-ps-static]')?.remove();
  restoreStyle(cell, 'color');
}

/** Cell-local coordinates, undoing the stage's `transform: scale(k)`. */
function localXY(cell: HTMLElement, clientX: number, clientY: number): [number, number] {
  const r = cell.getBoundingClientRect();
  const sc = cell.offsetWidth ? r.width / cell.offsetWidth : 1;
  return [(clientX - r.left) / sc, (clientY - r.top) / sc];
}

/**
 * `--r` and `--p` only interpolate if they are registered as <length>; an
 * unregistered custom property is a plain token and would snap instead of
 * running the 120ms steps(11,end) growth. `motion.css` declares these with
 * `@property`; this is a belt-and-braces duplicate — re-registering the same
 * name throws and is ignored, and the descriptors match the prototype exactly.
 */
if (typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function') {
  for (const name of ['--r', '--p']) {
    try {
      CSS.registerProperty({ name, syntax: '<length>', inherits: false, initialValue: '0px' });
    } catch {
      /* already registered by motion.css */
    }
  }
}

/**
 * `prodOn` needs the pointer position but the contract hands it only the cell,
 * so the last pointer position is tracked document-wide. `pointerover` bubbles
 * and is dispatched before the target's `pointerenter`, so the position is
 * always current by the time a channel's enter handler runs.
 */
let ptrX = 0;
let ptrY = 0;
let ptrSeen = false;
if (typeof document !== 'undefined') {
  const rec = (e: PointerEvent): void => {
    ptrX = e.clientX;
    ptrY = e.clientY;
    ptrSeen = true;
  };
  document.addEventListener('pointerover', rec, { capture: true, passive: true });
  document.addEventListener('pointermove', rec, { capture: true, passive: true });
}

/* ------------------------------------------- 01 · Product designs — the grid */

/** Enter timestamps, used to hold the module callouts still for 620ms. */
const SCAF_T0 = new WeakMap<HTMLElement, number>();
/** Hover generation, so a deferred cleanup cannot fire into a newer hover. */
const GEN = new WeakMap<HTMLElement, number>();

function bumpGen(cell: HTMLElement): number {
  const n = (GEN.get(cell) ?? 0) + 1;
  GEN.set(cell, n);
  return n;
}

/** The lavender lattice grows out of the module the cursor entered on. */
function gridEnter(cell: HTMLElement, clientX: number, clientY: number): void {
  const [x, y] = localXY(cell, clientX, clientY);
  cell.style.setProperty('--gx', `${(Math.floor(x / MODULE) * MODULE).toFixed(2)}px`);
  cell.style.setProperty('--gy', `${(Math.floor(y / MODULE) * MODULE).toFixed(2)}px`);
  cell.style.setProperty('--hx', `${(Math.floor(x / MODULE) * MODULE).toFixed(2)}px`);
  cell.style.setProperty('--hy', `${(Math.floor(y / MODULE) * MODULE).toFixed(2)}px`);
}

function scafOn(cell: HTMLElement): void {
  SCAF_T0.set(cell, Date.now());
  qq(cell, '[data-scaf]').forEach((s, i) => {
    s.style.transitionDelay = `${110 + i * 55}ms`;
    s.style.opacity = '1';
  });
}

function scafOff(cell: HTMLElement): void {
  qq(cell, '[data-scaf]').forEach((s) => {
    s.style.transitionDelay = '0ms';
    s.style.opacity = '0';
  });
}

/** Move the dashed guides and the "col NN · row NN" module label to the cursor. */
function scafPlace(cell: HTMLElement, clientX: number, clientY: number): void {
  const [x, y] = localXY(cell, clientX, clientY);
  // both axes snap on the same 72.727 module — the cell is a square lattice
  const cx = Math.floor(x / MODULE) * MODULE;
  const cy = Math.floor(y / MODULE) * MODULE;
  const colNo = String(Math.floor(x / MODULE) + 1).padStart(2, '0');
  const rowNo = String(Math.floor(y / MODULE) + 1).padStart(2, '0');

  const col = q<SVGGElement>(cell, '[data-col]');
  if (col) {
    col.setAttribute('transform', `translate(${cx.toFixed(1)},${Math.round(y)})`);
    const t = q<SVGTextElement>(col, 'text');
    if (t) t.textContent = `col ${colNo} · 72.7`;
  }
  const vg = q<SVGGElement>(cell, '[data-vguide]');
  if (vg) vg.setAttribute('transform', `translate(${cx.toFixed(1)},0)`);
  const hg = q<SVGGElement>(cell, '[data-hguide]');
  if (hg) hg.setAttribute('transform', `translate(0,${cy.toFixed(1)})`);
  const mod = q<SVGGElement>(cell, '[data-mod]');
  if (mod) {
    mod.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)})`);
    const t = q<SVGTextElement>(mod, 'text');
    if (t) t.textContent = `col ${colNo} · row ${rowNo}`;
  }

  // the fixed dimension callouts hold their staggered reveal for 620ms, then
  // start reacting to cursor proximity
  if (Date.now() - (SCAF_T0.get(cell) ?? 0) < 620) return;
  qq<SVGGElement>(cell, '[data-mx]').forEach((g) => {
    const d = Math.hypot(x - Number(g.getAttribute('data-mx')), y - Number(g.getAttribute('data-my')));
    g.style.transitionDelay = '0ms';
    g.style.opacity = (0.44 + 0.56 * Math.max(0, 1 - d / 260)).toFixed(3);
  });
}

export function prodOn(cell: HTMLElement): void {
  setHovered(cell, 1, 1);
  bumpGen(cell);
  if (reducedFor(cell)) {
    staticOn(cell);
    return;
  }
  // --r 0→800px over 120ms steps(11,end); --p 0→820px over 260ms
  // cubic-bezier(.3,0,0,1) delayed 70ms — both transitions live on the cell.
  setStyle(cell, '--r', HOVER.ch1.r);
  setStyle(cell, '--p', HOVER.ch1.p);
  setStyle(cell, 'color', COLOR.rust);
  if (ptrSeen) gridEnter(cell, ptrX, ptrY);
  scafOn(cell);
  if (ptrSeen) scafPlace(cell, ptrX, ptrY);

  qq(cell, '[data-l]').forEach((s, i) => {
    s.style.setProperty('-webkit-text-stroke', '1.6px rgba(255,255,255,.62)');
    // four letters knock out to outline only, three swap to the alternate face
    s.style.color = i === 2 || i === 5 || i === 9 || i === 12 ? 'transparent' : COLOR.rust;
    if (i === 1 || i === 7 || i === 11) {
      s.style.fontFamily = "'Dessign Maison',Helvetica,sans-serif";
      s.style.fontFeatureSettings = "'salt' 1,'ss01' 1";
    }
  });
}

export function prodOff(cell: HTMLElement): void {
  setHovered(cell, null, 1);
  const gen = bumpGen(cell);
  staticOff(cell);
  restoreStyle(cell, '--r');
  restoreStyle(cell, '--p');
  restoreStyle(cell, 'color');
  scafOff(cell);
  qq(cell, '[data-l]').forEach((s) => {
    // fade the stroke out over the letters' own 200ms color transition
    s.style.setProperty('-webkit-text-stroke-color', 'rgba(255,255,255,0)');
    s.style.color = '';
    s.style.fontFamily = '';
    s.style.fontFeatureSettings = '';
  });
  // once the shrink and that fade have run, drop the stroke and the lattice
  // origin. --gx/--gy have to outlive the leave: --r eases 800→0 over 120ms and
  // must collapse back into the module the cursor entered on, not the default.
  setTimeout(() => {
    if (GEN.get(cell) !== gen) return;
    qq(cell, '[data-l]').forEach((s) => s.style.removeProperty('-webkit-text-stroke'));
    for (const p of ['--gx', '--gy', '--hx', '--hy']) cell.style.removeProperty(p);
  }, 400);
}

export function scafMove(cell: HTMLElement, ev: PointerEvent): void {
  if (reducedFor(cell)) return;
  scafPlace(cell, ev.clientX, ev.clientY);
}

/* ----------------------------------------------- 02 · Paintings — the beads */

const LIQUID_ID = 'ps-liquid-i';

/** bead diameter, cell-local px */
const D = 46;
/** the band of the cell the beads are allowed to paint in */
const TOPY = 74;
const BOTY = 212;
const PAD = 26;
/** coverage grid used to spread strokes over the canvas */
const GX = 6;
const GY = 4;

interface HistPt {
  x: number;
  y: number;
  nx: number;
  ny: number;
  k: number;
}

interface Bead {
  sp: HTMLElement;
  col: string;
  /** resting letter box, cell-local */
  lx: number;
  ly: number;
  lw: number;
  lh: number;
  /** home position the bead expands back into */
  hx: number;
  hy: number;
  x: number;
  y: number;
  /** flight frame counter, -1 = idling on the canvas */
  f: number;
  /** brush pressure 0–1, drives the persistent paint trail */
  press: number;
  /** squash */
  sq: number;
  hist: HistPt[];
  /** per-bead phase so blobs wobble out of sync */
  ph: number;
  sigDone?: boolean;
  sigF: number;
  vx: number;
  vy: number;
  spd: number;
  /** palette dab it loads from */
  ax: number;
  ay: number;
  newCol: string;
  /** stroke target and the bowed wrist-arc control point */
  tx: number;
  ty: number;
  cx: number;
  cy: number;
  sx: number;
  sy: number;
  /** idle drift anchor */
  rx?: number;
  ry?: number;
  rvx: number;
  rvy: number;
  px0?: number;
  py0?: number;
  ex: number;
  ey: number;
  /** render state */
  r?: number;
  ang?: number;
  angT?: number;
  st?: number;
}

interface WaterSim {
  items: Bead[];
  back: boolean;
  undo: boolean;
  undoAt: number;
  t: number;
  sig: number;
  qi: number;
  next: number;
  dir: number;
  di: number;
  raf: number;
  dead: boolean;
  mask: [CanvasGradient, CanvasGradient] | null;
  show(o: number): void;
  hollow(): void;
  fill(): void;
}

const WATER = new WeakMap<HTMLElement, WaterSim>();

/**
 * The paint canvas is filtered through a turbulence displacement so the trails
 * read as wet pigment. Injected once per document; if the page builder already
 * emitted the filter this is a no-op.
 */
function ensureLiquidFilter(cell: HTMLElement): void {
  if (document.getElementById(LIQUID_ID)) return;
  cell.appendChild(
    svg(
      'svg',
      { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;pointer-events:none' },
      svg(
        'filter',
        {
          id: LIQUID_ID,
          x: '-12%',
          y: '-12%',
          width: '124%',
          height: '124%',
          'color-interpolation-filters': 'sRGB',
        },
        svg('feTurbulence', {
          type: 'fractalNoise',
          baseFrequency: '0.013',
          numOctaves: 2,
          seed: 7,
          result: 'n',
        }),
        svg('feDisplacementMap', {
          in: 'SourceGraphic',
          in2: 'n',
          scale: 20,
          xChannelSelector: 'R',
          yChannelSelector: 'G',
        }),
      ),
    ),
  );
}

function clearCanvas(cv: HTMLCanvasElement | null): void {
  if (!cv) return;
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  cv.style.opacity = '0';
}

/** Hard stop — cancels the loop, clears both canvases and un-hollows the type. */
function waterTeardown(cell: HTMLElement): void {
  const sim = WATER.get(cell);
  if (sim) {
    cancelAnimationFrame(sim.raf);
    WATER.delete(cell);
  }
  qq(cell, '[data-l]').forEach((s) => {
    s.style.transition = '';
    s.style.color = '';
    s.style.removeProperty('-webkit-text-stroke');
  });
  clearCanvas(q<HTMLCanvasElement>(cell, '[data-paint]'));
  clearCanvas(q<HTMLCanvasElement>(cell, '[data-beads]'));
}

export function waterOn(cell: HTMLElement): void {
  setHovered(cell, 2, 2);
  if (reducedFor(cell)) {
    // covers the case where the media query flipped while a sim was mid-flight
    waterTeardown(cell);
    staticOn(cell);
    return;
  }
  setStyle(cell, '--p', HOVER.ch2.p);
  setStyle(cell, 'box-shadow', HOVER.ch2.shadow);
  setStyle(cell, 'color', COLOR.rust);

  const running = WATER.get(cell);
  if (running) {
    // re-entering mid-retraction: hollow the type again and resume forward
    running.back = false;
    running.undo = false;
    running.hollow();
    running.show(1);
    return;
  }

  const spans = qq(cell, '[data-l]');
  if (!spans.length) return;
  ensureLiquidFilter(cell);

  const cr = cell.getBoundingClientRect();
  const sc = cell.offsetWidth ? cr.width / cell.offsetWidth : 1;
  const CW = cell.offsetWidth;
  const cvP = q<HTMLCanvasElement>(cell, '[data-paint]');
  const cvB = q<HTMLCanvasElement>(cell, '[data-beads]');
  const g = cvP ? cvP.getContext('2d') : null;
  const gb = cvB ? cvB.getContext('2d') : null;

  /**
   * Both canvases are inset 15px inside the cell and oversampled (1.4× paint,
   * 2× beads). Working in cell-local coordinates means bead positions and
   * letter boxes share one space.
   */
  const prep = (c: CanvasRenderingContext2D | null, cv: HTMLCanvasElement | null, k: number): void => {
    if (!c || !cv) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    c.scale(k, k);
    c.translate(-15, -15);
    c.lineCap = 'round';
    c.lineJoin = 'round';
  };
  prep(g, cvP, 1.4);
  prep(gb, cvB, 2);

  const beads: Bead[] = spans.map((sp, i) => {
    const r = sp.getBoundingClientRect();
    const lx = (r.left - cr.left) / sc;
    const ly = (r.top - cr.top) / sc;
    const lw = r.width / sc;
    const lh = r.height / sc;
    sp.style.transition =
      `color 280ms linear ${i * 34}ms,-webkit-text-stroke-color 280ms linear ${i * 34}ms`;
    sp.style.setProperty('-webkit-text-stroke', '2px rgba(28,14,40,0)');
    const col = VIVID[i % VIVID.length];
    return {
      sp,
      col,
      lx,
      ly,
      lw,
      lh,
      hx: lx + lw / 2,
      hy: ly + lh * 0.55,
      x: lx + lw / 2,
      y: ly + lh * 0.55,
      f: -1,
      press: 0,
      sq: 1,
      hist: [],
      ph: i * 1.9,
      sigDone: undefined,
      sigF: 0,
      vx: 0,
      vy: 0,
      spd: 0,
      ax: 0,
      ay: 0,
      newCol: col,
      tx: 0,
      ty: 0,
      cx: 0,
      cy: 0,
      sx: 0,
      sy: 0,
      rx: undefined,
      ry: undefined,
      rvx: 0,
      rvy: 0,
      px0: undefined,
      py0: undefined,
      ex: 0,
      ey: 0,
      r: undefined,
      ang: undefined,
      angT: undefined,
      st: undefined,
    };
  });

  const cov = new Array<number>(GX * GY).fill(0);
  const covCell = (x: number, y: number): number =>
    Math.min(GY - 1, Math.max(0, Math.floor((y - TOPY) / ((BOTY - TOPY) / GY)))) * GX +
    Math.min(GX - 1, Math.max(0, Math.floor((x - PAD) / ((CW - PAD * 2) / GX))));

  // six palette dabs pinned to the frame edge — beads go and load from these
  const bx0 = PAD + 14;
  const bw = CW - PAD * 2 - 28;
  const by0 = TOPY + 6;
  const bh = BOTY - TOPY - 12;
  const dabs = (
    [
      [bx0, by0],
      [bx0 + bw * 0.5, by0],
      [bx0 + bw, by0],
      [bx0 + bw, by0 + bh],
      [bx0 + bw * 0.5, by0 + bh],
      [bx0, by0 + bh],
    ] as [number, number][]
  ).map((d, i) => ({ x: d[0], y: d[1], col: VIVID[i % VIVID.length] }));

  const sim: WaterSim = {
    items: beads,
    back: false,
    undo: false,
    undoAt: 0,
    t: 0,
    sig: 0,
    qi: 0,
    next: 46,
    dir: 1,
    di: 0,
    raf: 0,
    dead: false,
    mask: null,
    show: (o: number) => {
      if (cvP) cvP.style.opacity = String(o);
      if (cvB) cvB.style.opacity = String(o);
    },
    hollow: () =>
      spans.forEach((sp) => {
        sp.style.color = 'transparent';
        sp.style.setProperty('-webkit-text-stroke', '2px #1C0E28');
      }),
    fill: () =>
      spans.forEach((sp) => {
        sp.style.color = '';
        sp.style.setProperty('-webkit-text-stroke', '2px rgba(28,14,40,0)');
      }),
  };
  WATER.set(cell, sim);

  // hollow one frame late so the per-letter 280ms stagger is visible
  requestAnimationFrame(() => {
    if (WATER.get(cell) === sim && !sim.back) {
      sim.hollow();
      sim.show(1);
    }
  });

  const smooth = (c: CanvasRenderingContext2D, P: [number, number][]): void => {
    const n = P.length;
    if (n < 3) return;
    c.beginPath();
    c.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const cu = P[i];
      const nx = P[(i + 1) % n];
      c.quadraticCurveTo(cu[0], cu[1], (cu[0] + nx[0]) / 2, (cu[1] + nx[1]) / 2);
    }
    c.closePath();
  };

  /** A wobbling, speed-stretched bead outline. */
  const blob = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    ang: number,
    st: number,
    ph: number,
  ): void => {
    const N = 9;
    const P: [number, number][] = [];
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const isq = 1 / Math.sqrt(st);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.2832;
      const w =
        1 + 0.15 * Math.sin(a * 3 + sim.t * 0.045 + ph) + 0.09 * Math.sin(a * 5 - sim.t * 0.033 + ph * 1.7);
      const px = Math.cos(a) * r * w * st;
      const py = Math.sin(a) * r * w * isq;
      P.push([x + px * ca - py * sa, y + px * sa + py * ca]);
    }
    smooth(c, P);
  };

  /** The metaball neck that fuses two beads as they close on each other. */
  const neck = (c: CanvasRenderingContext2D, a: Bead, b: Bead): void => {
    const ar = a.r ?? 0;
    const br = b.r ?? 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const maxD = (ar + br) * 1.7;
    if (d >= maxD || d < 2) return;
    const t = 1 - d / maxD;
    const ang = Math.atan2(dy, dx);
    const s1 = ang + 1.5708;
    const s2 = ang - 1.5708;
    const wa = ar * 0.88;
    const wb = br * 0.88;
    const nw = (ar + br) * 0.28 * t;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    c.beginPath();
    c.moveTo(a.x + Math.cos(s1) * wa, a.y + Math.sin(s1) * wa);
    c.quadraticCurveTo(mx + Math.cos(s1) * nw, my + Math.sin(s1) * nw, b.x + Math.cos(s1) * wb, b.y + Math.sin(s1) * wb);
    c.lineTo(b.x + Math.cos(s2) * wb, b.y + Math.sin(s2) * wb);
    c.quadraticCurveTo(mx + Math.cos(s2) * nw, my + Math.sin(s2) * nw, a.x + Math.cos(s2) * wa, a.y + Math.sin(s2) * wa);
    c.closePath();
    const gr = c.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, a.col);
    gr.addColorStop(1, b.col);
    c.fillStyle = gr;
    c.fill();
  };

  /** The tapered tail a moving bead drags behind it. */
  const ribbon = (c: CanvasRenderingContext2D, b: Bead, mul: number, alpha: number): void => {
    const H = b.hist;
    if (H.length < 3) return;
    const Lx: [number, number][] = [];
    const Rx: [number, number][] = [];
    for (let i = 0; i < H.length; i++) {
      const p = H[i];
      const t = i / (H.length - 1);
      const w = D * 0.46 * mul * Math.pow(t, 1.55) * p.k;
      Lx.push([p.x + p.nx * w, p.y + p.ny * w]);
      Rx.push([p.x - p.nx * w, p.y - p.ny * w]);
    }
    smooth(c, Lx.concat(Rx.reverse()));
    c.fillStyle = rgba(b.col, alpha);
    c.fill();
  };

  const step = (): void => {
    sim.t++;
    const its = sim.items;

    if (sim.back) {
      if (!sim.undo) {
        sim.undo = true;
        sim.undoAt = sim.t;
        sim.fill();
        sim.show(0);
        for (const b of its) {
          b.ex = b.x;
          b.ey = b.y;
          b.f = -1;
          b.press = 0;
          b.sigDone = undefined;
        }
        sim.sig = 0;
      }
      // 32 frames to collapse back into the letter boxes
      const u = Math.min(1, (sim.t - sim.undoAt) / 32);
      const ez = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      for (const b of its) {
        b.x = b.ex + (b.hx - b.ex) * ez;
        b.y = b.ey + (b.hy - b.ey) * ez;
        b.sq = 1 - 0.5 * ez;
        b.press = 0;
        if (b.hist.length) b.hist.shift();
      }
      if (u >= 1) {
        sim.show(0);
        spans.forEach((sp) => {
          sp.style.transition = '';
          sp.style.color = '';
          sp.style.removeProperty('-webkit-text-stroke');
        });
        if (g && cvP) {
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, cvP.width, cvP.height);
        }
        sim.dead = true;
      }
      return;
    }

    // after every bead has laid one stroke, they all sign back onto their letters
    if (!sim.sig && sim.qi > 0 && sim.qi % its.length === 0) {
      sim.sig = 1;
      sim.qi = 0;
      its.forEach((b, i) => {
        b.sigF = -(i * 6);
        b.sigDone = false;
      });
    }
    if (!sim.sig && sim.t >= sim.next) {
      const b = its[sim.qi % its.length];
      sim.qi++;
      sim.next = sim.t + 26;
      if (b.f < 0) {
        const dab = dabs[sim.di % dabs.length];
        sim.di += 5;
        b.ax = dab.x;
        b.ay = dab.y;
        b.newCol = dab.col;
        // aim at the least-painted cell, jittered
        let bi = 0;
        let bv = 1e9;
        for (let k = 0; k < cov.length; k++) {
          const v = cov[k] + Math.random() * 1.4;
          if (v < bv) {
            bv = v;
            bi = k;
          }
        }
        const gw = (CW - PAD * 2) / GX;
        const gh = (BOTY - TOPY) / GY;
        b.tx = PAD + (bi % GX) * gw + gw * (0.25 + Math.random() * 0.5);
        b.ty = TOPY + Math.floor(bi / GX) * gh + gh * (0.25 + Math.random() * 0.5);
        const mx = (b.ax + b.tx) / 2;
        const my = (b.ay + b.ty) / 2;
        const nx = -(b.ty - b.ay);
        const ny = b.tx - b.ax;
        const nl = Math.hypot(nx, ny) || 1;
        // alternating bow so consecutive strokes read as a wrist arc
        const bow = (40 + Math.random() * 46) * sim.dir;
        b.cx = mx + (nx / nl) * bow;
        b.cy = my + (ny / nl) * bow;
        b.sx = b.x;
        b.sy = b.y;
        b.f = 0;
        b.rx = undefined;
        sim.dir *= -1;
      }
    }
    if (sim.sig && its.every((b) => b.sigDone)) {
      sim.sig = 0;
      sim.next = sim.t + 40;
      its.forEach((b) => {
        b.sigDone = undefined;
      });
    }

    for (const b of its) {
      const ox = b.x;
      const oy = b.y;
      if (sim.sig && b.f < 0 && b.sigDone === false) {
        const f = b.sigF++;
        if (f >= 0) {
          if (f <= 22) {
            const u = f / 22;
            const e2 = 1 - Math.pow(1 - u, 3.4);
            b.x = b.px0 === undefined ? b.x : b.px0 + (b.lx + b.lw / 2 - b.px0) * e2;
            b.y = b.py0 === undefined ? b.y : b.py0 + (b.ly + b.lh * 0.55 - b.py0) * e2;
            if (f === 0) {
              b.px0 = ox;
              b.py0 = oy;
            }
            b.press = 0.34 * Math.sin(u * Math.PI);
          } else {
            const u = (f - 22) / 14;
            b.x = b.lx + b.lw / 2;
            b.y = b.ly + b.lh * 0.55;
            b.press = Math.max(0, 0.95 * (1 - u));
            b.sq = 1 + 0.3 * Math.sin(Math.min(1, u) * Math.PI);
            if (f >= 36) {
              b.sigDone = true;
              b.press = 0;
              b.sq = 1;
              b.px0 = undefined;
              b.rx = b.x;
              b.ry = b.y;
              b.rvx = 0;
              b.rvy = 0;
              b.angT = b.ang;
            }
          }
        } else b.press = 0;
      } else if (b.f >= 0) {
        const f = b.f++;
        if (f < 22) {
          // travel to the palette dab
          const u = f / 22;
          const e2 = 1 - Math.pow(1 - u, 2.4);
          b.x = b.sx + (b.ax - b.sx) * e2;
          b.y = b.sy + (b.ay - b.sy) * e2;
          b.press = 0;
          b.sq = 1 + 0.1 * Math.sin(u * Math.PI);
        } else if (f < 36) {
          // dip into the paint and take its color
          const u = (f - 22) / 14;
          const dip = Math.sin(u * Math.PI);
          b.x = b.ax;
          b.y = b.ay + dip * 4;
          b.sq = 1 - 0.34 * dip;
          b.press = dip * 0.6;
          if (f === 29) b.col = b.newCol;
        } else if (f < 74) {
          // the bowed stroke itself
          const u = (f - 36) / 38;
          const e2 = 1 - Math.pow(1 - u, 4.2);
          const qd = 1 - e2;
          b.x = qd * qd * b.ax + 2 * qd * e2 * b.cx + e2 * e2 * b.tx;
          b.y = qd * qd * b.ay + 2 * qd * e2 * b.cy + e2 * e2 * b.ty;
          b.press = Math.min(1, Math.sin(Math.pow(u, 0.62) * Math.PI) * 1.5);
        } else {
          // damped overshoot as the wrist lifts
          const u = (f - 74) / 34;
          const tgx = b.tx - b.cx;
          const tgy = b.ty - b.cy;
          const tl = Math.hypot(tgx, tgy) || 1;
          const bo = Math.sin(u * Math.PI * 2.6) * 26 * Math.exp(-u * 3.1);
          b.x = b.tx + (tgx / tl) * bo;
          b.y = b.ty + (tgy / tl) * bo;
          b.press = Math.max(0, 0.5 * (1 - u * 1.5));
          b.sq = 1 + 0.16 * Math.sin(u * Math.PI * 2.6) * Math.exp(-u * 2.6);
          if (f >= 108) {
            b.f = -1;
            b.press = 0;
            b.sq = 1;
            b.rx = b.x;
            b.ry = b.y;
            b.rvx = 0;
            b.rvy = 0;
            b.angT = b.ang;
          }
        }
      } else {
        // idle: soft repulsion holds the beads about one diameter apart
        if (b.rx === undefined) {
          b.rx = b.x;
          b.ry = b.y;
          b.rvx = 0;
          b.rvy = 0;
        }
        let fx = 0;
        let fy = 0;
        for (const o of its) {
          if (o === b) continue;
          const ax2 = o.rx === undefined ? o.x : o.rx;
          const ay2 = o.ry === undefined ? o.y : o.ry;
          const dx2 = ax2 - (b.rx ?? 0);
          const dy2 = ay2 - (b.ry ?? 0);
          const dd = Math.hypot(dx2, dy2) || 1;
          const gap = D * 1.24;
          const dead = 7;
          if (dd < gap - dead) {
            const k = (gap - dead - dd) * 0.0045;
            fx -= (dx2 / dd) * k;
            fy -= (dy2 / dd) * k;
          } else if (dd < D * 2.4 && dd > gap + dead) {
            const k = (dd - gap - dead) * 0.0022;
            fx += (dx2 / dd) * k;
            fy += (dy2 / dd) * k;
          }
        }
        b.rvx = (b.rvx + fx) * 0.82;
        b.rvy = (b.rvy + fy) * 0.82;
        const rv = Math.hypot(b.rvx, b.rvy);
        if (rv > 0.85) {
          b.rvx *= 0.85 / rv;
          b.rvy *= 0.85 / rv;
        }
        b.rx = (b.rx ?? 0) + b.rvx;
        b.ry = (b.ry ?? 0) + b.rvy;
        b.rx = Math.max(PAD, Math.min(CW - PAD, b.rx));
        b.ry = Math.max(TOPY, Math.min(BOTY, b.ry));
        b.x = b.rx + Math.sin(sim.t / 62 + b.ph) * 1.15;
        b.y = b.ry + Math.cos(sim.t / 77 + b.ph) * 0.85;
        b.press = 0;
        b.sq = 1;
      }

      b.x = Math.max(PAD, Math.min(CW - PAD, b.x));
      b.y = Math.max(TOPY, Math.min(BOTY, b.y));
      b.vx = b.x - ox;
      b.vy = b.y - oy;
      const sp2 = Math.hypot(b.vx, b.vy);
      b.spd = sp2;
      const nl = sp2 || 1;
      b.hist.push({ x: b.x, y: b.y, nx: -b.vy / nl, ny: b.vx / nl, k: Math.max(0.3, 1 - sp2 * 0.04) });
      const cap = sp2 > 1.4 ? 22 : 9;
      while (b.hist.length > cap) b.hist.shift();

      // pressure lays permanent pigment on the paint canvas
      if (b.press > 0.02 && g) {
        cov[covCell(b.x, b.y)] += b.press;
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        ribbon(g, b, 1.3 + b.press * 1.5, 0.12 * b.press);
        const rad = D * (0.3 + 0.55 * b.press) * (1 - Math.min(0.4, sp2 * 0.02));
        const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, rad * 2.4);
        gr.addColorStop(0, rgba(b.col, 0.2 * b.press));
        gr.addColorStop(0.55, rgba(b.col, 0.08 * b.press));
        gr.addColorStop(1, rgba(b.col, 0));
        g.fillStyle = gr;
        g.beginPath();
        g.arc(b.x, b.y, rad * 2.4, 0, 6.283);
        g.fill();
      }
    }
  };

  const render = (): void => {
    const its = sim.items;
    if (g) {
      // keep the pigment inside the band — hard cut top and bottom, soft ramp in
      if (!sim.mask) {
        const mt = g.createLinearGradient(0, 50, 0, 76);
        mt.addColorStop(0, '#000');
        mt.addColorStop(1, 'rgba(0,0,0,0)');
        const mb = g.createLinearGradient(0, 210, 0, 236);
        mb.addColorStop(0, 'rgba(0,0,0,0)');
        mb.addColorStop(1, '#000');
        sim.mask = [mt, mb];
      }
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = 1;
      g.fillStyle = '#000';
      g.fillRect(15, 15, 450, 35);
      g.fillRect(15, 236, 450, 38);
      g.fillStyle = sim.mask[0];
      g.fillRect(15, 50, 450, 26);
      g.fillStyle = sim.mask[1];
      g.fillRect(15, 210, 450, 26);
      g.globalCompositeOperation = 'source-over';
    }
    if (gb) {
      prep(gb, cvB, 2);
      gb.globalAlpha = 1;
      for (const b of its) {
        const sp2 = b.spd || 0;
        const rT = D * 0.5 * (1 - Math.min(0.5, sp2 * 0.036)) * b.sq;
        b.r = b.r === undefined ? rT : b.r + (rT - b.r) * 0.3;
        if (sp2 > 0.8) b.angT = Math.atan2(b.vy, b.vx);
        const at = b.angT === undefined ? 0 : b.angT;
        b.ang =
          b.ang === undefined ? at : b.ang + Math.atan2(Math.sin(at - b.ang), Math.cos(at - b.ang)) * 0.11;
        const stT = 1 + Math.min(0.85, sp2 * 0.042);
        b.st = b.st === undefined ? stT : b.st + (stT - b.st) * 0.26;
      }
      for (let i = 0; i < its.length; i++) {
        for (let j = i + 1; j < its.length; j++) neck(gb, its[i], its[j]);
      }
      for (const b of its) {
        gb.fillStyle = b.col;
        ribbon(gb, b, 1.15, 0.82);
        blob(gb, b.x, b.y, b.r ?? 0, b.ang ?? 0, b.st ?? 1, b.ph);
        gb.fill();
      }
    }
  };

  // fixed 60Hz step, at most 3 catch-up steps per frame
  let acc = 0;
  let prev = 0;
  const loop = (now: number): void => {
    if (!prev) prev = now;
    acc += Math.min(64, now - prev);
    prev = now;
    let n = 0;
    while (acc >= 16.667 && n < 3) {
      step();
      acc -= 16.667;
      n++;
      if (sim.dead) break;
    }
    if (sim.dead) {
      if (WATER.get(cell) === sim) WATER.delete(cell);
      return;
    }
    render();
    sim.raf = requestAnimationFrame(loop);
  };
  sim.raf = requestAnimationFrame(loop);
}

export function waterOff(cell: HTMLElement): void {
  setHovered(cell, null, 2);
  staticOff(cell);
  restoreStyle(cell, '--p');
  restoreStyle(cell, 'box-shadow');
  restoreStyle(cell, 'color');
  const sim = WATER.get(cell);
  if (sim) {
    // the exit is part of the personality: the beads expand back into letters,
    // then the loop tears itself down
    sim.back = true;
    return;
  }
  waterTeardown(cell);
}

/* ------------------------------------------- 03 · Competizione — the lap */

export function sweepOn(cell: HTMLElement): void {
  setHovered(cell, 3, 3);
  if (reducedFor(cell)) {
    staticOn(cell);
    return;
  }
  setStyle(cell, 'background-size', HOVER.ch3.size);
  setStyle(cell, 'box-shadow', HOVER.ch3.shadow);
  setStyle(cell, 'color', COLOR.rust);

  // every letter runs the same 3.4s lap, 22ms apart — hard linear skew and
  // trailing light, so the flash reads as one object passing the whole word
  qq(cell, '[data-l]').forEach((s, i) => {
    s.style.display = 'inline-block';
    s.style.willChange = 'transform,color';
    s.style.animation = `ps-lap 3400ms linear ${i * 22}ms infinite`;
  });
  const w = q(cell, '[data-word]');
  if (w) w.style.animation = 'ps-breath 3400ms ease-in-out 0ms infinite';

  // the 48px checkered board drifts on a 3.2s cycle against the 3.4s lap, so
  // coverage never repeats in phase
  qq(cell, '[data-flag]').forEach((f) => {
    f.style.transform = '';
    f.style.filter = '';
    f.style.opacity = '1';
    f.style.animation = 'ps-driftR 3200ms linear 0ms infinite,ps-flag 3400ms ease-in-out 0ms infinite';
  });
  qq(cell, '[data-frame]').forEach((f) => {
    f.style.transform = '';
    f.style.filter = '';
    f.style.opacity = '1';
    f.style.animation = 'ps-line 3400ms ease-in-out 0ms infinite';
  });
}

export function sweepOff(cell: HTMLElement): void {
  setHovered(cell, null, 3);
  staticOff(cell);
  restoreStyle(cell, 'background-size');
  restoreStyle(cell, 'box-shadow');
  restoreStyle(cell, 'color');

  qq(cell, '[data-l]').forEach((s) => {
    s.style.animation = '';
    s.style.textShadow = '';
    s.style.transform = '';
    s.style.willChange = '';
  });
  const w = q(cell, '[data-word]');
  if (w) w.style.animation = '';

  qq(cell, '[data-flag],[data-frame]').forEach((f) => {
    // freeze whatever the running keyframes had reached, then fade from there —
    // canceling the animation alone would snap the board back to frame 0
    const cs = getComputedStyle(f);
    const op = cs.opacity;
    const tf = cs.transform;
    const fi = cs.filter;
    f.getAnimations().forEach((a) => {
      try {
        a.cancel();
      } catch {
        /* already detached */
      }
    });
    f.style.animation = '';
    if (tf && tf !== 'none') f.style.transform = tf;
    if (fi && fi !== 'none') f.style.filter = fi;
    f.style.opacity = op;
    void f.offsetWidth; // flush so the 300ms opacity transition has a start value
    f.style.opacity = '0';
  });
}
