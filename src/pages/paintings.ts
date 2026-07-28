/**
 * Screen 3 · Page 02 — Paintings.
 *
 * Four hung frames at their handoff geometry (HUNG in `src/data/paintings.ts`)
 * over a continuously drifting organic dither field. The opaque #150B20
 * caption plaque exists so titles stay legible over that moving field — it is
 * not decoration.
 *
 * The wall list carries the whole inventory (20 works, not the design's 11),
 * so its rows are 26px instead of 40px — the one adaptation on this page.
 * Every frame and every wall row is a real link to the ArtStation record.
 *
 * The four frames rotate. HUNG is the *starting* hang, not the inventory: each
 * frame swaps to another work on its own offset so no two ever change together,
 * dissolving through the site's own dither rather than a plain opacity fade.
 * See `src/runtime/rotate.ts`; the aspect pools and the atomic commit are below.
 *
 * The two wide frames turn every 7s and the two tall ones every 30s. That is
 * not a taste decision: the tall pair draws on three portrait-format paintings
 * and the wide pair on seventeen, so a shared tempo would bring a work back to
 * the tall frames every 10.5s. Each pool's period is derived from MIN_REPEAT
 * instead — see `periodFor` below.
 */

import { asset, css, el, letters } from '../dom.ts';
import { COLOR, RULE } from '../design/tokens.ts';
import { PAGE2 } from '../design/layout.ts';
import {
  HUNG,
  PAINTINGS,
  PAINTINGS_COUNT_LABEL,
  PAINTINGS_META,
  byslug,
} from '../data/paintings.ts';
import type { PaintingRecord } from '../data/types.ts';
import { createRotor } from '../runtime/rotate.ts';
import { state } from '../runtime/state.ts';

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

/* ----------------------------------------------------------- aspect pools */

/**
 * Which works may hang in which frames.
 *
 * The four frames are 400×500, 360×240, 360×230 and 400×500 — two portrait
 * (0.80) and two landscape (1.50 / 1.565). The images are `object-fit: cover`,
 * so a work dropped into the wrong orientation is not scaled, it is *cropped*:
 * `let's take a walk` is 1904×597, and a 400×500 frame would show 19% of its
 * width. That is not a smaller version of the painting, it is a different one.
 *
 * So the inventory is partitioned by orientation and a work only ever rotates
 * into a frame it suits. Splitting at 1.0 and picking the nearest frame
 * aspect in log space (crossover √(0.80 × 1.50) = 1.095) give the same
 * partition on this inventory — nothing sits between 0.852 and 1.727 — so the
 * plain, readable test is the one used.
 */
type Orient = 'portrait' | 'landscape';

const orientOf = (w: number, h: number): Orient => (w < h ? 'portrait' : 'landscape');

const workOrient = (p: PaintingRecord): Orient => orientOf(p.width, p.height);

/** One orientation's inventory plus where in it the next turn is served from. */
interface Pool {
  /** which orientation this pool serves — also its key when counting frames */
  kind: Orient;
  works: PaintingRecord[];
  /** index of the work handed out most recently */
  at: number;
  /** slugs from this pool currently on the wall — never served twice at once */
  shown: Set<string>;
}

function makePool(kind: Orient): Pool {
  return { kind, works: PAINTINGS.filter((p) => workOrient(p) === kind), at: -1, shown: new Set() };
}

/**
 * The next work this pool will serve: the inventory in order, skipping
 * anything already hanging. Returns null when the pool is no deeper than the
 * frames drawing on it, which would mean there is nothing new to show.
 */
function nextWork(pool: Pool): PaintingRecord | null {
  for (let i = 0; i < pool.works.length; i++) {
    pool.at = (pool.at + 1) % pool.works.length;
    const w = pool.works[pool.at];
    if (!pool.shown.has(w.slug)) {
      // Reserved the moment it is chosen, not when it lands: two frames drawing
      // on the same pool can be preparing at once, and the portrait pool is
      // only one work deeper than the frames it feeds.
      pool.shown.add(w.slug);
      return w;
    }
  }
  return null;
}

/* ------------------------------------------------------------- hung frames */

/** A built frame plus the handles its rotation writes through. */
interface Frame {
  node: HTMLAnchorElement;
  img: HTMLImageElement;
  name: HTMLElement;
  year: HTMLElement;
  pool: Pool;
  /** the work currently hanging in it */
  slug: string;
}

const frameLabel = (p: PaintingRecord): string =>
  `${p.title}${p.year ? `, ${p.year}` : ''}, view on ArtStation, opens in a new tab`;

