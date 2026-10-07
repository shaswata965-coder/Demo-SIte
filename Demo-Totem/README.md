# Demo-Totem

A scroll-driven demo site for **AXON**, a fictional LLM inference efficiency
consultancy: one neural model turning through seven arrangements while the page
transforms with it. Plain HTML, CSS and JS — no build step, no dependencies.

Seven sections — intro, services, method, selected work, team, collaborations,
contact — of two kinds, alternating. In four the model is **assembled**, whole,
standing beside a panel of copy. In the three flooded sections it is **taken
apart**: there is no panel, the copy is broken into nodes wired into a network,
and the model's own units fly out of it to bead the wiring and ring the cards —
then fly back and rebuild it for the next section. Each of the three is a
different network. See "Taken apart" below.

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
js/graph.js           the wiring of the taken-apart sections, and where the model goes
js/circuit.js         the circuit layer drawn around each panel of copy
js/app.js             scroll → everything else
img/backdrop.svg      the network behind the page, used as a mask — see "The backdrop"
tools/make-backdrop.mjs  writes img/backdrop.svg
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
| 1 | Services | **taken apart** — feed-forward | `bloom` | Two nested shells — an outer sensor surface, an inner core, spokes between |
| 2 | Method | side right | `infer` | Six layers, each a ring, fanned forward layer to layer |
| 3 | Selected work | **taken apart** — hub and spokes | `settle` | A globe banded into latitude corridors, with bowed long-haul arcs |
| 4 | Team | side left | `vault` | A hollow cube — lattice on the faces, small solid core inside |
| 5 | Collaborations | **taken apart** — clusters | `ledger` | A ledger plane with risers standing off it |
| 6 | Contact | side right | `core` | Collapse to a core, one orbital ring still holding |

**Assembled, taken apart, assembled.** The sections alternate, so the page
reads as the model coming apart and being put back together three times over
before it closes on its core beside the call to action. The arrangements of the
three taken-apart sections are still there — they are what the model is passing
through while its units are in flight. Team earns its half-screen by being a
roster of small round portraits rather than four large cards.

**Edges fade, they never cut.** Every edge belongs to a family (`helix`,
`prox`, `spoke`, `layer`, `ring`, `arc`, `lattice`, `riser`) and carries a
visibility weight in all seven states. A connection that belongs to the layered
stack dims away as the globe forms rather than vanishing. That is the whole
trick behind the model appearing to rewire itself.

**Nodes are drawn by role** — inputs and outputs as rings, bias units as
squares, hidden units as dots. There are no labels on the model: an earlier
pass pinned one annotation per arrangement on a leader line (`σ activation`,
`corridor 41`) and framed the model with a readout of its name and unit count;
both went, along with the readout under the copy, the numbered section labels
over each title ("01 — Services") and the closing colophon, so the only words
on screen are the copy's own. The one piece of small print kept is the partner
disclaimer, beside the names it is about.

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
| `--c-second` → `--contrast` | The workhorse: role labels, step numbers, partner marks, `<strong>`, and the wiring that runs *between* structures. |
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
*text*, at the lightness the ground can actually carry; `<em>` and
`.link-btn:hover` use that one. Mixing them up is how you get a 2.9:1
paragraph.

Every value in `tokens.css` is solved, not eyeballed: each hue goes to full
chroma and then to the lightness nearest the pure hue (L = 0.5) that still
clears 4.5:1 against its own ground — and against its own panel on the skins
that carry cards. There are no sub-4.5 pairs in the file.

**A skin lands in two places.** On the `<section>` as `.skin.sk-<name>`, which
paints its band and tones its copy — so a section stays readable against its
own ground even mid-transition, when the section above it may be near-white and
the one below deep violet. And on `:root` as `data-skin`, written by `paint()`
from the active section, which is where the model reads its colours and where
the nav bar is drawn from. Nothing is written per frame: `readSkin()`
runs once per skin or theme change, because `getComputedStyle` straight after
an attribute write forces a style recalc.

The nav is fixed while the bands slide under it, so at a boundary it can be
over two very different grounds at once. It is a glass bar drawn from the
root's skin — its panel colour and its ink — which `app.js` keeps in step with
the section underneath, so it always has a ground of its own. See "Navigation".

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

