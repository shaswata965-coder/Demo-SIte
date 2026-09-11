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
index.html        markup and copy
css/tokens.css    the colour system — light and dark, both derived from one hue
css/main.css      layout, chapters, per-chapter aesthetic
js/neural.js      the model: arrangements, edge families, rendering
js/app.js         scroll → everything else
```

## How it works

**One number drives the page.** Scroll position becomes `progress`, a float in
`[0, 6]`. Its whole part picks the arrangement, its fraction blends into the
next. The same number also turns the model, so it reads as one object being
rotated and inspected rather than a sequence of poses.

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
face and fitting its frame.

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

## Porting to Next.js / React

The split is deliberate:

| This file | Becomes |
|---|---|
| `js/neural.js` | A React Three Fiber scene. `STATES`, the arrangement generators, `VIS` and `POSE_*` carry over unchanged; the hand projection is replaced by instanced meshes and a vertex shader. |
| `js/app.js` | A scroll provider — Lenis + GSAP ScrollTrigger — exposing `progress` through context. |
| `css/tokens.css` | Unchanged. Tailwind v4 reads CSS custom properties directly. |
| `css/main.css` | Component styles; the `[data-chapter]` block stays as-is. |
| `index.html` | `page.tsx` plus a `Chapter` component, with the copy coming from the CMS. |

Nothing here depends on the DOM structure except `app.js`, and nothing in
`neural.js` touches the page.

## Note

AXON is a fictional company invented for this demo. Every figure on the page is
made up.
