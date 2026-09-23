/**
 * product designs. Every case is one sentence and its name is the button:
 *
 *   [case name ↗]: one-line description. (grey: status, year.)
 *
 * No thumbnails, by design. This is a text post's index, not a grid.
 */

import { h } from '../html.ts';
import { PATH } from '../paths.ts';
import { CASES, MOTION_ARCHIVE, separator, statusLine } from '../data/cases.ts';
import { body, btn, closing, crumb, grey, lede, page, title } from '../prose.ts';

export const DESIGNS = {
  title: 'product designs',
  lede: 'i design ambitious products, prototype the difficult parts, and test whether the ideas actually hold up.',
} as const;

export function designs() {
  return page(
    'product designs',
    null,
    crumb(
      'back ',
      btn('home', PATH.home),
      ', or over to ',
      btn('paintings', PATH.paintings),
      ' and ',
      btn('about', PATH.about),
      '.',
    ),
    title(DESIGNS.title),
    lede(DESIGNS.lede),
    h(
      'div',
      { class: 'index' },
      ...CASES.map((c) =>
        body(
          btn(c.name, c.href, { newTab: c.newTab }),
          `${separator(c)} ${c.line}. `,
          grey(statusLine(c)),
        ),
      ),
    ),
    closing(
      'i also keep a ',
      btn('motion archive', MOTION_ARCHIVE.href, { newTab: true }),
      ` of ${MOTION_ARCHIVE.series}, ${MOTION_ARCHIVE.studies}.`,
    ),
  );
}
