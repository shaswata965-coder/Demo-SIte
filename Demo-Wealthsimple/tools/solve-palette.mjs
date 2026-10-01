/* Solve the colour tables in css/tokens.css.

   The muted language is a rule, not a mood: every hue is held to a chroma
   cap (0.05–0.11 in OKLCH — roughly a third of what the AXON demo ran at), and
   then taken to the lightness nearest its target that still clears 4.5:1
   against every ground it can sit on: the section's band (both ends of it,
   on the one section whose band is a gradient) and the panel its cards are
   made of. Nothing below is eyeballed and nothing in the output is a sub-4.5
   pair.

   Grounds are fixed by hand — they are the rooms — and everything else is
   solved against them.

     node tools/solve-palette.mjs           prints the two tables for tokens.css
     node tools/solve-palette.mjs --check   also prints every derived pair

   The derived pairs are the ones css/tokens.css builds with color-mix — the
   two lighter inks, the highlighter under <strong>, the ink pill — checked
   here with the same mixing so the stylesheet cannot drift below 4.5 either.
*/

/* ---- OKLCH → sRGB ------------------------------------------------------- */
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

/* A colour in gamut: if the chroma asked for does not fit at this lightness,
   give up chroma, never lightness. */
function color(L, C, h) {
  let c = C;
  while (c > 0 && !inGamut(oklchToLinear(L, c, h))) c -= 0.002;
  return hex(oklchToLinear(L, Math.max(0, c), h));
}

/* The lightness nearest `L0` that clears `min` against every ground. */
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

