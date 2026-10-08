/* ===========================================================================
   AXON — the field of neurons behind the page
   ---------------------------------------------------------------------------
   A dense field of tiny coloured neurons behind the whole page, at every
   depth from far to near, that fires where you touch it. At rest it is only
   the neurons: no line is drawn until a signal runs between two of them.

   It is a field you move through. Every neuron has a depth, and depth
   decides everything about it: how fast it passes when you scroll — the
   farthest at a thirtieth of the copy's speed, the nearest at four fifths —
   how large it is, and above all how solid. Two neurons side by side are
   rarely equally strong: one is a faint speck, the other a small bright
   bead, and that difference is what reads as depth. Going down the page is
   going down through the field: near things stream past, far ones barely
   move. Moving the mouse
   shifts your point of view a little the same way, near neurons more than
   far ones. And the field is alive without going anywhere: each neuron
   drifts very slightly on its own, a pixel or two over ten or twenty
   seconds.

   The field never runs out. At every depth it is one screen tall and
   wraps: a neuron that leaves the top comes back in at the bottom, somewhere
   else across and in another hue, so there is always a full field in view
   and no pattern to catch repeating. Where a neuron is depends only on the
   scroll (and its slow drift), so scrolling back up returns the same view.

   Interaction fires it. Each neuron is leaky integrate-and-fire: anything
   moving past it — the pointer, or the page scrolling under a still pointer,
   or a finger dragging the page — charges it, the charge leaks away, and
   when it crosses threshold the neuron fires. A click or a tap fires the
   nearest few outright, harder. Keyboard focus fires the neurons behind
   whatever took it. A firing neuron flashes and, after a pause, signals two
   or three neighbours at a similar depth — the wiring is found at the moment
   of firing, among whatever is near — and each signal arriving fires the
   next neuron only a little weaker, so activity spreads slowly and a long
   way out from where you touched the page, over several seconds, before it
   dies away. A neuron that has just fired rests until the ripple has passed.

   It keeps out of the way. At rest there are no lines at all and the
   neurons are specks; the firing is brief and only where you are. Wherever
   the model stands whole, a clearing opens round it, so nothing in the
   field crosses the main asset.

   Colours are the root skin's four hues — action, structure, data and
   signal, the same assignment the model uses — and a synapse lights in the
   hue of the neuron that fired it, at the skin's --syn-a (css/tokens.css).
   On a ground the model draws as light (--canvas-mode: glow) the firing is
   additive too.

   The drift needs frames, but it is so slow that fifteen a second cannot be
   told from sixty, so at rest it draws at that rate and goes to the full
   rate only while you scroll, point, or something fires. Reduced motion
   draws one still frame: no drift, no shift, no firing.
   ========================================================================= */
