# perfection synthétique

The portfolio of christopher robin fiore, at christopherfiore.net.

One typeface on one character grid: Iosevka Charon Mono, in ink on a cool
off-white ground. There are two kinds of page.

- **Home is the Ledger.** His Figma frame: the name, a "+", three ruled
  lines, and a white sheet column between two vertical rules that holds who
  he is and the four menu rows. Each rule ends in three ledger cells in the
  menu's colors, standing on the rule, and runs on as a faint hairline to the
  right edge. His signature is at the bottom.
- **Every other page is Chips.** A header row with the page title on a chip
  in the page's color, a rule, and a total set in ruled figure columns with a
  double rule under it. Under it, sections of tinted rows, each with its count
  in the same columns. Each row starts with a bold lead term. The back button
  is a JellyBox X in its own ledger box.

The "+" marks a link. Every link reads "+something", and a row with a "+" is
a button from edge to edge. Bright color at rest is only chips, ledger cells
and row tints. The loud color shows up on hover.

Going from one page to another plays the ASCII morph: the page is covered
and uncovered by a field of `+ = - : .` that ripples out from where you
clicked.

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
    morph.ts     the ASCII morph between pages, and its lineage films
    buttons.ts   hover, focus, press and touch, and one delegated listener set
    ink.ts       the glitch as a plan of drawings: the band, the strips, the letters
    band.ts      the brutalist band that floods a button
    glitch.ts    the alternate-letter faces, and the width a sentence link reserves
    lineage.ts   effects from his past projects, dealt now and then (lazy, cursor only)
    dress.ts     every pointer hover's shape, wire and Chickpea's Cut (lazy, with lineage)
    cells.ts     the pale cells the type stands in while the wire is up, and the blanks its X fills
    jx.ts        the JellyBox back button: entrance, colors, leaving (lazy)
    jellyx.ts    JellyBox's own optics renderer, mounted on a canvas (lazy, desktop only)
    jx-clock.ts  JellyBox's frame clock: its loop parks while nothing in it moves
    magnet.ts    the magnetic pull
    seams.ts     words that part under the cursor, in prose only
    skeleton.ts  the measurements drawn at the seam
    offsets.ts   how the magnet and the seams stay out of each other's way
  vendor/jellybox/  JellyBox's renderer and color code, copied from its repo
  vendor/chickpea/  Chickpea's grid and palette engines, copied from its repo
  vendor/after-tokens/  After Tokens' ambient score, copied from its repo
  styles/site.css
scripts/site-check.mjs   end-to-end checks in real Chrome and WebKit
scripts/tones.mjs        each painting's colours as a tiny grid of marks, for the film (npm run tones)
scripts/tiles.mjs        each painting at the widths its tile is drawn at, for the paintings page (npm run tiles)
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

**Three things move a button, through three properties.** The magnet writes
`transform`, the seams write `translate` and a press writes `scale`, so none
overwrites another. The magnet and the seams each subtract the other's
offset (`runtime/offsets.ts`) to find where the button rests. The morph reads
the same offsets, so it starts from where the "+" rests and not from where
the magnet has leaned it.

What runs where:

- **Band and glitch:** every link, on hover, keyboard focus and touch. The
  home menu rows and the pages block flood in their own page colors and vary
  everything else (below). Every other button draws from the color wheel. The
  back button has its own behavior (below).
- **Press:** every link. A button 480px wide or less goes to `scale: .97` in
  120ms, and a wide row scales only its label, to .985. The outline thickens
  to 3px and the strips double. Let go and it comes back in 160ms, both on
  the site's ease-out, with no bounce.
- **Lineage:** now and then, for a cursor, after the glitch (below).
- **Magnet:** every link, for a cursor. A full-width row leans 3px at most.
- **Seams and the skeleton:** prose only (ledes, paragraphs, captions), for a
  cursor that can rest. Rows, chips and the masthead stay on the grid.

## The glitch, on drawings

