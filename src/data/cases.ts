/**
 * Channel 01 · Product designs.
 *
 * Seven cases transcribed from devkit `data/projects.json`. The eighth devkit
 * record — branchial lateral spine — lives on channel 03 (Competizione)
 * because it is automotive work.
 *
 * `evidence` carries the devkit's `evidenceStatus` verbatim. "simulated" and
 * "tested logic" are not synonyms for "built"; keep them distinct.
 */

import type { CaseRecord, MotionStudy } from './types.ts';

export const CASES: CaseRecord[] = [
  {
    id: 'after-tokens',
    idx: '01',
    name: 'after tokens',
    line: 'parallel language that shows what is provisional and what has settled',
    year: '2026',
    discipline: 'product design, motion, prototyping',
    evidence: 'built',
    image: 'projects/live/after-tokens.webp',
    imageAlt:
      'The After Tokens playground running live: a resolved answer with its reveal controls and grammar selector',
    caption: 'after tokens · working prototype · 2026',
    href: 'https://globalanomalyindex.github.io/after-tokens/',
    source: 'https://github.com/globalanomalyindex/after-tokens',
  },
  {
    id: 'chellbook',
    idx: '02',
    name: 'chellbook',
    line: 'a recipe made safe to eat, and the label check that follows it to the shelf',
    year: '2026',
    discipline: 'product design, iOS',
    // Concept-stage: 30 designed screens and two prototypes, no shipped app.
    // "built" would claim a product that does not exist.
    evidence: 'concept',
    image: 'projects/live/chellbook.webp',
    imageAlt:
      'The Chellbook product design showcase: the wordmark, the value line, and the spec table listing 13 sections and 30 screens',
    caption: 'chellbook · design spec · 2026',
    // No deployed app to link to — the row opens the case study in the stage,
    // which is where both hosted prototypes are linked from.
    href: null,
    source: null,
    subpage: 'chellbook',
  },
  {
    id: 'one-master-affordance',
    idx: '03',
    name: 'one master affordance',
    line: 'one persistent control does activation, targeting and a safe abort',
    year: '2026',
    discipline: 'accessibility, interaction design',
    evidence: 'simulated',
    image: 'projects/live/one-master-affordance.webp',
    imageAlt:
      'The One Master Affordance prototype running live: the assisted-targeting surface with its measurement readouts',
    caption: 'one master affordance · coded prototype · 2026',
    href: 'https://globalanomalyindex.github.io/carplay-siri-contacts/',
    source: 'https://github.com/globalanomalyindex/carplay-siri-contacts',
  },
  {
    id: 'adhd-mode',
    idx: '04',
    name: 'adhd mode',
    line: 'a feed becomes a bounded session with a visible end and a return queue',
    year: '2026',
    discipline: 'product design, interaction',
    evidence: 'built',
    image: 'projects/live/adhd-mode.webp',
    imageAlt:
      'ADHD Mode running live: a bounded session with its post and time limits, action dock and return state',
    caption: 'adhd mode · portfolio prototype · 2026',
    href: 'https://globalanomalyindex.github.io/adhd-mode-linkedin/',
    source: 'https://github.com/globalanomalyindex/adhd-mode-linkedin',
  },
  {
    id: 'campeon',
    idx: '05',
    name: 'campeón',
    line: 'four aim drills converge on one range without hiding disagreement',
    year: '2026',
    discipline: 'product design, engineering',
    evidence: 'simulated',
    image: 'projects/live/campeon.webp',
    imageAlt:
      'campeón running live: the four aim drills and the entry into the sensitivity search',
    caption: 'campeón · working instrument · 2026',
    href: 'https://globalanomalyindex.github.io/campeon/',
    source: 'https://github.com/globalanomalyindex/campeon',
  },
  {
    id: 'chickpea',
    idx: '06',
    name: 'chickpea',
    line: 'a seeded studio that exposes the grid, palette and math behind output',
    year: '2026',
    discipline: 'generative tool design, engineering',
    evidence: 'built',
    image: 'projects/live/chickpea.webp',
    imageAlt:
      'The Chickpea studio running live: the generative grid and color tool',
    caption: 'chickpea · working browser studio · 2026',
    href: 'https://globalanomalyindex.github.io/chickpea/',
    source: 'https://github.com/globalanomalyindex/chickpea',
    /*
      Renders correctly in a browser, but GitHub Pages answers this path with
      HTTP 404 and lets 404.html boot the SPA, which then routes client-side.
      Fine for people, invisible to crawlers and link checkers. Worth a
      404.html→index redirect or a real /case/index.html on the chickpea repo.
    */
    caseHref: 'https://globalanomalyindex.github.io/chickpea/case',
  },
  {
    id: 'wildcard',
    idx: '07',
    name: 'wildcard',
    line: 'freeze the problem, draw from outside, keep only what survives',
    year: '2026',
    discipline: 'AI workflow, experiment design',
    evidence: 'tested logic',
    image: 'projects/live/wildcard.webp',
    imageAlt:
      'Wildcard running live: the external-draw protocol with its freeze and retain rules',
    caption: 'wildcard · installable plugin · 2026',
    href: 'https://globalanomalyindex.github.io/wildcard/',
    source: 'https://github.com/globalanomalyindex/wildcard',
    caseHref: 'https://globalanomalyindex.github.io/wildcard/case-study/',
  },
  {
    id: 'dither',
    idx: '08',
    name: 'dither',
    line: 'a dependency-free studio for dithering, grain, palette and paint',
    year: '2026',
    discipline: 'creative image tool',
    evidence: 'built',
    image: 'projects/live/dither.webp',
    imageAlt:
      'The DITHER studio running live: the dither, grain and paint modes over an empty canvas',
    caption: 'dither · browser studio · 2026',
    href: 'https://globalanomalyindex.github.io/dither/',
    source: null,
  },
];

