// THE MOMENT AN ADVENT DOOR OPENS.
//
// One show, used everywhere a door opens: mid-ride when your minute is up (ride.js), again
// on your own calendar when you tap a door you have already opened (home.js), from the
// TEST drawer.
//
//   0.0   the card drops in: a big door with the date in its wreath
//   0.45  knock, knock, knock (the door shakes)
//   1.25  it swings open and light pours out
//   1.95  the thing pops out, with a burst of confetti
//   2.2   its name, what it does, and (in a speech bubble) what it has to say for itself
//   2.65  if it is the penguin, and its milk is behind the door too: it fills a glass (milk.js)
//   8.0   the card goes by itself, or sooner if it is tapped. Nobody on a treadmill has to
//         reach for the screen.
//
// What a thing says is its `quip` in the catalog (gifts.js, rewards.js, or a dog's own
// `quip` in profiles.js). On Thanksgiving the card says HAPPY THANKSGIVING.
import { W, H } from './config.js';
import { clamp, MONTHS, TAU, daysBetween, makeCanvas } from './util.js';
import { drawText, textWidth, wrapText } from './font.js';
import { panel } from './ui.js';
import { giftInfo, giftIcon, KINDS } from './gifts.js';
import { relativeSprite } from './relative.js';
import { FAMILY } from '../family.js';
import { santaSprite, santaFrame } from './santa.js';
import { edwardSprite } from './edward.js';
import { MILK, MILK_SHIFT, milkShift, drawMilking } from './milk.js';
import { figureSprite } from './figure.js';
import { glowCanvas } from './sprites.js';

const PW = 344, PH = 218, DW = 84, DH = 116;
const KNOCKS = [0.45, 0.7, 0.95], OPEN_AT = 1.25, OUT_AT = 1.95;
const easeOut = (u) => 1 - (1 - u) * (1 - u);
/** Overshoots a little, then settles: how something pops out. */
const pop = (u) => { const c = 2.2; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const hue = (h, light = 64) => `hsl(${Math.round(((h % 360) + 360) % 360)},100%,${light}%)`;

/** Where the card sits (so a tap on it can be told from a tap elsewhere). */
export function doorBox() {
  return { x: Math.round((W - PW) / 2), y: Math.max(44, Math.round((H - PH) / 2) - 6), w: PW, h: PH };
}

/**
 * The card for door n. season: camp.js. profile: whose door it is (may be null).
 * ids: what is behind it, if not what the saved calendar says .
 */
/** A greeting of your own for a day of the year (`days` in family.js: 'MM-DD': 'HAPPY BIRTHDAY, SOMEBODY!'). */
const yourDay = (m, d) => String((FAMILY.days || {})[`${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`] || '').toUpperCase();

export function doorCard(season, n, profiles, profile, ids) {
  const day = season.dayOfDoor(n), m = day.getMonth(), d = day.getDate();
  const all = (ids || season.giftsAt(n)).map((id) => giftInfo(id, profiles, profile));
  const special = daysBetween(season.thanksgiving(), day) === 0 ? 'HAPPY THANKSGIVING!' : m === 11 && d === 25 ? 'MERRY CHRISTMAS!' : yourDay(m, d);
  const milk = all[0].id === 'penguin' && all.some((i) => i.id === 'penguinmilk');     // the penguin fills a glass (milk.js)
  return { door: n, day, today: n === season.doorToday(), last: n >= season.doorCount(), info: all[0], more: all.slice(1), special, milk, t: 0, secs: 8 + (all.length - 1) * 1.5 };
}

/** Move the show on by dt seconds, playing its sounds as it gets to them. False once it is over. */
export function stepDoor(c, dt, sound) {
  const t0 = c.t;
  c.t += dt;
  const hit = (at) => t0 < at && c.t >= at;
  if (sound) {
    if (KNOCKS.some(hit)) sound.thump();
    if (hit(OPEN_AT)) sound.fanfare();
    if (hit(OUT_AT + 0.1)) sound.sparkle();
    if (hit(3.0) && c.info.speak) sound.speak(c.info.speak);
    if (c.milk) {
      if (MILK.squirts.some((s) => hit(OUT_AT + s)) && sound.squirt) sound.squirt();
      if (hit(OUT_AT + MILK.done)) sound.chime();
    }
  }
  return c.t < c.secs;
}
/** Has the thing come out yet? (That is when the ride hands it over.) */
export const doorIsOut = (c) => c.t >= OUT_AT;
/** Seconds since it came out. (A thing with a `wait` in the catalog is handed over that much later.) */
export const doorAge = (c) => c.t - OUT_AT;
/** The other things behind this door that have turned up so far (the penguin's milk is not there until the glass is full). */
const alsoOut = (c) => (c.more || []).filter((i) => doorAge(c) >= (i.wait || 0));
/** Tapped: wind it up. */
export function closeDoor(c) { c.t = Math.max(c.t, c.secs - 0.35); }

/** The door itself, drawn once per card: panels, a wreath with the date in it, a brass knob. */
function leaf(c) {
  if (c.leaf) return c.leaf;
  const can = makeCanvas(DW, DH), g = can.getContext('2d');
  g.imageSmoothingEnabled = false;
  const [base, dark, lite] = c.last ? ['#a8791a', '#7c570f', '#cfa238'] : c.door % 2 ? ['#a02634', '#74161f', '#c2414d'] : ['#1c6a44', '#104a2e', '#2f9a66'];
  g.fillStyle = base; g.fillRect(0, 0, DW, DH);
  g.fillStyle = lite; g.fillRect(0, 0, DW, 2); g.fillRect(0, 0, 2, DH);
  g.fillStyle = dark; g.fillRect(0, DH - 2, DW, 2); g.fillRect(DW - 2, 0, 2, DH);
  for (const [y, h] of [[8, 58], [74, 34]]) { g.fillStyle = dark; g.fillRect(8, y, DW - 16, h); g.fillStyle = base; g.fillRect(10, y + 2, DW - 20, h - 4); }
  const wx = DW / 2, wy = 37;
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    g.fillStyle = k % 2 ? '#58c878' : '#2f9a4e';
    g.fillRect(Math.round(wx + Math.cos(a) * 19) - 3, Math.round(wy + Math.sin(a) * 19) - 3, 6, 6);
  }
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.5; g.fillStyle = '#ff4a4a'; g.fillRect(Math.round(wx + Math.cos(a) * 19) - 1, Math.round(wy + Math.sin(a) * 19) - 1, 3, 3); }
  g.fillStyle = '#e8454c'; g.fillRect(wx - 6, wy + 17, 5, 5); g.fillRect(wx + 1, wy + 17, 5, 5); g.fillStyle = '#ffd76a'; g.fillRect(wx - 1, wy + 18, 2, 3);
  drawText(g, String(c.day.getDate()), wx, wy - 7, { scale: 2, align: 'center', color: '#fff6c8' });
  drawText(g, MONTHS[c.day.getMonth()], wx, 87, { align: 'center', color: '#fff6c8' });
  g.fillStyle = '#ffd76a'; g.fillRect(DW - 13, 64, 4, 4);
  g.fillStyle = '#9a6f1c'; g.fillRect(DW - 13, 67, 4, 1);
  return (c.leaf = can);
}

