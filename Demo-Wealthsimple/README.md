# Demo-Wealthsimple

A static marketing site for **Larch**, a fictional company that builds and
runs machine-learning models for banks, lenders and asset managers: credit
decisioning, fraud and AML, liquidity forecasting, and portfolio and market
risk. It borrows its design language from
[wealthsimple.com](https://www.wealthsimple.com/en-ca): muted full-bleed
rooms, one large product picture per section, ink-pill buttons and generous
type. None of that site's colours are reused.

*Larch is fictional. Every institution, person, quote and figure on the page is
invented.*

This replaces the first version of this folder, which was a scroll-driven
piece built around a morphing object of coins. That version is in the git
history.

## Run it

```sh
python3 -m http.server 8000 --directory Demo-Wealthsimple
# http://localhost:8000
```

Opening `index.html` from disk works too. There is no build step to view it.
The two tools below only regenerate files that are already committed.

**The Artifact.** `artifact.html` is the single-file build of this page,
published at
[claude.ai/artifact/7YaYTpwwFGiXCjvo2mmhCi](https://claude.ai/artifact/7YaYTpwwFGiXCjvo2mmhCi)
(private until its owner shares it). It is generated, so edit the sources and
rebuild rather than editing it:

```sh
node tools/make-embed.mjs --out artifact.html --title Larch
```

## Files

```
index.html               the page; charts are drawn into it between markers
css/tokens.css           six rooms in light and dark (generated, do not edit)
css/main.css             layout and components
js/site.js               theme toggle, chart tooltips, copy button (optional)
tools/solve-palette.mjs  solves and checks every colour, writes tokens.css
tools/draw-assets.mjs    draws every chart from its data into index.html
tools/make-embed.mjs     single-file build (dist/, or artifact.html)
artifact.html            the published Artifact (generated, do not edit)
```

## The page

| Section | Room | The picture |
|---|---|---|
| Hero | stone | The **decision console**: four KPIs, a 30-day chart of applications and approvals, a live feed of decisions with status pills, and a phone notification for an adverse action notice |
| Customers strip | stone | Six fictional institutions, each with its own mark and wordmark treatment |
| Products | stone | Four cards with an icon each, linking to the rooms below |
| Credit decisioning | sage | **One decision explained**: score, probability of default and limit, a waterfall of reason-code contributions against the 660 cutoff, and a calibration chart of predicted against observed default rates |
| Fraud and AML | spruce | **A transaction network**: a seven-account mule ring around a shared device, with the money coming in and the new wire payee, plus the alert card with its flow of transfers |
| Liquidity forecasting | mist | **A cash forecast**: 90 days of actuals, a 60-day P50 forecast inside its P10–P90 band, the $300M floor, two stat tiles and a chart of the drivers of the next 30 days |
| Portfolio and market risk | slate | **A factor exposure heat map** across six books and six factors, and **stress scenarios** as diverging bars |
| Platform | stone | A six-step **pipeline**, connect to monitor, with a note on the loop back into retraining. It is a row of six on a wide screen and a column on a phone |
| Governance | sage | A **model card** with an approval stamp, performance table, fairness chart against the four-fifths limit and known limitations, plus the **audit trail** |
| Customers | stone | Three case studies, each with its own chart: an approval/loss frontier, monthly false positives either side of go-live, and run time before and after |
| Company | stone | Four **illustrated portraits** that differ in skin tone, build, hair, glasses and clothing, and four security points |
| Contact and footer | night | The address as selectable text with a copy button, a three-step "what happens next", columns and the fictional-company notice |

Every picture is the product itself, built in HTML and SVG from the page's
own tokens. The text in it is real text, it themes with the page, and it
simplifies at narrow widths instead of shrinking into an unreadable picture.
That is this page's version of the reference's large, adaptive assets.

## How the charts are made

`tools/draw-assets.mjs` computes every chart, the fraud network and the heat
map from data. Marks, ticks and labels share one scale, and a number in the
copy matches the number in its picture. For example, the console's "18,402
decisions, 64.8% approved, +6.1% on last Tuesday" are read off the last point
of the 30-day series. The output is static SVG between
`<!-- draw:name -->` markers, so the page needs no script to show it. Running
the tool twice produces the same file.

- **Two drawings per chart.** There is a wide drawing and a compact one with
  fewer ticks and shorter labels. A container query on the chart's own panel
  chooses which to show. The fraud network's compact drawing is a crop framed
  on the ring rather than a shrink.
- **Dataviz rules.** Bars are at most 24px thick, with a 4px rounded data end
  and a square base. Lines are 2px, dots are 8px with a 2px ring in the panel
  colour, and grids are solid hairlines. Text is in ink tokens only, and a
  legend appears whenever there are two or more series. Polarity (positive or
  negative contributions, gains or losses, long or short) uses a diverging
  pair. Approved and declined states use the status colours, always with a
  label.
- **Every chart has its table.** A "Data" disclosure under each chart holds
  its numbers, and each mark carries hover text. `js/site.js` shows it as one
  tooltip, written with `textContent`.

## Colour

Six rooms, each in light and dark: **stone** (cool porcelain, the default),
**sage**, **mist** (a fog-blue to pale-wheat gradient), **spruce**, **slate**
and **night**. The grounds stay at OKLCH chroma 0.03 or less, so the colour on
the page comes from the pictures. The palette is cool-neutral rather than
cream, with brass as the brand accent and petrol blue for links.

`tools/solve-palette.mjs --write` writes `css/tokens.css` and checks it:

- Every text hue (brass, petrol, good, bad) is solved to clear **4.5:1** on its
  room's band, at both ends of the mist gradient, and on its panel. So are the
  two quieter inks and the ink pill. The worst text pair in the file is
  4.51:1.
- **Chart series:** petrol, brass and violet, in that fixed order. Each sits
  inside the dataviz lightness band, at chroma 0.10 or more, at 3:1 or better
  on every panel it is drawn on.
- **The heat map is binned:** four steps each way from a grey zero. The steps'
  lightness jumps the mid-tones where neither ink reads, so every cell carries
  its number at 4.5:1 or better. The quiet steps take the room's ink and the
  strong steps its ground.

The categorical series were also run through the dataviz skill's validator
(`validate_palette.js`) against all twelve room and theme panels. All pass:
the worst adjacent colour-vision difference is ΔE 17.4, and the
normal-vision floor is ΔE 21.4.

## Type

- **Urbanist** for display: geometric, in sentence case, tracked tight at
  large sizes, close in spirit to the reference's geometric headline face.
- **Instrument Sans** for reading.
- **Geist Mono** only for what a system prints: application IDs, timestamps,
  model versions.

## What carried over from the earlier demos, and what did not

**Kept:**
- A whole colour set per section, with every value solved rather than picked.
- The ink-pill call to action.
- All imagery as inline SVG themed from tokens. The Artifact CSP blocks
  external images.
- Light and dark themes with a toggle.
- Varied, generated portraits that are labelled as illustrations.
- A visible notice that the company is fictional, and fictional institutions
  in place of real ones.

**Dropped**, because this is a static professional site:
- The scroll-driven object and the `progress` number driving it.
- Pinned sections and the custom wheel scrolling.
- Typed titles and the line-by-line reveal.

The page is complete at rest. The only motion is a hover lift on cards.

## Verified

Checked with Playwright in this container:

- No horizontal scroll at 320, 360, 390, 768, 1024, 1280, 1440, 1920 or 2560
  wide, in light and dark.
- No page errors.
- Generator output is idempotent.
- Every text pair, chart mark and heat-map cell passes the checks above.

## Porting

| This file | Becomes |
|---|---|
| `index.html` | Next.js pages, one component per section; copy and case studies from the CMS |
| `tools/draw-assets.mjs` | The same functions, run at build time or rendered by a chart component from real data |
| `css/tokens.css` | Unchanged; Tailwind v4 reads CSS custom properties directly |
| `js/site.js` | A theme provider and a shared tooltip component |
