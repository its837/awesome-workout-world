// The family, drawn from the front and from the side.
//
// On the trail you only ever see your rider from behind (rider.js). These views are for
// everywhere else: the line-up on the front page, where everybody stands at their real
// height, and the character sheets.
//
// Everything is described in metres with the feet at (0, 0) and y going up, then
// scaled by the person's height: a look of { height: 183 } is 183 cm from the snow to
// the top of the head. On a bike the bike stays the same size and the saddle goes up.
import { Pix, C } from './sprites.js';
import { TAU } from './util.js';
import { lookOf, FROG } from './portraits.js';
import { coatOf, drawDog, drawDogFront, drawDogSide } from './dogs.js';

export const BOOT = [30, 32, 44], GLOVE = [34, 36, 50];
export const SCARF = [70, 190, 120], SCARF_D = [50, 150, 96];
export const POLE = [190, 196, 214], POLE_D = [120, 128, 150];
export const SKI = [240, 150, 50], SKI_D = [60, 60, 80];
export const METAL = [70, 76, 96], TIRE = [26, 28, 38], TIRE_L = [62, 66, 86], RIM = [128, 136, 160];
export const PACK = [44, 120, 110];
const MOUTH = [150, 60, 60], FRAME = [40, 34, 44], LENS = [206, 228, 246];
export const dark = (c, f = 0.72) => [c[0] * f, c[1] * f, c[2] * f];
export const lite = (c, f = 1.25, a = 12) => c.map((v) => Math.min(255, v * f + a));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** What covers the body: a jacket, or (look.shirtless) nothing but skin. */
const topOf = (K) => (K.shirtless ? K.skin : K.jacket);
const SAUNA = [226, 212, 176];       // a felt sauna hat
const WIZ = [58, 48, 132], WIZ_D = [40, 32, 94], GOLD = [250, 214, 80];   // a wizard hat
const SLED = [214, 52, 58], SLED_D = [150, 34, 42], BLANKET = [88, 140, 224], BLANKET_D = [60, 106, 188], BABY_HAT = [250, 214, 84], BABY_HAT_D = [224, 176, 50];

/**
 * A baby in a little red sled, strapped upright to somebody's back (look.babySled). (x, y) is the middle of the sled,
 * in the metres of whoever's tools g are. view:
 *   'face'  the baby looks at you: you are behind the carrier (the trail view)
 *   'away'  you are in front of the carrier: you see the sled's edges and the back of the baby's hat over a shoulder
 *   'side'  in profile, the baby looking back (the carrier faces right)
 */
export function babySled(g, x, y, view, skin, hair = [34, 30, 36], w = 0) {
  const { R, E, L, PG } = g, sway = 0.012 * Math.sin(w), lip = [150, 60, 60];
  if (view === 'side') {
    R(x - 0.05, y - 0.38, 0.09, 0.78, SLED_D);                              // the board, standing against his back
    R(x - 0.1, y - 0.38, 0.05, 0.78, SLED);
    L(x - 0.145, y - 0.4, x - 0.145, y + 0.38, 0.035, METAL);               // the runner, and its curl
    E(x - 0.145, y + 0.4, 0.045, 0.04, METAL);
    E(x - 0.22, y - 0.1, 0.1, 0.2, BLANKET);                                // the baby in its blanket
    R(x - 0.31, y - 0.15, 0.06, 0.04, BLANKET_D);
    E(x - 0.25, y + 0.2, 0.095, 0.1, skin);                                 // its head, turned to look back
    E(x - 0.23, y + 0.29, 0.1, 0.06, BABY_HAT); R(x - 0.34, y + 0.235, 0.2, 0.03, BABY_HAT_D); E(x - 0.21, y + 0.375, 0.032, 0.032, C.white);
    R(x - 0.335, y + 0.185, 0.022, 0.03, C.coal);                           // an eye
    R(x - 0.315, y + 0.12, 0.03, 0.012, lip);
    return;
  }
  if (view === 'away') {
    R(x - 0.32, y - 0.5, 0.64, 1.0, SLED_D);                                // the board, behind his back and wider than his shoulders
    R(x - 0.29, y - 0.47, 0.58, 0.94, SLED);
    R(x - 0.365, y - 0.52, 0.045, 1.1, METAL); R(x + 0.32, y - 0.52, 0.045, 1.1, METAL);   // the runners
    E(x - 0.34, y + 0.6, 0.045, 0.04, METAL); E(x + 0.34, y + 0.6, 0.045, 0.04, METAL);
    E(x + 0.2 + sway, y + 0.52, 0.11, 0.105, hair);                         // the back of the baby's head, over his right shoulder
    E(x + 0.2 + sway, y + 0.6, 0.12, 0.07, BABY_HAT); R(x + 0.08 + sway, y + 0.53, 0.24, 0.035, BABY_HAT_D); E(x + 0.2 + sway, y + 0.69, 0.04, 0.04, C.white);
    E(x + 0.33, y + 0.38, 0.04, 0.04, skin);                                // a little hand holding on
    return;
  }
  R(x - 0.27, y - 0.4, 0.54, 0.88, SLED_D);                                 // 'face': the board with the baby on it
  R(x - 0.24, y - 0.37, 0.48, 0.82, SLED);
  R(x - 0.315, y - 0.44, 0.045, 0.98, METAL); R(x + 0.27, y - 0.44, 0.045, 0.98, METAL);
  E(x - 0.29, y + 0.56, 0.045, 0.04, METAL); E(x + 0.29, y + 0.56, 0.045, 0.04, METAL);
  E(x, y - 0.08, 0.17, 0.26, BLANKET);
  R(x - 0.17, y - 0.1, 0.34, 0.05, BLANKET_D);
  E(x - 0.15, y + 0.0, 0.04, 0.04, skin); E(x + 0.15, y + 0.0, 0.04, 0.04, skin);   // little hands
  E(x + sway, y + 0.2, 0.125, 0.12, skin);                                  // the head
  PG([x - 0.13 + sway, y + 0.26, x + 0.13 + sway, y + 0.26, x + 0.11 + sway, y + 0.34, x + sway, y + 0.4, x - 0.11 + sway, y + 0.34], BABY_HAT);
  R(x - 0.135 + sway, y + 0.255, 0.27, 0.035, BABY_HAT_D);
  E(x + sway, y + 0.42, 0.04, 0.04, C.white);
  R(x - 0.065 + sway, y + 0.17, 0.03, 0.04, C.coal); R(x + 0.035 + sway, y + 0.17, 0.03, 0.04, C.coal);
  R(x - 0.105 + sway, y + 0.12, 0.04, 0.025, C.rosy); R(x + 0.065 + sway, y + 0.12, 0.04, 0.025, C.rosy);
  R(x - 0.025 + sway, y + 0.1, 0.05, 0.015, lip);
}

