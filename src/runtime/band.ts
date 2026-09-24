/**
 * The brutalist band (README §7.1), carried over from the lattice site's
 * hover.ts: three layers of color wiped in with a stepped clip, and a 1.5px
 * inset outline.
 *
 * The host is a span INSIDE the button at z-index -1. The button's
 * `isolation: isolate` is what keeps it above the button's own background and
 * under its label.
 */

/**
 * The main band: flat, clashing brights in the spirit of Bungie's Marathon
 * (2026). The lattice site's six come first, then seventeen more that fill in
 * the wheel between them. Every one holds band ink (#1A1820) at 5:1 or better,
 * the floor the original hot pink set, so the pinned label always reads.
 */
const HUES = [
  '#FF2D87', '#F5D90A', '#12D9E8', '#FF6B1A', '#C9F227', '#35E5C8',
  // reds, oranges, ambers
  '#FF4A2E', '#FF8C1A', '#FFB800',
  // lemon, acid and neon greens, mint
  '#FFF23D', '#8CFF2E', '#3DFF6E', '#00FFA3',
  // ice, sky, periwinkle
  '#6FE3FF', '#3DB4FF', '#7A9CFF',
  // violets, magentas, pinks
  '#B580FF', '#D66BFF', '#F53DFF', '#FF5CE1', '#FF3DB8', '#FF6FA0', '#FF9EDB',
] as const;

const GRAPHITE = ['#3A3742', '#56535E', '#7C858A', '#464B52'] as const;
const ELECTRIC = ['#2B45F5', '#5B2BFF', '#0A6CFF', '#E0147A'] as const;
const GREYS = ['#E2E7E9', '#CBD2D5', '#AEB6BA', '#F2F4F3'] as const;

/**
 * The accent rows pick a family first, then a color in it. Listing a family
 * twice doubles its odds, which keeps the original mix (the top row half
 * graphite, the bottom row a third grey) however many colors each family
 * grows to.
 */
const SPARK_ACCENT = [GRAPHITE, GRAPHITE, GRAPHITE, ELECTRIC, HUES, HUES] as const;
const SPARK_LIGHTS = [GREYS, HUES, HUES] as const;
const INK = '#1A1820';

const WIPE_IN = [
  'inset(0 100% 0 0)',
  'inset(0 0 0 100%)',
  'inset(100% 0 0 0)',
  'inset(0 0 100% 0)',
  'inset(0 62% 0 0)',
  'inset(0 0 0 62%)',
] as const;
const WIPE_OUT = ['inset(0 0 0 100%)', 'inset(0 100% 0 0)', 'inset(0 0 100% 0)', 'inset(100% 0 0 0)'] as const;

/** Layers wipe in over 200ms in five steps, staggered 45ms apart. */
const STAGGER = 45;
/** The host outlives the wipe-out, then goes. */
const TEARDOWN = 230;

export const pick = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

/** A pick that is never `not`. Every list here has other colors, so it ends. */
const pickNot = (a: readonly string[], not: string): string => {
  let c = pick(a);
  while (c === not) c = pick(a);
  return c;
};

/** The last main band color, so two hovers in a row never match. */
let last = '';

export interface Band {
  host: HTMLSpanElement;
  layers: HTMLSpanElement[];
  outline: HTMLSpanElement;
  timers: number[];
}

export function bandIn(b: HTMLElement): Band {
  const host = document.createElement('span');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-band', '');
  host.style.cssText = 'position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden';

  const layer = (geometry: string, color: string) => {
    const l = document.createElement('span');
    const jitter = Math.round(Math.random() * 15 - 7.5);
    l.style.cssText =
      `position:absolute;${geometry};background:${color};clip-path:${pick(WIPE_IN)};` +
      `transform:translateX(${jitter}px);` +
      'transition:clip-path 200ms steps(5,end),transform 200ms steps(5,end)';
    host.appendChild(l);
    return l;
  };

  // The rows never match the band, or they would vanish into it.
  const main = (last = pickNot(HUES, last));
  const layers = [
    layer('inset:0', main),
    layer(`left:0;right:0;top:0;height:${2 + Math.random() * 6}%`, pickNot(pick(SPARK_ACCENT), main)),
    layer(`left:0;right:0;bottom:0;height:${2 + Math.random() * 6}%`, pickNot(pick(SPARK_LIGHTS), main)),
  ];

  const outline = document.createElement('span');
  outline.style.cssText = `position:absolute;inset:0;box-shadow:inset 0 0 0 1.5px ${INK}`;
  host.appendChild(outline);
  b.appendChild(host);

  // Commit the starting clip before the transition target is set.
  void host.offsetWidth;
  const timers = layers.map((l, i) =>
    window.setTimeout(() => {
      l.style.clipPath = 'inset(0 0 0 0)';
      l.style.transform = 'translateX(0)';
    }, i * STAGGER),
  );

  return { host, layers, outline, timers };
}

export function bandOut(band: Band): void {
  band.timers.forEach(clearTimeout);
  band.layers.forEach((l) => {
    l.style.clipPath = pick(WIPE_OUT);
  });
  band.outline.style.boxShadow = 'none';
  const { host } = band;
  window.setTimeout(() => host.remove(), TEARDOWN);
}
