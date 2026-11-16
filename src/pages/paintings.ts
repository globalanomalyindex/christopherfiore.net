/**
 * paintings. Grouped by year, newest first, with the eight that carry no
 * year under "undated". Inside a year the works keep the data file's order.
 * Each tile is a tinted cell: the whole painting, uncropped, its name as the
 * button, and its note under it.
 */

import { h } from '../html.ts';
import { TALLY } from '../palette.ts';
import { ARTSTATION_HREF, PAINTINGS } from '../data/paintings.ts';
import type { PaintingRecord } from '../data/types.ts';
import { PAINTINGS_LABEL, cellBtn, fig, lede, pagesBlock, row, rows, section, subpage, sum } from '../prose.ts';

/*
  The lede and the "also" row both say "twenty" in words. If the collection
  changes size they would quietly start lying, so the build refuses instead.
*/
if (PAINTINGS.length !== 20) {
  throw new Error(`paintings: the copy says twenty works and the data has ${PAINTINGS.length}`);
}

export const PAINTINGS_PAGE = {
  title: 'paintings',
  lede: 'twenty works, 2023 to 2025. concept art and illustration: photobash, blender, substance.',
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
    p.note ? h('span', { class: 'note' }, p.note) : null,
  );

export function paintings() {
  return subpage(
    'paintings',
    PAINTINGS_PAGE.title,
    TALLY.cyan,
    fig(PAINTINGS_LABEL),
    lede(PAINTINGS_PAGE.lede),
    sum('grouped by year, newest first. a name with a + opens the work on artstation.'),
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
