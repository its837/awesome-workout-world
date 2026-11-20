// The speed test: "can this tablet keep up?", answered by the tablet itself.
//
// It starts a deliberately busy ride (the thickest forest, every trail buddy, fairy lights
// on, a dog alongside) and runs it for a few seconds at each picture-detail level while
// counting real frames. It reports frames per second, how long the slow frames took, and
// how many milliseconds of each frame went on our own work, then tells Settings > PICTURE
// DETAIL > AUTO which level to start from on this tablet.
//
// From the Mac: tools/android.sh scene bench=1   (the result is also written to the log).
import { W, H } from './config.js';
import { drawText } from './font.js';
import { panel, button, meter } from './ui.js';
import { D, LEVELS, setLevel, applyDetail } from './detail.js';
import { RideScreen } from './ride.js';

const WARM_MS = 1800, RUN_MS = 4500;

export class SpeedTest {
  constructor(app) { this.app = app; this.state = 'idle'; this.results = null; }
  get running() { return this.state === 'running'; }

  /** The busy ride every test uses, so numbers from different days and tablets compare. */
  _ride() {
    const app = this.app;
    const p = app.profiles.find((x) => x.tester) || app.profiles[0];
    const ride = new RideScreen(app, p, 1, { zoneType: 0, progress: 0.3, quick: true, noSave: true, all: true, force: { v: 8 } });
    ['owl', 'cardinal', 'fox', 'penguin'].forEach((id) => ride.rider.addBuddy(id));
    ride.rider.bling.lights = true;
    ride.session.spirit = 1;
    ride.tipped = true;
    return ride;
  }

  /** Returns a promise of the results. */
  start() {
    const app = this.app;
    const done = new Promise((resolve) => { this.onDone = resolve; });
    this.ride = this._ride();
    app.go(this.ride);
    this.ride.lightAll();
    this.queue = LEVELS.slice();
    this.results = [];
    this.state = 'running';
    this._next();
    return done;
  }

  _next() {
    const level = this.queue.shift();
    if (!level) { this._finish(); return; }
    setLevel(level);
    D.choice = 'test';
    this.cur = { level, t: 0, n: 0, time: 0, work: 0, gaps: [] };
  }

  /** Called once per real frame while the test runs. */
  sample(rawMs, workMs) {
    const c = this.cur;
    if (!c || this.app.screen !== this.ride) { this.cancel(); return; }
    if (rawMs > 500) return;
    c.t += rawMs;
    if (c.t < WARM_MS) return;
    if (c.n % 30 === 0) this.ride.lightAll();
    c.n++; c.time += rawMs; c.work += workMs; c.gaps.push(rawMs);
    if (c.time < RUN_MS) return;
    c.gaps.sort((a, b) => a - b);
    this.results.push({
      level: c.level,
      fps: Math.round((c.n * 10000) / c.time) / 10,
      slow: Math.round(c.gaps[Math.floor(c.gaps.length * 0.95)] * 10) / 10,   // 19 frames in 20 were quicker than this
      work: Math.round((c.work / c.n) * 10) / 10,
      sprites: D.stats.sprites, lights: D.stats.lights + D.stats.glows,
    });
    this._next();
  }

  _finish() {
    const app = this.app, set = app.store.settings;
    this.state = 'done';
    this.cur = null;
    const by = {};
    for (const r of this.results) by[r.level] = r;
    // AUTO starts from MEDIUM if the tablet holds it comfortably, otherwise from LIGHT,
    // and if even LIGHT cannot hold 60, from LIGHT at a steady 30 frames a second
    set.autoLevel = by.full && by.full.fps >= 50 ? 'full' : by.medium && by.medium.fps >= 52 ? 'medium' : by.light && by.light.fps >= 50 ? 'light' : 'light30';
    set.speedTest = { when: new Date().toISOString(), slow: app.slow || 1, results: this.results };
    app.store.save();
    applyDetail(set);
    this.ride.paused = true;
    // (the tag lets tools/android.sh speedtest tell this run's line from an older one in the log)
    // On the tablet it goes through the shell too, which writes it as a WARNING: the real tablets are
    // reported to throw ordinary log lines away, and a page's console lines are ordinary whatever we call them.
    try {
      const line = `SPEEDTEST ${new URLSearchParams(location.search).get('benchtag') || '-'} ${JSON.stringify(set.speedTest)}`;
      console.log(line);
      if (window.MerryHost && window.MerryHost.note) window.MerryHost.note(line);
    } catch (e) { /* no console */ }
    if (this.onDone) this.onDone(this.results);
  }

  cancel() {
    if (this.state !== 'running') return;
    this.state = 'idle';
    this.cur = null;
    applyDetail(this.app.store.settings);
  }

