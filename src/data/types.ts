/**
 * Content types for perfection synthétique.
 *
 * Every record here is transcribed from the devkit's structured JSON
 * (`data/*.json`). Evidence qualifiers — `evidenceStatus`, `release`,
 * `caveat` — are load-bearing: they exist so a prototype is never presented
 * as a shipped product and a concept visualization is never presented as a
 * measurement. Do not strengthen them when editing copy.
 */

export interface CaseRecord {
  /** stable slug, matches the devkit project id */
  id: string;
  /** two-digit index shown in the row */
  idx: string;
  /** display name, lowercased to match the studio voice */
  name: string;
  /** one line, fits the row's thesis column on a single line at 14px */
  line: string;
  year: string;
  discipline: string;
  /** short status token from the devkit `evidenceStatus` field */
  evidence: string;
  /** key-frame image for the panel, or null for a typographic plate */
  image: string | null;
  imageAlt: string;
  /**
   * The index card's preview window.
   *
   * A SEPARATE FILE from `image`, not a crop of it at render time. `image` is a
   * 1456 × 874 full-page capture, and the card's window is between 0.9:1 and
   * 1.3:1 at about a fifth the size — so letting `object-fit` decide the crop
   * gives you whichever part of the capture happens to be in the middle, which
   * on a screen capture is the header. Each of these is cropped to the part of
   * the project that is worth seeing at 200px and written out at twice the slot
   * it fills. See `scripts/build-cards.mjs`, which holds the crop per case and
   * is how these are regenerated.
   */
  card: string | null;
  /** caption shown under the key-frame panel */
  caption: string;
  /** live project, if the devkit declared one */
  href: string | null;
  /** source repository, if the devkit declared one */
  source: string | null;
  /** stored external case study, if the devkit declared one */
  caseHref?: string | null;
  /**
   * An in-stage case-study screen this row opens instead of navigating away.
   *
   * Rows with a `href` are links to a deployed thing; a row with `subpage` has
   * no deployed thing to link to and opens a screen in the same stage instead.
   * The value is the `data-act` the row carries.
   */
  subpage?: string | null;
}

export interface MotionStudy {
  slug: string;
  label: string;
  poster: string;
  note: string;
}

export interface PaintingRecord {
  slug: string;
  title: string;
  /** lowercased title for the wall list */
  wall: string;
  year: string | null;
  note: string | null;
  image: string;
  alt: string;
  /** ArtStation record */
  href: string;
  width: number;
  height: number;
  /**
   * The devkit's own sets. Nothing renders this now that page 02 shows every
   * work at once, but it is a fact about the collection rather than about the
   * page, so it stays.
   */
  state: 'hung' | 'selected' | 'archive';
  /** vivid-palette chip, from when the wall list carried one per row */
  chip: string;
}

export interface SystemRecord {
  id: string;
  name: string;
  klass: string;
  year: string;
  state: string;
  image: string;
  alt: string;
  caption: string;
  fig: string;
}

/**
 * One sheet in the channel-03 evidence viewer.
 *
 * `caption` and `alt` are copied character-for-character out of the devkit's
 * `visuals[]` / `publication_pages[]` arrays. They are the only place the
 * qualifier appears at full size, so they are the last place it may be
 * softened. `label` and `kind` are this build's index-list wording and carry
 * no claim.
 */
export interface EvidenceSheet {
  id: string;
  /** short name for the index list — a label, never a claim */
  label: string;
  /** which of the devkit's three groups this sheet belongs to */
  kind: 'installed concept' | 'system plate' | 'publication page';
  image: string;
  /** verbatim from the devkit */
  alt: string;
  /** verbatim from the devkit — carries the evidence qualifier */
  caption: string;
  /** intrinsic size, so the plate box reserves the right aspect */
  width: number;
  height: number;
}

export interface TableRow {
  field: string;
  value: string;
}

export interface LinkRecord {
  label: string;
  href: string;
}