(function (global) {
  'use strict';

  var doc = global.document, root = doc.documentElement;
  var canvas = doc.getElementById('synapses');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* Seeded, so every visit is the same field. */
  var seed;
  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /* A stable random number for a neuron in a given pass round the wrap: where
     across it comes back in, and in which hue. */
  function hash01(a, b) {
    var h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be59b, 0xc2b2ae35);
    h ^= h >>> 15; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }

  var mm = function (q) { return !!(global.matchMedia && global.matchMedia(q).matches); };
  var reduced = mm('(prefers-reduced-motion: reduce)');
  var coarse = mm('(pointer: coarse)');

  /* ---- tuning ----------------------------------------------------------- */
  /* the field */
  var DENSITY = 850;                    /* px² of screen per neuron */
  var R_FAR = 0.03, R_NEAR = 0.8;       /* scroll speed against the copy, farthest and nearest */
  var Z_SKEW = 1.4;                     /* more far neurons than near ones */
  var SIZE_FAR = 0.3, SIZE_NEAR = 1.8;  /* radius, px */
  var ALPHA_FAR = 0.05, ALPHA_NEAR = 1.05, ALPHA_CURVE = 1;
  var ALPHA_SPREAD = 0.8;               /* each neuron 0.6x to 1.4x its depth's strength */
  var DRIFT_FAR = 0.35, DRIFT_NEAR = 2; /* px, how far the idle drift reaches */
  var LOOK_X = 22, LOOK_Y = 12;         /* px the nearest neurons shift as the pointer crosses the screen */
  var IDLE_MS = 66;                     /* at rest, a frame every this many ms */
  /* firing */
  var DECAY = 0.8;                      /* each hop fires the next neuron this much weaker */
  var MIN_AMP = 0.13;                   /* below this a signal is not sent */
  var FAN = 3, BRANCH = 0.8;            /* signals per firing neuron, at most; chance of each */
  var SPEED = 110;                      /* px a second along a synapse */
  var HOP_MS = 100, HOP_JITTER = 160;   /* a neuron's pause before passing a signal on */
  var HOP_MIN = 22;                     /* px: a signal skips the neurons right beside it */
  var REFRACT = 6500;                   /* ms a neuron rests after firing — longer than a ripple lasts */
  var EDGE_TAU = 1.6, FLASH_TAU = 1.1, LEAK_TAU = 0.6;    /* seconds */
  var RAD = coarse ? 120 : 95;          /* how near something has to pass to charge a neuron */
  var GAIN = 1 / 28;                    /* charge per px of motion right over a neuron */
  var AMP_BRUSH = 0.5, AMP_TAP = 1, AMP_FOCUS = 0.8;
  var MAX_PULSES = 700;                 /* signals in flight, at most: a cap for click spam */
  var OPACITY = 0.75;                   /* the flashes, the signals and the lit synapses */

  /* ---- the field ----------------------------------------------------------- */
  var W = 1, H = 1, dpr = 1, MARGIN = 40, P = 1, N = 0;
  var Z, ZL, RT, Y0, SZ, AL, DA, DW1, DW2, DP1, DP2;   /* per neuron, fixed */
  var CY, XB, HU, PX, PY;                              /* per neuron, per frame */
  var EXC, EXT, REF, FA, FT;                           /* charge, its time, rest-until, flash */
  var pulses = [], lit = [], flashN = [];
  var RSYN = 100;                                      /* how far a synapse may reach */
  var HUE = [0, 1, 1, 2, 2, 3, 0, 1, 2, 3];            /* action, structure, data, signal */

  function build() {
    seed = 0x41584f4e;                                 /* "AXON" */
    MARGIN = 20 + LOOK_X + DRIFT_NEAR;
    P = H + 2 * MARGIN;
    N = Math.round(clamp(W * H / DENSITY, 300, 3200) * P / H);
    RSYN = clamp(Math.sqrt(DENSITY) * 4.2, 70, 150);
    Z = new Float32Array(N); ZL = new Float32Array(N); RT = new Float32Array(N);
    Y0 = new Float32Array(N); SZ = new Float32Array(N); AL = new Float32Array(N);
    DA = new Float32Array(N); DW1 = new Float32Array(N); DW2 = new Float32Array(N);
    DP1 = new Float32Array(N); DP2 = new Float32Array(N);
    CY = new Float64Array(N); XB = new Float32Array(N); HU = new Uint8Array(N);
    PX = new Float32Array(N); PY = new Float32Array(N);
    EXC = new Float32Array(N); EXT = new Float64Array(N); REF = new Float64Array(N);
    FA = new Float32Array(N); FT = new Float64Array(N);
    for (var i = 0; i < N; i++) {
      var z = Math.pow(rand(), Z_SKEW);                /* 0 farthest, 1 nearest */
      Z[i] = z; ZL[i] = Math.pow(z, 1.2);
      RT[i] = R_FAR + (R_NEAR - R_FAR) * z;
      Y0[i] = rand() * P;
      SZ[i] = (SIZE_FAR + (SIZE_NEAR - SIZE_FAR) * Math.pow(z, 1.3)) *
              (rand() < 0.05 ? 1.35 : 1) * (0.85 + rand() * 0.3);
      /* strength follows depth, and then each neuron is up to 40% fainter or
         stronger than its depth would say — so neighbours differ, and two
         dots side by side read as one nearer and one farther */
      AL[i] = (ALPHA_FAR + (ALPHA_NEAR - ALPHA_FAR) * Math.pow(z, ALPHA_CURVE)) *
              (1 - ALPHA_SPREAD / 2 + rand() * ALPHA_SPREAD);
      DA[i] = DRIFT_FAR + (DRIFT_NEAR - DRIFT_FAR) * z;
      DW1[i] = 2 * Math.PI / (9 + rand() * 11);
      DW2[i] = 2 * Math.PI / (9 + rand() * 11);
      DP1[i] = rand() * 6.2832; DP2[i] = rand() * 6.2832;
      CY[i] = NaN;
    }
    pulses = []; lit = []; flashN = [];
    gridFor = -1;
  }

  /* ---- colour ----------------------------------------------------------------
     Read once per skin or theme change (getComputedStyle after an attribute
     write forces a style recalc), then eased towards, so a section change
     fades rather than cuts. */
  var VARS = ['--c-primary', '--c-second', '--c-third', '--c-signal'];
  var probe = doc.createElement('canvas').getContext('2d');
  function rgb(str) {
    probe.fillStyle = '#000';
    probe.fillStyle = str || '#000';
    var s = probe.fillStyle;
    if (s.charAt(0) === '#') return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    var m = s.match(/[\d.]+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }
  var glowMode = false;
  function readTarget() {
    var cs = getComputedStyle(root);
    var out = VARS.map(function (v) { return rgb(cs.getPropertyValue(v).trim()); });
    var a = parseFloat(cs.getPropertyValue('--syn-a'));
    out.push([isFinite(a) ? a : 1, 0, 0]);
    glowMode = cs.getPropertyValue('--canvas-mode').trim() === 'glow';
    return out;
  }
  var target = readTarget();
  var col = target.map(function (c) { return c.slice(); });
  var colMoving = false;
  function retarget() {
    target = readTarget(); colMoving = true;
    if (reduced) { col = target.map(function (c) { return c.slice(); }); colMoving = false; paintSprites(); }
    kick();
  }
  if (global.MutationObserver) {
    new MutationObserver(retarget).observe(root, { attributes: true, attributeFilter: ['data-skin', 'data-theme'] });
  }
  if (global.matchMedia) {
    var mq = global.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', retarget);
  }
  function easeColours(dt) {
    if (!colMoving) return;
    var k = 1 - Math.exp(-dt / 0.25), still = true;
    for (var c = 0; c < col.length; c++) {
      for (var ch = 0; ch < 3; ch++) {
        var d = target[c][ch] - col[c][ch];
        if (Math.abs(d) > (c === col.length - 1 ? 0.002 : 0.5)) { col[c][ch] += d * k; still = false; }
        else col[c][ch] = target[c][ch];
      }
    }
    if (still) colMoving = false;
    paintSprites();
  }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }

  /* A soft glow per hue, drawn once and scaled on use. */
  var SPR = 64, glow = [];
  for (var g = 0; g < 4; g++) { var cv = doc.createElement('canvas'); cv.width = cv.height = SPR; glow.push(cv); }
  function paintSprites() {
    for (var c = 0; c < 4; c++) {
      var x = glow[c].getContext('2d'), r = SPR / 2;
      x.clearRect(0, 0, SPR, SPR);
      var gr = x.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, css(col[c], 0.9)); gr.addColorStop(0.3, css(col[c], 0.42));
      gr.addColorStop(0.65, css(col[c], 0.1)); gr.addColorStop(1, css(col[c], 0));
      x.fillStyle = gr; x.fillRect(0, 0, SPR, SPR);
    }
  }
  paintSprites();

  /* ---- where things are -------------------------------------------------- */
  function docBox() { return (doc.querySelector('.doc') || doc.body).getBoundingClientRect(); }
  /* Measured from the document's rectangle rather than window.scrollY, for
     the same reason js/app.js does: embedded, the window may not scroll. */
  function scrollPos() { return Math.max(0, -docBox().top); }

  /* Every neuron's place on screen for this scroll, this moment and this
     point of view. When one wraps it is dealt a new place across and a new
     hue, out of sight beyond the edge, so nothing is seen to jump. */
  var frameNo = 0;
  function place(s, t, lx, ly) {
    for (var i = 0; i < N; i++) {
      var yr = Y0[i] - RT[i] * s;
      var c = Math.floor(yr / P);
      if (c !== CY[i]) {
        CY[i] = c;
        XB[i] = -MARGIN + hash01(i, c) * (W + 2 * MARGIN);
        HU[i] = HUE[(hash01(i + 7919, c) * HUE.length) | 0];
      }
      var x = XB[i], y = yr - c * P - MARGIN;
      if (!reduced) {
        x += DA[i] * Math.sin(t * DW1[i] + DP1[i]) - lx * LOOK_X * ZL[i];
        y += DA[i] * Math.sin(t * DW2[i] + DP2[i]) - ly * LOOK_Y * ZL[i];
      }
      PX[i] = x; PY[i] = y;
    }
    frameNo++;
  }

  /* A coarse grid over the screen, so finding the neurons near a point does
     not mean looking at every neuron. Rebuilt at most once a frame, and only
     in frames that ask. */
  var GRID = 48, gcols = 1, grows = 1, ghead = new Int32Array(1), gnext = new Int32Array(1);
  var gridFor = -1;
  function grid() {
    if (gridFor === frameNo) return;
    gridFor = frameNo;
    gcols = Math.ceil((W + 2 * MARGIN) / GRID) + 1; grows = Math.ceil((H + 2 * MARGIN) / GRID) + 1;
    if (ghead.length < gcols * grows) ghead = new Int32Array(gcols * grows);
    if (gnext.length < N) gnext = new Int32Array(N);
    ghead.fill(-1);
    for (var i = 0; i < N; i++) {
      var cx = ((PX[i] + MARGIN) / GRID) | 0, cy = ((PY[i] + MARGIN) / GRID) | 0;
      if (cx < 0 || cy < 0 || cx >= gcols || cy >= grows) continue;
      var k = cy * gcols + cx;
      gnext[i] = ghead[k]; ghead[k] = i;
    }
  }
  function around(x, y, r, fn) {
    grid();
    var x0 = Math.max(0, ((x - r + MARGIN) / GRID) | 0), x1 = Math.min(gcols - 1, ((x + r + MARGIN) / GRID) | 0);
    var y0 = Math.max(0, ((y - r + MARGIN) / GRID) | 0), y1 = Math.min(grows - 1, ((y + r + MARGIN) / GRID) | 0);
    for (var cy = y0; cy <= y1; cy++) {
      for (var cx = x0; cx <= x1; cx++) {
        for (var i = ghead[cy * gcols + cx]; i >= 0; i = gnext[i]) fn(i);
      }
    }
  }

  /* The clearing round the model: js/app.js publishes it as __axon.field.
     Where it stands whole the field thins to almost nothing over its disc;
     taken apart, there is no disc to keep clear. */
  var clearX = 0, clearY = 0, clearR = 0, clearK = 0;
  function readClearing() {
    var f = global.__axon && global.__axon.field;
    if (!f || !f.w) { clearK = 0; return; }
    clearX = f.w * f.originX; clearY = f.h * f.originY;
    clearR = f.radius * f.zoom * (f.stretchX || 1) * 1.08;
    clearK = 1 - clamp(f.scatter || 0, 0, 1);
  }
  function clearing(x, y) {
    if (clearK <= 0) return 1;
    var dx = x - clearX, dy = y - clearY, d = Math.sqrt(dx * dx + dy * dy);
    return 1 - clearK * 0.88 * (1 - smooth(clearR * 0.55, clearR * 1.2, d));
  }

  /* ---- firing ----------------------------------------------------------------- */
  var fires = 0;
  function fire(i, amp, from, now) {
    if (now < REF[i]) return;
    REF[i] = now + REFRACT; fires++;
    if (FA[i] <= 0) flashN.push(i);
    FA[i] = Math.max(FA[i] * Math.exp(-(now - FT[i]) / 1000 / FLASH_TAU), amp); FT[i] = now;
    var next = amp * DECAY;
    if (next < MIN_AMP || pulses.length >= MAX_PULSES) return;
    /* its synapses: the nearest few at a similar depth, found now */
    var xi = PX[i], yi = PY[i], zi = Z[i], R2 = RSYN * RSYN, H2 = HOP_MIN * HOP_MIN;
    var bj = [], bd = [], bl = [];
    around(xi, yi, RSYN, function (j) {
      if (j === i || j === from) return;
      var dx = PX[j] - xi, dy = PY[j] - yi, s2 = dx * dx + dy * dy;
      if (s2 < H2) return;                       /* right beside it on screen: skip */
      var dz = (Z[j] - zi) * 160, d2 = s2 + dz * dz;
      if (d2 > R2) return;
      if (bd.length < 6 || d2 < bd[bd.length - 1]) {
        var p = bd.length;
        while (p > 0 && bd[p - 1] > d2) p--;
        bd.splice(p, 0, d2); bj.splice(p, 0, j); bl.splice(p, 0, Math.sqrt(s2));
        if (bd.length > 6) { bd.pop(); bj.pop(); bl.pop(); }
      }
    });
    for (var q = 0, sent = 0; q < bj.length && sent < FAN; q++) {
      var j = bj[q];
      if (now < REF[j] || Math.random() > BRANCH) continue;
      sent++;
      pulses.push({ a: i, b: j, ca: CY[i], cb: CY[j], amp: next,
                    t0: now + HOP_MS + Math.random() * HOP_JITTER,
                    dur: clamp(bl[q] / SPEED * 1000, 200, 2200) });
    }
  }
  /* A click, a tap, a focus: the nearest few neurons fire outright. */
  function burst(x, y, amp) {
    if (reduced || !N) return;
    var now = performance.now(), best = [];
    around(x, y, 160, function (i) {
      var dx = PX[i] - x, dy = PY[i] - y, d = dx * dx + dy * dy;
      if (d <= 160 * 160) best.push([d - Z[i] * 900, i]);   /* nearer the eye wins ties */
    });
    best.sort(function (p, q) { return p[0] - q[0]; });
    for (var k = 0; k < Math.min(3, best.length); k++) fire(best[k][1], amp * (1 - k * 0.12), -1, now);
    kick();
  }

  /* ---- the pointer -------------------------------------------------------- */
  var px = 0, py = 0, ppx = 0, ppy = 0, pOn = false, pUntil = 0;
  var lookOn = false, lookX = 0, lookY = 0;              /* the point of view, eased */
  function pointAt(x, y, fresh) {
    if (!pOn || fresh) { ppx = x; ppy = y; }
    px = x; py = y; pOn = true; pUntil = Infinity;
    if (!reduced) kick();
  }
  global.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    lookOn = true;
    pointAt(e.clientX, e.clientY, false);
  }, { passive: true });
  global.addEventListener('pointerdown', function (e) {
    pointAt(e.clientX, e.clientY, true);
    burst(e.clientX, e.clientY, AMP_TAP);
  }, { passive: true });
  global.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0];
    if (t) pointAt(t.clientX, t.clientY, false);
  }, { passive: true });
  /* A flick keeps the page moving after the finger lifts; the neurons under
     where it was keep firing for as long as that lasts. */
  global.addEventListener('touchend', function () { pUntil = performance.now() + 1400; }, { passive: true });
  doc.documentElement.addEventListener('mouseleave', function () { pOn = false; lookOn = false; kick(); }, { passive: true });
  global.addEventListener('blur', function () { pOn = false; lookOn = false; });
  if (!reduced) global.addEventListener('scroll', kick, { passive: true });
  doc.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || !el.getBoundingClientRect) return;
    try { if (!el.matches(':focus-visible')) return; } catch (err) { /* older engines: fire anyway */ }
    var r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) return;
    burst(r.left + r.width / 2, r.top + r.height / 2, AMP_FOCUS);
  });

  /* Charge every neuron near the pointer by how far things moved past it this
     frame — the pointer moving, or the page scrolling under it — and fire any
     that cross threshold. A scroll counts at the neuron's own speed, but never
     less than a third of the scroll, so the far field still answers. Charge
     leaks with time, computed when next touched. */
  function excite(now, ds) {
    var on = pOn && now < pUntil;
    var x = px, y = py, dpx = px - ppx, dpy = py - ppy;
    ppx = px; ppy = py;
    if (!on) {
      if (!ds) return;
      /* scrolled with no pointer to go by — keys, the scrollbar: fire where
         the reading is, a little below the middle of the screen */
      x = W * 0.5; y = H * 0.58; dpx = 0; dpy = 0;
    }
    if (!dpx && !dpy && !ds) return;
    var R2 = RAD * RAD;
    around(x, y, RAD, function (i) {
      var dx = PX[i] - x, dy = PY[i] - y, d2 = dx * dx + dy * dy;
      if (d2 > R2) return;
      var f = 1 - Math.sqrt(d2) / RAD;
      var rx = dpx, ry = dpy + Math.max(RT[i], 0.33) * ds;
      var add = Math.sqrt(rx * rx + ry * ry) * GAIN * f * f;
      if (add <= 0) return;
      EXC[i] = EXC[i] * Math.exp(-(now - EXT[i]) / 1000 / LEAK_TAU) + add; EXT[i] = now;
      if (EXC[i] >= 1 && now >= REF[i]) { EXC[i] = 0; fire(i, AMP_BRUSH, -1, now); }
    });
  }

  /* Signals arriving: light the synapse, fire the neuron. A signal whose ends
     have wrapped round the field since it set off is simply dropped. */
  function step(now) {
    for (var q = pulses.length - 1; q >= 0; q--) {
      var p = pulses[q];
      var gone = CY[p.a] !== p.ca || CY[p.b] !== p.cb;
      if (!gone && now < p.t0 + p.dur) continue;
      if (!gone) {
        lit.push({ a: p.a, b: p.b, ca: p.ca, cb: p.cb, g: p.amp, t: now, hue: HU[p.a] });
        fire(p.b, p.amp, p.a, now);
      }
      pulses[q] = pulses[pulses.length - 1]; pulses.pop();
    }
  }

  /* ---- drawing --------------------------------------------------------------- */
  var STEPS = 16, nBuckets = [];
  for (var b = 0; b < 4 * (STEPS + 1); b++) nBuckets.push([]);

  function draw(now) {
    var A = col[4][0], AN = 0.85 * A, K = OPACITY;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    var i, k, L;

    /* the neurons — nothing else at rest */
    for (k = 0; k < nBuckets.length; k++) nBuckets[k].length = 0;
    for (i = 0; i < N; i++) {
      var x = PX[i], y = PY[i];
      if (y < -4 || y > H + 4 || x < -4 || x > W + 4) continue;
      var na = AN * AL[i] * clearing(x, y);
      var nl = Math.round(clamp(na, 0, 1) * STEPS);
      if (nl <= 0) continue;
      nBuckets[HU[i] * (STEPS + 1) + nl].push(x, y, SZ[i]);
    }
    for (k = 0; k < nBuckets.length; k++) {
      L = nBuckets[k];
      if (!L.length) continue;
      var hue = (k / (STEPS + 1)) | 0, lvl = k - hue * (STEPS + 1);
      ctx.fillStyle = css(col[hue], lvl / STEPS);
      ctx.beginPath();
      for (var q = 0; q < L.length; q += 3) { ctx.moveTo(L[q] + L[q + 2], L[q + 1]); ctx.arc(L[q], L[q + 1], L[q + 2], 0, 6.2832); }
      ctx.fill();
    }

    /* firing: lit synapses, signals in flight, flashing neurons — deeper ones
       fainter and thinner, so the firing has depth too */
    var live = false;
    if (glowMode) ctx.globalCompositeOperation = 'lighter';
    for (k = lit.length - 1; k >= 0; k--) {
      var l = lit[k];
      var gl = l.g * Math.exp(-(now - l.t) / 1000 / EDGE_TAU);
      if (gl < 0.02 || CY[l.a] !== l.ca || CY[l.b] !== l.cb) { lit[k] = lit[lit.length - 1]; lit.pop(); continue; }
      live = true;
      var dz = (Z[l.a] + Z[l.b]) / 2;
      var clr = Math.min(clearing(PX[l.a], PY[l.a]), clearing(PX[l.b], PY[l.b]));
      ctx.strokeStyle = css(col[l.hue], clamp(gl * clr * (0.4 + 0.6 * dz) * K, 0, 1));
      ctx.lineWidth = 0.5 + dz * 1.1;
      ctx.beginPath(); ctx.moveTo(PX[l.a], PY[l.a]); ctx.lineTo(PX[l.b], PY[l.b]); ctx.stroke();
    }
    for (k = 0; k < pulses.length; k++) {
      var p = pulses[k];
      live = true;
      if (now < p.t0) continue;
      var u = clamp((now - p.t0) / p.dur, 0, 1);
      var ax = PX[p.a], ay = PY[p.a], hx = ax + (PX[p.b] - ax) * u, hy = ay + (PY[p.b] - ay) * u;
      var pz = (Z[p.a] + Z[p.b]) / 2, cl = clearing(hx, hy), hc = HU[p.a];
      ctx.strokeStyle = css(col[hc], clamp(p.amp * 0.95 * cl * (0.4 + 0.6 * pz) * K, 0, 1));
      ctx.lineWidth = 0.6 + pz * 1.1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke();
      var hr = (3 + 5.5 * p.amp) * (0.6 + 0.7 * pz);
      ctx.globalAlpha = clamp(p.amp * cl * K, 0, 1);
      ctx.drawImage(glow[hc], hx - hr, hy - hr, hr * 2, hr * 2);
      ctx.globalAlpha = 1;
    }
    for (k = flashN.length - 1; k >= 0; k--) {
      i = flashN[k];
      var fl = FA[i] * Math.exp(-(now - FT[i]) / 1000 / FLASH_TAU);
      if (fl < 0.02) { FA[i] = 0; flashN[k] = flashN[flashN.length - 1]; flashN.pop(); continue; }
      live = true;
      var fx = PX[i], fy = PY[i];
      if (fy < -40 || fy > H + 40) continue;
      var fc = clearing(fx, fy), rr = SZ[i] * (6 + 9 * fl);
      ctx.globalAlpha = clamp(fl * fc * K, 0, 1);
      ctx.drawImage(glow[HU[i]], fx - rr, fy - rr, rr * 2, rr * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = css(col[HU[i]], clamp((AN * AL[i] + fl * K) * fc, 0, 1));
      ctx.beginPath(); ctx.arc(fx, fy, SZ[i] * (1 + 0.8 * fl), 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    return live;
  }

  /* ---- the loop ---------------------------------------------------------------
     Always running while the page is visible, because of the drift — but at
     rest it only draws every IDLE_MS. Anything that moves — a scroll, the
     pointer, a signal, a colour easing — takes it to every frame. */
  var scheduled = false, last = performance.now(), lastS = reduced ? 0 : scrollPos();
  var settleUntil = 0, lastDraw = -1e9, busy = true;
  var frames = 0, drawMs = 0;
  function kick() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(frame);
  }
  function frame(now) {
    scheduled = false;
    var dt = clamp((now - last) / 1000, 0, 0.05); last = now;
    var s = reduced ? 0 : scrollPos();
    var ds = s - lastS; lastS = s;
    if (ds) settleUntil = now + 900;

    /* the point of view eases after the pointer, and back to centre when it
       leaves the page */
    var tx = 0, ty = 0;
    if (lookOn && !reduced) { tx = clamp((px - W / 2) / (W / 2), -1, 1); ty = clamp((py - H / 2) / (H / 2), -1, 1); }
    var ke = 1 - Math.exp(-dt / 0.45);
    lookX += (tx - lookX) * ke; lookY += (ty - lookY) * ke;
    var looking = Math.abs(tx - lookX) > 0.002 || Math.abs(ty - lookY) > 0.002;

    var moving = busy || colMoving || looking || now < settleUntil || px !== ppx || py !== ppy;
    if (!reduced && !moving && now - lastDraw < IDLE_MS) { kick(); return; }
    lastDraw = now;

    var t0 = performance.now();
    easeColours(dt);
    readClearing();
    place(s, now / 1000, lookX, lookY);
    /* A jump — the browser restoring the scroll on reload, an anchor — is not
       motion past anything, so it charges nothing. */
    if (!reduced) { excite(now, Math.abs(ds) > H * 0.6 ? 0 : ds); step(now); }
    busy = draw(now);
    frames++; drawMs += performance.now() - t0;
    if (!reduced || busy || colMoving) kick();
  }

  function resize() {
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    /* the far neurons are sub-pixel, so density matters: up to 2x, inside a
       4.5-megapixel budget */
    var budget = Math.sqrt(4.5e6 / (W * H));
    dpr = clamp(Math.min(global.devicePixelRatio || 1, 2, budget), 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    kick();
  }

  /* Handle for diagnostics in the console, beside __axon: __synapses.stats(),
     __synapses.fire(x, y). */
  global.__synapses = {
    stats: function () {
      var seen = 0;
      for (var i = 0; i < N; i++) if (PY[i] >= 0 && PY[i] <= H && PX[i] >= 0 && PX[i] <= W) seen++;
      return { neurons: N, onScreen: seen, fired: fires, inFlight: pulses.length, frames: frames,
               msPerFrame: +(drawMs / Math.max(1, frames)).toFixed(2) };
    },
    fire: function (x, y) { burst(x, y, AMP_TAP); }
  };

  resize();
  var rt;
  global.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 90);
  }, { passive: true });
})(window);
