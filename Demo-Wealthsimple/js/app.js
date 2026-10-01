/* ============================================================================
   LARCH DEMO — orchestration
   ----------------------------------------------------------------------------
   The AXON demo's orchestration, carried over whole: scroll position becomes
   one number, `progress`, in [0, 6], and everything else is derived from it —

     · which arrangement the object holds, and how far it has turned
     · where the object sits across the viewport, how large it is drawn, and
       how far forward it comes — three numbers written into the field
     · the chapter's discrete aesthetic (display weight and softness),
       stamped as data-chapter and transitioned by CSS

   The canvas is fixed at viewport size and never moves. A section that can
   live in half a screen parks the object in the other half; a taken-apart
   section sends its coins out onto the page. Both are the same numbers,
   lerped on the same ease as the morph, which is why the two kinds of
   section transition into each other instead of cutting.

   Each screen plays a reveal when it lands: the title types, then the frame
   comes in and its wash makes one pass that reveals the rest a line at a
   time. That is read off where the title actually is on screen, every frame,
   and it rewinds once the screen has gone, so landing on it again plays it
   again.

   What is new here is only what the object needs: CoinField (js/asset.js)
   in place of the neural model, the frame and its thread (js/thread.js) in
   place of the rig and its circuit, and no HUD — a product picture is framed
   by its room and its shadow, not by corner marks and an axis gizmo.

   Rule this file follows: the copy is the page. `armReveals` runs after the
   object is built, so a failure there leaves a readable static page and the
   error reaches the console instead of being swallowed.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* One entry per section, in order. `x` is where the object sits across
     the viewport: 'right' and 'left' park it in the half the copy is not
     using, measured against the content container rather than the raw
     viewport. A number is a literal fraction — the taken-apart sections,
     whose leftover object heads for the middle while its coins fly out.

     `dim` is the stage's opacity at rest and `zoom` how large the object is
     drawn. Larger than AXON's model (0.76–0.88 there; 0.88–0.92 here): the language being
     borrowed gives each screen one big product picture, so the object fills
     its half and is allowed to lean toward the edge of it.

     `graph` marks the sections where the object is taken apart: Accounts,
     Goals and Payments. There the copy is a network of nodes (js/graph.js)
     and the coins leave the object to bead the links and ring the cards.

     `skin` names the section's colour set — see css/tokens.css. The names
     here and the .sk-* classes in index.html have to agree. */
  var CHAPTERS = [
    { id: 'cone',      x: 'right', dim: 1.00, zoom: 0.90, skin: 'paper' },
    { id: 'stacks',    x: 0.50,    dim: 1.00, zoom: 0.95, skin: 'sage',  graph: true },
    { id: 'pie',       x: 'right', dim: 1.00, zoom: 0.92, skin: 'paper' },
    { id: 'summit',    x: 0.50,    dim: 1.00, zoom: 0.95, skin: 'dusk',  graph: true },
    { id: 'hourglass', x: 'left',  dim: 1.00, zoom: 0.92, skin: 'paper' },
    { id: 'card',      x: 0.50,    dim: 1.00, zoom: 0.95, skin: 'clay',  graph: true },
    { id: 'coin',      x: 'right', dim: 1.00, zoom: 0.88, skin: 'night' }
  ];

  /* Narrow screens have no half to park anything in: the object is a
     backdrop for the whole page, centred and faint enough to read a
     paragraph through. Fainter than AXON's (0.42): a solid object of opaque
     coins covers more of the page than a wireframe did. */
  var PHONE = { x: 0.5, dim: 0.30, zoom: 1.24 };

  /* How far the object rolls per full width of travel. A side-to-side swap is
     ~0.47 of the viewport, so this reproduces the 0.78 roll the page had when
     crossing was the only kind of movement; the smaller drifts of the
     full-bleed sections get a proportionally smaller roll. */
  var SPIN_PER_WIDTH = 1.66;

  var sections = [];

  /* The per-frame update armReveals() returns, set once every heading has
     been rebuilt and the webfont has landed (see init); frame() calls it.
     Null until then, which is why frame() guards it — boot() runs several
     frames before reveals are armed. */
  var reveal = null;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wide() { return innerWidth >= 900; }
  /* Wide enough and tall enough for a section to be a network rather than a
     spine — the same query as the graph layouts in css/main.css. */
  var graphMQ = matchMedia('(min-width: 1100px) and (min-height: 600px)');
  function graphMode() { return graphMQ.matches; }

  function boot() {
    /* The artifact host wraps this file in its own document, so attributes
       written on <html> in the markup may not survive. Set them here too —
       they are what the per-chapter aesthetic hangs off. */
    if (!root.getAttribute('lang')) root.setAttribute('lang', 'en');
    if (!root.hasAttribute('data-chapter')) root.setAttribute('data-chapter', '0');
    if (!root.hasAttribute('data-skin')) root.setAttribute('data-skin', CHAPTERS[0].skin);

    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = $('field');
    var stage = $('stage');
    var bodies = sections.map(function (el) { return el.querySelector('.ch-col'); });

    /* ---- where the content container actually is --------------------------
       Measured rather than recomputed from the CSS clamps, so the object and
       the copy can never disagree about where the halfway line is. */
    var innerL = 0, innerW = innerWidth, navBottom = 0;
    var navBar = document.querySelector('.nav-bar');
    function measure() {
      /* Where the nav ends: a title under it has not landed. */
      navBottom = navBar ? navBar.getBoundingClientRect().bottom : 0;
      var el = document.querySelector('.ch-inner');
      if (!el) { innerL = 0; innerW = innerWidth; return; }
      var r = el.getBoundingClientRect();
      innerW = r.width || innerWidth;
      innerL = r.left;
    }

    /* Centre of the half the copy is not using, as a fraction of the
       viewport. The copy column is 46% of the container (see .is-side in
       css/main.css), so the object centres in the remaining 54%. */
    function anchor(x) {
      if (!wide()) return PHONE.x;
      if (typeof x === 'number') return x;
      var f = x === 'right' ? 0.73 : 0.27;
      return (innerL + innerW * f) / Math.max(1, innerWidth);
    }
    /* A graph section stacked as a spine (900–1100px, or a short screen) has
       nowhere to send the object's coins, so there the object is a backdrop,
       as on a phone. */
    function dimOf(i) {
      if (!wide()) return PHONE.dim;
      if (CHAPTERS[i].graph && !graphMode()) return 0.34;
      return CHAPTERS[i].dim;
    }
    function zoomOf(i) {
      if (!wide()) return PHONE.zoom;
      if (CHAPTERS[i].graph && !graphMode()) return 1.3;
      return CHAPTERS[i].zoom;
    }
    function scatterOf(i) { return CHAPTERS[i].graph && graphMode() ? 1 : 0; }

    /* Cumulative roll, signed by the direction of travel: the object turns the
       way it is being pulled. Recomputed on resize because the anchors are. */
    var SPIN_AT = [];
    function computeSpin() {
      SPIN_AT = [0];
      for (var i = 1; i < CHAPTERS.length; i++) {
        SPIN_AT.push(SPIN_AT[i - 1]
          + (anchor(CHAPTERS[i].x) - anchor(CHAPTERS[i - 1].x)) * SPIN_PER_WIDTH);
      }
    }

    /* ---- theme ----------------------------------------------------------- */
    var systemDark = matchMedia('(prefers-color-scheme: dark)');
    var stored = null;
    try { stored = localStorage.getItem('larch-theme'); } catch (e) { /* blocked */ }
    if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

    function isDark() {
      var attr = root.getAttribute('data-theme');
      if (attr === 'dark') return true;
      if (attr === 'light') return false;
      return systemDark.matches;
    }

    /* A toggle with a fixed name — "Dark theme" — whose pressed state says
       whether it is on; the icon shows where a click will take you. */
    var themeBtn = $('themeBtn');
    function syncThemeButton() {
      var dark = isDark();
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.title = dark ? 'Switch to light' : 'Switch to dark';
    }

    var fadeTimer;
    function fadeTheme() {
      root.classList.add('theming');
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () { root.classList.remove('theming'); }, 480);
    }

    themeBtn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('larch-theme', next); } catch (e) { /* blocked */ }
      syncThemeButton(); fadeTheme(); paint(true);
    });
    /* Safari below 14 has no addEventListener on MediaQueryList. */
    var onSystemChange = function () {
      if (!root.hasAttribute('data-theme')) { syncThemeButton(); fadeTheme(); paint(true); }
    };
    if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
    else if (systemDark.addListener) systemDark.addListener(onSystemChange);
    syncThemeButton();

    /* ---- skin: read off the root, never recomputed here ------------------ */
    /* The four hues, the ink, the ground and whether the object is drawn as
       pigment or as lit colour all live in css/tokens.css, selected by the
       root's data-skin. Reading them means the object and the page can never
       disagree, and there is no colour arithmetic duplicated in two
       languages.

       One getComputedStyle per call, and it is called only when the skin or
       the theme actually changes — not per frame. */
    /* Order matters — js/asset.js indexes this array by colour slot:
       gold, structure, live, data. */
    var PAL_VARS = ['--c-primary', '--c-second', '--c-signal', '--c-third'];
    function readSkin() {
      var cs = getComputedStyle(root);
      var mode = cs.getPropertyValue('--canvas-mode').trim();
      return {
        mode: (mode === 'ink' || mode === 'glow') ? mode : (isDark() ? 'glow' : 'ink'),
        colors: {
          pal: PAL_VARS.map(function (v) { return cs.getPropertyValue(v).trim(); }),
          ink: cs.getPropertyValue('--ink').trim(),
          bg: cs.getPropertyValue('--bg').trim()
        }
      };
    }

    /* ---- the object ------------------------------------------------------- */
    /* No ambient yaw drift: the object turns because you scrolled it or
       dragged it, never on its own. The glints and the band of light that
       crosses it on arrival keep it alive while it is standing still. */
    var skin0 = readSkin();
    var field = new CoinField(canvas, {
      interactive: true,
      autoRotate: 0,
      mode: skin0.mode,
      colors: skin0.colors
    });
    field.start();

    /* ---- thread layer ----------------------------------------------------- */
    /* Drawn per frame by js/thread.js. The one thing it needs from here is
       what only this file knows: how much room there is between a frame's
       inner edge and the object standing beside it, so the growth curve can
       reach toward the object without touching it. The object's half-width
       is the arrangement's own reach (see CoinField#reach), plus a margin. */
    var frames = sections.map(function (el) { return el.querySelector('.frame'); });

    function modelGap(i, frame) {
      var c = CHAPTERS[i];
      if (!wide() || typeof c.x === 'number') return 0;
      var r = frame.getBoundingClientRect();
      var cx = anchor(c.x) * innerWidth;
      var half = field.radius * zoomOf(i) * field.reach(i) + 10;
      return c.x === 'right' ? (cx - half) - r.right : r.left - (cx + half);
    }

    /* ---- section graphs --------------------------------------------------- */
    /* Wired once; laid out again whenever the page changes shape. Each layout
       also hands back where the object's coins go in that section — measured
       at the section's pinned position, so they can gather there before the
       copy has arrived. */
    var graphs = sections.map(function (el) {
      var g = el.querySelector('.graph');
      return g && window.SectionGraph ? SectionGraph.build(g) : null;
    });
    var graphTargets = sections.map(function () { return null; });

    function layoutGraphs() {
      var mode = graphMode() ? 'graph' : 'spine';
      for (var i = 0; i < graphs.length; i++) {
        if (graphs[i]) graphTargets[i] = SectionGraph.layout(graphs[i], mode, field.cfg.nodes, liftRect);
      }
    }

    function drawThreads() {
      if (!window.FrameThread) return;
      for (var i = 0; i < frames.length; i++) {
        if (!frames[i]) continue;
        FrameThread.draw(frames[i], {
          side: typeof CHAPTERS[i].x === 'number' ? 'full' : CHAPTERS[i].x,
          wide: wide(),
          gap: modelGap(i, frames[i])
        });
      }
    }

    /* ---- lifting a card ----------------------------------------------------
       Point at a card and it comes forward out of the page: it rises, grows,
       tilts toward the pointer and picks up a sheen and a ring in the section's
       accent; the cards round it are pushed a few pixels away and fall back a
       little, so the one you are on is the only thing at full strength. Each
       shape arrives in its own way —

         card    a panel turns toward you, a half-swing on its vertical axis
         hub     the big title card of a network only rises; it is the ground
         round   a circle flips over like a coin — on this page, it is one
         leaf    a pill flips on its long axis, a split-flap turning over
         row     a roster row slides out into a card; its portrait coin-flips

       In a network the wiring holds on: the lifted card and the ones it pushed
       drag their links, their ports and the ring of coins round them,
       and the links into the lifted card light up.

       One writer. Every value is eased here, per frame, and written as one
       transform — not CSS transitions — because the wiring has to know where
       a card is on each frame, and a transition would not tell it. Nothing
       starts while the page is moving under a still pointer, a card only
       flips once per visit, and touch never triggers any of it. With reduced
       motion a card still lights up; it just does not move.
       ---------------------------------------------------------------------- */
    var LIFTABLE = '.mixes .card, .g-card, .g-round, .g-leaf, .roster li';
    var LIFT = {
      card:  { s: 1.05,  rise: 8, dx: 0, tilt: 7,   flip: 'swing', dur: 620, push: 18 },
      hub:   { s: 1.025, rise: 5, dx: 0, tilt: 3.5, flip: null,    dur: 0,   push: 24 },
      round: { s: 1.12,  rise: 5, dx: 0, tilt: 6,   flip: 'coin',  dur: 760, push: 16 },
      leaf:  { s: 1.09,  rise: 3, dx: 0, tilt: 4,   flip: 'flap',  dur: 640, push: 12 },
      row:   { s: 1.015, rise: 0, dx: 6, tilt: 0,   flip: 'coin',  dur: 760, push: 10 }
    };
    var lifts = [], hot = null;
    var ptr = { x: 0, y: 0, on: false, moved: false }, lastScrollAt = 0, wasMoving = false;

    (function () {
      var els = document.querySelectorAll(LIFTABLE);
      for (var i = 0; i < els.length; i++) {
        var el = els[i], sec = el.closest('.chapter');
        var si = sections.indexOf(sec);
        if (si < 0) continue;
        var kind = el.matches('.roster li') ? 'row'
                 : el.matches('.g-title') ? 'hub'
                 : el.matches('.g-round') ? 'round'
                 : el.matches('.g-leaf') ? 'leaf' : 'card';
        var gi = graphs[si] && graphs[si].root.contains(el) ? si : -1;
        var L = { el: el, sec: si, gi: gi, kind: kind, P: LIFT[kind],
                  root: gi >= 0 ? graphs[si].root : el.closest('.mixes, .roster') || el.parentNode,
                  flipEl: kind === 'row' ? el.querySelector('.portrait') : el,
                  l: 0, px: 0, py: 0, dim: 0, rx: 0, ry: 0,
                  tl: 0, tpx: 0, tpy: 0, tdim: 0, trx: 0, try_: 0,
                  f0: -1e9, fs: 1, mx: 0.5, my: 0.5, on: false, edges: [] };
        if (gi >= 0) {
          var links = graphs[si].links;
          for (var k = 0; k < links.length; k++) {
            if (links[k].from === el || links[k].to === el) L.edges.push(links[k]);
          }
        }
        el.classList.add('lift');
        el.__lift = L;
        lifts.push(L);
      }
    }());

    /* Where a card sits in its container, from offsets: layout only, so a
       transform never feeds back into its own measurement. */
    function restOf(L) {
      var x = 0, y = 0, n = L.el;
      while (n && n !== L.root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      var w = L.el.offsetWidth, h = L.el.offsetHeight;
      return { cx: x + w / 2, cy: y + h / 2, w: w, h: h };
    }
    /* The card's box on screen as the wiring should see it: moved and scaled
       with the lift, but never tilted or flipped. */
    function liftRect(node) {
      var L = node.__lift;
      if (!L || !L.on) return node.getBoundingClientRect();
      var r = restOf(L), b = L.root.getBoundingClientRect();
      var s = liftScale(L);
      var cx = b.left + r.cx + L.px + L.P.dx * L.l, cy = b.top + r.cy + L.py - L.P.rise * L.l;
      var hw = r.w * s / 2, hh = r.h * s / 2;
      return { left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh };
    }
    function liftScale(L) { return 1 + (L.P.s - 1) * L.l - 0.035 * L.dim; }

    /* Landed and on a screen that is showing: a card still waiting for the
       scan is hidden by opacity, and an inline opacity would show it early. */
    function present(L) {
      var c = L.el.classList;
      return !c.contains('sc') || c.contains('in');
    }

    function pickHot(moving) {
      if (!ptr.on) return null;
      if (hot && present(hot)) {
        var r = liftRect(hot.el);
        if (ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom) return hot;
      }
      if (moving) return null;
      var t = document.elementFromPoint(ptr.x, ptr.y);
      var el = t && t.closest ? t.closest('.lift') : null;
      var L = el && el.__lift;
      return L && present(L) ? L : null;
    }

    function setHot(L, now) {
      if (hot === L) return;
      var k;
      if (hot) {
        hot.el.classList.remove('is-lifted');
        for (k = 0; k < hot.edges.length; k++) hot.edges[k].g.classList.remove('hot');
      }
      hot = L;
      if (!L) return;
      L.el.classList.add('is-lifted');
      aimAt(L);
      for (k = 0; k < L.edges.length; k++) L.edges[k].g.classList.add('hot');
      /* One flip per visit: coming straight back to a card that has only just
         turned over does not turn it again. */
      if (L.P.flip && !reduced && now - L.f0 > L.P.dur + 500) {
        var r = liftRect(L.el);
        L.f0 = now;
        L.fs = ptr.x < (r.left + r.right) / 2 ? -1 : 1;
      }
    }

    function easeOut3(t) { var u = 1 - t; return 1 - u * u * u; }

    function liftTick(dt, now) {
      var moving = (fluid && Math.abs(sTarget - sCurrent) > 1.5) || now - lastScrollAt < 140;
      if (ptr.moved || moving || wasMoving || hot) {
        setHot(pickHot(moving), now);
        ptr.moved = false;
      }
      wasMoving = moving;
      if (reduced || !lifts.length) return;

      var i, L, relink = null;

      /* Targets. */
      var hr = null, hs = hot ? hot.sec : -1;
      if (hot) {
        hr = restOf(hot);
        var hb = hot.root.getBoundingClientRect();
        hr.x = hb.left + hr.cx; hr.y = hb.top + hr.cy;
        hot.trx = (0.5 - hot.my) * hot.P.tilt;
        hot.try_ = (hot.mx - 0.5) * hot.P.tilt;
      }
      for (i = 0; i < lifts.length; i++) {
        L = lifts[i];
        L.tl = L === hot ? 1 : 0;
        L.tpx = L.tpy = L.tdim = 0;
        if (L !== hot) { L.trx = L.try_ = 0; }
        if (!hot || L === hot || L.sec !== hs || !present(L)) continue;
        if (L.el.contains(hot.el) || hot.el.contains(L.el)) continue;
        var r = restOf(L), b = L.root === hot.root ? hb : L.root.getBoundingClientRect();
        var vx = b.left + r.cx - hr.x, vy = b.top + r.cy - hr.y;
        var d = Math.hypot(vx, vy) || 1;
        var f = clamp(1 - d / 760, 0, 1);
        f = f * f * (3 - 2 * f);
        if (f <= 0) continue;
        var push = hot.P.push * f;
        L.tpx = vx / d * push;
        L.tpy = vy / d * push;
        /* A card wired to the one you are on stays brighter than the rest. */
        var linked = false;
        for (var k = 0; k < hot.edges.length; k++) {
          if (hot.edges[k].from === L.el || hot.edges[k].to === L.el) { linked = true; break; }
        }
        L.tdim = (0.35 + 0.65 * f) * (linked ? 0.4 : 1);
      }

      /* Ease and write. */
      var kl = 1 - Math.exp(-dt / 0.11), kp = 1 - Math.exp(-dt / 0.16), kt = 1 - Math.exp(-dt / 0.09);
      for (i = 0; i < lifts.length; i++) {
        L = lifts[i];
        var flipping = now - L.f0 < L.P.dur;
        if (!L.on && !L.tl && !L.tdim && !L.tpx && !L.tpy && !flipping) continue;

        if (!present(L)) {                 /* rewound under us: let it go */
          L.l = L.dim = L.px = L.py = L.rx = L.ry = 0; L.f0 = -1e9;
          clearLift(L);
          if (L.gi >= 0) { relink = relink || {}; relink[L.gi] = true; }
          continue;
        }

        L.l += (L.tl - L.l) * kl;
        L.dim += (L.tdim - L.dim) * kp;
        L.px += (L.tpx - L.px) * kp;
        L.py += (L.tpy - L.py) * kp;
        L.rx += (L.trx - L.rx) * kt;
        L.ry += (L.try_ - L.ry) * kt;

        var rest = Math.abs(L.l) < 0.002 && Math.abs(L.dim) < 0.002 &&
                   Math.abs(L.px) < 0.05 && Math.abs(L.py) < 0.05 &&
                   Math.abs(L.rx) < 0.02 && Math.abs(L.ry) < 0.02 && !flipping && !L.tl && !L.tdim;
        if (L.gi >= 0 && graphMode()) { relink = relink || {}; relink[L.gi] = true; }
        if (rest) {
          L.l = L.dim = L.px = L.py = L.rx = L.ry = 0;
          clearLift(L);
          continue;
        }
        L.on = true;

        /* The flip: a coin turns a whole revolution, a pill flaps over on its
           long axis, a panel swings a few degrees and back. */
        var fx = 0, fy = 0;
        if (flipping) {
          var p = clamp((now - L.f0) / L.P.dur, 0, 1);
          if (L.P.flip === 'coin') fy = 360 * easeOut3(p) * L.fs;
          else if (L.P.flip === 'flap') fx = -360 * easeOut3(p);
          else fy = 16 * Math.sin(Math.PI * p) * (1 - p * 0.35) * L.fs;
        }
        var s = liftScale(L);
        var tx = L.px + L.P.dx * L.l, ty = L.py - L.P.rise * L.l;
        var tf = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)';
        if (L.kind === 'row') {
          L.el.style.transform = tf + ' scale(' + s.toFixed(4) + ')';
          if (L.flipEl) {
            L.flipEl.style.transform = (fy || L.l > 0.002)
              ? 'perspective(420px) rotateY(' + fy.toFixed(2) + 'deg) scale(' + (1 + 0.1 * L.l).toFixed(4) + ')'
              : '';
          }
        } else {
          L.el.style.transform = 'perspective(1100px) ' + tf +
            ' rotateX(' + (L.rx + fx).toFixed(2) + 'deg) rotateY(' + (L.ry + fy).toFixed(2) + 'deg)' +
            ' scale(' + s.toFixed(4) + ')';
        }
        L.el.style.opacity = L.dim > 0.002 ? (1 - 0.28 * L.dim).toFixed(3) : '';
      }

      /* The wiring follows. */
      if (relink && graphMode()) {
        for (var gi in relink) {
          graphTargets[gi] = SectionGraph.layout(graphs[gi], 'graph', field.cfg.nodes, liftRect);
        }
      }
    }

    function clearLift(L) {
      L.on = false;
      L.el.style.transform = '';
      L.el.style.opacity = '';
      if (L.flipEl && L.flipEl !== L.el) L.flipEl.style.transform = '';
    }

    /* Where on the lifted card the pointer is, 0–1 each way: the tilt leans
       that way and the sheen sits under it. */
    function aimAt(L) {
      var r = liftRect(L.el), w = r.right - r.left, h = r.bottom - r.top;
      L.mx = clamp((ptr.x - r.left) / (w || 1), 0, 1);
      L.my = clamp((ptr.y - r.top) / (h || 1), 0, 1);
      L.el.style.setProperty('--gx', (L.mx * 100).toFixed(1) + '%');
      L.el.style.setProperty('--gy', (L.my * 100).toFixed(1) + '%');
    }
    function trackPointer(e) {
      if (e.pointerType === 'touch') { ptr.on = false; return; }
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.moved = true;
      if (hot) aimAt(hot);
    }
    document.addEventListener('pointermove', trackPointer, { passive: true });
    document.addEventListener('pointerdown', trackPointer, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { ptr.on = false; ptr.moved = true; });
    addEventListener('blur', function () { ptr.on = false; ptr.moved = true; });
    addEventListener('scroll', function () { lastScrollAt = performance.now(); }, { passive: true });

    /* ---- navigation ------------------------------------------------------- */
    /* The links are in the markup. This keeps the bar in step with the page:
       which link is current (the pill slides onto it), how far down the page
       you are (the hairline along the bottom edge), and the menu that the
       links fold into below 1024px. */
    var nav = $('nav'), navMenu = $('navMenu'), navProgress = $('navProgress');
    var navList = $('navLinks'), navInd = nav ? nav.querySelector('.nav-ind') : null;
    var navLinks = navList ? [].slice.call(navList.querySelectorAll('a')) : [];
    var navCurrent = -1, navP = -1, navOn = null, navPeek = null, navStuck = null;
    /* The header condenses into the island once you leave the top; below
       1024px it is always the island. */
    var navDesk = matchMedia('(min-width: 1024px)');

    /* The pill: sized from a link's own box, so it lands exactly whatever the
       labels' widths. On the intro nothing is current — the mark is home — so
       it fades out where it stands rather than sliding off to nowhere. */
    function placeInd(a) {
      if (!navInd) return;
      if (!a || !a.offsetWidth) { navInd.classList.remove('on'); return; }
      navInd.style.width = a.offsetWidth + 'px';
      navInd.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      navInd.classList.add('on');
    }

    function setNavCurrent(idx) {
      navCurrent = idx;
      navOn = null;
      for (var k = 0; k < navLinks.length; k++) {
        if (parseInt(navLinks[k].getAttribute('data-goto'), 10) === idx) {
          navOn = navLinks[k];
          navLinks[k].setAttribute('aria-current', 'location');
        } else {
          navLinks[k].removeAttribute('aria-current');
        }
      }
      if (!navPeek) placeInd(navOn);
    }

    /* On hover the pill follows the pointer across the links, and goes back
       to the current one when the pointer leaves them. */
    if (navList) {
      navLinks.forEach(function (a) {
        a.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'touch' || !navDesk.matches) return;
          if (navPeek) navPeek.classList.remove('is-peek');
          navPeek = a; a.classList.add('is-peek'); placeInd(a);
        });
      });
      navList.addEventListener('pointerleave', function () {
        if (navPeek) navPeek.classList.remove('is-peek');
        navPeek = null; placeInd(navOn);
      });
    }

    function setMenu(open) {
      if (!nav || !navMenu) return;
      nav.classList.toggle('open', open);
      navMenu.setAttribute('aria-expanded', String(open));
    }
    if (navMenu) {
      /* The links come before the button in the document, so opening the menu
         takes focus into it; Escape brings focus back. */
      navMenu.addEventListener('click', function () {
        var open = !nav.classList.contains('open');
        setMenu(open);
        if (open && navLinks[0]) navLinks[0].focus();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); navMenu.focus(); }
      });
      document.addEventListener('click', function (e) {
        if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false);
      });
    }

    /* A frame changes size when the webfont lands, when a phone rotates, when
       copy reflows — not only on window resize — so each one is watched, and so
       are the nav links, whose widths the pill is sized from. The thread draw
       is keyed on size, so a callback that changes nothing costs nothing. */
    if (window.ResizeObserver) {
      var relayoutQueued = false;
      var ro = new ResizeObserver(function () {
        if (relayoutQueued) return;
        relayoutQueued = true;
        requestAnimationFrame(function () {
          relayoutQueued = false;
          drawThreads();
          layoutGraphs();
          if (navCurrent >= 0) setNavCurrent(navCurrent);
        });
      });
      for (var ri = 0; ri < frames.length; ri++) if (frames[ri]) ro.observe(frames[ri]);
      if (navList) ro.observe(navList);
      for (var gi = 0; gi < graphs.length; gi++) if (graphs[gi]) ro.observe(graphs[gi].root);
    }

    /* ---- progress, measured from the viewport ----------------------------- */
    /* Deliberately not window.scrollY: when this page is embedded, the thing
       that scrolls may not be the window, and scrollY would sit at 0 forever.
       Rectangles relative to the viewport are true either way. */
    function progress() {
      var vh = innerHeight || 800;
      for (var i = sections.length - 1; i >= 0; i--) {
        var top = sections[i].getBoundingClientRect().top;
        if (top <= 1 || i === 0) {
          var nextTop = (i + 1 < sections.length)
            ? sections[i + 1].getBoundingClientRect().top
            : top + vh;
          var span = Math.max(1, nextTop - top);
          return i + clamp(-top / span, 0, 1);
        }
      }
      return 0;
    }

    /* ---- painting --------------------------------------------------------- */
    var lastChapter = -1, lastSkinKey = null, shiftedCopy = -1;
    var liveSec = -1, meterTick = 0, scrollP = 0;

    /* The strip's meter: how far through this screen you are. Written only for
       the live section and only every few frames. */
    function writeMeter(sec, i, p) {
      if (sec.frameMeter === undefined) sec.frameMeter = sec.querySelector('.frame-meter');
      if (sec.frameMeter) sec.frameMeter.style.setProperty('--fill', clamp(p - i, 0, 1).toFixed(3));
    }

    /* The live section is whichever one is under the middle of the viewport —
       measured, so it is right on a phone too, where nothing is pinned and a
       section is as tall as its copy. */
    function liveIndex() {
      var mid = innerHeight / 2;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) return i;
      }
      return liveSec < 0 ? 0 : liveSec;
    }

    /* Only the chapter you are in carries a parallax offset; the previous one
       is cleared as you leave it. Two style writes a frame at most. */
    function shiftCopy(idx, f) {
      if (shiftedCopy !== idx) {
        if (shiftedCopy >= 0 && bodies[shiftedCopy]) bodies[shiftedCopy].style.transform = '';
        shiftedCopy = idx;
      }
      if (bodies[idx]) {
        bodies[idx].style.transform = 'translate3d(0,' + (-f * 22).toFixed(1) + 'px,0)';
      }
    }

    function paint(force) {
      var p = field.progress;
      var lo = Math.floor(p), hi = Math.min(CHAPTERS.length - 1, lo + 1), t = p - lo;

      /* Which section the page is dressed as. +0.3 rather than rounding, so
         the change lands inside the crossing — while the object is faded back
         and mid-travel, which is the one moment in a section where repainting
         everything goes unnoticed. */
      var idx = Math.min(CHAPTERS.length - 1, Math.floor(p + 0.3));
      if (idx !== lastChapter || force) {
        lastChapter = idx;
        root.setAttribute('data-chapter', String(idx));
        root.setAttribute('data-skin', CHAPTERS[idx].skin);
        setNavCurrent(idx);
        if (!force) field.pulse(0.6);
      }

      /* Recolour the object from whatever the root is now wearing. Keyed on
         skin *and* theme, because either can change under the other, and read
         only when the key moves — getComputedStyle right after writing an
         attribute forces a style recalc, which is fine once a section and
         ruinous once a frame. */
      var skinKey = CHAPTERS[idx].skin + (isDark() ? '|dark' : '|light');
      if (force || skinKey !== lastSkinKey) {
        lastSkinKey = skinKey;
        var sk = readSkin();
        field.setTheme(sk.mode, sk.colors);
      }

      /* Only the screen you are on animates — the thread's light, the meter.
         Seven frames climbing and chiming at once would
         compete with the canvas for the frame budget, and you can only ever
         see one of them. */
      var live = liveIndex();
      if (live !== liveSec) {
        if (liveSec >= 0 && sections[liveSec]) sections[liveSec].classList.remove('live');
        liveSec = live;
        if (sections[liveSec]) sections[liveSec].classList.add('live');
      }
      if (sections[liveSec] && (force || ++meterTick % 5 === 0)) {
        writeMeter(sections[liveSec], liveSec, scrollP);
      }

      /* Header at the very top, island from the first bit of scroll. */
      var stuck = scrollP > 0.02 || !navDesk.matches;
      if (nav && stuck !== navStuck) { navStuck = stuck; nav.classList.toggle('is-stuck', stuck); }

      /* The nav's hairline: how far down the whole page you are. */
      var np = Math.round(clamp(scrollP / (CHAPTERS.length - 1), 0, 1) * 1000) / 1000;
      if (navProgress && np !== navP) {
        navP = np;
        navProgress.style.transform = 'scaleX(' + np + ')';
      }

      /* Travel, roll, zoom and morph all run off the same eased fraction, so
         the object crosses the page, turns, resizes and reconfigures as one
         movement rather than four. */
      var e = CoinField.dragEase(t);
      field.scrollSpin = SPIN_AT[lo] + (SPIN_AT[hi] - SPIN_AT[lo]) * e;

      /* While it is travelling, the object recedes — it passes behind the copy
         column and would otherwise sit on top of the text it is meant to be
         illustrating. Full strength only once it has arrived and settled.
         Plateaus in the middle rather than easing through, so the screen is
         clean for the whole crossing, not just its midpoint. */
      var crossing = smoothstep(clamp(e / 0.16, 0, 1)) * smoothstep(clamp((1 - e) / 0.16, 0, 1));
      if (lo === hi) crossing = 0;

      /* Taken apart. Crossing into a graph section the object's coins leave it
         and fly out to that section's scaffold — beads on its links, a ring
         round each card — on the same eased fraction as everything else; the
         copy then slides up into the scaffold they have made. Crossing out,
         they fly back and the next arrangement assembles from them. Graph
         sections alternate with whole ones, so at most one of lo and hi is a
         graph and it owns the targets. While units are in flight the object
         does not recede: the flight is the thing to see. */
      var scat = lo === hi ? scatterOf(lo) : lerp(scatterOf(lo), scatterOf(hi), e);
      var owner = CHAPTERS[hi].graph ? hi : (CHAPTERS[lo].graph ? lo : -1);
      field.setScatter(scat, owner >= 0 ? graphTargets[owner] : null);
      var recede = owner >= 0 && graphMode() ? 0.12 : 0.72;

      var x = lerp(anchor(CHAPTERS[lo].x), anchor(CHAPTERS[hi].x), e);
      var base = lerp(dimOf(lo), dimOf(hi), e);
      field.originX = x;
      /* Receding reads as depth, not just fade: it shrinks as it travels. */
      field.zoom = lerp(zoomOf(lo), zoomOf(hi), e) * (1 - 0.10 * crossing);

      /* A dimmed backdrop does not need every coin outlined: at 30% opacity
         the rims are below the threshold of visible, and each one is a
         stroke. Zoom is in the formula as well as opacity because a larger
         backdrop costs more area to draw. Below 0.6 js/asset.js drops them. */
      field.detail = clamp(0.30 + base * 0.62 - (field.zoom - 1) * 0.30, 0, 1);

      stage.style.opacity = (base * (1 - recede * crossing)).toFixed(3);

      /* Parallax. The pinned copy lifts a little through its chapter, which
         gives the copy and the object separation while the object does the
         travelling. */
      shiftCopy(lo, t);
    }

    var lastFrame = performance.now();
    function frame(now) {
      now = now || performance.now();
      var dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;

      if (fluid) {
        sCurrent += (sTarget - sCurrent) * (1 - Math.exp(-dt / SCROLL_TAU));
        if (Math.abs(sTarget - sCurrent) < 0.4) sCurrent = sTarget;
        if (Math.abs(sCurrent - sWritten) >= 0.5) {
          sWritten = sCurrent;
          window.scrollTo(0, sCurrent);
        }
      } else {
        sCurrent = window.scrollY;
      }

      /* The page's own bookkeeping needs where the SCROLL is, not where the
         object has eased to. field.progress chases this value with a ~0.5s time
         constant, which is exactly the weight the object wants and exactly half
         a screen of lag for anything else. The reveals read the page directly
         and run here, between measuring and painting, so their reads land on
         a layout that is already clean. */
      scrollP = progress();
      field.setProgress(scrollP);
      if (reveal) reveal(navBottom);
      liftTick(dt, now);
      paint(false);
      requestAnimationFrame(frame);
    }

    /* Handle for diagnostics in the console: __larch.field.stop() etc. */
    window.__larch = { field: field, chapters: CHAPTERS };

    /* Every call to action on the page routes through one handler. The one in
       the contact section is a real mailto: link and needs none of this. */
    var goers = document.querySelectorAll('[data-goto]');
    for (var g = 0; g < goers.length; g++) {
      (function (el) {
        el.addEventListener('click', function (ev) {
          ev.preventDefault();
          setMenu(false);
          scrollToSection(clamp(parseInt(el.getAttribute('data-goto'), 10) || 0,
                                0, sections.length - 1));
        });
      }(goers[g]));
    }

    /* ---- fluid scroll -----------------------------------------------------
       The wheel moves a target; the real scroll position chases it every
       frame with a time constant. That is the whole mechanism, and it is
       deliberately the whole mechanism.

       We move the actual scroll position rather than a transform. A
       transform-based smooth scroller is the usual approach and it would break
       `position: sticky`, which the pinned copy this layout depends on.

       **There is no snapping.** An earlier version pulled you to the nearest
       section boundary once input stopped — back if you were less than a third
       of the way in, forward if you were past it. On paper that keeps every
       rest position tidy. In practice it is the page arguing with you, and
       worst in the direction you least expect: scroll *up* into the previous
       section, pause, and the forward rule would throw you back down to where
       you started. That is the opposite of flowing, so it is gone. You stop
       where you stopped.

       The reason it could go is that the copy is `position: sticky` for the
       full height of its chapter, so there is no dead zone between sections to
       protect the reader from — every scroll position shows a chapter's copy.
       Snapping was solving a problem the pinning had already solved.

       Fine pointers only — on touch, native momentum is better than anything
       reimplemented on top of it. */
    var SCROLL_TAU = 0.30;      /* seconds for the scroll to catch its target  */
    var WHEEL_GAIN = 1.2;       /* a notch should feel like it carries         */

    /* SCROLL_TAU is the whole feel of the scroll: the position closes the gap
       to its target exponentially, so tau is the time it takes to cover the
       first 63% of whatever distance is left. It was 0.20s; it is 0.30s, half
       again as long, which is what "smoother" means here — the same gesture
       travels the same distance but arrives on a longer, flatter curve instead
       of snapping onto the target. WHEEL_GAIN is deliberately unchanged: a
       notch should still carry as far as it did, it should just take the
       journey more gently. */

    var coarse = matchMedia('(pointer: coarse)').matches;
    var fluid = !coarse && !reduced;
    var sTarget = window.scrollY, sCurrent = sTarget, sWritten = -1;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - innerHeight);
    }

    if (fluid) {
      addEventListener('wheel', function (e) {
        if (e.ctrlKey) return;                        /* leave pinch-zoom alone */
        e.preventDefault();
        var d = e.deltaY;
        if (e.deltaMode === 1) d *= 16;               /* lines */
        else if (e.deltaMode === 2) d *= innerHeight; /* pages */
        sTarget = clamp(sTarget + d * WHEEL_GAIN, 0, maxScroll());
      }, { passive: false });

      /* Keyboard, scrollbar drag, find-in-page — anything that moves the real
         scroll behind our back. Only resync when it was not our own write. */
      addEventListener('scroll', function () {
        if (Math.abs(window.scrollY - sCurrent) > 3) {
          sCurrent = sTarget = sWritten = window.scrollY;
        }
      }, { passive: true });
    }

    function scrollToSection(i) {
      if (!fluid) {
        sections[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      sTarget = clamp(Math.round(sections[i].getBoundingClientRect().top + window.scrollY), 0, maxScroll());
    }

    /* A phone rotating, or a desktop window being dragged wider, changes which
       half the object belongs in and how far it rolls getting there — so the
       anchors and the roll are both remeasured, not just the canvas. */
    var resizeTimer;
    addEventListener('resize', function () {
      field.resize();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        measure(); computeSpin(); drawThreads(); layoutGraphs(); setMenu(false); paint(true);
        if (navCurrent >= 0) setNavCurrent(navCurrent);
      }, 90);
      sTarget = sCurrent = sWritten = window.scrollY;
      paint(true);
    }, { passive: true });

    measure();
    computeSpin();
    drawThreads();
    layoutGraphs();
    field.originY = 0.5;
    paint(true);
    requestAnimationFrame(frame);
  }

  /* ---- reveals: type the title, then scan the screen in -------------------
     One sequence per section, in this order:

       1. the section arms          (.arming on the <section>)
       2. the title types, character by character
       3. the frame comes in and its wash makes one pass   (.typed on the <section>)
       4. as the wash's leading edge crosses each piece of the screen, that
          piece lands: body copy a line at a time, boxes (cards, rows,
          thumbnails) as the edge reaches their top, and sub-headlines type

     Copy is visible in the stylesheet and hidden only once this runs. Calling
     it *after* boot is the whole trick: if the object fails to build, the
     hiding never happens and the page is simply a readable static page. The
     same rule holds one level down — every step below either completes or
     hands the section back in its readable state.
     ---------------------------------------------------------------------- */

  /* Rebuild a heading as words of characters. Two details carry the whole
     thing: every character is in the DOM from the start (merely invisible), so
     the heading occupies its final box and nothing reflows as it types; and
     the characters are wrapped a word at a time, because a bare span per
     character lets the browser break a line in the middle of a word.

     Returns the character spans in order, or null if there is nothing to do.
     The heading's real text goes to an aria-label, so a screen reader is given
     the sentence rather than a stream of single letters. */
  function splitHeading(h) {
    /* <br> is a deliberate line break in the copy, not whitespace — keep it as
       a break for the eye and as a space for the label, since textContent
       drops it entirely and would run the two lines together. */
    var parts = [], nodes = h.childNodes;
    for (var n = 0; n < nodes.length; n++) {
      if (nodes[n].nodeName === 'BR') parts.push('\n');
      else parts.push(nodes[n].textContent);
    }

    var text = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    h.setAttribute('aria-label', text);
    h.textContent = '';

    var chars = [], frag = document.createDocumentFragment();
    var words = parts.join('').split(/(\s+|\n)/);
    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      if (!word) continue;
      if (word === '\n') { frag.appendChild(document.createElement('br')); continue; }
      if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); continue; }
      var box = document.createElement('span');
      box.className = 'tw-w';
      box.setAttribute('aria-hidden', 'true');
      for (var c = 0; c < word.length; c++) {
        var ch = document.createElement('span');
        ch.className = 'tw-c';
        ch.textContent = word.charAt(c);
        box.appendChild(ch);
        chars.push(ch);
      }
      frag.appendChild(box);
    }
    h.appendChild(frag);
    return chars.length ? chars : null;
  }

  function showAll(chars) {
    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.add('on');
      chars[i].classList.remove('cursor');
    }
  }

  /* Wrap every word of body copy in its own span, leaving the whitespace
     between words as text, so lines break exactly where they did before.
     Inline markup survives: a word goes inside the <em> or <strong> it was in,
     which is why this is per word rather than per line — a line wrapper cannot
     straddle an <em> that runs across two lines.

     Headings, buttons, links and SVG are left whole: headings type, and the
     others arrive with the box they sit in. */
  function skipWords(node, stop) {
    for (var el = node.parentNode; el && el !== stop; el = el.parentNode) {
      if (/^(H1|H2|H3|A|BUTTON|SVG|SCRIPT|STYLE)$/i.test(el.nodeName)) return true;
    }
    return false;
  }

  function splitWords(block) {
    var texts = [], words = [], i;
    var walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    while (walk.nextNode()) {
      if (/\S/.test(walk.currentNode.nodeValue) && !skipWords(walk.currentNode, block.parentNode)) {
        texts.push(walk.currentNode);
      }
    }
    for (i = 0; i < texts.length; i++) {
      var parts = texts[i].nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
      for (var k = 0; k < parts.length; k++) {
        if (!parts[k]) continue;
        if (/^\s+$/.test(parts[k])) { frag.appendChild(document.createTextNode(parts[k])); continue; }
        var w = document.createElement('span');
        w.className = 'ln-w';
        w.textContent = parts[k];
        frag.appendChild(w);
        words.push(w);
      }
      texts[i].parentNode.replaceChild(frag, texts[i]);
    }
    /* The claim highlight moves onto the words — see .chapter strong.split. */
    var strong = block.querySelectorAll('strong');
    for (i = 0; i < strong.length; i++) {
      if (strong[i].querySelector('.ln-w')) strong[i].classList.add('split');
    }
    return words;
  }

  /* Driven off elapsed time rather than one timer per character, so the speed
     is the same on a 60Hz and a 120Hz screen and a long title cannot outrun
     its own section. The per-character delay is `per`, stretched so that a
     short title still takes `min` to type — "Projects" at 42ms a letter was
     over in a third of a second, which reads as a flash, not as typing — and
     squeezed so a long one never takes more than `max`.

     Two speeds. A section title is the event of the screen and is given time
     to be watched; a sub-headline types as the scan reaches it, alongside the
     lines landing around it, so it is quicker and holds its caret only briefly.

     `alive` is how a sequence is cancelled: when a section rewinds, the token
     it was started under goes stale and the next step quietly does nothing. */
  var TYPE = { per: 42, min: 560, max: 900, hold: 260 };
  var SUB = { per: 28, min: 300, max: 520, hold: 110 };
  /* The networks run quicker: their copy is short and broken into many small
     nodes, and at panel speed it took the best part of three seconds to
     finish arriving. */
  var TYPE_NET = { per: 30, min: 340, max: 560, hold: 120 };
  var SUB_NET = { per: 16, min: 160, max: 300, hold: 50 };

  function typeHeading(chars, done, speed, alive) {
    var n = chars.length;
    var per = clamp(speed.per, speed.min / n, speed.max / n);
    var t0 = performance.now(), i = 0;
    (function step(now) {
      if (alive && !alive()) return;
      var want = Math.min(n, Math.floor((now - t0) / per) + 1);
      while (i < want) {
        if (i > 0) chars[i - 1].classList.remove('cursor');
        chars[i].classList.add('on');
        chars[i].classList.add('cursor');
        i++;
      }
      if (i < n) { requestAnimationFrame(step); return; }
      /* The caret holds a beat on the last character before moving on —
         without it the next thing arrives while the title is still being read
         as unfinished. */
      setTimeout(function () {
        if (alive && !alive()) return;
        chars[n - 1].classList.remove('cursor');
        if (done) done();
      }, speed.hold);
    }(performance.now()));
  }

  /* ---- the scan -----------------------------------------------------------
     The wash's first pass runs at a constant speed, so where its leading edge
     is at any moment is a straight line — and each piece of the screen can be
     given the exact moment the edge crosses it. That is all this is: measure
     every piece against the frame, turn its height into a time, and hand the
     wash the same start and duration through --scan-from and --scan-d so the
     CSS animation and the reveals cannot drift apart.

     Lines at the same height in two columns (the three project cards, the
     contact figures) are offset by up to SCAN_RASTER across the frame's width,
     left first — a raster, not a curtain.

     SCAN_BEAM is the wash's height in css/main.css (.frame-wash::before):
     its leading edge is that element's bottom border. */
  var SCAN_SPEED = 220, SCAN_SPEED_NARROW = 440, SCAN_BEAM = 150, SCAN_RASTER = 0.12;
  var BOXES = 'li, .card, .thumb, .portrait';

  /* Group a block's words into the lines they are actually laid out on. In
     document order a new line starts wherever a word sits lower than the line
     it follows, or back to its left — the second catches the jump from the
     bottom of one card to the top of the next, where the top goes *up*. */
  function measureLines(words, R, items) {
    var line = null, prevRight = -Infinity;
    for (var k = 0; k < words.length; k++) {
      var r = words[k].getBoundingClientRect();
      if (!line || Math.abs(r.top - line.top) > r.height * 0.5 || r.left < prevRight - 2) {
        line = { kind: 'line', els: [], top: r.top,
                 y: r.top - R.top + r.height * 0.5, x: r.left - R.left };
        items.push(line);
      }
      line.els.push(words[k]);
      prevRight = r.right;
    }
  }

  function planScan(entry) {
    var frame = entry.frame;
    if (!frame) return null;
    var R = frame.getBoundingClientRect(), W = Math.max(1, R.width);
    var items = [], k, r;

    for (k = 0; k < entry.boxes.length; k++) {
      r = entry.boxes[k].getBoundingClientRect();
      items.push({ kind: 'box', el: entry.boxes[k], y: r.top - R.top + 6, x: r.left - R.left });
    }
    for (k = 0; k < entry.subs.length; k++) {
      r = entry.subs[k].el.getBoundingClientRect();
      items.push({ kind: 'type', chars: entry.subs[k].chars,
                   y: r.top - R.top + r.height * 0.5, x: r.left - R.left });
    }
    for (k = 0; k < entry.words.length; k++) measureLines(entry.words[k], R, items);
    entry.scanDur = 0;
    if (!items.length) return items;

    /* The pass starts just above the first thing it has to reveal rather than
       at the top of the frame: the title is already there,
       and sweeping over them first would be a second of nothing happening. */
    var y0 = Infinity;
    for (k = 0; k < items.length; k++) y0 = Math.min(y0, items[k].y);
    y0 = Math.max(0, y0 - 12);
    var span = Math.max(1, R.height + SCAN_BEAM - y0);
    var dur = span / (wide() ? SCAN_SPEED : SCAN_SPEED_NARROW);

    for (k = 0; k < items.length; k++) {
      items[k].t = dur * clamp((items[k].y - y0) / span, 0, 1)
                 + SCAN_RASTER * clamp(items[k].x / W, 0, 1);
    }
    items.sort(function (a, b) { return a.t - b.t; });
    entry.sec.style.setProperty('--scan-from', Math.round(y0) + 'px');
    entry.sec.style.setProperty('--scan-d', dur.toFixed(3) + 's');
    entry.scanDur = dur;
    return items;
  }

  /* A graph section has no frame and no wash: it assembles along its own
     wiring instead. Every node carries a data-order; a node grows into place
     at order × GRAPH_STEP, its lines land one after another just behind it,
     its sub-headline types, and each link draws from its source towards the
     next node as that one arrives (graph.js gives a link its source's order
     plus a half). The same loop that runs the scan runs this. */
  var GRAPH_STEP = 0.075, GRAPH_LINE = 0.028;

  function orderOf(el) {
    var o = el.closest('[data-order]');
    return o ? parseFloat(o.getAttribute('data-order')) || 0 : 0;
  }

  function planGraph(entry) {
    var items = [], k, j, t, end = 0;
    function push(it) { items.push(it); if (it.t > end) end = it.t; }
    for (k = 0; k < entry.boxes.length; k++) {
      push({ kind: 'box', el: entry.boxes[k], t: orderOf(entry.boxes[k]) * GRAPH_STEP });
    }
    for (k = 0; k < entry.edges.length; k++) {
      push({ kind: 'box', el: entry.edges[k], t: orderOf(entry.edges[k]) * GRAPH_STEP });
    }
    for (k = 0; k < entry.subs.length; k++) {
      push({ kind: 'type', chars: entry.subs[k].chars, speed: SUB_NET,
             t: orderOf(entry.subs[k].el) * GRAPH_STEP + 0.04 });
    }
    var R = entry.sec.getBoundingClientRect();
    for (k = 0; k < entry.words.length; k++) {
      var lines = [];
      measureLines(entry.words[k], R, lines);
      t = orderOf(entry.blocks[k]) * GRAPH_STEP + 0.05;
      for (j = 0; j < lines.length; j++) { lines[j].t = t + j * GRAPH_LINE; push(lines[j]); }
    }
    items.sort(function (a, b) { return a.t - b.t; });
    entry.scanDur = end + 0.5;
    return items;
  }

  function land(item, alive) {
    if (item.kind === 'box') item.el.classList.add('in');
    else if (item.kind === 'line') {
      for (var k = 0; k < item.els.length; k++) item.els[k].classList.add('in');
    } else {
      try { typeHeading(item.chars, null, item.speed || SUB, alive); }
      catch (e) { showAll(item.chars); throw e; }
    }
  }

  function landAll(entry) {
    var k;
    for (k = 0; k < entry.boxes.length; k++) entry.boxes[k].classList.add('in');
    for (k = 0; k < entry.edges.length; k++) entry.edges[k].classList.add('in');
    for (k = 0; k < entry.words.length; k++) {
      for (var w = 0; w < entry.words[k].length; w++) entry.words[k][w].classList.add('in');
    }
    for (k = 0; k < entry.subs.length; k++) showAll(entry.subs[k].chars);
  }

  function hideChars(chars) {
    if (!chars) return;
    for (var i = 0; i < chars.length; i++) chars[i].classList.remove('on', 'cursor');
  }

  /* ---- when a screen lands ------------------------------------------------
     A section plays when its title has landed, and rewinds when it has left.
     Both are read off where things actually are on screen, every frame —
     not off `progress`, and not once:

       · landed — the title is wholly on screen, clear of the nav, and has come
         up to at most LAND of the viewport's height; or its section has
         reached the top of the viewport (pinned, on a wide screen) with the
         title on screen. The second clause is the guarantee: whatever the
         viewport, a title at rest always counts as landed.
       · gone below — the copy is wholly under the viewport. Everything
         rewinds, so scrolling down into it again plays it again.
       · gone above — the copy is wholly over the viewport. The copy stays
         (scrolling back up should find text coming down into view, not an
         empty frame) but the title rewinds, and types again as it comes
         back into view.

     The first version fired off `progress` at i − 0.08 and ran each section
     once. Both were wrong in ways a desktop scroll never showed. A jump from
     the nav glides past every section in between, so each one started typing
     off screen and was spent by the time you scrolled back to it; and below
     900px, where nothing is pinned, i − 0.08 is the moment a section is about
     to leave the top of the screen, so the typing happened as it scrolled
     away. Measured with a wheel-driven scroll: on a 390px phone, 8–13 of ~45
     typing frames had the title on screen; after a jump, 3 of 30. */
  var LAND_WIDE = 0.45, LAND_NARROW = 0.62;

  /* Split every heading and every block of copy, then hand back the per-frame
     update that app.js runs from the frame loop. */
  function armReveals() {
    var chapters = document.querySelectorAll('.chapter');
    if (!chapters.length) return null;

    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var entries = [], i, k;

    /* Split first, arm second. If splitting throws we have changed nothing
       that hides anything — so only once every heading and every block is
       rebuilt do we let the stylesheet start hiding things. */
    try {
      for (i = 0; i < chapters.length; i++) {
        var sec = chapters[i], h = sec.querySelector('h1, h2');
        var graph = sec.querySelector('.graph');
        var col = sec.querySelector('.ch-col') || graph || sec;
        var entry = { sec: sec, col: col, head: h || col, frame: sec.querySelector('.frame'),
                      graph: !!graph, edges: [].slice.call(sec.querySelectorAll('.g-edge')),
                      chars: h ? splitHeading(h) : null, subs: [], boxes: [], words: [], blocks: [],
                      title: 'hidden', body: 'hidden', tTok: 0, bTok: 0, scanDur: 0 };
        entries.push(entry);

        var subs = sec.querySelectorAll('h3');
        for (k = 0; k < subs.length; k++) {
          var sc = splitHeading(subs[k]);
          if (sc) entry.subs.push({ el: subs[k], chars: sc });
        }

        var blocks = sec.querySelectorAll('.rv');
        for (k = 0; k < blocks.length; k++) {
          entry.boxes.push(blocks[k]);
          var inner = blocks[k].querySelectorAll(BOXES);
          for (var b = 0; b < inner.length; b++) entry.boxes.push(inner[b]);
          entry.blocks.push(blocks[k]);
          entry.words.push(splitWords(blocks[k]));
        }
      }
      for (i = 0; i < entries.length; i++) {
        for (k = 0; k < entries[i].boxes.length; k++) entries[i].boxes[k].classList.add('sc');
      }
    } catch (e) {
      for (i = 0; i < entries.length; i++) {
        if (entries[i].chars) showAll(entries[i].chars);
        for (k = 0; k < entries[i].subs.length; k++) showAll(entries[i].subs[k].chars);
      }
      throw e;
    }
    root.classList.add('reveals-armed');

    /* No motion: everything is simply there, once, and nothing rewinds. */
    if (reduced) {
      for (i = 0; i < entries.length; i++) {
        if (entries[i].chars) showAll(entries[i].chars);
        landAll(entries[i]);
        entries[i].sec.classList.add('arming', 'typed');
      }
      return function () {};
    }

    function rewind(e) {
      var j, w;
      e.tTok++; e.bTok++;
      e.sec.classList.remove('arming', 'typed', 'scanning');
      hideChars(e.chars);
      for (j = 0; j < e.subs.length; j++) hideChars(e.subs[j].chars);
      for (j = 0; j < e.boxes.length; j++) e.boxes[j].classList.remove('in');
      for (j = 0; j < e.edges.length; j++) e.edges[j].classList.remove('in');
      for (j = 0; j < e.words.length; j++) {
        for (w = 0; w < e.words[j].length; w++) e.words[j][w].classList.remove('in');
      }
      e.title = e.body = 'hidden';
    }

    /* The copy, all at once — for a section you have scrolled past. */
    function settle(e) {
      e.bTok++;
      landAll(e);
      e.sec.classList.add('arming', 'typed');
      e.sec.classList.remove('scanning');
      e.body = 'shown';
    }

    function untype(e) {
      e.tTok++;
      hideChars(e.chars);
      e.title = 'hidden';
    }

    function typeTitle(e) {
      var tok = ++e.tTok;
      e.title = 'typing';
      e.sec.classList.add('arming');
      function then() {
        e.title = 'shown';
        if (e.body === 'hidden') scan(e);
      }
      if (!e.chars) { then(); return; }
      try {
        typeHeading(e.chars, then, e.graph ? TYPE_NET : TYPE,
                    function () { return e.tTok === tok; });
      } catch (err) {
        showAll(e.chars); then();
        throw err;
      }
    }

    function scan(e) {
      var tok = ++e.bTok, alive = function () { return e.bTok === tok; };
      var plan;
      try { plan = e.graph ? planGraph(e) : planScan(e); }
      catch (err) { settle(e); throw err; }
      if (!plan) { settle(e); return; }
      e.body = 'scanning';
      e.sec.classList.add('typed', 'scanning');

      /* One loop per scan, walking a list already sorted by time; it holds
         .scanning until the wash has left the frame. */
      var t0 = performance.now(), next = 0;
      requestAnimationFrame(function tick(now) {
        if (!alive()) return;
        var t = (now - t0) / 1000;
        try {
          while (next < plan.length && plan[next].t <= t) land(plan[next++], alive);
        } catch (err) { settle(e); throw err; }
        if (next < plan.length || t < e.scanDur) { requestAnimationFrame(tick); return; }
        e.sec.classList.remove('scanning');
        e.body = 'shown';
      });
    }

    return function update(navBottom) {
      var vh = innerHeight || 800, land = wide() ? LAND_WIDE : LAND_NARROW;
      for (var n = 0; n < entries.length; n++) {
        var e = entries[n], c = e.col.getBoundingClientRect();
        if (c.top >= vh) {
          if (e.title !== 'hidden' || e.body !== 'hidden') rewind(e);
          continue;
        }
        if (c.bottom <= 0) {
          if (e.body !== 'shown') settle(e);
          if (e.title !== 'hidden') untype(e);
          continue;
        }
        if (e.title !== 'hidden') continue;
        var hr = e.head.getBoundingClientRect();
        /* Arrived with the title already gone over the top — a reload that
           restored the scroll, or a fling on a phone that carried it past
           the landing line between two frames. The copy under it is on
           screen, so it is shown as it stands, title and all, rather than
           waiting for a title nobody will scroll back up to. Only for copy
           that has never been shown: scrolling back up into a section you
           have read keeps AXON's rule, and the title types again as it comes
           into view. Only possible where nothing is pinned. */
        if (e.body === 'hidden' && hr.bottom <= Math.max(0, navBottom)) {
          showAll(e.chars || []); e.title = 'shown';
          if (e.body === 'hidden') settle(e);
          continue;
        }
        if (hr.top < 0 || hr.bottom > vh) continue;
        var clear = hr.top >= navBottom - 2 && (hr.top + hr.bottom) * 0.5 <= vh * land;
        if (clear || e.sec.getBoundingClientRect().top <= 1) typeTitle(e);
      }
    };
  }

  function init() {
    sections = CHAPTERS.map(function (_, i) { return $('c' + i); });
    boot();
    var update = armReveals();

    /* Hold the first screen until the webfont has landed, or a second has
       passed. The scan times each line off where it is laid out, and a line
       measured in the fallback face is not where it will be once Archivo and
       Plex swap in. */
    var started = false;
    function start() { if (!started) { started = true; reveal = update; } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
    else start();
    setTimeout(start, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