/* sRGB mix, as color-mix(in srgb, a p%, b). */
function mix(a, b, p) {
  const A = parse(a).map(enc), B = parse(b).map(enc);
  return '#' + A.map((v, i) => Math.round((v * p + B[i] * (1 - p)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/* ---- the rooms ----------------------------------------------------------
   [L, C, h]. `bg2` is the far end of a band that is a gradient — only dusk.
   `dark` says which way text has to go: light grounds solve downward from
   L 0.50, dark ones upward from L 0.74. */
const HUE = {
  gold:  78,   /* larch needles in October — the brand */
  moss:  140,
  slate: 245,
  clay:  38,
  plum:  330,
  teal:  190
};

const SKINS = {
  light: {
    paper: { bg: [0.952, 0.012, 82],  panel: [0.988, 0.006, 85], ink: [0.215, 0.012, 65],
             con: 'moss', data: 'slate', sig: 'clay', dark: false, canvas: 'ink' },
    sage:  { bg: [0.835, 0.034, 138], panel: [0.958, 0.014, 130], ink: [0.215, 0.022, 145],
             con: 'plum', data: 'slate', sig: 'clay', dark: false, canvas: 'ink' },
    dusk:  { bg: [0.825, 0.028, 252], bg2: [0.885, 0.044, 62], panel: [0.975, 0.010, 70], ink: [0.205, 0.022, 265],
             con: 'moss', data: 'teal', sig: 'clay', dark: false, canvas: 'ink' },
    clay:  { bg: [0.375, 0.066, 42],  panel: [0.418, 0.066, 42], ink: [0.975, 0.008, 75],
             con: 'moss', data: 'slate', sig: 'plum', dark: true, canvas: 'glow' },
    night: { bg: [0.235, 0.028, 178], panel: [0.290, 0.030, 178], ink: [0.955, 0.010, 85],
             con: 'moss', data: 'slate', sig: 'clay', dark: true, canvas: 'glow' }
  },
  dark: {
    paper: { bg: [0.185, 0.008, 75],  panel: [0.235, 0.009, 75], ink: [0.940, 0.010, 85],
             con: 'moss', data: 'slate', sig: 'clay', dark: true, canvas: 'glow' },
    sage:  { bg: [0.285, 0.030, 142], panel: [0.335, 0.032, 142], ink: [0.945, 0.015, 135],
             con: 'plum', data: 'slate', sig: 'clay', dark: true, canvas: 'glow' },
    dusk:  { bg: [0.255, 0.032, 262], bg2: [0.300, 0.040, 48], panel: [0.335, 0.030, 300], ink: [0.950, 0.012, 70],
             con: 'moss', data: 'teal', sig: 'clay', dark: true, canvas: 'glow' },
    clay:  { bg: [0.300, 0.056, 40],  panel: [0.355, 0.058, 40], ink: [0.950, 0.012, 70],
             con: 'moss', data: 'slate', sig: 'plum', dark: true, canvas: 'glow' },
    night: { bg: [0.175, 0.022, 180], panel: [0.215, 0.026, 180], ink: [0.950, 0.010, 85],
             con: 'moss', data: 'slate', sig: 'clay', dark: true, canvas: 'glow' }
  }
};

/* Chroma caps — what keeps it muted. Gold carries a little more because it
   is the one hue that is also a fill. */
const CAP = { gold: 0.105, moss: 0.072, slate: 0.064, clay: 0.092, plum: 0.070, teal: 0.060 };

const check = process.argv.includes('--check');
const tables = {};
let worst = Infinity;

for (const theme of ['light', 'dark']) {
  tables[theme] = {};
  for (const [name, s] of Object.entries(SKINS[theme])) {
    const bg = color(...s.bg), panel = color(...s.panel), ink = color(...s.ink);
    const bg2 = s.bg2 ? color(...s.bg2) : bg;
    const grounds = [bg, bg2, panel];
    const L0 = s.dark ? 0.74 : 0.50;
    const t = {
      bg, bg2, panel, ink,
      /* The accent as a FILL — the model's gold, the focus ring, the progress
         line — is a lighter gold than any ground can carry as text. */
      acc: color(s.dark ? 0.80 : 0.76, CAP.gold, HUE.gold),
      'acc-ink': solve(HUE.gold, CAP.gold, L0, grounds),
      'on-acc': color(0.22, 0.03, 70),
      con: solve(HUE[s.con], CAP[s.con], L0, grounds),
      data: solve(HUE[s.data], CAP[s.data], L0, grounds),
      sig: solve(HUE[s.sig], CAP[s.sig], L0, grounds),
      canvas: s.canvas
    };
    tables[theme][name] = t;

    const pairs = [
      ['ink', ink], ['ink-2', mix(ink, bg, 0.76)], ['faint', mix(ink, bg, 0.70)],
      ['acc-ink', t['acc-ink']], ['con', t.con], ['data', t.data], ['sig', t.sig]
    ];
    const rows = [];
    for (const [k, c] of pairs) for (const g of grounds) {
      const r = contrast(c, g); worst = Math.min(worst, r); rows.push([k, c, g, r]);
    }
    /* The highlighter under <strong>: the structure hue at 24% into the
       band, ink on top. And the ink pill: the band colour on ink. */
    for (const g of [bg, bg2]) {
      const hi = mix(t.con, g, 0.24);
      const r = contrast(ink, hi); worst = Math.min(worst, r); rows.push(['strong', ink, hi, r]);
    }
    const card = mix(t.con, panel, 0.22), rc = contrast(ink, card);
    worst = Math.min(worst, rc); rows.push(['mark/card', ink, card, rc]);
    const pill = contrast(bg, ink); worst = Math.min(worst, pill); rows.push(['pill', bg, ink, pill]);
    const sel = contrast(t['on-acc'], t.acc); worst = Math.min(worst, sel); rows.push(['on-acc', t['on-acc'], t.acc, sel]);
    if (check) {
      console.log(`\n${theme} / ${name}`);
      for (const [k, c, g, r] of rows) console.log(`  ${k.padEnd(8)} ${c} on ${g}  ${r.toFixed(2)}${r < 4.5 ? '  << FAIL' : ''}`);
    }
  }
}

/* ---- print -------------------------------------------------------------- */
const KEYS = [['bg', 'bg2', 'panel', 'ink'], ['acc', 'acc-ink', 'on-acc'], ['con', 'data', 'sig']];
for (const theme of ['light', 'dark']) {
  console.log(`\n/* ${theme} */`);
  for (const [name, t] of Object.entries(tables[theme])) {
    for (const row of KEYS) {
      console.log('  ' + row.map((k) => `--k-${name}-${k}: ${t[k]};`).join('  '));
    }
    console.log(`  --k-${name}-canvas: ${t.canvas};\n`);
  }
}
console.log(`/* worst pair in the file: ${worst.toFixed(2)}:1 */`);
if (worst < 4.5) process.exit(1);
