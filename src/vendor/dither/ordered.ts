/*
 * dither's ordered (Bayer) rule, ported from globalanomalyindex/dither at
 * faf52b24391cadd7b39a657918c80558df9979eb, dither.js (sha256
 * a1a0b7b076cdfdd8f7ebb450c1abf20389e477f2ad6fd30e5d09986c70af8b58).
 *
 *   bayerMatrix, normBayer   dither.js lines 38 to 47, unchanged in logic
 *   orderedOn                the per-pixel rule of the 'ordered' algorithm,
 *                            dither.js lines 2293 to 2317, with its rotation
 *                            at 0, no noise, gamma 1 and no invert
 *
 * Only types were added. Take a fresh copy from dither rather than editing this.
 */

export function bayerMatrix(sz: number): number[][] {
  if (sz === 2) return [[0,2],[3,1]];
  const h2 = sz/2, s = bayerMatrix(h2), m = Array.from({length:sz}, ()=> new Array<number>(sz));
  for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
    const q = (y < h2 ? 0 : 2) + (x < h2 ? 0 : 1);
    m[y][x] = 4 * s[y%h2][x%h2] + [0,2,3,1][q];
  }
  return m;
}
export function normBayer(sz: number): number[][] { const m = bayerMatrix(sz), n = sz*sz; return m.map(r => r.map(v => (v+.5)/n)); }

/** One pixel of the ordered algorithm: level `v` (0 to 255) at (x, y) against matrix `b`. True is lit (255). */
export function orderedOn(v: number, b: number[][], x: number, y: number, sp: number, threshold: number): boolean {
  const sz = b.length;
  const bx=((x%sz)+sz)%sz, by=((y%sz)+sz)%sz;
  v+=(b[by][bx]-.5)*sp;
  return v>threshold;
}
