// A stand-in for GitHub, for trying the log syncing on the emulator without any real key.
//
//   node tools/sync-test-server.mjs            (listens on port 5179)
//
// It answers the three calls android/.../Sync.kt makes (list the logs folder, read one log,
// write one log) and keeps everything in memory. It starts with a pretend bike's log
// holding two rides, so a tablet syncing with it should end up with two rides more.
// Point the emulator's app at it by writing this into its private sync.json:
//   { "api": "http://10.0.2.2:5179", "repo": "test/log", "key": "test" }
import http from 'node:http';
import crypto from 'node:crypto';

const files = new Map();     // name -> text
const sha = (text) => crypto.createHash('sha1').update(text).digest('hex');
files.set('bike.json', JSON.stringify({
  machine: 'bike',
  rides: [
    { id: 'testbike-1', who: 'sam', day: '2026-11-16', kind: 'bike', min: 21, m: 9800, climb: 40, cheer: 300, kcal: 180, trees: 2, rewards: [], stage: 0.4 },
    { id: 'testbike-2', who: 'sam', day: '2026-11-17', kind: 'bike', min: 12, m: 5200, climb: 12, cheer: 150, kcal: 95, trees: 1, rewards: [], stage: 0.2 },
  ],
  opens: [],
}));

http.createServer((req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
  const m = /^\/repos\/[^/]+\/[^/]+\/contents\/logs(?:\/([a-z0-9-]+\.json))?$/.exec(req.url.split('?')[0]);
  if (req.headers.authorization !== 'Bearer test') return send(401, { message: 'Bad credentials' });
  if (!m) return send(404, { message: 'Not Found' });
  const name = m[1];
  if (req.method === 'GET' && !name) {
    console.log('list  ->', [...files.keys()].join(', ') || '(empty)');
    return files.size ? send(200, [...files].map(([n, t]) => ({ name: n, sha: sha(t), type: 'file' }))) : send(404, { message: 'Not Found' });
  }
  if (req.method === 'GET') {
    console.log('read  ', name);
    return files.has(name) ? send(200, files.get(name)) : send(404, { message: 'Not Found' });
  }
  if (req.method === 'PUT') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const j = JSON.parse(body);
      const had = files.get(name);
      if (had !== undefined && j.sha !== sha(had)) { console.log('write ', name, 'REFUSED (stale)'); return send(409, { message: 'stale' }); }
      const text = Buffer.from(j.content, 'base64').toString('utf8');
      files.set(name, text);
      console.log('write ', name, `${JSON.parse(text).rides.length} rides`, `"${j.message}"`);
      send(had === undefined ? 201 : 200, { content: { name, sha: sha(text) } });
    });
    return undefined;
  }
  return send(405, { message: 'no' });
}).listen(5179, () => console.log('stand-in GitHub on http://localhost:5179'));
