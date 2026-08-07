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
  /*
    Moved right from the handoff's 1259. Monaco is wider than Karrik, so
    "synthétique" at 240px and -.08em now draws 11 × 240 × 0.52 = 1373 from
    x 52 and ends at 1425, which ran 166px into the crest. At 1440 the crest
    ends at 1833, still inside the 1920 stage.
  */
  crest: { w: 393, left: 1440, top: 22 },
} as const;

/**
 * Page 01 · Product designs.
 *
 * ADAPTED. The design carries four 72.727px case rows between y 731.7 and the
 * footer. The real inventory is a growing list of cases plus a motion archive
 * that is a destination of its own rather than a table row, so the distance
 * from the fig caption to the footer at 1022.6 is redivided in sixteenths of
 * the module:
 *
 *   tableHeaderY  608.97                  clears the fig caption
 *   tableHeaderH   31.818   =  7/16       the column labels are one 11.5px line
 *   rowsY         640.79    = 608.97 + 31.818
 *   rowH          22.3777   = 290.91 / 13 cases, ending at 931.70
 *   motion.y      931.70
 *   motion.h       90.9     = 20/16       ≈ 3.4 case rows, landing on 1022.6
 *
 * `rowH` is the only one of these that moves. The band from `rowsY` to the
 * motion band is fixed at 290.91, so every case added redivides it: 36.364 at
 * eight, 32.323 at nine, 29.091 at ten, 26.4464 at eleven, 24.2425 at twelve,
 * 22.3777 at thirteen. The case name goes down with it, 34 to 28 to 25 to 23
 * to 21 to 19, and to 17 when the face became Monaco.
 *
 * The tight dimension is not the name, which has spare track to give at every
 * size it has taken. It is the `line` column, and it does not shrink with the
 * rows: `cellLine` is a flat 14px in 581.818 less 40 of padding, so 541.8 is
 * usable at every row count, and a `line` past roughly 82 characters wraps to
 * two lines and overflows a 22.4px cell into the rows above and below it. Keep
 * every `CaseRecord.line` inside that.
 *
 * The NAME column has its own ceiling now that a case is called "apple wallet
 * card sharing concept". Monaco is monospace, so this is arithmetic rather
 * than measurement: at -.03em tracking one advance is 0.57em, so 33 characters
 * at 17px draw 320 of the 363.636px track and leave 43 before the thesis
 * column. `cellName` is `white-space: nowrap`, so a name past about 37
 * characters spills into that column rather than wrapping. At 19px, which is
 * what Karrik carried, the same name drew 357 and touched it.
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
 * geometry. Case names drop from 34px to 19px to sit in the shorter row.
 */
export const PAGE1 = {
  headerH: 77.18, // handoff
  headerCols: '290.909px 363.636px 363.636px 1fr', // handoff
  title: { x: MODULE, y: 122, size: 200, lh: 158, track: '-.06em' }, // adapted y (was 149.9)
  thesis: { x: MODULE, y: 462, w: 727.27, size: 27, lh: 1.32, track: '-.015em' }, // adapted y
  panel: { x: 1090.9, y: 122, w: 727.27, h: 436.36 }, // adapted y (was 149.9)
  figCaption: { x: 1090.9, y: 572, w: 727.27 },
  /*
    Thirteen cases now. The band between `rowsY` and the motion band is fixed
    at 931.7 - 640.79 = 290.91, so the row height is that divided by the case
    count, and the name size follows it down: 36.364/34, then 32.323/28, then
    29.091/25, then 26.4464/23, then 24.2425/21, now 290.91/13 = 22.3777 with
    the name at 19. 13 × 22.3777 = 290.91, which puts the last rule on 931.70,
    still the motion band.

    The `line` column does NOT follow: `cellLine` is a flat 14px in a fixed
    581.818px column, so its ~82 character ceiling is the same at every row
    count. Only the name shrinks.
  */
  rowH: 22.3777,
  tableHeaderY: 608.97, // adapted
  tableHeaderH: 31.818, // adapted, 7/16 module (was one full row)
  rowsY: 640.79, // adapted — the rows fill exactly to the motion band at 931.7
  rowCols: '145.455px 363.636px 581.818px 145.455px 1fr', // handoff, inside the row anchor
  rowSplit: '1fr 218.181px', // adapted — row anchor, then the source column (3 modules)
  nameSize: 17,
  /** The motion archive band: full bleed, 20/16 module, sitting on the footer. */
  motion: { y: 931.7, h: 90.9, cols: '472.727px 1fr 327.272px', still: 68 },
  footer: { y: 1022.6, h: 57.4 }, // handoff
  gridLine: 2,
  gridPitch: MODULE,
} as const;

