/**
 * The signature at the bottom of the home page, written in.
 *
 * The page arrives with the finished signature in it: one path, the traced
 * outline, filled in ink. With scripts off, that is all there is, and it is
 * correct. This module only ever takes that path away to write it back in,
 * and always hands it back exactly as it arrived.
 *
 * NOTHING MAY FLASH THE FINISHED SIGNATURE AND THEN ERASE IT. This module is
 * loaded late (a deferred module, then a dynamic import), which is far too late
 * to hide anything before first paint. So a tiny inline script in the home
 * page's head does the hiding: it adds `sig-wait` to <html> before anything
 * paints, and takes it off again after 3s if nobody claims the signature.
 * This module claims it by setting `window.__psSigClaim` and hiding the block
 * itself, in the same task that removes `sig-wait`. If the class is already
 * gone (reduced motion, a back/forward visit, or the failsafe fired), this
 * module does nothing at all and the static signature stays.
 *
 * HOW IT DRAWS. Everything is clipped to the outline, so it can only ever
 * uncover real ink. Behind the pen, ink that has swollen to full width is one
 * stroked path per gesture, revealed with a dash. The live part, between that
 * and the nib, is a single path of discs whose radii follow the pen's
 * pressure. Only the paths that change are repainted.
 */

import { strokes, maskWidth, penRadius } from '../data/signature.json';
import { buildSchedule, widthAt, type Schedule } from './signature-schedule.ts';

declare global {
  interface Window {
    __psSigClaim?: number;
    __sig?: { seek(ms: number): void; play(): void; duration: number };
  }
}

const NS = 'http://www.w3.org/2000/svg';
/**
 * Wait this long once it is in view, so it starts after the page has settled
 * and the eye has landed. The home page always fits the screen, so on a normal
 * visit it is in view from the first frame and this is the whole delay.
 */
const BEAT = 120;
/** How much of it must be in view to start. */
const IN_VIEW = 0.6;

const html = document.documentElement;
const wrap = document.querySelector<HTMLElement>('[data-sig]');
const svg = wrap?.querySelector<SVGSVGElement>('svg') ?? null;
const ink = svg?.querySelector<SVGPathElement>('.sig-ink') ?? null;
const debug = location.search.includes('sig-debug');

const f1 = (v: number) => Math.round(v * 10) / 10;

