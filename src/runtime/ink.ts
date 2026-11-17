/**
 * Ink: the band and the letter glitch, as pure functions of time.
 *
 * Round 3's motion language is "on drawings" (Fable, after his Scream Canister
 * note "moves on drawings"). Ink never eases and never fades: it moves in
 * held drawings of 50ms, which is 3 frames at 60Hz and 6 at 120Hz, so every
 * hold is even. A hover is planned once on entry, and every frame after that
 * is computed from elapsed time alone, so a leave at any moment cuts it in
 * the same frame, and the checks can freeze it on any drawing.
 *
 *   enter    the band arrives from the edge the pointer crossed: half of it
 *            in the first frame, all of it by 150ms (--step4 as linear() holds)
 *   strips   the accent strip from the left at 50ms, the light one from the
 *            right at 100ms, each in two drawings with a 6px jitter that snaps
 *   letters  4 ticks at 0, 50, 100, 150ms, spreading from where the pointer
 *            entered; one flash colour per hover, the band's dark twin;
 *            exactly one slip; the "..." tail lands whole at 150ms
 *   warm     entered within 150ms of leaving another button (a sweep):
 *            the same glitch in two drawings
 *   exit     strips and outline cut at once; the band leaves toward the edge
 *            the pointer left by, gone at 50ms
 *
 * A MENU ROW (one with its own page colour: the home menu, the pages block)
 * keeps that colour on every hover, so it still says which page it opens,
 * and varies everything else, drawn from the visit's own stream:
 *   span     the top strip runs from the left rule to where the pointer came
 *            in, the bottom strip from there to the right rule, snapped to the
 *            mono cell; coming in from a side, both run the full width
 *   weight   each strip 4, 6 or 8px; the top strip missing one hover in four
 *   figure   one hover in three, never twice running, the figure's own cell
 *            fills in a paler step of the page colour, at 100ms
 *   colour   the strips never take another page's colour
 * and the same row never draws the same hover twice running.
 */

import { DARK_INK, HUES, SPARK_ACCENT, SPARK_LIGHTS, mix, pick, pickNot } from './band.ts';

export type Edge = 'l' | 'r' | 't' | 'b';

/** A small seeded generator (mulberry32): the same seed, the same stream. */
export function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The menu rows' stream: seeded once per visit, from the same note the lineage deck keeps. */
const VISIT = 'ps-lin';
function inkSeed(): number {
  try {
    const v = JSON.parse(sessionStorage.getItem(VISIT) ?? '{}') ?? {};
    if (typeof v.ink === 'number') return v.ink;
    const s = (Math.random() * 2 ** 31) | 0;
    sessionStorage.setItem(VISIT, JSON.stringify({ ...v, ink: s }));
    return s;
  } catch {
    return (Math.random() * 2 ** 31) | 0;
  }
}
let mrng = mulberry(inkSeed() ^ (location.pathname.length * 40503));
const lastMenu = new Map<string, { key: string; fig: boolean }>();

declare global {
  interface Window {
    __ink?: { seed(n: number): void };
  }
}
window.__ink = {
  seed(n) {
    mrng = mulberry(n);
    lastMenu.clear();
  },
};

/** The four page colours, as PAGES in prose.ts has them. A menu row's strips never take one, so a row only ever shows its own. */
export const PAGE_HUES = ['#F5D90A', '#12D9E8', '#FF2D87', '#C9F227'];

/** Where a menu row is, for the hover's draw. px from the button's left edge. */
export interface MenuGeo {
  bw: number;
  /** where the pointer came in */
  px: number;
  /** the mono cell, the snap for the strip ends */
  cell: number;
  /** the figure's cell, [left, right], or null when the row has none that fits */
  fig: [number, number] | null;
}

/** A menu row's hover: strip spans and weights in px, and the figure cell. */
export interface MenuDraw {
  s1: [number, number] | null;
  s2: [number, number];
  h1: number;
  h2: number;
  fig: [number, number] | null;
  figC: string;
}

export interface Plan {
  label: string;
  main: string;
  acc: string;
  lit: string;
  h1: number;
  h2: number;
  /** the band's dark twin: the one flash colour of this hover */
  twin: string;
  chars: string[];
  /** label length, without the "..." tail */
  n: number;
  /** label letters (not spaces), by index */
  letters: number[];
  /** when each letter flips, ms */
  flipAt: Map<number, number>;
  slip: number;
  tailAt: number;
  /** when the glitch has landed */
  done: number;
  edge: Edge;
  warm: boolean;
  /** a menu row's draw, or null for every other button */
  m: MenuDraw | null;
}

