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
 * Accent ramp — the page chrome's bands and rules.
 *
 * Deliberately a single warm ramp rather than a set of hues. `LIGHTS` takes
 * the top of it and those carry type; the darker end are edge accents that
 * never do. This is the *editorial* set: the section bands on the subpages,
 * the mobile CTA plate, anything that sits still on a page and is read.
 *
 * The vivid colors live in `SPARK` below and are for the glitch, which moves.
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

/* ------------------------------------------------------------- contrast */

/**
 * WCAG relative luminance.
 *
 * The channels have to be LINEARIZED first. This used to average the
 * gamma-encoded bytes straight, which is not luminance and is not what the
 * 4.5:1 threshold is defined against. It agreed with the real formula on the
 * neutral ramp by luck, because a ramp of one hue orders the same either way;
 * it does not agree once there is more than one hue in the set. Under the old
 * arithmetic #FF2D87 scores 0.377 and is rejected as too dark to carry ink,
 * when it actually measures 5.4:1 against near-black and carries it fine.
 */
export const relLuminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const lin = (b: number): number => {
    const s = b / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

/** WCAG contrast ratio between two opaque hex colors. 1 = identical, 21 = max. */
export const contrast = (a: string, b: string): number => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** The threshold everything on this site is held to. */
export const AA = 4.5;

/**
 * Scale a color toward black until it clears `ratio` against `ground`.
 *
 * Returns it unchanged when it already clears. Used to build the flash set:
 * the vivid hues are far too light to be *type* on paper, and the fix is to
 * take the hue down rather than to drop the hue.
 */
const darkenTo = (hex: string, ground: string, ratio: number): string => {
  if (contrast(hex, ground) >= ratio) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const at = (f: number): string =>
    `#${[r, g, b].map((c) => Math.round(c * f).toString(16).padStart(2, '0')).join('')}`;
  // Contrast against a light ground is monotone in the scale factor, so bisect.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(at(mid), ground) >= ratio) lo = mid;
    else hi = mid;
  }
  return at(lo);
};

/* --------------------------------------------------------------- glitch */

/**
 * The vivid hues from the handoff. They are back, and they are back on terms:
 * a hue appears at full strength where it is a BAND under near-black ink, and
 * darkened where it is TYPE on paper. Same seven hues in both roles.
 *
 * This is the whole answer to "vivid, but always legible". Nothing here is
 * hand-picked for contrast; both derived sets below are filtered or solved, so
 * a hue that cannot clear 4.5:1 in a role never reaches that role.
 */
/*
  Ordered warm first, and the order is load-bearing in one place: the paint
  simulation's palette dabs take the first few, and on the handoff's original
  order those were the cyan and the blue, which pulled the whole field cold
  against a warm site. Everything else that reads this picks at random.
*/
const HUES = [
  '#FF2D87',
  '#F5D90A',
  '#12D9E8',
  '#FF6B1A',
  '#C9F227',
  '#2B45F5',
  '#35E5C8',
] as const;

/**
 * The band pool for the glitch: the warm neutrals plus the vivid hues.
 *
 * `hover.ts` and `glitch.ts` draw from this. The page chrome does not — the
 * subpage section bands stay on `LIGHTS`, so the editorial screens are still
 * editorial and only the things that move are loud.
 */
export const SPARK: readonly string[] = [...MARA, ...HUES];

/**
 * Bands that may carry type, derived rather than listed: everything in SPARK
 * that clears 4.5:1 against the near-black ink. Ten of the fourteen do, four
 * neutral and six vivid, and the four that do not (#8A7049 at 4.0, #5C564B,
 * #3E3A33, #2B45F5 at 2.9) stay available as edge accents.
 */
export const SPARK_LIGHTS: readonly string[] = SPARK.filter(
  (c) => contrast(c, COLOR.nearBlack) >= AA,
);

/**
 * Colors for the per-letter flash.
 *
 * These are set as `color` on a letter sitting on the paper ground, so they
 * are the one place a vivid hue has to be dark. Each one is taken down until
 * it clears 4.5:1 on paper and no further, which lands them as deep jewel
 * versions of the same hues: an olive lime, a teal cyan, a burnt orange.
 *
 * The set this replaced was four-sevenths illegible. #C0A47E measured 2.0:1
 * on paper and #D3C3A6 measured 1.4, so half of every flash was invisible and
 * the letters looked like they were dropping out rather than firing.
 */
export const FLASH: readonly string[] = [
  ...HUES.map((c) => darkenTo(c, COLOR.paper, AA)),
  '#5C564B',
  '#3E3A33',
];

/**
 * The legibility contract: type only ever sits on a band drawn from LIGHTS (or
 * SPARK_LIGHTS), and the ink on such a band is always near-black. Darker MARA
 * accents are edge accents only. #121110 on the darkest LIGHTS member
 * (#C0A47E) measures 7.9:1, so every band in the set clears 4.5:1 with room.
 */
export const LIGHTS: readonly string[] = MARA.filter(
  (c) => contrast(c, COLOR.nearBlack) >= AA,
);

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

/**
 * A subpage title's size and line-height.
 *
 * Every subpage in the family is drawn at the same display size, and that
 * worked while the face was proportional and the longest name was 23
 * characters. Monaco is monospace and one of the names is 33, so three of them
 * ran off the right margin at the family size.
 *
 * So the size is solved rather than set: the family's own size unless the name
 * is too long for the band, and the largest whole pixel that fits when it is.
 * A new case with a long name re-solves itself and never needs a number tuned
 * by hand. `avail` is the 1920 stage less a module either side, less 24 of
 * clearance so a title never touches its margin.
 */
export const subpageTitle = (
  chars: number,
  cfg: { size: number; lh: number; track: string },
): { size: number; lh: number } => {
  const track = parseFloat(cfg.track);
  const avail = 1920 - 72.727 * 2 - 24;
  const size = monoFit(chars, avail, track, cfg.size);
  return { size, lh: Math.round(cfg.lh * (size / cfg.size)) };
};
