/**
 * Stage geometry, in the fixed 1920 × 1080 design space.
 *
 * Numbers marked "handoff" are measured from the prototype and are final.
 * Numbers marked "adapted" are this build's departures, made because the real
 * inventory is larger than the placeholder inventory the design was drawn
 * against. Each adaptation keeps the module discipline (72.727 and its
 * fractions) and is noted with what it replaced.
 */

export const STAGE = { w: 1920, h: 1080 } as const;

/** 1920 ÷ 26.4. The product page's visible grid and the menu's first channel. */
export const MODULE = 72.727;

export const MENU = {
  headerH: 62, // handoff
  channelRowH: 289, // handoff
  contactStripH: 132, // handoff
  channels: [
    { n: 1, w: 800, rect: [659, 1120, 132, 0] },
    { n: 2, w: 480, rect: [659, 640, 132, 800] },
    { n: 3, w: 640, rect: [659, 0, 132, 1280] },
  ],
  contactRect: [948, 0, 0, 0],
  wordmarkSize: 240,
  wordmarkLh: 0.9,
  wordmarkTrack: '-.08em',
  crest: { w: 393, left: 1259, top: 22 },
} as const;

/**
 * Page 01 · Product designs.
 *
 * ADAPTED. The design carries four 72.727px case rows between y 731.7 and the
 * footer. The real inventory is seven cases plus a motion archive that is a
 * destination of its own rather than an eighth table row, so the same distance
 * from the fig caption to the footer at 1022.6 is redivided in sixteenths of
 * the module:
 *
 *   tableHeaderY  613.52                  unchanged — clears the fig caption
 *   tableHeaderH   31.818   =  7/16       the column labels are one 11.5px line
 *   rowsY         645.34    = 613.52 + 31.818
 *   rowH           40.909   =  9/16       × 7 cases = 286.363, ending at 931.70
 *   motion.y      931.70
 *   motion.h       90.9     = 20/16       ≈ 2.22 case rows, landing on 1022.6
 *
 *   7 × 9/16 + 7/16 + 20/16 = 90/16 = 5.625 modules = 409.08 — the same band
 *   the eight 45.454px rows filled before, spent differently.
 *
 * `rowSplit` is what lets the case rows be links. Each row is now an anchor to
 * its live demo, and the hover band stack fills whatever box the anchor owns,
 * so the separate "source" link has to sit outside that box: an anchor may not
 * nest, and rust type on a LIGHTS band would break the #0B0B0C ink pair. The
 * row is therefore a two-column grid — the anchor takes `1fr`, the source
 * column takes the last three modules — with `rowCols` applied inside the
 * anchor so idx/case/thesis/year still line up with the table header, which
 * carries the same split.
 *
 * The motion band's own three columns are 6.5 modules of label, the filmstrip,
 * and 4.5 modules for the open affordance, whose 101.8 right padding matches
 * the footer's.
 *
 * The key-frame panel, title, thesis, header and footer keep their handoff
 * geometry. Case names drop from 34px to 28px to sit in the shorter row.
 */
export const PAGE1 = {
  headerH: 77.18, // handoff
  headerCols: '290.909px 363.636px 363.636px 1fr', // handoff
  title: { x: MODULE, y: 122, size: 200, lh: 158, track: '-.06em' }, // adapted y (was 149.9)
  thesis: { x: MODULE, y: 462, w: 727.27, size: 27, lh: 1.32, track: '-.015em' }, // adapted y
  panel: { x: 1090.9, y: 122, w: 727.27, h: 436.36 }, // adapted y (was 149.9)
  figCaption: { x: 1090.9, y: 572, w: 727.27 },
  rowH: 29.091, // adapted — ten cases now; 10 × 29.091 still lands on 931.7
  tableHeaderY: 608.97, // adapted
  tableHeaderH: 31.818, // adapted, 7/16 module (was one full row)
  rowsY: 640.79, // adapted — the rows fill exactly to the motion band at 931.7
  rowCols: '145.455px 363.636px 581.818px 145.455px 1fr', // handoff, inside the row anchor
  rowSplit: '1fr 218.181px', // adapted — row anchor, then the source column (3 modules)
  nameSize: 25, // adapted (was 34, then 28) — scaled with the row as it shrank
  /** The motion archive band: full bleed, 20/16 module, sitting on the footer. */
  motion: { y: 931.7, h: 90.9, cols: '472.727px 1fr 327.272px', still: 68 },
  footer: { y: 1022.6, h: 57.4 }, // handoff
  gridLine: 2,
  gridPitch: MODULE,
} as const;

