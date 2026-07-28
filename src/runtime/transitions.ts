/**
 * Menu ↔ page choreography.
 *
 * Ported from the prototype's `renderVals()` (openPage / closePage / nextPage)
 * plus the Component helpers runIntro / menuFade / veilOpen / navParts.
 * Every duration, offset and easing here is read out of the prototype, not
 * re-derived: the open is G 580 grow · HL 1000 hold · S 680 settle (2260ms to
 * interactive), the close is OUT 240 · LAG 190 · SH 700.
 */

import { focusInto, q, qq } from '../dom';
import { PAGE2, PAGE3 } from '../design/layout';
import { TIMING } from '../design/tokens';
import { bbox, dIn, dfxSeq, killAnim, playIn } from './dither';
import { frostFor } from './frost';
import { ambientGlitch, glitchFont, resetTitleFont, stopAmbientGlitch } from './glitch';
import { locked, state } from './state';

const { G, HL, S, OUT, LAG, SH, INTRO_LOCK, easeOpen, easeClose } = TIMING;

/** nextPage advances sideways: 560 slide + 420 settle. */
const NEXT_D = 560;
const NEXT_S = 420;

/**
 * prefers-reduced-motion: pages cross-fade in this long instead of growing.
 * Exported so page 03's evidence viewer settles on exactly the same beat —
 * two screens fading at two different speeds would read as a bug.
 */
export const REDUCED_FADE = 200;

/** menuFade stagger between parts. */
const FADE_STEP = 46;

export interface NavParts {
  title: HTMLElement | null;
  body: HTMLElement | null;
  /** paintings frame — carries from the cell inset to 40px */
  fr: HTMLElement | null;
  /** competizione checkered band — slides up out of the cell */
  ck: HTMLElement | null;
  /** the page's dither veil canvas */
  cq: HTMLCanvasElement | null;
}

/** The FLIP transform computed on open, reused verbatim on close. */
const FLIP = new WeakMap<HTMLElement, string>();
/** Pending veil settle timers, one per page canvas. */
const SETTLE = new WeakMap<HTMLCanvasElement, number>();

export function navParts(page: HTMLElement): NavParts {
  return {
    title: q(page, '[data-ptitle]'),
    body: q(page, '[data-pbody]'),
    fr: q(page, '[data-pframe]'),
    ck: q(page, '[data-pcheck]'),
    cq: q<HTMLCanvasElement>(page, '[data-frost]'),
  };
}

const attrNum = (el: Element | null, name: string, dflt: number): number => {
  const raw = el ? el.getAttribute(name) : null;
  const n = raw === null || raw === '' ? NaN : parseFloat(raw);
  return Number.isFinite(n) ? n : dflt;
};

/** data-rect on a channel cell: top,right,bottom,left inset in stage space. */
const rectOf = (cell: HTMLElement): number[] => {
  const p = (cell.getAttribute('data-rect') || '0,0,0,0').split(',').map(Number);
  return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] || 0];
};

const insetOf = (r: number[]): string => `inset(${r[0]}px ${r[1]}px ${r[2]}px ${r[3]}px)`;

/** The stage is scaled with transform: scale(k); undo it for FLIP translation. */
const scaleOf = (stage: HTMLElement): number => (stage.getBoundingClientRect().width || 1920) / 1920;

/**
 * FLIP the page title onto the channel word: translate + uniform scale,
 * measured letter-box to letter-box and divided by the stage scale.
 */
function flipTransform(stage: HTMLElement, cell: HTMLElement, title: HTMLElement): string {
  const k = scaleOf(stage);
  const a = bbox(cell);
  const b = bbox(title);
  const s = b.w ? a.w / b.w : 1;
  const dx = ((a.left - b.left) / k).toFixed(2);
  const dy = ((a.top - b.top) / k).toFixed(2);
  return `translate(${dx}px,${dy}px) scale(${s.toFixed(5)})`;
}

/** A page's own top-left close control — the landing spot when a page opens. */
const closeOf = (page: HTMLElement): HTMLElement | null => q(page, '[data-act="close"]');

/**
 * Reveal every intro-staged element in `scope` with no motion and no dither —
 * the reduced-motion equivalent of playIn, and the prototype's settleNow.
 */
