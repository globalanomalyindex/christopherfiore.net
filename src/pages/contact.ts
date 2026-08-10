/**
 * Screen 5 · Page 04 — Contact + About me.
 *
 * Near-black ground, lavender ink, one quiet dither canvas at full rest
 * opacity. Geometry from PAGE4 in `src/design/layout.ts`.
 *
 * The title went to two lines when this page took on the about material, so
 * the composition is page 01's: stacked title with the identity block under
 * it, the standfirst in the right-hand panel column, the field/value table
 * full width below. The long-form background does not fit a 1080px screen at
 * a readable size, so it lives in the subpage built by `./about.ts` and this
 * page carries the standfirst plus the control that opens it.
 *
 * The design sheet draws this page's close control at the right end of the
 * header; the interaction contract (and PORT_CONTRACT non-negotiable 2) says
 * close is always the top-left control, so it takes the first header cell here
 * exactly as it does on pages 01 and 03.
 */

import { css, el, letters } from '../dom.ts';
import { COLOR, FONT, rgba } from '../design/tokens.ts';
import { PAGE4 } from '../design/layout.ts';
import { CONTACT_TABLE, PROFILE_LINKS, STUDIO } from '../data/studio.ts';
import { ABOUT } from '../data/about.ts';
import * as aboutPage from './about.ts';

/** Rules on the near-black ground. */
const RULE_MAJOR = rgba(COLOR.paper, 0.28);
const RULE_MINOR = rgba(COLOR.paper, 0.2);

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

/* ------------------------------------------------------------------- chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Close, back to studio index',
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        'grid-column': 'span 2',
        display: 'flex',
        'align-items': 'center',
        gap: 16,
        padding: '0 20px 0 56px',
        'border-right': `1px solid ${RULE_MINOR}`,
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
          'border-right': rule ? `1px solid ${RULE_MINOR}` : null,
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
        height: PAGE4.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${RULE_MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell('04 · contact + about me', 3, '0 20px', true),
    cell('open for 2026', 3, '0 20px', true),
    cell(STUDIO.rev, 4, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Back to studio index',
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        'grid-column': 'span 4',
        display: 'flex',
        'align-items': 'center',
        gap: 18,
        padding: '0 20px 0 56px',
        'border-right': `1px solid ${RULE_MINOR}`,
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
      'data-next': 1,
      'aria-label': 'Next channel, 01 Product designs',
      class: 'ps-hov-invert-dark',
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
    'next — 01 product designs',
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
        height: PAGE4.footerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-top': `1px solid ${RULE_MAJOR}`,
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
          'border-right': `1px solid ${RULE_MINOR}`,
          opacity: '.72',
        }),
      },
      'channel 04 of 04',
    ),
    next,
  );
}

/* -------------------------------------------------------------------- table */

function tableHeader(): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 90,
      'data-in-dur': 360,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        right: 0,
        top: PAGE4.tableHeader.y,
        height: PAGE4.tableHeader.h,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'align-items': 'center',
        'border-top': `1px solid ${RULE_MAJOR}`,
        'border-bottom': `1px solid ${RULE_MINOR}`,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.62',
      }),
    },
    el('span', { style: css({ 'grid-column': 'span 3', 'padding-left': 56 }) }, 'field'),
    el('span', { style: css({ 'grid-column': 'span 9' }) }, 'value'),
  );
}

