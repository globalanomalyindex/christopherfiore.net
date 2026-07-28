/**
 * Channel 01 · Product designs · the Chellbook case study.
 *
 * Gluten-free recipe conversion and label safety, iPhone. Transcribed from
 * `_source/design_handoff_chellbook/README.md` — the dev handoff shipped with
 * the two prototypes.
 *
 * THE LANGUAGE HERE IS A SAFETY BOUNDARY, not copy.
 *
 * This is a product about celiac disease. Its own handoff says several of its
 * rules are "legal constraints, not preferences", and the design's central
 * claim is that it never overstates what it knows: Verified means "supported by
 * the recipe and by the ingredient's own published information", explicitly
 * "not a promise of absolute safety"; Unknown "may never be rounded up to
 * Verified, ever". A portfolio page that tightened any of that into "checks
 * your recipe is safe" would misrepresent the work AND the product.
 *
 * It is also concept-stage. There is no app, no logo, and six named questions
 * are undesigned. `CHELL.state` and `CHELL_OPEN` carry that; do not drop them.
 */

import type { TableRow } from './types.ts';

export const CHELL = {
  name: 'chellbook',
  klass: 'iphone',
  year: '2026',
  /** Concept-stage. The handoff's own word — there is no shipped app. */
  state: 'concept · design spec',
  descriptor: 'gluten-free recipe conversion and label safety, iPhone',
  tagline: 'a safety product that happens to be about food',
  standfirst:
    'chellbook takes any recipe a person pastes in and returns a version they can safely eat, then follows that answer out of the kitchen and into the supermarket aisle.',
  preview: 'projects/live/chellbook.webp',
  previewAlt:
    'The Chellbook product design showcase: the wordmark, the value line, and the spec table listing 13 sections and 30 screens',
  previewCaption: 'chellbook · design spec · 13 sections, 30 screens',
  scale: '30 screens · 13 sections · five flows',
} as const;

/**
 * The two self-contained prototypes, hosted here and openable directly.
 *
 * The handoff calls the second file "low fidelity" and "context only". That is
 * a build instruction, not a description: it means "do not treat this as the
 * spec". Both files hold the same ~110 iPhone screens at the same fidelity of
 * layout and copy. What actually separates them is that the showcase puts every
 * screen in device chrome with the final mineral palette, and the exploration
 * shows the same product before that chrome and palette were settled, annotated
 * with the iterations behind each decision.
 *
 * So `fidelity` names what each one IS rather than grading it. Calling the
 * exploration "low fidelity" on a portfolio undersells a file full of resolved
 * screens, and reads as an apology for work that does not need one.
 */
export const CHELL_PROTOTYPES = [
  {
    id: 'product-design',
    label: 'product design showcase',
    note: 'the spec. 30 screens across 13 sections, in device, with the final color, type, copy, motion and state.',
    href: 'chellbook/product-design.html',
    fidelity: 'the spec',
  },
  {
    id: 'wireframes',
    label: 'wireframe exploration',
    note: 'the same product before the device chrome and the final palette, annotated with the alternatives tried and dropped. context, not the spec.',
    href: 'chellbook/wireframes.html',
    fidelity: 'the exploration',
  },
] as const;

/** The core loop, verbatim from the handoff. */
export const CHELL_LOOP: string[] = [
  'paste a recipe, by link or plain text',
  'the app converts it, asking a question only where guessing would be unsafe',
  'it returns a breakdown: what is fine, what had gluten and was swapped, what still needs a label read',
  'unresolved label checks ride the shopping list to the store',
  'cooking a result and rating the texture feeds a new version of the recipe',
];

/**
 * The four safety states. These are the product.
 *
 * `meaning` is verbatim. The Verified row's second sentence — "not a promise of
 * absolute safety" — is the whole ethic of the thing and must never be cut for
 * length. The dashed edge belongs to Unknown alone: absence of information must
 * never be renderable as a pass.
 */
