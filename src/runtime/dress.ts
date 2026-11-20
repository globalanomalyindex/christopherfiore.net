/**
 * The dress: what every pointer hover draws after the glitch (round 4, Fable's
 * direction, his note "more randomizations ... a size change of the button and
 * it's encapsulated by a wireframe and it follows your cursor ... and what i
 * coded with Chickpea").
 *
 * Every hover still starts with the glitch on its 50ms drawings. At the same
 * 220ms dwell as the lineage deck, so a sweep across the menu never sets it
 * off, each button deals from decks of its own, shuffled from the visit's seed and the button's address
 * (`hashSeed`, from Chickpea), dealt without replacement, and a fresh shuffle
 * never starts with the card just played:
 *
 *   SHAPE  the band's own box morphs after the cursor and always holds the
 *          whole label (his note: "morph to follow the cursor, and
 *          accommodate the text always ... a glitchy structured type of
 *          thing"). Every target snaps to a structure, the mono cell or
 *          Chickpea's ratio canon, and a spring (380, 0.78) carries the band
 *          between, so it moves in steps but never jumps. Rows: Full; Reach
 *          (the free edge follows the cursor, a cell at a time); Ratio (the
 *          free edge sits on the canon ratio nearest the cursor: ½, 1/φ, ⅔);
 *          Tall (it grows over the next row on the cursor's side, 6px on home,
 *          3px into a page's gaps). Small buttons: Full, Outset 3px, Inset
 *          3px, Lean (3px out on the cursor's side). The button's box, the
 *          label and every neighbour stay exactly where they are.
 *   DRESS  plain 2, wire 2, Cut 1, Cut and wire 1.
 *          WIRE: a skeleton in Chickpea's measure ink around the shape. Each
 *          block of type stands in a flat ledger cell, a paler step of the
 *          band's own colour (cells.ts), and a solid X joins the corners of
 *          each blank stretch of the band between them, a "+" on each of its
 *          corners. The X never runs behind a letter.
 *          It re-fits ahead of the band (520, 0.9), the side nearest the
 *          cursor leans out up to 8px (420, 0.82), a dashed guide sits on the
 *          cursor in the same frame, and a chip beside it gives the shape's
 *          size, with the canon ratio's name (Chickpea's `ratioName`) when the
 *          cursor is within 1px of one.
 *          CUT: Chickpea's own `composeGrid` tiles the shape around the label
 *          and the figure, so the label keeps one whole cell and no cut
 *          crosses any text. The cells fill on drawings from the cursor's cell
 *          outward, in Chickpea's palette (`generatePaletteOklch`), or in
 *          steps of the page colour on a menu row. Credit: "from chickpea".
 *
 *   TRUE   whenever the band is not the button's own size, a third deck
 *          keeps the true box in view, quietly, in the site's own marks:
 *          Plus (the site's "+" at each true corner), Rule (ledger rules on
 *          the true top and bottom), Ticks (a ruler of mono cells under the
 *          true bottom edge), Wash (the true box in a pale step of the band's
 *          colour, under it, for a band that shrinks), Dots (a dotted
 *          outline: the plain one). They never touch the label.
 *
 * Nothing drawn here crosses the type: the X lives only in the blanks, and
 * the guide shows only there.
 *
 * THE ORDER (Emil: one thing at a time, never everything in one drawing):
 * the shape begins to move and the wire's frame fades in (150ms); the cells
 * are ink, so they land on the band's own 50ms drawings, 70% then whole, from
 * the band edge nearer each, the one nearest the cursor first and the next a
 * drawing later; at 100ms the X, its crosses, the guide and the chip fade in
 * (120ms); the true-size mark comes in at 120ms; Chickpea's cells from 0ms,
 * a drawing apart. The frame clock stops as soon as the springs settle; a
 * pointer move starts it again. Back on the same button within 250ms of
 * leaving, it picks up the same cards rather than dealing new ones.
 *
 * A hover the lineage deck deals an effect to stays Full and plain, so the
 * effect starts from the settled glitch. Keyboard, touch and reduced motion
 * never deal. Leaving: the shape holds while the band takes its one drawing
 * out; the cells go with the strips, in one frame; the wire fades in 90ms.
 *
 * LEGIBILITY. The label is always band ink (#1A1820) and every surface it can
 * touch holds band ink at 4.5:1 or better: every band colour does; a text
 * cell is the band 55% of the way to the ground, 8.7:1 at worst; a Cut cell
 * that touches text is lifted to OKLCH L 0.74; a strip whose edge would run
 * through the label is dropped, and so is the outline there.
 */

import { hotNow, setDress, type Dress, type DressFrame, type Hot } from './buttons.ts';
import { DARK_INK, mix } from './band.ts';
import { blocks, gaps, layout, own, xs, type Blank, type Lay, type TCell } from './cells.ts';
import { inkBase, mulberry, step2 } from './ink.ts';
import { spring } from './jx.ts';
import { creditFor, creditOff } from './lineage.ts';
import { hashSeed } from '../vendor/chickpea/grid/prng.ts';
import { composeGrid, type CompBox } from '../vendor/chickpea/grid/compose.ts';
import { snapToRatio, ratioName } from '../vendor/chickpea/grid/ratios.ts';
import { generatePaletteOklch } from '../vendor/chickpea/palette/engine.ts';
import { gamutMapToRgb, maxChroma, rgbToOklch, type Oklch } from '../vendor/chickpea/palette/oklch.ts';
import { luminance, rgbToHex } from '../vendor/chickpea/palette/hsl.ts';

