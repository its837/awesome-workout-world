// The family's dogs. A dog seen from behind, running: used both when a dog is the
// player (they just run the trail, no bike, no skis) and as company on everybody's
// rides. As company they behave the way they do on a real walk: they turn up out of
// the trees, trot alongside for a while, vanish again, and about once a mile one of
// them has to stop.
import { HORIZON } from './config.js';
import { C, Frames, poseOf, posePhase } from './sprites.js';
import { TAU } from './util.js';
import { drawText } from './font.js';

const DASH = 0.85;      // seconds a dog takes to get ahead of you before a poop break

export const COATS = {
  // big fawn mastiff with a dark mask and dark ears
  mastiff: { fur: [214, 170, 118], furD: [176, 132, 90], ear: [88, 62, 50], paw: [176, 132, 90], mask: [72, 54, 48], chin: null, k: 0.82, tail: 0.07 },
  // black lab with white socks and a white chin
  lab: { fur: [46, 46, 58], furD: [28, 28, 36], ear: [28, 28, 36], paw: [246, 246, 250], mask: [34, 34, 44], chin: [246, 246, 250], k: 0.7, tail: 0.1 },
};
const NOSE = [20, 18, 22], TONGUE = [238, 124, 136];

/**
 * A dog's coat: its breed's colours, with anything in look.coat laid over them (see web/profiles.js).
 * fur / furD body and its shade, head (if not the body's colour), mask the muzzle, ear, paw,
 * chin (white chin and chest), stripe (brindle), blaze (a white stripe up the face),
 * patch (dark round the eyes), k size, tail thickness.
 */
export function coatOf(look = {}) {
  const base = COATS[look.breed] || COATS.mastiff;
  return look.coat ? Object.assign({}, base, look.coat) : base;
}

function dogTools(p, cx, ground, k) {
  const X = (x) => cx + x * k, Y = (y) => ground - y * k;
  return {
    E: (x, y, rx, ry, c) => p.ell(X(x), Y(y), rx * k, ry * k, c),
    L: (x1, y1, x2, y2, th, c) => p.line(X(x1), Y(y1), X(x2), Y(y2), th * k, c),
    R: (x, y, w, h, c) => p.rect(X(x), Y(y + h), w * k, h * k, c),
    PG: (pts, c) => p.poly(pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v))), c),
  };
}

/** A dog standing and looking at you, tail going. w: a looping angle for the wag and the hat. */
export function drawDogFront(p, cx, ground, coat, w, jacket) {
  const { E, L, R, PG } = dogTools(p, cx, ground, coat.k);
  const wag = 0.07 * Math.sin(w * 2), flop = 0.03 * Math.sin(w);
  const mask = coat.mask || coat.furD;
  L(0.18, 0.62, 0.38 + wag, 0.9, coat.tail, coat.fur);
  for (const sd of [-1, 1]) E(sd * 0.25, 0.09, 0.09, 0.06, coat.furD);
  for (const sd of [-1, 1]) {
    L(sd * 0.15, 0.6, sd * 0.155, 0.11, 0.145, sd < 0 ? coat.fur : coat.furD);
    E(sd * 0.155, 0.055, 0.1, 0.06, coat.paw);
  }
  E(0, 0.6, 0.29, 0.3, coat.fur);
  if (coat.chin) E(0, 0.46, 0.08, 0.1, coat.chin);
  if (coat.stripe) for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) L(sd * (0.2 + i * 0.03), 0.36 + i * 0.08, sd * (0.27 - i * 0.01), 0.44 + i * 0.08, 0.03, coat.stripe);
  E(0, 0.74, 0.3, 0.2, jacket);                                  // the sweater
  R(-0.22, 0.86, 0.44, 0.05, jacket.map((v) => Math.min(255, v * 1.25 + 16)));
  E(-0.26, 1.05, 0.085, 0.18, coat.ear); E(0.26, 1.05, 0.085, 0.18, coat.ear);
  E(0, 1.1, 0.245, 0.225, coat.head || coat.fur);
  R(-0.07, 1.25, 0.14, 0.016, coat.head ? coat.fur : coat.furD); R(-0.045, 1.215, 0.09, 0.016, coat.head ? coat.fur : coat.furD);   // worried forehead
  if (coat.stripe) for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) L(sd * (0.13 + i * 0.06), 1.26 - i * 0.04, sd * (0.19 + i * 0.04), 1.17 - i * 0.05, 0.028, coat.stripe);
  if (coat.blaze) R(-0.035, 1.06, 0.07, 0.25, coat.blaze);                               // a white stripe up the face
  if (coat.patch) { E(-0.11, 1.155, 0.078, 0.07, coat.patch); E(0.105, 1.155, 0.078, 0.07, coat.patch); }   // dark round the eyes
  E(0, 0.99, 0.155, 0.125, mask);
  E(-0.085, 0.95, 0.08, 0.085, mask); E(0.085, 0.95, 0.08, 0.085, mask);
  if (coat.chin) E(0, 0.885, 0.09, 0.045, coat.chin);
  E(0, 0.9, 0.04, 0.05, TONGUE);
  E(0, 1.045, 0.06, 0.042, NOSE);
  R(-0.135, 1.13, 0.055, 0.055, C.coal); R(0.08, 1.13, 0.055, 0.055, C.coal);
  R(-0.125, 1.165, 0.02, 0.02, C.white); R(0.09, 1.165, 0.02, 0.02, C.white);
  PG([-0.15, 1.27, 0.15, 1.27, 0.18, 1.4, 0.28, 1.36 + flop, 0.06, 1.52, -0.07, 1.46], C.red);
  R(-0.17, 1.24, 0.34, 0.07, C.white);
  E(0.3, 1.34 + flop, 0.065, 0.065, C.white);
}

