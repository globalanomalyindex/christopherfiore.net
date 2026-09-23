/**
 * The signature's handwriting, as a schedule. Pure: no DOM, no clock, so it
 * can be built at idle time and checked in Node.
 *
 * The tracer (`scripts/trace-signature.py`) gives 47 pen paths: centerlines of
 * the ink, in rough writing order. This module turns them into what a hand
 * does. It groups them into gestures (pen down to pen up), fixes the few the
 * tracer got backwards, and decides when every point along every gesture is
 * reached and how wide the nib is there.
 *
 * NOTHING HERE DRAWS INK THAT ISN'T IN THE SIGNATURE. The runtime clips
 * everything to the traced outline, so a pen path only ever uncovers real ink;
 * this file only decides the order, the timing and the reveal width.
 *
 * The motion model, from the design panel that chose it (flow, with grafts):
 *
 *   speed    a power-law slowdown through tight curves, an acceleration
 *            off the page, and a flick into each stroke's end
 *   lifts    Fitts's law: a pen hop costs 1.5 + 5.6·log2(1 + D/22.4) ms, plus
 *            a breath before each word and before the eyes
 *   nib      narrow at touchdown, full width just behind the tip: the band
 *            swells to full weight over 120 units or 120 ms, whichever first
 *   merged   anywhere near ink already written, the nib is full width at once,
 *            or the outline's own contours would show as notches
 *   total    solved so the whole name takes exactly 1650 ms
 */

export interface SignatureData {
  maskWidth: number;
  penRadius: number;
  strokes: { d: string; length: number }[];
}

/** A resampled point: x, y, and arc length from the gesture's start. */
type Sample = [number, number, number];

export interface Residue {
  /** The scrap's samples, drawn as discs with the host's swell. */
  pts: Sample[];
  /** Where along the host it is reached, and when. */
  arc: number;
  t: number;
  /** The host's pressure where it is claimed, so a scrap swells like the pen that passes it. */
  p: number;
  /** Its path, appended to the host's dry path once the host is done. */
  d: string;
}

export interface Gesture {
  ids: string[];
  S: Sample[];
  L: number;
  /** Smoothed centerline for the nib's discs. */
  P: [number, number][];
  /** Pressure, 0..1, per sample. */
  p: number[];
  /** Full width at once: near ink that is already down. */
  forced: boolean[];
  /** Arrival time of every sample, and the gesture's span. */
  t: number[];
  t0: number;
  t1: number;
  /** When the last of its ink has swollen to full width. */
  done: number;
  residue: Residue[];
}

export interface Schedule {
  gestures: Gesture[];
  duration: number;
  /** Full band width, in viewBox units. */
  W: number;
  swellDist: number;
  swellTime: number;
  tipMin: number;
  tipGain: number;
  swellExp: number;
}

const C = {
  target: 1650,
  ds: 1.5,
  smooth: 6,
  k0: 1 / 45,
  kExp: 0.45,
  accelIn: 26,
  vIn: 0.4,
  flickLen: 38,
  flickGain: 0.85,
  pIn: 30,
  pOut: 42,
  pOutDepth: 0.7,
  tipMin: 0.08,
  tipGain: 0.26,
  swellDist: 120,
  swellTime: 120,
  swellExp: 1.15,
  minStroke: 16,
  residueLen: 16,
  residueNear: 14,
  chainGap: 9,
  P0: 1.5,
  PK: 5.6,
  Pw: 22.4,
  liftWord: 70,
  liftFlourish: 95,
  lastStretch: 1.5,
} as const;

/**
 * Writing order, one token per gesture.
 *
 *   `8r`    stroke 8, reversed: the tracer wrote the s tail-first
 *   `+15`   chained onto the previous gesture: the pen stays down
 *   `35a`   the first half of stroke 35 (see SPLIT)
 *
 * What the edits fix: the s from its top (8r), the final e from its crossbar
 * (43r), the p down from x-height beside the o instead of as a dot below the
 * baseline (16, +15), the f stem top-down (35br, +38) and its crossbar left to
 * right (35a, +36r), and the eyes before the smile, so it ends on the swoosh.
 *
 * THIS LIST IS TIED TO ONE TRACE. Re-running the tracer can renumber strokes,
 * so `buildSchedule` refuses to run against any trace but the one in TRACE,
 * and if any stroke is written twice or left out.
 */
export const ORDER = [
  '0', '1', '2', '6', '7', '8r', '9', '10', '11', '16', '+15', '20', '21', '+23', '26', // christopher
  '27', '29', '30', '32', '33', '34', // robin
  '35br', '+38', '35a', '+36r', '39', '40', '41', '42', '43r', // fiore
  '45', '46', '44', // the eyes, then the smile last
] as const;

/** The trace ORDER was written for: its stroke count and total pen length. */
const TRACE = { strokes: 47, length: 4385 } as const;

