# Port contract — perfection synthétique

This file is the single source of truth for module boundaries during the port.
Every agent working on this codebase must read it before writing code, must
only write the files it owns, and must implement the exported signatures
exactly as written here.

## Reference material

| What | Where |
|---|---|
| Handoff README (fidelity spec, tokens, timings) | `_source/design_handoff_perfection_synthetique/README.md` |
| Prototype markup (geometry as inline styles) | `_source/prototype/prototype.markup.html` |
| Prototype CSS (`<style>` block, keyframes) | `_source/prototype/prototype.css.txt` |
| Prototype runtime (`class Component`, `renderVals()`) | `_source/prototype/prototype.script.js` |
| Devkit content JSON | `_source/christopher-fiore-portfolio-devkit-v31/data/` |

The prototype is a **design reference**, not code to lift wholesale. What must
survive verbatim is **geometry, exact values, and timing**. Rewrite the
plumbing (the `x-dc` custom element, `style-hover="…"`, `onClick="{{ fn }}"`)
into the idioms below.

## Stack

Vite + TypeScript, no framework, no runtime dependencies. ES modules, strict
mode, `noUnusedLocals`. Target ES2022. `npm run check` must pass with zero
errors before any agent reports done.

## The DSL translations

The prototype uses two prototyping conveniences. Replace them like this:

| Prototype | This codebase |
|---|---|
| `style-hover="background:#C62C05;color:#DFCBFA"` | a CSS class in `src/styles/`, e.g. `.ps-hov-invert:hover` |
| `onClick="{{ openPage }}"` | `data-act="open"` + one delegated listener in `src/runtime/actions.ts` |
| `onMouseEnter="{{ prodOn }}"` | `data-hov="prod"` + delegated `pointerenter`/`pointerleave` |
| `<image-slot id="ps-pd-1">` | a real `<img>` with `object-fit: cover`, or a typographic plate |

Never use inline `onclick=` attributes. Never inject unescaped content into
`innerHTML` — content strings go through `text()`/`el()` helpers in
`src/dom.ts`.

## Stage & coordinates

The stage is a fixed `1920 × 1080` box. `src/runtime/stage.ts` scales it with
`transform: scale(k)`, `k = min(vw/1920, vh/1080)`, centred, letterboxed. All
geometry in page builders is written in that 1920×1080 space, in px.

## Module map — file ownership is exclusive

### `src/dom.ts` — owned by the pages agent
```ts
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs?: Record<string, string | number | null | undefined>,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K];
export function svg(tag: string, attrs?: Record<string, string | number>, ...children: Node[]): SVGElement;
export function q<T extends Element = HTMLElement>(root: ParentNode, sel: string): T | null;
export function qq<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[];
/** Resolve an asset path against Vite's BASE_URL. */
export function asset(path: string): string;
/** Focus the screen that just arrived, without letting the UA scroll the box. */
export function focusInto(target: HTMLElement | null): void;
```

`css`, `px` and `letters` also live here. This list is a floor, not a ceiling:
adding an export is fine, moving one between modules is not.

### `src/runtime/dither.ts`
The ordered-dither primitive. An SVG filter blurs `SourceAlpha`, tiles the 8×8
Bayer matrix (`public/brand/bayer8.png`) and composites arithmetically with
`k1 0, k2 1.55, k3 -0.55, k4 0.28`, then a discrete alpha transfer hardens it.
Animating the blur radius N→0 reads as "resolving out of noise".

```ts
/** Install the shared <svg><defs> filter prototype into the stage. Idempotent. */
export function installDitherDefs(stage: HTMLElement): void;
/** Give `el` its own cloned filter instance; returns the feGaussianBlur node. */
export function dfxFilter(el: HTMLElement): SVGFEGaussianBlurElement;
/** Blur radius appropriate to the element's box. */
export function autoMb(el: HTMLElement): number;
/**
 * Standard settle curve. progress → dither amount:
 * 0@0 · 0@hold · 1@end · .82@+110 · 1@+250 · .95@+340 · 1@+450
 * The two dips after landing are the pulsing settle — the signature. Never
 * replace with a plain ease-out.
 */
export function dIn(el: HTMLElement, hold: number, tEnd: number, mb?: number): void;
export function dfxSeq(el: HTMLElement, stops: [number, number][], mb?: number): void;
/** Run every [data-intro]/[data-dfx] inside `scope` on its own delay. */
export function playIn(scope: HTMLElement, shift?: number, dither?: boolean): void;
export function killAnim(el: Element | null | undefined): void;
export function bbox(el: Element): { left: number; top: number; w: number; h: number };
```

