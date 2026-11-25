// Merry Miles' own front page, in two steps.
//
// WHO ARE YOU?  The start of the journey: what we are all doing (a mile a day,
//   Thanksgiving to Christmas, home together), how far along the family is, and
//   everybody who is here standing in a line at their real height with their miles.
//   People who have not arrived yet are not in the line (camp.js: here()). The dogs,
//   once they have joined, are not in the line either: nobody rides as a dog. They
//   run back and forth in front of everybody. Tap one for its numbers (miles, poop breaks).
//
// YOUR ADVENT CALENDAR  Tap yourself and the whole screen becomes your own calendar:
//   every door, with a line under each saying what it takes (WALK 1 MIN, TOMORROW) or what
//   was inside. A locked door has a padlock. Riding unlocks doors, a minute each; an
//   unlocked door is opened by tapping it, here or while it hovers beside you on a ride.
//   Tap any door you have opened and it opens all over again in the panel on the right
//   (door.js). LET'S GO starts the ride. The family's tester (tester: true in profiles.js)
//   also gets a TEST button here, and can play any door at all by tapping it twice.
//
// The ride itself is decided by the machine you are standing on (bike -> fat bike,
// treadmill -> skin track).
import { W, H, HOME_SHORT } from './config.js';
import { MONTHS, clamp } from './util.js';
import { drawText, textWidth } from './font.js';
import { panel, button } from './ui.js';
import { glowCanvas, LIGHT_COLS, LIGHT_CSS, uiSprite } from './sprites.js';
import { EVENT, THANKSGIVING } from './text.js';
import { RideScreen } from './ride.js';
import { figureSprite } from './figure.js';
import { giftInfo, giftIcon, earnedFor, isFor } from './gifts.js';
import { doorCard, stepDoor, drawDoorSide, closeDoor, SIDE_W, SIDE_H } from './door.js';

