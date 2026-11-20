// TOOLS: things you pick up and then use on the trail by tapping it. A laser gun and a
// long smelly finger so far. ride.js owns which ones you have and which is in your hand
// (the TOOLS strip, top of the left edge) and decides what happens to whatever you hit;
// this file is how using one LOOKS, and what flies off each kind of thing.
// Both tools are used from where YOU are, behind the camera: the shot and the finger go
// away from you into the picture. Each tool is an advent thing in the catalog (gifts.js).
import { W, H } from './config.js';
import { clamp, makeCanvas } from './util.js';

export const TOOLS = {
  snowball: { name: 'SNOWBALLS', hint: 'TAP WHAT YOU WANT TO HIT' },     // yours from the very first ride: no door needed
  lasergun: { name: 'LASER GUN', hint: 'TAP WHAT YOU WANT TO ZAP' },
  finger: { name: 'LONG SMELLY FINGER', hint: 'TAP WHAT YOU WANT TO POKE' },
  volleyball: { name: 'VOLLEYBALL', hint: 'TAP WHERE TO SERVE IT' },
};

// --- what things are made of: [colour in the air, colour once it has landed] ----------
const WOOD = ['#8a5a2e', '#5a3a1e'], NEEDLE = ['#2f7d4f', '#1c5a38'], SNOW = ['#ffffff', '#cfe0ff'], SPARK = ['#fff6c8', '#ffb347'];
const STONE = ['#8f97a8', '#5a6272'], ICE = ['#d8ecff', '#9fc4ee'], SMOKE = ['#6a6a76', '#3a3a44'], RED = ['#ff3b3b', '#b01c24'], WHITE = ['#ffffff', '#dcdcdc'];
const BARK = ['#e9dcc6', '#b8a888'], CLOTH = ['#3fb37a', '#2a6a4a'], GOLD = ['#ffd76a', '#b8862a'], EMBER = ['#ff6a2a', '#b02a0a'];
export const BLOOD = [['#c4121c', '#8e0a12']];
export const SPARKS = [SPARK];
export const SNOWBITS = [SNOW];
export const GLASS = [['#f4fcff', '#a8c8ee'], ['#d8ecff', '#8fb4de'], ['#ffffff', '#c8dcf6'], ['#fff6c8', '#ffd76a']];
export const POOPBITS = [['#6b4a2e', '#4a2f1c'], ['#8a5a2e', '#5a3a1e'], ['#5a3a26', '#3a2416']];
/** What flies when the laser gun blows up each kind of thing on the trail (world.js / sprites.js). */
const DEBRIS = {
  pine: [NEEDLE, NEEDLE, WOOD, SNOW], spruce: [NEEDLE, NEEDLE, WOOD, SNOW], bigtree: [NEEDLE, NEEDLE, WOOD, SNOW, SPARK],
  birch: [BARK, BARK, NEEDLE, SNOW], ghost: [SNOW, ICE, ICE], bush: [NEEDLE, SNOW], rock: [STONE, STONE, SNOW], drift: [SNOW],
  lantern: [SPARK, GOLD, SMOKE], lightarch: [SPARK, GOLD, RED], arch: [SPARK, GOLD, NEEDLE], wand: [SPARK, GOLD],
  candy: [RED, WHITE], cane: [RED, WHITE], cabin: [WOOD, WOOD, SMOKE, SPARK], northpole: [RED, WHITE, GOLD],
  igloo: [ICE, ICE, SNOW], outhouse: [WOOD, WOOD, SMOKE], tent: [CLOTH, CLOTH, WOOD], campfire: [EMBER, SPARK, SMOKE],
};
export const debrisFor = (type) => DEBRIS[type] || [SPARK, SMOKE];
/** What a trail buddy turns into: feathers, mostly. */
const FEATHERS = {
  turkey: [['#8a5a2e', '#5a3a1e'], ['#d98a3a', '#a8621e'], ['#f3e3cf', '#cdbba0'], RED],
  cardinal: [['#e0282e', '#9a1218'], ['#ff6a52', '#b83a2a'], ['#2a2a30', '#1a1a20']],
  owl: [['#8a6a48', '#5a4630'], ['#e9dcc6', '#b8a888'], WHITE],
  penguin: [['#1c2230', '#10141e'], WHITE, ['#ffb347', '#b8762a']],
  fox: [['#e0742a', '#a84e16'], ['#f6f0e6', '#cfc6b8'], ['#5a3018', '#3a1e0e']],
  kangaroo: [['#c79a6a', '#8a6a48'], ['#e9d6b8', '#b8a488']],
};
export const feathersFor = (id) => FEATHERS[id] || [WHITE, SPARK];

