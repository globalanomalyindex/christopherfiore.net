repo: globalanomalyindex/christopherfiore.net
branch: main

## Last sync

date: 2026-09-23T18:39:44Z

### Updated in this project

- Product designs statuses now mark every case that has a case study ("w/ case study"); chellbook reads as client work; wildcard notes its preregistered blind study (per README.md).
- About page: resume facts, references, and the Anthropic AI Fluency certificate (June 2026); "at a glance" leads.
- Seam engine from globalanomalyindex/chickpea, improved here: quick 8px part, a 0.7s hold opens the full skeleton, and buttons measure instantly.
- Copy pulled verbatim from src/data; paintings and project cards copied from public/.

## Screen map

| Project screen | Repo files |
|---|---|
| Portfolio Site · home | Figma letter, src/data/studio.ts |
| Portfolio Site · product designs | src/data/cases.ts, README.md |
| Portfolio Site · case study (chellbook) | src/data/chellbook.ts |
| Portfolio Site · paintings | src/data/paintings.ts, public/artstation/ |
| Portfolio Site · about + say hi | src/data/about.ts, src/data/studio.ts |
| hover + glitch | src/runtime/hover.ts, src/runtime/glitch.ts |
| seams + skeleton | chickpea: src/hero/seams.ts, src/hero/InteractionLayer.tsx, src/components/DimensionArrow.tsx, src/studio/SkeletonReveal.tsx |

## Sync history

- 2026-09-23T17:49:41Z — chickpea ideas (menu, seams, skeleton) explored; content pages built on 5a.
- 2026-09-23T17:17:20Z — first import: content from src/data, paintings and cards from public/.
