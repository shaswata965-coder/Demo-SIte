# Performance budget and device tiers

The client's concern — "great even with mid-end devices" — is the constraint
that shapes the build. Sites in this genre routinely ship 4 MB of JavaScript and
hold 22 fps on a mid-range Android. That is the failure mode to design against.

## Target device

All budgets below are written against a **Pixel 6a / Galaxy A54 class** phone on
a throttled 4G connection. If the real floor is lower, tier C becomes the
default experience rather than the fallback — a decision to make deliberately,
not discover at QA.

## Budget

| Metric | Budget | Notes |
|---|---|---|
| LCP | < 2.0 s | Hero copy is server-rendered HTML; it never waits on the canvas. |
| INP | < 200 ms | |
| CLS | < 0.05 | Canvas is fixed and out of flow, so it contributes nothing. |
| First-load JS, non-3D routes | < 140 KB gzip | Legal pages, insights, careers. |
| 3D chunk, lazy | < 190 KB gzip | Tree-shaken Three.js core + R3F. Loaded only on routes that render the field. |
| Texture memory | < 48 MB | |
| Frame rate | 60 fps desktop, ≥ 45 fps target phone | |
| Lighthouse performance | ≥ 92 mobile | |
| Lighthouse accessibility | 100 | Non-negotiable, not a target. |

## Tiers

Tier is chosen once at boot, then only ever demoted.

| | Tier A | Tier B | Tier C |
|---|---|---|---|
| Typical device | Desktop with discrete GPU, recent flagship phone | Mid-range phone, integrated laptop GPU | Low-end, save-data, reduced-motion, or no WebGL2 |
| Nodes | 4,500 instanced | 1,800 instanced | — |
| Post-processing | Bloom + film grain | None; CSS grain overlay | — |
| Device pixel ratio | up to 2.0 | 1.25 | 1.0 |
| Shadows / volumetrics | Off in v1 | Off | — |
| Signal pulses | 16 | 10 | — |
| The field | Live WebGL | Live WebGL | Pre-rendered image sequence, scroll-scrubbed |

**Tier C is a design, not an error state.** Same copy, same seven chapters, same
scroll length, same layout. The field becomes a scroll-scrubbed sequence of
pre-rendered frames (≈ 60 AVIF frames, ~400 KB total, decoded progressively).
Most visitors would not identify it as a fallback.

## Detection

```js
if (connection.saveData)                      → C
if (prefers-reduced-motion: reduce)           → C
if (!webgl2 || renderer matches swiftshader)  → C
if (deviceMemory <= 4 || cores <= 4)          → C
if (coarse pointer || deviceMemory <= 6)      → B
else                                          → A
```

Then a **frame-time governor** runs continuously: a rolling count of frames over
28 ms, and 90 consecutive slow frames demotes one tier, once. It never promotes.
A tier that oscillates looks far worse than a tier that is simply lower, and
users notice the oscillation more than the resolution.

The prototype in `totem-demo/js/neural.js` implements this governor in miniature — see
`NeuralField.prototype.start`.

## Techniques that carry the budget

1. **One draw call for the nodes.** `InstancedMesh` with per-instance position
   and colour attributes; morph blending happens in the vertex shader, not on
   the CPU.
2. **Edges bucketed by opacity.** In the prototype this is the single biggest
   win — four `Path2D` strokes per frame instead of eleven hundred. In
   production it becomes one `LineSegments` with a vertex-colour attribute.
3. **Clamped DPR.** Resolution is the first thing to spend and the first to cut.
   A tier-B phone at DPR 1.25 looks materially better at 50 fps than at DPR 2
   and 28 fps.
4. **Lazy 3D.** A visitor reading a legal page never downloads Three.js.
5. **`content-visibility: auto`** on below-fold chapters.
6. **No autoplaying video anywhere.** It is the largest single cost on most
   sites in this genre and it competes with the canvas for decode bandwidth.
7. **Fonts subset and preloaded**, `display: swap`, with a metric-compatible
   fallback so the headline does not reflow.

## What we measure, and when

- Lighthouse CI on every pull request, against the budgets above. Build fails
  on regression.
- A real device lab check at the end of phase 2 and phase 5 — a physical
  mid-range Android, not a throttled desktop. They do not behave alike, and the
  difference is usually thermal.
- Real-user monitoring from launch, segmented by tier, so we find out whether
  the tier assignment is actually correct in the field.
