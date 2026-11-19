// THE RELATIVE WHO FLIES IN. Somebody from your family who is not here any more, as a
// friendly spirit. Who it is, what they wear and what they say are yours to choose:
// `relative` in family.js. The game only knows how they fly.
//
// They fly in out of the night sky, pull up beside you and say hello, fly along next to
// you for a while (now and then swooping over your head to the other side), then shoot off
// up the trail and into the sky.
//
// How long they stay and where they come from are picked at random every visit, so no two
// are the same.
import { W, HORIZON } from './config.js';
import { clamp, TAU } from './util.js';
import { Pix, glowCanvas } from './sprites.js';
import { drawText, textWidth } from './font.js';
import { panel } from './ui.js';
import { tools, headFront } from './figure.js';
import { lookOf } from './portraits.js';
import { FAMILY } from '../family.js';

/**
 * Who they are (family.js), with something sensible for anything left out. `relatives` is a
 * list (any number of family who are not here any more; each visit is one of them in turn);
 * `relative` (one of them) still works.
 */
const build = (mine) => {
  mine = mine || {};
  const name = String(mine.name || 'A FRIENDLY GHOST').toUpperCase(), says = String(mine.says || 'HELLO THERE!').toUpperCase();
  return {
    id: 'relative', name, says,
    title: String(mine.title || (mine.name ? `THE SPIRIT OF ${mine.name}` : 'A FRIENDLY GHOST')).toUpperCase(),
    jacket: mine.jacket || [150, 190, 235],
    look: mine.look || { hair: 'gray', style: 'short' },
    speak: mine.speak || says.charAt(0) + says.slice(1).toLowerCase(),     // the same words for the tablet's voice: 'How ya goin?'
  };
};
// ?public=1 (anything that will be shown outside the family): a
// made-up relative in place of the family's own, so no real name is on a video anyone can see.
const PUBLIC = typeof location !== 'undefined' && new URLSearchParams(location.search).get('public') === '1';
const AUNT_BETTY = { name: 'AUNT BETTY', title: 'THE SPIRIT OF AUNT BETTY', says: 'OH, HELLO, DEARIE! DID YOU EAT?', jacket: [232, 150, 190], look: { hair: [246, 246, 252], style: 'bob' } };
export const RELATIVES = (PUBLIC ? [AUNT_BETTY] : Array.isArray(FAMILY.relatives) && FAMILY.relatives.length ? FAMILY.relatives : [FAMILY.relative]).map(build);
/** The first of them: the face on the door and the name in the catalog (with several, the door is for all of them). */
export const RELATIVE = RELATIVES.length > 1 ? Object.assign({}, RELATIVES[0], { title: 'THE FAMILY SPIRITS', name: 'THE SPIRITS' }) : RELATIVES[0];
export const RELATIVE_SAYS = RELATIVES[0].says;
let turn = Math.floor(Math.random() * RELATIVES.length);       // whose visit is next

const BOX_W = 2.2, BOX_H = 2.5, CHEST = 1.25;      // his picture, in metres; how high his chest is in it
const IN = 1.9, OUT = 1.7, CROSS = 1.5, HELLO = 3.4;   // seconds: flying in, flying off, swapping sides, the speech bubble
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = (t) => Math.pow(clamp(t, 0, 1), 3);
const easeBoth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/**
 * Paint them into a BOX_W x BOX_H picture. Below the jacket: two legs with shoes, trailing
 * out behind him and rippling like the wisp he used to have.
 * pose: 'fly' (both arms out in front) | 'wave' | 'wings' (arms out like a plane);
 * a: how far he leans, in radians; w: the flutter angle.
 */
