/* ===========================================================================
   DEMO-CRAFTED — generated artwork
   ---------------------------------------------------------------------------
   Every image on the page is drawn here as inline SVG: the badge, the four
   service diagrams, the method track, three project thumbnails, four
   portraits and twelve partner glyphs. Inline because an embedded page may
   not load images from anywhere else, and because the shapes name a colour
   ROLE (.fa accent, .fc structure, .fd data, .fs signal, .fi ink) which the
   nearest skin resolves, so every picture is right in every room and theme.

   Each picture is about its own subject rather than generic texture, and
   seeded, so it draws the same way on every load.
   ========================================================================= */
(function () {
  'use strict';

  const r1 = (n) => Math.round(n * 10) / 10;
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const svg = (vb, body) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" focusable="false">${body}</svg>`;
  const label = (x, y, s, cls = 'fi', anchor = 'start', op = 0.7) =>
    `<text x="${x}" y="${y}" class="${cls}" font-size="9" letter-spacing=".08em" text-anchor="${anchor}" opacity="${op}">${s}</text>`;

  let uid = 0;

  /* The badge: a feed-forward net seen end-on, inside a ring of type. The
     type ring (.b-spin) is turned by the flight, so it rotates as you move. */
  function badge(el) {
    const id = 'bp' + (++uid);
    const ringOnly = el.dataset.variant === 'ring';
    const rings = [[0, 1], [30, 6], [56, 10], [82, 14]];
    const nodes = rings.map(([r, n], ri) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2 + ri * 0.17;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r, a, ri };
      }));
    let edges = '';
    for (let ri = 1; ri < nodes.length; ri++) {
      for (const p of nodes[ri]) {
        const inner = nodes[ri - 1].slice().sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y)).slice(0, ri === 1 ? 1 : 2);
        for (const q of inner) edges += `M${r1(p.x)} ${r1(p.y)}L${r1(q.x)} ${r1(q.y)}`;
      }
    }
    const hue = ['fa', 'fc', 'fd', 'fs'];
    const dots = nodes.flat().map((p) => `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${p.ri === 0 ? 7 : 4.2 - p.ri * 0.5}" class="${hue[p.ri]}"/>`).join('');
    const o = nodes[3][4], m = nodes[2][3], n = nodes[1][2];
    const lit = `M${r1(o.x)} ${r1(o.y)}L${r1(m.x)} ${r1(m.y)}L${r1(n.x)} ${r1(n.y)}L0 0`;
    let ticks = '';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, l = i % 6 === 0 ? 7 : 3;
      ticks += `M${r1(Math.cos(a) * 94)} ${r1(Math.sin(a) * 94)}L${r1(Math.cos(a) * (94 - l))} ${r1(Math.sin(a) * (94 - l))}`;
    }
    return svg('-130 -130 260 260',
      `<defs><path id="${id}" d="M 0 -108 a 108 108 0 1 1 -0.01 0"/></defs>` +
      `<circle r="122" class="fx si" stroke-width=".8" opacity=".3"/>` +
      `<path d="${ticks}" class="si" stroke-width="1" opacity=".45"/>` +
      `<g class="b-spin"><text class="fi" font-size="11.5" letter-spacing=".2em"><textPath href="#${id}" textLength="672" lengthAdjust="spacing">AXON · SAME MODEL · HALF THE BILL · MEASURED AGAINST YOUR P99 · </textPath></text></g>` +
      (ringOnly
        /* The closing ring: no net inside, so the call to action sits in a
           clear field; the outer ring of units stays as its frame. */
        ? nodes[3].map((p, i) => `<circle cx="${r1(p.x * 1.08)}" cy="${r1(p.y * 1.08)}" r="2.6" class="${hue[i % 4]}"/>`).join('')
        : `<path d="${edges}" class="si" stroke-width=".8" opacity=".3"/>` +
          `<path d="${lit}" class="sa fx" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="${lit}" class="ss fx b-pulse" stroke-width="3.4" stroke-linecap="round" pathLength="100" stroke-dasharray="7 93"/>` +
          dots));
  }

  /* Inference audit: a live trace with the p99 line and a scan window. */
  function audit() {
    const rnd = seeded(11);
    let d = '';
    for (let x = 8; x <= 312; x += 3) {
      const env = 0.5 + 0.5 * Math.sin(x * 0.018 + 1.2);
      const y = 92 - Math.abs(Math.sin(x * 0.11) * 30 * env) - rnd() * 16 * env - (x > 196 && x < 214 ? 26 : 0);
      d += (x === 8 ? 'M' : 'L') + x + ' ' + r1(y);
    }
    return svg('0 0 320 160',
      `<rect x="186" y="10" width="40" height="126" rx="4" class="fc" opacity=".14"/>` +
      `<rect x="186" y="10" width="40" height="126" rx="4" class="fx sc" stroke-dasharray="3 3"/>` +
      `<path d="M8 44H312" class="sa" stroke-dasharray="4 4" stroke-width="1.2"/>` + label(10, 38, 'P99', 'fa', 'start', 1) +
      `<path d="M8 96H312" class="si" opacity=".25"/>` +
      `<path d="${d}" class="fx sd" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<circle cx="205" cy="41" r="4.5" class="fs"/>` +
      label(10, 150, 'TRACE · GPU 0') + label(310, 150, 'SPAN 2 WK', 'fi', 'end'));
  }

  /* Model compression: the same weights at 16, 8 and 4 bits. */
  function compress() {
    const rows = [['FP16', 16, 'fc'], ['FP8', 8, 'fd'], ['INT4', 4, 'fa']];
    let b = '';
    rows.forEach(([name, n, cls], i) => {
      const y = 22 + i * 44;
      b += label(12, y + 15, name, 'fi', 'start', .8);
      for (let c = 0; c < n; c++) b += `<rect x="${58 + c * 15}" y="${y}" width="12" height="22" rx="2.5" class="${cls}" opacity="${0.55 + 0.45 * (c / n)}"/>`;
    });
    return svg('0 0 320 160', b + label(310, 124, '¼ THE BYTES', 'fa', 'end', 1) + `<path d="M58 150H298" class="si" opacity=".25"/>`);
  }

  /* Serving: four GPU lanes packed by continuous batching; queued work
     past the now line. */
  function serve() {
    const rnd = seeded(7), hue = ['fc', 'fd', 'fs', 'fa'];
    let b = '';
    for (let l = 0; l < 4; l++) {
      const y = 18 + l * 32;
      b += label(10, y + 14, 'GPU' + l, 'fi', 'start', .6);
      let x = 46;
      while (x < 308) {
        const w = Math.min(308 - x, 14 + Math.floor(rnd() * 46));
        b += `<rect x="${x}" y="${y}" width="${w}" height="20" rx="3" class="${hue[Math.floor(rnd() * 4)]}" opacity="${x > 236 ? .3 : .85}"/>`;
        x += w + 3;
      }
    }
    return svg('0 0 320 160', b + `<path d="M236 10V146" class="si" stroke-dasharray="3 3" opacity=".7"/>` + label(240, 156, 'NOW', 'fi', 'start', .8));
  }

  /* Capacity: provisioned for a peak the load never reaches. */
  function capacity() {
    let b = '';
    for (let i = 0; i < 18; i++) {
      const h = 34 + 46 * (0.5 + 0.5 * Math.sin((i / 18) * Math.PI * 2 - 1.4)) + (i % 3) * 4;
      b += `<rect x="${24 + i * 16}" y="${r1(140 - h)}" width="11" height="${r1(h)}" rx="2" class="fd"/>`;
    }
    return svg('0 0 320 160',
      `<rect x="20" y="24" width="290" height="116" class="fs" opacity=".08"/>` +
      `<path d="M20 24H310" class="ss" stroke-width="1.6" stroke-dasharray="5 4"/>` + label(22, 18, 'PROVISIONED', 'fs', 'start', 1) +
      b + `<path d="M20 140H310" class="si" opacity=".35"/>` + label(310, 154, '24 H', 'fi', 'end'));
  }

  /* Method: where this week sits in the four. */
  function weeks(el) {
    const w = +el.dataset.week || 1;
    let b = '';
    for (let i = 1; i <= 4; i++) {
      const x = 10 + (i - 1) * 76;
      const cls = i === w ? 'fa' : 'fi';
      b += `<rect x="${x}" y="14" width="70" height="12" rx="6" class="${cls}" opacity="${i === w ? 1 : i < w ? .35 : .12}"/>`;
      b += label(x, 46, 'WK ' + i, i === w ? 'fa' : 'fi', 'start', i === w ? 1 : .55);
    }
    return svg('0 0 320 58', b);
  }

  /* Distillation: a sparse 70B cloud collapsing into a dense 8B one, with
     the router's thin line back to the big model. */
  function distill() {
    const rnd = seeded(3);
    let b = '';
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 66;
      b += `<circle cx="${r1(92 + Math.cos(a) * r)}" cy="${r1(96 + Math.sin(a) * r)}" r="2.3" class="fc" opacity=".6"/>`;
    }
    for (let i = 0; i < 7; i++) {
      const y = 50 + i * 15;
      b += `<path d="M150 ${y}C 190 ${y}, 200 96, 226 96" class="fx sd" opacity=".35"/>`;
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 20;
      b += `<circle cx="${r1(252 + Math.cos(a) * r)}" cy="${r1(96 + Math.sin(a) * r)}" r="2.8" class="fa"/>`;
    }
    b += `<path d="M252 70C 252 30, 150 20, 120 34" class="fx ss" stroke-dasharray="3 3" stroke-width="1.3"/>` + label(186, 24, 'ROUTER · 4%', 'fs', 'middle', 1);
    return svg('0 0 320 200', b + label(92, 186, '70B', 'fi', 'middle', .8) + label(252, 186, '8B', 'fa', 'middle', 1));
  }

  /* Latency: the old distribution ghosted, the new one sharp, p95 marked. */
  function ttft() {
    const X = (s) => r1(16 + s * 96);
    let b = '';
    for (let i = 0; i < 28; i++) {
      const s = 0.05 + i * 0.1;
      const old = 90 * Math.exp(-((s - 1.9) ** 2) / 0.22);
      const now = 128 * Math.exp(-((s - 0.42) ** 2) / 0.028);
      if (old > 2) b += `<rect x="${X(s)}" y="${r1(168 - old)}" width="8" height="${r1(old)}" class="fi" opacity=".14"/>`;
      if (now > 2) b += `<rect x="${X(s)}" y="${r1(168 - now)}" width="8" height="${r1(now)}" class="fd"/>`;
    }
    b += `<path d="M${X(0.64)} 20V168" class="ss" stroke-width="1.8"/>` + label(+X(0.64) + 5, 28, 'P95 640 MS', 'fs', 'start', 1);
    b += `<path d="M${X(2.4)} 50V168" class="si" stroke-dasharray="3 3" opacity=".5"/>` + label(+X(2.4) - 4, 58, 'WAS 2.4 S', 'fi', 'end', .7);
    b += `<path d="M16 168H304" class="si" opacity=".4"/>`;
    for (let s = 0; s <= 3; s++) b += label(X(s), 184, s + ' S', 'fi', 'middle', .55);
    return svg('0 0 320 200', b);
  }

  /* Fleet: 42 GPUs, of which the rebuilt job needs 12. */
  function fleet() {
    let b = '';
    for (let i = 0; i < 42; i++) {
      const c = i % 7, r = Math.floor(i / 7), on = c < 4 && r < 3;
      const x = 48 + c * 32, y = 14 + r * 27;
      b += on ? `<rect x="${x}" y="${y}" width="26" height="21" rx="4" class="fa"/>`
              : `<rect x="${x + .5}" y="${y + .5}" width="25" height="20" rx="4" class="fx si" opacity=".3"/>`;
    }
    return svg('0 0 320 200', b + label(48, 190, '42 → 12 GPUS', 'fa', 'start', 1) + label(272, 190, 'PREEMPTIBLE', 'fi', 'end', .6));
  }

  /* Portraits. Four stand-ins that differ in skin tone, build, hair, tilt
     and halo, so four people read as four people. Generated, not photos. */
  const PEOPLE = [
    { tone: '#EFC7A6', shade: '#D9A987', hair: '#7A5230', style: 'long', tilt: -4, build: 62, shirt: 'fc', halo: 1 },
    { tone: '#6A4128', shade: '#57331F', hair: '#17110E', style: 'crop', tilt: 3, build: 76, shirt: 'fd', halo: 2, beard: .92 },
    { tone: '#E8BF97', shade: '#CFA27A', hair: '#1B1A1F', style: 'bob', tilt: 2, build: 56, shirt: 'fa', halo: 3, glasses: true },
    { tone: '#D6A07B', shade: '#BD8662', hair: '#4E3322', style: 'part', tilt: -2, build: 66, shirt: 'fs', halo: 4, beard: .38 },
  ];
  const HAIR_BACK = {
    long: 'M60 88C58 38 142 38 140 88L144 154C130 162 70 162 56 154Z',
    bob: 'M63 86C61 42 139 42 137 86L139 126C120 133 80 133 61 126Z',
  };
  const HAIR_FRONT = {
    long: 'M68 86C68 50 96 42 114 48C130 54 134 70 132 88C122 70 102 62 86 66C78 70 72 78 68 86Z',
    crop: 'M69 82C68 50 132 50 131 82C125 66 75 66 69 82Z',
    bob: 'M67 86C64 48 136 48 133 86C131 76 125 70 118 70L82 70C75 70 69 76 67 86Z',
    part: 'M69 84C66 52 96 44 118 50C131 55 135 68 131 82C122 66 104 61 95 63C84 64 75 71 69 84Z',
  };
  function portrait(el) {
    const p = PEOPLE[+el.dataset.who || 0], s = p.build;
    const halos = [
      '',
      `<circle cx="100" cy="100" r="92" class="fx sa" stroke-width="1.6"/>`,
      `<circle cx="100" cy="100" r="92" class="fx sd" stroke-width="1.4"/><circle cx="100" cy="100" r="86" class="fx sd" stroke-width=".8" opacity=".6"/>`,
      `<circle cx="100" cy="100" r="91" class="fx sa" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>`,
      `<path d="M30 70A74 74 0 0 1 90 26M170 130A74 74 0 0 1 112 174M142 36A74 74 0 0 1 172 80" class="fx ss" stroke-width="2" stroke-linecap="round"/>`,
    ][p.halo];
    const beard = p.beard ? `<path d="M71 94C73 124 90 130 100 130C110 130 127 124 129 94C122 110 112 115 100 115C88 115 78 110 71 94Z" fill="${p.hair}" opacity="${p.beard}"/>` : '';
    const glasses = p.glasses ? `<g fill="none" stroke="#1B1A1F" stroke-width="1.8"><circle cx="88" cy="90" r="9"/><circle cx="112" cy="90" r="9"/><path d="M97 90H103"/></g>` : '';
    return svg('0 0 200 200',
      `<circle cx="100" cy="100" r="96" class="fw"/>` + halos +
      `<clipPath id="pc${++uid}"><circle cx="100" cy="100" r="96"/></clipPath><g clip-path="url(#pc${uid})">` +
      `<path d="M${100 - s} 206C${100 - s} 156 ${100 - s * .45} 144 100 144C${100 + s * .45} 144 ${100 + s} 156 ${100 + s} 206Z" class="${p.shirt}"/>` +
      `<rect x="88" y="112" width="24" height="36" rx="9" fill="${p.shade}"/>` +
      `<g transform="rotate(${p.tilt} 100 92)">` +
      (HAIR_BACK[p.style] ? `<path d="${HAIR_BACK[p.style]}" fill="${p.hair}"/>` : '') +
      `<circle cx="69" cy="92" r="7" fill="${p.shade}"/><circle cx="131" cy="92" r="7" fill="${p.shade}"/>` +
      `<ellipse cx="100" cy="88" rx="31" ry="37" fill="${p.tone}"/>` + beard +
      `<path d="${HAIR_FRONT[p.style]}" fill="${p.hair}"/>` +
      `<path d="M83 80L93 79M107 79L117 80" stroke="${p.hair}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<ellipse cx="88" cy="90" rx="3" ry="3.6" fill="#1A1410"/><ellipse cx="112" cy="90" rx="3" ry="3.6" fill="#1A1410"/>` +
      `<path d="M100 93Q97 102 101 104" fill="none" stroke="${p.shade}" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M92 111Q100 116 108 111" fill="none" stroke="#5A2E22" stroke-width="2" stroke-linecap="round" opacity=".7"/>` +
      glasses + `</g></g>`);
  }

  /* Levers: the typical cut on the spend each lever touches. Illustrative,
     and labelled as such on the card. */
  function levers() {
    const rows = [['QUANTISE', 38, 'fc'], ['BATCH', 27, 'fd'], ['ROUTE', 21, 'fs'], ['RIGHT-SIZE', 30, 'fa']];
    let b = '';
    rows.forEach(([n, v, cls], i) => {
      const y = 14 + i * 32, w = (v / 50) * 170;
      b += label(8, y + 13, n, 'fi', 'start', .75);
      b += `<rect x="92" y="${y}" width="170" height="18" rx="3" class="fi" opacity=".07"/>`;
      b += `<rect x="92" y="${y}" width="${r1(w)}" height="18" rx="3" class="${cls}"/>`;
      b += label(r1(98 + w), y + 13, '−' + v + '%', 'fi', 'start', 1);
    });
    for (const t of [0, 25, 50]) b += `<path d="M${92 + (t / 50) * 170} 10V142" class="si" opacity=".18" stroke-dasharray="2 3"/>`;
    return svg('0 0 320 150', b);
  }

  /* The four weeks as a plan: overlapping phases, a milestone at each end. */
  function gantt() {
    const rows = [['MEASURE', 0, 1.15, 'fa'], ['MODEL', 0.8, 2.2, 'fc'], ['REBUILD', 1.8, 3.2, 'fd'], ['PROVE', 2.6, 4, 'fs']];
    const X = (w) => r1(76 + w * 58);
    let b = '';
    for (let w = 0; w <= 4; w++) b += `<path d="M${X(w)} 20V146" class="si" opacity=".15"/>`;
    for (let w = 0; w < 4; w++) b += label(+X(w) + 29, 14, 'WK' + (w + 1), 'fi', 'middle', .6);
    rows.forEach(([n, a, z, cls], i) => {
      const y = 30 + i * 29;
      b += label(8, y + 12, n, 'fi', 'start', .75);
      b += `<rect x="${X(a)}" y="${y}" width="${r1(+X(z) - +X(a))}" height="16" rx="8" class="${cls}"/>`;
      b += `<rect x="${+X(z) - 4}" y="${y + 4}" width="8" height="8" transform="rotate(45 ${X(z)} ${y + 8})" class="fi"/>`;
    });
    return svg('0 0 320 150', b);
  }

  /* Partner glyphs: neutral geometry, deliberately nobody's logo. */
  const GLYPHS = [
    '<circle cx="8" cy="8" r="6.5" class="fa"/>',
    '<circle cx="8" cy="8" r="5.5" class="fx sc" stroke-width="2.4"/>',
    '<path d="M8 1.5L14.5 14H1.5Z" class="fd"/>',
    '<rect x="3" y="3" width="10" height="10" rx="1.5" transform="rotate(45 8 8)" class="fs"/>',
    '<path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5Z" class="fc"/>',
    '<rect x="2" y="2" width="12" height="3" rx="1" class="fd"/><rect x="2" y="6.5" width="9" height="3" rx="1" class="fd"/><rect x="2" y="11" width="6" height="3" rx="1" class="fd"/>',
    '<path d="M6 1.5H10V6H14.5V10H10V14.5H6V10H1.5V6H6Z" class="fa"/>',
    '<circle cx="6" cy="8" r="5" class="fc" opacity=".8"/><circle cx="10" cy="8" r="5" class="fs" opacity=".8"/>',
    '<path d="M1.5 11A6.5 6.5 0 0 1 14.5 11Z" class="fd"/><rect x="1.5" y="12.5" width="13" height="2" class="fd"/>',
    '<path d="M2 4L8 10L14 4" class="fx sa" stroke-width="2.6" stroke-linejoin="round"/><path d="M2 9L8 15L14 9" class="fx sa" stroke-width="2.6" opacity=".5"/>',
    '<g class="fs"><circle cx="3.5" cy="3.5" r="1.8"/><circle cx="8" cy="3.5" r="1.8"/><circle cx="12.5" cy="3.5" r="1.8"/><circle cx="3.5" cy="8" r="1.8"/><circle cx="8" cy="8" r="1.8"/><circle cx="12.5" cy="8" r="1.8"/><circle cx="3.5" cy="12.5" r="1.8"/><circle cx="8" cy="12.5" r="1.8"/><circle cx="12.5" cy="12.5" r="1.8"/></g>',
    '<rect x="3.5" y="3.5" width="9" height="9" transform="rotate(45 8 8)" class="fx sd" stroke-width="2.2"/>',
  ];
  const glyph = (el) => svg('0 0 16 16', GLYPHS[+el.dataset.g % GLYPHS.length]);

  const MAKERS = { badge, audit, compress, serve, capacity, weeks, distill, ttft, fleet, portrait, glyph, levers, gantt };

  window.AxonArt = {
    /* Draw every [data-art] element; returns how many were drawn. */
    renderAll(root = document) {
      const els = root.querySelectorAll('[data-art]');
      els.forEach((el) => {
        const make = MAKERS[el.dataset.art];
        if (make) el.innerHTML = make(el);
      });
      return els.length;
    },
  };
})();
