/* ============================================================================
   LARCH — the little script the page has
   ----------------------------------------------------------------------------
   The page is complete without it. This adds three conveniences:

     · the theme toggle (remembered in this browser, if storage is allowed)
     · one tooltip for every chart mark that carries data-tip
     · a hairline under the header once the page has scrolled, and a copy
       button for the email address
   ========================================================================== */

(function () {
  'use strict';
  var root = document.documentElement;

  /* ---- theme ------------------------------------------------------------ */
  var KEY = 'larch-theme', btn = document.getElementById('themeBtn');
  var system = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) { /* storage blocked: follow the system */ }
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : system.matches;
  }
  function sync() {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isDark()));
    btn.title = isDark() ? 'Switch to light' : 'Switch to dark';
  }
  if (btn) {
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* not remembered */ }
      sync();
    });
  }
  if (system.addEventListener) system.addEventListener('change', sync);
  sync();

  /* ---- tooltip ------------------------------------------------------------
     Marks carry their own text in data-tip, written by tools/draw-assets.mjs
     as "value|label" — the value leads. Set with textContent, never as HTML. */
  var tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'status');
  document.body.appendChild(tip);
  var current = null;

  function show(el, x, y) {
    var parts = (el.getAttribute('data-tip') || '').split('|');
    tip.textContent = '';
    var b = document.createElement('b');
    b.textContent = parts[0];
    tip.appendChild(b);
    if (parts[1]) tip.appendChild(document.createTextNode(' ' + parts[1]));
    var r = tip.getBoundingClientRect();
    var left = Math.min(innerWidth - r.width - 8, Math.max(8, x + 14));
    var top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.classList.add('on');
    current = el;
  }
  function hide() { tip.classList.remove('on'); current = null; }

  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el && e.pointerType !== 'touch') show(el, e.clientX, e.clientY);
    else if (current) hide();
  }, { passive: true });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!el) return;
    var r = el.getBoundingClientRect();
    show(el, r.left + r.width / 2, r.top);
  });
  document.addEventListener('focusout', hide);
  addEventListener('scroll', function () { if (current) hide(); }, { passive: true });

  /* ---- header hairline ------------------------------------------------------ */
  var head = document.querySelector('.site-head');
  function onScroll() { if (head) head.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- the menu closes when a link in it is followed ---------------------- */
  var menu = document.querySelector('.menu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.removeAttribute('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.removeAttribute('open'); });
  }

  /* ---- copy the address ---------------------------------------------------- */
  var copy = document.getElementById('copyEmail');
  if (copy) {
    copy.addEventListener('click', function () {
      var text = copy.getAttribute('data-copy');
      function done() { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy address'; }, 1800); }
      function select() {
        var el = document.getElementById('email');
        var range = document.createRange(); range.selectNodeContents(el);
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        copy.textContent = 'Selected, press copy';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, select);
      else select();
    });
  }
}());
