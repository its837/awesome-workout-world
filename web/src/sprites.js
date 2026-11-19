// Procedural pixel art. Nothing here is loaded from image files: every sprite is
// described in metres with simple shapes and rasterised on demand at whatever
// resolution the camera needs (a "mip level"), so trees stay crisp near and far.
// Each cached copy is pre-tinted for the current time of day and distance haze.
import { clamp, rng, makeCanvas } from './util.js';
import { GLYPHS, GLYPH_H } from './font.js';

export const C = {
  snow: [246, 250, 255], snowS: [200, 218, 244], snowD: [164, 188, 228],
  g1: [66, 140, 92], g2: [42, 106, 72], g3: [24, 70, 54],
  trunk: [108, 76, 56], trunkD: [74, 52, 42],
  red: [216, 52, 58], redD: [158, 34, 50], white: [255, 255, 255],
  coal: [34, 34, 46], orange: [242, 142, 50],
  wood: [124, 86, 60], woodD: [88, 60, 46], log: [134, 92, 62], logD: [98, 66, 48],
  warm: [255, 214, 120], warmHi: [255, 242, 196], gold: [250, 202, 72],
  metal: [58, 62, 78], brick: [152, 74, 62],
  deer: [160, 112, 76], deerL: [210, 174, 134], deerD: [114, 78, 56],
  fur: [236, 244, 254], furS: [192, 208, 234], ice: [118, 164, 216],
  skin: [246, 204, 174], rosy: [240, 150, 140], green: [52, 160, 96],
};

export const LIGHT_COLS = [
  [255, 72, 62], [255, 204, 64], [84, 232, 112], [86, 156, 255], [255, 122, 222], [255, 232, 172],
];
export const LIGHT_CSS = LIGHT_COLS.map((c) => `rgb(${c[0]},${c[1]},${c[2]})`);
// each light twinkles between its full colour and this dimmer one
export const LIGHT_DIM_CSS = LIGHT_COLS.map((c) => `rgb(${(c[0] * 0.58) | 0},${(c[1] * 0.58) | 0},${(c[2] * 0.58) | 0})`);
const WARM = 5;

// ---------------------------------------------------------------------------
// Pix: a tiny software rasteriser working in metres, sampling at pixel centres.
// ---------------------------------------------------------------------------
export class Pix {
  constructor(uw, uh, s) {
    this.uw = uw; this.uh = uh; this.s = s;
    this.w = Math.max(1, Math.round(uw * s));
    this.h = Math.max(1, Math.round(uh * s));
    this.img = new ImageData(this.w, this.h);
    this.d = this.img.data;
    this.unlit = false; // unlit pixels ignore the ambient tint (windows, lights, pickups)
  }
  clear() { this.d.fill(0); }
  put(ix, iy, c) {
    const o = (iy * this.w + ix) * 4, d = this.d;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = this.unlit ? 254 : 255;
  }
  rect(x, y, w, h, c) {
    const s = this.s;
    let x0 = Math.round(x * s), x1 = Math.round((x + w) * s);
    let y0 = Math.round(y * s), y1 = Math.round((y + h) * s);
    if (x1 <= x0) x1 = x0 + 1;
    if (y1 <= y0) y1 = y0 + 1;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(this.w, x1); y1 = Math.min(this.h, y1);
    for (let iy = y0; iy < y1; iy++) for (let ix = x0; ix < x1; ix++) this.put(ix, iy, c);
  }
  ell(cx, cy, rx, ry, c) {
    const s = this.s;
    const x0 = Math.max(0, Math.floor((cx - rx) * s)), x1 = Math.min(this.w, Math.ceil((cx + rx) * s));
    const y0 = Math.max(0, Math.floor((cy - ry) * s)), y1 = Math.min(this.h, Math.ceil((cy + ry) * s));
    let any = false;
    for (let iy = y0; iy < y1; iy++) {
      const dy = ((iy + 0.5) / s - cy) / ry;
      for (let ix = x0; ix < x1; ix++) {
        const dx = ((ix + 0.5) / s - cx) / rx;
        if (dx * dx + dy * dy <= 1) { this.put(ix, iy, c); any = true; }
      }
    }
    if (!any) {
      const ix = Math.floor(cx * s), iy = Math.floor(cy * s);
      if (ix >= 0 && iy >= 0 && ix < this.w && iy < this.h) this.put(ix, iy, c);
    }
  }
  /** Filled polygon; pts is a flat [x0, y0, x1, y1, ...] list. */
  poly(pts, c) {
    const s = this.s, n = pts.length / 2;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, pts[i * 2]); maxX = Math.max(maxX, pts[i * 2]);
      minY = Math.min(minY, pts[i * 2 + 1]); maxY = Math.max(maxY, pts[i * 2 + 1]);
    }
    const x0 = Math.max(0, Math.floor(minX * s)), x1 = Math.min(this.w, Math.ceil(maxX * s));
    const y0 = Math.max(0, Math.floor(minY * s)), y1 = Math.min(this.h, Math.ceil(maxY * s));
    for (let iy = y0; iy < y1; iy++) {
      const py = (iy + 0.5) / s;
      for (let ix = x0; ix < x1; ix++) {
        const px = (ix + 0.5) / s;
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.put(ix, iy, c);
      }
    }
  }
  /** Thick line segment. */
  line(x1, y1, x2, y2, th, c) {
    const s = this.s;
    const half = Math.max(th / 2, 0.5 / s);
    const x0 = Math.max(0, Math.floor((Math.min(x1, x2) - half) * s)), xe = Math.min(this.w, Math.ceil((Math.max(x1, x2) + half) * s));
    const y0 = Math.max(0, Math.floor((Math.min(y1, y2) - half) * s)), ye = Math.min(this.h, Math.ceil((Math.max(y1, y2) + half) * s));
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1e-9;
    for (let iy = y0; iy < ye; iy++) {
      const py = (iy + 0.5) / s;
      for (let ix = x0; ix < xe; ix++) {
        const px = (ix + 0.5) / s;
        const t = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
        const ex = px - (x1 + dx * t), ey = py - (y1 + dy * t);
        if (ex * ex + ey * ey <= half * half) this.put(ix, iy, c);
      }
    }
  }
  /** Per-pixel shader over a box: shader(x, y) returns a colour or null. */
  fn(x, y, w, h, shader) {
    const s = this.s;
    const x0 = Math.max(0, Math.floor(x * s)), x1 = Math.min(this.w, Math.ceil((x + w) * s));
    const y0 = Math.max(0, Math.floor(y * s)), y1 = Math.min(this.h, Math.ceil((y + h) * s));
    for (let iy = y0; iy < y1; iy++) {
      for (let ix = x0; ix < x1; ix++) {
        const c = shader((ix + 0.5) / s, (iy + 0.5) / s);
        if (c) this.put(ix, iy, c);
      }
    }
  }
  /** Bitmap text; px is the size of one font pixel in metres, (x, y) the top-centre. */
  text(str, cx, y, px, c) {
    str = String(str).toUpperCase();
    let w = 0;
    for (const ch of str) w += (GLYPHS[ch] ? GLYPHS[ch].split(' ')[0].length : 3) + 1;
    let x = cx - ((w - 1) * px) / 2;
    for (const ch of str) {
      const g = GLYPHS[ch];
      if (!g) { x += 4 * px; continue; }
      const rows = g.split(' ');
      for (let r = 0; r < GLYPH_H; r++) {
        for (let k = 0; k < rows[r].length; k++) if (rows[r][k] === '1') this.rect(x + k * px, y + r * px, px, px, c);
      }
      x += (rows[0].length + 1) * px;
    }
  }
  /** Apply ambient light and distance haze in place. */
  finish(amb, fog, fogAmt) {
    const d = this.d, ar = amb[0], ag = amb[1], ab = amb[2];
    const k = 1 - fogAmt, fr = fog[0] * fogAmt, fg = fog[1] * fogAmt, fb = fog[2] * fogAmt;
    for (let o = 0; o < d.length; o += 4) {
      const a = d[o + 3];
      if (!a) continue;
      let r = d[o], g = d[o + 1], b = d[o + 2];
      if (a === 255) { r *= ar; g *= ag; b *= ab; }
      d[o] = r * k + fr; d[o + 1] = g * k + fg; d[o + 2] = b * k + fb; d[o + 3] = 255;
    }
  }
  flipX() {
    const d = this.d, w = this.w;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < (w >> 1); x++) {
        const a = (y * w + x) * 4, b = (y * w + (w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) { const t = d[a + k]; d[a + k] = d[b + k]; d[b + k] = t; }
      }
    }
  }
  toCanvas(canvas) {
    const c = canvas || makeCanvas(this.w, this.h);
    if (c.width !== this.w || c.height !== this.h) { c.width = this.w; c.height = this.h; }
    c.getContext('2d').putImageData(this.img, 0, 0);
    return c;
  }
}

