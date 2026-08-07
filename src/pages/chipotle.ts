/**
 * Page 01 subpage — the pickup checkout redesign.
 *
 * A sibling of `pages/mfny.ts` and deliberately the same shape: a plate on the
 * left, prose beside it, a scannable glance column on the right. The argument
 * here is visual too. Three of the four screens this responds to are the same
 * checkout page at three scroll positions, and the fastest way to show that is
 * to put all four side by side and let the reader count the repeated total.
 *
 * WHERE IT DIVERGES: the plate carries FIVE views rather than mfny's two, so
 * the toggle is a five-way radiogroup and `CHIPOTLE_VIEWS` is walked rather
 * than flipped. The five are the original screens, the two rejected
 * explorations, the two final screens, the store controls on the confirmation
 * map, and the checkout's own states.
 *
 * All five are composites laid out at 1456 × 874, the plate's ratio, but they
 * are not all the same kind of picture. `before` is built from screenshots of
 * the real shipped app; the other four are built from the handoff's design
 * renders. Their captions carry that distinction and must keep carrying it.
 *
 * `store-actions` is the odd one: a detail rather than a set of whole screens.
 * It has to be, because the change it shows is two 44px controls, and at the
 * scale the other four are drawn you cannot tell a heart from a smudge.
 *
 * Every image is mounted at once and crossfaded rather than swapped by `src`:
 * a hard swap flashes white while the new file decodes, which is exactly wrong
 * for a comparison someone is going to walk back and forth.
 *
 * ONE DOOR: the interactive prototype, hosted here. There is no link to the
 * real app, for the same reason `pages/mfny.ts` dropped its live-page door.
 *
 * Every claim boundary in `src/data/chipotle.ts` is printed, not paraphrased.
 * The footer carries the two that matter most, that this never shipped and
 * that it is unaffiliated, where they cannot be scrolled past.
 */

import { asset, css, el, letters } from '../dom.ts';
import { zoomTrigger } from '../runtime/lightbox.ts';
import { COLOR, rgba } from '../design/tokens.ts';
import { CHIPOTLE_PAGE as CP } from '../design/layout.ts';
import {
  CHIPOTLE,
  CHIPOTLE_GLANCE,
  CHIPOTLE_LEAD_VIEW,
  CHIPOTLE_SECTIONS,
} from '../data/chipotle.ts';
import { STUDIO } from '../data/studio.ts';

const MONO = "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace";
const MAJOR = rgba(COLOR.paper, 0.28);
const MINOR = rgba(COLOR.paper, 0.2);

const TEXT_H = CP.bandEnd - CP.text.y;
const SCROLL_TOP = CP.secBarH + CP.secBarGap;
const SCROLL_PAD = CP.railW + 16;

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
 * The five plate views, in walk order.
 *
 * THE ORDER IS THE NARRATIVE, and the scroll sync depends on it. Reading the
 * column walks this list forward and never back: the original screens for the
 * whole audit, the explorations, the two final screens, the store controls the
 * icon rule produced, then the checkout's states. A view moved out of this
 * order makes the plate jump backwards while someone is reading straight down,
 * which is exactly what it used to do.
 *
 * `before` is the only one showing the real shipped app. Everything after it is
 * a design render with an original visual identity and striped placeholder
 * tiles, and each caption says which it is: a reader who lands mid-walk should
 * never have to work out whether they are looking at a product or a proposal.
 */
const VIEWS = [
{
    id: 'before',
    label: 'before',
    src: 'projects/chipotle-before.webp',
    alt:
      'The four original screens side by side: three are the same checkout page at three scroll ' +
      'positions, each repeating the same total, and the fourth is the order confirmation with a ' +
      'pickup time above an apology for running behind',
    caption:
      'the original screens · three of these four are one page at three scroll positions, and the total appears on every one of them',
  },
{
    id: 'explorations',
    label: 'explorations',
    src: 'projects/chipotle-explorations.webp',
    alt:
      'The two rejected explorations beside the chosen direction: a card based ledger layout, a ' +
      'receipt and ticket layout, and the hairline layout that was chosen',
    caption:
      'the two rejected directions, and the one that won · ledger, ticket, then the stepper',
  },
{
    id: 'after',
    label: 'after',
    src: 'projects/live/chipotle.webp',
    alt:
      'Design renders of the two final screens: a checkout with one pickup time between a minus ' +
      'and a plus button, and a confirmation screen with a single ETA, a status tag and a map',
    caption:
      'the redesign, as design renders · one screen to order, one to wait, and nothing below the fold on either',
  },
{
    id: 'store-actions',
    label: 'store actions',
    src: 'projects/chipotle-store-actions.webp',
    alt:
      'Two design renders of the same confirmation screen detail, side by side: a map with the ' +
      'store address on a white chip and two round buttons beside it, a heart and a directions ' +
      'arrow. On the left the heart is an outline. On the right it is filled green',
    caption:
      'the store controls, as design renders · not saved on the left, saved on the right, and the fill is the whole state',
  },
{
    id: 'states',
    label: 'states',
    src: 'projects/chipotle-states.webp',
    alt:
      'Four states of the redesigned checkout: the default, the bag list expanded with the total ' +
      'breakdown folded away, the Later today sheet, and the order placed confirmation',
    caption:
      'the checkout states, as design renders · the bag list and the total breakdown share one pocket of space, so the pay button never moves',
  },
] as const;

