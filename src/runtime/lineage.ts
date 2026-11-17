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
 *   otherwise   1 in 4 draws the next card that fits, from a deck of twelve
 *               shuffled once per visit: Mark 3, Decode 2, Knockout 2, Jelly 2,
 *               Shear 1, Bayer 1, Canister 1. Quiet ones come up most.
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

import { HUES, mix, pickNot } from './band.ts';
import { ALT, mulberry, step2, step4, type Edge, type Letter } from './ink.ts';
import { setLineage, type Hot, type Lineage, type Look } from './buttons.ts';
import { jellyFor, jellyOptics } from './jx.ts';
// the dress rides in this chunk: every pointer hover's shape, wire and Chickpea's Cut
import './dress.ts';

declare global {
  interface Window {
    __lin?: { force(name: string | null): void; seed(n: number): void; state(): unknown; fits(kind: string): string[] };
    __linQuiet?: boolean;
    /** the checks: hold the deck still but let the dress deal */
    __linHold?: boolean;
  }
}

const GROUND = '#F3F5F8';
const MARKS = ['#CF9A3C', '#8A6A86', '#4F8384'];
const SHEAR = ['#8CA7DA', '#F1CC54', '#FF5A52'];

export const CREDIT: Record<string, string> = {
  canister: 'from scream canister controls',
  decode: 'from after tokens',
  mark: 'from lee',
  shear: 'from mfny concentrates',
  knockout: 'from the motion archive',
  bayer: 'from dither',
  jelly: 'from jellybox',
};

