/**
 * Display type fitting, by measurement.
 *
 * WHY THIS FILE EXISTS. The display face used to be Monaco, a monospace, and a
 * monospace makes every width exact arithmetic: one advance is 0.6em, so a
 * line is `chars × size × (0.6 + trackEm)` and a size can be *solved* from a
 * character count with no browser involved. `monoWidth` / `monoFit` did that,
 * and the sizes in `layout.ts` were derived from them.
 *
 * Dessign Maison is proportional, so none of that holds. Measured against
 * Monaco at the same size it runs 0.645× to 0.851× as wide depending on the
 * string — a 32% spread between "mfny" and "after tokens" — which is exactly
 * the situation no single scale factor can fix. A character count no longer
 * predicts a width, so the width has to be asked for.
 *
 * The measurement is one reading per element, not a search. Width is linear in
 * font-size once tracking is expressed in em, so measuring the ink at a
 * reference size gives px-of-width-per-px-of-size, and the size that fills a
 * budget follows by division. No iteration, no binary search, no reflow loop.
 *
 * This also runs the other way from the old code. Monaco was WIDER than the
 * face before it, so `monoFit` only ever shrank things. Dessign Maison is
 * narrower than Monaco, so titles solved for Monaco now under-fill their line
 * by about a third. Fitting therefore grows as well as shrinks, capped at the
 * size the design authored so nothing outgrows its family.
 */

import { qq } from '../dom.ts';

/** The reference size every measurement is taken at. */
const REF = 100;

/**
 * A subpage title's budget: the 1920 stage less a module either side, less 24
 * of clearance so a title never touches its margin. Same number the old
 * arithmetic used.
 */
export const SUBTITLE_AVAIL = 1920 - 72.727 * 2 - 24;

/** Nothing is ever fitted below this; a title that cannot fit is a content bug. */
const MIN_SIZE = 24;

/**
 * The ink width of an element's text, in viewport px.
 *
 * A Range, not `getBoundingClientRect` on the element and not `scrollWidth`.
 * The element is often a grid or flex item, in which case its own rect is the
 * full track rather than the text inside it, and `scrollWidth` rounds to an
 * integer and clamps to the padding box. A Range over the contents reports the
 * union of the actual glyph boxes, which is the only one of the three that is
 * the thing being asked about.
 */
function inkWidth(el: HTMLElement): number {
  const r = document.createRange();
  r.selectNodeContents(el);
  const w = r.getBoundingClientRect().width;
  r.detach();
  return w;
}

/** Viewport scale of the 1920-wide stage, so measurements come back in design px. */
function scaleOf(el: Element): number {
  const st = el.closest<HTMLElement>('[data-stage],[data-frame-root]');
  return st ? (st.getBoundingClientRect().width || 1920) / 1920 : 1;
}

/**
 * The width budget for one element, in design px.
 *
 * `data-fit-w` when the caller knows it. Otherwise the parent's content box,
 * which is right for a title that is simply meant to fit its column.
 */
function budgetOf(el: HTMLElement, k: number): number {
  const attr = Number(el.getAttribute('data-fit-w'));
  if (Number.isFinite(attr) && attr > 0) return attr;
  const p = el.parentElement;
  if (!p) return 1920;
  const cs = getComputedStyle(p);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  return Math.max(1, p.getBoundingClientRect().width / k - pad);
}

/**
 * The size and line-height ratio an element was AUTHORED at.
 *
 * Captured on the first fit and never re-read, because after that first fit the
 * element's own computed size is the fitted one. Taking the cap from the live
 * value would ratchet: a title fitted down once could never come back up, so
 * re-opening a screen on a wider stage would keep the narrow-stage size.
 */
const AUTHORED = new WeakMap<HTMLElement, { size: number; lh: number }>();

function authoredOf(el: HTMLElement): { size: number; lh: number } {
  let a = AUTHORED.get(el);
  if (!a) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize) || REF;
    a = { size, lh: (parseFloat(cs.lineHeight) || size) / size };
    AUTHORED.set(el, a);
  }
  return a;
}