/** What comes out of the door: [{ canvas, w, h }] standing side by side (people arriving are several). */
function comesOut(c, profiles, time) {
  const info = c.info, wq = Math.floor(time * 5) % 4;
  const fig = (p, ppm) => { const f = figureSprite(p, 'front', 'stand', ppm, 0, wq); return { canvas: f.canvas, w: f.canvas.width, h: f.footY }; };
  if (info.set === 'dog' && info.dog) return [fig(info.dog, 44)];
  if (info.set === 'join' && info.people) return info.people.slice(0, 4).map((p) => fig(p, 30));
  if (info.id === 'relative') { const k = relativeSprite(36, 'wave', 0, wq); return [{ canvas: k.canvas, w: k.canvas.width, h: k.canvas.height }]; }
  if (info.id === 'sexysanta') { const k = santaSprite(40, santaFrame(time)); return [{ canvas: k.canvas, w: k.canvas.width, h: k.foot }]; }   // he dances
  if (info.id === 'edward') {                                                 // he flexes, howls, shows his claws, on the spot
    const k = edwardSprite(36, ['flex', 'flex', 'howl', 'claws'][Math.floor(time / 1.3) % 4], Math.floor(time * 7) % 4, Math.floor(time * 6.5) % 4);
    return [{ canvas: k.canvas, w: k.canvas.width, h: k.foot }];
  }
  const icon = giftIcon(info.id, 84, 66, profiles);
  return [{ canvas: icon, w: icon.width, h: icon.height }];
}

/**
 * The doorway itself, wherever it stands: the light, the door swinging back, the thing
 * popping out, the knocks and the confetti. (dx, dy): the doorway's top-left. clip: the
 * card it must stay inside [x, y, w, h]. Returns how long the thing has been out (seconds).
 */