/** Page 02 · Paintings. All handoff except the wall list row height. */
export const PAGE2 = {
  frameInset: 40,
  frameWidth: 14,
  title: { x: 112, y: 172, size: 168, lh: 161.28, track: '-.05em' },
  header: { x: 78, y: 78, h: 58, gap: 44 },
  meta: { x: 112, y: 322 },
  captionH: 38,
  wall: { x: 1372, y: 360, w: 436 },
  /** ADAPTED: 20 real works instead of 11, so rows shrink 40 → 26px. */
  wallHeaderH: 34,
  wallRowH: 26,
  wallChip: 12, // adapted with the row (was 14)
  footer: { x: 78, bottom: 78, h: 70 },
} as const;

/**
 * Page 03 · Competizione.
 *
 * ADAPTED, twice.
 *
 * First pass replaced the design's three placeholder concepts with the four
 * real BLSP system plates. That was wrong at the level above: four rows in the
 * index column read as four projects, and it is one project with four plates.
 *
 * Second pass — this one — makes the index a single entry. The right column
 * carries one 612 × 400 block, bottom-aligned with the hero, instead of four
 * 100px rows; `rowH`/`rowsY` are gone with the rows.
 *
 * The hero shrank 1090.9 → 727.27 (15 → 10 modules) for a reason that is not
 * composition. The installed render is 1672 × 941 (1.777); `cover` in a 2.727
 * box cropped 35% of its height, which cut the roofline, the wheels, and — the
 * part that settles it — the disclaimer strip burned into the bottom of the
 * render itself: "3D RENDER — CONCEPT VISUALIZATION ONLY — NOT FOR ROAD OR
 * TRACK USE". A crop that hides a claim boundary is not a crop we get to make.
 * The image is `contain` now, so the box is sized to what `contain` actually
 * draws (710.7 wide at 400 tall) and the letterbox is 8px a side rather than
 * 190px a side.
 *
 * The 363.6px that freed between the hero and the index column is the
 * assemblies band: the five functional assemblies, at full text, running the
 * hero's own 400px.
 */
export const PAGE3 = {
  headerH: 62,
  title: { x: MODULE, y: 100, size: 176, lh: 165.44, track: '-.06em' },
  /** No longer tied to the hero's width — the hero is narrower than this row. */
  captionRow: { x: MODULE, y: 496, w: 1090.9 },
  hero: { x: MODULE, y: 548, w: 727.27, h: 400 }, // adapted w (was 1090.9)
  /** Tied to the hero: the full boundary line measures ~570px, so it fits. */
  heroCaption: { x: MODULE, y: 958, w: 727.27 },
  /** 836.36 = hero right edge + half a module. Right edge 1163.63 = 16 modules. */
  assemblies: { x: 836.36, y: 548, w: 327.27, headerH: 36.36, rowH: 72.727 },
  list: { x: 1236, y: 500, w: 612 },
  /** The one entry. Bottom 948, level with the hero and the assemblies band. */
  entry: { x: 1236, y: 548, w: 612, h: 400 },
  gatesLine: { x: 1236, y: 958, w: 612 },
  nameSize: 52, // adapted (was 36) — one entry, so it carries the column
  checker: { top: 288, h: 192, cell: 48 },
  speedPitch: 190,
  footerH: 88,
} as const;

/**
 * The evidence viewer that grows out of page 03.
 *
 * NEW — there is no handoff drawing for it. It is a full-stage screen, not an
 * overlay panel, so it borrows page 03's own band heights (62 header, 88
 * footer) and the module margin, and reads as the next screen in the same
 * system rather than as a dialog laid over it.
 *
 * The plate box is deliberately 1236 × 778 (ratio 1.589) and the image inside
 * it is `object-fit: contain`, not `cover` like the page hero: the sheets run
 * from 1.777 (the concept renders) to 1.294 (the visual master pages), and
 * cropping a page of evidence to fill a box would hide part of the evidence.
 * Letterboxing inside the plate is the correct trade here.
 *
 * The index column's rows end at 906, level with the plate's bottom edge, and
 * the release line takes the band under it.
 */
export const EVIDENCE = {
  headerH: 62, // = PAGE3.headerH
  footerH: 88, // = PAGE3.footerH
  plate: { x: MODULE, y: 128, w: 1236, h: 778 },
  plateCaption: { x: MODULE, y: 930, w: 1236 },
  /** right edge 1847.27 = 1920 − MODULE, mirroring the plate's left margin */
  index: { x: 1380, y: 128, w: 467.27 },
  indexRowsY: 162,
  indexRowH: 62, // 12 rows × 62 = 744 → 906
  release: { x: 1380, y: 926, w: 467.27 },
} as const;
/*
  The "evidence · 12 sheets" tab pinned into the page-03 hero lives entirely in
  `.ps-ev-chip` (pages.css), the way `.ps-plaque` does: its colors have to be
  overridable by a hover rule, and an inline background would outrank one.
*/

