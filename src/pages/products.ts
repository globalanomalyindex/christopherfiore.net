/**
 * Screen 2 · Page 01 — Product designs.
 *
 * Geometry from `src/design/layout.ts` (PAGE1) and the prototype markup. The
 * row band is this build's one adaptation: the real inventory is eleven cases
 * plus a 58-study motion archive, so eleven 26.4464px rows and a 90.9px
 * full-bleed motion band fill the distance the design gave to four 72.727px
 * rows. `PAGE1.rowH` is redivided every time a case is added; see the note
 * there for the ceiling on `CaseRecord.line`. Everything else — title, thesis,
 * key-frame panel, header, footer, grid overlay — keeps its handoff geometry.
 *
 * Every row on this page is a real control, which is what earns it the glitchy
 * band-stack hover: `wireHovers` auto-binds any element that turns the cursor
 * to pointer, so nothing here hand-rolls a hover state.
 *
 * Seven of the eleven rows are anchors to a deployed demo. The other four are
 * not: chellbook, guestpass, lee, mfny, chipotle and df2tm each carry `href: null` and a
 * `subpage`, because there is no deployed app to point at. Chellbook, for
 * instance, is concept-stage: 30 designed screens and two prototypes,
 * so it renders as a real `<button>` that opens a case study inside the stage,
 * and its trailing cell reads "case study →" rather than "source". The
 * distinction is not decoration — an anchor promises somewhere to go, and there
 * is nowhere deployed to go. `rowControl` narrows on the data rather than
 * asserting: a record with no href never becomes an `<a>` with no href.
 *
 * Hovering a row selects the matching key-frame slot: rows carry
 * `data-hov="case" data-case="N"`, slots carry `data-cslot="N"` and crossfade
 * on 240ms linear. `src/runtime/actions.ts` owns the wiring, off both
 * `pointerover` and `focusin`, so the swap is keyboard-reachable.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, RULE, rgba } from '../design/tokens.ts';
import { MODULE, MOTION_SHEET, PAGE1 } from '../design/layout.ts';
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
import type { CaseRecord } from '../data/types.ts';

/** Reset so a real <button> can carry the prototype's cell geometry. */
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

/**
 * The trailing cell of a row that opens a screen in this stage instead of
 * navigating away. It sits where the other rows carry `source`, and says where
 * it goes rather than what it links to. The glyph is the design's own → — the
 * three glyphs on this stage are ✕ ← →, and there is no icon set.
 */
const DEST = { label: 'case study', glyph: '→' } as const;

/** The motion archive band — a destination, not a table row. */
const MOTION_BAND = {
  label: 'motion studies',
  open: 'open the archive',
  cap: `motion studies · ${MOTION_ARCHIVE_LABEL}`,
  fig: 'fig 08',
} as const;

/** 15 × 15px corner marks, two 1px lines, offset -7.5px. */
const cross = (pos: Record<string, string | number>) =>
  el('span', {
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      width: 15,
      height: 15,
      'pointer-events': 'none',
      'background-image': `linear-gradient(${COLOR.wood},${COLOR.wood}),linear-gradient(${COLOR.wood},${COLOR.wood})`,
      'background-size': '1px 15px,15px 1px',
      'background-position': 'center center,center center',
      'background-repeat': 'no-repeat',
      ...pos,
    }),
  });

const corners = () => [
  cross({ left: -7.5, top: -7.5 }),
  cross({ right: -7.5, top: -7.5 }),
  cross({ left: -7.5, bottom: -7.5 }),
  cross({ right: -7.5, bottom: -7.5 }),
];

/* --------------------------------------------------------------- key frames */

const slotShell = (n: number, ...kids: (Node | string | null)[]) =>
  el(
    'div',
    {
      'data-cslot': n,
      // Every slot is mounted at once and crossfaded, so the ten that are not
      // showing have to leave the accessibility tree or a screen reader walks
      // all eleven captions in a row. `actions.ts` flips this with the opacity.
      'aria-hidden': n === 1 ? 'false' : 'true',
      style: css({
        position: 'absolute',
        inset: '0',
        overflow: 'hidden',
        opacity: n === 1 ? '1' : '0',
        transition: 'opacity 240ms linear',
      }),
    },
    ...kids,
  );

const coverImage = (src: string, alt: string, w: number, h: number) =>
  el('img', {
    src: asset(src),
    alt,
    loading: 'lazy',
    decoding: 'async',
    width: Math.round(w),
    height: Math.round(h),
    style: css({
      display: 'block',
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
    }),
  });

