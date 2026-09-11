# AXON — demo site plan

A first blueprint for the client demo. The reference the client responded to is
[totem.itsoffbrand.com](https://totem.itsoffbrand.com/) by OFF+BRAND — a Web3
microsite built in Three.js that took Awwwards SOTD, Awwwards Mobile Excellence,
FWA of the Day and CSSDA of the Day.

**Nothing here is final.** It exists so the first real demo starts from a
position rather than a blank page.

---

## What we are actually borrowing

Worth being precise, because "we liked that site" can mean several different
things and they cost very different amounts to build.

| The reference does | We do | Why it transfers |
|---|---|---|
| One 3D object owns the centre of the screen for the whole page | One neural field owns the centre for the whole page | This is the core idea. The page has a single protagonist and the copy orbits it. |
| Scroll transforms the object rather than scrolling past it | Scroll rewires the network between seven states | A neural net *reconfiguring* is a better fit for the metaphor than a rotating totem — the object's change carries meaning instead of just being motion. |
| Drag to rotate | Drag to rotate | Cheap, and it is the moment a visitor realises the thing is real. |
| Heavy black space, one vertical light source | Same, with an amber/indigo signal pair | See "Direction" below. |
| Ritual loading sequence | A boot readout, no blocking curtain | A full-screen preloader costs real bounce rate. We keep the ceremony and drop the wall. |
| Smoke and volumetric fog | Not in v1 | Volumetrics are the single most expensive thing on the reference and the first thing that breaks mid-tier GPUs. Revisit once the budget is measured. |

## Direction

**Concept: the network is the company.** A fintech whose product is inference
should have a homepage where you watch inference happen. The field is not
decoration behind the copy — the copy narrates what the field is currently
doing, and the two are locked to the same scroll position.

**Palette** is taken from how neural weights are genuinely visualised:
excitatory weights read warm, inhibitory read cool. Every edge in the field is
coloured by the sign of its weight, so the palette encodes data rather than
decorating it. Amber `#FFAE1A` and indigo `#4C5BD4` on a blue-black `#06070A`,
with a warm bone `#EAE6DC` for type. Full set in `design/tokens.json`.

**Type** is Archivo set expanded and heavy for display — monument, not poster —
against IBM Plex Sans for copy and IBM Plex Mono for figures, labels and chapter
markers. The mono is doing real work: it is a fintech site, and numbers should
line up.

## The demo brand

**AXON** — financial intelligence infrastructure. Fictional, so nothing in the
demo can be mistaken for a real company's claims. All figures in the prototype
are invented and the footer says so.

The narrative arc, which is also the scroll storyboard:

| # | Chapter | Field state | The claim |
|---|---|---|---|
| 00 | Dormant | Vertical column | The neural layer for global capital |
| 01 | Ingest | Shell / point cloud | Every payment is a signal |
| 02 | Inference | Layered feed-forward stack | Six layers between fraud and settlement |
| 03 | Settlement | Globe with latitude corridors | Capital that routes itself |
| 04 | Assurance | Cubic lattice | Auditable by construction |
| 05 | Proof | Flat ledger plane | What the network returns |
| 06 | Begin | Collapse to a single core | Start with one corridor |

Seven states, one continuous object. It never cuts.

## Information architecture (full site, beyond the demo)

```
/                     the scroll experience above
/platform             ingest · inference · settlement · assurance (one page each)
/platform/[slug]
/customers            case studies
/customers/[slug]
/developers           docs entry, API overview, status
/insights             articles
/insights/[slug]
/company              about, careers, press
/legal/[slug]         terms, privacy, DPA, model cards
```

Only `/` and `/platform/*` carry the WebGL field. Everything else is a
conventional, fast, accessible content page — which is the point: the expensive
experience is spent where it converts.

## Deliverables in this repo

| Path | What it is |
|---|---|
| `site/demo.html` | Working scroll prototype. Open it in a browser. |
| `site/blueprint.html` | The client-facing blueprint deck. |
| `site/neural.js` | The field renderer both pages share. Dependency-free. |
| `design/tokens.css` / `.json` | Design tokens, single source of truth. |
| `docs/01-STACK.md` | Stack recommendation and the alternatives considered. |
| `docs/02-MOTION.md` | Scroll choreography spec, frame by frame. |
| `docs/03-CONTENT-MODEL.md` | CMS schemas. |
| `docs/04-PERFORMANCE.md` | Budgets, device tiers, fallbacks. |

## Roadmap

Estimates assume one designer and one front-end developer, and exclude client
review time.

| Phase | Work | Duration |
|---|---|---|
| 0 | Blueprint — this repo | done |
| 1 | Art direction: full design, all breakpoints, motion studies | 2 weeks |
| 2 | Scene R&D — the field in R3F, proven at 60 fps on a real mid-tier phone | 1.5 weeks |
| 3 | Build — pages, components, CMS schemas, Studio | 3 weeks |
| 4 | Content load and integration | 1 week |
| 5 | Performance, accessibility and cross-device QA | 1 week |
| 6 | Launch | 2 days |

**Roughly 8–9 weeks to production.** A sharper version of the demo itself —
enough to put in front of the client with their own brand on it — is **5 to 7
days** from sign-off on direction.

Phase 2 is the one that must not be compressed. If the field cannot hold frame
rate on the target device, the design changes, and it is far cheaper to learn
that in week four than in week eight.

## Open questions for the client

1. **Whose brand?** Is the demo dressed as AXON, as the client's own brand, or
   as a named prospect of theirs? This changes phase 1 substantially.
2. **Target device floor.** "Mid-end" needs a specific handset. Everything in
   `04-PERFORMANCE.md` is written against a Pixel 6a / Galaxy A54 class device;
   if the real floor is lower, tier C becomes the default rather than the
   fallback.
3. **Who edits the site after launch** — a marketer, or an engineer? The CMS
   recommendation holds either way, but how much of the motion we expose as
   editable content depends on the answer.
4. **Does the reference's audio layer matter to them?** It is a signature part
   of that genre and a real accessibility and autoplay-policy cost.
