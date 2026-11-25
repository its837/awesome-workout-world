// Round pixel portraits for the family. A real photo (web/photos/...) is shrunk and
// lightly posterised so it matches the game; with no photo we draw a cartoon from
// the profile's "look" (hair, beard, glasses - or a mastiff, or a frog).
// Everybody gets a Santa hat (see drawPortrait).
import { hashI, makeCanvas } from './util.js';
import { Pix, C, uiSprite } from './sprites.js';
import { coatOf } from './dogs.js';

export const HAIR = {
  brown: [116, 78, 52], blonde: [238, 204, 112], red: [204, 88, 40], black: [40, 34, 38],
  gray: [190, 190, 200], auburn: [150, 66, 40],
};
const HAIR_PICK = ['brown', 'black', 'auburn', 'blonde'];
const STYLE_PICK = ['long', 'pony', 'short', 'bun'];
export const STYLES = ['bald', 'buzz', 'short', 'bob', 'shoulder', 'long', 'pony', 'bun', 'braids'];
export const SKIN = [246, 206, 178];
export const PANTS = [52, 62, 98];
export const DOG = { fur: [214, 170, 118], furD: [176, 132, 90], mask: [72, 54, 48], ear: [88, 62, 50] };
export const FROG = { skin: [100, 184, 86], dark: [44, 96, 54], belly: [176, 224, 134] };
/** How wide somebody is drawn, by build. */
export const BUILDS = { slim: 0.9, medium: 1, broad: 1.12 };
/** Everybody's art is drawn for this height (cm) and scaled from it. */
export const BASE_HEIGHT = 175;

function idHash(id) {
  let h = 7;
  for (const ch of String(id)) h = hashI(h * 31 + ch.charCodeAt(0));
  return h;
}
const colour = (v, table, fallback) => (Array.isArray(v) && v.length === 3 ? v : table[v] || fallback);

/**
 * Resolve a profile's look into concrete colours and choices. One place, so the round
 * portrait, the rider on the trail and the line-up on the front page always agree.
 * Colours may be a name from HAIR or an [r, g, b] list.
 */
export function lookOf(profile) {
  const L = profile.look || {}, h = idHash(profile.id);
  const species = L.species || 'human';
  const hair = colour(L.hair, HAIR, HAIR[HAIR_PICK[h % HAIR_PICK.length]]);
  const height = Number(L.height) || (species === 'frog' ? 152 : 170);
  return {
    species,
    breed: L.breed || 'mastiff',
    coat: species === 'dog' ? coatOf(L) : null,
    hair,
    style: STYLES.includes(L.style) ? L.style : STYLE_PICK[(h >>> 5) % STYLE_PICK.length],
    curly: !!L.curly,
    fringe: !!L.fringe,
    beard: L.beard === true ? 'full' : L.beard || '',            // '' | 'stubble' | 'short' | 'full' | 'moustache'
    beardCol: colour(L.beardCol, HAIR, hair),
    glasses: L.glasses === true ? 'square' : L.glasses || '',     // '' | 'round' | 'square' | 'sun'
    skin: colour(L.skin, {}, SKIN),
    eyes: colour(L.eyes, {}, [70, 50, 40]),
    freckles: !!L.freckles,
    face: L.face || 'oval',                                       // round | oval | long | square
    height, k: height / BASE_HEIGHT,
    build: L.build || 'medium', b: BUILDS[L.build] || 1,
    hat: L.hat || 'santa',                                        // santa | beanie | cap | sauna | wizard | none
    shirtless: !!L.shirtless,                                     // no shirt: the body is skin
    babySled: !!L.babySled,                                       // a baby in a little red sled on their back
    hatCol: colour(L.hatCol, {}, profile.jacket || C.red),
    capMark: L.capMark || '',                                     // a cap's letter: 'B'
    markCol: colour(L.markCol, {}, C.red),
    pants: colour(L.pants, {}, PANTS),
  };
}

