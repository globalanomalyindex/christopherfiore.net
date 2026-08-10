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
 * WHAT SCROLLS, AND WHAT DOES NOT. The lattice is the substrate and never
 * moves. Neither do the rails. Only the mosaic moves, inside the band between
 * them, and `runtime/latticescroll.ts` dissolves each block into the field as
 * it reaches an edge. The title and the standfirst are pinned with the rails
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
 * one against its block's inner width when the screen opens. That is not
 * tidiness either: `wrapWord` rebuilds a hovered label out of inline spans
 * whose spaces are `white-space: pre`, which removes the wrap opportunity, so a
 * label that wrapped at rest would snap to one long line under the cursor and
 * run out of its block.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, FONT } from '../design/tokens.ts';
import { BLOCK_PAD, INDEX_BLOCKS, INDEX_TRACK, blockTakesCover } from '../design/layout.ts';
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
 * Meta on top, then the plate if the block earns one, then the label.
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
 * block's own inner width when the screen opens and every label is one line at
 * whatever size that takes, capped at the size the mosaic authored.
 */
const labelLine = (text: string, spec: BlockSpec) =>
  el(
    'span',
    {
      'data-fit': true,
      'data-fit-w': spec.w - BLOCK_PAD.x * 2,
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
 * The cover plate. Decorative here: the control that owns it already carries
 * the case's name in its accessible name, and repeating the render's
 * description after it reads as the same thing twice.
 */
const cover = (src: string, spec: BlockSpec) =>
  el('img', {
    src: asset(src),
    alt: '',
    'aria-hidden': 'true',
    loading: 'lazy',
    decoding: 'async',
    width: Math.round(spec.w - BLOCK_PAD.x * 2),
    height: Math.round(spec.h - BLOCK_PAD.y * 2),
    style: css({
      display: 'block',
      flex: '1 1 auto',
      'min-height': '0',
      width: '100%',
      margin: '14px 0',
      'object-fit': 'cover',
      // The strip is about 115px of a 16:9 capture, so it is a crop whatever
      // happens. Anchored to the top because that is where a screen capture
      // puts the thing it is a capture OF, and a centered crop lands on body
      // text sliced through the middle of a line.
      'object-position': 'center top',
    }),
  });

/** The face every block control wears: padded, meta up, label down. */
const FACE: Record<string, string | number> = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  'flex-direction': 'column',
  'justify-content': 'space-between',
  padding: `${BLOCK_PAD.y}px ${BLOCK_PAD.x}px`,
  'box-sizing': 'border-box',
  overflow: 'hidden',
};

function blockBody(c: CaseRecord, spec: BlockSpec): (Node | null)[] {
  const plate = c.image && blockTakesCover(spec.w, spec.h) ? cover(c.image, spec) : null;
  return [metaLine(metaOf(c), !!str(c.subpage)), plate, labelLine(c.name, spec)];
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
  if (live) return liveBlock(c, spec, live);
  return plainBlock(c, spec);
};

/**
 * The source repository — a SIBLING of the block's control, laid over its top
 * right corner, never inside it. Two reasons, both hard: an anchor may not
 * nest, and `wireHovers` picks the innermost pointer element, so a link inside
 * the block's link would move the band stack onto the word "source".
 */
const sourceLink = (c: CaseRecord, href: string) =>
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
        right: BLOCK_PAD.x,
        top: BLOCK_PAD.y,
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
 * left, meta right, both sitting on the block's bottom edge. It is a
 * destination rather than a case — it opens the 58-study archive — so it takes
 * no cover plate and no evidence tag.
 */
function motionBlock(spec: BlockSpec): HTMLElement {
  const strip = MOTION_STUDIES.slice(0, 5)
    .map((m) => m.slug)
    .join(', ');
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
        'flex-direction': 'row',
        'align-items': 'flex-end',
        'justify-content': 'space-between',
      }),
    },
    labelLine('motion studies', spec),
    el(
      'span',
      {
        style: css({
          ...MICRO,
          opacity: '.72',
          'text-align': 'right',
          'white-space': 'nowrap',
        }),
      },
      `${MOTION_ARCHIVE_LABEL} · ${strip}`,
    ),
  );
}

/**
 * One mosaic block.
 *
 * The frame is the positioned box; the control fills it; the source link sits
 * over it. `data-b*` carries the geometry in design px so `latticescroll.ts`
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
    isMotion || !c ? motionBlock(spec) : blockControl(c, spec),
    c && src ? sourceLink(c, src) : null,
  );
}

/* -------------------------------------------------------------------- track */

/**
 * The scrolling band.
 *
 * A native scroll container, as every other scrolling column on this site is,
 * with the browser's own snapping doing the settling. The snap targets are
 * flow spacers, one per mosaic row and exactly its height, so the rest
 * positions are the row boundaries and never an arbitrary pixel — which is the
 * whole reason a settled block's four corners are always on the lattice.
 */
function trackRegion(): HTMLElement {
  const mosaic = INDEX_BLOCKS.filter((b) => b.track);
  const rows = Array.from(new Set(mosaic.map((b) => b.y))).sort((a, b) => a - b);
  const rowH = rows.map((y) => Math.max(...mosaic.filter((b) => b.y === y).map((b) => b.h)));

  const spacers = rowH.map((h) =>
    el('span', {
      'aria-hidden': 'true',
      style: css({
        display: 'block',
        height: h,
        'scroll-snap-align': 'start',
        'pointer-events': 'none',
      }),
    }),
  );

  const track = el(
    'div',
    { style: css({ position: 'relative', width: '100%' }) },
    ...spacers,
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
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'scroll-snap-type': 'y mandatory',
        'scrollbar-width': 'none',
        'overscroll-behavior': 'contain',
      }),
    },
    track,
  );

  /*
    No thumb and no rail. The scroll indicator is the LATTICE's own outermost
    column of points: while a gesture is live, `latticescroll.ts` lights a
    short run of ink pegs there that tracks the position, and drops them at
    settle. A widget floating above the field would say the scroll is a
    different thing from the crosshairs, and the whole direction here is that
    it is not.
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
