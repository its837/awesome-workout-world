// The ride itself: world + rider + snow, the heads-up display, Santa's greeting,
// scoring, mile rewards, the advent doors, and the easter eggs.
import { W, H, SEG, VISUAL_SPEED } from './config.js';
import { clamp, smooth, fmtTime, MILE, FOOT, MONTHS } from './util.js';
import { drawVolume } from './volume.js';
import { TOOLS, ToolFx, BLOOD, SPARKS, SNOWBITS, POOPBITS, GLASS, debrisFor, feathersFor } from './tools.js';

// The scenery: trees and the other big things the trail is made of. The laser gun cannot
// blow these up (a shot throws sparks and knocks a little snow off, and that is all), and
// when a tool is used, anything smaller with a shape of its own (a deer, a snowman, a
// lantern) wins over a piece of scenery that overlaps it.
const SCENERY = new Set(['pine', 'spruce', 'bigtree', 'birch', 'ghost', 'bush', 'rock', 'drift',
  'cabin', 'northpole', 'arch', 'lightarch', 'igloo', 'tent', 'campfire']);
import { drawText, textWidth } from './font.js';
import { panel, button, meter } from './ui.js';
import { World, ZONES } from './world.js';
import { Rider } from './rider.js';
import { Snow } from './snow.js';
import { Session, STAGE_METERS } from './session.js';
import { envAt } from './env.js';
import { drawPortrait, lookOf } from './portraits.js';
import { coatOf } from './dogs.js';
import { giftInfo, giftIcon, gatedGifts, allGifts, hooksOf, EARNED, earnedFor } from './gifts.js';
import { RelativeVisit, RELATIVE } from './relative.js';
import { SantaVisit } from './santa.js';
import { EdwardVisit } from './edward.js';
import { OPEN_AFTER } from './camp.js';
import { songSlug } from './audio.js';
import { uiSprite } from './sprites.js';
import { RIDES, greetingFor } from './text.js';
import { REWARDS, offer, rewardIcon, artCanvas } from './rewards.js';
import { doorCard, stepDoor, drawDoorSide, drawDoorShut, doorIsOut, doorAge, closeDoor, SIDE_W, SIDE_H } from './door.js';
import { SummaryScreen } from './summary.js';
import { devDrawer } from './workshop.js';
import { drawTrailMap } from './mapscreen.js';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const GREET_SECS = 6;
const ITEM_EVERY = 120;                          // seconds of riding before something you have eaten can be eaten again
// The ones who turn up beside you to cheer you on, once their doors are open (visitor.js).
// To add another: write its Visitor, list it here, and give it a catalog entry made with fan('its key') in gifts.js.
const FANS = {
  santa: { Visit: SantaVisit, tapped: 'SEXY SANTA SHIMMIED JUST FOR YOU!' },
  edward: { Visit: EdwardVisit, tapped: 'EDWARD FLEXED JUST FOR YOU!' },
};
const PICK_SECS = 15;                            // untouched, a reward picks itself (never make a runner reach for the screen)
const REWARD_EVERY = { bike: 1, tread: 0.25 };   // miles between rewards

/** What the TEST drawer can pin the sky to (null = follow the ride). */
export const SKY_LOCKS = [['AUTO', null], ['NIGHT', 0.1], ['DAWN', 0.62], ['SUNUP', 0.86], ['DAY', 1]];

/**
 * Time of day for a ride: 0 is deep night, 1 is full morning.
 *
 * Rides happen at night, on both machines. The sky stays dark (it only drifts a little
 * bluer) until the last stretch before the goal: the final 15% of the distance. Over that
 * stretch the stars fade and the peaks turn pink, the sun comes up as the goal is reached,
 * and afterwards it stays a low golden sunrise for as long as you keep going. A free ride
 * treats one trail mile as its goal. With Settings > SKY on ALWAYS NIGHT (or until the
 * SUNRISE advent door is open) the sun never comes up.
 */
export function skyFor(session, mode) {
  const p = session.meters / (session.goalMeters || STAGE_METERS[session.kind]);
  const night = 0.04 + 0.26 * clamp(p / 0.85, 0, 1);
  if (mode === 'night' || p < 0.85) return night;
  if (p < 1) return 0.3 + 0.54 * smooth((p - 0.85) / 0.15);
  return 0.84 + 0.08 * clamp((p - 1) / 0.25, 0, 1);
}

// The stat tiles along the bottom. The last one flips, when tapped, to what the miles have
// burned off in cookies. SHORT is the same numbers for the thin strip you get from the
// little arrow beside the tiles.
const cookies = () => [
  ['MILES', (m, s) => (s.meters / MILE).toFixed(2)],
  ['SUGAR COOKIES', (m, s) => (s.kcal / 80).toFixed(1)],
  ['CANDY CANES', (m, s) => (s.kcal / 50).toFixed(1)],
  ['HOT COCOAS', (m, s) => (s.kcal / 190).toFixed(1)],
];
const TILES = {
  bike: [
    [['CADENCE', (m) => Math.round(m.cadence)]],
    [['RESISTANCE', (m) => Math.round(m.resistance)]],
    [['OUTPUT W', (m) => Math.round(m.power)]],
    [['SPEED MPH', (m) => m.speedMph.toFixed(1)]],
    cookies(),
  ],
  tread: [
    [['SPEED MPH', (m) => m.speedMph.toFixed(1)]],
    [['INCLINE %', (m) => m.inclinePct.toFixed(1)]],
    [['PACE /MI', (m) => (m.speedMph > 0.3 ? fmtTime(3600 / m.speedMph) : '--')]],
    [['CLIMB FT', (m, s) => Math.round(s.climb / FOOT)]],
    cookies(),
  ],
};
const SHORT = {
  bike: [(m) => `${Math.round(m.cadence)} RPM`, (m) => `RES ${Math.round(m.resistance)}`, (m) => `${Math.round(m.power)} W`, (m) => `${m.speedMph.toFixed(1)} MPH`, (m, s) => `${(s.meters / MILE).toFixed(2)} MI`],
  tread: [(m) => `${m.speedMph.toFixed(1)} MPH`, (m) => `${m.inclinePct.toFixed(1)}%`, (m) => (m.speedMph > 0.3 ? `${fmtTime(3600 / m.speedMph)} /MI` : '-- /MI'), (m, s) => `${Math.round(s.climb / FOOT)} FT`, (m, s) => `${(s.meters / MILE).toFixed(2)} MI`],
};

// The live trail panel: how many trail miles it shows ahead at each zoom (0 = the whole trail).
const NAV_SPANS = [0.2, 0.6, 2, 0];
const trim = (v) => String(Math.round(v * 100) / 100);
/** A tiny folded map, for the tab that opens the trail panel. */
function mapIcon(ctx, x, y) {
  ctx.fillStyle = '#c9d8ff'; ctx.fillRect(x, y + 1, 3, 8); ctx.fillRect(x + 7, y + 1, 3, 8);
  ctx.fillStyle = '#9fb6ee'; ctx.fillRect(x + 3, y, 4, 8);
  ctx.fillStyle = '#e8454c'; ctx.fillRect(x + 2, y + 6, 1, 1); ctx.fillRect(x + 4, y + 4, 1, 1); ctx.fillRect(x + 6, y + 3, 1, 1); ctx.fillRect(x + 7, y + 1, 2, 2);
}

export class RideScreen {
  /**
   * goalMiles: how far this outing aims to go, in miles (walked or ridden, a mile is a mile);
   * 0 is a free ride. opts (workshop test rides): { zoneType, progress 0..1, quick: skip the greeting,
   * test: show the TEST button whoever is riding }
   */
  constructor(app, profile, goalMiles, opts = {}) {
    this.app = app;
    this.profile = profile;
    this.kind = app.machine.kind;
    this.goalMiles = goalMiles;
    this.noSave = !!opts.noSave;
    // TEST is only for the family's tester (tester: true in profiles.js), or a ride started from the Workshop
    this.canTest = app.canTest(profile) || (app.devTools && !!opts.test);
    app.lastRider = profile.id;
    const season = app.season;
    // What this rider has had out of the advent calendar so far. Anything that is behind a
    // door they have not opened stays out of the ride; it joins the moment the door opens.
    this.gated = gatedGifts(app.profiles);
    this.unlocked = new Set(opts.all ? this.gated : season.unlocks(profile.id));   // (all: the speed test shows everything)
    app.songbookFor(profile);
    // You set off from wherever your tent stands on the family trail, so every place is
    // where the map says it is, on either machine.
    this.pos0 = profile.guest ? 0 : app.season.position(profile.id);
    this.world = new World({ mode: this.kind, seed: (Date.now() % 9973) + 1, startZ: this.pos0 * STAGE_METERS[this.kind] * VISUAL_SPEED[this.kind] });
    this.world.hide = new Set();   // sights the catalog holds out of this ride (filled in below)
    if (opts.zoneType != null) this.world.gotoZoneType(opts.zoneType);
    // The dogs come and go on your rides once you have opened their doors (and Settings >
    // dog companions is on). Your own dog is around more. The catalog brings them in, below.
    const look = Object.assign({ jacket: profile.jacket }, lookOf(profile));
    this.dogProfiles = app.profiles.filter((p) => p.look && p.look.species === 'dog' && p.id !== profile.id);
    this.rider = new Rider(this.kind, look);
    this.snow = new Snow();   // as many flakes as the picture-detail setting says
    this.session = new Session(profile, this.kind, goalMiles);
    if (opts.progress) this.session.meters = (this.session.goalMeters || STAGE_METERS[this.kind]) * opts.progress;
    this.quick = !!opts.quick;
    this.tileFace = [0, 0, 0, 0, 0];
    this.tileFlip = [9, 9, 9, 9, 9];   // seconds since each tile was flipped
    this.devOpen = false;
    this.songsOpen = false;   // the songbook list (tap the song title)
    this.chomp = null;        // a cookie being eaten
    this.nextPoop = this.kind === 'bike' ? 0.4 + Math.random() * 0.5 : 0.2 + Math.random() * 0.3;   // miles
    this.navZoom = app.store.settings.navZoom == null ? 1 : app.store.settings.navZoom;
    this._camps();
    this.t = 0;
    this.paused = false;
    this.banner = null;
    this.toasts = [];
    this.moments = [];           // what the toasts said, for the ride's log (toast())
    this.pops = [];
    this.greeting = greetingFor(profile.name, season.now(), season.isThanksgiving() ? 'thanksgiving' : '');
    this.done = {};          // one-shot achievements this ride
    this.hold = { fast: 0, steep: 0 };
    this.konami = 0;
    this.rewardEvery = REWARD_EVERY[this.kind];
    const miles0 = this.session.meters / MILE;       // (a test ride can start part-way)
    this.nextMile = Math.floor(miles0) + 1;
    this.nextReward = (Math.floor(miles0 / this.rewardEvery + 1e-6) + 1) * this.rewardEvery;
    this.rewardCount = 0;
    this.pick = null;        // the reward choice on screen, if any
    this.speechTimer = 0;
    this.skyLock = opts.sky != null ? opts.sky : null;   // TEST: pin the time of day
    this.force = opts.force || null;                       // speed test: { v: metres per second } whatever the machine says
    this.devPage = 'ride';
    // THE CATALOG (gifts.js). Every thing there is gets brought into this ride or held out
    // of it by its own hooks; nothing else in this file knows what the things are. To add a
    // thing to the game, add it to the catalog.
    // WHO IS ABOUT. Everything you have had out of the calendar is yours, but it is not all
    // here at once: a couple of buddies and a dog at a time, coming and going (see _direct).
    // Now and then, for half a minute, the whole gang turns up together.
    this.cast = [];              // the trail buddies this rider has, whether or not they are about just now
    this.swapAt = (opts.quick ? 1 : GREET_SECS + 1) + Math.random() * 2;   // when who-is-about next changes (the first time: just after the hello)
    this.gang = 0;               // seconds left of everybody being here together
    this.gangAt = 150 + Math.random() * 330;   // when that next happens
    this.treats = new Set();     // the food you have had out of the calendar: YOUR ITEMS, on the left
    this.tools = new Set(['snowball']);   // the tools you have (tools.js): the TOOLS strip, above YOUR ITEMS. Snowballs from the start; the rest are behind doors
    this.tool = null;            // the one in your hand: with it, a tap on the trail uses it
    this.fx = new ToolFx();      // the laser beam, the finger, and the bits that fly
    this.itemAt = new Map();     // when (in seconds ridden) each can be eaten again
    this.itemsOpen = false;
    this.flurryLeft = 0;
    this.nextFlurry = 80 + Math.random() * 160;
    // The surprises that come and go do it at random, never on a beat: each has a time it
    // is next due, and a wide spread for the one after.
    this.relative = null;        // the relative who flies in, while they are here (a RelativeVisit)
    this.relativeAt = 50 + Math.random() * 260;
    this.fan = null;             // whoever is beside you cheering, while they are here: { key, v (a Visitor) }. One at a time.
    this.fanAt = {};             // when each of them is next due
    for (const key of Object.keys(FANS)) this.fanAt[key] = 70 + Math.random() * 330;
    this.noFan = {};             // the ones whose door is still shut
    this.bear = null;            // a drop bear, while it is holding on
    this.bearAt = 90 + Math.random() * 400;
    this.discoLeft = 0;          // disco snow, while it lasts
    this.discoAt = 70 + Math.random() * 380;
    this.loo = 0;                // outhouses used on this ride
    this.looAt = 100 + Math.random() * 240;   // when the next outhouse turns up beside the trail
    this.sparks = [];            // fireworks
    this.fwLeft = 0; this.fwNext = 0;
    for (const t of allGifts(app.profiles, profile)) {
      const hk = hooksOf(t);
      if (this.has(t.id)) { if (hk.start) hk.start(this, t); } else if (hk.hold) hk.hold(this, t);
    }
    // Things that are earned rather than opened (a streak): on for this ride if the rider has them now.
    this.earned = new Set();
    this._checkEarned(true);
    this.env = envAt(this.skyLock != null ? this.skyLock : skyFor(this.session, this._skyMode()));
    // Advent (camp.js): every minute you ride unlocks the next door whose day has come.
    // An unlocked door hovers on your right until you tap it; then it opens, right there
    // (door.js). One door at a time, in order: nobody opens them for you.
    this.adventOn = season.gating() && season.started() && !profile.guest && !this.noSave;
    this.doorsOpen = season.doorsOpen(profile.id);                // opened (tapped) so far
    this.unlocked0 = this.adventOn ? season.doorsUnlocked(profile.id) : this.doorsOpen;
    this.doorsUnlocked = this.unlocked0;                          // ...and with the minutes ridden on this ride
    this.knock = null;         // the shut door hovering beside you, waiting for a tap: { c, t }
    this.card = null;          // the door that is opening, while its show is on
  }

