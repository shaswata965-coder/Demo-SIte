/* Draw the data assets into index.html.

   Every chart, the fraud network and the heat map on the page are computed
   here from data, so marks, ticks and labels share one scale and a number in
   the copy is the number in the picture. The output is static SVG pasted
   between markers in index.html:

     <!-- draw:name --> … <!-- /draw:name -->

   Each chart is drawn twice — a wide drawing and a compact one with fewer
   ticks and shorter labels — and css/main.css shows whichever fits the panel
   (a container query). Each carries its numbers as a table behind a "Data"
   disclosure, and its marks carry hover text in data-tip ("value|label").

   Mark specs follow the dataviz rules: bars at most 24px thick with a 4px
   rounded data end and a square base, 2px lines, 8px dots with a 2px ring in
   the panel colour, solid hairline grids, text in ink tokens only.

     node tools/draw-assets.mjs
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../index.html');
let html = readFileSync(file, 'utf8');

/* ---- helpers ------------------------------------------------------------ */
const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lin = (d0, d1, r0, r1_) => (v) => r0 + (v - d0) / (d1 - d0) * (r1_ - r0);
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const minus = (s) => String(s).replace(/^-/, '−');
const signed = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function inject(name, markup) {
  const re = new RegExp(`(<!-- draw:${name} -->)[\\s\\S]*?(\\s*<!-- /draw:${name} -->)`);
  if (!re.test(html)) throw new Error('missing marker ' + name);
  /* A function, not a string: the markup is full of dollar amounts, and "$'"
     in a replacement string means "everything after the match". */
  html = html.replace(re, (_, open, close) => `${open}\n${markup}${close}`);
}
const svg = (cls, w, h, label, inner) =>
  `<svg class="${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
const text = (x, y, s, cls = 'ax', anchor = 'start', extra = '') =>
  `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}"${extra}>${esc(s)}</text>`;
const line = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
const pathOf = (pts) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join('L');

/* A column from baseline y0 up (or down) to y1, rounded 4px at the data end. */
function col(x, w, y0, y1, cls, tip) {
  const h = Math.abs(y1 - y0), r = Math.min(4, h, w / 2), up = y1 < y0;
  const d = up
    ? `M${r1(x)} ${r1(y0)}V${r1(y1 + r)}Q${r1(x)} ${r1(y1)} ${r1(x + r)} ${r1(y1)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y1)} ${r1(x + w)} ${r1(y1 + r)}V${r1(y0)}Z`
    : `M${r1(x)} ${r1(y0)}V${r1(y1 - r)}Q${r1(x)} ${r1(y1)} ${r1(x + r)} ${r1(y1)}H${r1(x + w - r)}Q${r1(x + w)} ${r1(y1)} ${r1(x + w)} ${r1(y1 - r)}V${r1(y0)}Z`;
  return `<path class="${cls}" d="${d}"${tip ? ` data-tip="${esc(tip)}"` : ''}/>`;
}
/* A bar from x0 to x1 (either direction), rounded 4px at the x1 end. */
function bar(x0, x1, y, h, cls, tip) {
  const w = Math.abs(x1 - x0), r = Math.min(4, w, h / 2);
  const d = x1 >= x0
    ? `M${r1(x0)} ${r1(y)}H${r1(x1 - r)}Q${r1(x1)} ${r1(y)} ${r1(x1)} ${r1(y + r)}V${r1(y + h - r)}Q${r1(x1)} ${r1(y + h)} ${r1(x1 - r)} ${r1(y + h)}H${r1(x0)}Z`
    : `M${r1(x0)} ${r1(y)}H${r1(x1 + r)}Q${r1(x1)} ${r1(y)} ${r1(x1)} ${r1(y + r)}V${r1(y + h - r)}Q${r1(x1)} ${r1(y + h)} ${r1(x1 + r)} ${r1(y + h)}H${r1(x0)}Z`;
  return `<path class="${cls}" d="${d}"${tip ? ` data-tip="${esc(tip)}"` : ''}/>`;
}
const dot = (x, y, cls, tip) => `<circle class="dot ${cls}" cx="${r1(x)}" cy="${r1(y)}" r="4"${tip ? ` data-tip="${esc(tip)}"` : ''}/>`;
/* A transparent hit band, bigger than the mark, with a soft highlight behind
   it that shows on hover. */
const hit = (x, y, w, h, tip) =>
  `<rect class="hit" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" data-tip="${esc(tip)}"/><rect class="hl" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="4"/>`;

function table(headers, rows, numFrom = 1) {
  const th = headers.map((h, i) => `<th${i >= numFrom ? ' class="num"' : ''}>${esc(h)}</th>`).join('');
  const tr = rows.map((r) => '<tr>' + r.map((c, i) => `<td${i >= numFrom ? ' class="num"' : ''}>${esc(c)}</td>`).join('') + '</tr>').join('');
  return `<details class="data"><summary>Data</summary><div class="tbl-wrap"><table class="tbl compact"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div></details>`;
}
const box = (wide, narrow, tbl = '') => `<div class="chart-box">${wide}${narrow}</div>${tbl}`;

