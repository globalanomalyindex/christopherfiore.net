/**
 * Per-letter font glitch engine.
 *
 * The resting face is Karrik. The alternate is Dessign Maison, which only ever
 * reads correctly with `font-feature-settings: 'salt' 1, 'ss01' 1` — every
 * swap to the alternate sets both together (FONT.alt / FONT.altFeatures).
 *
 * Three users:
 *   · the intro          — `introLetters`, per-letter color flash on load
 *   · the idle wordmark  — `ambientGlitch` → `flashAlt`, menu at rest
 *   · titles and buttons — `glitchFont` / `resetTitleFont`, driven by
 *                          transitions.ts and hover.ts
 *
 * A swapped letter sits on a color band (`hlOn`) drawn from LIGHTS with
 * near-black ink, which is the legibility contract from the handoff.
 */

import { el, qq } from '../dom.ts';
import { COLOR, FLASH, FONT, LIGHTS, MARA } from '../design/tokens.ts';
import { dfxRelease, dfxSeq } from './dither.ts';
import { state } from './state.ts';

/* ------------------------------------------------------------------ state */

interface Meta {
  /* letter-level */
  /** color band behind this letter */
  hl?: HTMLElement;
  /** auto-off timer for the band */
  hlT?: number;
  /** tick size the band was last drawn at */
  hlSz?: number;
  /** resting width in design px, measured once before the first pinned swap */
  w0?: number;
  /** horizontal squeeze the pinned swap applied (1 = none) */
  sx?: number;
  /** letter came from wrapWord and stays `display:inline` */
  inl?: boolean;

  /* line-level */
  wrapped?: boolean;
  /** the layer that holds this line's bands, behind the text */
  hlayer?: HTMLElement;
  /** resting letter-spacing, captured before fitLine ever touches it */
  ls0?: string;
  /** letter-spacing restore timer (whole-line flashes) */
  lsT?: number;
  /** glitchFont's pending timers, cleared when a new run starts */
  gt?: number[];
  /** a subpage title's pending swap-to-alternate, cleared if it closes first */
  spT?: number;
  /** the word picked out of a hover target */
  hw?: HTMLElement;
  /** original text of an intro line, so a replay can rebuild it */
  src?: string;

  /* stage-level */
  /** ambient loop handle */
  agT?: number;
}

const META = new WeakMap<Element, Meta>();

const meta = (n: Element): Meta => {
  let m = META.get(n);
  if (!m) {
    m = {};
    META.set(n, m);
  }
  return m;
};

/* ----------------------------------------------------------------- helpers */

const rnd = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

/** The prototype's `[data-frame-root]`; `[data-stage]` is accepted as an alias. */
const STAGE_SEL = '[data-frame-root],[data-stage]';

const stageOf = (node: Element): HTMLElement | null => node.closest<HTMLElement>(STAGE_SEL);

/** Viewport scale of the 1920-wide stage, so measurements come back in design px. */
function scaleOf(node: Element): number {
  const st = stageOf(node);
  return st ? (st.getBoundingClientRect().width || 1920) / 1920 : 1;
}