function start(): void {
  if (!wrap || !svg || !ink) return;
  if (!html.classList.contains('sig-wait') && !debug) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // Reduced motion switched on between the head gate and now: give it back.
  if (reduce.matches && !debug) {
    html.classList.remove('sig-wait');
    return;
  }

  // Claim, in one task: from here on this module owns the signature.
  //
  // Hidden with SVG's own `display` attribute, never `element.style`. Chrome
  // writes a CSSOM change back to the style attribute lazily, so hiding with
  // `style.display` and later removing the attribute can leave an empty
  // `style=""` behind: not the markup the server sent.
  //
  // While it waits, the whole block is hidden (data-sig="waiting"), not just
  // the ink: a visible block still scores as layout shift when the web font
  // swaps in above it and moves it, and a hidden one does not. It shows again
  // on the first frame of writing, with the ink hidden instead.
  window.__psSigClaim = 1;
  wrap.setAttribute('data-sig', 'waiting');
  html.classList.remove('sig-wait');

  let sc: Schedule | null = null;
  let group: SVGGElement | null = null;
  let dry: SVGPathElement[] = [];
  /** Per gesture: its path while live, and once done (with its scraps). */
  let dLive: string[] = [];
  let dDone: string[] = [];
  let core: SVGPathElement | null = null;
  let raf = 0;
  let t0 = -1;
  let finished = false;
  /** The autoplay is over for good: written, or handed back. Nothing restarts it. */
  let over = false;
  let io: IntersectionObserver | null = null;
  let beat = 0;
  // ?sig-debug never plays by itself: it waits to be driven.
  let manual = debug;
  const written = new WeakMap<Element, Map<string, string>>();

  /** Write an attribute only when it changes; `null` removes it. */
  const set = (el: Element, name: string, value: string | null) => {
    let m = written.get(el);
    if (!m) written.set(el, (m = new Map()));
    if (m.has(name) && m.get(name) === value) return;
    m.set(name, value as string);
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  };

  const prepare = () => {
    if (!sc) sc = buildSchedule({ strokes, maskWidth, penRadius });
    return sc;
  };

  /**
   * The signature exactly as the server sent it. Called on every way out, and
   * final: it also disarms the scroll trigger, so a signature handed back
   * (reduced motion switched on, an error, a back/forward return) is never
   * erased and written in afterwards.
   */
  const enterFinal = () => {
    finished = true;
    over = true;
    io?.disconnect();
    clearTimeout(beat);
    cancelAnimationFrame(raf);
    group?.remove();
    group = null;
    ink.removeAttribute('display');
    wrap.setAttribute('data-sig', '');
  };

  const build = (s: Schedule) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'sig-anim');
    g.setAttribute('clip-path', 'url(#ps-sig-clip)');
    g.setAttribute('fill', 'currentColor');
    g.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(NS, 'defs');
    const clip = document.createElementNS(NS, 'clipPath');
    clip.id = 'ps-sig-clip';
    const cp = document.createElementNS(NS, 'path');
    cp.setAttribute('d', ink.getAttribute('d') ?? '');
    // evenodd, on the path inside the clip, or the o, e and b fill in.
    cp.setAttribute('clip-rule', 'evenodd');
    clip.appendChild(cp);
    defs.appendChild(clip);
    g.appendChild(defs);
    dLive = s.gestures.map((ges) => `M${ges.S.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}`);
    dDone = s.gestures.map((ges, j) => dLive[j] + ges.residue.map((r) => r.d).join(''));
    dry = s.gestures.map(() => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', String(s.W));
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      g.appendChild(p);
      return p;
    });
    core = document.createElementNS(NS, 'path');
    g.appendChild(core);
    group = g;
  };

  const discs: (string | number)[] = [];
  const disc = (x: number, y: number, r: number) => {
    if (r <= 0.05) return;
    const rr = f1(r);
    discs.push('M', f1(x - rr), f1(y), 'a', rr, rr, 0, 1, 0, f1(2 * rr), 0, 'a', rr, rr, 0, 1, 0, f1(-2 * rr), 0);
  };

  /** Draw the state at `t` ms. */
  const render = (t: number) => {
    const s = prepare();
    if (t >= s.duration) {
      enterFinal();
      return;
    }
    if (!group) build(s);
    if (!group!.isConnected) {
      ink.setAttribute('display', 'none');
      svg.appendChild(group!);
      wrap.setAttribute('data-sig', '');
    }
    // At phone sizes, samples 1.5 units apart are a fraction of a pixel apart.
    const stride = svg.getBoundingClientRect().width >= 1000 ? 1 : 2;
    discs.length = 0;

    // Every frame sets every path's whole state from `t` alone, so a frame
    // is the same however it was reached: playing forward, or seeking back.
    s.gestures.forEach((g, j) => {
      const path = dry[j];
      if (t >= g.done) {
        // Finished: the whole gesture at full width, with its scraps. No dash:
        // a dash would restart on every scrap's subpath.
        set(path, 'd', dDone[j]);
        set(path, 'pathLength', null);
        set(path, 'stroke-dasharray', null);
        set(path, 'display', 'inline');
        return;
      }
      set(path, 'd', dLive[j]);
      set(path, 'pathLength', String(g.L));
      if (t <= g.t0) {
        set(path, 'display', 'none');
        return;
      }

      const S = g.S;
      const n = S.length;
      let tipK = n - 1;
      let tipS = g.L;
      let tip: [number, number, number, boolean] | null = null;
      if (t < g.t1) {
        let lo = 0;
        let hi = n - 1;
        while (hi - lo > 1) {
          const m = (lo + hi) >> 1;
          if (g.t[m] <= t) lo = m;
          else hi = m;
        }
        const u = (t - g.t[lo]) / Math.max(1e-6, g.t[hi] - g.t[lo]);
        tipK = lo;
        tipS = S[lo][2] + (S[hi][2] - S[lo][2]) * u;
        tip = [
          g.P[lo][0] + (g.P[hi][0] - g.P[lo][0]) * u,
          g.P[lo][1] + (g.P[hi][1] - g.P[lo][1]) * u,
          g.p[lo] + (g.p[hi] - g.p[lo]) * u,
          g.forced[hi],
        ];
      }

      // The settled prefix: everything already swollen to full width.
      let kSet = -1;
      while (
        kSet + 1 <= tipK &&
        (tipS - S[kSet + 1][2] >= s.swellDist || t - g.t[kSet + 1] >= s.swellTime)
      ) {
        kSet++;
      }
      const sSet = kSet >= 0 ? S[kSet][2] : 0;
      if (sSet > 0) {
        set(path, 'stroke-dasharray', `${f1(sSet)} ${f1(g.L + s.W)}`);
        set(path, 'display', 'inline');
      } else {
        // A zero-length dash with a round cap would print a dot.
        set(path, 'display', 'none');
      }

      // The live part, from the settled prefix to the nib.
      for (let k = kSet + 1; k <= tipK; k += stride) {
        disc(g.P[k][0], g.P[k][1], (widthAt(s, g.p[k], tipS - S[k][2], t - g.t[k], g.forced[k]) * s.W) / 2);
      }
      if (tipK > kSet && (tipK - kSet - 1) % stride !== 0) {
        disc(g.P[tipK][0], g.P[tipK][1], (widthAt(s, g.p[tipK], tipS - S[tipK][2], t - g.t[tipK], g.forced[tipK]) * s.W) / 2);
      }
      if (tip) disc(tip[0], tip[1], (widthAt(s, tip[2], 0, 0, tip[3]) * s.W) / 2);
      for (const r of g.residue) {
        if (r.t > t) continue;
        const w = (widthAt(s, r.p, tipS - r.arc, t - r.t, false) * s.W) / 2;
        for (const [x, y] of r.pts) disc(x, y, w);
      }
    });

    set(core!, 'd', discs.join(' '));
  };

  const play = () => {
    cancelAnimationFrame(raf);
    finished = false;
    t0 = -1;
    const frame = (now: number) => {
      if (finished) return;
      // The clock starts on the first frame the page actually shows.
      if (t0 < 0) t0 = now;
      try {
        render(now - t0);
      } catch {
        enterFinal();
        return;
      }
      if (!finished) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };

  // Reduced motion switched on at any point from here gets the finished signature, for good.
  reduce.addEventListener?.('change', () => {
    if (reduce.matches && !debug) enterFinal();
  });

  try {
    // Build the schedule while the page is idle, so the first frame is cheap.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => {
      try {
        prepare();
      } catch {
        enterFinal();
      }
    }, { timeout: 1000 });

    const go = () => {
      if (over || (reduce.matches && !debug)) {
        enterFinal();
        return;
      }
      try {
        prepare();
        play();
      } catch {
        enterFinal();
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (over) return;
        // One target, so the newest entry is the current state. A batched
        // callback can carry stale ones ahead of it.
        const entry = entries[entries.length - 1];
        // In view: most of it, or, on a viewport too short to ever show 60%
        // of it, half the viewport's height.
        const room = entry.rootBounds?.height ?? window.innerHeight;
        const inView = entry.intersectionRatio >= IN_VIEW || entry.intersectionRect.height >= 0.5 * room;
        if (inView) {
          if (beat) return;
          beat = window.setTimeout(() => {
            observer.disconnect();
            if (manual) return;
            if (document.hidden) {
              document.addEventListener('visibilitychange', function once() {
                if (document.hidden) return;
                document.removeEventListener('visibilitychange', once);
                go();
              });
            } else go();
          }, BEAT);
        } else if (beat) {
          clearTimeout(beat);
          beat = 0;
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, IN_VIEW] },
    );
    io = observer;
    observer.observe(svg);

    // A return from the back/forward cache comes back with the signature still
    // waiting to be written, if it never was. It is a return visit: show it.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && t0 < 0 && !debug) enterFinal();
    });

    // ?sig-debug: drive it by hand. Seeking takes over for good: the scroll
    // trigger is cancelled, so it cannot start a play underneath the seeks.
    if (debug) {
      const takeOver = () => {
        manual = true;
        observer.disconnect();
        clearTimeout(beat);
        cancelAnimationFrame(raf);
      };
      window.__sig = {
        seek: (ms: number) => {
          takeOver();
          finished = false;
          render(ms);
        },
        play: () => {
          takeOver();
          play();
        },
        duration: prepare().duration,
      };
    }
  } catch {
    enterFinal();
  }
}

start();
