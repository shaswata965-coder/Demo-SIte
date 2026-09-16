# Demo-Totem

A scroll-driven demo site for **AXON**, a fictional LLM inference efficiency
consultancy: one neural model turning through seven arrangements while the page
transforms with it. Plain HTML, CSS and JS — no build step, no dependencies.

Seven sections — intro, services, method, selected work, team, collaborations,
contact. Five keep the model **beside** the copy; two — the ones that are grids
of real components with imagery in them — need the whole screen, so the model
drops **behind** them instead. Both are the same three numbers, lerped on one
curve; see "Two layout modes" below.

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
css/tokens.css        the colour system — five skins, each in light and dark
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
| 0 | Intro | side right | `seed` | A twisted double helix column, rungs across the strands |
| 1 | Services | side left | `bloom` | Two nested shells — an outer sensor surface, an inner core, spokes between |
| 2 | Method | side right | `infer` | Six layers, each a ring, fanned forward layer to layer |
| 3 | Selected work | **full** | `settle` | A globe banded into latitude corridors, with bowed long-haul arcs |
| 4 | Team | side left | `vault` | A hollow cube — lattice on the faces, small solid core inside |
| 5 | Collaborations | **full** | `ledger` | A ledger plane with risers standing off it |
| 6 | Contact | side right | `core` | Collapse to a core, one orbital ring still holding |

**Two backdrops, and they are not adjacent.** An earlier pass had four in a
row. Consecutive dimmed screens read as the model having been switched off
rather than as a change of register — the effect only means something if the
model comes back out in front. Team sits between the two at full strength,
which is what lets the partner wall take the whole viewport without the middle
of the page going flat. Team earns its half-screen by being a roster of small
round portraits rather than four large cards.

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

**Five skins.** A skin is the whole colour set at once — ground, panel, ink,
the four hues, and whether the model is drawn as plotted ink or as additive
light. Sections own a skin, so an alternate section is a differently-coloured
room rather than a stain on the same one.

| Skin | Sections | Light | Dark |
|---|---|---|---|
| `paper` | Intro, Method, Team | near-white, faintly cool | near-black |
| `violet` | Services | flooded violet, light ink, **model flips to light** | deeper violet |
| `lemon` | Work | flooded electric yellow, dark ink, near-white cards | deep amber |
| `cyan` | Partners | flooded electric cyan, dark ink | deep teal-blue |
| `ember` | Contact | near-black violet, where the call to action sits | the same, darker |

The pass before this one held one warm paper ground for the whole page and
tinted every other section by 5–8% towards an accent. At that strength a
"colour" is a change of paper, not a change of room, and three of them in a row
read as one long grey page. The four hues under it were desaturated enough — a
64%-chroma orange, a teal, an indigo, a gold — that the page read as grey with
decoration on it.

Within a skin, colour is still assigned by *role*, never by position:

| | Role |
|---|---|
| `--accent` / `--c-primary` | Action: the call to action, the focus ring, the marker rule, `<em>`, and the arrangement's own body — the coil and the proximity mesh. |
| `--c-second` → `--contrast` | The workhorse: eyebrows, role labels, step numbers, partner marks, `<strong>`, and the wiring that runs *between* structures. |
| `--c-third` → `--data` | Things being counted — every figure on the page — and the frames the model is held in, the lattice and the risers. |
| `--c-signal` | What is **live**: the traced inference, the pulses, the output terminals. |

The three `paper` sections hold the assignment fixed — orange is action, violet
is structure, azure is data, magenta is what is running. A flooded section
recasts the two roles its own ground would swallow: on `violet`, yellow takes
action and orange takes structure.

**The orange.** `--accent` is `#FF5F0C`: full chroma, and exactly 1.5x the
relative luminance of the `#C25E2A` it replaces. At that brightness it is an
excellent ground and a poor foreground, so there are two of it. `--accent` is
the *fill* — the button, the rule, the model. `--accent-ink` is the same hue as
*text*, at the lightness the ground can actually carry; `<em>`, `.btn:hover`
and the rail's current section use that one. Mixing them up is how you get a
2.9:1 paragraph.

