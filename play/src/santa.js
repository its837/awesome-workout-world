// SEXY SANTA.
//
// Santa, as nobody asked to see him: chubby, in a red bikini with a belt of gold coins,
// belly dancing. He is drawn here, in the game's own pixels.
//
// Late in the season his door opens, and from then on he turns up now and then to cheer
// you on: you catch him up on the trail, where he is dancing along backwards so that he
// can face you. He shouts a few encouraging things, and after a while you leave him
// behind. Tap him and he shimmies just for you, finger cymbals and all. He also turns up
// when your mile is done. (The visit itself is in visitor.js.)
import { TAU } from './util.js';
import { Pix } from './sprites.js';
import { drawText } from './font.js';
import { tools } from './figure.js';
import { Visitor } from './visitor.js';

/** His face, for the small pictures of him (a door on the calendar). */
export const SANTA = {
  id: 'sexy-santa', name: 'SEXY SANTA', jacket: [216, 52, 60],
  look: { hair: [246, 248, 255], style: 'short', beard: 'full', beardCol: [246, 248, 255], hat: 'santa', skin: [240, 180, 140], face: 'round' },
};
/** What his door says when it opens. */
export const SANTA_SAYS = 'LIKE A BOWL FULL OF JELLY.';

const WHO = {
  name: 'SEXY SANTA', label: '#ffb3c6',
  bubble: { fill: 'rgba(255,240,244,0.95)', border: '#ff6f91', ink: '#8a1230' },
  says: {
    any: ['LOOKING GOOD!', 'SHAKE IT!', 'WORK IT!', 'HO HO HOT!', 'YOU GOT THIS!', 'OH YEAH!', 'SLEIGH IT!', 'FEEL THE BURN!', 'GO GO GO!', 'WIGGLE IT!', 'YES! YES! YES!', 'HIPS! HIPS! HIPS!'],
    stopped: ['GET MOVING!', "DON'T STOP NOW!", 'UP YOU GET!'],     // you are standing still
    nearly: ['ALMOST THERE!', 'SO CLOSE!', 'FINISH STRONG!'],       // the last stretch of your mile
    done: ['YOU DID IT!', 'ONE MORE MILE?', 'THAT WAS HOT!'],        // your mile is done
    encore: ['JUST FOR YOU!', 'TING! TING!', 'WATCH THE BELLY!', 'LIKE WHAT YOU SEE?'],   // you tapped him
  },
};

const BOX_W = 1.6, BOX_H = 2.0;      // his picture, in metres (his feet are 0.05 from the bottom)
const U = 0.0105;                    // one pixel of the drawing, in metres: he comes out about 1.85 m to the top of his hat
export const SANTA_FRAMES = 24;      // pictures in one round of the dance (two sways of the hips; his arms take the whole round to swap)
const SK = [240, 180, 140], SKD = [216, 148, 108], RED = [216, 52, 60], REDD = [160, 32, 48], WH = [246, 248, 255], GOLD = [255, 215, 106], BOOTS = [23, 23, 29];

/**
 * Paint him into a BOX_W x BOX_H picture. beat: where he is in the dance, in radians (the
 * hips go round once every 2 pi). The numbers are in drawing pixels: x to the
 * right of his middle, y DOWN from his feet (so everything above the ground is negative).
 */
