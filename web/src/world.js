// The trail. An endless, deterministic snowy path drawn with the classic
// "pseudo-3D road" trick: the trail is a chain of short segments projected from far
// to near, with scenery sprites scaled by distance. Nothing is stored for the whole
// world - curves, hills and scenery are all computed from the segment number.
import { W, H, SEG, DRAW_SEGS, FOCAL, HORIZON, CAM_H, RIDER_DIST, TRAIL_HW } from './config.js';
import { clamp, hash2, hashI2, rng, mix3 } from './util.js';
import { DEFS, FOG_Q, LIGHT_COLS, LIGHT_CSS, LIGHT_DIM_CSS, SHEET_PAD, getSprite, mipLevel, spriteWasStale, glowCanvas, glowSheet, lightsFor, beginSpriteFrame } from './sprites.js';
import { Sky } from './sky.js';
import { drawText } from './font.js';
import { D } from './detail.js';
import { makeCanvas } from './util.js';
import { TWEAKS } from '../tweaks.js';

export const ZONES = [
  { name: 'WHISPERING PINES', short: 'PINES', color: '#3f9a6c', front: 0.5, mid: 0.6, back: 0.6, wall: 0.85, bush: 0.12, lit: 0.05, snowman: 0.012, deer: 0.006, drift: 0.05 },
  { name: 'LANTERN HOLLOW', short: 'LANTERNS', color: '#ffb347', front: 0.45, mid: 0.55, back: 0.6, wall: 0.85, bush: 0.1, lit: 0.12, lantern: 9, snowman: 0.02, deer: 0.004, drift: 0.05 },
  { name: 'CANDY CANE LANE', short: 'CANDY LANE', color: '#e8454c', front: 0.3, mid: 0.5, back: 0.6, wall: 0.85, bush: 0.06, lit: 0.4, candy: 4, snowman: 0.03, deer: 0, drift: 0.05 },
  { name: 'SILENT MEADOW', short: 'MEADOW', color: '#cfe0ff', front: 0.05, mid: 0.1, back: 0.22, wall: 0.9, bush: 0.2, lit: 0.6, snowman: 0.02, deer: 0.04, drift: 0.22 },
  { name: 'NORTH POLE VILLAGE', short: 'VILLAGE', color: '#ffd76a', front: 0.18, mid: 0.3, back: 0.5, wall: 0.85, bush: 0.08, lit: 0.7, lantern: 8, cabin: 14, snowman: 0.04, deer: 0.01, drift: 0.05 },
  { name: 'SILVER BIRCH GROVE', short: 'BIRCHES', color: '#d9cfb4', kinds: [['birch', 0.8], ['pine', 0.12], ['spruce', 0.08]], front: 0.55, mid: 0.6, back: 0.55, wall: 0.85, bush: 0.16, lit: 0.5, snowman: 0.015, deer: 0.012, drift: 0.08 },
  { name: 'FROZEN LAKE', short: 'LAKE', color: '#6ab7ff', ice: true, front: 0.35, mid: 0.45, back: 0.55, wall: 0.9, bush: 0.12, lit: 0.25, lantern: 14, snowman: 0.02, deer: 0.006, drift: 0.06 },
  { name: 'TUNNEL OF LIGHTS', short: 'TUNNEL', color: '#c77dff', arch: 3, front: 0.4, mid: 0.55, back: 0.6, wall: 0.85, bush: 0.05, lit: 0.45, snowman: 0.01, deer: 0, drift: 0.03 },
  { name: 'SNOW GHOST RIDGE', short: 'RIDGE', color: '#8fa3d6', kinds: [['ghost', 1]], rocky: true, wand: 5, front: 0.32, mid: 0.4, back: 0.3, wall: 0.1, bush: 0.3, lit: 0, snowman: 0.01, deer: 0.004, drift: 0.25 },
];
/** The landscapes as built in, before any studio changes (the studio's "reset" goes back to these). */
export const ZONE_DEFAULTS = ZONES.map((z) => Object.assign({}, z));
// Changes made in the studio (names, map colours, how many trees, lights, snowmen...), laid over the above.
if (TWEAKS.places) ZONES.forEach((z, i) => { if (TWEAKS.places[i]) Object.assign(z, TWEAKS.places[i]); });
// The order you travel through them (then it repeats).
export const SEQUENCE = [0, 1, 5, 2, 6, 0, 7, 3, 8, 4];
// Places are fixed along the family trail: there are 14 to a trail mile (a mile walked,
// or five miles ridden), so mile 3.2 is the same place whichever machine you are on.
export const ZONES_PER_MILE = 14;
/** Which place (an index into ZONES) is at a point along the trail, in trail miles. */
export const zoneTypeAt = (trailMiles) => SEQUENCE[((Math.floor(trailMiles * ZONES_PER_MILE) % SEQUENCE.length) + SEQUENCE.length) % SEQUENCE.length];
const CONIFERS = [['pine', 0.7], ['spruce', 0.3]];
const NEAR = 1.3;
const WARM_CSS = 'rgb(255,232,172)';

