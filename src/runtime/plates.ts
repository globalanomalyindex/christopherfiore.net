/**
 * Plates: JellyBox glass under a button's text whenever a skeleton's X runs
 * behind it (his notes: "bars under the text that animate in and out when the
 * X appears ... crosshairs on the corners", then "some color variation ... or
 * like a liquid glass-type thing instead of a solid white bar").
 *
 * Each plate is JellyBox's own CSS material skin (the one the back X wears
 * with no WebGL), each in its own readable JellyBox pigment, so the plates
 * vary in colour and the label always holds band ink at 4.5:1 on them.
 *
 * ALIGNED, NOT SCATTERED. Every plate sits on the page's own grid: its sides
 * on the mono cell, its top and bottom on the line's own pitch, so plates on
 * one line share them and plates on consecutive lines meet. A "+" in
 * Chickpea's measure ink marks each distinct corner once, so stacked plates
 * share their crosses and every cross lands on a grid line.
 *
 * One plate per line of text: the label, the tag's ruled box, each line of
 * the figure or detail. Each wipes in from its own left edge, the way the
 * line reads, 40ms after the line before it, over 180ms on the site's
 * ease-out; the crosses come in together once the last plate has landed.
 * Leaving, they wipe back in 90ms. Over the X, under the type.
 */

import { glassTriples } from './jx.ts';

const PAD = 0.15;
const NS = 'http://www.w3.org/2000/svg';

/** Every line of text in the button, as screen rects. */
function lines(b: HTMLElement): DOMRect[] {
  const out: DOMRect[] = [];
  const add = (r: DOMRect) => {
    if (r.width > 0.5 && r.height > 0.5) out.push(r);
  };
  // the label: the glitch's overlay while it is up, else the resting word
  b.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
    const ov = w.querySelector('[data-glitch]');
    const range = document.createRange();
    range.selectNodeContents(ov ?? w);
    add(range.getBoundingClientRect());
  });
  b.querySelectorAll<HTMLElement>('.cs > span').forEach((t) => add(t.getBoundingClientRect()));
  // the figure or the detail, one per line
  b.querySelectorAll<HTMLElement>('.n, .l').forEach((f) => {
    if (!f.textContent?.trim()) return;
    const range = document.createRange();
    range.selectNodeContents(f);
    const byLine = new Map<number, DOMRect>();
    for (const r of range.getClientRects()) {
      if (r.width < 0.5) continue;
      const k = Math.round(r.top);
      const p = byLine.get(k);
      byLine.set(k, p ? new DOMRect(Math.min(p.left, r.left), Math.min(p.top, r.top), Math.max(p.right, r.right) - Math.min(p.left, r.left), Math.max(p.bottom, r.bottom) - Math.min(p.top, r.top)) : r);
    }
    byLine.forEach(add);
  });
  return out;
}

/**
 * Lay the plates under the text of `b`, after `after` (over the X, under the
 * type), and keep them on the text. Call every frame while the X is up.
 */
export function plates(b: HTMLElement, after: Element, el: HTMLSpanElement | null): HTMLSpanElement {
  if (!el) {
    el = document.createElement('span');
    el.setAttribute('data-plates', '');
    el.setAttribute('aria-hidden', 'true');
    const crosses = document.createElementNS(NS, 'svg');
    crosses.setAttribute('class', 'px');
    crosses.appendChild(document.createElementNS(NS, 'path'));
    el.appendChild(crosses);
    // a pigment per plate, shuffled, so neighbours never share one
    const pig = glassTriples();
    for (let i = pig.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pig[i], pig[j]] = [pig[j], pig[i]];
    }
    el.dataset.pig = pig.join('|');
    b.insertBefore(el, after.nextSibling);
    // the wipe needs a first frame at its start
    requestAnimationFrame(() => requestAnimationFrame(() => el?.classList.add('on')));
  }
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const cs = getComputedStyle(b);
  const fs = parseFloat(cs.fontSize) || 16;
  const cell = fs / 2;
  const pitch = parseFloat(cs.lineHeight) || fs * 1.3333;
  const bh = b.offsetHeight;
  const rs = lines(b);
  // the line grid starts on the first line of text
  const origin = Math.min(...rs.map((q) => (q.top - r.top) / sc));
  const boxes = rs.map((q) => {
    // on the mono cell, and never past the button's own sides
    const x0 = Math.max(0, Math.floor(((q.left - r.left) / sc - PAD * fs) / cell) * cell);
    const x1 = Math.min(b.offsetWidth, Math.ceil(((q.right - r.left) / sc + PAD * fs) / cell) * cell);
    const k = Math.round(((q.top - r.top) / sc - origin) / pitch);
    const y0 = Math.max(0, origin + k * pitch);
    const y1 = Math.min(bh, origin + (k + 1) * pitch);
    return [x0, y0, x1, y1];
  });
  const pig = (el.dataset.pig ?? '').split('|');
  const crosses = el.firstElementChild as SVGSVGElement;
  while (el.children.length - 1 < boxes.length) {
    const bar = document.createElement('span');
    bar.className = 'pl';
    el.appendChild(bar);
  }
  while (el.children.length - 1 > boxes.length) el.lastElementChild!.remove();
  const corners = new Map<string, [number, number]>();
  boxes.forEach(([x0, y0, x1, y1], i) => {
    const bar = el!.children[i + 1] as HTMLSpanElement;
    const box = `left:${x0.toFixed(1)}px;top:${y0.toFixed(1)}px;width:${(x1 - x0).toFixed(1)}px;height:${(y1 - y0).toFixed(1)}px;--d:${i * 40}ms;--jb-rgb:${pig[i % pig.length] || '92 176 243'}`;
    if (bar.dataset.box !== box) {
      bar.dataset.box = box;
      bar.style.cssText = box;
    }
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) corners.set(`${Math.round(cx)},${Math.round(cy)}`, [cx, cy]);
  });
  // one "+" per distinct corner, all landing once the last plate is in
  const d = [...corners.values()].map(([cx, cy]) => `M${(cx - 4).toFixed(1)} ${cy.toFixed(1)}H${(cx + 4).toFixed(1)}M${cx.toFixed(1)} ${(cy - 4).toFixed(1)}V${(cy + 4).toFixed(1)}`).join('');
  const path = crosses.firstElementChild!;
  if (path.getAttribute('d') !== d) path.setAttribute('d', d);
  const delay = `${boxes.length * 40 + 100}ms`;
  if (crosses.style.getPropertyValue('--d') !== delay) crosses.style.setProperty('--d', delay);
  return el;
}

/** Leaving: the plates wipe back. */
export function platesOff(el: HTMLSpanElement | null): void {
  el?.classList.remove('on');
}
