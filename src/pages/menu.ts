/**
 * Screen 1 · Menu — the studio index.
 *
 * Geometry is transcribed from `_source/prototype/prototype.markup.html` and
 * `src/design/layout.ts`, in the fixed 1920 × 1080 design space.
 *
 * The prototype's `onClick="{{ openPage }}"` / `onMouseEnter="{{ prodOn }}"`
 * bindings become `data-act` / `data-hov` attributes read by one delegated
 * listener in `src/runtime/actions.ts`. The channel cells keep their inline
 * custom properties (`--r`, `--p`) and transitions: the three in-character
 * hovers in `src/runtime/channels.ts` drive them.
 */

import { asset, css, el, letters, svg } from '../dom.ts';
import { COLOR, RULE, rgba } from '../design/tokens.ts';
import { MENU, MODULE, PAINT_PIX } from '../design/layout.ts';
import { CASES } from '../data/cases.ts';
import { CZ_META } from '../data/competizione.ts';
import { PAINTINGS_COUNT_LABEL, PAINTINGS_META } from '../data/paintings.ts';
import { CONTACT_STRIP_LINES, STUDIO } from '../data/studio.ts';

/* ------------------------------------------------------------------ content */

/** Channel 01 footer list — the first four cases, in inventory order. */
const CH1_FOOTER = CASES.slice(0, 4)
  .map((c) => c.name)
  .join(', ');
// The channel holds the cases *and* the motion archive; say so, or the count
// disagrees with the page header the cell opens into.
const CH1_META = `${CASES.length} cases + motion`;

/** Channel 02 footer list — the media segment of the paintings meta line. */
const CH2_FOOTER = PAINTINGS_META.split(' · ').at(-1) ?? PAINTINGS_META;
const CH2_META = PAINTINGS_COUNT_LABEL;

const CH3_FOOTER = CZ_META.channelFooter;
const CH3_META = CZ_META.channelMeta;

/* ------------------------------------------------------------------ helpers */

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

/**
 * BTN without its `background` / `color`, for controls whose paint lives in a
 * stylesheet so a `:hover` rule can change it. An inline declaration outranks
 * any class, so a control that spreads BTN and then wants a hover fill has to
 * drop these two or the hover is silently a no-op.
 */
const { background: _btnBg, color: _btnInk, ...BTN_UNPAINTED } = BTN;

/** Per-letter spans — the handle the glitch engine measures and swaps. */
function word(text: string, extra?: Partial<CSSStyleDeclaration>): HTMLSpanElement[] {
  return letters(text).map((s) => {
    s.style.display = 'inline-block';
    if (extra) Object.assign(s.style, extra);
    return s;
  });
}

/** A channel's meta row: index left, count right. */
const metaRow = (left: string, right: string, extra?: Record<string, string | number>) =>
  el(
    'span',
    {
      style: css({
        position: 'relative',
        'z-index': '1',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'font-size': 13,
        'letter-spacing': '.16em',
        ...extra,
      }),
    },
    el('span', {}, left),
    el('span', {}, right),
  );

/** A channel's footer row: list left, verb right. */
const footRow = (list: string, verb: string, extra?: Record<string, string | number>) =>
  el(
    'span',
    {
      style: css({
        position: 'relative',
        'z-index': '1',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'font-size': 14,
        'letter-spacing': '.11em',
        ...extra,
      }),
    },
    el('span', {}, list),
    el('span', {}, verb),
  );

const CELL_BASE: Record<string, string | number> = {
  position: 'relative',
  height: MENU.channelRowH,
  'box-sizing': 'border-box',
  'border-bottom': `1px solid ${RULE.onInkMajor}`,
  display: 'flex',
  'flex-direction': 'column',
  width: '100%',
};

/* ------------------------------------------------------------------- header */

