/**
 * Page 01's subpage — the chellbook case study.
 *
 * The product-designs table lists chellbook as one row with no live demo to
 * link to, because there is no shipped app. This screen is what that row opens
 * instead: the case study, in the stage, in the same system as page 03's
 * branchial lateral spine screen.
 *
 * It is composed the way that screen is, one column count wider:
 *
 *   the doors        the TWO hosted prototypes, pinned into the title band at
 *                    the top right where nothing can bury them. Real anchors,
 *                    new tab, each carrying its label, its note and its own
 *                    fidelity word verbatim.
 *   the plate        a 581.8 × 556 box showing any of the nine flow boards
 *                    `object-fit: contain` — never cropped; the boards run to
 *                    1600 × 3338 and a cover crop would hide most of a flow.
 *   the index        nine board rows beside it.
 *   the specimen     the four safety states, rendered in chellbook's own wash
 *                    and ink, with the dashed edge on unknown alone.
 *   the text half    loop, rules, IA, flows, motion, open questions and
 *                    caveats in a scrolling column with its own rust rail —
 *                    a real focusable region, nothing focusable inside it.
 *
 * CHELLBOOK'S LANGUAGE IS A SAFETY BOUNDARY, NOT COPY. It is a coeliac product,
 * its own handoff calls several of its rules "legal constraints, not
 * preferences", and it is concept-stage: no app, no logo, six named undesigned
 * questions. Every string on this screen is printed verbatim from
 * `src/data/chellbook.ts`. Nothing here paraphrases a rule, shortens a
 * `meaning`, or assembles a qualifier from fragments at runtime — a qualifier
 * that is built is a qualifier that can lose a clause. `CHELL.state` ("concept ·
 * design spec") sits in the header and in the title band; `CHELL_CAVEATS[0]`
 * sits in the footer, where it cannot be scrolled past; and the full
 * `CHELL_OPEN` and `CHELL_CAVEATS` lists are printed in the text column.
 *
 * "verified" here never means safe, and this screen never says the app checks
 * anything: it renders the four states as a specimen of a design system and
 * lets the product's own sentences say what each one claims.
 *
 * THE ONE DELIBERATE DEPARTURE FROM THE PALETTE RULE is the safety-state
 * specimen. Everywhere else on this site, type on a color band is `#0B0B0C`
 * and the band comes from `LIGHTS`. The four state cards instead use
 * chellbook's own `wash`/`ink` pairs, because a specimen repainted in the
 * host's palette is not a specimen of anything. The pairs carry their own
 * legibility (measured 6.8 / 5.0 / 5.9 / 5.8 : 1), they are boxed under a
 * header that names them as a specimen, and every other pixel of chrome around
 * them is this site's — which is what makes them read as a sample of another
 * product's system rather than as this site changing color. The dashed edge is
 * load-bearing and belongs to `unknown` alone: absence of information must
 * never be renderable as a pass.
 *
 * Geometry is page 03's band heights and module margin, close is top-left, the
 * corner radius is 0 and the only shadows are 1px frames. `src/runtime/
 * chellbook.ts` grows it out of whatever element was clicked with the same
 * clip-path grow, dither veil and pulsing settle the pages use.
 */

import { asset, css, el } from '../dom.ts';
import { COLOR, LIGHTS, RULE } from '../design/tokens.ts';
import { MODULE, PAGE3, STAGE } from '../design/layout.ts';
import {
  CHELL,
  CHELL_BOARDS,
  CHELL_CAVEATS,
  CHELL_FLOWS,
  CHELL_IA,
  CHELL_LOOP,
  CHELL_MOTION,
  CHELL_OPEN,
  CHELL_PROTOTYPES,
  CHELL_RULES,
  CHELL_STATES,
} from '../data/chellbook.ts';
import type { TableRow } from '../data/types.ts';

/** Lavender hairlines: the dark-ground pair, as on the page-03 case study. */
const MAJOR = RULE.onRustMajor;
const MINOR = RULE.onRustMinor;

const KARRIK = "'Karrik',sans-serif";

/**
 * A band color, always from LIGHTS, always carrying `#0B0B0C` ink. Indexed
 * rather than picked at random so the same section is the same color on every
 * open. (The safety-state cards are the documented exception — see the file
 * header. They are not bands, they are a specimen.)
 */
const light = (i: number): string => LIGHTS[i % LIGHTS.length];

const two = (n: number): string => String(n).padStart(2, '0');

/* ------------------------------------------------------------- geometry */