const strip = (pools: readonly (readonly string[])[], main: string): string => {
  for (let n = 0; n < 40; n++) {
    const pool = pools[(mrng() * pools.length) | 0];
    const c = pool[(mrng() * pool.length) | 0];
    if (c !== main && !PAGE_HUES.includes(c)) return c;
  }
  return '#3A3742';
};

/** A menu row's hover, from the visit's stream. Never the same as this row's last one. */
function menuDraw(label: string, main: string, edge: Edge, g: MenuGeo, instant: boolean): MenuDraw {
  const prev = lastMenu.get(label);
  const side = instant || edge === 'l' || edge === 'r';
  const at = Math.max(0, Math.min(g.bw, Math.round(g.px / g.cell) * g.cell));
  const W = [4, 6, 8];
  let d: MenuDraw | null = null;
  let key = '';
  for (let n = 0; n < 12; n++) {
    const top = mrng() < 0.25 ? 0 : W[(mrng() * 3) | 0];
    const bot = W[(mrng() * 3) | 0];
    const fig = !!g.fig && !prev?.fig && mrng() < 1 / 3;
    key = `${top}|${bot}|${fig ? 1 : 0}|${side ? 's' : at}`;
    d = {
      s1: top ? (side ? [0, g.bw] : [0, at]) : null,
      s2: side ? [0, g.bw] : [at, g.bw],
      h1: top,
      h2: bot,
      fig: fig ? g.fig : null,
      figC: mix(main, '#F3F5F8', 0.55),
    };
    if (key !== prev?.key) break;
  }
  lastMenu.set(label, { key, fig: !!d!.fig });
  return d!;
}

/** Hover text gets a trailing ellipsis to even out its spacing; never on an address. */
export const tail = (label: string): string => (label.includes('@') ? '' : '...');

let lastHue = '';

/**
 * One hover, planned on entry. `entry` is where across the label the pointer
 * came in, 0 to 1. `menu` is a menu row's geometry: its hover keeps its page
 * colour and draws the rest from the visit's stream.
 */
export function plan(label: string, hue: string | null, edge: Edge, entry: number, warm: boolean, menu: MenuGeo | null = null, instant = false): Plan {
  const main = hue ?? (lastHue = pickNot(HUES, lastHue));
  const m = menu && hue ? menuDraw(label, main, edge, menu, instant) : null;
  const chars = Array.from(label + tail(label));
  const n = Array.from(label).length;
  const letters: number[] = [];
  for (let i = 0; i < n; i++) if (chars[i].trim()) letters.push(i);
  const ticks = warm ? 2 : 4;
  const per = Math.max(1, Math.ceil(letters.length / ticks));
  const at = Math.max(0, Math.min(1, entry)) * n;
  const order = letters.slice().sort((a, b) => Math.abs(a - at) - Math.abs(b - at));
  const flipAt = new Map<number, number>();
  order.forEach((i, r) => flipAt.set(i, Math.floor(r / per) * 50));
  return {
    label,
    main,
    acc: m ? strip(SPARK_ACCENT, main) : pickNot(pick(SPARK_ACCENT), main),
    lit: m ? strip(SPARK_LIGHTS, main) : pickNot(pick(SPARK_LIGHTS), main),
    h1: 2 + Math.random() * 6,
    h2: 2 + Math.random() * 6,
    twin: mix(main, DARK_INK, 0.42),
    chars,
    n,
    letters,
    flipAt,
    slip: !warm && letters.length >= 4 ? order[0] : -1,
    tailAt: warm ? 50 : 150,
    done: warm ? 100 : 200,
    edge,
    warm,
    m,
  };
}

/** --step4: 50, 80, 94, 100% at 0, 50, 100, 150ms. Most of the travel lands in the first drawing. */
export const step4 = (t: number): number => (t < 0 ? 0 : t < 50 ? 0.5 : t < 100 ? 0.8 : t < 150 ? 0.94 : 1);
/** --step2: 70, 100% at 0, 50ms. */
export const step2 = (t: number): number => (t < 0 ? 0 : t < 50 ? 0.7 : 1);

