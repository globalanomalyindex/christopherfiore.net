/**
 * Page 03's subpage — the branchial lateral spine case study.
 *
 * The Competizione page makes the argument in one screen (one system, four
 * plates). This screen is the case study itself: the whole record the argument
 * is drawn from, at full size, next to the whole of what the record does and
 * does not prove.
 *
 * It is composed as two halves inside one full-stage screen:
 *
 *   the visual half   a 945 × 556 plate showing any of the twelve sheets
 *                     `object-fit: contain` — never cropped — with its verbatim
 *                     caption under it, and the sheet index beside it.
 *   the text half     the full case study from `src/data/blsp-case.ts` in a
 *                     scrolling column with its own rust rail. Far more text
 *                     than 1080px holds, so it scrolls; the column is a real
 *                     focusable region, so arrows / PageUp / PageDown / Home /
 *                     End reach every word without a pointer, and there is
 *                     nothing focusable inside it to trap a tab.
 *
 * Above both, the screen carries the project's own name at display scale with
 * the descriptor beneath: this is a case study for a named piece of work, and
 * it should read as one rather than as "evidence".
 *
 * It is a full-stage screen in the same system, not a dialog floated over one:
 * it borrows page 03's band heights and module margin, close is top-left, the
 * corner radius is 0 and the only shadows are 1px frames. `src/runtime/
 * evidence.ts` grows it out of whatever element was clicked, with the same
 * clip-path grow, dither veil and pulsing settle the pages use.
 *
 * THE LANGUAGE IS THE POINT. This is the one screen where a sheet is shown
 * large enough to be mistaken for a measurement or a released part, and where
 * the argument is written out at length. Every caption, limitation, gate and
 * statement is printed verbatim from `src/data/`, which is in turn verbatim
 * from the devkit and the live case study. Nothing here paraphrases, shortens
 * or strengthens a qualifier, and nothing is assembled from fragments at
 * runtime — a qualifier that is built is a qualifier that can lose a clause.
 *
 * The 424-page corrected visual master IS hosted, so it is the one real
 * download on this screen, printed with its byte count and checksum so a reader
 * can confirm the file matches the manifest record. The thirteen archive
 * volumes are not hosted and the previous site's URLs for them 404, so they are
 * not enumerated and this file emits no anchor for any of them.
 */

import { asset, css, el } from '../dom.ts';
import { COLOR, LIGHTS, RULE } from '../design/tokens.ts';
import { EVIDENCE, MODULE, STAGE } from '../design/layout.ts';
import { EV_META, EV_SHEETS } from '../data/competizione.ts';
import {
  BLSP,
  BLSP_ANATOMY,
  BLSP_ASSEMBLIES,
  BLSP_DECISION,
  BLSP_GATES,
  BLSP_LIMITS,
  BLSP_OPEN,
  BLSP_PACKAGE,
  BLSP_PRODUCED,
  BLSP_STATEMENT,
} from '../data/blsp-case.ts';
import type { EvidenceSheet, TableRow } from '../data/types.ts';

/** Lavender hairlines: the dark-ground pair, same alphas as the rust ground. */
const MAJOR = RULE.onRustMajor;
const MINOR = RULE.onRustMinor;

const KARRIK = "'Karrik',sans-serif";

/**
 * A band color, always from LIGHTS, always carrying `#0B0B0C` ink. Indexed
 * rather than picked at random so the same section is the same color on every
 * open, and modulo so the set can grow or shrink without this file caring.
 */
const light = (i: number): string => LIGHTS[i % LIGHTS.length];

const two = (n: number): string => String(n).padStart(2, '0');

/* ------------------------------------------------------------- geometry */

/**
 * This screen's own geometry. `layout.ts`'s `EVIDENCE` describes the earlier
 * sheets-only viewer, which had no text half; the band heights are still that
 * screen's (and page 03's), the three columns are new.
 *
 * The three columns are module multiples with half-module gutters:
 * 13M plate + ½M + 3M index + ½M + the remainder to the right margin.
 * 72.727 + 945.45 + 36.36 + 218.18 + 36.36 + 538.18 = 1847.27 = 1920 − 72.727.
 */
const GUTTER = MODULE / 2;
const PLATE_W = MODULE * 13;
const INDEX_W = MODULE * 3;
const INDEX_X = MODULE + PLATE_W + GUTTER;
const TEXT_X = INDEX_X + INDEX_W + GUTTER;
const TEXT_W = STAGE.w - MODULE - TEXT_X;