/** An extra breath (ms) before these tokens: each word, and the eyes. */
const BREATH: Record<string, number> = { '27': C.liftWord, '35br': C.liftWord, '45': C.liftFlourish };

/** Stroke 35 is split at its vertex nearest stroke 38's first point: the f's crossbar meets its stem there. */
const SPLIT: Record<string, string> = { '35': '38' };

type Pt = [number, number];

const hyp = (a: Pt | Sample, b: Pt | Sample) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const parse = (d: string): Pt[] => {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const out: Pt[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
};

const arcLength = (P: Pt[]) => P.slice(1).reduce((a, p, k) => a + hyp(P[k], p), 0);

/** smoothstep */
const ss = (a: number, b: number, x: number) => {
  if (b <= a) return x >= b ? 1 : 0;
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

function resample(pts: Pt[], ds: number): Sample[] {
  if (pts.length === 1) return [[pts[0][0], pts[0][1], 0]];
  const out: Sample[] = [[pts[0][0], pts[0][1], 0]];
  let acc = 0;
  let next = ds;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    while (seg > 0 && next <= acc + seg) {
      const u = (next - acc) / seg;
      out.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, next]);
      next += ds;
    }
    acc += seg;
  }
  if (acc - out[out.length - 1][2] > 1e-6) {
    const last = pts[pts.length - 1];
    out.push([last[0], last[1], acc]);
  }
  return out;
}

function gauss(arr: number[], sigma: number): number[] {
  const r = Math.ceil(sigma * 2.5);
  const n = arr.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let w = 0;
    for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) {
      const k = Math.exp(-((j - i) ** 2) / (2 * sigma * sigma));
      s += arr[j] * k;
      w += k;
    }
    out[i] = s / w;
  }
  return out;
}

function nearestArc(p: Pt, S: Sample[]): [number, number] {
  let bd = Infinity;
  let bs = 0;
  for (const [x, y, s] of S) {
    const d = (x - p[0]) ** 2 + (y - p[1]) ** 2;
    if (d < bd) {
      bd = d;
      bs = s;
    }
  }
  return [Math.sqrt(bd), bs];
}

/** Time at which gesture `g` reaches arc length `d`. */
function timeAt(g: Gesture, d: number): number {
  const S = g.S;
  let lo = 0;
  let hi = S.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (S[m][2] <= d) lo = m;
    else hi = m;
  }
  const span = S[hi][2] - S[lo][2];
  const u = span > 0 ? Math.min(1, Math.max(0, (d - S[lo][2]) / span)) : 0;
  return g.t[lo] + (g.t[hi] - g.t[lo]) * u;
}

