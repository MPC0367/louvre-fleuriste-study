// Serves snapshot/ on 127.0.0.1:4412 so the single-file snapshot can be checked in a browser.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const file = fileURLToPath(new URL('../snapshot/louvre-fleuriste.html', import.meta.url));
http
  .createServer(async (req, res) => {
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('run npm run snapshot first');
    }
  })
  .listen(4412, '127.0.0.1', () => console.log('snapshot on http://127.0.0.1:4412'));
