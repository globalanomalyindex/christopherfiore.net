/**
 * The glitch into Dessign Maison's alternates.
 *
 * HOVER MUST NEVER CHANGE LAYOUT. Two things make that true:
 *
 * 1. A label in a row, a tile or the menu sits in a fixed cell inside a
 *    button that clips its own overflow. A label in a sentence reserves the
 *    wider of its two widths up front: Iosevka Charon Mono at rest, and the
 *    alternate plus its "..." tail on hover. Either way nothing around the
 *    word reflows.
 * 2. The glitch never touches the resting text. The resting word goes
 *    transparent and an aria-hidden overlay of the same text flips letter by
 *    letter on top of it, inside the reserved box.
 *
 * The reservation is written in em, not px, so it scales with the fluid type
 * scale instead of going stale on every resize.
 */

import { tail, type Letter } from './ink.ts';

export { tail };

const ALT = "'Dessign Maison', Georgia, serif";
const FEAT = "'salt' 1, 'ss01' 1";
/**
 * The alternate is set a step larger than the mono it replaces. Dessign
 * Maison is a narrow display serif with a low x-height; at 1.14em its
 * lowercase stands as tall as Iosevka Charon Mono's.
 */
const ALT_SIZE = '1.14em';

/** Labels found to sit on one line when reserved. Their overlay never wraps. */
const oneLine = new WeakSet<HTMLElement>();

/** The label, without any overlay text a live glitch has appended. */
const labelOf = (w: HTMLElement): string =>
  Array.from(w.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.nodeValue ?? '')
    .join('');

const isGlitching = (w: HTMLElement) => !!w.querySelector('[data-glitch]');

/** Measure every label twice and reserve the wider. Safe to call again on resize. */
export function reserve(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
    if (isGlitching(w)) return;
    const txt = labelOf(w);
    w.style.minWidth = '';
    w.style.textAlign = '';
    oneLine.delete(w);
    if (!txt.trim()) return;

    const range = document.createRange();
    range.selectNodeContents(w);
    const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
    if (lines !== 1) return;
    oneLine.add(w);

    const probe = (alt: boolean) => {
      const s = document.createElement('span');
      s.textContent = alt ? txt + tail(txt) : txt;
      s.style.cssText =
        'position:absolute;visibility:hidden;white-space:pre;left:0;top:0' +
        (alt ? `;font-family:${ALT};font-feature-settings:${FEAT};font-size:${ALT_SIZE};font-weight:400` : '');
      w.appendChild(s);
      const width = s.getBoundingClientRect().width;
      s.remove();
      return width;
    };

    const restW = probe(false);
    const altW = probe(true);
    if (altW <= restW + 0.5) return;

    // A label in a row, a tile or the menu sits in a cell of fixed width,
    // and its button clips its own overflow. Nothing around it can move, so
    // there is nothing to reserve.
    // The header's figure chip is the exception: a jump link ("say hi") sized
    // to its word, so like a link in a sentence it reserves the wider face.
    const btn = w.closest<HTMLElement>('[data-btn]');
    if (!btn || (!getComputedStyle(btn).display.startsWith('inline') && !btn.classList.contains('fig'))) return;

    const fs = parseFloat(getComputedStyle(w).fontSize) || 16;

    // A link in a sentence is the one place a wider hover could push its
    // neighbors. Never reserve a box wider than the room it has: on a narrow
    // screen that would push the page sideways; the overlay just overhangs
    // instead.
    const block = w.closest<HTMLElement>('[data-seams], p, nav, figcaption');
    if (block) {
      const room = block.clientWidth - 2 * fs;
      if (btn.getBoundingClientRect().width + (altW - restW) > room) return;
    }

    w.style.minWidth = `${(Math.ceil(altW) / fs).toFixed(4)}em`;
  });
}

/** One label's overlay: the resting word, its aria-hidden twin, and one span per character. */
export interface Face {
  w: HTMLElement;
  ov: HTMLSpanElement;
  spans: HTMLSpanElement[];
  label: string;
}