const EV = {
  headerH: EVIDENCE.headerH, // 62, = PAGE3.headerH
  footerH: EVIDENCE.footerH, // 88, = PAGE3.footerH
  /** title block */
  title: { x: MODULE, y: 88, size: 152, lh: 146, track: '-.05em' },
  descriptorY: 246,
  metaY: 288,
  ruleY: 318,
  /** the two-half content band: below the title rule, above the footer */
  bandY: 336,
  bandEnd: 976,
  /** contain, not cover — cropping a page of evidence hides evidence */
  plate: { x: MODULE, y: 336, w: PLATE_W, h: 556 },
  plateCaption: { x: MODULE, y: 904, w: PLATE_W },
  index: { x: INDEX_X, y: 336, w: INDEX_W },
  indexRowsY: 370,
  indexRowH: 50, // 12 rows × 50 = 600 → 970, clear of the footer
  text: { x: TEXT_X, y: 336, w: TEXT_W },
  /** the "you are here" bar above the scrolling column */
  secBarH: 34,
  secBarGap: 12,
  railW: 6,
} as const;

const TEXT_H = EV.bandEnd - EV.text.y;
const SCROLL_TOP = EV.secBarH + EV.secBarGap;
/** right padding on the scroll region: clears the rail and gives it air */
const SCROLL_PAD = EV.railW + 16;

/* --------------------------------------------------------------- the plate */

/**
 * One stacked sheet. `src` is deliberately absent: `runtime/evidence.ts` moves
 * `data-src` across the first time a sheet is shown, and pre-warms its two
 * neighbours. Twelve eager images would be 1.7MB the moment the viewer opens,
 * for eleven sheets nobody has asked to see yet.
 */
const sheetSlot = (s: EvidenceSheet, n: number) =>
  el(
    'div',
    {
      'data-evslot': n,
      // only the shown sheet is in the accessibility tree; the other eleven
      // would otherwise all announce their alt text at once
      'aria-hidden': n === 0 ? 'false' : 'true',
      style: css({ opacity: n === 0 ? '1' : '0' }),
    },
    el('img', {
      'data-src': asset(s.image),
      alt: s.alt,
      decoding: 'async',
      width: s.width,
      height: s.height,
      style: css({
        display: 'block',
        width: '100%',
        height: '100%',
        // contain, not cover: cropping a page of evidence hides evidence
        'object-fit': 'contain',
      }),
    }),
  );

function plate(): HTMLElement {
  return el(
    'div',
    {
      'data-evplate': true,
      style: css({
        position: 'absolute',
        left: EV.plate.x,
        top: EV.plate.y,
        width: EV.plate.w,
        height: EV.plate.h,
        'z-index': '2',
        'box-shadow': `0 0 0 1px ${MAJOR}`,
      }),
    },
    ...EV_SHEETS.map(sheetSlot),
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

/**
 * The plate's caption. Two lines, kind then caption, rather than the two ends
 * of one line: the captions run to 108 characters and the qualifier lives at
 * the end of them, so nothing here may be squeezed by a neighbour.
 */
function plateCaption(): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 300,
      // the caption is the claim boundary — announce it when the sheet changes
      'aria-live': 'polite',
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: EV.plateCaption.x,
        top: EV.plateCaption.y,
        width: EV.plateCaption.w,
      }),
    },
    el(
      'span',
      {
        'data-evkind': true,
        style: css({
          display: 'block',
          'font-size': 11.5,
          'letter-spacing': '.22em',
          opacity: '.7',
          'margin-bottom': 9,
        }),
      },
      EV_SHEETS[0].kind,
    ),
    el(
      'span',
      {
        'data-evcap': true,
        style: css({
          display: 'block',
          'font-size': 13,
          'letter-spacing': '.16em',
          'line-height': '1.5',
          'text-wrap': 'pretty',
        }),
      },
      EV_SHEETS[0].caption,
    ),
  );
}

/* -------------------------------------------------------------- the chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'evidence-close',
      'aria-label': 'Close the case study, back to Competizione',
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
        height: EV.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell(EV_META.title, 3, true),
    cell(`sheet 01 / ${two(EV_SHEETS.length)}`, 3, true, { 'data-evcount': true }),
    cell(EV_META.master, 4, false),
  );
}

/**
 * The title block. `BLSP.name` at display scale with `BLSP.descriptor` under
 * it — a named piece of work, titled as one.
 *
 * 152px rather than a page title's full 168–200: this is a screen inside
 * channel 03, so it stays below Competizione's own 176px title in the
 * hierarchy, and the two halves under it need the height. `nowrap` because the
 * name is one line by design and a wrap would push the band into the plate —
 * it measures 1300px at this size, well inside the 1774px content width.
 *
 * `h2`, not `h1`: the document's one real `h1` is the wordmark in index.html.
 */
