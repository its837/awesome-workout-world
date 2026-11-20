// Trail buddies: the animals that come out of the advent calendar and travel with you.
// Each one has a place of its own around you, in three dimensions (metres to the side,
// metres up, metres ahead), so they shrink as they get ahead of you and can leave the
// picture and come back.
//
// NOBODY DOES THE SAME THING ON A LOOP. Every buddy picks what to do next at random, for a
// random length of time, so two rides never look alike:
//
//   owl       flies the way you are going, so you see its back. It glides beside you (high
//             or low, near or far, a different spot each time), and now and then swoops up
//             the trail, crosses over your head, circles you, scouts far ahead, or goes off
//             into the dark for anything from a few seconds to a minute.
//   cardinal  flits round your hat, hovers just ahead, or darts off up the trail and back
//   fox       trots at your side; runs on ahead, drops back, swaps sides, noses at the trees
//   penguin   waddles at your wheel, and has to hurry to catch up
//   turkey    struts along a little way out, and says GOBBLE GOBBLE
//   kangaroo  hops, wide of everybody
import { Frames, poseOf, posePhase } from './sprites.js';
import { TAU, clamp } from './util.js';
import { HORIZON, RIDER_DIST } from './config.js';
import { ART } from './rewards.js';
import { drawText } from './font.js';

const AIR = { owl: true, cardinal: true };
// art is drawn at one of a few fixed sizes and scaled the last little bit on screen
const resFor = (dp) => Math.min(48, Math.pow(2, Math.round(Math.log2(Math.max(3, dp)) * 3) / 3));
const rand = (a, b) => a + Math.random() * (b - a);
/** A random time that is usually short and now and then long. */
const spell = (short, long) => short + Math.random() * Math.random() * (long - short);

class Buddy {
  constructor(id) {
    this.id = id;
    this.t = Math.random() * 10;
    this.ph = 0;
    this.ox = 0; this.oy = 0; this.dz = 0;
    this.flip = false;
    this.opts = null;
    this.frames = new Frames(240);   // remembered poses
    this.poses = id === 'cardinal' ? 8 : 16;
    this.says = null;        // words over its head for a moment: { text, t }
    this.spoke = '';         // set when it starts saying something (the ride plays the sound, then clears it)
  }
  get air() { return !!AIR[this.id]; }
  say(text, secs = 2.4) { this.says = { text, t: secs }; this.spoke = text; }
  /** TEST: do your next thing now. */
  poke() {}
}

/** The snowy owl. A list of places to fly to, one after another; when it runs out, pick the next thing to do. */
class Owl extends Buddy {
  constructor() {
    super('owl');
    this.side = Math.random() < 0.5 ? -1 : 1;
    this.ox = this.side * 6; this.oy = 10; this.dz = 3;       // arrives from above, out of the picture
    this.vx = 0;
    this.path = [];
    this.wait = 0;
    this.look = 0;
    this.nextLook = rand(20, 80);
    this.cruise(spell(14, 60));
  }
  /** Glide along with you for a while, at a spot of its own choosing (or the one given). */
  cruise(secs, spot) {
    this.mode = 'cruise'; this.wait = secs;
    this.spot = spot || { x: rand(1.3, 3.2), y: rand(1.5, 3.6), z: rand(1.6, 8) };
  }
  goTo(...stops) { this.mode = 'fly'; this.path = stops; }
  poke() { if (this.mode === 'away') this.wait = 0; else if (this.mode === 'cruise') this.choose(); }