Ink on this site moves in held drawings 50ms apart, like a flipbook, never as
a smooth tween (`runtime/ink.ts`). One hover:

- the band comes in from the edge the pointer crossed: half its width in the
  first frame, then 80%, 94% and all of it at 150ms. The two strips arrive at
  50ms and 100ms
- the letters flip to Dessign Maison's alternates over four drawings,
  spreading out from where the pointer came in, with one twin-color flash and
  one slip. The "..." tail lands at 150ms, and every label has landed by 200ms
- sweeping from one button straight to the next gets the glitch in two
  drawings, because the eye is already moving
- leaving takes one drawing: the letters at once, the band gone at 50ms

Keyboard focus and touch get the end frame at once. So does reduced motion.

**Menu rows** (the home menu and every page's pages block) always flood in
their page's color, since that color says which page the row opens. So every
other part of the hover changes, drawn from the visit's own seeded stream:

- the top strip runs from the left rule to where the pointer came in, and the
  bottom strip from there to the right rule, both snapped to the mono cell.
  Coming in from a side, or by the keyboard, both run the full width
- each strip is 4, 6 or 8px, and the top one is missing one hover in four
- one hover in three, dealt from the row's own deck of three so it is never
  twice running, the figure's own cell (17, 20, say hi, pdf) fills in a
  paler step of the page color, at 100ms
- the strips never take another page's color
- the same row never draws the same hover twice running

`window.__ink.seed(n)` replays the stream, for the checks.

## The dress

Every pointer hover is random, the home menu included (`runtime/dress.ts`).
The glitch still comes first. At the same 220ms dwell as the lineage deck,
so a sweep across the menu never sets it off, each button deals from decks of
its own, shuffled from the
visit's seed and the button's address and dealt without replacement. A fresh
shuffle never starts with the card just played, so no button gets the same
hover twice running.

- **Shape.** The band's own box morphs after the cursor and always holds the
  whole label. Every target snaps to a structure, the mono cell or Chickpea's
  ratio canon, and a spring (stiffness 380, damping 0.78) carries the band
  between, so it moves in steps but never jumps. The button's box, the label
  and every neighbor stay exactly where they are. Rows get Full; Reach, whose
  free edge follows the cursor a cell at a time; Ratio, whose free edge sits
  on the canon ratio nearest the cursor (½, 1/φ, ⅔); and Tall, which grows
  over the next row on the cursor's side, 6px on home, under that row's words,
  and 3px into a page's gaps. Small buttons get Full, Outset 3px, Inset 3px,
  and Lean, 3px out on the cursor's side.
- **Dress.** The deck has six cards: plain 2, wire 2, Cut 1, Cut and wire 1.
- **The wire.** A skeleton in Chickpea's measure ink wraps the shape. It
  re-fits ahead of the band as the shape morphs. Each block of text (the
  label with its tag, and the figure or detail) stands in a flat cell, a
  paler step of the band's own color (`runtime/cells.ts`). A cell is the text
  plus a quarter em, its sides snapped out to the mono cell, the full height
  of the band, with a 1px band-ink rule on each side that faces open band. A
  gap under 3em goes into the cell, so every blank left is at least 3em wide.
  Each blank gets its own solid X, corner to corner, with a "+" on each
  corner, so the X never runs behind a letter. A row with no 3em blank gets
  no cells and no X. A Cut with the wire adds no cells: its text columns are
  the cells, and a run of text-free columns gets the X. The guide shows only
  in a blank and goes at once over a cell. The true size uses the same "+".
- **The true size.** Whenever the band is not the button's own size, a third
  deck keeps the true box in view, quietly, in band ink at half strength:
  Plus (the site's "+" at each true corner), Rule (ledger rules on the true
  top and bottom), Ticks (a ruler of mono cells under the true bottom edge),
  Wash (the true box in a pale step of the band's color, under a band that
  shrinks), and Dots (a dotted outline, the plain one). None of them touches
  the label. The side nearest the
  cursor leans out up to 8px, and a dashed guide sits on the cursor in the
  same frame. A chip beside the guide gives the shape's size, and the canon
  ratio's name (Chickpea's `ratioName`, such as ½ or 1/φ) when the cursor is
  within 1px of one. The chip only sits where there is no text.
