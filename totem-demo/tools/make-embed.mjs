/* Produce an embed build of index.html.

   index.html is a complete document — doctype, <html lang>, <head>, <body> —
   which is what you want when hosting it. Some embedding hosts (the Claude
   artifact viewer among them) supply their own document skeleton and drop your
   file inside their <body>, which leaves a second document nested in the first
   and the attributes on <html> discarded.

   This writes dist/index.html containing only what belongs inside a body: the
   title, the stylesheet links, and the page. css/ and js/ are referenced by the
   same relative paths, so publish them alongside it unchanged.

     node tools/make-embed.mjs

   app.js sets lang, data-chapter and data-side on the root itself, so the embed
   build behaves identically to the standalone one.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, '../index.html'), 'utf8');

const head = /<head>([\s\S]*?)<\/head>/.exec(src)[1];
const body = /<body>([\s\S]*?)<\/body>/.exec(src)[1];

const keep = [
  /<title>[\s\S]*?<\/title>/g,
  /<link rel="preconnect"[^>]*>/g,
  /<link rel="stylesheet"[^>]*>/g,
].flatMap((re) => head.match(re) ?? []);

const out = keep.join('\n') + '\n' + body.trimEnd() + '\n';

/* \b so <header> is not mistaken for <head> */
for (const tag of ['doctype', 'html\\b', 'head\\b', 'body\\b']) {
  const hit = new RegExp('</?' + tag, 'i').exec(out);
  if (hit) throw new Error('document tag leaked into embed build: ' + hit[0]);
}

mkdirSync(resolve(here, '../dist'), { recursive: true });
writeFileSync(resolve(here, '../dist/index.html'), out);
console.log(`dist/index.html — ${out.length} bytes`);