Two parallax layers give the page depth. The pinned copy lifts 22px through
its chapter; only the chapter you are in carries an offset — one style write a
frame at most. And behind everything the backdrop network drifts up at about a
quarter of the scroll speed — see "The backdrop". (There used to be a 30px dot
grid there instead, drifting at 7%. It went with the panel's own grid, because
two grids behind the copy read as graph paper; see "The rig". The network is a
picture rather than a grid, and fainter.)

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

**Boundaries are seams, not edges.** A section's colour does not start at its
top edge; it grows out of the one before it across `--seam` (64svh pinned,
34svh on narrow screens), half above the edge and half below. Each section
names the skin it blends out of (`data-from="paper"`), and its band's
`::before` paints the gradient over the end of the previous band — same
z-index, later in the document. The gradient is eased (five stops on a
smoothstep) and mixed in OKLab, so paper-to-violet passes through a clean
lavender rather than a grey. Half a seam sits inside each section's own
padding, so the copy leaving is at most ~40% of the way across when it scrolls
over it and the title arriving is ~80% into its own colour: both stay on a
ground they were toned for.

Getting the band *behind* the model took a specific stacking arrangement, worth
knowing before you touch it:

```
body background
  .band              z-index: -1   full-bleed, sized to the chapter
  .backdrop          z-index: -1   fixed; after .doc in the markup, so over the bands
  .stage (canvas)    z-index:  1
  .ch-body (copy)    z-index:  3
```

`.doc` and `.chapter` must **not** create stacking contexts — no `z-index`, no
`transform`, no `opacity` on either — or the band cannot reach below the canvas
and the copy cannot reach above it. That is why the copy lives in a `.ch-body`
wrapper rather than sitting directly in the section.

## Navigation

Two states, and the move between them is the design:

```
at the top     [mark AXON]      Services  Method  Work  Team  Partners  Contact      (☾) [Book a teardown (→)]

scrolled                 ( [mark]  Services  Method  (Work)  Team  Partners  Contact  (☾) [Book a teardown (→)] )
                            ─────────────── progress ───────────────
```

- **At the very top it is a plain header** — no box, the mark, links and
  actions sitting straight on the intro in the page's own ink.
- **Once you scroll it condenses into an island:** a compact, centred capsule
  of dark glass (86% near-black under a 22px blur), the same over every
  section while the page changes colour underneath it. Width, ground, ink and
  wordmark all transition — the wordmark folds into the mark — so the header
  visibly gathers itself into the island rather than swapping. `app.js` toggles
  `.is-stuck` from the first 2% of the intro's scroll.
- **Columns are `auto 1fr auto`**, not `1fr auto 1fr`: the links centre in the
  space between the mark and the actions, so the island has no dead gap on
  its narrower side, and as the wordmark folds away the links drift over to
  meet the mark.
- **The current section is a pill** that slides between the links; on hover it
  follows the pointer across them and returns to the current one when the
  pointer leaves. `placeInd()` sizes it from a link's own box, so it lands
  exactly whatever the labels' widths. On the intro nothing is current — the
  mark is home — and the pill fades out where it stands.
- **The call to action** is sentence case with its arrow in a chip that turns
  to point out of the page on hover.
- **The island's bottom edge is a progress line**, filled with the same
  `progress` the rest of the page runs on.