/** How wide and tall a face is, by shape. */
const FACE = { round: [0.132, 0.136], oval: [0.122, 0.142], long: [0.114, 0.15], square: [0.128, 0.142] };
/** How far below the ears the hair hangs, by style (in metres on a 175 cm person). */
export const HAIR_FALL = { bob: 0.17, shoulder: 0.3, long: 0.46 };

/** Drawing tools with the origin at somebody's feet: x to the right, y up, everything times k. */
export function tools(p, cx, ground, k = 1) {
  const X = (x) => cx + x * k, Y = (y) => ground - y * k;
  return {
    p, k, X, Y,
    R: (x, y, w, h, c) => p.rect(X(x), Y(y + h), w * k, h * k, c),
    E: (x, y, rx, ry, c) => p.ell(X(x), Y(y), rx * k, ry * k, c),
    L: (x1, y1, x2, y2, th, c) => p.line(X(x1), Y(y1), X(x2), Y(y2), th * k, c),
    PG: (pts, c) => p.poly(pts.map((v, i) => (i % 2 === 0 ? X(v) : Y(v))), c),
    /** A ring (a tyre, a wheel rim): centre, outer radius, inner radius. */
    RING: (x, y, ro, ri, c) => p.fn(X(x - ro), Y(y + ro), 2 * ro * k, 2 * ro * k, (px, py) => {
      const d = Math.hypot(px - X(x), py - Y(y)) / k;
      return d <= ro && d >= ri ? c : null;
    }),
  };
}

/** Where a knee (or elbow) goes: two bones of length a and b between a hip and a foot. dir picks the side it bends to. */
function joint(hx, hy, fx, fy, a, b, dir) {
  const dx = fx - hx, dy = fy - hy, len = Math.hypot(dx, dy) || 1e-6;
  const d = Math.min(len, a + b - 0.001);
  const t = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - t * t));
  const ux = dx / len, uy = dy / len;
  return [hx + ux * t - uy * h * dir, hy + uy * t + ux * h * dir];
}

// ---------------------------------------------------------------------------
// Heads
// ---------------------------------------------------------------------------
/** A cap's letter, three pixels by five at the size people are usually drawn. (x, y) is its middle. */
const MARKS = { B: ['11 ', '1 1', '11 ', '1 1', '11 '] };
function capMark(g, K, x, y) {
  const rows = MARKS[K.capMark], u = 0.024;
  if (!rows) return;
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '1') g.R(x + (i - 1.5) * u, y + (1.5 - j) * u, u, u, K.markCol); }));
}

function hatFront(g, K, hx, hy, rx, w) {
  const { R, E, PG } = g;
  if (K.hat === 'none') return;
  if (K.hat === 'cap') {
    const col = K.hatCol;
    E(hx, hy + 0.1, rx + 0.03, 0.125, col);                          // the crown
    R(hx - rx - 0.05, hy + 0.045, 2 * rx + 0.1, 0.04, dark(col, 0.62));   // the peak, coming at you
    capMark(g, K, hx, hy + 0.135);
    return;
  }
  if (K.hat === 'beanie') {
    const col = K.hatCol, colD = dark(col, 0.74);
    E(hx, hy + 0.115, rx + 0.03, 0.105, col);
    R(hx - rx - 0.035, hy + 0.045, 2 * rx + 0.07, 0.065, colD);
    E(hx, hy + 0.235, 0.05, 0.05, C.white);
    return;
  }
  if (K.hat === 'sauna') {
    PG([hx - rx - 0.015, hy + 0.1, hx + rx + 0.015, hy + 0.1, hx + 0.085, hy + 0.24, hx + 0.03, hy + 0.34, hx - 0.03, hy + 0.34, hx - 0.085, hy + 0.24], SAUNA);
    E(hx + 0.07 + 0.012 * Math.sin(w), hy + 0.33, 0.075, 0.04, SAUNA);                    // the limp tip, flopped over
    R(hx - rx - 0.04, hy + 0.05, 2 * rx + 0.08, 0.065, dark(SAUNA, 0.8));                   // the turned-up brim
    return;
  }
  if (K.hat === 'wizard') {
    const f = 0.02 * Math.sin(w);
    E(hx, hy + 0.085, rx + 0.12, 0.045, WIZ_D);                                           // the wide brim
    PG([hx - rx, hy + 0.1, hx + rx, hy + 0.1, hx + 0.075, hy + 0.28, hx + 0.1 + f, hy + 0.42, hx + 0.24 + f, hy + 0.45, hx + 0.2 + f, hy + 0.52, hx + 0.02, hy + 0.5, hx - 0.05, hy + 0.36, hx - 0.075, hy + 0.28], WIZ);
    PG([hx - rx, hy + 0.1, hx - 0.05, hy + 0.1, hx - 0.03, hy + 0.28, hx - 0.075, hy + 0.28], WIZ_D);
    R(hx - rx, hy + 0.1, 2 * rx, 0.035, GOLD);                                            // the band
    R(hx + 0.03, hy + 0.22, 0.03, 0.03, GOLD); R(hx - 0.05, hy + 0.3, 0.025, 0.025, [255, 246, 200]); R(hx + 0.07, hy + 0.38, 0.025, 0.025, GOLD);
    return;
  }
  const flop = 0.025 * Math.sin(w);
  PG([hx - rx - 0.01, hy + 0.11, hx + rx + 0.01, hy + 0.11, hx + rx + 0.05, hy + 0.25, hx + rx + 0.16, hy + 0.2 + flop, hx + 0.04, hy + 0.39, hx - 0.08, hy + 0.31], C.red);
  PG([hx + 0.03, hy + 0.11, hx + rx + 0.01, hy + 0.11, hx + rx + 0.05, hy + 0.25, hx + 0.09, hy + 0.33], C.redD);
  R(hx - rx - 0.035, hy + 0.05, 2 * rx + 0.07, 0.075, C.white);
  E(hx + rx + 0.18, hy + 0.17 + flop, 0.062, 0.062, C.white);
}