const LOB = 0.36;                                      // a snowball: how long it is in the air (seconds)
const FLY = 0.17, BLAST = 0.26;                     // the laser: the ring closing in, then the bang (seconds)
const REACH = 0.16, HOLD = 0.32, BACK = 0.2;       // the finger: out, there, back
const TOSS = 0.36, SWING = 0.07, SERVE = 0.2, REBOUND = 0.55;   // the volleyball: tossed up, the swing, the flight to the target, a bounce back at you
const TAU = Math.PI * 2;

// --- a volleyball: a sphere with its pole tipped toward you, cut into six panels (cream, blue, yellow) ---------
const SLICES = [[246, 240, 218], [47, 111, 224], [255, 210, 58], [246, 240, 218], [47, 111, 224], [255, 210, 58]];
const balls = new Map();
/** A volleyball picture, r pixels from the middle to the edge, turned by spin (radians). Drawn once, then kept. */
export function ballPicture(r, spin = 0) {
  const step = Math.round((((spin % TAU) + TAU) % TAU) / (TAU / 6) * 8) % 48, key = r + '|' + step;
  let c = balls.get(key);
  if (c) return c;
  const size = r * 2 + 3, g = (c = makeCanvas(size, size)).getContext('2d'), tilt = 0.95, ct = Math.cos(tilt), st = Math.sin(tilt), a0 = step * (TAU / 6 / 8);
  const half = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x + 0.5 - half) / (r + 0.5), ny = (y + 0.5 - half) / (r + 0.5), rr = nx * nx + ny * ny;
    if (rr > 1) continue;
    const nz = Math.sqrt(1 - rr), py = ny * ct - nz * st, lon = Math.atan2(py, nx) + a0, seg = lon / (TAU / 6), k = Math.floor(seg), f = seg - k;
    let col = SLICES[((k % 6) + 6) % 6];
    const light = clamp(0.55 + 0.5 * (-nx * 0.45 - ny * 0.55 + nz * 0.6), 0.35, 1.12);
    let m = light;
    if (f < 0.07 || f > 0.93) m *= 0.5;                                  // the seams
    if (rr > 0.8) m *= 0.85;                                            // the rim turns away
    g.fillStyle = `rgb(${Math.min(255, Math.round(col[0] * m))},${Math.min(255, Math.round(col[1] * m))},${Math.min(255, Math.round(col[2] * m))})`;
    g.fillRect(x, y, 1, 1);
  }
  if (balls.size > 400) balls.clear();
  balls.set(key, c);
  return c;
}

/** A ring of chunky dots. */
function ring(ctx, cx, cy, r, colour, size) {
  const n = Math.max(10, Math.round(r * 1.25));
  ctx.fillStyle = colour;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 6.2832;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r) - (size >> 1), Math.round(cy + Math.sin(a) * r) - (size >> 1), size, size);
  }
}

export class ToolFx {
  constructor() { this.shot = null; this.poke = null; this.balls = []; this.bits = []; this.poopy = false; this.serving = null; this.rebounds = []; }   // poopy: the finger has been in something (ride.js)

  /** The finger (or a serve) is on its way somewhere: one at a time. */
  get busy() { return !!this.poke || !!this.serving; }

