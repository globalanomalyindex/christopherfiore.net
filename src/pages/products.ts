/**
 * Screen 2b · Page 01 — Product designs, as a mosaic on the lattice.
 *
 * The index is no longer a table of rows under a key-frame panel. It is the
 * kit's block mosaic on the 60px module: two rails, a title, a standfirst, and
 * a field of blocks whose four corners are never drawn, because each one is a
 * background crosshair switched on. `INDEX_BLOCKS` in `design/layout.ts` is the
 * geometry and this file reads nothing else.
 *
 * THREE LAYERS, and the order is load-bearing — the same stack screen 2a uses:
 *
 *   z 0   veil + band host   the page's dither canvas, then the hover bands
 *   z 1   lattice            the crosshairs, inserted by runtime/lattice.ts
 *   z 2   content            rails, standfirst, the mosaic
 *   z 3   title              outside [data-pbody]; see below
 *
 * The band paints UNDER the lattice, which is what keeps the crosshairs visible
 * over a vivid hover band.
 *
 * NOTHING SCROLLS. The lattice is the substrate and never moves, and neither
 * do the rails, and neither does the mosaic: `runtime/latticescroll.ts` turns a
 * gesture into a rest position and the grid dithers apart and re-forms at the
 * new one, so there is no vertical travel on this screen at any point. The
 * title and the standfirst are pinned with the rails
 * rather than scrolling with the mosaic, for a reason that is structural and
 * not aesthetic: `[data-ptitle]` is the element the open transition FLIPs out
 * of the channel word, so it has to sit outside `[data-pbody]` (which does not
 * fade in until the grow is over) and outside any clipping scroll box (which
 * would cut the FLIP's travel).
 *
 * LINKS ARE STILL LINKS, AND STILL NOT NESTED. Each block is one control
 * filling its frame, and the case's source repository is a SIBLING of that
 * control laid over its top right corner, never a child of it. `wireHovers`
 * binds by finding elements whose `cursor` computes to pointer and whose
 * parent's does not, so a link inside a link silently moves the band onto the
 * wrong box. Blocks whose case has `href: null` and a `subpage` are real
 * `<button>`s that open a case study inside this stage; `blockControl` narrows
 * on the data rather than asserting, so a record with no href can never become
 * an `<a>` with no href.
 *
 * EVERY LABEL IS ONE LINE. Labels carry `data-fit`, and `fitScreen` solves each
 * one against its card's TEXT COLUMN — the card less its preview window less
 * its padding — when the screen opens. That is not tidiness: `wrapWord`
 * rebuilds a hovered label out of inline spans whose spaces are
 * `white-space: pre`, which removes the wrap opportunity, so a label that
 * wrapped at rest would snap to one long line under the cursor and run out of
 * its block. The case's one-line description underneath it is ordinary text and
 * wraps freely; it is clamped to three lines rather than fitted.
 *
 * A BLOCK IS NOT A CARD. The block is the frame — its four corners are the
 * lattice points the whole system rests on, and they have not moved. The card
 * is a hairline rectangle drawn half a lattice step inside it, which is what
 * gives fourteen cases fourteen edges without touching a single corner. See
 * `CARD` and `cardShot` in `design/layout.ts` for why that number is 15 and how
 * wide the preview window comes out; `scripts/build-cards.mjs` is where the
 * windows themselves are made.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, FONT, RULE } from '../design/tokens.ts';
import { BLOCK_PAD, CARD, INDEX_BLOCKS, INDEX_TRACK, cardShot } from '../design/layout.ts';
import { LAT_INDEX } from '../design/lattice.ts';
import { installLatticeScroll } from '../runtime/latticescroll.ts';
import * as chellbookPage from './chellbook.ts';
import * as df2tmPage from './df2tm.ts';
import * as mfnyPage from './mfny.ts';
import * as chipotlePage from './chipotle.ts';
import * as leePage from './lee.ts';
import * as guestpassPage from './guestpass.ts';
import {
  CASES,
  CASES_THESIS,
  MOTION_ARCHIVE_HREF,
  MOTION_ARCHIVE_LABEL,
  MOTION_STUDIES,
} from '../data/cases.ts';
import { STUDIO } from '../data/studio.ts';
import type { CaseRecord } from '../data/types.ts';

type BlockSpec = (typeof INDEX_BLOCKS)[number];

/** Reset so a real <button> can carry a block's geometry. */
const BTN: Record<string, string> = {
  appearance: 'none',
  '-webkit-appearance': 'none',
  background: 'transparent',
  border: '0',
  'border-radius': '0',
  margin: '0',
  padding: '0',
  color: 'inherit',
  font: 'inherit',
  'letter-spacing': 'inherit',
  'text-align': 'inherit',
  'text-decoration': 'none',
  cursor: 'pointer',
};

