// The Workshop: test controls. Change machine, change the date, invent family
// history, start a ride anywhere in the world, and (during a ride) hop between
// zones, skip time, set off any advent thing and drive the simulated machine by touch.
//
// TEST IS ONLY FOR THE FAMILY'S TESTER (tester: true in profiles.js). The way in
// is the TEST button on the tester's own advent calendar, and the TEST button on their
// rides. Nobody else sees either. (And only while no real machine is attached, or with
// TEST CONTROLS switched on in the game's Settings.)
//
// The in-ride drawer has three pages:
//   RIDE    where you are and what the machine is doing
//   THINGS  every advent thing in the catalog (gifts.js) as a button: tap one and it
//           happens now, whatever the calendar says. Nothing done here is saved.
//   LOOK    how much is drawn, the time of day, a slower screen
import { W, H, SEG } from './config.js';
import { MONTHS, MILE } from './util.js';
import { drawText } from './font.js';
import { panel, button } from './ui.js';
import { header } from './chrome.js';
import { ZONES } from './world.js';
import { drawPortrait } from './portraits.js';
import { RideScreen, SKY_LOCKS } from './ride.js';
import { D, cycleDial, dialLabel, applyDetail } from './detail.js';

const STARTS = [['THE START', 0], ['HALFWAY', 0.5], ['NEAR THE END', 0.93]];

export class WorkshopScreen {
  /** who: whose calendar to go back to. */
  constructor(app, who) {
    this.app = app;
    this.backTo = who || null;
    this.t = 0;
    this.riders = app.profiles.filter((p) => !(p.look && p.look.species === 'dog'));   // nobody rides as a dog
    this.who = Math.max(0, this.riders.findIndex((p) => (app.lastRider ? p.id === app.lastRider : p.tester)));
    this.at = 0;
  }
  update(dt) { this.t += dt; this.app.backdrop.set(this.app.machine.kind); this.app.backdrop.update(dt); }

  back() { this.app.goPeople(this.backTo); }

