// EDWARD.
//
// A very pale young man who broods, sparkles, never wears a shirt, and has (for reasons he
// would rather not go into) the paws, ears and tail of a wolf. He is our own send-up of
// the vampire-and-werewolf romances: a joke about the type, not a copy of anybody's
// character, and he says nothing that anybody's character says.
//
// Once his door is open he turns up now and then to cheer you on: you catch him up on the
// trail, where he is jogging backwards so that he can face you, flexing. Tap him and he
// flexes just for you. (The visit itself is in visitor.js.)
//
// How he looks is EDWARD and paint() below. What he says is in WHO.
import { TAU } from './util.js';
import { Pix } from './sprites.js';
import { tools, headFront, dark, lite } from './figure.js';
import { lookOf } from './portraits.js';
import { Visitor } from './visitor.js';

/** His face: pale, bronze hair, amber eyes. (The ears, the eyebrows and the fangs are added in paint.) */
export const EDWARD = {
  id: 'edward', name: 'EDWARD', jacket: [60, 70, 110],
  look: { hair: [150, 96, 54], style: 'short', hat: 'none', skin: [242, 224, 216], eyes: [214, 150, 40], face: 'long' },
};
/** What his door says when it opens. */
export const EDWARD_SAYS = 'TEAM VAMPIRE? TEAM WOLF? BOTH.';

const WHO = {
  name: 'EDWARD', label: '#c9d0ff',
  bubble: { fill: 'rgba(238,240,255,0.95)', border: '#8f9be0', ink: '#1c2260' },
  says: {
    any: ['TEAM YOU.', 'AWOOOO!', 'I SPARKLE FOR YOU.', 'YOU SMELL AMAZING.', 'RUN WITH ME.', 'I NEVER GET TIRED.', 'SO. MUCH. BROODING.', 'THE MOON IS UP!', 'I WAITED 100 YEARS.', 'FASTER, MORTAL!', 'YOU ARE DOING GREAT.'],
    stopped: ['WHY HAVE YOU STOPPED?', 'I CAN WAIT. FOREVER.', 'MOVE, MORTAL!'],
    nearly: ['ALMOST THERE.', 'I CAN SMELL THE FINISH.', 'DO NOT STOP NOW.'],
    done: ['YOU DID IT.', 'I AM... IMPRESSED.', 'AWOOOO!'],
    encore: ['AWOOOO!', 'RAWR.', 'BEHOLD.', 'I DO NOT OWN A SHIRT.'],
  },
};

const BOX_W = 1.9, BOX_H = 2.3;                    // his picture, in metres (his feet are 0.05 from the bottom)
const FUR = [112, 104, 110], FUR_D = [78, 72, 80], FUR_L = [170, 164, 172], CLAW = [244, 240, 226], PAD = [60, 52, 60];
const JEANS = [58, 78, 128], JEANS_D = [42, 56, 96], BELT = [72, 48, 34];
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Paint him, facing you, into a BOX_W x BOX_H picture.
 * pose: 'flex' (both arms up, biceps out) | 'howl' (paws in the air) | 'claws' (paws out, claws showing);
 * w: an angle that keeps turning, for the pumping and the tail; step: 0..3, where he is in
 * his jog (0: one knee up, 2: the other, 1 and 3: both feet down).
 */
