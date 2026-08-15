/**
 * The glass pointer — the site's only cursor.
 *
 * WHY IT IS A DOM ELEMENT AND NOT `cursor: url(...)`. A CSS cursor is a bitmap
 * the compositor stamps on top of the page. It cannot read what is underneath
 * it, so it cannot blur, refract, or bend anything. Everything asked for here
 * is a function of the pixels below the arrow, so the arrow has to be an
 * element that owns a `backdrop-filter`, and the OS cursor has to go.
 *
 * THREE THINGS MAKE IT READ AS GLASS, and they are separable:
 *
 *   blur + saturate + brightness   the frosted body. What is underneath stays
 *                                  legible and is visibly softened.
 *   feDisplacementMap              the refraction. A low-frequency noise field
 *                                  displaces the backdrop, so the page bends
 *                                  under the arrow and shears at its edges.
 *                                  This is the part a bitmap cursor cannot do.
 *   a two-tone rim                 the edge, and the legibility guarantee.
 *
 * THE RIM IS TWO-TONE FOR A REASON THIS REPO ALREADY WROTE DOWN. A glass arrow
 * has no colour of its own, so on the paper screens a light rim disappears and
 * on the case studies' near-black a dark one does. So it carries a dark stroke
 * with a lighter one drawn inside it, which is the same trick
 * `public/three-zones/index.html` uses for a focus ring that has to survive
 * both a white photo and a dark one. One of the two always reads.
 *
 * No drop shadow, per `base.css`: depth on this site is hairlines and 1px
 * frames. The two-tone rim is what separates the arrow from its ground, and it
 * does the job on both ends of the palette without breaking that rule.
 *
 * PINPOINT ACCURACY. The apex of the drawn path sits at viewBox (3.4775,
 * 3.4727) — measured off the rendered geometry with `getPointAtLength`, not
 * eyeballed off the path data. The box is offset by exactly that, and it is
 * SCALED ABOUT THAT SAME POINT, so the apex is the one place in the artwork
 * that does not move when the size changes. Growing the cursor cannot walk the
 * hotspot off the pointer.
 *
 * WHAT THIS BREAKS IF YOU ARE NOT CAREFUL, and it is not obvious: `hover.ts`
 * decides what a control IS by reading `getComputedStyle(el).cursor` and
 * looking for `pointer`. Hiding the OS cursor makes that read "none" on every
 * element on the site, which would silently unbind all 84 controls. So
 * `markPointers` runs over the whole document BEFORE the hide, and hover.ts
 * remembers what it found. Order is load-bearing; see `install`.
 */

import { qq } from '../dom.ts';
import { markPointers } from './hover.ts';

/** The arrow, in its own 24 unit space. Unchanged from the source artwork. */
const ARROW =
  'M20.5056 10.7754C21.1225 10.5355 21.431 10.4155 21.5176 10.2459C21.5926 10.099 21.5903 ' +
  '9.92446 21.5115 9.77954C21.4205 9.61226 21.109 9.50044 20.486 9.2768L4.59629 3.5728C4.0866 ' +
  '3.38983 3.83175 3.29835 3.66514 3.35605C3.52029 3.40621 3.40645 3.52004 3.35629 ' +
  '3.6649C3.29859 3.8315 3.39008 4.08635 3.57304 4.59605L9.277 20.4858C9.50064 21.1088 ' +
  '9.61246 21.4203 9.77973 21.5113C9.92465 21.5901 10.0991 21.5924 10.2461 21.5174C10.4157 ' +
  '21.4308 10.5356 21.1223 10.7756 20.5054L13.3724 13.8278C13.4194 13.707 13.4429 13.6466 ' +
  '13.4792 13.5957C13.5114 13.5506 13.5508 13.5112 13.5959 13.479C13.6468 13.4427 13.7072 ' +
  '13.4192 13.828 13.3722L20.5056 10.7754Z';

/**
 * The apex, in viewBox units. Measured, not read off the path data: the corner
 * is a rounded join, so the extreme point along the diagonal is not any of the
 * control points near it.
 */
const TIP = { x: 3.4775, y: 3.4727 };

/**
 * How much bigger than the system arrow.
 *
 * The artwork's ink spans 18.233 of its 24 units, so at 1.375 it draws about
 * 25px tall against the macOS arrow's ~20px. Slightly larger, which is what
 * was asked for, and still small enough to point with.
 */
const SCALE = 1.375;

/** Nothing to do where there is no pointer to replace. */
const FINE = '(hover: hover) and (pointer: fine)';

