/**
 * Page 01 ↔ chellbook case study choreography.
 *
 * The same move page 03 makes into its case study, one channel over: the
 * clicked element's box becomes the whole screen. `openChellbook` measures the
 * trigger's rect live (the channel cells can hardcode `data-rect`; a table row
 * cannot), grows a clip-path inset from it, opens the screen's own dither veil,
 * and resolves the plate out of noise with `dIn` — the pulsing settle, not a
 * fade. `closeChellbook` runs it backwards into the same rect, so the screen
 * collapses into the row you clicked rather than vanishing.
 *
 * Timing is the tokens' own at the nextPage weight — 580 grow · 260 hold · 420
 * settle — because this opens on top of a page that is already up, exactly as
 * `runtime/evidence.ts` does. Close is the page close verbatim: OUT 240 · LAG
 * 190 · SH 700.
 *
 * prefers-reduced-motion takes the same exit every other transition here takes:
 * no grow, no dither pass, a REDUCED_FADE cross-fade, the veil parked at rest
 * and every staged element settled in place — landing on the same final state.
 *
 * STATE LIVES HERE, not in `StageState`. The open board index is held in a
 * module-local WeakMap keyed by the stage, and `chellbookOpen(stage)` is what
 * `runtime/actions.ts` should ask when it needs to know whether this screen
 * owns Escape and the arrow keys. `state(stage).nav` is still set across a
 * transition, because that is the stage-wide input lock every screen shares.
 *
 * The text half is a native scroll container, so scrolling itself needs no
 * code. What lives here is its 6px rust rail and its "you are here" readout,
 * both painted from one passive `scroll` listener, plus the reset that sends
 * the column back to the top so a re-open starts clean.
 */

import { focusInto, q, qq } from '../dom.ts';
import { STAGE } from '../design/layout.ts';
import { COLOR, TIMING } from '../design/tokens.ts';
import { CHELL_BOARDS } from '../data/chellbook.ts';
import { dIn, dfxSeq, killAnim, playIn } from './dither.ts';
import { frostFor } from './frost.ts';
import { locked, state } from './state.ts';
import { subtitleIn, subtitleOut, subtitleReset } from './glitch.ts';
import { REDUCED_FADE, resetVeil, veilOpen, veilRest } from './transitions.ts';

const { G, OUT, LAG, SH, easeOpen, easeClose } = TIMING;

/** Hold between the grow landing and the chrome arriving. */
const HOLD = 260;
/** Settle. The nextPage weight (420), not the menu→page weight (680). */
const SETTLE = 420;
/**
 * When the title takes the alternate face, measured from the open. After the
 * chrome has arrived (G + HOLD) and its staged wipe has run, so the swap is
 * seen rather than hidden under a clip-path.
 */
const TITLE_ALT = G + HOLD + SETTLE + 120;

/** Blur radius for the plate's dither-in — 15 suits a 581.8 × 556 box. */
const PLATE_MB = 15;
/** Shortest the text column's rail thumb is allowed to get. */
const THUMB_MIN = 28;

/**
 * The open board index per stage, or absent when the screen is closed. Local
 * on purpose: `StageState.evidence` belongs to page 03's viewer and this screen
 * must not borrow it — both could otherwise be believed open at once.
 */
const BOARD = new WeakMap<HTMLElement, number>();
/** The element the screen grew out of, so the close can collapse back into it. */
const FROM = new WeakMap<HTMLElement, HTMLElement>();
/** That element's inset, kept in case it has gone by the time we close. */
const CLIP = new WeakMap<HTMLElement, string>();

const FULL = 'inset(0px 0px 0px 0px)';

const two = (n: number): string => String(n).padStart(2, '0');

const attrNum = (el: Element | null, name: string, dflt: number): number => {
  const raw = el ? el.getAttribute(name) : null;
  const n = raw === null || raw === '' ? NaN : parseFloat(raw);
  return Number.isFinite(n) ? n : dflt;
};

/** Board numbers wrap — the set is a loop, not a list with two dead ends. */
const wrap = (n: number): number =>
  ((n % CHELL_BOARDS.length) + CHELL_BOARDS.length) % CHELL_BOARDS.length;

/**
 * True while the chellbook screen is up. `runtime/actions.ts` asks this before
 * routing Escape and the arrows, the way it asks `state(stage).evidence` for
 * page 03's viewer.
 */
export function chellbookOpen(stage: HTMLElement): boolean {
  return BOARD.get(stage) !== undefined;
}

interface Parts {
  screen: HTMLElement;
  page: HTMLElement;
  /** the page's own furniture, made inert while this screen owns the stage */
  body: HTMLElement | null;
  plate: HTMLElement | null;
  chrome: HTMLElement | null;
  cq: HTMLCanvasElement | null;
}

