# Hover classes

Every `style-hover="…"` in `_source/prototype/prototype.markup.html` as a real
CSS class. 35 occurrences in the prototype, 9 distinct declarations, 9 classes.

Page builders apply the class; the CSS carries the state. Do not reintroduce
`style-hover`, and do not hand-roll a hover with inline styles — a hover that
is not in this table will not have a matching `:focus-visible`, and keyboard
users lose the state.

Every class below has a `:hover` **and** a `:focus-visible` rule with identical
declarations. On top of that, `base.css` gives every focusable inside
`[data-stage]` a two-tone focus ring (2px `#F5D90A` inset band + 2px `#0B0B0C`
outline at `-2px`), so the focus state is a visible shape change and never
depends on colour perception alone.

## menu.css

| Class | Declaration | Prototype uses |
|---|---|---|
| `.ps-hov-replay` | `color:#DFCBFA` | header cell 4 · "replay intro" (line 19) |
| `.ps-hov-channel-prod` | `--r:800px; --p:820px; color:#C62C05` | channel 01 · Product designs (line 32) |
| `.ps-hov-channel-paint` | `--p:500px; box-shadow:inset 0 0 0 14px #C62C05, inset 0 0 0 15px rgba(223,203,250,.55); color:#C62C05` | channel 02 · Paintings (line 51) |
| `.ps-hov-channel-comp` | `background-size:100% 100%; box-shadow:inset 760px 0 0 0 #DFCBFA; color:#C62C05` | channel 03 · Competizione (line 58) |

The three channel classes carry **only the hover end state**, exactly as the
prototype split it. The resting `background-image` / `background-position` /
`background-size` and the per-channel `transition` (which is where the
`120ms steps(11,end)` / `260ms cubic-bezier(.3,0,0,1) 70ms` timings live) stay
inline on the cell with the rest of its geometry.

## pages.css

| Class | Declaration | Prototype uses |
|---|---|---|
| `.ps-hov-invert` | `background:#C62C05; color:#DFCBFA` | 24×: page 01 header close (92), case rows (109, 116, 123, 130), footer close (138), footer next (140); page 02 wall list, 11 rows (174–184); page 03 header close (202), concept rows (211, 215, 219), footer close (224), footer next (226) |
| `.ps-hov-invert-dark` | `background:#DFCBFA; color:#0B0B0C` | 3×: page 04 header close (239), footer close (261), footer next (263) |
| `.ps-hov-dim` | `opacity:.6` | 2×: page 02 footer close and footer next (186) |
| `.ps-hov-dim-55` | `opacity:.55` | page 02 header close (150) |
| `.ps-hov-email` | `color:#FF2D87` | page 04 email (241) |
| `.ps-hov-evidence` | frame `0 0 0 1px #C62C05`; `.ps-ev-chip` → `background:#C9F227; color:#0B0B0C` | **NEW, no prototype equivalent** — page 03's hero as the evidence viewer's door |

`.ps-hov-evidence` carries its own **resting** frame as well as the hover and
focus states. Two reasons: an inline `box-shadow` on the hero would outrank any
class, and composing with `.ps-frame` would put two `.class:focus-visible`
rules at identical specificity, leaving the focus state decided by whichever
sits lower in the file. The hero also takes `data-nohl`, because hover.ts's
band stack paints at `z-index:-1` — invisible behind an opaque render — and its
ink pin would drag the tab's lavender type to near-black on its own dark
plaque. `#C9F227` is from `LIGHTS` and the ink on it is `#0B0B0C`, so the
inverted tab still keeps the legibility contract.

Ink pairs are the legibility contract, not a preference: on a rust fill the ink
is lavender, on a lavender fill the ink is near-black. Do not swap one for the
other when adding a row.

---

# Other classes the page builders can use

All optional. Inline geometry always wins over a class, so adding one of these
is additive and can never conflict with a builder's inline styles.

## fonts.css

| Class | What it does |
|---|---|
| `.ps-display` | Karrik, the display face at rest |
| `.ps-alt` | Dessign Maison **with** `font-feature-settings:'salt' 1,'ss01' 1` — the glitch alternate. Never set Dessign Maison as an alternate without the features. |