/** A head looking at you. (hx, hy) is the middle of the face. */
export function headFront(g, K, hx, hy, w = 0) {
  const { R, E, L, PG } = g;
  if (K.species === 'frog') {
    E(hx - 0.1, hy + 0.1, 0.065, 0.065, FROG.skin); E(hx + 0.1, hy + 0.1, 0.065, 0.065, FROG.skin);
    E(hx, hy, 0.165, 0.125, FROG.skin);
    E(hx, hy - 0.055, 0.11, 0.05, FROG.belly);
    E(hx - 0.1, hy + 0.105, 0.04, 0.04, C.white); E(hx + 0.1, hy + 0.105, 0.04, 0.04, C.white);
    R(hx - 0.115, hy + 0.09, 0.03, 0.035, C.coal); R(hx + 0.085, hy + 0.09, 0.03, 0.035, C.coal);
    R(hx - 0.1, hy - 0.035, 0.2, 0.018, FROG.dark);
    hatFront(g, K, hx, hy + 0.045, 0.125, w);
    return;
  }
  const [rx, ry] = FACE[K.face] || FACE.oval;
  const hair = K.hair, skin = K.skin, skinD = dark(skin, 0.84);
  const st = K.style, hat = K.hat !== 'none', fall = HAIR_FALL[st] || 0;
  // hair behind the head, and the two locks that fall in front of the shoulders
  if (fall) {
    E(hx, hy + 0.01, rx + 0.05, ry + 0.02, hair);
    for (const sd of [-1, 1]) {
      R(hx + sd * (rx + 0.008) - 0.045, hy - fall, 0.09, fall + 0.02, hair);
      E(hx + sd * (rx + 0.008), hy - fall, 0.045, 0.035, hair);
    }
    if (K.curly) for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) E(hx + sd * (rx + 0.05), hy + 0.02 - (i / 4) * fall, 0.04, 0.04, i % 2 ? hair : dark(hair, 0.86));
  }
  if (st === 'braids') {
    for (const sd of [-1, 1]) {
      L(hx + sd * (rx + 0.005), hy - 0.04, hx + sd * (rx + 0.035), hy - 0.4, 0.062, hair);
      R(hx + sd * (rx + 0.035) - 0.035, hy - 0.4, 0.07, 0.03, C.red);
      E(hx + sd * (rx + 0.035), hy - 0.44, 0.03, 0.035, hair);
    }
  }
  if (st === 'pony') E(hx + rx + 0.035, hy - 0.07 + 0.012 * Math.sin(w), 0.05, 0.12, hair);
  if (!fall) { R(hx - rx - 0.014, hy - 0.035, 0.03, 0.055, skinD); R(hx + rx - 0.016, hy - 0.035, 0.03, 0.055, skinD); }
  E(hx, hy, rx, ry, skin);
  if (st !== 'bald') {
    const thin = st === 'buzz' ? mix(hair, skin, 0.4) : hair;
    if (!hat) {
      E(hx, hy + 0.045, rx + 0.018, ry - 0.025, thin);
      E(hx, hy - 0.04, rx - 0.014, ry - 0.045, skin);
      if (st === 'bun') E(hx, hy + ry + 0.035, 0.07, 0.062, hair);
      if (K.curly) for (let i = 0; i < 7; i++) E(hx - rx + (i / 6) * 2 * rx, hy + ry - 0.02 - 0.03 * Math.abs(i - 3) / 3, 0.04, 0.04, i % 2 ? hair : dark(hair, 0.86));
    }
    const side = st === 'buzz' ? 0.05 : st === 'short' ? 0.09 : 0.16;
    R(hx - rx - 0.012, hy + 0.07 - side, 0.034, side, thin); R(hx + rx - 0.022, hy + 0.07 - side, 0.034, side, thin);
    if (K.fringe) R(hx - rx + 0.02, hy + 0.035, 2 * rx - 0.04, 0.04, hair);
  }
  hatFront(g, K, hx, hy, rx, w);
  // the face itself
  if (K.beard) {
    const bc = K.beard === 'stubble' ? mix(skin, K.beardCol, 0.42) : K.beardCol;
    if (K.beard === 'moustache') R(hx - 0.045, hy - 0.068, 0.09, 0.024, bc);
    else {
      E(hx, hy - 0.075, rx - 0.004, K.beard === 'full' ? 0.08 : 0.064, bc);
      R(hx - rx + 0.004, hy - 0.06, 0.03, 0.07, bc); R(hx + rx - 0.034, hy - 0.06, 0.03, 0.07, bc);
      E(hx, hy - 0.058, 0.04, 0.02, K.beard === 'stubble' ? bc : skin);
      R(hx - 0.03, hy - 0.072, 0.06, 0.016, MOUTH);
    }
  }
  if (!K.beard || K.beard === 'moustache') R(hx - 0.03, hy - 0.09, 0.06, 0.02, MOUTH);
  R(hx - rx + 0.012, hy - 0.058, 0.032, 0.024, C.rosy); R(hx + rx - 0.044, hy - 0.058, 0.032, 0.024, C.rosy);
  if (K.glasses === 'sun') {
    R(hx - 0.092, hy - 0.03, 0.08, 0.06, C.coal); R(hx + 0.012, hy - 0.03, 0.08, 0.06, C.coal);
    R(hx - 0.02, hy - 0.002, 0.04, 0.02, C.coal);
    R(hx - rx - 0.005, hy - 0.002, 0.04, 0.02, C.coal); R(hx + rx - 0.035, hy - 0.002, 0.04, 0.02, C.coal);
  } else if (K.glasses) {
    for (const ex of [-0.094, 0.014]) { R(hx + ex, hy - 0.035, 0.08, 0.07, FRAME); R(hx + ex + 0.016, hy - 0.02, 0.048, 0.04, LENS); }
    R(hx - 0.02, hy - 0.004, 0.04, 0.018, FRAME);
    R(hx - rx - 0.005, hy - 0.004, 0.035, 0.018, FRAME); R(hx + rx - 0.03, hy - 0.004, 0.035, 0.018, FRAME);
    R(hx - 0.066, hy - 0.016, 0.028, 0.034, C.coal); R(hx + 0.04, hy - 0.016, 0.028, 0.034, C.coal);
  } else {
    R(hx - 0.066, hy - 0.016, 0.032, 0.04, C.coal); R(hx + 0.034, hy - 0.016, 0.032, 0.04, C.coal);
  }
}

