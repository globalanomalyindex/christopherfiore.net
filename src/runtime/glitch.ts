/**
 * The glitch into Dessign Maison's alternates (README §7.2).
 *
 * HOVER MUST NEVER CHANGE LAYOUT. Two things make that true:
 *
 * 1. Every label reserves the wider of its two widths up front: Averia at
 *    rest, and the alternate plus its "..." tail on hover. Both states then
 *    keep their own natural spacing and nothing around the word reflows.
 * 2. The glitch never touches the resting text. The resting word goes
 *    transparent and an aria-hidden overlay of the same text flips letter by
 *    letter on top of it, inside the reserved box.
 *
 * The reservation is written in em, not px, so it scales with the fluid type
 * scale instead of going stale on every resize.
 */

import { pick } from './band.ts';

const ALT = "'Dessign Maison', Georgia, serif";
const FEAT = "'salt' 1, 'ss01' 1";
/**
 * Each flash is a band color's darker twin: the same hue, taken down to about
 * 3.3:1 against band ink. The first seven are the lattice site's; the rest
 * are twins of the colors band.ts added, less a few too close to tell apart.
 */
const FLASH = [
  '#c9246b', '#796b05', '#0a777f', '#b44b12', '#5f7313', '#2B45F5', '#1c7869',
  '#d12100', '#a55600', '#8d6400', '#3c7900', '#007b4c', '#0071aa', '#4865c3',
  '#854ec9', '#a436ca', '#bc00c5', '#c210a9', '#cb008e', '#a44b86',
] as const;

/** 2 letters per 28ms tick, each with a 70ms flash; 25% chance a tick knocks one back. */
const TICK = 28;
const PER_TICK = 2;
const FLASH_MS = 70;
const KNOCK_BACK = 0.25;
const SETTLE = 80;

/** Hover text gets a trailing ellipsis to even out its spacing; never on an address. */
export const tail = (label: string): string => (label.includes('@') ? '' : '...');

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
        (alt ? `;font-family:${ALT};font-feature-settings:${FEAT}` : '');
      w.appendChild(s);
      const width = s.getBoundingClientRect().width;
      s.remove();
      return width;
    };

    const restW = probe(false);
    const altW = probe(true);
    if (altW <= restW + 0.5) return;

    const fs = parseFloat(getComputedStyle(w).fontSize) || 16;

    // Never reserve a box wider than the room it has. On a narrow screen that
    // would push the page sideways or out of its frame; the overlay just
    // overhangs instead. A button glued to its punctuation has 0.5em less
    // (`.glue > .btn` in site.css).
    const block = w.closest<HTMLElement>('[data-seams], p, nav, figcaption');
    const btn = w.closest<HTMLElement>('[data-btn]');
    if (block && btn) {
      const room = block.clientWidth - (btn.parentElement?.classList.contains('glue') ? 0.5 * fs : 0);
      if (btn.getBoundingClientRect().width + (altW - restW) > room) return;
    }

    w.style.minWidth = `${(Math.ceil(altW) / fs).toFixed(4)}em`;
    // In an inline-flex button the extra width is split either side, so the
    // resting label still looks centered in its box.
    const parent = w.parentElement ? getComputedStyle(w.parentElement).display : '';
    if (parent === 'inline-flex' || parent === 'flex') w.style.textAlign = 'center';
  });
}

export interface Alt {
  words: { w: HTMLElement; ov: HTMLSpanElement; spans: HTMLSpanElement[] }[];
  tick: number;
  timers: number[];
  done: boolean;
}

const setAlt = (s: HTMLElement) => {
  s.style.fontFamily = ALT;
  s.style.fontFeatureSettings = FEAT;
};
const setRest = (s: HTMLElement) => {
  s.style.fontFamily = '';
  s.style.fontFeatureSettings = '';
};

/**
 * Lay the overlay over every label in `b` and glitch it into the alternates.
 * `instant` skips the flip and shows the final state: reduced motion, touch.
 */
export function altIn(b: HTMLElement, instant: boolean): Alt {
  const st: Alt = { words: [], tick: 0, timers: [], done: false };

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
    st.words.push({ w, ov, spans });
  });

  if (!st.words.length) return st;

  const finish = () => {
    if (st.done) return;
    st.done = true;
    clearInterval(st.tick);
    st.words.forEach((x) => x.spans.forEach(setAlt));
  };
  if (instant) {
    finish();
    return st;
  }

  // Non-space letters, in random order.
  const pending = st.words
    .flatMap((x) => x.spans.filter((s) => (s.textContent ?? '').trim()))
    .sort(() => Math.random() - 0.5);
  const flipped: HTMLSpanElement[] = [];

  st.tick = window.setInterval(() => {
    if (flipped.length > 2 && Math.random() < KNOCK_BACK) {
      const s = flipped.splice((Math.random() * flipped.length) | 0, 1)[0];
      setRest(s);
      pending.push(s);
    }
    for (let i = 0; i < PER_TICK && pending.length; i++) {
      const s = pending.shift()!;
      setAlt(s);
      s.style.color = pick(FLASH);
      st.timers.push(window.setTimeout(() => (s.style.color = ''), FLASH_MS));
      flipped.push(s);
    }
    if (!pending.length) {
      clearInterval(st.tick);
      st.timers.push(window.setTimeout(finish, SETTLE));
    }
  }, TICK);

  return st;
}

/** Instant: drop the overlay and give the resting word its ink back. */
export function altOut(st: Alt): void {
  clearInterval(st.tick);
  st.timers.forEach(clearTimeout);
  st.done = true;
  st.words.forEach(({ w, ov }) => {
    ov.remove();
    w.style.color = '';
  });
}
