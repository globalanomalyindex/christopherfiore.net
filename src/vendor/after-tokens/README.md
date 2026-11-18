# After Tokens, vendored

His own study of ambient skeleton loading and how generated text arrives,
copied from globalanomalyindex/after-tokens @ 844d332 (2026-09-12), MIT
(`LICENSE` beside it).

- `ambient-score.ts`: the decorative score as it is, `createAmbientScore` and
  `ambientScoreAt`, the seeded pill arrangements each skeleton row moves
  through.

The rest of the Skeleton card in `src/runtime/lineage.ts` takes After Tokens'
own values from its `app/ambient-composition.css` and `app/globals.css`: the
cell ink (currentColor at 0.2, round 999px), the breath (0.72 to 1), the
glimmer (a white 0.3 band sweeping left to right), and the 280ms handover
(`reading-bubble-transfer` on cubic-bezier(.22, 1, .36, 1), fading to 0.65 at
48% and out; `reading-ink-arrive` on cubic-bezier(.25, 1, .5, 1), opacity 0.45
at 38% and 1 at 74%, settling from 1.5px), and its bubble-transfer rule:
words grouped three at most per line, each target 10% down and 80% tall.
Edit nothing here: take a new copy from After Tokens instead.
