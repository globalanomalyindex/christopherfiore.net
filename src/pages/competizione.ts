/**
 * Screen 4 · Page 03 — Competizione.
 *
 * ONE PROJECT, ONE ENTRY. The index used to list the four BLSP system plates as
 * four rows, which read as four projects in the channel. It is one project with
 * four plates, so the right column now carries a single 612 × 400 block — name,
 * class · year · state, descriptor, standfirst — bottom-aligned with the hero.
 * The plates live inside the case study it opens.
 *
 * Both the hero and the entry open that case study: `data-act="evidence"`,
 * built by `src/pages/evidence.ts` and grown out of the box that was clicked.
 * With the per-row hover gone there is no hero plate swap left, so the hero is
 * one image rather than five stacked `[data-cslot]` layers, and page 03 no
 * longer participates in actions.ts's `swapSlot`.
 *
 * The hero image is `contain`, not `cover`, and the box is sized to what
 * `contain` draws. See PAGE3 in src/design/layout.ts: `cover` was cropping 35%
 * of the render's height, and what it cropped included the disclaimer strip
 * burned into the bottom of the render — "3D RENDER — CONCEPT VISUALIZATION
 * ONLY — NOT FOR ROAD OR TRACK USE". That is a claim boundary, not letterboxing
 * we can trade away.
 *
 * The release language in `src/data/competizione.ts` and `src/data/blsp-case.ts`
 * is load-bearing. The header's fourth cell carries `CZ_META.release`, the
 * caption under the hero carries `BLSP.previewCaption` in full, and the gates
 * line carries `CZ_GATES` for exactly that reason — do not soften any of them.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, FONT, RULE } from '../design/tokens.ts';
import { PAGE3 } from '../design/layout.ts';
import { CZ_GATES, CZ_META, EV_SHEETS, HERO, sheetForImage } from '../data/competizione.ts';
import { BLSP, BLSP_ASSEMBLIES } from '../data/blsp-case.ts';
import * as evidencePage from './evidence.ts';

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

/** The sheet both doors open on: the installed render the hero is showing. */
const PREVIEW_SHEET = sheetForImage(BLSP.preview);

/**
 * 15 × 15px corner marks, two 1px lines, offset -7.5px.
 *
 * z-index 3 clears the hero's `.ps-ev-chip`, which needs a stacking context of
 * its own to sit over the render and would otherwise swallow a mark. A
 * registration mark crossing the tab is the point; a missing one reads as a
 * mistake.
 */
