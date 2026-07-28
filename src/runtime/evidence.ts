/**
 * Page 03 ↔ branchial lateral spine case study choreography.
 *
 * The same move the menu makes into a page, one level down: the clicked
 * element's box becomes the whole screen. `openEvidence` measures the trigger's
 * rect live (the channel cells can hardcode `data-rect`; a hero and four list
 * rows cannot), grows a clip-path inset from it, opens the viewer's own dither
 * veil, and resolves the plate out of noise with `dIn` — the pulsing settle,
 * not a fade. `closeEvidence` runs it backwards into the same rect, so the
 * screen collapses into the thing you clicked rather than vanishing.
 *
 * Timing is the tokens' own, at the nextPage weight: this opens on top of a
 * page that is already up, so it takes 580 grow + 260 hold + 420 settle rather
 * than the menu→page 580 + 1000 + 680. A 1000ms hold before one image resolves
 * is a wait, not a beat.
 *
 * prefers-reduced-motion takes the same exit every other transition here takes:
 * no grow, no dither pass, a REDUCED_FADE cross-fade, the veil parked at rest
 * and every staged element settled in place.
 *
 * The screen's text half is a native scroll container, so scrolling itself
 * needs no code. What lives here is its 6px rust rail and its "you are here"
 * readout, both painted from one passive `scroll` listener, plus the reset that
 * sends the column back to the top so a re-open starts clean. The rail is an
 * indicator, never a drag handle — see the note in `src/pages/evidence.ts`.
 */

import { focusInto, q, qq } from '../dom.ts';
import { STAGE } from '../design/layout.ts';
import { COLOR, TIMING } from '../design/tokens.ts';
import { EV_SHEETS, HERO, SYSTEMS, sheetForImage } from '../data/competizione.ts';
import { dIn, dfxSeq, killAnim, playIn } from './dither.ts';
import { frostFor } from './frost.ts';
import { locked, state } from './state.ts';
import { subtitleIn, subtitleOut, subtitleReset } from './glitch.ts';
import { REDUCED_FADE, resetVeil, veilOpen, veilRest } from './transitions.ts';

const { G, OUT, LAG, SH, easeOpen, easeClose } = TIMING;

/** Hold between the grow landing and the chrome arriving. This screen's own. */
const HOLD = 260;
/** Settle. The nextPage weight (420), not the menu→page weight (680). */
const SETTLE = 420;
/**
 * When the title takes the alternate face, measured from the open. After the
 * chrome has arrived (G + HOLD) and its staged wipe has run, so the swap is
 * seen rather than hidden under a clip-path.
 */
const TITLE_ALT = G + HOLD + SETTLE + 120;

/** Blur radius for the plate's dither-in — 17 suits a 945 × 580 box. */
const PLATE_MB = 17;
/** Shortest the text column's rail thumb is allowed to get. */
const THUMB_MIN = 28;

/** The element the viewer grew out of, so the close can collapse back into it. */
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

/** Sheet numbers wrap — the record is a loop, not a list with two dead ends. */
const wrap = (n: number): number => ((n % EV_SHEETS.length) + EV_SHEETS.length) % EV_SHEETS.length;

interface Parts {
  viewer: HTMLElement;
  page: HTMLElement;
  /** the page's own furniture, made inert while the viewer owns the screen */
  body: HTMLElement | null;
  plate: HTMLElement | null;
  chrome: HTMLElement | null;
  cq: HTMLCanvasElement | null;
}

function partsFor(stage: HTMLElement): Parts | null {
  const viewer = q(stage, '[data-evidence]');
  if (!viewer) return null;
  const page = viewer.closest<HTMLElement>('[data-page]');
  if (!page) return null;
  return {
    viewer,
    page,
    body: q(page, '[data-pbody]'),
    plate: q(viewer, '[data-evplate]'),
    chrome: q(viewer, '[data-evchrome]'),
    cq: q<HTMLCanvasElement>(viewer, '[data-frost]'),
  };
}

/** The viewer's top-left close control — the landing spot when it opens. */
const closeOf = (viewer: HTMLElement): HTMLElement | null =>
  q(viewer, '[data-act="evidence-close"]');

/**
 * The trigger's box as a clip inset in the page's own 1920 × 1080 space.
 *
 * Measured rather than declared: `openPage` can read `data-rect` off a channel
 * cell because the menu's four cells are fixed geometry, but the five triggers
 * here include list rows whose position depends on the row height. Both rects
 * come from the same call stack, so dividing by the stage scale is enough —
 * no reflow between the two reads.
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

/**
 * Which sheet a trigger opens on. The four list rows declare it; the hero does
 * not, because it opens on whichever plate it is currently showing.
 */
