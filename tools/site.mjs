// Look at the website on this Mac before it is published.
//
//   node tools/site.mjs [port]        then open http://localhost:5181/
//
// It serves site/, with the game (web/) beside it as play/, the same way the publishing
// recipe puts them together (tools/site-workflow.yml). Nothing is copied or built.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoFamily, customizePage } from './lib/site-parts.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = join(ROOT, 'site'), GAME = join(ROOT, 'web');
// What the public sees is the starter family. On this Mac, pass --family to preview the game
// with your own (the family/ folder) instead. Never the default: this is the public page.
const FAMILY = process.argv.includes('--family') ? join(ROOT, 'family') : null, FAMILY_FILES = ['/profiles.js', '/tweaks.js', '/family.js'];
const PORT = Number(process.env.PORT) || Number(process.argv.slice(2).find((a) => /^\d+$/.test(a))) || 5181;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };

createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/play') { res.writeHead(302, { Location: '/play/' }).end(); return; }
  // made from other files, the same way tools/build-site.mjs makes them (see tools/lib/site-parts.mjs)
  if (path === '/customize.html') { try { res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' }).end(customizePage(ROOT)); } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(e.message)); } return; }
  if (path === '/play/family.js' && !FAMILY) { try { res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' }).end(demoFamily(ROOT)); } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(e.message)); } return; }
  let root = SITE;
  if (path.startsWith('/play/')) { root = GAME; path = path.slice('/play'.length); }
  if (path.endsWith('/')) path += 'index.html';
  let file = normalize(join(root, path));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  if (FAMILY && root === GAME && FAMILY_FILES.includes(path)) { try { statSync(join(FAMILY, path)); file = join(FAMILY, path); } catch (e) { /* no such file of your own: the starter one */ } }
  try {
    const st = statSync(file);
    if (!st.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); }
}).listen(PORT, '127.0.0.1', () => console.log(`The website is at http://localhost:${PORT}/`));
