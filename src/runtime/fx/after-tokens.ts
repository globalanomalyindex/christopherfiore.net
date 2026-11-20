/**
 * Skeleton, from after tokens: his study of ambient skeleton loading and of
 * how generated text arrives, on After Tokens' own shipping material.
 *
 * The cells are After Tokens' growing skeleton, `growing-cell-skeleton-v8`
 * (`createGrowingRows` and `growingRowAt`, vendored byte for byte in
 * src/vendor/after-tokens/): quiet long lines alternate with rows of at most
 * three broad cells. Every other value is After Tokens' own, cited where it
 * is used. One skeleton row stands in for each line of text, each block of
 * text on its own (the label, and the detail or figure). The tag keeps its
 * ruled box.
 *
 * Timeline, ms after the rest (add 300 for time since entry):
 *     0  -  60  the ink leaves: reading-ink-arrive played backwards, while each
 *               block's joined capsule fades in from nothing to 0.2, so nothing
 *               pops. Leaving is quicker than arriving
 *    30  - 210  the division: After Tokens' 950ms opening at its own keyframe
 *               percentages, scaled to 180ms. The capsule holds until the ink
 *               has all but gone, then divides into the lines and cross-fades
 *               to the cells
 *   150  - 260  the glimmer, once, across every cell on one clock
 *   260  - 540  the handover at After Tokens' own tempo, 280ms: every cell, in
 *               reading order, travels to a word group as the ink arrives
 *   540         done: the row is the settled glitch
 *
 * The text is under 0.45 for 329ms and the card is over 540ms after its first
 * change. In real time the score barely moves during a hover (its first cue is
 * 1.7s away at the earliest), which is faithful: After Tokens runs it at 1x.
 *
 * It reads no pointer. (An effect that reads the live pointer after its last
 * drawing must return follow: true, or it stops answering when the clock
 * stops 900ms after the dwell.)
 */

import type { Hot, Look } from '../buttons.ts';
import { createGrowingRows, growingRowAt } from '../../vendor/after-tokens/growing-geometry.ts';
import type { AmbientRow } from '../../vendor/after-tokens/ambient-geometry.ts';
import { bez, clamp01, lerp } from './curve.ts';
import { textGrid, type Box } from './textgrid.ts';

const INK = '#1A1820';
const LEAVE = 60;
const DIV0 = 30;
const DIV = 180;
const GLIMMER = [150, 260];
const HAND0 = 260;
/** reading-bubble-transfer and reading-ink-arrive, 280ms (app/globals.css) */
const HAND = 280;
const END = HAND0 + HAND;

/** division-open, division-cell (app/skeleton-division.css) and reading-ink-arrive (app/globals.css) */
const E_OPEN = bez(0.25, 1, 0.5, 1);
/** reading-bubble-transfer (app/globals.css) */
const E_TRANSFER = bez(0.22, 1, 0.36, 1);
/** skeleton-breathe (app/ambient-composition.css) */
const E_BREATH = bez(0.45, 0, 0.55, 1);
/** division-cell's settle: 78.9473684211%, 750 of 950ms (app/skeleton-division.css) */
const SETTLE = 0.7894736842;

/** After Tokens' `reading-ink-arrive` (app/globals.css): 0.45 at 38%, 1 at 74%, from 1.5px down through -0.2px to 0. */
export function inkArrive(u: number): { op: number; top: number } {
  if (u <= 0) return { op: 0, top: 1.5 };
  if (u >= 1) return { op: 1, top: 0 };
  const op = u < 0.38 ? 0.45 * E_OPEN(u / 0.38) : u < 0.74 ? 0.45 + 0.55 * E_OPEN((u - 0.38) / 0.36) : 1;
  const top = u < 0.74 ? 1.5 - 1.7 * E_OPEN(u / 0.74) : -0.2 + 0.2 * E_OPEN((u - 0.74) / 0.26);
  return { op, top };
}

/** skeleton-breathe (app/ambient-composition.css): 0.72, 1 at 50%, 0.72, on the row's period, started at -phase. */
const breath = (row: AmbientRow, t: number): number => {
  const p = (((t + row.breathPhaseMs) % row.breathPeriodMs) + row.breathPeriodMs) % row.breathPeriodMs / row.breathPeriodMs;
  return p < 0.5 ? 0.72 + 0.28 * E_BREATH(p / 0.5) : 1 - 0.28 * E_BREATH((p - 0.5) / 0.5);
};

