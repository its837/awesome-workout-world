// The on-screen you: a fat-biker or a splitboarder skinning uphill, seen from behind.
// Redrawn every frame from simple shapes so the legs follow the real cadence.
// Also draws whatever you have picked up along the way: trail buddies and sparkle.
import { C, LIGHT_COLS, LIGHT_CSS, glowCanvas, Frames, poseOf, posePhase } from './sprites.js';
import { mix3, TAU } from './util.js';
import { DOG, FROG, PANTS } from './portraits.js';
import { RIDER_DIST, HORIZON } from './config.js';
import { ART } from './rewards.js';
import { drawDog, COATS, Companion } from './dogs.js';
import { Buddies } from './buddies.js';

export const BW = 2.0, BH = 2.4;
const METAL = [70, 76, 96], TIRE = [26, 28, 38], TIRE_L = [62, 66, 86];
const POLE = [190, 196, 214], POLE_D = [120, 128, 150];
const ANTLER = [176, 128, 82];
// The back view was drawn for somebody 180 cm tall; everybody is scaled from that.
const ART_HEIGHT = 180;
const HAIR_FALL = { bob: 0.15, shoulder: 0.27, long: 0.47 };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// where fairy lights sit on the body (metres from the ground-centre): [x, y]
const POSES = 24, WIGS = 4;   // the pedal stroke (or stride) in 24 poses; scarf, pom-pom and flag in 4
const LIGHT_SPOTS = [[-0.25, 1.48], [-0.12, 1.52], [0.02, 1.53], [0.14, 1.51], [0.25, 1.47], [-0.22, 1.24], [0.22, 1.24], [-0.17, 1.02], [0.0, 1.0], [0.17, 1.02], [0, 0.72]];

export class Rider {
  /** look: what lookOf() in portraits.js returns, plus { jacket, dogs: [what Companion takes] } */
  constructor(mode, look = {}) {
    this.mode = mode;
    this.phase = 0;
    this.time = 0;
    this.lean = 0;
    this.species = look.species || 'human';
    this.coat = look.coat || COATS[look.breed] || COATS.mastiff;
    // the family's dogs come and go on every ride, if that is switched on
    this.dogs = (look.dogs || []).map((d) => new Companion(d));
    this.hair = look.hair || [70, 50, 40];
    this.style = look.style || 'short';
    this.curly = !!look.curly;
    this.skin = look.skin || C.skin;
    this.hat = look.hat || 'santa';
    this.hatCol = look.hatCol || look.jacket || C.red;
    this.K = (look.height || ART_HEIGHT) / ART_HEIGHT;    // how tall, against the art
    this.wide = look.b || 1;                               // how broad
    this.pants = look.pants || PANTS;
    this.pantsD = this.pants.map((v) => v * 0.74);
    this.jacket = look.jacket || [214, 52, 58];
    this.jacketD = this.jacket.map((v) => v * 0.7);
    this.packCol = [44, 120, 110];
    this.packL = this.packCol.map((v) => Math.min(255, v * 1.3));
    this.glove = this.species === 'dog' ? DOG.fur : this.species === 'frog' ? FROG.skin : [34, 36, 50];
    this.boot = this.species === 'dog' ? DOG.furD : this.species === 'frog' ? FROG.dark : [30, 32, 44];
    this.frames = new Frames(POSES * WIGS + 8);
    this.qph = 0;             // the phase of the pose being drawn
    this.wig = 0;             // looping angle for things that flutter
    this.spray = [];
    this.pack = new Buddies();  // trail buddies travelling with you (each arrives through an advent door)
    this.bling = {};          // { lights, antlers, flag, bells }
    this.jingle = false;      // set for one update each pedal stroke / step (for the bells)
  }

