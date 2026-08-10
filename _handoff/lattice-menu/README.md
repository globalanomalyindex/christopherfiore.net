# Handoff: perfection synthétique — modular lattice redesign (turn 2)

## Overview

A Swiss-minimalist redesign of the menu and channel-index screens for
perfection synthétique (christopherfiore.net). The whole visual system rests on
one idea: an **ambient lattice of ASCII crosshairs** (`+` characters, not
vector graphics) laid on a fixed module. Every frame on the page — rails, the
wordmark, each button, each case block — has its four corners land exactly on a
lattice point, so a component's corner mark is never drawn: it is the background
peg at that intersection, switched on.

Two screens are final:

| id | Screen | Module | Lattice step | Points |
|---|---|---|---|---|
| 2a | Menu / home | 120px | 40px | 47 × 26 = 1222 |
| 2b | 01 Product designs index | 60px | 30px | 63 × 35 = 2205 |

Both are 1920 × 1080, the stage size the current site already scales
(`src/runtime/stage.ts`).

## About the design files

The files in this bundle are **design references created in HTML** — a
prototype showing intended look and behavior, not production code to paste in.
The task is to **recreate them inside the existing codebase's environment**:
TypeScript + Vite, no framework, DOM built by `src/pages/*.ts` builders and
animated by `src/runtime/*.ts` modules, styled by `src/styles/*.css`. Follow
that architecture rather than porting the prototype's structure.

The prototype is a single Design Component (`.dc.html`) whose logic class is a
plain ES class. Its methods map almost 1:1 onto new runtime modules — see
`INTEGRATION.md` for the mapping.

## Fidelity

**Mid-fidelity.** Real palette, real typeface, real content, real geometry —
every position and size in this bundle is exact and on-module, and the colors
are the repo's own tokens. What is NOT final: imagery (placeholders are text
tags like `[ cover 1600×900 ]`), and the copy of any screen other than 2a/2b.
Recreate layout and interaction exactly; keep using `src/design/tokens.ts` as
the source of color truth.

## Screens

### 2a — Menu / home

Purpose: the studio index. Four channels, each of which grows into its page.

Lattice: step 40px, first point at (40, 40), 47 columns × 26 rows. Every 3rd
point (col ≡ 2, row ≡ 2, mod 3) is a **major** point and sits on the 120px
module — those are at 120…1800 and 120…960.

Frames (all four corners land on lattice points):

| Frame | x | y | w | h |
|---|---|---|---|---|
| top rail | 120 | 120 | 1680 | 120 |
| wordmark | 360 | 240 | 1200 | 240 |
| channel 01 | 240 | 600 | 360 | 240 |
| channel 02 | 600 | 600 | 360 | 240 |
| channel 03 | 960 | 600 | 360 | 240 |
| channel 04 | 1320 | 600 | 360 | 240 |
| bottom rail | 120 | 840 | 1680 | 120 |

Adjacent buttons share corner points (240, 600, 960, 1320, 1680) — that shared
corner is what makes the row read as one modular strip. Do not add gaps.

Content, verbatim:

- top rail: `christopher robin fiore` · `product designer · new york city` · `studio index, rev 04`
- wordmark: `perfectionsynthétique` at 128px (no space — from the Figma file)
- channels: `01 product designs`, `02 paintings`, `03 competizione`, `04 contact`
- bottom rail: `last updated august 3 2026 · 4:25 pm ET` · `chrisrobinfiore@gmail.com`

Rails are 13px / letter-spacing .06em / `#56535E`, padded 28px horizontally so
text clears the corner marks. Channel labels are 48px / -.02em, with a 13px
`#56535E` number above at 12px gap, centered.

### 2b — 01 Product designs index

Purpose: the channel index. Nine blocks in an aspect-driven mosaic.

Lattice: step 30px, first point at (60, 60)… container origin (15, 15), 63 × 35.
Majors every 2nd point (col odd, row odd) on the 60px module.

| Block | x | y | w | h | label | meta |
|---|---|---|---|---|---|---|
| rail | 60 | 60 | 1800 | 60 | — | `01 · product designs` / `13 cases · 58 motion studies` / `close` |
| title | 60 | 120 | 1800 | 120 | `product designs` 88px | — |
| standfirst | 60 | 240 | 1080 | 60 | 15px | see below |
| after tokens | 60 | 300 | 720 | 240 | 36px | `2026 · built · [ cover 1600×900 ]` |
| apple wallet card sharing | 780 | 300 | 360 | 240 | 26px | `2026 · concept` |
| chellbook | 1140 | 300 | 720 | 240 | 36px | `2026 · concept · case study · [ cover 1600×900 ]` |
| lee | 60 | 540 | 360 | 240 | 36px | `2026` |
| motion archive | 420 | 540 | 1080 | 240 | 36px | `58 studies · swipe-row, vertical-feed, seek, flock, bloom` |
| mfny concentrates | 1500 | 540 | 360 | 240 | 26px | `2026` |
| chipotle app ui cleanup | 60 | 780 | 600 | 180 | 26px | `2026 · concept` |
| one master affordance | 660 | 780 | 600 | 180 | 26px | `2026 · simulated` |
| df2tm | 1260 | 780 | 600 | 180 | 26px | `shipped · claude code plugin` |
| footer rail | 60 | 960 | 1800 | 60 | — | `next — 02` / `chrisrobinfiore@gmail.com` |

Standfirst: `ambitious products designed, the difficult parts prototyped, and the
ideas tested to see whether they hold up.`

Blocks are `padding: 22px 26px`, `justify-content: space-between`, meta on top,
label at the bottom. The motion archive block is the one exception:
`align-items: flex-end`, label left, meta right.

## Interactions

Full detail in `LATTICE.md` (the three peg states and both animations) and
`TRANSITION.md` (the click-to-page beat sheet). Summary:

1. **Ambient drift.** The fine (non-major) crosshairs dither between two values
   on a slow two-axis wave, swept three rows per 120ms tick.
2. **Hover.** The existing band stack paints *under* the lattice, plus the
   component's own cells take the band's hue and grow one size step. Per-letter
   `salt`/`ss01` glitch with FLASH colors runs the whole time the cursor is in.
3. **Per-channel personalities** on 2a, recreated from `src/runtime/channels.ts`.
4. **Click → page**, a ~3.3s choreographed transition.

## Design tokens

Everything comes from `src/design/tokens.ts` except four lattice-specific
values, listed in `LATTICE.md` under "New tokens". Nothing else is invented.

## Assets

None new. The typeface is `public/fonts/SLTFDessignMaison-Regular.otf`, already
in the repo (family name `Dessign Maison`; both handoffs flag **licence check
required before shipping**). Imagery is placeheld — no images in this bundle.

## Files

| File | What it is |
|---|---|
| `Portfolio Redesign Wireframes.dc.html` | the prototype; turn 2 is the final work, turns 1 below it are earlier exploration |
| `support.js` | the prototype's runtime (design-tool only — do NOT port) |
| `INTEGRATION.md` | file-by-file plan against the real repo |
| `LATTICE.md` | the lattice spec: geometry, the three states, both animations |
| `TRANSITION.md` | the click transition beat sheet |
| `DO-NOT-BREAK.md` | the contracts that must survive the change |

Open the prototype in a browser and hover / click the four channel buttons
before writing any code. Reading the timings is no substitute for feeling them.