/* ======================================================================== */
/* 1. Hero — applications and approvals, last 30 days                        */
/* ======================================================================== */
{
  /* Thirty days to Tuesday 29 September 2026; today is the last point, and
     the console's KPIs (18,402 decisions, 64.8% approved, +6.1% on last
     Tuesday) are read straight off it. */
  const R = rng(41), days = [];
  const end = new Date(Date.UTC(2026, 8, 29));
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end); d.setUTCDate(end.getUTCDate() - i);
    const wd = d.getUTCDay(), weekend = wd === 0 || wd === 6;
    let apps = (16900 + (29 - i) * 34 + (R() - 0.5) * 900) * (weekend ? 0.6 : 1);
    let rate = 0.628 + (29 - i) * 0.0006 + (R() - 0.5) * 0.01;
    days.push({ d, apps, rate });
  }
  days[29].apps = 18402; days[29].rate = 0.648;
  days[22].apps = 18402 / 1.061;
  days.forEach((p) => { p.appr = p.apps * p.rate; });
  const label = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const wlabel = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

  function draw(W, H, narrow) {
    const L = 40, Rr = narrow ? 44 : 52, T = 10, B = 24;
    const x = lin(0, 29, L, W - Rr), y = lin(0, 20000, H - B, T);
    let g = '';
    for (const v of [0, 5000, 10000, 15000, 20000]) {
      if (narrow && (v === 5000 || v === 15000)) continue;
      g += line(L, y(v), W - Rr, y(v), v === 0 ? 'baseline' : 'gridline') + text(L - 8, y(v) + 4, v ? v / 1000 + 'k' : '0', 'ax', 'end');
    }
    days.forEach((p, i) => {
      if (p.d.getUTCDay() === 1 && (!narrow || i % 14 < 7)) g += text(x(i), H - 6, label(p.d), 'ax', 'middle');
    });
    const step = (W - Rr - L) / 29;
    days.forEach((p, i) => { g += hit(x(i) - step / 2, T, step, H - B - T, `${fmtInt(p.apps)} applications, ${fmtInt(p.appr)} approved|${wlabel(p.d)}`); });
    g += `<path class="ln s1" d="${pathOf(days.map((p, i) => [x(i), y(p.apps)]))}"/>`;
    g += `<path class="ln s2" d="${pathOf(days.map((p, i) => [x(i), y(p.appr)]))}"/>`;
    const last = days[29];
    g += dot(x(29), y(last.apps), 'f-s1') + dot(x(29), y(last.appr), 'f-s2');
    g += text(x(29) + 8, y(last.apps) + 4, (last.apps / 1000).toFixed(1) + 'k', 'lbl');
    g += text(x(29) + 8, y(last.appr) + 4, (last.appr / 1000).toFixed(1) + 'k', 'lbl');
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'Daily credit applications and approvals over the last 30 days. Applications rose from about 17,000 to 18,402 on weekdays; approvals track at about 64 percent.', g);
  }
  inject('hero-trend', box(draw(620, 190, false), draw(340, 180, true),
    table(['Day', 'Applications', 'Approved', 'Approval rate'], days.map((p) => [wlabel(p.d), fmtInt(p.apps), fmtInt(p.appr), (p.rate * 100).toFixed(1) + '%']))));
}

/* ======================================================================== */
/* 2. Credit — one decision explained (a waterfall of reason contributions) */
/* ======================================================================== */
{
  const rows = [
    { k: 'Starting score', s: 'Start', v: 640, kind: 'start' },
    { k: 'Payment history', s: 'Payments', v: 48 },
    { k: 'Credit utilisation', s: 'Utilisation', v: -22 },
    { k: 'Income stability', s: 'Income', v: 31 },
    { k: 'Debt-to-income', s: 'Debt/income', v: -19 },
    { k: 'Account tenure', s: 'Tenure', v: 14 },
    { k: 'Recent enquiries', s: 'Enquiries', v: -8 },
    { k: 'Final score', s: 'Final', v: 684, kind: 'total' }
  ];
  function draw(W, narrow) {
    const LBL = narrow ? 84 : 140, Rr = 38, T = 22, rowH = narrow ? 26 : 28, bh = 14;
    const H = T + rows.length * rowH + 22;
    const x = lin(600, 720, LBL, W - Rr);
    let g = '';
    for (let v = 600; v <= 720; v += narrow ? 40 : 20) {
      g += line(x(v), T - 4, x(v), H - 22, v === 600 ? 'baseline' : 'gridline') + text(x(v), H - 6, v, 'ax', 'middle');
    }
    g += line(x(660), T - 10, x(660), H - 22, 'ref') + text(x(660) + 4, T - 12, 'Approve at 660', 'lbl-soft');
    let run = 0;
    rows.forEach((r, i) => {
      const cy = T + i * rowH + (rowH - bh) / 2;
      g += text(LBL - 10, cy + bh / 2 + 4, narrow ? r.s : r.k, r.kind ? 'ax-strong' : 'ax', 'end');
      let x0, x1, cls, lab;
      if (r.kind === 'start') { x0 = x(600); x1 = x(r.v); run = r.v; cls = 'f-muted'; lab = String(r.v); }
      else if (r.kind === 'total') { x0 = x(600); x1 = x(r.v); cls = 'f-total'; lab = String(r.v); }
      else { x0 = x(run); x1 = x(run + r.v); run += r.v; cls = r.v > 0 ? 'f-pos' : 'f-neg'; lab = signed(r.v, 0); }
      g += bar(x0, x1, cy, bh, cls, r.kind ? `${r.v}|${r.k}` : `${signed(r.v, 0)} points|${r.k}`);
      const tipX = Math.max(x0, x1) + 6;
      g += text(tipX, cy + bh / 2 + 4, lab, 'lbl');
      if (i < rows.length - 1) {
        const nx = x(r.kind === 'start' ? r.v : run);
        g += line(nx, cy + bh, nx, cy + rowH, 'gridline');
      }
    });
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'How the score of 684 was reached: starting at 640, payment history added 48, utilisation took 22, income stability added 31, debt-to-income took 19, tenure added 14, enquiries took 8. The approval cutoff is 660.', g);
  }
  inject('credit-waterfall', box(draw(560, false), draw(340, true),
    table(['Factor', 'Points'], rows.map((r) => [r.k, r.kind ? String(r.v) : signed(r.v, 0)]))));
}

