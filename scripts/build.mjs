import { mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist/src'), { recursive: true });
for (const file of ['index.html', 'favicon.svg', 'src/app.js', 'src/crossword.js', 'src/style.css']) {
  await copyFile(path.join(root, file), path.join(root, 'dist', file));
}
console.log('Built static site in dist/');