function titleBlock(): HTMLElement[] {
  const h1 = el(
    'h2',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 40,
      'data-in-dur': 420,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: EV.title.x,
        top: EV.title.y,
        margin: '0',
        'font-family': KARRIK,
        'font-weight': '400',
        'font-size': EV.title.size,
        'line-height': `${EV.title.lh}px`,
        'letter-spacing': EV.title.track,
        'white-space': 'nowrap',
      }),
    },
    BLSP.name,
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
        left: EV.title.x,
        top: EV.descriptorY,
        width: 1200,
        margin: '0',
        'font-family': KARRIK,
        'font-size': 20,
        'line-height': '1.4',
        'letter-spacing': '.005em',
        opacity: '.88',
      }),
    },
    BLSP.descriptor,
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
        left: EV.title.x,
        top: EV.metaY,
        width: STAGE.w - EV.title.x * 2,
        display: 'flex',
        'justify-content': 'space-between',
        gap: 40,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.8',
      }),
    },
    el('span', {}, `${BLSP.klass} · ${BLSP.year} · ${BLSP.state}`),
    el('span', {}, BLSP.tagline),
  );

  const rule = el('span', {
    'aria-hidden': 'true',
    'data-intro': 'wipeX',
    'data-in-delay': 230,
    'data-in-dur': 380,
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: EV.title.x,
      top: EV.ruleY,
      width: STAGE.w - EV.title.x * 2,
      height: 1,
      background: MAJOR,
    }),
  });

  return [h1, descriptor, meta, rule];
}

function footer(): HTMLElement {
  const step = (delta: number, label: string, arrow: string, first: boolean) =>
    el(
      'button',
      {
        type: 'button',
        'data-act': 'evidence-step',
        'data-step': delta,
        'aria-label': first ? 'Previous evidence sheet' : 'Next evidence sheet',
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
    The unabbreviated release boundary, verbatim from the devkit's
    `publication.release`. It sits in the footer rather than under the index
    because the text half scrolls and this may never scroll out of view.
  */
  const release = el(
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
    EV_META.release,
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
        height: EV.footerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-top': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    step(-1, 'previous sheet', '←', true),
    release,
    step(1, 'next sheet', '→', false),
  );
}

/* --------------------------------------------------------- the index column */

function indexRow(s: EvidenceSheet, n: number): HTMLElement {
  return el(
    'button',
    {
      type: 'button',
      'data-act': 'evidence-go',
      'data-sheet': n,
      'data-evrow': n,
      'aria-current': n === 0 ? 'true' : 'false',
      'aria-label': `Sheet ${two(n + 1)}, ${s.label}, ${s.kind}`,
      'data-intro': 'wipeX',
      'data-in-delay': 150 + n * 24,
      'data-in-dur': 300,
      class: 'ps-hov-invert-dark',
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        top: n * EV.indexRowH,
        width: '100%',
        height: EV.indexRowH,
        display: 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        gap: 5,
        // the current-sheet marker; a border, not a box-shadow, so it cannot
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
      { style: css({ 'font-family': KARRIK, 'font-size': 15, 'letter-spacing': '-.01em' }) },
      s.label,
    ),
    el(
      'span',
      { style: css({ 'font-size': 11.5, 'letter-spacing': '.13em', opacity: '.78' }) },
      `${two(n + 1)} · ${s.kind}`,
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
        left: EV.index.x,
        top: EV.index.y,
        width: EV.index.w,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
        display: 'flex',
        'justify-content': 'space-between',
        padding: '0 10px 9px',
        'border-bottom': `1px solid ${MAJOR}`,
      }),
    },
    el('span', {}, 'sheet'),
    el('span', {}, two(EV_SHEETS.length)),
  );

  const rows = el(
    'div',
    {
      style: css({
        position: 'absolute',
        left: EV.index.x,
        top: EV.indexRowsY,
        width: EV.index.w,
        height: EV_SHEETS.length * EV.indexRowH,
      }),
    },
    ...EV_SHEETS.map(indexRow),
  );

  return [head, rows];
}

/* ----------------------------------------------------------- the text half */