// ---------------------------------------------------------------------------
// Conifers
// ---------------------------------------------------------------------------
const geomCache = new Map();
function pineGeom(seed, uw, uh, n) {
  const key = seed + '|' + uw + '|' + uh + '|' + n;
  let g = geomCache.get(key);
  if (g) return g;
  const R = rng(seed * 7919 + 13);
  const top = 0.1, bot = uh - 0.6, hf = bot - top, maxHW = uw / 2 - 0.1;
  const lean = (R() - 0.5) * 0.3;
  const tiers = [];
  for (let k = 0; k < n; k++) {
    const a = top + hf * Math.pow(k / n, 1.15) * 0.86;
    const b = top + hf * Math.pow((k + 1) / n, 0.92);
    const w = maxHW * (0.16 + 0.84 * Math.pow((k + 1) / n, 0.85)) * (0.9 + R() * 0.1);
    const cx = uw / 2 + lean * (1 - (k + 1) / n);
    tiers.push({ a, b, w, cx, p1: R() * 6.28, p2: R() * 6.28 });
  }
  g = { tiers, top, bot };
  geomCache.set(key, g);
  return g;
}

function drawPine(p, seed, n) {
  const g = pineGeom(seed, p.uw, p.uh, n);
  const cx0 = p.uw / 2;
  p.ell(cx0, p.uh - 0.1, Math.min(1.1, p.uw * 0.3), 0.14, C.snowS);
  p.rect(cx0 - 0.14, p.uh - 1.0, 0.28, 0.95, C.trunk);
  p.rect(cx0 + 0.02, p.uh - 1.0, 0.12, 0.95, C.trunkD);
  for (let k = n - 1; k >= 0; k--) {
    const T = g.tiers[k];
    const h = T.b - T.a;
    const freq = 8.5 / Math.max(0.5, T.w) + 3;
    p.fn(T.cx - T.w - 0.1, T.a, T.w * 2 + 0.2, h, (x, y) => {
      const v = (y - T.a) / h;
      if (v <= 0) return null;
      const u = x - T.cx, au = Math.abs(u);
      const droop = 0.2 * (0.5 + 0.5 * Math.sin(u * freq + T.p1)) + 0.06 * (au / T.w);
      if (v > 1 - droop) return null;
      const hw = T.w * Math.pow(v, 0.9) * (1 + 0.05 * Math.sin(y * 11 + T.p2));
      if (au > hw) return null;
      const de = hw - au;
      const snowW = (0.14 + 0.08 * Math.sin(v * 8 + T.p2 + (u > 0 ? 2 : 0))) * (0.55 + T.w * 0.4);
      const lit = u > -hw * 0.2;
      if (de < snowW || v < 0.22) return lit ? C.snow : C.snowS;
      if (v > 1 - droop - 0.17) return C.g3;
      return lit ? C.g1 : C.g2;
    });
  }
}

function pineLights(seed, uw, uh, n) {
  const g = pineGeom(seed, uw, uh, n);
  const R = rng(seed * 31 + 5);
  const out = [];
  let ci = (R() * 5) | 0;
  for (let k = 1; k < n; k++) {
    const T = g.tiers[k];
    const h = T.b - T.a;
    const count = Math.max(1, Math.round(T.w * 1.5));
    for (let j = 0; j < count; j++) {
      const tt = count === 1 ? (R() - 0.5) : (j / (count - 1)) * 2 - 1;
      out.push({ x: T.cx + tt * T.w * 0.6, y: T.a + h * (0.58 + 0.16 * (1 - tt * tt)), c: ci++ % 5, ph: R() * 6.28 });
    }
  }
  return out;
}

const PINE_SEEDS = [11, 23, 37];
const SPRUCE_SEEDS = [5, 17];

// ---------------------------------------------------------------------------
// Sprite definitions. Sizes are metres; the anchor is always bottom-centre.
// ---------------------------------------------------------------------------
function candyStripe(x, y) { return (Math.floor((x + y) * 5.5) & 1) ? C.red : C.white; }

function drawCabin(p, v) {
  const wall = v ? [122, 96, 78] : C.log, wallD = v ? [92, 70, 58] : C.logD;
  p.ell(3.2, 4.72, 3.1, 0.2, C.snowS);
  p.rect(0.8, 2.4, 4.8, 2.3, wall);
  for (let y = 2.62; y < 4.7; y += 0.3) p.rect(0.8, y, 4.8, 0.06, wallD);
  p.poly([0.9, 2.45, 3.2, 1.05, 5.5, 2.45], wall);
  // chimney + smoke
  p.rect(4.25, 0.95, 0.5, 1.0, C.brick);
  p.rect(4.2, 0.86, 0.6, 0.13, C.snow);
  p.ell(4.56, 0.56, 0.2, 0.15, [150, 160, 185]);
  p.ell(4.74, 0.26, 0.26, 0.18, [130, 142, 170]);
  // snowy roof
  p.line(0.35, 2.5, 3.2, 0.82, 0.5, C.snow);
  p.line(3.2, 0.82, 6.05, 2.5, 0.5, C.snow);
  p.line(0.45, 2.7, 3.2, 1.08, 0.12, C.snowS);
  p.line(3.2, 1.08, 5.95, 2.7, 0.12, C.snowS);
  // door + wreath
  p.rect(2.84, 3.3, 0.74, 1.4, [92, 52, 42]);
  p.rect(2.84, 3.3, 0.74, 0.07, wallD);
  p.ell(3.21, 3.72, 0.2, 0.2, C.g2);
  p.ell(3.21, 3.72, 0.09, 0.09, [92, 52, 42]);
  p.rect(3.16, 3.86, 0.1, 0.09, C.red);
  // windows (glowing)
  for (const wx of [1.25, 4.1]) {
    p.rect(wx, 3.1, 1.0, 0.92, wallD);
    p.unlit = true;
    p.rect(wx + 0.08, 3.18, 0.84, 0.76, C.warm);
    p.rect(wx + 0.08, 3.18, 0.84, 0.2, C.warmHi);
    p.unlit = false;
    p.rect(wx + 0.46, 3.18, 0.08, 0.76, wallD);
    p.rect(wx + 0.08, 3.52, 0.84, 0.07, wallD);
    p.rect(wx - 0.06, 4.0, 1.12, 0.1, C.snow);
  }
  p.unlit = true;
  p.ell(3.2, 1.95, 0.22, 0.22, C.warm);
  p.unlit = false;
}
function cabinLights() {
  const out = [
    { x: 1.75, y: 3.55, c: WARM, r: 1.9, ph: 0, steady: true },
    { x: 4.6, y: 3.55, c: WARM, r: 1.9, ph: 1, steady: true },
    { x: 3.2, y: 1.95, c: WARM, r: 0.8, ph: 2, steady: true },
  ];
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    out.push({ x: 0.5 + (3.2 - 0.5) * t, y: 2.78 - (2.78 - 1.2) * t, c: i % 5, ph: i * 1.3 });
    out.push({ x: 5.9 - (5.9 - 3.2) * t, y: 2.78 - (2.78 - 1.2) * t, c: (i + 2) % 5, ph: i * 1.7 + 1 });
  }
  return out;
}