function paint(p, pose, w, step) {
  const K = lookOf(EDWARD);
  const g = tools(p, BOX_W / 2, BOX_H - 0.05, 1), { R, E, L, PG } = g;
  const skin = K.skin, skinD = dark(skin, 0.86), skinL = lite(skin, 1.03, 6), shade = dark(skin, 0.76);
  const up = step % 2 ? 0 : 0.035;                                  // he rises a little with each knee
  const pump = Math.sin(w);
  // the tail, behind everything: bushy, with a pale tip, swishing
  const tx = 0.5 + 0.08 * pump, ty = 0.62 + 0.05 * Math.cos(w);
  L(0.05, 0.93 + up, tx * 0.6, 0.72, 0.15, FUR_D); L(tx * 0.6, 0.72, tx, ty, 0.19, FUR); E(tx + 0.03, ty - 0.02, 0.085, 0.085, FUR_L);
  // legs: jeans, and a wolf's feet. A knee that is up comes towards you.
  [-1, 1].forEach((sd, i) => {
    const lifted = step === i * 2;
    if (lifted) {
      L(sd * 0.11, 0.97 + up, sd * 0.17, 0.7, 0.19, JEANS);
      E(sd * 0.17, 0.68, 0.105, 0.1, lite(JEANS, 1.12, 10));         // the knee
      L(sd * 0.17, 0.62, sd * 0.16, 0.42, 0.15, JEANS_D);
      E(sd * 0.16, 0.3, 0.11, 0.1, FUR); R(sd * 0.16 - 0.1, 0.22, 0.2, 0.07, FUR_D);
      for (const c of [-0.07, 0, 0.07]) R(sd * 0.16 + c - 0.015, 0.19, 0.03, 0.05, CLAW);
    } else {
      L(sd * 0.11, 0.97 + up, sd * 0.13, 0.24, 0.19, sd < 0 ? JEANS : JEANS_D);
      E(sd * 0.13, 0.1, 0.12, 0.1, FUR); R(sd * 0.13 - 0.12, 0.0, 0.24, 0.08, FUR_D);
      for (const c of [-0.08, 0, 0.08]) R(sd * 0.13 + c - 0.015, 0.0, 0.03, 0.045, CLAW);
    }
  });
  const y0 = up;                                                    // everything above the hips moves with the bounce
  // the torso: wide at the shoulders, narrow at the waist
  PG([-0.19, 1.0 + y0, 0.19, 1.0 + y0, 0.29, 1.5 + y0, -0.29, 1.5 + y0], skin);
  PG([0.06, 1.0 + y0, 0.19, 1.0 + y0, 0.29, 1.5 + y0, 0.14, 1.5 + y0], skinD);
  E(-0.29, 1.47 + y0, 0.1, 0.095, skin); E(0.29, 1.47 + y0, 0.1, 0.095, skinD);     // shoulders
  E(-0.105, 1.37 + y0, 0.118, 0.08, skinL); E(0.105, 1.37 + y0, 0.118, 0.08, skin);  // chest
  R(-0.21, 1.285 + y0, 0.19, 0.022, skinD); R(0.02, 1.285 + y0, 0.19, 0.022, shade);
  R(-0.012, 1.04 + y0, 0.024, 0.4, skinD);
  for (const ay of [1.2, 1.125, 1.05]) { R(-0.105, ay + y0, 0.085, 0.018, skinD); R(0.02, ay + y0, 0.085, 0.018, shade); }   // six of them
  R(-0.125, 1.345 + y0, 0.03, 0.026, [214, 150, 150]); R(0.095, 1.345 + y0, 0.03, 0.026, [196, 132, 136]);              // (so nobody thinks that is a white shirt)
  R(-0.012, 1.075 + y0, 0.024, 0.03, shade);
  // the jeans' waistband, and a belt
  R(-0.2, 0.93 + y0, 0.4, 0.09, JEANS_D); R(-0.2, 0.975 + y0, 0.4, 0.04, BELT); R(-0.035, 0.97 + y0, 0.07, 0.05, [200, 196, 206]);
  // arms: skin to the elbow, a wolf's forearm and paw below it
  [-1, 1].forEach((sd) => {
    const col = sd < 0 ? skin : skinD, fur = sd < 0 ? FUR : FUR_D, sx = sd * 0.31, sy = 1.47 + y0;
    let ex, ey, fx, fy, bulge = 0, dirY = 1;                          // dirY: which way the claws point (1 up, -1 down)
    if (pose === 'howl') { ex = sd * 0.48; ey = 1.76 + y0; fx = sd * 0.56; fy = 2.04 + y0 + 0.04 * Math.sin(w * 2 + (sd > 0 ? 1.4 : 0)); }
    else if (pose === 'claws') { ex = sd * 0.52; ey = 1.3 + y0; fx = sd * 0.7; fy = 1.52 + y0 + 0.03 * pump; }
    else { ex = sd * 0.58; ey = 1.5 + y0 + 0.015 * pump; fx = sd * 0.47; fy = 1.82 + y0 + 0.02 * pump; bulge = 0.075 + 0.02 * pump; }
    L(sx, sy, ex, ey, 0.15, col);
    if (bulge) E((sx + ex) / 2 + sd * 0.01, (sy + ey) / 2 + 0.07, 0.105, bulge, sd < 0 ? skinL : skin);     // the bicep
    L(lerp(ex, fx, 0.25), lerp(ey, fy, 0.25), fx, fy, 0.14, fur);                                            // fur from just below the elbow
    E(fx, fy, 0.105, 0.1, fur); E(fx, fy - 0.02 * dirY, 0.05, 0.04, PAD);                                     // the paw, and its pad
    for (const c of [-0.07, 0, 0.07]) R(fx + c - 0.016, fy + 0.07, 0.032, 0.07, CLAW);                        // claws
  });
  // the head, then the things an ordinary head does not have
  const hx = 0, hy = 1.69 + y0;
  headFront(g, K, hx, hy, w);
  const hair = K.hair, hairL = lite(hair, 1.2, 10);
  PG([hx - 0.13, hy + 0.1, hx - 0.06, hy + 0.2, hx + 0.02, hy + 0.15, hx + 0.09, hy + 0.23, hx + 0.14, hy + 0.1], hair);   // hair that took an hour to look this untidy
  R(hx - 0.04, hy + 0.13, 0.05, 0.03, hairL); R(hx + 0.06, hy + 0.15, 0.04, 0.03, hairL);
  for (const sd of [-1, 1]) {                                                                                 // a wolf's ears
    PG([hx + sd * 0.07, hy + 0.13, hx + sd * 0.17, hy + 0.1, hx + sd * 0.155, hy + 0.27], sd < 0 ? FUR : FUR_D);
    PG([hx + sd * 0.1, hy + 0.14, hx + sd * 0.15, hy + 0.13, hx + sd * 0.145, hy + 0.22], [226, 150, 160]);
  }
  R(hx - 0.085, hy + 0.035, 0.07, 0.018, dark(hair, 0.6)); R(hx + 0.015, hy + 0.035, 0.07, 0.018, dark(hair, 0.6));   // the brooding eyebrows
  R(hx - 0.07, hy + 0.045, 0.03, 0.014, dark(hair, 0.6)); R(hx + 0.04, hy + 0.045, 0.03, 0.014, dark(hair, 0.6));
  R(hx - 0.03, hy - 0.115, 0.018, 0.03, CLAW); R(hx + 0.012, hy - 0.115, 0.018, 0.03, CLAW);                 // two small fangs
  // he sparkles
  const spots = [[-0.22, 1.44], [0.1, 1.2], [-0.08, 1.08], [0.24, 1.4], [-0.36, 1.56], [0.4, 1.6], [0.02, 1.36], [-0.14, 1.26], [0.16, 1.5], [-0.05, 1.62]];
  const phase = Math.round((w / TAU) * 4);
  spots.forEach(([x, y], i) => {
    if ((i + phase) % 3) return;
    R(x - 0.012, y + y0 - 0.012, 0.026, 0.026, [255, 255, 255]);
    if ((i + phase) % 2 === 0) { R(x - 0.04, y + y0 - 0.006, 0.08, 0.012, [255, 250, 210]); R(x - 0.006, y + y0 - 0.04, 0.012, 0.08, [255, 250, 210]); }
  });
}