// The ground is painted into a pixel buffer (one 32-bit colour per pixel, 0xAABBGGRR) and
// put on screen in a single step. It used to be about 2,300 little rectangles a frame.
const u8 = (v) => (v > 255 ? 255 : v < 0 ? 0 : v | 0);
const fog32 = (c, fog, f) => (0xff000000 | (u8(c[2] + (fog[2] - c[2]) * f) << 16) | (u8(c[1] + (fog[1] - c[1]) * f) << 8) | u8(c[0] + (fog[0] - c[0]) * f)) >>> 0;
function span(buf, row, x0, x1, c) {
  if (x0 < 0) x0 = 0;
  if (x1 > W) x1 = W;
  if (x1 - x0 > 24) buf.fill(c, row + x0, row + x1);
  else for (let i = row + x0, e = row + x1; i < e; i++) buf[i] = c;   // quicker than a call for a few pixels
}

export class World {
  /** opts: { mode: 'bike'|'tread', attract: bool, seed: int } */
  constructor(opts = {}) {
    this.mode = opts.mode || 'bike';
    this.attract = !!opts.attract;
    this.seed = opts.seed || 1;
    // 14 places to a trail mile on either machine (2,736 m of scenery for a mile walked, 8,047 m for five ridden)
    this.zoneSegs = this.attract ? 110 : this.mode === 'tread' ? 130 : 383;
    this.curveK = this.mode === 'tread' ? 0.0032 : 0.0042;
    this.z = 60 + (opts.startZ || 0);   // startZ: how far along the trail this outing begins (metres of scenery)
    this.startSeg = Math.floor(this.z / SEG);
    this.grade = 0;
    this.bob = 0;
    this.scroll = 0;
    this.zoneIndex = -1;
    this.sky = new Sky(this.mode);
    this.items = new Map();
    this.extra = new Map();   // things placed by the game rather than generated: tents, campfires
    this.hide = null;         // a Set of things an advent door has not brought yet: deer rudolph yeti igloo northpole (see ride.js)
    this.taps = [];
    this.things = [];         // where every thing on the trail was drawn this frame: [{ it, x, y, w, h }] (the tools use it)
    this.groundTop = HORIZON;
    this.riderY = HORIZON + (CAM_H * FOCAL) / RIDER_DIST;
    const n = DRAW_SEGS + 2;
    this.relZ = new Float32Array(n); this.offX = new Float32Array(n);
    this.sy = new Float32Array(n); this.sc = new Float32Array(n); this.sx = new Float32Array(n);
    this.clip = new Int16Array(n); this.spanA = new Int16Array(n); this.spanB = new Int16Array(n);
    this.palStep = -1;
  }

  curveAt(i) {
    const z = i * SEG;
    let c = Math.sin(z * 0.0105 + 1.3) * 0.6 + Math.sin(z * 0.0263 + 4.1) * 0.45 + Math.sin(z * 0.0041 + 0.7) * 0.5;
    const s = c < 0 ? -1 : 1;
    c = Math.max(0, Math.abs(c) - 0.22);
    return s * c * this.curveK;
  }

  hillAt(z) { return Math.sin(z * 0.0125 + 0.5) * 1.5 + Math.sin(z * 0.031 + 2.0) * 0.55; }

  zoneAt(i) {
    const index = Math.floor(i / this.zoneSegs);
    const type = SEQUENCE[((index % SEQUENCE.length) + SEQUENCE.length) % SEQUENCE.length];
    return { index, type, local: i - index * this.zoneSegs };
  }

  /** Frozen lake: how far the shoreline is from the trail centre at segment i (metres), and on which side. */
  shoreAt(i) {
    const zn = this.zoneAt(i);
    if (!ZONES[zn.type].ice) return 0;
    const edge = Math.min(zn.local, this.zoneSegs - zn.local);
    return 4.8 + 1.4 * Math.sin(i * 0.19) + 0.6 * Math.sin(i * 0.53) + (edge < 14 ? (14 - edge) * 3 : 0);
  }
  iceSideAt(i) {
    const zn = this.zoneAt(i);
    return ZONES[zn.type].ice ? (zn.index % 2 ? 1 : -1) : 0;
  }

