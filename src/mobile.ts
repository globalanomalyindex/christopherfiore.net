/**
 * Mobile layout.
 *
 * NOT part of the perfection synthétique handoff. The handoff is explicit:
 * "None in this revision — the stage scales as a unit… a phone layout is a
 * separate design task, not something to improvise from this file."
 *
 * That is correct as a design instruction and wrong as a shipping decision:
 * uniformly scaling a 1920×1080 stage to a 390px viewport renders the 13px
 * metadata at roughly 2.6px. So this is a deliberately plain document view —
 * same content, same tokens, same voice, none of the choreography. It is a
 * placeholder for a real phone design, and it says so in its own footer.
 *
 * Three consequences of that "plain document" decision are load-bearing, and
 * each one is where this view deliberately parts company with the stage:
 *
 *  - Motion studies is a destination on the stage. Here it is a block with the
 *    same weight — its own heading, the whole filmstrip and one unmistakable
 *    link — because a phone has no room for a row that behaves like a door.
 *  - Competizione's case study is a subpage on the stage. There are no
 *    subpages here, so it is inlined in full: decision, assemblies, anatomy,
 *    the produced/open evidence split, gates, limits, statement, all twelve
 *    sheets and the package manifest. Chellbook is the same shape one channel
 *    up: it is the one Product designs row with a `subpage` and no `href`, so
 *    it is printed in full inside section 01 rather than rendered as a row
 *    that would go nowhere.
 *  - Paintings does not rotate here. All 20 works are already in the document,
 *    in order, which beats a slideshow on a page you scroll.
 *
 * Every claim boundary in `src/data/` is printed verbatim. Nothing is
 * shortened to fit a narrow column.
 */

import { asset, el, css } from './dom.ts';
import { COLOR, LIGHTS, MARA, RULE, rgba } from './design/tokens.ts';
import { CASES, CASES_THESIS, MOTION_STUDIES, MOTION_ARCHIVE_HREF, MOTION_ARCHIVE_LABEL } from './data/cases.ts';
import { PAINTINGS, PAINTINGS_COUNT_LABEL, PAINTINGS_META, ARTSTATION_HREF } from './data/paintings.ts';
import { CZ_META, EV_META, EV_SHEETS, sheetForImage } from './data/competizione.ts';
import {
  CHELL,
  CHELL_BOARDS,
  CHELL_CAVEATS,
  CHELL_FLOWS,
  CHELL_IA,
  CHELL_LOOP,
  CHELL_MOTION,
  CHELL_OPEN,
  CHELL_PROTOTYPES,
  CHELL_RULES,
  CHELL_STATES,
} from './data/chellbook.ts';
import {
  BLSP,
  BLSP_ANATOMY,
  BLSP_ASSEMBLIES,
  BLSP_DECISION,
  BLSP_GATES,
  BLSP_LIMITS,
  BLSP_OPEN,
  BLSP_PACKAGE,
  BLSP_PRODUCED,
  BLSP_STATEMENT,
} from './data/blsp-case.ts';
import { STUDIO, PROFILE_LINKS, CONTACT_TABLE } from './data/studio.ts';
import type { TableRow } from './data/types.ts';

/** Viewport width below which the fixed stage stops being legible. */
export const MOBILE_MAX = 900;

export const isMobile = (): boolean =>
  window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;

/**
 * Every color in mobile.css comes from here rather than from the stylesheet,
 * so the band color under `.m-cta` and the current-gate chip is a LIGHTS
 * value by construction and cannot drift into a hardcoded near-miss.
 */
const ROOT_VARS = css({
  '--rust': COLOR.rust,
  '--lavender': COLOR.lavender,
  '--near-black': COLOR.nearBlack,
  '--plaque': COLOR.plaque,
  '--hair': RULE.onRustMajor,
  '--hair-min': RULE.onRustMinor,
  /* the one band color this view uses; ink on it is always --near-black */
  '--band': LIGHTS[0],
  '--email-hover': MARA[2],
  /* what an image box shows before its bytes arrive */
  '--imgbg': rgba(COLOR.shadowRust, 0.25),
});

