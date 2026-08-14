/**
 * Build the index cards' preview windows.
 *
 * WHY THESE ARE CAPTURED AND NOT CROPPED. The covers in `public/projects/live`
 * are 1456 × 874 full-page captures — the right shape for the key-frame panel
 * they were made for, and the wrong shape for a card window that runs between
 * 0.9:1 and 1.3:1 at about a fifth the size. Cropping one to fit throws away
 * two thirds of it and keeps whichever third is in the middle, which on a page
 * capture is the header. So each window is captured again at its OWN aspect:
 * the viewport is set to the shape of the slot the image will sit in, and the
 * composition is chosen by the viewport rather than recovered from a crop.
 *
 * The sizes below come from `cardShot` in `src/design/layout.ts` and have to
 * agree with it. They are written out rather than imported because this is a
 * plain node script and that file is TypeScript; `check:cards` in the redesign
 * harness asserts the two still match.
 *
 * Each file is written at TWICE its slot so it is sharp on a 2x display, and
 * the card uses `object-fit: cover`, so a later change to a block's width
 * shifts the crop slightly rather than breaking the image.
 *
 *   node scripts/build-cards.mjs            everything
 *   node scripts/build-cards.mjs lee mfny   just those
 *
 * Needs the dev server on 5199 for the locally hosted demos.
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCAL = 'http://localhost:5199';
const GH = 'https://globalanomalyindex.github.io';
const OUT = resolve(import.meta.dirname, '../public/projects/card');

/**
 * One entry per case.
 *
 * `slot` is the window in design px. `page` is how wide to render before the
 * shot is scaled down — bigger means the project's own type comes out smaller
 * in the window, so it is the zoom control and is set per case by eye. `at` is
 * where to scroll to. `hold` is extra settle time for a project that animates
 * its first screen.
 */
const CARDS = [
  { id: 'after-tokens', slot: [265, 210], url: `${GH}/after-tokens/`, page: 1180, at: 400, hold: 1400 },
  {
    id: 'chellbook',
    slot: [189, 210],
    url: `${LOCAL}/chellbook/product-design.html`,
    // The narrowest window on the index, and a portrait one. Rendered at 760
    // rather than 1180 so the wordmark and its value line fill it instead of
    // sitting in the corner of a spec sheet.
    page: 760,
    hold: 1000,
  },
  {
    id: 'one-master-affordance',
    slot: [265, 210],
    url: `${GH}/carplay-siri-contacts/`,
    page: 1180,
    hold: 1400,
  },
  {
    id: 'guestpass',
    slot: [273, 210],
    url: `${LOCAL}/guestpass/case.html`,
    page: 1280,
    // Past the title, onto the row of screens. At 0 the window cut three phone
    // bezels in half along its bottom edge.
    at: 250,
    hold: 900,
  },
  {
    /*
      df2tm has no hosted UI — it is a plugin you install into your own Claude
      Code — and the one capture of it is a wide prose column. Every near-square
      crop of a wide prose column cuts lines of type in half, so this window is
      SET rather than cropped: the same exchange, verbatim from the showcase,
      typeset for a 273 × 210 slot. The product is a teaching aside in a
      terminal, so an aside is what the window shows.
    */
    id: 'df2tm',
    slot: [273, 210],
    html: `<div class="p">
        <div class="q"><b>you:</b> typing in this search box is laggy. it re-filters
          5000 items on every keystroke. make it responsive.</div>
        <div class="q"><b>claude:</b> <i>(makes the fix with <code>useMemo</code> +
          <code>useDeferredValue</code>)</i></div>
        <div class="t"><span>&#127891;</span><div><code>useDeferredValue</code> (react 18+)
          is the idiomatic alternative to a <code>setTimeout</code> debounce.</div></div>
      </div>`,
    css: `body{margin:0;background:#F2F4F5;color:#1b1b1f;
        font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
      .p{padding:22px 24px;display:flex;flex-direction:column;gap:14px;
        min-height:100vh;box-sizing:border-box;justify-content:center}
      .q{border-left:3px solid #d3d7da;padding-left:12px;color:#3a3a42}
      b{font-weight:600;color:#1b1b1f} i{color:#55555f}
      code{background:#e4e8ea;border-radius:3px;padding:1px 4px;
        font:13px ui-monospace,Menlo,monospace}
      .t{display:flex;gap:8px;border-left:3px solid #b9bec2;padding-left:12px;color:#3a3a42}
      .t span{font-size:17px;line-height:1.3}`,
    // 400, not 700: at 700 the type came out about 6px on the card and read as
    // grey noise. The window has room for three lines that can actually be read.
    page: 400,
  },
  {
    id: 'adhd-mode',
    slot: [273, 210],
    url: `${GH}/adhd-mode-linkedin/`,
    page: 1180,
    at: 0,
    hold: 1400,
  },
  { id: 'campeon', slot: [214, 210], url: `${GH}/campeon/`, page: 1080, at: 0, hold: 1600 },
  { id: 'chickpea', slot: [214, 210], url: `${GH}/chickpea/`, page: 1080, at: 0, hold: 1800 },
  {
    // Lee's window is a wide macOS layout, so a 1.3:1 viewport letterboxes it
    // into a corner. Cropped from the capture instead, on the sidebar and the
    // record panel, which is where the case's argument actually is.
    id: 'lee',
    slot: [195, 150],
    crop: 'projects/live/lee.webp',
    box: [0.05, 0.06, 0.9, 0.9],
  },
  {
    id: 'mfny-concentrates',
    slot: [195, 150],
    url: `${LOCAL}/mfny/concentrates.html`,
    page: 1180,
    at: 300,
    hold: 1000,
  },
  {
    id: 'chipotle',
    slot: [195, 150],
    url: `${LOCAL}/chipotle/checkout.html`,
    page: 900,
    at: 0,
    hold: 900,
  },
  { id: 'wildcard', slot: [195, 150], url: `${GH}/wildcard/`, page: 1180, at: 0, hold: 1400 },
  { id: 'dither', slot: [195, 150], url: `${GH}/dither/`, page: 1180, at: 0, hold: 1600 },
  {
    id: 'three-zones',
    slot: [195, 150],
    url: `${LOCAL}/three-zones/index.html`,
    page: 1280,
    at: 0,
    hold: 1200,
  },
];

