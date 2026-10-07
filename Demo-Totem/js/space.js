/* ===========================================================================
   AXON — the space behind the page
   ---------------------------------------------------------------------------
   A slow flight through a field of neurons, after the way totem.itsoffbrand
   carries you through its scene: the page's content stays put while the
   space behind it travels.

   One fixed, viewport-sized canvas under everything (see .space in
   css/main.css). What is in it lives in a 3D volume in front of a camera:

     dust      the bulk of it — fine points, crisp far away and soft
               out-of-focus discs when they come close
     neurons   a sparser population with a ring, each wired by a synapse to
               its nearest neighbours, some synapses carrying a signal
     haze      a few very large soft glows far behind everything, the
               atmosphere — Totem's teal fog, in this page's hues

   Scroll moves the camera DOWN and FORWARD through the volume: near things
   rush past, far things barely move, so the parallax is real depth rather
   than a picture sliding. Scroll back up and you fly back to exactly the same
   place. On top of that the camera drifts forward on its own, slowly, so the
   space is alive when you stop. The depth wraps, so the flight never runs out.

   It keeps out of the way. Nothing in it is bright; the near discs are the
   faintest marks rather than the loudest; and wherever the model stands
   whole, a clearing opens round it so nothing crosses the main asset.

   Colours come from the root skin by role — the same assignment the model
   uses — through the --sp-* properties in css/tokens.css, and fade across a
   section change rather than cutting. Reduced motion draws one still frame.
   ========================================================================= */