function doorway(ctx, c, profiles, time, dx, dy, clip, fade, shake) {
  const t = c.t, info = c.info, cx = dx + DW / 2;
  const o = clamp((t - OPEN_AT) / 0.7, 0, 1), open = o * o * (3 - 2 * o);
  const [kx, ky, kw, kh] = clip;
  // light pouring out, in turning rays
  if (open > 0.05) {
    ctx.save();
    ctx.beginPath(); ctx.rect(kx + 2, ky + 8, kw - 4, kh - 10); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * open * 0.1;
    ctx.fillStyle = '#ffd76a';
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + time * 0.45, r = 190;
      ctx.beginPath(); ctx.moveTo(cx, dy + DH * 0.5);
      ctx.lineTo(cx + Math.cos(a - 0.08) * r, dy + DH * 0.5 + Math.sin(a - 0.08) * r);
      ctx.lineTo(cx + Math.cos(a + 0.08) * r, dy + DH * 0.5 + Math.sin(a + 0.08) * r);
      ctx.fill();
    }
    ctx.restore();
  }
  // the doorway
  ctx.fillStyle = '#ffd76a'; ctx.fillRect(dx - 3, dy - 3, DW + 6, DH + 6);
  ctx.fillStyle = '#b8862a'; ctx.fillRect(dx - 3, dy + DH + 1, DW + 6, 2);
  ctx.fillStyle = '#0c1640'; ctx.fillRect(dx, dy, DW, DH);
  if (open > 0) {
    ctx.fillStyle = '#c9d8ff';
    for (let k = 0; k < 9; k++) ctx.fillRect(dx + 6 + ((k * 37) % (DW - 12)), dy + 6 + ((k * 53) % 60), 1, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * open * 0.85;
    ctx.drawImage(glowCanvas([255, 214, 130]), dx - 14, dy + 8, DW + 28, DH + 4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#e9f0ff'; ctx.fillRect(dx, dy + DH - 6, DW, 6);         // snow on the step
  }
  // the thing, popping out
  const age = t - OUT_AT;
  if (age >= 0) {
    const r = clamp(age / 0.55, 0, 1), s = r < 1 ? Math.max(0.05, pop(r)) : 1;
    const bob = r < 1 ? 0 : Math.round(Math.sin(time * 4) * 2);
    const out = comesOut(c, profiles, time), gap = 4;
    const total = out.reduce((n, a) => n + a.w, 0) + gap * (out.length - 1);
    let x = cx - (total * s) / 2 - (c.milk ? Math.round(milkShift(age) * MILK_SHIFT) : 0);
    const base = dy + DH - 8 - bob;
    let first = null;
    if (info.id === 'relative') {                                               // they glow
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * 0.5;
      ctx.drawImage(glowCanvas([150, 200, 255]), cx - 50, base - 90, 100, 110);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
    }
    for (const a of out) {
      const w = Math.round(a.w * s), h = Math.round(a.canvas.height * s);
      ctx.drawImage(a.canvas, Math.round(x), Math.round(base - a.h * s), w, h);
      if (!first) first = [Math.round(x), Math.round(base - a.h * s), w, h];
      x += (a.w + gap) * s;
    }
    if (c.milk && first && r >= 1) drawMilking(ctx, first, cx + 26, dy + DH - 8, age);
  }
  // the door, swinging back on its hinges
  const lw = Math.round(DW * (1 - 0.9 * open));
  if (lw > 0) {
    ctx.drawImage(leaf(c), dx, dy, lw, DH);
    if (open > 0) { ctx.fillStyle = `rgba(0,0,12,${(0.5 * open).toFixed(2)})`; ctx.fillRect(dx, dy, lw, DH); }
  }
  KNOCKS.forEach((k, i) => {
    const a = t - k;
    if (a >= 0 && a < 0.45) { ctx.globalAlpha = fade * clamp(1 - a / 0.45, 0, 1); drawText(ctx, 'KNOCK', dx + DW + 8 + i * 4, dy + 16 + i * 14 - Math.round(a * 14), { color: '#fff6c8' }); ctx.globalAlpha = fade; }
  });
  // confetti
  if (age >= 0 && age < 1.5) {
    ctx.globalAlpha = fade * clamp(1.5 - age, 0, 1);
    for (let i = 0; i < 44; i++) {
      const a = i * 2.399, v = 55 + ((i * 37) % 70);
      const x = cx + Math.cos(a) * v * age, y = dy + DH * 0.45 + Math.sin(a) * v * age * 0.8 + 70 * age * age;
      if (x < kx + 4 || x > kx + kw - 6 || y < ky + 8 || y > ky + kh - 6) continue;
      ctx.fillStyle = hue(i * 29 + time * 200);
      ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 2 : 3, 2);
    }
    ctx.globalAlpha = fade;
  }
  return age;
}
const shakeOf = (t) => { let s = 0; for (const k of KNOCKS) { const a = t - k; if (a >= 0 && a < 0.16) s += Math.sin(a * 60) * 3 * (1 - a / 0.16); } return s; };
const headOf = (c) => c.special || (c.last ? 'THE LAST DOOR' : c.today ? "TODAY'S DOOR" : `${MONTHS[c.day.getMonth()]} ${c.day.getDate()}'S DOOR`);
/** A speech bubble with the text typed out a letter at a time; its tail points up at the speaker when up is set. */
function bubble(ctx, text, x, y, maxW, chars, up) {
  const lines = wrapText(text, maxW - 12), bw = Math.min(maxW, Math.max(...lines.map((l) => textWidth(l))) + 12), bh = lines.length * 10 + 8;
  ctx.fillStyle = 'rgba(250,246,236,0.97)';
  ctx.fillRect(x, y, bw, bh); ctx.fillRect(x + 1, y - 1, bw - 2, bh + 2);
  if (up) for (let i = 0; i < 5; i++) ctx.fillRect(x + Math.round(bw / 2) - 2 + i, y - 2 - i, 5 - i, 1);
  else for (let i = 0; i < 5; i++) ctx.fillRect(x - 1 - i, y + bh - 9 + i, 1, 5 - i);
  let left = chars;
  lines.forEach((line, i) => { if (left > 0) drawText(ctx, line.slice(0, left), x + 6, y + 5 + i * 10, { color: '#1c2a5e', shadow: null }); left -= line.length + 1; });
  return bw;
}

