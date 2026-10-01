# Demo-Wealthsimple

A scroll-driven demo site for **Larch**, a fictional Canadian money app:
chequing, a card, managed portfolios and tax in one place. It takes its
language from [wealthsimple.com](https://www.wealthsimple.com/en-ca) and its
structure from [`Demo-Totem/`](../Demo-Totem/). It is the AXON demo's grammar
spoken in a quieter dialect. Plain HTML, CSS and JS, no build step, no
dependencies.

One object made of coins restacks itself through seven arrangements, one per
section, while the page changes room around it. In four sections it stands
whole beside a frame of copy. In the three flooded sections it comes apart:
the copy breaks into a wired network, and the coins fly out to bead the
wiring and ring the cards. Then they fly back and build the next emblem.

*Larch is fictional. Every rate, figure, person and plan on the page is made
up.*

## Run it

```sh
python3 -m http.server 8000 --directory Demo-Wealthsimple
# http://localhost:8000
```

Opening `index.html` from disk works too. `node tools/make-embed.mjs` writes a
self-contained `dist/index.html` for pasting into someone else's document. It
works the same way as AXON's; see [Embedding](../Demo-Totem/README.md#embedding).

**The Artifact.** `artifact.html` is that same single-file build, published as
a claude.ai Artifact: [claude.ai/artifact/7YaYTpwwFGiXCjvo2mmhCi](https://claude.ai/artifact/7YaYTpwwFGiXCjvo2mmhCi)
(private until its owner shares it). An Artifact is named by its `<title>`,
so the build renames it to plain "Larch". The file is generated, so edit the
sources and rebuild it rather than editing it by hand:

```sh
node tools/make-embed.mjs --out artifact.html --title Larch
```

## Files

```
index.html               markup, copy and the generated art
css/tokens.css           five skins, light and dark, every value solved
css/main.css             layout, chapters, per-chapter type, components
js/asset.js              the object: seven arrangements of coins, rendering
js/thread.js             the thread layer drawn in each frame's margins
js/graph.js              wiring for the taken-apart sections (unchanged from AXON)
js/app.js                scroll → everything else
tools/solve-palette.mjs  solves and checks every colour in tokens.css
tools/make-embed.mjs     single-file embed build (dist/, or artifact.html)
artifact.html            the published Artifact — generated, do not edit
```

## What was borrowed from the reference

Read from the live page's markup and stylesheets, not from memory:

| Wealthsimple does | Larch does |
|---|---|
| Every product gets its own full-bleed room in a muted, earthy colour: a warm off-white, a dusty plum, a taupe, a deep forest, a near-black navy, and one band that is a sky gradient | Five skins: oat, sage, a fog-to-apricot gradient, deep terracotta, deep spruce. Same temperament, **none of the same values** (see Colour) |
| One large product picture per room, sized to the room and cut differently for desktop and phone: a phone, a metal card, a mountain, a pie chart, a coin stack | One large object that *becomes* each of those pictures in turn. The page's own art is drawn to crop, so a single drawing fills a wide card and a tall one |
| Black pill buttons; on dark rooms they turn light | The call to action is an ink pill in the room's own ink, so it inverts by itself |
| A serif and a geometric sans, headlines in sentence case at large sizes, big soft radii | Fraunces and Instrument Sans, sentence case, 22–28px radii |
| Calm: things arrive, they don't perform | Chroma capped, no neon, no additive light, no idle scanning |

## What carried over from AXON, unchanged

These are the decisions already made in `Demo-Totem/`. They hold here for the
same reasons, which that README gives in full:

- **One number drives the page.** Scroll becomes `progress` in [0, 6].
  Travel, roll, morph and zoom all run off `dragEase`: the object holds still,
  then moves, then holds again.
- **Assembled, taken apart, assembled.** Side sections alternate with
  networks: feed-forward (Accounts), hub and spokes (Goals), clusters
  (Payments). Wiring is measured off CSS grid by `js/graph.js`, which is
  copied over unchanged.
- **Skins, not tints.** A skin is the whole colour set at once and lands in
  two places: on the `<section>` and on `:root` as `data-skin`. Seams are 64svh
  OKLab gradients, and each section names the skin it grows out of.
- **The island nav.** At the top it is a plain header. Once you scroll it
  condenses into a capsule, with a pill that slides between the links and a
  progress line along its edge. Below 1024px the links fold into a menu.
- **Typed titles and a line-at-a-time reveal.** These fire from where the
  title actually is on screen and rewind when the screen leaves. Characters
  sit in the DOM from the start, so nothing reflows.
- **Fluid scroll with no snapping.** The wheel moves a target, and the real
  scroll position chases it with `SCROLL_TAU` 0.30s. Copy is pinned from 900px
  up, so there is no dead zone between sections.
- **Cards tinted in their room's colours, lifted on hover.** Circles
  coin-flip (here, they are coins), pills split-flap, rows slide out, and in
  the networks the wiring follows the cards as they move.
- **Copy is the page.** Reveals arm only after everything is split and the
  object is built, so a failure anywhere leaves a readable static page.
- **No external images.** All art is inline SVG themed from the tokens. The
  Artifact CSP would block anything else.

## What changed, and why

### The object: coins instead of a network

AXON's model was a wireframe: hairline edges between dots, recoloured per
room. That is a diagram. The language here uses product pictures: big,
solid, lit, standing on a soft shadow. So the protagonist is **a few hundred
coins**. Each coin has a position, a facing and a size in every arrangement,
and the morph blends all three:

| # | Section | Arrangement | What it shows |
|---|---|---|---|
| 0 | Intro | `cone` | A larch cone: scales on a golden-angle spiral. The brand |
| 1 | Accounts (taken apart) | `stacks` | Four stacks of coins, rising. Four kinds of money |
| 2 | Portfolios | `pie` | A pie chart in four slices, the biggest pulled out |
| 3 | Goals (taken apart) | `summit` | A mountain, with a trail of coins winding to the peak |
| 4 | Advice | `hourglass` | Gold sand settled below, a funnel left above. Time with a person |
| 5 | Payments (taken apart) | `card` | A payment card laid out as a mosaic, chip in gold |
| 6 | Join | `coin` | One coin with a larch struck on its face, and a ring in orbit |

How it is drawn, in `js/asset.js`:

- **Coins are ellipses from their facing.** A flat coin is foreshortened, and
  one seen edge-on is a sliver, never thinner than its rim. That is what lets
  a stack of flat coins turn up into the face of a card.
- **They are depth-sorted every frame.** Unlike AXON's dots, coins are opaque
  and overlap, so they have to be painted far to near. The sort is an
  insertion sort on last frame's order, because between two frames almost
  nothing changes places. Coins are drawn in runs: consecutive coins that
  share a tone share one path and one fill. The cost is the number of tone
  changes, not the number of coins.
- **They are lit, not glowing.** Four shades per hue, plus a far tone, are
  mixed once per room change, so a frame does no colour arithmetic. On a pale
  room the coins are pigment, shaded toward black. On a dark room they are
  lit colour, with the shadow side sinking into the room. There is no
  additive blending anywhere: it turns a muted palette into neon.
- **It stands on a shadow.** A soft ellipse sits under the object, fainter
  and further off for the card and the coin, which float. It fades as the
  coins leave, because a scaffold of beads stands on nothing.
- **It stays alive without moving.** Coins wander half as far as AXON's
  units. Each coin catches the light on its own slow cycle (AXON's "firing").
  On arriving in a section, and every nine seconds after, one band of light
  crosses the object. That is its only event animation.
- **Kept in its slot the same way.** The geometry is centred on a robust
  bounding box, and the drawn result is fed back a quarter per frame.
  `reach()` now includes each coin's radius.

The object is larger than AXON's model. Zoom is 0.88–0.92 against
0.76–0.88, and the base scale is 0.36 against 0.30, because the reference
gives each room one big picture. On phones it is a fainter backdrop (0.30
against 0.42), because opaque coins cover more of the page than a wireframe
did.

**Poses are tuned against the roll.** `POSE_YAW` has to give a good face both
at the page's scroll roll (`SPIN_AT`: about −0.36 at the networks and −0.71
at Advice on a wide screen) and at zero (every section on a phone). The
hourglass is the strict case: its posts must stay out from in front of the
sand, which holds for a total yaw inside ±0.7. A first pass tuned without the
roll put a post straight down the middle of the sand on a laptop.

### The frame and its thread, instead of the rig and its circuit

The rig's jobs stay: a live panel around the copy, a first pass that reveals
the copy a line at a time, and a layer in the margins that wires the copy to
the object. Its vocabulary changes:

| AXON | Larch |
|---|---|
| Registration crosshairs | Four rounded corners, and only the corners |
| A scanning beam carrying its own scanlines | A soft gold wash with one hairline leading edge. It runs linear and is timed exactly as before (`--scan-from`, `--scan-d`) |
| An idle beam sweeping the live screen | None. A calm page does not keep scanning itself |
| A PCB bus down the outer edge | A **ledger rule**: one hairline with year ticks, a coin at its head, and one bead of light walking down it |
| A chip wired into a 4–3–1 network aimed at the model | A **growth curve**: compound interest, drawn as a pin on the frame's edge rising to end level with the object's centre. Its coins grow larger as it climbs. Once a loop a light runs up it, each coin catches the light, and the last one chimes |
| Waveform and segmented meter | Sparkline and a meter of round dots |

The placement rules are AXON's and unchanged. The thread sits only in the
margins, sized to the measured gap: a full curve, then a shorter one, then a
stub, then nothing. Where there is no gap it goes flat in the strip. It only
moves on the live screen.

### Type, emphasis and the call to action

- **Fraunces** for display, in sentence case. Its weight and SOFT axes step per
  section the way Archivo's width did. The paper rooms are round and light;
  the flooded ones firmer. Optical size follows the type size by itself.
- **Instrument Sans** for everything else. There is **no mono**: figures use
  tabular numerals, and the small labels are sentence case.
- **`<strong>` is a highlighter.** AXON filled the claim with a solid bar of
  the structure hue. Here it is that hue at 24% under ink, like a marker on a
  statement. Inside a card the mark mixes into the card rather than the band,
  because the band's mix laid a grey bar over a near-white card.
- **The CTA is an ink pill**, as described above. The nav's CTA is an ink pill
  on the open header and an oat pill on the spruce island.

### One rule added to the reveals

On narrow screens, AXON never showed copy whose title had already gone over
the top of the screen without landing. That happens after a reload that
restores the scroll, or a fling that carries the title past the landing line
between two frames. The copy sat invisible on screen. Now copy that has never
been shown, under a title that is already above the nav, is shown as it
stands. Scrolling back up into a section you have read keeps AXON's rule, and
the title types again. Measured at 390×844 with jumps into the middle of five
sections: without the rule, every one of those jumps left all the copy on
screen hidden (47–126 words, none visible). With it, none is hidden, and a
stepped scroll from top to bottom still finds no hidden copy under any
landed title.

## Colour

Five skins, each in light and dark. `tools/solve-palette.mjs` produced every
value in `css/tokens.css`:

1. **Grounds are set by hand in OKLCH.** They are the rooms.
2. **Each hue is held to a chroma cap of 0.06–0.11.** Gold carries the most,
   because it is the brand and the one hue that is also a fill. AXON took
   every hue to full chroma. This cap is what "muted" means here.
3. **Each hue is then taken to the lightness nearest its target that clears
   4.5:1** against its band (both ends of it, for dusk) and its panel.
4. **The derived pairs are checked with the same mixing the stylesheet
   uses:** the two lighter inks, the highlighter on the band and on a card,
   the ink pill, and text on a gold selection.

The worst pair in the file is 4.50:1, and `node tools/solve-palette.mjs
--check` prints every pair. Two things moved to get there. The quiet ink went
from AXON's 66% to 70%. Light-theme clay went down to L 0.375, because at
L 0.47 its mixed inks fell to 3.1:1 on a card.

| Skin | Sections | Light | Dark |
|---|---|---|---|
| `paper` | Intro, Portfolios, Advice | warm oat `#F3EFE6` | warm charcoal |
| `sage` | Accounts | pale green-grey `#BECFB9`, dark ink | deep sage |
| `dusk` | Goals | fog blue `#B9C7D8` into apricot `#EFD3BC` | ink blue into umber |
| `clay` | Payments | deep terracotta `#5E3424`, light ink | darker clay |
| `night` | Join | deep spruce `#0E221E` | near-black spruce |

Roles hold on paper: **gold** is the brand and the eye's resting point,
**moss** is structure, **slate** is data, and **clay** is what is live. A
flooded room recasts the role its ground would swallow. On sage, structure
goes to plum. On dusk, data goes to a deep teal. On clay, live goes to plum.

The dusk band is the one gradient. The band stays flat for the top half-seam
and then runs to apricot, and the section after it seams out of apricot
(`--k-dusk-bg2`) rather than fog blue. An earlier pass started the gradient
under the seam and showed a visible step where the seam ended.

## Generated art and the placeholders

- **Goal pictures** (a first home, a coast, a sunrise over hills) are drawn
  around their middles and set to `slice`. One drawing serves every card
  shape. On short wide screens they drop out of the Goals network, which is
  what buys its three rows their height. The rule is AXON's.
- **Advisor portraits** keep the rule AXON's feedback set: four people
  must read as four people. They differ in tone (each figure in its own hue,
  its face a tint of that hue at its own strength), in build (narrow to broad
  shoulders), in tilt, and in halo (one to three rings). Hair,
  glasses and a beard do the rest. They are labelled as generated stand-ins
  on the page.
- **Payment channels**, not partner companies. AXON used real company names
  as placeholders with a disclaimer. On a money app, a real bank's, network's
  or insurer's name beside a fictional account reads as a regulatory or
  partnership claim. So the clusters name generic ways money moves (direct
  deposit, e-Transfer, round-ups), and the glyphs are generated.
- **The one piece of small print** sits beside those channels. It says that
  Larch is fictional and that nothing on the page is an offer or financial
  advice. The testimonial in the close is marked fictional in its caption.

## Verified

Measured with Playwright in this container (software rendering):

- **No horizontal scroll at any width**, and every pinned screen fits under
  the nav. Sizes tested: 320×568, 360×640, 390×844, 834×1112, 960×700,
  1000×800, 1024×600, 1100×620, 1280×720, 1280×800, 1366×768, 1440×900,
  1920×1080, 2560×1400 and 3440×1440. The Advice roster was the one screen
  that did not fit: 18–38px over the foot at 1280×720 and 1366×768. The
  room came out of row density and a step down in the small copy on short
  screens, not out of any bio.
- **Frame time:** 16.7ms median and 16.8ms p95 at 1440×900 through a
  wheel-driven scroll of the whole page; 16.8ms median and 33.4ms p95 at
  2560×1400. The second is the same ceiling AXON documents for a
  full-viewport canvas at that size.
- **No console errors** at any of those sizes, in either theme, or in the
  embed build mounted inside a host document.
- **Reduced motion:** every word and every title character is visible, with
  no typing, wash or light.
- **Scripts off:** every heading and paragraph is present and visible.

## Porting to Next.js / React

The same split as AXON:

| This file | Becomes |
|---|---|
| `js/asset.js` | A React Three Fiber scene: one instanced cylinder mesh. The generators, `POSE_*`, `SHADOW` and the colour slots carry over; the projection, sort and ellipses become the GPU's |
| `js/app.js` | A scroll provider (Lenis + ScrollTrigger) exposing `progress`; `dragEase` becomes the timeline's ease |
| `js/thread.js` | A `<Thread side gap />` component rendering the same SVG |
| `js/graph.js` | A `<Graph links>` component; `layout()`'s targets feed the instance positions |
| `css/tokens.css` | Unchanged. Regenerate with `tools/solve-palette.mjs` when a ground changes |
| `index.html` | `page.tsx` plus a `Chapter` component, with copy, goals, people and channels from the CMS |
