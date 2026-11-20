// THE PICTURE SETTING: how much forest to draw. One control, shown first on both settings
// pages (device.js on the home page, settings.js inside the game), so it is the same in
// both. What the choices do is in detail.js. It is saved on the tablet it is set on, so
// the bike and the treadmill each keep their own.
import { D, AIMS, applyDetail } from './detail.js';
import { button } from './ui.js';

const OPTIONS = [
  { key: 'look', label: 'BEST LOOK', w: 66 }, { key: 'balance', label: 'AUTO', w: 40 }, { key: 'smooth', label: 'SMOOTHEST', w: 66 },
  { key: 'full', label: 'FULL', w: 38 }, { key: 'medium', label: 'MEDIUM', w: 48 }, { key: 'light', label: 'LIGHT', w: 42 },
];
/** Which option is in force: one of AUTO's three aims ('look' | 'balance' | 'smooth'), a fixed level, or 'custom'. */
export function pictureChoice(set) {
  const d = set.detail || 'auto';
  return d === 'auto' ? (AIMS[set.autoAim] ? set.autoAim : 'balance') : d;
}
/** The short line under the row's name (short: the buttons sit beside it). */
export function pictureSays(set) {
  const c = pictureChoice(set), now = `${D.level.toUpperCase()}${D.half ? ' AT 30' : ''} NOW`;
  if (AIMS[c]) return `${AIMS[c].name}: ${now}`;
  if (c === 'custom') return 'YOUR OWN MIX (DEV CONTROLS)';
  return c === 'full' ? 'ALWAYS THE THICKEST FOREST' : c === 'medium' ? 'ALWAYS A LITTLE LIGHTER' : 'ALWAYS THE LIGHTEST';
}
/** The buttons, ending at rx. A tap saves and applies the change by itself. */
export function pictureButtons(ctx, input, app, rx, y) {
  const set = app.store.settings, cur = pictureChoice(set);
  let x = rx - OPTIONS.reduce((n, o) => n + o.w + 3, -3);
  for (const o of OPTIONS) {
    const on = cur === o.key;
    if (button(ctx, input, x, y, o.w, 22, o.label, { kind: on ? 'gold' : 'blue', selected: on })) {
      if (AIMS[o.key]) { set.detail = 'auto'; set.autoAim = o.key; set.autoLevel = AIMS[o.key].start; }   // (start again from the top of what this aim allows)
      else set.detail = o.key;
      app.store.save(); app.sound.tap(); applyDetail(set); app.governor.reset();
    }
    x += o.w + 3;
  }
}
