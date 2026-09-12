# Demo-Totem

A scroll-driven demo site for **AXON**, a fictional LLM inference efficiency
consultancy: one neural model turning through seven arrangements while the page
transforms with it. Plain HTML, CSS and JS — no build step, no dependencies.

Seven sections — intro, services, method, selected work, team, collaborations,
contact. Three of them keep the model **beside** the copy; four of them are
grids of real components (project cards, people, a partner wall) that need the
whole screen, so the model drops **behind** them instead. Both are the same
three numbers, lerped on one curve — see "Two layout modes" below.

Built to be ported to Next.js / React later; see "Porting" below.

## Run it

```sh
python3 -m http.server 8000 --directory Demo-Totem
# http://localhost:8000
```

Opening `index.html` directly from disk works too.

## Files

```
index.html            markup and copy
css/tokens.css        the colour system — light and dark, both derived from one hue
css/main.css          layout, chapters, per-chapter aesthetic
js/neural.js          the model: arrangements, edge families, rendering
js/app.js             scroll → everything else
tools/make-embed.mjs  build an embed copy — see "Embedding" below
```

## How it works

**One number drives the page.** Scroll position becomes `progress`, a float in
`[0, 6]`. Its whole part picks the arrangement, its fraction blends into the
next. The same number also moves the model across the page and turns it, so it
reads as one object being dragged and inspected rather than a sequence of poses.

**The model is dragged between chapters.** Crossing is not a CSS transition
fired after the chapter changed — the model's position is written every frame
from `progress`, so it is physically pulled across the page while you scroll.
Travel, roll and morph all run off one easing curve, `dragEase`: *hold, move,
hold*. The model sits still through the top and tail of a chapter and does all
of its travelling, turning and reconfiguring in the middle. It rolls in the
direction it is being pulled — a move left turns it left — and dips slightly in
scale mid-crossing, which reads as weight.

**It never turns on its own.** Ambient yaw drift is off. The model moves because
you scrolled it or dragged it; the signal pulses keep it alive while it stands
still. This also keeps each arrangement's viewing pose reliable, which ambient
drift would decay within a minute.

**Seven arrangements**, each with its own geometry, edge families and viewing
pose:

| # | Section | Layout | Arrangement | What it is |
|---|---|---|---|---|
| 0 | Intro | side | `seed` | A twisted double helix column, rungs across the strands |
| 1 | Services | side | `bloom` | Two nested shells — an outer sensor surface, an inner core, spokes between |
| 2 | Method | full | `infer` | Six layers, each a ring, fanned forward layer to layer |
| 3 | Selected work | full | `settle` | A globe banded into latitude corridors, with bowed long-haul arcs |
| 4 | Team | full | `vault` | A hollow cube — lattice on the faces, small solid core inside |
| 5 | Collaborations | full | `ledger` | A ledger plane with risers standing off it |
| 6 | Contact | side | `core` | Collapse to a core, one orbital ring still holding |

**Edges fade, they never cut.** Every edge belongs to a family (`helix`,
`prox`, `spoke`, `layer`, `ring`, `arc`, `lattice`, `riser`) and carries a
visibility weight in all seven states. A connection that belongs to the layered
stack dims away as the globe forms rather than vanishing. That is the whole
trick behind the model appearing to rewire itself.

**Nodes are drawn by role** — inputs and outputs as rings, bias units as
squares, hidden units as dots — and each arrangement carries one contextual
annotation on a leader line (`σ activation`, `corridor 41`, `immutable`).

**Viewing poses.** Scroll spin alone can present an arrangement edge-on; the
layered stack was being viewed straight down its own axis. Each arrangement
carries a yaw, pitch and scale offset (`POSE_*` in `neural.js`), lerped with
the morph, so the model turns continuously but always arrives showing its best
face and fitting its frame. These are tuned against the page's spin table
(`SPIN_AT` in `app.js`) — change one and retune the other.

## Colour

**Three colours. That is the whole palette.**

| | Role |
|---|---|
| `--c-primary` | The structure you are looking at — the shell, the lattice, the coil, the ledger grid, and every piece of interface chrome. |
| `--c-second` | Wiring that runs *between* structures — the layer fan, the spokes, the corridor rings and arcs. |
| `--c-signal` | Reserved for what is **live**: the traced inference, the pulses, the output terminals, and the one claim in each sentence. Nothing else may use it. |