- **The Cut.** Chickpea's own `composeGrid` tiles the shape around the label
  and the figure, so the label keeps one whole cell and no cut crosses any
  text. The cells fill on drawings from the cursor's cell outward. Their
  colors come from Chickpea's palette engine, or from steps of the page color
  on a menu row. Its credit reads "from chickpea".
- **Legibility.** The label is always band ink, and every surface it can
  touch holds band ink at 4.5:1 or better. Every band color does already. A
  Cut cell that touches text is lifted to OKLCH lightness 0.74, and no cell
  goes below 0.52, so none reads as black. A strip deep
  enough to reach the label's letters only takes a color that holds band ink
  at 4.5:1, on every button. A strip or outline that would run through the
  label is dropped. JellyBox's pigments
  must hold 4.5:1 in all three of their states, rest, highlighted and pressed.
  That rules out candy pink and lagoon blue, for both the Jelly slab and the X.
- **Smooth text.** Dessign Maison's alternates are not as wide as the mono,
  so each letter that changed face used to shove the ones after it. Now each
  letter is measured before and after a change and glides the difference away
  on a spring that keeps its velocity (about 220ms), and a letter that changes face comes in from a 2px blur over
  100ms, so it reads as one letter turning. Leaving, the overlay fades out over
  90ms as the resting word's ink comes back. The keyboard gets none of it.
- **JellyBox's skeleton.** Hovered, the back X's box shows its own skeleton,
  4px inside the rules: the box and its two diagonals. The box is all but
  square, so the diagonals run along the X's own strokes, and the disc,
  swelling to fill the box, is a circle drawn in a square. The Jelly card on a
  row shows its slab's box once the floor has opened, with a hairline at
  each side of a blank and the X only in the blank. The slab gets no cells,
  since JellyBox's glass is already the surface.
- **The order.** One thing at a time, never everything in one drawing: the
  shape begins to move and the wire's frame fades in over 150ms. The cells
  are ink, so they land on the band's 50ms drawings, 70% and then whole, from
  the band edge nearer each, the one nearest the cursor first. At 100ms the
  X, its crosses, the guide and the chip fade in over 120ms. Leaving, the
  cells go with the strips in one frame. The true-size mark comes in at 120ms; Chickpea's cells from the
  start, a drawing apart. The frame clock stops as soon as the springs
  settle, and a pointer move starts it again. Back on the same button within
  250ms of leaving, it keeps the same cards.
- **Where it runs.** It rides in the lineage chunk, after the page is seen,
  for a cursor. A hover dealt a lineage card stays Full and plain, so the
  effect starts from the settled glitch. Keyboard, touch and reduced motion
  are never dressed. The checks use `window.__dress.force()` and
  `__ink.seed(n)`.

## Lineage

Some hovers play a native translation of an effect from one of his past
projects (`runtime/lineage.ts`). It always starts from the settled glitch,
after the pointer has rested 220ms, and it adds layers only: no layout box
moves.

| Effect | From | What it does |
|---|---|---|
| Mark | lee | the band shrinks into a quiet mark, then the label is underlined |
| Decode | after tokens | the letters run through `+=-:.` and settle |
| Skeleton | after tokens | the text gives way to After Tokens' waiting rows, rounded cells that breathe and reshape on its own score with its glimmer passing, then its 280ms handover carries the cells into the real word groups as the ink arrives |
| Knockout | the motion archive | a deep step of the band's own color spreads out from the pointer, the letters knocked out in ground, then blinks |
| Jelly | jellybox | the band closes into one of JellyBox's round-ended controls, the whole row 3px in, drawn by its real optics |
| Tricode | mfny concentrates | the band splits into the three strain colors from MFNY's filter pill, and the one under the pointer lights up |
| Bayer | dither | the band dithers through a 4 by 4 Bayer pattern under the pointer |
| Canister | scream canister controls | the band squashes and pops, with a late letter |

