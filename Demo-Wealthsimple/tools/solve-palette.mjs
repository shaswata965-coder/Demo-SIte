/* Solve, check and write css/tokens.css.

   The page is a run of full-bleed rooms, one per section, in the order the
   reference uses them: a near-black opener, paper, two muted mid-darks, paper,
   a deep dark, a light gradient, paper again and a dark close. Each room is a
   ground set by hand in OKLCH plus the inks solved against it. None of the
   reference's own colours is reused.

       spruce   deep blue-green        the opener
       lichen   cool green-grey paper  product menu, about, newsletter, footer
       petrol   muted mid-dark blue    credit decisioning
       olive    smoked olive           the model card
       oxblood  deep red-brown         fraud and AML
       dawn     fog blue to pale wheat liquidity forecasting
       fog      cool pale grey         portfolio risk
       moss     pale lichen green      the newsletter card
       peat     warm near-black        the close

   On every room:  ink 7:1 or better on the whole ground (both ends of a
   gradient), the quieter ink 4.5:1, the pill's label 4.5:1 on the pill, the
   pill 3:1 on the ground, and the room's glow (a graphic accent) 3:1.

   The product screens drawn inside the rooms share one UI set: screen, sunk
   screen, two inks, the brand gold, three status hues and five series. Text
   hues clear 4.5:1 on the screen, the sunk screen and their own tinted pill;
   series clear 3:1 on the screen. The engraved model card is an object, not a
   surface of the page, so it keeps one set of metal in both themes and its
   text is checked against every stop of the metal.

     node tools/solve-palette.mjs           check, print the worst pair
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
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const enc = (v) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
const dec = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const hex = (lin) => '#' + lin.map((v) => Math.round(enc(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const parse = (h) => [1, 3, 5].map((i) => dec(parseInt(h.slice(i, i + 2), 16) / 255));
const lum = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
const contrast = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* If the chroma asked for does not fit at this lightness, give up chroma,
   never lightness. */
