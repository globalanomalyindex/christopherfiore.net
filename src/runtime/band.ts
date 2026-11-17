/**
 * The band's colours and its host.
 *
 * The brutalist band, carried over from the lattice site's hover.ts: a main
 * layer and two thin accent strips of flat colour, and a 1.5px inset ink
 * outline. How it moves lives in `ink.ts`; this file holds what it is made of.
 *
 * The host is a span INSIDE the button at z-index -1, and it is the button's
 * FIRST child: the button's `isolation: isolate` keeps it above the button's
 * own background and under its label, and anything a lineage effect lays
 * inside the label at z-index -1 (Mark's tint) paints above it.
 */

/**
 * The main band: flat, clashing brights in the spirit of Bungie's Marathon
 * (2026). The lattice site's six come first, then seventeen more that fill in
 * the wheel between them. Every one holds band ink (#1A1820) at 5:1 or better,
 * the floor the original hot pink set, so the pinned label always reads.
 */
export const HUES = [
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
 * The accent strips pick a family first, then a colour in it. Listing a family
 * twice doubles its odds: the top strip half graphite, the bottom a third grey.
 */
export const SPARK_ACCENT: readonly (readonly string[])[] = [GRAPHITE, GRAPHITE, GRAPHITE, ELECTRIC, HUES, HUES];
export const SPARK_LIGHTS: readonly (readonly string[])[] = [GREYS, HUES, HUES];

/** Band ink: the label's colour while the band is up. */
export const DARK_INK = '#1A1820';

export const pick = <T>(a: readonly T[]): T => a[(Math.random() * a.length) | 0];

/** A pick that is never `not`. Every list here has other colours, so it ends. */
export const pickNot = (a: readonly string[], not: string): string => {
  let c = pick(a);
  while (c === not) c = pick(a);
  return c;
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** `a` moved toward `b` by k, in sRGB, as hex. */
export const mix = (a: string, b: string, k: number): string => {
  const A = rgb(a);
  const B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
};

/** The band host: first child of the button, under its label. */
export function host(b: HTMLElement): HTMLSpanElement {
  const el = document.createElement('span');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('data-band', '');
  el.style.cssText = 'position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden';
  const outline = document.createElement('span');
  outline.className = 'bo';
  el.appendChild(outline);
  b.insertBefore(el, b.firstChild);
  return el;
}

/** Make `parent` hold exactly `items.length` spans of `cls` before `before`, styled as given. Writes only what changed. */
export function pool(parent: HTMLElement, key: string, items: readonly { c: string; s: string }[], before: Element | null = null): void {
  const have = Array.from(parent.querySelectorAll<HTMLSpanElement>(`:scope > [data-k="${key}"]`));
  while (have.length < items.length) {
    const s = document.createElement('span');
    s.setAttribute('data-k', key);
    parent.insertBefore(s, before);
    have.push(s);
  }
  while (have.length > items.length) have.pop()!.remove();
  items.forEach((it, i) => {
    const el = have[i];
    if (el.className !== it.c) el.className = it.c;
    if (el.getAttribute('style') !== it.s) el.setAttribute('style', it.s);
  });
}
