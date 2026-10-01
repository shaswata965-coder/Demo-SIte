/* ============================================================================
   LARCH DEMO — the thread layer
   ----------------------------------------------------------------------------
   What the AXON circuit layer was to its instrument panel, re-cut for a quiet
   page. That layer wired the copy to the model with PCB traces and a little
   neural network; the idiom here is a statement, not a circuit board, so the
   same two pieces become:

     · a ledger rule down the frame's outer edge — one hairline with year
       ticks along it, a coin at its head, and on the live screen a single
       bead of light walking down it
     · on the object's side, a growth curve — compound interest, drawn —
       leaving a pin on the frame's inner edge and rising toward the object,
       with coins along it that get larger as it climbs. Once a loop a light
       runs up the curve, each coin catches it as it passes, and the last one
       chimes. The copy is still wired to the thing it describes; the wire is
       just money growing rather than a signal firing.

   The rules are the circuit's rules, unchanged: everything sits in the
   margins and never under a line of copy; the curve is sized to the measured
   gap between the frame and the object (a full curve, a shorter one, a stub,
   then nothing); on a phone, and on a section where the object is behind the
   copy, there is no gap, so a flat version sits in the empty end of the
   frame's strip instead.

   One SVG per frame, drawn in the frame's own pixels, redrawn by app.js when
   the frame changes size. All motion is CSS and gated on .live — see "thread
   layer" in css/main.css.
   ========================================================================== */

