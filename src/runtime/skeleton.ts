/**
 * The page's own measurements, drawn where the cursor is (README §7.4.2 and
 * §7.4.3): dimension arrows in the open gaps, and the local skeleton, which is
 * the outlines and widths of the units at the seam, the baseline, and the
 * line-height bracket. All in measure ink, all `aria-hidden`, none of it
 * hit-testable.
 *
 * Everything is placed in the page root's own box, so it scrolls with the
 * text it measures.
 */

import type { SeamState, Unit } from './seams.ts';

const C = '#3F5195';
const EASE = 'cubic-bezier(.23,1,.32,1)';

export interface Arrow {
  el: HTMLDivElement;
  line: SVGLineElement;
  h1: SVGPolylineElement;
  h2: SVGPolylineElement;
  lab: HTMLSpanElement;
}

let paper = '#F5E4D9';

export function makeLayers(root: HTMLElement): { live: HTMLDivElement; arrows: [Arrow, Arrow] } {
  paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || paper;
  const live = document.createElement('div');
  live.setAttribute('aria-hidden', 'true');
  live.setAttribute('data-skeleton', '');
  live.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 180ms ${EASE}`;
  root.appendChild(live);
  return { live, arrows: [makeArrow(root), makeArrow(root)] };
}

function makeArrow(root: HTMLElement): Arrow {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('data-arrow', '');
  el.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;z-index:4;opacity:0;transition:opacity 150ms ${EASE}`;
  el.innerHTML =
    `<svg width="1" height="16" style="position:absolute;left:0;top:0;overflow:visible">` +
    `<line x1="0" y1="8" x2="0" y2="8" stroke="${C}" stroke-width="1.5"></line>` +
    `<polyline fill="none" stroke="${C}" stroke-width="1.5"></polyline>` +
    `<polyline fill="none" stroke="${C}" stroke-width="1.5"></polyline></svg>` +
    `<span style="position:absolute;left:0;top:-16px;transform:translateX(-50%);font:12px/1 ui-monospace,Menlo,monospace;color:${C};white-space:nowrap;text-shadow:0 0 2px ${paper},0 0 2px ${paper}"></span>`;
  root.appendChild(el);
  const svg = el.firstChild as SVGSVGElement;
  return {
    el,
    line: svg.children[0] as SVGLineElement,
    h1: svg.children[1] as SVGPolylineElement,
    h2: svg.children[2] as SVGPolylineElement,
    lab: el.lastChild as HTMLSpanElement,
  };
}

const hide = (A: Arrow) => {
  A.el.style.opacity = '0';
};

/** A horizontal dimension arrow from x1 to x2, labeled with n. Hidden under 10px. */
function setArrow(A: Arrow, x1: number, x2: number, y: number, n: number): void {
  const L = x2 - x1;
  if (L < 10) {
    hide(A);
    return;
  }
  A.el.style.opacity = '1';
  A.el.style.transform = `translate(${x1.toFixed(1)}px,${(y - 8).toFixed(1)}px)`;
  const hd = Math.min(5, L / 3);
  A.line.setAttribute('x2', L.toFixed(1));
  A.h1.setAttribute('points', `${hd},${8 - hd} 0,8 ${hd},${8 + hd}`);
  A.h2.setAttribute(
    'points',
    `${(L - hd).toFixed(1)},${8 - hd} ${L.toFixed(1)},8 ${(L - hd).toFixed(1)},${8 + hd}`,
  );
  A.lab.style.left = `${(L / 2).toFixed(1)}px`;
  A.lab.textContent = String(n);
}

/** Where a unit is right now: the model position for words, the real rect for boxes. */
export function pos(S: SeamState, u: Unit) {
  if (!u.box) return { x: u.x + u.cur, y: u.y, w: u.w, h: u.h };
  const R0 = S.root.getBoundingClientRect();
  const r = u.el.getBoundingClientRect();
  return { x: r.left - R0.left, y: r.top - R0.top, w: r.width, h: r.height };
}

