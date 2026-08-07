/**
 * Design tokens.
 *
 * The handoff's palette was rust (#C62C05) and lavender (#DFCBFA) with a vivid
 * accent set. This is the editorial rebuild of it: warm neutrals, one light
 * unpainted-wood tone as the only color that carries meaning, and near-black
 * type. Every structural decision the handoff made survives — the inversion on
 * hover, the light-band-with-near-black-ink contract, the timings. Only the
 * hues moved.
 *
 * THE NAMES ARE THE JOBS, and that is the point of the rename. `rust` was
 * doing two of them: it was the ink on light grounds AND the accent on marks,
 * rails and frames. Those pull apart in an editorial scheme, so they are now
 * `ink` and `wood` and every call site had to say which it meant.
 *
 * The pairs, and nothing may break them:
 *   ink on paper          the light screens
 *   paper on ink          the dark screens (subpages, plaques)
 *   nearBlack on LIGHTS   any hover band, any glitch band
 */

export const COLOR = {
  /** The ground on light screens, and the type on dark ones. */
  paper: '#EFEBE3',
  /** One step down from paper: panels and insets that need to sit back. */
  paperDim: '#E3DCCF',
  /** The type on light screens, and the ground on dark ones. */
  ink: '#1B1A17',
  /** Secondary type. Meets 4.5:1 on paper. */
  inkSoft: '#5C564B',
  /**
   * Light unpainted wood — the one color in the system that carries meaning.
   * Corner marks, scroll rails, the page 02 frame, hairline accents. Never
   * type: it is 3.0:1 on paper and fails as a reading color on purpose, so
   * nothing important can drift into it.
   */
  wood: '#C0A47E',
  /** The stronger wood, for pins, ticks and edge accents. */
  woodDeep: '#8A7049',
  /** The pale wood, for bands and fills. */
  woodPale: '#DECFB6',
  /** Warm near-black. The only ink allowed on a band. */
  nearBlack: '#121110',
  /** The caption plaque and the dark screens' ground. */
  plaque: '#1B1A17',
  /** Deep warm shadow, for the low-alpha tints that sit under things. */
  shadow: '#2A241B',
} as const;

/**
 * Accent ramp — hover bands, dither flashes, channel dots.
 *
 * Deliberately a single warm ramp rather than a set of hues. `LIGHTS` takes
 * the top of it and those carry type; the darker end are edge accents that
 * never do. The handoff's version was seven unrelated vivid colors, which is
 * the one thing about it that could not survive the word "editorial".
 */
export const MARA = [
  '#E7E0D2',
  '#D3C3A6',
  '#C0A47E',
  '#8A7049',
  '#5C564B',
  '#A79B88',
  '#3E3A33',
] as const;

/** Extended set, used for the menu's channel dots. */
export const VIVID = [
  '#E7E0D2',
  '#D3C3A6',
  '#C0A47E',
  '#A79B88',
  '#8A7049',
  '#5C564B',
  '#DECFB6',
  '#3E3A33',
] as const;

/** Colors used by the per-letter intro flash. */
export const FLASH = ['#8A7049', '#C0A47E', '#3E3A33', '#D3C3A6', '#5C564B', '#A79B88'] as const;

export const relLuminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/**
 * The legibility contract: type only ever sits on a band drawn from LIGHTS,
 * and the ink on such a band is always near-black. Darker MARA accents are
 * edge accents only. #121110 on the darkest LIGHTS member (#C0A47E) measures
 * 7.9:1, so every band in the set clears 4.5:1 with room.
 */
export const LIGHTS: readonly string[] = MARA.filter((c) => relLuminance(c) >= 0.5);

export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/**
 * Rules and hairlines.
 *
 * `onInk*` are rules drawn on the dark screens, so they are paper at low
 * alpha. `onPaper*` are rules on the light screens, and they are INK rather
 * than wood: a hairline's job is to divide, and wood at hairline weight
 * disappears into the ground. Wood is for marks you are meant to notice.
 */
export const RULE = {
  onInkMajor: 'rgba(239,235,227,.30)',
  onInkMinor: 'rgba(239,235,227,.19)',
  onInkRow: 'rgba(239,235,227,.16)',
  onPaperMajor: 'rgba(27,26,23,.26)',
  onPaperMinor: 'rgba(27,26,23,.15)',
  gridLine: 'rgba(27,26,23,.10)',
} as const;

/** Transition timing. Total menu → page to interactive: 2260ms. */
export const TIMING = {
  /** grow */
  G: 580,
  /** hold */
  HL: 1000,
  /** settle */
  S: 680,
  /** body fade out on close */
  OUT: 240,
  /** close lag */
  LAG: 190,
  /** close shrink */
  SH: 700,
  /** interaction lock after intro */
  INTRO_LOCK: 2300,
  easeOpen: 'cubic-bezier(.22,0,0,1)',
  easeClose: 'cubic-bezier(.3,0,0,1)',
} as const;

export const FONT = {
  display: "Monaco, 'SFMono-Regular', Menlo, ui-monospace, monospace",
  /** always with font-feature-settings: 'salt' 1, 'ss01' 1 */
  alt: "'Dessign Maison', Monaco, ui-monospace, monospace",
  altFeatures: "'salt' 1, 'ss01' 1",
} as const;

/**
 * Monaco is MONOSPACE, and that makes every display width exact arithmetic
 * rather than something to measure. One advance is 0.6em, verified in the
 * browser at 100px with no tracking: ten characters draw 600.1px.
 *
 * A title's width is therefore `chars × size × (0.6 + trackEm)`, where trackEm
 * is negative. Checked against the browser at every display size on the site;
 * "lee" at 152px and -.05em predicts 250.8 and measures 250.9.
 *
 * This is why the display sizes below are derived rather than chosen: with a
 * proportional face they had to be measured and tuned per string, and with a
 * monospace they can simply be solved.
 */
export const MONO_ADVANCE = 0.6;

/** Width of `chars` characters at `size` px with `trackEm` letter-spacing. */
export const monoWidth = (chars: number, size: number, trackEm: number): number =>
  chars * size * (MONO_ADVANCE + trackEm);

/**
 * The largest whole-pixel size at which `chars` characters fit `avail` px.
 * Capped at `max` so a short title does not balloon past its family.
 */
export const monoFit = (chars: number, avail: number, trackEm: number, max: number): number =>
  Math.min(max, Math.floor(avail / (chars * (MONO_ADVANCE + trackEm))));
