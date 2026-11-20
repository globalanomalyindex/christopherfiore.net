/**
 * Tiles: each painting at the widths its tile is really drawn at, so the
 * paintings page fetches tile-sized files instead of the 1200px works.
 *
 * A tile draws a painting 147 to 493 CSS px wide on a desktop and up to the
 * full column on a phone. Each painting gets a 480px and an 800px wide copy
 * (WebP, quality 78) beside its own file, which stays the largest choice.
 * A copy is only made when it is narrower than the painting's own file, so a
 * painting that is 800px wide gets only the 480px copy. The page lists every
 * copy in the image's `srcset`, at its real width, and refuses to build if a
 * copy is missing (src/pages/paintings.ts).
 *
 *   npm run tiles      after adding or changing a painting
 *
 * Writes public/artstation/t/<slug>-480.webp and <slug>-800.webp from
 * public/artstation/<slug>.webp. Needs cwebp (brew install webp).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PAINTINGS, TILE_WIDTHS, tilePath, webpSize } from '../src/data/paintings.ts';

const root = new URL('..', import.meta.url).pathname;
const pub = join(root, 'public');
mkdirSync(join(pub, 'artstation/t'), { recursive: true });

let bytes = 0;
let made = 0;
for (const p of PAINTINGS) {
  const src = join(pub, p.image);
  const [w] = webpSize(readFileSync(src));
  for (const tw of TILE_WIDTHS) {
    if (tw >= w) continue;
    const out = join(pub, tilePath(p, tw));
    execFileSync('cwebp', ['-quiet', '-q', '78', '-m', '6', '-resize', String(tw), '0', src, '-o', out]);
    const [ow] = webpSize(readFileSync(out));
    if (ow !== tw) throw new Error(`tiles: ${out} came out ${ow}px wide, not ${tw}`);
    bytes += statSync(out).size;
    made++;
  }
}
console.log(`tiles: ${made} copies of ${PAINTINGS.length} paintings, ${Math.round(bytes / 1000)} kB`);
