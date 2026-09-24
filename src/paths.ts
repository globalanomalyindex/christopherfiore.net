/**
 * Every URL the site owns, in one place.
 *
 * TRAILING SLASHES ARE DELIBERATE. Each route is built as `<path>/index.html`,
 * and GitHub Pages answers `/about` with a 301 to `/about/` before it serves
 * anything. Linking the slashed form skips that hop on every click.
 */

export const PATH = {
  home: '/',
  designs: '/product-designs/',
  paintings: '/paintings/',
  about: '/about/',
  notFound: '/404',
} as const;

export const casePath = (id: string): string => `/product-designs/${id}/`;
