/**
 * The brutalist band (README §7.1), carried over from the lattice site's
 * hover.ts: three layers of color wiped in with a stepped clip, a 1.5px inset
 * outline, and the palettes exactly as that site had them.
 *
 * The host is a span INSIDE the button at z-index -1. The button's
 * `isolation: isolate` is what keeps it above the button's own background and
 * under its label.
 */

const HUES = ['#FF2D87', '#F5D90A', '#12D9E8', '#FF6B1A', '#C9F227', '#35E5C8'] as const;
const SPARK_ACCENT = ['#3A3742', '#56535E', '#2B45F5', '#7C858A', '#FF2D87', '#12D9E8'] as const;
const SPARK_LIGHTS = [
  '#E2E7E9',
  '#CBD2D5',
  '#AEB6BA',
  '#FF2D87',
  '#F5D90A',
  '#12D9E8',
  '#FF6B1A',
  '#C9F227',
  '#35E5C8',
] as const;
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

  const layers = [
    layer('inset:0', pick(HUES)),
    layer(`left:0;right:0;top:0;height:${2 + Math.random() * 6}%`, pick(SPARK_ACCENT)),
    layer(`left:0;right:0;bottom:0;height:${2 + Math.random() * 6}%`, pick(SPARK_LIGHTS)),
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
