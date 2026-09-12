# Stack recommendation

The brief has four constraints that pull against each other: an award-show-grade
WebGL scroll experience, full responsiveness, a CMS a non-developer can run, and
smooth playback on mid-tier hardware. The last one is the binding constraint —
almost any stack satisfies the first three.

## Recommended

| Layer | Choice | Why this one for this brief |
|---|---|---|
| Framework | **Next.js 15**, App Router, TypeScript | Route-level code splitting keeps the ~180 KB 3D bundle off pages that don't render the field. Static generation + ISR means the marketing pages are CDN HTML, not a client-rendered shell. |
| 3D | **React Three Fiber** + `drei` + `postprocessing` | Declarative Three.js that reads React state, so the scroll chapter and the scene state are one source of truth. Instancing, LOD and quality tiers are ~30 lines rather than a rewrite. |
| Choreography | **GSAP** + ScrollTrigger | ScrollTrigger scrubs a timeline against scroll position, which is exactly the reference's model. Framer Motion is better at component transitions and worse at long scrubbed timelines. |
| Scroll | **Lenis** | The inertial feel is a large part of what the client responded to. Lenis smooths pointer-fine devices and correctly leaves native scroll alone on touch. |
| Styling | **Tailwind CSS v4** with the tokens in `design/tokens.css` | v4 reads CSS custom properties directly, so the token file is the single source for both Tailwind utilities and raw CSS in shaders/canvas code. |
| CMS | **Sanity** | See below. |
| Hosting | **Vercel** | Edge CDN, image optimisation, preview deploys per branch for client review. |

### Why Sanity for the CMS

Beyond the usual (Portable Text, real-time collaboration, an embedded Studio at
`/studio` in the same repo and the same deploy), one thing matters specifically
here: **motion parameters can be content.** Scroll length per chapter, which
morph state a chapter targets, accent hue, pulse density — all of it lives in
the same document as the copy. The client retunes the experience in the Studio
without a developer and without a deploy. On a site where the motion *is* the
product, that is the difference between a site they can run and a site they have
to call us about.

Visual editing with Next.js draft mode also lets them click a headline on the
live page and edit it in place, which is what sells the CMS in a demo.

### Alternatives, and when each wins

| If the priority becomes… | Use | Cost of switching to it |
|---|---|---|
| Lightest possible JS baseline; motion confined to a few sections | **Astro** + islands | A canvas that persists across page transitions has to be hand-wired. Loses the seamless route change. |
| The client must own and self-host their data | **Payload CMS v3** (runs inside the Next.js app) | No SaaS bill, same repo. You now operate Postgres, backups and upgrades. |
| A non-technical marketing team wants true visual page building | **Storyblok** | Excellent editor. More lock-in, higher seat cost, schema changes are slower. |
| Pitch speed over everything, throwaway afterwards | **Webflow** + GSAP | Fast to a demo, but the WebGL ceiling arrives quickly and the codebase can't be lifted into production. |

### Deliberately not using

- **Raw Three.js.** Nothing wrong with it, but state sync with the DOM becomes
  hand-written glue we'd then have to maintain.
- **A scroll-jacking library that replaces native scroll on touch.** It is the
  single most reliable way to make a site feel broken on a mid-range Android.
- **A headless CMS with no structured motion fields** (e.g. plain Markdown/MDX).
  Fine for a blog; it puts the experience back in developers' hands.

## What makes this work on mid-end devices

This is the part worth reading carefully — it is where sites in this genre
usually fail. Full detail in [`04-PERFORMANCE.md`](./04-PERFORMANCE.md); the
short version:

1. **Three quality tiers**, picked from `deviceMemory`, `hardwareConcurrency`,
   the WebGL renderer string and `navigator.connection.saveData`, then demoted
   (never promoted) by a runtime frame-time governor.
2. **Tier C has no WebGL at all** — a pre-rendered image sequence driven by the
   same scroll timeline. Same copy, same chapters, same scroll length. It is a
   real design, not a broken-looking fallback, and it is also what
   `prefers-reduced-motion` gets.
3. **Instanced geometry**, one draw call for thousands of nodes, and a clamped
   device pixel ratio. Resolution is the first thing to spend and the first to
   cut.
4. **The 3D bundle is lazy.** A visitor who lands on a legal page or a blog post
   never downloads Three.js.

The prototype in `Demo-Totem/` demonstrates the same governor in miniature: it runs on
a hand-projected 2D canvas with no dependencies, precisely so it can be opened
on the client's own phone during the pitch without a WebGL context in sight.
