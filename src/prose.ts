/**
 * The kit. Every page is these pieces and nothing else.
 *
 * Two grammars share it. Home is the Ledger: his Figma frame, a sheet column
 * between two vertical rules. Every other page is Chips: a title chip, a rule,
 * a figure and a ladder, then sections of tinted rows.
 *
 * THE "+" MARKS A LINK. Every link on the site is an `a[data-btn]`, and every
 * one reads "+something" except the two figure chips in a masthead. A row with
 * a "+" is a button from edge to edge. The runtime finds buttons by
 * `data-btn` and their label by `data-word`; those two attributes are the
 * whole contract between markup and behavior.
 *
 * `data-seams` marks the prose whose words the seam engine splits into units.
 * It goes on paragraphs and captions only. Rows, chips and the masthead sit on
 * the character grid and never part.
 */

import { flat, frag, h, raw, type Child, type Html } from './html.ts';
import type { Figure, Inline } from './data/casestudies.ts';
import { PATH } from './paths.ts';
import { RESUME } from './data/studio.ts';
import { CASES } from './data/cases.ts';
import { PAINTINGS } from './data/paintings.ts';
import { outline, ink as inkBox } from './data/signature.json';
import { P, ROW_TINT, TALLY, tint } from './palette.ts';

/** The name in the masthead. The same words in the same place on every page. */
export const MAST_NAME = 'christopher robin';

export interface BtnOpts {
  /** Opens in a new tab: anything off this site, the PDFs, and the standalone prototypes. */
  newTab?: boolean;
  /** A fixed band color for this button. Without one, the runtime picks. */
  hue?: string;
}

/** The label the runtime glitches. An address may only break after its "@". */
const word = (label: string): Html =>
  h(
    'span',
    { 'data-word': true },
    ...label.split(/(?<=@)/).flatMap((part, i) => (i ? [raw('<wbr>'), part] : [part])),
  );

/** Outside `data-word`, so the glitch never sees it; visually hidden. */
const newTabNote = (opts: BtnOpts): Html | null =>
  opts.newTab ? h('span', { class: 'sr-only' }, ', opens in a new tab') : null;

function link(cls: string, href: string, opts: BtnOpts, attrs: Record<string, string | true | null>, ...kids: Child[]): Html {
  return h(
    'a',
    {
      'data-btn': true,
      class: `btn ${cls}`,
      href,
      target: opts.newTab ? '_blank' : null,
      rel: opts.newTab ? 'noopener' : null,
      'data-hue': opts.hue ?? null,
      ...attrs,
    },
    ...kids,
    newTabNote(opts),
  );
}

/** A link inside a sentence: "+label" on a tinted chip. */
export function btn(label: string, href: string, opts: BtnOpts = {}): Html {
  const a = link('in', href, opts, {}, word(`+${label}`));
  return { ...a, btn: true };
}

const PUNCT = /^[.,:;!?)]+/;

/**
 * Punctuation sits outside the chip and is never orphaned from it. A browser
 * will break a line between a box and the period after it, which leaves a
 * lone "." at the start of a line on a phone. So a button and the punctuation
 * after it are set as one unbreakable pair (see `.glue` in site.css).
 */
function glue(kids: Child[]): Child[] {
  const list = flat(kids);
  const out: Child[] = [];
  for (let i = 0; i < list.length; i++) {
    const k = list[i];
    const next = list[i + 1];
    const m = typeof next === 'string' ? next.match(PUNCT) : null;
    if (typeof k === 'object' && k.btn && m && typeof next === 'string') {
      out.push(h('span', { class: 'glue' }, k, m[0]));
      const rest = next.slice(m[0].length);
      if (rest) out.push(rest);
      i++;
    } else out.push(k);
  }
  return out;
}

/**
 * Inline markup for paragraph strings: `**bold**` and `[[quiet]]` (the mute
 * ink). Everything else is text and is escaped.
 */