function hatSide(g, K, hx, hy, w) {
  const { R, E, PG } = g;
  if (K.hat === 'none') return;
  if (K.hat === 'cap') {
    const col = K.hatCol;
    E(hx - 0.01, hy + 0.1, 0.155, 0.12, col);
    R(hx + 0.06, hy + 0.045, 0.24, 0.035, dark(col, 0.62));          // the peak, out in front
    if (K.capMark) R(hx + 0.08, hy + 0.1, 0.045, 0.07, K.markCol);
    return;
  }
  if (K.hat === 'beanie') {
    const col = K.hatCol;
    E(hx - 0.01, hy + 0.11, 0.15, 0.105, col);
    R(hx - 0.155, hy + 0.045, 0.3, 0.065, dark(col, 0.74));
    E(hx - 0.03, hy + 0.235, 0.05, 0.05, C.white);
    return;
  }
  if (K.hat === 'sauna') {
    PG([hx - 0.14, hy + 0.11, hx + 0.13, hy + 0.11, hx + 0.08, hy + 0.26, hx + 0.02, hy + 0.35, hx - 0.06, hy + 0.35, hx - 0.12, hy + 0.24], SAUNA);
    E(hx + 0.07 + 0.012 * Math.sin(w), hy + 0.34, 0.075, 0.04, SAUNA);
    R(hx - 0.165, hy + 0.05, 0.32, 0.065, dark(SAUNA, 0.8));
    return;
  }
  if (K.hat === 'wizard') {
    const f = 0.02 * Math.sin(w);
    E(hx, hy + 0.085, 0.24, 0.045, WIZ_D);
    PG([hx - 0.14, hy + 0.1, hx + 0.13, hy + 0.1, hx + 0.06, hy + 0.28, hx - 0.02, hy + 0.42, hx - 0.12 + f, hy + 0.46, hx - 0.2 + f, hy + 0.41, hx - 0.14 + f, hy + 0.54, hx - 0.1, hy + 0.5, hx - 0.1, hy + 0.34, hx - 0.1, hy + 0.24], WIZ);
    R(hx - 0.14, hy + 0.1, 0.27, 0.035, GOLD);
    R(hx - 0.02, hy + 0.2, 0.03, 0.03, GOLD); R(hx + 0.04, hy + 0.14, 0.025, 0.025, [255, 246, 200]);
    return;
  }
  const flop = 0.03 * Math.sin(w);
  PG([hx - 0.14, hy + 0.11, hx + 0.13, hy + 0.11, hx + 0.06, hy + 0.3, hx - 0.1, hy + 0.36, hx - 0.26, hy + 0.27 + flop, hx - 0.19, hy + 0.2], C.red);
  PG([hx - 0.14, hy + 0.11, hx - 0.02, hy + 0.11, hx - 0.13, hy + 0.27, hx - 0.26, hy + 0.27 + flop, hx - 0.19, hy + 0.2], C.redD);
  R(hx - 0.16, hy + 0.05, 0.31, 0.075, C.white);
  E(hx - 0.29, hy + 0.25 + flop, 0.062, 0.062, C.white);
}

/** A head in profile, looking to the right. (hx, hy) is the middle of the skull. */
export function headSide(g, K, hx, hy, w = 0) {
  const { R, E, L } = g;
  if (K.species === 'frog') {
    E(hx, hy, 0.16, 0.12, FROG.skin);
    E(hx + 0.05, hy + 0.1, 0.06, 0.06, FROG.skin);
    E(hx + 0.06, hy + 0.105, 0.036, 0.036, C.white);
    R(hx + 0.06, hy + 0.09, 0.03, 0.035, C.coal);
    E(hx + 0.04, hy - 0.06, 0.1, 0.045, FROG.belly);
    R(hx + 0.04, hy - 0.035, 0.12, 0.018, FROG.dark);
    hatSide(g, K, hx, hy + 0.04, w);
    return;
  }
  const hair = K.hair, skin = K.skin, skinD = dark(skin, 0.84);
  const st = K.style, hat = K.hat !== 'none', fall = HAIR_FALL[st] || 0;
  const sway = 0.02 * Math.sin(w);
  if (fall) {
    R(hx - 0.15, hy - fall, 0.15, fall + 0.04, hair);
    E(hx - 0.075 - sway, hy - fall, 0.075, 0.04, hair);
    if (K.curly) for (let i = 0; i < 5; i++) E(hx - 0.15, hy + 0.02 - (i / 4) * fall, 0.04, 0.04, i % 2 ? hair : dark(hair, 0.86));
  }
  if (st === 'pony') {
    L(hx - 0.1, hy + 0.03, hx - 0.27 - sway, hy - 0.14, 0.085, hair);
    E(hx - 0.28 - sway, hy - 0.17, 0.045, 0.06, hair);
    R(hx - 0.15, hy + 0.0, 0.04, 0.05, C.red);
  }
  if (st === 'bun') E(hx - 0.15, hy - 0.02, 0.065, 0.06, hair);
  if (st === 'braids') {
    L(hx - 0.07, hy - 0.05, hx - 0.05 - sway, hy - 0.4, 0.062, hair);
    R(hx - 0.085 - sway, hy - 0.41, 0.07, 0.03, C.red);
  }
  // skull in hair colour, then the face laid over the front of it
  const thin = st === 'buzz' ? mix(hair, skin, 0.4) : hair;
  E(hx, hy, 0.128, 0.14, st === 'bald' ? skin : thin);
  E(hx + 0.035, hy - 0.03, 0.098, 0.112, skin);
  R(hx + 0.118, hy - 0.045, 0.034, 0.04, skin);                 // nose
  if (!fall && st !== 'bald') R(hx - 0.03, hy - 0.03, 0.035, 0.05, skinD);   // ear
  if (st === 'bald') R(hx - 0.03, hy - 0.03, 0.035, 0.05, skinD);
  if (K.fringe) R(hx + 0.03, hy + 0.04, 0.1, 0.04, hair);
  if (K.curly && !hat) for (let i = 0; i < 6; i++) E(hx - 0.12 + i * 0.045, hy + 0.11 - 0.012 * Math.abs(i - 2), 0.04, 0.04, i % 2 ? hair : dark(hair, 0.86));
  hatSide(g, K, hx, hy, w);
  if (K.beard) {
    const bc = K.beard === 'stubble' ? mix(skin, K.beardCol, 0.42) : K.beardCol;
    if (K.beard === 'moustache') R(hx + 0.085, hy - 0.072, 0.05, 0.022, bc);
    else { E(hx + 0.05, hy - 0.092, 0.085, K.beard === 'full' ? 0.07 : 0.055, bc); R(hx - 0.01, hy - 0.07, 0.035, 0.06, bc); }
  }
  R(hx + 0.095, hy - 0.092, 0.035, 0.016, MOUTH);
  R(hx + 0.065, hy - 0.06, 0.03, 0.022, C.rosy);
  if (K.glasses === 'sun') { R(hx + 0.045, hy - 0.022, 0.09, 0.055, C.coal); R(hx - 0.03, hy + 0.004, 0.08, 0.016, C.coal); }
  else if (K.glasses) {
    R(hx + 0.05, hy - 0.03, 0.08, 0.066, FRAME); R(hx + 0.064, hy - 0.016, 0.05, 0.038, LENS);
    R(hx - 0.03, hy + 0.004, 0.08, 0.016, FRAME);
    R(hx + 0.082, hy - 0.012, 0.026, 0.032, C.coal);
  } else R(hx + 0.07, hy - 0.012, 0.03, 0.04, C.coal);
}

