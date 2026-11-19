// THE ONES WHO TURN UP BESIDE YOU TO CHEER YOU ON: Sexy Santa (santa.js) and Edward
// (edward.js).
//
// A visit goes like this. You catch them up on the trail: they are going BACKWARDS, so
// that they can face you. They keep up with you for a while, shouting a few encouraging
// things, and then you leave them behind. Tap one and it does its party piece just for
// you, and stays a little longer. How long a visit lasts is picked at random every time.
//
// This file is the visit itself: when they come and go, where they are on the screen, the
// speech bubble, the tap. What somebody looks like, and what they shout, is in their own
// file: each one is a Visitor with a `picture`.
import { W, HORIZON } from './config.js';
import { clamp, TAU } from './util.js';
import { drawText, textWidth } from './font.js';
import { panel } from './ui.js';

const IN = 1.8, OUT = 1.5, SAY = 2.6;      // seconds: catching them up, leaving them behind, one shout
export const ENCORE = 1.7;                 // how long the party piece lasts
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * The lines for one visit, from somebody's `says` ({ any, stopped, nearly, done, encore }).
 * how: { moving, progress (0..1 of today's mile), done }. The first line fits what you are
 * doing; the rest are general encouragement, a different few every time.
 */
export function linesFor(says, how = {}) {
  const first = how.done ? pick(says.done) : !how.moving ? pick(says.stopped) : how.progress > 0.8 ? pick(says.nearly) : pick(says.any);
  return [first, ...says.any.filter((l) => l !== first).sort(() => Math.random() - 0.5).slice(0, 3)];
}

export class Visitor {
  /**
   * who: { name, says, bubble: { fill, border, ink }, label (the colour of the name under them) }.
   * side: -1 they are on your left, 1 on your right. how: see linesFor.
   */
  constructor(who, side, how) {
    this.who = who;
    this.t = 0;
    this.side = side;
    this.stay = 10 + Math.random() * 8;                              // how long they keep up with you
    this.lines = linesFor(who.says, how);
    this.say = null;                                                 // what they are shouting now: { text, at, n }
    this.said = 0;
    this.nextSay = IN - 0.3;
    this.encoreAt = -99;
    this.ph = Math.random() * TAU;
    this.spoke = false; this.poked = false; this.done = false;
    this.x = 0; this.y = 0; this.scale = 0.15; this.alpha = 0;
  }
  /** Are they beside you (not still coming, not left behind)? */
  get here() { return this.t >= IN && this.t < IN + this.stay; }
  /** Are they in the middle of their party piece? */
  get encore() { return this.t - this.encoreAt < ENCORE; }
  /** Are they shouting something just now? */
  get talking() { return !!this.say && this.t - this.say.at < SAY; }
  update(dt, sound) {
    this.t += dt;
    if (this.lines.length && this.t >= this.nextSay && this.t < IN + this.stay - 1.2) {
      const text = this.lines.shift();
      this.say = { text, at: this.t, n: this.said++ };
      this.nextSay = this.t + SAY + 1 + Math.random() * 2.6;
      if (!this.spoke) { this.spoke = true; sound.speak(text.charAt(0) + text.slice(1).toLowerCase()); } else sound.tap();
    }
    if (this.t >= IN + this.stay + OUT) this.done = true;
  }
  /** A tap on them: the party piece, and they stay a little longer. Returns true the first time (worth a cheer). */
  poke() {
    if (!this.here) return false;
    this.encoreAt = this.t;
    this.say = { text: pick(this.who.says.encore), at: this.t, n: this.said++ };
    this.nextSay = Math.max(this.nextSay, this.t + SAY + 0.8);
    this.stay = Math.max(this.stay, this.t - IN + ENCORE + 1.5);
    const first = !this.poked;
    this.poked = true;
    return first;
  }
  /**
   * Work out where they are. at: where you are on screen { x, y (your feet), ppm }.
   * They are on the ground, so how big they are and how far down the screen their feet
   * are go together: small and near the horizon while they are far ahead, your size
   * beside you, and bigger and off the bottom of the screen once they are behind you.
   */
  _place(at, time) {
    const u = this.t - IN;
    let s = 1;
    this.alpha = 1;
    if (u < 0) { s = lerp(0.15, 1, easeOut(this.t / IN)); this.alpha = clamp(this.t / 0.3, 0, 1); }
    else if (u >= this.stay) { const o = clamp((u - this.stay) / OUT, 0, 1); s = lerp(1, 2.5, o * o); this.alpha = 1 - clamp((o - 0.7) / 0.3, 0, 1); }
    this.scale = s;
    this.x = at.x + this.side * at.ppm * 2.5 * s + (this.here ? Math.sin(time * 0.6 + this.ph) * 5 : 0);
    this.y = HORIZON + (at.y - HORIZON) * s;
  }
  /** The part of the screen they cover, for taps: [x, y, w, h]. */
  box() { return [this.x - 34, this.y - 96, 68, 100]; }
  /** Their picture just now: { canvas, cx, foot } (where the middle of their feet is). Each visitor has its own. */
  picture(ppm, time) { return null; }   // eslint-disable-line no-unused-vars
  /** Anything extra drawn round them (finger cymbals going TING). x, y: their feet. */
  extra(ctx, x, y, ppm, time) {}         // eslint-disable-line no-unused-vars
  draw(ctx, at, time) {
    this._place(at, time);
    // drawn at their own size while they are your size or smaller; once they are nearer than you, the same picture bigger
    const ppm = clamp(Math.round((at.ppm * Math.min(1, this.scale)) / 4) * 4, 8, 48), zoom = Math.max(1, this.scale);
    const s = this.picture(ppm, time);
    if (!s) return;
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.globalAlpha = 0.28 * this.alpha;                             // a shadow on the snow
    ctx.fillStyle = '#0a1238';
    ctx.fillRect(x - Math.round(ppm * zoom * 0.34), y - 1, Math.round(ppm * zoom * 0.68), Math.max(2, Math.round(ppm * zoom * 0.06)));
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(s.canvas, x - Math.round(s.cx * zoom), y - Math.round(s.foot * zoom), Math.round(s.canvas.width * zoom), Math.round(s.canvas.height * zoom));
    if (this.here) this.extra(ctx, x, y, ppm, time);
    const top = y - Math.round(s.foot * zoom);
    if (this.talking && this.scale <= 1.05) {                        // what they are shouting
      const a = this.t - this.say.at, text = this.say.text, b = this.who.bubble;
      ctx.globalAlpha = clamp(Math.min(a / 0.15, (SAY - a) / 0.35), 0, 1) * this.alpha;
      const big = textWidth(text, 2) <= 190, sc = big ? 2 : 1;
      const bw = textWidth(text, sc) + 16, bh = big ? 22 : 15;
      const bx = clamp(Math.round(x - bw / 2), 30, W - bw - 6), by = Math.max(46, top - bh - 2 - Math.round(Math.sin(clamp(a / 0.2, 0, 1) * Math.PI) * 3));
      panel(ctx, bx, by, bw, bh, { fill: b.fill, border: b.border });
      drawText(ctx, text, bx + 8, by + 4, { scale: sc, color: b.ink, shadow: null });
    }
    const u = this.t - IN;
    if (u > -0.2 && u < 3.2) {                                       // who it is, when they arrive
      ctx.globalAlpha = clamp(Math.min((u + 0.2) / 0.2, (3.2 - u) / 0.4), 0, 1);
      drawText(ctx, this.who.name, x, y + 5, { align: 'center', color: this.who.label });
    }
    ctx.globalAlpha = 1;
  }
}