/**
 * Columns, on module fractions with half-module gutters:
 *
 *   72.727 + 581.82 (8M plate) + 36.36 + 218.18 (3M index) + 36.36
 *     + 432.73 + 36.36 + 432.73 = 1847.27 = 1920 − 72.727
 *
 * The plate is 8 modules rather than page 03's 13 because these sheets are the
 * opposite shape: the flow boards are 1600 × 2166–3338, so height is the scarce
 * dimension and width spent on a plate is width letterboxed away.
 */
const GUTTER = MODULE / 2;
const PLATE_W = MODULE * 8;
const INDEX_W = MODULE * 3;
const INDEX_X = MODULE + PLATE_W + GUTTER;
const RIGHT_X = INDEX_X + INDEX_W + GUTTER;
const RIGHT_W = STAGE.w - MODULE - RIGHT_X;
/** The right half is two equal columns: the specimen, then the text. */
const COL_W = (RIGHT_W - GUTTER) / 2;
const TEXT_X = RIGHT_X + COL_W + GUTTER;

const CB = {
  headerH: PAGE3.headerH, // 62 — the same band page 03 and its case study use
  footerH: PAGE3.footerH, // 88
  title: { x: MODULE, y: 88, size: 152, lh: 146, track: '-.05em' },
  descriptorY: 246,
  metaY: 288,
  ruleY: 318,
  /** the two doors, pinned into the title band so nothing can bury them */
  protos: { x: RIGHT_X, y: 88, w: COL_W, h: 184, gap: GUTTER },
  /** the content band: below the title rule, above the footer */
  bandY: 336,
  bandEnd: 976,
  /** contain, not cover — a cropped flow board is a hidden flow */
  plate: { x: MODULE, y: 336, w: PLATE_W, h: 556 },
  plateCaption: { x: MODULE, y: 904, w: PLATE_W },
  index: { x: INDEX_X, y: 336, w: INDEX_W },
  indexRowsY: 370,
  indexRowH: 50, // 9 rows × 50 = 450 → 820
  indexNoteY: 844,
  /** the safety-state specimen */
  states: { x: RIGHT_X, y: 336, w: COL_W, headH: 54, rowH: 137, gap: 10 },
  statesRowsY: 398, // 398 + 4×137 + 3×10 = 976
  text: { x: TEXT_X, y: 336, w: COL_W },
  /** the "you are here" bar above the scrolling column */
  secBarH: 34,
  secBarGap: 12,
  railW: 6,
} as const;

const TEXT_H = CB.bandEnd - CB.text.y;
const SCROLL_TOP = CB.secBarH + CB.secBarGap;
/** right padding on the scroll region: clears the rail and gives it air */
const SCROLL_PAD = CB.railW + 16;

/* ------------------------------------------------------------- the doors */

/**
 * One hosted prototype. These are the headline of the screen: both files are
 * self-contained HTML sitting in `public/`, and someone landing here should be
 * one obvious click from the 30-screen showcase.
 *
 * `fidelity` is printed on its own chip and never softened — "low fidelity ·
 * context only" is the exploration's own description of itself, and a wireframe
 * board presented as a spec would misrepresent both. The accessible name says
 * the link opens in a new tab, because it does.
 *
 * The 1px frame sits on a wrapper rather than on the anchor. base.css paints
 * the focus band with `box-shadow`, and an inline `box-shadow` on the anchor
 * would outrank it — the same collision HOVER_CLASSES.md records for the page
 * 03 hero, solved there with a class and here with one more div, because this
 * file may not add CSS.
 */