/** A dog from the side, heading right. ph: trot phase, or null to stand still. squat: the poop break. */
export function drawDogSide(p, cx, ground, coat, ph, w, jacket, squat) {
  const { E, L, R, PG } = dogTools(p, cx, ground, coat.k);
  const trot = ph != null && !squat, s = trot ? Math.sin(ph) : 0, c = trot ? Math.cos(ph) : 0;
  const bob = trot ? 0.025 * Math.sin(ph * 2) : 0, flop = 0.03 * Math.sin(w);
  const mask = coat.mask || coat.fur, jacketL = jacket.map((v) => Math.min(255, v * 1.25 + 16));
  const leg = (x, top, sw, lift, col, th) => {
    const fx = x + 0.17 * sw, fy = 0.07 + 0.07 * Math.max(0, lift);
    L(x, top + bob, fx, fy + 0.04, th, col);
    E(fx + 0.035, fy, 0.09, 0.052, coat.paw);
  };
  if (squat) {
    // The poop break: haunches right down, back rounded, hind feet tucked forward under
    // the body, front legs braced, tail straight up. (The same moment drawDog shows from behind.)
    L(0.3, 0.6, 0.37, 0.11, 0.12, coat.furD); E(0.41, 0.07, 0.09, 0.052, coat.paw);         // far front leg
    L(-0.36, 0.4, -0.14, 0.12, 0.14, coat.furD); E(-0.09, 0.07, 0.09, 0.052, coat.paw);     // far hind leg, folded
    L(-0.5, 0.52, -0.58, 1.0 + 0.03 * Math.sin(w * 2), coat.tail, coat.fur);                // tail up
    E(0.1, 0.7, 0.4, 0.22, coat.fur);                              // chest and ribs
    E(-0.17, 0.64, 0.3, 0.25, coat.fur);                           // the rounded back
    E(-0.35, 0.45, 0.2, 0.22, coat.fur);                           // haunches, nearly on the snow
    E(0.04, 0.57, 0.3, 0.1, coat.furD);
    if (coat.stripe) for (let i = 0; i < 3; i++) L(-0.46 + i * 0.08, 0.74 - i * 0.02, -0.4 + i * 0.08, 0.5, 0.03, coat.stripe);
    L(0.34, 0.8, 0.52, 1.0, 0.3, coat.fur);                        // neck
    E(0.06, 0.74, 0.3, 0.235, jacket);                             // the sweater
    R(0.27, 0.63, 0.07, 0.3, jacketL);
    L(0.36, 0.6, 0.43, 0.11, 0.135, coat.fur); E(0.47, 0.07, 0.09, 0.052, coat.paw);        // near front leg
    L(-0.32, 0.38, -0.06, 0.12, 0.16, coat.fur); E(0, 0.07, 0.1, 0.055, coat.paw);          // near hind leg, folded
  } else {
    // the legs on the far side (diagonal pairs move together, as in a trot)
    leg(0.3, 0.62, -s, -c, coat.furD, 0.12);
    leg(-0.33, 0.62, s, c, coat.furD, 0.13);
    L(-0.46, 0.8 + bob, -0.68, 1.0 + bob + 0.09 * Math.sin(w * 2), coat.tail, coat.fur);
    E(0, 0.7 + bob, 0.48, 0.225, coat.fur);
    E(-0.04, 0.6 + bob, 0.4, 0.12, coat.furD);
    E(-0.36, 0.7 + bob, 0.16, 0.2, coat.fur);                       // haunch
    if (coat.stripe) {
      for (let i = 0; i < 3; i++) L(-0.47 + i * 0.07, 0.84 + bob, -0.42 + i * 0.07, 0.6 + bob, 0.03, coat.stripe);
      for (let i = 0; i < 2; i++) L(0.38 + i * 0.07, 0.98 + bob, 0.44 + i * 0.07, 0.8 + bob, 0.03, coat.stripe);
    }
    L(0.34, 0.8 + bob, 0.52, 1.0 + bob, 0.3, coat.fur);             // neck
    E(0.02, 0.73 + bob, 0.31, 0.235, jacket);                       // the sweater
    R(0.24, 0.62 + bob, 0.07, 0.3, jacketL);
    leg(0.34, 0.62, s, c, coat.fur, 0.135);
    leg(-0.3, 0.62, -s, -c, coat.fur, 0.15);
  }
  E(0.58, 1.07 + bob, 0.2, 0.18, coat.head || coat.fur);
  E(0.77, 1.0 + bob, 0.135, 0.1, mask);
  E(0.74, 0.94 + bob, 0.1, 0.06, mask);
  if (coat.chin) E(0.74, 0.905 + bob, 0.075, 0.03, coat.chin);
  if (trot) E(0.8, 0.9 + bob, 0.03, 0.045, TONGUE);
  E(0.885, 1.035 + bob, 0.042, 0.036, NOSE);
  if (coat.patch) E(0.65, 1.12 + bob, 0.075, 0.065, coat.patch);
  R(0.63, 1.1 + bob, 0.048, 0.048, C.coal);
  R(0.655, 1.13 + bob, 0.018, 0.018, C.white);
  E(0.46, 1.03 + bob - 0.02 * s, 0.08, 0.17, coat.ear);
  PG([0.44, 1.21 + bob, 0.72, 1.21 + bob, 0.66, 1.36 + bob, 0.5, 1.45 + bob, 0.32, 1.37 + bob + flop, 0.4, 1.29 + bob], C.red);
  R(0.42, 1.18 + bob, 0.32, 0.07, C.white);
  E(0.3, 1.35 + bob + flop, 0.065, 0.065, C.white);
}