function header(): HTMLElement {
  const cell = (
    content: (Node | string)[],
    span: number,
    delay: number,
    padding: string,
    last = false,
  ) =>
    el(
      'span',
      {
        'data-intro': 'wipeX',
        'data-in-delay': delay,
        'data-in-dur': 220,
        style: css({
          'clip-path': 'inset(0 100% 0 0)',
          'grid-column': `span ${span}`,
          display: 'flex',
          'align-items': 'center',
          'justify-content': last ? 'space-between' : null,
          padding,
          'border-right': last ? null : `1px solid ${RULE.onInkMinor}`,
        }),
      },
      ...content,
    );

  return el(
    'div',
    {
      'data-mfade': true,
      style: css({
        flex: 'none',
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        height: MENU.headerH,
        'border-bottom': `1px solid ${RULE.onInkMajor}`,
        'font-size': 13,
        'letter-spacing': '.18em',
      }),
    },
    // 3/4/3/2 rather than the handoff's 4/3/3/2: the revision cell now carries
    // the date as well, and the role cell got shorter, so a column moves across.
    cell([STUDIO.name], 3, 480, '0 20px 0 56px'),
    cell([`${STUDIO.rev} · ${STUDIO.updated}`], 4, 520, '0 20px'),
    cell([STUDIO.roles], 3, 560, '0 20px'),
    cell([STUDIO.locationShort], 2, 600, '0 56px 0 20px', true),
  );
}

/* --------------------------------------------------------------------- hero */

function hero(): HTMLElement {
  const frost = el('canvas', {
    'data-frost': true,
    width: 384,
    height: 120,
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      'image-rendering': 'pixelated',
      'pointer-events': 'none',
    }),
  });

  // Drawn at 393px wide; the intro dithers it in from opacity 0.
  const crest = el('img', {
    'data-logo': true,
    src: asset('brand/crestdown-paper.png'),
    alt: '',
    'aria-hidden': 'true',
    decoding: 'async',
    style: css({
      position: 'absolute',
      'z-index': '2',
      left: MENU.crest.left,
      top: MENU.crest.top,
      width: MENU.crest.w,
      opacity: '0',
      'pointer-events': 'none',
    }),
  });

  const line = (text: string, delay: number) =>
    el(
      'div',
      {
        'data-dither': true,
        'data-in-delay': delay,
        'data-in-step': 30,
        style: css({
          'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
          'font-size': MENU.wordmarkSize,
          'line-height': String(MENU.wordmarkLh),
          'letter-spacing': MENU.wordmarkTrack,
        }),
      },
      ...word(text),
    );

  const wordcol = el(
    'div',
    {
      'data-wordcol': true,
      style: css({
        position: 'relative',
        'z-index': '1',
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'flex-start',
      }),
    },
    line(STUDIO.wordmark[0], 220),
    line(STUDIO.wordmark[1], 340),
  );

  const tagline = el(
    'div',
    {
      'data-intro': 'fade',
      'data-in-delay': 760,
      'data-in-dur': 300,
      style: css({
        position: 'relative',
        'z-index': '1',
        opacity: '0',
        'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
        'font-size': 30,
        'letter-spacing': '-.02em',
        'margin-top': 28,
      }),
    },
    STUDIO.tagline,
  );

  return el(
    'div',
    {
      'data-hero': true,
      style: css({
        position: 'relative',
        overflow: 'hidden',
        flex: '1',
        'min-height': '0',
        display: 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        padding: '0 56px',
        'border-bottom': `1px solid ${RULE.onInkMajor}`,
      }),
    },
    frost,
    crest,
    wordcol,
    tagline,
  );
}

/* --------------------------------------------------------------- channel 01 */

/**
 * The dashed module scaffolding that tracks the cursor inside channel 01.
 * Static decorative markup authored here — the guides carry the hooks
 * `src/runtime/channels.ts` moves (`data-vguide`, `data-hguide`, `data-mod`,
 * and `data-mx`/`data-my` on the dimension arrows).
 */
