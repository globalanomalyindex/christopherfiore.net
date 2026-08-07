/**
 * Page 01 ↔ guestpass subpage choreography.
 *
 * A straight sibling of `runtime/mfny.ts`, and deliberately so: this is the
 * eighth screen built on the same move, and the pattern is the house one. The
 * clicked control's box becomes the whole screen, and closing collapses it back
 * into that same box rather than fading it out. Timing is the tokens' own at
 * the nextPage weight, because this opens on top of a page that is already up.
 *
 * Where it differs from mfny: the plate carries five views rather than two, so
 * `setGuestpassView` walks a list instead of flipping a pair, and the toggle is
 * a radiogroup of five. Nothing here counts them, so the count lives in `VIEWS`
 * and nowhere else.
 *
 * STATE LIVES HERE, in a module-local WeakSet keyed by the stage, for the same
 * reason mfny's does: `runtime/actions.ts` must be able to ask which screen owns
 * Escape, and two screens must never both believe they are open.
 */

import { focusInto, q, qq } from '../dom.ts';
import { STAGE } from '../design/layout.ts';
import { TIMING } from '../design/tokens.ts';
import { COLOR, rgba } from '../design/tokens.ts';
import { dIn, killAnim, playIn } from './dither.ts';
import { frostFor } from './frost.ts';
import { GUESTPASS_VIEWS } from '../pages/guestpass.ts';
import { GUESTPASS_LEAD_VIEW as LEAD_VIEW } from '../data/guestpass.ts';
import { locked, state } from './state.ts';
import { subtitleIn, subtitleOut, subtitleReset } from './glitch.ts';
import { REDUCED_FADE, resetVeil, veilOpen, veilRest } from './transitions.ts';

const { G, OUT, LAG, SH, easeOpen, easeClose } = TIMING;

/** Hold between the grow landing and the chrome arriving. */
const HOLD = 260;
/** Settle. The nextPage weight (420), not the menu→page weight (680). */
const SETTLE = 420;
/** When the title takes the alternate face, measured from the open. */
const TITLE_ALT = G + HOLD + SETTLE + 120;

/** Blur radius for the plate's dither-in — suits a 727 × 436 box. */
const PLATE_MB = 15;
/** Shortest the rail thumb is allowed to get. */
const THUMB_MIN = 28;

const FULL = 'inset(0px 0px 0px 0px)';

/** Stages whose guestpass screen is currently up. */
const OPEN = new WeakSet<HTMLElement>();
/** The control the screen grew out of, so close can collapse back into it. */
const FROM = new WeakMap<HTMLElement, HTMLElement>();
/** That control's inset, kept in case it has gone by the time we close. */
const CLIP = new WeakMap<HTMLElement, string>();

const two = (n: number): string => String(n).padStart(2, '0');

const attrNum = (el: Element | null, name: string, dflt: number): number => {
  const raw = el ? el.getAttribute(name) : null;
  const n = raw === null || raw === '' ? NaN : parseFloat(raw);
  return Number.isFinite(n) ? n : dflt;
};

/**
 * True while the guestpass screen is up. `runtime/actions.ts` asks this before
 * routing Escape, the way it asks `mfnyOpen` for the screen beside it.
 */
export function guestpassOpen(stage: HTMLElement): boolean {
  return OPEN.has(stage);
}

interface Parts {
  screen: HTMLElement;
  page: HTMLElement;
  /** the page's own furniture, made inert while this screen owns the stage */
  body: HTMLElement | null;
  /** the plate — outside the chrome, so it dithers in on its own */
  plate: HTMLElement | null;
  chrome: HTMLElement | null;
  cq: HTMLCanvasElement | null;
}

function partsFor(stage: HTMLElement): Parts | null {
  const screen = q(stage, '[data-guestpass]');
  if (!screen) return null;
  const page = screen.closest<HTMLElement>('[data-page]');
  if (!page) return null;
  return {
    screen,
    page,
    body: q(page, '[data-pbody]'),
    plate: q(screen, '[data-gpplate]'),
    chrome: q(screen, '[data-gpchrome]'),
    cq: q<HTMLCanvasElement>(screen, '[data-frost]'),
  };
}

