#!/usr/bin/env node
// LEAK CHECK: is anything of the real family in what the repository would publish?
//
//   node tools/leak-check.mjs           look through every tracked file; exit 1 if anything is found
//   node tools/leak-check.mjs --dir X   look through every file in the folder X instead (the website that
//                                       tools/build-site.mjs made), the same way
//
// It reads the words to look for out of the private family folder (family/, which is
// never in the repository): every person's and dog's id and name, the relative who flies
// in, and each line of family/private-words.txt (a surname, an email address, a tablet's
// serial number: anything; "allow <word> in <path>" there lets an ordinary word through). Then it looks for each of them, as a whole word and in any
// mix of capitals, in every tracked text file. With no family/ folder there is nothing
// to protect and it says so.
//
// Pictures cannot be read this way: screenshots for the docs and the website must be
// taken with the starter family (hide family/, or use the website preview, which never
// uses it).
//
// Run it before every push to a public repository. tools/android.sh does not
// run it for you.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FAMILY = join(ROOT, 'family');
if (!existsSync(FAMILY)) { console.log('No family/ folder here: nothing private to look for.'); process.exit(0); }

const words = new Set();
const add = (w) => { w = String(w || '').trim().toLowerCase(); if (w.length >= 3) words.add(w); };
// A made-up name in the starter family is not a leak, even if a real one matches it.
const starter = new Set();
try {
  const { PROFILES } = await import(pathToFileURL(join(ROOT, 'web', 'profiles.js')));
  for (const p of PROFILES) { starter.add(String(p.id).toLowerCase()); starter.add(String(p.name).toLowerCase()); }
} catch (e) { /* no starter family: nothing to excuse */ }
try {
  const { PROFILES } = await import(pathToFileURL(join(FAMILY, 'profiles.js')));
  for (const p of PROFILES) if (!p.guest) { add(p.id); add(p.name); }
} catch (e) { console.log('(could not read family/profiles.js: ' + e.message + ')'); }
try {
  const { FAMILY: F } = await import(pathToFileURL(join(FAMILY, 'family.js')));
  // (the relative who flies in: the last word of their name, so "UNCLE SOMEBODY" gives "somebody")
  add(String(((F && F.relative) || {}).name || '').trim().split(/\s+/).pop());
} catch (e) { console.log('(could not read family/family.js: ' + e.message + ')'); }
// A word that is also an ordinary word (a name that is a month, say) may be allowed in
// particular files: a line "allow <word> in <start of the path>" in private-words.txt.
const ALLOWED = {};
try {
  for (const raw of readFileSync(join(FAMILY, 'private-words.txt'), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^allow\s+(.+?)\s+in\s+(\S+)$/i.exec(line);
    if (m) (ALLOWED[m[1].toLowerCase()] = ALLOWED[m[1].toLowerCase()] || []).push(m[2]);
    else add(line);
  }
} catch (e) { /* no extra words */ }
for (const w of starter) words.delete(w);
if (!words.size) { console.log('family/ names nobody: nothing to look for.'); process.exit(0); }

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tests = [...words].map((w) => ({ w, re: new RegExp(`(^|[^a-z0-9])${esc(w)}($|[^a-z0-9])`, 'i') }));
const dirArg = process.argv.indexOf('--dir');
const BASE = dirArg > 0 ? process.argv[dirArg + 1] : ROOT;
const walk = (d, rel = '') => readdirSync(join(d, rel), { withFileTypes: true }).flatMap((e) => (e.name === '.git' ? [] : e.isDirectory() ? walk(d, join(rel, e.name)) : [join(rel, e.name)]));
const files = dirArg > 0 ? walk(BASE) : execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
const TEXT = /\.(js|mjs|json|html|css|md|txt|sh|kt|kts|xml|yml|yaml|properties|py|command|svg)$|^\.gitignore$/i;
let found = 0, looked = 0, pictures = 0;
for (const f of files) {
  if (!TEXT.test(f)) { if (/\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(f)) pictures++; continue; }
  let text;
  try { text = readFileSync(join(BASE, f), 'utf8'); } catch (e) { continue; }
  looked++;
  const lines = text.split('\n');
  for (const { w, re } of tests) {
    if ((ALLOWED[w] || []).some((p) => f.startsWith(p))) continue;
    for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) { found++; console.log(`${f}:${i + 1}: "${w}"   ${lines[i].trim().slice(0, 90)}`); }
  }
  // the file's own name counts too
  for (const { w, re } of tests) if (re.test(f.replace(/[/._-]/g, ' '))) { found++; console.log(`${f}: its name has "${w}" in it`); }
}
console.log(found
  ? `\n${found} place${found === 1 ? '' : 's'} where the family shows. Do not publish until this says none.`
  : `Nothing of the family in ${looked} text files (looked for ${words.size} words). ${pictures} pictures and videos were NOT looked at: check those by eye.`);
process.exit(found ? 1 : 0);