function scaffolding(): SVGElement {
  const root = svg('svg', {
    width: 800,
    height: MENU.channelRowH,
    viewBox: `0 0 800 ${MENU.channelRowH}`,
    'aria-hidden': 'true',
    focusable: 'false',
    style: 'position:absolute;inset:0;pointer-events:none;overflow:visible',
  });
  const S = COLOR.shadow;
  const F = 'Dessign Maison, Helvetica, sans-serif';
  const fade = 'opacity:0;transition:opacity 180ms linear';
  root.innerHTML = `
<g data-vguide data-scaf style="${fade}" transform="translate(0,0)"><line x1="0" y1="0" x2="0" y2="289" stroke="${S}" stroke-width="1.25" stroke-dasharray="4 4"/></g>
<g data-hguide data-scaf style="${fade}" transform="translate(0,0)"><line x1="0" y1="0" x2="800" y2="0" stroke="${S}" stroke-width="1.25" stroke-dasharray="4 4"/></g>
<g data-mod data-scaf style="${fade}" transform="translate(0,0)"><rect x="1.2" y="1.2" width="70.5" height="70.5" fill="none" stroke="${S}" stroke-width="1.5"/><text x="0" y="-7" text-anchor="start" font-family="${F}" font-size="12" letter-spacing="1" fill="${S}">col 01 · row 01</text></g>
<g data-scaf style="${fade}"><line x1="72.7" y1="0" x2="72.7" y2="289" stroke="${S}" stroke-width="1.25" stroke-dasharray="3 3"/><line x1="68.7" y1="0" x2="76.7" y2="0" stroke="${S}" stroke-width="1.25"/><line x1="68.7" y1="289" x2="76.7" y2="289" stroke="${S}" stroke-width="1.25"/></g>
<g data-scaf style="${fade}"><line x1="72.7" y1="72.7" x2="727.3" y2="72.7" stroke="${S}" stroke-width="1.25" stroke-dasharray="3 3"/><line x1="72.7" y1="68.7" x2="72.7" y2="76.7" stroke="${S}" stroke-width="1.25"/><line x1="727.3" y1="68.7" x2="727.3" y2="76.7" stroke="${S}" stroke-width="1.25"/></g>
<g data-scaf style="${fade}"><line x1="72.7" y1="145.45" x2="727.3" y2="145.45" stroke="${S}" stroke-width="1.25" stroke-dasharray="3 3"/><line x1="72.7" y1="141.45" x2="72.7" y2="149.45" stroke="${S}" stroke-width="1.25"/><line x1="727.3" y1="141.45" x2="727.3" y2="149.45" stroke="${S}" stroke-width="1.25"/></g>
<g data-scaf style="${fade}"><line x1="72.7" y1="218.2" x2="727.3" y2="218.2" stroke="${S}" stroke-width="1.25" stroke-dasharray="3 3"/><line x1="72.7" y1="214.2" x2="72.7" y2="222.2" stroke="${S}" stroke-width="1.25"/><line x1="727.3" y1="214.2" x2="727.3" y2="222.2" stroke="${S}" stroke-width="1.25"/></g>
<g data-scaf data-mx="36" data-my="182" style="${fade}"><line x1="0" y1="182" x2="72.7" y2="182" stroke="${S}" stroke-width="1.5"/><polyline points="5,177 0,182 5,187" fill="none" stroke="${S}" stroke-width="1.5"/><polyline points="67.7,177 72.7,182 67.7,187" fill="none" stroke="${S}" stroke-width="1.5"/><text x="36" y="175" text-anchor="middle" font-family="${F}" font-size="12" letter-spacing="1" fill="${S}">1/11 · 72.7</text></g>
<g data-scaf data-mx="32" data-my="95" style="${fade}"><line x1="32" y1="72.7" x2="32" y2="218.2" stroke="${S}" stroke-width="1.5"/><polyline points="27,77.7 32,72.7 37,77.7" fill="none" stroke="${S}" stroke-width="1.5"/><polyline points="27,213.2 32,218.2 37,213.2" fill="none" stroke="${S}" stroke-width="1.5"/><text x="4" y="66" text-anchor="start" font-family="${F}" font-size="12" letter-spacing="1" fill="${S}">2/4 · 145.5</text></g>
<g data-scaf data-mx="400" data-my="254" style="${fade}"><line x1="363.6" y1="254" x2="436.4" y2="254" stroke="${S}" stroke-width="1.5"/><polyline points="368.6,249 363.6,254 368.6,259" fill="none" stroke="${S}" stroke-width="1.5"/><polyline points="431.4,249 436.4,254 431.4,259" fill="none" stroke="${S}" stroke-width="1.5"/><text x="400" y="247" text-anchor="middle" font-family="${F}" font-size="12" letter-spacing="1" fill="${S}">72.7</text></g>`;
  return root;
}

