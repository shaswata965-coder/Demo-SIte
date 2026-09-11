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
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

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

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('field');

  /* ---- theme ------------------------------------------------------------- */
  var systemDark = matchMedia('(prefers-color-scheme: dark)');
  var stored = null;
  try { stored = localStorage.getItem('axon-theme'); } catch (e) { /* private mode */ }
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

  function isDark() {
    var attr = root.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return systemDark.matches;
  }

  var themeBtn = document.getElementById('themeBtn');
  var themeLabel = document.getElementById('themeLabel');

  function syncThemeButton() {
    var dark = isDark();
    themeLabel.textContent = dark ? 'Light' : 'Dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('axon-theme', next); } catch (e) { /* ignore */ }
    syncThemeButton();
    fadeTheme();
    paint(true);
  });
  systemDark.addEventListener('change', function () {
    if (!root.hasAttribute('data-theme')) { syncThemeButton(); fadeTheme(); paint(true); }
  });
  var fadeTimer;
  function fadeTheme() {
    root.classList.add('theming');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () { root.classList.remove('theming'); }, 480);
  }
  syncThemeButton();

  /* ---- palette: mirrors the formulas in css/tokens.css -------------------- */
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

  /* ---- the model --------------------------------------------------------- */
  var field = new NeuralField(canvas, {
    interactive: true,
    mode: isDark() ? 'glow' : 'ink',
    colors: palette(CHAPTERS[0].h, CHAPTERS[0].s, isDark())
  });
  field.start();

  /* ---- chapter rail ------------------------------------------------------ */
  var rail = document.getElementById('rail');
  var buttons = CHAPTERS.map(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<em>' + c.label + '</em><i></i>';
    b.setAttribute('aria-label', 'Chapter ' + i + ', ' + c.label);
    b.addEventListener('click', function () {
      window.scrollTo({ top: tops[i], behavior: reduced ? 'auto' : 'smooth' });
    });
    rail.appendChild(b);
    return b;
  });

  /* ---- measurement ------------------------------------------------------- */
  var sections = CHAPTERS.map(function (_, i) { return document.getElementById('c' + i); });
  var tops = [];
  function measure() { tops = sections.map(function (s) { return s.offsetTop; }); }

  function progressFor(y) {
    for (var i = sections.length - 1; i >= 0; i--) {
      if (y >= tops[i] || i === 0) {
        var next = (i + 1 < tops.length) ? tops[i + 1] : tops[i] + innerHeight;
        var span = Math.max(1, next - tops[i]);
        return i + Math.max(0, Math.min(1, (y - tops[i]) / span));
      }
    }
    return 0;
  }

  /* ---- painting ---------------------------------------------------------- */
  var hudState = document.getElementById('hudState');
  var hudYaw = document.getElementById('hudYaw');
  var hudProg = document.getElementById('hudProg');
  var hudCount = document.getElementById('hudCount');
  var axX = document.getElementById('axX'), axY = document.getElementById('axY'), axZ = document.getElementById('axZ');

  hudCount.textContent = field.cfg.nodes + ' units · ' + field.eCount + ' weights';

  var hue = CHAPTERS[0].h, sat = CHAPTERS[0].s;
  var paintedHue = NaN, paintedSat = NaN;
  var lastChapter = -1, lastSide = '';

  function paint(force) {
    var p = field.progress;
    var lo = Math.floor(p), hi = Math.min(CHAPTERS.length - 1, lo + 1);
    var t = p - lo;

    /* Hue is interpolated continuously so the recolour happens *through* the
       scroll rather than snapping at the chapter boundary. */
    hue = CHAPTERS[lo].h + (CHAPTERS[hi].h - CHAPTERS[lo].h) * t;
    sat = CHAPTERS[lo].s + (CHAPTERS[hi].s - CHAPTERS[lo].s) * t;
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

    /* Read the yaw the model actually rendered with, pose offset included. */
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

  /* ---- frame loop -------------------------------------------------------- */
  function frame() {
    field.setProgress(progressFor(window.scrollY || window.pageYOffset));
    paint(false);
    requestAnimationFrame(frame);
  }

  /* ---- reveals ----------------------------------------------------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  var reveals = document.querySelectorAll('.rv');
  for (var i = 0; i < reveals.length; i++) io.observe(reveals[i]);
  /* The opening chapter is above the fold on every viewport — never make the
     first painted frame wait on an observer. */
  requestAnimationFrame(function () {
    var hero = document.querySelectorAll('#c0 .rv');
    for (var h = 0; h < hero.length; h++) hero[h].classList.add('in');
  });

  document.getElementById('cta').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  addEventListener('resize', measure, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
  paint(true);
  requestAnimationFrame(frame);
}());