/**
 * The thesis block under the page title. `profile.thesis` from the devkit.
 */
export const CASES_THESIS =
  'i design ambitious products, prototype the difficult parts, and test whether the ideas actually hold up.';

/**
 * Eight motion studies, from devkit `data/motion-studies.json`. They are a
 * strip on this page; the full 58-study archive opens from it.
 */
export const MOTION_STUDIES: MotionStudy[] = [
  {
    slug: 'swipe-row',
    label: 'swipe row',
    poster: 'motion/stills/swipe-row.png',
    note: 'a shelf advances one item at a time and resolves exactly on its next state',
  },
  {
    slug: 'vertical-feed',
    label: 'vertical feed',
    poster: 'motion/stills/vertical-feed.png',
    note: 'a vertical sequence advances in measured states with a visible arrival cue',
  },
  {
    slug: 'like-dislike',
    label: 'like dislike',
    poster: 'motion/stills/like-dislike.png',
    note: 'feedback becomes a physical press, count change, and brief consequence',
  },
  {
    slug: 'pause-play',
    label: 'playback glyph',
    poster: 'motion/stills/pause-play.png',
    note: 'a play symbol separates into two bars while the timeline holds',
  },
  {
    slug: 'next-up',
    label: 'continue next up',
    poster: 'motion/stills/next-up.png',
    note: 'completion transfers attention into the next card',
  },
  {
    slug: 'seek',
    label: 'seek',
    poster: 'motion/stills/seek.png',
    note: 'a stepped timeline makes movement, preview, and position legible',
  },
  {
    slug: 'flock',
    label: 'flock',
    poster: 'motion/stills/flock.png',
    note: 'a loose field finds a shared structure and corrects its own overshoot',
  },
  {
    slug: 'bloom',
    label: 'bloom',
    poster: 'motion/stills/bloom.png',
    note: 'a compact origin opens into a larger ordered field',
  },
];

/** The self-contained 58-study archive shipped in the devkit. */
export const MOTION_ARCHIVE_HREF = 'motion/archive.html';
export const MOTION_ARCHIVE_LABEL = 'eight series · 58 studies';
