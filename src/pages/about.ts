/**
 * Page 04 subpage — the full background.
 *
 * A reading screen, built the way the chellbook case study is: title and a
 * jump index down the left, one native scroll container in the middle, and a
 * scannable credential column on the right. Geometry from ABOUT_PAGE in
 * `src/design/layout.ts`.
 *
 * There is no imagery here and there are no boards, so this screen carries
 * none of chellbook's plate machinery. What it does share is the scroll
 * column's contract: the region is a real focusable `region` with tabindex 0,
 * so arrows, PageUp/PageDown, Home and End reach every word without a pointer,
 * and the native scrollbar is suppressed in favor of a 6px rust rail that is
 * an indicator, not a drag handle — the stage sits under a `transform:
 * scale()`, and every real way to scroll is already wired.
 *
 * The close control is the top-left cell, as PORT_CONTRACT non-negotiable 2
 * requires of every screen in this design.
 */

import { css, el, letters } from '../dom.ts';
import { COLOR, rgba } from '../design/tokens.ts';
import { READER_PAGE as AP } from '../design/layout.ts';
import { ABOUT, ABOUT_SECTIONS, AT_A_GLANCE } from '../data/about.ts';
import { PROFILE_LINKS, STUDIO } from '../data/studio.ts';

const MONO = "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace";
const MAJOR = rgba(COLOR.paper, 0.28);
const MINOR = rgba(COLOR.paper, 0.2);

const TEXT_H = AP.bandEnd - AP.text.y;
const SCROLL_TOP = AP.secBarH + AP.secBarGap;
/** right padding on the scroll region: clears the rail and gives it air */
const SCROLL_PAD = AP.railW + 16;

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
      style: css({
        display: 'block',
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity,
      }),
    },
    text,
  );

/* ------------------------------------------------------------------ chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'about-close',
      'aria-label': 'Close the background, back to contact and about me',
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
        height: AP.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell('04 · background', 3, '0 20px', true),
    cell(STUDIO.name, 3, '0 20px', true),
    cell(`${STUDIO.rev} · ${STUDIO.updated}`, 4, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const back = el(
    'button',
    {
      type: 'button',
      'data-act': 'about-close',
      'aria-label': 'Back to contact and about me',
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        'grid-column': 'span 4',
        display: 'flex',
        'align-items': 'center',
        gap: 18,
        padding: '0 20px 0 56px',
        'border-right': `1px solid ${MINOR}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '←'),
    'contact + about me',
  );

  const mail = el(
    'a',
    {
      href: `mailto:${STUDIO.email}`,
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
    STUDIO.email,
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
        height: AP.footerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-top': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    back,
    el(
      'span',
      {
        style: css({
          'grid-column': 'span 4',
          display: 'flex',
          'align-items': 'center',
          padding: '0 20px',
          'border-right': `1px solid ${MINOR}`,
          opacity: '.72',
        }),
      },
      `${two(ABOUT_SECTIONS.length)} sections`,
    ),
    mail,
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
        left: AP.title.x,
        top: AP.title.y,
        'transform-origin': '0 0',
        'font-family': MONO,
        'font-size': AP.title.size,
        'line-height': `${AP.title.lh}px`,
        'letter-spacing': AP.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters('Background').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
  );

  const descriptor = el(
    'div',
    {
      'data-intro': 'fade',
      'data-dfx': 6,
      'data-in-delay': 140,
      'data-in-dur': 320,
      style: css({
        // the intro drives this from 0; the settled .72 lives on the inner span
        // so the two are not fighting over one property
        opacity: '0',
        position: 'absolute',
        left: AP.title.x,
        top: AP.descriptorY,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    el('span', { style: css({ opacity: '.72' }) }, ABOUT.descriptor),
  );

  const rule = el('div', {
    'data-intro': 'wipeX',
    'data-in-delay': 200,
    'data-in-dur': 420,
    'aria-hidden': 'true',
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: AP.title.x,
      right: AP.title.x,
      top: AP.ruleY,
      height: 1,
      background: MAJOR,
    }),
  });

  return [title, descriptor, rule];
}

/* ------------------------------------------------------------- jump index */

