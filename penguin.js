// The penguin filling a glass with milk, on its own: the very same picture and timing as the
// advent door in the game (play/src/rewards.js draws the penguin, play/src/milk.js the glass and
// the squirts), looped, on a transparent canvas.
import { rewardIcon } from './play/src/rewards.js';
import { MILK, MILK_SHIFT, milkShift, drawMilking } from './play/src/milk.js';

const cv = document.getElementById('penguin');
if (cv) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.imageSmoothingEnabled = false;
  const icon = rewardIcon('penguin', 84, 66), loop = MILK.done + 2.6;
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const draw = (age) => {
    ctx.clearRect(0, 0, W, H);
    const floor = H - 12, cx = Math.round(W / 2) - 6;
    ctx.fillStyle = '#e9f0ff'; ctx.fillRect(6, floor, W - 12, 3);          // snow to stand on
    ctx.fillStyle = '#c3cfee'; ctx.fillRect(9, floor + 3, W - 18, 2);
    const bob = age > MILK.shuffle + 0.5 ? 0 : Math.round(Math.sin(age * 5) * 1);
    const x = Math.round(cx - icon.width / 2 - milkShift(age) * MILK_SHIFT), y = floor - icon.height + 3 - bob;
    ctx.drawImage(icon, x, y);
    drawMilking(ctx, [x, y, icon.width, icon.height], cx + 28, floor + 2, age);
  };
  if (still) draw(MILK.done + 0.3);
  else { const frame = (now) => { draw(((now - t0) / 1000) % loop); requestAnimationFrame(frame); }; requestAnimationFrame(frame); }
}