/**
 * Intrinsic sizes for the two image sets whose records do not carry them.
 * They are set as width/height attributes so the box is reserved before the
 * bytes arrive and a lazy image never shifts the paragraph under it.
 * (`EV_SHEETS` carries its own width/height; `PAINTINGS` carries its own.)
 */
const LIVE_W = 1456;
const LIVE_H = 874;
const STILL_W = 800;
const STILL_H = 450;

const label = (text: string) => el('div', { class: 'm-label' }, text);

const body = (text: string, cls = 'm-body') => el('p', { class: cls }, text);

const note = (text: string) => el('p', { class: 'm-note' }, text);

const link = (href: string, text: string) =>
  el('a', { class: 'm-link', href, target: '_blank', rel: 'noopener noreferrer' }, text);

const bullets = (items: readonly string[]) =>
  el('ul', { class: 'm-list' }, ...items.map((t) => el('li', {}, t)));

const table = (rows: readonly TableRow[]) =>
  el('dl', { class: 'm-table' }, ...rows.flatMap((r) => [el('dt', {}, r.field), el('dd', {}, r.value)]));

const section = (n: string, title: string, meta: string, ...content: (Node | string | null)[]) =>
  el(
    'section',
    { class: 'm-section', 'aria-labelledby': `m-h-${n}` },
    el('div', { class: 'm-sechead' }, el('span', {}, n), el('span', {}, meta)),
    el('h2', { class: 'm-title', id: `m-h-${n}` }, title),
    ...content,
  );

/** A titled block inside a section — the unit the case study is built from. */
const block = (id: string, heading: string, meta: string | null, ...content: (Node | string | null)[]) =>
  el(
    'section',
    { class: 'm-block', 'aria-labelledby': `m-b-${id}` },
    el(
      'div',
      { class: 'm-blockhead' },
      el('h3', { class: 'm-blocktitle', id: `m-b-${id}` }, heading),
      meta ? el('span', { class: 'm-meta' }, meta) : null,
    ),
    ...content,
  );

function figure(
  src: string,
  alt: string,
  caption: string,
  width: number,
  height: number,
): HTMLElement {
  return el(
    'figure',
    { class: 'm-fig' },
    el('img', {
      class: 'm-img',
      src: asset(src),
      alt,
      loading: 'lazy',
      decoding: 'async',
      width,
      height,
    }),
    el('figcaption', { class: 'm-cap' }, caption),
  );
}

/* ------------------------------------------------------ 01 · chellbook */

/**
 * The two hosted prototypes.
 *
 * They are the headline of this case study, so they sit directly under the
 * standfirst and are the only band-weight controls in section 01. The lead
 * treatment goes to the showcase because the records themselves rank them:
 * the showcase is "the spec", the wireframes are "context for why a screen is
 * the way it is, not a spec". Both are real anchors, both open in a new tab,
 * and both say so in their accessible name along with their fidelity — a
 * reader on a phone has no window chrome to infer it from.
 */
function chellPrototypes(): HTMLElement {
  const anchor = (p: (typeof CHELL_PROTOTYPES)[number], lead: boolean) =>
    el(
      'a',
      {
        class: lead ? 'm-proto m-proto-lead' : 'm-proto',
        href: asset(p.href),
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `open the ${p.label} prototype, ${p.fidelity}, opens in a new tab`,
      },
      el('span', { class: 'm-protoname' }, p.label),
      el('span', { class: 'm-protofid' }, p.fidelity),
      el('span', { class: 'm-protonote' }, p.note),
    );

  return el(
    'div',
    { class: 'm-protos' },
    ...CHELL_PROTOTYPES.map((p, i) => anchor(p, i === 0)),
  );
}

/** The five-step core loop, numbered because the order is the argument. */
function chellLoop(): HTMLElement {
  return el(
    'ol',
    { class: 'm-loop' },
    ...CHELL_LOOP.map((step, i) =>
      el(
        'li',
        { class: 'm-loopitem' },
        el('span', { class: 'm-loopn' }, String(i + 1).padStart(2, '0')),
        el('span', { class: 'm-looptext' }, step),
      ),
    ),
  );
}

