/* ===========================================================================
   AXON — the neurons behind the page
   ---------------------------------------------------------------------------
   A still structure of small, coloured neurons behind the whole page, wired
   to their nearest neighbours, that fires where you touch it.

   Still means still: nothing in it moves on its own. The neurons sit in
   five layers at five depths, and scrolling carries the view straight down
   past them — the nearest layer at about two thirds of the copy's speed,
   the farthest at a fifth — so the page reads as descending a structure,
   and a synapse bridging two layers swings as you pass it. Scroll back up
   and it is exactly where it was.

   Interaction fires it. Each neuron is leaky integrate-and-fire: anything
   moving past it — the pointer, or the structure itself sliding under a
   still pointer while you scroll, or a finger dragging the page — charges
   it, the charge leaks away, and when it crosses threshold the neuron fires.
   A click or a tap fires the nearest few outright, harder. Keyboard focus
   fires the neurons behind whatever took it. A firing neuron flashes and
   sends a signal down each of its synapses; each one arriving fires the
   next neuron a little weaker, so activity spreads a few hops out from where
   you touched the page and dies away. A neuron that has just fired rests
   before it can fire again.

   It keeps out of the way. At rest the wiring is a faint ink line and the
   neurons are small; the firing is brief and only where you are. Wherever
   the model stands whole, a clearing opens round it, so nothing in the
   structure crosses the main asset.

   Colours are the root skin's four hues — the neurons are action, structure,
   data and signal, the same assignment the model uses — with the wiring in
   ink, at the skin's --syn-a (css/tokens.css). On a ground the model draws as
   light (--canvas-mode: glow) the firing is additive too.

   It only draws when something changes — a scroll, a signal in flight, a
   colour easing — and is idle otherwise. Reduced motion draws one still
   frame and does not fire.
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

  /* Seeded, so every visit is the same structure. */
  var seed;
  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var mm = function (q) { return !!(global.matchMedia && global.matchMedia(q).matches); };
  var reduced = mm('(prefers-reduced-motion: reduce)');
  var coarse = mm('(pointer: coarse)');

  /* ---- tuning ----------------------------------------------------------- */
  var DECAY = 0.68;                 /* each hop fires the next neuron this much weaker */
  var MIN_AMP = 0.17;               /* below this a signal is not sent */
  var BRANCH = 0.88;                /* chance a firing neuron signals down each synapse */
  var SPEED = 520;                  /* px a second along a synapse */
  var REFRACT = 1100;               /* ms a neuron rests after firing */
  var EDGE_TAU = 0.5, FLASH_TAU = 0.42, LEAK_TAU = 0.6;   /* seconds */
  var RAD = coarse ? 120 : 95;      /* how near something has to pass to charge a neuron */
  var GAIN = 1 / 28;                /* charge per px of motion right over a neuron */
  var AMP_BRUSH = 0.5, AMP_TAP = 1, AMP_FOCUS = 0.8;
  var MAX_PULSES = 700;

  /* ---- the structure -------------------------------------------------------
     Five layers of neurons at five depths, like the layers of a cortex. A
     layer moves as one sheet, so its wiring is exact: each neuron is wired to
     its nearest few in the same sheet. A few synapses bridge to the next
     layer down, and those are the ones that swing as you pass them — the
     structure is 3D, not a stack of flat pictures. Each neuron is nudged a
     hair off its layer's depth too, so the sheets are not dead flat.

     A neuron at speed r has to be on screen somewhere in a band H + r·D tall
     (D the scroll range) to cover the whole descent, so each layer holds more
     neurons than you ever see at once. Built with headroom and rebuilt only
     when the page changes shape. */
  var LAYERS = [
    { r: 0.2,  share: 0.27, size: 1.0, alpha: 0.5 },
    { r: 0.3,  share: 0.23, size: 1.3, alpha: 0.6 },
    { r: 0.41, share: 0.2,  size: 1.65, alpha: 0.72 },
    { r: 0.53, share: 0.17, size: 2.1, alpha: 0.86 },
    { r: 0.66, share: 0.13, size: 2.6, alpha: 1 }
  ];
  var W = 1, H = 1, D = 1, Dgen = 0, Wgen = 0, dpr = 1, LMAX = 120;
  var N = 0, NX, NY, NR, NS, NC, NA, NL;      /* x, y at scroll 0, speed, radius, hue, alpha, layer */
  var EXC, EXT, REF, FA, FT;                  /* charge, its time, rest-until, flash amp, flash time */
  var E = 0, EA, EB, EG, EGT, EC, ET;         /* ends, glow amp, glow time, glow hue, depth */
  var adj = [];
  var pulses = [], litE = [], flashN = [];

  function build() {
    seed = 0x41584f4e;                          /* "AXON" */
    Wgen = W; Dgen = D * 1.12;
    var m = 40;
    /* about one neuron per 5,000 px² of screen at any moment */
    var V = clamp(W * H / 5000, 70, 320);
    LMAX = clamp(Math.sqrt(W * H / (V * 0.2)) * 1.25, 80, 200);
    var HUE = [0, 1, 1, 2, 2, 3, 0, 1, 2, 3];   /* action, structure, data, signal */
    var xs = [], ys = [], rs = [], ls = [], start = [];
    for (var l = 0; l < LAYERS.length; l++) {
      var L = LAYERS[l], span = H + L.r * Dgen + 2 * m;
      var n = Math.min(2400, Math.round(V * L.share * span / (H + 2 * m)));
      start.push(xs.length);
      /* jittered grid rather than pure random: even, but not regular */
      var cols = Math.max(2, Math.round(Math.sqrt(n * (W + 2 * m) / span)));
      var rows = Math.max(2, Math.ceil(n / cols));
      var cw = (W + 2 * m) / cols, ch = span / rows;
      for (var gy = 0; gy < rows; gy++) {
        for (var gx = 0; gx < cols; gx++) {
          if (rand() > n / (rows * cols)) continue;
          xs.push(-m + (gx + 0.12 + rand() * 0.76) * cw);
          ys.push(-m + (gy + 0.12 + rand() * 0.76) * ch);
          rs.push(L.r + (rand() - 0.5) * 0.02);
          ls.push(l);
        }
      }
    }
    start.push(xs.length);
    N = xs.length;
    NX = new Float32Array(xs); NY = new Float32Array(ys); NR = new Float32Array(rs);
    NL = new Uint8Array(ls); NS = new Float32Array(N); NC = new Uint8Array(N); NA = new Float32Array(N);
    EXC = new Float32Array(N); EXT = new Float64Array(N); REF = new Float64Array(N);
    FA = new Float32Array(N); FT = new Float64Array(N);
    var hub = new Uint8Array(N), i, j;
    for (i = 0; i < N; i++) {
      var LL = LAYERS[NL[i]];
      hub[i] = rand() < 0.07 ? 1 : 0;
      NS[i] = LL.size * (hub[i] ? 1.45 : 1) * (0.85 + rand() * 0.3);
      NA[i] = LL.alpha;
      NC[i] = HUE[(rand() * HUE.length) | 0];
    }

    var ea = [], eb = [], seen = {};
    function link(p, q) {
      var key = p < q ? p * 16384 + q : q * 16384 + p;
      if (seen[key]) return;
      seen[key] = 1; ea.push(p); eb.push(q);
    }
    /* within a layer: nearest few by screen distance, which is exact there */
    for (l = 0; l < LAYERS.length; l++) {
      var a0 = start[l], a1 = start[l + 1];
      for (i = a0; i < a1; i++) {
        var k = hub[i] ? 5 : 3, bi = [], bd = [];
        for (j = a0; j < a1; j++) {
          if (j === i) continue;
          var dx = NX[i] - NX[j], dy = NY[i] - NY[j];
          if (dy > LMAX || dy < -LMAX) continue;
          var d2 = dx * dx + dy * dy;
          if (d2 > LMAX * LMAX) continue;
          if (bd.length < k || d2 < bd[bd.length - 1]) {
            var p = bd.length;
            while (p > 0 && bd[p - 1] > d2) p--;
            bd.splice(p, 0, d2); bi.splice(p, 0, j);
            if (bd.length > k) { bd.pop(); bi.pop(); }
          }
        }
        for (var q = 0; q < bi.length; q++) link(i, bi[q]);
      }
    }
    /* between layers: about a third of the neurons reach one layer deeper, to
       whichever neuron there is nearest when the pair is mid-screen */
    for (l = 0; l < LAYERS.length - 1; l++) {
      var b0 = start[l + 1], b1 = start[l + 2];
      for (i = start[l]; i < start[l + 1]; i++) {
        if (rand() > 0.34) continue;
        var sc = (NY[i] - H / 2) / NR[i];        /* the scroll that puts i mid-screen */
        var best = -1, bdist = (LMAX * 0.8) * (LMAX * 0.8);
        for (j = b0; j < b1; j++) {
          var ddx = NX[i] - NX[j], ddy = (NY[i] - NR[i] * sc) - (NY[j] - NR[j] * sc);
          var dd = ddx * ddx + ddy * ddy;
          if (dd < bdist) { bdist = dd; best = j; }
        }
        if (best >= 0) link(i, best);
      }
    }
    E = ea.length;
    EA = new Uint16Array(ea); EB = new Uint16Array(eb);
    EG = new Float32Array(E); EGT = new Float64Array(E); EC = new Uint8Array(E); ET = new Float32Array(E);
    adj = [];
    for (i = 0; i < N; i++) adj.push([]);
    for (var e = 0; e < E; e++) {
      adj[EA[e]].push(e); adj[EB[e]].push(e);
      ET[e] = (NL[EA[e]] + NL[EB[e]]) / 2 / (LAYERS.length - 1);
    }
    pulses = []; litE = []; flashN = [];
  }

  /* ---- colour ----------------------------------------------------------------
     Read once per skin or theme change (getComputedStyle after an attribute
     write forces a style recalc), then eased towards, so a section change
     fades rather than cuts. */
  var VARS = ['--c-primary', '--c-second', '--c-third', '--c-signal', '--syn-wire'];
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
  function ny(i, s) { return NY[i] - NR[i] * s; }

  /* The clearing round the model: js/app.js publishes it as __axon.field.
     Where it stands whole the structure thins to almost nothing over its
     disc; taken apart, there is no disc to keep clear. */
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
  function fire(i, amp, via, now) {
    if (now < REF[i]) return;
    REF[i] = now + REFRACT; fires++;
    if (FA[i] <= 0) flashN.push(i);
    FA[i] = Math.max(FA[i] * Math.exp(-(now - FT[i]) / 1000 / FLASH_TAU), amp); FT[i] = now;
    var next = amp * DECAY;
    if (next < MIN_AMP) return;
    var list = adj[i], s = lastS;
    for (var q = 0; q < list.length; q++) {
      var e = list[q];
      if (e === via || Math.random() > BRANCH || pulses.length >= MAX_PULSES) continue;
      var j = EA[e] === i ? EB[e] : EA[e];
      var dx = NX[j] - NX[i], dy = ny(j, s) - ny(i, s);
      pulses.push({ e: e, a: i, b: j, amp: next,
                    t0: now + 12 + Math.random() * 40,
                    dur: clamp(Math.sqrt(dx * dx + dy * dy) / SPEED * 1000, 70, 600) });
    }
  }
  /* A click, a tap, a focus: the nearest few neurons fire outright. */
  function burst(x, y, amp) {
    if (reduced || !N) return;
    var now = performance.now(), s = lastS, best = [];
    for (var i = 0; i < N; i++) {
      var yy = ny(i, s);
      if (yy < -20 || yy > H + 20) continue;
      var dx = NX[i] - x, dy = yy - y, d = dx * dx + dy * dy;
      if (d > 320 * 320) continue;
      best.push([d, i]);
    }
    best.sort(function (p, q) { return p[0] - q[0]; });
    for (var k = 0; k < Math.min(3, best.length); k++) {
      if (k > 0 && best[k][0] > 160 * 160) break;
      fire(best[k][1], amp * (1 - k * 0.12), -1, now);
    }
    kick();
  }

  /* ---- the pointer -------------------------------------------------------- */
  var px = 0, py = 0, ppx = 0, ppy = 0, pOn = false, pUntil = 0;
  function pointAt(x, y, fresh) {
    if (!pOn || fresh) { ppx = x; ppy = y; }
    px = x; py = y; pOn = true; pUntil = Infinity;
    if (!reduced) kick();
  }
  global.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
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
  doc.documentElement.addEventListener('mouseleave', function () { pOn = false; }, { passive: true });
  global.addEventListener('blur', function () { pOn = false; });
  if (!reduced) global.addEventListener('scroll', kick, { passive: true });
  doc.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || !el.getBoundingClientRect) return;
    try { if (!el.matches(':focus-visible')) return; } catch (err) { /* older engines: fire anyway */ }
    var r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) return;
    burst(r.left + r.width / 2, r.top + r.height / 2, AMP_FOCUS);
  });

  /* Charge every neuron near the pointer by how far it moved relative to the
     pointer this frame — the pointer moving, or the structure sliding under
     it as the page scrolls — and fire any that cross threshold. Charge leaks
     with time, computed when next touched, so a still page needs no frames. */
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
    var s = lastS, R2 = RAD * RAD;
    for (var i = 0; i < N; i++) {
      var yy = ny(i, s);
      if (yy < y - RAD || yy > y + RAD) continue;
      var dx = NX[i] - x, dy = yy - y, d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      var f = 1 - Math.sqrt(d2) / RAD;
      var rx = dpx, ry = dpy + NR[i] * ds;
      var add = Math.sqrt(rx * rx + ry * ry) * GAIN * f * f;
      if (add <= 0) continue;
      EXC[i] = EXC[i] * Math.exp(-(now - EXT[i]) / 1000 / LEAK_TAU) + add; EXT[i] = now;
      if (EXC[i] >= 1 && now >= REF[i]) { EXC[i] = 0; fire(i, AMP_BRUSH, -1, now); }
    }
  }

  function step(now) {
    for (var q = pulses.length - 1; q >= 0; q--) {
      var p = pulses[q];
      if (now < p.t0 + p.dur) continue;
      var e = p.e;
      if (EG[e] <= 0) litE.push(e);
      EG[e] = Math.max(EG[e] * Math.exp(-(now - EGT[e]) / 1000 / EDGE_TAU), p.amp);
      EGT[e] = now; EC[e] = NC[p.a];
      fire(p.b, p.amp, e, now);
      pulses[q] = pulses[pulses.length - 1]; pulses.pop();
    }
  }

  /* ---- drawing --------------------------------------------------------------- */
  var STEPS = 12, ES = 60, eBuckets = [], nBuckets = [];
  for (var b = 0; b < 2 * (ES + 1); b++) eBuckets.push([]);
  for (b = 0; b < 4 * (STEPS + 1); b++) nBuckets.push([]);

  function draw(now, s) {
    var A = col[5][0];
    var AW = 0.2 * A, AN = 0.8 * A;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    var i, e, L, k;

    /* the wiring at rest: faint ink, thinner and fainter the deeper it is */
    for (k = 0; k < eBuckets.length; k++) eBuckets[k].length = 0;
    for (e = 0; e < E; e++) {
      var a = EA[e], c = EB[e], ya = ny(a, s), yc = ny(c, s);
      if ((ya < -30 && yc < -30) || (ya > H + 30 && yc > H + 30)) continue;
      var xa = NX[a], xc = NX[c], t = ET[e];
      var sl = Math.sqrt((xa - xc) * (xa - xc) + (ya - yc) * (ya - yc));
      var al = AW * (0.45 + 0.55 * t) * Math.min(clearing(xa, ya), clearing(xc, yc)) *
               (1 - smooth(LMAX * 1.4, LMAX * 2.2, sl));
      var lv = Math.round(clamp(al, 0, 1) * ES);
      if (lv <= 0) continue;
      eBuckets[(t > 0.5 ? ES + 1 : 0) + Math.min(ES, lv)].push(xa, ya, xc, yc);
    }
    ctx.strokeStyle = css(col[4], 1);
    for (k = 0; k < eBuckets.length; k++) {
      L = eBuckets[k];
      if (!L.length) continue;
      var near = k > ES;
      ctx.lineWidth = near ? 1 : 0.7;
      ctx.globalAlpha = (k - (near ? ES + 1 : 0)) / ES;
      ctx.beginPath();
      for (var q = 0; q < L.length; q += 4) { ctx.moveTo(L[q], L[q + 1]); ctx.lineTo(L[q + 2], L[q + 3]); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* the neurons at rest */
    for (k = 0; k < nBuckets.length; k++) nBuckets[k].length = 0;
    for (i = 0; i < N; i++) {
      var y = ny(i, s);
      if (y < -10 || y > H + 10) continue;
      var x = NX[i];
      var na = AN * NA[i] * clearing(x, y);
      var nl = Math.round(clamp(na, 0, 1) * STEPS);
      if (nl <= 0) continue;
      nBuckets[NC[i] * (STEPS + 1) + nl].push(x, y, NS[i]);
    }
    for (k = 0; k < nBuckets.length; k++) {
      L = nBuckets[k];
      if (!L.length) continue;
      var hue = (k / (STEPS + 1)) | 0, lvl = k - hue * (STEPS + 1);
      ctx.fillStyle = css(col[hue], lvl / STEPS);
      ctx.beginPath();
      for (var q2 = 0; q2 < L.length; q2 += 3) { ctx.moveTo(L[q2] + L[q2 + 2], L[q2 + 1]); ctx.arc(L[q2], L[q2 + 1], L[q2 + 2], 0, 6.2832); }
      ctx.fill();
    }

    /* firing: lit synapses, signals in flight, flashing neurons */
    var live = false;
    if (glowMode) ctx.globalCompositeOperation = 'lighter';
    for (k = litE.length - 1; k >= 0; k--) {
      e = litE[k];
      var gl = EG[e] * Math.exp(-(now - EGT[e]) / 1000 / EDGE_TAU);
      if (gl < 0.02) { EG[e] = 0; litE[k] = litE[litE.length - 1]; litE.pop(); continue; }
      live = true;
      var a2 = EA[e], c2 = EB[e], y1 = ny(a2, s), y2 = ny(c2, s);
      if ((y1 < -30 && y2 < -30) || (y1 > H + 30 && y2 > H + 30)) continue;
      var clr = Math.min(clearing(NX[a2], y1), clearing(NX[c2], y2));
      ctx.strokeStyle = css(col[EC[e]], clamp(gl * clr, 0, 1));
      ctx.lineWidth = 1.5 + ET[e] * 1.2;
      ctx.beginPath(); ctx.moveTo(NX[a2], y1); ctx.lineTo(NX[c2], y2); ctx.stroke();
    }
    for (k = 0; k < pulses.length; k++) {
      var p = pulses[k];
      live = true;
      if (now < p.t0) continue;
      var u = clamp((now - p.t0) / p.dur, 0, 1);
      var ax = NX[p.a], ay = ny(p.a, s), bx = NX[p.b], by = ny(p.b, s);
      if ((ay < -30 && by < -30) || (ay > H + 30 && by > H + 30)) continue;
      var hx = ax + (bx - ax) * u, hy = ay + (by - ay) * u;
      var cl = clearing(hx, hy), hc = NC[p.a];
      ctx.strokeStyle = css(col[hc], clamp(p.amp * 0.95 * cl, 0, 1));
      ctx.lineWidth = 1.6 + ET[p.e] * 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hx, hy); ctx.stroke();
      var hr = 6 + 9 * p.amp;
      ctx.globalAlpha = clamp(p.amp * cl, 0, 1);
      ctx.drawImage(glow[hc], hx - hr, hy - hr, hr * 2, hr * 2);
      ctx.globalAlpha = 1;
    }
    for (k = flashN.length - 1; k >= 0; k--) {
      i = flashN[k];
      var fl = FA[i] * Math.exp(-(now - FT[i]) / 1000 / FLASH_TAU);
      if (fl < 0.02) { FA[i] = 0; flashN[k] = flashN[flashN.length - 1]; flashN.pop(); continue; }
      live = true;
      var fy = ny(i, s);
      if (fy < -40 || fy > H + 40) continue;
      var fx = NX[i], fc = clearing(fx, fy), rr = NS[i] * (6 + 9 * fl);
      ctx.globalAlpha = clamp(fl * fc, 0, 1);
      ctx.drawImage(glow[NC[i]], fx - rr, fy - rr, rr * 2, rr * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = css(col[NC[i]], clamp((AN + fl) * fc, 0, 1));
      ctx.beginPath(); ctx.arc(fx, fy, NS[i] * (1 + 0.7 * fl), 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    return live;
  }

  /* ---- the loop: only when something has changed --------------------------- */
  var scheduled = false, last = performance.now(), lastS = 0, settleUntil = 0;
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
    /* The model keeps travelling for a moment after the scroll stops, and the
       clearing follows it, so a scroll keeps the frames coming a little longer. */
    if (ds) settleUntil = now + 900;
    easeColours(dt);
    readClearing();
    if (!reduced) { excite(now, ds); step(now); }
    var t0 = performance.now();
    var live = draw(now, s);
    frames++; drawMs += performance.now() - t0;
    if (live || colMoving || now < settleUntil) kick();
  }

  function resize() {
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    var budget = Math.sqrt(3e6 / (W * H));
    dpr = clamp(Math.min(global.devicePixelRatio || 1, 2, budget), 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
  }
  /* The structure is sized to the scroll range, so it is rebuilt when the page
     outgrows the headroom it was built with, shrinks well inside it, or the
     window changes width — not on every small reflow. */
  function measure() {
    D = Math.max(1, docBox().height - innerHeight);
    if (!N || Math.abs(W - Wgen) > Wgen * 0.08 || D > Dgen || D < Dgen * 0.7) build();
    kick();
  }

  /* Handle for diagnostics in the console, beside __axon: __synapses.stats(),
     __synapses.fire(x, y). */
  var fires = 0, frames = 0, drawMs = 0;
  global.__synapses = {
    stats: function () {
      var iso = 0, deg = 0;
      for (var i = 0; i < N; i++) { deg += adj[i].length; if (!adj[i].length) iso++; }
      return { neurons: N, synapses: E, isolated: iso, meanDegree: +(deg / Math.max(1, N)).toFixed(2),
               fired: fires, inFlight: pulses.length, frames: frames,
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
  /* The page grows as the webfont lands and the copy reflows; the structure
     is sized to it, so it is re-measured whenever the document's height moves. */
  var docEl = doc.querySelector('.doc');
  if (docEl && global.ResizeObserver) {
    var lastH = 0;
    new ResizeObserver(function () {
      var h = docEl.getBoundingClientRect().height;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h; measure();
    }).observe(docEl);
  }
})(window);
