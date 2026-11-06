/* ============================================================================
   LARCH — the page's behaviour
   ----------------------------------------------------------------------------
   Ported from Demo-Wealthsimple/js/site.js (and js/banner.js). The page reads
   completely without it. This adds:

     · the opening: skipping it, ending it, and holding the page's entrances
       until then
     · the theme toggle, the pause buttons and the demos strip's close button
       (all remembered in this browser, if storage is allowed)
     · headline entrances: words rise half an em and fade in as a headline
       comes into view (the big serif lines rise out of a mask); the copy
       around it fades in after; the product pictures rise into place
     · the header's swap from wordmark to call to action on a phone, once
       the opener has scrolled away
     · closing the menus after a link is chosen
     · pausing the loops of any section that is off screen, and starting
       them from the top when it comes back
     · every entrance replays each time its section comes back into view
     · small things: a reading-progress hairline on the header, the thesis
       lighting up as you read it, depth under the pointer, and the risk
       legend pointing at its slice

   What changed in the port: headlines arrive already split into words
   (<SplitWords />), so this only arms them; the opener's form, the copy
   button and the turning last line of the close are React components; and
   everything set up here is released by the function it returns, because
   React mounts effects twice in development.
   ========================================================================== */

export function initSite() {
  var root = document.documentElement;
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var ac = new AbortController(), sig = { signal: ac.signal, passive: true };
  var observers = [], timers = [];
  function watch(o) { observers.push(o); return o; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* not remembered */ } }

  /* ---- the opening ------------------------------------------------------
     Its whole timeline is CSS (styles/intro.css). Here: any key, click,
     wheel or touch skips it; when it ends it is hidden, and everything
     waiting on it (the page's entrances, the opener's tree) is told. */
  var intro = document.getElementById('intro'), introOver = false;
  function introDone() {
    if (introOver) return;
    introOver = true;
    root.classList.remove('intro-on', 'intro-skip');   /* .intro is display:none without .intro-on */
    var h = document.getElementById('hdr'); if (h) h.classList.add('hdr-drop');
    document.dispatchEvent(new CustomEvent('larch:intro-done'));
  }
  function afterIntro(fn) {
    if (introOver || !root.classList.contains('intro-on')) fn();
    else document.addEventListener('larch:intro-done', fn, { once: true, signal: ac.signal });
  }
  if (intro && root.classList.contains('intro-on')) {
    intro.addEventListener('animationend', function (e) { if (e.target === intro) introDone(); }, sig);
    later(introDone, 5000);                          /* in case no animation ever ends */
    var skip = function () { if (!introOver) root.classList.add('intro-skip'); };
    later(function () {
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
        addEventListener(t, skip, { once: true, passive: true, signal: ac.signal });
      });
    }, 250);
  } else introOver = true;

  /* ---- the demos strip --------------------------------------------------
     Its hidden state is restored before first paint by the early script in
     layout.tsx. */
  var bannerX = document.getElementById('demoBannerClose');
  if (bannerX) bannerX.addEventListener('click', function () {
    root.classList.add('no-banner');
    store('larch-banner', 'hidden');
    /* Focus was on the button that just went away; hand it to the header. */
    var next = document.querySelector('.hdr a');
    if (next) next.focus({ preventScroll: true });
    /* Once the page has slid into the strip's place, let anything that
       measures the layout remeasure, as on any resize. */
    var dur = parseFloat(getComputedStyle(root).getPropertyValue('--banner-dur')) || 0;
    later(function () { dispatchEvent(new Event('resize')); }, dur * 1000 + 40);
  }, sig);

  /* ---- theme ------------------------------------------------------------ */
  var themeBtn = document.getElementById('themeBtn');
  var system = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : system.matches;
  }
  function syncTheme() { if (themeBtn) themeBtn.setAttribute('aria-pressed', String(isDark())); }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('larch-theme', next);
    syncTheme();
  }, sig);
  if (system.addEventListener) system.addEventListener('change', syncTheme, sig);
  syncTheme();

  /* ---- pause ------------------------------------------------------------
     One choice for the whole page. scenes.js and <Endings /> read it too. */
  var motionBtns = document.querySelectorAll('[data-motion-toggle]');
  function isPaused() { return root.getAttribute('data-motion') === 'paused'; }
  function syncMotion() {
    for (var i = 0; i < motionBtns.length; i++) motionBtns[i].setAttribute('aria-pressed', String(isPaused()));
  }
  for (var m = 0; m < motionBtns.length; m++) motionBtns[m].addEventListener('click', function () {
    if (isPaused()) root.removeAttribute('data-motion'); else root.setAttribute('data-motion', 'paused');
    store('larch-motion', isPaused() ? 'paused' : 'playing');
    syncMotion();
    document.dispatchEvent(new CustomEvent('larch:motion'));
  }, sig);
  syncMotion();

  /* ---- sections off screen stop their loops; coming back starts them over
     A section's CSS loops freeze while it is away. When it returns they are
     rewound to their first frame, so each visit opens on the whole sequence
     (the score counting up, the forecast drawing itself) rather than on
     whatever moment the loop was paused at. */
  function rewind(section) {
    if (!section.getAnimations || typeof CSSAnimation === 'undefined') return;
    section.getAnimations({ subtree: true }).forEach(function (a) {
      if (!(a instanceof CSSAnimation)) return;                 /* not transitions */
      if (a.timeline && a.timeline !== document.timeline) return; /* not scroll-linked */
      try { a.currentTime = 0; } catch (e) { /* leave it running */ }
    });
  }
  if ('IntersectionObserver' in window) {
    var away = watch(new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var s = e.target, was = s.hasAttribute('data-offscreen');
        if (e.isIntersecting) { s.removeAttribute('data-offscreen'); if (was) rewind(s); }
        else s.setAttribute('data-offscreen', '');
      });
    }, { rootMargin: '60px 0px' }));
    document.querySelectorAll('.ph, .final, .news, .about').forEach(function (s) {
      s.setAttribute('data-offscreen', '');
      away.observe(s);
    });
  }

  /* ---- reading progress, a hairline along the foot of the header ------- */
  var hdrBar = document.querySelector('.hdr'), ticking = false, rafs = [];
  function progress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    if (hdrBar) hdrBar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    lightThesis();
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; rafs.push(requestAnimationFrame(progress)); } }, sig);
  addEventListener('resize', progress, sig);
  rafs.push(requestAnimationFrame(progress));

  /* The thesis lights up as you read down it, word by word. Set up below
     once the words are armed. */
  var thesis = null;
  function lightThesis() {
    if (!thesis) return;
    var r = thesis.el.getBoundingClientRect();
    var t = (innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.3);
    var n = Math.round(Math.max(0, Math.min(1, t)) * thesis.words.length);
    if (n === thesis.n) return;
    for (var i = 0; i < thesis.words.length; i++) thesis.words[i].classList.toggle('lit', i < n);
    thesis.n = n;
  }

  /* ---- header -----------------------------------------------------------
     Past the opener, a phone shows the call to action where the wordmark
     was. */
  var hdr = document.getElementById('hdr'), first = document.querySelector('.ph-first');
  if (hdr && first && 'IntersectionObserver' in window) {
    watch(new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (!e.isIntersecting && e.boundingClientRect.top < 0) hdr.setAttribute('data-past', '');
      else hdr.removeAttribute('data-past');
    }, { rootMargin: '-80px 0px 0px 0px' })).observe(first);
  }

  /* ---- menus close once a link is chosen ------------------------------- */
  document.querySelectorAll('[popover] a').forEach(function (a) {
    a.addEventListener('click', function () {
      var pop = a.closest('[popover]');
      if (pop && pop.hidePopover) { try { pop.hidePopover(); } catch (e) { /* already closed */ } }
    }, sig);
  });

  /* ---- depth under the pointer --------------------------------------------
     On a wide screen with a mouse, the floating parts of each picture shift a
     few pixels against the pointer, and the model card tilts toward it. */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.ph:not(.ph-first)').forEach(function (s) {
      var raf = 0, x = 0, y = 0;
      function apply() { raf = 0; s.style.setProperty('--px', x.toFixed(3)); s.style.setProperty('--py', y.toFixed(3)); }
      s.addEventListener('pointermove', function (ev) {
        var r = s.getBoundingClientRect();
        x = (ev.clientX - r.left) / r.width * 2 - 1;
        y = (ev.clientY - r.top) / r.height * 2 - 1;
        if (!raf) raf = requestAnimationFrame(apply);
      }, sig);
      s.addEventListener('pointerleave', function () { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(apply); }, sig);
    });
  }

  /* ---- the risk legend points at its slice ------------------------------ */
  var donut = document.querySelector('.a-risk');
  if (donut) donut.querySelectorAll('.legend li').forEach(function (li, i) {
    li.addEventListener('pointerenter', function () { donut.setAttribute('data-focus', String(i + 1)); }, sig);
    li.addEventListener('pointerleave', function () { donut.removeAttribute('data-focus'); }, sig);
  });

  function teardown() {
    ac.abort();
    observers.forEach(function (o) { o.disconnect(); });
    timers.forEach(clearTimeout);
    rafs.forEach(cancelAnimationFrame);
  }

  /* ---- entrances ----------------------------------------------------------
     Only when the early script allowed them (.at-on): not for reduced
     motion, and not without IntersectionObserver. */
  if (!root.classList.contains('at-on')) return teardown;

  /* Words go in reading order: a short step per word, a longer one per line,
     capped so a long paragraph still finishes in about a second and a half. */
  function play(el) {
    var words = el.querySelectorAll('.at-w'), line = -1, top = null;
    var step = Math.min(0.035, 1.1 / Math.max(words.length, 1));
    for (var i = 0; i < words.length; i++) {
      var t = words[i].offsetTop;
      if (top === null || Math.abs(t - top) > 4) { line++; top = t; }
      words[i].style.setProperty('--d', (i * step + line * 0.06).toFixed(3) + 's');
    }
    rafs.push(requestAnimationFrame(function () {
      for (var j = 0; j < words.length; j++) words[j].setAttribute('data-s', 'go');
    }));
  }

  var heads = Array.prototype.slice.call(document.querySelectorAll('[data-at]'));
  var fades = Array.prototype.slice.call(document.querySelectorAll('[data-at-fade], [data-icon-fade]'));
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  heads.forEach(function (el) { el.setAttribute('data-at-ready', ''); });
  reveals.forEach(function (el) { el.setAttribute('data-reveal-ready', ''); });

  /* Copy that follows its headline waits for it; copy before it (an
     eyebrow) goes first. */
  fades.forEach(function (el) {
    var box = el.closest('.ph-copy, .final-inner, .news-card');
    var head = box && box.querySelector('[data-at]');
    var delay = 0;
    if (head && (head.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      var after = Array.prototype.filter.call(box.querySelectorAll('[data-at-fade]'), function (f) {
        return head.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING;
      });
      delay = 0.4 + 0.12 * after.indexOf(el);
    }
    el.style.setProperty('--d', delay.toFixed(2) + 's');
    el.setAttribute('data-fade-ready', '');
  });

  /* Every entrance plays each time its element comes into view, and resets
     once it is wholly off screen, ready to play again. Two observers: one
     with a margin, so things start a little after they appear; one on the
     true viewport, so nothing resets while any of it is still visible. */
  var shown = new WeakSet();
  function enter(el) {
    if (shown.has(el)) return;
    shown.add(el);
    if (el.hasAttribute('data-at')) play(el); else el.classList.add('is-in');
  }
  function leave(el) {
    if (!shown.has(el)) return;
    shown.delete(el);
    if (el.hasAttribute('data-at')) {
      var w = el.querySelectorAll('.at-w');
      for (var i = 0; i < w.length; i++) w[i].setAttribute('data-s', 'prep');
    } else el.classList.remove('is-in');
  }
  var inView = watch(new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) enter(e.target); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }));
  var outView = watch(new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) leave(e.target); });
  }, { threshold: 0 }));
  /* Nothing enters until the opening has handed over. */
  afterIntro(function () {
    heads.concat(fades, reveals).forEach(function (el) { inView.observe(el); outView.observe(el); });
  });

  /* The product pictures rise into place as their section arrives, and sink
     back out of sight once it has gone, so they rise again next time. */
  var stages = Array.prototype.slice.call(document.querySelectorAll('.ph:not(.ph-first)'));
  stages.forEach(function (s) { s.setAttribute('data-stage-ready', ''); });
  var stageIn = watch(new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('is-live'); });
  }, { rootMargin: '0px 0px -18% 0px' }));
  var stageOut = watch(new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) e.target.classList.remove('is-live'); });
  }));
  afterIntro(function () {
    stages.forEach(function (s) { stageIn.observe(s); stageOut.observe(s); });
  });

  var lit = document.querySelector('[data-lit]');
  if (lit) { thesis = { el: lit, words: lit.querySelectorAll('.at-w'), n: -1 }; lightThesis(); }
  progress();

  return teardown;
}
