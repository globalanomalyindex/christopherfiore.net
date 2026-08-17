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
 * The resumes, hosted here. There are two, and they are tailored to two
 * different hiring markets.
 *
 * NAMED BY THE ROLE THEY TARGET, NOT BY NUMBER. Two links both saying "resume"
 * is a fork with no signpost: whoever is reading has to open both to find out
 * which one was written for them, and the one they open first is a coin flip.
 * Naming the track is the whole difference between "here are two documents" and
 * "here is the one for you". The `line` under each says what it argues, in the
 * same voice a case row uses.
 *
 * THE ORDER IS THE SITE'S OWN POSITIONING. This is a product design portfolio,
 * so the product design resume is first and is the one the menu rail opens. The
 * commerce resume is not a lesser document; it is the one for a different
 * market, and it says so.
 *
 * `bytes` is printed beside the download. Same treatment the 424-page master
 * publication gets on channel 03, and the same reason: a file this site hands
 * somebody says how big it is before they take it. Measured from the files in
 * `public/documents`, so a new revision has to update them or the page is lying
 * about what it serves.
 *
 * TWO CONTROLS EACH, and they are different verbs. "view" opens the PDF in a
 * new tab and lets the browser's own reader do the reading; "download" hands
 * the file over. A single control has to pick one, and on a resume both are
 * things a person actually came to do.
 */
export interface ResumeRecord {
  id: string;
  /** The market it was written for. This is the label, and it does the work. */
  track: string;
  /** One line on what it argues. */
  line: string;
  href: string;
  /** What the file lands on disk as, rather than the slug it is served under. */
  file: string;
  pages: string;
  bytes: string;
}

export const RESUMES: ResumeRecord[] = [
  {
    id: 'product-design',
    track: 'product design',
    line: 'the design practice: prototypes, research, and the case studies on this site',
    href: 'documents/christopher-robin-fiore-resume-product-design-2026.pdf',
    file: 'christopher robin fiore resume, product design.pdf',
    pages: '2 pages',
    bytes: '136,509 bytes',
  },
  {
    id: 'commerce',
    track: 'commerce and operations',
    line: 'a decade running commerce and audience for a touring entertainment brand',
    href: 'documents/christopher-robin-fiore-resume-commerce-2026.pdf',
    file: 'christopher robin fiore resume, commerce and operations.pdf',
    pages: '1 page',
    bytes: '133,832 bytes',
  },
];

/** The one the menu rail opens; see the note on ordering above. */
export const RESUME_LEAD: ResumeRecord = RESUMES[0];

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
  { field: 'roles', value: 'product designer, design engineer, commerce operations' },
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
