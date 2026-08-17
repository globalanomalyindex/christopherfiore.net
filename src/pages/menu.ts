/**
 * Screen 1 · Menu — the studio index, on the lattice.
 *
 * Seven frames on the 120px module, listed once in `MENU_FRAMES` and read from
 * there rather than repeated here. Every frame's four corners land on a lattice
 * point, which is the whole system: a component's corner mark is never drawn,
 * it is the background peg at that intersection switched on. `design/lattice.ts`
 * proves it with `offLatticeCorners`, and the browser check asserts it live.
 *
 * THREE LAYERS, and the order is load-bearing:
 *
 *   z 0   band host    the hover band stack
 *   z 1   lattice      the crosshairs, mounted by runtime/lattice.ts
 *   z 2   content      rails, wordmark, channel cells
 *
 * The band paints UNDER the lattice. That is what lets the crosshairs stay
 * visible over a vivid band, and it is why the band lives in a screen-level
 * host rather than inside the button that summoned it.
 *
 * Adjacent channel cells SHARE their corner points at 240, 600, 960, 1320 and
 * 1680. That shared corner is what makes the row read as one modular strip, so
 * there are no gaps between them and none may be added.
 *
 * The prototype's `onClick="{{ openPage }}"` / `onMouseEnter="{{ prodOn }}"`
 * bindings are `data-act` / `data-hov` attributes read by one delegated
 * listener in `src/runtime/actions.ts`.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, FONT } from '../design/tokens.ts';
import { MENU_FRAMES, STAGE } from '../design/layout.ts';
import { CASES } from '../data/cases.ts';
import { CZ_META } from '../data/competizione.ts';
import { PAINTINGS_COUNT_LABEL } from '../data/paintings.ts';
import { RESUME, STUDIO } from '../data/studio.ts';

/* ------------------------------------------------------------------ content */

/**
 * The wordmark, set solid.
 *
 * `perfectionsynthétique` with no space, from the Figma file, and confirmed as
 * a deliberate brand change rather than a side effect of the reflow. Joining
 * the two words is what lets one 128px line fill the 1200 × 240 frame; set as
 * two words at 240px it needed two lines and a frame twice as tall, which is
 * not on this module.
 */
const WORDMARK = STUDIO.wordmark.join('');

/** Channel labels. The number is a separate 13px line above the label. */
const CHANNELS = [
  { n: 1, num: '01', label: 'product designs', hov: 'prod', meta: `${CASES.length} cases` },
  { n: 2, num: '02', label: 'paintings', hov: 'water', meta: PAINTINGS_COUNT_LABEL },
  { n: 3, num: '03', label: 'competizione', hov: 'sweep', meta: CZ_META.channelMeta },
  { n: 4, num: '04', label: 'contact', hov: 'invert', meta: 'about, cv, links' },
] as const;

/* ------------------------------------------------------------------ helpers */

const frameOf = (id: string): { x: number; y: number; w: number; h: number } => {
  const f = MENU_FRAMES.find((m) => m.id === id);
  if (!f) throw new Error(`menu: no frame "${id}"`);
  return f;
};

/**
 * `data-rect` is the inset the grow transition animates from: top, right,
 * bottom, left in stage space. Derived from the frame rather than written out,
 * so a frame that moves takes its transition origin with it.
 */
const rectOf = (f: { x: number; y: number; w: number; h: number }): string =>
  [f.y, STAGE.w - (f.x + f.w), STAGE.h - (f.y + f.h), f.x].join(',');

/** Absolutely positioned frame box. Everything on this screen is one of these. */
function frameBox(
  id: string,
  extra: Record<string, string | number | null>,
  ...kids: (Node | string)[]
): HTMLElement {
  const f = frameOf(id);
  return el(
    'div',
    {
      'data-frame': id,
      style: css({
        position: 'absolute',
        left: f.x,
        top: f.y,
        width: f.w,
        height: f.h,
        'z-index': '2',
        'box-sizing': 'border-box',
        ...extra,
      }),
    },
    ...kids,
  );
}

/** Rail type: 13px, .06em, secondary ink. Padded clear of the corner marks. */
const railText = (s: string) =>
  el(
    'span',
    { style: css({ 'font-size': 13, 'letter-spacing': '.06em', 'white-space': 'nowrap' }) },
    s,
  );

/* -------------------------------------------------------------------- rails */

/**
 * A rail. 28px of horizontal padding so its text clears the corner marks at
 * either end — at 13px the glyphs would otherwise sit on top of the pegs the
 * frame just switched on.
 */
function rail(id: string, items: (string | Node)[]): HTMLElement {
  return frameBox(
    id,
    {
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      padding: '0 28px',
      color: COLOR.inkSoft,
      'data-intro': null,
    },
    ...items.map((i) => (typeof i === 'string' ? railText(i) : i)),
  );
}

/**
 * The resume, in the bottom rail's middle cell.
 *
 * HERE BECAUSE THIS IS THE FIRST SCREEN AND IT NEVER SCROLLS. The rail is up
 * from the intro's first frame and stays put behind every page, so the one
 * document somebody might have come for is never more than a glance away and
 * never needs a channel opened to find. The middle cell is `space-between`
 * doing the work: `updated` holds the left edge and the address holds the
 * right, so a third item centres itself with no geometry to author.
 *
 * A real anchor with a real target, so it is a link a browser can open in a
 * background tab, copy, or hand to a screen reader as one. The full case is
 * on page 04, which is where the download and the file's own facts live.
 */