function channel1(): HTMLElement {
  const gridH = `repeating-linear-gradient(90deg,${RULE.gridLine} 0 2px,${rgba(COLOR.paper, 0)} 2px ${MODULE}px)`;
  const gridV = `repeating-linear-gradient(0deg,${RULE.gridLine} 0 2px,${rgba(COLOR.paper, 0)} 2px ${MODULE}px)`;
  // The fill grows from the hovered module: --r is the radius, --p the wipe.
  const pos =
    'calc(var(--gx,363.6px) - var(--r)) calc(var(--gy,145.4px) - var(--r)),calc(var(--gx,363.6px) - var(--r)) calc(var(--gy,145.4px) - var(--r)),left top';

  const cell = el(
    'button',
    {
      type: 'button',
      'data-act': 'open',
      'data-open': 1,
      'data-rect': MENU.channels[0].rect.join(','),
      'data-hov': 'prod',
      'aria-label': 'Open Product designs',
      style: css({
        ...BTN,
        ...CELL_BASE,
        '--r': '0px',
        '--p': '0px',
        'background-image': `${gridH},${gridV},linear-gradient(${COLOR.paper},${COLOR.paper})`,
        'background-repeat': 'no-repeat',
        'background-position': pos,
        'background-size':
          'calc(var(--r)*2) calc(var(--r)*2),calc(var(--r)*2) calc(var(--r)*2),var(--p) 100%',
        transition:
          '--r 120ms steps(11,end),--p 260ms cubic-bezier(.3,0,0,1) 70ms,color 0ms linear 110ms',
      }),
    },
    scaffolding(),
    metaRow('01', CH1_META, { height: MODULE, padding: `0 ${MODULE}px` }),
    el(
      'span',
      {
        style: css({
          position: 'relative',
          'z-index': '1',
          display: 'block',
          height: 145.454,
          padding: `0 ${MODULE}px`,
          'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
          'font-size': 92,
          'line-height': `${MODULE}px`,
          'letter-spacing': '-.06em',
        }),
      },
      ...word('Product', {
        transition: 'color 200ms linear,-webkit-text-stroke-color 200ms linear',
      }),
      el('br'),
      ...word('designs', {
        transition: 'color 200ms linear,-webkit-text-stroke-color 200ms linear',
      }),
    ),
    footRow(CH1_FOOTER, 'Open', { height: 70.8, padding: `0 ${MODULE}px` }),
  );

  return el(
    'div',
    {
      'data-channel': 1,
      'data-intro': 'wipeUp',
      'data-in-delay': 900,
      'data-in-dur': 330,
      style: css({ 'clip-path': 'inset(100% 0 0 0)', width: MENU.channels[0].w, flex: 'none' }),
    },
    cell,
  );
}

/* --------------------------------------------------------------- channel 02 */