  /**
   * A volleyball serve at a point: you toss it up in front of you (bottom right), swing, and it
   * goes where you tapped, big near you and small when it gets there. land() is called then.
   */
  serve(to, land) {
    this.serving = { from: { x: Math.round(W / 2 + 74), y: H - 52 }, to, t: 0, land, hit: false, landed: false, spin: 0, onHit: null };
  }
  /** A ball bouncing back at you off something solid, from a point. */
  bounce(from) {
    this.rebounds.push({ from: { x: from.x, y: from.y }, to: { x: clamp(from.x + (Math.random() - 0.5) * 220, 70, W - 70), y: H + 24 }, t: 0, spin: Math.random() * 6 });
    if (this.rebounds.length > 4) this.rebounds.shift();
  }

  /**
   * A laser shot at a point { x, y }. It leaves you (bottom right, behind the camera) as a
   * big wide ring and closes in on the target; land() is called the moment it gets there.
   */
  fire(to, land) { this.shot = { from: { x: Math.round(W / 2 + 104), y: H - 30 }, to, t: 0, land, landed: false }; }

  /**
   * A snowball, thrown from where you are (low on the screen, behind the camera) in an arc
   * to a point: big as it leaves your hand, small by the time it gets there. land() is
   * called when it hits. As many in the air at once as you can throw.
   */
  lob(to, land) {
    if (this.balls.length > 12) return;
    this.balls.push({ from: { x: Math.round(W / 2 + (to.x - W / 2) * 0.3 + 60), y: H - 8 }, to, t: 0, land });
  }

  /** The finger goes out, from behind the camera, to a point; land() is called when it gets there. */
  jab(to, land) {
    this.poke = { from: { x: Math.round(W / 2 + (to.x - W / 2) * 0.35 + 74), y: H + 8 }, to, t: 0, land, landed: false };
  }

