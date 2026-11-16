# perfection synthétique

The portfolio of christopher robin fiore, at christopherfiore.net.

One typeface on one character grid: Iosevka Charon Mono, in ink on a cool
off-white ground. There are two kinds of page.

- **Home is the Ledger.** His Figma frame: the name, a "+", three ruled
  lines, and a white sheet column between two vertical rules that holds who
  he is and the four menu rows. Each rule ends in a small color ladder and
  runs on as a faint hairline to the right edge. His signature is at the bottom.
- **Every other page is Chips.** A header row with the page title on a chip
  in the page's color, a rule, one figure and a ladder. Under it, sections of
  tinted rows. Each row starts with a bold lead term.

The "+" marks a link. Every link reads "+something", and a row with a "+" is
a button from edge to edge. Bright color at rest is only chips, ladders and
row tints. The loud color shows up on hover.

Going from one page to another plays the ASCII morph: the page is covered
and uncovered by a field of `+ = - : .` that spreads from the "+".

The design work is kept in [`_handoff/site-new-look/`](_handoff/site-new-look/).
`v2/DIRECTION-v2.md` there is the approved direction, with his answers at the
end. The older prose redesign docs are in `_handoff/portfolio-prose/`:
`CONTENT.md` holds the case study copy and `LABELING.md` holds the status
vocabulary.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## How it's put together

Every page is real HTML at build time, and the browser adds behavior on top.

```
src/
  render.ts      the route table, and one page to HTML (runs in Node)
  html.ts        h(): markup as escaped strings, no DOM
  prose.ts       the kit: masthead, section, row, fact, btn, lede, plate, pages block
  palette.ts     the tally colors, and the tints mixed from them
  paths.ts       every URL the site owns
  pages/         home, designs, casestudy, paintings, about, notfound
  data/          the copy, and the case records it is set from
  main.ts        the browser entry: wires the runtime to the finished page
  runtime/
    morph.ts     the ASCII morph between pages
    buttons.ts   hover, focus and touch, and one delegated listener set
    band.ts      the brutalist band that floods a button
    glitch.ts    the alternate-letter glitch, and the width a sentence link reserves
    magnet.ts    the magnetic pull
    seams.ts     words that part under the cursor, in prose only
    skeleton.ts  the measurements drawn at the seam
    offsets.ts   how the magnet and the seams stay out of each other's way
  styles/site.css
scripts/site-check.mjs   end-to-end checks in real Chrome and WebKit
```

`vite.config.ts` renders the pages twice over. In dev, a middleware renders
each request through Vite's module graph. At build time, every route goes to
`dist/<route>/index.html`, plus `404.html` and `sitemap.xml`. So every URL is
a real file with its prose already in it. It reads with scripts off, crawlers
see the words, and the first request is a 200.

Routes end in a slash (`/about/`) because each one is a folder on Pages, and
the slashed form skips a redirect.

## Two rules the runtime keeps

**Hover never changes layout.** On hover the resting word goes transparent,
and an overlay of the same text glitches on top of it into Dessign Maison's
alternates plus a "..." tail. A label in a row, a tile or the menu sits in a
cell of fixed width, inside a button that clips its own overflow, so nothing
around it can move. A link inside a sentence reserves the wider of its two
widths once the fonts load, written in `em`. The check script compares every
layout box before and during a hover to prove nothing moves, and measures
every label in both faces to prove it fits its cell.

**Two systems move a button, through two properties.** The magnet writes
`transform` and the seams write `translate`, so neither overwrites the other.
Each subtracts the other's offset (`runtime/offsets.ts`) to find where the
button rests. The morph reads the same offsets, so it starts from where the
"+" rests and not from where the magnet has leaned it.

What runs where:

- **Band and glitch:** every link, on hover, keyboard focus and touch. The
  four home menu rows flood in their own page colors, and a subpage's back
  arrow floods ink. Every other button draws from the color wheel.
- **Magnet:** every link, for a cursor. A full-width row leans 3px at most.
- **Seams and the skeleton:** prose only (ledes, paragraphs, captions), for a
  cursor that can rest. Rows, chips and the masthead stay on the grid.

## The morph

This is a multi-page site, so the film is cut across two documents
(`src/runtime/morph.ts`).

1. **Cover, on the page you are leaving.** A plain click on a link to another
   page of this site is held for 400ms while the page covers itself. At full
   cover the window is the ground, the name and the "+". The page leaves a
   short note in `sessionStorage` and the browser navigates.
2. **Reveal, on the page you are opening.** An inline script in every page's
   head (`MORPH_GATE` in `render.ts`, like the signature gate) finds the note
   and starts the page covered, before first paint. The runtime then uncovers
   it over 460ms.

- **The grid** is cut from the real window in the page's own type. The cell
  is measured, not assumed, and the grid is placed so the page's real "+" is
  exactly one cell.