const LINK: Record<string, string> = {
  color: 'inherit',
  'text-decoration': 'none',
  cursor: 'pointer',
};

/** Rail and meta type: 13px on the .16em tracking every micro line here uses. */
const MICRO: Record<string, string | number> = {
  'font-size': 13,
  'letter-spacing': '.16em',
};

/**
 * Which case sits in which block.
 *
 * Written out rather than matched on the id, because two of them differ
 * (`mfny` / `mfny-concentrates`, `one-master` / `one-master-affordance`) and a
 * silent near-match is the kind of thing that puts the wrong evidence tag under
 * the wrong name.
 */
const BLOCK_CASE: Record<string, string> = {
  'after-tokens': 'after-tokens',
  chellbook: 'chellbook',
  guestpass: 'guestpass',
  lee: 'lee',
  mfny: 'mfny-concentrates',
  chipotle: 'chipotle',
  'one-master': 'one-master-affordance',
  df2tm: 'df2tm',
  'adhd-mode': 'adhd-mode',
  campeon: 'campeon',
  chickpea: 'chickpea',
  wildcard: 'wildcard',
  dither: 'dither',
  'three-zones': 'three-zones',
};

const specOf = (id: string): BlockSpec => {
  const s = INDEX_BLOCKS.find((b) => b.id === id);
  if (!s) throw new Error(`products: no block "${id}"`);
  return s;
};

const caseOf = (id: string): CaseRecord => {
  const c = CASES.find((x) => x.id === BLOCK_CASE[id]);
  if (!c) throw new Error(`products: no case for block "${id}"`);
  return c;
};

/**
 * Narrow an optional, nullable data field to a usable string. The guard that
 * keeps `href: null` from becoming an `<a>` with no href.
 */
const str = (v: string | null | undefined): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

/**
 * A block's meta line, derived from the record and never typed out.
 *
 * `evidence` is the devkit's own `evidenceStatus` — "built", "concept",
 * "simulated", "tested logic" — and it is printed verbatim. These are claim
 * boundaries, not adjectives: "simulated" is not a synonym for "built", and
 * nothing here may assemble a stronger word out of them.
 */
const metaOf = (c: CaseRecord): string =>
  [c.year, c.evidence, str(c.subpage) ? 'case study' : null].filter(Boolean).join(' · ');

/* -------------------------------------------------------------------- chrome */

/** A frame from the block table, absolutely positioned in stage space. */
function frameBox(
  id: string,
  extra: Record<string, string | number | null>,
  ...kids: (Node | string | null)[]
): HTMLElement {
  const f = specOf(id);
  return el(
    'div',
    {
      'data-frame': id,
      style: css({
        position: 'absolute',
        left: f.x,
        top: f.y,
        width: f.w,
        height: f.h,
        'z-index': '2',
        'box-sizing': 'border-box',
        ...extra,
      }),
    },
    ...kids,
  );
}

const railText = (s: string) =>
  el('span', { style: css({ ...MICRO, 'white-space': 'nowrap' }) }, s);

/**
 * The rail's inventory cell, derived rather than typed out. It names the split
 * instead of a flat count: most blocks open a deployed demo, the rest open a
 * case study in this stage, and the motion archive is neither.
 */
const INVENTORY = `${CASES.length} cases · ${MOTION_ARCHIVE_LABEL}`;

/**
 * The top rail.
 *
 * Close is the first cell, not the last. The kit's rail puts it on the right;
 * this repo's contract is that close is always top left, on every page and on
 * the evidence viewer, and that is the stronger claim — it is also what
 * `closeOf` in transitions.ts focuses when the page lands, and what every other
 * channel on this site trained the visitor to reach for.
 */