/**
 * THE BIG CARD: the show in the middle of the screen, everything else dimmed. time: any running clock, for the little movements.
 */
export function drawDoor(ctx, c, profiles, time) {
  const t = c.t, b = doorBox(), info = c.info;
  const inn = easeOut(clamp(t / 0.35, 0, 1)), fade = clamp((c.secs - t) / 0.35, 0, 1);
  const px = b.x, py = Math.round(b.y - (1 - inn) * (b.y + PH));
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = `rgba(4,8,30,${(0.45 * inn).toFixed(2)})`;
  ctx.fillRect(0, 0, W, H);
  panel(ctx, px, py, PW, PH, { fill: 'rgba(26,14,34,0.97)', border: '#ffd76a' });
  for (let x = px + 3, k = 0; x < px + PW - 3; x += 8, k++) { ctx.fillStyle = k & 1 ? '#c8343c' : '#f4f6ff'; ctx.fillRect(x, py + 3, Math.min(8, px + PW - 3 - x), 3); }
  drawText(ctx, headOf(c), W / 2, py + 12, { scale: 2, align: 'center', color: '#ffe27a' });
  const shake = shakeOf(t), dx = Math.round(W / 2 - DW / 2 + shake), dy = py + 34;
  const age = doorway(ctx, c, profiles, time, dx, dy, [px, py, PW, PH], fade, shake);

  // left of the door: the date and what kind of thing this is
  if (age > 0.2) {
    const kind = (KINDS[info.set] && info.set !== 'none' ? KINDS[info.set].label : '').toUpperCase();
    drawText(ctx, `${MONTHS[c.day.getMonth()]} ${c.day.getDate()}`, px + 16, dy + 6, { scale: 2, color: '#fff6c8' });
    if (kind) {
      const kw = textWidth(kind) + 10;
      ctx.fillStyle = 'rgba(255,215,106,0.16)'; ctx.fillRect(px + 16, dy + 26, kw, 13);
      drawText(ctx, kind, px + 21, dy + 29, { color: '#ffd76a' });
    }
  }
  // right of the door: what it has to say for itself
  if (age > 0.9 && info.quip) { const bx = dx + DW + 14 - Math.round(shake); bubble(ctx, info.quip, bx, dy + 14, px + PW - 12 - bx, Math.floor((age - 0.9) * 45), false); }
  // underneath: its name and what it does
  if (age > 0.25) {
    const name = info.name, big = textWidth(name, 2) <= PW - 24, ny = dy + DH + 10;
    const n = Math.floor((age - 0.25) * 40);
    drawText(ctx, name.slice(0, n), W / 2 - textWidth(name, big ? 2 : 1) / 2, ny + (big ? 0 : 3), { scale: big ? 2 : 1, color: '#ffffff' });
    if (age > 0.6) drawText(ctx, info.blurb, W / 2, ny + 19, { align: 'center', color: '#c9d8ff' });
    const also = alsoOut(c);
    if (age > 0.9 && also.length) drawText(ctx, `AND: ${also.map((i) => i.name).join(', ')}`.slice(0, 54), W / 2, ny + 31, { align: 'center', color: '#ffe27a' });
  }
  if (t > 3.2) drawText(ctx, 'TAP TO CARRY ON', px + PW - 10, py + PH - 12, { align: 'right', color: '#7a6a8e' });
  ctx.restore();
}