function ringAndMask(d, size, ring) {
  const rw = Math.max(2, Math.round(size / 18));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2, dy = y + 0.5 - size / 2, r = Math.sqrt(dx * dx + dy * dy);
      const o = (y * size + x) * 4;
      if (r > size / 2) d[o + 3] = 0;
      else if (r > size / 2 - rw) { d[o] = ring[0]; d[o + 1] = ring[1]; d[o + 2] = ring[2]; d[o + 3] = 255; }
    }
  }
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const FACES = { round: [0.245, 0.25], oval: [0.23, 0.26], long: [0.215, 0.275], square: [0.24, 0.255] };
const FALL = { bob: 0.2, shoulder: 0.36, long: 0.6 };

/** A face, close up. The picture is one unit square; detail appears as it gets bigger. */
function drawHuman(p, k, jacket) {
  const skin = k.skin, skinD = skin.map((v) => v * 0.82), hair = k.hair, hairD = hair.map((v) => v * 0.8);
  const big = p.s >= 60, st = k.style, fall = FALL[st] || 0;
  const [fx, fy] = FACES[k.face] || FACES.oval;
  const top = st === 'buzz' ? mix(hair, skin, 0.4) : hair;
  // hair behind the head
  if (fall) {
    p.ell(0.5, 0.5, fx + 0.1, 0.38, hair);
    p.rect(0.5 - fx - 0.1, 0.5, 2 * fx + 0.2, fall, hair);
    if (k.curly) for (let i = 0; i < 7; i++) for (const sd of [-1, 1]) p.ell(0.5 + sd * (fx + 0.1), 0.3 + i * (fall + 0.2) / 6, 0.055, 0.055, i % 2 ? hair : hairD);
  }
  if (st === 'pony') { p.ell(0.78, 0.52, 0.1, 0.24, hair); p.rect(0.71, 0.3, 0.08, 0.1, C.red); }
  p.ell(0.5, 1.06, 0.44, 0.34, k.shirtless ? skinD : jacket);
  p.rect(0.43, 0.64, 0.14, 0.16, skinD);
  if (!fall) { p.rect(0.5 - fx - 0.03, 0.44, 0.05, 0.1, skinD); p.rect(0.5 + fx - 0.02, 0.44, 0.05, 0.1, skinD); }
  if (k.face === 'square') p.rect(0.5 - fx + 0.02, 0.5, 2 * fx - 0.04, 0.2, skin);
  p.ell(0.5, 0.47, fx, fy, skin);
  if (st !== 'bald') {
    p.ell(0.5, 0.29, fx + 0.02, st === 'buzz' ? 0.12 : 0.16, top);
    const side = st === 'buzz' ? 0.08 : st === 'short' ? 0.12 : 0.2;
    p.rect(0.5 - fx - 0.03, 0.3, 0.06, side, top); p.rect(0.5 + fx - 0.03, 0.3, 0.06, side, top);
    if (st === 'bun') p.ell(0.5, 0.13, 0.11, 0.1, hair);
    if (fall) { p.rect(0.5 - fx - 0.07, 0.42, 0.1, fall, hair); p.rect(0.5 + fx - 0.03, 0.42, 0.1, fall, hair); }
    if (k.fringe) p.ell(0.5, 0.31, fx - 0.01, 0.075, hair);
    if (k.curly) for (let i = 0; i < 8; i++) p.ell(0.5 - fx + (i / 7) * 2 * fx, 0.2 + 0.05 * Math.abs(i - 3.5) / 3.5, 0.055, 0.055, i % 2 ? hair : hairD);
  }
  if (st === 'braids') {
    for (const sd of [-1, 1]) {
      const bx = 0.5 + sd * (fx + 0.04);
      for (let i = 0; i < 5; i++) p.ell(bx + sd * 0.012 * (i % 2 ? 1 : -1), 0.5 + i * 0.085, 0.05, 0.055, i % 2 ? hairD : hair);
      p.rect(bx - 0.045, 0.9, 0.09, 0.035, C.red);
    }
  }
  if (k.beard) {
    const bc = k.beard === 'stubble' ? mix(skin, k.beardCol, 0.4) : k.beardCol;
    if (k.beard === 'moustache') p.rect(0.4, 0.555, 0.2, 0.04, bc);
    else {
      // along the jaw and over the chin, leaving the cheeks and the mouth clear
      const full = k.beard === 'full';
      p.ell(0.5, full ? 0.71 : 0.72, fx - 0.015, full ? 0.14 : 0.1, bc);
      p.rect(0.5 - fx + 0.005, 0.5, 0.05, 0.16, bc); p.rect(0.5 + fx - 0.055, 0.5, 0.05, 0.16, bc);
      p.ell(0.5, 0.615, 0.105, 0.04, k.beard === 'stubble' ? bc : skin);
      p.rect(0.395, 0.565, 0.21, 0.035, bc);                                  // moustache
      p.rect(0.395, 0.585, 0.04, 0.07, bc); p.rect(0.565, 0.585, 0.04, 0.07, bc);
    }
  }
  // eyes
  if (big) {
    for (const ex of [0.375, 0.555]) {
      p.rect(ex - 0.005, 0.4, 0.085, 0.02, hairD);                      // brow
      p.rect(ex, 0.44, 0.07, 0.07, C.white);
      p.rect(ex + 0.012, 0.44, 0.048, 0.07, k.eyes);
      p.rect(ex + 0.024, 0.455, 0.026, 0.04, C.coal);
      p.rect(ex + 0.014, 0.445, 0.016, 0.016, C.white);
    }
    p.rect(0.485, 0.5, 0.03, 0.055, skinD);                              // nose
  } else { p.rect(0.39, 0.44, 0.055, 0.07, C.coal); p.rect(0.56, 0.44, 0.055, 0.07, C.coal); }
  if (k.glasses) {
    const sun = k.glasses === 'sun', frame = sun ? C.coal : [40, 34, 44], lens = sun ? [30, 34, 52] : [206, 228, 246];
    for (const gx of [0.31, 0.53]) {
      if (k.glasses === 'round') { p.ell(gx + 0.082, 0.465, 0.09, 0.085, frame); p.ell(gx + 0.082, 0.465, 0.062, 0.058, lens); }
      else { p.rect(gx, 0.39, 0.165, 0.15, frame); p.rect(gx + 0.03, 0.42, 0.105, 0.09, lens); }
      if (!sun) p.rect(gx + 0.06, 0.445, 0.05, 0.06, big ? k.eyes : C.coal);
      if (!sun && big) p.rect(gx + 0.072, 0.458, 0.026, 0.036, C.coal);
    }
    p.rect(0.47, 0.44, 0.07, 0.035, frame);
    p.rect(0.25, 0.44, 0.07, 0.035, frame); p.rect(0.68, 0.44, 0.07, 0.035, frame);
  }
  p.ell(0.35, 0.56, 0.05, 0.035, C.rosy); p.ell(0.65, 0.56, 0.05, 0.035, C.rosy);
  if (k.freckles && big) for (const [x, y] of [[0.33, 0.53], [0.37, 0.55], [0.4, 0.52], [0.6, 0.52], [0.63, 0.55], [0.67, 0.53], [0.47, 0.535], [0.53, 0.535]]) p.rect(x, y, 0.014, 0.014, mix(skin, [150, 90, 60], 0.6));
  const lip = [150, 60, 60];
  if (!k.beard || k.beard === 'moustache') {
    p.rect(0.44, 0.61, 0.12, 0.03, lip);
    p.rect(0.41, 0.59, 0.03, 0.03, lip); p.rect(0.56, 0.59, 0.03, 0.03, lip);
  } else p.rect(0.45, 0.6, 0.1, 0.025, lip);
}

