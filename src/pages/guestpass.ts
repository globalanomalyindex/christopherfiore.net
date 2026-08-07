/**
 * Page 01 subpage — the apple wallet card sharing concept.
 *
 * A sibling of `pages/lee.ts` and deliberately the same shape: a plate on the
 * left, prose beside it, a scannable glance column on the right.
 *
 * WHERE IT DIVERGES: the title. This case is called "apple wallet card sharing
 * concept" at the author's request, and 33 characters do not fit on one line at
 * the family's 152px display size, so `GUESTPASS_PAGE` carries 136. Everything
 * else is the family's own geometry.
 *
 * The plate carries FIVE views: the object, the send, the spend, what happens
 * when a purchase does not fit, and the positioning argument. All five are
 * 1456 × 874 composites of the handoff's own renders, set on the paper color
 * the handoff's case page uses for its ground. Every one of its fifteen renders
 * is in one of them.
 *
 * NOTHING IN THEM IS A SCREENSHOT OF A PRODUCT, and two things about that are
 * stronger here than on any other screen in this site:
 *
 * 1. There is no relationship to Apple. The source package never says so, in
 *    any of its twenty six files, so this screen has to. `GUESTPASS.state`
 *    carries it in the header, the footer and the screen's own aria-label.
 * 2. Every name, store and dollar figure in the renders is invented, and the
 *    card faces are generic stand ins rather than anybody's real artwork.
 *
 * ONE RULE FROM THE HANDOFF BINDS THIS FILE. The borrowed card only reads as
 * temporary next to solid-edged cards, so it is never shown on its own. The
 * `object` view therefore pairs the card detail with the phone that has it
 * sitting at the bottom of a full Wallet stack, and a future edit must not
 * reduce that view to the detail alone.
 *
 * Every image is mounted at once and crossfaded rather than swapped by `src`:
 * a hard swap flashes white while the new file decodes, which is exactly wrong
 * for a set someone is going to walk back and forth.
 *
 * ONE DOOR: the full case, hosted here, with both of its prototypes inside it.
 *
 * Every claim boundary in `src/data/guestpass.ts` is printed, not paraphrased.
 */

import { asset, css, el, letters } from '../dom.ts';
import { zoomTrigger } from '../runtime/lightbox.ts';
import { COLOR, rgba, subpageTitle } from '../design/tokens.ts';
import { GUESTPASS_PAGE as GP } from '../design/layout.ts';
import {
  GUESTPASS,
  GUESTPASS_GLANCE,
  GUESTPASS_LEAD_VIEW,
  GUESTPASS_SECTIONS,
} from '../data/guestpass.ts';
import { STUDIO } from '../data/studio.ts';

const TITLE = subpageTitle(GUESTPASS.name.length, GP.title);
const MONO = "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace";
const MAJOR = rgba(COLOR.paper, 0.28);
const MINOR = rgba(COLOR.paper, 0.2);

const TEXT_H = GP.bandEnd - GP.text.y;
const SCROLL_TOP = GP.secBarH + GP.secBarGap;
const SCROLL_PAD = GP.railW + 16;

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
 * column walks this list forward and never back: the object, the send, the
 * spend and the receipt after it, what happens when a purchase does not fit,
 * and last the argument for why this does not collide with anything that
 * already ships. A view moved out of this order makes the plate jump backwards
 * while someone is reading straight down.
 *
 * NONE OF THESE IS A SCREENSHOT OF A PRODUCT. They are the handoff's own
 * renders on the paper color its case page uses, every name and number in them
 * is invented, and the captions have to keep saying so.
 */
