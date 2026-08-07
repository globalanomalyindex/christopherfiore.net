/**
 * The in-page button hover treatment.
 *
 * A band stack fills the *whole* button, not just the text: one main light
 * band drawn from SPARK_LIGHTS (56–80% of the height, at a random vertical
 * offset), one or two darker SPARK accents above/below it, a 1.5px inset
 * outline and 13px corner tick marks. Every layer wipes in from its own random
 * direction with a ±7.5px jitter and its own stagger, so the stack assembles
 * glitchily and never reads as a left-to-right sweep.
 *
 * LEGIBILITY CONTRACT: the band the type sits on is always from SPARK_LIGHTS,
 * the ink on it is always COLOR.nearBlack, and the darker SPARK rows are edge
 * accents that never carry type. SPARK_LIGHTS is *derived* by filtering on
 * measured contrast, so a band that could not carry the ink cannot reach here.
 */

import { css, qq } from '../dom.ts';
import { COLOR, SPARK, SPARK_LIGHTS } from '../design/tokens.ts';
import { glitchFont, wrapWord } from './glitch.ts';
import { state } from './state.ts';

/** The only ink allowed on a band. */
const INK = COLOR.nearBlack;
/**
 * What `style.color` serialises to once INK is set, so the per-frame pin can
 * skip the write when nothing has changed. Derived from INK rather than typed
 * out: it was a stale literal from the old palette, so the comparison never
 * matched and the pin wrote to every hovered element on every frame.
 */
const INK_RGB = ((n) => `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`)(
  parseInt(INK.slice(1), 16),
);

/** Corner tick size for a button-sized band. */
const TICK = 13;

/** Wipe-in start clips. Two are partial (62%) so some layers only half-travel. */
const WIPE_IN = [
  'inset(0 100% 0 0)',
  'inset(0 0 0 100%)',
  'inset(100% 0 0 0)',
  'inset(0 0 100% 0)',
  'inset(0 62% 0 0)',
  'inset(0 0 0 62%)',
] as const;

/** Wipe-out end clips. */
const WIPE_OUT = [
  'inset(0 0 0 100%)',
  'inset(0 100% 0 0)',
  'inset(0 0 100% 0)',
  'inset(100% 0 0 0)',
] as const;

const rnd = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

interface HoverRec {
  /** the band stack container, kept across enter/leave cycles */
  box: HTMLElement | null;
  /** every animatable layer inside the box, in paint order */
  parts: HTMLElement[];
  /** bumped on every enter so a stale exit animation can't hide a fresh stack */
  gen: number;
  /** the span the letters live in, pinned to INK alongside the button */
  word: HTMLElement | null;
  /** requestAnimationFrame handle for the ink pin */
  ink: number;
}

const RECS = new WeakMap<HTMLElement, HoverRec>();

function rec(el: HTMLElement): HoverRec {
  let r = RECS.get(el);
  if (!r) {
    r = { box: null, parts: [], gen: 0, word: null, ink: 0 };
    RECS.set(el, r);
  }
  return r;
}

const RM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

/** Reduced motion, read off the stage when one is reachable, else off the query. */
function reduced(el: HTMLElement): boolean {
  const stage = el.closest<HTMLElement>('[data-stage],[data-frame-root]');
  if (stage) return state(stage).reduced;
  return RM ? RM.matches : false;
}

/**
 * Corner crosshair marks: four `sz × sz` boxes hung on the corners at `-sz/2`,
 * each drawn as two `sz/9`-thick bars crossing at its center. Static
 * decoration, authored here — no content ever goes through these nodes.
 */
export function mkTicks(sz: number): HTMLSpanElement[] {
  const o = (sz / 2).toFixed(1);
  const t = Math.max(1, sz / 9).toFixed(1);
  const corners: Record<string, string>[] = [
    { left: `-${o}px`, top: `-${o}px` },
    { right: `-${o}px`, top: `-${o}px` },
    { left: `-${o}px`, bottom: `-${o}px` },
    { right: `-${o}px`, bottom: `-${o}px` },
  ];
  return corners.map((pos) => {
    const s = document.createElement('span');
    s.style.cssText = css({
      position: 'absolute',
      ...pos,
      width: `${sz}px`,
      height: `${sz}px`,
      'background-image': `linear-gradient(${INK},${INK}),linear-gradient(${INK},${INK})`,
      'background-size': `${t}px ${sz}px,${sz}px ${t}px`,
      'background-position': 'center center,center center',
      'background-repeat': 'no-repeat',
    });
    return s;
  });
}