/*
  Long-form prose is set in Karrik, the display face at rest. The stage's
  inherited face is Dessign Maison, and the design uses it for every tracked
  11.5–15px label — which is what it is for. This screen is the one place with
  running paragraphs rather than labels, and a display alternate does not hold
  a 300-character sentence. Tracked micro-labels here still inherit.
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
        opacity: '.72',
        'padding-bottom': 9,
        'border-bottom': `1px solid ${MINOR}`,
      }),
    },
    text,
  );

/**
 * The loud section label: a band, so the two sections that carry the thesis
 * read as the thesis. The band is always from LIGHTS and the ink on it is
 * always `#0B0B0C` — the legibility contract, not a style choice.
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

const listItem = (border: string | null, ...kids: (Node | string)[]) =>
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
      'data-evsec': secSeq++,
      'data-evsec-name': name,
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

/** counted evidence — the number is the point, so it is set at display size. */
const countRows = (rows: TableRow[]) =>
  bareList(
    ...rows.map((r) =>
      listItem(
        MINOR,
        el(
          'div',
          { style: css({ display: 'flex', 'align-items': 'baseline', gap: 16 }) },
          el(
            'span',
            {
              style: css({
                'font-family': KARRIK,
                'font-size': 26,
                'letter-spacing': '-.02em',
                'flex-shrink': '0',
                'min-width': 78,
              }),
            },
            r.field,
          ),
          el(
            'span',
            {
              style: css({
                'font-size': 13,
                'letter-spacing': '.13em',
                'line-height': '1.5',
                opacity: '.84',
                'text-wrap': 'pretty',
              }),
            },
            r.value,
          ),
        ),
      ),
    ),
  );

/**
 * A gate's status. `current` and `blocked` are the two ends of the ladder and
 * get bands; `open` is the quiet middle and gets a hairline outline. Bands are
 * from LIGHTS with `#0B0B0C` ink; the outline carries no fill, so it is not a
 * band and the contract does not apply to it.
 */
function statusChip(status: string): HTMLElement {
  const tone = status === 'current' ? light(3) : status === 'blocked' ? light(2) : null;
  return el(
    'span',
    {
      style: css({
        'flex-shrink': '0',
        'font-size': 11.5,
        'letter-spacing': '.22em',
        padding: '5px 9px',
        background: tone,
        color: tone ? COLOR.nearBlack : null,
        'box-shadow': tone ? null : `0 0 0 1px ${MAJOR}`,
        opacity: tone ? null : '.82',
      }),
    },
    status,
  );
}

