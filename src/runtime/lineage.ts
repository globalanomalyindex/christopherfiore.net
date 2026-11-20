/**
 * Lineage: effects from his past projects, dealt now and then on a hover.
 *
 * Its own chunk, loaded after the page has been seen, on pointers that can
 * hover. Until it lands, every hover is the glitch alone.
 *
 * Every hover is the glitch for its first 220ms. If the pointer is still
 * there, the deck may deal an effect, which starts from the settled glitch:
 *
 *   own row     a project's own row (`data-lin`) always plays its own effect
 *   cooldown    right after an effect, or within 1.5s of one: glitch only
 *   repeat      the same button again within 4s repeats what it just did
 *   otherwise   1 in 4 draws the next card that fits, from a deck of fourteen
 *               shuffled once per visit: Mark 3, Decode 2, Skeleton 2,
 *               Knockout 2, Jelly 2, Tricode 1, Bayer 1, Canister 1.
 *
 * In practice about one resting hover in six, and never two in a row. Fast
 * sweeps never reach the dwell, so they only ever get the glitch. The order is
 * seeded per visit (sessionStorage `ps-lin`), so it is fixed for a visit and a
 * check can replay it: `window.__lin.force(name)` and `.seed(n)`.
 *
 * Each effect is a pure function of the time since the dwell. Leaving at any
 * moment removes everything it added in the same frame (`cut`), and the band
 * plays its own one drawing exit. No effect changes a width: hover still
 * moves nothing.
 */

import { mix } from './band.ts';
import { ALT, mulberry, step2, step4, type Edge, type Letter } from './ink.ts';
import { hotNow, setLineage, type Hot, type Lineage, type Look } from './buttons.ts';
import { jellyFor, jellyOptics } from './jx.ts';
import { skeletonDone, skeletonLook } from './fx/after-tokens.ts';
import { textGrid } from './fx/textgrid.ts';
import { ditherCut, ditherLook } from './fx/dither.ts';
// the dress rides in this chunk: every pointer hover's shape, wire and Chickpea's Cut
import './dress.ts';

declare global {
  interface Window {
    __lin?: { force(name: string | null): void; seed(n: number): void; state(): unknown; fits(kind: string): string[]; grid(): unknown };
    __linQuiet?: boolean;
    /** the checks: hold the deck still but let the dress deal */
    __linHold?: boolean;
  }
}

const GROUND = '#F3F5F8';
const MARKS = ['#CF9A3C', '#8A6A86', '#4F8384'];
/**
 * Tricode: MFNY's type filter pill (public/mfny/concentrates.html), opened and
 * laid flat. Its fills in TRI_ORDER (Indica, Hybrid, Sativa, from TYPE_STYLE),
 * each pre-mixed over the pill's white surface at its hover opacities: the
 * segment under the pointer at 1, the others at 0.55, and 0.6 while none is.
 * The lowest, Sativa lit, holds band ink at 5.7:1.
 */
const TRI = [
  { lit: '#8CA7DA', dim: '#C0CFEB', idle: '#BACAE9' },
  { lit: '#F1CC54', dim: '#F7E3A1', idle: '#F7E098' },
  { lit: '#FF5A52', dim: '#FFA4A0', idle: '#FF9C97' },
];
/** The pill's divider on its second and third segments, verbatim. */
const TRI_RULE = 'inset 1.5px 0 0 0 rgba(255,255,255,0.9)';
/** A segment opens from 27px collapsed to 64px open (SEGMENT_COLLAPSED, segmentOpen). */
const TRI_K0 = 27 / 64;

export const CREDIT: Record<string, string> = {
  canister: 'from scream canister controls',
  decode: 'from after tokens',
  skeleton: 'from after tokens',
  mark: 'from lee',
  tricode: 'from mfny concentrates',
  knockout: 'from the motion archive',
  bayer: 'from dither',
  jelly: 'from jellybox',
};