- **The theme toggle** is an icon: a moon in light, a sun in dark — it shows
  where a click takes you. It is a toggle button with a fixed name ("Dark
  theme") whose `aria-pressed` says whether dark is on.
- **Below 1024px it is always the island**, full width, with the links folded
  into a menu opened from a button that turns into a close mark. It closes on
  a link, on Escape (focus goes back to the button), on a click outside, and on
  resize. The menu is near-opaque rather than glass: a backdrop filter nested
  inside the island's own only sees the island, so a translucent menu let the
  copy underneath read through it.

The links are real anchors (`href="#c3"`), so the page still navigates with
scripts off; with scripts on they route through the same glide as every other
call to action.

## The typed title, and the rig around the copy

Each screen runs one sequence, and everything on it waits its turn:

1. the section arms — `.arming` on the `<section>`
2. the title types, character by character, with a caret
3. the caret stops, the instrument rig comes in and its beam makes one pass —
   `.typed` on the `<section>`
4. as the beam's leading edge crosses each piece of the screen, that piece
   lands: body copy **a line at a time**, cards and rows as the edge reaches
   their top, and every sub-headline — service, week, project, name — **types**

### What fires it: the title, on screen

The sequence is fired from **where the title actually is on screen**, read
every frame from the frame loop — not from an `IntersectionObserver`, and no
longer from `progress` either.

The first version hung it off an observer on the heading, and it looked broken
on almost every screen: the observer fired on a margin box roughly 400px
before the copy landed, so a title typed while its section was below the fold.
The second fired off `progress` at `i − 0.08` and ran each section once. That
measured well with a wheel on a wide screen and was wrong in the two cases
people actually hit:

- **A jump from the nav** glides past every section in between. Each one armed
  as it flew by, typed off screen, and was spent — scroll back up and every
  title was simply there. Measured: 3 of 30 typing frames on screen.
- **Below 900px**, where nothing is pinned, `i − 0.08` is the moment a section
  is about to leave the top of the screen, so its title typed as it scrolled
  away (and its copy stayed hidden the whole way up the screen). Measured on a
  390px phone: 8–13 of ~45 typing frames on screen.

So now, per section, per frame (`update()` in `armReveals`):

| where it is | what happens |
|---|---|
| title **landed** — wholly on screen, clear of the nav, and up to `LAND` of the viewport's height (0.45 wide, 0.62 narrow); or its section at the top of the viewport with the title on screen, which guarantees a title at rest always lands | the title types, then the scan reveals the copy |
| copy wholly **below** the viewport | everything rewinds, so scrolling down into it plays it again |
| copy wholly **above** the viewport | the copy stays — scrolling back up finds text coming down into view, not an empty panel — but the title rewinds and types again as it comes back into view |

Sequences are cancellable: each section carries a token for its title and one
for its copy, and a rewind bumps them, so a half-typed title or a half-run scan
simply stops at its next step. Measured with a wheel-driven scroll, the same
script against both versions — frames with the title on screen, out of frames
spent typing:

| case | before | after |
|---|---|---|
| 1440×900, continuous scroll | all on screen | all on screen |
| 1440×900, jump to Contact, then scroll back up | typed in flight (3 of 5 frames on screen), then nothing on the way back | every title types on screen on the way back |
| 760×900, reading — scroll, pause, repeat | two sections lost about half (24 of 44, 28 of 32) | all on screen |
| 390×844, reading — scroll, pause, repeat | three sections lost up to 60% (21 of 44, 19 of 51, 28 of 31) | worst 43 of 52, the rest all on screen |

The reads come after `progress()` and before `paint()` in `frame()`, so they
land on a layout that is already clean; a section waiting to land costs two
rect reads, everything else one.

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
by `TYPE_MAX`), so a long title cannot outrun its own screen. Sub-headlines use
the same code on a quicker clock (`SUB_PER`, `SUB_MAX`) — a section title is the
event of the screen and is given time to be watched; a sub-headline types
alongside the lines landing around it.

### The scan: copy a line at a time

The beam's first pass is what reveals the copy, so the two have to agree
exactly on where the beam is. That is arranged by making the pass **linear**:
at constant speed the leading edge's position is a straight line in time, and
every piece of the screen can be given the moment the edge crosses it.

`planScan()` in `app.js` measures each piece against the panel, turns its
height into a time, sorts the list, and writes the same start and duration
onto the `<section>` as `--scan-from` and `--scan-d` — which is what the CSS
`rig-scan` animation runs on. One `requestAnimationFrame` loop then walks the
sorted list and lands each piece as its time comes up. The gap between two
lines is simply line height over beam speed: about 85ms for the small copy in
the lists and cards, 120ms for body copy, 160ms for the intro's lede.

- **Lines, not paragraphs.** Body copy is split into words, and the words are
  grouped by the line they are actually laid out on — so a line lands as a
  unit wherever the browser wrapped it. Words rather than line wrappers,
  because a line wrapper cannot straddle an `<em>` or `<strong>` that runs
  across two lines; each word stays inside the inline element it was in.
- **The claim highlight moves onto the words** once a `<strong>` is split
  (`strong.split`), so each line's fill arrives with that line instead of the
  whole bar sitting there empty ahead of its text. Each word's fill reaches
  further than a word space in any face, fallbacks included, so it still reads
  as one bar.