function rail(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Close, back to studio index',
      class: 'ps-hov-invert',
      style: css({
        ...BTN,
        ...MICRO,
        display: 'flex',
        'align-items': 'center',
        gap: 14,
        height: '100%',
        padding: `0 ${BLOCK_PAD.x}px`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15 }) }, '✕'),
    'close',
  );

  return frameBox(
    'rail',
    {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      color: COLOR.inkSoft,
    },
    close,
    railText('01 · product designs'),
    el('span', { style: css({ padding: `0 ${BLOCK_PAD.x}px` }) }, railText(INVENTORY)),
  );
}

/** The footer rail: the next channel, and the address. */
function railFooter(): HTMLElement {
  const next = el(
    'button',
    {
      type: 'button',
      'data-act': 'next',
      'data-next': 2,
      'aria-label': 'Next channel, 02 Paintings',
      class: 'ps-hov-invert',
      style: css({
        ...BTN,
        ...MICRO,
        display: 'flex',
        'align-items': 'center',
        gap: 14,
        height: '100%',
        padding: `0 ${BLOCK_PAD.x}px`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    // The dash stays: this string is the design handoff's own, and the four
    // `next — NN` controls are the one place DO-NOT-BREAK §4 exempts.
    'next — 02 paintings',
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '→'),
  );

  return frameBox(
    'rail-footer',
    {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      color: COLOR.inkSoft,
    },
    next,
    el('span', { style: css({ padding: `0 ${BLOCK_PAD.x}px` }) }, railText(STUDIO.email)),
  );
}

/* -------------------------------------------------------------------- blocks */

/**
 * The text column's width inside a card, which is what every label on this
 * screen is fitted against. The card less its preview window less its padding.
 */
const textW = (spec: BlockSpec): number =>
  spec.w - CARD.inset * 2 - cardShot(spec.w, spec.h) - CARD.padX * 2;

/**
 * The meta line: year, evidence, and whether the block opens a case study.
 *
 * The secondary tone is OPACITY, not `COLOR.inkSoft`. `hlInk` pins the hovered
 * control to near-black by writing `style.color` on the control itself, and an
 * inline color on a descendant outranks that inheritance — which is exactly how
 * a secondary line drops out over a vivid band. Opacity inherits the pin and
 * lands on the same near-black.
 */
const metaLine = (text: string, arrow: boolean) =>
  el(
    'span',
    {
      style: css({
        ...MICRO,
        display: 'flex',
        'align-items': 'center',
        gap: 10,
        opacity: '.72',
        'white-space': 'nowrap',
      }),
    },
    text,
    arrow
      ? el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15, 'line-height': '1' }) }, '→')
      : null,
  );

/**
 * The block's label.
 *
 * `data-fit` with an explicit budget, so `fit.ts` solves the size against the
 * TEXT COLUMN — not the block — when the screen opens, and every label is one
 * line at whatever size that takes, capped at the size the mosaic authored.
 */
const labelLine = (text: string, spec: BlockSpec, budget?: number) =>
  el(
    'span',
    {
      'data-fit': true,
      'data-fit-w': budget ?? textW(spec),
      style: css({
        'font-family': FONT.display,
        'font-feature-settings': FONT.displayFeatures,
        'font-size': spec.size,
        'line-height': '1',
        'letter-spacing': '-.02em',
        'white-space': 'nowrap',
      }),
    },
    text,
  );

/**
 * The case's one line, which this screen never used to print.
 *
 * It has always been in the data — `CaseRecord.line`, written for the old
 * table's thesis column — and dropping it when the table became a mosaic is
 * most of why a block had 150px of nothing in the middle of it. That gap was
 * never a spacing problem; it was a missing sentence. It is also the only thing
 * on the card that says what a case IS rather than what it is called.
 *
 * Clamped to three lines. Every `line` in the data is inside 80 characters, so
 * three is slack rather than a limit, but a card may not grow and an unclamped
 * line in the narrowest column would push the meta out of the card.
 */