function settleScope(scope: HTMLElement): void {
  qq(scope, '[data-dither]').forEach((el) => {
    el.style.filter = '';
    qq(el, 'span').forEach((sp) => {
      sp.style.visibility = 'visible';
      sp.style.color = '';
    });
  });
  qq(scope, '[data-intro]').forEach((el) => {
    el.style.animation = 'none';
    el.style.clipPath = 'none';
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  qq(scope, '[data-dfx]').forEach((el) => {
    el.style.filter = '';
    el.style.opacity = '1';
  });
}

/* ── the dither veil ─────────────────────────────────────────────────────── */

/**
 * Open the page's dither veil: boost the field for the grow + hold, then drop
 * back to the canvas's declared rest mode / rate / opacity over the settle.
 */
export function veilOpen(cq: HTMLCanvasElement | null, g: number, h: number, s: number): void {
  if (!cq) return;
  const fx = frostFor(cq);
  clearTimeout(SETTLE.get(cq));
  // the prototype assigns _rate outright here; a 1ms tween is the handle equivalent
  fx?.tween('rate', attrNum(cq, 'data-rate', 9), 1);
  fx?.setMode(attrNum(cq, 'data-mode', 0));
  fx?.tween('boost', attrNum(cq, 'data-boost', 3), g);
  cq.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: Math.round(g * 0.72),
    easing: 'linear',
    fill: 'both',
  });
  SETTLE.set(
    cq,
    window.setTimeout(() => {
      fx?.setMode(attrNum(cq, 'data-rest-mode', attrNum(cq, 'data-mode', 0)));
      fx?.tween('boost', 1, s);
      fx?.tween('rate', attrNum(cq, 'data-rest-rate', 1), s);
      cq.animate([{ opacity: 1 }, { opacity: cq.getAttribute('data-rest-op') || '1' }], {
        duration: s,
        easing: 'linear',
        fill: 'both',
      });
    }, g + h),
  );
}

/**
 * Reduced motion: land the veil straight on its rest state, no boost pass.
 * Exported for page 03's evidence viewer, which has a veil of its own and must
 * honour the same contract — a veil that still boosts under reduced motion is
 * the stub this codebase does not allow.
 */
export function veilRest(cq: HTMLCanvasElement | null, fade: number): void {
  if (!cq) return;
  const fx = frostFor(cq);
  clearTimeout(SETTLE.get(cq));
  fx?.setMode(attrNum(cq, 'data-rest-mode', attrNum(cq, 'data-mode', 0)));
  fx?.tween('boost', 1, 1);
  fx?.tween('rate', attrNum(cq, 'data-rest-rate', 1), 1);
  cq.animate([{ opacity: 0 }, { opacity: cq.getAttribute('data-rest-op') || '1' }], {
    duration: fade,
    easing: 'linear',
    fill: 'both',
  });
}

/**
 * Back to the canvas's declared base state so a re-open starts clean.
 * Exported alongside veilOpen / veilRest for page 03's evidence viewer.
 */
export function resetVeil(cq: HTMLCanvasElement | null): void {
  if (!cq) return;
  clearTimeout(SETTLE.get(cq));
  SETTLE.delete(cq);
  const fx = frostFor(cq);
  fx?.tween('boost', 1, 1);
  fx?.tween('rate', 1, 1);
  fx?.setMode(attrNum(cq, 'data-mode', 0));
}

/* ── the menu ────────────────────────────────────────────────────────────── */

/**
 * Dither the menu out beneath an opening page (or back in behind a closing
 * one). Order is the prototype's: wordmark lines, tagline, channels, bars,
 * crest last — each 46ms behind the one before.
 */
export function menuFade(stage: HTMLElement, out: boolean): void {
  const menu = q(stage, '[data-menu]');
  if (!menu) return;

  const parts: [HTMLElement, number][] = [];
  qq(menu, '[data-dither]').forEach((el) => parts.push([el, 13]));
  const tag = q(menu, '[data-intro="fade"]');
  if (tag) parts.push([tag, 7]);
  qq(menu, '[data-channel]').forEach((c) =>
    parts.push([(c.firstElementChild as HTMLElement) || c, 11]),
  );
  qq(menu, '[data-mfade]').forEach((el) => parts.push([el, 7]));
  const crest = q(stage, '[data-logo]');
  if (crest) parts.push([crest, 15]);

  if (state(stage).reduced) {
    // no dither pass either way — the opaque page already covers the menu
    parts.forEach(([el]) => {
      el.style.filter = '';
    });
    return;
  }

  parts.forEach(([el, mb], i) => {
    const d = i * FADE_STEP;
    if (out) dfxSeq(el, [[0, 1], [d, 1], [d + 400, 0]], mb);
    else dIn(el, d, d + 380, mb);
  });
}

/* ── menu → page ─────────────────────────────────────────────────────────── */