- **It starts at the first line, not the top of the panel.** The title is
  already on screen; sweeping over it first was a second of nothing happening.
- **A raster, not a curtain.** Lines at the same height in two columns (the
  project cards, the method steps, the contact figures) are offset by up to
  `SCAN_RASTER` across the panel's width, left first.
- **Boxes arrive with the edge.** A card, list row, thumbnail or portrait
  (`.sc`) fades in as the edge reaches its top, so its border and fill are
  there just before its first line.

`SCAN_SPEED` sets the pace (220px/s wide, 320px/s on a phone, where panels are
taller); a whole screen scans in 2–3.5s. The first screen waits for the webfont — or one second — before it
starts, because a line measured in the fallback face is not where it will be
once Archivo and Plex swap in.

### The rig

The panel around the copy went through two wrong versions before this one. The
first was a schematic in the model's half — which decorated the object that is
already the most decorated thing on the screen. The second framed the copy but
framed it with four brackets, a rule and a tick scale: right placement, far too
quiet. A static line drawing reads as a border, not as instrumentation.

What makes a panel read as live is movement and small dense detail:

| | |
|---|---|
| `.rig-beam` | a scanning beam that **carries its own scanlines**, so the fine texture exists only where the scanner is. That is the difference between a screen with a scanline filter on it and a screen being read. Its one pass reveals the copy (above) and it does not return |
| `.rig-circ` | the circuit layer — see below |
| `.rig-strip` | a waveform and a segmented meter of how far through this screen you are — no text. Every panel has it except the first screen's, which stays clear under its call to action |

There is **no grid**. The panel used to stand on a 72px measurement grid and
the page on a 30px dot grid; both went, because two grids behind copy that
already sits on a coloured band read as graph paper rather than as a screen.

The meter is the same `progress` the rest of the page runs on, written every
fifth frame for the live screen only. The strip used to carry a readout too —
the arrangement's name, the scroll position, the yaw in hex — and it went with
the rest of the small text around the copy and the model.

Everything that moves is gated on **`.live`**, which `paint()` puts on the
section under the middle of the viewport — measured, so it is right on a phone
too. Seven panels beaming and pulsing at once would compete with the canvas for
the frame budget for no benefit — you can only see one. The one exception is
the scan's first pass (`.scanning`), which runs wherever a section is landing:
on a phone a section can be landing in the top half of the screen while the
previous one still owns the middle.

The rig is sized to `.ch-col`, so the same panel fits a hero, a four-item list
and a three-card grid with no per-breakpoint geometry.

On a phone the waveform is dropped and the circuit layer changes shape (below). The beam stays. Under
`prefers-reduced-motion` there is no typing, no caret, no beam, no scan and no
pulses — every line is simply there, the circuit is drawn but still, and the meter still updates, because it is
information rather than animation and it only changes when you scroll.

There are no corner marks on the panels or the model's frame and no axis gizmo.

### The circuit layer

`js/circuit.js` draws one SVG into each panel on a wide screen: a **bus down the
outer edge**, the side the model is *not* on — two traces with 45° jogs and
vias, the long one running into the strip's rail, with pulses riding it. It sits
in the 1.8rem the rig extends past the column, never under a line of copy, is
drawn in the panel's own pixels (so a 45° trace stays 45°) and redrawn when the
panel changes size. It draws itself in as the scan starts and, like the rest of
the rig, only moves on the live screen.

A chip wired into a small network between the copy and the model used to be
drawn here too. It was removed — the model is the only network on screen.

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

The taken-apart sections have a narrow form of their own — the spine, see
"Taken apart" — and use it below 1100px as well as on phones.

## Placeholder imagery and the partner names

The project cards, the team and the partners carry generated art rather
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
itself, in each section's standfirst; none of it is passed off as a photograph
of anyone.

**The partner section carries real company names as placeholders**, which needs
saying out loud. The twelve marks are neutral geometry in this page's own
palette — deliberately *not* reproductions of anyone's logo — and the section
carries a disclaimer on the page, beside the names: names are there
to size the layout, no affiliation or endorsement is implied, and AXON is
fictional. Swap the names before this goes anywhere public. The testimonial
moved to the closing section for the same reason: attributing an invented quote
to a real company would have been a fabricated endorsement, so it stays with
its invented one, marked fictional in the caption.

