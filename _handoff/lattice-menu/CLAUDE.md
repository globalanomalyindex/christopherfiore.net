# CLAUDE.md — read this first

You are implementing a redesign of two screens of an existing, working site. The
site is not a greenfield project and the redesign is not a rewrite. Your job is
to change how the menu and page 01 **look and feel** while leaving what the site
**does** exactly as it is.

## Where you are

Repo: `globalanomalyindex/christopherfiore.net`, branch `main`. TypeScript +
Vite, no framework. A single 1920×1080 stage holds a menu and four full-bleed
channel pages; clicking a channel grows that cell into its page. No routing, no
page loads. `PORT_CONTRACT.md` in the repo documents the module boundaries and
the non-negotiables — read it before your first edit.

```
src/data/      content, transcribed from the devkit JSON
src/design/    tokens.ts (color, timing, type) and layout.ts (stage geometry)
src/runtime/   the animation engine (dither, frost, glitch, hover, channels, transitions)
src/pages/     menu, products, paintings, competizione, contact
src/styles/    ported CSS, one class per prototype style-hover
```

## Read in this order

1. **`README.md`** — what the design is, both screens' exact geometry and copy.
2. **`LATTICE.md`** — the crosshair lattice: geometry, the three peg states, the
   ambient drift, the hover fill, the four channel personalities. This is the
   spec; everything visual derives from it.
3. **`TRANSITION.md`** — the click-to-page beat sheet, to the millisecond.
4. **`INTEGRATION.md`** — the file-by-file plan: what is new, what changes, in
   what order.
5. **`DO-NOT-BREAK.md`** — links, interaction states, the legibility contract,
   copy rules, and the assertions to write as tests.

Then open `Portfolio Redesign Wireframes.dc.html` in a browser. Scroll to the
section labelled **2** at the top — options **2a** (menu) and **2b** (product
designs index) are the final design. The sections below it are earlier
exploration; ignore them. Hover all four channel buttons, then click one. Reading
the timings is no substitute for feeling them.

## How to work

**Change the smallest surface that achieves the design.** The prototype is one
file because a design tool wants it that way. The site is a module graph. Split
the prototype along the repo's existing seams — `INTEGRATION.md` tells you
where — and put new behavior in a new `src/runtime/lattice.ts` rather than
growing `hover.ts` or `channels.ts` past what they already do.

**Do not port `support.js` or anything `.dc.html`.** That is the design tool's
runtime. `DCLogic`, `renderVals` and `sc-for` have no place in the site.

**Take values literally.** Every position, size and duration in this bundle is
exact and lands on a whole module. If a number looks odd (13px, 1.5px, 0.17 per
40ms), it is deliberate. Do not round to a 4px/8px grid, and do not substitute a
CSS easing keyword for a `steps()` curve — the stepped easing *is* the house
style.

**Colors come from `src/design/tokens.ts`.** The redesign adds exactly four new
values (`LATTICE.md` §6) and invents nothing else. `SPARK_LIGHTS` and `FLASH`
are *derived* by measured-contrast filters in that file — read the comments
before touching them, and never hand-pick a replacement.

## Before you touch a line

Run the repo as it is:

```bash
npm install
npm run dev      # then compare against the prototype side by side
npm run check    # tsc --noEmit; it must stay clean
```

## Definition of done

Every item in `DO-NOT-BREAK.md` §5 passes as a test, `npm run build` typechecks
and emits, and the five checks below hold in a real browser:

1. Every frame corner on both screens sits on a lattice point. Zero exceptions.
2. No crosshair glyph overlaps any glyph of type.
3. The ambient drift visibly moves, and stops entirely under
   `prefers-reduced-motion: reduce`.
4. After any hover cycle the lattice is bit-identical to its resolved state.
5. After the open transition's teardown nothing is left painted, and a second
   click always recovers.

## Two traps that already cost a day

- **Name collisions on shared state.** In the prototype a counter and a method
  were both called `sweep`; the counter overwrote the method on the first tick,
  which killed the ambient wave *and* made the transition throw before its own
  teardown was registered — so the full-screen fill stayed up forever. When you
  split `lattice.ts`, keep the drift's cursor and the painter separately named.
- **Restoring a peg by clearing its inline color.** `style.color = ''` drops the
  glyph to the inherited color, which is black, and leaves a permanent scar on
  the field. Always restore to a named value, and take that value from the peg's
  own resolved state rather than from a color captured when the animation
  started — the resolve pass can run mid-hover.

## When something in the design is ambiguous

The prototype is the reference for behavior; `LATTICE.md` and `TRANSITION.md`
are the reference for numbers; the repo is the reference for architecture and
copy. If those three disagree, stop and ask rather than guessing — several
strings in this codebase are legal or evidentiary, not editorial
(`DO-NOT-BREAK.md` §4).