/* ======================================================================== */
/* 3. Credit — calibration by score band                                    */
/* ======================================================================== */
{
  const obs = [12.8, 8.9, 6.4, 4.7, 3.5, 2.6, 1.9, 1.3, 0.8, 0.4];
  const pred = [12.1, 9.2, 6.6, 4.5, 3.4, 2.5, 1.8, 1.2, 0.8, 0.5];
  function draw(W, H, narrow) {
    const L = 36, Rr = 8, T = 10, B = 38;
    const y = lin(0, 14, H - B, T), slot = (W - L - Rr) / 10, bw = Math.min(24, slot * 0.5);
    let g = '';
    for (const v of [0, 4, 8, 12]) g += line(L, y(v), W - Rr, y(v), v ? 'gridline' : 'baseline') + text(L - 8, y(v) + 4, v + '%', 'ax', 'end');
    obs.forEach((o, i) => {
      const cx = L + slot * (i + 0.5);
      g += hit(cx - slot / 2, T, slot, H - B - T, `${o.toFixed(1)}% observed, ${pred[i].toFixed(1)}% predicted|Score band ${i + 1}`);
      g += col(cx - bw / 2, bw, y(0), y(o), 'f-s1');
      if (!narrow || i % 2 === 0) g += text(cx, H - B + 15, i + 1, 'ax', 'middle');
    });
    g += `<path class="ln s2" d="${pathOf(pred.map((p, i) => [L + slot * (i + 0.5), y(p)]))}"/>`;
    pred.forEach((p, i) => { g += dot(L + slot * (i + 0.5), y(p), 'f-s2'); });
    g += text(L, H - 4, narrow ? 'Score band (1 = riskiest)' : 'Score band, 1 = highest risk', 'ax');
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'Observed and predicted default rates by score band. Predictions sit within about one percentage point of what happened in every band, from 12.8 percent observed in band 1 to 0.4 percent in band 10.', g);
  }
  inject('credit-calibration', box(draw(560, 200, false), draw(340, 190, true),
    table(['Score band', 'Observed', 'Predicted'], obs.map((o, i) => [String(i + 1), o.toFixed(1) + '%', pred[i].toFixed(1) + '%']))));
}