- **The deck.** Fourteen cards: Mark 3, Decode 2, Skeleton 2, Knockout 2,
  Jelly 2, and one each of Tricode, Bayer and Canister. It is shuffled once a visit
  (`sessionStorage` `ps-lin`) and only deals cards that fit the button: a row
  takes any, a menu row Decode, Skeleton or Canister, a sentence link Mark,
  Decode, Skeleton or Jelly, a chip Mark, Decode or Skeleton. A menu row never gets Jelly, because Jelly
  trades the row's color for the nearest JellyBox pigment. Jelly needs the
  optics loaded and a row at least 34px tall. Its pigment is always one that
  holds band ink at 4.5:1. Home has no X, so it never loads the optics and
  never deals Jelly.
- **The odds.** A project's own row always plays its own effect (`data-lin`).
  Otherwise 1 hover in 4 deals a card, never within 1.5s of the last effect,
  and a hover back on the same button within 4s replays what it played.
- **The credit.** A dealt effect shows a small "from lee" in the bottom right
  corner, which holds a moment after the pointer leaves. A project's own row
  shows none, since the row already says where it came from.
- **Where it runs.** A cursor that can hover. The chunk loads after the page
  has been seen. Phones never fetch it. The keyboard and reduced motion never
  deal an effect. Under reduced motion a project's own row shows its effect's
  still end frame. `window.__lin.force(name)` forces the next effect, for the
  checks and for stills.

## The back button

Every subpage's back link is an X from JellyBox, taken from JellyBox itself,
in its own ledger box: the whole gutter, 72 by 73 at his laptop, ruled on all
four sides. The box's centre is 0.15em left of home's "+", so a
pin (`.jx-pin`) marks where the "+" is, and the film anchors there.

- **Real JellyBox.** On a desktop it is drawn by JellyBox's own renderer,
  copied into `src/vendor/jellybox/` (three.js physical glass with its
  spectral.js pigment mixing). It loads after the page is seen and is still
  at rest. Phones, a missing WebGL, Save-Data and scripts off get JellyBox's
  own CSS material skin instead. With scripts off it is glass blue.
- **Color.** Each page draws the next of JellyBox's ten pigments from a bag
  shuffled once a visit. It skips a pigment too close to the page's chip, so
  there is never a yellow X beside a yellow title.
- **Size.** A 1.5em disc (60px at his laptop) and a 0.7em X (28px).
- **Entrance.** Until it enters, the box holds the mono "+" on the pin, the
  same as home. It enters with the site's glitch as a curtain, which closes to
  a dot on the pin, then the X pops in at 45 degrees, a "+" turned, on
  JellyBox's own springs (from its `pocket.js`): it travels to the box's centre,
  overshoots to 1.044 and turns back past 0 by 8 degrees before settling.
  Back and forward, and reduced motion, show the X at once. If the script
  never arrives, the gate gives the X back at 3s.
- **Hover** is JellyBox's own highlight and pressed pigments, not the band.
  The disc swells to fill the box, still a disc, 3.5px inside the rules, on
  JellyBox's shape spring, and its lean eases off so it never touches a rule.
- **Closing, going back up** (home, or a case study to product designs). The
  film ripples out from the click at once, but the box stays out of it until
  the closing lands. The entrance plays backwards, faster: the jelly
  collapses onto the pin as the X turns to 45 degrees (100ms), the band takes
  the dot, opens over the box in drawings while the "+" lands in the mono,
  and leaves in one drawing. At 300ms the box is the floor and the mono "+",
  exactly home's, and the film's ghost of the box takes it.
- **Leaving any other way**: the X goes back to the pin at 45 degrees, then
  the mono "+", and the ghost takes the box when the film reaches it.
