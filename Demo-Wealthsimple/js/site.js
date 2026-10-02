/* ============================================================================
   LARCH — the page's script
   ----------------------------------------------------------------------------
   The page reads completely without it. This adds:

     · the theme toggle and the pause button (both remembered in this
       browser, if storage is allowed)
     · headline entrances: words rise half an em and fade in as a headline
       comes into view (the big serif lines rise out of a mask); the copy
       around it fades in after; the product pictures rise into place
     · the turning last line of the closing headline
     · the header's swap from wordmark to call to action on a phone, once
       the opener has scrolled away
     · closing the menus after a link is chosen, the opener's form, and the
       copy button for the email address
     · pausing the loops of any section that is off screen, and starting
       them from the top when it comes back
     · every entrance replays each time its section comes back into view
     · small things: a reading-progress hairline on the header, the thesis
       lighting up as you read it, depth under the pointer, and the risk
       legend pointing at its slice
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
    var away = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var s = e.target, was = s.hasAttribute('data-offscreen');
        if (e.isIntersecting) { s.removeAttribute('data-offscreen'); if (was) rewind(s); }
        else s.setAttribute('data-offscreen', '');
      });
    }, { rootMargin: '60px 0px' });
    document.querySelectorAll('.ph, .final, .news, .about').forEach(function (s) {
      s.setAttribute('data-offscreen', '');
      away.observe(s);
    });
  }

  /* ---- reading progress, a hairline along the foot of the header ------- */
  var hdrBar = document.querySelector('.hdr'), ticking = false;
  function progress() {
    ticking = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    if (hdrBar) hdrBar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    lightThesis();
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  addEventListener('resize', progress);
  requestAnimationFrame(progress);

  /* The thesis lights up as you read down it, word by word, the way the
     reference's thesis text does. Set up below once the words exist. */
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
    msg.classList.remove('shown'); void msg.offsetWidth; msg.classList.add('shown');
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
    var done = function (label) {
      copyBtn.textContent = label;
      copyBtn.classList.remove('pop'); void copyBtn.offsetWidth; copyBtn.classList.add('pop');
      setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('pop'); }, 2000);
    };
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
  function wrapWords(from, into, crop) {
    Array.prototype.slice.call(from.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { into.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'at-w'; w.setAttribute('data-s', 'prep'); w.textContent = part;
          if (crop) { var m = document.createElement('span'); m.className = 'at-m'; m.appendChild(w); into.appendChild(m); }
          else into.appendChild(w);
        });
      } else if (node.nodeType === 1) {
        var copy = node.cloneNode(false);
        wrapWords(node, copy, crop);
        into.appendChild(copy);
      }
    });
  }
  function prepare(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var visual = document.createElement('span');
    wrapWords(el, visual, el.getAttribute('data-at') === 'crop');
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

  var heads = Array.prototype.slice.call(document.querySelectorAll('[data-at]'));
  var fades = Array.prototype.slice.call(document.querySelectorAll('[data-at-fade], [data-icon-fade]'));
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  heads.forEach(prepare);
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
  function enter(el) {
    if (el._in) return;
    el._in = true;
    if (el.hasAttribute('data-at')) play(el); else el.classList.add('is-in');
  }
  function leave(el) {
    if (!el._in) return;
    el._in = false;
    if (el.hasAttribute('data-at')) {
      var w = el.querySelectorAll('.at-w');
      for (var i = 0; i < w.length; i++) w[i].setAttribute('data-s', 'prep');
    } else el.classList.remove('is-in');
  }
  var inView = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) enter(e.target); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  var outView = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) leave(e.target); });
  }, { threshold: 0 });
  heads.concat(fades, reveals).forEach(function (el) { inView.observe(el); outView.observe(el); });

  /* The product pictures rise into place as their section arrives, and sink
     back out of sight once it has gone, so they rise again next time. */
  var stages = Array.prototype.slice.call(document.querySelectorAll('.ph:not(.ph-first)'));
  stages.forEach(function (s) { s.setAttribute('data-stage-ready', ''); });
  var stageIn = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('is-live'); });
  }, { rootMargin: '0px 0px -18% 0px' });
  var stageOut = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) e.target.classList.remove('is-live'); });
  });
  stages.forEach(function (s) { stageIn.observe(s); stageOut.observe(s); });

  var lit = document.querySelector('[data-lit]');
  if (lit) { thesis = { el: lit, words: lit.querySelectorAll('.at-w'), n: -1 }; lightThesis(); }
  progress();

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
      });
      s.addEventListener('pointerleave', function () { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(apply); });
    });
  }

  /* ---- the risk legend points at its slice ------------------------------ */
  var donut = document.querySelector('.a-risk');
  if (donut) donut.querySelectorAll('.legend li').forEach(function (li, i) {
    li.addEventListener('pointerenter', function () { donut.setAttribute('data-focus', String(i + 1)); });
    li.addEventListener('pointerleave', function () { donut.removeAttribute('data-focus'); });
  });

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