const BLOOD = [176, 16, 26], BLOOD_D = [116, 8, 16];
/** A reindeer the laser gun got: on its back in the snow, legs in the air. rudolph: the nose is still red. */
function drawDeadDeer(p, rudolph) {
  p.ell(0.98, 1.84, 0.92, 0.07, BLOOD_D); p.ell(0.9, 1.84, 0.7, 0.05, BLOOD);       // what came out
  p.ell(0.3, 1.74, 0.12, 0.04, BLOOD); p.ell(1.86, 1.78, 0.1, 0.035, BLOOD); p.ell(1.5, 1.88, 0.06, 0.02, BLOOD_D);
  for (const x of [0.6, 0.78, 1.14, 1.3]) { p.rect(x, 0.78, 0.08, 0.72, C.deer); p.rect(x - 0.01, 0.74, 0.1, 0.07, C.coal); }   // legs, hooves up
  p.ell(0.95, 1.58, 0.58, 0.26, C.deer);
  p.ell(0.95, 1.46, 0.42, 0.12, C.deerL);
  p.ell(0.38, 1.66, 0.08, 0.1, C.white);
  p.ell(1.04, 1.5, 0.1, 0.07, BLOOD_D); p.ell(1.04, 1.5, 0.06, 0.04, BLOOD);           // where it went in
  p.poly([1.36, 1.5, 1.6, 1.52, 1.74, 1.7, 1.42, 1.76], C.deer);
  p.ell(1.74, 1.72, 0.2, 0.14, C.deer);
  p.ell(1.92, 1.76, 0.1, 0.08, C.deerL);
  p.line(1.7, 1.66, 1.78, 1.74, 0.03, C.coal); p.line(1.78, 1.66, 1.7, 1.74, 0.03, C.coal);   // an X for an eye
  p.rect(1.9, 1.8, 0.1, 0.05, [240, 120, 150]);                                          // tongue
  for (const dx of [0, 0.08]) { p.line(1.62 + dx, 1.6, 1.5 + dx, 1.32, 0.04, C.deerL); p.line(1.56 + dx, 1.46, 1.42 + dx, 1.4, 0.04, C.deerL); }
  if (rudolph) { p.unlit = true; p.ell(2.02, 1.74, 0.06, 0.06, [255, 60, 50]); p.unlit = false; } else p.ell(2.02, 1.74, 0.05, 0.05, C.coal);
}

function drawDeer(p, v) {
  if (v >= 2) { drawDeadDeer(p, v === 3); return; }
  p.rect(0.56, 1.2, 0.09, 0.68, C.deer); p.rect(0.74, 1.24, 0.08, 0.64, C.deerD);
  p.rect(1.2, 1.2, 0.09, 0.68, C.deer); p.rect(1.34, 1.24, 0.08, 0.64, C.deerD);
  p.ell(0.95, 1.06, 0.56, 0.28, C.deer);
  p.ell(0.95, 1.18, 0.42, 0.13, C.deerL);
  p.ell(0.4, 0.94, 0.08, 0.11, C.white);
  p.poly([1.24, 0.98, 1.5, 0.5, 1.7, 0.56, 1.5, 1.14], C.deer);
  p.ell(1.66, 0.5, 0.2, 0.15, C.deer);
  p.ell(1.84, 0.56, 0.11, 0.09, C.deerL);
  p.poly([1.5, 0.42, 1.42, 0.24, 1.58, 0.36], C.deerD);
  p.rect(1.68, 0.44, 0.05, 0.05, C.coal);
  for (const dx of [0, 0.1]) {
    p.line(1.56 + dx, 0.4, 1.48 + dx, 0.08, 0.04, C.deerL);
    p.line(1.5 + dx, 0.22, 1.36 + dx, 0.1, 0.04, C.deerL);
    p.line(1.52 + dx, 0.14, 1.63 + dx, 0.02, 0.04, C.deerL);
  }
  if (v === 1) { p.unlit = true; p.ell(1.94, 0.54, 0.06, 0.06, [255, 60, 50]); p.unlit = false; } else p.ell(1.94, 0.54, 0.05, 0.05, C.coal);
}