function paint(p, pose, a, w, who) {
  const K = Object.assign({ jacket: who.jacket }, lookOf(who));
  const g = tools(p, BOX_W / 2, BOX_H - 0.05, 1), { E, L, PG } = g;
  const ux = Math.sin(a), uy = Math.cos(a);                       // along his body, towards his head
  const at = (along, across) => [ux * along + uy * across, CHEST + uy * along - ux * across];
  const coat = K.jacket, coatD = mix(coat, [40, 60, 130], 0.3), wisp = [228, 240, 255];
  // Two legs with shoes, where the wisp used to be. They trail out behind him and ripple
  // the way the wisp did, with a breath of mist coming off each heel: he is still a ghost.
  const pants = K.pants || [62, 72, 104], pantsD = mix(pants, [20, 30, 70], 0.3), shoe = [58, 40, 30], sole = [240, 244, 252];
  for (const sd of [-1, 1]) {
    const ph = w + (sd > 0 ? 1.6 : 0), leg = sd > 0 ? pantsD : pants;
    const sway = (along) => sd * 0.115 + Math.sin(ph + along * 3.2) * 0.13 * Math.max(0, along - 0.3);   // more ripple the further from the hip
    const hip = at(-0.34, sd * 0.115), knee = at(-0.7, sway(0.7)), foot = at(-1.02, sway(1.02));
    for (let i = 2; i >= 1; i--) { const [x, y] = at(-1.06 - i * 0.12, sway(1.06 + i * 0.12)); E(x, y, 0.075 - i * 0.02, 0.075 - i * 0.02, mix(pants, wisp, 0.8)); }
    L(hip[0], hip[1], knee[0], knee[1], 0.18, leg);
    L(knee[0], knee[1], foot[0], foot[1], 0.15, leg);
    E(foot[0], foot[1], 0.115, 0.085, shoe);                               // the shoe...
    const tip = at(-1.1, sway(1.1));
    E(tip[0], tip[1], 0.1, 0.035, sole);                                   // ...and its sole
  }
  const sl = at(0.27, -0.25), sr = at(0.27, 0.25), wr = at(-0.38, 0.2), wl = at(-0.38, -0.2);
  PG([...sl, ...sr, ...wr, ...wl], coat);
  PG([...at(0.27, 0.09), ...sr, ...wr, ...at(-0.38, 0.07)], coatD);
  E(...at(0.25, 0), 0.25, 0.09, coat);
  let hands;
  if (pose === 'fly') hands = [at(0.8, -0.15), at(0.72, 0.2)];
  else if (pose === 'wings') hands = [at(0.14 + 0.05 * Math.sin(w), -0.64), at(0.14 - 0.05 * Math.sin(w), 0.64)];
  else hands = [at(-0.14, -0.4), at(0.6 + 0.05 * Math.sin(w * 2), 0.4 + 0.1 * Math.sin(w * 2))];
  [at(0.2, -0.23), at(0.2, 0.23)].forEach((s, i) => {
    L(s[0], s[1], hands[i][0], hands[i][1], 0.13, i ? coatD : coat);
    E(hands[i][0], hands[i][1], 0.075, 0.075, K.skin);
  });
  const [hx, hy] = at(0.5, 0);
  headFront(g, K, hx, hy, w);                                       // his head stays level whichever way he leans
}

const cache = new Map();
/**
 * A picture of him. ppm: pixels per metre; lean: -2..2 (thirteen degrees a step, + is to
 * the right); wig: 0..3. Returns { canvas, cx, cy }: where his chest is in the picture.
 */
export function relativeSprite(ppm, pose = 'wave', lean = 0, wig = 0, who = RELATIVES[0]) {
  const key = who.name + '|' + ppm + '|' + pose + '|' + lean + '|' + wig;
  let s = cache.get(key);
  if (s) return s;
  if (cache.size > 260) cache.clear();
  const p = new Pix(BOX_W, BOX_H, ppm);
  p.unlit = true;
  paint(p, pose, lean * 0.23, (wig / 4) * TAU, who);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  s = { canvas: p.toCanvas(), cx: Math.round((BOX_W / 2) * ppm), cy: Math.round((BOX_H - 0.05 - CHEST) * ppm) };
  cache.set(key, s);
  return s;
}

