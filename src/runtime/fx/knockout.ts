/**
 * Knockout, from the motion archive: a deep step of the band's own colour
 * spreads out from where the pointer rested, the text knocked out of it in
 * ground ink, then it blinks.
 *
 *   spread   step4's four drawings (half, 80%, 94%, all of it, 50ms apart).
 *            On each band of the text grid the left edge is the nearest clear
 *            seam at or left of the spread's edge and the right edge the
 *            nearest at or right of it, so the deep step is a stepped shape
 *            that never cuts a word and only grows
 *   legible  every glyph on the deep step is ground ink, which the deep step
 *            holds at 4.5:1: a copy of the label's letters (each at its own
 *            measured rect), the tag and each block of detail, every span
 *            given its colour inline, since the stylesheet pins band ink on
 *            every descendant of a hot button. Once the spread is whole the
 *            originals are hidden under the copies, visually only, so no dark
 *            fringe shows
 *   blink    the deep step and its copies go for two drawings, 250 to 350ms
 *            after the rest, and the originals show
 *
 * It reads the pointer once, at the dwell, so it needs no follow. (An effect
 * that reads the live pointer after its last drawing must return follow: true,
 * or it stops answering when the clock stops 900ms after the dwell.)
 */

import { mix } from '../band.ts';
import type { Hot, Look } from '../buttons.ts';
import { step4 } from '../ink.ts';
import { widthOf } from '../cells.ts';
import { atOrLeft, atOrRight, textGrid } from './textgrid.ts';

const GROUND = '#F3F5F8';
const BAND_INK = '#1A1820';

const lumOf = (hex: string): number =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
/** A deep step of the band's own colour, not black, deep enough that ground ink on it holds 4.5:1. */
const deepOf = (main: string): string => {
  for (let k = 0.55; k < 0.95; k += 0.05) {
    const c = mix(main, BAND_INK, k);
    if ((lumOf(GROUND) + 0.05) / (lumOf(c) + 0.05) >= 4.5) return c;
  }
  return BAND_INK;
};

interface Ko {
  deep: string;
  kc: HTMLSpanElement | null;
  /** the originals the copies cover: the tag and the detail blocks */
  under: HTMLElement[];
  /** each letter of the glitch face with its copy, and the glide the copy last took from it */
  pairs: { sp: HTMLSpanElement; c: HTMLSpanElement; tr: string }[];
}
const kos = new WeakMap<Hot, Ko>();

/** The text style a copy needs to set its glyphs exactly where the original's are. */
const FONT = 'font-family font-size font-weight font-style font-feature-settings font-variant font-kerning letter-spacing word-spacing text-transform'.split(' ');
const BLOCK = [...FONT, ...'line-height text-align text-indent white-space overflow-wrap word-break hyphens tab-size padding-top padding-right padding-bottom padding-left'.split(' ')];
const copyStyle = (cs: CSSStyleDeclaration, keys: string[]): string => keys.map((k) => `${k}:${cs.getPropertyValue(k)}`).join(';');

