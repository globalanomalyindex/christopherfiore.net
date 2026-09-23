# Design rationale

Why the final design is the way it is. Each point names what it replaced.

## Direction

- **An early-internet text post, made editorial.** The Figma letter (a 1440 × 1024 frame, serif, fill `#F5E4D9`) is the root. It keeps its lowercase voice and its "hi, i’m christopher robin!" opener. "Slightly editorial with the colors" was resolved as **warm paper and ink at rest, color only on hover**, so the page reads as plain text until you touch it.
- **Prose over interface.** Three structural directions were tried: paper ledgers (2a–2c), bordered tables and rules (3a–3b), and buttons inside the sentence (3c). The designer rejected ledgers ("i want it prose still") and removed the header and footer rules. 3c won because the paragraph never breaks: navigation *is* the sentence.
- **No chrome.** The nav bar, header rule, footer and "last updated" line were all removed. Subpages open with a breadcrumb *sentence* instead of a nav bar, which keeps the site "prose all the way down".

## Type

- **Averia Serif Libre** is the Figma's actual face (the first build guessed Crimson Pro, which was wrong).
- **Dessign Maison alternates** (`salt`, `ss01`) appear only on hover. The face ties back to the previous portfolio and its identity.

## Buttons

- **Framed words, radius 0**, carry the "graphic-brutalist buttons that turn bright on hover" from the old lattice portfolio. The hover band palettes, the stepped `steps(5)` wipes, the 1.5px inset outline and the ink pin are all lifted from that site's `hover.ts`.
- **Glitch that stays.** The first versions glitched randomly, then smoothly cross-faded. Both were rejected. Final: a quick random-order glitch into the full alternate set, which then *holds* while hovered.
- **Zero reflow.** Swapping fonts shifted the layout, which was called "confusion". Three fixes were tried:
  - fitting the alternate with letter-spacing and scaleX: rejected, "too spaced out"
  - per-letter grid cells: broke kerning at rest
  - **final:** an overlay glitch on top of the untouched text, plus a width reserved for the wider state. The designer then asked for a trailing `...` on hover to even out the visual spacing, except on the email address.
- **Magnetic pull.** Requested in the style of modern Apple buttons: lean toward the cursor, drag a little after the cursor leaves, then let go with a spring.

## Links

Old-school blue, softened for the paper: `#3F5195`, with plum visited. The ↗ arrow sits between the link and its punctuation, by request.

## Seams and skeleton (from Chickpea)

- From the four Chickpea ideas (4a the wordmark drop-down menu, 4b hero seams, 4c the skeleton reveal, plus the flashlight in 5b), the designer chose **4b plus the local skeleton of 5a**.
- **Buttons are solid boxes in the seam chain.** First they were excluded. Then they moved with their neighbors. Final: a hovered box *claims space* and shows its measurements instantly ("i want some button reactivity… not just them removed").
- **Two states.** Several versions preceded it: seams everywhere; subpages with text at rest; subpages with slight motion. Final, on every page: a quick 8px part; hold for 0.7s and it "explodes" into the full 24px state with the skeleton; the full state follows the cursor until it leaves the text. Buttons stay instant.
- **Improvements over Chickpea's code:**
  - dt-based springs, so the feel is the same at any refresh rate
  - hysteresis, so the effect doesn't flicker between two near-equidistant seams
  - a relax pass that guarantees no overlap
  - buttons as seam units, with `translate` and `transform` owned separately so the seams and the magnetic pull never fight
  - reduced motion keeps the measurements instead of turning everything off

## Content

- **Home:** SpaceXAI was removed ("for now"). Founder of perfection synthétique was added. "you can view my portfolio [product designs] and [paintings]," is locked to one line, and "or say hi" starts line two. The resume button was added.
- **About** follows the 2026 resume, but the experience section was removed by request. "at a glance" comes first because hiring readers skim credentials before they read the voice (a principle from the repo's `about.ts`). References and the Anthropic certificate (June 2026) were added.
- **Statuses:** every case with a case study says so ("w/ case study"). "Concept" is replaced by **"design study"** everywhere. After tokens is a **motion interaction study**. Chellbook is client work. Wildcard names its preregistered blind study (confirmed in the repo README). Lee and chipotle have no case study.
- **Descriptions** for campeón, wildcard, dither and chickpea were rewritten by the designer (see LABELING §6).
- **Stephen Fiore** is listed as Senior Digital Designer at Marvel Studios and an ongoing mentor (confirmed by the designer).
