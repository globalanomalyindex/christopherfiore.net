/**
 * Tricode, from mfny concentrates: MFNY's type filter pill
 * (public/mfny/concentrates.html), opened and laid flat across the band.
 *
 * The row is one link, so nothing inside it answers the pointer. One hover is
 * one opening and one selection, never a hover state inside the hover: MFNY's
 * own spec stops decorative motion under an active cursor ("The cycle stops
 * per card on hover or focus").
 *
 *   seams    two, from the text grid's top-level seams (clear on every line),
 *            each segment at least 3em wide, 2em or 1em only when a row has no
 *            room. MFNY's pill sizes each segment by the text it holds
 *            (segmentOpen), so the segments are sized by the text, never
 *            thirds. The pair comes from the button's own stream and is never
 *            the one it had last time.
 *   colours  MFNY's fills in TRI_ORDER (Indica, Hybrid, Sativa), mixed over the
 *            pill's white surface: the selected segment at opacity 1, the
 *            others at the pill's open opacity, 0.6. The pill's divider on the
 *            second and third. Flat rectangles, edge to edge.
 *   selected the segment that held the pointer at the dwell, decided once, like
 *            the band coming in from the edge you crossed
 *   timing   ms after the rest, on the band's drawings: 0 the first segment
 *            lands whole at its seam, 50 the second, 100 the third, 150 the
 *            selected one steps up. A segment is only ever whole, so no
 *            drawing cuts a word.
 *
 * It reads the pointer once, at the dwell, so it needs no follow. (An effect
 * that reads the live pointer after its last drawing must return follow: true,
 * or it stops answering when the clock stops 900ms after the dwell.)
 */

import type { Hot, Look } from '../buttons.ts';
import { choose, textGrid } from './textgrid.ts';

/** TYPE_STYLE's fills over the pill's white: lit at 1, idle at the open pill's 0.6. Sativa lit, the lowest, holds band ink at 5.7:1. */
const TRI = [
  { lit: '#8CA7DA', idle: '#BACAE9' },
  { lit: '#F1CC54', idle: '#F7E098' },
  { lit: '#FF5A52', idle: '#FF9C97' },
];
/** The pill's divider on its second and third segments, verbatim. */
const TRI_RULE = 'inset 1.5px 0 0 0 rgba(255,255,255,0.9)';

const tris = new WeakMap<Hot, { xs: number[]; on: number }>();

function triOf(h: Hot): { xs: number[]; on: number } {
  let tr = tris.get(h);
  if (tr) return tr;
  const g = textGrid(h);
  const S = g.seams;
  let pairs: [number, number][] = [];
  for (const min of [6, 4, 2]) {
    const m = min * g.cell - 0.01;
    for (let i = 0; i < S.length; i++)
      for (let j = i + 1; j < S.length; j++) if (S[i] >= m && S[j] - S[i] >= m && g.bw - S[j] >= m) pairs.push([S[i], S[j]]);
    if (pairs.length) break;
  }
  const [s1, s2] = pairs.length ? choose(h.b, 'tricode', pairs, (p) => p.join(',')) : [g.bw, g.bw];
  const xs = [0, s1, s2, g.bw];
  // under reduced motion there is no dwell: where the pointer came in
  const x = h.px0 ?? h.px;
  tr = { xs, on: x < s1 ? 0 : x < s2 ? 1 : 2 };
  tris.set(h, tr);
  return tr;
}

export function tricodeLook(h: Hot, t: number): Look {
  const { xs, on } = triOf(h);
  const n = t < 50 ? 1 : t < 100 ? 2 : 3;
  const extra = TRI.slice(0, n).map((c, i) => ({
    c: 'tri',
    s: `position:absolute;top:0;bottom:0;left:${xs[i].toFixed(2)}px;width:${(xs[i + 1] - xs[i]).toFixed(2)}px;background:${i === on && t >= 150 ? c.lit : c.idle}${i ? `;box-shadow:${TRI_RULE}` : ''}`,
  }));
  return { extra };
}
