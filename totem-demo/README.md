# totem-demo

A scroll-driven demo page: one neural model, on one side of the content,
turning through seven arrangements while the page's entire aesthetic transforms
with it. Plain HTML, CSS and JS — no build step, no dependencies.

Built to be ported to Next.js / React later; see "Porting" below.

## Run it

```sh
python3 -m http.server 8000 --directory totem-demo
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

**The model is dragged between chapters.** It alternates sides every chapter and
the copy alternates with it. Crossing is not a CSS transition fired after the
chapter changed — the stage's `transform` is written every frame from
`progress`, so the model is physically pulled across the page while you scroll.
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

| # | Chapter | Arrangement | What it is |
|---|---|---|---|
| 0 | Dormant | `seed` | A twisted double helix column, rungs across the strands |
| 1 | Ingest | `bloom` | Two nested shells — an outer sensor surface, an inner core, spokes between |
| 2 | Inference | `infer` | Six layers, each a ring, fanned forward layer to layer |
| 3 | Settlement | `settle` | A globe banded into latitude corridors, with bowed long-haul arcs |
| 4 | Assurance | `vault` | A hollow cube — lattice on the faces, small solid core inside |
| 5 | Proof | `ledger` | A ledger plane with risers standing off it |
| 6 | Begin | `core` | Collapse to a core, one orbital ring still holding |

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

**One palette, held constant.** An earlier pass rotated the page's hue per
chapter, repainting the whole ground every section — it read as seven different
websites and, because the hue was rewritten every frame, it also repainted the
full-viewport texture layers every frame.

Colour now lives in two places:

**The model carries six hues at once,** assigned by *structure*, so the colour
decodes rather than decorates. Each edge family gets its own: the shell wiring
is blue, the layer fan violet, the lattice jade, the corridor rings cyan, the
coil coral, the ledger grid amber. Hidden units are coloured by which layer they
belong to — so the inference stack resolves into coloured bands, and every other
arrangement groups rather than speckles. Input and output units keep blue and
coral rings, and the traced inference path and the signal pulses share amber:
one colour for "live signal" throughout.

**The copy carries one accent per chapter,** and nothing else changes. Each
chapter names an accent and a contrast in `CHAPTERS` (`app.js`); the marker, the
`<em>` phrases, the `<strong>` claims and the figures pick them up from
`[data-accent]` in `tokens.css`. `<em>` names the thing, `<strong>` states the
claim — two levels of emphasis, both in colour, both carrying meaning.

The palette is read out of the stylesheet once (`palette()` in `app.js`), so the
model and the page can never disagree and no colour maths is duplicated across
two languages. Nothing is written to the root every frame.

Per chapter, the only things that still step are the display type's width and
weight (Archivo's `wdth` axis runs 82 → 124) and which side of the content the
model sits on.

## Pacing

Each chapter is one viewport of copy followed by a **half-viewport gap**
(`.chapter + .chapter { margin-top: 50svh }`), so a chapter spans 150svh of
scroll. Progress is measured between section tops, so travel, roll and morph all
stretch over that whole distance — the transition is 50% slower than a
one-viewport chapter without changing a single easing value. To retime the whole
piece, change that one margin.

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

## Rendering at full screen

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
| `js/app.js` | A scroll provider — Lenis + GSAP ScrollTrigger — exposing `progress` through context. The stage travel becomes a scrubbed timeline; `dragEase` becomes its ease. |
| `css/tokens.css` | Unchanged. Tailwind v4 reads CSS custom properties directly. |
| `css/main.css` | Component styles; the `[data-chapter]` block stays as-is. |
| `index.html` | `page.tsx` plus a `Chapter` component, with the copy coming from the CMS. |

Nothing here depends on the DOM structure except `app.js`, and nothing in
`neural.js` touches the page.

## Note

AXON is a fictional company invented for this demo. Every figure on the page is
made up.
