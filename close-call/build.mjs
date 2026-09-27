// Builds one self-contained page (styles and scripts inlined) for hosts that
// take a single file, such as a claude.ai artifact. The host supplies the
// <!doctype>/<head>/<body> skeleton, so the output is the page content only.
//
//   node build.mjs   ->  dist/close-call.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), 'utf8');
const html = read('index.html');

function section(name) {
  const m = html.match(new RegExp(`<!-- build:${name}[^>]*-->([\\s\\S]*?)<!-- /build:${name} -->`));
  if (!m) throw new Error(`index.html is missing the build:${name} section`);
  return m[1].trim();
}

const stylesheet = '<link rel="stylesheet" href="style.css">';
const head = section('head');
if (!head.includes(stylesheet)) throw new Error('index.html no longer links style.css the way build.mjs expects');

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
// A literal "</script" inside the code would end the inline block early.
const js = scripts.map((src) => `// ${src}\n${read(src)}`).join('\n').replace(/<\/script/gi, '<\\/script');

const out = [
  head.replace(stylesheet, `<style>\n${read('style.css')}</style>`),
  section('body'),
  `<script>\n${js}\n</script>`,
  '',
].join('\n');

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'close-call.html'), out);
console.log(`dist/close-call.html  ${(out.length / 1024).toFixed(1)} KB, ${scripts.length} scripts inlined`);
