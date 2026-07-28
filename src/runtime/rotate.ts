/**
 * A set of crossfading slots on one shared clock.
 *
 * Each slot swaps its content on its own turn, `period` ms apart, offset from
 * every other slot so two slots never change together. Turns are computed from
 * an absolute anchor — `anchor + offset + turn × period` — rather than
 * re-armed from the end of the previous swap, so the stagger cannot drift into
 * alignment over a long session. Pausing shifts the anchor by exactly the time
 * held, which keeps the phases intact across a pause.
 *
 * The crossfade is the site's own dither: the slot dissolves into noise,
 * the new content is committed while it is invisible, and it resolves back out
 * of the noise with the pulsing settle. A CSS opacity fade would be off
 * language — everything on this site arrives out of the Bayer matrix.
 *
 * The module knows nothing about what is being rotated. A slot supplies its
 * element, its phase offset, and a `prepare()` that resolves to the commit
 * which installs the next content (or to null, to sit this turn out).
 */

import { autoMb, dIn, dfxSeq } from './dither';

/** Dissolve out, then resolve back in. ms. */
const OUT_MS = 340;
const IN_MS = 480;
/** dIn keeps pulsing 450ms past its landing; the slot is busy until it stops. */
const SETTLE_MS = 450;

/** Rotor-owned pause reason: the document is in a background tab. */
const HIDDEN = 'hidden';

/**
 * Dissolve `el` into noise, run `commit` while nothing is visible, then
 * resolve it back out. Resolves when the pulsing settle has finished.
 *
 * `commit` must install *everything* that belongs to the new content in one
 * go — image, caption, link, accessible name. Splitting it across the two
 * halves is how a caption ends up over the wrong picture.
 */
export function ditherSwap(el: HTMLElement, commit: () => void, mb?: number): Promise<void> {
  const blur = mb ?? autoMb(el);
  return new Promise((resolve) => {
    dfxSeq(
      el,
      [
        [0, 1],
        [OUT_MS, 0],
      ],
      blur,
    );
    window.setTimeout(() => {
      commit();
      dIn(el, 0, IN_MS, blur);
      window.setTimeout(resolve, IN_MS + SETTLE_MS);
    }, OUT_MS);
  });
}

export interface RotorSlot {
  /** The element that crossfades. */
  el: HTMLElement;
  /** ms this slot's turns sit behind the rotor's clock. */
  offset: number;
  /**
   * Get the next content ready and return the commit that installs it, or
   * null to skip this turn. Runs *before* any dithering, so an image can be
   * decoded first and the swap never lands on content that has not loaded.
   */
  prepare(): Promise<(() => void) | null>;
  /** Blur radius for this slot's dissolve. Defaults to `autoMb(el)`. */
  mb?: number;
  /**
   * ms between this slot's own swaps, overriding `RotorOptions.period`.
   *
   * Slots drawing on a shallow supply have to turn more slowly, or the same
   * content comes back around while the viewer still remembers it. How slowly
   * is arithmetic, not taste: if S slots share a supply of W items, a given
   * item returns every `W × period / S` ms, so a shallow pool needs a
   * proportionally longer period to hold the same repeat interval.
   */
  period?: number;
}

export interface RotorOptions {
  slots: RotorSlot[];
  /** ms between one slot's swaps, for slots that do not set their own. */
  period: number;
}

export interface Rotor {
  /** Idempotent — a second call while running is a no-op, never a second timer. */
  start(): void;
  /** Cancels every pending turn and clears every hold. */
  stop(): void;
  /** Hold the clock under `reason`. Reasons are independent; all must clear. */
  pause(reason: string): void;
  resume(reason: string): void;
}

interface Run {
  slot: RotorSlot;
  /** pending setTimeout handle, 0 when none is armed */
  timer: number;
  /** which turn on the rotor clock comes next */
  turn: number;
  /** a swap is in flight — its turn is skipped rather than overlapped */
  busy: boolean;
}

export function createRotor(opts: RotorOptions): Rotor {
  const runs: Run[] = opts.slots.map((slot) => ({ slot, timer: 0, turn: 0, busy: false }));
  const held = new Set<string>();
  let running = false;
  /** performance.now() the clock is measured from; shifts by each pause */
  let anchor = 0;
  let heldAt = 0;

  const clear = (r: Run): void => {
    if (!r.timer) return;
    clearTimeout(r.timer);
    r.timer = 0;
  };

  const arm = (r: Run): void => {
    clear(r);
    if (!running || held.size) return;
    const due = anchor + r.slot.offset + r.turn * (r.slot.period ?? opts.period);
    r.timer = window.setTimeout(() => {
      r.timer = 0;
      fire(r);
    }, Math.max(0, due - performance.now()));
  };

  const fire = (r: Run): void => {
    // The turn is consumed whether or not it produces a swap, so the slot
    // stays on its own lane of the clock.
    r.turn++;
    arm(r);
    if (!running || held.size || r.busy) return;

    r.busy = true;
    Promise.resolve(r.slot.prepare())
      .then((commit) => {
        // stop() during prepare(): drop the turn rather than swap a screen
        // that is no longer up.
        if (!commit || !running) return undefined;
        return ditherSwap(r.slot.el, commit, r.slot.mb);
      })
      .catch(() => undefined)
      .then(() => {
        r.busy = false;
      });
  };

  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') pause(HIDDEN);
    else resume(HIDDEN);
  };

  function pause(reason: string): void {
    if (held.has(reason)) return;
    const first = held.size === 0;
    held.add(reason);
    if (!running || !first) return;
    heldAt = performance.now();
    runs.forEach(clear);
  }

  function resume(reason: string): void {
    if (!held.delete(reason)) return;
    if (!running || held.size) return;
    // Move the whole clock forward by the time it stood still, so every slot
    // picks up exactly where it was in its own cycle.
    anchor += performance.now() - heldAt;
    runs.forEach(arm);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      anchor = performance.now();
      // Turn 1 is one full period in — nothing swaps the instant a screen opens.
      runs.forEach((r) => {
        r.turn = 1;
      });
      document.addEventListener('visibilitychange', onVisibility);
      onVisibility(); // adopt the current tab state before arming anything
      runs.forEach(arm);
    },

    stop(): void {
      if (!running) return;
      running = false;
      document.removeEventListener('visibilitychange', onVisibility);
      held.clear();
      runs.forEach((r) => {
        clear(r);
        r.turn = 0;
      });
      // A swap already in flight is left to land: its element would otherwise
      // be stranded mid-dissolve. `busy` clears itself and blocks a second one.
    },

    pause,
    resume,
  };
}