function sheetOf(stage: HTMLElement, trigger: HTMLElement): number {
  const raw = trigger.getAttribute('data-sheet');
  if (raw !== null && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return wrap(n);
  }
  const sel = state(stage).selectedSystem;
  const rec = sel > 0 && sel <= SYSTEMS.length ? SYSTEMS[sel - 1] : HERO;
  return sheetForImage(rec.image);
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
function paintScroll(viewer: HTMLElement): void {
  const region = q(viewer, '[data-evscroll]');
  if (!region) return;

  const view = region.clientHeight;
  const total = region.scrollHeight;
  const over = total - view;
  // A hidden viewer measures zero and every section reports offsetTop 0, which
  // would read as "the last section". The scroll event queued by resetScroll on
  // close lands after display:none, so this guard is load-bearing, not defensive.
  if (!view) return;

  const thumb = q(viewer, '[data-evthumb]');
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

  const at = q(viewer, '[data-evsecat]');
  if (!at) return;
  const secs = qq(region, '[data-evsec]');
  if (!secs.length) return;
  // whichever section owns the top of the window, not the middle: the heading
  // a reader has just passed is the one they are reading under
  const probe = region.scrollTop + view * 0.28;
  let cur = 0;
  secs.forEach((s, i) => {
    if (s.offsetTop <= probe) cur = i;
  });
  const name = secs[cur].getAttribute('data-evsec-name') || '';
  at.textContent = `${two(cur + 1)} / ${two(secs.length)} · ${name}`;
}

function wireScroll(viewer: HTMLElement): void {
  const region = q(viewer, '[data-evscroll]');
  if (!region || SCROLLED.has(region)) return;
  SCROLLED.add(region);
  region.addEventListener('scroll', () => paintScroll(viewer), { passive: true });
}

/**
 * Send the column back to the top. Called while the viewer is still displayed
 * — scrollTop on a `display:none` element is dropped on the floor.
 */
function resetScroll(viewer: HTMLElement): void {
  const region = q(viewer, '[data-evscroll]');
  if (region) region.scrollTop = 0;
  paintScroll(viewer);
}

/* ------------------------------------------------------------ sheet swaps */

const slotAt = (viewer: HTMLElement, n: number): HTMLElement | null =>
  q(viewer, `[data-evslot="${n}"]`);

/** Move `data-src` across the first time a sheet is needed. */
function ensureSrc(slot: HTMLElement | null): void {
  if (!slot) return;
  const img = q<HTMLImageElement>(slot, 'img');
  const src = img && img.getAttribute('data-src');
  if (!img || !src) return;
  img.setAttribute('src', src);
  img.removeAttribute('data-src');
}

/**
 * Show sheet `n`.
 *
 * The caption is written straight from the record and never assembled from
 * fragments: it carries the evidence qualifier, and a qualifier that is built
 * at runtime is a qualifier that can lose a clause.
 */
function showSheet(P: Parts, n: number, animate: boolean): void {
  const sheet = EV_SHEETS[n];
  if (!sheet) return;
  const { viewer } = P;

  for (const slot of qq(viewer, '[data-evslot]')) {
    const on = Number(slot.getAttribute('data-evslot')) === n;
    slot.style.opacity = on ? '1' : '0';
    // only the shown sheet is in the accessibility tree
    slot.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  // the shown sheet and its two neighbours — nothing else is fetched
  ensureSrc(slotAt(viewer, n));
  ensureSrc(slotAt(viewer, wrap(n - 1)));
  ensureSrc(slotAt(viewer, wrap(n + 1)));

  const cap = q(viewer, '[data-evcap]');
  if (cap) cap.textContent = sheet.caption;
  const kind = q(viewer, '[data-evkind]');
  if (kind) kind.textContent = sheet.kind;
  const count = q(viewer, '[data-evcount]');
  if (count) count.textContent = `sheet ${two(n + 1)} / ${two(EV_SHEETS.length)}`;

  for (const row of qq(viewer, '[data-evrow]')) {
    const on = Number(row.getAttribute('data-evrow')) === n;
    row.setAttribute('aria-current', on ? 'true' : 'false');
    row.style.borderLeftColor = on ? COLOR.lavender : 'transparent';
    row.style.opacity = on ? '1' : '.62';
  }

  // The slots cross-fade on their own 240ms CSS transition; the plate dithers
  // on top of it so a sheet change reads like everything else in this design.
  if (animate && P.plate) dIn(P.plate, 40, 380, PLATE_MB);
}

/** Jump straight to a sheet. Ignored while a transition owns the screen. */
export function goEvidence(stage: HTMLElement, n: number): void {
  const s = state(stage);
  if (s.evidence === null || locked(stage)) return;
  const next = wrap(n);
  if (next === s.evidence) return;
  const P = partsFor(stage);
  if (!P) return;
  s.evidence = next;
  showSheet(P, next, true);
}

/** Step `delta` sheets, wrapping at both ends. */
export function stepEvidence(stage: HTMLElement, delta: number): void {
  const s = state(stage);
  if (s.evidence === null) return;
  goEvidence(stage, s.evidence + delta);
}

/* -------------------------------------------------------------------- open */

export function openEvidence(stage: HTMLElement, trigger: HTMLElement): void {
  if (locked(stage)) return;
  const s = state(stage);
  if (s.evidence !== null) return;
  const P = partsFor(stage);
  if (!P) return;

  const { viewer, page, plate, chrome, cq } = P;
  const n = sheetOf(stage, trigger);
  s.nav = true;
  s.evidence = n;

  // The page underneath stops being reachable: the viewer is aria-modal, and
  // without this Tab would walk straight out of it into the page's own rows.
  if (P.body) {
    P.body.setAttribute('inert', '');
    P.body.setAttribute('aria-hidden', 'true');
  }

  [viewer, plate, chrome, cq].forEach((el) => killAnim(el));
  viewer.style.display = 'block';
  subtitleIn(viewer, TITLE_ALT);
  if (plate) plate.style.filter = '';
  showSheet(P, n, false);
  // measurable now that the screen has a box; the chrome's opacity is 0 but
  // its layout is real, so the rail and the readout are right from frame one
  wireScroll(viewer);
  resetScroll(viewer);

  // measured after display:block, so the boxes are real
  const clip0 = clipFrom(page, trigger);
  FROM.set(viewer, trigger);
  CLIP.set(viewer, clip0);
  viewer.style.clipPath = clip0;

  const settled = (): void => {
    s.nav = false;
    focusInto(closeOf(viewer));
  };

  if (s.reduced) {
    viewer.style.clipPath = FULL;
    viewer.animate([{ opacity: 0 }, { opacity: 1 }], {
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
    playIn(viewer, 0);
    window.setTimeout(settled, REDUCED_FADE);
    return;
  }

  // 1 — the clicked box becomes the screen
  viewer.animate([{ clipPath: clip0 }, { clipPath: FULL }], {
    duration: G,
    easing: easeOpen,
    fill: 'both',
  });

  // 2 — the sheet resolves out of noise, and pulses twice on landing
  if (plate) dIn(plate, Math.round(G * 0.26), G + 340, PLATE_MB);

  // 3 — the viewer's own dither veil opens across it
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

  window.setTimeout(() => playIn(viewer, 40), G + HOLD);
  window.setTimeout(settled, G + HOLD + SETTLE);
}

/* ------------------------------------------------------------------- close */

function finishClose(stage: HTMLElement, P: Parts, trigger: HTMLElement | null): void {
  const { viewer, plate, chrome, cq } = P;
  resetScroll(viewer); // while it is still displayed, or the write is dropped
  viewer.style.display = 'none';
  viewer.style.clipPath = '';
  [viewer, plate, chrome, cq].forEach((el) => killAnim(el));
  if (plate) plate.style.filter = '';
  resetVeil(cq);
  subtitleReset(viewer);

  if (P.body) {
    P.body.removeAttribute('inert');
    P.body.setAttribute('aria-hidden', 'false');
  }

  const s = state(stage);
  s.evidence = null;
  s.nav = false;
  // back to the plate or the row the viewer came out of, not the top of the page
  focusInto(trigger);
}

export function closeEvidence(stage: HTMLElement): void {
  if (locked(stage)) return;
  const s = state(stage);
  if (s.evidence === null) return;
  const P = partsFor(stage);
  if (!P) return;

  const { viewer, page, plate, chrome, cq } = P;
  s.nav = true;

  subtitleOut(viewer);
  const trigger = FROM.get(viewer) || null;
  const clip0 =
    trigger && trigger.isConnected ? clipFrom(page, trigger) : CLIP.get(viewer) || FULL;

  if (s.reduced) {
    viewer.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
    window.setTimeout(() => finishClose(stage, P, trigger), REDUCED_FADE);
    return;
  }

  // read the veil's resting opacity before the fill:both animations are canceled
  const op0 = cq ? getComputedStyle(cq).opacity || '1' : '1';
  [viewer, chrome, cq].forEach((el) => killAnim(el));

  if (chrome) {
    chrome.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: OUT,
      easing: 'cubic-bezier(.4,0,1,1)',
      fill: 'both',
    });
  }

  viewer.animate([{ clipPath: FULL }, { clipPath: clip0 }], {
    duration: SH,
    delay: LAG,
    easing: easeClose,
    fill: 'both',
  });

  // the sheet dissolves back into noise as the screen collapses
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
