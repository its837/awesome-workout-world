#!/usr/bin/env node
// Build the public website as plain files, ready to put on any static host (GitHub Pages).
//
//   node tools/build-site.mjs [folder]      default folder: _site/  (made empty first; git-ignored)
//
// What goes in: the TRACKED files of site/ (the page and its pictures), and the TRACKED files
// of web/ (the game) as play/. Tracked only, so nothing that happens to be lying in the project
// folder can slip in. Never the family/ folder: the public game has the starter family.
// Two files are made rather than copied: play/family.js (the demo's made-up home tiles) and
// customize.html (docs/FAMILY_MEETING.md and docs/ROGUE_MEETING.md behind a switch, with a COPY
// button): tools/lib/site-parts.mjs.
// Then the game is stamped (play/bundle.json) so the tablet apps can fetch updates from it,
// and the copy is looked through for the real family's names (tools/leak-check.mjs --dir).
//
// This only builds. It publishes nothing.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoFamily, customizePage } from './lib/site-parts.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = resolve(process.argv[2] || join(ROOT, '_site'));
if (OUT === ROOT || ROOT.startsWith(OUT + '/')) { console.error('That folder would swallow the project. Pick another.'); process.exit(2); }

const tracked = (dir) => execFileSync('git', ['ls-files', '-z', '--', dir], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
const put = (from, to) => { mkdirSync(dirname(to), { recursive: true }); cpSync(from, to); };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let n = 0;
for (const f of tracked('site')) { put(join(ROOT, f), join(OUT, f.slice('site/'.length))); n++; }
for (const f of tracked('web')) { put(join(ROOT, f), join(OUT, 'play', f.slice('web/'.length))); n++; }
writeFileSync(join(OUT, '.nojekyll'), '');     // GitHub Pages: serve every file as it is
writeFileSync(join(OUT, 'play', 'family.js'), demoFamily(ROOT));               // the demo's home page has made-up video and music tiles
writeFileSync(join(OUT, 'customize.html'), customizePage(ROOT));              // the two meeting prompts, from docs/

// The starter family must be the one in play/: nothing here reads family/, but say so out loud.
for (const f of ['profiles.js', 'family.js', 'tweaks.js']) if (!existsSync(join(OUT, 'play', f))) { console.error(`play/${f} is missing: the game would have no family to start from.`); process.exit(1); }

execFileSync('node', [join(ROOT, 'tools', 'publish.mjs'), join(OUT, 'play')], { stdio: 'inherit' });
console.log(`Built ${n} files into ${OUT}`);
console.log(`  page: ${existsSync(join(OUT, 'index.html')) ? 'index.html' : 'MISSING'}   game: play/index.html ${statSync(join(OUT, 'play', 'index.html')).size} bytes`);

try { execFileSync('node', [join(ROOT, 'tools', 'leak-check.mjs'), '--dir', OUT], { stdio: 'inherit' }); }
catch (e) { console.error('\nThe copy shows the family. Do not publish it.'); process.exit(1); }
