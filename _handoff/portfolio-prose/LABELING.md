# Labeling standard

One naming scheme across the design files, the build, and the copy, so nothing is ambiguous.

## 1. Screens

| Screen name (use everywhere) | `data-screen-label` | Prototype anchor | Route |
|---|---|---|---|
| home | `home` | `#p-home` | `/` |
| product designs | `product designs` | `#p-designs` | `/product-designs` |
| case study · chellbook | `case study chellbook` | `#p-case` | `/product-designs/chellbook` |
| paintings | `paintings` | `#p-paintings` | `/paintings` |
| about + say hi | `about and say hi` | `#p-about` | `/about` |

Exploration IDs (in `Portfolio Prose (explorations).dc.html` only): `1a–1g`, `2a–2c`, `3a–3c`, `4a–4c`, `5a–5c`. **5a** is the system the final site is built on.

## 2. Data attributes (prototype → build)

| Attribute | On | Meaning |
|---|---|---|
| `data-paper` | page root | carries the paper background |
| `data-seams-root` | page root | enables §7.4 seams on everything inside |
| `data-skel-mode="local"` | page root | the local skeleton (5a). The only mode used in the final site |
| `data-seams` | `h1`, `h2`, `p`, `figcaption` | the element's words become seam units |
| `data-unit` | runtime only | a word span created by the seam engine. Never author it |
| `data-btn` | the framed button `<a>` | band + glitch + magnet + seam box |
| `data-word` | the label `<span>` inside a button | the text that glitches and gets its width reserved |

Legacy attributes that may appear in the explorations file only: `data-noband` (4a menu chips), `data-skel-root` / `data-skel-toggle` / `data-skel-dot` (4c/5c toggles), `data-skel-flash` (5b), `data-cp-menu` / `data-cp-drop` (4a), `data-glitch-idle` (removed idle glitch).

## 3. Buttons

- Label: lowercase unless a proper noun; the exact target name (`product designs`, `paintings`, `about`, `home`, `resume`, `certificate`, the case or painting title, the email address).
- The ↗ arrow is **always** inside the box, after the label.
- Punctuation always sits **outside** the box.
- Hover tail: `...` is appended in the hover state to every label **except** ones containing `@`.

## 4. Case status vocabulary (product designs index)

Format: `(ink-2) <status>[, w/ case study], <year>.`

| Status | Meaning (carried from the repo's evidence rules) |
|---|---|
| `built` | something you can open and use |
| `design study` | designed, not built or commissioned (replaces "concept" everywhere) |
| `motion interaction study` | after tokens only: a working prototype studied as motion and interaction |
| `client work` | done for a real client (chellbook: a client living with celiac disease) |
| `simulated` | behavior proven in simulation, not shipped |
| `tested logic from a preregistered blind study` | wildcard only |

Add `w/ case study` whenever a case page or case-study document exists. Today that's: after tokens, apple wallet card sharing concept, chellbook, mfny concentrates, one master affordance, adhd mode, df2tm, chickpea, wildcard. **Not** lee, not chipotle app ui cleanup.

The project name "apple wallet card sharing concept" keeps the word "concept" because it's the title, not a status.

Final assignments (14):

| # | Case | Status line |
|---|---|---|
| 01 | after tokens | motion interaction study, w/ case study, 2026. |
| 02 | apple wallet card sharing concept | design study, w/ case study, 2026. |
| 03 | chellbook | client work, w/ case study, 2026. |
| 04 | lee | design study, 2026. |
| 05 | mfny concentrates | built, w/ case study, 2026. |
| 06 | chipotle app ui cleanup | design study, 2026. |
| 07 | one master affordance | simulated, w/ case study, 2026. |
| 08 | adhd mode | built, w/ case study, 2026. |
| 09 | df2tm | built, w/ case study, 2026. |
| 10 | campeón | simulated, 2026. |
| 11 | chickpea | built, w/ case study, 2026. |
| 12 | wildcard | tested logic from a preregistered blind study, w/ case study, 2026. |
| 13 | dither | built, 2026. |
| 14 | three zones: camera market ui fix | design study, 2026. |

## 5. Files and assets

- Documents: `public/documents/<kebab-case>.pdf` (`christopher-robin-fiore-resume-2026.pdf`, `anthropic-ai-fluency-certificate.pdf`).
- Paintings: `public/artstation/<slug>.webp`, with the slug from `src/data/paintings.ts`.
- Case cards: `public/projects/card/<case-id>.webp`, with the id from `src/data/cases.ts`.
- Handoff docs: UPPERCASE `.md` at the bundle root.

## 6. Case descriptions changed by the designer (these override `src/data/cases.ts`)

| Case | Line |
|---|---|
| campeón | using natural predator behavior and environments to improve human computer interaction accuracy with a mouse input |
| wildcard | testing if default mode network emulation in LLMs leads to more creative outputs |
| dither | an experiment testing what a painting engine looks like if it is intentionally trying to be physically impossible compared to real paint |
| chickpea | a seeded color and grid generation studio |

The about page's practice paragraph mirrors this vocabulary (as the repo's `about.ts` requires). It now ends "…whether that is built, tested, simulated, or a design study."
