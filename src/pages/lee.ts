/**
 * Page 01 subpage — lee, a self-tape recording interface for macOS.
 *
 * A sibling of `pages/chipotle.ts` and deliberately the same shape: a plate on
 * the left, prose beside it, a scannable glance column on the right. This one
 * has no before and after to argue with, because nothing is being redesigned.
 * The plate walks the product instead, in the order the product itself puts its
 * four steps in, and ends on the exploration that was rejected to get there.
 *
 * WHERE IT DIVERGES: the plate carries SIX views rather than chipotle's five,
 * so the toggle is a six-way radiogroup. Five are the program's own screens,
 * captured from the hosted prototype at 3× and set on the desk color the
 * prototype itself uses. The sixth is the wireframe document, which is a
 * different kind of artifact and is drawn full bleed rather than as a window,
 * because it is a page and not an app.
 *
 * All six are 1456 × 874, the plate's ratio. Not one of them is a screenshot of
 * a product: there is no macOS app, every camera feed in them is a striped
 * placeholder, and their captions have to keep saying so.
 *
 * Every image is mounted at once and crossfaded rather than swapped by `src`:
 * a hard swap flashes white while the new file decodes, which is exactly wrong
 * for a set someone is going to walk back and forth.
 *
 * TWO DOORS: the prototype and the wireframe exploration, both hosted here.
 * The second earns its place because the case argues from what was rejected,
 * and the rejections only exist in that document.
 *
 * Every claim boundary in `src/data/lee.ts` is printed, not paraphrased. The
 * footer carries the one that matters most, that none of this was built, where
 * it cannot be scrolled past.
 */

import { asset, css, el, letters } from '../dom.ts';
import { zoomTrigger } from '../runtime/lightbox.ts';
import { COLOR, rgba } from '../design/tokens.ts';
import { LEE_PAGE as LP } from '../design/layout.ts';
import {
  LEE,
  LEE_GLANCE,
  LEE_LEAD_VIEW,
  LEE_SECTIONS,
} from '../data/lee.ts';
import { STUDIO } from '../data/studio.ts';

const KARRIK = "'Karrik',sans-serif";
const MAJOR = rgba(COLOR.lavender, 0.28);
const MINOR = rgba(COLOR.lavender, 0.2);

const TEXT_H = LP.bandEnd - LP.text.y;
const SCROLL_TOP = LP.secBarH + LP.secBarGap;
const SCROLL_PAD = LP.railW + 16;

const two = (n: number): string => String(n).padStart(2, '0');

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

const microLabel = (text: string, opacity = '.6') =>
  el(
    'span',
    {
      style: css({ display: 'block', 'font-size': 11.5, 'letter-spacing': '.22em', opacity }),
    },
    text,
  );

/**
 * The six plate views, in walk order.
 *
 * THE ORDER IS THE NARRATIVE, and the scroll sync depends on it. Reading the
 * column walks this list forward and never back: the four steps the program
 * itself is built around, script then notes then record, the light that only
 * lives on the record screen, takes, and last the wireframes the whole thing
 * was cut down from. A view moved out of this order makes the plate jump
 * backwards while someone is reading straight down.
 *
 * NONE OF THESE IS A SCREENSHOT OF A PRODUCT. Five are the hosted prototype,
 * captured at 3× and set on the desk color the prototype uses for its own
 * ground. The sixth is the wireframe document. Every camera feed in them is a
 * striped placeholder, and each caption says so: a reader who lands mid-walk
 * should never have to work out whether they are looking at a product or a
 * proposal.
 */