declare global {
  interface Window {
    __dress?: { force(o: { shape?: string; dress?: string; true?: string } | null): void; state(el: Element): unknown };
    __dressQuiet?: boolean;
  }
}

const ROW_SHAPES = ['full', 'reach', 'ratio', 'tall'];
const SMALL_SHAPES = ['full', 'outset', 'inset', 'lean'];
const DRESSES = ['plain', 'plain', 'wire', 'wire', 'cut', 'cutwire'];
const TRUES = ['plus', 'rule', 'ticks', 'wash', 'dots'];
const GROUND = '#F3F5F8';
/** Shape spring and wire springs: [stiffness, damping ratio]. */
const SHAPE_K: [number, number] = [380, 0.78];
const REFIT_K: [number, number] = [520, 0.9];
const LEAN_K: [number, number] = [420, 0.82];
const LEAN = 8;
const WIRE_OUT = 4;

/**
 * Where a free edge may stop (his note: "any effect bands need to be random
 * but always aligned with text"). `cells` are the cells of the blocks of
 * type, sorted, overlapping ones joined; `min` is the right side of the
 * label's. A free edge never stops strictly inside a cell: it goes to that
 * cell's nearer side, so the band holds a block of type whole or not at all.
 */
interface Stops {
  cells: [number, number][];
  min: number;
  /** the button's width to the fraction of a pixel (its offsetWidth is rounded), so an edge on the mono cell lands on it */
  bw: number;
}

function stopAt(R: number, st: Stops): number {
  let r = R;
  for (const [a, b] of st.cells) {
    if (r > a + 0.01 && r < b - 0.01) {
      r = r - a < b - r ? a : b;
      break;
    }
  }
  return Math.min(st.bw, Math.max(st.min, r));
}

/** A box's layout width, unrounded. */
function widthOf(b: HTMLElement): number {
  const cs = getComputedStyle(b);
  const w = parseFloat(cs.width);
  if (!w) return b.offsetWidth;
  const px = (v: string) => parseFloat(v) || 0;
  return cs.boxSizing === 'border-box' ? w : w + px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth);
}

type Ins = [number, number, number, number]; // top, right, bottom, left, px; negative overhangs

interface Bag {
  v: number;
  rng: () => number;
  shapes: string[];
  sp: number;
  dresses: string[];
  dp: number;
  trues: string[];
  tp: number;
  lastShape: string;
  lastDress: string;
  lastTrue: string;
  /** when the pointer last left, and what that hover was dealt: a quick return keeps it */
  lastLeave: number;
  lastPick: { shape: string; dress: string; true: string | null } | null;
}

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  at: number;
}

interface Dr {
  shape: string;
  wire: boolean;
  cut: boolean;
  T: Ins;
  S: Ins;
  V: Ins;
  W: Ins;
  WV: Ins;
  lean: Ins;
  LV: Ins;
  start: number;
  last: number;
  /** the hover's time at the last frame drawn, ms */
  t: number;
  clipX: boolean;
  /** where a free edge may stop */
  stops: Stops;
  dropTop: boolean;
  dropBottom: boolean;
  outline: boolean;
  cells: Cell[] | null;
  /** the wire's cells and blanks, laid out once at the deal; null: no 3em blank, so neither */
  lay: Lay | null;
  /** the text cells are drawn here (not on a Cut, whose text columns are the cells) */
  drawCells: boolean;
  /** each text cell's drawing: when it starts (ms after the deal) and the band edge it grows from */
  cellAt: number[];
  cellFrom: ('l' | 'r')[];
  fill: string;
  labR: number;
  figL: number;
  /** the width the Cut was laid out for */
  cutW: number;
  /** the text boxes nothing may cross, button coordinates, padded */
  texts: CompBox[];
  /** the Cut's credit has been shown */
  credited: boolean;
  /** the wire's last drawn geometry, so an unmoved frame writes nothing */
  wkey: string;
  /** the true-size mark, and its layer */
  trueMark: string | null;
  trueEl: HTMLSpanElement | null;
  el: HTMLSpanElement | null;
  /** the guide is hidden while the cursor is over a cell */
  guideOff: boolean;
  chipText: string;
  chipW: number;
  out: number | null;
}

const bags = new WeakMap<HTMLElement, Bag>();
const state = new WeakMap<Hot, Dr>();
let forced: { shape?: string; dress?: string; true?: string } | null = null;

const quiet = () => !!(window.__linQuiet || window.__dressQuiet);
const wide = (h: Hot) => h.geo.bw > 480;

/** The button's own decks, seeded from the visit and its address. */
function bagOf(b: HTMLElement): Bag {
  const base = inkBase();
  let g = bags.get(b);
  if (!g || g.v !== base.v) {
    const key = b.getAttribute('href') ?? b.textContent ?? '';
    g = { v: base.v, rng: mulberry(base.seed ^ hashSeed(key)), shapes: [], sp: 0, dresses: [], dp: 0, trues: [], tp: 0, lastShape: '', lastDress: '', lastTrue: '', lastLeave: -1e9, lastPick: null };
    bags.set(b, g);
  }
  return g;
}