  /** Workshop: jump to the start of the first zone of a given type (index into ZONES). */
  gotoZoneType(type) {
    const k = Math.max(0, SEQUENCE.indexOf(type));
    this.z = k * this.zoneSegs * SEG + 45;
    this.startSeg = Math.floor(this.z / SEG);
  }
  /** Workshop: hop forward (or back) a whole zone. */
  hopZone(dir) {
    const k = Math.max(0, Math.floor(this.z / SEG / this.zoneSegs) + dir);
    this.z = k * this.zoneSegs * SEG + 45;
  }

  get zoneName() { return ZONES[this.zoneAt(Math.floor(this.z / SEG)).type].name; }

  itemsAt(i) {
    let a = this.items.get(i);
    if (!a) {
      a = this._gen(i);
      const ex = this.extra.get(i);
      if (ex) for (const it of ex) a.push(it);
      this.items.set(i, a);
    }
    return a;
  }

  /** Put something at a distance along the trail (metres), e.g. a family member's tent. */
  addExtra(z, item) {
    const i = Math.round(z / SEG);
    if (!this.extra.has(i)) this.extra.set(i, []);
    this.extra.get(i).push(item);
    const cached = this.items.get(i);
    if (cached) cached.push(item);
    return item;
  }

  _gen(i) {
    const zn = this.zoneAt(i);
    const Z = ZONES[zn.type];
    const out = [];
    const hid = (k) => !!(this.hide && this.hide.has(k));   // not out of its advent door yet
    const mid = Math.floor(this.zoneSegs / 2);

    let cabinSide = 0;
    if (Z.cabin) {
      const m = Math.round(i / Z.cabin) * Z.cabin;
      const which = Math.round(m / Z.cabin);
      if (Math.abs(i - m) <= 3) cabinSide = which % 2 === 0 ? 1 : -1;
      if (i === m) out.push({ type: 'cabin', v: which % 4 < 2 ? 0 : 1, x: cabinSide * (8.6 + hash2(i, 4) * 2.4), s: 1, flip: cabinSide < 0, lit: true });
    }
    if (!this.attract && i === this.startSeg + 9) out.push({ type: 'arch', v: 0, x: 0, s: 1, flip: false, lit: true });
    if (zn.type === 4) {
      if (zn.local === 3) out.push({ type: 'arch', v: 1, x: 0, s: 1, flip: false, lit: true });
      if (zn.local === mid && !hid('northpole')) out.push({ type: 'northpole', v: 0, x: 2.1, s: 1, flip: false, lit: true });
      if (zn.local === mid + 7) out.push({ type: 'bigtree', v: 0, x: -6.2, s: 1, flip: false, lit: true });
    }

    const iceSide = Z.ice ? (zn.index % 2 ? 1 : -1) : 0;
    if (iceSide && zn.local === mid && !hid('igloo')) out.push({ type: 'igloo', v: 0, x: iceSide * 9.5, s: 1, flip: false, lit: true });
    if (Z.arch && i % Z.arch === 0) out.push({ type: 'lightarch', v: 0, x: 0, s: 1, flip: false, lit: true });
    if (Z.wand && i % Z.wand === 0) out.push({ type: 'wand', v: 0, x: (Math.round(i / Z.wand) % 2 ? 1 : -1) * 1.25, s: 1, flip: Math.round(i / Z.wand) % 2 === 0 });

    for (let side = -1; side <= 1; side += 2) {
      const R = rng(hashI2(i * 2 + (side > 0 ? 1 : 0), this.seed));
      const clear = side === cabinSide, onIce = side === iceSide;
      // 0..1, fixed for each tree: the detail setting keeps the ones below its threshold,
      // so turning detail down thins the forest without moving anything that stays
      const keepOf = () => hash2(i * 16 + out.length, 91 + side + this.seed);
      const tree = (x, s, kinds) => {
        let type = kinds[0][0], r = R();
        for (const [t, wgt] of kinds) { if ((r -= wgt) < 0) { type = t; break; } }
        const canGlow = !!DEFS[type].lights;
        return { type, v: (R() * DEFS[type].variants) | 0, x: side * x, s, flip: R() < 0.5, lit: canGlow && R() < Z.lit, spark: R(), canLight: canGlow && x < 12, keep: keepOf() };
      };
      const near = Z.kinds || CONIFERS;
      if (R() < Z.front && !clear && !onIce) out.push(tree(3.4 + R() * 2.2, 0.72 + R() * 0.45, near));
      if (R() < Z.mid && !clear && !onIce) out.push(tree(5.8 + R() * 5, 0.8 + R() * 0.5, near));
      if (R() < Z.back && !onIce) out.push(tree(clear ? 17 + R() * 8 : 11 + R() * 11, 0.9 + R() * 0.6, Z.rocky ? near : CONIFERS));
      if ((i & 1) === 0 && R() < Z.wall) out.push(tree(onIce ? 45 + R() * 18 : 23 + R() * 26, 1.2 + R() * 0.7, CONIFERS));
      if (R() < Z.bush && !onIce) {
        if (Z.rocky) out.push({ type: 'rock', v: 0, x: side * (1.8 + R() * 9), s: 0.8 + R() * 1.9, flip: R() < 0.5, keep: keepOf() });
        else out.push({ type: R() < 0.7 ? 'bush' : 'rock', v: 0, x: side * (1.7 + R() * 3.2), s: 0.8 + R() * 0.5, flip: R() < 0.5, keep: keepOf() });
      }
      if (R() < Z.drift && !onIce) out.push({ type: 'drift', v: 0, x: side * (2.2 + R() * 9), s: 0.8 + R() * 0.8, flip: false, keep: keepOf() });
      if (R() < Z.snowman) out.push({ type: 'snowman', v: 0, x: side * (1.75 + R() * 1.5), s: 0.9 + R() * 0.25, flip: side > 0, tap: true });
      if (R() < Z.deer) {
        const deer = { type: 'deer', v: R() < 0.15 && !hid('rudolph') ? 1 : 0, x: side * (4 + R() * 6), s: 0.95 + R() * 0.2, flip: side > 0, lit: true, tap: true };
        if (!hid('deer')) out.push(deer);
      }
      if (zn.type === 0 && R() < 0.0015 && !hid('yeti')) out.push({ type: 'yeti', v: 0, x: side * 4.4, s: 1, flip: side > 0, tap: true });
    }
    for (const it of out) if (it.lit) it.litAt = -99;

    if (Z.lantern && i % Z.lantern === 0) {
      const side = Math.round(i / Z.lantern) % 2 === 0 ? -1 : 1;
      out.push({ type: 'lantern', v: 0, x: side * 1.4, s: 1, flip: side > 0, lit: true, litAt: -99 });
    }
    if (Z.candy && i % Z.candy === 0) {
      out.push({ type: 'candy', v: 0, x: -1.3, s: 1, flip: false });
      out.push({ type: 'candy', v: 0, x: 1.3, s: 1, flip: true });
    }

    if (!this.attract && i > this.startSeg + 14) {
      const G = 16, gi = Math.floor(i / G), k = i - gi * G, h = hash2(gi, 31 + this.seed);
      if (h < 0.62) {
        if (k >= 4 && k <= 12 && k % 2 === 0) out.push({ type: 'ornament', v: (hash2(gi, 5) * 5) | 0, x: Math.sin(i * 0.5) * 0.2, h: 0.75, s: 1, collect: true, value: 10 });
      } else if (h < 0.86) {
        if (k === 5 || k === 8 || k === 11) out.push({ type: 'cane', v: 0, x: 0, h: 0.7, s: 1, collect: true, value: 25 });
      } else if (k === 8) out.push({ type: 'gift', v: (hash2(gi, 6) * 4) | 0, x: 0, h: 0.62, s: 1.15, collect: true, value: 50 });
    }
    return out;
  }

