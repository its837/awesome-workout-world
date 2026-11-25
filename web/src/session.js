// One workout's numbers, plus the little bit of saved history per family member.
import { clamp, MILE } from './util.js';
import { FAMILY } from '../family.js';

const KEY = 'merrymiles.v2';

// The family trail is measured in miles, and a mile is a mile: one walked on the treadmill
// or one ridden on the bike moves your tent a mile along the trail. (In the code a trail
// mile is a "stage".) Riders cover more ground than walkers, and that is fine.
export const STAGE_METERS = { bike: MILE, tread: MILE };

const DEFAULT_SETTINGS = {
  music: true,
  dogs: true,          // the dogs tag along with their people
  gifts: true,         // ADVENT UNLOCKS: buddies, dogs, feasts and surprises stay away until their door is open (gifts.js)
  unlockAll: false,    // test controls: pretend every door is open, for everybody
  dev: false,          // show the workshop tools on real hardware too
  seasonStart: '',     // '' = Thanksgiving Day; or a 'YYYY-MM-DD' to open the trail early
  // ONLY IN THE SEASON: until the trail opens (and after Christmas) the home screen counts the days, nobody is on it and nobody
  // can ride. Off unless the family asks for it (`seasonOnly: true` in family.js); each tablet can still switch it in Settings.
  seasonLock: FAMILY.seasonOnly === true,
  dayOffset: 0,        // workshop time travel, in days
  detail: 'auto',      // picture detail: auto | full | medium | light | custom (see detail.js)
  autoLevel: 'medium', // where AUTO last settled on this tablet
  sky: 'sunrise',      // 'sunrise' = night, with the sun coming up as you finish your mile; 'night' = always night
  // the numbers at the bottom of a ride: one 'small' strip (what you start with) or 'big' tiles.
  // (Called `tiles` and started big until 17 November 2026; renamed so the new start applies to every tablet.)
  readout: 'small',
  nav: false,          // the live trail panel on the right of a ride: open or closed
  navZoom: 1,          // how far ahead it shows (index into NAV_SPANS in ride.js)
};

/**
 * Everything saved on this tablet. The heart of it is a grow-only log of finished
 * rides: nothing is ever edited, only added. That makes it easy to merge the bike's
 * and the treadmill's logs later (the union of two logs is always correct).
 */
export class Store {
  constructor() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    this.data = d && typeof d === 'object' ? d : {};
    if (!Array.isArray(this.data.rides)) this.data.rides = [];
    if (!Array.isArray(this.data.opens)) this.data.opens = [];     // doors opened on the calendar: { id, who, n, day }
    const hadSettings = !!this.data.settings;
    this.data.settings = Object.assign({}, DEFAULT_SETTINGS, this.data.settings || {});
    this._stats = null;

    // On the tablet the shell keeps a plain-file copy of all this (so it can be backed up
    // to the Mac and put back after a reset). Fold in whatever it has: its last copy, and
    // any backup that was pushed back for restoring. Rides are only ever added, so merging
    // can never lose one.
    const host = window.MerryHost;
    if (host && host.readSave) {
      try {
        const files = JSON.parse(host.readSave());
        let changed = false;
        for (const text of [files.save, files.restore]) {
          if (!text) continue;
          const other = JSON.parse(text);
          if (this.merge(other)) changed = true;
          if (!hadSettings && other.settings) { this.data.settings = Object.assign({}, DEFAULT_SETTINGS, other.settings); changed = true; }
        }
        if (changed || files.restore) this.save();
      } catch (e) { /* no file yet, or unreadable: carry on with what we have */ }
    }
  }
  /**
   * Fold another log in (a backup, or the other machine's): every ride and opened door we
   * have not seen is added, and nothing we have is touched. True if anything was new.
   */
  merge(other) {
    let changed = false;
    const seen = new Set(this.data.rides.map((r) => r.id));
    for (const r of (other && other.rides) || []) if (r && r.id && !seen.has(r.id)) { this.data.rides.push(r); seen.add(r.id); changed = true; }
    const had = new Set(this.data.opens.map((o) => o.id));
    for (const o of (other && other.opens) || []) if (o && o.id && !had.has(o.id)) { this.data.opens.push(o); had.add(o.id); changed = true; }
    return changed;
  }
  save() {
    this._stats = null;
    this.rev = (this.rev || 0) + 1;      // anything worked out from the log is worked out again
    const text = JSON.stringify(this.data);
    try { localStorage.setItem(KEY, text); } catch (e) { /* storage unavailable */ }
    const host = window.MerryHost;
    if (host && host.writeSave) { try { host.writeSave(text); } catch (e) { /* older shell */ } }
  }
  get settings() { return this.data.settings; }
  get rides() { return this.data.rides; }
  get opens() { return this.data.opens; }
  /** Somebody opened door n on their calendar (not during a ride). Like the rides, only ever added. */
  addOpen(who, n, day, start) {
    this.data.opens.push({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, who, n, day, start });   // start: which calendar door n belongs to (camp.js _doors)
    this.save();
  }

  /** Record a finished session. `day` is the calendar day it counts for ('YYYY-MM-DD'). */
  addRide(who, s, day, extra) {
    const ride = Object.assign({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      who, day, kind: s.kind,
      min: Math.round((s.active / 60) * 10) / 10,
      m: Math.round(s.meters), climb: Math.round(s.climb), cheer: s.cheer, kcal: Math.round(s.kcal),
      trees: s.trees, rewards: s.rewards.slice(),
      stage: s.meters / STAGE_METERS[s.kind],
    }, extra || {});
    this.data.rides.push(ride);
    this.save();
    return ride;
  }

  /** All-time totals for one person, derived from the log. */
  stats(id) {
    if (!this._stats) {
      this._stats = {};
      for (const r of this.data.rides) {
        const st = this._stats[r.who] || (this._stats[r.who] = { rides: 0, meters: 0, seconds: 0, cheer: 0, climb: 0, trees: 0, kcal: 0, rewards: {} });
        st.rides++; st.meters += r.m; st.seconds += r.min * 60; st.cheer += r.cheer; st.climb += r.climb; st.trees += r.trees || 0; st.kcal += r.kcal || 0;
        for (const x of r.rewards || []) st.rewards[x] = (st.rewards[x] || 0) + 1;
      }
    }
    return this._stats[id] || { rides: 0, meters: 0, seconds: 0, cheer: 0, climb: 0, trees: 0, kcal: 0, rewards: {} };
  }

  clearRides(onlyDemo) {
    this.data.rides = onlyDemo ? this.data.rides.filter((r) => !r.demo) : [];
    if (!onlyDemo) this.data.opens = [];
    this.save();
  }
}