const DECK = ['mark', 'mark', 'mark', 'decode', 'decode', 'skeleton', 'skeleton', 'knockout', 'knockout', 'jelly', 'jelly', 'tricode', 'bayer', 'canister'];
const FITS: Record<string, string[]> = {
  row: ['mark', 'decode', 'skeleton', 'knockout', 'jelly', 'tricode', 'bayer', 'canister'],
  // a button with its own page colour: the home menu, the pages rows. Never
  // Jelly: it trades the row's colour for JellyBox's nearest pigment, and a
  // menu row's colour has to say which page it opens.
  menu: ['decode', 'skeleton', 'canister'],
  inline: ['mark', 'decode', 'skeleton', 'jelly'],
  chip: ['mark', 'decode', 'skeleton'],
};

/* ------------------------------------------------------------ the deck */

const KEY = 'ps-lin';
interface Visit {
  seed: number;
  round: number;
  pos: number;
}

function load(): Visit {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (v && typeof v.seed === 'number') return { seed: v.seed, round: v.round | 0, pos: v.pos | 0 };
  } catch {
    /* private mode: a fresh visit every page */
  }
  return { seed: (Math.random() * 2 ** 31) | 0, round: 0, pos: 0 };
}

const visit = load();
let deck: string[] = [];
let rng: () => number = Math.random;

function shuffle(): void {
  const r = mulberry(visit.seed + visit.round * 7919);
  deck = DECK.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  rng = mulberry(visit.seed ^ (visit.round + 1) * 2654435761);
  // the coin is part of the visit too: replay it past the cards already drawn
  for (let i = 0; i < visit.pos * 3; i++) rng();
}
shuffle();

function save(): void {
  try {
    const old = JSON.parse(sessionStorage.getItem(KEY) ?? '{}');
    sessionStorage.setItem(KEY, JSON.stringify({ ...old, seed: visit.seed, round: visit.round, pos: visit.pos }));
  } catch {
    /* fine */
  }
}

let lastLin = false;
let linEnd = -1e9;
const byBtn = new WeakMap<HTMLElement, { t: number; fx: string | null }>();
let forced: string | null = null;

function kindOf(b: HTMLElement): string {
  if (b.classList.contains('in')) return 'inline';
  if (b.classList.contains('cell') || b.classList.contains('fig')) return 'chip';
  if (b.hasAttribute('data-hue')) return 'menu';
  return 'row';
}

const jellyFits = (h: Hot) => cap(h).h >= 28 && !!jellyOptics();

/** At entry: the card this hover will play at the dwell (the hover is dressed instead when it is null). */
function deal(h: Hot): string | null {
  const now = performance.now();
  const b = h.b;
  const own = b.getAttribute('data-lin');
  let fx: string | null = null;
  // the checks hold the deck still while they measure the glitch itself
  if ((window.__linQuiet || window.__linHold) && !forced) return null;
  if (forced) fx = forced;
  else if (own) fx = own;
  else if (lastLin || now - linEnd < 1500) fx = null;
  else {
    const prev = byBtn.get(b);
    if (prev && now - prev.t < 4000) fx = prev.fx;
    else if (rng() < 0.25) {
      const fits = FITS[kindOf(b)];
      const n = deck.length;
      for (let k = visit.pos; k < visit.pos + n && !fx; k++) {
        const c = deck[k % n];
        if (fits.includes(c) && (c !== 'jelly' || jellyFits(h))) {
          const at = k % n;
          [deck[visit.pos % n], deck[at]] = [deck[at], deck[visit.pos % n]];
          fx = c;
        }
      }
      if (fx) {
        visit.pos++;
        if (visit.pos >= n) {
          visit.round++;
          visit.pos = 0;
          shuffle();
        }
        save();
      }
    }
  }
  return fx;
}

/** The card is played at the dwell: the cooldown and the repeat count from now. The credit waits for the effect's first drawing. */
function show(h: Hot): void {
  const now = performance.now();
  const own = h.b.hasAttribute('data-lin');
  if (!own) lastLin = !!h.fx;
  byBtn.set(h.b, { t: now, fx: h.fx });
}

/* ------------------------------------------------------------ the credit */

let credit: HTMLSpanElement | null = null;

/*
 * The credit steps in and out on two drawings of its own (0.7, then 1; 0.3,
 * then gone), timed by itself, so it never keeps the hover's frame clock
 * running while it simply sits there.
 */
let creditTimers: number[] = [];
const clearCreditTimers = () => {
  creditTimers.forEach((t) => clearTimeout(t));
  creditTimers = [];
};

