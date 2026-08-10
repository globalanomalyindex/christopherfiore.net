# Analysis of the lattice handoff

Written against the kit as delivered, checked against the repo at
`cc49f7a`. This is my reading of it, what I verified, and what I found wrong.
The kit's own documents are unchanged beside this one.

## Restore points

Made before anything was touched. Any of the three restores the site exactly:

| What | Where |
|---|---|
| git tag | `v1-editorial-laundered-cotton` (pushed) |
| git branch | `pre-swiss-redesign` (pushed) |
| archive | `~/portfolio-backups/portfolio-2026-08-10-pre-swiss.tar.gz` (182 MB) |

`git reset --hard v1-editorial-laundered-cotton` puts main back.

## What the kit is

A Swiss-minimalist redesign of two screens, built on one idea: an ambient
lattice of ASCII `+` crosshairs on a fixed module, where **every frame's four
corners land exactly on a lattice point**. A component's corner mark is never
drawn; it is the background peg at that intersection, switched on.

Ten files, 468 kB. The typeface it ships is byte-identical to the one already
in `public/fonts` (sha256 `1542d39d…`), so there is no font work.

## Verified

Everything below I checked rather than took on trust.

| Claim | Result |
|---|---|
| Every 2a frame corner lands on a point | **0 off-lattice** (7 frames, 28 corners) |
| Every 2b block corner lands on a point | **0 off-lattice** (13 blocks, 52 corners) |
| `1920 % step === 0` and `1080 % step === 0` | holds for both (40 and 30) |
| 2a cell count | 47 × 26 = **1222**, as built |
| `solveLattice` is idempotent | **identical DOM** on a second run |
| Three distinguishable peg weights | 10px off, 16px major, 22px corner, plus transparent |
| The drift visibly crosses the field | **1209 of 1222** cells changed over 1.4s |
| No peg glyph intersects any type glyph | **0 overlaps** (after the fix below) |

## What I found wrong

### 1. The mosaic has no room for five of the thirteen cases · BLOCKING

The 2b rail reads `13 cases · 58 motion studies`. The block table beneath it
has **eight case blocks** plus the motion archive:

> after tokens · apple wallet card sharing · chellbook · lee · motion archive ·
> mfny concentrates · chipotle app ui cleanup · one master affordance · df2tm

With no home: **adhd mode, campeón, chickpea, wildcard, dither**. The kit is
internally inconsistent here, and the mosaic is vertically full — content runs
y 300…960 in rows of 240, 240, 180, with the footer rail at 960. There is no
tenth slot without changing the design.

This is the one thing I will not guess at. Options and trade-offs are in the
question I raised; nothing else in the conversion is blocked by it.

### 2. The occlusion constant does not satisfy the kit's own assertion

`LATTICE.md` §2.4 specifies the occlusion band as
`±(fontSize × 0.30 + step × 0.16)` around a line's optical center.
`DO-NOT-BREAK.md` §5.2 requires **zero** peg/type overlaps.

At the wordmark's 128px the formula clears ±44.8px while the glyphs reach
roughly ±64. Measured on the real face: **8 pegs printed through the
wordmark.**

Fixed by deriving the band instead of tuning it. A text run's client rect is
already its font box, which is taller than its ink, so using the rect and
adding half a peg glyph is conservative in the right direction and holds at
every size. A tuned ratio can only be right at the size it was tuned at.
Overlaps went 8 → 3 → 0.

### 3. `LATTICE.md` §1 misstates 2b's first point

The table says first point `(60, 60)`. With container origin `(15, 15)` and
step 30, the first point is at **(30, 30)** — 60 is the first *major*. The
geometry elsewhere is consistent; only this cell is wrong. Worth knowing
because a reader who trusts it will build the field one step short.

### 4. `DO-NOT-BREAK.md` §1 has a stale row number

It says "Row 02 (chellbook) is a `<button>`". In the repo chellbook is case
**03**; case 02 is `apple wallet card sharing concept` (subpage `guestpass`).
The 2b block table itself has the order right, so this is prose drift, not a
geometry error. Both are `<button>` with `href: null` and a `subpage`, so the
underlying instruction still holds — it just names the wrong row.

### 5. Structural changes the kit implies but does not call out

- **The contact strip becomes a channel cell.** 2a has four equal 360×240
  cells; today contact is a full-width 132px strip with its own
  `.ps-contact-strip` inversion and `MENU.contactRect`. Page 04 already exists,
  so this is clean, but `contactStripH`, `contactRect` and that CSS all retire.
- **The channel cells stop being different widths.** Today they are 800 / 480 /
  640; 2a makes them four 360s. The `data-rect` values that drive the
  grow-into-page transition all change with them.
- **The wordmark becomes one line at 128px with no space** —
  `perfectionsynthétique`. Today it is two lines at 240px. That is a brand
  change, stated verbatim in the kit as "from the Figma file", and it is worth
  a conscious yes rather than arriving as a side effect.

### 6. Claims that check out

- `df2tm`'s meta `shipped · claude code plugin` matches the repo's
  `evidence: 'built'` and its caption. No evidence language is strengthened.
- `one master affordance` is `simulated` in both. Correct.
- The 424-page master publication with its byte count and sha256 lives in
  `src/data/blsp-case.ts` on channel 03's subpage, which this redesign does not
  touch. `DO-NOT-BREAK.md` §1's mention is a don't-regress note.

## Order of work

The kit's own order, which is right, with the blocking item isolated so
everything else can proceed.

| # | Step | Files | Blocked? |
|---|---|---|---|
| 1 | Lattice primitive | `design/lattice.ts`, `runtime/lattice.ts` | done |
| 2 | Screen 2a, the menu | `pages/menu.ts`, `design/layout.ts` | no |
| 3 | Hover: band host, 8% accents, lattice fill | `runtime/hover.ts`, `glitch.ts` | no |
| 4 | The four channel personalities | `runtime/channels.ts`, `styles/menu.css` | no |
| 5 | Screen 2b, the index | `pages/products.ts` | **yes, on the 13-vs-8 question** |
| 6 | The open transition | `runtime/transitions.ts` | no, but depends on 2–4 |

## Risk register

- **The lattice is desktop only.** Below 900px `src/mobile.ts` ships a plain
  document view and must not receive it. Scaling a 1920 stage to 390px renders
  13px metadata at ~2.6px.
- **1222 and 2205 extra DOM nodes.** Generated in JS, zero bytes over the wire,
  but they are real nodes and the resolve pass walks all of them. The pass is
  debounced at 90ms and never runs from `requestAnimationFrame` — a screen that
  loads hidden never gets a frame and would sit unsolved until a resize.
- **Solving before `document.fonts.ready` measures the fallback.** This cost me
  the three residual overlaps in finding #2 and it does not look like a bug; it
  looks like a rounding error. `watchLattice` wires fonts, resize,
  visibilitychange and a mutation observer.
- **Restoring a peg by clearing its inline color paints it black.**
  `style.color = ''` inherits near-black. Every restore writes a named value
  from `dataset.base`.
- **Name collisions on shared state.** The drift's row cursor is `sweepRow` and
  never `sweep`; the kit reports a day lost to a counter overwriting a method of
  the same name.
