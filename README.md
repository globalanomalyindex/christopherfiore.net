# perfection synthétique

The studio portfolio of christopher robin fiore — a single 1920×1080 stage
holding a menu and four full-bleed channel pages. Clicking a channel grows that
cell into its page; closing reverses the same motion. No routing, no page loads.

Built from two handoffs:

- **`_source/design_handoff_perfection_synthetique/`** — the design. A
  high-fidelity HTML prototype plus a README that fixes every colour, type
  size, inset, duration and easing curve.
- **`_source/christopher-fiore-portfolio-devkit-v31/`** — the content. Every
  authored asset from the previous site, byte-for-byte, with structured JSON
  for the profile, seven project records, twenty paintings, the motion archive
  and the Branchial Lateral Spine evidence package.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

`npm run build` typechecks then emits a self-contained static bundle to
`dist/`. `vite.config.ts` sets `base: './'`, so the bundle can be dropped in a
subdirectory or served from any host without rewriting asset URLs.

## Layout

```
src/
  data/          content, transcribed from the devkit JSON
  design/        tokens.ts (colour, timing, type) and layout.ts (stage geometry)
  runtime/       the animation engine
    dither.ts      the ordered-dither primitive every transition is built on
    frost.ts       the background canvases
    glitch.ts      per-letter font glitching and the idle wordmark loop
    hover.ts       the in-page band-stack button treatment
    channels.ts    the three per-channel menu hover personalities
    transitions.ts menu ↔ page choreography
    stage.ts       1920×1080 scaling
    actions.ts     one delegated event binder
    state.ts       the six pieces of stage state
  pages/         menu, products, paintings, competizione, contact
  styles/        ported CSS, one class per prototype style-hover
  mobile.ts      the phone document view
public/          fonts, the bayer matrix, and every image from the devkit
```

`PORT_CONTRACT.md` documents the module boundaries and the non-negotiables.

## Content mapping

| Channel | Holds |
|---|---|
| 01 Product designs | eight cases: seven link to their live demo, and chellbook (row 02) opens a case study in the stage. A full-width motion block below them opens the 58-study archive |
| 02 Paintings | 20 works rotating through four frames; every frame and row links to its ArtStation record |
| 03 Competizione | one entry — branchial lateral spine (Kona N) — over a full case-study subpage with all twelve sheets uncropped and the 424-page master publication |

Two channels carry an in-stage case study: `src/pages/evidence.ts` (Kona N) and
`src/pages/chellbook.ts`. Both grow out of the element that opened them, both
show their sheets `object-fit: contain`, and both close top-left.
| 04 Contact | email, GitHub, ArtStation, LinkedIn, and the profile table |

## Two things that are arithmetic, not taste

**Painting rotation periods.** The four frames are two portrait (400×500) and
two landscape. Works are partitioned by orientation because `object-fit: cover`
does not scale a mismatched work, it crops it — a 1904×597 panorama in a
400×500 frame shows 19% of its width. That leaves a pool of 3 portrait works
against 17 landscape ones. A pool of `W` works feeding `S` frames that each turn
every `P` ms serves a turn every `P/S`, so a work returns every `W × P / S`. At a
shared 7s that is 59.5s on the wide frames and **10.5s** on the tall pair, which
reads as a loop. So each pool derives its own period from `MIN_REPEAT` (45s):
wide frames stay at 7s, tall frames go to 30s, and nothing returns to a frame
inside 90s. Measured, not assumed. Adding portrait-format paintings speeds the
tall pair back up with no code change — that is the only real fix for their
slower tempo.

**Page-01 row heights.** Seven case rows, a table header and a motion band twice
a row tall all fit between the fig caption and the footer at 1022.6, on module
fractions. See `PAGE1` in `src/design/layout.ts`.

## Copy conventions

- **American spelling.** The perfection synthétique handoff is written in
  British English and the Chellbook one in American; the site follows American
  throughout, including in comments.
- **No em-dashes in copy we author**, including accessible names, where a comma
  or colon does the same job. The four `next — NN` footer controls keep theirs
  because that string is the design handoff's own, carried verbatim from the
  prototype.

## Departures from the two handoffs

These were judgement calls. They are marked in the code where they happen.

1. **Page 01 holds seven case rows and a motion band, not four rows.** The
   design was drawn against four placeholder cases. Each row is now a real link
   to its live demo — which is also what earns it the band-stack hover, since
   `wireHovers` binds real links — with the source repo as a separate,
   non-nested link. The motion archive is not a row at all: it is a full-width
   band twice a row tall carrying the eight-still filmstrip and its own open
   affordance. Title, thesis, key-frame panel, header and footer keep their
   handoff geometry.

2. **Page 03 holds one entry, not three concepts or four plates.** The
   prototype's "tipo 04 / lavender arrow / hazard" were invented. Competizione
   is one project — branchial lateral spine — so the index is one substantial
   block carrying its name, class, year, state, descriptor and standfirst, and
   the freed column holds the five real functional assemblies. The plates are
   sheets inside the case study, not siblings of it.

