/**
 * about me/contact. His lede and summary, "at a glance" as tinted rows, his
 * sections as chip headers over plain prose, then "say hi" as link rows.
 * The copy and its order live in `data/about.ts`; this only sets it.
 */

import { TALLY } from '../palette.ts';
import { ABOUT, ABOUT_SECTIONS, GLANCE } from '../data/about.ts';
import { CERTIFICATE, LINKS, RESUME, STUDIO } from '../data/studio.ts';
import { cellBtn, fact, figLink, lede, pagesBlock, prose, rich, row, rows, section, subpage } from '../prose.ts';

/** The section hues, in turn. */
const CYCLE = [TALLY.pink, TALLY.lime, TALLY.violet, TALLY.peri, TALLY.cyan];

const bare = (url: string) => url.replace(/^https:\/\/(www\.)?/, '');

export function about() {
  return subpage(
    'about and say hi',
    'about me/contact',
    TALLY.pink,
    figLink('say hi', '#say-hi'),
    lede(ABOUT.lede),
    lede(ABOUT.summary),

    section(
      'at a glance',
      TALLY.cyan,
      { id: 'at-a-glance', count: String(GLANCE.length), cls: 'glance' },
      rows(
        ...GLANCE.map((g) =>
          fact(
            g.field,
            g.value,
            g.doc === 'certificate' ? cellBtn(CERTIFICATE.label, CERTIFICATE.href, { newTab: true }) : null,
          ),
        ),
      ),
    ),

    ...ABOUT_SECTIONS.map((s, i) =>
      section(s.name, CYCLE[i % CYCLE.length], { id: s.id }, ...s.paras.map((p) => prose(rich(p)))),
    ),

    section(
      'say hi',
      TALLY.yellow,
      { id: 'say-hi' },
      prose('i’m open to roles in new york or remote. i’d love to hear from you :)'),
      rows(
        row('+email', `mailto:${STUDIO.email}`, STUDIO.email),
        row('+github', LINKS.github, bare(LINKS.github), { newTab: true }),
        row('+artstation', LINKS.artstation, bare(LINKS.artstation), { newTab: true }),
        row('+linkedin', LINKS.linkedin, bare(LINKS.linkedin), { newTab: true }),
        row(`+${RESUME.label}`, RESUME.href, 'one page, pdf', { newTab: true }),
      ),
    ),

    pagesBlock('about'),
  );
}
