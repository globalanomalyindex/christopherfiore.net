# Task list

Six changes, in dependency order. Each is independently reviewable and leaves
the site working. Numbers in brackets point at the spec.

## 1. The lattice primitive

**New:** `src/design/lattice.ts`, `src/runtime/lattice.ts`

- Per-screen config: step, cols, rows, first point, major stride and offset
  [LATTICE §1]. Assert `1920 % step === 0 && 1080 % step === 0`.
- `mountLattice` builds the CSS-grid container and its cells in JS. Cell centers
  are the lattice points; the container is offset by `-step/2` so nothing clips.
- `solveLattice` resolves the three states in order: reset → majors → frame
  corners → occlusion [LATTICE §2]. Idempotent. Corners come from
  `getBoundingClientRect()`, never hard-coded. Store the result on each cell.
- `startDrift` runs the wave [LATTICE §3]: 120ms tick, 3 rows swept per tick,
  Bayer threshold, snap (no CSS transition on color), skipped under reduced
  motion.
- Debounce the resolve at 90ms; re-run on mount, `fonts.ready`, resize,
  `visibilitychange`. **Not** via `requestAnimationFrame`.

**Done when:** the lattice renders on a scratch page in three distinguishable
weights, the wave visibly crosses it, and `solveLattice` twice in a row produces
identical DOM.

## 2. Screen 2a — the menu

**Changed:** `src/pages/menu.ts`, `src/design/layout.ts`

- Add the 2a frame table to `layout.ts` [README §Screens]. Seven frames.
- Rebuild the menu to it: two rails, the wordmark, four channel cells at
  240/600/960/1320 × 600, each 360×240, sharing corner points. No gaps.
- First two children of the stage: the band host (z 0) and the lattice (z 1).
  Content is z 2 [LATTICE §4].
- Keep `data-channel` on the cells so `channels.ts` and `hover.ts`'s `EXCLUDE`
  keep working [DO-NOT-BREAK §2].
- Copy verbatim from README §Screens. American spelling, no em-dashes
  [DO-NOT-BREAK §4].

**Done when:** zero off-lattice frame corners and zero crosshair/type overlaps,
asserted as tests [DO-NOT-BREAK §5].

## 3. Hover

**Changed:** `src/runtime/hover.ts`, `src/runtime/glitch.ts`

- Move the band stack into the screen-level band host so the lattice paints over
  it. Cap accent rows at 8% of height. Drop the corner ticks from this
  treatment — the lattice provides corners now.
- Extend `hlInk` to pin every inline-colored text descendant, not just the
  target, and restore the originals on leave [LATTICE §4].
- Add the lattice fill: the component's own cells only, no ring, revealed in
  Bayer + directional-travel order, grown one size step.
- `glitch.ts`: leave ~30% of letters colored at settle, and keep firing FLASH
  colors while the cursor is inside. Idle wordmark loop gains a color band
  behind ~60% of glitching letters with ink pinned on it.

**Done when:** a hover cycle leaves the lattice bit-identical, and every hover
has a working `:focus-visible` twin.

## 4. Channel personalities

**Changed:** `src/runtime/channels.ts`, `src/styles/menu.css`

Recreate all four in the lattice [LATTICE §5]: 01's radial flood from the
entered module plus pointer-tracked guides and the `col NN · row NN` callout;
02's one-cell inset ink ring; 03's marching checker squares; 04's inversion,
including flipping its frame corners to paper and running no held flicker.

Delete the 14px paint frame and the `.ps-flag-*` rules. Every hover border is
now one `1.5px` inset outline.

**Done when:** 01's guides move only when the pointer moves; 03's dark squares
never touch the label; 04 is legible paper-on-ink including its corners.

## 5. Screen 2b — product designs index

**Changed:** `src/pages/products.ts`, `src/design/layout.ts`

Rebuild page 01's index to the 2b block table [README §Screens] on the same
primitives. Rows stay real links; row 02 stays a `<button>` with
`subpage: 'chellbook'`; the motion archive stays a full-width band
[DO-NOT-BREAK §1].

## 6. The open transition

**Changed:** `src/runtime/transitions.ts`

Implement the beat sheet [TRANSITION] as one table of times, not nested
timeouts. Wire the final beat to the **existing** channel-page grow — do not
build a parallel page shell — and pass the transition's hue into the page's
dither veil.

Teardown is total, idempotent, and reachable from a second click plus an 8000ms
watchdog. Gate `solveLattice` on the busy flag.

**Done when:** the sequence matches the beat sheet on a real clock, and the
teardown assertions pass [DO-NOT-BREAK §5.4].