function showCredit(text: string, _now: number): void {
  clearCreditTimers();
  if (!credit) {
    credit = document.createElement('span');
    credit.className = 'lin-credit';
    credit.setAttribute('aria-hidden', 'true');
    document.body.appendChild(credit);
  }
  credit.textContent = text;
  credit.style.opacity = String(step2(0));
  creditTimers.push(window.setTimeout(() => credit && (credit.style.opacity = '1'), 50));
}

/** Out at `until`: 0.3 for one drawing, then gone. */
function creditOut(until: number): void {
  clearCreditTimers();
  const wait = Math.max(0, until - performance.now());
  creditTimers.push(
    window.setTimeout(() => {
      if (credit) credit.style.opacity = (1 - step2(0)).toFixed(2);
      creditTimers.push(
        window.setTimeout(() => {
          credit?.remove();
          credit = null;
        }, 50),
      );
    }, wait),
  );
}

function tick(_h: Hot | null, _now: number): boolean {
  return false;
}

/* ------------------------------------------------------------ the effects */

const alt = (h: Hot): Letter[] => h.P.chars.map((c) => ({ c, s: c.trim() ? ALT : '' }));
const bez = (x1: number, y1: number, x2: number, y2: number) => (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 10; i++) {
    const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
    const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    if (Math.abs(d) < 1e-6) break;
    t = Math.max(0, Math.min(1, t - cx / d));
  }
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
};
const E_SETTLE = bez(0.16, 1, 0.3, 1);
/** MFNY's --ease-move, for anything that changes size or position. */
const E_MOVE = bez(0.2, 0.85, 0.25, 1);
/** Tricode's two seams for a hover, on the mono cell and never inside a word. */
const triOf = new WeakMap<Hot, [number, number]>();

/**
 * Where Tricode's seams go: the pill's equal thirds, each moved to the
 * nearest mono cell boundary that splits no word (the site never cuts
 * through one), at most 8 cells away.
 */
function triSeams(h: Hot): [number, number] {
  const had = triOf.get(h);
  if (had) return had;
  const b = h.b;
  const g = h.geo;
  const cell = g.fs / 2;
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const words: [number, number][] = [];
  const add = (q: DOMRect) => {
    if (q.width > 0.5) words.push([(q.left - r.left) / sc, (q.right - r.left) / sc]);
  };
  // the label and the tag's ruled box stay whole
  b.querySelectorAll('[data-word], .cs > span').forEach((el) => add(el.getBoundingClientRect()));
  b.querySelectorAll('.l, .n').forEach((el) => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      for (const m of (n.textContent ?? '').matchAll(/\S+/g)) {
        const rg = document.createRange();
        rg.setStart(n, m.index!);
        rg.setEnd(n, m.index! + m[0].length);
        for (const q of rg.getClientRects()) add(q);
      }
    }
  });
  const clear = (x: number) => !words.some(([l, rr]) => l < x - 0.5 && rr > x + 0.5);
  const seam = (target: number): number => {
    const k0 = Math.round(target / cell);
    for (let d = 0; d <= 8; d++) {
      for (const k of d ? [k0 + d, k0 - d] : [k0]) {
        const x = k * cell;
        if (x > cell && x < g.bw - cell && clear(x)) return x;
      }
    }
    return k0 * cell;
  };
  const out: [number, number] = [seam(g.bw / 3), seam((2 * g.bw) / 3)];
  triOf.set(h, out);
  return out;
}
const markOf = new WeakMap<HTMLElement, string>();
let markI = 0;

function markBand(h: Hot, p: number): { c: string; s: string } {
  const g = h.geo;
  const mark = markOf.get(h.b) ?? MARKS[0];
  const L = g.wl - 0.25 * g.fs;
  const R = g.bw - (g.wl + g.ww) - 0.25 * g.fs;
  return { c: 'bm', s: `position:absolute;inset:0;background:${p >= 1 ? mix(GROUND, mark, 0.27) : h.P.main};clip-path:inset(0 ${(R * p).toFixed(1)}px 0 ${(L * p).toFixed(1)}px)` };
}

