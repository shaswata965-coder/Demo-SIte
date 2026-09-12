/* ============================================================================
   TOTEM DEMO — orchestration
   ----------------------------------------------------------------------------
   Scroll position becomes one number, `progress`, in [0, 6]. Everything else
   is derived from it:

     · which arrangement the model holds, and how far it has turned
     · the page's hue and saturation, lerped continuously
     · the chapter's discrete aesthetic (type width, texture, side, radius),
       stamped as data-chapter and transitioned by CSS

   JS owns the hue rather than CSS so that the page and the canvas are painted
   from the identical value on the identical frame. Two sources would drift.

   Rule this file follows: the copy is the page. `armReveals` runs after the
   model is built, so a failure there leaves a readable static page and the
   error reaches the console instead of being swallowed.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* Hue walks the spectrum in one direction across the chapters, so a change
     never sweeps backwards through colours you have already passed. The last
     is negative so the wrap to magenta is a short move, not a long one. */
  /* The model alternates sides every chapter and the copy alternates with it.
     `side` is which side the MODEL sits on; the copy takes the other one.
     Colour is not per chapter: one palette runs the whole page. */
  var CHAPTERS = [
    { id: 'seed',   label: 'Dormant',    side: 'right' },
    { id: 'bloom',  label: 'Ingest',     side: 'left' },
    { id: 'infer',  label: 'Inference',  side: 'right' },
    { id: 'settle', label: 'Settlement', side: 'left' },
    { id: 'vault',  label: 'Assurance',  side: 'right' },
    { id: 'ledger', label: 'Proof',      side: 'left' },
    { id: 'core',   label: 'Begin',      side: 'right' }
  ];

  /* How far the model rolls while crossing from one side to the other. It
     rolls in the direction it is being pulled, so a move left turns it left. */
  var SPIN_PER_CROSSING = 0.78;

  /* Cumulative spin at each chapter, signed by the direction of travel. */
  var SPIN_AT = (function () {
    var out = [0];
    for (var i = 1; i < CHAPTERS.length; i++) {
      var dir = CHAPTERS[i].side === 'right' ? 1 : -1;
      out.push(out[i - 1] + dir * SPIN_PER_CROSSING);
    }
    return out;
  }());

  var sections = [];

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }

  /* Where the stage sits, in px from the left edge of the viewport, for a
     given side. Mirrors the widths in css/main.css. */
  function anchorX(side) {
    var vw = innerWidth;
    return side === 'right' ? vw * 0.51 : vw * 0.03;
  }

  function boot() {
    /* The artifact host wraps this file in its own document, so attributes
       written on <html> in the markup may not survive. Set them here too —
       they are what the per-chapter aesthetic hangs off. */
    if (!root.getAttribute('lang')) root.setAttribute('lang', 'en');
    if (!root.hasAttribute('data-chapter')) root.setAttribute('data-chapter', '0');

    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = $('field');
    var stage = document.querySelector('.stage');
    var texture = document.querySelector('.texture');
    var bodies = sections.map(function (el) { return el.querySelector('.ch-body'); });

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

    /* ---- palette: read once from the stylesheet -------------------------- */
    /* The six accents, the ink and the muted tone all live in css/tokens.css.
       Reading them means the model and the page can never disagree, and there
       is no colour arithmetic duplicated in two languages. */
    var PAL_VARS = ['--c-primary', '--c-second', '--c-signal'];
    function palette() {
      var cs = getComputedStyle(root);
      return {
        pal: PAL_VARS.map(function (v) { return cs.getPropertyValue(v).trim(); }),
        ink: cs.getPropertyValue('--ink').trim(),
        dim: cs.getPropertyValue('--faint').trim()
      };
    }

    /* ---- the model -------------------------------------------------------- */
    /* No ambient yaw drift: the model turns because you scrolled it or
       dragged it, never on its own. That is the whole feel being asked for,
       and it also keeps each arrangement's viewing pose reliable. The signal
       pulses keep it alive while it is standing still. */
    var field = new NeuralField(canvas, {
      interactive: true,
      autoRotate: 0,
      mode: isDark() ? 'glow' : 'ink',
      colors: palette()
    });
    field.start();

    /* ---- chapter rail ----------------------------------------------------- */
    var rail = $('rail');
    var buttons = CHAPTERS.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<em>' + c.label + '</em><i></i>';
      b.setAttribute('aria-label', 'Chapter ' + i + ', ' + c.label);
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

    var lastChapter = -1, themedDark = null, shiftedCopy = -1;

    /* Only the chapter you are in carries a parallax offset; the previous one
       is cleared as you leave it. Two style writes a frame at most. */
    function shiftCopy(idx, f) {
      if (shiftedCopy !== idx) {
        if (shiftedCopy >= 0 && bodies[shiftedCopy]) bodies[shiftedCopy].style.transform = '';
        shiftedCopy = idx;
      }
      if (bodies[idx]) {
        bodies[idx].style.transform = 'translate3d(0,' + (-f * 26).toFixed(1) + 'px,0)';
      }
    }

    function paint(force) {
      var p = field.progress;
      var lo = Math.floor(p), hi = Math.min(CHAPTERS.length - 1, lo + 1), t = p - lo;

      var dark = isDark();
      if (force || dark !== themedDark) {
        themedDark = dark;
        field.setTheme(dark ? 'glow' : 'ink', palette());
      }

      /* Travel, roll and morph all run off the same eased fraction, so the
         model crosses the page, turns and reconfigures as one movement. */
      var e = NeuralField.dragEase(t);
      field.scrollSpin = SPIN_AT[lo] + (SPIN_AT[hi] - SPIN_AT[lo]) * e;

      /* While it is crossing, the model recedes — it passes behind the copy
         column and would otherwise sit on top of the text it is meant to be
         illustrating. Full strength only once it has arrived and settled.
         Plateaus in the middle rather than easing through, so the screen is
         clean for the whole crossing, not just its midpoint. */
      var crossing = smoothstep(clamp(e / 0.16, 0, 1)) * smoothstep(clamp((1 - e) / 0.16, 0, 1));
      if (lo === hi) crossing = 0;
      stage.style.opacity = (1 - 0.78 * crossing).toFixed(3);

      if (wide()) {
        var x = anchorX(CHAPTERS[lo].side)
              + (anchorX(CHAPTERS[hi].side) - anchorX(CHAPTERS[lo].side)) * e;
        /* Receding reads as depth, not just fade: it shrinks as it crosses. */
        var depth = 1 - 0.12 * crossing;
        stage.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) scale(' + depth.toFixed(4) + ')';
      } else if (stage.style.transform) {
        stage.style.transform = '';
      }

      /* Parallax. The dot grid drifts slower than the page — modulo its own
         30px pitch, so the loop is seamless — and the pinned copy lifts a
         little through its chapter, which gives the layers separation while
         the model does the travelling. */
      texture.style.transform =
        'translate3d(0,' + (-(sCurrent * 0.07) % 30).toFixed(1) + 'px,0)';
      shiftCopy(lo, t);

      var idx = Math.min(CHAPTERS.length - 1, Math.floor(p + 0.3));
      if (idx !== lastChapter || force) {
        lastChapter = idx;
        root.setAttribute('data-chapter', String(idx));
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
        }
        hudState.textContent = CHAPTERS[idx].id;
        if (!force) field.pulse(0.6);
      }

      /* Axis gizmo, projected with the same yaw and pitch as the model — the
         one piece of readout kept, because it is a picture, not a number. */
      var yaw = field.viewYaw !== undefined ? field.viewYaw
              : field.spinBase + p * field.cfg.spinPerChapter;
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var cp = Math.cos(field.pitch), sp = Math.sin(field.pitch);
      function ax(el, x, y, z) {
        var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        var y1 = y * cp - z1 * sp;
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
        if (restPending && now - lastInput > REST_AFTER) {
          var rest = settleFor(sTarget);
          if (rest !== null) sTarget = rest;
          restPending = false;
        }
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

    $('cta').addEventListener('click', function () { scrollToSection(0); });

    /* ---- fluid scroll -----------------------------------------------------
       The wheel moves a target; the real scroll position chases it every
       frame. Two things matter about that.

       First, we move the actual scroll position rather than a transform. A
       transform-based smooth scroller is the usual approach and it would break
       `position: sticky`, which the pinned copy this whole layout depends on.

       Second, the settle is folded into the same target instead of being a
       separate scrollTo fired after a timer. That is what made it feel like
       the scroll stopped and then started again: two motions competing. Now
       there is one value, eased continuously, and coming to rest on a section
       is the same motion as scrolling rather than a jump tacked onto its end.

       Fine pointers only — on touch, native momentum is better than anything
       reimplemented on top of it. */
    var SETTLE_AT = 0.32;       /* how far into a chapter before it carries on */
    var SCROLL_TAU = 0.26;      /* seconds for the scroll to catch its target  */
    var REST_AFTER = 110;       /* ms of quiet before the page settles         */

    var coarse = matchMedia('(pointer: coarse)').matches;
    var fluid = !coarse && !reduced;
    var sTarget = window.scrollY, sCurrent = sTarget;
    var lastInput = -1e9, restPending = false, sWritten = -1;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - innerHeight);
    }

    function settleFor(y) {
      var base = window.scrollY;
      var tops = sections.map(function (el) { return el.getBoundingClientRect().top + base; });
      var i = 0;
      for (var k = 0; k < tops.length; k++) if (y >= tops[k] - 2) i = k;
      if (i + 1 >= tops.length) return null;
      var span = tops[i + 1] - tops[i];
      if (span < 1) return null;
      var frac = (y - tops[i]) / span;
      if (frac < 0.015 || frac > 0.985) return null;      /* already at rest */
      return clamp(Math.round(frac < SETTLE_AT ? tops[i] : tops[i + 1]), 0, maxScroll());
    }

    if (fluid) {
      addEventListener('wheel', function (e) {
        if (e.ctrlKey) return;                        /* leave pinch-zoom alone */
        e.preventDefault();
        var d = e.deltaY;
        if (e.deltaMode === 1) d *= 16;               /* lines */
        else if (e.deltaMode === 2) d *= innerHeight; /* pages */
        sTarget = clamp(sTarget + d, 0, maxScroll());
        lastInput = performance.now();
        restPending = true;
      }, { passive: false });

      /* Keyboard, scrollbar drag, find-in-page — anything that moves the real
         scroll behind our back. Only resync when it was not our own write. */
      addEventListener('scroll', function () {
        if (Math.abs(window.scrollY - sCurrent) > 3) {
          sCurrent = sTarget = sWritten = window.scrollY;
          lastInput = performance.now();
          restPending = true;
        }
      }, { passive: true });
    }

    function scrollToSection(i) {
      if (!fluid) {
        sections[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      sTarget = clamp(Math.round(sections[i].getBoundingClientRect().top + window.scrollY), 0, maxScroll());
      restPending = false;
    }

    addEventListener('resize', function () {
      field.resize();
      sTarget = sCurrent = sWritten = window.scrollY;
      paint(true);
    }, { passive: true });

    paint(true);
    requestAnimationFrame(frame);
  }

  function wide() { return innerWidth >= 900; }

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

    /* The opening chapter is above the fold on every viewport — never make the
       first painted frame wait on an observer. */
    var hero = document.querySelectorAll('#c0 .rv');
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