/**
 * The motion band's filmstrip: the archive's own eight posters, re-encoded to
 * the strip's frame. They are 800 × 450 PNGs and 292 kB across the eight, which
 * is not a size to put on a screen that already carries fourteen card windows.
 */
const STRIP = { w: 210, h: 118 };
const STUDIES = [
  'swipe-row',
  'vertical-feed',
  'like-dislike',
  'pause-play',
  'next-up',
  'seek',
  'flock',
  'bloom',
];

const want = process.argv.slice(2);
const list = want.length ? CARDS.filter((c) => want.includes(c.id)) : CARDS;
const doStrip = !want.length || want.includes('strip');

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

/** Downscale a PNG buffer to exactly `w × h` and return WebP bytes. */
async function encode(png, w, h) {
  const pg = await browser.newPage();
  const b64 = png.toString('base64');
  const data = await pg.evaluate(
    async ([src, W, H]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${src}`;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      // cover: fill the box, center the overflow
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return cv.toDataURL('image/webp', 0.9);
    },
    [b64, w, h],
  );
  await pg.close();
  return Buffer.from(data.split(',')[1], 'base64');
}

for (const c of list) {
  const [sw, sh] = c.slot;
  const [ow, oh] = [sw * 2, sh * 2];
  let png;

  if (c.crop) {
    // A sub-rect of an existing capture, in normalized source coordinates.
    const pg = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    await pg.goto(`${LOCAL}/`);
    await pg.setContent(
      `<style>html,body{margin:0}#w{position:relative;overflow:hidden}img{position:absolute;display:block}</style>` +
        `<div id="w"><img id="i" src="${LOCAL}/${c.crop}"></div>`,
    );
    await pg.waitForFunction(() => document.getElementById('i')?.naturalWidth > 0);
    await pg.evaluate(
      ([bx, by, bw, bh]) => {
        const img = document.getElementById('i');
        const w = document.getElementById('w');
        const W = img.naturalWidth;
        const H = img.naturalHeight;
        w.style.width = `${W * bw}px`;
        w.style.height = `${H * bh}px`;
        img.style.left = `${-W * bx}px`;
        img.style.top = `${-H * by}px`;
      },
      c.box,
    );
    await pg.waitForTimeout(200);
    png = await pg.locator('#w').screenshot();
    await pg.close();
  } else if (c.html) {
    // A window that is SET rather than captured; see the df2tm entry.
    const vw = c.page;
    const vh = Math.round((vw * sh) / sw);
    const pg = await browser.newPage({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 2,
    });
    await pg.setContent(`<style>${c.css}</style>${c.html}`);
    await pg.evaluate(() => document.fonts?.ready);
    await pg.waitForTimeout(400);
    png = await pg.screenshot();
    await pg.close();
  } else {
    const vw = c.page;
    const vh = Math.round((vw * sh) / sw);
    const pg = await browser.newPage({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 2,
    });
    await pg.goto(c.url, { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts?.ready);
    if (c.at) await pg.evaluate((y) => window.scrollTo(0, y), c.at);
    await pg.waitForTimeout(c.hold ?? 1000);
    png = await pg.screenshot();
    await pg.close();
  }

  const webp = await encode(png, ow, oh);
  const file = resolve(OUT, `${c.id}.webp`);
  writeFileSync(file, webp);
  console.log(`${c.id.padEnd(22)} ${ow}×${oh}  ${(webp.length / 1024).toFixed(1)} kB`);
}

if (doStrip) {
  const dir = resolve(import.meta.dirname, '../public/motion/strip');
  mkdirSync(dir, { recursive: true });
  const pg = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await pg.goto(`${LOCAL}/`);
  for (const slug of STUDIES) {
    const data = await pg.evaluate(
      async ([src, W, H]) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        const g = cv.getContext('2d');
        g.imageSmoothingQuality = 'high';
        const s = Math.max(W / img.width, H / img.height);
        g.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
        return cv.toDataURL('image/webp', 0.86);
      },
      [`${LOCAL}/motion/stills/${slug}.png`, STRIP.w * 2, STRIP.h * 2],
    );
    const buf = Buffer.from(data.split(',')[1], 'base64');
    writeFileSync(resolve(dir, `${slug}.webp`), buf);
    console.log(`strip/${slug.padEnd(16)} ${STRIP.w * 2}×${STRIP.h * 2}  ${(buf.length / 1024).toFixed(1)} kB`);
  }
  await pg.close();
}

await browser.close();
