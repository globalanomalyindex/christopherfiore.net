# Chickpea, vendored

His own generative grid and color studio, copied as it is from
globalanomalyindex/chickpea @ c55533e (2026-06-14), the pure seeded core only,
no React:

- `grid/`: `prng.ts` (mulberry32, hashSeed), `types.ts`, `compose.ts`
  (composeGrid: a zero-gap grid anchored to live boxes), `tree.ts`, `ratios.ts`
  (the ratio canon, snapToRatio, ratioName: truthful labels such as 1/φ)
- `palette/`: the OKLCH palette engine (`engine.ts` generatePaletteOklch with
  its harmonize and lightness-spread floor, `generator.ts`, `score.ts`,
  `sampling.ts`, `oklch.ts`, `hsl.ts`, `generate.ts`)

`src/runtime/dress.ts` uses them for the Cut and the wire's ratio names. Edit
nothing here: take a new copy from Chickpea instead.
