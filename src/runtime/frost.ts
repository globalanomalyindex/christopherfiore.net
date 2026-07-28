/**
 * The background dither canvases.
 *
 * Ported from the prototype's `startFrost` / `setMode` / `tween` / `trackFrost`.
 * Every canvas renders at its small backing-store size (288×162, 384×120,
 * 288×20, 240×135) and is stretched to the box with `image-rendering:
 * pixelated` — that low resolution *is* the effect, so the backing store is
 * read from the element's width/height attributes and never rescaled.
 *
 * Modes:
 *   0  quiet   wavy dither bands (menu hero, contact strip, contact page)
 *   1  field   an empty lattice filling bottom-up, row by row (product designs)
 *   2  paint   dragged color streaks (paintings, on the way in)
 *   3  speed   irregular radial speed lines (competizione)
 *   4  organic six drifting metaball blobs — the paintings page's rest mode
 *
 * A single shared requestAnimationFrame drives every live canvas; it is torn
 * down while the document is hidden and while every canvas is frozen for
 * prefers-reduced-motion.
 */

import { state } from './state.ts';

export interface FrostHandle {
  setMode(m: number): void;
  tween(key: string, to: number, dur: number): void;
  stop(): void;
}

/* ------------------------------------------------------------------ tables */

/** 8×8 ordered (Bayer) threshold matrix — the same one the SVG filter tiles. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60,
  28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,
  7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/** lavender · pink · cyan · acid · bright rust · blue. Indexed by hue. */
const PAL: number[][] = [
  [223, 203, 250],
  [255, 45, 135],
  [18, 217, 232],
  [201, 242, 39],
  [227, 58, 8],
  [43, 69, 245],
];

/** Mode 4's six metaballs: drift amplitudes, speeds, phases, radius, color. */
const BLOBS = [
  { ax: 0.3, ay: 0.26, sx: 0.0042, sy: 0.0031, px: 0.0, py: 1.7, r: 0.38, br: 0.0061, a: 0.95, c: 0 },
  { ax: 0.34, ay: 0.21, sx: 0.0027, sy: 0.0049, px: 2.3, py: 0.4, r: 0.3, br: 0.0043, a: 0.82, c: 1 },
  { ax: 0.24, ay: 0.3, sx: 0.0055, sy: 0.0022, px: 4.1, py: 3.2, r: 0.26, br: 0.0078, a: 0.78, c: 2 },
  { ax: 0.38, ay: 0.17, sx: 0.0019, sy: 0.0038, px: 5.6, py: 2.1, r: 0.22, br: 0.0035, a: 0.7, c: 3 },
  { ax: 0.27, ay: 0.28, sx: 0.0064, sy: 0.0026, px: 1.2, py: 5.0, r: 0.24, br: 0.0052, a: 0.66, c: 4 },
  { ax: 0.41, ay: 0.13, sx: 0.0033, sy: 0.0058, px: 3.4, py: 0.9, r: 0.19, br: 0.0069, a: 0.58, c: 5 },
];

/**
 * Clock the reduced-motion still frame is drawn at. mt·0.003 = 1.05 lands in
 * the mode-1 lattice's "filled" plateau, so the frozen field reads as a
 * finished state rather than a half-built one.
 */
const REST_T = 350;

/* ------------------------------------------------------------------- state */

interface Trail {
  x: number;
  y: number;
  /** signed push strength from the cursor's step */
  m: number;
  /** life, decays ×0.87 per rendered frame */
  l: number;
}

interface Blob {
  x: number;
  y: number;
  r2: number;
  a: number;
  c: number;
}