/**
 * Draw a running dog into a Pix. cx / ground are where its feet-centre sits in the
 * Pix (metres); ph is the stride phase, w a looping angle for the things that wag and
 * flop (0..2 pi once a second), jacket its sweater.
 */
export function drawDog(p, cx, ground, coat, ph, w, jacket, squat) {
  const k = coat.k;
  const X = (x) => cx + x * k, Y = (y) => ground - y * k;
  const E = (x, y, rx, ry, c) => p.ell(X(x), Y(y), rx * k, ry * k, c);
  const L = (x1, y1, x2, y2, th, c) => p.line(X(x1), Y(y1), X(x2), Y(y2), th * k, c);
  const R = (x, y, w, h, c) => p.rect(X(x), Y(y + h), w * k, h * k, c);
  const PG = (pts, c) => p.poly(pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v))), c);
  // squatting: legs still, haunches down, tail straight up
  const s = squat ? 0 : Math.sin(ph), bob = squat ? -0.13 : 0.035 * Math.sin(ph * 2), spread = squat ? 0.08 : 0;
  const flop = 0.03 * Math.sin(w + ph);

  // front legs are further away, so they sit higher and read a little shorter
  for (const sd of [-1, 1]) {
    const lift = 0.1 * Math.max(0, sd * s);
    L(sd * 0.16, 0.66 + bob, sd * 0.17, 0.3 + lift, 0.11, coat.furD);
    E(sd * 0.17, 0.26 + lift, 0.07, 0.05, coat.paw);
  }
  for (const sd of [-1, 1]) {
    const lift = 0.16 * Math.max(0, -sd * s);
    L(sd * 0.2, 0.66 + bob, sd * (0.23 + spread), 0.12 + lift, 0.15, coat.fur);
    E(sd * (0.235 + spread), 0.06 + lift, 0.09, 0.065, coat.paw);
  }
  E(0, 0.74 + bob, 0.33, 0.27, coat.fur);
  E(0.1, 0.78 + bob, 0.2, 0.2, coat.furD);
  if (coat.stripe) for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) L(sd * (0.12 + i * 0.07), 0.82 + bob, sd * (0.18 + i * 0.06), 0.6 + bob, 0.03, coat.stripe);
  E(0, 0.94 + bob, 0.3, 0.17, jacket);                       // the sweater
  E(0, 0.99 + bob, 0.25, 0.05, jacket.map((v) => Math.min(255, v * 1.25 + 16)));
  E(0, 1.07 + bob, 0.24, 0.17, coat.fur);
  E(0, 1.27 + bob, 0.2, 0.17, coat.head || coat.fur);
  E(-0.2, 1.22 + bob + 0.025 * s, 0.07, 0.13, coat.ear);
  E(0.2, 1.22 + bob - 0.025 * s, 0.07, 0.13, coat.ear);
  // Santa hat
  PG([-0.14, 1.38 + bob, 0.14, 1.38 + bob, 0.17, 1.5 + bob, 0.27, 1.47 + bob + flop, 0.06, 1.62 + bob, -0.07, 1.56 + bob], C.red);
  R(-0.16, 1.35 + bob, 0.32, 0.07, C.white);
  E(0.29, 1.45 + bob + flop, 0.065, 0.065, C.white);
  // the tail goes on top: it is nearest the camera, and it never stops
  L(0, 0.92 + bob, squat ? 0.05 : 0.28 * Math.sin(w * 2), (squat ? 1.4 : 1.27) + bob, coat.tail, coat.fur);
}

