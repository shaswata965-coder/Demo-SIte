# Demo-Wealthsimple

A homepage for **Larch**, a fictional company that builds and runs
machine-learning models for banks, lenders and asset managers: credit
decisioning, fraud and AML, liquidity forecasting, portfolio risk and the
governance around all of them.

It is built on the homepage of
[wealthsimple.com](https://www.wealthsimple.com/en-ca): the same run of
sections, the same type pairing (in Google Fonts), the same kind of looping
product backgrounds and the same headline reveals. Each of the reference's
pictures has been remade as a Larch one. None of its colours, copy or images
are reused.

*Larch is fictional. Every institution, person, quote and figure on the page is
invented.*

The two earlier versions of this folder (a scroll-driven piece built around a
morphing object, then a static site of data panels) are in the git history.

## Run it

```sh
python3 -m http.server 8000 --directory Demo-Wealthsimple
# http://localhost:8000
```

Opening `index.html` from disk works too. There is no build step to view it.
The tools below only regenerate files that are already committed.

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
index.html               the page; the forecast chart is drawn into it between markers
css/tokens.css           nine rooms, the product-screen set and the card metal (generated)
css/main.css             type, layout, header, menu, sections, entrances
css/assets.css           the five product pictures and their loops
js/site.js               theme, pause, headline entrances, header, menus, form, copy
js/scenes.js             the two canvas backgrounds: the decision tree and the loss surface
tools/solve-palette.mjs  solves and checks every colour, writes tokens.css
tools/draw-assets.mjs    draws the forecast chart from its series into index.html
tools/make-embed.mjs     single-file build (dist/, or artifact.html)
artifact.html            the published Artifact (generated, do not edit)
```

## Section by section

| Reference | Larch | Room | The picture, and what moves |
|---|---|---|---|
| Opener: campaign image, headline, email form | **The 2026 Model Review**: "Show us one model. We'll explain every decision it made." | spruce | Canvas. A decision tree laid out like a larch branch. Applications stream in along the trunk, split at each node (the first splits carry their rules, such as "debt-to-income < 0.36"), and settle on a leaf: gold where it approves, quiet where it refers or declines. The branches sway. |
| Exploded menu: five product names in huge serif | Credit, Fraud, Forecasting, Risk, Governance | lichen | On hover or focus a row turns white, its icon slides in from the left and its description from the right (585 ms). On a phone each row shows its description and an arrow. |
| Chequing: phone UI | **Credit** | petrol | A phone running Larch Credit. The score counts up to 712 against a cutoff of 660, four reasons arrive with their bars, the decision appears, and a note says the reasons were saved to the loan file. A 12 s loop. |
| Credit card: a metal card | **Governance** | olive | The model card made like a metal payment card: model number where the card number goes, owner where the name goes, "Review by 09/27" where the expiry goes, a validation seal for the chip and "Tier 1" for the network mark. It turns slowly in a passing light. |
| About: coin stack, huge serif, thesis | "Machine learning, accounted for" | lichen | A coin stack with a larch growing out of it, fading in. The thesis rises word by word. |
| Trade: trading UI | **Fraud** | oxblood | A live payments monitor whose feed never stops, a few payments held or sent for review, and an open case: seven accounts around one device, money moving round the ring and out to a new wire payee. |
| Summit: a floating mountaintop | **Forecasting** | dawn (gradient) | The cash forecast on a floating slab in 3D. The forecast draws itself, its range fills in, and a pin stands up off the surface at the low point. |
| Classic: an animated pie | **Risk** | fog | A donut of one-day 99% VaR by factor that rebalances between "before hedge" and "after rates hedge", with its centre total and legend changing with it. |
| TLDR: newsletter card with a video portrait | **The Residual** | moss card on lichen | The wordmark beside an illustrated portrait of its editor, who tilts her head. |
| Final CTA: full-height close | "Every decision, explained to your regulator." | peat | Canvas. A dotted loss surface, breathing. A point rolls downhill with momentum to the minimum, shows "converged", and starts again elsewhere. The last word of the headline turns over like a drum: regulator, auditors, board, customers. |

Each picture is a product screen or object built in HTML, SVG and canvas from
the page's tokens. Its text is real text, it follows the theme, and it is
sized in em from its stage (container units), so it scales with the viewport
as one piece. On a phone it is sized by width and may run off the bottom, the
way a cropped product shot does. Each has a text description for screen
readers.

## Type

- **Newsreader** stands in for the reference's text-cut serif. It is used at
  a fixed text optical size (`opsz` 20) even at 128px, so the big lines stay
  sturdy rather than turning into a high-contrast display face. Product menu,
  about, the close and the eyebrow.
- **Jost** stands in for the reference's Futura-like sans: headlines at 500,
  reading at 400, tracked +0.005em.
- Sizes are the reference's fluid scale: 40–64px for the opener, 32–48px for
  product headlines, 32–128px and 56–128px for the serif statements, 20–32px
  for the thesis, body at 18px with 1.4 leading.

## Motion

One ease for everything, the reference's own: `cubic-bezier(0.241, 0.969,
0.635, 0.997)`, fast out of the gate with a long settle.

- **Headline entrances.** `js/site.js` splits a headline into words when it
  first comes into view. Each word rises half an em and fades in, a few
  hundredths of a second after the one before and a little more for each new
  line. Screen readers get the sentence once, whole.
- **Supporting copy** fades in over 914 ms after its headline: eyebrows first,
  then buttons and forms.
- **Background loops** run in CSS (the product pictures) and canvas (the
  opener and the close). Sections off screen stop their loops.
- **The pause button** on every moving section stops all of it at once, and
  the choice is remembered in this browser.
- **Reduced motion.** Nothing waits to enter and nothing loops: every picture
  shows its finished frame and each canvas draws one still frame.
- **Without the script** every headline is simply shown. The early inline
  script holds headlines back only when it knows the main script can run, and
  a CSS fallback shows them after 2.5 s if it never does.

## Colour

Nine rooms, each in light and dark, in the order the reference uses its
grounds: a near-black opener, paper, two muted mid-darks, paper, a deep dark,
a light gradient, paper and a dark close.

| Room | Light theme | Used for |
|---|---|---|
| spruce | deep blue-green | the opener |
| lichen | cool green-grey paper | product menu, about, newsletter, footer |
| petrol | muted mid-dark blue | credit |
| olive | smoked olive | governance |
| oxblood | deep red-brown | fraud |
| dawn | fog blue into pale wheat | forecasting |
| fog | cool pale grey | risk |
| moss | pale lichen green | the newsletter card |
| peat | warm near-black | the close |

`tools/solve-palette.mjs --write` writes `css/tokens.css` and checks it:

- On every room, ink clears 7:1 on the whole ground (both ends of a
  gradient), the quieter ink and the pill label clear 4.5:1, and the pill and
  the room's gold glow clear 3:1.
- The product screens share one set: two inks, a brand gold, three status
  hues (each 4.5:1 on the screen, the sunk screen and its own tinted pill) and
  five series at 3:1 on the screen.
- The metal card keeps one set in both themes, since it is an object; its
  engraving clears 4.5:1 on every stop of the metal.
- The lowest text pair in the file is 4.61:1.

## The forecast chart

`tools/draw-assets.mjs` computes the slab's chart from a daily cash series:
45 days of actuals and a 60-day forecast whose range widens with the horizon,
with payroll and tax drains smoothed over a few days. The pin's figure is read
off the series ("$339M, Oct 30", 29 days out, above the $300M floor), and the
script stops if the range ever crosses the floor, since the page says it does
not. Running it twice changes nothing.

## Verified

Checked with Playwright in this container, with the webfonts loaded:

- No horizontal scroll and no text pushed off screen at 320, 360, 390, 768,
  1024, 1280, 1440, 1920 and 2560 wide, in light and dark.
- No page errors.
- Menu hover reveal, the Products panel (closes after a link), the phone
  drawer, the form's two messages, theme toggle, copy button, and pause (the
  canvas holds still while paused and moves again after).
- Reduced motion: every section complete at rest, nothing hidden.

## Porting

| This file | Becomes |
|---|---|
| `index.html` | Next.js sections, one component each; copy from the CMS |
| `css/assets.css` | One component per picture; in production the loops could become short muted videos with these as posters |
| `js/site.js` | An `AnimatedText` component and a motion preference provider |
| `js/scenes.js` | Two client components drawing to canvas |
| `css/tokens.css` | Unchanged; Tailwind v4 reads CSS custom properties directly |