/* ======================================================================== */
/* 4. Fraud — the network around an alert                                   */
/* ======================================================================== */
{
  const R = rng(7), W = 620, H = 400;
  const nodes = [], edges = [];
  const ring = { x: 290, y: 165, r: 78 };
  /* The ring: seven accounts round one shared device, a new payee they wire
     out to, and the account the money came in through. */
  const ringIds = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 7);
    nodes.push({ id: 'AC-44' + (61 + i * 3), x: ring.x + Math.cos(a) * ring.r, y: ring.y + Math.sin(a) * ring.r, t: 'flag' });
    ringIds.push(nodes.length - 1);
  }
  nodes.push({ id: 'DV-77A1', x: ring.x, y: ring.y, t: 'dev', flag: true }); const dev = nodes.length - 1;
  nodes.push({ id: 'PY-new wire payee', x: 452, y: 66, t: 'payee', flag: true }); const payee = nodes.length - 1;
  nodes.push({ id: 'AC-1093', x: 118, y: 92, t: 'acct', flag: true }); const entry = nodes.length - 1;
  ringIds.forEach((n, i) => { edges.push([n, ringIds[(i + 1) % 7], 'hot']); edges.push([n, dev, 'hot']); });
  edges.push([entry, ringIds[0], 'hot'], [entry, ringIds[6], 'hot'], [ringIds[1], payee, 'hot'], [ringIds[2], payee, 'hot']);

  /* Everyone else: three loose clusters of ordinary accounts, with their own
     devices and payees, placed so nothing overlaps. */
  const centres = [[80, 290, 66], [540, 170, 62], [470, 320, 72], [260, 350, 46]];
  const placed = () => nodes.map((n) => [n.x, n.y]);
  for (const [cx, cy, rad] of centres) {
    const count = 8;
    for (let k = 0; k < count; k++) {
      let x, y, tries = 0;
      do {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rad;
        x = cx + Math.cos(a) * d; y = cy + Math.sin(a) * d; tries++;
      } while (tries < 200 && (placed().some((p) => Math.hypot(p[0] - x, p[1] - y) < 30) || Math.hypot(x - ring.x, y - ring.y) < ring.r + 50 || x < 18 || x > W - 18 || y < 18 || y > H - 18));
      const t = k === 0 ? 'dev' : k === 1 ? 'payee' : 'acct';
      nodes.push({ id: (t === 'dev' ? 'DV-' : t === 'payee' ? 'PY-' : 'AC-') + (1200 + nodes.length * 37), x, y, t });
    }
  }
  /* Ordinary wiring: each background node to its two nearest neighbours. */
  const first = entry + 1;
  for (let i = first; i < nodes.length; i++) {
    const near = nodes.map((n, j) => [j, Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y)])
      .filter(([j]) => j !== i && j >= first).sort((a, b) => a[1] - b[1]).slice(0, 2);
    for (const [j] of near) if (!edges.some((e) => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) edges.push([i, j, '']);
  }
  /* Victims paying into the entry account. */
  const victims = nodes.map((n, j) => [j, Math.hypot(n.x - nodes[entry].x, n.y - nodes[entry].y)]).filter(([j]) => j >= first).sort((a, b) => a[1] - b[1]).slice(0, 3);
  for (const [j] of victims) edges.push([j, entry, '']);

  function draw(vx, vy, vw, vh, narrow) {
    let g = `<circle class="halo" cx="${ring.x}" cy="${ring.y}" r="${ring.r + 32}"/><circle class="halo-line" cx="${ring.x}" cy="${ring.y}" r="${ring.r + 32}"/>`;
    g += text(ring.x, ring.y + ring.r + 52, 'Alert 48213 · risk 0.93', 'lbl', 'middle');
    for (const [a, b, hot] of edges) g += line(nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, hot ? 'edge-hot' : 'edge');
    nodes.forEach((n) => {
      const flagged = n.t === 'flag' || n.flag;
      const kind = n.t === 'dev' ? 'device' : n.t === 'payee' ? 'payee' : 'account';
      const tip = `${n.id.split(' ')[0]}|${kind}${flagged ? ', in the ring' : ''}`;
      const cls = flagged && n.t !== 'dev' && n.t !== 'payee' ? 'n-flag' : 'n-' + (n.t === 'flag' ? 'flag' : n.t);
      const ringCls = flagged ? ' n-ring' : ' n-ring';
      if (n.t === 'dev') g += `<rect class="${cls}${ringCls}" x="${r1(n.x - 7)}" y="${r1(n.y - 7)}" width="14" height="14" rx="3" data-tip="${esc(tip)}"/>`;
      else if (n.t === 'payee') g += `<rect class="${cls}${ringCls}" x="${r1(n.x - 6)}" y="${r1(n.y - 6)}" width="12" height="12" rx="2" transform="rotate(45 ${r1(n.x)} ${r1(n.y)})" data-tip="${esc(tip)}"/>`;
      else g += `<circle class="${cls}${ringCls}" cx="${r1(n.x)}" cy="${r1(n.y)}" r="${flagged ? 7 : 5.5}" data-tip="${esc(tip)}"/>`;
    });
    g += text(nodes[dev].x, nodes[dev].y - 13, 'Shared device', 'lbl-soft', 'middle');
    g += text(nodes[payee].x, nodes[payee].y - 14, 'New wire payee', 'lbl-soft', 'middle');
    g += text(nodes[entry].x, nodes[entry].y - 14, 'Money in', 'lbl-soft', 'middle');
    return `<svg class="${narrow ? 'v-narrow' : 'v-wide'}" viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="Transaction network: seven accounts sharing one device move money in a loop, take it in through one account and wire it out to a new payee. Around them, ordinary accounts show no such pattern.">${g}</svg>`;
  }
  /* The compact drawing is a crop, not a shrink: the same network, framed
     on the ring. */
  inject('fraud-network', box(draw(0, 0, W, H, false), draw(100, 22, 380, 300, true),
    table(['Node', 'Kind', 'In ring'], nodes.filter((n) => n.t === 'flag' || n.flag).map((n) => [n.id, n.t === 'dev' ? 'Device' : n.t === 'payee' ? 'Payee' : 'Account', 'Yes']), 3)));
}