function isReduced(node: Element): boolean {
  const st = stageOf(node);
  if (st) return state(st).reduced;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Dither pulses used by the letter swaps: [ms, amount]. */
const FLASH_SEQ: [number, number][] = [
  [0, 1],
  [10, 0.32],
  [210, 1],
];
const GLITCH_SEQ: [number, number][] = [
  [0, 1],
  [10, 0.3],
  [190, 1],
];

/** Four corner crosshairs, drawn as two 1px lines each. Decorative. */
function tickMarks(sz: number): HTMLElement[] {
  const o = (sz / 2).toFixed(1);
  const t = Math.max(1, sz / 9).toFixed(1);
  const ink = COLOR.nearBlack;
  return [
    `left:-${o}px;top:-${o}px`,
    `right:-${o}px;top:-${o}px`,
    `left:-${o}px;bottom:-${o}px`,
    `right:-${o}px;bottom:-${o}px`,
  ].map((pos) =>
    el('span', {
      style:
        `position:absolute;${pos};width:${sz}px;height:${sz}px;` +
        `background-image:linear-gradient(${ink},${ink}),linear-gradient(${ink},${ink});` +
        `background-size:${t}px ${sz}px,${sz}px ${t}px;` +
        'background-position:center center,center center;background-repeat:no-repeat',
    }),
  );
}

/* -------------------------------------------------------------- highlights */

/**
 * A band color. 34% a flat LIGHTS color, otherwise a hard two- or three-stop
 * gradient whose *middle* is always the light one — type on a band is always
 * near-black on a LIGHTS color, MARA is edge accent only.
 */
function hlPaint(): string {
  const L = rnd(LIGHTS);
  if (Math.random() < 0.34) return L;
  if (Math.random() < 0.55) {
    const a = (64 + Math.random() * 22) | 0;
    return `linear-gradient(to bottom,${L} 0 ${a}%,${rnd(MARA)} ${a}% 100%)`;
  }
  const t = (7 + Math.random() * 12) | 0;
  const b = 100 - ((5 + Math.random() * 12) | 0);
  return `linear-gradient(to bottom,${rnd(MARA)} 0 ${t}%,${L} ${t}% ${b}%,${rnd(MARA)} ${b}% 100%)`;
}

/** The per-line layer the bands live in, pinned behind the text (`z-index:-1`). */
function hlLayer(line: HTMLElement): HTMLElement {
  const m = meta(line);
  let layer = m.hlayer;
  if (!layer || !layer.isConnected) {
    layer = el('div', {
      'data-hlayer': '',
      style: 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:-1',
    });
    const lcs = getComputedStyle(line);
    if (lcs.position === 'static') line.style.position = 'relative';
    if (lcs.zIndex === 'auto') line.style.zIndex = '0';
    line.insertBefore(layer, line.firstChild);
    m.hlayer = layer;
  }
  return layer;
}

/**
 * Re-measure one band against its letter. The band overhangs 5px either side
 * and covers 78% of the letter box starting 7% down — tuned so it reads as a
 * marker stripe under the x-height, not a full highlight.
 */
function hlPlace(sp: HTMLElement): void {
  const b = meta(sp).hl;
  if (!b || b.style.display === 'none') return;
  const line = sp.parentElement;
  if (!line) return;
  const k = scaleOf(sp);
  const r = sp.getBoundingClientRect();
  const lr = line.getBoundingClientRect();
  const x = (r.left - lr.left) / k;
  const y = (r.top - lr.top) / k;
  const w = r.width / k;
  const hh = r.height / k;
  b.style.left = `${(x - 5).toFixed(1)}px`;
  b.style.top = `${(y + hh * 0.07).toFixed(1)}px`;
  b.style.width = `${(w + 10).toFixed(1)}px`;
  b.style.height = `${(hh * 0.78).toFixed(1)}px`;
}

/** Re-place every band in a line — called after any swap, which moves letters. */
function hlSync(line: HTMLElement | null): void {
  if (!line) return;
  qq(line, ':scope > span[data-ch], :scope > span[data-l]').forEach(hlPlace);
}

function hlOn(sp: HTMLElement, col: string, dur?: number): HTMLElement | null {
  if (sp.hasAttribute('data-hl') || sp.closest('[data-hl]')) return null;
  const line = sp.parentElement;
  if (!line) return null;
  const layer = hlLayer(line);
  const m = meta(sp);
  let b = m.hl;
  if (!b || !b.isConnected) {
    b = el('div', { 'data-hl': '' });
    layer.appendChild(b);
    m.hl = b;
  }
  const hh = sp.getBoundingClientRect().height;
  const sz = Math.max(6, Math.min(14, Math.round(hh * 0.085)));
  const bm = meta(b);
  if (bm.hlSz !== sz) {
    b.replaceChildren(...tickMarks(sz));
    bm.hlSz = sz;
  }
  b.style.cssText =
    `display:block;position:absolute;pointer-events:none;background:${col};` +
    `box-shadow:0 0 0 ${sz > 9 ? 1.5 : 1}px ${COLOR.nearBlack}`;
  hlPlace(sp);
  b.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
    duration: 90,
    easing: 'steps(5,end)',
    fill: 'both',
  });
  if (dur) {
    window.clearTimeout(m.hlT);
    m.hlT = window.setTimeout(() => hlOff(sp), dur);
  }
  return b;
}