/**
 * Knockout's ink: a deep step of the band's own colour, not black, so the
 * inversion stays in the hover's colour. Deep enough that the ground-ink
 * letters on it hold 4.5:1.
 */
const lumOf = (hex: string): number =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const deepOf = (main: string): string => {
  for (let k = 0.55; k < 0.95; k += 0.05) {
    const c = mix(main, '#1A1820', k);
    if ((lumOf(GROUND) + 0.05) / (lumOf(c) + 0.05) >= 4.5) return c;
  }
  return '#1A1820';
};

/** Knockout's second copy of the label in ground ink, clipped with the ink so each letter inverts at the edge. */
function copyOf(h: Hot, clip: string): void {
  let kc = h.b.querySelector<HTMLSpanElement>(':scope > [data-k="kc"]');
  if (!kc) {
    kc = document.createElement('span');
    kc.setAttribute('data-k', 'kc');
    kc.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.style.cssText = `position:absolute;left:${h.geo.wl.toFixed(1)}px;top:${h.geo.wt.toFixed(1)}px;white-space:pre;color:${GROUND}`;
    h.P.chars.forEach((c) => {
      const s = document.createElement('span');
      s.textContent = c;
      if (c.trim()) s.setAttribute('style', ALT);
      inner.appendChild(s);
    });
    kc.appendChild(inner);
    h.b.appendChild(kc);
  }
  const want = `position:absolute;inset:0;z-index:1;pointer-events:none;${clip}`;
  if (kc.getAttribute('style') !== want) kc.setAttribute('style', want);
}

/**
 * Where Jelly lies. On a row it is the row's own surface: one of JellyBox's
 * round-ended controls, 3px inside all four edges, under the name, the tag and
 * the detail. A link in a sentence is only its word, so there it is the word's.
 */
function cap(h: Hot): { x: number; y: number; w: number; h: number; r: number } {
  const g = h.geo;
  if (h.b.classList.contains('in')) {
    const l = g.wl - 0.375 * g.fs;
    const r = g.wl + g.ww + 0.375 * g.fs;
    return { x: l, y: 2, w: r - l, h: g.bh - 4, r: (g.bh - 4) / 2 };
  }
  return { x: 3, y: 3, w: g.bw - 6, h: g.bh - 6, r: (g.bh - 6) / 2 };
}

/** The slab's rect as a clip, shrunk to `v` of itself toward `edge`: the band's one drawing exit, from the slab. */
function slabClip(h: Hot, c: ReturnType<typeof cap>, v: number, edge: Edge): string {
  const g = h.geo;
  let [t, r, b, l] = [c.y, g.bw - c.x - c.w, g.bh - c.y - c.h, c.x];
  const cutW = c.w * (1 - v);
  const cutH = c.h * (1 - v);
  if (edge === 'l') r += cutW;
  else if (edge === 'r') l += cutW;
  else if (edge === 't') b += cutH;
  else t += cutH;
  return `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${c.r.toFixed(1)}px)`;
}

/**
 * The rest. The glitch lands by 200ms and the dwell is at 220ms; every effect
 * begins 80ms later, on the hover's sixth drawing (300ms), so the settled
 * glitch holds for two drawings and the effect reads as a second beat, never
 * as a stutter on the end of the first. The credit steps in with the effect.
 */
const DWELL = 220;
const REST = 80;
/** hovers whose effect has drawn its first frame */
const begun = new WeakSet<Hot>();