/**
 * The four safety states, in the product's own colors.
 *
 * A deliberate, narrow exception to "type on a band is #0B0B0C on a LIGHTS
 * color": these four wash/ink pairs are not this site's bands, they are a
 * specimen of another product's palette, quoted the way a paint chip is
 * quoted. Every pair ships from `CHELL_STATES` and every one clears 4.5:1.
 * The site's own bands — `.m-cta`, `.m-proto-lead`, link hovers — are
 * untouched and still LIGHTS with near-black ink.
 *
 * The dashed edge is Unknown's alone: absence of information must never be
 * renderable as a pass. It is decoration for the eye only, so the state's word
 * carries it for everyone else — which is rule 01, printed directly below.
 */
function chellStates(): HTMLElement {
  return el(
    'ul',
    { class: 'm-states' },
    ...CHELL_STATES.map((s) =>
      el(
        'li',
        {
          class: s.dashed ? 'm-state m-state-dashed' : 'm-state',
          style: css({ background: s.wash, color: s.ink }),
        },
        el(
          'span',
          { class: 'm-statehead' },
          el('span', { class: 'm-statename' }, s.name),
          el('span', { class: 'm-statemineral' }, s.mineral),
        ),
        /* verbatim — the Verified row's second sentence is never cut */
        el('p', { class: 'm-statemeaning' }, s.meaning),
      ),
    ),
  );
}

/**
 * The nine boards, uncropped.
 *
 * A phone is the one place these are shown whole, so nothing here caps or
 * crops them: `width`/`height` come off the record so the box is reserved
 * before the bytes land, and each figure also carries a direct link to the
 * file, which is how a reader zooms into a 1600×3338 board on a 390px screen.
 */
function chellBoards(): HTMLElement[] {
  return CHELL_BOARDS.map((b) =>
    el(
      'figure',
      { class: 'm-boardfig' },
      el('div', { class: 'm-caseidx' }, b.label, el('span', {}, `${b.width}×${b.height}`)),
      el('img', {
        class: 'm-board',
        src: asset(b.image),
        alt: b.alt,
        loading: 'lazy',
        decoding: 'async',
        width: b.width,
        height: b.height,
      }),
      el(
        'figcaption',
        { class: 'm-boardcap' },
        el('span', {}, b.caption),
        el(
          'a',
          {
            class: 'm-link',
            href: asset(b.image),
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': `open the ${b.label} board at full size, opens in a new tab`,
          },
          'full size',
        ),
      ),
    ),
  );
}

/**
 * Chellbook, printed in full.
 *
 * The language in `src/data/chellbook.ts` is a safety boundary, not copy, and
 * this view is the one that prints it at full width with nothing folded away:
 * the four state meanings, the five rules and every open question and caveat
 * arrive whole. Nothing here calls chellbook shipped or working, and no
 * qualifier is tightened to fit the column — `CHELL_OPEN` and `CHELL_CAVEATS`
 * carry the weight `BLSP_LIMITS` carries in section 03, in the same block
 * treatment at the same size.
 */
