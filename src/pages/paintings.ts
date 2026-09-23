/**
 * paintings. Two CSS columns, and every caption is a sentence:
 *
 *   [title ↗] note, (grey: year).
 *
 * All twenty works, in the data file's order. The prototype drew twelve of
 * them; the build shows the full set (README §6.4).
 */

import { h } from '../html.ts';
import { PATH } from '../paths.ts';
import { ARTSTATION_HREF, PAINTINGS } from '../data/paintings.ts';
import type { PaintingRecord } from '../data/types.ts';
import { body, btn, crumb, glued, grey, lede, page, title } from '../prose.ts';

/*
  The lede and the closing line both say "twenty" in words. If the collection
  changes size they would quietly start lying, so the build refuses instead.
*/
if (PAINTINGS.length !== 20) {
  throw new Error(`paintings: the copy says twenty works and the data has ${PAINTINGS.length}`);
}

export const PAINTINGS_PAGE = {
  title: 'paintings',
  lede: 'twenty works, 2023 to 2025. concept art and illustration: photobash, blender, substance.',
} as const;

/** A work with no note and no year shows only its button. */
function caption(p: PaintingRecord) {
  const tail = [p.note, p.year ? grey(p.year) : null].filter(Boolean);
  const parts = tail.flatMap((t, i) => (i === 0 ? [t] : [', ', t]));
  return h(
    'figcaption',
    { class: 'cap cap--work', 'data-seams': true },
    ...glued(btn(p.wall, p.href, { newTab: true }), parts.length ? [' ', ...parts, '.'] : null),
  );
}

const work = (p: PaintingRecord, i: number) =>
  h(
    'figure',
    { class: 'work' },
    h('img', {
      src: `/${p.image}`,
      alt: p.alt,
      width: p.width,
      height: p.height,
      // The first row is on screen at load; everything after it can wait.
      loading: i < 2 ? 'eager' : 'lazy',
      decoding: 'async',
    }),
    caption(p),
  );

export function paintings() {
  return page(
    'paintings',
    null,
    crumb(
      'back ',
      btn('home', PATH.home),
      ', or over to ',
      btn('product designs', PATH.designs),
      ' and ',
      btn('about', PATH.about),
      '.',
    ),
    title(PAINTINGS_PAGE.title),
    lede(PAINTINGS_PAGE.lede),
    h('div', { class: 'gallery' }, ...PAINTINGS.map(work)),
    body(
      'all twenty are on ',
      btn('artstation', ARTSTATION_HREF, { newTab: true }),
      '.',
    ),
  );
}