export function buildSchedule(data: SignatureData): Schedule {
  const W = data.maskWidth + 2;
  const RP = data.penRadius;

  // ORDER names strokes by index, so it only means anything against the trace
  // it was written for. A re-trace fails here until ORDER is reviewed.
  const traced = { strokes: data.strokes.length, length: Math.round(data.strokes.reduce((a, s) => a + s.length, 0)) };
  if (traced.strokes !== TRACE.strokes || Math.abs(traced.length - TRACE.length) > 2) {
    throw new Error(
      `signature: the trace changed (${traced.strokes} strokes, ${traced.length} long; ORDER was written for ${TRACE.strokes}, ${TRACE.length}). Review ORDER, then update TRACE.`,
    );
  }

  /* ---- strokes, scraps, and the split */
  const strokes = data.strokes.map((s, i) => {
    const pts = parse(s.d);
    return { id: String(i), pts, L: arcLength(pts), d: s.d };
  });
  const byId: Record<string, { id: string; pts: Pt[] }> = Object.fromEntries(strokes.map((s) => [s.id, s]));
  for (const [a, b] of Object.entries(SPLIT)) {
    const s = byId[a];
    const joint = byId[b].pts[0];
    let kb = 0;
    let bd = Infinity;
    s.pts.forEach((p, k) => {
      const d = hyp(p, joint);
      if (d < bd) {
        bd = d;
        kb = k;
      }
    });
    byId[`${a}a`] = { id: `${a}a`, pts: s.pts.slice(0, kb + 1) };
    byId[`${a}b`] = { id: `${a}b`, pts: s.pts.slice(kb) };
  }

  /* ---- gestures, in writing order */
  const gestures: (Gesture & { pts: Pt[]; air: number; extra: number; u: number[]; U: number })[] = [];
  const used = new Set<string>();
  const seen = new Set<string>();
  for (const tok of ORDER) {
    const chained = tok.startsWith('+');
    let id: string = tok.replace('+', '');
    const reversed = id.endsWith('r');
    if (reversed) id = id.slice(0, -1);
    const src = byId[id];
    if (!src) throw new Error(`signature: ORDER names stroke ${id}, which the trace does not have`);
    if (seen.has(id)) throw new Error(`signature: ORDER writes stroke ${id} twice`);
    seen.add(id);
    used.add(id.replace(/[ab]$/, ''));
    const pts = src.pts.slice();
    if (reversed) pts.reverse();
    const g = gestures[gestures.length - 1];
    const jump = g ? hyp(g.pts[g.pts.length - 1], pts[0]) : 0;
    if (g && (chained || jump <= C.chainGap)) {
      g.pts.push(...pts);
      g.ids.push(id);
    } else {
      gestures.push({
        ids: [id],
        pts,
        air: jump,
        extra: BREATH[tok] ?? 0,
        residue: [],
        S: [],
        L: 0,
        P: [],
        p: [],
        forced: [],
        t: [],
        t0: 0,
        t1: 0,
        done: 0,
        u: [],
        U: 0,
      });
    }
  }
  for (const g of gestures) {
    g.S = resample(g.pts, C.ds);
    g.L = g.S[g.S.length - 1][2];
  }

  /*
    Scraps: bits a skeleton leaves at junctions, shorter than 16 units and
    within 14 of a real stroke. They are not pen strokes and get no time of
    their own. A gesture's END within reach claims one first (so the p's
    junction goes with the stroke that ends there), else the nearest path.
  */
  // A short stroke that ORDER already writes (an i's dot, an eye) is a
  // gesture, not a scrap: every stroke is used exactly once.
  const inOrder = new Set(used);
  const isScrap = (s: (typeof strokes)[number]) => s.L < C.residueLen && !inOrder.has(s.id);
  for (const s of strokes) {
    if (!isScrap(s)) continue;
    type Claim = { g: (typeof gestures)[number]; arc: number; d: number };
    let byEnd: Claim | null = null;
    let byPath: Claim | null = null;
    for (const g of gestures) {
      const ends: [Sample, number][] = [
        [g.S[0], 0],
        [g.S[g.S.length - 1], g.L],
      ];
      for (const p of s.pts) {
        for (const [e, arc] of ends) {
          const d = hyp(p, e);
          if (d <= C.residueNear && (!byEnd || d < byEnd.d)) byEnd = { g, arc, d };
        }
        const [d, arc] = nearestArc(p, g.S);
        if (d <= C.residueNear && (!byPath || d < byPath.d)) byPath = { g, arc, d };
      }
    }
    const host = byEnd ?? byPath;
    if (!host) continue;
    used.add(s.id);
    host.g.residue.push({ pts: resample(s.pts, C.ds), arc: host.arc, t: 0, p: 1, d: s.d });
  }
  for (const a of Object.keys(SPLIT)) {
    if (seen.has(a) || !seen.has(`${a}a`) || !seen.has(`${a}b`)) {
      throw new Error(`signature: stroke ${a} is split, so ORDER must write ${a}a and ${a}b and not ${a}`);
    }
  }
  const missing = strokes.filter((s) => !used.has(s.id)).map((s) => s.id);
  if (missing.length) {
    throw new Error(`signature: strokes ${missing.join(', ')} are in the trace but in neither ORDER nor the scraps`);
  }

  /* ---- dynamics per gesture: speed, pressure, and the nib's smoothed path */
  for (const g of gestures) {
    const S = g.S;
    const n = S.length;
    const L = g.L;
    const sg = C.smooth / C.ds;
    const xs = gauss(S.map((q) => q[0]), sg);
    const ys = gauss(S.map((q) => q[1]), sg);
    const th: number[] = [];
    const dn: number[] = [];
    for (let k = 0; k < n; k++) {
      const a = Math.max(0, k - 1);
      const b = Math.min(n - 1, k + 1);
      const dx = xs[b] - xs[a];
      const dy = ys[b] - ys[a];
      const len = Math.hypot(dx, dy);
      th.push(Math.atan2(dy, dx));
      dn.push(len > 1e-6 ? Math.max(0, dy / len) : 0);
    }
    let kap = th.map((_, k) => {
      if (k === 0 || k === n - 1) return 0;
      let d = th[k + 1] - th[k - 1];
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return Math.abs(d) / Math.max(1e-6, S[k + 1][2] - S[k - 1][2]);
    });
    if (n > 2) {
      kap[0] = kap[1];
      kap[n - 1] = kap[n - 2];
    }
    kap = gauss(kap, 3 / C.ds);
    const down = gauss(dn, 8 / C.ds);
    const accel = Math.min(C.accelIn, 0.3 * L);
    const flick = Math.min(C.flickLen, 0.35 * L);
    const pin = Math.min(C.pIn, 0.35 * L);
    const pout = Math.min(C.pOut, 0.4 * L);
    const vel = S.map(
      ([, , d], k) =>
        Math.pow(1 + (kap[k] / C.k0) ** 2, -C.kExp / 2) *
        (C.vIn + (1 - C.vIn) * ss(0, accel, d)) *
        (1 + C.flickGain * ss(L - flick, L, d)),
    );
    g.p = S.map(
      ([, , d], k) => (0.25 + 0.75 * ss(0, pin, d)) * (1 - C.pOutDepth * ss(L - pout, L, d)) * (0.78 + 0.22 * down[k]),
    );
    // The nib's discs follow a lightly smoothed path; the raw one steps in pixels.
    const sm = 2 / C.ds;
    const px = gauss(S.map((q) => q[0]), sm);
    const py = gauss(S.map((q) => q[1]), sm);
    px[0] = S[0][0];
    py[0] = S[0][1];
    px[n - 1] = S[n - 1][0];
    py[n - 1] = S[n - 1][1];
    g.P = S.map((_, k) => [px[k], py[k]]);
    g.u = [0];
    for (let k = 1; k < n; k++) g.u.push(g.u[k - 1] + ((S[k][2] - S[k - 1][2]) * 2) / (vel[k] + vel[k - 1]));
    g.U = g.u[n - 1];
  }

  /*
    Full width at once wherever ink is already down within two pen radii: any
    earlier gesture (found through a uniform grid of cell R, not every pair),
    or this gesture more than 2W of arc back, which is a loop closing on itself.
  */
  const R = 2 * RP;
  const grid = new Map<string, Pt[]>();
  for (const g of gestures) {
    const S = g.S;
    g.forced = S.map(([x, y, s], k) => {
      const cx = Math.floor(x / R);
      const cy = Math.floor(y / R);
      for (let ix = cx - 1; ix <= cx + 1; ix++) {
        for (let iy = cy - 1; iy <= cy + 1; iy++) {
          for (const [qx, qy] of grid.get(`${ix},${iy}`) ?? []) {
            if ((qx - x) ** 2 + (qy - y) ** 2 < R * R) return true;
          }
        }
      }
      for (let m = 0; m < k && S[m][2] <= s - 2 * W; m++) {
        if ((S[m][0] - x) ** 2 + (S[m][1] - y) ** 2 < R * R) return true;
      }
      return false;
    });
    for (const [x, y] of S) {
      const cell = `${Math.floor(x / R)},${Math.floor(y / R)}`;
      const list = grid.get(cell);
      if (list) list.push([x, y]);
      else grid.set(cell, [[x, y]]);
    }
  }

  /* ---- the timeline, solved to the target */
  const last = gestures.length - 1;
  const lifts = gestures.map((g, j) => (j === 0 ? 0 : C.P0 + C.PK * Math.log2(1 + g.air / C.Pw) + g.extra));
  const liftSum = lifts.reduce((a, b) => a + b, 0);
  const inkTime = C.target - liftSum - C.swellTime;
  const drawAt = (V: number) =>
    gestures.reduce((a, g, j) => a + Math.max(C.minStroke, g.U / V) * (j === last ? C.lastStretch : 1), 0);
  let V = gestures.reduce((a, g) => a + g.U, 0) / inkTime;
  for (let it = 0; it < 40; it++) V *= drawAt(V) / inkTime;

  let clock = 0;
  gestures.forEach((g, j) => {
    clock += lifts[j];
    const dur = Math.max(C.minStroke, g.U / V) * (j === last ? C.lastStretch : 1);
    // A gesture with no length (a single-point dot) has U = 0.
    const k = g.U > 0 ? dur / g.U : 0;
    g.t0 = clock;
    g.t = g.u.map((u) => clock + u * k);
    g.t1 = clock + dur;
    g.done = g.t1 + C.swellTime;
    clock += dur;
    for (const r of g.residue) {
      r.t = timeAt(g, r.arc);
      r.p = g.p[Math.min(g.S.length - 1, Math.round(r.arc / C.ds))];
    }
  });
  if (!gestures.every((g) => g.t.every(Number.isFinite))) {
    throw new Error('signature: the timeline has a non-finite time');
  }

  return {
    gestures,
    duration: Math.ceil(Math.max(...gestures.map((g) => g.done))),
    W,
    swellDist: C.swellDist,
    swellTime: C.swellTime,
    tipMin: C.tipMin,
    tipGain: C.tipGain,
    swellExp: C.swellExp,
  };
}

/** How wide the band is at a sample, as a fraction of W. */
export function widthAt(sc: Schedule, p: number, dS: number, dt: number, forced: boolean): number {
  if (forced) return 1;
  const prog = Math.min(1, Math.max(dS / sc.swellDist, dt / sc.swellTime));
  const e = 1 - Math.pow(1 - prog, sc.swellExp);
  const a = sc.tipMin + sc.tipGain * p;
  return a + (1 - a) * e;
}