const BOX_W = 1.4, BOX_H = 1.5;

/** A dog that keeps the rider company, when it feels like it. */
export class Companion {
  /** opts: { id, coat (see coatOf) or breed, jacket, name, side: 1 right or -1 left, keen: 0..1 how much of the time it is around } */
  constructor(opts) {
    this.coat = opts.coat || COATS[opts.breed] || COATS.mastiff;
    this.jacket = opts.jacket;
    this.id = opts.id || '';
    this.name = opts.name || 'THE DOG';
    this.meters = 0;          // how far it has run beside the rider on this outing (added up by the ride)
    this.poops = 0;           // and how many times it has had to stop
    this.sprinkles = 0;       // of which sprinkle power poops
    this.sparkly = false;
    this.poopy = opts.poopy || 1;   // how often it needs to, next to another dog (look.poop in profiles.js)
    this.side = opts.side || 1;
    this.keen = opts.keen == null ? 0.5 : opts.keen;
    this.home = opts.home || 1.5;   // metres out from the rider when alongside
    this.ph = Math.random() * 6;
    this.t = Math.random() * 10;
    // starts off in the trees and turns up in its own time
    this.ox = this.side * 14;   // metres to the side of the rider
    this.dz = 4;                // metres ahead (+) or behind (-) of the rider
    this.tx = this.ox; this.tz = this.dz;
    this.state = 'away';
    this.timer = 2 + Math.random() * (30 - 22 * this.keen);
    this.squat = false;
    this.loyal = false;       // an advent gift: today this dog stays right beside you
    this.benched = false;     // the ride has asked it to keep away for now (too many about at once)
    this.pile = null;         // what it left behind, until the rider has passed it
    this.frames = new Frames(200);
  }

