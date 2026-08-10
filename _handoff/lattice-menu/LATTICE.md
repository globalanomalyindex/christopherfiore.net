# The lattice

The whole system. Read this before touching a page builder.

## 1. Geometry

Per screen, one lattice, described by six numbers:

| Screen | step `st` | cols | rows | first point | major stride `mk` | major offset |
|---|---|---|---|---|---|---|
| 2a menu | 40 | 47 | 26 | (40, 40) | 3 | col ≡ 2, row ≡ 2 (mod 3) |
| 2b index | 30 | 63 | 35 | (60, 60) | 2 | col ≡ 1, row ≡ 1 (mod 2) |

The container is a CSS grid, `repeat(cols, st px)` / `grid-auto-rows: st px`,
offset by `-st/2` from the first point so that each cell's CENTER is a lattice
point:

```
2a: left 20  top 20  width 1880  height 1040   (47×40, 26×40)
2b: left 15  top 15  width 1890  height 1050   (63×30, 35×30)
```

Each cell holds one `<span>+</span>`, flex-centered, `line-height: 1`. The
index of a point is `row * cols + col`; that indexing is used by every pass
below, so keep the grid a flat list of cells in row-major order.

**Why cell centers, not grid lines:** a point at x = 0 would be half-clipped at
the canvas edge. Centering inside cells puts the first point a half-step in and
the last a half-step from the far edge, so nothing is ever cut off. This is a
hard requirement of the brief ("everything must perfectly fit… no cutting off").

**Module arithmetic.** 1920 and 1080 share the divisors 120, 60, 40, 30, 24.
Both screens' steps and modules are drawn from that set, which is why the grid
divides the canvas evenly. If a future screen wants a different module, it must
come from that list — 96 and 64 do not divide 1080 and will produce a partial
row.

## 2. The three peg states

Resolved by one idempotent pass (`solveLattice()` in the prototype; make it a
runtime module — see `INTEGRATION.md`). Order matters.

1. **Reset.** Every point → micro: `font-size` unset (9–10px), color `#DFE4E6`.
2. **Majors.** Points on the module stride → `font-size` 16px (2a) / 13px (2b),
   color `#A9B2B7`.
3. **Frame corners.** For every framed element, map its four rendered corners
   back to lattice indices and set those points to `#28262E` at major size + 6px.
   Corners are derived from `getBoundingClientRect()`, never hard-coded, so a
   copy edit that resizes a block re-solves its corners for free.
4. **Occlusion.** Any point whose glyph would land inside a run of type is set
   to `transparent`. Walk text nodes, take each `Range`'s client rects, and
   clear points within `±(fontSize × 0.30 + st × 0.16)` of the line's optical
   center, horizontally bounded by the rect. **This is not optional** — a
   120px-module lattice puts a row through the optical center of every
   two-module frame, which is exactly where centered type sits.

Store each point's resolved value on the element (`dataset.base`). Every
animation restores from `dataset.base`, never from a color captured at
animation start — the resolve pass can run mid-hover (fonts loading, resize)
and a captured value would put a corner back as ambient.

Re-run the pass on: mount, `document.fonts.ready`, resize, `visibilitychange`,
and whenever nodes carrying `[data-peg]` / `[data-frame]` are added. Debounce
90ms. Do **not** drive it from `requestAnimationFrame` — a page that loads
hidden never gets a frame and the lattice would stay unsolved until the first
resize.

## 3. Ambient drift

The site's frost/dither field, expressed in crosshairs.

```
tick        every 120ms
phase       t += 0.12 per tick
sweep       3 rows per tick, cycling (sweepRow += 3, mod rows)
wave        n = 0.5 + (sin(x·0.0026 + t) + sin(y·0.0031 − t·0.7)) / 4
threshold   bayer(col,row) < n × 0.68  →  #9AA6AD   else  #DFE4E6
```

`bayer` is the ordered-dither 4×4 the site's transitions already use:
`[0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5]`, indexed `(row%4)*4 + col%4`,
returned as `(v + 0.5) / 16`.

Two rules learned the hard way:

- **Sweep rows, don't sample at random.** Updating N random cells per tick
  scrambles the wave into noise; sweeping bands makes it read as a wave crossing
  the plate.
- **No CSS transition on the peg color.** A `transition: color` smooths the
  dither into mush. It must snap. (If you want softness, do it in the wave, not
  in the easing.)

Skip the whole loop under `prefers-reduced-motion: reduce`.

Points with a `dataset.base` (majors, corners, occluded) are never touched by
the drift, and neither are points currently lit by a hover.

## 4. Hover

Three layers, in this z-order:

```
z 0   band host   the solid band stack   (existing hover.ts treatment)
z 1   lattice     the crosshairs
z 2   content     rails, labels, blocks
```

The band paints UNDER the lattice — that is what lets the crosshairs stay
visible over a vivid band, and it is the reason the band lives in a
screen-level host rather than inside the button.

**Band stack** — as `src/runtime/hover.ts` already builds it: one main band
from `SPARK_LIGHTS`, darker `SPARK` accents, a `1.5px` inset `#1A1820`
outline, each layer wiping in from its own random direction with ±7.5px jitter
on `steps(5,end)`. One change from the current code: **cap the accent rows at
8% of the height** (2–8% top, 2–8% bottom). The existing 56–80% main band lets
an accent row fall under a two-line block's meta line, where near-black ink on a
near-black accent is invisible. The corner-tick construction in `mkTicks` is no
longer needed here — the lattice provides the corners.

**Lattice fill** — the component's own cells only (no ring outside it):

```
color     one hue from HUES; top/bottom 14% of the block take a SPARK_LIGHTS accent
size      grow to the major size
reveal    threshold = bayer × 0.45 + travel × 0.5, ramped 0.17 per 40ms
travel    normalized distance along one of four randomly chosen edges
held      re-dither 5 random cells per 140ms — but never a cell whose target is ink
```

**Type on a band** — `hover.ts`'s `hlInk` contract, extended: pin **every**
text descendant that carries its own inline color to `#1A1820`, not just the
button. Secondary spans (`#56535E`) otherwise beat the inherited pin and drop
out over a band. Restore the original values on leave.

**Letter glitch** — `src/runtime/glitch.ts`, unchanged in mechanism: wrap the
label's characters, then on a 22ms tick swap each to `font-feature-settings:
'salt' 1, 'ss01' 1` in a `FLASH` color. Two changes: leave ~30% of letters
colored when the run-in settles, and keep firing FLASH colors on random letters
for as long as the cursor is inside (the old version settled flat after one pass
and read as "the glitch is gone").

## 5. Per-channel personalities (2a)

Recreated from `src/runtime/channels.ts` and `src/styles/menu.css`. Each
channel keeps its identity but expresses it in the lattice.

**01 product designs** — `channels.ts` 168–199. The fill floods radially out of
the module the cursor entered (`threshold = distance/maxDistance × 0.86 + bayer
× 0.13`), and the cursor scaffolding becomes a fully lit ink row and column
through the cursor's cell. Both re-solve on `pointermove`, plus the
`col NN · row NN` callout — module index within the block, 1-based, zero-padded.
Nothing here runs on a timer: it moves only when the pointer moves.

**02 paintings** — the inset frame. A one-cell-thick ink ring of crosshairs just
inside the implied edge (on 2a's button: x 40–320, y 40–200, 22 points), the
interior dithering in the band hue. Inset by ONE CELL, not one module: a
two-module-tall block has no room for a module of inset, and the single row it
would land on is the label's. The old 10–14px CSS frame is gone — every hover
border is now the same 1.5px inset outline.

**03 competizione** — the racing board. Whole modules of filled crosshairs
alternating like the 48px checker, marching one square right per 320ms beat:
`on = ((floor(dCol/mk) + floor(dRow/mk) + phase) & 1) === 0`, on-squares ink at
major size + 3px. This replaces the CSS flag rows. If you keep any CSS flag,
mask it away from the type as `.ps-flagmask` does — the dark squares are edge
accents and must never carry type.

**04 contact** — inversion, as `.ps-contact-strip`: band `#1A1820`, type and
crosshairs `#E9EDEE`, outline `rgba(233,237,238,.5)`. Two specifics: the frame
corners must flip to paper here (ink would vanish into the band), and this
channel does **not** run the held flicker — the contact strip simply inverts.

## 6. New tokens

Add to `src/design/tokens.ts`. Everything else already exists there.

```ts
/** The ambient, switched-off crosshair. */
export const PEG_OFF   = '#DFE4E6';
/** A crosshair the drift has passed over. */
export const PEG_ON    = '#9AA6AD';
/** A crosshair on the module — the visible grid. */
export const PEG_MAJOR = '#A9B2B7';
/** A crosshair a frame corner has switched on. Same value as COLOR.ink. */
export const PEG_CORNER = COLOR.ink; // #28262E
```

Type sizes used, all existing scale members: 9/10 (crosshair micro), 13
(rail/meta/callout), 13/16 (crosshair major), 15 (standfirst), 20, 26, 36, 48
(channel label), 88 (page title), 128 (wordmark). Display sizes carry
`letter-spacing: -.02em`; micro carries `.06em`; the 13px channel number
carries `.1em`.
