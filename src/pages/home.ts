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

export const HOME = {
  title: 'hi, i’m christopher robin!',
  paras: [
    'i’m a web designer & product designer specializing in UI/UX and artificial intelligence, and founder of design studio perfection synthétique.',
    'on the side, i’m an actor and concept artist. i love storytelling, and i bring that unique approach to all my technical work.',
  ],
} as const;

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
  );
}