  draw(ctx) {
    const app = this.app, input = app.input, m = app.machine, season = app.season, set = app.store.settings;
    app.backdrop.draw(ctx, 0.66);
    if (header(ctx, input, 'WORKSHOP', 'BACK')) { app.sound.tap(); this.back(); return; }
    const tap = () => app.sound.tap();
    const lx = 14, lw = 300;
    panel(ctx, lx - 6, 40, lw + 12, H - 52, { fill: 'rgba(8,14,46,0.92)' });

    // --- machine ---
    drawText(ctx, 'MACHINE', lx, 48, { color: '#ffd76a' });
    if (m.isSim) {
      if (button(ctx, input, lx, 60, 146, 24, 'BIKE', { kind: m.kind === 'bike' ? 'red' : 'blue', selected: m.kind === 'bike', scale: 2 })) { m.setKind('bike'); tap(); }
      if (button(ctx, input, lx + 154, 60, 146, 24, 'TREADMILL', { kind: m.kind === 'tread' ? 'red' : 'blue', selected: m.kind === 'tread', scale: 2 })) { m.setKind('tread'); tap(); }
    } else drawText(ctx, `REAL MACHINE ATTACHED: ${m.model}`, lx, 66, { color: '#9fe6b0' });

    // --- date ---
    const d = season.now();
    drawText(ctx, 'DATE', lx, 96, { color: '#ffd76a' });
    drawText(ctx, `PRETENDING IT IS ${MONTHS[d.getMonth()]} ${d.getDate()}${set.dayOffset ? '' : ' (REALLY)'}`, lx + 36, 96, { color: '#c9d8ff' });
    const move = (n) => { set.dayOffset = n === null ? 0 : (set.dayOffset || 0) + n; app.store.save(); tap(); };
    if (button(ctx, input, lx, 108, 56, 22, '◀ DAY', { kind: 'blue' })) move(-1);
    if (button(ctx, input, lx + 62, 108, 56, 22, 'DAY ▶', { kind: 'blue' })) move(1);
    if (button(ctx, input, lx + 124, 108, 62, 22, 'WEEK ▶', { kind: 'blue' })) move(7);
    if (button(ctx, input, lx + 192, 108, 108, 22, 'BACK TO TODAY', { kind: set.dayOffset ? 'gold' : 'ghost' })) move(null);
    drawText(ctx, season.started() ? `TRAIL DAY ${season.doorToday()} OF ${season.doorCount()}` : `TRAIL OPENS IN ${season.daysUntilStart()} DAYS`, lx, 136, { color: '#9fb6ee' });

    // --- pretend family history ---
    drawText(ctx, 'FAMILY HISTORY', lx, 154, { color: '#ffd76a' });
    const demo = app.store.rides.filter((r) => r.demo).length;
    drawText(ctx, `${app.store.rides.length} RIDES SAVED, ${demo} PRETEND`, lx + 96, 154, { color: '#c9d8ff' });
    if (button(ctx, input, lx, 166, 146, 22, 'FILL WITH PRETEND RIDES', { kind: 'blue' })) { season.pretend(); tap(); }
    if (button(ctx, input, lx + 154, 166, 146, 22, 'REMOVE PRETEND RIDES', { kind: 'ghost' })) { app.store.clearRides(true); set.seasonStart = ''; app.store.save(); tap(); }
    // advent: normally a buddy, dog, song or surprise stays away until its door is open
    if (button(ctx, input, lx, 193, 300, 20, set.unlockAll ? 'ADVENT DOORS: ALL OPEN FOR EVERYBODY (DEV)' : 'ADVENT DOORS: AS THE CALENDAR SAYS', { kind: set.unlockAll ? 'gold' : 'ghost' })) { set.unlockAll = !set.unlockAll; app.store.save(); tap(); }
    if (button(ctx, input, lx, 220, 96, 22, 'SEE THE MAP', { kind: 'blue' })) { tap(); app.openMap(); return; }
    if (button(ctx, input, lx + 102, 220, 96, 22, 'SEE ADVENT', { kind: 'blue' })) { tap(); app.openAdvent(this.backTo); return; }
    if (button(ctx, input, lx + 204, 220, 96, 22, 'SPEED TEST', { kind: 'gold' })) { app.sound.unlock(); tap(); app.speedTest.start(); return; }
    const st = set.speedTest;
    if (st && st.results) drawText(ctx, `LAST SPEED TEST: ${st.results.map((r) => `${r.level.toUpperCase()} ${Math.round(r.fps)}`).join('  ')} FPS`, lx, 248, { color: '#9fe6b0' });

    drawText(ctx, 'DURING A RIDE, TAP "DEV" (TOP RIGHT). ITS THINGS PAGE SETS', lx, H - 40, { color: '#8fa3d6' });
    drawText(ctx, 'OFF ANY ADVENT THING NOW, WHATEVER THE CALENDAR SAYS.', lx, H - 29, { color: '#8fa3d6' });

    // --- start a test ride anywhere ---
    const rx = lx + lw + 20, rw = W - rx - 8;
    panel(ctx, rx - 6, 40, rw + 6, H - 52, { fill: 'rgba(8,14,46,0.92)' });
    drawText(ctx, 'START A DEV RIDE', rx, 48, { color: '#ffd76a' });
    const p = this.riders[this.who], count = this.riders.length;
    if (button(ctx, input, rx, 62, 26, 26, '◀', { kind: 'blue' })) { this.who = (this.who + count - 1) % count; tap(); }
    drawPortrait(ctx, p, rx + 34, 66, 24);
    drawText(ctx, p.name, rx + 64, 68, { scale: 2 });
    if (button(ctx, input, rx + rw - 34, 62, 26, 26, '▶', { kind: 'blue' })) { this.who = (this.who + 1) % count; tap(); }
    STARTS.forEach(([label], k) => {
      const bw = Math.floor((rw - 16) / 3);
      if (button(ctx, input, rx + k * (bw + 4), 96, bw, 20, label, { kind: this.at === k ? 'gold' : 'blue', selected: this.at === k })) { this.at = k; tap(); }
    });
    drawText(ctx, 'TAP A PLACE TO RIDE THERE NOW:', rx, 124, { color: '#c9d8ff' });
    ZONES.forEach((z, k) => {
      const bw = Math.floor((rw - 12) / 2), x = rx + (k % 2) * (bw + 4), y = 136 + Math.floor(k / 2) * 25;
      if (button(ctx, input, x, y, bw, 21, z.name, { kind: 'green' })) {
        app.sound.unlock(); tap();
        app.go(new RideScreen(app, p, 1, { zoneType: k, progress: STARTS[this.at][1], quick: true, test: true }));
      }
    });
  }
}