interface SkRow {
  row: AmbientRow;
  /** the line's text: left edge, width and middle */
  x: number;
  w: number;
  cy: number;
  bar: number;
  /** After Tokens' em: the bar is 0.9 of it (components/settle/skeleton-division.tsx) */
  font: number;
}
interface SkBlock {
  rows: SkRow[];
  /** the division's frame: the block's widest line, its first line box to its last */
  l: number;
  w: number;
  t: number;
  h: number;
  font: number;
  /** each slab's start top, in the frame */
  start: number[];
  div: HTMLSpanElement | null;
  slabs: HTMLSpanElement[];
}
interface Cell {
  r: SkRow;
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
  el: HTMLSpanElement;
  /** the handover: captured at 260ms */
  from?: { x: number; y: number; w: number; h: number; a: number; to: Box };
}
interface Field {
  blocks: SkBlock[];
  groups: Box[];
  details: HTMLElement[];
  root: HTMLSpanElement | null;
  field: HTMLSpanElement | null;
  cells: Cell[];
}
const fields = new WeakMap<Hot, Field>();

/** After Tokens' bubble-transfer (components/settle/bubble-transfer.tsx): up to three words on one line, 10% down and 80% tall, measured 1.5px up. */
function groupsOf(words: Box[]): Box[] {
  const out: Box[] = [];
  for (let i = 0; i < words.length; ) {
    const first = words[i++];
    let right = first.r;
    let n = 1;
    while (i < words.length && n < 3 && Math.abs(words[i].t - first.t) < 2) right = Math.max(right, words[i++].r), n++;
    const h = first.b - first.t;
    out.push({ l: first.l, t: first.t - 1.5 + h * 0.1, r: right, b: first.t - 1.5 + h * 0.9 });
  }
  return out;
}

function fieldOf(h: Hot): Field {
  let f = fields.get(h);
  if (f) return f;
  const g = textGrid(h);
  const rows = createGrowingRows(h.b.getAttribute('href') ?? h.b.textContent ?? '');
  const blocks: SkBlock[] = [];
  // targets in reading order, each block of text grouped on its own (a group never runs from the label into the detail)
  const groups: Box[] = [];
  for (const k of g.blocks) {
    if (k.kind === 'tag') continue;
    // After Tokens' bar to line ratio, .9em in a 1.625em line (app/ambient-composition.css)
    const bar = (k.lh * 0.9) / 1.625;
    const font = bar / 0.9;
    const n = k.lines.length;
    const sk: SkRow[] = k.lines.map((ln, i) => {
      const w = ln.box.r - ln.box.l;
      // one line: After Tokens' one-row rule, a split row past 11 bar heights (components/settle/line-continuation.tsx)
      const idx = n > 1 ? i % rows.length : w > bar * 11 ? 1 : 0;
      return { row: rows[idx], x: ln.box.l, w, cy: (ln.box.t + ln.box.b) / 2, bar, font };
    });
    const l = Math.min(...sk.map((r) => r.x));
    const t = sk[0].cy - k.lh / 2;
    const hh = sk[n - 1].cy + k.lh / 2 - t;
    // the slabs start contiguous, 0.56em each, in the middle of the frame (components/settle/skeleton-division.tsx)
    const joined = (hh - n * 0.56 * font) / 2;
    blocks.push({ rows: sk, l, w: Math.max(...sk.map((r) => r.x + r.w)) - l, t, h: hh, font, start: sk.map((_, i) => joined + i * 0.56 * font), div: null, slabs: [] });
    groups.push(...groupsOf(k.lines.flatMap((ln) => ln.words)));
  }
  f = { blocks, groups, details: g.blocks.filter((k) => k.kind === 'detail').map((k) => k.el), root: null, field: null, cells: [] };
  fields.set(h, f);
  return f;
}

const px = (v: number) => `${v.toFixed(2)}px`;
const put = (el: HTMLElement, s: string) => {
  if (el.getAttribute('style') !== s) el.setAttribute('style', s);
};
const span = (parent: HTMLElement, cls: string): HTMLSpanElement => {
  const s = document.createElement('span');
  s.className = cls;
  parent.appendChild(s);
  return s;
};