function color(L, C, h) {
  let c = C;
  while (c > 0 && !inGamut(oklchToLinear(L, c, h))) c -= 0.002;
  return hex(oklchToLinear(L, Math.max(0, c), h));
}
/* sRGB mix, the same arithmetic as color-mix(in srgb, a p, b). */
function mix(a, b, p) {
  const A = parse(a).map(enc), B = parse(b).map(enc);
  return '#' + A.map((v, i) => Math.round((v * p + B[i] * (1 - p)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
/* Walk lightness away from L0 until the colour clears `min` on every ground.
   `grounds` may be a function of the candidate (a pill tinted by itself). */
function solve(h, C, L0, grounds, min = 4.5) {
  for (let d = 0; d <= 0.8; d += 0.002) {
    for (const L of [L0 - d, L0 + d]) {
      if (L < 0.05 || L > 0.985) continue;
      const c = color(L, C, h);
      const gs = typeof grounds === 'function' ? grounds(c) : grounds;
      if (gs.every((g) => contrast(c, g) >= min)) return c;
    }
  }
  throw new Error(`no lightness clears ${min}:1 for hue ${h}`);
}
/* The quieter ink: the ink pulled toward the ground while it still clears
   4.5:1 with a margin. */
function quieter(ink, toward, grounds, floor = 5.2) {
  let out = ink;
  for (let p = 1; p >= 0.4; p -= 0.01) {
    const c = mix(ink, toward, p);
    if (grounds.every((g) => contrast(c, g) >= floor)) out = c; else break;
  }
  return out;
}

/* ---- rooms ---------------------------------------------------------------
   [L, C, h]. bg2 is the far end of a gradient ground. `dark` sets which way
   the inks go. */
const ROOMS = {
  light: {
    spruce:  { bg: [0.215, 0.026, 200], dark: true },
    lichen:  { bg: [0.958, 0.006, 140] },
    petrol:  { bg: [0.445, 0.042, 232], dark: true },
    olive:   { bg: [0.435, 0.032, 105], dark: true },
    oxblood: { bg: [0.300, 0.048, 20], dark: true },
    dawn:    { bg: [0.862, 0.034, 222], bg2: [0.948, 0.034, 88] },
    fog:     { bg: [0.938, 0.009, 245] },
    moss:    { bg: [0.900, 0.052, 128] },
    peat:    { bg: [0.205, 0.014, 70], dark: true }
  },
  dark: {
    spruce:  { bg: [0.175, 0.022, 200], dark: true },
    lichen:  { bg: [0.200, 0.010, 165], dark: true },
    petrol:  { bg: [0.300, 0.038, 232], dark: true },
    olive:   { bg: [0.290, 0.028, 105], dark: true },
    oxblood: { bg: [0.235, 0.040, 20], dark: true },
    dawn:    { bg: [0.245, 0.030, 240], bg2: [0.290, 0.030, 75], dark: true },
    fog:     { bg: [0.215, 0.012, 250], dark: true },
    moss:    { bg: [0.300, 0.040, 128], dark: true },
    peat:    { bg: [0.165, 0.012, 70], dark: true }
  }
};

/* The product screens. */
const UI = {
  light: { ui: [0.992, 0.003, 200], ui2: [0.962, 0.006, 210], ink: [0.215, 0.016, 235], dark: false },
  dark:  { ui: [0.262, 0.012, 230], ui2: [0.222, 0.012, 230], ink: [0.955, 0.005, 220], dark: true }
};
/* Text hues on screens: [hue, chroma cap]. */
const UI_TEXT = { good: [150, 0.11], bad: [28, 0.13], warn: [70, 0.12], gold: [80, 0.11] };
/* Series on screens, in their fixed order: petrol, gold, violet, sage, brick. */
const SERIES = {
  light: [[0.52, 0.10, 232], [0.64, 0.12, 78], [0.52, 0.11, 295], [0.58, 0.10, 150], [0.57, 0.12, 32]],
  dark:  [[0.68, 0.10, 228], [0.77, 0.12, 82], [0.67, 0.11, 295], [0.71, 0.11, 150], [0.69, 0.12, 32]]
};
/* Room glow: the gold of a larch in autumn on the darks, a deeper brass on
   the lights. [L, C, h] */
const GLOW = { dark: [0.80, 0.11, 85], light: [0.56, 0.11, 75] };

/* The engraved card: brushed champagne metal, five stops. */
const METAL = [[0.905, 0.024, 88], [0.835, 0.032, 82], [0.765, 0.036, 78], [0.865, 0.026, 85], [0.930, 0.018, 92]];

const check = process.argv.includes('--check');
const write = process.argv.includes('--write');
let worst = Infinity, failures = 0;
function note(label, c, g, min) {
  const r = contrast(c, g);
  if (r < min) failures++;
  if (min === 4.5) worst = Math.min(worst, r);
  if (check || r < min) console.log(`  ${label.padEnd(14)} ${c} on ${g}  ${r.toFixed(2)}${r < min ? '  << FAIL (needs ' + min + ')' : ''}`);
}

const tables = {};
for (const theme of ['light', 'dark']) {
  const t = tables[theme] = {};
  for (const [name, R] of Object.entries(ROOMS[theme])) {
    if (check) console.log(`\n${theme} / ${name}`);
    const bg = color(...R.bg), bg2 = R.bg2 ? color(...R.bg2) : bg;
    const grounds = R.bg2 ? [bg, bg2] : [bg];
    const hue = R.bg[2];
    /* Ink: near-white or near-black with a trace of the room's hue. */
    const ink = R.dark ? solve(hue, 0.008, 0.965, grounds, 7) : solve(hue, 0.016, 0.215, grounds, 7);
    const ink2 = quieter(ink, bg, grounds);
    const pill = ink, pillInk = R.bg2 ? bg2 : bg;
    const [gL, gC, gh] = R.dark ? GLOW.dark : GLOW.light;
    const glow = solve(gh, gC, gL, grounds, 3);
    for (const g of grounds) {
      note('ink', ink, g, 7);
      note('ink-2', ink2, g, 4.5);
      note('pill', pill, g, 3);
      note('glow', glow, g, 3);
    }
    note('pill label', pillInk, pill, 4.5);
    t[name] = { bg, bg2, ink, ink2, pill, 'pill-ink': pillInk, glow };
  }

  /* Screens. */
  if (check) console.log(`\n${theme} / screens`);
  const U = UI[theme];
  const ui = color(...U.ui), ui2 = color(...U.ui2), uiInk = color(...U.ink);
  const uiInk2 = quieter(uiInk, ui, [ui, ui2]);
  note('ui-ink', uiInk, ui, 7); note('ui-ink', uiInk, ui2, 7);
  note('ui-ink-2', uiInk2, ui, 4.5); note('ui-ink-2', uiInk2, ui2, 4.5);
  const u = { ui, ui2, 'ui-ink': uiInk, 'ui-ink-2': uiInk2 };
  for (const [k, [h, C]] of Object.entries(UI_TEXT)) {
    const L0 = U.dark ? 0.78 : 0.50;
    /* A status word sits on a pill of its own colour mixed 14% into the
       screen, so that ground depends on the candidate itself. */
    const c = solve(h, C, L0, (cand) => [ui, ui2, mix(cand, ui, 0.14)], 4.5);
    note(k, c, ui, 4.5); note(k, c, ui2, 4.5); note(k + ' on tint', c, mix(c, ui, 0.14), 4.5);
    u[k] = c;
  }
  SERIES[theme].forEach((s, i) => {
    const c = color(...s);
    note('s' + (i + 1), c, ui, 3);
    u['s' + (i + 1)] = c;
  });
  t.ui = u;
}

/* Metal: one set for both themes. */
if (check) console.log('\nmetal');
const metal = METAL.map((m) => color(...m));
const engrave = solve(80, 0.03, 0.30, metal, 4.5);
const engrave2 = quieter(engrave, metal[2], metal, 4.6);
metal.forEach((m) => { note('engrave', engrave, m, 4.5); note('engrave-2', engrave2, m, 4.5); });

console.log(failures ? `\n${failures} pair(s) fail` : `\nall pairs pass; the lowest text pair is ${worst.toFixed(2)}:1`);
if (failures) process.exit(1);

if (write) {
  const block = (theme, pad) => {
    const lines = [];
    for (const [name, vals] of Object.entries(tables[theme])) {
      const prefix = name === 'ui' ? '' : `k-${name}-`;
      lines.push(pad + Object.entries(vals).map(([k, v]) => `--${prefix}${k}: ${v};`).join(' '));
    }
    return lines.join('\n');
  };
  /* The page wears lichen until a section says otherwise. */
  const rooms = Object.keys(ROOMS.light).map((n) => `${n === 'lichen' ? ':root, .rm-lichen' : '.rm-' + n} {
  --bg: var(--k-${n}-bg); --bg-2: var(--k-${n}-bg2); --ink: var(--k-${n}-ink); --ink-2: var(--k-${n}-ink2);
  --pill: var(--k-${n}-pill); --pill-ink: var(--k-${n}-pill-ink); --glow: var(--k-${n}-glow);
}`).join('\n');

  const css = `/* ===========================================================================
   LARCH — tokens
   ---------------------------------------------------------------------------
   GENERATED by tools/solve-palette.mjs --write. Edit the script, not this file.

   Rooms are worn by class (.rm-<name>): a ground (two stops on a gradient
   room), its ink, a quieter ink, the pill and its label, and a glow for the
   pictures. The product screens share one set (--ui…), and the engraved
   model card keeps its own metal in both themes.

   Every text pair clears 4.5:1 (ink 7:1), pills and glows 3:1, screen series
   3:1. Run the script with --check for the full table.
   ========================================================================= */

:root {
${block('light', '  ')}
  ${metal.map((m, i) => `--metal-${i + 1}: ${m};`).join(' ')}
  --engrave: ${engrave}; --engrave-2: ${engrave2};

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
   ground. */
:root, [class*="rm-"] {
  --line: color-mix(in srgb, var(--ink) 16%, transparent);
  --line-strong: color-mix(in srgb, var(--ink) 34%, transparent);
  --veil: color-mix(in srgb, var(--ink) 7%, transparent);
}
:root {
  --ui-line: color-mix(in srgb, var(--ui-ink) 12%, transparent);
  --ui-veil: color-mix(in srgb, var(--ui-ink) 5%, transparent);
}
`;
  const here = dirname(fileURLToPath(import.meta.url));
  writeFileSync(resolve(here, '../css/tokens.css'), css);
  console.log('wrote css/tokens.css');
}