interface Frost {
  cv: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  W: number;
  H: number;
  img: ImageData;
  data: Uint8ClampedArray;
  quiet: boolean;
  paint: boolean;
  stage: HTMLElement;
  /** current mode */
  mode: number;
  /** mode being cross-faded out of; null until the first rendered frame */
  pmode: number | null;
  /** 0→1 cross-fade progress, +0.17 per rendered frame */
  mix: number;
  /** clock at which the current mode started, for mode 1's fill-up */
  modeT: number | null;
  /** alpha multiplier — transitions tween this up and back to 1 */
  boost: number;
  /**
   * Tweened by the open/close choreography. The prototype reads it into a
   * local and never uses it, so it is carried but does not affect rendering.
   */
  rate: number;
  /** cursor is over solid furniture → the field settles */
  solid: boolean;
  /** settle amount, lerped toward !solid at 0.085/frame; null before frame 1 */
  calm: number | null;
  trail: Trail[];
  inside: boolean;
  px: number;
  py: number;
  /** frame clock, +1 per rendered frame (+0.45 when quiet) */
  t: number;
  last: number;
  /** frame counter for the every-15-frames offscreen test */
  vc: number;
  off: boolean;
  live: boolean;
  /**
   * The screen this canvas belongs to — the menu, a page, or a subpage. Used by
   * the coverage test to ask "is my own screen still the one on top here".
   */
  screen: HTMLElement | null;
  tweens: Map<string, number>;
}

/** Everything that can be covered, as a unit, by something drawn over it. */
const SCREEN_SEL = '[data-evidence],[data-chellbook],[data-about],[data-page],[data-menu]';

const HANDLES = new WeakMap<HTMLCanvasElement, FrostHandle>();
const FROSTS = new WeakMap<HTMLCanvasElement, Frost>();
/** Every canvas that has ever been started — needed to re-evaluate on mq change. */
const ALL = new Set<Frost>();
/** The canvases the shared loop is currently ticking. */
const LIVE = new Set<Frost>();

/* -------------------------------------------------------------- the driver */

let rafId = 0;

const frame = (now: number): void => {
  rafId = 0;
  for (const f of LIVE) tick(f, now);
  ensureLoop();
};

function ensureLoop(): void {
  if (rafId || !LIVE.size) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  rafId = requestAnimationFrame(frame);
}

function stopLoop(): void {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
}

let wired = false;

function wireGlobals(): void {
  if (wired) return;
  wired = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopLoop();
    } else {
      // Force an immediate redraw rather than waiting out the frame gate.
      for (const f of LIVE) f.last = 0;
      ensureLoop();
    }
  });
  // Registered after startFrost's first state() call, so state.ts has already
  // updated StageState.reduced by the time this runs.
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      for (const f of ALL) applyMotionPref(f);
    });
  }
}

/* ------------------------------------------------------------------ helpers */

const numAttr = (cv: HTMLCanvasElement, name: string, dflt: number): number => {
  const v = cv.getAttribute(name);
  if (v === null || v === '') return dflt;
  const n = +v;
  return Number.isFinite(n) ? n : dflt;
};

/** The mode a canvas idles at once its entry transition has settled. */
const restMode = (cv: HTMLCanvasElement): number =>
  numAttr(cv, 'data-rest-mode', numAttr(cv, 'data-mode', 0));

function applyMotionPref(f: Frost): void {
  if (state(f.stage).reduced) {
    LIVE.delete(f);
    freeze(f);
    if (!LIVE.size) stopLoop();
  } else if (f.live && !LIVE.has(f)) {
    f.last = 0;
    LIVE.add(f);
    ensureLoop();
  }
}

/** Draw exactly one frame at the canvas's rest mode, then leave it alone. */
function freeze(f: Frost): void {
  const m = restMode(f.cv);
  f.mode = m;
  f.pmode = m;
  f.mix = 1;
  f.boost = 1;
  f.calm = 1;
  f.solid = false;
  f.trail.length = 0;
  f.t = REST_T;
  f.modeT = 0;
  render(f);
  // Page canvases start at opacity 0 and are faded in by the transition that
  // will never run under reduced motion — park them at their rest opacity.
  f.cv.style.opacity = f.cv.getAttribute('data-rest-op') || '1';
}

function reset(f: Frost): void {
  f.mode = numAttr(f.cv, 'data-mode', 0);
  f.pmode = null;
  f.mix = 0;
  f.modeT = null;
  f.boost = 1;
  f.rate = 1;
  f.solid = false;
  f.calm = null;
  f.trail.length = 0;
  f.inside = false;
  f.px = 0;
  f.py = 0;
  f.t = 0;
  f.last = 0;
  f.vc = 0;
  f.off = false;
}

/* ------------------------------------------------------------------- ticker */

