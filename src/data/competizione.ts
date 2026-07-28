/**
 * Channel 03 · Competizione — the racing / automotive channel.
 *
 * Currently one system: branchial lateral spine, a bilateral modular
 * front-corner airflow concept for the 2022 Hyundai Kona N. Transcribed from
 * devkit `data/branchial-lateral-spine.json` and the project record in
 * `data/projects.json`.
 *
 * RELEASE LANGUAGE IS LOAD-BEARING. The devkit handoff states this work is
 * `R1 production-intent`, `measurement-gated`, and `not road or track
 * released`, and that installed views are concept visualization only. Every
 * caption below carries its qualifier. Do not remove them, and do not turn
 * "design hypothesis" into "measured".
 */

import type { EvidenceSheet, SystemRecord, TableRow } from './types.ts';

/** Default hero — the installed concept view. */
export const HERO: SystemRecord = {
  id: 'installed',
  name: 'installed concept',
  klass: 'class kona n',
  year: '2026',
  state: 'rev h',
  image: 'physical-systems/blsp-kn22/01-front-three-quarter.webp',
  alt: 'Concept visualization of a 2022 Hyundai Kona N with the branchial lateral spine system around the front wheel opening',
  caption: 'branchial lateral spine · concept visualization only',
  fig: 'fig 00',
};

/**
 * The four system plates. Captions carry the devkit's own qualifiers verbatim.
 *
 * These no longer drive anything on the desktop index. The index is one entry —
 * the project — and the plates live inside the case study it opens; `EV_SHEETS`
 * below is where they are shown at full size. They stay exported because the
 * phone document view (`src/mobile.ts`) lists them, and `runtime/evidence.ts`
 * resolves a trigger's sheet through them.
 */
export const SYSTEMS: SystemRecord[] = [
  {
    id: 'system-overview',
    name: 'system overview',
    klass: 'class installed',
    year: '2026',
    state: 'rev h',
    image: 'physical-systems/blsp-kn22/01-system-overview-airflow-path.webp',
    alt: 'System overview plate showing the corrected installed-system sequence and airflow path',
    caption: '01 · corrected installed-system sequence · design hypothesis, not measured airflow',
    fig: 'fig 01',
  },
  {
    id: 'collector-throat',
    name: 'collector + throat',
    klass: 'class collector',
    year: '2026',
    state: 'R1 gated',
    image: 'physical-systems/blsp-kn22/02-collector-throat-function.webp',
    alt: 'Plate showing the bumper-corner collector feeding interchangeable throat cartridges',
    caption: '02 · collector and throat · design hypothesis, not measured airflow',
    fig: 'fig 02',
  },
  {
    id: 'arch-manifold',
    name: 'arch manifold',
    klass: 'class venting',
    year: '2026',
    state: 'R1 gated',
    image: 'physical-systems/blsp-kn22/03-arch-manifold-opercular-venting.webp',
    alt: 'Plate showing the sealed arch manifold staging discharge through three outlets',
    caption: '03 · arch manifold · design hypothesis, not measured airflow',
    fig: 'fig 03',
  },
  {
    id: 'floor-spine',
    name: 'floor spine',
    klass: 'class underbody',
    year: '2026',
    state: 'R1 gated',
    image: 'physical-systems/blsp-kn22/04-floor-spine-drainage-fail-safe.webp',
    alt: 'Plate showing the lateral floor spine, drainage path and fail-safe behavior',
    caption: '04 · floor spine · design hypothesis, not measured airflow',
    fig: 'fig 04',
  },
];

/** Header and caption metadata for the page. */
export const CZ_META = {
  /**
   * The header's count cell. It used to say "four plates" because the index
   * listed the four plates as rows. The index is one project now, so the count
   * describes the system rather than the page furniture.
   */
  count: 'one system, five assemblies',
  /** Fourth header cell — the release boundary sits where you cannot miss it. */
  release: 'R1 · not road or track released',
  captionLeft: 'kona n · revision h',
  captionMid: 'collector, throat, manifold, floor spine',
  captionRight: 'measurement-gated',
  /** Menu channel footer, unchanged from the design. */
  channelFooter: 'car concepts, racing, performance',
  channelMeta: 'kona n · r1',
} as const;