/* ======================================================================== */
/* 5. Forecasting — operating cash with its range                           */
/* ======================================================================== */
{
  const R = rng(19);
  const today = new Date(Date.UTC(2026, 8, 29));
  const series = [];
  function base(d) {
    const day = d.getUTCDate(), dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    let v = 418 + 18 * Math.sin((d - today) / 86400000 / 23);
    if (day >= 15 && day <= 16) v -= 48;                     /* mid-month payroll */
    if (day === dim || day === dim - 1) v -= 62;             /* month-end payroll and tax */
    if (d.getUTCDay() === 2) v += 14;                        /* card settlements */
    return v;
  }
  for (let i = -89; i <= 60; i++) {
    const d = new Date(today); d.setUTCDate(today.getUTCDate() + i);
    const b = base(d);
    if (i <= 0) series.push({ d, i, act: b + (R() - 0.5) * 14 });
    else {
      const w = 7 + 2.6 * Math.sqrt(i);
      series.push({ d, i, p50: b, p10: b - 1.28 * w, p90: b + 1.28 * w });
    }
  }
  /* The low point the copy names: Oct 30, month-end payroll and tax. */
  const low = series.find((p) => p.i > 0 && p.d.getUTCMonth() === 9 && p.d.getUTCDate() === 30);
  const shift = 318 - low.p50; for (const k of ['p50', 'p10', 'p90']) low[k] += shift;
  const md = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  function draw(W, H, from, narrow) {
    const L = 40, Rr = 10, T = 14, B = 24;
    const pts = series.filter((p) => p.i >= from), n = pts.length;
    const x = lin(from, 60, L, W - Rr), y = lin(260, 500, H - B, T);
    let g = '';
    for (const v of [300, 350, 400, 450, 500]) {
      if (narrow && (v === 350 || v === 450)) continue;
      g += line(L, y(v), W - Rr, y(v), 'gridline') + text(L - 8, y(v) + 4, '$' + v, 'ax', 'end');
    }
    g += line(L, H - B, W - Rr, H - B, 'baseline');
    pts.forEach((p) => { if (p.d.getUTCDate() === 1) g += line(x(p.i), H - B, x(p.i), H - B + 4, 'baseline') + text(x(p.i) + 3, H - 6, p.d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), 'ax'); });
    const fc = pts.filter((p) => p.i > 0), hist = pts.filter((p) => p.i <= 0);
    g += `<path class="ar band" d="${pathOf(fc.map((p) => [x(p.i), y(p.p90)]).concat(fc.slice().reverse().map((p) => [x(p.i), y(p.p10)])))}Z"/>`;
    g += line(L, y(300), W - Rr, y(300), 'ref-crit') + text(W - Rr - 4, y(300) - 6, 'Floor $300M', 'lbl-soft', 'end');
    g += line(x(0), T, x(0), H - B, 'ref') + text(x(0) + 4, T + 8, 'Today', 'lbl-soft');
    const step = (W - Rr - L) / (n - 1);
    pts.forEach((p) => {
      const tip = p.i <= 0 ? `$${Math.round(p.act)}M actual|${md(p.d)}` : `$${Math.round(p.p50)}M forecast, $${Math.round(p.p10)}M to $${Math.round(p.p90)}M|${md(p.d)}`;
      g += hit(x(p.i) - step / 2, T, step, H - B - T, tip);
    });
    g += `<path class="ln s1" d="${pathOf(hist.map((p) => [x(p.i), y(p.act)]))}"/>`;
    g += `<path class="ln s1 dash" d="${pathOf([[x(0), y(hist[hist.length - 1].act)]].concat(fc.map((p) => [x(p.i), y(p.p50)])))}"/>`;
    g += dot(x(low.i), y(low.p50), 'f-s1') + text(x(low.i), y(low.p50) + 20, '$318M', 'lbl', 'middle');
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'Operating cash in CAD millions: 90 days of actuals around 420 million with dips at each payroll, then a 60-day forecast whose range widens over time. The forecast low is 318 million on October 30, above the 300 million floor.', g);
  }
  const weekly = series.filter((p, k) => k % 7 === 0 || p.i === 0);
  inject('forecast-chart', box(draw(600, 230, -89, false), draw(340, 210, -29, true),
    table(['Date', 'Actual', 'P10', 'P50', 'P90'], weekly.map((p) => [md(p.d), p.act ? Math.round(p.act) : '', p.p10 ? Math.round(p.p10) : '', p.p50 ? Math.round(p.p50) : '', p.p90 ? Math.round(p.p90) : '']))));

  /* Drivers: the next 30 days' net flows, as a diverging bar per driver. */
  const drv = [['Payroll', -42.1], ['Card settlements', 38.4], ['Loan repayments', 12.7], ['Deposit inflows', 9.9], ['Tax remittance', -6.2]];
  function drawD(W, narrow) {
    /* Compact: values sit in their own column on the right, so a long
       negative bar never runs its number into the row label. */
    const LBL = narrow ? 104 : 130, rowH = 24, bh = 12, H = drv.length * rowH + 4;
    const x = lin(-50, 50, LBL, W - (narrow ? 46 : 40));
    let g = line(x(0), 0, x(0), H, 'baseline');
    drv.forEach(([k, v], i) => {
      const cy = i * rowH + (rowH - bh) / 2;
      g += text(LBL - 10, cy + bh / 2 + 4, k, 'ax', 'end');
      g += bar(x(0), x(v), cy, bh, v > 0 ? 'f-pos' : 'f-neg', `${signed(v)}M|${k}, next 30 days`);
      if (narrow) g += text(W - 2, cy + bh / 2 + 4, signed(v), 'lbl', 'end');
      else g += text(v > 0 ? x(v) + 6 : x(v) - 6, cy + bh / 2 + 4, signed(v), 'lbl', v > 0 ? 'start' : 'end');
    });
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'Net cash flow by driver over the next 30 days, in CAD millions: payroll minus 42.1, card settlements plus 38.4, loan repayments plus 12.7, deposit inflows plus 9.9, tax remittance minus 6.2.', g);
  }
  inject('forecast-drivers', box(drawD(600, false), drawD(340, true),
    table(['Driver', 'Next 30 days, CAD M'], drv.map(([k, v]) => [k, signed(v)]))));
}