const cache = new Map();
/**
 * A picture of him. ppm: pixels per metre; wig: 0..3 (the pumping, the tail, the sparkles);
 * step: 0..3 (the jog). Returns { canvas, cx, foot }: where the middle of his feet is.
 */
export function edwardSprite(ppm, pose = 'flex', wig = 0, step = 1) {
  const key = ppm + '|' + pose + '|' + wig + '|' + step;
  let s = cache.get(key);
  if (s) return s;
  if (cache.size > 260) cache.clear();
  const p = new Pix(BOX_W, BOX_H, ppm);
  p.unlit = true;
  paint(p, pose, (wig / 4) * TAU, step);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  s = { canvas: p.toCanvas(), cx: Math.round((BOX_W / 2) * ppm), foot: Math.round((BOX_H - 0.05) * ppm) };
  cache.set(key, s);
  return s;
}

/** One visit from him (see visitor.js). */
export class EdwardVisit extends Visitor {
  constructor(side, how) { super(WHO, side, how); }
  update(dt, sound) {
    const was = this.encore;
    super.update(dt, sound);
    if (!was && this.encore) sound.thump();
  }
  picture(ppm, time) {
    const pose = this.encore ? 'flex' : this.talking ? (this.say.n % 2 ? 'claws' : 'howl') : 'flex';
    return edwardSprite(ppm, pose, Math.floor(time * (this.encore ? 10 : 5)) % 4, Math.floor(time * 6.5) % 4);
  }
}
