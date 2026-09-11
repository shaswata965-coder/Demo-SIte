# AXON — demo site blueprint

Initial blueprint for a client demo, in the spirit of
[totem.itsoffbrand.com](https://totem.itsoffbrand.com/) — one 3D object that
owns the centre of the screen and transforms as you scroll — rebuilt around a
**neural network** metaphor for a **fintech** brand.

*AXON is a fictional company invented for this demo. Every figure in the
prototype is made up.*

## Start here

| | |
|---|---|
| **[docs/00-PLAN.md](docs/00-PLAN.md)** | Direction, what we're borrowing from the reference, IA, roadmap, open questions |
| **[docs/01-STACK.md](docs/01-STACK.md)** | Stack recommendation and the alternatives considered |
| **[docs/02-MOTION.md](docs/02-MOTION.md)** | Scroll choreography, chapter by chapter |
| **[docs/03-CONTENT-MODEL.md](docs/03-CONTENT-MODEL.md)** | CMS schemas |
| **[docs/04-PERFORMANCE.md](docs/04-PERFORMANCE.md)** | Budgets, device tiers, fallbacks |

## Run the prototype

No build step, no dependencies:

```sh
python3 -m http.server 8000 --directory site
# then open http://localhost:8000/demo.html
```

`site/demo.html` is the scroll experience. `site/blueprint.html` is the
client-facing deck. Both share `site/neural.js`.

## The short version of the stack answer

**Next.js 15 + React Three Fiber + GSAP/ScrollTrigger + Lenis + Tailwind v4 +
Sanity, on Vercel.**

Sanity because motion parameters can live alongside the copy, so the client
retunes the experience without a deploy. Next.js because route-level code
splitting keeps the 3D bundle off the pages that don't need it. Three quality
tiers with a no-WebGL fallback because "great on mid-end devices" is the
constraint that decides whether this design survives contact with real hardware
— reasoning in [docs/01-STACK.md](docs/01-STACK.md) and
[docs/04-PERFORMANCE.md](docs/04-PERFORMANCE.md).

## Why the prototype has no dependencies

`site/neural.js` projects a 3D point graph onto a 2D canvas by hand. No WebGL,
no Three.js, ~20 KB. That is deliberate: it opens instantly on the client's own
phone during the pitch, and it demonstrates the quality-tier governor that the
production build uses. The state machine — seven position targets, per-state
edge visibility, smoothstepped blending — is the part that carries over to
React Three Fiber unchanged.
