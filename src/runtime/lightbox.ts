/**
 * The image viewer, shared by every subpage that carries a plate.
 *
 * Four screens show photographs inside a 727 × 436 plate: the Kona N evidence
 * viewer, chellbook's boards, and the mfny and chipotle before/after plates.
 * At that size a 1600 × 3338 flow board is unreadable. Clicking the plate opens
 * the image here instead, as large as the stage allows and never past its own
 * natural size, with a subdued ground you click to get out.
 *
 * ONE MODULE, NOT FOUR. This is the first thing on the site that is genuinely
 * cross-cutting rather than per-screen, so it does not follow the one-runtime-
 * per-screen pattern. Each plate carries a single `data-act="zoom"` button and
 * this module reads whichever slot is showing at the moment it opens, so
 * nothing has to keep a copy of the current image in sync.
 *
 * IT LIVES INSIDE THE STAGE, on purpose. Everything else on this site is drawn
 * in 1920 × 1080 space and scaled as a unit, and an overlay outside that would
 * be the only element on the page that does not move with the letterbox. The
 * stage is also what the visitor perceives as the window, so "as large as the
 * window allows" and "as large as the stage allows" are the same sentence.
 */

import { el, focusInto, q, qq } from '../dom.ts';
import { COLOR, rgba, TIMING } from '../design/tokens.ts';
import { STAGE } from '../design/layout.ts';
import { dIn, killAnim } from './dither.ts';
import { state } from './state.ts';
import { REDUCED_FADE } from './transitions.ts';

const MAJOR = rgba(COLOR.lavender, 0.28);

/** The inset the ground occupies around the image, in stage px. */
const PAD_X = 64;
const PAD_TOP = 64;
/** Bottom needs more: the caption and the close row sit in it. */
const PAD_BOTTOM = 104;

const BOX_W = STAGE.w - PAD_X * 2;
const BOX_H = STAGE.h - PAD_TOP - PAD_BOTTOM;

/**
 * How much of the box's width a height-fitted image has to keep for fitting to
 * height to be the better answer. Below it, the image is fitted to width and
 * scrolled instead. 0.55 puts chellbook's tall flow boards on the scrolling
 * side and everything else on the no-scroll side.
 */
const MIN_HEIGHT_FIT = 0.55;

/** Blur radius for the image's dither-in. Suits a box this size. */
const OPEN_MB = 18;
const FADE = 220;

/** Stages whose viewer is up, and the control it grew out of. */
const OPEN = new WeakSet<HTMLElement>();
const FROM = new WeakMap<HTMLElement, HTMLElement>();

export function lightboxOpen(stage: HTMLElement): boolean {
  return OPEN.has(stage);
}

/* ------------------------------------------------------------------ build */

const BTN: Record<string, string> = {
  appearance: 'none',
  '-webkit-appearance': 'none',
  background: 'transparent',
  border: '0',
  'border-radius': '0',
  margin: '0',
  padding: '0',
  color: 'inherit',
  font: 'inherit',
  'letter-spacing': 'inherit',
  'text-align': 'inherit',
  'text-decoration': 'none',
  cursor: 'pointer',
};

