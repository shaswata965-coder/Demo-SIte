# Content model

Sanity schemas. The organising principle: **the client should be able to retune
the experience without a deploy.** Motion parameters are content, not constants
in a source file.

## Documents

### `siteSettings` (singleton)
Navigation, footer groups, legal links, social handles, default OG image,
default meta description, announcement bar.

### `page`
```
title            string
slug             slug                     unique
seo              object { title, description, ogImage, noIndex }
sections         array of section blocks   ← the page is its section list
```

### `post` — insights
```
title, slug, excerpt, hero, publishedAt, authors[], topics[],
body  portableText  (with custom blocks: pullQuote, figure, codeBlock, metricRow)
```

### `customerStory`
```
customer         reference → customer
headline, slug, hero, summary
results          array of { label, value, unit, footnote }
body             portableText
corridorsLive    number
goLiveWeeks      number
```

### `customer`
`name, logo (SVG), sector, region, isPublic`

### `legalDoc`
`title, slug, effectiveFrom, body, supersedes → legalDoc`

### `sceneConfig` (singleton) — the motion knobs
```
palette          { ink, bone, amber, indigo }     ← drives canvas AND CSS
nodesTierA       number   default 4500
nodesTierB       number   default 1800
pulseDensity     number   0–1
autoRotateRate   number   rad/s
scrollLerp       number   0–1
posterSequence   file     tier C frames
```

## Section blocks

Each is a block type usable inside `page.sections`. This is the whole component
library as far as an editor is concerned.

| Block | Fields | Renders |
|---|---|---|
| `heroScene` | eyebrow, headline, lede, primaryCta, fieldState | Chapter 00 — the full-viewport opener |
| `scrollChapter` | marker, title, body, fieldState, scrollLength, figures[] | Chapters 01–05. **`fieldState` is a dropdown of the seven states** and `scrollLength` is in viewport heights. |
| `metricsBand` | metrics[] { label, value, unit, emphasis }, footnote | The proof row |
| `logoWall` | heading, customers[] → customer, grayscale | |
| `featureSplit` | title, body, media, mediaSide, bullets[] | Platform sub-pages |
| `specTable` | caption, rows[] { term, value } | Developer-facing specs |
| `quote` | text, attribution, role, customer → customer | |
| `faq` | items[] { question, answer } | Emits FAQPage JSON-LD |
| `ctaBand` | headline, body, cta, fieldState | Chapter 06 — the collapse |

`fieldState` appearing on three separate blocks is the important bit. An editor
adding a chapter chooses which state the network resolves to, and the scroll
choreography follows — no developer involved.

## Validation worth enforcing in the Studio

- `scrollChapter.body` capped at 320 characters. The copy sits over a live
  canvas; anything longer stops being readable and the constraint should be in
  the CMS, not in a style guide nobody reads.
- `figures` capped at 3 per chapter.
- `heroScene.headline` capped at 60 characters — beyond that it wraps past four
  lines at 390 px wide.
- Every `media` requires `alt`. No exceptions, enforced at the schema level.
- Two consecutive chapters may not share a `fieldState`; the morph would be a
  no-op and the chapter change would read as broken.

## Preview and publishing

- Next.js draft mode + Sanity presentation tool: click any headline on the live
  page, edit it in place.
- Scheduled publishing for campaign pages.
- Preview deploys per branch on Vercel, so client review happens on a real URL
  rather than in a screenshot.