/** A dog's face. Two layouts: the heavy-jowled mastiff and the longer-nosed lab. */
function drawDogFace(p, coat, jacket, breed) {
  const body = coat.fur, fur = coat.head || coat.fur, furD = coat.head ? coat.fur : coat.furD, ear = coat.ear, mask = coat.mask || coat.furD;
  const hi = fur.map((v) => Math.min(255, v * 1.35 + 14));
  p.ell(0.5, 1.08, 0.46, 0.34, jacket);
  if (breed === 'lab') {
    p.ell(0.5, 0.86, 0.19, 0.14, ear);
    p.ell(0.2, 0.48, 0.09, 0.21, ear); p.ell(0.8, 0.48, 0.09, 0.21, ear);
    p.ell(0.5, 0.48, 0.28, 0.28, fur);
    p.ell(0.44, 0.34, 0.12, 0.06, hi);
    p.ell(0.5, 0.65, 0.18, 0.16, fur);
    p.ell(0.5, 0.61, 0.12, 0.08, hi);
    p.ell(0.5, 0.57, 0.07, 0.05, [12, 12, 16]);
    if (coat.chin) p.ell(0.5, 0.8, 0.11, 0.065, coat.chin);
    p.ell(0.5, 0.74, 0.045, 0.05, [238, 124, 136]);
    p.rect(0.36, 0.43, 0.065, 0.07, [150, 98, 52]); p.rect(0.575, 0.43, 0.065, 0.07, [150, 98, 52]);
    p.rect(0.38, 0.45, 0.03, 0.035, C.coal); p.rect(0.595, 0.45, 0.03, 0.035, C.coal);
    p.rect(0.375, 0.435, 0.02, 0.02, C.white); p.rect(0.59, 0.435, 0.02, 0.02, C.white);
  } else {
    p.ell(0.5, 0.86, 0.2, 0.14, coat.head ? body : coat.furD);
    p.ell(0.19, 0.46, 0.1, 0.2, ear); p.ell(0.81, 0.46, 0.1, 0.2, ear);
    p.ell(0.5, 0.5, 0.31, 0.29, fur);
    p.rect(0.41, 0.28, 0.18, 0.022, furD); p.rect(0.44, 0.33, 0.12, 0.022, furD);
    if (coat.blaze) p.rect(0.465, 0.22, 0.07, 0.32, coat.blaze);
    if (coat.patch) { p.ell(0.39, 0.465, 0.09, 0.08, coat.patch); p.ell(0.61, 0.465, 0.09, 0.08, coat.patch); }
    p.ell(0.5, 0.64, 0.21, 0.17, mask);
    p.ell(0.37, 0.7, 0.1, 0.1, mask); p.ell(0.63, 0.7, 0.1, 0.1, mask);
    p.ell(0.5, 0.56, 0.075, 0.055, [28, 22, 26]);
    if (coat.chin) p.ell(0.5, 0.84, 0.1, 0.05, coat.chin);
    p.ell(0.5, 0.79, 0.055, 0.07, [238, 124, 136]);
    p.rect(0.34, 0.415, 0.09, 0.022, furD); p.rect(0.57, 0.415, 0.09, 0.022, furD);
    p.rect(0.36, 0.44, 0.06, 0.065, C.coal); p.rect(0.58, 0.44, 0.06, 0.065, C.coal);
    p.rect(0.375, 0.445, 0.025, 0.025, C.white); p.rect(0.595, 0.445, 0.025, 0.025, C.white);
  }
  if (coat.stripe) for (const [x, y] of [[0.3, 0.3], [0.38, 0.24], [0.62, 0.24], [0.7, 0.3], [0.26, 0.4], [0.74, 0.4]]) p.line(x, y, x + (x < 0.5 ? 0.05 : -0.05), y + 0.09, 0.022, coat.stripe);
}