/**
 * Is this canvas buried under another screen?
 *
 * Asked by hit-testing the canvas's own centre rather than by reading which
 * screens are `display:block`, and that distinction is the whole point. A page
 * is displayed from frame one of its opening transition, but for the next
 * ~1.3s it is a growing clip-path with the menu plainly visible around it —
 * freezing the menu's field then would be a visible regression. `clip-path`
 * clips hit testing too, so this answers "is something actually drawn over me
 * *here*, right now", and a screen resumes and stops on its own as the
 * choreography uncovers and covers it. No transition has to remember to tell
 * us, which is the class of bug this would otherwise invite.
 *
 * Sampling each canvas's own centre, not the viewport's, matters for the
 * menu: its contact strip sits at the bottom of the stage and is covered at a
 * different moment than its channel rows.
 *
 * What is compared is which screen *owns* the hit, not whether this screen
 * contains it. Subpages are children of the page they cover — the evidence
 * viewer lives inside `[data-page="3"]` — so a containment test would have
 * page 03 declaring itself uncovered by its own case study, which is the
 * larger half of the saving and the easiest version of this to get wrong.
 *
 * Fails safe. Anything unexpected — no hit, no owning screen, a transparent
 * overlay letting the hit through — reports "not covered", which is exactly
 * the behavior this had before the test existed.
 */
function covered(f: Frost, r: DOMRect): boolean {
  const screen = f.screen;
  if (!screen) return false;
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return false;
  const hit = document.elementFromPoint(x, y);
  if (!hit) return false;
  const owner = hit.closest(SCREEN_SEL);
  return !!owner && owner !== screen;
}

function tick(f: Frost, now: number): void {
  if (state(f.stage).reduced) {
    applyMotionPref(f);
    return;
  }
  // Offscreen / zero-box canvases (a page that is display:none) cost nothing.
  if (++f.vc % 15 === 1) {
    const r = f.cv.getBoundingClientRect();
    f.off =
      !r.width ||
      !r.height ||
      r.bottom < -120 ||
      r.right < -120 ||
      r.top > window.innerHeight + 120 ||
      r.left > window.innerWidth + 120;
    // ...and neither does a canvas nobody can see because a screen is drawn
    // over it. Every screen here is opaque and fills the stage, so opening one
    // buries the field of every screen below it while they all keep ticking.
    if (!f.off) f.off = covered(f, r);
  }
  if (f.off) return;
  // ~11fps quiet, ~19fps otherwise — the low frame rate is part of the look.
  if (now - f.last > (f.quiet ? 90 : 52)) {
    f.last = now;
    f.t += f.quiet ? 0.45 : 1;
    render(f);
  }
}

/* ------------------------------------------------------------------ renderer */

