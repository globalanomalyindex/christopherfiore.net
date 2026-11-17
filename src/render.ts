/**
 * Server side of the site: the route table, and one page to HTML.
 *
 * `vite.config.ts` calls this twice over. The dev server calls `render()` per
 * request, and the build calls it once per path in `ROUTES` and writes each
 * result to `<path>/index.html`, plus `404.html`, which GitHub Pages serves
 * for anything it cannot find. So every URL the site owns is a real HTML file
 * with its prose already in it: readable with scripts off, indexable, and a
 * 200 on the first request. The browser bundle (`main.ts`) only adds the
 * behavior on top.
 *
 * Nothing here may touch `document` or `window`. It runs in Node.
 */

import { escAttr, escText, render as toString, type Html } from './html.ts';
import { PATH, casePath } from './paths.ts';
import { STUDIO } from './data/studio.ts';
import { CASE_STUDIES } from './data/casestudies.ts';
import { ABOUT } from './data/about.ts';
import { HOME, SIGNATURE_GATE, home } from './pages/home.ts';
import { DESIGNS, designs } from './pages/designs.ts';
import { caseStudy } from './pages/casestudy.ts';
import { PAINTINGS_PAGE, paintings } from './pages/paintings.ts';
import { about } from './pages/about.ts';
import { NOT_FOUND, notFound } from './pages/notfound.ts';

export interface Route {
  path: string;
  /** The page's name; the document title is this plus the site name. */
  name: string;
  description: string;
  body: () => Html;
  /** An inline script for this page's <head>, run before first paint. */
  headScript?: string;
}

/** Whole sentences, as many as fit in a search result's snippet. */
function describe(text: string, max = 160): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    const next = (out + s).trim();
    if (next.length > max && out) break;
    out = next;
    if (out.length > max) break;
  }
  return out;
}

/**
 * Runs in every page's <head>, before anything paints. A page change is one
 * film across two documents (`runtime/morph.ts`): the page being left covers
 * itself, then leaves a note in sessionStorage. If that note is here, fresh,
 * and addressed to this page, this page starts covered (`morph-in` hides
 * everything under the masthead) and the runtime uncovers it.
 *
 * It never covers for reduced motion, a reload or a back/forward visit, and
 * it uncovers by itself after 1.2s if the runtime never arrives to claim it.
 * With scripts off it never runs, so the page is simply there.
 */
export const MORPH_GATE =
  "try{var s=sessionStorage.getItem('ps-morph');if(s){sessionStorage.removeItem('ps-morph');" +
  "var m=JSON.parse(s),g=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];" +
  "if(m&&m.to===location.pathname&&Date.now()-m.t<4000&&(!g||g.type==='navigate')&&" +
  "!matchMedia('(prefers-reduced-motion: reduce)').matches){" +
  "var e=document.documentElement;e.classList.add('morph-in');window.__psMorphIn=m.dir;window.__psMorphKind=m.kind||null;" +
  "setTimeout(function(){if(!window.__psMorphClaim)e.classList.remove('morph-in')},1200)}}}catch(x){}";

/**
 * Runs in every page's <head>, before anything paints. On a subpage the back
 * button's cell holds the mono "+" until its entrance (`runtime/jx.ts`), so the
 * X never shows first and then plays in. Not for reduced motion or a
 * back/forward visit, and it gives the X back after 3s if the runtime never
 * arrives to claim it. With scripts off it never runs: the X is simply there.
 */
export const JX_GATE =
  "try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];" +
  "if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!(n&&n.type==='back_forward')){" +
  "var d=document.documentElement;d.classList.add('jx-wait');" +
  "setTimeout(function(){if(!window.__psJxClaim)d.classList.remove('jx-wait')},3000)}}catch(e){}";

export const ROUTES: Route[] = [
  {
    path: PATH.home,
    name: '',
    description: HOME.paras[0],
    body: home,
    headScript: SIGNATURE_GATE,
  },
  {
    path: PATH.designs,
    name: 'product designs',
    description: DESIGNS.lede,
    body: designs,
  },
  ...CASE_STUDIES.map((c) => ({
    path: casePath(c.id),
    name: c.name,
    description: describe(c.summary),
    body: () => caseStudy(c),
  })),
  {
    path: PATH.paintings,
    name: 'paintings',
    description: PAINTINGS_PAGE.lede,
    body: paintings,
  },
  {
    path: PATH.about,
    name: 'about',
    description: describe(ABOUT.lede),
    body: about,
  },
];

const NOT_FOUND_ROUTE: Route = {
  path: PATH.notFound,
  name: NOT_FOUND.title,
  description: NOT_FOUND.lede,
  body: notFound,
};

export interface Rendered {
  status: number;
  head: string;
  body: string;
}

const docTitle = (r: Route) =>
  r.name ? `${r.name} · ${STUDIO.name}` : `${STUDIO.name} · ${STUDIO.studio}`;

function head(r: Route, found: boolean): string {
  const title = docTitle(r);
  const url = `${STUDIO.origin}${r.path}`;
  const tags = [
    `<title>${escText(title)}</title>`,
    `<meta name="description" content="${escAttr(r.description)}" />`,
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(r.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escAttr(STUDIO.studio)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ];
  if (found) {
    tags.push(`<link rel="canonical" href="${escAttr(url)}" />`);
    tags.push(`<meta property="og:url" content="${escAttr(url)}" />`);
  } else {
    tags.push('<meta name="robots" content="noindex" />');
  }
  tags.push(`<script>${MORPH_GATE}</script>`);
  if (r.path !== PATH.home) tags.push(`<script>${JX_GATE}</script>`);
  if (r.headScript) tags.push(`<script>${r.headScript}</script>`);
  return tags.join('\n    ');
}

/** Treat `/about` and `/about/` as the same page (dev only; Pages redirects). */
const normalize = (p: string) => (p.endsWith('/') ? p : `${p}/`);

export function render(pathname: string): Rendered {
  const route = ROUTES.find((r) => normalize(r.path) === normalize(pathname));
  const r = route ?? NOT_FOUND_ROUTE;
  return { status: route ? 200 : 404, head: head(r, !!route), body: toString(r.body()) };
}

/** Every file the build writes, keyed by its path in `dist/`. */
export function pages(): { file: string; html: Rendered }[] {
  return [
    ...ROUTES.map((r) => ({
      file: `${r.path.replace(/^\//, '')}index.html`,
      html: render(r.path),
    })),
    { file: '404.html', html: render(PATH.notFound) },
  ];
}

export const sitemapPaths = (): string[] => ROUTES.map((r) => `${STUDIO.origin}${r.path}`);
