/**
 * Page 01 subpage — the MFNY concentrates redesign.
 *
 * The third screen inside channel 01, and the only one whose argument is
 * visual: the case is that a catalog of eleven strains renders as thirteen
 * cards, and the fastest way to show it is two cards of one strain sitting
 * next to each other on the live site with contradicting type tags. So this
 * takes the chellbook shape rather than the background screen's — a plate on
 * the left, prose beside it — and spends the plate on a before/after the reader
 * can flip. Geometry from MFNY_PAGE in `src/design/layout.ts`.
 *
 * Both images are mounted at once and crossfaded rather than swapped by `src`,
 * for the same reason the demo's own product photos are: a hard swap flashes
 * white while the new file decodes, which is exactly wrong for a comparison
 * someone is going to flip back and forth.
 *
 * ONE DOOR: the working demo. See `doors()` for why the live-page link is
 * deliberately absent.
 *
 * Every claim boundary in `src/data/mfny.ts` is printed, not paraphrased. The
 * footer carries the one that matters most — that this was never shipped —
 * where it cannot be scrolled past.
 */

import { asset, css, el, letters } from '../dom.ts';
import { zoomTrigger } from '../runtime/lightbox.ts';
import { COLOR, rgba } from '../design/tokens.ts';
import { MFNY_PAGE as MP } from '../design/layout.ts';
import { MFNY, MFNY_GLANCE, MFNY_LEAD_VIEW, MFNY_SECTIONS } from '../data/mfny.ts';
import { STUDIO } from '../data/studio.ts';

const MONO = "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace";
const MAJOR = rgba(COLOR.paper, 0.28);
const MINOR = rgba(COLOR.paper, 0.2);

const TEXT_H = MP.bandEnd - MP.text.y;
const SCROLL_TOP = MP.secBarH + MP.secBarGap;
const SCROLL_PAD = MP.railW + 16;

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

/** The two plate views, in flip order. */
const VIEWS = [
  {
    id: 'before',
    label: 'before',
    src: 'projects/mfny-before.webp',
    alt:
      'The live mfny concentrates page: two adjacent cards both titled Classics Chemdog Live ' +
      'Rosin Concentrate and Classics Chemdog Live Resin Concentrate, tagged Indica and Sativa',
    caption:
      'the live page · chemdog is one of the split strains, here twice, tagged Indica on one card and Sativa on the other',
  },
  {
    id: 'after',
    label: 'after',
    src: 'projects/live/mfny.webp',
    alt:
      'The redesigned grid: eleven strain cards, each with its type tags and an in-card form ' +
      'switcher, under a filter row carrying the tri-code type pill',
    caption: 'the redesign · one card per strain, with the forms inside it',
  },
] as const;

/* ------------------------------------------------------------------ chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'mfny-close',
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
        height: MP.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell('01 · mfny concentrates', 3, '0 20px', true),
    cell(MFNY.state, 4, '0 20px', true),
    cell(STUDIO.rev, 2, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const back = el(
    'button',
    {
      type: 'button',
      'data-act': 'mfny-close',
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
      href: asset(MFNY.demoHref),
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'Open the working demo, opens in a new tab',
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
    'the working demo',
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
        height: MP.footerH,
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
      chellbook's. This is a redesign of somebody else's live storefront, and a
      portfolio page that leaves that ambiguous is claiming the client shipped it.
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
      `${MFNY.state} · THC values are placeholders`,
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
        left: MP.title.x,
        top: MP.title.y,
        'transform-origin': '0 0',
        'font-family': MONO,
        'font-size': MP.title.size,
        'line-height': `${MP.title.lh}px`,
        'letter-spacing': MP.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters(MFNY.name).map((s) => {
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
        left: MP.title.x,
        top: MP.descriptorY,
        width: 1300,
        margin: '0',
        'font-family': MONO,
        'font-size': 20,
        'line-height': '1.4',
        'letter-spacing': '.005em',
        opacity: '.88',
      }),
    },
    MFNY.descriptor,
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
        left: MP.title.x,
        top: MP.metaY,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.66',
      }),
    },
    `${MFNY.role} · ${MFNY.surface}`,
  );

  const rule = el('div', {
    'data-intro': 'wipeX',
    'data-in-delay': 210,
    'data-in-dur': 420,
    'aria-hidden': 'true',
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: MP.title.x,
      right: MP.title.x,
      top: MP.ruleY,
      height: 1,
      background: MAJOR,
    }),
  });

  return [title, descriptor, meta, rule];
}

/* ------------------------------------------------------------------- plate */