export function openPage(stage: HTMLElement, n: number, cell: HTMLElement): void {
  if (locked(stage)) return;
  const page = q(stage, `[data-page="${n}"]`);
  if (!page) return;

  const s = state(stage);
  s.nav = true;
  s.open = n;
  stopAmbientGlitch(stage);

  const rc = rectOf(cell);
  const clip0 = insetOf(rc);

  // freeze the channel's hover animation so the FLIP source box is stable
  qq(cell, '[data-l]').forEach((sp) => {
    sp.style.animation = 'none';
    sp.style.transform = 'none';
  });
  const word = q(cell, '[data-word]');
  if (word) word.style.animation = 'none';

  page.style.display = 'block';
  page.style.clipPath = clip0;

  const P = navParts(page);
  [page, P.title, P.body, P.fr, P.ck, P.cq].forEach((el) => killAnim(el));
  if (P.cq) clearTimeout(SETTLE.get(P.cq));
  if (P.title) {
    resetTitleFont(P.title);
    P.title.style.transform = 'none';
  }

  if (s.reduced) {
    page.style.clipPath = 'inset(0px 0px 0px 0px)';
    page.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
    if (P.title) {
      P.title.style.filter = '';
      // land on the alternates — the page title's final font — without the walk
      glitchFont(P.title, true, 0, true);
    }
    if (P.body) {
      P.body.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: REDUCED_FADE,
        easing: 'linear',
        fill: 'both',
      });
    }
    veilRest(P.cq, REDUCED_FADE);
    settleScope(page);
    menuFade(stage, true);
    window.setTimeout(() => {
      s.nav = false;
      focusInto(closeOf(page));
    }, REDUCED_FADE);
    return;
  }

  // 1 — the cell becomes the page
  page.animate([{ clipPath: clip0 }, { clipPath: 'inset(0px 0px 0px 0px)' }], {
    duration: G,
    easing: easeOpen,
    fill: 'both',
  });

  // 2/3 — the channel word travels and grows into the page title, then glitches
  if (P.title) {
    const title = P.title;
    const tk0 = flipTransform(stage, cell, title);
    FLIP.set(page, tk0);
    title.animate([{ transform: tk0 }, { transform: 'none' }], {
      duration: G,
      easing: easeOpen,
      fill: 'both',
    });
    dIn(title, Math.round(G * 0.26), G + Math.round(HL * 0.52), 15);
    window.setTimeout(() => glitchFont(title, true), G + Math.round(HL * 0.34));
  }

  // 4 — the dither veil opens across the page
  veilOpen(P.cq, G, HL, S);

  // 5 — page furniture fades in, then each bar/block dithers in on its stagger
  if (P.body) {
    P.body.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: Math.round(S * 0.8),
      delay: G + HL,
      easing: 'linear',
      fill: 'both',
    });
  }

  // 6 — page-specific carries
  if (P.fr) {
    const inset = `${PAGE2.frameInset}px`;
    P.fr.animate(
      [
        { top: `${rc[0]}px`, right: `${rc[1]}px`, bottom: `${rc[2]}px`, left: `${rc[3]}px` },
        { top: inset, right: inset, bottom: inset, left: inset },
      ],
      { duration: G, easing: easeOpen, fill: 'both' },
    );
  }
  if (P.ck) {
    // the band is two rows tall; it enters one row short and slides up from the cell
    const row = PAGE3.checker.h / 2;
    P.ck.animate(
      [
        {
          transform: `translateY(${rc[0] + row - PAGE3.checker.top}px)`,
          clipPath: `inset(0px 0px ${row}px 0px)`,
        },
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px)' },
      ],
      { duration: G, easing: easeOpen, fill: 'both' },
    );
  }

  // 7 — the menu dithers out beneath
  menuFade(stage, true);

  window.setTimeout(() => playIn(page, 40), G + HL);
  window.setTimeout(() => {
    s.nav = false;
    focusInto(closeOf(page));
  }, G + HL + S);
}

/* ── page → menu ─────────────────────────────────────────────────────────── */

/**
 * Everything the page touched goes back to its authored state: animations,
 * dither filters, transforms, the alternate font, the veil's canvas mode and
 * the channel cell's own hover animation.
 */