function drawFrog(p, jacket) {
  p.ell(0.5, 1.08, 0.46, 0.34, jacket);
  p.ell(0.31, 0.33, 0.13, 0.13, FROG.skin); p.ell(0.69, 0.33, 0.13, 0.13, FROG.skin);
  p.ell(0.5, 0.58, 0.34, 0.26, FROG.skin);
  p.ell(0.5, 0.74, 0.22, 0.1, FROG.belly);
  p.ell(0.31, 0.32, 0.085, 0.085, C.white); p.ell(0.69, 0.32, 0.085, 0.085, C.white);
  p.rect(0.29, 0.3, 0.05, 0.06, C.coal); p.rect(0.67, 0.3, 0.05, 0.06, C.coal);
  p.rect(0.26, 0.6, 0.48, 0.03, FROG.dark);
  p.rect(0.23, 0.57, 0.04, 0.035, FROG.dark); p.rect(0.73, 0.57, 0.04, 0.035, FROG.dark);
  p.rect(0.45, 0.5, 0.025, 0.025, FROG.dark); p.rect(0.53, 0.5, 0.025, 0.025, FROG.dark);
  p.ell(0.26, 0.66, 0.05, 0.035, C.rosy); p.ell(0.74, 0.66, 0.05, 0.035, C.rosy);
}

