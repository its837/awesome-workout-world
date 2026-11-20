// App shell: canvas setup, the main loop, and moving between screens.
//
//   Awesome Workout World (launcher.js: the tablet's home page, nothing to do with riding)
//     -> Merry Miles (home.js: who are you? -> your advent calendar) -> Ride -> Summary
//          -> Map / Family calendar / How it works / game Settings / Workshop (test controls)
//     -> things to watch and listen to (handled by the tablet shell)
//     -> Device settings (device.js: updates, the home button, the way back to Peloton)
import { W, H, setViewHeight, VERSION } from './config.js';
import { Input, panel } from './ui.js';
import { drawText, textWidth } from './font.js';
import { ZONES } from './world.js';
import { RideScreen, SKY_LOCKS } from './ride.js';
import { D, CHOICES, applyDetail, Governor } from './detail.js';
import { SpeedTest } from './bench.js';
import { Sound } from './audio.js';
import { Machine } from './machine.js';
import { Store } from './session.js';
import { Season } from './camp.js';
import { Backdrop } from './chrome.js';
import { setTentColors } from './sprites.js';
import { PROFILES } from '../profiles.js';
import { gatedGifts, allGifts } from './gifts.js';
import { LauncherScreen } from './launcher.js';
import { HomeScreen } from './home.js';
import { MapScreen } from './mapscreen.js';
import { AdventScreen } from './advent.js';
import { SettingsScreen } from './settings.js';
import { DeviceScreen } from './device.js';
import { AppsScreen } from './apps.js';
import { WorkshopScreen } from './workshop.js';

