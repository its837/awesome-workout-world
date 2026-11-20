// ALL APPS: everything else on the tablet that has an icon to open, and the way to
// Peloton's own home screen. The tablet decides what is on the list (HostBridge.listApps
// in the Android shell): anything a person installs shows up by itself, and Peloton's
// factory and service tools are left off on purpose.
import { W, H, HOME_SHORT } from './config.js';
import { drawText, textWidth } from './font.js';
import { Retro, rule, rainbowText, hue } from './retro.js';
import { webButton, houseIcon } from './launcher.js';

const CW = 96, CH = 88, GAP = 8, COLS = 6, ROWS = 3;      // 6 across: 6*96 + 5*8 = 616
const PER = COLS * ROWS;

// A computer's browser has no apps to list: a pretend list, so the page can be looked at.
const PRETEND = ['SETTINGS', 'NETFLIX', 'CAMERA', 'GALLERY', 'SOUND RECORDER', 'A MUSIC APP', 'A BROWSER'].map((name) => ({ pkg: '', name, icon: '' }));

/** A tile's name on up to two lines, cut short with dots if it still does not fit. */
function nameLines(name, width) {
  const fits = (s) => textWidth(s) <= width;
  const cut = (s) => { while (s.length > 1 && !fits(`${s}..`)) s = s.slice(0, -1); return `${s}..`; };
  if (fits(name)) return [name];
  const words = name.split(' ');
  for (let i = words.length - 1; i > 0; i--) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (fits(a)) return [a, fits(b) ? b : cut(b)];
  }
  return [cut(name)];
}

export class AppsScreen {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.page = 0;
    this.retro = new Retro();
    const host = window.MerryHost;
    let list = null;
    try { if (host && host.listApps) list = JSON.parse(host.listApps()); } catch (e) { list = null; }
    this.pretend = !list;
    this.apps = [{ peloton: true, name: 'PELOTON' }].concat((list || PRETEND).map((a) => {
      let img = null;
      if (a.icon) { img = new Image(); img.src = a.icon; }
      return { pkg: a.pkg, name: String(a.name || a.pkg).toUpperCase(), img };
    }));
  }

  update(dt) { this.t += dt; this.retro.update(dt); }
  back() { this.app.goLauncher(); }

  open(a) {
    const app = this.app, host = window.MerryHost;
    if (a.peloton) { app.openPeloton(); return; }
    if (this.pretend || !host || !host.openApp) { app.flash('ON THE TABLET THIS OPENS THE APP'); return; }
    let ok = false;
    try { ok = !!host.openApp(a.pkg); } catch (e) { ok = false; }
    if (ok) { app.sound.stopMusic(); app.away = true; } else app.flash(`${a.name} WOULD NOT OPEN`);
  }

  draw(ctx) {
    const app = this.app, input = app.input, t = this.t;
    for (const tap of input.taps) { this.retro.burst(tap.x, tap.y); app.sound.sparkle(); }
    this.retro.back(ctx);
    if (webButton(ctx, input, 10, 8, 72, 22, `◀ ${HOME_SHORT}`)) { app.sound.tap(); app.goLauncher(); return; }
    rainbowText(ctx, 'ALL APPS', W / 2, 9, t, 3);
    rule(ctx, 12, 36, W - 24, t);

    const pages = Math.max(1, Math.ceil(this.apps.length / PER));
    this.page = Math.min(this.page, pages - 1);
    const shown = this.apps.slice(this.page * PER, this.page * PER + PER);
    const cols = Math.min(COLS, Math.max(shown.length, 1));
    const x0 = Math.round((W - (cols * CW + (cols - 1) * GAP)) / 2), y0 = 48;
    shown.forEach((a, i) => {
      const x = x0 + (i % COLS) * (CW + GAP), y = y0 + Math.floor(i / COLS) * (CH + GAP);
      const hot = input.over(x, y, CW, CH), yy = y + (hot ? -2 : 0);
      const glow = hue((i + this.page * PER) * 47 + t * 70, hot ? 72 : 58);
      ctx.fillStyle = glow;
      ctx.fillRect(x - 2, yy - 2, CW + 4, CH + 4);
      ctx.fillStyle = hot ? '#1c0b3c' : '#0d0420';
      ctx.fillRect(x, yy, CW, CH);
      const ix = x + (CW - 48) / 2, iy = yy + 8;
      if (a.peloton) houseIcon(ctx, x + (CW - 60) / 2, iy, '#8aa0ff');
      else if (a.img && a.img.complete && a.img.naturalWidth) ctx.drawImage(a.img, ix, iy, 48, 48);
      else {
        // no picture: a plain window with the name's first letter
        ctx.fillStyle = '#2a2a3a'; ctx.fillRect(ix, iy, 48, 48);
        ctx.fillStyle = glow; ctx.fillRect(ix + 3, iy + 3, 42, 42);
        drawText(ctx, a.name.charAt(0), x + CW / 2, iy + 13, { scale: 3, align: 'center', color: '#0d0420', shadow: null });
      }
      nameLines(a.name, CW - 8).forEach((line, k, all) => drawText(ctx, line, x + CW / 2, yy + (all.length > 1 ? 61 : 66) + k * 10, { align: 'center' }));
      if (input.tapIn(x, y, CW, CH)) { app.sound.unlock(); app.sound.tap(); this.open(a); }
    });

    if (pages > 1) {
      const by = H - 40;
      if (this.page > 0 && webButton(ctx, input, W / 2 - 110, by, 72, 22, '◀ BACK')) { app.sound.tap(); this.page--; }
      drawText(ctx, `PAGE ${this.page + 1} OF ${pages}`, W / 2, by + 8, { align: 'center', color: '#7df9ff' });
      if (this.page < pages - 1 && webButton(ctx, input, W / 2 + 38, by, 72, 22, 'MORE ▶')) { app.sound.tap(); this.page++; }
    }

    this.retro.front(ctx);
  }
}