- **Direction.** Going to a page, the cover grows out of the "+" and the new
  page shows from the "+" outward. Going up (home, or a case study's back
  arrow to product designs) is the same film backwards: the field closes in
  from the far corner onto the anchor. Out of it means open. Into it means
  back.
- **The anchor is always on screen.** Home's anchor is his "+". On a subpage
  the same cell holds a back arrow, one level up: home, or product designs
  from a case study. It is drawn as a path one character cell wide, because
  the font's own "←" lives in a 60 to 80 KB font slice. During the film that
  cell shows "<", its ASCII echo (`data-glyph`). The header row sticks to the
  top of the window, so the film can start from the arrow however far down
  the page you are.
- **Glyphs.** Five marks, `+ = - : .`, then blank. "+" is the edge that
  touches live page. Nothing is random.
- **What it leaves alone.** Modifier clicks, new tabs, the PDFs, the address,
  and jumps inside a page.

A page can never be left covered:

- Scripts off: the gate never runs, and links are plain links.
- The script never arrives: the gate uncovers the page by itself at 1.2s.
- A frame throws, the tab is hidden or a timer overruns: the overlay is removed at once.
- The browser never leaves: the page gives itself back after 3s.
- Back and forward, a reload, and a stale note: never covered.
- Reduced motion: no film at all.

The overlay is `aria-hidden`, takes no clicks and holds nothing that can be
focused. `window.__morph.seek(part, dir, p)` holds the film at a moment, for
the checks and for stills.

## The signature

The home page ends on his handwritten name, in ink, 912px wide at full size.
It arrives finished, as one traced path in the HTML, so with scripts off it
is simply there. On every visit and reload it writes itself in over 1.65s,
and then hands back exactly that markup. Every subpage ends on the same
signature, small and still.

**Home is one screen.** At 1440 it is his Figma frame, px for px. The name,
the sheet and the signature fit the window with no scrolling on common laptop,
desktop, tablet and phone sizes, down to 360 x 640. The signature is pushed to
the bottom of the window. Two cases scroll: a phone on its side, and a
320 x 480 screen.

- **Source.** `_handoff/signature/scanned_handwriting_text.png`. It is traced
  by `scripts/trace-signature.py` into `src/data/signature.json`: the ink
  outline (potrace, within 1.41px of the source edge) and the pen paths
  (skeleton centerlines, checked to cover every inked pixel). The script
  refuses to write if either check fails.
- **Motion.** `src/runtime/signature-schedule.ts` is pure and has no DOM. It
  decides writing order, speed and nib width:
  - speed slows through tight curves (a power-law slowdown)
  - pen lifts scale with distance (Fitts's law), with a breath before each
    word and before the eyes
  - the nib is narrow at touchdown and swells to full weight behind the tip
  - everything is clipped to the outline, so it can only ever uncover real ink

  It was chosen by a design panel of three filmed prototypes and three judges.
  `ORDER` is tied to this trace by a fingerprint (stroke count and total pen
  length). A re-trace can renumber strokes, so the schedule refuses to build
  until `ORDER` is reviewed. It also refuses any stroke written twice or left
  out.
- **No flash.** An inline script in the home page's head hides the signature
  before first paint. The runtime claims it when it loads. If the runtime
  hasn't arrived after 3s, the gate gives the static signature back.
- **When it plays.** It starts about 100ms after first paint, once its
  script arrives. If you came home by the morph, it waits for the reveal to
  finish first. On a window too short to show it, it waits until it is
  scrolled into view.
- **When it doesn't play.** Reduced motion (on at load or switched on
  later), back/forward visits (including back/forward-cache restores) and a
  script that fails to load all show the finished signature at once.
  Once handed back, it is never erased and written in afterwards.
- **Debugging.** `/?sig-debug` exposes `window.__sig.seek(ms)` and `play()` for
  filming frames.

## Checks

```bash
npm i --no-save playwright-core
```

```bash
npx vite preview --port 4173 --strictPort
```

```bash
npm run check:site
```

The script uses system Chrome, and Playwright's WebKit if it is installed
(`npx playwright install webkit`). WebKit is the engine under every iPhone
browser, and it runs the phone checks, the film and the frame. `BASE=https://christopherfiore.net npm run check:site`
runs it against the live site. It checks:

- every page and link, the sitemap and the 404, and that the copy has no em
  or en dashes and uses American spelling
- every project under its own status word, in the index order, and the
  paintings by year
- his frame at 1440, px for px: the name, the "+", his three lines, the
  rules and hairlines, the sheet, the menu and the signature
- band, glitch, zero reflow on every page, every hover label fitting its
  cell, the magnet, seams, the skeleton, and a sentence link claiming space
- the morph:
  - the page being left covers itself fully, edge to edge, then goes
  - the page being opened starts covered before first paint, is never seen
    before the reveal, and ends uncovered
  - under 1.5s across the two pages, at 60fps
  - the grid sits on the page's real "+" and real type, also when scrolled
  - going home runs backwards
  - a page is never left covered: no script, a navigation that hangs, a
    stale note, a reload, back and forward, the back/forward cache
  - modifier clicks, new tabs, the PDF and in-page jumps are left alone
  - with scripts off every page is fully visible and links are plain links
