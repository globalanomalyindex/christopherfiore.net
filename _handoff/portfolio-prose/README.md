# Handoff: perfection synthétique — prose portfolio (christopherfiore.net)

> Start here. This README is self-sufficient: a developer who was not in the design conversation can build the site from it.
> Companion files: `CONTENT.md` (every word of shipped copy, verbatim), `LABELING.md` (naming, attributes, status vocabulary), `DESIGN_RATIONALE.md` (why each decision was made), `CHANGELOG.md` (the full decision history, in order), `SOURCES.md` (repo provenance).

---

## 1. Overview

A five-page personal portfolio for **Christopher Robin Fiore**, product designer and founder of the design studio **perfection synthétique** (New York).

The brief, in the designer's words: *inspired by old-school text posts on the early internet (white background, black text), but slightly editorial with color so it doesn't feel completely old school; it should feel like prose, typographic.* Navigation is carried by **framed "brutalist" buttons that sit inside sentences** and light up on hover, carried over from his previous portfolio. The type itself is interactive: **words part at the seams under the cursor**, and holding still reveals **the page's own measurements** (a "skeleton"). Both ideas come from his project **Chickpea**.

Pages:

| # | Screen | Route (recommended) | Prototype anchor |
|---|---|---|---|
| 1 | home | `/` | `#p-home` |
| 2 | product designs (index) | `/product-designs` | `#p-designs` |
| 3 | case study · chellbook | `/product-designs/chellbook` | `#p-case` |
| 4 | paintings | `/paintings` | `#p-paintings` |
| 5 | about + say hi | `/about` | `#p-about` |

## 2. About the design files

The files in `design/` are **design references built in HTML**: prototypes that show the intended look and behavior. They are **not production code to copy**.

The task is to **recreate these designs in the target codebase's environment**. The existing site (`globalanomalyindex/christopherfiore.net`) is TypeScript + Vite with no framework: DOM built by `src/pages/*.ts`, runtime behavior in `src/runtime/*.ts`, styles in `src/styles/*.css`. Follow that architecture, or pick the best-fit stack if starting fresh. The prototype's logic class is plain JavaScript, and its methods map almost 1:1 onto runtime modules (see §7.6).

- `design/Portfolio Site.dc.html` is **the final design**. Open it in a browser (it needs `support.js` and `public/` beside it). It's a pan/zoom canvas showing the five pages side by side at 1440px wide.
- `design/Portfolio Prose (explorations).dc.html` holds every earlier round (1–5). **Reference only**; nothing in it overrides the final file.
- `design/support.js` is the prototype runtime. It is design-tool only; **do not port it**.

## 3. Fidelity

**High-fidelity.** Final colors, typography, spacing, copy, and interaction timings. Recreate pixel-for-pixel at the 1440px artboard width. The only things not final:

- links marked `#` (placeholders, listed in §11)
- responsive/mobile, which wasn't designed (recommendations in §8)
- keyboard focus styling, which wasn't designed (recommendation in §8)

## 4. Design tokens

### 4.1 Color

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F5E4D9` | page background (from the Figma frame fill). Alternates exist as a prototype tweak only: bone `#F3EEE5`, white `#FBFAF7`. **Ship `#F5E4D9`.** |
| `ink` | `#231C22` | all body text, headings, button borders |
| `ink-2` | `#6E5B57` | secondary text (statuses, captions, labels, meta). ≈5.3:1 on paper |
| `link` | `#3F5195` | plain text links (soft ink blue, "old-school blue for this palette") |
| `link-hover` | `#2E3C73` | |
| `link-visited` | `#6A4C86` | muted plum |
| `measure` | `#3F5195` | the skeleton: arrows, outlines, baselines, mono labels |
| `band-ink` | `#1A1820` | text color forced while a button's band is showing; the band's 1.5px outline |

