/**
 * Dither, from dither: his browser dithering studio. Its ordered rule, the
 * real one (`src/vendor/dither/ordered.ts`), draws a dithered spot that lives
 * on the text and belongs to the cursor.
 *
 * One canvas in the band host, one canvas pixel per dot, each dot a whole
 * number of CSS px (a 4 by 4 tile is about one mono cell). Each band of the
 * text grid is cut into stops: its clear seams, thinned to at least 4 cells
 * apart, so every interval holds whole words. The interval under the pointer
 * is solid; along its band the next ones out are 12, 8 and 4 of 16 dots, then
 * nothing; a band one line away gets 8 of 16 under the pointer and 4 beside
 * it. Level = max(0, 4(n + 1) - 4dx - 8dy) / 16, dx the interval distance and
 * dy the band distance, so a level of k/16 lights exactly k of every 16 dots
 * and the levels nest.
 *
 *   entrance  n = 0, 1, 2, 3 on four drawings 50ms apart: the first lights only
 *             the pointer's interval at 4/16, and a dot once lit stays lit, so
 *             it reads as ink soaking out from the cursor
 *   follow    after that it is the cursor's, 1:1, in the same frame, stepping
 *             by words and lines with no easing. With the pointer still nothing
 *             is drawn and the clock stops
 *   colour    a second colour from the button's own stream over the band
 *             colours, never the band's and never this button's last one;
 *             every one holds band ink at 5:1, so every dot does
 *
 * An effect that reads the live pointer after its last drawing must return
 * follow: true, or it stops answering when the clock stops 900ms after the
 * dwell. That was the freeze.
 */

import { HUES } from '../band.ts';
import type { Hot, Look } from '../buttons.ts';
import { normBayer, orderedOn } from '../../vendor/dither/ordered.ts';
import { bandAt, choose, textGrid, thin } from './textgrid.ts';

const B4 = normBayer(4);

interface Spot {
  /** each band's stops, px */
  stops: number[][];
  /** each band's interval for each dot column */
  cols: Int16Array[];
  /** the band for each dot row */
  rows: Int16Array;
  dot: number;
  rgba: number;
  key: string;
  draws: number;
  cv: HTMLCanvasElement | null;
}
const spots = new WeakMap<Hot, Spot>();

function spotOf(h: Hot): Spot {
  let s = spots.get(h);
  if (s) return s;
  const g = textGrid(h);
  const dot = Math.max(2, Math.round(g.cell / 4));
  const nx = Math.ceil(g.bw / dot);
  const ny = Math.ceil(g.bh / dot);
  const stops = g.bands.map((b) => thin(b.seams, 4 * g.cell));
  // a dot belongs to the interval and the band its centre falls in
  const cols = stops.map((st) => {
    const a = new Int16Array(nx);
    let j = 0;
    for (let x = 0; x < nx; x++) {
      const cx = (x + 0.5) * dot;
      while (j < st.length - 2 && cx >= st[j + 1]) j++;
      a[x] = j;
    }
    return a;
  });
  const rows = new Int16Array(ny);
  for (let y = 0; y < ny; y++) rows[y] = bandAt(g, (y + 0.5) * dot);
  const hex = choose(h.b, 'dither', HUES.filter((c) => c !== h.P.main), (c) => c);
  const [r, gg, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  s = { stops, cols, rows, dot, rgba: ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0, key: '', draws: 0, cv: null };
  spots.set(h, s);
  return s;
}

/** The interval of `stops` that holds x. */
const intervalAt = (st: number[], x: number): number => {
  let j = 0;
  while (j < st.length - 2 && x >= st[j + 1]) j++;
  return j;
};

function paint(h: Hot, n: number): void {
  const s = spotOf(h);
  const g = textGrid(h);
  const px = Math.max(0, Math.min(g.bw - 0.01, h.px));
  const bi = bandAt(g, Math.max(0, Math.min(g.bh - 0.01, h.py)));
  // the interval under the pointer's x, on every band
  const under = s.stops.map((st) => intervalAt(st, px));
  const key = `${n}|${bi}|${under.join(',')}`;
  let cv = s.cv;
  if (!cv || !cv.isConnected) {
    cv = document.createElement('canvas');
    cv.setAttribute('data-k', 'bay');
    cv.setAttribute('aria-hidden', 'true');
    cv.width = s.cols[0].length;
    cv.height = s.rows.length;
    cv.style.cssText = `position:absolute;left:0;top:0;width:${cv.width * s.dot}px;height:${cv.height * s.dot}px;image-rendering:pixelated;pointer-events:none`;
    h.host.insertBefore(cv, h.host.querySelector(':scope > .bo'));
    s.cv = cv;
    s.key = '';
  }
  // only when the picture changes
  if (key === s.key) return;
  s.key = key;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(cv.width, cv.height);
  const px32 = new Uint32Array(img.data.buffer);
  const top = 4 * (n + 1);
  for (let y = 0; y < cv.height; y++) {
    const b = s.rows[y];
    const dy = Math.abs(b - bi);
    const lead = top - 8 * dy;
    if (lead <= 0) continue;
    const col = s.cols[b];
    const j0 = under[b];
    for (let x = 0; x < cv.width; x++) {
      const k = Math.min(16, lead - 4 * Math.abs(col[x] - j0));
      // dither's own rule: spread 255, threshold 128, on the level scaled to 0..255
      if (k > 0 && orderedOn((k / 16) * 255, B4, x, y, 255, 128)) px32[y * cv.width + x] = s.rgba;
    }
  }
  ctx.putImageData(img, 0, 0);
  cv.dataset.draws = String(++s.draws);
}

export function ditherLook(h: Hot, t: number): Look {
  // reduced motion (a project's own row): the still end frame where the pointer came in
  const n = h.instant ? 3 : Math.min(3, Math.floor(t / 50));
  return { own: (hh) => paint(hh, n), follow: !h.instant };
}

/** Leaving: the canvas goes in the same frame. */
export function ditherCut(h: Hot): void {
  spots.get(h)?.cv?.remove();
  h.host.querySelector(':scope > [data-k="bay"]')?.remove();
  spots.delete(h);
}