  /** hz: pedal revolutions (or stride cycles) per second. speed: m/s, used for snow spray. */
  update(dt, hz, speed, leanTarget) {
    const before = Math.floor(this.phase / Math.PI);
    this.phase += dt * hz * TAU;
    this.jingle = Math.floor(this.phase / Math.PI) !== before;
    this.time += dt;
    this.speed = speed;
    this.lean += ((leanTarget || 0) - this.lean) * Math.min(1, dt * 3);
    for (const d of this.dogs) d.update(dt, speed);
    this.pack.update(dt, speed, this.dogs.some((d) => d.side > 0 && d.state !== 'away'));
    if (this.mode === 'bike' && speed > 2) {
      const n = Math.min(3, (speed * dt * 4 + Math.random()) | 0);
      for (let i = 0; i < n; i++) this.spray.push({ x: (Math.random() - 0.5) * 6, y: -2, vx: (Math.random() - 0.5) * 30, vy: -18 - Math.random() * 26, life: 0.35 + Math.random() * 0.25 });
    }
    for (const s of this.spray) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 120 * dt; s.life -= dt; }
    if (this.spray.length) this.spray = this.spray.filter((s) => s.life > 0);
  }

  addBuddy(id) { this.pack.add(id); }
  /** A dog joins part-way through (its advent door has just opened). opts: what Companion takes. */
  addDog(opts) { const d = new Companion(opts); this.dogs.push(d); return d; }

  draw(ctx, x, baseY, ppm, env) {
    const amb = mix3(env.amb, [1, 1, 1], 0.42);
    // The rider is not drawn from scratch every frame: each pose is drawn once and remembered.
    const pose = poseOf(this.phase, POSES), wq = Math.floor(this.time * WIGS) % WIGS;
    const b = this.bling;
    const key = pose + '|' + wq + '|' + (b.antlers ? 1 : 0) + (b.flag ? 1 : 0) + (b.bells ? 1 : 0);
    const frame = this.frames.get(env, key, BW, BH, ppm, amb, (p) => this.paintPose(p, pose, wq));

    x = Math.round(x); baseY = Math.round(baseY);
    for (const d of this.dogs) if (!d.inFront) d.draw(ctx, x, baseY, ppm, RIDER_DIST, amb, env);
    this.pack.draw(ctx, x, baseY, ppm, amb, env, false);
    // contact shadow
    ctx.fillStyle = 'rgba(6,14,46,0.34)';
    ctx.fillRect(x - 15, baseY - 1, 30, 2);
    ctx.fillRect(x - 11, baseY - 2, 22, 1);
    ctx.fillRect(x - 11, baseY + 1, 22, 1);
    // snow spray
    if (this.spray.length) {
      ctx.fillStyle = 'rgba(236,244,255,0.85)';
      for (const s of this.spray) ctx.fillRect(Math.round(x + s.x), Math.round(baseY + s.y), 1, 1);
    }
    const shear = -this.lean * 0.1;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.drawImage(frame, -Math.round(frame.width / 2), -frame.height);
    ctx.restore();

    if (this.sled) this._sled(ctx, x, baseY, ppm, amb, env);
    for (const d of this.dogs) if (d.inFront) d.draw(ctx, x, baseY, ppm, RIDER_DIST, amb, env);

    if (this.bling.lights) {
      const t = this.time;
      ctx.globalCompositeOperation = 'lighter';
      LIGHT_SPOTS.forEach((spot, i) => {
        if (this.mode !== 'bike' && i === 10) return;
        const [lx, ly] = this._spot(spot, i);
        const sx = x + lx * ppm - shear * ly * ppm, sy = baseY - ly * ppm;
        ctx.globalAlpha = 0.5 * (0.55 + 0.45 * Math.sin(t * 3 + i * 1.9));
        ctx.drawImage(glowCanvas(LIGHT_COLS[i % 5]), sx - 6, sy - 6, 12, 12);
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      LIGHT_SPOTS.forEach((spot, i) => {
        if (this.mode !== 'bike' && i === 10) return;
        const [lx, ly] = this._spot(spot, i);
        ctx.fillStyle = LIGHT_CSS[i % 5];
        ctx.fillRect(Math.round(x + lx * ppm - shear * ly * ppm) - 1, Math.round(baseY - ly * ppm) - 1, 2, 2);
      });
    }
    this.pack.draw(ctx, x, baseY, ppm, amb, env, true);
  }

  /**
   * The tree sled (an advent thing): towed a couple of metres behind you, so it is nearer
   * the camera than you are. It swings a little wide on the bends and follows on two ropes.
   */
  _sled(ctx, x, baseY, ppm, amb, env) {
    const art = ART.sled, rel = RIDER_DIST - 1.9, dp = (ppm * RIDER_DIST) / rel;
    const ground = HORIZON + ((baseY - HORIZON) * RIDER_DIST) / rel;
    const res = Math.max(8, Math.round(dp / 4) * 4);
    const frame = this.frames.get(env, 'sled|' + res, art.uw, art.uh, res, amb, (p) => art.draw(p));
    const dw = Math.round(art.uw * dp), dh = Math.round(art.uh * dp);
    const sx = Math.round(x - this.lean * dp * 0.45 + Math.sin(this.time * 1.3) * 1.5), sy = Math.round(ground + Math.sin(this.phase) * 0.6);
    const hip = baseY - Math.round(ppm * (this.mode === 'bike' ? 0.75 : 0.95));
    ctx.fillStyle = 'rgba(226,214,180,0.9)';
    for (const sd of [-1, 1]) {                                     // the ropes, a pixel at a time
      const x0 = sx + sd * Math.round(dp * 0.3), y0 = sy - Math.round(dp * 0.2), x1 = x + sd * 3, n = Math.max(1, y0 - hip);
      for (let i = 0; i <= n; i += 1) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), y0 - i, 1, 1);
    }
    ctx.fillStyle = 'rgba(6,14,46,0.3)';
    ctx.fillRect(sx - Math.round(dw * 0.4), sy - 1, Math.round(dw * 0.8), 2);
    ctx.drawImage(frame, sx - Math.round(dw / 2), sy - dh, dw, dh);
  }

  /** Where a fairy light sits once the body has been scaled to this person. */
  _spot([lx, ly], i) {
    if (this.species === 'dog' || i === 10) return [lx, ly];
    const K = this.K;
    return [lx * K, this.mode === 'bike' ? this._seat() + (ly - 0.98) * K : ly * K];
  }
  /** Saddle height: the pedals stay put and the legs get longer. */
  _seat() { return 0.31 + 0.67 * this.K; }

  /** Drawing tools: x right and y up from the ground-centre, scaled by K, lifted by y0. */
  _tools(p, K, y0) {
    const X = BW / 2, Y = BH;
    return {
      p, K,
      R: (rx, ry, w, h, c) => p.rect(X + rx * K, Y - y0 - (ry + h) * K, w * K, h * K, c),
      E: (cx, cy, rx, ry, c) => p.ell(X + cx * K, Y - y0 - cy * K, rx * K, ry * K, c),
      L: (x1, y1, x2, y2, th, c) => p.line(X + x1 * K, Y - y0 - y1 * K, X + x2 * K, Y - y0 - y2 * K, th * K, c),
      PG: (pts, c) => { const q = pts.slice(); for (let i = 0; i < q.length; i += 2) { q[i] = X + q[i] * K; q[i + 1] = Y - y0 - q[i + 1] * K; } p.poly(q, c); },
    };
  }

  /** Paint one pose of the stride (0..POSES-1) and one flutter step (0..WIGS-1) into a BW x BH Pix. */
  paintPose(p, pose, wq) {
    this.qph = posePhase(pose, POSES);
    this.wig = (wq / WIGS) * TAU;
    this.blink = (wq & 1) === 0;
    // a dog just runs the trail: no bike, no skis
    if (this.species === 'dog') { drawDog(p, BW / 2, BH, this.coat, this.qph, this.wig, this.jacket); return; }
    if (this.mode === 'bike') this._biker(p); else this._skier(p);
  }

  _head(g, hx, hy) {
    const { R, E, L, PG } = g, w = this.wig;
    const flop = 0.03 * Math.sin(w + this.qph);
    if (this.species === 'dog') {
      R(hx - 0.06, 1.5 + hy, 0.12, 0.09, DOG.furD);
      E(hx, 1.66 + hy, 0.15, 0.145, DOG.fur);
      E(hx - 0.16, 1.6 + hy, 0.055, 0.11, DOG.ear); E(hx + 0.16, 1.6 + hy, 0.055, 0.11, DOG.ear);
    } else if (this.species === 'frog') {
      R(hx - 0.06, 1.5 + hy, 0.12, 0.09, FROG.dark);
      E(hx, 1.65 + hy, 0.165, 0.13, FROG.skin);
      E(hx - 0.14, 1.75 + hy, 0.06, 0.06, FROG.skin); E(hx + 0.14, 1.75 + hy, 0.06, 0.06, FROG.skin);
    } else {
      // the back of a head: what you can tell people apart by is their hair
      const st = this.style, hair = this.hair, hairD = hair.map((v) => v * 0.8), fall = HAIR_FALL[st] || 0;
      const sw = 0.018 * Math.sin(w + this.qph);
      R(hx - 0.05, 1.5 + hy, 0.1, 0.09, this.skin.map((v) => v * 0.86));
      E(hx, 1.66 + hy, 0.135, 0.14, st === 'bald' ? this.skin : st === 'buzz' ? mixc(hair, this.skin, 0.4) : hair);
      if (fall) {
        PG([hx - 0.15, 1.68 + hy, hx + 0.15, 1.68 + hy, hx + 0.165 + sw, 1.62 - fall + hy, hx - 0.165 + sw, 1.62 - fall + hy], hair);
        E(hx + sw, 1.62 - fall + hy, 0.165, 0.045, hair);
        R(hx - 0.07 + sw * 0.5, 1.6 - fall + hy, 0.03, fall, hairD); R(hx + 0.05 + sw * 0.5, 1.6 - fall + hy, 0.03, fall - 0.03, hairD);
        if (this.curly) for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) E(hx + sd * 0.16 + sw, 1.66 - (i / 4) * fall + hy, 0.045, 0.045, i % 2 ? hair : hairD);
      } else if (st === 'pony') {
        const tx = hx + 0.08 * Math.sin(w + this.qph);
        L(hx, 1.62 + hy, tx, 1.3 + hy, 0.1, hair);
        E(tx, 1.27 + hy, 0.05, 0.06, hair);
        R(hx - 0.05, 1.59 + hy, 0.1, 0.04, C.red);
      } else if (st === 'bun') {
        E(hx, 1.6 + hy, 0.09, 0.08, hair); E(hx + 0.02, 1.61 + hy, 0.05, 0.045, hairD);
      } else if (st === 'braids') {
        for (const sd of [-1, 1]) {
          L(hx + sd * 0.09, 1.62 + hy, hx + sd * 0.13 + sw, 1.22 + hy, 0.07, hair);
          R(hx + sd * 0.13 + sw - 0.04, 1.2 + hy, 0.08, 0.035, C.red);
        }
      } else if (this.curly && st !== 'bald') for (const sd of [-1, 1]) E(hx + sd * 0.13, 1.6 + hy, 0.045, 0.045, hairD);
    }
    L(hx + 0.04, 1.55 + hy, hx + 0.27 + 0.03 * Math.sin(w * 2), 1.43 + hy + 0.03 * Math.cos(w), 0.075, [70, 190, 120]);
    if (this.hat === 'beanie') {
      const col = this.hatCol;
      E(hx, 1.79 + hy, 0.16, 0.12, col);
      R(hx - 0.165, 1.7 + hy, 0.33, 0.075, col.map((v) => v * 0.74));
      E(hx, 1.93 + hy, 0.055, 0.055, C.white);
    } else if (this.hat === 'cap') {
      const col = this.hatCol;
      E(hx, 1.79 + hy, 0.16, 0.125, col);
      R(hx - 0.05, 1.7 + hy, 0.1, 0.03, col.map((v) => v * 0.62));     // the strap at the back
    } else if (this.hat !== 'none') {
      PG([hx - 0.14, 1.75 + hy, hx + 0.14, 1.75 + hy, hx + 0.18, 1.9 + hy, hx + 0.29, 1.86 + hy + flop, hx + 0.06, 2.04 + hy, hx - 0.08, 1.96 + hy], C.red);
      PG([hx + 0.04, 1.75 + hy, hx + 0.14, 1.75 + hy, hx + 0.18, 1.9 + hy, hx + 0.1, 1.98 + hy], C.redD);
      R(hx - 0.16, 1.71 + hy, 0.32, 0.08, C.white);
      E(hx + 0.31, 1.84 + hy + flop, 0.068, 0.068, C.white);
    }
    if (this.bling.antlers) {
      for (const sd of [-1, 1]) {
        L(hx + sd * 0.12, 1.76 + hy, hx + sd * 0.3, 2.06 + hy, 0.045, ANTLER);
        L(hx + sd * 0.2, 1.9 + hy, hx + sd * 0.38, 1.9 + hy, 0.04, ANTLER);
        L(hx + sd * 0.26, 2.0 + hy, hx + sd * 0.2, 2.16 + hy, 0.04, ANTLER);
      }
    }
  }

  /** g: the body's tools. bike: the bike's own (unscaled) tools, when there is one. */
  _extras(g, sway, bob, bike) {
    const { L, PG, E } = g, w = this.wig;
    if (this.species === 'dog') L(sway, 1.02 + bob, sway + 0.15 + 0.08 * Math.sin(w * 2), 1.24 + bob, 0.065, DOG.fur);
    if (this.bling.flag) {
      const fx = sway - 0.3, top = 2.24, f = 0.035 * Math.sin(w);
      L(sway - 0.16, 0.98 + bob, fx, top, 0.03, POLE);
      PG([fx, top, fx - 0.36, top - 0.1 + f, fx, top - 0.2], C.red);
      PG([fx, top - 0.065, fx - 0.2, top - 0.1 + f * 0.6, fx, top - 0.135], C.white);
    }
    if (this.bling.bells) {
      const sw = 0.02 * Math.sin(this.qph * 2);
      if (bike) { bike.E(-0.42 + sw, 1.14, 0.05, 0.05, C.gold); bike.E(0.42 + sw, 1.14, 0.05, 0.05, C.gold); }
      else { E(sway - 0.12 + sw, 1.0 + bob, 0.05, 0.05, C.gold); E(sway + 0.14 + sw, 1.0 + bob, 0.05, 0.05, C.gold); }
    }
  }

  _biker(p) {
    // the bike is one size; the rider is scaled about the saddle, which rises with their legs
    const K = this.K, b = this.wide, seat = this._seat(), lift = seat - 0.98;
    const bike = this._tools(p, 1, 0), g = this._tools(p, K, seat - 0.98 * K);
    const { R, E, L } = bike, ph = this.qph;
    const s = Math.sin(ph), bob = 0.012 * Math.sin(ph * 2);
    const by = (y) => seat + (y - 0.98) * K;       // a height on the body, in the bike's own metres
    // fat rear tyre with scrolling knobs
    R(-0.11, 0, 0.22, 0.7, TIRE);
    E(0, 0.7, 0.11, 0.07, TIRE);
    const off = ((ph / TAU) * 0.24) % 0.12;   // the knobs come round twice per pedal turn, so the poses loop
    for (let y = off; y < 0.68; y += 0.12) R(-0.11, y, 0.22, 0.035, TIRE_L);
    R(-0.025, 0.72, 0.05, 0.24 + lift, METAL);
    p.unlit = true;
    R(-0.045, 0.79, 0.09, 0.07, this.blink ? [255, 66, 54] : [150, 30, 30]);
    p.unlit = false;
    L(-0.4, 1.2, 0.4, 1.2, 0.05, METAL);
    const leg = (sd, fy) => {
      const col = sd < 0 ? this.pants : this.pantsD, knee = Math.min(seat + 0.03, fy + 0.42 * K), kx = sd * 0.22;
      R(sd * 0.21 - 0.1, fy - 0.06, 0.2, 0.035, METAL);
      L(sd * 0.12 * K, seat + bob, kx, knee, 0.16 * K, col);
      L(kx, knee, sd * 0.21, fy + 0.08, 0.13 * K, col);
      R(sd * 0.21 - 0.08, fy - 0.03, 0.16, 0.12, this.boot);
    };
    leg(-1, 0.31 + 0.17 * s);
    leg(1, 0.31 - 0.17 * s);
    R(-0.14, 0.94 + lift, 0.28, 0.07, [30, 30, 40]);
    g.E(0, 1.03 + bob, 0.21 * b, 0.13, this.pants);
    g.PG([-0.2 * b, 1.0 + bob, 0.2 * b, 1.0 + bob, 0.26 * b, 1.5 + bob, -0.26 * b, 1.5 + bob], this.jacket);
    g.PG([0.06 * b, 1.0 + bob, 0.2 * b, 1.0 + bob, 0.26 * b, 1.5 + bob, 0.11 * b, 1.5 + bob], this.jacketD);
    g.E(0, 1.5 + bob, 0.26 * b, 0.09, this.jacket);
    for (const sd of [-1, 1]) {
      const col = sd < 0 ? this.jacket : this.jacketD, sy = by(1.47 + bob);
      L(sd * 0.25 * b * K, sy, sd * 0.37, (sy + 1.23) / 2 + 0.03, 0.12 * K, col);
      L(sd * 0.37, (sy + 1.23) / 2 + 0.03, sd * 0.39, 1.23, 0.11 * K, col);
      E(sd * 0.39, 1.2, 0.065, 0.06, this.glove);
    }
    this._extras(g, 0, bob, bike);
    this._head(g, 0, bob);
  }

  _skier(p) {
    const g = this._tools(p, this.K, 0), b = this.wide;
    const { R, E, L, PG } = g, ph = this.qph;
    const s = Math.sin(ph), sway = 0.025 * s, bob = 0.016 * Math.cos(ph * 2);
    const fl = 0.2 + 0.07 * s, fr = 0.2 - 0.07 * s;
    const ski = (sd, fy) => {
      PG([sd * 0.125 - 0.05, fy + 0.04, sd * 0.125 + 0.05, fy + 0.04, sd * 0.14 + 0.065, fy - 0.2, sd * 0.14 - 0.065, fy - 0.2], [240, 150, 50]);
      R(sd * 0.14 - 0.065, fy - 0.2, 0.13, 0.035, [60, 60, 80]);
    };
    ski(-1, fl); ski(1, fr);
    const hand = (sd) => { const k = sd < 0 ? -s : s; return [sd * (0.36 * b) + sway, 1.06 + 0.07 * k + bob, k]; };
    for (const sd of [-1, 1]) {
      const [hx, hy, k] = hand(sd);
      const tx = sd * 0.44, ty = 0.15 + 0.1 * k;
      L(hx, hy, tx, ty, 0.035, POLE);
      R(tx - 0.05, ty + 0.05, 0.1, 0.03, POLE_D);
    }
    for (const sd of [-1, 1]) {
      const fy = sd < 0 ? fl : fr;
      L(sd * 0.1 + sway, 0.96 + bob, sd * 0.125, fy + 0.14, 0.16, sd < 0 ? this.pants : this.pantsD);
      R(sd * 0.125 - 0.08, fy, 0.16, 0.16, this.boot);
    }
    E(sway, 0.99 + bob, 0.21 * b, 0.13, this.pants);
    PG([-0.2 * b + sway, 0.96 + bob, 0.2 * b + sway, 0.96 + bob, 0.26 * b + sway, 1.5 + bob, -0.26 * b + sway, 1.5 + bob], this.jacket);
    PG([0.08 * b + sway, 0.96 + bob, 0.2 * b + sway, 0.96 + bob, 0.26 * b + sway, 1.5 + bob, 0.13 * b + sway, 1.5 + bob], this.jacketD);
    E(sway, 1.5 + bob, 0.26 * b, 0.09, this.jacket);
    R(-0.17 + sway, 1.04 + bob, 0.34, 0.4, this.packCol);
    R(-0.17 + sway, 1.36 + bob, 0.34, 0.09, this.packL);
    R(-0.03 + sway, 1.1 + bob, 0.06, 0.2, this.packL);
    for (const sd of [-1, 1]) {
      const [hx, hy] = hand(sd);
      const col = sd < 0 ? this.jacket : this.jacketD;
      L(sd * 0.25 * b + sway, 1.46 + bob, sd * 0.34 * b + sway, 1.26 + bob, 0.12, col);
      L(sd * 0.34 * b + sway, 1.26 + bob, hx, hy, 0.11, col);
      E(hx, hy, 0.065, 0.06, this.glove);
    }
    this._extras(g, sway, bob, null);
    this._head(g, sway, bob);
  }
}
