// The look of the tablet's home page (Awesome Workout World): a 1990s home page that wishes it was the
// 1980s. A twinkling star background, a neon grid floor, flaming text, rainbow rules, a
// scrolling marquee, a hit counter, and a rainbow explosion wherever you touch.
// Nothing here knows about riding: the game has its own look (chrome.js).
import { W, H } from './config.js';
import { hash, makeCanvas, clamp } from './util.js';
import { drawText, textWidth, GLYPH_H } from './font.js';

/** A fully saturated colour from an angle round the rainbow. */
export const hue = (h, light = 60) => `hsl(${Math.round(((h % 360) + 360) % 360)},100%,${light}%)`;

export class Retro {
  constructor() {
    this.t = 0;
    this.parts = [];
    this.rings = [];
    this.stars = [...Array(120)].map((_, i) => ({
      x: hash(i * 3 + 1), y: hash(i * 7 + 2), ph: hash(i * 11 + 3) * 6.28, sp: 0.8 + hash(i * 13 + 4) * 3,
      c: i % 9 === 0 ? '#ff7bd5' : i % 7 === 0 ? '#7df9ff' : i % 5 === 0 ? '#fff23f' : '#ffffff', big: i % 15 === 0,
    }));
    this.grid = null;
    this.comet = null;
    this.nextComet = 3;
  }

