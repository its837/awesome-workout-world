// The family trail map: one winding path from the trailhead home to the family
// homestead (everyone is trying to get there for Christmas), with the tent of everybody
// who is here pitched wherever their last ride or walk ended.
import { W, H } from './config.js';
import { clamp, hash, smooth, MONTHS } from './util.js';
import { drawText } from './font.js';
import { panel } from './ui.js';
import { header } from './chrome.js';
import { portrait } from './portraits.js';
import { uiSprite } from './sprites.js';
import { ZONES, zoneTypeAt } from './world.js';

const ROWS = 4;

/** Where a point t (0..1) along the trail sits on the map: four switchbacks climbing the screen. */
export function pathAt(t, box) {
  const u = clamp(t, 0, 1) * ROWS, r = Math.min(ROWS - 1, Math.floor(u)), f = u - r;
  const rowH = box.h / ROWS;
  const x = r % 2 === 0 ? box.x + box.w * f : box.x + box.w * (1 - f);
  const y = box.y + box.h - r * rowH - rowH * smooth(clamp((f - 0.82) / 0.18, 0, 1)) + Math.sin(f * 9 + r) * 3;
  return [x, y];
}

/** The map and the roster, without a backdrop or title: used full-screen and over a paused ride. */
export function drawTrailMap(ctx, app) {
  const season = app.season;
  const n = season.totalStages(), stand = season.standings();
  const mx = 12, my = 40, mw = 424, mh = H - 62;
  panel(ctx, mx, my, mw, mh, { fill: 'rgba(14,26,72,0.9)' });
  const box = { x: mx + 34, y: my + 34, w: mw - 68, h: mh - 62 };

  // scattered trees so it reads as a map
  for (let i = 0; i < 70; i++) {
    const tx = mx + 8 + hash(i * 7 + 1) * (mw - 16), ty = my + 10 + hash(i * 13 + 5) * (mh - 22);
    ctx.fillStyle = i % 3 ? '#1f4a52' : '#2a5e5a';
    ctx.fillRect(tx - 2, ty, 5, 2); ctx.fillRect(tx - 1, ty - 2, 3, 2); ctx.fillRect(tx, ty - 4, 1, 2);
  }
  // the trail itself, coloured by the place it passes through (14 places to every mile)
  const dots = 900;
  for (let i = 0; i <= dots; i++) {
    const [x, y] = pathAt(i / dots, box);
    ctx.fillStyle = 'rgba(8,14,46,0.55)';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 4, 4);
  }
  for (let i = 0; i <= dots; i++) {
    const [x, y] = pathAt(i / dots, box);
    ctx.fillStyle = ZONES[zoneTypeAt((i / dots) * n)].color;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
  // a mark every mile, one for each day: red days are gone, gold is where a mile a day puts
  // you today, blue are still to come
  const todayI = season.doorToday();
  for (let i = 0; i <= n; i++) {
    const [x, y] = pathAt(i / n, box);
    ctx.fillStyle = i === 0 ? '#c9d8ff' : i === todayI ? '#ffd76a' : i < todayI ? '#e8454c' : '#6f86c6';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 4, 4);
    const nearToday = Math.abs(i - todayI) < 3;
    if (i > 0 && i < n && (i === todayI || (i % 5 === 0 && !nearToday))) drawText(ctx, i === todayI ? `TODAY: MILE ${i}` : `MILE ${i}`, x + 1, y + 6, { align: 'center', color: i === todayI ? '#ffd76a' : '#9fb6ee' });
  }
  const [sx, sy] = pathAt(0, box), [ex, ey] = pathAt(1, box);
  const first = season.start();
  const tg = season.thanksgiving(), onDay = first.getMonth() === tg.getMonth() && first.getDate() === tg.getDate();
  drawText(ctx, onDay ? 'THANKSGIVING' : `${MONTHS[first.getMonth()]} ${first.getDate()}`, sx - 4, sy + 8, { color: '#c9d8ff' });
  // journey's end: the family homestead, lit up for Christmas
  const home = uiSprite('cabin', 0, 7);
  ctx.drawImage(home, Math.round(ex - home.width / 2 + 6), Math.round(ey - home.height + 3));
  drawText(ctx, 'HOME FOR CHRISTMAS', Math.max(box.x + 4, ex - 54), ey + 6, { color: '#ffd76a' });

  // tents, furthest back first; ones that share a spot fan out upward
  const placed = [];
  stand.slice().reverse().forEach((s) => {
    const [x, y] = pathAt(s.pos / n, box);
    let k = 0;
    for (const q of placed) if (Math.abs(q.x - x) < 20 && Math.abs(q.y0 - y) < 8) k++;
    placed.push({ x, y0: y });
    const idx = app.profiles.indexOf(s.profile);
    const tent = uiSprite('tent', idx, 7);
    const px = Math.round(x + k * 13 - 10), py = Math.round(y - tent.height - 1 - (k % 2) * 13);
    ctx.drawImage(tent, px, py);
    ctx.drawImage(portrait(s.profile, 16), px + 2, py - 13);
  });

  // roster
  const rx = mx + mw + 8, rw = W - rx - 12;
  panel(ctx, rx, my, rw, mh, { fill: 'rgba(8,14,46,0.9)' });
  drawText(ctx, 'MILES', rx + rw - 42, my + 8, { align: 'right', color: '#9fb6ee' });
  drawText(ctx, 'DOORS', rx + rw - 8, my + 8, { align: 'right', color: '#9fb6ee' });
  const rowH = Math.min(24, Math.floor((mh - 84) / Math.max(1, stand.length)));
  stand.forEach((s, i) => {
    const y = my + 22 + i * rowH;
    ctx.drawImage(portrait(s.profile, 16), rx + 6, y - 2);
    drawText(ctx, s.profile.name, rx + 26, y + 2, { color: s.today ? '#ffd76a' : '#ffffff' });
    if (s.today) drawText(ctx, '★', rx + 28 + s.profile.name.length * 6, y + 2, { color: '#ffd76a' });
    if (s.dog) {
      // a dog has no doors: its own miles (run beside people), and how often it has had to stop
      drawText(ctx, s.pos.toFixed(1), rx + rw - 62, y + 2, { align: 'right' });
      drawText(ctx, `${s.poops} ${s.poops === 1 ? 'POOP' : 'POOPS'}`, rx + rw - 8, y + 2, { align: 'right', color: '#c9a27a' });
    } else {
      drawText(ctx, s.pos.toFixed(1), rx + rw - 42, y + 2, { align: 'right' });
      drawText(ctx, String(s.doors), rx + rw - 8, y + 2, { align: 'right', color: '#9fe6b0' });
    }
  });
  const d = season.now();
  const foot = season.started() ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : `THE TRAIL OPENS IN ${season.daysUntilStart()} DAYS`;
  // the family's miles, all added together
  const tog = season.together();
  drawText(ctx, `TOGETHER: ${tog.miles.toFixed(1)} MILES`, rx + rw / 2, my + mh - 58, { align: 'center', color: '#9fe6b0' });
  drawText(ctx, `OUR GOAL: ${tog.goal} MILES`, rx + rw / 2, my + mh - 46, { align: 'center', color: '#9fb6ee' });
  ctx.fillStyle = 'rgba(160,190,255,0.25)';
  ctx.fillRect(rx + 10, my + mh - 36, rw - 20, 3);
  ctx.fillStyle = '#9fe6b0';
  ctx.fillRect(rx + 10, my + mh - 36, Math.round((rw - 20) * clamp(tog.miles / Math.max(1, tog.goal), 0, 1)), 3);
  drawText(ctx, foot, rx + rw / 2, my + mh - 26, { align: 'center', color: '#ffd76a' });
  drawText(ctx, "★ = TODAY'S DOOR IS OPEN", rx + rw / 2, my + mh - 14, { align: 'center', color: '#9fb6ee' });
  drawText(ctx, 'A MILE FOR EVERY DAY, WALKED OR RIDDEN', mx + mw - 8, my + 7, { align: 'right', color: '#9fb6ee' });
  // what the colours along the trail are
  let kx = mx + 2;
  ZONES.forEach((z) => {
    ctx.fillStyle = z.color;
    ctx.fillRect(kx, H - 15, 5, 5);
    kx += 8 + drawText(ctx, z.short, kx + 7, H - 16, { color: '#c9d8ff' }) + 8;
  });
}

export class MapScreen {
  constructor(app) { this.app = app; this.t = 0; }
  update(dt) { this.t += dt; this.app.backdrop.update(dt); }
  back() { this.app.goPeople(); }

  draw(ctx) {
    const app = this.app;
    app.backdrop.draw(ctx, 0.62);
    if (header(ctx, app.input, 'THE FAMILY TRAIL', 'BACK')) { app.sound.tap(); this.back(); return; }
    drawTrailMap(ctx, app);
  }
}
