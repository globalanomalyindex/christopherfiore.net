/**
 * End-to-end check of the built site, in real Chrome.
 *
 *   npm run build
 *   npx vite preview --port 4173 --strictPort      (in another terminal)
 *   npm i --no-save playwright-core
 *   npm run check:site
 *
 * BASE=https://christopherfiore.net npm run check:site runs it against live.
 *
 * It asserts behavior, not screenshots: computed styles, layout boxes and the
 * DOM the runtime builds. The one promise it guards hardest is README §7.2,
 * "hover must never change layout", which it checks by comparing every
 * button's and every prose block's layout box before and during a hover.
 */

import { chromium } from 'playwright-core';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const CHROME =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = [
  '/',
  '/product-designs/',
  '/product-designs/guestpass/',
  '/product-designs/chellbook/',
  '/product-designs/mfny-concentrates/',
  '/product-designs/df2tm/',
  '/paintings/',
  '/about/',
];

let failed = 0;
const ok = (cond, msg, detail = '') => {
  if (cond) console.log(`  ok   ${msg}`);
  else {
    failed++;
    console.log(`  FAIL ${msg}${detail ? `  ·  ${detail}` : ''}`);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait for the runtime: fonts in, widths reserved, seams split (where they run). */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function center(page, sel, nth = 0) {
  const loc = page.locator(sel).nth(nth);
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const box = await loc.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Load home in `ctx` and watch the signature from before first paint. */
async function cp2(ctx) {
  const pg = await ctx.newPage();
  await pg.addInitScript(() => {
    window.__sigWatch = { everAnim: false, everWait: false };
    new MutationObserver(() => {
      if (document.documentElement.classList.contains('sig-wait')) window.__sigWatch.everWait = true;
      if (document.querySelector('.sig-anim')) window.__sigWatch.everAnim = true;
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  });
  await pg.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await pg.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(2200);
  const r = await pg.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.sig-ink'));
    return { visible: cs.display !== 'none' && cs.visibility !== 'hidden', ...window.__sigWatch };
  });
  await pg.close();
  return r;
}

/** Every button's and every prose block's LAYOUT box: offsets ignore transform and translate. */
const layout = () =>
  Array.from(document.querySelectorAll('[data-btn], [data-seams]')).map((e) => {
    let x = 0;
    let y = 0;
    for (let n = e; n; n = n.offsetParent) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return `${x},${y},${e.offsetWidth},${e.offsetHeight}`;
  });

const browser = await chromium.launch({ executablePath: CHROME });
try {
  /* ------------------------------------------------------------ every page */
  console.log('\n[pages]');
  const desk = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desk.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const internal = new Set();

  for (const r of ROUTES) {
    const res = await page.goto(BASE + r, { waitUntil: 'networkidle' });
    await settle(page);
    const info = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
        dashes: (text.match(/[–—]/g) ?? []).length,
        british: (text.match(/\b(colour|favour|behaviour|honour|centre|theatre(?! and film)|organis|realis|analys(?!is)|licence|artefact|grey)\w*/gi) ?? []),
        hrefs: Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')),
        unlabeled: Array.from(document.querySelectorAll('a')).filter((a) => !a.hasAttribute('data-btn')).length,
        imgsNoSize: Array.from(document.images).filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
        imgsNoAlt: Array.from(document.images).filter((i) => !i.alt).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    console.log(` ${r}`);
    ok(res.status() === 200, 'serves 200', String(res.status()));
    ok(info.h1 === 1, 'one h1', String(info.h1));
    ok(info.title.includes('christopher robin fiore'), 'titled', info.title);
    ok(info.canonical.endsWith(r), 'canonical is its own URL', info.canonical);
    ok(info.dashes === 0, 'no em or en dashes in the page text', String(info.dashes));
    ok(info.british.length === 0, 'american spelling', info.british.join(', '));
    ok(info.unlabeled === 0, 'every link is a framed button', String(info.unlabeled));
    ok(info.imgsNoSize === 0 && info.imgsNoAlt === 0, 'every image has a size and alt text');
    ok(info.overflow === 0, 'no horizontal scroll at 1440', String(info.overflow));
    info.hrefs.filter((h) => h.startsWith('/')).forEach((h) => internal.add(h.split('#')[0]));
  }
  ok(errors.length === 0, 'no console errors on any page', errors.join(' | '));

  console.log('\n[links]');
  for (const h of [...internal].sort()) {
    const res = await page.request.get(BASE + h);
    ok(res.status() === 200, `${h} resolves`, String(res.status()));
  }
  const nf = await page.request.get(`${BASE}/404.html`);
  ok(nf.status() === 200 && (await nf.text()).includes('not found'), '404.html is built');

  /* ---------------------------------------------------------- the content */
  console.log('\n[content]');
  await page.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  const cases = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.index .body')).map((p) => ({
      name: p.querySelector('[data-word]').textContent,
      status: p.querySelector('.ink-2').textContent,
    })),
  );
  const STATUS = {
    'after tokens': 'motion interaction study, w/ case study, 2026.',
    'apple wallet card sharing concept': 'design study, w/ case study, 2026.',
    chellbook: 'client work, w/ case study, 2026.',
    lee: 'design study, 2026.',
    'mfny concentrates': 'built, w/ case study, 2026.',
    'chipotle app ui cleanup': 'design study, 2026.',
    'one master affordance': 'simulated, w/ case study, 2026.',
    'adhd mode': 'built, w/ case study, 2026.',
    df2tm: 'built, w/ case study, 2026.',
    campeón: 'simulated, 2026.',
    chickpea: 'built, w/ case study, 2026.',
    wildcard: 'tested logic from a preregistered blind study, w/ case study, 2026.',
    dither: 'built, 2026.',
    'three zones: camera market ui fix': 'design study, 2026.',
  };
  ok(cases.length === 14, 'fourteen cases', String(cases.length));
  ok(
    cases.every((c) => STATUS[c.name] === c.status) && cases.map((c) => c.name).join() === Object.keys(STATUS).join(),
    'every status line matches LABELING.md §4, in order',
    cases.filter((c) => STATUS[c.name] !== c.status).map((c) => `${c.name}: ${c.status}`).join(' | '),
  );

  await page.goto(`${BASE}/paintings/`, { waitUntil: 'networkidle' });
  const works = await page.evaluate(() => document.querySelectorAll('.work').length);
  ok(works === 20, 'twenty paintings', String(works));

  await page.goto(`${BASE}/product-designs/chellbook/`, { waitUntil: 'networkidle' });
  const chell = await page.evaluate(() => document.body.innerText);
  ok(chell.includes('not a promise of absolute safety.'), 'chellbook keeps "not a promise of absolute safety"');
  ok(/next up is\s+mfny concentrates/.test(chell), 'chellbook points next at mfny concentrates');

  await page.goto(`${BASE}/product-designs/guestpass/`, { waitUntil: 'networkidle' });
  const gp = await page.evaluate(() => document.body.innerText);
  ok(gp.includes('not affiliated with apple') && gp.includes('nothing was built'), 'guestpass keeps its boundaries');
  ok(gp.includes('edge case, exploratory, not drawn.'), 'guestpass keeps the exploratory aside');

  /* ---------------------------------------------------- 1440: the type scale */
  console.log('\n[type at 1440]');
  await page.goto(`${BASE}/product-designs/chellbook/`, { waitUntil: 'networkidle' });
  const sizes = await page.evaluate(() => {
    const fs = (s) => getComputedStyle(document.querySelector(s)).fontSize;
    return {
      h1: fs('.title'),
      h2: fs('.h2'),
      lede: fs('.lede'),
      body: fs('.sec .body'),
      crumb: fs('.crumb'),
      meta: fs('.meta'),
      cap: fs('.cap'),
      pad: getComputedStyle(document.querySelector('.page')).paddingLeft,
      font: getComputedStyle(document.body).fontFamily,
    };
  });
  ok(
    sizes.h1 === '88px' && sizes.h2 === '48px' && sizes.lede === '40px' && sizes.body === '32px',
    'h1 88, h2 48, lede 40, body 32',
    JSON.stringify(sizes),
  );
  ok(sizes.crumb === '26px' && sizes.meta === '26px' && sizes.cap === '22px' && sizes.pad === '48px', 'crumb 26, meta 26, caption 22, gutter 48');
  ok(sizes.font.startsWith('"Averia Serif Libre"'), 'set in Averia Serif Libre');

  /* ------------------------------------------------ hover: band and glitch */
  console.log('\n[hover]');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(page);
  const before = await page.evaluate(layout);
  const btn = '.home-p--wide [data-btn]';
  const c0 = await center(page, btn, 0);
  await page.mouse.move(c0.x, c0.y, { steps: 4 });
  await sleep(60);
  const early = await page.evaluate((s) => {
    const b = document.querySelector(s);
    const band = b.querySelector('[data-band]');
    const ov = b.querySelector('[data-glitch]');
    return {
      hot: b.hasAttribute('data-hot'),
      layers: band ? band.children.length : 0,
      z: band ? getComputedStyle(band).zIndex : '',
      word: getComputedStyle(b.querySelector('[data-word]')).color,
      overlay: ov ? ov.textContent : null,
      ink: getComputedStyle(b).color,
    };
  }, btn);
  ok(early.hot, 'the button goes hot');
  ok(early.layers === 4 && early.z === '-1', 'three band layers and an outline, at z -1', `${early.layers} ${early.z}`);
  ok(early.word === 'rgba(0, 0, 0, 0)', 'the resting word goes transparent', early.word);
  ok(early.overlay === 'product designs...', 'the overlay carries the label and its tail', String(early.overlay));
  ok(early.ink === 'rgb(26, 24, 32)', 'ink pinned to band ink', early.ink);

  await sleep(700);
  const late = await page.evaluate((s) => {
    const spans = Array.from(document.querySelector(s).querySelectorAll('[data-glitch] > span'));
    return spans.filter((x) => x.textContent.trim()).every((x) => x.style.fontFamily.includes('Dessign Maison'));
  }, btn);
  ok(late, 'every letter settles into the alternate and holds');
  const during = await page.evaluate(layout);
  ok(JSON.stringify(before) === JSON.stringify(during), 'zero reflow: no layout box moved during the hover', `${before.filter((b, i) => b !== during[i]).length} moved`);

  const pulled = await page.evaluate((s) => document.querySelector(s).style.transform, btn);
  await page.mouse.move(c0.box.x + c0.box.width - 3, c0.box.y + 3, { steps: 3 });
  await sleep(200);
  const leaned = await page.evaluate((s) => document.querySelector(s).style.transform, btn);
  ok(/translate\(/.test(leaned) && leaned !== pulled, 'magnet: the box leans toward the cursor', leaned);
  const m = leaned.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  ok(m && Math.abs(+m[1]) <= 8 && Math.abs(+m[2]) <= 6, 'magnet: inside the 8 × 6 cap', leaned);

  const email = await page.evaluate(() => {
    const w = Array.from(document.querySelectorAll('[data-word]')).find((x) => x.textContent.includes('@'));
    return w.textContent;
  });
  const cE = await center(page, '.home-p--wide [data-btn]', 2);
  await page.mouse.move(cE.x, cE.y, { steps: 3 });
  await sleep(80);
  const emailOv = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-glitch]')).map((o) => o.textContent),
  );
  ok(emailOv.length === 1 && emailOv[0] === email, 'the address gets no "..." tail, and only one button is hot', emailOv.join(' | '));

  await page.mouse.move(1400, 980, { steps: 6 });
  await sleep(900);
  const after = await page.evaluate(() => ({
    hot: document.querySelectorAll('[data-hot]').length,
    bands: document.querySelectorAll('[data-band]').length,
    overlays: document.querySelectorAll('[data-glitch]').length,
    pulled: Array.from(document.querySelectorAll('[data-btn]')).filter((b) => b.style.transform).length,
    words: Array.from(document.querySelectorAll('[data-word]')).filter((w) => w.style.color).length,
  }));
  ok(after.hot === 0 && after.bands === 0 && after.overlays === 0 && after.words === 0, 'leave: band, overlay and ink all restored', JSON.stringify(after));
  ok(after.pulled === 0, 'magnet: released once the cursor is out of reach');

  /* -------------------------------------------------- seams and skeleton */
  console.log('\n[seams]');
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await settle(page);
  const units = await page.evaluate(() => document.querySelectorAll('[data-unit]').length);
  ok(units > 500, 'prose is split into word units', String(units));
  // Park on the gap between the lede's 3rd and 4th words.
  const gapPt = await page.evaluate(() => {
    const u = Array.from(document.querySelectorAll('.lede [data-unit]'));
    const a = u[2].getBoundingClientRect();
    const b = u[3].getBoundingClientRect();
    return { x: (a.right + b.left) / 2, y: (a.top + a.bottom) / 2 };
  });
  await page.mouse.move(gapPt.x - 30, gapPt.y, { steps: 3 });
  await page.mouse.move(gapPt.x, gapPt.y, { steps: 3 });
  await sleep(250);
  const quick = await page.evaluate(() => ({
    moved: Array.from(document.querySelectorAll('[data-unit]')).filter((u) => u.style.translate).length,
    skel: getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
  }));
  ok(quick.moved > 0, 'quick state: the nearest seam parts', String(quick.moved));
  ok(+quick.skel === 0, 'quick state: no skeleton yet', quick.skel);
  await sleep(1000);
  const full = await page.evaluate(() => {
    const u = Array.from(document.querySelectorAll('.lede [data-unit]'));
    const a = u[2].getBoundingClientRect();
    const b = u[3].getBoundingClientRect();
    return {
      gap: b.left - a.right,
      skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
      arrow: Array.from(document.querySelectorAll('[data-arrow]')).map((x) => [getComputedStyle(x).opacity, x.textContent]),
      baseline: !!document.querySelector('[data-skeleton] line'),
    };
  });
  ok(full.gap > 20, 'full state after the 700ms hold: the seam opens toward 24px', full.gap.toFixed(1));
  ok(full.skel > 0.5 && full.baseline, 'full state: the skeleton is drawn', String(full.skel));
  ok(full.arrow.some(([o, t]) => +o === 1 && /^\d+$/.test(t)), 'full state: the gap is measured', JSON.stringify(full.arrow));

  // Onto a button: it claims space both sides and measures itself at once.
  const cb = await center(page, '#at-a-glance [data-btn]');
  await page.mouse.move(cb.x, cb.y, { steps: 4 });
  await sleep(350);
  const boxState = await page.evaluate(() => {
    const b = document.querySelector('#at-a-glance [data-btn]');
    const prev = b.previousElementSibling;
    return {
      prev: prev?.style.translate ?? '',
      prevText: prev?.textContent ?? '',
      label: document.querySelector('[data-skeleton]').textContent,
      skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
    };
  });
  ok(/^-/.test(boxState.prev), 'a hovered button pushes its left neighbor away', boxState.prev);
  ok(boxState.skel === 1 && /×.*pad/.test(boxState.label), 'a hovered button shows W × H · pad at once', boxState.label.slice(0, 60));

  // Off every line of text: the full state collapses.
  await page.mouse.move(1420, cb.y + 400, { steps: 8 });
  await sleep(600);
  const off = await page.evaluate(() => ({
    skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
    moved: Array.from(document.querySelectorAll('[data-unit], [data-btn]')).filter((u) => u.style.translate).length,
  }));
  ok(off.skel === 0 && off.moved === 0, 'leaving the text collapses the skeleton and closes every seam', JSON.stringify(off));

  // Back/forward cache: the page comes back exactly as it was left, mid-hover.
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await settle(page);
  const cr = await center(page, '#at-a-glance [data-btn]');
  await page.mouse.move(cr.x, cr.y, { steps: 3 });
  await sleep(300);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await sleep(700);
  const restored = await page.evaluate(() => ({
    hot: document.querySelectorAll('[data-hot]').length,
    moved: Array.from(document.querySelectorAll('[data-unit], [data-btn]')).filter((u) => u.style.translate).length,
    skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
    arrows: Array.from(document.querySelectorAll('[data-arrow]')).filter((a) => +getComputedStyle(a).opacity > 0).length,
  }));
  ok(
    restored.hot === 0 && restored.moved === 0 && restored.skel === 0 && restored.arrows === 0,
    'a page restored from the back/forward cache comes back at rest',
    JSON.stringify(restored),
  );
  await desk.close();

  /* ---------------------------------------------------------- no fonts */
  console.log('\n[fonts blocked]');
  const bare = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await bare.route(/\.woff2|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const bp = await bare.newPage();
  const bareErrors = [];
  bp.on('pageerror', (e) => bareErrors.push(String(e)));
  await bp.goto(`${BASE}/about/`, { waitUntil: 'load' });
  await sleep(1200);
  const bareState = await bp.evaluate(() => ({
    seams: !!document.querySelector('[data-seams-live]'),
    units: document.querySelectorAll('[data-unit]').length,
  }));
  ok(bareState.seams && bareState.units > 0, 'with every font blocked, the runtime still starts', JSON.stringify(bareState));
  ok(bareErrors.length === 0, 'and throws nothing', bareErrors.join(' | '));
  await bare.close();

  /* ------------------------------------------------------------ signature */
  console.log('\n[signature]');
  const SIG_MARKUP = /^<path class="sig-ink" fill="currentColor" fill-rule="evenodd" d="[^"]+"><\/path>$/;
  /**
   * Compare two screenshots of the signature per pixel: how many differ by more
   * than 8/255 in any channel, and how many were ink in `a` and are not in `b`.
   */
  const pixelDiff = (pg, a, b) =>
    pg.evaluate(
      async ([a64, b64]) => {
        const load = async (b64_) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64_}`;
          await img.decode();
          const c = new OffscreenCanvas(img.width, img.height);
          const x = c.getContext('2d');
          x.drawImage(img, 0, 0);
          return x.getImageData(0, 0, img.width, img.height);
        };
        const [A, B] = await Promise.all([load(a64), load(b64)]);
        if (A.width !== B.width || A.height !== B.height) return { differ: -1, lost: -1 };
        let differ = 0;
        let lost = 0;
        for (let i = 0; i < A.data.length; i += 4) {
          const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
          if (d > 8) differ++;
          if (A.data[i] < 110 && B.data[i] > 160) lost++;
        }
        return { differ, lost };
      },
      [a.toString('base64'), b.toString('base64')],
    );
  const inkPx = async (pg) => {
    const png = await pg.locator('.sig').screenshot();
    return pg.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = new OffscreenCanvas(img.width, img.height);
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, img.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 128) n++;
      return n;
    }, png.toString('base64'));
  };

  // It writes itself in once it is in view, then hands back exactly the markup the server sent.
  const sp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await sp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const armed = await sp.evaluate(() => ({
    hidden: getComputedStyle(document.querySelector('.sig-ink')).display === 'none' || getComputedStyle(document.querySelector('.sig-ink')).visibility === 'hidden',
    block: document.querySelector('[data-sig]').getAttribute('data-sig'),
    anim: !!document.querySelector('.sig-anim'),
  }));
  ok(armed.hidden && !armed.anim, 'the signature waits, hidden, until it is scrolled into view', JSON.stringify(armed));
  await sp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(700);
  const writing = await sp.evaluate(() => !!document.querySelector('.sig-anim'));
  ok(writing, 'scrolled into view, it writes itself in');
  await sleep(1600);
  const handed = await sp.evaluate(() => ({
    kids: document.querySelector('.sig').children.length,
    ink: document.querySelector('.sig-ink').outerHTML,
    wait: document.documentElement.classList.contains('sig-wait'),
  }));
  const block = await sp.evaluate(() => document.querySelector('[data-sig]').outerHTML.replace(/<svg[\s\S]*$/, ''));
  ok(block === '<div class="home-sig" data-sig="">', 'and its block is back to the served markup too', block);
  ok(
    handed.kids === 1 && SIG_MARKUP.test(handed.ink) && !handed.wait,
    'afterwards the svg is exactly the served markup: one path, no display or style left on it',
    handed.ink.replace(/ d="[^"]*"/, ' d="…"'),
  );
  await sp.close();

  // Frames, per pixel, at 1x and 2x: ink only ever arrives (nothing inked in
  // one frame is gone in the next), the last frame before the handoff is the
  // finished signature, and the finished signature is the no-JS one exactly.
  for (const dpr of [1, 2]) {
    const noJs = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: dpr, javaScriptEnabled: false });
    const np = await noJs.newPage();
    await np.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const still = await np.locator('.sig').screenshot();
    await noJs.close();

    const dctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: dpr });
    const dp = await dctx.newPage();
    await dp.goto(`${BASE}/?sig-debug`, { waitUntil: 'networkidle' });
    await dp.waitForFunction(() => window.__sig);
    let prev = null;
    const lostAt = [];
    for (let t = 0; t <= 1640; t += 20) {
      await dp.evaluate((ms) => window.__sig.seek(ms), t);
      const shot = await dp.locator('.sig').screenshot();
      if (prev) {
        const { lost } = await pixelDiff(dp, prev, shot);
        if (lost > 3 * dpr * dpr) lostAt.push(`${t}ms:${lost}`);
      }
      prev = shot;
    }
    ok(lostAt.length === 0, `${dpr}x: written forward every 20ms, no inked pixel ever disappears`, lostAt.join(' '));
    await dp.evaluate(() => window.__sig.seek(1649));
    const last = await pixelDiff(dp, await dp.locator('.sig').screenshot(), still);
    ok(last.differ <= 12 * dpr * dpr, `${dpr}x: the last frame before the handoff matches the finished signature`, `${last.differ} px differ`);
    await dp.evaluate(() => window.__sig.seek(5000));
    const fin = await pixelDiff(dp, await dp.locator('.sig').screenshot(), still);
    ok(fin.differ === 0, `${dpr}x: the finished signature is the no-JS one, pixel for pixel`, `${fin.differ} px differ`);
    await dctx.close();
  }

  // Played for real, it also ends exactly on the no-JS signature.
  const noJsR = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const nr = await noJsR.newPage();
  await nr.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await nr.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const stillR = await nr.locator('.sig').screenshot();
  ok((await inkPx(nr)) > 5000, 'with scripts off the signature is simply there');
  await noJsR.close();
  const pr = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pr.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await pr.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(2400);
  const playedDiff = await pixelDiff(pr, await pr.locator('.sig').screenshot(), stillR);
  ok(playedDiff.differ === 0, 'played for real, it ends identical to the no-JS render', `${playedDiff.differ} px differ`);
  await pr.close();

  // Nothing flashes: if the script is slow, the signature stays hidden until it
  // is claimed, and if the script never comes, it is given back at 3s.
  // Every script is held back by `delay`, and the signature needs two in a
  // row (the bundle, then its chunk), so "slow" arrives around 1.2s and "late"
  // well after the 3s failsafe.
  for (const [delay, label] of [[600, 'slow'], [4500, 'late']]) {
    const ctxD = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await ctxD.route(/\/assets\/.*\.js$/, async (route) => {
      await sleep(delay);
      await route.continue();
    });
    const pd = await ctxD.newPage();
    await pd.addInitScript(() => {
      window.__seen = [];
      const tick = () => {
        const ink = document.querySelector('.sig-ink');
        if (ink) {
          const cs = getComputedStyle(ink);
          window.__seen.push({ t: Math.round(performance.now()), visible: cs.visibility !== 'hidden' && cs.display !== 'none', anim: !!document.querySelector('.sig-anim') });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await pd.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(delay + 3200);
    const seen = await pd.evaluate(() => window.__seen);
    const firstAnim = seen.findIndex((f) => f.anim);
    if (label === 'slow') {
      const early = seen.slice(0, firstAnim < 0 ? seen.length : firstAnim).filter((f) => f.visible);
      ok(firstAnim >= 0 && early.length === 0, 'slow script: the finished signature never shows before it is written', `${early.length} early visible frames, writes from ${firstAnim >= 0 ? seen[firstAnim].t : 'never'}ms`);
    } else {
      const shown = seen.find((f) => f.visible);
      const after = shown ? seen.filter((f) => f.t >= shown.t) : [];
      ok(shown && shown.t > 2800 && shown.t < 3600 && after.every((f) => f.visible && !f.anim), 'no script by 3s: the static signature is given back and stays', shown ? `shown at ${shown.t}ms` : 'never shown');
    }
    await ctxD.close();
  }

  // The chunk is fetched only on the page that has a signature, and no bundle carries the outline.
  const chunkPage = await browser.newPage();
  const jsOn = async (path) => {
    const urls = [];
    chunkPage.on('request', (r) => urls.push(r.url()));
    await chunkPage.goto(BASE + path, { waitUntil: 'networkidle' });
    chunkPage.removeAllListeners('request');
    return urls.filter((u) => /\/assets\/.*\.js$/.test(u));
  };
  const homeJs = await jsOn('/');
  const aboutJs = await jsOn('/about/');
  const sigChunk = homeJs.find((u) => /signature/.test(u));
  ok(!!sigChunk && !aboutJs.some((u) => /signature/.test(u)), 'its script loads on the home page only', JSON.stringify(aboutJs.map((u) => u.split('/').pop())));
  const outlineHead = await chunkPage.evaluate(async () => (await (await fetch('/')).text()).match(/class="sig-ink"[^>]* d="(M[^C]{4,20})/)?.[1] ?? '');
  let leaked = false;
  for (const u of homeJs) if (outlineHead && (await (await chunkPage.request.get(u)).text()).includes(outlineHead)) leaked = true;
  ok(outlineHead && !leaked, 'no script bundle carries the outline; it lives in the HTML only');
  await chunkPage.close();

  // Reduced motion switched on after the claim but before it is in view: it is
  // handed back and never erased and written in afterwards.
  const flipCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const fp = await flipCtx.newPage();
  await fp.addInitScript(() => {
    window.__everAnimAfterFlip = false;
    window.__flipped = false;
    new MutationObserver(() => {
      if (window.__flipped && document.querySelector('.sig-anim')) window.__everAnimAfterFlip = true;
    }).observe(document, { subtree: true, childList: true });
  });
  await fp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await fp.waitForFunction(() => window.__psSigClaim);
  await fp.emulateMedia({ reducedMotion: 'reduce' });
  await fp.evaluate(() => { window.__flipped = true; });
  await sleep(100);
  await fp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(1200);
  const flip = await fp.evaluate(() => ({
    shown: ((cs) => cs.display !== 'none' && cs.visibility !== 'hidden')(getComputedStyle(document.querySelector('.sig-ink'))),
    animAfter: window.__everAnimAfterFlip,
  }));
  ok(flip.shown && !flip.animAfter, 'reduced motion switched on before it plays: handed back, never written in', JSON.stringify(flip));
  await flipCtx.close();

  // A viewport too short to ever show 60% of it still gets it written.
  const shortCtx = await browser.newContext({ viewport: { width: 1440, height: 150 } });
  const shp = await shortCtx.newPage();
  await shp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await shp.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(2400);
  const short = await shp.evaluate(() => ({
    shown: ((cs) => cs.display !== 'none' && cs.visibility !== 'hidden')(getComputedStyle(document.querySelector('.sig-ink'))),
    kids: document.querySelector('.sig').children.length,
  }));
  ok(short.shown && short.kids === 1, 'a 150px-tall viewport still gets it written, and handed back', JSON.stringify(short));
  await shortCtx.close();

  // If its script fails to load, the signature comes back at once, not at 3s.
  const failCtx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await failCtx.route(/\/assets\/signature-.*\.js$/, (route) => route.abort());
  const fl = await failCtx.newPage();
  await fl.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const failShown = await fl.evaluate(() => ({
    at: Math.round(performance.now()),
    visible: ((cs) => cs.display !== 'none' && cs.visibility !== 'hidden')(getComputedStyle(document.querySelector('.sig-ink'))),
  }));
  ok(failShown.visible, 'its script failing to load hands the signature back at once', JSON.stringify(failShown));
  await failCtx.close();

  // Dark forced colors (Windows high contrast): the ink follows the theme's text color.
  const hc = await browser.newContext({ viewport: { width: 1440, height: 900 }, forcedColors: 'active', colorScheme: 'dark' });
  const hp = await hc.newPage();
  await hp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const hcColors = await hp.evaluate(() => ({
    ink: getComputedStyle(document.querySelector('.sig-ink')).fill,
    text: getComputedStyle(document.body).color,
  }));
  ok(hcColors.ink === hcColors.text, 'in dark forced colors the signature takes the text color', JSON.stringify(hcColors));
  await hc.close();

  /* ------------------------------------------------------- reduced motion */
  console.log('\n[reduced motion]');
  const calm = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const cp = await calm.newPage();
  await cp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(cp);
  const cc = await center(cp, '.home-p--wide [data-btn]', 1);
  await cp.mouse.move(cc.x - 4, cc.y + 2, { steps: 3 });
  // past the skeleton's 180ms fade
  await sleep(320);
  const rm = await cp.evaluate(() => {
    const b = document.querySelector('[data-hot]');
    const spans = Array.from(b.querySelectorAll('[data-glitch] > span')).filter((s) => s.textContent.trim());
    return {
      instant: spans.every((s) => s.style.fontFamily.includes('Dessign Maison')),
      transform: b.style.transform,
      moved: Array.from(document.querySelectorAll('[data-unit], [data-btn]')).filter((u) => u.style.translate).length,
      skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
    };
  });
  ok(rm.instant, 'the alternate shows at once, with no glitch');
  ok(!rm.transform && rm.moved === 0, 'no magnet, no seam movement', JSON.stringify(rm));
  ok(rm.skel === 1, 'the measurements still appear');

  const calmSig = await cp2(calm);
  ok(calmSig.visible && !calmSig.everAnim && !calmSig.everWait, 'the signature is there at first paint, and never written in', JSON.stringify(calmSig));
  await calm.close();

  /* ------------------------------------------------------------- keyboard */
  console.log('\n[keyboard]');
  const kb = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const kp = await kb.newPage();
  await kp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(kp);
  await kp.keyboard.press('Tab');
  await sleep(120);
  const f1 = await kp.evaluate(() => {
    const a = document.activeElement;
    const cs = getComputedStyle(a);
    const w = a.querySelector('[data-word]');
    const label = w ? Array.from(w.childNodes).filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join('') : '';
    return { word: label, hot: a.hasAttribute('data-hot'), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` };
  });
  ok(f1.word === 'home' && f1.hot, 'Tab lands on the first button and lights it', JSON.stringify(f1));
  ok(f1.outline === 'solid 2px rgb(63, 81, 149)', 'focus ring: 2px link blue', f1.outline);
  await kp.keyboard.press('Tab');
  await sleep(300);
  const f2 = await kp.evaluate(() => document.querySelectorAll('[data-hot]').length);
  ok(f2 === 1, 'moving focus moves the band', String(f2));
  await kb.close();

  /* ------------------------------------------------------ back / forward */
  console.log('\n[back and forward]');
  // Playwright turns the back/forward cache off by default; real browsers
  // have it on, so this runs a browser with it on. Leave home before the
  // signature was written (it sits below the fold at 1440x900), then go back.
  const bfBrowser = await chromium.launch({ executablePath: CHROME, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  try {
    const bf = await bfBrowser.newContext({ viewport: { width: 1440, height: 900 } });
    const bp2 = await bf.newPage();
    await bp2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await bp2.evaluate(() => {
      window.__persisted = null;
      addEventListener('pageshow', (e) => { window.__persisted = e.persisted; });
    });
    await bp2.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
    await bp2.goBack({ waitUntil: 'commit' });
    await sleep(400);
    await bp2.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(800);
    const back = await bp2.evaluate(() => ({
      persisted: window.__persisted,
      visible: ((cs) => cs.display !== 'none' && cs.visibility !== 'hidden')(getComputedStyle(document.querySelector('.sig-ink'))),
      anim: !!document.querySelector('.sig-anim'),
    }));
    ok(back.visible && !back.anim, `coming back to home${back.persisted ? ' from the back/forward cache' : ''}, the signature is already written`, JSON.stringify(back));
    await bf.close();
  } finally {
    await bfBrowser.close();
  }

  /* ----------------------------------------------------------- the phone */
  console.log('\n[phone]');
  const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const pp = await phone.newPage();
  for (const r of ROUTES) {
    await pp.goto(BASE + r, { waitUntil: 'networkidle' });
    await settle(pp);
    const o = await pp.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      units: document.querySelectorAll('[data-unit]').length,
      h1: getComputedStyle(document.querySelector('h1')).fontSize,
    }));
    ok(o.overflow === 0 && o.units === 0, `${r} fits 375 with no seams`, JSON.stringify(o));
    const orphans = await pp.evaluate(() =>
      Array.from(document.querySelectorAll('[data-btn]')).flatMap((b) => {
        const t = b.nextSibling;
        if (!t || t.nodeType !== 3 || !/^[.,:;)]/.test(t.nodeValue)) return [];
        const rg = document.createRange();
        rg.setStart(t, 0);
        rg.setEnd(t, 1);
        const p = rg.getBoundingClientRect();
        const r = b.getBoundingClientRect();
        return p.top > r.bottom - 4 ? [b.textContent.trim().slice(0, 30)] : [];
      }),
    );
    ok(orphans.length === 0, `${r}: no punctuation orphaned from its button`, orphans.join(' | '));
  }
  await pp.goto(`${BASE}/paintings/`, { waitUntil: 'networkidle' });
  ok((await pp.evaluate(() => getComputedStyle(document.querySelector('.gallery')).columnCount)) === '1', 'paintings go to one column');

  // A finger gets the band and the alternate while pressed, at once, with no glitch.
  await pp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(pp);
  const press = await pp.evaluate(() => {
    const b = document.querySelector('[data-btn]');
    const opts = { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 7 };
    b.dispatchEvent(new PointerEvent('pointerdown', opts));
    const down = {
      hot: b.hasAttribute('data-hot'),
      instant: Array.from(b.querySelectorAll('[data-glitch] > span'))
        .filter((s) => s.textContent.trim())
        .every((s) => s.style.fontFamily.includes('Dessign Maison')),
    };
    b.dispatchEvent(new PointerEvent('pointerup', opts));
    return { ...down, after: b.hasAttribute('data-hot') };
  });
  ok(press.hot && press.instant, 'touch: pressing lights the button in its final state at once', JSON.stringify(press));
  ok(!press.after, 'touch: lifting the finger lets it go');

  const two = await pp.evaluate(() => {
    const [a, b] = document.querySelectorAll('[data-btn]');
    const ev = (t, el, id) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch', pointerId: id }));
    ev('pointerdown', a, 1);
    ev('pointerdown', b, 2);
    const both = a.hasAttribute('data-hot') && b.hasAttribute('data-hot');
    ev('pointerup', a, 1);
    ev('pointerup', b, 2);
    return { both, left: document.querySelectorAll('[data-hot]').length };
  });
  ok(two.both && two.left === 0, 'touch: two fingers on two buttons, and both let go', JSON.stringify(two));
  await phone.close();
} finally {
  await browser.close();
}

console.log(failed ? `\n${failed} FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