/**
 * Evidence inventory, from `branchial-lateral-spine.json`. Shown as a compact
 * field/value strip so the claim stays traceable.
 */
export const CZ_EVIDENCE: TableRow[] = [
  { field: '36', value: 'STEP solids' },
  { field: '36', value: 'STL derivatives' },
  { field: '565', value: 'hashed manifest records' },
  { field: '424', value: 'publication pages' },
];

/** Open validation gates, abbreviated from `validation_gates`. */
export const CZ_GATES = 'vehicle registration, physical qualification and aerodynamic evidence remain open';

/* ------------------------------------------------------------- evidence */

/**
 * The evidence viewer's twelve sheets.
 *
 * Order is the devkit's own: the three installed concept views from
 * `visuals[]`, then the four system plates from `visuals[]`, then the five
 * Revision H visual master pages from `publication_pages[]`. Five of these
 * twelve are already on the page as the hero and the four plates; the viewer
 * is the full-size record, so it carries them too.
 *
 * EVERY `caption` AND `alt` BELOW IS COPIED CHARACTER-FOR-CHARACTER OUT OF
 * `_source/christopher-fiore-portfolio-devkit-v31/data/branchial-lateral-spine.json`.
 * The viewer shows them at full size under a 1236px plate, which makes it the
 * one screen where a softened qualifier would do the most damage. "concept
 * visualization only", "design hypothesis, not measured airflow" and "not road
 * or track released" are the claim boundary. Do not edit them, do not shorten
 * them to fit, and do not turn a hypothesis into a measurement.
 */
