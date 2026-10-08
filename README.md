# Scroll-driven fintech demos

Demo pages for a **fintech** brand, built from one set of design decisions.
AXON, in the spirit of [totem.itsoffbrand.com](https://totem.itsoffbrand.com/),
is built around a **neural model** that transforms as you scroll; demo-crafted
re-stages AXON as a flight through depth. Larch rebuilds
[wealthsimple.com](https://www.wealthsimple.com/en-ca)'s homepage, section by
section, for a machine-learning company in finance: its type pairing, its
looping product backgrounds and its headline reveals.

*AXON and Larch are fictional. Every figure on every page is invented.*

## The demos

| | Reference | Brand |
|---|---|---|
| **[`Demo-Totem/`](Demo-Totem/)** | [totem.itsoffbrand.com](https://totem.itsoffbrand.com/) | AXON, a neural fintech consultancy. The original, and where the design decisions were made |
| **[`demo-crafted/`](demo-crafted/)** | [2018.craftedbygc.com](https://2018.craftedbygc.com/) | AXON again: the same content, skins and generated assets, re-staged as a flight through depth |
| **[`Demo-Wealthsimple/`](Demo-Wealthsimple/)** | [wealthsimple.com](https://www.wealthsimple.com/en-ca) | Larch, a fictional machine-learning company for finance. The reference's homepage structure, type and motion, with every section's picture remade for Larch |

All three are plain HTML, CSS and JS, with no build step and no dependencies.
Each README explains how its demo works.

```sh
python3 -m http.server 8000 --directory Demo-Totem
python3 -m http.server 8001 --directory demo-crafted
python3 -m http.server 8002 --directory Demo-Wealthsimple
```

### Demo-Totem

- Seven sections wearing five **skins** — a skin is the whole colour set at
  once, so an alternate section floods the screen with violet, electric yellow
  or cyan rather than tinting it. Light and dark, toggled top right.
- The model is **assembled and taken apart** as you scroll. On the white
  sections (and the dark close) it stands whole beside a panel of copy. On the
  flooded ones it comes apart: the copy is broken into nodes wired into a
  network — feed-forward for Services, hub and spokes for Work, clusters for
  Partners — and the model's own units fly out to bead the wiring and ring the
  cards, then fly back to rebuild it for the next section.
- Headlines type in as you land. On the panels a scan beam then reveals the
  body copy a line at a time, and a circuit layer in the margins wires the copy
  to the model; the networks instead assemble node by node along their own
  wiring.
- Cards are tinted with their own section's colours: light, airy glows in
  its structure, data and accent hues. Point at one and it comes forward. It
  lifts, tilts toward the pointer and pushes its neighbours aside. Circles
  coin-flip, partner pills flip over like a split-flap display, and in the
  networks the wiring and the model's beads follow the cards as they move.
- Scroll turns and rewires the model through seven arrangements while the
  page's type, texture, colour and layout transform with it.
- Behind it all, a dense field of tiny coloured neurons at every depth,
  drifting very slightly: as you scroll, near ones stream past and far ones
  barely move, and neighbouring neurons differ in strength, so one dot beside
  another reads as nearer or farther. At rest it is only the neurons;
  synapses appear only when they fire — wherever you scroll, point, click,
  tap or tab — rippling slowly a long way out over several seconds and
  dying away. It keeps a clearing round the model.

### demo-crafted

The same AXON content, skins and generated assets, re-staged as a flight
through depth in the pattern of
[2018.craftedbygc.com](https://2018.craftedbygc.com/). Enter, then scroll or
drag forward through seven rooms that each flood the screen in their own skin.
Cards open in place, and a dial jumps between rooms. Its
[README](demo-crafted/README.md) maps each part of the pattern to how it is
built here.

### Demo-Wealthsimple

- Larch, a fictional company that builds and runs machine-learning models for
  banks, lenders and asset managers. The page follows the reference's
  homepage in order: opener, a product menu of very large serif names,
  full-bleed product heroes, an about section, a newsletter card and a
  full-height close.
- Type is the reference's pairing in Google Fonts: Newsreader (a text-cut
  serif) for big statements, Jost (a Futura-like sans) for headlines and
  reading, on the same fluid scale.
- Each of the reference's pictures has a Larch counterpart that loops in the
  background, built in HTML, SVG and canvas: a decision tree that grows like
  a larch (the opener), a credit decision on a phone, the model card made like
  a metal payment card, a live payments monitor with a mule ring, the cash
  forecast on a floating slab, a donut of risk by factor before and after a
  hedge, and a dotted loss surface with a point rolling to its minimum.
- Headlines rise word by word as they arrive, copy fades in after them, the
  menu rows slide their picture and description in on hover, and the closing
  line turns over like a drum. Every entrance replays each time its section
  comes back into view, and each picture's loop restarts from its first
  frame. Micro-interactions throughout: pills that lift and catch the light,
  a reading-progress line, the thesis lighting up as you read, depth under
  the pointer. A pause button stops everything; reduced motion shows
  finished frames.
- Each load opens with a sequence after [clyde.us](https://clyde.us/)'s
  loader: the letters close up, the larch draws itself beside them, gold
  needles burst out as the ground turns to spruce, and the line opens out
  before the page takes over. Any key, click or scroll skips it.
- Colours are its own, solved by `tools/solve-palette.mjs` (text 4.5:1 or
  better on every ground, in light and dark).

## Planning

| | |
|---|---|
| [docs/00-PLAN.md](docs/00-PLAN.md) | Direction, what we're borrowing from the reference, IA, roadmap, open questions |
| [docs/01-STACK.md](docs/01-STACK.md) | Stack recommendation and the alternatives considered |
| [docs/02-MOTION.md](docs/02-MOTION.md) | Scroll choreography, chapter by chapter |
| [docs/03-CONTENT-MODEL.md](docs/03-CONTENT-MODEL.md) | CMS schemas |
| [docs/04-PERFORMANCE.md](docs/04-PERFORMANCE.md) | Budgets, device tiers, fallbacks |

## Stack, in short

**Next.js 15 + React Three Fiber + GSAP/ScrollTrigger + Lenis + Tailwind v4 +
Sanity, on Vercel.** Reasoning in [docs/01-STACK.md](docs/01-STACK.md).
`Demo-Totem/` is written so each file maps onto one piece of that — see
[Porting](Demo-Totem/README.md#porting-to-nextjs--react).

## History

An earlier first-pass prototype and a separate blueprint deck lived in `site/`
and `design/`. `Demo-Totem/` supersedes both — it carries a different token
system, so keeping both in the tree would have meant two contradictory sources
of truth. They remain in git history and on the `claude/sweet-rubin-b5hi8c`
branch.