const DECK = ['mark', 'mark', 'mark', 'decode', 'decode', 'knockout', 'knockout', 'jelly', 'jelly', 'shear', 'bayer', 'canister'];
const FITS: Record<string, string[]> = {
  row: ['mark', 'decode', 'knockout', 'jelly', 'shear', 'bayer', 'canister'],
  // a button with its own page colour: the home menu, the pages rows. Never
  // Jelly: it trades the row's colour for JellyBox's nearest pigment, and a
  // menu row's colour has to say which page it opens.
  menu: ['decode', 'canister'],
  inline: ['mark', 'decode', 'jelly'],
  chip: ['mark', 'decode'],
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

/** The card is played: the cooldown, the repeat and the credit count from now. */
function show(h: Hot): void {
  const now = performance.now();
  const own = h.b.hasAttribute('data-lin');
  if (!own) lastLin = !!h.fx;
  byBtn.set(h.b, { t: now, fx: h.fx });
  if (h.fx && !own) showCredit(CREDIT[h.fx], now);
}

/* ------------------------------------------------------------ the credit */

let credit: HTMLSpanElement | null = null;
let creditFrom = 0;
let creditUntil = 0;

function showCredit(text: string, now: number): void {
  if (!credit) {
    credit = document.createElement('span');
    credit.className = 'lin-credit';
    credit.setAttribute('aria-hidden', 'true');
    document.body.appendChild(credit);
  }
  credit.textContent = text;
  creditFrom = now;
  creditUntil = Infinity;
}

function tick(_h: Hot | null, now: number): boolean {
  if (!credit) return false;
  const on = step2(now - creditFrom);
  const off = 1 - step2(now - creditUntil);
  const o = Math.min(on, off);
  const s = o.toFixed(2);
  if (credit.style.opacity !== s) credit.style.opacity = s;
  if (o <= 0 && now > creditUntil) {
    credit.remove();
    credit = null;
    return false;
  }
  return true;
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
const E_OUT = bez(0.23, 1, 0.32, 1);
const E_SETTLE = bez(0.16, 1, 0.3, 1);
const markOf = new WeakMap<HTMLElement, string>();
let markI = 0;
const nextOf = new WeakMap<HTMLElement, string>();

function markBand(h: Hot, p: number): { c: string; s: string } {
  const g = h.geo;
  const mark = markOf.get(h.b) ?? MARKS[0];
  const L = g.wl - 0.25 * g.fs;
  const R = g.bw - (g.wl + g.ww) - 0.25 * g.fs;
  return { c: 'bm', s: `position:absolute;inset:0;background:${p >= 1 ? mix(GROUND, mark, 0.27) : h.P.main};clip-path:inset(0 ${(R * p).toFixed(1)}px 0 ${(L * p).toFixed(1)}px)` };
}

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

function look(h: Hot, tau: number): Look {
  const fx = h.fx;
  const g = h.geo;
  // leaving: Mark's tint stays one drawing; Jelly's slab and cast are cut at
  // once (`leave`) and the flat band takes the slab's rect for one drawing,
  // leaving toward the edge the pointer left by
  if (h.out != null) {
    const gone = performance.now() - h.t0 - h.out >= 50;
    if (fx === 'mark') return { band: gone ? [] : [markBand(h, 1)] };
    if (fx === 'jelly') return { band: gone ? [] : [{ c: 'bm', s: `position:absolute;inset:0;background:${h.P.main};clip-path:${slabClip(h, cap(h), 0.3, h.exit ?? h.P.edge)}` }] };
    return {};
  }
  switch (fx) {
    case 'canister': {
      const d = Math.floor(tau / 50);
      const sx = [-4, 3, -1, 0][Math.min(d, 3)];
      const sc = d === 0 ? 1.075 : d === 1 ? 1.025 : 1.04;
      const ls = alt(h);
      const li = h.P.letters[h.P.letters.length - 1] ?? 0;
      ls[li] = {
        c: h.P.chars[li],
        s:
          tau < 250
            ? ''
            : tau < 300
              ? `${ALT}display:inline-block;transform:translateY(-.6em);color:${h.P.twin};`
              : tau < 350
                ? `${ALT}display:inline-block;transform:scale(1.24,.72);transform-origin:50% 100%;`
                : `${ALT}display:inline-block;transform:rotate(${tau < 400 ? 12 : tau < 450 ? -8 : 0}deg);transform-origin:50% 90%;`,
      };
      return {
        hostS: `transform:scaleY(${tau < 50 ? 0.8 : tau < 100 ? 0.93 : 1});transform-origin:50% 100%`,
        ovS: `transform:translateX(${sx}px) scale(${sc});transform-origin:0 60%`,
        letters: ls,
      };
    }
    case 'decode': {
      const per = Math.max(1, Math.ceil(h.P.letters.length / 6));
      const m = Math.floor(tau / 50);
      if (tau < 350) {
        const ls: Letter[] = h.P.chars.map((c, i) => ({ c: i < h.P.n ? c : '', s: '' }));
        h.P.letters.forEach((i, j) => {
          const dd = Math.floor(j / per) - m;
          if (dd >= 0) ls[i] = { c: '+=-:.'.charAt(Math.min(dd, 4)), s: `color:${h.P.twin};` };
        });
        return { letters: ls };
      }
      const e = E_SETTLE(Math.min(1, (tau - 350) / 200));
      const y = e < 0.55 ? 0.05 * (1 - e / 0.55) : 0;
      const s = e < 0.55 ? 0.994 + 0.011 * (e / 0.55) : 1.005 - 0.005 * ((e - 0.55) / 0.45);
      return { letters: alt(h), ovS: `transform:translateY(${y.toFixed(4)}em) scale(${s.toFixed(4)});transform-origin:0 50%` };
    }
    case 'mark': {
      if (!markOf.has(h.b)) markOf.set(h.b, MARKS[markI++ % MARKS.length]);
      const W = g.ww + 0.5 * g.fs;
      const f = tau < 100 ? 0 : tau < 150 ? 0.4 : tau < 200 ? 0.85 : 1;
      return {
        band: [markBand(h, step2(tau))],
        outline: false,
        rested: true,
        line: f ? `position:absolute;left:${(g.wl - 0.25 * g.fs).toFixed(1)}px;bottom:0;height:2px;width:${(W * f).toFixed(1)}px;background:${mix(GROUND, markOf.get(h.b)!, 0.72)}` : undefined,
      };
    }
    case 'shear': {
      const extra: { c: string; s: string }[] = [];
      [[0, 46], [46, 80], [80, 100]].forEach(([a, b], k) => {
        if (tau < 50 * k) return;
        const e = E_OUT(Math.min(1, (tau - 50 * k) / 280));
        const sl = `${(0.2309 * g.bh * e).toFixed(2)}px`;
        const R = `calc(${(a + (b - a) * e).toFixed(2)}% + ${(27 * (1 - e)).toFixed(1)}px)`;
        extra.push({ c: '', s: `position:absolute;inset:0;background:${SHEAR[k]};clip-path:polygon(${a}% 100%, calc(${a}% + ${sl}) 0%, calc(${R} + ${sl}) 0%, ${R} 100%)` });
      });
      return { letters: alt(h), extra };
    }
    case 'knockout': {
      const px = Math.max(0, Math.min(1, (h.px0 ?? g.bw / 2) / g.bw));
      const p = step4(tau);
      const blink = tau >= 250 && tau < 350;
      const clip = `clip-path:inset(0 ${((1 - px) * (1 - p) * 100).toFixed(2)}% 0 ${(px * (1 - p) * 100).toFixed(2)}%);visibility:${blink ? 'hidden' : 'visible'}`;
      return {
        letters: alt(h),
        extra: [{ c: '', s: `position:absolute;inset:0;background:#12141B;${clip}` }],
        own: (hh) => copyOf(hh, clip),
      };
    }
    case 'bayer': {
      if (!nextOf.has(h.b)) nextOf.set(h.b, pickNot(HUES, h.P.main));
      const T = 4 * Math.round(g.fs / 6);
      const cx = Math.round(h.px / T) * T;
      const gr = tau < 50 ? 0.25 : tau < 100 ? 0.5 : tau < 150 ? 0.75 : 1;
      const extra = [
        [1, 5],
        [2, 4],
        [3, 3],
        [4, 2],
      ].map(([lv, r]) => {
        const rr = r * T * gr;
        return {
          c: `bay bay${lv}`,
          s: `position:absolute;inset:0;background:${nextOf.get(h.b)};-webkit-mask-size:${T}px ${T}px;mask-size:${T}px ${T}px;clip-path:inset(0 ${Math.max(0, g.bw - cx - rr).toFixed(1)}px 0 ${Math.max(0, cx - rr).toFixed(1)}px)`,
        };
      });
      return { extra };
    }
    case 'jelly': {
      // 0: strips and outline cut, the band 70% of the way in; 50: the band is
      // the slab's rect; 100: the cut, the slab takes it; then its floor and
      // cast open in thirds
      const c = cap(h);
      if (tau < 100) {
        const q = step2(tau);
        const r = g.bw - c.x - c.w;
        const bot = g.bh - c.y - c.h;
        return {
          outline: false,
          band: [{ c: 'bm', s: `position:absolute;inset:0;background:${h.P.main};clip-path:inset(${(c.y * q).toFixed(1)}px ${(r * q).toFixed(1)}px ${(bot * q).toFixed(1)}px ${(c.x * q).toFixed(1)}px round ${(c.r * q).toFixed(1)}px)` }],
        };
      }
      const open = tau < 150 ? 0 : tau < 200 ? 1 / 3 : tau < 250 ? 2 / 3 : 1;
      return { outline: false, band: [], own: (hh) => jellyFor(hh, c, open) };
    }
  }
  return {};
}

function leave(h: Hot, now: number): void {
  if (h.fx) {
    linEnd = now;
    if (!h.b.hasAttribute('data-lin')) creditUntil = Math.max(now + 900, h.t0 + 220 + 1600);
    if (h.fx === 'jelly') jellyFor(h, cap(h), -2);
  }
  h.b.querySelectorAll(':scope > [data-k="kc"]').forEach((n) => n.remove());
}

function cut(h: Hot): void {
  h.b.querySelectorAll(':scope > [data-k="kc"]').forEach((n) => n.remove());
  if (h.fx === 'jelly') jellyFor(h, cap(h), -2);
}

const api: Lineage = { deal, show, look, tick, leave, cut };

/** The dress's Cut shows its own credit, through the same element. */
export function creditFor(text: string, now: number): void {
  showCredit(text, now);
}
export function creditOff(now: number, t0: number): void {
  creditUntil = Math.max(now + 900, t0 + 220 + 1600);
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
};