  /**
   * Advance the world. v is ground speed in m/s (already visually scaled), grade the
   * visual slope (rise/run), spirit 0..1. Returns a list of events for the caller.
   */
  update(dt, v, grade, spirit, time) {
    const events = [];
    this.z += v * dt;
    this.grade += (grade - this.grade) * Math.min(1, dt * 1.6);
    const ri = Math.floor(this.z / SEG);
    this.scroll += this.curveAt(ri) * v * dt * 420;
    this.lean = this.curveAt(ri) / this.curveK;

    const zn = this.zoneAt(ri);
    if (zn.index !== this.zoneIndex) {
      this.zoneIndex = zn.index;
      events.push({ type: 'zone', name: ZONES[zn.type].name });
    }
    for (let i = ri - 1; i <= ri + 22; i++) {
      for (const it of this.itemsAt(i)) {
        if (it.collect && !it.got && i * SEG <= this.z + 0.5) {
          it.got = time;
          events.push({ type: 'collect', kind: it.type, value: it.value });
        } else if (it.camp && !it.passed && i * SEG <= this.z) {
          it.passed = true;
          events.push({ type: 'camp', who: it.camp });
        } else if (it.canLight && !it.lit && !(it.keep >= D.trees) && i > ri + 3 && spirit > 0.15 && it.spark < spirit * 0.75 - 0.08) {
          it.lit = true; it.litAt = time;
          events.push({ type: 'lit' });
        }
      }
    }
    if (this.items.size > 800) {
      const lo = ri - 12, hi = ri + DRAW_SEGS + 60;
      for (const k of this.items.keys()) if (k < lo || k > hi) this.items.delete(k);
    }
    return events;
  }