function channel2(): HTMLElement {
  // Turbulent displacement for the paint canvas — the water hover's wobble.
  const filt = svg('svg', {
    width: 0,
    height: 0,
    'aria-hidden': 'true',
    focusable: 'false',
    style: 'position:absolute;pointer-events:none',
  });
  filt.innerHTML =
    '<filter id="ps-liquid-i" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="7" result="n"></feTurbulence>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="20" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>' +
    '</filter>';

  const paintLayer = el(
    'span',
    {
      style: css({
        position: 'absolute',
        left: 15,
        top: 15,
        right: 15,
        bottom: 15,
        display: 'block',
        overflow: 'hidden',
        'pointer-events': 'none',
        'z-index': '0',
      }),
    },
    el('canvas', {
      'data-paint': true,
      width: PAINT_PIX.w,
      height: PAINT_PIX.h,
      'aria-hidden': 'true',
      style: css({
        display: 'block',
        width: '100%',
        height: '100%',
        opacity: '0',
        transition: 'opacity 300ms linear',
        // The blur that used to be here is gone. Both canvases now carry a
        // one-pixel-per-5px backing store that channels.ts ordered-dithers, and
        // a 7px blur over a 5px block is the one thing that erases it. The
        // turbulence stays: displacing whole blocks reads as wet pigment
        // dragging the pixels around, which a blur was only ever approximating.
        filter: 'url(#ps-liquid-i) saturate(1.05)',
        'image-rendering': 'pixelated',
      }),
    }),
    el('canvas', {
      'data-beads': true,
      width: PAINT_PIX.w,
      height: PAINT_PIX.h,
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        inset: '0',
        display: 'block',
        width: '100%',
        height: '100%',
        opacity: '0',
        transition: 'opacity 220ms linear',
        // No displacement on the beads: they are the crisp foreground, and the
        // two layers reading differently is what gives the field depth.
        filter: 'saturate(1.12)',
        'image-rendering': 'pixelated',
      }),
    }),
  );

  const cell = el(
    'button',
    {
      type: 'button',
      'data-act': 'open',
      'data-open': 2,
      'data-rect': MENU.channels[1].rect.join(','),
      'data-hov': 'water',
      'aria-label': 'Open Paintings',
      style: css({
        ...BTN,
        ...CELL_BASE,
        padding: 28,
        'justify-content': 'space-between',
        '--p': '0px',
        'background-image': `linear-gradient(${COLOR.paper},${COLOR.paper})`,
        'background-repeat': 'no-repeat',
        'background-position': 'left top',
        'background-size': 'var(--p) 100%',
        // The hover grows this to a 14px ink frame with a 1px paper hairline;
        // resting is the same two colors at zero width, so the frame grows in
        // rather than crossing hues on the way. The hairline used to rest on
        // the old lavender at zero alpha.
        'box-shadow': `inset 0 0 0 0 ${rgba(COLOR.ink, 0)},inset 0 0 0 0 ${rgba(COLOR.paper, 0)}`,
        transition:
          '--p 300ms cubic-bezier(.3,0,0,1) 40ms,box-shadow 200ms cubic-bezier(.2,0,0,1),color 0ms linear 150ms',
      }),
    },
    filt,
    paintLayer,
    metaRow('02', CH2_META),
    el(
      'span',
      {
        style: css({
          position: 'relative',
          'z-index': '1',
          display: 'block',
          'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
          'font-size': 76,
          'line-height': '.96',
          'letter-spacing': '-.05em',
        }),
      },
      ...word('Paintings'),
    ),
    footRow(CH2_FOOTER, 'View'),
  );

  return el(
    'div',
    {
      'data-channel': 2,
      'data-intro': 'wipeUp',
      'data-in-delay': 990,
      'data-in-dur': 330,
      style: css({ 'clip-path': 'inset(100% 0 0 0)', width: MENU.channels[1].w, flex: 'none' }),
    },
    cell,
  );
}

/* --------------------------------------------------------------- channel 03 */

