# Do not break

The redesign changes how the menu and page 01 look. It must not change what the
site *is*. Everything below is load-bearing and verified working today.

## 1. Links and connectivity

- **Page 01's rows are real links** to their live demos, each with the source
  repo as a separate, non-nested link. `wireHovers` binds hovers by finding
  elements whose `cursor` computes to `pointer` and whose parent's does not —
  so nesting a link inside a link, or putting the label in a child that also
  gets `cursor: pointer`, silently changes which element gets the band.
- **Row 02 (chellbook) is a `<button>`, not a link.** `href: null`,
  `subpage: 'chellbook'`. It opens a case study in the stage. Its evidence tag
  is `concept`, not `built`.
- The motion archive is a full-width band, not a row, and opens the 58-study
  archive.
- Channel 03's case study and the 424-page master publication download must keep
  their byte count and SHA-256 printed beside them.
- Every external reference (`github.com/globalanomalyindex`,
  `artstation.com/chrisfiore`, `linkedin.com/in/christopherrobinfiore`,
  `chrisrobinfiore@gmail.com`) stays exactly as written.

## 2. Interaction states

- Every hover has a matching `:focus-visible` that produces the same state, on
  top of the two-tone ring from `base.css`. The lattice fill and the band stack
  must both be reachable by keyboard — `hover.ts` already ORs pointer and focus
  into one `refresh()`; keep that shape.
- `prefers-reduced-motion: reduce` must collapse the drift entirely, flatten the
  band stack to a single full-height band, and skip the letter glitch. Read it
  off the stage (`state(stage).reduced`) where a stage is reachable.
- `data-nohl` and the `EXCLUDE` selector opt elements out of the generic hover.
  Channel cells are excluded because `channels.ts` owns them. Do not widen the
  binding to `[data-btn]`-style attributes without re-checking that list.
- The interaction lock after the intro (`TIMING.INTRO_LOCK`, 2300ms) still
  applies. The new transition must not be clickable during it.

## 3. The legibility contract

From `tokens.ts`, and it is not stylistic:

- Type only ever sits on a band drawn from `SPARK_LIGHTS`; the ink on such a
  band is always `#1A1820`. Darker `SPARK` members are **edge accents that
  never carry type** — hence the 8% cap on accent rows and the checker being
  masked away from the label.
- `ink` on `paper` and `paper` on `ink` are both 12.7:1. `drape` (#AEB6BA) is
  1.8:1 on paper and fails as a reading color **on purpose** — nothing
  important may drift into it. The crosshairs are decoration and may sit in that
  range; text may not.
- `#28262E` leans bruise-violet rather than neutral and cannot be substituted
  on contrast grounds. A neutral grey of the same value measures identically and
  reads dead.

## 4. Copy and evidence language

- American spelling throughout. **No em-dashes in authored copy** — a comma or
  colon does the same job. The four `next — NN` footer controls keep theirs
  because that string is the design handoff's own.
- Qualifiers that must never be strengthened when copy is edited: Branchial
  Lateral Spine is **R1 production-intent**, **measurement-gated**, and **not
  road or track released**; installed views are **concept visualization only**;
  system plates are **design hypothesis, not measured airflow**.
  `one master affordance` and `campeón` are **simulated**, not tested with
  users. Chellbook's Verified state is **not a promise of absolute safety** and
  Unknown **may never be rounded up to Verified**.
- ArtStation records are references; no ArtStation content is bundled.

## 5. Assertions worth writing as tests

1. Every `[data-frame]` corner maps to an integer lattice index on both screens
   (0 off-lattice corners). This is the whole system's invariant.
2. No peg glyph's ink box intersects any text ink box (0 on both screens).
   Beware the false positive: compare the **glyph** box, not the grid cell.
3. After any hover cycle the lattice returns exactly to its resolved state —
   corner count, occluded count, and 0 cells left holding a hue.
4. After the transition's teardown: 0 bands in the host, 0 shells, every label's
   markup and opacity restored, drift running again.
5. `1920 % step === 0` and `1080 % step === 0` for every screen's lattice.

## 6. Scope

- The lattice is a **desktop stage** treatment. Below 900px the site ships
  `src/mobile.ts`, a plain document view — scaling a 1920 stage to 390px renders
  13px metadata at ~2.6px. Do not mount the lattice there; the phone layout is
  still a separate design task.
- Payload: the menu currently transfers 616 kB including fonts, JS and CSS. The
  lattice adds 1222 DOM nodes on 2a and 2205 on 2b and no new bytes over the
  wire. Generate the cells in JS; do not ship them as markup.