  _palette(env) {
    if (this.palStep === env.step) return;
    this.palStep = env.step;
    const A = env.amb;
    const m = (c) => [c[0] * A[0], c[1] * A[1], c[2] * A[2]];
    this.pal = {
      snow: [m([234, 242, 253]), m([223, 233, 249])],
      bank: m([252, 254, 255]),
      trail: [m([206, 220, 245]), m([195, 210, 239])],
      edge: m([150, 172, 218]),
      cord: m([180, 198, 233]),
      track: [m([138, 160, 208]), m([160, 178, 220])],
      ice: [m([104, 158, 228]), m([92, 146, 218])],
    };
  }

  render(ctx, env, time, drawRider) {
    beginSpriteFrame(env);
    this._palette(env);
    const N = Math.min(DRAW_SEGS, D.segs);
    const fogStart = D.fogStart, fogSpan = D.fogEnd - D.fogStart;
    const stats = D.stats;
    stats.sprites = 0; stats.lights = 0; stats.glows = 0;
    const { relZ, offX, sy, sc, sx, clip, spanA, spanB } = this;
    const camZ = this.z - RIDER_DIST;
    const base = Math.floor(camZ / SEG);
    const frac = camZ / SEG - base;

    // --- project the segment chain ---
    let x = 0, dx = -this.curveAt(base) * frac;
    for (let n = 0; n <= N; n++) {
      relZ[n] = (n - frac) * SEG;
      offX[n] = x;
      x += dx;
      dx += this.curveAt(base + n);
    }
    const rn = RIDER_DIST / SEG + frac, ri = Math.floor(rn);
    const xr = offX[ri] + (offX[ri + 1] - offX[ri]) * (rn - ri);
    const y0 = this.hillAt(this.z);
    let first = 0;
    while (relZ[first] < NEAR) first++;
    for (let n = first; n <= N; n++) {
      const s = FOCAL / relZ[n];
      sc[n] = s;
      sx[n] = W / 2 + (offX[n] - xr) * s;
      const yRel = this.hillAt((base + n) * SEG) - y0 + this.grade * (relZ[n] - RIDER_DIST) - CAM_H + this.bob;
      sy[n] = HORIZON - yRel * s;
    }

    // --- which screen rows does each segment own? (near to far, hills hide what is behind them) ---
    let top = H;
    for (let n = first; n < N; n++) {
      clip[n] = top;
      spanA[n] = -1;
      const yf = sy[n + 1];
      if (yf >= top) continue;
      const ya = n === first ? top - 1 : Math.min(top - 1, Math.floor(sy[n]));
      const yb = Math.max(0, Math.ceil(yf));
      if (ya < yb) continue;
      spanA[n] = ya; spanB[n] = yb;
      top = yb;
    }
    clip[N] = top;
    this.groundTop = top;
    this.riderY = HORIZON + ((CAM_H - this.bob) * FOCAL) / RIDER_DIST;

    this.sky.draw(ctx, env, time, top, this.scroll, this.spirit || 0);

    // --- ground ---
    const fog = env.fog, pal = this.pal, tread = this.mode === 'tread';
    if (!this.gimg || this.gimg.height !== H) {
      this.gcan = makeCanvas(W, H);
      this.gctx = this.gcan.getContext('2d');
      this.gimg = this.gctx.createImageData(W, H);
      this.g32 = new Uint32Array(this.gimg.data.buffer);
    }
    const g32 = this.g32;
    for (let n = first; n < N; n++) {
      if (spanA[n] < 0) continue;
      const ya = spanA[n], yb = spanB[n];
      const f = clamp((relZ[n] - fogStart) / fogSpan, 0, 1);
      const band = ((base + n) >> 1) & 1;
      const snowC = fog32(pal.snow[band], fog, f);
      const bankC = fog32(pal.bank, fog, f);
      const trailC = fog32(pal.trail[band], fog, f);
      const edgeC = fog32(pal.edge, fog, f);
      const cordC = fog32(pal.cord, fog, f);
      const trackC = fog32(pal.track[(base + n) & 1], fog, f);
      const yn = sy[n], yf = sy[n + 1], spanY = yn - yf || 1;
      const hwN = TRAIL_HW * sc[n], hwF = TRAIL_HW * sc[n + 1];
      const iceSide = this.iceSideAt(base + n);
      let iceC = 0, shN = 0, shF = 0;
      if (iceSide) { iceC = fog32(pal.ice[band], fog, f); shN = this.shoreAt(base + n); shF = this.shoreAt(base + n + 1) || shN; }
      for (let y = ya; y >= yb; y--) {
        const row = y * W;
        const t = (y - yf) / spanY;
        const cx = sx[n + 1] + (sx[n] - sx[n + 1]) * t;
        const hw = hwF + (hwN - hwF) * t;
        const l = Math.round(cx - hw), r = Math.round(cx + hw);
        g32.fill(snowC, row, row + W);
        if (iceSide) {
          // frozen lake: a band of ice from the shoreline out to the far bank
          const sM = hw / TRAIL_HW, xa = cx + iceSide * (shF + (shN - shF) * t) * sM, xb = cx + iceSide * 42 * sM;
          const il = Math.max(0, Math.round(Math.min(xa, xb))), ir = Math.min(W, Math.round(Math.max(xa, xb)));
          if (ir > il) {
            g32.fill(iceC, row + il, row + ir);
            // a bright lip of snow where the bank meets the ice
            const lip = Math.max(1, Math.round(sM * 0.25)), lx = Math.round(xa) - (iceSide > 0 ? 0 : lip);
            span(g32, row, lx, lx + lip, bankC);
          }
        }
        if (r <= l) continue;
        const bw = Math.max(1, Math.round(hw * 0.3));
        span(g32, row, l - bw, r + bw, bankC);
        span(g32, row, l, r, trailC);
        if (hw >= 3) {
          const ew = Math.max(1, Math.round(hw * 0.08));
          span(g32, row, l, l + ew, edgeC);
          span(g32, row, r - ew, r, edgeC);
        }
        if (hw > 12) {
          let cxp = Math.round(cx - hw * 0.66); span(g32, row, cxp, cxp + 1, cordC);
          cxp = Math.round(cx - hw * 0.4); span(g32, row, cxp, cxp + 1, cordC);
          cxp = Math.round(cx + hw * 0.4); span(g32, row, cxp, cxp + 1, cordC);
          cxp = Math.round(cx + hw * 0.66); span(g32, row, cxp, cxp + 1, cordC);
        }
        if (tread) {
          const gw = Math.max(1, Math.round(hw * 0.15));
          let gx = Math.round(cx - hw * 0.26 - gw / 2); span(g32, row, gx, gx + gw, trackC);
          gx = Math.round(cx + hw * 0.26 - gw / 2); span(g32, row, gx, gx + gw, trackC);
        } else {
          const tw = Math.max(1, Math.round(hw * 0.16)), tx = Math.round(cx - tw / 2);
          span(g32, row, tx, tx + tw, trackC);
        }
      }
    }
    if (top < H) {
      this.gctx.putImageData(this.gimg, 0, 0, 0, top, W, H - top);
      ctx.drawImage(this.gcan, 0, top, W, H - top, 0, top, W, H - top);
    }

    // --- headlamp beam on the snow ---
    const beam = env.night * (this.attract ? 0 : 1);
    if (beam > 0.03) {
      // The beam starts and ends a fixed distance ahead of you. Its two ends are worked out
      // BETWEEN the trail's segments, so it glides along with you. (It used to start and end
      // on whole segments, and jumped forward one segment at a time: click, click, click.)
      const zA = RIDER_DIST + SEG * 1.5, zB = Math.min(RIDER_DIST + SEG * 16.5, relZ[N - 1]);
      const edge = (z) => {          // [left x, right x, y] of the beam at a distance z ahead of the camera
        const n = Math.max(0, Math.min(N - 2, Math.floor(z / SEG + frac)));
        const z0 = Math.max(0.05, relZ[n]), z1 = relZ[n + 1];
        const t = z1 > z0 ? clamp((1 / z0 - 1 / z) / (1 / z0 - 1 / z1), 0, 1) : 0;     // (straight lines on screen are straight in 1/z)
        const x = sx[n] + (sx[n + 1] - sx[n]) * t, y = sy[n] + (sy[n + 1] - sy[n]) * t, k = sc[n] + (sc[n + 1] - sc[n]) * t;
        const w = (0.8 + (z - RIDER_DIST) * 0.17) * k;
        return [x - w, x + w, y];
      };
      const a = Math.ceil(zA / SEG + frac + 0.001), b = Math.min(N - 1, Math.floor(zB / SEG + frac - 0.001));
      const near = edge(zA), far = edge(zB);
      ctx.beginPath();
      ctx.moveTo(near[0], near[2]);
      for (let n = a; n <= b; n++) ctx.lineTo(sx[n] - (0.8 + (relZ[n] - RIDER_DIST) * 0.17) * sc[n], sy[n]);
      ctx.lineTo(far[0], far[2]);
      ctx.lineTo(far[1], far[2]);
      for (let n = b; n >= a; n--) ctx.lineTo(sx[n] + (0.8 + (relZ[n] - RIDER_DIST) * 0.17) * sc[n], sy[n]);
      ctx.lineTo(near[1], near[2]);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, near[2], 0, far[2]);
      g.addColorStop(0, `rgba(255,232,170,${0.05 * beam})`);
      g.addColorStop(0.3, `rgba(255,232,170,${0.26 * beam})`);
      g.addColorStop(1, 'rgba(255,232,170,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // --- scenery, far to near, with the rider slotted in at their depth ---
    this.taps.length = 0;
    this.things.length = 0;
    let riderDrawn = false;
    for (let n = N - 1; n >= first; n--) {
      if (!riderDrawn && relZ[n] < RIDER_DIST) {
        riderDrawn = true;
        if (drawRider) drawRider(ctx, W / 2, this.riderY, FOCAL / RIDER_DIST);
      }
      const items = this.itemsAt(base + n);
      if (!items.length) continue;
      const s = sc[n];
      const f = clamp((relZ[n] - fogStart) / fogSpan, 0, 1);
      const fq = Math.round(Math.pow(f, 0.85) * FOG_Q);
      const keepBelow = D.trees;
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.keep >= keepBelow) continue;        // thinned out by the detail setting
        this._drawItem(ctx, it, sx[n], sy[n], s, fq, f, env, time, clip[n], base + n);
      }
    }
    if (!riderDrawn && drawRider) drawRider(ctx, W / 2, this.riderY, FOCAL / RIDER_DIST);
  }

  _drawItem(ctx, it, segX, baseY, scale, fq, fogAmt, env, time, clipY, seg) {
    if (it.gone) return;                    // blown up (the laser gun): not there any more
    const def = DEFS[it.type];
    const ppm = scale * (it.s || 1);
    const dw = Math.max(1, Math.round(def.uw * ppm)), dh = Math.max(1, Math.round(def.uh * ppm));
    const cx = segX + it.x * scale;
    const x0 = Math.round(cx - dw / 2);
    if (x0 >= W || x0 + dw <= 0) return;
    let yb = baseY;
    if (it.h) yb -= (it.h + Math.sin(time * 3 + seg) * 0.07) * scale;
    const y0 = Math.round(yb) - dh;
    if (y0 >= H) return;

    if (it.collect) {
      if (it.got) {
        const t = (time - it.got) / 0.45;
        if (t < 1) {
          const cy = y0 + dh / 2, r = (0.25 + t * 1.1) * scale;
          ctx.fillStyle = t < 0.5 ? '#fff6c8' : '#ffd76a';
          for (let a = 0; a < 8; a++) {
            const ang = a * 0.785 + seg;
            ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.8), 2, 2);
          }
        }
        return;
      }
      if (ppm > 5) {
        const gr = 0.7 * ppm;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 * (1 - fogAmt);
        ctx.drawImage(glowCanvas(LIGHT_COLS[5]), cx - gr, y0 + dh / 2 - gr, gr * 2, gr * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    const vis = Math.min(dh, clipY - y0);
    if (vis <= 0) return;

    // pool of light on the snow under lanterns and cabins
    if (def.pool && ppm > 3 && env.night > 0.05 && !it.dark) {
      const pw = def.pool * ppm * 1.6, ph = def.pool * ppm * 0.32;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.42 * env.night * (1 - fogAmt);
      ctx.drawImage(glowCanvas(LIGHT_COLS[5]), cx - pw, Math.round(yb) - ph, pw * 2, ph * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Fairy lights. Unless the tree is close they are part of its own picture (two pictures,
    // swapped to twinkle); close up each light is its own dot, with soft halos over the top.
    const lit = it.lit && def.lights;
    const rich = D.glow >= 2 || !!def.alwaysLit;
    const every = !lit ? 0 : rich ? (ppm < 2.6 ? 2 : 1) : ppm < 2.6 ? 4 : ppm < 5.5 ? 2 : 1;
    const fade = lit ? clamp((time - it.litAt) / 0.9, 0, 1) : 0;
    // Far away, a tree's lights are part of its picture. While they are coming on, that picture
    // is laid over the plain one, a little stronger every frame, so the tree arrives at exactly
    // the look it will keep. (It used to flash its lights at full strength as separate dots for
    // a second and then drop to the dimmer picture: a tree that lit up and then went off.)
    const farLit = lit && !def.alwaysLit && ppm < 9;
    const baked = farLit && fade >= 1;
    const twinkle = baked && Math.sin(time * 2.3 + seg * 1.7) > 0 ? 8 : 0;

    // Looking a sprite up means building a text key; each thing remembers the picture it
    // used last and only asks again when its size, haze, lights or the time of day change.
    const fogQ = def.unlit ? Math.min(fq, 3) : fq, bake = baked ? every + twinkle : 0;
    const sig = (((it.v * 10 + mipLevel(ppm)) * 8 + fogQ) * 16 + bake) * 64 + env.step;
    let c = it.pic;
    if (it.sig !== sig || !c) {
      c = getSprite(it.type, it.v, mipLevel(ppm), fogQ, env, it.flip, bake);
      it.pic = c;
      it.sig = spriteWasStale ? -1 : sig;
    }
    D.stats.sprites++;
    if (vis >= dh) ctx.drawImage(c, x0, y0, dw, dh);
    else ctx.drawImage(c, 0, 0, c.width, Math.max(1, (c.height * vis) / dh), x0, y0, dw, vis);
    if (farLit && !baked && fade > 0.02) {
      const on = getSprite(it.type, it.v, mipLevel(ppm), fogQ, env, it.flip, every);
      ctx.globalAlpha = fade;
      if (vis >= dh) ctx.drawImage(on, x0, y0, dw, dh);
      else ctx.drawImage(on, 0, 0, on.width, Math.max(1, (on.height * vis) / dh), x0, y0, dw, vis);
      ctx.globalAlpha = 1;
    }

    if (it.tap && ppm > 9) this.taps.push({ it, x: x0, y: y0, w: dw, h: dh });
    if (ppm > 4 && !it.collect) this.things.push({ it, x: x0, y: y0, w: dw, h: dh });
    if (it.label && ppm > 9 && ppm < 70) drawText(ctx, it.label, cx, y0 - 10, { align: 'center', color: '#fff6c8' });

    if (!lit || farLit) return;
    const L = lightsFor(it.type, it.v);
    if (!L.length) return;
    const a = (1 - fogAmt * 0.8) * fade;
    if (a <= 0.02) return;
    const stats = D.stats;

    // halos
    if (ppm > (rich ? 8 : 15) && (D.glow > 0 || def.alwaysLit)) {
      ctx.globalCompositeOperation = 'lighter';
      if (def.alwaysLit) {
        // landmarks (cabins, lanterns, tents...) have a few big steady lights: one halo each
        for (let i = 0; i < L.length; i++) {
          const l = L[i];
          const ly = y0 + l.y * ppm;
          if (ly > clipY) continue;
          const lx = x0 + (it.flip ? def.uw - l.x : l.x) * ppm;
          const tw = l.steady ? 0.9 + 0.1 * Math.sin(time * 7 + l.ph) : 0.62 + 0.38 * Math.sin(time * 2.3 + l.ph + seg);
          const gr = (l.r || 0.5) * ppm;
          ctx.globalAlpha = a * tw * (l.r ? 0.62 : 0.5);
          ctx.drawImage(glowCanvas(LIGHT_COLS[l.c]), lx - gr, ly - gr, gr * 2, gr * 2);
          stats.glows++;
        }
      } else {
        // trees: two ready-made halo pictures, fading against each other
        const sx0 = Math.round(x0 - SHEET_PAD * ppm), sy0 = Math.round(y0 - SHEET_PAD * ppm);
        const sw = Math.round((def.uw + SHEET_PAD * 2) * ppm), sh = Math.round((def.uh + SHEET_PAD * 2) * ppm);
        const show = Math.min(sh, clipY - sy0);
        if (show > 0) {
          for (let half = 0; half < 2; half++) {
            const sheet = glowSheet(it.type, it.v, it.flip, half);
            ctx.globalAlpha = a * (0.62 + 0.38 * Math.sin(time * 2.3 + seg + half * 2.4));
            if (show >= sh) ctx.drawImage(sheet, sx0, sy0, sw, sh);
            else ctx.drawImage(sheet, 0, 0, sheet.width, Math.max(1, (sheet.height * show) / sh), sx0, sy0, sw, show);
            stats.glows++;
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // dots
    const px = Math.max(1, Math.round(ppm * 0.13)), half = px / 2;
    let last = '';
    ctx.globalAlpha = Math.min(1, a * 1.15);
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      if (l.r && l.steady) continue;
      if (every > 1 && i % every) continue;
      const ly = y0 + l.y * ppm;
      if (ly > clipY) continue;
      const lx = x0 + (it.flip ? def.uw - l.x : l.x) * ppm;
      const bright = Math.sin(time * 2.3 + l.ph + seg) > -0.25;
      const css = l.c === 5 ? WARM_CSS : bright ? LIGHT_CSS[l.c] : LIGHT_DIM_CSS[l.c];
      if (css !== last) { ctx.fillStyle = css; last = css; }
      ctx.fillRect(Math.round(lx - half), Math.round(ly - half), px, px);
      stats.lights++;
    }
    ctx.globalAlpha = 1;
  }
}