- reduced motion (no film, no glitch, no magnet), keyboard focus, and touch
- every width from 360 to 2560: no sideways scroll, nothing off the window
- phones at 360 and 390 wide, in Chrome and in WebKit: the type really
  rendered on 8px columns, every link at least 44px tall to the touch, how
  the Ledger and the Chips fold, and the film by a tap
- the signature:
  - home fits one screen on eleven common screen sizes, phones included
  - on load it writes itself in with no scroll, and hands back the served markup
  - ink never disappears frame to frame, checked per pixel at 1x and 2x
  - the last frame and the finished state match the no-JS render pixel for pixel
  - nothing flashes when the script is slow, and the signature comes back at
    3s if the script never arrives
  - it doesn't play under reduced motion, whether on from the start or
    switched on before it plays, or on a back/forward-cache return
  - it still writes on a viewport too short to show 60% of it
  - it stays visible in dark forced colors
  - its script loads on the home page only

## Sizes

Everything is set in `em` around one number, `--fs`, and a column is half an
em.

| Window | Type | What changes |
|---|---|---|
| 1440 and wider | 24px | his frame, left-aligned. The hairlines keep running to the right edge. |
| 960 to 1440 | follows the width | the page keeps its 120 columns, so nothing rewraps |
| under 1000 | 16px under 960 | paintings go to two tiles a row |
| under 760 | 16px | rows stack: the name, then the detail under it |
| under 640 | 16px | the "+" moves to one column from the edge, which leaves 41 columns at 360. The figure chip takes its own line and only the title line sticks. One painting a row, each at its own shape. |

On touch, every link is at least 44px tall: rows and cells grow to it, and
the small ones (the "+", a chip, a link in a sentence) get a 44px touch area.

The CSS math is `clamp`, `min`, `max` and plain arithmetic only. Never
`pow()` or `atan2()`: phone browsers do not all resolve those the same way,
and a font size that comes out not-a-number renders as 0. Tints are mixed in
`palette.ts`, not with `color-mix()`, for the same reason.

## Decisions the design didn't draw

These were left to the build, and each is marked in the code where it happens.

1. **Case study pages** were not drawn. They use the Chips grammar: the case
   name on the product designs yellow, the status line as the quiet helper
   line, "at a glance" as tinted rows, each section as a chip header over
   prose, each image as a plate on the section's tint, and "next up" as one row.
2. **The sticky header row**, so the "+" is always there to start the morph
   and to lead home.
3. **A link inside a sentence** (the case studies' closing sentence) is a
   small tinted chip that reads "+label". Its punctuation stays glued to it.
4. **Keyboard focus** shows the band and the alternate state with a 2px ink ring.
5. **Touch** gets the band and the alternate letters only while pressed, with
   no glitch delay. Seams and the magnet need a cursor that can rest.
6. **A 404 page**, made from the same pieces.
7. **The favicon** is the "+", in ink on the ground.

## Evidence language

Status words are evidence, not decoration. Never move a case to a stronger word:

- `simulated` is not `tested`, and `design study` is not `built`
- `one master affordance` and `campeón` are simulated, not tested with users
- `wildcard` is tested logic from a preregistered blind study
- guestpass is self-directed, not affiliated with apple, and nothing was built
- mfny is a self-directed redesign, not shipped by the client, and its THC numbers are placeholders
- chellbook's "not a promise of absolute safety" is the product's own safety line, and is imported rather than retyped so it can't drift

## Copy

Lowercase prose, American spelling, and no em or en dashes. Proper nouns keep
their capitals. "synthétique" always has its accent. Claims stay exactly as
narrow as written: "co-star", "recommended for and submitted to", "offered as
references".

## Fonts

Iosevka Charon Mono comes from Google Fonts, in 400 and 700. It is the only
face on the page at rest, and it is exactly half an em wide, which is what
the grid is built on. SLTF Dessign Maison is served as
WOFF2, a lossless repack of the OTF in `public/fonts/`, and appears only on
hover, as the glitch face, set at 1.14em so its lowercase stands as tall as
the mono's. Its own license field reads "All Rights Reserved, SilverStag Type
Foundry 2026". **Web redistribution rights need confirming.** Karrik stays in
`public/fonts/` because the hosted mfny demo loads it.

## Payload

Measured in Chrome at 1440 against the built site's preview server, first
screen only:

| Page | Transferred |
|---|---:|
| home | 132 kB |
| product designs | 126 kB |
| chellbook | 261 kB |
| about | 127 kB |
| paintings | 4,314 kB |

Paintings is the heavy page. The works are WebP at 1200px, shown 420px wide,
and at three tiles a row most of them fall inside the distance where Chrome
starts loading lazy images. Smaller copies for the tiles would cut this.
