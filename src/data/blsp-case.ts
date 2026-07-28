/**
 * Channel 03 · Competizione · the branchial lateral spine case study.
 *
 * The narrative content for the Kona N subpage. Transcribed from the live case
 * study at
 * https://christopher-fiore.chrisfiore.chatgpt.site/work/branchial-lateral-spine
 * and cross-checked against devkit `data/branchial-lateral-spine.json` and the
 * project record in `data/projects.json`.
 *
 * EVERY STRING HERE IS A CLAIM BOUNDARY. This is a physical-systems concept for
 * a car that has never been measured, and the whole point of the work is that
 * it says so. "design hypothesis", "proposed", "concept visualization only",
 * "not road or track released", "measurement-gated" are not hedging language to
 * be tightened by an editor — they are the deliverable. Do not turn a proposal
 * into a result, and do not drop a qualifier because a line is long.
 *
 * The images referenced here are in `EV_SHEETS` (src/data/competizione.ts).
 */

import type { TableRow } from './types.ts';

export const BLSP = {
  /** The one entry on the Competizione index. */
  name: 'branchial lateral spine',
  klass: 'kona n',
  year: '2026',
  state: 'R1 · measurement-gated',
  descriptor: 'a 3D-print-enabled modular airflow system for the 2022 Hyundai Kona N',
  tagline: 'make the strange part measurable',
  standfirst: 'a physical system, not just an engineering archive',
  /** The preview on the index — the installed 3D render. */
  preview: 'physical-systems/blsp-kn22/01-front-three-quarter.webp',
  previewAlt:
    'Concept visualization of a 2022 Hyundai Kona N with the branchial lateral spine system around the front wheel opening',
  previewCaption: 'installed concept view · concept visualization only · not road or track released',
  revision: 'revision h corrected visual master · 424 pages',
} as const;

/** The product decision, verbatim from the case study. */
export const BLSP_DECISION = {
  heading: 'the product decision',
  lead: 'nature became variables, not proof.',
  body:
    'branchial and opercular anatomy informed the design architecture, enabling measured, replaceable, and rejectable components rather than styling claims. the central decision was to avoid styling a spoiler or splitter around an unverified performance claim.',
  overview: 'the proposed airflow path stays legible from inlet to lower exit.',
} as const;

/** The five functional assemblies. Descriptions are verbatim. */
export const BLSP_ASSEMBLIES: { n: string; name: string; body: string }[] = [
  {
    n: '01',
    name: 'collector',
    body: 'captures the bumper-corner inlet condition without treating the opening as a performance claim',
  },
  {
    n: '02',
    name: 'throat family',
    body: 'makes the inlet transition replaceable so geometry can change without remaking the whole system',
  },
  {
    n: '03',
    name: 'arch manifold',
    body: 'forms a closed passage around the wheel opening, then distributes the proposed flow to staged outlets',
  },
  {
    n: '04',
    name: 'opercular outlets',
    body: 'separate discharge locations so each opening can be measured and revised independently',
  },
  {
    n: '05',
    name: 'floor spine',
    body: 'carries the lower path while drainage and sacrificial pieces keep water and damage from becoming hidden conditions',
  },
];

/** System anatomy — "printed skin, metal bones". */
export const BLSP_ANATOMY: TableRow[] = [
  { field: 'geometry authority', value: 'controlled parametric source and STEP neutral solids' },
  {
    field: 'system',
    value: 'collector, throat family, arch manifold, staged outlets, floor spine',
  },
  { field: 'release boundary', value: 'not road or track released' },
  { field: 'next gate', value: 'registered vehicle geometry and physical qualification' },
];

/** Evidence that exists. Counts from the devkit's `evidence_inventory`. */
export const BLSP_PRODUCED: TableRow[] = [
  { field: '36', value: 'STEP solids · neutral geometry authority' },
  { field: '36', value: 'matching STL derivatives · development outputs, not geometry authority' },
  { field: '6 + 6', value: 'DXF and SVG templates · metal and flat-pattern interfaces' },
  { field: '2', value: 'bilateral service-exploded assemblies' },
  { field: '565', value: 'hashed manifest records · package completeness and traceability' },
  { field: '424', value: 'publication pages' },
];

