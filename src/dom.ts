/** Tiny DOM helpers. No framework, no innerHTML for content. */

type Attrs = Record<string, string | number | boolean | null | undefined>;

const applyAttrs = (node: Element, attrs?: Attrs) => {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
};

const appendAll = (node: Element, children: (Node | string | null | undefined)[]) => {
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg(tag: string, attrs?: Attrs, ...children: (Node | null | undefined)[]): SVGElement {
  const node = document.createElementNS(SVG_NS, tag) as SVGElement;
  applyAttrs(node, attrs);
  appendAll(node, children);
  return node;
}

export function q<T extends Element = HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector<T>(sel);
}

export function qq<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

/** Resolve a public/ asset path against Vite's base URL. */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/**
 * Hand keyboard focus to the screen that just arrived.
 *
 * Without this the outgoing screen goes inert underneath the focused control,
 * the UA drops focus to <body>, and the user has to tab in from the top of the
 * document again. Every transition calls it once its destination is displayed
 * (and therefore no longer inert). `preventScroll` because the stage is a
 * fixed, clipped box: letting the UA scroll to the control would shift the
 * letterbox.
 */
export function focusInto(target: HTMLElement | null): void {
  if (!target || !target.isConnected || target.closest('[inert]')) return;
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

/** Inline style from a record, so geometry stays readable at the call site. */
export function css(rules: Record<string, string | number | null | undefined>): string {
  return Object.entries(rules)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${typeof v === 'number' ? `${v}px` : v}`)
    .join(';');
}

/** px helper for geometry written in the 1920×1080 design space. */
export const px = (n: number): string => `${n}px`;

/** Split a string into per-letter spans for the glitch engine. */
export function letters(text: string): HTMLSpanElement[] {
  return Array.from(text).map((ch) => {
    const s = document.createElement('span');
    s.setAttribute('data-l', '');
    if (ch === ' ') s.style.whiteSpace = 'pre';
    s.textContent = ch;
    return s;
  });
}
