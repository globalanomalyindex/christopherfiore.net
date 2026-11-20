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

import { ALT as ALT_FACE, tail, type Letter } from './ink.ts';

export { tail };

const ALT = "'Dessign Maison', Georgia, serif";
const FEAT = "'salt' 1, 'ss01' 1";
/**
 * The alternate is set a step larger than the mono it replaces. Dessign
 * Maison is a narrow display serif with a low x-height; at 1.14em its
 * lowercase stands as tall as Iosevka Charon Mono's.
 */
const ALT_SIZE = '1.14em';

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
    if (!txt.trim()) return;

    const range = document.createRange();
    range.selectNodeContents(w);
    const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
    if (lines !== 1) return;

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
 * Where the resting label's lines start: the index, by character (code
 * point, as the overlay's spans are cut), of the first letter of each line
 * after the first. Empty when the label sits on one line. A space belongs to
 * the line it ends, so a line always starts on a letter, or mid-word where a
 * long word had to break.
 */
function lineStarts(w: HTMLElement): number[] {
  const nodes = Array.from(w.childNodes).filter((n): n is Text => n.nodeType === Node.TEXT_NODE);
  const range = document.createRange();
  range.selectNodeContents(w);
  if (new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size < 2) return [];
  const starts: number[] = [];
  let line: DOMRect | null = null;
  let k = 0;
  for (const n of nodes) {
    let i = 0;
    for (const ch of n.nodeValue ?? '') {
      if (ch.trim()) {
        range.setStart(n, i);
        range.setEnd(n, i + ch.length);
        const q = range.getClientRects()[0];
        if (q) {
          // a new line: this letter sits below the middle of the line before
          if (line && q.top >= (line.top + line.bottom) / 2) starts.push(k);
          if (!line || q.top >= (line.top + line.bottom) / 2) line = q;
        }
      }
      i += ch.length;
      k++;
    }
  }
  return starts;
}

/** Each line of an overlay, as its letter spans: the lines are the runs between its forced breaks. */
const linesOf = (ov: HTMLElement): HTMLSpanElement[][] => {
  const out: HTMLSpanElement[][] = [[]];
  for (const c of Array.from(ov.children)) {
    if (c.tagName === 'BR') out.push([]);
    else out[out.length - 1].push(c as HTMLSpanElement);
  }
  return out;
};

/** How far each line of an overlay reaches, in px from its left edge, to its furthest inked letter. */
const lineWidths = (ov: HTMLElement): number[] => {
  const o = ov.getBoundingClientRect().left;
  return linesOf(ov).map((ln) => Math.max(0, ...ln.filter((s) => (s.textContent ?? '').trim()).map((s) => s.getBoundingClientRect().right - o)));
};

/**
 * Lay an overlay over every label in `b`. The resting word goes clear and
 * the overlay, the same text plus its tail, takes its place, inside the box
 * `reserve()` kept for it. The clock paints the overlay; nothing here moves.
 *
 * LINES LOCKED (his note: "the words to not shift from non-hover to hover").
 * A label that wraps at rest gets an overlay that never wraps on its own: it
 * is set nowrap with a forced break before the first letter of each resting
 * line, so the hover has exactly the resting lines and no word can change
 * line. If the last line and its "..." would be wider than the cell in the
 * glitch face, that label goes without its tail. A line still too wide (a
 * run of capitals, say) is narrowed as a whole to fit, never wrapped.
 *
 * LINES LEVEL. The overlay keeps the resting line-height, and its letters add
 * nothing to the line box (`[data-glitch] > span` in site.css), so every
 * baseline sits where it was at rest and the pitch between lines holds.
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
    // the content box, unrounded: the room every line of the overlay has
    const cw = parseFloat(cs.width);
    const room = cw ? cw - (cs.boxSizing === 'border-box' ? pl + pr : 0) : w.clientWidth - pl - pr;
    const starts = lineStarts(w);
    const ov = document.createElement('span');
    ov.setAttribute('aria-hidden', 'true');
    ov.setAttribute('data-glitch', '');
    ov.style.cssText =
      `position:absolute;left:${pl}px;top:${pt}px;width:${room}px;` +
      `pointer-events:none;white-space:nowrap;text-align:${cs.textAlign}`;
    const n = Array.from(txt).length;
    const spans = Array.from(txt + tail(txt)).map((ch, i) => {
      if (starts.includes(i)) ov.appendChild(document.createElement('br'));
      const s = document.createElement('span');
      s.textContent = ch;
      ov.appendChild(s);
      return s;
    });
    w.appendChild(ov);
    if (starts.length) {
      // measured in the face the hover lands in: every letter in the glitch face, spaces in the mono
      spans.forEach((s) => {
        if (s.textContent?.trim()) s.setAttribute('style', ALT_FACE);
      });
      // in layout px: a press may already be scaling the button
      const k = w.getBoundingClientRect().width / (room + pl + pr || 1) || 1;
      let widths = lineWidths(ov).map((x) => x / k);
      if (spans.length > n && widths[widths.length - 1] > room + 0.5) {
        spans.splice(n).forEach((s) => s.remove());
        widths = lineWidths(ov).map((x) => x / k);
      }
      const widest = Math.max(...widths);
      if (widest > room + 0.5) {
        const o = cs.textAlign === 'right' || cs.textAlign === 'end' ? '100%' : cs.textAlign === 'center' ? '50%' : '0';
        ov.style.transform = `scaleX(${(room / widest).toFixed(4)})`;
        ov.style.transformOrigin = `${o} 0`;
      }
      spans.forEach((s) => s.removeAttribute('style'));
    }
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
