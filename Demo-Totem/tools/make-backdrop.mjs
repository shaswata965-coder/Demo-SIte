/* Generate img/backdrop-*.svg — the network the whole page scrolls down.

   One tall picture of a feed-forward network laid on its side: nine layers of
   neurons stacked top to bottom, each wired to the next by S-curves whose
   opacity is the connection's weight, a few residual links skipping a layer,
   and signals in flight on some of the wiring. The top row is wide and fine
   (the input), the bottom few and heavy (the output), so travelling down the
   page is travelling through the network.

   It is written as three files, one per colour role, each white on
   transparent because each is used as a MASK, never as an image:

     backdrop-wires.svg    the connections, residual links and dust   → data hue
     backdrop-neurons.svg  the units, their rings, out-of-focus discs → structure hue
     backdrop-signals.svg  signals in flight and the glow on hubs     → signal hue

   css/main.css paints each layer in the section's own colour for that role
   and lets the file's alpha decide where it shows, so one picture serves
   every skin and both themes and follows the palette's role assignments the
   same way the model does.

   Deterministic — the same seed always writes the same file, so the SVG in
   git is reproducible and a diff only shows a change you meant.

     node tools/make-backdrop.mjs
*/
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'img');

const W = 1600, H = 3600;

// mulberry32: small, seedable, good enough for a picture.
let seed = 0x41584f4e; // "AXON"
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const range = (a, b) => a + (b - a) * rand();
const f = (n) => Math.round(n * 10) / 10;

/* The copy and the model share the middle of the screen, so the picture
   thins there: full strength at the edges, about two thirds of it across the
   centre. A phone, which only sees the middle of the picture, still gets a
   network rather than an empty column. */
const edgeWeight = (x) => 0.66 + 0.34 * Math.min(1, Math.abs(x / W - 0.5) * 2.6);

/* ---- the layers ---------------------------------------------------------- */
const COUNTS = [17, 12, 13, 11, 13, 11, 12, 8, 5];
const top = 150, bottom = H - 150;
const rows = COUNTS.map((n, k) => {
  const y0 = top + (bottom - top) * (k / (COUNTS.length - 1));
  const phase = range(0, Math.PI * 2), amp = range(28, 58), waves = range(0.7, 1.3);
  const spread = k === COUNTS.length - 1 ? 0.62 : 1;           // the output gathers in
  const span = (W + 160) * spread, x0 = (W - span) / 2;
  const step = span / (n - 1);
  return Array.from({ length: n }, (_, i) => {
    const x = x0 + step * i + (i > 0 && i < n - 1 ? range(-0.24, 0.24) * step : 0);
    const y = y0 + amp * Math.sin((x / W) * Math.PI * 2 * waves + phase) + range(-22, 22);
    return { x, y, k, deg: 0 };
  });
});

/* ---- wiring between neighbouring layers ---------------------------------- */
const edges = [];
for (let k = 0; k < rows.length - 1; k++) {
  const A = rows[k], B = rows[k + 1];
  for (const a of A) {
    const near = B.map((b) => ({ b, d: Math.abs(a.x - b.x) })).sort((p, q) => p.d - q.d);
    near.forEach(({ b, d }, rank) => {
      const w = Math.exp(-((d / 330) ** 2));
      if (rank < 2 || (d < 620 && rand() < w * 0.8 + 0.03)) {
        const strong = rank < 3 && rand() < 0.08;
        edges.push({ a, b, w: strong ? 1 : 0.2 + 0.5 * w * rand(), strong });
        a.deg++; b.deg++;
      }
    });
  }
}

/* A few residual connections that skip a layer — the long, quiet curves. */
const skips = [];
for (let k = 0; k < rows.length - 2; k++) {
  for (let s = 0; s < 3; s++) {
    const a = rows[k][Math.floor(rand() * rows[k].length)];
    const C = rows[k + 2];
    const b = C.reduce((m, c) => (Math.abs(c.x - a.x) < Math.abs(m.x - a.x) ? c : m), C[0]);
    skips.push({ a, b });
  }
}

const curve = (a, b) => {
  const dy = b.y - a.y;
  return [a.x, a.y, a.x, a.y + dy * 0.4, b.x, b.y - dy * 0.4, b.x, b.y];
};
const at = (c, t) => {
  const u = 1 - t;
  const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
  return [k0 * c[0] + k1 * c[2] + k2 * c[4] + k3 * c[6], k0 * c[1] + k1 * c[3] + k2 * c[5] + k3 * c[7]];
};

/* ---- buckets ---------------------------------------------------------------
   Thousands of elements would make every tile of this slow to rasterise, so
   marks are merged into one <path> per (layer, kind, opacity) bucket instead. */