  /** What the numbers mean, in a sentence. */
  verdict() {
    const by = {};
    for (const r of this.results) by[r.level] = r;
    const ok = (r) => r && r.fps >= 52;
    if (ok(by.full)) return ['THIS SCREEN KEEPS UP AT EVERY LEVEL.', 'AUTO WILL USE MEDIUM (THE LOOK WE RECOMMEND).'];
    if (ok(by.medium)) return ['MEDIUM RUNS SMOOTHLY HERE. FULL DOES NOT.', 'AUTO WILL USE MEDIUM.'];
    if (by.light && by.light.fps >= 50) return ['ONLY LIGHT RUNS SMOOTHLY HERE.', 'AUTO WILL USE LIGHT.'];
    if (by.light && by.light.fps >= 31) return ['THIS SCREEN CANNOT HOLD 60 FRAMES A SECOND.', 'AUTO WILL USE LIGHT AT A STEADY 30, WHICH LOOKS SMOOTHER THAN A WOBBLE.'];
    return ['EVEN LIGHT IS STRUGGLING ON THIS SCREEN.', 'THE PICTURE NEEDS MORE TRIMMING. NOTE THESE NUMBERS DOWN.'];
  }

  /** Drawn over the ride by the app. */
  draw(ctx) {
    const app = this.app, input = app.input;
    if (this.state === 'running' && this.cur) {
      const c = this.cur, done = this.results.length;
      panel(ctx, W / 2 - 130, 48, 260, 40, { fill: 'rgba(40,26,8,0.94)', border: '#ffd76a' });
      drawText(ctx, `SPEED TEST: ${c.level.toUpperCase()} DETAIL`, W / 2, 54, { scale: 2, align: 'center', color: '#ffe27a' });
      meter(ctx, W / 2 - 110, 76, 220, 6, (done + Math.min(1, c.t / (WARM_MS + RUN_MS))) / LEVELS.length, '#ffd76a');
      return;
    }
    if (this.state !== 'done') return;
    ctx.fillStyle = 'rgba(4,8,30,0.72)';
    ctx.fillRect(0, 0, W, H);
    const pw = 400, ph = 214, px = Math.round(W / 2 - pw / 2), py = Math.round(H / 2 - ph / 2);
    panel(ctx, px, py, pw, ph, { fill: 'rgba(8,14,46,0.96)', border: '#ffd76a' });
    drawText(ctx, 'SPEED TEST', W / 2, py + 10, { scale: 3, align: 'center' });
    const slow = app.slow > 1 ? `  (PRETENDING TO BE ${app.slow}× SLOWER)` : '';
    drawText(ctx, `THE BUSIEST SCENE WE HAVE, AT EACH DETAIL LEVEL${slow}`, W / 2, py + 38, { align: 'center', color: '#9fb6ee' });
    const cols = [px + 22, px + 130, px + 220, px + 312];
    ['DETAIL', 'FRAMES / SEC', 'SLOW FRAMES', 'OUR WORK'].forEach((t, i) => drawText(ctx, t, cols[i], py + 56, { color: '#ffd76a' }));
    this.results.forEach((r, i) => {
      const y = py + 72 + i * 22, good = r.fps >= 52;
      drawText(ctx, r.level.toUpperCase(), cols[0], y, { scale: 2 });
      drawText(ctx, r.fps.toFixed(1), cols[1], y, { scale: 2, color: good ? '#9fe6b0' : r.fps >= 40 ? '#ffe27a' : '#ff8a8a' });
      drawText(ctx, `${r.slow.toFixed(0)} MS`, cols[2], y, { scale: 2 });
      drawText(ctx, `${r.work.toFixed(1)} MS`, cols[3], y, { scale: 2 });
    });
    const v = this.verdict();
    drawText(ctx, v[0], W / 2, py + 144, { align: 'center', color: '#fff6c8' });
    drawText(ctx, v[1], W / 2, py + 156, { align: 'center', color: '#fff6c8' });
    drawText(ctx, 'SMOOTH IS 60 FRAMES A SECOND, WITH SLOW FRAMES UNDER ABOUT 20 MS.', W / 2, py + 170, { align: 'center', color: '#8fa3d6' });
    if (button(ctx, input, px + 24, py + ph - 30, 170, 22, 'RUN IT AGAIN', { kind: 'blue' })) { app.sound.tap(); this.start(); return; }
    if (button(ctx, input, px + pw - 194, py + ph - 30, 170, 22, 'DONE', { kind: 'green' })) { app.sound.tap(); this.state = 'idle'; app.openWorkshop(); }
  }
}