The glyphs are a `<symbol>` sprite, defined once and `<use>`d by each partner
node, so the drawing is not repeated in the markup.

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

## The backdrop

Behind the whole page sits one faint picture of a network: nine layers of
neurons stacked top to bottom, each wired to the next by S-curves whose opacity
is the connection's weight, a few residual links skipping a layer, signals in
flight on some of the wires. The top row is wide and fine — the input — and the
bottom few and heavy — the output — so the page's descent is a pass through the
network, ending where the close sits.

**It is fixed, and it never changes.** `.backdrop` is a fixed layer taller than
the screen (`max(300lvh, min(225vw, 420lvh))` — 3240px at 1440×900) that slides
up as you scroll: top of the picture at the top of the page, bottom at the
bottom, about a quarter of the copy's speed. Nothing swaps per section and
nothing repeats, so scrolling reads as travelling down one image. Where the
browser has scroll-driven animations (`animation-timeline: scroll()`) the
compositor drives it; elsewhere `frame()` in `app.js` writes the same transform,
measured from `.doc`'s rectangle like `progress()`. Reduced motion holds it
still at its top.

**It is a mask, not an image.** `img/backdrop.svg` is white on transparent; the
layer is painted in the root skin's `--ink` at the skin's `--backdrop-a`, and
the SVG only decides where that ink shows. So the network follows the section
you are in — dark lines on paper, lemon and cyan, light ones on violet and the
close — and both theme and skin changes fade it over `--d-theme`. A solid colour
under a mask recolours on the compositor, so the fade is not a repaint.

The strengths are per skin, in `tokens.css` (`--k-*-bd`): lower on paper, where
dark ink on near-white reads loudest, higher on the floods and the dark grounds.
At those values a wire is 2–5% ink and a neuron 6–11% — a texture under the
model and the cards, never a second subject. The picture also thins across the
middle, where the copy and the model live, to about two thirds of its strength
at the edges.

To change the picture, edit `tools/make-backdrop.mjs` and run it; it is seeded,
so the same script always writes the same file.