Note: the stage's inherited font is **Dessign Maison**, per the prototype's
`body` rule. Every 11.5–15px label inherits it. Only elements that name Karrik
get Karrik.

## base.css

| Class / selector | What it does |
|---|---|
| `.ps-sr-only` | visually hidden, still announced — for accessible names the graphic design does not spell out |
| `body.ps-stage-host` | `overflow:hidden`; set by the integrator when the fixed stage (not the mobile document view) is mounted |
| `[data-stage] [data-l]` | `display:inline-block` on every letter span — handled globally, builders no longer need it inline |
| `[data-stage] button`, `[data-stage] a` | UA chrome stripped, type inherited, so a real `<button>` renders exactly like the prototype's `<div>` |
| `--ps-focus-band`, `--ps-focus-line`, `--ps-focus-offset` | the focus-ring tokens, on `:root` |

`@property --r`, `--p`, `--d` are registered here. `--r`/`--p` must be
registered as `<length>` or the channel hover fills cannot transition.

## menu.css

| Class / selector | What it does |
|---|---|
| `[data-channel="1"] [data-l]`, `.ps-chan-prod [data-l]` | 200ms linear colour + text-stroke-colour transition on channel 01's letters |
| `[data-scaf]` | resting `opacity:0` + 180ms fade for the cursor-tracking scaffolding |
| `.ps-flagmask` | the 96px mask window that shows only two 48px rows of the flag |
| `.ps-flag-a` / `.ps-flag-b` | the two offset checkered rows (top 96 / 144) |
| `[data-frost]`, `[data-paint]`, `[data-beads]`, `[data-slatefx]`, `[data-slatelogo]` | `pointer-events:none` |

## pages.css

| Class | What it does |
|---|---|
| `.ps-grid-overlay` | page 01's visible module grid — 2px `rgba(255,255,255,.62)` lines every 72.727px, offset `0 4.45px` |
| `[data-cslot]` | absolutely positioned key-frame slot with the 240ms linear crossfade |
| `.ps-frame` | `box-shadow:0 0 0 1px rgba(198,44,5,.42)` — a frame, outside the box, so it does not eat the crop |
| `.ps-corner` + `.ps-corner-tl` / `-tr` / `-bl` / `-br` | 15×15px corner crosshair at `-7.5px`, two 1px lines. Colour overridable via `--ps-cross` (defaults to rust). |
| `.ps-plaque` | page 02 painting caption bar — 38px, `#150B20` on `#DFCBFA`, 12px/.16em, padding `0 13px`. Opaque on purpose. |
| `[data-evslot]` | one of the evidence viewer's twelve stacked sheets — absolute, clipped, same 240ms linear crossfade as `[data-cslot]` |
| `.ps-ev-chip` | the "evidence · 12 sheets" tab in page 03's hero — 30px, `#150B20` on `#DFCBFA`, 12px/.16em. Opaque for the same reason `.ps-plaque` is, and its colours live here rather than inline so `.ps-hov-evidence` can invert them. |

## motion.css

| Class | What it does |
|---|---|
| `.ps-speed` | page 03 speed-line wrapper, `opacity:.42`, clips |
| `.ps-speed-a` | 190px pitch, `ps-rush 1.7s steps(63,end) infinite` |
| `.ps-speed-b` | 70px pitch, `ps-rush2 .9s steps(23,end) infinite` |
| `.ps-check` | page 03 checkered-band wrapper (clips; top/height come from `PAGE3.checker`) |
| `.ps-checkband` | 96px deep-rust checker, `ps-checkdrift 2.6s linear infinite` |

`motion.css` also holds all 26 `@keyframes` from the prototype, copied verbatim,
and the `prefers-reduced-motion: reduce` block that freezes the decorative
loops (`animation-duration:.01ms !important; animation-iteration-count:1
!important`). That block only stills CSS keyframes — skipping the dither/FLIP
choreography, stopping the ambient glitch and freezing the canvases is wired in
the runtime off `state(stage).reduced`.