  /**
   * A spray of little bits from a point. stuff: a list of [flying, landed] colour pairs
   * (each bit is one of them). float: they drift down like feathers instead of dropping.
   */
  burst(x, y, stuff, n = 22, float = false) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.08 + Math.random() * 0.84), v = (float ? 24 : 34) + Math.random() * (float ? 70 : 110);
      this.bits.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: float ? 1.3 + Math.random() * 0.9 : 0.5 + Math.random() * 0.6,
        cols: stuff[(Math.random() * stuff.length) | 0], floor: y + 6 + Math.random() * 18, s: Math.random() < 0.3 ? 3 : 2, rest: false, float, ph: Math.random() * 6,
      });
    }
    if (this.bits.length > 420) this.bits.splice(0, this.bits.length - 420);
  }

  update(dt) {
    const s = this.shot;
    if (s) {
      s.t += dt;
      if (!s.landed && s.t >= FLY) { s.landed = true; if (s.land) s.land(); }
      if (s.t > FLY + BLAST) this.shot = null;
    }
    const v = this.serving;
    if (v) {
      v.t += dt; v.spin += dt * (v.t < TOSS ? 1.5 : 16);
      if (!v.hit && v.t >= TOSS + SWING) { v.hit = true; if (v.onHit) v.onHit(); }
      if (!v.landed && v.t >= TOSS + SWING + SERVE) { v.landed = true; if (v.land) v.land(); }
      if (v.t > TOSS + SWING + SERVE + 0.12) this.serving = null;
    }
    for (const b of this.rebounds) { b.t += dt; b.spin += dt * 9; }
    this.rebounds = this.rebounds.filter((b) => b.t < REBOUND);
    for (const b of this.balls) { b.t += dt; if (b.t >= LOB && b.land) { const land = b.land; b.land = null; land(); } }
    this.balls = this.balls.filter((b) => b.t < LOB);
    const p = this.poke;
    if (p) {
      p.t += dt;
      if (!p.landed && p.t >= REACH) { p.landed = true; if (p.land) p.land(); }
      if (p.t > REACH + HOLD + BACK) this.poke = null;
    }
    for (const b of this.bits) {
      if (b.rest) { b.life -= dt; continue; }
      b.ph += dt * 7;
      b.x += (b.vx + (b.float ? Math.sin(b.ph) * 22 : 0)) * dt;
      b.y += b.vy * dt;
      b.vy += (b.float ? 70 : 260) * dt;
      b.vx *= 1 - dt * (b.float ? 2.2 : 1);
      if (b.float) { b.vy = Math.min(b.vy, 26); b.life -= dt; }
      // (once landed it does not lie there long: the trail keeps moving under it)
      if (b.vy > 0 && b.y >= b.floor) { b.y = b.floor; b.rest = true; b.life = 0.7; }
    }
    this.bits = this.bits.filter((b) => b.life > 0);
  }

  /** skin: the rider's skin colour, [r, g, b], for the finger. */
  draw(ctx, time, skin) {
    for (const b of this.bits) {
      ctx.globalAlpha = clamp(b.life / (b.rest ? 0.7 : 0.35), 0, 1);
      ctx.fillStyle = b.cols[b.rest ? 1 : 0];
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.rest ? b.s + 1 : b.s, b.rest ? 1 : b.float ? 1 + (Math.sin(b.ph) > 0 ? 1 : 0) : b.s);
    }
    ctx.globalAlpha = 1;
    for (const b of this.balls) {
      const u = b.t / LOB, x = Math.round(b.from.x + (b.to.x - b.from.x) * u);
      const y = Math.round(b.from.y + (b.to.y - b.from.y) * u - Math.sin(u * Math.PI) * (30 + Math.abs(b.to.y - b.from.y) * 0.18));
      const r = Math.max(2, Math.round(11 * (1 - u) * (1 - u) + 2));
      ctx.fillStyle = '#b9c9ee'; ctx.fillRect(x - r + 1, y - r + 2, r * 2, r * 2 - 1);            // its shaded underside
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2); ctx.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2);
      if (r > 3) { ctx.fillStyle = '#dfe8ff'; ctx.fillRect(x - r + 2, y + r - 3, r * 2 - 4, 1); }
    }
    for (const b of this.rebounds) {
      const u = b.t / REBOUND, x = Math.round(b.from.x + (b.to.x - b.from.x) * u), y = Math.round(b.from.y + (b.to.y - b.from.y) * u * u - Math.sin(u * Math.PI) * 26);
      const r = Math.round(3 + 15 * u);
      const pic = ballPicture(r, b.spin); ctx.drawImage(pic, x - (pic.width >> 1), y - (pic.height >> 1));
    }
    if (this.shot) this._shot(ctx);
    if (this.poke) this._finger(ctx, time, skin || [232, 190, 160]);
    if (this.serving) this._serve(ctx, skin || [232, 190, 160]);
  }

  /** The serve: toss, swing, and away. */
  _serve(ctx, skin) {
    const s = this.serving, { from, to } = s, col = (k) => `rgb(${Math.round(skin[0] * k)},${Math.round(skin[1] * k)},${Math.round(skin[2] * k)})`;
    const peak = { x: from.x, y: from.y - 128 };
    const drawBall = (x, y, r, spin, alpha = 1) => { const pic = ballPicture(Math.max(2, Math.round(r)), spin); ctx.globalAlpha = alpha; ctx.drawImage(pic, Math.round(x) - (pic.width >> 1), Math.round(y) - (pic.height >> 1)); ctx.globalAlpha = 1; };
    // an arm, fat where it is near you: from low on the right up to a fist at (x, y)
    const arm = (x, y, ax, ay, fist) => {
      const dx = x - ax, dy = y - ay, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
      for (let i = 0; i <= n; i++) { const w = Math.round(34 - 12 * (i / n)), px = Math.round(ax + (dx * i) / n), py = Math.round(ay + (dy * i) / n); ctx.fillStyle = col(0.72); ctx.fillRect(px - (w >> 1) + 2, py - (w >> 1) + 2, w, w); }
      for (let i = 0; i <= n; i++) { const w = Math.round(34 - 12 * (i / n)), px = Math.round(ax + (dx * i) / n), py = Math.round(ay + (dy * i) / n); ctx.fillStyle = col(i % 5 === 4 ? 0.9 : 1); ctx.fillRect(px - (w >> 1), py - (w >> 1), w, w); }
      if (fist) { ctx.fillStyle = col(0.72); ctx.fillRect(Math.round(x) - 12, Math.round(y) - 12, 26, 26); ctx.fillStyle = col(1); ctx.fillRect(Math.round(x) - 14, Math.round(y) - 14, 26, 26); ctx.fillStyle = col(0.8); for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(x) - 10 + k * 8, Math.round(y) - 14, 1, 9); }
    };
    if (s.t < TOSS) {
      // up it goes, slowing as it climbs; the hand that threw it drops away
      const u = s.t / TOSS, y = from.y - 128 * Math.sin(u * Math.PI * 0.5);
      if (u < 0.5) { const hy = from.y + 20 + u * 90; ctx.fillStyle = col(0.72); ctx.fillRect(from.x - 17, hy - 5, 40, 12); ctx.fillStyle = col(1); ctx.fillRect(from.x - 19, hy - 7, 40, 12); }
      drawBall(from.x, y, 14, s.spin);
      return;
    }
    const w = s.t - TOSS;
    if (w < SWING) {
      // the swing: the arm comes up from the corner and meets the ball at the top
      const u = w / SWING, ax = from.x + 78, ay = H + 40, fx = ax + (peak.x - ax) * u, fy = ay + (peak.y + 18 - ay) * u;
      drawBall(peak.x, peak.y, 14, s.spin);
      arm(fx, fy, ax, ay, true);
      return;
    }
    // it is hit: the fist holds a moment, a flash, and the ball flies at the target
    const f = (s.t - TOSS - SWING) / SERVE;
    if (f < 0.22) arm(peak.x + 2, peak.y + 18, from.x + 78, H + 40, true);
    if (f < 0.3) {
      ctx.globalAlpha = 1 - f / 0.3; ctx.fillStyle = '#ffffff';
      const k = Math.round(14 * (1 - f / 0.3)) + 3; ctx.fillRect(peak.x - k, peak.y - 1, k * 2 + 1, 3); ctx.fillRect(peak.x - 1, peak.y - k, 3, k * 2 + 1);
      ctx.globalAlpha = 1;
    }
    const at = (u) => ({ x: peak.x + (to.x - peak.x) * u, y: peak.y + (to.y - peak.y) * u - Math.sin(Math.min(u, 1) * Math.PI) * 14, r: 14 * (1 - u) + 3 * u });
    if (f <= 1) {
      for (let k = 3; k >= 1; k--) { const g = at(Math.max(0, f - k * 0.07)); drawBall(g.x, g.y, g.r, s.spin - k * 0.5, 0.22 - k * 0.04); }   // the streak behind it
      const b = at(f); drawBall(b.x, b.y, b.r, s.spin);
    }
  }

  _shot(ctx) {
    const { from, to, t } = this.shot;
    if (t < FLY) {
      // the ring: wide where it leaves you, closing to a point as it reaches the target
      const u = t / FLY, e = u * u;
      const cx = from.x + (to.x - from.x) * e, cy = from.y + (to.y - from.y) * e, r = 62 * (1 - e) + 3;
      // the beam behind it
      const dx = cx - from.x, dy = cy - from.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
      ctx.fillStyle = '#ff2a3c';
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(from.x + (dx * i) / n) - 1, Math.round(from.y + (dy * i) / n) - 1, 3, 3);
      ctx.fillStyle = '#ffe9ec';
      for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(from.x + (dx * i) / n), Math.round(from.y + (dy * i) / n), 1, 1);
      ring(ctx, cx, cy, r, '#ff2a3c', 3);
      ring(ctx, cx, cy, r * 0.68, '#ff8a96', 2);
      ring(ctx, cx, cy, r * 0.36, '#ffffff', 2);
      return;
    }
    // the bang: a white flash, and rings bursting back out
    const u = (t - FLY) / BLAST;
    ctx.globalAlpha = clamp(1 - u, 0, 1);
    if (u < 0.3) { ctx.fillStyle = '#ffffff'; const k = Math.round(10 * (1 - u / 0.3)) + 3; ctx.fillRect(to.x - k, to.y - k, k * 2 + 1, k * 2 + 1); }
    ring(ctx, to.x, to.y, 5 + u * 34, '#fff6c8', 3);
    ring(ctx, to.x, to.y, 3 + u * 22, '#ff8a3c', 2);
    ring(ctx, to.x, to.y, 2 + u * 12, '#ff2a3c', 2);
    ctx.globalAlpha = 1;
  }

  _finger(ctx, time, skin) {
    const p = this.poke;
    const f = p.t < REACH ? p.t / REACH : p.t < REACH + HOLD ? 1 : clamp(1 - (p.t - REACH - HOLD) / BACK, 0, 1);
    const tx = p.from.x + (p.to.x - p.from.x) * f, ty = p.from.y + (p.to.y - p.from.y) * f;
    const dx = tx - p.from.x, dy = ty - p.from.y, len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / 2));
    const col = (k) => `rgb(${Math.round(skin[0] * k)},${Math.round(skin[1] * k)},${Math.round(skin[2] * k)})`;
    // Seen from behind the camera: fat where it is near you, thin where it is far away.
    const wide = (i) => Math.max(5, Math.round(38 - 33 * (i / n)));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(p.from.x + (dx * i) / n), y = Math.round(p.from.y + (dy * i) / n), w = wide(i), h = w >> 1;
      ctx.fillStyle = col(0.7); ctx.fillRect(x - h + 2, y - h + 2, w, w);          // the shaded side
    }
    for (let i = 0; i <= n; i++) {
      const x = Math.round(p.from.x + (dx * i) / n), y = Math.round(p.from.y + (dy * i) / n), w = wide(i), h = w >> 1;
      const u = i / n, crease = Math.abs(u - 0.34) < 0.012 || Math.abs(u - 0.6) < 0.01 || Math.abs(u - 0.8) < 0.008;
      ctx.fillStyle = this.poopy && u > 0.8 ? (u > 0.86 ? '#5a3a26' : '#7a5232') : col(crease ? 0.78 : 1);   // (a poop finger is brown at the far end)
      ctx.fillRect(x - h, y - h, w, w);
    }
    // the tip: a grubby nail (or, once it has been in something, a blob of that)
    const x = Math.round(tx), y = Math.round(ty);
    if (this.poopy) {
      ctx.fillStyle = '#5a3a26'; ctx.fillRect(x - 4, y - 5, 9, 8);
      ctx.fillStyle = '#7a5232'; ctx.fillRect(x - 2, y - 7, 5, 2); ctx.fillRect(x - 1, y - 8, 2, 1);
    } else {
      ctx.fillStyle = col(1); ctx.fillRect(x - 3, y - 4, 7, 7);
      ctx.fillStyle = '#f3e3cf'; ctx.fillRect(x - 2, y - 4, 5, 3);
      ctx.fillStyle = '#6b5a1e'; ctx.fillRect(x - 2, y - 5, 5, 1);
    }
    // the smell: green wiggles coming off the end (brown-green, and more of it, off a poop finger)
    ctx.fillStyle = this.poopy ? '#b8a23c' : '#a4d93c';
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 8; j++) {
        const u = (time * 1.6 + k * 0.27 + j * 0.05) % 1;
        ctx.globalAlpha = clamp(1 - u, 0, 1) * 0.9;
        ctx.fillRect(x - 9 + k * 6 + Math.round(Math.sin(u * 9 + k * 2) * 2), y - 7 - Math.round(u * 18) - j, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}