// ---------------------------------------------------------------------------
// Bodies, from the front
// ---------------------------------------------------------------------------
/** Standing, or skinning toward you (o.mode 'tread'): the whole figure scales with height. */
function frontStanding(p, cx, ground, K, o) {
  const g = tools(p, cx, ground, K.k), { R, E, L, PG } = g;
  const b = K.b, ski = o.mode === 'tread';
  const s = ski ? Math.sin(o.ph) : 0, bob = ski ? 0.012 * Math.cos(o.ph * 2) : 0;
  const jacket = topOf(K), jacketD = dark(jacket, K.shirtless ? 0.88 : 0.7), pants = K.pants, pantsD = dark(pants, 0.74);
  const glove = K.species === 'frog' || K.shirtless ? (K.species === 'frog' ? FROG.skin : K.skin) : GLOVE;
  if (K.babySled) babySled(g, 0, 1.15 + bob, 'away', K.skin, K.hair, o.w);     // behind everything: it is on his back
  const step = (sd) => (ski ? 0.035 * sd * s : 0);       // the forward foot sits a little lower in the picture
  if (ski) {
    // skis, pointing at you
    for (const sd of [-1, 1]) {
      const fy = -step(sd);
      PG([sd * 0.115 - 0.055, fy + 0.07, sd * 0.115 + 0.055, fy + 0.07, sd * 0.13 + 0.068, fy - 0.1, sd * 0.13 - 0.068, fy - 0.1], SKI);
      R(sd * 0.13 - 0.068, fy - 0.13, 0.136, 0.035, SKI_D);
    }
    // poles
    for (const sd of [-1, 1]) {
      const k = sd * s, hx = sd * (0.3 * b + 0.04), hy = 1.0 + 0.05 * k + bob;
      L(hx, hy, sd * 0.45, 0.02 + 0.05 * Math.max(0, k), 0.03, POLE);
      R(sd * 0.45 - 0.05, 0.06 + 0.05 * Math.max(0, k), 0.1, 0.025, POLE_D);
    }
  }
  for (const sd of [-1, 1]) {
    const fy = -step(sd);
    L(sd * 0.105 * b, 0.84 + bob, sd * 0.115, fy + 0.16, 0.175, sd < 0 ? pants : pantsD);
    R(sd * 0.115 - 0.095, fy, 0.19, 0.17, BOOT);
  }
  E(0, 0.84 + bob, 0.2 * b, 0.1, pants);
  // a ski jacket: it comes down over the hips
  PG([-0.215 * b, 0.78 + bob, 0.215 * b, 0.78 + bob, 0.24 * b, 1.4 + bob, -0.24 * b, 1.4 + bob], jacket);
  PG([0.08 * b, 0.78 + bob, 0.215 * b, 0.78 + bob, 0.24 * b, 1.4 + bob, 0.12 * b, 1.4 + bob], jacketD);
  E(0, 1.4 + bob, 0.24 * b, 0.075, jacket);
  if (K.shirtless) { R(-0.012, 1.0 + bob, 0.024, 0.03, dark(jacket, 0.7)); R(-0.2 * b, 1.2 + bob, 0.4 * b, 0.018, dark(jacket, 0.82)); }    // a navel, and the line under the chest
  else {
    R(-0.215 * b, 0.78 + bob, 0.43 * b, 0.035, jacketD);                          // hem
    R(-0.012, 0.82 + bob, 0.024, 0.54, jacketD);                                  // the zip
  }
  if (ski) {
    for (const sd of [-1, 1]) R(sd * 0.14 * b - 0.027, 0.96 + bob, 0.054, 0.48, PACK);   // pack straps
    R(-0.215 * b, 0.93 + bob, 0.43 * b, 0.05, dark(PACK, 0.8));
  }
  for (const sd of [-1, 1]) {
    const col = sd < 0 ? jacket : jacketD, k = sd * s;
    const hx = sd * (0.3 * b + (ski ? 0.04 : 0)), hy = (ski ? 1.0 + 0.05 * k : 0.94) + bob;
    L(sd * 0.25 * b, 1.37 + bob, sd * (0.29 * b + (ski ? 0.03 : 0)), 1.16 + bob, 0.115, col);
    L(sd * (0.29 * b + (ski ? 0.03 : 0)), 1.16 + bob, hx, hy + 0.04, 0.105, col);
    E(hx, hy, 0.062, 0.062, glove);
  }
  if (K.shirtless) R(-0.055, 1.38 + bob, 0.11, 0.14, jacketD);                    // a neck
  else {
    R(-0.1, 1.41 + bob, 0.2, 0.085, SCARF);
    L(0.05, 1.44 + bob, 0.1, 1.24 + bob, 0.07, SCARF_D);
  }
  headFront(g, K, 0, 1.608 + bob, o.w);
}