function drawSnowman(p, v) {
  const cx = 0.7;
  if (v === 2) {
    // pushed over (the long smelly finger): flat on his back, hat rolled away
    p.ell(cx, 1.92, 0.7, 0.08, C.snowS);
    p.ell(0.36, 1.6, 0.36, 0.32, C.snowS); p.ell(0.39, 1.57, 0.31, 0.27, C.snow);
    p.ell(0.86, 1.68, 0.27, 0.24, C.snowS); p.ell(0.88, 1.66, 0.23, 0.2, C.snow);
    p.ell(1.2, 1.74, 0.19, 0.17, C.snowS); p.ell(1.21, 1.72, 0.16, 0.14, C.snow);
    p.rect(0.98, 1.5, 0.09, 0.4, C.red);
    p.line(0.84, 1.46, 0.7, 1.12, 0.045, C.trunkD); p.line(0.9, 1.9, 1.08, 1.96, 0.045, C.trunkD);
    p.rect(1.16, 1.66, 0.05, 0.05, C.coal); p.rect(1.26, 1.66, 0.05, 0.05, C.coal);
    p.poly([1.2, 1.6, 1.26, 1.36, 1.3, 1.6], C.orange);                                   // nose to the sky
    p.rect(0.02, 1.84, 0.36, 0.06, C.coal); p.rect(0.06, 1.62, 0.26, 0.24, C.coal); p.rect(0.06, 1.78, 0.26, 0.05, C.red);
    return;
  }
  if (v === 3) {
    // zapped (the laser gun): a scorched puddle, and the bits that were on him
    p.ell(cx, 1.9, 0.66, 0.1, [150, 190, 235]);
    p.ell(cx, 1.8, 0.5, 0.17, C.snowS); p.ell(cx + 0.04, 1.77, 0.42, 0.12, C.snow);
    p.ell(cx, 1.74, 0.24, 0.07, C.coal); p.ell(cx, 1.74, 0.13, 0.035, [90, 60, 40]);
    p.line(cx - 0.5, 1.92, cx - 0.2, 1.84, 0.045, C.trunkD); p.line(cx + 0.24, 1.9, cx + 0.56, 1.8, 0.045, C.trunkD);
    p.poly([cx + 0.3, 1.94, cx + 0.56, 1.9, cx + 0.32, 1.86], C.orange);
    p.rect(cx - 0.6, 1.76, 0.07, 0.07, C.coal); p.rect(cx + 0.5, 1.7, 0.06, 0.06, C.coal); p.rect(cx - 0.3, 1.92, 0.06, 0.05, C.coal);
    p.rect(cx - 0.06, 1.5, 0.05, 0.14, [200, 200, 210]); p.rect(cx + 0.08, 1.38, 0.05, 0.2, [200, 200, 210]);   // a little steam
    return;
  }
  p.ell(cx, 1.92, 0.6, 0.1, C.snowS);
  p.ell(cx, 1.6, 0.42, 0.38, C.snowS); p.ell(cx + 0.05, 1.56, 0.36, 0.32, C.snow);
  p.ell(cx, 1.07, 0.32, 0.3, C.snowS); p.ell(cx + 0.04, 1.04, 0.27, 0.25, C.snow);
  p.ell(cx, 0.62, 0.24, 0.23, C.snowS); p.ell(cx + 0.03, 0.6, 0.2, 0.19, C.snow);
  p.line(cx - 0.3, 1.04, cx - 0.62, 0.8, 0.045, C.trunkD);
  p.line(cx + 0.3, 1.04, cx + 0.64, 0.84, 0.045, C.trunkD);
  p.rect(cx - 0.22, 0.8, 0.44, 0.09, C.red); p.rect(cx + 0.08, 0.86, 0.1, 0.26, C.redD);
  p.rect(cx - 0.1, 0.53, 0.055, 0.055, C.coal); p.rect(cx + 0.06, 0.53, 0.055, 0.055, C.coal);
  p.poly([cx, 0.6, cx + 0.22, 0.66, cx, 0.7], C.orange);
  p.rect(cx - 0.02, 0.98, 0.055, 0.055, C.coal); p.rect(cx - 0.02, 1.14, 0.055, 0.055, C.coal);
  if (v === 0) {
    p.rect(cx - 0.27, 0.38, 0.54, 0.07, C.coal); p.rect(cx - 0.17, 0.1, 0.34, 0.3, C.coal); p.rect(cx - 0.17, 0.3, 0.34, 0.07, C.red);
  } else {
    // hat knocked off (someone tapped him)
    p.rect(cx + 0.36, 1.84, 0.4, 0.06, C.coal); p.rect(cx + 0.42, 1.64, 0.28, 0.22, C.coal);
  }
}

function drawHat(p, ox, oy, k) {
  // Santa hat, k scales it. Brim sits along the bottom of its box.
  p.poly([ox + 0.08 * k, oy + 0.62 * k, ox + 0.2 * k, oy + 0.22 * k, ox + 0.5 * k, oy + 0.03 * k, ox + 0.84 * k, oy + 0.16 * k,
    ox + 1.04 * k, oy + 0.46 * k, ox + 0.9 * k, oy + 0.5 * k, ox + 0.76 * k, oy + 0.34 * k, ox + 0.86 * k, oy + 0.62 * k], C.red);
  p.poly([ox + 0.5 * k, oy + 0.62 * k, ox + 0.6 * k, oy + 0.2 * k, ox + 0.76 * k, oy + 0.34 * k, ox + 0.86 * k, oy + 0.62 * k], C.redD);
  p.ell(ox + 0.47 * k, oy + 0.68 * k, 0.47 * k, 0.12 * k, C.white);
  p.rect(ox + 0.02 * k, oy + 0.6 * k, 0.9 * k, 0.16 * k, C.white);
  p.ell(ox + 1.0 * k, oy + 0.52 * k, 0.11 * k, 0.11 * k, C.white);
}

function drawSanta(p) {
  // Bust for the greeting. Box 2.4 x 2.6.
  p.ell(1.2, 2.5, 1.15, 0.6, C.red);
  p.ell(1.2, 1.95, 0.86, 0.72, C.white);
  p.ell(1.2, 1.3, 0.56, 0.5, C.skin);
  p.ell(0.86, 1.42, 0.15, 0.11, C.rosy); p.ell(1.54, 1.42, 0.15, 0.11, C.rosy);
  p.ell(1.2, 1.46, 0.13, 0.11, [234, 150, 132]);
  p.rect(0.9, 1.07, 0.24, 0.07, C.white); p.rect(1.26, 1.07, 0.24, 0.07, C.white);
  p.rect(0.97, 1.2, 0.09, 0.11, C.coal); p.rect(1.34, 1.2, 0.09, 0.11, C.coal);
  p.ell(1.2, 1.74, 0.13, 0.1, [120, 40, 46]);
  p.ell(0.98, 1.62, 0.3, 0.14, C.white); p.ell(1.42, 1.62, 0.3, 0.14, C.white);
  p.ell(1.2, 2.2, 0.5, 0.36, C.snowS);
  p.ell(1.2, 2.12, 0.5, 0.36, C.white);
  drawHat(p, 0.5, 0.12, 1.42);
}

function drawBirch(p, seed) {
  const R = rng(seed * 977 + 3), cx = p.uw / 2;
  const BARK = [228, 228, 222], BARK_S = [178, 182, 194], MARK = [62, 56, 62], TWIG = [100, 84, 80];
  p.ell(cx, p.uh - 0.08, 0.6, 0.11, C.snowS);
  for (let i = 0; i < 7; i++) {
    const y = 1.4 + (i / 7) * 4.0 + R() * 0.3, side = i % 2 ? 1 : -1, len = 0.6 + R() * 0.7 * (0.5 + i / 7);
    const ex = cx + side * len, ey = y - len * (0.9 + R() * 0.4);
    p.line(cx, y + 0.4, ex, ey, 0.07, TWIG);
    p.line(cx + side * len * 0.55, y + 0.4 - (y + 0.4 - ey) * 0.55, cx + side * (len * 0.55 + 0.36), ey + 0.12, 0.045, TWIG);
    p.line(ex, ey, ex + side * 0.12, ey - 0.4, 0.04, TWIG);
    p.line(cx + side * 0.16, y + 0.28, ex, ey - 0.06, 0.05, C.snow);
  }
  p.line(cx + 0.05, 0.95, cx - 0.22, 0.12, 0.07, TWIG);
  p.line(cx + 0.05, 0.95, cx + 0.36, 0.22, 0.07, TWIG);
  p.line(cx, p.uh - 0.05, cx + 0.05, 0.6, 0.24, BARK);
  p.line(cx + 0.08, p.uh - 0.05, cx + 0.11, 0.95, 0.08, BARK_S);
  for (let i = 0; i < 9; i++) p.rect(cx - 0.12 + R() * 0.12, 1.2 + i * 0.62 + R() * 0.2, 0.1 + R() * 0.08, 0.055, MARK);
}