function indexRow(sec: (typeof ABOUT_SECTIONS)[number], n: number): HTMLElement {
  return el(
    'button',
    {
      type: 'button',
      'data-act': 'about-go',
      'data-abrow': n,
      'aria-label': `Jump to ${sec.name}`,
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        position: 'absolute',
        left: 0,
        top: AP.indexRowsY - AP.index.y + n * AP.indexRowH,
        width: '100%',
        height: AP.indexRowH,
        display: 'flex',
        'align-items': 'center',
        gap: 14,
        'padding-left': 12,
        'border-left': '2px solid transparent',
        'border-bottom': `1px solid ${MINOR}`,
        opacity: '.62',
        transition: 'background 150ms linear,color 150ms linear,opacity 150ms linear',
      }),
    },
    el(
      'span',
      { style: css({ 'font-size': 11.5, 'letter-spacing': '.22em', 'flex-shrink': '0' }) },
      two(n + 1),
    ),
    el(
      'span',
      { style: css({ 'font-family': MONO, 'font-size': 17, 'letter-spacing': '-.01em' }) },
      sec.name,
    ),
  );
}

function indexColumn(): HTMLElement {
  const links: (Node | string)[] = [];
  PROFILE_LINKS.forEach((l, i) => {
    if (i) links.push(el('br'));
    links.push(
      el(
        'a',
        {
          href: l.href,
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': `${l.label}, opens in a new tab`,
          style: css({ color: 'inherit', 'text-decoration': 'none' }),
        },
        l.label,
      ),
    );
  });

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 240,
      'data-in-dur': 380,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: AP.index.x,
        top: AP.index.y,
        width: AP.index.w,
        height: AP.bandEnd - AP.index.y,
      }),
    },
    microLabel('sections'),
    ...ABOUT_SECTIONS.map(indexRow),
    el(
      'div',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: AP.indexFootY - AP.index.y,
          width: '100%',
          'font-size': 12,
          'letter-spacing': '.1em',
          'line-height': '1.9',
          opacity: '.62',
        }),
      },
      ...links,
    ),
  );
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
        left: AP.glance.x,
        top: AP.glance.y,
        width: AP.glance.w,
        height: AP.bandEnd - AP.glance.y,
      }),
    },
    microLabel('at a glance'),
    el(
      'ul',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: AP.glanceRowsY - AP.glance.y,
          width: '100%',
          margin: '0',
          padding: '0',
          'list-style': 'none',
        }),
      },
      ...AT_A_GLANCE.map((r) =>
        el(
          'li',
          { style: css({ padding: '11px 0', 'border-bottom': `1px solid ${MINOR}` }) },
          microLabel(r.field, '.62'),
          el(
            'p',
            {
              style: css({
                margin: '5px 0 0',
                'font-family': MONO,
                'font-size': 15,
                'line-height': '1.4',
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
      'data-absec': 0,
      'data-absec-name': 'the short version',
      style: css({ 'padding-bottom': 42 }),
    },
    microLabel('the short version'),
    el(
      'p',
      {
        style: css({
          margin: '12px 0 0',
          'font-family': MONO,
          'font-size': 21,
          'line-height': '1.4',
          'letter-spacing': '-.01em',
          'text-wrap': 'pretty',
        }),
      },
      ABOUT.lede,
    ),
  );

  const rest = ABOUT_SECTIONS.map((sec, i) =>
    el(
      'section',
      {
        // +1: the standfirst above is section 00 of the readout
        'data-absec': i + 1,
        'data-absec-name': sec.name,
        style: css({ 'padding-bottom': 42 }),
      },
      microLabel(`${two(i + 1)} · ${sec.name}`),
      ...sec.paras.map((p) =>
        el(
          'p',
          {
            style: css({
              margin: '12px 0 0',
              'font-family': MONO,
              'font-size': 17,
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
      // duplicates the headings a screen reader already walks
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: AP.secBarH,
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
    el('span', { 'data-absecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-abscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': 'Full background, christopher robin fiore',
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
        width: AP.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-abthumb': true,
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
        left: AP.text.x,
        top: AP.text.y,
        width: AP.text.w,
        height: TEXT_H,
      }),
    },
    bar,
    el(
      'div',
      {
        style: css({ position: 'absolute', left: 0, right: 0, top: SCROLL_TOP, bottom: 0 }),
      },
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
      'data-abchrome': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '3', opacity: '0' }),
    },
    header(),
    ...titleBlock(),
    indexColumn(),
    textColumn(),
    glanceColumn(),
    footer(),
  );

  return el(
    'div',
    {
      'data-about': true,
      'data-screen-label': 'Full background',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `The full background of ${STUDIO.name}`,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '8',
        display: 'none',
        // the plaque ground every reading subpage in this design uses
        background: COLOR.plaque,
        color: COLOR.paper,
        overflow: 'hidden',
      }),
    },
    frost,
    chrome,
  );
}