/** Deal the next card from a bag; a fresh shuffle never starts with the card just played. */
function next(g: Bag, which: 'shape' | 'dress' | 'true', deck: string[]): string {
  const list = which === 'shape' ? g.shapes : which === 'dress' ? g.dresses : g.trues;
  let pos = which === 'shape' ? g.sp : which === 'dress' ? g.dp : g.tp;
  const last = which === 'shape' ? g.lastShape : which === 'dress' ? g.lastDress : g.lastTrue;
  if (pos >= list.length || !list.length) {
    list.length = 0;
    list.push(...deck);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(g.rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    if (list[0] === last) {
      const k = list.findIndex((c) => c !== last);
      if (k > 0) [list[0], list[k]] = [list[k], list[0]];
    }
    pos = 0;
  }
  const c = list[pos++];
  if (which === 'shape') {
    g.sp = pos;
    g.lastShape = c;
  } else if (which === 'dress') {
    g.dp = pos;
    g.lastDress = c;
  } else {
    g.tp = pos;
    g.lastTrue = c;
  }
  return c;
}

/**
 * The shape's insets from the button's own box, for the cursor at (x, y).
 * A free edge stops only between blocks of type and never left of the
 * label's cell (`st`), so the whole label is always on the band and no block
 * of type is ever cut by the band's edge.
 */
function shapeIns(h: Hot, name: string, x: number, y: number, st: Stops): Ins {
  const g = h.geo;
  const bw = g.bw;
  const bh = g.bh;
  const cell = g.fs / 2;
  const inline = h.b.classList.contains('in');
  switch (name) {
    case 'reach': {
      // the free edge follows the cursor a cell at a time, two cells ahead of it
      const R = stopAt(Math.round((x + 2 * cell) / cell) * cell, st);
      return [0, st.bw - R, 0, 0];
    }
    case 'ratio': {
      // the canon ratio nearest the cursor (Chickpea's snapToRatio), on the nearest mono-cell column
      const R = stopAt(Math.round((snapToRatio(Math.max(0.05, Math.min(0.95, x / st.bw))) * st.bw) / cell) * cell, st);
      return [0, st.bw - R, 0, 0];
    }
    case 'tall': {
      // it grows over the next row on the cursor's side, and a little on the other
      const ov = h.b.closest('.menu') ? 6 : 3;
      const up = y < bh / 2;
      return [-ov * (up ? 1 : 0.34), 0, -ov * (up ? 0.34 : 1), 0];
    }
    case 'outset':
      // a link in a sentence only reaches into the spaces either side of it
      return inline ? [0, -3, 0, -3] : [-3, -3, -3, -3];
    case 'inset':
      return inline ? [0, 0, 0, 0] : [3, 3, 3, 3];
    case 'lean':
      return x < bw / 2 ? [inline ? 0 : -1, 0, inline ? 0 : -1, -3] : [inline ? 0 : -1, -3, inline ? 0 : -1, 0];
  }
  return [0, 0, 0, 0];
}

/** A text box of the button, in its own coordinates: the label word, and the figure or detail. */
function textBoxes(h: Hot): { label: CompBox; fig: CompBox | null } {
  const b = h.b;
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const box = (el: Element | null): CompBox | null => {
    if (!el || !el.textContent?.trim()) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    const t = range.getBoundingClientRect();
    if (!t.width) return null;
    return { x: (t.left - r.left) / sc, y: (t.top - r.top) / sc, w: t.width / sc, h: t.height / sc };
  };
  const g = h.geo;
  // the label is the word and, under it, the tag's own ruled box (not the column it sits in)
  let lab: CompBox = { x: g.wl, y: g.wt, w: g.ww, h: g.wh };
  const tag = b.querySelector('.cs > span');
  if (tag) {
    const t = tag.getBoundingClientRect();
    const tb = { x: (t.left - r.left) / sc, y: (t.top - r.top) / sc, w: t.width / sc, h: t.height / sc };
    const x0 = Math.min(lab.x, tb.x);
    const y0 = Math.min(lab.y, tb.y);
    lab = { x: x0, y: y0, w: Math.max(lab.x + lab.w, tb.x + tb.w) - x0, h: Math.max(lab.y + lab.h, tb.y + tb.h) - y0 };
  }
  return { label: lab, fig: box(b.querySelector('.n, .l')) };
}

const lum = (hex: string) => luminance([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]);
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** A colour lifted until it holds band ink at 4.5:1: OKLCH L raised, hue kept, chroma kept in gamut. */
function legible(c: Oklch, floor: number): string {
  let L = Math.max(c.L, floor);
  for (let i = 0; i < 12; i++) {
    const hex = rgbToHex(gamutMapToRgb({ L, C: Math.min(c.C, maxChroma(L, c.H)), H: c.H }));
    if (contrast(hex, DARK_INK) >= 4.5) return hex;
    L = Math.min(0.98, L + 0.03);
  }
  return GROUND;
}

/** Chickpea's Cut: the shape tiled around the text, cells in Chickpea's palette (or the page colour's steps). */
function cutCells(h: Hot, T: Ins, seed: number): Cell[] {
  const g = h.geo;
  const W = g.bw - T[1] - T[3];
  const H = g.bh - T[0] - T[2];
  const { label, fig } = textBoxes(h);
  const off = (c: CompBox): CompBox => ({ x: c.x - T[3], y: c.y - T[0], w: c.w, h: c.h });
  const comps = [off(label), ...(fig ? [off(fig)] : [])];
  const grid = composeGrid(seed, comps, W, H);
  const cols = [0, ...grid.guides.filter((q) => q.axis === 'v').map((q) => q.pos).sort((a, b) => a - b), 1];
  // Short rows take no horizontal cuts, and a column that holds any text stays whole.
  // Each cut Chickpea proposes moves to the nearest boundary between two lines of the
  // row's tallest block of type, so the Cut's rows follow the lines: one line, no cuts.
  const lines = H < 80 ? [] : gaps(h.b);
  const rows: number[] = [];
  for (const q of grid.guides) {
    if (q.axis !== 'h' || !lines.length) continue;
    const y = q.pos * H + T[0];
    const at = (lines.reduce((b, l) => (Math.abs(l - y) < Math.abs(b - y) ? l : b)) - T[0]) / H;
    if (at > 0 && at < 1 && !rows.some((v) => Math.abs(v - at) * H < 0.5)) rows.push(at);
  }
  rows.sort((a, b) => a - b);
  const holds = (x0: number, x1: number) => comps.some((c) => c.x / W < x1 - 1e-6 && (c.x + c.w) / W > x0 + 1e-6);
  const mods: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < cols.length - 1; i++) {
    const [x0, x1] = [cols[i], cols[i + 1]];
    const ys = holds(x0, x1) ? [0, 1] : [0, ...rows, 1];
    for (let j = 0; j < ys.length - 1; j++) mods.push({ x: x0, y: ys[j], w: x1 - x0, h: ys[j + 1] - ys[j] });
  }
  // the colours: Chickpea's engine, or steps of the page colour on a menu row
  const hue = h.b.getAttribute('data-hue');
  let pal: Oklch[];
  if (hue) {
    const base = rgbToOklch([1, 3, 5].map((i) => parseInt(hue.slice(i, i + 2), 16)) as [number, number, number]);
    const steps = [0, 0.07, -0.05, 0.12, -0.09, 0.04];
    pal = mods.map((_, i) => ({ L: Math.max(0.05, Math.min(0.97, base.L + steps[i % steps.length])), C: base.C, H: base.H }));
  } else pal = generatePaletteOklch(seed, Math.max(2, mods.length));
  const touches = (m: (typeof mods)[number]) =>
    comps.some((c) => {
      const p = 4;
      return c.x - p < (m.x + m.w) * W && c.x + c.w + p > m.x * W && c.y - p < (m.y + m.h) * H && c.y + c.h + p > m.y * H;
    });
  // they fill on drawings from the cursor's cell outward, all in by 350ms
  const px = (h.px - T[3]) / W;
  const order = mods.map((m, i) => ({ i, d: Math.abs(m.x + m.w / 2 - px) })).sort((a, b) => a.d - b.d);
  const rank = new Map(order.map((o, k) => [o.i, Math.min(4, k)]));
  return mods.map((m, i) => {
    const c = pal[i % pal.length];
    // never near black: a cell clear of text keeps at least OKLCH L 0.52; one by text, 0.74
    const L = Math.max(0.52, c.L);
    const color = touches(m) ? legible(c, 0.74) : rgbToHex(gamutMapToRgb({ L, C: Math.min(c.C, maxChroma(L, c.H)), H: c.H }));
    return { ...m, color, at: 50 * rank.get(i)! };
  });
}

