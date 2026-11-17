/**
 * A case study, in the Chips grammar:
 *
 *   masthead: the case name on the product designs yellow, and a figure chip
 *             that jumps to the work itself
 *   the quiet meta line · lede · intro · tagline · lead plate
 *   "at a glance" as tinted rows
 *   each section as a chip header over prose, with its aside and its plate
 *   the work itself, as a sentence with its links in it
 *   "next up", one row, then the pages block
 *
 * Every case page is this one function over a `CaseStudy` record. A case that
 * needs a different shape needs a different record, not a branch in here.
 */

import { h } from '../html.ts';
import { TALLY } from '../palette.ts';
import { PATH, casePath } from '../paths.ts';
import { CASES } from '../data/cases.ts';
import { nextCase, type CaseStudy } from '../data/casestudies.ts';
import { OWN_EFFECT, fact, figLink, figure, lede, pagesBlock, prose, rich, row, rows, section, sentence,
  subpageUnder, sum } from '../prose.ts';

/**
 * A glance value that is a command (it starts with "/") is set as code and
 * gets no closing period, so it copies clean. Everything else is a sentence.
 */
const glanceValue = (v: string) =>
  v.startsWith('/') ? h('code', null, v) : /[.!?)]$/.test(v) ? v : `${v}.`;

/** The section hues, in turn. "at a glance" is cyan on every page that has one. */
const CYCLE = [TALLY.pink, TALLY.lime, TALLY.violet, TALLY.peri, TALLY.cyan];

export function caseStudy(c: CaseStudy) {
  const next = nextCase(c.id);
  // The next case's line from the index, so the row says what it opens.
  const nextLine = CASES.find((x) => x.id === next.id)?.line ?? next.meta;

  return subpageUnder(
    { href: PATH.designs, label: 'back to product designs' },
    `case study ${c.name}`,
    c.name,
    TALLY.yellow,
    figLink(c.links.name, '#the-work'),
    sum(c.meta),
    lede(c.lede),
    c.intro ? lede(c.intro) : null,
    c.tagline ? h('p', { class: 'lede tagline', 'data-seams': true }, h('b', null, c.tagline)) : null,
    c.lead ? h('div', { class: 'lead', style: `--t:var(--sheet)` }, figure(c.lead, { eager: true })) : null,

    c.glance
      ? section(
          'at a glance',
          TALLY.cyan,
          { id: 'at-a-glance', count: String(c.glance.length), cls: 'glance' },
          rows(...c.glance.map((g) => fact(g.field, glanceValue(g.value)))),
        )
      : null,

    ...c.sections.map((s, i) =>
      section(
        s.name,
        CYCLE[i % CYCLE.length],
        { id: s.id, cls: s.list ? 'list' : undefined },
        ...s.paras.map((p) => prose(rich(p))),
        // Set off with a rule and its own label, because it is a different
        // kind of claim: a thought that has not been drawn, not the argument
        // continuing.
        s.aside
          ? h(
              'aside',
              { class: 'aside', 'aria-label': s.aside.label },
              ...s.aside.paras.map((p, j) =>
                prose(j === 0 ? h('span', { class: 'mute' }, `${s.aside!.label}.`) : null, j === 0 ? ' ' : null, rich(p)),
              ),
            )
          : null,
        s.figure ? figure(s.figure) : null,
      ),
    ),

    section(c.links.name, TALLY.yellow, { id: 'the-work' }, prose(sentence(c.links.sentence))),

    section('next up', TALLY.grey, { id: 'next-up' }, rows(row(`+${next.name}`, casePath(next.id), nextLine, { lin: OWN_EFFECT[next.id] }))),

    pagesBlock(null),
  );
}
