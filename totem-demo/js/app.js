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

   Rule this file follows: the copy is the page. Nothing here may leave text
   invisible, whatever fails — see `armReveals` and the catch at the bottom.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;

  /* Hue walks the spectrum in one direction across the chapters, so a change
     never sweeps backwards through colours you have already passed. The last
     is negative so the wrap to magenta is a short move, not a long one. */
  var CHAPTERS = [
    { id: 'seed',   label: 'Dormant',    h: 250, s: 70, side: 'right' },
    { id: 'bloom',  label: 'Ingest',     h: 200, s: 82, side: 'right' },
    { id: 'infer',  label: 'Inference',  h: 168, s: 72, side: 'right' },
    { id: 'settle', label: 'Settlement', h: 130, s: 60, side: 'left'  },
    { id: 'vault',  label: 'Assurance',  h:  42, s: 88, side: 'left'  },
    { id: 'ledger', label: 'Proof',      h:  12, s: 78, side: 'right' },
    { id: 'core',   label: 'Begin',      h: -32, s: 76, side: 'right' }
  ];

  var sections = [], revealed = false;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Show every piece of copy and stop gating on script. Called on success
     paths, on a timer, and from the catch — whichever happens first. */
  function revealAll() {
    revealed = true;
    root.classList.remove('reveals-armed');
    var rv = document.querySelectorAll('.rv');
    for (var i = 0; i < rv.length; i++) rv[i].classList.add('in');
  }

  function boot() {
    /* The artifact host wraps this file in its own document, so attributes
       written on <html> in the markup may not survive. Set them here too —
       they are what the per-chapter aesthetic hangs off. */
    if (!root.getAttribute('lang')) root.setAttribute('lang', 'en');
    if (!root.hasAttribute('data-chapter')) root.setAttribute('data-chapter', '0');
    if (!root.hasAttribute('data-side')) root.setAttribute('data-side', 'right');

    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canvas = $('field');

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

    /* ---- palette: mirrors the formulas in css/tokens.css ------------------ */
    function palette(h, s, dark) {
      if (dark) {
        return {
          accent:  'hsl(' + h + ' ' + (s * 0.95) + '% 64%)',
          accent2: 'hsl(' + (h + 165) + ' ' + (s * 0.80) + '% 62%)',
          ink:     'hsl(' + h + ' 14% 93%)',
          dim:     'hsl(' + h + ' 12% 52%)'
        };
      }
      return {
        accent:  'hsl(' + h + ' ' + (s * 0.95) + '% 40%)',
        accent2: 'hsl(' + (h + 165) + ' ' + (s * 0.78) + '% 38%)',
        ink:     'hsl(' + h + ' 46% 11%)',
        dim:     'hsl(' + h + ' 22% 44%)'
      };
    }

    /* ---- the model -------------------------------------------------------- */
    var field = new NeuralField(canvas, {
      interactive: true,
      mode: isDark() ? 'glow' : 'ink',
      colors: palette(CHAPTERS[0].h, CHAPTERS[0].s, isDark())
    });
    field.start();

    /* ---- chapter rail ----------------------------------------------------- */
    var rail = $('rail');
    var buttons = CHAPTERS.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<em>' + c.label + '</em><i></i>';
      b.setAttribute('aria-label', 'Chapter ' + i + ', ' + c.label);
      b.addEventListener('click', function () {
        /* scrollIntoView works whatever element is doing the scrolling — the
           window, or a host container this page is embedded in. */
        sections[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
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
    var hudState = $('hudState'), hudYaw = $('hudYaw'), hudProg = $('hudProg'), hudCount = $('hudCount');
    var axX = $('axX'), axY = $('axY'), axZ = $('axZ');
    hudCount.textContent = field.cfg.nodes + ' units · ' + field.eCount + ' weights';

    var paintedHue = NaN, paintedSat = NaN, lastChapter = -1, lastSide = '';

    function paint(force) {
      var p = field.progress;
      var lo = Math.floor(p), hi = Math.min(CHAPTERS.length - 1, lo + 1), t = p - lo;

      /* Hue is interpolated continuously so the recolour happens *through* the
         scroll rather than snapping at the chapter boundary. */
      var hue = CHAPTERS[lo].h + (CHAPTERS[hi].h - CHAPTERS[lo].h) * t;
      var sat = CHAPTERS[lo].s + (CHAPTERS[hi].s - CHAPTERS[lo].s) * t;

      /* Writing a custom property on <html> invalidates style for the tree, so
         only write when the value actually moved. At rest this is a no-op. */
      if (force || Math.abs(hue - paintedHue) > 0.06 || Math.abs(sat - paintedSat) > 0.06) {
        paintedHue = hue; paintedSat = sat;
        root.style.setProperty('--h', hue.toFixed(2));
        root.style.setProperty('--s', sat.toFixed(2));
      }

      var dark = isDark();
      field.setTheme(dark ? 'glow' : 'ink', palette(hue, sat, dark));

      var idx = Math.min(CHAPTERS.length - 1, Math.floor(p + 0.3));
      if (idx !== lastChapter || force) {
        lastChapter = idx;
        root.setAttribute('data-chapter', String(idx));
        var side = CHAPTERS[idx].side;
        if (side !== lastSide) { lastSide = side; root.setAttribute('data-side', side); }
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
        }
        hudState.textContent = CHAPTERS[idx].id;
        if (!force) field.pulse(0.6);
      }

      var yaw = field.viewYaw !== undefined ? field.viewYaw
              : field.spinBase + p * field.cfg.spinPerChapter;
      hudYaw.textContent = String(Math.round((yaw * 180 / Math.PI) % 360 + 360) % 360).padStart(3, '0') + '°';
      hudProg.textContent = p.toFixed(2);

      /* Axis gizmo, projected with the same yaw and pitch as the model. */
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

    function frame() {
      field.setProgress(progress());
      paint(false);
      requestAnimationFrame(frame);
    }

    $('cta').addEventListener('click', function () {
      sections[0].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });

    paint(true);
    requestAnimationFrame(frame);
  }

  /* ---- reveals ------------------------------------------------------------ */
  /* Copy is visible in the stylesheet. It is hidden only once this runs, and
     three independent things un-hide it: the observer, a failsafe timer, and
     the catch below. A reader never depends on all three working. */
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

    /* Failsafe: if the observer never fires — an embedding host scrolls a
       container it does not see, the tab is restored from bfcache, anything —
       the copy appears anyway. Silently readable beats silently blank. */
    setTimeout(function () { if (!revealed) revealAll(); }, 2500);
  }

  function init() {
    sections = CHAPTERS.map(function (_, i) { return $('c' + i); });
    try {
      armReveals();
      boot();
    } catch (err) {
      /* Whatever broke, the page is still a page. */
      revealAll();
      root.classList.remove('theming');
      if (window.console) console.error('[axon] falling back to static page:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