/* ------------------------------------------------------------------ chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'chipotle-close',
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

  const cell = (text: string, span: number, padding: string, rule: boolean, size?: number) =>
    el(
      'span',
      {
        style: css({
          'grid-column': `span ${span}`,
          display: 'flex',
          'align-items': 'center',
          padding,
          'border-right': rule ? `1px solid ${MINOR}` : null,
          'font-size': size ?? null,
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
        height: CP.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell(`01 · ${CHIPOTLE.name}`, 3, '0 20px', true),
    cell(CHIPOTLE.state, 5, '0 20px', true, 11.5),
    cell(STUDIO.rev, 2, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const back = el(
    'button',
    {
      type: 'button',
      'data-act': 'chipotle-close',
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
      href: asset(CHIPOTLE.demoHref),
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
        height: CP.footerH,
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
      chellbook's. There is no client here at all: this was unsolicited, it was
      never shipped, and the app's owner has no relationship to it. Naming the
      app in the title is exactly why this has to sit under it.
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
      // `overflow: hidden`, and appending the identity boundary to a string
      // this long clipped 48px off the end of it, which is the worst possible
      // place to lose a word. The identity boundary is carried by the
      // standfirst, the `result` section and the glance column instead.
      CHIPOTLE.state,
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
        left: CP.title.x,
        top: CP.title.y,
        'transform-origin': '0 0',
        'font-family': MONO,
        'font-size': CP.title.size,
        'line-height': `${CP.title.lh}px`,
        'letter-spacing': CP.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters(CHIPOTLE.name).map((s) => {
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
        left: CP.title.x,
        top: CP.descriptorY,
        width: 1300,
        margin: '0',
        'font-family': MONO,
        'font-size': 20,
        'line-height': '1.4',
        'letter-spacing': '.005em',
        opacity: '.88',
      }),
    },
    CHIPOTLE.descriptor,
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
        left: CP.title.x,
        top: CP.metaY,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.66',
      }),
    },
    `${CHIPOTLE.role} · ${CHIPOTLE.surface}`,
  );

  const rule = el('div', {
    'data-intro': 'wipeX',
    'data-in-delay': 210,
    'data-in-dur': 420,
    'aria-hidden': 'true',
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: CP.title.x,
      right: CP.title.x,
      top: CP.ruleY,
      height: 1,
      background: MAJOR,
    }),
  });

  return [title, descriptor, meta, rule];
}

/* ------------------------------------------------------------------- plate */

/**
 * All five views, every one mounted, crossfaded between. `object-fit: contain`
 * is not needed — the composites are cut to 1456 × 874 and the box is the same
 * ratio — but `cover` would still crop on a rounding error, so `contain` it is.
 */
