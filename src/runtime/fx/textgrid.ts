/**
 * The text grid: the one meaning of "aligned with text" for every lineage
 * effect that lays bands, seams or spots over a button (his note: "any effect
 * bands need to be random but always aligned with text").
 *
 * Everything is in the button's own px: client rects divided by the button's
 * current scale, as `measure()` in buttons.ts does, measured from its top left.
 *
 *   cell     half the type size: the mono cell every column sits on
 *   words    what is never cut: each line of the label (its resting text and
 *            its glitch face with the tail, as one), the tag's ruled box, and
 *            every word of the detail or figure, one box per line it is on
 *   bands    one per line of the block with the most lines. Band i runs from
 *            halfway between line i-1 and line i to halfway between line i and
 *            line i+1; the first starts at 0, the last ends at the bottom
 *   seams    a column on the mono cell is clear in a band when no word that
 *            overlaps the band by more than 2px runs across it. 0 and the
 *            button's width are always clear. The top-level seams are the
 *            columns clear in every band.
 *
 * Measured once per hover, at the effect's first frame, when the glitch face
 * is already up. An effect that chooses among seams draws from the button's
 * own seeded stream (`streamOf`) and never repeats its last choice there.
 */

import type { Hot } from '../buttons.ts';
import { inkBase, mulberry } from '../ink.ts';
import { hashSeed } from '../../vendor/chickpea/grid/prng.ts';

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}
export interface Line {
  box: Box;
  /** the words on this line: for the label, its glitch face's words */
  words: Box[];
}
export interface Block {
  kind: 'label' | 'tag' | 'detail';
  el: HTMLElement;
  /** type size and line pitch, px */
  fs: number;
  lh: number;
  lines: Line[];
}
export interface Band {
  top: number;
  bottom: number;
  seams: number[];
}
export interface Grid {
  cell: number;
  bw: number;
  bh: number;
  blocks: Block[];
  words: Box[];
  bands: Band[];
  seams: number[];
}

const grids = new WeakMap<Hot, Grid>();

const union = (a: Box, q: Box): Box => ({ l: Math.min(a.l, q.l), t: Math.min(a.t, q.t), r: Math.max(a.r, q.r), b: Math.max(a.b, q.b) });
/** On one line: they share more than half the shorter one's height. */
const sameLine = (a: Box, q: Box): boolean => Math.min(a.b, q.b) - Math.max(a.t, q.t) > 0.5 * Math.min(a.b - a.t, q.b - q.t);

/** Boxes gathered into lines by vertical overlap, top to bottom. */
function lines(boxes: Box[], words: (line: Box) => Box[]): Line[] {
  const out: Box[] = [];
  for (const q of boxes) {
    const at = out.findIndex((l) => sameLine(l, q));
    if (at < 0) out.push({ ...q });
    else out[at] = union(out[at], q);
  }
  return out.sort((a, b) => a.t - b.t).map((box) => ({ box, words: words(box) }));
}

/** The button's text, in its own px. */
function measureBlocks(b: HTMLElement): Block[] {
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const rel = (q: DOMRect, dx = 0, dy = 0): Box => ({ l: (q.left - r.left) / sc - dx, t: (q.top - r.top) / sc - dy, r: (q.right - r.left) / sc - dx, b: (q.bottom - r.top) / sc - dy });
  const rects = (node: Node, from = 0, to = (node.textContent ?? '').length): Box[] => {
    const rg = document.createRange();
    rg.setStart(node, from);
    rg.setEnd(node, to);
    return Array.from(rg.getClientRects()).filter((q) => q.width > 0.5).map((q) => rel(q));
  };
  const style = (el: HTMLElement) => {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 16;
    return { fs, lh: parseFloat(cs.lineHeight) || fs * 1.3 };
  };
  const out: Block[] = [];
  for (const el of Array.from(b.querySelectorAll<HTMLElement>('[data-word], .cs > span, .l, .n'))) {
    if (el.closest('.sr-only') || !(el.textContent ?? '').trim()) continue;
    if (el.matches('[data-word]')) {
      // the resting text (clear while hot, but laid out) and the glitch face over it
      const own: Box[] = [];
      for (const n of Array.from(el.childNodes)) if (n.nodeType === Node.TEXT_NODE && (n.nodeValue ?? '').trim()) own.push(...rects(n));
      const face: Box[] = [];
      let cur: Box | null = null;
      const ov = el.querySelector<HTMLElement>(':scope > [data-glitch]');
      for (const sp of ov ? Array.from(ov.children) : []) {
        // only letter spans: anything else (a line break) is skipped
        if (!(sp instanceof HTMLSpanElement)) continue;
        if (!(sp.textContent ?? '').trim()) {
          if (cur) face.push(cur);
          cur = null;
          continue;
        }
        // where the letter rests, without any glide still running
        const q = rel(sp.getBoundingClientRect(), parseFloat(sp.style.left) || 0, parseFloat(sp.style.top) || 0);
        if (q.r - q.l < 0.5) continue;
        if (cur && !sameLine(cur, q)) {
          face.push(cur);
          cur = null;
        }
        cur = cur ? union(cur, q) : q;
      }
      if (cur) face.push(cur);
      const ls = lines([...own, ...face], (line) => {
        const ws = face.filter((w) => sameLine(w, line));
        return ws.length ? ws : [line];
      });
      if (ls.length) out.push({ kind: 'label', el, ...style(el), lines: ls });
    } else if (el.matches('.cs > span')) {
      const q = rel(el.getBoundingClientRect());
      if (q.r - q.l > 0.5) out.push({ kind: 'tag', el, ...style(el), lines: [{ box: q, words: [q] }] });
    } else {
      const words: Box[] = [];
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n && words.length < 200; n = tw.nextNode()) {
        for (const m of (n.textContent ?? '').matchAll(/\S+/g)) words.push(...rects(n, m.index!, m.index! + m[0].length));
      }
      // tops within 2px are one line
      const byTop: Box[][] = [];
      for (const w of words) {
        const at = byTop.find((ws) => Math.abs(ws[0].t - w.t) < 2);
        if (at) at.push(w);
        else byTop.push([w]);
      }
      const ls = byTop.map((ws) => ({ box: ws.reduce(union), words: ws })).sort((a, b) => a.box.t - b.box.t);
      if (ls.length) out.push({ kind: 'detail', el, ...style(el), lines: ls });
    }
  }
  return out;
}