  update(dt, speed) {
    this.t += dt;
    const moving = speed > 0.6;
    let tx, ty, tz, rate;
    if (this.mode === 'cruise') {
      const c = this.spot;
      tx = this.side * (c.x + 0.3 * Math.sin(this.t * 0.5));
      ty = c.y + 0.16 * Math.sin(this.t * 1.3);
      tz = c.z + 1.1 * Math.sin(this.t * 0.31);
      rate = 1.6;
      this.wait -= dt;
      if (this.wait < 0 && moving) this.choose();
      // every so often it turns its head right round to check you are still there
      this.nextLook -= dt;
      if (this.nextLook < 0) { this.look = 1.3; this.nextLook = rand(25, 120); }
    } else if (this.mode === 'away') {
      tx = this.ox; ty = this.oy; tz = this.dz; rate = 0;
      this.wait -= dt;
      if (this.wait < 0) {
        // back in from high up, on whichever side it fancies
        this.side = Math.random() < 0.5 ? -1 : 1;
        this.ox = this.side * 6; this.oy = 10; this.dz = 4;
        this.hidden = false;
        this.cruise(spell(14, 70));
      }
    } else {
      const stop = this.path[0];
      tx = stop.x; ty = stop.y; tz = stop.z; rate = stop.rate;
      // a stop is reached when we are close to it; a "gone" stop, once we have left the picture
      const there = stop.gone ? this.offscreen || (Math.abs(tx - this.ox) < 0.5 && Math.abs(ty - this.oy) < 0.5)
        : Math.abs(tx - this.ox) < 0.5 && Math.abs(ty - this.oy) < 0.4 && Math.abs(tz - this.dz) < 1.5;
      if (there) {
        this.path.shift();
        if (!this.path.length) {
          // gone for a few seconds, or (now and then) for most of a minute
          if (stop.gone) { this.mode = 'away'; this.hidden = true; this.wait = spell(5, 70); } else this.cruise(spell(12, 60), stop.stay);
        }
      }
    }
    this.look = Math.max(0, this.look - dt);
    const k = Math.min(1, dt * rate), ox0 = this.ox;
    this.ox += (tx - this.ox) * k; this.oy += (ty - this.oy) * k; this.dz += (tz - this.dz) * k;
    this.vx += ((this.ox - ox0) / Math.max(dt, 0.001) - this.vx) * Math.min(1, dt * 5);
    // slow wingbeats with a glide in between when cruising; steady beating when it is going somewhere
    const busy = this.mode !== 'cruise';
    const cyc = (this.t % 4.4) / 4.4;
    if (busy || cyc < 0.55) this.ph += dt * (busy ? 9 : 6.2);
    else this.ph += (Math.round(this.ph / TAU) * TAU + 0.45 - this.ph) * Math.min(1, dt * 5);   // settle into a glide, wings a little raised
    this.opts = { bank: clamp(this.vx * 0.35, -1, 1), look: this.look > 0 };
    this.oy2 = this.oy + 0.05 * Math.sin(this.ph);
  }

  choose() {
    const r = Math.random(), s = this.side;
    if (r < 0.2) {
      // swoop: drop low over the trail, race ahead, then climb away
      this.goTo({ x: s * 0.7, y: 1.0, z: 9, rate: 1.5 }, { x: -s * 0.5, y: 1.3, z: 34, rate: 1.1 }, { x: -s * 14, y: 44, z: 60, rate: 0.8, gone: true });
    } else if (r < 0.4) {
      // cross over your head to the other side
      this.side = -s;
      this.goTo({ x: 0, y: 3.0, z: 1.2, rate: 1.4 }, { x: -s * 1.8, y: 1.8, z: 2.6, rate: 1.6 });
    } else if (r < 0.52) {
      // peel off into the trees
      this.goTo({ x: s * 4, y: 3.2, z: 5, rate: 1.2 }, { x: s * 30, y: 9, z: 9, rate: 0.9, gone: true });
    } else if (r < 0.66) {
      // a slow circle right round you, high up
      const rad = rand(2.4, 3.6), hgt = rand(3.2, 4.6);
      const ring = [0.25, 0.5, 0.75, 1].map((u) => ({ x: s * rad * Math.cos(u * TAU), y: hgt, z: 2 + rad * Math.sin(u * TAU), rate: 1.1 }));
      this.goTo(...ring);
    } else if (r < 0.8) {
      // scout: a long way up the trail, and wait for you there
      const far = { x: rand(0.4, 2), y: rand(2.6, 5), z: rand(22, 38) };
      this.goTo({ x: s * far.x, y: far.y, z: far.z, rate: 0.9, stay: far });
    } else {
      // just find a different bit of sky to glide in
      if (Math.random() < 0.4) this.side = -s;
      this.cruise(spell(12, 60));
    }
  }
}

// The ones on the ground. side: which side of you it likes; out: how far out; ahead: how
// far in front; pace: how fast its legs go; hop: how high it bounces; says: what it says.
const GROUND = {
  fox: { side: 1, out: 1.4, ahead: 1.0, pace: 1 },
  penguin: { side: -1, out: 1.25, ahead: 0.3, pace: 0.9, slow: true },
  turkey: { side: -1, out: 2.3, ahead: 1.7, pace: 1.15, says: 'GOBBLE GOBBLE' },
  kangaroo: { side: 1, out: 3.0, ahead: 2.6, pace: 0.5, hop: 0.6 },
};

/** A buddy on foot: beside you most of the time, but it wanders. */
class Roamer extends Buddy {
  constructor(id) {
    super(id);
    this.cfg = GROUND[id] || GROUND.fox;
    this.side = this.cfg.side;
    this.ox = this.side * 10; this.dz = 5;                 // comes in from the trees
    this.spot = { x: this.cfg.out, z: this.cfg.ahead };
    this.rate = 1.6;
    this.timer = rand(8, 30);
    this.sayIn = rand(6, 20);
  }
  poke() { this.timer = 0; if (this.cfg.says) this.sayIn = 0; }

