/**
 * The 404. Not in the design, which drew five pages, so it is the smallest
 * page the system can make: the breadcrumb sentence every subpage opens with,
 * a title, and one line saying what happened.
 */

import { PATH } from '../paths.ts';
import { btn, crumb, lede, page, title } from '../prose.ts';

export const NOT_FOUND = {
  title: 'not found',
  lede: 'there’s nothing at this address. it may have moved when the site was rebuilt.',
} as const;

export function notFound() {
  return page(
    'not found',
    null,
    crumb(
      'back ',
      btn('home', PATH.home),
      ', or over to ',
      btn('product designs', PATH.designs),
      ', ',
      btn('paintings', PATH.paintings),
      ' and ',
      btn('about', PATH.about),
      '.',
    ),
    title(NOT_FOUND.title),
    lede(NOT_FOUND.lede),
  );
}
