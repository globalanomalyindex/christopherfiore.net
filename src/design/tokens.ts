/**
 * Design tokens — every value taken from the perfection synthétique handoff.
 * These are final. If a color, size or easing disagrees with the handoff
 * README, the README wins.
 */

export const COLOR = {
  rust: '#C62C05',
  lavender: '#DFCBFA',
  nearBlack: '#0B0B0C',
  plaque: '#150B20',
  deepRust: '#4A1305',
  shadowRust: '#2B0B03',
  brightRust: '#E33A08',
} as const;

/** Accent palette — hover bands, dither flashes, painting chips. */
export const MARA = [
  '#C9F227',
  '#12D9E8',
  '#FF2D87',
  '#2B45F5',
  '#FF6B1A',
  '#35E5C8',
  '#F5D90A',
] as const;

/** Extended vivid set used for painting chips. */
export const VIVID = [
  '#F5D90A',
  '#12D9E8',
  '#FF2D87',
  '#7CF03C',
  '#FF6B1A',
  '#2B45F5',
  '#00E5A0',
  '#FF3B3B',
] as const;

/** Colours used by the per-letter intro flash. */
export const FLASH = ['#4A1305', '#FF2D87', '#12D9E8', '#C9F227', '#E33A08', '#2B45F5'] as const;

export const relLuminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/**
 * The legibility contract: type only ever sits on a band drawn from LIGHTS,
 * and the ink on such a band is always near-black. Darker MARA accents are
 * edge accents only. Hover-band ink #0B0B0C on any LIGHTS color clears 4.5:1.
 */
export const LIGHTS: readonly string[] = MARA.filter((c) => relLuminance(c) >= 0.5);

export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Rules and hairlines. */
export const RULE = {
  onRustMajor: 'rgba(223,203,250,.34)',
  onRustMinor: 'rgba(223,203,250,.22)',
  onRustRow: 'rgba(223,203,250,.2)',
  onLavenderMajor: 'rgba(198,44,5,.42)',
  onLavenderMinor: 'rgba(198,44,5,.24)',
  gridLine: 'rgba(255,255,255,.62)',
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
  display: 'Karrik, Helvetica, Arial, sans-serif',
  /** always with font-feature-settings: 'salt' 1, 'ss01' 1 */
  alt: '"Dessign Maison", Karrik, Helvetica, sans-serif',
  altFeatures: "'salt' 1, 'ss01' 1",
} as const;