function partsFor(stage: HTMLElement): Parts | null {
  const screen = q(stage, '[data-chellbook]');
  if (!screen) return null;
  const page = screen.closest<HTMLElement>('[data-page]');
  if (!page) return null;
  return {
    screen,
    page,
    body: q(page, '[data-pbody]'),
    plate: q(screen, '[data-cbplate]'),
    chrome: q(screen, '[data-cbchrome]'),
    cq: q<HTMLCanvasElement>(screen, '[data-frost]'),
  };
}

/** The screen's top-left close control — the landing spot when it opens. */
const closeOf = (screen: HTMLElement): HTMLElement | null =>
  q(screen, '[data-act="chellbook-close"]');

/**
 * The trigger's box as a clip inset in the page's own 1920 × 1080 space.
 *
 * Measured rather than declared: `openPage` can read `data-rect` off a channel
 * cell because the menu's four cells are fixed geometry, but this trigger is a
 * table row whose position depends on the row height. Both rects come from the
 * same call stack, so dividing by the stage scale is enough — no reflow between
 * the two reads.
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

/** Which board a trigger opens on. Declared, or the first board. */
function boardOf(trigger: HTMLElement): number {
  const raw = trigger.getAttribute('data-board');
  if (raw !== null && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return wrap(n);
  }
  return 0;
}

/* --------------------------------------------------------- the text column */

/** One passive scroll listener per column, added the first time it opens. */
const SCROLLED = new WeakSet<HTMLElement>();

/**
 * Draw the rail thumb and the section readout for the column's current
 * position. Cheap enough to run straight off the scroll event: two style
 * writes and one text write, no layout reads beyond the container's own
 * metrics and the sections' cached offsets.
 */
function paintScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-cbscroll]');
  if (!region) return;

  const view = region.clientHeight;
  const total = region.scrollHeight;
  const over = total - view;
  // A hidden screen measures zero and every section reports offsetTop 0, which
  // would read as "the last section". The scroll event queued by resetScroll on
  // close lands after display:none, so this guard is load-bearing, not defensive.
  if (!view) return;

  const thumb = q(screen, '[data-cbthumb]');
  if (thumb) {
    if (over <= 1) {
      // nothing to scroll — a full-height thumb would be a lie
      thumb.style.display = 'none';
    } else {
      const h = Math.max(THUMB_MIN, Math.round((view / total) * view));
      const u = Math.min(1, Math.max(0, region.scrollTop / over));
      thumb.style.display = 'block';
      thumb.style.height = `${h}px`;
      thumb.style.transform = `translateY(${Math.round(u * (view - h))}px)`;
    }
  }

  const at = q(screen, '[data-cbsecat]');
  if (!at) return;
  const secs = qq(region, '[data-cbsec]');
  if (!secs.length) return;
  // whichever section owns the top of the window, not the middle: the heading
  // a reader has just passed is the one they are reading under
  const probe = region.scrollTop + view * 0.28;
  let cur = 0;
  secs.forEach((s, i) => {
    if (s.offsetTop <= probe) cur = i;
  });
  // At the very bottom the probe can still sit above the last section's top,
  // which would leave the final section — the caveats — never named. Scrolled
  // to the end means you are in the last one.
  if (over > 0 && region.scrollTop >= over - 1) cur = secs.length - 1;
  const name = secs[cur].getAttribute('data-cbsec-name') || '';
  at.textContent = `${two(cur + 1)} / ${two(secs.length)} · ${name}`;
}

function wireScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-cbscroll]');
  if (!region || SCROLLED.has(region)) return;
  SCROLLED.add(region);
  region.addEventListener('scroll', () => paintScroll(screen), { passive: true });
}

/**
 * Send the column back to the top. Called while the screen is still displayed
 * — scrollTop on a `display:none` element is dropped on the floor.
 */
function resetScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-cbscroll]');
  if (region) region.scrollTop = 0;
  paintScroll(screen);
}

/* ------------------------------------------------------------ board swaps */

const slotAt = (screen: HTMLElement, n: number): HTMLElement | null =>
  q(screen, `[data-cbslot="${n}"]`);

/** Move `data-src` across the first time a board is needed. */
function ensureSrc(slot: HTMLElement | null): void {
  if (!slot) return;
  const img = q<HTMLImageElement>(slot, 'img');
  const src = img && img.getAttribute('data-src');
  if (!img || !src) return;
  img.setAttribute('src', src);
  img.removeAttribute('data-src');
}

