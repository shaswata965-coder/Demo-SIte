/* Solve and write css/tokens.css.

   Six rooms, each in light and dark. The rooms are set by hand in OKLCH and
   kept quiet: chroma at or under 0.03 on every ground, cool-neutral rather
   than cream, so the colour on the page comes from the product pictures and
   the charts, not from the walls.

   Everything that sits on a room is solved against it:

     text hues   gold, petrol, good, bad — each held to a chroma cap and
                 taken to the lightness nearest its target that clears 4.5:1
                 on the room's band (both ends, where the band is a gradient)
                 and on its panel
     chart marks three categorical series, a diverging pair with a grey
                 midpoint, and two status colours — checked here for the
                 dataviz rules this script can measure (lightness band,
                 chroma floor, 3:1 against every panel they are drawn on);
                 colour-vision separation is checked with the dataviz
                 validator, see README

   The derived pairs the stylesheet builds with color-mix — the two quieter
   inks, the ink pill — are checked with the same mixing.

     node tools/solve-palette.mjs           check and print the worst pair
     node tools/solve-palette.mjs --check   print every pair
     node tools/solve-palette.mjs --write   check, then write css/tokens.css
*/
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---- colour maths ------------------------------------------------------- */
function oklchToLinear(L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
}
function linearToOklch(rgb) {
  const [r, g, b] = rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B)];
}
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const enc = (v) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
const dec = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const hex = (lin) => '#' + lin.map((v) => Math.round(enc(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const parse = (h) => [1, 3, 5].map((i) => dec(parseInt(h.slice(i, i + 2), 16) / 255));
const lum = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
const contrast = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* In gamut: if the chroma asked for does not fit at this lightness, give up
   chroma, never lightness. */
function color(L, C, h) {
  let c = C;
  while (c > 0 && !inGamut(oklchToLinear(L, c, h))) c -= 0.002;
  return hex(oklchToLinear(L, Math.max(0, c), h));
}
function solve(h, C, L0, grounds, min = 4.5) {
  for (let d = 0; d <= 0.8; d += 0.002) {
    for (const L of [L0 - d, L0 + d]) {
      if (L < 0.05 || L > 0.98) continue;
      const c = color(L, C, h);
      if (grounds.every((g) => contrast(c, g) >= min)) return c;
    }
  }
  throw new Error(`no lightness clears ${min}:1 for hue ${h}`);
}
function mix(a, b, p) {
  const A = parse(a).map(enc), B = parse(b).map(enc);
  return '#' + A.map((v, i) => Math.round((v * p + B[i] * (1 - p)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* ---- the rooms ----------------------------------------------------------
   [L, C, h]. `dark` says which way text and chart steps go. */
const ROOMS = {
  light: {
    stone:  { bg: [0.962, 0.004, 160], panel: [0.995, 0.002, 160], ink: [0.210, 0.014, 230] },
    sage:   { bg: [0.878, 0.028, 150], panel: [0.975, 0.008, 150], ink: [0.200, 0.020, 160] },
    mist:   { bg: [0.905, 0.018, 240], bg2: [0.932, 0.026, 82], panel: [0.985, 0.005, 80], ink: [0.200, 0.020, 250] },
    spruce: { bg: [0.270, 0.030, 180], panel: [0.320, 0.030, 180], ink: [0.960, 0.008, 160], dark: true },
    slate:  { bg: [0.270, 0.022, 255], panel: [0.310, 0.024, 255], ink: [0.960, 0.008, 240], dark: true },
    night:  { bg: [0.190, 0.012, 230], panel: [0.245, 0.012, 230], ink: [0.955, 0.006, 200], dark: true }
  },
  dark: {
    stone:  { bg: [0.180, 0.008, 230], panel: [0.235, 0.012, 220], ink: [0.950, 0.006, 200], dark: true },
    sage:   { bg: [0.245, 0.024, 155], panel: [0.295, 0.026, 155], ink: [0.950, 0.010, 150], dark: true },
    mist:   { bg: [0.235, 0.022, 250], bg2: [0.265, 0.028, 70], panel: [0.300, 0.020, 250], ink: [0.955, 0.008, 80], dark: true },
    spruce: { bg: [0.215, 0.028, 180], panel: [0.265, 0.030, 180], ink: [0.955, 0.008, 160], dark: true },
    slate:  { bg: [0.215, 0.020, 255], panel: [0.265, 0.022, 255], ink: [0.955, 0.008, 240], dark: true },
    night:  { bg: [0.150, 0.010, 230], panel: [0.200, 0.012, 230], ink: [0.950, 0.006, 200], dark: true }
  }
};

/* Text hues: [hue, chroma cap]. */
const TEXT = { acc: [72, 0.11], link: [228, 0.09], pos: [150, 0.10], neg: [25, 0.12] };

/* Chart steps, one set per kind of ground. Categorical order is fixed:
   petrol, brass, violet. Light steps sit in OKLCH L 0.43–0.77, dark steps in
   0.48–0.67, all at chroma 0.10 or more — the dataviz rules. */
const CHART = {
  light: { s1: [0.50, 0.105, 232], s2: [0.635, 0.118, 72], s3: [0.50, 0.112, 295],
           dneg: [0.60, 0.11, 30], dmid: [0.915, 0.004, 220],
           crit: [0.53, 0.15, 24], good: [0.56, 0.11, 150] },
  dark:  { s1: [0.63, 0.104, 228], s2: [0.67, 0.112, 74], s3: [0.62, 0.115, 295],
           dneg: [0.66, 0.11, 30], dmid: [0.38, 0.008, 220],
           crit: [0.66, 0.14, 24], good: [0.68, 0.12, 150] }
};

const accFill = { light: [0.74, 0.11, 75], dark: [0.78, 0.105, 75] };

const check = process.argv.includes('--check');
const write = process.argv.includes('--write');
const tables = {};
let worst = Infinity, failures = 0;
function note(label, c, g, r, min) {
  if (r < min) failures++;
  worst = Math.min(worst, r / min * 4.5);
  if (check || r < min) console.log(`  ${label.padEnd(10)} ${c} on ${g}  ${r.toFixed(2)}${r < min ? '  << FAIL (needs ' + min + ')' : ''}`);
}

for (const theme of ['light', 'dark']) {
  tables[theme] = {};
  for (const [name, R] of Object.entries(ROOMS[theme])) {
    if (check) console.log(`\n${theme} / ${name}`);
    const bg = color(...R.bg), panel = color(...R.panel), ink = color(...R.ink);
    const bg2 = R.bg2 ? color(...R.bg2) : bg;
    const grounds = [bg, bg2, panel];
    const L0 = R.dark ? 0.74 : 0.48;
    const mode = R.dark ? 'dark' : 'light';
    const C = CHART[mode];
    const t = {
      bg, bg2, panel, ink,
      acc: color(...accFill[mode]),
      'acc-ink': solve(TEXT.acc[0], TEXT.acc[1], L0, grounds),
      'on-acc': color(0.22, 0.03, 70),
      link: solve(TEXT.link[0], TEXT.link[1], L0, grounds),
      pos: solve(TEXT.pos[0], TEXT.pos[1], L0, grounds),
      neg: solve(TEXT.neg[0], TEXT.neg[1], L0, grounds)
    };
    for (const k of Object.keys(C)) t[k] = color(...C[k]);
    /* Text on a strong heat-map cell: the panel on a pale room (the cell is
       dark), the band on a dark one (the cell is light). */
    t.onstrong = R.dark ? bg : panel;
    /* Heat-map steps: grey zero, then four steps each way. Lightness is
       spaced to jump the band where neither ink clears 4.5:1, so steps 1–2
       carry the room's ink and steps 3–4 its ground. */
    const HL = R.dark ? [0.36, 0.42, 0.485, 0.70, 0.78] : [0.93, 0.86, 0.79, 0.52, 0.44];
    const HC = [0.006, 0.035, 0.06, 0.095, 0.105];
    t['hm-0'] = color(HL[0], HC[0], 230);
    for (let k = 1; k <= 4; k++) { t['hm-p' + k] = color(HL[k], HC[k], 230); t['hm-n' + k] = color(HL[k], HC[k], 28); }
    tables[theme][name] = t;

    for (const [k, c] of [['ink', ink], ['ink-2', mix(ink, bg, 0.76)], ['faint', mix(ink, bg, 0.70)],
                          ['acc-ink', t['acc-ink']], ['link', t.link], ['pos', t.pos], ['neg', t.neg]]) {
      for (const g of grounds) note(k, c, g, contrast(c, g), 4.5);
    }
    note('pill', bg, ink, contrast(bg, ink), 4.5);
    note('on-acc', t['on-acc'], t.acc, contrast(t['on-acc'], t.acc), 4.5);
    /* Marks are drawn on the panel (the product pictures are panels). */
    for (const k of ['s1', 's2', 's3', 'dneg', 'crit', 'good']) note(k, t[k], panel, contrast(t[k], panel), 3);
    note('hm-0', ink, t['hm-0'], contrast(ink, t['hm-0']), 4.5);
    for (let k = 1; k <= 4; k++) for (const s of ['p', 'n']) {
      const cell = t['hm-' + s + k], txt = k >= 3 ? t.onstrong : ink;
      note('hm-' + s + k, txt, cell, contrast(txt, cell), 4.5);
    }
    for (const k of ['s1', 's2', 's3']) {
      const [L, Cc] = linearToOklch(parse(t[k]));
      const band = mode === 'light' ? [0.43, 0.77] : [0.48, 0.67];
      if (L < band[0] - 0.005 || L > band[1] + 0.005 || Cc < 0.0995) {
        failures++; console.log(`  ${k} ${t[k]} outside the dataviz band: L ${L.toFixed(3)} C ${Cc.toFixed(3)}`);
      }
    }
  }
}

console.log(`\nworst text pair in the file: ${worst.toFixed(2)}:1 (marks scaled to the same footing)`);
if (failures) { console.log(`${failures} failing pair(s)`); process.exit(1); }

/* ---- write -------------------------------------------------------------- */
if (write) {
  const KEYS = ['bg', 'bg2', 'panel', 'ink', 'acc', 'acc-ink', 'on-acc', 'link', 'pos', 'neg',
                's1', 's2', 's3', 'dneg', 'dmid', 'crit', 'good', 'onstrong',
                'hm-0', 'hm-p1', 'hm-p2', 'hm-p3', 'hm-p4', 'hm-n1', 'hm-n2', 'hm-n3', 'hm-n4'];
  const block = (theme, ind) => Object.entries(tables[theme]).map(([name, t]) =>
    ind + KEYS.map((k) => `--k-${name}-${k}: ${t[k]};`).reduce((rows, d, i) => {
      if (i % 5 === 0) rows.push(d); else rows[rows.length - 1] += ' ' + d; return rows;
    }, []).join('\n' + ind)).join('\n\n');

  const rooms = Object.keys(ROOMS.light).map((n) => {
    const sel = n === 'stone' ? `:root, .rm-stone` : `.rm-${n}`;
    return `${sel} {
  --bg: var(--k-${n}-bg); --bg-2: var(--k-${n}-bg2); --panel: var(--k-${n}-panel); --ink: var(--k-${n}-ink);
  --accent: var(--k-${n}-acc); --accent-ink: var(--k-${n}-acc-ink); --on-accent: var(--k-${n}-on-acc);
  --link: var(--k-${n}-link); --pos: var(--k-${n}-pos); --neg: var(--k-${n}-neg);
  --s1: var(--k-${n}-s1); --s2: var(--k-${n}-s2); --s3: var(--k-${n}-s3);
  --div-pos: var(--k-${n}-s1); --div-neg: var(--k-${n}-dneg); --div-mid: var(--k-${n}-dmid);
  --crit: var(--k-${n}-crit); --good: var(--k-${n}-good); --on-strong: var(--k-${n}-onstrong);
  --hm-0: var(--k-${n}-hm-0);
  --hm-p1: var(--k-${n}-hm-p1); --hm-p2: var(--k-${n}-hm-p2); --hm-p3: var(--k-${n}-hm-p3); --hm-p4: var(--k-${n}-hm-p4);
  --hm-n1: var(--k-${n}-hm-n1); --hm-n2: var(--k-${n}-hm-n2); --hm-n3: var(--k-${n}-hm-n3); --hm-n4: var(--k-${n}-hm-n4);
}`;
  }).join('\n');

  const css = `/* ===========================================================================
   LARCH — tokens
   ---------------------------------------------------------------------------
   GENERATED by tools/solve-palette.mjs --write. Edit the script, not this file.

   Six rooms. A room is the whole colour set at once: ground, panel, ink, the
   text hues, and the chart steps that suit its ground. Sections wear a room
   by class (.rm-<name>); the page itself wears stone.

       stone    cool porcelain — the page, platform, governance, team
       sage     pale green-grey — credit decisioning
       mist     fog blue into pale wheat, a gradient — forecasting
       spruce   deep blue-green — fraud and AML
       slate    deep blue-grey — portfolio and market risk
       night    near-black blue — the close and the footer

   Every text pair clears 4.5:1 on its room's band and panel; every chart
   mark clears 3:1 on the panel it is drawn on. Run the script with --check
   for the full table.
   ========================================================================= */

:root {
${block('light', '  ')}

  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block('dark', '    ')}

    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${block('dark', '  ')}

  color-scheme: dark;
}

${rooms}

/* Derived where the room is worn, so a section computes them from its own
   room, not the root's. */
:root, [class*="rm-"] {
  --ink-2: color-mix(in srgb, var(--ink) 76%, var(--bg));
  --faint: color-mix(in srgb, var(--ink) 70%, var(--bg));
  --rule:  color-mix(in srgb, var(--ink) 12%, transparent);
  --grid:  color-mix(in srgb, var(--ink) 9%, var(--panel));
  --sunk:  color-mix(in srgb, var(--ink) 4%, var(--panel));
}

:root {
  --f-display: 'Urbanist', 'Avenir Next', 'Helvetica Neue', Arial, sans-serif;
  --f-body: 'Instrument Sans', 'Helvetica Neue', system-ui, sans-serif;
  --f-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  --maxw: 1240px;
  --gutter: clamp(1rem, 4vw, 2.5rem);
  --r-sm: 10px;
  --r-md: 16px;
  --r-lg: 24px;
  --e-out: cubic-bezier(.16, 1, .3, 1);
}
`;
  const here = dirname(fileURLToPath(import.meta.url));
  writeFileSync(resolve(here, '../css/tokens.css'), css);
  console.log('wrote css/tokens.css');
}
