# After Tokens, vendored

His own study of ambient skeleton loading and how generated text arrives,
copied byte for byte from globalanomalyindex/after-tokens @
844d3320e7688401a4af31f66bf00eda03f8f78b, MIT (`LICENSE` beside it).

| File | From | sha256 |
|---|---|---|
| `growing-geometry.ts` | `lib/settle/growing-geometry.ts` | fd351229c024f63f3ca210401af20e38a364f58c0ad20d688ab73549a12e17a5 |
| `ambient-geometry.ts` | `lib/settle/ambient-geometry.ts` | 7fb73b89646cc655f97d28ee4f719a3f530cbc5b4f16213ecc81f24593907338 |
| `types.ts` | `lib/settle/types.ts` | 116a4ef1d09fd12ec88f2002c90e5ceafec3dfa2efbe16249836bacf088624cf |

`growing-geometry.ts` is the skeleton After Tokens ships
(`growing-cell-skeleton-v8`, rendered by its
`components/settle/ambient-composition.tsx`): quiet long lines alternate with
rows of at most three broad cells. The other two are reached only through
type imports, so only `createGrowingRows` and `growingRowAt` reach the bundle.

The Skeleton card (`src/runtime/fx/after-tokens.ts`) takes every other value
from After Tokens' own files and cites each where it is used:
`app/ambient-composition.css` (the cell ink at 0.2 and round, the breath from
0.72 to 1, the glimmer, the bar to line ratio), `app/skeleton-division.css`
and `components/settle/skeleton-division.tsx` (the opening: one capsule that
divides into the rows), `app/globals.css` (`reading-ink-arrive` and
`reading-bubble-transfer`, the 280ms handover),
`components/settle/bubble-transfer.tsx` (the word groups and the mapping of
cells to them) and `components/settle/line-continuation.tsx` (the one-row
rule).

The earlier `ambient-score.ts` is gone: After Tokens no longer renders it.
Edit nothing here: take a new copy from After Tokens instead.
