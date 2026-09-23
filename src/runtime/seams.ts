/**
 * Seams (README §7.4), from Chickpea's hero and improved on it.
 *
 * Every word in the page's prose becomes a unit, an inline-block span with the
 * whitespace kept as real text nodes, so wrapping is unchanged. Every button
 * is a unit too. Units are grouped into visual lines, and a seam is the gap
 * between two neighbors on a line.
 *
 * TWO STATES, the same on every page:
 *
 *   quick   the default. The seam nearest the cursor parts by up to 8px.
 *   full    the cursor holds on one seam for 700ms. The seam opens to 24px,
 *           the skeleton appears, and the full state then follows the cursor
 *           from seam to seam until it is no longer over any text.
 *
 * A hovered button is different: it claims 14px either side and shows its
 * measurements at once. It never starts the 700ms timer and never ends a full
 * state that is already running.
 *
 * Over Chickpea: dt-based springs (the same feel at 60Hz and 120Hz),
 * hysteresis (two near-equal seams never flicker), a relax pass that
 * guarantees no overlap, buttons as units with `translate` and `transform`
 * owned separately, and reduced motion keeps the measurements and drops only
 * the movement.
 *
 * Owns `translate` on units and buttons. The magnet owns `transform`.
 */

import { PULL, SEAM_X, reducedMotion } from './offsets.ts';
import { drawArrows, drawLive, makeLayers, type Arrow } from './skeleton.ts';

/** Seam search radius, and how much the vertical distance counts against it. */
const R = 150;
const Y_WEIGHT = 1.6;
/** Keep the current seam unless another is at least this much closer. */
const HYSTERESIS = 10;
const D_QUICK = 8;
const D_FULL = 24;
const D_BOX = 14;
/** Each step away from the seam moves 40% less. */
const FALLOFF = 0.4;
const MIN_GAP = 3;
const DWELL = 700;
/** Horizontal slack either side of a line box that still counts as "over text". */
const EDGE = 6;
const K = 420;
const DAMP = 2 * Math.sqrt(K) * 0.82;

export interface Unit {
  el: HTMLElement;
  /** index of the prose block this unit belongs to */
  bi: number;
  fs: number;
  lh: number;
  box: boolean;
  /** resting box, in the root's coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  /** spring state */
  cur: number;
  v: number;
  tgt: number;
  line: Unit[];
  li: number;
}

export interface Seam {
  a: Unit;
  b: Unit;
  line: Unit[];
  i: number;
  cx: number;
  cy: number;
}

interface LineBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface SeamState {
  root: HTMLElement;
  units: Unit[];
  seams: Seam[];
  lines: LineBox[];
  raf: number;
  last: number;
  active: Seam | null;
  box: Unit | null;
  hoverBox: Unit | null;
  /** 0..1, how open the active seam is; drives the skeleton's opacity */
  str: number;
  /** pointer, in the root's coordinates, and in the viewport's */
  px?: number;
  py?: number;
  cx?: number;
  cy?: number;
  inside: boolean;
  expanded: boolean;
  skelOn: boolean;
  key: Seam | Unit | null;
  skelT: number;
  live: HTMLDivElement;
  arrows: [Arrow, Arrow];
}

const btnOf = (t: EventTarget | null): HTMLElement | null =>
  t instanceof Element ? t.closest<HTMLElement>('[data-btn]') : null;

/** Split every prose element's words into units. Text inside buttons stays whole. */
function split(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-seams]').forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      if (!n.parentElement?.closest('[data-btn]')) texts.push(n);
    }
    for (const n of texts) {
      const frag = document.createDocumentFragment();
      for (const part of (n.nodeValue ?? '').split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          continue;
        }
        const s = document.createElement('span');
        s.textContent = part;
        s.setAttribute('data-unit', '');
        frag.appendChild(s);
      }
      n.parentNode?.replaceChild(frag, n);
    }
  });
}

