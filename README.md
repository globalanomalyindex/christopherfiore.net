# perfection synthétique

The portfolio of christopher robin fiore, at christopherfiore.net.

An early-internet text post, made editorial: warm paper and ink, lowercase
prose, and navigation that is part of the sentence. Every link is a framed
word inside a line of text. At rest the page is only paper, ink, a secondary
ink and link blue. Color shows up only on hover.

Built from the prose redesign handoff. Its docs are kept in
[`_handoff/portfolio-prose/`](_handoff/portfolio-prose/). `README.md` there is
the spec, `CONTENT.md` holds every word of the copy, and `LABELING.md` holds
the status vocabulary.

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
  prose.ts       the kit: btn, crumb, title, lede, body, section, figure
  paths.ts       every URL the site owns
  pages/         home, designs, casestudy, paintings, about, notfound
  data/          the copy, and the case records it is set from
  main.ts        the browser entry: wires the runtime to the finished page
  runtime/
    buttons.ts   hover, focus and touch, and one delegated listener set
    band.ts      the brutalist band (README §7.1)
    glitch.ts    width reservation and the alternate-letter glitch (§7.2)
    magnet.ts    the magnetic pull (§7.3)
    seams.ts     words that part under the cursor (§7.4)
    skeleton.ts  the measurements drawn at the seam (§7.4.2 and §7.4.3)
    offsets.ts   how the magnet and the seams stay out of each other's way
  styles/site.css
scripts/site-check.mjs   end-to-end checks in real Chrome
```

`vite.config.ts` renders the pages twice over. In dev, a middleware renders
each request through Vite's module graph. At build time, every route goes to
`dist/<route>/index.html`, plus `404.html` and `sitemap.xml`. So every URL is
a real file with its prose already in it. It reads with scripts off, crawlers
see the words, and the first request is a 200.

Routes end in a slash (`/about/`) because each one is a folder on Pages, and
the slashed form skips a redirect.

## Two rules the runtime keeps

**Hover never changes layout.** Every button label reserves the wider of its
two widths once the fonts load: Averia at rest, or Dessign Maison's alternates
plus the "..." tail. The reservation is written in `em`, so it scales with the
fluid type. On hover the resting word goes transparent, and an overlay of the
same text glitches on top of it. The check script compares every layout box
before and during a hover to prove nothing moves.

**Two systems move a button, through two properties.** The magnet writes
`transform` and the seams write `translate`, so neither overwrites the other.
Each subtracts the other's offset (`runtime/offsets.ts`) to find where the
button rests.

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

The script uses system Chrome. `BASE=https://christopherfiore.net npm run check:site`
runs it against the live site. It checks:

- every page and link, and that the copy has no em or en dashes and uses American spelling
- the fourteen status lines against `LABELING.md`
- the type scale at 1440
- band, glitch, zero reflow, the magnet, seams, the skeleton, and a button claiming space
- reduced motion, keyboard focus, and touch
- that every page fits 375px wide with no punctuation orphaned from its button

## Decisions the design didn't make

These were left to the build, and each is marked in the code where it happens.

1. **Phones.** README §8's recommendations are followed: fluid type with
   floors, and one painting column under 800px. The home line unlocks under
   960px. Below 480px the type takes one more step down (lede 22, body 18).
   Without it, the longest labels fill a whole line and their punctuation
   drops to the next. Seams and the magnet need a cursor that can rest, so
   touch gets the band and the alternate letters only while pressed, with no
   glitch delay.
2. **Keyboard focus** shows the band and the alternate state with a 2px
   link-blue ring, as §8 recommends.
3. **Punctuation stays with its button.** Browsers allow a break between a box
   and the period after it. The prototype has one of these at 1440 itself,
   with ". i’d love to hear from you :)" starting its own line on the about
   page. `prose.ts` glues trailing punctuation to its button, and the button
   can still wrap its own label.
4. **Three more case pages on the chellbook template.** These are guestpass,
   mfny concentrates and df2tm. Their text is the case text the lattice site
   shipped, from `src/data/`, and every claim boundary is kept. The other
   cases marked "w/ case study" keep their case studies on their own
   deployments, and their buttons go there, as the design wired them.
5. **A 404 page**, made from the same pieces.
6. **The favicon** is the one component: an ink frame with the ↗ arrow, on paper.

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

Averia Serif Libre comes from Google Fonts. SLTF Dessign Maison is served as
WOFF2, a lossless repack of the OTF in `public/fonts/`, and appears only on
hover. Its own license field reads "All Rights Reserved, SilverStag Type
Foundry 2026". **Web redistribution rights need confirming.** Karrik stays in
`public/fonts/` because the hosted mfny demo loads it.

## Payload

Measured in Chrome against the built site, first screen only:

| Page | Transferred |
|---|---:|
| home | 162 kB |
| product designs | 163 kB |
| chellbook | 290 kB |
| about | 165 kB |
| paintings | 2,720 kB |

Paintings is the heavy page. The works are WebP at 1200px, and in two columns
most of them fall inside the distance where Chrome starts loading lazy images.