function cartoon(profile, size) {
  const k = lookOf(profile);
  const jacket = profile.jacket || C.red;
  const bg = [jacket[0] * 0.3 + 14, jacket[1] * 0.3 + 22, jacket[2] * 0.3 + 60];
  const p = new Pix(1, 1, size);
  p.unlit = true;
  p.rect(0, 0, 1, 1, bg);
  if (k.species === 'dog') drawDogFace(p, k.coat, jacket, k.breed);
  else if (k.species === 'frog') drawFrog(p, jacket);
  else drawHuman(p, k, jacket);
  p.finish([1, 1, 1], [0, 0, 0], 0);
  return p;
}

const cache = new Map();
const RING = [255, 244, 214];

/** A size x size canvas for this person; a photo, if they have one, swaps in once loaded. */
export function portrait(profile, size = 36) {
  const key = profile.id + '|' + size + '|' + profile.jacket + '|' + JSON.stringify(profile.look || {});
  let c = cache.get(key);
  if (c) return c;
  if (cache.size > 300) cache.clear();
  const p = cartoon(profile, size);
  ringAndMask(p.d, size, RING);
  c = p.toCanvas();
  cache.set(key, c);
  if (profile.photo) {
    const img = new Image();
    img.onload = () => {
      const tmp = makeCanvas(size, size), g = tmp.getContext('2d');
      const s = Math.min(img.width, img.height);
      g.imageSmoothingEnabled = true;
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      const id = g.getImageData(0, 0, size, size), d = id.data;
      for (let o = 0; o < d.length; o += 4) {
        // gentle posterise + a touch of contrast so photos sit with the pixel art
        for (let ch = 0; ch < 3; ch++) { const v = (d[o + ch] - 128) * 1.12 + 132; d[o + ch] = Math.round(v / 20) * 20; }
        d[o + 3] = 255;
      }
      ringAndMask(d, size, RING);
      c.getContext('2d').putImageData(id, 0, 0);
    };
    img.src = 'photos/' + profile.photo;
  }
  return c;
}