(function (global) {
  'use strict';

  function r1(n) { return Math.round(n * 10) / 10; }

  function Sketch() { this.parts = []; }

  /* A path from points, as straight runs or one smooth curve through them
     (Catmull-Rom → cubic). Returns its d and its length; the light that runs
     along it travels in real pixels, so it is the same size on any curve. */
  Sketch.prototype.path = function (pts, cls, delay, smooth) {
    var d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]), len = 0, i;
    if (smooth && pts.length > 2) {
      for (i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += 'C' + r1(c1[0]) + ' ' + r1(c1[1]) + ' ' + r1(c2[0]) + ' ' + r1(c2[1]) + ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
      }
    } else {
      for (i = 1; i < pts.length; i++) d += 'L' + r1(pts[i][0]) + ' ' + r1(pts[i][1]);
    }
    for (i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (cls) {
      this.parts.push('<path class="' + cls + '" pathLength="100" d="' + d + '" style="--d:' + delay + 's"/>');
    }
    return { d: d, len: len };
  };

  Sketch.prototype.light = function (p, cls) {
    this.parts.push('<path class="pl ' + cls + '" d="' + p.d + '" style="--len:' + Math.round(p.len) + '"/>');
  };

  Sketch.prototype.dot = function (x, y, r, cls, delay, extra) {
    this.parts.push('<circle class="' + cls + '" cx="' + r1(x) + '" cy="' + r1(y) +
      '" r="' + r1(r) + '" style="--d:' + delay + 's' + (extra || '') + '"/>');
  };

  Sketch.prototype.raw = function (s) { this.parts.push(s); };

  /* ---- the ledger: outer edge, x = 0, running down ----------------------- */
  function ledger(s, H) {
    var rail = H - 27;                 /* the strip's rule — see .frame-strip::after */
    var top = 24, x = 7;
    var line = s.path([[x, top], [x, rail]], 'ld', 0);
    s.dot(x, 13, 4, 'ld-coin', 0.05);
    s.dot(x, 13, 1.4, 'ld-dot', 0.1);
    /* Ticks every 26px, every fourth one long — a year and its quarters. */
    var n = Math.floor((rail - top - 10) / 26);
    for (var k = 1; k <= n; k++) {
      var y = top + k * 26, lg = k % 4 === 0;
      s.raw('<path class="tk' + (lg ? ' lg' : '') + '" d="M' + x + ' ' + y + 'h' + (lg ? 8 : 4) +
            '" style="--d:' + r1(0.2 + k * 0.025) + 's"/>');
    }
    s.light(line, 'drop');
  }

  /* ---- the growth curve: pin at the origin, rising along +x -------------- */
  /* `L` is how far it may reach. A full curve with five coins when there is
     room, three down to ~56px, then a pin, a stub and one coin, then just the
     pin. When the object is already over the frame's edge there is nothing
     to reach across, so draw() leaves it out altogether. */
  function growth(s, L, rise) {
    s.raw('<path class="pin" d="M0 ' + r1(rise) + 'h6" style="--d:.15s"/>');
    s.dot(6, rise, 2.4, 'pin-dot', 0.15);
    if (L < 22) return;
    if (L < 56) {
      var reach = Math.min(L, 40);
      s.path([[6, rise], [reach - 4, rise - 8]], 'gr', 0.3);
      s.dot(reach, rise - 8, 3, 'gc', 0.7);
      return;
    }

    var roomy = L >= 96;
    L = Math.min(L, 150);
    /* y = e^(kx), normalised: flat for most of its length and climbing at
       the end, which is what compounding looks like. */
    var kk = 2.8, pts = [], N = 24, i;
    for (i = 0; i <= N; i++) {
      var f = i / N, g = (Math.exp(kk * f) - 1) / (Math.exp(kk) - 1);
      pts.push([6 + f * (L - 6), rise - g * rise]);
    }
    var curve = s.path(pts, 'gr', 0.3, true);
    s.light(curve, 'up');

    var at = roomy ? [0.30, 0.52, 0.70, 0.84] : [0.40, 0.70];
    for (i = 0; i < at.length; i++) {
      var p = pts[Math.round(at[i] * N)], r = 1.9 + i * (roomy ? 0.45 : 0.7);
      /* --hd is when the light reaches this coin, as a share of its run. */
      s.dot(p[0], p[1], r * 2.4, 'hl', 0, ';--hd:' + at[i].toFixed(2));
      s.dot(p[0], p[1], r, 'gc', 0.6 + i * 0.08);
    }
    var end = pts[N], ro = roomy ? 4.2 : 3.4;
    s.dot(end[0], end[1], ro * 2, 'ring', 1.0);
    s.dot(end[0], end[1], ro * 2, 'chime', 0);
    s.dot(end[0], end[1], ro, 'gc end', 1.0);
  }

  /* ---- the strip curve: a flat version for the strip's empty end --------- */
  function stripGrowth(s, L) {
    var pts = [], N = 16, i, kk = 2.4;
    for (i = 0; i <= N; i++) {
      var f = i / N, g = (Math.exp(kk * f) - 1) / (Math.exp(kk) - 1);
      pts.push([f * L, 6 - g * 12]);
    }
    s.dot(0, 6, 1.8, 'pin-dot', 0.15);
    var curve = s.path(pts, 'gr', 0.3, true);
    s.light(curve, 'up');
    var at = [0.45, 0.75];
    for (i = 0; i < at.length; i++) {
      var p = pts[Math.round(at[i] * N)];
      s.dot(p[0], p[1], 4.2, 'hl', 0, ';--hd:' + at[i]);
      s.dot(p[0], p[1], 1.8 + i * 0.5, 'gc', 0.6 + i * 0.08);
    }
    s.dot(L, -6, 5.6, 'ring', 0.95);
    s.dot(L, -6, 5.6, 'chime', 0);
    s.dot(L, -6, 2.8, 'gc end', 0.95);
  }

  /* opts: { side: 'right' | 'left' | 'full', wide: bool, gap: px }
     side names where the OBJECT is; the curve rises that way. */
  function draw(frame, opts) {
    var W = Math.round(frame.clientWidth), H = Math.round(frame.clientHeight);
    if (!W || !H) return;

    var svg = frame.querySelector('.frame-thread');
    var key = [W, H, opts.side, opts.wide ? 1 : 0, Math.round(opts.gap / 8)].join('|');
    if (svg && svg.getAttribute('data-key') === key) return;

    var s = new Sketch();
    var mirror = opts.side === 'left';
    if (mirror) s.raw('<g transform="translate(' + W + ' 0) scale(-1 1)">');

    if (opts.wide) ledger(s, H);

    var strip = !opts.wide || opts.side === 'full';
    if (strip) {
      var L = Math.min(96, Math.max(56, W * 0.22));
      s.raw('<g class="grow strip" transform="translate(' + r1(W - L - 10) + ' ' + (H - 10) + ')">');
      stripGrowth(s, L);
      s.raw('</g>');
    } else if (opts.gap >= 8) {
      /* Mid-height of the frame is mid-height of the viewport, which is where
         the object's centre is: the curve climbs to end level with it. */
      var yc = Math.round(Math.min(Math.max(H * 0.5, 70), H - 90));
      var rise = Math.min(60, Math.max(28, opts.gap * 0.4));
      s.raw('<g class="grow" transform="translate(' + W + ' ' + yc + ')">');
      growth(s, opts.gap - 22, rise);
      s.raw('</g>');
    }

    if (mirror) s.raw('</g>');

    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'frame-thread');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      frame.appendChild(svg);
    }
    svg.setAttribute('data-key', key);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = s.parts.join('');
  }

  global.FrameThread = { draw: draw };
}(window));