function frame(index: number, pools: Record<Orient, Pool>): Frame {
  const g = HUNG[index];
  const p = byslug(g.slug);

  // The lowercased name, matching the wall list and the studio's voice —
  // the prototype's plaque read "crestdown", not "Crestdown".
  const name = el('span', {}, p.wall);
  const year = el('span', { style: css({ opacity: '.62' }) }, p.year ?? '');

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
    name,
    year,
  );

  const img = el('img', {
    src: asset(p.image),
    alt: p.alt,
    loading: 'lazy',
    decoding: 'async',
    width: g.w,
    height: g.h,
    style: css({
      position: 'absolute',
      inset: '0',
      display: 'block',
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
    }),
  });

  const node = el(
    'a',
    {
      href: p.href,
      target: '_blank',
      rel: 'noopener noreferrer',
      // The band hover would cover the painting; the plaque carries the state.
      'data-nohl': true,
      // The rotation's pause target: pointer over any frame, or focus in one.
      'data-rotslot': index,
      'aria-label': frameLabel(p),
      'data-dfx': 10,
      'data-in-dur': 380,
      'data-in-delay': 140 + index * 70,
      style: css({
        ...LINK,
        opacity: '0',
        position: 'absolute',
        display: 'block',
        left: g.x,
        top: g.y,
        width: g.w,
        height: g.h,
        'box-shadow': `0 0 0 1px ${RULE.onLavenderMajor}`,
      }),
    },
    img,
    plaque,
    ...corners(),
  );

  const pool = pools[orientOf(g.w, g.h)];
  pool.shown.add(p.slug);
  // Serve the rotation from just past the works already hanging, so the first
  // swap continues the inventory instead of repeating the opening hang.
  pool.at = Math.max(
    pool.at,
    pool.works.findIndex((w) => w.slug === p.slug),
  );

  return { node, img, name, year, pool, slug: p.slug };
}

/* ----------------------------------------------------------------- the wall */

/**
 * Column widths for the two right-hand cells. `on view` at 11.5px/.22em and
 * `selected` at 13px/.13em are the widest strings each has to hold.
 */
const MARK_W = 62;
const STATE_W = 66;

/** The whole inventory, plus the handle that marks what is hanging right now. */
interface Wall {
  node: HTMLElement;
  /** Mark or unmark one row. Only the two rows a swap touched are written. */
  mark(slug: string, on: boolean): void;
}

const rowLabel = (p: PaintingRecord, onWall: boolean): string =>
  `${p.title}${onWall ? ', on the wall now' : ''}, view on ArtStation, opens in a new tab`;