const pct = (v: number[]) => `inset(${v.map((x) => `${x.toFixed(2)}%`).join(' ')})`;
/** The clip that shows `p` of a layer, grown from `edge`. */
const from = (edge: Edge, p: number): number[] => {
  const x = 100 * (1 - p);
  return edge === 'l' ? [0, x, 0, 0] : edge === 'r' ? [0, 0, 0, x] : edge === 't' ? [0, 0, x, 0] : [x, 0, 0, 0];
};

export interface Layer {
  /** class: bm (the band), st t / st b (the strips) */
  c: string;
  s: string;
}

/** The band's layers at time t (ms since entry). out: ms of leaving, or null. */
export function band(P: Plan, t: number, out: number | null, exit: Edge | null, instant: boolean): Layer[] {
  const L: Layer[] = [];
  const pm = instant ? 1 : P.warm ? step2(t) : step4(t);
  if (out != null) {
    const v = instant ? 0 : pm * (1 - step2(t - out));
    if (v > 0) L.push({ c: 'bm', s: `position:absolute;inset:0;background:${P.main};clip-path:${pct(from(exit ?? P.edge, v))}` });
    return L;
  }
  L.push({ c: 'bm', s: `position:absolute;inset:0;background:${P.main};clip-path:${pct(from(P.edge, pm))}` });
  const p1 = instant || P.warm ? 1 : step2(t - 50);
  const p2 = instant || P.warm ? 1 : step2(t - 100);
  const m = P.m;
  if (m) {
    // a menu row: the figure's cell, then strips spanning from the entry, in whole pixels
    if (m.fig && p2 > 0)
      L.push({ c: 'fc', s: `position:absolute;top:0;bottom:0;left:${m.fig[0].toFixed(1)}px;width:${(m.fig[1] - m.fig[0]).toFixed(1)}px;background:${m.figC};box-shadow:inset 1px 0 0 ${DARK_INK};clip-path:${pct(from('r', p2))}` });
    if (m.s1 && p1 > 0)
      L.push({ c: 'st t', s: `position:absolute;top:0;left:${m.s1[0].toFixed(1)}px;width:${(m.s1[1] - m.s1[0]).toFixed(1)}px;height:${m.h1}px;background:${P.acc};clip-path:${pct(from('l', p1))};transform:translateX(${p1 < 1 ? 6 : 0}px)` });
    if (p2 > 0)
      L.push({ c: 'st b', s: `position:absolute;bottom:0;left:${m.s2[0].toFixed(1)}px;width:${(m.s2[1] - m.s2[0]).toFixed(1)}px;height:${m.h2}px;background:${P.lit};clip-path:${pct(from('r', p2))};transform:translateX(${p2 < 1 ? -6 : 0}px)` });
    return L;
  }
  if (p1 > 0)
    L.push({ c: 'st t', s: `position:absolute;left:0;right:0;top:0;height:${P.h1.toFixed(2)}%;background:${P.acc};clip-path:${pct(from('l', p1))};transform:translateX(${p1 < 1 ? 6 : 0}px)` });
  if (p2 > 0)
    L.push({ c: 'st b', s: `position:absolute;left:0;right:0;bottom:0;height:${P.h2.toFixed(2)}%;background:${P.lit};clip-path:${pct(from('r', p2))};transform:translateX(${p2 < 1 ? -6 : 0}px)` });
  return L;
}

/** The glitch face, a step larger than the mono it replaces so its lowercase stands as tall. */
export const ALT = "font-family:'Dessign Maison',Georgia,serif;font-feature-settings:'salt' 1,'ss01' 1;font-size:1.14em;font-weight:400;";

export interface Letter {
  c: string;
  s: string;
}

/** Every character of the label and its tail at time t. */
export function letters(P: Plan, t: number, instant: boolean): Letter[] {
  return P.chars.map((ch, i) => {
    if (!ch.trim()) return { c: ch, s: '' };
    if (instant) return { c: ch, s: ALT };
    if (i >= P.n) return { c: ch, s: t >= P.tailAt ? ALT : 'visibility:hidden;' };
    const f = P.flipAt.get(i) ?? 0;
    if (t < f) return { c: ch, s: '' };
    if (i === P.slip && t >= 100 && t < 150) return { c: ch, s: '' };
    const since = i === P.slip && t >= 150 ? t - 150 : t - f;
    return { c: ch, s: ALT + (since < 50 ? `color:${P.twin};` : '') };
  });
}