function chellbookStudy(): (Node | null)[] {
  return [
    el(
      'article',
      { class: 'm-case m-entry' },
      el('div', { class: 'm-caseidx' }, CHELL.klass, el('span', {}, CHELL.state)),
      el('h3', { class: 'm-casename' }, CHELL.name),
      el('p', { class: 'm-caseline' }, CHELL.descriptor),
      figure(CHELL.preview, CHELL.previewAlt, CHELL.previewCaption, LIVE_W, LIVE_H),
      el('span', { class: 'm-meta' }, `${CHELL.year} · ${CHELL.scale}`),
    ),

    block(
      'chell-case',
      'the case',
      CHELL.tagline,
      el('p', { class: 'm-stand' }, CHELL.standfirst),
      /*
        Concept-stage, stated where it cannot be scrolled past — the same job
        `EV_META.release` does in section 03. Facts only: the product's own
        safety language is printed verbatim further down and is not
        paraphrased here.
      */
      el(
        'p',
        { class: 'm-boundary' },
        `${CHELL.state} · ${CHELL.scale}. there is no app and no logo, and ${CHELL_OPEN.length} named ` +
          'questions are undesigned. the safety language below is the product’s own, printed as written.',
      ),
      chellPrototypes(),
    ),

    block('chell-loop', 'the core loop', `${CHELL_LOOP.length} steps`, chellLoop()),
    block(
      'chell-states',
      'the four safety states',
      'unknown alone carries the dashed edge',
      chellStates(),
    ),
    block(
      'chell-rules',
      'structural rules',
      `${CHELL_RULES.length} · changing one needs design and legal sign-off`,
      el(
        'ol',
        { class: 'm-assemblies' },
        ...CHELL_RULES.map((r) =>
          el(
            'li',
            { class: 'm-assembly' },
            el('div', { class: 'm-caseidx' }, r.n, el('span', {}, 'rule')),
            el('h4', { class: 'm-sub' }, r.name),
            body(r.body, 'm-body m-body-sm'),
          ),
        ),
      ),
    ),
    block('chell-ia', 'the five tabs', 'bottom bar', table(CHELL_IA)),
    block(
      'chell-flows',
      'the five flows',
      `${CHELL_FLOWS.length} boards`,
      el(
        'ol',
        { class: 'm-assemblies' },
        ...CHELL_FLOWS.map((f) =>
          el(
            'li',
            { class: 'm-assembly' },
            el('div', { class: 'm-caseidx' }, `flow ${f.n}`, el('span', {}, f.screens)),
            el('h4', { class: 'm-sub' }, f.name),
            body(f.body, 'm-body m-body-sm'),
          ),
        ),
      ),
    ),
    block('chell-boards', 'the boards', `${CHELL_BOARDS.length} · uncropped`, ...chellBoards()),
    block('chell-motion', 'motion', 'no bounce, no overshoot, no spring', table(CHELL_MOTION)),
    block('chell-open', 'what is not designed', `${CHELL_OPEN.length} open questions`, bullets(CHELL_OPEN)),
    block('chell-caveats', 'caveats', null, bullets(CHELL_CAVEATS)),
  ];
}

/* ------------------------------------------------------------------ 01 */

function productsSection(): HTMLElement {
  /*
    Seven rows, not eight. The eighth record carries `subpage` instead of
    `href`: on the stage it opens a case-study screen, and there are no
    subpages here, so it is printed in full below instead of appearing as a
    row with nothing to link to.
  */
  const rows = CASES.filter((c) => !c.subpage).map((c) =>
    el(
      'article',
      { class: 'm-case' },
      el('div', { class: 'm-caseidx' }, c.idx, el('span', {}, c.evidence)),
      el('h3', { class: 'm-casename' }, c.name),
      el('p', { class: 'm-caseline' }, c.line),
      /*
        All seven cases now carry a capture of the deployed demo, so the old
        "no key frame" plate is gone. The guard stays only because
        `CaseRecord.image` is still typed `string | null`.
      */
      c.image ? figure(c.image, c.imageAlt, c.caption, LIVE_W, LIVE_H) : null,
      el(
        'div',
        { class: 'm-caselinks' },
        c.href ? link(c.href, 'live project') : null,
        c.source ? link(c.source, 'source') : null,
        el('span', { class: 'm-meta' }, `${c.year} · ${c.discipline}`),
      ),
    ),
  );

  return section(
    '01',
    'Product designs',
    `${CASES.length} cases`,
    el('p', { class: 'm-thesis' }, CASES_THESIS),
    ...rows,
    ...chellbookStudy(),
  );
}

/**
 * Motion studies as a destination, not a footnote.
 *
 * The alt text carries each study's note and the visible label carries its
 * name, so the strip reads once to a screen reader and once to the eye without
 * either repeating the other.
 */
