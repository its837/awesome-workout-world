export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const TAU = Math.PI * 2;
export const MPH = 0.44704;        // m/s per mph
export const MILE = 1609.344;      // metres
export const FOOT = 0.3048;        // metres

/** Integer hash -> uint32. */
export function hashI(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  n ^= n >>> 15;
  return n >>> 0;
}
/** Integer hash -> [0, 1). */
export const hash = (n) => hashI(n) / 4294967296;
export const hash2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ 0x9e3779b9);
export const hashI2 = (a, b) => hashI(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ 0x9e3779b9);

/** Small seeded PRNG (xorshift32). Returns a function producing [0, 1). */
export function rng(seed) {
  let s = (seed >>> 0) || 0x1234567;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Smooth 1-D value noise in [0, 1). */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(hash2(i, seed), hash2(i + 1, seed), smooth(f));
}

export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul3 = (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
export const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0);
  c.height = Math.max(1, h | 0);
  return c;
}

/** Days until the next Dec 25 (0 on Christmas Day itself). */
export function daysToChristmas(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let xmas = new Date(now.getFullYear(), 11, 25);
  if (today > xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);
  return Math.round((xmas - today) / 86400000);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Local calendar day as 'YYYY-MM-DD'. */
export function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
export function daysBetween(a, b) {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate()), y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((y - x) / 86400000);
}
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