- On a phone the box is 48px square and sits in the header row's flow.

## The morph

This is a multi-page site, so the film is cut across two documents
(`src/runtime/morph.ts`).

1. **Cover, on the page you are leaving.** A plain click on a link to another
   page of this site is held while the page covers itself, in 340ms. At full
   cover the window is the
   ground, the name and the "+". The page leaves a short note in
   `sessionStorage` and the browser navigates.
2. **Reveal, on the page you are opening.** An inline script in every page's
   head (`MORPH_GATE` in `render.ts`, like the signature gate) finds the note
   and starts the page covered, before first paint. The runtime then uncovers
   it over 420ms.

Each half has its own curve, since the network sits between them: the cover
leaves the click fast and settles into full cover, and the reveal opens fast
where you were looking.

- **The grid** is cut from the real window in the page's own type. The cell
  is measured, not assumed, and the grid is placed so the page's real "+" is
  exactly one cell.
- **Where it starts.** Wherever you clicked (his note: "always ripples out
  from wherever the cursor was clicked instead of the corner"). The cover
  grows out of that point, and the point goes into the note, so the next page
  opens from the same place on the screen. A link opened from the keyboard
  starts at its own centre. Going home ripples out the same way.
- **The anchor is always on screen.** Home's anchor is his "+". On a subpage
  the same cell holds the JellyBox X, one level up: home, or product designs
  from a case study. During the film the cell shows a "+" (`data-glyph`) on
  the box's pin, and a ghost of the X's box sits on the film. The box stays
  out of the film until the front reaches it, and going up until the X has
  closed into the "+", so the closing always shows. The header row sticks to the top
  of the window, so the film can start from the X however far down the page
  you are.
- **Glyphs.** Five marks, `+ = - : .`, then blank. "+" is the edge that
  touches live page.
- **The ramp draws the page** (Fable's call, after his note asking for the
  page to resolve rather than just appear). On the reveal, the marks ahead of
  the front are a rough copy of the page they are about to show. The film
  reads the new page onto its grid once. Marks over a tint or a chip take
  its color. Marks over type are ink and hold a little longer. Marks over
  bare paper thin out sooner. Over a painting, each mark takes the painting's
  color, so it arrives as colored marks first. The "+" edge and the timing do
  not change, and the cover stays plain ink.
- It only reads the page and never writes to it. If reading takes more than
  6ms it keeps the colors and drops the rest, and if it fails the plain film
  plays. A painting's colors are read ahead of time (`npm run tones`, into
  `src/data/painting-tones.ts`) and carried on the image as `data-tone`,
  since reading a full painting during the reveal would cost a frame.
- **Lineage films.** Rolled at the click and written into the note, so both
  pages play the same one:
  - plain, 6 in 10, and always the first page change of a visit
  - Bayer front, from dither: behind the front, his "+" dithered through a
    4 by 4 Bayer pattern
  - Figures, from the motion archive: each line carries its own running
    count of the cells it covers, behind the front

  Going back up replays the kind that opened the page, and the same lineage
  film never plays twice running. The same moment of the same kind always
  gives the same frame.
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
focused. `window.__morph.seek(part, dir, p, kind, at)` holds the film at a
moment, started from the point `at` (the "+" if left out), and
`window.__morph.force(kind)` sets the next film, for the checks and for
stills.

## The signature

The home page ends on his handwritten name, in ink, 912px wide at full size.
It arrives finished, as one traced path in the HTML, so with scripts off it
is simply there. On every visit and reload it writes itself in over 1.65s,
and then hands back exactly that markup. Every subpage ends on the same
signature, small and still.

**Home is one screen.** At 1728 x 908 it is his screenshot, px for px. The name,
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
runs it against the live site. `CHROME_ARGS` passes extra switches to Chrome:
on a laptop at 20% battery or less, Chrome caps every page at 30fps, and
`CHROME_ARGS=--disable-frame-rate-limit` lifts the cap so the 60fps checks
measure the film rather than the battery. It checks:

- every page and link, the sitemap and the 404, and that the copy has no em
  or en dashes and uses American spelling
- every project under its own status word, in the index order, and the
  paintings by year
- his window at 1728 x 908, px for px: the name, the "+", his three lines,
  the rules, the ledger cells and hairlines, the sheet, the menu and the
  signature, and a subpage's X box, total and section counts
- band, glitch, zero reflow on every page, every hover label fitting its
  cell, the magnet, seams, the skeleton, and a sentence link claiming space
- the glitch on drawings, frame by frame: half the band in the first frame,
  all of it and both strips by 150ms, letters spreading from the pointer's
  side, landed by 200ms, two drawings on a sweep, one to leave
- the dress: twelve seeded hovers of one menu row are at least ten different
  and never the same twice running, with all four shapes in each round of
  four. Each shape lands where the cursor puts it, always holds the whole
  label, and moves no layout box, and Reach follows the cursor on the cell
  grid. On a menu row, rows of two and three lines, a Cut with the wire and
  the Jelly slab, every X joins the corners of a blank 3em or wider on the
  frame's top and bottom and clears every letter, with a "+" on each corner.
  Every line of text stands in a flat, full-height cell with its sides on the
  mono cell, in exactly the band mixed 55% toward the ground, which holds
  band ink at 4.5:1 on all 23 band colors. The cells land at 70% then whole
  by 100ms, the X only after, and leaving takes the cells in the next frame.
  No plates exist anywhere. Every resizing hover shows a true-size mark on the button's
  own box, all five in each round of five, and a Full band shows none. While
  the glitch lands no letter moves more than 9px between two frames. Every
  surface the label touches holds band ink at 4.5:1. The wire's guide sits on
  the cursor and its chip names ½ in Chickpea's words without touching the
  label. The Cut is legible and credited. Leaving is fast, the keyboard is
  never dressed, and Tall stays inside a page's gaps
- lineage: the chunk loads only for a cursor, the deck of twelve, each
  project's own row playing its own effect, every effect's layers and credit,
  zero reflow while it plays, nothing left behind after leaving, and the
  cooldown
- the back button: the box filling the gutter, the pin on home's "+", the
  60px disc and 28px X, the "+" before its entrance, the glitch curtain, the
  X popping in on the pin at 45 degrees and settling, the hover swelling to
  fill the box as a disc, the closing into the "+" going up, JellyBox's
  three.js renderer on a desktop and its CSS skin in a 48px box on a phone,
  the color bag and its skip list, leaving, reduced motion and scripts off,
  and JellyBox's loop parking at rest and waking on a hover
- menu hovers: twelve seeded hovers of one row are at least eight different
  and never the same twice running, in the page's own color, with strips of
  4, 6 or 8px from the entry point, the figure cell now and then, no other
  page's color, and full-width strips for the keyboard
- Jelly on a row: the whole row 3px in with round ends, the tag and detail on
  it, a readable pigment, gone at once on leaving, never on a menu row
- the lineage films: Bayer and Figures frames, the variant carried to the
  next page, and a plain film first
- the morph:
  - the page being left covers itself fully, edge to edge, then goes
  - the page being opened starts covered before first paint, is never seen
    before the reveal, and ends uncovered
  - under 1.5s across the two pages, at 60fps
  - the grid sits on the page's real "+" and real type, also when scrolled
  - the cover is a disc around the click, a real click starts it there, the
    next page opens from the same point, and a keyboard link starts at its
    own centre
  - going up by the back button, its box stays out of the film until the X
    has closed into the "+"
  - the ramp draws the page: read in 8ms or less, a name's word reads as type
    and the gutter as paper, tinted rows wear their color, every color is
    OKLCH lightness 0.76 or darker, no box moves and nothing on the page is
    written, the pointer reaches the page inside the ring, paintings arrive
    in their own colors, and a failed read still gives the page back
  - a page is never left covered: no script, a navigation that hangs, a
    stale note, a reload, back and forward, the back/forward cache
  - modifier clicks, new tabs, the PDF and in-page jumps are left alone
  - with scripts off every page is fully visible and links are plain links