```sh
node tools/make-backdrop.mjs   # writes img/backdrop.svg
```

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
`<body>`, every stylesheet and script inlined (and the images the stylesheets
point at, the backdrop's mask, as `data:` URIs), nothing left to fetch but the
webfont. `app.js` sets `lang` and `data-chapter` on the root itself, so the
embed build behaves identically to the standalone one. Use it for anywhere you
are pasting the page into someone else's document; use `index.html` for hosting.

## Two kinds of section, one canvas

The canvas is **fixed at viewport size for the life of the page**. It is never
moved by the layout and never scaled by CSS: one would reallocate the backing
store mid-scroll, the other would blur every mark. Everything the model does
spatially happens *inside* it, through numbers `app.js` writes each frame:

| | |
|---|---|
| `field.originX` | where the model sits across the canvas, 0..1 |
| `field.zoom` | how large it is drawn, on top of the radius `resize()` derived |
| `.stage` opacity | how far forward it comes |
| `field.scatter` + targets | how far it has come apart, and where each unit goes |

A section declares its values in `CHAPTERS` (`app.js`) and they are lerped on
`dragEase` — the same curve as the morph and the roll — so neighbouring
sections transition into each other rather than cutting:

- **`.is-side`** — the model assembled: copy takes 46% of the container, model
  centres in the rest, `dim: 1`, `zoom: 0.76–0.88`. Intro, Method, Team,
  Contact.
- **`.is-graph`** — the model taken apart: `graph: true`, `scatter` 1, the model
  centred while its units are in flight. Services, Work, Partners.

`anchor()` measures the real `.ch-inner` rectangle rather than recomputing the
CSS clamps, so the model and the copy can never disagree about where the
halfway line is — which is what keeps a 3440px monitor from putting a paragraph
and a model a metre apart. `--maxw` (1680px) caps the container; the model is
parked against that box, not the raw viewport.

## Taken apart

The flooded sections are not a headline over a paragraph. The copy is broken
into nodes, and the nodes are wired into a network — a different one each time:

| Section | Network | Nodes |
|---|---|---|
| Services | **feed-forward**, left to right | the claim is the input; the four levers are the hidden layer, each fed on its number; a round output — ½, the bill |
| Work | **hub and spokes** | the title is the hub; each project hangs on a spoke, and each of its figures is pulled out of the card into a round node of its own |
| Partners | **clusters** | the title is the core; four kinds of collaborator are hubs, each with its names as pills around it |

**The wiring is measured, not drawn.** Layout is CSS grid — nothing in JS
positions a node. `js/graph.js` reads the links declared on the graph
(`data-links="claim:r>l1:l …"`, a node and a port — r, l, t or b — at each end)
and lays one SVG trace per link over wherever the nodes actually are: a cubic
that leaves each port square to its card's edge, a port ring at each end, and a
pulse that runs it once the screen is live. It is laid out again whenever the
page changes shape, so the wiring can never disagree with the page, and with
scripts off the page is still the copy, just unwired.

**The scaffold is made of the model.** Each layout also returns one target
point per unit of the model: just over half beaded evenly along the links, the
rest ringed a few pixels outside each card and round node, spaced in
proportion to length so the beading is even across the whole network. Units
are assigned in index order, and consecutive units sit next to each other in
most arrangements, so they stream out together rather than criss-crossing.

**It is measured where the section will be pinned,** not where it is. So as you
scroll in, the units leave the arrangement and gather into the finished
scaffold on the same eased fraction as everything else — each on its own delay
and its own arc, so it comes apart as a swarm, not as one shape sliding — and
the copy then slides up into the scaffold they have made. Scrolling on, the
copy slides away, the scaffold is left standing for a moment, and the units fly
back to build the next arrangement. A unit in flight takes its edges with it
(an edge between two points on the page would be a streak across the screen),
and the centring feedback only ever sees the model, never the page.

**It assembles along its own wiring, quickly.** Every node carries a
`data-order`. When the title has typed, a node grows into place at
`order × 0.075s`, its lines land 28ms apart just behind it, its sub-headline
types, and each link draws from its source towards the next node as that one
arrives. There is no scan beam here — the network is the reveal. The networks
run on their own, faster clock (`TYPE_NET`, `SUB_NET`, `GRAPH_*`): their copy is
short and broken into many small nodes, and at panel speed it took 2.3–2.6s to
finish arriving; it now takes 1.1–1.2s from landing, title included. Rewinding
and replaying work exactly as they do for the panels.

**Below 1100px wide, or 600px tall, a network is a spine:** the nodes stacked
in reading order down a single wire, each with a port on it, scrolling rather
than pinned, with the model a faint backdrop behind rather than taken apart.
Hubs become pills; figures sit in a row under their project.

Measured at 1100×620, 1280×720, 1440×900 and 1920×1080: every network fits
under the nav with nothing clipped. On a short wide screen (up to 820px tall)
the project imagery drops out of Work, which is what buys its three rows their
height. A taken-apart section costs the same to draw as an assembled one — 16.7
ms median at 1440×900 and 2560×1400 in a software-rendered container; fewer
edges are drawn while units are on the page, not more.

## Cards: tint and lift

**Every card is lit in its own section's colours.** Method's week cards, every
card, circle and pill in the networks, and a team row once it is lifted, share
one fill: two soft glows from opposite corners over the panel colour. By default
these are the structure hue and the data hue. Every third card swaps in the
accent, and the next the signal hue, so a row reads as one family without any
two cards matching. The glows are mixed in OKLab and kept under a fifth of full
strength. On the paper, yellow and cyan skins that gives pastel, airy cards; on
the deep ones the cards keep a ground dark enough for light type. Circles are
lit off-centre, like a sphere, and pills along their length. The strength is a
registered custom property (`--tint-k`), so a card's light can brighten
smoothly when it is lifted.

**Point at a card and it comes forward.** It rises, grows, tilts toward the
pointer, and picks up a sheen under the pointer and a ring and glow in the
section's accent. The cards around it are pushed a few pixels straight away
from it and fall back a little, so the one you are on is the only thing at full
strength. Each shape arrives its own way:

| Shape | Lift |
|---|---|
| card (weeks, levers, projects, the claim) | turns toward you: a half-swing on its vertical axis, 1.05× |
| title card of a network (hub, core) | only rises, 1.025×. It is the ground the rest stands on |
| circle (the ½, figures, partner kinds) | flips over like a coin, one full turn, and lands at 1.12× |
| pill (a partner name) | flips on its long axis like a split-flap display, 1.09× |
| team row | slides out into a tinted card while its portrait coin-flips |

**In a network the wiring holds on.** The lifted card and every card it pushed
drag their links, their ports and the ring of model units round them, and the
links into the lifted card light up in the accent. A card wired to the one you
are on is dimmed less than the rest.

That is why the motion is not a CSS transition. The wiring has to know where a
card is on every frame, and a transition would not tell it. `liftTick()` in
`js/app.js` eases every value per frame and writes one transform per card. It
then re-lays the network through `SectionGraph.layout(…, rectOf)`, measuring
each card from its layout offsets plus its lift and push, never its tilt or
flip. Measured from the screen, a card turning edge-on would pull its wires
into its own middle. Guards:

- Nothing starts lifting while the page is moving under a still pointer. A
  lifted card lets go if the page carries it out from under the pointer.
- A card flips once per visit. Coming straight back to it does not turn it again.
- A card still waiting for the scan cannot be lifted or pushed. It is hidden by
  opacity, and an inline opacity would show it early.
- Touch never lifts anything. With reduced motion a card still lights up but
  does not move.

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
means the pose jumped — first paint, a resize, a section skipped via the nav —
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

**`field.detail` pays for the backdrop** — which is now only the spine form of
a taken-apart section, and phones. A section that dims the model to 28%
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
character spans and the body copy into words. Everything is **split first and
armed second**: if splitting throws, the headings that were already rebuilt are
shown outright and `reveals-armed` is never added, so the page is still the
page. If a section's typing or its scan plan throws, that section shows
everything at once rather than sitting on a half-typed line.

Scroll progress is measured from `getBoundingClientRect()`, not `window.scrollY`:
when the page is embedded, the element doing the scrolling may not be the
window, and `scrollY` would sit at zero forever.

## Porting to Next.js / React

The split is deliberate:

| This file | Becomes |
|---|---|
| `js/neural.js` | A React Three Fiber scene. `STATES`, the arrangement generators, `VIS` and `POSE_*` carry over unchanged; the hand projection is replaced by instanced meshes and a vertex shader. |
| `js/app.js` | A scroll provider — Lenis + GSAP ScrollTrigger — exposing `progress` through context. The travel, zoom and dim become a scrubbed timeline; `dragEase` becomes its ease. |
| `js/circuit.js` | A `<Circuit side />` component rendering the same SVG; the geometry functions carry over unchanged. |
| `js/graph.js` | A `<Graph links>` component that measures its children with a ResizeObserver and renders the same traces; `layout()`'s targets feed the scene's scatter uniform. |
| `css/tokens.css` | Unchanged. Tailwind v4 reads CSS custom properties directly. |
| `css/main.css` | Component styles; the `[data-chapter]` block stays as-is. |
| `index.html` | `page.tsx` plus a `Chapter` component (`is-side` / `is-graph` as a prop), with the copy, projects, people and partners coming from the CMS. |

Nothing here depends on the DOM structure except `app.js`, and nothing in
`neural.js` touches the page.

## Note

AXON is a fictional company invented for this demo. The team, the projects, the
partner brands, the testimonial and every figure on the page are made up, and
`hello@axon.example` is a reserved example domain that goes nowhere.

## First screen layout

On a wide screen the first section's copy is lined up with the model rather
than centred on the viewport. `levelFirst()` in `js/app.js` asks
`NeuralField#extentY` how tall the first arrangement stands at its resting pose
and writes `--m-top` / `--m-h` onto `#c0`; the `#c0` block at the end of
`css/main.css` starts the headline at the model's top and runs the copy down to
its bottom (headline up top, the line under it and the button at the bottom).
Nothing here applies below 900px or to any other section.

The first screen's model also stands wider and further right than the others:
`CHAPTERS[0]` carries `stretch` (the projection is widened across the screen
only, so the height — and the copy's alignment with it — is unchanged) and
`nudge` (a fraction of the container's width added to its anchor). Both ease in
between 900 and 1400px so the model never runs into the copy or the viewport's
edge.
