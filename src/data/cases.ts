/**
 * The product designs index: fourteen cases, one sentence each.
 *
 * `line` and `status` are the designer's final wording from the prose
 * redesign handoff (CONTENT.md and LABELING.md §4 and §6), and they override
 * the older devkit lines this file used to carry.
 *
 * STATUS IS EVIDENCE, NOT DECORATION. The vocabulary is closed:
 *
 *   built                  something you can open and use
 *   design study           designed, not built or commissioned
 *   motion interaction study   after tokens only
 *   client work            chellbook only
 *   simulated              behavior proven in simulation, not shipped
 *   tested logic from a preregistered blind study   wildcard only
 *
 * Never move a case to a stronger word than the one here. "simulated" is not
 * "tested", and "design study" is not "built".
 *
 * `caseStudy` adds ", w/ case study" to the status. It is true wherever a case
 * page or a case-study document exists, which is not the same as "has a page on
 * this site": after tokens, one master affordance, adhd mode, chickpea and
 * wildcard keep theirs on their own deployments, and the button goes there.
 */

import { casePath } from '../paths.ts';

export interface CaseEntry {
  id: string;
  name: string;
  line: string;
  status: string;
  caseStudy: boolean;
  year: string;
  /** Where the name's button goes. */
  href: string;
  /** Outside this site, or a standalone prototype document: opens in a new tab. */
  newTab: boolean;
  /**
   * The preview image from the lattice site's index. Nothing renders it now;
   * the prose index has no thumbnails by design. Kept because a hover preview
   * was named as a possible later addition.
   */
  card: string;
}

const card = (id: string) => `/projects/card/${id}.webp`;

export const CASES: CaseEntry[] = [
  {
    id: 'after-tokens',
    name: 'after tokens',
    line: 'parallel language that shows what is provisional and what has settled',
    status: 'motion interaction study',
    caseStudy: true,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/after-tokens/',
    newTab: true,
    card: card('after-tokens'),
  },
  {
    id: 'guestpass',
    name: 'apple wallet card sharing concept',
    line: 'a temporary single use version of your card, handed to someone over imessage',
    status: 'design study',
    caseStudy: true,
    year: '2026',
    href: casePath('guestpass'),
    newTab: false,
    card: card('guestpass'),
  },
  {
    id: 'chellbook',
    name: 'chellbook',
    line: 'AI-based iOS app for celiac food safety, designed for a client living with celiac disease',
    status: 'client work',
    caseStudy: true,
    year: '2026',
    href: casePath('chellbook'),
    newTab: false,
    card: card('chellbook'),
  },
  {
    id: 'lee',
    name: 'lee',
    line: 'self-tape studio for actors: the notes become color you read while acting',
    status: 'design study',
    caseStudy: false,
    year: '2026',
    href: '/lee/studio.html',
    newTab: true,
    card: card('lee'),
  },
  {
    id: 'mfny-concentrates',
    name: 'mfny concentrates',
    line: 'product page redesign: one card per SKU becomes one card per strain',
    status: 'built',
    caseStudy: true,
    year: '2026',
    href: casePath('mfny-concentrates'),
    newTab: false,
    card: card('mfny-concentrates'),
  },
  {
    id: 'chipotle',
    name: 'chipotle app ui cleanup',
    line: 'pickup checkout redesign: nineteen findings, rebuilt to fit one screen',
    status: 'design study',
    caseStudy: false,
    year: '2026',
    href: '/chipotle/checkout.html',
    newTab: true,
    card: card('chipotle'),
  },
  {
    id: 'one-master-affordance',
    name: 'one master affordance',
    line: 'one persistent control does activation, targeting and a safe abort',
    status: 'simulated',
    caseStudy: true,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/carplay-siri-contacts/',
    newTab: true,
    card: card('one-master-affordance'),
  },
  {
    id: 'adhd-mode',
    name: 'adhd mode',
    line: 'a feed becomes a bounded session with a visible end and a return queue',
    status: 'built',
    caseStudy: true,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/adhd-mode-linkedin/',
    newTab: true,
    card: card('adhd-mode'),
  },
  {
    id: 'df2tm',
    name: 'df2tm',
    line: 'a learning layer for claude code that teaches the concept behind the work',
    status: 'built',
    caseStudy: true,
    year: '2026',
    href: casePath('df2tm'),
    newTab: false,
    card: card('df2tm'),
  },
  {
    id: 'campeon',
    name: 'campeón',
    line:
      'using natural predator behavior and environments to improve human computer interaction accuracy with a mouse input',
    status: 'simulated',
    caseStudy: false,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/campeon/',
    newTab: true,
    card: card('campeon'),
  },
  {
    id: 'chickpea',
    name: 'chickpea',
    line: 'a seeded color and grid generation studio',
    status: 'built',
    caseStudy: true,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/chickpea/',
    newTab: true,
    card: card('chickpea'),
  },
  {
    id: 'wildcard',
    name: 'wildcard',
    line: 'testing if default mode network emulation in LLMs leads to more creative outputs',
    status: 'tested logic from a preregistered blind study',
    caseStudy: true,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/wildcard/',
    newTab: true,
    card: card('wildcard'),
  },
  {
    id: 'dither',
    name: 'dither',
    line:
      'an experiment testing what a painting engine looks like if it is intentionally trying to be physically impossible compared to real paint',
    status: 'built',
    caseStudy: false,
    year: '2026',
    href: 'https://globalanomalyindex.github.io/dither/',
    newTab: true,
    card: card('dither'),
  },
  {
    id: 'three-zones',
    name: 'three zones: camera market ui fix',
    line: 'a two-zone gallery dead ends at the video, so give the middle a job',
    status: 'design study',
    caseStudy: false,
    year: '2026',
    href: '/three-zones/',
    newTab: true,
    card: card('three-zones'),
  },
];

/** `design study, w/ case study, 2026.` */
export const statusLine = (c: CaseEntry): string =>
  `${c.status}${c.caseStudy ? ', w/ case study' : ''}, ${c.year}.`;

/**
 * What follows the button. A name that already carries a colon
 * ("three zones: camera market ui fix") takes a period instead, so the
 * sentence never has two colons in a row.
 */
export const separator = (c: CaseEntry): string => (c.name.includes(':') ? '.' : ':');

export const MOTION_ARCHIVE = {
  href: '/motion/archive.html',
  series: 'eight series',
  studies: '58 studies',
} as const;
