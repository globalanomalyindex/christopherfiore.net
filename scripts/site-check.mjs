/**
 * End-to-end check of the built site, in real Chrome and in WebKit.
 *
 *   npm run build
 *   npx vite preview --port 4173 --strictPort      (in another terminal)
 *   npm i --no-save playwright-core
 *   npm run check:site
 *
 * BASE=https://christopherfiore.net npm run check:site runs it against live.
 *
 * It asserts behavior, not screenshots: computed styles, layout boxes and the
 * DOM the runtime builds. The promise it guards hardest is "hover must never
 * change layout", which it checks by comparing every button's, row's and
 * prose block's layout box before and during a hover. The second is that a
 * page change can never leave a page covered.
 */

import { chromium, webkit } from 'playwright-core';

const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const CHROME =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = [
  '/',
  '/product-designs/',
  '/product-designs/jellybox/',
  '/product-designs/guestpass/',
  '/product-designs/chellbook/',
  '/product-designs/mfny-concentrates/',
  '/product-designs/df2tm/',
  '/paintings/',
  '/about/',
];

let failed = 0;
let passed = 0;
const ok = (cond, msg, detail = '') => {
  if (cond) {
    passed++;
    console.log(`  ok   ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL ${msg}${detail ? `  ·  ${detail}` : ''}`);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** A clip that shows all of a layer, however the engine writes it: inset(0%) or inset(0% 0% 0% 0%). */
const FULL = /^inset\(0%( 0%){0,3}\)$/;

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

/** Every button's, row's, header's and prose block's LAYOUT box: offsets ignore transform and translate. */
const layout = () =>
  Array.from(document.querySelectorAll('[data-btn], [data-seams], [data-word], .row, .nm, .l, .sec, .chip, .tile, .hd, .hr, .who')).map((e) => {
    let x = 0;
    let y = 0;
    for (let n = e; n; n = n.offsetParent) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return `${x},${y},${e.offsetWidth},${e.offsetHeight}`;
  });

/** Is everything under the masthead really on screen: not hidden, not under an overlay? */
const uncovered = () => {
  const html = document.documentElement;
  const main = document.querySelector('main');
  return {
    cls: html.classList.contains('morph-in'),
    attr: html.getAttribute('data-morph'),
    overlay: !!document.querySelector('.morph'),
    main: !!main && getComputedStyle(main).visibility === 'visible',
    words: main ? main.innerText.trim().length : 0,
  };
};
const isOpen = (u) => !u.cls && !u.attr && !u.overlay && u.main && u.words > 20;

/** Watch a page from before first paint: was its body ever seen before the film could cover it? */
const watchArrival = () => {
  window.__arrive = [];
  window.__gated = false;
  // The gate sets its class in <head>, long before a frame. Catch it there.
  new MutationObserver(() => {
    if (document.documentElement.classList.contains('morph-in')) window.__gated = true;
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  const t0 = performance.now();
  const tick = () => {
    const html = document.documentElement;
    const main = document.querySelector('main');
    if (main) {
      window.__arrive.push({
        t: Math.round(performance.now() - t0),
        gate: html.classList.contains('morph-in'),
        overlay: !!document.querySelector('.morph'),
        state: html.getAttribute('data-morph'),
        hidden: getComputedStyle(main).visibility === 'hidden',
      });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/** Click a link and follow the film across both pages. */
async function film(pg, href, wait = 2300) {
  await pg.goto(`${BASE}${href.from}`, { waitUntil: 'networkidle' });
  await settle(pg);
  await sleep(wait);
  const t0 = Date.now();
  // Scrolled into view by hand: the header row is sticky, and a link under it
  // would only be clicked through it.
  await pg.evaluate((to) => {
    const a = document.querySelector(`a[href="${to}"]`);
    a.scrollIntoView({ block: 'center' });
  }, href.to);
  await sleep(80);
  // The page leaves the instant it is covered, so what it looked like then is
  // noted at that instant (a MutationObserver runs before the navigation) and
  // carried across in sessionStorage.
  await pg.evaluate(() => {
    const seen = [];
    sessionStorage.removeItem('check-src');
    new MutationObserver(() => {
      const s = document.documentElement.getAttribute('data-morph');
      if (!s || seen[seen.length - 1] === s) return;
      seen.push(s);
      if (s !== 'covered') return;
      const o = document.querySelector('.morph');
      const lit = Array.from(o.querySelectorAll('.ln')).filter((l) => l.textContent.length);
      const rects = lit.map((l) => l.getBoundingClientRect());
      sessionStorage.setItem(
        'check-src',
        JSON.stringify({
          seen,
          aria: o.getAttribute('aria-hidden'),
          pe: getComputedStyle(o).pointerEvents,
          focusable: o.querySelectorAll('a, button, input, [tabindex]').length,
          full: rects.every((b) => b.left <= 0.5 && b.right >= innerWidth - 0.5) && Math.max(...rects.map((b) => b.bottom)) >= innerHeight - 0.5,
          ink: lit.map((l) => l.textContent.replace(/ /g, '')).join(''),
        }),
      );
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-morph'] });
  });
  // The plain film, no Coalesce: the lineage films are judged in their own section.
  await pg.evaluate(() => window.__morph?.force(null, false));
  await pg.locator(`a[href="${href.to}"]`).first().click();
  await pg.waitForURL(`**${href.to}`);
  await pg.waitForFunction(() => window.__arrive && window.__arrive.length > 2 && !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'), null, { timeout: 5000 });
  const total = Date.now() - t0;
  const arrive = await pg.evaluate(() => window.__arrive);
  const dir = await pg.evaluate(() => window.__psMorphIn);
  const end = await pg.evaluate(uncovered);
  const src = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('check-src')));
  const gated = await pg.evaluate(() => window.__gated);
  return { src, arrive, dir, end, total, gated };
}

// CHROME_ARGS: extra switches, e.g. --disable-frame-rate-limit on a laptop whose
// battery is low enough for Chrome to cap every page at 30fps
const browser = await chromium.launch({ executablePath: CHROME, args: (process.env.CHROME_ARGS ?? '').split(' ').filter(Boolean) });
let wk = null;
try {
  wk = await webkit.launch();
} catch {
  console.log('  skip WebKit is not installed (npx playwright install webkit)');
}
try {
  /* ------------------------------------------------------------ every page */
  console.log('\n[pages]');
  const desk = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // The glitch checks hold the lineage deck still; [lineage] checks the deck itself.
  await desk.addInitScript(() => (window.__linQuiet = true));
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
        main: document.querySelectorAll('main').length,
        name: document.querySelector('.name')?.textContent ?? '',
        anchor: document.querySelectorAll('[data-anchor]').length,
        canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
        dashes: (text.match(/[–—]/g) ?? []).length,
        british: (text.match(/\b(colour|favour|behaviour|honour|centre|theatre(?! and film)|organis|realis|analys(?!is)|licence|artefact|grey)\w*/gi) ?? []),
        hrefs: Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')),
        unlabeled: Array.from(document.querySelectorAll('a')).filter((a) => !a.hasAttribute('data-btn')).length,
        // Every link reads "+something", bar the figure chip in a masthead.
        back: (() => { const a = document.querySelector('a[data-anchor]'); return a ? { jx: a.matches('a.jx[data-jx]'), svg: !!a.querySelector('svg.jx-x path'), skin: !!a.querySelector('.jx-skin'), label: a.getAttribute('aria-label'), glyph: a.dataset.glyph, text: a.textContent.trim() } : null; })(),
        // The back button is the one link marked by JellyBox's X instead of a "+".
        unmarked: Array.from(document.querySelectorAll('a[data-btn]:not(.fig):not([data-anchor])')).filter((a) => !a.textContent.trim().startsWith('+')).map((a) => a.textContent.trim().slice(0, 24)),
        imgsNoSize: Array.from(document.images).filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
        imgsNoAlt: Array.from(document.images).filter((i) => !i.alt).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        gate: Array.from(document.querySelectorAll('head script:not([src])')).some((s) => s.textContent.includes('ps-morph')),
      };
    });
    console.log(` ${r}`);
    ok(res.status() === 200, 'serves 200', String(res.status()));
    ok(info.h1 === 1 && info.main === 1, 'one h1, one main', `${info.h1} ${info.main}`);
    ok(info.name === 'christopher robin' && info.anchor === 1, 'the masthead: his name, and one "+"', `${info.name} ${info.anchor}`);
    ok(info.title.includes('christopher robin fiore'), 'titled', info.title);
    ok(info.canonical.endsWith(r), 'canonical is its own URL', info.canonical);
    ok(info.dashes === 0, 'no em or en dashes in the page text', String(info.dashes));
    ok(info.british.length === 0, 'american spelling', info.british.join(', '));
    ok(info.unlabeled === 0, 'every link is a button', String(info.unlabeled));
    ok(info.unmarked.length === 0, 'every link starts with "+"', info.unmarked.join(' | '));
    if (r !== '/') ok(info.back && info.back.jx && info.back.svg && info.back.skin && /^back to /.test(info.back.label) && info.back.glyph === '+' && info.back.text === '+', 'the anchor is JellyBox’s X in its ledger box, with a spoken label', JSON.stringify(info.back));
    ok(info.imgsNoSize === 0 && info.imgsNoAlt === 0, 'every image has a size and alt text');
    ok(info.overflow === 0, 'no horizontal scroll at 1440', String(info.overflow));
    ok(info.gate, 'the morph gate is in its head');
    info.hrefs.filter((h) => h.startsWith('/')).forEach((h) => internal.add(h.split('#')[0]));
  }
  ok(errors.length === 0, 'no console errors on any page', errors.join(' | '));

  console.log('\n[links]');
  for (const h of [...internal].sort()) {
    const res = await page.request.get(BASE + h);
    ok(res.status() === 200, `${h} resolves`, String(res.status()));
  }
  const nf = await page.request.get(`${BASE}/404.html`);
  const nfText = await nf.text();
  ok(nf.status() === 200 && nfText.includes('not found') && nfText.includes('noindex'), '404.html is built, and not indexed');
  const sm = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
  ok(ROUTES.every((r) => sm.includes(`<loc>https://christopherfiore.net${r}</loc>`)), 'the sitemap lists every route');

  /* ---------------------------------------------------------- the content */
  console.log('\n[content]');
  await page.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  const groups = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.body > section.group')).map((g) => ({
      status: g.querySelector('.chip').firstChild.textContent,
      // the count is posted in the figure columns, one digit per column
      count: Array.from(g.querySelectorAll('.sec .led i')).map((i) => i.dataset.d ?? '').join(''),
      cases: Array.from(g.querySelectorAll('a.row')).map((a) => ({
        name: a.querySelector('[data-word]').textContent.replace(/^\+/, ''),
        tag: a.querySelector('.cs')?.textContent ?? '',
      })),
    })),
  );
  // [status, has a case study], in the index order of data/cases.ts
  const STATUS = {
    metadump: ['built', true],
    'scream canister controls': ['built', true],
    jellybox: ['built', true],
    'after tokens': ['motion interaction study', true],
    'apple wallet card sharing concept': ['design study', true],
    chellbook: ['client work', true],
    lee: ['design study', false],
    'mfny concentrates': ['built', true],
    'chipotle app ui cleanup': ['design study', false],
    'one master affordance': ['simulated', true],
    'adhd mode': ['built', true],
    df2tm: ['built', true],
    campeón: ['simulated', false],
    chickpea: ['built', true],
    wildcard: ['tested logic from a preregistered blind study', true],
    dither: ['built', false],
    'three zones: camera market ui fix': ['design study', false],
  };
  const flatCases = groups.flatMap((g) => g.cases.map((c) => ({ ...c, status: g.status })));
  ok(flatCases.length === 17, 'seventeen cases', String(flatCases.length));
  ok(
    groups.map((g) => g.status).join('|') === 'built|design study|motion interaction study|client work|simulated|tested logic from a preregistered blind study',
    'six groups, one per status word, in the vocabulary’s order',
    groups.map((g) => g.status).join('|'),
  );
  const wrong = flatCases.filter((c) => !STATUS[c.name] || STATUS[c.name][0] !== c.status || (c.tag === 'w/ case study') !== STATUS[c.name][1] || (c.tag && c.tag !== 'w/ case study'));
  ok(wrong.length === 0, 'every project sits under its own status, and keeps its case study tag', wrong.map((c) => `${c.name}: ${c.status} ${c.tag}`).join(' | '));
  ok(
    groups.every((g) => g.cases.map((c) => c.name).join() === Object.keys(STATUS).filter((n) => STATUS[n][0] === g.status).join() && +g.count === g.cases.length),
    'inside a group the index order holds, and each count is true',
  );

  await page.goto(`${BASE}/paintings/`, { waitUntil: 'networkidle' });
  const years = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.body > section.group')).map((g) => [g.querySelector('.chip').firstChild.textContent, +Array.from(g.querySelectorAll('.sec .led i')).map((i) => i.dataset.d ?? '').join(''), g.querySelectorAll('.tile').length]),
  );
  ok(years.reduce((n, y) => n + y[2], 0) === 20, 'twenty paintings', JSON.stringify(years));
  ok(
    years.map((y) => y[0]).join() === '2025,2024,2023,undated' && years.every((y) => y[1] === y[2]) && years[3][2] === 8,
    'grouped by year, newest first, with eight undated and true counts',
    JSON.stringify(years),
  );

  await page.goto(`${BASE}/product-designs/chellbook/`, { waitUntil: 'networkidle' });
  const chell = await page.evaluate(() => ({ text: document.body.innerText, next: document.querySelector('#next-up a.row')?.textContent ?? '', nextHref: document.querySelector('#next-up a.row')?.getAttribute('href') }));
  ok(chell.text.includes('not a promise of absolute safety.'), 'chellbook keeps "not a promise of absolute safety"');
  ok(chell.next.startsWith('+mfny concentrates') && chell.nextHref === '/product-designs/mfny-concentrates/', 'chellbook points next at mfny concentrates', chell.next);

  await page.goto(`${BASE}/product-designs/guestpass/`, { waitUntil: 'networkidle' });
  const gp = await page.evaluate(() => document.body.innerText);
  ok(gp.includes('not affiliated with apple') && gp.includes('nothing was built'), 'guestpass keeps its boundaries');
  ok(gp.includes('edge case, exploratory, not drawn.'), 'guestpass keeps the exploratory aside');

  await page.goto(`${BASE}/product-designs/mfny-concentrates/`, { waitUntil: 'networkidle' });
  const mf = await page.evaluate(() => document.body.innerText);
  ok(mf.includes('the THC numbers in it are placeholders, and it says so.'), 'mfny keeps "the THC numbers in it are placeholders"');

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const homeCopy = await page.evaluate(() => ({
    who: Array.from(document.querySelectorAll('.who p')).map((p) => p.textContent),
    menu: Array.from(document.querySelectorAll('.menu a')).map((a) => [a.querySelector('[data-word]').textContent, a.querySelector('.n').textContent, a.getAttribute('href'), a.target]),
    studio: !!Array.from(document.querySelectorAll('a')).find((a) => a.textContent.includes('synthétique')),
  }));
  ok(
    homeCopy.who.join('|') === 'designer: web & product|specialty: UI/UX, artificial intelligence|founder: perfection synthétique, design studio',
    'home: his three lines, word for word',
    homeCopy.who.join('|'),
  );
  ok(
    JSON.stringify(homeCopy.menu) ===
      JSON.stringify([
        ['+product designs & experiments', '17', '/product-designs/', ''],
        ['+paintings', '20', '/paintings/', ''],
        ['+about me/contact', 'say hi', '/about/', ''],
        ['+view resume', 'pdf', '/documents/Christopher-Robin-Fiore-Resume.pdf', '_blank'],
      ]),
    'home: the four menu rows, their counts and where they go',
    JSON.stringify(homeCopy.menu),
  );
  ok(!homeCopy.studio, '"perfection synthétique" is plain text, not a link');

  /* --------------------------------- his window, 1728 x 908: his round 3 screenshot, px for px */
  console.log('\n[his window, 1728 x 908]');
  const hisCtx = await browser.newContext({ viewport: { width: 1728, height: 908 } });
  // the deck held still: these judge the glitch and the film themselves
  await hisCtx.addInitScript(() => (window.__linQuiet = true));
  const his = await hisCtx.newPage();
  await his.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(his);
  const frame = await his.evaluate(() => {
    const r = (s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)];
    };
    const cs = (s) => getComputedStyle(document.querySelector(s));
    const sheet = getComputedStyle(document.querySelector('.ledger'), '::before');
    const led = document.querySelector('.ledger').getBoundingClientRect();
    return {
      fs: cs('body').fontSize,
      font: cs('body').fontFamily,
      name: [cs('.name').fontSize, r('.name')[0], Math.round(document.querySelector('.name').getBoundingClientRect().top + parseFloat(cs('.name').paddingTop))],
      plus: r('.plus'),
      who: r('.who').slice(0, 2),
      whoBottom: r('.who')[3],
      menu: r('.menu'),
      rules: Array.from(document.querySelectorAll('.hr .ink')).map((i) => { const b = i.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right)]; }),
      hairs: Array.from(document.querySelectorAll('.hr .hair')).map((i) => { const b = i.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; }),
      sheet: [Math.round(led.left + parseFloat(sheet.left)), Math.round(led.left + parseFloat(sheet.left) + parseFloat(sheet.width)), sheet.backgroundColor, sheet.borderLeftColor],
      ground: cs('body').backgroundColor,
      ink: cs('body').color,
      sig: [...r('.sig').slice(0, 1), Math.round(document.querySelector('.sig').getBoundingClientRect().width), cs('.sig').color, Math.round(document.querySelector('.sig').getBoundingClientRect().bottom)],
      row: document.querySelector('.hrow').getBoundingClientRect().height,
      scroll: document.documentElement.scrollHeight - innerHeight,
      // the figure columns standing on each rule: three blank cells, ruled in ink, flat full hue
      leds: Array.from(document.querySelectorAll('.hr .led')).map((l) => {
        const b = l.getBoundingClientRect();
        const cells = Array.from(l.querySelectorAll('i'));
        return { box: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], n: cells.length, blank: cells.every((i) => !i.dataset.d), rule: getComputedStyle(cells[0]).borderLeftColor, fill: getComputedStyle(cells[0]).backgroundColor };
      }),
      double: getComputedStyle(document.querySelector('.home > .hr .led'), '::after').height,
    };
  });
  ok(frame.fs === '40px' && frame.font.startsWith('"Iosevka Charon Mono"'), 'set in Iosevka Charon Mono at 40px: the window is 43.2 type sizes wide', `${frame.fs} ${frame.font}`);
  ok(frame.ground === 'rgb(243, 245, 248)' && frame.ink === 'rgb(18, 20, 27)', 'cool ground #F3F5F8, ink #12141B', `${frame.ground} ${frame.ink}`);
  ok(JSON.stringify(frame.name) === '["80px",72,20]', 'the name: 80px at x72, as in his screenshot (39% of the window)', JSON.stringify(frame.name));
  ok(JSON.stringify(frame.plus) === '[32,132,52,183]', 'the "+": one cell centred on x42', JSON.stringify(frame.plus));
  ok(JSON.stringify(frame.who) === '[72,195]' && frame.whoBottom === 350, 'his three lines: x72, y195 to y350', JSON.stringify([frame.who, frame.whoBottom]));
  ok(JSON.stringify(frame.menu) === '[34,423,1090,629]' && Math.abs(frame.row - 51.67) < 0.1, 'the menu: rule to rule, y423 to y629, on 51.67px rows (3% of the window)', JSON.stringify([frame.menu, frame.row]));
  ok(JSON.stringify(frame.rules) === '[[72,158,814],[72,395,814],[72,671,814]]', 'his three rules: x72 to x814 at y158, y395 and y671, within 2px of his screenshot', JSON.stringify(frame.rules));
  ok(frame.hairs.every((h) => h[0] === 814 && h[1] === 1728), 'each rule runs on as a hairline to the right edge', JSON.stringify(frame.hairs));
  ok(frame.sheet[0] === 33 && frame.sheet[1] === 1091 && frame.sheet[2] === 'rgb(253, 254, 255)' && frame.sheet[3] === 'rgb(18, 20, 27)', 'the sheet column #FDFEFF between his vertical rules at x33 and x1091 (63% of the window)', JSON.stringify(frame.sheet));
  ok(frame.sig[0] === 72 && frame.sig[1] === 845 && frame.sig[2] === 'rgb(18, 20, 27)' && frame.sig[3] <= 908 && frame.scroll === 0, 'the signature: ink, 845px wide from x72, and the whole home page fits his window', JSON.stringify([frame.sig, frame.scroll]));
  ok(
    frame.leds.length === 3 && frame.leds.every((l, i) => l.n === 3 && l.blank && l.rule === 'rgb(18, 20, 27)' && l.box[0] === 754 && l.box[2] === 814 && l.box[3] === [158, 395, 671][i]),
    'each rule ends in three blank figure columns, ruled in ink, standing on the rule',
    JSON.stringify(frame.leds),
  );
  ok(frame.leds.map((l) => l.fill).join('|') === 'rgb(18, 217, 232)|rgb(255, 171, 209)|rgb(201, 242, 39)', 'the columns are flat full hue, no light to dark ramp: cyan, pink, lime', frame.leds.map((l) => l.fill).join('|'));
  ok(frame.double === '1px', 'the last rule is a double rule: the sheet closes, then he signs it', frame.double);

  await his.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(his);
  const chips = await his.evaluate(() => {
    const r = (s) => {
      const b = document.querySelector(s).getBoundingClientRect();
      return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)];
    };
    const cs = (s) => getComputedStyle(document.querySelector(s));
    const digits = (el) => Array.from(el.querySelectorAll('.led i')).map((i) => i.dataset.d ?? ' ').join('');
    return {
      jx: r('.jx'),
      name: [r('.name')[0], Math.round(document.querySelector('.name').getBoundingClientRect().top + parseFloat(cs('.name').paddingTop))],
      chip: [...r('.hd .chip'), cs('.hd .chip').backgroundColor],
      tot: [...r('.hd .tot'), document.querySelector('.hd .tot .fig').firstChild.textContent, digits(document.querySelector('.hd .tot')), getComputedStyle(document.querySelector('.hd .tot'), '::after').height],
      secs: Array.from(document.querySelectorAll('.sec')).map((s) => digits(s)),
      row: r('a.row'),
      rowGap: document.querySelectorAll('a.row')[1].getBoundingClientRect().top - document.querySelectorAll('a.row')[0].getBoundingClientRect().bottom,
      nm: [Math.round(document.querySelector('.row [data-word]').getBoundingClientRect().left), cs('.row .nm').fontWeight, Math.round(document.querySelector('.row .nm').getBoundingClientRect().width)],
      tag: (() => { const t = document.querySelector('a.row .cs'); const n = t.closest('.nm'); return n && t.getBoundingClientRect().top > n.querySelector('[data-word]').getBoundingClientRect().top && Math.round(t.getBoundingClientRect().left) === Math.round(n.getBoundingClientRect().left); })(),
      l: r('.row .l'),
      tint: cs('a.row').backgroundColor,
      lede: Math.round(document.querySelector('.lede').getBoundingClientRect().left + parseFloat(cs('.lede').paddingLeft)),
    };
  });
  ok(JSON.stringify(chips.jx) === '[0,122,72,195]' && JSON.stringify(chips.name) === '[72,20]', 'subpage masthead: name where home’s is; the back button’s box is the whole gutter, its right rule on the content edge', JSON.stringify([chips.jx, chips.name]));
  ok(chips.chip[0] === 72 && chips.chip[1] === 132 && chips.chip[4] === 'rgb(245, 217, 10)', 'the title chip: x72, in the page’s yellow', JSON.stringify(chips.chip));
  ok(chips.tot[2] === 1672 && chips.tot[4] === 'projects' && chips.tot[5] === ' 17' && chips.tot[6] === '3px', 'the total: "projects" on the chip, 17 posted in the figure columns over a double rule, ending the 80 columns at x1672', JSON.stringify(chips.tot));
  ok(chips.secs.join('|') === '  8|  4|  1|  1|  2|  1|   |   ', 'each section posts its count in its figure columns; housekeeping sections keep them empty', chips.secs.join('|'));
  ok(chips.row[0] === 72 && chips.row[2] === 1672 && Math.abs(chips.rowGap - 6.67) < 0.1, 'rows span the 80 columns, a sixth of a line of ground between them', JSON.stringify([chips.row, chips.rowGap]));
  ok(chips.nm[0] === 92 && chips.nm[1] === '700' && chips.nm[2] === 560 && chips.lede === 92 && chips.l[0] === 652, 'two columns: a bold 14em name column, the detail from x652; text inset one column (x92)', JSON.stringify([chips.nm, chips.l, chips.lede]));
  ok(chips.tag, 'the "w/ case study" tag sits under the name, starting at its left edge');
  ok(chips.tint === 'rgb(236, 245, 215)', 'rows are tinted in the section’s hue, mixed into the ground', chips.tint);
  for (const [path, color] of [['/paintings/', 'rgb(18, 217, 232)'], ['/about/', 'rgb(255, 171, 209)']]) {
    await his.goto(BASE + path, { waitUntil: 'networkidle' });
    const c = await his.evaluate(() => getComputedStyle(document.querySelector('.hd .chip')).backgroundColor);
    ok(c === color, `${path} title chip takes its page color`, c);
  }

  // The header row sticks, so the back button is on screen however far down the page is.
  await his.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await his.evaluate(() => window.scrollTo(0, 2400));
  await sleep(150);
  const stuck = await his.evaluate(() => {
    const b = document.querySelector('.jx').getBoundingClientRect();
    return { top: b.top, hit: document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('a')?.getAttribute('href') };
  });
  ok(stuck.top >= 0 && stuck.top < 40 && stuck.hit === '/', 'scrolled far down, the back button is still at the top of the window, and still the link home', JSON.stringify(stuck));
  await hisCtx.close();

  /* ------------------------------------------------ hover: band and glitch */
  console.log('\n[hover]');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(page);
  await sleep(2300);
  const before = await page.evaluate(layout);
  const btn = '.menu [data-btn]';
  const c0 = await center(page, btn, 0);
  await page.mouse.move(c0.x, c0.y, { steps: 4 });
  await sleep(130);
  const early = await page.evaluate((s) => {
    const b = document.querySelector(s);
    const band = b.querySelector('[data-band]');
    const ov = b.querySelector('[data-glitch]');
    const br = band?.getBoundingClientRect();
    const menu = document.querySelector('.menu').getBoundingClientRect();
    return {
      hot: b.hasAttribute('data-hot'),
      first: band?.firstElementChild === band?.querySelector('.bm'),
      layers: band ? Array.from(band.children).map((c) => c.className).join(' ') : '',
      outline: band ? getComputedStyle(band.querySelector('.bo')).boxShadow : '',
      z: band ? getComputedStyle(band).zIndex : '',
      main: band ? band.querySelector('.bm').style.backgroundColor : '',
      span: br ? [Math.round(br.left), Math.round(br.right)] : [],
      menu: [Math.round(menu.left), Math.round(menu.right)],
      word: getComputedStyle(b.querySelector('[data-word]')).color,
      overlay: ov ? ov.textContent : null,
      ink: getComputedStyle(b).color,
      count: getComputedStyle(b.querySelector('.n')).color,
    };
  }, btn);
  ok(early.hot, 'the row goes hot');
  ok(early.first && /^bm( fc)?( st t)? st b bo$/.test(early.layers) && /1\.5px/.test(early.outline) && early.z === '-1', 'the band, its strips by 100ms (the top one now and then left out, the figure cell now and then filled), and a 1.5px outline, at z -1 under the label', `${early.layers} ${early.outline} ${early.z}`);
  ok(early.main === 'rgb(245, 217, 10)', 'the home menu floods each row in its own page color', early.main);
  ok(JSON.stringify(early.span) === JSON.stringify(early.menu), 'the band floods from one vertical rule to the other', JSON.stringify(early));
  ok(early.word === 'rgba(0, 0, 0, 0)', 'the resting word goes transparent', early.word);
  ok(early.overlay === '+product designs & experiments...', 'the overlay carries the label and its tail', String(early.overlay));
  ok(early.ink === 'rgb(26, 24, 32)' && early.count === 'rgb(26, 24, 32)', 'ink pinned to band ink, the count too', `${early.ink} ${early.count}`);

  await sleep(900);
  const late = await page.evaluate((s) => {
    const b = document.querySelector(s);
    const spans = Array.from(b.querySelectorAll('[data-glitch] > span'));
    const ov = b.querySelector('[data-glitch]');
    const range = document.createRange();
    range.selectNodeContents(ov);
    return {
      alt: spans.filter((x) => x.textContent.trim()).every((x) => x.style.fontFamily.includes('Dessign Maison')),
      loaded: document.fonts.check("24px 'Dessign Maison'"),
      fits: range.getBoundingClientRect().right <= b.querySelector('.n').getBoundingClientRect().left,
    };
  }, btn);
  ok(late.alt && late.loaded, 'every letter settles into Dessign Maison and holds', JSON.stringify(late));
  ok(late.fits, 'the hover label fits its cell, clear of the count');
  const during = await page.evaluate(layout);
  ok(JSON.stringify(before) === JSON.stringify(during), 'zero reflow: no layout box moved during the hover', `${before.filter((b, i) => b !== during[i]).length} moved of ${before.length}`);

  const pulled = await page.evaluate((s) => document.querySelector(s).style.transform, btn);
  await page.mouse.move(c0.box.x + c0.box.width - 3, c0.box.y + 3, { steps: 3 });
  await sleep(200);
  const leaned = await page.evaluate((s) => document.querySelector(s).style.transform, btn);
  ok(/translate\(/.test(leaned) && leaned !== pulled, 'magnet: the row leans toward the cursor', leaned);
  const m = leaned.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  ok(m && Math.abs(+m[1]) <= 8 && Math.abs(+m[2]) <= 6, 'magnet: inside the 8 × 6 cap', leaned);
  const seamsOff = await page.evaluate((s) => document.querySelector(s).style.translate, btn);
  ok(!seamsOff, 'two systems, two properties: the magnet wrote transform and left translate alone', seamsOff);

  const cA = await center(page, btn, 2);
  await page.mouse.move(cA.x, cA.y, { steps: 3 });
  await sleep(80);
  const aboutOv = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-glitch]')).map((o) => o.textContent),
  );
  ok(aboutOv.length === 1 && aboutOv[0] === '+about me/contact...', 'moving straight to another row leaves only one hot', aboutOv.join(' | '));

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

  // Every page: hover a link of each kind, and nothing on the page moves.
  for (const [path, sels] of [
    ['/product-designs/', ['a.row', '#next-up a.row, nav a.row']],
    ['/product-designs/chellbook/', ['#the-work .btn.in', '.hd .fig', '#next-up a.row']],
    ['/paintings/', ['.tile .cell', 'nav a.row']],
    ['/about/', ['.glance .cell', '.hd .fig', '#say-hi a.row']],
  ]) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await settle(page);
    let moved = 0;
    let lit = 0;
    for (const sel of sels) {
      await page.mouse.move(1430, 600);
      await page.locator(sel).first().scrollIntoViewIfNeeded();
      await sleep(350);
      const b4 = await page.evaluate(layout);
      const c = await center(page, sel);
      await page.mouse.move(c.x, c.y, { steps: 3 });
      await sleep(700);
      lit += await page.evaluate(() => document.querySelectorAll('[data-hot] [data-band]').length);
      const now = await page.evaluate(layout);
      moved += b4.filter((b, i) => b !== now[i]).length;
    }
    ok(lit === sels.length && moved === 0, `${path}: a row, a chip and a cell each light, and no layout box moves`, `${lit} lit, ${moved} moved`);
  }

  // Every label, in both faces: the hover label never runs out of its cell
  // into the column beside it.
  for (const path of ['/product-designs/', '/paintings/', '/about/', '/product-designs/guestpass/']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await settle(page);
    const spill = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.nm [data-word], .cell [data-word], .fig [data-word]')).flatMap((w) => {
        const width = (text) => {
          const s = document.createElement('span');
          s.textContent = text;
          s.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:0;top:0;font-family:'Dessign Maison',Georgia,serif;font-feature-settings:'salt' 1,'ss01' 1;font-size:1.14em;font-weight:400";
          w.appendChild(s);
          const x = s.getBoundingClientRect().width;
          s.remove();
          return x;
        };
        const cell = w.parentElement;
        const cs = getComputedStyle(cell);
        // the overlay starts at the cell's left padding and may run to its edge
        const room = cell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        // A name too long for its column wraps at rest, and its overlay wraps with it:
        // then every word, and the last with its tail, must fit the column on its own.
        const range = document.createRange();
        range.selectNodeContents(w.firstChild);
        const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size;
        const pieces = lines > 1 ? w.textContent.split(' ').map((p, i, a) => (i === a.length - 1 ? `${p}...` : p)) : [`${w.textContent}...`];
        const widest = Math.max(...pieces.map(width));
        return widest > room + 0.5 ? [`${w.textContent} ${Math.round(widest)}>${Math.round(room)}`] : [];
      }),
    );
    ok(spill.length === 0, `${path}: every hover label fits its cell`, spill.join(' | '));
  }

  // The back button answers for itself: no band, no glitch, no magnet. JellyBox's material leans; the X stays still.
  await page.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(page);
  await sleep(1500);
  const cP = await center(page, '.jx');
  await page.mouse.move(cP.x - 3, cP.y + 2, { steps: 3 });
  await sleep(500);
  const plusHot = await page.evaluate(() => {
    const p = document.querySelector('.jx');
    return {
      band: !!p.querySelector('[data-band]'),
      hot: p.hasAttribute('data-hot'),
      magnet: p.style.transform,
      x: getComputedStyle(p.querySelector('.jx-x')).visibility,
      label: p.getAttribute('aria-label'),
      href: p.getAttribute('href'),
      pigment: getComputedStyle(p).getPropertyValue('--jb-rgb').trim(),
      hl: getComputedStyle(p).getPropertyValue('--jb-h').trim(),
    };
  });
  ok(!plusHot.band && !plusHot.hot && !plusHot.magnet && plusHot.x === 'visible' && plusHot.label === 'back to home' && plusHot.href === '/', 'the back button is the link home: on hover no band and no magnet, JellyBox answers', JSON.stringify(plusHot));
  ok(plusHot.pigment && plusHot.pigment === plusHot.hl, 'on hover it takes JellyBox’s highlighted pigment', JSON.stringify(plusHot));

  // Forty hovers in a row: the band color changes every time, its label always
  // reads, and neither accent row ever matches the band under it.
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+/g).slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const inkL = lum('rgb(26, 24, 32)');
  const draws = [];
  for (let i = 0; i < 40; i++) {
    const c = await center(page, 'a.row', i % 3);
    // One jump, so the cursor crosses no other row on the way and this is
    // the only hover between two readings. Both strips are in by 100ms.
    await page.mouse.move(c.x, c.y);
    await sleep(130);
    draws.push(
      await page.evaluate(() => {
        const a = document.querySelector('a.row[data-hot]');
        const d = Array.from(a?.querySelectorAll('[data-band] > :is(.bm, .st)') ?? [])
          .slice(0, 3)
          .map((l) => l.style.backgroundColor);
        // a menu row's top strip is left out one hover in four
        d.menu = !!a?.hasAttribute('data-hue');
        return { d, menu: d.menu };
      }),
    );
    draws[draws.length - 1] = Object.assign(draws[draws.length - 1].d, { menu: draws[draws.length - 1].menu });
    await page.mouse.move(1430, 980);
    await sleep(260);
  }
  const mains = draws.map((d) => d[0]);
  const floor = Math.min(...mains.map((m) => (lum(m) + 0.05) / (inkL + 0.05)));
  ok(draws.every((d) => (d.length === 3 || (d.menu && d.length === 2)) && d.every(Boolean)), 'every hover paints a band and both rows (a menu row now and then only the lower one)', JSON.stringify(draws.filter((d) => !((d.length === 3 || (d.menu && d.length === 2)) && d.every(Boolean)))));
  ok(mains.every((m, i) => i === 0 || m !== mains[i - 1]), 'the band color never repeats back to back');
  ok(new Set(mains).size >= 12, 'forty hovers show a wide spread of band colors', `${new Set(mains).size} distinct`);
  ok(floor >= 5, 'band ink holds 5:1 on every band color', floor.toFixed(2));
  ok(draws.every((d) => d[1] !== d[0] && d[2] !== d[0]), 'neither accent row matches its band');

  // The address is the detail of the "+email" row, in "say hi".
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await settle(page);
  const mail = await page.evaluate(() => {
    const a = document.querySelector('#say-hi a[href^="mailto:"]');
    return { href: a?.getAttribute('href'), label: a?.querySelector('[data-word]').textContent, detail: a?.querySelector('.l').textContent };
  });
  ok(mail.label === '+email' && mail.detail === 'chrisrobinfiore@gmail.com' && mail.href === `mailto:${mail.detail}`, 'the address waits in "say hi" on the about page', JSON.stringify(mail));
  const jump = await page.evaluate(() => document.querySelector('.hd .fig')?.getAttribute('href'));
  ok(jump === '#say-hi', 'the masthead’s "say hi" chip jumps to that block', String(jump));

  /* -------------------------------------------------- seams and skeleton */
  console.log('\n[seams]');
  await page.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await settle(page);
  const units = await page.evaluate(() => ({
    all: document.querySelectorAll('[data-unit]').length,
    grid: document.querySelectorAll('.row [data-unit], .sec [data-unit], .hd [data-unit], .name [data-unit]').length,
  }));
  ok(units.all > 500, 'prose is split into word units', String(units.all));
  ok(units.grid === 0, 'rows, chips and the masthead stay on the grid: none of their words part', String(units.grid));
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

  // Off every line of text: the full state collapses.
  await page.mouse.move(1430, gapPt.y + 400, { steps: 8 });
  await sleep(600);
  const off = await page.evaluate(() => ({
    skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
    moved: Array.from(document.querySelectorAll('[data-unit], [data-btn]')).filter((u) => u.style.translate).length,
  }));
  ok(off.skel === 0 && off.moved === 0, 'leaving the text collapses the skeleton and closes every seam', JSON.stringify(off));

  // Onto a link in a sentence: it claims space both sides and measures itself at once.
  const IN = '#the-work .btn.in';
  await page.goto(`${BASE}/product-designs/chellbook/`, { waitUntil: 'networkidle' });
  await settle(page);
  const cb = await center(page, IN);
  await page.mouse.move(cb.x - 60, cb.y, { steps: 2 });
  await page.mouse.move(cb.x, cb.y, { steps: 4 });
  await sleep(450);
  const boxState = await page.evaluate((sel) => {
    const b = document.querySelector(sel);
    const prev = (b.closest('.glue') ?? b).previousElementSibling;
    return {
      prev: prev?.style.translate ?? '',
      magnet: b.style.transform,
      label: document.querySelector('[data-skeleton]').textContent,
      skel: +getComputedStyle(document.querySelector('[data-skeleton]')).opacity,
    };
  }, IN);
  ok(/^-/.test(boxState.prev), 'a hovered link in a sentence pushes its left neighbor away', boxState.prev);
  ok(boxState.skel === 1 && /×.*pad/.test(boxState.label), 'and shows W × H · pad at once', boxState.label.slice(0, 60));

  // Back/forward cache: the page comes back exactly as it was left, mid-hover.
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
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  ok(bareState.seams && bareState.units > 0, 'with every font blocked, the runtime still starts', JSON.stringify(bareState));
  ok(bareState.overflow === 0, 'and the fallback mono does not push the page sideways', String(bareState.overflow));
  // The morph measures its cell from whatever face is really there.
  await bp.addInitScript(watchArrival);
  await bp.evaluate(() => document.querySelector('nav a[href="/paintings/"]').scrollIntoView({ block: 'center' }));
  await bp.locator('nav a[href="/paintings/"]').click();
  await bp.waitForURL('**/paintings/');
  await sleep(1600);
  const bareEnd = await bp.evaluate(uncovered);
  ok(isOpen(bareEnd), 'and a page change still plays and ends uncovered', JSON.stringify(bareEnd));
  ok(bareErrors.length === 0, 'and throws nothing', bareErrors.join(' | '));
  await bare.close();

  /* ----------------------------------------------------------- one screen */
  console.log('\n[home fits one screen]');
  // Browser-visible sizes of common screens: laptops and desktops with their
  // tabs and toolbars, a portrait tablet, and phones with Safari's bars
  // showing. Two sizes are left to scroll, and say so in the README: a phone
  // on its side, and a 320 x 480 screen.
  const SCREENS = [
    [1920, 970], [1536, 730], [1440, 789], [1366, 650], [1280, 690], [1024, 660],
    [768, 930, true], [430, 832, true], [390, 664, true], [375, 553, true], [360, 640, true],
  ];
  const overflow = [];
  for (const [w, h, touch] of SCREENS) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!touch, hasTouch: !!touch });
    const pg = await c.newPage();
    await pg.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    const m = await pg.evaluate(() => ({
      over: document.documentElement.scrollHeight - innerHeight,
      overX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sigBottom: document.querySelector('.sig').getBoundingClientRect().bottom,
    }));
    if (m.over > 0 || m.overX > 0 || m.sigBottom > h) overflow.push(`${w}x${h} over ${m.over}`);
    await c.close();
  }
  ok(overflow.length === 0, `home fits one screen, signature and all, on all ${SCREENS.length} screen sizes`, overflow.join(' | '));

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

  // On load, with no scroll at all, it writes itself in, and the finished
  // signature never shows first. Then it hands back exactly the served markup.
  const sp = await browser.newPage({ viewport: { width: 1440, height: 789 } });
  await sp.addInitScript(() => {
    window.__frames = [];
    const tick = () => {
      const ink = document.querySelector('.sig-ink');
      if (ink) {
        const cs = getComputedStyle(ink);
        window.__frames.push({
          t: Math.round(performance.now()),
          shown: cs.display !== 'none' && cs.visibility !== 'hidden',
          anim: !!document.querySelector('.sig-anim'),
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await sp.goto(`${BASE}/`, { waitUntil: 'load' });
  await sleep(2600);
  const frames = await sp.evaluate(() => window.__frames);
  const firstAnim = frames.findIndex((f) => f.anim);
  const flashed = frames.slice(0, firstAnim < 0 ? frames.length : firstAnim).filter((f) => f.shown).length;
  ok(firstAnim >= 0 && frames[firstAnim].t < 1500, 'on load, with no scroll, it writes itself in', firstAnim >= 0 ? `from ${frames[firstAnim].t}ms` : 'never');
  ok(flashed === 0, 'and the finished signature never shows before it is written', `${flashed} frames`);
  ok(
    frames.length > 0 && frames[frames.length - 1].shown && !frames[frames.length - 1].anim,
    'it ends written and at rest',
  );
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

  // Reduced motion switched on after the claim but before it plays: it is
  // handed back and never erased and written in afterwards. The home page fits
  // any real screen, so the one way to hold it claimed and waiting is a window
  // too short for the page (150px), where it sits below the fold.
  const flipCtx = await browser.newContext({ viewport: { width: 1440, height: 150 } });
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
  await cp.goto(`${BASE}/product-designs/chellbook/`, { waitUntil: 'networkidle' });
  await settle(cp);
  const cc = await center(cp, '#the-work .btn.in', 0);
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
  // A lineage effect never plays under reduced motion, even forced.
  await cp.waitForFunction(() => !!window.__lin, null, { timeout: 5000 });
  await cp.evaluate(() => window.__lin.force('decode'));
  const rc = await center(cp, '#the-work .btn.in', 1);
  await cp.mouse.move(rc.x, rc.y, { steps: 2 });
  await sleep(600);
  const rmFx = await cp.evaluate(() => {
    const b = document.querySelector('[data-hot]');
    const spans = Array.from(b.querySelectorAll('[data-glitch] > span')).filter((s) => s.textContent.trim());
    return { alt: spans.length > 0 && spans.every((s) => s.style.fontFamily.includes('Dessign Maison')), extra: b.querySelectorAll('[data-k="x"], [data-k="n"]').length, credit: !!document.querySelector('.lin-credit') };
  });
  await cp.evaluate(() => window.__lin.force(null));
  ok(rmFx.alt && rmFx.extra === 0 && !rmFx.credit, 'no lineage effect is ever dealt under reduced motion, even forced', JSON.stringify(rmFx));
  ok(!rm.transform && rm.moved === 0, 'no magnet, no seam movement', JSON.stringify(rm));
  ok(rm.skel === 1, 'the measurements still appear');

  // No film: a link is a plain link, and the next page is never covered.
  await cp.addInitScript(watchArrival);
  await cp.evaluate(() => {
    window.__sawMorph = false;
    new MutationObserver(() => {
      if (document.querySelector('.morph') || document.documentElement.hasAttribute('data-morph')) window.__sawMorph = true;
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    window.__t0 = performance.now();
    document.querySelector('nav a[href="/about/"]').scrollIntoView({ block: 'center' });
  });
  const tCalm = Date.now();
  await cp.locator('nav a[href="/about/"]').click();
  await cp.waitForURL('**/about/');
  const calmNav = Date.now() - tCalm;
  await sleep(500);
  const calmArrive = await cp.evaluate(() => window.__arrive);
  ok(calmNav < 350 && calmArrive.every((f) => !f.gate && !f.overlay && !f.hidden && !f.state), 'a page change is a plain link: no cover, no film, no wait', `${calmNav}ms, ${calmArrive.filter((f) => f.gate || f.overlay || f.hidden).length} covered frames`);
  ok(await cp.evaluate(() => sessionStorage.getItem('ps-morph') === null), 'and it leaves no note behind');

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
    return { name: a.getAttribute('aria-label'), jx: a.matches('.jx'), band: !!a.querySelector('[data-band]'), pigment: cs.getPropertyValue('--jb-rgb').trim() === cs.getPropertyValue('--jb-h').trim(), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` };
  });
  ok(f1.name === 'back to home' && f1.jx && !f1.band && f1.pigment, 'Tab lands on the back button: JellyBox’s highlighted pigment, no band', JSON.stringify(f1));
  ok(f1.outline === 'solid 2px rgb(18, 20, 27)', 'focus ring: 2px ink', f1.outline);
  await kp.keyboard.press('Tab');
  // Nothing animates for the keyboard: the band and the alternate face are there in the same frame.
  await sleep(30);
  const f2 = await kp.evaluate(() => {
    const a = document.activeElement;
    const spans = Array.from(a.querySelectorAll('[data-glitch] > span')).filter((s) => s.textContent.trim());
    const bm = a.querySelector('[data-band] .bm');
    return { hot: document.querySelectorAll('[data-hot]').length, on: a.querySelector('[data-word]')?.firstChild.nodeValue, all: spans.length > 0 && spans.every((s) => (s.getAttribute('style') ?? '').includes('Dessign')), full: /^inset\(0%( 0%){0,3}\)$/.test(bm?.style.clipPath ?? '') };
  });
  ok(f2.hot === 1 && f2.on === '+metadump' && f2.all && f2.full, 'moving focus moves the band to the first row, whole at once: nothing animates for the keyboard', JSON.stringify(f2));
  // Enter on a link to another page plays the film like a click does.
  await kp.addInitScript(watchArrival);
  await kp.keyboard.press('Shift+Tab');
  await kp.keyboard.press('Enter');
  await kp.waitForURL(`${BASE}/`);
  await kp.waitForFunction(() => window.__arrive && window.__arrive.length > 2 && !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'));
  const kArrive = await kp.evaluate(() => ({ dir: window.__psMorphIn, film: window.__arrive.some((f) => f.state === 'reveal') }));
  ok(kArrive.dir === 'home' && kArrive.film, 'Enter on the "+" plays the film home', JSON.stringify(kArrive));
  await kb.close();

  /* ------------------------------------------------------------ the morph */
  console.log('\n[morph]');
  const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // the deck held still: these judge the glitch and the film themselves
  await mctx.addInitScript(() => (window.__linQuiet = true));
  const mp = await mctx.newPage();
  const mErrors = [];
  mp.on('pageerror', (e) => mErrors.push(String(e)));
  await mp.addInitScript(watchArrival);

  const judge = (f, label, dir) => {
    const a = f.arrive;
    const firstFilm = a.findIndex((x) => x.overlay);
    const lastFilm = a.length - 1 - [...a].reverse().findIndex((x) => x.overlay);
    ok(f.src && f.src.seen.join() === 'cover,covered', `${label}: the page being left covers itself, then goes`, JSON.stringify(f.src?.seen));
    ok(f.src && f.src.aria === 'true' && f.src.pe === 'none' && f.src.focusable === 0, `${label}: the overlay is aria-hidden, takes no clicks, holds nothing focusable`, JSON.stringify(f.src));
    ok(f.src && f.src.full && f.src.ink === '+', `${label}: at full cover the window is the ground and the page’s own anchor mark, edge to edge`, JSON.stringify({ full: f.src?.full, ink: f.src?.ink?.slice(0, 20) }));
    ok(f.dir === dir, `${label}: the note says which way the film runs (${dir})`, String(f.dir));
    ok(f.gated && (a[0].gate || a[0].overlay), `${label}: the page being opened starts covered, before first paint`, JSON.stringify(a[0]));
    ok(firstFilm >= 0 && a.slice(0, firstFilm).every((x) => x.gate && x.hidden), `${label}: it is never seen uncovered before the reveal starts`, `film from frame ${firstFilm}`);
    ok(a.slice(firstFilm, lastFilm + 1).every((x) => x.overlay && x.state === 'reveal' && !x.hidden), `${label}: the reveal plays over the real page`, `${lastFilm - firstFilm + 1} frames`);
    ok(isOpen(f.end), `${label}: it ends uncovered, with nothing left behind`, JSON.stringify(f.end));
    ok(f.total < 1500, `${label}: under 1.5s across the two pages`, `${f.total}ms`);
    // Frame pacing of the reveal, as the page itself saw it.
    const gaps = a.slice(firstFilm + 1, lastFilm + 1).map((x, i) => x.t - a[firstFilm + i].t).sort((p, q) => p - q);
    const median = gaps[gaps.length >> 1] ?? 0;
    ok(median <= 18 && gaps[gaps.length - 1] <= 50, `${label}: the reveal holds 60fps (median frame ${median}ms, longest ${gaps[gaps.length - 1]}ms)`);
  };
  judge(await film(mp, { from: '/', to: '/product-designs/' }), 'home to product designs', 'out');
  judge(await film(mp, { from: '/product-designs/', to: '/product-designs/chellbook/' }, 300), 'index to a case study', 'out');
  judge(await film(mp, { from: '/paintings/', to: '/about/' }, 300), 'page to page, from the pages block', 'out');
  judge(await film(mp, { from: '/about/', to: '/' }, 300), 'going home', 'home');

  // The signature waits for the reveal, then writes itself in.
  const sigAfter = await mp.evaluate(() => ({ wait: document.documentElement.classList.contains('sig-wait') || !!document.querySelector('.sig-anim') || document.querySelector('[data-sig]').getAttribute('data-sig') === 'waiting' }));
  await sleep(2600);
  const sigDone = await mp.evaluate(() => ({ kids: document.querySelector('.sig').children.length, shown: getComputedStyle(document.querySelector('.sig-ink')).visibility !== 'hidden' && getComputedStyle(document.querySelector('.sig-ink')).display !== 'none' }));
  ok(sigAfter.wait && sigDone.kids === 1 && sigDone.shown, 'arriving home by the film, the signature is written in after the reveal', JSON.stringify([sigAfter, sigDone]));

  // The film is measured from the real "+" and the real type.
  await mp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(mp);
  const geo = async () =>
    mp.evaluate(() => {
      window.__morph.seek('cover', 'out', 0.35);
      // the back button's box is the whole gutter; its pin is where home's "+" is
      const box = document.querySelector('[data-anchor]').getBoundingClientRect();
      const plus = (document.querySelector('[data-anchor] .jx-pin') ?? document.querySelector('[data-anchor]')).getBoundingClientRect();
      const o = document.querySelector('.morph');
      const set = o.querySelector('.set.l');
      const sr = set.getBoundingClientRect();
      const lines = Array.from(set.querySelectorAll('.ln'));
      // the anchor cell holds the page's own mark: the "+", on home and in the back button's box
      const mark = document.querySelector('[data-anchor]').dataset.glyph || '+';
      const ghost = o.querySelector('.jx-ghost')?.getBoundingClientRect();
      const row = lines.findIndex((l) => l.textContent.trimStart().startsWith(mark));
      const ln = lines[row];
      const col = ln.textContent.indexOf(mark);
      const cw = ln.getBoundingClientRect().width / ln.textContent.length;
      const ch = ln.getBoundingClientRect().height;
      // how far each row's strip reaches, against a circle around the "+"
      const cx = plus.left + plus.width / 2;
      const cy = plus.top + plus.height / 2;
      const radii = lines.filter((l) => l.textContent.length).map((l) => { const b = l.getBoundingClientRect(); return Math.hypot(b.right - cx, b.top + b.height / 2 - cy); });
      const glyphs = new Set(lines.map((l) => l.textContent).join('').replace(/ /g, ''));
      if (mark !== '+') glyphs.delete(mark);
      const body = getComputedStyle(document.body);
      const lnTop = ln.getBoundingClientRect().top;
      // the ghost's own "+" on the pin, read before the film is cleared
      const ghostPlus = (() => {
        const g = o.querySelector('.jx-ghost');
        if (!g) return null;
        const r = document.createRange();
        r.selectNodeContents(g);
        const b = r.getBoundingClientRect();
        return b.left + b.width / 2 - cx;
      })();
      window.__morph.clear();
      return {
        // the anchor cell's centre on the anchor's centre (the back button's box is wider than one cell)
        dx: sr.left + col * cw + cw / 2 - cx,
        dy: lnTop + ch / 2 - cy,
        ghost: ghost ? [Math.round(ghost.left - box.left), Math.round(ghost.top - box.top), Math.round(ghost.width - box.width), Math.round(ghost.height - box.height)] : null,
        ghostPlus,
        cw,
        half: parseFloat(body.fontSize) / 2,
        ch,
        lh: parseFloat(getComputedStyle(document.querySelector('[data-anchor]')).lineHeight),
        spread: Math.max(...radii) - Math.min(...radii),
        glyphs: [...glyphs].sort().join(''),
        mark,
        top: sr.top,
        hd: document.querySelector('.hd').getBoundingClientRect().top,
        left: !!document.querySelector('.morph'),
      };
    });
  const g0 = await geo();
  ok(Math.abs(g0.dx) <= 1 && Math.abs(g0.dy) <= 1, 'the grid is placed so the page’s own "+" is exactly one cell', JSON.stringify([g0.dx, g0.dy]));
  ok(Math.abs(g0.cw - g0.half) < 0.05 && Math.abs(g0.ch - g0.lh) <= 0.5, 'the cell is the type’s own: half an em wide, one line tall', JSON.stringify([g0.cw, g0.half, g0.ch, g0.lh]));
  ok(g0.spread <= 2 * g0.cw + 1, 'the cover front is a circle around the "+"', g0.spread.toFixed(1));
  ok(g0.glyphs === '+-.:=', 'the film is five ASCII marks: + = - : .', g0.glyphs);
  ok(g0.mark === '+', 'in the back button’s box the film draws a "+": an X is a "+" turned 45 degrees', g0.mark);
  ok(JSON.stringify(g0.ghost) === '[0,0,0,0]', 'a ghost of the box sits on the film exactly over the real one, so its rules are never covered', JSON.stringify(g0.ghost));
  ok(g0.ghostPlus != null && Math.abs(g0.ghostPlus) <= 1, 'and the ghost’s "+" sits on the pin, where home’s "+" is', String(g0.ghostPlus));
  ok(!g0.left, 'clearing the film leaves nothing behind');
  await mp.evaluate(() => window.scrollTo(0, 1800));
  await sleep(150);
  const g1 = await geo();
  ok(Math.abs(g1.dx) <= 1 && Math.abs(g1.dy) <= 1 && g1.top < 20, 'scrolled down, it radiates from the "+" where it now sits, at the top of the window', JSON.stringify([g1.dx, g1.dy, g1.top]));

  // What is not a page change is left alone.
  await mp.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await settle(mp);
  const left = await mp.evaluate(() => {
    const out = {};
    const probe = (name, sel, init = {}) => {
      const a = document.querySelector(sel);
      let prevented = null;
      const spy = (e) => {
        prevented = e.defaultPrevented;
        e.preventDefault();
      };
      window.addEventListener('click', spy, { once: true });
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
      out[name] = prevented;
    };
    probe('cmd', 'nav a[href="/paintings/"]', { metaKey: true });
    probe('ctrl', 'nav a[href="/paintings/"]', { ctrlKey: true });
    probe('shift', 'nav a[href="/paintings/"]', { shiftKey: true });
    probe('middle', 'nav a[href="/paintings/"]', { button: 1 });
    probe('pdf', 'a[href$="Resume.pdf"]');
    probe('newTab', 'a[target="_blank"][href^="https://"]');
    probe('mailto', 'a[href^="mailto:"]');
    probe('jump', '.hd .fig');
    out.film = !!document.querySelector('.morph') || document.documentElement.hasAttribute('data-morph');
    return out;
  });
  ok(Object.entries(left).every(([, v]) => v === false), 'modifier clicks, new tabs, the PDF, the address and a jump down the page are never filmed', JSON.stringify(left));

  // The script never arrives on the page being opened: the gate uncovers it by itself.
  let noScript = false;
  await mctx.route(/\/assets\/.*\.js$/, (route) => (noScript ? route.abort() : route.continue()));
  await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(300);
  noScript = true;
  await mp.locator('a[href="/paintings/"]').click();
  await mp.waitForURL('**/paintings/');
  await mp.waitForFunction(() => window.__arrive && window.__arrive.length > 2);
  const stuckT0 = Date.now();
  await mp.waitForFunction(() => !document.documentElement.classList.contains('morph-in'), null, { timeout: 4000 }).catch(() => {});
  const lone = await mp.evaluate(() => ({ arrive: window.__arrive, end: null }));
  lone.end = await mp.evaluate(uncovered);
  const shownAt = lone.arrive.find((f) => !f.gate)?.t;
  ok(lone.arrive[0].gate && lone.arrive[0].hidden && isOpen(lone.end) && shownAt > 900 && shownAt < 1700, 'no script on the page being opened: it uncovers itself at 1.2s', `shown at ${shownAt}ms (${Date.now() - stuckT0}ms waited)`);
  noScript = false;
  await mctx.unroute(/\/assets\/.*\.js$/);

  // The browser never leaves (here the navigation is cancelled): the cover
  // holds, then the page gives itself back.
  await mp.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await settle(mp);
  await mp.evaluate(() => {
    navigation.addEventListener('navigate', (e) => e.preventDefault());
    document.querySelector('nav a[href="/paintings/"]').scrollIntoView({ block: 'center' });
  });
  await mp.locator('nav a[href="/paintings/"]').click({ noWaitAfter: true });
  await sleep(1200);
  const held = await mp.evaluate(uncovered);
  await sleep(2700);
  const back = await mp.evaluate(uncovered);
  ok(held.attr === 'covered' && held.overlay && isOpen(back) && mp.url().endsWith('/about/'), 'a navigation that never happens: the cover holds, then the page gives itself back at 3s', JSON.stringify([held, back]));
  await mp.evaluate(() => sessionStorage.removeItem('ps-morph'));

  // A stale or misaddressed note is ignored.
  await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  for (const [label, note] of [
    ['stale', { t: Date.now() - 60000, dir: 'out', to: '/about/' }],
    ['for another page', { t: Date.now() + 2000, dir: 'out', to: '/paintings/' }],
    ['not a note', 'x'],
  ]) {
    await mp.evaluate((n) => sessionStorage.setItem('ps-morph', typeof n === 'string' ? n : JSON.stringify(n)), note);
    await mp.goto(`${BASE}/about/`, { waitUntil: 'load' });
    const a = await mp.evaluate(() => ({ arrive: window.__arrive, note: sessionStorage.getItem('ps-morph') }));
    ok(a.arrive.every((f) => !f.gate && !f.hidden) && a.note === null, `a note that is ${label} covers nothing, and is thrown away`);
  }
  // A reload of a page that was opened by the film is not covered again.
  await mp.evaluate(() => sessionStorage.setItem('ps-morph', JSON.stringify({ t: Date.now(), dir: 'out', to: '/about/' })));
  await mp.reload({ waitUntil: 'load' });
  const reloaded = await mp.evaluate(() => window.__arrive);
  ok(reloaded.every((f) => !f.gate && !f.hidden), 'a reload is never covered');
  ok(mErrors.length === 0, 'the film throws nothing', mErrors.join(' | '));
  await mctx.close();

  // Scripts off: every page is fully there, and every link is a plain link.
  const noJsCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const nj = await noJsCtx.newPage();
  const closed = [];
  for (const r of [...ROUTES, '/404.html']) {
    await nj.goto(BASE + r, { waitUntil: 'load' });
    const vis = await nj.locator('main').evaluate((main) => {
      // the back button's mono "+" is only its entrance and leaving cell; with scripts off the X shows
      const hidden = Array.from(document.querySelectorAll('.page *')).filter((e) => getComputedStyle(e).visibility === 'hidden' && !e.closest('.sr-only') && !e.matches('.jx-plus')).length;
      return { hidden, words: main.innerText.trim().length, cls: document.documentElement.className, overlay: !!document.querySelector('.morph') };
    });
    if (vis.hidden || vis.words < 20 || vis.cls || vis.overlay) closed.push(`${r} ${JSON.stringify(vis)}`);
  }
  ok(closed.length === 0, 'with scripts off, every page is fully visible: nothing hidden, nothing covering', closed.join(' | '));
  await nj.goto(`${BASE}/`, { waitUntil: 'load' });
  await nj.locator('a[href="/about/"]').click();
  await nj.waitForURL('**/about/');
  ok((await nj.locator('h1').innerText()) === 'about me/contact', 'with scripts off, links still go where they say');
  await noJsCtx.close();

  /* ------------------------------------------------------ back / forward */
  /* ------------------------------------------------ round 3: the glitch on drawings */
  {
  console.log('\n[glitch on drawings]');
  const gctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await gctx.addInitScript(() => (window.__linQuiet = true));
  const gp = await gctx.newPage();
  await gp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(gp);
  // Every frame of a hover, from the page's own clock, from the frame its band appears.
  const watchHover = (i) =>
    gp.evaluate((idx) => {
      window.__hf = [];
      const a = document.querySelectorAll('a.row')[idx];
      const t0 = performance.now();
      let entered = -1;
      const tick = () => {
        const bm = a.querySelector('[data-band] .bm');
        if (bm && entered < 0) entered = performance.now();
        if (entered >= 0) {
          const spans = Array.from(a.querySelectorAll('[data-glitch] > span'));
          window.__hf.push({
            t: Math.round(performance.now() - entered),
            clip: bm ? bm.style.clipPath : null,
            st: a.querySelectorAll('[data-band] .st').length,
            alt: spans.map((s, k) => ((s.getAttribute('style') || '').includes('Dessign') ? k : -1)).filter((k) => k >= 0),
            n: spans.filter((s) => s.textContent.trim()).length,
            hot: a.hasAttribute('data-hot'),
            band: !!a.querySelector('[data-band]'),
            ov: !!a.querySelector('[data-glitch]'),
          });
        }
        if (performance.now() - t0 < 1400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, i);
  const r3 = await center(gp, 'a.row', 3);
  await gp.mouse.move(r3.box.x - 12, r3.y);
  await sleep(300);
  await watchHover(3);
  await gp.mouse.move(r3.box.x + 6, r3.y);
  await sleep(500);
  await gp.mouse.move(r3.box.x + r3.box.width + 12, r3.y);
  await sleep(500);
  const hf = await gp.evaluate(() => window.__hf);
  const lit = hf.filter((f) => f.hot);
  const after = hf.filter((f) => !f.hot);
  ok(lit[0] && lit[0].clip === 'inset(0% 50% 0% 0%)', 'the band lands half its width in its very first frame, from the edge the pointer crossed', JSON.stringify(lit[0]));
  ok(lit.filter((f) => f.t >= 170).every((f) => FULL.test(f.clip ?? '') && f.st === 2), 'all of it, both strips too, by 150ms', JSON.stringify(lit.find((f) => f.t >= 170 && !(FULL.test(f.clip ?? '') && f.st === 2))));
  ok(lit[0] && lit[0].alt.length > 0 && Math.max(...lit[0].alt) < lit[0].n / 2, 'the letters flip spreading from where the pointer came in', JSON.stringify(lit[0]?.alt));
  ok(lit.filter((f) => f.t >= 210).every((f) => f.alt.length === f.n), 'the glitch has landed by 200ms, whatever the label’s length', JSON.stringify(lit.find((f) => f.t >= 210)));
  ok(after.length > 0 && !after[0].ov && after.filter((f) => f.t - after[0].t >= 120).every((f) => !f.band), 'leaving: the overlay goes in the same frame, the band in one drawing', JSON.stringify(after.slice(0, 3)));
  // A sweep: straight from one row to the next within 150ms gets the glitch in two drawings.
  await gp.evaluate(() => document.querySelectorAll('a.row')[3].scrollIntoView({ block: 'center' }));
  await sleep(150);
  const [s3, s4] = await gp.evaluate(() => [3, 4].map((i) => { const r = document.querySelectorAll('a.row')[i].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  await gp.mouse.move(s3.x, s3.y);
  await sleep(300);
  await watchHover(4);
  await gp.mouse.move(s4.x, s4.y);
  await sleep(300);
  const warm = await gp.evaluate(() => window.__hf.filter((f) => f.hot));
  ok(warm[0] && /\b30%/.test(warm[0].clip) && warm[0].st === 2 && warm.filter((f) => f.t >= 90).every((f) => FULL.test(f.clip ?? '')), 'sweeping: the next row gets the glitch in two drawings, 70% then all of it, strips at once', JSON.stringify(warm.slice(0, 4)));
  ok(warm.filter((f) => f.t >= 110).every((f) => f.alt.length === f.n), 'and it has landed by 100ms', JSON.stringify(warm.find((f) => f.t >= 110)));
  await gp.mouse.move(1430, 980);
  await gctx.close();

  }
  /* ------------------------------------------------------------- round 3: lineage */
  {
  console.log('\n[lineage]');
  const lctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const lp = await lctx.newPage();
  const chunks = [];
  lp.on('request', (q) => {
    const m = q.url().match(/assets\/(lineage|jx|jellyx)-/);
    if (m) chunks.push(m[1]);
  });
  await lp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(lp);
  await lp.waitForFunction(() => !!window.__lin, null, { timeout: 5000 });
  ok(chunks.includes('lineage') && !chunks.includes('jellyx'), 'home loads the lineage chunk once it is seen, and never JellyBox’s optics: home has no X', chunks.join(' '));
  const homeJelly = await lp.evaluate(() => !!document.querySelector('canvas'));
  ok(!homeJelly, 'so no canvas on home, and Jelly is never dealt there');
  const deck = await lp.evaluate(() => window.__lin.state().deck.slice().sort().join(' '));
  ok(deck === 'bayer canister decode decode jelly jelly knockout knockout mark mark mark shear', 'the deck: twelve cards, quiet ones most', deck);
  await lp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(lp);
  await lp.waitForFunction(() => !!window.__lin, null, { timeout: 5000 });
  const own = await lp.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('a.row[data-lin]')).map((a) => [a.querySelector('[data-word]').textContent, a.dataset.lin])));
  ok(
    JSON.stringify(Object.entries(own).sort()) === JSON.stringify(Object.entries({ '+scream canister controls': 'canister', '+jellybox': 'jelly', '+after tokens': 'decode', '+lee': 'mark', '+mfny concentrates': 'shear', '+dither': 'bayer', '+motion archive': 'knockout' }).sort()),
    'each project’s own row carries its own effect',
    JSON.stringify(own),
  );
  const fxView = (sel, nth = 0) =>
    lp.evaluate(([s, n]) => {
      const a = document.querySelectorAll(s)[n];
      if (!a.querySelector('[data-band]')) return { band: 0, x: 0, bay: 0, line: 0, kc: false, jelly: false, rested: true, host: null, credit: null, cold: true };
      return {
        band: a.querySelectorAll('[data-band] [data-k="band"]').length,
        x: a.querySelectorAll('[data-band] [data-k="x"]').length,
        bay: a.querySelectorAll('[data-band] .bay').length,
        line: a.querySelectorAll('[data-band] [data-k="n"]').length,
        kc: !!a.querySelector('[data-k="kc"]'),
        jelly: !!a.querySelector('.jx-row, [data-k="jc"]'),
        rested: a.querySelector('[data-word]').style.color === '',
        host: a.querySelector('[data-band]').style.transform,
        credit: document.querySelector('.lin-credit') ? [document.querySelector('.lin-credit').textContent, document.querySelector('.lin-credit').style.opacity] : null,
      };
    }, [sel, nth]);
  // A project's own row always plays its own effect, with no credit: the row says where it came from.
  const lee = await center(lp, 'a.row[data-lin="mark"]');
  await lp.mouse.move(lee.x, lee.y, { steps: 2 });
  await sleep(700);
  const leeV = await fxView('a.row[data-lin="mark"]');
  ok(leeV.rested && leeV.line === 1 && leeV.band === 1 && !leeV.credit, 'the +lee row plays Mark: the band shrinks into a quiet mark, then it is underlined, with no credit', JSON.stringify(leeV));
  await lp.mouse.move(1430, 980);
  await sleep(1700);
  // Jelly on a row is the row's own surface: a slab 3px inside every edge, under the name, the tag and the detail.
  await lp.waitForFunction(() => !!document.querySelector('a.jx canvas'), null, { timeout: 8000 });
  const jrow = 'a.row[data-lin="jelly"]';
  const jc = await center(lp, jrow);
  const jb4 = await lp.evaluate(layout);
  await lp.mouse.move(jc.x, jc.y, { steps: 2 });
  await sleep(900);
  const slab = await lp.evaluate((s) => {
    const a = document.querySelector(s);
    const r = a.getBoundingClientRect();
    const j = window.__jx.jelly();
    const box = (el) => { const b = el.getBoundingClientRect(); return [b.left - r.left, b.top - r.top, b.right - r.left, b.bottom - r.top]; };
    // its centre on the slab (the tag's rule may sit a pixel into the slab's 3px margin)
    const inside = (b) => j && (b[0] + b[2]) / 2 > j.x && (b[0] + b[2]) / 2 < j.x + j.w && (b[1] + b[3]) / 2 > j.y && (b[1] + b[3]) / 2 < j.y + j.h;
    return { j, bw: a.offsetWidth, bh: a.offsetHeight, fs: parseFloat(getComputedStyle(a).fontSize), canvas: !!a.querySelector('canvas.jx-row'), tag: inside(box(a.querySelector('.cs span'))), detail: inside(box(a.querySelector('.l'))), reads: window.__jx.reads() };
  }, jrow);
  const jduring = await lp.evaluate(layout);
  ok(slab.j && slab.canvas && slab.j.x === 3 && slab.j.y === 3 && Math.abs(slab.j.w - (slab.bw - 6)) < 0.5 && Math.abs(slab.j.h - (slab.bh - 6)) < 0.5 && Math.abs(slab.j.r - slab.j.h / 2) < 0.05, 'the +jellybox row plays Jelly as one of JellyBox’s round-ended controls, the row minus 3px on every side, in JellyBox’s own optics', JSON.stringify(slab.j));
  ok(slab.tag && slab.detail && JSON.stringify(jb4) === JSON.stringify(jduring), 'the tag box and the detail lie on the slab, and nothing moves', JSON.stringify([slab.tag, slab.detail]));
  ok(slab.reads.includes(slab.j.pig) && !slab.reads.includes('#136aee') && !slab.reads.includes('#dd3c88'), 'its colour is a JellyBox pigment that holds band ink at 4.5:1 (never lagoon blue or candy pink)', `${slab.j.pig} of ${slab.reads.join(' ')}`);
  await lp.mouse.move(jc.x, jc.y - 400, { steps: 1 });
  await sleep(25);
  const jleave = await lp.evaluate((s) => { const a = document.querySelector(s); return { cast: !!a.querySelector('.jx-row, [data-k="jc"]'), band: a.querySelectorAll('[data-band] [data-k="band"]').length, clip: a.querySelector('[data-band] .bm')?.style.clipPath ?? '' }; }, jrow);
  await sleep(140);
  const jgone = await lp.evaluate((s) => !!document.querySelector(s).querySelector('[data-band], .jx-row, [data-k="jc"]'), jrow);
  ok(!jleave.cast && jleave.band === 1 && jleave.clip.endsWith(`round ${(slab.j.h / 2).toFixed(1).replace(/\.0$/, '')}px)`) && !jgone, 'leaving, the jelly and its cast go at once; the flat band holds its shape one drawing, then it is gone', JSON.stringify([jleave, jgone]));
  const menuFits = await lp.evaluate(() => window.__lin.fits('menu').join(' '));
  ok(menuFits === 'decode canister', 'a menu row is never dealt Jelly: its colour has to say which page it opens', menuFits);
  await lp.mouse.move(1430, 980);
  await sleep(1700);
  // Every effect, forced on a plain row: what it adds, that it moves nothing, and that leaving takes it all away.
  const plain = 'a.row:not([data-lin])';
  const expect = {
    canister: (v) => v.band === 3 && /scaleY\(1\)/.test(v.host) && v.x === 0,
    decode: (v) => v.band === 3 && v.x === 0,
    mark: (v) => v.rested && v.line === 1,
    shear: (v) => v.x === 3,
    knockout: (v) => v.x === 1 && v.kc,
    bayer: (v) => v.x === 4 && v.bay === 4,
    jelly: (v) => v.band === 0 && v.jelly,
  };
  for (const fx of Object.keys(expect)) {
    await lp.evaluate((f) => window.__lin.force(f), fx);
    await lp.mouse.move(1430, 980);
    await sleep(1800);
    const c = await center(lp, plain, 1);
    const b4 = await lp.evaluate(layout);
    await lp.mouse.move(c.x, c.y, { steps: 2 });
    await sleep(780);
    const v = await fxView(plain, 1);
    const during = await lp.evaluate(layout);
    ok(expect[fx](v) && v.credit && v.credit[0].startsWith('from ') && +v.credit[1] === 1, `${fx}: dealt after the glitch, it plays and shows its quiet credit`, JSON.stringify(v));
    ok(JSON.stringify(b4) === JSON.stringify(during), `${fx}: no layout box moves`, `${b4.filter((x, k) => x !== during[k]).length} moved`);
    await lp.mouse.move(1430, 980);
    await sleep(160);
    const gone = await lp.evaluate((s) => {
      const a = document.querySelectorAll(s)[1];
      return { band: !!a.querySelector('[data-band]'), extra: a.querySelectorAll('[data-k], .jx-row').length, word: a.querySelector('[data-word]').style.color, hot: a.hasAttribute('data-hot') };
    }, plain);
    ok(!gone.band && gone.extra === 0 && gone.word === '' && !gone.hot, `${fx}: leaving cuts it, and nothing is left behind`, JSON.stringify(gone));
  }
  await lp.evaluate(() => window.__lin.force(null));
  const credit = await lp.evaluate(() => document.querySelector('.lin-credit')?.style.opacity ?? 'gone');
  await sleep(1300);
  const creditLater = await lp.evaluate(() => document.querySelector('.lin-credit')?.style.opacity ?? 'gone');
  ok(credit !== 'gone' && +credit === 1 && creditLater === 'gone', 'the credit holds a moment after the pointer leaves, then steps out', JSON.stringify([credit, creditLater]));
  // The odds. Right after an effect, the next hover is the glitch alone; the
  // same button again within 4s replays what it played.
  await lp.mouse.move(1430, 980);
  await sleep(1700);
  await lp.evaluate(() => window.__lin.force('mark'));
  const c1 = await center(lp, plain, 2);
  await lp.mouse.move(c1.x, c1.y, { steps: 2 });
  await sleep(450);
  const first = await fxView(plain, 2);
  await lp.evaluate(() => window.__lin.force(null));
  const c2 = await center(lp, plain, 3);
  await lp.mouse.move(c2.x, c2.y, { steps: 2 });
  await sleep(450);
  const next = await fxView(plain, 3);
  ok(first.line === 1 && next.line === 0 && next.x === 0 && next.band === 3, 'right after an effect, the next hover is the glitch alone', JSON.stringify([first.line, next]));
  await lp.mouse.move(1430, 980);
  await sleep(1600);
  const c3 = await center(lp, plain, 2);
  await lp.mouse.move(c3.x, c3.y, { steps: 2 });
  await sleep(450);
  const again = await fxView(plain, 2);
  ok(again.line === 1 && again.rested, 'the same button again within 4s replays what it played', JSON.stringify(again));
  await lp.mouse.move(1430, 980);
  await lctx.close();
  // A finger never deals: the chunk is not even fetched on a phone.
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const tpg = await tctx.newPage();
  const tchunks = [];
  tpg.on('request', (q) => {
    const m = q.url().match(/assets\/(lineage|jellyx)-/);
    if (m) tchunks.push(m[1]);
  });
  await tpg.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await sleep(1500);
  ok(tchunks.length === 0, 'on a phone neither the lineage chunk nor JellyBox’s optics is fetched', tchunks.join(' '));
  await tctx.close();

  }
  /* ------------------------------------------------------- round 3: menu hovers */
  {
  console.log('\n[menu hovers]');
  const nctx = await browser.newContext({ viewport: { width: 1728, height: 908 } });
  await nctx.addInitScript(() => (window.__linQuiet = true));
  const np = await nctx.newPage();
  await np.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(np);
  await np.evaluate(() => window.__ink.seed(7));
  const rows = await np.evaluate(() => [...document.querySelectorAll('.menu a')].map((a) => { const r = a.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }));
  const read = () =>
    np.evaluate(() => {
      const a = document.querySelectorAll('.menu a')[1];
      const band = a.querySelector('[data-band]');
      if (!band) return null;
      const st = (c) => band.querySelector(c);
      const px = (el, k) => (el ? parseFloat(el.style[k]) : null);
      const t = st('.st.t');
      const b = st('.st.b');
      const hues = [...document.querySelectorAll('.menu a')].map((x) => x.dataset.hue);
      const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
      const others = hues.filter((h) => h !== a.dataset.hue).map(rgb);
      return {
        main: band.querySelector('.bm').style.backgroundColor === rgb(a.dataset.hue),
        h1: t ? px(t, 'height') : 0,
        h2: px(b, 'height'),
        t: t ? [px(t, 'left'), px(t, 'left') + px(t, 'width')] : null,
        b: [px(b, 'left'), px(b, 'left') + px(b, 'width')],
        fig: !!st('.fc'),
        bw: a.offsetWidth,
        cell: parseFloat(getComputedStyle(a).fontSize) / 2,
        foreign: [t, b].filter(Boolean).some((e) => others.includes(e.style.backgroundColor)),
      };
    });
  const seen = [];
  for (let i = 0; i < 12; i++) {
    await np.mouse.move(rows[1][0] + 410, rows[1][1] - 3);
    await sleep(320);
    await np.mouse.move(rows[1][0] + 410, rows[1][1] + rows[1][3] / 2, { steps: 2 });
    await sleep(230);
    seen.push(await read());
  }
  await np.mouse.move(1700, 880);
  const tuple = (v) => v && `${v.h1}|${v.h2}|${v.fig}|${v.b[0]}`;
  const tuples = seen.map(tuple);
  ok(seen.every((v) => v && v.main), 'every hover of a menu row floods in its own page colour', String(seen.map((v) => v?.main)));
  ok(new Set(tuples).size >= 8 && tuples.every((t, i) => i === 0 || t !== tuples[i - 1]), 'twelve hovers of one row: at least eight different, never the same twice running', tuples.join(' '));
  ok(seen.every((v) => [0, 4, 6, 8].includes(v.h1) && [4, 6, 8].includes(v.h2)) && seen.some((v) => v.h1 === 0), 'strips are 4, 6 or 8px, the top one now and then left out', seen.map((v) => `${v.h1}/${v.h2}`).join(' '));
  ok(seen.every((v) => (!v.t || (v.t[0] === 0 && Math.abs(v.t[1] / v.cell - Math.round(v.t[1] / v.cell)) < 0.01)) && Math.abs(v.b[0] / v.cell - Math.round(v.b[0] / v.cell)) < 0.01 && Math.abs(v.b[1] - v.bw) < 0.5 && v.t?.[1] !== v.bw), 'coming in from above, the top strip runs from the left rule to the entry and the bottom one on to the right rule, on the mono cell', JSON.stringify(seen.map((v) => [v.t, v.b])));
  const figs = seen.map((v) => v.fig);
  ok(figs.filter(Boolean).length >= 2 && figs.filter(Boolean).length <= 6 && figs.every((f, i) => !(f && figs[i - 1])), 'the figure’s cell fills now and then, never twice running', figs.map((f) => (f ? 'F' : '.')).join(''));
  ok(seen.every((v) => !v.foreign), 'no strip ever takes another page’s colour');
  // The keyboard: the end frame at once, strips the full width.
  await np.keyboard.press('Tab');
  let kb = null;
  for (let i = 0; i < 6 && !(kb && kb.menu); i++) {
    kb = await np.evaluate(() => {
      const a = document.activeElement;
      const band = a?.querySelector('[data-band]');
      const b = band?.querySelector('.st.b');
      return { menu: !!a?.closest('.menu'), full: b ? parseFloat(b.style.left) === 0 && Math.abs(parseFloat(b.style.width) - a.offsetWidth) < 0.5 : false };
    });
    if (!kb.menu) await np.keyboard.press('Tab');
  }
  ok(kb && kb.menu && kb.full, 'a menu row reached by the keyboard gets its strips the full width, at once', JSON.stringify(kb));
  await nctx.close();
  }
  /* ------------------------------------------------------- round 3: the back button */
  {
  console.log('\n[the back button]');
  const watchX = () => {
    window.__xf = [];
    const t0 = performance.now();
    const tick = () => {
      const a = document.querySelector('a.jx');
      if (a) {
        const vis = (s) => getComputedStyle(a.querySelector(s)).visibility === 'visible';
        window.__xf.push({ t: Math.round(performance.now() - t0), wait: document.documentElement.classList.contains('jx-wait'), plus: vis('.jx-plus'), x: vis('.jx-x'), band: !!a.querySelector('.jx-band'), canvas: !!a.querySelector('canvas.jx-c'), xs: a.querySelector('.jx-x').getAttribute('style') });
      }
      if (performance.now() - t0 < 3500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const xctx = await browser.newContext({ viewport: { width: 1728, height: 908 } });
  const xp = await xctx.newPage();
  const xchunks = [];
  xp.on('request', (q) => {
    const m = q.url().match(/assets\/(jx|jellyx)-/);
    if (m) xchunks.push(m[1]);
  });
  await xp.addInitScript(watchX);
  await xp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await sleep(3000);
  const xf = await xp.evaluate(() => window.__xf);
  const firstX = xf.findIndex((f) => f.x);
  const curtain = xf.findIndex((f) => f.band);
  ok(xf[0] && xf[0].wait && xf[0].plus && !xf[0].x, 'before its entrance the cell holds the mono "+", as home does', JSON.stringify(xf[0]));
  ok(curtain >= 0 && firstX > curtain, 'it enters with the site’s glitch first: the band is a curtain in front', JSON.stringify([curtain, firstX]));
  ok(firstX >= 0 && /rotate\(4\d/.test(xf[firstX].xs ?? ''), 'then the X pops in, at 45 degrees: a "+" turned', JSON.stringify(xf[firstX]));
  const last = xf[xf.length - 1];
  ok(last && last.x && !last.plus && !last.wait && !last.xs, 'and settles at rest', JSON.stringify(last));
  ok(xchunks.includes('jx') && xchunks.includes('jellyx') && last.canvas, 'on a desktop JellyBox’s real optics draw it, loaded after the page is seen', `${xchunks.join(' ')} ${last.canvas}`);
  const renderer = await xp.evaluate(() => document.querySelector('a.jx canvas')?.dataset.renderer);
  ok(renderer === 'three-webgl', 'JellyBox’s renderer runs: three.js WebGL', String(renderer));
  const pig1 = await xp.evaluate(() => getComputedStyle(document.querySelector('a.jx')).getPropertyValue('--jb-r').trim());
  const PIGS = { '105 184 242': 'glass blue', '218 83 158': 'candy pink', '175 153 239': 'candy violet', '233 186 94': 'candy amber', '37 134 239': 'lagoon blue', '72 206 196': 'lagoon teal', '173 228 237': 'lagoon ice', '231 137 92': 'citrus orange', '233 217 94': 'citrus yellow', '172 229 63': 'citrus lime' };
  ok(PIGS[pig1] && !['citrus yellow', 'candy amber'].includes(PIGS[pig1]), 'its colour is one of JellyBox’s ten, and never a yellow beside a yellow title', `${pig1} ${PIGS[pig1]}`);
  await xp.goto(`${BASE}/product-designs/chellbook/`, { waitUntil: 'networkidle' });
  await sleep(400);
  const pig2 = await xp.evaluate(() => getComputedStyle(document.querySelector('a.jx')).getPropertyValue('--jb-r').trim());
  ok(PIGS[pig2] && pig2 !== pig1, 'the next page draws the next colour from the visit’s bag', `${PIGS[pig1]} then ${PIGS[pig2]}`);
  // Leaving: the X turns back into a "+", then the mono "+" is back, and the film closes onto it.
  await sleep(2500);
  const leaving = await xp.evaluate(async () => {
    const a = document.querySelector('a.jx');
    document.documentElement.setAttribute('data-morph', 'cover');
    await new Promise((r) => setTimeout(r, 20));
    const s1 = { leave: a.classList.contains('jx-leave'), turn: getComputedStyle(a.querySelector('.jx-x')).transform };
    await new Promise((r) => setTimeout(r, 80));
    const s2 = { gone: a.classList.contains('jx-gone'), plus: getComputedStyle(a.querySelector('.jx-plus')).visibility, x: getComputedStyle(a.querySelector('.jx-x')).visibility };
    document.documentElement.removeAttribute('data-morph');
    return { s1, s2 };
  });
  ok(leaving.s1.leave && /matrix\(0\.70/.test(leaving.s1.turn) && leaving.s2.gone && leaving.s2.plus === 'visible' && leaving.s2.x === 'hidden', 'leaving: the X turns back to 45 degrees, then the mono "+" is back for the film', JSON.stringify(leaving));
  // Going back up the X closes into the "+": the entrance backwards, faster.
  await xp.reload({ waitUntil: 'networkidle' });
  await sleep(2600);
  const closing = await xp.evaluate(async () => {
    const a = document.querySelector('a.jx');
    const at = [];
    const snap = (t) => ({ t, cls: a.className, x: a.querySelector('.jx-x').getAttribute('style') ?? '', plus: a.querySelector('.jx-plus').getAttribute('style') ?? '', band: a.querySelector('.jx-band .bm')?.style.clipPath ?? null });
    const t0 = performance.now();
    document.documentElement.setAttribute('data-morph-dir', 'home');
    document.documentElement.setAttribute('data-morph', 'cover');
    await new Promise((r) => {
      const tick = () => {
        const t = performance.now() - t0;
        at.push(snap(Math.round(t)));
        if (t < 360) requestAnimationFrame(tick);
        else r();
      };
      requestAnimationFrame(tick);
    });
    document.documentElement.removeAttribute('data-morph');
    document.documentElement.removeAttribute('data-morph-dir');
    return at;
  });
  const mid = closing.find((f) => f.t > 20 && f.t < 90);
  const cutF = closing.find((f) => f.t >= 105 && f.t < 145);
  const endF = closing[closing.length - 1];
  ok(mid && /rotate\((1|2|3|4)\d?\.\d+deg\)/.test(mid.x) && /scale\(0\.[3-9]/.test(mid.x) && !mid.band, 'going up, the X turns toward 45 degrees as the jelly collapses onto the pin', JSON.stringify(mid));
  ok(cutF && cutF.band && /round 999px/.test(cutF.band) && /Dessign Maison/.test(cutF.plus) && /visibility:hidden/.test(cutF.x), 'at 100ms the band takes the dot and the "+" is there, in the glitch face', JSON.stringify(cutF));
  ok(endF && /jx-gone/.test(endF.cls) && !endF.band && /visibility:visible/.test(endF.plus) && !/Dessign/.test(endF.plus), 'by 300ms it is the floor and the mono "+", exactly home’s, before the film covers the box', JSON.stringify(endF));
  const dx0 = xf[firstX] && /translateX\(([\d.-]+)px\)/.exec(xf[firstX].xs ?? '');
  ok(dx0 && +dx0[1] > 5 && +dx0[1] < 7, 'the X pops in on the pin, where home’s "+" was, and travels to the box’s centre', xf[firstX]?.xs);
  // Bigger: the whole gutter, a 1.5em disc and a 0.7em X; hovered, the jelly takes the box's own shape.
  await xp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const homePlus = await xp.evaluate(() => { const r = document.querySelector('[data-anchor]').getBoundingClientRect(); return r.left + r.width / 2; });
  await xp.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await sleep(2500);
  const size = await xp.evaluate(() => {
    const a = document.querySelector('a.jx');
    const r = a.getBoundingClientRect();
    const pin = a.querySelector('.jx-pin').getBoundingClientRect();
    return { box: [r.left, r.width, r.height], pin: pin.left, disc: parseFloat(getComputedStyle(a.querySelector('.jx-skin')).width), x: a.querySelector('.jx-x').getBoundingClientRect().width, body: window.__jx.body(), chip: JSON.stringify(document.querySelector('.hd .chip').getBoundingClientRect()), cw: a.clientWidth, ch: a.clientHeight };
  });
  ok(size.box[0] === 0 && size.box[1] === 72 && Math.round(size.box[2]) === 73, 'at his 1728 the box is the whole gutter, 72 by 73', JSON.stringify(size.box));
  ok(Math.abs(size.pin - homePlus) <= 0.5, 'its pin is exactly where home’s "+" is', `${size.pin} ${homePlus}`);
  ok(size.disc === 60 && Math.round(size.x) === 28 && size.body && Math.round(size.body.w) === 60 && Math.round(size.body.r) === 30, 'a 60px disc and a 28px X at rest (were 45 and 20)', JSON.stringify([size.disc, size.x, size.body]));
  await xp.mouse.move(36, size.box[2] / 2 + 122, { steps: 3 });
  await sleep(800);
  const hov = await xp.evaluate(() => ({ body: window.__jx.body(), chip: JSON.stringify(document.querySelector('.hd .chip').getBoundingClientRect()) }));
  const fill = Math.min(size.cw, size.ch) - 7;
  ok(hov.body && Math.abs(hov.body.w - fill) < 0.5 && Math.abs(hov.body.h - fill) < 0.5 && Math.abs(hov.body.r - fill / 2) < 0.5, 'hovered, the disc swells to fill the box, still a disc, 3.5px inside the rules', JSON.stringify([hov.body, fill]));
  ok(hov.chip === size.chip, 'and nothing outside the box moves');
  await xp.mouse.move(900, 700);
  await sleep(700);
  const back = await xp.evaluate(() => window.__jx.body());
  ok(back && Math.abs(back.w - 60) < 1 && Math.abs(back.r - 30) < 1, 'let go, it springs back to its disc', JSON.stringify(back));
  await xctx.close();
  // Phones: JellyBox's own CSS skin, never the optics; the box is 44px.
  const xph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const xpp = await xph.newPage();
  const phChunks = [];
  xpp.on('request', (q) => {
    const m = q.url().match(/assets\/(jellyx)-/);
    if (m) phChunks.push(m[1]);
  });
  await xpp.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await sleep(2500);
  const phX = await xpp.evaluate(() => {
    const a = document.querySelector('a.jx');
    const b = a.getBoundingClientRect();
    return { canvas: !!a.querySelector('canvas'), skin: getComputedStyle(a.querySelector('.jx-skin')).visibility, bg: getComputedStyle(a.querySelector('.jx-skin')).backgroundImage.startsWith('linear-gradient'), x: getComputedStyle(a.querySelector('.jx-x')).visibility, box: [Math.round(b.left), Math.round(b.width), Math.round(b.height)] };
  });
  ok(phChunks.length === 0 && !phX.canvas && phX.skin === 'visible' && phX.bg && phX.x === 'visible', 'on a phone it is JellyBox’s own CSS skin, never the optics', JSON.stringify([phChunks, phX]));
  ok(phX.box[0] === 0 && phX.box[1] === 48 && phX.box[2] === 48, 'on a phone the box is 48px square, flush to the window’s edge', JSON.stringify(phX.box));
  await xph.close();
  // Reduced motion: no entrance, the X is there from the first frame.
  const xrm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const xrp = await xrm.newPage();
  await xrp.addInitScript(watchX);
  await xrp.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
  await sleep(800);
  const rmx = await xrp.evaluate(() => window.__xf);
  ok(rmx.length > 0 && rmx.every((f) => !f.wait && f.x && !f.plus && !f.band), 'with reduced motion there is no entrance: the X is there from the first frame', JSON.stringify(rmx[0]));
  await xrm.close();
  // Scripts off: the box, the skin, the X, a working link.
  const xoff = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const xop = await xoff.newPage();
  await xop.goto(`${BASE}/paintings/`, { waitUntil: 'load' });
  const offX = await xop.evaluate(() => {
    const a = document.querySelector('a.jx');
    const vis = (s) => getComputedStyle(a.querySelector(s)).visibility;
    return { href: a.getAttribute('href'), skin: vis('.jx-skin'), x: vis('.jx-x'), plus: vis('.jx-plus'), rgb: getComputedStyle(a).getPropertyValue('--jb-rgb').trim() };
  });
  ok(offX.href === '/' && offX.skin === 'visible' && offX.x === 'visible' && offX.plus === 'hidden' && offX.rgb === '105 184 242', 'with scripts off it is the box, JellyBox’s skin in glass blue, the X and a plain link home', JSON.stringify(offX));
  await xoff.close();

  }
  /* ------------------------------------------------------ round 3: the film's lineage */
  {
  console.log('\n[film variants]');
  const vctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const vp = await vctx.newPage();
  await vp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
  await settle(vp);
  const variant = await vp.evaluate(() => {
    const read = (kind) => {
      window.__morph.seek('cover', 'out', 0.5, kind);
      const lines = Array.from(document.querySelectorAll('.morph .set.l .ln')).map((l) => l.textContent);
      window.__morph.clear();
      return lines;
    };
    const bayer = read('bayer');
    const figures = read('figures');
    // each line's count: the three figures just behind the front "+" are how many cells it covers past the anchor
    const anchorCol = (() => {
      window.__morph.seek('cover', 'out', 0.5, null);
      const l = Array.from(document.querySelectorAll('.morph .set.l .ln')).find((x) => x.textContent.trimStart().startsWith('+'));
      const c = l.textContent.indexOf('+');
      window.__morph.clear();
      return c;
    })();
    const counts = figures.filter((t) => /\d{3}\+$/.test(t)).map((t) => [+t.slice(-4, -1), t.length - anchorCol]);
    return {
      bayer: [...new Set(bayer.join('').replace(/ /g, ''))].join(''),
      digits: figures.some((t) => /=\d{3}\+$/.test(t) || /\d{3}\+$/.test(t)),
      counts,
    };
  });
  ok(variant.bayer === '+', 'Bayer front: behind the front only his "+", dithered', variant.bayer);
  ok(variant.digits && variant.counts.length > 3 && variant.counts.every(([n, len]) => n === len) && new Set(variant.counts.map(([n]) => n)).size > 2, 'Figures: each line carries its own true running count behind the front: the cells from the "+" to it', JSON.stringify(variant.counts.slice(0, 6)));
  // A forced Figures film with Coalesce: the click hops to the "+", the cover waits for it, the next page reveals with the same figures.
  await vp.evaluate(() => window.__morph.force('figures', true));
  const far = await center(vp, 'nav a[href="/about/"]');
  await vp.evaluate(() => {
    window.__coal = 0;
    new MutationObserver(() => {
      window.__coal = Math.max(window.__coal, document.querySelectorAll('.morph .coal').length);
      if (window.__coal) sessionStorage.setItem('check-coal', String(window.__coal));
    }).observe(document.body, { subtree: true, childList: true });
  });
  await vp.mouse.click(far.x, far.y);
  await vp.waitForURL('**/about/');
  await vp.waitForFunction(() => !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'), null, { timeout: 5000 });
  const arrived = await vp.evaluate(() => ({ kind: window.__psMorphKind, coal: sessionStorage.getItem('check-coal') }));
  ok(arrived.coal === '8' && arrived.kind === 'figures', 'Coalesce: eight squares carry the click to the "+", and the next page reveals with the same variant', JSON.stringify(arrived));
  await vctx.close();
  // The first page change of a visit is always the plain film.
  const fctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const fp = await fctx.newPage();
  await fp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await settle(fp);
  await fp.locator('.menu a[href="/paintings/"]').click();
  await fp.waitForURL('**/paintings/');
  await fp.waitForFunction(() => !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'), null, { timeout: 5000 });
  ok((await fp.evaluate(() => window.__psMorphKind)) === null, 'the first page change of a visit is always the plain film');
  await fctx.close();

  }
  console.log('\n[back and forward]');
  // Playwright turns the back/forward cache off by default; real browsers
  // have it on, so this runs a browser with it on.
  const bfBrowser = await chromium.launch({ executablePath: CHROME, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  const sigState = (pg) =>
    pg.evaluate(() => ({
      persisted: window.__persisted,
      visible: ((cs) => cs.display !== 'none' && cs.visibility !== 'hidden')(getComputedStyle(document.querySelector('.sig-ink'))),
      anim: !!document.querySelector('.sig-anim'),
    }));
  const leaveAndReturn = async (pg) => {
    await pg.evaluate(() => {
      window.__persisted = null;
      addEventListener('pageshow', (e) => { window.__persisted = e.persisted; });
    });
    await pg.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
    await pg.goBack({ waitUntil: 'commit' });
    await sleep(400);
  };
  try {
    // Written, then away and back: it is not written a second time.
    const bf = await bfBrowser.newContext({ viewport: { width: 1440, height: 789 } });
    const b1 = await bf.newPage();
    await b1.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await sleep(2400);
    await leaveAndReturn(b1);
    await sleep(600);
    const back1 = await sigState(b1);
    ok(back1.visible && !back1.anim, `back to home${back1.persisted ? ' from the back/forward cache' : ''} after it was written: it is not written again`, JSON.stringify(back1));
    await bf.close();

    // Claimed but not yet written (a 150px window, below the fold), then away
    // and back: it is shown written, and scrolling to it does not write it in.
    const bf2 = await bfBrowser.newContext({ viewport: { width: 1440, height: 150 } });
    const b2 = await bf2.newPage();
    await b2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await b2.waitForFunction(() => window.__psSigClaim);
    await leaveAndReturn(b2);
    await b2.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(800);
    const back2 = await sigState(b2);
    ok(back2.visible && !back2.anim, `back to home${back2.persisted ? ' from the back/forward cache' : ''} before it was written: shown written, not written in`, JSON.stringify(back2));
    await bf2.close();

    // Left by the film, covered. Back: the page it left must come back uncovered.
    const bf3 = await bfBrowser.newContext({ viewport: { width: 1440, height: 900 } });
    const b3 = await bf3.newPage();
    await b3.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
    await settle(b3);
    await b3.evaluate(() => {
      window.__persisted = null;
      addEventListener('pageshow', (e) => { window.__persisted = e.persisted; });
    });
    await b3.locator('a.row[href="/product-designs/chellbook/"]').click();
    await b3.waitForURL('**/chellbook/');
    await b3.waitForFunction(() => !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'));
    await b3.goBack({ waitUntil: 'commit' });
    await sleep(500);
    const back3 = await b3.evaluate(uncovered);
    const persisted3 = await b3.evaluate(() => window.__persisted);
    ok(isOpen(back3), `back to a page the film left covered${persisted3 ? ', from the back/forward cache' : ''}: it comes back uncovered`, JSON.stringify(back3));
    await b3.goForward({ waitUntil: 'commit' });
    await sleep(500);
    const fwd3 = await b3.evaluate(uncovered);
    ok(isOpen(fwd3), 'and forward again is uncovered too, with no film replayed', JSON.stringify(fwd3));
    // A restore, forced: whatever state the film was in, pageshow clears it.
    await b3.evaluate(() => {
      window.__morph.seek('cover', 'out', 1);
      document.documentElement.setAttribute('data-morph', 'covered');
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    const forced = await b3.evaluate(uncovered);
    ok(isOpen(forced), 'a back/forward-cache restore of a covered page clears the cover at once', JSON.stringify(forced));
    await bf3.close();
  } finally {
    await bfBrowser.close();
  }

  /* ---------------------------------------------------------- every width */
  console.log('\n[every width]');
  const ALL = [...ROUTES, '/404.html'];
  // The type is clamp(16px, min(100vw / 43.2, 26.667px + 100vw / 129.6), 48px): its value at each width.
  const typeAt = (w) => Math.max(16, Math.min(w / 43.2, 26.667 + w / 129.6, 48));
  for (const w of [360, 390, 480, 690, 691, 768, 960, 1024, 1280, 1728, 1920, 2560]) {
    const c = await browser.newContext({ viewport: { width: w, height: 900 } });
    // the deck held still: these judge the glitch and the film themselves
    await c.addInitScript(() => (window.__linQuiet = true));
    const pg = await c.newPage();
    const bad = [];
    for (const r of ALL) {
      await pg.goto(BASE + r, { waitUntil: 'load' });
      await pg.evaluate(() => document.fonts.ready);
      const o = await pg.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        return {
          over: document.documentElement.scrollWidth - vw,
          // anything that is text and runs past the window, even if it is clipped
          out: Array.from(document.querySelectorAll('.page :is(p, h1, h2, li, a, span, figcaption, img)')).filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width && !e.closest('.sr-only, .hr') && (b.right > vw + 0.5 || b.left < -0.5);
          }).length,
          fs: parseFloat(getComputedStyle(document.body).fontSize),
        };
      });
      if (o.over !== 0 || o.out !== 0 || Math.abs(o.fs - typeAt(w)) > 0.05) bad.push(`${r} ${JSON.stringify(o)}`);
    }
    ok(bad.length === 0, `${w}px: no page scrolls sideways, nothing runs off the window, type at ${typeAt(w).toFixed(2)}px`, bad.join(' | '));
    await c.close();
  }

  /* ----------------------------------------------------------- the phone */
  /**
   * The same checks in each engine. Emulation is not a phone, so WebKit (the
   * engine under every iPhone browser) runs everything Chrome does, with its
   * type really rendered: engines can disagree on CSS math, and a size that
   * resolves to not-a-number renders as 0.
   */
  const phoneChecks = async (engine, name) => {
    console.log(`\n[phone · ${name}]`);
    for (const [w, h] of [[360, 640], [390, 844]]) {
      const phone = await engine.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const pp = await phone.newPage();
      const perr = [];
      pp.on('pageerror', (e) => perr.push(String(e)));
      for (const r of ALL) {
        await pp.goto(BASE + r, { waitUntil: 'networkidle' });
        await settle(pp);
        const o = await pp.evaluate(() => {
          const cs = (s) => getComputedStyle(document.querySelector(s));
          const anchor = document.querySelector('[data-anchor]');
          const plus = anchor.getBoundingClientRect();
          return {
            jx: anchor.matches('.jx'),
            tall: plus.height,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            units: document.querySelectorAll('[data-unit]').length,
            fs: parseFloat(cs('body').fontSize),
            name: parseFloat(cs('.name').fontSize),
            nameW: document.querySelector('.name').getBoundingClientRect().width,
            cell: plus.width,
            plusX: plus.left,
            textX: document.querySelector('.name').getBoundingClientRect().left,
            mono: (() => { const s = document.createElement('span'); s.textContent = 'iiiiiiiiii'; s.style.cssText = 'position:absolute;visibility:hidden'; document.body.appendChild(s); const a = s.getBoundingClientRect().width; s.textContent = 'MMMMMMMMMM'; const b = s.getBoundingClientRect().width; s.remove(); return Math.abs(a - b) < 0.5 && a > 40; })(),
          };
        });
        ok(o.overflow === 0 && o.units === 0, `${w} ${r} fits with no sideways scroll and no seams`, JSON.stringify(o));
        ok(o.fs === 16 && o.name === 32 && o.nameW > 200 && o.mono, `${w} ${r} its type is really there: 16px mono, the name at 32px`, JSON.stringify(o));
        if (o.jx) ok(o.plusX === 0 && o.cell === 48 && o.tall === 48 && o.textX === 24, `${w} ${r} the back button is a 48px ledger box flush to the window’s edge, the text two columns in`, JSON.stringify([o.plusX, o.cell, o.tall, o.textX]));
        else ok(o.plusX === 8 && o.cell === 8 && o.textX === 24, `${w} ${r} the "+" is one 8px column in, the text two columns right of it`, JSON.stringify([o.plusX, o.cell, o.textX]));
        // Every link, where it lies: 44px tall to a finger.
        const small = await pp.evaluate(async () => {
          const bad = [];
          for (const a of document.querySelectorAll('a[data-btn]')) {
            a.scrollIntoView({ block: 'center' });
            const b = a.getBoundingClientRect();
            if (b.height >= 43.5) continue;
            const cx = Math.min(b.left + b.width / 2, innerWidth - 2);
            const cy = b.top + b.height / 2;
            const hit = (dy) => document.elementFromPoint(cx, cy + dy)?.closest('a') === a;
            if (!(hit(-21) && hit(0) && hit(21))) bad.push(`${a.textContent.trim().slice(0, 20)} ${Math.round(b.height)}`);
          }
          window.scrollTo(0, 0);
          return bad;
        });
        ok(small.length === 0, `${w} ${r} every link is at least 44px tall to the touch`, small.join(' | '));
        const orphans = await pp.evaluate(() =>
          Array.from(document.querySelectorAll('[data-btn]')).flatMap((b) => {
            const t = b.nextSibling;
            if (!t || t.nodeType !== 3 || !/^[.,:;)]/.test(t.nodeValue)) return [];
            const rg = document.createRange();
            rg.setStart(t, 0);
            rg.setEnd(t, 1);
            const p = rg.getBoundingClientRect();
            const rr = b.getBoundingClientRect();
            return p.top > rr.bottom - 4 ? [b.textContent.trim().slice(0, 30)] : [];
          }),
        );
        ok(orphans.length === 0, `${w} ${r} no punctuation orphaned from its button`, orphans.join(' | '));
      }
      ok(perr.length === 0, `${w}: no page throws`, perr.join(' | '));

      // How the two grammars fold.
      await pp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await settle(pp);
      const fold = await pp.evaluate(() => {
        const led = document.querySelector('.ledger').getBoundingClientRect();
        const sheet = getComputedStyle(document.querySelector('.ledger'), '::before');
        const l = led.left + parseFloat(sheet.left);
        const menu = document.querySelector('.menu').getBoundingClientRect();
        const hair = document.querySelector('.hr .hair').getBoundingClientRect();
        const ink = document.querySelector('.hr .ink').getBoundingClientRect();
        return {
          sheet: [Math.round(l), Math.round(l + parseFloat(sheet.width))],
          menu: [Math.round(menu.left), Math.round(menu.right)],
          rows: Array.from(document.querySelectorAll('.hrow')).map((a) => a.getBoundingClientRect().height),
          oneLine: Array.from(document.querySelectorAll('.hrow')).every((a) => a.querySelector('[data-word]').getBoundingClientRect().height < 30),
          hair: [Math.round(ink.left), Math.round(hair.left), Math.round(hair.right)],
          fits: document.documentElement.scrollHeight <= innerHeight,
        };
      });
      ok(fold.sheet[0] === 9 && fold.sheet[1] === w - 9 && fold.menu[0] === 10 && fold.menu[1] === w - 10, `${w} home: the sheet runs from one column in to one column from the right, between his rules`, JSON.stringify(fold));
      ok(fold.rows.every((r) => r >= 44) && fold.oneLine, `${w} home: four menu rows, each 44px and on one line`, JSON.stringify(fold.rows));
      ok(fold.hair[0] === 24 && fold.hair[1] > 200 && fold.hair[2] === w, `${w} home: the rules still end in a hairline to the right edge`, JSON.stringify(fold.hair));
      ok(fold.fits, `${w} home: one screen, no scroll`);

      await pp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
      await settle(pp);
      const stack = await pp.evaluate(() => {
        const a = document.querySelector('a.row');
        const nm = a.querySelector('.nm').getBoundingClientRect();
        const l = a.querySelector('.l').getBoundingClientRect();
        const row = a.getBoundingClientRect();
        const figB = document.querySelector('.hd .fig').getBoundingClientRect();
        const chip = document.querySelector('.hd .chip').getBoundingClientRect();
        return { stacked: l.top >= nm.bottom - 1 && Math.abs(l.left - nm.left) < 1, span: [Math.round(row.left), Math.round(row.right)], figAbove: figB.bottom <= chip.top + 1, inset: Math.round(nm.left - row.left) };
      });
      ok(stack.stacked && stack.span[0] === 24 && stack.span[1] === w - 8 && stack.inset === 8, `${w} rows stack: the name, then the detail under it, still one column in`, JSON.stringify(stack));
      ok(stack.figAbove, `${w} the figure chip takes its own line above the title`);
      await pp.evaluate(() => window.scrollTo(0, 1500));
      await sleep(200);
      const bar = await pp.evaluate(() => {
        const p = document.querySelector('.plus').getBoundingClientRect();
        const f = document.querySelector('.hd .fig').getBoundingClientRect();
        const c = document.querySelector('.hd .chip').getBoundingClientRect();
        return { plus: p.top, fig: f.bottom, chip: c.top, hd: document.querySelector('.hd').getBoundingClientRect().bottom };
      });
      ok(bar.plus >= 0 && bar.plus < 30 && bar.fig <= 1 && bar.chip >= 0 && bar.hd <= 60, `${w} scrolled: only the title line sticks, the back button and all, 60px tall at most`, JSON.stringify(bar));

      await pp.goto(`${BASE}/paintings/`, { waitUntil: 'networkidle' });
      const one = await pp.evaluate(() => {
        const t = Array.from(document.querySelectorAll('.tile')).slice(0, 3).map((x) => x.getBoundingClientRect());
        const img = document.querySelector('.tile img');
        return { column: t[1].top >= t[0].bottom && t[2].top >= t[1].bottom && Math.abs(t[0].left - t[1].left) < 1, whole: Math.abs(img.clientWidth / img.clientHeight - img.naturalWidth / img.naturalHeight) < 0.02 };
      });
      ok(one.column && one.whole, `${w} paintings go to one column, each one whole at its own shape`, JSON.stringify(one));

      // The film, on a phone, by a tap.
      await pp.addInitScript(watchArrival);
      await pp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await sleep(400);
      const tp = Date.now();
      await pp.locator('.menu a[href="/about/"]').tap();
      await pp.waitForURL('**/about/');
      await pp.waitForFunction(() => window.__arrive && window.__arrive.length > 2 && !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'), null, { timeout: 5000 });
      const pt = Date.now() - tp;
      const pa = await pp.evaluate(() => window.__arrive);
      const pe = await pp.evaluate(uncovered);
      ok((await pp.evaluate(() => window.__gated)) && (pa[0].gate || pa[0].overlay) && pa.some((f) => f.overlay && f.state === 'reveal') && isOpen(pe) && pt < 1500, `${w} a tap plays the film: covered on arrival, revealed, left uncovered, in ${pt}ms`, JSON.stringify(pe));
      await pp.locator('.plus').tap();
      await pp.waitForURL(`${BASE}/`);
      await pp.waitForFunction(() => window.__arrive && window.__arrive.length > 2 && !document.querySelector('.morph') && !document.documentElement.classList.contains('morph-in'), null, { timeout: 5000 });
      const ph = await pp.evaluate(() => ({ dir: window.__psMorphIn, end: null }));
      ph.end = await pp.evaluate(uncovered);
      ok(ph.dir === 'home' && isOpen(ph.end), `${w} tapping the "+" plays it backwards, home`, JSON.stringify(ph));
      // Held still mid-film: the grid is cut from this window, and reaches all of it.
      await pp.goto(`${BASE}/about/`, { waitUntil: 'networkidle' });
      await settle(pp);
      const pg = await pp.evaluate(() => {
        window.__morph.seek('cover', 'out', 1);
        const plus = document.querySelector('[data-anchor]').getBoundingClientRect();
        const pinR = (document.querySelector('[data-anchor] .jx-pin') ?? document.querySelector('[data-anchor]')).getBoundingClientRect();
        const pinX = pinR.left + pinR.width / 2;
        const lines = Array.from(document.querySelectorAll('.morph .set.l .ln'));
        const first = lines[0].getBoundingClientRect();
        const last = lines[lines.length - 1].getBoundingClientRect();
        const mark = document.querySelector('[data-anchor]').dataset.glyph || '+';
        const row = lines.find((l) => l.textContent.trimStart().startsWith(mark));
        const col = row.textContent.indexOf(mark);
        const rb = row.getBoundingClientRect();
        const cw = rb.width / row.textContent.length;
        const r = {
          wide: lines.every((l) => l.getBoundingClientRect().right >= innerWidth - 0.5),
          tall: last.bottom >= innerHeight - 0.5,
          top: first.top,
          hd: document.querySelector('.hd').getBoundingClientRect().top,
          // the anchor cell's centre on the back button's pin, where the phone's own "+" is
          dx: rb.left + col * cw + cw / 2 - pinX,
          dy: rb.top + rb.height / 2 - (plus.top + plus.height / 2),
          cw,
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
        window.__morph.clear();
        return r;
      });
      ok(pg.wide && pg.tall && Math.abs(pg.top - pg.hd) < 12 && pg.over === 0, `${w} full cover reaches from the header row to the bottom, edge to edge, and adds no scroll`, JSON.stringify(pg));
      ok(Math.abs(pg.dx) <= 1 && Math.abs(pg.dy) <= 1 && Math.abs(pg.cw - 8) < 0.05, `${w} its grid sits on the phone's own "+" and 8px columns`, JSON.stringify([pg.dx, pg.dy, pg.cw]));

      // A finger gets the band and the alternate while pressed, at once, with no glitch.
      await pp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await settle(pp);
      const press = await pp.evaluate(() => {
        const b = document.querySelector('.menu [data-btn]');
        const before = b.getBoundingClientRect().height;
        const opts = { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 7 };
        b.dispatchEvent(new PointerEvent('pointerdown', opts));
        const down = {
          hot: b.hasAttribute('data-hot'),
          instant: Array.from(b.querySelectorAll('[data-glitch] > span'))
            .filter((s) => s.textContent.trim())
            .every((s) => s.style.fontFamily.includes('Dessign Maison')),
          same: b.getBoundingClientRect().height === before && document.documentElement.scrollWidth === document.documentElement.clientWidth,
        };
        b.dispatchEvent(new PointerEvent('pointerup', opts));
        return { ...down, after: b.hasAttribute('data-hot') };
      });
      ok(press.hot && press.instant && press.same, `${w} touch: pressing lights the row in its final state at once, and moves nothing`, JSON.stringify(press));
      ok(!press.after, `${w} touch: lifting the finger lets it go`);

      const two = await pp.evaluate(() => {
        const [a, b] = document.querySelectorAll('.menu [data-btn]');
        const ev = (t, el, id) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch', pointerId: id }));
        ev('pointerdown', a, 1);
        ev('pointerdown', b, 2);
        const both = a.hasAttribute('data-hot') && b.hasAttribute('data-hot');
        ev('pointerup', a, 1);
        ev('pointerup', b, 2);
        return { both, left: document.querySelectorAll('[data-hot]').length };
      });
      ok(two.both && two.left === 0, `${w} touch: two fingers on two rows, and both let go`, JSON.stringify(two));
      await phone.close();
    }
  };
  await phoneChecks(browser, 'Chrome');
  if (wk) await phoneChecks(wk, 'WebKit');

  /* ------------------------------------------------------ WebKit, desktop */
  if (wk) {
    console.log('\n[desktop · WebKit]');
    const wctx = await wk.newContext({ viewport: { width: 1440, height: 900 } });
    // the deck held still: these judge the glitch and the film themselves
    await wctx.addInitScript(() => (window.__linQuiet = true));
    const wp = await wctx.newPage();
    const werr = [];
    wp.on('pageerror', (e) => werr.push(String(e)));
    const wbad = [];
    for (const r of ALL) {
      await wp.goto(BASE + r, { waitUntil: 'networkidle' });
      await settle(wp);
      const o = await wp.evaluate(() => ({
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        fs: getComputedStyle(document.body).fontSize,
        plus: (() => { const b = document.querySelector('.plus').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width)]; })(),
        name: (() => { const n = document.querySelector('.name'); const b = n.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + parseFloat(getComputedStyle(n).paddingTop))]; })(),
      }));
      const k = 1440 / 1728;
      const want = r === '/' ? [32 * k, 132 * k, 20 * k] : [0, 122 * k, 72 * k];
      const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
      if (o.over !== 0 || Math.abs(parseFloat(o.fs) - 1440 / 43.2) > 0.01 || !near(o.plus, want) || !near(o.name, [72 * k, 20 * k])) wbad.push(`${r} ${JSON.stringify(o)}`);
    }
    ok(wbad.length === 0, 'every page: type at the width over 43.2 (33.3px), the "+" or the X box and the name where his window puts them, scaled, no sideways scroll', wbad.join(' | '));
    await wp.goto(`${BASE}/product-designs/`, { waitUntil: 'networkidle' });
    await settle(wp);
    const wb4 = await wp.evaluate(layout);
    const wc = await center(wp, 'a.row');
    await wp.mouse.move(wc.x, wc.y, { steps: 3 });
    await sleep(800);
    const wHot = await wp.evaluate(() => ({ hot: document.querySelectorAll('[data-hot] [data-band]').length, alt: Array.from(document.querySelectorAll('[data-glitch] > span')).filter((s) => s.textContent.trim()).every((s) => s.style.fontFamily.includes('Dessign Maison')) }));
    const wNow = await wp.evaluate(layout);
    ok(wHot.hot === 1 && wHot.alt && JSON.stringify(wb4) === JSON.stringify(wNow), 'hover: band and glitch, and no layout box moves', `${wb4.filter((b, i) => b !== wNow[i]).length} moved`);
    await wp.mouse.move(1430, 880);
    await wp.addInitScript(watchArrival);
    const wf1 = await film(wp, { from: '/', to: '/product-designs/' }, 300);
    const wFirst = wf1.arrive.findIndex((x) => x.overlay);
    ok(wf1.src && wf1.src.seen.join() === 'cover,covered' && wf1.src.full && wf1.src.ink === '+', 'the film: the page being left covers itself fully', JSON.stringify(wf1.src));
    ok(wf1.gated && wFirst >= 0 && wf1.arrive.slice(0, wFirst).every((x) => x.gate && x.hidden), 'the page being opened starts covered and is never seen before the reveal');
    ok(isOpen(wf1.end) && wf1.total < 1500, `it ends uncovered, in ${wf1.total}ms`, JSON.stringify(wf1.end));
    const wf2 = await film(wp, { from: '/about/', to: '/' }, 300);
    ok(wf2.dir === 'home' && isOpen(wf2.end), 'going home plays it backwards and ends uncovered', JSON.stringify(wf2.end));
    ok(werr.length === 0, 'no page throws', werr.join(' | '));
    await wctx.close();

    const wnj = await wk.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const wn = await wnj.newPage();
    const wclosed = [];
    for (const r of ALL) {
      await wn.goto(BASE + r, { waitUntil: 'load' });
      const vis = await wn.locator('main').evaluate((main) => ({
        hidden: Array.from(document.querySelectorAll('.page *')).filter((e) => getComputedStyle(e).visibility === 'hidden' && !e.closest('.sr-only, .jx-plus')).length,
        words: main.innerText.trim().length,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      if (vis.hidden || vis.words < 20 || vis.over) wclosed.push(`${r} ${JSON.stringify(vis)}`);
    }
    ok(wclosed.length === 0, 'with scripts off, on a phone: every page fully visible, none scrolling sideways', wclosed.join(' | '));
    await wnj.close();
  }
} finally {
  await browser.close();
  if (wk) await wk.close();
}

console.log(failed ? `\n${failed} FAILED, ${passed} passed` : `\nALL ${passed} CHECKS PASSED${wk ? ' (Chrome and WebKit)' : ' (Chrome only: WebKit is not installed)'}`);
process.exit(failed ? 1 : 0);
