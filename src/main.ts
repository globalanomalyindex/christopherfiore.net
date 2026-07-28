/**
 * Entry point. Mounts the stage, fits it to the viewport, runs the intro, and
 * keeps the closed pages out of the accessibility tree.
 */

import './styles/fonts.css';
import './styles/base.css';
import './styles/motion.css';
import './styles/menu.css';
import './styles/pages.css';
import './styles/mobile.css';

import { qq } from './dom.ts';
import { buildMobile, isMobile } from './mobile.ts';
import { fitStage, mountStage } from './runtime/stage.ts';
import { runIntro } from './runtime/transitions.ts';

/**
 * A page is present in the accessibility tree only while it is displayed.
 * transitions.ts drives `display` on `[data-page]`; nothing there touches
 * aria-hidden or inert, so mirror it from here. The menu goes inert whenever
 * any page is up, so Tab cannot reach the channels behind an open page.
 */
function syncPageA11y(stage: HTMLElement): void {
  const pages = qq(stage, '[data-page]');
  const menu = stage.querySelector<HTMLElement>('[data-menu]');

  const apply = (): void => {
    let anyOpen = false;
    for (const page of pages) {
      const shown = getComputedStyle(page).display !== 'none';
      if (shown) anyOpen = true;
      page.toggleAttribute('inert', !shown);
      page.setAttribute('aria-hidden', shown ? 'false' : 'true');
    }
    if (menu) {
      menu.toggleAttribute('inert', anyOpen);
      menu.setAttribute('aria-hidden', anyOpen ? 'true' : 'false');
    }
  };

  apply();

  // The only thing that changes a page's visibility is an inline style write.
  const obs = new MutationObserver(apply);
  for (const page of pages) obs.observe(page, { attributes: true, attributeFilter: ['style'] });
}

let mounted = false;

function boot(): void {
  if (mounted) return;
  const app = document.getElementById('app');
  if (!app) return;
  mounted = true;

  /*
    Below ~900px the stage's 13px metadata scales under 6px, so the fixed stage
    stops being a legible design and src/mobile.ts's plain document view takes
    over. The choice is made once, at boot: swapping between the two live would
    mean tearing down the frost loops and the whole runtime mid-session, which
    is not worth it for a window someone dragged narrow.
  */
  if (isMobile()) {
    app.appendChild(buildMobile());
    return;
  }

  document.body.classList.add('ps-stage-host');

  const stage = mountStage(app);
  fitStage(stage);
  syncPageA11y(stage);
  runIntro(stage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
