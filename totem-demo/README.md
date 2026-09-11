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
squares, hidden units as dots — and each arrangement carries two contextual
annotations on leader lines (`σ activation`, `corridor 41`, `sha-256`).

**Viewing poses.** Scroll spin alone can present an arrangement edge-on; the
layered stack was being viewed straight down its own axis. Each arrangement
carries a yaw, pitch and scale offset (`POSE_*` in `neural.js`), lerped with
the morph, so the model turns continuously but always arrives showing its best
face and fitting its frame. These are tuned against the page's spin table
(`SPIN_AT` in `app.js`) — change one and retune the other.

## The aesthetic transforms with the view

Two numbers — `--h` (hue) and `--s` (saturation) — are set on `<html>` and
everything on the page is computed from them, including the colour of the model
on the canvas. JavaScript owns them rather than CSS so that page and canvas are
painted from the identical value on the identical frame.

Hue walks the spectrum in one direction across the chapters, so a change never
sweeps backwards through colours you have already passed:

```
250 indigo → 200 azure → 168 viridian → 130 green → 42 gold → 12 vermilion → -32 magenta
```

Light and dark read that hue very differently, on purpose:

- **light** — the ground itself takes a saturated wash. Each chapter is a
  distinctly different colourway.
- **dark** — the ground stays near-black and only the signal carries the hue.

Discrete things step per chapter via `data-chapter` on `<html>` and transition
in CSS: display type width (Archivo's `wdth` axis runs 76 → 125 across the
chapters) and weight, letter-spacing, which surface texture is showing, corner
radius, rule weight, and **which side of the content the model sits on**.

### One thing worth knowing if you edit this

Do not put a CSS `transition` on any property derived from `--h`. JS moves the
hue every frame, so a transition restarts every frame and the page colour ends
up permanently lagging the model's. Colour changes are already smooth because
the hue itself is interpolated. Only the light/dark flip is a genuine step, and
it gets a transition through the `.theming` class that the toggle adds for the
length of the fade.

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

## Nothing may leave the copy invisible

The chapter copy animates in, and the rule the code follows is that **no script
failure can hide it**. It is visible in the stylesheet; it is hidden only while
`.reveals-armed` is on the root, which `app.js` adds *after* it has successfully
built an observer. Three independent things remove it again: the observer
firing, a 2.5-second failsafe timer, and the `catch` around initialisation. A
reader never depends on all three working — block `js/neural.js` in devtools and
the page degrades to a readable static page rather than a blank one.

Scroll progress is measured from `getBoundingClientRect()`, not `window.scrollY`,
for the same reason: when the page is embedded, the element doing the scrolling
may not be the window, and `scrollY` would sit at zero forever.

If you add a reveal, give it the `.rv` class and it inherits all of this. Do not
gate visibility on a class that only JS removes.

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