const cross = (pos: Record<string, string | number>) =>
  el('span', {
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      width: 15,
      height: 15,
      'z-index': '3',
      'pointer-events': 'none',
      'background-image': `linear-gradient(${COLOR.drape},${COLOR.drape}),linear-gradient(${COLOR.drape},${COLOR.drape})`,
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

/* --------------------------------------------------------------------- hero */

/**
 * The hero is one door into the case study, so it is a real <button>.
 *
 * `data-nohl` opts it out of hover.ts's band stack: that stack paints at
 * z-index -1, which on an opaque image means an invisible hover and — worse —
 * an ink pin that would drag the tab's lavender type down to near-black on its
 * own dark plaque. `.ps-hov-evidence` gives it its own state instead: the tab
 * inverts to an acid band with near-black ink, and the 1px frame goes solid
 * rust. That class carries the resting frame too: an inline box-shadow would
 * outrank the hover, and composing with `.ps-frame` would leave the focus state
 * decided by whichever class sits lower in pages.css.
 */
function hero(): HTMLElement {
  /*
    .ps-ev-chip carries the whole tab. It is opaque for the same reason the
    painting plaques are, and its colors must stay overridable by the hover —
    so they live in the class and only its position is inline. It is pinned
    bottom-RIGHT here, against the class's own bottom-left: `contain` lands the
    render flush with the box's bottom edge, and the render's own disclaimer
    strip is burned into its bottom-left corner. A tab at bottom-left would sit
    on top of it.
  */
  const tab = el(
    'span',
    { class: 'ps-ev-chip', style: css({ left: 'auto', right: 0 }) },
    `evidence · ${EV_SHEETS.length} sheets`,
  );

  const render = el('img', {
    src: asset(BLSP.preview),
    alt: BLSP.previewAlt,
    loading: 'lazy',
    decoding: 'async',
    width: Math.round(PAGE3.hero.w),
    height: PAGE3.hero.h,
    style: css({
      display: 'block',
      width: '100%',
      height: '100%',
      // contain, never cover — see the module comment. The 8px a side this
      // leaves falls on the page's own lavender, which the button does not
      // paint over.
      'object-fit': 'contain',
    }),
  });

  return el(
    'button',
    {
      type: 'button',
      'data-act': 'evidence',
      'data-sheet': PREVIEW_SHEET,
      'data-nohl': true,
      'aria-label': `Open the ${BLSP.name} case study, ${EV_SHEETS.length} sheets`,
      class: 'ps-hov-evidence',
      'data-intro': 'fade',
      'data-dfx': 12,
      'data-in-delay': 120,
      'data-in-dur': 420,
      style: css({
        opacity: '0',
        position: 'absolute',
        left: PAGE3.hero.x,
        top: PAGE3.hero.y,
        width: PAGE3.hero.w,
        height: PAGE3.hero.h,
      }),
    },
    render,
    tab,
    ...corners(),
  );
}

/* ------------------------------------------------------------ the one entry */

/**
 * The index. One project, one block, the height of the hero.
 *
 * Name, class, year and state come from BLSP; so do the descriptor and the
 * standfirst, which are what make the block a project rather than a row. It
 * opens the same case study the hero does, at the same sheet.
 */
function entry(): HTMLElement {
  const line = (text: string) => el('span', {}, text);

  const meta = el(
    'span',
    {
      style: css({
        display: 'flex',
        'justify-content': 'space-between',
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.78',
      }),
    },
    line(BLSP.klass),
    line(BLSP.year),
    line(BLSP.state),
  );

  const name = el(
    'span',
    {
      style: css({
        display: 'block',
        'margin-top': 18,
        'font-family': FONT.display,
        'font-size': PAGE3.nameSize,
        'line-height': '.96',
        'letter-spacing': '-.03em',
      }),
    },
    BLSP.name,
  );

  const tagline = el(
    'span',
    {
      style: css({
        display: 'block',
        'margin-top': 16,
        'font-size': 21,
        'line-height': '1.3',
        'letter-spacing': '-.01em',
      }),
    },
    BLSP.tagline,
  );

  const descriptor = el(
    'span',
    {
      style: css({
        display: 'block',
        'font-size': 17,
        'line-height': '1.42',
        'letter-spacing': '-.005em',
        'text-wrap': 'pretty',
      }),
    },
    BLSP.descriptor,
  );

  const standfirst = el(
    'span',
    {
      style: css({
        display: 'block',
        'margin-top': 14,
        'font-size': 13,
        'letter-spacing': '.16em',
        'line-height': '1.5',
        opacity: '.78',
      }),
    },
    BLSP.standfirst,
  );

  const cue = el(
    'span',
    {
      style: css({
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'padding-top': 14,
        'border-top': `1px solid ${RULE.onPaperMajor}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    line('open case study'),
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '→'),
  );

  return el(
    'button',
    {
      type: 'button',
      'data-act': 'evidence',
      'data-sheet': PREVIEW_SHEET,
      'aria-label': `Open the ${BLSP.name} case study`,
      /*
        `data-nohl` for a legibility reason, not a taste one. hover.ts's band
        stack is calibrated for row-height buttons: one LIGHTS band covering
        56–80% of the height carries the type, and the darker MARA rows above
        and below it are edge accents that nothing sits on. At 400px those
        "edges" are 80px tall — the meta row landed on a MARA orange and the
        cue landed on MARA blue, near-black ink at ~2.3:1. The band the type
        sits on is always from LIGHTS; if the geometry cannot promise that, it
        does not get the band stack. `.ps-hov-invert` gives it the page's other
        legitimate pair instead — rust fill, lavender ink — across the whole
        block.
      */
      'data-nohl': true,
      class: 'ps-hov-invert',
      'data-intro': 'wipeX',
      'data-in-delay': 170,
      'data-in-dur': 380,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE3.entry.x,
        top: PAGE3.entry.y,
        width: PAGE3.entry.w,
        height: PAGE3.entry.h,
        'box-sizing': 'border-box',
        display: 'flex',
        'flex-direction': 'column',
        'justify-content': 'space-between',
        'text-align': 'left',
        padding: '18px 12px 16px',
        'border-bottom': `1px solid ${RULE.onPaperMinor}`,
        cursor: 'pointer',
        transition: 'background 160ms linear,color 160ms linear',
      }),
    },
    el('span', { style: css({ display: 'block' }) }, meta, name, tagline),
    el('span', { style: css({ display: 'block' }) }, descriptor, standfirst),
    cue,
  );
}

/* -------------------------------------------------------- assemblies band */

/**
 * The five functional assemblies, at full text, in the band the hero's
 * letterbox freed. Not interactive — this is what the system *is*; the entry
 * beside it is the door.
 */
function assemblies(): HTMLElement[] {
  const head = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 140,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE3.assemblies.x,
        top: PAGE3.assemblies.y,
        width: PAGE3.assemblies.w,
        height: PAGE3.assemblies.headerH,
        'box-sizing': 'border-box',
        display: 'flex',
        'align-items': 'flex-end',
        'padding-bottom': 10,
        'border-bottom': `1px solid ${RULE.onPaperMajor}`,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
      }),
    },
    'assemblies',
  );

  const rowsY = PAGE3.assemblies.y + PAGE3.assemblies.headerH;

  const rows = BLSP_ASSEMBLIES.map((a, i) =>
    el(
      'div',
      {
        'data-intro': 'wipeX',
        'data-in-delay': 200 + i * 60,
        'data-in-dur': 320,
        style: css({
          'clip-path': 'inset(0 100% 0 0)',
          position: 'absolute',
          left: PAGE3.assemblies.x,
          top: rowsY + i * PAGE3.assemblies.rowH,
          width: PAGE3.assemblies.w,
          height: PAGE3.assemblies.rowH,
          'box-sizing': 'border-box',
          'border-bottom': `1px solid ${RULE.onPaperMinor}`,
          display: 'flex',
          'flex-direction': 'column',
          'justify-content': 'center',
          gap: 6,
        }),
      },
      el(
        'div',
        {
          style: css({
            display: 'flex',
            'align-items': 'baseline',
            gap: 10,
          }),
        },
        el('span', { style: css({ 'font-size': 11.5, 'letter-spacing': '.22em', opacity: '.55' }) }, a.n),
        el(
          'span',
          {
            style: css({
              'font-family': FONT.display,
              'font-size': 15,
              'letter-spacing': '-.02em',
            }),
          },
          a.name,
        ),
      ),
      el(
        'div',
        {
          style: css({
            'font-size': 12,
            'line-height': '1.38',
            'letter-spacing': '.01em',
            'text-wrap': 'pretty',
            opacity: '.78',
          }),
        },
        a.body,
      ),
    ),
  );

  return [head, ...rows];
}

/* ------------------------------------------------------------------- chrome */

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
        'grid-column': 'span 2',
        display: 'flex',
        'align-items': 'center',
        gap: 16,
        padding: '0 20px 0 56px',
        'border-right': `1px solid ${RULE.onPaperMinor}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15 }) }, '✕'),
    'close',
  );

  const cell = (text: string, span: number, padding: string, rule: boolean) =>
    el(
      'span',
      {
        style: css({
          'grid-column': `span ${span}`,
          display: 'flex',
          'align-items': 'center',
          padding,
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
        height: PAGE3.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${RULE.onPaperMajor}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell('03 · competizione', 3, '0 20px', true),
    cell(CZ_META.count, 3, '0 20px', true),
    cell(CZ_META.release, 4, '0 56px 0 20px', false),
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
        'grid-column': 'span 4',
        display: 'flex',
        'align-items': 'center',
        gap: 18,
        padding: '0 20px 0 56px',
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
      'data-next': 4,
      'aria-label': 'Next channel, 04 Contact',
      class: 'ps-hov-invert',
      style: css({
        ...BTN,
        'grid-column': 'span 4',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '0 56px 0 20px',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    'next — 04 contact',
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
        bottom: 0,
        height: PAGE3.footerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
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
          'grid-column': 'span 4',
          display: 'flex',
          'align-items': 'center',
          padding: '0 20px',
          'border-right': `1px solid ${RULE.onPaperMinor}`,
          opacity: '.72',
        }),
      },
      'channel 03 of 04',
    ),
    next,
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
  /** Irregular speed lines: two pitches, two cycles, so coverage fluctuates. */
  const speedLine = (
    stripe: string,
    pitch: number,
    maskAlpha: string,
    animation: string,
  ) =>
    el('div', {
      // the hook motion.css's prefers-reduced-motion block freezes these on
      'data-speed': true,
      style: css({
        position: 'absolute',
        left: '-50%',
        top: 0,
        width: '200%',
        height: '100%',
        'background-image': `repeating-linear-gradient(90deg,${stripe} 0 3px,rgba(0,0,0,0) 3px ${pitch}px)`,
        '-webkit-mask-image': `repeating-conic-gradient(#000 0% 25%,rgba(0,0,0,${maskAlpha}) 0% 50%)`,
        'mask-image': `repeating-conic-gradient(#000 0% 25%,rgba(0,0,0,${maskAlpha}) 0% 50%)`,
        '-webkit-mask-size': '6px 6px',
        'mask-size': '6px 6px',
        animation,
      }),
    });

  const speed = el(
    'div',
    {
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        inset: '0',
        overflow: 'hidden',
        'pointer-events': 'none',
        opacity: '.42',
      }),
    },
    speedLine('rgba(43,11,3,.34)', PAGE3.speedPitch, '.22', 'ps-rush 1.7s steps(63,end) infinite'),
    speedLine('rgba(43,11,3,.2)', 70, '.3', 'ps-rush2 .9s steps(23,end) infinite'),
  );

  const frost = el('canvas', {
    'data-frost': 'field',
    'data-mode': 3,
    'data-rest-mode': 3,
    'data-rest-op': '.24',
    'data-boost': 3.1,
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

  const checker = el(
    'div',
    {
      'data-pcheck': true,
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        left: 0,
        right: 0,
        top: PAGE3.checker.top,
        height: PAGE3.checker.h,
        overflow: 'hidden',
        'pointer-events': 'none',
        'z-index': '1',
      }),
    },
    el('div', {
      style: css({
        position: 'absolute',
        left: -96,
        right: -96,
        top: 0,
        bottom: 0,
        'background-image': `repeating-conic-gradient(${COLOR.drapeDeep} 0% 25%,rgba(0,0,0,0) 0% 50%)`,
        'background-size': `${PAGE3.checker.cell * 2}px ${PAGE3.checker.cell * 2}px`,
        animation: 'ps-checkdrift 2.6s linear infinite',
      }),
    }),
  );

  const title = el(
    'div',
    {
      'data-ptitle': true,
      style: css({
        position: 'absolute',
        'z-index': '3',
        left: PAGE3.title.x,
        top: PAGE3.title.y,
        'transform-origin': '0 0',
        'font-family': FONT.display,
        'font-size': PAGE3.title.size,
        'line-height': `${PAGE3.title.lh}px`,
        'letter-spacing': PAGE3.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters('Competizione').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
  );

  const captionRow = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 150,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE3.captionRow.x,
        top: PAGE3.captionRow.y,
        // The design runs this row to the page's right margin, where its last
        // item lands on top of the index column at y 500. It stops at 1163.6
        // instead — the right edge of the assemblies band, which is where the
        // left half of the page now ends.
        width: PAGE3.captionRow.w,
        display: 'flex',
        'justify-content': 'space-between',
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.8',
      }),
    },
    el('span', {}, CZ_META.captionLeft),
    el('span', {}, CZ_META.captionMid),
    el('span', {}, CZ_META.captionRight),
  );

  /*
    The full boundary, not the short one. The hero is a render of a car that has
    never been measured; `BLSP.previewCaption` carries "concept visualization
    only · not road or track released" whole, and the caption box spans the
    hero plus the assemblies band so it never has to be cut to fit.
  */
  const figCaption = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE3.heroCaption.x,
        top: PAGE3.heroCaption.y,
        width: PAGE3.heroCaption.w,
        display: 'flex',
        'justify-content': 'space-between',
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    el('span', {}, BLSP.previewCaption),
    el('span', { style: css({ opacity: '.7' }) }, HERO.fig),
  );

  const listHeader = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 110,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE3.list.x,
        top: PAGE3.list.y,
        width: PAGE3.list.w,
        'box-sizing': 'border-box',
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
        display: 'flex',
        'justify-content': 'space-between',
        padding: '0 12px 10px',
        'border-bottom': `1px solid ${RULE.onPaperMajor}`,
      }),
    },
    // "project", not "system": one project is exactly what the column holds.
    el('span', {}, 'project'),
    el('span', {}, 'class · year · state'),
  );

  const gates = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 340,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE3.gatesLine.x,
        top: PAGE3.gatesLine.y,
        width: PAGE3.gatesLine.w,
        'font-size': 13,
        'letter-spacing': '.16em',
        'line-height': '1.5',
        'text-wrap': 'pretty',
        opacity: '.7',
      }),
    },
    CZ_GATES,
  );

  const body = el(
    'div',
    {
      'data-pbody': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '2', opacity: '0' }),
    },
    header(),
    captionRow,
    hero(),
    figCaption,
    ...assemblies(),
    listHeader,
    entry(),
    gates,
    footer(),
  );

  return el(
    'section',
    {
      'data-page': 3,
      'data-screen-label': 'Page 03 competizione',
      role: 'region',
      'aria-label': 'Competizione',
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
    speed,
    frost,
    checker,
    title,
    body,
    /*
      The evidence viewer is a child of this section, not of the stage, so the
      page's own open/close clip carries it and it can never outlive the
      channel it belongs to. It sits after `body` on purpose: navParts() resolves
      `[data-frost]` with a first-match query, so the page's own veil canvas has
      to stay earlier in the tree than the viewer's.
    */
    evidencePage.build(),
  );
}
