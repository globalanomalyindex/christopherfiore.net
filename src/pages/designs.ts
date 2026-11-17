/**
 * product designs & experiments. Six groups, one per status word, in the
 * order the vocabulary runs. Inside a group the cases keep the order
 * `data/cases.ts` lists them in. Every case is one row, and the row is the
 * button:
 *
 *   +case name        one-line description        [w/ case study]
 *
 * STATUS IS EVIDENCE. The group a case sits under is its status, word for
 * word from the data. A status this page does not know stops the build.
 */

import { TALLY } from '../palette.ts';
import { CASES, MOTION_ARCHIVE } from '../data/cases.ts';
import { OWN_EFFECT, PROJECTS_TOTAL, lede, pagesBlock, row, rows, section, subpage, sum } from '../prose.ts';

export const DESIGNS = {
  title: 'product designs & experiments',
  lede: 'i design ambitious products, prototype the difficult parts, and test whether the ideas actually hold up.',
} as const;

/** The closed vocabulary, each with its hue. */
const ORDER: [status: string, hue: string][] = [
  ['built', TALLY.lime],
  ['design study', TALLY.cyan],
  ['motion interaction study', TALLY.violet],
  ['client work', TALLY.pink],
  ['simulated', TALLY.yellow],
  ['tested logic from a preregistered blind study', TALLY.peri],
];

const known = new Set(ORDER.map(([status]) => status));
for (const c of CASES) {
  if (!known.has(c.status)) throw new Error(`designs: "${c.status}" is outside the status vocabulary`);
}
// The helper line says they are all from one year.
const YEARS = new Set(CASES.map((c) => c.year));
if (YEARS.size !== 1) throw new Error('designs: the helper line says every case is from one year');

export function designs() {
  return subpage(
    'product designs',
    DESIGNS.title,
    TALLY.yellow,
    PROJECTS_TOTAL,
    lede(DESIGNS.lede),
    sum(`grouped by how far each one got, all from ${CASES[0].year}. a row with a + opens the project.`),
    ...ORDER.map(([status, hue]) => {
      const items = CASES.filter((c) => c.status === status);
      return section(
        status,
        hue,
        { count: String(items.length), cls: 'group' },
        rows(
          ...items.map((c) =>
            row(`+${c.name}`, c.href, c.line, { newTab: c.newTab, tag: c.caseStudy ? 'w/ case study' : undefined, lin: OWN_EFFECT[c.id] }),
          ),
        ),
      );
    }),
    section(
      'also',
      TALLY.grey,
      {},
      rows(
        row('+motion archive', MOTION_ARCHIVE.href, `${MOTION_ARCHIVE.series}, ${MOTION_ARCHIVE.studies}`, {
          newTab: true,
          lin: OWN_EFFECT['motion-archive'],
        }),
      ),
    ),
    pagesBlock('designs'),
  );
}
