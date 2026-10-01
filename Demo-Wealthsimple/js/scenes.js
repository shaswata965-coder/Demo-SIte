/* ============================================================================
   LARCH — the two drawn backgrounds
   ----------------------------------------------------------------------------
   tree   behind the opener. A decision tree that grows like a larch branch:
          applications stream in along the trunk, split at each node by the
          rule written beside it, and settle on a leaf — gold where the leaf
          approves, quiet where it refers or declines. The branches sway.
   loss   behind the close. A dotted loss surface, breathing slowly. A point
          rolls downhill to the minimum with momentum, the way a model
          trains, rests there, and starts again from somewhere else.

   Both read their colours from the section they sit in (the room's ink,
   quieter ink and glow), so they follow the theme. They run only while on
   screen and not paused; with reduced motion each draws one still frame.
   ========================================================================== */

(function () {
  'use strict';
  var root = document.documentElement;
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function paused() { return root.getAttribute('data-motion') === 'paused'; }

  /* A seeded random, so the tree is the same tree on every visit. */
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  function Scene(canvas, impl) {
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, dpr = 1, visible = false, raf = 0, last = 0, t = 0, colors = {};
    function readColors() {
      var cs = getComputedStyle(canvas);
      colors = { ink: cs.getPropertyValue('--ink').trim(), ink2: cs.getPropertyValue('--ink-2').trim(), glow: cs.getPropertyValue('--glow').trim(), bg: cs.getPropertyValue('--bg').trim() };
    }
    function size() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      impl.layout(w, h);
      return true;
    }
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now; t += dt;
      impl.step(dt, t);
      ctx.clearRect(0, 0, w, h);
      impl.draw(ctx, w, h, t, colors);
      schedule();
    }
    function schedule() {
      if (!raf && visible && !paused() && !still.matches && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
    /* A still frame: run the simulation forward without drawing, then draw. */
    function rest() {
      for (var i = 0; i < impl.warm; i++) { t += 1 / 30; impl.step(1 / 30, t); }
      ctx.clearRect(0, 0, w, h);
      impl.draw(ctx, w, h, t, colors);
    }
    function refresh() {
      stop();
      if (!size()) return;
      readColors();
      rest();
      schedule();
    }

    readColors();
    if ('ResizeObserver' in window) new ResizeObserver(function () { refresh(); }).observe(canvas);
    else window.addEventListener('resize', refresh);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) schedule(); else stop(); }).observe(canvas);
    } else visible = true;
    new MutationObserver(function () { readColors(); if (!raf) { ctx.clearRect(0, 0, w, h); impl.draw(ctx, w, h, t, colors); } })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColors(); if (!raf) { ctx.clearRect(0, 0, w, h); impl.draw(ctx, w, h, t, colors); } });
    document.addEventListener('larch:motion', function () { if (paused()) stop(); else schedule(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else schedule(); });
    if (still.addEventListener) still.addEventListener('change', refresh);
    refresh();
  }

  /* ======================================================================
     tree
     ==================================================================== */
  function Tree() {
    var R = rng(7), nodes = [], leaves = [], movers = [], settled = [], W = 0, H = 0, wide = true, spawn = 0;
    var RULES = ['debt-to-income < 0.36', 'months on book ≥ 18', 'utilisation < 0.62', 'enquiries, 90 days ≤ 2', 'cash-flow cover ≥ 1.4'];
    var DEPTH_U = [0.33, 0.45, 0.56, 0.66, 0.75], LEAF_U = 0.86;

    /* Grow the tree once. Deeper nodes stop more often, the way real trees
       end in leaves of different depths. Then lay it out as a dendrogram:
       every leaf in one column, evenly spaced, and each split halfway
       between its two branches. */
    function grow(depth, parent) {
      var n = { depth: depth, parent: parent, kids: [], phase: R() * 6.28, flash: 0, pUp: 0.3 + R() * 0.4 };
      nodes.push(n);
      var stop = depth >= 5 || (depth >= 3 && R() < (depth === 3 ? 0.3 : 0.55));
      if (!stop) n.kids.push(grow(depth + 1, n), grow(depth + 1, n));
      else {
        n.leaf = true;
        n.rate = R();
        n.kind = n.rate > 0.42 ? 'approve' : n.rate > 0.24 ? 'refer' : 'decline';
        n.heat = 0;
        leaves.push(n);
      }
      return n;
    }
    grow(0, null);
    leaves.forEach(function (n, i) { n.v = 0.13 + 0.8 * (i + 0.5) / leaves.length; });
    (function place(n) { if (!n.leaf) { n.kids.forEach(place); n.v = (n.kids[0].v + n.kids[1].v) / 2; } })(nodes[0]);
    nodes.filter(function (n) { return !n.leaf; }).slice(0, RULES.length).forEach(function (n, i) { n.rule = RULES[i]; });

    function pos(n, t) {
      /* Outer branches sway more than inner ones. */
      var sway = (n.leaf ? 5 : n.depth) * 0.0022 * Math.sin(t * 0.4 + n.phase) + 0.002 * Math.sin(t * 0.23);
      return map(n.leaf ? LEAF_U : DEPTH_U[n.depth], n.v + sway);
    }
    function map(u, v) {
      if (wide) return [u * W, v * H];
      /* On a tall screen the tree grows downward under the copy. */
      return [0.06 * W + v * 0.88 * W, H * (0.42 + u * 0.56)];
    }
    function bez(a, b, k) {
      /* An S-curve leaving and arriving along the growth axis. */
      var c1, c2;
      if (wide) { var mx = (a[0] + b[0]) / 2; c1 = [mx, a[1]]; c2 = [mx, b[1]]; }
      else { var my = (a[1] + b[1]) / 2; c1 = [a[0], my]; c2 = [b[0], my]; }
      var u = 1 - k;
      return [u * u * u * a[0] + 3 * u * u * k * c1[0] + 3 * u * k * k * c2[0] + k * k * k * b[0],
              u * u * u * a[1] + 3 * u * u * k * c1[1] + 3 * u * k * k * c2[1] + k * k * k * b[1]];
    }
    function trunkStart(t) { var r = pos(nodes[0], t); return wide ? [0, r[1]] : [r[0], H * 0.42 - 40]; }

    return {
      warm: 300,
      layout: function (w, h) { W = w; H = h; wide = w / h > 0.9; },
      step: function (dt, t) {
        /* About six applications a second, a few more on a big screen. */
        spawn += dt * (wide ? 9 : 5);
        while (spawn >= 1) {
          spawn -= 1;
          movers.push({ from: null, to: nodes[0], k: 0, speed: 0.55 + R() * 0.35, jit: (R() - 0.5) * 6 });
        }
        for (var i = movers.length - 1; i >= 0; i--) {
          var p = movers[i];
          p.k += dt * p.speed * (p.from ? 1.6 : 0.7);
          if (p.k >= 1) {
            var n = p.to; n.flash = 1;
            if (n.leaf) {
              n.heat = Math.min(1, n.heat + 0.12);
              settled.push({ leaf: n, dx: 5 + Math.abs(R() + R() - 1) * 34, dy: (R() + R() - 1) * 11, life: 1 });
              movers.splice(i, 1);
              continue;
            }
            p.from = n; p.to = R() < n.pUp ? n.kids[0] : n.kids[1]; p.k = 0;
          }
        }
        for (var j = settled.length - 1; j >= 0; j--) { settled[j].life -= dt / 7; if (settled[j].life <= 0) settled.splice(j, 1); }
        if (settled.length > 700) settled.splice(0, settled.length - 700);
        for (var q = 0; q < nodes.length; q++) { nodes[q].flash = Math.max(0, nodes[q].flash - dt * 2.2); if (nodes[q].leaf) nodes[q].heat = Math.max(0, nodes[q].heat - dt * 0.12); }
      },
      draw: function (ctx, w, h, t, c) {
        var labels = w >= 760;
        ctx.lineCap = 'round';
        /* The trunk, then every branch. */
        var r0 = pos(nodes[0], t), ts = trunkStart(t);
        ctx.strokeStyle = c.ink; ctx.globalAlpha = 0.34; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(ts[0], ts[1]); ctx.lineTo(r0[0], r0[1]); ctx.stroke();
        nodes.forEach(function (n) {
          if (!n.parent) return;
          var a = pos(n.parent, t), b = pos(n, t);
          ctx.globalAlpha = 0.36 - n.depth * 0.035; ctx.lineWidth = Math.max(1.1, 2.4 - n.depth * 0.3);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]);
          for (var k = 1; k <= 16; k++) { var p = bez(a, b, k / 16); ctx.lineTo(p[0], p[1]); }
          ctx.stroke();
        });
        /* Leaves glow with what has just arrived. */
        leaves.forEach(function (n) {
          var p = pos(n, t);
          if (n.kind === 'approve' && n.heat > 0.02) {
            var g = ctx.createRadialGradient(p[0] + 14, p[1], 0, p[0] + 14, p[1], 46);
            g.addColorStop(0, c.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.22 * n.heat; ctx.fillStyle = g;
            ctx.fillRect(p[0] - 40, p[1] - 46, 110, 92);
          }
        });
        /* Settled applications. */
        settled.forEach(function (s) {
          var p = pos(s.leaf, t), x = wide ? p[0] + s.dx : p[0] + s.dy, y = wide ? p[1] + s.dy : p[1] + s.dx;
          ctx.globalAlpha = Math.min(1, s.life * 1.6) * (s.leaf.kind === 'approve' ? 0.95 : s.leaf.kind === 'refer' ? 0.55 : 0.32);
          ctx.fillStyle = s.leaf.kind === 'approve' ? c.glow : c.ink;
          ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill();
        });
        /* Nodes, with a ring when something passes through. */
        nodes.forEach(function (n) {
          var p = pos(n, t);
          ctx.globalAlpha = n.leaf ? 0.55 : 0.75; ctx.fillStyle = n.leaf && n.kind === 'approve' ? c.glow : c.ink;
          ctx.beginPath(); ctx.arc(p[0], p[1], n.leaf ? 2.4 : 3, 0, 6.283); ctx.fill();
          if (n.flash > 0.01 && !n.leaf) {
            ctx.globalAlpha = 0.55 * n.flash; ctx.strokeStyle = c.glow; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(p[0], p[1], 3 + (1 - n.flash) * 9, 0, 6.283); ctx.stroke();
          }
        });
        /* Applications in flight. */
        ctx.fillStyle = c.ink;
        movers.forEach(function (m) {
          var p;
          if (!m.from) { var a = trunkStart(t), b = pos(nodes[0], t); p = [a[0] + (b[0] - a[0]) * m.k, a[1] + (b[1] - a[1]) * m.k + (wide ? m.jit * (1 - m.k) : 0)]; }
          else p = bez(pos(m.from, t), pos(m.to, t), m.k);
          ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 6.283); ctx.fill();
        });
        /* The rules at the first splits, and each leaf's verdict. */
        if (labels) {
          ctx.font = '500 12px Jost, Futura, system-ui, sans-serif';
          ctx.fillStyle = c.ink2; ctx.globalAlpha = 1;
          ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          nodes.forEach(function (n) { if (n.rule) { var p = pos(n, t); ctx.fillText(n.rule, p[0] + 8, p[1] - 7); } });
          ctx.textBaseline = 'middle';
          leaves.forEach(function (n) {
            var p = pos(n, t);
            ctx.fillStyle = n.kind === 'approve' ? c.glow : c.ink2;
            ctx.globalAlpha = n.kind === 'approve' ? 0.95 : 0.8;
            ctx.fillText(n.kind, p[0] + 46, p[1]);
          });
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* ======================================================================
     loss
     ==================================================================== */
  function Loss() {
    var R = rng(11), W = 0, H = 0, NX = 60, NZ = 26, ball = null, trail = [], rest = 0, ring = 0, steps = 0;
    var MIN = [0.32, -0.18];
    function f(x, z, t) {
      var bowl = 0.42 * (0.8 * x * x + 1.25 * z * z);
      var well = -0.38 * Math.exp(-((x - MIN[0]) * (x - MIN[0]) + (z - MIN[1]) * (z - MIN[1])) / 0.09);
      var side = -0.16 * Math.exp(-((x + 0.52) * (x + 0.52) + (z - 0.42) * (z - 0.42)) / 0.05);
      var ripple = 0.045 * Math.sin(3.2 * x + t * 0.35) * Math.cos(2.6 * z - t * 0.25);
      return bowl + well + side + ripple;
    }
    function start() {
      var a = R() * 6.283;
      ball = { x: Math.cos(a) * 0.88, z: Math.sin(a) * 0.72, vx: 0, vz: 0 };
      trail = []; rest = 0; steps = 0;
    }
    start();
    /* World to screen: a camera above and in front of the surface. */
    var pitch = 0.5, cp = Math.cos(pitch), sp = Math.sin(pitch);
    function project(x, y, z) {
      var X = x * 1.95, Y = y * 0.9 - 0.95, Z = z * 1.05 + 2.6;
      var zc = Z * cp - Y * sp, yc = Y * cp + Z * sp;
      var focal = Math.min(W * 0.66, H * 1.3);
      return [W / 2 + X * focal / zc, H * 0.84 - yc * focal / zc, zc];
    }
    return {
      warm: 240,
      layout: function (w, h) { W = w; H = h; NX = w < 700 ? 34 : 60; NZ = w < 700 ? 20 : 26; },
      step: function (dt, t) {
        if (rest > 0) {
          rest += dt; ring = Math.min(1, ring + dt * 0.9);
          if (rest > 3.2) { start(); ring = 0; }
          return;
        }
        /* Gradient descent with momentum, measured by finite differences. */
        var e = 0.002, g0 = f(ball.x, ball.z, t);
        var gx = (f(ball.x + e, ball.z, t) - g0) / e, gz = (f(ball.x, ball.z + e, t) - g0) / e;
        var k = Math.min(dt * 60, 3);
        ball.vx = ball.vx * Math.pow(0.93, k) - gx * 0.0009 * k;
        ball.vz = ball.vz * Math.pow(0.93, k) - gz * 0.0009 * k;
        ball.x += ball.vx * k; ball.z += ball.vz * k; steps += k;
        trail.push([ball.x, ball.z]); if (trail.length > 140) trail.shift();
        if (Math.hypot(ball.vx, ball.vz) < 0.00035 && steps > 90) { rest = 0.001; ring = 0; }
      },
      draw: function (ctx, w, h, t, c) {
        /* The surface as dots: nearer is larger and brighter, lower is
           warmer. */
        for (var j = 0; j < NZ; j++) {
          var z = 1 - 2 * j / (NZ - 1);
          for (var i = 0; i < NX; i++) {
            var x = -1 + 2 * i / (NX - 1), y = f(x, z, t), p = project(x, y, z);
            var near = 1 - (z + 1) / 2;
            var low = Math.max(0, Math.min(1, (0.1 - y) / 0.45));
            ctx.globalAlpha = (0.18 + 0.55 * near) * (0.55 + 0.45 * low);
            ctx.fillStyle = low > 0.45 ? c.glow : c.ink2;
            var r = 0.8 + near * 1.3;
            ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.283); ctx.fill();
          }
        }
        /* The path so far, then the point itself. */
        if (trail.length > 1) {
          ctx.lineWidth = 2; ctx.strokeStyle = c.glow; ctx.lineCap = 'round';
          for (var q = 1; q < trail.length; q++) {
            var a = project(trail[q - 1][0], f(trail[q - 1][0], trail[q - 1][1], t), trail[q - 1][1]);
            var b = project(trail[q][0], f(trail[q][0], trail[q][1], t), trail[q][1]);
            ctx.globalAlpha = 0.75 * q / trail.length;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          }
        }
        var bp = project(ball.x, f(ball.x, ball.z, t), ball.z);
        var halo = ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], 22);
        halo.addColorStop(0, c.glow); halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.45; ctx.fillStyle = halo; ctx.fillRect(bp[0] - 22, bp[1] - 22, 44, 44);
        ctx.globalAlpha = 1; ctx.fillStyle = c.glow;
        ctx.beginPath(); ctx.arc(bp[0], bp[1], 4.5, 0, 6.283); ctx.fill();
        if (rest > 0) {
          ctx.globalAlpha = 0.7 * (1 - ring); ctx.strokeStyle = c.glow; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(bp[0], bp[1], 6 + ring * 40, (6 + ring * 40) * 0.42, 0, 0, 6.283); ctx.stroke();
        }
        /* The training readout, beside the point on a wide screen. */
        if (w >= 760) {
          ctx.globalAlpha = 0.9; ctx.fillStyle = c.ink2;
          ctx.font = '500 12px Jost, Futura, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          var loss = (f(ball.x, ball.z, t) + 0.62).toFixed(3);
          ctx.fillText((rest > 0 ? 'converged' : 'step ' + Math.round(steps)) + '  ·  loss ' + loss, bp[0] + 16, bp[1] - 14);
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  var KINDS = { tree: Tree, loss: Loss };
  document.querySelectorAll('canvas[data-scene]').forEach(function (cv) {
    var make = KINDS[cv.getAttribute('data-scene')];
    if (make && cv.getContext) Scene(cv, make());
  });
})();
