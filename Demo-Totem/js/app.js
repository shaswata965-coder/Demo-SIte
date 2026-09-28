/* ============================================================================
   TOTEM DEMO — orchestration
   ----------------------------------------------------------------------------
   Scroll position becomes one number, `progress`, in [0, 6]. Everything else
   is derived from it:

     · which arrangement the model holds, and how far it has turned
     · where the model sits across the viewport, how large it is drawn, and
       how far forward it comes — three numbers written into the field
     · the chapter's discrete aesthetic (type width, weight, tracking),
       stamped as data-chapter and transitioned by CSS

   The canvas is fixed at viewport size and never moves. A section that needs
   the whole screen does not push the canvas anywhere; it pulls the model to
   the middle, opens the zoom and drops the opacity, so the copy sits on top
   of it. A section that can live in half a screen parks the model in the
   other half. Both are the same three numbers, lerped on the same ease as the
   morph, which is why the two kinds of section transition into each other
   instead of cutting.

   Each screen also plays a reveal when it lands: the eyebrow arrives, the
   title types, then the rig comes in and its beam makes one pass that reveals
   the rest a line at a time — sub-headlines typing as it reaches them. That
   is read off where the title actually is on screen, every frame, and it
   rewinds once the screen has gone, so landing on it again plays it again.

   Rule this file follows: the copy is the page. `armReveals` runs after the
   model is built, so a failure there leaves a readable static page and the
   error reaches the console instead of being swallowed.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* One entry per section, in order. `x` is where the model sits across the
     viewport: 'right' and 'left' park it in the half the copy is not using,
     measured against the content container rather than the raw viewport so a
     3440px monitor does not put the two a metre apart. A number is a literal
     fraction, used by the full-bleed sections — they keep drifting rather
     than sitting dead centre for four chapters in a row, so the model is
     still travelling even when it is only a backdrop.

     `dim` is the stage's opacity at rest and `zoom` how large the model is
     drawn. Behind a full screen of copy it is bigger and much fainter; beside
     the copy it is smaller and at full strength.

     Only Work and Collaborations are backdrops, and they are not adjacent —
     Team sits between them with the model back out in front. An earlier pass
     had four of these in a row, and consecutive screens of dimmed model read
     as the model having been switched off rather than as a deliberate change
     of register; the effect needs the model to come back to mean anything.
     Separating them is what lets the wall have the whole viewport without the
     middle of the page going flat.

     `skin` names the section's whole colour set — see css/tokens.css. The
     <section> wears it as a class so its band and copy are painted from it;
     the root wears it as data-skin so the model, which reads its colours off
     the root, and the nav bar, which is drawn from the root's panel and ink,
     both follow. The names here and the .sk-* classes in index.html have to
     agree. */
  var CHAPTERS = [
    { id: 'seed',   x: 'right', dim: 1.00, zoom: 0.82, skin: 'paper' },
    { id: 'bloom',  x: 'left',  dim: 1.00, zoom: 0.82, skin: 'violet' },
    { id: 'infer',  x: 'right', dim: 1.00, zoom: 0.76, skin: 'paper' },
    { id: 'settle', x: 0.60,    dim: 0.34, zoom: 1.38, skin: 'lemon' },
    { id: 'vault',  x: 'left',  dim: 1.00, zoom: 0.80, skin: 'paper' },
    { id: 'ledger', x: 0.44,    dim: 0.42, zoom: 1.50, skin: 'cyan' },
    { id: 'core',   x: 'right', dim: 1.00, zoom: 0.88, skin: 'ember' }
  ];

  /* Narrow screens have no half to park anything in: the model is a backdrop
     for the whole page, centred, larger relative to the screen and faint
     enough to read a paragraph through. It still morphs and still turns with
     the scroll — that is the part worth keeping on a phone. */
  var PHONE = { x: 0.5, dim: 0.42, zoom: 1.42 };

  /* How far the model rolls per full width of travel. A side-to-side swap is
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
       Measured rather than recomputed from the CSS clamps, so the model and
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
       css/main.css), so the model centres in the remaining 54%. */
    function anchor(x) {
      if (!wide()) return PHONE.x;
      if (typeof x === 'number') return x;
      var f = x === 'right' ? 0.73 : 0.27;
      return (innerL + innerW * f) / Math.max(1, innerWidth);
    }
    function dimOf(i) { return wide() ? CHAPTERS[i].dim : PHONE.dim; }
    function zoomOf(i) { return wide() ? CHAPTERS[i].zoom : PHONE.zoom; }

    /* Cumulative roll, signed by the direction of travel: the model turns the
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
    try { stored = localStorage.getItem('axon-theme'); } catch (e) { /* blocked */ }
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
      try { localStorage.setItem('axon-theme', next); } catch (e) { /* blocked */ }
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
    /* The four hues, the ink, the muted tone and whether the model is drawn as
       plotted ink or as additive light all live in css/tokens.css, selected by
       the root's data-skin. Reading them means the model and the page can
       never disagree, and there is no colour arithmetic duplicated in two
       languages.

       One getComputedStyle per call, and it is called only when the skin or
       the theme actually changes — not per frame. */
    /* Order matters — js/neural.js indexes this array and reaches for
       PAL[C_SIGNAL] by position for the traced inference. */
    var PAL_VARS = ['--c-primary', '--c-second', '--c-signal', '--c-third'];
    function readSkin() {
      var cs = getComputedStyle(root);
      var mode = cs.getPropertyValue('--canvas-mode').trim();
      return {
        mode: (mode === 'ink' || mode === 'glow') ? mode : (isDark() ? 'glow' : 'ink'),
        colors: {
          pal: PAL_VARS.map(function (v) { return cs.getPropertyValue(v).trim(); }),
          ink: cs.getPropertyValue('--ink').trim(),
          dim: cs.getPropertyValue('--faint').trim()
        }
      };
    }

    /* ---- the model -------------------------------------------------------- */
    /* No ambient yaw drift: the model turns because you scrolled it or
       dragged it, never on its own. That is the whole feel being asked for,
       and it also keeps each arrangement's viewing pose reliable. The signal
       pulses keep it alive while it is standing still. */
    var skin0 = readSkin();
    var field = new NeuralField(canvas, {
      interactive: true,
      autoRotate: 0,
      mode: skin0.mode,
      colors: skin0.colors
    });
    field.start();

    /* ---- circuit layer ---------------------------------------------------- */
    /* Drawn per panel by js/circuit.js. The one thing it needs from here is
       what only this file knows: how much room there is between a panel's
       inner edge and the model standing beside it, so the network can reach
       towards the model without touching it. The model's half-width is the
       arrangement's own reach (see NeuralField#reach), plus the largest a
       unit is drawn — the widest ring is about 10px. */
    var rigs = sections.map(function (el) { return el.querySelector('.rig'); });

    function modelGap(i, rig) {
      var c = CHAPTERS[i];
      if (!wide() || typeof c.x === 'number') return 0;
      var r = rig.getBoundingClientRect();
      var cx = anchor(c.x) * innerWidth;
      var half = field.radius * zoomOf(i) * field.reach(i) + 10;
      return c.x === 'right' ? (cx - half) - r.right : r.left - (cx + half);
    }

    function drawCircuits() {
      if (!window.RigCircuit) return;
      for (var i = 0; i < rigs.length; i++) {
        if (!rigs[i]) continue;
        RigCircuit.draw(rigs[i], {
          side: typeof CHAPTERS[i].x === 'number' ? 'full' : CHAPTERS[i].x,
          wide: wide(),
          gap: modelGap(i, rigs[i])
        });
      }
    }

    /* ---- navigation ------------------------------------------------------- */
    /* The links are in the markup. This keeps the bar in step with the page:
       which link is current (the pill slides onto it), how far down the page
       you are (the hairline along the bottom edge), and the menu that the
       links fold into below 1024px. */
    var nav = $('nav'), navMenu = $('navMenu'), navProgress = $('navProgress');
    var navList = $('navLinks'), navInd = nav ? nav.querySelector('.nav-ind') : null;
    var navLinks = navList ? [].slice.call(navList.querySelectorAll('a')) : [];
    var navCurrent = -1, navP = -1;

    function setNavCurrent(idx) {
      navCurrent = idx;
      var on = null;
      for (var k = 0; k < navLinks.length; k++) {
        if (parseInt(navLinks[k].getAttribute('data-goto'), 10) === idx) {
          on = navLinks[k];
          navLinks[k].setAttribute('aria-current', 'location');
        } else {
          navLinks[k].removeAttribute('aria-current');
        }
      }
      if (!navInd) return;
      /* On the intro nothing is current — the mark is home — so the pill
         fades out where it stands rather than sliding off to nowhere. */
      if (!on || !on.offsetWidth) { navInd.classList.remove('on'); return; }
      navInd.style.width = on.offsetWidth + 'px';
      navInd.style.transform = 'translateX(' + on.offsetLeft + 'px)';
      navInd.classList.add('on');
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

    /* A panel changes size when the webfont lands, when a phone rotates, when
       copy reflows — not only on window resize — so each one is watched, and so
       are the nav links, whose widths the pill is sized from. The circuit draw
       is keyed on size, so a callback that changes nothing costs nothing. */
    if (window.ResizeObserver) {
      var relayoutQueued = false;
      var ro = new ResizeObserver(function () {
        if (relayoutQueued) return;
        relayoutQueued = true;
        requestAnimationFrame(function () {
          relayoutQueued = false;
          drawCircuits();
          if (navCurrent >= 0) setNavCurrent(navCurrent);
        });
      });
      for (var ri = 0; ri < rigs.length; ri++) if (rigs[ri]) ro.observe(rigs[ri]);
      if (navList) ro.observe(navList);
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
    var axX = $('axX'), axY = $('axY'), axZ = $('axZ');

    var lastChapter = -1, lastSkinKey = null, shiftedCopy = -1;
    var liveSec = -1, meterTick = 0, scrollP = 0;

    /* The strip's meter: how far through this screen you are. Written only for
       the live section and only every few frames. */
    function writeMeter(sec, i, p) {
      if (sec.rigMeter === undefined) sec.rigMeter = sec.querySelector('.rig-meter');
      if (sec.rigMeter) sec.rigMeter.style.setProperty('--fill', clamp(p - i, 0, 1).toFixed(3));
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
         the change lands inside the crossing — while the model is faded back
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

      /* Recolour the model from whatever the root is now wearing. Keyed on
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

      /* Only the screen you are on animates — the idle beam, the circuit's
         signal, the meter. Seven panels beaming and pulsing at once would
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

      /* The nav's hairline: how far down the whole page you are. */
      var np = Math.round(clamp(scrollP / (CHAPTERS.length - 1), 0, 1) * 1000) / 1000;
      if (navProgress && np !== navP) {
        navP = np;
        navProgress.style.transform = 'scaleX(' + np + ')';
      }

      /* Travel, roll, zoom and morph all run off the same eased fraction, so
         the model crosses the page, turns, resizes and reconfigures as one
         movement rather than four. */
      var e = NeuralField.dragEase(t);
      field.scrollSpin = SPIN_AT[lo] + (SPIN_AT[hi] - SPIN_AT[lo]) * e;

      /* While it is travelling, the model recedes — it passes behind the copy
         column and would otherwise sit on top of the text it is meant to be
         illustrating. Full strength only once it has arrived and settled.
         Plateaus in the middle rather than easing through, so the screen is
         clean for the whole crossing, not just its midpoint. */
      var crossing = smoothstep(clamp(e / 0.16, 0, 1)) * smoothstep(clamp((1 - e) / 0.16, 0, 1));
      if (lo === hi) crossing = 0;

      var x = lerp(anchor(CHAPTERS[lo].x), anchor(CHAPTERS[hi].x), e);
      var base = lerp(dimOf(lo), dimOf(hi), e);
      field.originX = x;
      /* Receding reads as depth, not just fade: it shrinks as it travels. */
      field.zoom = lerp(zoomOf(lo), zoomOf(hi), e) * (1 - 0.10 * crossing);

      /* A dimmed backdrop does not need every edge: at 30% opacity the
         faintest are below the threshold of visible, and edge fill area is the
         whole frame cost — without this, a full-bleed section halved the frame
         rate. Zoom is in the formula as well as opacity because the cost is
         area, not count: a model drawn at 1.5 has edges half again as long, so
         pushing the backdrop larger has to buy that back by dropping more of
         what is already invisible at that opacity. */
      field.detail = clamp(0.30 + base * 0.62 - (field.zoom - 1) * 0.30, 0, 1);

      stage.style.opacity = (base * (1 - 0.72 * crossing)).toFixed(3);
      /* On .stage, not on :root. Both would work — .hud is a descendant — but
         a custom property written to the root every frame dirties style for
         the whole document, and this one is read by exactly one element. */
      stage.style.setProperty('--model-x', x.toFixed(4));
      /* The readout belongs to a model you are inspecting, not to one lying
         behind a screen of copy — it goes with the dimming. */
      stage.style.setProperty('--hud-a', clamp((base - 0.55) / 0.45, 0, 1).toFixed(3));

      /* Parallax. The pinned copy lifts a little through its chapter, which
         gives the copy and the model separation while the model does the
         travelling. */
      shiftCopy(lo, t);

      /* Axis gizmo, projected with the same yaw and pitch as the model — the
         one piece of readout kept, because it is a picture, not a number. */
      var yaw = field.viewYaw !== undefined ? field.viewYaw
              : field.spinBase + p * field.cfg.spinPerChapter;
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var cp = Math.cos(field.pitch), sp = Math.sin(field.pitch);
      function ax(el, ax0, ay0, az0) {
        var x1 = ax0 * cy - az0 * sy, z1 = ax0 * sy + az0 * cy;
        var y1 = ay0 * cp - z1 * sp;
        el.setAttribute('x2', (x1 * 14).toFixed(1));
        el.setAttribute('y2', (-y1 * 14).toFixed(1));
      }
      ax(axX, 1, 0, 0); ax(axY, 0, 1, 0); ax(axZ, 0, 0, 1);
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
         model has eased to. field.progress chases this value with a ~0.5s time
         constant, which is exactly the weight the model wants and exactly half
         a screen of lag for anything else. The reveals read the page directly
         and run here, between measuring and painting, so their reads land on
         a layout that is already clean. */
      scrollP = progress();
      field.setProgress(scrollP);
      if (reveal) reveal(navBottom);
      paint(false);
      requestAnimationFrame(frame);
    }

    /* Handle for diagnostics in the console: __axon.field.stop() etc. */
    window.__axon = { field: field, chapters: CHAPTERS };

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
       half the model belongs in and how far it rolls getting there — so the
       anchors and the roll are both remeasured, not just the canvas. */
    var resizeTimer;
    addEventListener('resize', function () {
      field.resize();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        measure(); computeSpin(); drawCircuits(); setMenu(false); paint(true);
        if (navCurrent >= 0) setNavCurrent(navCurrent);
      }, 90);
      sTarget = sCurrent = sWritten = window.scrollY;
      paint(true);
    }, { passive: true });

    measure();
    computeSpin();
    drawCircuits();
    field.originY = 0.5;
    paint(true);
    requestAnimationFrame(frame);
  }

  /* ---- reveals: type the title, then scan the screen in -------------------
     One sequence per section, in this order:

       1. the eyebrow arrives      (.arming on the <section>)
       2. the title types, character by character
       3. the rig comes in and its beam makes one pass   (.typed on the <section>)
       4. as the beam's leading edge crosses each piece of the screen, that
          piece lands: body copy a line at a time, boxes (cards, rows,
          thumbnails) as the edge reaches their top, and sub-headlines type

     Copy is visible in the stylesheet and hidden only once this runs. Calling
     it *after* boot is the whole trick: if the model fails to build, the
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
     others arrive with the box they sit in. So does the partner wall, whose
     names are moving and have no line to be revealed on. */
  function skipWords(node, stop) {
    for (var el = node.parentNode; el && el !== stop; el = el.parentNode) {
      if (/^(H1|H2|H3|A|BUTTON|SVG|SCRIPT|STYLE)$/i.test(el.nodeName)) return true;
      if (el.classList && el.classList.contains('wall')) return true;
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
     The beam's first pass runs at a constant speed, so where its leading edge
     is at any moment is a straight line — and each piece of the screen can be
     given the exact moment the edge crosses it. That is all this is: measure
     every piece against the panel, turn its height into a time, and hand the
     beam the same start and duration through --scan-from and --scan-d so the
     CSS animation and the reveals cannot drift apart.

     Lines at the same height in two columns (the three project cards, the
     contact figures) are offset by up to SCAN_RASTER across the panel's width,
     left first — a raster, not a curtain.

     SCAN_BEAM is the beam's height in css/main.css (.rig-beam::before): its
     leading edge is that element's bottom border. */
  var SCAN_SPEED = 220, SCAN_SPEED_NARROW = 440, SCAN_BEAM = 150, SCAN_RASTER = 0.12;
  var BOXES = 'li, .card, .thumb, .portrait, .wall-row';

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
    var rig = entry.rig;
    if (!rig) return null;
    var R = rig.getBoundingClientRect(), W = Math.max(1, R.width);
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
       at the top of the panel: the eyebrow and the title are already there,
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

  function land(item, alive) {
    if (item.kind === 'box') item.el.classList.add('in');
    else if (item.kind === 'line') {
      for (var k = 0; k < item.els.length; k++) item.els[k].classList.add('in');
    } else {
      try { typeHeading(item.chars, null, SUB, alive); }
      catch (e) { showAll(item.chars); throw e; }
    }
  }

  function landAll(entry) {
    var k;
    for (k = 0; k < entry.boxes.length; k++) entry.boxes[k].classList.add('in');
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
         empty panel) but the title rewinds, and types again as it comes
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
        var col = sec.querySelector('.ch-col') || sec;
        var entry = { sec: sec, col: col, head: h || col, rig: sec.querySelector('.rig'),
                      chars: h ? splitHeading(h) : null, subs: [], boxes: [], words: [],
                      title: 'hidden', body: 'hidden', tTok: 0, bTok: 0, scanDur: 0 };
        entries.push(entry);

        var subs = sec.querySelectorAll('.ch-col h3');
        for (k = 0; k < subs.length; k++) {
          var sc = splitHeading(subs[k]);
          if (sc) entry.subs.push({ el: subs[k], chars: sc });
        }

        var blocks = sec.querySelectorAll('.rv');
        for (k = 0; k < blocks.length; k++) {
          entry.boxes.push(blocks[k]);
          var inner = blocks[k].querySelectorAll(BOXES);
          for (var b = 0; b < inner.length; b++) {
            if (!inner[b].closest('.wall-belt')) entry.boxes.push(inner[b]);
          }
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
        typeHeading(e.chars, then, TYPE, function () { return e.tTok === tok; });
      } catch (err) {
        showAll(e.chars); then();
        throw err;
      }
    }

    function scan(e) {
      var tok = ++e.bTok, alive = function () { return e.bTok === tok; };
      var plan;
      try { plan = planScan(e); }
      catch (err) { settle(e); throw err; }
      if (!plan) { settle(e); return; }
      e.body = 'scanning';
      e.sec.classList.add('typed', 'scanning');

      /* One loop per scan, walking a list already sorted by time; it holds
         .scanning until the beam has left the panel. */
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