function wall(hung: ReadonlySet<string>): Wall {
  const header = el(
    'div',
    {
      style: css({
        display: 'flex',
        'align-items': 'center',
        gap: 16,
        height: PAGE2.wallHeaderH,
        'border-bottom': `1px solid ${RULE.onLavenderMajor}`,
        'font-size': 11.5,
        'letter-spacing': '.22em',
        opacity: '.72',
        // matches the rows, so the two right-hand columns line up with them
        'padding-right': 12,
      }),
    },
    el('span', { style: css({ flex: '1' }) }, 'the wall'),
    el('span', { style: css({ width: MARK_W, flex: 'none' }) }, 'on view'),
    el('span', { style: css({ width: STATE_W, flex: 'none' }) }, 'state'),
  );

  const squares = new Map<string, HTMLElement>();
  const links = new Map<string, HTMLElement>();

  const rows = PAINTINGS.map((p) => {
    const onWall = hung.has(p.slug);

    /*
      `state` stays the devkit's set — hung / selected / archive — because that
      is a fact about the collection, not about this minute. Which four are
      actually up changes every few seconds, so it gets a column of its own:
      a square in currentColor, so it inverts with the row on hover instead of
      vanishing into the rust band.
    */
    const square = el('span', {
      style: css({
        width: 8,
        height: 8,
        display: 'block',
        background: 'currentColor',
        visibility: onWall ? 'visible' : 'hidden',
      }),
    });

    const row = el(
      'a',
      {
        href: p.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': rowLabel(p, onWall),
        class: 'ps-hov-invert',
        style: css({
          ...LINK,
          display: 'flex',
          'align-items': 'center',
          gap: 16,
          height: PAGE2.wallRowH,
          'border-bottom': `1px solid ${RULE.onLavenderMinor}`,
          'font-size': 13,
          'letter-spacing': '.13em',
          transition: 'background 150ms linear,color 150ms linear',
          'padding-right': 12,
        }),
      },
      el('span', {
        'aria-hidden': 'true',
        style: css({
          width: PAGE2.wallChip,
          height: PAGE2.wallChip,
          flex: 'none',
          background: p.chip,
        }),
      }),
      el(
        'span',
        { style: css({ flex: '1', overflow: 'hidden', 'white-space': 'nowrap' }) },
        p.wall,
      ),
      el(
        'span',
        {
          'aria-hidden': 'true',
          style: css({ width: MARK_W, flex: 'none', display: 'flex', 'align-items': 'center' }),
        },
        square,
      ),
      el('span', { style: css({ width: STATE_W, flex: 'none', opacity: '.66' }) }, p.state),
    );

    squares.set(p.slug, square);
    links.set(p.slug, row);
    return row;
  });

  const node = el(
    'div',
    {
      'data-intro': 'fade',
      'data-in-delay': 300,
      'data-in-dur': 380,
      style: css({
        opacity: '0',
        position: 'absolute',
        left: PAGE2.wall.x,
        top: PAGE2.wall.y,
        width: PAGE2.wall.w,
        /*
          The design floats the wall list straight on the drifting field. That
          worked for eleven rows, which sat in a calm band; twenty rows reach
          into the busy part and 13px names stop being readable over it. This
          is the page's own answer to its own problem — the caption plaques
          exist for exactly this reason — applied as a peer of the work frames:
          the page's own lavender, and the same 1px rust hairline they carry.
          No radius, no blur, no new color.
        */
        background: COLOR.lavender,
        'box-shadow': `0 0 0 1px ${RULE.onLavenderMajor}`,
        padding: '0 12px 10px',
      }),
    },
    header,
    ...rows,
  );

  return {
    node,
    mark(slug, on) {
      const square = squares.get(slug);
      if (square) square.style.visibility = on ? 'visible' : 'hidden';
      const row = links.get(slug);
      const p = PAINTINGS.find((w) => w.slug === slug);
      if (row && p) row.setAttribute('aria-label', rowLabel(p, on));
    },
  };
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

/* ---------------------------------------------------------------- rotation */

/**
 * One frame's turn: ~7s, and the four offsets a quarter of that apart, so no
 * two frames ever change together.
 */
const PERIOD = 7000;

/**
 * No work may come back to the wall inside this window.
 *
 * The pools are very different depths — 17 landscape works against 3 portrait
 * ones — and they feed two frames each. A pool of W works feeding S frames that
 * each turn every P ms serves a turn every P/S ms, so a given work returns
 * every `W × P / S` ms. At a flat 7s that is 59.5s for the landscape frames and
 * **10.5s** for the tall pair, which is short enough to read as a loop rather
 * than as a wall.
 *
 * So the period is derived per pool instead of shared: each pool turns slowly
 * enough that nothing returns inside MIN_REPEAT, and never faster than PERIOD.
 * The tall frames end up markedly slower than the wide ones, which is the
 * honest consequence of the inventory — three portrait paintings cannot fill
 * two tall frames at speed without repeating. Add portrait-format works and
 * this speeds itself back up with no code change.
 */
const MIN_REPEAT = 45000;

/** ms between one frame's swaps, for a pool of `works` feeding `slots` frames. */
const periodFor = (works: number, slots: number): number =>
  works <= 0 ? PERIOD : Math.max(PERIOD, Math.round((MIN_REPEAT * slots) / works));

/**
 * The blur radius the frames' own opening reveal uses (`data-dfx="10"`). A
 * swap that dissolved harder than the arrival would read as a different move.
 */
const FRAME_MB = 10;

/**
 * Pick the next work for `f`, decode it, and return the commit that installs
 * it. The commit is deliberately one indivisible block: picture, plaque name,
 * plaque year, href and accessible name all move together, because a plaque
 * reading `shepherd` over a picture of `nix` — or a link sending someone to
 * the wrong ArtStation record — is worse than no rotation at all.
 */
async function prepareSwap(f: Frame, list: Wall): Promise<(() => void) | null> {
  const next = nextWork(f.pool);
  if (!next || next.slug === f.slug) return null;

  const src = asset(next.image);
  const pre = new Image();
  pre.src = src;
  try {
    // Decode before anything dissolves, so the frame never resolves out of the
    // noise onto a half-painted image.
    await pre.decode();
  } catch {
    /* decode is a courtesy — a failed one still swaps, the <img> retries */
  }

  const gone = f.slug;
  return () => {
    f.pool.shown.delete(gone);
    f.slug = next.slug;

    f.img.src = src;
    f.img.alt = next.alt;
    f.name.textContent = next.wall;
    f.year.textContent = next.year ?? '';
    f.node.href = next.href;
    f.node.setAttribute('aria-label', frameLabel(next));

    list.mark(gone, false);
    list.mark(next.slug, true);
  };
}

/**
 * Start the rotation when the page is up, stop it when it is not, and hold it
 * while anyone is reading — pointer over any frame, or keyboard focus in one.
 *
 * prefers-reduced-motion gets no rotation at all: the opening four stay put.
 * Not a slower cycle, none.
 */
function wireRotation(
  root: HTMLElement,
  frames: Frame[],
  pools: Record<Orient, Pool>,
  list: Wall,
): void {
  // How many frames draw on each pool — the divisor in the repeat interval.
  const slotsOn = frames.reduce<Record<string, number>>((n, f) => {
    n[f.pool.kind] = (n[f.pool.kind] ?? 0) + 1;
    return n;
  }, {});

  const rotor = createRotor({
    period: PERIOD,
    slots: frames.map((f, i) => ({
      el: f.node,
      // Offsets stay on the base period so the four frames keep their even
      // stagger even where their own periods differ.
      offset: Math.round((PERIOD / frames.length) * i),
      period: periodFor(f.pool.works.length, slotsOn[f.pool.kind] ?? 1),
      mb: FRAME_MB,
      prepare: () => prepareSwap(f, list),
    })),
  });

  /* ---- hold while a caption is being read ---- */

  const pointer = new Set<Element>();
  const focused = new Set<Element>();

  const hold = (): void => {
    if (pointer.size) rotor.pause('pointer');
    else rotor.resume('pointer');
    if (focused.size) rotor.pause('focus');
    else rotor.resume('focus');
  };

  /** The frame an event landed in, or null. Moves inside one frame are ignored. */
  const slotOf = (target: EventTarget | null, rel: EventTarget | null): Element | null => {
    const slot = target instanceof Element ? target.closest('[data-rotslot]') : null;
    if (!slot) return null;
    return rel instanceof Node && slot.contains(rel) ? null : slot;
  };

  // pointerover/pointerout bubble where pointerenter/leave do not, and the
  // relatedTarget check above turns them back into exact enter/leave.
  root.addEventListener(
    'pointerover',
    (e) => {
      const slot = slotOf(e.target, e.relatedTarget);
      if (!slot) return;
      pointer.add(slot);
      hold();
    },
    { passive: true },
  );
  root.addEventListener(
    'pointerout',
    (e) => {
      const slot = slotOf(e.target, e.relatedTarget);
      if (!slot) return;
      pointer.delete(slot);
      hold();
    },
    { passive: true },
  );
  root.addEventListener('focusin', (e) => {
    const slot = slotOf(e.target, e.relatedTarget);
    if (!slot) return;
    focused.add(slot);
    hold();
  });
  root.addEventListener('focusout', (e) => {
    const slot = slotOf(e.target, e.relatedTarget);
    if (!slot) return;
    focused.delete(slot);
    hold();
  });

  /* ---- run only while the page is up ---- */

  const reduced = (): boolean => {
    const stage = root.closest<HTMLElement>('[data-stage]');
    return stage ? state(stage).reduced : false;
  };

  const life = (): void => {
    if (root.style.display !== 'none' && !reduced()) {
      rotor.start();
      return;
    }
    // Closing: drop the read-holds and re-seat every pool on what is actually
    // hanging, so a work reserved by a swap that never landed is not lost.
    pointer.clear();
    focused.clear();
    rotor.stop();
    for (const pool of Object.values(pools)) pool.shown.clear();
    for (const f of frames) f.pool.shown.add(f.slug);
  };

  // transitions.ts drives the page's visibility with an inline style write and
  // nothing else, exactly as main.ts's a11y mirror relies on.
  new MutationObserver(life).observe(root, { attributes: true, attributeFilter: ['style'] });

  // A reduced-motion change mid-session has to take effect on the open page,
  // not just the next one. Deferred a tick because state.ts listens to the
  // same media query and the two listeners have no guaranteed order.
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      window.setTimeout(life, 0);
    });
  }
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

  /*
    HUNG is the opening hang, not the inventory. Each frame keeps a pool of the
    works whose orientation it suits and cycles through it; `wall()` is handed
    the four that start up so its `on view` column is right from the first
    frame, before any timer has run.
  */
  const pools: Record<Orient, Pool> = {
    portrait: makePool('portrait'),
    landscape: makePool('landscape'),
  };
  const frames = HUNG.map((_g, i) => frame(i, pools));
  const list = wall(new Set(frames.map((f) => f.slug)));

  const body = el(
    'div',
    {
      'data-pbody': true,
      style: css({ position: 'absolute', inset: '0', 'z-index': '2', opacity: '0' }),
    },
    headerBar(),
    meta,
    ...frames.map((f) => f.node),
    list.node,
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

  wireRotation(root, frames, pools, list);

  return root;
}
