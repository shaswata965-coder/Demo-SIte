# Motion specification

One vocabulary, used everywhere. Tokens live in `design/tokens.css`.

```
--e-out    cubic-bezier(.16, 1, .3, 1)      reveals, entrances
--e-inout  cubic-bezier(.76, 0, .24, 1)     state changes, morphs
--e-snap   cubic-bezier(.34, 1.56, .64, 1)  small UI only, sparingly
--d-fast   180ms    --d-base 420ms    --d-slow 900ms    --d-scene 1600ms
```

## The scroll model

Scroll position maps linearly onto a single float, `progress ∈ [0, 6]`. Its
integer part picks the current field state, its fraction is the blend into the
next. Nothing else in the page owns scene state.

```
progress = chapterIndex + (scrollY - chapterTop) / chapterHeight
```

Each chapter is `100svh` (`svh`, not `vh` — mobile browser chrome otherwise
makes the last chapter unreachable). Copy is anchored to the bottom of its
chapter, so `progress === i` is exactly the moment chapter *i*'s copy is
readable and its field state is fully resolved.

The blend is `smoothstep`ed, not linear, so each state holds briefly at its
extremes. This is what stops the morph reading as a continuous smear.

Scene progress is additionally lerped toward its target at `dt * 5.2` so that a
fast flick or a jump-to-chapter still travels through the intermediate states
instead of cutting.

## Chapter choreography

Every chapter: copy reveals on `--e-out` over `--d-slow`, staggered 80 ms per
element, triggered at 12% from the bottom of the viewport. The field morphs
continuously and is never triggered — it is always exactly where scroll says.

| # | State | Geometry | Edge family in force | Note |
|---|---|---|---|---|
| 00 | `seed` | Vertical column, golden-angle spiral | proximity @ 0.55 | At rest. Slow auto-rotation only. |
| 01 | `bloom` | Fibonacci sphere shell, jittered | proximity @ 1.00 | The graph "comes online". Pulse density peaks. |
| 02 | `infer` | Six layers along X, grid within each | layer @ 1.00 | Proximity drops to 0.06 so the layering reads. |
| 03 | `settle` | Globe, nodes gathered into 9 latitude corridors | proximity @ 0.85 | Auto-rotation rate ×1.4 here only. |
| 04 | `vault` | Cubic lattice, ~75% filled | lattice @ 1.00 | Reads as an eroded vault wall. |
| 05 | `ledger` | Flat plane with a low standing wave | proximity @ 0.45 | Camera pitch drifts to near-level. |
| 06 | `core` | Collapse toward a single dense point | proximity @ 0.90 | Everything converges. CTA lands on the collapse. |

**Edges fade, they never cut.** An edge's opacity is the blend of its
visibility weight in the outgoing and incoming states. This is the whole trick
behind the object appearing to rewire itself rather than teleport.

## Continuous behaviours

- **Auto-rotation** — 0.05 rad/s, always, in every state. Stops entirely under
  `prefers-reduced-motion`.
- **Drag to rotate** — adds angular velocity, damped at 0.92/frame on yaw and
  0.90 on pitch. Pitch clamps to ±0.85 rad so the field is never seen from a
  degenerate angle. On touch, the gesture is only claimed once it is clearly
  horizontal, so a vertical swipe still scrolls the page.
- **Signal pulses** — 16 at tier A, travelling bright along any edge currently
  above 25% visibility, 0.5–1.4 s per traverse, respawning on a new random edge.
- **Energy** — a chapter change adds 0.5 to a decaying energy value (×0.94 per
  frame) that briefly brightens edges and swells node size. It is the only
  "event" animation in the scene, and it is what makes crossing a chapter
  boundary feel like something happened.

## Smooth scroll

Lenis on pointer-fine devices, lerp 0.085. **Native scroll on touch** — no
exceptions. Hijacking momentum scroll on a mid-range Android is the fastest way
to make a fast site feel slow, and it breaks browser find-in-page, accessibility
focus and pull-to-refresh along with it.

## Reduced motion

`prefers-reduced-motion: reduce` is honoured as a first-class design, not a
degradation:

- Copy reveals become instant; everything is visible at rest.
- Auto-rotation and pulses stop.
- The field still morphs with scroll — it is the page's information, not its
  decoration — but snaps to state without inertial lerp.
- The page is fully legible and fully navigable with the canvas removed
  entirely, which is also tier C's behaviour.

## Page transitions (production only, not in the prototype)

Route changes keep the canvas mounted and hoisted in the root layout. Outgoing
copy masks up over 320 ms on `--e-inout`, the field travels to the incoming
route's state over 900 ms, incoming copy reveals at 180 ms delay. Total 1.1 s,
interruptible at any point by another navigation.
