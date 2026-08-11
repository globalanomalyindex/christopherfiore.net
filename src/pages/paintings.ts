/**
 * Screen 3 · Page 02 — Paintings.
 *
 * The whole inventory, hung over the continuously drifting organic dither
 * field. The opaque #150B20 caption plaque exists so titles stay
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
 * the wall and you move through it yourself. Three consequences worth knowing:
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
 * AND NOTHING SCROLLS. The wall is packed into PLATES, each exactly the height
 * of the band, and a gesture commits the gallery to a different plate rather
 * than sliding it: the works dither away in Bayer order, the next plate's works
 * dither in where they sit, and nothing on this screen moves vertically at any
 * point. `runtime/reorganize.ts` is the machine and its header is where the
 * idea is written down; screen 2b's mosaic runs on the same one.
 *
 * That is why the packer below has a height cap. A plate that a work hangs off
 * the bottom of would show that work cut in half at rest, which is the one
 * thing this page's layout exists to prevent — and unlike a scroll, there is no
 * moment afterwards where the rest of it arrives. Two works in the inventory
 * draw taller than the band at full column width; they are drawn to the band's
 * height instead and keep their ratio exactly, so they come in a little smaller
 * with air either side rather than cropped.
 *
 * THE LAYOUT IS COMPUTED, NOT MEASURED. Every column height is known from the
 * data before a single image loads, so there is no reflow when they do and no
 * layout read at runtime. See `layOut` below and the numbers in `PAGE2`.
 *
 * Every work is a real link to its ArtStation record.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, FONT, RULE } from '../design/tokens.ts';
import { PAGE2 } from '../design/layout.ts';
import { PAINTINGS, PAINTINGS_COUNT_LABEL, PAINTINGS_META } from '../data/paintings.ts';
import { reorganize } from '../runtime/reorganize.ts';
import { state } from '../runtime/state.ts';
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
      'background-image': `linear-gradient(${COLOR.drape},${COLOR.drape}),linear-gradient(${COLOR.drape},${COLOR.drape})`,
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

/** A plate is exactly the band, so a plate at rest is the whole viewport. */
const PLATE_H = PAGE2.gallery.h;

interface Placed {
  work: PaintingRecord;
  /** which plate it hangs on */
  plate: number;
  left: number;
  /** top within its own plate, and the only top it ever has */
  top: number;
  w: number;
  h: number;
  /** how many columns it takes: 1, or 2 for the widest works */
  span: number;
  /** true when the work was drawn to the band rather than to its column */
  fitted: boolean;
}

/**
 * Hang every work, shortest column first, on plates the height of the band.
 *
 * Three rules. A work wider than `gallerySpanAspect` takes two columns, because
 * at one column the widest painting in the inventory draws 168px tall against a
 * 38px plaque and stops being a painting. A work taller than the band is drawn
 * to the band and keeps its ratio, so it comes in narrower than its column with
 * air either side — the alternative is a plate you cannot see all of, and this
 * gallery does not cut paintings. And every work lands on the shortest run of
 * adjacent columns THAT STILL HAS ROOM, which is what keeps the columns level
 * without anybody ordering them by hand; when no run has room the plate is
 * finished and the next one starts.
 *
 * The order of the collection is never changed to improve the packing. A work
 * goes where the order puts it, and a plate ends where the order runs it out of
 * room, so the last plate is short in the way the end of a wall is short.
 *
 * Pure: same data in, same layout out, no DOM and no measurement.
 */
