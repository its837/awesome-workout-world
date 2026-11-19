// Everything behind the trail: dithered sky, stars, moon, aurora, mountains, far treeline.
import { W, HORIZON } from './config.js';
import { clamp, hash, hash2, noise1, mix3, makeCanvas, rng, TAU } from './util.js';
import { glowCanvas } from './sprites.js';

const PAD_TOP = 120;
const PAD_BOT = 130;
const BANDS = 30;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const MW = 960;   // mountain strip width (tiles horizontally)
const MH = 100;
const HW = 960;   // forested hills strip
const HH = 44;
const TH = 22;    // far treeline strip height
const STAR_LAYERS = 4, STAR_TOP = 86, STAR_H = 204;   // the starfield is four pictures that twinkle out of step
const AW = Math.ceil(W / 3), AH = 104, A_TOP = 172;   // the aurora is painted small (one pixel per 3-pixel curtain) and stretched
const pack = (c) => (0xff000000 | (Math.min(255, c[2] | 0) << 16) | (Math.min(255, c[1] | 0) << 8) | Math.min(255, c[0] | 0)) >>> 0;

function mod(a, n) { return ((a % n) + n) % n; }

export class Sky {
  constructor(mode) {
    this.mode = mode;
    this.step = -1;
    this.grad = makeCanvas(W, PAD_TOP + HORIZON + PAD_BOT);
    this.mount = makeCanvas(MW, MH);
    this.hills = makeCanvas(HW, HH);
    this.trees = makeCanvas(W, TH);
    const R = rng(mode === 'tread' ? 77 : 42);
    // Stars: drawn once into a few layers, each fading in and out on its own beat.
    this.starLayers = [];
    for (let k = 0; k < STAR_LAYERS; k++) this.starLayers.push(makeCanvas(W, STAR_H));
    for (let i = 0; i < 150; i++) {
      const x = Math.round(R() * W), y = Math.round(-PAD_TOP * 0.7 + R() * (HORIZON + PAD_TOP * 0.7 - 16)), b = 0.35 + R() * 0.65, ph = R() * TAU, big = R() < 0.07;
      const g = this.starLayers[Math.min(STAR_LAYERS - 1, Math.floor((ph / TAU) * STAR_LAYERS))].getContext('2d');
      g.fillStyle = `rgba(226,236,255,${b.toFixed(3)})`;
      g.fillRect(x, y + STAR_TOP, 1, 1);
      if (big) { g.fillRect(x - 1, y + STAR_TOP, 3, 1); g.fillRect(x, y + STAR_TOP - 1, 1, 3); }
    }
    this.auCan = makeCanvas(AW, AH);
    this.auCtx = this.auCan.getContext('2d');
    this.auImg = this.auCtx.createImageData(AW, AH);
    this.auTick = 0;
    this._shapes();
    this.moon = this._makeMoon();
    this.sleigh = this._makeSleigh();
    this.sleighAt = 38; // first fly-by, seconds
    this.noSleigh = false; this.noAurora = false;   // set by a ride until their advent doors are open
  }

