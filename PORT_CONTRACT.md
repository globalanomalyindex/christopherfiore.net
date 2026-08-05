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
/**
 * `optional` marks a per-letter pulse: those compete for a budget of 48 live
 * filters and are cut short, oldest first, when more are in flight than the
 * renderer can carry. Only the three per-letter sites in `glitch.ts` pass it.
 * Anything driving a transition must not — several of those sequences end
 * dissolved rather than resolved, so cutting one short strands its element.
 */
export function dfxSeq(el: HTMLElement, stops: [number, number][], mb?: number, optional?: boolean): void;
/** Drop `el`'s filter and return it to the pool. Stops any run first. */
export function dfxRelease(el: HTMLElement): void;
/** Run every [data-intro]/[data-dfx] inside `scope` on its own delay. */
export function playIn(scope: HTMLElement, shift?: number, dither?: boolean): void;
export function killAnim(el: Element | null | undefined): void;
export function bbox(el: Element): { left: number; top: number; w: number; h: number };
```

**The budget is the one thing here with a measured number behind it.** An
applied SVG filter costs the renderer a fixed amount per element per frame, and
the element count is the only variable that moves it. Two screens deep with the
cursor thrown across the buttons, peak concurrency reached 134 and the stage ran
at 40fps; capping it holds 60fps at any budget up to 56. Nothing else measured
made a difference — not a tighter filter region (38.8fps vs 38.3), not the
backing-store density (DPR 1 and DPR 2 both 38fps), not thousands of idle
filters in the defs, and not stepping the animation down to 12–30 updates a
second, because Chrome re-runs the graph every frame whether the numbers in it
changed or not. `feGaussianBlur` is the expensive primitive: pinning its radius
to 0 and leaving the rest of the graph alone took the same scene from 41 to 55,
and a filter that is applied but does no work is free.

48 sits under the 56 knee so slower hardware has somewhere to fall, and well
over the ~20 elements one button's hover puts in flight — a single hover, or two
at once, never reaches it. Verified 57–60fps from a 1440×900 laptop to a 3440
ultrawide, and to a 4× CPU throttle.

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
  selectedCase: number;     // 1-based row index, drives the key-frame slot
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
Channel 01's in-stage case study, opened from the chellbook row (`data-act="chellbook"`).
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

### `src/pages/mfny.ts` + `src/runtime/mfny.ts`
Channel 01's third in-stage screen, opened from the MFNY row
(`data-act="mfny"`). Unlike the about and df2tm screens it is not pure prose:
its argument is visual, so it takes the chellbook shape — a plate on the left,
prose beside it — and the plate is a before/after the reader flips.

```ts
export function openMfny(stage: HTMLElement, trigger: HTMLElement): void;
export function closeMfny(stage: HTMLElement): void;
export function setMfnyView(stage: HTMLElement, n: number): void;
export function mfnyOpen(stage: HTMLElement): boolean;
```

`setMfnyView` reads its captions from `MFNY_VIEWS`, exported by the page module
— which makes `runtime/mfny.ts` import from `pages/mfny.ts`. That is one of
three runtime→page imports in the codebase, all for the same reason and all
deliberate: the other two are `runtime/chipotle.ts` reading `CHIPOTLE_VIEWS`,
and `runtime/actions.ts` reading it as well to size the arrow-key wrap. A
caption names which page you are looking at, and a caption assembled at runtime
can lose the clause that says which one.

The before/after is a two-option `radiogroup`, so `actions.ts` routes
ArrowLeft/Right to it **only while one of its radios holds focus**, and
otherwise swallows them on this screen rather than letting them reach
`nextPage`.

### `public/mfny/concentrates.html`
The MFNY working demo — a standalone page with no build step and no runtime
dependency beyond the product photography, served at `/mfny/concentrates.html`.
Hosted here rather than on a separate Pages repo, exactly as chellbook's two
prototypes are. Its own spec is the handoff kit it was built from; the file's
header comment says which parts of that kit are binding.

### `src/pages/chipotle.ts` + `src/runtime/chipotle.ts`
Channel 01's fourth in-stage screen, opened from the chipotle row
(`data-act="chipotle"`). A structural clone of the MFNY pair, same shape and
same choreography, with one divergence: the plate carries **five** views rather
than two, so `CHIPOTLE_VIEWS` is walked rather than flipped and the arrow-key
handler takes its wrap from `CHIPOTLE_VIEWS.length` instead of a literal `2`.
Nothing in the runtime counts the views, so adding one is an entry in `VIEWS`
plus a `view:` on the section that argues over it. The fifth, `store-actions`,
is a **detail** rather than a set of whole screens: it shows the favorite
control saved and unsaved, because at the scale the other four are drawn a 44px
icon is a smudge. Measured at 1920: five labels come to 543.9px against a
727.3px plate, so there is room for one more before the row has to wrap.

```ts
export function openChipotle(stage: HTMLElement, trigger: HTMLElement): void;
export function closeChipotle(stage: HTMLElement): void;
export function setChipotleView(stage: HTMLElement, n: number): void;
export function chipotleOpen(stage: HTMLElement): boolean;
```

Its data attributes are `cp`-prefixed (`data-cpplate`, `data-cpchrome`,
`data-cpscroll`, `data-cpthumb`, `data-cpsec`, `data-cpsec-name`,
`data-cpsecat`, `data-cpcap`, `data-cpslot`). They have to differ from mfny's
`mf`-prefixed set: both screens live inside page 01 at once, and a shared
attribute would let one screen's runtime query the other's nodes.

Two things in it are measured, not chosen. The glance column tops out at
**seven rows** between `glanceRowsY` (380) and the band end (976): nine rows of
these values wrapped to 686px and ran 90px into the footer. And the footer's
boundary cell is `white-space: nowrap` with `overflow: hidden`, so it carries
`CHIPOTLE.state` alone; appending the identity boundary to it clipped 48px off
the end. Both are recorded at their definitions.

### `public/chipotle/checkout.html`
The interactive prototype, served at `/chipotle/checkout.html`. Self-contained:
no external requests at all, with its fonts and images inlined. Additions on top
of the author's export are a `<title>`, a meta description, and a short script
that holds the title, because the bundler's runtime adopts an inner document
whose head has none and the tab would otherwise be blank.

It is the author's own design artifact, so its existing copy is left as he
wrote it — including its British spellings, which are his. Two house rules do
reach into it. Dashes are stripped from anything a visitor can read, and any
string added here later is written in American spelling, which is why the
favorite control's labels read "favorite" while the kit that specified them
said "favourite". The em dashes still in the file are all inside the bundler
runtime's own source comments and one `console.error`, none of which render.

**Editing it.** The page is a bundler export. Line 409 is a single JSON string
holding the entire document, and the app lives inside it. Decode with
`JSON.parse`, patch, then re-encode with
`JSON.stringify(html).replace(/<\//g, '<\\u002F')` — that escape is the
bundler's own and is what stops a nested `</script>` closing the outer tag.
Round-tripping without it is byte-identical, so the escape is the only thing to
get right. Inside that document the bundler renames camelCase attributes:
`onClick` is `sc-camel-on-click` and `viewBox` is `sc-camel-view-box`. Kebab
SVG attributes (`fill-rule`, `stroke-linejoin`) pass through untouched.

### `src/pages/lee.ts` + `src/runtime/lee.ts`
Channel 01's fifth in-stage screen, opened from the lee row (`data-act="lee"`).
A structural clone of the chipotle pair, same shape and same choreography.

```ts
export function openLee(stage: HTMLElement, trigger: HTMLElement): void;
export function closeLee(stage: HTMLElement): void;
export function setLeeView(stage: HTMLElement, n: number): void;
export function leeOpen(stage: HTMLElement): boolean;
```

Its data attributes are `le`-prefixed (`data-leplate`, `data-lechrome`,
`data-lescroll`, `data-lethumb`, `data-lesec`, `data-lesec-name`,
`data-lesecat`, `data-lecap`, `data-leslot`). Like `mf` and `cp`, the prefix has
to be its own: every subpage lives inside page 01 at once, and a shared
attribute would let one screen's runtime query another's nodes.

Two things differ from chipotle.

The plate walks **six** views, and the toggle row measures about 592px of the
plate's 727.27 at 1920. A seventh view means shortening labels rather than
adding a second row. Nothing in the runtime counts views, so a view is one
entry in `VIEWS` plus a `view:` on the section that argues over it, and the
arrow-key wrap takes its length from `LEE_VIEWS.length`.

And it carries **two doors** rather than one, so `LEE_PAGE.doors.w` is half the
band less the gap. The second door is the wireframe document, and it earns its
place because the case argues from what was rejected and the rejected options
only exist in that file.

The title is three characters at the family's 152px, which leaves the title
block emptier than its siblings. That is deliberate; see the note on
`LEE_PAGE` in `src/design/layout.ts`.

### `public/lee/`
The Lee prototype, served at `/lee/studio.html` and `/lee/wireframes.html`.
Unlike the chipotle prototype this arrived as raw design-tool output rather
than a bundler export, so it is a folder rather than one file: the two HTML
pages, `support.js` (the same DC runtime the chipotle export inlines),
`image-slot.js`, `uploads/`, and `vendor/`.

**It is self-contained, and that took one shim.** `support.js` loads React and
ReactDOM from unpkg. It checks `window.__resources[url]` for a local copy
first, so each page sets that map in a `<script>` ahead of the `support.js`
tag and points the two URLs at `vendor/`. The vendored files are byte for byte
what unpkg serves, checked against the SHA-384 hashes `support.js` already
carries for them. Babel is listed in `cdn.ts` but never fetched by either page,
so it is not vendored. Verified: **zero offsite requests** on both pages.

Two other repairs, both recorded because they look like bugs otherwise:

- `.image-slots.state.json` is an empty `{}`. `image-slot.js` polls for it and
  logs a 404 without it.
- `uploads/crop-simple-svgrepo-com.svg` is **missing from the handoff zip**.
  It is referenced for the framing button on the Record screen, and without it
  the button paints a blank disc in Chrome and a solid white square in the
  handoff's own render `08-record-setup.png`. The author supplied the original
  file afterwards and it is the one in here now. If a future kit arrives
  without it again, that is the same gap and not a regression here.

The author's own copy is otherwise untouched, and neither page contains a dash
in anything a visitor reads.

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

### `src/pages/df2tm.ts` + `src/runtime/df2tm.ts`
Channel 01's second in-stage screen, opened from the df2tm row
(`data-act="df2tm"`). Same shape as the about screen and sharing its
`READER_PAGE` geometry, because both are prose with no imagery.

```ts
export function openDf2tm(stage: HTMLElement, trigger: HTMLElement): void;
export function closeDf2tm(stage: HTMLElement): void;
export function goDf2tm(stage: HTMLElement, n: number): void;
export function df2tmOpen(stage: HTMLElement): boolean;
```

The same standfirst-offset rule applies as on the about screen: index row `n`
is scroll section `n + 1`, and the readout does not number the standfirst.

### Subpage titles
`glitch.ts` exports `subtitleIn` / `subtitleOut` / `subtitleReset`, which run
the page titles' Dessign Maison swap on a subpage title. They find it by
`[data-sptitle]`, **not** `[data-ptitle]`: every subpage is a child of the page
it covers, and `navParts()` locates a page's own title with a document-order
query, so sharing the marker would let a subpage's title be mistaken for its
host page's.

### `src/runtime/lightbox.ts`

The image viewer, shared by every subpage that carries a plate: the Kona N
evidence sheets, chellbook's boards, and the mfny and chipotle plates.

```ts
export function installLightbox(stage: HTMLElement): void;
export function openLightbox(stage: HTMLElement, trigger: HTMLElement): void;
export function closeLightbox(stage: HTMLElement): void;
export function lightboxOpen(stage: HTMLElement): boolean;
/** The plate's cover control. Append as the plate's LAST child. */
export function zoomTrigger(label: string): HTMLElement;
```

**This is the one module that is deliberately not per-screen.** Four screens
would have meant four copies of the same overlay, so instead each plate carries
a single `data-act="zoom"` button and this reads whichever slot is showing at
the moment it opens. Nothing keeps a copy of the current image in sync, which
is why the plate can be walked, stepped or scroll-synced underneath without the
viewer knowing anything about it.

It lives **inside** the stage. Everything on this site is drawn in 1920 × 1080
and scaled as a unit, and an overlay outside that would be the only element
that does not move with the letterbox.

Sizing is two rules, in order. Natural size is the ceiling: a 1456px capture
opens at 1456 and never at the box's 1792, because upscaling is the opposite of
what "full resolution" means. Then fit to height when that still leaves an
image worth looking at (`MIN_HEIGHT_FIT`, 0.55 of the box width), and only fall
back to fitting the width and scrolling when it would not. Without the second
rule chellbook's 1600 × 3338 flow boards get squeezed to 437px wide; with only
the second rule, a board overflowing by 30px becomes a scrolling page over
30px.

The frame around the image is `pointer-events: none` and the scroll box shrinks
to the image. That is not cosmetic. It used to be one box filling the whole
1792 x 912 area with the image centred inside it, sitting ABOVE the ground, so
every click in the empty space around the image landed on a transparent div
with no handler and did nothing. "Click anywhere outside" worked only in the
last 64px at the very edge of the stage. Anything that is not the image or its
scrollbar has to fall through to the ground.

Four things it has to keep doing:

- The trigger carries `data-nohl`. It sits inside `[data-page]`, so
  `wireHovers` would otherwise build a hover band stack behind a photograph.
- `[data-lightbox]` is in frost's `SCREEN_SEL`, so canvases park under it.
- It is FIRST in the Escape chain in `actions.ts`, and it swallows the arrows,
  because it is the topmost thing on the stage. Without the arrow guard they
  reach the plate underneath and step the image behind an open viewer.

### The plate follows the reading position

Four subpages carry both a scrolling text column and a set of screenshots:
chellbook (nine boards), mfny (two plate views), chipotle (five) and lee (six).
On all four the plate tracks what is being read.

**The binding is one way, and that is the whole design.** Scrolling the column
moves the plate. Touching the plate never moves the column: the setters
(`goChellbook`, `setMfnyView`, `setChipotleView`, `setLeeView`) do not write
`scrollTop`, and must not start.

The target lives on the section element, so the runtime never has to import
content: `data-cbsec-board`, `data-mfsec-view`, `data-cpsec-view`. A section
with **no** attribute leaves the plate where it is, which is the right answer
for the two chellbook sections ("still undesigned", "caveats") that no board
illustrates. Never default it to 0.

The sync fires on a **change of section**, not on every scroll event. Someone
who steps the plate by hand keeps their choice for as long as they stay in the
section they are reading; the plate only takes over again when the reading
position genuinely moves on. Firing per event would snatch the plate back a
pixel after they touched it.

Two traps, both already sprung once:

- `resetScroll` runs inside `finishClose`, while the screen is still displayed
  for one more statement. An animated plate change there dithers the plate
  while the screen collapses. mfny and chipotle therefore split their setter
  into `applyView(P, n, animate)` plus the exported wrapper, exactly as
  chellbook already had `showBoard(P, n, animate)`, and reset silently.
  chellbook needs no such guard: `goChellbook` bails on `locked(stage)`, which
  is true through both transitions.
- The sync must sit **before** any early return that guards the readout. On
  chellbook the `[data-cbsecat]` lookup used to return early and would have
  skipped it.

### Adding a screen
Four places have to learn about a new full-stage screen, and three of them fail
silently if missed:

1. `runtime/actions.ts` — route its `data-act`, add it to the `close` chain and
   to Escape, and make sure the arrow keys do not fall through to `nextPage`
   and change the channel underneath an open modal.
2. `main.ts` — add it to the `syncPageA11y` selector, or the letterbox backdrop
   keeps painting the ground of the page underneath.
3. `runtime/frost.ts` — add it to `SCREEN_SEL`, or its canvas is never
   recognised as a screen and the coverage test cannot park what it covers.
4. `mobile.ts` — a row with `subpage` is filtered out of the case table, so
   without an inline section its content is simply absent on a phone.

5. `pages/products.ts` — import the page module and call its `build()` beside
   the others, or the screen is never mounted and the row opens nothing.

A sixth thing is not automatic either: `PAGE1.rowH` and `PAGE1.nameSize` are
divided from the fixed band between `rowsY` (640.79) and the motion band
(931.7). Adding a case row means re-dividing both — the rows must still land
exactly on 931.7, and the name has to shrink with them. At twelve rows that is
`290.91 / 12 = 24.2425` with the name at 21.

The binding dimension is not the name, which has spare track to give at every
size it has taken. It is `CaseRecord.line`, and it does NOT shrink with the
rows: `cellLine` is a flat 14px in a column of 581.818 less 40 of padding, so
the ceiling is the same at every row count. A `line` past roughly **82
characters** wraps to two lines and overflows a 24.2px cell into the rows above
and below. Keep every `line` inside that.

A new screen also needs its own data-attribute prefix. Every subpage lives
inside its host page simultaneously, so two screens sharing `data-*` names
would let one runtime's `q(screen, …)` reach the other's nodes.

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
