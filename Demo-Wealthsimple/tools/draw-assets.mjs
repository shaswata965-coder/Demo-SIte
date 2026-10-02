/* Draw the data-driven picture into index.html.

   Most pictures on the page are product screens written by hand. One is
   drawn from data: the cash forecast on the floating slab in the
   forecasting hero. Its line, band, floor and low point share one scale, and
   the low point the pin names is read off the series, so the number in the
   picture is the number in the series. The output is static SVG pasted
   between markers in index.html, so the page needs no script to show it:

     <!-- draw:forecast-slab --> … <!-- /draw:forecast-slab -->

     node tools/draw-assets.mjs        (running it twice changes nothing)
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../index.html');
let html = readFileSync(file, 'utf8');

const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lin = (d0, d1, r0, r1_) => (v) => r0 + (v - d0) / (d1 - d0) * (r1_ - r0);
const pathOf = (pts) => 'M' + pts.map((p) => r1(p[0]) + ' ' + r1(p[1])).join('L');
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function inject(name, markup) {
  const re = new RegExp(`(<!-- draw:${name} -->)[\\s\\S]*?(\\s*<!-- /draw:${name} -->)`);
  if (!re.test(html)) throw new Error('missing marker ' + name);
  /* A function, not a string: the markup is full of dollar amounts, and "$'"
     in a replacement string means "everything after the match". */
  html = html.replace(re, (_, open, close) => `${open}\n${markup}${close}`);
}

/* ======================================================================== */
/* Operating cash, CAD millions: 45 days of actuals, a 60-day forecast       */
/* ======================================================================== */
const R = rng(19);
const today = new Date(Date.UTC(2026, 9, 1));
const day = (i) => { const d = new Date(today); d.setUTCDate(today.getUTCDate() + i); return d; };
const md = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function base(d) {
  const dom = d.getUTCDate(), dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  /* A slow cycle whose trough falls about a month out. */
  let v = 424 + 20 * Math.sin((d - today) / 86400000 / 21 + 3.331);
  if (dom >= 15 && dom <= 16) v -= 60;                     /* mid-month payroll */
  if (dom === dim || dom === dim - 1) v -= 104;             /* month-end payroll and tax */
  if (d.getUTCDay() === 2) v += 12;                        /* card settlements */
  return v;
}
/* Cash does not fall off a cliff on payday; it drains over a few days and
   refills. A small smoothing kernel over the daily base gives it that
   shape before noise and the forecast range are added. */
const raw = [];
for (let i = -48; i <= 64; i++) raw.push(base(day(i)));
const K = [1, 4, 6, 4, 1].map((k) => k / 16);
const smooth = (j) => K.reduce((a, k, m) => a + k * raw[j + m - 2], 0);
const series = [];
for (let i = -44; i <= 60; i++) {
  const d = day(i), b = smooth(i + 48);
  if (i <= 0) series.push({ i, d, act: b + (R() - 0.5) * 8 });
  else {
    const w = 6 + 2.4 * Math.sqrt(i);                      /* the range widens with the horizon */
    series.push({ i, d, p50: b, p10: b - 1.28 * w, p90: b + 1.28 * w });
  }
}
const fc = series.filter((p) => p.i > 0), hist = series.filter((p) => p.i <= 0);
/* The low point is read off the forecast, not chosen. */
const low = fc.reduce((a, p) => (p.p50 < a.p50 ? p : a));
const lowM = Math.round(low.p50), FLOOR = 300;
if (low.p10 < FLOOR) throw new Error('the P10 crosses the floor; the copy says it does not');
const daysToLow = low.i;

/* The face is 400 x 300. Small margins: it is a surface seen at an angle,
   so the labels sit inside it, large and few. */
