/* ============================================================================
   TOTEM DEMO — circuit layer
   ----------------------------------------------------------------------------
   The copy panel's wiring. Two pieces, and only two:

     · a bus down the panel's outer edge — two traces with 45° jogs and vias,
       the long one running into the readout strip's rail, pulses riding it
     · on the model's side, a chip whose traces fan out into a small
       three-layer network pointed at the model — the copy is wired to the
       thing it describes, and a signal runs chip → inputs → hidden → output
       on a loop, the output ring firing as it lands

   Everything sits in the panel's margins, never under a line of copy. The bus
   runs in the 1.8rem the rig extends past the column; the network lives in
   the gap between the column and the model and is sized to that gap — a
   compact chip-and-stubs when the gap is tight, nothing when there is none.
   On a phone, and on the two full-width sections where the model is behind
   the copy rather than beside it, there is no gap to wire across, so a
   compact network sits in the empty end of the readout strip instead.

   One SVG per panel, drawn in the panel's own pixels rather than a stretched
   viewBox, so a 45° trace stays 45° whatever shape the panel is. app.js
   redraws it whenever the panel changes size. All motion is CSS and gated on
   .live — see "circuit layer" in css/main.css.
   ========================================================================== */

(function (global) {
  'use strict';

  function r1(n) { return Math.round(n * 10) / 10; }

  function Sketch() { this.parts = []; }

  /* A polyline. Returns its length, which the pulses need: they travel in real
     pixels so a comet is the same length on a short trace and a long one. */
  Sketch.prototype.path = function (pts, cls, delay, pulseOnly) {
    var d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]), len = 0;
    for (var i = 1; i < pts.length; i++) {
      d += 'L' + r1(pts[i][0]) + ' ' + r1(pts[i][1]);
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    if (!pulseOnly) {
      /* pathLength normalises the draw-in: every trace draws from 100 to 0
         whatever its real length. */
      this.parts.push('<path class="' + cls + '" pathLength="100" d="' + d +
        '" style="--d:' + delay + 's"/>');
    }
    return { d: d, len: len };
  };

  Sketch.prototype.pulse = function (p, cls, delay) {
    this.parts.push('<path class="pl ' + cls + '" d="' + p.d + '" style="--len:' +
      Math.round(p.len) + ';--pd:' + delay + 's"/>');
  };

  Sketch.prototype.dot = function (x, y, r, cls, delay) {
    this.parts.push('<circle class="' + cls + '" cx="' + r1(x) + '" cy="' + r1(y) +
      '" r="' + r + '" style="--d:' + delay + 's"/>');
  };

  Sketch.prototype.raw = function (s) { this.parts.push(s); };

  /* A trace leaving a pin at height p and arriving at height q: out along the
     pin, one 45° jog, then level into the target. The PCB idiom — no curves,
     no arbitrary angles. */
  function jog(x0, p, xJog, q, x1) {
    var dy = Math.abs(q - p);
    return dy < 0.5 ? [[x0, p], [x1, q]]
      : [[x0, p], [xJog, p], [xJog + dy, q], [x1, q]];
  }

  /* ---- the bus: outer edge, x = 0, running down -------------------------- */
  function bus(s, H) {
    var rail = H - 27;                 /* the readout strip's rule — see .rig-strip::after */
    var ya = Math.round(H * 0.30), yb = Math.round(H * 0.64);

    var main = s.path([[15, 13], [6, 22], [6, rail]], 'tr bus', 0);
    s.dot(15, 13, 2.4, 'via bus', 0.05);
    s.dot(6, rail, 1.8, 'pad bus', 0.9);

    var side = s.path([[18, ya], [12, ya + 6], [12, yb - 6], [18, yb]], 'tr bus', 0.25);
    s.dot(18, ya, 2.2, 'via bus', 0.3);
    s.dot(18, yb, 2.2, 'via bus', 0.9);

    s.pulse(main, 'bus', 0);
    s.pulse(main, 'bus', 1.7);
    s.pulse(side, 'bus', 0.85);
  }

  /* ---- the network: chip at the origin, fanning out along +x ------------- */
  /* `L` is how far it may reach. Two sizes of network — a wider fan when
     there is room, a tighter one down to ~56px — then, below that, the chip
     and three short stubs ending in vias, and below that just the chip. When
     the model is already over the panel's edge there is nothing to wire
     across, so draw() leaves the connector out altogether. */
  function network(s, L) {
    s.raw('<rect class="chip" x="-5" y="-17" width="10" height="34" rx="1.5" style="--d:.15s"/>');
    s.raw('<circle class="chip-dot" cx="0" cy="-12.5" r="1.1" style="--d:.15s"/>');
    var pins = [-12, -4, 4, 12], k;
    for (k = 0; k < pins.length; k++) {
      s.raw('<path class="pin" d="M5 ' + pins[k] + 'H9"/>');
    }

    if (L < 56) {
      if (L < 22) return;
      var reach = Math.min(L, 40);
      for (k = 0; k < 3; k++) {
        var p = [-12, -4, 12][k], q = [-20, 0, 20][k];
        s.path(jog(9, p, 11, q, reach - 3), 'tr', 0.3 + k * 0.06);
        s.dot(reach, q, 2.2, 'via', 0.8);
      }
      return;
    }

    var roomy = L >= 96;
    L = Math.min(L, 132);
    var xi = L * (roomy ? 0.46 : 0.5), xh = L * (roomy ? 0.74 : 0.77), xo = L;
    var ins = roomy ? [-27, -9, 9, 27] : [-20, -7, 7, 20];
    var hid = roomy ? [-17, 0, 17] : [-12, 0, 12];
    var ri = roomy ? 2.6 : 2.3, rh = roomy ? 2.9 : 2.5, ro = roomy ? 3.4 : 3;
    var i, j, feeds = [];

    for (k = 0; k < 4; k++) {
      feeds.push(s.path(jog(9, pins[k], 15, ins[k], xi - ri), 'tr', 0.3 + k * 0.05));
    }
    /* Links first, so the nodes are drawn over their ends. */
    var links = {};
    for (i = 0; i < 4; i++) for (j = 0; j < 3; j++) {
      links[i + ':' + j] = s.path([[xi, ins[i]], [xh, hid[j]]], 'lk', 0.55 + i * 0.04);
    }
    var outs = [];
    for (j = 0; j < 3; j++) outs.push(s.path([[xh, hid[j]], [xo, 0]], 'lk', 0.75));

    /* One inference per loop, traced: two inputs light, then two hidden
       units, then the output — the same idea as the traced path through the
       model, at the scale of the panel. */
    s.pulse(feeds[1], 's1', 0); s.pulse(feeds[3], 's1', 0);
    s.pulse(links['1:1'], 's2', 0); s.pulse(links['3:2'], 's2', 0);
    s.pulse(outs[1], 's3', 0); s.pulse(outs[2], 's3', 0);

    for (i = 0; i < 4; i++) {
      if (i === 1 || i === 3) s.dot(xi, ins[i], ri * 2.3, 'hl f1', 0);
      s.dot(xi, ins[i], ri, 'nd', 0.7 + i * 0.04);
    }
    for (j = 0; j < 3; j++) {
      if (j > 0) s.dot(xh, hid[j], rh * 2.3, 'hl f2', 0);
      s.dot(xh, hid[j], rh, 'nd', 0.85 + j * 0.04);
    }
    s.dot(xo, 0, ro * 2, 'ring', 1.0);
    s.dot(xo, 0, ro * 2, 'fire', 0);
    s.dot(xo, 0, ro, 'nd out', 1.0);
  }

  /* ---- the strip network: a flat version for the readout's empty end ----- */
  function stripNet(s, L) {
    s.raw('<rect class="chip" x="-4" y="-7" width="8" height="14" rx="1.2" style="--d:.15s"/>');
    var pins = [-4, 0, 4], ins = [-8, 0, 8], hid = [-4.5, 4.5];
    var xi = L * 0.44, xh = L * 0.72, xo = L, k, j;
    var feeds = [];
    for (k = 0; k < 3; k++) {
      s.raw('<path class="pin" d="M4 ' + pins[k] + 'H6.5"/>');
      feeds.push(s.path(jog(6.5, pins[k], 10, ins[k], xi - 2), 'tr', 0.3 + k * 0.05));
    }
    var links = {};
    for (k = 0; k < 3; k++) for (j = 0; j < 2; j++) {
      links[k + ':' + j] = s.path([[xi, ins[k]], [xh, hid[j]]], 'lk', 0.55);
    }
    var outs = [s.path([[xh, hid[0]], [xo, 0]], 'lk', 0.7), s.path([[xh, hid[1]], [xo, 0]], 'lk', 0.7)];

    s.pulse(feeds[0], 's1', 0); s.pulse(feeds[2], 's1', 0);
    s.pulse(links['0:0'], 's2', 0); s.pulse(links['2:1'], 's2', 0);
    s.pulse(outs[0], 's3', 0); s.pulse(outs[1], 's3', 0);

    for (k = 0; k < 3; k++) s.dot(xi, ins[k], 2, 'nd', 0.7);
    for (j = 0; j < 2; j++) s.dot(xh, hid[j], 2.2, 'nd', 0.8);
    s.dot(xo, 0, 5.5, 'ring', 0.95);
    s.dot(xo, 0, 5.5, 'fire', 0);
    s.dot(xo, 0, 2.7, 'nd out', 0.95);
  }

  /* opts: { side: 'right' | 'left' | 'full', wide: bool, gap: px }
     side names where the MODEL is; the network points that way. */
  function draw(rig, opts) {
    var W = Math.round(rig.clientWidth), H = Math.round(rig.clientHeight);
    if (!W || !H) return;

    var svg = rig.querySelector('.rig-circ');
    var key = [W, H, opts.side, opts.wide ? 1 : 0, Math.round(opts.gap / 8)].join('|');
    if (svg && svg.getAttribute('data-key') === key) return;

    var s = new Sketch();
    var mirror = opts.side === 'left';
    if (mirror) s.raw('<g transform="translate(' + W + ' 0) scale(-1 1)">');

    if (opts.wide) bus(s, H);

    var strip = !opts.wide || opts.side === 'full';
    if (strip) {
      var L = Math.min(92, Math.max(56, W * 0.22));
      s.raw('<g class="net strip" transform="translate(' + r1(W - L - 10) + ' ' + (H - 10) + ')">');
      stripNet(s, L);
      s.raw('</g>');
    } else if (opts.gap >= 8) {
      /* Mid-height of the panel, which is mid-height of the viewport, which
         is where the model's centre is — the network points straight at it. */
      var yc = Math.round(Math.min(Math.max(H * 0.47, 70), H - 70));
      s.raw('<g class="net" transform="translate(' + W + ' ' + yc + ')">');
      network(s, opts.gap - 22);
      s.raw('</g>');
    }

    if (mirror) s.raw('</g>');

    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'rig-circ');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      rig.appendChild(svg);
    }
    svg.setAttribute('data-key', key);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = s.parts.join('');
  }

  global.RigCircuit = { draw: draw };
}(window));