  /** Has this rider got this advent thing yet? (Things that are not behind any door are always there.) */
  has(gift) { return !this.gated.has(gift) || this.unlocked.has(gift); }
  _skyMode() { return this.app.store.settings.sky === 'night' || this.noSunrise ? 'night' : 'sunrise'; }
  _dogOpts(d) {
    const i = this.dogProfiles.indexOf(d);
    return { id: d.id, poopy: (d.look && d.look.poop) || 1, coat: coatOf(d.look), jacket: d.jacket, name: d.name, side: i % 2 ? -1 : 1, home: 1.5 + Math.floor(i / 2) * 0.95, keen: this.profile.dog === d.id ? 0.85 : 0.45 };
  }

  // --- what the catalog's hooks call (gifts.js: KINDS and SIGHTS) -----------------------
  /** A trail buddy is yours: it joins the ones that come and go (see _direct). */
  arrive(id) { if (!this.cast.includes(id)) this.cast.push(id); }
  /** That buddy, here, now, and staying a while (its door has just opened, or TEST asked for it). */
  star(id) {
    this.arrive(id);
    this.rider.addBuddy(id);
    const b = this.rider.pack.list.find((x) => x.id === id);
    if (b) { b.leaving = false; b.starTill = this.t + 45; }
  }
  /** Everybody you have, all at once, for a little while. */
  gather(secs) {
    this.gang = secs || 22 + Math.random() * 16;
    for (const id of this.cast) { this.rider.addBuddy(id); const b = this.rider.pack.list.find((x) => x.id === id); if (b) b.leaving = false; }
    for (const d of this.rider.dogs) { d.benched = false; if (d.state === 'away') d.nudge(); }
    this.gangAt = this.t + this.gang + 300 + Math.random() * 420;
  }
  /**
   * Decide who is about. Usually one or two buddies and one dog; sometimes nobody for a
   * bit; a change of faces every half minute or so, never on a beat.
   */
  _direct(dt) {
    const pack = this.rider.pack, dogs = this.rider.dogs;
    if (this.gang > 0) {
      if ((this.gang -= dt) > 0) return;
      this.swapAt = this.t;                                          // the party is over: back to a few at a time
      const keep = new Set(pack.about.sort(() => Math.random() - 0.5).slice(0, 1 + (Math.random() < 0.4 ? 1 : 0)));
      for (const id of pack.about) if (!keep.has(id)) pack.leave(id);
    }
    if (this.t >= this.gangAt && this.cast.length + dogs.length >= 4 && !this.pick && !this.card) {
      this.gather();
      this.toast('THE WHOLE GANG IS HERE!');
      this.app.sound.jingle();
      return;
    }
    if (this.t < this.swapAt) return;
    this.swapAt = this.t + 22 + Math.random() * 55;
    const any = (list) => list[Math.floor(Math.random() * list.length)];
    // buddies: one step at a time towards how many should be about for the next while
    const on = pack.about.filter((id) => { const b = pack.list.find((x) => x.id === id); return !(b.starTill > this.t); });
    const off = this.cast.filter((id) => !pack.about.includes(id));
    // (the very first time, somebody always comes: what you have is with you from the start)
    const first = !this.directed; this.directed = true;
    const r = Math.random(), want = !this.cast.length ? 0 : first ? 1 : r < 0.15 ? 0 : r < 0.6 ? 1 : 2;
    if (pack.about.length > want) { if (on.length) pack.leave(any(on)); }
    else if (pack.about.length < want && off.length) this.rider.addBuddy(any(off));
    else if (on.length && off.length && Math.random() < 0.6) { pack.leave(any(on)); this.rider.addBuddy(any(off)); }   // a change of faces
    // dogs: one at a time as a rule (your own dog more than the others), now and then two, now and then none
    if (dogs.length) {
      const free = dogs.filter((d) => !(d.starTill > this.t)), q = Math.random(), n = q < 0.14 ? 0 : q < 0.86 ? 1 : 2;
      const picked = new Set();
      for (let i = 0; i < n && picked.size < free.length; i++) {
        const pool = free.filter((d) => !picked.has(d)), total = pool.reduce((a, d) => a + 0.3 + d.keen, 0);
        let roll = Math.random() * total;
        for (const d of pool) { roll -= 0.3 + d.keen; if (roll <= 0) { picked.add(d); break; } }
      }
      for (const d of free) d.benched = !picked.has(d);
    }
  }
  /** A dog comes along. now: straight away (its door has just opened). force: TEST, whatever Settings says. */
  bringDog(d, now, force) {
    if ((!this.app.store.settings.dogs && !force) || d.id === this.profile.id || this.rider.dogs.some((x) => x.id === d.id)) return null;
    const dog = this.rider.addDog(this._dogOpts(d));
    dog.benched = !now;                       // (the ride decides who is about: _direct)
    if (now) { dog.nudge(); dog.starTill = this.t + 60; }
    return dog;
  }
  /** TEST: that dog, here, now (or, if it is here already, off it goes and back again). */
  callDog(d) {
    const here = this.rider.dogs.find((x) => x.id === d.id);
    if (here) { here.benched = false; here.starTill = this.t + 45; here.nudge(); } else { const dog = this.bringDog(d, true, true); if (dog) dog.test = true; }
  }
  /** A dog stops to go. Sprinkle power poop, if the rider has it, pays out. */
  _poop(dog) {
    if (!dog.poop(!!this.sprinkle)) return false;
    if (this.sprinkle) { this.session.spirit = 1; this.toast(`SPRINKLE POWER POOP! +${this.session.award(300)}`); this.app.sound.fanfare(); }
    return true;
  }
  /** TEST: a poop break now. If no dog is about, one is fetched first. (Not counted in the dog's numbers.) */
  poopNow() {
    const ds = this.rider.dogs;
    if (!ds.length) { const d = this.dogProfiles.find((x) => x.id === this.profile.dog) || this.dogProfiles[0]; if (d) this.callDog(d); }
    const dog = ds.find((x) => x.present) || ds[0];
    if (!dog) return;
    dog.benched = false; dog.starTill = this.t + 30;
    if (!dog.present) { dog.state = 'with'; dog.ox = dog.side * dog.home; dog.dz = 0; dog.timer = 12; dog.squat = false; }
    if (this._poop(dog)) { dog.poops--; if (this.sprinkle) dog.sprinkles--; }
    this.nextPoop = this.session.meters / MILE + 0.3;   // (and not another one straight after)
  }
  /** Fireworks over the trail for a few seconds. */
  fireworks(secs) { this.fwLeft = Math.max(this.fwLeft, secs); this.fwNext = 0; }
  /** A song joins the songbook. play: and starts straight away. */
  newSong(slug, play) {
    const snd = this.app.sound, i = snd.titles.findIndex((t) => songSlug(t) === slug);
    snd.locked.delete(slug);
    if (play && i >= 0 && snd.musicOn) snd.play(i);
  }
  /** Eat something, a bite at a time (update and _chomp do the rest). It can be eaten again in two minutes. */
  eat(id) { this.chomp = { id, t: 0, bites: 0 }; if (this.treats.has(id)) this.itemAt.set(id, this.session.active + ITEM_EVERY); }
  /** Something new for YOUR ITEMS, mid-ride: it is eaten on the spot, and its row on the left glows for a while so you see where it went. */
  newItem(id) { this.treats.add(id); this.itemNew = { id, till: this.t + 7 }; this.eat(id); }
  /** Seconds of riding until an item is ready again (0: eat it now). */
  itemWait(id) { return Math.max(0, (this.itemAt.get(id) || 0) - this.session.active); }
  /** A creature steps out beside the trail just ahead, so a door's gift is seen straight away. */
  stepOut(type, v, x) {
    const w = this.world, side = Math.random() < 0.5 ? -1 : 1, yeti = type === 'yeti';
    const it = { type, v, x: side * (x || (yeti ? 4.4 : 4.6)), s: yeti || x ? 1 : 1.05, flip: side > 0, tap: !x };
    if (!yeti) { it.lit = true; it.litAt = -99; }
    w.addExtra(w.z + (this.kind === 'bike' ? 70 : 34), it);
  }
  /** An outhouse turns up beside the trail a little way ahead. Tap it. */
  outhouse() {
    const w = this.world, side = Math.random() < 0.5 ? -1 : 1;
    w.addExtra(w.z + (this.kind === 'bike' ? 95 : 44), { type: 'outhouse', v: 0, x: side * 4.3, s: 1, flip: side > 0, tap: true, lit: true, litAt: -99 });
    this.looAt = this.t + 150 + Math.random() * 330;
  }
  /** The last door: everything still shut comes along. */
  openEverything() {
    for (const t of allGifts(this.app.profiles, this.profile)) if (t.set !== 'home' && this.gated.has(t.id) && !this.unlocked.has(t.id)) this.give(t, true);
  }
  /** Things that are earned (gifts.js EARNED): switch on whatever the rider has earned by now. */
  _checkEarned(atStart) {
    if (this.profile.guest || this.noSave) return;
    const extra = this.session.meters / STAGE_METERS[this.kind];
    for (const e of earnedFor(this.app.season, this.profile.id, extra)) {
      if (!e.on || this.earned.has(e.id)) continue;
      this.earned.add(e.id);
      EARNED[e.id].start(this);
      if (!atStart) { this.toast(`${e.name} IS YOURS! ${e.blurb}`); this.app.sound.fanfare(); }
    }
  }

