/**
 * The case study pages, all on the one template the redesign drew for
 * chellbook (README §6.3): a breadcrumb sentence, the name, a grey meta line,
 * a lede, the lead figure, sections under h2s, the prototypes, and a
 * "next up" sentence.
 *
 * Chellbook is the designed page and is transcribed from CONTENT.md word for
 * word. The other three were not drawn, so they are assembled here from their
 * own data files, which are the edited case text the lattice site shipped.
 * Nothing in them is restated. What changes is the shape: a plate that used to
 * follow the reading column becomes a figure at the end of the sections it
 * illustrates, and "concept" in a status becomes "design study", the
 * redesign's word.
 *
 * Paragraph markup: `**bold**` and `[[grey]]` (the secondary ink). Nothing
 * else is parsed.
 */

import { CHELL, CHELL_LOOP, CHELL_STATES } from './chellbook.ts';
import { DF2TM, DF2TM_GLANCE, DF2TM_SECTIONS } from './df2tm.ts';
import { GUESTPASS, GUESTPASS_FIGURES, GUESTPASS_GLANCE, GUESTPASS_SECTIONS } from './guestpass.ts';
import { MFNY, MFNY_FIGURES, MFNY_GLANCE, MFNY_SECTIONS } from './mfny.ts';

export interface Figure {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/** A run of sentence text with buttons in it. */
export type Inline = string | { btn: string; href: string; newTab?: boolean };

export interface CaseSection {
  id: string;
  name: string;
  paras: string[];
  /** A list-like run: 12px between paragraphs instead of 20. */
  list?: boolean;
  /** Set after the paragraphs. */
  figure?: Figure;
  /** A marked aside: a thought that has not been drawn, set off from the argument. */
  aside?: { label: string; paras: string[] };
}

export interface CaseStudy {
  id: string;
  name: string;
  /** The grey line under the name: what it is, then its status and year. */
  meta: string;
  lede: string;
  /** A 32px paragraph straight after the lede, when the lede would run too long alone. */
  intro?: string;
  /** Italic, set straight after the lede. */
  tagline?: string;
  lead?: Figure;
  glance?: { field: string; value: string }[];
  sections: CaseSection[];
  /** The closing section that opens the work itself. */
  links: { name: string; sentence: Inline[] };
  /** For the page's meta description. */
  summary: string;
}

/** Split a standfirst in two at the first occurrence of `at`. */
const splitAt = (s: string, at: string): [string, string] => {
  const i = s.indexOf(at);
  if (i < 0) throw new Error(`casestudies: "${at}" not found`);
  return [s.slice(0, i).trim(), s.slice(i).trim()];
};

/** Hang each figure off the last section that argues over it. */
function withFigures<S extends { id: string; view?: number }>(
  sections: S[],
  figures: Figure[],
  skip: number[],
): Map<string, Figure> {
  const out = new Map<string, Figure>();
  figures.forEach((f, view) => {
    if (skip.includes(view)) return;
    const last = [...sections].reverse().find((s) => s.view === view);
    if (last) out.set(last.id, f);
  });
  return out;
}

/* ------------------------------------------------------------------ chellbook */

const chellbook: CaseStudy = {
  id: 'chellbook',
  name: CHELL.name,
  meta:
    'gluten-free recipe conversion and label safety, iPhone. client work for a client living with celiac disease, design spec, 2026.',
  lede: CHELL.standfirst,
  tagline: `${CHELL.tagline}.`,
  lead: {
    src: '/chellbook/boards/cover-and-foundation.webp',
    alt: 'The Chellbook cover board: palette, type, motion and voice',
    caption: 'foundation. palette, type, motion, voice.',
    width: 1600,
    height: 1009,
  },
  sections: [
    {
      id: 'loop',
      name: 'the core loop',
      list: true,
      paras: CHELL_LOOP.map((step, i) => `[[${i + 1}.]] ${step}.`),
    },
    {
      id: 'states',
      name: 'four safety states, never a fifth',
      list: true,
      // Verbatim, and the reason this imports rather than retypes: "not a
      // promise of absolute safety" is the product's whole ethic and must never
      // drift between two copies.
      paras: CHELL_STATES.map((s) => `**${s.name}**. ${s.meaning}`),
      figure: {
        src: '/chellbook/boards/safety-states.webp',
        alt: 'The four safety states side by side: verified, check the label, blocking, unknown',
        caption: 'the four states, side by side. unknown alone carries the dashed edge.',
        width: 1600,
        height: 789,
      },
    },
    {
      id: 'open',
      name: 'still undesigned',
      list: true,
      paras: [
        'the trusted brands editor is referenced from profile and settings, but its editing UI is not designed.',
        'cross-contamination in a shared kitchen is out of scope, and it is the single most requested thing from celiac users.',
        'mid-cook discovery has no screen: what happens when a cook is already halfway through and finds the problem then.',
        'recipe imagery is emoji placeholders, which is a placeholder and not a decision.',
        'whether saved recipes open with no network is unspecified.',
        'there is no designed behavior for an evidence line whose read date has gone stale.',
      ],
    },
  ],
  links: {
    name: 'the prototypes',
    sentence: [
      'you can open the ',
      { btn: 'product design showcase', href: '/chellbook/product-design.html', newTab: true },
      ', which is the spec, or the ',
      { btn: 'wireframe exploration', href: '/chellbook/wireframes.html', newTab: true },
      ', which is the same product before the device chrome and the final palette.',
    ],
  },
  summary: CHELL.standfirst,
};

/* ------------------------------------------------------------------ guestpass */

const [gpLede, gpIntro] = splitAt(GUESTPASS.standfirst, 'this is a concept');
const gpFigures = withFigures(GUESTPASS_SECTIONS, GUESTPASS_FIGURES, [0]);

const guestpass: CaseStudy = {
  id: 'guestpass',
  name: GUESTPASS.name,
  // The state line's three boundaries, all kept: self-directed, not
  // affiliated with apple, nothing was built. Only "concept" became "design
  // study", which is the index's status word for the same thing.
  meta: `${GUESTPASS.descriptor}. self-directed design study, not affiliated with apple, nothing was built, 2026.`,
  lede: gpLede,
  intro: gpIntro,
  lead: GUESTPASS_FIGURES[0],
  glance: GUESTPASS_GLANCE,
  sections: GUESTPASS_SECTIONS.map((s) => ({
    id: s.id,
    name: s.name,
    paras: s.paras,
    figure: gpFigures.get(s.id),
    aside: s.aside
      ? { label: s.aside.label.replace(' · ', ', '), paras: s.aside.paras }
      : undefined,
  })),
  links: {
    name: 'the prototypes',
    sentence: [
      'you can open the ',
      { btn: 'full case', href: `/${GUESTPASS.demoHref}`, newTab: true },
      ', with both prototypes in it.',
    ],
  },
  summary: gpLede,
};

/* ----------------------------------------------------------------------- mfny */

const mfFigures = withFigures(MFNY_SECTIONS, MFNY_FIGURES, [0]);

const mfny: CaseStudy = {
  id: 'mfny-concentrates',
  name: MFNY.name,
  // "self-directed redesign, not shipped by the client" is the boundary. The
  // live page it critiques is a real company's real storefront.
  meta: `${MFNY.descriptor}. ${MFNY.state.replace(' · ', ', ')}, 2026.`,
  lede: MFNY.standfirst,
  lead: MFNY_FIGURES[0],
  glance: MFNY_GLANCE,
  sections: MFNY_SECTIONS.map((s) => ({
    id: s.id,
    name: s.name,
    paras: s.paras,
    figure: mfFigures.get(s.id),
  })),
  links: {
    name: 'the prototype',
    sentence: [
      'you can open the ',
      { btn: 'working demo', href: `/${MFNY.demoHref}`, newTab: true },
      '. the THC numbers in it are placeholders, and it says so.',
    ],
  },
  summary: MFNY.standfirst,
};

/* ---------------------------------------------------------------------- df2tm */

const df2tm: CaseStudy = {
  id: 'df2tm',
  name: DF2TM.name,
  meta: `${DF2TM.expansion}, ${DF2TM.descriptor}. built, an open-source plugin, 2026.`,
  lede: DF2TM.standfirst,
  tagline: DF2TM.question,
  glance: DF2TM_GLANCE,
  sections: DF2TM_SECTIONS.map((s) => ({ id: s.id, name: s.name, paras: s.paras })),
  links: {
    name: 'the repository',
    sentence: [
      'it lives on ',
      { btn: 'github', href: DF2TM.repo, newTab: true },
      ', with the install steps and the full library of principles.',
    ],
  },
  summary: DF2TM.standfirst,
};

/**
 * In index order. "next up" on each page is the next one here, wrapping, which
 * is why chellbook's points at mfny: lee sits between them in the index and has
 * no case study.
 */
export const CASE_STUDIES: CaseStudy[] = [guestpass, chellbook, mfny, df2tm];

export const nextCase = (id: string): CaseStudy => {
  const i = CASE_STUDIES.findIndex((c) => c.id === id);
  return CASE_STUDIES[(i + 1) % CASE_STUDIES.length];
};