const LAYERS = ['wires', 'neurons', 'signals'];
const buckets = new Map();
const put = (layer, kind, alpha, d) => {
  const a = Math.max(0.04, Math.min(1, Math.round(alpha * 20) / 20));
  const key = layer + '|' + kind + '|' + a.toFixed(2);
  if (!buckets.has(key)) buckets.set(key, { layer, kind, a, d: [] });
  buckets.get(key).d.push(d);
};
/* Neurons are drawn a fifth larger than they were laid out, so a unit reads
   as a unit at the scale a laptop shows the picture. */
const R = 1.2;
const dot = (x, y, r) =>
  `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;

for (const e of edges) {
  const c = curve(e.a, e.b);
  const mid = (e.a.x + e.b.x) / 2;
  put('wires', e.strong ? 'wire-strong' : 'wire', e.w * edgeWeight(mid),
    `M${f(c[0])} ${f(c[1])}C${c.slice(2).map(f).join(' ')}`);
  // Signals in flight: a bead or two partway down some of the wires.
  if (rand() < 0.16) {
    const beads = 1 + Math.floor(rand() * 3), t0 = range(0.18, 0.62);
    for (let i = 0; i < beads; i++) {
      const [x, y] = at(c, t0 + i * 0.07);
      put('signals', 'fill', (1 - i * 0.2) * edgeWeight(x), dot(x, y, (2.6 - i * 0.5) * R));
    }
  }
}
for (const { a, b } of skips) {
  const c = curve(a, b);
  put('wires', 'skip', 0.45 * edgeWeight((a.x + b.x) / 2), `M${f(c[0])} ${f(c[1])}C${c.slice(2).map(f).join(' ')}`);
}

/* ---- neurons ------------------------------------------------------------ */
const halos = [];
rows.forEach((row, k) => {
  const last = k === rows.length - 1, first = k === 0;
  const hubs = new Set([...row].sort((p, q) => q.deg - p.deg).slice(0, last ? 2 : 1));
  for (const n of row) {
    const wt = edgeWeight(n.x);
    const r = last ? range(8.5, 10.5) : first ? range(3, 4.4) : range(4.6, 6.8);
    put('neurons', 'fill', wt, dot(n.x, n.y, r * R));
    if (last || hubs.has(n) || rand() < 0.42) put('neurons', 'ring', 0.6 * wt, dot(n.x, n.y, r * R + range(5, 8)));
    if (last || hubs.has(n)) {
      put('neurons', 'ring', 0.34 * wt, dot(n.x, n.y, r * R + range(15, 20)));
      halos.push({ layer: 'signals', x: n.x, y: n.y, r: range(70, 110), a: 0.5 * wt });
    }
  }
});

/* ---- depth: dust and a few out-of-focus discs ---------------------------- */
for (let i = 0; i < 300; i++) {
  const x = rand() * W, y = rand() * H;
  put('wires', 'fill', range(0.25, 0.6) * edgeWeight(x), dot(x, y, range(0.8, 1.7) * R));
}
const bokeh = Array.from({ length: 16 }, () => {
  const x = rand() * W;
  return { layer: 'neurons', x, y: rand() * H, r: range(40, 120), a: range(0.08, 0.16) * edgeWeight(x) };
});

/* ---- write --------------------------------------------------------------- */
const STROKE = { wire: 1.5, 'wire-strong': 2.6, skip: 1.3, ring: 1.6 };
const pathsOf = (layer) => [...buckets.values()]
  .filter((b) => b.layer === layer)
  .sort((p, q) => p.kind.localeCompare(q.kind) || p.a - q.a)
  .map(({ kind, a, d }) => kind === 'fill'
    ? `<path fill-opacity="${a}" d="${d.join('')}"/>`
    : `<path fill="none" stroke="#fff" stroke-width="${STROKE[kind]}" stroke-opacity="${a}"` +
      (kind === 'skip' ? ' stroke-dasharray="3 7" stroke-linecap="round"' : '') + ` d="${d.join('')}"/>`);
const discsOf = (layer) => [...halos, ...bokeh]
  .filter((d) => d.layer === layer)
  .map(({ x, y, r, a }) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#h)" opacity="${a.toFixed(2)}"/>`);

mkdirSync(outDir, { recursive: true });
for (const layer of LAYERS) {
  const discs = discsOf(layer), paths = pathsOf(layer);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Generated by tools/make-backdrop.mjs; edit that, not this. A mask (${layer}): white on transparent. -->
` + (discs.length ? `<defs><radialGradient id="h"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
${discs.join('\n')}
` : '') + `<g fill="#fff">
${paths.join('\n')}
</g>
</svg>
`;
  writeFileSync(resolve(outDir, `backdrop-${layer}.svg`), svg);
  console.log(`img/backdrop-${layer}.svg — ${(svg.length / 1024).toFixed(1)} KB, ${paths.length + discs.length} elements`);
}
console.log(`${edges.length} wires, ${rows.flat().length} neurons`);