export class Session {
  /** goalMiles: how far to go, in trail miles (a mile walked, or five ridden); 0 for a free ride. */
  constructor(profile, kind, goalMiles) {
    this.profile = profile;
    this.kind = kind;
    this.goalMeters = Math.max(0, goalMiles || 0) * STAGE_METERS[kind];
    this.elapsed = 0;     // wall-clock seconds since start
    this.active = 0;      // seconds actually moving
    this.meters = 0;
    this.climb = 0;       // metres of elevation gained (treadmill)
    this.kj = 0;          // work done (bike)
    this.kcal = 0;
    this.cheer = 0;
    this.spirit = 0;      // 0..1, the Christmas-spirit meter
    this.trees = 0;       // trees lit
    this.pickups = 0;
    this.rewards = [];    // ids of mile rewards picked this ride, in order
    this.streak = 0;      // pickups since last stop
    this.maxCadence = 0; this.maxPower = 0; this.maxSpeed = 0;
    this.sumPower = 0; this.sumCadence = 0;
    this.goalHit = false;
    this.moving = false;
  }

  get mult() { return 1 + Math.min(4, Math.floor(this.spirit * 5)); }
  /** How far through the goal, 0..1 (a free ride counts one trail mile as its goal). */
  get progress() { return clamp(this.meters / (this.goalMeters || STAGE_METERS[this.kind]), 0, 1); }
  get avgPower() { return this.active > 0 ? this.sumPower / this.active : 0; }
  get avgCadence() { return this.active > 0 ? this.sumCadence / this.active : 0; }

  /** Returns true on the frame the goal is reached. */
  update(dt, m) {
    const v = m.speedMps;
    this.elapsed += dt;
    this.moving = v > 0.25;
    let effort = 0;
    if (this.moving) {
      this.active += dt;
      this.meters += v * dt;
      if (this.kind === 'bike') {
        this.kj += (m.power * dt) / 1000;
        this.kcal = this.kj; // ~24% efficiency makes kJ of work roughly equal kcal burned
        this.sumPower += m.power * dt; this.sumCadence += m.cadence * dt;
        this.maxPower = Math.max(this.maxPower, m.power); this.maxCadence = Math.max(this.maxCadence, m.cadence);
        effort = m.power / 115;
      } else {
        const grade = Math.max(0, m.inclinePct) / 100;
        this.climb += v * dt * grade;
        // ACSM walking equation, 70 kg default: VO2 = 0.1*speed + 1.8*speed*grade + 3.5 (ml/kg/min, speed in m/min)
        const vo2 = 0.1 * v * 60 + 1.8 * v * 60 * grade + 3.5;
        this.kcal += ((vo2 * 70) / 200) * (dt / 60);
        effort = (m.speedMph / 3.2) * (1 + m.inclinePct / 9);
      }
      this.maxSpeed = Math.max(this.maxSpeed, m.speedMph);
      // fills in about 1.5 minutes of steady effort, a few minutes of easy spinning
      this.spirit = clamp(this.spirit + dt * (0.004 + 0.008 * Math.min(effort, 1.6)), 0, 1);
    } else {
      this.spirit = clamp(this.spirit - dt * 0.05, 0, 1);
      this.streak = 0;
    }
    if (this.goalMeters && !this.goalHit && this.meters >= this.goalMeters) { this.goalHit = true; return true; }
    return false;
  }

  award(points) {
    const got = Math.round(points * this.mult);
    this.cheer += got;
    return got;
  }
}
