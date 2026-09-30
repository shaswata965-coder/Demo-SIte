/* ===========================================================================
   DEMO-CRAFTED — the page around the flight
   ---------------------------------------------------------------------------
   Loader, chrome, the rooms dial, opening a card, the cursor and the theme.
   The flight itself is js/flight.js; the pictures are js/art.js.

   If anything here throws before the flight is running, the .js class comes
   off <html> and the page falls back to its plain stacked layout, which is
   complete on its own. Copy is never left hidden behind a script.
   ========================================================================= */
(function () {
  'use strict';

  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const pad = (n) => String(n).padStart(2, '0');
  let flight = null;

  /* ------------------------------------------------------------- theme */
  const THEME_KEY = 'axon-crafted-theme';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  } catch (_) { /* storage is a convenience only */ }
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches);
  $('theme').addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, root.dataset.theme); } catch (_) { /* ignore */ }
    if (flight) flight.refreshSkins();
  });
  if (systemDark.addEventListener) systemDark.addEventListener('change', () => flight && flight.refreshSkins());

  /* ------------------------------------------------------------- loader */
  const loader = $('loader'), pctEl = $('ldPct'), ldBar = $('ldBar'), enterBtn = $('enter');
  let shown = 0, goal = 0, isReady = false;
  (function tick() {
    shown = Math.min(goal, shown + Math.max(0.6, (goal - shown) * 0.1));
    pctEl.textContent = Math.round(shown) + '%';
    ldBar.style.strokeDashoffset = String(1 - shown / 100);
    if (shown >= 100) { ready(); return; }
    requestAnimationFrame(tick);
  })();

  function ready() {
    if (isReady) return;
    isReady = true;
    pctEl.hidden = true;
    enterBtn.hidden = false;
    $('ldText').textContent = 'READY · PRESS ENTER · THEN SCROLL TO FLY · ';
    const hash = location.hash.slice(1);
    if (hash === 'enter' || (hash && document.getElementById(hash) && document.getElementById(hash).classList.contains('room'))) {
      setTimeout(enter, 350);
    } else {
      enterBtn.focus({ preventScroll: true });
    }
  }

  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    loader.classList.add('gone');
    const vp = $('viewport');
    vp.tabIndex = -1;
    vp.focus({ preventScroll: true });
    const hash = location.hash.slice(1);
    flight.start(hash !== 'enter' ? hash : '');
  }
  enterBtn.addEventListener('click', enter);

  async function boot() {
    const t0 = performance.now();
    goal = 8;
    await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(2500)]);
    goal = 34;
    await nextFrame();
    window.AxonArt.renderAll();
    goal = 64;
    await nextFrame();
    flight = window.AxonFlight;
    flight.init();
    wire();
    goal = 90;
    await wait(Math.max(0, 1200 - (performance.now() - t0)));
    window.__axonReady = true;
    goal = 100;
  }
  boot().catch((err) => {
    console.error('AXON flight could not start; showing the plain page.', err);
    root.classList.remove('js');
  });

  /* ------------------------------------------------------------- chrome */
  function wire() {
    const rooms = flight.rooms;
    const bar = $('bar'), needle = $('dialNeedle'), hint = $('hint');
    const spins = document.querySelectorAll('.b-spin');
    const edge = $('edgeName');
    let startC = null;

    /* Dial ticks: one per room, at the point in the flight where it arrives. */
    const ticks = $('dialTicks');
    ticks.innerHTML = rooms.map((r, i) => {
      const a = -150 + 300 * flight.arrival(i);
      return `<line class="d-tick" data-i="${i}" x1="0" y1="-36" x2="0" y2="-44" transform="rotate(${a.toFixed(1)})"/>`;
    }).join('');

    flight.on('room', (i, r) => {
      $('roomNum').textContent = pad(i + 1);
      $('roomName').textContent = r.name;
      edge.classList.add('swap');
      edge.textContent = r.name;
      void edge.offsetWidth;
      edge.classList.remove('swap');
      ticks.querySelectorAll('.d-tick').forEach((t) => t.classList.toggle('on', +t.dataset.i <= i));
      document.querySelectorAll('.menu button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === r.id)));
    });

    flight.on('frame', (s) => {
      bar.style.transform = `scaleX(${s.progress.toFixed(4)})`;
      needle.setAttribute('transform', `rotate(${(-150 + 300 * s.progress).toFixed(2)})`);
      if (!reduce.matches) spins.forEach((g) => { g.style.transform = `rotate(${(s.c * 0.045).toFixed(2)}deg)`; });
      if (entered) {
        if (startC === null) startC = s.c;
        if (Math.abs(s.c - startC) > 0.5 * s.f) hint.classList.add('gone');
      }
    });

    /* Rooms menu on the dial. */
    const dial = $('dial'), menu = $('menu');
    const setMenu = (open) => { menu.hidden = !open; dial.setAttribute('aria-expanded', String(open)); };
    dial.addEventListener('click', () => setMenu(menu.hidden));
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !e.target.closest('.hud-br')) setMenu(false);
    });

    /* Anything with data-go flies to that room. */
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]');
      if (!go || !entered) return;
      e.preventDefault();
      setMenu(false);
      if (openCard) closeSheet();
      flight.goTo(go.dataset.go);
    });

    /* Cards: tilt toward the pointer while it is over them. */
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (reduce.matches) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--rx', (((e.clientX - r.left) / r.width - 0.5) * 16).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((0.5 - (e.clientY - r.top) / r.height) * 12).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });
    });

    /* Opening a card. */
    document.querySelectorAll('.card[data-open]').forEach((card) => {
      const name = card.querySelector('h3');
      if (name) card.setAttribute('aria-label', 'Open ' + name.textContent);
      card.addEventListener('click', () => openSheet(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(card); }
      });
    });

    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (openCard) closeSheet();
        else if (!menu.hidden) { setMenu(false); dial.focus(); }
      }
      if (!openCard) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
      if (e.key === 'Tab') trapTab(e);
    });

    /* Copy the address; if the clipboard refuses, select it instead. */
    const copy = $('copy');
    copy.addEventListener('click', () => {
      const text = $('addr').textContent;
      const done = (msg) => { copy.textContent = msg; setTimeout(() => { copy.textContent = 'Copy address'; }, 2200); };
      const select = () => {
        const range = document.createRange();
        range.selectNodeContents($('addr'));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        done('Selected, press Ctrl+C');
      };
      try {
        navigator.clipboard.writeText(text).then(() => done('Copied'), select);
      } catch (_) { select(); }
    });

    setupCursor();
  }

  /* ------------------------------------------------------------- sheet */
  const sheet = $('sheet'), sheetCard = $('sheetCard'), sheetBody = $('sheetBody'), sheetBack = $('sheetBack');
  let openCard = null, group = [], returnFocus = null, busy = false;
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';

  const skinOf = (el) => [...el.closest('.room').classList].find((c) => c.startsWith('sk-')) || 'sk-paper';
  function fill(card) {
    sheetBody.innerHTML = card.querySelector('.card-in').innerHTML;
    const h = sheetBody.querySelector('h3');
    if (h) h.id = 'sheetTitle';
    sheetCard.className = 'sheet-card ' + skinOf(card);
    $('sheetCount').textContent = `${group.indexOf(card) + 1} / ${group.length}`;
    const solo = group.length < 2;
    $('prev').hidden = solo; $('next').hidden = solo;
  }

  /* The sheet grows out of the card's place on screen and shrinks back
     into it: measure both boxes, animate the difference. */
  function flip(rect, reverse) {
    const to = sheetCard.getBoundingClientRect();
    const from = `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${rect.width / to.width}, ${rect.height / to.height})`;
    const dur = reduce.matches ? 1 : reverse ? 460 : 640;
    const frames = reverse ? [{ transform: 'none' }, { transform: from }] : [{ transform: from }, { transform: 'none' }];
    const a = sheetCard.animate(frames, { duration: dur, easing: EASE, fill: 'both' });
    sheetBack.animate(reverse ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: dur, fill: 'both' });
    sheetBody.animate(reverse ? [{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: dur, fill: 'both' });
    return a.finished;
  }

  async function openSheet(card) {
    if (openCard || busy || flight.moved) return;
    busy = true;
    openCard = card;
    returnFocus = document.activeElement;
    group = [...card.closest('.room').querySelectorAll('.card[data-open]')];
    flight.lock(true);
    fill(card);
    const rect = card.querySelector('.card-in').getBoundingClientRect();
    sheet.hidden = false;
    card.classList.add('lifted');
    root.classList.add('sheet-open');
    $('close').focus({ preventScroll: true });
    await flip(rect, false);
    busy = false;
  }

  async function closeSheet() {
    if (!openCard || busy) return;
    busy = true;
    const card = openCard;
    const rect = card.querySelector('.card-in').getBoundingClientRect();
    await flip(rect, true);
    [sheetCard, sheetBack, sheetBody].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    sheet.hidden = true;
    card.classList.remove('lifted');
    root.classList.remove('sheet-open');
    openCard = null;
    busy = false;
    flight.lock(false);
    (card || returnFocus).focus({ preventScroll: true });
  }

  function page(dir) {
    if (!openCard || busy || group.length < 2) return;
    const next = group[(group.indexOf(openCard) + dir + group.length) % group.length];
    openCard.classList.remove('lifted');
    openCard = next;
    next.classList.add('lifted');
    flight.bring(next);
    const shift = reduce.matches ? 0 : 28;
    sheetBody.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * shift}px)` }], { duration: 160, fill: 'forwards' })
      .finished.then(() => {
        fill(next);
        sheetBody.animate([{ opacity: 0, transform: `translateX(${dir * shift}px)` }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE, fill: 'forwards' });
      });
  }

  function trapTab(e) {
    const focusable = [...sheetCard.querySelectorAll('button:not([hidden]), a[href]')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  $('close').addEventListener('click', closeSheet);
  sheetBack.addEventListener('click', closeSheet);
  $('prev').addEventListener('click', () => page(-1));
  $('next').addEventListener('click', () => page(1));

  /* ------------------------------------------------------------- cursor
     A dot on the pointer and a ring that trails it. The state names what a
     click does here: open a card, follow a link, close the sheet, or fly. */
  function setupCursor() {
    if (!matchMedia('(pointer: fine)').matches) return;
    root.classList.add('has-cursor');
    const cur = $('cursor'), ring = cur.querySelector('.c-ring'), dot = cur.querySelector('.c-dot'), lab = $('cLabel');
    let mx = -200, my = -200, rx = -200, ry = -200, state = null, target = null;
    const stateFor = (t) => {
      if (!t || !t.closest) return '';
      if (root.classList.contains('dragging')) return 'drag';
      if (openCard) return t.closest('.sheet-back') ? 'close' : t.closest('a, button') ? 'link' : '';
      if (t.closest('.card[data-open]')) return 'view';
      if (t.closest('a, button, .cluster li, .addr')) return 'link';
      return '';
    };
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; target = e.target; cur.style.opacity = '1'; }, { passive: true });
    document.addEventListener('mouseleave', () => { cur.style.opacity = '0'; });
    (function loop() {
      const s = stateFor(target);
      if (s !== state) {
        state = s;
        cur.dataset.state = s;
        lab.textContent = s === 'view' ? 'Open' : s === 'close' ? 'Close' : '';
      }
      const k = reduce.matches ? 1 : 0.2;
      rx += (mx - rx) * k; ry += (my - ry) * k;
      ring.style.translate = `${rx.toFixed(1)}px ${ry.toFixed(1)}px`;
      lab.style.translate = `${rx.toFixed(1)}px ${ry.toFixed(1)}px`;
      dot.style.translate = `${mx}px ${my}px`;
      requestAnimationFrame(loop);
    })();
  }
})();
