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
import { fitWhenReady } from './runtime/fit.ts';
import { runIntro } from './runtime/transitions.ts';

const OPAQUE = (c: string): boolean => !!c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';

/**
 * Paint the letterbox to match the edge it touches.
 *
 * The stage scales uniformly, so on any viewport that is not exactly 16:9 there
 * is a margin around it. Scaling to *cover* instead would remove the margin but
 * crop the design: 96px off each side at 16:10, which eats the left gutter and
 * the close control, or 135px top and bottom on a 21:9 display, which eats the
 * whole header and footer. So the stage keeps its uniform scale, and the margin
 * is made invisible instead of removed.
 *
 * One flat color is not quite enough. Most screens are a single ground, but the
 * menu ends in the near-black contact strip, so a flat rust backdrop leaves a
 * rust band under it that reads as a mistake. The backdrop is therefore a
 * two-stop gradient with a hard edge at the strip's own top, in viewport
 * coordinates: above it the screen's ground, below it the strip's. On a
 * side-letterboxed display that also lines the side bars up correctly, which a
 * 50% split would not.
 */
function paintBackdrop(stage: HTMLElement): void {
  const shown = (n: HTMLElement) => getComputedStyle(n).display !== 'none';
  const top =
    qq(stage, '[data-chellbook],[data-evidence],[data-about],[data-df2tm],[data-mfny],[data-chipotle],[data-lee],[data-guestpass]').find(shown) ??
    qq(stage, '[data-page]').find(shown) ??
    stage.querySelector<HTMLElement>('[data-menu]');

  const stageBg = getComputedStyle(stage).backgroundColor;
  const screenBg = top ? getComputedStyle(top).backgroundColor : '';
  const ground = OPAQUE(screenBg) ? screenBg : stageBg;

  const root = document.documentElement.style;

  // A band with its own ground sitting on the screen's bottom edge — the menu's
  // contact strip is the only one today, but this finds any of them.
  const box = stage.getBoundingClientRect();
  const foot = top
    ? Array.from(top.children)
        .filter((n): n is HTMLElement => n instanceof HTMLElement)
        .find((n) => {
          const r = n.getBoundingClientRect();
          const bg = getComputedStyle(n).backgroundColor;
          return OPAQUE(bg) && bg !== ground && Math.abs(r.bottom - box.bottom) < 2 && r.height > 0;
        })
    : undefined;

  if (!foot) {
    root.setProperty('--ps-backdrop', ground);
    return;
  }
  const edge = Math.round(foot.getBoundingClientRect().top);
  root.setProperty(
    '--ps-backdrop',
    `linear-gradient(to bottom, ${ground} 0 ${edge}px, ${getComputedStyle(foot).backgroundColor} ${edge}px 100%)`,
  );
}

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
    paintBackdrop(stage);
  };

  apply();

  // The only thing that changes a screen's visibility is an inline style write.
  const obs = new MutationObserver(apply);
  for (const page of pages) obs.observe(page, { attributes: true, attributeFilter: ['style'] });
  // The two case-study screens sit inside a page and toggle independently, so
  // they need watching too or the backdrop keeps the page's ground under them.
  for (const sub of qq(stage, '[data-chellbook],[data-evidence],[data-about],[data-df2tm],[data-mfny],[data-chipotle],[data-lee],[data-guestpass]')) {
    obs.observe(sub, { attributes: true, attributeFilter: ['style'] });
  }
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
  // Display sizes are measured, not computed — the face is proportional now.
  // Runs behind document.fonts.ready, which lands before anything is painted
  // because every face is font-display: block.
  fitWhenReady(stage);
  syncPageA11y(stage);

  /*
    The backdrop's gradient stop is a viewport pixel offset, so it has to be
    recomputed whenever the stage is refitted. rAF-coalesced for the same reason
    fitStage is: a drag fires resize far faster than a paint is worth.
  */
  let pending = 0;
  const repaint = (): void => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      if (stage.isConnected) paintBackdrop(stage);
    });
  };
  window.addEventListener('resize', repaint, { passive: true });
  window.visualViewport?.addEventListener('resize', repaint, { passive: true });

  runIntro(stage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