const VIEWS = [
  {
    id: 'script',
    label: 'script',
    src: 'projects/lee-script.webp',
    alt:
      'The script screen: a scene in standard screenplay format on a white page, with three ' +
      'phrases of dialogue highlighted in different colors, and panels on the right listing the ' +
      'three characters and the three marks with their counts',
    caption:
      'the script, as a design render · marks go on a phrase, not a line, and the actor names the colors',
  },
  {
    id: 'notes',
    label: 'notes',
    src: 'projects/lee-notes.webp',
    alt:
      'The notes screen: the script scaled down in a column on the left, and a dotted canvas on ' +
      'the right holding note frames, two empty image slots reading Drop an image, and a tool ' +
      'strip down the right edge',
    caption:
      'the notes canvas, as a design render · every note is tied to a phrase, and the tie is what carries the color',
  },
  {
    id: 'record',
    label: 'record',
    src: 'projects/lee-record.webp',
    alt:
      'The record screen: the current line and the next in a bar at the top of the camera feed ' +
      'under the lens, an amber eyeline guide across the frame, a row of glyph buttons and a ' +
      'centered record button below, and the reader panel on the right',
    caption:
      'the record screen, as a design render · the lines sit under the lens, and the camera feed is a placeholder',
  },
  {
    id: 'light',
    label: 'ring light',
    src: 'projects/lee-light.webp',
    alt:
      'The same record screen with the ring light on: a warm emissive border framing the camera ' +
      'feed, a soft wash over the rest of the window, a soft hole in the light around the ' +
      'pointer, and the intensity and temperature sliders open above the bulb button',
    caption:
      'the ring light, as a design render · the display is the light, and it cuts a hole around the cursor so the interface stays usable',
  },
  {
    id: 'takes',
    label: 'takes',
    src: 'projects/lee-takes.webp',
    alt:
      'The takes screen: two takes listed with durations and stars on the left, a player over a ' +
      'placeholder frame in the middle, and an export panel on the right with format checkboxes, ' +
      'a casting checklist and the generated file names',
    caption:
      'takes and export, as a design render · export is a panel here, not a place, because you export the take you just picked',
  },
  {
    id: 'wireframes',
    label: 'wireframes',
    src: 'projects/lee-wireframes.webp',
    alt:
      'The wireframe document: a round of low fidelity options laid out side by side, each with ' +
      'a short id and a numbered list of what it is arguing, showing the notes canvas sketch and ' +
      'the tie between a marked phrase and a note',
    caption:
      'the exploration · three rounds of options, newest at the top, and every rejected one kept its id',
  },
] as const;

/* ------------------------------------------------------------------ chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'lee-close',
      'aria-label': 'Close, back to product designs',
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
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

  const cell = (text: string, span: number, padding: string, rule: boolean) =>
    el(
      'span',
      {
        style: css({
          'grid-column': `span ${span}`,
          display: 'flex',
          'align-items': 'center',
          padding,
          'border-right': rule ? `1px solid ${MINOR}` : null,
          overflow: 'hidden',
          'white-space': 'nowrap',
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
        height: LP.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell(`01 · ${LEE.name}`, 3, '0 20px', true),
    cell(LEE.state, 4, '0 20px', true),
    cell(STUDIO.rev, 3, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const back = el(
    'button',
    {
      type: 'button',
      'data-act': 'lee-close',
      'aria-label': 'Back to product designs',
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        'grid-column': 'span 3',
        display: 'flex',
        'align-items': 'center',
        gap: 18,
        padding: '0 20px 0 56px',
        'border-right': `1px solid ${MINOR}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '←'),
    'product designs',
  );

  const demo = el(
    'a',
    {
      href: asset(LEE.demoHref),
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'the prototype, opens in a new tab',
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        'grid-column': 'span 3',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '0 56px 0 20px',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    'the prototype',
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '↗'),
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
        height: LP.footerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-top': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    back,
    /*
      The boundary, in the footer where it cannot be scrolled past — the same
      job EV_META.release does on the Kona N screen and CHELL_CAVEATS[0] does on
      chellbook's. There is no client here at all: this was self-directed, and
      there is no macOS program on the other side of it. A screen that shows an
      app window six times has to say that under every one of them.
    */
    el(
      'span',
      {
        style: css({
          'grid-column': 'span 6',
          display: 'flex',
          'align-items': 'center',
          padding: '0 20px',
          'border-right': `1px solid ${MINOR}`,
          opacity: '.72',
          overflow: 'hidden',
          'white-space': 'nowrap',
        }),
      },
      // Just the state. The footer cell is `white-space: nowrap` with
      // `overflow: hidden`, so anything appended here is clipped rather than
      // wrapped, which is the worst possible place to lose a word. The rest of
      // the boundary is carried by the standfirst, the `open` section and the
      // glance column.
      LEE.state,
    ),
    demo,
  );
}

