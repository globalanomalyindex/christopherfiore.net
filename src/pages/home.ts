/**
 * home. The Figma letter the whole redesign grew from: a title and three
 * paragraphs, no nav, no footer.
 *
 * THE LAST PARAGRAPH IS TWO LINES BY CONSTRUCTION. Its first clause is locked
 * to one line (`nowrap`) and "or say hi" always starts the second (`<br>`).
 * Below the width where the clause can no longer fit, site.css lets it wrap
 * and hides the break, which is README §8's recommendation.
 */

import { h } from '../html.ts';
import { PATH } from '../paths.ts';
import { RESUME, STUDIO } from '../data/studio.ts';
import { btn, glued, page, title } from '../prose.ts';
import { outline, ink as inkBox } from '../data/signature.json';

export const HOME = {
  title: 'hi, i’m christopher robin!',
  paras: [
    'i’m a web designer & product designer specializing in UI/UX and artificial intelligence, and founder of design studio perfection synthétique.',
    'on the side, i’m an actor and concept artist. i love storytelling, and i bring that unique approach to all my technical work.',
  ],
} as const;

/**
 * The signature, set boldly across the bottom of the page.
 *
 * It arrives finished: the traced outline of his handwriting, filled in ink.
 * That is the whole of it with scripts off. `runtime/signature.ts` writes it in
 * when it scrolls into view, and hands this exact markup back when it is done.
 * The viewBox is the ink's own bounds, so the first and last strokes sit on
 * the text's gutters.
 */
function signature() {
  const [x0, y0, x1, y1] = inkBox;
  return h(
    'div',
    { class: 'home-sig', 'data-sig': true },
    h(
      'svg',
      {
        class: 'sig',
        // No width or height: the viewBox gives the ratio, and with no CSS
        // at all a sized svg would render 2053px wide.
        viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`,
        role: 'img',
        'aria-label': 'signature: christopher robin fiore',
        focusable: 'false',
      },
      h('path', { class: 'sig-ink', fill: 'currentColor', 'fill-rule': 'evenodd', d: outline }),
    ),
  );
}

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
  const p = (...kids: Parameters<typeof h>[2][]) =>
    h('p', { class: 'home-p', 'data-seams': true }, ...kids);

  return page(
    'home',
    'home',
    title(HOME.title),
    h(
      'div',
      { class: 'home-prose' },
      ...HOME.paras.map((t) => p(t)),
      h(
        'p',
        { class: 'home-p home-p--wide', 'data-seams': true },
        h(
          'span',
          { class: 'home-lock' },
          ...glued(
            'you can view my portfolio ',
            btn('product designs', PATH.designs),
            ' and ',
            btn('paintings', PATH.paintings),
            ',',
          ),
        ),
        // The space survives when the break is hidden on a narrow screen, and
        // collapses into the line end when it is not.
        ' ',
        h('br', { class: 'home-br' }),
        ...glued(
          'or say hi ',
          // Designed as a jump to the contact page rather than a mailto:, and
          // it lands on the "say hi" section itself.
          btn(STUDIO.email, PATH.sayHi),
          '. you can also read my ',
          btn(RESUME.label, RESUME.href, { newTab: true }),
          '. i’d love to hear from you :)',
        ),
      ),
    ),
    signature(),
  );
}