const caseLine = (text: string, small: boolean) =>
  el(
    'span',
    {
      style: css({
        'font-size': small ? 13 : 14,
        'line-height': '1.42',
        'letter-spacing': '.005em',
        opacity: '.72',
        display: '-webkit-box',
        '-webkit-line-clamp': '3',
        '-webkit-box-orient': 'vertical',
        overflow: 'hidden',
      }),
    },
    text,
  );

/**
 * The preview window: a panel down the card's left side, at the card's full
 * height, bleeding to three of its edges.
 *
 * Decorative, and `aria-hidden`: the control that owns it already carries the
 * case's name in its accessible name, and describing the render after it reads
 * as the same thing twice.
 *
 * `object-fit: cover` with the default centred position, because these files
 * are cut to their slot by `scripts/build-cards.mjs` rather than being full
 * page captures that need steering. Cover is the guard for a block whose width
 * changes later, not the crop itself.
 */
const shot = (src: string, w: number, h: number) =>
  el('img', {
    // Marked so `redesign-check.mjs` can assert that every one of these files
    // is exactly twice the slot it is drawn into, which is what keeps
    // `cardShot` here and the sizes in `scripts/build-cards.mjs` honest.
    'data-cardshot': true,
    src: asset(src),
    alt: '',
    'aria-hidden': 'true',
    loading: 'lazy',
    decoding: 'async',
    width: w,
    height: h,
    style: css({
      display: 'block',
      flex: `0 0 ${w}px`,
      width: w,
      height: '100%',
      'object-fit': 'cover',
      // The window sits ON the card's ground, so it takes the same hairline the
      // card does on the one edge that is not the card's own.
      'box-shadow': `1px 0 0 0 ${RULE.onPaperMinor}`,
    }),
  });

/** The face every block control wears: the window, then the text column. */
const FACE: Record<string, string | number> = {
  position: 'absolute',
  inset: `${CARD.inset}px`,
  display: 'flex',
  'align-items': 'stretch',
  'box-sizing': 'border-box',
  overflow: 'hidden',
};

/**
 * Name and line as one group, the meta pinned to the card's bottom edge.
 *
 * Not `space-between` on all three, which is what the block used to do and is
 * what put the meta on the top edge and the name on the bottom with a void
 * between them. A name and its description belong to each other and sit
 * together; the meta is a footnote and sits where footnotes sit.
 */
function textColumn(c: CaseRecord, spec: BlockSpec): HTMLElement {
  const small = spec.h < 240;
  return el(
    'span',
    {
      style: css({
        display: 'flex',
        'flex-direction': 'column',
        'justify-content': 'space-between',
        flex: '1 1 auto',
        'min-width': '0',
        padding: `${small ? 16 : CARD.padY}px ${CARD.padX}px`,
        'box-sizing': 'border-box',
        overflow: 'hidden',
      }),
    },
    el(
      'span',
      { style: css({ display: 'flex', 'flex-direction': 'column', gap: small ? 8 : 11 }) },
      labelLine(c.name, spec),
      caseLine(c.line, small),
    ),
    metaLine(metaOf(c), !!str(c.subpage)),
  );
}

function blockBody(c: CaseRecord, spec: BlockSpec): (Node | null)[] {
  const w = cardShot(spec.w, spec.h);
  return [
    w && c.card ? shot(c.card, w, spec.h - CARD.inset * 2) : null,
    textColumn(c, spec),
  ];
}

/** A block that opens a deployed demo. */
const liveBlock = (c: CaseRecord, spec: BlockSpec, href: string) =>
  el(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `${c.name}, open the live project, opens in a new tab`,
      style: css({ ...LINK, ...FACE }),
    },
    ...blockBody(c, spec),
  );

/**
 * A block that opens a case study inside this stage. A real `<button>`, because
 * there is nothing deployed to point an anchor at, and an anchor promises
 * somewhere to go. `data-act` is delegated in runtime/actions.ts.
 */
const subpageBlock = (c: CaseRecord, spec: BlockSpec, act: string) =>
  el(
    'button',
    {
      type: 'button',
      'data-act': act,
      'aria-label': `${c.name}, open the case study`,
      style: css({ ...BTN, ...FACE }),
    },
    ...blockBody(c, spec),
  );

/** A record with neither a deployed href nor a subpage: legible, but inert. */
const plainBlock = (c: CaseRecord, spec: BlockSpec) =>
  el('span', { style: css({ ...FACE, cursor: 'default' }) }, ...blockBody(c, spec));