function protoCard(p: (typeof CHELL_PROTOTYPES)[number], i: number): HTMLElement {
  const link = el(
    'a',
    {
      href: asset(p.href),
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `Open the chellbook ${p.label} prototype, ${p.fidelity}, in a new tab`,
      class: 'ps-hov-invert-dark',
      style: css({
        position: 'absolute',
        inset: '0',
        display: 'flex',
        'flex-direction': 'column',
        padding: 16,
        cursor: 'pointer',
        // no inline `color` here: base.css already inherits it for every anchor
        // in the stage, and an inline one would outrank .ps-hov-invert-dark,
        // leaving lavender ink on the lavender hover fill
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'justify-content': 'space-between',
          gap: 12,
          'font-size': 11.5,
          'letter-spacing': '.22em',
          opacity: '.72',
        }),
      },
      el('span', {}, `hosted prototype ${two(i + 1)} / ${two(CHELL_PROTOTYPES.length)}`),
      el('span', { 'aria-hidden': 'true' }, 'new tab ↗'),
    ),
    el(
      'span',
      {
        style: css({
          display: 'block',
          margin: '12px 0 10px',
          'font-family': KARRIK,
          'font-size': 30,
          'line-height': '1.05',
          'letter-spacing': '-.02em',
        }),
      },
      p.label,
    ),
    el(
      'span',
      {
        style: css({
          'align-self': 'flex-start',
          background: light(i * 4),
          color: COLOR.nearBlack,
          'font-size': 11.5,
          'letter-spacing': '.22em',
          padding: '5px 9px',
        }),
      },
      p.fidelity,
    ),
    el(
      'span',
      {
        style: css({
          display: 'block',
          'margin-top': 'auto',
          'font-size': 13,
          'letter-spacing': '.06em',
          'line-height': '1.45',
          opacity: '.88',
          'text-wrap': 'pretty',
        }),
      },
      p.note,
    ),
  );

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 70 + i * 60,
      'data-in-dur': 380,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.protos.x + i * (CB.protos.w + CB.protos.gap),
        top: CB.protos.y,
        width: CB.protos.w,
        height: CB.protos.h,
        'box-shadow': `0 0 0 1px ${MAJOR}`,
      }),
    },
    link,
  );
}

/* --------------------------------------------------------------- the plate */

/**
 * One stacked board. `src` is deliberately absent: `runtime/chellbook.ts` moves
 * `data-src` across the first time a board is shown and pre-warms its two
 * neighbours, the way the page-03 viewer does with its sheets.
 *
 * The `[data-evslot]` structural rule in pages.css belongs to that viewer, so
 * the equivalent four declarations are inline here rather than borrowed.
 */
const boardSlot = (b: (typeof CHELL_BOARDS)[number], n: number) =>
  el(
    'div',
    {
      'data-cbslot': n,
      // only the shown board is in the accessibility tree; the other eight
      // would otherwise all announce their alt text at once
      'aria-hidden': n === 0 ? 'false' : 'true',
      style: css({
        position: 'absolute',
        inset: '0',
        overflow: 'hidden',
        opacity: n === 0 ? '1' : '0',
        transition: 'opacity 240ms linear',
      }),
    },
    el('img', {
      'data-src': asset(b.image),
      alt: b.alt,
      decoding: 'async',
      width: b.width,
      height: b.height,
      style: css({
        display: 'block',
        width: '100%',
        height: '100%',
        // contain, not cover: these boards are up to 1600 × 3338 and a cover
        // crop in this box would show about a fifth of a flow
        'object-fit': 'contain',
      }),
    }),
  );

function plate(): HTMLElement {
  return el(
    'div',
    {
      'data-cbplate': true,
      style: css({
        position: 'absolute',
        left: CB.plate.x,
        top: CB.plate.y,
        width: CB.plate.w,
        height: CB.plate.h,
        'z-index': '2',
        'box-shadow': `0 0 0 1px ${MAJOR}`,
      }),
    },
    ...CHELL_BOARDS.map(boardSlot),
    ...(['tl', 'tr', 'bl', 'br'] as const).map((c) =>
      el('span', {
        'aria-hidden': 'true',
        class: `ps-corner ps-corner-${c}`,
        // the crosshair is rust on the page; on the plaque ground it is lavender
        style: css({ '--ps-cross': 'rgba(223,203,250,.62)' }),
      }),
    ),
  );
}

/** The plate's caption: the board's own label, then its own caption line. */
function plateCaption(): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 300,
      'aria-live': 'polite',
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.plateCaption.x,
        top: CB.plateCaption.y,
        width: CB.plateCaption.w,
      }),
    },
    el(
      'span',
      {
        'data-cblabel': true,
        style: css({
          display: 'block',
          'font-size': 11.5,
          'letter-spacing': '.22em',
          opacity: '.7',
          'margin-bottom': 9,
        }),
      },
      `board ${two(1)} · ${CHELL_BOARDS[0].label}`,
    ),
    el(
      'span',
      {
        'data-cbcap': true,
        style: css({
          display: 'block',
          'font-size': 13,
          'letter-spacing': '.16em',
          'line-height': '1.5',
          'text-wrap': 'pretty',
        }),
      },
      CHELL_BOARDS[0].caption,
    ),
  );
}

