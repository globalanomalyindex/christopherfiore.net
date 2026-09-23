/**
 * about + say hi. The long read, and contact as its closing sentence.
 * The copy and its order live in `data/about.ts`; this only sets it.
 */

import { h } from '../html.ts';
import { PATH } from '../paths.ts';
import { ABOUT, ABOUT_SECTIONS, GLANCE } from '../data/about.ts';
import { CERTIFICATE, LINKS, RESUME, STUDIO } from '../data/studio.ts';
import { body, btn, crumb, glanceRow, lede, page, rich, section, title } from '../prose.ts';

export function about() {
  return page(
    'about and say hi',
    'about',
    crumb(
      'back ',
      btn('home', PATH.home),
      ', or over to ',
      btn('product designs', PATH.designs),
      ' and ',
      btn('paintings', PATH.paintings),
      '.',
    ),
    title('about'),
    lede(ABOUT.lede),
    body(ABOUT.summary),

    section(
      'at a glance',
      { rhythm: 'glance', id: 'at-a-glance' },
      ...GLANCE.map((g) =>
        glanceRow(
          g.field,
          g.value,
          g.doc === 'certificate' ? [' ', btn(CERTIFICATE.label, CERTIFICATE.href, { newTab: true })] : null,
        ),
      ),
    ),

    ...ABOUT_SECTIONS.map((s) => section(s.name, { id: s.id }, ...s.paras.map((p) => body(rich(p))))),

    h(
      'section',
      { class: 'sec sec--prose', id: 'say-hi' },
      h('h2', { class: 'h2', 'data-seams': true }, 'say hi'),
      lede(
        'i’m open to roles in new york or remote. say hi at ',
        btn(STUDIO.email, `mailto:${STUDIO.email}`),
        ', or find me on ',
        btn('github', LINKS.github, { newTab: true }),
        ', ',
        btn('artstation', LINKS.artstation, { newTab: true }),
        ' and ',
        btn('linkedin', LINKS.linkedin, { newTab: true }),
        '. you can also read my ',
        btn(RESUME.label, RESUME.href, { newTab: true }),
        '. i’d love to hear from you :)',
      ),
    ),
  );
}
