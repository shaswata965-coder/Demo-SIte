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

  /* A short settle at the top of a chapter, then the move runs the rest of the
     way and lands exactly as the next chapter's copy arrives.

     The model holds its arrangement while you read, then travels the rest of
     the chapter and lands as the next copy arrives. The move spans 70% of a
     1.8-viewport chapter — the same scroll distance as 64% of a 2-viewport one,
     so the transition takes just as long as before. The page moves the stage on
     this identical curve, so every part stays in step. */
  function dragEase(t) {
    return smoothstep(clamp((t - 0.30) / 0.70, 0, 1));
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
    /* prox lifted at rest so the opening frame carries more than one hue */
    prox:    [0.26, 1.00, 0.05, 0.30, 0.10, 0.26, 0.42],
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

  /* 0 primary — the structure itself. 1 secondary — wiring that runs between
     structures. 2 signal — reserved for what is live, nothing else. */
  /* Index order is load-bearing: C_SIGNAL must stay 2, because the traced
     inference and the output terminals reach for PAL[C_SIGNAL] directly. */
  var C_PRIMARY = 0, C_SECOND = 1, C_SIGNAL = 2, C_THIRD = 3;
  /* Spread across all four, one family at a time, rather than clustered two
     and two. Orange still leads — it holds the coil and the risers, which are
     the families that dominate the opening and closing arrangements — but no
     single arrangement is now built out of one hue, which is what made the
     whole page read as monochrome however the page's own palette was set. */
  var FAM_COLOR = {
    helix: C_PRIMARY, riser: C_PRIMARY,
    prox: C_SECOND, layer: C_SECOND, ring: C_SECOND,
    lattice: C_THIRD, spoke: C_THIRD, arc: C_THIRD
  };

  /*        seed  bloom  infer  settle  vault  ledger  core  */
  var POSE_YAW   = [0, 0.00, -0.05, 0.00,  0.12,  0.28, 0.00];
  var POSE_PITCH = [0, 0.00,  0.05, -0.10, 0.10,  0.50, 0.30];
  var POSE_SCALE = [1, 0.94,  0.70,  0.88, 0.78,  0.47, 0.95];

  var TIERS = {
    high:   { nodes: 420, edges: 2100, pulses: 22, dpr: 2.0 },
    medium: { nodes: 300, edges: 1400, pulses: 14, dpr: 1.5 },
    low:    { nodes: 190, edges: 850,  pulses: 8,  dpr: 1.0 }
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

  /* ======================================================================== */

  function NeuralField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tier = opts.forceTier || detectTier();
    var t = TIERS[this.tier];

    /* A full-screen stage is four times the area of a laptop one and needs the
       units to match, or the model reads as dust scattered in a void. */
    var box = canvas.getBoundingClientRect();
    var area = Math.max(1, (box.width || 700) * (box.height || 800));
    /* The stage is the whole viewport now, so the reference area is a whole
       viewport too — otherwise every desktop would read as "huge stage" and
       inflate the unit count past what the frame budget allows. */
    var density = Math.max(0.80, Math.min(1.25, Math.sqrt(area / 1200000)));

    this.cfg = {
      nodes: opts.nodes || Math.round(t.nodes * density),
      maxEdges: opts.maxEdges || Math.round(t.edges * Math.min(1.08, density)),
      pulses: opts.pulses !== undefined ? opts.pulses : t.pulses,
      dprCap: opts.dprCap || t.dpr,
      interactive: opts.interactive !== false,
      autoRotate: opts.autoRotate !== undefined ? opts.autoRotate : 0,
      spinPerChapter: opts.spinPerChapter !== undefined ? opts.spinPerChapter : 0.62,
      fov: opts.fov || 3.9,
      scale: opts.scale || 0.30,
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
    /* Where the model sits inside the canvas, and how big it is drawn, both as
       plain numbers the page writes every frame. The canvas itself never moves
       or resizes — it is the viewport. Travel is the origin sliding; going
       full-screen behind the copy is the zoom opening up. Doing it this way
       keeps the backing store fixed, so nothing reallocates mid-scroll and
       nothing is scaled up by CSS and blurred. */
    this.originX = 0.5;
    this.originY = 0.5;
    this.zoom = 1;
    /* Residual centring, carried between frames. See _project. */
    this._corrX = 0; this._corrY = 0;
    /* 1 draws every edge the arrangement has; below that the faintest are
       dropped. The page turns this down when the model is a dimmed backdrop —
       an edge at 12% alpha behind a stage at 28% opacity is not visible, and
       edge fill area is the entire frame cost. See `detail` in js/app.js. */
    this.detail = 1;
    /* How far the model has come apart into the page, 0..1, and where each
       unit goes when it has: two numbers per unit, in viewport pixels. Both
       are the page's to write, every frame — see "taken apart" in _project. */
    this.scatter = 0;
    this.targets = null;
    this.yawVel = 0; this.pitchVel = 0;
    this.energy = 0;
    this.t = 0;
    this.frames = 0;
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
       than a solid cloud. The grid is sized to the unit count — a fixed 6³
       holds only 216 cells and silently runs out once the model gets denser. */
    var g = Math.max(6, Math.ceil(Math.cbrt(n * 1.3)));
    var surf = [], inner = [];
    for (var x = 0; x < g; x++) for (var y = 0; y < g; y++) for (var z = 0; z < g; z++) {
      var onFace = x === 0 || y === 0 || z === 0 || x === g - 1 || y === g - 1 || z === g - 1;
      (onFace ? surf : inner).push([x, y, z]);
    }
    function shuffle(a) {
      for (var s = a.length - 1; s > 0; s--) { var j = (rand() * (s + 1)) | 0; var q = a[s]; a[s] = a[j]; a[j] = q; }
      return a;
    }
    var surfCount = surf.length;
    /* Interior cells are pulled into the middle half so they read as a core
       inside the shell rather than a second, slightly smaller shell. */
    var cells = shuffle(surf).concat(shuffle(inner).map(function (c) {
      return [c[0] * 0.5 + g * 0.25, c[1] * 0.5 + g * 0.25, c[2] * 0.5 + g * 0.25];
    }));
    while (cells.length < n) cells.push(cells[cells.length % Math.max(1, surfCount)]);
    m.cell = cells.slice(0, n);
    m.grid = g;
    for (i = 0; i < n; i++) m.surface[i] = i < surfCount ? 1 : 0;

    this.shapes = [
      this._seed(n, rng(11)), this._bloom(n, rng(22)), this._infer(n, rng(33)),
      this._settle(n, rng(44)), this._vault(n, rng(55)), this._ledger(n, rng(66)),
      this._core(n, rng(77))
    ];

    /* Each arrangement is centred on its own robust bounding box before it is
       ever projected. They are not written centred and several are markedly
       not: the ledger is a plane at y -0.75 with a third of its units standing
       off it, so it drew 57px below the origin the page had put it on, and the
       collapsed core drew 31px above. Measured at 1440x900, before this:
       seed +22y, vault +21x/-16y, infer -13x, core -31y, ledger +57y.

       Percentiles rather than min/max, so one stray unit cannot drag the whole
       model sideways. Subtracting this in model space fixes two things at
       once: the arrangement sits where the page put it, and it now spins about
       its own middle instead of orbiting a point off to one side. */
    this.centres = this.shapes.map(function (shape) {
      var c = [0, 0, 0];
      for (var ax = 0; ax < 3; ax++) {
        var v = new Float64Array(n);
        for (var i = 0; i < n; i++) v[i] = shape[i * 3 + ax];
        v.sort();
        var loI = Math.floor(n * 0.02), hiI = Math.min(n - 1, Math.ceil(n * 0.98));
        c[ax] = (v[loI] + v[hiI]) * 0.5;
      }
      return c;
    });

    this.pos = new Float32Array(n * 3);
    this.proj = new Float32Array(n * 4);   /* sx, sy, depth, visible */
    this.phase = new Float32Array(n);
    for (i = 0; i < n; i++) this.phase[i] = (i * 0.61803398875 % 1) * TAU;

    /* Each unit leaves on its own beat and along its own arc, so the model
       comes apart as a swarm rather than as one shape sliding across. sK is
       how far each one has gone this frame; the edges read it. */
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
    this._edges(rand);
  };

  /* 00 — a twisted double helix column. Dormant, vertical, dense. */
  NeuralField.prototype._seed = function (n, rand) {
    var p = new Float32Array(n * 3), m = this.meta;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var a = t * TAU * 3.7 + m.strand[i] * PI * 0.34;
      var r = 0.74 + 0.14 * Math.sin(t * PI * 3) + rand() * 0.05;
      p[i * 3] = Math.cos(a) * r;
      p[i * 3 + 1] = (t - 0.5) * 2.45;
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
      /* One ring per layer, tapering in and out again, with each layer given a
         small twist so the rings do not stack into a single silhouette. */
      var a = (k / size) * TAU + l * 0.26;
      var r = 0.62 + 0.44 * Math.sin((l / 5) * PI);
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
        /* The orbit is tilted out of the horizontal plane, or it projects as a
           flat ribbon and the closing frame has no height to it. */
        var t = (i / n) * TAU * 2.1;
        var orb = 1.02 + rand() * 0.12;
        var ox = Math.cos(t) * orb, oz = Math.sin(t) * orb;
        p[i * 3] = ox;
        p[i * 3 + 1] = oz * 0.62;
        p[i * 3 + 2] = oz * 0.78;
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
    for (i = 0; i + 1 < n; i += 8) add(i, i + 1, 'helix');

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
    var coreIdx = [];
    for (i = 0; i < n; i++) if (m.inCore[i]) coreIdx.push(i);
    for (i = 0; i < n; i++) {
      if (!m.outer[i] && outerIdx.length) add(i, outerIdx[(rand() * outerIdx.length) | 0], 'spoke');
      /* Orbital units tie back into the core so the collapse reads as radial. */
      if (!m.inCore[i] && coreIdx.length) add(i, coreIdx[(rand() * coreIdx.length) | 0], 'spoke');
    }

    /* layer — feed-forward. Wiring each unit to *random* units in the next
       layer produced a ball of long crossing lines that read as noise from
       every angle. Fanning to the angularly nearest units instead gives the
       braided structure a layered network actually has. */
    var infer = this.shapes[2];
    var angleOf = new Float32Array(n);
    for (i = 0; i < n; i++) angleOf[i] = Math.atan2(infer[i * 3 + 2], infer[i * 3 + 1]);

    function angDist(a, b) {
      var d = Math.abs(a - b) % TAU;
      return d > PI ? TAU - d : d;
    }

    var byLayer = [[], [], [], [], [], []];
    for (i = 0; i < n; i++) byLayer[m.layerOf[i]].push(i);

    function nearestIn(list, a, count) {
      var scored = list.map(function (j) { return [angDist(angleOf[j], a), j]; });
      scored.sort(function (x, y) { return x[0] - y[0]; });
      return scored.slice(0, count).map(function (x) { return x[1]; });
    }

    for (var l = 0; l < 5; l++) {
      var from = byLayer[l], to = byLayer[l + 1];
      if (!to.length) continue;
      for (var fi = 0; fi < from.length; fi++) {
        var targets = nearestIn(to, angleOf[from[fi]], 2 + (rand() < 0.3 ? 1 : 0));
        for (var k = 0; k < targets.length; k++) add(from[fi], targets[k], 'layer');
      }
    }

    /* One lit path from an input unit all the way to an output — a single
       inference, traced through the stack. Drawn brighter and heavier. */
    var hot = {};
    if (byLayer[0].length) {
      var cur = byLayer[0][(rand() * byLayer[0].length) | 0];
      for (var hl = 0; hl < 5; hl++) {
        var nextList = byLayer[hl + 1];
        if (!nextList.length) break;
        var nxt = nearestIn(nextList, angleOf[cur], 3)[(rand() * 3) | 0];
        if (nxt === undefined) break;
        hot[Math.min(cur, nxt) + ':' + Math.max(cur, nxt)] = 1;
        add(cur, nxt, 'layer');
        cur = nxt;
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
    E = E.filter(function (e) {
      var key = Math.min(e.a, e.b) + ':' + Math.max(e.a, e.b);
      return hot[key] || rand() < keepRate[e.fam];
    });

    var c = E.length;
    this.eA = new Uint16Array(c); this.eB = new Uint16Array(c);
    this.eW = new Int8Array(c); this.eCurve = new Float32Array(c);
    this.eHot = new Uint8Array(c);
    this.eColor = new Uint8Array(c);
    this.eVis = new Float32Array(c * NS);
    for (i = 0; i < c; i++) {
      this.eA[i] = E[i].a; this.eB[i] = E[i].b; this.eW[i] = E[i].w;
      this.eCurve[i] = CURVE[E[i].fam] || 0;
      this.eColor[i] = FAM_COLOR[E[i].fam] || 0;
      this.eHot[i] = hot[Math.min(E[i].a, E[i].b) + ':' + Math.max(E[i].a, E[i].b)] ? 1 : 0;
      var v = VIS[E[i].fam];
      for (var s = 0; s < NS; s++) this.eVis[i * NS + s] = v[s];
    }
    this.eCount = c;

    this.pulses = [];
    for (i = 0; i < this.cfg.pulses; i++) {
      this.pulses.push({ e: (rand() * c) | 0, t: rand(), speed: 0.45 + rand() * 0.8 });
    }
    this._rand = rand;
  };

  /* --------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  NeuralField.prototype._glow = function (color) {
    var cache = this._spriteCache || (this._spriteCache = {});
    var hit = cache[color];
    if (hit) return hit;
    var keys = Object.keys(cache);
    if (keys.length > 9) delete cache[keys[0]];
    var size = 64;
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d');
    var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.16, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    cache[color] = cv;
    return cv;
  };

  NeuralField.prototype.setTheme = function (mode, colors) {
    this.mode = mode;
    this.colors = colors;   /* { pal: [6 hues], ink, dim } */
  };

  NeuralField.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    var budget = Math.sqrt(2.6e6 / Math.max(1, w * h));
    var dpr = Math.max(1, Math.min(global.devicePixelRatio || 1, this.cfg.dprCap, budget));
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Sized off the short edge of the viewport and capped, so a 4K or an
       ultrawide monitor does not draw a model three times the size of the one
       on a laptop. How big it reads per chapter is `zoom`, which the page
       owns — see CHAPTERS in js/app.js. */
    this.radius = Math.min(w, h, 1150) * this.cfg.scale;
    /* The unzoomed unit. Line width is sized off this rather than off `u`,
       because zooming the model must not thicken every stroke — see the
       lineWidth note below. */
    this.uBase = clamp(this.radius / 220, 0.8, 2.4);
    /* Mark scale. 220 is the radius this was originally drawn against, so
       u === 1 reproduces that look and everything tracks the model from
       there. Clamped so a tiny panel stays legible and a 4K stage does not
       render clown-sized dots. */
    this.u = clamp(this.radius * this.zoom / 220, 0.7, 2.4);
    this.render();
  };

  /* How far arrangement `state` stands above and below the point it is
     centred on, in canvas pixels, at its resting pose and the given zoom — the
     same projection as _project(), without the idle wander. The page uses it
     to line a section's copy up with the model's top and bottom. */
  NeuralField.prototype.extentY = function (state, zoom) {
    var s = clamp(state | 0, 0, NS - 1), P = this.shapes[s], c = this.centres[s];
    var yaw = (this.spinBase || 0) + POSE_YAW[s];
    var pitch = clamp(this.pitch + POSE_PITCH[s], -1.1, 1.1);
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var R = this.radius * zoom * POSE_SCALE[s], fov = this.cfg.fov;
    var lo = 1e9, hi = -1e9;
    for (var i = 0; i < this.cfg.nodes; i++) {
      var x = P[i * 3] - c[0], y = P[i * 3 + 1] - c[1], z = P[i * 3 + 2] - c[2];
      var z1 = x * sy + z * cy;
      var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var py = y1 * R * fov / (fov + z2);
      if (py < lo) lo = py; if (py > hi) hi = py;
    }
    return { top: lo, bottom: hi };
  };

  /* How far arrangement `state` can reach sideways from its centre, as a
     multiple of the drawn radius at zoom 1: its widest unit's distance from
     the vertical axis, times its pose scale. Yaw is the only rotation that
     moves a unit across the screen, and it can swing any unit side-on, so this
     bounds the arrangement at every angle it will be turned to. The page uses
     it to wire the copy towards the model without touching it. */
  NeuralField.prototype.reach = function (state) {
    var s = clamp(state | 0, 0, NS - 1), P = this.shapes[s], c = this.centres[s], m = 0;
    for (var i = 0; i < this.cfg.nodes; i++) {
      var x = P[i * 3] - c[0], z = P[i * 3 + 2] - c[2];
      if (x * x + z * z > m) m = x * x + z * z;
    }
    return Math.sqrt(m) * POSE_SCALE[s];
  };

  /* Take the model apart into the page. `amount` 0 is the model whole, 1 is
     every unit sitting on its target; `targets` is [x0, y0, x1, y1, …] in
     viewport pixels, one pair per unit (reused round-robin if short). */
  NeuralField.prototype.setScatter = function (amount, targets) {
    this.scatter = clamp(amount, 0, 1);
    if (targets) this.targets = targets;
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
    var fov = this.cfg.fov;
    /* Where the page asked for the model, plus the correction measured last
       frame. Centring the geometry in model space is not enough on its own:
       the projection is perspective, so a shape that is symmetric in 3D still
       lands off-centre once one side of it is nearer the camera, and each
       arrangement's pose pitch tilts it further. Measured at 1440x900 with
       the geometry already centred, the residual ran from 13px (infer) to
       81px (ledger) — enough to read as "the model is not in its slot".

       So the residual is measured from the drawn result and fed back, rather
       than solved for: project, compare the bounding box centre with the
       target, and take a fraction of the difference into the next frame. It
       converges in a few frames, costs one subtraction per point, and follows
       the pose continuously instead of needing a constant per arrangement. */
    var tgtX = this.w * this.originX, tgtY = this.h * this.originY;
    var ox = tgtX + this._corrX, oy = tgtY + this._corrY;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    var R = this.radius * this.zoom * lerp(POSE_SCALE[lo], POSE_SCALE[hi], t);
    /* Marks track the model, not the canvas, so a backgrounded model at zoom
       1.4 draws heavier nodes and the thing stays one object rather than a
       cloud of the same dust spread wider. Line width is the exception and
       uses uBase — see the lineWidth note in render(). */
    this.u = clamp(this.radius * this.zoom / 220, 0.7, 2.4);

    /* Blended with the morph, so the model stays centred through a transition
       rather than sliding as one arrangement's offset gives way to the next. */
    var CA = this.centres[lo], CB = this.centres[hi];
    var kx = lerp(CA[0], CB[0], t), ky = lerp(CA[1], CB[1], t), kz = lerp(CA[2], CB[2], t);

    var T = this.t;
    var tg = this.targets, S = tg && tg.length ? this.scatter : 0;
    var tn = S ? tg.length >> 1 : 0, SK = this.sK;
    for (var i = 0; i < n; i++) {
      var i3 = i * 3, i4 = i * 4;
      var x = lerp(A[i3], B[i3], t) - kx,
          y = lerp(A[i3 + 1], B[i3 + 1], t) - ky,
          z = lerp(A[i3 + 2], B[i3 + 2], t) - kz;
      /* Two incommensurate sines per axis so the wander never loops visibly. */
      var ph = this.phase[i];
      x += Math.sin(T * 0.53 + ph) * 0.016;
      y += Math.sin(T * 0.41 + ph * 1.7) * 0.016;
      z += Math.cos(T * 0.47 + ph * 2.3) * 0.016;
      var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var d = fov / (fov + z2);
      var px = ox + x1 * R * d, py = oy + y1 * R * d;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;

      /* Taken apart. Past its own delay a unit leaves the arrangement and
         travels — on an arc, eased — to the point the page has given it: a
         bead on one of the section's links, or a place on the ring around one
         of its cards. On arrival it is flat (depth 1, every unit facing you)
         and keeps a pixel or two of its own wander, so the scaffold it forms
         still breathes. The bounding box above is taken before this, so the
         centring feedback only ever sees the model, never the page. */
      var k = 0;
      if (S > 0) {
        k = clamp((S - this.sDelay[i]) / 0.65, 0, 1);
        k = k * k * (3 - 2 * k);
        if (k > 0) {
          var j = (i % tn) * 2, bow = Math.sin(k * PI);
          var tx = tg[j] + Math.sin(T * 0.9 + ph) * 1.8;
          var ty = tg[j + 1] + Math.cos(T * 0.7 + ph * 1.3) * 1.8;
          px += (tx - px) * k + this.sArcX[i] * bow;
          py += (ty - py) * k + this.sArcY[i] * bow;
          d += (1 - d) * k;
        }
      }
      SK[i] = k;

      this.proj[i4] = px;
      this.proj[i4 + 1] = py;
      this.proj[i4 + 2] = d;
      this.proj[i4 + 3] = z2;
    }

    /* Feed the residual back. A quarter of it per frame settles inside about
       eight frames — fast enough to be invisible, slow enough that the idle
       wander cannot make the model swim. A large residual means the pose just
       jumped (first paint, a resize, a chapter skipped via the rail), so that
       one is taken whole rather than crawled towards over half a second. */
    var resX = tgtX - (minX + maxX) * 0.5, resY = tgtY - (minY + maxY) * 0.5;
    var snap = (Math.abs(resX) > 150 || Math.abs(resY) > 150) ? 1 : 0.25;
    this._corrX += resX * snap;
    this._corrY += resY * snap;

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
    var cx = this.w * this.originX, cyc = this.h * this.originY;
    var T = this.t;

    /* Additive light on a dark ground; plain compositing on a pale one, where
       'lighter' would wash everything to white. */
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';

    /* ---- edges, bucketed by opacity so the frame costs 8 strokes ---------- */
    var PAL = C.pal;
    /* Edge fill area is the whole frame cost, and it grows with zoom: a model
       drawn at 1.34 has edges a third longer. So the cutoff rises as the model
       is dimmed — the edges dropped are the ones already below the threshold
       of visible at that opacity. Full strength keeps the original 0.115. */
    var cut = 0.115 + (1 - clamp(this.detail, 0, 1)) * 0.38;
    var SKr = this.sK, whole = 1 - this.scatter;
    var B = 3, lanes = [], used = [], hotPath = null, hotVis = 0;
    for (var q = 0; q < PAL.length; q++) {
      lanes.push([]); used.push([]);
      for (var bq = 0; bq < B; bq++) { lanes[q].push(new Path2D()); used[q].push(0); }
    }

    for (var e = 0; e < this.eCount; e++) {
      var base = e * NS;
      var vis = lerp(this.eVis[base + lo], this.eVis[base + hi], t);
      if (vis < 0.05) continue;
      var a4 = this.eA[e] * 4, b4 = this.eB[e] * 4;
      /* A unit that has left the model takes its edges with it — drawn between
         two points of the page they would be streaks across the screen. */
      var gone = SKr[this.eA[e]] > SKr[this.eB[e]] ? SKr[this.eA[e]] : SKr[this.eB[e]];
      if (gone > 0.85) continue;
      var depth = (P[a4 + 2] + P[b4 + 2]) * 0.5;
      var alpha = vis * (depth - 0.52) * 1.45 * (1 - gone) * (1 - gone);
      if (alpha < cut) continue;
      var bi = clamp((alpha * B) | 0, 0, B - 1);
      var lc = this.eColor[e];
      var path = this.eHot[e] ? (hotPath || (hotPath = new Path2D())) : lanes[lc][bi];
      if (this.eHot[e]) hotVis = Math.max(hotVis, vis); else used[lc][bi] = 1;
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

    /* Line width does NOT scale with the model. Edge fill area is count ×
       length × width, and it is the entire frame cost; scaling width with the
       model tripled the blended area at 2560 for no visual gain. uBase is the
       unzoomed unit, so a backgrounded model at zoom 1.34 gets longer edges
       but not fatter ones. */
    ctx.lineWidth = (ink ? 1.05 : 1) * Math.min(1.35, 0.6 + this.uBase * 0.38);
    ctx.lineCap = 'butt';
    /* Only two or three families are visible in any one arrangement, so most
       of the eighteen lanes are empty — stroking them still costs a call. */
    for (var ln = 0; ln < PAL.length; ln++) {
      var anyUsed = used[ln][0] | used[ln][1] | used[ln][2];
      if (!anyUsed) continue;
      ctx.strokeStyle = PAL[ln];
      for (var p2 = 0; p2 < B; p2++) {
        if (!used[ln][p2]) continue;
        var al = ((p2 + 0.6) / B) * (ink ? 0.62 : 0.40) * boost;
        ctx.globalAlpha = Math.min(ink ? 0.70 : 0.72, al);
        ctx.stroke(lanes[ln][p2]);
      }
    }

    /* The traced inference, over the top of the rest of the stack. */
    if (hotPath) {
      ctx.lineWidth = Math.min(2.6, 1.2 + this.u * 0.7);
      ctx.globalAlpha = Math.min(1, hotVis * (ink ? 0.9 : 0.95)) * whole * whole;
      ctx.strokeStyle = PAL[C_SIGNAL];
      ctx.stroke(hotPath);
    }

    /* ---- nodes, drawn by role ------------------------------------------- */
    /* Batched the same way the edges are. Issuing beginPath/arc/fill per unit
       is four canvas calls each and arcs are expensive to tessellate; at four
       hundred units that alone was most of the frame. Units are collected into
       a path per colour and depth bucket and filled in one call apiece. */
    var n = this.cfg.nodes, ty = this.meta.type;
    var NB = 3;
    /* Hidden units cycle three hues by layer rather than alternating two, so
       a layered arrangement banded in one colour now bands in three. Inputs
       and outputs keep the two the copy uses for "in" and "out", so the ends
       of the model stay readable at a glance. */
    var DOT = [PAL[C_PRIMARY], PAL[C_SECOND], PAL[C_THIRD]];
    var RING = [PAL[C_PRIMARY], PAL[C_SIGNAL]];
    var dots = [], rings = [], bias = new Path2D();
    for (var ci = 0; ci < DOT.length; ci++) {
      dots.push([]);
      for (var bb = 0; bb < NB; bb++) dots[ci].push(new Path2D());
    }
    for (ci = 0; ci < RING.length; ci++) {
      rings.push([]);
      for (bb = 0; bb < NB; bb++) rings[ci].push(new Path2D());
    }
    var halo = [];   /* flat x, y, r, colourIndex, alpha — no per-unit objects */
    var dotUsed = [0, 0, 0];

    for (var i = 0; i < n; i++) {
      var i4 = i * 4, d = P[i4 + 2];
      var nx = P[i4], ny = P[i4 + 1];
      /* Each unit fires on its own slow cycle, so the model shimmers rather
         than sitting still. Sharpened with a power curve: mostly quiet, with
         a brief bright peak, the way an activation actually behaves. */
      var fire = Math.pow((Math.sin(T * 1.35 + this.phase[i]) + 1) * 0.5, 3);
      var a = clamp((d - 0.5) * 2.0, 0, 1) * (0.72 + fire * 0.42);
      var bk = clamp((a * NB) | 0, 0, NB - 1);
      var role = ty[i];
      var r = (ink ? 2.7 : 2.4) * this.u * d * (0.78 + fire * 0.5 + this.energy * 0.3);

      if (role === INPUT || role === OUTPUT) {
        var rr = r * 1.9, rc = role === INPUT ? 0 : 1, rp = rings[rc][bk];
        rp.moveTo(nx + rr, ny);
        rp.arc(nx, ny, rr, 0, TAU);
      } else if (role === BIAS) {
        var sq = r * 1.7;
        bias.rect(nx - sq / 2, ny - sq / 2, sq, sq);
      } else {
        var ci2 = this.meta.layerOf[i] % 3;
        dotUsed[ci2] = 1;
        var dp = dots[ci2][bk];
        dp.moveTo(nx + r, ny);
        dp.arc(nx, ny, r, 0, TAU);
        /* Halo only on the units facing the viewer — the far half contributes
           almost nothing visible and costs the same to draw. */
        if (!ink && d > 0.97) { halo.push(nx, ny, r * 2.7, ci2, a * 0.34); }
      }
    }

    var roleAlpha = ink ? 0.95 : 0.92;
    for (ci = 0; ci < DOT.length; ci++) {
      if (!dotUsed[ci]) continue;
      ctx.fillStyle = DOT[ci];
      for (bb = 0; bb < NB; bb++) {
        ctx.globalAlpha = ((bb + 0.6) / NB) * roleAlpha;
        ctx.fill(dots[ci][bb]);
      }
    }
    ctx.lineWidth = (ink ? 1.3 : 1.2) * this.u;
    for (ci = 0; ci < RING.length; ci++) {
      ctx.strokeStyle = RING[ci];
      for (bb = 0; bb < NB; bb++) {
        ctx.globalAlpha = ((bb + 0.6) / NB) * roleAlpha;
        ctx.stroke(rings[ci][bb]);
      }
    }
    ctx.globalAlpha = roleAlpha * 0.75;
    ctx.fillStyle = C.ink;
    ctx.fill(bias);

    for (var hi2 = 0; hi2 < halo.length; hi2 += 5) {
      var hr = halo[hi2 + 2];
      ctx.globalAlpha = halo[hi2 + 4];
      ctx.drawImage(this._glow(DOT[halo[hi2 + 3]]),
        halo[hi2] - hr, halo[hi2 + 1] - hr, hr * 2, hr * 2);
    }

    /* ---- signal pulses --------------------------------------------------- */
    for (var u = 0; u < this.pulses.length; u++) {
      var pu = this.pulses[u], eb = pu.e * NS;
      var pv = lerp(this.eVis[eb + lo], this.eVis[eb + hi], t)
             * (1 - Math.max(SKr[this.eA[pu.e]], SKr[this.eB[pu.e]]));
      if (pv < 0.25) continue;
      var pa = this.eA[pu.e] * 4, pb = this.eB[pu.e] * 4;
      var px2 = lerp(P[pa], P[pb], pu.t), py2 = lerp(P[pa + 1], P[pb + 1], pu.t);
      var pd = lerp(P[pa + 2], P[pb + 2], pu.t);
      if (pd < 0.55) continue;
      /* A comet: one round-capped segment for the tail, one dot for the head.
         A bare dot gave no sense of direction, and four stacked dots cost four
         fills per pulse for the same read. */
      var head = (ink ? 2.2 : 2.6) * this.u * pd;
      var tail = Math.max(0, pu.t - 0.10);
      var lx = lerp(P[pa], P[pb], tail), ly = lerp(P[pa + 1], P[pb + 1], tail);
      ctx.strokeStyle = PAL[C_SIGNAL];
      ctx.lineCap = 'round';
      ctx.lineWidth = head * 0.85;
      ctx.globalAlpha = Math.min(1, pv * pd) * 0.42;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(px2, py2); ctx.stroke();

      ctx.fillStyle = PAL[C_SIGNAL];
      ctx.globalAlpha = Math.min(1, pv * pd);
      ctx.beginPath(); ctx.arc(px2, py2, head, 0, TAU); ctx.fill();
      if (!ink) {
        var gr = 6.5 * this.u * pd;
        ctx.globalAlpha = Math.min(0.6, pv * pd * 0.5);
        ctx.drawImage(this._glow(PAL[C_SIGNAL]), px2 - gr, py2 - gr, gr * 2, gr * 2);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  };

  NeuralField.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this, last = performance.now();
    function frame(now) {
      if (!self.running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      self.t += dt;
      self.frames++;

      self.progress += (self.targetProgress - self.progress) * Math.min(1, dt * 1.9);
      if (self.reduced) self.t = 0;
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