function look(h: Hot, tau: number): Look {
  const fx = h.fx;
  const g = h.geo;
  // leaving: Mark's tint stays one drawing; Jelly's slab and cast are cut at
  // once (`leave`) and the flat band takes the slab's rect for one drawing,
  // leaving toward the edge the pointer left by. Left during the rest, the
  // effect never began: the glitch leaves as it always does.
  if (h.out != null) {
    if (!begun.has(h)) return {};
    const gone = performance.now() - h.t0 - h.out >= 50;
    if (fx === 'mark') return { band: gone ? [] : [markBand(h, 1)] };
    if (fx === 'jelly') return { band: gone ? [] : [{ c: 'bm', s: `position:absolute;inset:0;background:${h.P.main};clip-path:${slabClip(h, cap(h), 0.3, h.exit ?? h.P.edge)}` }] };
    return {};
  }
  const t = tau - REST;
  if (t < 0) return {};
  if (!begun.has(h)) {
    begun.add(h);
    if (fx && !h.b.hasAttribute('data-lin')) showCredit(CREDIT[fx], performance.now());
  }
  switch (fx) {
    case 'canister': {
      const d = Math.floor(t / 50);
      const sx = [-4, 3, -1, 0][Math.min(d, 3)];
      const sc = d === 0 ? 1.075 : d === 1 ? 1.025 : 1.04;
      const ls = alt(h);
      const li = h.P.letters[h.P.letters.length - 1] ?? 0;
      ls[li] = {
        c: h.P.chars[li],
        s:
          t < 250
            ? ''
            : t < 300
              ? `${ALT}display:inline-block;transform:translateY(-.6em);color:${h.P.twin};`
              : t < 350
                ? `${ALT}display:inline-block;transform:scale(1.24,.72);transform-origin:50% 100%;`
                : `${ALT}display:inline-block;transform:rotate(${t < 400 ? 12 : t < 450 ? -8 : 0}deg);transform-origin:50% 90%;`,
      };
      return {
        hostS: `transform:scaleY(${t < 50 ? 0.8 : t < 100 ? 0.93 : 1});transform-origin:50% 100%`,
        ovS: `transform:translateX(${sx}px) scale(${sc});transform-origin:0 60%`,
        letters: ls,
      };
    }
    case 'skeleton':
      return skeletonLook(h, t);
    case 'decode': {
      const per = Math.max(1, Math.ceil(h.P.letters.length / 6));
      const m = Math.floor(t / 50);
      if (t < 350) {
        const ls: Letter[] = h.P.chars.map((c, i) => ({ c: i < h.P.n ? c : '', s: '' }));
        h.P.letters.forEach((i, j) => {
          const dd = Math.floor(j / per) - m;
          if (dd >= 0) ls[i] = { c: '+=-:.'.charAt(Math.min(dd, 4)), s: `color:${h.P.twin};` };
        });
        return { letters: ls };
      }
      const e = E_SETTLE(Math.min(1, (t - 350) / 200));
      const y = e < 0.55 ? 0.05 * (1 - e / 0.55) : 0;
      const s = e < 0.55 ? 0.994 + 0.011 * (e / 0.55) : 1.005 - 0.005 * ((e - 0.55) / 0.45);
      return { letters: alt(h), ovS: `transform:translateY(${y.toFixed(4)}em) scale(${s.toFixed(4)});transform-origin:0 50%` };
    }
    case 'mark': {
      if (!markOf.has(h.b)) markOf.set(h.b, MARKS[markI++ % MARKS.length]);
      const W = g.ww + 0.5 * g.fs;
      const f = t < 100 ? 0 : t < 150 ? 0.4 : t < 200 ? 0.85 : 1;
      return {
        band: [markBand(h, step2(t))],
        outline: false,
        rested: true,
        line: f ? `position:absolute;left:${(g.wl - 0.25 * g.fs).toFixed(1)}px;bottom:0;height:2px;width:${(W * f).toFixed(1)}px;background:${mix(GROUND, markOf.get(h.b)!, 0.72)}` : undefined,
      };
    }
    case 'tricode': {
      // MFNY's pill opening from the left on its own curve, held on the band's
      // drawings: 76%, 95%, then the three tile the whole band at 100ms
      const e = t < 50 ? E_MOVE(0.25) : t < 100 ? E_MOVE(0.5) : 1;
      const k = TRI_K0 + (1 - TRI_K0) * e;
      const cell = g.fs / 2;
      const snap = (v: number) => Math.min(g.bw, Math.round(v / cell) * cell);
      const [s1, s2] = triSeams(h);
      const xs = [0, snap(s1 * k), snap(s2 * k), e >= 1 ? g.bw : snap(g.bw * k)];
      // the segment under the pointer lights; the pill's hover, a hard cut at the seam
      const on = h.px < xs[3] ? (h.px < xs[1] ? 0 : h.px < xs[2] ? 1 : 2) : -1;
      const extra = TRI.map((c, i) => ({
        c: 'tri',
        s: `position:absolute;top:0;bottom:0;left:${xs[i].toFixed(1)}px;width:${(xs[i + 1] - xs[i]).toFixed(1)}px;background:${on < 0 ? c.idle : i === on ? c.lit : c.dim}${i ? `;box-shadow:${TRI_RULE}` : ''}`,
      }));
      return { letters: alt(h), extra, follow: true };
    }
    case 'knockout': {
      const px = Math.max(0, Math.min(1, (h.px0 ?? g.bw / 2) / g.bw));
      const p = step4(t);
      const blink = t >= 250 && t < 350;
      const clip = `clip-path:inset(0 ${((1 - px) * (1 - p) * 100).toFixed(2)}% 0 ${(px * (1 - p) * 100).toFixed(2)}%);visibility:${blink ? 'hidden' : 'visible'}`;
      return {
        letters: alt(h),
        extra: [{ c: '', s: `position:absolute;inset:0;background:${deepOf(h.P.main)};${clip}` }],
        own: (hh) => copyOf(hh, clip),
      };
    }
    case 'bayer':
      return ditherLook(h, t);
    case 'jelly': {
      // 0: strips and outline cut, the band 70% of the way in; 50: the band is
      // the slab's rect; 100: the cut, the slab takes it; then its floor and
      // cast open in thirds
      const c = cap(h);
      if (t < 100) {
        const q = step2(t);
        const r = g.bw - c.x - c.w;
        const bot = g.bh - c.y - c.h;
        return {
          outline: false,
          band: [{ c: 'bm', s: `position:absolute;inset:0;background:${h.P.main};clip-path:inset(${(c.y * q).toFixed(1)}px ${(r * q).toFixed(1)}px ${(bot * q).toFixed(1)}px ${(c.x * q).toFixed(1)}px round ${(c.r * q).toFixed(1)}px)` }],
        };
      }
      const open = t < 150 ? 0 : t < 200 ? 1 / 3 : t < 250 ? 2 / 3 : 1;
      return { outline: false, band: [], own: (hh) => jellyFor(hh, c, open) };
    }
  }
  return {};
}