/**
 * Before and after, both mounted, crossfaded. `object-fit: contain` is not
 * needed — the captures are cut to 1456 × 874 and the box is the same ratio —
 * but `cover` would still crop on a rounding error, so `contain` it is.
 */
function plate(): HTMLElement {
  return el(
    'div',
    {
      'data-mfplate': true,
      style: css({
        position: 'absolute',
        left: MP.plate.x,
        top: MP.plate.y,
        width: MP.plate.w,
        height: MP.plate.h,
        background: rgba(COLOR.paper, 0.06),
        border: `1px solid ${MINOR}`,
        overflow: 'hidden',
      }),
    },
    ...VIEWS.map((v, i) =>
      el(
        'div',
        {
          'data-mfslot': i,
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
      'data-mfcap': true,
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 340,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: MP.plate.x,
        top: MP.plateCaptionY,
        width: MP.plate.w,
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

/** before / after. A radiogroup, because it is exactly two exclusive states. */
function toggle(): HTMLElement {
  return el(
    'div',
    {
      role: 'radiogroup',
      'aria-label': 'Compare the live page and the redesign',
      'data-intro': 'wipeX',
      'data-in-delay': 340,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: MP.plate.x,
        top: MP.toggleY,
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
          'data-act': 'mfny-view',
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
 * The one door: the working demo.
 *
 * There was a second, to MFNY's live page, and it is gone deliberately. This
 * screen should carry a single call to action, and sending a visitor to a real
 * company's storefront straight off a page criticising it is not this
 * portfolio's job. The "before" plate is the evidence and it is checkable
 * without a click-through; `MFNY.originalHref` still records what was
 * redesigned, unlinked.
 */
function doors(): HTMLElement[] {
  return [
    el(
      'a',
      {
        href: asset(MFNY.demoHref),
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'Open the working demo, built for this case and hosted here, opens in a new tab',
        class: 'ps-hov-invert-dark',
        'data-intro': 'wipeX',
        'data-in-delay': 380,
        'data-in-dur': 340,
        style: css({
          ...BTN,
          'clip-path': 'inset(0 100% 0 0)',
          position: 'absolute',
          left: MP.doors.x,
          top: MP.doors.y,
          width: MP.doors.w,
          height: MP.doors.h,
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
        el('span', { style: css({ 'font-size': 15, 'letter-spacing': '.14em' }) }, 'the working demo'),
        el(
          'span',
          { style: css({ 'font-size': 11.5, 'letter-spacing': '.1em', opacity: '.62' }) },
          'built for this case, hosted here',
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
        left: MP.glance.x,
        top: MP.glance.y,
        width: MP.glance.w,
        height: MP.bandEnd - MP.glance.y,
      }),
    },
    microLabel('at a glance'),
    el(
      'ul',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: MP.glanceRowsY - MP.glance.y,
          width: '100%',
          margin: '0',
          padding: '0',
          'list-style': 'none',
        }),
      },
      ...MFNY_GLANCE.map((r) =>
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
      'data-mfsec': 0,
      'data-mfsec-name': 'the short version',
      'data-mfsec-view': MFNY_LEAD_VIEW,
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
      MFNY.standfirst,
    ),
  );

  const rest = MFNY_SECTIONS.map((sec, i) =>
    el(
      'section',
      {
        // +1: the standfirst above is section 0 of the scroll column
        'data-mfsec': i + 1,
        'data-mfsec-name': sec.name,
        // the plate follows the reading position; the reverse never happens
        'data-mfsec-view': sec.view ?? null,
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
        height: MP.secBarH,
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
    el('span', { 'data-mfsecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-mfscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': 'MFNY concentrates, the case',
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
        width: MP.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-mfthumb': true,
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
        left: MP.text.x,
        top: MP.text.y,
        width: MP.text.w,
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
      'data-mfchrome': true,
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
      'data-mfny': true,
      'data-screen-label': 'MFNY concentrates',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${MFNY.title}: ${MFNY.descriptor}. ${MFNY.state}`,
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

/** The plate's captions, read by the runtime when the view flips. */
export const MFNY_VIEWS = VIEWS;