/* ======================================================================== */
/* 6. Risk — factor exposure heat map                                        */
/* ======================================================================== */
/* A binned diverging scale: four steps each way from a grey zero, as tokens
   (--hm-n4 … --hm-0 … --hm-p4) solved by tools/solve-palette.mjs. The steps
   are spaced to skip the mid-tones where neither the light nor the dark ink
   reads, so every cell carries its number: the two quiet steps take the
   room's ink, the two strong ones its ground (.on-strong). */
const bin = (v) => { const a = Math.abs(v); return a < 0.1 ? 0 : Math.min(4, 1 + Math.floor(a / 0.25)); };
{
  const rows = [['Canadian equity', 'CA equity'], ['Global equity', 'Gl. equity'], ['Investment-grade credit', 'IG credit'],
                ['High-yield credit', 'HY credit'], ['Mortgages', 'Mortgages'], ['Liquidity book', 'Liquidity']];
  const cols = [['Rates', 'Rt'], ['Credit', 'Cr'], ['Equity', 'Eq'], ['FX', 'FX'], ['Commodities', 'Cm'], ['Liquidity', 'Lq']];
  const M = [[-0.12, 0.18, 0.92, 0.21, 0.34, 0.15], [-0.08, 0.14, 0.88, 0.47, 0.22, 0.10], [0.71, 0.58, 0.12, 0.05, 0.03, 0.22],
             [0.34, 0.86, 0.41, 0.06, 0.18, 0.39], [0.83, 0.27, 0.02, -0.03, 0.00, 0.31], [-0.22, -0.05, -0.02, -0.11, 0.01, -0.46]];
  function draw(narrow) {
    const LBL = narrow ? 70 : 150, cw = narrow ? 39 : 64, ch = narrow ? 30 : 34, T = 22, gap = 2;
    const W = LBL + cols.length * cw, H = T + rows.length * ch + 48;
    let g = '';
    cols.forEach(([c, s], j) => { g += text(LBL + j * cw + cw / 2, T - 8, narrow ? s : c, 'ax', 'middle'); });
    rows.forEach(([rLong, rShort], i) => {
      g += text(LBL - 10, T + i * ch + ch / 2 + 4, narrow ? rShort : rLong, 'ax', 'end');
      cols.forEach(([c], j) => {
        const v = M[i][j], k = bin(v);
        const fill = k === 0 ? 'var(--hm-0)' : `var(--hm-${v >= 0 ? 'p' : 'n'}${k})`;
        const x0 = LBL + j * cw + gap / 2, y0 = T + i * ch + gap / 2;
        g += `<rect x="${x0}" y="${y0}" width="${cw - gap}" height="${ch - gap}" rx="4" style="fill:${fill}" data-tip="${esc(signed(v, 2) + '|' + rLong + ' · ' + c)}"/>`;
        const ink = k >= 3 ? ' on-strong' : '';
        g += text(x0 + (cw - gap) / 2, y0 + (ch - gap) / 2 + 4, minus(v.toFixed(narrow ? 1 : 2)).replace(/^0\./, '.').replace(/^−0\./, '−.'), 'cell-txt' + ink, 'middle', ' style="pointer-events:none"');
      });
    });
    /* The scale: the nine steps, short through zero to long. */
    const sy = T + rows.length * ch + 16, sw = 18, sx = LBL;
    ['n4', 'n3', 'n2', 'n1', '0', 'p1', 'p2', 'p3', 'p4'].forEach((k, n) => {
      g += `<rect x="${sx + n * (sw + 2)}" y="${sy}" width="${sw}" height="10" rx="2" style="fill:var(--hm-${k})"/>`;
    });
    g += text(sx, sy + 26, '\u22121 short', 'ax') + text(sx + 4 * (sw + 2) + sw / 2, sy + 26, '0', 'ax', 'middle') + text(sx + 9 * (sw + 2) - 2, sy + 26, '+1 long', 'ax', 'end');
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'Heat map of factor exposures by book. Equity books load mostly on equity (0.92 and 0.88), credit books on rates and credit spreads, mortgages on rates (0.83); the liquidity book is short liquidity (minus 0.46).', g);
  }
  inject('risk-heatmap', box(draw(false), draw(true),
    table(['Book'].concat(cols.map((c) => c[0])), rows.map((r, i) => [r[0]].concat(M[i].map((v) => signed(v, 2)))))));
}