/**
 * A Cut with the wire: no new cells. The Cut's text columns are the cells,
 * and each run of text-free columns 3em or wider is a blank with its X.
 */
function cutLay(h: Hot, cells: Cell[], T: Ins, W0: number, texts: CompBox[]): Lay | null {
  const fs = h.geo.fs;
  const sl = T[3];
  const cols = [...new Map(cells.map((c) => [c.x.toFixed(4), c])).values()].sort((p, q) => p.x - q.x);
  const holds = (c: Cell) => texts.some((q) => q.x < sl + (c.x + c.w) * W0 && q.x + q.w > sl + c.x * W0);
  const tc: TCell[] = [];
  const blanks: Blank[] = [];
  let run: [number, number] | null = null;
  const flush = (end: boolean) => {
    if (!run) return;
    const [a, b] = run;
    if (b - a >= 3 * fs) blanks.push({ a: a <= sl + 0.5 ? 'L' : a, b: end ? 'R' : b });
    else tc.push({ x0: a, x1: b, toL: a <= sl + 0.5, toR: end });
    run = null;
  };
  cols.forEach((c, i) => {
    const x0 = sl + c.x * W0;
    const x1 = sl + (c.x + c.w) * W0;
    const end = i === cols.length - 1;
    if (holds(c)) {
      flush(false);
      tc.push({ x0, x1, toL: i === 0, toR: end });
    } else {
      run = run ? [run[0], x1] : [x0, x1];
      if (end) flush(true);
    }
  });
  return blanks.length ? { cells: tc, blanks } : null;
}