/** On the fat bike, coming toward you. The bike is one size; the saddle follows the legs. */
function frontBike(p, cx, ground, K, o) {
  const g = tools(p, cx, ground, 1), { R, E, L, PG } = g;
  const k = K.k, b = K.b, ph = o.ph, s = Math.sin(ph), bob = 0.01 * Math.sin(ph * 2);
  const seat = 0.33 + 0.67 * k;
  const jacket = topOf(K), jacketD = dark(jacket, K.shirtless ? 0.88 : 0.7), pants = K.pants, pantsD = dark(pants, 0.74);
  const glove = K.species === 'frog' || K.shirtless ? (K.species === 'frog' ? FROG.skin : K.skin) : GLOVE;
  const sh = seat + 0.37 * k + bob;                       // shoulder height (leaning forward, so the body looks short)
  if (K.babySled) babySled(tools(p, cx, ground - seat, k), 0, 0.62, 'away', K.skin, K.hair, o.w);   // on his back, behind him
  // body first: it is behind the handlebars
  PG([-0.18 * b * k, seat - 0.02, 0.18 * b * k, seat - 0.02, 0.24 * b * k, sh, -0.24 * b * k, sh], jacket);
  PG([0.07 * b * k, seat - 0.02, 0.18 * b * k, seat - 0.02, 0.24 * b * k, sh, 0.12 * b * k, sh], jacketD);
  E(0, sh, 0.24 * b * k, 0.08 * k, jacket);
  for (const sd of [-1, 1]) {
    const py = 0.33 + 0.165 * sd * s, kx = sd * 0.25, ky = Math.min(seat + 0.02, py + 0.44 * k);
    R(sd * 0.22 - 0.09, py - 0.05, 0.18, 0.03, METAL);                // pedal
    L(sd * 0.1 * k, seat, kx, ky, 0.17 * k, sd < 0 ? pants : pantsD);     // thigh, coming at you
    L(kx, ky, sd * 0.22, py + 0.08, 0.135 * k, sd < 0 ? pants : pantsD);  // shin
    R(sd * 0.22 - 0.08, py - 0.03, 0.16, 0.13, BOOT);
  }
  // the front of the bike
  R(-0.11, 0, 0.22, 0.72, TIRE);
  E(0, 0.72, 0.11, 0.07, TIRE);
  const off = ((ph / TAU) * 0.24) % 0.12;
  for (let y = 0.12 - off; y < 0.7; y += 0.12) R(-0.11, y, 0.22, 0.035, TIRE_L);
  R(-0.165, 0.36, 0.04, 0.62, METAL); R(0.125, 0.36, 0.04, 0.62, METAL);     // fork legs
  R(-0.165, 0.94, 0.33, 0.05, METAL);
  R(-0.04, 0.94, 0.08, 0.2, METAL);
  p.unlit = true;
  E(0, 1.03, 0.055, 0.055, C.warmHi);
  p.unlit = false;
  L(-0.42, 1.14, 0.42, 1.14, 0.05, METAL);
  R(-0.45, 1.11, 0.1, 0.06, [26, 28, 38]); R(0.35, 1.11, 0.1, 0.06, [26, 28, 38]);
  for (const sd of [-1, 1]) {
    const col = sd < 0 ? jacket : jacketD;
    L(sd * 0.25 * b * k, sh - 0.03 * k, sd * 0.37, (sh + 1.17) / 2, 0.12 * k, col);
    L(sd * 0.37, (sh + 1.17) / 2, sd * 0.39, 1.2, 0.11 * k, col);
    E(sd * 0.39, 1.16, 0.066, 0.062, glove);
  }
  const gb = tools(p, cx, ground - (sh + 0.012), k);
  gb.R(-0.1, 0.0, 0.2, 0.08, K.shirtless ? jacketD : SCARF);
  headFront(gb, K, 0, 0.2, o.w);
}

