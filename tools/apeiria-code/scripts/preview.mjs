import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};
const port = Number(process.env.APEIRIA_PREVIEW_PORT || 19377);
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname === '/') {
    response.writeHead(302, { Location: '/ui/preview.html' }).end();
    return;
  }
  const file = path.resolve(root, '.' + pathname);
  if (
    !file.startsWith(root + path.sep) ||
    !['/ui/preview.html', '/ui/preview.js', '/dist/webview.js', '/dist/webview.css'].includes(pathname)
  ) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await fs.readFile(file);
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Apeiria Code local UI preview: http://127.0.0.1:${port}/ui/preview.html`),
);