/**
 * Lay an overlay over every label in `b`. The resting word goes clear and
 * the overlay, the same text plus its tail, takes its place, inside the box
 * `reserve()` kept for it. The clock paints the overlay; nothing here moves.
 */
export function faces(b: HTMLElement): Face[] {
  const out: Face[] = [];
  b.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
    const txt = labelOf(w);
    if (!txt.trim() || isGlitching(w)) return;
    const cs = getComputedStyle(w);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pt = parseFloat(cs.paddingTop) || 0;
    const ov = document.createElement('span');
    ov.setAttribute('aria-hidden', 'true');
    ov.setAttribute('data-glitch', '');
    ov.style.cssText =
      `position:absolute;left:${pl}px;top:${pt}px;width:${w.clientWidth - pl - pr}px;` +
      `pointer-events:none;white-space:${oneLine.has(w) ? 'nowrap' : 'normal'};text-align:${cs.textAlign}`;
    const spans = Array.from(txt + tail(txt)).map((ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      ov.appendChild(s);
      return s;
    });
    w.appendChild(ov);
    w.style.color = 'transparent';
    out.push({ w, ov, spans, label: txt });
  });
  return out;
}

/*
 * SMOOTH TEXT (round 4, his note: "make sure the text transitions are all
 * smooth, things reshuffle smoothly, no jumps"). Dessign Maison's alternates
 * are not as wide as the mono, so each letter that changes face used to shove
 * every letter after it. Now each letter is measured before and after a
 * change and glides the difference away (FLIP) on a spring that keeps its
 * velocity, about 220ms, by a relative offset that never touches the line's layout. A
 * letter that changes face also comes in from a 2px blur over 100ms, which
 * bridges the two glyphs so the eye reads one letter turning, not two
 * swapping. The keyboard gets none of it.
 */
const BLUR_MS = 100;
interface Glide {
  /** the offset applied now, px, and its velocity, px/s */
  ax: number;
  ay: number;
  vx: number;
  vy: number;
  last: number;
  /** when the blur-in started, or -1 */
  b0: number;
}
const glides = new WeakMap<HTMLSpanElement, Glide>();
const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
/**
 * The glide is a spring, not a curve (Emil: springs keep their velocity when
 * the target moves). A letter shoved again mid-glide carries on from the
 * speed it had instead of stalling to zero at every drawing. Frequency 28,
 * damping 0.95: about 220ms, no visible overshoot.
 */
const G_FREQ = 28;
const G_DAMP = 0.95;
function spring(value: number, velocity: number, seconds: number): [number, number] {
  const decay = G_DAMP * G_FREQ;
  const wd = G_FREQ * Math.sqrt(1 - G_DAMP * G_DAMP);
  const b = (velocity + decay * value) / wd;
  const e = Math.exp(-decay * seconds);
  const c = Math.cos(wd * seconds);
  const sn = Math.sin(wd * seconds);
  return [e * (value * c + b * sn), e * ((b * wd - decay * value) * c - (value * wd + decay * b) * sn)];
}
const altFace = (st: string) => st.includes('Dessign');