function layOut(works: readonly PaintingRecord[]): { items: Placed[]; plates: number } {
  let tops = new Array<number>(PAGE2.galleryCols).fill(0);
  const items: Placed[] = [];
  let plate = 0;

  for (const work of works) {
    const span = work.width / work.height >= PAGE2.gallerySpanAspect ? 2 : 1;
    const full = COL_W * span + PAGE2.galleryGap * (span - 1);
    let w = full;
    let h = Math.round((full * work.height) / work.width);
    const fitted = h > PLATE_H;
    if (fitted) {
      h = PLATE_H;
      w = Math.round((PLATE_H * work.width) / work.height);
    }

    // the leftmost run of `span` columns that fits and whose deepest point is
    // highest up
    let col = -1;
    let top = Infinity;
    for (let c = 0; c + span <= PAGE2.galleryCols; c++) {
      const t = Math.max(...tops.slice(c, c + span));
      if (t + h <= PLATE_H + 0.01 && t < top - 0.01) {
        top = t;
        col = c;
      }
    }
    if (col < 0) {
      plate += 1;
      tops = new Array<number>(PAGE2.galleryCols).fill(0);
      col = 0;
      top = 0;
    }

    items.push({
      work,
      plate,
      span,
      w,
      h,
      top,
      fitted,
      // centered in its run, which only matters for a work drawn to the band
      left: col * (COL_W + PAGE2.galleryGap) + (full - w) / 2,
    });
    for (let c = col; c < col + span; c++) tops[c] = top + h + PAGE2.galleryGap;
  }

  return { items, plates: plate + 1 };
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
        color: COLOR.paper,
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
      'data-pgwork': p.plate,
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
        'box-shadow': `0 0 0 1px ${RULE.onPaperMajor}`,
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
  items: Placed[];
  works: HTMLElement[];
  ticks: HTMLElement[];
  plates: number;
}

/**
 * The plate indicator.
 *
 * The rail used to carry a proportional thumb, which is a scrollbar, and this
 * screen no longer scrolls. It carries one tick per plate now: the wall has a
 * known number of plates and you are on one of them, which is the whole truth
 * about the position and is a smaller claim than a thumb was making.
 */
const TICK_GAP = 4;

function railTicks(plates: number): { rail: HTMLElement; ticks: HTMLElement[] } {
  const h = (PAGE2.gallery.h - TICK_GAP * (plates - 1)) / plates;
  const ticks = Array.from({ length: plates }, (_, i) =>
    el('span', {
      style: css({
        position: 'absolute',
        left: 0,
        width: '100%',
        top: i * (h + TICK_GAP),
        height: h,
        background: RULE.onPaperMinor,
        transition: 'background 120ms steps(3,end)',
      }),
    }),
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
        width: PAGE2.railW,
        'pointer-events': 'none',
      }),
    },
    ...ticks,
  );
  return { rail, ticks };
}

function gallery(): Gallery {
  const { items, plates } = layOut(PAINTINGS);
  const works = items.map((p, i) =>
    // only the first plate gets the arrival dither, staggered the way the four
    // frames were; the rest are simply there when you reach them
    workNode(p, p.plate === 0 ? 140 + i * 70 : null),
  );

  const sheet = el(
    'div',
    { style: css({ position: 'relative', width: INNER_W, height: PAGE2.gallery.h }) },
    ...works,
  );

  /*
    An input surface, not a scroll container. `overflow: hidden` because there
    is nothing to scroll — every work sits at its own plate-local top and stays
    there — and `touch-action: none` because `reorganize.ts` consumes the
    gesture itself and the browser must not also try to pan.

    It keeps `tabindex` and the scrollable region role: to a keyboard or a
    screen reader this is still a region you move through with the arrows, and
    `reorganize.ts` binds those keys because there is no native scroller left to
    provide them.
  */
  const region = el(
    'div',
    {
      'data-pgscroll': true,
      tabindex: 0,
      role: 'region',
      'aria-label': `The paintings, ${PAINTINGS.length} works on ${plates} plates, scrollable`,
      style: css({
        position: 'absolute',
        inset: '0',
        overflow: 'hidden',
        'padding-right': RAIL_PAD,
        'touch-action': 'none',
        'overscroll-behavior': 'contain',
      }),
    },
    sheet,
  );

  const { rail, ticks } = railTicks(plates);

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

  return { node, region, items, works, ticks, plates };
}

/* ------------------------------------------------------------- the plates */

/**
 * The dither cell.
 *
 * The page's own veil canvas is 240 × 135 stretched over the 1920 × 1080 stage,
 * so one of its pixels is exactly 8 design px anchored at the stage origin.
 * Dissolving on that same grid is what makes a work look like it is going INTO
 * the field rather than carrying its own noise with it — the same reason 2b's
 * dissolve is anchored to the lattice.
 */