- the frame budget: 2s of idle on five pages runs no frames at all, in
  Chrome and WebKit, and none after a hover on the X or a row that played
  Jelly; after 5s at rest the X still swells by the second frame; JellyBox's
  `optics.js` hashes to the copy we took. 120 pointer moves inside a hovered
  row cost 12 layouts at most and one style recalc a frame at most, because a
  move reads the button's box once, in the event, and the magnet writes its
  lean once, in the next frame; settled, the lean is exactly what it always
  was. Resting on a link in a sentence, the seams stop measuring once the
  box has settled: no frames in the last second of two, with the arrows and
  the size ending exactly on the box. A resting hover on a row runs the
  clock 70 frames at most, then none, and those frames make no DOM queries
  (in Chrome and WebKit). Every painting tile has a `srcset`
  and a `sizes`, its copies exist at the widths they claim, no tile is drawn
  from a file narrower than it is drawn (1x and 2x, 1440 and 390 wide, and
  WebKit at 3x), and the first screen of paintings at 1440 loads 800 kB of
  pictures at most. Against a local build, the scripts stay inside their
  gzipped budgets
- reduced motion (no film, no glitch, no magnet, no lineage), keyboard
  focus, and touch
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

```css
--fs: clamp(16px, min(100vw / 43.2, 26.667px + 100vw / 129.6), 48px);
```

| Window | Type | What changes |
|---|---|---|
| 1728 and wider | 40px at 1728, then a third as fast, to 48px at 2765 | his laptop, from his screenshot. The page stays left-aligned and the hairlines keep running to the right edge. |
| 691 to 1728 | the width over 43.2: 33.3px at 1440, 22.2px at 960 | the window is always 86.4 columns, 80 of them content, so nothing rewraps |
| 690 and under | 16px | rows stack: the name, then the detail under it. The "+" moves to one column from the edge. The total takes its own line and only the title line sticks. The back X is a 48px box in the header row. Paintings go two a row. |
| 480 and under | 16px | one painting a row, each at its own shape |

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
4. **Keyboard focus** shows the band and the alternate state at once, with a
   2px ink ring.
5. **Touch** gets the band and the alternate letters only while pressed, with
   no glitch delay. Seams, the magnet and lineage need a cursor that can rest.
6. **A 404 page**, made from the same pieces.
7. **The favicon** is the "+", in ink on the ground.

## His round 3 answers

1. Type keeps growing past his laptop, slowly, to 48px.
2. The ladders become figure-column ledgers.
3. A project's own row always plays its own effect.
4. A dealt effect shows a small credit, "from lee".
5. On a desktop the X is JellyBox's real renderer, loaded after the page is
   up. Phones get JellyBox's CSS skin.
6. The jelly is still at rest. It doesn't breathe.
7. Sweeping fast gets the glitch in two drawings.
8. Jelly gets two cards in the deck of twelve.

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

## JellyBox

`src/vendor/jellybox/` is JellyBox's own source, copied from its repo and
not redrawn: the renderer (`renderer/`, everything but its `index.js`),
`color.js`, `tokens.js` and `contrast.js`. JellyBox is MIT licensed, and its
`LICENSE` and `THIRD_PARTY_NOTICES.md` are kept beside it. It brings two
dependencies, `three` (MIT) and `spectral.js` (MIT), pinned in
`package.json`. The `.d.ts` files next to it are ours, so TypeScript can
check the calls.

