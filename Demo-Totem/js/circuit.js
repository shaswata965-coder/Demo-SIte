/* ============================================================================
   TOTEM DEMO — circuit layer
   ----------------------------------------------------------------------------
   The copy panel's wiring: a bus down the panel's outer edge — two traces with
   45° jogs and vias, the long one running into the readout strip's rail,
   pulses riding it. (A chip wired into a small network on the model's side
   used to sit here too; it was removed.)

   It sits in the margin the rig extends past the column (1.8rem), never under
   a line of copy, and is drawn only on a wide screen. One SVG per panel, drawn
   in the panel's own pixels rather than a stretched viewBox, so a 45° trace
   stays 45° whatever shape the panel is. app.js redraws it whenever the panel
   changes size. All motion is CSS and gated on .live — see "circuit layer" in
   css/main.css.
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

  /* opts: { side: 'right' | 'left' | 'full', wide: bool }
     side names where the MODEL is; the bus runs down the opposite edge. */
  function draw(rig, opts) {
    var W = Math.round(rig.clientWidth), H = Math.round(rig.clientHeight);
    if (!W || !H) return;

    var svg = rig.querySelector('.rig-circ');
    var key = [W, H, opts.side, opts.wide ? 1 : 0].join('|');
    if (svg && svg.getAttribute('data-key') === key) return;

    var s = new Sketch();
    var mirror = opts.side === 'left';
    if (mirror) s.raw('<g transform="translate(' + W + ' 0) scale(-1 1)">');

    if (opts.wide) bus(s, H);

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