function paint(p, beat) {
  const { R, E, L, PG } = tools(p, BOX_W / 2, BOX_H - 0.05, 1);
  const r = (x, y, w, h, c) => R(x * U, -(y + h) * U, w * U, h * U, c);      // a box, from its top-left corner
  const d = (x, y, rad, c) => E(x * U, -y * U, rad * U, rad * U, c);         // a disc, from its middle
  const ln = (x1, y1, x2, y2, th, c) => L(x1 * U, -y1 * U, x2 * U, -y2 * U, th * U, c);
  const hip = Math.sin(beat) * 8, belly = Math.sin(beat + 0.7) * 5, chest = Math.sin(beat + 1.4) * 3, head = Math.sin(beat + 2.2) * 2, bob = Math.abs(Math.sin(beat)) * 2;
  // boots and legs
  for (const sd of [-1, 1]) {
    const lx = sd * 13 + hip * 0.35;
    r(lx - 6, -38 - bob, 12, 26, SK); r(lx - 6, -38 - bob, 3, 26, SKD);
    r(sd * 13 - 8, -14, 16, 14, BOOTS); r(sd * 13 - 8 + (sd > 0 ? 4 : -4), -5, 16, 5, BOOTS); r(sd * 13 - 8, -14, 16, 3, WH);
  }
  // hips: the bikini bottom, with a belt of coins that swings
  r(hip - 22, -56 - bob, 44, 20, SK); r(hip - 22, -52 - bob, 44, 13, RED); r(hip - 22, -53 - bob, 44, 3, WH);
  for (let k = 0; k < 7; k++) r(hip - 20 + k * 6.4 + Math.sin(beat * 2 + k) * 1.5, -49 - bob + Math.abs(Math.sin(beat * 2 + k * 0.9)) * 4, 3, 3, GOLD);
  // the belly, the star of the show
  d(belly, -76 - bob, 27, SK); d(belly + 4, -72 - bob, 22, SK);
  r(belly - 1, -70 - bob, 3, 3, SKD);
  r(belly - 20, -60 - bob, 40, 2, [223, 158, 118]);
  // chest and the bikini top
  r(chest - 22, -112 - bob, 44, 24, SK);
  for (const sd of [-1, 1]) { d(chest + sd * 11, -100 - bob, 9, RED); d(chest + sd * 11, -101 - bob, 6, REDD); r(chest + sd * 11 - 9, -92 - bob, 18, 2, WH); }
  r(chest - 3, -102 - bob, 6, 2, WH); r(chest - 18, -112 - bob, 2, 8, WH); r(chest + 16, -112 - bob, 2, 8, WH);
  // arms: one up, one out, swapping, wrists turning. White mitts, and a finger cymbal on each.
  for (const sd of [-1, 1]) {
    const up = Math.sin(beat * 0.5 + (sd > 0 ? 0 : Math.PI)) * 0.5 + 0.5;
    const sx = chest + sd * 22, sy = -108 - bob, ex = sx + sd * (18 - up * 4), ey = sy + 10 - up * 24, hx = ex + sd * (6 + up * 4) + Math.sin(beat * 2) * 2, hy = ey - 12 - up * 14;
    ln(sx, sy, ex, ey, 9, SK); ln(ex, ey, hx, hy, 8, SK);
    d(hx, hy, 5, WH); r(hx + sd * 5, hy - 2, 3, 3, GOLD);
  }
  // head: beard, hat, a very pleased face
  d(head, -128 - bob, 15, SK);
  d(head, -117 - bob, 15, WH); d(head - 9, -121 - bob, 9, WH); d(head + 9, -121 - bob, 9, WH); d(head, -106 - bob, 9, WH);
  r(head - 9, -126 - bob, 18, 4, WH); d(head, -127 - bob, 3, [232, 114, 122]);
  r(head - 8, -134 - bob, 4, 2, [26, 26, 34]); r(head + 4, -134 - bob, 4, 2, [26, 26, 34]);
  r(head - 16, -146 - bob, 32, 7, WH);
  PG([(head - 15) * U, (146 + bob) * U, (head + 15) * U, (146 + bob) * U, (head + 20 + hip * 0.4) * U, (170 + bob) * U], RED);
  d(head + 21 + hip * 0.4, -171 - bob, 5, WH);
}

const cache = new Map();
/**
 * A picture of him. ppm: pixels per metre; frame: 0..SANTA_FRAMES-1, where he is in the
 * dance. Returns { canvas, cx, foot }: where the middle of his feet is.
 */
export function santaSprite(ppm, frame = 0) {
  frame = ((Math.floor(frame) % SANTA_FRAMES) + SANTA_FRAMES) % SANTA_FRAMES;
  const key = ppm + '|' + frame;
  let s = cache.get(key);
  if (s) return s;
  if (cache.size > 300) cache.clear();
  const p = new Pix(BOX_W, BOX_H, ppm);
  p.unlit = true;
  paint(p, (frame / SANTA_FRAMES) * 2 * TAU);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  s = { canvas: p.toCanvas(), cx: Math.round((BOX_W / 2) * ppm), foot: Math.round((BOX_H - 0.05) * ppm) };
  cache.set(key, s);
  return s;
}
/** Which picture of the dance goes with a moment in time (seconds), at his usual speed. */
export const santaFrame = (time) => Math.floor(((time * 5.2) / (2 * TAU)) * SANTA_FRAMES);

/** One visit from him (see visitor.js). */
export class SantaVisit extends Visitor {
  constructor(side, how) { super(WHO, side, how); this.beat = Math.random() * 2 * TAU; }
  update(dt, sound) {
    const was = this.encore;
    super.update(dt, sound);
    this.beat += dt * (this.encore ? 10.5 : 5.2);                    // the shimmy is the same dance, twice as fast
    if (this.encore && Math.floor(this.t * 5.2) !== Math.floor((this.t - dt) * 5.2)) sound.sparkle();   // finger cymbals
    if (was && !this.encore) sound.sparkle();
  }
  picture(ppm) { return santaSprite(ppm, (this.beat / (2 * TAU)) * SANTA_FRAMES); }
  extra(ctx, x, y, ppm, time) {
    if (!this.encore || Math.sin(time * 21) < 0.2) return;           // TING! TING! either side of him
    drawText(ctx, 'TING', x - Math.round(ppm * 1.1), y - Math.round(ppm * 1.55), { align: 'center', color: '#ffe27a' });
    drawText(ctx, 'TING', x + Math.round(ppm * 1.1), y - Math.round(ppm * 1.25), { align: 'center', color: '#ffe27a' });
  }
}