export function rich(s: string): Html {
  const parts: Child[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    parts.push(m[1] !== undefined ? h('b', null, m[1]) : h('span', { class: 'mute' }, m[2]));
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return frag(...parts);
}

/** A sentence with buttons in it. */
export const sentence = (runs: Inline[]): Child[] =>
  runs.map((r) => (typeof r === 'string' ? r : btn(r.btn, r.href, { newTab: r.newTab })));

/* --------------------------------------------------------------- pieces */

/** Three cells of one hue, at 40%, 70% and full strength. */
export const lad = (c: string): Html =>
  h(
    'span',
    { class: 'lad', 'aria-hidden': 'true' },
    ...[0.4, 0.7, 1].map((k) => h('i', { style: `background:${tint(c, k)}` })),
  );

const SIG_BOX = `${inkBox[0]} ${inkBox[1]} ${inkBox[2] - inkBox[0]} ${inkBox[3] - inkBox[1]}`;

/**
 * His signature, as one traced path in ink. `inkClass` is set on the home
 * page only, where the runtime takes that path away to write it back in.
 */
export const signatureSvg = (inkClass: string | null): Html =>
  h(
    'svg',
    {
      class: 'sig',
      // No width or height: the viewBox gives the ratio, and with no CSS at
      // all a sized svg would render 2053px wide.
      viewBox: SIG_BOX,
      role: 'img',
      'aria-label': 'signature: christopher robin fiore',
      focusable: 'false',
    },
    h('path', { class: inkClass, fill: 'currentColor', 'fill-rule': 'evenodd', d: outline }),
  );

export const lede = (...kids: Child[]): Html => h('p', { class: 'lede', 'data-seams': true }, ...glue(kids));

/** The one quiet helper line a page gets. */
export const sum = (...kids: Child[]): Html => h('p', { class: 'sum', 'data-seams': true }, ...glue(kids));

export const prose = (...kids: Child[]): Html => h('p', { class: 'prose', 'data-seams': true }, ...glue(kids));

/** A section header: chip, rule, an optional count, and the ladder, all in one hue. */
export const sec = (label: string, c: string, count = ''): Html =>
  h(
    'div',
    { class: 'sec' },
    h('h2', { class: 'chip' }, label),
    h('span', { class: 'rule', 'aria-hidden': 'true' }),
    count ? h('span', { class: 'ct' }, count) : null,
    lad(c),
  );

/** The hue a section and its rows are set in. */
export const hues = (c: string, rowTint: string = tint(c, ROW_TINT)): string => `--c:${c};--t:${rowTint}`;

export interface SectionOpts {
  id?: string;
  count?: string;
  tag?: 'section' | 'nav';
  label?: string;
  cls?: string;
  /** Rows on this instead of the hue's own tint. */
  rowTint?: string;
}

/** A header and whatever sits under it, carrying the hue down as `--c` and `--t`. */
export const section = (label: string, c: string, opts: SectionOpts, ...kids: Child[]): Html =>
  h(
    opts.tag ?? 'section',
    {
      id: opts.id ?? null,
      class: opts.cls ?? null,
      'aria-label': opts.label ?? null,
      style: hues(c, opts.rowTint),
    },
    sec(label, c, opts.count),
    ...kids,
  );

export const rows = (...kids: Child[]): Html => h('ul', { class: 'rows' }, ...kids);

export interface RowOpts extends BtnOpts {
  /** An outlined tag at the row's end. */
  tag?: string;
}

/** A row that is a link: the bold "+name", then the detail. The whole row is the button. */
export const row = (label: string, href: string, detail: Child, opts: RowOpts = {}): Html =>
  h(
    'li',
    null,
    link(
      'row',
      href,
      opts,
      {},
      h('span', { class: 'nm' }, word(label)),
      h('span', { class: 'l' }, detail),
      opts.tag ? h('span', { class: 'cs' }, h('span', null, opts.tag)) : null,
    ),
  );

/** A row that only states something: the bold lead term, then the detail. */
export const fact = (term: string, detail: Child, end: Child = null): Html =>
  h('li', { class: 'row' }, h('span', { class: 'nm' }, term), h('span', { class: 'l' }, detail), end);

/** A small outlined button at the end of a fact row. */
export const cellBtn = (label: string, href: string, opts: BtnOpts = {}): Html =>
  link('cell', href, opts, {}, word(`+${label}`));

/** The figure chip in a masthead, when it is a jump down the page. */
export const figLink = (label: string, href: string): Html => link('fig', href, {}, {}, word(label));

export const fig = (label: string): Html => h('span', { class: 'fig' }, label);

export function figure(f: Figure, opts: { eager?: boolean } = {}): Html {
  return h(
    'figure',
    { class: 'plate' },
    h('img', {
      src: f.src,
      alt: f.alt,
      width: f.width,
      height: f.height,
      loading: opts.eager ? 'eager' : 'lazy',
      decoding: 'async',
    }),
    h('figcaption', { class: 'cap', 'data-seams': true }, f.caption),
  );
}

/* ------------------------------------------------------------- masthead */

/** Where a subpage's back arrow goes: one level up. */
export interface Back {
  href: string;
  label: string;
}
export const BACK_HOME: Back = { href: PATH.home, label: 'back to home' };

/**
 * The back arrow: one character cell wide, drawn in the type's stroke weight
 * so it sits on the grid like the "+" it replaced. It is a path, not the
 * font's own "←": that glyph lives in a 60 to 80 KB font slice, five times
 * the whole latin face, for one mark. During a page change the ASCII film
 * draws "<" in this cell (`data-glyph`), its echo.
 */
const backArrow = (): Html =>
  h(
    'svg',
    { class: 'arrow', viewBox: '0 0 12 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M11 13.5H2M6 9.5L2 13.5L6 17.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' }),
  );