function textSections(): HTMLElement[] {
  secSeq = 0;

  const decision = section(
    BLSP_DECISION.heading,
    secLabel(BLSP_DECISION.heading),
    el(
      'p',
      {
        style: css({
          margin: '0 0 16px',
          'font-family': KARRIK,
          'font-size': 26,
          'line-height': '1.2',
          'letter-spacing': '-.02em',
        }),
      },
      BLSP_DECISION.lead,
    ),
    prose(BLSP_DECISION.body, 15),
    el(
      'p',
      {
        style: css({
          margin: '16px 0 0',
          'padding-top': 13,
          'border-top': `1px solid ${MINOR}`,
          'font-size': 13,
          'letter-spacing': '.16em',
          'line-height': '1.55',
          opacity: '.82',
          'text-wrap': 'pretty',
        }),
      },
      BLSP_DECISION.overview,
    ),
  );

  const assemblies = section(
    'functional assemblies',
    secLabel('functional assemblies'),
    bareList(
      ...BLSP_ASSEMBLIES.map((a) =>
        listItem(
          MINOR,
          el(
            'div',
            { style: css({ display: 'flex', 'align-items': 'baseline', gap: 12 }) },
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
              a.n,
            ),
            el(
              'span',
              { style: css({ 'font-family': KARRIK, 'font-size': 20, 'letter-spacing': '-.015em' }) },
              a.name,
            ),
          ),
          prose(a.body, 14, '.85'),
        ),
      ),
    ),
  );

  const anatomy = section(
    'printed skin, metal bones',
    secLabel('printed skin, metal bones'),
    fieldRows(BLSP_ANATOMY, 15),
  );

  const produced = section(
    'evidence produced',
    secLabel('evidence produced'),
    countRows(BLSP_PRODUCED),
  );

  const open = section(
    'what remains unvalidated',
    secLabel('what remains unvalidated'),
    bareList(
      ...BLSP_OPEN.map((line, i) =>
        listItem(
          MINOR,
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
    The two sections below are the spine of the argument, not fine print. The
    whole thesis of this work is "here is what I have NOT proven", so the
    limitations and the release ladder get band headers and display-scale type
    while the inventory above them stays at label scale.
  */
  const limits = section(
    'stated limitations',
    bandLabel('stated limitations', light(0)),
    bareList(
      ...BLSP_LIMITS.map((line) =>
        listItem(
          MAJOR,
          el(
            'p',
            {
              style: css({
                margin: '0',
                'font-family': KARRIK,
                'font-size': 18,
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

  const gates = section(
    'release gates',
    bandLabel('release gates', light(4)),
    bareList(
      ...BLSP_GATES.map((g) =>
        listItem(
          MAJOR,
          el(
            'div',
            {
              style: css({
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                gap: 14,
              }),
            },
            el(
              'span',
              { style: css({ 'font-family': KARRIK, 'font-size': 21, 'letter-spacing': '-.02em' }) },
              g.gate,
            ),
            statusChip(g.status),
          ),
          prose(g.detail, 14, '.88'),
        ),
      ),
    ),
  );

  const statement = section(
    'designer statement',
    secLabel('designer statement'),
    ...BLSP_STATEMENT.map((p) => prose(p, 17)),
  );

  /*
    The publication package. The 424-page corrected visual master IS hosted, so
    it is a real link — and its byte count and checksum are printed under it,
    because a package built around traceability should let a reader confirm the
    file they just downloaded is the one the manifest describes.

    The thirteen archive volumes are deliberately not enumerated: they are not
    hosted, the previous site's URLs for them 404, and listing parts a reader
    cannot obtain is noise rather than traceability. `BLSP_PACKAGE.note` says
    where they are.
  */
  const pkg = section(
    'publication package',
    secLabel('publication package'),
    prose(BLSP_PACKAGE.note, 13, '.86'),
    el(
      'div',
      {
        style: css({
          margin: '18px 0 22px',
          padding: 14,
          'box-shadow': `0 0 0 1px ${MAJOR}`,
        }),
      },
      el(
        'a',
        {
          href: asset(BLSP_PACKAGE.master.href),
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': `Open the ${BLSP_PACKAGE.master.label} — ${BLSP_PACKAGE.master.pages}, ${BLSP_PACKAGE.master.size} PDF, opens in a new tab`,
          style: css({
            display: 'block',
            margin: '0 0 8px',
            color: 'inherit',
            'text-decoration': 'none',
            cursor: 'pointer',
            'font-family': KARRIK,
            'font-size': 17,
            'line-height': '1.35',
            'text-wrap': 'pretty',
          }),
        },
        BLSP_PACKAGE.master.label,
      ),
      microLabel(`${BLSP_PACKAGE.master.size} · ${BLSP_PACKAGE.master.pages}`, '.72'),
      microLabel(`${BLSP_PACKAGE.master.bytes} · ${BLSP_PACKAGE.master.checksum}`, '.62'),
    ),
  );

  return [
    decision,
    assemblies,
    anatomy,
    produced,
    open,
    limits,
    gates,
    statement,
    pkg,
  ];
}

/**
 * The scrolling text column.
 *
 * The region is a real focusable scroll container (`tabindex="0"`, a named
 * `region`), which is what makes the case study reachable without a pointer:
 * arrows, PageUp/PageDown, Home and End all work in it. There is nothing
 * focusable inside it, so tabbing continues straight out to the footer — no
 * trap.
 *
 * The native scrollbar is suppressed and a 6px rust rail drawn in its place:
 * corner radius 0 and a hairline aesthetic are not things a UA scrollbar
 * offers. The rail is a position indicator, not a drag handle — the stage is
 * under a `transform: scale()`, so a hand-rolled drag would have to undo the
 * scale to track the pointer, and every real way to scroll is already wired.
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
        height: EV.secBarH,
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
    el('span', { 'data-evsecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-evscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `Case study, ${EV_META.source}`,
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
        width: EV.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-evthumb': true,
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
        left: EV.text.x,
        top: EV.text.y,
        width: EV.text.w,
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
    The viewer's own dither veil. Mode 0 (quiet wavy bands) rather than page
    03's mode 3 speed lines: this screen is the archive, not the racetrack. It
    is display:none with the viewer, and frost.ts skips zero-box canvases, so
    it costs nothing until the viewer is opened.
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
      'data-evchrome': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '3', opacity: '0' }),
    },
    header(),
    ...titleBlock(),
    plateCaption(),
    ...index(),
    textColumn(),
    footer(),
  );

  return el(
    'div',
    {
      'data-evidence': true,
      'data-screen-label': 'Branchial lateral spine case study',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${BLSP.name}: case study and ${EV_SHEETS.length} evidence sheets, revision H`,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '8',
        display: 'none',
        // the opaque plaque ground, for the same reason the painting captions
        // use it: type has to stay legible over a screen full of imagery
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