export const EV_SHEETS: EvidenceSheet[] = [
  {
    id: 'front-three-quarter',
    label: 'front three-quarter',
    kind: 'installed concept',
    image: 'physical-systems/blsp-kn22/01-front-three-quarter.webp',
    alt: 'Concept visualization of a 2022 Hyundai Kona N with the branchial lateral spine system around the front wheel opening',
    caption: 'installed concept view · concept visualization only · not road or track released',
    width: 1672,
    height: 941,
  },
  {
    id: 'front-corner-detail',
    label: 'front-corner detail',
    kind: 'installed concept',
    image: 'physical-systems/blsp-kn22/03-front-corner-detail.webp',
    alt: 'Concept close view of the collector, arch manifold, and outlets around the Kona N front wheel opening',
    caption: 'front-corner module relationship · concept visualization only',
    width: 1672,
    height: 941,
  },
  {
    id: 'rear-three-quarter-context',
    label: 'rear three-quarter',
    kind: 'installed concept',
    image: 'physical-systems/blsp-kn22/04-rear-three-quarter-context.webp',
    alt: 'Concept rear three-quarter view locating the bilateral system within the whole Kona N vehicle',
    caption: 'whole-vehicle context · concept visualization only',
    width: 1672,
    height: 941,
  },
  {
    id: 'system-overview-airflow-path',
    label: 'system overview',
    kind: 'system plate',
    image: 'physical-systems/blsp-kn22/01-system-overview-airflow-path.webp',
    alt: 'Corrected installed-system overview plate showing the proposed airflow path through the collector, throat, arch manifold, outlets, and floor spine',
    caption: '01 · corrected installed-system sequence · design hypothesis, not measured airflow',
    width: 1448,
    height: 1086,
  },
  {
    id: 'collector-throat-function',
    label: 'collector + throat',
    kind: 'system plate',
    image: 'physical-systems/blsp-kn22/02-collector-throat-function.webp',
    alt: 'System plate explaining the bumper-corner collector and interchangeable throat cartridge',
    caption: '02 · collector and throat · design hypothesis, not measured airflow',
    width: 1426,
    height: 1103,
  },
  {
    id: 'arch-manifold-opercular-venting',
    label: 'arch manifold',
    kind: 'system plate',
    image: 'physical-systems/blsp-kn22/03-arch-manifold-opercular-venting.webp',
    alt: 'System plate explaining the sealed arch manifold and staged opercular outlets',
    caption: '03 · arch manifold · design hypothesis, not measured airflow',
    width: 1426,
    height: 1103,
  },
  {
    id: 'floor-spine-drainage-fail-safe',
    label: 'floor spine',
    kind: 'system plate',
    image: 'physical-systems/blsp-kn22/04-floor-spine-drainage-fail-safe.webp',
    alt: 'System plate explaining the lateral floor spine, drainage path, sacrificial elements, and failure containment',
    caption: '04 · floor spine · design hypothesis, not measured airflow',
    width: 1426,
    height: 1103,
  },
  {
    id: 'publication-page-03',
    label: 'page 03',
    kind: 'publication page',
    image: 'physical-systems/blsp-kn22/publication-page-03.webp',
    alt: 'Page 3 of the Revision H corrected visual master showing the front three-quarter installed concept view',
    caption: 'publication page 03 · H visual master · front three-quarter · concept visualization only',
    width: 1584,
    height: 1224,
  },
  {
    id: 'publication-page-05',
    label: 'page 05',
    kind: 'publication page',
    image: 'physical-systems/blsp-kn22/publication-page-05.webp',
    alt: 'Page 5 of the Revision H corrected visual master showing the front-corner installed concept detail',
    caption: 'publication page 05 · H visual master · front-corner detail · concept visualization only',
    width: 1584,
    height: 1224,
  },
  {
    id: 'publication-page-07',
    label: 'page 07',
    kind: 'publication page',
    image: 'physical-systems/blsp-kn22/publication-page-07.webp',
    alt: 'Page 7 of the Revision H corrected visual master showing the proposed system overview and airflow path',
    caption:
      'publication page 07 · H visual master · system overview · design hypothesis, not measured airflow',
    width: 1584,
    height: 1224,
  },
  {
    id: 'publication-page-08',
    label: 'page 08',
    kind: 'publication page',
    image: 'physical-systems/blsp-kn22/publication-page-08.webp',
    alt: 'Page 8 of the Revision H corrected visual master explaining the collector and interchangeable throat function',
    caption:
      'publication page 08 · H visual master · collector and throat · design hypothesis, not measured airflow',
    width: 1584,
    height: 1224,
  },
  {
    id: 'publication-page-10',
    label: 'page 10',
    kind: 'publication page',
    image: 'physical-systems/blsp-kn22/publication-page-10.webp',
    alt: 'Page 10 of the Revision H corrected visual master showing the corrected installed-system overview and proposed airflow path',
    caption:
      'publication page 10 · H corrected system overview and airflow path · design hypothesis, not measured airflow',
    width: 1584,
    height: 1224,
  },
];

/**
 * Viewer chrome. `release` is the devkit `publication.release` string in full —
 * the page header only has room for the abbreviated `CZ_META.release`, and the
 * viewer is where the unabbreviated boundary belongs.
 */
export const EV_META = {
  title: '03 · competizione · evidence',
  source: 'branchial lateral spine · kona n · revision h',
  master: 'revision h corrected visual master · 424 pages',
  release: 'R1 production-intent · measurement-gated · not road or track released',
} as const;

/**
 * Which sheet shows a given `SystemRecord.image`. The hero and the four system
 * rows open the viewer at the plate they are already showing, so the mapping is
 * by image path rather than by a hand-kept index.
 */
export function sheetForImage(image: string): number {
  const i = EV_SHEETS.findIndex((s) => s.image === image);
  return i < 0 ? 0 : i;
}
