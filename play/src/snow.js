// Falling snow in screen space. When you move, flakes stream outward from the
// vanishing point, which sells forward motion better than anything else on screen.
import { W, H, HORIZON } from './config.js';
import { D } from './detail.js';

const GROUPS = 5;     // flakes come in five depths; each depth is drawn in one go
const MAX = 600;

export class Snow {
  /** count: a fixed number of flakes, or 0 to follow the picture-detail setting. */
  constructor(count = 0) {
    this.flakes = [];
    this.t = 0;
    this.heavy = false;
    this.disco = false;      // DISCO SNOW (an advent thing): every flake a different colour, and they keep changing
    this.count = count;
    for (let i = 0; i < MAX; i++) {
      // depth: 1 = close to the camera. Flake i always belongs to group i % GROUPS.
      const f = { d: 0.25 + (((i % GROUPS) + Math.random()) / GROUPS) * 0.75 };
      this.flakes.push(this._spawn(f, true));
    }
  }
  get n() { return Math.min(MAX, (this.count || D.snow) * (this.heavy || this.disco ? 2 : 1)); }
  _spawn(f, anywhere) {
    f.x = Math.random() * W;
    f.y = anywhere ? Math.random() * H : -4;
    f.ph = Math.random() * 6.28;
    return f;
  }
  /** speed in m/s, lean roughly -1..1 (current curve direction). */
  update(dt, speed, lean) {
    this.t += dt;
    const n = this.n;
    const push = Math.min(speed, 16) * 0.05;
    for (let i = 0; i < n; i++) {
      const f = this.flakes[i], k = f.d;
      f.y += (12 + 30 * k) * dt;
      f.x += (Math.sin(this.t * 1.1 + f.ph) * 7 - 5 - lean * speed * 2.4) * k * dt;
      f.x += (f.x - W / 2) * push * k * dt;
      f.y += (f.y - HORIZON) * push * k * dt;
      if (f.y > H + 3 || f.x < -6 || f.x > W + 6) {
        this._spawn(f, false);
        if (speed > 3 && Math.random() < 0.6) { f.x = W / 2 + (Math.random() - 0.5) * W * 0.9; f.y = Math.random() * H * 0.6; }
      }
    }
  }
  draw(ctx, env) {
    const n = this.n;
    const b = 0.55 + 0.45 * (1 - env.night);
    const r = (200 + 55 * b) | 0, g = (214 + 41 * b) | 0;
    for (let k = 0; k < GROUPS; k++) {
      const depth = 0.25 + ((k + 0.5) / GROUPS) * 0.75;
      const s = depth > 0.78 ? 2 : 1;
      if (this.disco) {
        // six colours to a depth, marching round the rainbow
        for (let c = 0; c < 6; c++) {
          ctx.fillStyle = `hsla(${Math.round((c * 60 + k * 23 + this.t * 140) % 360)},100%,66%,${(0.55 + 0.45 * depth).toFixed(2)})`;
          for (let i = k + c * GROUPS; i < n; i += GROUPS * 6) { const f = this.flakes[i]; ctx.fillRect(f.x | 0, f.y | 0, s + 1, s + 1); }
        }
        continue;
      }
      ctx.fillStyle = `rgba(${r},${g},255,${(0.35 + 0.6 * depth).toFixed(2)})`;
      for (let i = k; i < n; i += GROUPS) {
        const f = this.flakes[i];
        ctx.fillRect(f.x | 0, f.y | 0, s, s);
      }
    }
  }
}
