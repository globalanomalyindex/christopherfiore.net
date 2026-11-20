/**
 * paintings. Grouped by year, newest first, with the eight that carry no
 * year under "undated". Inside a year the works keep the data file's order.
 * Each tile is a tinted cell: the whole painting, uncropped, and its name as
 * the button. No captions: only the titles stay.
 */

import { closeSync, existsSync, openSync, readSync } from 'node:fs';
import { TONES } from '../data/painting-tones.ts';
import { h } from '../html.ts';
import { TALLY } from '../palette.ts';
import { ARTSTATION_HREF, PAINTINGS, TILE_WIDTHS, tilePath, webpSize } from '../data/paintings.ts';
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

/*
  Each tile loads a file the size it is really drawn at: the copies from
  scripts/tiles.mjs, with the painting's own file as the largest choice. A
  painting with no copies would quietly load its full file again, so the
  build refuses instead, as it does for the count above.
*/
const PUBLIC = new URL('../../public/', import.meta.url);

/** A file's real pixel size, from its header. */
function sizeOf(path: string): [number, number] {
  const fd = openSync(new URL(path, PUBLIC), 'r');
  try {
    const head = new Uint8Array(32);
    readSync(fd, head, 0, 32, 0);
    return webpSize(head);
  } finally {
    closeSync(fd);
  }
}

/**
 * The width the tile really draws its picture at (site.css). Above 690px
 * tiles are three a row: a tile is 12.3333em wide and the picture's box
 * 8.3333em tall, with the type at 100vw / 43.2 up to 1728px, then
 * 26.667px + 100vw / 129.6, then 48px. From 481 to 690px they are two a row
 * on 16px type. At 480 and under, one a row, the full column. The picture is
 * contained, so a painting of aspect `a` is drawn min(tile, box x a) wide.
 */
function sizesFor(a: number): string {
  const up = (n: number, d = 2) => String(Math.ceil(n * 10 ** d) / 10 ** d);
  const k = Math.min(12.3333, 8.3333 * a); // em, above 690px
  const two = 8.3333 * 16 * a; // px: two a row, held by the box's height
  const turn = Math.ceil(2 * (two + 28)); // from here, two a row is held by the box's height, not the tile's width
  const parts = [`(min-width: 2765px) ${up(48 * k)}px`, `(min-width: 1729px) calc(${up(26.667 * k)}px + ${up((100 * k) / 129.6, 3)}vw)`, `(min-width: 691px) ${up((100 * k) / 43.2, 3)}vw`];
  if (turn > 481 && turn <= 690) parts.push(`(min-width: ${turn}px) ${up(two)}px`);
  parts.push(`(min-width: 481px) ${turn <= 481 ? `${up(two)}px` : 'calc(50vw - 28px)'}`, 'calc(100vw - 32px)');
  return parts.join(', ');
}

const SRC = new Map(
  PAINTINGS.map((p) => {
    const [w, hh] = sizeOf(p.image);
    const copies = TILE_WIDTHS.filter((tw) => tw < w);
    for (const tw of copies) {
      if (!existsSync(new URL(tilePath(p, tw), PUBLIC))) throw new Error(`paintings: ${p.slug} has no ${tw}px tile copy; run npm run tiles`);
    }
    const srcset = [...copies.map((tw) => `/${tilePath(p, tw)} ${tw}w`), `/${p.image} ${w}w`].join(', ');
    return [p.slug, { srcset, sizes: sizesFor(w / hh) }];
  }),
);

const tile = (p: PaintingRecord, eager: boolean) =>
  h(
    'li',
    { class: 'tile' },
    h('img', {
      src: `/${p.image}`,
      srcset: SRC.get(p.slug)!.srcset,
      sizes: SRC.get(p.slug)!.sizes,
      alt: p.alt,
      width: p.width,
      height: p.height,
      loading: eager ? 'eager' : 'lazy',
      decoding: 'async',
      // its colours as a grid of marks, for the film's reveal (scripts/tones.mjs)
      'data-tone': TONES[p.image] ?? null,
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
