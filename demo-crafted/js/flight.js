/* ===========================================================================
   DEMO-CRAFTED — the flight
   ---------------------------------------------------------------------------
   One number, c, is where the camera is along the corridor. Everything reads
   off it:

   · the world is translated by c on z, so rooms come toward you;
   · each item's opacity is its fog: it condenses out of the distance,
     holds while it is near, and thins out just before it would pass through
     the lens;
   · the ground and every --g-* colour are the two nearest rooms' skins mixed
     in OKLab by how far across the seam between them the camera is;
   · the network canvas projects its nodes with the same focal length as the
     CSS perspective, so drawn nodes and DOM cards share one space.

   Input never moves c directly. Wheel, drag, keys and jumps move a target;
   c chases it with a time constant, so all input lands as one smooth glide.
   ========================================================================= */
(function () {
  'use strict';

  const root = document.documentElement;
  const vp = document.getElementById('viewport');
  const world = document.getElementById('world');
  const canvas = document.getElementById('net');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* data-d values are authored for a 900px focal length; k rescales them. */
  const U = 900;
  /* Packing: every authored depth and room length is multiplied by this, so
     one number sets how dense the corridor is. 0.8 = a quarter more per
     screen of travel than the depths were written for. */
  const PACK = 0.8;
  const TAU = 0.3;            // seconds for c to cover 63% of the way to target
  const WHEEL_GAIN = 1.7;
  const DRAG_GAIN = 2.6;

  /* Fog, as multiples of the focal length: [nearZero, nearFull]. */
  const NEAR = { title: [0.5, 1.05], badge: [0.3, 0.8], centre: [0.42, 0.92], it: [0.3, 0.62], itNarrow: [0.5, 0.86] };
  /* ...and how far out things condense: [full, zero]. Items are kept close so
     the far ones never pile up on the vanishing point behind the title you
     are reading; the network is let see further, so the corridor has depth. */
  const FAR_ITEM = [1.6, 2.25], FAR_NET = [2.6, 3.6];
  const NEAR_MODEL = [0.32, 0.72], FAR_MODEL = [2.0, 2.7];
  const NEAR_DECON = [0.36, 0.8], FAR_DECON = [1.8, 2.5];

  let W = 0, H = 0, f = U, k = 1, dpr = 1, portrait = false;
  const rooms = [], items = [], chains = new Map(), models = [], decons = [];
  let cMin = 0, cMax = 0;

  const cam = { c: 0, target: 0, v: 0, px: 0, py: 0, tx: 0, ty: 0 };
  let tween = null, locked = false, started = false, last = 0;
  const listeners = { frame: [], room: [] };
  let roomIndex = -1;

  /* ---------------------------------------------------------------- colour */
  const hex = (s) => {
    s = s.trim();
    if (s.startsWith('rgb')) return s.match(/[\d.]+/g).slice(0, 3).map((n) => +n / 255);
    s = s.replace('#', '');
    if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
    const n = parseInt(s, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const lin = (u) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
  const gam = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);
  function toOk(rgb) {
    const [r, g, b] = rgb.map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromOk([L, A, B]) {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
      .map((u) => Math.round(Math.min(1, Math.max(0, gam(u))) * 255));
  }
  const KEYS = { bg: '--bg', panel: '--panel', ink: '--ink', acc: '--accent', accInk: '--accent-ink',
                 onAcc: '--on-accent', con: '--c-second', data: '--c-third', sig: '--c-signal' };
  const GLOBAL = { bg: '--g-bg', panel: '--g-panel', ink: '--g-ink', acc: '--g-acc', accInk: '--g-acc-ink',
                   onAcc: '--g-on-acc', con: '--g-con', data: '--g-data', sig: '--g-sig' };
  let blended = {}, written = '';

  /* Each room's skin is read from its own computed style, so the CSS stays
     the one place colour is defined. Re-read whenever the theme changes. */
  function readSkins() {
    for (const r of rooms) {
      const cs = getComputedStyle(r.el);
      r.skin = {};
      for (const key in KEYS) r.skin[key] = toOk(hex(cs.getPropertyValue(KEYS[key]) || '#888'));
    }
    written = '';
  }

  function mixSkins(a, b, t) {
    const out = {};
    for (const key in KEYS) {
      const p = a.skin[key], q = b.skin[key];
      out[key] = fromOk([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]);
    }
    return out;
  }

  /* The seam into room i runs from 1.6f to 0.7f before its title, so the
     ground has changed by the time the title is legible. */
  function paintGround() {
    let i = 0;
    for (let j = 1; j < rooms.length; j++) if (cam.c > rooms[j].start - 1.6 * f) i = j;
    let t = 0;
    if (i > 0) t = smooth((cam.c - (rooms[i].start - 1.6 * f)) / (0.9 * f));
    blended = i > 0 && t < 1 ? mixSkins(rooms[i - 1], rooms[i], t) : mixSkins(rooms[i], rooms[i], 0);
    const css = Object.keys(GLOBAL).map((key) => `${GLOBAL[key]}:rgb(${blended[key].join(' ')})`).join(';');
    if (css !== written) {
      written = css;
      for (const key in GLOBAL) root.style.setProperty(GLOBAL[key], `rgb(${blended[key].join(' ')})`);
    }
  }

  /* ---------------------------------------------------------------- helpers */
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function fog(D, near, far = FAR_ITEM) {
    if (D <= near[0] * f || D >= far[1] * f) return 0;
    const a = clamp((far[1] * f - D) / ((far[1] - far[0]) * f), 0, 1);
    const b = clamp((D - near[0] * f) / ((near[1] - near[0]) * f), 0, 1);
    return smooth(a) * smooth(b);
  }

  /* ---------------------------------------------------------------- layout */
  function collect() {
    document.querySelectorAll('.room').forEach((el, i) => {
      const room = { el, i, id: el.id, name: el.dataset.name, len: (+el.dataset.len || 2800) * PACK, start: 0, skin: null };
      rooms.push(room);
      el.querySelectorAll(':scope > .it').forEach((it) => {
        const centred = !+it.dataset.x;
        const kind = it.classList.contains('title') ? 'title' : it.classList.contains('badge') ? 'badge' : centred ? 'centre' : 'it';
        const item = { el: it, room, d: (+it.dataset.d || 0) * PACK, chip: it.classList.contains('chip'), x: +it.dataset.x || 0, y: +it.dataset.y || 0,
                       kind, near: NEAR[kind], X: 0, Y: 0, Z: 0, op: -1, off: null,
                       /* Who yields: chips to everything, the intro badge is a
                          backdrop that never takes part. */
                       yields: it.classList.contains('chip') ? 2 : kind === 'badge' ? 0 : 1,
                       cap: kind === 'badge' && !it.classList.contains('end') ? 0.28 : 1,
                       w: 0, h: 0, dim: 1 };
        items.push(item);
        it._flight = item;
        const ch = it.dataset.chain;
        if (ch) { if (!chains.has(ch)) chains.set(ch, []); chains.get(ch).push(item); }
      });
    });
    for (const list of chains.values()) list.sort((a, b) => a.d - b.d);
    rooms.forEach((room) => room.el.querySelectorAll(':scope > .model').forEach((el, n) => {
      const shape = SHAPES[el.dataset.shape] ? el.dataset.shape : 'core';
      models.push({ room, shape, geo: SHAPES[shape](), label: el.dataset.label || shape.toUpperCase(),
                    d: (+el.dataset.d || 0) * PACK, x: +el.dataset.x || 0, y: +el.dataset.y || 0,
                    phase: room.i * 1.7 + n * 2.3, spin: n % 2 ? -1 : 1, X: 0, Y: 0, Z: 0, R: 0 });
    }));
    rooms.forEach((room) => room.el.querySelectorAll(':scope > .decon').forEach((el) => {
      const shape = DECON[el.dataset.shape] ? el.dataset.shape : 'transformer';
      decons.push({ room, shape, parts: DECON[shape](), d: (+el.dataset.d || 0) * PACK,
                    x: +el.dataset.x || 0, y: +el.dataset.y || 0, phase: room.i * 0.9, X: 0, Y: 0, Z: 0, R: 0 });
    }));
  }

  function layout() {
    W = innerWidth; H = innerHeight;
    portrait = W / H < 0.8;
    f = Math.round(clamp(Math.max(H, W * 0.62), 640, 1300));
    k = f / U;
    vp.style.perspective = f + 'px';
    let s = 0;
    for (const r of rooms) { r.start = s; s += r.len * k; }
    const hw = W / 2, hh = H / 2;
    for (const it of items) {
      if (portrait && it.chip) {
        /* Chips keep to the top and bottom bands on a tall screen. */
        it.X = it.x * 0.36 * hw;
        it.Y = (it.y >= 0 ? 0.42 : -0.42) * hh;
      } else if (portrait) {
        const side = it.x === 0 ? 0 : it.x > 0 ? 1 : -1;
        it.X = it.x * 0.2 * hw;
        it.Y = (it.y * 0.32 + side * (it.y >= 0 ? 0.3 : -0.3)) * hh;
      } else {
        it.X = it.x * hw; it.Y = it.y * hh;
      }
      it.Z = it.room.start + it.d * k;
      /* On a portrait screen a card is most of the width, so it has to thin
         out while it is still well in front of the lens. */
      it.near = portrait && it.kind === 'it' ? NEAR.itNarrow : NEAR[it.kind];
      it.w = it.el.offsetWidth; it.h = it.el.offsetHeight;
      it.el.style.transform = `translate3d(${it.X.toFixed(1)}px,${it.Y.toFixed(1)}px,${(-it.Z).toFixed(1)}px) translate(-50%,-50%)`;
    }
    for (const m of models) {
      m.R = 0.17 * Math.min(W * 1.3, H);
      m.X = portrait ? m.x * 0.25 * hw : m.x * hw;
      m.Y = portrait ? (m.x < 0 ? -0.36 : 0.36) * hh : m.y * hh;
      m.Z = m.room.start + m.d * k;
    }
    for (const m of decons) {
      m.R = portrait ? 0.3 * Math.min(W, H * 0.55) : 0.24 * Math.min(W * 1.2, H);
      m.X = portrait ? 0 : m.x * hw;
      m.Y = portrait ? -0.12 * hh : m.y * hh;
      m.Z = m.room.start + m.d * k;
    }
    const lastRoom = rooms[rooms.length - 1];
    const finale = items.filter((it) => it.room === lastRoom && it.el.classList.contains('finale'))[0];
    cMin = -0.45 * f;
    cMax = finale ? finale.Z - 0.22 * f : s;
    cam.target = clamp(cam.target, cMin, cMax);
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    buildNet();
  }

  /* ---------------------------------------------------------------- network
     A seeded field of nodes lining the corridor walls, a ring of nodes as a
     portal at the start of every room, and pulses that run along the links.
     Positions are stored as fractions of the half-screen and units of depth,
     so a resize rescales rather than regenerates. */
  const net = { nodes: [], edges: [], pulses: [] };
  let netSeed = null;
  function seedNet() {
    let seed = 2018;
    const rnd = () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const total = rooms.reduce((a, r) => a + r.len, 0);
    const nodes = [], edges = [];
    for (let z = -700; z < total + 900; z += 36 + rnd() * 50) {
      const a = rnd() * Math.PI * 2, r = 0.62 + rnd() * 0.75;
      nodes.push({ fx: Math.cos(a) * r, fy: Math.sin(a) * r * 0.9, u: z, hue: Math.floor(rnd() * 4), s: 0.7 + rnd() * 0.9 });
    }
    for (let i = 0; i < nodes.length; i++) {
      const cand = [];
      for (let j = i + 1; j < Math.min(nodes.length, i + 16); j++) {
        const p = nodes[i], q = nodes[j];
        cand.push([j, (p.fx - q.fx) ** 2 + (p.fy - q.fy) ** 2 + ((p.u - q.u) / 700) ** 2]);
      }
      cand.sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j]) => edges.push([i, j, nodes[i].hue]));
    }
    /* Portals: one ring per room, just ahead of its title. */
    let u = 0;
    rooms.forEach((r, ri) => {
      if (ri > 0) {
        const n0 = nodes.length, n = 22;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          nodes.push({ fx: Math.cos(a) * 0.98, fy: Math.sin(a) * 0.92, u: u - 140, hue: 0, s: 1.3, ring: true });
          edges.push([n0 + i, n0 + ((i + 1) % n), 0, true]);
        }
      }
      u += r.len;
    });
    netSeed = { nodes, edges };
    net.pulses = Array.from({ length: 46 }, () => ({ e: Math.floor(rnd() * edges.length), t: rnd(), v: 0.25 + rnd() * 0.5 }));
  }
  function buildNet() {
    if (!netSeed) seedNet();
    const hw = W / 2, hh = H / 2;
    net.nodes = netSeed.nodes.map((n) => ({ ...n, X: n.fx * hw * (portrait ? 1.1 : 1), Y: n.fy * hh, Z: n.u * k }));
    net.edges = netSeed.edges;
  }


  /* ---------------------------------------------------------------- models
     Wireframe models stand either side of every room's title: one shape
     per room, in the room's hues, turning slowly with time and with travel.
     Unit-radius geometry; projected with the same focal length as the
     cards, so they sit in the corridor rather than on top of it. */
  function nearestEdges(p, n, out, seen) {
    for (let i = 0; i < p.length; i++) {
      const d = [];
      for (let j = 0; j < p.length; j++) if (j !== i) d.push([j, (p[i][0] - p[j][0]) ** 2 + (p[i][1] - p[j][1]) ** 2 + (p[i][2] - p[j][2]) ** 2]);
      d.sort((a, b) => a[1] - b[1]).slice(0, n).forEach(([j]) => {
        const key = i < j ? i + '-' + j : j + '-' + i;
        if (!seen.has(key)) { seen.add(key); out.push([i, j]); }
      });
    }
    return out;
  }
  const SHAPES = {
    /* A dense core: a Fibonacci sphere wired to its neighbours. */
    core() {
      const p = [], n = 48;
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        p.push([Math.cos(a) * r * 0.9, y * 0.9, Math.sin(a) * r * 0.9, i % 4]);
      }
      return { p, e: nearestEdges(p, 3, [], new Set()) };
    },
    /* A transformer stack: five layer rings, each wired to the next. */
    stack() {
      const p = [], e = [], L = 5, n = 10;
      for (let l = 0; l < L; l++) for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + l * 0.3;
        p.push([Math.cos(a) * 0.72, -0.9 + (l * 1.8) / (L - 1), Math.sin(a) * 0.72, l % 4]);
        e.push([l * n + i, l * n + ((i + 1) % n)]);
        if (l) { e.push([l * n + i, (l - 1) * n + i]); e.push([l * n + i, (l - 1) * n + ((i + 1) % n)]); }
      }
      return { p, e };
    },
    /* A double helix with rungs: the four weeks as a strand. */
    helix() {
      const p = [], e = [], n = 22;
      for (let s = 0; s < 2; s++) for (let i = 0; i < n; i++) {
        const t = i / (n - 1), a = t * Math.PI * 4 + s * Math.PI;
        p.push([Math.cos(a) * 0.5, -1 + 2 * t, Math.sin(a) * 0.5, s ? 2 : 1]);
        if (i) e.push([s * n + i, s * n + i - 1]);
        if (s && i % 2 === 0) e.push([i, n + i]);
      }
      return { p, e };
    },
    /* A 4x4x4 lattice: the fleet as a grid of units. */
    lattice() {
      const p = [], e = [], n = 4, at = (x, y, z) => x * n * n + y * n + z;
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
        p.push([-0.75 + x * 0.5, -0.75 + y * 0.5, -0.75 + z * 0.5, (x + y + z) % 4]);
        if (x) e.push([at(x, y, z), at(x - 1, y, z)]);
        if (y) e.push([at(x, y, z), at(x, y - 1, z)]);
        if (z) e.push([at(x, y, z), at(x, y, z - 1)]);
      }
      return { p, e };
    },
    /* Orbits: four tilted rings around one hub, a node per person. */
    orbit() {
      const p = [[0, 0, 0, 0]], e = [], n = 9;
      for (let r = 0; r < 4; r++) {
        const tilt = (r / 4) * Math.PI, base = p.length;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, x = Math.cos(a) * 0.85, z = Math.sin(a) * 0.85;
          p.push([x, z * Math.sin(tilt) * 0.6, z * Math.cos(tilt), (r % 3) + 1]);
          e.push([base + i, base + ((i + 1) % n)]);
          if (i % 3 === 0) e.push([0, base + i]);
        }
      }
      return { p, e };
    },
    /* A globe of latitude rings and meridians: who we build with. */
    globe() {
      const p = [], e = [], lats = [-60, -30, 0, 30, 60], n = 14;
      lats.forEach((lat, li) => {
        const y = Math.sin((lat * Math.PI) / 180), r = Math.cos((lat * Math.PI) / 180);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          p.push([Math.cos(a) * r * 0.9, y * 0.9, Math.sin(a) * r * 0.9, li % 4]);
          e.push([li * n + i, li * n + ((i + 1) % n)]);
          if (li) e.push([li * n + i, (li - 1) * n + i]);
        }
      });
      return { p, e };
    },
    /* A feed-forward net, 4-6-6-3, turned in space. */
    fan() {
      const p = [], e = [], sizes = [4, 6, 6, 3];
      let prev = [];
      sizes.forEach((m, l) => {
        const cur = [];
        for (let i = 0; i < m; i++) { cur.push(p.length); p.push([-0.9 + l * 0.6, (i - (m - 1) / 2) * 0.32, 0, l]); }
        prev.forEach((a) => cur.forEach((b) => e.push([a, b])));
        prev = cur;
      });
      return { p, e };
    },
    /* A torus: the loop from measured to shipped and back. */
    torus() {
      const p = [], e = [], U2 = 16, V = 6;
      for (let u = 0; u < U2; u++) for (let v = 0; v < V; v++) {
        const a = (u / U2) * Math.PI * 2, b = (v / V) * Math.PI * 2, r = 0.62 + Math.cos(b) * 0.26;
        p.push([Math.cos(a) * r, Math.sin(b) * 0.26, Math.sin(a) * r, v % 4]);
        e.push([u * V + v, u * V + ((v + 1) % V)]);
        e.push([u * V + v, ((u + 1) % U2) * V + v]);
      }
      return { p, e };
    },
  };

  function drawModels(time) {
    const hues = [blended.acc, blended.con, blended.data, blended.sig], ink = blended.ink;
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (const m of models) {
      const D0 = f + m.Z - cam.c;
      const a = fog(D0, NEAR_MODEL, FAR_MODEL);
      if (a < 0.01) continue;
      const yaw = (reduce.matches ? 0 : time * 0.00022 * m.spin) + cam.c * 0.0007 + m.phase;
      const pitch = 0.42 + (reduce.matches ? 0 : 0.1 * Math.sin(time * 0.0004 + m.phase));
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const pts = m.geo.p, sc = new Array(pts.length);
      for (let i = 0; i < pts.length; i++) {
        const [x, y, z] = pts[i];
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const q = project(m.X + x1 * m.R, m.Y + y2 * m.R, m.Z + z2 * m.R);
        sc[i] = q ? [q[0], q[1], q[2], z2] : null;
      }
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(a * 0.34).toFixed(3)})`;
      ctx.beginPath();
      for (const [i, j] of m.geo.e) {
        const p = sc[i], q = sc[j];
        if (p && q) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      }
      ctx.stroke();
      for (let i = 0; i < pts.length; i++) {
        const p = sc[i]; if (!p) continue;
        const c = hues[pts[i][3]], fire = reduce.matches ? 0 : Math.max(0, Math.sin(time * 0.003 + i * 1.3 + m.phase)) ** 8;
        const depth = 0.45 + 0.55 * (1 - p[3]) / 2;
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(a * Math.min(1, depth + fire)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.min(9, (2.1 + fire * 2.2) * p[2]), 0, Math.PI * 2); ctx.fill();
      }
      /* A spec callout: corner brackets round the model and its label. */
      const c0 = project(m.X, m.Y, m.Z);
      if (!c0) continue;
      const cx = c0[0], cyy = c0[1], h = m.R * c0[2] * 1.18, t = Math.min(14, h * 0.18);
      ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(a * 0.4).toFixed(3)})`;
      ctx.beginPath();
      for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(cx + sx2 * h, cyy + sy2 * (h - t)); ctx.lineTo(cx + sx2 * h, cyy + sy2 * h); ctx.lineTo(cx + sx2 * (h - t), cyy + sy2 * h);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(a * 0.72).toFixed(3)})`;
      ctx.fillText(m.label, cx, cyy + h + 16);
    }
  }

  /* ---------------------------------------------------------------- decons
     Deconstructed models: an exploded drawing that is a stop of its own.
     Each is a set of PARTS, each part a cluster of units with a direction
     it moves out along. On approach the parts arrive scattered and gather;
     while you rest, the model assembles and comes apart on a slow loop, the
     links between parts showing only when it is whole, and each part is
     labelled while it stands apart. */
  const DECON = {
    /* Services: one transformer block, a lever on each layer. */
    transformer() {
      const names = ['HEAD · ROUTER', 'MLP · INT4', 'ATTENTION · PAGED KV', 'NORM · FP8', 'EMBED · PREFIX CACHE'];
      const n = 12;
      return names.map((label, l) => {
        const p = [[0, -0.6 + l * 0.3, 0, l % 4]], e = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          p.push([Math.cos(a) * 0.82, -0.6 + l * 0.3, Math.sin(a) * 0.82, l % 4]);
          e.push([1 + i, 1 + ((i + 1) % n)]);
          if (i % 3 === 0) e.push([0, 1 + i]);
        }
        return { p, e, dir: [0, (l - 2) * 0.34, 0], spin: l % 2 ? 1 : -1, label, link: l < 4 ? 'ring' : null };
      });
    },
    /* Method: one strand, cut into its four weeks. */
    helix() {
      const names = ['WK 1 · MEASURE', 'WK 2 · MODEL', 'WK 3 · REBUILD', 'WK 4 · PROVE'];
      return names.map((label, q) => {
        const p = [], e = [], m = 9;
        for (let s2 = 0; s2 < 2; s2++) for (let i = 0; i < m; i++) {
          const t = (q + i / (m - 1)) / 4, a = t * Math.PI * 4 + s2 * Math.PI;
          p.push([Math.cos(a) * 0.5, -0.78 + 1.56 * t, Math.sin(a) * 0.5, s2 ? 2 : q % 2 ? 3 : 0]);
          if (i) e.push([s2 * m + i, s2 * m + i - 1]);
          if (s2 && i % 2 === 0) e.push([i, m + i]);
        }
        return { p, e, dir: [q % 2 ? 0.22 : -0.22, (q - 1.5) * 0.3, 0], spin: q % 2 ? 1 : -1, label, link: q < 3 ? 'strand' : null };
      });
    },
    /* Work: 42 GPUs; twelve stay, thirty go back to the pool. */
    fleet() {
      const kept = { p: [], e: [], dir: [-0.12, 0, 0], spin: 0, label: '12 KEPT · PREEMPTIBLE BATCH', square: true };
      const gone = { p: [], e: [], pdirs: [], dir: [0, 0, 0], spin: 0, label: '30 RELEASED TO THE POOL', square: true, fade: true };
      const idx = new Map();
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 2; l++) {
        const pt = [(i - 3) * 0.26, (j - 1) * 0.26, (l - 0.5) * 0.26];
        const keep = i < 4 && l < 1;
        const part = keep ? kept : gone;
        idx.set(i + ',' + j + ',' + l, [part, part.p.length]);
        part.p.push([...pt, keep ? 0 : 2]);
        if (!keep) {
          const dx = pt[0] + 0.5, len = Math.hypot(dx, pt[1], pt[2] + 0.2) || 1;
          gone.pdirs.push([(dx / len) * 0.75, (pt[1] / len) * 0.55, ((pt[2] + 0.2) / len) * 0.5]);
        }
      }
      for (const [key, [part, a]] of idx) {
        const [i, j, l] = key.split(',').map(Number);
        for (const nb of [[i + 1, j, l], [i, j + 1, l], [i, j, l + 1]]) {
          const o = idx.get(nb.join(','));
          if (o && o[0] === part) part.e.push([a, o[1]]);
        }
      }
      return [kept, gone];
    },
    /* Partners: one globe, split into the four kinds of partner. */
    globe() {
      const names = ['MODEL LABS', 'RUNTIMES', 'ACCELERATORS', 'PLATFORMS'];
      const lats = [-60, -30, 0, 30, 60], per = 4;
      return names.map((label, q) => {
        const p = [], e = [];
        lats.forEach((lat, li) => {
          const y = Math.sin((lat * Math.PI) / 180), r = Math.cos((lat * Math.PI) / 180);
          for (let i = 0; i <= per; i++) {
            const a = ((q * per + i) / (4 * per)) * Math.PI * 2;
            p.push([Math.cos(a) * r * 0.9, y * 0.9, Math.sin(a) * r * 0.9, q]);
            const at = li * (per + 1) + i;
            if (i) e.push([at, at - 1]);
            if (li) e.push([at, at - (per + 1)]);
          }
        });
        const mid = ((q + 0.5) / 4) * Math.PI * 2;
        return { p, e, dir: [Math.cos(mid) * 0.45, 0, Math.sin(mid) * 0.45], spin: 0, label };
      });
    },
  };

  function drawDecons(time) {
    const hues = [blended.acc, blended.con, blended.data, blended.sig], ink = blended.ink;
    for (const m of decons) {
      const D0 = f + m.Z - cam.c;
      const a = fog(D0, NEAR_DECON, FAR_DECON);
      if (a < 0.01) continue;
      const near = smooth((2.3 * f - D0) / (1.2 * f));
      const cyc = reduce.matches ? 1 : 0.5 - 0.5 * Math.cos(time * 0.0011 + m.phase);
      const e = (1 - near) * 2.4 + near * (0.1 + 0.9 * cyc);
      const yaw = (reduce.matches ? 0.6 : time * 0.00016) + cam.c * 0.0004 + m.phase;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(0.34), sp = Math.sin(0.34);
      const centre = project(m.X, m.Y, m.Z);
      if (!centre) continue;
      const mcx = centre[0], s0 = centre[2];
      const screen = m.parts.map((part) => {
        const ps = part.spin * e * 0.7, cs = Math.cos(ps), ss = Math.sin(ps);
        return part.p.map((pt, i) => {
          let x = pt[0] * cs + pt[2] * ss, z = -pt[0] * ss + pt[2] * cs, y = pt[1];
          x += part.dir[0] * e; y += part.dir[1] * e; z += part.dir[2] * e;
          if (part.pdirs) { x += part.pdirs[i][0] * e; y += part.pdirs[i][1] * e; z += part.pdirs[i][2] * e; }
          const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
          const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
          const q = project(m.X + x1 * m.R, m.Y + y2 * m.R, m.Z + z2 * m.R);
          return q ? [q[0], q[1], q[2], z2] : null;
        });
      });
      /* Links between parts: only while the model is (nearly) whole. */
      const whole = clamp(1 - e / 0.45, 0, 1);
      if (whole > 0.02) {
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(a * whole * 0.45).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const join = (A, B) => { if (A && B) { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); } };
        m.parts.forEach((part, pi) => {
          const here = screen[pi], next = screen[pi + 1];
          if (!part.link || !next) return;
          if (part.link === 'ring') {
            /* Layer to layer: every other ring unit to the one above. */
            for (let i = 1; i < here.length; i += 2) join(here[i], next[i]);
          } else {
            /* Strand to strand: each strand's end to the next segment's start. */
            const m2 = here.length / 2;
            join(here[m2 - 1], next[0]);
            join(here[2 * m2 - 1], next[m2]);
          }
        });
        ctx.stroke();
      }
      m.parts.forEach((part, pi) => {
        const pts = screen[pi];
        const pa = a * (part.fade ? 1 - 0.7 * clamp(e - 0.15, 0, 1) : 1);
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(pa * 0.42).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [i, j] of part.e) { const A = pts[i], B = pts[j]; if (A && B) { ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); } }
        ctx.stroke();
        let minX = Infinity, sx = 0, syy = 0, n = 0;
        pts.forEach((q, i) => {
          if (!q) return;
          const c = hues[part.p[i][3]], depth = 0.5 + 0.5 * (1 - q[3]) / 2;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(pa * depth).toFixed(3)})`;
          const r = Math.min(10, 2.6 * q[2]);
          if (part.square) ctx.fillRect(q[0] - r * 1.5, q[1] - r, r * 3, r * 2);
          else { ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); }
          minX = Math.min(minX, q[0]); sx += q[0]; syy += q[1]; n++;
        });
        /* Part labels with leader lines, out to the left, while apart. */
        const la = a * near * clamp((e - 0.3) / 0.35, 0, 1);
        if (portrait || !n || la < 0.02) return;
        const ly = syy / n, lx = mcx - m.R * s0 * 1.55;
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(la * 0.5).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(lx + 8, ly); ctx.lineTo(minX - 8, ly); ctx.stroke();
        ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${(la * 0.85).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(minX - 8, ly, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(part.label, lx, ly + 4);
      });
    }
  }

  const P = new Float32Array(6);   // scratch for projection
  function project(X, Y, Z) {
    const D = f + Z - cam.c;
    if (D < 20) return null;
    const s = f / D;
    P[0] = W / 2 + (X + cam.tx) * s; P[1] = H / 2 + (Y + cam.ty) * s; P[2] = s; P[3] = D;
    return P;
  }

  function drawNet(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const hues = [blended.acc, blended.con, blended.data, blended.sig];
    const ink = blended.ink;
    const near = [0.05, 0.25];
    const proj = new Array(net.nodes.length);
    for (let i = 0; i < net.nodes.length; i++) {
      const n = net.nodes[i];
      const p = project(n.X, n.Y, n.Z);
      if (!p) { proj[i] = null; continue; }
      const a = fog(p[3], near, FAR_NET);
      proj[i] = a > 0.01 ? [p[0], p[1], p[2], a] : null;
    }
    /* Links */
    ctx.lineCap = 'round';
    for (const [i, j, h, ring] of net.edges) {
      const p = proj[i], q = proj[j];
      if (!p || !q) continue;
      const a = Math.min(p[3], q[3]) * (ring ? 0.55 : 0.32);
      const c = ring ? hues[0] : ink;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
      ctx.lineWidth = Math.min(3, (ring ? 1.4 : 0.9) * Math.sqrt(p[2]));
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    /* Chains between related items: services into the half, the four
       weeks in order, each project out to its figures. */
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -time * 0.03;
    for (const list of chains.values()) {
      for (let n = 0; n < list.length - 1; n++) {
        const A = list[n], B = list[n + 1];
        if (A.op <= 0.02 && B.op <= 0.02) continue;
        const p = project(A.X, A.Y, A.Z); if (!p) continue;
        const p0 = [p[0], p[1], p[2]];
        const q = project(B.X, B.Y, B.Z); if (!q) continue;
        const a = Math.max(0, Math.min(A.op, B.op, 1)) * 0.8;
        if (a < 0.02) continue;
        ctx.strokeStyle = `rgba(${hues[0][0]},${hues[0][1]},${hues[0][2]},${a})`;
        ctx.lineWidth = Math.min(3, 1.4 * Math.sqrt(p0[2]));
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    /* Nodes */
    for (let i = 0; i < net.nodes.length; i++) {
      const p = proj[i]; if (!p) continue;
      const n = net.nodes[i], c = hues[n.hue];
      const r = Math.min(14, (n.ring ? 2.6 : 1.9) * n.s * p[2]);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${p[3] * 0.9})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
    }
    /* Pulses */
    const sig = hues[3];
    for (const pu of net.pulses) {
      const e = net.edges[pu.e];
      const p = proj[e[0]], q = proj[e[1]];
      if (!p || !q) continue;
      const x = p[0] + (q[0] - p[0]) * pu.t, y = p[1] + (q[1] - p[1]) * pu.t;
      const a = Math.min(p[3], q[3]);
      ctx.fillStyle = `rgba(${sig[0]},${sig[1]},${sig[2]},${a})`;
      ctx.beginPath(); ctx.arc(x, y, Math.min(8, 2.6 * Math.max(p[2], q[2])), 0, Math.PI * 2); ctx.fill();
    }
  }

  function stepPulses(dt) {
    if (reduce.matches) return;
    for (const pu of net.pulses) {
      pu.t += pu.v * dt;
      if (pu.t >= 1) {
        const end = net.edges[pu.e][1];
        const next = [];
        for (let i = 0; i < net.edges.length && next.length < 3; i++) if (net.edges[i][0] === end) next.push(i);
        pu.e = next.length ? next[Math.floor(Math.random() * next.length)] : Math.floor(Math.random() * net.edges.length);
        pu.t = 0;
      }
    }
  }

  /* ---------------------------------------------------------------- frame */
  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;

    if (tween) {
      const t = clamp((now - tween.t0) / tween.dur, 0, 1);
      cam.target = tween.from + (tween.to - tween.from) * ease(t);
      if (t >= 1) tween = null;
    }
    if (!dragging && Math.abs(cam.v) > 0.05) {
      cam.target += cam.v;
      cam.v *= Math.pow(0.9, dt * 60);
    }
    cam.target = clamp(cam.target, cMin, cMax);
    const tau = reduce.matches ? 0.08 : tween ? 0.12 : TAU;
    cam.c += (cam.target - cam.c) * (1 - Math.exp(-dt / tau));
    if (Math.abs(cam.target - cam.c) < 0.05) cam.c = cam.target;

    /* Parallax: the world shifts against the pointer, so nearer things
       move further than distant ones. */
    const pk = reduce.matches || locked ? 0 : 1;
    const lx = 1 - Math.exp(-dt / 0.5);
    cam.tx += (-cam.px * 46 * pk - cam.tx) * lx;
    cam.ty += (-cam.py * 30 * pk - cam.ty) * lx;
    world.style.transform = `translate3d(${cam.tx.toFixed(2)}px,${cam.ty.toFixed(2)}px,${cam.c.toFixed(2)}px)`;

    /* Fog first, then the front item wins: anything that overlaps a nearer,
       already legible item on screen fades back until that one has passed,
       so every card gets a clean moment instead of reading through another. */
    const shown = [];
    for (const it of items) {
      const D = f + it.Z - cam.c;
      it.fogged = fog(D, it.near) * it.cap;
      if (it.fogged > 0.01 && it.yields) {
        const sc = f / D;
        const cx = W / 2 + (it.X + cam.tx) * sc, cy = H / 2 + (it.Y + cam.ty) * sc;
        it.box = [cx - (it.w * sc) / 2, cy - (it.h * sc) / 2, cx + (it.w * sc) / 2, cy + (it.h * sc) / 2];
        it.D = D;
        shown.push(it);
      }
    }
    shown.sort((a, b) => a.D - b.D);
    const kd = 1 - Math.exp(-dt / 0.12);
    for (let i = 0; i < shown.length; i++) {
      const it = shown[i], A = it.box;
      let target = 1;
      for (let j = 0; j < shown.length && target > 0.1; j++) {
        const o = shown[j];
        if (o === it || o.fogged < 0.5) continue;
        /* Nearer things win; a chip loses to any card whatever its depth. */
        if (!(j < i || (it.yields === 2 && o.yields === 1))) continue;
        if (it.yields === 1 && o.yields === 2) continue;
        const B = o.box;
        const ix = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), iy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ix <= 0 || iy <= 0) continue;
        const small = Math.min((A[2] - A[0]) * (A[3] - A[1]), (B[2] - B[0]) * (B[3] - B[1]));
        if ((ix * iy) / small > 0.05) target = 0.08;
      }
      it.dim += (target - it.dim) * kd;
    }
    for (const it of items) {
      if (!it.yields || it.fogged <= 0.01) it.dim = 1;
      const o = it.fogged * it.dim;
      if (Math.abs(o - it.op) > 0.004 || (o === 0) !== (it.op === 0)) {
        it.op = o;
        it.el.style.opacity = o.toFixed(3);
        it.el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
        const off = o < 0.4;
        if (off !== it.off) { it.off = off; it.el.classList.toggle('off', off); }
      }
    }

    paintGround();
    stepPulses(dt);
    drawNet(now);
    drawModels(now);
    drawDecons(now);

    let ri = 0;
    for (let j = 0; j < rooms.length; j++) if (cam.c >= rooms[j].start - 1.15 * f) ri = j;
    if (ri !== roomIndex) { roomIndex = ri; listeners.room.forEach((fn) => fn(ri, rooms[ri])); }
    const state = { c: cam.c, f, progress: clamp((cam.c - cMin) / (cMax - cMin), 0, 1), room: ri };
    listeners.frame.forEach((fn) => fn(state));

    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- input */
  function nudge(dist) {
    if (locked || !started) return;
    tween = null;
    cam.target = clamp(cam.target + dist, cMin, cMax);
  }

  addEventListener('wheel', (e) => {
    if (!started) return;
    if (e.target.closest && e.target.closest('.sheet-body, .menu')) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 33; else if (e.deltaMode === 2) d *= H;
    cam.v = 0;
    nudge(clamp(d, -320, 320) * WHEEL_GAIN * k);
  }, { passive: false });

  let dragging = false, moved = false, lastY = 0, lastT = 0, vel = 0, pid = null;
  vp.addEventListener('pointerdown', (e) => {
    if (locked || !started || e.button > 0) return;
    dragging = true; moved = false; lastY = e.clientY; lastT = performance.now(); vel = 0; pid = e.pointerId;
    cam.v = 0; tween = null;
  });
  addEventListener('pointermove', (e) => {
    cam.px = (e.clientX / W) * 2 - 1;
    cam.py = (e.clientY / H) * 2 - 1;
    if (!dragging || e.pointerId !== pid) return;
    const dy = e.clientY - lastY;
    if (!moved && Math.abs(dy) > 6) {
      moved = true;
      try { vp.setPointerCapture(pid); } catch (_) { /* capture is optional */ }
      root.classList.add('dragging');
    }
    if (!moved) return;
    const now = performance.now();
    const step = -dy * DRAG_GAIN * k;
    cam.target = clamp(cam.target + step, cMin, cMax);
    vel = 0.7 * vel + 0.3 * (step / Math.max(1, now - lastT)) * 16;
    lastY = e.clientY; lastT = now;
  });
  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pid)) return;
    dragging = false;
    if (moved) cam.v = clamp(vel, -120 * k, 120 * k);
    root.classList.remove('dragging');
    setTimeout(() => { moved = false; }, 0);
  }
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  /* A drag that started on a card must not also open it. */
  addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);

  addEventListener('keydown', (e) => {
    if (locked || !started || e.defaultPrevented) return;
    const tag = (e.target.tagName || '').toLowerCase();
    const onControl = tag === 'button' || tag === 'a' || tag === 'input' || e.target.getAttribute('role') === 'button' || e.target.hasAttribute('data-open');
    const step = 0.85 * f;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !onControl && !e.shiftKey)) { e.preventDefault(); API.glide(cam.target + step, 420); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && !onControl && e.shiftKey)) { e.preventDefault(); API.glide(cam.target - step, 420); }
    else if (e.key === 'Home') { e.preventDefault(); API.goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); API.glide(cMax); }
  });

  /* Tabbing to something in the corridor flies the camera to it. */
  document.addEventListener('focusin', (e) => {
    if (!started || locked) return;
    const el = e.target.closest && e.target.closest('.it');
    if (!el || !el._flight) return;
    const it = el._flight;
    const D = f + it.Z - cam.target;
    if (D < 0.9 * f || D > 1.9 * f) API.glide(it.Z - (it.kind === 'title' ? 0.3 : 0.28) * f, 700);
  });

  addEventListener('resize', () => { layout(); });

  /* ---------------------------------------------------------------- API */
  const API = {
    init() {
      collect();
      readSkins();
      layout();
      cam.c = cam.target = cMin - 1.4 * f;
      paintGround();
      requestAnimationFrame(frame);
    },
    /* Arrive: fly in from behind the start. */
    start(roomId) {
      started = true;
      const idx = Math.max(0, rooms.findIndex((r) => r.id === roomId));
      API.glide(idx > 0 ? rooms[idx].start - 0.3 * f : cMin + 0.1 * f, idx > 0 ? undefined : 1500);
    },
    glide(to, dur) {
      to = clamp(to, cMin, cMax);
      const dist = Math.abs(to - cam.c);
      tween = { from: cam.c, to, t0: performance.now(), dur: dur || clamp(700 + dist / (6 * k), 700, 2600) };
      cam.v = 0;
    },
    goTo(ref) {
      const r = typeof ref === 'number' ? rooms[ref] : rooms.find((x) => x.id === ref);
      if (r) API.glide(r.i === 0 ? cMin + 0.1 * f : r.start - 0.3 * f);
    },
    /* Bring one item to a comfortable distance (used when paging open cards). */
    bring(el) { const it = el && el._flight; if (it) API.glide(it.Z - 0.28 * f, 600); },
    lock(v) { locked = v; if (v) { cam.v = 0; dragging = false; } },
    refreshSkins() { readSkins(); },
    /* Where a room's arrival point sits along the whole flight, 0..1. */
    arrival(i) { const r = rooms[i]; const at = i === 0 ? cMin + 0.1 * f : r.start - 0.3 * f; return clamp((at - cMin) / (cMax - cMin), 0, 1); },
    on(type, fn) { listeners[type].push(fn); },
    get rooms() { return rooms; },
    get moved() { return moved; },
  };
  window.AxonFlight = API;
})();