### `src/runtime/frost.ts`
The background canvases. Port `startFrost` / `setMode` / `tween` / `trackFrost`
from the prototype verbatim in behaviour: mode 0 quiet, 1 field, 2 paint,
3 speed, 4 organic rest. Canvases are decorative → the builder marks them
`aria-hidden="true"`.

```ts
export interface FrostHandle { setMode(m: number): void; tween(key: string, to: number, dur: number): void; stop(): void; }
export function startFrost(cv: HTMLCanvasElement): FrostHandle;
export function trackFrost(stage: HTMLElement): void;
export function frostFor(cv: HTMLCanvasElement): FrostHandle | null;
```

### `src/runtime/glitch.ts`
Per-letter font glitching between Karrik and Dessign Maison alternates, and
the idle wordmark loop.

```ts
export function wrapWord(el: HTMLElement): void;
export function glitchFont(el: HTMLElement, toAlt: boolean, step?: number, noHl?: boolean): void;
export function resetTitleFont(el: HTMLElement): void;
export function flashAlt(stage: HTMLElement, spans: HTMLElement[], hold: number, whole?: boolean): void;
export function fitLine(el: HTMLElement, k: number, base: number): void;
/** Idle loop: every 1000–3900ms pick one letter (56%), a run of 2–4 (37%), or both lines (7%). */
export function ambientGlitch(stage: HTMLElement): void;
export function stopAmbientGlitch(stage: HTMLElement): void;
```

### `src/runtime/hover.ts`
The in-page button treatment: a band stack filling the whole button, ink
pinned to `#0B0B0C`, letters glitched to alternates in scattered order.

```ts
export function hlBox(el: HTMLElement): void;
export function hlBoxOff(el: HTMLElement): void;
export function hlInk(el: HTMLElement, on: boolean): void;
/** Auto-bind every innermost cursor:pointer element inside a page. Menu channels excluded. */
export function wireHovers(root: HTMLElement): void;
```

### `src/runtime/channels.ts`
The three per-channel hover personalities. Each is in character and must keep
its character — a generic hover on any of them reads as unfinished.

```ts
export function prodOn(cell: HTMLElement): void;
export function prodOff(cell: HTMLElement): void;
export function scafMove(cell: HTMLElement, ev: PointerEvent): void;
export function waterOn(cell: HTMLElement): void;
export function waterOff(cell: HTMLElement): void;
export function sweepOn(cell: HTMLElement): void;
export function sweepOff(cell: HTMLElement): void;
```

### `src/runtime/transitions.ts`
Menu ↔ page choreography.

```ts
export function openPage(stage: HTMLElement, n: number, cell: HTMLElement): void;
export function closePage(stage: HTMLElement): void;
export function nextPage(stage: HTMLElement, n: number): void;
export function runIntro(stage: HTMLElement): void;
export function menuFade(stage: HTMLElement, out: boolean): void;
/** the veil API — shared with runtime/evidence.ts, which has a veil of its own */
export function veilOpen(cq: HTMLCanvasElement | null, G: number, H: number, S: number): void;
export function veilRest(cq: HTMLCanvasElement | null, fade: number): void;
export function resetVeil(cq: HTMLCanvasElement | null): void;
/** the reduced-motion cross-fade duration every screen here settles on */
export const REDUCED_FADE: number;
```

### `src/runtime/evidence.ts`
Page 03 ↔ evidence viewer choreography — the same move one level down. The
clicked element's rect is **measured**, not declared: the triggers are a hero
and four list rows, so there is no `data-rect` to read.

```ts
export function openEvidence(stage: HTMLElement, trigger: HTMLElement): void;
export function closeEvidence(stage: HTMLElement): void;
export function goEvidence(stage: HTMLElement, n: number): void;
export function stepEvidence(stage: HTMLElement, delta: number): void;
```

Timing is the tokens' own at the nextPage weight — 580 grow · 260 hold · 420
settle — because this opens on top of a page that is already up. Close is the
page close verbatim: OUT 240 · LAG 190 · SH 700.

### `src/runtime/state.ts`
```ts
export interface StageState {
  open: number | null;      // 1–4
  nav: boolean;             // transition in flight, blocks input
  introUntil: number;       // performance.now() timestamp
  hovered: number | null;   // 1–3
  selectedCase: number;     // 1–7, drives the key-frame slot
  selectedSystem: number;   // 0–4, drives page 03's hero render
  evidence: number | null;  // 0–11 sheet, or null — non-null means the viewer
                            // owns Escape and the arrows and the page is inert
  reduced: boolean;         // prefers-reduced-motion
}
export function state(stage: HTMLElement): StageState;
```

### `src/runtime/actions.ts`
One delegated `click` / `pointerenter` / `pointerleave` / `keydown` binder that
maps `data-act` and `data-hov` to the functions above.