function hlOff(sp: HTMLElement): void {
  const m = meta(sp);
  const b = m.hl;
  if (!b) return;
  window.clearTimeout(m.hlT);
  const a = b.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], {
    duration: 90,
    easing: 'steps(5,end)',
    fill: 'both',
  });
  a.onfinish = () => {
    b.style.display = 'none';
  };
}

/* ------------------------------------------------------------------ letters */

/** Split a plain-text element into per-letter spans. Idempotent. */
export function wrapWord(host: HTMLElement): void {
  const m = meta(host);
  if (m.wrapped) return;
  m.wrapped = true;
  const t = host.textContent ?? '';
  host.textContent = '';
  for (const c of Array.from(t)) {
    const sp = el('span', {
      'data-l': '',
      'data-ch': '',
      style: c === ' ' ? 'display:inline;white-space:pre' : 'display:inline',
    });
    sp.textContent = c;
    meta(sp).inl = true;
    host.appendChild(sp);
  }
}

/**
 * The word inside a hover target worth glitching: the first multi-character
 * text node (promoted to a span), else the largest leaf. Cached on the host so
 * enter/leave agree on the same element.
 */
export function pickWord(host: HTMLElement): HTMLElement | null {
  const m = meta(host);
  if (m.hw && m.hw.isConnected) return m.hw;
  for (const n of Array.from(host.childNodes)) {
    if (n.nodeType === 3 && (n.textContent ?? '').trim().length > 1) {
      const s = el('span', { 'data-hword': '' });
      s.textContent = n.textContent;
      host.replaceChild(s, n);
      m.hw = s;
      return s;
    }
  }
  let best: HTMLElement | null = null;
  let bs = -1;
  for (const n of qq(host, 'span,div')) {
    if (n.children.length || (n.textContent ?? '').trim().length < 2) continue;
    const fs = parseFloat(getComputedStyle(n).fontSize) || 0;
    if (fs > bs) {
      bs = fs;
      best = n;
    }
  }
  if (best) {
    best.setAttribute('data-hword', '');
    m.hw = best;
  }
  return best;
}

/**
 * Swap one letter between the resting face and the alternate.
 *
 * `free` swaps the face and lets the letter take its natural advance width —
 * what every call site here does. With `free` false the letter is *pinned*:
 * its resting width is measured once (`w0`, in design px) and the alternate is
 * boxed to within 0.8–1.18× of it so the line cannot reflow. The clamp keeps a
 * much narrower alternate from leaving a hole and a much wider one from
 * pushing its neighbours.
 */
function swapLetter(sp: HTMLElement, k: number, toAlt: boolean, free?: boolean): void {
  const m = meta(sp);
  if (!toAlt) {
    sp.style.fontFamily = '';
    sp.style.fontFeatureSettings = '';
    sp.style.letterSpacing = '';
    sp.style.width = '';
    sp.style.transform = '';
    sp.style.color = '';
    if (!m.inl) sp.style.display = 'inline-block';
    m.sx = 1;
    return;
  }
  if (free) {
    sp.style.width = '';
    sp.style.fontFamily = FONT.alt;
    sp.style.fontFeatureSettings = FONT.altFeatures;
    m.sx = 1;
    return;
  }
  if (m.w0 == null) {
    sp.style.width = '';
    sp.style.transform = '';
    m.w0 = sp.getBoundingClientRect().width / k;
  }
  sp.style.display = 'inline-block';
  sp.style.fontFamily = FONT.alt;
  sp.style.fontFeatureSettings = FONT.altFeatures;
  sp.style.width = '';
  const wa = sp.getBoundingClientRect().width / k;
  let box = wa > 0 ? Math.min(wa, m.w0 * 1.18) : m.w0;
  if (wa > 0) {
    if (box < wa * 0.8) box = wa * 0.8;
    if (wa < m.w0 * 0.78) box = Math.max(wa, Math.min(m.w0 * 0.92, wa * 1.12));
  }
  sp.style.width = `${box.toFixed(2)}px`;
  sp.style.transformOrigin = 'left center';
  m.sx = wa > 0 ? box / wa : 1;
}