  update(dt) {
    this.t += dt;
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; p.vx *= 1 - 0.8 * dt; p.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < 0.7);
    if (this.comet) { this.comet.x += this.comet.vx * dt; this.comet.y += this.comet.vy * dt; if (this.comet.x > W + 40 || this.comet.y > H) this.comet = null; }
    else if (this.t > this.nextComet) { this.comet = { x: -20, y: 10 + Math.random() * 60, vx: 240 + Math.random() * 120, vy: 30 + Math.random() * 40 }; this.nextComet = this.t + 5 + Math.random() * 9; }
  }

  /** The page background. floorY: where the neon grid floor starts (leave out for stars only). */
  back(ctx, floorY) {
    ctx.fillStyle = '#07020f';
    ctx.fillRect(0, 0, W, H);
    // a faint purple haze low in the sky
    for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(90,20,140,${0.035 * (k + 1)})`; ctx.fillRect(0, Math.round((floorY || H) - 60 + k * 10), W, 10); }
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(this.t * s.sp + s.ph));
      const x = Math.round(s.x * W), y = Math.round(s.y * (floorY || H));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.c;
      ctx.fillRect(x, y, 1, 1);
      if (s.big && a > 0.75) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    ctx.globalAlpha = 1;
    if (this.comet) {
      const c = this.comet;
      for (let k = 0; k < 14; k++) { ctx.fillStyle = hue(k * 26 + this.t * 200, 70); ctx.globalAlpha = 1 - k / 14; ctx.fillRect(Math.round(c.x - k * 3), Math.round(c.y - k * 0.5), 2, 2); }
      ctx.globalAlpha = 1;
    }
    if (floorY) this._floor(ctx, floorY);
  }

  /** The neon grid floor, rolling toward you. */
  _floor(ctx, y0) {
    const h = H - y0;
    if (h < 8) return;
    if (!this.grid || this.grid.height !== h) {
      // the lines that run away to the horizon never change: draw them once
      this.grid = makeCanvas(W, h);
      const g = this.grid.getContext('2d');
      for (let j = -14; j <= 14; j++) {
        for (let y = 0; y < h; y++) {
          const f = y / h;
          g.fillStyle = `rgba(255,63,208,${0.18 + 0.5 * f})`;
          g.fillRect(Math.round(W / 2 + j * 56 * (0.08 + f * 1.6)), y, 1, 1);
        }
      }
    }
    ctx.fillStyle = '#0b0220';
    ctx.fillRect(0, y0, W, h);
    ctx.drawImage(this.grid, 0, y0);
    const n = 9, slide = (this.t * 0.45) % 1;
    for (let k = 0; k < n; k++) {
      const f = ((k + slide) / n) ** 2;
      ctx.fillStyle = `rgba(63,240,255,${0.15 + 0.6 * f})`;
      ctx.fillRect(0, Math.round(y0 + f * h), W, 1);
    }
    ctx.fillStyle = '#ff3fd0';
    ctx.fillRect(0, y0, W, 1);
  }

  /** A rainbow explosion at a point (in the 640-wide picture). */
  burst(x, y) {
    const base = Math.random() * 360;
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * 6.283 + Math.random() * 0.2, v = 50 + Math.random() * 150;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.7, max: 1.2, h: base + (i / 46) * 360, s: Math.random() < 0.3 ? 3 : 2 });
    }
    this.rings.push({ x, y, t: 0, h: base });
    if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
  }

  /** The explosions, drawn over everything else on the page. */
  front(ctx) {
    for (const r of this.rings) {
      const rad = 6 + r.t * 110, n = Math.max(16, Math.round(rad * 0.9));
      ctx.globalAlpha = clamp(1 - r.t / 0.7, 0, 1);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 6.283;
        ctx.fillStyle = hue(r.h + (k / n) * 360, 62);
        ctx.fillRect(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad * 0.9), 2, 2);
        if (r.t > 0.12) ctx.fillRect(Math.round(r.x + Math.cos(a + 0.1) * rad * 0.62), Math.round(r.y + Math.sin(a + 0.1) * rad * 0.56), 1, 1);
      }
    }
    for (const p of this.parts) {
      ctx.globalAlpha = clamp(p.life / 0.4, 0, 1);
      ctx.fillStyle = hue(p.h + this.t * 240, 62);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }
}

/** A horizontal rule made of rainbow blocks that march along. */
export function rule(ctx, x, y, w, t, h = 3) {
  const seg = 8, off = Math.floor(t * 14);
  for (let i = 0; i * seg < w; i++) {
    ctx.fillStyle = hue((i - off) * 24, 58);
    ctx.fillRect(x + i * seg, y, Math.min(seg, w - i * seg), h);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, w, 1);
}

/** Text with every letter its own colour, cycling. */
export function rainbowText(ctx, text, cx, y, t, scale = 1) {
  text = String(text).toUpperCase();
  let x = Math.round(cx - textWidth(text, scale) / 2);
  [...text].forEach((ch, i) => { x += drawText(ctx, ch, x, y + Math.round(Math.sin(t * 5 + i * 0.6) * 1.5), { scale, color: hue(i * 28 - t * 160, 66), shadow: 'rgba(0,0,0,0.8)' }) + scale; });
}

/** A line of text that scrolls along a strip, right to left, for ever. */
export function marquee(ctx, text, y, t, speed = 46) {
  const w = textWidth(text) + 60;
  ctx.fillStyle = '#12063a';
  ctx.fillRect(0, y - 3, W, 13);
  ctx.fillStyle = '#ff3fd0';
  ctx.fillRect(0, y - 3, W, 1);
  let x = -((t * speed) % w);
  for (; x < W; x += w) drawText(ctx, text, Math.round(x), y, { color: '#fff23f', shadow: 'rgba(0,0,0,0.6)' });
}

/** An old web page's hit counter: white-on-black digits in a row of little windows. */
export function counter(ctx, x, y, value, digits = 10) {
  const text = String(Math.max(0, Math.floor(value))).padStart(digits, '0').slice(-digits);
  ctx.fillStyle = '#5a5a66';
  ctx.fillRect(x - 2, y - 2, digits * 10 + 3, 15);
  [...text].forEach((ch, i) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + i * 10, y, 9, 11);
    drawText(ctx, ch, x + i * 10 + 2, y + 2, { color: '#7dff3f', shadow: null });
  });
  return digits * 10;
}

/**
 * Flaming text: the letters are the fuel, and the fire climbs off the top of them.
 * (The old "doom fire": every pixel takes the heat of the one below, less a bit, with a
 * little sideways drift.)
 */
export class Fire {
  /** lines: one string, or [{ text, scale }, ...] stacked and centred, each its own size. */
  constructor(lines, scale = 6, rise = 26, gap = 5) {
    this.lines = (Array.isArray(lines) ? lines : [{ text: lines, scale }]).map((l) => ({ text: String(l.text).toUpperCase(), scale: l.scale || scale }));
    this.rise = rise;
    this.w = Math.max(...this.lines.map((l) => textWidth(l.text, l.scale))) + 16;
    let down = 0;
    for (const l of this.lines) { l.x = Math.round((this.w - textWidth(l.text, l.scale)) / 2); l.y = down; l.h = GLYPH_H * l.scale; down += l.h + gap; }
    this.h = down - gap + rise + 2;
    this.heat = new Uint8Array(this.w * this.h);
    this.acc = 0;
    // where the letters are
    const m = makeCanvas(this.w, this.h), g = m.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (const l of this.lines) drawText(g, l.text, l.x, rise + l.y, { scale: l.scale, color: '#ffffff', shadow: null });
    const d = g.getImageData(0, 0, this.w, this.h).data;
    this.mask = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.mask.length; i++) this.mask[i] = d[i * 4 + 3] > 128 ? 1 : 0;
    this.can = makeCanvas(this.w, this.h);
    this.ctx = this.can.getContext('2d');
    this.img = this.ctx.createImageData(this.w, this.h);
    // black -> deep red -> orange -> yellow -> white, fading in from nothing
    this.pal = new Uint8Array(256 * 4);
    for (let v = 0; v < 256; v++) {
      const f = v / 255;
      this.pal[v * 4] = Math.min(255, Math.round(60 + f * 520));
      this.pal[v * 4 + 1] = Math.min(255, Math.round(Math.max(0, f - 0.28) * 430));
      this.pal[v * 4 + 2] = Math.min(255, Math.round(Math.max(0, f - 0.78) * 900));
      this.pal[v * 4 + 3] = Math.min(255, Math.round(Math.max(0, f - 0.06) * 620));
    }
    this.seed = 12345;
  }
  _rnd() { let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.seed = s >>> 0; return this.seed; }

  update(dt) {
    this.acc += dt;
    let steps = 0;
    while (this.acc > 1 / 26 && steps++ < 3) { this.acc -= 1 / 26; this._step(); }
    if (this.acc > 0.2) this.acc = 0;
  }
  _step() {
    const w = this.w, h = this.h, heat = this.heat, mask = this.mask;
    for (let y = 0; y < h - 1; y++) {
      const row = y * w, below = row + w;
      for (let x = 0; x < w; x++) {
        const r = this._rnd();
        const sx = clamp(x + ((r & 3) - 1), 0, w - 1);
        const v = heat[below + sx] - ((r >>> 4) % 19);
        heat[row + x] = v > 0 ? v : 0;
      }
    }
    for (let i = 0; i < heat.length; i++) if (mask[i]) heat[i] = 170 + (this._rnd() % 86);
  }

  /** Draw it with the top of the letters at y, centred on cx. */
  draw(ctx, cx, y) {
    const d = this.img.data, heat = this.heat, pal = this.pal;
    for (let i = 0; i < heat.length; i++) { const v = heat[i] * 4, o = i * 4; d[o] = pal[v]; d[o + 1] = pal[v + 1]; d[o + 2] = pal[v + 2]; d[o + 3] = pal[v + 3]; }
    this.ctx.putImageData(this.img, 0, 0);
    const x = Math.round(cx - this.w / 2), top = Math.round(y - this.rise);
    ctx.drawImage(this.can, x, top);
    // the letters themselves, white-hot at the top and orange at the foot, with a scorched edge
    for (const l of this.lines) {
      const lx = x + l.x, ly = y + l.y, half = Math.round(l.h * 0.5);
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, 1], [2, 2]]) drawText(ctx, l.text, lx + ox, ly + oy, { scale: l.scale, color: '#6a0d00', shadow: null });
      ctx.save();
      ctx.beginPath(); ctx.rect(x, ly, this.w, half); ctx.clip();
      drawText(ctx, l.text, lx, ly, { scale: l.scale, color: '#fff7c2', shadow: null });
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(x, ly + half, this.w, l.h); ctx.clip();
      drawText(ctx, l.text, lx, ly, { scale: l.scale, color: '#ffb02e', shadow: null });
      ctx.restore();
    }
    ctx.globalAlpha = 0.22;
    ctx.drawImage(this.can, x, top);       // a lick of flame over the letters too
    ctx.globalAlpha = 1;
  }
}