const blockControl = (c: CaseRecord, spec: BlockSpec) => {
  const sub = str(c.subpage);
  const live = str(c.href);
  if (sub) return subpageBlock(c, spec, sub);
  // An absolute href is somebody else's deployment; a relative one is a page
  // this site hosts, and has to be resolved against the build's base.
  if (live) return liveBlock(c, spec, /^[a-z]+:/i.test(live) ? live : asset(live));
  return plainBlock(c, spec);
};

/**
 * The source repository — a SIBLING of the block's control, laid over its top
 * right corner, never inside it. Two reasons, both hard: an anchor may not
 * nest, and `wireHovers` picks the innermost pointer element, so a link inside
 * the block's link would move the band stack onto the word "source".
 */
const sourceLink = (c: CaseRecord, spec: BlockSpec, href: string) =>
  el(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `${c.name}, source code, opens in a new tab`,
      style: css({
        ...LINK,
        ...MICRO,
        position: 'absolute',
        /*
          Bottom right of the CARD, level with the meta line rather than above
          it. It used to sit top right, which on the narrower blocks put it on
          the same row as the meta and read as the end of that sentence — "2026
          · simulated ... source". Down here the two are a pair holding the
          card's bottom edge, one on each side, and neither can be read as the
          continuation of the other.
        */
        right: CARD.inset + CARD.padX,
        bottom: CARD.inset + (spec.h < 240 ? 16 : CARD.padY),
        'z-index': '3',
        // Opacity, not a color, for the same reason the meta line uses it.
        opacity: '.72',
        'border-bottom': `1px solid currentColor`,
      }),
    },
    'source',
  );

/**
 * The motion archive: the mosaic's one layout exception, per the kit. Label
 * left, meta right, both sitting on the card's bottom edge. It is a destination
 * rather than a case — it opens the 58-study archive — so it takes no evidence
 * tag and never goes through the case block builder.
 *
 * WHAT IT SHOWS NOW. The kit's arrangement leaves everything above that bottom
 * row empty, which in an 1800 × 240 band is most of the largest block on the
 * screen holding nothing. It used to spend that on a comma-separated list of
 * five slugs — the names of motion studies, printed as text, on the one block
 * whose whole subject is what motion looks like. So the band above the label
 * carries the eight posters instead, at 16:9, which is the shape they were
 * captured in.
 *
 * The kit's bottom row is unchanged: this adds to the block, it does not
 * rearrange it.
 */
/**
 * Frames at 16:9, the shape the studies were captured in.
 *
 * 163 and not 210. At 210 the eight filled the card's inner width edge to edge
 * and the band became a wall of saturated color — the loudest thing on a screen
 * whose subject is the fourteen cases under it, and a poster rather than a
 * strip. At 163 the same eight sit in the same width with air between them,
 * which is what a contact strip looks like, and it leaves the 36px label
 * underneath as the block's loudest mark.
 */
const STRIP = { w: 163, h: 92, gap: 6 } as const;

function motionBlock(spec: BlockSpec): HTMLElement {
  const frames = MOTION_STUDIES.map((m) =>
    el('img', {
      // The archive's own posters, re-encoded to the strip's size — 800 × 450
      // PNGs are 292 kB across the eight and this screen already carries
      // fourteen card windows.
      src: asset(`motion/strip/${m.slug}.webp`),
      alt: '',
      'aria-hidden': 'true',
      loading: 'lazy',
      decoding: 'async',
      width: STRIP.w,
      height: STRIP.h,
      style: css({
        display: 'block',
        flex: `0 0 ${STRIP.w}px`,
        width: STRIP.w,
        height: STRIP.h,
        'object-fit': 'cover',
        'box-shadow': `inset 0 0 0 1px ${RULE.onPaperMinor}`,
      }),
    }),
  );

  return el(
    'a',
    {
      href: asset(MOTION_ARCHIVE_HREF),
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `Motion studies, open the archive, ${MOTION_ARCHIVE_LABEL}, opens in a new tab`,
      style: css({
        ...LINK,
        ...FACE,
        'flex-direction': 'column',
        'justify-content': 'space-between',
        padding: `16px ${CARD.padX}px`,
      }),
    },
    el(
      'span',
      { style: css({ display: 'flex', gap: STRIP.gap, 'justify-content': 'space-between' }) },
      ...frames,
    ),
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'align-items': 'flex-end',
          'justify-content': 'space-between',
        }),
      },
      labelLine('motion studies', spec, 520),
      el(
        'span',
        { style: css({ ...MICRO, opacity: '.72', 'white-space': 'nowrap' }) },
        MOTION_ARCHIVE_LABEL,
      ),
    ),
  );
}