/** THE SIDE CARD: the same show in a tall narrow card that sits beside things instead of over them. */
export const SIDE_W = 196, SIDE_H = 240;
/**
 * (x, y): the card's top-left. Nothing else on the screen is dimmed or hidden. The game
 * uses this one: on the right of a ride, and in the right-hand panel of the calendars.
 */
export function drawDoorSide(ctx, c, profiles, time, x, y) {
  const t = c.t, info = c.info;
  const inn = easeOut(clamp(t / 0.3, 0, 1)), fade = clamp((c.secs - t) / 0.35, 0, 1);
  const px = Math.round(x + (1 - inn) * 30), py = y;
  ctx.save();
  ctx.globalAlpha = fade * inn;
  panel(ctx, px, py, SIDE_W, SIDE_H, { fill: 'rgba(26,14,34,0.95)', border: '#ffd76a' });
  for (let sx = px + 3, k = 0; sx < px + SIDE_W - 3; sx += 8, k++) { ctx.fillStyle = k & 1 ? '#c8343c' : '#f4f6ff'; ctx.fillRect(sx, py + 3, Math.min(8, px + SIDE_W - 3 - sx), 3); }
  const head = headOf(c), hs = textWidth(head, 2) <= SIDE_W - 12 ? 2 : 1, mid = px + SIDE_W / 2;
  drawText(ctx, head, mid, py + (hs === 2 ? 10 : 14), { scale: hs, align: 'center', color: '#ffe27a' });
  const shake = shakeOf(t), dx = Math.round(px + (SIDE_W - DW) / 2 + shake), dy = py + 30;
  ctx.globalAlpha = fade * inn;
  const age = doorway(ctx, c, profiles, time, dx, dy, [px, py, SIDE_W, SIDE_H], fade * inn, shake);
  let ny = dy + DH + 8;
  if (age > 0.25) {
    const name = info.name, big = textWidth(name, 2) <= SIDE_W - 12, n = Math.floor((age - 0.25) * 40);
    drawText(ctx, name.slice(0, n), mid - textWidth(name, big ? 2 : 1) / 2, ny, { scale: big ? 2 : 1, color: '#ffffff' });
    ny += big ? 18 : 11;
    if (age > 0.6) {
      const also = alsoOut(c);
      const lines = wrapText(also.length ? `AND: ${also.map((i) => i.name).join(', ')}` : info.blurb, SIDE_W - 14).slice(0, 2);
      lines.forEach((line, i) => drawText(ctx, line, mid, ny + i * 10, { align: 'center', color: also.length ? '#ffe27a' : '#c9d8ff' }));
      ny += lines.length * 10 + 6;
    }
  }
  // what it has to say for itself, in a bubble under its name
  if (age > 0.9 && info.quip) {
    const lines = wrapText(info.quip, SIDE_W - 28), bw = Math.max(...lines.map((l) => textWidth(l))) + 12;
    bubble(ctx, info.quip, Math.round(mid - bw / 2), Math.min(ny + 4, py + SIDE_H - lines.length * 10 - 14), SIDE_W - 16, Math.floor((age - 0.9) * 45), true);
  }
  ctx.restore();
}

/**
 * A shut door, small, with its date in the wreath: what hovers beside you on a ride until
 * you tap it, and what a tapped door looks like on a calendar before it swings open.
 * c: a doorCard (or just { door, day, last }). (cx, cy): its middle. k: its size (1 = full size).
 */
export function drawDoorShut(ctx, c, cx, cy, k = 0.5, glow = 0) {
  const w = Math.round(DW * k), h = Math.round(DH * k), x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
  if (glow > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = glow;
    ctx.drawImage(glowCanvas([255, 214, 130]), x - Math.round(w * 0.6), y - Math.round(h * 0.4), Math.round(w * 2.2), Math.round(h * 1.8));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#ffd76a'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#b8862a'; ctx.fillRect(x - 2, y + h + 1, w + 4, 1);
  ctx.drawImage(leaf(c), x, y, w, h);
  return [x - 2, y - 2, w + 4, h + 4];
}
