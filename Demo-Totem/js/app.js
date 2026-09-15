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
     the root, and the topbar scrim, which is drawn from the root's ground,
     both follow. The names here and the .sk-* classes in index.html have to
     agree. */
  var CHAPTERS = [
    { id: 'seed',   label: 'Intro',    x: 'right', dim: 1.00, zoom: 0.82, skin: 'paper' },
    { id: 'bloom',  label: 'Services', x: 'left',  dim: 1.00, zoom: 0.82, skin: 'violet' },
    { id: 'infer',  label: 'Method',   x: 'right', dim: 1.00, zoom: 0.76, skin: 'paper' },
    { id: 'settle', label: 'Work',     x: 0.60,    dim: 0.34, zoom: 1.38, skin: 'lemon' },
    { id: 'vault',  label: 'Team',     x: 'left',  dim: 1.00, zoom: 0.80, skin: 'paper' },
    { id: 'ledger', label: 'Partners', x: 0.44,    dim: 0.42, zoom: 1.50, skin: 'cyan' },
    { id: 'core',   label: 'Contact',  x: 'right', dim: 1.00, zoom: 0.88, skin: 'ember' }
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
    var texture = document.querySelector('.texture');
    var bodies = sections.map(function (el) { return el.querySelector('.ch-col'); });

    /* ---- where the content container actually is --------------------------
       Measured rather than recomputed from the CSS clamps, so the model and
       the copy can never disagree about where the halfway line is. */
    var innerL = 0, innerW = innerWidth;
    function measure() {
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

    var themeBtn = $('themeBtn'), themeLabel = $('themeLabel');
    function syncThemeButton() {
      var dark = isDark();
      themeLabel.textContent = dark ? 'Light' : 'Dark';
      themeBtn.setAttribute('aria-pressed', String(dark));
      themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
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

    /* ---- section rail ----------------------------------------------------- */
    var rail = $('rail');
    var buttons = CHAPTERS.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<em>' + c.label + '</em><i></i>';
      b.setAttribute('aria-label', 'Section ' + i + ', ' + c.label);
      b.addEventListener('click', function () { scrollToSection(i); });
      rail.appendChild(b);
      return b;
    });

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
    var hudState = $('hudState'), hudCount = $('hudCount');
    var axX = $('axX'), axY = $('axY'), axZ = $('axZ');
    hudCount.textContent = field.cfg.nodes + ' units · ' + field.eCount + ' weights';

    var lastChapter = -1, lastSkinKey = null, shiftedCopy = -1;

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
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
        }
        hudState.textContent = CHAPTERS[idx].id;
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

      /* Parallax. The dot grid drifts slower than the page — modulo its own
         30px pitch, so the loop is seamless — and the pinned copy lifts a
         little through its chapter, which gives the layers separation while
         the model does the travelling. */
      texture.style.transform =
        'translate3d(0,' + (-(sCurrent * 0.07) % 30).toFixed(1) + 'px,0)';
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

      field.setProgress(progress());
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
      resizeTimer = setTimeout(function () { measure(); computeSpin(); paint(true); }, 90);
      sTarget = sCurrent = sWritten = window.scrollY;
      paint(true);
    }, { passive: true });

    measure();
    computeSpin();
    field.originY = 0.5;
    paint(true);
    requestAnimationFrame(frame);
  }

  /* ---- reveals ------------------------------------------------------------ */
  /* Copy is visible in the stylesheet and hidden only once this runs. Calling
     it *after* boot is the whole trick: if the model fails to build, the
     hiding never happens and the page is simply a readable static page. */
  function armReveals() {
    var rv = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || !rv.length) return;
    root.classList.add('reveals-armed');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    for (var i = 0; i < rv.length; i++) io.observe(rv[i]);

    /* The schematics get their own observer at a much higher threshold. They
       live inside the band, which is 1.82 viewports tall and starts
       intersecting while the previous section is still being read — at the
       copy's 0.01 they would trace themselves in behind text that has not
       arrived. Because the layer is sticky at 100svh, its visible fraction is
       a direct reading of how far its section has come up the screen: 0.62
       fires as the section lands, which is what "drawn in when we scroll to
       that section" has to mean. */
    var tech = document.querySelectorAll('.hitech');
    if (tech.length) {
      var ioTech = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); ioTech.unobserve(en.target); }
        });
      }, { threshold: 0.62 });
      for (var k = 0; k < tech.length; k++) ioTech.observe(tech[k]);
    }

    /* The opening section is above the fold on every viewport — never make the
       first painted frame wait on an observer. */
    var hero = document.querySelectorAll('#c0 .rv, #c0 .hitech');
    for (var h = 0; h < hero.length; h++) hero[h].classList.add('in');
  }

  function init() {
    sections = CHAPTERS.map(function (_, i) { return $('c' + i); });
    boot();
    armReveals();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