/**
 * The card's edge.
 *
 * A hairline rectangle inset half a lattice step inside the block, and the
 * whole reason fourteen cases now read as fourteen objects instead of
 * twenty-eight fragments. Blocks tile the band with no gutters — adjacent ones
 * share their edges — so the inset opens a one-step channel between any two
 * cards with a column of crosshairs running down it, and leaves the block's own
 * four corner pegs OUTSIDE the card, framing it.
 *
 * A LINE AND NOT A FILL, and that is not a small distinction. The hover band is
 * painted into the screen's band host at z 0, under the lattice at z 1, which
 * is what keeps the crosshairs visible over a vivid band. An opaque card would
 * sit at z 2 and hide the band completely — the same trap `.ps-hov-evidence`
 * documents for page 03's hero. A hairline costs the band nothing.
 *
 * `pointer-events: none` because `wireHovers` binds the innermost element whose
 * cursor computes to pointer, and a box laid over the control could take it.
 */
const cardFrame = () =>
  el('span', {
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      inset: `${CARD.inset}px`,
      'box-shadow': `inset 0 0 0 1px ${RULE.onPaperMinor}`,
      'pointer-events': 'none',
      'z-index': '1',
    }),
  });

/**
 * One mosaic block.
 *
 * The frame is the positioned box; the card's edge is drawn inside it; the
 * control fills the card; the source link sits over it. `data-b*` carries the geometry in design px so `latticescroll.ts`
 * can compute a corner's lattice address without measuring anything, and `top`
 * is track-local — the mosaic's own origin is the band's top edge.
 */
function block(spec: BlockSpec, i: number): HTMLElement {
  const isMotion = spec.id === 'motion';
  const c = isMotion ? null : caseOf(spec.id);
  const src = c ? str(c.source) : null;

  return el(
    'div',
    {
      'data-ixblock': spec.id,
      'data-frame': spec.id,
      'data-bx': spec.x,
      'data-by': spec.y - INDEX_TRACK.y,
      'data-bw': spec.w,
      'data-bh': spec.h,
      'data-intro': 'wipeX',
      'data-in-delay': 120 + i * 40,
      'data-in-dur': 330,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: spec.x,
        top: spec.y - INDEX_TRACK.y,
        width: spec.w,
        height: spec.h,
        'z-index': '2',
        'box-sizing': 'border-box',
      }),
    },
    cardFrame(),
    isMotion || !c ? motionBlock(spec) : blockControl(c, spec),
    c && src ? sourceLink(c, spec, src) : null,
  );
}

/* -------------------------------------------------------------------- track */

/**
 * The band the mosaic reorganizes inside.
 *
 * NOT a scroll container. It used to be one, with the browser's own snapping
 * doing the settling, and a native container translates its content — which
 * meant that between two rest positions the mosaic was visibly sliding, and a
 * block caught half way had two of its four corners off the lattice.
 *
 * So this is an input surface: `overflow: hidden`, nothing to translate, and
 * `runtime/latticescroll.ts` turning the wheel, the arrows and a swipe into a
 * row index. Every block's `top` is written from that index and from nothing
 * else, so the only positions that exist are the ones where the band is full
 * and every corner is on a point. `touch-action: none` because the module
 * consumes the gesture itself and the browser must not also try to pan.
 *
 * It keeps `tabindex` and the scrollable region role: to a keyboard or a
 * screen reader this is still a region you move through with the arrows, and
 * `latticescroll.ts` binds those keys because there is no native scroller left
 * to provide them.
 */
