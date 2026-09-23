/**
 * Every `[data-btn]` on the page, driven from four delegated listeners.
 *
 * A button can be "hot" for three reasons at once: a pointer is over it, it
 * has keyboard focus, or a finger is on it. The band and the glitch go up when
 * the first reason arrives and come down when the last one leaves, so a
 * focused button that the mouse also passes over never flickers.
 *
 *   hover   band + glitch + magnet; one button at a time (README §7.1–7.3)
 *   focus   band + the alternate state, no magnet (README §8)
 *   press   touch: band + the alternate state at once, no glitch delay (README §8)
 */

import { bandIn, bandOut, type Band } from './band.ts';
import { altIn, altOut, type Alt } from './glitch.ts';
import { engage, hold, move, release, releaseAll } from './magnet.ts';
import { reducedMotion } from './offsets.ts';

type Why = 'hover' | 'focus' | 'press';

interface Hot {
  why: Set<Why>;
  band: Band;
  alt: Alt;
}

const HOT = new Map<HTMLElement, Hot>();

/** The button under a mouse or pen right now. */
let current: HTMLElement | null = null;
/** The button under each finger, by pointerId: two fingers can press two buttons. */
const pressed = new Map<number, HTMLElement>();

const btnOf = (t: EventTarget | null): HTMLElement | null =>
  t instanceof Element ? t.closest<HTMLElement>('[data-btn]') : null;

function on(b: HTMLElement, why: Why, instant = false): void {
  const hot = HOT.get(b);
  if (hot) {
    hot.why.add(why);
    return;
  }
  b.setAttribute('data-hot', '');
  HOT.set(b, {
    why: new Set([why]),
    band: bandIn(b),
    alt: altIn(b, instant || reducedMotion()),
  });
}

function off(b: HTMLElement, why: Why): void {
  const hot = HOT.get(b);
  if (!hot) return;
  hot.why.delete(why);
  if (hot.why.size) return;
  HOT.delete(b);
  b.removeAttribute('data-hot');
  altOut(hot.alt);
  bandOut(hot.band);
}

/** Everything down, now: back/forward cache restores, and the pointer leaving the window. */
function reset(): void {
  for (const b of [...HOT.keys()]) {
    for (const why of ['hover', 'focus', 'press'] as const) off(b, why);
    release(b);
  }
  releaseAll();
  current = null;
  pressed.clear();
}

export function initButtons(): void {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const b = btnOf(e.target);
    if (b === current) return;
    if (current) {
      off(current, 'hover');
      // Leaving for plain text: keep stretching after the cursor. Leaving
      // straight into another button: let go now.
      if (b) release(current);
      else hold(current);
    }
    current = b;
    if (b) {
      engage(b);
      on(b, 'hover');
    }
  });

  document.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch' || e.relatedTarget) return;
    // Left the document entirely.
    if (current) {
      off(current, 'hover');
      release(current);
      current = null;
    }
    releaseAll();
  });

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      move(e.clientX, e.clientY, current);
    },
    { passive: true },
  );

  document.addEventListener('focusin', (e) => {
    const b = btnOf(e.target);
    if (b && b.matches(':focus-visible')) on(b, 'focus');
  });
  document.addEventListener('focusout', (e) => {
    const b = btnOf(e.target);
    if (b) off(b, 'focus');
  });

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const b = btnOf(e.target);
    if (!b) return;
    pressed.set(e.pointerId, b);
    on(b, 'press', true);
  });
  const lift = (e: PointerEvent) => {
    const b = pressed.get(e.pointerId);
    if (!b) return;
    pressed.delete(e.pointerId);
    // Another finger may still be on the same button.
    if (![...pressed.values()].includes(b)) off(b, 'press');
  };
  document.addEventListener('pointerup', lift);
  document.addEventListener('pointercancel', lift);

  // A page restored from the back/forward cache comes back exactly as it was
  // left, which is usually mid-hover on the button that was clicked.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) reset();
  });
}
