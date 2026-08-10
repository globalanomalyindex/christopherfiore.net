/**
 * The in-page button hover treatment.
 *
 * A band stack fills the *whole* button, not just the text: one main light
 * band drawn from SPARK_LIGHTS, a thin darker SPARK accent above and below it,
 * and a 1.5px inset outline. Every layer wipes in from its own random direction
 * with a ±7.5px jitter and its own stagger, so the stack assembles glitchily
 * and never reads as a left-to-right sweep.
 *
 * WHERE THE STACK LIVES DECIDES WHETHER THE LATTICE SURVIVES IT. The three
 * layers of a lattice screen are band host (z 0) → lattice (z 1) → content
 * (z 2), so the band has to paint UNDER the crosshairs. A stack built inside
 * the button is inside the content layer and buries them. When a screen offers
 * a `[data-bandhost]` the stack is therefore built THERE, positioned at the
 * target's rect in design px, and only screens without one (every page that is
 * not the lattice menu) keep the original in-button stack.
 *
 * LEGIBILITY CONTRACT: the band the type sits on is always from SPARK_LIGHTS,
 * the ink on it is always COLOR.nearBlack, and the darker SPARK rows are edge
 * accents that never carry type. SPARK_LIGHTS is *derived* by filtering on
 * measured contrast, so a band that could not carry the ink cannot reach here.
 * The accent rows are capped at 8% of the height for the same reason: the old
 * 56–80% main band let an accent fall under a two-line block's meta line, and
 * near-black ink on a near-black accent is not there at all.
 */

import { css, qq } from '../dom.ts';
import { COLOR, SPARK, SPARK_LIGHTS } from '../design/tokens.ts';
import { glitchFont, holdGlitch, stopHoldGlitch, wrapWord } from './glitch.ts';
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

/**
 * The accent rows, top and bottom, as a percentage of the button height.
 *
 * 8% is a ceiling, not a taste call. Anything taller reaches the meta line of
 * a two-line block, and a darker SPARK accent under near-black ink is ink on
 * ink. The main band takes everything between them, so it is never below 84%.
 */
const ACCENT_MIN = 2;
const ACCENT_MAX = 8;

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
  /** true while `box` lives in a screen-level band host rather than in the button */
  hosted: boolean;
  /** every animatable layer inside the box, in paint order */
  parts: HTMLElement[];
  /** bumped on every enter so a stale exit animation can't hide a fresh stack */
  gen: number;
  /** the span the letters live in, pinned to INK alongside the button */
  word: HTMLElement | null;
  /** requestAnimationFrame handle for the ink pin */
  ink: number;
  /**
   * Inline colors captured at enter and written back verbatim at leave. Null
   * whenever nothing is pinned, which is also the guard that stops a second
   * enter from capturing INK as if it were the original.
   */
  pins: Map<HTMLElement, string> | null;
  /** the main band's color, so the letter glitch can pick ink that reads on it */
  band: string;
}

const RECS = new WeakMap<HTMLElement, HoverRec>();

function rec(el: HTMLElement): HoverRec {
  let r = RECS.get(el);
  if (!r) {
    r = {
      box: null,
      hosted: false,
      parts: [],
      gen: 0,
      word: null,
      ink: 0,
      pins: null,
      band: COLOR.paper,
    };
    RECS.set(el, r);
  }
  return r;
}

/**
 * The screen-level band host this target belongs to, if its screen has one.
 *
 * Found by walking up rather than by a fixed selector: `menu.ts` emits the host
 * as the first child of `[data-menu]`, and any future screen that wants its
 * bands under a lattice only has to emit the same marker.
 */
function bandHost(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const h = p.querySelector<HTMLElement>(':scope > [data-bandhost]');
    if (h) return h;
  }
  return null;
}