function trackRegion(): HTMLElement {
  const mosaic = INDEX_BLOCKS.filter((b) => b.track);

  const track = el(
    'div',
    { style: css({ position: 'relative', width: '100%' }) },
    ...mosaic.map(block),
  );

  const region = el(
    'div',
    {
      'data-ixscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `The index, ${CASES.length} cases and the motion archive, scrollable`,
      style: css({
        position: 'absolute',
        inset: '0',
        overflow: 'hidden',
        'touch-action': 'none',
        'overscroll-behavior': 'contain',
      }),
    },
    track,
  );

  /*
    No thumb and no rail. The position mark is the LATTICE's own outermost
    column of points: while a step is running, `latticescroll.ts` lights a
    short run of ink pegs there, and drops them at settle. A widget floating
    above the field would say the scroll is a different thing from the
    crosshairs, and the whole direction here is that it is not.
  */
  return el(
    'div',
    {
      style: css({
        position: 'absolute',
        left: 0,
        right: 0,
        top: INDEX_TRACK.y,
        height: INDEX_TRACK.h,
        'z-index': '2',
        overflow: 'hidden',
      }),
    },
    region,
  );
}

/* --------------------------------------------------------------------- build */

export function build(): HTMLElement {
  const frost = el('canvas', {
    'data-frost': 'field',
    'data-mode': 1,
    'data-rest-mode': 1,
    'data-rest-op': '.17',
    'data-rest-rate': 1.5,
    'data-boost': 3,
    width: 288,
    height: 162,
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      'image-rendering': 'pixelated',
      'pointer-events': 'none',
      opacity: '0',
      'z-index': '0',
    }),
  });

  /*
    The band host. z 0, so every band the hover treatment paints lands UNDER
    the lattice at z 1. Empty at rest; `hover.ts` fills it.
  */
  const bandHost = el('div', {
    'data-bandhost': true,
    'aria-hidden': 'true',
    style: css({ position: 'absolute', inset: '0', 'z-index': '0', 'pointer-events': 'none' }),
  });

  const titleSpec = specOf('title');
  const title = frameBox(
    'title',
    { display: 'flex', 'align-items': 'center', padding: `0 ${BLOCK_PAD.x}px`, 'z-index': '3' },
    el(
      'div',
      {
        'data-ptitle': true,
        style: css({
          'font-family': FONT.display,
          'font-feature-settings': FONT.displayFeatures,
          'font-size': titleSpec.size,
          'line-height': '1',
          'letter-spacing': '-.02em',
          'white-space': 'nowrap',
        }),
      },
      ...letters('product designs'),
    ),
  );

  const standfirst = frameBox(
    'standfirst',
    {
      display: 'flex',
      'align-items': 'center',
      padding: `0 ${BLOCK_PAD.x}px`,
      'font-size': specOf('standfirst').size,
      'line-height': '1.4',
      'letter-spacing': '.01em',
      color: COLOR.inkSoft,
      overflow: 'hidden',
    },
    CASES_THESIS,
  );

  const body = el(
    'div',
    {
      'data-pbody': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '2', opacity: '0' }),
    },
    rail(),
    standfirst,
    trackRegion(),
    railFooter(),
  );

  const page = el(
    'section',
    {
      'data-page': 1,
      'data-screen-label': 'Page 01 product designs',
      role: 'region',
      'aria-label': 'Product designs',
      'aria-hidden': 'true',
      inert: true,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '6',
        display: 'none',
        background: COLOR.paper,
        color: COLOR.ink,
        overflow: 'hidden',
      }),
    },
    frost,
    bandHost,
    title,
    body,
    /*
      The six case studies live inside this page, the way page 03 carries the
      Kona N one: each resolves its parts with `screen.closest('[data-page]')`,
      and grows out of the block that opened it rather than arriving as a
      separate route.
    */
    chellbookPage.build(),
    df2tmPage.build(),
    mfnyPage.build(),
    chipotlePage.build(),
    leePage.build(),
    guestpassPage.build(),
  );

  /*
    The lattice and its scroll, mounted from the builder because
    `runtime/stage.ts` only mounts the menu's and this module owns no other
    hook into boot. Nothing here measures: the field is built now, and every
    pass that reads a rect waits for the screen to be displayed.
  */
  installLatticeScroll(page, LAT_INDEX, INDEX_TRACK);

  return page;
}