/* -------------------------------------------------------------- the chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'chellbook-close',
      'aria-label': 'Close the chellbook case study, back to Product designs',
      class: 'ps-hov-invert-dark',
      style: css({
        'grid-column': 'span 2',
        display: 'flex',
        'align-items': 'center',
        gap: 16,
        padding: '0 20px 0 56px',
        'border-right': `1px solid ${MINOR}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15 }) }, '✕'),
    'close',
  );

  const cell = (
    text: string,
    span: number,
    rule: boolean,
    attrs: Record<string, string | number | boolean> = {},
  ) =>
    el(
      'span',
      {
        ...attrs,
        style: css({
          'grid-column': `span ${span}`,
          display: 'flex',
          'align-items': 'center',
          padding: span === 4 ? '0 56px 0 20px' : '0 20px',
          'border-right': rule ? `1px solid ${MINOR}` : null,
        }),
      },
      text,
    );

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 0,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: CB.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    // the state is the first thing after the close, on every screen of this
    // case study: it is concept-stage and never claims otherwise
    cell(`${CHELL.name} · ${CHELL.state}`, 3, true),
    cell(`board 01 / ${two(CHELL_BOARDS.length)}`, 3, true, { 'data-cbcount': true }),
    cell(CHELL.scale, 4, false),
  );
}

/**
 * The title block. `CHELL.name` at display scale with `CHELL.descriptor` under
 * it, and the class / year / state line beside the tagline.
 *
 * 152px, matching the page-03 case study: both are screens inside a channel and
 * both sit below their channel's own title in the hierarchy. `h2`, not `h1` —
 * the document's one real `h1` is the wordmark in index.html.
 */
function titleBlock(): HTMLElement[] {
  const h2 = el(
    'h2',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 40,
      'data-in-dur': 420,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.title.x,
        top: CB.title.y,
        margin: '0',
        'font-family': KARRIK,
        'font-weight': '400',
        'font-size': CB.title.size,
        'line-height': `${CB.title.lh}px`,
        'letter-spacing': CB.title.track,
        'white-space': 'nowrap',
      }),
    },
    CHELL.name,
  );

  const descriptor = el(
    'p',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 130,
      'data-in-dur': 340,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.title.x,
        top: CB.descriptorY,
        width: 760,
        margin: '0',
        'font-family': KARRIK,
        'font-size': 20,
        'line-height': '1.4',
        'letter-spacing': '.005em',
        opacity: '.88',
      }),
    },
    CHELL.descriptor,
  );

  const meta = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 190,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.title.x,
        top: CB.metaY,
        width: STAGE.w - CB.title.x * 2,
        display: 'flex',
        'justify-content': 'space-between',
        gap: 40,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.8',
      }),
    },
    el('span', {}, `${CHELL.klass} · ${CHELL.year} · ${CHELL.state}`),
    el('span', {}, CHELL.tagline),
  );

  const rule = el('span', {
    'aria-hidden': 'true',
    'data-intro': 'wipeX',
    'data-in-delay': 230,
    'data-in-dur': 380,
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: CB.title.x,
      top: CB.ruleY,
      width: STAGE.w - CB.title.x * 2,
      height: 1,
      background: MAJOR,
    }),
  });

  return [h2, descriptor, meta, rule];
}