/**
 * Page 02 · Paintings.
 *
 * ADAPTED, and more than any other page. The design hangs four works in fixed
 * frames with a wall list of names beside them. The real inventory is twenty
 * paintings, and showing four of them is a hang, not a portfolio, so the frames
 * and the list are both gone and the whole band is one scrolling gallery.
 *
 * The band runs the full content width, x 112 to 1808, which is where the wall
 * list used to end. Vertically 360 to 910: the title block ends at 333 and the
 * footer's rule is at 932.
 *
 *   colW  536.67  = (1696 - 22 rail - 2 × 32 gap) / 3
 *
 * Three columns rather than four, because a work is never cropped here: at four
 * columns a 2:1 painting draws 200px tall and reads as a thumbnail. And rather
 * than two, because at 821px wide the three portrait works draw over 1500px
 * tall, which is nearly three windows for one painting.
 *
 * Measured with the real inventory: 2895px of scroll in a 550px window, columns
 * balanced within 165px, five works starting in view. Those five are the only
 * ones that get the dither reveal, which keeps the opening well under the 48
 * filter budget in `runtime/dither.ts`.
 *
 * `captionH` is unchanged and the plaque still sits INSIDE the work at its
 * bottom edge, overlapping it, exactly as the four frames did. That overlap is
 * the page's look and is why the gallery reads as the same page.
 */
