/* ============================================================================
   LARCH — the page's script
   ----------------------------------------------------------------------------
   The page reads completely without it. This adds:

     · the theme toggle and the pause button (both remembered in this
       browser, if storage is allowed)
     · headline entrances: words rise half an em and fade in as a headline
       comes into view; the copy around it fades in after
     · the turning last line of the closing headline
     · the header's swap from wordmark to call to action on a phone, once
       the opener has scrolled away
     · closing the menus after a link is chosen, the opener's form, and the
       copy button for the email address
     · pausing the loops of any section that is off screen
   ========================================================================== */

(function () {
  'use strict';
  var root = document.documentElement;
  var still = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* not remembered */ } }

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
  });
  if (system.addEventListener) system.addEventListener('change', syncTheme);
  syncTheme();

  /* ---- pause ------------------------------------------------------------
     One choice for the whole page. scenes.js listens for the same event. */
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
  });
  syncMotion();

  /* ---- sections off screen stop their loops -------------------------- */
  if ('IntersectionObserver' in window) {
    var away = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.removeAttribute('data-offscreen');
        else e.target.setAttribute('data-offscreen', '');
      });
    }, { rootMargin: '120px 0px' });
    document.querySelectorAll('.ph, .final, .news').forEach(function (s) { away.observe(s); });
  }

  /* ---- header -----------------------------------------------------------
     Past the opener, a phone shows the call to action where the wordmark
     was. */
  var hdr = document.getElementById('hdr'), first = document.querySelector('.ph-first');
  if (hdr && first && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (!e.isIntersecting && e.boundingClientRect.top < 0) hdr.setAttribute('data-past', '');
      else hdr.removeAttribute('data-past');
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(first);
  }

  /* ---- menus close once a link is chosen ------------------------------- */
  document.querySelectorAll('[popover] a').forEach(function (a) {
    a.addEventListener('click', function () {
      var pop = a.closest('[popover]');
      if (pop && pop.hidePopover) { try { pop.hidePopover(); } catch (e) { /* already closed */ } }
    });
  });

  /* ---- the opener's form --------------------------------------------------
     A demo: nothing is sent, and the page says so. */
  var form = document.getElementById('leadForm');
  if (form) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var input = document.getElementById('leadEmail'), msg = document.getElementById('leadMsg');
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    input.setAttribute('aria-invalid', String(!ok));
    msg.hidden = false;
    msg.textContent = ok
      ? 'Thanks. This page is a demo, so nothing was sent. To reach the team, write to hello@larch.example.'
      : 'Enter a work email, like name@yourbank.com.';
    if (!ok) input.focus();
  });

  /* ---- copy the email address --------------------------------------- */
  var copyBtn = document.getElementById('copyEmail'), email = document.getElementById('email');
  function selectEmail() {
    var r = document.createRange(); r.selectNodeContents(email);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  if (copyBtn && email) copyBtn.addEventListener('click', function () {
    var done = function (label) { copyBtn.textContent = label; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email.textContent.trim()).then(function () { done('Copied'); }, function () { selectEmail(); done('Selected'); });
    } else { selectEmail(); done('Selected'); }
  });

  /* ---- headline entrances ------------------------------------------------
     Only when the early script allowed them (.at-on): not for reduced
     motion, and not without IntersectionObserver. */
  if (!root.classList.contains('at-on')) return;

  /* Wrap each word in a span that can move, keeping inline elements and the
     spaces between words. Screen readers get the sentence once, whole. */
  function wrapWords(from, into) {
    Array.prototype.slice.call(from.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { into.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'at-w'; w.setAttribute('data-s', 'prep'); w.textContent = part;
          into.appendChild(w);
        });
      } else if (node.nodeType === 1) {
        var copy = node.cloneNode(false);
        wrapWords(node, copy);
        into.appendChild(copy);
      }
    });
  }
  function prepare(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var visual = document.createElement('span');
    wrapWords(el, visual);
    el.textContent = '';
    if (!el.closest('[aria-hidden="true"]')) {
      var sr = document.createElement('span');
      sr.className = 'sr-only'; sr.textContent = text;
      el.appendChild(sr);
      visual.setAttribute('aria-hidden', 'true');
    }
    el.appendChild(visual);
    el.setAttribute('data-at-ready', '');
  }
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
    requestAnimationFrame(function () {
      for (var j = 0; j < words.length; j++) words[j].setAttribute('data-s', 'go');
    });
  }

  var heads = document.querySelectorAll('[data-at]');
  var fades = document.querySelectorAll('[data-at-fade], [data-icon-fade]');
  heads.forEach(prepare);

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

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target.hasAttribute('data-at')) play(e.target);
      else e.target.classList.add('is-in');
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  heads.forEach(function (el) { io.observe(el); });
  fades.forEach(function (el) { io.observe(el); });

  /* ---- the closing headline's last line turns over ------------------- */
  var ending = document.querySelector('[data-endings]');
  if (ending) {
    var words = ending.getAttribute('data-endings').split('|'), k = 0;
    var section = ending.closest('section');
    setInterval(function () {
      if (still.matches || isPaused() || document.hidden || (section && section.hasAttribute('data-offscreen'))) return;
      var cur = ending.querySelector('.ending-word:not(.out)');
      k = (k + 1) % words.length;
      var next = document.createElement('span');
      next.className = 'ending-word in'; next.textContent = words[k];
      if (cur) {
        cur.classList.remove('in'); cur.classList.add('out');
        setTimeout(function () { if (cur.parentNode) cur.parentNode.removeChild(cur); }, 260);
      }
      ending.appendChild(next);
    }, 2600);
  }
})();