function finishClose(stage: HTMLElement, page: HTMLElement, cell: HTMLElement, P: NavParts): void {
  page.style.display = 'none';
  page.style.clipPath = '';
  [page, P.title, P.body, P.fr, P.ck, P.cq].forEach((el) => killAnim(el));
  if (P.title) {
    resetTitleFont(P.title);
    P.title.style.transform = 'none';
    P.title.style.filter = '';
  }
  resetVeil(P.cq);

  qq(cell, '[data-l]').forEach((sp) => {
    sp.style.animation = '';
    sp.style.transform = '';
  });
  const word = q(cell, '[data-word]');
  if (word) word.style.animation = '';

  const s = state(stage);
  s.open = null;
  s.nav = false;
  if (!s.reduced) ambientGlitch(stage);
  // Back to the channel the page came out of, not the top of the document.
  // Deferred a frame: main.ts lifts the menu's `inert` from a MutationObserver
  // watching the page's style, so the menu is still inert at this point.
  requestAnimationFrame(() => focusInto(cell));
}

export function closePage(stage: HTMLElement): void {
  if (locked(stage)) return;
  const s = state(stage);
  const n = s.open;
  if (n === null) return;
  const page = q(stage, `[data-page="${n}"]`);
  const cell = q(stage, `[data-open="${n}"]`);
  if (!page || !cell) return;

  s.nav = true;

  const rc = rectOf(cell);
  const clip0 = insetOf(rc);
  const P = navParts(page);

  let tk = FLIP.get(page) || null;
  if (P.title) {
    killAnim(P.title);
    P.title.style.transform = 'none';
    if (!s.reduced) glitchFont(P.title, false, 26); // back to Karrik, 26ms step
    if (!tk) tk = flipTransform(stage, cell, P.title);
  }

  if (s.reduced) {
    page.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
    menuFade(stage, false);
    window.setTimeout(() => finishClose(stage, page, cell, P), REDUCED_FADE);
    return;
  }

  // read the veil's resting opacity before the fill:both animations are canceled
  const op0 = P.cq ? getComputedStyle(P.cq).opacity || '1' : '1';
  [page, P.body, P.fr, P.ck, P.cq].forEach((el) => killAnim(el));

  if (P.body) {
    P.body.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: OUT,
      easing: 'cubic-bezier(.4,0,1,1)',
      fill: 'both',
    });
  }

  page.animate([{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: clip0 }], {
    duration: SH,
    delay: LAG,
    easing: easeClose,
    fill: 'both',
  });

  if (tk && P.title) {
    P.title.animate([{ transform: 'none' }, { transform: tk }], {
      duration: SH,
      delay: LAG,
      easing: easeClose,
      fill: 'both',
    });
    dfxSeq(P.title, [[0, 1], [LAG + Math.round(SH * 0.3), 1], [LAG + SH, 0]], 15);
  }

  if (P.fr) {
    const inset = `${PAGE2.frameInset}px`;
    P.fr.animate(
      [
        { top: inset, right: inset, bottom: inset, left: inset },
        { top: `${rc[0]}px`, right: `${rc[1]}px`, bottom: `${rc[2]}px`, left: `${rc[3]}px` },
      ],
      { duration: SH, delay: LAG, easing: easeClose, fill: 'both' },
    );
  }
  if (P.ck) {
    const row = PAGE3.checker.h / 2;
    P.ck.animate(
      [
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px)' },
        {
          transform: `translateY(${rc[0] + row - PAGE3.checker.top}px)`,
          clipPath: `inset(0px 0px ${row}px 0px)`,
        },
      ],
      { duration: SH, delay: LAG, easing: easeClose, fill: 'both' },
    );
  }

  if (P.cq) {
    const cq = P.cq;
    clearTimeout(SETTLE.get(cq));
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

  window.setTimeout(() => menuFade(stage, false), LAG + Math.round(SH * 0.42));
  window.setTimeout(() => finishClose(stage, page, cell, P), LAG + SH);
}

/* ── page → page ─────────────────────────────────────────────────────────── */

function finishNext(stage: HTMLElement, from: HTMLElement, to: HTMLElement): void {
  from.style.display = 'none';
  killAnim(from);
  const fq = q<HTMLCanvasElement>(from, '[data-frost]');
  if (fq) {
    killAnim(fq);
    resetVeil(fq);
  }
  to.style.zIndex = '6';
  state(stage).nav = false;
  focusInto(closeOf(to));
}

