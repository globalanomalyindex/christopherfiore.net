/**
 * paintings. Grouped by year, newest first, with the eight that carry no
 * year under "undated". Inside a year the works keep the data file's order.
 * Each tile is a tinted cell: the whole painting, uncropped, and its name as
 * the button. No captions: only the titles stay.
 */

import { h } from '../html.ts';
import { TALLY } from '../palette.ts';
import { ARTSTATION_HREF, PAINTINGS } from '../data/paintings.ts';
import type { PaintingRecord } from '../data/types.ts';
import { PAINTINGS_TOTAL, cellBtn, lede, pagesBlock, row, rows, section, subpage } from '../prose.ts';

/*
  The "also" row says "twenty" in words. If the collection changes size it
  would quietly start lying, so the build refuses instead.
*/
if (PAINTINGS.length !== 20) {
  throw new Error(`paintings: the copy says twenty works and the data has ${PAINTINGS.length}`);
}

export const PAINTINGS_PAGE = {
  title: 'paintings',
  lede: 'concept art and illustration: photobash, blender, substance.',
} as const;

const YEARS: [year: string | null, hue: string][] = [
  ['2025', TALLY.cyan],
  ['2024', TALLY.pink],
  ['2023', TALLY.lime],
  [null, TALLY.violet],
];

const placed = new Set(YEARS.map(([y]) => y));
for (const p of PAINTINGS) {
  if (!placed.has(p.year)) throw new Error(`paintings: no group for the year ${p.year}`);
}

const tile = (p: PaintingRecord, eager: boolean) =>
  h(
    'li',
    { class: 'tile' },
    h('img', {
      src: `/${p.image}`,
      alt: p.alt,
      width: p.width,
      height: p.height,
      loading: eager ? 'eager' : 'lazy',
      decoding: 'async',
    }),
    cellBtn(p.wall, p.href, { newTab: true }),
  );

export function paintings() {
  return subpage(
    'paintings',
    PAINTINGS_PAGE.title,
    TALLY.cyan,
    PAINTINGS_TOTAL,
    lede(PAINTINGS_PAGE.lede),
    ...YEARS.map(([year, hue], gi) => {
      const items = PAINTINGS.filter((p) => p.year === year);
      return section(
        year ?? 'undated',
        hue,
        { count: String(items.length), cls: 'group' },
        // The first row of the first year is on screen at load; the rest can wait.
        h('ul', { class: 'grid' }, ...items.map((p, i) => tile(p, gi === 0 && i < 3))),
      );
    }),
    section('also', TALLY.grey, {}, rows(row('+artstation', ARTSTATION_HREF, 'all twenty are on artstation', { newTab: true }))),
    pagesBlock('paintings'),
  );
}