/** Viewport scale of the 1920-wide stage, so rects read back in design px. */
function scaleOf(node: Element): number {
  const st = node.closest<HTMLElement>('[data-stage]');
  return st ? (st.getBoundingClientRect().width || 1920) / 1920 : 1;
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
 *
 * The band stack no longer uses these: on a lattice screen the corners of a
 * band are background pegs switched on, and drawing a tick over one is the
 * same mark twice. Still exported, because screens without a lattice draw
 * their own corners and call this.
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
  const r = rec(el);
  const host = bandHost(el);

  // The hosted stack is a fresh node every cycle: `hlBoxOff` removes it, so
  // that a screen check can assert zero bands in the host between hovers.
  if (r.box && (!r.box.isConnected || r.hosted !== !!host)) r.box = null;

  let b = r.box;
  if (!b) {
    // A span, not a div: these targets are often real <button> elements, which
    // only admit phrasing content, and the in-button stack is their child.
    b = document.createElement('span');
    b.setAttribute('data-hbox', '');
    if (host) host.appendChild(b);
    else el.insertBefore(b, el.firstChild);
    r.box = b;
    r.hosted = !!host;
  }
  r.gen += 1;

  if (host) {
    // Absolute in the host's own 1920×1080 space. Re-measured on every enter
    // because the button is no longer the stack's parent: nothing else moves
    // the band when a copy edit or a resize moves the button.
    const k = scaleOf(el) || 1;
    const hr = host.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    b.style.cssText =
      `display:block;position:absolute;pointer-events:none;` +
      `left:${((er.left - hr.left) / k).toFixed(2)}px;top:${((er.top - hr.top) / k).toFixed(2)}px;` +
      `width:${(er.width / k).toFixed(2)}px;height:${(er.height / k).toFixed(2)}px`;
  } else {
    const cs = getComputedStyle(el);
    // The in-button stack sits at z-index -1, so the button needs to be its own
    // stacking context or the bands would slide under the page background.
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.zIndex === 'auto') el.style.zIndex = '0';
    b.style.cssText =
      'display:block;position:absolute;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  }
  b.replaceChildren();

  const flat = reduced(el);
  // A thin darker accent top and bottom, the light band filling everything
  // between them. Reduced motion collapses the stack to one full-height band.
  const accT = flat ? 0 : ACCENT_MIN + Math.random() * (ACCENT_MAX - ACCENT_MIN);
  const accB = flat ? 0 : ACCENT_MIN + Math.random() * (ACCENT_MAX - ACCENT_MIN);
  const main = rnd(SPARK_LIGHTS);
  r.band = main;
  const rows: [number, number, string][] = [[accT, 100 - accT - accB, main]];
  if (!flat) {
    rows.unshift([0, accT, rnd(SPARK)]);
    rows.push([100 - accB, accB, rnd(SPARK)]);
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

  // No corner ticks. On a lattice screen the four corners of this rect are
  // already lattice points switched to PEG_CORNER, and a drawn tick on top of
  // a peg is two marks in one place.

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
 * Every descendant that sets its own inline color.
 *
 * The button's own pin is inherited, and inheritance loses to any inline
 * declaration — so a secondary span at COLOR.inkSoft keeps its 6.4:1-on-paper
 * grey while sitting on a vivid band, and drops out. These are the elements
 * that have to be pinned individually. The band stack is skipped: its layers
 * carry backgrounds, and nothing inside it is type.
 */
function inkNodes(host: HTMLElement): HTMLElement[] {
  return qq<Element>(host, '*')
    .filter((n): n is HTMLElement => n instanceof HTMLElement)
    .filter((n) => n.style.color !== '' && !n.closest('[data-hbox]'));
}

/**
 * Pin the ink to COLOR.nearBlack while the cursor is inside. Re-asserted every
 * frame so a re-render of the button cannot revert it mid-hover.
 *
 * Originals are snapshotted once per hover and written back verbatim, including
 * the empty string for elements that had no inline color of their own. The
 * snapshot is taken only when nothing is pinned yet: capturing a second time
 * mid-hover would record INK as the original and make the pin permanent.
 */
export function hlInk(el: HTMLElement, on: boolean): void {
  const r = rec(el);
  if (r.ink) {
    cancelAnimationFrame(r.ink);
    r.ink = 0;
  }
  if (!on) {
    unpin(r);
    return;
  }
  if (!r.pins) {
    const pins = new Map<HTMLElement, string>();
    pins.set(el, el.style.color);
    for (const n of inkNodes(el)) pins.set(n, n.style.color);
    r.pins = pins;
  }
  const pins = r.pins;
  const pin = () => {
    // The band now lives in a screen-level host, so nothing collects it when
    // the button is torn out from under an open hover. This is that collector.
    if (!el.isConnected) {
      dropBox(r);
      unpin(r);
      r.ink = 0;
      return;
    }
    // Read per frame: the word span is picked after hlBox has already started,
    // and its own inline color has to be captured before the first pin writes.
    const w = r.word;
    if (w && !pins.has(w)) pins.set(w, w.style.color);
    for (const n of pins.keys()) {
      if (n.style.color !== INK_RGB) n.style.color = INK;
    }
    r.ink = requestAnimationFrame(pin);
  };
  pin();
}

/**
 * Write every captured inline color back, exactly as it was.
 *
 * An element that had none gets the empty string, which is its original state.
 * These are page elements, never lattice pegs: a peg is only ever restored
 * through `restorePeg`, because clearing a peg's inline color inherits
 * near-black and scars the field for good.
 */
function unpin(r: HoverRec): void {
  if (!r.pins) return;
  for (const [n, col] of r.pins) n.style.color = col;
  r.pins = null;
}

/** Take a hosted stack out of the host; hide an in-button one, as before. */
function dropBox(r: HoverRec): void {
  const b = r.box;
  if (!b) return;
  if (r.hosted) {
    b.remove();
    r.box = null;
    r.parts = [];
  } else {
    b.style.display = 'none';
  }
}

/** Reverse-wipe the band stack out and release the ink. */
export function hlBoxOff(el: HTMLElement): void {
  const r = rec(el);
  const b = r.box;
  hlInk(el, false);
  if (!b) return;

  if (reduced(el)) {
    dropBox(r);
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
      // A re-enter bumps gen; a stale exit must not take down the fresh stack.
      if (++done >= parts.length && r.gen === gen && r.box === b) dropBox(r);
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
  // …and the glitch keeps going for as long as the cursor is inside. Without
  // this the run settles flat after one pass and reads as "the glitch is
  // gone". The band color goes with it so the held letters are picked for
  // contrast against the band they are actually sitting on.
  holdGlitch(w, rec(el).band, 22);
}

function leave(el: HTMLElement): void {
  hlBoxOff(el);
  const w = rec(el).word;
  if (!w) return;
  // Before the walk back, always: stopping clears the held colors, and
  // glitchFont's own restore would otherwise race the hold's next tick.
  stopHoldGlitch(w);
  if (!reduced(el)) glitchFont(w, false, 18, true);
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