/* ======================================================================== */
/* 7. Risk — stress scenarios                                                */
/* ======================================================================== */
{
  const sc = [['Rates +200 bp', -41.2], ['Credit spreads +150 bp', -28.7], ['Equities −25%', -63.5], ['CAD −10%', 12.4], ['Oil −30%', -9.1], ['2008 replay', -88.6]];
  function draw(W, narrow) {
    const LBL = narrow ? 0 : 160, rowH = narrow ? 38 : 28, bh = 12, T = 4, B = 20;
    const H = T + sc.length * rowH + B;
    const x = lin(-100, 25, LBL + 4, W - (narrow ? 48 : 34));
    let g = '';
    for (const v of [-100, -75, -50, -25, 0, 25]) {
      if (narrow && (v === -75 || v === -25)) continue;
      g += line(x(v), T, x(v), H - B, v === 0 ? 'baseline' : 'gridline') + text(x(v), H - 4, minus(v), 'ax', 'middle');
    }
    sc.forEach(([k, v], i) => {
      const cy = T + i * rowH + (narrow ? 18 : (rowH - bh) / 2);
      if (narrow) g += text(x(-100), cy - 5, k, 'ax');
      else g += text(LBL - 10, cy + bh / 2 + 4, k, 'ax', 'end');
      g += bar(x(0), x(v), cy, bh, v < 0 ? 'f-neg' : 'f-pos', `${signed(v)}M|${k}`);
      if (narrow) g += text(W - 2, cy + bh / 2 + 4, signed(v), 'lbl', 'end');
      else g += text(v < 0 ? x(v) - 6 : x(v) + 6, cy + bh / 2 + 4, signed(v), 'lbl', v < 0 ? 'end' : 'start');
    });
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'One-day profit and loss under stress, CAD millions: rates up 200 basis points minus 41.2, credit spreads up 150 minus 28.7, equities down 25 percent minus 63.5, Canadian dollar down 10 percent plus 12.4, oil down 30 percent minus 9.1, a 2008 replay minus 88.6.', g);
  }
  inject('risk-stress', box(draw(560, false), draw(340, true),
    table(['Scenario', 'One-day P&L, CAD M'], sc.map(([k, v]) => [k, signed(v)]))));
}

/* ======================================================================== */
/* 8. Governance — approval rate relative to the reference group            */
/* ======================================================================== */
{
  const fr = [['Age 18–25', 0.91], ['Age 26–40 (reference)', 1.0, true], ['Age 41–60', 0.98], ['Age 61+', 0.94], ['Men (reference)', 1.0, true], ['Women', 0.99]];
  function draw(W, narrow) {
    const LBL = narrow ? 118 : 160, rowH = 22, bh = 10, T = 18, B = 20, H = T + fr.length * rowH + B;
    const x = lin(0, 1.2, LBL, W - 34);
    let g = '';
    for (const v of [0, 0.4, 0.8, 1.2]) g += line(x(v), T - 4, x(v), H - B, v ? 'gridline' : 'baseline') + text(x(v), H - 4, v.toFixed(1), 'ax', 'middle');
    g += line(x(0.8), T - 10, x(0.8), H - B, 'ref-crit') + text(x(0.8) - 4, T - 8, 'Four-fifths limit', 'lbl-soft', 'end');
    fr.forEach(([k, v, ref], i) => {
      const cy = T + i * rowH + (rowH - bh) / 2;
      g += text(LBL - 10, cy + bh / 2 + 4, narrow ? k.replace(' (reference)', ' (ref.)') : k, 'ax', 'end');
      g += bar(x(0), x(v), cy, bh, ref ? 'f-muted' : 'f-s1', `${v.toFixed(2)}|${k}`);
      g += text(x(v) + 6, cy + bh / 2 + 4, v.toFixed(2), 'lbl');
    });
    return svg(narrow ? 'v-narrow' : 'v-wide', W, H, 'Approval rate of each group relative to its reference group. Every group is between 0.91 and 0.99, above the 0.80 four-fifths limit.', g);
  }
  inject('gov-fairness', box(draw(520, false), draw(320, true),
    table(['Group', 'Relative approval rate'], fr.map(([k, v]) => [k, v.toFixed(2)]))));
}

