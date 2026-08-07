/**
 * Page 01 subpage — df2tm.
 *
 * The product-designs table lists df2tm as a row with no hosted demo to link
 * to, because it is a plugin you install into your own Claude Code rather than
 * a page you can visit. This screen is what that row opens instead.
 *
 * It is the background screen's shape one channel over — title and jump index
 * left, a scrolling prose column in the middle, a scannable column right — and
 * shares its geometry (READER_PAGE) rather than restating it, because both are
 * prose screens with no imagery. The one addition is the repository door in
 * the title band, treated the way chellbook treats its two prototype doors: a
 * real anchor, new tab, pinned where nothing can bury it, because "go get it"
 * is the whole call to action for a plugin.
 *
 * Strings come from `src/data/df2tm.ts`, which is transcribed from the repo's
 * own README. The install commands and steering phrases are an interface
 * contract — what a user literally types — and are never paraphrased here.
 */

import { css, el, letters } from '../dom.ts';
import { COLOR, rgba } from '../design/tokens.ts';
import { READER_PAGE as RP } from '../design/layout.ts';
import { DF2TM, DF2TM_GLANCE, DF2TM_SECTIONS } from '../data/df2tm.ts';
import { STUDIO } from '../data/studio.ts';

const MONO = "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace";
const MAJOR = rgba(COLOR.paper, 0.28);
const MINOR = rgba(COLOR.paper, 0.2);

const TEXT_H = RP.bandEnd - RP.text.y;
const SCROLL_TOP = RP.secBarH + RP.secBarGap;
const SCROLL_PAD = RP.railW + 16;

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

/* ------------------------------------------------------------------ chrome */