function deal(h: Hot, t: number): void {
  if (quiet() && !forced) return;
  const small = !wide(h);
  const g = bagOf(h.b);
  // back within 250ms of leaving: the same hover, not a new card
  const again = !forced && g.lastPick && performance.now() - g.lastLeave < 250 ? g.lastPick : null;
  let shape = again ? again.shape : next(g, 'shape', small ? SMALL_SHAPES : ROW_SHAPES);
  let dress = again ? again.dress : next(g, 'dress', DRESSES);
  if (forced?.shape) shape = forced.shape;
  if (forced?.dress) dress = forced.dress;
  // a link in a sentence is measured by the seams already; a small button has no room for a Cut
  const inline = h.b.classList.contains('in');
  let wire = dress === 'wire' || dress === 'cutwire';
  let cut = dress === 'cut' || dress === 'cutwire';
  if (inline) wire = false;
  if (small) cut = false;
  const { label, fig } = textBoxes(h);
  const bw = h.geo.bw;
  const labR = Math.min(bw, label.x + label.w + h.geo.fs / 2);
  const bl = blocks(h.b, !!h.P.m);
  // the wire's cells (not on a Cut, whose text columns are its cells), laid out once over
  // the button's whole width: a band that moves later only clips them
  const wireLay = wire && !cut ? layout(bl, 0, bw, h.geo.fs) : null;
  // where a free edge may stop: the blocks' own cells and, with the wire, the wire's cells
  const spans = [
    ...own(bl, h.geo.fs).map((c): [number, number] => [Math.max(0, c.x0), Math.min(bw, c.x1)]),
    ...(wireLay?.cells ?? []).map((c): [number, number] => [c.toL ? 0 : c.x0, c.toR ? bw : c.x1]),
  ]
    .filter(([a, b]) => b > a)
    .sort((p, q) => p[0] - q[0]);
  const joined: [number, number][] = [];
  for (const [a, b] of spans) {
    const last = joined[joined.length - 1];
    if (last && a < last[1] - 0.01) last[1] = Math.max(last[1], b);
    else joined.push([a, b]);
  }
  // the label's own cell, and whatever it overlaps: the band always holds it whole
  const labCell = bl.length && !bl[0].fig ? own(bl.slice(0, 1), h.geo.fs)[0] : null;
  const home = labCell ? joined.find(([a, b]) => labCell.x0 < b && labCell.x1 > a) : null;
  const stops: Stops = { cells: joined, min: home ? home[1] : labR, bw: widthOf(h.b) };
  const T = shapeIns(h, shape, h.px, h.py, stops);
  const top = h.geo.bh - T[2];
  const clipX = h.b.matches('a.row, .hrow, .cell');
  const texts = [label, ...(fig ? [fig] : [])].map((c) => ({ x: c.x - 0.25 * h.geo.fs, y: c.y - 0.1 * h.geo.fs, w: c.w + 0.5 * h.geo.fs, h: c.h + 0.2 * h.geo.fs }));
  const cells = cut ? cutCells(h, T, g.rng() * 2 ** 31 >>> 0) : null;
  const lay = !wire ? null : cells ? cutLay(h, cells, T, bw - T[1] - T[3], texts) : wireLay;
  // each cell lands from the band edge nearer it; the one nearest the cursor first, the next a drawing later
  const L0 = T[3];
  const R0 = h.geo.bw - T[1];
  const tcs = lay && !cells ? lay.cells : [];
  const dist = (c: TCell) => (h.px < c.x0 ? c.x0 - h.px : h.px > c.x1 ? h.px - c.x1 : 0);
  const order = tcs.map((c, i) => ({ i, d: dist(c) })).sort((p, q) => p.d - q.d);
  const cellAt: number[] = [];
  order.forEach((o, k) => (cellAt[o.i] = 50 * Math.min(3, k)));
  const dr: Dr = {
    shape,
    wire,
    cut,
    T,
    S: [0, 0, 0, 0],
    V: [0, 0, 0, 0],
    W: [-WIRE_OUT, clipX ? 0.5 : -WIRE_OUT, -WIRE_OUT, clipX ? 0.5 : -WIRE_OUT],
    WV: [0, 0, 0, 0],
    lean: [0, 0, 0, 0],
    LV: [0, 0, 0, 0],
    start: t,
    last: -1,
    t,
    clipX,
    stops,
    // an edge that runs through the label loses its strip and its outline
    dropTop: shape === 'highlighter' || T[0] > label.y + 1,
    dropBottom: shape === 'highlighter' || top < label.y + label.h - 1,
    outline: !(T[0] > label.y + 1 || top < label.y + label.h - 1),
    cells,
    lay,
    drawCells: !cells,
    cellAt,
    cellFrom: tcs.map((c) => (c.toL || (!c.toR && (c.x0 + c.x1) / 2 < (L0 + R0) / 2) ? 'l' : 'r')),
    fill: mix(h.P.main, GROUND, 0.55),
    labR,
    figL: fig ? fig.x : Infinity,
    cutW: h.geo.bw - T[1] - T[3],
    texts,
    credited: false,
    wkey: '',
    trueMark: null,
    trueEl: null,
    el: null,
    guideOff: false,
    chipText: '',
    chipW: 0,
    out: null,
  };
  // the true size, kept in view whenever the band is not the button's own size
  if (again) dr.trueMark = again.true;
  else if (shape !== 'full') {
    let m = next(g, 'true', TRUES);
    // a band that grows covers its own box: a wash under it would never show
    if (m === 'wash' && (shape === 'tall' || shape === 'outset' || shape === 'lean')) m = 'rule';
    if (forced?.true) m = forced.true;
    dr.trueMark = m;
  }
  g.lastPick = { shape, dress, true: dr.trueMark };
  state.set(h, dr);
  h.dr = true;
}

function wireEl(h: Hot, dr: Dr): HTMLSpanElement {
  if (dr.el) return dr.el;
  const el = document.createElement('span');
  el.setAttribute('data-wire', '');
  el.setAttribute('aria-hidden', 'true');
  // one group per blank: its X and the "+" on each of its corners
  const ks = (dr.lay?.blanks ?? []).map(() => '<g class="wk"><path class="wx"/><path class="wt"/></g>').join('');
  el.innerHTML = `<svg class="wf"><rect class="wb"/>${ks}<line class="wg"/></svg><span class="wc"></span>`;
  // over the band and any true-size mark, under the label (a wash lies under the band)
  const after = dr.trueEl && dr.trueMark !== 'wash' ? dr.trueEl : h.host;
  h.b.insertBefore(el, after.nextSibling);
  dr.el = el;
  return el;
}