  _makeMoon() {
    const r = 17, c = makeCanvas(r * 2, r * 2), g = c.getContext('2d');
    const img = g.createImageData(r * 2, r * 2);
    const craters = [[-6, -5, 4], [5, 3, 5], [-3, 7, 3], [7, -7, 2.5], [0, -1, 2]];
    for (let y = 0; y < r * 2; y++) {
      for (let x = 0; x < r * 2; x++) {
        const dx = x + 0.5 - r, dy = y + 0.5 - r;
        if (dx * dx + dy * dy > r * r) continue;
        let col = [250, 246, 226];
        if (dx * 0.7 - dy > 13) col = [255, 252, 240];
        if (dx * 0.7 - dy < -12) col = [222, 220, 214];
        for (const [cx, cy, cr] of craters) if ((dx - cx) ** 2 + (dy - cy) ** 2 < cr * cr) col = [214, 214, 216];
        const o = (y * r * 2 + x) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  _makeSleigh() {
    // Tiny silhouette: three reindeer pulling a sleigh, one red nose out front.
    const c = makeCanvas(46, 12), g = c.getContext('2d');
    g.fillStyle = '#141a3c';
    const deer = (x, y) => {
      g.fillRect(x, y + 3, 6, 2); g.fillRect(x + 5, y + 1, 2, 3); g.fillRect(x + 6, y, 2, 2);
      g.fillRect(x, y + 5, 1, 3); g.fillRect(x + 4, y + 5, 1, 3); g.fillRect(x + 6, y - 1, 1, 1); g.fillRect(x + 8, y - 1, 1, 1);
    };
    deer(34, 2); deer(25, 3); deer(16, 2);
    g.fillRect(8, 6, 26, 1);           // reins
    g.fillRect(1, 5, 9, 4); g.fillRect(0, 3, 2, 3); g.fillRect(0, 10, 11, 1); g.fillRect(2, 9, 1, 1); g.fillRect(8, 9, 1, 1);
    g.fillRect(3, 2, 3, 3);            // Santa
    g.fillStyle = '#d8343a'; g.fillRect(3, 1, 3, 1);
    g.fillStyle = '#ff4638'; g.fillRect(42, 2, 1, 1);
    return c;
  }

  /**
   * Work out once which pixels of the mountain and hill strips are snow, rock, forest and so
   * on. Recolouring them for a new time of day is then a quick table lookup.
   */
  _shapes() {
    const peak = this.mode === 'tread';
    {
      const cls = this.mClass = new Uint8Array(MW * MH);
      const k = TAU / MW;
      const hgt = (x) => {
        let v = 0.36 + 0.17 * Math.sin(k * 2 * x + 1.0) + 0.13 * Math.sin(k * 5 * x + 2.2)
          + 0.14 * Math.abs(Math.sin(k * 3.5 * x + 0.5)) + 0.05 * Math.sin(k * 17 * x + 4) + 0.025 * Math.sin(k * 41 * x);
        if (peak) { const d = (x - MW / 2) / 88; v = v * 0.55 + 0.44 * Math.exp(-d * d) + 0.1 * Math.exp(-(((x - MW / 2 - 78) / 42) ** 2)); }
        return clamp(v, 0.05, 0.98);
      };
      for (let x = 0; x < MW; x++) {
        const top = Math.round((1 - hgt(x)) * MH);
        const facing = hgt(x + 2) - hgt(x - 2) < 0; // light comes from the right
        const snowDepth = 12 + 14 * noise1(x * 0.07, 5) + (peak ? 16 * Math.exp(-(((x - MW / 2) / 130) ** 2)) : 0);
        for (let y = top; y < MH; y++) {
          const d = y - top;
          const edge = snowDepth + 5 * Math.sin(x * 0.55 + y * 0.3) + (hash2(x, y) < 0.3 ? 2 : 0);
          const snow = d < edge, litSide = facing || d < 2;
          cls[y * MW + x] = snow ? (litSide ? 1 : 2) : (litSide ? 3 : 4);
        }
      }
    }
    {
      const cls = this.hClass = new Uint8Array(HW * HH);
      const k = TAU / HW;
      for (let x = 0; x < HW; x++) {
        const v = 0.45 + 0.25 * Math.sin(k * 3 * x + 0.3) + 0.14 * Math.sin(k * 7 * x + 1.9) + 0.08 * Math.sin(k * 16 * x + 5);
        const spike = ((x * 7) % 5 === 0 ? 3 : 0) + (hash(x * 13) < 0.4 ? 2 : 0);
        const top = Math.round((1 - clamp(v, 0.05, 0.95)) * HH) - spike;
        for (let y = Math.max(0, top); y < HH; y++) {
          const d = y - top;
          let c = (x + y) % 3 === 0 ? 2 : 1;
          if (d < 3 && hash2(x, y) < 0.45) c = 3;
          else if (hash2(x * 3, y * 5) < 0.07) c = 3;
          cls[y * HW + x] = c;
        }
      }
    }
  }

  _paint(canvas, cls, colours) {
    const g = canvas.getContext('2d');
    const img = g.createImageData(canvas.width, canvas.height);
    const px = new Uint32Array(img.data.buffer);
    const table = [0].concat(colours.map(pack));
    for (let i = 0; i < cls.length; i++) px[i] = table[cls[i]];
    g.putImageData(img, 0, 0);
  }

  rebuild(env) {
    this.step = env.step;
    const fog = env.fog, A = env.amb;
    const lit = (c) => [c[0] * A[0], c[1] * A[1], c[2] * A[2]];

    // --- dithered sky gradient: the dither repeats every 4 pixels, so paint one 4-wide strip and tile it ---
    {
      const h = this.grad.height, g = this.grad.getContext('2d');
      const strip = this.strip || (this.strip = makeCanvas(4, h));
      const sg = strip.getContext('2d');
      const img = sg.createImageData(4, h);
      const ramp = [];
      for (let i = 0; i <= BANDS; i++) {
        const t = i / BANDS;
        ramp.push(t < 0.5 ? mix3(env.top, env.mid, t / 0.5) : t < 0.86 ? mix3(env.mid, env.low, (t - 0.5) / 0.36) : mix3(env.low, fog, (t - 0.86) / 0.14));
      }
      const y0 = PAD_TOP * 0.45, span = PAD_TOP + HORIZON - y0;
      for (let y = 0; y < h; y++) {
        const t = clamp((y - y0) / span, 0, 1);
        for (let x = 0; x < 4; x++) {
          const q = Math.min(BANDS, Math.floor(t * BANDS + BAYER[(y & 3) * 4 + x] / 16));
          const c = ramp[q], o = (y * 4 + x) * 4;
          img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
        }
      }
      sg.putImageData(img, 0, 0);
      g.fillStyle = g.createPattern(strip, 'repeat');
      g.fillRect(0, 0, W, h);
    }

    // --- far mountains, then the nearer forested hills ---
    this._paint(this.mount, this.mClass, [
      mix3(mix3(lit([244, 248, 255]), [env.low[0] * 1.05, env.low[1] * 0.92, env.low[2] * 0.9], env.alpen * 0.75), fog, 0.45),
      mix3(lit([170, 190, 230]), fog, 0.6),
      mix3(lit([120, 132, 168]), fog, 0.62),
      mix3(lit([84, 96, 136]), fog, 0.66),
    ]);
    this._paint(this.hills, this.hClass, [mix3(lit([40, 78, 84]), fog, 0.6), mix3(lit([26, 56, 66]), fog, 0.56), mix3(lit([210, 226, 250]), fog, 0.5)]);

    // --- far treeline hugging the horizon ---
    {
      const g = this.trees.getContext('2d');
      g.clearRect(0, 0, W, TH);
      const body = mix3(lit([30, 70, 62]), fog, 0.5);
      const tip = mix3(lit([226, 238, 255]), fog, 0.4);
      const R = rng(9);
      g.fillStyle = `rgb(${body[0] | 0},${body[1] | 0},${body[2] | 0})`;
      g.fillRect(0, TH - 5, W, 5);
      const tips = [];
      for (let x = -4; x < W + 4;) {
        const hw = 2 + ((R() * 3) | 0), h = 7 + ((R() * 11) | 0);
        for (let i = 0; i < h; i++) {
          const w = Math.max(1, Math.round((hw * 2 + 1) * ((i + 1) / h)));
          g.fillRect(Math.round(x - w / 2), TH - 5 - h + i, w, 1);
        }
        tips.push([x, TH - 5 - h]);
        x += 3 + ((R() * 6) | 0);
      }
      g.fillStyle = `rgb(${tip[0] | 0},${tip[1] | 0},${tip[2] | 0})`;
      for (const [tx, ty] of tips) g.fillRect(Math.round(tx - 0.5), ty, 1, 2);
    }
  }

  /**
   * hy: screen row where the ground meets the sky. scroll: horizontal parallax in px.
   * spirit 0..1 brightens the aurora.
   */
  draw(ctx, env, time, hy, scroll, spirit) {
    if (env.step !== this.step) this.rebuild(env);
    hy = Math.round(hy);
    ctx.drawImage(this.grad, 0, hy - HORIZON - PAD_TOP);

    // stars
    if (env.stars > 0.02) {
      const x0 = -Math.round(mod(scroll * 0.06, W)), y0 = hy - HORIZON - STAR_TOP;
      for (let k = 0; k < STAR_LAYERS; k++) {
        ctx.globalAlpha = env.stars * (0.72 + 0.28 * Math.sin(time * 1.7 + ((k + 0.5) / STAR_LAYERS) * TAU));
        ctx.drawImage(this.starLayers[k], x0, y0);
        if (x0 < 0) ctx.drawImage(this.starLayers[k], x0 + W, y0);
      }
      ctx.globalAlpha = 1;
    }

    // moon (+ the occasional visitor)
    const mx = Math.round(W * 0.665 + 12 * Math.sin(scroll * 0.002)), my = hy - 92;
    if (env.moon > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.34 * env.moon;
      ctx.drawImage(glowCanvas([170, 196, 255]), mx - 62, my - 62, 124, 124);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = env.moon;
      ctx.drawImage(this.moon, mx - 17, my - 17);
      ctx.globalAlpha = 1;
      const st = time - this.sleighAt;
      if (this.noSleigh) this.sleighAt = Math.max(this.sleighAt, time + 20);
      else if (st > 0 && st < 16) {
        const sx = Math.round(mx - 150 + st * 19), sy = Math.round(my - 6 + Math.sin(st * 0.9) * 5 - st * 0.7);
        ctx.drawImage(this.sleigh, sx, sy);
      } else if (st >= 16) this.sleighAt = time + 150 + hash(Math.floor(time)) * 120;
    }

    // aurora curtains: repainted a few times a second into a small picture, then laid over the sky
    const au = this.noAurora ? 0 : env.aurora * (0.3 + 0.7 * spirit);
    if (au > 0.02) {
      if (this.auTick-- <= 0) { this.auTick = 2; this._aurora(au, time, scroll); }
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.auCan, 0, 0, AW, AH, 0, hy - A_TOP, AW * 3, AH);
      ctx.globalCompositeOperation = 'source-over';
    }

    // sunrise
    if (env.sun > 0.02) {
      const sx = Math.round(W * 0.34), sy = Math.round(hy - 6 - env.sun * 26);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * env.sun;
      ctx.drawImage(glowCanvas([255, 214, 140]), sx - 120, sy - 120, 240, 240);
      ctx.globalAlpha = env.sun;
      ctx.drawImage(glowCanvas([255, 244, 214]), sx - 22, sy - 22, 44, 44);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // mountains, hills, treeline (each tiles and scrolls at its own rate)
    const farRate = this.mode === 'tread' ? 0.05 : 0.22;
    this._tile(ctx, this.mount, MW, -scroll * farRate + (W - MW) / 2, hy - MH + 8);
    this._tile(ctx, this.hills, HW, -scroll * 0.5, hy - HH + 6);
    this._tile(ctx, this.trees, W, -scroll * 0.9, hy - TH + 3);
  }

  _aurora(au, time, scroll) {
    const d = this.auImg.data;
    new Uint32Array(d.buffer).fill(0xff000000);
    // each band adds light; (r, g, b) is the colour already multiplied by its strength
    const band = (i, ya, yb, r, g, b) => {
      ya = Math.max(0, Math.round(ya)); yb = Math.min(AH, Math.round(yb));
      for (let y = ya; y < yb; y++) { const o = (y * AW + i) * 4; d[o] += r; d[o + 1] += g; d[o + 2] += b; }
    };
    for (let i = 0; i < AW; i++) {
      const wx = i * 3 + scroll * 0.05;
      const env1 = Math.max(0, Math.sin(wx * 0.0085 + time * 0.05 + 1) * 0.6 + 0.4 + 0.3 * Math.sin(wx * 0.021 - time * 0.03));
      if (env1 <= 0.03) continue;
      const ray = 0.55 + 0.45 * noise1(wx * 0.11 + time * 0.22, 3);
      const a = au * env1 * ray;
      const base = A_TOP - 92 + 14 * Math.sin(wx * 0.017 + time * 0.09) + 8 * Math.sin(wx * 0.043 - time * 0.06);
      const h = 34 + 22 * noise1(wx * 0.05 - time * 0.1, 8);
      let k = a * 0.07; band(i, base - h, base - h + h * 0.45, 170 * k, 70 * k, 210 * k);
      k = a * 0.1; band(i, base - h * 0.6, base - h * 0.6 + h * 0.4, 60 * k, 210 * k, 190 * k);
      k = a * 0.17; band(i, base - h * 0.24, base, 90 * k, 255 * k, 150 * k);
    }
    this.auCtx.putImageData(this.auImg, 0, 0);
  }

  _tile(ctx, canvas, tw, offset, y) {
    let x = Math.round(mod(offset, tw)) - tw;
    y = Math.round(y);
    for (; x < W; x += tw) ctx.drawImage(canvas, x, y);
  }
}
