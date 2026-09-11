/* ============================================================================
   TOTEM DEMO — Neural Field v2
   ----------------------------------------------------------------------------
   A 3D neural model, projected by hand onto a 2D canvas. No dependencies.

   Seven arrangements the model passes through as you scroll. Scroll also spins
   it — the morph and the rotation are driven by the same number, so the thing
   reads as one object being turned over and inspected rather than a slideshow.

   Two render modes:
     glow — additive light on a dark ground (dark theme)
     ink  — solid plotted marks on a pale ground (light theme)

   All colour comes in from the page, so the model recolours with the chapter.
   Porting to React Three Fiber later: the STATES table, the edge families and
   their per-state visibility are the part that carries over unchanged.
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var PI = Math.PI;
  var GOLDEN = PI * (3 - Math.sqrt(5));

  var STATES = ['seed', 'bloom', 'infer', 'settle', 'vault', 'ledger', 'core'];
  var NS = STATES.length;

  /* Node roles, drawn as different marks. A neural model has distinguishable
     units and drawing them identically is what made the first pass read flat. */
  var HIDDEN = 0, INPUT = 1, OUTPUT = 2, BIAS = 3;

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

  /* Hold, move, hold. The model sits still in its arrangement through the top
     and tail of a chapter and does all of its travelling, turning and morphing
     in the middle — which is what makes the change read as one deliberate drag
     across the page instead of a constant drift. The page uses the identical
     curve to move the stage, so every part of the transition is in step. */
  function dragEase(t) {
    return smoothstep(clamp((t - 0.18) / 0.64, 0, 1));
  }

  /* --------------------------------------------------------------------------
     Edge families. Each is generated once against the arrangement it belongs
     to, and carries a visibility weight in every state. Edges are never
     deleted — they fade — which is what makes the model appear to rewire
     itself instead of cutting between shapes.
     ------------------------------------------------------------------------ */
  var VIS = {
    /*          seed  bloom infer settle vault ledger core */
    helix:   [1.00, 0.14, 0.04, 0.06, 0.05, 0.06, 0.12],
    prox:    [0.10, 1.00, 0.05, 0.30, 0.10, 0.26, 0.42],
    spoke:   [0.06, 0.60, 0.06, 0.10, 0.08, 0.06, 1.00],
    layer:   [0.04, 0.08, 1.00, 0.05, 0.05, 0.08, 0.12],
    ring:    [0.03, 0.10, 0.04, 1.00, 0.06, 0.10, 0.38],
    arc:     [0.02, 0.06, 0.03, 0.85, 0.04, 0.05, 0.08],
    lattice: [0.03, 0.05, 0.03, 0.06, 1.00, 0.22, 0.06],
    riser:   [0.04, 0.06, 0.05, 0.05, 0.10, 1.00, 0.08]
  };
  /* How far an edge bows away from the model's centre. Corridors on the globe
     are great-circle arcs; everything else is straight. */
  var CURVE = { arc: 0.30, ring: 0.07, spoke: 0.04 };

  /*        seed  bloom  infer  settle  vault  ledger  core  */
  var POSE_YAW   = [0, 0.00, -0.35, 0.00,  0.12, -0.10, 0.00];
  var POSE_PITCH = [0, 0.00,  0.05, -0.10, 0.10,  0.50, 0.00];
  var POSE_SCALE = [1, 1.00,  0.80,  0.96, 0.92,  0.84, 1.10];

  /* Contextual annotations — two per arrangement, pinned to a real node and
     faded with the blend. They are the difference between "abstract dots" and
     "a model you are looking at". */
  var NOTES = [
    [['dormant', 0.10], ['2048 w', 0.72]],
    [['input x₀…xₙ', 0.06], ['σ activation', 0.55]],
    [['W₃ · 6 layers', 0.28], ['ŷ output', 0.94]],
    [['corridor 41', 0.18], ['T+0 settle', 0.66]],
    [['sha-256', 0.22], ['immutable', 0.78]],
    [['p99 38 ms', 0.14], ['31 deployments', 0.63]],
    [['commit', 0.04], ['one corridor', 0.48]]
  ];

  var TIERS = {
    high:   { nodes: 300, edges: 1500, pulses: 18, dpr: 2.0, notes: true },
    medium: { nodes: 210, edges: 950,  pulses: 12, dpr: 1.5, notes: true },
    low:    { nodes: 130, edges: 520,  pulses: 6,  dpr: 1.0, notes: true }
  };

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

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ======================================================================== */

  function NeuralField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tier = opts.forceTier || detectTier();
    var t = TIERS[this.tier];

    this.cfg = {
      nodes: opts.nodes || t.nodes,
      maxEdges: opts.maxEdges || t.edges,
      pulses: opts.pulses !== undefined ? opts.pulses : t.pulses,
      dprCap: opts.dprCap || t.dpr,
      notes: opts.notes !== undefined ? opts.notes : t.notes,
      interactive: opts.interactive !== false,
      autoRotate: opts.autoRotate !== undefined ? opts.autoRotate : 0,
      spinPerChapter: opts.spinPerChapter !== undefined ? opts.spinPerChapter : 0.62,
      fov: opts.fov || 3.9,
      scale: opts.scale || 0.33,
      seed: opts.seed || 731
    };

    this.mode = opts.mode || 'glow';
    this.colors = opts.colors || {
      accent: '#FFAE1A', accent2: '#4C5BD4', ink: '#EAE6DC', dim: '#7C8091', bg: '#06070A'
    };

    this.reduced = reducedMotion();
    this.progress = opts.progress || 0;
    this.targetProgress = this.progress;
    this.spinBase = 0.5;      /* auto-rotation + pointer drag accumulate here */
    this.scrollSpin = 0;      /* set by the page; the roll across the layout   */
    this.pitch = -0.16;
    this.yawVel = 0; this.pitchVel = 0;
    this.energy = 0;
    this.frames = 0; this.slowFrames = 0;
    this.running = false;

    this._build();
    this.resize();
    if (this.cfg.interactive) this._bindPointer();

    var self = this;
    this._onResize = function () { self.resize(); };
    global.addEventListener('resize', this._onResize, { passive: true });
  }

  NeuralField.STATES = STATES;
  NeuralField.detectTier = detectTier;
  NeuralField.dragEase = dragEase;

  /* --------------------------------------------------------------------------
     Arrangements
     ------------------------------------------------------------------------ */
  NeuralField.prototype._build = function () {
    var n = this.cfg.nodes;
    var rand = rng(this.cfg.seed);
    var i;

    var m = this.meta = {
      type: new Uint8Array(n),
      strand: new Uint8Array(n),
      outer: new Uint8Array(n),
      layerOf: new Uint8Array(n),
      idxInLayer: new Uint16Array(n),
      layerSize: new Uint16Array(6),
      layers: 6,
      latBand: new Uint8Array(n),
      bands: 11,
      cell: [],
      surface: new Uint8Array(n),
      riser: new Float32Array(n),
      inCore: new Uint8Array(n)
    };

    /* Layer assignment — a real taper, wide in the middle */
    var w = [0.11, 0.19, 0.23, 0.21, 0.16, 0.10], acc = 0, bounds = [];
    for (i = 0; i < 6; i++) { acc += w[i]; bounds.push(acc); }
    for (i = 0; i < n; i++) {
      var f = i / n, l = 0;
      while (l < 5 && f > bounds[l]) l++;
      m.layerOf[i] = l;
      m.idxInLayer[i] = m.layerSize[l]++;
      m.strand[i] = i % 2;
      m.outer[i] = rand() < 0.74 ? 1 : 0;
      m.latBand[i] = i % m.bands;
      m.inCore[i] = rand() < 0.62 ? 1 : 0;
      m.riser[i] = Math.pow(rand(), 1.9);
      m.type[i] = l === 0 ? INPUT : (l === 5 ? OUTPUT : (i % 13 === 0 ? BIAS : HIDDEN));
    }

    /* Vault cells: hollow shell of a cube, so it reads as a container rather
       than a solid cloud. Surface cells first, interior only if short. */
    var g = 6, surf = [], inner = [];
    for (var x = 0; x < g; x++) for (var y = 0; y < g; y++) for (var z = 0; z < g; z++) {
      var onFace = x === 0 || y === 0 || z === 0 || x === g - 1 || y === g - 1 || z === g - 1;
      (onFace ? surf : inner).push([x, y, z]);
    }
    function shuffle(a) {
      for (var s = a.length - 1; s > 0; s--) { var j = (rand() * (s + 1)) | 0; var q = a[s]; a[s] = a[j]; a[j] = q; }
      return a;
    }
    var cells = shuffle(surf).concat(shuffle(inner).map(function (c) { return [c[0] * 0.42 + 1.45, c[1] * 0.42 + 1.45, c[2] * 0.42 + 1.45]; }));
    m.cell = cells.slice(0, n);
    m.grid = g;
    for (i = 0; i < n; i++) m.surface[i] = i < surf.length ? 1 : 0;

    this.shapes = [
      this._seed(n, rng(11)), this._bloom(n, rng(22)), this._infer(n, rng(33)),
      this._settle(n, rng(44)), this._vault(n, rng(55)), this._ledger(n, rng(66)),
      this._core(n, rng(77))
    ];

    this.pos = new Float32Array(n * 3);
    this.proj = new Float32Array(n * 4);   /* sx, sy, depth, visible */
    this._edges(rand);
  };

  /* 00 — a twisted double helix column. Dormant, vertical, dense. */
  NeuralField.prototype._seed = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var a = t * TAU * 3.1 + m.strand[i] * PI;
      var r = 0.42 + 0.09 * Math.sin(t * PI * 3) + rand() * 0.04;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = (t - 0.5) * 3.05;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    return p;
  };

  /* 01 — two nested shells: an outer sensor surface and an inner core. */
  NeuralField.prototype._bloom = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;
      var rr = Math.sqrt(Math.max(0, 1 - y * y));
      var a = i * GOLDEN;
      var s = m.outer[i] ? 1.16 + (rand() - 0.5) * 0.10 : 0.50 + (rand() - 0.5) * 0.10;
      p[i * 3] = Math.cos(a) * rr * s;
      p[i * 3 + 1] = y * s;
      p[i * 3 + 2] = Math.sin(a) * rr * s;
    }
    return p;
  };

  /* 02 — six layers, each a ring. Rings read as layers from any angle, which
     a square grid does not once the model is turning. */
  NeuralField.prototype._infer = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    for (var i = 0; i < n; i++) {
      var l = m.layerOf[i], size = m.layerSize[l], k = m.idxInLayer[i];
      var inner = k % 2 === 1 && size > 14;
      var a = (k / size) * TAU + l * 0.31;
      var r = (inner ? 0.52 : 0.92) * (0.78 + 0.26 * Math.sin((l / 5) * PI));
      p[i * 3] = (l / 5 - 0.5) * 3.2;
      p[i * 3 + 1] = Math.cos(a) * r;
      p[i * 3 + 2] = Math.sin(a) * r;
    }
    return p;
  };

  /* 03 — a globe banded into latitude corridors. */
  NeuralField.prototype._settle = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    for (var i = 0; i < n; i++) {
      var b = m.latBand[i];
      var lat = (b / (m.bands - 1) - 0.5) * PI * 0.94;
      var lon = (i / n) * TAU * 6.2 + b * 0.4;
      var r = 1.22;
      p[i * 3] = Math.cos(lat) * Math.cos(lon) * r;
      p[i * 3 + 1] = Math.sin(lat) * r;
      p[i * 3 + 2] = Math.cos(lat) * Math.sin(lon) * r;
    }
    return p;
  };

  /* 04 — a hollow cube. Shell cells on the faces, a small solid core inside. */
  NeuralField.prototype._vault = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    var step = 2.2 / (m.grid - 1);
    for (var i = 0; i < n; i++) {
      var c = m.cell[i];
      p[i * 3] = -1.1 + c[0] * step;
      p[i * 3 + 1] = -1.1 + c[1] * step;
      p[i * 3 + 2] = -1.1 + c[2] * step;
    }
    return p;
  };

  /* 05 — a ledger plane with risers standing off it. A data landscape. */
  NeuralField.prototype._ledger = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    var cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    for (var i = 0; i < n; i++) {
      var cx = i % cols, cy = (i / cols) | 0;
      var x = (cx / (cols - 1) - 0.5) * 2.9;
      var z = (cy / Math.max(1, rows - 1) - 0.5) * 2.9;
      var stands = (i % 3 === 0);
      p[i * 3] = x;
      p[i * 3 + 1] = -0.75 + (stands ? m.riser[i] * 1.45 : 0.04 * Math.sin(x * 2.4 + z * 1.8));
      p[i * 3 + 2] = z;
    }
    return p;
  };

  /* 06 — collapse to a core, with one orbital ring still holding. */
  NeuralField.prototype._core = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    for (var i = 0; i < n; i++) {
      if (m.inCore[i]) {
        var y = 1 - (i / (n - 1)) * 2;
        var rr = Math.sqrt(Math.max(0, 1 - y * y));
        var a = i * GOLDEN, s = 0.10 + Math.pow(rand(), 3) * 0.20;
        p[i * 3] = Math.cos(a) * rr * s;
        p[i * 3 + 1] = y * s;
        p[i * 3 + 2] = Math.sin(a) * rr * s;
      } else {
        var t = (i / n) * TAU * 2.1;
        var orb = 1.05 + rand() * 0.10;
        p[i * 3] = Math.cos(t) * orb;
        p[i * 3 + 1] = Math.sin(t * 2) * 0.16;
        p[i * 3 + 2] = Math.sin(t) * orb;
      }
    }
    return p;
  };

  /* --------------------------------------------------------------------------
     Edges
     ------------------------------------------------------------------------ */
  NeuralField.prototype._edges = function (rand) {
    var n = this.cfg.nodes, m = this.meta, E = [], i, j;
    var bloom = this.shapes[1], vault = this.shapes[4], ledger = this.shapes[5];

    function add(a, b, fam) {
      if (a !== b) E.push({ a: a, b: b, fam: fam, w: rand() < 0.68 ? 1 : -1 });
    }

    /* helix — along each strand, plus rungs across */
    for (i = 0; i + 2 < n; i++) if (m.strand[i] === m.strand[i + 2]) add(i, i + 2, 'helix');
    for (i = 0; i + 1 < n; i += 2) add(i, i + 1, 'helix');

    /* prox — 3 nearest on the outer shell */
    var outerIdx = [];
    for (i = 0; i < n; i++) if (m.outer[i]) outerIdx.push(i);
    for (var oi = 0; oi < outerIdx.length; oi++) {
      i = outerIdx[oi];
      var best = [];
      for (var oj = 0; oj < outerIdx.length; oj++) {
        j = outerIdx[oj]; if (i === j) continue;
        var dx = bloom[i * 3] - bloom[j * 3], dy = bloom[i * 3 + 1] - bloom[j * 3 + 1], dz = bloom[i * 3 + 2] - bloom[j * 3 + 2];
        var d = dx * dx + dy * dy + dz * dz;
        if (best.length < 3) { best.push([d, j]); best.sort(function (p, q) { return p[0] - q[0]; }); }
        else if (d < best[2][0]) { best[2] = [d, j]; best.sort(function (p, q) { return p[0] - q[0]; }); }
      }
      for (var bi = 0; bi < best.length; bi++) if (best[bi][1] > i) add(i, best[bi][1], 'prox');
    }

    /* spoke — inner shell out to the surface, and core out to the orbit */
    for (i = 0; i < n; i++) {
      if (!m.outer[i] && outerIdx.length) add(i, outerIdx[(rand() * outerIdx.length) | 0], 'spoke');
      if (!m.inCore[i]) add(i, (rand() * n) | 0, 'spoke');
    }

    /* layer — feed-forward, with one lit path marked through the whole stack */
    var byLayer = [[], [], [], [], [], []];
    for (i = 0; i < n; i++) byLayer[m.layerOf[i]].push(i);
    for (var l = 0; l < 5; l++) {
      var from = byLayer[l], to = byLayer[l + 1];
      if (!to.length) continue;
      for (var fi = 0; fi < from.length; fi++) {
        var fan = 2 + (rand() < 0.4 ? 1 : 0);
        for (var k = 0; k < fan; k++) add(from[fi], to[(rand() * to.length) | 0], 'layer');
      }
    }

    /* ring — consecutive nodes within a latitude band, closing the loop */
    var bandMembers = [];
    for (i = 0; i < m.bands; i++) bandMembers.push([]);
    for (i = 0; i < n; i++) bandMembers[m.latBand[i]].push(i);
    for (var b = 0; b < m.bands; b++) {
      var mem = bandMembers[b];
      for (i = 0; i + 1 < mem.length; i++) add(mem[i], mem[i + 1], 'ring');
      if (mem.length > 2) add(mem[mem.length - 1], mem[0], 'ring');
    }

    /* arc — long-haul corridors between distant bands, drawn bowed */
    for (i = 0; i < Math.round(n * 0.22); i++) {
      var a1 = (rand() * n) | 0, a2 = (rand() * n) | 0;
      if (Math.abs(m.latBand[a1] - m.latBand[a2]) > 2) add(a1, a2, 'arc');
    }

    /* lattice — axis-aligned neighbours on the vault shell */
    var step = 2.2 / (m.grid - 1), same = step * 0.5;
    for (i = 0; i < n; i++) {
      if (!m.surface[i]) continue;
      for (j = i + 1; j < n; j++) {
        if (!m.surface[j]) continue;
        var ex = Math.abs(vault[i * 3] - vault[j * 3]);
        var ey = Math.abs(vault[i * 3 + 1] - vault[j * 3 + 1]);
        var ez = Math.abs(vault[i * 3 + 2] - vault[j * 3 + 2]);
        var aligned = (ex < same ? 1 : 0) + (ey < same ? 1 : 0) + (ez < same ? 1 : 0);
        if (aligned === 2 && ex + ey + ez < step * 1.35) add(i, j, 'lattice');
      }
    }

    /* riser — the ledger plane's own grid, plus the standing bars */
    var cols = Math.ceil(Math.sqrt(n));
    for (i = 0; i < n; i++) {
      if (i % cols !== cols - 1 && i + 1 < n) add(i, i + 1, 'riser');
      if (i + cols < n) add(i, i + cols, 'riser');
    }

    /* Give every family its own share of the budget. Trimming globally
       starved whichever families happened to be generated last, which left
       whole arrangements — the layered stack especially — nearly edgeless. */
    var SHARE = { helix: .10, prox: .16, spoke: .07, layer: .21,
                  ring: .14, arc: .06, lattice: .16, riser: .10 };
    var have = {};
    for (i = 0; i < E.length; i++) have[E[i].fam] = (have[E[i].fam] || 0) + 1;
    var keepRate = {};
    for (var fam in SHARE) {
      var allowed = SHARE[fam] * this.cfg.maxEdges;
      keepRate[fam] = have[fam] ? Math.min(1, allowed / have[fam]) : 1;
    }
    E = E.filter(function (e) { return rand() < keepRate[e.fam]; });

    var c = E.length;
    this.eA = new Uint16Array(c); this.eB = new Uint16Array(c);
    this.eW = new Int8Array(c); this.eCurve = new Float32Array(c);
    this.eVis = new Float32Array(c * NS);
    for (i = 0; i < c; i++) {
      this.eA[i] = E[i].a; this.eB[i] = E[i].b; this.eW[i] = E[i].w;
      this.eCurve[i] = CURVE[E[i].fam] || 0;
      var v = VIS[E[i].fam];
      for (var s = 0; s < NS; s++) this.eVis[i * NS + s] = v[s];
    }
    this.eCount = c;

    this.pulses = [];
    for (i = 0; i < this.cfg.pulses; i++) {
      this.pulses.push({ e: (rand() * c) | 0, t: rand(), speed: 0.45 + rand() * 0.8 });
    }
    this._rand = rand;

    /* Bind each annotation to a node at roughly the given position in the
       index range, so notes land on different parts of the model. */
    this.notes = NOTES.map(function (pair) {
      return pair.map(function (p) {
        return { text: p[0], node: Math.min(n - 1, Math.round(p[1] * (n - 1))) };
      });
    });
  };

  /* --------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  NeuralField.prototype.setTheme = function (mode, colors) {
    this.mode = mode;
    this.colors = colors;
  };

  NeuralField.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(global.devicePixelRatio || 1, this.cfg.dprCap);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* A phone's stage is a short, wide band — the column arrangement runs past
       the top and bottom of it at the desktop scale. */
    var narrow = (global.innerWidth || w) < 900;
    this.radius = Math.min(w, h) * this.cfg.scale * (narrow ? 0.80 : 1);
    this.render();
  };

  NeuralField.prototype.setProgress = function (p, immediate) {
    this.targetProgress = clamp(p, 0, NS - 1);
    if (immediate || this.reduced) this.progress = this.targetProgress;
  };
  NeuralField.prototype.pulse = function (a) { this.energy = Math.min(1.5, this.energy + (a || 0.6)); };

  NeuralField.prototype._bindPointer = function () {
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
     Projection and render
     ------------------------------------------------------------------------ */
  NeuralField.prototype._project = function () {
    var n = this.cfg.nodes;
    var lo = Math.floor(this.progress), hi = Math.min(NS - 1, lo + 1);
    var t = dragEase(this.progress - lo);
    var A = this.shapes[lo], B = this.shapes[hi];

    /* Scroll drives the spin as well as the morph — one number, so the model
       reads as being turned over rather than cutting between poses. */
    var yaw = this.spinBase + (this.scrollSpin || 0)
            + lerp(POSE_YAW[lo], POSE_YAW[hi], t);
    var pitch = clamp(this.pitch + lerp(POSE_PITCH[lo], POSE_PITCH[hi], t), -1.1, 1.1);
    this.viewYaw = yaw;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var fov = this.cfg.fov, ox = this.w / 2, oy = this.h / 2;
    var R = this.radius * lerp(POSE_SCALE[lo], POSE_SCALE[hi], t);

    for (var i = 0; i < n; i++) {
      var i3 = i * 3, i4 = i * 4;
      var x = lerp(A[i3], B[i3], t), y = lerp(A[i3 + 1], B[i3 + 1], t), z = lerp(A[i3 + 2], B[i3 + 2], t);
      var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var d = fov / (fov + z2);
      this.proj[i4] = ox + x1 * R * d;
      this.proj[i4 + 1] = oy + y1 * R * d;
      this.proj[i4 + 2] = d;
      this.proj[i4 + 3] = z2;
    }
    this._lo = lo; this._hi = hi; this._t = t;
  };

  NeuralField.prototype.render = function () {
    var ctx = this.ctx;
    if (!ctx || !this.w) return;
    var ink = this.mode === 'ink';
    var C = this.colors;

    ctx.setTransform(this.canvas.width / this.w, 0, 0, this.canvas.width / this.w, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, this.w, this.h);

    this._project();
    var lo = this._lo, hi = this._hi, t = this._t, P = this.proj;
    var boost = 1 + this.energy * 0.45;
    var cx = this.w / 2, cyc = this.h / 2;

    /* Additive light on a dark ground; plain compositing on a pale one, where
       'lighter' would wash everything to white. */
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';

    /* ---- edges, bucketed by opacity so the frame costs 8 strokes ---------- */
    var B = 4, warm = [], cool = [];
    for (var q = 0; q < B; q++) { warm.push(new Path2D()); cool.push(new Path2D()); }

    for (var e = 0; e < this.eCount; e++) {
      var base = e * NS;
      var vis = lerp(this.eVis[base + lo], this.eVis[base + hi], t);
      if (vis < 0.05) continue;
      var a4 = this.eA[e] * 4, b4 = this.eB[e] * 4;
      var depth = (P[a4 + 2] + P[b4 + 2]) * 0.5;
      var alpha = vis * (depth - 0.52) * 1.45;
      if (alpha < 0.035) continue;
      var bi = clamp((alpha * B) | 0, 0, B - 1);
      var path = this.eW[e] > 0 ? warm[bi] : cool[bi];
      var ax = P[a4], ay = P[a4 + 1], bx = P[b4], by = P[b4 + 1];
      path.moveTo(ax, ay);
      var cv = this.eCurve[e];
      if (cv > 0) {
        /* Bow the edge away from the model's centre — corridors over a globe. */
        var mx = (ax + bx) / 2, my = (ay + by) / 2;
        var vx = mx - cx, vy = my - cyc;
        var len = Math.sqrt(vx * vx + vy * vy) || 1;
        path.quadraticCurveTo(mx + (vx / len) * len * cv, my + (vy / len) * len * cv, bx, by);
      } else {
        path.lineTo(bx, by);
      }
    }

    ctx.lineWidth = ink ? 1.05 : 1;
    ctx.lineCap = 'round';
    for (var p2 = 0; p2 < B; p2++) {
      var al = ((p2 + 0.55) / B) * (ink ? 0.66 : 0.34) * boost;
      ctx.globalAlpha = Math.min(ink ? 0.72 : 0.7, al);
      ctx.strokeStyle = C.accent; ctx.stroke(warm[p2]);
      ctx.globalAlpha = Math.min(ink ? 0.60 : 0.62, al * 0.88);
      ctx.strokeStyle = C.accent2; ctx.stroke(cool[p2]);
    }

    /* ---- nodes, drawn by role ------------------------------------------- */
    var n = this.cfg.nodes, ty = this.meta.type;
    for (var i = 0; i < n; i++) {
      var i4 = i * 4, d = P[i4 + 2];
      var nx = P[i4], ny = P[i4 + 1];
      var a = clamp((d - 0.5) * 2.0, 0, 1);
      var role = ty[i];
      var r = (ink ? 2.7 : 2.4) * d * (0.85 + this.energy * 0.3);
      ctx.globalAlpha = a * (ink ? 0.92 : 0.9);

      if (role === INPUT || role === OUTPUT) {
        ctx.strokeStyle = role === INPUT ? C.accent2 : C.accent;
        ctx.lineWidth = ink ? 1.2 : 1.1;
        ctx.beginPath(); ctx.arc(nx, ny, r * 1.9, 0, TAU); ctx.stroke();
      } else if (role === BIAS) {
        ctx.fillStyle = C.ink;
        var s = r * 1.7;
        ctx.fillRect(nx - s / 2, ny - s / 2, s, s);
      } else {
        ctx.fillStyle = (i % 5 === 0) ? C.ink : ((i % 3 === 0) ? C.accent2 : C.accent);
        ctx.beginPath(); ctx.arc(nx, ny, r, 0, TAU); ctx.fill();
        if (!ink) {  /* a soft halo carries the glow mode */
          ctx.globalAlpha = a * 0.18;
          ctx.beginPath(); ctx.arc(nx, ny, r * 3.4, 0, TAU); ctx.fill();
        }
      }
    }

    /* ---- signal pulses --------------------------------------------------- */
    for (var u = 0; u < this.pulses.length; u++) {
      var pu = this.pulses[u], eb = pu.e * NS;
      var pv = lerp(this.eVis[eb + lo], this.eVis[eb + hi], t);
      if (pv < 0.25) continue;
      var pa = this.eA[pu.e] * 4, pb = this.eB[pu.e] * 4;
      var px2 = lerp(P[pa], P[pb], pu.t), py2 = lerp(P[pa + 1], P[pb + 1], pu.t);
      var pd = lerp(P[pa + 2], P[pb + 2], pu.t);
      if (pd < 0.55) continue;
      ctx.globalAlpha = Math.min(1, pv * pd);
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(px2, py2, (ink ? 2.2 : 2.6) * pd, 0, TAU); ctx.fill();
      if (!ink) {
        ctx.globalAlpha = Math.min(0.5, pv * pd * 0.4);
        ctx.beginPath(); ctx.arc(px2, py2, 9 * pd, 0, TAU); ctx.fill();
      }
    }

    /* ---- annotations ----------------------------------------------------- */
    if (this.cfg.notes) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textBaseline = 'middle';
      this._notes(ctx, lo, 1 - t);
      this._notes(ctx, hi, t);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  /* A leader line out to a label — the model annotated, like a schematic. */
  NeuralField.prototype._notes = function (ctx, state, alpha) {
    if (alpha < 0.06) return;
    var notes = this.notes[state], P = this.proj, C = this.colors;
    for (var i = 0; i < notes.length; i++) {
      var nd = notes[i].node * 4;
      var d = P[nd + 2];
      if (d < 0.6) continue;
      var x = P[nd], y = P[nd + 1];
      var right = x < this.w * 0.5;
      var lead = Math.min(52, this.w * 0.12);
      var ex = right ? x + lead : x - lead;

      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = C.dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(ex, y - 10); ctx.lineTo(ex + (right ? 8 : -8), y - 10);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.62;
      ctx.fillStyle = C.dim;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = C.ink;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.fillText(notes[i].text, ex + (right ? 12 : -12), y - 10);
    }
    ctx.textAlign = 'left';
  };

  NeuralField.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this, last = performance.now();
    function frame(now) {
      if (!self.running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      self.frames++;

      if (dt > 0.028) self.slowFrames++; else self.slowFrames = Math.max(0, self.slowFrames - 1);
      if (self.slowFrames > 90 && self.cfg.notes) { self.cfg.notes = false; self.slowFrames = 0; }

      self.progress += (self.targetProgress - self.progress) * Math.min(1, dt * 4.6);
      if (!self.reduced) {
        self.spinBase += self.yawVel + self.cfg.autoRotate * dt;
        self.pitch = clamp(self.pitch + self.pitchVel, -0.8, 0.8);
        self.yawVel *= 0.93; self.pitchVel *= 0.90;
        self.energy *= 0.945;
        for (var i = 0; i < self.pulses.length; i++) {
          var pu = self.pulses[i];
          pu.t += dt * pu.speed;
          if (pu.t > 1) { pu.t = 0; pu.e = (self._rand() * self.eCount) | 0; pu.speed = 0.45 + self._rand() * 0.8; }
        }
      }
      self.render();
      self._raf = requestAnimationFrame(frame);
    }
    this._raf = requestAnimationFrame(frame);
  };

  NeuralField.prototype.stop = function () { this.running = false; if (this._raf) cancelAnimationFrame(this._raf); };

  global.NeuralField = NeuralField;
}(window));