3. **The paintings wall list carries 20 rows, not 11**, at 26px instead of
   40px, and `state` maps to the devkit's own sets — `hung` / `selected` /
   `archive` — instead of the invented `hung` / `store`.

4. **The contact table lost two rows.** "two working days" and "logo contests,
   dashboards nobody reads" were flagged as unverified in the design handoff;
   they are replaced with facts from `data/profile.json`.

5. **There is a mobile layout.** The design handoff says a phone layout is a
   separate design task. That is right as a design instruction, but scaling the
   stage uniformly to a 390px viewport renders the 13px metadata at ~2.6px, so
   `src/mobile.ts` ships a plain document view of the same content below 900px.
   It is a placeholder for a real phone design and says so in its own footer.

6. **The paintings wall list sits on a lavender panel** with the same 1px rust
   hairline the work frames carry. The design floats it straight on the
   drifting field, which worked for eleven rows in a calm band; twenty rows
   reach into the busy part and 13px names stop being readable. This is the
   page's own answer to its own problem — the opaque caption plaques exist for
   exactly this reason.

7. **The five Kona N renders ship as WebP, not PNG.** They arrived as 1.4–2.1MB
   PNGs and all five load when Competizione opens — 8MB for one screen. They
   are photographic renders, so PNG was the wrong container: WebP q82 is 90%
   smaller with no visible difference at the size they display. The originals
   are untouched in `_source/`. Regenerate with `scripts/optimize-images.mjs`.

8. **`public/` carries only what the site references.** Nine legacy project
   covers were being shipped and never loaded. They are still in `_source/`
   byte-for-byte.

9. **Channel 03 has a case-study subpage.** All twelve Kona N sheets live
   there at `object-fit: contain` — never cropped — beside the full case study
   transcribed from the live site: the product decision, five assemblies,
   anatomy, the produced/open evidence split, the R1→R2 gate ladder, the
   limitation sentences and the closing statement. It is a full-stage screen in
   the same system, not a dialog: `src/pages/evidence.ts` builds it,
   `src/runtime/evidence.ts` grows it with the same clip-path grow, dither veil
   and pulsing settle the pages use, and close is top-left. Sheets load lazily,
   so opening it costs ~330 kB rather than 1.7 MB.

   The 424-page master publication is the one real download on the page, printed
   with its byte count and SHA-256 so a reader can confirm the file matches the
   manifest record. The thirteen archive volumes are not hosted and are
   deliberately not enumerated.

10. **Row 02 is a button, not a link.** Chellbook has no deployed app — it is 30
    designed screens and two self-contained HTML prototypes. Its record carries
    `href: null` and `subpage: 'chellbook'`, so the row opens a case study in
    the stage and both prototypes are the headline of that screen. Its evidence
    tag is `concept`, not `built`: "live" would claim a product that does not
    exist. `src/pages/chellbook.ts` mounts inside page 01 the way the Kona N
    case study mounts inside page 03.

    Its safety language is copied verbatim and is not editorial. Chellbook is a
    coeliac product whose own handoff calls several of its rules "legal
    constraints, not preferences": Verified means supported by published
    information and is explicitly **not a promise of absolute safety**, and
    Unknown **may never be rounded up to Verified**. The four states render in
    the product's own wash and ink, with the 1px dashed edge on Unknown alone —
    absence of information must never be renderable as a pass. The six
    undesigned questions ship alongside the features.

## Payload

Measured in a real browser against the built bundle:

| Screen | Transferred |
|---|---:|
| menu (incl. fonts, JS, CSS) | 616 kB |
| product designs | 669 kB |
| competizione | 134 kB |
| kona n case study | 328 kB |
| paintings | 3,556 kB |
| mobile (whole document) | 796 kB |

The 424-page master publication (42 MB) ships in `public/documents/` and is only
transferred when someone clicks it. Paintings is the heavy screen: the hung
works are the artist's own JPEG exports at 1500–1600px. Converting them to WebP
would cut it to roughly 600 kB — a re-encode of original artwork, so it is the
artist's call, not the build's.

## Evidence language

Several records carry qualifiers that are load-bearing and must not be
strengthened when copy is edited:

- Branchial Lateral Spine is **R1 production-intent**, **measurement-gated**,
  and **not road or track released**. Installed views are **concept
  visualization only**; system plates are **design hypothesis, not measured
  airflow**. The evidence viewer's twelve captions in `EV_SHEETS` are copied
  character-for-character from the devkit's `visuals[]` and
  `publication_pages[]`, and it prints the unabbreviated release boundary under
  its index. It shows each sheet at 1236px, which makes it the screen where a
  softened qualifier would do the most damage.
- `one master affordance` and `campeón` are **simulated**, not tested with
  users. `wildcard` is **tested logic** from a preregistered study whose first
  comparison was unfavourable.
- ArtStation records are references. No ArtStation content is bundled here.

## Fonts

`Karrik-Regular.otf` and `SLTFDessignMaison-Regular.otf` ship in `public/fonts`.
Both design handoffs flag these as **licence check required before shipping** —
webfont redistribution rights are the release owner's responsibility.