function drawGhost(p, seed) {
  // a "snow ghost": a small fir completely plastered in wind-blown snow
  const R = rng(seed * 313 + 9), cx = p.uw / 2, lean = (R() - 0.5) * 0.6, n = 6;
  p.ell(cx, p.uh - 0.1, 1.1, 0.14, C.snowS);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), y = p.uh - 0.7 - t * (p.uh - 1.5);
    const rx = 1.15 * (1 - t * 0.78) * (0.9 + R() * 0.2), ry = 0.62 * (1 - t * 0.35), x = cx + lean * t + (R() - 0.5) * 0.15;
    if (i < 3) { p.ell(x - rx * 0.5, y + ry * 0.62, rx * 0.22, 0.1, C.g3); p.ell(x + rx * 0.38, y + ry * 0.66, rx * 0.18, 0.09, C.g3); }
    p.ell(x - 0.06, y + 0.06, rx, ry, C.snowS);
    p.ell(x + 0.08, y - 0.04, rx * 0.86, ry * 0.82, C.snow);
  }
  p.ell(cx + lean + 0.2, 0.62, 0.24, 0.2, C.snow);
}

const ARCH = { cx: 2.5, rx: 2.3, ry: 3.6, base: 3.9 };

// One tent colour per family member (set from the profile list at start-up).
export const TENT_COLORS = [];
export function setTentColors(list) { TENT_COLORS.length = 0; for (const c of list) TENT_COLORS.push(c); }

function drawTent(p, v) {
  const col = TENT_COLORS[v] || C.red, dark = col.map((x) => x * 0.66), lite = col.map((x) => Math.min(255, x * 1.2 + 24));
  p.ell(1.5, 1.94, 1.5, 0.12, C.snowS);
  p.line(0.35, 1.92, 0.04, 1.98, 0.035, [150, 154, 170]); p.line(2.65, 1.92, 2.96, 1.98, 0.035, [150, 154, 170]);
  p.poly([0.35, 1.92, 1.5, 0.42, 2.65, 1.92], col);
  p.poly([1.5, 0.42, 2.65, 1.92, 1.92, 1.92], dark);
  p.poly([1.1, 1.92, 1.5, 0.96, 1.9, 1.92], [44, 32, 44]);
  p.unlit = true;
  p.poly([1.22, 1.92, 1.5, 1.2, 1.78, 1.92], C.warm);
  p.poly([1.36, 1.92, 1.5, 1.52, 1.64, 1.92], C.warmHi);
  p.unlit = false;
  p.line(0.44, 1.8, 1.5, 0.42, 0.09, C.snow);
  p.ell(1.5, 0.44, 0.17, 0.1, C.snow);
  p.line(1.5, 0.42, 1.5, 0.1, 0.035, [204, 206, 216]);
  p.poly([1.5, 0.1, 1.84, 0.19, 1.5, 0.28], lite);
}

