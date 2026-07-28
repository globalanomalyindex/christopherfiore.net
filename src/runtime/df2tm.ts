/**
 * Page 01 ↔ df2tm subpage choreography.
 *
 * Identical in shape to `runtime/about.ts`, because the two screens are
 * identical in kind: prose in a scroll column with a jump index, grown out of
 * the control that opened it. The clicked row's box becomes the whole screen,
 * and closing collapses it back into that same row.
 *
 * STATE LIVES HERE, in a module-local WeakSet keyed by the stage, for the same
 * reason chellbook's does: `runtime/actions.ts` must be able to ask which
 * screen owns Escape, and two screens must never both believe they are open.
 */

import { focusInto, q, qq } from '../dom.ts';
import { STAGE } from '../design/layout.ts';
import { TIMING } from '../design/tokens.ts';
import { COLOR } from '../design/tokens.ts';
import { killAnim, playIn } from './dither.ts';
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

/** Shortest the rail thumb is allowed to get. */
const THUMB_MIN = 28;

const FULL = 'inset(0px 0px 0px 0px)';

/** Stages whose df2tm screen is currently up. */
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
 * True while the df2tm screen is up. `runtime/actions.ts` asks this before
 * routing Escape, the way it asks `chellbookOpen` for the case-study screen.
 */
export function df2tmOpen(stage: HTMLElement): boolean {
  return OPEN.has(stage);
}

interface Parts {
  screen: HTMLElement;
  page: HTMLElement;
  /** the page's own furniture, made inert while this screen owns the stage */
  body: HTMLElement | null;
  chrome: HTMLElement | null;
  cq: HTMLCanvasElement | null;
}

function partsFor(stage: HTMLElement): Parts | null {
  const screen = q(stage, '[data-df2tm]');
  if (!screen) return null;
  const page = screen.closest<HTMLElement>('[data-page]');
  if (!page) return null;
  return {
    screen,
    page,
    body: q(page, '[data-pbody]'),
    chrome: q(screen, '[data-dfchrome]'),
    cq: q<HTMLCanvasElement>(screen, '[data-frost]'),
  };
}

const closeOf = (screen: HTMLElement): HTMLElement | null =>
  q(screen, '[data-act="df2tm-close"]');

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
 * Draw the rail thumb, the section readout, and the index's current row. Cheap
 * enough to run straight off the scroll event: a handful of style writes and
 * one text write, no layout reads beyond the container's own metrics.
 */
function paintScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-dfscroll]');
  if (!region) return;

  const view = region.clientHeight;
  const total = region.scrollHeight;
  const over = total - view;
  // A hidden screen measures zero and every section reports offsetTop 0, which
  // would read as "the last section". The scroll event queued by resetScroll on
  // close lands after display:none, so this guard is load-bearing.
  if (!view) return;

  const thumb = q(screen, '[data-dfthumb]');
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

  const secs = qq(region, '[data-dfsec]');
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

  const at = q(screen, '[data-dfsecat]');
  if (at) {
    const name = secs[cur].getAttribute('data-dfsec-name') || '';
    /*
      The standfirst is scroll section 0 but is not one of the numbered
      sections, so it is named without a count. Numbering it would make this
      readout say "01 / 07" while the index beside it lists six and the footer
      says six — three different answers to "how many sections is this".
    */
    at.textContent = cur === 0 ? name : `${two(cur)} / ${two(secs.length - 1)} · ${name}`;
  }

  /*
    The index lists DF2TM_SECTIONS; the scroll column carries one extra section
    ahead of them (the standfirst), so index row n is scroll section n + 1.
    While the standfirst is on screen no row is current, which is correct: it is
    not one of the sections.
  */
  for (const row of qq(screen, '[data-dfrow]')) {
    const on = Number(row.getAttribute('data-dfrow')) + 1 === cur;
    row.setAttribute('aria-current', on ? 'true' : 'false');
    row.style.borderLeftColor = on ? COLOR.lavender : 'transparent';
    row.style.opacity = on ? '1' : '.62';
  }
}

function wireScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-dfscroll]');
  if (!region || SCROLLED.has(region)) return;
  SCROLLED.add(region);
  region.addEventListener('scroll', () => paintScroll(screen), { passive: true });
}

/** Send the column back to the top, while the screen is still displayed. */
function resetScroll(screen: HTMLElement): void {
  const region = q(screen, '[data-dfscroll]');
  if (region) region.scrollTop = 0;
  paintScroll(screen);
}

/**
 * Jump the column to section `n` of the index. Smooth unless the visitor has
 * asked for reduced motion, in which case it lands immediately.
 */
export function goDf2tm(stage: HTMLElement, n: number): void {
  if (!OPEN.has(stage)) return;
  const P = partsFor(stage);
  if (!P) return;
  const region = q(P.screen, '[data-dfscroll]');
  if (!region) return;
  // index row n is scroll section n + 1: the standfirst is section 0
  const target = q(P.screen, `[data-absec="${n + 1}"]`);
  if (!target) return;
  region.scrollTo({
    top: target.offsetTop,
    behavior: state(stage).reduced ? 'auto' : 'smooth',
  });
}

/* -------------------------------------------------------------------- open */

export function openDf2tm(stage: HTMLElement, trigger: HTMLElement): void {
  if (locked(stage)) return;
  if (OPEN.has(stage)) return;
  const P = partsFor(stage);
  if (!P) return;

  const { screen, page, chrome, cq } = P;
  const s = state(stage);
  s.nav = true;
  OPEN.add(stage);

  // The page underneath stops being reachable: this screen is aria-modal, and
  // without this Tab would walk straight out of it into the page's own rows.
  if (P.body) {
    P.body.setAttribute('inert', '');
    P.body.setAttribute('aria-hidden', 'true');
  }

  [screen, chrome, cq].forEach((el) => killAnim(el));
  screen.style.display = 'block';
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

  // 2 — the screen's own dither veil opens across it
  veilOpen(cq, G, HOLD, SETTLE);

  // 3 — the chrome arrives after the hold, then staggers itself in
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
  const { screen, chrome, cq } = P;
  resetScroll(screen); // while it is still displayed, or the write is dropped
  screen.style.display = 'none';
  screen.style.clipPath = '';
  [screen, chrome, cq].forEach((el) => killAnim(el));
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

export function closeDf2tm(stage: HTMLElement): void {
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
