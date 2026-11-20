// The family's advent calendar: one door per day from the start of the season to
// Christmas. This screen is everybody's doors at once. A door somebody has opened shows
// what was behind it and who has opened it; tap it and it opens all over again in the
// panel on the right (door.js). A door nobody has opened yet wears a padlock and stays
// shut here too, so looking at this screen never spoils your own surprise.
// (Your own calendar, where your doors are really opened, is the screen before LET'S GO:
// home.js.)
import { W, H } from './config.js';
import { dayKey } from './util.js';
import { drawText } from './font.js';
import { panel } from './ui.js';
import { header } from './chrome.js';
import { portrait } from './portraits.js';
import { giftIcon } from './gifts.js';
import { doorCard, stepDoor, drawDoorSide, closeDoor, SIDE_W, SIDE_H } from './door.js';
import { padlock } from './home.js';

export class AdventScreen {
  /** who: the person whose own calendar we came from (Back returns there). */
  constructor(app, who) {
    this.app = app; this.who = who || null; this.t = 0;
    this.sel = 0;          // the door last tapped
    this.card = null;      // a door opening again in the panel
    this.nudge = null;     // a locked door that was tapped: it rattles { n, t }
  }
  update(dt) {
    this.t += dt;
    this.app.backdrop.update(dt);
    if (this.card && !stepDoor(this.card, dt, this.app.sound)) this.card = null;
    if (this.nudge && (this.nudge.t += dt) > 0.5) this.nudge = null;
  }

  back() { this.app.goPeople(this.who); }

  draw(ctx) {
    const app = this.app, input = app.input, season = app.season;
    app.backdrop.draw(ctx, 0.62);
    if (header(ctx, input, 'THE FAMILY CALENDAR', 'BACK')) { app.sound.tap(); this.back(); return; }

    const days = season.days(), todayDoor = season.doorToday(), family = season.people();
    const cols = days.length <= 25 ? 5 : days.length <= 30 ? 6 : 7;
    const rows = Math.ceil(days.length / cols);
    const gx = 12, gy = 40, gw = 388, gh = H - 52;
    const cw = Math.floor((gw - (cols - 1) * 4) / cols), ch = Math.floor((gh - (rows - 1) * 4) / rows);
    days.forEach((d, i) => {
      const n = i + 1, y = gy + Math.floor(i / cols) * (ch + 4);
      const rattle = this.nudge && this.nudge.n === n ? Math.round(Math.sin(this.nudge.t * 50) * 2 * (1 - this.nudge.t / 0.5)) : 0;
      const x = gx + (i % cols) * (cw + 4) + rattle;
      const isToday = n === todayDoor && season.started(), come = n <= todayDoor, last = i === days.length - 1;
      const did = come ? season.whoDid(dayKey(d)) : [];
      const hot = input.over(x, y, cw, ch), chosen = this.card && this.card.door === n;
      if (!did.length) {
        // a locked door: its day has not come, or nobody has opened it yet
        panel(ctx, x, y, cw, ch, { fill: last ? 'rgba(150,110,20,0.92)' : i % 2 ? 'rgba(130,28,40,0.92)' : 'rgba(26,96,60,0.92)', border: isToday ? '#ffd76a' : hot ? '#fff6c8' : 'rgba(255,240,200,0.35)' });
        drawText(ctx, String(d.getDate()), x + cw / 2, y + ch / 2 - 7, { scale: 2, align: 'center', color: '#fff6c8' });
        padlock(ctx, x + cw - 11, y + Math.floor(ch / 2) - 4);
        if (isToday) drawText(ctx, 'TODAY', x + cw / 2, y + ch - 11, { align: 'center', color: '#ffe27a' });
      } else {
        panel(ctx, x, y, cw, ch, { fill: 'rgba(20,34,90,0.94)', border: chosen || hot ? '#fff6c8' : isToday ? '#ffd76a' : 'rgba(160,190,255,0.3)' });
        drawText(ctx, String(d.getDate()), x + 5, y + 4, { color: isToday ? '#ffd76a' : '#c9d8ff' });
        const icon = giftIcon(season.giftAt(n), 28, Math.max(10, ch - 24), app.profiles);
        ctx.drawImage(icon, x + cw - icon.width - 4, y + 3);
        did.slice(0, 10).forEach((p, k) => {
          ctx.fillStyle = `rgb(${p.jacket[0]},${p.jacket[1]},${p.jacket[2]})`;
          ctx.fillRect(x + 5 + (k % 5) * 9, y + ch - 20 + Math.floor(k / 5) * 9, 7, 7);
        });
      }
      if (input.tapIn(x - rattle, y, cw, ch)) {
        this.sel = n;
        if (did.length) { this.card = doorCard(season, n, app.profiles, null); app.sound.unlock(); }
        else { this.card = null; this.nudge = { n, t: 0 }; app.sound.thump(); }
      }
    });

    // the panel on the right: the door you tapped, opening
    const sx = gx + gw + 10, sw = W - sx - 12, mid = sx + sw / 2;
    panel(ctx, sx, gy, sw, gh, { fill: 'rgba(8,14,46,0.9)' });
    if (this.card) {
      const c = this.card, cx = sx + Math.round((sw - SIDE_W) / 2), cy = gy + 4;
      drawDoorSide(ctx, c, app.profiles, this.t, cx, cy);
      if (c.t > 0.8 && input.tapIn(cx, cy, SIDE_W, SIDE_H)) { closeDoor(c); app.sound.tap(); }
      // who has opened it: everybody's face, bright if they have
      const size = 16, gap = 4, total = family.length * (size + gap) - gap, py = gy + SIDE_H + 12;
      if (py + size < gy + gh) {
        family.forEach((p, i) => {
          ctx.globalAlpha = season.doorsOpen(p.id) >= c.door ? 1 : 0.25;
          ctx.drawImage(portrait(p, size), Math.round(mid - total / 2) + i * (size + gap), py);
        });
        ctx.globalAlpha = 1;
      }
      return;
    }
    if (!season.started()) {
      drawText(ctx, 'THE FIRST DOOR', mid, gy + 24, { align: 'center', color: '#c9d8ff' });
      drawText(ctx, 'UNLOCKS IN', mid, gy + 36, { align: 'center', color: '#c9d8ff' });
      drawText(ctx, String(season.daysUntilStart()), mid, gy + 54, { scale: 5, align: 'center', color: '#ffd76a' });
      drawText(ctx, season.daysUntilStart() === 1 ? 'DAY' : 'DAYS', mid, gy + 96, { scale: 2, align: 'center', color: '#ffd76a' });
      return;
    }
    const locked = this.sel && !season.whoDid(dayKey(season.dayOfDoor(this.sel))).length;
    if (locked) {
      padlock(ctx, Math.round(mid) - 4, gy + 60);
      drawText(ctx, 'LOCKED', mid, gy + 78, { scale: 2, align: 'center' });
      (this.sel > todayDoor ? ['ITS DAY HAS NOT COME'] : ['NOBODY HAS OPENED IT YET']).forEach((line, k) => drawText(ctx, line, mid, gy + 100 + k * 11, { align: 'center', color: '#9fb6ee' }));
    } else {
      ['TAP A DOOR', 'TO SEE IT OPEN'].forEach((line, k) => drawText(ctx, line, mid, gy + 70 + k * 18, { scale: 2, align: 'center', color: k ? '#ffd76a' : '#ffffff' }));
      drawText(ctx, 'THE SQUARES SHOW WHO HAS OPENED IT', mid, gy + 116, { align: 'center', color: '#9fb6ee' });
    }
    void W;
  }
}