/** Build (or rebuild) the band stack behind `el` and pin its ink. */
export function hlBox(el: HTMLElement): void {
  const cs = getComputedStyle(el);
  // The stack sits at z-index -1, so the button needs to be its own stacking
  // context or the bands would slide under the page background.
  if (cs.position === 'static') el.style.position = 'relative';
  if (cs.zIndex === 'auto') el.style.zIndex = '0';

  const r = rec(el);
  let b = r.box;
  if (!b || !b.isConnected) {
    // A span, not a div: these targets are often real <button> elements, which
    // only admit phrasing content.
    b = document.createElement('span');
    b.setAttribute('data-hbox', '');
    el.insertBefore(b, el.firstChild);
    r.box = b;
  }
  r.gen += 1;
  b.style.cssText =
    'display:block;position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  b.replaceChildren();

  const flat = reduced(el);
  // Main band: 56–80% of the button height, offset within the middle 60% of
  // the leftover room. Reduced motion collapses this to one full-height band.
  const mainH = flat ? 100 : 56 + Math.random() * 24;
  const top = flat ? 0 : (100 - mainH) * (0.2 + Math.random() * 0.6);
  const rows: [number, number, string][] = [[top, mainH, rnd(SPARK_LIGHTS)]];
  if (!flat) {
    // Darker accents only where there is more than 3% of height to fill.
    if (top > 3) rows.unshift([0, top, rnd(SPARK)]);
    if (100 - top - mainH > 3) rows.push([top + mainH, 100 - top - mainH, rnd(SPARK)]);
  }

  const parts: HTMLElement[] = [];
  for (const [y, h, col] of rows) {
    const d = document.createElement('span');
    d.style.cssText = `display:block;position:absolute;left:0;width:100%;top:${y.toFixed(2)}%;height:${h.toFixed(2)}%;background:${col}`;
    b.appendChild(d);
    parts.push(d);
  }

  const ol = document.createElement('span');
  ol.style.cssText = `display:block;position:absolute;left:0;top:0;width:100%;height:100%;box-shadow:inset 0 0 0 1.5px ${INK}`;
  b.appendChild(ol);
  parts.push(ol);

  const tk = document.createElement('span');
  tk.style.cssText = 'display:block;position:absolute;left:0;top:0;width:100%;height:100%';
  for (const mark of mkTicks(TICK)) tk.appendChild(mark);
  b.appendChild(tk);
  parts.push(tk);

  r.parts = parts;

  if (!flat) {
    for (const d of parts) {
      const from = rnd(WIPE_IN);
      const jx = Math.random() * 15 - 7.5; // ±7.5px jitter
      d.animate(
        [
          { clipPath: from, transform: `translateX(${jx.toFixed(1)}px)`, offset: 0 },
          {
            clipPath: 'inset(0 0 0 0)',
            transform: `translateX(${(jx / 2.6).toFixed(1)}px)`,
            offset: 0.55,
          },
          { clipPath: 'inset(0 0 0 0)', transform: 'none', offset: 1 },
        ],
        {
          duration: 150 + Math.random() * 170,
          delay: Math.random() * 140,
          easing: 'steps(5,end)',
          fill: 'both',
        },
      );
    }
  }

  hlInk(el, true);
}

/**
 * Pin the ink to COLOR.nearBlack while the cursor is inside. Re-asserted every
 * frame so a re-render of the button cannot revert it mid-hover.
 */
export function hlInk(el: HTMLElement, on: boolean): void {
  const r = rec(el);
  if (r.ink) {
    cancelAnimationFrame(r.ink);
    r.ink = 0;
  }
  if (!on) {
    el.style.color = '';
    if (r.word) r.word.style.color = '';
    return;
  }
  const pin = () => {
    if (el.style.color !== INK_RGB) el.style.color = INK;
    // Read per frame: the word span is picked after hlBox has already started.
    if (r.word) r.word.style.color = INK;
    r.ink = requestAnimationFrame(pin);
  };
  pin();
}