/** Draw a portrait with its hat. (x, y) is the top-left of the round picture, size its diameter in pixels. */
export function drawPortrait(ctx, profile, x, y, size = 36) {
  x = Math.round(x); y = Math.round(y);
  ctx.drawImage(portrait(profile, size), x, y);
  const kind = (profile.look && profile.look.hat) || 'santa';
  if (kind === 'none') return;
  if (kind === 'cap') {
    const L = profile.look, col = L.hatCol || profile.jacket || C.red, rgb = (c, k = 1) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
    const w = Math.round(size * 0.66), h = Math.round(size * 0.34), bx = Math.round(x + size * 0.17), by = Math.round(y - size * 0.1);
    ctx.fillStyle = rgb(col);
    ctx.fillRect(bx + 3, by, w - 6, h); ctx.fillRect(bx + 1, by + Math.round(h * 0.2), w - 2, h - Math.round(h * 0.2)); ctx.fillRect(bx, by + Math.round(h * 0.45), w, h - Math.round(h * 0.45));
    ctx.fillStyle = rgb(col, 0.62);
    ctx.fillRect(bx - 2, by + h, w + 4, Math.max(2, Math.round(size * 0.07)));          // the peak
    if (L.capMark === 'B') {
      const u = Math.max(1, Math.round(size / 28)), mx = bx + Math.round(w / 2 - 1.5 * u), my = by + Math.max(1, Math.round((h - 5 * u) / 2));
      ctx.fillStyle = rgb(L.markCol || C.red);
      ['11 ', '1 1', '11 ', '1 1', '11 '].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '1') ctx.fillRect(mx + i * u, my + j * u, u, u); }));
    }
    return;
  }
  if (kind === 'wizard') {
    // a wizard hat: a tall indigo cone with a bent tip, a gold band and a wide brim
    const col = '#3a3084', colD = '#282060', gold = '#fad650';
    const w = Math.round(size * 0.66), bx = Math.round(x + size * 0.17), rows = Math.max(8, Math.round(size * 0.5)), by = Math.round(y - size * 0.34);
    for (let r = 0; r < rows; r++) {
      const ww = Math.max(2, Math.round(w * (0.18 + 0.82 * (r / rows)))), lean = Math.round((1 - r / rows) * size * 0.07);
      ctx.fillStyle = col; ctx.fillRect(bx + Math.round((w - ww) / 2) + lean, by + r, ww, 1);
    }
    ctx.fillStyle = col; ctx.fillRect(bx + Math.round(w * 0.55), by - 1, Math.max(3, Math.round(size * 0.17)), Math.max(2, Math.round(size * 0.07)));      // the bent tip
    ctx.fillStyle = colD; ctx.fillRect(bx + Math.round(w * 0.2), by + Math.round(rows * 0.45), Math.max(1, Math.round(size * 0.05)), Math.round(rows * 0.5));
    ctx.fillStyle = gold; ctx.fillRect(bx, by + rows - 2, w, Math.max(2, Math.round(size * 0.06)));
    ctx.fillRect(bx + Math.round(w * 0.52), by + Math.round(rows * 0.4), Math.max(1, Math.round(size / 24)), Math.max(1, Math.round(size / 24)));
    ctx.fillStyle = colD; ctx.fillRect(bx - 4, by + rows - 2 + Math.max(2, Math.round(size * 0.06)), w + 8, Math.max(2, Math.round(size * 0.07)));          // the brim
    return;
  }
  if (kind === 'sauna') {
    // a felt sauna hat: a soft cone with a limp tip and a turned-up brim
    const felt = [226, 212, 176], foldC = [190, 172, 132], rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
    const w = Math.round(size * 0.7), bx = Math.round(x + size * 0.15), by = Math.round(y - size * 0.2), rows = Math.max(6, Math.round(size * 0.32));
    ctx.fillStyle = rgb(felt);
    for (let r = 0; r < rows; r++) { const ww = Math.round(w * (0.34 + 0.66 * (r / rows))); ctx.fillRect(bx + Math.round((w - ww) / 2) + Math.round((rows - r) * 0.04 * size / 10), by + r, ww, 1); }
    ctx.fillRect(bx + Math.round(w * 0.52), by - 2, Math.max(2, Math.round(size * 0.1)), 3);             // the limp tip, flopped over
    ctx.fillStyle = rgb(foldC);
    ctx.fillRect(bx - 2, by + rows, w + 4, Math.max(3, Math.round(size * 0.09)));                         // the brim
    return;
  }
  if (kind === 'beanie') {
    const col = (profile.look && profile.look.hatCol) || profile.jacket || C.red;
    const w = Math.round(size * 0.6), h = Math.round(size * 0.3), bx = Math.round(x + size * 0.2), by = Math.round(y - size * 0.06);
    ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    ctx.fillRect(bx + 2, by, w - 4, h); ctx.fillRect(bx, by + Math.round(h * 0.3), w, Math.round(h * 0.7));
    ctx.fillStyle = `rgb(${(col[0] * 0.72) | 0},${(col[1] * 0.72) | 0},${(col[2] * 0.72) | 0})`;
    ctx.fillRect(bx - 1, by + h - Math.round(h * 0.3), w + 2, Math.round(h * 0.3));
    ctx.fillStyle = '#ffffff';
    const r = Math.max(2, Math.round(size * 0.07));
    ctx.fillRect(bx + Math.round(w / 2) - r, by - r, r * 2, r * 2);
    return;
  }
  const hat = uiSprite('hat', 0, Math.round(size * 0.62));
  ctx.drawImage(hat, Math.round(x + size * 0.2), Math.round(y - hat.height * 0.52));
}
