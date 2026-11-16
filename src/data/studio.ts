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
 * The files live in `public/documents/`, and their names are the URLs, so a
 * new revision replaces the file in place rather than taking a new slug: links
 * people already copied keep working.
 *
 * The resume is named the way recruiters and applicant tracking systems expect
 * a saved resume to be: the full name, then "Resume", with no role or year.
 * It moved to that name in November 2026. The old
 * `christopher-robin-fiore-resume-2026.pdf` stays as an identical copy, so
 * links shared before the move still open the current resume. Replace both
 * files together.
 */
export const RESUME = {
  href: '/documents/Christopher-Robin-Fiore-Resume.pdf',
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
