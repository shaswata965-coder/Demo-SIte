/* ============================================================================
   TOTEM DEMO — the other-demos banner
   ----------------------------------------------------------------------------
   A strip above the nav linking the repo's other demos. Shown by default;
   the close button hides it and the choice is remembered in localStorage.

   Loaded in <head>, not deferred, so a visitor who has closed it never sees
   it flash in: html.no-banner is set before the body paints, and that class
   alone zeroes --banner-h, which the nav and the pinned chapters read.

   Kept apart from js/app.js on purpose: if the model fails to build, the
   banner still closes. app.js only learns of the change through a resize
   event, which is already where it remeasures the nav's bottom edge.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'axon-banner';
  var root = document.documentElement;

  try {
    if (localStorage.getItem(KEY) === 'hidden') root.classList.add('no-banner');
  } catch (e) { /* blocked — shown, which is the default anyway */ }

  document.addEventListener('DOMContentLoaded', function () {
    var banner = document.getElementById('demoBanner');
    var close = document.getElementById('demoBannerClose');
    if (!banner || !close) return;

    close.addEventListener('click', function () {
      root.classList.add('no-banner');
      try { localStorage.setItem(KEY, 'hidden'); } catch (e) { /* blocked */ }

      /* Focus was on the button that just went away; hand it to the nav. */
      var brand = document.querySelector('.nav-brand');
      if (brand) brand.focus({ preventScroll: true });

      /* The nav slides up into the banner's place over --banner-dur. Once
         it has settled, tell app.js to remeasure, as on any resize. */
      var dur = parseFloat(getComputedStyle(root).getPropertyValue('--banner-dur')) || 0;
      setTimeout(function () { dispatchEvent(new Event('resize')); }, dur * 1000 + 40);
    });
  });
})();