let raf = 0;
let px = 0;
let py = 0;
let shown = false;

/**
 * The refraction filter.
 *
 * `feTurbulence` at this frequency is one broad lobe across a 24px box rather
 * than noise — the field bends the backdrop smoothly instead of speckling it.
 * `sRGB` interpolation because the default linearRGB washes the displaced
 * backdrop out badly at this size.
 *
 * The filter region is generous so the displacement has somewhere to sample
 * from; `scale` is kept low so it never reaches for pixels that were never
 * painted, which come back transparent and read as holes.
 */
function defs(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML =
    `<defs><filter id="ps-cur-lens" x="-40%" y="-40%" width="180%" height="180%" ` +
    `color-interpolation-filters="sRGB" filterUnits="objectBoundingBox">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="11" ` +
    `result="n"/>` +
    `<feGaussianBlur in="n" stdDeviation="1.1" result="ns"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="ns" scale="7" ` +
    `xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter></defs>`;
  return svg;
}

function build(): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('data-cursor', '');
  root.setAttribute('aria-hidden', 'true');

  const box = document.createElement('div');
  box.setAttribute('data-cursor-box', '');
  // Offset so the apex is at the root's own origin, and scaled ABOUT the apex
  // so the size can change without the hotspot moving.
  box.style.cssText =
    `position:absolute;left:${-TIP.x}px;top:${-TIP.y}px;width:24px;height:24px;` +
    `transform:scale(${SCALE});transform-origin:${TIP.x}px ${TIP.y}px`;

  const glass = document.createElement('div');
  glass.setAttribute('data-cursor-glass', '');
  glass.style.cssText =
    `position:absolute;inset:0;clip-path:path('${ARROW}');` +
    `-webkit-clip-path:path('${ARROW}')`;

  const ns = 'http://www.w3.org/2000/svg';
  const edge = document.createElementNS(ns, 'svg');
  edge.setAttribute('viewBox', '0 0 24 24');
  edge.setAttribute('width', '24');
  edge.setAttribute('height', '24');
  edge.style.cssText = 'position:absolute;inset:0;overflow:visible';
  // Dark first, light drawn inside it. One of the two always reads; see the
  // header.
  for (const [stroke, w] of [
    ['rgba(20,19,26,.62)', 2.0],
    ['rgba(255,255,255,.9)', 0.85],
  ] as const) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', ARROW);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', stroke);
    p.setAttribute('stroke-width', String(w));
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    edge.appendChild(p);
  }

  box.append(glass, edge);
  root.appendChild(box);
  return root;
}

/**
 * Mount the glass pointer and hide the OS one.
 *
 * ORDER IS LOAD-BEARING. `markPointers` has to run while the real cursor
 * values are still in the computed style, because that is what `hover.ts` uses
 * to decide what a control is. The `ps-cursor` class is what hides them, and it
 * goes on last.
 */
export function installCursor(): void {
  if (typeof matchMedia === 'function' && !matchMedia(FINE).matches) return;
  if (document.querySelector('[data-cursor]')) return;

  // Before anything is hidden. See the header.
  markPointers(document.body);

  const root = build();
  document.body.append(defs(), root);
  document.documentElement.classList.add('ps-cursor');

  const write = (): void => {
    raf = 0;
    root.style.transform = `translate3d(${px}px,${py}px,0)`;
  };

  const move = (e: PointerEvent): void => {
    px = e.clientX;
    py = e.clientY;
    if (!shown) {
      shown = true;
      root.setAttribute('data-on', '');
    }
    // Coalesced: a pointer reports far faster than a frame is worth, and the
    // backdrop under this element is resampled on every write.
    if (!raf) raf = requestAnimationFrame(write);
  };

  const hide = (): void => {
    shown = false;
    root.removeAttribute('data-on');
  };

  window.addEventListener('pointermove', move, { passive: true, capture: true });
  window.addEventListener('pointerdown', move, { passive: true, capture: true });
  // Leaving the window, tabbing away, or the page going to the background all
  // mean there is no pointer to stand in for.
  document.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
  });
}

/**
 * Every element the glass pointer covers that still wants the OS cursor back.
 *
 * Nothing does today — the whole point is one cursor everywhere — but the hook
 * exists so a future text field can opt out without re-deriving any of this.
 */
export function releaseCursor(root: HTMLElement): void {
  for (const el of qq<HTMLElement>(root, '[data-cursor-keep]')) el.style.cursor = 'auto';
}