/** The true size: a quiet mark of the button's own box, in the site's own marks. */
function trueEl(h: Hot, dr: Dr): void {
  if (dr.trueEl || !dr.trueMark) return;
  const g = h.geo;
  const W = g.bw;
  const H = g.bh;
  const el = document.createElement('span');
  el.setAttribute('data-true', dr.trueMark);
  el.setAttribute('aria-hidden', 'true');
  const ink = 'stroke="#1A1820"';
  const measure = 'stroke="#3F5195"';
  let body = '';
  switch (dr.trueMark) {
    case 'plus': {
      // the site's "+" at each true corner; on a row that clips its sides, just inside them
      const ix = dr.clipX ? 5 : 0;
      const arm = 4;
      // the same "+" the wire puts on its X: measure ink, 1px, 4px arms
      body = [[ix, 0], [W - ix, 0], [ix, H], [W - ix, H]].map(([x, y]) => `<path ${measure} stroke-width="1" d="M${x - arm} ${y}H${x + arm}M${x} ${y - arm}V${y + arm}"/>`).join('');
      break;
    }
    case 'rule': {
      const ext = dr.clipX ? 0 : 6;
      body = `<path ${ink} stroke-width="1" d="M${-ext} 0.5H${W + ext}M${-ext} ${H - 0.5}H${W + ext}"/>`;
      break;
    }
    case 'ticks': {
      // a ruler of mono cells just under the true bottom edge, every fourth one long
      const cell = g.fs / 2;
      let d = '';
      for (let x = 0, i = 0; x <= W + 0.1; x += cell, i++) d += `M${x.toFixed(1)} ${H}V${H + (i % 4 === 0 ? 6 : 3)}`;
      body = `<path ${ink} stroke-width="1" d="${d}"/>`;
      break;
    }
    case 'wash':
      body = `<rect x="0" y="0" width="${W}" height="${H}" fill="${washOf(h.P.main)}"/>`;
      break;
    case 'dots':
      body = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" ${ink} stroke-width="1" stroke-dasharray="1 3"/>`;
      break;
  }
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  // a wash lies under the band; every other mark over it, under the label
  h.b.insertBefore(el, dr.trueMark === 'wash' ? h.host : h.host.nextSibling);
  dr.trueEl = el;
}

const washOf = (main: string): string => {
  const c = [1, 3, 5].map((i) => parseInt(main.slice(i, i + 2), 16));
  return `#${c.map((v) => Math.round(v + (243 - v) * 0.8).toString(16).padStart(2, '0')).join('')}`;
};

function step(v: Ins, vel: Ins, target: Ins, dt: number, [k, z]: [number, number]): void {
  for (let i = 0; i < 4; i++) [v[i], vel[i]] = spring(v[i], vel[i], target[i], dt, Math.sqrt(k), z);
}

function frame(h: Hot, t: number, now: number): DressFrame {
  const dr = state.get(h);
  if (!dr) return {};
  const g = h.geo;
  const dt = dr.last < 0 ? 0 : Math.min(0.05, Math.max(0, (now - dr.last) / 1000));
  dr.last = now;
  dr.t = t;
  const live = h.out == null && t >= dr.start;
  const since = t - dr.start;
  if (live) {
    // the target follows the cursor; the spring carries the band to it
    dr.T = shapeIns(h, dr.shape, h.px, h.py, dr.stops);
    step(dr.S, dr.V, dr.T, dt, SHAPE_K);
  }
  // to the half pixel: a sub-pixel write moves nothing anyone can see
  const [st, sr, sb, sl] = dr.S.map((v) => Math.round(v * 2) / 2);
  const out: DressFrame = {
    inset: dr.S.some((v) => Math.abs(v) >= 0.25) ? [st, sr, sb, sl] : null,
    dropTop: dr.dropTop && t >= dr.start,
    dropBottom: dr.dropBottom && t >= dr.start,
    outline: t < dr.start || dr.outline,
  };
  if (dr.cells && h.out == null) {
    const nearPx = (h.px - sl) / Math.max(1, g.bw - sl - sr);
    // the credit when the first cell lands, not before: a quick pass never earns it
    if (!dr.credited && since >= 0) {
      dr.credited = true;
      if (!h.own) creditFor('from chickpea', performance.now());
    }
    out.extra = dr.cells
      .filter((c) => since >= c.at)
      .map((c) => {
        // the cut hairlines: band ink at half strength, full within 150px of the cursor
        const near = Math.min(Math.abs(c.x - nearPx), Math.abs(c.x + c.w - nearPx)) * (g.bw - sl - sr) < 150;
        const a = near ? 1 : 0.5;
        const sh = [c.x > 0 ? `inset 1px 0 0 rgba(26,24,32,${a})` : '', c.y > 0 ? `inset 0 1px 0 rgba(26,24,32,${a})` : ''].filter(Boolean).join(',');
        // columns are fixed in px from the band's left, so the label's own cell
        // stays the label's while the free edge morphs; the last runs to the edge
        const W0 = dr.cutW;
        const last = c.x + c.w > 0.999;
        const horiz = last ? `left:${(c.x * W0).toFixed(1)}px;right:0` : `left:${(c.x * W0).toFixed(1)}px;width:${(c.w * W0).toFixed(1)}px`;
        return { c: 'cc', s: `position:absolute;${horiz};top:${(c.y * 100).toFixed(3)}%;height:${(c.h * 100).toFixed(3)}%;background:${c.color};${sh ? `box-shadow:${sh};` : ''}clip-path:inset(0 0 0 0)` };
      });
  }
  // the true size, once the shape has begun to move
  if (dr.trueMark && since >= 120 && h.out == null && !dr.trueEl) {
    trueEl(h, dr);
    fadeIn(dr.trueEl!, () => dr.out == null);
  }
  // the type's cells: ink, on the band's drawings, 70% then whole, from the band edge nearer each
  if (dr.lay && dr.drawCells && h.out == null && since >= 0) {
    const tc = dr.lay.cells
      .map((c, i) => {
        const p = step2(since - dr.cellAt[i]);
        if (p <= 0) return null;
        // in the band host's own px: a cell at a band edge runs to that edge, wherever the shape has it
        const horiz = c.toL && c.toR ? 'left:0;right:0' : c.toL ? `left:0;width:${Math.max(0, c.x1 - sl).toFixed(1)}px` : c.toR ? `left:${(c.x0 - sl).toFixed(1)}px;right:0` : `left:${(c.x0 - sl).toFixed(1)}px;width:${(c.x1 - c.x0).toFixed(1)}px`;
        // a band-ink rule on each side that faces a blank
        const sh = [c.toL ? '' : `inset 1px 0 0 ${DARK_INK}`, c.toR ? '' : `inset -1px 0 0 ${DARK_INK}`].filter(Boolean).join(',');
        const x = `${(100 * (1 - p)).toFixed(2)}%`;
        const clip = dr.cellFrom[i] === 'l' ? `inset(0% ${x} 0% 0%)` : `inset(0% 0% 0% ${x})`;
        return { c: 'tc', s: `position:absolute;top:0;bottom:0;${horiz};background:${dr.fill};${sh ? `box-shadow:${sh};` : ''}clip-path:${clip}` };
      })
      .filter((l): l is { c: string; s: string } => !!l);
    out.extra = [...(out.extra ?? []), ...tc];
  }
  if (dr.wire && t >= dr.start) {
    drawWire(h, dr, dt);
    // the X, its crosses, the guide and the chip at 100ms, once the first cell is whole
    if (dr.el && !dr.el.classList.contains('x-on') && h.out == null && since >= 100) dr.el.classList.add('x-on');
  }
  return out;
}

