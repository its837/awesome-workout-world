// Shared furniture for the menu screens: the snowy scene drifting behind them, and
// the title bar with its always-in-the-same-place back button.
import { W, H } from './config.js';
import { drawText } from './font.js';
import { button } from './ui.js';
import { World } from './world.js';
import { Snow } from './snow.js';
import { envAt } from './env.js';

export class Backdrop {
  constructor(kind) {
    this.t = 0;
    this.snow = new Snow(140);
    this.set(kind);
  }
  set(kind) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.world = new World({ mode: kind, attract: true, seed: 7 });
    this.world.z = 1540;   // start in the village: cabins and lights
  }
  update(dt) {
    this.t += dt;
    this.world.spirit = 0.75;
    this.world.update(dt, 2.4, 0.015, 0.95, this.t);
    this.snow.update(dt, 2.4, this.world.lean || 0);
  }
  draw(ctx, dim = 0.4) {
    const env = envAt(0.14);
    this.world.render(ctx, env, this.t, null);
    this.snow.draw(ctx, env);
    ctx.fillStyle = `rgba(4,8,30,${dim})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Title bar. Returns true when the back button was tapped. */
export function header(ctx, input, title, backLabel) {
  drawText(ctx, title, W / 2, 10, { scale: 3, align: 'center' });
  return button(ctx, input, 8, 8, 96, 24, `◀ ${backLabel}`, { kind: 'ghost' });
}

export { W, H };
