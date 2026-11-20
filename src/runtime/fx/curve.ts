/**
 * The curves the lineage effects share: a cubic-bezier, as CSS evaluates it,
 * and a clamp. A ported effect passes its own project's control points, so
 * After Tokens moves on After Tokens' curves and nothing here is a house
 * curve of its own.
 */

export const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress, 0 to 1. */
export const bez = (x1: number, y1: number, x2: number, y2: number) => (x: number): number => {
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

/** Linear interpolation. */
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