/**
 * Solve one element's font-size against its budget. Returns false when the
 * element could not be measured, which is what a `display:none` ancestor looks
 * like from here.
 *
 * `data-fit-max` caps it, defaulting to the authored size — so an element that
 * already fits is left exactly as the design drew it, and only one that does
 * not is moved.
 *
 * The measurement must be taken on the RESTING face. The alternates are always
 * narrower, so a resting line that fits guarantees a glitched line that fits;
 * measuring a line that has already swapped would solve against the smaller of
 * the two and let the resting state overflow. Callers time this.
 */
function fitOne(el: HTMLElement, k: number): boolean {
  const a = authoredOf(el);
  const maxAttr = Number(el.getAttribute('data-fit-max'));
  const max = Number.isFinite(maxAttr) && maxAttr > 0 ? maxAttr : a.size;
  const budget = budgetOf(el, k);

  // One reading at the reference size gives the whole linear relationship.
  const prev = el.style.fontSize;
  el.style.fontSize = `${REF}px`;
  const perPx = inkWidth(el) / k / REF;
  el.style.fontSize = prev;

  if (!(perPx > 0)) return false;

  const solved = Math.max(MIN_SIZE, Math.min(max, Math.floor(budget / perPx)));
  el.style.fontSize = `${solved}px`;
  el.style.lineHeight = `${Math.round(solved * a.lh)}px`;
  return true;
}

/**
 * Fit every display line under `root`.
 *
 * Subpage titles are found by their own marker and given the shared subpage
 * budget; anything else opts in with `data-fit`. Page titles are deliberately
 * NOT swept by default: they sit in flex rows whose parent box is the whole
 * screen, so an inferred budget would let them grow to absurd sizes. A page
 * title that needs fitting says so with `data-fit` and a `data-fit-w`.
 */
export function fitDisplay(root: HTMLElement): void {
  const k = scaleOf(root);

  for (const el of qq<HTMLElement>(root, '[data-sptitle]')) {
    if (!el.hasAttribute('data-fit-w')) el.setAttribute('data-fit-w', String(SUBTITLE_AVAIL));
    fitOne(el, k);
  }
  for (const el of qq<HTMLElement>(root, '[data-fit]')) fitOne(el, k);
}

/**
 * Fit one screen's title as that screen opens.
 *
 * SUBPAGES CANNOT BE FITTED AT BOOT. They are all built up front and left
 * `display:none` until something opens them, and a hidden element measures
 * zero, so the boot pass skips every one of them silently. That is not a
 * theoretical gap: it let "apple wallet card sharing concept" ship 7.9px past
 * its margin at rest, which no screenshot showed because the title swaps to
 * the narrower alternate about 1.4 seconds after the screen opens and the
 * alternate fits fine.
 *
 * So the fit runs again on open, while the title is still resting. If the
 * screen has not been laid out yet the measurement comes back empty and this
 * tries once more on the next frame rather than giving up.
 */
export function fitScreen(screen: HTMLElement): void {
  const run = (retry: boolean): void => {
    const k = scaleOf(screen);
    let missed = false;
    for (const el of qq<HTMLElement>(screen, '[data-sptitle],[data-fit]')) {
      if (el.matches('[data-sptitle]') && !el.hasAttribute('data-fit-w')) {
        el.setAttribute('data-fit-w', String(SUBTITLE_AVAIL));
      }
      if (!fitOne(el, k)) missed = true;
    }
    if (missed && retry) requestAnimationFrame(() => run(false));
  };
  run(true);
}

/**
 * Run the fit pass once the real faces are in.
 *
 * Measuring before `document.fonts.ready` measures the fallback, and the
 * fallback is a system sans whose widths have nothing to do with Dessign
 * Maison's. `font-display: block` means nothing is painted until the faces
 * land, so this cannot flash: the pass finishes before there is anything on
 * screen to see it happen.
 */
export function fitWhenReady(root: HTMLElement): void {
  const run = (): void => {
    if (root.isConnected) fitDisplay(root);
  };
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run).catch(run);
    return;
  }
  run();
}