**Its loop parks at rest.** JellyBox's renderer asks for a new frame on
every frame, even when the scene says there is nothing to draw. So a page at
rest used to run 60 empty frames a second for the X, and 60 more for the
Jelly canvas once a row had played it. The vendored files stay byte for byte
(a check hashes `optics.js`). Instead `vite.config.ts` hands that one module
our own `requestAnimationFrame` and `cancelAnimationFrame` from
`runtime/jx-clock.ts`, in dev and in the build, and the build fails if a new
copy of JellyBox stops calling them. When a scene says it is frozen, its next
frame is held. `jx.ts` wakes it whenever the X's state changes: the pointer
coming or going, a press, focus, the entrance, the closing, leaving, a return
from the back/forward cache, and a Jelly row starting. A woken spring steps
one frame's time first, as it did before, so the X swells in the same frames
it always did.

## Chickpea

`src/vendor/chickpea/` is Chickpea's own pure seeded core, copied as it is
from globalanomalyindex/chickpea at c55533e, with no React. It holds the grid
engine (`composeGrid` and its tree, the ratio canon with `snapToRatio` and
`ratioName`, `mulberry32` and `hashSeed`) and the OKLCH palette engine
(`generatePaletteOklch`, with its harmonizing and lightness-spread floor).
It is his own project, so take a fresh copy from it rather than editing the
copy here.

## After Tokens

`src/vendor/after-tokens/ambient-score.ts` is After Tokens' own decorative
score, copied as it is from globalanomalyindex/after-tokens at 844d332 (MIT,
`LICENSE` beside it). The Skeleton card runs it, and takes the rest of its
values from After Tokens' own CSS: the cell ink at 0.2 and round, the breath
from 0.72 to 1, the white glimmer, and the 280ms handover with its ink curve
(0.45 at 38%, full at 74%, settling from 1.5px) and its rule of three words
at most to a target.

## Payload

Measured in Chrome against the built site's preview server, cache off, first
screen only, 2.5s after the network goes quiet, counting every byte on the
wire (2026-11-19):

| Page | Desktop, 1440 x 900 at 1x | Phone, 390 x 844 at 3x |
|---|---:|---:|
| home | 169 kB | 142 kB |
| product designs | 339 kB | 143 kB |
| chellbook | 427 kB | 278 kB |
| about | 341 kB | 144 kB |
| paintings | 786 kB | 2,499 kB |

On a desktop every subpage carries about 200 kB more than a phone: that is
JellyBox's optics for the back X (three.js and spectral.js, 176 kB gzipped)
and the lineage chunk. Both load only after the page has been seen, so they
never hold up the first paint, and phones never fetch them.

The scripts, gzipped:

| Chunk | Size | Loads |
|---|---:|---|
| main | 17.9 kB | every page |
| signature | 7.6 kB | home only |
| lineage, with the dress, Chickpea and After Tokens | 19.6 kB | after the page is seen, for a cursor |
| jx, with the cells | 6.4 kB | subpages, and with lineage |
| jellyx | 176 kB | subpages on a desktop, after the page is seen |

The checks hold main to 18.5 kB, lineage to 23 kB and jx to 7 kB.

**The tile copies.** Paintings used to be the heavy page: every tile loaded
its painting's own file, 1200px wide, which came to 3,979 kB on a desktop
measured this way. A tile only draws its painting 147 to 493px wide there.
Now each tile's picture has a `srcset` with two smaller copies, 480 and
800px wide, and the painting's own file, and a `sizes` that states the width
the tile really draws it at, worked out from the tile's size in `site.css`.
The browser takes the smallest file that is at least as wide as the tile in
its own pixels: at 1440 wide that is the 480px copy at 1x and the full file
at 2x, the 800px copy on a phone at 2x, and the full file on a phone at 3x.
A 2x laptop comes to 2,459 kB and a phone at 1x to 499 kB. The picture is
drawn at the same size either way.

Make the copies with `npm run tiles` (`scripts/tiles.mjs`, which needs
cwebp: `brew install webp`) after adding or changing a painting. It writes
`public/artstation/t/<slug>-480.webp` and `<slug>-800.webp` at quality 78,
only where the copy is narrower than the painting's own file. The build
refuses to run if a painting is missing a copy.