  /**
   * An advent door has opened: its thing joins the ride there and then, and is yours from
   * now on. quiet: part of a catch-up, so without the show. What actually happens is the
   * thing's own business (its open hook in gifts.js).
   */
  give(info, quiet) {
    this.unlocked.add(info.id);
    const open = hooksOf(info).open;
    if (open) open(this, info, quiet);
  }

  // --- TEST: the tester can set off anything in the catalog, whatever the calendar says.
  // Nothing here is saved: it only lasts for this ride.
  /** Every thing there is, as TEST buttons: [{ label, run }]. */
  testList() {
    if (this._tests) return this._tests;
    const out = [{ label: 'DOOR ◀', run: () => this.testDoor(-1) }, { label: 'DOOR ▶', run: () => this.testDoor(1) },
      { label: 'EVERYTHING', run: () => { this.openEverything(); this.gather(40); this.toast('DEV: EVERYTHING IS OUT'); } },
      { label: 'OUTHOUSE', run: () => { this.outhouse(); this.toast('DEV: AN OUTHOUSE IS COMING UP'); } },
      { label: 'THE GANG', run: () => { this.gather(); this.toast('THE WHOLE GANG IS HERE!'); } }];
    for (const t of allGifts(this.app.profiles)) {
      if (t.set === 'home' || t.set === 'join' || t.set === 'none') continue;
      out.push({ label: t.tag || t.name.slice(0, 10), run: () => this.testThing(t) });
    }
    for (const id of Object.keys(EARNED)) { const e = EARNED[id]; out.push({ label: e.tag || e.name.slice(0, 10), run: () => { this.earned.add(id); e.start(this); if (e.show) e.show(this); this.toast(`TEST: ${e.name}`); } }); }
    return (this._tests = out);
  }
  /** Bring one thing into this ride and show it straight away. */
  testThing(t) {
    const hk = hooksOf(t);
    this.unlocked.add(t.id);
    if (hk.open) hk.open(this, t, false);
    if (hk.show) hk.show(this, t);
    this.toast(`DEV: ${t.name}`);
  }
  /** Play a door opening: the next one along (dir 1), the one before (-1), or door n. */
  testDoor(dir, n) {
    const season = this.app.season, total = season.doorCount();
    const at = n || ((((this._testDoor || season.doorToday()) + dir - 1) % total) + total) % total + 1;
    this._testDoor = at;
    this.pick = null;
    this.card = doorCard(season, at, this.app.profiles, this.profile);
    this.card.pending = [this.card.info, ...this.card.more];
  }

  /** The door hovering beside you has been tapped: it opens, and what is behind it is yours. */
  _openDoor() {
    const app = this.app, n = this.knock.c.door;
    this.knock = null;
    this.doorsOpen = n;
    this.card = doorCard(app.season, n, app.profiles, this.profile);
    this.card.pending = [this.card.info, ...this.card.more];   // handed over as they pop out
    this.session.award(200);
    app.sound.unlock();
  }

  /**
   * Pitch everybody's tents along this ride. Each person's tent sits where their last
   * outing ended; anyone ahead of us on the family trail is somewhere up the road, and
   * anyone level with us is camped right here at the start.
   */
  _camps() {
    const app = this.app, season = app.season, w = this.world;
    const perStage = STAGE_METERS[this.kind] * VISUAL_SPEED[this.kind];   // world metres per trail stage
    const me = this.profile.guest ? null : this.profile.id;
    const p0 = me ? season.position(me) : 0;
    const z0 = w.z;
    let near = 0;
    app.profiles.forEach((o, idx) => {
      if (o.guest || o.id === me || !season.here(o)) return;
      const dz = (season.position(o.id) - p0) * perStage;
      if (dz < -1) return;                                  // behind us: we will not see them today
      const side = idx % 2 ? 1 : -1, here = dz < 50;
      const z = here ? z0 + 16 + near++ * 6 : z0 + dz;
      w.addExtra(z, { type: 'tent', v: idx, x: side * 3.0, s: 1, flip: false, lit: true, litAt: -99, label: o.name, camp: here ? null : o.id });
    });
    if (me) {
      const idx = app.profiles.indexOf(this.profile);
      w.addExtra(z0 + 6, { type: 'tent', v: idx, x: -3.0, s: 1, flip: false, lit: true, litAt: -99, label: 'YOUR CAMP' });
      w.addExtra(z0 + 7.5, { type: 'campfire', v: 0, x: -1.7, s: 1, flip: false, lit: true, litAt: -99 });
    }
  }

  /** Workshop: switch every tree's lights on. */
  lightAll() {
    for (const items of this.world.items.values()) for (const it of items) if (it.canLight && !it.lit) { it.lit = true; it.litAt = this.t; }
  }

  enter() {
    const app = this.app, s = app.sound;
    app.machine.locked = true;
    s.startMusic();
    if (this.quick) { this.t = GREET_SECS; return; }
    s.hoHoHo();
    this.speechTimer = setTimeout(() => s.speak(this.greeting.spoken), 1100);
  }
  exit() {
    clearTimeout(this.speechTimer);
    this.app.machine.locked = false;
  }

  toast(text) {
    this.toasts.push({ text, t: 0 });
    // the funny things that happened, kept with the ride (extra.moments) for the end-of-season WRAPPED (docs/WRAPPED.md)
    if (!/^(PICTURE|DEV:|TEST:)/.test(text) && this.moments.length < 30) this.moments.push({ at: Math.round(this.t), text: text.replace(/\s*\+\d+$/, '') });
  }

  once(key, text, points) {
    if (this.done[key]) return false;
    this.done[key] = true;
    const got = points ? this.session.award(points) : 0;
    this.toast(got ? `${text} +${got}` : text);
    this.app.sound.chime();
    return true;
  }

  /** Take a mile reward. */
  choose(id) {
    const r = REWARDS[id], s = this.session;
    if (!r || !this.pick) return;
    this.pick = null;
    s.rewards.push(id);
    if (r.set === 'bling') { this.rider.bling[id] = true; this.toast(`${r.name} ON!`); }
    else { this.chomp = { id, t: 0, bites: 0 }; return; }   // eaten a bite at a time first: see update()
    this.app.sound.fanfare();
  }