  update(dt, speed, hasDog, pace) {
    this.t += dt;
    const c = this.cfg, moving = speed > 0.6;
    if ((this.timer -= dt) < 0 && moving) this.pick();
    const wide = hasDog && this.side > 0 ? 0.9 : 0;        // keep out of the dog's way
    const tx = this.side * (this.spot.x + wide + 0.14 * Math.sin(this.t * 0.6)), tz = this.spot.z + 0.25 * Math.sin(this.t * 0.37);
    const k = Math.min(1, dt * this.rate), dz0 = this.dz;
    this.ox += (tx - this.ox) * k; this.dz += (tz - this.dz) * k;
    const vz = (this.dz - dz0) / Math.max(dt, 0.001);      // hurrying to catch up, or easing off
    this.ph += dt * pace * c.pace * clamp(1 + vz * 0.3, 0.5, 2.4);
    this.oy = c.hop ? c.hop * Math.abs(Math.sin(this.ph * 0.5)) * (moving ? 1 : 0.25) : 0;
    if (c.says && (this.sayIn -= dt) < 0) { this.say(c.says); this.sayIn = rand(25, 80); }
  }

  /** What next? */
  pick() {
    const c = this.cfg, r = Math.random();
    this.rate = 1.6;
    if (r < 0.34) { this.spot = { x: c.out, z: c.ahead }; this.timer = spell(10, 45); }                                             // beside you
    else if (r < 0.52 && !c.slow) { this.spot = { x: c.out * 0.6 + 0.3, z: rand(6, 16) }; this.timer = rand(5, 14); this.rate = 0.9; }   // runs on ahead
    else if (r < 0.66) { this.spot = { x: c.out + 0.5, z: -rand(1.8, 3.6) }; this.timer = rand(4, 10); this.rate = 1.1; }           // drops back, then has to catch up
    else if (r < 0.82) { this.side = -this.side; this.spot = { x: c.out, z: c.ahead }; this.timer = spell(12, 45); this.rate = 1.2; }   // crosses in front of you to the other side
    else { this.spot = { x: c.out + rand(1.4, 3.4), z: rand(2, 7) }; this.timer = rand(5, 16); this.rate = 1; }                      // off to look at the trees
  }
}

/** The cardinal: round your hat, hovering just ahead, or away up the trail and back. */
class Cardinal extends Buddy {
  constructor() {
    super('cardinal');
    this.ox = 5; this.oy = 4; this.dz = 6;
    this.mode = 'orbit'; this.timer = rand(8, 30);
    this.rad = 0.8; this.spin = 1.1; this.hgt = 1.75; this.to = null;
  }
  poke() { this.timer = 0; }
  update(dt) {
    this.t += dt;
    const t = this.t;
    if ((this.timer -= dt) < 0) {
      const r = Math.random();
      if (r < 0.5) { this.mode = 'orbit'; this.rad = rand(0.5, 1.5); this.spin = rand(0.7, 1.6) * (Math.random() < 0.5 ? -1 : 1); this.hgt = rand(1.6, 2.3); this.timer = spell(8, 40); }
      else if (r < 0.75) { this.mode = 'hover'; this.to = { x: rand(-0.6, 0.6), y: rand(2.0, 2.6), z: rand(1.5, 3.5) }; this.timer = rand(4, 12); }
      else { this.mode = 'dart'; this.to = { x: rand(2, 6) * (Math.random() < 0.5 ? -1 : 1), y: rand(2.5, 4.5), z: rand(12, 26) }; this.timer = rand(4, 12); }
    }
    let tx, ty, tz;
    if (this.mode === 'orbit') { tx = this.rad * Math.cos(t * this.spin); ty = this.hgt + 0.22 * Math.sin(t * 2.3); tz = 0.1 + 0.3 * Math.sin(t * this.spin); }
    else { tx = this.to.x + 0.2 * Math.sin(t * 1.7); ty = this.to.y + 0.15 * Math.sin(t * 2.6); tz = this.to.z; }
    const k = Math.min(1, dt * (this.mode === 'dart' ? 1.4 : 3)), ox0 = this.ox;
    this.ox += (tx - this.ox) * k; this.oy += (ty - this.oy) * k; this.dz += (tz - this.dz) * k;
    if (Math.abs(this.ox - ox0) > 0.002) this.flip = this.ox > ox0;
    this.ph = t * 22;
  }
}