**Hover band palettes** (from the previous portfolio's runtime; use these exact lists):

```
HUES         = #FF2D87 #F5D90A #12D9E8 #FF6B1A #C9F227 #35E5C8            // main band, one at random
SPARK_ACCENT = #3A3742 #56535E #2B45F5 #7C858A #FF2D87 #12D9E8            // top accent row
SPARK_LIGHTS = #E2E7E9 #CBD2D5 #AEB6BA #FF2D87 #F5D90A #12D9E8 #FF6B1A #C9F227 #35E5C8   // bottom accent row
FLASH        = #c9246b #796b05 #0a777f #b44b12 #5f7313 #2B45F5 #1c7869    // per-letter flash during the glitch
```

Color rule: **at rest the page is only paper, ink, ink-2 and link blue.** Bright color appears only on hover.

### 4.2 Typography

| Role | Family | Size / line-height | Weight | Tracking | Color |
|---|---|---|---|---|---|
| h1 (page title) | Averia Serif Libre | 88px / 1.05 | 700 | -0.01em | ink |
| h2 (section) | Averia Serif Libre | 48px / 1.2 | 700 | 0 | ink |
| lede / home prose | Averia Serif Libre | 40px / 1.5 | 400 | 0 | ink |
| body | Averia Serif Libre | 32px / 1.5 | 400 | 0 | ink |
| breadcrumb sentence | Averia Serif Libre | 26px / 1.5 | 400 | 0 | ink |
| case meta line | Averia Serif Libre | 26px / 1.4 | 400 | 0 | ink-2 |
| painting caption | Averia Serif Libre | 26px / 1.5 | 400 | 0 | ink |
| figure caption | Averia Serif Libre | 22px / 1.4 | 400 | 0 | ink-2 |
| skeleton labels | `ui-monospace, Menlo, monospace` | 12px (10px in one legacy mode, unused) | 400 | 0 | measure |
| hover alternate | **SLTF Dessign Maison** with `font-feature-settings: 'salt' 1, 'ss01' 1` | inherits | 400 | inherits | inherits |

- Averia Serif Libre: Google Fonts, weights 300/400/700 plus italics. Loaded as `family=Averia+Serif+Libre:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700`.
- Dessign Maison: `design/public/fonts/SLTFDessignMaison-Regular.otf` (the designer's latest upload, and the same file the repo ships). **Licence check required before shipping** (flagged in the repo's earlier handoffs too).
- Italic is used once, for the chellbook tagline.
- `text-wrap: pretty` on every paragraph.

### 4.3 Space and layout

| Token | Value |
|---|---|
| artboard width | 1440px (design width) |
| page side padding | 48px |
| page top padding | 40px |
| page bottom padding | 64px (home), 104px (subpages) |
| measure, lede / home prose | `max-width: 1120px` |
| measure, body | `max-width: 1040px` |
| h1 top margin (subpages) | 56px below the breadcrumb |
| lede top margin | 24px below h1 (32px on the case study, after the meta line) |
| h2 top margin | 88px |
| first paragraph after h2 | 24px |
| paragraph to paragraph | 20px (list-like runs: 12px; "at a glance" rows: 10px) |
| figure top margin | 56px; image↔caption gap 14px |
| home: paragraph gap | 40px; prose block starts 32px below h1 |

### 4.4 Borders, radius, shadow

- Buttons: `1px solid #231C22`, **radius 0** everywhere (brutalist).
- Figures/images: `1px solid #231C22`, radius 0.
- No shadows on the site. (The prototype's artboard shadow is canvas chrome only.)

## 5. The one component: the framed inline button

Every navigational element is the same component: a framed word that sits inside a sentence.

```
<a data-btn href="…">
  <span data-word>label</span>
  <svg ↗/>
</a>
```

| Property | Value |
|---|---|
| display | `inline-flex; align-items: baseline; vertical-align: baseline` |
| gap (label ↔ arrow) | `.2em` |
| padding | `.02em .3em .06em` (em-based, so it scales with the sentence it sits in) |
| border | `1px solid #231C22` |
| line-height | `1.2` |
| color | `#231C22`; no underline |
| position / stacking | `position: relative; isolation: isolate` (required: the band paints at `z-index: -1` inside it) |
| arrow | 12×12 viewBox, path `M2.5 9.5L9.5 2.5M4 2.5h5.5V8`, `stroke: currentColor; stroke-width: 1.7; stroke-linecap: square; fill: none`, rendered `.42em` square, `align-self: center` |
| external links | `target="_blank" rel="noopener"` (also used for the PDFs) |

Punctuation sits **outside** the box: `[product designs ↗],` not `[product designs, ↗]`.

Plain text links (not buttons; none remain in the final screens, but style them for CMS content): `color: #3F5195`, underline 2px, offset 6–7px, the same ↗ arrow placed *between the link and its punctuation*, `:hover #2E3C73`, `:visited #6A4C86`.

## 6. Screens

All five pages share one structure: an **opening breadcrumb sentence** (subpages), a **title**, a **lede**, then prose. There is no nav bar, no header rule, no footer, and no "last updated" line (all were removed on purpose; see DESIGN_RATIONALE).

### 6.1 home (`#p-home`)

- Artboard: 1440 × ≥1024, padding `40 48 64`, flex column.
- h1 `hi, i’m christopher robin!`, margin 0.
- Prose block: 32px below h1, flex column, `gap: 40px`, 40px/1.5.
  1. `i’m a web designer & product designer specializing in UI/UX and artificial intelligence, and founder of design studio perfection synthétique.` (max-width 1120)
  2. `on the side, i’m an actor and concept artist. i love storytelling, and i bring that unique approach to all my technical work.` (max-width 1120)
  3. The closing paragraph, `max-width: none`, two lines by construction:
     - line 1, wrapped in `white-space: nowrap` so it never breaks: `you can view my portfolio [product designs ↗] and [paintings ↗],`
     - forced `<br>`
     - line 2: `or say hi [chrisrobinfiore@gmail.com ↗]. you can also read my [resume ↗]. i’d love to hear from you :)`
- Buttons: product designs → `/product-designs`; paintings → `/paintings`; email → `/about` (designed as a jump to the contact page; see §11 if you prefer `mailto:`); resume → `public/documents/christopher-robin-fiore-resume-2026.pdf` (new tab).

### 6.2 product designs (`#p-designs`)

- Breadcrumb (26px): `back [home ↗], or over to [paintings ↗] and [about ↗].`
- h1 `product designs`; lede `i design ambitious products, prototype the difficult parts, and test whether the ideas actually hold up.`
- **Index:** 56px below the lede, flex column `gap: 30px`. One paragraph per case, 32px/1.5, max-width 1120:
  `[case name ↗]: one-line description. (ink-2: status, year.)`
  - If the name itself contains a colon (`three zones: camera market ui fix`), use `.` instead of `:` after the button.
  - Status vocabulary and order are defined in `LABELING.md` §4, and the full list of 14 is in `CONTENT.md`.
- Closing paragraph (56px below the index): `i also keep a [motion archive ↗] of eight series, 58 studies.`
- No thumbnails, by design (text-post index). Card images for all 14 cases are included in `public/projects/card/` in case a hover preview is wanted later; that isn't designed.

### 6.3 case study · chellbook (`#p-case`)

Top to bottom:

1. Breadcrumb: `one of my [product designs ↗]. back [home ↗].`
2. h1 `chellbook`.
3. Meta line (26px, ink-2, 18px below): `gluten-free recipe conversion and label safety, iPhone. client work for a client living with celiac disease, design spec, 2026.`
4. Lede (40px, 32px below).
5. Italic tagline (32px, 16px below): *a safety product that happens to be about food.*
6. Figure: `public/chellbook/boards/cover-and-foundation.webp`, full content width, with a caption.
7. h2 `the core loop`: five numbered paragraphs (the number is ink-2, e.g. `1.`).
8. h2 `four safety states, never a fifth`: four paragraphs `**state**. meaning`.
9. Figure: `public/chellbook/boards/safety-states.webp`.
10. h2 `still undesigned`: six paragraphs.
11. h2 `the prototypes`: one sentence with two buttons (`product design showcase`, `wireframe exploration`).
12. Closing (56px): `next up is [mfny concentrates ↗], or go back to [product designs ↗].` (mfny is the next case in the index that has a case study.)

**Safety-language rule (from the repo; non-negotiable):** the four state meanings, especially "not a promise of absolute safety", must stay verbatim. Never round "unknown" up to "verified" in any copy.

### 6.4 paintings (`#p-paintings`)

- Breadcrumb: `back [home ↗], or over to [product designs ↗] and [about ↗].`
- h1 `paintings`; lede `twenty works, 2023 to 2025. concept art and illustration: photobash, blender, substance.`
- Gallery: 64px below the lede, **CSS columns: 2, column-gap 40px**. Each figure: `margin 0 0 48px`, `break-inside: avoid`, image full column width with a 1px ink border, then a caption (26px/1.5) that is a sentence: `[title ↗] note, (ink-2: year).`, e.g. `[the steppe ↗] silhouette and distance, 2025.` A work with no note or year shows only its button.
- The title button links to that work's ArtStation page (new tab).
- Closing (16px below the gallery): `all twenty are on [artstation ↗].`
- The prototype shows 12 works. **The build should show all 20** from `src/data/paintings.ts`; the other 8 images are in the repo's `public/artstation/`. Keep the data order.

### 6.5 about + say hi (`#p-about`)

Section order is final and deliberate:

1. Breadcrumb: `back [home ↗], or over to [product designs ↗] and [paintings ↗].`
2. h1 `about`.
3. Lede (40px): the "my name is christopher robin fiore…" paragraph.
4. Resume summary (32px, 32px below).
5. **h2 `at a glance`** (first section by request): rows `(ink-2: field.) value.`, in this order: product design, design engineering, research and evaluation, tools and AI, education, training, **certification** (`AI Fluency: Framework & Foundations, from Anthropic, June 2026. [certificate ↗]`, which opens `public/documents/anthropic-ai-fluency-certificate.pdf`), mentorship, research, screen.
6. h2 practice · design and craft · AI practice · research · performance · advocacy: the designer's own prose, verbatim.
7. h2 **references**: Jeff Lin (lead product designer, Goldman Sachs) and David Lajara (product designer, The Walt Disney Company), both from portfolio reviews; Stephen Fiore (senior digital designer, Marvel Studios), ongoing mentor. Names are bold.
8. h2 **say hi**: one 40px sentence: `i’m open to roles in new york or remote. say hi at [chrisrobinfiore@gmail.com ↗], or find me on [github ↗], [artstation ↗] and [linkedin ↗]. you can also read my [resume ↗]. i’d love to hear from you :)`

There is **no "work" / experience section** (removed by request). Its facts live in the resume PDF.

## 7. Interactions and behavior

Four systems run at once. They're independent, but they touch the same elements, so the **property ownership** rule in §7.5 matters.

### 7.1 Button hover: the brutalist band

On `pointerenter` of any `[data-btn]` (only one is active at a time):

1. **Band host:** `<span>` `position:absolute; inset:0; z-index:-1; overflow:hidden; pointer-events:none`, appended inside the button. It paints above the button's background and below its content, thanks to `isolation: isolate`.
2. **Three layers:**
   - main band `inset:0`, color = random pick from `HUES`
   - top accent row: full width, height random **2–8%**, color random from `SPARK_ACCENT`
   - bottom accent row: full width, height random **2–8%**, color random from `SPARK_LIGHTS`

   Each layer starts at a random clip from `WIPE_IN = [inset(0 100% 0 0), inset(0 0 0 100%), inset(100% 0 0 0), inset(0 0 100% 0), inset(0 62% 0 0), inset(0 0 0 62%)]` with `translateX` jitter (random integer in ±7.5px). Each animates to `clip-path: inset(0 0 0 0)` and `translateX(0)` over **200ms `steps(5, end)`** (the stepped, brutalist wipe), staggered **0 / 45 / 90ms**.
3. **Outline:** `box-shadow: inset 0 0 0 1.5px #1A1820`.
4. **Ink pin:** every descendant with its own color (and the button itself) is set to `#1A1820` while hovered and restored on leave. Grey spans would otherwise disappear on a bright band.
5. **Leave:** each layer animates to a random `WIPE_OUT = [inset(0 0 0 100%), inset(0 100% 0 0), inset(0 0 100% 0), inset(100% 0 0 0)]`, the outline drops, and the host is removed after **230ms**.

### 7.2 Button hover: glitch into the alternate letterforms (no reflow, ever)

Requirement: *"users must never have to worry about hovering causing all that confusion."* **Hover must never change layout.**

- **Rest:** the `[data-word]` text is untouched Averia with natural kerning.
- **Width reservation:** once both fonts have loaded (`document.fonts.load` for both families, then `fonts.ready`), measure every single-line `[data-word]` twice: at rest, and as `Dessign Maison + 'salt' 1, 'ss01' 1 + tail`. The tail is `"..."`, **except for any label containing `@`** (the email). If the alternate is wider, set `min-width: ceil(altWidth)px` (switching `inline` to `inline-block`). Inside inline-flex sentence buttons, also set `text-align: center` so the rest state looks balanced. Skip multi-line words.
- **On enter:**
  1. Set the rest text to `color: transparent`.
  2. Lay an `aria-hidden` overlay exactly over the word's content box (left = padding-left, top = padding-top, width = content width, `nowrap` for single-line words, same `text-align`). It holds one span per character of `label + tail`.
  3. Flip the non-space characters in random order: **2 per 28ms tick**, each to Dessign Maison alternates, with a **70ms flash** in a random `FLASH` color.
  4. Once more than 2 have flipped, each tick has a **25% chance** of knocking one back to Averia (it's re-queued).
  5. When the queue empties, wait **80ms**, then set every character to the alternate. It **stays** until leave.
- **On leave:** remove the overlay and restore the rest color instantly (no reverse animation).
- **Reduced motion:** skip the glitch and show the final alternate state instantly.

### 7.3 Magnetic pull

While hovered, the button leans toward the cursor. After the cursor leaves, the button keeps stretching after it for a short distance, then springs back.

- Offset = cursor distance from the button's **untransformed** center × **0.10** inside, **0.16** outside.
- Clamp x to `min(8 inside | 12 outside, 4 + width·0.02)` px; clamp y to `min(6 | 9, 3 + height·0.03)` px.
- Follow: `transform: translate(x, y)` with `transition: transform 140ms cubic-bezier(.2,.7,.3,1)`.
- After leaving, keep pulling until the cursor is more than **44px** from the box edge, then release: `transform: none` with `560ms cubic-bezier(.34,1.56,.64,1)` (a spring with slight overshoot). Entering another button releases the held one immediately; so does the pointer leaving the window.
- Off under `prefers-reduced-motion`.

### 7.4 Seams and skeleton (improved from Chickpea's hero)

Every word in every prose element (`h1`, `h2`, `p`, `figcaption`) becomes a unit: an `inline-block` span, with whitespace kept as real text nodes so wrapping is unchanged. Every **button box is also a unit**. Units are grouped into visual lines; a **seam** is the gap between two neighbors on a line.

**Two states** (identical on all pages):

| | Quick state (default) | Full state |
|---|---|---|
| Enter | pointer moves over text | pointer stays **700ms** on the *same* seam |
| Seam opening | up to **8px** | up to **24px** |
| Skeleton | none | local skeleton + arrow (§7.4.3) |
| Moving to another seam | the new seam gets the quick opening | the **full state follows** the cursor from seam to seam |
| Exit | n/a | the cursor is **no longer over any text** (outside every line box ±6px horizontally, and not on a button), or it leaves the page. Then collapse to the quick state. |

**Buttons don't change between states.** Hovering a button always makes it claim space (below) and shows its skeleton **instantly**. It never starts the 700ms timer, and it doesn't end a full state that's already running.

#### 7.4.1 Motion model

- **Seam selection:** nearest seam center within **R = 150px**, with distance measured as `hypot(dx, dy·1.6)` (vertical weighted so the line under the cursor wins). **Hysteresis:** keep the current seam unless another is at least **10px** closer.
- **Opening:** `t = 1 − d/R`, `ease = t²(3 − 2t)`, `delta = D·ease` where D = 8 (quick) or 24 (full). Units left of the seam move `−delta/2`, units right move `+delta/2`, falling off by **40% per step** away from the seam (`max(0, 1 − steps·0.4)`). Only the seam's own line moves.
- **Button claims space:** while a box is hovered, its line's neighbors move away from it on both sides by **14px**, with the same 40% falloff. The box itself doesn't translate (its magnetic pull still runs).
- **Relax pass (no-overlap guarantee):** after targets are set, walk outward from the seam or box on each side and push any neighbor whose gap would drop below **min(3px, its resting gap)**. Pushes propagate down the line.
- **Springs:** each unit runs a dt-based spring, `K = 420`, damping `2√K·0.82` (slightly underdamped), dt clamped to ≤ 1/30s. It settles when `|target − x| < 0.04` and `|v| < 0.5`. (This replaces Chickpea's per-frame lerp, so the feel is the same at 60Hz and 120Hz.)
- **Property ownership:** seam motion writes the CSS **`translate`** property. The magnetic pull writes **`transform`**. They compose and never overwrite each other.
- **Re-measure** unit geometry on `pointerenter` of the page (subtracting any live `translate`/`transform`), and after fonts load.

#### 7.4.2 Arrows (part of the skeleton)

- A horizontal dimension arrow drawn in the gap: `1.5px` stroke `#3F5195`, arrowheads `min(5, L/3)`px, and a mono 12px label (the gap in px, rounded) centered 16px above.
- Hidden if the gap is under 10px. Opacity fades over 150ms `cubic-bezier(.23,1,.32,1)`.
- One arrow for a seam; two for a hovered box (left gap and right gap), following the box's live rect so they track the magnetic pull.

#### 7.4.3 Local skeleton (what's drawn, all in `#3F5195`)

- **Unit outlines:** dashed `2 3`, 1px, around the two units at the seam, or around the previous unit, the box, and the next unit for a hovered box.
- **Width labels:** mono 12px, centered 5px above each outline. A hovered box's label reads `W × H  ·  pad P`, and its `[data-word]` gets an inner dashed `1 3` outline at 0.6 opacity.
- **Baseline:** a 1px line (opacity 0.8) across the whole line, from the first unit's left edge to the last unit's right edge, at `y = unit center + 0.33·font-size`. Label `fs / lh` 10px to the right of the line's end.
- **Line-height bracket:** a vertical line 14px left of the line start with ±4px end ticks, labeled with the line height, right-aligned 6px to its left.
- Every label has a paper-colored halo (`stroke: paper; stroke-width: 3; paint-order: stroke`) so it reads over type.
- The layer is `aria-hidden` with `pointer-events: none`. Opacity is 1 for a box and `min(1, ease·1.8)` for a seam, fading over 180ms `cubic-bezier(.23,1,.32,1)`.

**Reduced motion:** words and boxes don't move (every delta is 0), but the measurements still appear. This is an improvement on Chickpea, which disabled the whole layer.

### 7.5 Stacking and ownership summary

| Layer | z | Owner |
|---|---|---|
| band host (inside button) | −1 | §7.1 |
| text | auto | — |
| skeleton layer (page) | 3 | §7.4.3 |
| arrows (page) | 4 | §7.4.2 |

| CSS property | Owner |
|---|---|
| `transform` on buttons | magnetic pull only |
| `translate` on units and buttons | seams only |
| `color` on buttons | band ink pin (restores on leave) |
| `color` on `[data-word]` | glitch overlay (transparent while hovered) |
| `min-width` / `text-align` on `[data-word]` | width reservation |

### 7.6 Suggested module split (matches the repo's `src/runtime/`)

| Module | Responsibility | Prototype methods |
|---|---|---|
| `hover.ts` (extend) | band stack, ink pin | `enter`, `leave` |
| `glitch.ts` (extend) | width reservation, overlay glitch | `reserve`, `altIn`, `altOut` |
| `magnet.ts` (new) | pull and release | `pull`, `release`, `onMove` |
| `seams.ts` (new) | units, lines, targets, relax, springs, states | `initSeams`, `retarget`, `dwell`, `relax`, `seamLoop`, `pos` |
| `skeleton.ts` (new) | arrows and local skeleton rendering | `mkArrow`, `setArrow`, `drawArrows`, `drawLive` |

The final prototype file also still contains exploration-era code that **no final screen uses**: `initMenus` (4a drop-down menu), `initFlash` (5b flashlight), `initSkeleton` / `drawSkeleton` (4c full-page toggle), the `renderVals` sample data, and the `paper` / `hover` tweak props. Ignore them.

## 8. Not designed: recommendations (dev decision)

- **Responsive:** the designs are 1440 artboards. Keep the 1120/1040 measures as `max-width` with 48px side padding. Scale type with `clamp()`: h1 `clamp(48px, 6.1vw, 88px)`, h2 `clamp(32px, 3.3vw, 48px)`, lede and home prose `clamp(26px, 2.8vw, 40px)`, body `clamp(20px, 2.2vw, 32px)`. Below ~700px, let the home's nowrap line wrap normally and drop the forced `<br>`. Paintings: one column below ~800px.
- **Touch / coarse pointers:** no seams, no magnet, no dwell (all need hover). Show the band + alternate state on `:active`, with no glitch delay.
- **Keyboard focus:** not designed. Recommended: `:focus-visible` shows the same band + alternate state (no magnet, no seams), plus a 2px `#3F5195` outline offset 3px.
- **Performance:** the about page has about 900 units; measure on `pointerenter` rather than per move. The per-move nearest-seam search is linear and fine at this size.

## 9. Voice and copy rules (from the repo's `about.ts` and this conversation)

- Lowercase prose, American spelling, **no em dashes**. Proper nouns keep their capitals (Figma, Claude Code, Marvel Studios, Jeff Lin…).
- `synthétique` always carries the acute accent.
- Claims stay exactly as narrow as written: "co-star" is not "starred"; "submitted to" the Regeneron STS is not "placed"; "accepted into" the Advanced Method courses. Strasberg is "two years" (confirmed).
- Every word of shipped copy is in `CONTENT.md`. Don't paraphrase.

## 10. Assets

| Path (under `design/public/`) | What | Source |
|---|---|---|
| `fonts/SLTFDessignMaison-Regular.otf` | hover alternate face (licence check!) | designer upload = repo `public/fonts/` |
| `artstation/*.webp` (12) | paintings, 1200px long edge | repo `public/artstation/` (all 20 are there) |
| `chellbook/boards/cover-and-foundation.webp`, `safety-states.webp` | case study figures | repo `public/chellbook/boards/` |
| `projects/card/*.webp` (14) | case cards (not used on screen; kept for a possible hover preview) | repo `public/projects/card/` |
| `documents/christopher-robin-fiore-resume-2026.pdf` | resume (home + about buttons) | designer upload, 2026 revision |
| `documents/anthropic-ai-fluency-certificate.pdf` | AI Fluency: Framework & Foundations, June 2026 | designer upload |
| `reference/figma-letter-screenshot.png` | the original Figma frame (1440 × 1024, fill `#F5E4D9`) the design grew from | designer upload |

No icon library. The only glyph is the inline ↗ arrow path in §5. Averia Serif Libre comes from Google Fonts.

## 11. Open items: placeholders to wire (`href="#"` in the prototype)

| Where | Button | Wire to |
|---|---|---|
| product designs | every case marked `w/ case study` (after tokens, apple wallet card sharing, mfny concentrates, one master affordance, adhd mode, df2tm, chickpea, wildcard) | its case page. Chellbook is already wired |
| product designs | cases without a case study (lee, chipotle app ui cleanup, dither, three zones, campeón) | their live prototype or hosted page if one exists (see `src/data/cases.ts` `href`), otherwise no link |
| product designs | motion archive | repo `public/motion/archive.html` |
| case study | product design showcase / wireframe exploration | repo `public/chellbook/product-design.html` / `wireframes.html` |
| case study | mfny concentrates ("next up") | mfny case page |
| about | chrisrobinfiore@gmail.com | `mailto:chrisrobinfiore@gmail.com` |
| home | chrisrobinfiore@gmail.com | designed to go to `/about`; switching to `mailto:` is an acceptable alternative |

Only chellbook has a designed case page. Build the other case studies on the same template (§6.3).

## 12. Files in this bundle

```
design_handoff_portfolio_prose/
  README.md                 ← this file
  CONTENT.md                ← all shipped copy, per page, verbatim (generated from the final file)
  LABELING.md               ← screen names, routes, data attributes, status vocabulary, naming
  DESIGN_RATIONALE.md       ← why: every decision and what it replaced
  CHANGELOG.md              ← the full design conversation as a dated decision log
  SOURCES.md                ← repo provenance and screen → source-file map
  design/
    Portfolio Site.dc.html                  ← FINAL design (open in a browser)
    Portfolio Prose (explorations).dc.html  ← rounds 1–5, reference only
    support.js                              ← prototype runtime (do not port)
    public/…                                ← fonts, images, PDFs used by both files
  reference/
    figma-letter-screenshot.png
```