function footer(): HTMLElement {
  const step = (delta: number, label: string, arrow: string, first: boolean) =>
    el(
      'button',
      {
        type: 'button',
        'data-act': 'chellbook-step',
        'data-step': delta,
        'aria-label': first ? 'Previous flow board' : 'Next flow board',
        class: 'ps-hov-invert-dark',
        style: css({
          'grid-column': 'span 4',
          display: 'flex',
          'align-items': 'center',
          'justify-content': first ? 'flex-start' : 'space-between',
          gap: first ? 18 : null,
          padding: first ? '0 20px 0 56px' : '0 56px 0 20px',
          'border-right': first ? `1px solid ${MINOR}` : null,
          transition: 'background 150ms linear,color 150ms linear',
        }),
      },
      ...(first
        ? [
            el(
              'span',
              { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) },
              arrow,
            ),
            label,
          ]
        : [
            label,
            el(
              'span',
              { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) },
              arrow,
            ),
          ]),
    );

  /*
    The concept-stage caveat, verbatim from CHELL_CAVEATS[0]. It sits in the
    footer rather than in the text column for the same reason page 03's release
    boundary does: the text column scrolls, and this may never scroll out of
    view. There is no app; the screen says so without being asked.
  */
  const caveat = el(
    'span',
    {
      style: css({
        'grid-column': 'span 4',
        display: 'flex',
        'align-items': 'center',
        padding: '0 20px',
        'border-right': `1px solid ${MINOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
        'line-height': '1.5',
        'text-wrap': 'pretty',
      }),
    },
    CHELL_CAVEATS[0],
  );

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 230,
      'data-in-dur': 360,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: CB.footerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-top': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    step(-1, 'previous board', '←', true),
    caveat,
    step(1, 'next board', '→', false),
  );
}

/* --------------------------------------------------------- the index column */

function indexRow(b: (typeof CHELL_BOARDS)[number], n: number): HTMLElement {
  return el(
    'button',
    {
      type: 'button',
      'data-act': 'chellbook-go',
      'data-board': n,
      'data-cbrow': n,
      'aria-current': n === 0 ? 'true' : 'false',
      'aria-label': `Board ${two(n + 1)}, ${b.label}`,
      'data-intro': 'wipeX',
      'data-in-delay': 150 + n * 24,
      'data-in-dur': 300,
      class: 'ps-hov-invert-dark',
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        top: n * CB.indexRowH,
        width: '100%',
        height: CB.indexRowH,
        display: 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        gap: 5,
        // the current-board marker; a border, not a box-shadow, so it cannot
        // collide with the focus ring band base.css paints with box-shadow
        'border-left': `3px solid ${n === 0 ? COLOR.lavender : 'transparent'}`,
        'border-bottom': `1px solid ${MINOR}`,
        padding: '0 10px',
        opacity: n === 0 ? '1' : '.62',
        transition: 'background 160ms linear,color 160ms linear,opacity 160ms linear',
      }),
    },
    el(
      'span',
      {
        style: css({
          'font-family': KARRIK,
          'font-size': 15,
          'letter-spacing': '-.01em',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
          width: '100%',
        }),
      },
      b.label,
    ),
    el(
      'span',
      { style: css({ 'font-size': 11.5, 'letter-spacing': '.13em', opacity: '.78' }) },
      `${two(n + 1)} · ${b.width} × ${b.height}`,
    ),
  );
}

function index(): HTMLElement[] {
  const head = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 110,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.index.x,
        top: CB.index.y,
        width: CB.index.w,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
        display: 'flex',
        'justify-content': 'space-between',
        padding: '0 10px 9px',
        'border-bottom': `1px solid ${MAJOR}`,
      }),
    },
    el('span', {}, 'board'),
    el('span', {}, two(CHELL_BOARDS.length)),
  );

  const rows = el(
    'div',
    {
      style: css({
        position: 'absolute',
        left: CB.index.x,
        top: CB.indexRowsY,
        width: CB.index.w,
        height: CHELL_BOARDS.length * CB.indexRowH,
      }),
    },
    ...CHELL_BOARDS.map(indexRow),
  );

  /*
    The boards are exported at 2x and shown at their own aspect ratio, which is
    why the plate letterboxes rather than crops. Saying so here is the same
    courtesy the page-03 plate's `contain` note is.
  */
  const note = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 380,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.index.x,
        top: CB.indexNoteY,
        width: CB.index.w,
        padding: '0 10px',
        'border-top': `1px solid ${MINOR}`,
        'padding-top': 12,
      }),
    },
    el(
      'span',
      {
        style: css({
          display: 'block',
          'font-family': KARRIK,
          'font-size': 15,
          'line-height': '1.35',
          'text-wrap': 'pretty',
        }),
      },
      CHELL.scale,
    ),
    el(
      'span',
      {
        style: css({
          display: 'block',
          'margin-top': 8,
          'font-size': 11.5,
          'letter-spacing': '.22em',
          opacity: '.6',
          'line-height': '1.5',
        }),
      },
      'boards shown uncropped',
    ),
  );

  return [head, rows, note];
}

/* ------------------------------------------------------ the state specimen */

/**
 * One safety state, in chellbook's own wash and ink.
 *
 * The dashed edge belongs to `unknown` alone. It is the visible form of the
 * product's first structural rule — "unknown may never be rounded up to
 * verified, including when the model is confident" — so the other three carry
 * the same 1px edge solid, and the only difference between them is solid
 * against dashed. `meaning` is printed whole; the verified row's second
 * sentence ("not a promise of absolute safety") is the ethic of the thing and
 * is never cut for length.
 *
 * A border, not a box-shadow: a dashed box-shadow does not exist, and this
 * edge has to be dashed. Radius stays 0, as everywhere.
 */
function stateCard(s: (typeof CHELL_STATES)[number], n: number): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 200 + n * 45,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        top: n * (CB.states.rowH + CB.states.gap),
        width: '100%',
        height: CB.states.rowH,
        padding: 14,
        background: s.wash,
        color: s.ink,
        border: `1px ${s.dashed ? 'dashed' : 'solid'} ${s.ink}`,
      }),
    },
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'align-items': 'baseline',
          'justify-content': 'space-between',
          gap: 12,
        }),
      },
      // the word, always: color alone never carries meaning here, which is
      // the product's own rule and not a portfolio flourish
      el(
        'span',
        {
          style: css({
            'font-family': KARRIK,
            'font-size': 20,
            'letter-spacing': '-.015em',
          }),
        },
        s.name,
      ),
      el(
        'span',
        { style: css({ 'font-size': 11.5, 'letter-spacing': '.22em', opacity: '.75' }) },
        s.mineral,
      ),
    ),
    el(
      'p',
      {
        style: css({
          margin: '9px 0 0',
          'font-size': 13,
          'letter-spacing': '.02em',
          'line-height': '1.45',
          'text-wrap': 'pretty',
        }),
      },
      s.meaning,
    ),
  );
}

function specimen(): HTMLElement[] {
  const head = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 160,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.states.x,
        top: CB.states.y,
        width: CB.states.w,
      }),
    },
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'justify-content': 'space-between',
          gap: 12,
          'font-size': 11.5,
          'letter-spacing': '.22em',
          opacity: '.72',
          'padding-bottom': 9,
          'border-bottom': `1px solid ${MAJOR}`,
        }),
      },
      el('span', {}, 'four safety states, never a fifth'),
      el('span', {}, two(CHELL_STATES.length)),
    ),
    el(
      'span',
      {
        style: css({
          display: 'block',
          'margin-top': 9,
          'font-size': 11.5,
          'letter-spacing': '.13em',
          'line-height': '1.4',
          opacity: '.6',
        }),
      },
      "specimen · chellbook's own wash and ink",
    ),
  );

  const rows = el(
    'div',
    {
      // the cards read as one set; the wash/ink pairs are the specimen
      role: 'list',
      'aria-label': "chellbook's four safety states",
      style: css({
        position: 'absolute',
        left: CB.states.x,
        top: CB.statesRowsY,
        width: CB.states.w,
        height: CB.bandEnd - CB.statesRowsY,
      }),
    },
    ...CHELL_STATES.map((s, n) => {
      const card = stateCard(s, n);
      card.setAttribute('role', 'listitem');
      return card;
    }),
  );

  return [head, rows];
}

/* ----------------------------------------------------------- the text half */

/*
  Long-form prose is set in Karrik, the display face at rest, for the reason
  the page-03 case study gives: the stage's inherited face is Dessign Maison,
  which is the right face for a tracked 11.5–15px label and the wrong one for a
  300-character sentence. Tracked micro-labels here still inherit.
*/
const prose = (text: string, size: number, opacity?: string) =>
  el(
    'p',
    {
      style: css({
        margin: '0 0 13px',
        'font-family': KARRIK,
        'font-size': size,
        'line-height': '1.62',
        'letter-spacing': '.005em',
        'text-wrap': 'pretty',
        opacity: opacity || null,
      }),
    },
    text,
  );

/** The quiet section label: tracked micro type over a hairline. */
const secLabel = (text: string) =>
  el(
    'h3',
    {
      style: css({
        margin: '0 0 15px',
        'font-size': 11.5,
        'font-weight': '400',
        'letter-spacing': '.22em',
        'padding-bottom': 9,
        opacity: '.72',
        'border-bottom': `1px solid ${MINOR}`,
      }),
    },
    text,
  );

/**
 * The loud section label: a band, so the sections that carry the thesis read as
 * the thesis. The band is always from LIGHTS and the ink on it is always
 * `#0B0B0C` — the legibility contract, not a style choice.
 */
const bandLabel = (text: string, tone: string) =>
  el(
    'h3',
    {
      style: css({
        margin: '0 0 18px',
        display: 'inline-block',
        background: tone,
        color: COLOR.nearBlack,
        'font-size': 12,
        'font-weight': '400',
        'letter-spacing': '.16em',
        padding: '7px 11px',
      }),
    },
    text,
  );

const microLabel = (text: string, opacity = '.6') =>
  el(
    'span',
    {
      style: css({
        display: 'block',
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity,
      }),
    },
    text,
  );

const bareList = (...items: HTMLElement[]) =>
  el('ul', { style: css({ margin: '0', padding: '0', 'list-style': 'none' }) }, ...items);

const listItem = (border: string | null, ...kids: (Node | string | null)[]) =>
  el(
    'li',
    {
      style: css({
        padding: '12px 0',
        'border-bottom': border ? `1px solid ${border}` : null,
      }),
    },
    ...kids,
  );

let secSeq = 0;
const section = (name: string, ...kids: (Node | string)[]) =>
  el(
    'section',
    {
      'data-cbsec': secSeq++,
      'data-cbsec-name': name,
      style: css({ 'padding-bottom': 42 }),
    },
    ...kids,
  );

/** field / value pairs — the design's own table idiom, stacked to fit. */
const fieldRows = (rows: TableRow[], valueSize: number) =>
  bareList(
    ...rows.map((r) =>
      listItem(
        MINOR,
        microLabel(r.field, '.62'),
        el(
          'p',
          {
            style: css({
              margin: '6px 0 0',
              'font-family': KARRIK,
              'font-size': valueSize,
              'line-height': '1.45',
              'text-wrap': 'pretty',
            }),
          },
          r.value,
        ),
      ),
    ),
  );

/** An `n / name / body` block — the shape both the rules and the flows take. */
const numbered = (n: string, name: string, aside: string | null, body: string) =>
  listItem(
    MAJOR,
    el(
      'div',
      {
        style: css({
          display: 'flex',
          'align-items': 'baseline',
          gap: 12,
          'margin-bottom': 8,
        }),
      },
      el(
        'span',
        {
          style: css({
            'font-size': 11.5,
            'letter-spacing': '.22em',
            opacity: '.6',
            'flex-shrink': '0',
          }),
        },
        n,
      ),
      el(
        'span',
        {
          style: css({
            'font-family': KARRIK,
            'font-size': 18,
            'line-height': '1.2',
            'letter-spacing': '-.015em',
          }),
        },
        name,
      ),
    ),
    aside ? microLabel(aside, '.6') : null,
    prose(body, 14, '.88'),
  );

function textSections(): HTMLElement[] {
  secSeq = 0;

  /*
    The standfirst opens the column: it is the sentence that says what the
    product does, and it says it without claiming safety — "returns a version
    they can safely eat" is the recipe conversion, and the four states below
    carry what is and is not known about any given ingredient.
  */
  const lead = section(
    'the product',
    secLabel('the product'),
    el(
      'p',
      {
        style: css({
          margin: '0 0 14px',
          'font-family': KARRIK,
          'font-size': 20,
          'line-height': '1.35',
          'letter-spacing': '-.01em',
          'text-wrap': 'pretty',
        }),
      },
      CHELL.standfirst,
    ),
    microLabel(`${CHELL.state} · ${CHELL.scale}`, '.66'),
  );

  const loop = section(
    'the core loop',
    secLabel('the core loop'),
    bareList(
      ...CHELL_LOOP.map((step, i) =>
        listItem(
          MINOR,
          microLabel(two(i + 1)),
          el(
            'p',
            {
              style: css({
                margin: '7px 0 0',
                'font-family': KARRIK,
                'font-size': 16,
                'line-height': '1.45',
                'text-wrap': 'pretty',
              }),
            },
            step,
          ),
        ),
      ),
    ),
  );

  /*
    The five structural rules are the spine of this case study, the way the
    limitations and the release ladder are the spine of the page-03 one: the
    handoff calls them legal constraints rather than preferences, and changing
    one needs design and legal sign-off. They get a band header and full text.
  */
  const rules = section(
    'structural rules',
    bandLabel('structural rules', light(0)),
    bareList(...CHELL_RULES.map((r) => numbered(r.n, r.name, null, r.body))),
  );

  const ia = section(
    'information architecture',
    secLabel('information architecture · five tabs'),
    fieldRows(CHELL_IA, 15),
  );

  const flows = section(
    'the five flows',
    secLabel('the five flows'),
    bareList(...CHELL_FLOWS.map((f) => numbered(f.n, f.name, f.screens, f.body))),
  );

  const motion = section(
    'motion',
    secLabel('motion · calm, no spring'),
    fieldRows(CHELL_MOTION, 15),
  );

  /*
    Publishing the undesigned questions is the point of the case study: it is
    about what the design has and has not settled. Six of them, printed whole.
  */
  const open = section(
    'still undesigned',
    bandLabel('still undesigned', light(2)),
    bareList(
      ...CHELL_OPEN.map((line, i) =>
        listItem(
          MAJOR,
          microLabel(two(i + 1)),
          el(
            'p',
            {
              style: css({
                margin: '7px 0 0',
                'font-family': KARRIK,
                'font-size': 17,
                'line-height': '1.45',
                'text-wrap': 'pretty',
              }),
            },
            line,
          ),
        ),
      ),
    ),
  );

  /*
    All three caveats, verbatim. The first is also in the footer, where it
    cannot scroll away; the other two are the font license and the fact that the
    prototypes are design references and not production code.
  */
  const caveats = section(
    'caveats',
    bandLabel('caveats', light(4)),
    bareList(
      ...CHELL_CAVEATS.map((line) =>
        listItem(
          MAJOR,
          el(
            'p',
            {
              style: css({
                margin: '0',
                'font-family': KARRIK,
                'font-size': 16,
                'line-height': '1.5',
                'letter-spacing': '-.005em',
                'text-wrap': 'pretty',
              }),
            },
            line,
          ),
        ),
      ),
    ),
  );

  return [lead, loop, rules, ia, flows, motion, open, caveats];
}

/**
 * The scrolling text column.
 *
 * Built exactly as the page-03 case study's is, and for the same reasons: the
 * region is a real focusable scroll container (`tabindex="0"`, a named
 * `region`), so arrows, PageUp/PageDown, Home and End all reach every word
 * without a pointer, and there is nothing focusable inside it to trap a tab.
 * The native scrollbar is suppressed and a 6px rust rail drawn in its place —
 * corner radius 0 and a hairline aesthetic are not on offer from a UA bar. The
 * rail is a position indicator, not a drag handle: the stage sits under a
 * `transform: scale()`, and every real way to scroll is already wired.
 */
function textColumn(): HTMLElement {
  const bar = el(
    'div',
    {
      // duplicates the headings a screen reader already walks
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: CB.secBarH,
        display: 'flex',
        'align-items': 'center',
        'border-bottom': `1px solid ${MINOR}`,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
        overflow: 'hidden',
        'white-space': 'nowrap',
      }),
    },
    el('span', { 'data-cbsecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-cbscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': 'Case study, chellbook design spec',
      style: css({
        position: 'absolute',
        inset: '0',
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'padding-right': SCROLL_PAD,
        // the rail below replaces it; radius 0 is not on offer from a UA bar
        'scrollbar-width': 'none',
        'overscroll-behavior': 'contain',
      }),
    },
    ...textSections(),
  );

  const rail = el(
    'div',
    {
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: CB.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-cbthumb': true,
      style: css({
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: 0,
        background: COLOR.rust,
        display: 'none',
      }),
    }),
  );

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 260,
      'data-in-dur': 420,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CB.text.x,
        top: CB.text.y,
        width: CB.text.w,
        height: TEXT_H,
      }),
    },
    bar,
    el(
      'div',
      {
        style: css({
          position: 'absolute',
          left: 0,
          right: 0,
          top: SCROLL_TOP,
          bottom: 0,
        }),
      },
      region,
      rail,
    ),
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
  /*
    The screen's own dither veil. Mode 0 (quiet wavy bands), like the page-03
    case study: this is a reading screen, not a channel. It is display:none with
    the screen, and frost.ts skips zero-box canvases, so it costs nothing until
    the screen is opened.
  */
  const frost = el('canvas', {
    'data-frost': 'quiet',
    'data-mode': 0,
    'data-rest-mode': 0,
    'data-rest-op': '.2',
    'data-boost': 2.6,
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
      'z-index': '1',
    }),
  });

  const chrome = el(
    'div',
    {
      'data-cbchrome': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '3', opacity: '0' }),
    },
    header(),
    ...titleBlock(),
    ...CHELL_PROTOTYPES.map(protoCard),
    plateCaption(),
    ...index(),
    ...specimen(),
    textColumn(),
    footer(),
  );

  return el(
    'div',
    {
      'data-chellbook': true,
      'data-screen-label': 'Chellbook case study',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${CHELL.name}: ${CHELL.state}, ${CHELL.scale}, and ${CHELL_BOARDS.length} flow boards`,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '8',
        display: 'none',
        // the opaque plaque ground: type has to stay legible over a screen full
        // of imagery, and the state specimen needs a neutral dark surround
        background: COLOR.plaque,
        color: COLOR.lavender,
        overflow: 'hidden',
      }),
    },
    frost,
    plate(),
    chrome,
  );
}