export class Buddies {
  constructor() { this.list = []; this.speed = 0; }
  get ids() { return this.list.map((b) => b.id); }
  has(id) { return this.list.some((b) => b.id === id); }
  add(id) {
    if (!ART[id] || this.has(id)) return;
    this.list.push(id === 'owl' ? new Owl() : id === 'cardinal' ? new Cardinal() : new Roamer(id));
  }
  get owl() { return this.list.find((b) => b.id === 'owl'); }
  /** TEST: that buddy does its next thing now. */
  poke(id) { const b = this.list.find((x) => x.id === id); if (b) b.poke(); }
  /** Off it goes: into the trees, or up and away. It is dropped from the pack once it is out of sight. */
  leave(id) { const b = this.list.find((x) => x.id === id); if (b) b.leaving = true; }
  /** Gone this instant (the laser gun got it). It turns up again later like any buddy that wandered off. */
  zap(b) { b.gone = true; b.box = null; }
  /** The ones that are about (not on their way out). */
  get about() { return this.list.filter((b) => !b.leaving).map((b) => b.id); }

  /** hasDog: a dog companion is already running on the right, so the others keep out of its way. */
  update(dt, speed, hasDog) {
    this.speed = speed;
    const pace = 4 + Math.min(10, speed * 1.3);
    for (const b of this.list) {
      if (b.leaving) {
        const dir = b.ox >= 0 ? 1 : -1;
        b.ph += dt * (b.air ? 9 : pace * 1.3);
        if (b.air) { b.oy += dt * 2.4; if (b.oy2 !== undefined) b.oy2 += dt * 2.4; b.ox += dir * dt * 3.2; b.dz += dt * 5; }
        else { b.ox += dir * dt * (2.6 + speed * 0.25); b.dz += dt * 1.2; }
        b.says = null;
        if (Math.abs(b.ox) > 11 || b.oy > 9 || b.dz > 40) b.gone = true;
        continue;
      }
      b.update(dt, speed, hasDog, pace);
      if (b.says && (b.says.t -= dt) <= 0) b.says = null;
    }
    if (this.list.some((b) => b.gone)) this.list = this.list.filter((b) => !b.gone);
  }

  /**
   * x, baseY, ppm describe the rider. Call once with front = false before the rider is drawn
   * (buddies farther away than them) and once with front = true after (nearer, or overhead).
   */
  draw(ctx, x, baseY, ppm, amb, env, front) {
    for (const b of this.list) {
      if (!front) b.box = null;             // (where it was drawn: set below, once, in whichever pass draws it)
      if (b.hidden) continue;
      const over = b.dz < 0.35 && b.air;
      if ((b.dz < 0 || over) !== front) continue;
      const rel = RIDER_DIST + b.dz;
      if (rel < 2.4) continue;                                   // behind the camera
      const dp = (ppm * RIDER_DIST) / rel;                       // pixels per metre at that depth
      const art = ART[b.id];
      const ground = HORIZON + ((baseY - HORIZON) * RIDER_DIST) / rel;
      const sx = x + b.ox * dp, sy = ground - (b.oy2 !== undefined ? b.oy2 : b.oy) * dp;
      const dw = Math.round(art.uw * dp), dh = Math.round(art.uh * dp);
      b.offscreen = dp < 2 || sx < -dw / 2 || sx > ctx.canvas.width + dw / 2 || sy < 0;
      if (b.offscreen) continue;
      // each pose is drawn once and remembered (they change size all the time as they
      // roam, so the art snaps to a few sizes and is scaled the last little bit)
      const res = resFor(dp);
      const pose = poseOf(b.ph, b.poses);
      const o = b.opts, bank = o ? Math.round(o.bank * 2) : 0, look = o && o.look ? 1 : 0;
      const frame = b.frames.get(env, res + '|' + pose + '|' + (b.flip ? 1 : 0) + '|' + bank + '|' + look, art.uw, art.uh, res, amb,
        (p) => art.draw(p, posePhase(pose, b.poses), o ? { bank: bank / 2, look: !!look } : undefined), b.flip);
      const bx = Math.round(sx - dw / 2), by = Math.round(sy) - dh;
      if (!b.air) {
        ctx.fillStyle = 'rgba(6,14,46,0.3)';
        ctx.fillRect(bx + Math.round(dw * 0.12), Math.round(ground) - 1, Math.round(dw * 0.76), 2);
      }
      ctx.drawImage(frame, bx, by, dw, dh);
      b.box = { x: bx, y: by, w: dw, h: dh };
      if (b.says) drawText(ctx, b.says.text, clamp(Math.round(sx), 50, ctx.canvas.width - 50), Math.max(46, by - 10), { align: 'center', color: '#fff6c8' });
    }
  }
}