/** The division at progress p, 0 to 1, for one block. */
function division(k: SkBlock, p: number, alpha: number): void {
  const div = k.div!;
  const joined = k.start[0];
  // division-open: held joined to 12%, fully open at 62%
  const o = p <= 0.12 ? 0 : p >= 0.62 ? 1 : E_OPEN((p - 0.12) / 0.5);
  const clip = `inset(${px(lerp(joined, 0, o))} ${(8 * (1 - o)).toFixed(3)}% ${px(lerp(joined, 0, o))} ${(4 * (1 - o)).toFixed(3)}% round ${px(1.4 * k.font * (1 - o))})`;
  put(div, `position:absolute;left:${px(k.l)};top:${px(k.t)};width:${px(k.w)};height:${px(k.h)};opacity:${alpha.toFixed(3)};clip-path:${clip}`);
  k.rows.forEach((r, i) => {
    const s0 = { l: 0.04 * k.w, t: k.start[i], w: 0.88 * k.w, h: 0.56 * k.font, rad: 0 };
    const shape = growingRowAt(r.row, 0);
    const end = { l: r.x - k.l, t: r.cy - r.bar / 2 - k.t, w: shape.width * r.w, h: r.bar, rad: 999 };
    // the 1.018 overshoot in top, width and height at 68%
    const peak = { l: end.l, t: s0.t + 1.018 * (end.t - s0.t), w: Math.max(0, Math.min(k.w, s0.w + 1.018 * (end.w - s0.w))), h: s0.h + 1.018 * (end.h - s0.h), rad: 999 };
    const [a, b, e] = p <= 0.12 ? [s0, s0, 0] : p <= 0.68 ? [s0, peak, E_OPEN((p - 0.12) / 0.56)] : p <= SETTLE ? [peak, end, E_OPEN((p - 0.68) / (SETTLE - 0.68))] : [end, end, 0];
    put(k.slabs[i], `position:absolute;left:${px(lerp(a.l, b.l, e))};top:${px(lerp(a.t, b.t, e))};width:${px(lerp(a.w, b.w, e))};height:${px(lerp(a.h, b.h, e))};border-radius:${px(lerp(a.rad, b.rad, e))};background:${INK}`);
  });
}

