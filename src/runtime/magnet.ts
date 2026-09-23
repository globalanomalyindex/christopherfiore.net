/**
 * Magnetic pull (README §7.3). While hovered, a button leans toward the
 * cursor. After the cursor leaves, it keeps stretching after it for a short
 * distance, then lets go with a spring.
 *
 * Owns `transform` on buttons and nothing else. The seams own `translate`;
 * both are subtracted here to find the button's resting center.
 */

import { PULL, SEAM_X, reducedMotion } from './offsets.ts';

const FOLLOW = 'transform 140ms cubic-bezier(.2,.7,.3,1)';
const SPRING = 'transform 560ms cubic-bezier(.34,1.56,.64,1)';
/** Past this far from the box edge, a held button lets go. */
const REACH = 44;

let held: HTMLElement | null = null;

const clamp = (v: number, c: number) => Math.max(-c, Math.min(c, v));

/** The box as it would be with neither the pull nor the seams applied. */
function restRect(b: HTMLElement) {
  const r = b.getBoundingClientRect();
  const [tx, ty] = PULL.get(b) ?? [0, 0];
  const sx = SEAM_X.get(b) ?? 0;
  return {
    left: r.left - tx - sx,
    right: r.right - tx - sx,
    top: r.top - ty,
    bottom: r.bottom - ty,
    width: r.width,
    height: r.height,
  };
}

function pull(b: HTMLElement, x: number, y: number, outside: boolean): void {
  const r = restRect(b);
  const dx = x - (r.left + r.width / 2);
  const dy = y - (r.top + r.height / 2);
  const capX = Math.min(outside ? 12 : 8, 4 + r.width * 0.02);
  const capY = Math.min(outside ? 9 : 6, 3 + r.height * 0.03);
  const f = outside ? 0.16 : 0.1;
  const tx = clamp(dx * f, capX);
  const ty = clamp(dy * f, capY);
  PULL.set(b, [tx, ty]);
  b.style.transition = FOLLOW;
  b.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px)`;
}

export function release(b: HTMLElement | null): void {
  if (!b) return;
  PULL.delete(b);
  b.style.transition = SPRING;
  b.style.transform = '';
  if (held === b) held = null;
}

/** The cursor left `b` for somewhere that is not another button. */
export function hold(b: HTMLElement): void {
  if (held && held !== b) release(held);
  held = b;
}

/** A button was entered. Whatever was held lets go at once. */
export function engage(b: HTMLElement): void {
  if (held && held !== b) release(held);
  held = null;
}

export function releaseAll(): void {
  release(held);
}

/** Per pointer move: follow the hovered button, or drag the held one. */
export function move(x: number, y: number, current: HTMLElement | null): void {
  if (reducedMotion()) return;
  if (current) {
    pull(current, x, y, false);
    return;
  }
  const b = held;
  if (!b) return;
  const r = restRect(b);
  const ox = Math.max(r.left - x, 0, x - r.right);
  const oy = Math.max(r.top - y, 0, y - r.bottom);
  if (Math.hypot(ox, oy) > REACH) release(b);
  else pull(b, x, y, true);
}
