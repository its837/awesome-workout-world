// The season: the family trail, the advent calendar, and who is in the family today.
//
// THE TRAIL. The season runs from Thanksgiving Day to Christmas Day (or from another date
// chosen in Settings). The trail has a mile for each of those days and ends at the
// family homestead. Every ride or walk moves your tent along it, and a mile is a mile on
// either machine, so a mile a day gets you home. That mile is the day's goal.
//
// THE CALENDAR. There is one door for each day. A door opens for you once
//   - its day has come ("no peeking"), and
//   - you have ridden or walked for a minute on or after that day.
// So a minute's riding opens today's door, and every door you missed along with it.
// Behind each door is one advent thing (gifts.js): a trail buddy, a dog, a feast, a
// surprise on the trail. It is not in your game until you open its door; after that it
// is yours for the rest of the season.
//
// THE FAMILY. Not everybody is here from the first day:
//   - a person with `arrives` in profiles.js is behind
//     that day's door. They join the screens when somebody opens it, or the next day at
//     the latest, and their mile a day counts from the day after they arrive;
//   - a dog with `unlockedBy` joins once every person on that list has opened its door.
// Until then they are not on the welcome screen, the map or the calendar.
//
// THE DOGS are family, but nobody rides as a dog. They come and go on everybody's rides,
// and whatever distance a dog runs beside a rider is the dog's own distance too (each
// ride record carries `dogs: { <the dog's id>: { m, poops } }`). So the dogs have their
// own miles on the trail, and their own count of poop breaks.
//
// Everything here is worked out from the ride log in session.js, so it needs no data
// of its own.
import { addDays, dayKey, daysBetween, parseDay, hashI, clamp, MILE } from './util.js';
import { STAGE_METERS } from './session.js';
import { EVENT } from './text.js';
import { giftAt, giftsAt, gatedGifts, dogGift, joinGiftOf } from './gifts.js';

const isDog = (p) => !!(p.look && p.look.species === 'dog');
export const OPEN_AFTER = 60;   // seconds of riding that open your doors

export class Season {
  constructor(store, profiles) {
    this.store = store;
    this.all = profiles;                              // everybody in profiles.js, guest included
    this.profiles = profiles.filter((p) => !p.guest); // the family, whether or not they are here yet
    this._memo = null;
    this.forceAll = false;   // a test scene (unlock=1): every door open, without saving that
  }

  /** "Now", including any workshop time travel. */
  now() {
    const d = new Date();
    const off = this.store.settings.dayOffset || 0;
    if (off) d.setDate(d.getDate() + off);
    return d;
  }
  today() { return dayKey(this.now()); }