const VIEWS = [
  {
    id: 'object',
    label: 'the object',
    src: 'projects/guestpass-object.webp',
    alt:
      'Two design renders. On the left, a card with a dashed edge reading "Alex\'s Apple Card" ' +
      'and "Expires 9:41 PM", tucked under two solid-edged cards. On the right, a phone showing ' +
      'the same card at the bottom of a Wallet stack',
    caption:
      'the borrowed card, as design renders · the dashed edge only reads as temporary next to solid ones, so it is never shown alone',
  },
  {
    id: 'send',
    label: 'send',
    src: 'projects/guestpass-send.webp',
    alt:
      'Three design renders of the sending flow: a sheet asking who it is for with contact ' +
      'circles, a review screen with one sentence, a collapsed options row and a Continue ' +
      'button, and the Face ID confirmation that follows it',
    caption:
      'sending, as design renders · a card, a person, continue, and Face ID, with every option collapsed behind one row',
  },
  {
    id: 'spend',
    label: 'spend',
    src: 'projects/guestpass-spend.webp',
    alt:
      'Four design renders: the sheet where the recipient reads what the owner will see and adds ' +
      'the card to their Wallet, the payment sheet, the approved checkmark, and the owner\'s ' +
      'notification naming the store, the amount, the time, and a map of the store',
    caption:
      'accepting, paying, and the receipt · design renders, and every store and figure in them is invented',
  },
  {
    id: 'escalation',
    label: 'when it does not fit',
    src: 'projects/guestpass-escalation.webp',
    alt:
      'Four design renders of the path when a purchase goes over a limit: the recipient sees the ' +
      'reason without the amounts in large type, a finished state reading that the owner has been ' +
      'notified, the owner\'s request sheet with Approve and Decline, and the approved retry',
    caption:
      'when a purchase does not fit, as design renders · the amounts sit in small text, because a stranger can read a headline',
  },
  {
    id: 'positioning',
    label: 'positioning',
    src: 'projects/guestpass-positioning.webp',
    alt:
      'Two diagrams. A quadrant of money sharing products plotted by who ends up owning the money ' +
      'and whether it happens once or keeps going, with the concept in the one empty corner. And ' +
      'a swimlane of the whole flow across the owner, the system and the recipient',
    caption:
      'the argument · three of the four corners already ship, and this is the empty one',
  },
] as const;

/* ------------------------------------------------------------------ chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'guestpass-close',
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
        height: GP.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell(`01 · ${GUESTPASS.name}`, 3, '0 20px', true),
    cell(GUESTPASS.state, 5, '0 20px', true, 11.5),
    cell(STUDIO.rev, 2, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const back = el(
    'button',
    {
      type: 'button',
      'data-act': 'guestpass-close',
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
      href: asset(GUESTPASS.demoHref),
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
        height: GP.footerH,
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
      chellbook's. There is no client here at all: this was self-directed and
      nothing was built. And the part the source package never states anywhere:
      Apple has no relationship to it. A screen that draws their products on
      every one of its five plates has to say that under all of them.
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
      GUESTPASS.state,
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
        left: GP.title.x,
        top: GP.title.y,
        'transform-origin': '0 0',
        'font-family': MONO,
        'font-size': TITLE.size,
        'line-height': `${TITLE.lh}px`,
        'letter-spacing': GP.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters(GUESTPASS.name).map((s) => {
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
        left: GP.title.x,
        top: GP.descriptorY,
        width: 1300,
        margin: '0',
        'font-family': MONO,
        'font-size': 20,
        'line-height': '1.4',
        'letter-spacing': '.005em',
        opacity: '.88',
      }),
    },
    GUESTPASS.descriptor,
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
        left: GP.title.x,
        top: GP.metaY,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.66',
      }),
    },
    `${GUESTPASS.role} · ${GUESTPASS.surface}`,
  );

  const rule = el('div', {
    'data-intro': 'wipeX',
    'data-in-delay': 210,
    'data-in-dur': 420,
    'aria-hidden': 'true',
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: GP.title.x,
      right: GP.title.x,
      top: GP.ruleY,
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
      'data-gpplate': true,
      style: css({
        position: 'absolute',
        left: GP.plate.x,
        top: GP.plate.y,
        width: GP.plate.w,
        height: GP.plate.h,
        background: rgba(COLOR.paper, 0.06),
        border: `1px solid ${MINOR}`,
        overflow: 'hidden',
      }),
    },
    ...VIEWS.map((v, i) =>
      el(
        'div',
        {
          'data-gpslot': i,
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
      'data-gpcap': true,
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
        left: GP.plate.x,
        top: GP.plateCaptionY,
        width: GP.plate.w,
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
        'Walk the borrowed card, the send flow, the purchase, what happens when it does not fit, and the positioning',
      'data-intro': 'wipeX',
      'data-in-delay': 340,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: GP.plate.x,
        top: GP.toggleY,
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
            five times. `setGuestpassView` moves this with the checked state.
          */
          tabindex: i === 0 ? 0 : -1,
          'data-act': 'guestpass-view',
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
 * The one door: the full case, hosted here.
 *
 * The handoff ships a complete case page with both prototypes inside it, so
 * there is nothing to link to beyond that one file. There is deliberately no
 * link out to anything of Apple's: this screen already names their products on
 * every plate, and pointing a visitor at the real thing from a page describing
 * an unaffiliated concept is exactly the confusion the boundary exists to stop.
 */
