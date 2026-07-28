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
  updated: 'last updated july 27 2026',
  email: 'chrisrobinfiore@gmail.com',
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
  {
    field: 'method',
    value:
      'i design ambitious products, prototype the difficult parts, and test whether the ideas actually hold up',
  },
];

/** Channel-strip contact copy, two lines. */
export const CONTACT_STRIP_LINES = [STUDIO.email, 'github.com/globalanomalyindex'] as const;