/** Slot 08 — a 4 × 2 contact sheet of the eight motion stills. */
const contactSheet = () =>
  el(
    'div',
    {
      style: css({
        position: 'absolute',
        inset: '0',
        display: 'grid',
        'grid-template-columns': `repeat(${MOTION_SHEET.cols},1fr)`,
        'grid-template-rows': `repeat(${MOTION_SHEET.rows},1fr)`,
        gap: MOTION_SHEET.gap,
      }),
    },
    ...MOTION_STUDIES.map((m) =>
      el(
        'div',
        { style: css({ position: 'relative', overflow: 'hidden' }) },
        coverImage(
          m.poster,
          `${m.label}, motion study still`,
          (PAGE1.panel.w - (MOTION_SHEET.cols - 1) * MOTION_SHEET.gap) / MOTION_SHEET.cols,
          (PAGE1.panel.h - (MOTION_SHEET.rows - 1) * MOTION_SHEET.gap) / MOTION_SHEET.rows,
        ),
      ),
    ),
  );

function panel(): HTMLElement {
  // Every case now ships a live capture, so the old "no key frame" plate is
  // gone. The guard stays only because CaseRecord.image is still nullable — an
  // asset-less record leaves its slot empty rather than borrowing an image.
  const slots = CASES.map((c, i) =>
    slotShell(i + 1, c.image ? coverImage(c.image, c.imageAlt, PAGE1.panel.w, PAGE1.panel.h) : null),
  );
  slots.push(slotShell(CASES.length + 1, contactSheet()));

  return el(
    'div',
    {
      'data-intro': 'fade',
      'data-dfx': 12,
      'data-in-delay': 150,
      'data-in-dur': 400,
      style: css({
        opacity: '0',
        position: 'absolute',
        left: PAGE1.panel.x,
        top: PAGE1.panel.y,
        width: PAGE1.panel.w,
        height: PAGE1.panel.h,
        border: `1px solid ${RULE.onPaperMajor}`,
        background: 'rgba(43,11,3,.05)',
      }),
    },
    ...slots,
    ...corners(),
  );
}

/* --------------------------------------------------------------------- rows */

const cellIdx = (text: string) =>
  el(
    'span',
    {
      style: css({ 'padding-left': MODULE, 'font-size': 13, 'letter-spacing': '.16em' }),
    },
    text,
  );

const cellName = (text: string) =>
  el(
    'span',
    {
      style: css({
        'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
        'font-size': PAGE1.nameSize,
        'letter-spacing': '-.03em',
        'white-space': 'nowrap',
      }),
    },
    text,
  );

const cellLine = (text: string) =>
  el(
    'span',
    {
      style: css({
        'font-size': 14,
        'line-height': '1.4',
        'letter-spacing': '.02em',
        'padding-right': 40,
        'text-wrap': 'pretty',
        opacity: '.8',
      }),
    },
    text,
  );

const cellYear = (text: string) =>
  el('span', { style: css({ 'font-size': 13, 'letter-spacing': '.16em' }) }, text);

/** Discipline, right-aligned. The 24px inset keeps it off the hover band edge. */
const cellDiscipline = (discipline: string) =>
  el(
    'span',
    {
      style: css({
        'padding-right': 24,
        'text-align': 'right',
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.72',
      }),
    },
    discipline,
  );

const outLink = (href: string, label: string, aria: string) =>
  el(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': aria,
      style: css({ ...LINK, 'border-bottom': '1px solid currentColor' }),
    },
    label,
  );

/**
 * The source column — outside the row anchor, never inside it. Two reasons:
 * an anchor may not nest, and the row's hover band is a LIGHTS fill whose only
 * legal ink is #0B0B0C, which a second link's rust type would break.
 */
