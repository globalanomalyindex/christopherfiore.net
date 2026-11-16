/**
 * The palette, for the server side. `site.css` holds the same ground, sheet
 * and ink as custom properties; this file holds the tally brights and mixes
 * their tints, so the markup can carry each section's hue as `--c` and its row
 * tint as `--t`.
 *
 * Tints are mixed into the cool ground, never into white, and they are mixed
 * here rather than with CSS `color-mix()`, so every browser gets the same hex.
 */

export const P = {
  ground: '#F3F5F8',
  sheet: '#FDFEFF',
  ink: '#12141B',
  mute: '#5A6170',
} as const;

export const TALLY = {
  yellow: '#F5D90A',
  cyan: '#12D9E8',
  pink: '#FFABD1',
  lime: '#C9F227',
  violet: '#D6BAFF',
  peri: '#7A9CFF',
  /** "also", "pages", "next up": the chip for housekeeping. */
  grey: '#B4BAC5',
} as const;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const mix = (a: string, b: string, k: number): string => {
  const A = rgb(a);
  const B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

/** `c` at strength `k` over the ground. Ladder cells are 0.4, 0.7 and 1; row tints are 0.16. */
export const tint = (c: string, k: number): string => mix(P.ground, c, k);

/** The row tint: ink on it is 14.8:1 or better for every tally hue. */
export const ROW_TINT = 0.16;