/** What remains unvalidated. This list is the honest half of the inventory. */
export const BLSP_OPEN: string[] = [
  'vehicle evidence and physical qualification',
  'loads, fatigue, temperature, environment, drainage, durability',
  'brake cooling, aerodynamic force and moment, handling benefit',
  'road or track safety and engineering sign-off',
];

/** The release ladder. `status` is the devkit's own wording. */
export const BLSP_GATES: { gate: string; status: string; detail: string }[] = [
  {
    gate: 'R1',
    status: 'current',
    detail:
      'production-intent and measurement-gated. controlled digital geometry, derivatives, records, automated checks, forms and explicit kill criteria exist',
  },
  {
    gate: 'vehicle registration',
    status: 'open',
    detail:
      'capture the actual vehicle, hardpoints, articulation envelope and swept-volume clearances',
  },
  {
    gate: 'physical qualification',
    status: 'open',
    detail:
      'close structural, fatigue, thermal, environmental, drainage, brake-cooling and durability gates',
  },
  {
    gate: 'aerodynamic evidence',
    status: 'open',
    detail:
      'measure force, moment, pressure and thermal behavior before making a performance claim',
  },
  {
    gate: 'R2',
    status: 'blocked',
    detail:
      'no road or track release until the full validation matrix is closed against the registered vehicle with named engineering sign-off',
  },
];

/** Stated limitations, verbatim. These are the load-bearing sentences. */
export const BLSP_LIMITS: string[] = [
  'installed views show the intended product relationship only. they are concept visualizations, not evidence of fit, airflow, handling, safety, or roadworthiness',
  'every airflow diagram is a design hypothesis, not measured airflow',
  'that separation keeps rapid 3D-printed iteration from being mistaken for structural qualification',
  'STL files are development derivatives, not the geometry authority',
];

/** The designer statement that closes the case study, verbatim. */
export const BLSP_STATEMENT: string[] = [
  'i can take a physically unusual product idea, turn its metaphor into controllable variables, define how the parts work together, and build the evidence architecture that tells a team what is real and what still has to be earned',
  'the result is not a performance claim. it is a release-gated question: a coherent 3D-print-enabled product system, a traceable digital definition, and a validation plan designed to stop unsupported confidence before it reaches the vehicle',
];

/**
 * The publication package, as a MANIFEST — not as download links.
 *
 * The devkit's `document-manifest.json` marks every one of these
 * `file_included: false`, and the URLs on the previous site now return 404
 * (checked 2026-07-27). Listing them as records keeps the package traceable and
 * the page honest; shipping them as anchors would ship fourteen dead links.
 */
export const BLSP_PACKAGE = {
  note: 'the master publication is here in full. the archive volumes — CAD repository, engineering records, revision history — are not published on this site; ask for them directly.',
  master: {
    label: 'revision h · system-overview corrected visual master',
    size: '44.4 MB',
    pages: '424 pages',
    /**
     * Hosted. The file is byte-identical to the record in the devkit's
     * `document-manifest.json`: 44,352,208 bytes, sha256
     * 137e14706b7c42f2d6b16a90aec1e78d82d02a21aa56f65fccbfcc58fb84e41e.
     * Verified 2026-07-27. `checksum` is shown on the page so a reader can
     * confirm they hold the same document the manifest describes — the whole
     * package is built around traceability, so the page should honour that.
     */
    href: 'documents/blsp-kn22-rev-h-system-overview-corrected-visual-master.pdf',
    bytes: '44,352,208 bytes',
    checksum: 'sha256 137e1470…fb84e41e',
  },
  /**
   * The thirteen archive volumes are deliberately not listed. They are not
   * hosted, the previous site's URLs for them 404, and enumerating parts a
   * reader cannot obtain is noise, not traceability. The master publication is
   * the deliverable; `note` says where the rest lives.
   */
} as const;