/**
 * Tracking for the alternate face at display sizes.
 *
 * The alternate's letterforms are wider than Karrik's and carry more
 * sidebearing, so a display line set in it wants at least -0.015em to hold
 * together. That used to be applied as a flat REPLACEMENT, and on this site
 * every display title rests tighter than it: -.05em on the subpages, -.06em on
 * pages 01 and 03. So swapping to the alternate loosened them. At 152px it
 * opened every gap by 5.32px, which on a word whose widest pair is already
 * i→p reads as a space dropped into the middle of it.
 *
 * Never loosen. Take whichever of the two is tighter, so the -0.015em is a
 * floor for titles that rest loose and a no-op for titles that do not.
 */
const ALT_TRACK_EM = -0.015;

/** A letter-spacing string as a multiple of the font size. */
function trackEm(v: string, fsz: number): number {
  const raw = (v || '').trim();
  if (!raw || raw === 'normal') return 0;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return raw.endsWith('em') ? n : fsz ? n / fsz : 0;
}

function altTrack(rest: string, fsz: number): string {
  return `${Math.min(trackEm(rest, fsz), ALT_TRACK_EM)}em`;
}

/**
 * Keep a line inside the stage after a swap by tightening tracking, never by
 * letting it run wide. `base` is the letter-spacing to start from (omit for the
 * line's resting value). Only fires when the line actually overflows the
 * 1920px stage less a 40px margin.
 */
export function fitLine(line: HTMLElement, k: number, base?: string | number): void {
  if (!line) return;
  const m = meta(line);
  if (m.ls0 == null) m.ls0 = line.style.letterSpacing || '';
  line.style.letterSpacing =
    base == null ? m.ls0 : typeof base === 'number' ? `${base}px` : base;
  const stage = stageOf(line);
  if (!stage) return;
  const rr = stage.getBoundingClientRect();
  const r = line.getBoundingClientRect();
  const avail = 1920 - (r.left - rr.left) / k - 40;
  const w = r.width / k;
  // [data-ch] as well as [data-l]: the intro's spans carry only [data-ch].
  const n = line.querySelectorAll('[data-l],[data-ch]').length || 1;
  if (w <= avail || n < 2) return;
  const cs = getComputedStyle(line);
  const fs = parseFloat(cs.fontSize) || 100;
  const cur = parseFloat(cs.letterSpacing) || 0;
  line.style.letterSpacing = `${((cur - (w - avail) / (n - 1)) / fs).toFixed(4)}em`;
}

/* -------------------------------------------------------------------- intro */

/**
 * The intro treatment for one `[data-dither]` line: split into letters, then
 * reveal them in scatter order `(i × 5) mod n` — never left to right — each
 * flashing four FLASH colors 38ms apart before clearing to the inherited ink
 * at +152ms. Returns the spans and the timer ids so the caller (playIn in
 * dither.ts) can own cancellation and size its own dither-in.
 */
export function introLetters(
  line: HTMLElement,
  delay: number,
  step: number,
): { spans: HTMLElement[]; timers: number[] } {
  const m = meta(line);
  if (m.src === undefined) m.src = line.textContent ?? '';
  line.textContent = '';
  const spans = Array.from(m.src).map((c) => {
    const sp = el('span', { 'data-ch': '', style: 'visibility:hidden' });
    sp.textContent = c;
    line.appendChild(sp);
    return sp;
  });
  const timers: number[] = [];
  const n = spans.length;
  if (!n) return { spans, timers };

  if (isReduced(line)) {
    spans.forEach((sp) => {
      sp.style.visibility = 'visible';
    });
    return { spans, timers };
  }

  const order = spans.map((_, i) => i).sort((a, b) => ((a * 5) % n) - ((b * 5) % n) || a - b);
  order.forEach((ci, k) => {
    const sp = spans[ci];
    const t0 = delay + k * step;
    for (let s = 0; s < 4; s++) {
      timers.push(
        window.setTimeout(() => {
          sp.style.visibility = 'visible';
          sp.style.color = FLASH[(ci * 2 + s * 3) % FLASH.length];
        }, t0 + s * 38),
      );
    }
    timers.push(
      window.setTimeout(() => {
        sp.style.color = '';
      }, t0 + 152),
    );
  });
  return { spans, timers };
}