An earlier pass ran six accents in the model and a different accent pair per
chapter. It was not a palette, it was a swatch book — the page had no colour
identity because every screen had a different one. The rule now is that colour
is assigned by *role*, never by position: the same thing is the same colour on
every chapter.

`<em>` names the thing in primary, `<strong>` states the claim in signal, and
that pairing is identical in all seven chapters.

The palette is read out of the stylesheet once (`palette()` in `app.js`), so the
model and the page cannot disagree and no colour maths is duplicated across two
languages. Nothing is written to the root per frame.

Per chapter, the only things that step are the display type's width and weight
(Archivo's `wdth` axis runs 84 → 122) and which side of the content the model
sits on.

The ground is **warm** — paper rather than a cool near-white, ink with brown in
it — and the primary is a muted burnt orange. `--c-second`, the one cool hue, is
there so the model has something to separate its two kinds of wiring with; it
also carries `<strong>`, so the two levels of emphasis in the copy stay
distinguishable instead of being two oranges.

One trap worth knowing: `.chapter p` is a type-plus-class selector (0,1,1), so a
component rule written as a bare class — `.card-tag`, `.role`, `.marker` — loses
to it and is silently overridden. Component paragraph rules are written
`.chapter .card-tag` for that reason.

## Pacing, resistance, and why the copy is pinned

A chapter is **1.82 viewports** of scroll and `.ch-body` is `position: sticky`,
so the copy is on screen for all of it — **from 900px up**. Below that it is in
flow; see "Narrow screens".

That stickiness is not a style choice, it is what makes the pacing possible.
With the copy free-flowing, an empty screen becomes reachable the moment a
chapter is taller than one viewport plus the shortest copy block — measured at
1.45 viewports here. Past that you can stop scrolling between two sections and
be looking at nothing. Pinning the copy removes the ceiling entirely.

`dragEase` settles for the first 30% of the chapter, then travels the remaining
70%, landing exactly as the next chapter's copy arrives.

**The scroll itself is driven from the frame loop.** The wheel moves a target;
the real scroll position chases it every frame with a ~0.26s time constant.

Two things about that are deliberate:

- It moves the **actual scroll position**, not a transform. A transform-based
  smooth scroller is the usual approach and it would break `position: sticky`,
  which the pinned copy this whole layout depends on.
- The **settle is folded into the same target** rather than being a separate
  `scrollTo` fired after a timer. Two competing motions is what made the scroll
  feel like it stopped and then started again. There is one value now, eased
  continuously, so coming to rest on a section is the same motion as scrolling
  rather than a jump tacked onto its end.

CSS scroll-snap cannot do this job: `mandatory` turns every wheel notch into a
committed 1600px jump across a chapter this tall, and `proximity` did not engage
at all — a flick came to rest 180px in. So the rule lives in `settleFor()`: once
input stops, under `SETTLE_AT` (32%) of the way into a chapter returns you, past
it carries you the rest of the way. Measured at 1440×900, chapter = 1620px:

| gesture | result |
|---|---|
| 180px flick | returns to the section |
| 500px scroll | returns to the section |
| 1700px scroll | lands exactly on the next section |

Fine pointers only — on touch, native momentum is better than anything
reimplemented on top of it, so the wheel handler and the settle are both off
there and the page scrolls natively.

Weight comes from two stages in series: the scroll eases toward its target
(~0.26s), and `field.progress` then chases the scroll (`dt * 1.9` in
`neural.js`, ~0.5s). Travel, roll and morph all read off that second value, so
the model never tracks the wheel rigidly.

To retime the piece, change `.chapter { min-height }`. To change how much is
settle versus travel, change the two numbers in `dragEase`. To change how
willing the page is to advance, change `SETTLE_AT`. To change how much glide
the scroll has, change `SCROLL_TAU`.

## Depth while crossing

The model passes across the copy column, and at full strength it sat on top of
the text it is meant to be illustrating. While it crosses it now **recedes** —
to 28% of the section's own opacity and 90% of its zoom — and returns to full
only once it has arrived and settled. The curve plateaus through the middle rather than easing
smoothly through it, so the screen is clean for the whole crossing rather than
just its midpoint.

Two parallax layers give the crossing depth: the dot grid drifts at 7% of scroll
speed (modulo its own 30px pitch, so the loop is seamless) and the pinned copy
lifts 22px through its chapter. Only the chapter you are in carries an offset —
two style writes a frame at most.

## Section rhythm

Every other chapter sits on a soft wash of the primary
(`color-mix(in srgb, var(--c-primary) 7%, var(--bg))`), so scrolling alternates
between the airy ground and a tinted one and the boundary crosses the screen as
a hard edge. One tint, not one per chapter — the alternation is the rhythm, the
colour stays put.

Getting the band *behind* the model took a specific stacking arrangement, worth
knowing before you touch it:

```
body background
  .band              z-index: -1   full-bleed, sized to the chapter
  .texture           z-index:  0
  .stage (canvas)    z-index:  1
  .ch-body (copy)    z-index:  3
```

`.doc` and `.chapter` must **not** create stacking contexts — no `z-index`, no
`transform`, no `opacity` on either — or the band cannot reach below the canvas
and the copy cannot reach above it. That is why the copy lives in a `.ch-body`
wrapper rather than sitting directly in the section.

## Narrow screens

Below 900px there is no half of the screen to park anything in, so the model
becomes a backdrop for the whole page: centred, larger relative to the screen
(`zoom: 1.42`) and faint enough to read a paragraph through (`dim: 0.30`). It
still morphs and still rolls with the scroll — that is the part worth keeping
on a phone.

**Nothing is pinned below 900px.** A `position: sticky` block taller than the
viewport puts its own last lines permanently out of reach, and at 360×640 every
section with a grid in it is taller than the viewport. Buying that height back
by truncating a sentence or hiding a bio is paying for a pin with content, so
the pin goes instead: the copy flows, the section is as tall as it needs to be
with one screen as its floor, and the fixed model behind it carries the effect.

Measured with `tools/`-adjacent Playwright runs at 360×640, 390×844, 834×1112,
960×700, 1280×720, 1440×900, 2560×1400 and 3440×1440: no horizontal scroll at
any width, and no pinned section taller than its viewport.

## Micro-animation

With ambient rotation off, a stationary model looked frozen between chapters.
Three things keep it alive, all driven from one clock (`field.t`):

- **Idle wander** — each unit drifts on two incommensurate sines per axis, about
  1.6% of the model's radius, so the structure never loops visibly and never
  sits perfectly still.
- **Firing** — each unit brightens and swells on its own slow cycle, cubed so it
  is mostly quiet with a brief peak, the way an activation behaves.
- **Comet pulses** — a round-capped segment for the tail and a dot for the head,
  travelling the visible edges in amber.

Each of these costs fill area, which is the frame budget (see above). The
trail in particular: four stacked dots and one thick stroke both read the same
and both cost more than they look like they should.

## Performance

Three quality tiers picked from `deviceMemory`, `hardwareConcurrency` and
`saveData`, then demoted — never promoted — by a frame-time governor. Edges are
bucketed by opacity into eight `Path2D` strokes per frame rather than one stroke
per edge, which is the single biggest win on mid-tier hardware. Each family gets
its own share of the edge budget so no arrangement is left without its
structure.

`prefers-reduced-motion` stops the rotation and the pulses and snaps the morph;
the page stays fully legible and navigable.

## Embedding

`index.html` is a complete document split across `css/` and `js/`, which is what
you want when hosting it and what ports cleanly to React. Embedding is a
different problem: a host that supplies its own document skeleton drops your
file inside its `<body>`, leaving a second document nested in the first with the
attributes on `<html>` discarded — and relative subpath requests for `css/` and
`js/` may not resolve the way they do on your own server.

```sh
node tools/make-embed.mjs   # writes dist/index.html
```

That emits **one self-contained file**: no doctype, no `<html>`, no `<head>`, no
`<body>`, every stylesheet and script inlined, nothing left to fetch but the
webfont. `app.js` sets `lang` and `data-chapter` on the root itself, so the
embed build behaves identically to the standalone one. Use it for anywhere you
are pasting the page into someone else's document; use `index.html` for hosting.

## Two layout modes, one canvas

The canvas is **fixed at viewport size for the life of the page**. It is never
moved by the layout and never scaled by CSS: one would reallocate the backing
store mid-scroll, the other would blur every mark. Everything the model does
spatially happens *inside* it, through three numbers `app.js` writes each frame:

| | |
|---|---|
| `field.originX` | where the model sits across the canvas, 0..1 |
| `field.zoom` | how large it is drawn, on top of the radius `resize()` derived |
| `.stage` opacity | how far forward it comes |

A section declares its own values in `CHAPTERS` (`app.js`) and they are lerped
on `dragEase` — the same curve as the morph and the roll — so a section that
stands the model beside its copy and one that lies it behind a full screen of
cards *transition into each other* rather than cutting:

- **`.is-side`** — copy takes 46% of the container, model centres in the rest,
  `dim: 1`, `zoom: 0.82`.
- **`.is-full`** — copy takes the whole container, model centres behind it,
  `dim: 0.24–0.30`, `zoom: 1.26–1.34`. The four full sections still drift left
  and right rather than sitting dead centre for four chapters in a row, so the
  model is travelling (and rolling) even when it is only a backdrop.

`anchor()` measures the real `.ch-inner` rectangle rather than recomputing the
CSS clamps, so the model and the copy can never disagree about where the
halfway line is — which is what keeps a 3440px monitor from putting a paragraph
and a model a metre apart. `--maxw` (1680px) caps the container; the model is
parked against that box, not the raw viewport.

Every mark is drawn in `u`, a unit derived from the model's own radius
(`neural.js`, `resize`). Sizing dots, strokes and labels in fixed pixels holds
together on a laptop and turns the model to dust on a 27-inch display, where the
frame scales and the marks do not.

Unit count scales with the stage's area, and each arrangement carries a scale in
`POSE_SCALE` so it fits its frame — a flat plane seen square-on needs roughly
half the scale of a volume. Measured margins at 1280×720 through 2560×1440: all
seven arrangements clear the frame edge by at least 16px.

**Line width does not scale with `u`.** This is the one exception and it matters:
edge fill area is count × length × width under additive blending, and it is the
entire frame cost. Scaling width with the model tripled the blended area at
2560 for no visual gain — 19 fps. Hairlines plus a depth cutoff on faint edges
put it back to 58. If you are ever profiling this, the cost is edges; it is not
the node loop and it is not page compositing.

Note the shape of that rule after the backdrop sections were added. `u` now
tracks `zoom`, so a backgrounded model draws heavier *nodes* — but line width is
sized off `uBase`, the unzoomed unit, so a model at `zoom: 1.34` gets longer
edges and not fatter ones. Getting this wrong is not subtle: with width scaling
too, a full-bleed section measured 33.3 ms/frame at 1440×900, exactly half rate.

**`field.detail` pays for the backdrop.** A section that dims the model to 28%
also turns `detail` down, which raises the alpha cutoff in the edge loop from
0.115 to about 0.30. The edges it drops are ones already below the threshold of
visible at that opacity, and dropping them is what buys back the fill area the
larger `zoom` costs. Measured in a software-rendered container:

| | side, zoom .82 | full, zoom 1.34 |
|---|---|---|
| 1440×900 | 16.7 ms | 16.7 ms |
| 2560×1400 | 16.7 ms | 16.7 ms median, 33.3 ms p95 |

The 2560 backdrop is the one case still grazing the budget — a full-viewport
canvas there is 3.6M pixels to clear and composite every frame, 2.5× what the
old half-width stage was.

## If the model fails to build

`armReveals()` runs *after* `boot()`. That ordering is deliberate: the copy is
visible in the stylesheet and hidden only once reveals are armed, so if the
model throws, the hiding never happens, the page is a readable static page, and
the error reaches the console rather than being swallowed. There is no timer and
no `catch` doing this — just the call order.

Scroll progress is measured from `getBoundingClientRect()`, not `window.scrollY`:
when the page is embedded, the element doing the scrolling may not be the
window, and `scrollY` would sit at zero forever.

## Porting to Next.js / React

The split is deliberate:

| This file | Becomes |
|---|---|
| `js/neural.js` | A React Three Fiber scene. `STATES`, the arrangement generators, `VIS` and `POSE_*` carry over unchanged; the hand projection is replaced by instanced meshes and a vertex shader. |
| `js/app.js` | A scroll provider — Lenis + GSAP ScrollTrigger — exposing `progress` through context. The travel, zoom and dim become a scrubbed timeline; `dragEase` becomes its ease. |
| `css/tokens.css` | Unchanged. Tailwind v4 reads CSS custom properties directly. |
| `css/main.css` | Component styles; the `[data-chapter]` block stays as-is. |
| `index.html` | `page.tsx` plus a `Chapter` component (`is-side` / `is-full` as a prop), with the copy, projects, people and partners coming from the CMS. |

Nothing here depends on the DOM structure except `app.js`, and nothing in
`neural.js` touches the page.

## Note

AXON is a fictional company invented for this demo. The team, the projects, the
partner brands, the testimonial and every figure on the page are made up, and
`hello@axon.example` is a reserved example domain that goes nowhere.
