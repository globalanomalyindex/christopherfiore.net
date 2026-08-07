/**
 * Screen 3 · Page 02 — Paintings.
 *
 * A scrolling gallery of the whole inventory over the continuously drifting
 * organic dither field. The opaque #150B20 caption plaque exists so titles stay
 * legible over that moving field — it is not decoration.
 *
 * WHAT THIS REPLACED, AND WHY. The design hangs four works in fixed frames with
 * a wall list of names beside them, and this page ran that way with a rotation:
 * each frame swapped to another work on its own offset so the twenty could be
 * seen four at a time. That was the right answer to "four frames, twenty
 * works". It is the wrong answer to "show the paintings", because a visitor saw
 * four and had to wait, on the page's schedule, to see the rest.
 *
 * So the frames, the rotation and the wall list are all gone. Everything is on
 * the wall at once and you scroll. Three consequences worth knowing:
 *
 * 1. The rotation machinery went with it — the aspect pools, the per-pool
 *    period derived from MIN_REPEAT, the pause-while-reading holds. None of it
 *    has a job when nothing is hidden. `runtime/rotate.ts` has no callers now.
 * 2. The wall list's `on view` column had no meaning left, since everything is
 *    on view, and its names duplicated the plaques underneath them.
 * 3. `PaintingRecord.state` (hung / selected / archive) is still in the data
 *    because it is a fact about the collection, but nothing renders it.
 *
 * NOTHING IS CROPPED. Every work is drawn at its true aspect ratio, computed
 * from the `width`/`height` in the data, so a 1904 × 597 painting is a wide
 * strip rather than a tall painting with its ends cut off. That is the whole
 * reason the layout is a masonry rather than a grid.
 *
 * THE LAYOUT IS COMPUTED, NOT MEASURED. Every column height is known from the
 * data before a single image loads, so there is no reflow when they do and no
 * layout read at runtime. See `layOut` below and the numbers in `PAGE2`.
 *
 * Every work is a real link to its ArtStation record.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, RULE } from '../design/tokens.ts';
import { PAGE2 } from '../design/layout.ts';
import { PAINTINGS, PAINTINGS_COUNT_LABEL, PAINTINGS_META } from '../data/paintings.ts';
import type { PaintingRecord } from '../data/types.ts';

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

/** 15 × 15px corner marks, two 1px lines, offset -7.5px. */
const cross = (pos: Record<string, string | number>) =>
  el('span', {
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      width: 15,
      height: 15,
      'pointer-events': 'none',
      'background-image': `linear-gradient(${COLOR.rust},${COLOR.rust}),linear-gradient(${COLOR.rust},${COLOR.rust})`,
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

/* ---------------------------------------------------------------- the hang */

/** The gap between the scroll region's content and the rail beside it. */
const RAIL_PAD = PAGE2.railW + 16;
/** Usable width inside the scroll region, once the rail has its lane. */
const INNER_W = PAGE2.gallery.w - RAIL_PAD;
const COL_W =
  (INNER_W - PAGE2.galleryGap * (PAGE2.galleryCols - 1)) / PAGE2.galleryCols;

interface Placed {
  work: PaintingRecord;
  left: number;
  top: number;
  w: number;
  h: number;
  /** how many columns it takes: 1, or 2 for the widest works */
  span: number;
}

/**
 * Place every work, shortest column first.
 *
 * Two rules and nothing else. A work wider than `gallerySpanAspect` takes two
 * columns, because at one column the widest painting in the inventory draws
 * 168px tall against a 38px plaque and stops being a painting. And every work
 * lands wherever the shortest run of adjacent columns currently is, which is
 * what keeps the three columns within about 165px of each other over twenty
 * works without anybody ordering them by hand.
 *
 * Pure: same data in, same layout out, no DOM and no measurement.
 */
function layOut(works: readonly PaintingRecord[]): { items: Placed[]; height: number } {
  const tops = new Array<number>(PAGE2.galleryCols).fill(0);
  const items: Placed[] = [];

  for (const work of works) {
    const span = work.width / work.height >= PAGE2.gallerySpanAspect ? 2 : 1;
    const w = COL_W * span + PAGE2.galleryGap * (span - 1);
    const h = Math.round((w * work.height) / work.width);

    // the leftmost run of `span` columns whose deepest point is highest up
    let col = 0;
    let top = Infinity;
    for (let c = 0; c + span <= PAGE2.galleryCols; c++) {
      const t = Math.max(...tops.slice(c, c + span));
      if (t < top - 0.01) {
        top = t;
        col = c;
      }
    }

    items.push({ work, span, w, h, top, left: col * (COL_W + PAGE2.galleryGap) });
    for (let c = col; c < col + span; c++) tops[c] = top + h + PAGE2.galleryGap;
  }

  // the trailing gap is not part of the content
  return { items, height: Math.max(...tops) - PAGE2.galleryGap };
}

const workLabel = (p: PaintingRecord): string =>
  `${p.title}${p.year ? `, ${p.year}` : ''}, view on ArtStation, opens in a new tab`;

/**
 * One work. The plaque sits inside it at the bottom edge, overlapping the
 * painting, exactly as the four frames did — that overlap is the page's look.
 *
 * `reveal` is passed only to the works that start in view. The dither is the
 * site's arrival move and it costs a live SVG filter each, so the fifteen below
 * the fold are simply there when you scroll to them rather than each spending a
 * filter on an entrance nobody is present for.
 */
function workNode(p: Placed, reveal: number | null): HTMLAnchorElement {
  const plaque = el(
    'div',
    {
      style: css({
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: PAGE2.captionH,
        background: COLOR.plaque,
        color: COLOR.lavender,
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        padding: '0 13px',
        'font-size': 12,
        'letter-spacing': '.16em',
      }),
    },
    // lowercased, matching the studio's voice — the prototype's plaque read
    // "crestdown", not "Crestdown"
    el('span', {}, p.work.wall),
    el('span', { style: css({ opacity: '.62' }) }, p.work.year ?? ''),
  );

  const img = el('img', {
    src: asset(p.work.image),
    alt: p.work.alt,
    loading: 'lazy',
    decoding: 'async',
    // the box is cut to the work's own ratio, so `cover` never actually crops;
    // it is here so a rounding error takes a pixel rather than letterboxing
    width: Math.round(p.w),
    height: p.h,
    style: css({
      position: 'absolute',
      inset: '0',
      display: 'block',
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
    }),
  });

  return el(
    'a',
    {
      href: p.work.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      // the band hover would cover the painting; the plaque carries the state
      'data-nohl': true,
      'aria-label': workLabel(p.work),
      ...(reveal === null
        ? {}
        : { 'data-dfx': 10, 'data-in-dur': 380, 'data-in-delay': reveal }),
      style: css({
        ...LINK,
        ...(reveal === null ? {} : { opacity: '0' }),
        position: 'absolute',
        display: 'block',
        left: p.left,
        top: p.top,
        width: p.w,
        height: p.h,
        'box-shadow': `0 0 0 1px ${RULE.onLavenderMajor}`,
      }),
    },
    img,
    plaque,
    ...corners(),
  );
}

interface Gallery {
  node: HTMLElement;
  region: HTMLElement;
  thumb: HTMLElement;
}

function gallery(): Gallery {
  const { items, height } = layOut(PAINTINGS);

  const sheet = el(
    'div',
    {
      style: css({ position: 'relative', width: INNER_W, height }),
    },
    ...items.map((p, i) =>
      // only what starts in view gets the arrival dither, staggered the way the
      // four frames were
      workNode(p, p.top < PAGE2.gallery.h ? 140 + i * 70 : null),
    ),
  );

  const region = el(
    'div',
    {
      'data-pgscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `The paintings, ${PAINTINGS.length} works, scrollable`,
      style: css({
        position: 'absolute',
        inset: '0',
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'padding-right': RAIL_PAD,
        'scrollbar-width': 'none',
        'overscroll-behavior': 'contain',
      }),
    },
    sheet,
  );

  const thumb = el('span', {
    'data-pgthumb': true,
    style: css({
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: 0,
      background: COLOR.rust,
      display: 'none',
    }),
  });

  const rail = el(
    'div',
    {
      'aria-hidden': 'true',
      style: css({
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: PAGE2.railW,
        background: RULE.onLavenderMinor,
        'pointer-events': 'none',
      }),
    },
    thumb,
  );

  const node = el(
    'div',
    {
      'data-intro': 'fade',
      'data-in-delay': 120,
      'data-in-dur': 380,
      style: css({
        opacity: '0',
        position: 'absolute',
        left: PAGE2.gallery.x,
        top: PAGE2.gallery.y,
        width: PAGE2.gallery.w,
        height: PAGE2.gallery.h,
      }),
    },
    region,
    rail,
  );

  return { node, region, thumb };
}

/**
 * Paint the rail thumb. Cheap enough to run straight off the scroll event: a
 * couple of style writes and no layout read beyond the region's own metrics.
 */
function wireRail(g: Gallery): void {
  const paint = (): void => {
    const view = g.region.clientHeight;
    const total = g.region.scrollHeight;
    const over = total - view;
    // a hidden page measures zero, and the scroll event queued on close lands
    // after display:none
    if (!view) return;
    if (over <= 1) {
      g.thumb.style.display = 'none';
      return;
    }
    const h = Math.max(28, Math.round((view / total) * view));
    const u = Math.min(1, Math.max(0, g.region.scrollTop / over));
    g.thumb.style.display = 'block';
    g.thumb.style.height = `${h}px`;
    g.thumb.style.transform = `translateY(${Math.round(u * (view - h))}px)`;
  };
  g.region.addEventListener('scroll', paint, { passive: true });

  /*
    `wireRail` runs during `build()`, before the root is in the document, so the
    region measures zero and the first paint is a no-op. The thumb therefore has
    to be painted when the page is actually shown, and the page's visibility is
    an inline style write by `transitions.ts` and nothing else — the same signal
    `main.ts`'s a11y mirror relies on.

    Opening sends the gallery back to the top, so a visit starts at the first
    work rather than wherever the last one stopped reading. It is hooked to the
    hidden-to-shown EDGE and not to hiding: `display: none` is written at the
    end of the close animation, so closing and re-opening inside that window
    never hid the page at all and the old scroll position survived. And it is
    an edge rather than every write because `transitions.ts` also writes
    `clip-path` to this same element while the page is up, and resetting on
    those would yank the gallery out from under anyone reading it.
  */
  const root = (): HTMLElement | null => g.node.closest('[data-page]');
  const shown = (): boolean => {
    const r = root();
    return !!r && r.style.display !== 'none';
  };
  let was = false;
  const life = (): void => {
    const now = shown();
    if (now && !was) g.region.scrollTop = 0;
    if (now) paint();
    was = now;
  };
  queueMicrotask(() => {
    const r = root();
    if (!r) return;
    new MutationObserver(life).observe(r, { attributes: true, attributeFilter: ['style'] });
    life();
  });
}

/* ------------------------------------------------------------------- chrome */

function headerBar(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Close, back to studio index',
      class: 'ps-hov-dim',
      style: css({
        ...BTN,
        display: 'flex',
        'align-items': 'center',
        'align-self': 'stretch',
        gap: 14,
        'padding-right': 28,
        'margin-right': -28,
        transition: 'opacity 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15 }) }, '✕'),
    'close',
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
        left: PAGE2.header.x,
        right: PAGE2.header.x,
        top: PAGE2.header.y,
        height: PAGE2.header.h,
        display: 'flex',
        'align-items': 'center',
        gap: PAGE2.header.gap,
        'border-bottom': `1px solid ${RULE.onLavenderMajor}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    el('span', { 'aria-hidden': 'true', style: css({ opacity: '.34' }) }, '|'),
    el('span', {}, '02 · paintings'),
    el('span', { style: css({ 'margin-left': 'auto' }) }, PAINTINGS_COUNT_LABEL),
  );
}

function footerBar(): HTMLElement {
  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'close',
      'aria-label': 'Back to studio index',
      class: 'ps-hov-dim',
      style: css({
        ...BTN,
        display: 'flex',
        'align-items': 'center',
        'align-self': 'stretch',
        gap: 18,
        'padding-right': 30,
        'margin-right': -30,
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
      'data-next': 3,
      'aria-label': 'Next channel, 03 Competizione',
      class: 'ps-hov-dim',
      style: css({
        ...BTN,
        display: 'flex',
        'align-items': 'center',
        'align-self': 'stretch',
        gap: 18,
        'padding-left': 30,
        'margin-left': -30,
      }),
    },
    'next — 03 competizione',
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 19, 'line-height': '1' }) }, '→'),
  );

  return el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 240,
      'data-in-dur': 340,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE2.footer.x,
        right: PAGE2.footer.x,
        bottom: PAGE2.footer.bottom,
        height: PAGE2.footer.h,
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'border-top': `1px solid ${RULE.onLavenderMajor}`,
        'font-size': 13,
        'letter-spacing': '.16em',
      }),
    },
    close,
    el('span', { style: css({ opacity: '.72' }) }, 'channel 02 of 04'),
    next,
  );
}

/* -------------------------------------------------------------------- build */

export function build(): HTMLElement {
  const frost = el('canvas', {
    'data-frost': 'paint',
    'data-mode': 2,
    'data-rest-mode': 4,
    'data-rest-op': '.9',
    'data-boost': 3.4,
    width: 240,
    height: 135,
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

  const pframe = el('div', {
    'data-pframe': true,
    'aria-hidden': 'true',
    style: css({
      position: 'absolute',
      top: PAGE2.frameInset,
      right: PAGE2.frameInset,
      bottom: PAGE2.frameInset,
      left: PAGE2.frameInset,
      border: `${PAGE2.frameWidth}px solid ${COLOR.rust}`,
      'pointer-events': 'none',
      'z-index': '4',
    }),
  });

  const title = el(
    'div',
    {
      'data-ptitle': true,
      style: css({
        position: 'absolute',
        'z-index': '3',
        left: PAGE2.title.x,
        top: PAGE2.title.y,
        'transform-origin': '0 0',
        'font-family': "'Karrik',sans-serif",
        'font-size': PAGE2.title.size,
        'line-height': `${PAGE2.title.lh}px`,
        'letter-spacing': PAGE2.title.track,
        'white-space': 'nowrap',
      }),
    },
    ...letters('Paintings').map((s) => {
      s.style.display = 'inline-block';
      return s;
    }),
  );

  const meta = el(
    'div',
    {
      'data-intro': 'wipeX',
      'data-in-delay': 200,
      'data-in-dur': 300,
      style: css({
        'clip-path': 'inset(0 100% 0 0)',
        position: 'absolute',
        left: PAGE2.meta.x,
        top: PAGE2.meta.y,
        'font-size': 13,
        'letter-spacing': '.16em',
        opacity: '.78',
      }),
    },
    PAINTINGS_META,
  );

  const g = gallery();

  const body = el(
    'div',
    {
      'data-pbody': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '2', opacity: '0' }),
    },
    headerBar(),
    meta,
    g.node,
    footerBar(),
  );

  const root = el(
    'section',
    {
      'data-page': 2,
      'data-screen-label': 'Page 02 paintings',
      role: 'region',
      'aria-label': 'Paintings',
      'aria-hidden': 'true',
      inert: true,
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '6',
        display: 'none',
        background: COLOR.lavender,
        color: COLOR.rust,
        overflow: 'hidden',
      }),
    },
    frost,
    pframe,
    title,
    body,
  );

  wireRail(g);

  return root;
}