  /** Christmas Day of the season we are in (after Dec 25 we look ahead to next year). */
  xmas() {
    const n = this.now();
    const y = n.getMonth() === 11 && n.getDate() > 25 ? n.getFullYear() + 1 : n.getFullYear();
    return new Date(y, 11, 25);
  }
  /** Thanksgiving Day of the season: the fourth Thursday of November. */
  thanksgiving() {
    const nov1 = new Date(this.xmas().getFullYear(), 10, 1);
    return new Date(nov1.getFullYear(), 10, 1 + ((4 - nov1.getDay() + 7) % 7) + 21);
  }
  start() {
    const custom = this.store.settings.seasonStart, xmas = this.xmas();
    if (custom) { const c = parseDay(custom); if (c < xmas && c > addDays(xmas, -150)) return c; }
    return this.thanksgiving();
  }
  startKey() { return dayKey(this.start()); }
  /** Is it Thanksgiving Day today? (Everybody says GOBBLE GOBBLE.) */
  isThanksgiving() { return daysBetween(this.thanksgiving(), this.now()) === 0; }
  started() { return this.now() >= this.start(); }
  daysUntilStart() { return Math.max(0, daysBetween(this.now(), this.start())); }
  /** How many doors the calendar has: one for each day from the start to Christmas Day. */
  doorCount() { return Math.max(1, daysBetween(this.start(), this.xmas()) + 1); }
  /** How many trail miles (stages) the trail has: one for every day. */
  totalStages() { return this.doorCount(); }
  /** The door (1-based) that belongs to a calendar day, or 0 if that day is outside the season. */
  doorOf(day) { const n = daysBetween(this.start(), parseDay(day)) + 1; return n >= 1 && n <= this.doorCount() ? n : 0; }
  /** The newest door whose day has come: 0 before the season, the last door from Christmas on. */
  doorToday() { return clamp(this.dayIndex() + 1, 0, this.doorCount()); }
  /** The calendar day of door n. */
  dayOfDoor(n) { return addDays(this.start(), n - 1); }
  /** 0 on the first day of the season; negative before it. */
  dayIndex(date) { return daysBetween(this.start(), date || this.now()); }
  /** The calendar days of the season, first to Christmas Day. */
  days() {
    const out = [];
    for (let d = this.start(), end = this.xmas(); d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }
  /** The thing pictured on door n, and everything behind it (a door can hold several things). */
  giftAt(n) { return giftAt(n, this.doorCount(), this.all); }
  giftsAt(n) { return giftsAt(n, this.doorCount(), this.all); }
  /** The door a thing is behind (0 if it is not on the calendar). */
  doorWith(gift) { for (let n = 1, c = this.doorCount(); n <= c; n++) if (this.giftsAt(n).includes(gift)) return n; return 0; }

  // --- doors ---------------------------------------------------------------
  /**
   * Is the calendar holding things back? Not when ADVENT UNLOCKS is switched off in
   * Settings, or when the test controls have unlocked everything: then it is all in the
   * game from the start, for everybody.
   */
  gating() { const s = this.store.settings; return s.gifts !== false && !s.unlockAll && !this.forceAll; }

  /** Worked out once and kept until the log, the date or the switches change. */
  _cache() {
    const s = this.store.settings;
    const key = `${this.store.rev || 0}|${this.store.rides.length}|${this.today()}|${this.startKey()}|${s.gifts !== false}|${!!s.unlockAll}|${!!this.forceAll}`;
    if (!this._memo || this._memo.key !== key) this._memo = { key, doors: {}, unlocks: {}, here: {} };
    return this._memo;
  }

  /**
   * Where somebody stands with their doors: { unlocked, open }.
   * UNLOCKED: every minute you ride unlocks the next door whose day has come, one door a
   * minute. OPEN: an unlocked door is opened by tapping it (while it hovers beside you on a
   * ride, or afterwards on your own calendar), one at a time, in order.
   * A ride says how far its rider had got when it ended (unlocked, opened), and which
   * calendar that was counted on (start: the day that season began). A door opened on the
   * calendar is its own little record (store.opens), with the same stamp.
   *
   * ONLY A RECORD MADE ON THE CALENDAR IN FORCE NOW CAN SAY A DOOR IS OPEN. Any other ride
   * (made before the season began, or before THE TRAIL OPENS was moved, or with the advent
   * calendar switched off) only UNLOCKS the door of the day it was on: that door is then
   * waiting to be tapped, so its opening is always seen. (Such rides used to count as having
   * opened the door, which is how a door could be open that nobody had ever watched open.)
   */
  _doors(id) {
    const memo = this._cache();
    if (memo.doors[id]) return memo.doors[id];
    const startKey = this.startKey(), today = this.doorToday();
    let unlocked = 0, open = 0;
    for (const r of this.store.rides) {
      if (r.who !== id || r.day < startKey) continue;
      if (r.unlocked != null && r.start === startKey) { unlocked = Math.max(unlocked, r.unlocked); open = Math.max(open, r.opened || 0); continue; }
      if (r.open != null ? !r.open : !(r.min >= 1)) continue;
      const n = this.doorOf(r.day);
      unlocked = Math.max(unlocked, n);
      if (r.demo) open = Math.max(open, n);        // (the studio's pretend history: everybody opened their doors)
    }
    for (const o of this.store.opens || []) if (o.who === id && o.day >= startKey && o.start === startKey) open = Math.max(open, o.n);
    unlocked = Math.min(unlocked, today);
    return (memo.doors[id] = { unlocked, open: Math.min(open, unlocked) });
  }
  /** How many doors somebody has opened. What was behind them is theirs. */
  doorsOpen(id) { return this._doors(id).open; }
  /** How many doors somebody has unlocked (opened or not). */
  doorsUnlocked(id) { return this._doors(id).unlocked; }
  /** Unlocked doors still to be opened: tap them. */
  ready(id) { const d = this._doors(id); return d.unlocked - d.open; }
  /** Doors whose day has come but which are still locked. A minute's riding unlocks the next one. */
  waiting(id) { return Math.max(0, this.doorToday() - this._doors(id).unlocked); }
  /** Open somebody's next unlocked door, from their calendar. Returns its number, or 0 if none is ready. */
  openNext(id) {
    const d = this._doors(id);
    if (d.open >= d.unlocked) return 0;
    this.store.addOpen(id, d.open + 1, this.today(), this.startKey());
    return d.open + 1;
  }
  /** Is that day's door open for them? */
  doneOn(id, day) { const n = this.doorOf(day); return n > 0 && n <= this.doorsOpen(id); }
  whoDid(day) { return this.people().filter((p) => this.doneOn(p.id, day)); }

  /**
   * The advent things somebody has had out of their doors so far: a Set of gift ids.
   * A guest gets whatever the family has opened between them.
   */
  unlocks(id) {
    const memo = this._cache();
    if (memo.unlocks[id]) return memo.unlocks[id];
    const gated = gatedGifts(this.all), out = new Set();
    const who = this.all.find((p) => p.id === id);
    const n = !this.gating() ? this.doorCount() : who && who.guest ? Math.max(0, ...this.profiles.map((p) => this.doorsOpen(p.id))) : this.doorsOpen(id);
    for (let d = 1; d <= n; d++) for (const g of this.giftsAt(d)) out.add(g);
    if (n >= this.doorCount()) for (const g of gated) out.add(g);     // the last door brings everything
    return (memo.unlocks[id] = out);
  }
  /** Can they have this thing yet? Anything that is not behind a door is always there. */
  has(id, gift) { return !gatedGifts(this.all).has(gift) || this.unlocks(id).has(gift); }

  // --- who is here ---------------------------------------------------------
  /** The day somebody arrives (profiles.js `arrives`: 'MM-DD' or 'YYYY-MM-DD'), or null. */
  arrival(p) {
    if (!p.arrives) return null;
    const m = /^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})$/.exec(String(p.arrives));
    if (!m) return null;
    const month = Number(m[2]) - 1, xmas = this.xmas();
    // a date with no year belongs to this season: a January date is the one after Christmas
    const year = m[1] ? Number(m[1]) : month < 6 ? xmas.getFullYear() + 1 : xmas.getFullYear();
    return new Date(year, month, Number(m[3]));
  }
  /** The first day somebody takes part: the day after they arrive. Their mile a day counts from here. */
  startsOn(p) { const a = this.arrival(p); return a ? addDays(a, 1) : null; }
  /** Is this person (or dog) part of things yet? */
  here(p) {
    if (p.guest) return true;
    const memo = this._cache();
    if (memo.here[p.id] != null) return memo.here[p.id];
    let ok = true;
    const a = this.arrival(p), now = this.now();
    if (a && now < a) ok = false;                      // never before the day they come
    else if (a && now < addDays(a, 1) && this.gating()) {
      // the day they come: once somebody has opened their door (if they are behind one)
      const n = this.doorWith(joinGiftOf(p, this.all) || '');
      if (n) ok = this.profiles.some((q) => this.doorsOpen(q.id) >= n);
    }
    if (ok && Array.isArray(p.unlockedBy) && p.unlockedBy.length && this.gating()) {
      const gift = isDog(p) ? dogGift(p) : null;
      if (gift && gatedGifts(this.all).has(gift)) ok = p.unlockedBy.every((id) => this.unlocks(id).has(gift));
    }
    return (memo.here[p.id] = ok);
  }
  /** The family members who are here now, dogs included (no guest). */
  family() { return this.profiles.filter((p) => this.here(p)); }
  /** The people who are here now (no dogs, no guest): the ones with doors to open. */
  people() { return this.family().filter((p) => !isDog(p)); }
  /** The dogs who have joined the family. */
  dogsHere() { return this.family().filter(isDog); }
  /** Everybody who can be picked on the welcome screen: the people who are here, and the guest. Nobody rides as a dog. */
  roster() { return this.all.filter((p) => !isDog(p) && this.here(p)); }
  /** A dog's own numbers, from the rides it has joined: { miles (trail miles), poops, outings, best (longest run), pal (the person it runs with most) }. */
  dogStats(id) {
    const memo = this._cache();
    memo.dogs = memo.dogs || {};
    if (memo.dogs[id]) return memo.dogs[id];
    const startKey = this.startKey(), out = { miles: 0, poops: 0, sprinkles: 0, outings: 0, best: 0, pal: null }, withWho = {};
    for (const r of this.store.rides) {
      if (r.day < startKey) continue;
      const d = r.dogs && r.dogs[id];
      if (d) {
        const mi = (d.m || 0) / STAGE_METERS[r.kind];
        out.miles += mi; out.poops += d.poops || 0; out.sprinkles += d.sprinkles || 0; out.outings++;
        out.best = Math.max(out.best, mi);
        withWho[r.who] = (withWho[r.who] || 0) + mi;
      }
      if (r.who === id) { out.miles += r.stage || 0; out.outings++; }    // (older test rides made as a dog)
    }
    const top = Object.keys(withWho).sort((a, b) => withWho[b] - withWho[a])[0];
    out.pal = top ? this.all.find((p) => p.id === top) || null : null;
    return (memo.dogs[id] = out);
  }
  /** Family still to come: { people, dogs }. */
  toCome() {
    const away = this.profiles.filter((p) => !this.here(p));
    return { people: away.filter((p) => !isDog(p)), dogs: away.filter(isDog) };
  }

  // --- miles ---------------------------------------------------------------
  /** Trail miles somebody did on one calendar day. */
  milesOn(id, day) {
    let m = 0;
    for (const r of this.store.rides) if (r.who === id && r.day === day) m += r.stage || 0;
    return m;
  }
  /**
   * How many days in a row somebody has done their trail mile, counting today if today's
   * is done (and otherwise up to yesterday, so a streak is not lost before you ride).
   * extra: trail miles on the outing still under way.
   */
  mileStreak(id, extra = 0) {
    const per = {};
    for (const r of this.store.rides) if (r.who === id) per[r.day] = (per[r.day] || 0) + (r.stage || 0);
    let n = 0, d = this.now();
    if ((per[dayKey(d)] || 0) + extra >= 0.98) n++;
    for (d = addDays(d, -1); (per[dayKey(d)] || 0) >= 0.98; d = addDays(d, -1)) n++;
    return n;
  }
  /** What is left of today's trail mile for somebody (0 once it is done). */
  mileLeft(id) { return Math.max(0, 1 - this.milesOn(id, this.today())); }
  /** How far along the trail someone's tent is, in stages (0 = trailhead). A dog: the miles it has run with people. */
  position(id) {
    const who = this.all.find((p) => p.id === id);
    if (who && isDog(who)) return this.dogStats(id).miles;
    const startKey = this.startKey();
    let p = 0;
    for (const r of this.store.rides) if (r.who === id && r.day >= startKey) p += r.stage || 0;
    return p;
  }
  /** Everybody's trail miles added together, and the family's target: a mile a day each, from the day they start. */
  together() {
    const startKey = this.startKey();
    let sum = 0;
    for (const r of this.store.rides) if (r.day >= startKey) sum += r.stage || 0;
    const people = this.profiles.filter((p) => !isDog(p)), n = this.doorCount();
    let goal = 0;
    for (const p of people) {
      const from = this.startsOn(p);
      goal += from ? clamp(n - Math.max(0, daysBetween(this.start(), from)), 0, n) : n;
    }
    return { miles: sum, goal: EVENT.goalMiles > 0 ? EVENT.goalMiles : goal, people: people.length };
  }
  /** Everyone who is here, furthest along first. */
  standings() {
    return this.family()
      .map((p) => (isDog(p)
        ? { profile: p, dog: true, pos: this.position(p.id), doors: 0, poops: this.dogStats(p.id).poops, today: false }
        : { profile: p, pos: this.position(p.id), doors: this.doorsOpen(p.id), today: this.doneOn(p.id, this.today()) }))
      .sort((a, b) => b.pos - a.pos);
  }

  // --- pretend histories (workshop and studio) -----------------------------
  /** Workshop: open the trail early if need be, then invent a family history. */
  pretend() {
    if (!this.started()) this.store.settings.seasonStart = dayKey(addDays(this.now(), -9));
    this.fillDemo();
  }

  /** Invent a plausible family history so the map and calendar have something to show. */
  fillDemo() {
    this.store.clearRides(true);
    const first = this.started() ? this.start() : addDays(this.now(), -9);
    const n = Math.min(daysBetween(first, this.now()) + 1, 40);
    const list = this.store.data.rides, gated = gatedGifts(this.all);
    const dogList = this.profiles.filter(isDog).map((d) => ({ d, door: gated.has(dogGift(d)) ? this.doorWith(dogGift(d)) : 0 }));
    const add = (p, pi, i) => {
      const day = addDays(first, i);
      const kind = hashI(pi * 31 + i) % 3 === 0 ? 'tread' : 'bike';
      // (a mile is a mile, so a pretend bike ride is kept short or everyone would be home in a week)
      const min = kind === 'bike' ? 4 + (hashI(pi * 7 + i * 3) % 9) : 10 + (hashI(pi * 7 + i * 3) % 28);
      const meters = kind === 'bike' ? min * 60 * 6.9 : min * 60 * 1.4;
      // a dog whose door this person has open runs part of the way, and stops about once a mile
      const dogs = {};
      dogList.forEach(({ d, door }, k) => {
        if (door > this.doorOf(dayKey(day))) return;
        const share = 0.35 + (hashI(pi * 53 + i * 17 + k * 7) % 45) / 100, m = Math.round(meters * share);
        dogs[d.id] = { m, poops: Math.round(m / MILE * (0.6 + (hashI(pi + i * 5 + k) % 80) / 100)) };
      });
      const ride = {
        id: `demo-${p.id}-${i}`, demo: true, who: p.id, day: dayKey(day), kind, min, m: Math.round(meters), climb: kind === 'tread' ? Math.round(meters * 0.05) : 0,
        cheer: min * 40, kcal: min * 8, trees: min * 2, rewards: [], stage: meters / STAGE_METERS[kind], open: 1,
      };
      if (Object.keys(dogs).length) ride.dogs = dogs;
      list.push(ride);
    };
    // day by day, so that people and dogs only start once they are here
    for (let i = 0; i < n; i++) {
      const day = addDays(first, i);
      this.profiles.forEach((p, pi) => {
        if (isDog(p)) return;                           // nobody rides as a dog
        const from = this.startsOn(p);
        if (from && day < from) return;
        const keen = 0.45 + ((hashI(pi * 77 + 5) % 50) / 100);
        if ((hashI(pi * 1000 + i * 13 + 1) % 100) / 100 > keen) return;
        add(p, pi, i);
      });
    }
    this.store.save();
  }
}

export { MILE };
