// AWESOME WORKOUT WORLD: the tablet's home page. The first thing you see when you walk up to the bike
// or the treadmill, and it has nothing to do with riding: it is the front door to
// everything on the device. The apps (the riding game is one of them), the build that is
// running, and the device's own settings.
//
// It is dressed as a home page from the early web that wishes it was the 1980s: flaming
// title, rainbow rules, a hit counter (which is the build number), a marquee, and the
// family's dogs dancing. Touch anywhere for a rainbow explosion. (retro.js draws the effects.)
import { W, H, HOME_NAME, APP_NAME, VERSION } from './config.js';
import { daysToChristmas, MONTHS } from './util.js';
import { drawText, textWidth } from './font.js';
import { uiSprite } from './sprites.js';
import { SERVICES, countdownLine } from './text.js';
import { FAMILY } from '../family.js';
import { figureSprite } from './figure.js';
import { Retro, Fire, rule, rainbowText, marquee, counter, hue } from './retro.js';
import { drawVolume } from './volume.js';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TW0 = 104, TH = 118, GAP = 10;     // tiles: big enough to hit from a moving belt (they get a little narrower when there are more than five)

/** A generic screen-with-a-play-button picture (deliberately not anyone's logo). */
function screenIcon(ctx, x, y, color) {
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x, y, 60, 42); ctx.fillRect(x + 22, y + 42, 16, 5); ctx.fillRect(x + 14, y + 47, 32, 3);
  ctx.fillStyle = color;
  ctx.fillRect(x + 3, y + 3, 54, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x + 3, y + 3, 54, 10);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 10; i++) ctx.fillRect(x + 24 + i, y + 11 + i, 2, 20 - i * 2);
}
function noteIcon(ctx, x, y, color) {
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x + 8, y, 44, 50); ctx.fillRect(x + 4, y + 4, 52, 42);
  ctx.fillStyle = color;
  ctx.fillRect(x + 10, y + 3, 40, 44); ctx.fillRect(x + 7, y + 7, 46, 36);
  drawText(ctx, '♪', x + 20, y + 9, { scale: 4, color: '#ffffff', shadow: 'rgba(0,0,0,0.3)' });
}
/** A little house: the way back to the tablet's original home screen. */
export function houseIcon(ctx, x, y, color) {
  ctx.fillStyle = '#2a2a3a';
  for (let i = 0; i < 16; i++) ctx.fillRect(x + 30 - i * 2, y + i, i * 4 + 2, 1);
  ctx.fillRect(x + 6, y + 16, 50, 30);
  ctx.fillStyle = color;
  for (let i = 2; i < 15; i++) ctx.fillRect(x + 31 - i * 2 + 3, y + i + 1, i * 4 - 6, 1);
  ctx.fillRect(x + 9, y + 17, 44, 26);
  ctx.fillStyle = '#ffd76a';
  ctx.fillRect(x + 14, y + 22, 9, 9); ctx.fillRect(x + 39, y + 22, 9, 9);
  ctx.fillStyle = '#10182e';
  ctx.fillRect(x + 27, y + 26, 9, 17);
}

/** Nine little windows: everything else on the tablet. */
function gridIcon(ctx, x, y, t) {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(x + 2 + c * 20, y + r * 17, 17, 14);
    ctx.fillStyle = hue((r * 3 + c) * 40 + t * 60, 60);
    ctx.fillRect(x + 4 + c * 20, y + 2 + r * 17, 13, 10);
  }
}

/** A raised grey button, the way buttons looked on a web page in 1996. Returns true when tapped. */
export function webButton(ctx, input, x, y, w, h, label) {
  const hit = input.tapIn(x, y, w, h), down = input.pointer.down && input.over(x, y, w, h);
  ctx.fillStyle = '#c3c3cc'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = down ? '#55555f' : '#ffffff'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
  ctx.fillStyle = down ? '#ffffff' : '#55555f'; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
  drawText(ctx, label, x + w / 2 + (down ? 1 : 0), y + Math.floor((h - 7) / 2) + (down ? 1 : 0), { align: 'center', color: '#101018', shadow: null });
  return hit;
}

