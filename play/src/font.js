// A hand-drawn 7-pixel-tall bitmap font (uppercase, digits, punctuation, a few icons).
// Text is drawn from per-colour glyph atlases so it stays crisp at any integer scale.
import { makeCanvas } from './util.js';

export const GLYPH_H = 7;

export const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01110',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '111 010 010 010 010 010 111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '010 110 010 010 010 010 111',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '01110 10001 00001 00110 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '0 0 0 0 0 0 1',
  ',': '00 00 00 00 00 01 10',
  '!': '1 1 1 1 1 0 1',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  ':': '0 0 1 0 1 0 0',
  '-': '000 000 000 111 000 000 000',
  '+': '000 000 010 111 010 000 000',
  '/': '00001 00001 00010 00100 01000 10000 10000',
  '%': '11001 11001 00010 00100 01000 10011 10011',
  "'": '1 1 0 0 0 0 0',
  '"': '101 101 000 000 000 000 000',
  '(': '01 10 10 10 10 10 01',
  ')': '10 01 01 01 01 01 10',
  '&': '01100 10010 10100 01000 10101 10010 01101',
  '#': '01010 01010 11111 01010 11111 01010 01010',
  '*': '00000 00100 10101 01110 10101 00100 00000',
  '<': '0001 0010 0100 1000 0100 0010 0001',
  '>': '1000 0100 0010 0001 0010 0100 1000',
  '=': '000 000 111 000 111 000 000',
  '★': '0001000 0011100 1111111 0111110 0011100 0110110 1100011', // star
  '♥': '0110110 1111111 1111111 1111111 0111110 0011100 0001000', // heart
  '♪': '00111 00101 00100 00100 01100 11100 01000',               // note
  '❄': '0001000 0101010 0011100 1111111 0011100 0101010 0001000', // snowflake
  '▲': '00000 00100 00100 01110 01110 11111 00000',               // up
  '▼': '00000 11111 01110 01110 00100 00100 00000',               // down
  '▶': '1000 1100 1110 1111 1110 1100 1000',                      // play
  '◀': '0001 0011 0111 1111 0111 0011 0001',                      // back
  '•': '00 00 11 11 00 00 00',                                    // bullet
  '×': '00000 10001 01010 00100 01010 10001 00000',               // times
  '°': '010 101 010 000 000 000 000',                             // degree
  '‖': '11011 11011 11011 11011 11011 11011 11011',               // pause
};

const SPACE_W = 3;
const META = {};
for (const ch of Object.keys(GLYPHS)) {
  const rows = GLYPHS[ch].split(' ');
  META[ch] = { rows, w: rows[0].length };
}

// One sheet of ready-drawn letters per colour-and-shadow pair. Each letter's cell already
// has its drop shadow under it, so a letter costs one drawing call, not two.
const atlases = new Map();
function atlas(color, shadow) {
  const key = color + '|' + (shadow || '');
  let a = atlases.get(key);
  if (a) return a;
  const chars = Object.keys(META);
  let total = 0;
  for (const ch of chars) total += META[ch].w + 3;
  const canvas = makeCanvas(total, GLYPH_H + 1);
  const g = canvas.getContext('2d');
  const pos = {};
  let x = 0;
  for (const ch of chars) {
    const m = META[ch];
    pos[ch] = x;
    for (const pass of shadow ? [1, 0] : [0]) {
      g.fillStyle = pass ? shadow : color;
      for (let r = 0; r < GLYPH_H; r++) {
        for (let c = 0; c < m.w; c++) {
          if (m.rows[r][c] !== '1') continue;
          if (!pass) g.clearRect(x + c, r, 1, 1);
          g.fillRect(x + c + pass, r + pass, 1, 1);
        }
      }
    }
    x += m.w + 3;
  }
  a = { canvas, pos };
  atlases.set(key, a);
  return a;
}

export function textWidth(text, scale = 1) {
  text = String(text).toUpperCase();
  let w = 0;
  for (const ch of text) w += (META[ch] ? META[ch].w : SPACE_W) + 1;
  return Math.max(0, w - 1) * scale;
}

/**
 * Draw bitmap text. opts: { scale, color, align: 'left'|'center'|'right', shadow: css colour|null }
 * (x, y) is the top-left (or top-centre / top-right) of the text.
 */
export function drawText(ctx, text, x, y, opts = {}) {
  text = String(text).toUpperCase();
  const scale = opts.scale || 1;
  const color = opts.color || '#ffffff';
  const align = opts.align || 'left';
  const shadow = opts.shadow === undefined ? 'rgba(4,8,30,0.75)' : opts.shadow;
  const w = textWidth(text, scale);
  x = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  y = Math.round(y);
  const a = atlas(color, shadow);
  for (const ch of text) {
    const m = META[ch];
    if (!m) { x += (SPACE_W + 1) * scale; continue; }
    ctx.drawImage(a.canvas, a.pos[ch], 0, m.w + 1, GLYPH_H + 1, x, y, (m.w + 1) * scale, (GLYPH_H + 1) * scale);
    x += (m.w + 1) * scale;
  }
  return w;
}

/** Greedy word-wrap into lines no wider than maxW pixels. */
export function wrapText(text, maxW, scale = 1) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (line && textWidth(next, scale) > maxW) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