const sourceCell = (c: CaseRecord) =>
  el(
    'span',
    {
      style: css({
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'flex-end',
        'padding-right': 101.8,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    c.source ? outLink(c.source, 'source', `${c.name}, source code, opens in a new tab`) : null,
  );

/** The in-stage destination cell — "case study →", right-aligned on `source`. */
const destCell = () =>
  el(
    'span',
    {
      style: css({
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'flex-end',
        gap: 12,
        'padding-right': 101.8,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    DEST.label,
    el(
      'span',
      { 'aria-hidden': 'true', style: css({ 'font-size': 17, 'line-height': '1' }) },
      DEST.glyph,
    ),
  );

/** The five columns every row shares, in the order the table header names them. */
const rowCells = (c: CaseRecord): HTMLElement[] => [
  cellIdx(c.idx),
  cellName(c.name),
  cellLine(c.line),
  cellYear(c.year),
  cellDiscipline(c.discipline),
];

/** The five-column grid, applied inside whatever control owns the row. */
const CELLS: Record<string, string | number> = {
  display: 'grid',
  'grid-template-columns': PAGE1.rowCols,
  'align-items': 'center',
  height: '100%',
};

/**
 * Narrow an optional, nullable data field to a usable string.
 *
 * This is the guard that keeps `href: null` from becoming `<a>` with no href:
 * the anchor branch is only reachable once `href` is a non-empty string, so
 * there is no cast anywhere and no branch where the attribute goes missing.
 */
const str = (v: string | null | undefined): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

/** Row 01–07: the row itself is the anchor to the deployed demo. */
const liveLink = (c: CaseRecord, href: string) =>
  el(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `${c.name}, open the live project, opens in a new tab`,
      style: css({ ...LINK, ...CELLS }),
    },
    ...rowCells(c),
  );

/**
 * Row 08: a real <button>, because there is nothing deployed to link to.
 *
 * It spans the whole row — both columns of `rowSplit` — since its trailing cell
 * is a destination label, not a second link, so nothing has to stay outside it
 * the way `sourceCell` does. `data-act` is delegated in runtime/actions.ts.
 * Being cursor:pointer and innermost is what gets it the band stack from
 * wireHovers, exactly like the seven anchors above it.
 */
const subpageButton = (c: CaseRecord, act: string) =>
  el(
    'button',
    {
      type: 'button',
      'data-act': act,
      'aria-label': `${c.name}, open the case study`,
      style: css({
        ...BTN,
        display: 'grid',
        'grid-template-columns': PAGE1.rowSplit,
        'align-items': 'center',
        width: '100%',
        height: '100%',
      }),
    },
    el('span', { style: css(CELLS) }, ...rowCells(c)),
    destCell(),
  );

/** A record with neither a deployed href nor a subpage: legible, but inert. */
const plainRow = (c: CaseRecord) =>
  el('span', { style: css({ ...CELLS, cursor: 'default' }) }, ...rowCells(c));

const ROW_BASE: Record<string, string | number> = {
  position: 'absolute',
  left: 0,
  right: 0,
  height: PAGE1.rowH,
  display: 'grid',
  'align-items': 'center',
  'border-bottom': `1px solid ${RULE.onPaperMinor}`,
};

/**
 * A case row. The control inside it is chosen from the record, never asserted:
 * a `subpage` opens a screen in this stage, an `href` opens a deployed demo,
 * and a record carrying neither degrades to plain type rather than to a dead
 * anchor that still claims to open something.
 *
 * The row carries no hover class — being a real control is what earns it the
 * band stack from wireHovers, and `.ps-hov-invert` on top would fight the band.
 */
function caseRow(c: CaseRecord, i: number): HTMLElement {
  const subpage = str(c.subpage);
  const live = str(c.href);

  // A subpage row owns its trailing cell, so the row is one full-width column.
  // The anchor rows keep the two-column split, because `source` is a second
  // link and an anchor may not nest.
  return el(
    'div',
    {
      'data-hov': 'case',
      'data-case': i + 1,
      'data-cap': c.caption,
      'data-fig': `fig ${c.idx}`,
      'data-intro': 'wipeX',
      'data-in-delay': 120 + i * 40,
      'data-in-dur': 330,
      style: css({
        ...ROW_BASE,
        'grid-template-columns': subpage ? '1fr' : PAGE1.rowSplit,
        'clip-path': 'inset(0 100% 0 0)',
        top: PAGE1.rowsY + i * PAGE1.rowH,
      }),
    },
    subpage ? subpageButton(c, subpage) : live ? liveLink(c, live) : plainRow(c),
    subpage ? null : sourceCell(c),
  );
}

/* ------------------------------------------------------------- motion band */

/** The eight stills as a filmstrip. Decorative here — the anchor is named. */
const filmstrip = () =>
  el(
    'div',
    {
      'aria-hidden': 'true',
      style: css({
        display: 'grid',
        'grid-template-columns': `repeat(${MOTION_STUDIES.length},1fr)`,
        gap: MOTION_SHEET.gap,
        padding: '0 40px',
      }),
    },
    ...MOTION_STUDIES.map((m) =>
      el(
        'span',
        {
          style: css({
            display: 'block',
            position: 'relative',
            height: PAGE1.motion.still,
            overflow: 'hidden',
            'box-shadow': `0 0 0 1px ${RULE.onPaperMajor}`,
          }),
        },
        // stills are 800 × 450; the box is sized off its height at the same 16:9
        coverImage(m.poster, '', (PAGE1.motion.still * 16) / 9, PAGE1.motion.still),
      ),
    ),
  );

/**
 * The motion archive, as its own full-bleed band above the footer rather than
 * an eighth table row. Everything about it is deliberately a different object
 * from the table — twice the height, a 2px rust rule instead of the rows'
 * hairline, its own ground, the filmstrip, and a named open affordance — while
 * still driving the key-frame panel like a row does, via `data-hov="case"` and
 * the contact-sheet slot index.
 */
function motionBand(n: number): HTMLElement {
  const label = el(
    'span',
    {
      style: css({
        display: 'flex',
        'flex-direction': 'column',
        gap: 7,
        'padding-left': MODULE,
      }),
    },
    el(
      'span',
      {
        style: css({
          'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
          'font-size': 40,
          'line-height': '1',
          'letter-spacing': '-.03em',
        }),
      },
      MOTION_BAND.label,
    ),
    el(
      'span',
      { style: css({ 'font-size': 13, 'letter-spacing': '.16em', opacity: '.8' }) },
      MOTION_ARCHIVE_LABEL,
    ),
  );

  const open = el(
    'span',
    {
      style: css({
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'flex-end',
        gap: 16,
        'padding-right': 101.8,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    MOTION_BAND.open,
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 22, 'line-height': '1' }) }, '→'),
  );

  return el(
    'a',
    {
      href: asset(MOTION_ARCHIVE_HREF),
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `Motion studies, open the archive, ${MOTION_ARCHIVE_LABEL}, opens in a new tab`,
      'data-hov': 'case',
      'data-case': n,
      'data-cap': MOTION_BAND.cap,
      'data-fig': MOTION_BAND.fig,
      'data-intro': 'wipeX',
      'data-in-delay': 400,
      'data-in-dur': 420,
      style: css({
        ...LINK,
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        right: 0,
        top: PAGE1.motion.y,
        height: PAGE1.motion.h,
        display: 'grid',
        'grid-template-columns': PAGE1.motion.cols,
        'align-items': 'center',
        'border-top': `2px solid ${COLOR.wood}`,
        background: rgba(COLOR.shadow, 0.07),
      }),
    },
    label,
    filmstrip(),
    open,
  );
}

/* -------------------------------------------------------------------- chrome */

/**
 * The header's inventory cell, derived rather than typed out.
 *
 * It names the split instead of a flat count, because the rows are not all the
 * same thing: most open a deployed demo, the rest open a case study in this
 * stage. "9 cases" would be true and useless; "9 live" would be false.
 *
 * The second group is counted by what it DOES, not by how finished it is. It
 * read "concept" while chellbook was the only member, and that stopped being
 * true when df2tm joined it: df2tm is a shipped plugin with no hosted page,
 * not concept-stage work. What the two share is that there is nothing to
 * navigate to, so the row opens a screen instead.
 */
const DEPLOYED = CASES.filter((c) => str(c.href) !== null).length;
const STUDIES = CASES.length - DEPLOYED;
const INVENTORY = `${DEPLOYED} live, ${STUDIES} case studies, one motion archive`;

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Close, back to studio index',
      class: 'ps-hov-invert',
      style: css({
        ...BTN,
        display: 'flex',
        'align-items': 'center',
        gap: 16,
        'padding-left': MODULE,
        'border-right': `1px solid ${RULE.onPaperMinor}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15 }) }, '✕'),
    'close',
  );

  const cell = (text: string, rule: boolean) =>
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'align-items': 'center',
          padding: '0 20px',
          'border-right': rule ? `1px solid ${RULE.onPaperMinor}` : null,
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
        height: PAGE1.headerH,
        'box-sizing': 'border-box',
        display: 'grid',
        'grid-template-columns': PAGE1.headerCols,
        'border-bottom': `1px solid ${RULE.onPaperMajor}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell('01 · product designs', true),
    cell(INVENTORY, true),
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'align-items': 'center',
          padding: '0 101.8px 0 20px',
          'justify-content': 'space-between',
        }),
      },
      `module ${MODULE} · rev 04`,
      el('span', { style: css({ opacity: '.6' }) }, 'grid on'),
    ),
  );
}