const DITHER_CELL = 8;

function wireGallery(g: Gallery): void {
  const stageX = PAGE2.gallery.x;
  const stageY = PAGE2.gallery.y;

  /** Show one plate. Nothing moves: a work only ever appears or goes away. */
  const showPlate = (i: number): void => {
    for (const [k, p] of g.items.entries()) {
      const w = g.works[k];
      if (!w) continue;
      /*
        `visibility` rather than `display` so nothing reflows, and because a
        hidden work must also leave the tab order and stop being hit-testable,
        which `opacity: 0` does neither of.

        And `visibility` ALONE. The first plate's works carry the arrival dither
        and start at `opacity: 0` with the intro owning when that lifts, so a
        second owner writing opacity here has no way to tell "hidden by me" from
        "not arrived yet" — hide and re-show one and it would come back
        invisible, or come back early and skip its entrance.
      */
      w.style.visibility = p.plate === i ? '' : 'hidden';
    }
    for (const [k, t] of g.ticks.entries()) {
      t.style.background = k === i ? COLOR.ink : RULE.onPaperMinor;
    }
  };

  /**
   * The wave, in the direction of travel: going down, the top of the plate goes
   * first; going up, the bottom does. Ranked by row so works that hang level
   * dissolve together.
   */
  const items = (dir: number): { el: HTMLElement; rank: number; x: number; y: number }[] => {
    const live = g.items
      .map((p, k) => ({ p, el: g.works[k] }))
      .filter((it) => it.el && it.el.style.visibility !== 'hidden');
    const rows = [...new Set(live.map((it) => it.p.top))].sort((a, b) =>
      dir >= 0 ? a - b : b - a,
    );
    return live.map((it) => ({
      el: it.el,
      rank: Math.max(0, rows.indexOf(it.p.top)),
      x: stageX + it.p.left,
      y: stageY + it.p.top,
    }));
  };

  const stage = (): HTMLElement | null => g.node.closest('[data-stage]');
  const reduced = (): boolean => {
    const st = stage();
    if (st) return state(st).reduced;
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  const reorg = reorganize({
    region: g.region,
    positions: () => g.plates,
    cell: DITHER_CELL,
    reduced,
    commit: (i) => showPlate(i),
    items,
  });

  /*
    Opening sends the gallery back to the first plate, so a visit starts at the
    front of the wall rather than wherever the last one stopped reading. It is
    hooked to the hidden-to-shown EDGE and not to hiding: `display: none` is
    written at the END of the close animation, so closing and re-opening inside
    that window never hid the page at all and the old plate would survive. And
    it is an edge rather than every write because `transitions.ts` also writes
    `clip-path` to this same element while the page is up, and resetting on
    those would yank the gallery out from under anyone looking at it.
  */
  const root = (): HTMLElement | null => g.node.closest('[data-page]');
  const shown = (): boolean => {
    const r = root();
    return !!r && r.style.display !== 'none';
  };
  let was = false;
  const life = (): void => {
    const now = shown();
    if (now && !was) {
      reorg.reset(0);
      g.region.scrollTop = 0;
      showPlate(0);
    }
    was = now;
  };
  queueMicrotask(() => {
    const r = root();
    if (!r) return;
    new MutationObserver(life).observe(r, { attributes: true, attributeFilter: ['style'] });
    // The first plate has to be up before the arrival dither runs, and `life`
    // only fires on the edge — which for the very first open has not happened
    // yet at the moment the page is built.
    showPlate(0);
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
        'border-bottom': `1px solid ${RULE.onPaperMajor}`,
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
        'border-top': `1px solid ${RULE.onPaperMajor}`,
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
      border: `${PAGE2.frameWidth}px solid ${COLOR.drape}`,
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
        'font-family': FONT.display,
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
        background: COLOR.paper,
        color: COLOR.ink,
        overflow: 'hidden',
      }),
    },
    frost,
    pframe,
    title,
    body,
  );

  wireGallery(g);

  return root;
}
