#!/usr/bin/env node
// Stamp the game for release. Writes web/bundle.json: the version, a build number, and the
// SHA-256 of every file in web/. The tablet app compares build numbers to decide whether an
// update is newer, and checks every downloaded file against its hash.
//
//   node tools/publish.mjs [folder]      (default: web/; tools/build-site.mjs stamps the copy it makes)
//
// Anything that serves the web/ folder can then act as the update address (the dev server
// on this Mac, or a static host such as GitHub Pages).
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('../web', import.meta.url)));

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (relative(root, full) !== 'bundle.json') out.push(full);
  }
  return out;
}

const config = await readFile(join(root, 'src', 'config.js'), 'utf8');
const version = (/VERSION = '([^']+)'/.exec(config) || [])[1] || '0.0.0';
const files = [];
for (const full of (await walk(root)).sort()) {
  const data = await readFile(full);
  files.push({ path: relative(root, full).split(sep).join('/'), sha256: createHash('sha256').update(data).digest('hex'), size: data.length });
}
const manifest = { name: 'merry-miles', version, build: Math.floor(Date.now() / 1000), files };
await writeFile(join(root, 'bundle.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`Stamped ${version} (build ${manifest.build}): ${files.length} files, ${(files.reduce((n, f) => n + f.size, 0) / 1024).toFixed(0)} KB`);