function motionSection(): HTMLElement {
  const film = el(
    'ul',
    { class: 'm-film' },
    ...MOTION_STUDIES.map((s) =>
      el(
        'li',
        { class: 'm-filmitem' },
        el('img', {
          class: 'm-thumb',
          src: asset(s.poster),
          alt: s.note,
          loading: 'lazy',
          decoding: 'async',
          width: STILL_W,
          height: STILL_H,
        }),
        el('span', { class: 'm-filmlabel' }, s.label),
      ),
    ),
  );

  return section(
    '01b',
    'Motion studies',
    MOTION_ARCHIVE_LABEL,
    el('p', { class: 'm-thesis' }, 'timing, state and arrival, studied one behavior at a time.'),
    film,
    el(
      'a',
      {
        class: 'm-cta',
        href: asset(MOTION_ARCHIVE_HREF),
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      el('span', { class: 'm-ctatext' }, 'open the archive'),
      el('span', { class: 'm-ctameta' }, MOTION_ARCHIVE_LABEL),
    ),
  );
}

/* ------------------------------------------------------------------ 02 */

/**
 * No rotation here, by decision. The stage rotates because it can show one
 * work at a time; the document already holds all twenty in order, which is
 * strictly more than a slideshow would give a scrolling reader.
 */
function paintingsSection(): HTMLElement {
  const works = PAINTINGS.map((p) =>
    el(
      'a',
      { class: 'm-work', href: p.href, target: '_blank', rel: 'noopener noreferrer' },
      el('img', {
        class: 'm-img',
        src: asset(p.image),
        alt: p.alt,
        loading: 'lazy',
        decoding: 'async',
        width: p.width,
        height: p.height,
      }),
      el(
        'span',
        { class: 'm-plaque' },
        el('span', {}, p.wall),
        el('span', { class: 'm-plaqueyear' }, p.year ?? '–'),
      ),
    ),
  );

  return section(
    '02',
    'Paintings',
    PAINTINGS_COUNT_LABEL,
    el('p', { class: 'm-thesis m-thesis-sm' }, PAINTINGS_META),
    el('div', { class: 'm-works' }, ...works),
    el('div', { class: 'm-caselinks' }, link(ARTSTATION_HREF, 'artstation.com/chrisfiore')),
  );
}

/* ------------------------------------------------------------------ 03 */

/** The one project entry — the index row and its lead image. */
function blspEntry(): HTMLElement {
  const sheet = EV_SHEETS[sheetForImage(BLSP.preview)];

  return el(
    'article',
    { class: 'm-case m-entry' },
    el('div', { class: 'm-caseidx' }, BLSP.klass, el('span', {}, BLSP.state)),
    el('h3', { class: 'm-casename' }, BLSP.name),
    el('p', { class: 'm-caseline' }, BLSP.descriptor),
    figure(BLSP.preview, BLSP.previewAlt, BLSP.previewCaption, sheet.width, sheet.height),
    el('span', { class: 'm-meta' }, `${BLSP.year} · ${BLSP.revision}`),
  );
}

/** The twelve sheets, stacked. The one place they are not cropped. */
function blspSheets(): HTMLElement {
  return block(
    'sheets',
    'evidence sheets',
    `${EV_SHEETS.length} sheets`,
    note(EV_META.master),
    ...EV_SHEETS.map((s, i) =>
      el(
        'figure',
        { class: 'm-sheetfig' },
        el(
          'div',
          { class: 'm-caseidx' },
          `${String(i + 1).padStart(2, '0')} / ${EV_SHEETS.length}`,
          el('span', {}, s.kind),
        ),
        el('img', {
          class: 'm-sheet',
          src: asset(s.image),
          alt: s.alt,
          loading: 'lazy',
          decoding: 'async',
          width: s.width,
          height: s.height,
        }),
        /* verbatim from the devkit — never rewritten to fit the column */
        el('figcaption', { class: 'm-cap' }, s.caption),
      ),
    ),
  );
}

/**
 * The publication package.
 *
 * The archive volumes are a MANIFEST, never anchors: `document-manifest.json`
 * marks them `file_included: false`, so links there would be thirteen dead
 * ones. The corrected visual master is the exception and only because it is
 * genuinely hosted — `BLSP_PACKAGE.master.href` resolves, and its byte count
 * and checksum are printed next to it so a reader can confirm they hold the
 * document the manifest describes. The note and the handling line travel with
 * the records either way.
 */
function blspPackage(): HTMLElement {
  const { master } = BLSP_PACKAGE;

  return block(
    'package',
    'publication package',
    'manifest',
    note(BLSP_PACKAGE.note),
    label('corrected visual master'),
    el(
      'a',
      { class: 'm-doc', href: asset(master.href), target: '_blank', rel: 'noopener noreferrer' },
      el('span', { class: 'm-docname' }, master.label),
      el('span', { class: 'm-docmeta' }, `${master.size} · ${master.pages}`),
    ),
    el('p', { class: 'm-fingerprint' }, `${master.bytes} · ${master.checksum}`),
  );
}

function competizioneSection(): HTMLElement {
  const assemblies = el(
    'ol',
    { class: 'm-assemblies' },
    ...BLSP_ASSEMBLIES.map((a) =>
      el(
        'li',
        { class: 'm-assembly' },
        el('div', { class: 'm-caseidx' }, a.n, el('span', {}, 'assembly')),
        el('h4', { class: 'm-sub' }, a.name),
        body(a.body, 'm-body m-body-sm'),
      ),
    ),
  );

  const gates = el(
    'div',
    { class: 'm-gates' },
    ...BLSP_GATES.map((g) =>
      el(
        'div',
        { class: 'm-gate' },
        el(
          'div',
          { class: 'm-gatehead' },
          el('span', { class: 'm-gatename' }, g.gate),
          el('span', { class: 'm-status', 'data-status': g.status }, g.status),
        ),
        body(g.detail, 'm-body m-body-sm'),
      ),
    ),
  );

  return section(
    '03',
    'Competizione',
    CZ_META.channelMeta,
    /* the release boundary, where it cannot be scrolled past */
    el('p', { class: 'm-boundary' }, EV_META.release),
    blspEntry(),

    block(
      'case',
      'the case',
      BLSP.tagline,
      el('p', { class: 'm-stand' }, BLSP.standfirst),
    ),
    block(
      'decision',
      BLSP_DECISION.heading,
      null,
      el('p', { class: 'm-lead' }, BLSP_DECISION.lead),
      body(BLSP_DECISION.body),
      note(BLSP_DECISION.overview),
    ),
    block('assemblies', 'the assemblies', `${BLSP_ASSEMBLIES.length} functional groups`, assemblies),
    block('anatomy', 'system anatomy', 'printed skin, metal bones', table(BLSP_ANATOMY)),
    block(
      'evidence',
      'evidence',
      'produced and open',
      el('h4', { class: 'm-sub' }, 'what exists'),
      table(BLSP_PRODUCED),
      el('h4', { class: 'm-sub' }, 'what is still open'),
      bullets(BLSP_OPEN),
    ),
    block('gates', 'release gates', 'R1 → R2', gates),
    block('limits', 'stated limits', null, bullets(BLSP_LIMITS)),
    block('statement', 'designer statement', null, ...BLSP_STATEMENT.map((t) => body(t))),
    blspSheets(),
    blspPackage(),
  );
}

/* ------------------------------------------------------------------ 04 */

function contactSection(): HTMLElement {
  return section(
    '04',
    'Contact',
    STUDIO.location,
    el('a', { class: 'm-email', href: `mailto:${STUDIO.email}` }, STUDIO.email),
    el('div', { class: 'm-caselinks' }, ...PROFILE_LINKS.map((l) => link(l.href, l.label))),
    table(CONTACT_TABLE),
  );
}

export function buildMobile(): HTMLElement {
  return el(
    'div',
    { class: 'm-root', style: ROOT_VARS },
    el(
      'header',
      { class: 'm-head' },
      el('div', { class: 'm-headmeta' }, el('span', {}, STUDIO.name), el('span', {}, STUDIO.rev)),
      el(
        'div',
        { class: 'm-wordmark' },
        el('span', {}, STUDIO.wordmark[0]),
        el('span', {}, STUDIO.wordmark[1]),
      ),
      el('p', { class: 'm-tagline' }, STUDIO.tagline),
      el('img', {
        class: 'm-crest',
        src: asset('brand/crestdown-lavender.png'),
        alt: '',
        'aria-hidden': 'true',
        loading: 'lazy',
      }),
    ),
    productsSection(),
    motionSection(),
    paintingsSection(),
    competizioneSection(),
    contactSection(),
    el(
      'footer',
      { class: 'm-foot' },
      el('p', {}, 'the full studio index, with its transitions and per-channel motion, is designed for a wide screen.'),
      el('p', { class: 'm-meta' }, `${STUDIO.name} · ${STUDIO.roles} · ${STUDIO.locationShort}`),
    ),
  );
}
