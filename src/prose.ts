/**
 * The prose kit. Every page is these pieces and nothing else.
 *
 * THE ONE COMPONENT is the framed inline button (README §5): a word in a
 * 1px ink box, sitting in a sentence, with the ↗ inside the box and the
 * punctuation outside it. Every link on the site is one of these. The runtime
 * finds them by `data-btn` and their label by `data-word`; those two
 * attributes are the whole contract between markup and behavior.
 *
 * `data-seams` marks the prose elements whose words the seam engine splits
 * into units. It goes on every h1, h2, p and figcaption, and on the
 * breadcrumb, which is a sentence even though it is a nav.
 */

import { flat, frag, h, raw, type Child, type Html } from './html.ts';
import type { Figure, Inline } from './data/casestudies.ts';

/** 12 × 12, drawn with currentColor so the band's ink pin recolors it. */
const ARROW = raw(
  '<svg class="btn-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8"/></svg>',
);

export interface BtnOpts {
  /** Opens in a new tab: anything off this site, the PDFs, and the standalone prototypes. */
  newTab?: boolean;
}

export function btn(label: string, href: string, opts: BtnOpts = {}): Html {
  const a = h(
    'a',
    {
      'data-btn': true,
      class: 'btn',
      href,
      target: opts.newTab ? '_blank' : null,
      rel: opts.newTab ? 'noopener' : null,
    },
    // An address may only break after its "@", never mid-name.
    h('span', { 'data-word': true }, ...label.split(/(?<=@)/).flatMap((part, i) => (i ? [raw('<wbr>'), part] : [part]))),
    ARROW,
    // Outside `data-word`, so the glitch and the width reservation never see
    // it; visually hidden, so the box is exactly the design's.
    opts.newTab ? h('span', { class: 'sr-only' }, ', opens in a new tab') : null,
  );
  return { ...a, btn: true };
}

const PUNCT = /^[.,:;!?)]+/;

/**
 * Punctuation sits OUTSIDE the box and is never orphaned from it. A browser
 * will break a line between a button and the period after it, and
 * `text-wrap: pretty` sometimes chooses to, which leaves a lone "." at the
 * start of a line on a phone. So a button and the punctuation after it are
 * set as one unbreakable pair (see `.glue` in site.css).
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

/** Secondary ink. */
export const grey = (...kids: Child[]): Html => h('span', { class: 'ink-2' }, ...kids);

/**
 * Inline markup for paragraph strings: `**bold**` and `[[grey]]`. Everything
 * else is text and is escaped.
 */
export function rich(s: string): Html {
  const parts: Child[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    parts.push(m[1] !== undefined ? h('b', null, m[1]) : grey(m[2]));
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return frag(...parts);
}

/** A sentence with buttons in it. Returns the runs, for a block builder to glue. */
export const sentence = (runs: Inline[]): Child[] =>
  runs.map((r) => (typeof r === 'string' ? r : btn(r.btn, r.href, { newTab: r.newTab })));

/** Any sentence-level block built by hand: its buttons keep their punctuation. */
export const glued = (...kids: Child[]): Child[] => glue(kids);

/* ------------------------------------------------------------------ blocks */

/** The opening sentence on every subpage. It is the site's only navigation. */
export const crumb = (...kids: Child[]): Html =>
  h('nav', { class: 'crumb', 'data-seams': true, 'aria-label': 'site' }, ...glue(kids));

export const title = (text: string): Html => h('h1', { class: 'title', 'data-seams': true }, text);

export const meta = (text: string): Html => h('p', { class: 'meta', 'data-seams': true }, text);

export const lede = (...kids: Child[]): Html => h('p', { class: 'lede', 'data-seams': true }, ...glue(kids));

export const body = (...kids: Child[]): Html => h('p', { class: 'body', 'data-seams': true }, ...glue(kids));

export const tagline = (text: string): Html =>
  h('p', { class: 'body tagline', 'data-seams': true }, h('i', null, text));

/** 56px below whatever it follows: the last sentence on most pages. */
export const closing = (...kids: Child[]): Html =>
  h('p', { class: 'body closing', 'data-seams': true }, ...glue(kids));

export interface SectionOpts {
  id?: string;
  /** Paragraph rhythm: 20px (prose), 12px (a list-like run), 10px (glance rows). */
  rhythm?: 'prose' | 'list' | 'glance';
}

export const section = (name: string, opts: SectionOpts, ...kids: Child[]): Html =>
  h(
    'section',
    { class: `sec sec--${opts.rhythm ?? 'prose'}`, id: opts.id ?? null },
    h('h2', { class: 'h2', 'data-seams': true }, name),
    ...kids,
  );

/** `(grey: field.) value.` The "at a glance" row, on the about page and the cases. */
export const glanceRow = (field: string, ...value: Child[]): Html =>
  body(grey(`${field}.`), ' ', ...value);

export function figure(f: Figure, opts: { eager?: boolean } = {}): Html {
  return h(
    'figure',
    { class: 'figure' },
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

/** The page root. The seam engine and the skeleton are scoped to it. */
export const page = (label: string, mod: string | null, ...kids: Child[]): Html =>
  h(
    'main',
    {
      class: mod ? `page page--${mod}` : 'page',
      'data-paper': true,
      'data-seams-root': true,
      'data-skel-mode': 'local',
      'data-screen-label': label,
    },
    ...kids,
  );
