/**
 * home. The Ledger: his Figma frame.
 *
 *   the name
 *   + ──────────▮▮▮ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈   the "+" and the first rule
 *   │ designer / specialty / founder │  the sheet, between his two rules
 *   │ ──────────▮▮▮ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
 *   │ +the four pages          count │
 *     ──────────▮▮▮ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
 *   the signature
 *
 * Each ink rule ends in a ladder and carries on as a faint hairline to the
 * right edge of the window, so the empty side of the page is ruled too.
 */

import { h, type Html } from '../html.ts';
import { TALLY } from '../palette.ts';
import { MAST_NAME, PAGES, led, page, signatureSvg } from '../prose.ts';

export const HOME = {
  who: [
    ['designer', 'web & product'],
    ['specialty', 'UI/UX, artificial intelligence'],
    ['founder', 'perfection synthétique, design studio'],
  ],
  /** Not set on the page. The first is the page's description for search results. */
  paras: [
    'i’m a web designer & product designer specializing in UI/UX and artificial intelligence, and founder of design studio perfection synthétique.',
    'on the side, i’m an actor and concept artist. i love storytelling, and i bring that unique approach to all my technical work.',
  ],
} as const;

/** An ink rule, its ladder, and the hairline that runs on to the window's edge. */
const rule = (c: string): Html =>
  h(
    'span',
    { class: 'hr', 'aria-hidden': 'true' },
    h('i', { class: 'hair' }),
    h('i', { class: 'ink' }),
    led(c),
  );

/**
 * The signature arrives finished: the traced outline of his handwriting,
 * filled in ink. That is the whole of it with scripts off.
 * `runtime/signature.ts` writes it in on every visit and hands this exact
 * markup back when it is done.
 */
const signature = (): Html => h('div', { class: 'home-sig', 'data-sig': true }, signatureSvg('sig-ink'));

/**
 * Runs in <head>, before anything paints, and only on this page. It hides the
 * signature so the runtime can write it in without the finished one flashing
 * first. It never hides it for reduced motion or a back/forward visit, and it
 * gives it back after 3s if the runtime never arrives to claim it.
 */
export const SIGNATURE_GATE =
  "try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];" +
  "if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!(n&&n.type==='back_forward')){" +
  "var d=document.documentElement;d.classList.add('sig-wait');" +
  "setTimeout(function(){if(!window.__psSigClaim)d.classList.remove('sig-wait')},3000)}}catch(e){}";

export function home() {
  const menu = PAGES.filter((p) => p.id !== 'home');

  return page(
    'home',
    'home',
    h('h1', { class: 'name' }, MAST_NAME),
    h(
      'div',
      { class: 'hd' },
      // Not a link here: this is home. It is still where a page change starts.
      h('span', { class: 'plus', 'data-anchor': true, 'aria-hidden': 'true' }, '+'),
      rule(TALLY.cyan),
    ),
    h(
      'main',
      { class: 'ledger' },
      h(
        'div',
        { class: 'who' },
        ...HOME.who.map(([term, value]) => h('p', null, h('b', null, `${term}:`), ` ${value}`)),
      ),
      rule(TALLY.pink),
      h(
        'nav',
        { class: 'menu', 'aria-label': 'pages' },
        ...menu.map((p) =>
          h(
            'a',
            {
              'data-btn': true,
              class: 'btn hrow',
              href: p.href,
              target: p.newTab ? '_blank' : null,
              rel: p.newTab ? 'noopener' : null,
              'data-hue': p.hue,
            },
            h('span', { class: 'nm' }, h('span', { 'data-word': true }, p.label)),
            h('span', { class: 'n' }, p.tail),
            p.newTab ? h('span', { class: 'sr-only' }, ', opens in a new tab') : null,
          ),
        ),
      ),
    ),
    rule(TALLY.lime),
    signature(),
  );
}