function tableHeader(): HTMLElement {
  // Same two-column split as a row, so the labels sit over the columns they name.
  const labels = el(
    'span',
    {
      style: css({
        display: 'grid',
        'grid-template-columns': PAGE1.rowCols,
        'align-items': 'center',
        height: '100%',
      }),
    },
    el('span', { style: css({ 'padding-left': MODULE }) }, 'idx'),
    el('span', {}, 'case'),
    el('span', {}, 'thesis'),
    el('span', {}, 'year'),
    el('span', { style: css({ 'padding-right': 24, 'text-align': 'right' }) }, 'discipline'),
  );

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 80,
      'data-in-dur': 380,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        right: 0,
        top: PAGE1.tableHeaderY,
        height: PAGE1.tableHeaderH,
        display: 'grid',
        'grid-template-columns': PAGE1.rowSplit,
        'align-items': 'center',
        'border-top': `1px solid ${RULE.onPaperMajor}`,
        'border-bottom': `1px solid ${RULE.onPaperMinor}`,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
      }),
    },
    labels,
    el('span', { style: css({ 'padding-right': 101.8, 'text-align': 'right' }) }, 'source'),
  );
}

function footer(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Back to studio index',
      class: 'ps-hov-invert',
      style: css({
        ...BTN,
        display: 'flex',
        'align-items': 'center',
        gap: 18,
        'padding-left': MODULE,
        'border-right': `1px solid ${RULE.onPaperMinor}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '←'),
    'studio index',
  );

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
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '0 101.8px 0 20px',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    'next — 02 paintings',
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '→'),
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
        top: PAGE1.footer.y,
        height: PAGE1.footer.h,
        display: 'grid',
        'grid-template-columns': '654.545px 581.818px 1fr',
        'border-top': `1px solid ${RULE.onPaperMajor}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    el(
      'span',
      {
        style: css({
          display: 'flex',
          'align-items': 'center',
          padding: '0 20px',
          'border-right': `1px solid ${RULE.onPaperMinor}`,
          opacity: '.72',
        }),
      },
      'channel 01 of 04',
    ),
    next,
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
  const gridOverlay = el('div', {
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      inset: '0',
      'pointer-events': 'none',
      'background-image': `linear-gradient(to right,${RULE.gridLine} 0 ${PAGE1.gridLine}px,rgba(255,255,255,0) ${PAGE1.gridLine}px),linear-gradient(to bottom,${RULE.gridLine} 0 ${PAGE1.gridLine}px,rgba(255,255,255,0) ${PAGE1.gridLine}px)`,
      'background-size': `${PAGE1.gridPitch}px 100%,100% ${PAGE1.gridPitch}px`,
      'background-position': '0 0,0 4.45px',
    }),
  });

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
      'z-index': '1',
    }),
  });

  const title = el(
    'div',
    {
      'data-ptitle': true,
      style: css({
        position: 'absolute',
        'z-index': '3',
        left: PAGE1.title.x,
        top: PAGE1.title.y,
        'transform-origin': '0 0',
        'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
        'font-size': PAGE1.title.size,
        'line-height': `${PAGE1.title.lh}px`,
        'letter-spacing': PAGE1.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters('Product').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
    el('br'),
    ...letters('designs').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
  );

  const thesis = el(
    'div',
    {
      'data-intro': 'fade',
      'data-dfx': 7,
      'data-in-delay': 180,
      'data-in-dur': 340,
      style: css({
        opacity: '0',
        position: 'absolute',
        left: PAGE1.thesis.x,
        top: PAGE1.thesis.y,
        width: PAGE1.thesis.w,
        'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
        'font-size': PAGE1.thesis.size,
        'line-height': String(PAGE1.thesis.lh),
        'letter-spacing': PAGE1.thesis.track,
        'text-wrap': 'pretty',
      }),
    },
    CASES_THESIS,
  );

  const figCaption = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 260,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE1.figCaption.x,
        top: PAGE1.figCaption.y,
        width: PAGE1.figCaption.w,
        display: 'flex',
        'justify-content': 'space-between',
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    el('span', { 'data-ccap': true }, CASES[0].caption),
    el('span', { 'data-cfig': true, style: css({ opacity: '.7' }) }, `fig ${CASES[0].idx}`),
  );

  const body = el(
    'div',
    {
      'data-pbody': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '2', opacity: '0' }),
    },
    header(),
    thesis,
    panel(),
    figCaption,
    tableHeader(),
    ...CASES.map(caseRow),
    motionBand(CASES.length + 1),
    footer(),
  );

  return el(
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
    gridOverlay,
    frost,
    title,
    body,
    /*
      Row 08's case study lives inside this page, the way page 03 carries the
      Kona N one: `runtime/chellbook.ts` resolves its parts with
      `screen.closest('[data-page]')`, and it grows out of the row that opened
      it rather than arriving as a separate route.
    */
    chellbookPage.build(),
    // the df2tm row's screen, mounted the same way and for the same reasons
    df2tmPage.build(),
    mfnyPage.build(),
    chipotlePage.build(),
    leePage.build(),
    guestpassPage.build(),
  );
}
