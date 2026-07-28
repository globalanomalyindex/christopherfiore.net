/** Minimal stage state. All of it lives on the stage element. */

export interface StageState {
  /** open page, 1–4, or null for the menu */
  open: number | null;
  /** transition in flight — blocks input */
  nav: boolean;
  /** performance.now() timestamp until which input is locked by the intro */
  introUntil: number;
  /** hovered menu channel, 1–3 — drives the background field mode */
  hovered: number | null;
  /** selected case row on page 01, 1–8 — drives the key-frame slot */
  selectedCase: number;
  /** selected system row on page 03, 0–4 — drives the hero render */
  selectedSystem: number;
  /**
   * Open sheet in page 03's evidence viewer, 0–11, or null when it is closed.
   * Non-null means the viewer owns Escape and the arrow keys, and the page
   * body underneath is inert.
   */
  evidence: number | null;
  /** prefers-reduced-motion, read once and on change */
  reduced: boolean;
}

const STATES = new WeakMap<HTMLElement, StageState>();

const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export function state(stage: HTMLElement): StageState {
  let s = STATES.get(stage);
  if (!s) {
    s = {
      open: null,
      nav: false,
      introUntil: 0,
      hovered: null,
      selectedCase: 1,
      selectedSystem: 0,
      evidence: null,
      reduced: mq ? mq.matches : false,
    };
    STATES.set(stage, s);
    mq?.addEventListener('change', (e) => {
      const cur = STATES.get(stage);
      if (cur) cur.reduced = e.matches;
    });
  }
  return s;
}

/** True when input should be ignored: a transition or the intro is running. */
export function locked(stage: HTMLElement): boolean {
  const s = state(stage);
  return s.nav || performance.now() < s.introUntil;
}
