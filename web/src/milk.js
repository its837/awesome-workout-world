// PENGUIN MILK: what happens in the doorway when the penguin's door opens.
//
// The penguin pops out like anything else. Then it shuffles over, a glass pops up beside
// it, and it fills the glass the only way it can. (Penguins do not have those. This one
// does.) When the glass is full it is yours: PENGUIN MILK, in YOUR ITEMS on the left of a
// ride, to drink again every two minutes.
//
// door.js draws the penguin and calls drawMilking on top of it. `age` is seconds since the
// penguin popped out. The times, all in seconds of age:
export const MILK = {
  shuffle: 0.7,                               // the penguin shuffles over and the glass pops up
  squirts: [1.3, 1.72, 2.14, 2.56, 2.98],     // each squirt leaves the penguin (door.js plays a sound for each)
  done: 3.5,                                  // the glass is full: it hops, and the milk is handed over
};
export const MILK_SHIFT = 15;                 // how far the penguin shuffles, in pixels
const FLY = 0.3;                              // how long a squirt is in the air
const GLASS_W = 15, GLASS_H = 24;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** How far across the penguin has shuffled, 0..1. */
export function milkShift(age) { const u = clamp((age - MILK.shuffle) / 0.4, 0, 1); return u * u * (3 - 2 * u); }

/**
 * The glass, the squirts and where they come from.
 * pen: where the penguin's picture is on screen [left, top, width, height] (the card
 * picture from rewards.js, which is 0.9 x 1.0 units and faces right).
 * gx: the middle of the glass. floor: the step it stands on.
 */
export function drawMilking(ctx, pen, gx, floor, age) {
  if (age < MILK.shuffle) return;
  const [px, py, pw, ph] = pen;
  const u = clamp((age - MILK.shuffle) / 0.35, 0, 1), rise = 1 - (1 - u) * (1 - u);
  const full = clamp((age - MILK.squirts[0] - FLY) / (MILK.squirts[MILK.squirts.length - 1] - MILK.squirts[0]), 0, 1);
  const hop = age >= MILK.done && age < MILK.done + 0.45 ? Math.round(Math.sin(((age - MILK.done) / 0.45) * Math.PI) * 7) : 0;
  const gh = Math.round(GLASS_H * rise), gl = Math.round(gx - GLASS_W / 2), gt = floor - gh - hop;

  // the glass: what is in it first, then the glass round it
  if (gh > 4) {
    ctx.fillStyle = 'rgba(20,34,84,0.55)'; ctx.fillRect(gl + 1, gt, GLASS_W - 2, gh - 1);
    const level = Math.round((gh - 3) * full);
    if (level > 0) {
      ctx.fillStyle = '#fcfcff'; ctx.fillRect(gl + 1, gt + gh - 1 - level, GLASS_W - 2, level);
      ctx.fillStyle = '#d6e0f6'; ctx.fillRect(gl + GLASS_W - 4, gt + gh - 1 - level, 2, level);
      if (full < 1 && Math.floor(age * 12) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(gl + 3, gt + gh - 2 - level, GLASS_W - 6, 1); }   // it sloshes while it fills
    }
    ctx.fillStyle = '#bcd6f4';
    ctx.fillRect(gl, gt, 1, gh); ctx.fillRect(gl + GLASS_W - 1, gt, 1, gh); ctx.fillRect(gl, gt + gh - 1, GLASS_W, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(gl + 2, gt + 2, 1, Math.max(1, gh - 8));
  }
  if (age < MILK.squirts[0] - 0.12) return;

  // where the milk comes from (two of them, a little pink)
  const tips = [[px + Math.round(pw * 0.6), py + Math.round(ph * 0.53)], [px + Math.round(pw * 0.7), py + Math.round(ph * 0.55)]];
  for (const [nx, ny] of tips) { ctx.fillStyle = '#ff8fb0'; ctx.fillRect(nx - 1, ny - 1, 3, 3); ctx.fillStyle = '#e0507c'; ctx.fillRect(nx, ny, 1, 1); }

  // the squirts: each one an arc from the penguin to the glass
  const mouthY = gt + 1;
  for (const at of MILK.squirts) {
    const a = (age - at) / FLY;
    if (a < 0 || a > 1.9) continue;
    tips.forEach(([nx, ny], k) => {
      const tx = gx - 2 + k * 3, lift = 13 + k * 4;
      const from = clamp(a - 0.9, 0, 1), to = clamp(a, 0, 1);                // the part of the arc that is milk right now: it stays joined to the penguin until the squirt is over
      if (to <= from) return;
      for (let i = 0; i <= 26; i++) {
        const t = from + ((to - from) * i) / 26;
        const x = nx + (tx - nx) * t, y = ny + (mouthY - ny) * t - lift * 4 * t * (1 - t);
        ctx.fillStyle = '#9fb6ee'; ctx.fillRect(Math.round(x), Math.round(y) + 1, 2, 2);     // (an edge, so it shows against the white belly)
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    });
    if (a > 1 && a < 1.6) {                                                    // it lands with a splash
      const s = (a - 1) / 0.6;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(gx + (i - 1.5) * (3 + s * 5)), Math.round(mouthY - 2 - Math.sin(s * Math.PI) * (4 + (i % 2) * 3)), 1, 1);
    }
  }
  // full: a twinkle over the glass
  if (age >= MILK.done && age < MILK.done + 1.2) {
    const k = (age - MILK.done) / 1.2, r = Math.round(2 + 4 * Math.sin(k * Math.PI));
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(gx - r, gt - 7, r * 2 + 1, 1); ctx.fillRect(gx, gt - 7 - r, 1, r * 2 + 1);
  }
}