/** Buttons measure instantly; text seams only once the full state is on. */
export function drawArrows(S: SeamState): void {
  const [A0, A1] = S.arrows;
  if (!S.skelOn && !S.box) {
    hide(A0);
    hide(A1);
    return;
  }
  const gap = (A: Arrow, a: Unit, b: Unit) => {
    const pa = pos(S, a);
    const pb = pos(S, b);
    const x1 = pa.x + pa.w;
    const x2 = pb.x;
    setArrow(A, x1, x2, (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2, Math.round(x2 - x1));
  };
  if (S.box) {
    const L = S.box.line;
    const i = S.box.li;
    if (i > 0) gap(A0, L[i - 1], S.box);
    else hide(A0);
    if (i < L.length - 1) gap(A1, S.box, L[i + 1]);
    else hide(A1);
  } else if (S.active) {
    gap(A0, S.active.a, S.active.b);
    hide(A1);
  } else {
    hide(A0);
    hide(A1);
  }
}

/**
 * The local skeleton: outlines and widths around the two units at the seam
 * (or the previous unit, the box and the next unit), the line's baseline and
 * its line-height bracket. A hovered box also gets its size, its padding, and
 * an inner outline around its label.
 */
export function drawLive(S: SeamState): void {
  const s = S.active;
  const bx = S.box;
  if ((!s && !bx) || (!S.skelOn && !bx)) {
    S.live.style.opacity = '0';
    return;
  }

  const P: string[] = [];
  const f = (n: number) => n.toFixed(1);
  const ln = (x1: number, y1: number, x2: number, y2: number, op: number) =>
    P.push(
      `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${C}" stroke-opacity="${op}" stroke-width="1"></line>`,
    );
  const tx = (x: number, y: number, str: string, anchor = 'start') =>
    P.push(
      `<text x="${f(x)}" y="${f(y)}" fill="${C}" stroke="${paper}" stroke-width="3" stroke-linejoin="round" paint-order="stroke" font-family="ui-monospace,Menlo,monospace" font-size="12" text-anchor="${anchor}">${str}</text>`,
    );
  const rect = (x: number, y: number, w: number, hh: number, dash = '2 3', op = 1) =>
    P.push(
      `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(hh)}" fill="none" stroke="${C}" stroke-opacity="${op}" stroke-width="1" stroke-dasharray="${dash}"></rect>`,
    );

  const line = bx ? bx.line : s!.line;
  const units = bx ? [line[bx.li - 1], bx, line[bx.li + 1]].filter(Boolean) : [s!.a, s!.b];
  const R0 = S.root.getBoundingClientRect();

  for (const u of units) {
    const p = pos(S, u);
    rect(p.x, p.y, p.w, p.h);
    let lab = String(Math.round(p.w));
    if (u === bx) {
      lab = `${Math.round(p.w)} × ${Math.round(p.h)}`;
      const word = bx.el.querySelector('[data-word]');
      if (word) {
        const r = word.getBoundingClientRect();
        const wx = r.left - R0.left;
        const wy = r.top - R0.top;
        rect(wx, wy, r.width, r.height, '1 3', 0.6);
        lab += `  ·  pad ${Math.round(wx - p.x)}`;
      }
    }
    tx(p.x + p.w / 2, p.y - 5, lab, 'middle');
  }

  const ref = bx ?? (s!.a.box ? s!.b : s!.a);
  const rp = pos(S, ref);
  const mid = rp.y + rp.h / 2;
  const bl = mid + 0.33 * ref.fs;
  const p0 = pos(S, line[0]);
  const p1 = pos(S, line[line.length - 1]);
  const xs = p0.x;
  const xe = p1.x + p1.w;
  ln(xs, bl, xe, bl, 0.8);
  tx(xe + 10, bl + 4, `${Math.round(ref.fs)} / ${Math.round(ref.lh)}`);

  const top = mid - ref.lh / 2;
  const bot = mid + ref.lh / 2;
  const ax = xs - 14;
  ln(ax, top, ax, bot, 0.9);
  ln(ax - 4, top, ax + 4, top, 0.9);
  ln(ax - 4, bot, ax + 4, bot, 0.9);
  tx(ax - 6, mid + 4, String(Math.round(ref.lh)), 'end');

  const W = S.root.offsetWidth;
  const H = S.root.offsetHeight;
  S.live.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0;overflow:visible">${P.join('')}</svg>`;
  S.live.style.opacity = bx ? '1' : Math.min(1, S.str * 1.8).toFixed(3);
}