function plate(): HTMLElement {
  return el(
    'div',
    {
      'data-cpplate': true,
      style: css({
        position: 'absolute',
        left: CP.plate.x,
        top: CP.plate.y,
        width: CP.plate.w,
        height: CP.plate.h,
        background: rgba(COLOR.paper, 0.06),
        border: `1px solid ${MINOR}`,
        overflow: 'hidden',
      }),
    },
    ...VIEWS.map((v, i) =>
      el(
        'div',
        {
          'data-cpslot': i,
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
      'data-cpcap': true,
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
        left: CP.plate.x,
        top: CP.plateCaptionY,
        width: CP.plate.w,
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

/** A radiogroup: five exclusive views, one of which is showing at any time. */
function toggle(): HTMLElement {
  return el(
    'div',
    {
      role: 'radiogroup',
      'aria-label':
        'Walk the original screens, the rejected explorations, the redesign, its store controls, and its states',
      'data-intro': 'wipeX',
      'data-in-delay': 340,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: CP.plate.x,
        top: CP.toggleY,
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
            within it. Five separate stops would make Tab walk the same control
            five times. `setChipotleView` moves this with the checked state.
          */
          tabindex: i === 0 ? 0 : -1,
          'data-act': 'chipotle-view',
          'data-view': i,
          class: 'ps-hov-invert-dark',
          style: css({
            ...BTN,
            height: 36,
            padding: '0 18px',
            display: 'flex',
            'align-items': 'center',
            border: `1px solid ${i === 0 ? COLOR.paper : MAJOR}`,
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
 * The one door: the interactive prototype.
 *
 * There is deliberately no link to the app being redesigned, on the same
 * reasoning that removed mfny's live-page door. This screen carries a single
 * call to action, and pointing a visitor at a real company's product straight
 * off a page criticizing it is not this portfolio's job. The "before" plate is
 * the evidence, and it is checkable without a click-through.
 */
function doors(): HTMLElement[] {
  return [
    el(
      'a',
      {
        href: asset(CHIPOTLE.demoHref),
        target: '_blank',
        rel: 'noopener noreferrer',
        /*
          WCAG 2.5.3, Label in Name: this overrides the accessible name, so it
          has to CONTAIN both visible strings, in the order they are read.
        */
        'aria-label':
          'the interactive prototype both final screens, live and steppable, hosted here. opens in a new tab',
        class: 'ps-hov-invert-dark',
        'data-intro': 'wipeX',
        'data-in-delay': 380,
        'data-in-dur': 340,
        style: css({
          ...BTN,
          'clip-path': 'inset(0 100% 0 0)',
          position: 'absolute',
          left: CP.doors.x,
          top: CP.doors.y,
          width: CP.doors.w,
          height: CP.doors.h,
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          padding: '0 20px',
          border: `1px solid ${COLOR.paper}`,
          transition: 'background 150ms linear,color 150ms linear',
        }),
      },
      el(
        'span',
        { style: css({ display: 'flex', 'flex-direction': 'column', gap: 4 }) },
        el(
          'span',
          { style: css({ 'font-size': 15, 'letter-spacing': '.14em' }) },
          'the interactive prototype',
        ),
        el(
          'span',
          { style: css({ 'font-size': 11.5, 'letter-spacing': '.1em', opacity: '.62' }) },
          'both final screens, live and steppable, hosted here',
        ),
      ),
      el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 20, 'line-height': '1' }) }, '↗'),
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
        left: CP.glance.x,
        top: CP.glance.y,
        width: CP.glance.w,
        height: CP.bandEnd - CP.glance.y,
      }),
    },
    microLabel('at a glance'),
    el(
      'ul',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: CP.glanceRowsY - CP.glance.y,
          width: '100%',
          margin: '0',
          padding: '0',
          'list-style': 'none',
        }),
      },
      ...CHIPOTLE_GLANCE.map((r) =>
        el(
          'li',
          { style: css({ padding: '9px 0', 'border-bottom': `1px solid ${MINOR}` }) },
          microLabel(r.field, '.62'),
          el(
            'p',
            {
              style: css({
                margin: '4px 0 0',
                'font-family': MONO,
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
      'data-cpsec': 0,
      'data-cpsec-name': 'the short version',
      'data-cpsec-view': CHIPOTLE_LEAD_VIEW,
      style: css({ 'padding-bottom': 40 }),
    },
    microLabel('the short version'),
    el(
      'p',
      {
        style: css({
          margin: '12px 0 0',
          'font-family': MONO,
          'font-size': 20,
          'line-height': '1.4',
          'letter-spacing': '-.01em',
          'text-wrap': 'pretty',
        }),
      },
      CHIPOTLE.standfirst,
    ),
  );

  const rest = CHIPOTLE_SECTIONS.map((sec, i) =>
    el(
      'section',
      {
        // +1: the standfirst above is section 0 of the scroll column
        'data-cpsec': i + 1,
        'data-cpsec-name': sec.name,
        // The plate follows the reading position. A section with no view
        // leaves the plate wherever it was.
        'data-cpsec-view': sec.view ?? null,
        style: css({ 'padding-bottom': 40 }),
      },
      microLabel(`${two(i + 1)} · ${sec.name}`),
      ...sec.paras.map((p) =>
        el(
          'p',
          {
            style: css({
              margin: '12px 0 0',
              'font-family': MONO,
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
        height: CP.secBarH,
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
    el('span', { 'data-cpsecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-cpscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `${CHIPOTLE.name}, the case`,
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
        width: CP.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-cpthumb': true,
      style: css({
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: 0,
        background: COLOR.wood,
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
        left: CP.text.x,
        top: CP.text.y,
        width: CP.text.w,
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
      'data-cpchrome': true,
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
      'data-chipotle': true,
      'data-screen-label': CHIPOTLE.name,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${CHIPOTLE.title}: ${CHIPOTLE.descriptor}. ${CHIPOTLE.state}`,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '8',
        display: 'none',
        background: COLOR.plaque,
        color: COLOR.paper,
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
export const CHIPOTLE_VIEWS = VIEWS;
