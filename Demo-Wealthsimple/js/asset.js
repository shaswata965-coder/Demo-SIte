/* ============================================================================
   LARCH DEMO — the object
   ----------------------------------------------------------------------------
   One large object made of coins, projected by hand onto a 2D canvas. No
   dependencies. It is the AXON model's job — one thing that transforms as you
   scroll — re-cut for a muted language whose assets are big, solid product
   pictures rather than diagrams: instead of a wireframe network, a few hundred
   coins that restack into each product's emblem.

     0 cone       a larch cone — scales on a spiral; the brand, the seed
     1 stacks     four stacks of coins, rising — four kinds of money
     2 pie        a pie chart in four slices, one pulled out — the portfolios
     3 summit     a mountain, a trail of coins up to the peak — goals
     4 hourglass  gold sand run from one bulb to the other — time with an advisor
     5 card       a payment card laid out as a mosaic — money in and out
     6 coin       one coin, a tree struck on its face — start with one

   Every coin carries a position, a facing and a size in every arrangement,
   and the morph blends all three, so a stack of coins lying flat can turn up
   into the face of a card. Coins are drawn as ellipses from their facing —
   flat ones foreshortened, edge-on ones a sliver — lit from the upper left,
   depth-sorted, and outlined, which is what makes the thing read as solid.

   All colour comes in from the page (css/tokens.css), so the object recolours
   with the room. Porting to React Three Fiber later: the arrangement
   generators, POSE_* and the colour roles carry over; the hand projection
   becomes an instanced cylinder mesh.
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var PI = Math.PI;
  var GOLDEN = PI * (3 - Math.sqrt(5));

  var STATES = ['cone', 'stacks', 'pie', 'summit', 'hourglass', 'card', 'coin'];
  var NS = STATES.length;

  /* Colour slots, in the order js/app.js reads them off the page:
     gold (the brand), structure, live, data. */
  var C_GOLD = 0, C_SECOND = 1, C_SIGNAL = 2, C_THIRD = 3;

  /* Seven floats per coin per arrangement: position, facing, size. */
  var STRIDE = 7;

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function frac(v) { return v - Math.floor(v); }

  /* Hold, move, hold — the same curve as AXON, so the page and the object stay
     in step: the object sits still through the first 30% of a chapter and
     does all of its travelling, turning and restacking in the rest. */
  function dragEase(t) {
    return smoothstep(clamp((t - 0.30) / 0.70, 0, 1));
  }

  /* Each arrangement's best face: a yaw, a pitch and a scale, lerped with the
     morph. Pitch is how far you look down on it — stacks and the pie want to
     be seen from above, a card and a coin nearly square on.

     Yaw is tuned against SPIN_AT in js/app.js, the roll the page adds as the
     object is dragged from side to side — change one and retune the other.
     On a wide screen that roll is 0 at the intro, Portfolios and Join, about
     −0.36 at Accounts, Goals and Payments and about −0.71 at Advice; on a
     phone, where the object never moves sideways, it is 0 everywhere. So each
     yaw has to give a good face at both. The hourglass is the strict one:
     its three posts must stay out from in front of the sand, which holds
     for a total yaw inside ±0.7, and 0.35 lands at +0.35 on a phone and
     −0.36 on a wide screen.
     cone  stacks  pie   summit  hourglass  card  coin */
  var POSE_YAW   = [0.00, -0.20, 0.22,  0.23,  0.35,  0.60, 0.38];
  var POSE_PITCH = [0.14,  0.34, 0.62,  0.30,  0.30,  0.16, 0.10];
  var POSE_SCALE = [0.90,  0.80, 0.80,  0.80,  0.72,  0.76, 0.80];
  /* How firmly each one stands on the ground — the soft shadow under it.
     The card and the coin float, so theirs is fainter and further off. */
  var SHADOW     = [1.00,  1.00, 1.00,  0.90,  1.00,  0.55, 0.55];

  var TIERS = {
    high:   { nodes: 720, dpr: 2.0 },
    medium: { nodes: 540, dpr: 1.5 },
    low:    { nodes: 380, dpr: 1.0 }
  };

  function detectTier() {
    if (typeof navigator === 'undefined') return 'medium';
    var conn = navigator.connection || {};
    if (conn.saveData) return 'low';
    var mem = navigator.deviceMemory || 4;
    var cores = navigator.hardwareConcurrency || 4;
    var coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    if (mem <= 2 || cores <= 2) return 'low';
    if (coarse || mem <= 4 || cores <= 4) return 'medium';
    return 'high';
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---- colour, parsed once per room change --------------------------------
     The page hands over hex (or rgb()) strings; the object needs eight tones
     of each — four shades, near and far — and computing them per coin per
     frame would be the frame budget. So they are mixed here, once. */
  function parseColor(s) {
    s = (s || '').trim();
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
    if (m) return [+m[1], +m[2], +m[3]];
    return [128, 128, 128];
  }
  function mixRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function css(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  var WHITE = [255, 255, 255], BLACK = [0, 0, 0];

  /* ======================================================================== */

  function CoinField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tier = opts.forceTier || detectTier();
    var t = TIERS[this.tier];

    this.cfg = {
      nodes: opts.nodes || t.nodes,
      dprCap: opts.dprCap || t.dpr,
      interactive: opts.interactive !== false,
      autoRotate: opts.autoRotate !== undefined ? opts.autoRotate : 0,
      fov: opts.fov || 4.4,
      /* Larger than AXON's 0.30: the language being borrowed puts one big
         product picture on each screen, and lets it bleed toward the edge. */
      scale: opts.scale || 0.36,
      seed: opts.seed || 2027
    };

    this.mode = opts.mode || 'ink';
    this.reduced = reducedMotion();
    this.progress = opts.progress || 0;
    this.targetProgress = this.progress;
    this.spinBase = 0;        /* pointer drag accumulates here                 */
    this.scrollSpin = 0;      /* set by the page; the roll across the layout   */
    this.pitch = 0;
    this.originX = 0.5;
    this.originY = 0.5;
    this.zoom = 1;
    this._corrX = 0; this._corrY = 0;
    /* 1 draws every coin with its rim; the page turns this down when the
       object is a dimmed backdrop, and below 0.6 the rims go — at 30%
       opacity they are not visible and each one is a stroke. */
    this.detail = 1;
    this.scatter = 0;
    this.targets = null;
    this.yawVel = 0; this.pitchVel = 0;
    this.energy = 0;
    this.sweepAt = -10;       /* when the last band of light crossed it        */
    this.t = 0;
    this.running = false;

    this._build();
    this.setTheme(this.mode, opts.colors || {
      pal: ['#D6A960', '#4D6D46', '#8F4F3B', '#436786'], ink: '#1D1814', bg: '#F3EFE6'
    });
    this.resize();
    if (this.cfg.interactive) this._bindPointer();

    var self = this;
    this._onResize = function () { self.resize(); };
    global.addEventListener('resize', this._onResize, { passive: true });
  }

  CoinField.STATES = STATES;
  CoinField.detectTier = detectTier;
  CoinField.dragEase = dragEase;

  /* --------------------------------------------------------------------------
     Arrangements. Each returns { p: Float32Array(n * 7), c: Uint8Array(n) }:
     per coin x, y, z (y up), facing nx, ny, nz, radius — and a colour slot.
     ------------------------------------------------------------------------ */
  function Shape(n) { this.p = new Float32Array(n * STRIDE); this.c = new Uint8Array(n); this.n = n; }
  Shape.prototype.set = function (i, x, y, z, nx, ny, nz, r, col) {
    var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1, k = i * STRIDE, P = this.p;
    P[k] = x; P[k + 1] = y; P[k + 2] = z;
    P[k + 3] = nx / l; P[k + 4] = ny / l; P[k + 5] = nz / l;
    P[k + 6] = r;
    this.c[i] = col;
  };

  /* Split n units into shares that sum to exactly n. */
  function shares(n, w) {
    var sum = 0, i, out = [], used = 0;
    for (i = 0; i < w.length; i++) sum += w[i];
    for (i = 0; i < w.length; i++) {
      var k = i === w.length - 1 ? n - used : Math.round(n * w[i] / sum);
      out.push(Math.max(0, k)); used += Math.max(0, k);
    }
    return out;
  }

  /* 0 — a larch cone. Scales laid on a golden-angle spiral over an egg
     shape, round at the foot and drawn to a point, each scale tipped
     outward and up the way a cone's scales lift. Gold, with the spiral
     arms picked out in the live hue; the foot in structure. */
  function cone(n, rand) {
    var S = new Shape(n), H = 2.36;
    var base = Math.sqrt(8.2 / n / PI) * 1.75;
    for (var i = 0; i < n; i++) {
      var u = 0.03 + 0.94 * (i / (n - 1));
      var y = -H / 2 + u * H;
      var r = 0.80 * Math.pow(Math.sin(PI * Math.pow(u, 0.86)), 0.78);
      var a = i * GOLDEN;
      var ca = Math.cos(a), sa = Math.sin(a);
      var lift = 0.55 + 0.35 * u;
      var size = base * (0.45 + 0.55 * Math.sin(PI * clamp(u * 1.05, 0, 1)));
      var col = u < 0.07 ? C_SECOND : (i % 13 < 3 ? C_SIGNAL : C_GOLD);
      S.set(i, ca * r, y, sa * r, ca, lift, sa, size, col);
    }
    return S;
  }

  /* 1 — four stacks of coins, rising left to right. Thin coins, closely
     stacked, so a stack reads as a column with milled sides; each a
     slightly different lean and offset, the way a hand stacks them. One hue
     per stack — the four accounts the section names. */
  function stacks(n, rand) {
    var S = new Shape(n);
    var X = [-0.98, -0.33, 0.33, 0.98], Z = [0.14, -0.06, 0.08, -0.12];
    var Hh = [0.72, 1.18, 1.66, 2.18], COL = [C_SECOND, C_SIGNAL, C_GOLD, C_THIRD];
    var cnt = shares(n, Hh), y0 = -1.09, i = 0;
    for (var k = 0; k < 4; k++) {
      var c = cnt[k], step = Hh[k] / Math.max(1, c);
      for (var j = 0; j < c; j++, i++) {
        var wob = (rand() - 0.5) * 0.022;
        S.set(i, X[k] + wob, y0 + (j + 0.5) * step, Z[k] + (rand() - 0.5) * 0.022,
              (rand() - 0.5) * 0.06, 1, (rand() - 0.5) * 0.06, 0.26, COL[k]);
      }
    }
    return S;
  }

  /* 2 — a pie chart, four slices, the biggest pulled out. Coins tile each
     slice's top and its outer wall, so it reads as a solid with a side to it
     rather than a flat disc. Slices stand at different heights, the way a
     product illustration of a chart does. */
  function pie(n, rand) {
    var S = new Shape(n);
    var F = [0.36, 0.27, 0.22, 0.15], TOP = [0.30, 0.18, 0.24, 0.12];
    var COL = [C_GOLD, C_SECOND, C_THIRD, C_SIGNAL];
    var ri = 0.10, ro = 1.10, base = -0.24, gap = 0.075;
    var wts = [], k;
    for (k = 0; k < 4; k++) wts.push(F[k]);
    var cnt = shares(n, wts), a0 = -PI * 0.15, i = 0;
    for (k = 0; k < 4; k++) {
      var span = F[k] * TAU - gap, a1 = a0 + span, mid = (a0 + a1) / 2;
      var ex = k === 0 ? 0.13 : 0, exX = Math.cos(mid) * ex, exZ = Math.sin(mid) * ex;
      var h = TOP[k] - base;
      var topArea = span / 2 * (ro * ro - ri * ri), wallArea = span * ro * h;
      var c = cnt[k], cTop = Math.round(c * topArea / (topArea + wallArea * 0.9)), cWall = c - cTop;
      var rTop = Math.sqrt(topArea / cTop / PI) * 1.42, rWall = Math.sqrt(wallArea / Math.max(1, cWall) / PI) * 1.42;
      for (var j = 0; j < cTop; j++, i++) {
        var u = (j + 0.5) / cTop, v = frac(j * 0.6180339887 + 0.13 * k);
        var r = Math.sqrt(ri * ri + u * (ro * ro - ri * ri)) - 0.03;
        var a = a0 + 0.02 + v * (span - 0.04);
        S.set(i, Math.cos(a) * r + exX, TOP[k], Math.sin(a) * r + exZ, 0, 1, 0, rTop, COL[k]);
      }
      for (j = 0; j < cWall; j++, i++) {
        var w = (j + 0.5) / cWall, aw = a0 + 0.02 + frac(j * 0.6180339887) * (span - 0.04);
        var yw = base + w * (h - 0.02);
        S.set(i, Math.cos(aw) * ro + exX, yw, Math.sin(aw) * ro + exZ,
              Math.cos(aw), 0, Math.sin(aw), rWall, COL[k]);
      }
      a0 = a1 + gap;
    }
    return S;
  }

  /* 3 — a mountain. A height field over an oval foot, sampled on a sunflower
     spiral so the coins tile it evenly; each coin lies along the slope. Moss
     low down, slate rock above, the peaks catching gold — and a trail of
     coins in the live hue winding from the foot to the summit. */
  function summitH(x, z) {
    return 1.62 * Math.exp(-(Math.pow(x - 0.14, 2) / 0.21 + Math.pow(z + 0.04, 2) / 0.30))
         + 0.86 * Math.exp(-(Math.pow(x + 0.66, 2) / 0.12 + Math.pow(z - 0.16, 2) / 0.19))
         + 0.48 * Math.exp(-(Math.pow(x - 0.92, 2) / 0.10 + Math.pow(z + 0.18, 2) / 0.17));
  }
  function summit(n, rand) {
    var S = new Shape(n), R0 = 1.34, k;
    var size = Math.sqrt(PI * R0 * R0 * 0.78 / n / PI) * 1.5;
    /* The trail: a polyline spiralling in from the foot to the peak. */
    var trail = [];
    for (k = 0; k <= 60; k++) {
      var s = k / 60, ta = -0.6 + s * TAU * 1.15, tr = 1.18 * (1 - s) + 0.02;
      trail.push(0.14 + Math.cos(ta) * tr, -0.04 + Math.sin(ta) * tr * 0.78);
    }
    function nearTrail(x, z) {
      var best = 1e9;
      for (var q = 0; q < trail.length; q += 2) {
        var dx = x - trail[q], dz = z - trail[q + 1];
        best = Math.min(best, dx * dx + dz * dz);
      }
      return Math.sqrt(best);
    }
    for (var i = 0; i < n; i++) {
      var r = R0 * Math.sqrt((i + 0.5) / n), a = i * GOLDEN;
      var x = Math.cos(a) * r, z = Math.sin(a) * r * 0.78;
      var h = summitH(x, z) + 0.035 * Math.sin(a * 5 + r * 9) * r;
      var e = 0.01;
      var dx = (summitH(x + e, z) - summitH(x - e, z)) / (2 * e);
      var dz = (summitH(x, z + e) - summitH(x, z - e)) / (2 * e);
      var col = h > 1.22 ? C_GOLD : (h > 0.55 ? C_THIRD : C_SECOND);
      if (nearTrail(x, z) < 0.055 && h > 0.08) col = C_SIGNAL;
      S.set(i, x, -0.80 + h, z, -dx, 1, -dz, size, col);
    }
    return S;
  }

  /* 4 — an hourglass. Plates top and bottom and three posts in structure;
     gold sand settled into a mound below, a funnel of it left above, and a
     thread of it falling between. There is no glass: drawn in coins it read
     as a scatter of dashes, and the sand already draws its outline — the
     funnel and the mound are the glass's own shape. */
  function hourglass(n, rand) {
    var S = new Shape(n);
    var parts = shares(n, [0.18, 0.17, 0.37, 0.20, 0.08]);
    var i = 0, j, a, r, u;
    function glassR(y) { return 0.09 + 0.64 * Math.pow(Math.abs(y) / 1.02, 1.25); }
    /* plates: two coin-tiled discs */
    var pc = parts[0], half = Math.ceil(pc / 2);
    var pr = Math.sqrt(PI * 0.80 * 0.80 / half / PI) * 1.45;
    for (j = 0; j < pc; j++, i++) {
      var top = j < half, jj = top ? j : j - half, m = top ? half : pc - half;
      r = 0.80 * Math.sqrt((jj + 0.5) / m); a = jj * GOLDEN;
      S.set(i, Math.cos(a) * r, top ? 1.12 : -1.12, Math.sin(a) * r, 0, 1, 0, pr, C_SECOND);
    }
    /* posts: discs stood on edge and overlapped, so each reads as a column
       rather than a ladder */
    var per = Math.ceil(parts[1] / 3);
    for (j = 0; j < parts[1]; j++, i++) {
      var post = Math.floor(j / per), q = (j % per + 0.5) / per;
      /* two posts either side at the front, one behind: none in front of
         the falling sand */
      a = PI / 6 + post * TAU / 3;
      S.set(i, Math.cos(a) * 0.70, -1.08 + q * 2.16, Math.sin(a) * 0.70,
            Math.cos(a), 0, Math.sin(a), 0.06, C_SECOND);
    }
    /* sand below: a mound */
    var sb = parts[2], sbr = Math.sqrt(PI * 0.64 * 0.64 / sb / PI) * 1.5;
    for (j = 0; j < sb; j++, i++) {
      u = Math.sqrt((j + 0.5) / sb); r = 0.64 * u; a = j * GOLDEN;
      var hy = -1.06 + 0.60 * (1 - Math.pow(u, 1.5));
      var slope = 0.60 * 1.5 * Math.pow(u, 0.5) / 0.64;
      S.set(i, Math.cos(a) * r, hy, Math.sin(a) * r, Math.cos(a) * slope, 1, Math.sin(a) * slope, sbr, C_GOLD);
    }
    /* sand above: a level surface, and the funnel of it under that */
    var sa = parts[3], saTop = Math.ceil(sa * 0.5), ytop = 0.54, rTop = glassR(ytop) - 0.02;
    var sar = Math.sqrt(PI * rTop * rTop / saTop / PI) * 1.5;
    for (j = 0; j < sa; j++, i++) {
      if (j < saTop) {
        r = rTop * Math.sqrt((j + 0.5) / saTop); a = j * GOLDEN;
        S.set(i, Math.cos(a) * r, ytop, Math.sin(a) * r, 0, 1, 0, sar, C_GOLD);
      } else {
        u = (j - saTop + 0.5) / (sa - saTop);
        var yf = 0.05 + u * (ytop - 0.06); r = glassR(yf) - 0.02; a = (j - saTop) * GOLDEN;
        S.set(i, Math.cos(a) * r, yf, Math.sin(a) * r, Math.cos(a), -0.6, Math.sin(a), sar * 0.9, C_GOLD);
      }
    }
    /* the falling thread */
    for (j = 0; j < parts[4]; j++, i++) {
      u = (j + 0.5) / parts[4];
      S.set(i, (rand() - 0.5) * 0.02, 0.05 - u * 0.62, (rand() - 0.5) * 0.02, 0, 0, 1, 0.028, C_SIGNAL);
    }
    return S;
  }

  /* 5 — a payment card, laid out as a mosaic of coins facing you. The grid
     spacing is solved so the card's rounded rectangle holds at least n
     coins, then thinned evenly to exactly n. Slate body with a band of
     structure across it, a gold chip, a row of numbers in the live hue, and
     a small gold tree for the wordmark. */
  function card(n, rand) {
    var S = new Shape(n), W = 2.32, H = W / 1.586, CR = 0.17;
    function inside(x, y) {
      var dx = Math.max(Math.abs(x) - (W / 2 - CR), 0), dy = Math.max(Math.abs(y) - (H / 2 - CR), 0);
      return dx * dx + dy * dy <= CR * CR;
    }
    function grid(s) {
      var pts = [];
      var cols = Math.floor(W / s), rows = Math.floor(H / s);
      var ox = -((cols - 1) * s) / 2, oy = ((rows - 1) * s) / 2;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = ox + c * s, y = oy - r * s;
        if (inside(x, y)) pts.push(x, y);
      }
      return pts;
    }
    var lo = 0.01, hi = 0.4, pts = null;
    for (var it = 0; it < 30; it++) {
      var mid = (lo + hi) / 2, g = grid(mid);
      if (g.length / 2 >= n) { lo = mid; pts = g; } else hi = mid;
    }
    if (!pts) pts = grid(lo);
    var m = pts.length / 2, s = lo;
    for (var i = 0; i < n; i++) {
      var k = Math.floor(i * m / n) * 2, x = pts[k], y = pts[k + 1], z = 0, col = C_THIRD;
      var band = x * 0.55 + y;
      if (band > 0.10 && band < 0.42) col = C_SECOND;
      if (x > -0.90 && x < -0.50 && y > -0.02 && y < 0.28) { col = C_GOLD; z = 0.02; }
      if (y < -0.30 && y > -0.42 && x > -0.95 && x < 0.55 && ((x + 0.95) % 0.38) < 0.30) { col = C_SIGNAL; z = 0.015; }
      var tx = x - 0.80, ty = y - 0.30;
      if (ty > -0.12 && ty < 0.16 && Math.abs(tx) < (0.16 - ty) * 0.55) { col = C_GOLD; z = 0.015; }
      S.set(i, x, y, z, 0, 0, 1, s * 0.66, col);
    }
    return S;
  }

  /* 6 — one coin. A face tiled with small coins, a milled border and a
     larch struck in the middle, a rim with depth to it, and a loose ring of
     coins in orbit — the one dollar the section asks for, and what it turns
     into. */
  function coin(n, rand) {
    var S = new Shape(n);
    var parts = shares(n, [0.78, 0.10, 0.12]), i = 0, j, a, r;
    var R = 1.02, fr = Math.sqrt(PI * R * R / parts[0] / PI) * 1.4;
    function tree(x, y) {
      if (y > -0.32 && y < 0.62 && Math.abs(x) < (0.62 - y) * 0.56) return true;
      return Math.abs(x) < 0.08 && y <= -0.32 && y > -0.54;
    }
    for (j = 0; j < parts[0]; j++, i++) {
      r = R * Math.sqrt((j + 0.5) / parts[0]); a = j * GOLDEN;
      var x = Math.cos(a) * r, y = Math.sin(a) * r, z = 0.0, col = C_GOLD;
      if (r > 0.80 && r < 0.88) { col = C_SECOND; z = 0.02; }
      if (tree(x, y)) { col = C_SECOND; z = 0.035; }
      S.set(i, x, y, z, 0, 0, 1, fr, col);
    }
    for (j = 0; j < parts[1]; j++, i++) {
      a = (j / parts[1]) * TAU * 2;
      var zr = j % 2 ? 0.06 : -0.06;
      S.set(i, Math.cos(a) * R, Math.sin(a) * R, zr, Math.cos(a), Math.sin(a), 0, 0.055, C_GOLD);
    }
    for (j = 0; j < parts[2]; j++, i++) {
      a = (j / parts[2]) * TAU;
      var orb = 1.34 + (rand() - 0.5) * 0.05;
      S.set(i, Math.cos(a) * orb, Math.sin(a) * orb * 0.30 - 0.05, Math.sin(a) * orb * 0.62,
            0, 0.2, 1, 0.036, C_THIRD);
    }
    return S;
  }

  CoinField.prototype._build = function () {
    var n = this.cfg.nodes, i;
    var gens = [cone, stacks, pie, summit, hourglass, card, coin];
    this.shapes = []; this.cols = [];
    for (var s = 0; s < NS; s++) {
      var sh = gens[s](n, rng(this.cfg.seed + s * 101));
      this.shapes.push(sh.p); this.cols.push(sh.c);
    }

    /* Each arrangement is centred on its own robust bounding box before it is
       ever projected — 2nd to 98th percentile per axis, so a stray coin
       cannot drag the whole object sideways — and so spins about its own
       middle. The orbit round the closing coin and the trail up the mountain
       are exactly the kind of outlier this ignores. */
    this.centres = this.shapes.map(function (P) {
      var c = [0, 0, 0];
      for (var ax = 0; ax < 3; ax++) {
        var v = new Float64Array(n);
        for (var i = 0; i < n; i++) v[i] = P[i * STRIDE + ax];
        v.sort();
        var loI = Math.floor(n * 0.02), hiI = Math.min(n - 1, Math.ceil(n * 0.98));
        c[ax] = (v[loI] + v[hiI]) * 0.5;
      }
      return c;
    });

    this.proj = new Float32Array(n * 8);   /* sx, sy, rMajor, rMinor, angle, depth, shade, colour */
    this.order = new Uint16Array(n);
    this.keys = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.flip = new Float32Array(n);       /* when in a morph each coin changes colour */
    for (i = 0; i < n; i++) {
      this.phase[i] = (i * 0.61803398875 % 1) * TAU;
      this.flip[i] = 0.30 + 0.40 * frac(i * 0.7548776662);
      this.order[i] = i;
    }

    /* Each coin leaves on its own beat and along its own arc, so the object
       comes apart as a swarm rather than as one shape sliding across. */
    var sr = rng(97);
    this.sDelay = new Float32Array(n);
    this.sArcX = new Float32Array(n); this.sArcY = new Float32Array(n);
    this.sK = new Float32Array(n);
    for (i = 0; i < n; i++) {
      this.sDelay[i] = sr() * 0.35;
      var arc = sr() * TAU, reach = 30 + sr() * 80;
      this.sArcX[i] = Math.cos(arc) * reach;
      this.sArcY[i] = Math.sin(arc) * reach;
    }
  };

  /* --------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  /* pal: the four hues in slot order; ink, bg: the room. Eight tones per hue
     — dark, mid, light, glint, each near and far — plus a rim, all as CSS
     strings, so a frame does no colour arithmetic at all.

     On a pale ground ('ink') the coins are pigment: shaded toward black,
     lit toward white, and the far ones faded a little toward the paper, the
     way distance reads in an illustration. On a dark ground ('glow') they are
     lit colour: the shadow side sinks into the room and the lit side is the
     hue itself. Plain compositing in both — no additive blending; it would
     turn a muted palette into neon. */
  CoinField.prototype.setTheme = function (mode, colors) {
    this.mode = mode === 'glow' ? 'glow' : 'ink';
    this.colors = colors;
    var glow = this.mode === 'glow';
    var bg = parseColor(colors.bg), ink = parseColor(colors.ink);
    this.tone = []; this.rim = [];
    for (var h = 0; h < 4; h++) {
      var c = parseColor(colors.pal[h]);
      var shades = glow
        ? [mixRGB(c, bg, 0.44), mixRGB(c, bg, 0.12), c, mixRGB(c, WHITE, 0.38)]
        : [mixRGB(c, BLACK, 0.24), c, mixRGB(c, WHITE, 0.18), mixRGB(c, WHITE, 0.50)];
      var row = [];
      for (var d = 0; d < 2; d++) {
        for (var s = 0; s < 4; s++) row.push(css(d ? mixRGB(shades[s], bg, glow ? 0.30 : 0.24) : shades[s]));
      }
      this.tone.push(row);
      this.rim.push(css(glow ? mixRGB(c, bg, 0.74) : mixRGB(c, BLACK, 0.48)));
    }
    this.shadowRGB = glow ? [0, 0, 0] : mixRGB(ink, bg, 0.2);
    this.shadowA = glow ? 0.42 : 0.20;
  };

  CoinField.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    var budget = Math.sqrt(2.6e6 / Math.max(1, w * h));
    var dpr = Math.max(1, Math.min(global.devicePixelRatio || 1, this.cfg.dprCap, budget));
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Sized off the short edge and capped, so an ultrawide does not draw an
       object three times the size of a laptop's. How big it reads per
       chapter is `zoom`, which the page owns. */
    this.radius = Math.min(w, h, 1150) * this.cfg.scale;
    /* The unzoomed unit. Rim width is sized off this, not off the zoom —
       zooming the object must not thicken every outline. */
    this.uBase = clamp(this.radius / 260, 0.8, 2.2);
    this.u = clamp(this.radius * this.zoom / 260, 0.7, 2.4);
    this.render();
  };

  /* How far arrangement `state` reaches sideways from its centre, as a
     multiple of the drawn radius at zoom 1: the widest coin's distance from
     the vertical axis plus its own radius, times the pose scale. Yaw is the
     only rotation that moves a coin across the screen and it can swing any
     coin side-on, so this bounds the arrangement at every angle it turns to.
     The page uses it to run the thread from the copy towards the object
     without touching it. */
  CoinField.prototype.reach = function (state) {
    var s = clamp(state | 0, 0, NS - 1), P = this.shapes[s], c = this.centres[s], m = 0;
    for (var i = 0; i < this.cfg.nodes; i++) {
      var k = i * STRIDE, x = P[k] - c[0], z = P[k + 2] - c[2];
      var d = Math.sqrt(x * x + z * z) + P[k + 6];
      if (d > m) m = d;
    }
    return m * POSE_SCALE[s];
  };

  CoinField.prototype.setScatter = function (amount, targets) {
    this.scatter = clamp(amount, 0, 1);
    if (targets) this.targets = targets;
  };

  CoinField.prototype.setProgress = function (p, immediate) {
    this.targetProgress = clamp(p, 0, NS - 1);
    if (immediate || this.reduced) this.progress = this.targetProgress;
  };

  /* Arriving in a section: a band of light crosses the object. It is the
     only event animation it has — AXON brightened every edge at once; here
     the coins catch the light one after another. */
  CoinField.prototype.pulse = function (a) {
    this.energy = Math.min(1.5, this.energy + (a || 0.6));
    if (this.t - this.sweepAt > 1.6) this.sweepAt = this.t;
  };

  CoinField.prototype._bindPointer = function () {
    var self = this, dragging = false, lx = 0, ly = 0, moved = 0, el = this.canvas;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';
    function px(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
    function py(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
    function down(e) { dragging = true; moved = 0; lx = px(e); ly = py(e); el.style.cursor = 'grabbing'; }
    function move(e) {
      if (!dragging) return;
      var dx = px(e) - lx, dy = py(e) - ly; lx = px(e); ly = py(e);
      moved += Math.abs(dx) + Math.abs(dy);
      self.yawVel += dx * 0.00045;
      self.pitchVel += dy * 0.00028;
      if (e.touches && moved > 12 && Math.abs(dx) > Math.abs(dy)) e.preventDefault();
    }
    function up() { dragging = false; el.style.cursor = 'grab'; }
    el.addEventListener('mousedown', down);
    global.addEventListener('mousemove', move);
    global.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    global.addEventListener('touchend', up, { passive: true });
  };

  /* --------------------------------------------------------------------------
     Projection
     ------------------------------------------------------------------------ */
  /* The light, in view space: upper left and well in front, so a face
     turned to you is lit and a wall turned down from you is in shade. */
  var LX = -0.38, LY = 0.60, LZ = 0.70;
  (function () { var l = Math.sqrt(LX * LX + LY * LY + LZ * LZ); LX /= l; LY /= l; LZ /= l; }());

  CoinField.prototype._project = function () {
    var n = this.cfg.nodes;
    var lo = Math.floor(this.progress), hi = Math.min(NS - 1, lo + 1);
    var t = dragEase(this.progress - lo);
    var A = this.shapes[lo], B = this.shapes[hi], CA = this.cols[lo], CB = this.cols[hi];

    var yaw = this.spinBase + (this.scrollSpin || 0) + lerp(POSE_YAW[lo], POSE_YAW[hi], t);
    var pitch = clamp(this.pitch + lerp(POSE_PITCH[lo], POSE_PITCH[hi], t), -1.2, 1.2);
    this.viewYaw = yaw;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var fov = this.cfg.fov;

    /* Where the page asked for it, plus the correction measured last frame —
       the same feedback as AXON: the projection is perspective, so a shape
       centred in 3D lands off-centre once one side is nearer, and each pose's
       pitch tilts it further. Measure the drawn result, feed a quarter of the
       residual into the next frame. */
    var tgtX = this.w * this.originX, tgtY = this.h * this.originY;
    var ox = tgtX + this._corrX, oy = tgtY + this._corrY;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    var R = this.radius * this.zoom * lerp(POSE_SCALE[lo], POSE_SCALE[hi], t);
    this.u = clamp(this.radius * this.zoom / 260, 0.7, 2.4);

    var KA = this.centres[lo], KB = this.centres[hi];
    var kx = lerp(KA[0], KB[0], t), ky = lerp(KA[1], KB[1], t), kz = lerp(KA[2], KB[2], t);

    var T = this.t, P = this.proj, keys = this.keys;
    var tg = this.targets, S = tg && tg.length ? this.scatter : 0;
    var tn = S ? tg.length >> 1 : 0, SK = this.sK;
    var bead = 3.3 * this.u;

    /* The band of light: a diagonal sweep across the object's width, once on
       arriving in a section and then every nine seconds while it rests. */
    var since = T - this.sweepAt;
    if (since > 9 && !this.reduced) { this.sweepAt = T; since = 0; }
    var sweep = !this.reduced && since < 1.5 && this._bw > 0;
    var sweepX = sweep ? this._bx0 - this._bw * 0.3 + (since / 1.5) * this._bw * 1.6 : 0;
    var band = this._bw * 0.12;

    for (var i = 0; i < n; i++) {
      var k = i * STRIDE, i8 = i * 8;
      var x = lerp(A[k], B[k], t) - kx,
          y = lerp(A[k + 1], B[k + 1], t) - ky,
          z = lerp(A[k + 2], B[k + 2], t) - kz;
      var nx = lerp(A[k + 3], B[k + 3], t), ny = lerp(A[k + 4], B[k + 4], t), nz = lerp(A[k + 5], B[k + 5], t);
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (nl < 1e-3) { nx = 0; ny = 0; nz = 1; nl = 1; }
      nx /= nl; ny /= nl; nz /= nl;
      var size = lerp(A[k + 6], B[k + 6], t);

      /* Idle wander: two incommensurate sines per axis, half of AXON's —
         coins sitting in a stack should breathe, not swim. */
      var ph = this.phase[i];
      x += Math.sin(T * 0.53 + ph) * 0.008;
      y += Math.sin(T * 0.41 + ph * 1.7) * 0.008;
      z += Math.cos(T * 0.47 + ph * 2.3) * 0.008;

      /* Yaw about y, then pitch about x; positive pitch looks down on it. */
      var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var nx1 = nx * cy + nz * sy, nz1 = -nx * sy + nz * cy;
      var ny2 = ny * cp - nz1 * sp, nz2 = ny * sp + nz1 * cp;

      var d = fov / (fov - z2);
      var px = ox + x1 * R * d, py = oy - y2 * R * d;
      var rs = size * R * d;
      if (px - rs < minX) minX = px - rs; if (px + rs > maxX) maxX = px + rs;
      if (py - rs < minY) minY = py - rs; if (py + rs > maxY) maxY = py + rs;

      /* A coin seen edge-on is still a coin: never thinner than its rim. */
      var face = Math.abs(nz2), minor = rs * Math.max(face, 0.17);
      var ang = Math.atan2(-ny2, nx1);
      var lam = Math.abs(nx1 * LX + ny2 * LY + nz2 * LZ);
      /* Alternate coins a shade apart, so a stack shows its milled sides. */
      lam += (i & 1) ? 0.05 : -0.05;
      var shade = lam < 0.38 ? 0 : (lam < 0.70 ? 1 : 2);
      /* A glint: each coin catches the light on its own slow cycle, mostly
         not at all — the coins' version of AXON's firing units. */
      if (shade > 0 && Math.pow((Math.sin(T * 0.8 + ph * 3.1) + 1) * 0.5, 14) > 0.6) shade = 3;
      if (sweep && Math.abs(px - sweepX + (py - oy) * 0.45) < band && shade > 0) shade = Math.min(3, shade + 2);
      /* Far coins fade a little toward the room — well behind the middle
         only, or a flat face turned a few degrees splits into two tones. */
      var depth = z2 < -0.32 ? 1 : 0;
      var col = t < this.flip[i] ? CA[i] : CB[i];

      /* Taken apart. Past its own delay a coin leaves the object and travels
         — on an arc, eased — to the point the page gave it: a bead on one of
         the section's links, or a place on the ring round one of its cards.
         It turns to face you and shrinks to a bead on the way. The bounding
         box above is taken first, so the centring only ever sees the
         object, never the page. */
      var sk = 0;
      if (S > 0) {
        sk = clamp((S - this.sDelay[i]) / 0.65, 0, 1);
        sk = sk * sk * (3 - 2 * sk);
        if (sk > 0) {
          var j = (i % tn) * 2, bow = Math.sin(sk * PI);
          var tx = tg[j] + Math.sin(T * 0.9 + ph) * 1.4;
          var ty = tg[j + 1] + Math.cos(T * 0.7 + ph * 1.3) * 1.4;
          px += (tx - px) * sk + this.sArcX[i] * bow;
          py += (ty - py) * sk + this.sArcY[i] * bow;
          rs = lerp(rs, bead, sk);
          minor = lerp(minor, rs, sk);
          if (sk > 0.5) { depth = 0; if (shade < 2) shade = 1; }
        }
      }
      SK[i] = sk;

      P[i8] = px; P[i8 + 1] = py; P[i8 + 2] = rs; P[i8 + 3] = minor;
      P[i8 + 4] = ang; P[i8 + 5] = depth; P[i8 + 6] = shade; P[i8 + 7] = col;
      /* Far first; a coin in flight is drawn over the object it left. */
      keys[i] = z2 + sk * 10;
    }

    var resX = tgtX - (minX + maxX) * 0.5, resY = tgtY - (minY + maxY) * 0.5;
    var snap = (Math.abs(resX) > 150 || Math.abs(resY) > 150) ? 1 : 0.25;
    this._corrX += resX * snap;
    this._corrY += resY * snap;

    /* Kept for the shadow and next frame's sweep. */
    this._bx0 = minX; this._bw = maxX - minX;
    this._by1 = maxY; this._bcx = (minX + maxX) * 0.5;
    this._lo = lo; this._hi = hi; this._t = t;
    this._shadow = lerp(SHADOW[lo], SHADOW[hi], t);
  };

  /* --------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */
  CoinField.prototype.render = function () {
    var ctx = this.ctx;
    if (!ctx || !this.w) return;

    ctx.setTransform(this.canvas.width / this.w, 0, 0, this.canvas.width / this.w, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.w, this.h);

    this._project();
    var n = this.cfg.nodes, P = this.proj, keys = this.keys, order = this.order;

    /* ---- the shadow it stands on ----------------------------------------
       A soft ellipse under the object, the way a product shot sits on its
       sweep. It goes as the coins leave: a scaffold of beads stands on
       nothing. */
    var sh = this._shadow * (1 - this.scatter);
    if (sh > 0.02 && this._bw > 0) {
      var rx = this._bw * 0.46, ry = Math.max(6, rx * 0.11);
      var sy0 = this._by1 + ry * 0.2 + (1 - this._shadow) * this.radius * this.zoom * 0.35;
      ctx.save();
      ctx.translate(this._bcx, sy0);
      ctx.scale(1, ry / rx);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      var c = this.shadowRGB, a = this.shadowA * sh;
      g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')');
      g.addColorStop(0.55, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a * 0.4).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
      ctx.restore();
    }

    /* ---- the coins, far to near ------------------------------------------
       Coins are opaque and overlap, so unlike AXON's dots they have to be
       painted in depth order — a far coin painted after a near one would sit
       on top of it. Sorted every frame (a few hundred keys), then drawn in
       runs: consecutive coins that share a tone go into one path and one
       fill, so the cost is the number of tone changes, not the number of
       coins. Each run is outlined in its hue's rim, which separates coins
       that overlap and gives the stacks their milled edges. */
    /* Insertion sort on last frame's order: between two frames almost
       nothing changes places, so this is close to one pass. */
    var idx = order;
    for (var s1 = 1; s1 < n; s1++) {
      var v = idx[s1], kv = keys[v], s2 = s1 - 1;
      while (s2 >= 0 && keys[idx[s2]] > kv) { idx[s2 + 1] = idx[s2]; s2--; }
      idx[s2 + 1] = v;
    }

    var rims = this.detail > 0.6;
    ctx.lineWidth = Math.min(1.2, 0.5 + this.uBase * 0.32);
    ctx.lineJoin = 'round';
    var path = null, cur = -1, curHue = 0;
    var tone = this.tone, rim = this.rim;
    function flush() {
      if (!path) return;
      ctx.fillStyle = tone[curHue][cur & 7];
      ctx.fill(path);
      if (rims) { ctx.strokeStyle = rim[curHue]; ctx.stroke(path); }
      path = null;
    }
    for (var q = 0; q < n; q++) {
      var i8 = idx[q] * 8;
      var rs = P[i8 + 2];
      if (rs < 0.3) continue;
      var style = P[i8 + 7] * 8 + P[i8 + 5] * 4 + P[i8 + 6];
      if (style !== cur) { flush(); cur = style; curHue = P[i8 + 7]; path = new Path2D(); }
      var x = P[i8], y = P[i8 + 1], mi = P[i8 + 3], an = P[i8 + 4];
      /* radiusX is the minor axis, laid along the facing as projected. */
      path.moveTo(x + mi * Math.cos(an), y + mi * Math.sin(an));
      path.ellipse(x, y, mi, rs, an, 0, TAU);
    }
    flush();

    ctx.globalAlpha = 1;
  };

  CoinField.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this, last = performance.now();
    function frame(now) {
      if (!self.running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      self.t += dt;

      self.progress += (self.targetProgress - self.progress) * Math.min(1, dt * 1.9);
      if (self.reduced) self.t = 0;
      if (!self.reduced) {
        self.spinBase += self.yawVel + self.cfg.autoRotate * dt;
        self.pitch = clamp(self.pitch + self.pitchVel, -0.8, 0.8);
        self.yawVel *= 0.93; self.pitchVel *= 0.90;
        self.energy *= 0.945;
      }
      self.render();
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  CoinField.prototype.stop = function () { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); };

  global.CoinField = CoinField;
}(window));
