/**
 * One delegated binder for the whole stage.
 *
 * The prototype's `onClick="{{ openPage }}"` / `onMouseEnter="{{ prodOn }}"`
 * attributes become `data-act` / `data-hov`, read here. Nothing else in the
 * codebase attaches a click or hover listener to a click target.
 *
 * Enter/Space are deliberately NOT handled: every target is a real <button>
 * or <a>, so the UA already synthesises a click. Handling them here would
 * double-fire, and preventDefault-ing them would break the native behavior.
 */

import { q, qq } from '../dom';
import {
  prodOff,
  prodOn,
  scafMove,
  sweepOff,
  sweepOn,
  waterOff,
  waterOn,
} from './channels';
import { closeEvidence, goEvidence, openEvidence, stepEvidence } from './evidence';
import {
  chellbookOpen,
  closeChellbook,
  goChellbook,
  openChellbook,
  stepChellbook,
} from './chellbook';
import { aboutOpen, closeAbout, goAbout, openAbout } from './about';
import { closeDf2tm, df2tmOpen, goDf2tm, openDf2tm } from './df2tm';
import { closeMfny, mfnyOpen, openMfny, setMfnyView } from './mfny';
import { chipotleOpen, closeChipotle, openChipotle, setChipotleView } from './chipotle';
import { CHIPOTLE_VIEWS } from '../pages/chipotle.ts';
import { closePage, nextPage, openPage, runIntro } from './transitions';
import { locked, state } from './state';

/** How many channels the stage carries. ArrowLeft/Right cycle through them. */
const CHANNELS = 4;

const BOUND = new WeakSet<HTMLElement>();

const num = (el: Element, attr: string): number => Number(el.getAttribute(attr)) || 0;

/* ----------------------------------------------------------- panel swaps */

/**
 * Row hover → detail panel. Page 01 crossfades the key-frame slot (the 240ms
 * linear transition lives on the slot's inline style); page 03 swaps the hero
 * render. Both carry the caption and the fig number on the row, so one
 * implementation covers them.
 *
 * There is no "off": the panel holds the last selection, as in the prototype.
 */