const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const trim = (v) => String(Math.round(v * 10) / 10);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'S'}`;
/** A little padlock, 7 pixels by 9: what a door you cannot open yet wears. (x, y) is its top-left. */
export function padlock(ctx, x, y, col = '#ffd76a') {
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y, 5, 1); ctx.fillRect(x + 1, y + 1, 1, 3); ctx.fillRect(x + 5, y + 1, 1, 3);
  ctx.fillRect(x, y + 4, 7, 5);
  ctx.fillStyle = 'rgba(40,24,6,0.85)';
  ctx.fillRect(x + 3, y + 5, 1, 2);
}

export class HomeScreen {
  /** who: open straight on that person's calendar (coming back from the family calendar). */
  constructor(app, who) {
    this.app = app;
    this.t = 0;
    this.step = who ? 'setup' : 'who';
    this.profile = who || null;
    this.sel = 0;            // the door last tapped on the calendar
    this.nudge = null;       // a locked door that was tapped: it rattles { k, t }
    this.logoTaps = 0;
    this.pack = new Map();   // the dogs running about on the WHO ARE YOU? screen, by id
    this.dogCard = null;     // the dog whose numbers are up
    this.replay = null;      // a door opening (or opening again) in the panel on the right of your calendar
    if (who) app.songbookFor(who);
  }

  update(dt) {
    this.t += dt;
    this.app.backdrop.set(this.app.machine.kind);
    this.app.backdrop.update(dt);
    // the dogs: trot one way, turn at the end, sit and look at you now and then
    for (const d of this.pack.values()) {
      d.hop = Math.max(0, d.hop - dt * 2.4);
      if (d.sit > 0) { d.sit -= dt; continue; }
      d.x += d.dir * d.v * dt;
      if (d.x > W - 40) { d.x = W - 40; d.dir = -1; } else if (d.x < 40) { d.x = 40; d.dir = 1; }
      if ((d.next -= dt) < 0) { d.sit = 1.2 + Math.random() * 1.4; d.next = 5 + Math.random() * 7; if (Math.random() < 0.35) d.dir = -d.dir; }
    }
    if (this.dogCard) this.dogCard.t += dt;
    if (this.replay && !stepDoor(this.replay, dt, this.app.sound)) this.replay = null;
    if (this.nudge && (this.nudge.t += dt) > 0.5) this.nudge = null;
  }

  back() { this.replay = null; if (this.step === 'setup') this.step = 'who'; else this.app.goLauncher(); }

  draw(ctx) {
    const app = this.app, input = app.input, m = app.machine;
    const top = Math.floor((H - 336) / 2);
    if (this.step === 'setup') { this._setup(ctx, top); return; }
    app.backdrop.draw(ctx, 0.46);

    // --- what we are doing: the name of the thing, on a string of lights ---
    const scale = textWidth(EVENT.name, 3) <= 404 ? 3 : 2;
    const lw = textWidth(EVENT.name, scale), ly = top + 9;
    drawText(ctx, EVENT.name, W / 2 + 2, ly + 2, { scale, align: 'center', color: '#8a1f2c', shadow: null });
    drawText(ctx, EVENT.name, W / 2, ly, { scale, align: 'center', color: '#ffffff', shadow: 'rgba(4,8,30,0.6)' });
    this._lights(ctx, W / 2 - lw / 2 - 6, lw + 12, ly + scale * 7 + 5, 22);
    if (input.tapIn(W / 2 - lw / 2, ly - 4, lw, 30)) {
      if (++this.logoTaps % 5 === 0) { app.backdrop.snow.heavy = !app.backdrop.snow.heavy; app.sound.chime(); }
    }
    if (button(ctx, input, 8, 8, 96, 24, `◀ ${HOME_SHORT}`, { kind: 'ghost' })) { app.sound.tap(); app.goLauncher(); return; }

    this._who(ctx, top);

    // --- footer: the game's own menu ---
    const fy = H - 24;
    const items = [['MAP', () => app.openMap()], ['CALENDAR', () => app.openAdvent()], ['SETTINGS', () => app.openSettings()]];
    const bw = 92, total = items.length * bw + (items.length - 1) * 8, x0 = Math.round((W - total) / 2);
    items.forEach(([label, go], i) => {
      if (button(ctx, input, x0 + i * (bw + 8), fy, bw, 20, label, { kind: 'blue' })) { app.sound.tap(); go(); }
    });
    drawText(ctx, m.isSim ? `SIM: ${m.kind === 'bike' ? 'BIKE' : 'TREAD'}` : m.model, 8, fy + 7, { color: m.isSim ? '#8fa3d6' : '#9fe6b0' });
  }

  /** A sagging string of fairy lights. */
  _lights(ctx, x, w, y, bulbs) {
    const at = (i) => { const u = i / (bulbs - 1); return [Math.round(x + u * w), Math.round(y + Math.sin(u * Math.PI) * 3)]; };
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < bulbs; i++) {
      const [bx, by] = at(i);
      ctx.globalAlpha = 0.6 * (0.6 + 0.4 * Math.sin(this.t * 2.4 + i * 1.7));
      ctx.drawImage(glowCanvas(LIGHT_COLS[i % 5]), bx - 5, by - 5, 12, 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    for (let i = 0; i < bulbs; i++) { const [bx, by] = at(i); ctx.fillStyle = LIGHT_CSS[i % 5]; ctx.fillRect(bx, by, 2, 2); }
  }

  /** The whole journey on one line: trailhead, a mark for every day, everybody's place on it, home. */
  _journey(ctx, y) {
    const app = this.app, season = app.season;
    const n = season.totalStages(), x0 = 88, x1 = W - 64, xOf = (mi) => Math.round(x0 + (clamp(mi, 0, n) / n) * (x1 - x0));
    const today = season.doorToday();
    ctx.fillStyle = 'rgba(8,14,46,0.55)';
    ctx.fillRect(x0 - 2, y - 1, x1 - x0 + 4, 4);
    ctx.fillStyle = '#c9d8ff';
    ctx.fillRect(x0, y, x1 - x0, 2);
    ctx.fillStyle = '#e8454c';
    ctx.fillRect(x0, y, xOf(today) - x0, 2);                         // the days gone by
    for (let i = 1; i < n; i++) {
      const x = xOf(i);
      ctx.fillStyle = i === today ? '#ffd76a' : i < today ? '#e8454c' : '#6f86c6';
      ctx.fillRect(x - 1, y - (i % 5 === 0 || i === today ? 3 : 1), 2, i % 5 === 0 || i === today ? 8 : 4);
    }
    // the two ends of it are Thanksgiving and Christmas (or the day the trail really opens, if that was moved in Settings)
    const first = season.start(), tg = season.thanksgiving();
    const from = first.getMonth() === tg.getMonth() && first.getDate() === tg.getDate() ? 'THANKSGIVING' : `${MONTHS[first.getMonth()]} ${first.getDate()}`;
    drawText(ctx, from, x0 - 6, y - 3, { align: 'right', color: '#c9d8ff' });
    const home = uiSprite('cabin', 0, 5);
    ctx.drawImage(home, x1 + 4, y - home.height + 6);
    drawText(ctx, 'CHRISTMAS', x1 + 4 + home.width, y + 9, { align: 'right', color: '#ffd76a' });
    if (today > 0 && today < n - 2) drawText(ctx, 'TODAY', xOf(today), y + 8, { align: 'center', color: '#ffd76a' });
    // everybody who is here, as a flag in their colour; people at the same spot fan out upward
    const seen = [];
    season.standings().slice().reverse().forEach((s) => {
      const x = xOf(s.pos);
      const k = seen.filter((q) => Math.abs(q - x) < 5).length;
      seen.push(x);
      const fx = x + (k % 4) * 5, fyy = y - 9 - Math.floor(k / 4) * 7;
      ctx.fillStyle = 'rgba(8,14,46,0.7)';
      ctx.fillRect(fx, fyy, 1, 9);
      ctx.fillStyle = rgb(s.profile.jacket);
      ctx.fillRect(fx + 1, fyy, 4, 4);
    });
  }

  /** The season has not opened (ONLY IN THE SEASON): nobody is here, only the days to go. */
  _countdown(ctx, top) {
    const season = this.app.season, n = season.daysUntilStart(), y = top + 112;
    drawText(ctx, EVENT.tagline, W / 2, top + 42, { align: 'center', color: '#dfe9ff' });
    this._journey(ctx, top + 72);
    drawText(ctx, String(n), W / 2, y, { scale: 10, align: 'center', color: '#ffd76a' });
    drawText(ctx, n === 1 ? 'DAY' : 'DAYS', W / 2, y + 82, { scale: 4, align: 'center', color: '#ffd76a' });
    drawText(ctx, `UNTIL ${EVENT.name}`, W / 2, y + 122, { scale: 2, align: 'center', color: '#ffffff' });
  }

  _who(ctx, top) {
    if (this.app.season.locked()) { this._countdown(ctx, top); return; }
    const app = this.app, input = app.input, season = app.season, list = season.roster();
    if (season.isThanksgiving()) drawText(ctx, `${THANKSGIVING.line} ${THANKSGIVING.say}`, W / 2, top + 38, { scale: 2, align: 'center', color: '#ffd76a' });
    else drawText(ctx, EVENT.tagline, W / 2, top + 42, { align: 'center', color: '#dfe9ff' });
    this._journey(ctx, top + 72);

    // how far we have all come
    const tog = season.together();
    drawText(ctx, season.started() ? `TOGETHER: ${tog.miles.toFixed(1)} OF ${tog.goal} MILES` : `WE SET OFF IN ${plural(season.daysUntilStart(), 'DAY')}`, W / 2, top + 92, { align: 'center', color: '#9fe6b0' });
    const bx = W / 2 - 90;
    ctx.fillStyle = 'rgba(160,190,255,0.25)';
    ctx.fillRect(bx, top + 102, 180, 3);
    ctx.fillStyle = '#9fe6b0';
    ctx.fillRect(bx, top + 102, Math.round(180 * clamp(tog.miles / Math.max(1, tog.goal), 0, 1)), 3);

    drawText(ctx, 'WHO ARE YOU?', W / 2, top + 114, { scale: 2, align: 'center', color: '#ffffff' });
    // (who has still to arrive is not said here: that would give the calendar away)

    // the line-up: everybody at their real height, standing in the snow. Until there are four people,
    // dashed outlines stand for the ones who are not here yet (a family meeting puts them in: docs/FAMILY_MEETING.md)
    const real = list.filter((q) => !q.guest), slots = real.concat(Array(Math.max(0, 4 - real.length)).fill(null), list.filter((q) => q.guest));
    const ground = H - 62, slot = Math.min(110, Math.floor((W - 16) / slots.length)), x0 = Math.round((W - slot * slots.length) / 2);
    const ppm = clamp(Math.floor((ground - (top + 136)) / 2.3), 30, 62);
    const wq = Math.floor(this.t * 4) % 4, today = season.today();
    ctx.fillStyle = 'rgba(236,244,255,0.92)';
    ctx.fillRect(8, ground - 1, W - 16, 4);
    ctx.fillStyle = 'rgba(200,218,244,0.9)';
    ctx.fillRect(8, ground + 3, W - 16, 2);
    const modal = !!this.dogCard;
    // the dogs in front of the line: which of them was tapped comes first, so a tap on a dog is not a tap on a person
    const dogs = season.dogsHere();
    for (const dp of dogs) if (!this.pack.has(dp.id)) this.pack.set(dp.id, { x: 60 + this.pack.size * 240 + Math.random() * 80, dir: this.pack.size % 2 ? -1 : 1, v: 30 + this.pack.size * 9, sit: 0, next: 3 + Math.random() * 5, hop: 0 });
    const dogBox = (dp) => { const d = this.pack.get(dp.id), hgt = Math.round(ppm * 1.45); return { d, x: Math.round(d.x) - Math.round(ppm * 0.9), y: ground + 3 - hgt, w: Math.round(ppm * 1.8), h: hgt }; };
    if (!modal) {
      for (const dp of dogs) {
        const b = dogBox(dp);
        if (input.tapIn(b.x, b.y, b.w, b.h)) { this.dogCard = { dog: dp, t: 0 }; b.d.hop = 1; b.d.sit = 2.5; app.sound.unlock(); app.sound.chime(); }
      }
    }
    slots.forEach((p, i) => {
      const x = x0 + i * slot, cx = x + Math.round(slot / 2);
      const hot = !modal && !this.dogCard && input.over(x, top + 132, slot, H - 30 - (top + 132));
      if (!p) {
        this._outline(ctx, cx, ground, ppm, hot, i);
        if (!modal && !this.dogCard && input.tapIn(x, top + 132, slot, H - 30 - (top + 132))) { app.sound.tap(); app.flash('THE REST OF THE FAMILY COMES IN A FAMILY MEETING: ASK YOUR AI'); }
        return;
      }
      if (hot) panel(ctx, x + 1, top + 134, slot - 2, H - 34 - (top + 134), { fill: 'rgba(30,44,110,0.7)', border: '#fff6c8' });
      const f = figureSprite(p, 'front', 'stand', ppm, 0, wq);
      ctx.fillStyle = 'rgba(6,14,46,0.3)';
      ctx.fillRect(cx - 13, ground, 26, 2);
      ctx.drawImage(f.canvas, cx - f.footX, ground - f.footY - (hot ? 2 : 0));
      drawText(ctx, p.name, cx, ground + 9, { align: 'center', color: hot ? '#fff6c8' : '#ffffff' });
      if (p.guest) drawText(ctx, 'VISITING', cx, ground + 20, { align: 'center', color: '#9fe6b0' });
      else {
        const done = season.doneOn(p.id, today);
        drawText(ctx, `${season.position(p.id).toFixed(1)} MI${done ? ' ★' : ''}`, cx, ground + 20, { align: 'center', color: done ? '#ffd76a' : '#9fe6b0' });
      }
      if (!modal && !this.dogCard && input.tapIn(x, top + 132, slot, H - 30 - (top + 132))) {
        this.profile = p; this.step = 'setup'; this.sel = 0;
        app.songbookFor(p);
        app.sound.unlock(); app.sound.tap(); app.sound.startMusic();
      }
    });

    // the dogs, drawn over the line: side-on while they trot, facing you while they sit
    for (const dp of dogs) {
      const { d } = dogBox(dp), sitting = d.sit > 0;
      const f = sitting ? figureSprite(dp, 'front', 'stand', ppm, 0, wq) : figureSprite(dp, 'side', 'tread', ppm, Math.floor(this.t * 14) % 12, wq);
      const gy = ground + 3, lift = Math.round(Math.sin(d.hop * Math.PI) * 12), dx = Math.round(d.x);
      ctx.fillStyle = 'rgba(6,14,46,0.3)';
      ctx.fillRect(dx - 14, gy, 28, 2);
      if (!sitting && d.dir < 0) { ctx.save(); ctx.translate(dx, 0); ctx.scale(-1, 1); ctx.drawImage(f.canvas, -f.footX, gy - f.footY - lift); ctx.restore(); }
      else ctx.drawImage(f.canvas, dx - f.footX, gy - f.footY - lift);
      const tag = `${dp.name} ${season.position(dp.id).toFixed(1)} MI`, tw = textWidth(tag) + 10;
      const tx = clamp(dx - tw / 2, 10, W - 10 - tw), ty = gy - Math.round(ppm * 1.45) - 12 - lift;
      panel(ctx, tx, ty, tw, 13, { fill: 'rgba(8,14,46,0.85)', border: 'rgba(201,162,122,0.8)' });
      drawText(ctx, tag, tx + 5, ty + 3, { color: '#f0d9b8' });
    }
    if (this.dogCard) this._dogCard(ctx, top);
  }

  /** Somebody who is not here yet: a dashed outline of a person, with a question mark for a face. */
  _outline(ctx, cx, ground, ppm, hot, i) {
    const pulse = 0.5 + 0.12 * Math.sin(this.t * 2 + i * 1.3), a = hot ? 0.95 : pulse;
    const X = (m) => cx + Math.round(m * ppm), Y = (m) => ground - Math.round(m * ppm);
    const body = [[-0.2, 1.42], [0.2, 1.42], [0.26, 1.38], [0.28, 0.9], [0.2, 0.88], [0.19, 0], [0.04, 0], [0.03, 0.82], [-0.03, 0.82], [-0.04, 0], [-0.19, 0], [-0.2, 0.88], [-0.28, 0.9], [-0.26, 1.38]];
    const head = Array.from({ length: 24 }, (_, k) => [Math.cos((k / 24) * 6.2832) * 0.12, 1.58 + Math.sin((k / 24) * 6.2832) * 0.13]);
    ctx.fillStyle = `rgba(201,216,255,${a})`;
    for (const poly of [body, head]) {
      let on = true, run = 0;
      for (let k = 0; k < poly.length; k++) {
        const [ax, ay] = poly[k], [bx, by] = poly[(k + 1) % poly.length];
        const x0 = X(ax), y0 = Y(ay), x1 = X(bx), y1 = Y(by), n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
        for (let j = 0; j < n; j++) {
          if (on) ctx.fillRect(Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n), 2, 2);
          if (++run >= 4) { run = 0; on = !on; }
        }
      }
    }
    drawText(ctx, '?', X(0), Y(1.58) - 5, { scale: 2, align: 'center', color: `rgba(201,216,255,${a})`, shadow: null });
    drawText(ctx, 'ADD SOMEONE', cx, ground + 9, { align: 'center', color: hot ? '#fff6c8' : '#8fa3d6' });
    drawText(ctx, 'FAMILY MEETING', cx, ground + 20, { align: 'center', color: '#6f86c6' });
  }

  /** A dog's numbers. Nobody rides as a dog: this is all that tapping one does. */
  _dogCard(ctx, top) {
    const app = this.app, input = app.input, season = app.season, c = this.dogCard, dp = c.dog, st = season.dogStats(dp.id);
    ctx.fillStyle = 'rgba(4,8,30,0.6)';
    ctx.fillRect(0, 0, W, H);
    const pw = 340, ph = 188, px = Math.round((W - pw) / 2), py = top + 78;
    panel(ctx, px, py, pw, ph, { fill: 'rgba(8,14,46,0.96)', border: '#c9a27a' });
    const f = figureSprite(dp, 'front', 'stand', 56, 0, Math.floor(this.t * 6) % 4);
    ctx.fillStyle = 'rgba(236,244,255,0.9)';
    ctx.fillRect(px + 16, py + 124, 84, 3);
    ctx.drawImage(f.canvas, px + 58 - f.footX, py + 124 - f.footY);
    const tx = px + 116;
    drawText(ctx, dp.name, tx, py + 14, { scale: 3, color: '#ffffff' });
    drawText(ctx, 'RUNS WITH EVERYBODY. NOBODY RIDES AS A DOG.', px + pw / 2, py + ph - 38, { align: 'center', color: '#8fa3d6' });
    const lines = [
      [`${st.miles.toFixed(1)}`, st.miles.toFixed(1) === '1.0' ? 'TRAIL MILE RUN' : 'TRAIL MILES RUN'],
      [`${st.poops}`, st.poops === 1 ? 'POOP BREAK' : 'POOP BREAKS'],
      [`${st.outings}`, st.outings === 1 ? 'OUTING JOINED' : 'OUTINGS JOINED'],
    ];
    lines.forEach(([num, label], i) => {
      drawText(ctx, num, tx + 44, py + 46 + i * 18, { scale: 2, align: 'right', color: '#ffd76a' });
      drawText(ctx, label, tx + 52, py + 50 + i * 18, { color: '#dfe9ff' });
    });
    [st.pal ? `RUNS MOST WITH ${st.pal.name}` : 'HAS NOT BEEN OUT YET', st.best > 0.05 ? `LONGEST RUN: ${st.best.toFixed(1)} TRAIL MILES` : '', st.sprinkles ? `SPRINKLE POWER POOPS: ${st.sprinkles}` : ''].filter(Boolean)
      .forEach((line, i) => drawText(ctx, line, tx, py + 104 + i * 11, { color: '#c9a27a' }));
    const done = button(ctx, input, px + pw / 2 - 60, py + ph - 26, 120, 20, 'GOOD DOG', { kind: 'gold' });
    if (done || (c.t > 0.3 && input.taps.length)) { input.taps.length = 0; this.dogCard = null; app.sound.tap(); }
  }

  /**
   * Your own advent calendar: the whole screen. Left, every door, and under each one what
   * it takes or what was in it. Right, today's goal; and when you tap a door, the door
   * opening, in a card that takes the goal's place for a few seconds.
   */
  _setup(ctx, top) {
    const app = this.app, input = app.input, p = this.profile, m = app.machine, season = app.season;
    app.backdrop.draw(ctx, 0.84);
    // a candy-cane band top and bottom: this is a different place from the menu
    for (const y of [0, H - 5]) {
      for (let x = -6; x < W; x += 12) {
        ctx.fillStyle = '#f4f6ff'; ctx.fillRect(x, y, 12, 5);
        ctx.fillStyle = '#c8343c';
        for (let r = 0; r < 5; r++) ctx.fillRect(x + r, y + 4 - r, 6, 1);
      }
    }
    const guest = !!p.guest, n = season.doorCount(), today = season.doorToday(), gating = season.gating();
    // a visitor looks at the family's calendar: whatever anybody has opened
    const open = !gating ? n : guest ? Math.max(0, ...season.family().map((q) => season.doorsOpen(q.id))) : season.doorsOpen(p.id);
    const unlocked = guest || !gating ? open : season.doorsUnlocked(p.id);
    const days = season.days(), tester = app.canTest(p);
    const verb = m.kind === 'bike' ? 'RIDE' : 'WALK';

    drawText(ctx, guest ? "THE FAMILY'S ADVENT CALENDAR" : `${p.name}'S ADVENT CALENDAR`, 14, top + 12, { scale: 2, color: '#ffffff' });

    // --- the doors ---
    const cols = n <= 25 ? 5 : n <= 30 ? 6 : n <= 35 ? 7 : 8, rows = Math.ceil(n / cols);
    const gx = 14, gy = top + 34, gw = 380, gh = H - 46 - gy;
    const cw = Math.floor((gw - (cols - 1) * 4) / cols), ch = Math.floor((gh - (rows - 1) * 2) / rows), dh = ch - 10;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
    days.forEach((d, i) => {
      const k = i + 1, y = gy + Math.floor(i / cols) * (ch + 2), last = k === n;
      const isOpen = k <= open, ready = !isOpen && k <= unlocked, next = ready && k === open + 1, due = !isOpen && !ready && k <= today;
      const rattle = this.nudge && this.nudge.k === k ? Math.round(Math.sin(this.nudge.t * 50) * 2 * (1 - this.nudge.t / 0.5)) : 0;
      const x = gx + (i % cols) * (cw + 4) + rattle;
      const showing = this.replay && this.replay.door === k;
      let caption = '', capCol = '#8fa3d6';
      if (isOpen) {
        const info = giftInfo(season.giftAt(k), app.profiles, p);
        panel(ctx, x, y, cw, dh, { fill: 'rgba(20,34,90,0.96)', border: showing ? '#fff6c8' : 'rgba(160,190,255,0.35)' });
        const icon = giftIcon(info.id, cw - 12, dh - 12, app.profiles);
        ctx.drawImage(icon, x + Math.round((cw - icon.width) / 2), y + 9 + Math.round((dh - 12 - icon.height) / 2));
        drawText(ctx, String(d.getDate()), x + 4, y + 3, { color: '#8fa3d6' });
        const extra = season.giftsAt(k).filter((g) => isFor(giftInfo(g, app.profiles, p), p)).length - 1;
        if (extra > 0) drawText(ctx, `+${extra}`, x + cw - 4, y + dh - 10, { align: 'right', color: '#ffd76a' });
        caption = (info.tag || info.name).slice(0, Math.floor(cw / 6)); capCol = '#c9d8ff';
      } else {
        const fill = last ? '#a8791a' : i % 2 ? '#8e1e2c' : '#1c6a44';
        panel(ctx, x, y, cw, dh, { fill, border: next ? `rgba(255,${200 + Math.round(40 * pulse)},${90 + Math.round(60 * pulse)},1)` : showing ? '#fff6c8' : 'rgba(255,240,200,0.3)' });
        if (next) { ctx.fillStyle = `rgba(255,226,122,${0.12 + 0.2 * pulse})`; ctx.fillRect(x + 2, y + 2, cw - 4, dh - 4); }
        if (!ready && !due) { ctx.fillStyle = 'rgba(6,10,36,0.28)'; ctx.fillRect(x + 1, y + 1, cw - 2, dh - 2); }   // its day has not come: a little dimmer
        drawText(ctx, String(d.getDate()), x + cw / 2, y + Math.round(dh / 2) - 7, { scale: 2, align: 'center', color: '#fff6c8' });
        if (ready) { ctx.fillStyle = '#ffd76a'; ctx.fillRect(x + cw - 9, y + Math.floor(dh / 2) - 1, 3, 3); }          // unlocked: just its doorknob
        else padlock(ctx, x + cw - 11, y + Math.floor(dh / 2) - 4);
        if (next) { caption = 'OPEN ME!'; capCol = '#ffe27a'; }
        else if (ready) { caption = 'THEN ME'; capCol = '#ffe27a'; }
        else if (due && !guest) { caption = `${verb} 1 MIN`; capCol = '#fff6c8'; }
        else if (k === today + 1 && season.started()) caption = 'TOMORROW';
        else if (last) caption = 'CHRISTMAS';
      }
      if (caption) drawText(ctx, caption, x + cw / 2, y + dh + 2, { align: 'center', color: capCol });
      if (input.tapIn(x - rattle, y, cw, ch)) {
        const twice = this.sel === k;
        this.sel = k;
        if (isOpen) { this.replay = doorCard(season, k, app.profiles, p); app.sound.unlock(); }
        else if (next && !guest && season.openNext(p.id) === k) { this.replay = doorCard(season, k, app.profiles, p); app.sound.unlock(); app.songbookFor(p); }   // it is opened, for good
        else if (twice && tester) { this.replay = doorCard(season, k, app.profiles, p); this.replay.test = true; app.sound.unlock(); }                          // the tester may look behind any door
        else { this.nudge = { k, t: 0 }; app.sound.thump(); }
      }
    });

    // --- the right-hand side: a door opening, or you and today's goal ---
    const rx = gx + gw + 12, rw = W - 14 - rx;
    if (this.replay) {
      const c = this.replay, cx = rx + Math.round((rw - SIDE_W) / 2), cy = Math.min(top + 28, H - 48 - SIDE_H);
      drawDoorSide(ctx, c, app.profiles, this.t, cx, cy);
      if (c.test) drawText(ctx, 'DEV: NOT REALLY OPENED', cx + SIDE_W / 2, cy + SIDE_H + 2, { align: 'center', color: '#ffd76a' });
      if (c.t > 0.8 && input.tapIn(cx, cy, SIDE_W, SIDE_H)) { closeDoor(c); app.sound.tap(); }
    } else {
      const dog = p.look && p.look.species === 'dog';
      const f = figureSprite(p, 'front', dog ? 'stand' : m.kind, 40, Math.floor(this.t * 9) % 12, Math.floor(this.t * 4) % 4);
      const fgx = rx + Math.round(rw / 2), fgy = top + 150;
      ctx.fillStyle = 'rgba(236,244,255,0.9)';
      ctx.fillRect(fgx - 40, fgy, 80, 3);
      ctx.drawImage(f.canvas, fgx - f.footX, fgy - f.footY);
      drawText(ctx, `READY, ${p.name}?`, fgx, top + 36, { scale: 2, align: 'center' });
      // YOUR goal today is one mile, ridden or walked, less whatever you have done already.
      // Under it, the family's goal: everybody home.
      const left = guest ? 1 : season.mileLeft(p.id), goal = left < 0.02 ? 0 : left;
      drawText(ctx, 'YOUR GOAL TODAY', fgx, top + 162, { align: 'center', color: '#ffd76a' });
      if (goal) {
        const whole = left >= 0.98;
        drawText(ctx, whole ? '1 MILE' : `${trim(goal)} TO GO`, fgx, top + 173, { scale: 3, align: 'center', color: '#ffffff' });
        drawText(ctx, !whole ? `MILES. THE REST OF TODAY'S MILE` : m.kind === 'bike' ? 'ON THE BIKE' : 'ON THE TREADMILL', fgx, top + 199, { align: 'center', color: '#c9d8ff' });
        drawText(ctx, 'THEN KEEP GOING IF YOU LIKE', fgx, top + 210, { align: 'center', color: '#9fb6ee' });
      } else {
        drawText(ctx, 'DONE ★', fgx, top + 173, { scale: 3, align: 'center', color: '#9fe6b0' });
        drawText(ctx, "TODAY'S MILE IS IN.", fgx, top + 199, { align: 'center', color: '#c9d8ff' });
        drawText(ctx, 'THIS ONE IS FOR FUN', fgx, top + 210, { align: 'center', color: '#9fb6ee' });
      }
      const tog = season.together();
      drawText(ctx, `FAMILY GOAL: ${tog.miles.toFixed(1)} OF ${tog.goal} MI`, fgx, top + 226, { align: 'center', color: '#9fe6b0' });
      ctx.fillStyle = 'rgba(160,190,255,0.25)'; ctx.fillRect(fgx - 75, top + 236, 150, 2);
      ctx.fillStyle = '#9fe6b0'; ctx.fillRect(fgx - 75, top + 236, Math.round(150 * clamp(tog.miles / Math.max(1, tog.goal), 0, 1)), 2);
      // things that are earned, not opened: where you stand with each
      const earned = guest ? [] : earnedFor(season, p.id);
      earned.slice(0, 1).forEach((e) => {
        drawText(ctx, e.on ? `${e.name}: ON ★` : e.name, fgx, top + 246, { align: 'center', color: e.on ? '#ffd76a' : '#c9a27a' });
        if (!e.on) drawText(ctx, `${e.have} OF ${e.need} ${e.unit}`, fgx, top + 256, { align: 'center', color: '#c9a27a' });
      });
    }

    // --- the only buttons on this screen ---
    if (button(ctx, input, 14, H - 36, 84, 24, '◀ BACK', { kind: 'ghost' })) { this.step = 'who'; this.replay = null; app.sound.tap(); return; }
    // only the family's tester sees this one
    if (tester && button(ctx, input, 106, H - 36, 52, 24, 'DEV', { kind: 'gold' })) { app.sound.tap(); app.openWorkshop(p); return; }
    if (button(ctx, input, W - 14 - 190, H - 44, 190, 34, "LET'S GO! ▶", { kind: 'green', scale: 2 })) {
      app.sound.unlock();
      const left = guest ? 1 : season.mileLeft(p.id);
      app.go(new RideScreen(app, p, left < 0.02 ? 0 : left));
    }
  }
}