function render(f: Frost): void {
  const { W, H, quiet, paint } = f;
  const p = f.data;
  const t = f.t;
  const period = quiet ? 7.5 : 13;

  const tgt = f.solid ? 0 : 1;
  f.calm = f.calm === null ? 1 : f.calm + (tgt - f.calm) * 0.085;
  const CA = f.calm;
  const wk = 0.32 + 0.68 * CA;

  const tr = f.trail;
  for (let i = tr.length - 1; i >= 0; i--) {
    tr[i].l *= 0.87;
    if (tr[i].l < 0.05) tr.splice(i, 1);
  }
  const RAD = quiet ? 7 : 11;
  const R2 = RAD * RAD;
  const nT = tr.length;
  const hasTrail = nT > 0 && CA > 0.02;
  let bx0 = 0;
  let by0 = 0;
  let bx1 = -1;
  let by1 = -1;
  if (hasTrail) {
    bx0 = 1e9;
    by0 = 1e9;
    bx1 = -1e9;
    by1 = -1e9;
    for (let i = 0; i < nT; i++) {
      const q = tr[i];
      if (q.x - RAD < bx0) bx0 = q.x - RAD;
      if (q.x + RAD > bx1) bx1 = q.x + RAD;
      if (q.y - RAD < by0) by0 = q.y - RAD;
      if (q.y + RAD > by1) by1 = q.y + RAD;
    }
  }

  const BOOST = f.boost || 1;
  const cmode = f.mode || 0;
  if (f.pmode === null) f.pmode = cmode;
  let raw = 1;
  if (f.pmode !== cmode) {
    f.mix = Math.min(1, f.mix + 0.17);
    raw = f.mix;
    if (raw >= 1) f.pmode = cmode;
  }
  const pmode = f.pmode;
  const MIX = raw * raw * (3 - 2 * raw); // smoothstep
  const BLEND = pmode !== cmode;

  if (f.modeT === null) f.modeT = t;
  const mt = t - f.modeT;
  const BW = quiet ? 10 : 16;
  const BH = quiet ? 7 : 12;
  const NC = Math.ceil(W / BW) + 1;

  /** Written by `sv` on every sample — the palette index for that pixel. */
  let hue = 0;

  const bl: Blob[] = [];
  if (cmode === 4 || pmode === 4) {
    for (let q = 0; q < 6; q++) {
      const b = BLOBS[q];
      bl.push({
        x:
          0.5 +
          Math.sin(t * b.sx * 1.7 + b.px) * b.ax +
          Math.sin(t * b.sx * 4.3 + b.py * 2.1) * b.ax * 0.42,
        y:
          0.5 +
          Math.cos(t * b.sy * 1.9 + b.py) * b.ay * 1.5 +
          Math.sin(t * b.sy * 5.1 + b.px * 1.7) * b.ay * 0.5,
        r2: b.r * b.r * 0.42 * (0.62 + 0.62 * (Math.sin(t * b.br * 2.2 + b.px * 3) * 0.5 + 0.5)),
        a: b.a,
        c: b.c,
      });
    }
  }

  for (let y = 0; y < H; y++) {
    const yn = y / H;
    const warp =
      (Math.sin(yn * 3.1 + t * 0.021) * (quiet ? 5 : 11) +
        Math.sin(yn * 7.4 - t * 0.013) * (quiet ? 2.5 : 6)) *
      wk;
    const hue0 = (Math.sin(yn * 2.2 - t * 0.009) * 0.5 + 0.5) * 5.999;
    const rowHit = hasTrail && y >= by0 && y <= by1;

    // Mode 1: the lattice fills bottom-up, one block row at a time, then wraps.
    const brow = (y / BH) | 0;
    const NR = Math.ceil(H / BH);
    const gp = (mt * 0.003) % 1.12;
    const lvl = (gp < 1 ? gp : 1) * NR;
    const lvi = Math.floor(lvl);
    const rfb = NR - 1 - brow;
    const rowSolid = rfb < lvi;
    const rowActive = rfb === lvi;
    const bfront = NC * (lvl - lvi);
    const bfi = Math.floor(bfront);
    const bedge = y % BH < 1;

    const dy3 = (yn - 0.5) * 0.58;
    const sy2 = Math.sin(yn * 7.3 + t * 0.017) * 3.4;

    const sv = (md: number, x: number, xn: number, disp: number): number => {
      if (md === 4) {
        let vv = 0;
        let bv = 0;
        let bi = 0;
        for (let q = 0; q < 6; q++) {
          const b = bl[q];
          const dx4 = xn - b.x;
          const dy4 = (yn - b.y) * 0.58;
          const fl = b.r2 / (dx4 * dx4 + dy4 * dy4 + b.r2 * 0.17);
          const g4 = fl * fl * b.a * 0.26;
          vv += g4;
          if (g4 > bv) {
            bv = g4;
            bi = q;
          }
        }
        vv += Math.sin(xn * 8.7 + t * 0.023) * Math.sin(yn * 6.1 - t * 0.019) * 0.19;
        hue = bl[bi].c;
        return vv > 1.15 ? 1.15 : vv < 0 ? 0 : vv;
      }
      if (md === 1) {
        const bc = (x / BW) | 0;
        let vv = 0.02;
        if (rowSolid) vv = 0.8;
        else if (rowActive) {
          if (bc < bfi) vv = 0.8;
          else if (bc === bfi) vv = bfront - bfi;
        }
        if (bedge || x % BW < 1) {
          const g2 = 0.33;
          if (vv < g2) vv = g2;
        }
        hue = (brow * 2 + bc) % 6;
        return vv;
      }
      if (md === 2) {
        const sm = Math.sin(x * 0.055 + sy2 + t * 0.021) * 0.5 + 0.5;
        const gr = Math.sin(x * 0.62 + y * 0.14 - t * 0.045) * 0.5 + 0.5;
        hue = (sm * 5.6 + yn * 3.4 + t * 0.004) % 6;
        return sm * 0.74 + gr * 0.26;
      }
      if (md === 3) {
        const dxc = xn - 0.5;
        const r = Math.sqrt(dxc * dxc + dy3 * dy3);
        const ang = Math.atan2(dy3, dxc);
        const sf = (ang + 3.14159) * 0.15915 * 58; // 58 spokes around the circle
        const si = sf | 0;
        // Two cheap hashes per spoke — width/phase and lifetime/color.
        let hs = Math.sin(si * 127.1 + 311.7) * 43758.5453;
        hs -= Math.floor(hs);
        let h2 = Math.sin(si * 269.5 + 183.3) * 43758.5453;
        h2 -= Math.floor(h2);
        const af = sf - si;
        const wd = 0.12 + hs * 0.4;
        const dd = Math.abs(af - (0.2 + hs * 0.6)) / wd;
        const line = dd < 1 ? 1 - dd * dd : 0;
        if (line <= 0) {
          hue = 4;
          return 0;
        }
        const life = (t * (0.014 + hs * 0.058) + h2 * 3.7) % 1;
        const dur = 0.28 + h2 * 0.34;
        if (life > dur) {
          hue = 4;
          return 0;
        }
        const lp = life / dur;
        const rd = Math.abs(r - (-0.04 + lp * 0.64)) / (0.05 + hs * 0.11);
        if (rd >= 1) {
          hue = 4;
          return 0;
        }
        hue = h2 < 0.3 ? 4 : h2 < 0.62 ? 0 : 3;
        return line * (1 - rd * rd) * Math.sin(lp * 3.14159) * (0.45 + hs * 0.55);
      }
      // mode 0 — wavy bands, warped by the row and pushed by the cursor trail
      const phase =
        (x +
          warp +
          disp +
          Math.sin(xn * 5.2 + t * 0.017) * (quiet ? 3 : 7) * wk +
          Math.sin(xn * 11.3 - yn * 4.1 + t * 0.024) * (quiet ? 1.5 : 4) * wk) /
        period;
      const band = Math.sin(phase * 6.283) * 0.5 + 0.5;
      const env =
        0.34 +
        0.66 *
          (Math.sin(xn * 4.3 - t * 0.011) * 0.5 + 0.5) *
          (Math.sin(yn * 2.7 + t * 0.015) * 0.5 + 0.5);
      hue = hue0;
      return band * env;
    };

    for (let x = 0; x < W; x++) {
      const xn = x / W;
      let disp = 0;
      if (rowHit && x >= bx0 && x <= bx1) {
        for (let i = 0; i < nT; i++) {
          const q = tr[i];
          const dx = x - q.x;
          const dy = y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const u = 1 - d2 / R2;
            disp += q.m * q.l * u * u;
          }
        }
        disp *= CA;
      }
      let v = sv(cmode, x, xn, disp);
      let hi = hue;
      if (BLEND) {
        const vp = sv(pmode, x, xn, disp);
        if (MIX < 0.5) hi = hue; // below halfway the outgoing mode owns the hue
        v = v * MIX + vp * (1 - MIX);
      }
      const i = (y * W + x) * 4;
      const c = PAL[((hi | 0) + ((x * 7 + y * 3) % 2)) % 6];
      p[i] = c[0] * v;
      p[i + 1] = c[1] * v;
      p[i + 2] = c[2] * v;
      p[i + 3] = 255;
    }
  }

  // Second pass: threshold the field against the Bayer matrix and snap the
  // survivors to the six-color palette. Three luminance bands, three alphas.
  const hiA = quiet ? 26 : paint ? 104 : 50;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const R0 = p[i];
      const G0 = p[i + 1];
      const B0 = p[i + 2];
      const l = (R0 * 0.299 + G0 * 0.587 + B0 * 0.114) / 255;
      const th = (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
      let r = 0;
      let gg = 0;
      let bb = 0;
      let a = 0;
      if (l > 0.4 + th * 0.34) {
        const c = near(R0, G0, B0, th);
        r = c[0];
        gg = c[1];
        bb = c[2];
        a = hiA;
      } else if (l > 0.16 + th * 0.26) {
        if (paint) {
          const c2 = near(R0, G0, B0, th);
          r = c2[0];
          gg = c2[1];
          bb = c2[2];
          a = 56;
        } else if (quiet) {
          r = 223;
          gg = 203;
          bb = 250;
          a = 12;
        } else {
          r = 74;
          gg = 19;
          bb = 5;
          a = 52;
        }
      } else if (l > 0.03 + th * 0.16) {
        if (paint) {
          const c2 = near(R0, G0, B0, th);
          r = c2[0];
          gg = c2[1];
          bb = c2[2];
          a = 20;
        } else if (quiet) {
          r = 223;
          gg = 203;
          bb = 250;
          a = 6;
        } else {
          r = 43;
          gg = 11;
          bb = 3;
          a = 40;
        }
      }
      if (BOOST !== 1) {
        a *= BOOST;
        if (a > 255) a = 255;
      }
      p[i] = r;
      p[i + 1] = gg;
      p[i + 2] = bb;
      p[i + 3] = a;
    }
  }

  f.g.globalCompositeOperation = 'source-over';
  f.g.putImageData(f.img, 0, 0);
}

