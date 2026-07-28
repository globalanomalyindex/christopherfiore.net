/**
 * One-shot image optimiser.
 *
 * The Branchial Lateral Spine sheets arrive from the devkit as 1.0–2.1MB PNGs —
 * five on the Competizione page, and seven more behind its evidence viewer.
 * That is ~19MB of PNG for one channel. They are photographic renders and
 * scanned publication pages, so PNG is the wrong container: WebP at q82 cuts
 * them by roughly 90% with no visible difference at the sizes they are
 * displayed (hero 1090.9 × 400, viewer plate 1236 × 778).
 *
 * The originals stay byte-for-byte in
 * `_source/christopher-fiore-portfolio-devkit-v31/assets/` — this only rewrites
 * the copies under `public/`.
 *
 * `sharp` is deliberately NOT a dependency of this project: this script runs by
 * hand when new renders are added, not on every build.
 *
 *   npm i --no-save sharp && node scripts/optimize-images.mjs
 */

import { readdir, stat, unlink } from 'node:fs/promises';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Directories whose PNGs are photographic and should become WebP.
 *
 * All twelve BLSP sheets live in this one directory, flat, matching the `src`
 * paths in the devkit's own `branchial-lateral-spine.json` — the page's five
 * and the evidence viewer's seven are the same kind of asset and the same
 * pipeline. Adding a sheet means copying the PNG in here and re-running; the
 * directory is already listed, so there is nothing to add below.
 */
const CONVERT_DIRS = ['public/physical-systems/blsp-kn22'];

/** Quality: 82 is the knee — below it the render's gradient banding shows. */
const QUALITY = 82;

const { default: sharp } = await import('sharp');

const kb = (n) => `${(n / 1024).toFixed(0)}kB`;

let before = 0;
let after = 0;

for (const dir of CONVERT_DIRS) {
  const abs = join(ROOT, dir);
  for (const name of await readdir(abs)) {
    if (extname(name).toLowerCase() !== '.png') continue;
    const src = join(abs, name);
    const out = join(abs, `${basename(name, '.png')}.webp`);

    const sizeBefore = (await stat(src)).size;
    await sharp(src).webp({ quality: QUALITY, effort: 6 }).toFile(out);
    const sizeAfter = (await stat(out)).size;

    before += sizeBefore;
    after += sizeAfter;
    console.log(`${name}  ${kb(sizeBefore)} → ${kb(sizeAfter)}  (${((1 - sizeAfter / sizeBefore) * 100).toFixed(0)}% smaller)`);

    await unlink(src);
  }
}

console.log(`\ntotal  ${kb(before)} → ${kb(after)}  (${((1 - after / before) * 100).toFixed(0)}% smaller)`);
console.log('Remember: src/data/competizione.ts references these by extension —');
console.log('HERO / SYSTEMS for the page, EV_SHEETS for the evidence viewer.');