function draw(h: Hot, t: number): void {
  const f = fieldOf(h);
  if (!f.root || !f.root.isConnected) {
    f.root = document.createElement('span');
    f.root.setAttribute('data-k', 'sk');
    f.root.setAttribute('aria-hidden', 'true');
    f.root.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    for (const k of f.blocks) {
      k.div = span(f.root, 'skd');
      k.slabs = k.rows.map(() => span(k.div!, 'sks'));
    }
    f.field = span(f.root, 'skf');
    f.cells = [];
    f.blocks.forEach((k, bi) =>
      k.rows.forEach((r, ri) => {
        for (const q of growingRowAt(r.row, 0).pills)
          if (q.opacity > 0 && q.width > 0) {
            const el = span(f.field!, 'skc');
            // which line of text it stands for, for the checks
            el.dataset.row = `${bi}.${ri}`;
            f.cells.push({ r, x: 0, y: 0, w: 0, h: 0, a: 0, el });
          }
      }),
    );
    h.host.insertBefore(f.root, h.host.querySelector(':scope > .bo'));
  }
  // the division, its slabs fading in as the ink leaves and out as the cells come in
  const p = clamp01((t - DIV0) / DIV);
  const fadeIn = Math.min(1, t / LEAVE);
  const out = p <= SETTLE ? 1 : 1 - (p - SETTLE) / (1 - SETTLE);
  for (const k of f.blocks) {
    if (p >= 1) {
      if (k.div!.style.display !== 'none') k.div!.style.display = 'none';
    } else division(k, p, 0.2 * fadeIn * out);
  }
  // the field: After Tokens' cells, breathing; division-field brings it in over the division's last 21%
  const fieldOp = p <= SETTLE ? 0 : Math.min(1, (p - SETTLE) / (1 - SETTLE));
  put(f.field!, `position:absolute;inset:0;opacity:${fieldOp.toFixed(3)}`);
  let i = 0;
  for (const k of f.blocks) {
    for (const r of k.rows) {
      const shape = growingRowAt(r.row, t);
      const W = shape.width * r.w;
      const b = breath(r.row, t);
      for (const q of shape.pills) {
        if (!(q.opacity > 0 && q.width > 0)) continue;
        const c = f.cells[i++];
        if (!c) continue;
        c.x = r.x + q.x * W;
        c.w = q.width * W;
        c.h = r.bar;
        // the presence's float, translateY in em (app/ambient-composition.css)
        c.y = r.cy - r.bar / 2 + q.float * r.font;
        // the ink at .2, under the row's breath and the presence's opacity
        c.a = 0.2 * b * q.opacity;
      }
    }
  }
  const gl = t >= GLIMMER[0] && t < GLIMMER[1] ? (t - GLIMMER[0]) / (GLIMMER[1] - GLIMMER[0]) : -1;
  const u = clamp01((t - HAND0) / HAND);
  f.cells.forEach((c) => {
    if (u <= 0) {
      // skeleton-glimmer: the gradient sweeps each cell from -110% to 110% of its own width, linear
      const T = gl < 0 ? 0 : -110 + 220 * gl;
      const glim = gl < 0 ? '' : `linear-gradient(90deg,transparent ${(15 + T).toFixed(2)}%,rgb(255 255 255 / .3) ${(50 + T).toFixed(2)}%,transparent ${(85 + T).toFixed(2)}%),`;
      put(c.el, `position:absolute;left:${px(c.x)};top:${px(c.y)};width:${px(c.w)};height:${px(c.h)};border-radius:999px;background:${glim}${INK};opacity:${c.a.toFixed(3)}`);
      return;
    }
    // the handover: every cell on screen, in reading order, to a group by After Tokens' own mapping
    if (!c.from) {
      const live = f.cells.filter((q) => q.a * fieldOp > 0.006);
      const at = live.indexOf(c);
      const G = f.groups.length;
      c.from = { x: c.x, y: c.y, w: c.w, h: c.h, a: c.a * fieldOp, to: at < 0 || !G ? { l: c.x, t: c.y, r: c.x + c.w, b: c.y + c.h } : f.groups[Math.min(G - 1, Math.floor((at * G) / live.length))] };
    }
    const fr = c.from;
    const e = E_TRANSFER(u);
    // reading-bubble-transfer: the transform on one segment; the opacity on two, each on the same curve
    const a = u < 0.48 ? fr.a * (1 - 0.35 * E_TRANSFER(u / 0.48)) : 0.65 * fr.a * (1 - E_TRANSFER((u - 0.48) / 0.52));
    const sx = (fr.to.r - fr.to.l) / Math.max(0.01, fr.w);
    const sy = (fr.to.b - fr.to.t) / Math.max(0.01, fr.h);
    put(c.el, `position:absolute;left:${px(fr.x)};top:${px(fr.y)};width:${px(fr.w)};height:${px(fr.h)};border-radius:999px;background:${INK};opacity:${a.toFixed(3)};transform-origin:0 0;transform:translate(${px((fr.to.l - fr.x) * e)},${px((fr.to.t - fr.y) * e)}) scale(${(1 + (sx - 1) * e).toFixed(4)},${(1 + (sy - 1) * e).toFixed(4)})`);
  });
}

/** The ink of the label face and the detail at t. */
const inkAt = (t: number): { op: number; top: number } => (t < LEAVE ? inkArrive(1 - t / LEAVE) : t < HAND0 ? { op: 0, top: 1.5 } : inkArrive((t - HAND0) / HAND));

export function skeletonLook(h: Hot, t: number): Look {
  // reduced motion on its own row, and the end of the card: the plain settled row
  if (t >= END) return { own: () => skeletonDone(h) };
  const ink = inkAt(t);
  const f = fieldOf(h);
  return {
    ovS: `opacity:${ink.op.toFixed(3)};transform:translateY(${ink.top.toFixed(2)}px)`,
    own: (hh) => {
      draw(hh, t);
      // the detail settles by `translate`, a transform, never by moving its box
      for (const d of f.details) {
        const op = ink.op.toFixed(3);
        const tr = `0 ${ink.top.toFixed(2)}px`;
        if (d.style.opacity !== op) d.style.opacity = op;
        if (d.style.translate !== tr) d.style.translate = tr;
      }
    },
  };
}

/** Everything the card added, gone; the detail exactly as it was. */
export function skeletonDone(h: Hot): void {
  const f = fields.get(h);
  if (!f) return;
  f.root?.remove();
  for (const d of f.details) {
    d.style.opacity = '';
    d.style.translate = '';
  }
  fields.delete(h);
}