function measure(S: SeamState): void {
  const R0 = S.root.getBoundingClientRect();
  S.units = [];
  S.root.querySelectorAll<HTMLElement>('[data-seams]').forEach((el, bi) => {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 16;
    const lh = parseFloat(cs.lineHeight) || fs * 1.2;
    el.querySelectorAll<HTMLElement>('[data-unit], [data-btn]').forEach((u) => {
      if (u.hasAttribute('data-unit') && u.closest('[data-btn]')) return;
      const cur = SEAM_X.get(u) ?? 0;
      const [tx, ty] = PULL.get(u) ?? [0, 0];
      const r = u.getBoundingClientRect();
      if (!r.width) return;
      S.units.push({
        el: u,
        bi,
        fs,
        lh,
        box: u.hasAttribute('data-btn'),
        x: r.left - R0.left - cur - tx,
        y: r.top - R0.top - ty,
        w: r.width,
        h: r.height,
        cur,
        v: 0,
        tgt: 0,
        line: [],
        li: 0,
      });
    });
  });

  S.seams = [];
  S.lines = [];
  let line: Unit[] = [];
  const flush = () => {
    if (!line.length) return;
    const L = line;
    L.forEach((u, i) => {
      u.line = L;
      u.li = i;
    });
    S.lines.push({
      x0: L[0].x,
      x1: L[L.length - 1].x + L[L.length - 1].w,
      y0: Math.min(...L.map((u) => u.y)),
      y1: Math.max(...L.map((u) => u.y + u.h)),
    });
    for (let i = 0; i < L.length - 1; i++) {
      const a = L[i];
      const b = L[i + 1];
      S.seams.push({ a, b, line: L, i, cx: (a.x + a.w + b.x) / 2, cy: (a.y + a.h / 2 + b.y + b.h / 2) / 2 });
    }
    line = [];
  };
  for (const u of S.units) {
    const prev = line[line.length - 1];
    if (prev && (u.bi !== prev.bi || Math.abs(u.y + u.h / 2 - (prev.y + prev.h / 2)) > u.fs * 0.6)) flush();
    line.push(u);
  }
  flush();
}

/** Push neighbors apart until no gap on the active line drops below min(3px, its resting gap). */
function relax(S: SeamState): void {
  const line = S.box ? S.box.line : S.active ? S.active.line : null;
  if (!line) return;
  const lastL = S.box ? S.box.li : S.active!.i;
  const firstR = S.box ? S.box.li : S.active!.i + 1;
  const minGap = (a: Unit, b: Unit) => Math.min(MIN_GAP, b.x - (a.x + a.w));
  for (let i = lastL; i > 0; i--) {
    const a = line[i - 1];
    const b = line[i];
    const over = a.x + a.w + a.tgt + minGap(a, b) - (b.x + b.tgt);
    if (over > 0) a.tgt -= over;
  }
  for (let i = firstR; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const over = a.x + a.w + a.tgt + minGap(a, b) - (b.x + b.tgt);
    if (over > 0) b.tgt += over;
  }
}

function retarget(S: SeamState): void {
  const motion = reducedMotion() ? 0 : 1;
  const D = S.expanded ? D_FULL : D_QUICK;
  for (const u of S.units) u.tgt = 0;
  S.box = null;

  const boxU = S.hoverBox;
  if (boxU) {
    S.active = null;
    S.box = boxU;
    S.str = 1;
    boxU.line.forEach((u, idx) => {
      if (idx === boxU.li) return;
      const side = idx < boxU.li ? -1 : 1;
      const dist = side < 0 ? boxU.li - 1 - idx : idx - boxU.li - 1;
      u.tgt = side * D_BOX * Math.max(0, 1 - dist * FALLOFF) * motion;
    });
  } else if (S.px !== undefined && S.py !== undefined) {
    const px = S.px;
    const py = S.py;
    const dOf = (s: Seam) => Math.hypot(s.cx - px, (s.cy - py) * Y_WEIGHT);
    let best: Seam | null = null;
    let bd = R;
    for (const s of S.seams) {
      const d = dOf(s);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    if (S.active && best && best !== S.active) {
      const cd = dOf(S.active);
      if (cd < R && cd - bd < HYSTERESIS) {
        best = S.active;
        bd = cd;
      }
    }
    S.active = best;
    S.str = 0;
    if (best) {
      const t = 1 - bd / R;
      const ease = t * t * (3 - 2 * t);
      const delta = D * ease * motion;
      const b = best;
      b.line.forEach((u, idx) => {
        const side = idx <= b.i ? -1 : 1;
        const dist = side < 0 ? b.i - idx : idx - (b.i + 1);
        u.tgt = side * (delta / 2) * Math.max(0, 1 - dist * FALLOFF);
      });
      S.str = ease;
    }
  } else {
    S.active = null;
    S.str = 0;
  }
  relax(S);
}

/** The 700ms hold into the full state, and the way back out of it. */
function dwell(S: SeamState, over: boolean): void {
  const key = S.box ?? S.active ?? null;
  if (S.expanded) {
    if (over && key) return;
    S.expanded = false;
    S.skelOn = false;
    S.key = null;
    clearTimeout(S.skelT);
    retarget(S);
    return;
  }
  if (!over || !key) {
    S.key = null;
    clearTimeout(S.skelT);
    return;
  }
  // A hovered button is already measured; it never starts the text timer.
  if (S.box) {
    S.key = S.box;
    clearTimeout(S.skelT);
    return;
  }
  if (key === S.key) return;
  S.key = key;
  clearTimeout(S.skelT);
  S.skelT = window.setTimeout(() => {
    if (S.key !== key || S.expanded) return;
    S.expanded = true;
    S.skelOn = true;
    retarget(S);
    loop(S);
  }, DWELL);
}

function loop(S: SeamState): void {
  if (S.raf) return;
  S.last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(1 / 30, Math.max(0.001, (now - S.last) / 1000));
    S.last = now;
    let moving = false;
    for (const u of S.units) {
      const d = u.tgt - u.cur;
      u.v += (K * d - DAMP * u.v) * dt;
      u.cur += u.v * dt;
      if (Math.abs(d) < 0.04 && Math.abs(u.v) < 0.5) {
        u.cur = u.tgt;
        u.v = 0;
      } else moving = true;
      if (u.cur) SEAM_X.set(u.el, u.cur);
      else SEAM_X.delete(u.el);
      u.el.style.translate = Math.abs(u.cur) > 0.01 ? `${u.cur.toFixed(2)}px 0` : '';
    }
    drawArrows(S);
    drawLive(S);
    // Keep ticking while a box is hovered: its magnetic pull moves it outside
    // these springs, and its arrows have to follow.
    S.raf = moving || S.box ? requestAnimationFrame(step) : 0;
  };
  S.raf = requestAnimationFrame(step);
}