  get present() { return this.state === 'with'; }
  /**
   * Nature calls. The dog bolts on ahead (further the faster you are going), stops and
   * squats, and you come up to it: the poop drops on the snow just as you get there, and
   * you pass it. So the whole thing is seen at any speed. False if the dog is not around.
   */
  poop(sparkly) {
    if (this.state !== 'with') return false;
    this.state = 'poop'; this.stage = 'dash'; this.timer = 0; this.squat = false; this.poops++;
    this.from = this.dz; this.lead = null; this.dropped = false; this.after = 0;
    this.sparkly = !!sparkly;
    if (sparkly) this.sprinkles++;
    return true;
  }
  /** Test control: come here now if away, or do the next thing if here. */
  nudge() { this.timer = 0; }

  update(dt, speed) {
    this.t += dt;
    const s = this.side;
    if (this.pile) {
      const q = this.pile;
      q.dz -= speed * dt; q.t += dt;
      if (q.drop > 0) q.drop = Math.max(0, q.drop - dt * 1.3);     // it falls the last little way
      if (q.dz < -7) this.pile = null;
    }
    if (this.state === 'poop') {
      this.timer += dt;
      if (this.stage === 'dash') {
        // on ahead, far enough that it has done before you get there
        if (this.lead == null) this.lead = Math.max(3, Math.min(34, 2.4 + speed * 1.9));
        const u = Math.min(1, this.timer / DASH), e = 1 - (1 - u) * (1 - u);
        this.dz = this.from + (this.lead - this.from) * e;
        this.ph += dt * 24;
        if (u >= 1) { this.stage = 'squat'; this.timer = 0; this.squat = true; }
        return;
      }
      this.dz -= speed * dt;                                        // it stays put: you are the one moving
      // it lets go about half a second before you reach it, so you see it land and then go by
      if (!this.dropped && ((this.dz <= 1.5 + speed * 0.55 && this.timer > 0.7) || this.timer > 2.6 || this.dz < 0.6)) {
        this.dropped = true; this.plop = true;                      // (the ride plays the sound, then clears plop)
        this.pile = { ox: this.ox, dz: this.dz - 0.35, sparkly: this.sparkly, drop: 0.32, t: 0 };
      }
      if (this.dropped && ((this.after += dt) > 0.55 || this.dz < -1.5)) {
        this.squat = false; this.stage = '';
        this.state = 'returning'; this.tx = s * this.home; this.tz = 0;
      }
      return;
    }
    this.ph += dt * (4.5 + Math.min(10, speed * 1.3));
    this.timer -= dt;
    if (this.benched && this.state === 'with') this.timer = -1;     // it wanders off the next chance it gets
    if (this.state === 'with') {
      this.tx = s * (this.home + 0.18 * Math.sin(this.t * 0.7));
      this.tz = 0.5 * Math.sin(this.t * 0.45);
      if (this.timer < 0 && speed > 0.6 && !this.loyal) {
        // something smelled interesting
        const r = Math.random();
        if (r < 0.25) { this.tx = s * 1.7; this.tz = -6.4; }                       // drops back out of the bottom of the frame
        else if (r < 0.8) { this.tx = s * 14; this.tz = 1 + Math.random() * 4; }   // off into the trees
        else { this.tx = s * 0.9; this.tz = 46; }                                  // bolts ahead up the trail
        this.state = 'leaving';
      }
    } else if (this.state === 'away') {
      if (this.timer < 0 && !this.benched) { this.state = 'returning'; this.tx = s * this.home; this.tz = 0; }
    }
    const rate = this.state === 'returning' ? 2.2 : this.state === 'leaving' ? 1.1 : 3;
    this.ox += (this.tx - this.ox) * Math.min(1, dt * rate);
    this.dz += (this.tz - this.dz) * Math.min(1, dt * rate);
    const there = Math.abs(this.tx - this.ox) < 0.25 && Math.abs(this.tz - this.dz) < 0.6;
    if (this.state === 'leaving' && there) { this.state = 'away'; this.timer = 6 + Math.random() * (50 - 36 * this.keen); }
    else if (this.state === 'returning' && there) { this.state = 'with'; this.timer = 12 + Math.random() * (14 + 30 * this.keen); }
  }