const closeOf = (screen: HTMLElement): HTMLElement | null =>
  q(screen, '[data-act="guestpass-close"]');

/**
 * The trigger's box as a clip inset in the page's own 1920 × 1080 space.
 * Measured rather than declared: both rects come from the same call stack, so
 * dividing by the stage scale is enough — no reflow between the two reads.
 */
function clipFrom(page: HTMLElement, trigger: HTMLElement | null): string {
  if (!trigger || !trigger.isConnected) return FULL;
  const p = page.getBoundingClientRect();
  const t = trigger.getBoundingClientRect();
  const k = p.width / STAGE.w;
  if (!k || !t.width || !t.height) return FULL;
  const top = (t.top - p.top) / k;
  const left = (t.left - p.left) / k;
  const right = (p.right - t.right) / k;
  const bottom = (p.bottom - t.bottom) / k;
  return `inset(${top.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px)`;
}

/* --------------------------------------------------------- the text column */

const SCROLLED = new WeakSet<HTMLElement>();

/**
 * The section the plate was last synced to, per screen.
 *
 * The sync fires on a CHANGE of section, not on every scroll event, and that
 * is the whole design. Someone who walks the plate by hand to study a view
 * keeps it for as long as they stay in the section they are reading; the plate
 * only takes over again when the reading position genuinely moves on. Firing
 * every frame would snatch the plate back a pixel after they touched it.
 *
 * The binding is one way. Nothing here ever writes `scrollTop`, and
 * `setGuestpassView` never touches the column, so the toggle can be walked
 * freely without the prose moving under it.
 */
const SYNCED = new WeakMap<HTMLElement, number>();

/** The view the plate is on, so a sync can skip a no-op and its dither. */
const VIEW = new WeakMap<HTMLElement, number>();

/**
 * Move the plate to whatever the section now under the reader argues over.
 *
 * A section with no `data-gpsec-view` leaves the plate alone: the sections
 * that have no honest match are better served by whatever was already up than
 * by a jump to something irrelevant.
 */
function syncPlateTo(screen: HTMLElement, secs: HTMLElement[], cur: number): void {
  if (SYNCED.get(screen) === cur) return;
  SYNCED.set(screen, cur);
  const raw = secs[cur].getAttribute('data-gpsec-view');
  if (raw === null || raw === '') return;
  const n = Number(raw);
  // Already there: skip, so landing back on a section the plate is already
  // showing does not fire a dither for no visible change.
  if (!Number.isFinite(n) || VIEW.get(screen) === n) return;
  const P = partsFor2(screen);
  if (P) applyView(P, n, true);
}

/** `partsFor`, from the screen rather than the stage. */
function partsFor2(screen: HTMLElement): Parts | null {
  const stage = screen.closest<HTMLElement>('[data-stage]');
  return stage ? partsFor(stage) : null;
}

/**
 * Draw the rail thumb and the section readout. Cheap enough to run straight
 * off the scroll event: a handful of style writes and one text write, no
 * layout reads beyond the container's own metrics.
 */
function paintScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-gpscroll]');
  if (!region) return;

  const view = region.clientHeight;
  const total = region.scrollHeight;
  const over = total - view;
  // A hidden screen measures zero and every section reports offsetTop 0, which
  // would read as "the last section". The scroll event queued by resetScroll on
  // close lands after display:none, so this guard is load-bearing.
  if (!view) return;

  const thumb = q(screen, '[data-gpthumb]');
  if (thumb) {
    if (over <= 1) {
      thumb.style.display = 'none';
    } else {
      const h = Math.max(THUMB_MIN, Math.round((view / total) * view));
      const u = Math.min(1, Math.max(0, region.scrollTop / over));
      thumb.style.display = 'block';
      thumb.style.height = `${h}px`;
      thumb.style.transform = `translateY(${Math.round(u * (view - h))}px)`;
    }
  }

  const secs = qq(region, '[data-gpsec]');
  if (!secs.length) return;
  // whichever section owns the top of the window, not the middle: the heading a
  // reader has just passed is the one they are reading under
  const probe = region.scrollTop + view * 0.28;
  let cur = 0;
  secs.forEach((s, i) => {
    if (s.offsetTop <= probe) cur = i;
  });
  // At the very bottom the probe can still sit above the last section's top,
  // which would leave the final section never named.
  if (over > 0 && region.scrollTop >= over - 1) cur = secs.length - 1;

  syncPlateTo(screen, secs, cur);

  const at = q(screen, '[data-gpsecat]');
  if (at) {
    const name = secs[cur].getAttribute('data-gpsec-name') || '';
    /*
      The standfirst is scroll section 0 but is not one of the numbered
      sections, so it is named without a count. Numbering it would make this
      readout say "01 / 10" while the screen carries ten numbered sections plus
      an unnumbered standfirst, which is one section more than it has names for.
    */
    at.textContent = cur === 0 ? name : `${two(cur)} / ${two(secs.length - 1)} · ${name}`;
  }
}

function wireScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-gpscroll]');
  if (!region || SCROLLED.has(region)) return;
  SCROLLED.add(region);
  region.addEventListener('scroll', () => paintScroll(screen), { passive: true });
}

/**
 * Send the column back to the top, while the screen is still displayed, and
 * put the plate back on the view section 0 opens with.
 *
 * The plate reset is silent. This runs inside `finishClose` too, where the
 * screen is still displayed for one more statement, and an animated change
 * there would dither the plate while the screen collapses.
 */
function resetScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-gpscroll]');
  if (region) region.scrollTop = 0;
  // Forget the synced section, or a re-open at section 0 would look already
  // synced and leave the plate wherever the last reader left it.
  SYNCED.delete(screen);
  const P = partsFor2(screen);
  if (P) applyView(P, LEAD_VIEW, false);
  paintScroll(screen);
}

/**
 * Move the plate to view `n`.
 *
 * Every view is already mounted, so this is an opacity swap and a caption
 * write: no decode, no flash, and walking back and forth costs nothing. The
 * caption is written from the record rather than assembled, because it names
 * which screens you are looking at and a built sentence can lose the clause
 * that says these are design renders rather than a shipped app.
 */
function applyView(P: Parts, n: number, animate: boolean): void {
  const { screen } = P;
  const view = GUESTPASS_VIEWS[n];
  if (!view) return;
  VIEW.set(screen, n);

  for (const slot of qq(screen, '[data-gpslot]')) {
    const on = Number(slot.getAttribute('data-gpslot')) === n;
    slot.style.opacity = on ? '1' : '0';
    slot.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  const cap = q(screen, '[data-gpcap]');
  if (cap) cap.textContent = view.caption;

  for (const b of qq(screen, '[data-act="guestpass-view"]')) {
    const on = Number(b.getAttribute('data-view')) === n;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    // the roving tab stop follows the selection, so Tab always lands on the
    // view that is actually showing
    b.setAttribute('tabindex', on ? '0' : '-1');
    b.style.borderColor = on ? COLOR.paper : rgba(COLOR.paper, 0.28);
    b.style.opacity = on ? '1' : '.62';
  }

  // the plate re-resolves out of noise, as a board change does on chellbook
  const stage = screen.closest<HTMLElement>('[data-stage]');
  if (animate && P.plate && !(stage && state(stage).reduced)) dIn(P.plate, 30, 340, PLATE_MB);
}

/** Walk the plate to view `n`. Never touches the text column. */
export function setGuestpassView(stage: HTMLElement, n: number): void {
  if (!OPEN.has(stage)) return;
  const P = partsFor(stage);
  if (!P) return;
  applyView(P, n, true);
}

/* -------------------------------------------------------------------- open */

export function openGuestpass(stage: HTMLElement, trigger: HTMLElement): void {
  if (locked(stage)) return;
  if (OPEN.has(stage)) return;
  const P = partsFor(stage);
  if (!P) return;

  const { screen, page, plate, chrome, cq } = P;
  const s = state(stage);
  s.nav = true;
  OPEN.add(stage);

  // The page underneath stops being reachable: this screen is aria-modal, and
  // without this Tab would walk straight out of it into the page's own rows.
  if (P.body) {
    P.body.setAttribute('inert', '');
    P.body.setAttribute('aria-hidden', 'true');
  }

  [screen, plate, chrome, cq].forEach((el) => killAnim(el));
  screen.style.display = 'block';
  if (plate) plate.style.filter = '';
  // measurable now that the screen has a box; the chrome's opacity is 0 but its
  // layout is real, so the rail and the readout are right from frame one
  wireScroll(screen);
  resetScroll(screen);
  subtitleIn(screen, TITLE_ALT);

  const clip0 = clipFrom(page, trigger);
  FROM.set(screen, trigger);
  CLIP.set(screen, clip0);
  screen.style.clipPath = clip0;

  const settled = (): void => {
    s.nav = false;
    focusInto(closeOf(screen));
  };

  if (s.reduced) {
    screen.style.clipPath = FULL;
    screen.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
    if (chrome) {
      chrome.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: REDUCED_FADE,
        easing: 'linear',
        fill: 'both',
      });
    }
    veilRest(cq, REDUCED_FADE);
    playIn(screen, 0);
    window.setTimeout(settled, REDUCED_FADE);
    return;
  }

  // 1 — the clicked box becomes the screen
  screen.animate([{ clipPath: clip0 }, { clipPath: FULL }], {
    duration: G,
    easing: easeOpen,
    fill: 'both',
  });

  // 2 — the plate resolves out of noise, and pulses twice on landing
  if (plate) dIn(plate, Math.round(G * 0.26), G + 340, PLATE_MB);

  // 3 — the screen's own dither veil opens across it
  veilOpen(cq, G, HOLD, SETTLE);

  // 4 — the chrome arrives after the hold, then staggers itself in
  if (chrome) {
    chrome.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: Math.round(SETTLE * 0.8),
      delay: G + HOLD,
      easing: 'linear',
      fill: 'both',
    });
  }

  window.setTimeout(() => playIn(screen, 40), G + HOLD);
  window.setTimeout(settled, G + HOLD + SETTLE);
}

