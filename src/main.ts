/**
 * The browser side. The page arrives as finished HTML (see `render.ts`); this
 * only adds behavior on top of it, so with scripts off the site is still
 * every word of itself and every link still works.
 *
 *   buttons   band, glitch, magnet: at once, on every device
 *   reserve   each label's hover width, once both faces have loaded
 *   seams     the parting words and the skeleton: pointers that hover only
 */

import { initButtons } from './runtime/buttons.ts';
import { reserve } from './runtime/glitch.ts';
import { initSeams, relayoutAll } from './runtime/seams.ts';

initButtons();

// Its own chunk, fetched only on the page that has a signature.
// If it fails to load, the signature is handed back at once rather than at
// the gate's 3s failsafe.
if (document.querySelector('[data-sig]')) {
  import('./runtime/signature.ts').catch(() => document.documentElement.classList.remove('sig-wait'));
}

/**
 * Both faces in, or as in as they are going to get. A face that fails to load
 * (a font blocker, a network error) rejects its promise; that must not stop
 * the runtime, so every load is settled rather than awaited, and a slow
 * network gets a ceiling. The reservation then measures whatever face won.
 */
const fontsReady = (): Promise<unknown> =>
  Promise.race([
    document.fonts
      ? Promise.allSettled([
          document.fonts.load("40px 'Dessign Maison'"),
          document.fonts.load("40px 'Averia Serif Libre'"),
          document.fonts.ready,
        ])
      : Promise.resolve(),
    new Promise((r) => setTimeout(r, 4000)),
  ]);

/** Seams need a cursor that can rest somewhere. A finger cannot. */
const canHover = matchMedia('(hover: hover) and (pointer: fine)');

fontsReady().then(() => {
  reserve(document);
  if (canHover.matches) {
    document.querySelectorAll<HTMLElement>('[data-seams-root]').forEach(initSeams);
  }

  // The type scale is fluid, so a resize can move a label onto two lines or
  // back. Re-reserve once it settles, and drop the seam model that the new
  // widths just made stale.
  // A face that turned up after the ceiling above changes every width.
  document.fonts?.addEventListener?.('loadingdone', () => {
    reserve(document);
    relayoutAll();
  });

  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      reserve(document);
      relayoutAll();
    }, 150);
  });
});