/** The grid of a button, from its blocks. Pure: the checks rebuild it the same way. */
export function gridOf(blocks: Block[], bw: number, bh: number, fs: number): Grid {
  const cell = fs / 2;
  const words: Box[] = blocks.flatMap((k) => (k.kind === 'label' ? k.lines.map((l) => l.box) : k.lines.flatMap((l) => l.words)));
  const most = blocks.reduce<Block | null>((m, k) => (!m || k.lines.length > m.lines.length ? k : m), null);
  const ls = most ? most.lines.map((l) => l.box) : [];
  const bands: Band[] = (ls.length ? ls : [{ l: 0, t: 0, r: bw, b: bh }]).map((l, i) => ({
    top: i ? (ls[i - 1].b + l.t) / 2 : 0,
    bottom: i < ls.length - 1 ? (l.b + ls[i + 1].t) / 2 : bh,
    seams: [],
  }));
  for (const band of bands) {
    const here = words.filter((w) => Math.min(w.b, band.bottom) - Math.max(w.t, band.top) > 2);
    for (let k = 0; k * cell < bw - 0.5; k++) {
      const x = k * cell;
      if (k === 0 || !here.some((w) => w.l < x - 0.5 && w.r > x + 0.5)) band.seams.push(x);
    }
    band.seams.push(bw);
  }
  const seams = bands[0].seams.filter((x) => bands.every((band) => band.seams.includes(x)));
  return { cell, bw, bh, blocks, words, bands, seams };
}

/** This hover's grid, measured the first time an effect asks for it. */
export function textGrid(h: Hot): Grid {
  let g = grids.get(h);
  if (!g) {
    g = gridOf(measureBlocks(h.b), h.geo.bw, h.geo.bh, h.geo.fs);
    grids.set(h, g);
  }
  return g;
}

/** The band a height falls in. */
export const bandAt = (g: Grid, y: number): number => {
  const i = g.bands.findIndex((b) => y < b.bottom);
  return i < 0 ? g.bands.length - 1 : i;
};
/** The nearest seam at or left of x. */
export const atOrLeft = (seams: number[], x: number): number => {
  let s = seams[0];
  for (const v of seams) if (v <= x + 0.01) s = v;
  return s;
};
/** The nearest seam at or right of x. */
export const atOrRight = (seams: number[], x: number): number => seams.find((v) => v >= x - 0.01) ?? seams[seams.length - 1];
/** Seams thinned to stops at least `gap` px apart, from the left; the right edge always stays. */
export function thin(seams: number[], gap: number): number[] {
  const out = [seams[0]];
  for (const s of seams) if (s - out[out.length - 1] >= gap - 0.01) out.push(s);
  const end = seams[seams.length - 1];
  if (out[out.length - 1] !== end) {
    if (out.length > 1 && end - out[out.length - 1] < gap) out[out.length - 1] = end;
    else out.push(end);
  }
  return out;
}

/* ------------------------------------------------------- the seeded stream */

interface Stream {
  v: number;
  rng: () => number;
  last: Map<string, string>;
}
const streams = new WeakMap<HTMLElement, Stream>();

/** The button's own stream: the visit's seed and its address. `window.__ink.seed(n)` starts it over. */
export function streamOf(b: HTMLElement): Stream {
  const base = inkBase();
  let s = streams.get(b);
  if (!s || s.v !== base.v) {
    s = { v: base.v, rng: mulberry(base.seed ^ hashSeed(b.getAttribute('href') ?? b.textContent ?? '')), last: new Map() };
    streams.set(b, s);
  }
  return s;
}

/** One of `options`, from the button's stream, never the one it chose last time for `what`. */
export function choose<T>(b: HTMLElement, what: string, options: readonly T[], key: (o: T) => string): T {
  const s = streamOf(b);
  const last = s.last.get(what);
  const pool = options.length > 1 ? options.filter((o) => key(o) !== last) : options;
  const pick = pool[Math.floor(s.rng() * pool.length)];
  s.last.set(what, key(pick));
  return pick;
}
