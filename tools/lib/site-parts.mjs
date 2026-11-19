// Pieces of the website that are made from other files, shared by the preview server
// (tools/site.mjs) and the builder (tools/build-site.mjs), so they can never disagree.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The game's family.js as the website's demo plays it: the starter family, but with three
 * made-up video and music tiles on the home page (they open nothing, and say so), so the
 * page looks like a real home screen without naming anybody's streaming service.
 */
export function demoFamily(root) {
  const text = readFileSync(join(root, 'web', 'family.js'), 'utf8');
  if (!/\n  home: \[\],/.test(text)) throw new Error("web/family.js has no 'home: [],' line to make the demo from");
  return text.replace(/\n  home: \[\],/, "\n  home: ['video', 'shows', 'tunes'],");
}

/**
 * The CUSTOMIZE page: a switch between the two prompts a person can give their AI, with a COPY
 * button. The prompts are the whole of docs/FAMILY_MEETING.md and docs/ROGUE_MEETING.md, made
 * fresh from those files every time, so the page can never be a different prompt from the one
 * in the repository. customize.html#rogue opens it with GO ROGUE chosen.
 */
export function customizePage(root) {
  const family = readFileSync(join(root, 'docs', 'FAMILY_MEETING.md'), 'utf8');
  const rogue = readFileSync(join(root, 'docs', 'ROGUE_MEETING.md'), 'utf8');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Customize it to your family: Awesome Workout World</title>
<meta name="description" content="Two ways to make the game about your family: have a family meeting (your AI asks the questions) or go rogue (you say the dreams, your AI builds them). Pick one, copy the prompt, paste it into your Claude.">
<link rel="icon" href="img/icon.png">
<style>
  :root { --night: #07020f; --panel: #12063a; --ink: #f4f1ff; --dim: #a79fd0; --pink: #ff3fd0; --cyan: #7df9ff; --gold: #fff23f; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--night); color: var(--ink); font: 17px/1.55 ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  a { color: var(--cyan); }
  .wrap { max-width: 880px; margin: 0 auto; padding: 0 16px; }
  .rule { height: 6px; background: repeating-linear-gradient(90deg, #ff3b3b 0 16px, #ff9a3f 16px 32px, #fff23f 32px 48px, #7dff3f 48px 64px, #3fe6ff 64px 80px, #6f6bff 80px 96px, #ff3fd0 96px 112px); }
  header { padding: 24px 0 18px; }
  .back { font-size: 14px; }
  h1 { margin: 14px 0 8px; font-size: clamp(28px, 6.4vw, 52px); line-height: 1; color: #fff7c2; text-shadow: 0 3px 0 #ffb02e, 0 6px 0 #d8451c, 0 0 30px rgba(255, 120, 30, 0.6); }
  p { margin: 0 0 14px; max-width: 44em; }
  .dim { color: var(--dim); }
  .switch { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin: 18px 0 0; }
  .choice { text-align: left; cursor: pointer; font: inherit; color: var(--ink); background: var(--panel); border: 4px solid #3b2a78; padding: 14px 16px; }
  .choice b { display: block; font-size: 22px; color: var(--gold); }
  .choice span { display: block; margin-top: 4px; font-size: 15px; color: var(--dim); }
  .choice[aria-pressed="true"] { border-color: var(--pink); box-shadow: 0 0 22px rgba(255, 63, 208, 0.45); }
  .choice[aria-pressed="true"] b::after { content: "  \\2713"; color: var(--cyan); }
  .bar { position: sticky; top: 0; z-index: 5; background: var(--night); border-bottom: 2px solid var(--pink); padding: 10px 0; }
  .bar .wrap { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .btn { cursor: pointer; font: inherit; font-weight: 700; padding: 11px 20px; color: #101018; background: var(--gold); border: 3px solid; border-color: #fff #55555f #55555f #fff; }
  .btn:active { border-color: #55555f #fff #fff #55555f; }
  pre { margin: 18px 0 50px; padding: 18px; background: var(--panel); border: 3px solid var(--cyan); white-space: pre-wrap; word-wrap: break-word; font: 15px/1.5 ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  pre[hidden] { display: none; }
</style>
</head>
<body>
<header><div class="wrap">
  <a class="back" href="./">&larr; AWESOME WORKOUT WORLD</a>
  <h1>CUSTOMIZE IT TO YOUR FAMILY</h1>
  <p class="dim">Whoever started this is awesome. Pick one, copy the prompt, and paste it into your Claude (Claude Code works best, opened in the folder of this project).</p>
  <div class="switch" role="group" aria-label="How do you want to customize it?">
    <button type="button" class="choice" id="c-family" aria-pressed="true"><b>HAVE A FAMILY MEETING</b><span>...and debate whether penguin milk is a beverage. Your AI asks, you answer.</span></button>
    <button type="button" class="choice" id="c-rogue" aria-pressed="false"><b>GO ROGUE</b><span>...and design it for your family. You dream, your AI builds it.</span></button>
  </div>
</div></header>
<div class="rule"></div>
<div class="bar"><div class="wrap"><button class="btn" id="copy">COPY THE PROMPT</button><span class="dim" id="said">The whole thing below is the prompt.</span></div></div>
<div class="wrap">
  <pre id="p-family">${escapeHtml(family)}</pre>
  <pre id="p-rogue" hidden>${escapeHtml(rogue)}</pre>
</div>
<script>
  var mode = 'family';
  var pre = { family: document.getElementById('p-family'), rogue: document.getElementById('p-rogue') };
  var btn = { family: document.getElementById('c-family'), rogue: document.getElementById('c-rogue') };
  var said = document.getElementById('said');
  function pick(m) {
    mode = m;
    for (var k in pre) { pre[k].hidden = k !== m; btn[k].setAttribute('aria-pressed', k === m ? 'true' : 'false'); }
    said.textContent = 'The whole thing below is the prompt.';
    try { history.replaceState(null, '', m === 'rogue' ? '#rogue' : '#family'); } catch (e) {}
  }
  btn.family.addEventListener('click', function () { pick('family'); });
  btn.rogue.addEventListener('click', function () { pick('rogue'); });
  pick(location.hash === '#rogue' ? 'rogue' : 'family');
  document.getElementById('copy').addEventListener('click', function () {
    var el = pre[mode], text = el.textContent;
    function ok() { said.textContent = 'Copied. Now paste it into your Claude.'; }
    function fallback() { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); said.textContent = 'Selected. Press Cmd+C (or Ctrl+C) to copy it.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  });
</script>
</body>
</html>
`;
}