/* ----------------------------------------------------------------- flashing */

/**
 * Flash a set of letters to the alternate behind a color band and back.
 * 26ms between letters; each letter dithers, jitters ±1.3px, holds for `hold`,
 * then reverts. `whole` re-fits the line's tracking once the last letter has
 * landed and restores it after the hold, so a whole-line swap cannot widen the
 * wordmark past the stage.
 */
export function flashAlt(
  stage: HTMLElement,
  spans: HTMLElement[],
  hold: number,
  whole?: boolean,
): void {
  const k = (stage.getBoundingClientRect().width || 1920) / 1920;
  const col = hlPaint();
  const col2 = hlPaint();
  const col3 = hlPaint();
  const lines = whole
    ? [...new Set(spans.map((s) => s.parentElement).filter((p): p is HTMLElement => !!p))]
    : [];
  if (whole) {
    lines.forEach((ln) => window.clearTimeout(meta(ln).lsT));
    // spans.length * 26 is when the last letter lands; +60 to settle first.
    window.setTimeout(() => lines.forEach((ln) => fitLine(ln, k)), spans.length * 26 + 60);
    lines.forEach((ln) => {
      const lm = meta(ln);
      lm.lsT = window.setTimeout(
        () => {
          ln.style.letterSpacing = lm.ls0 == null ? '' : lm.ls0;
        },
        hold + spans.length * 26 + 140,
      );
    });
  }
  spans.forEach((sp, i) => {
    window.setTimeout(() => {
      if (!sp.isConnected || !sp.textContent || sp.hasAttribute('data-hl') || sp.closest('[data-hl]')) return;
      swapLetter(sp, k, true, true);
      const rr = Math.random();
      hlOn(sp, rr < 0.22 ? col2 : rr < 0.34 ? col3 : col);
      sp.style.color = COLOR.nearBlack;
      sp.style.transform = `translate(${(Math.random() * 2.6 - 1.3).toFixed(1)}px,0)`;
      dfxSeq(sp, FLASH_SEQ, 11, true);
      hlSync(sp.parentElement);
      window.setTimeout(() => {
        if (!sp.isConnected) return;
        sp.style.transform = '';
        sp.style.display = 'inline';
        hlSync(sp.parentElement);
      }, 130);
      window.setTimeout(() => {
        if (!sp.isConnected) return;
        dfxSeq(sp, FLASH_SEQ, 11, true);
        hlOff(sp);
        swapLetter(sp, k, false);
        hlSync(sp.parentElement);
      }, hold);
    }, i * 26);
  });
}

/**
 * Glitch a whole line to (or back from) the alternate face, letter by letter in
 * scatter order `(i × 7) mod n`. `step` is the per-letter interval — 22–26ms
 * for page titles and in-page buttons, 44ms when unspecified. `noHl` suppresses
 * the color bands (the button treatment paints its own band stack).
 *
 * Reduced motion: the whole line takes the target face at once, no stagger,
 * no bands, no jitter.
 */