// ---------------------------------------------------------------------------
// Bodies, from the side (facing right)
// ---------------------------------------------------------------------------
function sideSki(p, cx, ground, K, o) {
  const g = tools(p, cx, ground, K.k), { R, E, L, PG } = g;
  const ph = o.ph, s = Math.sin(ph), bob = 0.014 * Math.cos(ph * 2), b = K.b;
  const jacket = topOf(K), jacketD = dark(jacket, K.shirtless ? 0.88 : 0.7), pants = K.pants, pantsD = dark(pants, 0.74);
  const glove = K.species === 'frog' || K.shirtless ? (K.species === 'frog' ? FROG.skin : K.skin) : GLOVE;
  const hip = [0, 0.9 + bob], sho = [0.1, 1.4 + bob];
  const limb = (far) => {
    const k = far ? -s : s;                  // + : this leg is forward
    const fx = 0.27 * k, heel = Math.max(0, -k) * 0.07;
    // ski
    R(fx - 0.72, 0, 1.56, 0.032, far ? dark(SKI, 0.8) : SKI);
    L(fx + 0.84, 0.016, fx + 0.94, 0.09, 0.032, far ? dark(SKI, 0.8) : SKI);
    const kn = joint(hip[0], hip[1], fx, 0.2 + heel, 0.42, 0.42, 1);
    L(hip[0], hip[1], kn[0], kn[1], 0.17, far ? pantsD : pants);
    L(kn[0], kn[1], fx, 0.2 + heel, 0.14, far ? pantsD : pants);
    PG([fx - 0.1, 0.03 + heel, fx + 0.15, 0.03, fx + 0.15, 0.13, fx + 0.06, 0.24 + heel, fx - 0.1, 0.24 + heel], BOOT);
  };
  const arm = (far) => {
    const k = far ? s : -s;                  // arms swing against the legs
    const hx = 0.2 + 0.2 * k, hy = 1.02 + 0.06 * k + bob;
    const el = joint(sho[0], sho[1], hx, hy, 0.27, 0.26, -1);
    L(hx, hy, hx + 0.12 - 0.35 * k, 0.03, 0.03, far ? POLE_D : POLE);   // the pole, planted behind the hand as it swings through
    L(sho[0], sho[1], el[0], el[1], 0.12, far ? jacketD : jacket);
    L(el[0], el[1], hx, hy, 0.105, far ? jacketD : jacket);
    E(hx, hy, 0.062, 0.062, glove);
  };
  limb(true); arm(true);
  // pack, on the back (or the baby in its sled)
  if (K.babySled) babySled(g, -0.2 * b - 0.03, 1.2 + bob, 'side', K.skin, K.hair, o.w);
  else {
    R(-0.27 * b, 0.98 + bob, 0.2, 0.42, PACK);
    R(-0.27 * b, 1.3 + bob, 0.2, 0.09, lite(PACK, 1.3, 0));
  }
  limb(false);
  E(hip[0], hip[1] + 0.02, 0.15 * b, 0.11, pants);
  PG([-0.13 * b, 0.88 + bob, 0.14 * b, 0.88 + bob, 0.24 * b, 1.38 + bob, 0.18 * b, 1.46 + bob, -0.06 * b, 1.46 + bob, -0.12 * b, 1.36 + bob], jacket);
  PG([-0.13 * b, 0.88 + bob, -0.03 * b, 0.88 + bob, 0.0, 1.44 + bob, -0.06 * b, 1.46 + bob, -0.12 * b, 1.36 + bob], jacketD);
  if (K.shirtless) R(0.04, 1.38 + bob, 0.1, 0.14, jacketD);                       // a neck
  else {
    R(0.03, 1.42 + bob, 0.17, 0.085, SCARF);
    L(0.05, 1.45 + bob, -0.1 - 0.02 * Math.sin(o.w * 2), 1.3 + bob, 0.07, SCARF_D);
  }
  arm(false);
  headSide(g, K, 0.14, 1.608 + bob, o.w);
}

function sideBike(p, cx, ground, K, o) {
  const g = tools(p, cx, ground, 1), { R, E, L, PG, RING } = g;
  const k = K.k, b = K.b, ph = o.ph, bob = 0.008 * Math.sin(ph * 2);
  const jacket = topOf(K), jacketD = dark(jacket, K.shirtless ? 0.88 : 0.7), pants = K.pants, pantsD = dark(pants, 0.74);
  const glove = K.species === 'frog' || K.shirtless ? (K.species === 'frog' ? FROG.skin : K.skin) : GLOVE;
  const WR = 0.37, rear = [-0.56, WR], front = [0.56, WR], bb = [-0.03, 0.33];
  const seat = 0.33 + 0.67 * k, hip = [-0.24, seat + 0.02 + bob], grip = [0.4, 1.12];
  const sho = [hip[0] + 0.36 * k, hip[1] + 0.42 * k];
  const pedal = (far) => { const a = -ph + (far ? Math.PI : 0); return [bb[0] + 0.165 * Math.cos(a), bb[1] + 0.165 * Math.sin(a)]; };
  const leg = (far) => {
    const [px, py] = pedal(far), col = far ? pantsD : pants;
    L(bb[0], bb[1], px, py, 0.035, METAL);                        // crank
    R(px - 0.08, py - 0.02, 0.16, 0.03, METAL);
    const kn = joint(hip[0], hip[1], px, py + 0.1, 0.43 * k, 0.43 * k, 1);
    L(hip[0], hip[1], kn[0], kn[1], 0.17 * k, col);
    L(kn[0], kn[1], px, py + 0.1, 0.14 * k, col);
    PG([px - 0.09, py + 0.01, px + 0.13, py + 0.01, px + 0.13, py + 0.09, px + 0.03, py + 0.16, px - 0.09, py + 0.16], BOOT);
  };
  const arm = (far) => {
    const el = joint(sho[0], sho[1], grip[0], grip[1] + 0.03, 0.27 * k, 0.27 * k, -1);
    L(sho[0], sho[1], el[0], el[1], 0.12 * k, far ? jacketD : jacket);
    L(el[0], el[1], grip[0], grip[1] + 0.03, 0.105 * k, far ? jacketD : jacket);
    E(grip[0], grip[1] + 0.03, 0.062, 0.062, glove);
  };
  // wheels: fat tyres, rims, a few spokes that turn
  for (const [wx, wy] of [rear, front]) {
    for (let i = 0; i < 6; i++) {
      const a = -ph * 0.8 + (i * Math.PI) / 3;
      L(wx, wy, wx + Math.cos(a) * (WR - 0.1), wy + Math.sin(a) * (WR - 0.1), 0.012, [96, 104, 128]);
    }
    RING(wx, wy, WR, WR - 0.115, TIRE);
    RING(wx, wy, WR - 0.105, WR - 0.135, RIM);
    for (let i = 0; i < 12; i++) {
      const a = -ph * 0.8 + (i * Math.PI) / 6;
      R(wx + Math.cos(a) * (WR - 0.02) - 0.025, wy + Math.sin(a) * (WR - 0.02) - 0.025, 0.05, 0.05, TIRE_L);
    }
    E(wx, wy, 0.04, 0.04, METAL);
  }
  leg(true); arm(true);
  // frame
  const head = [0.36, 0.96], seatTop = [-0.22, seat - 0.04];
  L(bb[0], bb[1], rear[0], rear[1], 0.04, METAL);
  L(seatTop[0], 0.8, rear[0], rear[1], 0.035, METAL);
  L(bb[0], bb[1], seatTop[0], seatTop[1], 0.045, METAL);
  L(seatTop[0] + 0.02, 0.86, head[0], head[1], 0.05, C.red);
  L(bb[0], bb[1], head[0], head[1] - 0.1, 0.055, C.red);
  L(head[0], head[1] + 0.04, front[0], front[1], 0.05, METAL);
  L(head[0], head[1], grip[0], grip[1], 0.04, METAL);
  R(grip[0] - 0.05, grip[1] - 0.02, 0.12, 0.045, [26, 28, 38]);
  R(seatTop[0] - 0.13, seat - 0.05, 0.26, 0.05, [30, 30, 40]);          // saddle
  E(bb[0], bb[1], 0.07, 0.07, METAL);
  p.unlit = true;
  R(rear[0] - 0.02, 0.8, 0.07, 0.06, [255, 66, 54]);                     // rear light
  E(head[0] + 0.07, head[1] + 0.02, 0.045, 0.045, C.warmHi);             // headlight
  p.unlit = false;
  // rider
  E(hip[0], hip[1], 0.16 * b * k, 0.12 * k, pants);
  const tx = sho[0] - hip[0], ty = sho[1] - hip[1], n = Math.hypot(tx, ty), nx = -ty / n, ny = tx / n, hw = 0.135 * b * k;
  if (K.babySled) babySled(tools(p, cx + hip[0] + tx * 0.5 + nx * 0.34 * k, ground - (hip[1] + ty * 0.62 + ny * 0.34 * k), k), 0, 0, 'side', K.skin, K.hair, o.w);   // hanging on his back
  PG([hip[0] + nx * hw, hip[1] + ny * hw, hip[0] - nx * hw, hip[1] - ny * hw, sho[0] - nx * hw * 0.9, sho[1] - ny * hw * 0.9, sho[0] + nx * hw, sho[1] + ny * hw], jacket);
  PG([hip[0] + nx * hw, hip[1] + ny * hw, hip[0] + nx * hw * 0.35, hip[1] + ny * hw * 0.35, sho[0] + nx * hw * 0.35, sho[1] + ny * hw * 0.35, sho[0] + nx * hw, sho[1] + ny * hw], jacketD);
  E(sho[0], sho[1], 0.13 * b * k, 0.12 * k, jacket);
  leg(false);
  const gb = tools(p, cx + sho[0] + 0.05 * k, ground - (sho[1] + 0.02 * k), k);
  if (K.shirtless) gb.R(-0.02, 0.0, 0.1, 0.1, jacketD);
  else {
    gb.R(-0.06, 0.02, 0.17, 0.085, SCARF);
    gb.L(-0.04, 0.05, -0.2 - 0.03 * Math.sin(o.w * 2), -0.02 + 0.02 * Math.cos(o.w), 0.07, SCARF_D);
  }
  arm(false);
  headSide(gb, K, 0.06, 0.215, o.w);
}