(function (global) {
  'use strict';

  var doc = global.document, root = doc.documentElement;
  var canvas = doc.getElementById('space');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mod(a, n) { return ((a % n) + n) % n; }

  /* Seeded, so every visit flies through the same space. */
  var seed = 0x41584f4e;
  function rand() {
    seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* ---- budget ---------------------------------------------------------------
     The same three tiers as the model (js/neural.js), read the same way. This
     canvas is soft, so it never needs the model's full pixel density. */
  function tier() {
    var conn = navigator.connection || {};
    if (conn.saveData) return 'low';
    var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    var coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    if (mem <= 2 || cores <= 2) return 'low';
    if (coarse || mem <= 4 || cores <= 4) return 'medium';
    return 'high';
  }
  var TIERS = {
    high:   { dust: 1400, neurons: 110, dpr: 1.25 },
    medium: { dust: 900,  neurons: 80,  dpr: 1.5 },
    low:    { dust: 520,  neurons: 50,  dpr: 1 }
  };
  var T = TIERS[tier()];
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- the volume -----------------------------------------------------------
     World units, camera looking down +z. Depth runs NEAR..FAR and wraps.
     Positions are stored normalised and scaled to the frustum on resize, so a
     window of any shape is filled evenly. */
  var NEAR = 0.32, FAR = 12, RANGE = FAR - NEAR;
  var FOCUS = 1.7;               /* nearer than this, dust is drawn out of focus */
  var DRIFT = 0.07;              /* forward, world units a second, on its own */
  var FORWARD = 0.55;            /* forward over the whole page, in RANGEs */
  var NEAR_RATE = 0.5;           /* how fast the nearest field moves vs the copy */

  var dust = [], neurons = [], synapses = [], haze = [];
  var i, j;
  for (i = 0; i < T.dust; i++) {
    dust.push({ u: rand() * 2 - 1, v: rand(), z: rand() * RANGE,
                s: 0.6 + rand() * rand() * 2.4, a: 0.35 + rand() * 0.65, c: rand() < 0.22 ? 1 : 0 });
  }
  for (i = 0; i < T.neurons; i++) {
    neurons.push({ u: rand() * 2 - 1, v: rand(), z: rand() * RANGE, s: 0.8 + rand() * 0.7, ring: rand() < 0.6 });
  }
  /* Synapses: each neuron to its two nearest, measured in the normalised box
     (the box is twice as tall as it is wide, so v counts double), once per
     pair. */
  var seen = {};
  for (i = 0; i < neurons.length; i++) {
    var a = neurons[i], best = [];
    for (j = 0; j < neurons.length; j++) {
      if (j === i) continue;
      var b = neurons[j], dz = (a.z - b.z) / RANGE;
      best.push({ j: j, d: (a.u - b.u) * (a.u - b.u) + (a.v - b.v) * (a.v - b.v) * 4 + dz * dz * 4 });
    }
    best.sort(function (p, q) { return p.d - q.d; });
    for (var k = 0; k < 2; k++) {
      var n = best[k].j, key = Math.min(i, n) + ':' + Math.max(i, n);
      if (seen[key]) continue;
      seen[key] = 1;
      synapses.push({ a: i, b: n, live: rand() < 0.34, period: 3.5 + rand() * 4, phase: rand() });
    }
  }
  /* Haze: far behind the field and never wrapping, placed in screen terms —
     x across the width, v down the page, r in screen heights — and moving
     `span` screens over the whole scroll, so it is the sky you travel under
     rather than something you pass. The last one is the light at the bottom
     of the page, rising into view through the close. */
  for (i = 0; i < 7; i++) {
    haze.push({ u: rand() * 2 - 1, v: (i + 0.5) / 7 + (rand() - 0.5) * 0.08, span: 0.9,
                r: 0.42 + rand() * 0.3, c: i % 4, a: 0.7 + rand() * 0.3 });
  }
  haze.push({ u: -0.08, v: 1.06, span: 2.4, r: 0.85, c: 3, a: 1 });

  /* ---- colour -----------------------------------------------------------------
     Read once per skin or theme change (getComputedStyle after an attribute
     write forces a style recalc), then eased towards, so a section change
     fades the space rather than cutting it. */
  var VARS = ['--sp-dust', '--sp-neuron', '--sp-wire', '--sp-signal', '--sp-haze'];
  var probe = doc.createElement('canvas').getContext('2d');
  function rgb(str) {
    probe.fillStyle = '#000';
    probe.fillStyle = str || '#000';
    var s = probe.fillStyle;                       /* normalised: #rrggbb or rgba() */
    if (s.charAt(0) === '#') return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    var m = s.match(/[\d.]+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }
  function readTarget() {
    var cs = getComputedStyle(root);
    var out = VARS.map(function (v) { return rgb(cs.getPropertyValue(v).trim()); });
    var a = parseFloat(cs.getPropertyValue('--space-a'));
    out.push([isFinite(a) ? a : 0.6, 0, 0]);
    return out;
  }
  var target = readTarget();
  var col = target.map(function (c) { return c.slice(); });
  var colMoving = false;
  function retarget() {
    target = readTarget(); colMoving = true;
    if (reduced) { col = target.map(function (c) { return c.slice(); }); colMoving = false; paintSprites(); draw(performance.now()); }
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
    var k = 1 - Math.exp(-dt / 0.28), still = true;
    for (var c = 0; c < col.length; c++) {
      for (var ch = 0; ch < 3; ch++) {
        var d = target[c][ch] - col[c][ch];
        if (Math.abs(d) > (c === col.length - 1 ? 0.002 : 0.5)) { col[c][ch] += d * k; still = false; }
        else col[c][ch] = target[c][ch];
      }
    }
    if (still) colMoving = false;
  }
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t === 'dark';
    return !!(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }

  /* Soft discs as small sprites, one per colour, scaled on use: a gradient
     per mark per frame would be the expensive way to draw a blur. They are
     redrawn only while the colours are moving. */
  var SPR = 64;
  function sprite() { var c = doc.createElement('canvas'); c.width = c.height = SPR; return c; }
  var bokeh = [sprite(), sprite(), sprite(), sprite()], glow = [sprite(), sprite(), sprite(), sprite()];
  function paintSprites() {
    for (var c = 0; c < 4; c++) {
      var tint = col[c + 1];
      var g = bokeh[c].getContext('2d'), r = SPR / 2;
      g.clearRect(0, 0, SPR, SPR);
      var gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, css(tint, 0.55)); gr.addColorStop(0.62, css(tint, 0.42));
      gr.addColorStop(0.8, css(tint, 0.16)); gr.addColorStop(1, css(tint, 0));
      g.fillStyle = gr; g.fillRect(0, 0, SPR, SPR);
      var h = glow[c].getContext('2d');
      h.clearRect(0, 0, SPR, SPR);
      var hr = h.createRadialGradient(r, r, 0, r, r, r);
      hr.addColorStop(0, css(tint, 1)); hr.addColorStop(0.35, css(tint, 0.45));
      hr.addColorStop(0.7, css(tint, 0.12)); hr.addColorStop(1, css(tint, 0));
      h.fillStyle = hr; h.fillRect(0, 0, SPR, SPR);
    }
  }
  paintSprites();

  /* ---- geometry ------------------------------------------------------------ */
  var W = 1, H = 1, F = 1, hw = 1, hh = 1, DESC = 1, dprNow = 1;
  var hazeCv = doc.createElement('canvas'), hazeCtx = hazeCv.getContext('2d'), hazeKey = '';
  function resize() {
    W = Math.max(1, innerWidth); H = Math.max(1, innerHeight);
    var budget = Math.sqrt(1.6e6 / (W * H));
    dprNow = clamp(Math.min(global.devicePixelRatio || 1, T.dpr, budget), 0.75, 2);
    canvas.width = Math.round(W * dprNow); canvas.height = Math.round(H * dprNow);
    ctx.setTransform(dprNow, 0, 0, dprNow, 0, 0);
    /* The haze is all gradient, so it is painted at a quarter of the size
       and stretched: eight huge soft blends a frame were the expensive part. */
    hazeCv.width = Math.max(1, Math.round(W / 4)); hazeCv.height = Math.max(1, Math.round(H / 4));
    hazeKey = '';
    F = H * 0.95;
    hw = (W / 2) / F; hh = (H / 2) / F;
    /* The descent is sized to the page, so the nearest field moves at
       NEAR_RATE of the copy's speed however long the page is. */
    DESC = NEAR_RATE * 1.1 * scrollRange() / F;
  }
  function docBox() { return (doc.querySelector('.doc') || doc.body).getBoundingClientRect(); }
  function scrollRange() { return Math.max(1, docBox().height - innerHeight); }
  /* Measured from the document's rectangle rather than window.scrollY, for
     the same reason js/app.js does: embedded, the window may not scroll. */
  function scrollFrac() { var r = docBox(); return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); }

  /* ---- the clearing round the model ---------------------------------------
     js/app.js publishes the model as __axon.field. Where it stands whole the
     space thins to almost nothing over its disc; taken apart, there is no
     disc to keep clear. */
  var clearX = 0, clearY = 0, clearR = 0, clearK = 0;
  function readClearing() {
    var fld = global.__axon && global.__axon.field;
    if (!fld || !fld.w) { clearK = 0; return; }
    clearX = fld.w * fld.originX; clearY = fld.h * fld.originY;
    clearR = fld.radius * fld.zoom * (fld.stretchX || 1) * 1.08;
    clearK = 1 - clamp(fld.scatter || 0, 0, 1);
  }
  function clearing(x, y) {
    if (clearK <= 0) return 1;
    var dx = x - clearX, dy = y - clearY, d = Math.sqrt(dx * dx + dy * dy);
    return 1 - clearK * 0.86 * (1 - smooth(clearR * 0.55, clearR * 1.2, d));
  }

  /* ---- drawing ------------------------------------------------------------- */
  var STEPS = 20, BUCKETS = [];
  for (i = 0; i < 2 * (STEPS + 1); i++) BUCKETS.push([]);
  var t0 = performance.now(), last = t0;
  function draw(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var t = reduced ? 0 : (now - t0) / 1000;
    easeColours(dt);
    if (colMoving) paintSprites();
    readClearing();

    var sf = reduced ? 0 : scrollFrac();
    var camY = sf * DESC, camZ = sf * FORWARD * RANGE + t * DRIFT;
    var A = col[5][0];                          /* the skin's strength */
    var HAZE = isDark() ? 0.36 : 0.24;          /* colour reads louder on a light ground */
    var cx = W / 2, cy = H / 2;
    /* The volume wraps vertically as well as in depth: a slab one far-frustum
       tall, centred on the camera, so every mote is somewhere you can see it.
       Positions are still a pure function of the scroll, so flying back up
       returns exactly the same view. */
    var xs = FAR * hw * 1.08, ys = FAR * hh * 1.1, YR = 2 * ys;

    ctx.clearRect(0, 0, W, H);

    /* haze — far, huge, faint; repainted only when it has moved */
    var key = sf.toFixed(4) + (colMoving ? now : '') + HAZE;
    if (key !== hazeKey) {
      hazeKey = key;
      var hw4 = hazeCv.width, hh4 = hazeCv.height;
      hazeCtx.clearRect(0, 0, hw4, hh4);
      for (var h = 0; h < haze.length; h++) {
        var q = haze[h];
        var hx = hw4 * (0.5 + q.u * 0.55), hy = hh4 * (0.5 + (q.v - sf) * q.span), hr = q.r * hh4;
        if (hy + hr < 0 || hy - hr > hh4) continue;
        hazeCtx.globalAlpha = clamp(A * HAZE * q.a, 0, 1);
        hazeCtx.drawImage(glow[q.c], hx - hr, hy - hr, hr * 2, hr * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(hazeCv, 0, 0, W, H);

    /* dust — the crisp points are batched by colour and opacity into a few
       paths, so a frame builds a dozen fill styles rather than a thousand */
    for (var bi = 0; bi < BUCKETS.length; bi++) BUCKETS[bi].length = 0;
    for (var n = 0; n < dust.length; n++) {
      var p = dust[n];
      var z = NEAR + mod(p.z - camZ, RANGE);
      var px = cx + p.u * xs * F / z;
      if (px < -60 || px > W + 60) continue;
      var py = cy + (mod(p.v * YR - camY, YR) - ys) * F / z;
      if (py < -60 || py > H + 60) continue;
      var fog = smooth(FAR, FAR * 0.45, z) * smooth(NEAR, NEAR + 1.2, z);
      if (fog <= 0.01) continue;
      var al = A * p.a * fog * clearing(px, py);
      if (z < FOCUS) {
        /* out of focus: big, soft, and quieter the closer it is */
        var br = Math.min(p.s * 13 / z, 64);
        ctx.globalAlpha = clamp(al * 0.5 * (z / FOCUS), 0, 1);
        ctx.drawImage(bokeh[p.c ? 0 : 1], px - br, py - br, br * 2, br * 2);
      } else {
        var lv = Math.round(clamp(al * 0.9, 0, 1) * STEPS);
        if (lv > 0) BUCKETS[p.c * (STEPS + 1) + lv].push(px, py, clamp(p.s * 3.4 / z + 0.35, 0.7, 3.4));
      }
    }
    ctx.globalAlpha = 1;
    for (var bk = 0; bk < BUCKETS.length; bk++) {
      var L = BUCKETS[bk];
      if (!L.length) continue;
      var alt = bk > STEPS ? 1 : 0, lvl = bk - alt * (STEPS + 1);
      ctx.fillStyle = css(alt ? col[2] : col[0], lvl / STEPS);
      ctx.beginPath();
      for (var q2 = 0; q2 < L.length; q2 += 3) { ctx.moveTo(L[q2] + L[q2 + 2], L[q2 + 1]); ctx.arc(L[q2], L[q2 + 1], L[q2 + 2], 0, 6.2832); }
      ctx.fill();
    }

    /* neurons and their synapses */
    var P = [];
    for (var m = 0; m < neurons.length; m++) {
      var e = neurons[m];
      var ez = NEAR + mod(e.z - camZ, RANGE);
      var ex = cx + e.u * xs * F / ez, ey = cy + (mod(e.v * YR - camY, YR) - ys) * F / ez;
      var ef = smooth(FAR, FAR * 0.5, ez) * smooth(NEAR + 0.3, NEAR + 1.6, ez);
      P.push({ x: ex, y: ey, z: ez, f: ef * clearing(ex, ey) });
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    for (var s = 0; s < synapses.length; s++) {
      var sy = synapses[s], pa = P[sy.a], pb = P[sy.b];
      if (Math.abs(pa.z - pb.z) > 2.2) continue;              /* one of them just wrapped */
      /* A synapse close to the camera is a long line across the screen —
         across the copy, too — so length is what fades it, not just depth. */
      var len = Math.sqrt((pa.x - pb.x) * (pa.x - pb.x) + (pa.y - pb.y) * (pa.y - pb.y));
      if (len > H * 0.42) continue;
      var sa = A * Math.min(pa.f, pb.f) * 0.5 * (1 - smooth(H * 0.2, H * 0.42, len));
      if (sa < 0.01) continue;
      if ((pa.x < -40 && pb.x < -40) || (pa.x > W + 40 && pb.x > W + 40) ||
          (pa.y < -40 && pb.y < -40) || (pa.y > H + 40 && pb.y > H + 40)) continue;
      ctx.strokeStyle = css(col[2], clamp(sa, 0, 1));
      ctx.lineWidth = clamp(4 / ((pa.z + pb.z) / 2), 0.7, 2.2);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      if (sy.live) {
        var k = mod(t / sy.period + sy.phase, 1);
        var gx = pa.x + (pb.x - pa.x) * k, gy = pa.y + (pb.y - pa.y) * k;
        var gr = clamp(12 / ((pa.z + pb.z) / 2), 1.6, 5);
        ctx.globalAlpha = clamp(sa * 1.8 * Math.sin(k * Math.PI), 0, 1);
        ctx.drawImage(glow[2], gx - gr * 3, gy - gr * 3, gr * 6, gr * 6);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css(col[3], clamp(sa * 2.2 * Math.sin(k * Math.PI), 0, 1));
        ctx.beginPath(); ctx.arc(gx, gy, gr * 0.55, 0, 6.2832); ctx.fill();
      }
    }
    for (var c2 = 0; c2 < P.length; c2++) {
      var o = P[c2], na = A * o.f;
      if (na < 0.01 || o.x < -30 || o.x > W + 30 || o.y < -30 || o.y > H + 30) continue;
      var nr = clamp(neurons[c2].s * 15 / o.z, 1.4, 9);
      ctx.fillStyle = css(col[1], clamp(na * 0.95, 0, 1));
      ctx.beginPath(); ctx.arc(o.x, o.y, nr, 0, 6.2832); ctx.fill();
      if (neurons[c2].ring) {
        ctx.strokeStyle = css(col[1], clamp(na * 0.45, 0, 1));
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(o.x, o.y, nr * 2.3 + 2, 0, 6.2832); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* At rest only the drift moves, and it is slow enough that 30 frames a
     second cannot be told from 60 — so the canvas halves its rate until the
     page scrolls or the colours move again. */
  var lastSf = -1, lastDraw = 0;
  function loop(now) {
    var sfNow = scrollFrac();
    if (sfNow !== lastSf || colMoving || now - lastDraw > 31) {
      lastSf = sfNow; lastDraw = now;
      draw(now);
    }
    global.requestAnimationFrame(loop);
  }

  resize();
  var rt;
  global.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); if (reduced) draw(performance.now()); }, 90);
  }, { passive: true });
  /* The page grows as the webfont lands and the copy reflows, and the
     descent is sized to it, so it is re-measured whenever the document's
     height moves. */
  var docEl = doc.querySelector('.doc');
  if (docEl && global.ResizeObserver) {
    var lastH = 0;
    new ResizeObserver(function () {
      var hNow = docEl.getBoundingClientRect().height;
      if (Math.abs(hNow - lastH) < 2) return;
      lastH = hNow; DESC = NEAR_RATE * 1.1 * scrollRange() / F;
      if (reduced) draw(performance.now());
    }).observe(docEl);
  }

  if (reduced) draw(performance.now());
  else global.requestAnimationFrame(loop);
})(window);