function tableRow(field: string, value: string, i: number): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 160 + i * 60,
      'data-in-dur': 330,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        right: 0,
        top: PAGE4.rowY[i],
        height: PAGE4.rowH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'align-items': 'center',
        'border-bottom': `1px solid ${RULE_MINOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    el(
      'span',
      { style: css({ 'grid-column': 'span 3', 'padding-left': 56, opacity: '.62' }) },
      field,
    ),
    el(
      'span',
      {
        style: css({
          'grid-column': 'span 9',
          'padding-right': 56,
          'font-size': 20,
          'letter-spacing': '.03em',
          'text-wrap': 'pretty',
        }),
      },
      value,
    ),
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
  const frost = el('canvas', {
    'data-frost': 'quiet',
    'data-mode': 0,
    'data-rest-op': '1',
    'data-boost': 4.6,
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

  const title = el(
    'div',
    {
      'data-ptitle': true,
      style: css({
        position: 'absolute',
        'z-index': '3',
        left: PAGE4.title.x,
        top: PAGE4.title.y,
        'transform-origin': '0 0',
        'font-family': FONT.display,
        'font-size': PAGE4.title.size,
        'line-height': `${PAGE4.title.lh}px`,
        // handoff tracking for the 172px title
        'letter-spacing': '-.05em',
        'white-space': 'nowrap',
      }),
    },
    // two lines, set the way page 01 sets "Product / designs" — one letters()
    // run per line so the intro's per-letter flash still walks the whole title
    ...letters('Contact').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
    el('br'),
    ...letters('+ About me').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
  );

  /**
   * The standfirst. Page 01 puts its thesis under the title; this page puts it
   * in the right-hand panel column instead, because the identity block (a 60px
   * email and the profile links) already owns the space under the title and is
   * the thing someone arriving to make contact is looking for.
   */
  const lede = el(
    'p',
    {
      'data-intro': 'fade',
      'data-dfx': 7,
      'data-in-delay': 180,
      'data-in-dur': 340,
      style: css({
        opacity: '0',
        position: 'absolute',
        margin: '0',
        left: PAGE4.lede.x,
        top: PAGE4.lede.y,
        width: PAGE4.lede.w,
        'font-family': FONT.display,
        'font-size': PAGE4.lede.size,
        'line-height': String(PAGE4.lede.lh),
        'letter-spacing': PAGE4.lede.track,
        'text-wrap': 'pretty',
      }),
    },
    ABOUT.lede,
  );

  /**
   * Into the about subpage. A real button rather than a link: the subpage is an
   * overlay on this screen, not a document, exactly as the chellbook and case
   * study doors are on pages 01 and 03.
   */
  const more = el(
    'button',
    {
      type: 'button',
      'data-act': 'about',
      'aria-label': 'Read the full background',
      class: 'ps-hov-invert-dark',
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 320,
      style: css({
        ...BTN,
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE4.more.x,
        top: PAGE4.more.y,
        width: PAGE4.lede.w,
        height: 54,
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '0 18px',
        border: `1px solid ${RULE_MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    'read the full background',
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '→'),
  );

  const email = el(
    'a',
    {
      href: `mailto:${STUDIO.email}`,
      'data-intro': 'fade',
      'data-dfx': 8,
      'data-in-delay': 200,
      'data-in-dur': 360,
      class: 'ps-hov-email',
      style: css({
        ...LINK,
        opacity: '0',
        position: 'absolute',
        left: PAGE4.email.x,
        top: PAGE4.email.y,
        'font-family': FONT.display,
        'font-size': PAGE4.email.size,
        'letter-spacing': PAGE4.email.track,
        transition: 'color 160ms linear',
      }),
    },
    STUDIO.email,
  );

  const links: (Node | string)[] = [];
  PROFILE_LINKS.forEach((l, i) => {
    if (i) links.push(el('span', { 'aria-hidden': 'true' }, ' · '));
    links.push(
      el(
        'a',
        {
          href: l.href,
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': `${l.label}, opens in a new tab`,
          style: css(LINK),
        },
        l.label,
      ),
    );
  });

  const linkRow = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 260,
      'data-in-dur': 320,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE4.links.x,
        top: PAGE4.links.y,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.72',
      }),
    },
    ...links,
  );

  const body = el(
    'div',
    {
      'data-pbody': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '2', opacity: '0' }),
    },
    header(),
    email,
    linkRow,
    lede,
    more,
    tableHeader(),
    ...CONTACT_TABLE.map((r, i) => tableRow(r.field, r.value, i)),
    footer(),
  );

  return el(
    'section',
    {
      'data-page': 4,
      'data-screen-label': 'Page 04 contact and about me',
      role: 'region',
      'aria-label': 'Contact and about me',
      'aria-hidden': 'true',
      inert: true,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '6',
        display: 'none',
        background: COLOR.nearBlack,
        color: COLOR.paper,
        overflow: 'hidden',
      }),
    },
    frost,
    title,
    body,
    // the about subpage lives inside this page, the way the chellbook screen
    // lives inside page 01 — it grows out of the control above and collapses
    // back into it, so it cannot be a sibling of the page it covers
    aboutPage.build(),
  );
}