export function glitchFont(line: HTMLElement, toAlt: boolean, step?: number, noHl?: boolean): void {
  if (!line) return;
  const k = scaleOf(line);
  const ls = qq(line, '[data-l]');
  const n = ls.length || 1;
  const st = step || 44;
  const m = meta(line);
  (m.gt || []).forEach((t) => window.clearTimeout(t));
  m.gt = [];
  const gt = m.gt;

  if (m.ls0 == null) m.ls0 = line.style.letterSpacing || '';
  const fsz = parseFloat(getComputedStyle(line).fontSize) || 0;
  const track = toAlt && fsz > 60 ? altTrack(m.ls0 ?? '', fsz) : m.ls0;

  if (isReduced(line)) {
    ls.forEach((sp) => swapLetter(sp, k, toAlt, true));
    fitLine(line, k, track);
    return;
  }

  const order = ls.map((_, i) => i).sort((a, b) => ((a * 7) % n) - ((b * 7) % n) || a - b);
  const col = hlPaint();
  const colB = hlPaint();
  order.forEach((li, k2) => {
    const sp = ls[li];
    gt.push(
      window.setTimeout(() => {
        dfxSeq(sp, GLITCH_SEQ, 9, true);
        swapLetter(sp, k, toAlt, true);
        if (!noHl) {
          if (toAlt) {
            hlOn(sp, Math.random() < 0.3 ? colB : col, 300);
            sp.style.color = COLOR.nearBlack;
            gt.push(
              window.setTimeout(() => {
                if (sp.isConnected) sp.style.color = '';
              }, 300),
            );
          } else hlOff(sp);
        }
        if (!meta(sp).inl) {
          sp.style.transform = toAlt
            ? `translate(${(Math.random() * 4 - 2).toFixed(1)}px,${(Math.random() * 4 - 2).toFixed(1)}px)`
            : `translate(${(Math.random() * 4 - 2).toFixed(1)}px,0)`;
          hlSync(sp.parentElement);
          gt.push(
            window.setTimeout(() => {
              if (sp.isConnected) {
                sp.style.transform = '';
                hlSync(sp.parentElement);
              }
            }, 110),
          );
          gt.push(
            window.setTimeout(() => {
              if (sp.isConnected) sp.style.display = toAlt ? 'inline' : 'inline-block';
            }, 330),
          );
        }
      }, 30 + k2 * st),
    );
  });
  gt.push(
    window.setTimeout(
      () => {
        fitLine(line, k, track);
      },
      40 + n * st + 380,
    ),
  );
}

/**
 * Hard reset of a title: cancel pending swaps, drop every band, put every
 * letter back on Karrik at its resting tracking. Called before an open and on
 * the completion of a close so a re-open starts clean.
 */
export function resetTitleFont(line: HTMLElement): void {
  if (!line) return;
  const m = meta(line);
  (m.gt || []).forEach((t) => window.clearTimeout(t));
  m.gt = [];
  /*
    Capture before restoring. This used to write '' whenever nothing had been
    captured yet, which on a title's FIRST open threw away the tracking the
    page builder authored inline. Everything downstream then read the resting
    tracking as 0: `altTrack`'s -0.015em floor stopped being a floor and became
    the value, and a title that rests at -.05em came back 5.32px looser per
    letter at 152px.
  */
  if (m.ls0 == null) m.ls0 = line.style.letterSpacing || '';
  line.style.letterSpacing = m.ls0;
  qq(line, '[data-l]').forEach((sp) => {
    const lm = meta(sp);
    window.clearTimeout(lm.hlT);
    if (lm.hl) lm.hl.style.display = 'none';
    sp.style.fontFamily = '';
    sp.style.fontFeatureSettings = '';
    sp.style.letterSpacing = '';
    sp.style.width = '';
    sp.style.color = '';
    sp.style.transform = '';
    // Not `sp.style.filter = ''`: this is the hard reset, so the letter's
    // filter goes back to the pool instead of being stranded in the defs.
    dfxRelease(sp);
    sp.style.display = 'inline-block';
    lm.sx = 1;
  });
}

/* ---------------------------------------------------------------- ambient */

/** The letters of one wordmark line. The intro splits them; wrap if it hasn't. */
function charsOf(line: HTMLElement): HTMLElement[] {
  let ls = qq(line, ':scope > span[data-ch]');
  if (!ls.length && !line.children.length && (line.textContent ?? '').trim()) {
    wrapWord(line);
    ls = qq(line, ':scope > span[data-ch]');
  }
  return ls;
}