function swapSlot(row: HTMLElement, attr: 'data-case' | 'data-system'): void {
  const page = row.closest<HTMLElement>('[data-page]');
  if (!page) return;

  const n = row.getAttribute(attr);
  if (n === null) return;

  for (const slot of qq(page, '[data-cslot]')) {
    const on = slot.getAttribute('data-cslot') === n;
    slot.style.opacity = on ? '1' : '0';
    // opacity:0 does not leave the accessibility tree. Without this, every
    // key-frame's alt text is announced at once, which is what the four
    // sibling slot swappers already guard against.
    slot.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  const cap = q(page, '[data-ccap]');
  const capText = row.getAttribute('data-cap');
  if (cap && capText) cap.textContent = capText;

  const fig = q(page, '[data-cfig]');
  const figText = row.getAttribute('data-fig');
  if (fig && figText) fig.textContent = figText;
}

/* --------------------------------------------------------- hover routing */

type HovKind = 'prod' | 'water' | 'sweep' | 'case' | 'system';

const HOV_ON: Partial<Record<HovKind, (cell: HTMLElement) => void>> = {
  prod: prodOn,
  water: waterOn,
  sweep: sweepOn,
};

const HOV_OFF: Partial<Record<HovKind, (cell: HTMLElement) => void>> = {
  prod: prodOff,
  water: waterOff,
  sweep: sweepOff,
};

/**
 * Pointer and keyboard focus both raise the same hover, so each target keeps
 * two independent flags and the personality runs on the OR of them. Without
 * this, tabbing out of a focused channel while the cursor is still inside it
 * would tear the animation down (and waterOn/waterOff are a whole simulation —
 * they must be balanced exactly once each).
 */
interface HovFlags {
  pointer: boolean;
  focus: boolean;
  on: boolean;
}

const FLAGS = new WeakMap<HTMLElement, HovFlags>();

const flagsOf = (el: HTMLElement): HovFlags => {
  let f = FLAGS.get(el);
  if (!f) {
    f = { pointer: false, focus: false, on: false };
    FLAGS.set(el, f);
  }
  return f;
};

function refreshHov(el: HTMLElement, kind: HovKind): void {
  const f = flagsOf(el);
  const want = f.pointer || f.focus;
  if (want === f.on) return;
  f.on = want;
  const fn = want ? HOV_ON[kind] : HOV_OFF[kind];
  fn?.(el);
}

function enterHov(el: HTMLElement, kind: HovKind, viaFocus: boolean): void {
  const f = flagsOf(el);
  if (viaFocus) f.focus = true;
  else f.pointer = true;
  refreshHov(el, kind);
}

function leaveHov(el: HTMLElement, kind: HovKind, viaFocus: boolean): void {
  const f = flagsOf(el);
  if (viaFocus) f.focus = false;
  else f.pointer = false;
  refreshHov(el, kind);
}

/** Row selections write through to the stage's state so it stays the truth. */
function selectRow(stage: HTMLElement, row: HTMLElement, kind: 'case' | 'system'): void {
  const s = state(stage);
  if (kind === 'case') s.selectedCase = num(row, 'data-case');
  else s.selectedSystem = num(row, 'data-system');
  swapSlot(row, kind === 'case' ? 'data-case' : 'data-system');
}

/* -------------------------------------------------------------- bindings */

export function bindActions(stage: HTMLElement): void {
  if (BOUND.has(stage)) return;
  BOUND.add(stage);

  const hovTarget = (t: EventTarget | null): HTMLElement | null =>
    t instanceof Element ? t.closest<HTMLElement>('[data-hov]') : null;

  const kindOf = (el: HTMLElement): HovKind | null => {
    const v = el.getAttribute('data-hov');
    return v === 'prod' || v === 'water' || v === 'sweep' || v === 'case' || v === 'system'
      ? v
      : null;
  };

  /* ---- click ---- */

  stage.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-act]') : null;
    if (!t) return;

    switch (t.getAttribute('data-act')) {
      case 'open':
        openPage(stage, num(t, 'data-open'), t);
        break;
      case 'close':
        // Defensive: a page's own close controls are inert while a case-study
        // screen is up, so this can only be reached if that ever stops holding.
        if (state(stage).evidence !== null) closeEvidence(stage);
        else if (chellbookOpen(stage)) closeChellbook(stage);
        else if (aboutOpen(stage)) closeAbout(stage);
        else if (df2tmOpen(stage)) closeDf2tm(stage);
        else if (mfnyOpen(stage)) closeMfny(stage);
        else if (chipotleOpen(stage)) closeChipotle(stage);
        else closePage(stage);
        break;
      case 'evidence':
        // the hero and the four system rows — the viewer grows out of `t`
        openEvidence(stage, t);
        break;
      case 'evidence-close':
        closeEvidence(stage);
        break;
      case 'evidence-go':
        goEvidence(stage, num(t, 'data-sheet'));
        break;
      case 'evidence-step':
        stepEvidence(stage, num(t, 'data-step'));
        break;
      case 'chellbook':
        // the chellbook row — the case study grows out of the row that opened it
        openChellbook(stage, t);
        break;
      case 'chellbook-close':
        closeChellbook(stage);
        break;
      case 'chellbook-go':
        goChellbook(stage, num(t, 'data-board'));
        break;
      case 'chellbook-step':
        stepChellbook(stage, num(t, 'data-step'));
        break;
      case 'mfny':
        // the MFNY row — the screen grows out of the row that opened it
        openMfny(stage, t);
        break;
      case 'mfny-close':
        closeMfny(stage);
        break;
      case 'mfny-view':
        setMfnyView(stage, num(t, 'data-view'));
        break;
      case 'chipotle':
        // the chipotle row — the screen grows out of the row that opened it
        openChipotle(stage, t);
        break;
      case 'chipotle-close':
        closeChipotle(stage);
        break;
      case 'chipotle-view':
        setChipotleView(stage, num(t, 'data-view'));
        break;
      case 'df2tm':
        // the df2tm row — the screen grows out of the row that opened it
        openDf2tm(stage, t);
        break;
      case 'df2tm-close':
        closeDf2tm(stage);
        break;
      case 'df2tm-go':
        goDf2tm(stage, num(t, 'data-dfrow'));
        break;
      case 'about':
        // page 04's "read the full background" — the screen grows out of it
        openAbout(stage, t);
        break;
      case 'about-close':
        closeAbout(stage);
        break;
      case 'about-go':
        goAbout(stage, num(t, 'data-abrow'));
        break;
      case 'next':
        nextPage(stage, num(t, 'data-next'));
        break;
      case 'replay':
        // the replay control sits inside the header cell — don't let the click
        // travel on to anything that might also claim it
        e.stopPropagation();
        runIntro(stage);
        break;
    }
  });

  /* ---- hover ----
     pointerover/pointerout bubble (pointerenter/pointerleave do not), and the
     relatedTarget check turns them into exact enter/leave semantics. */

  stage.addEventListener(
    'pointerover',
    (e) => {
      const t = hovTarget(e.target);
      if (!t) return;
      const rel = e.relatedTarget;
      if (rel instanceof Node && t.contains(rel)) return; // move within the target
      const kind = kindOf(t);
      if (!kind) return;
      if (kind === 'case' || kind === 'system') selectRow(stage, t, kind);
      else enterHov(t, kind, false);
    },
    { passive: true },
  );

  stage.addEventListener(
    'pointerout',
    (e) => {
      const t = hovTarget(e.target);
      if (!t) return;
      const rel = e.relatedTarget;
      if (rel instanceof Node && t.contains(rel)) return;
      const kind = kindOf(t);
      if (!kind || kind === 'case' || kind === 'system') return;
      leaveHov(t, kind, false);
    },
    { passive: true },
  );

  // 01's scaffolding guides and "col NN · row NN" label track the cursor.
  stage.addEventListener(
    'pointermove',
    (e) => {
      const t = hovTarget(e.target);
      if (!t || t.getAttribute('data-hov') !== 'prod') return;
      scafMove(t, e);
    },
    { passive: true },
  );

  /* ---- focus: same treatment, so a keyboard user sees the same thing ---- */

  stage.addEventListener('focusin', (e) => {
    const t = hovTarget(e.target);
    if (!t) return;
    const kind = kindOf(t);
    if (!kind) return;
    if (kind === 'case' || kind === 'system') {
      selectRow(stage, t, kind);
      return;
    }
    // A mouse click focuses the channel too; only a real keyboard focus should
    // raise the personality, or the band would stay up after the pointer left.
    if (t.matches(':focus-visible')) enterHov(t, kind, true);
  });

  stage.addEventListener('focusout', (e) => {
    const t = hovTarget(e.target);
    if (!t) return;
    const rel = e.relatedTarget;
    if (rel instanceof Node && t.contains(rel)) return;
    const kind = kindOf(t);
    if (!kind || kind === 'case' || kind === 'system') return;
    leaveHov(t, kind, true);
  });

  /* ---- keyboard ---- */

  document.addEventListener('keydown', (e) => {
    if (!stage.isConnected) return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

    const s = state(stage);

    /* Escape and the arrows always belong to the topmost surface: the evidence
       viewer while it is up, the page underneath otherwise. Without this,
       Escape would close the channel out from under an open viewer and the
       arrows would advance to page 04 behind it. */

    if (e.key === 'Escape') {
      if (locked(stage)) return;
      if (s.evidence !== null) {
        e.preventDefault();
        closeEvidence(stage);
        return;
      }
      if (chellbookOpen(stage)) {
        e.preventDefault();
        closeChellbook(stage);
        return;
      }
      if (aboutOpen(stage)) {
        e.preventDefault();
        closeAbout(stage);
        return;
      }
      if (df2tmOpen(stage)) {
        e.preventDefault();
        closeDf2tm(stage);
        return;
      }
      if (mfnyOpen(stage)) {
        e.preventDefault();
        closeMfny(stage);
        return;
      }
      if (chipotleOpen(stage)) {
        e.preventDefault();
        closeChipotle(stage);
        return;
      }
      if (s.open === null) return;
      e.preventDefault();
      closePage(stage);
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (locked(stage)) return;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      if (s.evidence !== null) {
        e.preventDefault();
        stepEvidence(stage, step);
        return;
      }
      if (chellbookOpen(stage)) {
        e.preventDefault();
        stepChellbook(stage, step);
        return;
      }
      /* The about screen is prose in a scroll column, not a stepped set, so
         there is nothing for left/right to advance. Swallowing them here is
         still load-bearing: without it they would fall through to nextPage and
         change the channel underneath an open modal. Not prevented — the arrows
         belong to whatever the visitor has focused. */
      /* The MFNY screen's before/after is a two-option radiogroup. Arrows move
         within it while it holds focus, which is what role="radio" promises;
         anywhere else on that screen they do nothing rather than falling
         through to nextPage. */
      if (mfnyOpen(stage)) {
        const on = document.activeElement;
        const radio = on instanceof HTMLElement ? on.closest<HTMLElement>('[data-act="mfny-view"]') : null;
        if (!radio) return;
        e.preventDefault();
        const next = (num(radio, 'data-view') + (step > 0 ? 1 : -1) + 2) % 2;
        setMfnyView(stage, next);
        const target = q(stage, `[data-act="mfny-view"][data-view="${next}"]`);
        target?.focus();
        return;
      }
      /* Same contract on the chipotle screen, but its plate carries four views
         rather than two, so the wrap is taken from the list's own length
         instead of a literal. */
      if (chipotleOpen(stage)) {
        const on = document.activeElement;
        const radio =
          on instanceof HTMLElement ? on.closest<HTMLElement>('[data-act="chipotle-view"]') : null;
        if (!radio) return;
        e.preventDefault();
        const n = CHIPOTLE_VIEWS.length;
        const next = (num(radio, 'data-view') + (step > 0 ? 1 : -1) + n) % n;
        setChipotleView(stage, next);
        const target = q(stage, `[data-act="chipotle-view"][data-view="${next}"]`);
        target?.focus();
        return;
      }
      if (aboutOpen(stage) || df2tmOpen(stage)) return;
      // Only meaningful with a page open — on the menu the arrows belong to
      // the browser (and to whatever the user has focused).
      if (s.open === null) return;
      e.preventDefault();
      // 1-based cycle across the four channels
      const n = ((s.open - 1 + step + CHANNELS) % CHANNELS) + 1;
      nextPage(stage, n);
    }
  });
}
