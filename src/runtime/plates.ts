/**
 * Plates: solid white bars under a button's text whenever a skeleton's X runs
 * behind it (his note: "solid white bars under the text that animate in and
 * out when the X appears ... crosshairs on the corners").
 *
 * One bar per line of text: the label, the tag's ruled box, each line of the
 * figure or detail. Each wipes in from its own left edge, the way the line
 * reads, 40ms after the line before it, over 180ms on the site's ease-out,
 * and a "+" in Chickpea's measure ink lands on each of its corners as it
 * arrives. Leaving, they wipe back in 90ms. The bars follow the text's own
 * box every frame, so they stretch with the letters as they glide. Over the X,
 * under the type.
 */

const PAD_X = 0.2;
const PAD_Y = 0.06;

/** Every line of text in the button, in its own coordinates. */
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
  // the figure or the detail, one bar per line
  b.querySelectorAll<HTMLElement>('.n, .l').forEach((f) => {
    if (!f.textContent?.trim()) return;
    const range = document.createRange();
    range.selectNodeContents(f);
    const byLine = new Map<number, DOMRect>();
    for (const r of range.getClientRects()) {
      if (r.width < 0.5) continue;
      const k = Math.round(r.top);
      const prev = byLine.get(k);
      byLine.set(k, prev ? new DOMRect(Math.min(prev.left, r.left), Math.min(prev.top, r.top), Math.max(prev.right, r.right) - Math.min(prev.left, r.left), Math.max(prev.bottom, r.bottom) - Math.min(prev.top, r.top)) : r);
    }
    byLine.forEach(add);
  });
  return out;
}

/**
 * Lay the plates under the text of `b`, after `after` (so over the X, under
 * the type), and keep them on the text. Call every frame while the X is up.
 */
export function plates(b: HTMLElement, after: Element, el: HTMLSpanElement | null): HTMLSpanElement {
  if (!el) {
    el = document.createElement('span');
    el.setAttribute('data-plates', '');
    el.setAttribute('aria-hidden', 'true');
    b.insertBefore(el, after.nextSibling);
    // the wipe needs a first frame at its start
    requestAnimationFrame(() => requestAnimationFrame(() => el?.classList.add('on')));
  }
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const fs = parseFloat(getComputedStyle(b).fontSize) || 16;
  const ls = lines(b);
  while (el.children.length < ls.length * 2) {
    const i = el.children.length / 2;
    const bar = document.createElement('span');
    bar.className = 'pl';
    bar.style.setProperty('--d', `${i * 40}ms`);
    const px = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    px.setAttribute('class', 'px');
    px.style.setProperty('--d', `${i * 40}ms`);
    px.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    el.append(bar, px);
  }
  while (el.children.length > ls.length * 2) el.lastElementChild!.remove();
  ls.forEach((q, i) => {
    const x = (q.left - r.left) / sc - PAD_X * fs;
    // never past the button's own top and bottom: the glitch face's line box runs taller than the row
    const y = Math.max(0, (q.top - r.top) / sc - PAD_Y * fs);
    const w = q.width / sc + 2 * PAD_X * fs;
    const h = Math.min(b.offsetHeight - y, (q.bottom - r.top) / sc + PAD_Y * fs - y);
    const box = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`;
    const bar = el!.children[i * 2] as HTMLSpanElement;
    const px = el!.children[i * 2 + 1] as SVGSVGElement;
    if (bar.dataset.box !== box) {
      bar.dataset.box = box;
      bar.style.cssText = `${box};--d:${i * 40}ms`;
      px.setAttribute('style', `${box};--d:${i * 40}ms`);
      // a "+" on each corner, 4px arms
      const c = [[0, 0], [w, 0], [0, h], [w, h]].map(([cx, cy]) => `M${(cx - 4).toFixed(1)} ${cy.toFixed(1)}H${(cx + 4).toFixed(1)}M${cx.toFixed(1)} ${(cy - 4).toFixed(1)}V${(cy + 4).toFixed(1)}`).join('');
      px.firstElementChild!.setAttribute('d', c);
    }
  });
  return el;
}

/** Leaving: the plates wipe back. */
export function platesOff(el: HTMLSpanElement | null): void {
  el?.classList.remove('on');
}