  update(dt) {
    const app = this.app, m = app.machine, s = this.session, snd = app.sound;
    if (app.input.wasPressed('p') || app.input.wasPressed('Escape')) this.paused = !this.paused;
    if (this.paused) return;
    this.t += dt;

    if (s.update(dt, m)) {
      const got = s.award(500);
      const sunrise = this._skyMode() !== 'night';
      this.banner = { text: `${this.kind === 'tread' ? (sunrise ? 'SUMMIT SUNRISE! ' : 'THE SUMMIT! ') : sunrise ? 'SUNRISE! ' : ''}TODAY'S MILE IS DONE`, t: 0, big: true };
      this.toast(`GOAL BONUS +${got}. KEEP GOING AS LONG AS YOU LIKE`);
      snd.fanfare();
      if (!this.noFireworks) this.fireworks(10);
      if (!this.noFan.santa && !this.fan) this.fanAt.santa = Math.min(this.fanAt.santa, this.t + 4);   // Sexy Santa would not miss this
      this._checkEarned(false);            // today's mile may be the one that completes a streak
    }
    // The relative flies in now and then, once their door is open (relative.js)
    const quiet = this.t > GREET_SECS && !this.pick && !this.card;   // nothing else is asking for attention
    if (this.relative) { this.relative.update(dt, snd); if (this.relative.done) { this.relative = null; this.relativeAt = this.t + 120 + Math.random() * 480; } }
    else if (!this.noRelative && this.t >= this.relativeAt && quiet && !this.fan) this.relative = new RelativeVisit(this.devOpen || Math.random() < 0.5 ? -1 : 1, this.devOpen);
    // The ones who turn up beside you to cheer you on, once their doors are open (FANS above). One at a time, and never while the relative is here.
    if (this.fan) {
      this.fan.v.update(dt, snd);
      if (this.fan.v.done) {
        this.fanAt[this.fan.key] = this.t + 150 + Math.random() * 420;
        for (const k of Object.keys(FANS)) if (k !== this.fan.key) this.fanAt[k] = Math.max(this.fanAt[k], this.t + 40 + Math.random() * 90);   // (and not the other one straight after)
        this.fan = null;
      }
    } else if (quiet && !this.relative) {
      // (the one who has been due longest: asking for Edward must never bring Sexy Santa)
      const key = Object.keys(FANS).filter((k) => !this.noFan[k] && this.t >= this.fanAt[k]).sort((a, b) => this.fanAt[a] - this.fanAt[b])[0];
      if (key) this.fan = { key, v: new FANS[key].Visit(this.devOpen || Math.random() < 0.5 ? -1 : 1, { moving: s.moving, progress: s.progress, done: !!s.goalHit }) };
    }
    if (this.t >= this.looAt && s.moving && quiet) this.outhouse();
    // a drop bear lets go of its tree and lands on your back; it holds on for a bit
    if (this.bear) {
      const b = this.bear, t0 = b.t;
      b.t += dt;
      if (t0 < 0.45 && b.t >= 0.45) { snd.thump(); this.toast('A DROP BEAR HAS LANDED ON YOU!'); }
      if (b.t > b.secs + 0.8) { this.bear = null; this.bearAt = this.t + 200 + Math.random() * 600; }
    } else if (!this.noBear && this.t >= this.bearAt && quiet) this.bear = { t: 0, secs: 7 + Math.random() * 5 };
    // disco snow
    if (this.discoLeft > 0) { if ((this.discoLeft -= dt) <= 0) { this.snow.disco = false; this.discoAt = this.t + 180 + Math.random() * 500; } }
    else if (!this.noDisco && this.t >= this.discoAt && quiet) { this.snow.disco = true; this.discoLeft = 25 + Math.random() * 25; this.toast('DISCO SNOW!'); snd.sparkle(); }
    // fireworks: a rocket every half second or so while they last
    if (this.fwLeft > 0) {
      this.fwLeft -= dt;
      if ((this.fwNext -= dt) <= 0) {
        this.fwNext = 0.25 + Math.random() * 0.6;
        const x = 70 + Math.random() * (W - 140), y = 36 + Math.random() * 70, h0 = Math.random() * 360, n = 34 + ((Math.random() * 20) | 0);
        for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + Math.random() * 0.2, v = (i % 2 ? 34 : 62) + Math.random() * 30; this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + Math.random() * 0.8, h: h0 + (i % 2 ? 0 : 150) }); }
        this.sparks.push({ x: x - 3, y: y - 3, vx: 0, vy: 0, life: 0.22, h: -1, big: 7 });   // the flash
        snd.thump();
      }
    }
    if (this.sparks.length) {
      for (const p of this.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 46 * dt; p.vx *= 1 - dt * 1.2; p.life -= dt; }
      this.sparks = this.sparks.filter((p) => p.life > 0);
    }
    // a buddy with something to say (the turkey): out loud the first time, then only now and then
    for (const b of this.rider.pack.list) if (b.spoke) { if (!this.heard || Math.random() < 0.3) snd.speak(b.spoke.charAt(0) + b.spoke.slice(1).toLowerCase()); this.heard = true; b.spoke = ''; }
    this._direct(dt);
    if (this.flurryLeft > 0) {
      if ((this.flurryLeft -= dt) <= 0) { this.snow.heavy = false; this.nextFlurry = this.t + 150 + Math.random() * 200; }
    } else if (!this.noFlurry && this.t >= this.nextFlurry) { this.snow.heavy = true; this.flurryLeft = 45 + Math.random() * 30; }

    // the dogs earn their own miles: whatever you cover while one is beside you is its distance too
    const went = s.meters - (this.metersSeen || 0);
    this.metersSeen = s.meters;
    if (went > 0 && went < 50) for (const d of this.rider.dogs) if (d.state === 'with' || d.state === 'poop') d.meters += went;
    for (const d of this.rider.dogs) if (d.plop) { d.plop = false; snd.thump(); }
    const v = (this.force ? this.force.v : m.speedMps) * VISUAL_SPEED[this.kind];
    let grade = 0;
    if (s.moving) grade = this.kind === 'tread' ? clamp((m.inclinePct / 100) * 2.2, -0.05, 0.3) : clamp((m.resistance - 38) * 0.004, -0.09, 0.2);
    this.world.spirit = snd.title === 'SILENT NIGHT' ? 1 : s.spirit;
    const events = this.world.update(dt, v, grade, s.spirit, this.t);
    for (const e of events) {
      if (e.type === 'collect') {
        const got = s.award(e.value);
        s.pickups++; s.streak++;
        snd.collect(s.streak);
        this.pops.push({ text: `+${got}`, t: 0, big: e.kind === 'gift' });
        if (s.streak === 12) this.once('twelve', '12 IN A ROW - THE 12 DAYS OF CHRISTMAS!', 120);
      } else if (e.type === 'lit') {
        s.trees++; s.award(2);
        if (Math.random() < 0.5) snd.sparkle();
        if (s.trees === 25) this.once('trees25', '25 TREES LIT!', 100);
        if (s.trees === 100) this.once('trees100', '100 TREES LIT - THE FOREST IS GLOWING!', 300);
      } else if (e.type === 'zone') {
        if (this.t > GREET_SECS) { this.banner = { text: e.name, t: 0 }; snd.chime(); }
      } else if (e.type === 'camp') {
        const who = app.profiles.find((p) => p.id === e.who);
        if (who) { this.toast(`YOU PASSED ${who.name}'S CAMP! +${s.award(50)}`); snd.chime(); }
      }
    }

    const hz = this.force ? 1.4 : this.kind === 'bike' ? m.cadence / 60 : m.speedMps / 1.5;
    this.rider.update(dt, hz, v, this.world.lean || 0);
    if (this.rider.bling.bells && this.rider.jingle && s.moving) snd.jingle();
    this.world.bob = s.moving ? 0.014 * Math.sin(this.rider.phase * 2) : 0;
    this.snow.update(dt, v, this.world.lean || 0);
    snd.tempoScale = this.kind === 'bike' ? clamp(0.9 + (m.cadence - 60) * 0.004, 0.9, 1.12) : clamp(0.92 + m.speedMph * 0.03, 0.92, 1.12);

    // night until the last stretch before the goal, then sunrise (see skyFor)
    this.env = envAt(this.skyLock != null ? this.skyLock : skyFor(s, this._skyMode()));

    // milestones, rewards & hidden achievements
    const miles = s.meters / MILE;
    if (miles >= this.nextMile) {
      const got = s.award(100);
      this.toast(`${this.nextMile} ${this.nextMile === 1 ? 'MILE' : 'MILES'}! +${got}`);
      snd.chime();
      this.nextMile++;
    }
    // the advent calendar: every minute ridden unlocks the next door whose day has come
    if (this.adventOn) {
      const due = Math.min(app.season.doorToday(), this.unlocked0 + Math.floor(s.active / OPEN_AFTER));
      if (due > this.doorsUnlocked) { this.doorsUnlocked = due; snd.chime(); }
    }
    // an unlocked door comes and hovers beside you until it is tapped. One at a time.
    if (!this.knock && !this.card && this.doorsOpen < this.doorsUnlocked && this.t > (this.quick ? 1 : GREET_SECS + 1)) {
      const n = this.doorsOpen + 1;
      this.knock = { c: doorCard(app.season, n, app.profiles, this.profile), t: 0 };
      snd.thump();
    }
    if (this.knock) this.knock.t += dt;
    if (this.card) {
      const c = this.card, more = stepDoor(c, dt, snd);
      if (c.pending && doorIsOut(c)) {                             // out it pops: it is yours (the penguin's milk a little later, when the glass is full)
        c.pending = c.pending.filter((i) => { if (more && doorAge(c) < (i.wait || 0)) return true; this.give(i, false); return false; });
        if (!c.pending.length) c.pending = null;
      }
      if (!more) this.card = null;
    }
    if (!this.pick && !this.card && miles >= this.nextReward) {
      const o = offer(this.rewardCount++, s.rewards, null);     // (the feasts are in YOUR ITEMS now, not on the cards)
      this.pick = { title: o.title, options: o.options, t: 0, at: this.nextReward };
      // One card at a time. If the distance jumped past several reward points at once (the
      // +1 MILE test button, or a machine that hiccups), the ones jumped over are not owed.
      this.nextReward = Math.max(this.nextReward + this.rewardEvery, (Math.floor(miles / this.rewardEvery + 1e-6) + 1) * this.rewardEvery);
      snd.chime();
    }
    if (this.pick) {
      const pk = this.pick;
      pk.t += dt;
      ['1', '2', '3'].forEach((k, i) => { if (this.pick && app.input.wasPressed(k) && pk.options[i]) this.choose(pk.options[i]); });
      if (this.pick && pk.t > PICK_SECS) this.choose(pk.options[(Math.random() * pk.options.length) | 0]);
    }
    this.hold.fast = this.kind === 'bike' && m.cadence >= 110 ? this.hold.fast + dt : 0;
    this.hold.steep = this.kind === 'tread' && m.inclinePct >= 10 && s.moving ? this.hold.steep + dt : 0;
    if (this.hold.fast > 5) this.once('dasher', 'DASHER MODE!', 50);
    if (this.hold.steep > 30) this.once('goat', 'MOUNTAIN GOAT!', 50);
    for (const k of app.input.pressed) {
      this.konami = k === KONAMI[this.konami] ? this.konami + 1 : k === KONAMI[0] ? 1 : 0;
      if (this.konami === KONAMI.length) {
        this.konami = 0;
        this.lightAll();
        this.toast('SANTA SAW THAT.');
        snd.fanfare();
      }
    }
    for (let i = 0; i < this.tileFlip.length; i++) this.tileFlip[i] += dt;

    // a cookie takes three bites, then it fills your spirit
    if (this.chomp) {
      const c = this.chomp;
      c.t += dt;
      const due = c.t < 0.25 ? 0 : Math.min(3, Math.floor((c.t - 0.25) / 0.36) + 1);
      while (c.bites < due) { c.bites++; snd.crunch(); }
      if (c.t > 1.55) { this.chomp = null; s.spirit = 1; this.toast(`YUM! ${REWARDS[c.id].name} +${s.award(150)}`); snd.fanfare(); }
    }
    // about once a mile, one of the dogs has to stop (once that door is open)
    if (!this.noPoop && miles >= this.nextPoop) {
      const here = this.rider.dogs.filter((d) => d.present);
      if (here.length && s.moving) {
        // some dogs have to stop far more often than others: look.poop in profiles.js
        const total = here.reduce((n, d) => n + d.poopy, 0);
        let pick = Math.random() * total, dog = here[0];
        for (const d of here) { if ((pick -= d.poopy) < 0) { dog = d; break; } }
        this._poop(dog);   // (SPRINKLE POWER POOP, earned by a three-day streak: every stop sparkles and pays out)
        this.nextPoop = miles + (2.4 / total) * (0.8 + Math.random() * 0.4);
      } else this.nextPoop = miles + 0.03;
    }

    this.fx.update(dt);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < 0.9);
    if (this.banner && (this.banner.t += dt) > 4.2) this.banner = null;
    if (this.toasts.length && (this.toasts[0].t += dt) > 3.4) this.toasts.shift();
  }

  /** Bring one of the two who cheer, now (or in `wait` seconds), and keep the other away while they are here. */
  callFan(key, wait) {
    this.fan = null;
    this.noFan[key] = false;
    for (const k of Object.keys(FANS)) this.fanAt[k] = k === key ? this.t + wait : Math.max(this.fanAt[k], this.t + wait + 60 + Math.random() * 60);
  }

  /** A tool has just come out of its door: it goes on the strip, glowing so you see where. */
  newTool(id) { this.tools.add(id); this.toolNew = { id, till: this.t + 8 }; }

  /**
   * TOOLS, at the top of the left edge: tap one to pick it up (it lights up), tap it again
   * to put it away. With one in your hand, a tap on the trail uses it there.
   */
  _toolbar(ctx) {
    const list = [...this.tools].filter((id) => TOOLS[id]);
    if (!list.length) return;
    const app = this.app, input = app.input, live = !this.pick && !this.paused;
    const px = 2, top = 50, rowH = list.length > 2 ? 22 : 24, pw = 26;
    panel(ctx, px, top - 2, pw, list.length * rowH + 3, { fill: 'rgba(8,14,46,0.86)', border: 'rgba(125,249,255,0.6)' });
    list.forEach((id, i) => {
      const y = top + i * rowH, on = this.tool === id;
      panel(ctx, px + 2, y, pw - 4, rowH - 2, { fill: on ? 'rgba(150,40,52,0.95)' : 'rgba(20,28,70,0.9)', border: on ? '#ffd76a' : 'rgba(160,190,255,0.35)' });
      const fresh = this.toolNew && this.toolNew.id === id && this.t < this.toolNew.till;
      const toolName = id === 'finger' && this.fx.poopy ? 'POOP FINGER' : TOOLS[id].name;
      if ((on || fresh) && Math.sin(this.t * 9) > -0.2) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(px + 1, y - 1, pw - 2, 1); ctx.fillRect(px + 1, y + rowH - 2, pw - 2, 1); ctx.fillRect(px + 1, y - 1, 1, rowH); ctx.fillRect(px + pw - 2, y - 1, 1, rowH); }
      const icon = giftIcon(id, 18, 16, app.profiles);
      ctx.drawImage(icon, px + 4 + Math.round((18 - icon.width) / 2), y + 2 + Math.round((16 - icon.height) / 2));
      if (live && input.tapIn(px + 2, y, pw - 4, rowH - 2)) {
        this.tool = on ? null : id;
        this.toolSaid = { id, till: this.t + 2.6, away: on };
        if (this.toolNew && this.toolNew.id === id) this.toolNew = null;
        app.sound.tap();
        if (!on) app.sound.speak(toolName.charAt(0) + toolName.slice(1).toLowerCase());
      }
      if (this.toolSaid && this.toolSaid.id === id && this.t < this.toolSaid.till) {
        const text = this.toolSaid.away ? 'PUT AWAY' : `${toolName}: ${TOOLS[id].hint}`, lx = px + pw + 4;
        panel(ctx, lx, y + 3, textWidth(text) + 10, 15, { fill: 'rgba(8,14,46,0.94)', border: '#ffd76a' });
        drawText(ctx, text, lx + 5, y + 7, { color: '#ffffff' });
      }
    });
  }

  /** A tap on the trail with a tool in your hand. */
  _useTool(tap) {
    // not on the controls round the edges
    if (tap.x < 46 || tap.x > W - 34 || tap.y < 46 || tap.y > H - 62 || (this.itemsOpen && tap.x < 140)) return;
    const snd = this.app.sound, to = { x: Math.round(tap.x), y: Math.round(tap.y) };
    const target = this._targetAt(to);
    if (this.tool === 'snowball') {
      snd.poke();
      this.fx.lob(to, () => this._splat(target, to));
      return;
    }
    if (this.tool === 'volleyball') {
      if (this.fx.busy) return;
      snd.toss();
      this.fx.serve(to, () => this._ace(target, to));      // (what it does happens when the ball gets there)
      this.fx.serving.onHit = () => snd.whack();
      return;
    }
    if (this.tool === 'lasergun') {
      snd.pew();
      this.fx.fire(to, () => this._zap(target, to));      // (what it does happens when the shot gets there)
      return;
    }
    if (this.fx.busy) return;
    snd.poke();
    this.fx.jab(to, () => this._pokeAt(target, to));
  }

  /**
   * What is on the trail at a point, for the tools: { buddy, box } or { it, box }, or null.
   * A buddy first (they are nearest). Then things: a deer, a snowman, a lantern or anything
   * else small with a shape of its own wins over a piece of scenery that merely overlaps
   * it, and of scenery only the middle of its picture counts (the corners of its box are air).
   */
  _targetAt(p) {
    const pad = 6, inside = (r) => p.x >= r.x - pad && p.x < r.x + r.w + pad && p.y >= r.y - pad && p.y < r.y + r.h + pad;
    // what a dog has just left on the trail: small, and gone by in a moment, so be generous
    for (const d of this.rider.dogs) { const b = d.pile && d.pile.box; if (b && p.x >= b.x - 16 && p.x < b.x + b.w + 16 && p.y >= b.y - 16 && p.y < b.y + b.h + 16) return { pile: d.pile, dog: d, box: b }; }
    for (const b of this.rider.pack.list) if (b.box && !b.leaving && !b.gone && inside(b.box)) return { buddy: b, box: b.box };
    let scenery = null;
    for (let i = this.world.things.length - 1; i >= 0; i--) {
      const r = this.world.things[i];
      if (r.it.gone) continue;
      if (!SCENERY.has(r.it.type)) { if (inside(r)) return { it: r.it, box: r }; continue; }
      if (!scenery && p.x >= r.x + r.w * 0.22 && p.x < r.x + r.w * 0.78 && p.y >= r.y && p.y < r.y + r.h) scenery = { it: r.it, box: r };
    }
    return scenery;
  }

  /** A snowball has landed. It knocks things about; it does not blow them up. */
  _splat(target, to) {
    const snd = this.app.sound, s = this.session, fx = this.fx;
    const pop = (text, n) => this.pops.push({ text: `${text}+${s.award(n)}`, t: 0 });
    fx.burst(to.x, to.y, SNOWBITS, 16);
    snd.thump();
    if (!target) return;
    if (target.pile) { if (!this.once('poopball', 'A SNOWBALL IN THE POOP. LOVELY.', 10)) pop('', 2); return; }
    if (target.buddy) { this.rider.pack.poke(target.buddy.id); pop('SPLAT! ', 5); return; }
    const it = target.it;
    if (it.type === 'snowman' && it.v < 1) { it.v = 1; it.tapped = true; if (!this.once('frosty', 'SORRY, FROSTY!', 0)) pop('', 5); }
    else if (it.type === 'deer' && it.v < 2) { it.flip = !it.flip; it.sig = -1; pop('SPLAT! ', 5); }
    else if (it.type === 'yeti') this.once('yetiball', 'YOU HIT THE YETI WITH A SNOWBALL. RUN.', 50);
    else pop('', 1);
  }

  /** The serve has arrived: a volleyball is hard, and it bounces. It breaks a streetlamp. */
  _ace(target, to) {
    const snd = this.app.sound, s = this.session, fx = this.fx;
    const pop = (text, n) => this.pops.push({ text: `${text}+${s.award(n)}`, t: 0 });
    if (!target) { fx.burst(to.x, to.y, SNOWBITS, 8); snd.thump(); return; }         // it sails into the snow
    snd.thump();
    if (target.pile) {
      fx.burst(to.x, to.y, POOPBITS, 30);
      if (!this.once('poopace', 'NICE SERVE. STRAIGHT INTO THE POOP.', 10)) pop('', 3);
      return;
    }
    if (target.buddy) { this.rider.pack.poke(target.buddy.id); pop('BOING! ', 8); fx.bounce(to); return; }
    const it = target.it, box = target.box;
    if (it.type === 'lantern') {
      if (it.v === 1) { fx.bounce(to); this.once('lampagain', 'IT WAS ALREADY BROKEN. YOU MONSTER.', 0); return; }
      // the glass goes, and the light with it
      it.v = 1; it.dark = true; it.tapped = true; it.sig = -1;
      const gx = Math.round(box.x + box.w * 0.73), gy = Math.round(box.y + box.h * 0.34);
      fx.burst(gx, gy, GLASS, 46);
      fx.burst(gx, gy, SPARKS, 12);
      fx.bounce(to);
      snd.shatter();
      this.lamps = (this.lamps || 0) + 1;
      this.toast(`YOU BROKE THE LAMP! +${s.award(25)}`);
      if (this.lamps === 1) snd.speak('You broke the lamp!');
      return;
    }
    if (it.type === 'snowman') {
      if (it.v < 2) { it.v = it.v < 1 ? 1 : 2; it.tapped = true; fx.burst(to.x, to.y, SNOWBITS, 18); if (!this.once('spiked', 'SPIKED FROSTY!', 10)) pop('', 5); }
      else fx.bounce(to);
      return;
    }
    if (it.type === 'deer' && it.v < 2) { it.flip = !it.flip; it.sig = -1; pop('BOING! ', 8); fx.bounce(to); return; }
    if (it.type === 'yeti') { this.once('yetiace', 'YOU SERVED THE YETI. RUN.', 50); fx.bounce(to); return; }
    // anything else: a thump, a bounce back at you, and a little snow off it
    fx.burst(to.x, Math.min(to.y, box.y + box.h * 0.4), SNOWBITS, 8);
    fx.bounce(to);
    if (!this.once('ace', 'ACE!', 5)) pop('', SCENERY.has(it.type) ? 2 : 3);
  }

  /** The laser shot has arrived: blow up whatever it hit. */
  _zap(target, to) {
    const snd = this.app.sound, s = this.session, fx = this.fx;
    const points = (n) => this.pops.push({ text: `+${s.award(n)}`, t: 0 });
    if (!target) { fx.burst(to.x, to.y, SPARKS, 10); return; }
    snd.thump();
    if (target.pile) {
      fx.burst(to.x, to.y, POOPBITS, 44);
      if (target.dog.pile === target.pile) target.dog.pile = null;
      if (!this.once('poopzap', 'YOU SHOT THE POOP. IT IS EVERYWHERE NOW.', 20)) points(5);
      return;
    }
    const box = target.box, cx = Math.round(box.x + box.w / 2), cy = Math.round(box.y + box.h * 0.55), size = Math.sqrt(box.w * box.h);
    if (target.buddy) {
      // poof: a cloud of feathers, and no buddy (it turns up again later, like any buddy that wandered off)
      const b = target.buddy, name = REWARDS[b.id] ? (REWARDS[b.id].tag || REWARDS[b.id].name) : 'BUDDY';
      fx.burst(cx, cy, feathersFor(b.id), 46, true);
      fx.burst(cx, cy, SPARKS, 8);
      this.rider.pack.zap(b);
      if (!this.once('poof-' + b.id, `POOF! SO LONG, ${name}`, 15)) points(15);
      return;
    }
    const it = target.it;
    if (it.type === 'deer') {
      if (it.v < 2) {
        const rudolph = it.v === 1;
        it.v += 2; it.tapped = true;
        fx.burst(to.x, to.y, BLOOD, 40);
        if (rudolph) this.toast(`YOU SHOT RUDOLPH. +${s.award(50)}`);
        else if (!this.once('venison', 'VENISON!', 20)) points(20);
      } else fx.burst(to.x, to.y, BLOOD, 12);                 // (already dead. Still bleeds.)
    } else if (it.type === 'snowman') {
      if (it.v !== 3) { it.v = 3; it.tapped = true; if (!this.once('toast', 'FROSTY IS TOAST!', 10)) points(10); }
      fx.burst(cx, cy, SNOWBITS, 34);
    } else if (it.type === 'yeti') { fx.burst(to.x, to.y, SPARKS, 16); this.once('yetizap', 'THE YETI IS LASER PROOF', 0); }
    else if (SCENERY.has(it.type)) {
      // trees, tents, cabins and the like stay where they are: sparks, and a little snow comes off
      fx.burst(to.x, to.y, SPARKS, 14);
      fx.burst(to.x, to.y, SNOWBITS, 10);
    } else {
      // the small things simply go (a lantern, a candy cane, the outhouse): the bigger it was, the more of it flies
      it.gone = true;
      fx.burst(cx, cy, debrisFor(it.type), Math.round(clamp(size * 0.9, 14, 70)));
      fx.burst(cx, cy, SPARKS, 8);
      if (it.type === 'outhouse') { if (!this.once('loo-boom', 'SOMEBODY WAS IN THERE!', 25)) points(10); }
      else if (!this.once('kaboom', 'KABOOM!', 5)) points(size > 60 ? 10 : 5);
    }
  }

  /** The finger has arrived: poke whatever is there. */
  _pokeAt(target, to) {
    const snd = this.app.sound, s = this.session, fx = this.fx;
    const points = (n) => this.pops.push({ text: `+${s.award(n)}`, t: 0 });
    if (!target) return;
    if (target.pile) {
      // The finger goes in. It is a poop finger now, for the rest of the ride.
      fx.poopy = true;
      fx.burst(to.x, to.y, POOPBITS, 12);
      snd.thump();
      this.toast(`POOP FINGER! +${s.award(25)}`);
      snd.speak('Poop finger!');
      return;
    }
    if (target.buddy) { this.rider.pack.poke(target.buddy.id); this.pops.push({ text: `EW! +${s.award(5)}`, t: 0 }); snd.tap(); return; }
    const it = target.it, box = target.box;
    if (it.type === 'snowman' && it.v < 2) {
      it.v = 2; it.tapped = true;
      snd.thump();
      fx.burst(to.x, to.y, SNOWBITS, 14);
      if (!this.once('timber', 'TIMBER!', 10)) points(10);
    } else if (it.type === 'deer' && it.v < 2) { it.flip = !it.flip; it.sig = -1; this.pops.push({ text: `EW! +${s.award(5)}`, t: 0 }); snd.tap(); }
    else if (it.type === 'yeti') this.once('yetipoke', 'YOU POKED THE YETI. BRAVE.', 50);
    else {
      // a tree, a tent, a lantern: it sheds a little snow
      fx.burst(to.x, Math.min(to.y, box.y + box.h * 0.4), SNOWBITS, 8);
      points(2);
      snd.tap();
    }
  }

  _tapWorld(tap) {
    if (this.tool) { this._useTool(tap); return; }
    const snd = this.app.sound, s = this.session;
    for (let i = this.world.taps.length - 1; i >= 0; i--) {
      const r = this.world.taps[i], it = r.it;
      if (tap.x < r.x || tap.x >= r.x + r.w || tap.y < r.y || tap.y >= r.y + r.h || it.tapped) continue;
      it.tapped = true;
      if (it.type === 'snowman') { it.v = 1; snd.thump(); this.pops.push({ text: `+${s.award(5)}`, t: 0 }); this.once('frosty', 'SORRY, FROSTY!', 0); }
      else if (it.type === 'yeti') this.once('yeti', 'YOU SPOTTED THE YETI!', 100);
      else if (it.type === 'outhouse') { it.v = 1; this.loo++; this.toast(`${this.loo > 1 ? 'AGAIN? ' : ''}AHHH. THAT IS BETTER! +${s.award(75)}`); s.spirit = Math.min(1, s.spirit + 0.25); snd.chime(); }
      else if (it.type === 'deer') {
        if (it.v === 1) { this.toast(`RUDOLPH! +${s.award(25)}`); snd.chime(); } else { this.pops.push({ text: `+${s.award(10)}`, t: 0 }); snd.tap(); }
      }
      return;
    }
  }

  /** End the ride and save it. quiet: nobody is here to read a summary (main.js rest()), so do not show one. */
  finish(quiet) {
    const s = this.session, app = this.app;
    // (open: this outing lasted the minute that opens the day's advent door.
    //  dogs: how far each dog ran beside you and how often it stopped: their own miles and stats)
    const dogs = {};
    for (const d of this.rider.dogs) if (d.id && !d.test && (d.meters > 1 || d.poops)) { dogs[d.id] = { m: Math.round(d.meters), poops: d.poops }; if (d.sprinkles) dogs[d.id].sprinkles = d.sprinkles; }
    this.dogRuns = this.rider.dogs.filter((d) => dogs[d.id]).map((d) => ({ name: d.name, m: d.meters, poops: d.poops }));
    const extra = { open: s.active >= OPEN_AFTER ? 1 : 0 };
    // (unlocked, opened: how far along the calendar this rider had got when the ride ended)
    // (start: which calendar those two numbers were counted on. camp.js only believes them on the same one.)
    if (this.adventOn) { extra.unlocked = this.doorsUnlocked; extra.opened = this.doorsOpen; extra.start = app.season.startKey(); }
    if (Object.keys(dogs).length) extra.dogs = dogs;
    if (this.moments.length) extra.moments = this.moments;
    this.saved = s.active > 20 && !this.profile.guest && !this.noSave ? app.store.addRide(this.profile.id, s, app.season.today(), extra) : null;
    if (!quiet) app.go(new SummaryScreen(app, this));
  }

  back() { this.paused = !this.paused; }

  draw(ctx) {
    const app = this.app, input = app.input, m = app.machine, s = this.session, env = this.env;
    this.world.render(ctx, env, this.t, (c, x, y, ppm) => { this.at = { x, y, ppm }; if (!this.empty) this.rider.draw(c, x, y, ppm, env); });
    if (this.bear && this.at) this._bear(ctx);
    this.snow.draw(ctx, env);
    if (this.sparks.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.sparks) {
        ctx.globalAlpha = clamp(p.life / 0.5, 0, 1);
        ctx.fillStyle = p.h < 0 ? '#fff6c8' : `hsl(${Math.round(p.h % 360)},100%,68%)`;
        const sz = p.big || (p.life > 0.7 ? 3 : 2);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
        if (!p.big && p.life > 0.5) { ctx.globalAlpha *= 0.45; ctx.fillRect(Math.round(p.x - p.vx * 0.05), Math.round(p.y - p.vy * 0.05), 2, 2); }   // a short tail
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    this.fx.draw(ctx, this.t, this.profile.look && Array.isArray(this.profile.look.skin) ? this.profile.look.skin : null);

    // floating "+10"s above the rider
    for (const p of this.pops) {
      drawText(ctx, p.text, W / 2 + 22, this.world.riderY - 96 - p.t * 34, { scale: p.big ? 2 : 1, color: '#ffe27a', align: 'center' });
    }

    if (this.fan) this._fan(ctx);
    if (this.relative) this._relative(ctx);
    if (this.chomp) this._chomp(ctx);
    this._hud(ctx, m, s);
    this._nav(ctx, s);
    this._toolbar(ctx);
    this._items(ctx);
    if (this.knock) this._knock(ctx);
    if (this.card) this._door(ctx);
    this._greeting(ctx);

    const picking = this.pick && !this.paused;
    if (picking) this._pick(ctx, input);

    if (this.banner && !picking && !this.card) {
      const b = this.banner, a = clamp(Math.min(b.t / 0.35, (4.2 - b.t) / 0.5), 0, 1);
      const scale = 2, w = textWidth(b.text, scale) + 28;
      ctx.globalAlpha = a;
      panel(ctx, W / 2 - w / 2, 52, w, 24, { fill: b.big ? 'rgba(150,30,44,0.9)' : 'rgba(8,14,46,0.82)', border: b.big ? '#ffd76a' : undefined });
      drawText(ctx, b.text, W / 2, 57, { scale, align: 'center', color: b.big ? '#fff6c8' : '#ffffff' });
      ctx.globalAlpha = 1;
    }
    if (this.toasts.length) {
      const tt = this.toasts[0], a = clamp(Math.min(tt.t / 0.25, (3.4 - tt.t) / 0.4), 0, 1);
      const w = textWidth(tt.text, 1) + 22, y = picking ? 170 : this.banner ? 82 : 58;
      ctx.globalAlpha = a;
      panel(ctx, W / 2 - w / 2, y, w, 17, { fill: 'rgba(40,26,8,0.9)', border: '#ffd76a' });
      drawText(ctx, tt.text, W / 2, y + 5, { align: 'center', color: '#ffe27a' });
      ctx.globalAlpha = 1;
    }

    if (!this.paused && this.t > GREET_SECS && !s.moving) {
      if (Math.sin(this.t * 4) > -0.4) drawText(ctx, m.stale ? 'WAITING FOR THE MACHINE...' : this.rider.species === 'dog' ? `RUN, ${this.profile.name}, RUN!` : RIDES[this.kind].go, W / 2, H / 2 + 62, { scale: 2, align: 'center', color: '#fff6c8' });
    }

    // workshop drawer (test builds), pause button, then the overlay
    if (this.canTest && !this.paused) {
      if (button(ctx, input, W - 62, 6, 32, 18, 'DEV', { kind: 'gold', selected: this.devOpen })) { this.devOpen = !this.devOpen; app.sound.tap(); }
      if (this.devOpen) devDrawer(ctx, this);
    }
    if (button(ctx, input, W - 26, 6, 20, 18, this.paused ? '▶' : '‖', { kind: 'ghost' })) { this.paused = !this.paused; app.sound.tap(); }
    if (this.paused) {
      ctx.fillStyle = 'rgba(4,8,30,0.6)';
      ctx.fillRect(0, 0, W, H);
      if (this.mapOpen) {
        // the family trail, over the paused ride
        ctx.fillStyle = 'rgba(4,8,30,0.5)';
        ctx.fillRect(0, 0, W, H);
        drawText(ctx, 'THE FAMILY TRAIL', W / 2, 10, { scale: 3, align: 'center' });
        drawTrailMap(ctx, app);
        if (button(ctx, input, 8, 8, 110, 24, '◀ BACK TO RIDE', { kind: 'ghost' })) { this.mapOpen = false; app.sound.tap(); }
        return;
      }
      const px = W / 2 - 110, py = H / 2 - 100;
      panel(ctx, px, py, 220, 200, { fill: 'rgba(8,14,46,0.94)' });
      drawText(ctx, 'PAUSED', W / 2, py + 14, { scale: 3, align: 'center' });
      if (button(ctx, input, px + 20, py + 48, 180, 30, '▶ RESUME', { kind: 'green', scale: 2 })) { this.paused = false; app.sound.tap(); }
      if (button(ctx, input, px + 20, py + 86, 180, 24, 'SEE THE MAP', { kind: 'blue' })) { this.mapOpen = true; app.sound.tap(); }
      if (button(ctx, input, px + 20, py + 116, 180, 24, app.sound.musicOn ? '♪ MUSIC ON' : '♪ MUSIC OFF', { kind: 'blue' })) app.toggleMusic();
      if (button(ctx, input, px + 20, py + 150, 180, 30, 'END RIDE', { kind: 'red', scale: 2 })) { this.finish(); return; }
    } else {
      if (!this.songsOpen) for (const tap of input.taps) this._tapWorld(tap);
    }
  }

  /** Three big cards to tap. Sits high on the screen so the rider stays visible. */
  _pick(ctx, input) {
    const pk = this.pick, n = pk.options.length;
    const cw = 158, ch = 92, gap = 8, total = n * cw + (n - 1) * gap, x0 = Math.round((W - total) / 2), y = 60;
    const where = this.kind === 'bike' ? `MILE ${Math.round(pk.at)}` : `${pk.at.toFixed(2)} MILES`;
    const a = clamp(pk.t / 0.3, 0, 1);
    ctx.globalAlpha = a;
    panel(ctx, x0, 42, total, 16, { fill: 'rgba(150,30,44,0.94)', border: '#ffd76a' });
    drawText(ctx, `${where}! ${pk.title} - TAP ONE`, W / 2, 46, { align: 'center', color: '#fff6c8' });
    pk.options.forEach((id, i) => {
      const x = x0 + i * (cw + gap), r = REWARDS[id];
      const hot = input.over(x, y, cw, ch);
      panel(ctx, x, y, cw, ch, { fill: hot ? 'rgba(40,56,130,0.96)' : 'rgba(8,14,46,0.9)', border: hot ? '#fff6c8' : '#ffd76a' });
      const icon = rewardIcon(id, 72, 46);
      ctx.drawImage(icon, Math.round(x + (cw - icon.width) / 2), Math.round(y + 8 + (46 - icon.height) / 2));
      const big = textWidth(r.name, 2) <= cw - 10;
      drawText(ctx, r.name, x + cw / 2, y + (big ? 60 : 64), { scale: big ? 2 : 1, align: 'center' });
      drawText(ctx, r.blurb, x + cw / 2, y + 79, { align: 'center', color: '#9fb6ee' });
      if (this.pick && input.tapIn(x, y, cw, ch)) this.choose(id);
    });
    meter(ctx, x0, y + ch + 3, total, 5, 1 - pk.t / PICK_SECS, '#ffd76a');
    ctx.globalAlpha = 1;
  }

  _hud(ctx, m, s) {
    // who + where
    drawPortrait(ctx, this.profile, 6, 12, 36);
    drawText(ctx, this.profile.name, 48, 14);
    drawText(ctx, this.world.zoneName, 48, 25, { color: '#9fb6ee' });
    drawText(ctx, RIDES[this.kind].name, 48, 36, { color: '#6f86c6' });
    s.rewards.slice(-12).forEach((id, i) => {
      const icon = rewardIcon(id, 15, 12);
      ctx.drawImage(icon, 8 + i * 17 + Math.round((15 - icon.width) / 2), 52 + Math.round((12 - icon.height) / 2));
    });

    // clock + goal bar (tap the clock three times for a frames-per-second readout)
    drawText(ctx, fmtTime(s.active), W / 2, 7, { scale: 3, align: 'center' });
    if (this.app.input.tapIn(W / 2 - 44, 2, 88, 28)) { this.clockTaps = (this.clockTaps || 0) + 1; if (this.clockTaps % 3 === 0) this.app.showFps = !this.app.showFps; }
    // today's mile, and (for the first minute) the advent door that is about to open
    if (s.goalMeters) {
      meter(ctx, W / 2 - 60, 31, 120, 5, s.progress, s.goalHit ? '#9fe6b0' : '#ffd76a');
      drawText(ctx, s.goalHit ? 'DONE!' : 'YOUR MILE', W / 2 + 64, 30, { color: s.goalHit ? '#9fe6b0' : '#9fb6ee' });
    }
    // while a door is still locked: how long until the next one unlocks
    const locked = this.adventOn ? this.app.season.doorToday() - this.doorsUnlocked : 0;
    const doorSoon = locked > 0 && this.t > GREET_SECS && !this.pick;
    if (doorSoon) {
      const left = fmtTime(Math.ceil(OPEN_AFTER - (s.active % OPEN_AFTER)));
      drawText(ctx, locked === 1 ? `NEXT DOOR UNLOCKS IN ${left}` : `${locked} DOORS LOCKED. NEXT IN ${left}`, W / 2, 40, { align: 'center', color: '#ffd76a' });
    }
    if (this.app.showFps) drawText(ctx, `${Math.round(this.app.fps || 0)} FPS`, W / 2, doorSoon ? 50 : 40, { align: 'center', color: '#9fe6b0' });

    // cheer + spirit
    drawText(ctx, `★ ${s.cheer}`, W - (this.canTest ? 68 : 32), 7, { scale: 2, align: 'right', color: '#ffe27a' });
    drawText(ctx, 'SPIRIT', W - 156, 28, { color: '#9fb6ee' });
    const mx = W - 118, mw = 66;
    meter(ctx, mx, 27, mw, 8, 1, 'rgba(20,30,80,0.9)');
    const fw = Math.round((mw - 2) * s.spirit);
    for (let i = 0; i < fw; i++) {
      ctx.fillStyle = ((i + Math.floor(this.t * 8)) >> 2) & 1 ? '#e8454c' : '#fff3f3';
      ctx.fillRect(mx + 1 + i, 28, 1, 6);
    }
    drawText(ctx, `×${s.mult}`, W - 32, 28, { align: 'right', color: s.mult > 1 ? '#ffe27a' : '#9fb6ee' });

    this._tiles(ctx, m, s);
    this._music(ctx);
  }

  /** The numbers along the bottom: five tiles, or (after the little arrow) one thin strip. */
  _tiles(ctx, m, s) {
    const app = this.app, input = app.input, set = app.store.settings;
    const small = set.readout === 'small', live = !this.pick && !this.paused;
    const miles = s.meters / MILE;
    const tiles = TILES[this.kind];
    const tw = 96, gap = 6, total = tiles.length * tw + (tiles.length - 1) * gap, x0 = Math.round((W - total) / 2);
    const frac = clamp((miles - (this.nextReward - this.rewardEvery)) / this.rewardEvery, 0, 1);   // progress to the next reward
    const mxt = x0 + 4 * (tw + gap);
    if (small) {
      const y = H - 15;
      panel(ctx, x0, y, total, 12, { fill: 'rgba(8,14,46,0.72)' });
      SHORT[this.kind].forEach((f, i) => drawText(ctx, f(m, s), x0 + i * (tw + gap) + tw / 2, y + 3, { align: 'center' }));
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(mxt + 5, y + 10, Math.round((tw - 10) * frac), 1);
    } else {
      const y = H - 38;
      tiles.forEach((faces, i) => {
        const x = x0 + i * (tw + gap);
        if (faces.length > 1 && live && input.tapIn(x, y, tw, 33)) {
          this.tileFace[i] = (this.tileFace[i] + 1) % faces.length;
          this.tileFlip[i] = 0;
          app.sound.tap();
        }
        // a quick card-flip: squash to nothing, swap face, grow back
        const a = clamp(this.tileFlip[i] / 0.22, 0, 1);
        const showing = a < 0.5 ? (this.tileFace[i] + faces.length - 1) % faces.length : this.tileFace[i];
        const wv = Math.max(2, Math.round(tw * Math.abs(1 - 2 * a)));
        const fun = showing > 0;
        panel(ctx, x + (tw - wv) / 2, y, wv, 33, { fill: fun ? 'rgba(70,22,40,0.82)' : 'rgba(8,14,46,0.72)', border: fun ? 'rgba(255,215,106,0.7)' : undefined });
        if (wv > tw * 0.7) {
          const [label, value] = faces[showing];
          drawText(ctx, label, x + tw / 2, y + 4, { align: 'center', color: fun ? '#ffd76a' : '#9fb6ee' });
          drawText(ctx, value(m, s), x + tw / 2, y + 14, { scale: 2, align: 'center' });
        }
      });
      ctx.fillStyle = 'rgba(160,190,255,0.3)';
      ctx.fillRect(mxt + 5, y + 30, tw - 10, 1);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(mxt + 5, y + 30, Math.round((tw - 10) * frac), 1);
    }
    // the little arrow: big tiles, or one thin strip
    if (button(ctx, input, x0 + total + 4, small ? H - 16 : H - 22, 16, 14, small ? '▲' : '▼', { kind: 'ghost' }) && live) {
      set.readout = small ? 'big' : 'small'; app.store.save(); app.sound.tap();
    }
  }

  /** Bottom-left: pause or resume the music, skip to the next tune, or tap the title for the songbook. */
  _music(ctx) {
    const app = this.app, snd = app.sound, input = app.input;
    const live = !this.pick && !this.paused;
    const y = app.store.settings.readout === 'small' ? H - 33 : H - 57;
    if (button(ctx, input, 6, y, 20, 15, snd.musicOn ? '‖' : '▶', { kind: 'ghost' }) && live) { app.toggleMusic(); snd.tap(); }
    if (button(ctx, input, 29, y, 22, 15, '▶▶', { kind: 'ghost' }) && live) { if (!snd.musicOn) app.toggleMusic(); snd.nextSong(); snd.tap(); }
    // quieter / louder, in the corner under those two
    drawVolume(ctx, input, app, 6, y + 18, 58, 14, (c, inp, bx, by, bw, bh, label) => button(c, inp, bx, by, bw, bh, label, { kind: 'ghost' }), live);
    drawText(ctx, `♪ ${snd.title || 'MUSIC'}`, 56, y + 4, { color: snd.musicOn ? '#c9d8ff' : '#6f86c6' });
    const overTitle = (t) => t.x >= 54 && t.x < 230 && t.y >= y - 2 && t.y < y + 17;
    if (live && input.taps.some(overTitle)) { this.songsOpen = !this.songsOpen; snd.tap(); return; }
    if (!this.songsOpen || !live) return;
    // the songbook: every tune, the ones written for the game starred
    // (songs still behind an advent door are not in the book yet)
    const names = snd.titles.map((name, i) => ({ name, i })).filter((r) => !snd.isLocked(r.i));
    const rowH = 12, w = 200, h = names.length * rowH + 22, x = 6, top = y - h - 4;
    panel(ctx, x, top, w, h, { fill: 'rgba(8,14,46,0.95)', border: '#ffd76a' });
    drawText(ctx, 'SONGBOOK: TAP ONE', x + 8, top + 6, { color: '#ffd76a' });
    names.forEach(({ name, i }, row) => {
      const ry = top + 19 + row * rowH, on = i === snd.index, fresh = snd.isOriginal(i);
      if (on) { ctx.fillStyle = 'rgba(255,215,106,0.16)'; ctx.fillRect(x + 3, ry - 2, w - 6, rowH); }
      drawText(ctx, on ? '♪' : fresh ? '★' : '', x + 7, ry, { color: '#ffd76a' });
      drawText(ctx, name, x + 18, ry, { color: on ? '#fff6c8' : fresh ? '#ffe27a' : '#c9d8ff' });
      if (input.tapIn(x, ry - 2, w, rowH)) { if (!snd.musicOn) app.toggleMusic(); snd.play(i); this.songsOpen = false; }
    });
    if (input.taps.some((t) => t.x < x || t.x >= x + w || t.y < top || t.y >= top + h)) this.songsOpen = false;
  }

  /** The relative who flies in, flying beside you. Tap them and they swoop over your head. */
  _relative(ctx) {
    const k = this.relative, input = this.app.input;
    k.draw(ctx, this.at || { x: W / 2, y: this.world.riderY, ppm: 43 }, this.t);
    if (k.here && !this.pick && !this.card && !this.paused && input.tapIn(...k.box()) && k.poke()) {
      this.toast(`HIGH FIVE, ${k.who.name}! +${this.session.award(50)}`);
      this.app.sound.chime();
    }
  }

  /** Whoever is beside you cheering (Sexy Santa, Edward). Tap them and they do their party piece just for you. */
  _fan(ctx) {
    const k = this.fan.v, input = this.app.input;
    k.draw(ctx, this.at || { x: W / 2, y: this.world.riderY, ppm: 43 }, this.t);
    if (k.here && !this.pick && !this.card && !this.paused && input.tapIn(...k.box())) {
      if (k.poke()) this.toast(`${FANS[this.fan.key].tapped} +${this.session.award(50)}`);
      this.app.sound.sparkle();
    }
  }

  /** A cookie getting eaten above the rider, a bite at a time. */
  _chomp(ctx) {
    const c = this.chomp;
    if (!c.can) {
      const icon = rewardIcon(c.id, 44, 44);
      c.can = document.createElement('canvas');
      c.can.width = icon.width; c.can.height = icon.height;
      c.can.getContext('2d').drawImage(icon, 0, 0);
      c.drawn = 0;
    }
    const w = c.can.width, h = c.can.height;
    while (c.drawn < c.bites) {
      // a ragged bite: top right, then the left side, then most of what is left
      const g = c.can.getContext('2d');
      const [bx, by, r] = [[w * 0.85, h * 0.2, w * 0.36], [w * 0.1, h * 0.55, w * 0.4], [w * 0.6, h * 0.8, w * 0.62]][c.drawn++];
      for (let yy = -Math.floor(r); yy <= r; yy++) {
        const half = Math.sqrt(r * r - yy * yy) + ((Math.abs(yy) * 7) % 3) - 1;
        g.clearRect(Math.round(bx - half), Math.round(by + yy), Math.round(half * 2), 1);
      }
    }
    const pop = clamp(c.t / 0.2, 0, 1);
    const x = Math.round(W / 2 + 34), y = Math.round(this.world.riderY - 104 - 3 * Math.sin(c.t * 9));
    const dw = Math.round(w * pop), dh = Math.round(h * pop);
    ctx.drawImage(c.can, Math.round(x - dw / 2), Math.round(y - dh / 2), dw, dh);
    if (c.bites > 0) {
      const since = c.t - (0.25 + (c.bites - 1) * 0.36);
      if (since < 0.3) {
        drawText(ctx, REWARDS[c.id].say || 'CHOMP!', x + 28, Math.round(y - 12 - since * 30), { scale: 2, color: '#ffe27a' });
        ctx.fillStyle = '#c98d52';
        for (let i = 0; i < 6; i++) {
          const ang = i * 1.05 + c.bites * 2, d = 8 + since * 70;
          ctx.fillRect(Math.round(x + Math.cos(ang) * d), Math.round(y + Math.sin(ang) * d * 0.6 + since * since * 160), 2, 2);
        }
      }
    }
  }

  /** Where the door show sits: on the right, clear of the rider. */
  _doorSpot() { return { x: W - SIDE_W - 6, y: Math.max(42, Math.min(48, H - SIDE_H - 56)) }; }
  /** An unlocked door, hovering on your right. It will not open by itself: tap it. */
  _knock(ctx) {
    const k = this.knock, input = this.app.input, at = this.at || { x: W / 2, y: this.world.riderY, ppm: 43 };
    const inn = clamp(k.t / 0.5, 0, 1), ease = 1 - (1 - inn) * (1 - inn);
    const cx = Math.round(Math.min(W - 60 - (this.app.store.settings.nav && !this.devOpen ? 108 : 0), at.x + at.ppm * 3.1) + (1 - ease) * 140);
    const cy = Math.round(at.y - at.ppm * 2.0 + Math.sin(this.t * 2.2) * 4);
    const wob = k.t % 3 < 0.5 ? Math.round(Math.sin(k.t * 40) * 2) : 0;          // it rattles now and then: something wants out
    const [bx, by, bw, bh] = drawDoorShut(ctx, k.c, cx + wob, cy, 0.5, 0.35 + 0.2 * Math.sin(this.t * 4));
    if (Math.sin(this.t * 5) > -0.3) drawText(ctx, 'TAP!', cx, by + bh + 4, { align: 'center', color: '#ffe27a' });
    if (k.t > 0.4 && !this.pick && !this.paused && input.tapIn(bx - 12, by - 12, bw + 24, bh + 30)) this._openDoor();
  }
  /** The door opening (door.js), in a card on the right. A tap on it sends it on its way. */
  _door(ctx) {
    const c = this.card, app = this.app, input = app.input, at = this._doorSpot();
    drawDoorSide(ctx, c, app.profiles, this.t, at.x, at.y);
    if (c.t > 0.8 && input.tapIn(at.x, at.y, SIDE_W, SIDE_H)) { closeDoor(c); app.sound.tap(); }
  }

  /** A drop bear (a koala): falls out of the sky onto your back, holds on, lets go. Tap it off for points. */
  _bear(ctx) {
    const b = this.bear, { x, y, ppm } = this.at, input = this.app.input;
    const res = Math.max(8, Math.round(ppm * 0.9)), art = artCanvas('dropbear', res, Math.floor(this.t * 3) % 2 ? 0 : 1.57);
    const back = y - Math.round(ppm * (this.kind === 'bike' ? 1.05 : 1.2));        // where it holds on
    let by;
    if (b.t < 0.45) by = -art.height + (back + art.height) * Math.pow(b.t / 0.45, 2);
    else if (b.t <= b.secs) by = back + Math.round(Math.sin(this.rider.phase * 2) * 1.5) - Math.max(0, 6 - (b.t - 0.45) * 40);
    else by = back + Math.pow((b.t - b.secs) / 0.8, 2) * (H - back + 20);            // lets go
    const bx = Math.round(x - art.width / 2), yy = Math.round(by - art.height / 2);
    ctx.drawImage(art, bx, yy);
    if (b.t > 0.45 && b.t <= b.secs) {
      if (b.t < 3) drawText(ctx, 'DROP BEAR!', x, yy - 11, { align: 'center', color: '#fff6c8' });
      if (!this.pick && !this.card && !this.paused && input.tapIn(bx - 8, yy - 8, art.width + 16, art.height + 16)) {
        this.toast(`YOU SHOOK OFF THE DROP BEAR! +${this.session.award(50)}`);
        this.app.sound.chime();
        b.secs = b.t;
      }
    }
  }

  /**
   * The live trail panel on the right edge: a straight-line map of what is coming, like a
   * sat-nav. Opened and closed by the little tab; + and - change how far ahead it shows,
   * from the next few places to the whole trail home.
   */
  /**
   * YOUR ITEMS, on the left edge: the food you have had out of the calendar, one under
   * another. Tap one to eat it (spirit and points); two minutes of riding later it is
   * ready again. Shut, it is a strip of pictures, and they can be tapped just the same.
   * The arrow beside it pops the strip straight out sideways into names and timers; the
   * rows, and the arrow, stay at the height they were. Animals and spirits are not in
   * here: they come and go as they please.
   */
  _items(ctx) {
    const app = this.app, input = app.input, list = [...this.treats].filter((id) => REWARDS[id]);
    if (!list.length) return;
    const live = !this.pick && !this.paused, open = this.itemsOpen;
    const rowH = 24, total = list.length * rowH;
    const least = this.tools.size ? 50 + this.tools.size * 24 + 16 : 48;      // (below the TOOLS strip, when there is one)
    const top = clamp(Math.round(H / 2 - total / 2), least, Math.max(least, H - 62 - total));
    const pw = open ? 122 : 26, px = 2;
    panel(ctx, px, top - 2, pw, total + 3, { fill: 'rgba(8,14,46,0.86)', border: 'rgba(255,215,106,0.6)' });
    if (open) drawText(ctx, 'YOUR ITEMS', px + 4, top - 12, { color: '#ffd76a' });
    list.forEach((id, i) => {
      const y = top + i * rowH, wait = this.itemWait(id), ok = !wait && !this.chomp, r = REWARDS[id];
      const hot = ok && input.over(px + 2, y, pw - 4, rowH - 2);
      panel(ctx, px + 2, y, pw - 4, rowH - 2, { fill: ok ? (hot ? 'rgba(46,120,74,0.95)' : 'rgba(30,90,58,0.9)') : 'rgba(20,28,70,0.9)', border: ok ? '#9fe6b0' : 'rgba(160,190,255,0.25)' });
      if (this.itemNew && this.itemNew.id === id && this.t < this.itemNew.till && Math.sin(this.t * 9) > -0.2) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(px + 1, y - 1, pw - 2, 1); ctx.fillRect(px + 1, y + rowH - 2, pw - 2, 1); ctx.fillRect(px + 1, y - 1, 1, rowH); ctx.fillRect(px + pw - 2, y - 1, 1, rowH); }   // new: it glows
      const icon = giftIcon(id, 18, 16, app.profiles);
      ctx.globalAlpha = wait ? 0.4 : 1;
      ctx.drawImage(icon, px + 4 + Math.round((18 - icon.width) / 2), y + 2 + Math.round((16 - icon.height) / 2));
      ctx.globalAlpha = 1;
      if (wait) {                                                    // how long until it is ready again
        ctx.fillStyle = 'rgba(160,190,255,0.25)'; ctx.fillRect(px + 4, y + rowH - 5, 18, 2);
        ctx.fillStyle = '#9fb6ee'; ctx.fillRect(px + 4, y + rowH - 5, Math.round(18 * (1 - wait / ITEM_EVERY)), 2);
      }
      if (open) {
        drawText(ctx, r.tag || r.name.slice(0, 12), px + 28, y + 3, { color: wait ? '#8fa3d6' : '#ffffff' });
        drawText(ctx, wait ? `IN ${fmtTime(Math.ceil(wait))}` : 'EAT IT!', px + 28, y + 12, { color: wait ? '#8fa3d6' : '#9fe6b0' });
      }
      // tap one and it tells you what it is, whether or not it is ready to eat
      if (live && input.tapIn(px + 2, y, pw - 4, rowH - 2)) {
        this.itemSaid = { id, till: this.t + 2.4 };
        app.sound.speak(r.name.charAt(0) + r.name.slice(1).toLowerCase());
        if (ok) this.eat(id);
        app.sound.tap();
      }
      if (!open && this.itemSaid && this.itemSaid.id === id && this.t < this.itemSaid.till) {
        const lx = px + pw + 18, lw = textWidth(r.name) + 10;
        panel(ctx, lx, y + 3, lw, 15, { fill: 'rgba(8,14,46,0.94)', border: '#ffd76a' });
        drawText(ctx, r.name, lx + 5, y + 7, { color: '#ffffff' });
      }
    });
    // the arrow: always at the same height, on the outside edge of whatever is showing
    const ax = px + pw + 1, ay = Math.round(H / 2) - 18;
    const tapped = button(ctx, input, ax, ay, 14, 36, '', { kind: 'ghost' }) && live;
    drawText(ctx, open ? '◀' : '▶', ax + 5, ay + 14, { color: '#ffd76a' });
    if (tapped) { this.itemsOpen = !open; app.sound.tap(); }
  }

  _nav(ctx, s) {
    const app = this.app, input = app.input, set = app.store.settings, season = app.season;
    if (this.devOpen) return;                           // the TEST drawer uses the same edge
    const live = !this.pick && !this.paused;
    const small = set.readout === 'small';
    // The tab (an arrow and a little map) never changes height: shut, it is on the edge of
    // the screen; open, it is on the outside edge of the panel that has popped out beside it.
    const pw = 108, px = W - pw - 4, py = 44, ph = H - py - (small ? 22 : 46);
    const tx = set.nav ? px - 17 : W - 18, ty = Math.round(H / 2) - 30;
    const tabbed = button(ctx, input, tx, ty, 16, 36, '', { kind: 'ghost' }) && live;
    drawText(ctx, set.nav ? '▶' : '◀', tx + 6, ty + 5, { color: '#ffd76a' });
    mapIcon(ctx, tx + 3, ty + 19);
    if (tabbed) { set.nav = !set.nav; app.store.save(); app.sound.tap(); return; }
    if (!set.nav) return;
    panel(ctx, px, py, pw, ph, { fill: 'rgba(8,14,46,0.86)', border: 'rgba(255,215,106,0.6)' });
    const kind = this.kind, perStage = STAGE_METERS[kind];
    const total = season.totalStages();
    const here = this.pos0 + s.meters / perStage;       // where you are on the trail, in trail miles
    const span = NAV_SPANS[this.navZoom], whole = !span;
    const lx = px + 36, y1 = py + ph - 58, y0 = py + (whole ? 40 : 24);
    const yOf = (p) => (whole ? y1 - (clamp(p, 0, total) / total) * (y1 - y0) : y1 - ((p - here) / span) * (y1 - y0));
    drawText(ctx, whole ? 'WHOLE TRAIL' : `NEXT ${trim(span)} MI`, px + 8, py + 7, { color: '#ffd76a' });

    if (!whole) {
      // the places coming up, as coloured stretches of the line
      const w = this.world, zoneM = w.zoneSegs * SEG, perStageV = perStage * VISUAL_SPEED[kind];
      const zi = Math.floor(w.z / zoneM);
      for (let k = zi - 1; k < zi + 60; k++) {
        const a = (k * zoneM - w.z) / perStageV, b = a + zoneM / perStageV;    // trail miles from here
        if (a > span) break;
        const ya = clamp(yOf(here + a), y0 - 4, y1 + 8), yb = clamp(yOf(here + b), y0 - 4, y1 + 8);
        if (ya - yb < 1) continue;
        const Z = ZONES[w.zoneAt(k * w.zoneSegs).type];
        ctx.fillStyle = Z.color;
        ctx.fillRect(lx - 3, Math.round(yb), 6, Math.round(ya - yb));
        ctx.fillStyle = 'rgba(8,14,46,0.9)';
        ctx.fillRect(lx - 3, Math.round(yb), 6, 1);
        if (ya - yb >= 10) drawText(ctx, Z.short, lx + 8, Math.round((ya + yb) / 2) - 3, { color: k === zi ? '#ffffff' : '#c9d8ff' });
      }
      // this outing's mile marks
      const stepMi = [0.05, 0.1, 0.25, 0.5, 1, 2, 5].find((v) => span / v <= 6) || 5;
      const rode = s.meters / MILE;
      for (let mi = Math.ceil((rode + 1e-6) / stepMi) * stepMi; mi - rode <= span; mi += stepMi) {
        const y = Math.round(yOf(here + (mi - rode)));
        ctx.fillStyle = 'rgba(160,190,255,0.7)';
        ctx.fillRect(lx - 8, y, 5, 1);
        drawText(ctx, trim(mi), lx - 10, y - 3, { align: 'right', color: '#9fb6ee' });
      }
      const rw = this.nextReward - rode;
      if (rw >= 0 && rw <= span) drawText(ctx, '★', lx - 3, Math.round(yOf(here + rw)) - 3, { color: '#ffd76a' });
    } else {
      // the whole trail home, a tick every five miles (which is every five days at a mile a day)
      ctx.fillStyle = '#9fb6ee';
      ctx.fillRect(lx - 1, y0, 2, y1 - y0);
      for (let d = 0; d <= total; d += 5) {
        const y = Math.round(yOf(d));
        ctx.fillRect(lx - 6, y, 5, 1);
        drawText(ctx, String(d), lx - 9, y - 3, { align: 'right', color: '#9fb6ee' });
      }
    }
    // home, if it is in view
    if (whole || total - here <= span) {
      const yh = Math.round(yOf(total));
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(lx - 4, yh - 4, 8, 5); ctx.fillRect(lx - 2, yh - 6, 4, 2); ctx.fillRect(lx - 5, yh - 5, 10, 1);
      drawText(ctx, 'HOME', lx + 8, yh - 5, { color: '#ffd76a' });
    }
    // everybody else's tents
    const me = this.profile.guest ? null : this.profile.id;
    for (const o of season.family()) {
      if (o.id === me) continue;
      const p = season.position(o.id);
      if (!whole && (p < here - span * 0.1 || p > here + span)) continue;
      const y = Math.round(yOf(p)), c = o.jacket;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(lx + 6, y - 1, 5, 3); ctx.fillRect(lx + 7, y - 2, 3, 1); ctx.fillRect(lx + 8, y - 3, 1, 1);
      drawText(ctx, o.name.slice(0, 7), lx + 14, y - 3, {});
    }
    // you
    const ym = Math.round(yOf(here));
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(lx - 5, ym, 10, 2);
    drawText(ctx, '▲', lx - 2, ym - 8, { color: '#ffd76a' });
    if (whole) drawText(ctx, 'YOU', lx - 9, ym - 3, { align: 'right', color: '#ffd76a' });

    const togo = s.goalMeters ? Math.max(0, s.goalMeters - s.meters) / MILE : 0;
    drawText(ctx, togo > 0 ? `${trim(togo)} MI LEFT TODAY` : "TODAY'S MILE IS DONE ★", px + pw / 2, py + ph - 44, { align: 'center', color: '#ffe27a' });
    drawText(ctx, `${trim(Math.max(0, total - here))} MI TO HOME`, px + pw / 2, py + ph - 32, { align: 'center', color: '#9fe6b0' });
    const zoom = (d) => { this.navZoom = clamp(this.navZoom + d, 0, NAV_SPANS.length - 1); set.navZoom = this.navZoom; app.store.save(); app.sound.tap(); };
    if (button(ctx, input, px + 8, py + ph - 20, 44, 15, '+ CLOSER', { kind: 'blue' }) && live) zoom(-1);
    if (button(ctx, input, px + 56, py + ph - 20, 44, 15, '- WIDER', { kind: 'blue' }) && live) zoom(1);
  }

  _greeting(ctx) {
    const t = this.t;
    if (t > GREET_SECS) return;
    const k = clamp(Math.min(t / 0.45, (GREET_SECS - t) / 0.45), 0, 1);
    const ease = 1 - (1 - k) * (1 - k);
    const santa = uiSprite('santa', 0, 34);
    const sx = 30, sy = Math.round(H - 40 - santa.height * ease + 6 + Math.sin(t * 5) * 1.5);
    const g = this.greeting;
    const bw = Math.max(textWidth(g.line, 2), textWidth('HO HO HO!', 4)) + 28, bh = g.extra ? 86 : 72;
    const bx = sx + santa.width + 10, by = H - 54 - bh;
    if (k > 0.6) {
      ctx.globalAlpha = clamp((k - 0.6) / 0.4, 0, 1);
      panel(ctx, bx, by, bw, bh, { fill: 'rgba(255,250,240,0.96)', border: '#c8343c' });
      ctx.fillStyle = 'rgba(255,250,240,0.96)';
      for (let i = 0; i < 7; i++) ctx.fillRect(bx - 1 - i, by + bh - 26 + i, 1, 8 - i);
      drawText(ctx, 'HO HO HO!', bx + 14, by + 10, { scale: 4, color: '#c8343c', shadow: 'rgba(120,20,30,0.25)' });
      drawText(ctx, g.line, bx + 14, by + 46, { scale: 2, color: '#1c2a5e', shadow: null });
      if (g.extra) drawText(ctx, g.extra, bx + 14, by + 68, { color: '#2f7a52', shadow: null });
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(santa, sx, sy);
  }
}