export const CHELL_STATES = [
  {
    name: 'verified',
    mineral: 'malachite',
    wash: '#D7E7DF',
    ink: '#155741',
    dashed: false,
    meaning:
      "supported by the recipe and by the ingredient's own published information. not a promise of absolute safety.",
  },
  {
    name: 'check the label',
    mineral: 'citrine',
    wash: '#F5E8CC',
    ink: '#7C5E1E',
    dashed: false,
    meaning:
      'depends on the package. needs a certified gluten-free mark or a shared-equipment statement.',
  },
  {
    name: 'blocking',
    mineral: 'carnelian',
    wash: '#F1DBD1',
    ink: '#8E3620',
    dashed: false,
    meaning: 'a known gluten source. this step cannot go ahead as written.',
  },
  {
    name: 'unknown',
    mineral: 'turquoise',
    wash: '#D4E9E9',
    ink: '#1F6164',
    dashed: true,
    meaning: 'information is missing. one question closes the gap.',
  },
] as const;

/** The five structural rules. Changing one needs design and legal sign-off. */
export const CHELL_RULES: { n: string; name: string; body: string }[] = [
  {
    n: '01',
    name: 'four safety states, never a fifth',
    body: 'the state is a first-class data field, not a style. every pill carries a word, because color alone never carries meaning. unknown may never be rounded up to verified, including when the model is confident.',
  },
  {
    n: '02',
    name: 'pro never touches safety',
    body: 'free and pro run identical checks. every pro surface opens with "free and pro run exactly the same safety checks" in a position that cannot be scrolled past, and a gated screen shows the complete free answer first. the copy test: swap "pro" for "safer". if the sentence still reads, it ships a safety implication and is cut.',
  },
  {
    n: '03',
    name: 'brand claims are quotes, never verdicts',
    body: 'never rate, rank, endorse or blocklist a company or a product. the only permitted shape is what the product’s own published ingredient list says, where we read it, when, and a handback: "recipes and shelves change, so the package in your hand is the final word."',
  },
  {
    n: '04',
    name: 'no dead ends',
    body: 'back sits top-left on every pushed screen and is named after its destination. every gate, including paywalls and permission prompts, has a second working way out. every gesture has a plain tap equivalent, and any long task can be canceled while it runs.',
  },
  {
    n: '05',
    name: 'an accessibility floor',
    body: '44pt minimum targets, Dynamic Type to the largest setting, system font, sentence case, reading level around fifth grade. nothing destructive without an undo, no timers on decisions, and all motion respects reduce motion.',
  },
];

/** Five-tab bottom bar; the center tab is the raised primary action. */
export const CHELL_IA: TableRow[] = [
  { field: 'groceries', value: 'shopping list grouped by aisle, each label check attached to its item' },
  { field: 'explore', value: 'curated gluten-free recipes with safety and time tags. not a feed, no social graph' },
  { field: 'cook', value: 'the center tab. paste, photograph a page, or quick scan a label. the primary job' },
  { field: 'cookbook', value: 'everything converted or saved, with versions. always openable, even at zero conversions' },
  { field: 'profile', value: 'dietary needs, trusted brands, equipment. the gear opens settings' },
];

/**
 * The five flows, each a board in `CHELL_BOARDS`. `screens` counts are from the
 * handoff's own section headings.
 */
export const CHELL_FLOWS: { n: string; name: string; screens: string; body: string }[] = [
  {
    n: 'one',
    name: 'a first recipe, start to finish',
    screens: '9 screens',
    body: 'the day-one path, no account and no card. welcome, what we check, cook home, converting, one clarifying question, findings, recipe, cook mode, finished.',
  },
  {
    n: 'two',
    name: 'something has to change',
    screens: '4 screens',
    body: 'an ingredient that cannot stay. never leave the cook holding a stopped recipe, and never make the stop feel like their fault. the primary button is the fix, not "OK".',
  },
  {
    n: 'three',
    name: 'quick scan at the shelf',
    screens: '4 screens',
    body: 'the one pro feature that earns its price without touching safety. the scan result quotes the exact words found, dates the photo, notes the absence of a certification mark, then stops.',
  },
  {
    n: 'four',
    name: 'from the recipe to the store',
    screens: '4 screens',
    body: 'the list, the location gate with its mandatory escape hatch, stores that "tend to stock" rather than a claim about today’s shelf, and a shelf screen written to be read one-handed.',
  },
  {
    n: 'five',
    name: 'changing your mind, safely',
    screens: '4 screens',
    body: 'restoring a version copies it forward rather than rewinding. nothing is ever deleted, and every version carries the same safety baseline.',
  },
];