function resumeRail(): HTMLElement {
  return el(
    'a',
    {
      href: asset(RESUME.href),
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': `View the resume, ${RESUME.pages}, PDF, opens in a new tab`,
      class: 'ps-hov-invert',
      style: css({
        color: 'inherit',
        /*
          TRANSPARENT, INLINE, AND THAT IS THE WHOLE POINT OF THE DECLARATION.
          The menu paints its hover band into `[data-bandhost]` at z 0, under
          the lattice. `.ps-hov-invert:hover` would put an opaque near-black
          background on this anchor at z 2, which covers that band completely
          and leaves near-black ink on a near-black fill. An inline background
          outranks the class, so the band shows and the class is inert — which
          is exactly how page 01's rail controls behave, and the class stays for
          the `:focus-visible` parity it also carries.
        */
        background: 'transparent',
        'text-decoration': 'none',
        cursor: 'pointer',
        display: 'flex',
        'align-items': 'center',
        gap: 10,
        padding: '6px 12px',
        margin: '0 -12px',
        'font-size': 13,
        'letter-spacing': '.06em',
        'white-space': 'nowrap',
        'border-bottom': `1px solid ${COLOR.drape}`,
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    RESUME.label,
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15, 'line-height': '1' }) }, '↗'),
  );
}

/* ---------------------------------------------------------------- channels */

/**
 * One channel cell.
 *
 * A real `<button>`, keeping `data-act` / `data-open` / `data-rect` so the
 * existing open transition works unchanged, `data-hov` so `channels.ts` can
 * give it its personality, and `data-channel` so `hover.ts`'s EXCLUDE list
 * keeps the generic band treatment off it.
 *
 * The number sits 12px above the label, both centered, because the design puts
 * the label on the frame's optical center and the number is a caption to it.
 */
function channel(c: (typeof CHANNELS)[number]): HTMLElement {
  const f = frameOf(`ch${c.n}`);
  return el(
    'button',
    {
      type: 'button',
      'data-frame': `ch${c.n}`,
      'data-channel': c.n,
      'data-act': 'open',
      'data-open': c.n,
      'data-rect': rectOf(f),
      'data-hov': c.hov,
      'aria-label': `Open ${c.num} ${c.label}`,
      style: css({
        appearance: 'none',
        '-webkit-appearance': 'none',
        background: 'transparent',
        border: '0',
        'border-radius': '0',
        margin: '0',
        padding: '0',
        font: 'inherit',
        'text-align': 'center',
        cursor: 'pointer',
        position: 'absolute',
        left: f.x,
        top: f.y,
        width: f.w,
        height: f.h,
        'z-index': '2',
        'box-sizing': 'border-box',
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        gap: 12,
        color: COLOR.ink,
      }),
    },
    el(
      'span',
      {
        'data-chnum': true,
        style: css({ 'font-size': 13, 'letter-spacing': '.1em', color: COLOR.inkSoft }),
      },
      c.num,
    ),
    el(
      'span',
      {
        'data-chlabel': true,
        style: css({
          'font-family': FONT.display,
          'font-feature-settings': FONT.displayFeatures,
          'font-size': 48,
          'letter-spacing': '-.02em',
          'line-height': '1',
          'white-space': 'nowrap',
        }),
      },
      ...letters(c.label),
    ),
  );
}

/* ------------------------------------------------------------------- build */

export function build(): HTMLElement {
  const wm = frameOf('wordmark');

  const menu = el(
    'div',
    {
      'data-menu': true,
      'data-screen-label': 'Studio index',
      style: css({
        position: 'absolute',
        inset: '0',
        background: COLOR.paper,
        color: COLOR.ink,
        overflow: 'hidden',
      }),
    },

    /*
      The band host. First child, z 0, so every band the hover treatment paints
      lands UNDER the lattice. It is empty at rest and `hover.ts` fills it.
    */
    el('div', {
      'data-bandhost': true,
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '0',
        'pointer-events': 'none',
      }),
    }),

    /* z 2 · content. The lattice is inserted at z 1 by mountLattice. */

    rail('rail-top', [STUDIO.name, `${STUDIO.roles} · ${STUDIO.location}`, STUDIO.rev]),

    frameBox(
      'wordmark',
      {
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
      },
      el(
        'div',
        {
          'data-dither': true,
          'data-in-delay': 220,
          'data-in-step': 26,
          style: css({
            'font-family': FONT.display,
            'font-feature-settings': FONT.displayFeatures,
            'font-size': 128,
            'line-height': '1',
            'letter-spacing': '-.02em',
            'white-space': 'nowrap',
          }),
        },
        ...letters(WORDMARK),
      ),
    ),

    ...CHANNELS.map(channel),

    rail('rail-bottom', [STUDIO.updated, resumeRail(), STUDIO.email]),
  );

  // Kept off the frame boxes themselves: `data-intro` drives a clip-path
  // animation, and clipping a frame would clip the corners the lattice reads.
  void wm;

  return menu;
}
