// DEVICE SETTINGS: everything about the tablet itself, opened from the home page. Which build
// is running and how to get a newer one, whether the Home button comes here, and the ways
// back to Peloton's own screens and to Android's settings (Wi-Fi, volume, brightness).
// Nothing here changes the game: the game's switches are in its own menu (settings.js).
import { W, H, HOME_NAME, HOME_SHORT, APP_NAME, VERSION } from './config.js';
import { drawText } from './font.js';
import { button } from './ui.js';
import { Retro, rule, rainbowText, hue } from './retro.js';
import { webButton } from './launcher.js';
import { pictureSays, pictureButtons } from './picture.js';

export class DeviceScreen {
  constructor(app) { this.app = app; this.t = 0; this.retro = new Retro(); }
  update(dt) { this.t += dt; this.retro.update(dt); }
  back() { this.app.goLauncher(); }

  draw(ctx) {
    const app = this.app, input = app.input, m = app.machine, host = window.MerryHost, t = this.t;
    for (const tap of input.taps) { this.retro.burst(tap.x, tap.y); app.sound.sparkle(); }
    this.retro.back(ctx);
    if (webButton(ctx, input, 10, 8, 72, 22, `◀ ${HOME_SHORT}`)) { app.sound.tap(); app.goLauncher(); return; }
    rainbowText(ctx, 'DEVICE SETTINGS', W / 2, 9, t, 3);
    rule(ctx, 12, 36, W - 24, t);

    const px = 44, pw = W - 88, rowH = Math.min(52, Math.floor((H - 56) / 6)), y0 = 46;
    let i = 0;
    const row = (label, sub, sub2) => {
      const y = y0 + i * rowH;
      ctx.fillStyle = hue(i * 60 + t * 50, 56);
      ctx.fillRect(px - 2, y - 2, pw + 4, rowH - 4);
      ctx.fillStyle = '#0d0420';
      ctx.fillRect(px, y, pw, rowH - 8);
      drawText(ctx, label, px + 12, y + 7, { scale: 2, color: '#ffffff' });
      if (sub) drawText(ctx, sub, px + 12, y + 25, { color: '#7df9ff' });
      if (sub2) drawText(ctx, sub2, px + 12, y + 35, { color: '#ff7bd5' });
      i++;
      return y + Math.floor((rowH - 8 - 22) / 2);
    };
    const rx = px + pw - 12;
    const onlyTablet = (y) => drawText(ctx, 'ONLY ON THE TABLET', rx, y + 7, { align: 'right', color: '#8a7fb8' });

    // the picture: first, because it is the one people change
    let y = row('THE PICTURE', pictureSays(app.store.settings), 'SAVED ON THIS TABLET ONLY');
    pictureButtons(ctx, input, app, rx, y);

    // which build is running, and updates
    const up = app.update;
    y = row('THIS BUILD', `${APP_NAME} ${up.version || VERSION} • BUILD ${up.build || '?'}${up.source ? ` • ${up.source === 'downloaded' ? 'ARRIVED OVER WI-FI' : 'CAME WITH THE APP'}` : ''}`,
      up.message || (host && host.checkForUpdate ? 'NEWER BUILDS DOWNLOAD OVER WI-FI' : 'ON THE TABLET, NEWER BUILDS DOWNLOAD OVER WI-FI'));
    if (host && host.checkForUpdate) {
      if (up.state === 'ready') { if (button(ctx, input, rx - 150, y, 150, 22, 'RESTART TO UPDATE', { kind: 'green' })) { app.sound.tap(); host.applyUpdate(); } }
      else if (button(ctx, input, rx - 150, y, 150, 22, up.state === 'checking' ? 'CHECKING...' : 'CHECK FOR UPDATES', { kind: 'blue' })) { app.sound.tap(); app.checkForUpdate(); }
    } else onlyTablet(y);

    // the Home button
    if (host && host.setHome) {
      const allowed = !host.canBeHome || host.canBeHome();
      if (t - (this.homeAt || -9) > 1) { this.homeAt = t; try { this.isHome = !!host.isHome(); } catch (e) { this.isHome = false; } }
      y = row('HOME BUTTON', !allowed ? 'ON A TREADMILL, PELOTON KEEPS THE HOME BUTTON' : this.isHome ? `THE HOME BUTTON COMES HERE, TO ${HOME_NAME}` : `MAKE ${HOME_NAME} WHAT THE TABLET STARTS UP INTO`,
        'WAYS BACK: HOW TO UNDO THIS, WHATEVER HAPPENS');
      if (host.openRescue && button(ctx, input, rx - 156, y, 84, 22, 'WAYS BACK', { kind: 'ghost' })) { app.sound.tap(); host.openRescue(); }
      if (allowed) { if (button(ctx, input, rx - 64, y, 64, 22, this.isHome ? 'ON' : 'OFF', { kind: this.isHome ? 'green' : 'ghost', scale: 2 })) { app.sound.tap(); host.setHome(!this.isHome); this.homeAt = -9; } }
      else drawText(ctx, 'OFF', rx - 20, y + 7, { align: 'right', color: '#8a7fb8' });
    } else {
      y = row('HOME BUTTON', `THE TABLET CAN START UP STRAIGHT INTO ${HOME_NAME}`, 'NEVER ON THE TREADMILL: PELOTON KEEPS ITS HOME BUTTON THERE');
      onlyTablet(y);
    }

    // the family's log, shared between the machines (Peloton's own home screen is under ALL APPS now)
    const sync = app.sync || { state: 'unknown' };
    let on = false;
    try { on = !!(host && host.getSyncStatus && JSON.parse(host.getSyncStatus()).on); } catch (e) { on = false; }
    const when = sync.at ? new Date(sync.at) : null;
    const clock = when ? `${when.getHours() % 12 || 12}:${String(when.getMinutes()).padStart(2, '0')} ${when.getHours() >= 12 ? 'PM' : 'AM'}` : '';
    y = row('FAMILY LOG', !host || !host.syncNow ? 'ON THE TABLET, RIDES ARE SHARED WITH THE OTHER MACHINE'
      : !on ? 'NOT SET UP ON THIS TABLET YET (IT IS DONE FROM THE MAC)'
        : sync.state === 'ok' ? `IN STEP AT ${clock} • ${app.store.rides.length} RIDES HERE${sync.got ? ` • ${sync.got} NEW FROM THE OTHER MACHINE` : ''}`
          : sync.state === 'busy' ? 'CHECKING...' : sync.state === 'error' ? (sync.message || 'COULD NOT REACH GITHUB') : 'NOT CHECKED YET',
    'EVERY RIDE, ON BOTH MACHINES. NOTHING IS EVER REMOVED');
    if (host && host.syncNow) { if (button(ctx, input, rx - 150, y, 150, 22, 'SYNC NOW', { kind: on ? 'blue' : 'ghost' })) { app.sound.tap(); app.syncNow(); } }
    else onlyTablet(y);

    // Android's settings
    y = row('TABLET SETTINGS', 'WI-FI, VOLUME, BRIGHTNESS, BLUETOOTH', "THESE ARE ANDROID'S OWN SETTINGS SCREENS");
    if (host && host.openAndroidSettings) { if (button(ctx, input, rx - 150, y, 150, 22, 'ANDROID SETTINGS', { kind: 'blue' })) { app.sound.tap(); host.openAndroidSettings(); } }
    else onlyTablet(y);

    // what this is
    row('THIS MACHINE', `${m.isSim ? 'NO MACHINE ATTACHED: PRETENDING TO BE ' : ''}${m.isSim ? (m.kind === 'bike' ? 'A BIKE' : 'A TREADMILL') : m.model}`,
      `SCREEN ${Math.round(innerWidth * (window.devicePixelRatio || 1))} X ${Math.round(innerHeight * (window.devicePixelRatio || 1))} • GAME SETTINGS ARE INSIDE ${APP_NAME}`);

    this.retro.front(ctx);
  }
}
