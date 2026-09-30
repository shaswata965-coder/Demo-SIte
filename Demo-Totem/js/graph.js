/* ============================================================================
   TOTEM DEMO — section graphs
   ----------------------------------------------------------------------------
   The flooded sections are not a panel of copy beside the model. They are the
   model taken apart: the copy is broken into nodes — the title, a claim, each
   service, each project, each metric, each partner — and the nodes are wired
   together. This file draws the wiring and tells the model where to go.

     build(el)     reads the links declared on the graph (data-links, as
                   "from:port>to:port", ports r/l/t/b) and creates one SVG
                   edge per link: the trace, a port at each end, a pulse
     layout(g, …)  lays the traces over wherever the nodes actually are, and —
                   on a wide screen — returns the model's targets: one point
                   per unit, beaded along the links and ringed round the
                   cards, measured where the section will be once it is pinned

   Layout is CSS grid; nothing here positions a node. So the wiring can never
   disagree with the page — it is measured off it — and the page works with
   scripts off, just unwired.
   ========================================================================== */

(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var DIR = { r: [1, 0], l: [-1, 0], t: [0, -1], b: [0, 1] };

  function el(name, cls) {
    var n = document.createElementNS(SVGNS, name);
    if (cls) n.setAttribute('class', cls);
    return n;
  }
  function r1(n) { return Math.round(n * 10) / 10; }

  function build(root) {
    var nodes = {}, list = root.querySelectorAll('[data-node]'), i;
    for (i = 0; i < list.length; i++) nodes[list[i].getAttribute('data-node')] = list[i];

    var svg = el('svg', 'g-links');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    root.insertBefore(svg, root.firstChild);

    var links = [], spec = (root.getAttribute('data-links') || '').trim().split(/\s+/);
    for (i = 0; i < spec.length; i++) {
      var m = /^([\w-]+):([rltb])>([\w-]+):([rltb])$/.exec(spec[i]);
      if (!m || !nodes[m[1]] || !nodes[m[3]]) continue;
      var from = nodes[m[1]];
      /* An edge draws just after the node it leaves, and reaches the next one
         as that one arrives: the graph assembles along its own wiring. */
      var order = (parseFloat(from.getAttribute('data-order')) || 0) + 0.5;
      var g = el('g', 'g-edge');
      g.setAttribute('data-order', order);
      var path = el('path', 'g-link');
      path.setAttribute('pathLength', '100');
      var pulse = el('path', 'g-pulse');
      pulse.style.setProperty('--pd', (i % 5) * 0.37 + 's');
      var p0 = el('circle', 'g-port'), p1 = el('circle', 'g-port');
      p0.setAttribute('r', '3'); p1.setAttribute('r', '3');
      g.appendChild(path); g.appendChild(pulse); g.appendChild(p0); g.appendChild(p1);
      svg.appendChild(g);
      links.push({ from: from, fp: m[2], to: nodes[m[3]], tp: m[4],
                   g: g, path: path, pulse: pulse, p0: p0, p1: p1, pts: null });
    }
    return { root: root, svg: svg, links: links, nodes: nodes };
  }

  function port(r, p) {
    return p === 'r' ? [r.right, (r.top + r.bottom) / 2]
         : p === 'l' ? [r.left, (r.top + r.bottom) / 2]
         : p === 't' ? [(r.left + r.right) / 2, r.top]
         : [(r.left + r.right) / 2, r.bottom];
  }

  /* A cubic leaving each port along its own direction, so a trace always
     comes out of a card square to its edge. Sampled into a polyline, which is
     what the pulses are sized from and what the model's units are beaded on. */
  function curve(a, da, b, db) {
    var dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    var k = Math.max(24, dist * 0.45);
    var c1 = [a[0] + da[0] * k, a[1] + da[1] * k], c2 = [b[0] + db[0] * k, b[1] + db[1] * k];
    var pts = [], len = 0, prev = null;
    for (var s = 0; s <= 48; s++) {
      var t = s / 48, u = 1 - t;
      var x = u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0];
      var y = u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1];
      if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
      pts.push(x, y, len);
    }
    return {
      d: 'M' + r1(a[0]) + ' ' + r1(a[1]) + 'C' + r1(c1[0]) + ' ' + r1(c1[1]) + ' ' +
         r1(c2[0]) + ' ' + r1(c2[1]) + ' ' + r1(b[0]) + ' ' + r1(b[1]),
      pts: pts, len: len
    };
  }

  /* Walk a polyline [x, y, cumulative, …] and drop `n` evenly spaced points. */
  function bead(pts, len, n, out, dx, dy) {
    var seg = 0;
    for (var i = 0; i < n; i++) {
      var at = (i + 0.5) / n * len;
      while (seg < pts.length - 6 && pts[seg + 5] < at) seg += 3;
      var l0 = pts[seg + 2], l1 = pts[seg + 5], f = l1 > l0 ? (at - l0) / (l1 - l0) : 0;
      out.push(pts[seg] + (pts[seg + 3] - pts[seg]) * f + dx,
               pts[seg + 1] + (pts[seg + 4] - pts[seg + 1]) * f + dy);
    }
  }

  /* The ring round a card, a little outside its edge — a rectangle for a card,
     a circle for a round node — as the same kind of polyline. */
  function ring(r, round) {
    var pts = [], len = 0, prev = null, s, x, y;
    var pad = 9, cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    if (round) {
      var rad = Math.max(r.right - r.left, r.bottom - r.top) / 2 + pad;
      for (s = 0; s <= 64; s++) {
        x = cx + Math.cos(s / 64 * Math.PI * 2 - Math.PI / 2) * rad;
        y = cy + Math.sin(s / 64 * Math.PI * 2 - Math.PI / 2) * rad;
        if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
        prev = [x, y]; pts.push(x, y, len);
      }
    } else {
      var L = r.left - pad, R = r.right + pad, T = r.top - pad, B = r.bottom + pad;
      var corners = [[L, T], [R, T], [R, B], [L, B], [L, T]];
      for (s = 0; s < corners.length; s++) {
        x = corners[s][0]; y = corners[s][1];
        if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
        prev = [x, y]; pts.push(x, y, len);
      }
    }
    return { pts: pts, len: len };
  }

  /* mode 'graph' wires the section and returns the model's targets; any other
     mode (the stacked spine on narrow screens) has no wiring to draw.
     `rectOf`, if given, is asked where a node is instead of the node itself —
     app.js passes one so that a card lifted on hover drags its links and its
     ring of units with it, measured without the tilt or the flip it is doing,
     which would otherwise pull the wires to its middle as it turns edge-on. */
  function layout(g, mode, units, rectOf) {
    if (mode !== 'graph') return null;
    var box = g.root.getBoundingClientRect();
    var W = Math.round(box.width), H = Math.round(box.height);
    g.svg.setAttribute('width', W);
    g.svg.setAttribute('height', H);
    g.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    function local(node) {
      var r = rectOf ? rectOf(node) : node.getBoundingClientRect();
      return { left: r.left - box.left, right: r.right - box.left,
               top: r.top - box.top, bottom: r.bottom - box.top };
    }

    var linkLen = 0, i;
    for (i = 0; i < g.links.length; i++) {
      var L = g.links[i];
      var a = port(local(L.from), L.fp), b = port(local(L.to), L.tp);
      var c = curve(a, DIR[L.fp], b, DIR[L.tp]);
      L.path.setAttribute('d', c.d);
      L.pulse.setAttribute('d', c.d);
      L.pulse.style.setProperty('--len', Math.round(c.len));
      L.p0.setAttribute('cx', r1(a[0])); L.p0.setAttribute('cy', r1(a[1]));
      L.p1.setAttribute('cx', r1(b[0])); L.p1.setAttribute('cy', r1(b[1]));
      L.pts = c.pts; L.len = c.len;
      linkLen += c.len;
    }

    /* Where this section will be once it is pinned: the copy's sticky wrapper
       sits at the top of the viewport, so a node's resting position is its
       offset inside that wrapper. The model is sent there, not to wherever
       the section happens to be mid-scroll — so as you arrive, the units
       gather into the finished scaffold and the copy slides up into it. */
    var body = g.root.closest('.ch-body');
    var dx = box.left, dy = box.top - (body ? body.getBoundingClientRect().top : 0);

    var rings = [], ringLen = 0, cards = g.root.querySelectorAll('.g-card, .g-round');
    for (i = 0; i < cards.length; i++) {
      var rg = ring(local(cards[i]), cards[i].classList.contains('g-round'));
      rings.push(rg); ringLen += rg.len;
    }

    /* Just over half the units bead the links; the rest ring the cards. Each
       path gets a share in proportion to its length, so the spacing is even
       across the whole scaffold. Links first, in link order: consecutive units
       sit next to each other in most arrangements, so they stream out
       together rather than criss-crossing the screen. */
    var out = [], nLinks = linkLen ? Math.round(units * (ringLen ? 0.56 : 1)) : 0;
    var nRings = units - nLinks, used = 0, n;
    for (i = 0; i < g.links.length; i++) {
      n = i === g.links.length - 1 ? nLinks - used : Math.round(nLinks * g.links[i].len / linkLen);
      bead(g.links[i].pts, g.links[i].len, Math.max(0, n), out, dx, dy);
      used += Math.max(0, n);
    }
    used = 0;
    for (i = 0; i < rings.length; i++) {
      n = i === rings.length - 1 ? nRings - used : Math.round(nRings * rings[i].len / ringLen);
      bead(rings[i].pts, rings[i].len, Math.max(0, n), out, dx, dy);
      used += Math.max(0, n);
    }
    return out.length ? new Float32Array(out) : null;
  }

  global.SectionGraph = { build: build, layout: layout };
}(window));