function channel3(): HTMLElement {
  const flag = (top: number, invert: boolean) =>
    el('span', {
      'data-flag': true,
      style: css({
        position: 'absolute',
        left: -96,
        right: -96,
        top,
        height: 48,
        display: 'block',
        'pointer-events': 'none',
        opacity: '0',
        transition: 'opacity 300ms linear',
        'background-image': invert
          ? `repeating-linear-gradient(90deg,${rgba(COLOR.woodDeep, 0)} 0 48px,${COLOR.woodDeep} 48px 96px)`
          : `repeating-linear-gradient(90deg,${COLOR.woodDeep} 0 48px,${rgba(COLOR.woodDeep, 0)} 48px 96px)`,
        'background-repeat': 'repeat',
        'will-change': 'transform,opacity',
        'backface-visibility': 'hidden',
      }),
    });

  const mask =
    'linear-gradient(to bottom,rgba(0,0,0,0) 0 96px,#000 96px,#000 192px,rgba(0,0,0,0) 192px)';

  const band = el(
    'span',
    {
      style: css({
        position: 'absolute',
        inset: '0',
        display: 'block',
        'pointer-events': 'none',
        overflow: 'hidden',
        '-webkit-mask-image': mask,
        'mask-image': mask,
      }),
    },
    flag(96, false),
    flag(144, true),
  );

  /** The 79.5–80.5px pin marks that top and tail the checkered band. */
  const pins = `repeating-linear-gradient(90deg,${rgba(COLOR.woodDeep, 0)} 0 79.5px,${COLOR.woodDeep} 79.5px 80.5px,${rgba(COLOR.woodDeep, 0)} 80.5px 160px)`;

  const frame = (extra: Record<string, string | number>) =>
    el('span', {
      'data-frame': true,
      style: css({
        position: 'absolute',
        left: 0,
        right: 0,
        display: 'block',
        'box-sizing': 'border-box',
        'pointer-events': 'none',
        opacity: '0',
        transition: 'opacity 300ms linear',
        ...extra,
      }),
    });

  const cell = el(
    'button',
    {
      type: 'button',
      'data-act': 'open',
      'data-open': 3,
      'data-rect': MENU.channels[2].rect.join(','),
      'data-hov': 'sweep',
      'aria-label': 'Open Competizione',
      style: css({
        ...BTN,
        ...CELL_BASE,
        padding: '28px 56px 30px 28px',
        'justify-content': 'space-between',
        'background-image': `repeating-linear-gradient(115deg,${COLOR.paper} 0 13px,${rgba(COLOR.paper, 0)} 13px 27px)`,
        'background-repeat': 'no-repeat',
        'background-position': 'left center',
        'background-size': '0% 100%',
        'box-shadow': `inset 0 0 0 0 ${COLOR.paper}`,
        transition:
          'background-size 120ms linear,box-shadow 260ms cubic-bezier(.3,0,0,1) 70ms,color 0ms linear 110ms',
      }),
    },
    band,
    frame({
      top: 96,
      height: 96,
      'border-top': `1px solid ${COLOR.woodDeep}`,
      'border-bottom': `1px solid ${COLOR.woodDeep}`,
    }),
    frame({ top: 91, height: 11, 'background-image': pins }),
    frame({ top: 186, height: 11, 'background-image': pins }),
    metaRow('03', CH3_META),
    el(
      'span',
      {
        'data-word': true,
        style: css({
          position: 'relative',
          'z-index': '1',
          display: 'block',
          transform: 'translateY(19.1px)',
          'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
          /*
            82, not the handoff's 88. Monaco is monospace, so this is solved
            rather than tuned: 12 characters at -.06em draw
            12 × 82 × 0.54 = 531 against the 556 this cell leaves after its
            56/28 padding. At 88 it drew 570 and wrapped "Competizione" onto a
            second line with one letter on it.
          */
          'font-size': 82,
          'line-height': '.94',
          'letter-spacing': '-.06em',
        }),
      },
      ...letters('Competizione'),
    ),
    footRow(CH3_FOOTER, 'Preview'),
  );

  return el(
    'div',
    {
      'data-channel': 3,
      'data-intro': 'wipeUp',
      'data-in-delay': 1080,
      'data-in-dur': 330,
      style: css({ 'clip-path': 'inset(100% 0 0 0)', width: MENU.channels[2].w, flex: 'none' }),
    },
    cell,
  );
}

/* ------------------------------------------------------------ contact strip */

