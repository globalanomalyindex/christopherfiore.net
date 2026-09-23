/**
 * Studio identity, and the documents the site hands people.
 *
 * There is no "last updated" line any more. The prose redesign removed it on
 * purpose, with the nav bar and the footer, so nothing here feeds one.
 */

export const STUDIO = {
  name: 'christopher robin fiore',
  studio: 'perfection synthétique',
  role: 'product designer',
  email: 'chrisrobinfiore@gmail.com',
  /** Production origin, for canonical URLs and the sitemap. */
  origin: 'https://christopherfiore.net',
} as const;

/**
 * Both open in a new tab and let the browser's own reader do the reading.
 *
 * The files live in `public/documents/` under kebab-case names, and those
 * names are the URLs, so a new revision of either replaces the file in place
 * rather than taking a new slug: links people already copied keep working.
 */
export const RESUME = {
  href: '/documents/christopher-robin-fiore-resume-2026.pdf',
  label: 'resume',
} as const;

export const CERTIFICATE = {
  href: '/documents/anthropic-ai-fluency-certificate.pdf',
  label: 'certificate',
} as const;

export const LINKS = {
  github: 'https://github.com/globalanomalyindex',
  artstation: 'https://www.artstation.com/chrisfiore',
  linkedin: 'https://www.linkedin.com/in/christopherrobinfiore',
} as const;