/** Feed one pointer position (viewport coordinates) through the model. */
function track(S: SeamState, onBtn: HTMLElement | null): void {
  if (S.cx === undefined || S.cy === undefined) return;
  if (!S.units.length) measure(S);
  const R0 = S.root.getBoundingClientRect();
  S.px = S.cx - R0.left;
  S.py = S.cy - R0.top;
  S.hoverBox = onBtn && S.root.contains(onBtn) ? (S.units.find((u) => u.el === onBtn) ?? null) : null;
  retarget(S);
  const px = S.px;
  const py = S.py;
  const over =
    !!S.hoverBox || S.lines.some((l) => px >= l.x0 - EDGE && px <= l.x1 + EDGE && py >= l.y0 && py <= l.y1);
  dwell(S, over);
  loop(S);
}

/** Drop the model and every offset; the next pointer event measures afresh. */
function relayout(S: SeamState): void {
  cancelAnimationFrame(S.raf);
  S.raf = 0;
  clearTimeout(S.skelT);
  for (const u of S.units) {
    u.el.style.translate = '';
    SEAM_X.delete(u.el);
  }
  S.units = [];
  S.seams = [];
  S.lines = [];
  S.active = null;
  S.box = null;
  S.hoverBox = null;
  S.expanded = false;
  S.skelOn = false;
  S.key = null;
  S.str = 0;
  S.live.style.opacity = '0';
  S.arrows.forEach((A) => (A.el.style.opacity = '0'));
}

const STATES: SeamState[] = [];

/** For whoever changed the layout on purpose (the width reservation, on resize). */
export function relayoutAll(): void {
  STATES.forEach(relayout);
}

export function initSeams(root: HTMLElement): void {
  if (root.hasAttribute('data-seams-live')) return;
  root.setAttribute('data-seams-live', '');
  split(root);

  const { live, arrows } = makeLayers(root);
  const S: SeamState = {
    root,
    units: [],
    seams: [],
    lines: [],
    raf: 0,
    last: 0,
    active: null,
    box: null,
    hoverBox: null,
    str: 0,
    inside: false,
    expanded: false,
    skelOn: false,
    key: null,
    skelT: 0,
    live,
    arrows,
  };
  STATES.push(S);

  root.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    S.inside = true;
    if (!S.active && !S.box) measure(S);
  });

  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    S.inside = true;
    S.cx = e.clientX;
    S.cy = e.clientY;
    track(S, btnOf(e.target));
  });

  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    S.inside = false;
    // Forget the pointer first, so collapsing the full state cannot re-pick
    // the seam it was just on.
    S.px = S.py = S.cx = S.cy = undefined;
    for (const u of S.units) u.tgt = 0;
    S.active = null;
    S.box = null;
    S.hoverBox = null;
    S.str = 0;
    dwell(S, false);
    loop(S);
  });

  // The page scrolls under a still cursor, so the text under it changes with
  // no pointer event at all. Re-feed the last position once per frame.
  let scrollQueued = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!S.inside || scrollQueued || S.cx === undefined || S.cy === undefined) return;
      scrollQueued = true;
      requestAnimationFrame(() => {
        scrollQueued = false;
        if (!S.inside || S.cx === undefined || S.cy === undefined) return;
        track(S, btnOf(document.elementFromPoint(S.cx, S.cy)));
      });
    },
    { passive: true },
  );

  // Anything that moves the text (a resize, a late font) makes the model
  // stale. Drop it; the next pointer event re-measures.
  let settled = false;
  new ResizeObserver(() => {
    if (settled) relayout(S);
    settled = true;
  }).observe(root);
  document.fonts?.addEventListener?.('loadingdone', () => relayout(S));

  // A page restored from the back/forward cache comes back mid-hover: a box
  // still claiming space, the skeleton up, and a frame loop that never stops
  // because it keeps ticking while a box is hovered. Start clean.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    S.inside = false;
    S.px = S.py = S.cx = S.cy = undefined;
    relayout(S);
  });
}
