// The GAME's settings (Merry Miles): music, dogs, the advent calendar, the sky, picture
// detail, the test controls and the ride log. Opened from the game's own menu.
// Anything about the tablet itself (updates, the Home button, the way back to Peloton)
// is on Awesome Workout World instead: device.js.
import { W, H } from './config.js';
import { MONTHS, parseDay } from './util.js';
import { drawText } from './font.js';
import { panel, button } from './ui.js';
import { header } from './chrome.js';
import { pictureSays, pictureButtons } from './picture.js';

export class SettingsScreen {
  constructor(app) { this.app = app; this.t = 0; this.confirm = 0; }
  update(dt) { this.t += dt; this.confirm = Math.max(0, this.confirm - dt); this.app.backdrop.update(dt); }

  back() { this.app.goPeople(); }

  draw(ctx) {
    const app = this.app, input = app.input, set = app.store.settings, season = app.season;
    app.backdrop.draw(ctx, 0.62);
    if (header(ctx, input, 'GAME SETTINGS', 'BACK')) { app.sound.tap(); app.goPeople(); return; }

    const ROWS = 9, px = 60, pw = W - 120, y0 = 42, rowH = Math.min(33, Math.floor((H - y0 - 10) / ROWS));
    panel(ctx, px, y0 - 3, pw, rowH * ROWS + 6, { fill: 'rgba(8,14,46,0.92)' });
    let i = 0;
    const row = (label, sub) => {
      const y = y0 + i * rowH;
      if (i) { ctx.fillStyle = 'rgba(160,190,255,0.14)'; ctx.fillRect(px + 10, y - 2, pw - 20, 1); }
      drawText(ctx, label, px + 14, y + (sub ? 5 : 10), {});
      if (sub) drawText(ctx, sub, px + 14, y + 17, { color: '#8fa3d6' });
      i++;
      return y + 4;
    };
    const rx = px + pw - 14;
    const toggle = (y, on) => button(ctx, input, rx - 64, y, 64, 22, on ? 'ON' : 'OFF', { kind: on ? 'green' : 'ghost', scale: 2 });
    const save = () => { app.store.save(); app.sound.tap(); };

    let y = row('THE PICTURE', pictureSays(set));
    pictureButtons(ctx, input, app, rx, y);

    y = row('MUSIC', 'CAROLS WHILE YOU RIDE');
    if (toggle(y, app.sound.musicOn)) app.toggleMusic();

    const dogs = app.profiles.filter((q) => q.look && q.look.species === 'dog').map((q) => q.name);
    y = row('DOG COMPANIONS', !dogs.length ? 'NO DOGS IN THIS FAMILY YET (PROFILES.JS)' : `${dogs.length > 2 ? 'THE DOGS' : dogs.join(' AND ')} COME${dogs.length === 1 ? 'S' : ''} ALONG, ONCE THEIR DOOR${dogs.length === 1 ? ' IS' : 'S ARE'} OPEN`);
    if (toggle(y, set.dogs)) { set.dogs = !set.dogs; save(); }

    y = row('ADVENT UNLOCKS', set.gifts !== false ? 'BUDDIES, DOGS, FOOD AND SURPRISES WAIT BEHIND THEIR DOORS' : 'OFF: EVERYTHING IS IN THE GAME FROM THE START');
    if (toggle(y, set.gifts !== false)) { set.gifts = set.gifts === false; save(); }

    const custom = set.seasonStart ? parseDay(set.seasonStart) : null;
    y = row('THE TRAIL OPENS', custom ? `YOUR OWN START: ${MONTHS[custom.getMonth()]} ${custom.getDate()}` : 'THANKSGIVING DAY: A MILE A DAY GETS YOU HOME');
    if (button(ctx, input, rx - 188, y, 108, 22, 'THANKSGIVING', { kind: !custom ? 'gold' : 'blue', selected: !custom })) { set.seasonStart = ''; save(); }
    if (button(ctx, input, rx - 74, y, 74, 22, 'TODAY', { kind: custom ? 'gold' : 'blue', selected: !!custom })) { set.seasonStart = season.today(); save(); }

    y = row('ONLY IN THE SEASON', set.seasonLock !== false ? 'NO RIDES UNTIL THE TRAIL OPENS: THE HOME SCREEN COUNTS THE DAYS' : 'OFF: ANYBODY CAN RIDE ANY DAY (WARM-UP RIDES)');
    if (toggle(y, set.seasonLock !== false)) { set.seasonLock = set.seasonLock === false; save(); }

    y = row('THE SKY', set.sky === 'night' ? 'EVERY RIDE STAYS UNDER THE STARS' : 'NIGHT, AND THE SUN COMES UP AS YOU FINISH YOUR MILE');
    if (button(ctx, input, rx - 196, y, 108, 22, 'NIGHT + SUNRISE', { kind: set.sky !== 'night' ? 'gold' : 'blue', selected: set.sky !== 'night' })) { set.sky = 'sunrise'; save(); }
    if (button(ctx, input, rx - 84, y, 84, 22, 'ALWAYS NIGHT', { kind: set.sky === 'night' ? 'gold' : 'blue', selected: set.sky === 'night' })) { set.sky = 'night'; save(); }

    const tester = app.profiles.find((q) => q.tester);
    y = row('DEV CONTROLS', !tester ? 'NOBODY IS MARKED AS THE DEV (PROFILES.JS)' : app.machine.isSim ? `ONLY ON ${tester.name}'S CALENDAR AND RIDES (NO REAL MACHINE HERE)` : `ONLY ON ${tester.name}'S CALENDAR AND RIDES`);
    if (toggle(y, app.devTools)) { set.dev = !set.dev; save(); }

    y = row('ERASE ALL RIDES', `${app.store.rides.length} SAVED ON THIS TABLET`);
    if (button(ctx, input, rx - 150, y, 150, 22, this.confirm > 0 ? 'TAP AGAIN TO ERASE' : 'ERASE', { kind: this.confirm > 0 ? 'red' : 'ghost' })) {
      if (this.confirm > 0) { app.store.clearRides(false); this.confirm = 0; app.sound.thump(); } else { this.confirm = 3; app.sound.tap(); }
    }
    void H;
  }
}