/**
 * The in-ride drawer of test buttons. Call from RideScreen.draw when it is open.
 * Three pages: RIDE (where you are, what the machine is doing), THINGS (set off anything
 * in the catalog) and LOOK (how much is drawn, the time of day, a slower screen).
 */
export function devDrawer(ctx, ride) {
  const app = ride.app, input = app.input, m = app.machine, s = ride.session, sim = m.sim;
  const bw = 66, bh = 18, gap = 3, x = W - 2 * bw - 14, top = 46;
  const look = ride.devPage === 'look';
  const tapped = () => app.sound.tap();
  const PAGES = [['ride', 'RIDE'], ['things', 'THINGS'], ['look', 'LOOK']];
  if (ride.devPage === 'things') {
    // every thing in the catalog, three to a row
    const list = ride.testList(), cols = 3, tw = 68, th = 17, tg = 3;
    const pw = cols * tw + (cols - 1) * tg + 12, tx = W - pw - 4, rows = Math.ceil(list.length / cols);
    panel(ctx, tx, top - 6, pw, 30 + rows * (th + tg) + 14, { fill: 'rgba(8,14,46,0.92)', border: '#ffd76a' });
    PAGES.forEach(([page, label], i) => {
      const on = ride.devPage === page;
      if (button(ctx, input, tx + 6 + i * (tw + tg), top, tw, bh, label, { kind: on ? 'gold' : 'ghost', selected: on }) && !on) { ride.devPage = page; tapped(); }
    });
    if (ride.devPage !== 'things') return;
    list.forEach((it, i) => {
      const bx = tx + 6 + (i % cols) * (tw + tg), by = top + 24 + Math.floor(i / cols) * (th + tg);
      if (button(ctx, input, bx, by, tw, th, it.label, { kind: 'blue' })) { it.run(); tapped(); }
    });
    drawText(ctx, 'TAP ONE: IT HAPPENS NOW. NOT SAVED.', tx + pw / 2, top + 26 + rows * (th + tg), { align: 'center', color: '#9fe6b0' });
    return;
  }

  let rows, notes = [];
  if (!look) {
    rows = [
      ['ZONE ◀', () => ride.world.hopZone(-1), 'ZONE ▶', () => ride.world.hopZone(1)],
      ['+1 MIN', () => { s.active += 60; s.elapsed += 60; }, '+5 MIN', () => { s.active += 300; s.elapsed += 300; }],
      ['REWARD', () => { ride.nextReward = s.meters / MILE; }, '+1 MILE', () => { s.meters += MILE; }],
      ['SPIRIT', () => { s.spirit = 1; }, 'LIGHTS', () => ride.lightAll()],
      ['GOAL', () => { if (s.goalMeters) s.meters = Math.max(s.meters, s.goalMeters - 20); },
        'COOKIE', () => { ride.pick = { title: '', options: ['gingerbread'], t: 0, at: 0 }; ride.choose(['gingerbread', 'sugarstar', 'chocchip'][(Math.random() * 3) | 0]); }],
      ['WORKSHOP', () => app.openWorkshop(), 'END RIDE', () => ride.finish()],
    ];
    if (sim) {
      rows.push(['SLOWER', () => sim.faster(-1), 'FASTER', () => sim.faster(1)]);
      rows.push(['EASIER', () => sim.harder(-1), 'HARDER', () => sim.harder(1)]);
      rows.push([sim.auto ? 'AUTO: ON' : 'AUTO: OFF', () => { sim.auto = !sim.auto; }, 'STOP', () => sim.stop()]);
      const T = sim.target;
      notes.push(m.kind === 'bike' ? `${Math.round(T.cadence)} RPM  RES ${Math.round(T.resistance)}` : `${T.speed.toFixed(1)} MPH  ${T.incline.toFixed(1)}%`);
    }
  } else {
    const set = app.store.settings;
    const choose = (c) => () => { set.detail = c; app.store.save(); applyDetail(set); };
    const dial = (name) => () => { Object.assign(set, cycleDial(name)); app.store.save(); };
    const lock = Math.max(0, SKY_LOCKS.findIndex((l) => l[1] === ride.skyLock));
    const slows = [1, 4, 6];
    rows = [
      ['AUTO', choose('auto'), 'FULL', choose('full'), D.choice === 'auto', D.choice === 'full'],
      ['MEDIUM', choose('medium'), 'LIGHT', choose('light'), D.choice === 'medium', D.choice === 'light'],
      [dialLabel('trees'), dial('trees'), dialLabel('fog'), dial('fog')],
      [dialLabel('snow'), dial('snow'), dialLabel('glow'), dial('glow')],
      [`SKY ${SKY_LOCKS[lock][0]}`, () => { ride.skyLock = SKY_LOCKS[(lock + 1) % SKY_LOCKS.length][1]; }, app.slow > 1 ? `SLOW ×${app.slow}` : 'SLOW OFF', () => { app.slow = slows[(slows.indexOf(app.slow) + 1) % slows.length]; }, lock > 0, app.slow > 1],
      ['SPEED TEST', () => app.speedTest.start(), 'FPS', () => { app.showFps = !app.showFps; }],
    ];
    notes.push(`${Math.round(app.fps || 0)} FPS  ${app.workMs.toFixed(1)} MS WORK`);
    notes.push(`${D.stats.sprites} SPRITES  ${D.stats.lights + D.stats.glows} LIGHTS`);
    notes.push(D.choice === 'auto' ? `AUTO IS ON ${D.level.toUpperCase()}${D.half ? ', STEADY 30' : ''}` : D.choice === 'custom' ? 'YOUR OWN MIX (SAVED)' : `${D.level.toUpperCase()} (SAVED)`);
  }

  const machineRow = !look && sim;
  const y0 = top + 22 + (machineRow ? 32 : 0);
  panel(ctx, x - 6, top - 6, 2 * bw + 16, (y0 - top) + rows.length * (bh + gap) + notes.length * 10 + 10, { fill: 'rgba(8,14,46,0.9)', border: '#ffd76a' });
  PAGES.forEach(([page, label], i) => {
    const on = ride.devPage === page, pwid = 44;
    if (button(ctx, input, x + i * (pwid + 1), top, pwid, bh, label, { kind: on ? 'gold' : 'ghost', selected: on }) && !on) { ride.devPage = page; tapped(); }
  });
  if (machineRow) {
    // which machine the simulator is pretending to be: tapping the other one restarts
    // this same ride (same person, same place, same point in the workout) on it
    drawText(ctx, 'MACHINE', x, top + 23, { color: '#ffd76a' });
    [['bike', 'BIKE'], ['tread', 'TREADMILL']].forEach(([kind, label], i) => {
      const on = m.kind === kind;
      if (button(ctx, input, x + i * (bw + 4), top + 33, bw, bh, label, { kind: on ? 'red' : 'blue', selected: on }) && !on) {
        tapped();
        const zone = ride.world.zoneAt(Math.floor(ride.world.z / SEG)).type, at = ride.session.progress;
        m.locked = false;
        m.setKind(kind);
        const next = new RideScreen(app, ride.profile, ride.goalMiles, { zoneType: zone, progress: at, quick: true, sky: ride.skyLock, test: ride.canTest });
        for (const id of ride.rider.pack.ids) next.rider.addBuddy(id);
        next.devOpen = true;
        app.go(next);
      }
    });
  }
  if (app.screen !== ride || ride.devPage !== (look ? 'look' : 'ride')) return;   // we just switched machine or page
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], y = y0 + i * (bh + gap);
    if (button(ctx, input, x, y, bw, bh, r[0], { kind: r[4] ? 'gold' : 'blue', selected: !!r[4] })) { r[1](); tapped(); }
    if (app.screen !== ride) return;
    if (button(ctx, input, x + bw + 4, y, bw, bh, r[2], { kind: r[5] ? 'gold' : 'blue', selected: !!r[5] })) { r[3](); tapped(); }
    if (app.screen !== ride) return;
  }
  notes.forEach((line, i) => drawText(ctx, line, x + bw + 2, y0 + rows.length * (bh + gap) + 2 + i * 10, { align: 'center', color: '#9fe6b0' }));
}
