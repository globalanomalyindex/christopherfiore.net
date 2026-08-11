/**
 * Menu ↔ page choreography.
 *
 * Ported from the prototype's `renderVals()` (openPage / closePage / nextPage)
 * plus the Component helpers runIntro / menuFade / veilOpen / navParts.
 * Every duration, offset and easing here is read out of the prototype, not
 * re-derived: the open is G 580 grow · HL 1000 hold · S 680 settle (2260ms to
 * interactive), the close is OUT 240 · LAG 190 · SH 700.
 *
 * Clicking a channel ON THE MENU takes a longer road. `runChannelOpen` plays
 * the lattice redesign's 3.3s choreography — the hover's fill grows to the four
 * buttons and then to the whole screen, everything but the pressed label
 * dissolves, that label walks to the middle of the stage, flashes three times
 * and vanishes — and only then calls the grow below. The arriving screen is the
 * real channel page, not a shell: the choreography hands `growPage` the color
 * the fill ended on and the page starts its dither veil from it.
 */

import { focusInto, q, qq } from '../dom';
import { MENU_CHANNEL_UNION, PAGE2, PAGE3, STAGE } from '../design/layout';
import { AA, COLOR, FLASH, FONT, SPARK, SPARK_LIGHTS, TIMING, contrast } from '../design/tokens';
import { bbox, dIn, dfxRelease, dfxSeq, killAnim, playIn } from './dither';
import { frostFor } from './frost';
import { ambientGlitch, glitchFont, resetTitleFont, stopAmbientGlitch } from './glitch';
import {
  cfgOf,
  releaseFor,
  setLatticeBusy,
  latticeFill,
  solveLattice,
  startDrift,
  stopDrift,
  sweepRect,
} from './lattice';
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
export function veilOpen(
  cq: HTMLCanvasElement | null,
  g: number,
  h: number,
  s: number,
  hue?: string,
): void {
  if (!cq) return;
  const fx = frostFor(cq);
  clearTimeout(SETTLE.get(cq));

  /*
    The color the menu's fill ended on, carried into the page's ground.

    Set on the canvas ELEMENT, not in the field: frost's six-entry palette is a
    module constant and a warm ramp on purpose, and tinting it would recolor
    every screen on the site. The canvas background sits behind the frost's own
    pixels, which are only partly opaque, so the hue reads through the field for
    as long as it is there and is gone by the time the page settles. Cleared
    unconditionally on the other branch, so a re-open never inherits it.
  */
  if (hue) {
    cq.style.backgroundColor = hue;
    const tint = cq.animate([{ backgroundColor: hue }, { backgroundColor: 'transparent' }], {
      duration: g + h,
      easing: 'steps(6,end)',
      fill: 'both',
    });
    tint.onfinish = () => {
      cq.style.backgroundColor = '';
    };
  } else {
    cq.style.backgroundColor = '';
  }

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
  // The carried hue is an inline value with a fill:both animation over it, and
  // `killAnim` on the canvas cancels the animation without touching the value.
  // Clearing it here is what stops a page reopening on the last run's color.
  cq.style.backgroundColor = '';
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

/* ── the channel-open choreography ───────────────────────────────────────── */

/**
 * The beat sheet, in ms from the click.
 *
 * ONE table, walked once by `runChannelOpen`. That is not tidiness. A schedule
 * built out of nested timeouts cannot be cancelled as a set, so a run that
 * throws halfway through leaves the fill owning the screen with no teardown
 * registered — which is precisely how the prototype shipped a menu that could
 * be killed by one click.
 */
const BEAT = {
  /** the hovered fill grows from the pressed button to the union of all four */
  fillUnion: 0,
  /** the three labels that are not being opened start their letter glitch */
  siblingGlitch: 140,
  /** every span but the pressed label dithers out, including its own number */
  dissolve: 300,
  /** the surviving label travels to the union's center */
  labelUnion: 420,
  /** the fill takes the whole menu; the rails go */
  fillScreen: 620,
  /** the label travels to the middle of the stage */
  labelCenter: 780,
  /* 880–2050 is the hold. Nothing is scheduled in it on purpose: the fill owns
     the screen and only the lattice's held dither moves. */
  flashA: 2050,
  flashB: 2330,
  flashC: 2610,
  /** the label glitches into a vanish */
  vanish: 2960,
  /** the real channel page arrives and unglitches */
  arrive: 3320,
} as const;

/**
 * Durations and steps for the beats above.
 *
 * Everything down to `vanishHold` is the handoff's, verbatim. The four below
 * it are this build's, and each says at its definition what it is measured
 * against rather than being a number somebody liked.
 */
const CHOREO = {
  unionMs: 170,
  unionEase: 'steps(7,end)',
  /** the dissolve walks the spans this far apart */
  spanStep: 14,
  spanMs: 170,
  labelUnionMs: 240,
  labelUnionEase: 'steps(8,end)',
  labelUnionScale: 1.15,
  screenMs: 260,
  railMs: 240,
  labelCenterMs: 300,
  labelCenterScale: 1.6,
  /** each flash pass walks the letters this far apart, and holds this long */
  flashStep: 9,
  flashHold: 130,
  vanishStep: 20,
  vanishHold: 80,
  /** the page shell dithers in over this, and its title leads by this */
  shellMs: 300,
  titleLead: 120,
  titleStep: 26,
  /**
   * How long after the handoff the menu is put back.
   *
   * It has to be after the shell is fully opaque, or the field and the labels
   * snap back into view around the arriving page. 420 is the shell's 300 plus
   * the title's 120 lead, which is the first moment nothing behind the page can
   * be seen.
   */
  restoreLag: 420,
  /**
   * How long the teardown keeps sweeping the field clean after it releases it.
   *
   * `sweepRect` and `fillFor` drive their own 40ms tick chains inside
   * lattice.ts and neither hands back a way to stop one. An abort that lands
   * mid-sweep therefore releases the field and then watches the remaining ticks
   * light it straight back up — and every cell they relight joins the lit set,
   * which the drift skips, so the wave stops dead over most of the screen. The
   * longest painter here is the 260ms full-canvas sweep, whose last tick lands
   * about 280ms after it starts; 400 clears it from any point in the run.
   */
  sweepTail: 400,
  /**
   * Forced teardown. Nothing in the table above lands later than 3960, so this
   * only fires if a beat never ran at all — and the one thing that must never
   * happen is a fill left owning the screen with no way back.
   */
  watchdog: 8000,
} as const;

/** Type on a band is always this, everywhere on this site. */
const INK = COLOR.nearBlack;

type Box = { x: number; y: number; w: number; h: number };

/** The union of the four channel cells, which the fill grows to first. */
const UNION: Box = MENU_CHANNEL_UNION;
/** And then the whole canvas. */
const CANVAS: Box = { x: 0, y: 0, w: STAGE.w, h: STAGE.h };

const pick = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

/** An element's box in design px, read back through the stage's scale. */
function boxOf(stage: HTMLElement, el: HTMLElement): Box {
  const k = scaleOf(stage);
  const sr = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
}

/** A keyframe for the band's box. Left/top/width/height, not a transform. */
const boxFrame = (b: Box): Keyframe => ({
  left: `${b.x}px`,
  top: `${b.y}px`,
  width: `${b.w}px`,
  height: `${b.h}px`,
});

/**
 * What the run has to be able to put back.
 *
 * `html` is captured only for the display lines, whose markup the letter
 * glitch rewrites; everything else only ever gets inline styles written to it,
 * so its style attribute is the whole snapshot.
 */
interface Snap {
  el: HTMLElement;
  html: string | null;
  style: string | null;
}

interface Run {
  timers: number[];
  snaps: Snap[];
  /** Display lines: restored through resetTitleFont before their markup goes back. */
  lines: HTMLElement[];
  /** True once the page has taken over, so the teardown leaves its state alone. */
  handedOff: boolean;
  done: boolean;
  restore: () => void;
}

/** The run in flight on a stage, at most one. Keyed by the stage, per the handoff. */
const RUNS = new WeakMap<HTMLElement, Run>();

/**
 * A click that lands while a run is in flight tears the run down and stops
 * there. That is the whole guarantee: a second click can never leave the menu
 * dead, whatever state the first one got to.
 */
function abortChannelOpen(stage: HTMLElement): boolean {
  const run = RUNS.get(stage);
  if (!run) return false;
  run.restore();
  return true;
}

/**
 * The band stack the fill is made of: one light band the type sits on, two
 * darker accent lines, and the 1.5px inset outline every frame on this site
 * carries.
 *
 * The accents are capped at 8% of the height at both ends — the handoff's own
 * correction to the 56–80% main band, because an accent row that reaches the
 * middle puts near-black ink on a near-black accent and the label disappears.
 */
function mkBand(hue: string, box: Box): HTMLElement {
  const band = document.createElement('span');
  band.setAttribute('data-tband', '');
  band.style.cssText =
    `display:block;position:absolute;z-index:0;pointer-events:none;background:${hue};` +
    `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;

  const line = (edge: 'top' | 'bottom'): void => {
    const h = 2 + Math.random() * 6;
    const s = document.createElement('span');
    s.style.cssText =
      `display:block;position:absolute;left:0;width:100%;${edge}:0;` +
      `height:${h.toFixed(2)}%;background:${pick(SPARK)}`;
    band.appendChild(s);
  };
  line('top');
  line('bottom');

  const ol = document.createElement('span');
  ol.style.cssText =
    'display:block;position:absolute;inset:0;' + `box-shadow:inset 0 0 0 1.5px ${INK}`;
  band.appendChild(ol);

  return band;
}

/**
 * Run the choreography, then hand the stage to the real page.
 *
 * `arrive` is the existing grow, passed in rather than called by name so this
 * function owns nothing but the menu: the arriving screen is the actual channel
 * page, not a shell built here.
 */
function runChannelOpen(
  stage: HTMLElement,
  menu: HTMLElement,
  cell: HTMLElement,
  arrive: (hue: string) => void,
): void {
  const label = q<HTMLElement>(cell, '[data-chlabel]');
  if (!label) {
    // No label to carry across means no choreography to run. Open plainly
    // rather than half-run it.
    arrive(pick(SPARK_LIGHTS));
    return;
  }

  /*
    The fill's hue. A channel personality that has already painted one
    advertises it on the cell as `data-hue`, so the fill grows out of the color
    that was under the cursor; otherwise the transition picks its own. Either
    way it comes from SPARK_LIGHTS and never from SPARK, because the pressed
    label survives the whole run sitting on it.
  */
  const declared = cell.dataset.hue;
  const hue = declared && SPARK_LIGHTS.includes(declared) ? declared : pick(SPARK_LIGHTS);

  /*
    The flash colors, filtered against the band they will be read on rather
    than assumed. FLASH is solved for type on PAPER; on a vivid band a couple
    of its members would be a dark smudge for 130ms. Filtering here keeps the
    site's rule that a color which cannot carry a role cannot reach it.
  */
  const flashes = FLASH.filter((c) => contrast(c, hue) >= AA);
  const flash = (): string => (flashes.length ? pick(flashes) : INK);

  const s = state(stage);
  const bandHost = q(menu, '[data-bandhost]');
  const letters = qq<HTMLElement>(label, '[data-l]');
  const walk = letters.length ? letters : [label];

  const run: Run = {
    timers: [],
    snaps: [],
    lines: [],
    handedOff: false,
    done: false,
    restore: () => {},
  };
  RUNS.set(stage, run);

  /** Schedule a beat into the run's own queue. Nothing here nests. */
  const at = (t: number, fn: () => void): void => {
    run.timers.push(window.setTimeout(fn, t));
  };
  /*
    Snapshot once and only once per element. A second capture would be taken
    AFTER the run had already written to it, so the "original" it restored
    would be the transition's own state — the label would come back pinned to
    ink and the field would look right while being wrong.
  */
  const seen = new Set<HTMLElement>();
  const snap = (el: HTMLElement, markup?: boolean): void => {
    if (seen.has(el)) return;
    seen.add(el);
    if (markup) run.lines.push(el);
    run.snaps.push({ el, html: markup ? el.innerHTML : null, style: el.getAttribute('style') });
  };

  /* ---- teardown, written before the first beat is scheduled --------------
     Registered first on purpose. The prototype registered it after its first
     real step, so a throw in that step left the full-screen fill up forever. */

  run.restore = (): void => {
    if (run.done) return;
    run.done = true;
    RUNS.delete(stage);

    run.timers.forEach((t) => window.clearTimeout(t));
    run.timers.length = 0;

    // Every band in the host, not just this run's: a hover that was mid-wipe
    // when the click landed has one in there too, and it would outlive the menu.
    if (bandHost) {
      qq(bandHost, '*').forEach(killAnim);
      bandHost.replaceChildren();
    } else {
      qq<HTMLElement>(menu, '[data-tband]').forEach((b) => {
        killAnim(b);
        b.remove();
      });
    }

    // Lines first: resetTitleFont cancels the glitch's own pending swaps and
    // hands every letter's filter back to the pool while those letters still
    // exist. Restoring the markup first would strand both.
    run.lines.forEach(resetTitleFont);
    for (const sn of run.snaps) {
      killAnim(sn.el);
      dfxRelease(sn.el);
      if (sn.html !== null) sn.el.innerHTML = sn.html;
      if (sn.style === null) sn.el.removeAttribute('style');
      else sn.el.setAttribute('style', sn.style);
    }

    // The field last, and in this order: hand the lit points back, unlock the
    // resolve, resolve, then let the wave run again.
    releaseFor(menu);
    setLatticeBusy(menu, false);
    solveLattice(menu);
    startDrift(menu);

    /*
      And keep releasing for as long as a painter this run started could still
      be ticking. See CHOREO.sweepTail: one release is enough after the
      handoff, and not enough after an abort, and the teardown cannot know
      which it is without knowing what lattice.ts has in flight. It bows out
      the moment a new run claims the stage, because that run releases the
      field itself and then owns whatever is lit.
    */
    let tick = 0;
    const tail = window.setInterval(() => {
      if (RUNS.has(stage)) {
        window.clearInterval(tail);
        return;
      }
      releaseFor(menu);
      tick += 1;
      if (tick * 40 >= CHOREO.sweepTail) {
        window.clearInterval(tail);
        solveLattice(menu);
      }
    }, 40);

    // A run that already handed the stage to the page does not own `nav` or the
    // wordmark any more — clearing either here would unlock a page mid-open.
    if (!run.handedOff) {
      s.nav = false;
      if (!s.reduced) ambientGlitch(stage);
    }
  };

  at(CHOREO.watchdog, run.restore);

  /* ---- 0 · the fill grows to the union ---------------------------------- */

  s.nav = true;
  stopAmbientGlitch(stage);

  /*
    Tell the channel's own hover to stand down before painting over it. Sent as
    an event rather than by calling channels.ts so this module keeps knowing
    nothing about which personality the cell has — and it balances actions.ts's
    pointer flag, so the real pointerout that follows is a no-op instead of a
    second teardown.
  */
  cell.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
  /*
    And the focus flag. `refreshHov` in actions.ts ORs pointer and focus into
    one state, so clearing only the pointer leaves a KEYBOARD-opened channel
    still "hovered": its held flicker and its beat intervals keep painting for
    the whole 3.3 second choreography. Sent as an event for the same reason the
    pointerout is.
  */
  cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

  // The resolve must not run while the fill owns the field, or it will paint
  // every swept point back to its resting state under the transition.
  setLatticeBusy(menu, true);
  stopDrift(menu);
  releaseFor(menu);

  const cellBox = boxOf(stage, cell);
  const band = mkBand(hue, cellBox);
  (bandHost ?? menu).appendChild(band);
  band.animate([boxFrame(cellBox), boxFrame(UNION)], {
    duration: CHOREO.unionMs,
    easing: CHOREO.unionEase,
    fill: 'both',
  });
  sweepRect(menu, UNION, hue, CHOREO.unionMs);

  /*
    The display lines are snapshotted here, whole, before a single beat has
    run. They are the only things on this screen whose MARKUP changes — the
    letter glitch rewrites their spans — so their restore is an innerHTML, and
    an innerHTML captured any later than this would be a capture of the
    transition rather than of the menu.
  */
  const labels = qq<HTMLElement>(menu, '[data-chlabel]');
  const wordmark = q<HTMLElement>(menu, '[data-dither]');
  const rails = qq<HTMLElement>(menu, '[data-frame^="rail"]');
  for (const l of labels) snap(l, true);
  if (wordmark) snap(wordmark, true);
  // The rails are not touched until 620, but the snapshot is taken here for the
  // same reason: "before the run" is a rule, not an optimization.
  for (const r of rails) snap(r);

  // Everything on the union is now type on a band, so every label and number
  // takes the ink the contract requires — including the secondary numbers,
  // whose own inline color would otherwise beat an inherited pin.
  for (const l of labels) l.style.color = INK;
  for (const num of qq<HTMLElement>(menu, '[data-chnum]')) {
    snap(num);
    num.style.color = INK;
  }

  /* ---- 140 · the other three labels glitch ------------------------------ */

  at(BEAT.siblingGlitch, () => {
    for (const l of labels) {
      if (l === label) continue;
      // noHl: the fill is already the band behind them.
      glitchFont(l, true, 22, true);
    }
  });

  /* ---- 300 · everything but the pressed label dithers out ---------------- */

  /*
    Leaf spans only, and never the lattice's: its 1222 pegs are spans carrying a
    `+`, and fading them would take the field out with the type. The pressed
    label's own letters are the one exception that survives; its channel NUMBER
    is not an exception and goes with the rest.
  */
  const doomed = qq<HTMLElement>(menu, 'span').filter(
    (sp) =>
      !sp.children.length &&
      (sp.textContent ?? '').trim().length > 0 &&
      !sp.closest('[data-lattice]') &&
      !sp.closest('[data-bandhost]') &&
      !sp.closest('[data-tband]') &&
      !label.contains(sp),
  );

  at(BEAT.dissolve, () => {
    doomed.forEach((sp, i) => {
      // A letter inside a display line is already covered by that line's markup
      // snapshot, and its own style has been rewritten by the glitch since —
      // capturing it now would restore the glitch instead of the letter.
      if (!run.lines.some((l) => l.contains(sp))) snap(sp);
      sp.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: CHOREO.spanMs,
        delay: i * CHOREO.spanStep,
        easing: 'steps(4,end)',
        fill: 'both',
      });
    });
    /*
      The real dither goes on the four display lines rather than on each of the
      ~60 spans: an applied filter costs the renderer a fixed amount per
      element per frame, and sixty of them at once is over the 48 dither.ts
      budgets for. Four is nothing, and the lines are what the eye reads.
    */
    const dither = wordmark ? [wordmark, ...labels.filter((l) => l !== label)] : [];
    dither.forEach((l, i) => {
      const d = i * CHOREO.spanStep * 4;
      dfxSeq(l, [[0, 1], [d, 1], [d + CHOREO.spanMs, 0]], 13);
    });
  });

  /* ---- 420 · the label travels to the union's center --------------------- */

  const lb = boxOf(stage, label);
  const lc = { x: lb.x + lb.w / 2, y: lb.y + lb.h / 2 };

  const toUnion = `translate(${(UNION.x + UNION.w / 2 - lc.x).toFixed(2)}px,${(
    UNION.y +
    UNION.h / 2 -
    lc.y
  ).toFixed(2)}px) scale(${CHOREO.labelUnionScale})`;
  const toCenter = `translate(${(STAGE.w / 2 - lc.x).toFixed(2)}px,${(STAGE.h / 2 - lc.y).toFixed(
    2,
  )}px) scale(${CHOREO.labelCenterScale})`;

  at(BEAT.labelUnion, () => {
    // Origin stated rather than inherited: with the center as the origin a
    // scale leaves the center where the translate put it, which is the whole
    // arithmetic above.
    label.style.transformOrigin = '50% 50%';
    label.animate([{ transform: 'none' }, { transform: toUnion }], {
      duration: CHOREO.labelUnionMs,
      easing: CHOREO.labelUnionEase,
      fill: 'both',
    });
  });

  /* ---- 620 · the fill takes the screen, the rails go --------------------- */

  at(BEAT.fillScreen, () => {
    band.animate([boxFrame(UNION), boxFrame(CANVAS)], {
      duration: CHOREO.screenMs,
      easing: CHOREO.unionEase,
      fill: 'both',
    });
    sweepRect(menu, CANVAS, hue, CHOREO.screenMs);
    for (const r of rails) {
      r.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: CHOREO.railMs,
        easing: 'steps(5,end)',
        fill: 'both',
      });
    }
  });

  /* ---- 780 · the label takes the middle of the stage --------------------- */

  at(BEAT.labelCenter, () => {
    label.animate([{ transform: toUnion }, { transform: toCenter }], {
      duration: CHOREO.labelCenterMs,
      easing: CHOREO.labelUnionEase,
      fill: 'both',
    });
  });

  /* ---- 2050 / 2330 / 2610 · three flashes -------------------------------- */

  for (const t0 of [BEAT.flashA, BEAT.flashB, BEAT.flashC]) {
    walk.forEach((sp, i) => {
      at(t0 + i * CHOREO.flashStep, () => {
        sp.style.color = flash();
      });
      at(t0 + i * CHOREO.flashStep + CHOREO.flashHold, () => {
        sp.style.color = INK;
      });
    });
  }

  /* ---- 2960 · the label glitches into a vanish --------------------------- */

  const n = walk.length || 1;
  const scatter = walk.map((_, i) => i).sort((a, b) => ((a * 7) % n) - ((b * 7) % n) || a - b);
  scatter.forEach((li, k) => {
    const sp = walk[li];
    at(BEAT.vanish + k * CHOREO.vanishStep, () => {
      sp.style.fontFamily = FONT.alt;
      sp.style.fontFeatureSettings = FONT.altFeatures;
      sp.style.color = flash();
    });
    at(BEAT.vanish + k * CHOREO.vanishStep + CHOREO.vanishHold, () => {
      sp.style.opacity = '0';
    });
  });

  /* ---- 3320 · the real page arrives -------------------------------------- */

  at(BEAT.arrive, () => {
    run.handedOff = true;
    arrive(hue);
    // The menu goes back only once the page covers it, and it goes back through
    // the same restore as an abort does. There is one teardown, not two.
    at(CHOREO.restoreLag, run.restore);
  });
}

/* ── menu → page ─────────────────────────────────────────────────────────── */

/**
 * Click a channel.
 *
 * On the menu this is the 3.3s choreography above, which ends by calling the
 * grow below. Everywhere else — reduced motion, no lattice mounted, a stage
 * without a menu — it is the grow on its own.
 */
export function openPage(stage: HTMLElement, n: number, cell: HTMLElement): void {
  // Before the lock, not after: while a run is in flight `nav` is true, and a
  // click that returned here would leave the fill up with no way to dismiss it.
  if (abortChannelOpen(stage)) return;
  if (locked(stage)) return;
  if (!q(stage, `[data-page="${n}"]`)) return;

  const menu = q<HTMLElement>(stage, '[data-menu]');
  const grow = (hue?: string): void => growPage(stage, n, cell, hue);

  // Reduced motion collapses the choreography entirely rather than speeding it
  // up; the grow has its own cross-fade for that case.
  if (!menu || state(stage).reduced || !cfgOf(menu)) {
    grow();
    return;
  }
  runChannelOpen(stage, menu, cell, grow);
}

/**
 * The cell becomes the page.
 *
 * `hue` is the color the menu's fill ended on. When it is set the page has
 * already been uncovered by the choreography, so it arrives full-bleed and
 * dithers in rather than growing out of the cell, and its veil starts from
 * that hue instead of from paper.
 */
function growPage(stage: HTMLElement, n: number, cell: HTMLElement, hue?: string): void {
  const page = q(stage, `[data-page="${n}"]`);
  if (!page) return;
  const fromFill = hue !== undefined;

  const s = state(stage);
  s.nav = true;
  s.open = n;
  stopAmbientGlitch(stage);

  const rc = rectOf(cell);
  const clip0 = insetOf(rc);

  // Freeze the channel's hover animation so the FLIP source box is stable.
  // Skipped after the choreography: there is no FLIP to measure, and the cell's
  // letters are mid-vanish and owned by the run's snapshot until it tears down.
  if (!fromFill) {
    qq(cell, '[data-l]').forEach((sp) => {
      sp.style.animation = 'none';
      sp.style.transform = 'none';
    });
    const word = q(cell, '[data-word]');
    if (word) word.style.animation = 'none';
  }

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

  /*
    The two shapes this open takes.

    Grown from the cell, it is the site's own G · HL · S. Arrived out of the
    menu's fill, there is nothing left to grow out of: the shell dithers in
    over 300ms and the title leads by 120, both the transition's own numbers,
    and the settle is the token's. Reusing the full 580 · 1000 hold there would
    leave the reader looking at a finished screen for a second and a half.
  */
  const g = fromFill ? CHOREO.shellMs : G;
  const h = fromFill ? CHOREO.titleLead : HL;

  // 1 — the cell becomes the page, or the fill becomes the page
  if (fromFill) {
    page.style.clipPath = 'inset(0px 0px 0px 0px)';
    page.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: g,
      easing: 'steps(5,end)',
      fill: 'both',
    });
  } else {
    page.animate([{ clipPath: clip0 }, { clipPath: 'inset(0px 0px 0px 0px)' }], {
      duration: G,
      easing: easeOpen,
      fill: 'both',
    });
  }

  // 2/3 — the channel word travels and grows into the page title, then glitches
  if (P.title) {
    const title = P.title;
    if (fromFill) {
      /*
        No FLIP. The label the title would have flown from is already gone: it
        vanished at the middle of the stage two beats ago, and a title flying
        out of the little cell it left long before would read as a second,
        contradictory move. It resolves where it stands instead.
      */
      dIn(title, 0, g, 15);
      window.setTimeout(() => glitchFont(title, true, CHOREO.titleStep), h);
    } else {
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
  }

  // 4 — the dither veil opens across the page, out of the menu's own color
  veilOpen(P.cq, g, h, S, hue);

  // 5 — page furniture fades in, then each bar/block dithers in on its stagger
  if (P.body) {
    P.body.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: Math.round(S * 0.8),
      delay: g + h,
      easing: 'linear',
      fill: 'both',
    });
  }

  // 6 — page-specific carries. Both grow out of the channel cell, so neither
  //     has anything to say when the page did not.
  if (P.fr && !fromFill) {
    const inset = `${PAGE2.frameInset}px`;
    P.fr.animate(
      [
        { top: `${rc[0]}px`, right: `${rc[1]}px`, bottom: `${rc[2]}px`, left: `${rc[3]}px` },
        { top: inset, right: inset, bottom: inset, left: inset },
      ],
      { duration: G, easing: easeOpen, fill: 'both' },
    );
  }
  if (P.ck && !fromFill) {
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

  // 7 — the menu dithers out beneath. Not after the choreography: it already
  //     took the menu apart span by span, and dithering the pieces it is about
  //     to put back would fight its own teardown.
  if (!fromFill) menuFade(stage, true);

  window.setTimeout(() => playIn(page, 40), g + h);
  window.setTimeout(() => {
    s.nav = false;
    focusInto(closeOf(page));
  }, g + h + S);
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
  // The field comes in with everything else rather than being the one thing
  // that was already finished when the visitor arrived.
  const menuScreen = q(stage, '[data-menu]');
  if (menuScreen) latticeFill(menuScreen);
  playIn(stage, 0, true);
  if (crest) {
    killAnim(crest);
    crest.style.transform = 'none';
    crest.style.opacity = '1';
    dIn(crest, 60, 900, 26); // crest resolves out of noise, blur radius 26
  }
  ambientGlitch(stage);
}