/**
 * The idle wordmark loop. Every 1000–3900ms it picks a target — one letter
 * (56%), a run of 2–4 letters (37%), or both whole lines (7%) — swaps it to
 * the alternate for 320–1470ms behind a color band, then swaps back.
 *
 * Suspended (not canceled) during the intro, during any page transition and
 * while a page is open; that flag is read from `state(stage)`, never mirrored.
 * A no-op under reduced motion.
 */
/* ------------------------------------------------------- subpage titles */

/*
 * A page title takes the alternate face on the way in and hands it back on the
 * way out — `transitions.ts` drives that. The three subpages (the Kona N case
 * study, chellbook, the background) are titled screens in the same hierarchy
 * and were the only ones staying on Karrik throughout, so they run the same
 * swap through the trio below.
 *
 * They are found by `[data-sptitle]`, deliberately not `[data-ptitle]`: every
 * subpage is a child of the page it covers, and `navParts()` locates a page's
 * own title with a document-order query. Sharing the marker would let a
 * subpage's title be mistaken for its host page's.
 *
 * The pending swap is held per title so a screen closed mid-open cannot land
 * its glitch on a title that is already walking back to Karrik.
 */

const sptitleOf = (screen: HTMLElement): HTMLElement | null =>
  screen.querySelector<HTMLElement>('[data-sptitle]');

/**
 * Swap a subpage's title to the alternate face, `delay` ms from now — the
 * caller passes the point in its own choreography where the title has arrived.
 * Reduced motion lands on the alternate at once, with no walk, exactly as
 * `openPage` does.
 */
export function subtitleIn(screen: HTMLElement, delay: number): void {
  const t = sptitleOf(screen);
  if (!t) return;
  const m = meta(t);
  window.clearTimeout(m.spT);
  resetTitleFont(t);
  if (isReduced(t)) {
    glitchFont(t, true, 0, true);
    return;
  }
  m.spT = window.setTimeout(() => glitchFont(t, true), delay);
}

/** Walk the title back to Karrik as the screen closes. 26ms/letter, as pages. */
export function subtitleOut(screen: HTMLElement): void {
  const t = sptitleOf(screen);
  if (!t) return;
  const m = meta(t);
  window.clearTimeout(m.spT);
  if (!isReduced(t)) glitchFont(t, false, 26);
}

/** Hard reset once a close has finished, so a re-open starts clean. */
export function subtitleReset(screen: HTMLElement): void {
  const t = sptitleOf(screen);
  if (!t) return;
  window.clearTimeout(meta(t).spT);
  resetTitleFont(t);
}

export function ambientGlitch(stage: HTMLElement): void {
  stopAmbientGlitch(stage);
  if (state(stage).reduced) return;
  // stray nested bands left by an interrupted run
  qq(stage, '[data-dither] [data-hl] [data-hl]').forEach((b) => b.remove());
  const m = meta(stage);
  const tick = () => {
    const s = state(stage);
    const busy = s.nav || s.open !== null || performance.now() < s.introUntil || s.reduced;
    if (!busy) {
      const lines = qq(stage, '[data-dither]');
      if (lines.length) {
        const r = Math.random();
        let sel: HTMLElement[] = [];
        if (r < 0.56) {
          const cs = charsOf(rnd(lines));
          if (cs.length) sel = [rnd(cs)];
        } else if (r < 0.93) {
          const cs = charsOf(rnd(lines));
          const n = 2 + ((Math.random() * 3) | 0);
          const i0 = Math.max(0, (Math.random() * Math.max(1, cs.length - n)) | 0);
          sel = cs.slice(i0, i0 + n);
        } else {
          sel = lines.reduce<HTMLElement[]>((a, ln) => a.concat(charsOf(ln)), []);
        }
        if (sel.length) flashAlt(stage, sel, 320 + Math.random() * 1150, r >= 0.93);
      }
    }
    m.agT = window.setTimeout(tick, 1000 + Math.random() * 2900);
  };
  m.agT = window.setTimeout(tick, 1500);
}

export function stopAmbientGlitch(stage: HTMLElement): void {
  const m = meta(stage);
  window.clearTimeout(m.agT);
  m.agT = undefined;
}