/** Fade a freshly inserted layer in: the class goes on the frame after, so its transition runs. */
function fadeIn(el: HTMLElement, still: () => boolean): void {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (el.isConnected && still()) el.classList.add('on');
  }));
}

function drawWire(h: Hot, dr: Dr, dt: number): void {
  const g = h.geo;
  const fresh = !dr.el;
  const el = wireEl(h, dr);
  if (h.out != null) {
    el.classList.remove('on', 'x-on');
    return;
  }
  if (fresh) fadeIn(el, () => dr.out == null);
  // the frame re-fits ahead of the band: the shape's target, 4px outside (inside the row's own sides when it clips them)
  const [tt, tr, tb, tl] = dr.T;
  const target: Ins = [tt - WIRE_OUT, dr.clipX ? Math.max(0.5, tr - WIRE_OUT) : tr - WIRE_OUT, tb - WIRE_OUT, dr.clipX ? Math.max(0.5, tl - WIRE_OUT) : tl - WIRE_OUT];
  step(dr.W, dr.WV, target, dt, REFIT_K);
  // the side nearest the cursor leans out, more the nearer it is; a row that
  // clips its own sides leans only above or below
  const x = h.px;
  const y = h.py;
  const sides = [
    { i: 0, d: Math.abs(y - dr.W[0]), half: g.bh / 2 },
    { i: 2, d: Math.abs(g.bh - dr.W[2] - y), half: g.bh / 2 },
    ...(dr.clipX
      ? []
      : [
          { i: 3, d: Math.abs(x - dr.W[3]), half: g.bw / 2 },
          { i: 1, d: Math.abs(g.bw - dr.W[1] - x), half: g.bw / 2 },
        ]),
  ].sort((a, b) => a.d / a.half - b.d / b.half);
  const want: Ins = [0, 0, 0, 0];
  const n = sides[0];
  want[n.i] = LEAN * Math.max(0, Math.min(1, 1 - n.d / n.half));
  step(dr.lean, dr.LV, want, dt, LEAN_K);
  const [wt, wr, wb, wl] = dr.W.map((v, i) => v - dr.lean[i]) as Ins;
  const w = g.bw - wl - wr;
  const hh = g.bh - wt - wb;
  const gx = Math.max(wl, Math.min(g.bw - wr, x));
  // nothing to write when nothing has moved: the frame, its X and the guide stay as they are
  const key = [wl, wt, w, hh, gx].map((v) => v.toFixed(1)).join(' ');
  if (key === dr.wkey) return;
  dr.wkey = key;
  const svg = el.firstElementChild as SVGSVGElement;
  svg.setAttribute('style', `left:${(wl - 6).toFixed(1)}px;top:${(wt - 6).toFixed(1)}px;width:${(w + 12).toFixed(1)}px;height:${(hh + 12).toFixed(1)}px`);
  const ox = wl - 6;
  const rect = svg.querySelector('.wb')!;
  rect.setAttribute('x', '6.5');
  rect.setAttribute('y', '6.5');
  rect.setAttribute('width', Math.max(0, w - 1).toFixed(1));
  rect.setAttribute('height', Math.max(0, hh - 1).toFixed(1));
  // the frame's top and bottom lines, in the svg's own px
  const Y0 = 6.5;
  const Y1 = 6.5 + hh - 1;
  // an X in each blank, its corners on the frame's top and bottom lines, on
  // the cells' rules or the frame's corners; a "+" on each corner, the same
  // cross the true size uses
  const spans = dr.lay ? xs(dr.lay, wl + 0.5, wl + w - 0.5, g.fs) : [];
  const ks = svg.querySelectorAll<SVGGElement>('.wk');
  spans.forEach((s, i) => {
    const k = ks[i];
    if (!k) return;
    // a cell's edge: on the middle of its 1px rule
    const blank = dr.lay!.blanks[i];
    const a = (blank.a === 'L' ? s.a : s.a - 0.5) - ox;
    const b = (blank.b === 'R' ? s.b : s.b + 0.5) - ox;
    const on = s.op > 0;
    k.setAttribute('opacity', s.op.toFixed(2));
    k.firstElementChild!.setAttribute('d', on ? `M${a.toFixed(1)} ${Y0}L${b.toFixed(1)} ${Y1}M${b.toFixed(1)} ${Y0}L${a.toFixed(1)} ${Y1}` : '');
    k.lastElementChild!.setAttribute('d', on ? [[a, Y0], [b, Y0], [a, Y1], [b, Y1]].map(([cx, cy]) => `M${(cx - 4).toFixed(1)} ${cy}H${(cx + 4).toFixed(1)}M${cx.toFixed(1)} ${cy - 4}V${cy + 4}`).join('') : '');
  });
  // the guide is the cursor's: 1:1, no easing; it shows only in a blank, and
  // over a cell it goes at once, no fade
  const guide = svg.querySelector<SVGLineElement>('.wg')!;
  guide.setAttribute('x1', (gx - ox).toFixed(1));
  guide.setAttribute('x2', (gx - ox).toFixed(1));
  guide.setAttribute('y1', '6');
  guide.setAttribute('y2', (hh + 6).toFixed(1));
  guide.setAttribute('data-x', gx.toFixed(1));
  // with no cells laid out, the type's own padded boxes stand in for them
  const over = dr.lay ? dr.lay.cells.some((c) => (c.toL || gx >= c.x0) && (c.toR || gx <= c.x1)) : dr.texts.some((q) => gx >= q.x && gx <= q.x + q.w);
  if (over !== dr.guideOff) {
    dr.guideOff = over;
    guide.style.visibility = over ? 'hidden' : '';
  }
  // the chip: the shape's size, and the canon ratio's name when the cursor sits on one
  const chip = el.children[1] as HTMLSpanElement;
  const [st, sr, sb, sl] = dr.S;
  const sw = g.bw - sl - sr;
  const sh = g.bh - st - sb;
  const rel = (x - sl) / Math.max(1, sw);
  const r = snapToRatio(rel);
  const named = rel > 0 && rel < 1 && Math.abs(rel - r) * sw <= 1;
  const text = `${Math.round(sw)} × ${Math.round(sh)}${named ? ` · ${ratioName(r)}` : ''}`;
  if (text !== dr.chipText) {
    chip.textContent = text;
    dr.chipText = text;
    dr.chipW = chip.offsetWidth;
  }
  // clear space on the band's midline: in the blank the cursor is in, or the
  // nearest one with room; with no cells, past the label and short of the figure
  let fr: [number, number] | null = null;
  if (dr.lay) {
    const room = spans.filter((s) => s.op >= 1 && s.b - s.a - 12 >= dr.chipW);
    room.sort((p, q) => Math.max(0, p.a - gx, gx - p.b) - Math.max(0, q.a - gx, gx - q.b));
    if (room[0]) fr = [room[0].a + 6, room[0].b - 6];
  } else {
    fr = [dr.labR + 6, Math.min(g.bw - sr - 10, dr.figL - 10)];
    if (fr[1] - fr[0] < dr.chipW + 8) fr = null;
  }
  if (!fr) {
    if (chip.style.visibility !== 'hidden') chip.style.visibility = 'hidden';
    return;
  }
  if (chip.style.visibility) chip.style.visibility = '';
  const cx = Math.max(fr[0], Math.min(fr[1] - dr.chipW, gx + 8));
  const cs = `transform:translate(${cx.toFixed(1)}px,${(st + sh / 2).toFixed(1)}px) translateY(-50%)`;
  if (chip.getAttribute('style') !== cs) chip.setAttribute('style', cs);
}

