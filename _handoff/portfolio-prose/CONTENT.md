# Content: verbatim copy, per page

Generated from `design/Portfolio Site.dc.html`. This is the exact shipped copy. Buttons are written as `[label ↗](href)`. Text in *(grey: …)* is secondary color `#6E5B57`. **Bold** is weight 700. `⏎` is a forced line break. Do not rewrite: the voice rules are in README §9.


## home

`data-screen-label="home"` · anchor `#p-home`

- h1 88px: hi, i’m christopher robin!
- p: i’m a web designer & product designer specializing in UI/UX and artificial intelligence, and founder of design studio perfection synthétique.
- p: on the side, i’m an actor and concept artist. i love storytelling, and i bring that unique approach to all my technical work.
- p: you can view my portfolio [product designs ↗](#p-designs) and [paintings ↗](#p-paintings), ⏎ or say hi [chrisrobinfiore@gmail.com ↗](#p-about). you can also read my [resume ↗](public/documents/christopher-robin-fiore-resume-2026.pdf). i’d love to hear from you :)

## product designs

`data-screen-label="product designs"` · anchor `#p-designs`

- p 26px: back [home ↗](#p-home), or over to [paintings ↗](#p-paintings) and [about ↗](#p-about).
- h1 88px: product designs
- p 40px: i design ambitious products, prototype the difficult parts, and test whether the ideas actually hold up.
- p 32px: [after tokens ↗](https://globalanomalyindex.github.io/after-tokens/): parallel language that shows what is provisional and what has settled. *(grey: motion interaction study, w/ case study, 2026.)*
- p 32px: [apple wallet card sharing concept ↗](#): a temporary single use version of your card, handed to someone over imessage. *(grey: design study, w/ case study, 2026.)*
- p 32px: [chellbook ↗](#p-case): AI-based iOS app for celiac food safety, designed for a client living with celiac disease. *(grey: client work, w/ case study, 2026.)*
- p 32px: [lee ↗](#): self-tape studio for actors: the notes become color you read while acting. *(grey: design study, 2026.)*
- p 32px: [mfny concentrates ↗](#): product page redesign: one card per SKU becomes one card per strain. *(grey: built, w/ case study, 2026.)*
- p 32px: [chipotle app ui cleanup ↗](#): pickup checkout redesign: nineteen findings, rebuilt to fit one screen. *(grey: design study, 2026.)*
- p 32px: [one master affordance ↗](https://globalanomalyindex.github.io/carplay-siri-contacts/): one persistent control does activation, targeting and a safe abort. *(grey: simulated, w/ case study, 2026.)*
- p 32px: [adhd mode ↗](https://globalanomalyindex.github.io/adhd-mode-linkedin/): a feed becomes a bounded session with a visible end and a return queue. *(grey: built, w/ case study, 2026.)*
- p 32px: [df2tm ↗](#): a learning layer for claude code that teaches the concept behind the work. *(grey: built, w/ case study, 2026.)*
- p 32px: [campeón ↗](https://globalanomalyindex.github.io/campeon/): using natural predator behavior and environments to improve human computer interaction accuracy with a mouse input. *(grey: simulated, 2026.)*
- p 32px: [chickpea ↗](https://globalanomalyindex.github.io/chickpea/): a seeded color and grid generation studio. *(grey: built, w/ case study, 2026.)*
- p 32px: [wildcard ↗](https://globalanomalyindex.github.io/wildcard/): testing if default mode network emulation in LLMs leads to more creative outputs. *(grey: tested logic from a preregistered blind study, w/ case study, 2026.)*
- p 32px: [dither ↗](https://globalanomalyindex.github.io/dither/): an experiment testing what a painting engine looks like if it is intentionally trying to be physically impossible compared to real paint. *(grey: built, 2026.)*
- p 32px: [three zones: camera market ui fix ↗](#). a two-zone gallery dead ends at the video, so give the middle a job. *(grey: design study, 2026.)*
- p 32px: i also keep a [motion archive ↗](#) of eight series, 58 studies.

## case study · chellbook

`data-screen-label="case study chellbook"` · anchor `#p-case`

- p 26px: one of my [product designs ↗](#p-designs). back [home ↗](#p-home).
- h1 88px: chellbook
- p 26px: gluten-free recipe conversion and label safety, iPhone. client work for a client living with celiac disease, design spec, 2026.
- p 40px: chellbook takes any recipe a person pastes in and returns a version they can safely eat, then follows that answer out of the kitchen and into the supermarket aisle.
- p 32px: *a safety product that happens to be about food.*
- figure: `public/chellbook/boards/cover-and-foundation.webp`, alt: "The Chellbook cover board: palette, type, motion and voice"
  - caption: foundation. palette, type, motion, voice.
- h2 48px: the core loop
- p 32px: *(grey: 1.)* paste a recipe, by link or plain text.
- p 32px: *(grey: 2.)* the app converts it, asking a question only where guessing would be unsafe.
- p 32px: *(grey: 3.)* it returns a breakdown: what is fine, what had gluten and was swapped, what still needs a label read.
- p 32px: *(grey: 4.)* unresolved label checks ride the shopping list to the store.
- p 32px: *(grey: 5.)* cooking a result and rating the texture feeds a new version of the recipe.
- h2 48px: four safety states, never a fifth
- p 32px: **verified**. supported by the recipe and by the ingredient's own published information. not a promise of absolute safety.
- p 32px: **check the label**. depends on the package. needs a certified gluten-free mark or a shared-equipment statement.
- p 32px: **blocking**. a known gluten source. this step cannot go ahead as written.
- p 32px: **unknown**. information is missing. one question closes the gap.
- figure: `public/chellbook/boards/safety-states.webp`, alt: "The four safety states side by side: verified, check the label, blocking, unknown"
  - caption: the four states, side by side. unknown alone carries the dashed edge.
- h2 48px: still undesigned
- p 32px: the trusted brands editor is referenced from profile and settings, but its editing UI is not designed.
- p 32px: cross-contamination in a shared kitchen is out of scope, and it is the single most requested thing from celiac users.
- p 32px: mid-cook discovery has no screen: what happens when a cook is already halfway through and finds the problem then.
- p 32px: recipe imagery is emoji placeholders, which is a placeholder and not a decision.
- p 32px: whether saved recipes open with no network is unspecified.
- p 32px: there is no designed behavior for an evidence line whose read date has gone stale.
- h2 48px: the prototypes
- p 32px: you can open the [product design showcase ↗](#), which is the spec, or the [wireframe exploration ↗](#), which is the same product before the device chrome and the final palette.
- p 32px: next up is [mfny concentrates ↗](#), or go back to [product designs ↗](#p-designs).

## paintings

`data-screen-label="paintings"` · anchor `#p-paintings`

- p 26px: back [home ↗](#p-home), or over to [product designs ↗](#p-designs) and [about ↗](#p-about).
- h1 88px: paintings
- p 40px: twenty works, 2023 to 2025. concept art and illustration: photobash, blender, substance.
- figure: `public/artstation/the-steppe.webp`, alt: "A helicopter lifts two figures above an isolated stone peak rising from an amber plain"
  - caption: [the steppe ↗](https://www.artstation.com/artwork/JrneqD) silhouette and distance, *(grey: 2025)*.
- figure: `public/artstation/shepherd.webp`, alt: "A shepherd guides a flock along the crest of a vivid green hillside beneath broad clouds"
  - caption: [shepherd ↗](https://www.artstation.com/artwork/L4laW5) scale and atmosphere, *(grey: 2025)*.
- figure: `public/artstation/balance.webp`, alt: "A small orange-robed figure threads through pale, moss-covered stone ruins"
  - caption: [balance ↗](https://www.artstation.com/artwork/04Kvy4) structure, moss, and one orange signal, *(grey: 2024)*.
- figure: `public/artstation/verticality.webp`, alt: "Two sword fighters cross blades on a flowered slope below a monumental rock face"
  - caption: [verticality ↗](https://www.artstation.com/artwork/vbDE4O) negative space and focus, *(grey: 2024)*.
- figure: `public/artstation/four-year-progress.webp`, alt: "A lone figure watches a dragon circle between a distant castle and a luminous moon"
  - caption: [four year painting progress ↗](https://www.artstation.com/artwork/XJ1AbR) practice made visible, *(grey: 2024)*.
- figure: `public/artstation/one-day.webp`, alt: "Crowds gather at the foot of a bright, densely stacked white megastructure"
  - caption: [one day, i'll make it to the top ↗](https://www.artstation.com/artwork/oJ6AZk) recent painting, *(grey: 2025)*.
- figure: `public/artstation/nix.webp`, alt: "Two mounted riders pause in a snow-covered plain beneath a dark advancing storm"
  - caption: [nix ↗](https://www.artstation.com/artwork/Bk3EyA) quiet scale under a storm field, *(grey: 2024)*.
- figure: `public/artstation/never-seen.webp`, alt: "Three horses and a humanoid figure stand in a forest clearing beneath a hovering craft"
  - caption: [i've never seen you before ↗](https://www.artstation.com/artwork/AZQ1Ko) narrative distributed across one horizon, *(grey: 2024)*.
- figure: `public/artstation/not-strong-enough.webp`, alt: "Cloaked travelers approach a colossal grounded vessel through a misty field"
  - caption: [we aren't strong enough yet ↗](https://www.artstation.com/artwork/DLNQXG) recent painting, *(grey: 2024)*.
- figure: `public/artstation/the-keeper.webp`, alt: "A red-robed keeper stands between immense white columns at the edge of darkness"
  - caption: [the keeper ↗](https://www.artstation.com/artwork/kQkQgz) selected painting, *(grey: 2024)*.
- figure: `public/artstation/the-sky-was-on-fire.webp`, alt: "A solitary figure stands on a jagged mound before hazy ruins under a coral-lit sky"
  - caption: [the sky was on fire ↗](https://www.artstation.com/artwork/qeEBoN) signal and intentional focus, *(grey: 2023)*.
- figure: `public/artstation/lets-take-a-walk.webp`, alt: "Two tiny red figures walk across a green field beneath a vast wall of sunlit clouds"
  - caption: [let's take a walk ↗](https://chrisfiore.artstation.com/projects/YB9wvb)
- p 32px: all twenty are on [artstation ↗](https://www.artstation.com/chrisfiore).

## about + say hi

`data-screen-label="about and say hi"` · anchor `#p-about`

- p 26px: back [home ↗](#p-home), or over to [product designs ↗](#p-designs) and [paintings ↗](#p-paintings).
- h1 88px: about
- p 40px: my name is christopher robin fiore. i'm a product designer, and my ideas don't stay ideas. they get prototyped, tested, and scrutinized fast, with help from agentic AI workflows i deploy and manage myself. that puts research, stress tests, and counterarguments in front of me while the design can still change. what reaches you is not a pretty idea. it’s a working system with a usable prototype, a hypothesis an AI agent swarm attacked from every angle, a design that already knows where it breaks.
- p 32px: i take ambiguous problems to interaction architecture, build the hard behavior as a working prototype in React and TypeScript, then run the test that could prove it wrong. two published open-source plugins and preregistered blind studies with published methodology and data. hands-on with language models since GPT-2 in 2019.
- h2 48px: at a glance
- p 32px: *(grey: product design.)* product strategy, UX/UI, interaction design, information architecture, user flows, wireframing, prototyping, design systems, state design, responsive design, motion, accessibility (WCAG).
- p 32px: *(grey: design engineering.)* React, Next.js, TypeScript, JavaScript, Vite, Tailwind CSS, Motion, XState, Three.js.
- p 32px: *(grey: research and evaluation.)* experiment design, preregistration, blind grading, simulation, comparative evaluation, research synthesis, Vitest, Playwright, axe-core, GitHub Actions.
- p 32px: *(grey: tools and AI.)* Figma, Claude Design, Adobe Photoshop, Blender, Claude Code, Codex, plugin architecture, agentic workflow direction, AI-native interaction design.
- p 32px: *(grey: education.)* Diploma in Concept Art, CG Spectrum College of Digital Art and Animation. BFA Studio Art coursework, Adelphi University, 2020 to 2021. 12 courses at Learn Squared with Jama Jurabaev, Greg Rutkowski, and Maciej Kuciara.
- p 32px: *(grey: training.)* Lee Strasberg Theatre and Film Institute, two years, Advanced Method.
- p 32px: *(grey: certification.)* AI Fluency: Framework & Foundations, from Anthropic, June 2026. [certificate ↗](public/documents/anthropic-ai-fluency-certificate.pdf)
- p 32px: *(grey: mentorship.)* graphic design and Photoshop under Stephen Fiore, Senior Digital Designer at Marvel Studios, ongoing.
- p 32px: *(grey: research.)* college-level Capstone and Research, 2017 to 2019. paper submitted to the Regeneron Science Talent Search.
- p 32px: *(grey: screen.)* co-star, Marvel Studios' Daredevil: Born Again (2025). campaign lead, New York Blood Center.
- h2 48px: practice
- p 32px: the loop is short on purpose. an idea gets built far enough to actually use, then attacked: agent swarms running research, edge cases, and counterarguments in parallel, on a timescale where the answers still change the design.
- p 32px: most of what comes back is unglamorous and early, which is exactly when it is worth having. what survives ships with its evidence attached and labeled for what it is, whether that is built, tested, simulated, or a design study.
- h2 48px: design and craft
- p 32px: i studied Concept Art and Illustration at CG Spectrum College of Digital Art and Animation, and finished with a Diploma in Concept Art. i was personally mentored in graphic design and Photoshop by Stephen Fiore, Senior Digital Designer at Marvel Studios.
- p 32px: the training is 2D first: drawing, sketching, thumbnailing, and photobashing. it carries into 3D through Blender, texturing in Substance Sampler, and 3D paintovers. Figma is where the product work lands.
- h2 48px: AI practice
- p 32px: i have been studying and using GPT since GPT-2 in 2019, which is long enough to have watched the tooling change shape several times over.
- p 32px: in practice that means Claude Code on both CLI and desktop, Claude Design, and Codex, plus agentic workflows i build and run myself: Ultracode in Claude Code, subagents in ChatGPT Work.
- p 32px: i deploy and manage these rather than consume them as a service. that is the difference between a tools list and actual leverage.
- h2 48px: research
- p 32px: i studied college-level Capstone and Research from 2017 to 2019 and ran a months-long study on the effects of predatory food labeling on adolescents' nutritional choices and awareness, including real human surveying. the full paper was recommended for and submitted to the Regeneron Science Talent Search.
- p 32px: chellbook, on the product design channel, is a label-reading product. that is not a coincidence. what a label is really telling you, and who it quietly fails, is a question i have been working on since 2017.
- h2 48px: performance
- p 32px: i studied for two years at the Lee Strasberg Theatre and Film Institute in New York City, appeared in multiple school productions, and was accepted into the school's Advanced Method courses. i was invited to private workshops there, including one hosted by Vincent d'Onofrio.
- p 32px: i was a co-star in Marvel Studios' Daredevil: Born Again (2025) and the lead in a New York Blood Center campaign that ran across network TV, social media, and streaming to tens of millions of views.
- p 32px: the Method training is not a hobby sitting next to the design work. it is where i learned to research a person until their behavior makes sense from the inside, which is the same thing good user research asks for.
- h2 48px: advocacy
- p 32px: i'm diagnosed with ADHD Type C and Cognitive Disengagement Syndrome.
- p 32px: i advocate in my personal life for mental health treatment: helping people find providers, assembling the research and documentation that mental health insurance claims actually demand, and setting up AI tools that take executive-function load off the people carrying it.
- p 32px: adhd mode, on the product design channel, comes directly from that.
- h2 48px: references
- p 32px: **Jeff Lin**, lead product designer at Goldman Sachs, and **David Lajara**, product designer at The Walt Disney Company, have both reviewed my portfolio and are offered as references.
- p 32px: **Stephen Fiore**, senior digital designer at Marvel Studios, mentors me on an ongoing basis and is offered as a reference too.
- h2 48px: say hi
- p 40px: i’m open to roles in new york or remote. say hi at [chrisrobinfiore@gmail.com ↗](#), or find me on [github ↗](https://github.com/globalanomalyindex), [artstation ↗](https://www.artstation.com/chrisfiore) and [linkedin ↗](https://www.linkedin.com/in/christopherrobinfiore). you can also read my [resume ↗](public/documents/christopher-robin-fiore-resume-2026.pdf). i’d love to hear from you :)