/** Paint one frame of letters onto a face. Writes only what changed. `smooth`: glide and blur the changes. */
export function paint(f: Face, ls: readonly Letter[], ovStyle: string | null, now = performance.now(), smooth = false): void {
  const changed: [HTMLSpanElement, Letter][] = [];
  f.spans.forEach((s, i) => {
    const l = ls[i];
    if (l && (s.textContent !== l.c || (s.dataset.s ?? '') !== l.s)) changed.push([s, l]);
  });
  // where every letter sits in the line now, without its glide
  const before = smooth && changed.length ? f.spans.map((s) => { const g = glides.get(s); return [s.offsetLeft - (g?.ax ?? 0), s.offsetTop - (g?.ay ?? 0)]; }) : null;
  for (const [s, l] of changed) {
    const turned = smooth && !!l.c.trim() && altFace(s.dataset.s ?? '') !== altFace(l.s);
    if (s.textContent !== l.c) s.textContent = l.c;
    s.dataset.s = l.s;
    s.setAttribute('style', l.s);
    if (turned) {
      const g = glides.get(s) ?? { ax: 0, ay: 0, vx: 0, vy: 0, last: now, b0: -1 };
      g.b0 = now;
      glides.set(s, g);
    }
  }
  if (before) {
    // a letter some neighbour moved starts its glide from where it was seen
    f.spans.forEach((s, i) => {
      const g0 = glides.get(s);
      const dx = before[i][0] - (s.offsetLeft - (s.style.left ? g0?.ax ?? 0 : 0));
      const dy = before[i][1] - (s.offsetTop - (s.style.top ? g0?.ay ?? 0 : 0));
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      // the offset jumps by the shove, so the letter is seen where it was; its velocity carries on
      const g = g0 ?? { ax: 0, ay: 0, vx: 0, vy: 0, last: now, b0: -1 };
      g.ax += dx;
      g.ay += dy;
      glides.set(s, g);
    });
  }
  // every letter's style: its own, plus any glide or blur still running
  f.spans.forEach((s) => {
    const g = glides.get(s);
    let extra = '';
    if (g) {
      const dt = Math.min(0.05, Math.max(0, (now - g.last) / 1000));
      g.last = now;
      [g.ax, g.vx] = spring(g.ax, g.vx, dt);
      [g.ay, g.vy] = spring(g.ay, g.vy, dt);
      const blur = g.b0 >= 0 ? 2 * (1 - easeOut((now - g.b0) / BLUR_MS)) : 0;
      if (Math.abs(g.ax) < 0.05 && Math.abs(g.ay) < 0.05 && Math.abs(g.vx) < 2 && Math.abs(g.vy) < 2 && blur < 0.05) glides.delete(s);
      else extra = `position:relative;left:${g.ax.toFixed(2)}px;top:${g.ay.toFixed(2)}px;${blur > 0.05 ? `filter:blur(${blur.toFixed(2)}px);` : ''}`;
    }
    const own = s.dataset.s ?? s.getAttribute('style') ?? '';
    const want = own + extra;
    if ((s.getAttribute('style') ?? '') !== want) s.setAttribute('style', want);
  });
  const base = f.ov.dataset.base ?? (f.ov.dataset.base = f.ov.style.cssText);
  const want = ovStyle ? `${base};${ovStyle}` : base;
  if (f.ov.style.cssText !== want) f.ov.style.cssText = want;
}

/** Still gliding or blurring: the clock keeps painting. */
export function settling(fs: readonly Face[]): boolean {
  return fs.some((f) => f.spans.some((s) => glides.has(s)));
}

/**
 * Leaving by the pointer: the overlay fades out over 90ms, a little blurred,
 * as the resting word's own ink comes back, so the word is never two words
 * at once and never jumps. `unface` then takes it away.
 */
export function fade(fs: readonly Face[]): void {
  fs.forEach(({ w, ov }) => {
    ov.style.transition = 'opacity 90ms cubic-bezier(.23,1,.32,1), filter 90ms cubic-bezier(.23,1,.32,1)';
    ov.style.opacity = '0';
    ov.style.filter = 'blur(2px)';
    w.style.transition = 'color 90ms cubic-bezier(.23,1,.32,1)';
    w.style.color = '';
  });
}

/** The resting word shows again (Mark lets the word rest in its own ink), or goes clear. Hide the overlay with `paint(..., 'visibility:hidden')`. */
export function rest(f: Face, shown: boolean): void {
  const c = shown ? '' : 'transparent';
  if (f.w.style.color !== c) f.w.style.color = c;
}

/** Instant: drop the overlay and give the resting word its ink back. */
export function unface(fs: readonly Face[]): void {
  fs.forEach(({ w, ov }) => {
    ov.remove();
    w.style.transition = '';
    w.style.color = '';
  });
}