/** The flow boards, exported at 2x and annotated. Shown uncropped. */
export const CHELL_BOARDS = [
  {
    id: 'cover-and-foundation',
    label: 'cover and foundation',
    image: 'chellbook/boards/cover-and-foundation.webp',
    alt: 'The Chellbook cover board: palette, type, motion and voice',
    caption: 'foundation · palette, type, motion, voice',
    width: 1600,
    height: 1009,
  },
  {
    id: 'safety-states',
    label: 'the four safety states',
    image: 'chellbook/boards/safety-states.webp',
    alt: 'The four safety states side by side: verified, check the label, blocking, unknown',
    caption: 'the four states, side by side · unknown alone carries the dashed edge',
    width: 1600,
    height: 789,
  },
  {
    id: 'flow-one',
    label: 'flow one · a first recipe',
    image: 'chellbook/boards/flow-one-first-recipe.webp',
    alt: 'Flow one board: nine screens from pasting a recipe to finishing the cook',
    caption: 'flow one · 9 screens, paste to oven',
    width: 1600,
    height: 3338,
  },
  {
    id: 'flow-two',
    label: 'flow two · blocked ingredient',
    image: 'chellbook/boards/flow-two-blocked-ingredient.webp',
    alt: 'Flow two board: four screens recovering from a blocking ingredient',
    caption: 'flow two · 4 screens, the recovery path',
    width: 1600,
    height: 2166,
  },
  {
    id: 'flow-three',
    label: 'flow three · quick scan',
    image: 'chellbook/boards/flow-three-quick-scan.webp',
    alt: 'Flow three board: four screens scanning a label at the shelf, including the Pro boundary',
    caption: 'flow three · 4 screens, pro boundary included',
    width: 1600,
    height: 2166,
  },
  {
    id: 'flow-four',
    label: 'flow four · recipe to store',
    image: 'chellbook/boards/flow-four-recipe-to-store.webp',
    alt: 'Flow four board: four screens taking the list from the recipe to the aisle',
    caption: 'flow four · 4 screens, list to aisle',
    width: 1600,
    height: 2183,
  },
  {
    id: 'flow-five',
    label: 'flow five · versions',
    image: 'chellbook/boards/flow-five-versions.webp',
    alt: 'Flow five board: four screens changing a recipe and restoring a version',
    caption: 'flow five · 4 screens, versioning',
    width: 1600,
    height: 2183,
  },
  {
    id: 'tabs',
    label: 'tabs, profile, settings, pro',
    image: 'chellbook/boards/tabs-profile-settings-pro.webp',
    alt: 'Board showing Explore, Profile, Settings, Usage and Pro screens',
    caption: 'the rest of the app · 5 screens, explore to pro',
    width: 1600,
    height: 2144,
  },
  {
    id: 'component-kit',
    label: 'component kit',
    image: 'chellbook/boards/component-kit.webp',
    alt: 'Component kit board: buttons, pills, lists and sheets',
    caption: 'the kit · buttons, pills, lists, sheets',
    width: 1600,
    height: 1030,
  },
];

/** Motion. Calm — no bounce, no overshoot, no spring anywhere. */
export const CHELL_MOTION: TableRow[] = [
  { field: 'settle · 200ms', value: 'rows, chips, toasts. a 6pt upward translate' },
  { field: 'rise · 360ms', value: 'sheets, from the bottom edge only' },
  { field: 'draw · 360ms', value: 'the checkmark stroking on when something is confirmed' },
  { field: 'pulse · 1400ms', value: 'skeleton loading bars, opacity 0.5 to 1' },
];

/**
 * The six questions the handoff lists as undesigned. Publishing these is the
 * point: the case study is about what the design has and has not settled.
 */
export const CHELL_OPEN: string[] = [
  'the trusted brands editor is referenced from profile and settings, but its editing UI is not designed',
  'cross-contamination in a shared kitchen is out of scope, and it is the single most requested thing from celiac users',
  'mid-cook discovery has no screen: what happens when a cook is already halfway through and finds the problem then',
  'recipe imagery is emoji placeholders, which is a placeholder and not a decision',
  'whether saved recipes open with no network is unspecified',
  'there is no designed behavior for an evidence line whose read date has gone stale',
];

/** Caveats carried from the handoff's own Assets section. */
export const CHELL_CAVEATS: string[] = [
  'chellbook is concept-stage. no logo exists; the wordmark is the name set in Dessign Maison.',
  'Dessign Maison is licensed to the studio and is not cleared for app distribution. shipping the wordmark as type needs a license extension or an exported vector.',
  'the prototypes are design references built in HTML. they are not production code and should not be lifted into an app.',
];
