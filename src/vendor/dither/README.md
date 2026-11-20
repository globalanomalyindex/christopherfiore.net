# dither, ported

His own browser dithering studio, globalanomalyindex/dither at
faf52b24391cadd7b39a657918c80558df9979eb. `dither.js` there has sha256
a1a0b7b076cdfdd8f7ebb450c1abf20389e477f2ad6fd30e5d09986c70af8b58.

- `ordered.ts` holds `bayerMatrix` and `normBayer` (dither.js lines 38 to 47)
  and the per-pixel rule of its "Ordered (Bayer)" algorithm (dither.js lines
  2293 to 2317: `v += (b[by][bx] - .5) * spread; on = v > threshold`), with
  rotation 0, no noise, gamma 1 and no invert. The logic is unchanged; only
  types were added.

The Dither card (`src/runtime/fx/dither.ts`) calls the rule with
`normBayer(4)`, spread 255 and threshold 128, on a level scaled to 0 to 255.
A level of k/16 then lights exactly k of every 16 dots, and each level holds
all the dots of the ones below it.

The upstream repo has no licence file. It is his own project. Take a fresh
copy from it rather than editing the copy here.
