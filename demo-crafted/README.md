# demo-crafted — AXON as a flight

The AXON site rebuilt as a **flight through depth**, modelled on the
interaction pattern of Green Chameleon's 2018 year-in-review
([2018.craftedbygc.com](https://2018.craftedbygc.com/)). You press Enter, then
scroll or drag to move a camera forward through a corridor of rooms. Titles
condense out of fog, cards pass on alternating sides, and the whole scene
changes colour as you cross from one room into the next.

Only the pattern is borrowed. The code, copy, colour and every image are
AXON's own, from this repo's design decisions (see
[`../docs/design-summary.html`](../docs/design-summary.html)).

*AXON is fictional. Every name and figure is invented; all imagery is generated.*

```sh
python3 -m http.server 8000 --directory demo-crafted   # then open localhost:8000
node demo-crafted/tools/make-embed.mjs                   # single-file build → demo-crafted/dist/
```

Plain HTML, CSS and JS. No build step and no dependencies. The webfont is the
only network request.

## What maps to what

| In the reference | Here |
|---|---|
| Loader: a ring of type around a progress count, then **Enter** | Same shape. The percentage tracks real work: fonts, generating the artwork, reading the room colours, building the network. `#enter` in the URL skips the button. |
| A camera flying forward on the z axis, driven by wheel and swipe | `js/flight.js`. One number, the camera position, chases a target with a 0.3s time constant. Wheel, drag with inertia, arrow keys, PageUp/PageDown, Home/End and Tab all move the target. |
| Months as sections, each opening on a large title | Seven **rooms** (Intro, Services, Method, Work, Team, Partners, Contact). Each opens on its headline, then its items pass on alternating sides. |
| Scene background and fog tween per month | The five AXON **skins** (paper, violet, lemon, cyan, ember). The ground and every global colour are the neighbouring rooms' skins mixed in OKLab across a seam before each title. |
| Fog | Per-item opacity by distance. Items are kept close so far ones never pile up on the vanishing point behind the title you are reading. The network is allowed to see further. |
| Mouse parallax | The world shifts against the pointer, so nearer things move more. |
| Click a piece of work to open it, swipe between | Openable cards grow out of their place on screen (FLIP). ← → page through the room's cards and move the camera with you. Esc or a click outside closes. |
| Custom cursor with states | A dot and a trailing ring. The state names what a click does: **Open** over a card, a small ring on links, **Close** outside an open card, a capsule while dragging. Fine pointers only. |
| Vertical words up the page edges | Outlined Archivo. On the left, the thesis ("Same model · Half the bill"); on the right, the current room's name. |
| Compass, bottom right | A dial whose needle is your progress through the flight. It has a tick for each room's arrival point and opens the rooms menu. |
| Photography and video | Generated SVG in `js/art.js`, coloured by role so each room and theme resolves it: service diagrams, the four-week track, project thumbnails, four portraits varied in skin tone, build, hair and tilt, and twelve neutral partner glyphs. |

What is AXON's own and not in the reference: the **network** lining the
corridor walls (a canvas projected with the same focal length as the CSS
perspective, so drawn nodes and DOM cards share one space), a ring of nodes
as a **portal** at the start of each room, and dashed **chains** that wire
related items together: the services into the ½ node, the four weeks in
order, each project out to its figures.

## Density, tech content and models

- **Packing.** `PACK = 0.8` in `js/flight.js` multiplies every authored depth
  and room length, so one number sets the density. Each room now has about
  60% more items in about 12% less travel than the first version. Each room
  ends with a runway of about 1,000 authored units after its last card, so
  the card has thinned out before the next title is legible.
- **Tech cards** (`.card.tech`) show the work the way the team sees it:
  - a live trace whose lines print in as the card arrives
  - `serving.yaml` after a rebuild
  - savings by lever (illustrative, and labelled as such)
  - the four-week plan as a Gantt chart, and the deliverables log
  - the marketplace eval sheet, whose figures match the project card
  - the team's spec list, the router request, and what to send us
- **Chips** (`.chip`): four per room, small metric readouts at the edges of
  the corridor. They keep to the top and bottom bands on a phone.
- **Models.** Each room has `<i class="model" data-shape=…>` markers, drawn
  on the canvas as wireframes on either side of the title, with a bracketed
  callout and a figure label. There are eight shapes, one chosen per room:
  core, transformer stack, feed-forward fan, helix, torus, lattice, orbits
  and globe. They turn with time and with travel, their units fire now and
  then, and they take the room's hues. Two more models flank the closing
  call to action.

- **Exploded models** (`<i class="decon">`, drawn on the canvas). At the
  end of Services, Method, Work and Partners, a full-size deconstructed
  model arrives beside a caption card:
  - Services: a transformer block whose layers part, each labelled with
    its lever.
  - Method: a helix cut into the four weeks.
  - Work: 42 GPUs, where 12 stay and 30 drift back to the pool.
  - Partners: a globe split into the four kinds of partner.

  They arrive scattered, gather as you approach, then assemble and come
  apart on a slow loop with labelled parts.

- **Front item wins.** Every frame the flight measures each visible item's
  box on screen. Anything that overlaps a nearer, already legible item fades
  back to a whisper until that one has passed, so cards never read through
  each other and each gets a clean moment. Chips always yield to cards and
  figures. The intro badge is a faint backdrop (28%) and takes no part.

## Content decisions

- Copy is the same as `Demo-Totem/`: hero, four levers, four weeks, three
  projects with the client's own figures, four people, contact.
- **Partner names are fictional here** (Halden Labs, Tessel Runtime and so
  on), where `Demo-Totem/` uses real companies as placeholders. This page is
  meant to be shared as a link, and a wall of real names reads as a claim of
  partnership however clearly it is captioned.
- The testimonial stays with the fictional client, marked on the card.

## Files

```
index.html        rooms, cards and chrome as plain semantic HTML
css/skins.css     the five skins, value for value from Demo-Totem/css/tokens.css
css/main.css      static layout, then flight mode under .js
js/art.js         every image, generated
js/flight.js      camera, input, fog, colour blending, network canvas
js/app.js         loader, chrome, dial menu, open card, cursor, theme
tools/make-embed.mjs  single-file build for embedding
```

## Robustness

- **No script, no problem.** Without JS the same markup is a plain stacked
  page with one skin per room. Flight mode is opt-in (`.js` on `<html>`). If
  the scripts throw, or never report ready within 8s, the class comes off and
  the plain page shows.
- **Placement.** Every item carries `data-d` (depth into its room, authored at
  a 900px focal length), `data-x` and `data-y` (offset as a fraction of the
  half-screen). The focal length follows the viewport and all depths scale
  with it, so the flight feels the same on any screen.
- **Phones.** On portrait screens, side items move toward the centre and
  alternate above and below instead. They fade out earlier, because a card is
  most of the screen width. Touch uses the same drag and inertia as the mouse.
- **Reduced motion.** No parallax, no spinning type, no pulses, no hover tilt.
  The camera still moves, but it snaps rather than glides.
- **Theme.** Light and dark follow the system; the button bottom left
  overrides it and remembers the choice. Room colours are re-read from CSS on
  every change, so `css/skins.css` is the only place colour is defined.