export const PAGE2 = {
  frameInset: 40,
  frameWidth: 14,
  title: { x: 112, y: 172, size: 168, lh: 161.28, track: '-.05em' },
  header: { x: 78, y: 78, h: 58, gap: 44 },
  meta: { x: 112, y: 322 },
  captionH: 38,
  /** the scrolling gallery band, full content width */
  gallery: { x: 112, y: 360, w: 1696, h: 550 },
  galleryCols: 3,
  galleryGap: 32,
  /** the rust scroll rail, same idea as the subpages' prose columns */
  railW: 6,
  /**
   * A work this wide or wider spans two columns. At 3.19 and 2.65 the two that
   * qualify would otherwise draw 168px and 202px tall against a 38px plaque.
   * Everything else on this inventory sits at 2.44 or below and reads fine in
   * one column.
   */
  gallerySpanAspect: 2.6,
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
 * The chipotle subpage.
 *
 * Every number is MFNY_PAGE's, because the two screens are the same shape and
 * should stay legible as a pair: a plate on the left, prose beside it, a
 * glance column on the right. It is written out rather than aliased so the
 * two can diverge without one silently dragging the other with it.
 *
 * The one thing that differs is what the plate holds. mfny flips between two
 * views; this walks four, so `toggleY` carries a four-button radiogroup. Its
 * four labels (before, after, states, explorations) measure about 400px of the
 * plate's 727.27, so they fit on one row with room to spare.
 *
 * The title is 23 characters against mfny's 17. Measured in Karrik at 152px it
 * is 1363px wide from x = MODULE, well inside the 1774.5 available to a
 * matching right margin, so the display size does not have to come down.
 */
export const CHIPOTLE_PAGE = {
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
  /** the four-way view walk, directly under the caption it changes */
  toggleY: 828,
  /** the one door: the interactive prototype */
  doors: { x: MODULE, y: 886, w: 727.27, h: 66, gap: 12 },
  text: { x: 836.36, y: 336, w: 654.54 },
  glance: { x: 1527.27, y: 336, w: STAGE.w - MODULE - 1527.27 },
  glanceRowsY: 380,
  secBarH: 34,
  secBarGap: 12,
  railW: 6,
} as const;

/**
 * The lee subpage.
 *
 * CHIPOTLE_PAGE's numbers, for the same reason chipotle took MFNY_PAGE's: the
 * three screens are one shape and should stay legible as a family. Written out
 * rather than aliased so any one of them can diverge without dragging the
 * others with it.
 *
 * Two things differ.
 *
 * The plate walks SIX views rather than four, so the toggle row is longer. Its
 * six labels (script, notes, record, ring light, takes, wireframes) measure
 * about 660px of the plate's 727.27 at 13px with .16em tracking, which fits on
 * one row but is close enough that a seventh would have to wrap. A seventh view
 * means shortening labels, not adding a row.
 *
 * And the title is three characters against chipotle's twenty three. At 152px
 * it draws about 240px wide, which leaves the title block far emptier than its
 * siblings, so the descriptor beneath it does more of the work here. The size
 * stays 152 anyway: a short word set at the family's own display size is the
 * whole point of having a family.
 */
export const LEE_PAGE = {
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
  /** the six-way view walk, directly under the caption it changes */
  toggleY: 828,
  /** two doors: the prototype and the wireframe exploration beside it */
  doors: { x: MODULE, y: 886, w: 357.63, h: 66, gap: 12 },
  text: { x: 836.36, y: 336, w: 654.54 },
  glance: { x: 1527.27, y: 336, w: STAGE.w - MODULE - 1527.27 },
  glanceRowsY: 380,
  secBarH: 34,
  secBarGap: 12,
  railW: 6,
} as const;

/**
 * The guestpass subpage.
 *
 * LEE_PAGE's numbers, which are CHIPOTLE_PAGE's, which are MFNY_PAGE's: four
 * screens, one shape, kept legible as a family. Written out rather than
 * aliased so any one of them can diverge without dragging the others.
 *
 * The one number that had to move is the title size. This case is called
 * "apple wallet card sharing concept" at the author's request, which is 33
 * characters against chipotle's 23. Karrik at 152px measures about 59px a
 * character at this tracking, so 33 characters would draw ~1957px against the
 * 1774.5 available between the module margins, and the title would run off the
 * right edge. 132 measures 1744 in Karrik and ends at x 1817, which is 30px
 * clear of the 1847.3 right margin.
 *
 * MEASURE BOTH FACES, and take the wider. The title takes the Dessign Maison
 * alternate at TITLE_ALT, and that face is much narrower here: 1501 against
 * Karrik's 1744 at the same size. A check that samples the title more than
 * about 1.4s after the screen opens reads only the narrow state. The first
 * pass at this number did exactly that, called 136 clear by 183px, and shipped
 * a title overflowing its margin by 23px in the state it actually rests in.
 *
 * Five views, so the toggle row is shorter than lee's six and there is room.
 */
export const GUESTPASS_PAGE = {
  headerH: 62,
  footerH: 88,
  /** 132, not the family's 152: a 33 character title does not fit at 152. */
  title: { x: MODULE, y: 88, size: 132, lh: 127, track: '-.05em' },
  descriptorY: 246,
  metaY: 286,
  ruleY: 318,
  bandY: 336,
  bandEnd: 976,
  plate: { x: MODULE, y: 336, w: 727.27, h: 436.36 },
  plateCaptionY: 788,
  /** the five-way view walk, directly under the caption it changes */
  toggleY: 828,
  /** the one door: the full case, hosted here with both prototypes in it */
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