export const DEFS = {
  pine: { uw: 3.8, uh: 7.6, variants: 3, draw: (p, v) => drawPine(p, PINE_SEEDS[v], 6), lights: (v) => pineLights(PINE_SEEDS[v], 3.8, 7.6, 6) },
  spruce: { uw: 2.8, uh: 9.2, variants: 2, draw: (p, v) => drawPine(p, SPRUCE_SEEDS[v], 8), lights: (v) => pineLights(SPRUCE_SEEDS[v], 2.8, 9.2, 8) },
  bigtree: {
    uw: 5.4, uh: 11, variants: 1, alwaysLit: true,
    draw: (p) => { drawPine(p, 71, 7); p.unlit = true; p.text('★', 2.7, 0.0, 0.11, C.gold); p.unlit = false; },
    lights: () => [...pineLights(71, 5.4, 11, 7), ...pineLights(72, 5.4, 11, 7), { x: 2.7, y: 0.38, c: 1, r: 1.4, ph: 0 }],
  },
  bush: {
    uw: 1.8, uh: 1.0, variants: 2,
    draw: (p, v) => {
      p.ell(0.9, 0.8, 0.84, 0.4, C.g3); p.ell(0.62, 0.64, 0.46, 0.3, C.g2); p.ell(1.16, 0.66, 0.44, 0.28, v ? C.g1 : C.g2);
      p.ell(0.6, 0.52, 0.42, 0.2, C.snow); p.ell(1.16, 0.56, 0.38, 0.17, C.snow); p.ell(0.9, 0.42, 0.3, 0.14, C.snowS);
      if (v) { p.rect(0.5, 0.74, 0.07, 0.07, C.red); p.rect(1.1, 0.8, 0.07, 0.07, C.red); p.rect(0.82, 0.86, 0.07, 0.07, C.red); }
    },
  },
  rock: {
    uw: 1.6, uh: 1.0, variants: 1,
    draw: (p) => {
      p.poly([0.1, 1.0, 0.3, 0.42, 0.8, 0.2, 1.3, 0.46, 1.5, 1.0], [112, 122, 150]);
      p.poly([0.8, 0.2, 1.3, 0.46, 1.5, 1.0, 0.95, 1.0], [84, 94, 124]);
      p.poly([0.26, 0.5, 0.8, 0.14, 1.34, 0.5, 1.0, 0.44, 0.74, 0.56, 0.5, 0.42], C.snow);
    },
  },
  drift: {
    uw: 3.0, uh: 0.6, variants: 1,
    draw: (p) => { p.ell(1.5, 0.6, 1.5, 0.5, C.snowS); p.ell(1.6, 0.6, 1.3, 0.38, C.snow); },
  },
  // 0 as built, 1 hat knocked off (a tap), 2 pushed over (the finger), 3 zapped (the laser gun)
  snowman: { uw: 1.4, uh: 2.0, variants: 4, draw: drawSnowman },
  // 0 as built, 1 broken (a volleyball: the glass is gone, and so is the light)
  lantern: {
    uw: 1.0, uh: 2.4, variants: 2, alwaysLit: true, pool: 1.6,
    draw: (p, v) => {
      p.ell(0.45, 2.36, 0.4, 0.12, C.snowS);
      p.rect(0.4, 0.5, 0.11, 1.9, C.wood); p.rect(0.46, 0.5, 0.05, 1.9, C.woodD);
      p.rect(0.4, 0.5, 0.42, 0.08, C.wood); p.rect(0.36, 0.43, 0.48, 0.08, C.snow);
      p.rect(0.71, 0.58, 0.03, 0.08, C.metal);
      p.rect(0.6, 0.64, 0.26, 0.06, C.metal); p.rect(0.62, 0.98, 0.22, 0.05, C.metal);
      if (v === 1) {
        // what is left of the glass: a few jagged teeth in the frame, dark inside, and glints on the snow below
        p.rect(0.62, 0.7, 0.04, 0.2, [40, 52, 82]); p.rect(0.8, 0.7, 0.04, 0.12, [40, 52, 82]); p.rect(0.66, 0.7, 0.03, 0.07, [160, 190, 230]); p.rect(0.76, 0.7, 0.03, 0.1, [160, 190, 230]);
        p.rect(0.64, 0.84, 0.06, 0.03, [40, 52, 82]); p.rect(0.57, 1.02, 0.04, 0.03, [200, 226, 250]); p.rect(0.76, 1.06, 0.05, 0.03, [200, 226, 250]); p.rect(0.68, 1.1, 0.03, 0.03, [200, 226, 250]);
        p.rect(0.5, 2.3, 0.03, 0.03, [200, 226, 250]); p.rect(0.62, 2.32, 0.04, 0.03, [200, 226, 250]); p.rect(0.33, 2.34, 0.03, 0.03, [200, 226, 250]);
        return;
      }
      p.unlit = true; p.rect(0.63, 0.7, 0.2, 0.28, C.warm); p.rect(0.68, 0.76, 0.1, 0.14, C.warmHi); p.unlit = false;
    },
    lights: (v) => (v === 1 ? [] : [{ x: 0.73, y: 0.84, c: WARM, r: 1.5, ph: 0, steady: true }]),
  },
  candy: {
    uw: 1.0, uh: 2.6, variants: 1,
    draw: (p) => {
      p.ell(0.45, 2.56, 0.38, 0.11, C.snowS);
      p.fn(0, 0.2, 1.0, 2.4, (x, y) => {
        const shaft = Math.abs(x - 0.45) < 0.075 && y > 0.6;
        const hook = Math.abs(Math.hypot(x - 0.64, y - 0.6) - 0.19) < 0.075 && y <= 0.6;
        const tip = Math.abs(x - 0.83) < 0.075 && y > 0.6 && y < 0.82;
        return shaft || hook || tip ? candyStripe(x, y) : null;
      });
    },
  },
  cabin: { uw: 6.4, uh: 4.8, variants: 2, alwaysLit: true, pool: 4.5, draw: drawCabin, lights: cabinLights },
  // 0 a reindeer, 1 Rudolph, 2 and 3 the same two after the laser gun
  deer: { uw: 2.1, uh: 1.9, variants: 4, alwaysLit: true, draw: drawDeer, lights: (v) => (v === 1 ? [{ x: 1.94, y: 0.54, c: 0, r: 0.5, ph: 0, steady: true }] : []) },
  arch: {
    uw: 5.4, uh: 4.0, variants: 2, alwaysLit: true,
    draw: (p, v) => {
      for (const px of [0.25, 4.8]) {
        p.ell(px + 0.18, 3.95, 0.4, 0.1, C.snowS);
        p.fn(px, 0.6, 0.36, 3.4, candyStripe);
        p.unlit = true; p.ell(px + 0.18, 0.5, 0.2, 0.2, C.gold); p.unlit = false;
      }
      p.rect(0.3, 0.72, 4.8, 0.92, C.red);
      p.rect(0.3, 0.72, 4.8, 0.08, C.white); p.rect(0.3, 1.56, 4.8, 0.08, C.white);
      p.text(v ? 'NORTH POLE' : 'LET IT SNOW', 2.7, 0.9, v ? 0.074 : 0.068, C.white);
      p.rect(0.3, 0.62, 4.8, 0.12, C.snow);
    },
    lights: () => Array.from({ length: 11 }, (_, i) => ({ x: 0.5 + i * 0.44, y: 1.72 + 0.1 * Math.sin(i * 1.9), c: i % 5, ph: i })),
  },
  yeti: {
    uw: 1.9, uh: 2.7, variants: 1,
    draw: (p) => {
      p.ell(0.95, 1.8, 0.66, 0.9, C.furS); p.ell(1.0, 1.74, 0.6, 0.84, C.fur);
      p.ell(0.34, 1.6, 0.2, 0.5, C.fur); p.ell(1.58, 1.6, 0.2, 0.5, C.furS);
      p.ell(0.95, 0.84, 0.44, 0.42, C.fur);
      p.ell(0.95, 0.9, 0.28, 0.25, C.ice);
      p.rect(0.82, 0.82, 0.07, 0.08, C.coal); p.rect(1.02, 0.82, 0.07, 0.08, C.coal);
      p.rect(0.85, 1.0, 0.2, 0.04, C.coal);
      p.rect(0.86, 1.03, 0.05, 0.05, C.white); p.rect(0.99, 1.03, 0.05, 0.05, C.white);
      drawHat(p, 0.52, 0.02, 0.8);
    },
  },
  // An outhouse beside the trail. Variant 1: somebody is in there (you: you tapped it).
  outhouse: {
    uw: 1.7, uh: 2.7, variants: 2, alwaysLit: true,
    draw: (p, v) => {
      const W1 = [126, 86, 56], W2 = [96, 62, 42], W3 = [150, 106, 70], IN = [58, 38, 30];
      p.ell(0.85, 2.64, 0.8, 0.1, C.snowS);
      p.rect(0.3, 0.7, 1.1, 1.94, W1);
      for (let x = 0.3; x < 1.4; x += 0.22) p.rect(x, 0.7, 0.03, 1.94, W2);          // planks
      p.rect(0.48, 1.0, 0.74, 1.62, v ? W1 : W3);                                      // the door
      p.rect(0.48, 1.0, 0.74, 0.04, W2); p.rect(0.48, 1.0, 0.04, 1.62, W2); p.rect(1.18, 1.0, 0.04, 1.62, W2);
      p.unlit = !!v; p.ell(0.85, 1.38, 0.14, 0.14, v ? [255, 214, 120] : IN); p.unlit = false;   // a moon cut in the door...
      p.ell(0.92, 1.35, 0.12, 0.12, v ? W1 : W3);                                      // ...a crescent one. It glows when somebody is in
      p.rect(1.07, 1.84, 0.06, 0.1, C.gold);
      p.poly([0.14, 0.8, 0.85, 0.3, 1.56, 0.8], W2);                                   // the roof, and the snow on it
      p.poly([0.08, 0.74, 0.85, 0.18, 1.62, 0.74, 1.5, 0.66, 0.85, 0.3, 0.2, 0.66], C.snow);
      if (v) { p.rect(1.4, 1.1, 0.04, 0.5, W2); p.rect(1.44, 1.1, 0.2, 0.15, [214, 50, 58]); }   // the flag is up: engaged
    },
  },
  northpole: {
    uw: 1.4, uh: 3.2, variants: 1, alwaysLit: true,
    draw: (p) => {
      p.ell(0.7, 3.14, 0.5, 0.12, C.snowS);
      p.fn(0.58, 0.5, 0.24, 2.7, candyStripe);
      p.unlit = true; p.ell(0.7, 0.36, 0.22, 0.22, C.gold); p.unlit = false;
      p.rect(0.1, 1.0, 1.2, 0.5, C.wood); p.rect(0.1, 1.0, 1.2, 0.06, C.snow);
      p.text('N.POLE', 0.7, 1.14, 0.034, C.white);
    },
    lights: () => [{ x: 0.7, y: 0.36, c: 1, r: 0.9, ph: 0 }],
  },
  tent: { uw: 3.0, uh: 2.0, variants: 16, alwaysLit: true, pool: 1.3, draw: drawTent, lights: () => [{ x: 1.5, y: 1.62, c: WARM, r: 1.1, ph: 0, steady: true }] },
  campfire: {
    uw: 1.0, uh: 0.9, variants: 1, alwaysLit: true, pool: 1.7,
    draw: (p) => {
      p.ell(0.5, 0.86, 0.46, 0.08, C.snowS);
      p.line(0.14, 0.82, 0.86, 0.66, 0.1, C.woodD); p.line(0.86, 0.82, 0.14, 0.66, 0.1, C.wood);
      p.unlit = true;
      p.poly([0.26, 0.72, 0.38, 0.3, 0.5, 0.5, 0.6, 0.12, 0.76, 0.72], [250, 120, 40]);
      p.poly([0.36, 0.72, 0.46, 0.44, 0.52, 0.56, 0.6, 0.36, 0.68, 0.72], [255, 214, 90]);
      p.unlit = false;
    },
    lights: () => [{ x: 0.5, y: 0.45, c: 1, r: 1.5, ph: 0 }, { x: 0.5, y: 0.5, c: 0, r: 0.8, ph: 2 }],
  },
  birch: { uw: 3.0, uh: 7.2, variants: 2, draw: (p, v) => drawBirch(p, v ? 41 : 19) },
  ghost: { uw: 2.8, uh: 5.2, variants: 2, draw: (p, v) => drawGhost(p, v ? 29 : 7) },
  lightarch: {
    uw: 5.0, uh: 3.9, variants: 1, alwaysLit: true,
    draw: (p) => {
      p.ell(0.22, 3.84, 0.34, 0.1, C.snowS); p.ell(4.78, 3.84, 0.34, 0.1, C.snowS);
      p.fn(0, 0, 5.0, 3.9, (x, y) => {
        const dx = (x - ARCH.cx) / ARCH.rx, dy = (y - ARCH.base) / ARCH.ry, r = Math.sqrt(dx * dx + dy * dy);
        return r > 0.96 && r < 1.0 ? [74, 62, 62] : null;
      });
    },
    lights: () => Array.from({ length: 15 }, (_, i) => {
      const a = ((8 + i * (164 / 14)) * Math.PI) / 180;
      return { x: ARCH.cx + ARCH.rx * 0.98 * Math.cos(a), y: ARCH.base - ARCH.ry * 0.98 * Math.sin(a), c: i % 5, ph: i * 1.3 };
    }),
  },
  igloo: {
    uw: 3.2, uh: 1.7, variants: 1, alwaysLit: true, pool: 1.4,
    draw: (p) => {
      p.ell(1.6, 1.7, 1.52, 1.5, C.snowS); p.ell(1.68, 1.7, 1.42, 1.42, C.snow);
      p.fn(0.2, 0.3, 2.9, 1.4, (x, y) => {
        const dx = (x - 1.68) / 1.42, dy = (y - 1.7) / 1.42;
        if (dx * dx + dy * dy > 0.96) return null;
        const row = Math.floor(y / 0.36);
        return (y % 0.36) < 0.035 || ((x + (row & 1) * 0.3) % 0.6) < 0.035 ? C.snowS : null;
      });
      p.ell(1.6, 1.7, 0.44, 0.66, [34, 40, 70]);
      p.unlit = true; p.ell(1.6, 1.7, 0.3, 0.5, C.warm); p.ell(1.6, 1.7, 0.16, 0.3, C.warmHi); p.unlit = false;
    },
    lights: () => [{ x: 1.6, y: 1.4, c: WARM, r: 1.3, ph: 0, steady: true }],
  },
  wand: {
    uw: 0.6, uh: 1.9, variants: 1,
    draw: (p) => {
      p.ell(0.2, 1.86, 0.2, 0.07, C.snowS);
      p.line(0.2, 1.9, 0.2, 0.1, 0.045, [200, 170, 110]);
      p.poly([0.22, 0.12, 0.56, 0.22, 0.22, 0.36], [250, 130, 40]);
    },
  },
  // --- pickups (unlit so they pop at night) ---
  ornament: {
    uw: 0.62, uh: 0.72, variants: 5, unlit: true, glow: true,
    draw: (p, v) => {
      const col = [[226, 58, 64], [250, 200, 70], [70, 150, 250], [70, 200, 110], [190, 100, 230]][v];
      p.rect(0.26, 0.02, 0.1, 0.1, C.gold);
      p.ell(0.31, 0.42, 0.27, 0.27, col);
      p.ell(0.4, 0.52, 0.15, 0.13, [col[0] * 0.72, col[1] * 0.72, col[2] * 0.72]);
      p.ell(0.22, 0.32, 0.07, 0.07, C.white);
    },
  },
  cane: {
    uw: 0.56, uh: 0.9, variants: 1, unlit: true, glow: true,
    draw: (p) => {
      p.fn(0, 0, 0.56, 0.9, (x, y) => {
        const shaft = Math.abs(x - 0.2) < 0.065 && y > 0.26;
        const hook = Math.abs(Math.hypot(x - 0.32, y - 0.26) - 0.12) < 0.065 && y <= 0.26;
        const tip = Math.abs(x - 0.44) < 0.065 && y > 0.26 && y < 0.4;
        return shaft || hook || tip ? ((Math.floor((x + y) * 9) & 1) ? C.red : C.white) : null;
      });
    },
  },
  gift: {
    uw: 0.84, uh: 0.84, variants: 4, unlit: true, glow: true,
    draw: (p, v) => {
      const col = [[214, 52, 58], [60, 150, 230], [60, 180, 110], [170, 90, 220]][v];
      const rib = v === 0 ? C.gold : C.white;
      p.rect(0.1, 0.34, 0.64, 0.48, col);
      p.rect(0.44, 0.34, 0.3, 0.48, [col[0] * 0.75, col[1] * 0.75, col[2] * 0.75]);
      p.rect(0.06, 0.24, 0.72, 0.14, col);
      p.rect(0.36, 0.24, 0.12, 0.58, rib);
      p.ell(0.31, 0.16, 0.12, 0.09, rib); p.ell(0.53, 0.16, 0.12, 0.09, rib);
    },
  },
  // --- UI art ---
  santa: { uw: 2.4, uh: 2.7, variants: 1, unlit: true, draw: drawSanta },
  hat: { uw: 1.2, uh: 0.82, variants: 1, unlit: true, draw: (p) => drawHat(p, 0.02, 0.02, 1.0) },
};