/* ======================================================================== */
/* 9–11. Customer stories                                                    */
/* ======================================================================== */
{
  /* Northmere: approval rate against loss rate, old and new model. */
  const curve = (a, b) => Array.from({ length: 21 }, (_, i) => { const l = 1 + i * 0.1; return [l, a + b * Math.log(l)]; });
  const oldC = curve(47.8, 14.7), newC = curve(55.0, 16.0);
  const W = 320, H = 170, L = 34, Rr = 10, T = 22, B = 24;
  const x = lin(1, 3, L, W - Rr), y = lin(40, 80, H - B, T);
  let g = `<g class="legend-svg">${line(L, 8, L + 14, 8, 'ln s1')}${text(L + 18, 12, 'New model', 'ax-strong')}${line(L + 96, 8, L + 110, 8, 'ln s2')}${text(L + 114, 12, 'Previous', 'ax-strong')}</g>`;
  for (const v of [40, 60, 80]) g += line(L, y(v), W - Rr, y(v), v === 40 ? 'baseline' : 'gridline') + text(L - 6, y(v) + 4, v + '%', 'ax', 'end');
  for (const v of [1, 2, 3]) g += text(x(v), H - 6, v + '% loss', 'ax', 'middle');
  g += line(x(2), T, x(2), H - B, 'ref');
  g += `<path class="ln s2" d="${pathOf(oldC.map(([a, b]) => [x(a), y(b)]))}"/><path class="ln s1" d="${pathOf(newC.map(([a, b]) => [x(a), y(b)]))}"/>`;
  const o2 = 47.8 + 14.7 * Math.log(2), n2 = 55 + 16 * Math.log(2);
  g += dot(x(2), y(o2), 'f-s2', `${o2.toFixed(0)}% approved|previous model at 2% loss`) + dot(x(2), y(n2), 'f-s1', `${n2.toFixed(0)}% approved|new model at 2% loss`);
  g += text(x(2) + 8, y(n2) - 4, n2.toFixed(0) + '%', 'lbl') + text(x(2) + 8, y(o2) + 14, o2.toFixed(0) + '%', 'lbl');
  inject('case-credit', box(svg('v-all', W, H, `Approval rate against loss rate. At a 2 percent loss rate the new model approves ${n2.toFixed(0)} percent of applicants against ${o2.toFixed(0)} percent before.`, g),
    '', table(['Loss rate', 'Previous model', 'New model'], [1, 1.5, 2, 2.5, 3].map((l) => [l.toFixed(1) + '%', (47.8 + 14.7 * Math.log(l)).toFixed(1) + '%', (55 + 16 * Math.log(l)).toFixed(1) + '%']))));
}
{
  /* Calder: false-positive alerts per month, before and after go-live. */
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const v = [9.8, 10.2, 10.6, 8.4, 6.3, 6.2, 6.4, 6.1, 6.0, 6.2, 5.9, 6.1];
  const W = 320, H = 170, L = 30, Rr = 6, T = 22, B = 22, slot = (W - L - Rr) / 12, bw = Math.min(14, slot * 0.62);
  const y = lin(0, 12, H - B, T);
  let g = '';
  for (const t of [0, 4, 8, 12]) g += line(L, y(t), W - Rr, y(t), t ? 'gridline' : 'baseline') + text(L - 6, y(t) + 4, t + 'k', 'ax', 'end');
  v.forEach((val, i) => {
    const cx = L + slot * (i + 0.5);
    g += col(cx - bw / 2, bw, y(0), y(val), i < 3 ? 'f-muted' : 'f-s1', `${val.toFixed(1)}k false positives|${m[i]} 2025`);
    if (i % 3 === 0) g += text(cx, H - 6, m[i], 'ax', 'middle');
  });
  const gx = L + slot * 3;
  g += line(gx, T - 12, gx, H - B, 'ref') + text(gx + 4, T - 4, 'Larch live, April', 'lbl-soft');
  inject('case-fraud', box(svg('v-all', W, H, 'False-positive fraud alerts per month in 2025: about 10,200 a month before go-live in April, about 6,300 a month afterwards.', g),
    '', table(['Month', 'False positives (thousands)'], v.map((val, i) => [m[i], val.toFixed(1)]))));
}
{
  /* Fenwick: overnight risk run time. */
  const W = 320, H = 130, LBL = 60, T = 10, rowH = 40, bh = 16, B = 22;
  const x = lin(0, 400, LBL, W - 70);
  let g = '';
  for (const t of [0, 120, 240, 360]) g += line(x(t), T, x(t), H - B, t ? 'gridline' : 'baseline') + text(x(t), H - 6, t / 60 + ' h', 'ax', 'middle');
  [['Before', 370, 'f-muted', '6 h 10 min'], ['After', 9, 'f-s1', '9 min']].forEach(([k, val, cls, lab], i) => {
    const cy = T + i * rowH + (rowH - bh) / 2;
    g += text(LBL - 10, cy + bh / 2 + 4, k, 'ax-strong', 'end');
    g += bar(x(0), x(val), cy, bh, cls, `${lab}|${k}`);
    g += text(x(val) + 6, cy + bh / 2 + 4, lab, 'lbl');
  });
  inject('case-risk', box(svg('v-all', W, H, 'Overnight risk run time: 6 hours 10 minutes before, 9 minutes after.', g),
    '', table(['Run', 'Minutes'], [['Before', '370'], ['After', '9']])));
}

writeFileSync(file, html);
console.log('drew assets into index.html');