function doors(): HTMLElement[] {
  return [
    el(
      'a',
      {
        href: asset(GUESTPASS.demoHref),
        target: '_blank',
        rel: 'noopener noreferrer',
        /*
          WCAG 2.5.3, Label in Name: this overrides the accessible name, so it
          has to CONTAIN both visible strings, in the order they are read.
        */
        'aria-label':
          'the full case both prototypes, the rationale and every screen, hosted here. opens in a new tab',
        class: 'ps-hov-invert-dark',
        'data-intro': 'wipeX',
        'data-in-delay': 380,
        'data-in-dur': 340,
        style: css({
          ...BTN,
          'clip-path': 'inset(0 100% 0 0)',
          position: 'absolute',
          left: GP.doors.x,
          top: GP.doors.y,
          width: GP.doors.w,
          height: GP.doors.h,
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
        el('span', { style: css({ 'font-size': 15, 'letter-spacing': '.14em' }) }, 'the full case'),
        el(
          'span',
          { style: css({ 'font-size': 11.5, 'letter-spacing': '.1em', opacity: '.62' }) },
          'both prototypes, the rationale and every screen, hosted here',
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
        left: GP.glance.x,
        top: GP.glance.y,
        width: GP.glance.w,
        height: GP.bandEnd - GP.glance.y,
      }),
    },
    microLabel('at a glance'),
    el(
      'ul',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: GP.glanceRowsY - GP.glance.y,
          width: '100%',
          margin: '0',
          padding: '0',
          'list-style': 'none',
        }),
      },
      ...GUESTPASS_GLANCE.map((r) =>
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
      'data-gpsec': 0,
      'data-gpsec-name': 'the short version',
      'data-gpsec-view': GUESTPASS_LEAD_VIEW,
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
      GUESTPASS.standfirst,
    ),
  );

  const rest = GUESTPASS_SECTIONS.map((sec, i) =>
    el(
      'section',
      {
        // +1: the standfirst above is section 0 of the scroll column
        'data-gpsec': i + 1,
        'data-gpsec-name': sec.name,
        // The plate follows the reading position. A section with no view
        // leaves the plate wherever it was.
        'data-gpsec-view': sec.view ?? null,
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
        height: GP.secBarH,
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
    el('span', { 'data-gpsecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-gpscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `${GUESTPASS.name}, the case`,
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
        width: GP.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-gpthumb': true,
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
        left: GP.text.x,
        top: GP.text.y,
        width: GP.text.w,
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
      'data-gpchrome': true,
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
      'data-guestpass': true,
      'data-screen-label': GUESTPASS.name,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${GUESTPASS.title}: ${GUESTPASS.descriptor}. ${GUESTPASS.state}`,
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
export const GUESTPASS_VIEWS = VIEWS;