export class LauncherScreen {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.retro = new Retro();
    this.fire = new Fire([{ text: 'AWESOME', scale: 5 }, { text: 'WORKOUT WORLD', scale: 3 }], 5, 20);
    // Two dancers, one either side of the title: the family's dogs; or, with no dogs yet, whoever is here (and the guest frog)
    const isDog = (p) => p.look && p.look.species === 'dog';
    this.hasDogs = app.profiles.some(isDog);
    const dancers = app.profiles.filter(isDog).concat(app.profiles.filter((p) => !isDog(p) && !p.guest), app.profiles.filter((p) => p.guest));
    this.dogs = dancers.slice(0, 2).map((p, i) => ({ p, side: i ? 1 : -1, hop: 0, woof: 0 }));
  }

  update(dt) {
    this.t += dt;
    this.retro.update(dt);
    this.fire.update(dt);
    // the home page's tune (quiet while another app has been opened from here)
    const sound = this.app.sound;
    if (!this.app.away) { if (!sound.ctx) sound.unlock(); sound.playTheme(); }
    for (const d of this.dogs) { d.hop = Math.max(0, d.hop - dt * 2.2); d.woof = Math.max(0, d.woof - dt); }
  }

  /**
   * Two beats of bouncing facing you, two of trotting on the spot, and round again, with a twirl.
   * The dancers go with the machine you are on: on the bike they are riding fat bikes, pedalling
   * on the spot; on the treadmill they are skinning along on skis (that is the treadmill's ride).
   * Dogs have no bikes: they trot either way.
   */
  _dog(ctx, d, cx, ground) {
    const beat = this.t * 2.1 + (d.side > 0 ? 4 : 0), b = Math.floor(beat) % 8, f = beat % 1;
    const wig = Math.floor(this.t * 8) % 4, ppm = 46;
    const bounce = Math.round(Math.abs(Math.sin(f * Math.PI)) * 5 + Math.sin(d.hop * Math.PI) * 16);
    const bike = this.app.machine.kind === 'bike', person = !(d.p.look && d.p.look.species === 'dog');
    const ride = bike ? 'bike' : 'tread', spin = Math.floor(this.t * 16) % 12;
    let view = 'front', mode = bike && person ? 'bike' : 'stand', pose = bike && person ? spin : 0, flip = false, dx = 0;
    if (b === 2 || b === 3) { view = 'side'; mode = ride; pose = spin; dx = Math.round((b - 2 + f) * 5); }
    else if (b === 6) { view = 'side'; mode = ride; pose = spin; flip = true; dx = Math.round(10 - f * 5); }
    else if (b === 7) { view = ['side', 'back', 'side', 'front'][Math.floor(f * 4)]; mode = ride; pose = bike ? spin : 0; flip = f < 0.25; dx = Math.round(5 - f * 5); }   // the twirl
    else dx = Math.round(Math.sin(beat * Math.PI) * 2);
    const s = figureSprite(d.p, view, mode, ppm, pose, wig);
    // a little glowing dance floor
    for (let k = 0; k < 4; k++) { ctx.fillStyle = hue(k * 90 + Math.floor(beat) * 90, (k + Math.floor(beat)) % 2 ? 60 : 40); ctx.fillRect(cx - 28 + k * 14, ground + 1, 14, 4); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - 14 + dx, ground, 28, 1);
    const x = cx + dx * d.side, y = ground - s.footY - bounce;
    if (flip !== (d.side > 0 && view === 'side')) {
      ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(s.canvas, -s.footX, y); ctx.restore();
    } else ctx.drawImage(s.canvas, x - s.footX, y);
    // notes float up off the dancer
    for (let k = 0; k < 2; k++) {
      const u = (this.t * 0.6 + k * 0.5 + (d.side > 0 ? 0.25 : 0)) % 1;
      ctx.globalAlpha = 1 - u;
      drawText(ctx, '♪', cx + d.side * (22 + k * 9) + Math.round(Math.sin(u * 9) * 3), ground - 40 - Math.round(u * 26), { color: hue(u * 360 + k * 120, 68), shadow: null });
    }
    ctx.globalAlpha = 1;
    if (d.woof > 0) drawText(ctx, 'WOOF!', cx, ground - 84, { scale: 2, align: 'center', color: '#fff23f' });
    return { x: cx - 34, y: ground - 70, w: 68, h: 76 };
  }

  draw(ctx) {
    const app = this.app, input = app.input, m = app.machine, t = this.t;
    const top = Math.floor((H - 336) / 2);
    // touch anywhere: a rainbow explosion (and whatever you touched still works)
    for (const tap of input.taps) { this.retro.burst(tap.x, tap.y); app.sound.unlock(); app.sound.sparkle(); app.away = false; }

    const floorY = top + 240;
    this.retro.back(ctx, floorY);

    // --- the status line: the clock, and which machine this is ---
    const now = app.season.now();
    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    drawText(ctx, `${h}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`, 12, top + 6, { scale: 2, color: '#7df9ff', shadow: 'rgba(0,0,0,0.8)' });
    drawText(ctx, `${DAYS[now.getDay()]} ${MONTHS[now.getMonth()]} ${now.getDate()}`, 12, top + 24, { color: '#ff7bd5' });
    const where = m.kind === 'bike' ? 'THE BIKE' : 'THE TREADMILL';
    drawText(ctx, `YOU ARE ON ${where}`, W - 12, top + 6, { align: 'right', color: '#7df9ff' });
    drawText(ctx, m.isSim ? '(SIMULATOR)' : m.model, W - 12, top + 17, { align: 'right', color: m.isSim ? '#8a7fb8' : '#7dff3f' });

    // --- the title, on fire, with a dog dancing either side ---
    rainbowText(ctx, '★ WELCOME TO ★', W / 2, top + 1, t);
    this.fire.draw(ctx, W / 2, top + 25);
    const ground = top + 80;
    this.dogs.forEach((d) => {
      const box = this._dog(ctx, d, W / 2 + d.side * 196, ground);
      if (!this.menu && input.taps.some((p) => p.x >= box.x && p.x < box.x + box.w && p.y >= box.y && p.y < box.y + box.h)) { d.hop = 1; d.woof = 0.9; app.sound.chime(); }
    });
    rule(ctx, 12, top + 90, W - 24, t);

    // --- the little menu, top right: loudness, and the tablet's Bluetooth and Wi-Fi pages ---
    const host = window.MerryHost, mw = 150, mx = W - 12 - mw, my = top + 46;
    if (webButton(ctx, input, W - 12 - 58, top + 28, 58, 15, this.menu ? 'MENU ▲' : 'MENU ▼')) { app.sound.tap(); this.menu = !this.menu; }
    else if (this.menu && input.taps.some((p) => p.x < mx || p.x >= mx + mw || p.y < my || p.y >= my + 44)) this.menu = false;   // a tap anywhere else shuts it
    if (this.menu) {
      ctx.fillStyle = '#ff3fd0'; ctx.fillRect(mx - 1, my - 1, mw + 2, 46);
      ctx.fillStyle = '#12063a'; ctx.fillRect(mx, my, mw, 44);
      drawText(ctx, 'VOLUME', mx + 6, my + 8, { color: '#7df9ff' });
      drawVolume(ctx, input, app, mx + 46, my + 4, mw - 52, 15, webButton);
      const page = (label, which, bx, bw) => {
        if (!webButton(ctx, input, bx, my + 24, bw, 15, label)) return;
        app.sound.tap();
        if (host && host.openSettingsPage) { app.sound.stopMusic(); app.away = true; host.openSettingsPage(which); } else app.flash(`ON THE TABLET THIS OPENS ITS ${label} PAGE`);
      };
      page('BLUETOOTH', 'bluetooth', mx + 6, 80);
      page('WI-FI', 'wifi', mx + 92, 52);
    }

    // --- the apps ---
    // The game, then whichever TV and music apps this family wants (`home` in family.js: none unless asked for), then everything else.
    const wanted = Array.isArray(FAMILY.home) ? FAMILY.home : [];
    const shown = wanted.map((k) => SERVICES.find((s) => s.key === k)).filter(Boolean);
    const tiles = [{ ride: true, name: APP_NAME, sub: 'THE RIDING GAME', color: '#ff3f5c', fresh: true }].concat(shown, [{ apps: true, name: 'ALL APPS', sub: 'EVERYTHING ELSE', color: '#8aa0ff' }]);
    const TW = Math.min(TW0, Math.floor((W - 24 - (tiles.length - 1) * GAP) / tiles.length)), ICON_X = Math.round((TW - 60) / 2);
    const total = tiles.length * TW + (tiles.length - 1) * GAP, x0 = Math.round((W - total) / 2), y = top + 102;
    tiles.forEach((tile, i) => {
      const x = x0 + i * (TW + GAP);
      const hot = input.over(x, y, TW, TH), lift = hot ? -3 : 0, yy = y + lift;
      const glow = hue(i * 52 + t * 70, hot ? 72 : 58);
      ctx.fillStyle = glow;
      ctx.fillRect(x - 2, yy - 2, TW + 4, TH + 4);
      ctx.fillStyle = hot ? '#1c0b3c' : '#0d0420';
      ctx.fillRect(x, yy, TW, TH);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, yy, TW, 2); ctx.fillRect(x, yy, 2, TH);
      if (tile.ride) {
        const santa = uiSprite('santa', 0, 22);
        ctx.drawImage(santa, Math.round(x + (TW - santa.width) / 2), yy + 8);
      } else if (tile.apps) gridIcon(ctx, x + ICON_X, yy + 16, t);
      else if (tile.music) noteIcon(ctx, x + ICON_X, yy + 14, tile.color);
      else screenIcon(ctx, x + ICON_X, yy + 16, tile.color);
      // the name: two lines if it is long
      const words = tile.name.split(' '), two = textWidth(tile.name, 2) > TW - 8 && words.length > 1;
      if (two) { drawText(ctx, words[0], x + TW / 2, yy + 72, { scale: 2, align: 'center' }); drawText(ctx, words.slice(1).join(' '), x + TW / 2, yy + 88, { scale: 2, align: 'center' }); }
      else drawText(ctx, tile.name, x + TW / 2, yy + 80, { scale: 2, align: 'center' });
      drawText(ctx, tile.sub, x + TW / 2, yy + 108, { align: 'center', color: glow });
      if (tile.fresh && Math.sin(t * 7) > -0.3) {
        // the blinking NEW! that every home page had
        ctx.fillStyle = '#fff23f';
        ctx.fillRect(x + TW - 30, yy - 6, 34, 13);
        ctx.fillStyle = '#ff2a2a';
        ctx.fillRect(x + TW - 29, yy - 5, 32, 11);
        drawText(ctx, 'NEW!', x + TW - 13, yy - 3, { align: 'center', color: '#fff23f', shadow: null });
      }
      if (input.tapIn(x, y, TW, TH)) {
        app.sound.unlock(); app.sound.tap();
        if (tile.ride) app.goPeople(); else if (tile.apps) app.openApps(); else if (tile.demo) app.flash(`ON A REAL PELOTON THIS OPENS YOUR ${tile.name}`); else app.watch(tile);
      }
    });

    // --- the foot of the page, standing on the neon floor ---
    const by = floorY + 10;
    // the hit counter is the build that is running
    const up = app.update;
    drawText(ctx, 'THIS PAGE IS BUILD NUMBER', 14, by, { color: '#7df9ff' });
    counter(ctx, 16, by + 13, up.build || 0);
    drawText(ctx, `${APP_NAME} ${up.version || VERSION}${up.source === 'downloaded' ? ' (UPDATED OVER WI-FI)' : ''}`, 14, by + 32, { color: '#ff7bd5' });
    if (up.state === 'ready') drawText(ctx, 'A NEWER BUILD IS READY: SEE DEVICE SETTINGS', 14, by + 43, { color: '#fff23f' });

    // always under construction
    const ux = W / 2 - 62, uy = by + 6;
    for (let k = 0; k < 18; k++) {
      ctx.fillStyle = (k + Math.floor(t * 4)) % 2 ? '#fff23f' : '#101018';
      ctx.fillRect(ux + k * 7, uy, 7, 4); ctx.fillRect(ux + k * 7, uy + 24, 7, 4);
    }
    ctx.fillStyle = '#101018';
    ctx.fillRect(ux, uy + 4, 126, 20);
    drawText(ctx, 'ALWAYS UNDER', ux + 63, uy + 6, { align: 'center', color: '#fff23f', shadow: null });
    drawText(ctx, 'CONSTRUCTION', ux + 63, uy + 15, { align: 'center', color: '#fff23f', shadow: null });
    drawText(ctx, 'BEST VIEWED ON A PELOTON', W / 2, uy + 34, { align: 'center', color: '#8a7fb8' });

    // the device's own settings (not the game's: those are inside the game)
    if (webButton(ctx, input, W - 14 - 150, by + 4, 150, 26, 'DEVICE SETTINGS')) { app.sound.tap(); app.openDevice(); return; }
    drawText(ctx, 'UPDATES, HOME BUTTON, WI-FI', W - 14, by + 36, { align: 'right', color: '#7df9ff' });

    const days = daysToChristmas(now);
    marquee(ctx, `★ WELCOME TO ${HOME_NAME}!!! ★ ${countdownLine(days)} ★ YOU ARE ON ${where} ★ TOUCH ANYTHING. GO ON. ★ THIS PAGE IS ALWAYS UNDER CONSTRUCTION ★ PLEASE SIGN OUR GUESTBOOK (WE DO NOT HAVE A GUESTBOOK) ★ ${this.hasDogs ? 'THE DOGS HAVE' : 'EVERYBODY HAS'} BEEN DANCING SINCE YOU GOT HERE ★ BEST VIEWED ON A PELOTON `, H - 11, t);

    this.retro.front(ctx);
  }
}
