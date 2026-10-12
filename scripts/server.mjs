import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
const publicFiles = new Set(['/index.html', '/favicon.svg', '/src/app.js', '/src/crossword.js', '/src/style.css']);
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const url = new URL(request.url, 'http://localhost');
    const file = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    if (!publicFiles.has(file)) { response.writeHead(404); response.end('Not found'); return; }
    const content = await readFile(path.join(root, file));
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(400); response.end('Bad request'); }
});
const port = Number(process.env.PORT || 5173);
server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Crossr listening on port ${port}`));
