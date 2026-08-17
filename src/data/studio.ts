/**
 * Studio identity. Transcribed from devkit `data/profile.json`.
 */

import type { LinkRecord, TableRow } from './types.ts';

export const STUDIO = {
  name: 'christopher robin fiore',
  wordmark: ['perfection', 'synthétique'] as const,
  tagline: 'the designs of christopher robin fiore',
  location: 'new york city',
  locationShort: 'new york',
  roles: 'product designer',
  rev: 'studio index, rev 04',
  /** Bump this with any substantive content change; it is shown in the header. */
  updated: 'last updated august 14 2026 · 5:34 pm ET',
  email: 'chrisrobinfiore@gmail.com',
} as const;

/**
 * The resume, hosted here.
 *
 * `bytes` and `checksum` are printed beside the download, which is the same
 * treatment the 424-page master publication gets on channel 03 and is a rule
 * rather than a flourish: a file this site hands somebody says what it is
 * before they take it. Both are measured from the file in `public/documents`,
 * so a new revision has to update them or the page is lying about what it
 * serves.
 *
 * TWO CONTROLS, NOT ONE, and they are different verbs. "view" opens the PDF in
 * a new tab and lets the browser's own reader do the reading. "download" hands
 * the file over. A single control has to pick one, and on a resume both are
 * things a person actually came to do.
 */
export const RESUME = {
  href: 'documents/christopher-robin-fiore-resume-2026.pdf',
  /** What the file lands on disk as, rather than the slug it is served under. */
  file: 'christopher robin fiore resume 2026.pdf',
  label: 'resume',
  pages: '2 pages',
  bytes: '136,509 bytes',
  checksum: 'sha256 06ff949a…e3acb3e1',
} as const;

export const PROFILE_LINKS: LinkRecord[] = [
  { label: 'github.com/globalanomalyindex', href: 'https://github.com/globalanomalyindex' },
  { label: 'artstation.com/chrisfiore', href: 'https://www.artstation.com/chrisfiore' },
  {
    label: 'linkedin.com/in/christopherrobinfiore',
    href: 'https://www.linkedin.com/in/christopherrobinfiore',
  },
];

/**
 * Contact table. Every value here is a fact carried from the devkit —
 * `profile.domains`, `profile.roles`, `profile.location`, `profile.thesis`.
 * The prototype's invented values ("two working days", "logo contests,
 * dashboards nobody reads") were flagged as unverified in the handoff and
 * are deliberately not carried over.
 */
export const CONTACT_TABLE: TableRow[] = [
  { field: 'roles', value: 'product designer, design engineer' },
  {
    field: 'domains',
    value: 'products, research, UI/UX, motion, accessibility, interfaces, AI integration, creative tools',
  },
  { field: 'based', value: 'new york city' },
  /*
    Was `method`, carrying devkit `profile.thesis`. Nothing was lost by
    dropping it: that string is `CASES_THESIS` verbatim and is still printed as
    page 01's standfirst, so it was on the site twice. Here it had also become
    the third statement of method on one screen, after ABOUT.lede in the
    right-hand column and the `roles` row above. The slot is spent on the one
    thing the lede does not carry instead. Four rows is the hard ceiling: a
    fifth at rowH 78 starts at 976 and the footer starts at 992.
  */
  {
    field: 'trained',
    value:
      'concept art at CG Spectrum, graphic design under a senior Disney designer, Method acting at Lee Strasberg',
  },
];

/** Channel-strip contact copy, two lines. */
export const CONTACT_STRIP_LINES = [STUDIO.email, 'github.com/globalanomalyindex'] as const;
