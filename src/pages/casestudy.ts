/**
 * A case study, on the template drawn for chellbook (README §6.3):
 *
 *   breadcrumb · name · grey meta line · lede · italic tagline · lead figure
 *   · sections under h2s · the prototypes · "next up"
 *
 * Every case page is this one function over a `CaseStudy` record. A case that
 * needs a different shape needs a different record, not a branch in here.
 */

import { h } from '../html.ts';
import { PATH, casePath } from '../paths.ts';
import { nextCase, type CaseStudy } from '../data/casestudies.ts';
import {
  body,
  btn,
  closing,
  crumb,
  figure,
  glanceRow,
  grey,
  lede,
  meta,
  page,
  rich,
  section,
  sentence,
  tagline,
  title,
} from '../prose.ts';

/**
 * A glance value that is a command (it starts with "/") is set as code and
 * gets no closing period, so it copies clean. Everything else is a sentence.
 */
const glanceValue = (v: string) =>
  v.startsWith('/') ? h('code', null, v) : /[.!?)]$/.test(v) ? v : `${v}.`;

export function caseStudy(c: CaseStudy) {
  const next = nextCase(c.id);

  return page(
    `case study ${c.name}`,
    'case',
    crumb('one of my ', btn('product designs', PATH.designs), '. back ', btn('home', PATH.home), '.'),
    title(c.name),
    meta(c.meta),
    lede(c.lede),
    c.intro ? body(c.intro) : null,
    c.tagline ? tagline(c.tagline) : null,
    c.lead ? figure(c.lead, { eager: true }) : null,

    c.glance
      ? section(
          'at a glance',
          { rhythm: 'glance', id: 'at-a-glance' },
          ...c.glance.map((g) => glanceRow(g.field, glanceValue(g.value))),
        )
      : null,

    ...c.sections.map((s) =>
      section(
        s.name,
        { rhythm: s.list ? 'list' : 'prose', id: s.id },
        ...s.paras.map((p) => body(rich(p))),
        // Set off with a rule and its own label, because it is a different
        // kind of claim: a thought that has not been drawn, not the argument
        // continuing.
        s.aside
          ? h(
              'aside',
              { class: 'aside', 'aria-label': s.aside.label },
              ...s.aside.paras.map((p, i) =>
                body(i === 0 ? grey(`${s.aside!.label}.`) : null, i === 0 ? ' ' : null, rich(p)),
              ),
            )
          : null,
        s.figure ? figure(s.figure) : null,
      ),
    ),

    section(c.links.name, { id: 'the-work' }, body(sentence(c.links.sentence))),

    closing(
      'next up is ',
      btn(next.name, casePath(next.id)),
      ', or go back to ',
      btn('product designs', PATH.designs),
      '.',
    ),
  );
}