/**
 * Show board `n`.
 *
 * The caption and the label are written straight from the record and never
 * assembled from fragments beyond the board number: chellbook's language is a
 * safety boundary, and a sentence that is built at runtime is a sentence that
 * can lose a clause.
 */
function showBoard(P: Parts, n: number, animate: boolean): void {
  const board = CHELL_BOARDS[n];
  if (!board) return;
  const { screen } = P;

  for (const slot of qq(screen, '[data-cbslot]')) {
    const on = Number(slot.getAttribute('data-cbslot')) === n;
    slot.style.opacity = on ? '1' : '0';
    // only the shown board is in the accessibility tree
    slot.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  // the shown board and its two neighbours — nothing else is fetched
  ensureSrc(slotAt(screen, n));
  ensureSrc(slotAt(screen, wrap(n - 1)));
  ensureSrc(slotAt(screen, wrap(n + 1)));

  const cap = q(screen, '[data-cbcap]');
  if (cap) cap.textContent = board.caption;
  const label = q(screen, '[data-cblabel]');
  if (label) label.textContent = `board ${two(n + 1)} · ${board.label}`;
  const count = q(screen, '[data-cbcount]');
  if (count) count.textContent = `board ${two(n + 1)} / ${two(CHELL_BOARDS.length)}`;

  for (const row of qq(screen, '[data-cbrow]')) {
    const on = Number(row.getAttribute('data-cbrow')) === n;
    row.setAttribute('aria-current', on ? 'true' : 'false');
    row.style.borderLeftColor = on ? COLOR.lavender : 'transparent';
    row.style.opacity = on ? '1' : '.62';
  }

  // The slots cross-fade on their own 240ms transition; the plate dithers on
  // top of it so a board change reads like everything else in this design.
  if (animate && P.plate) dIn(P.plate, 40, 380, PLATE_MB);
}

/** Jump straight to a board. Ignored while a transition owns the screen. */
export function goChellbook(stage: HTMLElement, n: number): void {
  const cur = BOARD.get(stage);
  if (cur === undefined || locked(stage)) return;
  const next = wrap(n);
  if (next === cur) return;
  const P = partsFor(stage);
  if (!P) return;
  BOARD.set(stage, next);
  showBoard(P, next, true);
}

/** Step `delta` boards, wrapping at both ends. */
export function stepChellbook(stage: HTMLElement, delta: number): void {
  const cur = BOARD.get(stage);
  if (cur === undefined) return;
  goChellbook(stage, cur + delta);
}

/* -------------------------------------------------------------------- open */

export function openChellbook(stage: HTMLElement, trigger: HTMLElement): void {
  if (locked(stage)) return;
  const s = state(stage);
  if (BOARD.get(stage) !== undefined) return;
  const P = partsFor(stage);
  if (!P) return;

  const { screen, page, plate, chrome, cq } = P;
  const n = boardOf(trigger);
  s.nav = true;
  BOARD.set(stage, n);

  // The page underneath stops being reachable: this screen is aria-modal, and
  // without this Tab would walk straight out of it into the page's own rows.
  if (P.body) {
    P.body.setAttribute('inert', '');
    P.body.setAttribute('aria-hidden', 'true');
  }

  [screen, plate, chrome, cq].forEach((el) => killAnim(el));
  screen.style.display = 'block';
  if (plate) plate.style.filter = '';
  showBoard(P, n, false);
  // measurable now that the screen has a box; the chrome's opacity is 0 but its
  // layout is real, so the rail and the readout are right from frame one
  wireScroll(screen);
  resetScroll(screen);
  subtitleIn(screen, TITLE_ALT);

  // measured after display:block, so the boxes are real
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
    // playIn settles every staged element in place when reduced motion is on
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

  // 2 — the board resolves out of noise, and pulses twice on landing
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

  BOARD.delete(stage);
  state(stage).nav = false;
  // back to the row the screen came out of, not the top of the page
  focusInto(trigger);
}

export function closeChellbook(stage: HTMLElement): void {
  if (locked(stage)) return;
  if (BOARD.get(stage) === undefined) return;
  const P = partsFor(stage);
  if (!P) return;

  const { screen, page, plate, chrome, cq } = P;
  const s = state(stage);
  s.nav = true;

  subtitleOut(screen);
  const trigger = FROM.get(screen) || null;
  const clip0 =
    trigger && trigger.isConnected ? clipFrom(page, trigger) : CLIP.get(screen) || FULL;

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

  // the board dissolves back into noise as the screen collapses
  if (plate) {
    dfxSeq(
      plate,
      [
        [0, 1],
        [LAG + Math.round(SH * 0.3), 1],
        [LAG + SH, 0],
      ],
      PLATE_MB,
    );
  }

  if (cq) {
    // one last boost as the veil collapses, then it clears
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