// ---------------------------------------------------------------------------
// Ready-made pictures
// ---------------------------------------------------------------------------
/** The box each view is drawn in (metres), and where the feet-centre sits in it. */
export const BOXES = {
  'front|stand': { w: 1.3, h: 2.5, cx: 0.62, below: 0.06 },
  'front|tread': { w: 1.3, h: 2.5, cx: 0.62, below: 0.2 },
  'front|bike': { w: 1.3, h: 2.6, cx: 0.62, below: 0.06 },
  'side|stand': { w: 2.4, h: 2.5, cx: 1.1, below: 0.06 },
  'side|tread': { w: 2.4, h: 2.5, cx: 1.1, below: 0.06 },
  'side|bike': { w: 2.4, h: 2.6, cx: 1.2, below: 0.06 },
  'dog|front': { w: 1.3, h: 1.6, cx: 0.65, below: 0.06 },
  'dog|side': { w: 2.0, h: 1.6, cx: 0.95, below: 0.06 },
  'dog|back': { w: 1.4, h: 1.6, cx: 0.7, below: 0.06 },
};

/**
 * Paint one view of somebody into a Pix that is BOXES[...] big.
 * view: 'front' | 'side';  mode: 'stand' | 'bike' | 'tread';  ph: stride / pedal phase;  w: flutter angle.
 */
export function paintFigure(p, profile, view, mode, ph = 0.6, w = 0) {
  const K = Object.assign({ jacket: profile.jacket || C.red }, lookOf(profile));
  if (K.species === 'dog') {
    const box = BOXES['dog|' + view] || BOXES['dog|front'], coat = coatOf(profile.look);
    const ground = box.h - box.below;
    if (view === 'side') drawDogSide(p, box.cx, ground, coat, mode === 'stand' ? null : ph, w, K.jacket);
    else if (view === 'back') drawDog(p, box.cx, ground, coat, ph, w, K.jacket);
    else drawDogFront(p, box.cx, ground, coat, w, K.jacket);
    return box;
  }
  const box = BOXES[view + '|' + mode] || BOXES['front|stand'];
  const ground = box.h - box.below, o = { mode, ph, w };
  if (view === 'side') { if (mode === 'bike') sideBike(p, box.cx, ground, K, o); else sideSki(p, box.cx, ground, K, o); }
  else if (mode === 'bike') frontBike(p, box.cx, ground, K, o);
  else frontStanding(p, box.cx, ground, K, o);
  return box;
}

export function boxFor(profile, view, mode) {
  const dog = profile.look && profile.look.species === 'dog';
  return dog ? BOXES['dog|' + view] || BOXES['dog|front'] : BOXES[view + '|' + mode] || BOXES['front|stand'];
}

const cache = new Map();
/**
 * A picture of somebody at full brightness, for menus. ppm is pixels per metre.
 * pose and wig pick the frame of the stride and of whatever flutters (whole numbers, so they cache).
 * Returns { canvas, footX, footY }: where their feet are in the picture.
 */
export function figureSprite(profile, view = 'front', mode = 'stand', ppm = 40, pose = 0, wig = 0) {
  const key = [profile.id, view, mode, ppm, pose, wig, profile.jacket, JSON.stringify(profile.look || {})].join('|');
  let f = cache.get(key);
  if (f) return f;
  if (cache.size > 400) cache.clear();
  const box = boxFor(profile, view, mode);
  const p = new Pix(box.w, box.h, ppm);
  p.unlit = true;
  paintFigure(p, profile, view, mode, (pose / 12) * TAU + 0.6, (wig / 4) * TAU);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  f = { canvas: p.toCanvas(), footX: Math.round(box.cx * ppm), footY: Math.round((box.h - box.below) * ppm) };
  cache.set(key, f);
  return f;
}