/** Nearest palette entry, with the Bayer threshold used as a color jitter. */
function near(R0: number, G0: number, B0: number, th: number): number[] {
  const j = (th - 0.5) * 78;
  let best = 0;
  let bd = 1e9;
  for (let k = 0; k < 6; k++) {
    const c = PAL[k];
    const dr = R0 + j - c[0];
    const dg = G0 + j - c[1];
    const db = B0 + j - c[2];
    const dd = dr * dr + dg * dg + db * db;
    if (dd < bd) {
      bd = dd;
      best = k;
    }
  }
  return PAL[best];
}

/* -------------------------------------------------------------- mode & tween */

function setModeOn(f: Frost, m: number): void {
  // veilOpen resets the offscreen test alongside every mode change so a page
  // canvas that was display:none starts drawing on the very next frame.
  f.off = false;
  f.vc = 0;
  if ((f.mode || 0) === m) return;
  if (f.pmode === null || f.mix >= 1 || f.pmode === f.mode) f.pmode = f.mode || 0;
  f.mix = 0;
  f.mode = m;
  f.modeT = null;
}

const TWEENABLE = new Set(['boost', 'rate', 'mix']);

function tweenOn(f: Frost, key: string, to: number, dur: number): void {
  f.off = false;
  f.vc = 0;
  const k = key.replace(/^_/, '');
  if (!TWEENABLE.has(k)) return;
  const prev = f.tweens.get(k);
  if (prev) cancelAnimationFrame(prev);
  const from = readTween(f, k);
  const t0 = performance.now();
  const step = (now: number): void => {
    const u = dur > 0 ? Math.min(1, (now - t0) / dur) : 1;
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; // ease-in-out quad
    writeTween(f, k, from + (to - from) * e);
    if (u < 1) f.tweens.set(k, requestAnimationFrame(step));
    else f.tweens.delete(k);
  };
  f.tweens.set(k, requestAnimationFrame(step));
}

