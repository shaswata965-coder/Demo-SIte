/* Produce a single-file embed build of index.html.

   index.html is a complete document — doctype, <html lang>, <head>, <body> —
   split across css/ and js/, which is what you want when hosting it and what
   ports cleanly to React later.

   Embedding is a different problem. A host that supplies its own document
   skeleton drops your file inside its <body>, leaving a second document nested
   in the first and the attributes on <html> discarded; and relative subpath
   requests for css/ and js/ may not resolve the way they do on your server.

   So this writes dist/index.html as ONE file: no doctype, no <html>, no <head>,
   no <body>, and every stylesheet and script inlined. Nothing left to fetch
   except the webfonts. The early inline script at the top of <body> (saved
   theme, motion choice, whether headlines may wait to enter) travels with the
   body, so the embed build behaves like the standalone one.

     node tools/make-embed.mjs

   The same build is the published Artifact. An Artifact is named by its
   <title>, and the name has to be a name — "Larch", not the site's
   "Larch — machine learning, accounted for" — so the artifact build overrides it and
   writes to a tracked file instead of dist/:

     node tools/make-embed.mjs --out artifact.html --title Larch

   artifact.html is generated: edit the sources and rebuild, never the file.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const outPath = arg('--out') ?? 'dist/index.html';
const title = arg('--title');

const src = read('index.html');
const head = /<head>([\s\S]*?)<\/head>/.exec(src)[1];
let body = /<body>([\s\S]*?)<\/body>/.exec(src)[1];

const out = [];

// Title names the artifact; keep it first.
out.push(title ? `<title>${title}</title>` : /<title>[\s\S]*?<\/title>/.exec(head)[0]);

// The webfont is the one thing that stays a network request.
for (const link of head.match(/<link rel="(?:preconnect|stylesheet)"[^>]*>/g) ?? []) {
  const local = /href="((?!https?:)[^"]+)"/.exec(link);
  if (local) out.push(`<style>\n/* ${local[1]} */\n${read(local[1]).trim()}\n</style>`);
  else out.push(link);
}

// Inline every local script and drop its tag from the body.
for (const tag of body.match(/<script src="(?!https?:)[^"]+"><\/script>/g) ?? []) {
  const path = /src="([^"]+)"/.exec(tag)[1];
  body = body.replace(tag, '');
  out.push(`<script>\n/* ${path} */\n${read(path).trim()}\n</script>`);
}

// Body content sits between the styles and the scripts it depends on.
const scripts = out.filter((s) => s.startsWith('<script>'));
const styles = out.filter((s) => !s.startsWith('<script>'));
const result = [...styles, body.trim(), ...scripts].join('\n') + '\n';

// Check the markup only — inlined JS and CSS mention these tags in comments.
// \b so <header> is not mistaken for <head>.
for (const tag of ['doctype', 'html\\b', 'head\\b', 'body\\b']) {
  const hit = new RegExp('</?' + tag, 'i').exec(body);
  if (hit) throw new Error('document tag leaked into embed build: ' + hit[0]);
}
if (/<(script|link)[^>]+(src|href)="(?!https:\/\/fonts\.)/.test(result)) {
  throw new Error('embed build still references a local file');
}

mkdirSync(dirname(resolve(root, outPath)), { recursive: true });
writeFileSync(resolve(root, outPath), result);
console.log(`${outPath} — ${(result.length / 1024).toFixed(1)} KB, self-contained`);