Every value in `tokens.css` is solved, not eyeballed: each hue goes to full
chroma and then to the lightness nearest the pure hue (L = 0.5) that still
clears 4.5:1 against its own ground — and against its own panel on the skins
that carry cards. There are no sub-4.5 pairs in the file.

**A skin lands in two places.** On the `<section>` as `.skin.sk-<name>`, which
paints its band and tones its copy — so a section stays readable against its
own ground even mid-transition, when the section above it may be near-white and
the one below deep violet. And on `:root` as `data-skin`, written by `paint()`
from the active section, which is where the model reads its colours and where
the topbar's scrim is drawn from. Nothing is written per frame: `readSkin()`
runs once per skin or theme change, because `getComputedStyle` straight after
an attribute write forces a style recalc.

The persistent chrome is fixed while the bands slide under it, so at a boundary
it can be over two very different grounds at once. The topbar scrim is what
gives it one of its own — it carries the root's skin, which `app.js` keeps in
step with the section the chrome is actually over.

Per section, the only other things that step are the display type's width and
weight (Archivo's `wdth` axis runs 84 → 122) and which side the model sits on.

One trap worth knowing: `.chapter p` is a type-plus-class selector (0,1,1), so a
component rule written as a bare class — `.card-tag`, `.role`, `.marker` — loses
to it and is silently overridden. Component paragraph rules are written
`.chapter .card-tag` for that reason.

## Pacing, glide, and why the copy is pinned

A chapter is **1.82 viewports** of scroll and `.ch-body` is `position: sticky`,
so the copy is on screen for all of it — **from 900px up**. Below that it is in
flow; see "Narrow screens". That pinning is also what lets the scroll be free:
with no dead zone to fall into, nothing has to drag you out of one.

That stickiness is not a style choice, it is what makes the pacing possible.
With the copy free-flowing, an empty screen becomes reachable the moment a
chapter is taller than one viewport plus the shortest copy block — measured at
1.45 viewports here. Past that you can stop scrolling between two sections and
be looking at nothing. Pinning the copy removes the ceiling entirely.

`dragEase` settles for the first 30% of the chapter, then travels the remaining
70%, landing exactly as the next chapter's copy arrives.

**The scroll itself is driven from the frame loop.** The wheel moves a target;
the real scroll position chases it every frame with a **0.30s** time constant —
half again the 0.20s it started at. Tau is the time to cover the first 63% of
whatever distance is left, so raising it is exactly what "smoother" means here:
the same gesture travels the same distance but arrives on a longer, flatter
curve instead of snapping onto the target. `WHEEL_GAIN` is deliberately
unchanged — a notch should still carry as far as it did, it should just take
the journey more gently. Measured at 1440x900: 43% of a notch covered at 156ms,
against 54% before.
Measured: a notch travels 90% of its distance in about 570ms, monotonically,
decelerating the whole way.

It moves the **actual scroll position**, not a transform. A transform-based
smooth scroller is the usual approach and it would break `position: sticky`,
which the pinned copy this whole layout depends on.

### There is no snapping, and removing it was the point

An earlier version pulled you to the nearest section boundary once input
stopped: back if you were less than a third of the way in, forward if you were
past it. On paper that keeps every rest position tidy. In practice it is the
page arguing with you.

It was worst in the direction you would least expect. Scroll *up* into the
previous section, pause, and the forward rule threw you back down to where you
started — a whole section of scrolling undone by letting go. A screen recording
of exactly that is what killed it: six seconds of scrolling up to reach the
partner wall, then a pause, then the page put itself back at the bottom of the
contact section.

The reason it could go at all is that `.ch-body` is `position: sticky` for the
full height of its chapter, so **there is no dead zone between sections** —
every scroll position shows some chapter's copy. Snapping was solving a problem
the pinning had already solved. What is left is a target and an exponential
chase, and you stop where you stopped.

The difference shows up in the numbers, not just the feel. Sampling model
progress through one long wheel-driven scroll, before and after:

| | progress samples |
|---|---|
| snapping | 0.11 0.53 1.22 2.07 2.96 3.92 4.90 5.46 … |
| flowing | 0.08 0.36 0.76 1.21 1.71 2.21 2.71 3.16 … |

The first is the page being thrown from section to section. The second is a
glide.

To retime the piece, change `.chapter { min-height }`. To change how much of a
chapter is settle versus travel, change the two numbers in `dragEase`. To
change how much glide the scroll has, change `SCROLL_TAU`; `WHEEL_GAIN` sets
how far one notch carries.

Weight comes from two stages in series: the scroll eases toward its target
(~0.26s), and `field.progress` then chases the scroll (`dt * 1.9` in
`neural.js`, ~0.5s). Travel, roll and morph all read off that second value, so
the model never tracks the wheel rigidly.

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

Section rhythm lives in the markup: each `<section>` carries `.skin` plus a
`.sk-*` class, and `.band` paints `var(--bg)` from it. There is nothing to
override in CSS — a section's colour is chosen by naming its skin, and the
band, the copy, the emphasis, the cards and the model all follow from that one
name.

This works because the copy and the incoming band move together. `.ch-body`
unsticks at exactly the point the next band reaches the bottom of the viewport,
so a section's copy is never left sitting on the next section's ground — which
is what makes a near-white section legible right up against a deep violet one.

Getting the band *behind* the model took a specific stacking arrangement, worth
knowing before you touch it:

```
body background
  .band              z-index: -1   full-bleed, sized to the chapter
    .hitech          sticky inside it, on the three paper sections
  .texture           z-index:  0
  .stage (canvas)    z-index:  1
  .ch-body (copy)    z-index:  3
```

`.doc` and `.chapter` must **not** create stacking contexts — no `z-index`, no
`transform`, no `opacity` on either — or the band cannot reach below the canvas
and the copy cannot reach above it. That is why the copy lives in a `.ch-body`
wrapper rather than sitting directly in the section.

## The typed title, and the rig around the copy

Each screen runs one sequence, and everything on it waits its turn:

1. the eyebrow arrives — `.arming` on the `<section>`
2. the title types, character by character, with a caret
3. the caret stops, and the body copy and the instrument rig come in —
   `.typed` on the `<section>`

### What fires it, and why it is not an observer

The first version hung this off an `IntersectionObserver` on the heading, and
it looked broken on almost every screen. Instrumenting it said why:

```
c1 ARMING y=418     ← typing starts while the section is still 418px below the fold
c1 TYPED  y=-989    ← the reveal lands after the copy has scrolled off the top
c3 ARMING y=409     ← c3 arms while c2 is still typing
```

A margin box is a poor proxy for "this screen has arrived" when the copy is
`position: sticky` and the section is 1.82 viewports tall. So the sequence
hangs off **`progress`** instead — the same number the model, the stage and the
skins are built on, which says exactly where the copy is.

One detail that is easy to get wrong and worth a full screen of lag: fire off
the **scroll's** progress, not `field.progress`. The field chases the scroll
with a ~0.5s time constant, which is exactly the weight the model wants and
exactly half a screen of error for anything trying to fire as a screen lands.
`frame()` writes `scrollP` and `paint()` gates on that.

A screen arms at `progress = i − 0.08`, a short run-up so the title is mid-type
as the screen settles rather than starting after it. Screens behind you are
released outright — you have passed them, and scrolling back up should find
copy, not a blank. Measured at the three speeds that matter, `local` being the
fraction of the section scrolled past (its copy is pinned from 0 to 0.44):

| scroll speed | arms at | completes at |
|---|---|---|
| ~600 px/s, reading | −0.08 | 0.07 – 0.19, copy pinned |
| ~1100 px/s, moving | −0.08 | 0.12 – 0.32, copy pinned |
| ~2700 px/s, a flick | −0.08 | 0.28 – 0.60, copy still on screen |

### Typing without reflow

**Every character is in the DOM from the start and merely invisible.** The
heading therefore occupies its final box before the first character lands:
nothing reflows as it types, and `text-wrap: balance` still gets the whole
string to balance against. Truncating `textContent` per frame — the obvious
implementation — does the opposite of all three.

Characters are wrapped **a word at a time** in `.tw-w { display: inline-block }`,
because a bare span per character lets the browser break a line between any two
letters of a word. The caret is an absolutely positioned `::after` on whichever
character was typed last, so it costs no layout either.

The real sentence goes to an `aria-label` on the heading and the character
spans are `aria-hidden`, so a screen reader is handed the sentence rather than
a stream of single letters. `<br>` is kept as a break for the eye and as a
space for the label — `textContent` drops it entirely and would otherwise run
the two lines together.

Typing is driven off elapsed time in one `requestAnimationFrame` loop rather
than a timer per character, so it runs at the same speed on a 60Hz and a 120Hz
screen. The per-character delay shortens as the title grows (`TYPE_PER` capped
by `TYPE_MAX`), so a long title cannot outrun its own screen.

### The rig

The panel around the copy went through two wrong versions before this one. The
first was a schematic in the model's half — which decorated the object that is
already the most decorated thing on the screen. The second framed the copy but
framed it with four brackets, a rule and a tick scale: right placement, far too
quiet. A static line drawing reads as a border, not as instrumentation.

What makes a panel read as live is movement and small dense detail:

| | |
|---|---|
| `.rig-grid` | a coarse measurement grid, radially masked — the panel's own surface |
| `.rig-beam` | a scanning beam that **carries its own scanlines**, so the fine texture exists only where the scanner is. That is the difference between a screen with a scanline filter on it and a screen being read |
| `.rig-reg` | registration crosshairs at the corners. A bracket says "border"; a crosshair says the panel has been aligned to something |
| `.rig-bus` | a bus down the side the model is *not* on, with three pulses running it on a loop |
| `.rig-strip` | a waveform, a readout and a segmented meter |

**The readout is the model's actual state**, not decorative mono type: the
arrangement it is holding, where the scroll is in `[0, 6]`, the yaw it has
turned to, and a meter of how far through this screen you are. It is the same
`progress` the rest of the page runs on, written every fifth frame for the live
screen only.

Everything that moves is gated on **`.live`**, which `paint()` puts on the one
screen you are looking at. Seven panels beaming and pulsing at once would
compete with the canvas for the frame budget for no benefit — you can only see
one. Measured: 3 running animations across all seven panels.

The rig is sized to `.ch-col`, so the same panel fits a hero, a four-item list
and a three-card grid with no per-breakpoint geometry.

One trap to know before editing it: `.rig > i` is `(0,1,1)`, so a bare
`.rig-bus { display: none }` in a media query **loses** to it. The phone and
reduced-motion overrides are written `.rig > .rig-bus` for that reason — the
first pass of both was silently doing nothing.

On a phone the bus is dropped (the copy column is the whole screen there, so it
would sit in the 20px gutter and read as a stray edge line) and the waveform
goes with it. The beam stays. Under `prefers-reduced-motion` there is no
typing, no caret, no beam and no pulses — the readout still updates, because it
is information rather than animation and it only changes when you scroll.

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

Measured with Playwright at 320×568, 360×640, 390×844, 834×1112, 960×700,
1280×720, 1440×900, 2560×1400 and 3440×1440: no horizontal scroll at any width,
and no pinned section taller than its viewport. Method is the tightest — four
steps two-up inside half a screen — and on a short laptop the space to fit it
comes out of padding and step density, not out of the copy.

The partner wall is hairlined by `gap` over a background rather than by borders
on each cell. The nth-child arithmetic that per-cell borders needs has to be
rewritten for every column count, and it broke twice — once dropping the fourth
cell's divider on desktop, once silently leaving the wall at two columns when a
breakpoint rewrite missed. One `gap` works at every column count.

## Placeholder imagery and the partner wall

The project cards, the team and the partner wall carry generated art rather
than photographs or logos: three abstract thumbnails, four stand-in portraits
and twelve geometric marks, hand-authored as inline SVG. Inline rather than image files for three reasons — it themes from the same
tokens as everything else, it costs no request, and the Artifact CSP blocks
images from every external host, so a linked stock photo would render as a
blank box wherever the demo is embedded.

The whole interface is four hue classes: `.g-1/.k-1` through `.g-3/.k-3` plus
`.g-s/.k-s`, fill and stroke. The markup picks a tone, the palette decides what
that tone is, and both themes come out right for free.

Each thumbnail is about its own project rather than being generic texture — a
large sparse cluster distilling into a small dense one, a latency histogram
falling and then flattening past a marker, a fleet grid with two thirds of its
tiles switched off. The portraits vary by tone, build, tilt and halo count so
four people read as four people. All of it is labelled as generated on the page
itself, in each section's standfirst and again in the colophon; none of it is
passed off as a photograph of anyone.

**The partner wall carries real company names as placeholders**, which needs
saying out loud. The twelve marks are neutral geometry in this page's own
palette — deliberately *not* reproductions of anyone's logo — and the section
carries a disclaimer on the page, not buried in the colophon: names are there
to size the layout, no affiliation or endorsement is implied, and AXON is
fictional. Swap the names before this goes anywhere public. The testimonial
moved to the closing section for the same reason: attributing an invented quote
to a real company would have been a fabricated endorsement, so it stays with
its invented one, marked fictional in the caption.

### The wall drifts

The wall was a bordered grid and is now three rows of mark-and-name moving past
in alternating directions. The cells were doing two jobs badly: separating
twelve items that space separates perfectly well, and framing marks that are
not photographs and did not need a frame.

Three things make it work:

- **The loop is seamless because the arithmetic is exact.** Each row holds the
  twelve marks twice, the second run `aria-hidden`, and the belt animates
  `translateX(-50%)`. That lands on the start of the copy *only* if the two
  halves are the same width — so spacing is symmetric `padding-inline` on every
  item and the belt has no `gap` of its own. A `gap` would leave the seam half
  a gap short and the loop would visibly hitch once a minute. Measured: both
  halves 1971px at 1440.
- **The strip is always wider than the row.** A half-belt narrower than its
  container leaves a hole that scrolls past. Twelve items per row is enough at
  every width tested, 3440 included, where the half-belt is 2565px against a
  2331px row.
- **It stops when nobody is watching.** `html:not([data-chapter="5"])` pauses
  all three belts, so off-section they are not competing with the canvas for
  frames. Hover pauses too, which is also what makes the hover state on an
  item reachable.

Under `prefers-reduced-motion` a paused marquee would show four of the twelve
and clip the rest, so the strip becomes a static wrapped set instead and the
duplicate run is hidden.

The glyphs are a `<symbol>` sprite used 72 times rather than 72 inline SVGs —
the same drawing repeated at full length would have added most of a hundred
kilobytes to the embed build for nothing.

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

## Keeping the model in its slot

The page tells the model where to sit; making it actually sit there took two
separate fixes, because the arrangements were landing as much as 81px off the
origin they had been given.

**Model space.** Each arrangement is centred on its own robust bounding box
(2nd–98th percentile per axis, so one stray unit cannot drag the whole model
sideways) before it is ever projected. Only `ledger` was far off — its plane
sits at y −0.75 with a third of its units standing off it — but the subtraction
also gives every arrangement its own middle to spin about instead of orbiting a
point off to one side.

**Screen space.** That is not enough on its own, and measuring says so: with
the geometry centred, the drawn result was still 13px off for `infer` and 81px
for `ledger`. The projection is perspective, so a shape symmetric in 3D lands
off-centre once one side is nearer the camera, and each arrangement's pose
pitch tilts it further. So the residual is *measured from the drawn result and
fed back*: project, compare the bounding-box centre with the target, take a
quarter of the difference into the next frame. It settles in about eight
frames, costs one subtraction per point, and follows the pose continuously
instead of needing a hand-tuned constant per arrangement. A residual over 150px
means the pose jumped — first paint, a resize, a section skipped via the rail —
and is taken whole rather than crawled towards.

All seven arrangements now measure 0px from their declared origin. The
*centroid* offsets remain and should: `ledger` sits 123px low because it is a
plane with things standing on it, which is the shape being what it is.

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

The same rule holds one level down, now that the headings are rebuilt into
character spans. Every heading is **split first and armed second**: if splitting
throws, the headings that were already rebuilt are shown outright and
`reveals-armed` is never added, so the page is still the page. If a section's
typing throws, that section shows its title and opens immediately rather than
sitting on a half-typed line.

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
