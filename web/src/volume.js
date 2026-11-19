// LOUDNESS. The tablets' own volume buttons are round the back of the screen, so every
// page that makes a noise gets a quieter / louder pair. On a tablet they move the tablet's
// own volume for music and video, which also turns Netflix and YouTube up and down; in a
// computer's browser, where there is no tablet to ask, they move the game's own.
import { clamp } from './util.js';

let seen = { level: 7, max: 10, at: -9999 };

/** How loud it is now: { level, max }. (The tablet is asked again about once a second.) */
export function volume(app) {
  const host = window.MerryHost;
  if (host && host.getVolume) {
    const now = performance.now();
    if (now - seen.at > 1000) {
      try { const v = JSON.parse(host.getVolume()); seen = { level: v.level, max: v.max, at: now }; } catch (e) { seen.at = now; }
    }
    return seen;
  }
  return { level: Math.round(app.sound.loud * 10), max: 10 };
}

/** One step quieter (-1) or louder (+1). */
export function nudgeVolume(app, dir) {
  const host = window.MerryHost;
  if (host && host.changeVolume) {
    try { const v = JSON.parse(host.changeVolume(dir)); seen = { level: v.level, max: v.max, at: performance.now() }; } catch (e) { /* older shell */ }
  } else {
    app.sound.setLoud(clamp(Math.round(app.sound.loud * 10 + dir) / 10, 0, 1));
  }
  const v = volume(app);
  app.flash(`VOLUME ${v.level} OF ${v.max}`);
}

/**
 * Quieter, a little meter, louder: [-] ▮▮▮▯▯ [+]. btn is the page's own button drawer
 * (ctx, input, x, y, w, h, label) -> tapped. w is the whole width; the buttons are bw wide.
 */
export function drawVolume(ctx, input, app, x, y, w, h, btn, live = true) {
  const bw = Math.max(16, h + 3), v = volume(app);
  if (btn(ctx, input, x, y, bw, h, '-') && live) nudgeVolume(app, -1);
  if (btn(ctx, input, x + w - bw, y, bw, h, '+') && live) nudgeVolume(app, 1);
  const mx = x + bw + 3, mw = w - 2 * bw - 6, n = Math.min(v.max, 10), on = Math.round((v.level / Math.max(1, v.max)) * n);
  const cell = Math.max(2, Math.floor(mw / n));
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < on ? '#ffd76a' : 'rgba(160,190,255,0.25)';
    const bar = 3 + Math.round((i / Math.max(1, n - 1)) * (h - 6));
    ctx.fillRect(mx + i * cell, y + h - 2 - bar, cell - 1, bar);
  }
}