/* ------------------------------------------------------------------- close */

function finishClose(stage: HTMLElement, P: Parts, trigger: HTMLElement | null): void {
  const { screen, plate, chrome, cq } = P;
  resetScroll(screen); // while it is still displayed, or the write is dropped
  screen.style.display = 'none';
  screen.style.clipPath = '';
  [screen, plate, chrome, cq].forEach((el) => killAnim(el));
  if (plate) plate.style.filter = '';
  resetVeil(cq);
  subtitleReset(screen);

  if (P.body) {
    P.body.removeAttribute('inert');
    P.body.setAttribute('aria-hidden', 'false');
  }

  OPEN.delete(stage);
  state(stage).nav = false;
  // back to the control the screen came out of, not the top of the page
  focusInto(trigger);
}

export function closeGuestpass(stage: HTMLElement): void {
  if (locked(stage)) return;
  if (!OPEN.has(stage)) return;
  const P = partsFor(stage);
  if (!P) return;

  const { screen, page, chrome, cq } = P;
  const s = state(stage);
  s.nav = true;

  subtitleOut(screen);
  const trigger = FROM.get(screen) || null;
  const clip0 = trigger && trigger.isConnected ? clipFrom(page, trigger) : CLIP.get(screen) || FULL;

  if (s.reduced) {
    screen.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
    window.setTimeout(() => finishClose(stage, P, trigger), REDUCED_FADE);
    return;
  }

  // read the veil's resting opacity before the fill:both animations are canceled
  const op0 = cq ? getComputedStyle(cq).opacity || '1' : '1';
  [screen, chrome, cq].forEach((el) => killAnim(el));

  if (chrome) {
    chrome.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: OUT,
      easing: 'cubic-bezier(.4,0,1,1)',
      fill: 'both',
    });
  }

  screen.animate([{ clipPath: FULL }, { clipPath: clip0 }], {
    duration: SH,
    delay: LAG,
    easing: easeClose,
    fill: 'both',
  });

  if (cq) {
    frostFor(cq)?.tween('boost', attrNum(cq, 'data-boost', 3) * 0.8, OUT + 140);
    cq.animate(
      [
        { opacity: op0, offset: 0 },
        { opacity: 1, offset: 0.2 },
        { opacity: 1, offset: 0.46 },
        { opacity: 0, offset: 1 },
      ],
      { duration: LAG + SH, easing: 'linear', fill: 'both' },
    );
  }

  window.setTimeout(() => finishClose(stage, P, trigger), LAG + SH);
}