function titleBlock(): HTMLElement[] {
  const title = el(
    'div',
    {
      'data-sptitle': true,
      style: css({
        position: 'absolute',
        'z-index': '3',
        left: LP.title.x,
        top: LP.title.y,
        'transform-origin': '0 0',
        'font-family': KARRIK,
        'font-size': LP.title.size,
        'line-height': `${LP.title.lh}px`,
        'letter-spacing': LP.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters(LEE.name).map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
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
        left: LP.title.x,
        top: LP.descriptorY,
        width: 900,
        margin: '0',
        'font-family': KARRIK,
        'font-size': 20,
        'line-height': '1.4',
        'letter-spacing': '.005em',
        opacity: '.88',
      }),
    },
    LEE.descriptor,
  );

  const meta = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 180,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: LP.title.x,
        top: LP.metaY,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.66',
      }),
    },
    `${LEE.role} · ${LEE.surface}`,
  );

  const rule = el('div', {
    'data-intro': 'wipeX',
    'data-in-delay': 210,
    'data-in-dur': 420,
    'aria-hidden': 'true',
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: LP.title.x,
      right: LP.title.x,
      top: LP.ruleY,
      height: 1,
      background: MAJOR,
    }),
  });

  return [title, descriptor, meta, rule];
}

/* ------------------------------------------------------------------- plate */

/**
 * All six views, every one mounted, crossfaded between. `object-fit: contain`
 * is not needed — the composites are cut to 1456 × 874 and the box is the same
 * ratio — but `cover` would still crop on a rounding error, so `contain` it is.
 */
function plate(): HTMLElement {
  return el(
    'div',
    {
      'data-leplate': true,
      style: css({
        position: 'absolute',
        left: LP.plate.x,
        top: LP.plate.y,
        width: LP.plate.w,
        height: LP.plate.h,
        background: rgba(COLOR.lavender, 0.06),
        border: `1px solid ${MINOR}`,
        overflow: 'hidden',
      }),
    },
    ...VIEWS.map((v, i) =>
      el(
        'div',
        {
          'data-leslot': i,
          'aria-hidden': i ? 'true' : 'false',
          style: css({
            position: 'absolute',
            inset: '0',
            opacity: i ? '0' : '1',
            transition: 'opacity 260ms linear',
          }),
        },
        el('img', {
          src: asset(v.src),
          alt: v.alt,
          width: 1456,
          height: 874,
          decoding: 'async',
          style: css({
            width: '100%',
            height: '100%',
            'object-fit': 'contain',
            display: 'block',
          }),
        }),
      ),
    ),
    // the whole plate is the control that opens the plate full size; it is the
    // last child so it covers the slots, and `data-nohl` keeps wireHovers from
    // building a hover band stack behind a photograph
    zoomTrigger('Open this image at full size'),
  );
}

function plateCaption(): HTMLElement {
  return el(
    'p',
    {
      'data-lecap': true,
      // Walking the view rewrites this text and nothing else announces it, so
      // a screen reader would hear only the radio's own one-word label and
      // never learn what the plate now shows. evidence.ts and chellbook.ts do
      // the same on their captions.
      'aria-live': 'polite',
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 340,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: LP.plate.x,
        top: LP.plateCaptionY,
        width: LP.plate.w,
        margin: '0',
        'font-size': 13,
        'letter-spacing': '.06em',
        'line-height': '1.5',
        opacity: '.72',
      }),
    },
    VIEWS[0].caption,
  );
}