const css = (o: Record<string, string | number | null>): string =>
  Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}:${typeof v === 'number' ? `${v}px` : v}`)
    .join(';');

/**
 * Build the viewer once per stage.
 *
 * The ground is a real button covering the whole stage, so "click outside the
 * image to leave" is a control with a name rather than a bare listener, and it
 * works from the keyboard without a second affordance.
 */
export function installLightbox(stage: HTMLElement): void {
  if (q(stage, '[data-lightbox]')) return;

  const ground = el('button', {
    type: 'button',
    'data-lbground': true,
    'data-nohl': true,
    'aria-label': 'Close the image',
    style: css({
      ...BTN,
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      background: rgba(COLOR.nearBlack, 0.88),
      cursor: 'zoom-out',
    }),
  });

  /*
    The scroll box shrinks to the image; the frame around it only centres.

    This used to be one box filling the whole 1792 × 912 area with the image
    centred inside it, and that box sat ABOVE the ground. Every click in the
    empty space around the image therefore landed on a transparent div with no
    handler and did nothing, which made "click anywhere outside" a lie
    everywhere except the last 64px at the very edge of the stage.

    So the frame takes the space and `pointer-events: none`, and the scroll box
    takes back `auto`. Anything that is not the image or its scrollbar now falls
    through to the ground, which is the only element that closes.
  */
  const frame = el('div', {
    'data-lbframe': true,
    style: css({
      position: 'absolute',
      left: PAD_X,
      top: PAD_TOP,
      width: BOX_W,
      height: BOX_H,
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'pointer-events': 'none',
      'z-index': '2',
    }),
  });

  // A board taller than the stage is fitted to width and scrolled rather than
  // shrunk to 437px, which is what fitting its height would do to chellbook's
  // 1600 × 3338 flows and would defeat the point of opening it.
  const scroll = el('div', {
    'data-lbscroll': true,
    tabindex: '0',
    role: 'group',
    'aria-label': 'The image, scrollable',
    style: css({
      'max-width': '100%',
      'max-height': '100%',
      overflow: 'auto',
      'overscroll-behavior': 'contain',
      'pointer-events': 'auto',
    }),
  });
  frame.appendChild(scroll);

  const img = el('img', {
    'data-lbimg': true,
    decoding: 'async',
    style: css({
      display: 'block',
      height: 'auto',
      border: `1px solid ${MAJOR}`,
      background: rgba(COLOR.lavender, 0.06),
      cursor: 'default',
    }),
  });
  scroll.appendChild(img);

  const cap = el('p', {
    'data-lbcap': true,
    style: css({
      position: 'absolute',
      left: PAD_X,
      top: STAGE.h - PAD_BOTTOM + 16,
      width: BOX_W - 220,
      margin: '0',
      'font-size': 13,
      'letter-spacing': '.06em',
      'line-height': '1.5',
      opacity: '.72',
      'z-index': '2',
    }),
  });

  const close = el(
    'button',
    {
      type: 'button',
      'data-act': 'zoom-close',
      'data-nohl': true,
      class: 'ps-hov-invert-dark',
      'aria-label': 'Close the image, back to the case',
      style: css({
        ...BTN,
        position: 'absolute',
        right: PAD_X,
        top: STAGE.h - PAD_BOTTOM + 10,
        height: 36,
        padding: '0 18px',
        display: 'flex',
        'align-items': 'center',
        gap: 12,
        border: `1px solid ${COLOR.lavender}`,
        'font-size': 13,
        'letter-spacing': '.16em',
        'z-index': '3',
        transition: 'background 150ms linear,color 150ms linear',
      }),
    },
    el('span', { 'aria-hidden': 'true', style: css({ 'font-size': 15 }) }, '✕'),
    'close',
  );

  const root = el(
    'div',
    {
      'data-lightbox': true,
      'data-screen-label': 'Image viewer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Image viewer',
      style: css({
        position: 'absolute',
        inset: '0',
        'z-index': '12',
        display: 'none',
        color: COLOR.lavender,
      }),
    },
    ground,
    frame,
    cap,
    close,
  );

  stage.appendChild(root);
}

/* ------------------------------------------------------------------- open */

/** The image the plate this trigger belongs to is currently showing. */
function shownImage(trigger: HTMLElement): HTMLImageElement | null {
  const plate = trigger.parentElement;
  if (!plate) return null;
  const imgs = qq<HTMLImageElement>(plate, 'img');
  if (!imgs.length) return null;
  // Every plate marks the slot it is showing; fall back to opacity, then to
  // the first, so a screen that stops maintaining aria-hidden still opens
  // something rather than nothing.
  for (const im of imgs) {
    const slot = im.parentElement;
    if (slot && slot.getAttribute('aria-hidden') === 'false') return im;
  }
  for (const im of imgs) {
    const slot = im.parentElement;
    if (slot && getComputedStyle(slot).opacity === '1') return im;
  }
  return imgs[0];
}

export function openLightbox(stage: HTMLElement, trigger: HTMLElement): void {
  if (OPEN.has(stage)) return;
  const root = q(stage, '[data-lightbox]');
  const img = q<HTMLImageElement>(stage, '[data-lbimg]');
  const scroll = q(stage, '[data-lbscroll]');
  const cap = q(stage, '[data-lbcap]');
  const src = shownImage(trigger);
  if (!root || !img || !scroll || !cap || !src) return;

  OPEN.add(stage);
  FROM.set(stage, trigger);

  /*
    Two rules decide the size.

    Natural size is the ceiling. Opening a 1456px capture at the box's 1792
    would upscale it, which is the opposite of what "full res" means: this
    shows every pixel the file has and no invented ones. The plate shows the
    same file at 727, so this is still a little over twice the size.

    Then: fit to height when that still leaves a usable image, and only fall
    back to fitting the width and scrolling when it would not. A board that
    overflows the box by 30px should not become a scrolling page over 30px, and
    chellbook's 1600 x 3338 flows should not be squeezed to 437px wide to avoid
    one. The threshold is where fitting to height stops being worth it.
  */
  const nw = src.naturalWidth || Number(src.getAttribute('width')) || BOX_W;
  const nh = src.naturalHeight || Number(src.getAttribute('height')) || BOX_H;
  const heightFit = nh > 0 ? nw * (BOX_H / nh) : BOX_W;
  const width =
    heightFit >= BOX_W * MIN_HEIGHT_FIT
      ? Math.min(heightFit, nw, BOX_W)
      : Math.min(BOX_W, nw);

  img.src = src.currentSrc || src.src;
  img.alt = src.alt;
  img.style.width = `${Math.round(width)}px`;
  img.style.maxWidth = '100%';
  cap.textContent = src.alt;

  scroll.scrollTop = 0;
  root.style.display = 'block';

  // the screen underneath stops being reachable while this is up
  const screen = trigger.closest<HTMLElement>(
    '[data-evidence],[data-chellbook],[data-mfny],[data-chipotle]',
  );
  if (screen) screen.setAttribute('inert', '');

  killAnim(root);
  const s = state(stage);
  if (s.reduced) {
    root.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: REDUCED_FADE,
      easing: 'linear',
      fill: 'both',
    });
  } else {
    root.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: FADE,
      easing: TIMING.easeOpen,
      fill: 'both',
    });
    // the image resolves out of noise, as every other plate on this site does
    dIn(img, 40, 420, OPEN_MB);
  }

  focusInto(q(root, '[data-act="zoom-close"]'));
}

/* ------------------------------------------------------------------ close */

export function closeLightbox(stage: HTMLElement): void {
  if (!OPEN.has(stage)) return;
  const root = q(stage, '[data-lightbox]');
  const img = q<HTMLImageElement>(stage, '[data-lbimg]');
  if (!root) return;

  OPEN.delete(stage);
  const trigger = FROM.get(stage) || null;
  FROM.delete(stage);

  const finish = (): void => {
    root.style.display = 'none';
    killAnim(root);
    if (img) {
      img.style.filter = '';
      // drop the bytes: the plate still holds its own copy, and a viewer
      // holding a 1600 × 3338 board decoded forever is a real cost
      img.removeAttribute('src');
    }
    // uninert BEFORE returning focus, or the trigger is not focusable yet
    for (const sc of qq(stage, '[data-evidence],[data-chellbook],[data-mfny],[data-chipotle]')) {
      sc.removeAttribute('inert');
    }
    focusInto(trigger);
  };

  const s = state(stage);
  const dur = s.reduced ? REDUCED_FADE : FADE;
  root.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: dur,
    easing: 'cubic-bezier(.4,0,1,1)',
    fill: 'both',
  });
  window.setTimeout(finish, dur);
}

/* ---------------------------------------------------------------- trigger */

/**
 * The control that opens a plate. Appended as the plate's last child so it
 * covers the slots, and marked `data-nohl` because `wireHovers` would
 * otherwise build its band stack behind a photograph.
 */
export function zoomTrigger(label: string): HTMLElement {
  return el(
    'button',
    {
      type: 'button',
      'data-act': 'zoom',
      'data-nohl': true,
      'aria-label': label,
      style: css({
        ...BTN,
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        'z-index': '4',
        cursor: 'zoom-in',
      }),
    },
  );
}
