# Integration plan

Against `globalanomalyindex/christopherfiore.net` @ `main`. The prototype is a
single file; the repo is a module graph with a documented contract
(`PORT_CONTRACT.md`). Split the prototype along the repo's existing seams
rather than importing it.

## New files

```
src/runtime/lattice.ts     the peg field: build, resolve, drift, hover fill, sweep
src/design/lattice.ts      the per-screen lattice constants (step, cols, rows, origin, stride)
```

`src/runtime/lattice.ts` exports, roughly:

```ts
export function mountLattice(screen: HTMLElement, cfg: LatticeCfg): void
export function solveLattice(screen: HTMLElement): void      // idempotent
export function startDrift(screen: HTMLElement): () => void  // returns stop
export function fillFor(el: HTMLElement, kind: ChannelKind, ev?: PointerEvent): void
export function releaseFor(el: HTMLElement): void
export function sweepRect(screen: HTMLElement, r: Rect, color: string, ms: number): void
```

Keep it DOM-only and stage-scoped, with state in a module-local `WeakMap` keyed
by the stage — the same pattern `about.ts`, `chipotle.ts` and the rest already
use, and what `PORT_CONTRACT.md` asks for.

## Changed files

| File | Change |
|---|---|
| `src/design/tokens.ts` | add the four `PEG_*` values from `LATTICE.md` §6. Do not touch `COLOR`, `SPARK`, `SPARK_LIGHTS`, `FLASH`, `HUES`, `MARA`, `TIMING` — the prototype uses them unchanged, including the derived `SPARK_LIGHTS`/`FLASH` filters. |
| `src/design/layout.ts` | add the 2a frame table and the 2b block table (`LATTICE.md` §1, README §Screens) beside the existing `PAGE1`/`PAGE3` geometry. Every value is already a whole module — assert that if you like. |
| `src/pages/menu.ts` | rebuild screen 1 to the 2a frame table. The four channel cells keep their `data-channel` / `data-hov` attributes so `channels.ts` and the `EXCLUDE` list in `hover.ts` keep working. Add the band host and the lattice container as the first two children. |
| `src/pages/products.ts` | rebuild page 01's index to the 2b block table. Rows stay real links to the live demos — that is what earns them the band-stack hover, since `wireHovers` binds real links. Row 02 (chellbook) stays a `<button>` with `subpage: 'chellbook'`. |
| `src/runtime/hover.ts` | cap accent rows at 8%; move the band stack from inside the target into the screen-level band host; extend `hlInk` to pin every inline-colored descendant; drop `mkTicks` from the button treatment (keep the export — other screens use it). |
| `src/runtime/channels.ts` | keep all three personalities and their timings; re-target their effects from CSS custom properties to lattice cells per `LATTICE.md` §5. The `--gx/--gy/--hx/--hy` plumbing and the `[data-scaf]` callout stay — the callout is now text over the fill. |
| `src/runtime/glitch.ts` | two behavior changes only (settle leaves ~30% colored; keep flickering while hovered). The idle wordmark loop gains a color band behind ~60% of glitching letters, ink pinned on it. |
| `src/runtime/transitions.ts` | add the `TRANSITION.md` beat sheet as the menu → page opener, replacing the current clip-path grow for these four channels. Reuse the existing dither veil and pulsing settle for the arriving page; pass the transition's hue through. |
| `src/styles/menu.css` | delete `.ps-hov-channel-paint`'s 14px/15px frame (now a lattice ring) and the `.ps-flag-*` / `.ps-flagmask` rules if you move the checker into the lattice. Keep every `:focus-visible` twin. |
| `src/mobile.ts` | unchanged, but see `DO-NOT-BREAK.md` — the lattice must not ship to the phone document view. |

## Order of work

1. `design/lattice.ts` + `runtime/lattice.ts`: build, resolve, drift. Land this
   first and verify the three states and the wave in isolation.
2. Rebuild `pages/menu.ts` to the frame table. Verify every frame corner lands
   on a point (assert it in a test — see `DO-NOT-BREAK.md` §5).
3. `hover.ts` changes, then the lattice fill.
4. `channels.ts` personalities.
5. `pages/products.ts` on the same primitives.
6. `transitions.ts` beat sheet last — it depends on all of the above.

## Do not port

`support.js` and anything `.dc.html` — that is the design tool's runtime.
`DCLogic`, `renderVals`, `sc-for` and the `dv-*` option-stack chrome have no
place in the site. The peg elements are generated in the prototype by a
template loop; in the repo, generate them in `mountLattice`.