/** A radiogroup: six exclusive views, one of which is showing at any time. */
function toggle(): HTMLElement {
  return el(
    'div',
    {
      role: 'radiogroup',
      'aria-label':
        'Walk the script, the notes canvas, the record screen, the ring light, takes, and the wireframes',
      'data-intro': 'wipeX',
      'data-in-delay': 340,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: LP.plate.x,
        top: LP.toggleY,
        display: 'flex',
        gap: 10,
      }),
    },
    ...VIEWS.map((v, i) =>
      el(
        'button',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': i === 0 ? 'true' : 'false',
          /*
            Roving tabindex: a radiogroup is one tab stop, and the arrows move
            within it. Six separate stops would make Tab walk the same control
            six times. `setLeeView` moves this with the checked state.
          */
          tabindex: i === 0 ? 0 : -1,
          'data-act': 'lee-view',
          'data-view': i,
          class: 'ps-hov-invert-dark',
          style: css({
            ...BTN,
            height: 36,
            padding: '0 18px',
            display: 'flex',
            'align-items': 'center',
            border: `1px solid ${i === 0 ? COLOR.lavender : MAJOR}`,
            'font-size': 13,
            'letter-spacing': '.16em',
            opacity: i === 0 ? '1' : '.62',
            transition: 'background 150ms linear,color 150ms linear,opacity 150ms linear',
          }),
        },
        v.label,
      ),
    ),
  );
}

/**
 * Two doors: the prototype, and the wireframes beside it.
 *
 * The second one is here because the case argues from what was rejected, and
 * the rejected options only exist in that document. A reader who wants to check
 * that the nine stages were real, or that the four teleprompter presets were
 * drawn before they were cut, has nowhere else to look.
 *
 * Neither claims to be a mac app. Both labels say prototype or exploration, and
 * the second line under each says what kind of thing is on the other side.
 */
function doors(): HTMLElement[] {
  const door = (
    href: string,
    label: string,
    sub: string,
    aria: string,
    x: number,
    delay: number,
  ) =>
    el(
      'a',
      {
        href: asset(href),
        target: '_blank',
        rel: 'noopener noreferrer',
        /*
          WCAG 2.5.3, Label in Name: this overrides the accessible name, so it
          has to CONTAIN both visible strings, in the order they are read.
        */
        'aria-label': aria,
        class: 'ps-hov-invert-dark',
        'data-intro': 'wipeX',
        'data-in-delay': delay,
        'data-in-dur': 340,
        style: css({
          ...BTN,
          'clip-path': 'inset(0 100% 0 0)',
          position: 'absolute',
          left: x,
          top: LP.doors.y,
          width: LP.doors.w,
          height: LP.doors.h,
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '0 20px',
          border: `1px solid ${COLOR.lavender}`,
          transition: 'background 150ms linear,color 150ms linear',
        }),
      },
      el(
        'span',
        { style: css({ display: 'flex', 'flex-direction': 'column', gap: 4 }) },
        el('span', { style: css({ 'font-size': 15, 'letter-spacing': '.14em' }) }, label),
        el(
          'span',
          { style: css({ 'font-size': 11.5, 'letter-spacing': '.1em', opacity: '.62' }) },
          sub,
        ),
      ),
      el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 20, 'line-height': '1' }) }, '↗'),
    );

  return [
    door(
      LEE.demoHref,
      'the interactive prototype',
      'all five screens, live, hosted here',
      'the interactive prototype all five screens, live, hosted here. opens in a new tab',
      LP.doors.x,
      380,
    ),
    door(
      LEE.wireHref,
      'the wireframes',
      'three rounds of options, and what was cut',
      'the wireframes three rounds of options, and what was cut. opens in a new tab',
      LP.doors.x + LP.doors.w + LP.doors.gap,
      420,
    ),
  ];
}

/* ------------------------------------------------------------ at a glance */