/** One visit, from the moment he appears in the sky to the moment he is gone. */
export class RelativeVisit {
  /** side: -1 he pulls up on your left, 1 on your right. stayPut: never swap sides (something is in the way over there). */
  constructor(side, stayPut) {
    this.t = 0;
    this.who = RELATIVES[turn++ % RELATIVES.length];                    // whichever of them it is this time
    this.side = side;
    this.stay = 9 + Math.random() * 9;                               // how long he flies alongside
    this.cross = !stayPut && Math.random() < 0.6 ? 3.6 + Math.random() * Math.max(0.5, this.stay - 7) : -1;   // when he swoops over to your other side, if he does
    this.from = { dx: side * (190 + Math.random() * 90), y: HORIZON - 60 - Math.random() * 50 };              // where in the sky he comes from
    this.ph = Math.random() * TAU;
    this.spoke = false; this.done = false; this.high = false;
    this.x = 0; this.y = 0; this.scale = 0.3; this.alpha = 0; this.pose = 'fly'; this.lean = 0;
  }
  /** Is he flying alongside (not on the way in or out)? */
  get here() { return this.t >= IN && this.t < IN + this.stay; }
  update(dt, sound) {
    this.t += dt;
    if (!this.spoke && this.t >= IN - 0.25) { this.spoke = true; sound.speak(this.who.speak); }
    if (this.t >= IN + this.stay + OUT) this.done = true;
  }
  /** A tap on him: he swoops over your head. Returns true the first time (worth a cheer). */
  poke() {
    if (!this.here) return false;
    const u = this.t - IN, busy = this.cross >= 0 && u >= this.cross && u <= this.cross + CROSS;
    if (!busy) { this.side = this._side(u); this.cross = u; this.stay = Math.max(this.stay, u + CROSS + 2); }
    const first = !this.high;
    this.high = true;
    return first;
  }
  _side(u) { return this.cross >= 0 && u > this.cross + CROSS ? -this.side : this.side; }
  /** Work out where he is. at: where you are on screen { x, y (your feet), ppm }. */
  _place(at, time) {
    const m = at.ppm, u = this.t - IN;
    const home = (sd) => ({ x: at.x + sd * m * 2.0 + Math.sin(time * 0.7 + this.ph) * 8, y: at.y - m * 1.7 + Math.sin(time * 2.1 + this.ph) * 3.5 });
    this.alpha = 1; this.scale = 1; this.lean = 0;
    if (u < 0) {                                                     // in: down out of the sky on a curve
      const e = easeOut(this.t / IN), h = home(this.side);
      const sx = at.x + this.from.dx, sy = this.from.y, kx = at.x + this.side * m * 4.6, ky = at.y - m * 2.7;
      this.x = (1 - e) * (1 - e) * sx + 2 * e * (1 - e) * kx + e * e * h.x;
      this.y = (1 - e) * (1 - e) * sy + 2 * e * (1 - e) * ky + e * e * h.y;
      this.scale = lerp(0.26, 1, e);
      this.alpha = clamp(this.t / 0.4, 0, 1);
      this.lean = Math.round(-this.side * 2 * (1 - e));
      this.pose = e > 0.9 ? 'wave' : 'fly';
    } else if (u < this.stay) {                                      // alongside
      const sd = this._side(u), h = home(sd);
      this.x = h.x; this.y = h.y;
      this.scale = 1 + 0.05 * Math.sin(time * 0.5 + this.ph);
      this.pose = u < HELLO ? 'wave' : 'wings';
      this.lean = Math.round(Math.sin(time * 0.9 + this.ph) * 0.8);
      if (this.cross >= 0 && u >= this.cross && u <= this.cross + CROSS) {   // over your head to the other side
        const c = easeBoth((u - this.cross) / CROSS), a = home(this.side), b = home(-this.side);
        this.x = lerp(a.x, b.x, c);
        this.y = lerp(a.y, b.y, c) - Math.sin(c * Math.PI) * m * 1.4;
        this.lean = Math.round(-this.side * 2 * Math.sin(c * Math.PI));
        this.pose = 'fly';
      }
    } else {                                                         // off: a little wind-up, then away up the trail and into the sky
      const o = clamp((u - this.stay) / OUT, 0, 1), sd = this._side(u), h = home(sd);
      const wind = Math.sin(clamp(o / 0.2, 0, 1) * Math.PI), e = easeIn((o - 0.2) / 0.8);
      this.x = lerp(h.x + sd * wind * 6, at.x + sd * 26, e);
      this.y = lerp(h.y + wind * 7, HORIZON - 96, e);
      this.scale = lerp(1, 0.14, e);
      this.alpha = 1 - clamp((o - 0.86) / 0.14, 0, 1);
      this.lean = o < 0.2 ? 0 : -sd;
      this.pose = 'fly';
      this.gone = o;
    }
  }
  /** The part of the screen he covers, for taps: [x, y, w, h]. */
  box() { return [this.x - 30, this.y - 46, 60, 96]; }
  draw(ctx, at, time) {
    this._place(at, time);
    const ppm = clamp(Math.round((at.ppm * this.scale) / 4) * 4, 8, 52);
    const s = relativeSprite(ppm, this.pose, this.lean, Math.floor(time * 5) % 4, this.who);
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42 * this.alpha;
    const gw = Math.round(s.canvas.width * 1.25), gh = Math.round(s.canvas.height * 1.15);
    ctx.drawImage(glowCanvas([150, 200, 255]), x - (gw >> 1), y - s.cy - Math.round(gh * 0.06), gw, gh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.9 * this.alpha;
    ctx.drawImage(s.canvas, x - s.cx, y - s.cy);
    const u = this.t - IN;
    if (u > -0.25 && u < HELLO) {                                    // what he says, and who he is
      ctx.globalAlpha = clamp(Math.min((u + 0.25) / 0.2, (HELLO - u) / 0.4), 0, 1);
      const says = this.who.says, bw = textWidth(says, 2) + 16, bx = clamp(Math.round(x - bw / 2), 6, W - bw - 6), by = y - Math.round(ppm * 0.95) - 30;
      panel(ctx, bx, by, bw, 22, { fill: 'rgba(236,246,255,0.94)', border: '#9fc8ff' });
      drawText(ctx, says, bx + 8, by + 4, { scale: 2, color: '#1c2a5e', shadow: null });
      drawText(ctx, this.who.name, x, y + Math.round(ppm * 1.2), { align: 'center', color: '#bfe0ff' });
    }
    if (this.gone > 0.8) {                                           // a twinkle where he went
      const k = (this.gone - 0.8) / 0.2, r = Math.round(2 + 4 * Math.sin(k * Math.PI));
      ctx.globalAlpha = Math.sin(k * Math.PI);
      ctx.fillStyle = '#eaf4ff';
      ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1);
    }
    ctx.globalAlpha = 1;
  }
}