const lightCache = new Map();
export function lightsFor(type, variant) {
  const key = type + '|' + variant;
  let l = lightCache.get(key);
  if (!l) {
    l = DEFS[type].lights ? DEFS[type].lights(variant) : [];
    // ordinary trees: keep same-coloured lights together, so they can be drawn in runs
    if (!DEFS[type].alwaysLit) l = l.slice().sort((a, b) => a.c - b.c);
    lightCache.set(key, l);
  }
  return l;
}

/**
 * The soft halos round a tree's fairy lights, painted once into two pictures (every other
 * light in each) that the trail lays over a nearby lit tree and fades against each other
 * to make the glow shimmer. Two pictures a tree, where it used to be one halo per light.
 */
export const SHEET_PAD = 0.6, SHEET_RES = 20;
const sheets = new Map();
export function glowSheet(type, variant, flip, half) {
  const key = type + '|' + variant + '|' + (flip ? 1 : 0) + '|' + half;
  let c = sheets.get(key);
  if (c) return c;
  const def = DEFS[type];
  c = makeCanvas(Math.round((def.uw + SHEET_PAD * 2) * SHEET_RES), Math.round((def.uh + SHEET_PAD * 2) * SHEET_RES));
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.5;
  lightsFor(type, variant).forEach((l, i) => {
    if ((i & 1) !== half) return;
    const r = (l.r || 0.5) * SHEET_RES;
    const x = ((flip ? def.uw - l.x : l.x) + SHEET_PAD) * SHEET_RES, y = (l.y + SHEET_PAD) * SHEET_RES;
    g.drawImage(glowCanvas(LIGHT_COLS[l.c]), x - r, y - r, r * 2, r * 2);
  });
  sheets.set(key, c);
  return c;
}