function readTween(f: Frost, k: string): number {
  if (k === 'rate') return f.rate;
  if (k === 'mix') return f.mix;
  return f.boost;
}

function writeTween(f: Frost, k: string, v: number): void {
  if (k === 'rate') f.rate = v;
  else if (k === 'mix') f.mix = v;
  else f.boost = v;
}

/* --------------------------------------------------------------------- api */

const DEAD: FrostHandle = { setMode() {}, tween() {}, stop() {} };

export function startFrost(cv: HTMLCanvasElement): FrostHandle {
  const existing = FROSTS.get(cv);
  if (existing) {
    if (existing.live) return HANDLES.get(cv) ?? DEAD;
    reset(existing);
    existing.live = true;
    ALL.add(existing);
    applyMotionPref(existing);
    if (!state(existing.stage).reduced) {
      LIVE.add(existing);
      ensureLoop();
    }
    return HANDLES.get(cv) ?? DEAD;
  }

  const g = cv.getContext('2d', { willReadFrequently: true });
  if (!g) return DEAD;

  const W = cv.width;
  const H = cv.height;
  const img = g.createImageData(W, H);
  const kind = cv.getAttribute('data-frost');
  const stage = (cv.closest('[data-frame-root]') as HTMLElement | null) ?? document.documentElement;

  const f: Frost = {
    cv,
    g,
    W,
    H,
    img,
    data: img.data,
    quiet: kind === 'quiet',
    paint: kind === 'paint',
    stage,
    screen: cv.closest<HTMLElement>(SCREEN_SEL),
    mode: 0,
    pmode: null,
    mix: 0,
    modeT: null,
    boost: 1,
    rate: 1,
    solid: false,
    calm: null,
    trail: [],
    inside: false,
    px: 0,
    py: 0,
    t: 0,
    last: 0,
    vc: 0,
    off: false,
    live: true,
    tweens: new Map(),
  };
  reset(f);
  FROSTS.set(cv, f);
  ALL.add(f);

  const handle: FrostHandle = {
    setMode(m: number) {
      if (!f.live) return;
      setModeOn(f, m);
    },
    tween(key: string, to: number, dur: number) {
      if (!f.live) return;
      tweenOn(f, key, to, dur);
    },
    stop() {
      if (!f.live) return;
      f.live = false;
      LIVE.delete(f);
      ALL.delete(f);
      for (const id of f.tweens.values()) cancelAnimationFrame(id);
      f.tweens.clear();
      if (!LIVE.size) stopLoop();
    },
  };
  HANDLES.set(cv, handle);

  // state() first, so state.ts's media listener is registered before ours.
  const reduced = state(stage).reduced;
  wireGlobals();
  if (reduced) {
    freeze(f);
  } else {
    LIVE.add(f);
    ensureLoop();
  }
  return handle;
}