function leave(h: Hot, now: number): void {
  const dr = state.get(h);
  if (!dr) return;
  dr.out = now;
  dr.el?.classList.remove('on', 'x-on');
  dr.trueEl?.classList.remove('on');
  if (dr.cut && dr.credited && !h.own) creditOff(now, h.t0);
  bagOf(h.b).lastLeave = performance.now();
}

function cut(h: Hot): void {
  const dr = state.get(h);
  dr?.el?.remove();
  dr?.trueEl?.remove();
  state.delete(h);
}

/**
 * Still moving: a spring settling, or a step of the order still to come.
 * Otherwise the clock stops; a pointer move starts it again.
 */
function live(h: Hot, now: number): boolean {
  const dr = state.get(h);
  if (!dr) return false;
  const unsettled = (v: Ins, vel: Ins, target?: Ins) => v.some((x, i) => Math.abs(x - (target ? target[i] : x)) > 0.5) || vel.some((x) => Math.abs(x) > 2);
  const springs = unsettled(dr.S, dr.V, dr.T) || (dr.wire && (unsettled(dr.W, dr.WV) || unsettled(dr.lean, dr.LV)));
  return springs || now - h.t0 < dr.start + 650;
}

const api: Dress = { deal, frame, leave, cut, live };
setDress(api);

window.__dress = {
  force(o) {
    forced = o;
  },
  state(el) {
    const h = hotNow().find((x) => x.b === el);
    const dr = h && state.get(h);
    return dr ? { shape: dr.shape, wire: dr.wire, cut: dr.cut, true: dr.trueMark, T: dr.T, S: dr.S, V: dr.V, lean: dr.lean, cells: dr.cells?.map((c) => c.color) ?? null, chip: dr.chipText, lay: dr.lay, fill: dr.fill, cutGeo: dr.cells?.map((c) => [c.x, c.w, c.y, c.h]) ?? null, cutW: dr.cutW, texts: dr.texts, start: dr.start, t: dr.t, stops: dr.stops } : null;
  },
};
