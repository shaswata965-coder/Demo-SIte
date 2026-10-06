/* ============================================================================
   DEMO-WEALTHSIMPLE — the other-demos banner
   ----------------------------------------------------------------------------
   Shown by default; the close button hides it and the choice is remembered
   in localStorage. Loaded in <head>, not deferred, so a visitor who has closed
   it never sees it flash in: html.no-banner is set before the body paints.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'larch-banner';
  var root = document.documentElement;

  try {
    if (localStorage.getItem(KEY) === 'hidden') root.classList.add('no-banner');
  } catch (e) { /* blocked — shown, which is the default anyway */ }

  document.addEventListener('DOMContentLoaded', function () {
    var close = document.getElementById('demoBannerClose');
    if (!close) return;

    close.addEventListener('click', function () {
      root.classList.add('no-banner');
      try { localStorage.setItem(KEY, 'hidden'); } catch (e) { /* blocked */ }

      /* Focus was on the button that just went away; hand it to the header. */
      var next = document.querySelector('.hdr a');
      if (next) next.focus({ preventScroll: true });

      /* Once the page has slid into the banner's place, let anything that
         measures the layout remeasure, as on any resize. */
      var dur = parseFloat(getComputedStyle(root).getPropertyValue('--banner-dur')) || 0;
      setTimeout(function () { dispatchEvent(new Event('resize')); }, dur * 1000 + 40);
    });
  });
})();