/** Reverse-wipe the band stack out and release the ink. */
export function hlBoxOff(el: HTMLElement): void {
  const r = rec(el);
  const b = r.box;
  hlInk(el, false);
  if (!b) return;

  if (reduced(el)) {
    b.style.display = 'none';
    return;
  }

  const gen = r.gen;
  const parts = r.parts.length ? r.parts : [b];
  let done = 0;
  for (const d of parts) {
    const a = d.animate(
      [
        { clipPath: 'inset(0 0 0 0)', transform: 'none' },
        {
          clipPath: rnd(WIPE_OUT),
          transform: `translateX(${(Math.random() * 11 - 5.5).toFixed(1)}px)`,
        },
      ],
      {
        duration: 110 + Math.random() * 130,
        delay: Math.random() * 100,
        easing: 'steps(4,end)',
        fill: 'both',
      },
    );
    a.onfinish = () => {
      // A re-enter bumps gen; a stale exit must not hide the fresh stack.
      if (++done >= parts.length && r.gen === gen && r.box === b) b.style.display = 'none';
    };
  }
}

/**
 * The span the letters glitch in. Prefers a direct text child (wrapped in
 * place so nothing moves), otherwise the largest-type leaf inside the button.
 */
function pickWord(el: HTMLElement): HTMLElement | null {
  const r = rec(el);
  if (r.word && r.word.isConnected) return r.word;

  for (const n of Array.from(el.childNodes)) {
    if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 1) {
      const s = document.createElement('span');
      s.setAttribute('data-hword', '');
      s.textContent = n.textContent;
      el.replaceChild(s, n);
      r.word = s;
      return s;
    }
  }

  let best: HTMLElement | null = null;
  let bs = -1;
  const leaves = qq<Element>(el, '*').filter((n): n is HTMLElement => n instanceof HTMLElement);
  for (const n of leaves) {
    if (n.children.length || (n.textContent ?? '').trim().length < 2) continue;
    const fs = parseFloat(getComputedStyle(n).fontSize) || 0;
    if (fs > bs) {
      bs = fs;
      best = n;
    }
  }
  if (best) {
    best.setAttribute('data-hword', '');
    r.word = best;
  }
  return best;
}

function enter(el: HTMLElement): void {
  hlBox(el);
  const w = pickWord(el);
  if (!w) return;
  if (reduced(el)) return; // flat band only — no letter glitch
  wrapWord(w);
  // 22ms step, scattered order, no color band behind the letters (the band
  // stack is already there); glitchFont boxes the line so nothing reflows.
  glitchFont(w, true, 22, true);
}

function leave(el: HTMLElement): void {
  hlBoxOff(el);
  const w = rec(el).word;
  if (w && !reduced(el)) glitchFont(w, false, 18, true);
}

const BOUND = new WeakSet<HTMLElement>();

/**
 * Menu channel cells own their hover personalities in channels.ts, and any
 * element can opt out with `data-nohl`.
 */
const EXCLUDE = '[data-channel],[data-hov="prod"],[data-hov="water"],[data-hov="sweep"],[data-nohl]';

function focusVisible(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

function bind(el: HTMLElement): void {
  if (BOUND.has(el)) return;
  BOUND.add(el);

  let over = false;
  let focused = false;
  let on = false;
  const refresh = () => {
    const want = over || focused;
    if (want === on) return;
    on = want;
    if (want) enter(el);
    else leave(el);
  };

  // pointerenter/leave, not mouseover: no bubbling, no re-fire per child.
  el.addEventListener(
    'pointerenter',
    () => {
      over = true;
      refresh();
    },
    { passive: true },
  );
  el.addEventListener(
    'pointerleave',
    () => {
      over = false;
      refresh();
    },
    { passive: true },
  );
  // Keyboard users get the same treatment; :focus-visible keeps a plain click
  // from leaving the band up after the pointer has gone.
  el.addEventListener('focus', () => {
    focused = focusVisible(el);
    refresh();
  });
  el.addEventListener('blur', () => {
    focused = false;
    refresh();
  });
}

/**
 * Auto-bind every click target inside a page. `cursor` inherits, so the target
 * is the element that turns the cursor to pointer — its text children inherit
 * pointer too and must not be bound, or the band would only cover the words.
 * Idempotent: elements already bound are skipped.
 */
export function wireHovers(root: HTMLElement): void {
  const pages = root.matches('[data-page]') ? [root] : qq(root, '[data-page]');
  for (const page of pages) {
    const targets = qq<Element>(page, '*')
      .filter((n): n is HTMLElement => n instanceof HTMLElement)
      .filter((el) => {
        if (el.closest(EXCLUDE)) return false;
        if (getComputedStyle(el).cursor !== 'pointer') return false;
        const p = el.parentElement;
        return !(p && getComputedStyle(p).cursor === 'pointer');
      });
    for (const el of targets) bind(el);
  }
}