export function frostFor(cv: HTMLCanvasElement | null): FrostHandle | null {
  if (!cv) return null;
  return HANDLES.get(cv) ?? null;
}

const TRACKED = new WeakSet<HTMLElement>();

/**
 * Wire the menu canvases to the cursor: local disruption that settles back,
 * and a per-channel cross-fade of the field's mode. Page canvases are driven
 * by the transition choreography instead, so they are excluded here.
 */
export function trackFrost(stage: HTMLElement): void {
  if (TRACKED.has(stage)) return;
  const canvases = Array.from(stage.querySelectorAll<HTMLCanvasElement>('[data-frost]')).filter(
    (c) => !c.closest('[data-page]'),
  );
  if (!canvases.length) return;
  TRACKED.add(stage);

  for (const cv of canvases) startFrost(cv);

  /** Nothing solid under the cursor — the hero, the wordmark, the stage itself. */
  const isEmpty = (el: Element | null): boolean =>
    !!el &&
    (el === stage ||
      el.hasAttribute('data-hero') ||
      el.hasAttribute('data-wordcol') ||
      el.hasAttribute('data-dither'));

  const set = (solid: boolean, e: MouseEvent | null, mode: number): void => {
    for (const cv of canvases) {
      const f = FROSTS.get(cv);
      if (!f || !f.live) continue;
      f.solid = solid;
      setModeOn(f, mode || 0);
      if (!e) {
        f.inside = false;
        continue;
      }
      const r = cv.getBoundingClientRect();
      const x = r.width ? ((e.clientX - r.left) / r.width) * f.W : 0;
      const y = r.height ? ((e.clientY - r.top) / r.height) * f.H : 0;
      if (f.inside) {
        const dx = x - f.px;
        const dy = y - f.py;
        let m = (dx + dy * 0.45) * 1.15;
        if (m > 9) m = 9;
        else if (m < -9) m = -9;
        if (dx || dy) {
          f.trail.push({ x, y, m, l: 1 });
          if (f.trail.length > 20) f.trail.shift();
        }
      }
      f.px = x;
      f.py = y;
      f.inside = true;
    }
  };

  stage.addEventListener(
    'mousemove',
    (e) => {
      const el = e.target instanceof Element ? e.target : null;
      const ch = el ? el.closest('[data-channel]') : null;
      const md = ch ? +(ch.getAttribute('data-channel') || 0) || 0 : 0;
      set(!ch && !isEmpty(el), e, md);
    },
    { passive: true },
  );
  stage.addEventListener('mouseleave', () => set(false, null, 0), { passive: true });
}
