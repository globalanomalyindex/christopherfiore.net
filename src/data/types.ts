/**
 * Shared content types.
 *
 * Evidence qualifiers in any record are load-bearing: they exist so a
 * prototype is never presented as a shipped product and a concept is never
 * presented as a measurement. Do not strengthen them when editing copy.
 */

export interface PaintingRecord {
  slug: string;
  title: string;
  /** lowercased title, which is what the caption's button says */
  wall: string;
  year: string | null;
  note: string | null;
  image: string;
  alt: string;
  /** ArtStation record */
  href: string;
  /**
   * The ORIGINAL dimensions. Only the ratio is used now: they become the
   * image's width and height attributes, so every figure reserves its box
   * before the file arrives and nothing below it moves when it does.
   */
  width: number;
  height: number;
  /** The devkit's own sets. A fact about the collection; nothing renders it. */
  state: 'hung' | 'selected' | 'archive';
  /** vivid-palette chip from the lattice site's wall list; nothing renders it */
  chip: string;
}

export interface TableRow {
  field: string;
  value: string;
}