/** Advance to channel `n` without returning to the menu. */
export function nextPage(stage: HTMLElement, n: number): void {
  if (locked(stage)) return;
  const s = state(stage);
  const cur = s.open;
  if (cur === null || cur === n) return;
  const from = q(stage, `[data-page="${cur}"]`);
  const to = q(stage, `[data-page="${n}"]`);
  if (!from || !to || from === to) return;

  s.nav = true;
  s.open = n;

  const T = navParts(to);
  [to, T.title, T.body, T.fr, T.ck, T.cq].forEach((el) => killAnim(el));
  if (T.cq) clearTimeout(SETTLE.get(T.cq));

  to.style.display = 'block';
  to.style.zIndex = '7';
  to.style.clipPath = 'inset(0px 0px 0px 0px)';
  if (T.title) {
    resetTitleFont(T.title);
    T.title.style.transform = 'none';
  }
  const fromTitle = q(from, '[data-ptitle]');
  if (fromTitle) resetTitleFont(fromTitle);

  if (s.reduced) {
    to.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
    if (T.title) {
      T.title.style.filter = '';
      glitchFont(T.title, true, 0, true);
    }
    if (T.body) {
      T.body.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: REDUCED_FADE,
        easing: 'linear',
        fill: 'both',
      });
    }
    veilRest(T.cq, REDUCED_FADE);
    settleScope(to);
    window.setTimeout(() => finishNext(stage, from, to), REDUCED_FADE);
    return;
  }

  to.animate([{ clipPath: 'inset(0px 0px 0px 100%)' }, { clipPath: 'inset(0px 0px 0px 0px)' }], {
    duration: NEXT_D,
    easing: easeClose,
    fill: 'both',
  });

  if (T.title) {
    const title = T.title;
    title.animate([{ transform: 'translateX(190px)' }, { transform: 'none' }], {
      duration: NEXT_D + 90,
      easing: easeClose,
      fill: 'both',
    });
    dIn(title, 110, NEXT_D + 240, 15);
    window.setTimeout(() => glitchFont(title, true), NEXT_D + 200);
  }
  if (fromTitle) dfxSeq(fromTitle, [[0, 1], [40, 1], [Math.round(NEXT_D * 0.8), 0]], 15);

  if (T.body) {
    T.body.animate(
      [
        { opacity: 0, transform: 'translateX(96px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: NEXT_D + 90, easing: easeClose, fill: 'both' },
    );
  }

  if (T.cq) {
    const cq = T.cq;
    const fx = frostFor(cq);
    fx?.tween('rate', attrNum(cq, 'data-rate', 9), 1);
    fx?.setMode(attrNum(cq, 'data-mode', 0));
    fx?.tween('boost', attrNum(cq, 'data-boost', 3) * 0.8, Math.round(NEXT_D * 0.6));
    cq.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: Math.round(NEXT_D * 0.5),
      easing: 'linear',
      fill: 'both',
    });
    SETTLE.set(
      cq,
      window.setTimeout(() => {
        fx?.setMode(attrNum(cq, 'data-rest-mode', attrNum(cq, 'data-mode', 0)));
        fx?.tween('boost', 1, NEXT_S);
        fx?.tween('rate', attrNum(cq, 'data-rest-rate', 1), NEXT_S);
        cq.animate([{ opacity: 1 }, { opacity: cq.getAttribute('data-rest-op') || '1' }], {
          duration: NEXT_S,
          easing: 'linear',
          fill: 'both',
        });
      }, NEXT_D),
    );
  }

  from.animate([{ transform: 'none' }, { transform: 'translateX(-140px)' }], {
    duration: NEXT_D,
    easing: easeClose,
    fill: 'both',
  });

  playIn(to, 140);
  window.setTimeout(() => finishNext(stage, from, to), NEXT_D + NEXT_S);
}

/* ── intro ───────────────────────────────────────────────────────────────── */

/**
 * No black screen, no logo flight: the crest, the wordmark letters and every
 * other staged element resolve in place, in parallel, on their own delays
 * (header 480–600, channels 900/990/1080, contact strip 1300 — carried on the
 * builders' data-in-delay attributes and read by playIn). Input locks 2300ms.
 */
export function runIntro(stage: HTMLElement): void {
  const s = state(stage);
  if (s.nav) return; // a transition owns the stage; the intro lock itself is replayable

  const crest = q(stage, '[data-logo]');

  if (s.reduced) {
    s.introUntil = 0;
    stopAmbientGlitch(stage);
    settleScope(stage);
    if (crest) {
      killAnim(crest);
      crest.style.transform = 'none';
      crest.style.opacity = '1';
      crest.style.filter = '';
    }
    return;
  }

  s.introUntil = performance.now() + INTRO_LOCK;
  playIn(stage, 0, true);
  if (crest) {
    killAnim(crest);
    crest.style.transform = 'none';
    crest.style.opacity = '1';
    dIn(crest, 60, 900, 26); // crest resolves out of noise, blur radius 26
  }
  ambientGlitch(stage);
}