const REST_AWAY_MS = 3 * 60 * 1000, REST_IDLE_MS = 5 * 60 * 1000;   // see App.restCheck()

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.fit();
    addEventListener('resize', () => this.fit());
    // back from another app: the home page may play its tune again
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.away = false; });

    this.input = new Input(this.canvas);
    // Is anybody here? (restCheck() below.) A touch or a key counts, and so does the machine moving.
    this.busyAt = Date.now();     // when somebody last did something
    this.seenAt = Date.now();     // when the last frame was drawn: a long gap means the tablet slept, or another app was in front
    this.staged = window.top !== window;   // inside a frame: never tidied away
    const busy = () => { this.busyAt = Date.now(); };
    addEventListener('pointerdown', busy, true);
    addEventListener('keydown', busy, true);
    this.store = new Store();
    this.sound = new Sound();
    this.sound.musicOn = this.store.settings.music !== false;
    this.machine = new Machine();
    this.profiles = PROFILES;
    this.season = new Season(this.store, PROFILES);
    setTentColors(PROFILES.map((p) => p.jacket));
    this.backdrop = new Backdrop(this.machine.kind);
    this.input.onGesture = () => this.sound.unlock();
    this.lastRider = null;
    this.showFps = false;
    // picture detail: what Settings says, an automatic governor for AUTO, and the speed test
    if (!this.store.settings.autoAim) {
      // AUTO used to stop at MEDIUM. It may use FULL now, so every tablet tries from the top once.
      this.store.settings.autoAim = 'balance'; this.store.settings.autoLevel = 'full'; this.store.save();
    }
    applyDetail(this.store.settings);
    this.governor = new Governor();
    this.speedTest = new SpeedTest(this);
    this.slow = 1;        // TEST: pretend this screen is that many times slower (see frame())
    this.workMs = 0;

    // Over-the-air updates are done by the tablet shell; it reports progress here.
    this.update = { state: 'idle', version: VERSION, build: 0, source: '', message: '' };
    window.MerryMiles = window.MerryMiles || {};
    // the family's log, kept in step with the other machine (the tablet does the fetching: Sync.kt)
    this.sync = { state: 'unknown', message: '', at: 0, got: 0 };
    window.MerryMiles.onSync = (answer) => this.onSync(answer);
    const save = this.store.save.bind(this.store);
    this.store.save = () => { save(); this.syncSoon(); };      // anything new is sent a few seconds later
    setTimeout(() => this.syncNow(), 5000);
    setInterval(() => this.syncNow(), 10 * 60 * 1000);
    // the tablet's speech engine hands its words over as a sound file (HostBridge.speak)
    window.MerryMiles.onSpeech = (said) => this.sound.playSpeech(said.wav);
    window.MerryMiles.onUpdate = (info) => {
      try { Object.assign(this.update, typeof info === 'string' ? JSON.parse(info) : info); } catch (e) { /* ignore */ }
    };

    const host = window.MerryHost;
    if (host && host.getUpdateInfo) {
      try { const u = JSON.parse(host.getUpdateInfo()); this.update.version = u.version || VERSION; this.update.build = u.build || 0; this.update.source = u.source || ''; } catch (e) { /* keep ours */ }
    } else {
      // in a browser: the build number is in the stamp that tools/publish.mjs writes
      fetch('bundle.json', { cache: 'no-store' }).then((r) => r.json()).then((b) => { this.update.build = b.build || 0; }).catch(() => {});
    }

    this.screen = null;
    this.note = null;   // a short message shown at the bottom of any screen
    // preview=1: show everything with a pretend family history,
    // without saving a thing. Nothing done in a preview touches the real ride log.
    if (new URLSearchParams(location.search).get('preview') === '1') {
      this.preview = true;
      this.store.save = () => { this.store._stats = null; this.store.rev = (this.store.rev || 0) + 1; };
      this.sound.musicOn = false;
      // pretend it is day ten of the real season (not a made-up early start), with a made-up history
      const s = this.season, away = Math.round((s.thanksgiving() - new Date(new Date().toDateString())) / 86400000) + 9;
      this.store.settings.seasonStart = '';
      this.store.settings.dayOffset = away;
      s.fillDemo();
    }
    if (this.applyScene(new URLSearchParams(location.search))) this.staged = true;   // opened in a particular situation, for a test or a film
    else this.goLauncher();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  /** The workshop tools exist whenever there is no real machine, or when switched on in Settings... */
  get devTools() { return this.machine.isSim || !!this.store.settings.dev; }
  /** ...but only the family's tester (tester: true in profiles.js) ever sees them: on their own calendar and their own rides. */
  // (On a real machine too: once the treadmill was being read for real, the tester's TEST button vanished, and he wants it.)
  canTest(profile) { return !this.plain && !!(profile && profile.tester); }

  /** Match the internal height to the screen (1080p -> 360 rows, the Bike's 1008p -> 336). */
  fit() {
    const aspect = innerHeight / innerWidth;
    const h = aspect > 0.5 && aspect < 0.6 ? Math.round(W * aspect) : 360;
    if (this.canvas.width !== W || this.canvas.height !== h) { this.canvas.width = W; this.canvas.height = h; }
    setViewHeight(h);
    const s = Math.min(innerWidth / W, innerHeight / h);
    this.canvas.style.width = `${Math.floor(W * s)}px`;
    this.canvas.style.height = `${Math.floor(h * s)}px`;
  }

  go(screen) {
    if (this.screen && this.screen.exit) this.screen.exit();
    this.screen = screen;
    document.body.dataset.screen = screen.constructor.name;
    if (screen.enter) screen.enter();
  }
  goLauncher() { this.sound.stopMusic(); this.go(new LauncherScreen(this)); }
  /** The game's front page. who: go straight to that person's own calendar (the step before LET'S GO). */
  goPeople(who) { this.sound.unlock(); this.sound.startMusic(); this.go(new HomeScreen(this, who)); }
  openMap(from) { this.go(new MapScreen(this, from)); }
  /** The family calendar. who: the person whose calendar page to go back to. */
  openAdvent(who) { this.go(new AdventScreen(this, who)); }
  /** The game's own settings (Merry Miles). The tablet's settings are openDevice(). */
  openSettings() { this.go(new SettingsScreen(this)); }
  openDevice() { this.go(new DeviceScreen(this)); }
  /** Everything else on the tablet that can be opened, and the way to Peloton's own home screen. */
  openApps() { this.go(new AppsScreen(this)); }
  /** Songs that are still behind somebody's advent doors are kept out of their songbook. */
  songbookFor(profile) {
    const have = this.season.unlocks(profile.id);
    this.sound.locked = new Set([...gatedGifts(this.profiles)].filter((g) => g.startsWith('tune:') && !have.has(g)).map((g) => g.slice(5)));
  }
  /** who: whose calendar the Workshop goes back to. */
  openWorkshop(who) { this.go(new WorkshopScreen(this, who || (this.screen && this.screen.profile) || null)); }

  /**
   * Open the game in a particular situation, from the address bar or `tools/android.sh scene`.
   * All optional, combine freely:
   *   machine=bike|tread   which machine the simulator pretends to be
   *   rider=<an id>        whose ride (a profile id from profiles.js); starts a ride straight away
   *   zone=frozen-lake     which landscape to start in (its name with dashes); starts a ride
   *   at=0.9               how far through the ride's goal to begin (0..1)
   *   goal=1               the ride's goal in miles (walked or ridden, a mile is a mile)
   *   unlock=1             pretend every advent door is open (not saved)
   *   reward=1             pop a reward choice as soon as the ride starts
   *   buddies=owl,fox      start with those trail buddies (owl cardinal fox penguin turkey kangaroo, or all)
   *   song=rooftop-boogie  the first tune to play (its title with dashes)
   *   time=night|dawn|sunup|day   pin the time of day
   *   detail=auto|full|medium|light   picture detail (saved, like the Settings row)
   *   slow=4               pretend the screen is that many times slower
   *   bench=1              run the speed test straight away
   *   day=+12              pretend it is that many days from now
   *   demo=1               fill in a pretend family history (tents on the map)
   *   preview=1            the same, but nothing is saved
   *   plain=1              no test controls at all, for anybody
   *   test=1               a ride with the TEST button, whoever is riding
   *   empty=1              leave the rider out of the picture (a bare trail, for trying new art on)
   *   door=12              play that advent door opening as the ride starts
   *   thing=relative       set off that advent thing as the ride starts (an id from gifts.js)
   *   gang=1               everybody you have turns up at once
   *   skip=6               the ride is already that many seconds in when it first appears (for taking pictures)
   *   screen=people|setup|map|advent|settings|device|workshop   (setup needs rider=)
   * Returns true if it chose a screen.
   */
  applyScene(q) {
    const day = q.get('day');
    this.plain = q.get('plain') === '1';
    // say=...: speak one sentence once the page is up (tools/android.sh voice uses it to test a tablet's speech)
    const say = q.get('say');
    if (say) setTimeout(() => this.sound.speak(say), 2500);
    if (day !== null && day !== '') this.store.settings.dayOffset = parseInt(day, 10) || 0;
    const detail = (q.get('detail') || '').toLowerCase();
    if (CHOICES.includes(detail)) { this.store.settings.detail = detail; this.store.save(); applyDetail(this.store.settings); }
    const song = (q.get('song') || '').toLowerCase();
    if (song) this.sound.wanted = song;       // e.g. song=neon-snowfall: the first tune played
    const slow = Number(q.get('slow'));
    if (slow > 1) this.slow = Math.min(12, slow);
    if (q.get('bench') === '1') { this.speedTest.start(); return true; }
    const lock = SKY_LOCKS.find((l) => l[0].toLowerCase() === (q.get('time') || '').toLowerCase());
    const buddies = (q.get('buddies') || '').toLowerCase();
    if (q.get('demo') === '1') this.season.pretend();
    if (q.get('unlock') === '1') this.season.forceAll = true;
    const rider = q.get('rider'), zone = q.get('zone');
    if (q.get('screen') === 'setup') { this.goPeople(this.profiles.find((x) => x.id === (rider || '').toLowerCase()) || this.profiles[0]); return true; }
    if (rider || zone || lock || buddies || q.get('door') || q.get('thing')) {
      const p = this.profiles.find((x) => x.id === (rider || '').toLowerCase()) || this.profiles.find((x) => x.tester) || this.profiles[0];
      let type = null;
      if (zone) {
        type = ZONES.findIndex((z) => z.name.toLowerCase().replace(/ /g, '-') === zone.toLowerCase());
        if (type < 0) type = Math.max(0, Math.min(ZONES.length - 1, parseInt(zone, 10) || 0));
      }
      this.go(new RideScreen(this, p, q.get('goal') === null ? 1 : Number(q.get('goal')) || 0, { zoneType: type, progress: Number(q.get('at')) || 0, quick: true, sky: lock ? lock[1] : null, test: q.get('test') === '1' }));
      this.screen.empty = q.get('empty') === '1';
      if (Number(q.get('door')) > 0) this.screen.testDoor(0, Number(q.get('door')));
      const thing = this.screen.testList().length && allGifts(this.profiles).find((t) => t.id === q.get('thing'));
      if (thing) this.screen.testThing(thing);
      if (q.get('reward') === '1') this.screen.nextReward = 0;
      for (const id of buddies === 'all' ? ['owl', 'cardinal', 'fox', 'penguin', 'turkey', 'kangaroo'] : buddies.split(',')) if (id) this.screen.star(id);
      if (q.get('gang') === '1') this.screen.gather(60);
      this.skipAhead = Math.max(0, Math.min(120, Number(q.get('skip')) || 0));   // (done on the first frame: see frame())
      return true;
    }
    const open = { people: () => this.goPeople(), map: () => this.openMap(), advent: () => this.openAdvent(), settings: () => this.openSettings(), device: () => this.openDevice(), apps: () => this.openApps(), workshop: () => this.openWorkshop() }[q.get('screen')];
    if (open) { open(); return true; }
    return false;
  }

  /** Send our rides to the family's shared log and fetch the other machine's. Does nothing off the tablet. */
  syncNow() {
    const host = window.MerryHost;
    if (!host || !host.syncNow) return;
    clearTimeout(this.syncTimer);
    try { this.sync.state = 'busy'; host.syncNow(JSON.stringify(this.store.data)); } catch (e) { this.sync.state = 'error'; }
  }
  syncSoon() { clearTimeout(this.syncTimer); this.syncTimer = setTimeout(() => this.syncNow(), 8000); }
  onSync(answer) {
    if (!answer || answer.state !== 'ok') { this.sync = Object.assign(this.sync, { state: (answer && answer.state) || 'error', message: (answer && answer.message) || '' }); return; }
    const before = this.store.rides.length;
    let changed = false;
    for (const other of answer.others || []) if (this.store.merge(other)) changed = true;
    this.sync = { state: 'ok', message: '', at: Date.now(), got: this.store.rides.length - before, machines: (answer.others || []).length };
    if (changed) this.store.save();      // (which sends the fuller log back up, so every machine ends with everything)
  }

  /** Show a short message at the bottom of whatever screen is up. */
  flash(text) { this.note = { text, t: 0 }; }

  /** Back to the tablet's original home screen (Peloton's). We stay installed; nothing is changed. */
  openPeloton() {
    const host = window.MerryHost;
    this.sound.stopMusic();
    this.away = true;      // off to another app: the home page keeps quiet until we are looked at again
    if (!host || !host.openPeloton) { this.flash("ON THE TABLET THIS OPENS PELOTON'S OWN HOME SCREEN"); return; }
    let ok = false;
    try { ok = !!host.openPeloton(); } catch (e) { ok = false; }
    if (!ok) this.flash('NO OTHER HOME SCREEN WAS FOUND ON THIS TABLET');
  }

  /**
   * NOBODY IS HERE. Go back to the home page, so the next person starts there and not in
   * the middle of somebody's old ride. Two ways to find out:
   *   - nothing was drawn for three minutes (the tablet was asleep, or another app was in front);
   *   - five minutes with the machine stopped and nobody touching the screen.
   * A ride that was under way is ended and saved first, exactly as END RIDE would.
   */
  restCheck() {
    const now = Date.now(), gap = now - this.seenAt;
    this.seenAt = now;
    if (this.machine.speedMph > 0.3 || this.machine.cadence > 5) this.busyAt = now;
    if (this.staged || this.plain || !this.screen || this.speedTest.running) return;
    if (gap > REST_AWAY_MS || now - this.busyAt > REST_IDLE_MS) this.rest();
  }
  rest() {
    this.busyAt = Date.now();
    const s = this.screen;
    if (s instanceof LauncherScreen) return;
    if (s.session && s.finish && !s.ride) s.finish(true);   // a ride: save it, and skip the summary
    this.goLauncher();
  }

  /** The tablet's Home button: back to the launcher, except mid-ride, where it just pauses. */
  homePressed() {
    if (this.screen && this.screen.session && !this.screen.ride) { this.screen.paused = true; return; }
    this.goLauncher();
  }
  /** The tablet's Back gesture: one level up. */
  backPressed() {
    if (this.screen && this.screen.back) this.screen.back();
  }

  /** Open YouTube or Netflix: the installed app on the tablet, a new tab on a computer. */
  watch(service) {
    const host = window.MerryHost;
    try {
      // (the tablet answers false when that service's app is not installed and its website would only refuse us)
      if (host && host.openService) { if (host.openService(service.key) === false) { this.flash(`${service.name} IS NOT ON THIS TABLET YET`); return; } }
      else window.open(service.url, '_blank', 'noopener');
    } catch (e) { /* nothing to open it with */ }
    this.sound.stopMusic();
    this.away = true;
  }

  toggleMusic() {
    const on = !this.sound.musicOn;
    this.sound.setMusic(on);
    this.store.settings.music = on;
    this.store.save();
  }

  checkForUpdate() {
    const host = window.MerryHost;
    if (!host || !host.checkForUpdate) return;
    this.update.state = 'checking';
    this.update.message = 'LOOKING FOR A NEWER VERSION...';
    try { host.checkForUpdate(); } catch (e) { this.update.state = 'error'; this.update.message = 'COULD NOT CHECK'; }
  }

  tick(dt) {
    this.machine.update(dt);
    this.screen.update(dt);
    if (this.note && (this.note.t += dt) > 3.5) this.note = null;
  }

  frame(now) {
    this.restCheck();
    if (this.skipAhead) { const n = this.skipAhead; this.skipAhead = 0; for (let t = 0; t < n; t += 1 / 30) this.tick(1 / 30); }
    // AUTO's last resort on a slow screen: draw on every other refresh, for a steady 30
    if (D.half && !this.speedTest.running && (this.skipNext = !this.skipNext)) { requestAnimationFrame((t) => this.frame(t)); return; }
    const raw = Math.max(0.001, (now - this.last) / 1000);
    const dt = Math.min(0.05, raw);
    this.last = now;
    this.fps = (this.fps || 60) + (1 / raw - (this.fps || 60)) * 0.05;   // smoothed, for the FPS readout
    const t0 = performance.now();
    this.tick(dt);
    this.render();
    let work = performance.now() - t0;
    if (this.slow > 1) {
      // TEST: stand in for a slower tablet by wasting time until this frame has cost
      // `slow` times what it really did. Crude (it knows nothing about the graphics chip),
      // but it shows what a slow screen does to the frame rate and to AUTO detail.
      const until = t0 + work * this.slow;
      while (performance.now() < until) { /* spin */ }
      work *= this.slow;
    }
    this.workMs += (work - this.workMs) * 0.05;
    this.measure(raw * 1000, work);
    if (!this.ready) {
      // tell the tablet shell we started properly (this ends a fresh update's probation)
      this.ready = true;
      const host = window.MerryHost;
      if (host && host.bundleReady) { try { host.bundleReady(); } catch (e) { /* older shell */ } }
    }
    this.sound.update();
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Feed the speed test, or (while somebody is actually riding) the automatic detail governor. */
  measure(rawMs, workMs) {
    if (this.speedTest.running) { this.speedTest.sample(rawMs, workMs); return; }
    const s = this.screen;
    if (!(s instanceof RideScreen) || s.paused) return;
    this.governor.sample(rawMs, workMs);
    const change = this.governor.take();
    if (change) {
      this.store.settings.autoLevel = change.level;
      this.store.save();
      if (this.devTools) s.toast(change.level === 'light30' ? `PICTURE: LIGHT AT A STEADY 30 (WAS ${change.fps} FRAMES A SECOND)` : `PICTURE DETAIL: ${change.level.toUpperCase()} (WAS ${change.fps} FRAMES A SECOND)`);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    const screen = this.screen;
    screen.draw(ctx);
    // (There is no TEST button here any more: test controls are only on the tester's own
    //  calendar and rides. See canTest above, home.js and ride.js.)
    if (this.speedTest.state !== 'idle') this.speedTest.draw(ctx);
    if (this.note) {
      const w = textWidth(this.note.text) + 24;
      panel(ctx, Math.round(W / 2 - w / 2), H - 62, w, 19, { fill: 'rgba(40,26,8,0.94)', border: '#ffd76a' });
      drawText(ctx, this.note.text, W / 2, H - 56, { align: 'center', color: '#ffe27a' });
    }
  }

  /** Debug helper: fast-forward the simulation by some seconds, then draw one frame. */
  skip(seconds) {
    for (let t = 0; t < seconds; t += 1 / 30) this.tick(1 / 30);
    this.render();
  }
  /** Debug helper: run the speed test; resolves with its results (needs the page to be on screen). */
  bench() { return this.speedTest.start(); }
  /** Debug helper: tap at a point in the 640-wide picture, as a finger would. */
  tap(x, y) {
    this.input.taps.push({ x, y });
    this.render();
    this.input.endFrame();
    this.render();
  }
}

window.merry = new App();
