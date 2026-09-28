// Serves out/ the way GitHub Pages does, for testing the static demo before deploying (preview louvre-pages).
// Under /louvre-fleuriste-study/: folder → index.html, missing trailing slash → redirect, unknown → 404.html.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4413);
const { BASE } = await import('./pages-config.mjs');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (file, status = 200) => {
    res.writeHead(status, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  };
  if (url.pathname === '/') return res.writeHead(302, { Location: BASE + '/' }).end();
  if (!url.pathname.startsWith(BASE + '/') && url.pathname !== BASE) return send(join(ROOT, '404.html'), 404);
  const rel = decodeURIComponent(url.pathname.slice(BASE.length)) || '/';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT)) return res.writeHead(400).end();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) return res.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
    if (existsSync(join(file, 'index.html'))) return send(join(file, 'index.html'));
  } else if (existsSync(file)) return send(file);
  else if (existsSync(file + '.html')) return send(file + '.html');
  send(join(ROOT, '404.html'), 404);
}).listen(PORT, () => console.log(`static demo: http://localhost:${PORT}${BASE}/`));