/** Page 04 · Contact. All handoff. */
/**
 * Page 04 — contact + about me.
 *
 * The title is two lines now ("Contact" / "+ About me"), so this page takes
 * page 01's composition rather than its own former one: a stacked title down
 * the left with the identity block under it, a prose panel in the right column
 * on page 01's own `panel.x`, and the field/value table full width underneath.
 * The table stays where it was to the pixel — only the space above it is
 * rebuilt — so the two pages read as the same grid seen twice.
 */
export const PAGE4 = {
  headerH: 62,
  // two lines at 148/120 occupy 120–360, landing the identity block where the
  // one-line 172px title used to end
  title: { x: 56, y: 120, size: 148, lh: 120, track: '-.05em' },
  email: { x: 56, y: 432, size: 60, track: '-.03em' },
  links: { x: 56, y: 530 },
  /** the standfirst, in page 01's right-hand panel column */
  lede: { x: 1090.9, y: 150, w: 727.27, size: 21, lh: 1.5, track: '-.01em' },
  /** the control into the about subpage, directly under the prose it extends */
  more: { x: 1090.9, y: 470 },
  tableHeader: { y: 620, h: 44 },
  rowY: [664, 742, 820, 898],
  rowH: 78,
  footerH: 88,
} as const;

/**
 * The MFNY subpage.
 *
 * Not a READER_PAGE: the background and df2tm screens are pure prose, and this
 * one's argument is visual — the whole case rests on two cards of the same
 * strain sitting next to each other on the live site. So it takes the chellbook
 * shape instead, a plate on the left with the prose beside it, and spends the
 * left column on a before/after the reader can flip.
 *
 * Columns on the module grid: 10 (plate) · 9 (prose) · 4.4 (at a glance), with
 * a half-module gutter between each. The plate is 727.27 × 436.36, which is
 * page 01's own key-frame panel — the captures are 1456 × 874 and that box is
 * the same 1.666 ratio, so they land exactly with no letterbox.
 */
export const MFNY_PAGE = {
  headerH: 62,
  footerH: 88,
  title: { x: MODULE, y: 88, size: 152, lh: 146, track: '-.05em' },
  descriptorY: 246,
  metaY: 286,
  ruleY: 318,
  bandY: 336,
  bandEnd: 976,
  plate: { x: MODULE, y: 336, w: 727.27, h: 436.36 },
  plateCaptionY: 788,
  /** before / after, directly under the caption it changes */
  toggleY: 828,
  /** the two doors: the working demo, then the page it critiques */
  doors: { x: MODULE, y: 886, w: 727.27, h: 66, gap: 12 },
  text: { x: 836.36, y: 336, w: 654.54 },
  glance: { x: 1527.27, y: 336, w: STAGE.w - MODULE - 1527.27 },
  glanceRowsY: 380,
  secBarH: 34,
  secBarGap: 12,
  railW: 6,
} as const;

/**
 * A reading subpage. Title and section index down the left, one scrolling
 * prose column in the middle, a scannable column on the right. The band runs
 * from under the title rule to the same 976 every other screen stops at.
 *
 * Shared by the background screen (channel 04) and the df2tm screen (channel
 * 01): both are prose with no imagery, so they are the same screen with
 * different words, and giving them one geometry is what keeps them that way.
 */
export const READER_PAGE = {
  headerH: 62,
  footerH: 88,
  title: { x: MODULE, y: 88, size: 152, lh: 146, track: '-.05em' },
  descriptorY: 246,
  ruleY: 300,
  bandY: 336,
  bandEnd: 976,
  /*
    Three columns on the module grid with a one-module gutter between each:
    4 · gutter · 9 · gutter · 9.4. The prose column is 9 modules (654.5px)
    because that is the widest it can be and still hold a sane measure — about
    77 characters at 17px. The full band width would be 1447px, which is twice
    a readable line and the reason this screen is not one wide column.
  */
  index: { x: MODULE, y: 336, w: MODULE * 4 },
  indexRowsY: 380,
  indexRowH: 54,
  /** email and links, under the section index — contact stays reachable here */
  indexFootY: 800,
  text: { x: MODULE * 6, y: 336, w: MODULE * 9 },
  /** the scannable credential column: what a reader skimming wants first */
  glance: { x: MODULE * 16, y: 336, w: STAGE.w - MODULE * 17 },
  glanceRowsY: 380,
  /** the "you are here" bar above the scrolling column */
  secBarH: 34,
  secBarGap: 12,
  railW: 6,
} as const;

/** Motion contact sheet drawn into the page-01 key-frame panel on hover. */
export const MOTION_SHEET = { cols: 4, rows: 2, gap: 8 } as const;
