/**
 * The site's markup is rendered to strings, at build time, by the same page
 * modules the dev server calls per request. There is no DOM on that side, so
 * pages are written with `h()` rather than `document.createElement`.
 *
 * ESCAPING IS THE WHOLE CONTRACT. A string child is text and is escaped; an
 * attribute value is escaped; only an `Html` value passes through untouched,
 * and the only ways to make one are `h()` itself and `raw()`, which is for
 * fixed markup written in this repo (the arrow glyph), never for content.
 */

export interface Html {
  readonly __html: string;
  /** Set on the framed button, so a sentence can keep its punctuation beside it. */
  readonly btn?: true;
}

export type Child = Html | string | number | null | undefined | false | Child[];
type AttrValue = string | number | boolean | null | undefined;

const VOID = new Set(['br', 'img', 'meta', 'link', 'hr', 'input', 'source', 'wbr']);

export const raw = (markup: string): Html => ({ __html: markup });

/** Flatten nested children into one list, dropping the empties. */
export const flat = (kids: Child[]): Exclude<Child, Child[] | null | undefined | false>[] =>
  kids.flatMap((k) => (Array.isArray(k) ? flat(k) : k === null || k === undefined || k === false ? [] : [k]));

export const isHtml = (v: unknown): v is Html =>
  typeof v === 'object' && v !== null && '__html' in v;

export const escText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escAttr = (s: string): string => escText(s).replace(/"/g, '&quot;');

export function render(child: Child): string {
  if (child === null || child === undefined || child === false) return '';
  if (Array.isArray(child)) return child.map(render).join('');
  if (isHtml(child)) return child.__html;
  return escText(String(child));
}

export function h(tag: string, attrs?: Record<string, AttrValue> | null, ...kids: Child[]): Html {
  let open = `<${tag}`;
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    open += v === true ? ` ${k}` : ` ${k}="${escAttr(String(v))}"`;
  }
  open += '>';
  if (VOID.has(tag)) return raw(open);
  return raw(`${open}${render(kids)}</${tag}>`);
}

/** Several siblings as one value. */
export const frag = (...kids: Child[]): Html => raw(render(kids));
