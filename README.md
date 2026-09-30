# AXON — neural fintech demo

A scroll-driven demo page in the spirit of
[totem.itsoffbrand.com](https://totem.itsoffbrand.com/) — one object that
transforms as you scroll — rebuilt around a **neural model** for a **fintech**
brand.

*AXON is fictional. Every figure on the page is invented.*

## The demo

**[`Demo-Totem/`](Demo-Totem/)** — plain HTML, CSS and JS. No build step, no
dependencies. Start there; its [README](Demo-Totem/README.md) explains how it
works and how it ports to React.

```sh
python3 -m http.server 8000 --directory Demo-Totem
```

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
- Scroll turns and rewires the model through seven arrangements while the
  page's type, texture, colour and layout transform with it.

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
