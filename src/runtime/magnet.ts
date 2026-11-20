/**
 * Magnetic pull. While hovered, a button leans toward the
 * cursor. After the cursor leaves, it keeps stretching after it for a short
 * distance, then lets go with a spring.
 *
 * Owns `transform` on buttons and nothing else. The seams own `translate`;
 * both are subtracted here to find the button's resting center.
 *
 * THE FRAME BUDGET. A move reads the button's box in the pointer event, when
 * the browser has just brought styles up to date for its own hit test, and
 * writes the lean once, in the next frame. Writing in the event made the next
 * read (or the next event's hit test, when several moves land in one frame)
 * recompute every style first. The lean takes effect in the same frame either
 * way, since a transition starts when styles are computed for the frame, so
 * nothing a visitor sees moves. `PULL` is still set in the event, as before,
 * so every sum that subtracts it comes out the same.
 */

import { PULL, SEAM_X, reducedMotion } from './offsets.ts';

/*
  The magnet writes `transition` inline on every move, which would drop the
  press's own `scale` transition, so each string carries it: `--pt` is the
  press timing, 120ms down and 160ms back up (site.css).
*/
/** How long the box follows a move, and how long it takes to spring back: the seams keep measuring for this long. */
export const FOLLOW_MS = 140;
export const SPRING_MS = 440;
const FOLLOW = `transform ${FOLLOW_MS}ms cubic-bezier(.2,.7,.3,1), scale var(--pt)`;
const SPRING = `transform ${SPRING_MS}ms cubic-bezier(.34,1.45,.64,1), scale var(--pt)`;
/** Past this far from the box edge, a held button lets go. */
const REACH = 44;

let held: HTMLElement | null = null;

const clamp = (v: number, c: number) => Math.max(-c, Math.min(c, v));

/** The one lean waiting for the next frame. A move only ever pulls one button. */
let due: { b: HTMLElement; transform: string } | null = null;
let raf = 0;

function flush(): void {
  raf = 0;
  const d = due;
  due = null;
  if (!d) return;
  d.b.style.transition = FOLLOW;
  d.b.style.transform = d.transform;
}

/**
 * The box as it would be with neither the pull nor the seams applied. `r` is
 * the button's box as read this move, before anything was written, so the
 * read never forces the browser to recompute styles.
 */
function restRect(b: HTMLElement, r: DOMRectReadOnly = b.getBoundingClientRect()) {
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

function pull(b: HTMLElement, x: number, y: number, outside: boolean, box?: DOMRectReadOnly): void {
  const r = restRect(b, box);
  const dx = x - (r.left + r.width / 2);
  const dy = y - (r.top + r.height / 2);
  // A row runs the width of the page. It leans a little; a chip leans more.
  const capX = r.width > 480 ? 3 : Math.min(outside ? 12 : 8, 4 + r.width * 0.02);
  const capY = Math.min(outside ? 9 : 6, 3 + r.height * 0.03);
  const f = outside ? 0.16 : 0.1;
  const tx = clamp(dx * f, capX);
  const ty = clamp(dy * f, capY);
  PULL.set(b, [tx, ty]);
  due = { b, transform: `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px)` };
  if (!raf) raf = requestAnimationFrame(flush);
}

export function release(b: HTMLElement | null): void {
  if (!b) return;
  // a lean still waiting for its frame must not land after the let-go
  if (due?.b === b) due = null;
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

/**
 * Per pointer move: follow the hovered button, or drag the held one. `box` is
 * the hovered button's box, read once by the caller (buttons.ts) and shared,
 * so a move costs one read in the event and one write in the frame.
 */
export function move(x: number, y: number, current: HTMLElement | null, box?: DOMRectReadOnly): void {
  if (reducedMotion()) return;
  if (current) {
    pull(current, x, y, false, box);
    return;
  }
  const b = held;
  if (!b) return;
  const seen = b.getBoundingClientRect();
  const r = restRect(b, seen);
  const ox = Math.max(r.left - x, 0, x - r.right);
  const oy = Math.max(r.top - y, 0, y - r.bottom);
  if (Math.hypot(ox, oy) > REACH) release(b);
  else pull(b, x, y, true, seen);
}