function leave(h: Hot, now: number): void {
  if (h.fx === 'skeleton') skeletonDone(h);
  if (h.fx) {
    linEnd = now;
    // only this hover's own credit: a hover left during the rest never showed one
    if (!h.b.hasAttribute('data-lin') && credit && begun.has(h)) creditOut(Math.max(now + 900, h.t0 + DWELL + 1600));
    if (h.fx === 'jelly') jellyFor(h, cap(h), -2);
    if (h.fx === 'bayer') ditherCut(h);
  }
  h.b.querySelectorAll(':scope > [data-k="kc"]').forEach((n) => n.remove());
}

function cut(h: Hot): void {
  skeletonDone(h);
  ditherCut(h);
  h.b.querySelectorAll(':scope > [data-k="kc"]').forEach((n) => n.remove());
  if (h.fx === 'jelly') jellyFor(h, cap(h), -2);
}

const api: Lineage = { deal, show, look, tick, leave, cut };

/** The dress's Cut shows its own credit, through the same element. */
export function creditFor(text: string, now: number): void {
  showCredit(text, now);
}
export function creditOff(now: number, t0: number): void {
  if (credit) creditOut(Math.max(now + 900, t0 + 220 + 1600));
}
setLineage(api);

window.__lin = {
  force(name) {
    forced = name;
  },
  seed(n) {
    visit.seed = n;
    visit.round = 0;
    visit.pos = 0;
    shuffle();
    save();
  },
  state: () => ({ seed: visit.seed, round: visit.round, pos: visit.pos, deck: deck.slice(), lastLin, sinceLin: performance.now() - linEnd }),
  fits: (kind: string) => (FITS[kind] ?? []).slice(),
  // the checks: the live hover's text grid, without its element references
  grid: () => {
    const h = hotNow()[0];
    if (!h) return null;
    const g = textGrid(h);
    return { cell: g.cell, bw: g.bw, bh: g.bh, bands: g.bands, seams: g.seams, words: g.words, blocks: g.blocks.map((k) => ({ kind: k.kind, fs: k.fs, lh: k.lh, lines: k.lines })) };
  },
};
