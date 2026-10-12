import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist/src'), { recursive: true });
const files = ['index.html', 'favicon.svg', 'src/app.js', 'src/crossword.js', 'src/style.css'];
const contents = await Promise.all(files.map(file => readFile(path.join(root, file), 'utf8')));
// Version every asset together so a new page cannot reuse incompatible cached scripts.
const version = createHash('sha256').update(contents.join('\0')).digest('hex').slice(0, 12);
for (let i = 0; i < files.length; i++) {
  let content = contents[i];
  if (files[i] === 'index.html') {
    for (const asset of ['favicon.svg', 'src/style.css', 'src/app.js']) {
      content = content.replace(`"./${asset}"`, `"./${asset}?v=${version}"`);
    }
  } else if (files[i] === 'src/app.js') {
    content = content.replace("from './crossword.js'", `from './crossword.js?v=${version}'`);
  }
  await writeFile(path.join(root, 'dist', files[i]), content);
}
console.log(`Built static site in dist/ (asset version ${version})`);
