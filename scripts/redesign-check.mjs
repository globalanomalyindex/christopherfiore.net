/**
 * The five assertions from DO-NOT-BREAK.md §5, on a real browser.
 *   1 every [data-frame] corner lands on a lattice point
 *   2 no peg glyph ink intersects any text glyph ink
 *   3 a hover cycle leaves the lattice bit-identical to its resolved state
 *   4 after a transition teardown nothing is left painted
 *   5 1920 % step === 0 and 1080 % step === 0
 */
import { chromium } from '/Users/chrisfiore/portfolio-site/node_modules/playwright-core/index.mjs';
const BASE = process.env.BASE || 'http://localhost:4599/';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 200)));
pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

await pg.addInitScript(() => {
  window.__probe = {};
});
await pg.goto(BASE, { waitUntil: 'load' });
await pg.evaluate(() => document.fonts.ready);
await pg.waitForTimeout(4600);

const HELPERS = () => {
  window.__H = {
    vis(el) { let n = el; while (n && n !== document.body) { const c = getComputedStyle(n);
      if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') return false; n = n.parentElement; } return true; },
    scr() { return [...document.querySelectorAll('[data-lattice]')].map(l => l.parentElement).filter(s => window.__H.vis(s)); },
    // true glyph ink, not the element box (the box is the font box, 1.20em here)
    ink(node, txt) {
      const e = node.nodeType === 3 ? node.parentElement : node;
      const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize) || 12;
      const cx = (window.__cx ||= document.createElement('canvas').getContext('2d'));
      cx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      return cx.measureText(txt);
    },
    band(q, m) { const bl = q.top + (q.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      return { t: bl - m.actualBoundingBoxAscent, b: bl + m.actualBoundingBoxDescent }; },
    snap(screen) {
      return [...screen.querySelectorAll('[data-lattice] > span')]
        .map(c => `${c.dataset.base}|${c.dataset.baseSize}|${c.dataset.corner || ''}|${c.style.fontSize}`).join(';');
    },
    stats(screen) {
      const cells = [...screen.querySelectorAll('[data-lattice] > span')];
      let corners = 0, occ = 0, hued = 0;
      const norm = v => { const s = (v || '').trim().toLowerCase();
        if (s.startsWith('#')) { const n = parseInt(s.slice(1), 16); return `${(n>>16)&255},${(n>>8)&255},${n&255}`; }
        const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return s;
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(x => Math.round(parseFloat(x))); return `${p[0]},${p[1]},${p[2]}`; };
      for (const c of cells) { if (c.dataset.corner) corners++;
        if (c.dataset.base === 'transparent') occ++;
        if (c.dataset.base && c.dataset.base !== '#DFE4E6' && c.style.color && norm(c.style.color) !== norm(c.dataset.base)) hued++; }
      return { total: cells.length, corners, occluded: occ, hued };
    },
  };
};
await pg.evaluate(HELPERS);

const geom = async () => pg.evaluate(() => {
  const out = [];
  for (const screen of window.__H.scr()) {
    const lat = screen.querySelector('[data-lattice]');
    const cells = lat.children.length;
    const cs = getComputedStyle(lat);
    const cols = cs.gridTemplateColumns.split(' ').length;
    const step = Math.round(parseFloat(cs.gridAutoRows));
    const stage = document.querySelector('[data-stage]');
    const k = stage.getBoundingClientRect().width / 1920;
    const sr = screen.getBoundingClientRect();
    const onPt = v => { const i = Math.round((v - step) / step); return i >= 0 && Math.abs(step + step * i - v) < 0.75; };
    const off = [];
    for (const f of screen.querySelectorAll('[data-frame]')) {
      if (!window.__H.vis(f)) continue;
      const q = f.getBoundingClientRect();
      const c = [[(q.left-sr.left)/k,(q.top-sr.top)/k],[(q.right-sr.left)/k,(q.top-sr.top)/k],
                 [(q.left-sr.left)/k,(q.bottom-sr.top)/k],[(q.right-sr.left)/k,(q.bottom-sr.top)/k]];
      for (const [x,y] of c) if (!(onPt(x)&&onPt(y))) off.push(`${f.getAttribute('data-frame')} ${x.toFixed(1)},${y.toFixed(1)}`);
    }
    // peg ink vs text ink
    const pegs = [...lat.children].filter(s => s.style.color !== 'transparent' && s.dataset.base !== 'transparent')
      .map(s => { const q = s.getBoundingClientRect(); const m = window.__H.ink(s, '+'); const v = window.__H.band(q, m);
        return { l: q.left + (q.width - m.width)/2, r: q.left + (q.width + m.width)/2, t: v.t, b: v.b }; });
    const texts = []; const w = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT, { acceptNode: n =>
      (n.textContent||'').trim() && !n.parentElement.closest('[data-lattice]') && window.__H.vis(n.parentElement)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const rg = document.createRange();
    for (let n = w.nextNode(); n; n = w.nextNode()) { rg.selectNodeContents(n); const m = window.__H.ink(n, n.textContent);
      for (const q of rg.getClientRects()) { const v = window.__H.band(q, m); texts.push({ l:q.left, r:q.right, t:v.t, b:v.b }); } }
    let hits = 0;
    for (const p of pegs) for (const t of texts)
      if (Math.min(p.r,t.r)-Math.max(p.l,t.l) > 0.5 && Math.min(p.b,t.b)-Math.max(p.t,t.t) > 0.5) { hits++; break; }
    out.push({ screen: screen.getAttribute('data-screen-label') || screen.getAttribute('data-page') || 'screen',
      cells, cols, step, divides: (1920 % step === 0 && 1080 % step === 0),
      frames: screen.querySelectorAll('[data-frame]').length, offLattice: off, pegs: pegs.length, texts: texts.length, overlaps: hits });
  }
  return out;
});

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

console.log('\n--- menu (2a) ---');
for (const g of await geom()) {
  say(g.offLattice.length === 0, `[1] ${g.screen}: ${g.offLattice.length} off-lattice corners of ${g.frames} frames ${g.offLattice.slice(0,3).join(' | ')}`);
  say(g.overlaps === 0, `[2] ${g.screen}: ${g.overlaps} peg/type overlaps (${g.pegs} pegs, ${g.texts} runs)`);
  say(g.divides, `[5] ${g.screen}: step ${g.step} divides 1920 and 1080 (${g.cells} cells, ${g.cols} cols)`);
}

// [3] hover cycle idempotency
console.log('\n--- hover cycle ---');
for (const n of [1,2,3,4]) {
  const before = await pg.evaluate(() => { const s = window.__H.scr()[0]; return { snap: window.__H.snap(s), stats: window.__H.stats(s) }; });
  const box = await pg.evaluate(x => { const c = document.querySelector(`[data-channel="${x}"]`); if (!c) return null;
    const q = c.getBoundingClientRect(); return { x: q.x + q.width/2, y: q.y + q.height/2 }; }, n);
  if (!box) { console.log(`  SKIP  channel ${n} not found`); continue; }
  await pg.mouse.move(box.x, box.y); await pg.waitForTimeout(1500);
  await pg.mouse.move(20, 1060); await pg.waitForTimeout(2400);
  const after = await pg.evaluate(() => { const s = window.__H.scr()[0]; return { snap: window.__H.snap(s), stats: window.__H.stats(s) }; });
  say(before.snap === after.snap, `[3] channel ${n}: lattice identical after hover cycle`);
  say(after.stats.hued === 0, `[3] channel ${n}: ${after.stats.hued} cells left holding a hue`);
  say(before.stats.corners === after.stats.corners, `[3] channel ${n}: corners ${before.stats.corners} -> ${after.stats.corners}`);
}

/*
  Waiting on the STATE rather than on a stopwatch.

  A fixed sleep was fine while every channel took the same time to open, and it
  stopped being fine the moment one of them took a little longer: the Escape
  landed while the transition still owned the stage, `locked` swallowed it, the
  page stayed up, and everything downstream ran against the wrong screen while
  reporting a failure three sections later. These poll instead.
*/
const displayed = () => pg.evaluate(() =>
  [...document.querySelectorAll('[data-page]')]
    .filter((p) => getComputedStyle(p).display !== 'none')
    .map((p) => p.getAttribute('data-page')));

/**
 * Poll until the set of displayed pages holds still, with a floor.
 *
 * The floor is the point. A transition takes a beat to put anything on screen,
 * so "stable for 600ms" is trivially true the instant after the click and this
 * returned the state BEFORE the transition rather than after it — which then
 * had every downstream section running against the wrong screen. `minMs` is
 * longer than the longest open, so stability only counts once the choreography
 * has had its chance.
 */
async function upPages(ms, minMs = 4200) {
  let prev = null;
  let still = 0;
  for (let t = 0; t < ms; t += 200) {
    await pg.waitForTimeout(200);
    const now = (await displayed()).join(',');
    still = now === prev ? still + 1 : 0;
    prev = now;
    if (still >= 3 && t >= minMs) break;
  }
  return prev ? prev.split(',').filter(Boolean) : [];
}

/** Escape until nothing is displayed over the menu. True if it got there. */
async function toMenu(tries = 4) {
  for (let i = 0; i < tries; i++) {
    if ((await displayed()).length === 0) return true;
    await pg.keyboard.press('Escape');
    await upPages(6000, 2600);
  }
  return (await displayed()).length === 0;
}

// [4] transition teardown
console.log('\n--- open + teardown ---');
await pg.evaluate(() => document.querySelector('[data-act="open"][data-open="1"]')?.click());
await pg.waitForTimeout(4200);
const opened = await pg.evaluate(() => { const p = [...document.querySelectorAll('[data-page]')].find(x => getComputedStyle(x).display !== 'none');
  return p ? (p.getAttribute('data-screen-label') || 'page') : 'NONE'; });
say(opened !== 'NONE', `[4] channel 01 opens a page (${opened})`);
await toMenu();

/*
  Escape returns focus to the channel you opened, and a focused channel MUST
  show its band: DO-NOT-BREAK section 2 requires every hover to have a
  focus-visible twin producing the same state. So "empty after teardown" is only
  the right assertion once nothing is focused. Asserting it without blurring
  reports correct behaviour as a leak, which is how this check first read.
  Both halves are checked, so the pair still catches a real stranded band.
*/
await pg.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
await pg.waitForTimeout(1400);
const td = await pg.evaluate(() => { const s = window.__H.scr()[0];
  return { bands: document.querySelectorAll('[data-bandhost] > *').length, stats: window.__H.stats(s),
    menuUp: getComputedStyle(document.querySelector('[data-menu]')).display !== 'none' }; });
say(td.bands === 0, `[4] band host empty once nothing is focused (${td.bands})`);
say(td.stats.hued === 0, `[4] no cell left holding a hue (${td.stats.hued})`);
say(td.menuUp, `[4] menu is back up`);

/*
  A second click DURING the transition must be ignored.

  This assertion used to read "double click still recovers to the menu", and it
  was codifying the bug rather than catching it: two clicks landing inside the
  same open re-entered the choreography, the two runs stomped each other, and
  what the visitor was left looking at was the menu with nothing open at all.
  Clicks are now swallowed at the stage for the length of a transition, so the
  right assertion is that the first click wins and the page it opened is the
  one that is up.
*/
await pg.evaluate(() => { const c = document.querySelector('[data-act="open"][data-open="2"]'); c?.click(); c?.click(); });
const dbl = await upPages(6000);
say(dbl.length === 1 && dbl[0] === '2', `[4] a second click inside the transition is ignored (up: ${dbl.join(',') || 'menu'})`);
say(await toMenu(), '[4] and the page it opened still closes');

// [DO-NOT-BREAK 2] focus parity: a channel reached by keyboard must raise the
// same state a pointer does. Tested with a real Tab rather than by relying on
// focus restoration after a close, which is a separate contract.
/* ---------------------------------------------------------- screen 2b ---
   The mosaic has to satisfy the same invariants at EVERY rest position, not
   just at scroll 0. A block is only shown when it is entirely inside the band,
   so a row that half-fills it would put two of that block's corners off the
   lattice, which is the one thing the whole system rests on.
*/
console.log('\n--- index (2b) ---');
await pg.evaluate(() => document.querySelector('[data-act="open"][data-open="1"]')?.click());
await pg.waitForTimeout(4200);
/*
  The mosaic is driven the way a visitor drives it, and read back from where the
  blocks actually are.

  It used to be driven by writing `scrollTop`, which was correct while this was
  a native scroll container and is now a no-op — the region is `overflow:
  hidden` and `latticescroll.ts` owns the position. A check that sets a value
  nothing reads does not fail; it silently asserts the SAME position four times
  and reports four passes, which is worse than a failure. So the wheel does the
  driving and the first block's own `top` reports the result.
*/
const snaps = await pg.evaluate(() => {
  const r = document.querySelector('[data-ixscroll]');
  return r ? { h: r.clientHeight } : null;
});
const posNow = () => pg.evaluate(() => {
  const b = document.querySelector('[data-ixblock]');
  return b ? -Math.round(parseFloat(b.style.top) || 0) : -1;
});
if (!snaps) { say(false, '[2b] no [data-ixscroll] region'); }
else {
  console.log(`  (band ${snaps.h}px, driven by wheel)`);
  const seenPos = [];
  for (let step = 0; step < 4; step += 1) {
    if (step > 0) {
      await pg.mouse.move(960, 600);
      await pg.mouse.wheel(0, 400);
      await pg.waitForTimeout(1500);
    }
    const pos = await posNow();
    seenPos.push(pos);
    const g = (await geom()).find(x => /product designs/i.test(x.screen));
    if (!g) { say(false, `[2b] scroll ${pos}: screen not found`); continue; }
    say(g.offLattice.length === 0, `[1] scroll ${pos}: ${g.offLattice.length} off-lattice corners of ${g.frames} frames ${g.offLattice.slice(0,2).join(' | ')}`);
    say(g.overlaps === 0, `[2] scroll ${pos}: ${g.overlaps} peg/type overlaps`);
    const part = await pg.evaluate(() => {
      const band = document.querySelector('[data-ixscroll]').getBoundingClientRect();
      let cut = 0;
      for (const b of document.querySelectorAll('[data-ixblock]')) {
        if (getComputedStyle(b).visibility === 'hidden') continue;
        const q = b.getBoundingClientRect();
        if (q.top < band.top - 1 || q.bottom > band.bottom + 1) cut++;
      }
      return cut;
    });
    say(part === 0, `[2b] position ${pos}: ${part} visible blocks cut by the band edge`);
  }
  /*
    The wheel has to have actually moved it, and only ever to a rest position.
    Four distinct offsets, each the start of a mosaic row, is the whole contract
    the redesign rests on: there is no in-between state to get wrong because
    there is no in-between state.
  */
  say(new Set(seenPos).size === 4, `[2b] the wheel walks four distinct positions (${seenPos.join(' -> ')})`);
  say(seenPos.every((p) => [0, 240, 480, 660].includes(p)), `[2b] every one of them is a rest position`);

  // no nested links, and every href matches the data
  const links = await pg.evaluate(() => {
    const a = [...document.querySelectorAll('[data-ixblock] a')];
    return { nested: a.filter(x => x.parentElement.closest('a')).length, total: a.length,
             hrefs: a.map(x => x.getAttribute('href')).filter(Boolean).length };
  });
  say(links.nested === 0, `[2b] ${links.nested} nested links (${links.total} links, ${links.hrefs} with href)`);
  /* Hidden blocks must be out of the tab order, and that has to be asserted by
     TABBING rather than by reading tabIndex. `visibility: hidden` genuinely
     removes descendants from the sequence, but the tabIndex PROPERTY is
     unaffected by it, so a check that reads the property reports every control
     in every scrolled-out block and is simply measuring the wrong thing. */
  // back to the top, through the module's own keyboard contract
  await pg.evaluate(() => document.querySelector('[data-ixscroll]')?.focus());
  await pg.keyboard.press('Home');
  await pg.waitForTimeout(1500);
  let intoHidden = 0;
  for (let i = 0; i < 40; i++) {
    await pg.keyboard.press('Tab');
    intoHidden += await pg.evaluate(() => {
      const a = document.activeElement;
      const b = a && a.closest ? a.closest('[data-ixblock]') : null;
      return b && getComputedStyle(b).visibility === 'hidden' ? 1 : 0;
    });
  }
  say(intoHidden === 0, `[2b] Tab landed inside a hidden block ${intoHidden} times in 40 presses`);
}
await toMenu();

console.log('\n--- focus parity ---');
await pg.mouse.move(1910, 1075); await pg.waitForTimeout(300);
for (let i = 0; i < 24; i++) {
  await pg.keyboard.press('Tab');
  const st = await pg.evaluate(() => ({
    frame: document.activeElement ? document.activeElement.getAttribute('data-frame') : null,
    fv: document.activeElement ? document.activeElement.matches(':focus-visible') : false }));
  if (st.frame && st.frame.startsWith('ch') && st.fv) {
    await pg.waitForTimeout(1200);
    const n = await pg.evaluate(() => document.querySelectorAll('[data-menu] [data-bandhost] > *').length);
    say(n === 1, `[2] keyboard focus on ${st.frame} raises exactly one band (${n})`);
    break;
  }
  if (i === 23) say(false, '[2] never reached a channel cell by Tab');
}

console.log('\nerrors:', errs.length ? errs.slice(0,6) : 'none');
console.log(fails ? `\n${fails} ASSERTION(S) FAILED` : '\nALL ASSERTIONS PASSED');
await b.close();
process.exit(fails ? 1 : 0);
