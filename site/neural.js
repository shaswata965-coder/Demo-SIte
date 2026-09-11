/* ============================================================================
   AXON — Neural Field
   ----------------------------------------------------------------------------
   A dependency-free 3D point-graph renderer projected by hand onto a 2D canvas.

   Why not Three.js here? This file exists to prove the *motion language* on the
   widest possible range of hardware — including the mid-tier Android devices
   the client is worried about. Hand-projected 2D canvas has no shader compile
   step, no WebGL context loss, no 150 KB of runtime, and degrades predictably.
   In production the same choreography moves to React Three Fiber with instanced
   meshes; the state machine below is the part that carries over.

   The field holds one set of nodes and seven position targets ("states"). The
   scroll position picks a pair of states and a blend factor, and every node
   lerps between them. Edges carry a per-state visibility weight, so the graph
   appears to rewire itself as it morphs rather than dragging stale lines along.
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var GOLDEN = Math.PI * (3 - Math.sqrt(5));

  /* Deterministic PRNG so every reload — and every storyboard thumbnail —
     draws the identical field. Art direction needs a repeatable frame. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  var STATES = ['seed', 'bloom', 'infer', 'settle', 'vault', 'ledger', 'core'];

  /* --------------------------------------------------------------------------
     Position targets. Each returns a flat [x,y,z, x,y,z, …] in roughly a
     unit-and-a-bit radius so the projection maths stays constant across states.
     ------------------------------------------------------------------------ */
  var SHAPES = {
    /* Dormant monolith — the vertical column the reference site opens on. */
    seed: function (n, rand) {
      var p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1);
        var a = i * GOLDEN * 2.4;
        var r = 0.16 + 0.10 * Math.sin(t * Math.PI) + rand() * 0.05;
        p[i * 3] = Math.cos(a) * r;
        p[i * 3 + 1] = (t - 0.5) * 2.9;
        p[i * 3 + 2] = Math.sin(a) * r;
      }
      return p;
    },

    /* Ingest — an even shell. Fibonacci sphere, jittered off-lattice. */
    bloom: function (n, rand) {
      var p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var y = 1 - (i / (n - 1)) * 2;
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var a = i * GOLDEN;
        var s = 1.08 + (rand() - 0.5) * 0.16;
        p[i * 3] = Math.cos(a) * r * s;
        p[i * 3 + 1] = y * s;
        p[i * 3 + 2] = Math.sin(a) * r * s;
      }
      return p;
    },

    /* Inference — a layered feed-forward stack seen side-on. */
    infer: function (n, rand, meta) {
      var p = new Float32Array(n * 3);
      var L = meta.layers;
      for (var i = 0; i < n; i++) {
        var l = meta.layerOf[i];
        var k = meta.indexInLayer[i];
        var size = meta.layerSize[l];
        var cols = Math.ceil(Math.sqrt(size));
        var cx = k % cols, cy = Math.floor(k / cols);
        var rows = Math.ceil(size / cols);
        p[i * 3] = (l / (L - 1) - 0.5) * 3.5;
        p[i * 3 + 1] = (cy / Math.max(1, rows - 1) - 0.5) * 1.45 + (rand() - 0.5) * 0.04;
        p[i * 3 + 2] = (cx / Math.max(1, cols - 1) - 0.5) * 1.45 + (rand() - 0.5) * 0.04;
      }
      return p;
    },

    /* Settlement — a globe with nodes gathered into latitude corridors. */
    settle: function (n, rand) {
      var p = new Float32Array(n * 3);
      var bands = 9;
      for (var i = 0; i < n; i++) {
        var b = i % bands;
        var lat = (b / (bands - 1) - 0.5) * Math.PI * 0.92;
        var lon = (i / n) * TAU * 7 + rand() * 0.25;
        var r = 1.18;
        p[i * 3] = Math.cos(lat) * Math.cos(lon) * r;
        p[i * 3 + 1] = Math.sin(lat) * r;
        p[i * 3 + 2] = Math.cos(lat) * Math.sin(lon) * r;
      }
      return p;
    },

    /* Trust — a closed cubic lattice. Reads as a vault wall. */
    vault: function (n, rand, meta) {
      var p = new Float32Array(n * 3);
      var g = meta.latticeGrid;
      var step = 2.1 / (g - 1);
      for (var i = 0; i < n; i++) {
        var c = meta.latticeCell[i];
        p[i * 3] = -1.05 + c[0] * step;
        p[i * 3 + 1] = -1.05 + c[1] * step;
        p[i * 3 + 2] = -1.05 + c[2] * step;
      }
      return p;
    },

    /* Proof — the graph flattens into a ledger plane with a slow swell. */
    ledger: function (n, rand) {
      var p = new Float32Array(n * 3);
      var cols = Math.ceil(Math.sqrt(n));
      for (var i = 0; i < n; i++) {
        var cx = i % cols, cy = Math.floor(i / cols);
        var rows = Math.ceil(n / cols);
        var x = (cx / (cols - 1) - 0.5) * 2.7;
        var z = (cy / Math.max(1, rows - 1) - 0.5) * 2.7;
        p[i * 3] = x;
        p[i * 3 + 1] = Math.sin(x * 1.7) * Math.cos(z * 1.7) * 0.18;
        p[i * 3 + 2] = z;
      }
      return p;
    },

    /* Close — everything collapses back to one dense point of light. */
    core: function (n, rand) {
      var p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var y = 1 - (i / (n - 1)) * 2;
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var a = i * GOLDEN;
        var s = 0.14 + Math.pow(rand(), 6) * 1.1;
        p[i * 3] = Math.cos(a) * r * s;
        p[i * 3 + 1] = y * s;
        p[i * 3 + 2] = Math.sin(a) * r * s;
      }
      return p;
    }
  };

  /* How strongly each edge family reads in each state. An edge is not deleted
     when a state changes — it fades — which is what makes the rewire feel like
     one continuous object instead of a cut. */
  var EDGE_VIS = {
    /*              seed bloom infer settle vault ledger core */
    proximity: [0.55, 1.00, 0.06, 0.85, 0.16, 0.45, 0.90],
    layer:     [0.05, 0.10, 1.00, 0.08, 0.05, 0.12, 0.20],
    lattice:   [0.04, 0.06, 0.04, 0.10, 1.00, 0.30, 0.14]
  };

  var TIERS = {
    high:   { nodes: 260, edges: 1100, glow: true,  grain: true,  pulses: 16, dpr: 2.0 },
    medium: { nodes: 180, edges: 700,  glow: true,  grain: true,  pulses: 10, dpr: 1.5 },
    low:    { nodes: 110, edges: 380,  glow: false, grain: false, pulses: 5,  dpr: 1.0 }
  };

  /* The same governor shape the production build uses: guess from the device,
     then demote on measured frame time. Never promote — thrashing looks worse
     than a steady lower tier. */
  function detectTier() {
    if (typeof navigator === 'undefined') return 'medium';
    var conn = navigator.connection || {};
    if (conn.saveData) return 'low';
    var mem = navigator.deviceMemory || 4;
    var cores = navigator.hardwareConcurrency || 4;
    var coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    if (mem <= 4 || cores <= 4) return 'low';
    if (coarse || mem <= 6 || cores <= 6) return 'medium';
    return 'high';
  }

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  /* Soft round sprite, drawn once and blitted per node. Cheaper by an order of
     magnitude than a per-node radial gradient, and the cost is flat. */
  function sprite(color, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1;
    g.fillStyle = grad;
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2, 0, TAU);
    g.fill();
    return c;
  }

  function grainTile(size, seed) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var img = g.createImageData(size, size);
    var r = rng(seed);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 140 + r() * 115;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* ------------------------------------------------------------------------ */

  function NeuralField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.tier = opts.tier || (opts.tier === undefined ? detectTier() : 'medium');
    if (opts.forceTier) this.tier = opts.forceTier;

    var t = TIERS[this.tier];
    this.cfg = {
      nodes: opts.nodes || t.nodes,
      maxEdges: opts.maxEdges || t.edges,
      glow: opts.glow !== undefined ? opts.glow : t.glow,
      grain: opts.grain !== undefined ? opts.grain : t.grain,
      pulses: opts.pulses !== undefined ? opts.pulses : t.pulses,
      dprCap: opts.dprCap || t.dpr,
      autoRotate: opts.autoRotate !== undefined ? opts.autoRotate : 0.055,
      interactive: !!opts.interactive,
      background: opts.background || '#06070A',
      beam: opts.beam !== undefined ? opts.beam : true,
      warm: opts.warm || '#FFAE1A',
      cool: opts.cool || '#4C5BD4',
      bone: opts.bone || '#EAE6DC',
      fov: opts.fov || 3.6,
      scale: opts.scale || 0.36,
      seed: opts.seed || 20260911
    };

    this.reduced = prefersReducedMotion();
    this.progress = opts.progress || 0;      /* 0 … STATES.length-1 */
    this.targetProgress = this.progress;
    this.yaw = opts.yaw !== undefined ? opts.yaw : 0.6;
    this.pitch = opts.pitch !== undefined ? opts.pitch : -0.18;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.energy = 0;
    this.running = false;
    this.frames = 0;
    this.slowFrames = 0;

    this._build();
    this._sprites();
    this.grain = this.cfg.grain ? grainTile(72, this.cfg.seed) : null;
    this.resize();

    if (this.cfg.interactive) this._bindPointer();
    var self = this;
    this._onResize = function () { self.resize(); };
    global.addEventListener('resize', this._onResize, { passive: true });
  }

  NeuralField.STATES = STATES;
  NeuralField.detectTier = detectTier;

  NeuralField.prototype._build = function () {
    var n = this.cfg.nodes;
    var rand = rng(this.cfg.seed);

    /* Layer assignment drives both the `infer` shape and its edge family. */
    var layers = 6;
    var layerOf = new Uint8Array(n);
    var indexInLayer = new Uint16Array(n);
    var layerSize = new Uint16Array(layers);
    var weights = [0.13, 0.2, 0.22, 0.2, 0.15, 0.1];
    var acc = 0, bounds = [];
    for (var l = 0; l < layers; l++) { acc += weights[l]; bounds.push(acc); }
    for (var i = 0; i < n; i++) {
      var f = i / n, li = 0;
      while (li < layers - 1 && f > bounds[li]) li++;
      layerOf[i] = li;
      indexInLayer[i] = layerSize[li]++;
    }

    /* Cubic lattice cells, shuffled so the vault fills evenly rather than
       stacking the first N nodes into one corner. */
    var g = Math.ceil(Math.cbrt(n));
    var cells = [];
    for (var x = 0; x < g; x++)
      for (var y = 0; y < g; y++)
        for (var z = 0; z < g; z++) cells.push([x, y, z]);
    for (var s = cells.length - 1; s > 0; s--) {
      var j = Math.floor(rand() * (s + 1));
      var tmp = cells[s]; cells[s] = cells[j]; cells[j] = tmp;
    }

    var meta = {
      layers: layers, layerOf: layerOf, indexInLayer: indexInLayer,
      layerSize: layerSize, latticeGrid: g, latticeCell: cells.slice(0, n)
    };
    this.meta = meta;

    this.shapes = STATES.map(function (name) {
      return SHAPES[name](n, rng(this.cfg.seed + name.length * 7919), meta);
    }, this);

    this.pos = new Float32Array(n * 3);
    this.proj = new Float32Array(n * 3);   /* sx, sy, depth */

    this._edges(rand, meta);
  };

  NeuralField.prototype._edges = function (rand, meta) {
    var n = this.cfg.nodes;
    var bloom = this.shapes[STATES.indexOf('bloom')];
    var vault = this.shapes[STATES.indexOf('vault')];
    var edges = [];

    /* Proximity: k-nearest in the shell configuration. O(n²) once, on ≤260
       nodes — about 68k distance checks, under a millisecond. */
    var K = 3;
    for (var i = 0; i < n; i++) {
      var best = [];
      for (var j = 0; j < n; j++) {
        if (i === j) continue;
        var dx = bloom[i * 3] - bloom[j * 3];
        var dy = bloom[i * 3 + 1] - bloom[j * 3 + 1];
        var dz = bloom[i * 3 + 2] - bloom[j * 3 + 2];
        var d = dx * dx + dy * dy + dz * dz;
        if (best.length < K) { best.push([d, j]); best.sort(function (a, b) { return a[0] - b[0]; }); }
        else if (d < best[K - 1][0]) { best[K - 1] = [d, j]; best.sort(function (a, b) { return a[0] - b[0]; }); }
      }
      for (var b = 0; b < best.length; b++) {
        if (best[b][1] > i) edges.push({ a: i, b: best[b][1], fam: 'proximity', w: rand() < 0.72 ? 1 : -1 });
      }
    }

    /* Layer: each node wires forward into the next layer. */
    var byLayer = [];
    for (var l = 0; l < meta.layers; l++) byLayer.push([]);
    for (var q = 0; q < n; q++) byLayer[meta.layerOf[q]].push(q);
    for (var lx = 0; lx < meta.layers - 1; lx++) {
      var from = byLayer[lx], to = byLayer[lx + 1];
      for (var fi = 0; fi < from.length; fi++) {
        var fan = 2 + (rand() < 0.35 ? 1 : 0);
        for (var k = 0; k < fan; k++) {
          var tgt = to[Math.floor(rand() * to.length)];
          edges.push({ a: from[fi], b: tgt, fam: 'layer', w: rand() < 0.62 ? 1 : -1 });
        }
      }
    }

    /* Lattice: axis-aligned neighbours in the vault cube. */
    var step = 2.1 / (meta.latticeGrid - 1);
    var same = step * 0.5;
    for (var u = 0; u < n; u++) {
      for (var v = u + 1; v < n; v++) {
        var ex = Math.abs(vault[u * 3] - vault[v * 3]);
        var ey = Math.abs(vault[u * 3 + 1] - vault[v * 3 + 1]);
        var ez = Math.abs(vault[u * 3 + 2] - vault[v * 3 + 2]);
        var aligned = (ex < same ? 1 : 0) + (ey < same ? 1 : 0) + (ez < same ? 1 : 0);
        if (aligned === 2 && ex + ey + ez < step * 1.35) {
          edges.push({ a: u, b: v, fam: 'lattice', w: rand() < 0.5 ? 1 : -1 });
        }
      }
    }

    /* Trim to budget, keeping the families proportional. */
    if (edges.length > this.cfg.maxEdges) {
      var keep = this.cfg.maxEdges / edges.length;
      edges = edges.filter(function () { return rand() < keep; });
    }

    this.edgeA = new Uint16Array(edges.length);
    this.edgeB = new Uint16Array(edges.length);
    this.edgeW = new Int8Array(edges.length);
    this.edgeVis = new Float32Array(edges.length * STATES.length);
    for (var e = 0; e < edges.length; e++) {
      this.edgeA[e] = edges[e].a;
      this.edgeB[e] = edges[e].b;
      this.edgeW[e] = edges[e].w;
      var vis = EDGE_VIS[edges[e].fam];
      for (var st = 0; st < STATES.length; st++) this.edgeVis[e * STATES.length + st] = vis[st];
    }
    this.edgeCount = edges.length;

    this.pulses = [];
    for (var pz = 0; pz < this.cfg.pulses; pz++) {
      this.pulses.push({ e: Math.floor(rand() * this.edgeCount), t: rand(), speed: 0.5 + rand() * 0.9 });
    }
    this._rand = rand;
  };

  NeuralField.prototype._sprites = function () {
    var size = 34;
    this.spriteWarm = sprite(this.cfg.warm, size);
    this.spriteCool = sprite(this.cfg.cool, size);
    this.spriteBone = sprite(this.cfg.bone, size);
  };

  NeuralField.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, rect.width || this.canvas.clientWidth || 300);
    var h = Math.max(1, rect.height || this.canvas.clientHeight || 200);
    var dpr = Math.min(global.devicePixelRatio || 1, this.cfg.dprCap);
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.radius = Math.min(w, h) * this.cfg.scale;
    this._beam = null;
    this.render();
  };

  NeuralField.prototype.setProgress = function (p, immediate) {
    this.targetProgress = clamp(p, 0, STATES.length - 1);
    if (immediate || this.reduced) this.progress = this.targetProgress;
  };

  NeuralField.prototype.pulse = function (amount) {
    this.energy = Math.min(1.6, this.energy + (amount || 0.6));
  };

  NeuralField.prototype._bindPointer = function () {
    var self = this, dragging = false, lx = 0, ly = 0, moved = 0;
    var el = this.canvas;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';

    function down(e) {
      dragging = true; moved = 0;
      lx = (e.touches ? e.touches[0].clientX : e.clientX);
      ly = (e.touches ? e.touches[0].clientY : e.clientY);
      el.style.cursor = 'grabbing';
    }
    function move(e) {
      if (!dragging) return;
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      var cy = (e.touches ? e.touches[0].clientY : e.clientY);
      var dx = cx - lx, dy = cy - ly;
      lx = cx; ly = cy;
      moved += Math.abs(dx) + Math.abs(dy);
      self.yawVel += dx * 0.00042;
      self.pitchVel += dy * 0.00028;
      /* Only claim the gesture once it is clearly horizontal, so a vertical
         swipe still scrolls the page on touch. */
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

  NeuralField.prototype._project = function () {
    var n = this.cfg.nodes;
    var lo = Math.floor(this.progress);
    var hi = Math.min(STATES.length - 1, lo + 1);
    var t = smoothstep(this.progress - lo);
    var A = this.shapes[lo], B = this.shapes[hi];

    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var fov = this.cfg.fov, R = this.radius;
    var ox = this.w / 2, oy = this.h / 2;

    for (var i = 0; i < n; i++) {
      var i3 = i * 3;
      var x = A[i3] + (B[i3] - A[i3]) * t;
      var y = A[i3 + 1] + (B[i3 + 1] - A[i3 + 1]) * t;
      var z = A[i3 + 2] + (B[i3 + 2] - A[i3 + 2]) * t;

      var x1 = x * cy - z * sy;
      var z1 = x * sy + z * cy;
      var y1 = y * cp - z1 * sp;
      var z2 = y * sp + z1 * cp;

      var persp = fov / (fov + z2);
      this.proj[i3] = ox + x1 * R * persp;
      this.proj[i3 + 1] = oy + y1 * R * persp;
      this.proj[i3 + 2] = persp;
    }
    this._lo = lo; this._hi = hi; this._t = t;
  };

  NeuralField.prototype._drawBeam = function (ctx) {
    if (!this.cfg.beam) return;
    var R = Math.max(this.w, this.h) * 0.62;
    ctx.save();
    ctx.translate(this.w / 2, this.h * 0.5);
    ctx.scale(0.5, 1.15);   /* a tall ellipse: light falling down a column */
    if (!this._beam) {
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, 'rgba(76,91,212,0.22)');
      g.addColorStop(0.40, 'rgba(76,91,212,0.10)');
      g.addColorStop(0.74, 'rgba(255,174,26,0.045)');
      g.addColorStop(1, 'rgba(6,7,10,0)');
      this._beam = g;
    }
    ctx.fillStyle = this._beam;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  NeuralField.prototype.render = function () {
    var ctx = this.ctx;
    if (!ctx || !this.w) return;
    var S = STATES.length;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.cfg.background;
    ctx.fillRect(0, 0, this.w, this.h);
    this._drawBeam(ctx);

    this._project();
    var lo = this._lo, hi = this._hi, t = this._t;
    var proj = this.proj;
    var boost = 1 + this.energy * 0.5;

    ctx.globalCompositeOperation = 'lighter';

    /* Edges, bucketed by alpha and sign. Eight Path2D strokes per frame
       instead of a thousand — this is the single biggest win on mid-tier
       hardware, where per-call canvas state changes dominate. */
    var BUCKETS = 4;
    var warmPaths = [], coolPaths = [];
    for (var bI = 0; bI < BUCKETS; bI++) { warmPaths.push(new Path2D()); coolPaths.push(new Path2D()); }

    for (var e = 0; e < this.edgeCount; e++) {
      var base = e * S;
      var vis = this.edgeVis[base + lo] + (this.edgeVis[base + hi] - this.edgeVis[base + lo]) * t;
      if (vis < 0.05) continue;
      var a = this.edgeA[e] * 3, b = this.edgeB[e] * 3;
      var depth = (proj[a + 2] + proj[b + 2]) * 0.5;
      var alpha = vis * (depth - 0.55) * 1.5;
      if (alpha < 0.03) continue;
      var bi = clamp(Math.floor(alpha * BUCKETS), 0, BUCKETS - 1);
      var path = this.edgeW[e] > 0 ? warmPaths[bi] : coolPaths[bi];
      path.moveTo(proj[a], proj[a + 1]);
      path.lineTo(proj[b], proj[b + 1]);
    }

    ctx.lineWidth = 1;
    for (var p = 0; p < BUCKETS; p++) {
      var al = ((p + 0.55) / BUCKETS) * 0.36 * boost;
      ctx.globalAlpha = Math.min(0.75, al);
      ctx.strokeStyle = this.cfg.warm;
      ctx.stroke(warmPaths[p]);
      ctx.globalAlpha = Math.min(0.75, al * 0.9);
      ctx.strokeStyle = this.cfg.cool;
      ctx.stroke(coolPaths[p]);
    }

    /* Nodes */
    var n = this.cfg.nodes;
    var glow = this.cfg.glow;
    for (var i = 0; i < n; i++) {
      var i3 = i * 3;
      var d = proj[i3 + 2];
      if (d < 0.45) continue;
      var sz = (glow ? 19 : 10) * d * (0.72 + this.energy * 0.35);
      var alphaN = clamp((d - 0.5) * 1.9, 0, 1) * (glow ? 0.82 : 0.95);
      ctx.globalAlpha = alphaN;
      var spr = (i % 7 === 0) ? this.spriteBone : (i % 3 === 0 ? this.spriteCool : this.spriteWarm);
      ctx.drawImage(spr, proj[i3] - sz / 2, proj[i3 + 1] - sz / 2, sz, sz);
    }

    /* Signal pulses riding the visible edges */
    ctx.globalAlpha = 1;
    for (var q = 0; q < this.pulses.length; q++) {
      var pu = this.pulses[q];
      var eb = pu.e * S;
      var pv = this.edgeVis[eb + lo] + (this.edgeVis[eb + hi] - this.edgeVis[eb + lo]) * t;
      if (pv < 0.25) continue;
      var pa = this.edgeA[pu.e] * 3, pb = this.edgeB[pu.e] * 3;
      var px = proj[pa] + (proj[pb] - proj[pa]) * pu.t;
      var py = proj[pa + 1] + (proj[pb + 1] - proj[pa + 1]) * pu.t;
      var pd = proj[pa + 2] + (proj[pb + 2] - proj[pa + 2]) * pu.t;
      if (pd < 0.5) continue;
      var ps = 20 * pd * (0.8 + this.energy * 0.6);
      ctx.globalAlpha = Math.min(1, pv * pd * 1.1);
      ctx.drawImage(this.spriteBone, px - ps / 2, py - ps / 2, ps, ps);
    }

    /* Grain + vignette last, in normal blending */
    ctx.globalCompositeOperation = 'source-over';
    if (this.grain) {
      ctx.globalAlpha = 0.5;
      var pat = this._grainPattern || (this._grainPattern = ctx.createPattern(this.grain, 'repeat'));
      ctx.save();
      ctx.translate(-(this.frames * 3 % 72), -(this.frames * 5 % 72));
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, this.w + 72, this.h + 72);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  NeuralField.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this, last = performance.now();

    function frame(now) {
      if (!self.running) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      self.frames++;

      /* Frame-time governor: five seconds of sustained slowness drops a tier
         once, permanently, rather than oscillating. */
      if (dt > 0.028) self.slowFrames++; else self.slowFrames = Math.max(0, self.slowFrames - 1);
      if (self.slowFrames > 90 && self.cfg.glow) {
        self.cfg.glow = false;
        self.cfg.grain = false;
        self.grain = null;
        self.slowFrames = 0;
      }

      self.progress += (self.targetProgress - self.progress) * Math.min(1, dt * 5.2);
      if (!self.reduced) {
        self.yaw += self.yawVel + self.cfg.autoRotate * dt;
        self.pitch = clamp(self.pitch + self.pitchVel, -0.85, 0.85);
        self.yawVel *= 0.92;
        self.pitchVel *= 0.90;
        self.energy *= 0.94;
        for (var q = 0; q < self.pulses.length; q++) {
          var pu = self.pulses[q];
          pu.t += dt * pu.speed;
          if (pu.t > 1) {
            pu.t = 0;
            pu.e = Math.floor(self._rand() * self.edgeCount);
            pu.speed = 0.5 + self._rand() * 0.9;
          }
        }
      }
      self.render();
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  NeuralField.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  };

  NeuralField.prototype.destroy = function () {
    this.stop();
    global.removeEventListener('resize', this._onResize);
  };

  global.NeuralField = NeuralField;
}(window));
