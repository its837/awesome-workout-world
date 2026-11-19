#!/usr/bin/env node
// Zero-dependency dev server for the game (./web), with caching off.
//   node tools/serve.mjs                -> http://localhost:5173 (this computer only)
//   HOST=0.0.0.0 node tools/serve.mjs   -> also reachable from a tablet on the same Wi-Fi
//
// YOUR OWN FAMILY. The repository holds a made-up starter family (web/profiles.js,
// web/tweaks.js, web/family.js). If there is a folder called family/ next to web/ with files
// of those names in it, they are served INSTEAD, at the same addresses. family/ is left out
// of the repository: it is where a real family lives (see docs/YOUR_FAMILY.md).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = (p) => resolve(fileURLToPath(new URL(p, import.meta.url)));
const webRoot = here('../web');
const familyRoot = here('../family'), FAMILY_FILES = ['profiles.js', 'tweaks.js', 'family.js'];
/** Where one of the family's files is read from: family/ if it has one, else web/. */
const familyFile = (name) => (existsSync(join(familyRoot, name)) ? join(familyRoot, name) : join(webRoot, name));
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    let file = normalize(join(webRoot, path));
    if (file !== webRoot && !file.startsWith(webRoot + sep)) { res.writeHead(403).end(); return; }
    // your own family instead of the starter one, and a list of files that agrees with it
    if (FAMILY_FILES.includes(path.slice(1))) file = familyFile(path.slice(1));
    let data = await readFile(file);
    if (path === '/bundle.json' && existsSync(familyRoot)) {
      const list = JSON.parse(data.toString('utf8'));
      for (const f of list.files || []) if (FAMILY_FILES.includes(f.path)) { const d = await readFile(familyFile(f.path)); f.sha256 = createHash('sha256').update(d).digest('hex'); f.size = d.length; }
      data = Buffer.from(JSON.stringify(list, null, 1) + '\n');
    }
    res.writeHead(200, {
      'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, host, () => {
  console.log(`Merry Miles dev server -> http://localhost:${port}`);
});
