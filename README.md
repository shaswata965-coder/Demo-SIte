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

- Light and dark, toggled top right. Light takes a saturated ground that
  changes with every chapter; dark keeps a near-black ground and lets only the
  signal carry the colour.
- The model lives on one side of the content, not behind it, and swaps sides
  as the chapters progress.
- Scroll turns and rewires it through seven arrangements while the page's type,
  texture, colour and layout transform with it.

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
