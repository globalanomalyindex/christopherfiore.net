/**
 * Design tokens.
 *
 * The handoff's palette was rust (#C62C05) and lavender (#DFCBFA). The first
 * rebuild took it to warm editorial neutrals. This is the second: laundered
 * cotton, a blue-gray white washed two hundred times, with the drape shadow
 * as the only color that carries meaning.
 *
 * The dark is where the scheme earns its keep. #28262E leans bruise-violet
 * rather than neutral, so it registers as "not quite black" the same way the
 * sheet registers as "not quite white". Cool on the outside, warm underneath.
 * Nobody clocks why it feels alive; they just feel it. A neutral grey of the
 * same value measures identically and reads dead, so this is not a value
 * choice and cannot be substituted on contrast grounds.
 *
 * THE NAMES ARE THE JOBS. `rust` once did two of them, ink and accent, and
 * splitting it is why the recolors since have been mechanical. `wood` became
 * `drape` here for the same reason: a token named for a material it no longer
 * is, is a bug waiting to be written.
 *
 * The pairs, and nothing may break them:
 *   ink on paper          the light screens          12.7:1
 *   paper on ink          the dark screens           12.7:1
 *   nearBlack on LIGHTS   any hover band, any glitch band
 */

export const COLOR = {
  /**
   * The ground on light screens, and the type on dark ones.
   *
   * Laundered cotton: white washed toward blue-gray two hundred times. It is
   * not a warm paper and it is not a pure white, and the whole scheme depends
   * on it never being mistaken for either.
   */
  paper: '#E9EDEE',
  /** One step down from paper: panels and insets that need to sit back. */
  paperDim: '#DCE1E3',
  /**
   * The type on light screens, and the ground on dark ones.
   *
   * The dark leans bruise-violet rather than neutral. That is the one
   * unorthodox pick in the scheme and it is doing the same work at the dark
   * end that the paper does at the light end: registering as "not quite
   * black" the way the sheet registers as "not quite white". Cool outside,
   * warm inside. Do not neutralize it — a neutral #262626 here measures the
   * same contrast and kills the whole effect.
   */
  ink: '#28262E',
  /** Secondary type. 6.4:1 on paper. */
  inkSoft: '#56535E',
  /**
   * The drape shadow — the one color in the system that carries meaning.
   * Corner marks, scroll rails, the page 02 frame, hairline accents. Never
   * type: it is 1.8:1 on paper and fails as a reading color on purpose, so
   * nothing important can drift into it.
   */
  drape: '#AEB6BA',
  /** The stronger drape, for pins, ticks and edge accents. */
  drapeDeep: '#7C858A',
  /** The pale drape, for bands and fills. */
  drapePale: '#CBD2D5',
  /** The deepest violet-black. The only ink allowed on a band. */
  nearBlack: '#1A1820',
  /** The caption plaque and the dark screens' ground. */
  plaque: '#28262E',
  /** Deep cool shadow, for the low-alpha tints that sit under things. */
  shadow: '#302D38',
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
  '#E2E7E9',
  '#CBD2D5',
  '#AEB6BA',
  '#7C858A',
  '#56535E',
  '#9AA1A5',
  '#3A3742',
] as const;

/** Extended set, used for the menu's channel dots. */
export const VIVID = [
  '#E2E7E9',
  '#CBD2D5',
  '#AEB6BA',
  '#9AA1A5',
  '#7C858A',
  '#56535E',
  '#DCE1E3',
  '#3A3742',
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
 * that clears 4.5:1 against the near-black ink. Eleven of the fourteen do,
 * five neutral and six vivid, and the three that do not (#56535E at 2.3,
 * #3A3742 at 1.5, #2B45F5 at 2.9) stay available as edge accents.
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
 * The set this replaced was four-sevenths illegible. #AEB6BA measured 2.0:1
 * on paper and #CBD2D5 measured 1.4, so half of every flash was invisible and
 * the letters looked like they were dropping out rather than firing.
 */
export const FLASH: readonly string[] = [
  ...HUES.map((c) => darkenTo(c, COLOR.paper, AA)),
  '#56535E',
  '#3A3742',
];

/**
 * The legibility contract: type only ever sits on a band drawn from LIGHTS (or
 * SPARK_LIGHTS), and the ink on such a band is always near-black. Darker MARA
 * accents are edge accents only. #1A1820 on the darkest LIGHTS member
 * (#7C858A) measures 4.7:1, so every band in the set clears 4.5:1.
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
  onInkMajor: 'rgba(233,237,238,.30)',
  onInkMinor: 'rgba(233,237,238,.19)',
  onInkRow: 'rgba(233,237,238,.16)',
  onPaperMajor: 'rgba(40,38,46,.26)',
  onPaperMinor: 'rgba(40,38,46,.15)',
  gridLine: 'rgba(40,38,46,.10)',
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

/**
 * One typeface, two faces of it.
 *
 * Dessign Maison now sets everything: display, micro, prose. The glitch that
 * used to swap Monaco for Dessign Maison swaps Dessign Maison's DEFAULT glyphs
 * for its ALTERNATES, and that is a bigger change than the old one was, not a
 * smaller one. The default face is a geometric grotesque; under `salt` and
 * `ss01` the same string becomes a high-contrast swash italic. Measured, the
 * alternates run 0.845× to 0.99× the width of the defaults.
 *
 * That width relationship is worth stating on its own, because it is a
 * guarantee the old arrangement could not make: THE ALTERNATE IS ALWAYS
 * NARROWER. A line that fits at rest cannot overflow when it glitches, so
 * fitting the resting state fits both states, and no swap can push a title off
 * its margin.
 *
 * `displayFeatures` is explicit rather than omitted. Feature settings inherit,
 * and a display line inside anything that turned the alternates on would come
 * up already swapped, so the resting state has to say it is resting.
 */
export const FONT = {
  display: "'Dessign Maison', Helvetica, Arial, sans-serif",
  /** The resting face states its own plainness; see above. */
  displayFeatures: 'normal',
  /** always with font-feature-settings: 'salt' 1, 'ss01' 1 */
  alt: "'Dessign Maison', Helvetica, Arial, sans-serif",
  altFeatures: "'salt' 1, 'ss01' 1",
} as const;

/**
 * A subpage title's size and line-height.
 *
 * This used to SOLVE the size from a character count, which a monospace face
 * makes possible and exact: one advance was 0.6em, so a width was
 * `chars × size × (0.6 + trackEm)` and no browser had to be asked.
 *
 * Dessign Maison is proportional, so a character count predicts nothing. The
 * same count of characters spans a 32% range of widths depending on which
 * characters they are. Solving here would be guessing.
 *
 * So the title is authored at its family size and `runtime/fit.ts` measures
 * the rendered ink after the faces load and moves the size only if the line
 * does not fit its band. That is a real measurement instead of a model, it
 * covers growing as well as shrinking, and a new case with a long name still
 * re-solves itself without a number being tuned by hand.
 *
 * Kept as a function rather than inlined so there is still one named place
 * that says "this is how a subpage title gets its size", and one place to
 * change if the family ever gains a second display size.
 */
export const subpageTitle = (cfg: { size: number; lh: number; track: string }): {
  size: number;
  lh: number;
} => ({ size: cfg.size, lh: cfg.lh });