function contactStrip(): HTMLElement {
  const first = el(
    'span',
    {
      style: css({
        position: 'relative',
        'z-index': '1',
        'grid-column': 'span 4',
        padding: '0 28px 0 56px',
        display: 'flex',
        'align-items': 'baseline',
        gap: 20,
        'border-right': `1px solid ${RULE.onInkMinor}`,
      }),
    },
    el('span', { style: css({ 'font-size': 13, 'letter-spacing': '.16em' }) }, '04'),
    el(
      'span',
      {
        style: css({
          'font-family': "Monaco,'SFMono-Regular',Menlo,ui-monospace,monospace",
          /*
            48, down from 62 when the face was Karrik and 86 in the handoff.
            The strip names both things it opens, so it is 18 characters where
            "Contact" was 7, and Monaco is wider than Karrik. Solved: 18 × 48 ×
            0.56 = 484 against the ~516 left in this cell once the "04" label
            and its 20px gap are taken out. At 62 it drew 625 and ran under the
            email beside it.
          */
          'font-size': 48,
          'letter-spacing': '-.04em',
          'line-height': '1',
          'white-space': 'nowrap',
        }),
      },
      ...word('Contact + About me'),
    ),
  );

  const lines = el(
    'span',
    {
      style: css({
        position: 'relative',
        'z-index': '1',
        'grid-column': 'span 5',
        padding: '0 28px',
        display: 'flex',
        'align-items': 'center',
        'border-right': `1px solid ${RULE.onInkMinor}`,
      }),
    },
    el(
      'span',
      {
        style: css({
          'font-size': 14,
          'letter-spacing': '.11em',
          'line-height': '2.1',
        }),
      },
      CONTACT_STRIP_LINES[0],
      el('br'),
      CONTACT_STRIP_LINES[1],
    ),
  );

  return el(
    'button',
    {
      type: 'button',
      'data-mfade': true,
      'data-act': 'open',
      'data-open': 4,
      'data-rect': MENU.contactRect.join(','),
      'data-intro': 'wipeX',
      'data-in-delay': 1300,
      'data-in-dur': 400,
      'aria-label': 'Open Contact and About me',
      // The one control on the menu with no hover state. The channels get their
      // own personalities; this is a plain strip, so it takes page 04's plain
      // inversion. `color` moves here from the four inner spans, because a
      // child that pins its own colour cannot be inverted by an ancestor.
      class: 'ps-contact-strip',
      style: css({
        ...BTN_UNPAINTED,
        'clip-path': 'inset(0 100% 0 0)',
        flex: 'none',
        display: 'grid',
        'grid-template-columns': 'repeat(12,1fr)',
        'align-items': 'center',
        height: MENU.contactStripH,
        // background and colour live in menu.css, NOT here: an inline style
        // outranks a class rule, so declaring them inline would make the hover
        // inversion a no-op. Same collision HOVER_CLASSES.md records for the
        // page-03 hero.
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('canvas', {
      'data-frost': 'quiet',
      width: 288,
      height: 20,
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        'image-rendering': 'pixelated',
        'pointer-events': 'none',
        'z-index': '0',
      }),
    }),
    first,
    lines,
    el(
      'span',
      {
        style: css({
          position: 'relative',
          'z-index': '1',
          'grid-column': 'span 3',
          padding: '0 56px 0 28px',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'font-size': 13,
          'letter-spacing': '.16em',
        }),
      },
      el('span', {}, 'Send a message'),
      el('span', {}, '+'),
    ),
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
  const divider = (left: number) =>
    el('div', {
      'data-intro': 'line',
      'data-in-delay': 1240,
      'data-in-dur': 230,
      'aria-hidden': 'true',
      style: css({
        transform: 'scaleY(0)',
        'transform-origin': 'top',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left,
        width: 1,
        background: 'rgba(43,11,3,.42)',
        'mix-blend-mode': 'multiply',
        'pointer-events': 'none',
      }),
    });

  const channelRow = el(
    'div',
    {
      style: css({
        position: 'relative',
        flex: 'none',
        display: 'flex',
        'align-items': 'stretch',
        height: MENU.channelRowH,
      }),
    },
    channel1(),
    channel2(),
    channel3(),
    divider(MENU.channels[0].w),
    divider(MENU.channels[0].w + MENU.channels[1].w),
  );

  return el(
    'div',
    {
      'data-menu': true,
      'data-screen-label': 'Menu',
      role: 'region',
      'aria-label': 'Studio index',
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '1',
        display: 'flex',
        'flex-direction': 'column',
      }),
    },
    header(),
    hero(),
    channelRow,
    contactStrip(),
  );
}