function header(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'df2tm-close',
      'aria-label': 'Close df2tm, back to product designs',
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
        height: RP.headerH,
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'border-bottom': `1px solid ${MAJOR}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    cell('01 · df2tm', 3, '0 20px', true),
    cell(DF2TM.state, 3, '0 20px', true),
    cell(STUDIO.rev, 4, '0 56px 0 20px', false),
  );
}

function footer(): HTMLElement {
  const back = el(
    'button',
    {
      type: 'button',
      'data-act': 'df2tm-close',
      'aria-label': 'Back to product designs',
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
    'product designs',
  );

  const repo = el(
    'a',
    {
      href: DF2TM.repo,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `${DF2TM.repoLabel}, opens in a new tab`,
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
    DF2TM.repoLabel,
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
        height: RP.footerH,
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
      'MIT · local state only',
    ),
    repo,
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
        left: RP.title.x,
        top: RP.title.y,
        'transform-origin': '0 0',
        'font-family': MONO,
        'font-size': RP.title.size,
        'line-height': `${RP.title.lh}px`,
        'letter-spacing': RP.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters(DF2TM.name).map((s) => {
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
        opacity: '0',
        position: 'absolute',
        left: RP.title.x,
        // +14 on the shared descriptor line: "df2tm" in the alternate italic
        // has a deep f-descender that crosses it, which "Background" (the only
        // other user of this geometry) does not.
        top: RP.descriptorY + 14,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    el('span', { style: css({ opacity: '.78' }) }, `${DF2TM.expansion} · ${DF2TM.descriptor}`),
  );

  const rule = el('div', {
    'data-intro': 'wipeX',
    'data-in-delay': 200,
    'data-in-dur': 420,
    'aria-hidden': 'true',
    style: css({
      'clip-path': 'inset(0 100% 0 0)',
      position: 'absolute',
      left: RP.title.x,
      right: RP.title.x,
      top: RP.ruleY,
      height: 1,
      background: MAJOR,
    }),
  });

  return [title, descriptor, rule];
}

/* ------------------------------------------------------------- jump index */

function indexRow(sec: (typeof DF2TM_SECTIONS)[number], n: number): HTMLElement {
  return el(
    'button',
    {
      type: 'button',
      'data-act': 'df2tm-go',
      'data-dfrow': n,
      'aria-label': `Jump to ${sec.name}`,
      class: 'ps-hov-invert-dark',
      style: css({
        ...BTN,
        position: 'absolute',
        left: 0,
        top: RP.indexRowsY - RP.index.y + n * RP.indexRowH,
        width: '100%',
        height: RP.indexRowH,
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

/**
 * The repository door. A plugin's call to action is "install it", so the link
 * out is a control with weight rather than a line of body text — the same
 * reasoning chellbook's two prototype doors are built on.
 */
function repoDoor(): HTMLElement {
  return el(
    'a',
    {
      href: DF2TM.repo,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `Open the df2tm repository, ${DF2TM.repoLabel}, opens in a new tab`,
      class: 'ps-hov-invert-dark',
      'data-intro': 'wipeX',
      'data-in-delay': 300,
      'data-in-dur': 340,
      style: css({
        ...BTN,
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: 0,
        top: RP.indexFootY - RP.index.y,
        width: '100%',
        height: 62,
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '0 14px',
        border: `1px solid ${MAJOR}`,
        'font-size': 12,
        'letter-spacing': '.14em',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    'the repository',
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 18, 'line-height': '1' }) }, '↗'),
  );
}

function indexColumn(): HTMLElement {
  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 240,
      'data-in-dur': 380,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: RP.index.x,
        top: RP.index.y,
        width: RP.index.w,
        height: RP.bandEnd - RP.index.y,
      }),
    },
    microLabel('sections'),
    ...DF2TM_SECTIONS.map(indexRow),
    repoDoor(),
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
        left: RP.glance.x,
        top: RP.glance.y,
        width: RP.glance.w,
        height: RP.bandEnd - RP.glance.y,
      }),
    },
    microLabel('at a glance'),
    el(
      'ul',
      {
        style: css({
          position: 'absolute',
          left: 0,
          top: RP.glanceRowsY - RP.glance.y,
          width: '100%',
          margin: '0',
          padding: '0',
          'list-style': 'none',
        }),
      },
      ...DF2TM_GLANCE.map((r) =>
        el(
          'li',
          { style: css({ padding: '11px 0', 'border-bottom': `1px solid ${MINOR}` }) },
          microLabel(r.field, '.62'),
          el(
            'p',
            {
              style: css({
                margin: '5px 0 0',
                // the install lines are literal commands — set them as such
                'font-family': r.value.startsWith('/') ? 'ui-monospace,monospace' : MONO,
                'font-size': r.value.startsWith('/') ? 13 : 15,
                'line-height': '1.4',
                'text-wrap': 'pretty',
                'word-break': r.value.startsWith('/') ? 'break-all' : 'normal',
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
      'data-dfsec': 0,
      'data-dfsec-name': 'the idea',
      style: css({ 'padding-bottom': 42 }),
    },
    microLabel('the idea'),
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
      DF2TM.standfirst,
    ),
    el(
      'p',
      {
        style: css({
          margin: '16px 0 0',
          'font-family': MONO,
          'font-size': 17,
          'line-height': '1.55',
          opacity: '.88',
          'text-wrap': 'pretty',
        }),
      },
      DF2TM.question,
    ),
  );

  const rest = DF2TM_SECTIONS.map((sec, i) =>
    el(
      'section',
      {
        // +1: the standfirst above is section 0 of the scroll column
        'data-dfsec': i + 1,
        'data-dfsec-name': sec.name,
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
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: RP.secBarH,
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
    el('span', { 'data-dfsecat': true }, ''),
  );

  const region = el(
    'div',
    {
      'data-dfscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': 'df2tm, what it is and how it works',
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
        width: RP.railW,
        background: 'rgba(223,203,250,.16)',
        'pointer-events': 'none',
      }),
    },
    el('span', {
      'data-dfthumb': true,
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
        left: RP.text.x,
        top: RP.text.y,
        width: RP.text.w,
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
      'data-dfchrome': true,
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
      'data-df2tm': true,
      'data-screen-label': 'df2tm',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': `${DF2TM.name}: ${DF2TM.expansion}, ${DF2TM.descriptor}`,
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
