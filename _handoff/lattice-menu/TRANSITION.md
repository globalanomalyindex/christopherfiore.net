# The channel-open transition

Click a channel on 2a. One choreography, ~3.3s to the new screen. All times are
ms from the click. Every step is a scheduled callback keyed to these numbers —
keep them in one table in the code, not scattered through nested timeouts.

| t | Beat |
|---|---|
| 0 | The hovered fill and its lines grow from the pressed button to the union of all four buttons (240,600 → 1680,840) over **170ms**, `steps(7,end)`. The lattice sweeps the same rect to the fill color over 170ms in Bayer order. The stack is now one block. |
| 140 | The other three labels start their letter glitch. |
| 300 | Every span except the pressed label dithers out to `opacity: 0`, 14ms apart — including **the pressed button's own channel number**. Only the pressed text survives. |
| 420 | The pressed label translates to the union's center and scales to 1.15, 240ms, `steps(8,end)`. |
| 620 | The fill takes the whole menu (0,0 → 1920,1080) over **260ms**; the lattice sweeps the full canvas; the rails fade out over 240ms. |
| 780 | The label translates to (960, 540) and scales to 1.6, 300ms. |
| ~880–2050 | **Hold.** The fill owns the screen, the label sits centered. Nothing moves but the held dither. |
| 2050 / 2330 / 2610 | **Three flashes.** Each pass walks the letters 9ms apart, setting a FLASH color and returning to ink 130ms later. |
| 2960 | **The text glitches into a vanish.** Letters in scattered order, 20ms apart: swap to the alternates in a FLASH color, then `opacity: 0` 80ms later. |
| 3320 | **The new screen arrives and unglitches.** The page shell dithers in over 300ms `steps(5,end)`; its title starts wholly on the `salt`/`ss01` alternates in FLASH colors and resolves letter by letter to ink, 26ms apart after a 120ms lead. |
| +3000 | Auto-return to the menu (or on click of the shell). |

## Non-negotiables

**Teardown must be total and idempotent.** One `restore()`:

- clears every scheduled callback in the run's queue
- removes every band in the host — not just this run's
- restores each label's original markup, transform, opacity, color and feature
  settings from a snapshot taken before the run
- cancels frame animations, empties the lit set, re-runs the lattice resolve,
  and restarts the drift

Keep a reference to the current run's `restore` on the instance. A second click
while a run is in flight must call it and return, so a click can never leave the
menu dead. Add a watchdog at 8000ms that forces it.

**The resolve pass must not run mid-transition** — gate it on the busy flag, or
it will fight the fill.

**Two bugs worth knowing about**, both of which cost real debugging time here:

1. A name collision between the drift's row counter and the lattice-sweep method
   (both were `sweep`) silently overwrote the method with a string on the first
   drift tick, which killed the ambient wave AND made the transition throw on
   its first real step — before its own teardown was registered, so the fill
   stayed on screen forever. Give the counter and the painter different names.
2. Restoring a peg by clearing its inline color (`style.color = ''`) drops the
   glyph to the inherited color — black. Always restore to a named value.

## What the shell is, and is not

In the prototype the arriving "page" is a minimal shell: the channel rail, the
88px title, and a `click to return to the menu` affordance. **In the real site
this is not a shell — it is the actual channel page**, grown by
`src/runtime/transitions.ts`. Wire the last beat to the existing grow, and pass
the transition's chosen hue to it so the page's dither veil starts from the same
color the menu ended on. Do not build a parallel page shell.