### `src/pages/chellbook.ts` + `src/runtime/chellbook.ts`
Channel 01's in-stage case study, opened from row 08 (`data-act="chellbook"`).
Mirrors `pages/evidence.ts` / `runtime/evidence.ts` in shape and choreography;
keeps its own open-board state locally rather than in `StageState`, and exposes
`chellbookOpen(stage)` so `actions.ts` can route Escape and the arrows to
whichever surface is topmost.

```ts
export function openChellbook(stage: HTMLElement, trigger: HTMLElement): void;
export function closeChellbook(stage: HTMLElement): void;
export function goChellbook(stage: HTMLElement, n: number): void;
export function stepChellbook(stage: HTMLElement, delta: number): void;
export function chellbookOpen(stage: HTMLElement): boolean;
```

Chellbook's safety vocabulary is a claim boundary in the same way the Kona N
release language is. See the header comment in `src/data/chellbook.ts`.

### `src/pages/about.ts` + `src/runtime/about.ts`
Channel 04's in-stage background, opened from the page-04 control
(`data-act="about"`). Same shape and choreography as the chellbook screen with
the board machinery removed: it is prose, so it carries a native scroll column
with a rust rail and a "you are here" readout instead of a plate and slots.
Open state is a module-local `WeakSet` keyed by the stage, and `aboutOpen(stage)`
is what `actions.ts` asks when routing Escape.

```ts
export function openAbout(stage: HTMLElement, trigger: HTMLElement): void;
export function closeAbout(stage: HTMLElement): void;
export function goAbout(stage: HTMLElement, n: number): void;
export function aboutOpen(stage: HTMLElement): boolean;
```

Two ordering rules hold here:

- The scroll column carries one more section than the jump index: the
  standfirst is scroll section 0, so index row `n` is scroll section `n + 1`.
  `goAbout` and the current-row paint both apply that offset, and the readout
  deliberately does not number the standfirst — numbering it would make the
  readout, the index and the footer give three different section counts.
- `navParts()` finds a page's title with `q(page, '[data-ptitle]')`, which is
  document order. This screen lives inside `[data-page="4"]` and has a title of
  its own, so `contact.ts` must keep appending it **after** its own title. Left
  vs right in that child list decides which title the page transition animates.

The credentials in `src/data/about.ts` are checkable claims about a real person
and several are narrower than their nearest paraphrase. That header comment is
a claim boundary in the same way chellbook's is.

### `src/pages/*.ts`
`menu.ts`, `products.ts`, `paintings.ts`, `competizione.ts`, `contact.ts` —
each exports `build(): HTMLElement` returning the page's subtree with all
geometry as inline styles in 1920×1080 space, content pulled from `src/data/`.

`evidence.ts` is the one sub-screen: it exports the same `build()`, and
`competizione.ts` appends it **after** `[data-pbody]` inside page 03's section.
Order matters — `navParts()` resolves `[data-frost]` with a first-match query,
so the page's own veil canvas has to stay earlier in the tree than the
viewer's. It belongs to the section, not to the stage, so the page's own
open/close clip carries it and it cannot outlive its channel.

### `src/styles/`
`base.css`, `fonts.css`, `menu.css`, `pages.css`, `motion.css`. Ported from the
prototype `<style>` block plus one class per `style-hover` declaration.

## Non-negotiables

1. **The pulsing settle.** `dIn`'s double dip after landing is the signature.
2. **Close is always top-left** on every page, and on the evidence viewer.
3. **Type on a band is always `#0B0B0C`, and the band is always from `LIGHTS`.**
4. **Corner radius 0 everywhere. No drop shadows.** Depth is hairlines and 1px
   `box-shadow` frames only.
5. **`prefers-reduced-motion`**: skip the dither/FLIP choreography (cross-fade
   pages instead), stop the ambient glitch, freeze the background canvases at
   rest. Wire it; do not stub it.
6. **Accessible names.** Channels and close/next controls are real `<button>`
   or `<a>` elements with names like "Open Product designs" and "Close, back to
   studio index". Background canvases are `aria-hidden="true"`.
7. **Evidence language is fixed.** Never strengthen a caption from `src/data/`.
   "concept visualization only", "design hypothesis, not measured airflow",
   "simulated", "tested logic" all stay exactly as written.

   This binds hardest in `EV_SHEETS`. Those twelve captions are copied
   character-for-character out of the devkit's `visuals[]` and
   `publication_pages[]`, and the viewer prints them under a 1236px plate —
   the one screen where a sheet is large enough to be mistaken for a
   measurement or a released part. Write them out whole; never assemble a
   qualifier from fragments at runtime, because a qualifier that is built can
   lose a clause.
