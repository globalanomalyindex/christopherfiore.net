/**
 * The stage: one fixed 1920 × 1080 box holding the menu and the four pages,
 * scaled as a unit to fit the viewport.
 *
 * The element carries BOTH `data-stage` and `data-frame-root`. `data-stage` is
 * this codebase's name for it (src/styles/base.css, dither.ts, channels.ts,
 * hover.ts); `data-frame-root` is the prototype's, and frost.ts and glitch.ts
 * still resolve their scope through it. Carrying both is cheaper than editing
 * two runtime modules for a selector.
 */

import { el, qq } from '../dom';
import { STAGE } from '../design/layout';
import * as menuPage from '../pages/menu';
import * as productsPage from '../pages/products';
import * as paintingsPage from '../pages/paintings';
import * as competizionePage from '../pages/competizione';
import * as contactPage from '../pages/contact';
import { bindActions } from './actions';
import { installDitherDefs } from './dither';
import { installLightbox } from './lightbox';
import { startFrost, trackFrost } from './frost';
import { wireHovers } from './hover';
import { LAT_MENU } from '../design/lattice';
import { mountLattice, solveLattice, startDrift, watchLattice } from './lattice';

/**
 * Build the stage and wire every runtime that needs a live DOM.
 *
 * Order matters: the stage is in the document before anything measures it,
 * because trackFrost and wireHovers both read computed style / layout rects.
 */
export function mountStage(root: HTMLElement): HTMLElement {
  const stage = el('div', {
    'data-stage': true,
    'data-frame-root': true,
    'data-screen-label': 'Stage',
  });

  stage.appendChild(menuPage.build());
  stage.appendChild(productsPage.build());
  stage.appendChild(paintingsPage.build());
  stage.appendChild(competizionePage.build());
  stage.appendChild(contactPage.build());

  root.appendChild(stage);

  // The shared <defs> must exist before any dfxFilter() call clones from it.
  installDitherDefs(stage);

  // One viewer for every plate on the site. After the pages, so it is the last
  // child and sits above them without needing a larger z-index than it has.
  installLightbox(stage);

  // Every canvas, menu and page alike. trackFrost only adopts the menu's, so
  // the page canvases would otherwise stay dark until their first transition.
  for (const cv of qq<HTMLCanvasElement>(stage, 'canvas[data-frost]')) startFrost(cv);

  trackFrost(stage);

  for (const page of qq(stage, '[data-page]')) wireHovers(page);
  // The menu too. It is `[data-menu]`, so it was never in the list above, and
  // its band host sat unused. Channel cells are excluded by `EXCLUDE`, so this
  // reaches the rails and the email link only.
  const menuScreen = stage.querySelector<HTMLElement>('[data-menu]');
  if (menuScreen) wireHovers(menuScreen);

  bindActions(stage);

  /*
    The lattice, last, because `solveLattice` reads every frame's rendered
    corners and every text run's rects out of the live DOM. Mounting it before
    the screens exist would resolve an empty field.

    `watchLattice` re-resolves on fonts, resize, visibility and mutation.
    document.fonts.ready is the one that matters most: solving against the
    fallback measures a face whose metrics have nothing to do with this one, and
    the result does not look broken, it looks like a few stray crosshairs.
  */
  const menu = stage.querySelector<HTMLElement>('[data-menu]');
  if (menu) {
    mountLattice(menu, LAT_MENU);
    watchLattice(menu);
    solveLattice(menu);
    startDrift(menu);
  }

  return stage;
}

/* ------------------------------------------------------------------- fit */

const BOUND = new WeakSet<HTMLElement>();

/**
 * Scale the stage to fit: `k = min(vw/1920, vh/1080)`, centerd, letterboxed.
 *
 * base.css sets `transform-origin: 0 0`, so the translate is a plain offset in
 * viewport px and does not need dividing by k. `--ps-k` is published on the
 * stage for anything that needs to convert viewport px back to design px.
 */
export function fitStage(stage: HTMLElement): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const k = Math.min(vw / STAGE.w, vh / STAGE.h);
  const ox = (vw - STAGE.w * k) / 2;
  const oy = (vh - STAGE.h * k) / 2;

  stage.style.transform = `translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px) scale(${k.toFixed(6)})`;
  stage.style.setProperty('--ps-k', k.toFixed(6));

  if (BOUND.has(stage)) return;
  BOUND.add(stage);

  let raf = 0;
  const schedule = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (stage.isConnected) fitStage(stage);
    });
  };

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  // Mobile URL bars change innerHeight without firing a useful window resize.
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
}
