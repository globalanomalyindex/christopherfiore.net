/**
 * The 404. The smallest page the system can make: the masthead, one line
 * saying what happened, and the pages block every subpage ends on.
 */

import { TALLY } from '../palette.ts';
import { fig, lede, pagesBlock, subpage } from '../prose.ts';

export const NOT_FOUND = {
  title: 'not found',
  lede: 'there’s nothing at this address. it may have moved when the site was rebuilt.',
} as const;

export function notFound() {
  return subpage('not found', NOT_FOUND.title, TALLY.grey, fig('404'), lede(NOT_FOUND.lede), pagesBlock(null));
}