const W = 400, H = 300, L = 16, Rr = 16, T = 30, B = 40;
const x = lin(-44, 60, L + 46, W - Rr), y = lin(270, 470, H - B, T);
let g = '';
for (const v of [350, 400, 450]) g += `<line class="f-grid" x1="${L}" x2="${W - Rr}" y1="${r1(y(v))}" y2="${r1(y(v))}"/><text class="f-ax" x="${L + 2}" y="${r1(y(v) - 6)}">$${v}M</text>`;
g += `<line class="f-floor" x1="${L}" x2="${W - Rr}" y1="${r1(y(FLOOR))}" y2="${r1(y(FLOOR))}"/><text class="f-ax f-floor-t" x="${W - Rr - 2}" y="${r1(y(FLOOR) + 18)}" text-anchor="end">Floor $${FLOOR}M</text>`;
/* Month starts along the bottom edge. */
for (const p of series) if (p.d.getUTCDate() === 1) g += `<line class="f-tick" x1="${r1(x(p.i))}" x2="${r1(x(p.i))}" y1="${H - B + 6}" y2="${H - B + 14}"/><text class="f-ax" x="${r1(x(p.i) + 4)}" y="${H - B + 26}">${p.d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</text>`;
g += `<line class="f-today" x1="${r1(x(0))}" x2="${r1(x(0))}" y1="${T - 8}" y2="${H - B + 4}"/><text class="f-ax f-today-t" x="${r1(x(0) - 5)}" y="${T - 12}" text-anchor="end">Today</text>`;
/* The forecast group draws itself left to right in the loop (assets.css). */
const band = pathOf(fc.map((p) => [x(p.i), y(p.p90)]).concat(fc.slice().reverse().map((p) => [x(p.i), y(p.p10)]))) + 'Z';
const p50 = pathOf([[x(0), y(hist[hist.length - 1].act)]].concat(fc.map((p) => [x(p.i), y(p.p50)])));
g += `<g class="f-fc"><path class="f-band" d="${band}"/><path class="f-p50" pathLength="100" d="${p50}"/></g>`;
g += `<path class="f-act" d="${pathOf(hist.map((p) => [x(p.i), y(p.act)]))}"/>`;
g += `<circle class="f-now" cx="${r1(x(0))}" cy="${r1(y(hist[hist.length - 1].act))}" r="5"/>`;
g += `<circle class="f-ring" cx="${r1(x(low.i))}" cy="${r1(y(low.p50))}" r="6"/>`;
g += `<circle class="f-low" cx="${r1(x(low.i))}" cy="${r1(y(low.p50))}" r="6"/>`;

const pinLeft = r1(x(low.i) / W * 100), pinTop = r1(y(low.p50) / H * 100);
const label = `Liquidity forecast on a floating slab. Operating cash in Canadian dollars: 45 days of actuals around 420 million with dips at each payroll, then a 60-day forecast whose range widens with the horizon. The forecast low is ${lowM} million on ${md(low.d)}, ${daysToLow} days out, above the ${FLOOR} million floor.`;

const markup = `<div class="asset a-fc" role="img" aria-label="${esc(label)}">
        <span class="mist m1"></span><span class="mist m2"></span>
        <div class="slab-bob">
          <div class="slab">
            <div class="slab-face">
              <svg viewBox="0 0 ${W} ${H}">${g}</svg>
              <span class="pin" style="left:${pinLeft}%;top:${pinTop}%"><span class="pin-in"><span class="pin-card"><b>$${lowM}M</b><small>Low point &middot; ${md(low.d)}</small></span><i class="pin-stem"></i></span></span>
            </div>
            <div class="slab-edge e-front"></div>
            <div class="slab-edge e-side"></div>
          </div>
        </div>
        <div class="slab-shadow"></div>
        <span class="mist m3"></span>
      </div>`;
inject('forecast-slab', markup);

writeFileSync(file, html);
console.log(`forecast low $${lowM}M on ${md(low.d)} (${daysToLow} days out); P10 there $${Math.round(low.p10)}M; floor $${FLOOR}M`);