// ---------------------------------------------------------------------------
// Sprite cache
//
// Two layers. The drawing itself (shapes in metres turned into pixels) is the slow part,
// so each sprite is drawn once per size and kept untinted for good. The copies that go
// on screen are those pixels tinted for the time of day and the distance haze; when the
// time of day moves on a step only that cheap tinting is redone, a few sprites a frame.
// ---------------------------------------------------------------------------
const BASE_PPM = 1.4, MIP = 1.5, MAX_LEVEL = 9; // 1.4 .. ~54 px per metre
export const FOG_Q = 6;
const FOG_MAX = 0.93;
const WHITE = [1, 1, 1];
const BUILD_MS = 2.5;       // time allowed per frame for refreshing sprites that already have an older copy

const raws = new Map();     // type|variant|level -> Pix (untinted, never thrown away)
const cache = new Map();    // + fog step and flip -> canvas, tinted for the current time of day
const stale = new Map();    // the same canvases, kept across a time-of-day step until each is retinted
let cacheStep = -1;
let frameStart = 0;

/** Call once per frame. */
export function beginSpriteFrame(env) {
  frameStart = performance.now();
  if (env.step !== cacheStep) { cache.clear(); cacheStep = env.step; }
}

/** Copy src pixels to dst, applying ambient light, haze and (optionally) a mirror flip. */
function tint(src, dst, w, h, amb, fog, fogAmt, flip) {
  const ar = amb[0], ag = amb[1], ab = amb[2];
  const k = 1 - fogAmt, fr = fog[0] * fogAmt, fg = fog[1] * fogAmt, fb = fog[2] * fogAmt;
  for (let y = 0; y < h; y++) {
    let o = y * w * 4, q = flip ? (y * w + w - 1) * 4 : o;
    const step = flip ? -4 : 4;
    for (let x = 0; x < w; x++, o += 4, q += step) {
      const a = src[o + 3];
      if (!a) { dst[q + 3] = 0; continue; }
      let r = src[o], g = src[o + 1], b = src[o + 2];
      if (a === 255) { r *= ar; g *= ag; b *= ab; }
      dst[q] = r * k + fr; dst[q + 1] = g * k + fg; dst[q + 2] = b * k + fb; dst[q + 3] = 255;
    }
  }
}

/**
 * bake: 0 for the plain sprite. For a lit tree that is not right beside you, pass 1, 2 or 4
 * (all its fairy lights, every 2nd, every 4th), plus 8 for the other twinkle state, and the
 * lights are painted into the picture itself: half bright and half dim, swapped in the
 * other state. The trail flips each tree between the two, so the forest still twinkles
 * without a single extra drawing call.
 */
const LOG_MIP = Math.log(MIP);
/** Which of the ready-made sizes suits a sprite drawn at ppm pixels per metre. */
export const mipLevel = (ppm) => clamp(Math.round(Math.log(ppm / BASE_PPM) / LOG_MIP), 0, MAX_LEVEL);
/** True when the last getSprite call handed back an old copy because this frame's time for refreshing was used up. */
export let spriteWasStale = false;

export function getSprite(type, variant, lvl, fogQ, env, flip, bake = 0) {
  const def = DEFS[type];
  spriteWasStale = false;
  const rk = type + '|' + variant + '|' + lvl + (bake ? '|L' + bake : '');
  const key = rk + '|' + fogQ + '|' + (flip ? 1 : 0);
  let c = cache.get(key);
  if (c) return c;
  const old = stale.get(key);
  if (old && performance.now() - frameStart > BUILD_MS) { spriteWasStale = true; return old; }
  let raw = raws.get(rk);
  if (!raw) {
    raw = new Pix(def.uw, def.uh, BASE_PPM * Math.pow(MIP, lvl));
    if (def.unlit) raw.unlit = true;
    def.draw(raw, variant);
    if (bake) {
      const every = bake & 7, state = bake >> 3;
      raw.unlit = true;
      lightsFor(type, variant).forEach((l, i) => {
        if (i % every) return;
        const col = LIGHT_COLS[l.c], k = (((i / every) & 1) === state) ? 0.92 : 0.5;
        raw.rect(l.x - 0.065, l.y - 0.065, 0.13, 0.13, [col[0] * k, col[1] * k, col[2] * k]);
      });
    }
    raws.set(rk, raw);
  }
  const out = new ImageData(raw.w, raw.h);
  tint(raw.d, out.data, raw.w, raw.h, def.unlit ? WHITE : env.amb, env.fog, (fogQ / FOG_Q) * FOG_MAX, flip);
  c = old || makeCanvas(raw.w, raw.h);
  c.getContext('2d').putImageData(out, 0, 0);
  cache.set(key, c);
  stale.set(key, c);
  return c;
}

/**
 * Remembered animation frames for things that are redrawn as they move (the rider, the
 * dogs, the trail buddies). Their motion is cut into a fixed number of poses; each pose is
 * drawn once, the first time it is needed, and after that it is just a picture to show.
 * Everything is forgotten when the time of day moves on a step, because the tint changes.
 */
const scratch = new Map();
export class Frames {
  constructor(max = 160) { this.map = new Map(); this.step = -1; this.max = max; }
  /** paint(pix) draws the pose; amb is the light to tint it with. Returns a canvas. */
  get(env, key, uw, uh, res, amb, paint, flip) {
    if (env.step !== this.step) { this.map.clear(); this.step = env.step; }
    let c = this.map.get(key);
    if (c) return c;
    if (this.map.size >= this.max) this.map.clear();
    const sk = uw + '|' + uh + '|' + res;
    let p = scratch.get(sk);
    if (!p) { if (scratch.size > 40) scratch.clear(); p = new Pix(uw, uh, res); scratch.set(sk, p); }
    p.clear();
    paint(p);
    p.finish(amb, env.fog, 0);
    if (flip) p.flipX();
    c = p.toCanvas();
    this.map.set(key, c);
    return c;
  }
}
/** Which of n poses a phase (radians) falls in, and the phase at the middle of pose k. */
export const poseOf = (phase, n) => ((Math.floor((phase / TAU_) * n) % n) + n) % n;
export const posePhase = (k, n) => ((k + 0.5) / n) * TAU_;
const TAU_ = Math.PI * 2;

/** Fixed-scale, untinted art for menus and HUD (santa, hat, pickups as icons). */
const uiCache = new Map();
export function uiSprite(type, variant = 0, ppm = 20) {
  const key = type + '|' + variant + '|' + ppm;
  let c = uiCache.get(key);
  if (c) return c;
  const def = DEFS[type];
  const p = new Pix(def.uw, def.uh, ppm);
  p.unlit = true;
  def.draw(p, variant);
  p.finish(WHITE, [0, 0, 0], 0);
  c = p.toCanvas();
  uiCache.set(key, c);
  return c;
}

// Soft additive glow blobs, one per colour.
const glows = new Map();
export function glowCanvas(col) {
  const key = col[0] + ',' + col[1] + ',' + col[2];
  let c = glows.get(key);
  if (c) return c;
  c = makeCanvas(32, 32);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},1)`);
  grad.addColorStop(0.25, `rgba(${col[0]},${col[1]},${col[2]},0.5)`);
  grad.addColorStop(0.6, `rgba(${col[0]},${col[1]},${col[2]},0.14)`);
  grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  glows.set(key, c);
  return c;
}