function glanceColumn(): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 320,
      'data-in-dur': 420,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: LP.glance.x,
        top: LP.glance.y,
        width: LP.glance.w,
        height: LP.bandEnd - LP.glance.y,
      }),
    },
    microLabel('at a glance'),
    el(
      'ul',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: LP.glanceRowsY - LP.glance.y,
          width: '100%',
          margin: '0',
          padding: '0',
          'list-style': 'none',
        }),
      },
      ...LEE_GLANCE.map((r) =>
        el(
          'li',
          { style: css({ padding: '9px 0', 'border-bottom': `1px solid ${MINOR}` }) },
          microLabel(r.field, '.62'),
          el(
            'p',
            {
              style: css({
                margin: '4px 0 0',
                'font-family': KARRIK,
                'font-size': 13.5,
                'line-height': '1.38',
                'text-wrap': 'pretty',
              }),
            },
            r.value,
          ),
        ),
      ),
    ),
  );
}

/* ----------------------------------------------------------- text column */

function textSections(): HTMLElement[] {
  const lead = el(
    'section',
    {
      'data-lesec': 0,
      'data-lesec-name': 'the short version',
      'data-lesec-view': LEE_LEAD_VIEW,
      style: css({ 'padding-bottom': 40 }),
    },
    microLabel('the short version'),
    el(
      'p',
      {
        style: css({
          margin: '12px 0 0',
          'font-family': KARRIK,
          'font-size': 20,
          'line-height': '1.4',
          'letter-spacing': '-.01em',
          'text-wrap': 'pretty',
        }),
      },
      LEE.standfirst,
    ),
  );

  const rest = LEE_SECTIONS.map((sec, i) =>
    el(
      'section',
      {
        // +1: the standfirst above is section 0 of the scroll column
        'data-lesec': i + 1,
        'data-lesec-name': sec.name,
        // The plate follows the reading position. A section with no view
        // leaves the plate wherever it was.
        'data-lesec-view': sec.view ?? null,
        style: css({ 'padding-bottom': 40 }),
      },
      microLabel(`${two(i + 1)} · ${sec.name}`),
      ...sec.paras.map((p) =>
        el(
          'p',
          {
            style: css({
              margin: '12px 0 0',
              'font-family': KARRIK,
              'font-size': 16.5,
              'line-height': '1.55',
              'text-wrap': 'pretty',
            }),
          },
          p,
        ),
      ),
    ),
  );

  return [lead, ...rest];
}

function textColumn(): HTMLElement {
  const bar = el(
    'div',
    {
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: LP.secBarH,
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
    el('span', { 'data-lesecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-lescroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `${LEE.name}, the case`,
      style: css({
        position: 'absolute',
        inset: '0',
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'padding-right': SCROLL_PAD,
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
        width: LP.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-lethumb': true,
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
      'data-in-delay': 280,
      'data-in-dur': 420,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: LP.text.x,
        top: LP.text.y,
        width: LP.text.w,
        height: TEXT_H,
      }),
    },
    bar,
    el(
      'div',
      { style: css({ position: 'absolute', left: 0, right: 0, top: SCROLL_TOP, bottom: 0 }) },
      region,
      rail,
    ),
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
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
      'data-lechrome': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '3', opacity: '0' }),
    },
    header(),
    ...titleBlock(),
    plateCaption(),
    toggle(),
    ...doors(),
    textColumn(),
    glanceColumn(),
    footer(),
  );

  return el(
    'div',
    {
      'data-lee': true,
      'data-screen-label': LEE.name,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${LEE.title}: ${LEE.descriptor}. ${LEE.state}`,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '8',
        display: 'none',
        background: COLOR.plaque,
        color: COLOR.lavender,
        overflow: 'hidden',
      }),
    },
    frost,
    // outside the chrome, so it resolves out of noise like chellbook's plate
    plate(),
    chrome,
  );
}

/** The plate's captions, read by the runtime as the view walks. */
export const LEE_VIEWS = VIEWS;
