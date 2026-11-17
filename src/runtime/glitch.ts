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

/** Paint one frame of letters onto a face. Writes only what changed. */
export function paint(f: Face, ls: readonly Letter[], ovStyle: string | null): void {
  f.spans.forEach((s, i) => {
    const l = ls[i];
    if (!l) return;
    if (s.textContent !== l.c) s.textContent = l.c;
    if ((s.getAttribute('style') ?? '') !== l.s) s.setAttribute('style', l.s);
  });
  const base = f.ov.dataset.base ?? (f.ov.dataset.base = f.ov.style.cssText);
  const want = ovStyle ? `${base};${ovStyle}` : base;
  if (f.ov.style.cssText !== want) f.ov.style.cssText = want;
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
    w.style.color = '';
  });
}