  /** True when the dog is nearer the camera than the rider (so it must be drawn after them). */
  get inFront() { return this.dz < 0; }

  /** x, baseY, ppm describe the rider; the dog is placed relative to them in perspective. */
  draw(ctx, x, baseY, ppm, riderDist, amb, env) {
    const place = (ox, dz) => {
      const rel = riderDist + dz;
      if (rel < 2.4) return null;                          // behind the camera
      const dp = (ppm * riderDist) / rel;                  // pixels per metre at that depth
      return { dp, sx: x + ox * dp, sy: HORIZON + ((baseY - HORIZON) * riderDist) / rel };
    };
    const pile = () => {
      const q = this.pile && place(this.pile.ox, this.pile.dz);
      if (q) {
        const r = Math.max(2, Math.round(q.dp * 0.12)), px = Math.round(q.sx), py = Math.round(q.sy - this.pile.drop * q.dp);
        this.pile.box = { x: px - r, y: py - Math.round(r * 1.8), w: r * 2, h: Math.round(r * 1.8) };   // (for the tools: ride.js _targetAt)
        ctx.fillStyle = '#5a3a26';
        ctx.fillRect(px - r, py - r, r * 2, r);
        ctx.fillRect(px - Math.round(r * 0.6), py - Math.round(r * 1.8), Math.round(r * 1.2), r);
        if (this.pile.sparkly) ['#ff5c8a', '#5cd6ff', '#fff23f', '#7dff3f', '#c77dff'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(px - r + Math.round((i * 0.45 + 0.1) * r), py - Math.round(r * (0.5 + (i % 3) * 0.5)), Math.max(1, r >> 2), Math.max(1, r >> 2)); });
        if (this.pile.t < 0.7) drawText(ctx, 'PLOP!', px, py - Math.round(r * 2.2) - 9 - Math.round(this.pile.t * 10), { align: 'center', color: '#fff6c8' });
      }
    };
    // what it left is drawn behind the dog if it lies further up the trail, in front if nearer
    const near = this.pile && this.pile.dz < this.dz;
    if (this.pile && !near) pile();
    const q = place(this.ox, this.dz);
    if (!q || q.sx < -60 || q.sx > ctx.canvas.width + 60 || q.dp < 3) { if (near) pile(); return; }
    const dp = q.dp, sx = q.sx, sy = q.sy;
    const res = Math.round(Math.min(dp, 64));            // cap the art resolution when very close
    const pose = this.squat ? 0 : poseOf(this.ph, 16), wag = Math.floor(this.t * 4) % 4;
    const frame = this.frames.get(env, res + '|' + pose + '|' + wag + (this.squat ? '|s' : ''), BOX_W, BOX_H, res, amb,
      (p) => drawDog(p, BOX_W / 2, BOX_H, this.coat, posePhase(pose, 16), (wag / 4) * TAU, this.jacket, this.squat));
    const dw = Math.round(BOX_W * dp), dh = Math.round(BOX_H * dp);
    ctx.fillStyle = 'rgba(6,14,46,0.3)';
    ctx.fillRect(Math.round(sx - dw * 0.28), Math.round(sy) - 1, Math.round(dw * 0.56), 2);
    ctx.drawImage(frame, Math.round(sx - dw / 2), Math.round(sy) - dh, dw, dh);
    if (this.squat) drawText(ctx, this.sparkly ? `${this.name}: SPRINKLE POWER POOP!` : `${this.name} IS GOING POOP`, sx, Math.max(46, Math.round(sy - dh * 0.86) - 9), { align: 'center', color: '#fff6c8' });
    else if (this.state === 'poop') drawText(ctx, `${this.name} HAS TO GO!`, sx, Math.max(46, Math.round(sy - dh * 0.86) - 9), { align: 'center', color: '#fff6c8' });
    if (near) pile();
  }
}