/**
 * The header row under the name. On a subpage the cell left of the title is a
 * back arrow, one level up (home, or product designs from a case study). The
 * row sticks to the top of the window, so the arrow is always on screen: it
 * is where every page change starts and ends (`runtime/morph.ts`).
 */
export const mast = (title: string, hue: string, figure_: Html | null, back: Back = BACK_HOME): Html =>
  frag(
    h('p', { class: 'name' }, MAST_NAME),
    h(
      'header',
      { class: 'hd', style: `--pg:${hue}` },
      link('plus back', back.href, { hue: P.ink }, { 'aria-label': back.label, 'data-anchor': true, 'data-glyph': '<' }, backArrow()),
      h('h1', { class: 'chip' }, title),
      h('span', { class: 'rule', 'aria-hidden': 'true' }),
      figure_,
      lad(hue),
    ),
  );

/*
  Two of the pages block's lines state a count in words the data could
  outgrow. The build refuses rather than let them drift.
*/
const COUNTS = { projects: 17, paintings: 20 } as const;
if (CASES.length !== COUNTS.projects || PAINTINGS.length !== COUNTS.paintings) {
  throw new Error(`the copy says ${COUNTS.projects} projects and ${COUNTS.paintings} paintings; the data has ${CASES.length} and ${PAINTINGS.length}`);
}

export const PROJECTS_LABEL = `${COUNTS.projects} projects`;
export const PAINTINGS_LABEL = `${COUNTS.paintings} paintings`;

export type PageId = 'home' | 'designs' | 'paintings' | 'about' | 'resume';

/** The site's pages, in the home menu's order and colors. */
export const PAGES: { id: PageId; label: string; href: string; detail: string; tail: string; hue: string; newTab?: boolean }[] = [
  { id: 'home', label: '+home', href: PATH.home, detail: 'back to the start', tail: '', hue: TALLY.grey },
  { id: 'designs', label: '+product designs & experiments', href: PATH.designs, detail: PROJECTS_LABEL, tail: String(COUNTS.projects), hue: '#F5D90A' },
  { id: 'paintings', label: '+paintings', href: PATH.paintings, detail: PAINTINGS_LABEL, tail: String(COUNTS.paintings), hue: '#12D9E8' },
  { id: 'about', label: '+about me/contact', href: PATH.about, detail: 'say hi', tail: 'say hi', hue: '#FF2D87' },
  { id: 'resume', label: '+view resume', href: RESUME.href, detail: 'pdf', tail: 'pdf', hue: '#C9F227', newTab: true },
];

/** How every subpage ends: the other pages on sheet rows, then the signature, small. */
export const pagesBlock = (self: PageId | null): Html =>
  frag(
    section(
      'pages',
      TALLY.grey,
      { tag: 'nav', label: 'pages', rowTint: P.sheet },
      rows(
        ...PAGES.filter((p) => p.id !== self).map((p) =>
          row(p.label, p.href, p.detail, { newTab: p.newTab, hue: p.id === 'home' ? undefined : p.hue }),
        ),
      ),
    ),
    h('div', { class: 'endsig' }, signatureSvg(null)),
  );

/** The page root. The seam engine and the skeleton are scoped to it. */
export const page = (label: string, mod: string, ...kids: Child[]): Html =>
  h(
    'div',
    {
      class: `page ${mod}`,
      'data-seams-root': true,
      'data-screen-label': label,
    },
    ...kids,
  );

/** A subpage: the masthead, then its body as the main landmark. */
export const subpage = (
  label: string,
  title: string,
  hue: string,
  figure_: Html | null,
  ...kids: Child[]
): Html => page(label, 'sub', mast(title, hue, figure_), h('main', { class: 'body' }, ...kids));

/** A subpage one level further down (a case study): its back arrow goes to `back`. */
export const subpageUnder = (
  back: Back,
  label: string,
  title: string,
  hue: string,
  figure_: Html | null,
  ...kids: Child[]
): Html => page(label, 'sub', mast(title, hue, figure_, back), h('main', { class: 'body' }, ...kids));