/** The ground-ink copies of every glyph on the row, placed from measured rects. */
function copies(h: Hot, ko: Ko): HTMLSpanElement {
  const b = h.b;
  const r = b.getBoundingClientRect();
  // the button's scale against its unrounded width: against offsetWidth, a
  // whole number, every size here came out up to a quarter pixel small
  const sc = r.width / (widthOf(b) || r.width) || 1;
  const kc = document.createElement('span');
  kc.setAttribute('data-k', 'kc');
  kc.setAttribute('aria-hidden', 'true');
  const at = (q: DOMRect, dx = 0, dy = 0) => `left:${((q.left - r.left) / sc - dx).toFixed(2)}px;top:${((q.top - r.top) / sc - dy).toFixed(2)}px`;
  // a glyph run at its own rect: a line box exactly the rect's height puts the glyph on the original,
  // and the original's width keeps its kerned advance (a letter alone would set a little wider)
  const glyphs = (of: string, text: string, q: DOMRect, cs: CSSStyleDeclaration, dx = 0, dy = 0): HTMLSpanElement => {
    const s = document.createElement('span');
    s.textContent = text;
    s.dataset.ko = of;
    s.setAttribute('style', `position:absolute;${at(q, dx, dy)};width:${(q.width / sc).toFixed(2)}px;height:${(q.height / sc).toFixed(2)}px;line-height:${(q.height / sc).toFixed(2)}px;white-space:pre;overflow:visible;margin:0;padding:0;${copyStyle(cs, FONT)};color:${GROUND}`);
    kc.appendChild(s);
    return s;
  };
  // the label: one copy per letter of the glitch face, where the letter rests
  for (const f of h.faces)
    for (const sp of f.spans) {
      if (!(sp.textContent ?? '').trim()) continue;
      const c = glyphs('l', sp.textContent!, sp.getBoundingClientRect(), getComputedStyle(sp), parseFloat(sp.style.left) || 0, parseFloat(sp.style.top) || 0);
      ko.pairs.push({ sp, c, tr: '' });
    }
  // the tag: its ruled box in ground ink, and its words
  for (const tag of Array.from(b.querySelectorAll<HTMLElement>('.cs > span'))) {
    const q = tag.getBoundingClientRect();
    const ring = document.createElement('span');
    ring.dataset.ko = 'ring';
    ring.setAttribute('style', `position:absolute;${at(q)};width:${(q.width / sc).toFixed(2)}px;height:${(q.height / sc).toFixed(2)}px;box-shadow:inset 0 0 0 1px ${GROUND}`);
    kc.appendChild(ring);
    const rg = document.createRange();
    rg.selectNodeContents(tag);
    glyphs('t', tag.textContent ?? '', rg.getBoundingClientRect(), getComputedStyle(tag));
    ko.under.push(tag);
  }
  // the detail or figure: a clone in the same box. It takes the original's own
  // layout width, to the fraction, so it wraps exactly where the original does:
  // a clone a quarter pixel narrower sent the last word of a full line down a line
  for (const el of Array.from(b.querySelectorAll<HTMLElement>('.l, .n'))) {
    if (!(el.textContent ?? '').trim()) continue;
    const q = el.getBoundingClientRect();
    const c = el.cloneNode(true) as HTMLElement;
    c.removeAttribute('class');
    c.dataset.ko = 'd';
    c.setAttribute('style', `position:absolute;${at(q)};width:${widthOf(el)}px;box-sizing:border-box;margin:0;display:block;${copyStyle(getComputedStyle(el), BLOCK)};color:${GROUND}`);
    c.querySelectorAll<HTMLElement>('*').forEach((d) => (d.style.color = GROUND));
    kc.appendChild(c);
    ko.under.push(el);
  }
  b.appendChild(kc);
  return kc;
}

export function knockoutLook(h: Hot, t: number): Look {
  let ko = kos.get(h);
  if (!ko) {
    ko = { deep: deepOf(h.P.main), kc: null, under: [], pairs: [] };
    kos.set(h, ko);
  }
  const g = textGrid(h);
  const x0 = Math.max(0, Math.min(g.bw, h.px0 ?? g.bw / 2));
  const p = h.instant ? 1 : step4(t);
  const left = x0 * (1 - p);
  const right = x0 + (g.bw - x0) * p;
  // the stepped shape: down the right edges band by band, back up the left
  const pts: string[] = [];
  g.bands.forEach((b) => {
    const R = atOrRight(b.seams, right).toFixed(2);
    pts.push(`${R}px ${b.top.toFixed(2)}px`, `${R}px ${b.bottom.toFixed(2)}px`);
  });
  for (let i = g.bands.length - 1; i >= 0; i--) {
    const b = g.bands[i];
    const L = atOrLeft(b.seams, left).toFixed(2);
    pts.push(`${L}px ${b.bottom.toFixed(2)}px`, `${L}px ${b.top.toFixed(2)}px`);
  }
  const blink = !h.instant && t >= 250 && t < 350;
  const clip = `clip-path:polygon(${pts.join(',')});visibility:${blink ? 'hidden' : 'visible'}`;
  // whole and not blinking: the originals hide under their copies
  const hide = p >= 1 && !blink;
  const k = ko;
  return {
    extra: [{ c: 'ko', s: `position:absolute;inset:0;background:${ko.deep};${clip}` }],
    ovS: hide ? 'opacity:0' : undefined,
    own: (hh) => {
      if (!k.kc || !k.kc.isConnected) k.kc = copies(hh, k);
      const want = `position:absolute;inset:0;z-index:1;pointer-events:none;${clip}`;
      if (k.kc.getAttribute('style') !== want) k.kc.setAttribute('style', want);
      // A letter may still be gliding its last pixel into place after the glitch
      // (glitch.ts moves it by `left` and `top`). Its copy rides the same glide,
      // so no dark edge of the original ever shows beside it.
      for (const q of k.pairs) {
        const tr = q.sp.style.left ? `${q.sp.style.left} ${q.sp.style.top || '0px'}` : '';
        if (q.tr !== tr) q.c.style.translate = q.tr = tr;
      }
      for (const el of k.under) {
        const op = hide ? '0' : '';
        if (el.style.opacity !== op) el.style.opacity = op;
      }
    },
  };
}

/** Leaving: every copy gone and every original back, in the same frame. */
export function knockoutCut(h: Hot): void {
  const ko = kos.get(h);
  if (ko) for (const el of ko.under) el.style.opacity = '';
  h.b.querySelectorAll(':scope > [data-k="kc"]').forEach((n) => n.remove());
  kos.delete(h);
}
