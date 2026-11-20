// End-of-ride card. The world keeps drifting by underneath.
import { W, H } from './config.js';
import { fmtTime, MILE, FOOT } from './util.js';
import { drawText } from './font.js';
import { panel, button } from './ui.js';
import { drawPortrait } from './portraits.js';
import { RIDES } from './text.js';

export class SummaryScreen {
  constructor(app, ride) {
    this.app = app;
    this.ride = ride;
    this.t = 0;
  }
  enter() { this.app.sound.fanfare(); }

  update(dt) {
    const r = this.ride;
    this.t += dt;
    r.t += dt;
    r.world.spirit = 1;
    r.world.update(dt, 1.6, 0, 1, r.t);
    r.rider.update(dt, 0.45, 1.6, r.world.lean || 0);
    r.snow.update(dt, 1.6, r.world.lean || 0);
  }

  back() { this.app.goPeople(); }

  draw(ctx) {
    const app = this.app, r = this.ride, s = r.session, p = r.profile;
    r.world.render(ctx, r.env, r.t, (c, x, y, ppm) => r.rider.draw(c, x, y, ppm, r.env));
    r.snow.draw(ctx, r.env);
    ctx.fillStyle = 'rgba(4,8,30,0.5)';
    ctx.fillRect(0, 0, W, H);

    const pw = 424, ph = 274, px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    panel(ctx, px, py, pw, ph, { fill: 'rgba(8,14,46,0.92)' });
    drawPortrait(ctx, p, px + 20, py + 28, 72);
    drawText(ctx, s.active < 20 ? `SEE YOU SOON, ${p.name}!` : `NICE WORK, ${p.name}!`, px + 108, py + 18, { scale: 2 });
    drawText(ctx, RIDES[r.kind].name, px + 108, py + 40, { color: '#9fb6ee' });
    drawText(ctx, `★ ${s.cheer}`, px + 108, py + 58, { scale: 4, color: '#ffe27a' });
    drawText(ctx, 'CHRISTMAS CHEER', px + 110, py + 92, { color: '#ffd76a' });

    const miles = s.meters / MILE;
    const pace = miles > 0.01 ? fmtTime(s.active / miles) : '--';
    const cells = r.kind === 'bike'
      ? [['TIME', fmtTime(s.active)], ['MILES', miles.toFixed(2)], ['CALORIES', Math.round(s.kcal)], ['AVG OUTPUT W', Math.round(s.avgPower)], ['AVG CADENCE', Math.round(s.avgCadence)], ['TREES LIT', s.trees]]
      : [['TIME', fmtTime(s.active)], ['MILES', miles.toFixed(2)], ['CALORIES', Math.round(s.kcal)], ['CLIMB FT', Math.round(s.climb / FOOT)], ['AVG PACE /MI', pace], ['TREES LIT', s.trees]];
    cells.forEach(([label, value], i) => {
      const x = px + 20 + (i % 3) * 130, y = py + 116 + Math.floor(i / 3) * 42;
      panel(ctx, x, y, 124, 36, { fill: 'rgba(22,32,84,0.8)', border: 'rgba(160,190,255,0.25)' });
      drawText(ctx, label, x + 62, y + 5, { align: 'center', color: '#9fb6ee' });
      drawText(ctx, value, x + 62, y + 17, { scale: 2, align: 'center' });
    });

    if (r.saved) {
      // where the tent went up, the doors, and today's mile
      const season = app.season, pos = season.position(p.id), n = season.totalStages();
      const left = Math.max(0, n - pos), mile = season.mileLeft(p.id);
      const camp = !season.started() ? `WARM-UP RIDE - THE TRAIL OPENS IN ${season.daysUntilStart()} DAYS` : left > 0 ? `CAMP PITCHED: ${left.toFixed(1)} MILES FROM THE HOMESTEAD` : 'YOU MADE IT HOME FOR CHRISTMAS!';
      drawText(ctx, camp, px + 20, py + 200, { color: '#9fe6b0' });
      const waiting = season.waiting(p.id), ready = season.ready(p.id);
      const doors = !season.started() || !season.gating() ? ''
        : ready ? `${ready} ${ready === 1 ? 'DOOR IS' : 'DOORS ARE'} UNLOCKED: OPEN ${ready === 1 ? 'IT' : 'THEM'} ON YOUR CALENDAR   `
          : waiting ? `DOORS OPEN: ${season.doorsOpen(p.id)} (A MINUTE'S RIDING UNLOCKS THE NEXT)   ` : `DOORS OPEN: ${season.doorsOpen(p.id)} OF ${season.doorCount()} ★   `;
      const today = mile < 0.02 ? "TODAY'S MILE: DONE ★" : `TODAY'S MILE: ${(Math.round(mile * 10) / 10)} TO GO`;
      drawText(ctx, doors + today, px + 20, py + 211, { color: mile < 0.02 && !waiting ? '#ffd76a' : '#c9d8ff' });
    } else if (!p.guest) drawText(ctx, 'TOO SHORT TO SAVE - YOUR TENT STAYS PUT', px + 20, py + 205, { color: '#9fb6ee' });
    // the dogs who came along: their own miles, and their stops
    if (r.dogRuns && r.dogRuns.length) {
      const bits = r.dogRuns.map((d) => `${d.name} RAN ${(d.m / MILE).toFixed(1)} MI${d.poops ? ` (${d.poops} ${d.poops === 1 ? 'POOP' : 'POOPS'})` : ''}`);
      drawText(ctx, bits.join('   '), px + 20, py + 222, { color: '#c9a27a' });
    }
    if (button(ctx, app.input, px + pw - 232, py + ph - 38, 96, 24, 'SEE THE MAP', { kind: 'blue' })) { app.sound.tap(); app.openMap('people'); return; }
    if (button(ctx, app.input, px + pw - 126, py + ph - 40, 110, 28, 'DONE', { kind: 'green', scale: 2 })) { app.sound.tap(); app.goPeople(); }
  }
}
